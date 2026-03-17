import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthUser } from './types';
import { requireAuth, requireRole, verifyClerkToken } from './middleware/auth';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { orders as ordersTable, customers as customersTable } from '@butcher/db';
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

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'https://oconner.pages.dev', 'https://admin.oconner.com.au', 'https://driver.oconner.com.au'],
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
        await db.insert(notifications).values({ id: crypto.randomUUID(), orderId: order.id, customerId: order.customerId, type: 'day_before', status: result ? 'sent' : 'failed', recipientEmail: order.customerEmail, resendId: result?.id ?? null, sentAt: Date.now() });
      }
    }
  }
};
