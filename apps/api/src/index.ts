import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthUser } from './types';
import { requireAuth, requireRole, verifyClerkToken } from './middleware/auth';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, asc } from 'drizzle-orm';
import { orders as ordersTable, customers as customersTable, products as productsTable, deliveryDays as deliveryDaysTable, subscriptions as subscriptionsTable } from '@butcher/db';
import ordersRouter from './routes/orders';
import productsRouter from './routes/products';
import deliveryDaysRouter from './routes/deliveryDays';
import stopsRouter from './routes/stops';
import customersRouter from './routes/customers';
import usersRouter from './routes/users';
import driversRouter from './routes/drivers';
import stripeRouter from './routes/stripe';
import stockRouter from './routes/stock';
import subscriptionsRouter from './routes/subscriptions';
import pushRouter from './routes/push';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.use('*', cors({
  origin: [
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
    'https://oconner.pages.dev',
    'https://butcher-storefront.pages.dev',
    'https://butcher-admin.pages.dev',
    'https://butcher-driver.pages.dev',
    'https://admin.oconner.com.au', 'https://driver.oconner.com.au',
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
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ phone?: string; addresses?: object[]; name?: string }>();
  let [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
  if (!customer) {
    const now = Date.now();
    const id = crypto.randomUUID();
    await db.insert(customersTable).values({
      id,
      clerkId: clerk.clerkId,
      email: clerk.email,
      name: body.name ?? clerk.email,
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
  await db.update(customersTable).set(patch).where(eq(customersTable.id, customer.id));
  return c.json({ ok: true });
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
  const rows = await db.select().from(deliveryDaysTable).where(eq(deliveryDaysTable.active, true)).orderBy(asc(deliveryDaysTable.date));
  return c.json(rows);
});

app.route('/api/push', pushRouter);

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
  const [row] = await db.select().from(config).where(eq(config.key, 'ticker')).limit(1);
  if (!row) return c.json([]);
  const data = JSON.parse(row.value) as { enabled: boolean; items: Array<{ text: string; url?: string }> };
  if (!data.enabled) return c.json([]);
  return c.json(data.items ?? []);
});

app.use('/api/*', requireAuth);

app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/delivery-days', deliveryDaysRouter);
app.route('/api/stops', stopsRouter);
app.route('/api/customers', customersRouter);
app.route('/api/users', usersRouter);
app.route('/api/drivers', driversRouter);
app.route('/api/stock', stockRouter);
app.route('/api/subscriptions', subscriptionsRouter);

app.route('/webhook', stripeRouter);

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
  const contact = `mailto:${c.env.FROM_EMAIL}`;
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
  const contact = `mailto:${c.env.FROM_EMAIL}`;
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

app.get('/api/config/:key', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [row] = await db.select().from(config).where(eq(config.key, c.req.param('key'))).limit(1);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ key: row.key, value: JSON.parse(row.value) });
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
  } catch (e: any) {
    return c.json({ error: 'AI generation failed. Workers AI may not be available.' }, 500);
  }
});

app.post('/api/images/upload', requireAuth, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const key = `${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const url = `https://images.oconner.com.au/${key}`;
  return c.json({ url, key });
});

app.get('/images/:key', async (c) => {
  const obj = await c.env.IMAGES.get(c.req.param('key'));
  if (!obj) return c.json({ error: 'Not found' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' } });
});

export default app;

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env) => {
  if (event.cron === '0 8 * * *') {
    const { drizzle } = await import('drizzle-orm/d1');
    const { eq, and, gte, lt } = await import('drizzle-orm');
    const { deliveryDays, orders, notifications } = await import('@butcher/db');
    const { sendEmail, buildOrderEmail, getSubject } = await import('./lib/email');
    const db = drizzle(env.DB);

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
  }
};
