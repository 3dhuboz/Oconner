import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc } from 'drizzle-orm';
import { products, stockMovements, auditLog, deliveryDayStock } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { activeOnly } = c.req.query();
  let rows;
  if (activeOnly === 'true') {
    rows = await db.select().from(products).where(eq(products.active, true)).orderBy(asc(products.displayOrder));
  } else {
    rows = await db.select().from(products).orderBy(asc(products.displayOrder));
  }
  return c.json(rows.map((p) => ({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null })));
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [product] = await db.select().from(products).where(eq(products.id, c.req.param('id'))).limit(1);
  if (!product) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...product, weightOptions: product.weightOptions ? JSON.parse(product.weightOptions) : null });
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof products.$inferInsert & { weightOptions?: number[] }>();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(products).values({
    ...body,
    id,
    weightOptions: body.weightOptions ? JSON.stringify(body.weightOptions) : null,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const body = await c.req.json<Partial<typeof products.$inferInsert> & { weightOptions?: number[] }>();
  const now = Date.now();
  const productId = c.req.param('id');

  const [before] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!before) return c.json({ error: 'Not found' }, 404);

  await db.update(products).set({
    ...body,
    weightOptions: body.weightOptions ? JSON.stringify(body.weightOptions) : before.weightOptions,
    updatedAt: now,
  }).where(eq(products.id, productId));

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: 'update',
    entity: 'products',
    entityId: productId,
    before: JSON.stringify(before),
    after: JSON.stringify(body),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: now,
  });

  return c.json({ ok: true });
});

app.patch('/:id/stock', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const { delta, reason, type } = await c.req.json<{ delta: number; reason?: string; type?: string }>();
  const productId = c.req.param('id');

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return c.json({ error: 'Not found' }, 404);

  const newStock = Math.max(0, product.stockOnHand + delta);
  const now = Date.now();

  await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, productId));
  await db.insert(stockMovements).values({
    id: crypto.randomUUID(),
    productId,
    productName: product.name,
    type: type ?? 'adjustment',
    qty: delta,
    unit: product.isMeatPack ? 'units' : 'kg',
    reason: reason ?? null,
    createdBy: user.email,
    createdAt: now,
  });

  return c.json({ stockOnHand: newStock });
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const productId = c.req.param('id');
  const { hard } = c.req.query();

  const [before] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!before) return c.json({ error: 'Not found' }, 404);

  if (hard === 'true') {
    await db.delete(stockMovements).where(eq(stockMovements.productId, productId));
    await db.delete(deliveryDayStock).where(eq(deliveryDayStock.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
  } else {
    await db.update(products).set({ active: false, updatedAt: Date.now() }).where(eq(products.id, productId));
  }

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: hard === 'true' ? 'delete' : 'soft_delete',
    entity: 'products',
    entityId: productId,
    before: JSON.stringify(before),
    after: '{}',
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: Date.now(),
  });

  return c.json({ ok: true });
});

export default app;
