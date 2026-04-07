import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthUser } from './types';
import { requireAuth, requireRole, verifyClerkToken } from './middleware/auth';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, asc, and, gte } from 'drizzle-orm';
import { orders as ordersTable, customers as customersTable, products as productsTable, deliveryDays as deliveryDaysTable, subscriptions as subscriptionsTable } from '@butcher/db';
import { deductStock, getStockDayId } from './lib/stock';
import ordersRouter from './routes/orders';
import productsRouter from './routes/products';
import deliveryDaysRouter from './routes/deliveryDays';
import stopsRouter from './routes/stops';
import customersRouter from './routes/customers';
import usersRouter from './routes/users';
import driversRouter from './routes/drivers';
import deliveryRunsRouter from './routes/deliveryRuns';
import stripeRouter from './routes/stripe';
import stockRouter from './routes/stock';
import subscriptionsRouter from './routes/subscriptions';
import pushRouter from './routes/push';
import reportsRouter from './routes/reports';
import { reels as reelsRouter } from './routes/reels';
import promoCodesRouter from './routes/promoCodes';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.use('*', cors({
  origin: [
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
    'https://oconner.pages.dev',
    'https://butcher-storefront.pages.dev',
    'https://butcher-admin.pages.dev',
    'https://butcher-driver.pages.dev',
    'https://admin.oconner.com.au', 'https://driver.oconner.com.au',
    'https://oconnoragriculture.com.au',
    'https://www.oconnoragriculture.com.au',
    'https://admin.oconnoragriculture.com.au',
    'https://driver.oconnoragriculture.com.au',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.get('/api/orders/mine', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json([]);
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.customerId, customer.id)).orderBy(desc(ordersTable.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});

// ── Customer-facing authenticated routes (Clerk token, no staff DB row required) ──
app.get('/api/customers/me', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json(null);
  return c.json({ ...customer, addresses: JSON.parse(customer.addresses) });
});

app.patch('/api/customers/me', async (c) => {
  try {
    const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
    if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
    const db = drizzle(c.env.DB);
    const body = await c.req.json<{ phone?: string; addresses?: object[]; name?: string; email?: string }>();
    // Resolve email: prefer body.email, then clerk token, then empty
    const resolvedEmail = body.email || clerk.email || '';
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
    if (!customer) {
      const now = Date.now();
      const id = crypto.randomUUID();
      await db.insert(customersTable).values({
        id,
        clerkId: clerk.clerkId,
        email: resolvedEmail,
        name: body.name || resolvedEmail || 'Customer',
        phone: body.phone ?? '',
        addresses: JSON.stringify(body.addresses ?? []),
        createdAt: now,
        updatedAt: now,
      });
      return c.json({ ok: true });
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.addresses !== undefined) patch.addresses = JSON.stringify(body.addresses);
    if (body.name !== undefined) patch.name = body.name;
    // Backfill empty email/name on existing records
    if (!customer.email && resolvedEmail) patch.email = resolvedEmail;
    if (!customer.name && (body.name || resolvedEmail)) patch.name = body.name || resolvedEmail;
    await db.update(customersTable).set(patch).where(eq(customersTable.id, customer.id));
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('PATCH /api/customers/me failed:', message);
    return c.json({ error: message }, 500);
  }
});

app.get('/api/subscriptions/mine', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.email, clerk.email))
    .orderBy(desc(subscriptionsTable.createdAt));
  return c.json(rows);
});

// ── Public read-only routes (no auth) ────────────────────────
app.get('/api/products', async (c) => {
  const db = drizzle(c.env.DB);
  const { activeOnly } = c.req.query();
  const rows = activeOnly === 'true'
    ? await db.select().from(productsTable).where(eq(productsTable.active, true)).orderBy(asc(productsTable.displayOrder))
    : await db.select().from(productsTable).orderBy(asc(productsTable.displayOrder));
  return c.json(rows.map((p) => ({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null })));
});

