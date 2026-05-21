import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql, and, gte, lt, lte, desc, inArray, eq, like, or } from 'drizzle-orm';
import { orders, deliveryDays, stops } from '@butcher/db';
import type { Env, AuthUser } from '../types';
import { requireRole } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

app.use('*', requireRole('admin'));

// GET /api/reports/revenue?period=weekly|fortnightly|monthly|yearly&from=timestamp&to=timestamp
app.get('/revenue', async (c) => {
  const db = drizzle(c.env.DB);
  const period = c.req.query('period') ?? 'weekly';
  const now = Date.now();

  // Determine date range
  let fromTs = Number(c.req.query('from') || 0);
  let toTs = Number(c.req.query('to') || now);

  // Default ranges if no explicit from/to
  if (!c.req.query('from')) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    switch (period) {
      case 'weekly':
        d.setDate(d.getDate() - 12 * 7); // last 12 weeks
        break;
      case 'fortnightly':
        d.setDate(d.getDate() - 12 * 14); // last 12 fortnights
        break;
      case 'monthly':
        d.setMonth(d.getMonth() - 12); // last 12 months
        break;
      case 'yearly':
        d.setFullYear(d.getFullYear() - 5); // last 5 years
        break;
    }
    fromTs = d.getTime();
  }

  // Fetch all paid orders in range (confirmed, delivered, out_for_delivery, packed, preparing)
  const rows = await db.select({
    id: orders.id,
    total: orders.total,
    subtotal: orders.subtotal,
    deliveryFee: orders.deliveryFee,
    gst: orders.gst,
    status: orders.status,
    items: orders.items,
    createdAt: orders.createdAt,
  })
    .from(orders)
    .where(and(gte(orders.createdAt, fromTs), lt(orders.createdAt, toTs)))
    .orderBy(desc(orders.createdAt));

  // Exclude cancelled/refunded for revenue, but count them separately
  const paidStatuses = ['confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered'];

  // Build period buckets
  const buckets = new Map<string, {
    label: string;
    from: number;
    to: number;
    revenue: number;
    orderCount: number;
    itemCount: number;
    avgOrderValue: number;
    deliveryFees: number;
    gst: number;
  }>();

  function getBucketKey(ts: number): { key: string; label: string; from: number; to: number } {
    const d = new Date(ts);
    if (period === 'yearly') {
      const year = d.getFullYear();
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year + 1, 0, 1).getTime();
      return { key: `${year}`, label: `${year}`, from: start, to: end };
    }
    if (period === 'monthly') {
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1).getTime();
      const end = new Date(year, month + 1, 1).getTime();
      const label = d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
      return { key: `${year}-${String(month).padStart(2, '0')}`, label, from: start, to: end };
    }
    // Weekly / fortnightly: align to Monday
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    if (period === 'fortnightly') {
      // Align to even week numbers
      const jan1 = new Date(monday.getFullYear(), 0, 1);
      const weekNum = Math.floor((monday.getTime() - jan1.getTime()) / (7 * 86400000));
      if (weekNum % 2 !== 0) monday.setDate(monday.getDate() - 7);
      const end = new Date(monday);
      end.setDate(end.getDate() + 14);
      const label = `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(end.getTime() - 86400000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      return { key: `fn-${monday.getTime()}`, label, from: monday.getTime(), to: end.getTime() };
    }

    // Weekly
    const end = new Date(monday);
    end.setDate(end.getDate() + 7);
    const label = `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${new Date(end.getTime() - 86400000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    return { key: `w-${monday.getTime()}`, label, from: monday.getTime(), to: end.getTime() };
  }

  for (const row of rows) {
    if (!paidStatuses.includes(row.status)) continue;
    const { key, label, from, to } = getBucketKey(row.createdAt);
    if (!buckets.has(key)) {
      buckets.set(key, { label, from, to, revenue: 0, orderCount: 0, itemCount: 0, avgOrderValue: 0, deliveryFees: 0, gst: 0 });
    }
    const b = buckets.get(key)!;
    b.revenue += row.total ?? 0;
    b.orderCount += 1;
    b.deliveryFees += row.deliveryFee ?? 0;
    b.gst += row.gst ?? 0;
    try {
      const items = JSON.parse(row.items) as unknown[];
      b.itemCount += items.length;
    } catch { /* ignore */ }
  }

  // Calculate averages
  for (const b of buckets.values()) {
    b.avgOrderValue = b.orderCount > 0 ? Math.round(b.revenue / b.orderCount) : 0;
  }

  // Sort buckets by date
  const sorted = [...buckets.values()].sort((a, b) => a.from - b.from);

  // Summary stats
  const totalRevenue = rows.filter(r => paidStatuses.includes(r.status)).reduce((s, r) => s + (r.total ?? 0), 0);
  const totalOrders = rows.filter(r => paidStatuses.includes(r.status)).length;
  const cancelledOrders = rows.filter(r => r.status === 'cancelled').length;
  const refundedOrders = rows.filter(r => r.status === 'refunded').length;

  // Top products
  const productSales = new Map<string, { name: string; revenue: number; qty: number }>();
  for (const row of rows) {
    if (!paidStatuses.includes(row.status)) continue;
    try {
      const items = JSON.parse(row.items) as Array<{ productName: string; lineTotal: number; quantity?: number; weight?: number }>;
      for (const item of items) {
        const key = item.productName;
        if (!productSales.has(key)) productSales.set(key, { name: key, revenue: 0, qty: 0 });
        const p = productSales.get(key)!;
        p.revenue += item.lineTotal ?? 0;
        p.qty += item.quantity ?? 1;
      }
    } catch { /* ignore */ }
  }
  const topProducts = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return c.json({
    period,
    from: fromTs,
    to: toTs,
    summary: {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      cancelledOrders,
      refundedOrders,
    },
    buckets: sorted,
    topProducts,
  });
});

