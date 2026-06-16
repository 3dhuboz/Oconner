import { Hono } from 'hono';
import { notifyCustomer } from './push';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, gte, and, sql, or, isNull, inArray } from 'drizzle-orm';
import { deliveryDays, orders, stops, notifications, subscriptions, customers, users, deliveryRuns, products, deliveryDayStock, auditLog } from '@butcher/db';
import { deductStock, getStockDayId } from '../lib/stock';
import { sendEmail, buildOrderEmail, getSubject, buildBroadcastEmail } from '../lib/email';
import { sendSms } from '../lib/sms';
import { formatBrisbaneDate, formatBrisbaneTime } from '../lib/time';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming, withStock } = c.req.query();
  let rows;
  if (upcoming === 'true') {
    const now = Date.now();
    rows = await db.select().from(deliveryDays)
      .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, now)))
      .orderBy(asc(deliveryDays.date));
  } else {
    rows = await db.select().from(deliveryDays).orderBy(asc(deliveryDays.date));
  }

  // Attach stock availability per day if requested (for checkout filtering)
  if (withStock === 'true') {
    const allStock = await db.select().from(deliveryDayStock);
    const result = rows.map((day) => {
      const effectiveId = (day as any).stockPoolId ?? day.id;
      const dayStock = allStock.filter((s) => s.deliveryDayId === effectiveId && s.allocated > 0);
      const available = dayStock.map((s) => ({
        productId: s.productId,
        remaining: s.allocated - s.sold,
      }));
      return { ...day, stockAvailability: available };
    });
    return c.json(result);
  }

  return c.json(rows);
});

app.get('/today', async (c) => {
  const db = drizzle(c.env.DB);
  // Compute "today" in Brisbane (AEST = UTC+10, no DST in QLD). Workers run in UTC.
  const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
  const nowBrisbaneMs = Date.now() + BRISBANE_OFFSET_MS;
  const brisbaneDay = new Date(nowBrisbaneMs);
  brisbaneDay.setUTCHours(0, 0, 0, 0);
  const todayStartMs = brisbaneDay.getTime() - BRISBANE_OFFSET_MS; // Brisbane 00:00 expressed in UTC ms
  const todayEndMs = todayStartMs + 24 * 60 * 60 * 1000;
  const { lt } = await import('drizzle-orm');
  const [day] = await db.select().from(deliveryDays)
    .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, todayStartMs), lt(deliveryDays.date, todayEndMs)))
    .limit(1);
  if (!day) return c.json({ error: 'No delivery day today' }, 404);
  return c.json(day);
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, c.req.param('id'))).limit(1);
  if (!day) return c.json({ error: 'Not found' }, 404);
  return c.json(day);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Omit<typeof deliveryDays.$inferInsert, 'id' | 'createdAt'>>();
  const id = crypto.randomUUID();
  const now = Date.now();
  const dateObj = new Date(body.date);
  // cutoffTime defaults to midnight the day before delivery (24hr before)
  const cutoffTime = body.cutoffTime ?? (body.date - 24 * 60 * 60 * 1000);
  const dayOfWeek = body.dayOfWeek ?? dateObj.getDay();
  await db.insert(deliveryDays).values({ ...body, id, dayOfWeek, cutoffTime, createdAt: now });
  return c.json({ id }, 201);
});

app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  await db.update(deliveryDays).set({ active: false }).where(eq(deliveryDays.id, c.req.param('id')));
  return c.json({ ok: true });
});

