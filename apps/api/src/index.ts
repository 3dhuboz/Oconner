import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthUser } from './types';
import { requireAuth, requireRole, verifyClerkToken } from './middleware/auth';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, asc, and, gte, sql, or } from 'drizzle-orm';
import { orders as ordersTable, customers as customersTable, products as productsTable, deliveryDays as deliveryDaysTable, subscriptions as subscriptionsTable, processedWebhooks, pageEvents, promoCodes as promoCodesTable } from '@butcher/db';
import { deductStock, getStockDayId, reserveDayStock, consumePromoCode } from './lib/stock';
import { parsePromoDeliveryDayIds, promoAllowsDeliveryDay } from './lib/promos';
import ordersRouter from './routes/orders';
import productsRouter from './routes/products';
import deliveryDaysRouter from './routes/deliveryDays';
import stopsRouter from './routes/stops';
import customersRouter from './routes/customers';
import usersRouter from './routes/users';
import driversRouter from './routes/drivers';
import driverRescueRouter from './routes/driverRescue';
import adminRescueRouter from './routes/adminRescue';
import deliveryRunsRouter from './routes/deliveryRuns';
import stripeRouter from './routes/stripe';
import stockRouter from './routes/stock';
import subscriptionsRouter from './routes/subscriptions';
import pushRouter from './routes/push';
import reportsRouter from './routes/reports';
import { reels as reelsRouter } from './routes/reels';
import promoCodesRouter from './routes/promoCodes';
import businessesRouter from './routes/businesses';
import receiptsRouter from './routes/receipts';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

const SQUARE_API = 'https://connect.squareup.com/v2';

type OrderRow = typeof ordersTable.$inferSelect;

interface SquarePaymentMatch {
  paymentId: string;
  amountCents: number;
  note: string;
  matchStrategy: 'payment_note' | 'square_order_metadata';
  squareOrderId?: string;
}

interface SquareInvoiceMatch {
  invoiceId: string;
  invoiceStatus: string;
  amountCents: number | null;
}

interface SquarePaymentLinkMatch {
  paymentId: string;
  amountCents: number;
  matchStrategy: string;
  squareOrderId: string;
}

interface SquarePaymentLinkLookup {
  match: SquarePaymentLinkMatch | null;
  squareState?: string;
  reason?: string;
}

interface SquareReconcileOptions {
  limit?: number;
  deepSearch?: boolean;
}

