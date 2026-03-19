/**
 * Clerk JWT verification for Cloudflare Pages Functions.
 * Protected API routes call verifyClerkJwt() before processing.
 *
 * Public routes (no auth required):
 *   - POST /api/webhooks/email      (CloudMailIn / SendGrid inbound)
 *   - POST /api/stripe/webhook*     (Stripe — verified by signature)
 *   - GET  /api/email/poll-inbox    (cron-job.org — verified by CRON_SECRET)
 *   - POST /api/email/poll-inbox    (same)
 *   - GET  /api/auth/xero/callback  (Xero OAuth redirect — no Clerk JWT in popup)
 */

import { verifyToken } from '@clerk/backend';

// Routes that skip Clerk JWT verification
const PUBLIC_PREFIXES = [
  '/api/webhooks/',
  '/api/stripe/webhook',
  '/api/email/poll-inbox',
  '/api/auth/xero/callback',  // Xero OAuth redirect — no Clerk JWT in popup context
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
}

/**
 * Verify the Clerk JWT from the Authorization header.
 * Returns the userId on success, or null if invalid/missing.
 *
 * @param request  The incoming CF Request
 * @param env      The CF env (must have CLERK_SECRET_KEY)
 */
export async function verifyClerkJwt(
  request: Request,
  env: Record<string, any>
): Promise<string | null> {
  const secretKey = env.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    console.warn('[Auth] CLERK_SECRET_KEY not set — skipping JWT verification');
    return 'anonymous'; // Dev fallback: allow all requests
  }

  try {
    const token = extractToken(request);
    if (!token) return null;

    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  } catch (err: any) {
    console.warn('[Auth] JWT verification failed:', err.message);
    return null;
  }
}

function extractToken(request: Request): string | null {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // 2. Cookie: __session=<token>  (Clerk's cookie name)
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)__session=([^;]+)/);
  if (match) return match[1];
  // 3. Cookie: __clerk_db_jwt  (alternative Clerk cookie)
  const altMatch = cookie.match(/(?:^|;\s*)__clerk_db_jwt=([^;]+)/);
  if (altMatch) return altMatch[1];

  return null;
}
