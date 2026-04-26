import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { driverSessions } from '@butcher/db';
import type { Env, AuthUser } from '../types';
import { sendEmail } from '../lib/email';
import { parseJson } from '../lib/json';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/active', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(driverSessions).where(eq(driverSessions.active, true));
  return c.json(rows.map((s) => ({ ...s, breadcrumb: parseJson<Array<{ lat: number; lng: number; ts: number }>>(s.breadcrumb, []) })));
});

app.post('/session', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const { deliveryDayId, totalStops } = await c.req.json<{ deliveryDayId: string; totalStops: number }>();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(driverSessions).values({
    id,
    driverUid: user.id,
    driverName: user.email,
    deliveryDayId,
    active: true,
    startedAt: now,
    lastUpdated: now,
    totalStops,
  });
  return c.json({ id }, 201);
});

app.patch('/session/:id/ping', async (c) => {
  const db = drizzle(c.env.DB);
  const { lat, lng } = await c.req.json<{ lat: number; lng: number }>();
  const now = Date.now();
  const sessionId = c.req.param('id');

  const [session] = await db.select().from(driverSessions).where(eq(driverSessions.id, sessionId)).limit(1);
  if (!session) return c.json({ error: 'Not found' }, 404);

  const breadcrumb = parseJson<Array<{ lat: number; lng: number; ts: number }>>(session.breadcrumb, []);
  breadcrumb.push({ lat, lng, ts: now });
  if (breadcrumb.length > 500) breadcrumb.shift();

  await db.update(driverSessions).set({
    lastLat: lat,
    lastLng: lng,
    lastUpdated: now,
    breadcrumb: JSON.stringify(breadcrumb),
  }).where(eq(driverSessions.id, sessionId));

  return c.json({ ok: true });
});

app.patch('/session/:id/complete', async (c) => {
  const db = drizzle(c.env.DB);
  await db.update(driverSessions).set({
    active: false,
    completedAt: Date.now(),
  }).where(eq(driverSessions.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.post('/invite', async (c) => {
  const { name, email } = await c.req.json<{ name: string; email: string }>();
  if (!name || !email) return c.json({ error: 'name and email required' }, 400);

  const appUrl = c.env.DRIVER_APP_URL ?? 'https://driver.oconnoragriculture.com.au';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1B3A2E;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">O'Connor Agriculture</h1>
    <p style="color:#a3c e8f;margin:4px 0 0;font-size:14px">Driver App Access</p>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${name},</p>
    <p>You've been added as a driver for O'Connor Agriculture. Use the button below to access the driver app on your phone.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${appUrl}" style="background:#1B3A2E;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-size:16px;font-weight:bold">Open Driver App</a>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
      <p style="margin:0 0 10px;font-weight:bold;font-size:14px">📱 Install on your phone for best experience:</p>
      <p style="margin:0 0 8px;font-size:13px"><strong>iPhone (Safari):</strong> Open the link → tap the Share button → tap <em>Add to Home Screen</em></p>
      <p style="margin:0;font-size:13px"><strong>Android (Chrome):</strong> Open the link → tap the menu (⋮) → tap <em>Add to Home Screen</em> or accept the install prompt</p>
    </div>
    <p style="font-size:13px;color:#666">Once installed, you'll see the app icon on your home screen and it'll work just like a native app — even offline.</p>
    <p style="font-size:13px;color:#666">Sign in with this email address: <strong>${email}</strong></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">O'Connor Agriculture — If you weren't expecting this, please ignore this email.</p>
  </div>
</body>
</html>`;

  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: email,
    subject: `You're invited to the O'Connor Driver App`,
    html,
  });

  if (!result) return c.json({ error: 'Failed to send email' }, 500);
  return c.json({ ok: true });
});

export default app;