interface SquareReconcileResult {
  checked: number;
  reconciled: number;
  failed: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const TRACK_PATH_MAX = 200;
const TRACK_ITEM_ID_MAX = 80;
const TRACK_BOT_UA_RE = /bot|crawler|spider|preview|facebookexternalhit|pingdom|uptimerobot|gtmetrix|lighthouse|wget|curl|headlesschrome|monitis|prerender/i;
const TRACK_PROD_HOSTS = new Set(['oconnoragriculture.com.au', 'www.oconnoragriculture.com.au']);

function startOfBrisbaneDay(now: number = Date.now()): number {
  const aest = now + 10 * HOUR_MS;
  const dayStart = aest - (aest % DAY_MS);
  return dayStart - 10 * HOUR_MS;
}

function dayKeyFromMs(ms: number): string {
  return new Date(startOfBrisbaneDay(ms) + 10 * HOUR_MS).toISOString().slice(0, 10);
}

function num(row: any, field = 'n'): number {
  return row?.[field] != null ? Number(row[field]) : 0;
}

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function centsPer(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round(numerator / denominator);
}

function parseHostname(headerValue: string | null): string | null {
  if (!headerValue) return null;
  try {
    return new URL(headerValue).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function cleanReferrerHost(request: Request): string | null {
  const host = parseHostname(request.headers.get('Referer'));
  if (!host || TRACK_PROD_HOSTS.has(host)) return null;
  return host.slice(0, 120);
}

function countryCode(request: Request): string | null {
  const raw = request.headers.get('CF-IPCountry') || request.headers.get('cf-ipcountry') || '';
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function deviceType(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(s)) return 'tablet';
  if (/mobi|iphone|android.*mobile|windows phone/.test(s)) return 'mobile';
  return 'desktop';
}

function browserName(ua: string): string {
  const s = ua.toLowerCase();
  if (/edg\//.test(s)) return 'Edge';
  if (/opr\//.test(s) || /opera/.test(s)) return 'Opera';
  if (/firefox\//.test(s)) return 'Firefox';
  if (/samsungbrowser\//.test(s)) return 'Samsung Internet';
  if (/crios\//.test(s)) return 'Chrome iOS';
  if (/chrome\//.test(s) || /chromium\//.test(s)) return 'Chrome';
  if (/safari\//.test(s)) return 'Safari';
  return 'Other';
}

function osName(ua: string): string {
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return 'iOS';
  if (/android/.test(s)) return 'Android';
  if (/windows/.test(s)) return 'Windows';
  if (/mac os x|macintosh/.test(s)) return 'macOS';
  if (/linux/.test(s)) return 'Linux';
  return 'Other';
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function sanitizeTrackPath(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const withoutQuery = input.trim().split('#')[0].split('?')[0];
  if (!withoutQuery.startsWith('/')) return null;
  const path = withoutQuery.replace(/\/{2,}/g, '/').slice(0, TRACK_PATH_MAX) || '/';
  if (path.includes('..')) return null;
  if (/^\/(api|admin|login|sign-in|sign-up|ticket|images)\b/i.test(path)) return null;
  return path;
}

function sanitizeTrackItemId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const itemId = input.trim().slice(0, TRACK_ITEM_ID_MAX);
  return /^[a-zA-Z0-9_-]{3,80}$/.test(itemId) ? itemId : null;
}

function localHourFromMs(ms: number): number {
  return new Date(ms + 10 * HOUR_MS).getUTCHours();
}

function asList<T extends Record<string, unknown>>(result: D1Result<T>): T[] {
  return result.results ?? [];
}

function rowNumber(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function rowString(row: Record<string, unknown>, field: string, fallback = ''): string {
  const value = row[field];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

async function visitorWindowSummary(env: Env, from: number) {
  const row = await env.DB.prepare(`
    SELECT
      COUNT(*) AS events,
      COUNT(CASE WHEN item_id IS NULL OR item_id = '' THEN 1 END) AS pageviews,
      COUNT(CASE WHEN item_id IS NOT NULL AND item_id != '' THEN 1 END) AS itemViews,
      COUNT(DISTINCT session_hash) AS visitors
    FROM page_events
    WHERE created_at >= ?
  `).bind(from).first<Record<string, unknown>>();

  return {
    events: rowNumber(row ?? {}, 'events'),
    pageviews: rowNumber(row ?? {}, 'pageviews'),
    itemViews: rowNumber(row ?? {}, 'itemViews'),
    visitors: rowNumber(row ?? {}, 'visitors'),
  };
}

async function paidOrderWindowSummary(env: Env, from: number) {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenueCents
    FROM orders
    WHERE created_at >= ?
      AND status NOT IN ('cancelled', 'refunded')
      AND (
        payment_status = 'paid'
        OR status IN ('confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered')
      )
  `).bind(from).first<Record<string, unknown>>();

  return {
    orders: rowNumber(row ?? {}, 'orders'),
    revenueCents: rowNumber(row ?? {}, 'revenueCents'),
  };
}

function resolvePaidOrderStatus(order: OrderRow): string {
  return order.status === 'pending_payment' ? 'confirmed' : order.status;
}

async function squareGet(env: Env, path: string): Promise<any> {
  if (!env.SQUARE_ACCESS_TOKEN) throw new Error('Square not configured');
  const res = await fetch(`${SQUARE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2024-01-18',
    },
  });
  const data = await res.json() as any;
  if (data.errors) throw new Error(`Square lookup failed: ${JSON.stringify(data.errors).slice(0, 500)}`);
  return data;
}

async function squareOrderMetadataMatchesOrder(squareOrderId: string | undefined, orderId: string, env: Env): Promise<boolean> {
  if (!squareOrderId) return false;
  const data = await squareGet(env, `/orders/${squareOrderId}`);
  return data.order?.metadata?.orderId === orderId;
}

async function findCompletedSquarePaymentByOrderReference(
  order: OrderRow,
  env: Env,
): Promise<SquarePaymentMatch | null> {
  const accessToken = env.SQUARE_ACCESS_TOKEN;
  const locationId = env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) return null;

  const orderRef = order.id.slice(0, 8).toUpperCase();
  const beginTime = new Date(Math.max(0, order.createdAt - 60 * 60 * 1000)).toISOString();
  const paymentSearchEnd = order.createdAt + 14 * 24 * 60 * 60 * 1000;
  const endTime = new Date(Math.min(paymentSearchEnd, Date.now() + 10 * 60 * 1000)).toISOString();
  let cursor: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({
      begin_time: beginTime,
      end_time: endTime,
      location_id: locationId,
      sort_order: 'DESC',
      limit: '100',
    });
    if (cursor) params.set('cursor', cursor);

    const res = await fetch(`${SQUARE_API}/payments?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
      },
    });
    const data = await res.json() as {
      payments?: Array<{
        id?: string;
        status?: string;
        note?: string;
        order_id?: string;
        amount_money?: { amount?: number };
      }>;
      cursor?: string;
      errors?: unknown;
    };
    if (data.errors) throw new Error(`Square payment lookup failed: ${JSON.stringify(data.errors).slice(0, 500)}`);

    for (const payment of data.payments ?? []) {
      const note = payment.note ?? '';
      const amountCents = payment.amount_money?.amount ?? 0;
      if (!payment.id || payment.status !== 'COMPLETED' || amountCents < order.total) continue;

      if (note.toUpperCase().includes(`ORDER #${orderRef}`)) {
        return { paymentId: payment.id, amountCents, note, matchStrategy: 'payment_note', squareOrderId: payment.order_id };
      }

      if (await squareOrderMetadataMatchesOrder(payment.order_id, order.id, env)) {
        return { paymentId: payment.id, amountCents, note, matchStrategy: 'square_order_metadata', squareOrderId: payment.order_id };
      }
    }

    cursor = data.cursor;
    pages++;
  } while (cursor && pages < 5);

  return null;
}

async function confirmOrderFromSquarePaymentMatch(
  db: ReturnType<typeof drizzle>,
  order: OrderRow,
  env: Env,
): Promise<SquarePaymentMatch | null> {
  const match = await findCompletedSquarePaymentByOrderReference(order, env);
  if (!match) return null;

  await db.update(ordersTable).set({
    paymentStatus: 'paid',
    status: resolvePaidOrderStatus(order),
    paymentIntentId: match.paymentId,
    paymentProvider: 'square',
    internalNotes: `${order.internalNotes ?? ''}\nSquare payment confirmed: payment=${match.paymentId} amount=${match.amountCents}c matched_by=${match.matchStrategy}`.trim(),
    updatedAt: Date.now(),
  }).where(eq(ordersTable.id, order.id));

  return match;
}

async function confirmOrderFromSquarePayment(
  db: ReturnType<typeof drizzle>,
  payment: {
    id?: string;
    status?: string;
    note?: string;
    order_id?: string;
    amount_money?: { amount?: number };
  },
  env: Env,
): Promise<{ orderId: string; paymentId: string; matchStrategy: string } | null> {
  if (!payment.id || payment.status !== 'COMPLETED') return null;
  const amountCents = payment.amount_money?.amount ?? 0;
  let order: OrderRow | null = null;
  let matchStrategy = '';

  if (payment.order_id) {
    const squareOrder = await squareGet(env, `/orders/${payment.order_id}`);
    const orderId = squareOrder.order?.metadata?.orderId;
    if (orderId) {
      const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
      if (row) {
        order = row;
        matchStrategy = 'square_order_metadata';
      }
    }
  }

  if (!order) {
    const ref = payment.note?.toUpperCase().match(/ORDER #([A-Z0-9]{8})/)?.[1];
    if (ref) {
      const [row] = await db.select().from(ordersTable)
        .where(sql`upper(substr(${ordersTable.id}, 1, 8)) = ${ref}`)
        .limit(1);
      if (row) {
        order = row;
        matchStrategy = 'payment_note';
      }
    }
  }

  if (!order || order.paymentStatus === 'paid' || amountCents < order.total) return null;

  await db.update(ordersTable).set({
    paymentStatus: 'paid',
    status: resolvePaidOrderStatus(order),
    paymentIntentId: payment.id,
    paymentProvider: 'square',
    internalNotes: `${order.internalNotes ?? ''}\nSquare webhook confirmed: payment=${payment.id} amount=${amountCents}c matched_by=${matchStrategy}`.trim(),
    updatedAt: Date.now(),
  }).where(eq(ordersTable.id, order.id));

  return { orderId: order.id, paymentId: payment.id, matchStrategy };
}

function squarePaymentIdFromPayoutEntry(entry: any): string | null {
  return entry?.type_charge_details?.payment_id ??
    entry?.type_refunded_charge_details?.payment_id ??
    entry?.payment_id ??
    null;
}

async function listRecentSquarePaymentIds(env: Env, sinceMs: number): Promise<string[]> {
  const locationId = env.SQUARE_LOCATION_ID;
  if (!env.SQUARE_ACCESS_TOKEN || !locationId) return [];

  const beginTime = new Date(Math.max(0, sinceMs)).toISOString();
  const endTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const paymentIds = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;

  do {
    const params = new URLSearchParams({
      begin_time: beginTime,
      end_time: endTime,
      location_id: locationId,
      sort_order: 'DESC',
      limit: '100',
    });
    if (cursor) params.set('cursor', cursor);

    const paymentsResp = await squareGet(env, `/payments?${params}`);
    for (const payment of paymentsResp.payments ?? []) {
      if (payment?.id && payment.status === 'COMPLETED') paymentIds.add(payment.id);
    }

    cursor = paymentsResp.cursor;
    pages++;
  } while (cursor && pages < 3);

  return [...paymentIds].slice(0, 200);
}

async function listRecentSquarePayoutPaymentIds(env: Env, sinceMs: number): Promise<string[]> {
  const locationId = env.SQUARE_LOCATION_ID;
  if (!env.SQUARE_ACCESS_TOKEN || !locationId) return [];

  const beginTime = new Date(Math.max(0, sinceMs - DAY_MS)).toISOString();
  const endTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const paymentIds = new Set<string>();
  let payoutCursor: string | undefined;
  let payoutPages = 0;

  do {
    const payoutParams = new URLSearchParams({
      location_id: locationId,
      begin_time: beginTime,
      end_time: endTime,
      sort_order: 'DESC',
      limit: '100',
    });
    if (payoutCursor) payoutParams.set('cursor', payoutCursor);

    const payoutsResp = await squareGet(env, `/payouts?${payoutParams}`);
    for (const payout of payoutsResp.payouts ?? []) {
      if (!payout?.id) continue;
      let entryCursor: string | undefined;
      let entryPages = 0;
      do {
        const entryParams = new URLSearchParams({ limit: '100' });
        if (entryCursor) entryParams.set('cursor', entryCursor);
        const entriesResp = await squareGet(env, `/payouts/${payout.id}/payout-entries?${entryParams}`);
        for (const entry of entriesResp.payout_entries ?? []) {
          const paymentId = squarePaymentIdFromPayoutEntry(entry);
          if (paymentId) paymentIds.add(paymentId);
        }
        entryCursor = entriesResp.cursor;
        entryPages++;
      } while (entryCursor && entryPages < 5);
    }

    payoutCursor = payoutsResp.cursor;
    payoutPages++;
  } while (payoutCursor && payoutPages < 3);

  return [...paymentIds].slice(0, 200);
}

async function reconcileSquarePaymentsById(
  db: ReturnType<typeof drizzle>,
  env: Env,
  paymentIds: string[],
): Promise<number> {
  let reconciled = 0;

  for (let i = 0; i < paymentIds.length; i += 10) {
    const batch = paymentIds.slice(i, i + 10);
    const matches: number[] = await Promise.all(batch.map(async (paymentId) => {
      try {
        const paymentResp = await squareGet(env, `/payments/${paymentId}`);
        const match = await confirmOrderFromSquarePayment(db, paymentResp.payment, env);
        return match ? 1 : 0;
      } catch (e) {
        console.error(`[square-reconcile] failed to verify payout payment ${paymentId}:`, e);
        return 0;
      }
    }));
    reconciled += matches.reduce((sum, count) => sum + count, 0);
  }

  return reconciled;
}

async function reconcileRecentSquarePayments(
  db: ReturnType<typeof drizzle>,
  env: Env,
  sinceMs: number,
): Promise<number> {
  const paymentIds = await listRecentSquarePaymentIds(env, sinceMs);
  return reconcileSquarePaymentsById(db, env, paymentIds);
}

async function reconcileRecentSquarePayoutPayments(
  db: ReturnType<typeof drizzle>,
  env: Env,
  sinceMs: number,
): Promise<number> {
  const paymentIds = await listRecentSquarePayoutPaymentIds(env, sinceMs);
  return reconcileSquarePaymentsById(db, env, paymentIds);
}

function getLatestSquarePaymentLinkId(internalNotes: string | null): string | null {
  const matches = [...(internalNotes ?? '').matchAll(/Square payment link:\s*(\S+)/g)];
  const paymentLinkId = matches.length ? matches[matches.length - 1][1] : null;
  return paymentLinkId && paymentLinkId !== 'unknown' ? paymentLinkId : null;
}

async function confirmOrderFromSquarePaymentLinkIfPaid(
  db: ReturnType<typeof drizzle>,
  order: OrderRow,
  env: Env,
): Promise<SquarePaymentLinkLookup> {
  const paymentLinkId = getLatestSquarePaymentLinkId(order.internalNotes);
  if (!paymentLinkId) return { match: null, reason: 'missing_payment_link' };

  const linkResp = await squareGet(env, `/online-checkout/payment-links/${paymentLinkId}`);
  const squareOrderId = linkResp.payment_link?.order_id;
  if (!squareOrderId) return { match: null, reason: 'missing_square_order' };

  const orderResp = await squareGet(env, `/orders/${squareOrderId}`);
  const squareOrder = orderResp.order;
  if (!squareOrder) return { match: null, reason: 'missing_square_order' };

  if (squareOrder.state !== 'COMPLETED') {
    return { match: null, squareState: squareOrder.state };
  }

  const tenderedCents = (squareOrder.tenders ?? []).reduce(
    (sum: number, t: any) => sum + (t.amount_money?.amount ?? 0),
    0,
  );
  const expectedCents = squareOrder.total_money?.amount ?? order.total;
  if (tenderedCents < expectedCents) {
    return { match: null, squareState: squareOrder.state, reason: 'partial_tender' };
  }

  const paymentId = squareOrder.tenders?.[0]?.id ?? squareOrderId;
  await db.update(ordersTable).set({
    paymentStatus: 'paid',
    status: resolvePaidOrderStatus(order),
    paymentIntentId: paymentId,
    paymentProvider: 'square',
    internalNotes: `${order.internalNotes ?? ''}\nSquare payment confirmed: order=${squareOrderId} amount=${tenderedCents}c matched_by=payment_link_square_order`.trim(),
    updatedAt: Date.now(),
  }).where(eq(ordersTable.id, order.id));

  return {
    match: {
      paymentId,
      amountCents: tenderedCents,
      matchStrategy: 'payment_link_square_order',
      squareOrderId,
    },
    squareState: squareOrder.state,
  };
}

function getLatestSquareInvoiceId(internalNotes: string | null): string | null {
  const matches = [...(internalNotes ?? '').matchAll(/Square invoice sent:\s*(inv:[^\s\n]+)/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

async function confirmOrderFromSquareInvoiceIfPaid(
  db: ReturnType<typeof drizzle>,
  order: OrderRow,
  env: Env,
): Promise<SquareInvoiceMatch | null> {
  const accessToken = env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) return null;

  const invoiceId = getLatestSquareInvoiceId(order.internalNotes);
  if (!invoiceId) return null;

  const res = await fetch(`${SQUARE_API}/invoices/${invoiceId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': '2024-01-18',
    },
  });
  const data = await res.json() as {
    invoice?: {
      id?: string;
      status?: string;
      total_money?: { amount?: number };
    };
    errors?: unknown;
  };
  if (data.errors) throw new Error(`Square invoice lookup failed: ${JSON.stringify(data.errors).slice(0, 500)}`);

  const invoice = data.invoice;
  if (!invoice || invoice.status !== 'PAID') return null;

  const amountCents = invoice.total_money?.amount ?? null;
  await db.update(ordersTable).set({
    paymentStatus: 'paid',
    status: resolvePaidOrderStatus(order),
    paymentIntentId: invoiceId,
    paymentProvider: 'square',
    internalNotes: `${order.internalNotes ?? ''}\nSquare invoice paid: invoice=${invoiceId} amount=${amountCents ?? 'unknown'}c matched_by=invoice_status`.trim(),
    updatedAt: Date.now(),
  }).where(eq(ordersTable.id, order.id));

  return { invoiceId, invoiceStatus: invoice.status, amountCents };
}

async function reconcileOutstandingSquarePayments(env: Env, options: SquareReconcileOptions = {}): Promise<SquareReconcileResult> {
  const db = drizzle(env.DB);
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  const pendingOrders = await db.select().from(ordersTable)
    .where(or(
      eq(ordersTable.paymentStatus, 'awaiting_payment'),
      eq(ordersTable.paymentStatus, 'invoice_sent'),
    ))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  const oldestPendingCreatedAt = pendingOrders.reduce(
    (oldest, order) => Math.min(oldest, order.createdAt),
    Date.now(),
  );
  let reconciled = 0;
  let failed = 0;

  if (options.deepSearch && pendingOrders.length > 0) {
    try {
      const directLookbackStart = Math.max(oldestPendingCreatedAt, Date.now() - 3 * DAY_MS);
      reconciled += await reconcileRecentSquarePayments(db, env, directLookbackStart);

      const payoutLookbackStart = Math.max(oldestPendingCreatedAt, Date.now() - 7 * DAY_MS);
      reconciled += await reconcileRecentSquarePayoutPayments(db, env, payoutLookbackStart);
    } catch (e) {
      failed++;
      console.error('[square-reconcile] failed to scan recent Square payments:', e);
    }
  }

  for (const order of pendingOrders) {
    const internalNotes = order.internalNotes ?? '';
    try {
      if (order.paymentStatus === 'awaiting_payment' && internalNotes.includes('Square payment link')) {
        const direct = await confirmOrderFromSquarePaymentLinkIfPaid(db, order, env);
        if (direct.match) {
          reconciled++;
          continue;
        }

        // Square hosted-checkout can show a paid receipt while the template
        // order attached to the payment link remains OPEN. In that case, match
        // the completed payment by our payment note / Square order metadata.
        if (options.deepSearch || direct.squareState) {
          const match = await confirmOrderFromSquarePaymentMatch(db, order, env);
          if (match) {
            reconciled++;
            continue;
          }
        }
      }
      if (order.paymentStatus === 'invoice_sent' && internalNotes.includes('Square invoice sent')) {
        const match = await confirmOrderFromSquareInvoiceIfPaid(db, order, env);
        if (match) reconciled++;
      }
    } catch (e) {
      failed++;
      console.error(`[square-reconcile] failed for order ${order.id}:`, e);
    }
  }

  return { checked: pendingOrders.length, reconciled, failed };
}

app.use('*', cors({
  origin: [
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
    'https://oconner.pages.dev',
    'https://butcher-storefront.pages.dev',
    'https://butcher-admin.pages.dev',
    'https://butcher-driver.pages.dev',
    'https://admin.oconner.com.au', 'https://driver.oconner.com.au',
    'https://oconnoragriculture.com.au',
    'https://www.oconnoragriculture.com.au',
    'https://admin.oconnoragriculture.com.au',
    'https://driver.oconnoragriculture.com.au',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Driver-Rescue-Pin', 'X-Staff-Rescue-Pin'],
  credentials: true,
}));

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.get('/api/orders/mine', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json([]);
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.customerId, customer.id)).orderBy(desc(ordersTable.createdAt));
  return c.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items), deliveryAddress: JSON.parse(o.deliveryAddress) })));
});

// ── Customer-facing authenticated routes (Clerk token, no staff DB row required) ──
app.get('/api/customers/me', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
  if (!customer) return c.json(null);
  return c.json({ ...customer, addresses: JSON.parse(customer.addresses) });
});

app.patch('/api/customers/me', async (c) => {
  try {
    const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
    if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
    const db = drizzle(c.env.DB);
    const body = await c.req.json<{ phone?: string; addresses?: object[]; name?: string; email?: string }>();
    // Resolve email: prefer body.email, then clerk token, then empty
    const resolvedEmail = body.email || clerk.email || '';
    let [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkId, clerk.clerkId)).limit(1);
    if (!customer) {
      const now = Date.now();
      const id = crypto.randomUUID();
      await db.insert(customersTable).values({
        id,
        clerkId: clerk.clerkId,
        email: resolvedEmail,
        name: body.name || resolvedEmail || 'Customer',
        phone: body.phone ?? '',
        addresses: JSON.stringify(body.addresses ?? []),
        createdAt: now,
        updatedAt: now,
      });
      return c.json({ ok: true });
    }
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.addresses !== undefined) patch.addresses = JSON.stringify(body.addresses);
    if (body.name !== undefined) patch.name = body.name;
    // Backfill empty email/name on existing records
    if (!customer.email && resolvedEmail) patch.email = resolvedEmail;
    if (!customer.name && (body.name || resolvedEmail)) patch.name = body.name || resolvedEmail;
    await db.update(customersTable).set(patch).where(eq(customersTable.id, customer.id));
    return c.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('PATCH /api/customers/me failed:', message);
    return c.json({ error: message }, 500);
  }
});

app.get('/api/subscriptions/mine', async (c) => {
  const clerk = await verifyClerkToken(c.req.header('Authorization') ?? null, c.env.CLERK_SECRET_KEY);
  if (!clerk) return c.json({ error: 'Unauthorized' }, 401);
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.email, clerk.email))
    .orderBy(desc(subscriptionsTable.createdAt));
  return c.json(rows);
});

// ── Public read-only routes (no auth) ────────────────────────
app.get('/api/products', async (c) => {
  const db = drizzle(c.env.DB);
  const { activeOnly } = c.req.query();
  const rows = activeOnly === 'true'
    ? await db.select().from(productsTable).where(eq(productsTable.active, true)).orderBy(asc(productsTable.displayOrder))
    : await db.select().from(productsTable).orderBy(asc(productsTable.displayOrder));
  return c.json(rows.map((p) => ({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null })));
});

app.get('/api/products/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, c.req.param('id'))).limit(1);
  if (!p) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...p, weightOptions: p.weightOptions ? JSON.parse(p.weightOptions) : null });
});

app.get('/api/delivery-days', async (c) => {
  const db = drizzle(c.env.DB);
  const { upcoming } = c.req.query();
  const now = Date.now();
  const rows = upcoming === 'true'
    ? await db.select().from(deliveryDaysTable)
        .where(and(eq(deliveryDaysTable.active, true), gte(deliveryDaysTable.date, now)))
        .orderBy(asc(deliveryDaysTable.date))
    : await db.select().from(deliveryDaysTable)
        .where(eq(deliveryDaysTable.active, true))
        .orderBy(asc(deliveryDaysTable.date));
  return c.json(rows);
});

// Public tracking endpoint — returns only the fields the storefront's
// /track/:orderId page needs. Deliberately omits customerEmail, customerPhone,
// internalNotes, full customer record, etc. so a leaked or guessed order ID
// can't be used to scrape PII. The full GET /api/orders/:id is auth-gated in
// routes/orders.ts and additionally requires ownership or staff role.
app.get('/api/orders/:id/tracking', async (c) => {
  const db = drizzle(c.env.DB);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, c.req.param('id'))).limit(1);
  if (!order) return c.json({ error: 'Not found' }, 404);
  let items: unknown[] = [];
  let deliveryAddress: Record<string, string> = {};
  try { items = JSON.parse(order.items); } catch {}
  try { deliveryAddress = JSON.parse(order.deliveryAddress); } catch {}
  return c.json({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryDayId: order.deliveryDayId,
    deliveryAddress,
    items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    gst: order.gst,
    total: order.total,
    promoCode: order.promoCode,
    promoDiscount: order.promoDiscount,
    proofUrl: order.proofUrl,
    customerName: order.customerName, // first-name / display name only — already on the address label
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
});

app.post('/api/orders', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json<typeof ordersTable.$inferInsert & { deliveryAddress: object; items: object[]; clerkId?: string }>();
  const now = Date.now();
  const orderId = crypto.randomUUID();
  let customerId = body.customerId;
  if (!customerId) {
    // Race-safe customer upsert. Without UNIQUE(email) + onConflictDoUpdate,
    // two simultaneous first-orders from the same new email would both pass
    // the SELECT check and INSERT, creating duplicate customer rows. We now
    // rely on the unique index added in this PR to atomically dedup.
    const newId = crypto.randomUUID();
    const inserted = await db.insert(customersTable).values({
      id: newId, email: body.customerEmail, name: body.customerName ?? '',
      phone: body.customerPhone ?? '', clerkId: body.clerkId ?? null,
      accountType: 'registered', orderCount: 0, totalSpent: 0, blacklisted: false, notes: '', createdAt: now, updatedAt: now,
    })
      .onConflictDoUpdate({
        target: customersTable.email,
        // On a duplicate email, only patch clerkId if the existing row hasn't got one yet — preserves admin-set names/phones.
        set: { clerkId: sql`COALESCE(${customersTable.clerkId}, ${body.clerkId ?? null})`, updatedAt: now },
      })
      .returning({ id: customersTable.id });
    customerId = inserted[0]?.id ?? newId;
  }
  // ── Server-side price verification: recalculate from product DB ──
  const verifiedItems: any[] = [];
  for (const item of (body.items as any[])) {
    const [prod] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
    if (prod) {
      const qty = item.quantity ?? 1;
      const correctLineTotal = prod.isMeatPack
        ? (prod.fixedPrice ?? 0) * qty
        : Math.round((prod.pricePerKg ?? 0) * (item.weight ? item.weight / 1000 : (item.weightKg ?? 1)));
      verifiedItems.push({ ...item, fixedPrice: prod.fixedPrice, pricePerKg: prod.pricePerKg, lineTotal: correctLineTotal });
    } else {
      verifiedItems.push(item); // keep as-is if product not found
    }
  }
  const verifiedSubtotal = verifiedItems.reduce((s: number, i: any) => s + (i.lineTotal ?? 0), 0);
  const deliveryFee = Math.max(0, Number(body.deliveryFee ?? 0));
  const requestedPromoId = String((body as any).promoId ?? '').trim();
  const requestedPromoCode = String((body as any).promoCode ?? '').trim().toUpperCase();
  let promoDiscount = 0;
  let appliedPromoId: string | null = null;
  let appliedPromoCode: string | null = null;

  if (requestedPromoId || requestedPromoCode) {
    const [promo] = requestedPromoId
      ? await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, requestedPromoId)).limit(1)
      : await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, requestedPromoCode)).limit(1);

    if (!promo) {
      return c.json({ error: 'Promo code is no longer valid. Please remove it and try again.' }, 400);
    }
    if (!promo.active) {
      return c.json({ error: 'This promo code is no longer active. Please remove it and try again.' }, 400);
    }
    if (promo.expiresAt && Date.now() > promo.expiresAt) {
      return c.json({ error: 'This promo code has expired. Please remove it and try again.' }, 400);
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return c.json({ error: 'This promo code has been fully redeemed. Please remove it and try again.' }, 400);
    }
    if (promo.minOrder && verifiedSubtotal < promo.minOrder) {
      return c.json({ error: 'This order no longer meets the promo code minimum spend.' }, 400);
    }
    if (!promoAllowsDeliveryDay(promo, body.deliveryDayId)) {
      return c.json({ error: 'This promo code is only valid for selected delivery days. Please choose an eligible day or remove the code.' }, 400);
    }

    promoDiscount = promo.type === 'percentage'
      ? Math.round(verifiedSubtotal * (promo.value / 100))
      : Math.min(promo.value, verifiedSubtotal);
    appliedPromoId = promo.id;
    appliedPromoCode = promo.code;
  }

  const discountedSubtotal = Math.max(0, verifiedSubtotal - promoDiscount);
  const total = discountedSubtotal + deliveryFee;
  body.subtotal = verifiedSubtotal;
  body.deliveryFee = deliveryFee;
  body.total = total;

  // ── Pool-aware stock validation + atomic reservation ──
  // reserveDayStock does a conditional UPDATE per item, so two concurrent
  // checkouts can't both pass a stale "sold + qty <= allocated" read and
  // oversell. On any failure earlier reservations are rolled back automatically.
  const { deliveryDayStock } = await import('@butcher/db');
  const stockDayId = await getStockDayId(db, body.deliveryDayId);
  const dayAllocations = await db.select().from(deliveryDayStock).where(eq(deliveryDayStock.deliveryDayId, stockDayId));

  const reserveResult = await reserveDayStock(db, dayAllocations, verifiedItems);
  if (!reserveResult.ok) {
    return c.json({ error: reserveResult.error }, 400);
  }

  if (appliedPromoId) {
    const consumed = await consumePromoCode(db, appliedPromoId, now);
    if (!consumed.ok) {
      for (const item of verifiedItems) {
        const alloc = dayAllocations.find((a: any) => a.productId === item.productId);
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

  // Explicit paymentStatus floor — even though the column default is now
  // 'pending_payment' (migration 0004), the storefront body spreads in below
  // so we'd otherwise inherit whatever the client sent. A malicious client
  // could send `paymentStatus: 'paid'` and skip Square entirely; honour the
  // client value only if it's one of the safe non-paid states, otherwise
  // force it to pending_payment and rely on Square webhook / mark-paid to
  // flip it later.
  const SAFE_INITIAL_STATUSES = new Set(['pending_payment', 'awaiting_payment']);
  const initialPaymentStatus = SAFE_INITIAL_STATUSES.has(String((body as { paymentStatus?: string }).paymentStatus ?? ''))
    ? (body as { paymentStatus: string }).paymentStatus
    : 'pending_payment';

  await db.insert(ordersTable).values({
    ...body,
    id: orderId,
    customerId,
    items: JSON.stringify(verifiedItems),
    deliveryAddress: JSON.stringify(body.deliveryAddress),
    subtotal: verifiedSubtotal,
    deliveryFee,
    total,
    promoCode: appliedPromoCode,
    promoDiscount,
    paymentStatus: initialPaymentStatus,
    createdAt: now,
    updatedAt: now,
  });
  // Deduct global product stock (separate from per-day allocations above).
  await deductStock(db, verifiedItems, orderId, now);

  const [day] = await db.select().from(deliveryDaysTable).where(eq(deliveryDaysTable.id, body.deliveryDayId)).limit(1);
  // Atomic counter increments — read-then-write would let two concurrent
  // orders both compute the same +1 and clobber each other's increment.
  if (day) await db.update(deliveryDaysTable).set({ orderCount: sql`${deliveryDaysTable.orderCount} + 1` }).where(eq(deliveryDaysTable.id, day.id));
  await db.update(customersTable)
    .set({ orderCount: sql`${customersTable.orderCount} + 1`, totalSpent: sql`${customersTable.totalSpent} + ${total}`, updatedAt: now })
    .where(eq(customersTable.id, customerId));
  return c.json({ id: orderId }, 201);
});

// Forward to subscriptions router so order creation logic is centralized
app.post('/api/subscriptions', async (c) => {
  const url = new URL(c.req.url);
  url.pathname = '/';
  const newReq = new Request(url.toString(), { method: 'POST', headers: c.req.raw.headers, body: c.req.raw.body });
  return subscriptionsRouter.fetch(newReq, c.env);
});

// Public subscription checkout (no auth — uses Square)
app.post('/api/subscriptions/checkout', async (c) => {
  const { default: subsRouter } = await import('./routes/subscriptions');
  const url = new URL(c.req.url);
  url.pathname = '/checkout';
  const newReq = new Request(url.toString(), { method: 'POST', headers: c.req.raw.headers, body: c.req.raw.body });
  return subsRouter.fetch(newReq, c.env);
});

app.route('/api/push', pushRouter);
app.route('/api/reels', reelsRouter);

// ── Public promo code validation (no auth) ───────────────────────────────────
app.post('/api/promo-codes/validate', async (c) => {
  const { promoCodes: promoCodesTable } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const { code, subtotal, deliveryDayId } = await c.req.json<{ code: string; subtotal: number; deliveryDayId?: string }>();
  const codeUpper = code.toUpperCase().trim();

  const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, codeUpper)).limit(1);

  if (!promo) return c.json({ valid: false, error: 'Invalid promo code' });
  if (!promo.active) return c.json({ valid: false, error: 'This code is no longer active' });
  if (promo.expiresAt && Date.now() > promo.expiresAt) return c.json({ valid: false, error: 'This code has expired' });
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return c.json({ valid: false, error: 'This code has been fully redeemed' });
  if (promo.minOrder && subtotal < promo.minOrder) {
    const min = (promo.minOrder / 100).toFixed(2);
    return c.json({ valid: false, error: `Minimum order of $${min} required for this code` });
  }
  if (!promoAllowsDeliveryDay(promo, deliveryDayId)) {
    return c.json({ valid: false, error: 'This code is only valid for selected delivery days' });
  }

  let discount = 0;
  if (promo.type === 'percentage') {
    discount = Math.round(subtotal * (promo.value / 100));
  } else {
    discount = Math.min(promo.value, subtotal);
  }

  return c.json({
    valid: true,
    promoId: promo.id,
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    label: promo.type === 'percentage' ? `${promo.value}% off` : `$${(promo.value / 100).toFixed(2)} off`,
    deliveryDayIds: parsePromoDeliveryDayIds(promo.deliveryDayIds),
  });
});

// ── Public contact form ───────────────────────────────────────────────────────
app.post('/api/contact', async (c) => {
  const { name, email, subject, message } = await c.req.json<{ name: string; email: string; subject?: string; message: string }>();
  if (!name || !email || !message) return c.json({ error: 'Missing required fields' }, 400);
  const { sendEmail } = await import('./lib/email');
  await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL,
    to: 'orders@oconnoragriculture.com.au',
    subject: `Website enquiry${subject ? `: ${subject}` : ''} — from ${name}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject ?? '(none)'}</p><hr/><p>${message.replace(/\n/g, '<br>')}</p>`,
  });
  return c.json({ ok: true });
});

app.get('/api/ticker', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [tickerRow] = await db.select().from(config).where(eq(config.key, 'ticker')).limit(1);
  if (!tickerRow) return c.json({ enabled: false, items: [] });
  const data = JSON.parse(tickerRow.value) as { enabled: boolean; items: Array<{ text: string; url?: string }>; facebookPageUrl?: string };
  if (!data.enabled) return c.json({ enabled: false, items: [] });
  return c.json({ enabled: true, items: data.items ?? [], facebookPageUrl: data.facebookPageUrl ?? null });
});

// ── Public: Square payment link for storefront checkout ──
app.post('/api/orders/:id/payment-link', async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  const storefrontUrl = c.env.STOREFRONT_URL ?? 'https://oconnoragriculture.com.au';
  if (!accessToken || !locationId) return c.json({ error: 'Square not configured' }, 400);

  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; lineTotal: number }>;
  const promoDiscount = Math.max(0, order.promoDiscount ?? 0);
  const promoCode = (order.promoCode ?? '').trim();
  const metadata = promoCode ? { orderId, promoCode } : { orderId };

  try {
    const squareLineItems = items.map((i: any) => ({
      name: i.productName ?? 'Item',
      quantity: String(i.quantity ?? 1),
      base_price_money: { amount: Math.round(i.lineTotal / (i.quantity ?? 1)), currency: 'AUD' },
    }));

    if (order.deliveryFee > 0) {
      squareLineItems.push({ name: 'Delivery Fee', quantity: '1', base_price_money: { amount: order.deliveryFee, currency: 'AUD' } });
    }

    const res = await fetch(`${SQUARE_API}/online-checkout/payment-links`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Square-Version': '2024-01-18' },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          line_items: squareLineItems,
          discounts: promoDiscount > 0 ? [{
            uid: 'promo_discount',
            name: promoCode ? `Promo ${promoCode}` : 'Promo discount',
            type: 'FIXED_AMOUNT',
            scope: 'ORDER',
            amount_money: { amount: promoDiscount, currency: 'AUD' },
          }] : undefined,
          metadata,
        },
        checkout_options: {
          redirect_url: `${storefrontUrl}/checkout/success?orderId=${orderId}`,
          merchant_support_email: 'orders@oconnoragriculture.com.au',
        },
        payment_note: `O'Connor Agriculture — Order #${orderId.slice(0, 8).toUpperCase()}`,
      }),
    });

    const data = await res.json() as any;
    if (data.errors) return c.json({ error: 'Failed to create payment link', details: data.errors }, 400);

    const paymentUrl = data.payment_link?.url ?? data.payment_link?.long_url;
    if (!paymentUrl) return c.json({ error: 'Payment link created but no URL returned' }, 500);

    await db.update(ordersTable).set({
      paymentStatus: 'awaiting_payment',
      paymentProvider: 'square',
      internalNotes: `${order.internalNotes ?? ''}\nSquare payment link: ${data.payment_link?.id ?? 'unknown'}`.trim(),
      updatedAt: Date.now(),
    }).where(eq(ordersTable.id, orderId));

    return c.json({ ok: true, paymentUrl });
  } catch (e: any) {
    return c.json({ error: e?.message ?? 'Payment link creation failed' }, 500);
  }
});

// ── Public: mark order as paid (called by success page after Square redirect) ──
// This endpoint is unauthenticated by design — Square's redirect lands the
// customer on /checkout/success which fires this from the browser. That means
// we CANNOT trust the caller. Before April 2026 this just flipped the row to
// 'paid' on any orderId, which let anyone with a guessable ID confirm orders
// for free. We now verify the payment with Square first: find the payment-link
// ID we stored at create-time, look up its Square order, and only mark paid if
// Square says state=COMPLETED with tenders covering the total.
app.post('/api/orders/:id/mark-paid', async (c) => {
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  // Idempotent: if it's already paid (or anything other than pending/awaiting),
  // don't re-verify and don't downgrade. The browser may fire this multiple
  // times during the redirect dance.
  if (order.paymentStatus === 'invoice_sent') {
    const match = await confirmOrderFromSquareInvoiceIfPaid(db, order, c.env);
    if (match) {
      return c.json({ ok: true, status: 'paid', matchStrategy: 'invoice_status', invoiceId: match.invoiceId });
    }
    return c.json({ ok: true, status: order.paymentStatus });
  }

  if (order.paymentStatus !== 'pending_payment' && order.paymentStatus !== 'awaiting_payment') {
    return c.json({ ok: true, status: order.paymentStatus });
  }

  if (!accessToken) {
    return c.json({ error: 'Square not configured' }, 503);
  }

  // The /payment-link handler appends `Square payment link: <id>` to
  // internal_notes on every create. Take the LAST one — same convention as
  // /invoice/cancel. We verify against that specific link's Square order.
  const paymentLinkId = getLatestSquarePaymentLinkId(order.internalNotes);
  if (!paymentLinkId) {
    return c.json({ error: 'No Square payment link associated with this order' }, 400);
  }

  try {
    // Payment link → Square order ID. The payment_link object carries the
    // order_id of the Square order it created at checkout time.
    const linkResp = await squareGet(c.env, `/online-checkout/payment-links/${paymentLinkId}`);
    if (linkResp.errors) {
      return c.json({ error: 'Could not load payment link from Square', details: linkResp.errors }, 502);
    }
    const squareOrderId = linkResp.payment_link?.order_id;
    if (!squareOrderId) {
      return c.json({ error: 'Square payment link has no associated order' }, 502);
    }

    // Square order → state + tenders. state=COMPLETED means the order is paid
    // and finalised; OPEN means the link hasn't been paid yet; CANCELED means
    // the customer abandoned it. We only flip our row on COMPLETED.
    const orderResp = await squareGet(c.env, `/orders/${squareOrderId}`);
    if (orderResp.errors) {
      return c.json({ error: 'Could not load Square order', details: orderResp.errors }, 502);
    }
    const squareOrder = orderResp.order;
    if (!squareOrder) {
      return c.json({ error: 'Square returned no order' }, 502);
    }

    if (squareOrder.state !== 'COMPLETED') {
      // Hosted Square links can leave the template order OPEN, so also check
      // completed payments by the order reference before asking the client to retry.
      const match = await confirmOrderFromSquarePaymentMatch(db, order, c.env);
      if (match) {
        return c.json({ ok: true, status: 'paid', matchStrategy: match.matchStrategy, paymentId: match.paymentId });
      }
      return c.json({ ok: true, status: 'pending', squareState: squareOrder.state });
    }

    // Defence in depth: even if Square says COMPLETED, double-check the tender
    // amounts cover the order total. A partial tender would still report
    // COMPLETED in some configurations.
    const tenderedCents = (squareOrder.tenders ?? []).reduce(
      (sum: number, t: any) => sum + (t.amount_money?.amount ?? 0),
      0,
    );
    const expectedCents = squareOrder.total_money?.amount ?? 0;
    if (tenderedCents < expectedCents) {
      return c.json({ ok: true, status: 'partial', tenderedCents, expectedCents });
    }

    await db.update(ordersTable).set({
      paymentStatus: 'paid',
      status: 'confirmed',
      paymentIntentId: squareOrder.tenders?.[0]?.id ?? squareOrderId,
      paymentProvider: 'square',
      internalNotes: `${order.internalNotes ?? ''}\nSquare payment confirmed: order=${squareOrderId} amount=${tenderedCents}c`.trim(),
      updatedAt: Date.now(),
    }).where(eq(ordersTable.id, orderId));

    return c.json({ ok: true, status: 'paid' });
  } catch (e: any) {
    return c.json({ error: e?.message ?? 'Failed to verify payment' }, 500);
  }
});

async function base64HmacSha256(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

async function verifySquareWebhookSignature(c: any, rawBody: string): Promise<boolean> {
  const signatureKey = c.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) return false;
  const signature = c.req.header('x-square-hmacsha256-signature') ?? '';
  const notificationUrl = c.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? new URL(c.req.url).toString();
  const expected = await base64HmacSha256(signatureKey, `${notificationUrl}${rawBody}`);
  return timingSafeEqual(expected, signature);
}

// Square webhooks are the reliable source of truth for hosted checkout links.
// The browser redirect can be skipped by Facebook/in-app browsers, so payment
// updates must also advance the local order server-to-server.
app.post('/api/square/webhook', async (c) => {
  const rawBody = await c.req.text();
  if (!await verifySquareWebhookSignature(c, rawBody)) {
    return c.json({ error: 'Invalid Square signature' }, 403);
  }

  const event = JSON.parse(rawBody) as {
    event_id?: string;
    type?: string;
    data?: { object?: { payment?: any } };
  };
  const eventId = event.event_id;
  if (!eventId) return c.json({ error: 'Missing event id' }, 400);

  const db = drizzle(c.env.DB);
  try {
    await db.insert(processedWebhooks).values({ id: eventId, source: 'square', receivedAt: Date.now() });
  } catch {
    return c.json({ ok: true, duplicate: true });
  }

  if (event.type !== 'payment.created' && event.type !== 'payment.updated') {
    return c.json({ ok: true, ignored: event.type });
  }

  const payment = event.data?.object?.payment;
  if (!payment) return c.json({ ok: true, ignored: 'missing_payment' });

  const match = await confirmOrderFromSquarePayment(db, payment, c.env);
  return c.json({ ok: true, matched: Boolean(match), ...match });
});

// Privacy-safe website analytics. Fire-and-forget by design: tracking must
// never interrupt a customer's shop, cart, or checkout flow.
app.post('/api/track/pageview', async (c) => {
  try {
    const ua = c.req.header('User-Agent') ?? '';
    if (TRACK_BOT_UA_RE.test(ua)) return c.body(null, 204);

    const originHost = parseHostname(c.req.header('Origin') ?? null);
    const refererHost = parseHostname(c.req.header('Referer') ?? null);
    if (originHost && !TRACK_PROD_HOSTS.has(originHost)) return c.body(null, 204);
    if (!originHost && refererHost && !TRACK_PROD_HOSTS.has(refererHost)) return c.body(null, 204);

    const body = await c.req.json<{ path?: unknown; itemId?: unknown }>().catch(() => null);
    const path = sanitizeTrackPath(body?.path);
    if (!path) return c.body(null, 204);

    const itemId = sanitizeTrackItemId(body?.itemId);
    const ip = (c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')?.split(',')[0] ?? 'unknown').trim();
    const dayStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sessionHash = await sha256Hex(`${ip}|${ua}|${dayStamp}|${c.env.ENVIRONMENT ?? 'prod'}`);

    const db = drizzle(c.env.DB);
    await db.insert(pageEvents).values({
      id: crypto.randomUUID(),
      path,
      itemId,
      sessionHash,
      referrerHost: cleanReferrerHost(c.req.raw),
      countryCode: countryCode(c.req.raw),
      deviceType: deviceType(ua),
      browser: browserName(ua),
      os: osName(ua),
      createdAt: Date.now(),
    });
  } catch (error) {
    console.warn('[track/pageview]', error);
  }
  return c.body(null, 204);
});

// ── Public: read single config key (storefront/about page) ──
app.get('/api/config/:key', async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [row] = await db.select().from(config).where(eq(config.key, c.req.param('key'))).limit(1);
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ key: row.key, value: JSON.parse(row.value) });
});

app.route('/api/driver-rescue', driverRescueRouter);
app.route('/api/admin-rescue', adminRescueRouter);
app.use('/api/*', requireAuth);

app.get('/api/insights', requireRole('admin'), async (c) => {
  const now = Date.now();
  const todayStart = startOfBrisbaneDay(now);
  const weekStart = now - WEEK_MS;
  const monthStart = now - MONTH_MS;
  const seriesStart = startOfBrisbaneDay(now - 13 * DAY_MS);

  const [
    todayTraffic,
    weekTraffic,
    monthTraffic,
    todayOrders,
    weekOrders,
    monthOrders,
    lastEvent,
    topPagesResult,
    topItemsResult,
    referrersResult,
    countriesResult,
    devicesResult,
    browsersResult,
    osResult,
    recentSessionsResult,
    seriesResult,
  ] = await Promise.all([
    visitorWindowSummary(c.env, todayStart),
    visitorWindowSummary(c.env, weekStart),
    visitorWindowSummary(c.env, monthStart),
    paidOrderWindowSummary(c.env, todayStart),
    paidOrderWindowSummary(c.env, weekStart),
    paidOrderWindowSummary(c.env, monthStart),
    c.env.DB.prepare('SELECT created_at AS lastEventAt FROM page_events ORDER BY created_at DESC LIMIT 1').first<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ? AND (item_id IS NULL OR item_id = '')
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT
        pe.item_id AS itemId,
        COALESCE(p.name, pe.item_id) AS name,
        COUNT(*) AS views,
        COUNT(DISTINCT pe.session_hash) AS visitors
      FROM page_events pe
      LEFT JOIN products p ON p.id = pe.item_id
      WHERE pe.created_at >= ? AND pe.item_id IS NOT NULL AND pe.item_id != ''
      GROUP BY pe.item_id
      ORDER BY views DESC
      LIMIT 10
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT COALESCE(referrer_host, 'Direct') AS referrer, COUNT(*) AS views, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(referrer_host, 'Direct')
      ORDER BY views DESC
      LIMIT 10
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT COALESCE(country_code, 'Unknown') AS country, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(country_code, 'Unknown')
      ORDER BY events DESC
      LIMIT 10
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT COALESCE(device_type, 'unknown') AS label, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(device_type, 'unknown')
      ORDER BY events DESC
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT COALESCE(browser, 'Other') AS label, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(browser, 'Other')
      ORDER BY events DESC
      LIMIT 8
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT COALESCE(os, 'Other') AS label, COUNT(*) AS events, COUNT(DISTINCT session_hash) AS visitors
      FROM page_events
      WHERE created_at >= ?
      GROUP BY COALESCE(os, 'Other')
      ORDER BY events DESC
      LIMIT 8
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT
        session_hash AS id,
        MIN(created_at) AS firstSeen,
        MAX(created_at) AS lastSeen,
        COUNT(CASE WHEN item_id IS NULL OR item_id = '' THEN 1 END) AS pageviews,
        COUNT(CASE WHEN item_id IS NOT NULL AND item_id != '' THEN 1 END) AS itemViews,
        GROUP_CONCAT(DISTINCT path) AS paths,
        COALESCE(MIN(referrer_host), 'Direct') AS referrer,
        COALESCE(MAX(country_code), 'Unknown') AS country,
        COALESCE(MAX(device_type), 'unknown') AS device,
        COALESCE(MAX(browser), 'Other') AS browser,
        COALESCE(MAX(os), 'Other') AS os
      FROM page_events
      WHERE created_at >= ?
      GROUP BY session_hash
      ORDER BY lastSeen DESC
      LIMIT 20
    `).bind(monthStart).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT created_at AS createdAt, item_id AS itemId, session_hash AS sessionHash
      FROM page_events
      WHERE created_at >= ?
      ORDER BY created_at ASC
    `).bind(seriesStart).all<Record<string, unknown>>(),
  ]);

  const dailyMap = new Map<string, { date: string; visitors: Set<string>; pageviews: number; itemViews: number }>();
  for (let i = 0; i < 14; i++) {
    const date = dayKeyFromMs(seriesStart + i * DAY_MS);
    dailyMap.set(date, { date, visitors: new Set<string>(), pageviews: 0, itemViews: 0 });
  }

  const hourlyToday = Array.from({ length: 24 }, (_, hour) => ({ hour, events: 0, visitors: new Set<string>() }));
  for (const row of asList(seriesResult)) {
    const createdAt = rowNumber(row, 'createdAt');
    const sessionHash = rowString(row, 'sessionHash');
    const date = dayKeyFromMs(createdAt);
    const bucket = dailyMap.get(date);
    if (bucket) {
      bucket.visitors.add(sessionHash);
      if (rowString(row, 'itemId')) bucket.itemViews += 1;
      else bucket.pageviews += 1;
    }
    if (createdAt >= todayStart) {
      const hour = localHourFromMs(createdAt);
      hourlyToday[hour].events += 1;
      hourlyToday[hour].visitors.add(sessionHash);
    }
  }

  const formatTraffic = (traffic: Awaited<ReturnType<typeof visitorWindowSummary>>) => ({
    visitors: traffic.visitors,
    pageviews: traffic.pageviews,
    itemViews: traffic.itemViews,
    events: traffic.events,
  });

  return c.json({
    generatedAt: now,
    window: { todayStart, weekStart, monthStart },
    tracker: {
      lastEventAt: lastEvent?.lastEventAt ? Number(lastEvent.lastEventAt) : null,
    },
    traffic: {
      today: formatTraffic(todayTraffic),
      week: formatTraffic(weekTraffic),
      month: formatTraffic(monthTraffic),
      dailySeries: [...dailyMap.values()].map((bucket) => ({
        date: bucket.date,
        visitors: bucket.visitors.size,
        pageviews: bucket.pageviews,
        itemViews: bucket.itemViews,
      })),
      hourlyToday: hourlyToday.map((bucket) => ({
        hour: bucket.hour,
        events: bucket.events,
        visitors: bucket.visitors.size,
      })),
    },
    orders: {
      todayCount: todayOrders.orders,
      todayRevenueCents: todayOrders.revenueCents,
      weekCount: weekOrders.orders,
      weekRevenueCents: weekOrders.revenueCents,
      monthCount: monthOrders.orders,
      monthRevenueCents: monthOrders.revenueCents,
    },
    conversion: {
      todayOrderRate: pct(todayOrders.orders, todayTraffic.visitors),
      weekOrderRate: pct(weekOrders.orders, weekTraffic.visitors),
      monthOrderRate: pct(monthOrders.orders, monthTraffic.visitors),
      weekRevenuePerVisitorCents: centsPer(weekOrders.revenueCents, weekTraffic.visitors),
      monthRevenuePerVisitorCents: centsPer(monthOrders.revenueCents, monthTraffic.visitors),
    },
    topPages: asList(topPagesResult).map((row) => ({
      path: rowString(row, 'path', '/'),
      views: rowNumber(row, 'views'),
      visitors: rowNumber(row, 'visitors'),
    })),
    topItems: asList(topItemsResult).map((row) => ({
      itemId: rowString(row, 'itemId'),
      name: rowString(row, 'name', rowString(row, 'itemId')),
      views: rowNumber(row, 'views'),
      visitors: rowNumber(row, 'visitors'),
    })),
    acquisition: {
      referrers: asList(referrersResult).map((row) => ({
        referrer: rowString(row, 'referrer', 'Direct'),
        views: rowNumber(row, 'views'),
        visitors: rowNumber(row, 'visitors'),
      })),
      countries: asList(countriesResult).map((row) => ({
        country: rowString(row, 'country', 'Unknown'),
        events: rowNumber(row, 'events'),
        visitors: rowNumber(row, 'visitors'),
      })),
    },
    technology: {
      devices: asList(devicesResult).map((row) => ({
        label: rowString(row, 'label', 'unknown'),
        events: rowNumber(row, 'events'),
        visitors: rowNumber(row, 'visitors'),
      })),
      browsers: asList(browsersResult).map((row) => ({
        label: rowString(row, 'label', 'Other'),
        events: rowNumber(row, 'events'),
        visitors: rowNumber(row, 'visitors'),
      })),
      os: asList(osResult).map((row) => ({
        label: rowString(row, 'label', 'Other'),
        events: rowNumber(row, 'events'),
        visitors: rowNumber(row, 'visitors'),
      })),
    },
    recentSessions: asList(recentSessionsResult).map((row) => ({
      id: rowString(row, 'id').slice(0, 8).toUpperCase(),
      firstSeen: rowNumber(row, 'firstSeen'),
      lastSeen: rowNumber(row, 'lastSeen'),
      pageviews: rowNumber(row, 'pageviews'),
      itemViews: rowNumber(row, 'itemViews'),
      paths: rowString(row, 'paths').split(',').filter(Boolean).slice(0, 6),
      referrer: rowString(row, 'referrer', 'Direct'),
      country: rowString(row, 'country', 'Unknown'),
      device: rowString(row, 'device', 'unknown'),
      browser: rowString(row, 'browser', 'Other'),
      os: rowString(row, 'os', 'Other'),
    })),
  });
});

app.post('/api/square/reconcile', requireRole('admin'), async (c) => {
  const rawLimit = Number(c.req.query('limit') ?? '10');
  const limit = Number.isFinite(rawLimit) ? rawLimit : 10;
  const deepSearch = c.req.query('deep') === 'true';
  const result = await reconcileOutstandingSquarePayments(c.env, { limit, deepSearch });
  return c.json({ ok: true, ...result });
});

app.route('/api/orders', ordersRouter);
app.route('/api/products', productsRouter);
app.route('/api/delivery-days', deliveryDaysRouter);
app.route('/api/stops', stopsRouter);
app.route('/api/customers', customersRouter);
app.route('/api/users', usersRouter);
app.route('/api/drivers', driversRouter);
app.route('/api/delivery-runs', deliveryRunsRouter);
app.route('/api/stock', stockRouter);
app.route('/api/subscriptions', subscriptionsRouter);
app.route('/api/reports', reportsRouter);
app.route('/api/promo-codes', promoCodesRouter);
app.route('/api/businesses', businessesRouter);
app.route('/api/receipts', receiptsRouter);

app.route('/webhook', stripeRouter);

// ── Staff invite email ───────────────────────────────────────────────────────
app.post('/api/staff/invite', requireAuth, requireRole('admin'), async (c) => {
  const body = await c.req.json<{ name: string; email: string; role: string }>();
  if (!body.email || !body.name) return c.json({ error: 'Name and email required' }, 400);

  const { sendEmail, escapeHtml } = await import('./lib/email');
  const adminUrl = c.env.STOREFRONT_URL?.replace('butcher-storefront', 'butcher-admin') || 'https://admin.oconnoragriculture.com.au';

  // Escape user-supplied fields before interpolating into the email body
  // (admin can be tricked into sending HTML/script payloads via name/role).
  const html = `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
      <h2 style="color:#4E7732">Welcome to O'Connor Agriculture</h2>
      <p>Hi ${escapeHtml(body.name)},</p>
      <p>You've been invited to join the <strong>O'Connor Agriculture</strong> team as <strong>${escapeHtml(body.role)}</strong>.</p>
      <p>Click the button below to create your account and get access to the admin dashboard:</p>
      <div style="text-align:center;margin:30px 0">
        <a href="${escapeHtml(adminUrl)}" style="background:#4E7732;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">
          Create Your Account
        </a>
      </div>
      <p style="color:#666;font-size:13px">Use your email <strong>${escapeHtml(body.email)}</strong> when signing up so your account is linked automatically.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
      <p style="color:#999;font-size:12px">O'Connor Agriculture — Paddock to plate</p>
    </div>
  `;

  const result = await sendEmail({
    apiKey: c.env.RESEND_API_KEY,
    from: c.env.FROM_EMAIL || 'orders@oconnoragriculture.com.au',
    to: body.email,
    subject: `You're invited to join O'Connor Agriculture`,
    html,
  });

  if (!result) return c.json({ error: 'Failed to send email' }, 500);
  return c.json({ ok: true });
});

app.get('/api/audit-log', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { desc } = await import('drizzle-orm');
  const { auditLog } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(100);
  return c.json(rows.map((e) => ({ ...e, before: JSON.parse(e.before), after: JSON.parse(e.after) })));
});