async function geocodeAddress(address: { line1: string; suburb: string; postcode: string }): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address.line1}, ${address.suburb}, ${address.postcode}, Queensland, Australia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=au`, {
      headers: { 'User-Agent': "OConnorAgriculture/1.0 (orders@oconnoragriculture.com.au)" },
    });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

async function geocodeFreeformAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const clean = address.trim();
  if (!clean) return null;
  try {
    const q = encodeURIComponent(`${clean}, Queensland, Australia`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&countrycodes=au`, {
      headers: { 'User-Agent': "OConnorAgriculture/1.0 (orders@oconnoragriculture.com.au)" },
    });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function orderItemQty(item: { weight?: number; weightKg?: number; quantity?: number }): number {
  const qty = item.weight ? item.weight / 1000 : (item.weightKg ?? item.quantity ?? 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

function buildStockPaymentBreakdown(dayOrders: Array<typeof orders.$inferSelect>) {
  const breakdown = new Map<string, { paid: number; awaitingPayment: number; cancelled: number; other: number }>();
  const ensure = (productId: string) => {
    const existing = breakdown.get(productId);
    if (existing) return existing;
    const next = { paid: 0, awaitingPayment: 0, cancelled: 0, other: 0 };
    breakdown.set(productId, next);
    return next;
  };

  for (const order of dayOrders) {
    let items: Array<{ productId?: string; weight?: number; weightKg?: number; quantity?: number }> = [];
    try {
      items = JSON.parse(order.items) as typeof items;
    } catch {
      continue;
    }

    const paymentStatus = order.paymentStatus ?? '';
    const orderStatus = order.status ?? '';
    const isCancelled = ['cancelled', 'refunded', 'failed'].includes(orderStatus) || ['cancelled', 'refunded', 'failed'].includes(paymentStatus);
    const isPaid = paymentStatus === 'paid' && !isCancelled;
    const isAwaiting = !isCancelled && (
      ['pending_payment', 'awaiting_payment', 'invoice_sent', 'payment_failed'].includes(paymentStatus)
      || ['pending_payment'].includes(orderStatus)
    );

    for (const item of items) {
      if (!item.productId) continue;
      const qty = orderItemQty(item);
      if (qty <= 0) continue;
      const row = ensure(item.productId);
      if (isPaid) row.paid += qty;
      else if (isAwaiting) row.awaitingPayment += qty;
      else if (isCancelled) row.cancelled += qty;
      else row.other += qty;
    }
  }

  return breakdown;
}

app.patch('/:id/route-endpoints', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json<{ routeStartAddress?: string | null; routeFinishAddress?: string | null }>();
  const routeStartAddress = body.routeStartAddress?.trim() || null;
  const routeFinishAddress = body.routeFinishAddress?.trim() || null;

  const startGeo = routeStartAddress ? await geocodeFreeformAddress(routeStartAddress) : null;
  const finishGeo = routeFinishAddress ? await geocodeFreeformAddress(routeFinishAddress) : null;

  if (routeStartAddress && !startGeo) return c.json({ error: 'Could not find the start address' }, 400);
  if (routeFinishAddress && !finishGeo) return c.json({ error: 'Could not find the finish address' }, 400);

  await db.update(deliveryDays).set({
    routeStartAddress,
    routeStartLat: startGeo?.lat ?? null,
    routeStartLng: startGeo?.lng ?? null,
    routeFinishAddress,
    routeFinishLat: finishGeo?.lat ?? null,
    routeFinishLng: finishGeo?.lng ?? null,
  }).where(eq(deliveryDays.id, id));

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, id)).limit(1);
  return c.json(day);
});

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Partial<typeof deliveryDays.$inferInsert>>();
  await db.update(deliveryDays).set(body).where(eq(deliveryDays.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.post('/:id/generate-stops', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');

  // ── Auto-generate subscription orders for this delivery day ──
  const now = Date.now();
  const FREQ_MS: Record<string, number> = {
    weekly: 7 * 24 * 60 * 60 * 1000,
    fortnightly: 14 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  // Get this delivery day's date to check if subs are due BY this date
  const [thisDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  const deliveryDate = thisDay?.date ?? now;

  const activeSubs = await db.select().from(subscriptions)
    .where(eq(subscriptions.status, 'active'));

  // Check which customers already have subscription orders on this delivery day
  const existingOrders = await db.select({ customerId: orders.customerId, notes: orders.notes })
    .from(orders).where(eq(orders.deliveryDayId, dayId));
  const subsWithOrders = new Set(
    existingOrders.filter(o => o.notes && o.notes.startsWith('Subscription:')).map(o => o.customerId)
  );

  for (const sub of activeSubs) {
    const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
    const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;
    const nextDueDate = lastGenerated + interval;

    // Create order if delivery day date is on or after the sub's next due date (with 20% grace)
    if (deliveryDate < nextDueDate - interval * 0.2) continue;

    let customerId = sub.customerId;
    if (!customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
      if (!cust) continue;
      customerId = cust.id;
    }

    // Skip if this customer already has a subscription order on this delivery day
    if (subsWithOrders.has(customerId)) continue;

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) continue;

    let address = { line1: '', line2: '', suburb: '', state: 'QLD', postcode: '' };
    try {
      const addresses = JSON.parse(customer.addresses ?? '[]') as Array<typeof address>;
      if (addresses.length > 0) address = addresses[0];
    } catch {}
    // Fallback: get address from customer's most recent order
    if (!address.line1) {
      const { desc: descOrd } = await import('drizzle-orm');
      const [lastOrder] = await db.select().from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(descOrd(orders.createdAt)).limit(1);
      if (lastOrder) {
        try { address = JSON.parse(lastOrder.deliveryAddress) as typeof address; } catch {}
      }
    }
    if (!address.line1) continue;

    const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
    const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;

    // Look up product price — try exact ID, then prod-{name}-box pattern, then name match
    const { like } = await import('drizzle-orm');
    let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
    if (!boxProduct) {
      [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
    }
    if (!boxProduct) {
      [boxProduct] = await db.select().from(products).where(like(products.name, `%${boxName.replace(' Box', '')}%Box%`)).limit(1);
    }
    const price = boxProduct?.fixedPrice ?? 0;
    if (!price) continue;

    // PREVIOUSLY: this inlined db.insert(orders) with a hardcoded
    // `paymentStatus: 'paid'` — same fake-paid bug as the cron path.
    // NOW: use the shared helper so payment status reflects reality
    // (auto-charge saved card if available, else pending_payment).
    // Do not force this onto the manifest. If Square cannot auto-charge a
    // saved card, the helper leaves the order pending until payment is
    // confirmed or admin deliberately marks it paid.
    const resolvedBoxId = boxProduct.id!;
    const { createSubscriptionOrder } = await import('../lib/subscriptions');
    const orderId = await createSubscriptionOrder(db, {
      customerId,
      email: sub.email,
      name: customer.name ?? sub.email,
      phone: customer.phone ?? '',
      address,
      boxId: resolvedBoxId,
      boxName,
      frequency: sub.frequency,
      price,
      subscriptionId: sub.id,
      now,
      env: c.env,
      deliveryDayId: dayId,
    });
    if (!orderId) continue;

    // Mark subscription as generated
    const updateData: Record<string, unknown> = { lastOrderGeneratedAt: now, updatedAt: now };
    if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
    await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
  }

  // Now generate stops from all orders (including just-created subscription orders).
  // Filter out orders we shouldn't be planning a stop for:
  //   - pending_payment: customer hasn't finished checkout; if they bail, we'd
  //     leave a phantom stop on the manifest (happened to Jo Sharp).
  //   - cancelled / refunded: order is dead.
  //   - delivered: already done; creating a new stop would resurrect it.
  // out_for_delivery and packed are intentionally allowed — the stop should
  // already exist for those, but if for some reason it's missing we want
  // generate-stops to recreate it rather than silently skip.
  const DELIVERABLE_STATUSES = new Set([
    'confirmed', 'preparing', 'packed', 'out_for_delivery',
  ]);
  const FULFILLABLE_PAYMENT_STATUSES = new Set(['paid']);
  const dayOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const existingStops = await db.select({ orderId: stops.orderId }).from(stops).where(eq(stops.deliveryDayId, dayId));
  const existingOrderIds = new Set(existingStops.map((s) => s.orderId));

  let created = 0;
  for (const order of dayOrders) {
    if (existingOrderIds.has(order.id)) continue;
    if (!DELIVERABLE_STATUSES.has(order.status)) continue;
    if (!FULFILLABLE_PAYMENT_STATUSES.has(order.paymentStatus)) continue;
    const addr = JSON.parse(order.deliveryAddress) as { line1: string; suburb: string; postcode: string };
    const geo = await geocodeAddress(addr);
    await db.insert(stops).values({
      id: crypto.randomUUID(),
      deliveryDayId: dayId,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? '',
      address: order.deliveryAddress,
      items: order.items,
      sequence: created,
      status: 'pending',
      customerNote: order.notes ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      createdAt: Date.now(),
    });
    created++;
    if (created < dayOrders.length) await new Promise((r) => setTimeout(r, 1100));
  }

  // ── Auto-create delivery runs from driver zone assignments ──
  const existingRuns = await db.select().from(deliveryRuns).where(eq(deliveryRuns.deliveryDayId, dayId));
  if (existingRuns.length === 0) {
    // Only auto-create if no runs exist yet for this day
    // Include users with role='driver' or any user with canDrive=true.
    const activeDrivers = await db.select().from(users)
      .where(and(
        or(eq(users.role, 'driver'), eq(users.canDrive, true)),
        eq(users.active, true),
      ));

    const RUN_COLORS = ['#1B3A2E', '#4E7732', '#2563EB', '#7C3AED', '#DC2626', '#EA580C', '#0891B2', '#BE185D'];
    let runSeq = 0;

    // Get all stops for this day to assign
    const allDayStops = await db.select().from(stops).where(eq(stops.deliveryDayId, dayId));

    for (const driver of activeDrivers) {
      const driverZones: string[] = (() => {
        try { return JSON.parse(driver.zones ?? '[]') as string[]; } catch { return []; }
      })();
      if (driverZones.length === 0) continue;

      // Find stops matching this driver's zones
      const matchingStopIds: string[] = [];
      for (const stop of allDayStops) {
        if (stop.runId) continue; // already assigned
        try {
          const addr = JSON.parse(stop.address) as { postcode?: string };
          if (addr.postcode && driverZones.some((z) => addr.postcode!.startsWith(z))) {
            matchingStopIds.push(stop.id);
          }
        } catch {}
      }

      if (matchingStopIds.length === 0) continue;

      // Create a run for this driver
      const runId = crypto.randomUUID();
      await db.insert(deliveryRuns).values({
        id: runId,
        deliveryDayId: dayId,
        name: driver.name || driver.email,
        zone: driverZones.join(', '),
        color: RUN_COLORS[runSeq % RUN_COLORS.length],
        driverUid: driver.id,
        status: 'pending',
        sequence: runSeq++,
        createdAt: Date.now(),
      });

      // Assign matching stops to this run
      for (const stopId of matchingStopIds) {
        await db.update(stops).set({ runId }).where(eq(stops.id, stopId));
        // Mark as assigned in allDayStops so other drivers don't claim them
        const idx = allDayStops.findIndex((s) => s.id === stopId);
        if (idx >= 0) allDayStops[idx] = { ...allDayStops[idx], runId };
      }
    }

    const stillUnassigned = allDayStops.filter((stop) => !stop.runId);
    if (runSeq === 0 && activeDrivers.length === 1 && stillUnassigned.length > 0) {
      const driver = activeDrivers[0];
      const runId = crypto.randomUUID();
      await db.insert(deliveryRuns).values({
        id: runId,
        deliveryDayId: dayId,
        name: driver.name || driver.email || 'Delivery Run',
        zone: 'All stops',
        color: RUN_COLORS[0],
        driverUid: driver.id,
        status: 'pending',
        sequence: 0,
        notes: 'Auto-created for single active driver with no zone split.',
        createdAt: Date.now(),
      });
      await db.update(stops)
        .set({ runId })
        .where(and(eq(stops.deliveryDayId, dayId), or(isNull(stops.runId), eq(stops.runId, ''))));
      await db.update(deliveryDays).set({
        driverUid: driver.id,
        routeGenerated: true,
        routeGeneratedAt: Date.now(),
      }).where(eq(deliveryDays.id, dayId));
    }
  } else if (existingRuns.length === 1) {
    await db.update(stops)
      .set({ runId: existingRuns[0].id })
      .where(and(eq(stops.deliveryDayId, dayId), or(isNull(stops.runId), eq(stops.runId, ''))));
  }

  return c.json({ created, total: dayOrders.length });
});

app.post('/:id/geocode-stops', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');
  const { isNull } = await import('drizzle-orm');
  const ungeocoded = await db.select().from(stops)
    .where(and(eq(stops.deliveryDayId, dayId), isNull(stops.lat)));
  let updated = 0;
  for (const stop of ungeocoded) {
    const addr = JSON.parse(stop.address) as { line1: string; suburb: string; postcode: string };
    const geo = await geocodeAddress(addr);
    if (geo) {
      await db.update(stops).set({ lat: geo.lat, lng: geo.lng }).where(eq(stops.id, stop.id));
      updated++;
    }
    if (updated < ungeocoded.length) await new Promise((r) => setTimeout(r, 1100));
  }
  return c.json({ updated, total: ungeocoded.length });
});

app.post('/:id/send-reminders', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: 'Not found' }, 404);

  // Send to all active orders (not cancelled/refunded/delivered, and not
  // pending_payment — those are abandoned checkouts that haven't paid yet,
  // emailing them tomorrow-delivery confirmations is misleading).
  const allOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const pendingOrders = allOrders.filter((o) => !['cancelled', 'refunded', 'delivered', 'pending_payment'].includes(o.status));
  const allStops = await db.select().from(stops).where(eq(stops.deliveryDayId, dayId));

  // Brisbane TZ — Workers run in UTC, so naive toLocaleDateString / getHours
  // were rendering as UTC (off by 10h). Customers saw "between 2am and 4am"
  // for a noon Brisbane window. Always format via the helpers in lib/time.
  const dateLabel = formatBrisbaneDate(day.date);
  let sent = 0;

  for (const order of pendingOrders) {
    // Find the stop's estimated arrival to build a ±1hr window
    const stop = allStops.find((s) => s.orderId === order.id);
    let timeWindowText = '';
    if (stop?.estimatedArrival) {
      const eta = stop.estimatedArrival;
      const windowStart = formatBrisbaneTime(eta - 60 * 60 * 1000); // 1 hour before
      const windowEnd = formatBrisbaneTime(eta + 60 * 60 * 1000);   // 1 hour after
      timeWindowText = ` We expect to arrive between <strong>${windowStart} and ${windowEnd}</strong>. Please ensure someone is home during this window.`;
    }

    const emailData = {
      customerName: order.customerName,
      orderId: order.id,
      orderItems: JSON.parse(order.items) as Array<{ productName: string; lineTotal: number }>,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      gst: order.gst,
      total: order.total,
      deliveryDate: dateLabel,
      deliveryAddress: order.deliveryAddress,
      trackingUrl: `${c.env.STOREFRONT_URL}/track/${order.id}`,
      timeWindow: timeWindowText,
    };
    const result = await sendEmail({
      apiKey: c.env.RESEND_API_KEY,
      from: c.env.FROM_EMAIL,
      to: order.customerEmail,
      subject: getSubject('day_before', emailData),
      html: buildOrderEmail('day_before', emailData),
    });
    if (result) sent++;
    await notifyCustomer(db, order.customerId, {
      title: "O'Connor — Delivery Tomorrow",
      body: stop?.estimatedArrival
        ? `Your delivery is scheduled for tomorrow ${dateLabel}. Expected arrival between ${formatBrisbaneTime(stop.estimatedArrival - 3600000)} and ${formatBrisbaneTime(stop.estimatedArrival + 3600000)}. Please ensure someone is home.`
        : `Your order is on its way ${dateLabel}. Check your order summary for details.`,
      url: `${c.env.STOREFRONT_URL}/track/${order.id}`,
    }, c.env);
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      orderId: order.id,
      customerId: order.customerId,
      type: 'day_before',
      status: result ? 'sent' : 'failed',
      recipientEmail: order.customerEmail,
      resendId: result?.id ?? null,
      sentAt: Date.now(),
    });
  }

  return c.json({ sent, total: pendingOrders.length });
});

