import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../types';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '@butcher/db';
import { createClerkClient } from '@clerk/backend';

export async function verifyClerkToken(
  authHeader: string | null,
  clerkSecretKey: string,
): Promise<{ clerkId: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const clerk = createClerkClient({ secretKey: clerkSecretKey });
    const payload = await clerk.verifyToken(token);
    const clerkId = payload.sub;
    let email = '';
    try {
      const user = await clerk.users.getUser(clerkId);
      email = user.emailAddresses?.[0]?.emailAddress ?? '';
    } catch { /* email is optional */ }
    return { clerkId, email };
  } catch {
    return null;
  }
}

export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const clerk = await verifyClerkToken(authHeader, c.env.CLERK_SECRET_KEY);
    if (!clerk) return c.json({ error: 'Unauthorized' }, 401);

    const db = drizzle(c.env.DB);
    const [dbUser] = await db.select().from(users).where(eq(users.id, clerk.clerkId)).limit(1);

    if (!dbUser || !dbUser.active) return c.json({ error: 'Forbidden' }, 403);

    c.set('user', { id: dbUser.id, email: dbUser.email, role: dbUser.role as AuthUser['role'] });
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
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
