import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { driverSessions } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(driverSessions).where(eq(driverSessions.active, true));
  return c.json(rows.map((s) => ({ ...s, breadcrumb: JSON.parse(s.breadcrumb) })));
});

app.post('/session', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const { deliveryDayId, totalStops } = await c.req.json<{ deliveryDayId: string; totalStops: number }>();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(driverSessions).values({
    id,
    driverUid: user.id,
    driverName: user.email,
    deliveryDayId,
    active: true,
    startedAt: now,
    lastUpdated: now,
    totalStops,
  });
  return c.json({ id }, 201);
});

app.patch('/session/:id/ping', async (c) => {
  const db = drizzle(c.env.DB);
  const { lat, lng } = await c.req.json<{ lat: number; lng: number }>();
  const now = Date.now();
  const sessionId = c.req.param('id');

  const [session] = await db.select().from(driverSessions).where(eq(driverSessions.id, sessionId)).limit(1);
  if (!session) return c.json({ error: 'Not found' }, 404);

  const breadcrumb = JSON.parse(session.breadcrumb) as Array<{ lat: number; lng: number; ts: number }>;
  breadcrumb.push({ lat, lng, ts: now });
  if (breadcrumb.length > 500) breadcrumb.shift();

  await db.update(driverSessions).set({
    lastLat: lat,
    lastLng: lng,
    lastUpdated: now,
    breadcrumb: JSON.stringify(breadcrumb),
  }).where(eq(driverSessions.id, sessionId));

  return c.json({ ok: true });
});

app.patch('/session/:id/complete', async (c) => {
  const db = drizzle(c.env.DB);
  await db.update(driverSessions).set({
    active: false,
    completedAt: Date.now(),
  }).where(eq(driverSessions.id, c.req.param('id')));
  return c.json({ ok: true });
});

export default app;
