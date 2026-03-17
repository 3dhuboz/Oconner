import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../types';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '@butcher/db';

// Simple in-memory JWKS cache (lives for the lifetime of the worker isolate)
const jwksCache = new Map<string, { keys: ({ kid: string } & JsonWebKey)[]; ts: number }>();

function b64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

export async function verifyClerkToken(
  authHeader: string | null,
  _secretKey: string,
): Promise<{ clerkId: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(b64url(parts[0]))) as { kid: string; alg: string };
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1]))) as {
      sub: string; iss: string; exp: number; nbf?: number; email?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) { console.log('[auth] token expired'); return null; }
    if (payload.nbf && payload.nbf > now + 5) { console.log('[auth] token not yet valid'); return null; }

    // Validate issuer is a Clerk domain
    const iss = payload.iss ?? '';
    if (!iss.includes('clerk')) { console.log('[auth] invalid iss:', iss); return null; }

    // Get JWKS (with 5-min cache)
    const cached = jwksCache.get(iss);
    let keys = cached && (Date.now() - cached.ts < 300_000) ? cached.keys : null;
    if (!keys) {
      const res = await fetch(`${iss}/.well-known/jwks.json`);
      if (!res.ok) { console.log('[auth] JWKS fetch failed:', res.status); return null; }
      const jwks = await res.json() as { keys: ({ kid: string } & JsonWebKey)[] };
      keys = jwks.keys;
      jwksCache.set(iss, { keys, ts: Date.now() });
    }

    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) { console.log('[auth] no matching key for kid:', header.kid); return null; }

    const cryptoKey = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const sig = b64url(parts[2]);
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);

    if (!valid) { console.log('[auth] signature invalid'); return null; }
    console.log('[auth] token valid, sub:', payload.sub);
    return { clerkId: payload.sub, email: payload.email ?? '' };
  } catch (e) {
    console.error('[auth] verifyClerkToken error:', String(e));
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