// ── Admin push helpers ───────────────────────────────────────────────────────
app.get('/api/push/admin/stats', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { sql } = await import('drizzle-orm');
  const { pushSubscriptions } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(pushSubscriptions);
  return c.json({ subscribers: Number(row?.count ?? 0) });
});

app.post('/api/push/admin/test-send', requireAuth, requireRole('admin'), async (c) => {
  const { title, body, url } = await c.req.json<{ title: string; body: string; url?: string }>();
  const user = c.get('user');
  const { drizzle } = await import('drizzle-orm/d1');
  const { eq } = await import('drizzle-orm');
  const { pushSubscriptions, customers } = await import('@butcher/db');
  const { sendPush } = await import('./lib/webpush');
  const db = drizzle(c.env.DB);
  const [customer] = await db.select().from(customers).where(eq(customers.email, user.email)).limit(1);
  if (!customer) return c.json({ error: 'No customer record for your account' }, 404);
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.customerId, customer.id));
  if (!subs.length) return c.json({ error: 'No push subscriptions found for your account. Subscribe first from the storefront.' }, 404);
  const contact = `mailto:${c.env.FROM_EMAIL.replace(/.*<(.+)>/, '$1')}`;
  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }, c.env.VAPID_PUBLIC_KEY, c.env.VAPID_PRIVATE_KEY, contact);
    if (ok) sent++;
  }
  return c.json({ sent, total: subs.length });
});

