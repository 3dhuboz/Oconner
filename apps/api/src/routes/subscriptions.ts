import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import { subscriptions, customers } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

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