// GET /api/reports/runs?from=&to=
// Groups orders by "run" (one stock pool = one run). Days that share a
// `stockPoolId` are merged into the same run, so e.g. Wed/Thu/Fri all
// pooling against Wed shows as a single 3-day run.
//
// This is the view Seamus uses to confirm "did everything for this run get
// paid?" — the Outstanding column flags pending_payment orders so we can
// chase them before the next run starts.
app.get('/runs', async (c) => {
  const db = drizzle(c.env.DB);
  const now = Date.now();

  let fromTs = Number(c.req.query('from') || 0);
  let toTs = Number(c.req.query('to') || now + 30 * 86400000); // include upcoming days too

  // Default = last 8 weeks of delivery days (covers ~4 fortnightly cycles).
  if (!c.req.query('from')) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 8 * 7);
    fromTs = d.getTime();
  }

  // 1. Fetch delivery days in range
  const days = await db.select({
    id: deliveryDays.id,
    date: deliveryDays.date,
    type: deliveryDays.type,
    stockPoolId: deliveryDays.stockPoolId,
    runStartedAt: deliveryDays.runStartedAt,
    runCompletedAt: deliveryDays.runCompletedAt,
    notes: deliveryDays.notes,
  })
    .from(deliveryDays)
    .where(and(gte(deliveryDays.date, fromTs), lte(deliveryDays.date, toTs)))
    .orderBy(desc(deliveryDays.date));

  if (days.length === 0) {
    return c.json({ from: fromTs, to: toTs, runs: [], summary: { totalPaid: 0, totalOutstanding: 0, totalOrders: 0, totalStops: 0, runCount: 0 } });
  }

  const dayIds = days.map((d) => d.id);

  // 2. Fetch orders for those days
  const dayOrders = await db.select({
    id: orders.id,
    deliveryDayId: orders.deliveryDayId,
    customerId: orders.customerId,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    total: orders.total,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    paymentIntentId: orders.paymentIntentId,
    createdAt: orders.createdAt,
  })
    .from(orders)
    .where(inArray(orders.deliveryDayId, dayIds));

  // 3. Fetch stops for those days
  const dayStops = await db.select({
    id: stops.id,
    deliveryDayId: stops.deliveryDayId,
    status: stops.status,
  })
    .from(stops)
    .where(inArray(stops.deliveryDayId, dayIds));

  // 4. Group days into runs. runId = stockPoolId ?? id.
  // Important: if day X is the pool source and day Y links to X, both share
  // runId = X. That keeps multi-day pooled runs together.
  type RunDay = typeof days[number];
  const runMap = new Map<string, { runId: string; days: RunDay[] }>();
  for (const d of days) {
    const runId = d.stockPoolId ?? d.id;
    if (!runMap.has(runId)) runMap.set(runId, { runId, days: [] });
    runMap.get(runId)!.days.push(d);
  }

  // Status statuses considered "paid revenue"
  const paidStatuses = new Set(['confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered']);

  const runs = [...runMap.values()].map(({ runId, days: runDays }) => {
    const sortedDays = [...runDays].sort((a, b) => a.date - b.date);
    const anchorDate = sortedDays[0].date;
    const lastDate = sortedDays[sortedDays.length - 1].date;
    const runDayIdSet = new Set(sortedDays.map((d) => d.id));

    const runOrders = dayOrders.filter((o) => runDayIdSet.has(o.deliveryDayId));
    const runStops = dayStops.filter((s) => runDayIdSet.has(s.deliveryDayId));

    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalCancelled = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    const customerSet = new Set<string>();
    const flags: string[] = [];

    for (const o of runOrders) {
      customerSet.add(o.customerId);
      if (o.paymentStatus === 'paid' || paidStatuses.has(o.status)) {
        totalPaid += o.total ?? 0;
        paidCount += 1;
      } else if (o.status === 'cancelled' || o.status === 'refunded') {
        totalCancelled += o.total ?? 0;
        cancelledCount += 1;
      } else {
        // pending_payment, awaiting bank transfer, etc.
        totalOutstanding += o.total ?? 0;
        pendingCount += 1;
      }
    }

    const deliveredStops = runStops.filter((s) => s.status === 'delivered').length;
    const flaggedStops = runStops.filter((s) => s.status === 'flagged' || s.status === 'failed').length;

    // Flag heuristics — surfaced as warning chips in the UI.
    if (totalOutstanding > 0) flags.push(`$${(totalOutstanding / 100).toFixed(2)} outstanding`);
    if (flaggedStops > 0) flags.push(`${flaggedStops} flagged stop${flaggedStops === 1 ? '' : 's'}`);
    // If the run is in the past (last day before today) and there are still
    // pending payments or undelivered stops, that's worth chasing.
    const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const isPast = lastDate < todayStart;
    if (isPast) {
      const undelivered = runStops.length - deliveredStops - flaggedStops;
      if (undelivered > 0) flags.push(`${undelivered} stop${undelivered === 1 ? '' : 's'} not delivered`);
    }

    // Status: in_progress / complete / upcoming
    let runStatus: 'upcoming' | 'in_progress' | 'complete';
    if (anchorDate > todayStart) {
      runStatus = 'upcoming';
    } else if (isPast && totalOutstanding === 0 && (runStops.length === 0 || deliveredStops + flaggedStops === runStops.length)) {
      runStatus = 'complete';
    } else {
      runStatus = 'in_progress';
    }

    return {
      runId,
      anchorDate,
      lastDate,
      dayCount: sortedDays.length,
      days: sortedDays.map((d) => ({ id: d.id, date: d.date, type: d.type })),
      totalPaid,
      totalOutstanding,
      totalCancelled,
      paidCount,
      pendingCount,
      cancelledCount,
      orderCount: runOrders.length,
      stopCount: runStops.length,
      deliveredStops,
      flaggedStops,
      customerCount: customerSet.size,
      flags,
      status: runStatus,
      // Order list — kept small so we don't bloat the payload. Sorted with
      // outstanding first so admin sees what to chase at the top.
      orders: runOrders
        .sort((a, b) => {
          const aPending = !(a.paymentStatus === 'paid' || paidStatuses.has(a.status));
          const bPending = !(b.paymentStatus === 'paid' || paidStatuses.has(b.status));
          if (aPending !== bPending) return aPending ? -1 : 1;
          return b.createdAt - a.createdAt;
        })
        .map((o) => ({
          id: o.id,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          total: o.total,
          status: o.status,
          paymentStatus: o.paymentStatus,
          hasPaymentIntent: Boolean(o.paymentIntentId && o.paymentIntentId !== ''),
        })),
    };
  });

  // Sort runs newest first
  runs.sort((a, b) => b.anchorDate - a.anchorDate);

  // Aggregate summary across all runs
  const summary = runs.reduce(
    (s, r) => {
      s.totalPaid += r.totalPaid;
      s.totalOutstanding += r.totalOutstanding;
      s.totalOrders += r.orderCount;
      s.totalStops += r.stopCount;
      s.runCount += 1;
      return s;
    },
    { totalPaid: 0, totalOutstanding: 0, totalOrders: 0, totalStops: 0, runCount: 0 }
  );

  return c.json({ from: fromTs, to: toTs, runs, summary });
});

