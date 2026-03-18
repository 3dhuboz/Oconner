import { Hono } from 'hono';
import { notifyCustomer } from './push';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, gte, and } from 'drizzle-orm';
import { deliveryDays, orders, stops, notifications } from '@butcher/db';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming } = c.req.query();
  let rows;
  if (upcoming === 'true') {
    const now = Date.now();
    rows = await db.select().from(deliveryDays)
      .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, now)))
      .orderBy(asc(deliveryDays.date));
  } else {
    rows = await db.select().from(deliveryDays).orderBy(asc(deliveryDays.date));
  }
  return c.json(rows);
});

app.get('/today', async (c) => {
  const db = drizzle(c.env.DB);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const { lt } = await import('drizzle-orm');
  const [day] = await db.select().from(deliveryDays)
    .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, todayStart.getTime()), lt(deliveryDays.date, todayEnd.getTime())))
    .limit(1);
  if (!day) return c.json({ error: 'No delivery day today' }, 404);
  return c.json(day);
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, c.req.param('id'))).limit(1);
  if (!day) return c.json({ error: 'Not found' }, 404);
  return c.json(day);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Omit<typeof deliveryDays.$inferInsert, 'id' | 'createdAt'>>();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(deliveryDays).values({ ...body, id, createdAt: now });
  return c.json({ id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Partial<typeof deliveryDays.$inferInsert>>();
  await db.update(deliveryDays).set(body).where(eq(deliveryDays.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await db.update(deliveryDays).set({ active: false }).where(eq(deliveryDays.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.post('/:id/generate-stops', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');

  const dayOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const existingStops = await db.select({ orderId: stops.orderId }).from(stops).where(eq(stops.deliveryDayId, dayId));
  const existingOrderIds = new Set(existingStops.map((s) => s.orderId));

  let created = 0;
  for (const order of dayOrders) {
    if (existingOrderIds.has(order.id)) continue;
    await db.insert(stops).values({
      id: crypto.randomUUID(),
      deliveryDayId: dayId,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? '',
      address: order.deliveryAddress,
      items: order.items,
      sequence: created,
      status: 'pending',
      customerNote: order.notes ?? null,
      createdAt: Date.now(),
    });
    created++;
  }

  return c.json({ created, total: dayOrders.length });
});

app.post('/:id/send-reminders', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: 'Not found' }, 404);

  const pendingOrders = await db.select().from(orders)
    .where(and(eq(orders.deliveryDayId, dayId), eq(orders.status, 'confirmed')));

  const dateLabel = new Date(day.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  let sent = 0;

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
      trackingUrl: `${c.env.STOREFRONT_URL}/track/${order.id}`,
    };
    const result = await sendEmail({
      apiKey: c.env.RESEND_API_KEY,
      from: c.env.FROM_EMAIL,
      to: order.customerEmail,
      subject: getSubject('day_before', emailData),
      html: buildOrderEmail('day_before', emailData),
    });
    if (result) sent++;
    await notifyCustomer(db, order.customerId, {
      title: "O'Connor — Delivery Tomorrow",
      body: `Your order is on its way ${dateLabel}. Check your order summary for details.`,
      url: `${c.env.STOREFRONT_URL}/track/${order.id}`,
    }, c.env);
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      orderId: order.id,
      customerId: order.customerId,
      type: 'day_before',
      status: result ? 'sent' : 'failed',
      recipientEmail: order.customerEmail,
      resendId: result?.id ?? null,
      sentAt: Date.now(),
    });
  }

  return c.json({ sent, total: pendingOrders.length });
});

export default app;
