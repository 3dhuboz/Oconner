import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and, gte, asc } from 'drizzle-orm';
import { subscriptions, customers, orders, deliveryDays, products } from '@butcher/db';
import { deductStock } from '../lib/stock';
import type { Env, AuthUser } from '../types';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createSubscriptionOrder(db: any, opts: {
  customerId: string;
  email: string;
  name: string;
  phone: string;
  address: { line1: string; line2?: string; suburb: string; state: string; postcode: string };
  boxId: string;
  boxName: string;
  price: number; // cents
  subscriptionId: string;
  now: number;
}) {
  // Find the next upcoming active delivery day
  const [nextDay] = await db.select().from(deliveryDays)
    .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, opts.now)))
    .orderBy(asc(deliveryDays.date))
    .limit(1);
  if (!nextDay) return null; // No delivery day available

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
    status: 'confirmed',
    deliveryDayId: nextDay.id,
    deliveryAddress: JSON.stringify(opts.address),
    postcodeZone: '',
    paymentIntentId: '',
    paymentProvider: 'square',
    paymentStatus: 'paid',
    notes: `Subscription box: ${opts.boxName}`,
    createdAt: opts.now,
    updatedAt: opts.now,
  });

  // Deduct stock for the subscription box
  await deductStock(db, [item], orderId, opts.now);

  // Update delivery day order count and customer stats
  await db.update(deliveryDays).set({ orderCount: nextDay.orderCount + 1 }).where(eq(deliveryDays.id, nextDay.id));
  const [cust] = await db.select().from(customers).where(eq(customers.id, opts.customerId)).limit(1);
  if (cust) {
    await db.update(customers).set({
      orderCount: cust.orderCount + 1,
      totalSpent: cust.totalSpent + opts.price,
      updatedAt: opts.now,
    }).where(eq(customers.id, opts.customerId));
  }

  return orderId;
}

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// ── Square Checkout for new subscriptions (public — no auth) ──
app.post('/checkout', async (c) => {
  const body = await c.req.json<{
    email: string; name: string; phone: string;
    address: string; suburb: string; postcode: string; notes?: string;
    boxId: string; boxName: string;
    alternateBoxId?: string; alternateBoxName?: string;
    frequency: string;
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

  // Create a Square Payment Link for the first subscription payment
  const result = await squareRequest(accessToken, '/online-checkout/payment-links', {
    idempotency_key: crypto.randomUUID(),
    quick_pay: {
      name: `${body.boxName} — ${body.frequency} subscription`,
      price_money: {
        amount: price,
        currency: 'AUD',
      },
      location_id: locationId,
    },
    checkout_options: {
      redirect_url: `${storefrontUrl}/subscribe/success`,
      ask_for_shipping_address: false,
    },
    pre_populated_data: {
      buyer_email: body.email,
      buyer_phone_number: body.phone,
    },
    payment_note: `Subscription: ${body.boxName} (${body.frequency}). Customer: ${body.name}, ${body.address}, ${body.suburb} ${body.postcode}`,
  });

  const paymentLink = result.payment_link as { url?: string } | undefined;
  if (!paymentLink?.url) {
    return c.json({ error: 'Failed to create checkout' }, 500);
  }

  // Create subscription in our DB as 'pending' — will be activated when payment succeeds
  const db = drizzle(c.env.DB);
  const now = Date.now();
  const subId = crypto.randomUUID();

  // Find or create customer
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

  await db.insert(subscriptions).values({
    id: subId,
    customerId,
    email: body.email,
    boxId: body.boxId,
    boxName: body.boxName,
    alternateBoxId: body.alternateBoxId ?? null,
    alternateBoxName: body.alternateBoxName ?? null,
    nextIsAlternate: false,
    frequency: body.frequency,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // Create a linked order so subscription appears on Orders page
  await createSubscriptionOrder(db, {
    customerId: customerId!,
    email: body.email,
    name: body.name,
    phone: body.phone,
    address: { line1: body.address, suburb: body.suburb, state: 'QLD', postcode: body.postcode },
    boxId: body.boxId,
    boxName: body.boxName,
    price,
    subscriptionId: subId,
    now,
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
    await createSubscriptionOrder(db, {
      customerId,
      email: body.email,
      name: body.name ?? body.email,
      phone: body.phone ?? '',
      address: { line1: body.address, suburb: body.suburb ?? '', state: 'QLD', postcode: body.postcode ?? '' },
      boxId: body.boxId,
      boxName: body.boxName,
      price: orderPrice,
      subscriptionId: id,
      now,
    });
  }

  return c.json({ id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ status?: string; alternateBoxId?: string | null; alternateBoxName?: string | null; nextIsAlternate?: boolean }>();
  await db.update(subscriptions).set({ ...body, updatedAt: Date.now() }).where(eq(subscriptions.id, c.req.param('id')));
  return c.json({ ok: true });
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
  const orderId = await createSubscriptionOrder(db, {
    customerId,
    email: sub.email,
    name: customer.name ?? sub.email,
    phone: customer.phone ?? '',
    address,
    boxId: resolvedBoxId,
    boxName,
    price,
    subscriptionId: sub.id,
    now,
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

    const orderId = await createSubscriptionOrder(db, {
      customerId,
      email: sub.email,
      name: customer.name ?? sub.email,
      phone: customer.phone ?? '',
      address,
      boxId: resolvedBoxId,
      boxName,
      price,
      subscriptionId: sub.id,
      now,
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