app.get('/api/products/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, c.req.param('id'))).limit(1);
  if (!p) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null });
});

app.get('/api/delivery-days', async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming } = c.req.query();
  const now = Date.now();
  const rows = upcoming === 'true'
    ? await db.select().from(deliveryDaysTable)
        .where(and(eq(deliveryDaysTable.active, true), gte(deliveryDaysTable.date, now)))
        .orderBy(asc(deliveryDaysTable.date))
    : await db.select().from(deliveryDaysTable)
        .where(eq(deliveryDaysTable.active, true))
        .orderBy(asc(deliveryDaysTable.date));
  return c.json(rows);
});

app.get('/api/orders/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, c.req.param('id'))).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...order, items: JSON.parse(order.items), deliveryAddress: JSON.parse(order.deliveryAddress) });
});

app.post('/api/orders', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof ordersTable.$inferInsert & { deliveryAddress: object; items: object[]; clerkId?: string }>();
  const now = Date.now();
  const orderId = crypto.randomUUID();
  let customerId = body.customerId;
  if (!customerId) {
    const [existing] = await db.select().from(customersTable).where(eq(customersTable.email, body.customerEmail)).limit(1);
    if (existing) {
      customerId = existing.id;
      if (body.clerkId && !existing.clerkId)
        await db.update(customersTable).set({ clerkId: body.clerkId, updatedAt: now }).where(eq(customersTable.id, existing.id));
    } else {
      customerId = crypto.randomUUID();
      await db.insert(customersTable).values({
        id: customerId, email: body.customerEmail, name: body.customerName ?? '',
        phone: body.customerPhone ?? '', clerkId: body.clerkId ?? null,
        accountType: 'registered', orderCount: 0, totalSpent: 0, blacklisted: false, notes: '', createdAt: now, updatedAt: now,
      });
    }
  }
  // ── Pool-aware stock validation ──
  const { deliveryDayStock } = await import('@butcher/db');
  const stockDayId = await getStockDayId(db, body.deliveryDayId);
  const dayAllocations = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));
  if (dayAllocations.length > 0) {
    for (const item of (body.items as any[])) {
      const alloc = dayAllocations.find((a: any) => a.productId === item.productId);
      if (alloc) {
        const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
        if (alloc.sold + qty > alloc.allocated) {
          return c.json({ error: `${item.productName} is sold out for this delivery day` }, 400);
        }
      }
    }
  }

  await db.insert(ordersTable).values({ ...body, id: orderId, customerId, items: JSON.stringify(body.items), deliveryAddress: JSON.stringify(body.deliveryAddress), createdAt: now, updatedAt: now });
  // Deduct stock for each item
  await deductStock(db, body.items as any[], orderId, now);

  // ── Update pool-aware day stock sold counts ──
  if (dayAllocations.length > 0) {
    for (const item of (body.items as any[])) {
      const alloc = dayAllocations.find((a: any) => a.productId === item.productId);
      if (alloc) {
        const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
        await db.update(deliveryDayStock).set({ sold: alloc.sold + qty }).where(eq(deliveryDayStock.id, alloc.id));
      }
    }
  }

  const [day] = await db.select().from(deliveryDaysTable).where(eq(deliveryDaysTable.id, body.deliveryDayId)).limit(1);
  if (day) await db.update(deliveryDaysTable).set({ orderCount: day.orderCount + 1 }).where(eq(deliveryDaysTable.id, day.id));
  const [cust] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  if (cust) await db.update(customersTable).set({ orderCount: cust.orderCount + 1, totalSpent: cust.totalSpent + (body.total ?? 0), updatedAt: now }).where(eq(customersTable.id, customerId));
  return c.json({ id: orderId }, 201);
});

// Forward to subscriptions router so order creation logic is centralized
app.post('/api/subscriptions', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = '/';
  const newReq = new Request(url.toString(), { method: 'POST', headers: c.req.raw.headers, body: c.req.raw.body });
  return subscriptionsRouter.fetch(newReq, c.env);
});

