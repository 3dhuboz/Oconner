import { Hono } from 'hono';
import { notifyCustomer } from './push';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, gte, and } from 'drizzle-orm';
import { deliveryDays, orders, stops, notifications, subscriptions, customers, users, deliveryRuns, products } from '@butcher/db';
import { deductStock } from '../lib/stock';
import { sendEmail, buildOrderEmail, getSubject } from '../lib/email';
import type { Env, AuthUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming } = c.req.query();
  let rows;
  if (upcoming === 'true') {
    const now = Date.now();
    rows = await db.select().from(deliveryDays)
      .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, now)))
      .orderBy(asc(deliveryDays.date));
  } else {
    rows = await db.select().from(deliveryDays).orderBy(asc(deliveryDays.date));
  }
  return c.json(rows);
});

app.get('/today', async (c) => {
  const db = drizzle(c.env.DB);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const { lt } = await import('drizzle-orm');
  const [day] = await db.select().from(deliveryDays)
    .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, todayStart.getTime()), lt(deliveryDays.date, todayEnd.getTime())))
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

app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Partial<typeof deliveryDays.$inferInsert>>();
  await db.update(deliveryDays).set(body).where(eq(deliveryDays.id, c.req.param('id')));
  return c.json({ ok: true });
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

    const resolvedBoxId = boxProduct.id!;
    const orderId = crypto.randomUUID();
    const gst = Math.round(price / 11);
    const subtotal = price - gst;
    const item = { productId: resolvedBoxId, productName: boxName, isMeatPack: true, quantity: 1, lineTotal: price };

    await db.insert(orders).values({
      id: orderId,
      customerId,
      customerEmail: sub.email,
      customerName: customer.name ?? sub.email,
      customerPhone: customer.phone ?? '',
      items: JSON.stringify([item]),
      subtotal, deliveryFee: 0, gst, total: price,
      status: 'confirmed',
      deliveryDayId: dayId,
      deliveryAddress: JSON.stringify(address),
      postcodeZone: '',
      paymentIntentId: '',
      paymentProvider: 'square',
      paymentStatus: 'paid',
      notes: `Subscription: ${boxName} (${sub.frequency})`,
      createdAt: now, updatedAt: now,
    });

    await deductStock(db, [item], orderId, now);

    // Update delivery day order count
    const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, dayId)).limit(1);
    if (day) await db.update(deliveryDays).set({ orderCount: day.orderCount + 1 }).where(eq(deliveryDays.id, dayId));

    // Update customer stats
    await db.update(customers).set({
      orderCount: customer.orderCount + 1,
      totalSpent: customer.totalSpent + price,
      updatedAt: now,
    }).where(eq(customers.id, customerId));

    // Mark subscription as generated
    const updateData: Record<string, unknown> = { lastOrderGeneratedAt: now, updatedAt: now };
    if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
    await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
  }

  // Now generate stops from all orders (including just-created subscription orders)
  const dayOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const existingStops = await db.select({ orderId: stops.orderId }).from(stops).where(eq(stops.deliveryDayId, dayId));
  const existingOrderIds = new Set(existingStops.map((s) => s.orderId));

  let created = 0;
  for (const order of dayOrders) {
    if (existingOrderIds.has(order.id)) continue;
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
    const activeDrivers = await db.select().from(users)
      .where(and(eq(users.role, 'driver'), eq(users.active, true)));

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

  // Send to all active orders (not cancelled/refunded/delivered)
  const allOrders = await db.select().from(orders).where(eq(orders.deliveryDayId, dayId));
  const pendingOrders = allOrders.filter((o) => !['cancelled', 'refunded', 'delivered'].includes(o.status));

  const dateLabel = new Date(day.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  let sent = 0;

  for (const order of pendingOrders) {
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
      body: `Your order is on its way ${dateLabel}. Check your order summary for details.`,
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

export default app;
