import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { orders, customers, stockMovements, notifications } from '@butcher/db';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<{ type: string; data: { object: Record<string, unknown> } }> {
  const pairs = sigHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];
  for (const pair of pairs) {
    const [k, v] = pair.split('=');
    if (k === 't') timestamp = v;
    if (k === 'v1') signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) throw new Error('Invalid signature header');

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');

  if (!signatures.includes(computed)) throw new Error('Signature mismatch');
  return JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } };
}

app.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const sig = c.req.header('stripe-signature') ?? '';

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = await verifyStripeSignature(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const db = drizzle(c.env.DB);
  const obj = event.data.object;

  if (event.type === 'payment_intent.succeeded') {
    const orderId = (obj.metadata as Record<string, string> | undefined)?.orderId;
    if (orderId) {
      const now = Date.now();
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      await db.update(orders).set({ paymentStatus: 'paid', status: 'confirmed', updatedAt: now }).where(eq(orders.id, orderId));
      if (order) {
        const addrParsed = JSON.parse(order.deliveryAddress) as Record<string, string>;
        const addr = `${addrParsed.line1 ?? ''}${addrParsed.line2 ? ', ' + addrParsed.line2 : ''}, ${addrParsed.suburb ?? ''} ${addrParsed.state ?? ''} ${addrParsed.postcode ?? ''}`;
        const emailData = {
          customerName: order.customerName,
          orderId,
          orderItems: JSON.parse(order.items) as Array<{ productName: string; lineTotal: number }>,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          gst: order.gst,
          total: order.total,
          deliveryDate: new Date(order.createdAt).toLocaleDateString('en-AU'),
          deliveryAddress: addr,
          trackingUrl: `${c.env.STOREFRONT_URL}/track/${orderId}`,
        };
        const result = await sendEmail({
          apiKey: c.env.RESEND_API_KEY,
          from: c.env.FROM_EMAIL,
          to: order.customerEmail,
          subject: getSubject('order_confirmation', emailData),
          html: buildOrderEmail('order_confirmation', emailData),
        });
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          orderId,
          customerId: order.customerId,
          type: 'order_confirmation',
          status: result ? 'sent' : 'failed',
          recipientEmail: order.customerEmail,
          resendId: result?.id ?? null,
          sentAt: now,
        });
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const orderId = (obj.metadata as Record<string, string> | undefined)?.orderId;
    if (orderId) {
      await db.update(orders).set({ paymentStatus: 'failed', status: 'cancelled', updatedAt: Date.now() }).where(eq(orders.id, orderId));
    }
  }

  if (event.type === 'charge.refunded') {
    const orderId = (obj.metadata as Record<string, string>)?.orderId;
    if (orderId) {
      await db.update(orders).set({ paymentStatus: 'refunded', status: 'refunded', updatedAt: Date.now() }).where(eq(orders.id, orderId));
    }
  }

  return c.json({ received: true });
});

export default app;