// Public subscription checkout (no auth — uses Square)
app.post('/api/subscriptions/checkout', async (c) => {
  const { default: subsRouter } = await import('./routes/subscriptions');
  const url = new URL(c.req.url);
  url.pathname = '/checkout';
  const newReq = new Request(url.toString(), { method: 'POST', headers: c.req.raw.headers, body: c.req.raw.body });
  return subsRouter.fetch(newReq, c.env);
});

app.route('/api/push', pushRouter);
app.route('/api/reels', reelsRouter);

// ── Public promo code validation (no auth) ───────────────────────────────────
app.post('/api/promo-codes/validate', async (c) => {
  const { promoCodes: promoCodesTable } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const { code, subtotal } = await c.req.json<{ code: string; subtotal: number }>();
  const codeUpper = code.toUpperCase().trim();

  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, codeUpper)).limit(1);

  if (!promo) return c.json({ valid: false, error: 'Invalid promo code' });
  if (!promo.active) return c.json({ valid: false, error: 'This code is no longer active' });
  if (promo.expiresAt && Date.now() > promo.expiresAt) return c.json({ valid: false, error: 'This code has expired' });
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return c.json({ valid: false, error: 'This code has been fully redeemed' });
  if (promo.minOrder && subtotal < promo.minOrder) {
    const min = (promo.minOrder / 100).toFixed(2);
    return c.json({ valid: false, error: `Minimum order of $${min} required for this code` });
  }

  let discount = 0;
  if (promo.type === 'percentage') {
    discount = Math.round(subtotal * (promo.value / 100));
  } else {
    discount = Math.min(promo.value, subtotal);
  }

  return c.json({
    valid: true,
    promoId: promo.id,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    label: promo.type === 'percentage' ? `${promo.value}% off` : `$${(promo.value / 100).toFixed(2)} off`,
  });
});

// ── Public contact form ───────────────────────────────────────────────────────
app.post('/api/contact', async (c) => {
  const { name, email, subject, message } = await c.req.json<{ name: string; email: string; subject?: string; message: string }>();
  if (!name || !email || !message) return c.json({ error: 'Missing required fields' }, 400);
  const { sendEmail } = await import('./lib/email');
  await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: 'orders@oconnoragriculture.com.au',
    subject: `Website enquiry${subject ? `: ${subject}` : ''} — from ${name}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject ?? '(none)'}</p><hr/><p>${message.replace(/\n/g, '<br>')}</p>`,
  });
  return c.json({ ok: true });
});

app.get('/api/ticker', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [tickerRow] = await db.select().from(config).where(eq(config.key, 'ticker')).limit(1);
  if (!tickerRow) return c.json({ enabled: false, items: [] });
  const data = JSON.parse(tickerRow.value) as { enabled: boolean; items: Array<{ text: string; url?: string }>; facebookPageUrl?: string };
  if (!data.enabled) return c.json({ enabled: false, items: [] });
  return c.json({ enabled: true, items: data.items ?? [], facebookPageUrl: data.facebookPageUrl ?? null });
});

