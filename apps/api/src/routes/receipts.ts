/**
 * Receipt capture endpoints.
 *
 * Built so Seamus can snap receipts on his phone instead of his bookkeeper
 * chasing him every BAS quarter. Flow:
 *
 *   1. Phone hits POST /api/receipts with a multipart photo + optional notes
 *      and business_id.
 *   2. Photo lands in R2 under `receipts/<uuid>.<ext>`.
 *   3. A row is inserted in the `receipts` table (per-business scoped).
 *   4. If the business has a `hubdocEmail` configured, we fire-and-forget
 *      email the photo as a base64 attachment via Resend so it lands in the
 *      bookkeeping pipeline automatically. Hubdoc OCRs the receipt on
 *      arrival — we don't need to do extraction ourselves yet.
 *   5. On success the receipt row's `hubdocForwardedAt` is set. On failure
 *      we record the reason in `hubdocForwardError` so admin can retry.
 *
 * Every endpoint verifies business membership before reading or writing,
 * so when tenant #2 arrives there's no data-leak class of bug to fix.
 */
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and } from 'drizzle-orm';
import { businesses, receipts } from '@butcher/db';
import { checkMembership } from '../lib/businessAccess';
import { sendEmail } from '../lib/email';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

/** GET /api/receipts?businessId=... — list receipts for a business (members only). */
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const businessId = c.req.query('businessId');
  if (!businessId) return c.json({ error: 'businessId is required' }, 400);
  const membership = await checkMembership(db, user.id, businessId);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);

  const rows = await db.select().from(receipts)
    .where(eq(receipts.businessId, businessId))
    .orderBy(desc(receipts.createdAt))
    .limit(200);

  // Synthesise a relative URL for each photo. The /images/* endpoint already
  // serves R2 objects by key, so we reuse it — no need for a new public route.
  return c.json(rows.map((r) => ({
    ...r,
    photoUrl: `/images/${r.photoKey}`,
  })));
});

/**
 * POST /api/receipts — capture a new receipt.
 *
 * Multipart form fields:
 *   - file: the photo (required)
 *   - businessId: which business this belongs to (required)
 *   - notes:    optional caption ("fuel for truck", "Bunnings supplies")
 *   - merchant: optional manual entry
 *   - amount:   optional dollar amount string (e.g. "42.50") — converted to cents
 *
 * Returns the new receipt row including photoUrl + forwardStatus.
 */
app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');

  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  const businessId = form.get('businessId') as string | null;
  if (!file) return c.json({ error: 'No photo uploaded' }, 400);
  if (!businessId) return c.json({ error: 'businessId is required' }, 400);

  const membership = await checkMembership(db, user.id, businessId);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);

  // Resolve the business so we know whether to forward to Hubdoc.
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!biz) return c.json({ error: 'Business not found' }, 404);

  const notes = (form.get('notes') as string | null)?.trim() || null;
  const merchant = (form.get('merchant') as string | null)?.trim() || null;
  const amountRaw = (form.get('amount') as string | null)?.trim();
  let amountCents: number | null = null;
  if (amountRaw) {
    // Accept "42.50", "$42.50", "42" — strip non-numeric except decimal.
    const cleaned = amountRaw.replace(/[^0-9.]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      amountCents = Math.round(parsed * 100);
    }
  }

  // Stash photo in R2 under receipts/ so we can distinguish from product /
  // proof-of-delivery / about images that share the bucket.
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
  const id = crypto.randomUUID();
  const photoKey = `receipts/${id}.${ext}`;
  const bytes = await file.arrayBuffer();
  await c.env.IMAGES.put(photoKey, bytes, {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  });

  const now = Date.now();
  await db.insert(receipts).values({
    id,
    businessId,
    capturedByUid: user.id,
    photoKey,
    contentType: file.type || 'image/jpeg',
    notes,
    merchant,
    amountCents,
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // ── Auto-forward to Hubdoc ───────────────────────────────────────────────
  // Hubdoc accepts an email with image attachments and OCRs them as receipts.
  // We send the photo as a base64-encoded attachment via Resend. If the
  // business hasn't set a Hubdoc email yet, skip — the receipt is still
  // saved in R2 + DB so they can configure it later and bulk-forward.
  let hubdocForwardedAt: number | null = null;
  let hubdocForwardError: string | null = null;
  if (biz.hubdocEmail) {
    try {
      // Re-encode the photo bytes to base64 for Resend's attachment format.
      // chunk the conversion to avoid a single huge string in memory for
      // bigger receipt photos (some phone cameras produce 4–8MB JPEGs).
      const u8 = new Uint8Array(bytes);
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < u8.length; i += CHUNK) {
        binary += String.fromCharCode(...u8.subarray(i, i + CHUNK));
      }
      const base64 = btoa(binary);

      const sentAt = new Date(now);
      const subject = `Receipt — ${merchant ?? biz.name} — ${sentAt.toLocaleDateString('en-AU')}`;
      const lines: string[] = [
        `<p>Receipt captured via the ${biz.name} admin app.</p>`,
      ];
      if (merchant) lines.push(`<p><strong>Merchant:</strong> ${escapeHtml(merchant)}</p>`);
      if (amountCents !== null) lines.push(`<p><strong>Amount:</strong> $${(amountCents / 100).toFixed(2)}</p>`);
      if (notes) lines.push(`<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>`);
      lines.push(`<p style="color:#666;font-size:12px">Captured ${sentAt.toISOString()} by ${escapeHtml(user.email)}.</p>`);

      const result = await sendEmail({
        apiKey: c.env.RESEND_API_KEY,
        from: c.env.FROM_EMAIL,
        to: biz.hubdocEmail,
        subject,
        html: lines.join(''),
        attachments: [{
          filename: `receipt-${id}.${ext}`,
          content: base64,
          contentType: file.type || 'image/jpeg',
        }],
      });

      if (result) {
        hubdocForwardedAt = Date.now();
      } else {
        hubdocForwardError = 'Resend rejected the message (see worker logs)';
      }
    } catch (e) {
      hubdocForwardError = String(e).slice(0, 400);
      console.error('Hubdoc forward failed:', e);
    }

    await db.update(receipts).set({
      hubdocForwardedAt,
      hubdocForwardError,
      updatedAt: Date.now(),
    }).where(eq(receipts.id, id));
  }

  return c.json({
    id,
    businessId,
    photoKey,
    photoUrl: `/images/${photoKey}`,
    notes,
    merchant,
    amountCents,
    capturedAt: now,
    createdAt: now,
    hubdocForwardedAt,
    hubdocForwardError,
  }, 201);
});

