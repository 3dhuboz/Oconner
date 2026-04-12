import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { orders, notifications } from '@butcher/db';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import type { Env, AuthUser } from '../types';

const SQUARE_API = 'https://connect.squareup.com/v2';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Verify Square webhook signature
async function verifySquareSignature(body: string, signature: string, sigKey: string, url: string): Promise<boolean> {
  if (!signature || !sigKey) return false;
  // Square HMAC-SHA256: signature = HMAC(sigKey, url + body)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(sigKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(url + body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

app.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-square-hmacsha256-signature') ?? '';
  const sigKey = c.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const webhookUrl = `https://oconner-api.steve-700.workers.dev/api/square/webhook`;

  // Verify signature if key is configured
  if (sigKey) {
    const valid = await verifySquareSignature(rawBody, signature, sigKey, webhookUrl);
    if (!valid) {
      console.log('[square-webhook] Invalid signature');
      return c.json({ error: 'Invalid signature' }, 400);
    }
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  console.log('[square-webhook] Event:', event.type);

  const db = drizzle(c.env.DB);

  if (event.type === 'payment.completed') {
    const payment = event.data.object as Record<string, unknown>;
    const squareOrderId = payment.order_id as string | undefined;

    if (!squareOrderId) {
      console.log('[square-webhook] No order_id on payment');
      return c.json({ received: true });
    }

    // Look up the Square order to get our orderId from metadata
    let orderId: string | undefined;
    try {
      const accessToken = c.env.SQUARE_ACCESS_TOKEN;
      if (accessToken) {
        const res = await fetch(`${SQUARE_API}/orders/${squareOrderId}`, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' },
        });
        if (res.ok) {
          const data = await res.json() as { order?: { metadata?: Record<string, string> } };
          orderId = data.order?.metadata?.orderId;
        }
      }
    } catch {}

    // Fallback: try matching by payment note which contains our order ID
    if (!orderId) {
      const note = (payment.note as string) ?? '';
      const match = note.match(/Order #([A-F0-9]{8})/i);
      if (match) {
        // Search for order by ID suffix
        const allOrders = await db.select().from(orders).limit(100);
        const found = allOrders.find((o) => o.id.slice(-8).toUpperCase() === match[1].toUpperCase());
        if (found) orderId = found.id;
      }
    }

    if (!orderId) {
      console.log('[square-webhook] Could not match payment to order');
      return c.json({ received: true });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      console.log('[square-webhook] Order not found:', orderId);
      return c.json({ received: true });
    }

    // Only update if not already paid
    if (order.paymentStatus !== 'paid') {
      const now = Date.now();
      await db.update(orders).set({
        paymentStatus: 'paid',
        status: 'confirmed',
        updatedAt: now,
      }).where(eq(orders.id, orderId));

      console.log('[square-webhook] Order confirmed:', orderId);

      // Send confirmation email
      try {
        const items = JSON.parse(order.items);
        const addr = JSON.parse(order.deliveryAddress);
        const addrStr = `${addr.line1 ?? ''}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.suburb ?? ''} ${addr.state ?? ''} ${addr.postcode ?? ''}`;
        const emailData = {
          customerName: order.customerName,
          orderId,
          orderItems: items,
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          gst: order.gst,
          total: order.total,
          deliveryDate: new Date(order.createdAt).toLocaleDateString('en-AU'),
          deliveryAddress: addrStr,
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
      } catch (e) {
        console.error('[square-webhook] Email failed:', e);
      }
    }
  }

  if (event.type === 'payment.failed') {
    const payment = event.data.object as Record<string, unknown>;
    const note = (payment.note as string) ?? '';
    const match = note.match(/Order #([A-F0-9]{8})/i);
    if (match) {
      const allOrders = await db.select().from(orders).limit(100);
      const found = allOrders.find((o) => o.id.slice(-8).toUpperCase() === match[1].toUpperCase());
      if (found) {
        await db.update(orders).set({ paymentStatus: 'payment_failed', updatedAt: Date.now() }).where(eq(orders.id, found.id));
        console.log('[square-webhook] Payment failed for order:', found.id);
      }
    }
  }

  return c.json({ received: true });
});

export default app;