/**
 * Send a custom broadcast (SMS + email) to every active stop on a delivery day.
 *
 * Used by Seamus when the canned "delivery tomorrow" template doesn't cover
 * the situation — e.g. truck breakdown, running late, weather cancellation.
 * SMS hits every stop with a phone number (including manual stops without an
 * order). Email goes to the order's customerEmail when present. Push notifies
 * customers who have an account.
 *
 * Each send is recorded to the notifications table with a distinct type so
 * we can audit broadcasts separately from automated emails.
 */
app.post('/:id/broadcast', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');
  const body = await c.req.json<{ subject?: string; message: string }>();
  const message = (body.message ?? '').trim();
  if (!message) return c.json({ error: 'Message is required' }, 400);
  const subject = (body.subject ?? '').trim() || "Update from O'Connor Agriculture";

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: 'Not found' }, 404);

  const allStops = await db.select().from(stops).where(eq(stops.deliveryDayId, dayId));
  const allOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const ordersById = new Map(allOrders.map((o) => [o.id, o]));

  let smsSent = 0, smsFailed = 0, emailSent = 0, emailFailed = 0;
  const now = Date.now();

  for (const stop of allStops) {
    const order = stop.orderId ? ordersById.get(stop.orderId) ?? null : null;
    // Skip stops whose order is cancelled / refunded / already delivered or
    // never paid — there's no point messaging someone whose run today is done
    // or void, or who never finished checkout.
    if (order && ['cancelled', 'refunded', 'delivered', 'pending_payment'].includes(order.status)) continue;

    const recipientName = stop.customerName ?? order?.customerName ?? 'there';
    const recipientPhone = stop.customerPhone || order?.customerPhone || '';
    const recipientEmail = order?.customerEmail ?? '';

    // SMS — fast and reaches everyone (including manual stops)
    if (recipientPhone) {
      const smsBody = `O'Connor Agriculture: ${message}`;
      const smsResult = await sendSms(c.env, recipientPhone, smsBody);
      if (smsResult.ok) smsSent++; else smsFailed++;
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        orderId: order?.id ?? null,
        customerId: order?.customerId ?? null,
        type: 'admin_broadcast_sms',
        status: smsResult.ok ? 'sent' : 'failed',
        // notifications.recipientEmail is NOT NULL. For SMS-only sends we
        // store the phone number here so the audit row still has a recipient.
        recipientEmail: recipientEmail || recipientPhone,
        error: smsResult.ok ? null : (smsResult.error ?? 'sms send failed'),
        sentAt: now,
      });
    }

    // Email — only for stops with a linked order (manual stops don't have email)
    if (recipientEmail) {
      const result = await sendEmail({
        apiKey: c.env.RESEND_API_KEY,
        from: c.env.FROM_EMAIL,
        to: recipientEmail,
        subject,
        html: buildBroadcastEmail({
          customerName: recipientName,
          message,
          ctaUrl: order ? `${c.env.STOREFRONT_URL}/track/${order.id}` : undefined,
          ctaText: order ? 'Track my order' : undefined,
        }),
      });
      if (result) emailSent++; else emailFailed++;
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        orderId: order?.id ?? null,
        customerId: order?.customerId ?? null,
        type: 'admin_broadcast_email',
        status: result ? 'sent' : 'failed',
        recipientEmail,
        resendId: result?.id ?? null,
        sentAt: now,
      });
    }

    // Push — best-effort, swallows errors so one bad subscription doesn't
    // tank the rest of the broadcast loop.
    if (order?.customerId) {
      try {
        await notifyCustomer(db, order.customerId, {
          title: subject,
          body: message,
          url: `${c.env.STOREFRONT_URL}/track/${order.id}`,
        }, c.env);
      } catch {
        // ignore — SMS / email already covered audit + delivery
      }
    }
  }

  return c.json({
    sms: { sent: smsSent, failed: smsFailed },
    email: { sent: emailSent, failed: emailFailed },
    totalStops: allStops.length,
  });
});

