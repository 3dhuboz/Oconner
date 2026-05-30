import { Hono } from 'hono';
import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import { users } from '@butcher/db';
import type { Env } from '../types';
import { sendSms } from '../lib/sms';

const app = new Hono<{ Bindings: Env }>();
type AdminRescueContext = Context<{ Bindings: Env }>;

function rescuePin(c: AdminRescueContext): string {
  return c.req.header('X-Staff-Rescue-Pin') ?? '';
}

function unauthorized(c: AdminRescueContext) {
  const res = c.json({ error: 'Unauthorized' }, 401);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

function requireStaffRescuePin(c: AdminRescueContext): boolean {
  const expected = c.env.STAFF_RESCUE_PIN;
  return !!expected && rescuePin(c) === expected;
}

async function createClerkSignInToken(env: Env, userId: string, expiresInSeconds: number) {
  const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      expires_in_seconds: expiresInSeconds,
    }),
  });
  const data = await res.json() as { token?: string; url?: string; errors?: unknown };
  if (!res.ok || !data.token) {
    throw new Error(`Clerk sign-in token failed: ${JSON.stringify(data.errors ?? data).slice(0, 500)}`);
  }
  return data;
}

app.post('/sign-in-link', async (c) => {
  if (!requireStaffRescuePin(c)) return unauthorized(c);

  let body: { email?: string; phone?: string; expiresInSeconds?: number; sendSms?: boolean } = {};
  try {
    body = await c.req.json<typeof body>();
  } catch {}

  const email = (body.email ?? 'oconnoragriculture@gmail.com').trim().toLowerCase();
  const db = drizzle(c.env.DB);
  const [staff] = await db.select().from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (!staff?.active) return c.json({ error: 'Active staff user not found' }, 404);

  const expiresInSeconds = Math.max(60, Math.min(body.expiresInSeconds ?? 20 * 60, 60 * 60));
  const token = await createClerkSignInToken(c.env, staff.id, expiresInSeconds);
  const signInToken = token.token;
  if (!signInToken) throw new Error('Clerk sign-in token response did not include a token');
  const adminUrl = c.env.ADMIN_APP_URL ?? 'https://admin.oconnoragriculture.com.au';
  const link = `${adminUrl}/ticket?token=${encodeURIComponent(signInToken)}`;

  let sms: Awaited<ReturnType<typeof sendSms>> | null = null;
  if (body.sendSms !== false) {
    const to = body.phone ?? staff.phone ?? '';
    sms = await sendSms(c.env, to, `O'Connor admin access link: ${link} This one-time link expires in ${Math.round(expiresInSeconds / 60)} minutes.`);
  }

  const res = c.json({
    ok: true,
    email: staff.email,
    link,
    clerkUrl: token.url,
    sms: sms ? { ok: sms.ok, messageId: sms.messageId, error: sms.error } : null,
    expiresInSeconds,
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
});

export default app;
