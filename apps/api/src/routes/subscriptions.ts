import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and, gte, sql, inArray } from 'drizzle-orm';
import { subscriptions, customers, orders, deliveryDays, stops, products } from '@butcher/db';
import { createSubscriptionOrder } from '../lib/subscriptions';
import type { Env, AuthUser } from '../types';

/**
 * When a subscription is deactivated (status moved off 'active') or deleted,
 * any orders that the subscription auto-generated for FUTURE delivery days
 * become stale — Seamus doesn't want to deliver them, and they shouldn't sit
 * on the manifest. Cancel the orders, remove their stops, and decrement the
 * counters that orders.ts incremented at creation time.
 *
 * Match orders to the subscription by:
 *   1) same customer
 *   2) delivery day still in the future
 *   3) notes string starts with "Subscription: " and includes the sub's box name
 *   4) status is still cancellable (not already delivered / cancelled / refunded
 *      / out_for_delivery — those are too far along to undo)
 *
 * Real-world case that prompted this: Andrea McDonald had a fortnightly sub,
 * the cron generated an order, then the sub was deleted in favour of a
 * monthly one. The fortnightly order sat on the manifest as a phantom.
 */
async function cancelFutureSubscriptionOrders(
  db: ReturnType<typeof drizzle>,
  sub: typeof subscriptions.$inferSelect,
): Promise<{ cancelled: number }> {
  const now = Date.now();
  const NOT_CANCELLABLE = new Set(['delivered', 'cancelled', 'refunded', 'out_for_delivery']);

  // Resolve customerId — older subs may not have it stored, so fall back to email.
  let customerId = sub.customerId;
  if (!customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
    if (!cust) return { cancelled: 0 };
    customerId = cust.id;
  }

  const futureDays = await db.select({ id: deliveryDays.id })
    .from(deliveryDays).where(gte(deliveryDays.date, now));
  if (futureDays.length === 0) return { cancelled: 0 };
  const futureDayIds = futureDays.map((d) => d.id);

  const candidateOrders = await db.select().from(orders).where(
    and(
      eq(orders.customerId, customerId),
      inArray(orders.deliveryDayId, futureDayIds),
    ),
  );

  let cancelled = 0;
  for (const order of candidateOrders) {
    if (NOT_CANCELLABLE.has(order.status)) continue;
    if (!order.notes?.startsWith('Subscription:')) continue;
    // Match the subscription's box name so we don't accidentally cancel an
    // order from a different sub the same customer may have.
    if (!order.notes.includes(sub.boxName)) continue;

    await db.update(orders).set({
      status: 'cancelled',
      paymentStatus: 'cancelled',
      internalNotes: (order.internalNotes ? order.internalNotes + '\n' : '')
        + `[auto-cancelled: subscription ${sub.id} (${sub.boxName} ${sub.frequency}) was deactivated]`,
      updatedAt: now,
    }).where(eq(orders.id, order.id));

    // Drop the stop so the order disappears from the manifest map / list.
    await db.delete(stops).where(eq(stops.orderId, order.id));

    // Decrement counters that were incremented when the order was generated.
    // Guard against going below zero in case the counter is already stale.
    await db.update(deliveryDays)
      .set({ orderCount: sql`${deliveryDays.orderCount} - 1` })
      .where(and(eq(deliveryDays.id, order.deliveryDayId), gte(deliveryDays.orderCount, 1)));
    await db.update(customers).set({
      orderCount: sql`${customers.orderCount} - 1`,
      totalSpent: sql`${customers.totalSpent} - ${order.total}`,
      updatedAt: now,
    }).where(and(eq(customers.id, customerId), gte(customers.orderCount, 1)));

    cancelled++;
  }
  return { cancelled };
}

const SQUARE_API = 'https://connect.squareup.com/v2';

const BOX_PRICES: Record<string, number> = {
  bbq: 29000,      // $290.00 in cents
  family: 29000,
  double: 55000,
  value: 22000,
};

