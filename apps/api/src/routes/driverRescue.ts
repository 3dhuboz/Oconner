import { Hono } from 'hono';
import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, asc, eq, gt, gte, inArray, lte, ne } from 'drizzle-orm';
import { deliveryDays, orders, stops, users } from '@butcher/db';
import { parseJson } from '../lib/json';
import { sendSms } from '../lib/sms';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();
type RescueContext = Context<{ Bindings: Env }>;
const ACTIVE_STOP_STATUSES = ['en_route', 'arrived'];

function rescuePin(c: RescueContext): string {
  return c.req.header('X-Driver-Rescue-Pin') ?? c.req.query('pin') ?? '';
}

function unauthorized(c: RescueContext) {
  const res = c.json({ error: 'Unauthorized' }, 401);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

function requireRescuePin(c: RescueContext): boolean {
  const expected = c.env.DRIVER_RESCUE_PIN;
  return !!expected && rescuePin(c) === expected;
}

function serializeStop(
  stop: typeof stops.$inferSelect,
  order?: typeof orders.$inferSelect | null,
) {
  return {
    ...stop,
    address: parseJson<Record<string, string>>(stop.address, {}),
    items: parseJson<unknown[]>(stop.items, []),
    orderTotal: order?.total,
    orderPaymentStatus: order?.paymentStatus,
    orderPaymentProvider: order?.paymentProvider,
    orderPaymentIntentId: order?.paymentIntentId,
  };
}

async function attachOrderPaymentDetails(
  db: ReturnType<typeof drizzle>,
  rows: Array<typeof stops.$inferSelect>,
) {
  const orderIds = [...new Set(rows.map((s) => s.orderId).filter((id): id is string => Boolean(id)))];
  if (orderIds.length === 0) return rows.map((s) => serializeStop(s));

  const orderRows = await db.select().from(orders).where(inArray(orders.id, orderIds));
  const byId = new Map(orderRows.map((order) => [order.id, order]));
  return rows.map((s) => serializeStop(s, s.orderId ? byId.get(s.orderId) : null));
}

async function hasOtherActiveStop(
  db: ReturnType<typeof drizzle>,
  deliveryDayId: string,
  stopId: string,
) {
  const rows = await db.select({ id: stops.id }).from(stops)
    .where(and(
      eq(stops.deliveryDayId, deliveryDayId),
      ne(stops.id, stopId),
      inArray(stops.status, ACTIVE_STOP_STATUSES),
    ))
    .limit(1);
  return rows.length > 0;
}

async function clearOtherActiveStops(
  db: ReturnType<typeof drizzle>,
  deliveryDayId: string,
  stopId: string,
  now = Date.now(),
) {
  const rows = await db.select({ id: stops.id, orderId: stops.orderId }).from(stops)
    .where(and(
      eq(stops.deliveryDayId, deliveryDayId),
      ne(stops.id, stopId),
      inArray(stops.status, ACTIVE_STOP_STATUSES),
    ));
  if (rows.length === 0) return;

  await db.update(stops)
    .set({ status: 'pending' })
    .where(inArray(stops.id, rows.map((s) => s.id)));

  const orderIds = rows.map((s) => s.orderId).filter((id): id is string => Boolean(id));
  if (orderIds.length === 0) return;

  await db.update(orders)
    .set({ status: 'confirmed', updatedAt: now })
    .where(and(
      inArray(orders.id, orderIds),
      eq(orders.status, 'out_for_delivery'),
    ));
}

async function findTodayDeliveryDay(db: ReturnType<typeof drizzle>) {
  const now = Date.now();
  const from = now - 20 * 60 * 60 * 1000;
  const to = now + 30 * 60 * 60 * 1000;
  const days = await db.select().from(deliveryDays)
    .where(and(
      eq(deliveryDays.active, true),
      eq(deliveryDays.type, 'delivery'),
      gte(deliveryDays.date, from),
      lte(deliveryDays.date, to),
    ))
    .orderBy(asc(deliveryDays.date));
  return days.sort((a, b) => Math.abs(a.date - now) - Math.abs(b.date - now))[0] ?? null;
}

app.get('/today', async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  const day = await findTodayDeliveryDay(db);
  if (!day) return c.json({ deliveryDay: null, stops: [] }, 404);
  const rows = await db.select().from(stops)
    .where(eq(stops.deliveryDayId, day.id))
    .orderBy(asc(stops.sequence));
  const res = c.json({ deliveryDay: day, stops: await attachOrderPaymentDetails(db, rows) });
  res.headers.set('Cache-Control', 'no-store');
  return res;
});

