import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql, and, gte, lt, desc } from 'drizzle-orm';
import { orders } from '@butcher/db';
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

export default app;
