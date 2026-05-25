import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../types';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { customers, staffAuthLinks, users } from '@butcher/db';

// Simple in-memory JWKS cache (lives for the lifetime of the worker isolate)
const jwksCache = new Map<string, { keys: ({ kid: string } & JsonWebKey)[]; ts: number }>();

type ClerkIdentity = {
  clerkId: string;
  email: string;
  emails: string[];
  issuer: string;
};

type StaffUser = typeof users.$inferSelect;

function b64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function emailsFromTokenPayload(payload: Record<string, unknown>): string[] {
  const candidates: Array<string | null | undefined> = [];
  for (const key of ['email', 'email_address', 'primary_email_address']) {
    const value = payload[key];
    if (typeof value === 'string') candidates.push(value);
  }
  return uniqueEmails(candidates);
}

async function findActiveStaffByEmail(
  db: ReturnType<typeof drizzle>,
  email: string,
): Promise<StaffUser | undefined> {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  const [dbUser] = await db.select().from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return dbUser?.active ? dbUser : undefined;
}

async function findStaffByAuthLink(
  db: ReturnType<typeof drizzle>,
  clerkId: string,
): Promise<StaffUser | undefined> {
  try {
    const [link] = await db.select().from(staffAuthLinks)
      .where(eq(staffAuthLinks.clerkId, clerkId))
      .limit(1);
    if (!link?.active) return undefined;
    const [dbUser] = await db.select().from(users).where(eq(users.id, link.userId)).limit(1);
    return dbUser?.active ? dbUser : undefined;
  } catch (e) {
    console.warn('[auth] staff_auth_links lookup skipped:', String(e));
    return undefined;
  }
}

async function rememberStaffAuthLink(
  db: ReturnType<typeof drizzle>,
  dbUser: StaffUser,
  clerkId: string,
  source: string,
) {
  try {
    const now = Date.now();
    await db.insert(staffAuthLinks).values({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      clerkId,
      email: normalizeEmail(dbUser.email),
      source,
      active: true,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: staffAuthLinks.clerkId,
      set: {
        userId: dbUser.id,
        email: normalizeEmail(dbUser.email),
        source,
        active: true,
        updatedAt: now,
      },
    });
  } catch (e) {
    console.warn('[auth] staff_auth_links remember skipped:', String(e));
  }
}

async function clerkBackendEmails(secretKey: string | undefined, clerkId: string): Promise<string[]> {
  if (!secretKey) return [];
  try {
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!clerkRes.ok) {
      console.warn('[auth] Clerk Backend lookup failed:', clerkRes.status);
      return [];
    }
    const clerkUser = await clerkRes.json() as { email_addresses?: { email_address: string }[] };
    return uniqueEmails((clerkUser.email_addresses ?? []).map((e) => e.email_address));
  } catch (e) {
    console.warn('[auth] Clerk Backend lookup errored:', String(e));
    return [];
  }
}

export async function verifyClerkToken(
  authHeader: string | null,
  _secretKey: string,
): Promise<ClerkIdentity | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(b64url(parts[0]))) as { kid: string; alg: string };
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1]))) as Record<string, unknown> & {
      sub: string; iss: string; exp: number; nbf?: number;
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
    const emails = emailsFromTokenPayload(payload);
    return { clerkId: payload.sub, email: emails[0] ?? '', emails, issuer: iss };
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
    const [directUser] = await db.select().from(users).where(eq(users.id, clerk.clerkId)).limit(1);
    let dbUser: StaffUser | undefined = directUser;
    let authSource = dbUser ? 'users.id' : '';

    if (!dbUser) {
      dbUser = await findStaffByAuthLink(db, clerk.clerkId);
      if (dbUser) authSource = 'staff_auth_links';
    }

    // If not found by Clerk ID, try trusted email claims.
    if (!dbUser) {
      for (const email of clerk.emails) {
        dbUser = await findActiveStaffByEmail(db, email);
        if (dbUser) {
          authSource = 'jwt_email';
          break;
        }
      }
    }

    // Seamus can have both a storefront customer identity and a staff/admin
    // identity. If Clerk returns the customer-side ID, resolve through the
    // trusted customer row before denying staff access.
    if (!dbUser) {
      const [linkedCustomer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
      if (linkedCustomer?.email) {
        dbUser = await findActiveStaffByEmail(db, linkedCustomer.email);
        if (dbUser) {
          authSource = 'customer_clerk';
          console.log('[auth] resolved customer-linked staff user:', linkedCustomer.email);
        }
      }
    }

    // If still not found, the Clerk ID may have changed and JWT has no email.
    // Look up email from Clerk Backend API and match against our users table.
    if (!dbUser) {
      const emails = await clerkBackendEmails(c.env.CLERK_SECRET_KEY, clerk.clerkId);
      for (const email of emails) {
        dbUser = await findActiveStaffByEmail(db, email);
        if (dbUser) {
          authSource = 'clerk_backend_email';
          break;
        }
      }
    }

    if (!dbUser || !dbUser.active) {
      const issuerHost = (() => {
        try { return new URL(clerk.issuer).host; } catch { return 'unknown'; }
      })();
      console.warn('[auth] staff access denied:', {
        clerkId: clerk.clerkId,
        issuer: issuerHost,
        tokenEmails: clerk.emails,
      });
      return c.json({ error: 'Forbidden' }, 403);
    }

    await rememberStaffAuthLink(db, dbUser, clerk.clerkId, authSource || 'resolved');

    c.set('user', { id: dbUser.id, email: dbUser.email, role: dbUser.role as AuthUser['role'] });
    await next();
  } catch (e) {
    console.error('[auth] requireAuth error:', e);
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
