import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, inArray, gte } from 'drizzle-orm';
import { orders, customers, deliveryDays, stops, stockMovements, notifications, auditLog, deliveryDayStock, promoCodes } from '@butcher/db';
import type { Env, AuthUser } from '../types';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import { deductStock } from '../lib/stock';

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

  // ── Server-side pricing: recalculate delivery fee, discount & GST ──
  const subtotal = body.subtotal ?? 0;
  let discount = 0;
  const promoId = (body as any).promoId;

  // Validate and apply promo code
  if (promoId) {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, promoId)).limit(1);
    if (promo && promo.active) {
      if (promo.type === 'percentage') {
        discount = Math.round(subtotal * (promo.value / 100));
      } else {
        discount = Math.min(promo.value, subtotal);
      }
      // Increment usage
      await db.update(promoCodes).set({ usedCount: promo.usedCount + 1 }).where(eq(promoCodes.id, promo.id));
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const deliveryFee = (body.fulfillmentType === 'pickup') ? 0 : (discountedSubtotal >= 10000 ? 0 : 1000);
  const gst = 0; // no GST on goods
  const total = discountedSubtotal + deliveryFee;

  // ── Day-specific stock validation ──
  const dayAllocations = await db.select().from(deliveryDayStock)
    .where(eq(deliveryDayStock.deliveryDayId, body.deliveryDayId));

  if (dayAllocations.length > 0) {
    // Check each item against day allocation
    for (const item of (body.items as any[])) {
      const alloc = dayAllocations.find((a) => a.productId === item.productId);
      if (alloc) {
        const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
        if (alloc.sold + qty > alloc.allocated) {
          return c.json({ error: `${item.productName} is sold out for this delivery day` }, 400);
        }
      }
    }
  }

  await db.insert(orders).values({
    ...body,
    id: orderId,
    customerId,
    items: JSON.stringify(body.items),
    deliveryAddress: JSON.stringify(body.deliveryAddress),
    deliveryFee,
    gst,
    total,
    createdAt: now,
    updatedAt: now,
  });

  // Deduct stock for each item in the order
  await deductStock(db, body.items as any[], orderId, now);

  // ── Update day-specific stock sold counts ──
  if (dayAllocations.length > 0) {
    for (const item of (body.items as any[])) {
      const alloc = dayAllocations.find((a) => a.productId === item.productId);
      if (alloc) {
        const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
        await db.update(deliveryDayStock)
          .set({ sold: alloc.sold + qty })
          .where(eq(deliveryDayStock.id, alloc.id));
      }
    }
  }

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, body.deliveryDayId)).limit(1);
  if (day) await db.update(deliveryDays).set({ orderCount: day.orderCount + 1 }).where(eq(deliveryDays.id, day.id));
  const [cust] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (cust) await db.update(customers).set({ orderCount: cust.orderCount + 1, totalSpent: cust.totalSpent + total, updatedAt: now }).where(eq(customers.id, customerId));

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

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const orderId = c.req.param('id');
  const now = Date.now();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json<{
    customerName?: string; customerEmail?: string; customerPhone?: string;
    items?: unknown[]; subtotal?: number; deliveryFee?: number; gst?: number; total?: number;
    deliveryAddress?: object; deliveryDayId?: string;
    notes?: string; internalNotes?: string; status?: string;
  }>();

  const patch: Partial<typeof orders.$inferInsert> = { updatedAt: now };
  if (body.customerName !== undefined) patch.customerName = body.customerName;
  if (body.customerEmail !== undefined) patch.customerEmail = body.customerEmail;
  if (body.customerPhone !== undefined) patch.customerPhone = body.customerPhone;
  if (body.items !== undefined) patch.items = JSON.stringify(body.items);
  if (body.subtotal !== undefined) patch.subtotal = body.subtotal;
  if (body.deliveryFee !== undefined) patch.deliveryFee = body.deliveryFee;
  if (body.gst !== undefined) patch.gst = body.gst;
  if (body.total !== undefined) patch.total = body.total;
  if (body.deliveryAddress !== undefined) patch.deliveryAddress = JSON.stringify(body.deliveryAddress);
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.internalNotes !== undefined) patch.internalNotes = body.internalNotes;
  if (body.status !== undefined) patch.status = body.status;

  // Handle delivery day change
  if (body.deliveryDayId !== undefined && body.deliveryDayId !== order.deliveryDayId) {
    // Decrement old day
    const [oldDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
    if (oldDay) await db.update(deliveryDays).set({ orderCount: Math.max(0, oldDay.orderCount - 1) }).where(eq(deliveryDays.id, oldDay.id));
    // Increment new day
    const [newDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, body.deliveryDayId)).limit(1);
    if (newDay) await db.update(deliveryDays).set({ orderCount: newDay.orderCount + 1 }).where(eq(deliveryDays.id, newDay.id));
    patch.deliveryDayId = body.deliveryDayId;
  }

  // Update customer totalSpent if total changed
  if (body.total !== undefined && body.total !== order.total && order.customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    if (cust) {
      const newSpent = Math.max(0, cust.totalSpent - order.total + body.total);
      await db.update(customers).set({ totalSpent: newSpent, updatedAt: now }).where(eq(customers.id, cust.id));
    }
  }

  await db.update(orders).set(patch).where(eq(orders.id, orderId));

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: 'update_order',
    entity: 'orders',
    entityId: orderId,
    before: JSON.stringify({ customerName: order.customerName, total: order.total, items: order.items }),
    after: JSON.stringify(body),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: now,
  });

  const [updated] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return c.json({ ...updated, items: JSON.parse(updated.items), deliveryAddress: JSON.parse(updated.deliveryAddress) });
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const orderId = c.req.param('id');

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);

  // Rollback delivery day order count
  if (order.deliveryDayId) {
    const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
    if (day) await db.update(deliveryDays).set({ orderCount: Math.max(0, day.orderCount - 1) }).where(eq(deliveryDays.id, day.id));
  }

  // Rollback customer stats
  if (order.customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    if (cust) {
      await db.update(customers).set({
        orderCount: Math.max(0, cust.orderCount - 1),
        totalSpent: Math.max(0, cust.totalSpent - order.total),
        updatedAt: Date.now(),
      }).where(eq(customers.id, cust.id));
    }
  }

  // Delete associated stops (FK constraint)
  await db.delete(stops).where(eq(stops.orderId, orderId));

  // Restore stock for the deleted order
  const items = JSON.parse(order.items) as Array<{ productId: string; productName: string; isMeatPack: boolean; weight?: number; quantity?: number; lineTotal: number }>;
  const { restoreStock } = await import('../lib/stock');
  await restoreStock(db, items, orderId, Date.now());

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    action: 'delete_order',
    entity: 'orders',
    entityId: orderId,
    before: JSON.stringify({ customerName: order.customerName, total: order.total, status: order.status }),
    after: JSON.stringify({ deleted: true }),
    adminUid: user.id,
    adminEmail: user.email,
    timestamp: Date.now(),
  });

  await db.delete(orders).where(eq(orders.id, orderId));
  return c.json({ ok: true });
});