app.post('/api/push/admin/broadcast', requireAuth, requireRole('admin'), async (c) => {
  const { title, body, url } = await c.req.json<{ title: string; body: string; url?: string }>();
  const { drizzle } = await import('drizzle-orm/d1');
  const { pushSubscriptions } = await import('@butcher/db');
  const { sendPush } = await import('./lib/webpush');
  const db = drizzle(c.env.DB);
  const subs = await db.select().from(pushSubscriptions);
  const contact = `mailto:${c.env.FROM_EMAIL.replace(/.*<(.+)>/, '$1')}`;
  let sent = 0;
  for (const s of subs) {
    const ok = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }, c.env.VAPID_PUBLIC_KEY, c.env.VAPID_PRIVATE_KEY, contact);
    if (ok) sent++;
  }
  return c.json({ sent, total: subs.length });
});

app.get('/api/notifications', requireAuth, async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { desc } = await import('drizzle-orm');
  const { notifications } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(notifications).orderBy(desc(notifications.sentAt)).limit(200);
  return c.json(rows);
});

app.get('/api/config', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(config);
  const result: Record<string, unknown> = {};
  for (const row of rows) result[row.key] = JSON.parse(row.value);
  return c.json(result);
});

app.put('/api/config', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const body = await c.req.json<Record<string, unknown>>();
  const user = c.get('user');
  const now = Date.now();
  for (const [key, value] of Object.entries(body)) {
    await db.insert(config).values({ key, value: JSON.stringify(value), updatedAt: now, updatedBy: user.email })
      .onConflictDoUpdate({ target: config.key, set: { value: JSON.stringify(value), updatedAt: now, updatedBy: user.email } });
  }
  return c.json({ ok: true });
});