// ── Sales export for bank-deposit reconciliation ─────────────────────────────
// GET /api/reports/sales-export?from=ms&to=ms
//
// Returns a CSV of every paid / invoiced / refunded order in the date range so
// the bookkeeper (Michelle / Bronny) can match bank deposit lines against
// the underlying customer payments. Michelle's exact ask: "we do not know
// what these deposit transactions relate to — please reconcile". The CSV
// gives her enough data to do that herself in a spreadsheet without bothering
// Seamus.
//
// Defaults to a 90-day window (covers one BAS quarter). Includes orders with
// any of the payment_statuses we'd expect to see in deposits:
//   - 'paid'         (charge went through Square or Stripe)
//   - 'invoice_sent' (Square invoice emailed; not yet paid)
//   - 'refunded' / 'partial_refund' (helps explain negative bank lines)
//
// Excluded: 'pending_payment', 'awaiting_payment', 'cancelled', 'failed' —
// none of these produce a bank deposit so they'd just be noise on Michelle's
// import.
//
// CSV columns are Xero/Excel-friendly. Dates are dd/mm/yyyy (AU format).
// Amounts are in dollars with 2dp. A UTF-8 BOM is prepended so Excel opens
// AU symbols and dollar signs correctly.
app.get('/sales-export', async (c) => {
  const db = drizzle(c.env.DB);
  const now = Date.now();

  let fromTs = Number(c.req.query('from') || 0);
  const toTs = Number(c.req.query('to') || now);

  // Default to last 90 days (one BAS quarter).
  if (!c.req.query('from')) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 90);
    fromTs = d.getTime();
  }

  const INCLUDED_PAYMENT_STATUSES = ['paid', 'invoice_sent', 'refunded', 'partial_refund'];

  const rows = await db.select({
    id: orders.id,
    customerName: orders.customerName,
    customerEmail: orders.customerEmail,
    total: orders.total,
    gst: orders.gst,
    paymentProvider: orders.paymentProvider,
    paymentStatus: orders.paymentStatus,
    paymentIntentId: orders.paymentIntentId,
    notes: orders.notes,
    status: orders.status,
    createdAt: orders.createdAt,
  }).from(orders)
    .where(and(
      gte(orders.createdAt, fromTs),
      lte(orders.createdAt, toTs),
      inArray(orders.paymentStatus, INCLUDED_PAYMENT_STATUSES),
    ))
    .orderBy(desc(orders.createdAt));

  // Brisbane-local dd/mm/yyyy. Workers run in UTC; Australia/Brisbane is +10
  // year-round (no DST), so add the offset and format from a UTC-shifted Date.
  const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
  const formatDateAU = (ms: number) => {
    const d = new Date(ms + BRISBANE_OFFSET_MS);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const formatDollars = (cents: number) => (cents / 100).toFixed(2);

  // RFC-4180 CSV: quote any field containing comma, double-quote, or newline,
  // and double-up any embedded quote.
  const csvField = (val: string | null | undefined) => {
    const s = val ?? '';
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csvRow = (fields: (string | number | null | undefined)[]) =>
    fields.map((f) => csvField(typeof f === 'number' ? String(f) : f as string | null)).join(',');

  const header = csvRow([
    'Date',
    'Customer',
    'Email',
    'Amount (AUD)',
    'GST included (AUD)',
    'Provider',
    'Payment status',
    'Order status',
    'Order ID',
    'Payment intent / charge ID',
    'Notes',
  ]);

  const body = rows.map((r) => csvRow([
    formatDateAU(r.createdAt),
    r.customerName,
    r.customerEmail,
    formatDollars(r.total),
    formatDollars(r.gst),
    r.paymentProvider,
    r.paymentStatus,
    r.status,
    r.id.slice(-8).toUpperCase(),
    r.paymentIntentId || '',
    r.notes ?? '',
  ]));

  // UTF-8 BOM keeps Excel happy with non-ASCII characters and dollar signs.
  const csv = '﻿' + [header, ...body].join('\r\n') + '\r\n';

  const fromLabel = formatDateAU(fromTs).replace(/\//g, '-');
  const toLabel = formatDateAU(toTs).replace(/\//g, '-');
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales-export_${fromLabel}_to_${toLabel}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});

// ── GET /api/reports/payouts ────────────────────────────────────────────────
// Square payout reconciliation. Michelle (Seamus's bookkeeper) gets a single
// deposit on the bank statement like "$537.42 from Square, 14 Apr" and has
// to work out which website orders that deposit represents. This endpoint
// pulls payouts straight from Square, fetches each payout's underlying
// entries (charges, fees, refunds), and matches every charge entry back to
// the originating O'Connor order using two strategies in order:
//
//   1. Direct: `orders.payment_intent_id = entry.payment_id`. Set by the
//      subscription auto-charge path in apps/api/src/lib/subscriptions.ts.
//
//   2. Note-based: every storefront / admin Square payment link writes
//      `O'Connor Agriculture — Order #ABCD1234` into `payment_note`. We
//      fetch the payment, parse the 8-char prefix out of the note, and
//      look up the order by `id LIKE '<prefix>%'`. Covers all the existing
//      non-subscription Square orders where payment_intent_id was never
//      stored back.
//
// Stripe support is intentionally out of scope here. The Stripe webhook
// (apps/api/src/routes/stripe.ts) currently doesn't write payment_intent.id
// onto the order row, so there's no reliable way to match Stripe charges
// to orders. None of the 60 orders flagged provider='stripe' have a
// payment_intent_id stored either — most predate the current payment flow.
// We'll add Stripe once the webhook stamps the payment intent ID.
app.get('/payouts', async (c) => {
  const SQUARE_API = 'https://connect.squareup.com/v2';
  const accessToken = c.env.SQUARE_ACCESS_TOKEN;
  const locationId = c.env.SQUARE_LOCATION_ID;
  if (!accessToken || !locationId) {
    return c.json({ error: 'Square not configured' }, 503);
  }

  const db = drizzle(c.env.DB);
  const now = Date.now();

  let fromTs = Number(c.req.query('from') || 0);
  const toTs = Number(c.req.query('to') || now);

  // Default to last 90 days (one BAS quarter) — matches the sales-export.
  if (!c.req.query('from')) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 90);
    fromTs = d.getTime();
  }

  // Square expects ISO-8601 with millisecond precision and a Z suffix.
  const beginTime = new Date(fromTs).toISOString();
  const endTime = new Date(toTs).toISOString();

  const squareGet = async (path: string) => {
    const res = await fetch(`${SQUARE_API}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
      },
    });
    return res.json() as Promise<any>;
  };

  try {
    // List payouts — sort descending so the freshest payout is at the top of
    // the response. limit=100 is the Square max; for a 90-day window that's
    // plenty (~3 payouts/week worst case).
    const payoutsResp = await squareGet(
      `/payouts?location_id=${encodeURIComponent(locationId)}` +
      `&begin_time=${encodeURIComponent(beginTime)}` +
      `&end_time=${encodeURIComponent(endTime)}` +
      `&sort_order=DESC&limit=100`,
    );
    if (payoutsResp.errors) {
      return c.json({ error: 'Square API error', details: payoutsResp.errors }, 502);
    }
    const squarePayouts = (payoutsResp.payouts ?? []) as Array<{
      id: string;
      status: string;
      arrival_date?: string;
      created_at?: string;
      amount_money?: { amount?: number; currency?: string };
      destination?: { type?: string };
      end_to_end_id?: string;
    }>;

    // Match payment_id → order. Two-pass: first try direct paymentIntentId
    // matches in one batched query; then for anything still unmatched, fetch
    // the Square payment and parse `Order #<prefix>` from the note.
    interface Entry {
      id: string;
      type: string;
      effectiveAt: string | undefined;
      amountCents: number;
      feeCents: number;
      paymentId: string | null;
      matchedOrder: null | {
        id: string;
        customerName: string;
        customerEmail: string;
        total: number;
        createdAt: number;
      };
      matchStrategy: 'payment_intent_id' | 'note' | null;
    }

    interface EnrichedPayout {
      id: string;
      status: string;
      arrivalDate: string | null;
      createdAt: string | null;
      amountCents: number;
      currency: string;
      destinationType: string | null;
      endToEndId: string | null;
      entries: Entry[];
      matchedCount: number;
      unmatchedCount: number;
      chargeCount: number;
    }

    // 1) Fetch entries for every payout in parallel.
    const entriesPerPayout = await Promise.all(
      squarePayouts.map(async (p) => {
        const r = await squareGet(`/payouts/${p.id}/payout-entries?limit=100`);
        return (r.payout_entries ?? []) as any[];
      }),
    );

    // 2) Collect every payment_id we see across all entries (CHARGE entries
    //    carry the underlying payment under several possible field names; we
    //    handle the documented ones).
    const paymentIdsSeen = new Set<string>();
    for (const entries of entriesPerPayout) {
      for (const e of entries) {
        const pid =
          e.type_charge_details?.payment_id ??
          e.type_refunded_charge_details?.payment_id ??
          e.payment_id ??
          null;
        if (pid) paymentIdsSeen.add(pid);
      }
    }

    // 3) Direct match: orders where payment_intent_id is in the seen set.
    //    inArray on an empty list explodes in drizzle, so guard for it.
    const directMatches = new Map<string, EnrichedPayout['entries'][number]['matchedOrder']>();
    if (paymentIdsSeen.size > 0) {
      const rows = await db.select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        total: orders.total,
        createdAt: orders.createdAt,
        paymentIntentId: orders.paymentIntentId,
      }).from(orders).where(inArray(orders.paymentIntentId, [...paymentIdsSeen]));
      for (const r of rows) {
        directMatches.set(r.paymentIntentId, {
          id: r.id,
          customerName: r.customerName,
          customerEmail: r.customerEmail,
          total: r.total,
          createdAt: r.createdAt,
        });
      }
    }

    // 4) For everything still unmatched, fetch the Square payment object and
    //    parse the `Order #XXXXXXXX` prefix out of `note`. We do these in
    //    parallel — Square's per-payment GET is fast and rate-limited per
    //    minute, not per second.
    const stillUnmatched = [...paymentIdsSeen].filter((pid) => !directMatches.has(pid));
    const notePrefixByPaymentId = new Map<string, string>();
    await Promise.all(
      stillUnmatched.map(async (pid) => {
        try {
          const r = await squareGet(`/payments/${pid}`);
          const note: string = r.payment?.note ?? '';
          // Format is `O'Connor Agriculture — Order #ABCD1234`. Be loose on
          // the prefix wording (em-dash variant, slight wording drift).
          const m = note.match(/Order\s*#\s*([A-Z0-9]{6,12})/i);
          if (m && m[1]) notePrefixByPaymentId.set(pid, m[1].toLowerCase());
        } catch {
          // Don't let a single payment fetch failure break the whole report.
        }
      }),
    );

    // 5) Resolve prefix → order. Build one OR query so we hit D1 once.
    const noteOrders = new Map<string, EnrichedPayout['entries'][number]['matchedOrder']>();
    const uniquePrefixes = [...new Set(notePrefixByPaymentId.values())];
    if (uniquePrefixes.length > 0) {
      const rows = await db.select({
        id: orders.id,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        total: orders.total,
        createdAt: orders.createdAt,
      }).from(orders).where(or(...uniquePrefixes.map((p) => like(orders.id, `${p}%`))));
      const byPrefix = new Map<string, typeof rows[number]>();
      for (const row of rows) {
        byPrefix.set(row.id.slice(0, 8), row);
      }
      for (const [pid, prefix] of notePrefixByPaymentId.entries()) {
        const r = byPrefix.get(prefix);
        if (r) {
          noteOrders.set(pid, {
            id: r.id,
            customerName: r.customerName,
            customerEmail: r.customerEmail,
            total: r.total,
            createdAt: r.createdAt,
          });
        }
      }
    }

    // 6) Stitch everything together.
    const enriched: EnrichedPayout[] = squarePayouts.map((p, i) => {
      const entries = entriesPerPayout[i].map((e: any): Entry => {
        const pid =
          e.type_charge_details?.payment_id ??
          e.type_refunded_charge_details?.payment_id ??
          e.payment_id ??
          null;
        let matched: Entry['matchedOrder'] = null;
        let strategy: Entry['matchStrategy'] = null;
        if (pid) {
          if (directMatches.has(pid)) {
            matched = directMatches.get(pid) ?? null;
            strategy = 'payment_intent_id';
          } else if (noteOrders.has(pid)) {
            matched = noteOrders.get(pid) ?? null;
            strategy = 'note';
          }
        }
        return {
          id: e.id,
          type: e.type,
          effectiveAt: e.effective_at,
          amountCents: e.amount_money?.amount ?? 0,
          feeCents: e.fee_amount_money?.amount ?? 0,
          paymentId: pid,
          matchedOrder: matched,
          matchStrategy: strategy,
        };
      });

      const chargeEntries = entries.filter((e) => e.paymentId);
      const matchedCount = chargeEntries.filter((e) => e.matchedOrder).length;

      return {
        id: p.id,
        status: p.status,
        arrivalDate: p.arrival_date ?? null,
        createdAt: p.created_at ?? null,
        amountCents: p.amount_money?.amount ?? 0,
        currency: p.amount_money?.currency ?? 'AUD',
        destinationType: p.destination?.type ?? null,
        endToEndId: p.end_to_end_id ?? null,
        entries,
        matchedCount,
        unmatchedCount: chargeEntries.length - matchedCount,
        chargeCount: chargeEntries.length,
      };
    });

    return c.json({
      provider: 'square',
      from: fromTs,
      to: toTs,
      payouts: enriched,
      stripe: {
        skipped: true,
        reason: 'Stripe webhook does not yet record payment_intent.id on orders — payout matching disabled until that is wired up.',
      },
    });
  } catch (e: any) {
    return c.json({ error: e?.message ?? 'Failed to load payouts' }, 500);
  }
});

export default app;