// ── Delivery Day Stock Allocations ───────────────────────────────────────────

app.get('/:id/stock', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');
  const stockDayId = await getStockDayId(db, dayId);
  const rows = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));

  // Find sibling days sharing this pool
  const poolDays = stockDayId !== dayId
    ? await db.select({ id: deliveryDays.id, date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.stockPoolId, stockDayId))
    : await db.select({ id: deliveryDays.id, date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.stockPoolId, dayId));

  // Include the source day itself in the pool list
  if (stockDayId !== dayId) {
    const [source] = await db.select({ id: deliveryDays.id, date: deliveryDays.date }).from(deliveryDays).where(eq(deliveryDays.id, stockDayId)).limit(1);
    if (source) poolDays.unshift(source);
  }

  const poolDayIds = [...new Set([stockDayId, ...poolDays.map((d) => d.id)])];
  const dayOrders = poolDayIds.length > 0
    ? await db.select().from(orders).where(inArray(orders.deliveryDayId, poolDayIds))
    : [];
  const breakdown = buildStockPaymentBreakdown(dayOrders);
  const allocations = rows.map((row) => {
    const productBreakdown = breakdown.get(row.productId) ?? { paid: 0, awaitingPayment: 0, cancelled: 0, other: 0 };
    return {
      ...row,
      paidSold: productBreakdown.paid,
      awaitingPayment: productBreakdown.awaitingPayment,
      cancelledQty: productBreakdown.cancelled,
      otherQty: productBreakdown.other,
    };
  });

  return c.json({ allocations, poolSourceId: stockDayId !== dayId ? stockDayId : null, poolDays: poolDays.length > 0 ? poolDays : undefined });
});