app.put('/api/config/:key', requireAuth, requireRole('admin'), async (c) => {
  const { drizzle } = await import('drizzle-orm/d1');
  const { config } = await import('@butcher/db');
  const db = drizzle(c.env.DB);
  const value = await c.req.json();
  const user = c.get('user');
  const now = Date.now();
  await db.insert(config).values({ key: c.req.param('key')!, value: JSON.stringify(value), updatedAt: now, updatedBy: user.email })
    .onConflictDoUpdate({ target: config.key, set: { value: JSON.stringify(value), updatedAt: now, updatedBy: user.email } });
  return c.json({ ok: true });
});

app.post('/api/generate-post', requireAuth, requireRole('admin'), async (c) => {
  const { brand, platform, postType, tone, extraContext } = await c.req.json<{
    brand: string; platform: string; postType: string; tone: string; extraContext?: string;
  }>();

  const brandName = "O'Connor Agriculture";
  const platformGuide: Record<string, string> = {
    facebook: 'Conversational, community-focused, 1–3 paragraphs, include a call to action.',
    instagram: 'Visual storytelling, punchy, use 5–10 relevant hashtags at the end.',
    linkedin: 'Professional tone, highlight quality and sustainability, 2–3 paragraphs.',
  };
  const typeGuide: Record<string, string> = {
    product: 'Promote a specific product or range from the farm shop.',
    farm_update: 'Share a genuine update from life on the farm.',
    seasonal: 'Highlight seasonal availability or upcoming events.',
    recipe: 'Share a recipe idea using farm products.',
    community: 'Engage the local community with a warm, personal message.',
    educational: 'Educate followers about farming practices, animal welfare, or food quality.',
  };
  const toneGuide: Record<string, string> = {
    warm: 'Warm, authentic, and personal.',
    exciting: 'Exciting, bold, and energetic.',
    informative: 'Informative and clear.',
    humorous: 'Light-hearted and a little humorous.',
    heartfelt: 'Heartfelt and sincere.',
  };

  const prompt = `You are a social media manager for ${brandName}, a family-run Australian farm and butcher selling premium ethically-raised meat direct to customers.

Write a single ${platform} post. Guidelines:
- Platform: ${platformGuide[platform] ?? platform}
- Post type: ${typeGuide[postType] ?? postType}
- Tone: ${toneGuide[tone] ?? tone}
${extraContext ? `- Extra context: ${extraContext}` : ''}

Output ONLY the post text, nothing else. No commentary, no "Here is your post:", just the post itself.`;

  try {
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as keyof AiModels, {
      messages: [
        { role: 'system', content: `You are a social media copywriter for ${brandName}, an Australian farm and butcher. Write authentic, on-brand posts.` },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
    }) as { response?: string };
    return c.json({ post: result.response ?? '' });
  } catch {
    return c.json({ error: 'AI generation failed. Workers AI may not be available.' }, 500);
  }
});

