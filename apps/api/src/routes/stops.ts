import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, asc, and, isNull, gt, inArray, ne } from 'drizzle-orm';
import { stops, orders, driverSessions, notifications } from '@butcher/db';
import { notifyCustomer } from './push';
import { sendSms } from '../lib/sms';
import { parseJson } from '../lib/json';
import type { Env, AuthUser } from '../types';

/** True if we've already recorded a successful notification of this (orderId,type). Used to dedupe SMS across undo/redo. */
async function alreadySent(db: ReturnType<typeof drizzle>, orderId: string, type: string): Promise<boolean> {
  const [row] = await db.select().from(notifications)
    .where(and(eq(notifications.orderId, orderId), eq(notifications.type, type), eq(notifications.status, 'sent')))
    .limit(1);
  return !!row;
}

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();
const ACTIVE_STOP_STATUSES = ['en_route', 'arrived'];

function serializeStop(
  stop: typeof stops.$inferSelect,
  order?: typeof orders.$inferSelect | null,
) {
  return {
    ...stop,
    address: parseJson<Record<string, string>>(stop.address, {}),
    items: parseJson<unknown[]>(stop.items, []),
    orderTotal: order?.total,
    orderPaymentStatus: order?.paymentStatus,
    orderPaymentProvider: order?.paymentProvider,
    orderPaymentIntentId: order?.paymentIntentId,
  };
}

async function attachOrderPaymentDetails(
  db: ReturnType<typeof drizzle>,
  rows: Array<typeof stops.$inferSelect>,
) {
  const orderIds = [...new Set(rows.map((s) => s.orderId).filter((id): id is string => Boolean(id)))];
  if (orderIds.length === 0) return rows.map((s) => serializeStop(s));

  const orderRows = await db.select().from(orders).where(inArray(orders.id, orderIds));
  const byId = new Map(orderRows.map((order) => [order.id, order]));
  return rows.map((s) => serializeStop(s, s.orderId ? byId.get(s.orderId) : null));
}

async function hasOtherActiveStop(
  db: ReturnType<typeof drizzle>,
  deliveryDayId: string,
  stopId: string,
) {
  const rows = await db.select({ id: stops.id }).from(stops)
    .where(and(
      eq(stops.deliveryDayId, deliveryDayId),
      ne(stops.id, stopId),
      inArray(stops.status, ACTIVE_STOP_STATUSES),
    ))
    .limit(1);
  return rows.length > 0;
}

async function clearOtherActiveStops(
  db: ReturnType<typeof drizzle>,
  deliveryDayId: string,
  stopId: string,
  now = Date.now(),
) {
  const rows = await db.select({ id: stops.id, orderId: stops.orderId }).from(stops)
    .where(and(
      eq(stops.deliveryDayId, deliveryDayId),
      ne(stops.id, stopId),
      inArray(stops.status, ACTIVE_STOP_STATUSES),
    ));
  if (rows.length === 0) return;

  await db.update(stops)
    .set({ status: 'pending' })
    .where(inArray(stops.id, rows.map((s) => s.id)));

  const orderIds = rows.map((s) => s.orderId).filter((id): id is string => Boolean(id));
  if (orderIds.length === 0) return;

  await db.update(orders)
    .set({ status: 'confirmed', updatedAt: now })
    .where(and(
      inArray(orders.id, orderIds),
      eq(orders.status, 'out_for_delivery'),
    ));
}

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const { deliveryDayId, runId, unassigned } = c.req.query();
  if (!deliveryDayId && !runId) return c.json({ error: 'deliveryDayId or runId required' }, 400);

  let condition;
  if (runId) {
    condition = eq(stops.runId, runId);
  } else if (unassigned === 'true') {
    condition = and(eq(stops.deliveryDayId, deliveryDayId!), isNull(stops.runId));
  } else {
    condition = eq(stops.deliveryDayId, deliveryDayId!);
  }

  const rows = await db.select().from(stops)
    .where(condition)
    .orderBy(asc(stops.sequence));
  return c.json(await attachOrderPaymentDetails(db, rows));
});

app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [stop] = await db.select().from(stops).where(eq(stops.id, c.req.param('id'))).limit(1);
  if (!stop) return c.json({ error: 'Not found' }, 404);
  const [serialized] = await attachOrderPaymentDetails(db, [stop]);
  return c.json(serialized);
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof stops.$inferInsert & { address: object; items: object[] }>();
  const id = crypto.randomUUID();
  const isManual = !body.orderId || String(body.orderId).startsWith('manual');

  await db.insert(stops).values({
    ...body,
    id,
    orderId: isManual ? null : body.orderId,
    customerId: isManual ? null : body.customerId,
    address: JSON.stringify(body.address ?? {}),
    items: JSON.stringify(body.items ?? []),
    createdAt: Date.now(),
  });

  return c.json({ id }, 201);
});