// ── Public: Square payment link for storefront checkout ──
app.post('/api/orders/:id/payment-link', async (c) => {
  const SQUARE_API = 'https://connect.squareup.com/v2';
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  const storefrontUrl = c.env.STOREFRONT_URL ?? 'https://oconnoragriculture.com.au';
  if (!accessToken || !locationId) return c.json({ error: 'Square not configured' }, 400);

  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; lineTotal: number }>;

  try {
    const squareLineItems = items.map((i: any) => ({
      name: i.productName ?? 'Item',
      quantity: String(i.quantity ?? 1),
      base_price_money: { amount: Math.round(i.lineTotal / (i.quantity ?? 1)), currency: 'AUD' },
    }));

    if (order.deliveryFee > 0) {
      squareLineItems.push({ name: 'Delivery Fee', quantity: '1', base_price_money: { amount: order.deliveryFee, currency: 'AUD' } });
    }

    const res = await fetch(`${SQUARE_API}/online-checkout/payment-links`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Square-Version': '2024-01-18' },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: { location_id: locationId, line_items: squareLineItems, metadata: { orderId } },
        checkout_options: {
          redirect_url: `${storefrontUrl}/checkout/success?orderId=${orderId}`,
          merchant_support_email: 'orders@oconnoragriculture.com.au',
        },
        payment_note: `O'Connor Agriculture — Order #${orderId.slice(0, 8).toUpperCase()}`,
      }),
    });

    const data = await res.json() as any;
    if (data.errors) return c.json({ error: 'Failed to create payment link', details: data.errors }, 400);

    const paymentUrl = data.payment_link?.url ?? data.payment_link?.long_url;
    if (!paymentUrl) return c.json({ error: 'Payment link created but no URL returned' }, 500);

    await db.update(ordersTable).set({
      paymentStatus: 'awaiting_payment',
      internalNotes: `${order.internalNotes ?? ''}\nSquare payment link: ${data.payment_link?.id ?? 'unknown'}`.trim(),
      updatedAt: Date.now(),
    }).where(eq(ordersTable.id, orderId));

    return c.json({ ok: true, paymentUrl });
  } catch (e: any) {
    return c.json({ error: e?.message ?? 'Payment link creation failed' }, 500);
  }
});

// ── Public: mark order as paid (called by success page after Square redirect) ──
app.post('/api/orders/:id/mark-paid', async (c) => {
  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  // Only update if currently pending — don't downgrade a confirmed order
  if (order.paymentStatus === 'pending_payment' || order.paymentStatus === 'awaiting_payment') {
    await db.update(ordersTable).set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: Date.now() }).where(eq(ordersTable.id, orderId));
  }
  return c.json({ ok: true });
});

// ── Public: read single config key (storefront/about page) ──
app.get('/api/config/:key', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [row] = await db.select().from(config).where(eq(config.key, c.req.param('key'))).limit(1);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ key: row.key, value: JSON.parse(row.value) });
});

app.use('/api/*', requireAuth);

