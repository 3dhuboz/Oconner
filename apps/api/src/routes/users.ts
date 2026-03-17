import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '@butcher/db';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(users);
  return c.json(rows);
});

app.get('/drivers', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.role, 'driver'));
  return c.json(rows);
});

app.get('/me', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const caller = c.get('user');
  if (caller.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const body = await c.req.json<typeof users.$inferInsert>();
  const now = Date.now();
  await db.insert(users).values({ ...body, createdAt: now, updatedAt: now });
  return c.json({ id: body.id }, 201);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const caller = c.get('user');
  if (caller.role !== 'admin' && caller.id !== c.req.param('id')) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json<Partial<typeof users.$inferInsert>>();
  await db.update(users).set({ ...body, updatedAt: Date.now() }).where(eq(users.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.post('/lookup', async (c) => {
  const caller = c.get('user');
  if (caller.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const { email } = await c.req.json<{ email: string }>();
  if (!email) return c.json({ error: 'Email required' }, 400);

  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(email)}&limit=1`,
    { headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}` } },
  );
  if (!res.ok) return c.json({ error: 'Clerk lookup failed' }, 500);
  const found = await res.json() as any[];
  if (!found.length) {
    return c.json({ error: 'No Clerk account found for this email. They must sign up at the storefront first.' }, 404);
  }
  const u = found[0];
  return c.json({
    clerkId: u.id,
    email: u.email_addresses?.[0]?.email_address ?? email,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || email,
  });
});

export default app;