app.put('/:id/stock', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');
  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: 'Delivery day not found' }, 404);

  const stockDayId = day.stockPoolId ?? day.id;
  if (day.stockPoolId) {
    const [stockSource] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, stockDayId)).limit(1);
    if (!stockSource) {
      return c.json({ error: 'This delivery day is linked to a missing stock pool. Unlink and relink the delivery days, then save again.' }, 400);
    }
  }

  let body: { allocations?: Array<{ productId?: unknown; productName?: unknown; allocated?: unknown }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Stock allocation request was not valid JSON' }, 400);
  }
  if (!Array.isArray(body.allocations)) {
    return c.json({ error: 'Stock allocation request is missing allocations' }, 400);
  }
  const now = Date.now();

  // Preserve existing sold counts when updating allocations
  const existing = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));
  const soldMap = new Map(existing.map((e) => [e.productId, e.sold]));
  const productRows = await db.select({ id: products.id, name: products.name }).from(products);
  const productsById = new Map(productRows.map((p) => [p.id, p]));

  const seenProductIds = new Set<string>();
  const values: Array<{
    id: string;
    deliveryDayId: string;
    productId: string;
    productName: string;
    allocated: number;
    sold: number;
    createdAt: number;
  }> = [];

  for (const raw of body.allocations) {
    const productId = typeof raw.productId === 'string' ? raw.productId.trim() : '';
    const allocated = Number(raw.allocated);
    if (!productId) return c.json({ error: 'Each stock allocation needs a product' }, 400);
    if (seenProductIds.has(productId)) return c.json({ error: `Duplicate product allocation for ${productId}` }, 400);
    seenProductIds.add(productId);
    if (!Number.isFinite(allocated) || allocated < 0) {
      return c.json({ error: 'Stock allocations must be zero or above' }, 400);
    }

    const product = productsById.get(productId);
    if (!product) return c.json({ error: `Product ${productId} no longer exists. Refresh products and try again.` }, 400);

    const sold = soldMap.get(productId) ?? 0;
    if (allocated < sold) {
      return c.json({ error: `Allocation for ${product.name} cannot be below ${sold} already sold.` }, 400);
    }

    if (allocated > 0) {
      const providedName = typeof raw.productName === 'string' ? raw.productName.trim() : '';
      values.push({
        id: crypto.randomUUID(),
        deliveryDayId: stockDayId,
        productId,
        productName: providedName || product.name,
        allocated,
        sold,
        createdAt: now,
      });
    }
  }

  for (const existingRow of existing) {
    if (existingRow.sold > 0 && !seenProductIds.has(existingRow.productId)) {
      return c.json({
        error: `Cannot remove ${existingRow.productName} because ${existingRow.sold} has already sold. Leave its allocation at ${existingRow.sold} or higher.`,
      }, 400);
    }
  }

  const statements = [
    c.env.DB.prepare('DELETE FROM delivery_day_stock WHERE delivery_day_id = ?').bind(stockDayId),
    ...values.map((v) => c.env.DB.prepare(
      'INSERT INTO delivery_day_stock (id, delivery_day_id, product_id, product_name, allocated, sold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(v.id, v.deliveryDayId, v.productId, v.productName, v.allocated, v.sold, v.createdAt)),
  ];

  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    console.error('Failed to save stock allocations', { dayId, stockDayId, error });
    return c.json({ error: 'Could not save stock allocations. Please try again.' }, 500);
  }

  return c.json({ ok: true, saved: values.length, stockDayId });
});

