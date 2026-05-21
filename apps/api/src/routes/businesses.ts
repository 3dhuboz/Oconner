/**
 * Business endpoints — list the businesses the current user belongs to,
 * read a single one, and update its config (notably `hubdocEmail`).
 *
 * Built alongside the receipt-capture mini-app. Today there's only one row
 * in the `businesses` table (O'Connor Agriculture, seeded by migration
 * 0003) but the endpoints are membership-scoped from day one so adding a
 * second tenant later doesn't require an auth audit.
 */
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { businesses, businessMembers } from '@butcher/db';
import { checkMembership } from '../lib/businessAccess';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

/** GET /api/businesses/mine — businesses the current user belongs to. */
app.get('/mine', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const rows = await db.select({
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    hubdocEmail: businesses.hubdocEmail,
    active: businesses.active,
    role: businessMembers.role,
  })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(eq(businessMembers.userId, user.id));
  return c.json(rows);
});

/** GET /api/businesses/:id — single business detail (members only). */
app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const id = c.req.param('id');
  const membership = await checkMembership(db, user.id, id);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);

  const [biz] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  if (!biz) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...biz, role: membership.role });
});

/**
 * PATCH /api/businesses/:id — update config (currently just hubdocEmail).
 * Only `owner` role can modify business config — bookkeepers and members
 * can read but not change settings.
 */
app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const id = c.req.param('id');
  const membership = await checkMembership(db, user.id, id);
  if (!membership.ok) return c.json({ error: 'Forbidden' }, 403);
  if (membership.role !== 'owner') {
    return c.json({ error: 'Only business owners can change config' }, 403);
  }

  const body = await c.req.json<{ name?: string; hubdocEmail?: string | null }>();
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.hubdocEmail !== undefined) {
    // Treat empty string as clear. Trim whitespace from copy-paste mistakes.
    const cleaned = (body.hubdocEmail ?? '').trim();
    patch.hubdocEmail = cleaned === '' ? null : cleaned;
  }

  await db.update(businesses).set(patch).where(eq(businesses.id, id));
  const [updated] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  return c.json(updated);
});

export default app;
