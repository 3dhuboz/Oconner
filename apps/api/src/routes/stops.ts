import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, and, isNull, gt } from 'drizzle-orm';
import { stops, orders, driverSessions } from '@butcher/db';
import { notifyCustomer } from './push';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { deliveryDayId, runId, unassigned } = c.req.query();
  if (!deliveryDayId && !runId) return c.json({ error: 'deliveryDayId or runId required' }, 400);

  let condition;
  if (runId) {
    condition = eq(stops.runId, runId);
  } else if (unassigned === 'true') {
    condition = and(eq(stops.deliveryDayId, deliveryDayId!), isNull(stops.runId));
  } else {
    condition = eq(stops.deliveryDayId, deliveryDayId!);
  }

  const rows = await db.select().from(stops)
    .where(condition)
    .orderBy(asc(stops.sequence));
  return c.json(rows.map((s) => ({ ...s, address: JSON.parse(s.address), items: JSON.parse(s.items) })));
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [stop] = await db.select().from(stops).where(eq(stops.id, c.req.param('id'))).limit(1);
  if (!stop) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...stop, address: JSON.parse(stop.address), items: JSON.parse(stop.items) });
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof stops.$inferInsert & { address: object; items: object[] }>();
  const id = crypto.randomUUID();
  const isManual = !body.orderId || String(body.orderId).startsWith('manual');

  if (isManual) {
    // Manual stops don't have real order/customer IDs — bypass FK constraints
    const { sql } = await import('drizzle-orm');
    await db.run(sql`PRAGMA foreign_keys = OFF`);
    await db.insert(stops).values({
      ...body,
      id,
      orderId: `manual-${id.slice(0, 8)}`,
      customerId: 'manual',
      address: JSON.stringify(body.address),
      items: JSON.stringify(body.items ?? []),
      createdAt: Date.now(),
    });
    await db.run(sql`PRAGMA foreign_keys = ON`);
  } else {
    await db.insert(stops).values({
      ...body,
      id,
      address: JSON.stringify(body.address),
      items: JSON.stringify(body.items),
      createdAt: Date.now(),
    });
  }

  return c.json({ id }, 201);
});

app.patch('/:id/status', async (c) => {
  const db = drizzle(c.env.DB);
  const { status, driverNote, flagReason, proofUrl } = await c.req.json<{
    status: string;
    driverNote?: string;
    flagReason?: string;
    proofUrl?: string;
  }>();
  const stopId = c.req.param('id');
  const now = Date.now();

  const patch: Partial<typeof stops.$inferInsert> = { status };
  if (driverNote !== undefined) patch.driverNote = driverNote;
  if (flagReason !== undefined) patch.flagReason = flagReason;
  if (proofUrl !== undefined) patch.proofUrl = proofUrl;
  if (status === 'delivered' || status === 'failed') patch.completedAt = now;

  await db.update(stops).set(patch).where(eq(stops.id, stopId));

  // Get the current stop for context
  const [currentStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);

  if (status === 'delivered' && currentStop) {
    await db.update(orders).set({ status: 'delivered', proofUrl: proofUrl ?? null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
  }

  // Notify next customer that driver is on the way
  if ((status === 'delivered' || status === 'failed') && currentStop) {
    const nextStops = await db.select().from(stops)
      .where(and(
        eq(stops.deliveryDayId, currentStop.deliveryDayId),
        gt(stops.sequence, currentStop.sequence),
      ))
      .orderBy(asc(stops.sequence))
      .limit(1);

    const nextStop = nextStops[0];
    if (nextStop && nextStop.status === 'pending') {
      // Mark next stop as en_route
      await db.update(stops).set({ status: 'en_route' }).where(eq(stops.id, nextStop.id));
      // Update the order to out_for_delivery
      await db.update(orders).set({ status: 'out_for_delivery', updatedAt: now }).where(eq(orders.id, nextStop.orderId));
      // Send push notification to the next customer
      const storefrontUrl = c.env.STOREFRONT_URL || 'https://oconnoragriculture.com.au';
      try {
        await notifyCustomer(db, nextStop.customerId, {
          title: "O'Connor Agriculture — Driver On The Way",
          body: 'Your delivery is next! Track your driver live.',
          url: `${storefrontUrl}/track/${nextStop.orderId}`,
        }, c.env);
      } catch {
        // best-effort — don't fail the stop update
      }
    }
  }

  return c.json({ ok: true });
});

app.patch('/:id/sequence', async (c) => {
  const db = drizzle(c.env.DB);
  const { sequence } = await c.req.json<{ sequence: number }>();
  await db.update(stops).set({ sequence }).where(eq(stops.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.patch('/:id/run', async (c) => {
  const db = drizzle(c.env.DB);
  const { runId } = await c.req.json<{ runId: string | null }>();
  await db.update(stops).set({ runId: runId ?? null }).where(eq(stops.id, c.req.param('id')));
  return c.json({ ok: true });
});

export default app;
