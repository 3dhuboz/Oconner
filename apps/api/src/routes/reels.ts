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

// Auto-sync reels from Facebook Graph API (called by cron or manually)
app.post('/sync', async (c) => {
  const token = c.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return c.json({ error: 'FB_PAGE_ACCESS_TOKEN not set' }, 500);
  const PAGE_ID = '655149441012938';
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PAGE_ID}/videos?fields=id,title,description,picture,permalink_url,created_time&limit=6&access_token=${token}`
    );
    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: `Facebook API ${res.status}: ${err}` }, 500);
    }
    const data = await res.json() as { data: Array<{ id: string; title?: string; description?: string; picture?: string; permalink_url?: string; created_time?: string }> };
    if (!data.data?.length) return c.json({ synced: 0, message: 'No videos found' });

    const db = drizzle(c.env.DB);
    const now = Date.now();
    let synced = 0;
    for (const video of data.data) {
      const fbUrl = video.permalink_url
        ? `https://www.facebook.com${video.permalink_url}`
        : `https://www.facebook.com/${PAGE_ID}/videos/${video.id}`;
      const title = video.title || video.description?.split('\n')[0]?.slice(0, 50) || 'O\'Connor Agriculture';
      const subtitle = video.created_time ? new Date(video.created_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const reelId = `fb-${video.id}`;

      // Upsert: insert or update if exists
      const [existing] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId)).limit(1);
      if (existing) {
        await db.update(reelsTable).set({ thumbnailUrl: video.picture ?? existing.thumbnailUrl, updatedAt: now }).where(eq(reelsTable.id, reelId));
      } else {
        await db.insert(reelsTable).values({
          id: reelId, title, subtitle, fbUrl,
          thumbnailUrl: video.picture ?? null,
          displayOrder: synced, active: true, createdAt: now, updatedAt: now,
        });
        synced++;
      }
    }
    return c.json({ synced, total: data.data.length });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : 'Sync failed' }, 500);
  }
});

export { app as reels };
