import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { orders, customers, stockMovements, products, notifications, subscriptions } from '@butcher/db';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import type { Env, AuthUser } from '../types';

interface OrderItem {
  productId: string;
  productName: string;
  isMeatPack: boolean;
  weight?: number;   // grams
  quantity?: number;  // units (for packs)
  lineTotal: number;
}

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deductStock(db: any, items: OrderItem[], orderId: string, now: number) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    // Packs: deduct by quantity (units). Loose cuts: deduct by weight (grams → kg).
    const delta = item.isMeatPack ? -(item.quantity ?? 1) : -((item.weight ?? 0) / 1000);
    const newStock = Math.max(0, product.stockOnHand + delta);

    await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: 'sale',
      qty: delta,
      unit: item.isMeatPack ? 'units' : 'kg',
      reason: `Online order ${orderId}`,
      orderId,
      createdBy: 'system',
      createdAt: now,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function restoreStock(db: any, items: OrderItem[], orderId: string, now: number) {
  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product) continue;

    // Reverse the deduction: positive delta to add stock back
    const delta = item.isMeatPack ? (item.quantity ?? 1) : (item.weight ?? 0) / 1000;
    const newStock = product.stockOnHand + delta;

    await db.update(products).set({ stockOnHand: newStock, updatedAt: now }).where(eq(products.id, item.productId));
    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      type: 'refund',
      qty: delta,
      unit: item.isMeatPack ? 'units' : 'kg',
      reason: `Refund for order ${orderId}`,
      orderId,
      createdBy: 'system',
      createdAt: now,
    });
  }
}

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
        // ── Deduct stock for each item in the order ──
        const items = JSON.parse(order.items) as OrderItem[];
        await deductStock(db, items, orderId, now);

        const addrParsed = JSON.parse(order.deliveryAddress) as Record<string, string>;
        const addr = `${addrParsed.line1 ?? ''}${addrParsed.line2 ? ', ' + addrParsed.line2 : ''}, ${addrParsed.suburb ?? ''} ${addrParsed.state ?? ''} ${addrParsed.postcode ?? ''}`;
        const emailData = {
          customerName: order.customerName,
          orderId,
          orderItems: items,
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

  // ── Subscription checkout completed — auto-activate subscription ──
  if (event.type === 'checkout.session.completed') {
    const metadata = obj.metadata as Record<string, string> | undefined;
    if (metadata?.type === 'subscription') {
      const now = Date.now();
      const subId = crypto.randomUUID();
      await db.insert(subscriptions).values({
        id: subId,
        customerId: null,
        email: metadata.customerEmail ?? (obj.customer_email as string) ?? '',
        boxId: metadata.boxId,
        boxName: metadata.boxName,
        alternateBoxId: metadata.alternateBoxId ?? null,
        alternateBoxName: metadata.alternateBoxName ?? null,
        nextIsAlternate: false,
        frequency: metadata.frequency,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      // Link to existing customer if found
      const email = metadata.customerEmail ?? (obj.customer_email as string) ?? '';
      if (email) {
        const [existing] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
        if (existing) {
          await db.update(subscriptions).set({ customerId: existing.id }).where(eq(subscriptions.id, subId));
        } else {
          // Create customer record
          const custId = crypto.randomUUID();
          await db.insert(customers).values({
            id: custId,
            email,
            name: metadata.customerName ?? '',
            phone: metadata.customerPhone ?? '',
            accountType: 'registered',
            orderCount: 0,
            totalSpent: 0,
            blacklisted: false,
            notes: metadata.notes ? `Delivery notes: ${metadata.notes}` : '',
            createdAt: now,
            updatedAt: now,
          });
          await db.update(subscriptions).set({ customerId: custId }).where(eq(subscriptions.id, subId));
        }
      }
    }
  }

  if (event.type === 'charge.refunded') {
    const orderId = (obj.metadata as Record<string, string>)?.orderId;
    if (orderId) {
      const now = Date.now();
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      await db.update(orders).set({ paymentStatus: 'refunded', status: 'refunded', updatedAt: now }).where(eq(orders.id, orderId));
      if (order) {
        const items = JSON.parse(order.items) as OrderItem[];
        await restoreStock(db, items, orderId, now);
      }
    }
  }

  return c.json({ received: true });
});

export default app;