// ── Square Invoice ──
const SQUARE_API = 'https://connect.squareup.com/v2';

app.post('/:id/invoice', async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) return c.json({ error: 'Square not configured' }, 400);

  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; lineTotal: number }>;

  const squareFetch = async (path: string, body: unknown) => {
    const res = await fetch(`${SQUARE_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<any>;
  };

  try {
    // Step 1: Create a Square Order with line items
    const squareLineItems = items.map((i) => ({
      name: i.productName ?? 'Item',
      quantity: String(i.quantity ?? 1),
      base_price_money: {
        amount: Math.round((i.price ?? 0) / (i.quantity || 1)),
        currency: 'AUD',
      },
    }));

    const orderResult = await squareFetch('/orders', {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: locationId,
        line_items: squareLineItems,
      },
    });

    if (orderResult.errors) {
      return c.json({ error: 'Failed to create Square order', details: orderResult.errors }, 400);
    }

    const squareOrderId = (orderResult as any).order?.id;
    if (!squareOrderId) {
      return c.json({ error: 'Square order created but no ID returned' }, 500);
    }

    // Step 2: Create invoice referencing the Square order
    const invoiceResult = await squareFetch('/invoices', {
      idempotency_key: crypto.randomUUID(),
      invoice: {
        location_id: locationId,
        order_id: squareOrderId,
        primary_recipient: {
          given_name: order.customerName?.split(' ')[0] ?? '',
          family_name: order.customerName?.split(' ').slice(1).join(' ') ?? '',
          email_address: order.customerEmail,
          phone_number: order.customerPhone ? `+61${order.customerPhone.replace(/^0/, '')}` : undefined,
        },
        payment_requests: [{
          request_type: 'BALANCE',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          automatic_payment_source: 'NONE',
        }],
        delivery_method: 'EMAIL',
        title: `O'Connor Agriculture — Order #${orderId.slice(0, 8).toUpperCase()}`,
        accepted_payment_methods: {
          card: true,
          square_gift_card: false,
          bank_account: false,
          buy_now_pay_later: false,
        },
      },
    });

    if (invoiceResult.errors) {
      return c.json({ error: 'Failed to create invoice', details: invoiceResult.errors }, 400);
    }

    // Step 3: Publish the invoice (this emails it to the customer)
    const invoice = (invoiceResult as any).invoice;
    if (invoice?.id) {
      const publishResult = await squareFetch(`/invoices/${invoice.id}/publish`, {
        idempotency_key: crypto.randomUUID(),
        version: invoice.version ?? 0,
      });

      if (publishResult.errors) {
        return c.json({ error: 'Invoice created but failed to send', details: publishResult.errors }, 400);
      }
    }

    await db.update(orders).set({
      paymentStatus: 'invoice_sent',
      internalNotes: `${order.internalNotes ?? ''}\nSquare invoice sent: ${invoice?.id ?? 'unknown'}`.trim(),
      updatedAt: Date.now(),
    }).where(eq(orders.id, orderId));

    return c.json({ ok: true, method: 'invoice', invoiceId: invoice?.id });
  } catch (e: any) {
    return c.json({ error: e?.message ?? 'Invoice creation failed' }, 500);
  }
});

export default app;
