/**
 * Subscription order creation — single source of truth.
 *
 * Three places used to inline duplicate `db.insert(orders)` calls for
 * subscription deliveries:
 *
 *   1. Daily cron in apps/api/src/index.ts (auto-generates orders for due subs)
 *   2. POST /delivery-days/:id/generate-stops in routes/deliveryDays.ts
 *   3. POST /subscriptions/:id/generate-order in routes/subscriptions.ts
 *      (and POST /subscriptions/checkout for new sub signup)
 *
 * (1) and (2) hardcoded `paymentStatus: 'paid'` without ever calling Square.
 * Andrea McDonald spotted this when she received her monthly box and noticed
 * no card had been charged — total damage across 4 customers / 9 deliveries
 * was $2,210.
 *
 * This helper unifies the three paths:
 *   - Tries to auto-charge a saved Square card when one exists
 *   - Falls back to `payment_status='pending_payment'` when no card / no env
 *   - Pauses the subscription + emails the customer when a saved card fails
 *   - Caller can opt into `forceStatus: 'confirmed'` so the order ships
 *     anyway (used by cron + generate-stops — Seamus delivers and chases
 *     payment), or leave it auto so storefront checkout orders only ship
 *     once payment lands.
 *
 * Notes format is `Subscription: {boxName} ({frequency})` so the
 * cancelFutureSubscriptionOrders helper can match these via prefix.
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { orders, customers, deliveryDays, subscriptions } from '@butcher/db';
import { deductStock } from './stock';
import type { Env } from '../types';

const SQUARE_API = 'https://connect.squareup.com/v2';

async function squareRequest(
  accessToken: string,
  path: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${SQUARE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

export interface CreateSubscriptionOrderOpts {
  customerId: string;
  email: string;
  name: string;
  phone: string;
  address: { line1: string; line2?: string; suburb: string; state: string; postcode: string };
  boxId: string;
  boxName: string;
  /** Used in the customer-visible `notes` field, e.g. "Subscription: 10kg Box (monthly)" */
  frequency?: string;
  /** Price in cents (GST inclusive). */
  price: number;
  /** Subscription this order was generated from — used for traceability and audit. */
  subscriptionId: string;
  now: number;
  /** Pass env to enable auto-charging via Square + payment_action_required emails. */
  env?: Env;
  /**
   * Override the resulting `orders.status` regardless of payment outcome.
   *
   * - Default (undefined): `'confirmed'` if charge succeeded, else
   *   `'pending_payment'`. Storefront /subscriptions/checkout uses this so
   *   Mode-2 (Payment Link) orders only ship once the customer pays.
   *
   * - `'confirmed'`: ship the order no matter what the payment outcome was.
   *   Used by the cron + generate-stops paths — Seamus delivers his weekly
   *   route from the manifest and would rather chase payment than miss a
   *   delivery.
   */
  forceStatus?: 'confirmed';
  /**
   * Optional: target a specific delivery day instead of letting the helper
   * pick the next active one. Used by POST /delivery-days/:id/generate-stops
   * which is called when Seamus prepares a specific day's manifest.
   */
  deliveryDayId?: string;
}

/**
 * Returns the new order's UUID, or `null` if there's no upcoming active
 * delivery day to attach it to. The caller is expected to bump
 * `subscriptions.lastOrderGeneratedAt` and (if alternating) flip
 * `nextIsAlternate` afterwards.
 */
