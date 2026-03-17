import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc } from 'drizzle-orm';
import { stops, orders, driverSessions } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { deliveryDayId } = c.req.query();
  if (!deliveryDayId) return c.json({ error: 'deliveryDayId required' }, 400);
  const rows = await db.select().from(stops)
    .where(eq(stops.deliveryDayId, deliveryDayId))
    .orderBy(asc(stops.sequence));
  return c.json(rows.map((s) => ({ ...s, address: JSON.parse(s.address), items: JSON.parse(s.items) })));
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof stops.$inferInsert & { address: object; items: object[] }>();
  const id = crypto.randomUUID();
  await db.insert(stops).values({
    ...body,
    id,
    address: JSON.stringify(body.address),
    items: JSON.stringify(body.items),
    createdAt: Date.now(),
  });
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

  if (status === 'delivered') {
    const [stop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
    if (stop) {
      await db.update(orders).set({ status: 'delivered', proofUrl: proofUrl ?? null, updatedAt: now }).where(eq(orders.id, stop.orderId));
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

export default app;
