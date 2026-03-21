import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import { subscriptions, customers } from '@butcher/db';
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

  const price = BOX_PRICES[body.boxId];
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

  await db.insert(subscriptions).values({
    id,
    customerId: null,
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

  return c.json({ id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ status?: string; alternateBoxId?: string | null; alternateBoxName?: string | null; nextIsAlternate?: boolean }>();
  await db.update(subscriptions).set({ ...body, updatedAt: Date.now() }).where(eq(subscriptions.id, c.req.param('id')));
  return c.json({ ok: true });
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