const FREQUENCY_MAP: Record<string, string> = {
  weekly: 'WEEKLY',
  fortnightly: 'EVERY_TWO_WEEKS',
  monthly: 'MONTHLY',
};

// Square API call helper kept local to this file (used by /checkout flow for
// new subscription signups). The subscription-order creation logic itself
// lives in ../lib/subscriptions.ts.
async function squareRequest(accessToken: string, path: string, body: unknown): Promise<Record<string, unknown>> {
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

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// ── Square Checkout for new subscriptions (public — no auth) ──
// Supports two modes:
// 1. Card token (sourceId) — charges inline, saves card for recurring
// 2. No token (fallback) — creates Square Payment Link for redirect
app.post('/checkout', async (c) => {
  const body = await c.req.json<{
    email: string; name: string; phone: string;
    address: string; suburb: string; postcode: string; notes?: string;
    boxId: string; boxName: string;
    alternateBoxId?: string; alternateBoxName?: string;
    frequency: string;
    sourceId?: string; // Square Web Payments SDK card token
  }>();

  // Try hardcoded prices first (storefront short IDs), then look up product by UUID
  let price = BOX_PRICES[body.boxId];
  if (!price) {
    const db2 = drizzle(c.env.DB);
    const [prod] = await db2.select().from(products).where(eq(products.id, body.boxId)).limit(1);
    price = prod?.fixedPrice ?? 0;
  }
  if (!price) return c.json({ error: 'Invalid box' }, 400);

  if (!FREQUENCY_MAP[body.frequency]) return c.json({ error: 'Invalid frequency' }, 400);

  const storefrontUrl = c.env.STOREFRONT_URL || 'https://oconnoragriculture.com.au';
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;

  if (!accessToken || !locationId) {
    return c.json({ error: 'Square not configured' }, 503);
  }

  const db = drizzle(c.env.DB);
  const now = Date.now();
  const subId = crypto.randomUUID();

  // Find or create local customer
  let customerId: string | null = null;
  const [existing] = await db.select().from(customers).where(eq(customers.email, body.email)).limit(1);
  if (existing) {
    customerId = existing.id;
  } else {
    customerId = crypto.randomUUID();
    await db.insert(customers).values({
      id: customerId,
      email: body.email,
      name: body.name,
      phone: body.phone,
      accountType: 'registered',
      orderCount: 0,
      totalSpent: 0,
      blacklisted: false,
      notes: body.notes ? `Delivery notes: ${body.notes}` : '',
      createdAt: now,
      updatedAt: now,
    });
  }

  // ── Mode 1: Card token provided — charge inline + save card ──
  if (body.sourceId) {
    try {
      // 1. Find or create Square customer
      let squareCustId = existing?.squareCustomerId ?? null;
      if (!squareCustId) {
        const custResult = await squareRequest(accessToken, '/customers', {
          idempotency_key: crypto.randomUUID(),
          given_name: body.name.split(' ')[0] ?? '',
          family_name: body.name.split(' ').slice(1).join(' ') ?? '',
          email_address: body.email,
          phone_number: body.phone ? `+61${body.phone.replace(/^0/, '').replace(/\s/g, '')}` : undefined,
        });
        squareCustId = (custResult.customer as any)?.id;
        if (!squareCustId) return c.json({ error: 'Failed to create Square customer', details: custResult.errors }, 500);
      }

      // 2. Charge the card (first payment)
      const payResult = await squareRequest(accessToken, '/payments', {
        idempotency_key: crypto.randomUUID(),
        source_id: body.sourceId,
        amount_money: { amount: price, currency: 'AUD' },
        customer_id: squareCustId,
        location_id: locationId,
        autocomplete: true,
        note: `Subscription: ${body.boxName} (${body.frequency})`,
      });

      if (payResult.errors) {
        return c.json({ error: 'Payment failed', details: payResult.errors }, 400);
      }

      // 3. Save card on file for future recurring charges
      const cardResult = await squareRequest(accessToken, '/cards', {
        idempotency_key: crypto.randomUUID(),
        source_id: body.sourceId,
        card: {
          customer_id: squareCustId,
        },
      });

      const savedCard = (cardResult.card as any) ?? {};
      const cardId = savedCard.id ?? null;
      const cardLast4 = savedCard.last_4 ?? null;
      const cardBrand = savedCard.card_brand ?? null;

      // 4. Store Square IDs on customer
      await db.update(customers).set({
        squareCustomerId: squareCustId,
        squareCardId: cardId,
        squareCardLast4: cardLast4,
        squareCardBrand: cardBrand,
        updatedAt: now,
      }).where(eq(customers.id, customerId!));

      // 5. Create subscription
      await db.insert(subscriptions).values({
        id: subId, customerId, email: body.email,
        boxId: body.boxId, boxName: body.boxName,
        alternateBoxId: body.alternateBoxId ?? null, alternateBoxName: body.alternateBoxName ?? null,
        nextIsAlternate: false, frequency: body.frequency, status: 'active',
        createdAt: now, updatedAt: now,
      });

      // 6. Create first order (already paid via the inline card charge above).
      // Mode-1 (sourceId provided) means we just charged the customer's card
      // successfully — auto-charge inside createSubscriptionOrder will succeed
      // again because the card is now saved, so status flips to 'confirmed'
      // automatically.
      await createSubscriptionOrder(db, {
        customerId: customerId!,
        email: body.email, name: body.name, phone: body.phone,
        address: { line1: body.address, suburb: body.suburb, state: 'QLD', postcode: body.postcode },
        boxId: body.boxId, boxName: body.boxName, frequency: body.frequency, price,
        subscriptionId: subId, now, env: c.env,
      });

      return c.json({ ok: true, subscriptionId: subId, cardLast4, cardBrand });
    } catch (e: any) {
      return c.json({ error: e?.message ?? 'Subscription checkout failed' }, 500);
    }
  }

  // ── Mode 2: No token — fallback to Square Payment Link ──
  const result = await squareRequest(accessToken, '/online-checkout/payment-links', {
    idempotency_key: crypto.randomUUID(),
    quick_pay: {
      name: `${body.boxName} — ${body.frequency} subscription`,
      price_money: { amount: price, currency: 'AUD' },
      location_id: locationId,
    },
    checkout_options: {
      redirect_url: `${storefrontUrl}/subscribe/success`,
      ask_for_shipping_address: false,
    },
    pre_populated_data: {
      buyer_email: body.email,
      ...(body.phone ? { buyer_phone_number: body.phone.replace(/^0/, '+61').replace(/\s/g, '') } : {}),
    },
    payment_note: `Subscription: ${body.boxName} (${body.frequency}). Customer: ${body.name}, ${body.address}, ${body.suburb} ${body.postcode}`,
  });

  const paymentLink = result.payment_link as { url?: string } | undefined;
  if (!paymentLink?.url) {
    console.error('Square checkout error:', JSON.stringify(result));
    return c.json({ error: 'Failed to create checkout', details: result.errors ?? result }, 500);
  }

  await db.insert(subscriptions).values({
    id: subId, customerId, email: body.email,
    boxId: body.boxId, boxName: body.boxName,
    alternateBoxId: body.alternateBoxId ?? null, alternateBoxName: body.alternateBoxName ?? null,
    nextIsAlternate: false, frequency: body.frequency, status: 'active',
    createdAt: now, updatedAt: now,
  });

  // Mode-2: customer is redirected to Square's hosted Payment Link. We don't
  // know the outcome yet, so the order is created as pending_payment and
  // status stays as 'pending_payment' (not 'confirmed') — it'll be confirmed
  // only when payment lands. Cron-sweep cancels it if abandoned > 12h.
  await createSubscriptionOrder(db, {
    customerId: customerId!,
    email: body.email, name: body.name, phone: body.phone,
    address: { line1: body.address, suburb: body.suburb, state: 'QLD', postcode: body.postcode },
    boxId: body.boxId, boxName: body.boxName, frequency: body.frequency, price,
    subscriptionId: subId, now,
  });

  return c.json({ url: paymentLink.url });
});

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select({
    id: subscriptions.id,
    customerId: subscriptions.customerId,
    email: subscriptions.email,
    boxId: subscriptions.boxId,
    boxName: subscriptions.boxName,
    alternateBoxId: subscriptions.alternateBoxId,
    alternateBoxName: subscriptions.alternateBoxName,
    nextIsAlternate: subscriptions.nextIsAlternate,
    frequency: subscriptions.frequency,
    status: subscriptions.status,
    createdAt: subscriptions.createdAt,
    lastOrderGeneratedAt: subscriptions.lastOrderGeneratedAt,
    customerName: customers.name,
    customerPhone: customers.phone,
  })
  .from(subscriptions)
  .leftJoin(customers, eq(subscriptions.email, customers.email))
  .orderBy(desc(subscriptions.createdAt));
  return c.json(rows);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{
    email: string; name?: string; phone?: string; address?: string;
    suburb?: string; postcode?: string; notes?: string;
    boxId: string; boxName: string;
    alternateBoxId?: string; alternateBoxName?: string;
    frequency: string; status?: string;
  }>();
  const now = Date.now();
  const id = crypto.randomUUID();

  // Find or create customer for admin-created subscriptions
  let customerId: string | null = null;
  const [existing] = await db.select().from(customers).where(eq(customers.email, body.email)).limit(1);
  if (existing) {
    customerId = existing.id;
  } else if (body.name) {
    customerId = crypto.randomUUID();
    await db.insert(customers).values({
      id: customerId,
      email: body.email,
      name: body.name,
      phone: body.phone ?? '',
      accountType: 'registered',
      orderCount: 0,
      totalSpent: 0,
      blacklisted: false,
      notes: body.notes ? `Delivery notes: ${body.notes}` : '',
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(subscriptions).values({
    id,
    customerId,
    email: body.email,
    boxId: body.boxId,
    boxName: body.boxName,
    alternateBoxId: body.alternateBoxId ?? null,
    alternateBoxName: body.alternateBoxName ?? null,
    nextIsAlternate: false,
    frequency: body.frequency,
    status: body.status ?? 'pending',
    createdAt: now,
    updatedAt: now,
  });

  // Create linked order if customer and address info available
  let orderPrice = BOX_PRICES[body.boxId];
  if (!orderPrice) {
    const [prod] = await db.select().from(products).where(eq(products.id, body.boxId)).limit(1);
    orderPrice = prod?.fixedPrice ?? 0;
  }
  if (customerId && body.address && orderPrice) {
    // Admin-created sub via POST /. Force the order to 'confirmed' so it
    // ships on the manifest — admin creates these for customers they intend
    // to deliver to, and we don't want the cron-sweep to cancel it after 12h
    // just because the customer has no card on file. Seamus will send a
    // Square Invoice from the Order Detail page to collect.
    await createSubscriptionOrder(db, {
      customerId,
      email: body.email,
      name: body.name ?? body.email,
      phone: body.phone ?? '',
      address: { line1: body.address, suburb: body.suburb ?? '', state: 'QLD', postcode: body.postcode ?? '' },
      boxId: body.boxId,
      boxName: body.boxName,
      frequency: body.frequency,
      price: orderPrice,
      subscriptionId: id,
      now,
      env: c.env,
      forceStatus: 'confirmed',
    });
  }

  return c.json({ id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const subId = c.req.param('id');
  const body = await c.req.json<{
    status?: string;
    boxId?: string;
    boxName?: string;
    alternateBoxId?: string | null;
    alternateBoxName?: string | null;
    nextIsAlternate?: boolean;
    frequency?: string;
    customerName?: string;
    customerPhone?: string;
    email?: string;
  }>();
  const allowed: Record<string, unknown> = {};
  for (const key of ['status', 'boxId', 'boxName', 'alternateBoxId', 'alternateBoxName', 'nextIsAlternate', 'frequency', 'customerName', 'customerPhone', 'email', 'createdAt', 'lastOrderGeneratedAt'] as const) {
    if ((body as any)[key] !== undefined) allowed[key] = (body as any)[key];
  }
  allowed.updatedAt = Date.now();

  // If the sub is being deactivated, snapshot it first so we can cancel any
  // future orders it had already auto-generated. Snapshot must happen BEFORE
  // the update so the helper sees the original boxName/frequency for matching.
  let cancelled = 0;
  if (allowed.status && allowed.status !== 'active') {
    const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
    if (current && current.status === 'active') {
      const result = await cancelFutureSubscriptionOrders(db, current);
      cancelled = result.cancelled;
    }
  }

  await db.update(subscriptions).set(allowed).where(eq(subscriptions.id, subId));
  return c.json({ ok: true, cancelledFutureOrders: cancelled });
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const subId = c.req.param('id');
  // Snapshot the subscription before deletion so we can clean up its
  // auto-generated future orders (boxName + frequency are used for matching).
  const [current] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
  let cancelled = 0;
  if (current) {
    const result = await cancelFutureSubscriptionOrders(db, current);
    cancelled = result.cancelled;
  }
  await db.delete(subscriptions).where(eq(subscriptions.id, subId));
  return c.json({ ok: true, cancelledFutureOrders: cancelled });
});

// Generate an order from an active subscription for the next delivery day
app.post('/:id/generate-order', async (c) => {
  const db = drizzle(c.env.DB);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, c.req.param('id'))).limit(1);
  if (!sub) return c.json({ error: 'Subscription not found' }, 404);
  if (sub.status !== 'active') return c.json({ error: 'Subscription is not active' }, 400);

  // Find the customer
  let customerId = sub.customerId;
  if (!customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
    if (!cust) return c.json({ error: 'Customer not found — create the customer first' }, 400);
    customerId = cust.id;
  }

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return c.json({ error: 'Customer not found' }, 400);

  // Use the correct box (primary or alternate)
  const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
  const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;

  // Look up product price — try exact ID, then prod-{name}-box pattern, then name match
  const { like } = await import('drizzle-orm');
  let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
  if (!boxProduct) {
    [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
  }
  if (!boxProduct) {
    [boxProduct] = await db.select().from(products).where(like(products.name, `%${boxName.replace(' Box', '')}%Box%`)).limit(1);
  }
  const price = boxProduct?.fixedPrice ?? 0;
  const resolvedBoxId = boxProduct?.id ?? boxId;
  if (!price) return c.json({ error: 'Box product not found or has no price' }, 400);

  // Get customer address — try stored addresses, fallback to most recent order
  let address = { line1: '', suburb: '', state: 'QLD', postcode: '' };
  try {
    const addresses = JSON.parse(customer.addresses ?? '[]') as Array<{ line1: string; suburb: string; state: string; postcode: string }>;
    if (addresses.length > 0) address = addresses[0];
  } catch {}
  if (!address.line1) {
    const [lastOrder] = await db.select().from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt)).limit(1);
    if (lastOrder) {
      try { address = JSON.parse(lastOrder.deliveryAddress) as typeof address; } catch {}
    }
  }

  if (!address.line1) {
    return c.json({ error: 'Customer has no delivery address — add one in Customers first' }, 400);
  }

  const now = Date.now();
  // Manual "create order now" from the admin Subscriptions page. Force the
  // resulting order to 'confirmed' so it ships even when no saved card is on
  // file — Seamus is explicitly creating this for delivery and will collect
  // payment via Send Square Invoice in admin.
  const orderId = await createSubscriptionOrder(db, {
    customerId,
    email: sub.email,
    name: customer.name ?? sub.email,
    phone: customer.phone ?? '',
    address,
    boxId: resolvedBoxId,
    boxName,
    frequency: sub.frequency,
    price,
    subscriptionId: sub.id,
    now,
    env: c.env,
    forceStatus: 'confirmed',
  });

  if (!orderId) return c.json({ error: 'No upcoming delivery day available' }, 400);

  // Update tracking and flip alternate box for next time
  const updateData: Record<string, unknown> = { lastOrderGeneratedAt: now, updatedAt: now };
  if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
  await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));

  return c.json({ orderId });
});