// ── Stock Pool Management ───────────────────────────────────────────────────

app.put('/:id/stock-pool', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');
  const { poolSourceId } = await c.req.json<{ poolSourceId: string | null }>();

  if (poolSourceId) {
    // Validate source exists and is not itself pooled (no chaining)
    const [source] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, poolSourceId)).limit(1);
    if (!source) return c.json({ error: 'Source day not found' }, 404);
    if ((source as any).stockPoolId) return c.json({ error: 'Cannot chain pools — source day is already linked to another pool' }, 400);
    if (poolSourceId === dayId) return c.json({ error: 'Cannot link a day to itself' }, 400);
  }

  // Capture any allocations that were sitting on this day BEFORE we link it to a
  // pool. These would otherwise be orphaned — invisible to the UI (which reads
  // through the pool source) but still in the DB. That's how this week's run
  // ended up with Seamus seeing fewer products than he'd configured.
  // We migrate them into the pool source on link, and copy them down on unlink.
  let migratedSummary: { added: string[]; merged: string[]; orphansDeleted: number; copiedDown?: number } | undefined;

  // If we're UNLINKING (poolSourceId === null) and the day was previously
  // pooled, copy the pool's current allocations down onto this day so the
  // admin doesn't end up with an empty day. Use sold=0 because the day is
  // newly-independent — its sold counter starts fresh.
  const [currentDay] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (poolSourceId === null && currentDay?.stockPoolId) {
    const poolRows = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, currentDay.stockPoolId));
    if (poolRows.length > 0) {
      // Don't double-write if the day already has its own rows somehow.
      const existingOnDay = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
      if (existingOnDay.length === 0) {
        await db.insert(deliveryDayStock).values(poolRows.map((r) => ({
          id: crypto.randomUUID(),
          deliveryDayId: dayId,
          productId: r.productId,
          productName: r.productName,
          allocated: r.allocated,
          sold: 0,
          createdAt: Date.now(),
        })));
        migratedSummary = { added: [], merged: [], orphansDeleted: 0, copiedDown: poolRows.length };
      }
    }
  }

  if (poolSourceId) {
    const orphans = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
    if (orphans.length > 0) {
      const poolRows = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, poolSourceId));
      const poolByProduct = new Map(poolRows.map((r) => [r.productId, r]));
      const added: string[] = [];
      const merged: string[] = [];
      const now = Date.now();
      for (const orphan of orphans) {
        const existing = poolByProduct.get(orphan.productId);
        if (existing) {
          // Merge: take MAX(allocated) — assume Seamus's most recent intent —
          // and SUM(sold) so already-deducted orders aren't lost.
          const newAlloc = Math.max(existing.allocated, orphan.allocated);
          const newSold = existing.sold + orphan.sold;
          if (newAlloc !== existing.allocated || newSold !== existing.sold) {
            await db.update(deliveryDayStock)
              .set({ allocated: newAlloc, sold: newSold })
              .where(eq(deliveryDayStock.id, existing.id));
            merged.push(orphan.productName);
          }
        } else {
          // Insert into the pool source — preserve the orphan's allocated and sold.
          await db.insert(deliveryDayStock).values({
            id: crypto.randomUUID(),
            deliveryDayId: poolSourceId,
            productId: orphan.productId,
            productName: orphan.productName,
            allocated: orphan.allocated,
            sold: orphan.sold,
            createdAt: now,
          });
          added.push(orphan.productName);
        }
      }
      // Clear the now-redundant orphan rows on this day.
      await db.delete(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
      migratedSummary = { added, merged, orphansDeleted: orphans.length };
    }
  }

  await db.update(deliveryDays).set({ stockPoolId: poolSourceId }).where(eq(deliveryDays.id, dayId));

  // Audit log so future "where did my allocations go" investigations are traceable.
  try {
    const user = c.get('user');
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      action: poolSourceId ? 'link_stock_pool' : 'unlink_stock_pool',
      entity: 'delivery_days',
      entityId: dayId,
      before: JSON.stringify({}),
      after: JSON.stringify({ stockPoolId: poolSourceId, migrated: migratedSummary }),
      adminUid: user?.id ?? null,
      adminEmail: user?.email ?? null,
      timestamp: Date.now(),
    });
  } catch {
    // best-effort
  }

  return c.json({ ok: true, migrated: migratedSummary });
});

