import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { pushSubscriptions, customers } from '@butcher/db';
import { sendPush } from '../lib/webpush';
import { verifyClerkToken } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/** Save or update a push subscription for the signed-in customer. */
app.post('/subscribe', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ endpoint: string; keys: { p256dh: string; auth: string } }>();
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return c.json({ error: 'Invalid subscription data' }, 400);
  }

  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json({ error: 'Customer record not found' }, 404);

  await db.insert(pushSubscriptions)
    .values({
      id: crypto.randomUUID(),
      customerId: customer.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

  return c.json({ ok: true });
});

/** Remove a push subscription (e.g. when the user revokes permission). */
app.delete('/subscribe', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);

  const { endpoint } = await c.req.json<{ endpoint: string }>();
  if (!endpoint) return c.json({ error: 'Missing endpoint' }, 400);

  const db = drizzle(c.env.DB);
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  return c.json({ ok: true });
});

/**
 * Send a push notification to all subscriptions for a given customerId.
 * Exposed as an internal helper — not called directly by the client.
 */
export async function notifyCustomer(
  db: ReturnType<typeof drizzle>,
  customerId: string,
  notification: { title: string; body: string; url?: string },
  env: Env,
): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.customerId, customerId));
  const contact = `mailto:${env.FROM_EMAIL.replace(/.*<(.+)>/, '$1')}`;

  await Promise.allSettled(subs.map((s) =>
    sendPush(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      notification,
      env.VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!,
      contact,
    ).then((ok) => {
      if (!ok) {
        // Clean up expired/invalid subscriptions
        return db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
      }
    }),
  ));
}

export default app;
