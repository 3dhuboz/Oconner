import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc } from 'drizzle-orm';
import { reels as reelsTable } from '@butcher/db';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Public: list active reels for storefront
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(reelsTable)
    .where(eq(reelsTable.active, true))
    .orderBy(asc(reelsTable.displayOrder));
  return c.json({
    reels: rows.map((r, i) => ({
      id: r.id,
      label: r.title,
      sublabel: r.subtitle,
      thumbnail: r.thumbnailUrl,
      videoUrl: null,
      fbUrl: r.fbUrl,
      featured: i === 0,
    })),
  });
});

// Admin: list all reels (including inactive)
app.get('/admin', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(reelsTable).orderBy(asc(reelsTable.displayOrder));
  return c.json(rows);
});

// Admin: create reel
app.post('/', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<{ title: string; subtitle?: string; fbUrl: string; thumbnailUrl?: string; displayOrder?: number }>();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(reelsTable).values({
    id,
    title: body.title,
    subtitle: body.subtitle ?? '',
    fbUrl: body.fbUrl,
    thumbnailUrl: body.thumbnailUrl ?? null,
    displayOrder: body.displayOrder ?? 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ id }, 201);
});

// Admin: update reel
app.patch('/:id', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Partial<typeof reelsTable.$inferInsert>>();
  await db.update(reelsTable).set({ ...body, updatedAt: Date.now() }).where(eq(reelsTable.id, c.req.param('id')));
  return c.json({ ok: true });
});

// Admin: delete reel
app.delete('/:id', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  await db.delete(reelsTable).where(eq(reelsTable.id, c.req.param('id')));
  return c.json({ ok: true });
});

export { app as reels };