// Copy allocations from a previous delivery day
app.post('/:id/stock/copy-from/:sourceId', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');
  const sourceId = c.req.param('sourceId');
  const now = Date.now();

  const source = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, sourceId));
  if (source.length === 0) return c.json({ error: 'No allocations to copy' }, 404);

  // Delete existing for target, insert copies with sold=0
  await db.delete(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));
  const values = source.map((s) => ({
    id: crypto.randomUUID(),
    deliveryDayId: dayId,
    productId: s.productId,
    productName: s.productName,
    allocated: s.allocated,
    sold: 0,
    createdAt: now,
  }));
  await db.insert(deliveryDayStock).values(values);

  return c.json({ copied: values.length });
});

// ── Generate Social Post ─────────────────────────────────────────────────────

app.post('/:id/generate-post', async (c) => {
  const db = drizzle(c.env.DB);
  const dayId = c.req.param('id');

  const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
  if (!day) return c.json({ error: 'Day not found' }, 404);

  // Get stock allocations for this day
  const allocs = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, dayId));

  // Get orders for product info if no allocations
  const dayOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));

  const dateStr = formatBrisbaneDate(day.date, { weekday: 'long', year: 'numeric' });
  const zones = (day as any).zones || '';
  const isPickup = (day as any).type === 'pickup';
  const marketLocation = (day as any).marketLocation || '';

  // Build product list from allocations
  const productList = allocs.length > 0
    ? allocs.filter(a => a.allocated > 0).map(a => `${a.productName} (${a.allocated - a.sold} available)`).join(', ')
    : 'All premium grass fed beef products';

  const spotsLeft = (day.maxOrders ?? 40) - (day.orderCount ?? 0);
  const orderUrl = 'https://oconnoragriculture.com.au/shop';

  const prompt = `You are the social media manager for O'Connor Agriculture, a grass fed beef farm in Central Queensland, Australia. Write an engaging Facebook post for an upcoming ${isPickup ? 'market day' : 'delivery day'}.

Details:
- Date: ${dateStr}
- ${isPickup ? `Market Location: ${marketLocation}` : `Delivery Areas: ${zones}`}
- Products available: ${productList}
- ${spotsLeft} spots remaining
- Order link: ${orderUrl}
- All beef is grass fed and finished with no inputs
- Free delivery on orders over $100

Write a short, punchy Facebook post (max 150 words) that:
1. Creates urgency (limited spots)
2. Mentions the date and areas
3. Highlights 2-3 key products
4. Includes a call to action with the order link
5. Uses a friendly, rural Australian tone
6. Include 2-3 relevant emojis but don't overdo it

Do NOT use hashtags. Just the post text.`;

  try {
    const ai = c.env.AI;
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct' as keyof AiModels, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });

    const postText = (response as any).response ?? '';

    return c.json({
      postText,
      dateStr,
      zones,
      isPickup,
      marketLocation,
      products: allocs.filter(a => a.allocated > 0).map(a => ({ name: a.productName, available: a.allocated - a.sold })),
      spotsLeft,
      orderUrl,
    });
  } catch (err) {
    console.error('AI post generation error:', err);
    // Fallback: return template without AI
    const fallback = isPickup
      ? `🥩 Market Day this ${dateStr}!\n\nCome see us at ${marketLocation}. Fresh grass fed beef — ${productList}.\n\n${spotsLeft} spots left. Order ahead: ${orderUrl}`
      : `🚚 Delivery day coming up — ${dateStr}!\n\nWe're delivering to ${zones}. Fresh grass fed beef — ${productList}.\n\n${spotsLeft} spots remaining. Free delivery over $100!\n\nOrder now: ${orderUrl}`;

    return c.json({
      postText: fallback,
      dateStr,
      zones,
      isPickup,
      marketLocation,
      products: allocs.filter(a => a.allocated > 0).map(a => ({ name: a.productName, available: a.allocated - a.sold })),
      spotsLeft,
      orderUrl,
    });
  }
});

export default app;