app.post('/api/images/generate', requireAuth, async (c) => {
  const { prompt } = await c.req.json<{ prompt: string }>();
  if (!prompt) return c.json({ error: 'Prompt required' }, 400);
  try {
    let imageBytes: Uint8Array;
    // Use Cloudflare Workers AI (Flux 1 Schnell) — always available via the AI binding
    const result = await c.env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt }) as { image: string } | ReadableStream;
    if (result && typeof result === 'object' && 'image' in result) {
      const binary = atob(result.image);
      imageBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
    } else {
      const reader = (result as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; if (value) chunks.push(value); }
      const total = chunks.reduce((s, ch) => s + ch.length, 0);
      imageBytes = new Uint8Array(total);
      let off = 0;
      for (const chunk of chunks) { imageBytes.set(chunk, off); off += chunk.length; }
    }
    const key = `${crypto.randomUUID()}.png`;
    await c.env.IMAGES.put(key, imageBytes, { httpMetadata: { contentType: 'image/png' } });
    const baseUrl = new URL(c.req.url).origin;
    return c.json({ url: `${baseUrl}/images/${key}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Image generation failed';
    return c.json({ error: message }, 500);
  }
});

app.post('/api/images/upload', requireAuth, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const key = `${crypto.randomUUID()}.${ext}`;
  await c.env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const baseUrl = new URL(c.req.url).origin;
  return c.json({ url: `${baseUrl}/images/${key}`, key });
});

app.get('/images/*', async (c) => {
  const key = c.req.path.slice('/images/'.length);
  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' } });
});

export default app;

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env) => {
  if (event.cron === '0 8 * * *') {
    const { drizzle } = await import('drizzle-orm/d1');
    const { eq, and, gte, lt, desc, like } = await import('drizzle-orm');
    const { deliveryDays, orders, notifications, subscriptions, customers, products } = await import('@butcher/db');
    const { sendEmail, buildOrderEmail, getSubject } = await import('./lib/email');
    const db = drizzle(env.DB);

    // ── 1. Auto-generate subscription orders for due subscriptions ──
    // PREVIOUSLY: this loop did its own db.insert(orders) with a hardcoded
    // `paymentStatus: 'paid'` — no Square charge ever fired. That's how
    // Andrea McDonald received an unpaid 10kg box and asked Seamus where
    // the charge was. $2,210 of unpaid deliveries had built up across
    // 4 customers.
    //
    // NOW: route through the shared createSubscriptionOrder helper, which
    // tries to auto-charge a saved Square card and falls back to
    // `payment_status='pending_payment'` when no card exists. The order
    // still ships (forceStatus='confirmed') — Seamus delivers and collects
    // payment via the Send Square Invoice button in admin.
    try {
      const now = Date.now();
      const FREQ_MS: Record<string, number> = {
        weekly: 7 * 24 * 60 * 60 * 1000,
        fortnightly: 14 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
      };
      const { createSubscriptionOrder } = await import('./lib/subscriptions');

      const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, 'active'));

      for (const sub of activeSubs) {
        const interval = FREQ_MS[sub.frequency] ?? FREQ_MS.fortnightly;
        const lastGenerated = sub.lastOrderGeneratedAt ?? sub.createdAt;
        const nextDueDate = lastGenerated + interval;
        // Skip if not yet due (with 20% grace period)
        if (now < nextDueDate - interval * 0.2) continue;

        let customerId = sub.customerId;
        if (!customerId) {
          const [cust] = await db.select().from(customers).where(eq(customers.email, sub.email)).limit(1);
          if (!cust) continue;
          customerId = cust.id;
        }
        const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
        if (!customer) continue;

        let address = { line1: '', suburb: '', state: 'QLD', postcode: '' };
        try {
          const addrs = JSON.parse(customer.addresses ?? '[]') as Array<{ line1: string; suburb: string; state: string; postcode: string }>;
          if (addrs.length > 0) address = addrs[0];
        } catch {}
        if (!address.line1) {
          const [lastOrder] = await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)).limit(1);
          if (lastOrder) { try { address = JSON.parse(lastOrder.deliveryAddress) as typeof address; } catch {} }
        }
        if (!address.line1) continue;

        const boxId = sub.nextIsAlternate && sub.alternateBoxId ? sub.alternateBoxId : sub.boxId;
        const boxName = sub.nextIsAlternate && sub.alternateBoxName ? sub.alternateBoxName : sub.boxName;

        let [boxProduct] = await db.select().from(products).where(eq(products.id, boxId)).limit(1);
        if (!boxProduct) [boxProduct] = await db.select().from(products).where(eq(products.id, `prod-${boxId}-box`)).limit(1);
        if (!boxProduct) [boxProduct] = await db.select().from(products).where(like(products.name, `%${boxName.replace(' Box', '')}%Box%`)).limit(1);
        const price = boxProduct?.fixedPrice ?? 0;
        const resolvedBoxId = boxProduct?.id ?? boxId;
        if (!price) continue;

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
          env,
          // Ship the order even when no card on file — the truck rolls on
          // schedule and we send a Square Invoice to collect afterwards.
          forceStatus: 'confirmed',
        });
        if (!orderId) continue; // no upcoming delivery day

        const updateData: Record<string, unknown> = { lastOrderGeneratedAt: now, updatedAt: now };
        if (sub.alternateBoxId) updateData.nextIsAlternate = !sub.nextIsAlternate;
        await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, sub.id));
      }
    } catch (e) {
      console.error('Subscription auto-generate failed:', e);
    }

    // ── 2. Send "delivery tomorrow" notifications ──
    try {
      const result = await reconcileOutstandingSquarePayments(env, { limit: 50, deepSearch: true });
      if (result.reconciled > 0) console.log(`[square-reconcile] marked ${result.reconciled} orders paid`);
    } catch (e) {
      console.error('Square payment reconciliation failed:', e);
    }

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowDays = await db.select().from(deliveryDays)
      .where(and(eq(deliveryDays.active, true), gte(deliveryDays.date, tomorrow.getTime()), lt(deliveryDays.date, dayAfter.getTime())));

    for (const day of tomorrowDays) {
      const pendingOrders = await db.select().from(orders)
        .where(and(eq(orders.deliveryDayId, day.id), eq(orders.status, 'confirmed')));
      const { formatBrisbaneDate } = await import('./lib/time');
      const dateLabel = formatBrisbaneDate(day.date);

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
          trackingUrl: `${env.STOREFRONT_URL}/track/${order.id}`,
        };
        const result = await sendEmail({ apiKey: env.RESEND_API_KEY, from: env.FROM_EMAIL, to: order.customerEmail, subject: getSubject('day_before', emailData), html: buildOrderEmail('day_before', emailData) });
        const { notifyCustomer } = await import('./routes/push');
        await notifyCustomer(db, order.customerId, { title: "O'Connor \u2014 Delivery Tomorrow", body: `Your order arrives ${dateLabel}. Tap to track.`, url: `${env.STOREFRONT_URL}/track/${order.id}` }, env);
        await db.insert(notifications).values({ id: crypto.randomUUID(), orderId: order.id, customerId: order.customerId, type: 'day_before', status: result ? 'sent' : 'failed', recipientEmail: order.customerEmail, resendId: result?.id ?? null, sentAt: Date.now() });
      }
    }

    // ── 2.5 Sweep abandoned pending_payment orders ──
    // An order is created the moment the customer clicks "Place Order" on the
    // storefront, with status='pending_payment' and the day's order_count
    // incremented. If they never finish Square checkout, the order sits
    // forever, eats a maxOrders slot, and (if a stop was generated) shows on
    // the manifest. Sweep anything stuck > 12h here. Fix #1 (generate-stops
    // status filter) already prevents new phantom stops, but this is the
    // belt-and-braces cleanup for the orders themselves.
    try {
      const { stops: stopsTable } = await import('@butcher/db');
      const stale = await db.select().from(orders)
        .where(and(eq(orders.status, 'pending_payment'), lt(orders.createdAt, Date.now() - 12 * 60 * 60 * 1000)));
      for (const order of stale) {
        await db.update(orders).set({
          status: 'cancelled',
          paymentStatus: 'cancelled',
          internalNotes: (order.internalNotes ? order.internalNotes + '\n' : '')
            + '[auto-cancelled by daily cron: pending_payment > 12h, customer abandoned checkout]',
          updatedAt: Date.now(),
        }).where(eq(orders.id, order.id));
        await db.delete(stopsTable).where(eq(stopsTable.orderId, order.id));
        await db.update(deliveryDaysTable)
          .set({ orderCount: sql`${deliveryDaysTable.orderCount} - 1` })
          .where(and(eq(deliveryDaysTable.id, order.deliveryDayId), gte(deliveryDaysTable.orderCount, 1)));
        await db.update(customersTable).set({
          orderCount: sql`${customersTable.orderCount} - 1`,
          totalSpent: sql`${customersTable.totalSpent} - ${order.total}`,
          updatedAt: Date.now(),
        }).where(and(eq(customersTable.id, order.customerId), gte(customersTable.orderCount, 1)));
      }
      if (stale.length > 0) console.log(`[cron] auto-cancelled ${stale.length} stale pending_payment orders`);
    } catch (e) {
      console.error('Stale order sweep failed:', e);
    }

    // ── 3. Thursday meat audit email ──
    const today = new Date();
    if (today.getDay() === 4) { // Thursday
      try {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weekOrders = await db.select().from(orders)
          .where(and(gte(orders.createdAt, weekAgo), eq(orders.status, 'confirmed')));

        const salesByProduct: Record<string, { name: string; qty: number; weightKg: number; revenue: number }> = {};

        for (const order of weekOrders) {
          const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; weightKg?: number; weight?: number; lineTotal: number }>;
          for (const item of items) {
            const key = item.productName;
            if (!salesByProduct[key]) salesByProduct[key] = { name: item.productName, qty: 0, weightKg: 0, revenue: 0 };
            salesByProduct[key].qty += item.quantity ?? 1;
            salesByProduct[key].weightKg += item.weightKg ?? item.weight ?? 0;
            salesByProduct[key].revenue += item.lineTotal ?? 0;
          }
        }

        const sorted = Object.values(salesByProduct).sort((a, b) => b.revenue - a.revenue);
        const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);
        const totalOrders = weekOrders.length;

        const weekStart = new Date(weekAgo).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
        const weekEnd = today.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

        const rows = sorted.map((p) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500">${p.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${p.weightKg ? p.weightKg.toFixed(1) + ' kg' : '—'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${(p.revenue / 100).toFixed(2)}</td>
          </tr>`
        ).join('');

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
            <div style="background:#4E7732;padding:20px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:white;margin:0;font-size:20px">🥩 Weekly Meat Audit</h1>
              <p style="color:#E8F2DC;margin:4px 0 0;font-size:14px">${weekStart} — ${weekEnd}</p>
            </div>
            <div style="padding:20px 24px;background:#f9fafb;border:1px solid #eee;border-top:none">
              <div style="display:flex;gap:20px;margin-bottom:20px">
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Total Orders</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">${totalOrders}</p>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Total Revenue</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">$${(totalRevenue / 100).toFixed(2)}</p>
                </div>
                <div style="flex:1;background:white;padding:16px;border-radius:8px;border:1px solid #eee;text-align:center">
                  <p style="color:#888;font-size:12px;margin:0">Products Sold</p>
                  <p style="font-size:24px;font-weight:bold;margin:4px 0 0;color:#4E7732">${sorted.length}</p>
                </div>
              </div>
              <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #eee">
                <thead>
                  <tr style="background:#4E7732;color:white">
                    <th style="padding:10px 12px;text-align:left;font-size:13px">Product</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px">Qty</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px">Weight</th>
                    <th style="padding:10px 12px;text-align:right;font-size:13px">Revenue</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                  <tr style="background:#f0f0f0;font-weight:bold">
                    <td style="padding:10px 12px" colspan="3">Total</td>
                    <td style="padding:10px 12px;text-align:right">$${(totalRevenue / 100).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <p style="color:#999;font-size:11px;margin-top:16px;text-align:center">
                Automated weekly audit from O'Connor Agriculture
              </p>
            </div>
          </div>`;

        await sendEmail({
          apiKey: env.RESEND_API_KEY,
          from: env.FROM_EMAIL,
          to: 'oconnoragriculture@gmail.com',
          subject: `🥩 Weekly Meat Audit — ${weekStart} to ${weekEnd}`,
          html,
        });
        console.log('Thursday meat audit email sent');
      } catch (e) {
        console.error('Thursday audit email failed:', e);
      }
    }
  }
};
