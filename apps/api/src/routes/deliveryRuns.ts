import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { deliveryRuns, stops, users } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// List runs for a delivery day
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.query('deliveryDayId');
  if (!dayId) return c.json({ error: 'deliveryDayId required' }, 400);

  const runs = await db.select().from(deliveryRuns)
    .where(eq(deliveryRuns.deliveryDayId, dayId))
    .orderBy(deliveryRuns.sequence);

  // Attach driver info and stop counts
  const driverIds = runs.map((r) => r.driverUid).filter(Boolean) as string[];
  const drivers = driverIds.length
    ? await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users).all()
    : [];

  const allStops = await db.select({ id: stops.id, runId: stops.runId, status: stops.status })
    .from(stops).where(eq(stops.deliveryDayId, dayId));

  return c.json(runs.map((r) => {
    const driver = drivers.find((d) => d.id === r.driverUid) ?? null;
    const runStops = allStops.filter((s) => s.runId === r.id);
    return {
      ...r,
      driver,
      stopCount: runStops.length,
      completedCount: runStops.filter((s) => s.status === 'delivered').length,
    };
  }));
});

// Create a run
app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ deliveryDayId: string; name: string; zone?: string; color?: string; driverUid?: string; notes?: string }>();
  const { deliveryDayId, name, zone, color, driverUid, notes } = body;
  if (!deliveryDayId || !name) return c.json({ error: 'deliveryDayId and name required' }, 400);

  const existing = await db.select({ id: deliveryRuns.id })
    .from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, deliveryDayId));

  const id = crypto.randomUUID();
  await db.insert(deliveryRuns).values({
    id,
    deliveryDayId,
    name,
    zone: zone ?? null,
    color: color ?? '#1B3A2E',
    driverUid: driverUid ?? null,
    status: 'pending',
    sequence: existing.length,
    notes: notes ?? null,
    createdAt: Date.now(),
  });

  return c.json({ id }, 201);
});

// Update a run (rename, assign driver, change status/color)
app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param('id');
  const body = await c.req.json<Partial<{ name: string; zone: string; color: string; driverUid: string | null; status: string; notes: string; sequence: number }>>();

  await db.update(deliveryRuns).set({
    ...(body.name !== undefined && { name: body.name }),
    ...(body.zone !== undefined && { zone: body.zone }),
    ...(body.color !== undefined && { color: body.color }),
    ...(body.driverUid !== undefined && { driverUid: body.driverUid }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.sequence !== undefined && { sequence: body.sequence }),
  }).where(eq(deliveryRuns.id, runId));

  return c.json({ ok: true });
});

// Delete a run (unassigns all its stops first)
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param('id');
  await db.update(stops).set({ runId: null }).where(eq(stops.runId, runId));
  await db.delete(deliveryRuns).where(eq(deliveryRuns.id, runId));
  return c.json({ ok: true });
});

// Assign a stop to a run (or unassign with runId: null)
app.patch('/:id/assign-stop', async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param('id');
  const { stopId } = await c.req.json<{ stopId: string }>();
  await db.update(stops).set({ runId }).where(eq(stops.id, stopId));
  return c.json({ ok: true });
});

// Bulk-assign stops to a run by postcode/zone prefix
app.post('/:id/auto-assign', async (c) => {
  const db = drizzle(c.env.DB);
  const runId = c.req.param('id');
  const [run] = await db.select().from(deliveryRuns).where(eq(deliveryRuns.id, runId)).limit(1);
  if (!run) return c.json({ error: 'Run not found' }, 404);

  const { postcodes } = await c.req.json<{ postcodes: string[] }>();
  if (!postcodes?.length) return c.json({ error: 'postcodes array required' }, 400);

  const dayStops = await db.select().from(stops)
    .where(eq(stops.deliveryDayId, run.deliveryDayId));

  let assigned = 0;
  for (const stop of dayStops) {
    const addr = JSON.parse(stop.address) as { postcode?: string };
    if (postcodes.some((pc) => addr.postcode?.startsWith(pc))) {
      await db.update(stops).set({ runId }).where(eq(stops.id, stop.id));
      assigned++;
    }
  }

  return c.json({ assigned });
});

// Get runs assigned to the current driver for a delivery day
app.get('/my-run', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const dayId = c.req.query('deliveryDayId');
  if (!dayId) return c.json({ error: 'deliveryDayId required' }, 400);

  const [run] = await db.select().from(deliveryRuns)
    .where(and(eq(deliveryRuns.deliveryDayId, dayId), eq(deliveryRuns.driverUid, user.id)))
    .limit(1);

  return c.json(run ?? null);
});

export default app;
