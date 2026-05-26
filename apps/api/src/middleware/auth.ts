import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../types';
import { verifyToken as verifyClerkJwt } from '@clerk/backend';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { authFailures, customers, staffAuthLinks, users } from '@butcher/db';

const clerkAuthorizedParties = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://oconner.pages.dev',
  'https://butcher-storefront.pages.dev',
  'https://butcher-admin.pages.dev',
  'https://butcher-driver.pages.dev',
  'https://admin.oconner.com.au',
  'https://driver.oconner.com.au',
  'https://oconnoragriculture.com.au',
  'https://www.oconnoragriculture.com.au',
  'https://admin.oconnoragriculture.com.au',
  'https://driver.oconnoragriculture.com.au',
];

type ClerkIdentity = {
  clerkId: string;
  email: string;
  emails: string[];
  issuer: string;
};

type StaffUser = typeof users.$inferSelect;

type AuthFailureCode =
  | 'AUTH_MISSING_TOKEN'
  | 'AUTH_INVALID_TOKEN'
  | 'ADMIN_AUTH_LINK_MISSING';

type TokenHint = {
  clerkId?: string;
  issuer?: string;
  tokenEmails: string[];
};

function b64url(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function supportId(): string {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

function authFailure(
  c: Context,
  status: 401 | 403,
  code: AuthFailureCode,
  supportCode = supportId(),
) {
  const response = c.json({
    error: status === 401 ? 'Unauthorized' : 'Forbidden',
    code,
    supportId: supportCode,
    action: 'reset_sign_in',
  }, status);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function truncate(value: string | undefined, max = 500): string {
  return (value ?? '').slice(0, max);
}

function emailsFromTokenPayload(payload: Record<string, unknown>): string[] {
  const candidates: Array<string | null | undefined> = [];
  for (const key of ['email', 'email_address', 'primary_email_address']) {
    const value = payload[key];
    if (typeof value === 'string') candidates.push(value);
  }
  return uniqueEmails(candidates);
}

function tokenHintFromAuthHeader(authHeader: string | null): TokenHint {
  if (!authHeader?.startsWith('Bearer ')) return { tokenEmails: [] };
  try {
    const [, payloadPart] = authHeader.slice(7).split('.');
    if (!payloadPart) return { tokenEmails: [] };
    const payload = JSON.parse(new TextDecoder().decode(b64url(payloadPart))) as Record<string, unknown>;
    return {
      clerkId: typeof payload.sub === 'string' ? payload.sub : undefined,
      issuer: typeof payload.iss === 'string' ? payload.iss : undefined,
      tokenEmails: emailsFromTokenPayload(payload),
    };
  } catch {
    return { tokenEmails: [] };
  }
}

async function recordAuthFailure(
  db: ReturnType<typeof drizzle>,
  failure: {
    supportId: string;
    code: AuthFailureCode;
    clerkId?: string;
    issuer?: string;
    tokenEmails?: string[];
    path?: string;
    userAgent?: string;
  },
) {
  try {
    await db.insert(authFailures).values({
      id: crypto.randomUUID(),
      supportId: failure.supportId,
      code: failure.code,
      clerkId: failure.clerkId ?? null,
      issuer: truncate(failure.issuer, 250),
      tokenEmails: JSON.stringify(uniqueEmails(failure.tokenEmails ?? [])),
      path: truncate(failure.path, 250),
      userAgent: truncate(failure.userAgent, 500),
      createdAt: Date.now(),
    }).onConflictDoNothing({ target: authFailures.supportId });
  } catch (e) {
    console.warn('[auth] auth_failures record skipped:', String(e));
  }
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
  secretKey: string,
): Promise<ClerkIdentity | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyClerkJwt(token, {
      secretKey,
      authorizedParties: clerkAuthorizedParties,
    }) as Record<string, unknown> & { sub?: string; iss?: string };
    if (!payload.sub) return null;
    const emails = emailsFromTokenPayload(payload);
    return {
      clerkId: payload.sub,
      email: emails[0] ?? '',
      emails,
      issuer: typeof payload.iss === 'string' ? payload.iss : '',
    };
  } catch (e) {
    console.warn('[auth] Clerk token verification failed:', String(e));
    return null;
  }
}

export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return authFailure(c, 401, 'AUTH_MISSING_TOKEN');
  }

  try {
    const db = drizzle(c.env.DB);
    const clerk = await verifyClerkToken(authHeader, c.env.CLERK_SECRET_KEY);
    if (!clerk) {
      const code = supportId();
      const hint = tokenHintFromAuthHeader(authHeader);
      await recordAuthFailure(db, {
        supportId: code,
        code: 'AUTH_INVALID_TOKEN',
        clerkId: hint.clerkId,
        issuer: hint.issuer,
        tokenEmails: hint.tokenEmails,
        path: new URL(c.req.url).pathname,
        userAgent: c.req.header('User-Agent') ?? '',
      });
      return authFailure(c, 401, 'AUTH_INVALID_TOKEN', code);
    }

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
      const code = supportId();
      const issuerHost = (() => {
        try { return new URL(clerk.issuer).host; } catch { return 'unknown'; }
      })();
      console.warn('[auth] staff access denied:', {
        supportId: code,
        clerkId: clerk.clerkId,
        issuer: issuerHost,
        tokenEmails: clerk.emails,
      });
      await recordAuthFailure(db, {
        supportId: code,
        code: 'ADMIN_AUTH_LINK_MISSING',
        clerkId: clerk.clerkId,
        issuer: clerk.issuer,
        tokenEmails: clerk.emails,
        path: new URL(c.req.url).pathname,
        userAgent: c.req.header('User-Agent') ?? '',
      });
      return authFailure(c, 403, 'ADMIN_AUTH_LINK_MISSING', code);
    }

    await rememberStaffAuthLink(db, dbUser, clerk.clerkId, authSource || 'resolved');

    c.set('user', { id: dbUser.id, email: dbUser.email, role: dbUser.role as AuthUser['role'] });
    await next();
  } catch (e) {
    console.error('[auth] requireAuth error:', e);
    return authFailure(c, 401, 'AUTH_INVALID_TOKEN');
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
