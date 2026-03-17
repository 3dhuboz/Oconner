import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../types';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '@butcher/db';

export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const verifyUrl = 'https://api.clerk.com/v1/tokens/verify';
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) return c.json({ error: 'Unauthorized' }, 401);

    const payload = await res.json() as { sub: string; email?: string };
    const clerkId = payload.sub;

    const db = drizzle(c.env.DB);
    const [dbUser] = await db.select().from(users).where(eq(users.id, clerkId)).limit(1);

    if (!dbUser || !dbUser.active) return c.json({ error: 'Forbidden' }, 403);

    c.set('user', { id: dbUser.id, email: dbUser.email, role: dbUser.role as AuthUser['role'] });
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

export async function verifyClerkToken(
  authHeader: string | null,
  clerkSecretKey: string,
): Promise<{ clerkId: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: authHeader.slice(7) }),
    });
    if (!res.ok) return null;
    const payload = await res.json() as { sub: string; email?: string };
    return { clerkId: payload.sub, email: payload.email ?? '' };
  } catch {
    return null;
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