export async function createSubscriptionOrder(
  db: ReturnType<typeof drizzle>,
  opts: CreateSubscriptionOrderOpts,
): Promise<string | null> {
  const { asc, and, gte } = await import('drizzle-orm');

  // Pick the delivery day this order will land on. If the caller specified
  // one (generate-stops does), use that; otherwise find the next upcoming
  // active day.
  let nextDay;
  if (opts.deliveryDayId) {
    [nextDay] = await db.select().from(deliveryDays)
      .where(eq(deliveryDays.id, opts.deliveryDayId))
      .limit(1);
  } else {
    [nextDay] = await db.select().from(deliveryDays)
      .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, opts.now)))
      .orderBy(asc(deliveryDays.date))
      .limit(1);
  }
  if (!nextDay) return null;

  const orderId = crypto.randomUUID();
  const gst = Math.round(opts.price / 11); // GST inclusive
  const subtotal = opts.price - gst;

  const item = {
    productId: opts.boxId,
    productName: opts.boxName,
    isMeatPack: true,
    quantity: 1,
    lineTotal: opts.price,
  };

  // ── Try to auto-charge saved card ──
  // Default to pending_payment. Only flip to 'paid' if Square confirms the
  // charge. NEVER hardcode 'paid' without a real charge — that was the
  // bug Andrea caught.
  let paymentStatus: 'paid' | 'pending_payment' | 'payment_failed' = 'pending_payment';
  let paymentIntentId = '';
  let chargeFailureReason: string | null = null;

  if (opts.env?.SQUARE_ACCESS_TOKEN && opts.env?.SQUARE_LOCATION_ID) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, opts.customerId)).limit(1);
    if (cust?.squareCardId && cust?.squareCustomerId) {
      try {
        const chargeResult = await squareRequest(opts.env.SQUARE_ACCESS_TOKEN, '/payments', {
          idempotency_key: crypto.randomUUID(),
          source_id: cust.squareCardId,
          amount_money: { amount: opts.price, currency: 'AUD' },
          customer_id: cust.squareCustomerId,
          location_id: opts.env.SQUARE_LOCATION_ID,
          autocomplete: true,
          note: `Subscription renewal: ${opts.boxName}`,
        });

        if (chargeResult.errors) {
          console.error('Auto-charge failed:', JSON.stringify(chargeResult.errors));
          paymentStatus = 'payment_failed';
          chargeFailureReason = JSON.stringify(chargeResult.errors).slice(0, 500);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paymentIntentId = ((chargeResult.payment as any)?.id ?? '') as string;
          paymentStatus = 'paid';
        }
      } catch (e) {
        console.error('Auto-charge error:', e);
        paymentStatus = 'payment_failed';
        chargeFailureReason = String(e).slice(0, 500);
      }
    }
    // else: no saved card → paymentStatus stays at 'pending_payment'
  }
  // else: no Square env passed → paymentStatus stays at 'pending_payment'

  // If the saved card failed (likely revoked / expired / CVV change), pause
  // the subscription so the cron doesn't keep retrying the same dead card,
  // and email the customer asking them to re-enter payment details.
  if (paymentStatus === 'payment_failed' && opts.subscriptionId) {
    try {
      await db.update(subscriptions)
        .set({ status: 'payment_action_required', updatedAt: opts.now })
        .where(eq(subscriptions.id, opts.subscriptionId));
      const { sendEmail } = await import('./email');
      const accountUrl = `${opts.env?.STOREFRONT_URL ?? 'https://oconnoragriculture.com.au'}/account`;
      await sendEmail({
        apiKey: opts.env?.RESEND_API_KEY ?? '',
        from: opts.env?.FROM_EMAIL ?? "O'Connor Agriculture <orders@oconnoragriculture.com.au>",
        to: opts.email,
        subject: 'Action needed: update payment details for your O\'Connor subscription',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#333">
            <h2 style="color:#4E7732">Your subscription needs a new card</h2>
            <p>Hi ${opts.name},</p>
            <p>We tried to charge your saved card for this fortnight's <strong>${opts.boxName}</strong> subscription delivery, but the payment didn't go through.</p>
            <p>Your subscription is paused until you re-enter card details. Click below to update — your usual schedule resumes as soon as a new card is on file.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${accountUrl}" style="background:#4E7732;color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold">Update payment details</a>
            </p>
            <p style="color:#666;font-size:13px">If you've recently changed banks or your card expired, this is the most common reason. Once updated, your next box ships on the original schedule.</p>
          </div>`,
      });
    } catch (e) {
      console.error('subscription pause/notify failed:', e);
    }
  }

  // Decide order.status:
  //  - forceStatus='confirmed' → ship regardless (cron / generate-stops)
  //  - default behaviour:        ship if paid, hold as pending_payment otherwise
  const orderStatus = opts.forceStatus
    ?? (paymentStatus === 'paid' ? 'confirmed' : 'pending_payment');

  // Notes format kept consistent so cancelFutureSubscriptionOrders can match
  // these via 'Subscription:' prefix + sub.boxName substring.
  const freqSuffix = opts.frequency ? ` (${opts.frequency})` : '';
  const notes = `Subscription: ${opts.boxName}${freqSuffix}`
    + (paymentStatus === 'payment_failed' ? ' — AUTO-CHARGE FAILED' : '');

  // Annotate the failure reason in internal_notes for the admin to read.
  const internalNotes = chargeFailureReason
    ? `Auto-charge failed: ${chargeFailureReason}`
    : '';

  await db.insert(orders).values({
    id: orderId,
    customerId: opts.customerId,
    customerEmail: opts.email,
    customerName: opts.name,
    customerPhone: opts.phone,
    items: JSON.stringify([item]),
    subtotal,
    deliveryFee: 0,
    gst,
    total: opts.price,
    status: orderStatus,
    deliveryDayId: nextDay.id,
    deliveryAddress: JSON.stringify(opts.address),
    postcodeZone: '',
    paymentIntentId,
    paymentProvider: 'square',
    paymentStatus,
    notes,
    internalNotes,
    createdAt: opts.now,
    updatedAt: opts.now,
  });

  // Deduct stock for the subscription box.
  await deductStock(db, [item], orderId, opts.now);

  // Atomic counter updates (no read-then-write, so concurrent flows can't
  // clobber each other).
  await db.update(deliveryDays)
    .set({ orderCount: sql`${deliveryDays.orderCount} + 1` })
    .where(eq(deliveryDays.id, nextDay.id));
  await db.update(customers).set({
    orderCount: sql`${customers.orderCount} + 1`,
    totalSpent: sql`${customers.totalSpent} + ${opts.price}`,
    updatedAt: opts.now,
  }).where(eq(customers.id, opts.customerId));

  return orderId;
}
