import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql, and, gte, lt, lte, desc, inArray } from 'drizzle-orm';
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

export default app;
