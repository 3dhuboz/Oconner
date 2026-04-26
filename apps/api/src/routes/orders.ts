import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, inArray, gte, sql } from 'drizzle-orm';
import { orders, customers, deliveryDays, stops, stockMovements, notifications, auditLog, deliveryDayStock, promoCodes } from '@butcher/db';
import type { Env, AuthUser } from '../types';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import { deductStock, getStockDayId, reserveDayStock, consumePromoCode } from '../lib/stock';
import { parseJson } from '../lib/json';

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
  return c.json(rows.map((o) => ({ ...o, items: parseJson<unknown[]>(o.items, []), deliveryAddress: parseJson<Record<string, string>>(o.deliveryAddress, {}) })));
});

app.get('/today', async (c) => {
  const db = drizzle(c.env.DB);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const rows = await db.select().from(orders).where(gte(orders.createdAt, todayStart.getTime())).orderBy(desc(orders.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: parseJson<unknown[]>(o.items, []), deliveryAddress: parseJson<Record<string, string>>(o.deliveryAddress, {}) })));
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [order] = await db.select().from(orders).where(eq(orders.id, c.req.param('id'))).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);

  // Ownership check: staff/admin can read any order; otherwise the requester
  // must own the order. Without this, any signed-in customer (or driver) could
  // read another customer's full PII just by guessing or being sent the UUID.
  const user = c.get('user');
  if (user.role !== 'admin' && user.role !== 'staff') {
    // Resolve the requester's customer record by matching the user's email or clerkId.
    const [requesterCustomer] = await db.select().from(customers)
      .where(eq(customers.email, user.email))
      .limit(1);
    if (!requesterCustomer || order.customerId !== requesterCustomer.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  return c.json({ ...order, items: parseJson<unknown[]>(order.items, []), deliveryAddress: parseJson<Record<string, string>>(order.deliveryAddress, {}) });
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof orders.$inferInsert & { deliveryAddress: object; items: object[]; clerkId?: string }>();
  const now = Date.now();
  const orderId = crypto.randomUUID();

  let customerId = body.customerId;
  if (!customerId) {
    // Race-safe customer upsert (UNIQUE(email) added in this PR's migration).
    // Two concurrent first-orders from the same email would otherwise both
    // pass the SELECT and INSERT, creating duplicates.
    const newId = crypto.randomUUID();
    const inserted = await db.insert(customers).values({
      id: newId,
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
    })
      .onConflictDoUpdate({
        target: customers.email,
        set: { clerkId: sql`COALESCE(${customers.clerkId}, ${body.clerkId ?? null})`, updatedAt: now },
      })
      .returning({ id: customers.id });
    customerId = inserted[0]?.id ?? newId;
  }

  // ── Server-side pricing: recalculate delivery fee, discount & GST ──
  const subtotal = body.subtotal ?? 0;
  let discount = 0;
  const promoId = (body as any).promoId;
  let appliedPromoId: string | null = null;

  // Read promo for discount calculation. The actual increment happens later via
  // a conditional UPDATE so two concurrent checkouts can't both pass a stale
  // usedCount < maxUses check.
  if (promoId) {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, promoId)).limit(1);
    if (promo && promo.active) {
      if (promo.type === 'percentage') {
        discount = Math.round(subtotal * (promo.value / 100));
      } else {
        discount = Math.min(promo.value, subtotal);
      }
      appliedPromoId = promo.id;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const deliveryFee = 0; // was: pickup ? 0 : (subtotal >= $100 ? 0 : $10) — re-enable when delivery fees return
  const gst = 0; // no GST on goods
  const total = discountedSubtotal + deliveryFee;

  // ── Day-specific stock validation + atomic reservation (pool-aware) ──
  // reserveDayStock does a conditional UPDATE per item so concurrent checkouts
  // can't both pass a stale "sold + qty <= allocated" read; if any item fails,
  // earlier reservations are rolled back automatically.
  const stockDayId = await getStockDayId(db, body.deliveryDayId);
  const dayAllocations = await db.select().from(deliveryDayStock)
    .where(eq(deliveryDayStock.deliveryDayId, stockDayId));

  const reserveResult = await reserveDayStock(db, dayAllocations, body.items as any[]);
  if (!reserveResult.ok) {
    return c.json({ error: reserveResult.error }, 400);
  }

  // Atomically consume the promo code. If the race is lost (already at
  // maxUses, or expired between read and now), reject the order before
  // creating it — and roll back the day-stock reservation we just made.
  if (appliedPromoId) {
    const consumed = await consumePromoCode(db, appliedPromoId, now);
    if (!consumed.ok) {
      // Compensation rollback for stock we just reserved (decrement by qty,
      // not "set back to original" — another checkout may have moved sold).
      for (const item of (body.items as any[])) {
        const alloc = dayAllocations.find((a) => a.productId === item.productId);
        if (!alloc) continue;
        const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
        if (qty <= 0) continue;
        await db.update(deliveryDayStock)
          .set({ sold: sql`${deliveryDayStock.sold} - ${qty}` })
          .where(eq(deliveryDayStock.id, alloc.id));
      }
      return c.json({ error: consumed.error }, 400);
    }
  }

  await db.insert(orders).values({
    id: orderId,
    customerId,
    customerEmail: body.customerEmail,
    customerName: body.customerName ?? '',
    customerPhone: body.customerPhone ?? '',
    items: JSON.stringify(body.items),
    subtotal: body.subtotal ?? 0,
    deliveryFee,
    gst,
    total,
    status: body.status ?? 'confirmed',
    paymentStatus: body.paymentStatus ?? 'pending_payment',
    deliveryDayId: body.deliveryDayId,
    deliveryAddress: JSON.stringify(body.deliveryAddress),
    internalNotes: body.internalNotes ?? '',
    fulfillmentType: (body as any).fulfillmentType ?? 'delivery',
    // Store the human-readable promo code (e.g. "BBQ20"), not the internal
    // UUID. Receipts, customer-facing emails and the admin order detail all
    // read this column expecting the code as the customer typed it.
    promoCode: (body as any).promoCode ?? null,
    promoDiscount: discount ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  // Deduct global product stock (separate from per-day allocations above).
  await deductStock(db, body.items as any[], orderId, now);

  // Atomic counter increments — read-then-write would let two concurrent
  // orders both compute the same +1 and clobber each other's increment.
  await db.update(deliveryDays).set({ orderCount: sql`${deliveryDays.orderCount} + 1` }).where(eq(deliveryDays.id, body.deliveryDayId));
  await db.update(customers)
    .set({ orderCount: sql`${customers.orderCount} + 1`, totalSpent: sql`${customers.totalSpent} + ${total}`, updatedAt: now })
    .where(eq(customers.id, customerId));

  return c.json({ id: orderId }, 201);
});

// Whitelist of allowed order statuses. Without this, any string lands in the
// status column and downstream UIs / state-machines silently misbehave.
const VALID_ORDER_STATUSES = new Set([
  'pending_payment', 'confirmed', 'preparing', 'packed',
  'out_for_delivery', 'delivered', 'cancelled', 'refunded',
]);

app.patch('/:id/status', async (c) => {
  const db = drizzle(c.env.DB);
  const { status, packedBy, internalNotes } = await c.req.json<{ status: string; packedBy?: string; internalNotes?: string }>();
  const user = c.get('user');
  const orderId = c.req.param('id');
  const now = Date.now();

  if (!VALID_ORDER_STATUSES.has(status)) {
    return c.json({ error: `Invalid status "${status}". Must be one of: ${[...VALID_ORDER_STATUSES].join(', ')}` }, 400);
  }

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

  // Handle delivery day change — atomic deltas on both old and new day counters.
  if (body.deliveryDayId !== undefined && body.deliveryDayId !== order.deliveryDayId) {
    await db.update(deliveryDays)
      .set({ orderCount: sql`MAX(0, ${deliveryDays.orderCount} - 1)` })
      .where(eq(deliveryDays.id, order.deliveryDayId));
    await db.update(deliveryDays)
      .set({ orderCount: sql`${deliveryDays.orderCount} + 1` })
      .where(eq(deliveryDays.id, body.deliveryDayId));
    patch.deliveryDayId = body.deliveryDayId;
    // Move any existing stops to the new delivery day
    await db.update(stops).set({ deliveryDayId: body.deliveryDayId }).where(eq(stops.orderId, orderId));
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

  const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; weightKg?: number; lineTotal: number }>;

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
    // Step 1: Find or create a Square customer (required for invoices)
    const searchResult = await squareFetch('/customers/search', {
      query: {
        filter: {
          email_address: { exact: order.customerEmail },
        },
      },
    });

    let squareCustomerId: string;
    if (searchResult.customers?.length) {
      squareCustomerId = searchResult.customers[0].id;
    } else {
      const createCustomerResult = await squareFetch('/customers', {
        idempotency_key: crypto.randomUUID(),
        given_name: order.customerName?.split(' ')[0] ?? '',
        family_name: order.customerName?.split(' ').slice(1).join(' ') ?? '',
        email_address: order.customerEmail,
        phone_number: order.customerPhone ? `+61${order.customerPhone.replace(/^0/, '')}` : undefined,
      });
      if (createCustomerResult.errors) {
        return c.json({ error: 'Failed to create Square customer', details: createCustomerResult.errors }, 400);
      }
      squareCustomerId = createCustomerResult.customer?.id;
      if (!squareCustomerId) {
        return c.json({ error: 'Square customer created but no ID returned' }, 500);
      }
    }

    // Step 2: Create a Square Order with line items + delivery fee
    const squareLineItems = items.map((i) => {
      const qty = i.quantity ?? 1;
      return {
        name: i.productName ?? 'Item',
        quantity: String(qty),
        base_price_money: {
          amount: Math.round(i.lineTotal / qty),
          currency: 'AUD',
        },
      };
    });

    // Include delivery fee as a line item if > 0
    if (order.deliveryFee > 0) {
      squareLineItems.push({
        name: 'Delivery Fee',
        quantity: '1',
        base_price_money: { amount: order.deliveryFee, currency: 'AUD' },
      });
    }

    const orderResult = await squareFetch('/orders', {
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: locationId,
        customer_id: squareCustomerId,
        line_items: squareLineItems,
      },
    });

    if (orderResult.errors) {
      return c.json({ error: 'Failed to create Square order', details: orderResult.errors }, 400);
    }

    const squareOrderId = orderResult.order?.id;
    if (!squareOrderId) {
      return c.json({ error: 'Square order created but no ID returned' }, 500);
    }

    // Step 3: Create invoice referencing the Square order + customer
    const invoiceResult = await squareFetch('/invoices', {
      idempotency_key: crypto.randomUUID(),
      invoice: {
        location_id: locationId,
        order_id: squareOrderId,
        primary_recipient: {
          customer_id: squareCustomerId,
        },
        payment_requests: [{
          request_type: 'BALANCE',
          due_date: await (async () => {
            // Due before delivery date, fallback to 3 days from now
            if (order.deliveryDayId) {
              const [dd] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
              if (dd?.date) {
                const deliveryDate = new Date(dd.date);
                deliveryDate.setDate(deliveryDate.getDate() - 1); // day before delivery
                if (deliveryDate > new Date()) return deliveryDate.toISOString().split('T')[0];
              }
            }
            return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          })(),
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

    // Step 4: Publish the invoice (this emails it to the customer)
    const invoice = invoiceResult.invoice;
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

// ── Square Payment Link (for storefront checkout) ──
app.post('/:id/payment-link', async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  const storefrontUrl = c.env.STOREFRONT_URL ?? 'https://oconnoragriculture.com.au';
  if (!accessToken || !locationId) return c.json({ error: 'Square not configured' }, 400);

  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; weightKg?: number; weight?: number; lineTotal: number }>;

  try {
    const squareLineItems = items.map((i) => {
      const qty = i.quantity ?? 1;
      return {
        name: i.productName ?? 'Item',
        quantity: String(qty),
        base_price_money: {
          amount: Math.round(i.lineTotal / qty),
          currency: 'AUD',
        },
      };
    });

    if (order.deliveryFee > 0) {
      squareLineItems.push({
        name: 'Delivery Fee',
        quantity: '1',
        base_price_money: { amount: order.deliveryFee, currency: 'AUD' },
      });
    }

    const res = await fetch(`${SQUARE_API}/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          line_items: squareLineItems,
          metadata: { orderId },
        },
        checkout_options: {
          redirect_url: `${storefrontUrl}/checkout/success?orderId=${orderId}`,
          merchant_support_email: 'orders@oconnoragriculture.com.au',
        },
        payment_note: `O'Connor Agriculture — Order #${orderId.slice(0, 8).toUpperCase()}`,
      }),
    });

    const data = await res.json() as any;

    if (data.errors) {
      return c.json({ error: 'Failed to create payment link', details: data.errors }, 400);
    }

    const paymentUrl = data.payment_link?.url ?? data.payment_link?.long_url;
    const paymentLinkId = data.payment_link?.id;

    if (!paymentUrl) {
      return c.json({ error: 'Payment link created but no URL returned' }, 500);
    }

    await db.update(orders).set({
      paymentStatus: 'awaiting_payment',
      internalNotes: `${order.internalNotes ?? ''}\nSquare payment link: ${paymentLinkId ?? 'unknown'}`.trim(),
      updatedAt: Date.now(),
    }).where(eq(orders.id, orderId));

    return c.json({ ok: true, paymentUrl, paymentLinkId });
  } catch (e: any) {
    return c.json({ error: e?.message ?? 'Payment link creation failed' }, 500);
  }
});

export default app;