app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/delivery-days', deliveryDaysRouter);
app.route('/api/stops', stopsRouter);
app.route('/api/customers', customersRouter);
app.route('/api/users', usersRouter);
app.route('/api/drivers', driversRouter);
app.route('/api/delivery-runs', deliveryRunsRouter);
app.route('/api/stock', stockRouter);
app.route('/api/subscriptions', subscriptionsRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/promo-codes', promoCodesRouter);

app.route('/webhook', stripeRouter);

// ── Staff invite email ───────────────────────────────────────────────────────
app.post('/api/staff/invite', requireAuth, requireRole('admin'), async (c) => {
  const body = await c.req.json<{ name: string; email: string; role: string }>();
  if (!body.email || !body.name) return c.json({ error: 'Name and email required' }, 400);

  const { sendEmail } = await import('./lib/email');
  const adminUrl = c.env.STOREFRONT_URL?.replace('butcher-storefront', 'butcher-admin') || 'https://admin.oconnoragriculture.com.au';

  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#4E7732">Welcome to O'Connor Agriculture</h2>
      <p>Hi ${body.name},</p>
      <p>You've been invited to join the <strong>O'Connor Agriculture</strong> team as <strong>${body.role}</strong>.</p>
      <p>Click the button below to create your account and get access to the admin dashboard:</p>
      <div style="text-align:center;margin:30px 0">
        <a href="${adminUrl}" style="background:#4E7732;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">
          Create Your Account
        </a>
      </div>
      <p style="color:#666;font-size:13px">Use your email <strong>${body.email}</strong> when signing up so your account is linked automatically.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="color:#999;font-size:12px">O'Connor Agriculture — Paddock to plate</p>
    </div>
  `;

  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL || 'orders@oconnoragriculture.com.au',
    to: body.email,
    subject: `You're invited to join O'Connor Agriculture`,
    html,
  });

  if (!result) return c.json({ error: 'Failed to send email' }, 500);
  return c.json({ ok: true });
});

app.get('/api/audit-log', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { desc } = await import('drizzle-orm');
  const { auditLog } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(100);
  return c.json(rows.map((e) => ({ ...e, before: JSON.parse(e.before), after: JSON.parse(e.after) })));
});

// ── Admin push helpers ───────────────────────────────────────────────────────
app.get('/api/push/admin/stats', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { sql } = await import('drizzle-orm');
  const { pushSubscriptions } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(pushSubscriptions);
  return c.json({ subscribers: Number(row?.count ?? 0) });
});

app.post('/api/push/admin/test-send', requireAuth, requireRole('admin'), async (c) => {
  const { title, body, url } = await c.req.json<{ title: string; body: string; url?: string }>();
  const user = c.get('user');
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { pushSubscriptions, customers } = await import('@butcher/db');
  const { sendPush } = await import('./lib/webpush');
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.email, user.email)).limit(1);
  if (!customer) return c.json({ error: 'No customer record for your account' }, 404);
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.customerId, customer.id));
  if (!subs.length) return c.json({ error: 'No push subscriptions found for your account. Subscribe first from the storefront.' }, 404);
  const contact = `mailto:${c.env.FROM_EMAIL.replace(/.*<(.+)>/, '$1')}`;
  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }, c.env.VAPID_PUBLIC_KEY, c.env.VAPID_PRIVATE_KEY, contact);
    if (ok) sent++;
  }
  return c.json({ sent, total: subs.length });
});

app.post('/api/push/admin/broadcast', requireAuth, requireRole('admin'), async (c) => {
  const { title, body, url } = await c.req.json<{ title: string; body: string; url?: string }>();
  const { drizzle } = await import('drizzle-orm/d1');
  const { pushSubscriptions } = await import('@butcher/db');
  const { sendPush } = await import('./lib/webpush');
  const db = drizzle(c.env.DB);
  const subs = await db.select().from(pushSubscriptions);
  const contact = `mailto:${c.env.FROM_EMAIL.replace(/.*<(.+)>/, '$1')}`;
  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }, c.env.VAPID_PUBLIC_KEY, c.env.VAPID_PRIVATE_KEY, contact);
    if (ok) sent++;
  }
  return c.json({ sent, total: subs.length });
});

app.get('/api/notifications', requireAuth, async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { desc } = await import('drizzle-orm');
  const { notifications } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(notifications).orderBy(desc(notifications.sentAt)).limit(200);
  return c.json(rows);
});

app.get('/api/config', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(config);
  const result: Record<string, unknown> = {};
  for (const row of rows) result[row.key] = JSON.parse(row.value);
  return c.json(result);
});

app.put('/api/config', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Record<string, unknown>>();
  const user = c.get('user');
  const now = Date.now();
  for (const [key, value] of Object.entries(body)) {
    await db.insert(config).values({ key, value: JSON.stringify(value), updatedAt: now, updatedBy: user.email })
      .onConflictDoUpdate({ target: config.key, set: { value: JSON.stringify(value), updatedAt: now, updatedBy: user.email } });
  }
  return c.json({ ok: true });
});

app.put('/api/config/:key', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const value = await c.req.json();
  const user = c.get('user');
  const now = Date.now();
  await db.insert(config).values({ key: c.req.param('key')!, value: JSON.stringify(value), updatedAt: now, updatedBy: user.email })
    .onConflictDoUpdate({ target: config.key, set: { value: JSON.stringify(value), updatedAt: now, updatedBy: user.email } });
  return c.json({ ok: true });
});

app.post('/api/generate-post', requireAuth, requireRole('admin'), async (c) => {
  const { brand, platform, postType, tone, extraContext } = await c.req.json<{
    brand: string; platform: string; postType: string; tone: string; extraContext?: string;
  }>();

  const brandName = "O'Connor Agriculture";
  const platformGuide: Record<string, string> = {
    facebook: 'Conversational, community-focused, 1–3 paragraphs, include a call to action.',
    instagram: 'Visual storytelling, punchy, use 5–10 relevant hashtags at the end.',
    linkedin: 'Professional tone, highlight quality and sustainability, 2–3 paragraphs.',
  };
  const typeGuide: Record<string, string> = {
    product: 'Promote a specific product or range from the farm shop.',
    farm_update: 'Share a genuine update from life on the farm.',
    seasonal: 'Highlight seasonal availability or upcoming events.',
    recipe: 'Share a recipe idea using farm products.',
    community: 'Engage the local community with a warm, personal message.',
    educational: 'Educate followers about farming practices, animal welfare, or food quality.',
  };
  const toneGuide: Record<string, string> = {
    warm: 'Warm, authentic, and personal.',
    exciting: 'Exciting, bold, and energetic.',
    informative: 'Informative and clear.',
    humorous: 'Light-hearted and a little humorous.',
    heartfelt: 'Heartfelt and sincere.',
  };

  const prompt = `You are a social media manager for ${brandName}, a family-run Australian farm and butcher selling premium ethically-raised meat direct to customers.

Write a single ${platform} post. Guidelines:
- Platform: ${platformGuide[platform] ?? platform}
- Post type: ${typeGuide[postType] ?? postType}
- Tone: ${toneGuide[tone] ?? tone}
${extraContext ? `- Extra context: ${extraContext}` : ''}

Output ONLY the post text, nothing else. No commentary, no "Here is your post:", just the post itself.`;

  try {
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: `You are a social media copywriter for ${brandName}, an Australian farm and butcher. Write authentic, on-brand posts.` },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
    }) as { response?: string };
    return c.json({ post: result.response ?? '' });
  } catch {
    return c.json({ error: 'AI generation failed. Workers AI may not be available.' }, 500);
  }
});

app.post('/api/images/generate', requireAuth, async (c) => {
  const { prompt } = await c.req.json<{ prompt: string }>();
  if (!prompt) return c.json({ error: 'Prompt required' }, 400);
  try {
    let imageBytes: Uint8Array;
    // Use Cloudflare Workers AI (Flux 1 Schnell) — always available via the AI binding
    const result = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt }) as { image: string } | ReadableStream;
    if (result && typeof result === 'object' && 'image' in result) {
      const binary = atob(result.image);
      imageBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
    } else {
      const reader = (result as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; if (value) chunks.push(value); }
      const total = chunks.reduce((s, ch) => s + ch.length, 0);
      imageBytes = new Uint8Array(total);
      let off = 0;
      for (const chunk of chunks) { imageBytes.set(chunk, off); off += chunk.length; }
    }
    const key = `${crypto.randomUUID()}.png`;
    await c.env.IMAGES.put(key, imageBytes, { httpMetadata: { contentType: 'image/png' } });
    const baseUrl = new URL(c.req.url).origin;
    return c.json({ url: `${baseUrl}/images/${key}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Image generation failed';
    return c.json({ error: message }, 500);
  }
});

