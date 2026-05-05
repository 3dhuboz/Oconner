import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { OrderStatus } from '@butcher/shared';
import { DollarSign, ShoppingBag, TrendingUp, XCircle, Download, ChevronDown, ChevronRight, AlertTriangle, Package, CheckCircle2, Clock, Truck } from 'lucide-react';

type Period = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
type Tab = 'revenue' | 'runs';
type RangeWeeks = 4 | 8 | 12 | 0; // 0 = all time

interface Bucket {
  label: string;
  from: number;
  to: number;
  revenue: number;
  orderCount: number;
  itemCount: number;
  avgOrderValue: number;
  deliveryFees: number;
  gst: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  qty: number;
}

interface RevenueData {
  period: string;
  from: number;
  to: number;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    cancelledOrders: number;
    refundedOrders: number;
  };
  buckets: Bucket[];
  topProducts: TopProduct[];
}

interface RunOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  hasPaymentIntent: boolean;
}

interface Run {
  runId: string;
  anchorDate: number;
  lastDate: number;
  dayCount: number;
  days: { id: string; date: number; type: string }[];
  totalPaid: number;
  totalOutstanding: number;
  totalCancelled: number;
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
  orderCount: number;
  stopCount: number;
  deliveredStops: number;
  flaggedStops: number;
  customerCount: number;
  flags: string[];
  status: 'upcoming' | 'in_progress' | 'complete';
  orders: RunOrder[];
}

interface RunsData {
  from: number;
  to: number;
  runs: Run[];
  summary: {
    totalPaid: number;
    totalOutstanding: number;
    totalOrders: number;
    totalStops: number;
    runCount: number;
  };
}

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
const fmtDateLong = (ts: number) => new Date(ts).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('revenue');

  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b">
        <button
          onClick={() => setTab('revenue')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'revenue' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setTab('runs')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'runs' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          By Run
        </button>
      </div>

      {tab === 'revenue' ? <RevenueTab /> : <RunsTab />}
    </div>
  );
}

// ─── Revenue Tab (existing report) ───────────────────────────────────────────