// ── Auto-generate orders for all active subscriptions that are due ──
// Called automatically when generating stops for a delivery day, or manually
app.post('/auto-generate', async (c) => {
  const db = drizzle(c.env.DB);
  const now = Date.now();

  // Frequency intervals in milliseconds
  const FREQ_MS: Record<string, number> = {
    weekly: 7 * 24 * 60 * 60 * 1000,
    fortnightly: 14 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  // Get all active subscriptions
  const activeSubs = await db.select().from(subscriptions)
    .where(eq(subscriptions.status, 'active'));

  let created = 0;
  const errors: string[] = [];

  for (const sub of activeSubs) {
    // Check if this subscription is due for a new order
    const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
    const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;

    // Skip if not enough time has elapsed since last order
    if (now - lastGenerated < interval * 0.8) continue; // 80% threshold to avoid edge-case misses

    // Find customer
    let customerId = sub.customerId;
    if (!customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
      if (!cust) { errors.push(`${sub.email}: no customer record`); continue; }
      customerId = cust.id;
    }

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) { errors.push(`${sub.email}: customer not found`); continue; }

    // Get address — try stored, fallback to most recent order
    let address = { line1: '', suburb: '', state: 'QLD', postcode: '' };
    try {
      const addresses = JSON.parse(customer.addresses ?? '[]') as Array<{ line1: string; suburb: string; state: string; postcode: string }>;
      if (addresses.length > 0) address = addresses[0];
    } catch {}
    if (!address.line1) {
      const [lastOrder] = await db.select().from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(desc(orders.createdAt)).limit(1);
      if (lastOrder) {
        try { address = JSON.parse(lastOrder.deliveryAddress) as typeof address; } catch {}
      }
    }

    if (!address.line1) { errors.push(`${sub.email}: no delivery address`); continue; }

    // Use the correct box (primary or alternate)
    const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
    const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;

    // Look up product price — try exact ID, then prod-{name}-box, then name match
    const { like } = await import('drizzle-orm');
    let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
    if (!boxProduct) {
      [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
    }
    if (!boxProduct) {
      [boxProduct] = await db.select().from(products).where(like(products.name, `%${boxName.replace(' Box', '')}%Box%`)).limit(1);
    }
    const price = boxProduct?.fixedPrice ?? 0;
    const resolvedBoxId = boxProduct?.id ?? boxId;
    if (!price) { errors.push(`${sub.email}: box product not found or no price`); continue; }

    // Batch /auto-generate endpoint — same intent as the cron and as
    // /generate-order: create + ship + collect payment after. Force confirmed.
    const orderId = await createSubscriptionOrder(db, {
      customerId,
      email: sub.email,
      name: customer.name ?? sub.email,
      phone: customer.phone ?? '',
      address,
      boxId: resolvedBoxId,
      boxName,
      frequency: sub.frequency,
      price,
      subscriptionId: sub.id,
      now,
      env: c.env,
      forceStatus: 'confirmed',
    });

    if (!orderId) { errors.push(`${sub.email}: no upcoming delivery day`); continue; }

    // Update subscription tracking
    const updateData: Record<string, unknown> = { lastOrderGeneratedAt: now, updatedAt: now };
    if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
    await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));

    created++;
  }

  return c.json({ created, skipped: activeSubs.length - created - errors.length, errors });
});

// Flip next delivery box (alternate ↔ primary)
app.post('/:id/mark-sent', async (c) => {
  const db = drizzle(c.env.DB);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, c.req.param('id'))).limit(1);
  if (!sub) return c.json({ error: 'Not found' }, 404);
  if (!sub.alternateBoxId) return c.json({ error: 'No alternate box configured' }, 400 );
  await db.update(subscriptions)
    .set({ nextIsAlternate: !sub.nextIsAlternate, updatedAt: Date.now() })
    .where(eq(subscriptions.id, sub.id));
  return c.json({ nextIsAlternate: !sub.nextIsAlternate });
});

export default app;