/**
 * PATCH /api/receipts/:id — fill in merchant / amount / notes after the fact.
 * Useful when the bookkeeper goes through a batch and tags entries.
 */
app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const membership = await checkMembership(db, user.id, existing.businessId);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<{ notes?: string; merchant?: string; amountCents?: number | null }>();
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.notes !== undefined) patch.notes = body.notes?.trim() || null;
  if (body.merchant !== undefined) patch.merchant = body.merchant?.trim() || null;
  if (body.amountCents !== undefined) patch.amountCents = body.amountCents;

  await db.update(receipts).set(patch).where(eq(receipts.id, id));
  const [updated] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  return c.json({ ...updated, photoUrl: `/images/${updated.photoKey}` });
});

/** DELETE /api/receipts/:id — remove a receipt (also drops the R2 object). */
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const membership = await checkMembership(db, user.id, existing.businessId);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);

  // Best-effort R2 delete — if it fails the DB row's still gone; orphaned
  // bytes are tolerable (cheap storage) but the user expects the receipt
  // to disappear from the gallery.
  try { await c.env.IMAGES.delete(existing.photoKey); } catch {}
  await db.delete(receipts).where(eq(receipts.id, id));
  return c.json({ ok: true });
});

/**
 * POST /api/receipts/:id/retry-forward — re-send to Hubdoc.
 * Useful if the bookkeeper updates `hubdocEmail` after a batch is already
 * captured, or if Resend was down at the time of capture.
 */
app.post('/:id/retry-forward', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const id = c.req.param('id');

  const [existing] = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const membership = await checkMembership(db, user.id, existing.businessId);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);
  const [biz] = await db.select().from(businesses).where(eq(businesses.id, existing.businessId)).limit(1);
  if (!biz) return c.json({ error: 'Business not found' }, 404);
  if (!biz.hubdocEmail) return c.json({ error: 'No Hubdoc email configured for this business' }, 400);

  const obj = await c.env.IMAGES.get(existing.photoKey);
  if (!obj) return c.json({ error: 'Photo no longer in storage' }, 404);
  const bytes = await obj.arrayBuffer();
  const u8 = new Uint8Array(bytes);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  }
  const base64 = btoa(binary);

  const ext = existing.photoKey.split('.').pop() ?? 'jpg';
  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: biz.hubdocEmail,
    subject: `Receipt — ${existing.merchant ?? biz.name} — re-sent`,
    html: `<p>Receipt re-sent via the ${biz.name} admin app.</p>${existing.notes ? `<p>${escapeHtml(existing.notes)}</p>` : ''}`,
    attachments: [{
      filename: `receipt-${existing.id}.${ext}`,
      content: base64,
      contentType: existing.contentType || 'image/jpeg',
    }],
  });

  const hubdocForwardedAt = result ? Date.now() : null;
  const hubdocForwardError = result ? null : 'Resend rejected the message';
  await db.update(receipts).set({
    hubdocForwardedAt,
    hubdocForwardError,
    updatedAt: Date.now(),
  }).where(eq(receipts.id, id));

  return c.json({ ok: !!result, hubdocForwardedAt, hubdocForwardError });
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === '&') return '&amp;';
    if (c === '<') return '&lt;';
    if (c === '>') return '&gt;';
    if (c === '"') return '&quot;';
    return '&#39;';
  });
}

export default app;
