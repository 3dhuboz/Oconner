import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { promoCodes } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// List all promo codes (admin)
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  return c.json(codes);
});

// Create promo code (admin)
app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrder?: number;
    maxUses?: number;
    expiresAt?: number;
  }>();

  const id = crypto.randomUUID();
  await db.insert(promoCodes).values({
    id,
    code: body.code.toUpperCase().trim(),
    type: body.type,
    value: body.value,
    minOrder: body.minOrder ?? 0,
    maxUses: body.maxUses ?? null,
    expiresAt: body.expiresAt ?? null,
    usedCount: 0,
    active: true,
    createdAt: Date.now(),
  });

  return c.json({ id }, 201);
});

// Update promo code (admin)
app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Partial<typeof promoCodes.$inferInsert>>();
  await db.update(promoCodes).set(body).where(eq(promoCodes.id, c.req.param('id')));
  return c.json({ ok: true });
});

// Delete promo code (admin)
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  await db.delete(promoCodes).where(eq(promoCodes.id, c.req.param('id')));
  return c.json({ ok: true });
});

export default app;