app.post('/api/images/upload', requireAuth, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const key = `${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const baseUrl = new URL(c.req.url).origin;
  return c.json({ url: `${baseUrl}/images/${key}`, key });
});

app.get('/images/*', async (c) => {
  const key = c.req.path.slice('/images/'.length);
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' } });
});

export default app;

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env) => {
  if (event.cron === '0 8 * * *') {
    const { drizzle } = await import('drizzle-orm/d1');
    const { eq, and, gte, lt, desc, like } = await import('drizzle-orm');
    const { deliveryDays, orders, notifications, subscriptions, customers, products } = await import('@butcher/db');
    const { sendEmail, buildOrderEmail, getSubject } = await import('./lib/email');
    const db = drizzle(env.DB);

    // ── 1. Auto-generate subscription orders for due subscriptions ──
    try {
      const now = Date.now();
      const FREQ_MS: Record<string, number> = {
        weekly: 7 * 24 * 60 * 60 * 1000,
        fortnightly: 14 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
      };
      const { deductStock } = await import('./lib/stock');

      const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, 'active'));

      for (const sub of activeSubs) {
        const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
        const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;
        const nextDueDate = lastGenerated + interval;
        // Skip if not yet due (with 20% grace period)
        if (now < nextDueDate - interval * 0.2) continue;

        let customerId = sub.customerId;
        if (!customerId) {
          const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
          if (!cust) continue;
          customerId = cust.id;
        }
        const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
        if (!customer) continue;

        let address = { line1: '', suburb: '', state: 'QLD', postcode: '' };
        try {
          const addrs = JSON.parse(customer.addresses ?? '[]') as Array<{ line1: string; suburb: string; state: string; postcode: string }>;
          if (addrs.length > 0) address = addrs[0];
        } catch {}
        if (!address.line1) {
          const [lastOrder] = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)).limit(1);
          if (lastOrder) { try { address = JSON.parse(lastOrder.deliveryAddress) as typeof address; } catch {} }
        }
        if (!address.line1) continue;

        const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
        const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;

        let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
        if (!boxProduct) [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
        if (!boxProduct) [boxProduct] = await db.select().from(products).where(like(products.name, `%${boxName.replace(' Box', '')}%Box%`)).limit(1);
        const price = boxProduct?.fixedPrice ?? 0;
        if (!price) continue;

        // Find next active delivery day
        const [nextDay] = await db.select().from(deliveryDays)
          .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, now)))
          .orderBy(deliveryDays.date).limit(1);
        if (!nextDay) continue;

        const orderId = crypto.randomUUID();
        const items = [{ productId: boxProduct?.id ?? boxId, productName: boxName, quantity: 1, isMeatPack: true, lineTotal: price }];

        await db.insert(orders).values({
          id: orderId,
          customerId,
          customerName: customer.name ?? sub.email,
          customerEmail: sub.email,
          customerPhone: customer.phone ?? '',
          deliveryDayId: nextDay.id,
          deliveryAddress: JSON.stringify(address),
          items: JSON.stringify(items),
          subtotal: price,
          deliveryFee: 0,
          gst: Math.round(price / 11),
          total: price,
          status: 'confirmed',
          paymentStatus: 'paid',
          subscriptionId: sub.id,
          internalNotes: `Auto-generated from ${boxName} ${sub.frequency} subscription`,
          createdAt: now,
          updatedAt: now,
        });

        await deductStock(db, items as any[], orderId, now);
        await db.update(deliveryDays).set({ orderCount: nextDay.orderCount + 1 }).where(eq(deliveryDays.id, nextDay.id));
        await db.update(customers).set({ orderCount: customer.orderCount + 1, totalSpent: customer.totalSpent + price, updatedAt: now }).where(eq(customers.id, customerId));

        const updateData: Record<string, unknown> = { lastOrderGeneratedAt: now, updatedAt: now };
        if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
        await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
      }
    } catch (e) {
      console.error('Subscription auto-generate failed:', e);
    }

    // ── 2. Send "delivery tomorrow" notifications ──
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowDays = await db.select().from(deliveryDays)
      .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, tomorrow.getTime()), lt(deliveryDays.date, dayAfter.getTime())));

    for (const day of tomorrowDays) {
      const pendingOrders = await db.select().from(orders)
        .where(and(eq(orders.deliveryDayId, day.id), eq(orders.status, 'confirmed')));
      const dateLabel = new Date(day.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

      for (const order of pendingOrders) {
        const emailData = {
          customerName: order.customerName,
          orderId: order.id,
          orderItems: JSON.parse(order.items) as Array<{ productName: string; lineTotal: number }>,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          gst: order.gst,
          total: order.total,
          deliveryDate: dateLabel,
          deliveryAddress: order.deliveryAddress,
          trackingUrl: `${env.STOREFRONT_URL}/track/${order.id}`,
        };
        const result = await sendEmail({ apiKey: env.RESEND_API_KEY, from: env.FROM_EMAIL, to: order.customerEmail, subject: getSubject('day_before', emailData), html: buildOrderEmail('day_before', emailData) });
        const { notifyCustomer } = await import('./routes/push');
        await notifyCustomer(db, order.customerId, { title: "O'Connor \u2014 Delivery Tomorrow", body: `Your order arrives ${dateLabel}. Tap to track.`, url: `${env.STOREFRONT_URL}/track/${order.id}` }, env);
        await db.insert(notifications).values({ id: crypto.randomUUID(), orderId: order.id, customerId: order.customerId, type: 'day_before', status: result ? 'sent' : 'failed', recipientEmail: order.customerEmail, resendId: result?.id ?? null, sentAt: Date.now() });
      }
    }

    // ── 3. Thursday meat audit email ──
    const today = new Date();
    if (today.getDay() === 4) { // Thursday
      try {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weekOrders = await db.select().from(orders)
          .where(and(gte(orders.createdAt, weekAgo), eq(orders.status, 'confirmed')));

        const salesByProduct: Record<string, { name: string; qty: number; weightKg: number; revenue: number }> = {};

        for (const order of weekOrders) {
          const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; weightKg?: number; weight?: number; lineTotal: number }>;
          for (const item of items) {
            const key = item.productName;
            if (!salesByProduct[key]) salesByProduct[key] = { name: item.productName, qty: 0, weightKg: 0, revenue: 0 };
            salesByProduct[key].qty += item.quantity ?? 1;
            salesByProduct[key].weightKg += item.weightKg ?? item.weight ?? 0;
            salesByProduct[key].revenue += item.lineTotal ?? 0;
          }
        }

        const sorted = Object.values(salesByProduct).sort((a, b) => b.revenue - a.revenue);
        const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);
        const totalOrders = weekOrders.length;

        const weekStart = new Date(weekAgo).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        const weekEnd = today.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

        const rows = sorted.map((p) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500">${p.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.weightKg ? p.weightKg.toFixed(1) + ' kg' : '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${(p.revenue / 100).toFixed(2)}</td>
          </tr>`
        ).join('');

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
            <div style="background:#4E7732;padding:20px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:white;margin:0;font-size:20px">🥩 Weekly Meat Audit</h1>
              <p style="color:#E8F2DC;margin:4px 0 0;font-size:14px">${weekStart} — ${weekEnd}</p>
            </div>
            <div style="padding:20px 24px;background:#f9fafb;border:1px solid #eee;border-top:none">
              <div style="display:flex;gap:20px;margin-bottom:20px">
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Total Orders</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">${totalOrders}</p>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Total Revenue</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">$${(totalRevenue / 100).toFixed(2)}</p>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Products Sold</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">${sorted.length}</p>
                </div>
              </div>
              <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee">
                <thead>
                  <tr style="background:#4E7732;color:white">
                    <th style="padding:10px 12px;text-align:left;font-size:13px">Product</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px">Qty</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px">Weight</th>
                    <th style="padding:10px 12px;text-align:right;font-size:13px">Revenue</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                  <tr style="background:#f0f0f0;font-weight:bold">
                    <td style="padding:10px 12px" colspan="3">Total</td>
                    <td style="padding:10px 12px;text-align:right">$${(totalRevenue / 100).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <p style="color:#999;font-size:11px;margin-top:16px;text-align:center">
                Automated weekly audit from O'Connor Agriculture
              </p>
            </div>
          </div>`;

        await sendEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.FROM_EMAIL,
          to: 'oconnoragriculture@gmail.com',
          subject: `🥩 Weekly Meat Audit — ${weekStart} to ${weekEnd}`,
          html,
        });
        console.log('Thursday meat audit email sent');
      } catch (e) {
        console.error('Thursday audit email failed:', e);
      }
    }
  }
};