// Edit a stop's customer-facing details. Primarily used by the manifest's
// "Edit Manual Stop" flow — manual stops can't be edited via OrderDetail
// because they have no linked order. We null out lat/lng on address change
// so the next /geocode-stops sweep refreshes coordinates for the map.
app.patch('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const stopId = c.req.param('id');
  const body = await c.req.json<{
    customerName?: string;
    customerPhone?: string;
    customerNote?: string;
    address?: object;
  }>();
  const patch: Partial<typeof stops.$inferInsert> = {};
  if (body.customerName !== undefined) patch.customerName = body.customerName;
  if (body.customerPhone !== undefined) patch.customerPhone = body.customerPhone;
  if (body.customerNote !== undefined) patch.customerNote = body.customerNote;
  if (body.address !== undefined) {
    patch.address = JSON.stringify(body.address);
    patch.lat = null;
    patch.lng = null;
  }
  if (Object.keys(patch).length === 0) return c.json({ ok: true });
  await db.update(stops).set(patch).where(eq(stops.id, stopId));
  return c.json({ ok: true });
});

// Delete a stop. Used by manual-stop "Delete" button — for order-linked
// stops the admin should cancel the underlying order instead (which can
// then be regenerated into a stop on a different day).
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  await db.delete(stops).where(eq(stops.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.patch('/:id/status', async (c) => {
  const db = drizzle(c.env.DB);
  const { status, driverNote, flagReason, proofUrl } = await c.req.json<{
    status: string;
    driverNote?: string;
    flagReason?: string;
    proofUrl?: string;
  }>();
  const stopId = c.req.param('id');
  const now = Date.now();

  // Read prior state so we can handle undo (terminal -> non-terminal) cleanly.
  const [priorStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);
  if (!priorStop) return c.json({ error: 'Not found' }, 404);
  const wasTerminal = priorStop?.status === 'delivered' || priorStop?.status === 'failed';
  const isTerminal = status === 'delivered' || status === 'failed';
  const isUndo = wasTerminal && !isTerminal;

  if ((status === 'en_route' || status === 'arrived' || status === 'delivered') && priorStop.orderId) {
    const [linkedOrder] = await db.select({ paymentStatus: orders.paymentStatus })
      .from(orders)
      .where(eq(orders.id, priorStop.orderId))
      .limit(1);
    if (linkedOrder?.paymentStatus !== 'paid') {
      return c.json({ error: 'Payment must be marked paid before this delivery can continue.' }, 409);
    }
  }

  const patch: Partial<typeof stops.$inferInsert> = { status };
  if (driverNote !== undefined) patch.driverNote = driverNote;
  if (flagReason !== undefined) patch.flagReason = flagReason;
  if (proofUrl !== undefined) patch.proofUrl = proofUrl;
  if (isTerminal) patch.completedAt = now;
  if (isUndo) {
    // Reverting an accidental delivered/failed — clear terminal markers so the UI treats it as active again.
    patch.completedAt = null;
    if (priorStop?.status === 'delivered') patch.proofUrl = null;
  }

  if ((status === 'en_route' || status === 'arrived') && priorStop) {
    await clearOtherActiveStops(db, priorStop.deliveryDayId, priorStop.id, now);
  }

  await db.update(stops).set(patch).where(eq(stops.id, stopId));

  // Get the current stop for context (post-update)
  const [currentStop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);

  if (status === 'delivered' && currentStop) {
    // Manual stops have orderId = null. Skip linked-order updates for them
    // (otherwise eq(orders.id, null) is a no-op WHERE that returns 0 rows in
    // SQLite — silent partial behaviour).
    if (currentStop.orderId) {
      await db.update(orders).set({ status: 'delivered', proofUrl: proofUrl ?? null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
    }

    // If the driver attached a proof photo, SMS the customer a link to it.
    // Only customers with a phone number get this; dedup via notifications table so undo+redo doesn't double-send.
    if (proofUrl && currentStop.customerPhone && currentStop.orderId
        && !(await alreadySent(db, currentStop.orderId, 'delivered_with_photo'))) {
      const storefrontUrl = c.env.STOREFRONT_URL || 'https://oconnoragriculture.com.au';
      const trackingUrl = `${storefrontUrl}/track/${currentStop.orderId}`;
      const firstName = (currentStop.customerName ?? '').trim().split(/\s+/)[0] || 'there';
      const smsBody = `Hi ${firstName}, your O'Connor Agriculture delivery has arrived. Proof photo: ${trackingUrl}`;
      const result = await sendSms(c.env, currentStop.customerPhone, smsBody);
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        orderId: currentStop.orderId,
        customerId: currentStop.customerId,
        type: 'delivered_with_photo',
        status: result.ok ? 'sent' : 'failed',
        recipientEmail: currentStop.customerPhone, // table field is misnamed; stores whatever channel identifier was used
        resendId: result.messageId ?? null,
        error: result.error ?? null,
        sentAt: now,
      });
    }
  }

  // If undoing a previously-delivered stop, revert the linked order from delivered -> out_for_delivery.
  // Skip for manual stops (no orderId).
  if (isUndo && priorStop?.status === 'delivered' && currentStop?.orderId) {
    await db.update(orders).set({ status: 'out_for_delivery', proofUrl: null, updatedAt: now }).where(eq(orders.id, currentStop.orderId));
  }

  // Notify next customer that driver is on the way
  if ((status === 'delivered' || status === 'failed') && currentStop) {
    const hasActiveStop = await hasOtherActiveStop(db, currentStop.deliveryDayId, currentStop.id);
    if (hasActiveStop) return c.json({ ok: true });

    const nextStops = await db.select().from(stops)
      .where(and(
        eq(stops.deliveryDayId, currentStop.deliveryDayId),
        gt(stops.sequence, currentStop.sequence),
      ))
      .orderBy(asc(stops.sequence))
      .limit(1);

    const nextStop = nextStops[0];
    if (nextStop && nextStop.status === 'pending') {
      // Mark next stop as en_route
      await db.update(stops).set({ status: 'en_route' }).where(eq(stops.id, nextStop.id));
      // Update the linked order — skip for manual stops with no orderId.
      if (nextStop.orderId) {
        await db.update(orders).set({ status: 'out_for_delivery', updatedAt: now }).where(eq(orders.id, nextStop.orderId));
      }

      const storefrontUrl = c.env.STOREFRONT_URL || 'https://oconnoragriculture.com.au';
      const trackingUrl = nextStop.orderId ? `${storefrontUrl}/track/${nextStop.orderId}` : storefrontUrl;

      // Send push notification to the next customer (best-effort; silently no-ops if not subscribed)
      if (nextStop.customerId) {
        try {
          await notifyCustomer(db, nextStop.customerId, {
            title: "O'Connor Agriculture — Driver On The Way",
            body: 'Your delivery is next! Track your driver live.',
            url: trackingUrl,
          }, c.env);
        } catch {
          // best-effort — don't fail the stop update
        }
      }

      // SMS the next customer (ClickSend). Dedup'd via notifications table so undo+redo can't double-send.
      if (nextStop.customerPhone && nextStop.orderId
          && !(await alreadySent(db, nextStop.orderId, 'sms_pre_alert'))) {
        const firstName = (nextStop.customerName ?? '').trim().split(/\s+/)[0] || 'there';
        const smsBody = `Hi ${firstName}, your O'Connor Agriculture delivery is next — the driver is on the way. Track: ${trackingUrl}`;
        const result = await sendSms(c.env, nextStop.customerPhone, smsBody);
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          orderId: nextStop.orderId,
          customerId: nextStop.customerId,
          type: 'sms_pre_alert',
          status: result.ok ? 'sent' : 'failed',
          recipientEmail: nextStop.customerPhone,
          resendId: result.messageId ?? null,
          error: result.error ?? null,
          sentAt: now,
        });
      }
    }
  }

  return c.json({ ok: true });
});

app.patch('/:id/sequence', async (c) => {
  const db = drizzle(c.env.DB);
  const { sequence, estimatedArrival } = await c.req.json<{ sequence: number; estimatedArrival?: number }>();
  const patch: Record<string, unknown> = { sequence };
  if (estimatedArrival !== undefined) patch.estimatedArrival = estimatedArrival;
  await db.update(stops).set(patch).where(eq(stops.id, c.req.param('id')));
  return c.json({ ok: true });
});

app.patch('/:id/run', async (c) => {
  const db = drizzle(c.env.DB);
  const { runId } = await c.req.json<{ runId: string | null }>();
  await db.update(stops).set({ runId: runId ?? null }).where(eq(stops.id, c.req.param('id')));
  return c.json({ ok: true });
});

export default app;
