import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { stockMovements, products } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/movements', async (c) => {
  const db = drizzle(c.env.DB);
  const { productId, limit: limitParam } = c.req.query();
  const limitVal = Math.min(parseInt(limitParam ?? '100', 10), 500);
  let rows;
  if (productId) {
    rows = await db.select().from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limitVal);
  } else {
    rows = await db.select().from(stockMovements)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limitVal);
  }
  return c.json(rows);
});

app.post('/adjust', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const body = await c.req.json<{ productId: string; delta: number; reason?: string; type?: string }>();
  const { productId, delta, reason, type = 'adjustment' } = body;

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);

  const newStock = Math.max(0, product.stockOnHand + delta);
  const now = Date.now();

  await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, productId));

  await db.insert(stockMovements).values({
    id: crypto.randomUUID(),
    productId,
    productName: product.name,
    type,
    qty: delta,
    unit: product.isMeatPack ? 'units' : 'kg',
    reason: reason ?? null,
    orderId: null,
    supplierId: null,
    stocktakeSessionId: null,
    createdBy: user.email,
    createdAt: now,
  });

  return c.json({ ok: true, stockOnHand: newStock });
});

export default app;
