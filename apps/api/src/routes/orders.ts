import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, inArray, gte } from 'drizzle-orm';
import { orders, customers, deliveryDays, stops, stockMovements, notifications, auditLog } from '@butcher/db';
import type { Env, AuthUser } from '../types';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

const STATUS_EMAIL_MAP: Record<string, string> = {
  confirmed: 'order_confirmation',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'order_cancelled',
  refunded: 'refund_confirmation',
};

function formatAddress(addr: Record<string, string>): string {
  if (!addr) return '';
  return `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.suburb} ${addr.state} ${addr.postcode}`;
}

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { status } = c.req.query();
  let rows;
  if (status && status !== 'all') {
    rows = await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt));
  } else {
    rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});

app.get('/today', async (c) => {
  const db = drizzle(c.env.DB);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const rows = await db.select().from(orders).where(gte(orders.createdAt, todayStart.getTime())).orderBy(desc(orders.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [order] = await db.select().from(orders).where(eq(orders.id, c.req.param('id'))).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...order, items: JSON.parse(order.items), deliveryAddress: JSON.parse(order.deliveryAddress) });
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof orders.$inferInsert & { deliveryAddress: object; items: object[]; clerkId?: string }>();
  const now = Date.now();
  const orderId = crypto.randomUUID();

  let customerId = body.customerId;
  if (!customerId) {
    const [existing] = await db.select().from(customers).where(eq(customers.email, body.customerEmail)).limit(1);
    if (existing) {
      customerId = existing.id;
      if (body.clerkId && !existing.clerkId) {
        await db.update(customers).set({ clerkId: body.clerkId, updatedAt: now }).where(eq(customers.id, existing.id));
      }
    } else {
      customerId = crypto.randomUUID();
      await db.insert(customers).values({
        id: customerId,
        email: body.customerEmail,
        name: body.customerName ?? '',
        phone: body.customerPhone ?? '',
        clerkId: body.clerkId ?? null,
        accountType: 'registered',
        orderCount: 0,
        totalSpent: 0,
        blacklisted: false,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await db.insert(orders).values({
    ...body,
    id: orderId,
    customerId,
    items: JSON.stringify(body.items),
    deliveryAddress: JSON.stringify(body.deliveryAddress),
    createdAt: now,
    updatedAt: now,
  });

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, body.deliveryDayId)).limit(1);
  if (day) await db.update(deliveryDays).set({ orderCount: day.orderCount + 1 }).where(eq(deliveryDays.id, day.id));
  const [cust] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (cust) await db.update(customers).set({ orderCount: cust.orderCount + 1, totalSpent: cust.totalSpent + (body.total ?? 0), updatedAt: now }).where(eq(customers.id, customerId));

  return c.json({ id: orderId }, 201);
});

app.patch('/:id/status', async (c) => {
  const db = drizzle(c.env.DB);
  const { status, packedBy, internalNotes } = await c.req.json<{ status: string; packedBy?: string; internalNotes?: string }>();
  const user = c.get('user');
  const orderId = c.req.param('id');
  const now = Date.now();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);

  const patch: Partial<typeof orders.$inferInsert> = { status, updatedAt: now };
  if (packedBy) { patch.packedBy = packedBy; patch.packedAt = now; }
  if (internalNotes !== undefined) patch.internalNotes = internalNotes;

  await db.update(orders).set(patch).where(eq(orders.id, orderId));

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: 'update_status',
    entity: 'orders',
    entityId: orderId,
    before: JSON.stringify({ status: order.status }),
    after: JSON.stringify({ status }),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: now,
  });

  const emailType = STATUS_EMAIL_MAP[status];
  if (emailType) {
    const addrParsed = JSON.parse(order.deliveryAddress) as Record<string, string>;
    const emailData = {
      customerName: order.customerName,
      orderId,
      orderItems: JSON.parse(order.items) as Array<{ productName: string; lineTotal: number }>,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      gst: order.gst,
      total: order.total,
      deliveryDate: new Date(order.createdAt).toLocaleDateString('en-AU'),
      deliveryAddress: formatAddress(addrParsed),
      trackingUrl: `${c.env.STOREFRONT_URL}/track/${orderId}`,
      proofUrl: order.proofUrl ?? undefined,
    };
    const result = await sendEmail({
      apiKey: c.env.RESEND_API_KEY,
      from: c.env.FROM_EMAIL,
      to: order.customerEmail,
      subject: getSubject(emailType, emailData),
      html: buildOrderEmail(emailType, emailData),
    });
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      orderId,
      customerId: order.customerId,
      type: emailType,
      status: result ? 'sent' : 'failed',
      recipientEmail: order.customerEmail,
      resendId: result?.id ?? null,
      sentAt: now,
    });
  }

  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await db.delete(orders).where(eq(orders.id, c.req.param('id')));
  return c.json({ ok: true });
});

export default app;