function RevenueTab() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (api.reports.revenue(period) as Promise<RevenueData>)
      .then(setData)
      .catch((e) => console.error('Reports load failed:', e))
      .finally(() => setLoading(false));
  }, [period]);

  const exportCSV = () => {
    if (!data) return;
    const headers = ['Period', 'Revenue', 'Orders', 'Avg Order Value', 'Delivery Fees', 'GST', 'Items Sold'];
    const rows = data.buckets.map((b) => [
      b.label,
      (b.revenue / 100).toFixed(2),
      b.orderCount,
      (b.avgOrderValue / 100).toFixed(2),
      (b.deliveryFees / 100).toFixed(2),
      (b.gst / 100).toFixed(2),
      b.itemCount,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxRevenue = data ? Math.max(...data.buckets.map((b) => b.revenue), 1) : 1;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-brand">Revenue Reports</h1>
        <div className="flex items-center gap-2">
          {(['weekly', 'fortnightly', 'monthly', 'yearly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={exportCSV}
            disabled={!data || data.buckets.length === 0}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Revenue', value: formatCurrency(data.summary.totalRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
              { label: 'Total Orders', value: data.summary.totalOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
              { label: 'Avg Order Value', value: formatCurrency(data.summary.avgOrderValue), icon: TrendingUp, color: 'bg-brand-light text-brand' },
              { label: 'Cancelled / Refunded', value: `${data.summary.cancelledOrders} / ${data.summary.refundedOrders}`, icon: XCircle, color: 'bg-red-50 text-red-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Chart (bar chart) */}
          <div className="bg-white rounded-xl border p-5 mb-8">
            <h2 className="font-semibold mb-4">Revenue by {period === 'fortnightly' ? 'Fortnight' : period === 'yearly' ? 'Year' : period === 'monthly' ? 'Month' : 'Week'}</h2>
            {data.buckets.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No order data for this period.</p>
            ) : (
              <div className="space-y-2">
                {data.buckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="w-48 text-xs text-gray-500 truncate flex-shrink-0 text-right">{b.label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                      <div
                        className="bg-brand h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((b.revenue / maxRevenue) * 100, 2)}%` }}
                      >
                        {b.revenue / maxRevenue > 0.15 && (
                          <span className="text-xs text-white font-medium">{formatCurrency(b.revenue)}</span>
                        )}
                      </div>
                      {b.revenue / maxRevenue <= 0.15 && (
                        <span className="absolute left-[calc(max(2%,min(100%,var(--w))))] ml-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-medium"
                          style={{ left: `${Math.max((b.revenue / maxRevenue) * 100, 2) + 1}%` }}
                        >
                          {formatCurrency(b.revenue)}
                        </span>
                      )}
                    </div>
                    <div className="w-16 text-xs text-gray-400 flex-shrink-0">{b.orderCount} orders</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Period Breakdown Table */}
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b">
                <h2 className="font-semibold">Period Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Period</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Revenue</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Orders</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.buckets.map((b) => (
                      <tr key={b.label} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-700">{b.label}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(b.revenue)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{b.orderCount}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{formatCurrency(b.avgOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl border">
              <div className="p-5 border-b">
                <h2 className="font-semibold">Top Products by Revenue</h2>
              </div>
              <div className="divide-y">
                {data.topProducts.map((p, i) => (
                  <div key={p.name} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-700">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(p.revenue)}</p>
                      <p className="text-xs text-gray-400">{p.qty} sold</p>
                    </div>
                  </div>
                ))}
                {data.topProducts.length === 0 && (
                  <p className="text-gray-400 text-sm py-8 text-center">No product data available.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-center py-20">Failed to load report data.</p>
      )}
    </div>
  );
}

// ─── Runs Tab — total sales grouped by stock-pool run ────────────────────────

function RunsTab() {
  const [rangeWeeks, setRangeWeeks] = useState<RangeWeeks>(8);
  const [data, setData] = useState<RunsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Convert week range → from/to timestamps. 0 = all time (omit `from`).
  const range = useMemo(() => {
    if (rangeWeeks === 0) return { from: undefined as number | undefined };
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - rangeWeeks * 7);
    return { from: d.getTime() };
  }, [rangeWeeks]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    (api.reports.runs(range.from) as Promise<RunsData>)
      .then(setData)
      .catch((e) => {
        console.error('Runs report load failed:', e);
        setError(e?.message ?? 'Failed to load runs report');
      })
      .finally(() => setLoading(false));
  }, [range.from]);

  const toggleExpand = (runId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  };

  const exportCSV = () => {
    if (!data) return;
    const headers = ['Run start', 'Run end', 'Days', 'Paid revenue', 'Outstanding', 'Orders (paid)', 'Orders (pending)', 'Stops (delivered)', 'Stops (total)', 'Customers', 'Status', 'Flags'];
    const rows = data.runs.map((r) => [
      fmtDate(r.anchorDate),
      fmtDate(r.lastDate),
      r.dayCount,
      (r.totalPaid / 100).toFixed(2),
      (r.totalOutstanding / 100).toFixed(2),
      r.paidCount,
      r.pendingCount,
      r.deliveredStops,
      r.stopCount,
      r.customerCount,
      r.status,
      r.flags.join('; '),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.map((c) => typeof c === 'string' && c.includes(',') ? `"${c}"` : c).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runs-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand">Sales by Run</h1>
          <p className="text-sm text-gray-500 mt-0.5">One row per stock-pool run. Outstanding orders are flagged so nothing slips through.</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { w: 4 as RangeWeeks, label: '4 wks' },
            { w: 8 as RangeWeeks, label: '8 wks' },
            { w: 12 as RangeWeeks, label: '12 wks' },
            { w: 0 as RangeWeeks, label: 'All' },
          ].map(({ w, label }) => (
            <button
              key={w}
              onClick={() => setRangeWeeks(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                rangeWeeks === w ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={exportCSV}
            disabled={!data || data.runs.length === 0}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      ) : data ? (
        <>
          {/* Summary strip */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Paid', value: formatCurrency(data.summary.totalPaid), icon: DollarSign, color: 'bg-green-50 text-green-600' },
              { label: 'Outstanding', value: formatCurrency(data.summary.totalOutstanding), icon: AlertTriangle, color: data.summary.totalOutstanding > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400' },
              { label: 'Orders', value: data.summary.totalOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
              { label: 'Stops', value: data.summary.totalStops, icon: Truck, color: 'bg-brand-light text-brand' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Runs list */}
          {data.runs.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
              <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No delivery runs in the selected range.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="w-8" />
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Run dates</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Outstanding</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Orders</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Stops</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Customers</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.runs.map((r) => (
                      <RunRow
                        key={r.runId}
                        run={r}
                        expanded={expanded.has(r.runId)}
                        onToggle={() => toggleExpand(r.runId)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// ─── Run row + expandable order list ─────────────────────────────────────────

function RunRow({ run, expanded, onToggle }: { run: Run; expanded: boolean; onToggle: () => void }) {
  const dateLabel = run.dayCount === 1
    ? fmtDate(run.anchorDate)
    : `${fmtDate(run.anchorDate)} – ${fmtDate(run.lastDate)}`;

  const statusBadge = run.status === 'complete'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" /> Complete</span>
    : run.status === 'in_progress'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Clock className="h-3 w-3" /> In progress</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><Clock className="h-3 w-3" /> Upcoming</span>;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer hover:bg-gray-50 ${run.flags.length > 0 ? 'bg-amber-50/30' : ''}`}
      >
        <td className="pl-4 py-3 text-gray-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-800">{dateLabel}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {run.dayCount} day{run.dayCount === 1 ? '' : 's'}
            {run.flags.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {run.flags.join(' · ')}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(run.totalPaid)}</td>
        <td className={`px-4 py-3 text-right font-medium ${run.totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
          {run.totalOutstanding > 0 ? formatCurrency(run.totalOutstanding) : '—'}
        </td>
        <td className="px-4 py-3 text-right text-gray-600">
          {run.paidCount}
          {run.pendingCount > 0 && <span className="text-amber-700 font-medium"> / {run.pendingCount}</span>}
        </td>
        <td className="px-4 py-3 text-right text-gray-600">
          {run.stopCount > 0 ? `${run.deliveredStops} / ${run.stopCount}` : '—'}
        </td>
        <td className="px-4 py-3 text-right text-gray-600">{run.customerCount}</td>
        <td className="px-4 py-3">{statusBadge}</td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/50">
          <td colSpan={8} className="px-4 py-4">
            {/* Days strip */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {run.days.map((d) => (
                <span key={d.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.type === 'pickup' ? 'bg-purple-100 text-purple-700' : 'bg-brand-light text-brand'}`}>
                  {fmtDateLong(d.date)}{d.type === 'pickup' ? ' · Pickup' : ''}
                </span>
              ))}
            </div>

            {run.orders.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-2">No orders for this run yet.</p>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Customer</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Payment</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {run.orders.map((o) => {
                      const isPending = o.paymentStatus !== 'paid' && o.status !== 'delivered' && o.status !== 'confirmed' && o.status !== 'preparing' && o.status !== 'packed' && o.status !== 'out_for_delivery';
                      return (
                        <tr key={o.id} className={isPending ? 'bg-amber-50/40' : ''}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800">{o.customerName}</div>
                            <div className="text-gray-400 text-[11px]">{o.customerEmail}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              o.paymentStatus === 'paid' ? 'bg-green-100 text-green-700'
                                : o.paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-700'
                                : o.paymentStatus === 'failed' ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {(o.paymentStatus ?? 'pending').charAt(0).toUpperCase() + (o.paymentStatus ?? 'pending').slice(1)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(o.total)}</td>
                          <td className="px-3 py-2 text-right">
                            <Link
                              to={`/orders/${o.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-brand hover:underline text-[11px] font-medium"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
