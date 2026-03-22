import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { customers, orders } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
  return c.json(rows.map((c) => ({ ...c, addresses: JSON.parse(c.addresses) })));
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.id, c.req.param('id'))).limit(1);
  if (!customer) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...customer, addresses: JSON.parse(customer.addresses) });
});

app.get('/:id/orders', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(orders)
    .where(eq(orders.customerId, c.req.param('id')))
    .orderBy(desc(orders.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof customers.$inferInsert & { addresses?: object[] }>();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(customers).values({
    ...body,
    id,
    addresses: JSON.stringify(body.addresses ?? []),
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Partial<typeof customers.$inferInsert> & { addresses?: object[] }>();
  const patch: Partial<typeof customers.$inferInsert> = { ...body, updatedAt: Date.now() };
  if (body.addresses) patch.addresses = JSON.stringify(body.addresses);
  await db.update(customers).set(patch).where(eq(customers.id, c.req.param('id')));
  return c.json({ ok: true });
});

// Delete customer
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  await db.delete(customers).where(eq(customers.id, c.req.param('id')));
  return c.json({ ok: true });
});

export default app;
