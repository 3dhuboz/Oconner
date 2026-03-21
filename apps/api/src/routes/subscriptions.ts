import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import { subscriptions, customers } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const STRIPE_API = 'https://api.stripe.com/v1';

const BOX_PRICES: Record<string, number> = {
  bbq: 29000,      // $290.00 in cents
  family: 29000,
  double: 55000,
  value: 22000,
};

const FREQUENCY_INTERVALS: Record<string, { interval: string; interval_count: number }> = {
  weekly: { interval: 'week', interval_count: 1 },
  fortnightly: { interval: 'week', interval_count: 2 },
  monthly: { interval: 'month', interval_count: 1 },
};

async function stripeRequest(secretKey: string, path: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// ── Stripe Checkout for new subscriptions (public — no auth) ──
// This is mounted BEFORE requireAuth in index.ts
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

  const freq = FREQUENCY_INTERVALS[body.frequency];
  if (!freq) return c.json({ error: 'Invalid frequency' }, 400);

  const storefrontUrl = c.env.STOREFRONT_URL || 'https://oconnoragriculture.com.au';

  // Create Stripe Checkout Session in subscription mode
  const params: Record<string, string> = {
    'mode': 'subscription',
    'customer_email': body.email,
    'line_items[0][price_data][currency]': 'aud',
    'line_items[0][price_data][product_data][name]': `${body.boxName} — ${body.frequency} subscription`,
    'line_items[0][price_data][product_data][description]': `Premium grass-fed beef box delivered ${body.frequency}`,
    'line_items[0][price_data][unit_amount]': String(price),
    'line_items[0][price_data][recurring][interval]': freq.interval,
    'line_items[0][price_data][recurring][interval_count]': String(freq.interval_count),
    'line_items[0][quantity]': '1',
    'success_url': `${storefrontUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': `${storefrontUrl}/subscribe`,
    'metadata[type]': 'subscription',
    'metadata[boxId]': body.boxId,
    'metadata[boxName]': body.boxName,
    'metadata[frequency]': body.frequency,
    'metadata[customerName]': body.name,
    'metadata[customerPhone]': body.phone,
    'metadata[customerEmail]': body.email,
    'metadata[address]': body.address,
    'metadata[suburb]': body.suburb,
    'metadata[postcode]': body.postcode,
    'metadata[notes]': body.notes ?? '',
    'subscription_data[metadata][type]': 'subscription',
    'subscription_data[metadata][boxId]': body.boxId,
    'subscription_data[metadata][boxName]': body.boxName,
    'subscription_data[metadata][frequency]': body.frequency,
  };

  if (body.alternateBoxId && body.alternateBoxName) {
    params['metadata[alternateBoxId]'] = body.alternateBoxId;
    params['metadata[alternateBoxName]'] = body.alternateBoxName;
    params['subscription_data[metadata][alternateBoxId]'] = body.alternateBoxId;
    params['subscription_data[metadata][alternateBoxName]'] = body.alternateBoxName;
  }

  const session = await stripeRequest(c.env.STRIPE_SECRET_KEY, '/checkout/sessions', params);

  if (!session.url) {
    return c.json({ error: 'Failed to create checkout session' }, 500);
  }

  return c.json({ url: session.url });
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