app.post('/sms-access', async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  let body: { phone?: string; message?: string } = {};
  try {
    body = await c.req.json<{ phone?: string; message?: string }>();
  } catch {}
  const [seamus] = await db.select().from(users)
    .where(eq(users.email, 'oconnoragriculture@gmail.com'))
    .limit(1);
  const to = body.phone ?? seamus?.phone ?? '';
  const pin = c.env.DRIVER_RESCUE_PIN ?? '';
  const appUrl = c.env.DRIVER_APP_URL ?? 'https://driver.oconnoragriculture.com.au';
  const message = body.message ?? `O'Connor Agriculture driver app access: open ${appUrl}/login, use Emergency driver access PIN ${pin}, then tap Open. This bypasses Google sign-in while we fix it.`;
  const result = await sendSms(c.env, to, message);
  const res = c.json(result.ok ? { ok: true, messageId: result.messageId } : { ok: false, error: result.error }, result.ok ? 200 : 502);
  res.headers.set('Cache-Control', 'no-store');
  return res;
});

app.get('/stops/:id', async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  const [stop] = await db.select().from(stops).where(eq(stops.id, c.req.param('id'))).limit(1);
  if (!stop) return c.json({ error: 'Not found' }, 404);
  const [serialized] = await attachOrderPaymentDetails(db, [stop]);
  const res = c.json(serialized);
  res.headers.set('Cache-Control', 'no-store');
  return res;
});

app.patch('/stops/:id/status', async (c) => {
  if (!requireRescuePin(c)) return unauthorized(c);
  const db = drizzle(c.env.DB);
  const stopId = c.req.param('id');
  const { status, driverNote, flagReason, proofUrl } = await c.req.json<{
    status: string;
    driverNote?: string;
    flagReason?: string;
    proofUrl?: string;
  }>();
  const now = Date.now();
  const [priorStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
  if (!priorStop) return c.json({ error: 'Not found' }, 404);

  const wasTerminal = priorStop.status === 'delivered' || priorStop.status === 'failed';
  const isTerminal = status === 'delivered' || status === 'failed';
  const isUndo = wasTerminal && !isTerminal;
  const patch: Partial<typeof stops.$inferInsert> = { status };
  if (driverNote !== undefined) patch.driverNote = driverNote;
  if (flagReason !== undefined) patch.flagReason = flagReason;
  if (proofUrl !== undefined) patch.proofUrl = proofUrl;
  if (isTerminal) patch.completedAt = now;
  if (isUndo) {
    patch.completedAt = null;
    if (priorStop.status === 'delivered') patch.proofUrl = null;
  }

  await db.update(stops).set(patch).where(eq(stops.id, stopId));
  const [currentStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);

  if ((status === 'en_route' || status === 'arrived') && currentStop) {
    await clearOtherActiveStops(db, currentStop.deliveryDayId, currentStop.id, now);
  }

  if (status === 'delivered' && currentStop?.orderId) {
    await db.update(orders)
      .set({ status: 'delivered', proofUrl: proofUrl ?? null, updatedAt: now })
      .where(eq(orders.id, currentStop.orderId));
  }

  if (isUndo && priorStop.status === 'delivered' && currentStop?.orderId) {
    await db.update(orders)
      .set({ status: 'out_for_delivery', proofUrl: null, updatedAt: now })
      .where(eq(orders.id, currentStop.orderId));
  }

  if ((status === 'delivered' || status === 'failed') && currentStop) {
    const hasActiveStop = await hasOtherActiveStop(db, currentStop.deliveryDayId, currentStop.id);
    if (hasActiveStop) {
      const res = c.json({ ok: true });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const [nextStop] = await db.select().from(stops)
      .where(and(
        eq(stops.deliveryDayId, currentStop.deliveryDayId),
        gt(stops.sequence, currentStop.sequence),
      ))
      .orderBy(asc(stops.sequence))
      .limit(1);
    if (nextStop?.status === 'pending') {
      await db.update(stops).set({ status: 'en_route' }).where(eq(stops.id, nextStop.id));
      if (nextStop.orderId) {
        await db.update(orders).set({ status: 'out_for_delivery', updatedAt: now }).where(eq(orders.id, nextStop.orderId));
      }
    }
  }

  const res = c.json({ ok: true });
  res.headers.set('Cache-Control', 'no-store');
  return res;
});

export default app;
