import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, ORDER_STATUS_LABELS, API_URL } from '@butcher/shared';
import type { OrderStatus, PayoutsResponse, Payout, PayoutEntry } from '@butcher/shared';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { DollarSign, ShoppingBag, TrendingUp, XCircle, Download, ChevronDown, ChevronRight, AlertTriangle, Package, CheckCircle2, Clock, Truck, Landmark, Link2, HelpCircle } from 'lucide-react';

type Period = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
type Tab = 'revenue' | 'runs' | 'payouts';
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
  const [showBookkeeperExport, setShowBookkeeperExport] = useState(false);

  return (
    <div>
      <div className="flex items-end justify-between mb-6 border-b">
        <div className="flex items-center gap-1">
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
          <button
            onClick={() => setTab('payouts')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              tab === 'payouts' ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Landmark className="h-4 w-4" /> Bank Payouts
          </button>
        </div>
        {/*
          Bookkeeper export — surfaced near the tab bar so Michelle's quarterly
          "what does this deposit relate to" question can be answered in one
          click. Defaults to last 90 days (one BAS quarter).
        */}
        <button
          onClick={() => setShowBookkeeperExport(true)}
          className="mb-2 flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
          title="Download a CSV of paid orders for bank-deposit reconciliation"
        >
          <Download className="h-3.5 w-3.5" /> Export for Bookkeeper
        </button>
      </div>

      {showBookkeeperExport && <BookkeeperExportModal onClose={() => setShowBookkeeperExport(false)} />}

      {tab === 'revenue' && <RevenueTab />}
      {tab === 'runs' && <RunsTab />}
      {tab === 'payouts' && <PayoutsTab />}
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

// ── Bookkeeper export modal ──────────────────────────────────────────────────
// Built so the quarterly "what does this deposit relate to?" email from
// Michelle (Seamus's bookkeeper) can be answered with one click. Hits
// GET /api/reports/sales-export?from=...&to=... and triggers a CSV download
// via a blob URL — the worker streams the CSV directly so no client-side
// CSV-generation code is needed.
// ─── Payouts Tab (bank-deposit reconciliation) ───────────────────────────────
//
// Each Square payout is one deposit line on Michelle's bank statement. The
// API endpoint pulls payouts in the window, fetches their underlying entries,
// and matches every charge entry back to its O'Connor order via payment-intent
// ID or by parsing the `Order #ABCD1234` prefix out of the Square payment note.
// This tab surfaces the reconciliation so she can answer "which orders made
// up this $537.42 deposit?" in one click.

function PayoutsTab() {
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const [fromDate, setFromDate] = useState(toIso(ninetyDaysAgo));
  const [toDate, setToDate] = useState(toIso(now));
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // yyyy-mm-dd → Brisbane-local UTC ms (same offset trick as the CSV export).
      const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
      const fromMs = new Date(`${fromDate}T00:00:00Z`).getTime() - BRISBANE_OFFSET_MS;
      const toMs = new Date(`${toDate}T23:59:59Z`).getTime() - BRISBANE_OFFSET_MS;
      const resp = await api.reports.payouts(fromMs, toMs);
      setData(resp);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // load() captures fromDate/toDate from closure; re-run on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePayout = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalDeposited = useMemo(() => {
    if (!data) return 0;
    return data.payouts.reduce((sum, p) => sum + p.amountCents, 0);
  }, [data]);

  const totalMatched = useMemo(() => {
    if (!data) return 0;
    return data.payouts.reduce((sum, p) => sum + p.matchedCount, 0);
  }, [data]);

  const totalUnmatched = useMemo(() => {
    if (!data) return 0;
    return data.payouts.reduce((sum, p) => sum + p.unmatchedCount, 0);
  }, [data]);

  return (
    <div>
      {/* Date range + summary header */}
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid"
          >
            {loading ? 'Loading…' : 'Reload'}
          </button>
          {data && data.payouts.length > 0 && (
            <div className="ml-auto flex gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-500">Deposited</p>
                <p className="font-semibold text-gray-900">{formatCurrency(totalDeposited / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Charges matched</p>
                <p className="font-semibold text-green-700">{totalMatched}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unmatched</p>
                <p className={`font-semibold ${totalUnmatched > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{totalUnmatched}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stripe note — currently disabled; explain why so it's not confusing */}
      {data?.stripe?.skipped && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-xs mb-4 flex items-start gap-2">
          <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Stripe payouts not shown</p>
            <p className="opacity-80">{data.stripe.reason}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-center text-gray-500 py-12">Loading payouts…</div>
      )}

      {data && data.payouts.length === 0 && !loading && (
        <div className="bg-white border rounded-xl p-12 text-center text-gray-500">
          <Landmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700 mb-1">No payouts in this window</p>
          <p className="text-sm">Square hasn't deposited anything between {fromDate} and {toDate}.</p>
        </div>
      )}

      {data && data.payouts.map((p) => (
        <PayoutRow
          key={p.id}
          payout={p}
          expanded={expanded.has(p.id)}
          onToggle={() => togglePayout(p.id)}
        />
      ))}
    </div>
  );
}

function PayoutRow({ payout, expanded, onToggle }: { payout: Payout; expanded: boolean; onToggle: () => void }) {
  // arrival_date is YYYY-MM-DD in Square's response; render Brisbane-friendly.
  const arrival = payout.arrivalDate
    ? new Date(`${payout.arrivalDate}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '(no arrival date)';

  const totalFeesCents = payout.entries.reduce((s, e) => s + e.feeCents, 0);

  // Status colour cue. Square uses SENT/PAID/FAILED.
  const statusBadge = (() => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide';
    if (payout.status === 'PAID') return `${base} bg-green-50 text-green-700`;
    if (payout.status === 'SENT') return `${base} bg-blue-50 text-blue-700`;
    if (payout.status === 'FAILED') return `${base} bg-red-50 text-red-700`;
    return `${base} bg-gray-100 text-gray-600`;
  })();

  return (
    <div className="bg-white border rounded-xl mb-2 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <div>
            <div className="font-semibold text-gray-900">{formatCurrency(payout.amountCents / 100)}</div>
            <div className="text-xs text-gray-500">{arrival}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-500">Charges</div>
            <div className="font-medium text-gray-700">{payout.chargeCount}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Matched</div>
            <div className={`font-medium ${payout.unmatchedCount > 0 ? 'text-amber-700' : 'text-green-700'}`}>
              {payout.matchedCount}/{payout.chargeCount}
            </div>
          </div>
          <span className={statusBadge}>{payout.status}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3 max-w-md">
            <span className="text-gray-500">Payout ID</span>
            <span className="font-mono text-gray-700 truncate" title={payout.id}>{payout.id}</span>
            {payout.endToEndId && (
              <>
                <span className="text-gray-500">Bank reference</span>
                <span className="font-mono text-gray-700">{payout.endToEndId}</span>
              </>
            )}
            <span className="text-gray-500">Square fees</span>
            <span className="text-gray-700">{formatCurrency(totalFeesCents / 100)}</span>
          </div>

          {payout.entries.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2">No entries returned for this payout.</p>
          ) : (
            <div className="bg-white rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                    <th className="text-right px-3 py-2 font-medium">Fee</th>
                    <th className="text-left px-3 py-2 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {payout.entries.map((e) => <PayoutEntryRow key={e.id} entry={e} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PayoutEntryRow({ entry }: { entry: PayoutEntry }) {
  const order = entry.matchedOrder;
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-gray-700">
        <span className="font-mono text-xs text-gray-500">{entry.type}</span>
      </td>
      <td className="px-3 py-2 text-right text-gray-900 font-medium">
        {formatCurrency(entry.amountCents / 100)}
      </td>
      <td className="px-3 py-2 text-right text-gray-500">
        {entry.feeCents > 0 ? `-${formatCurrency(entry.feeCents / 100)}` : '—'}
      </td>
      <td className="px-3 py-2">
        {order ? (
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-1.5 text-brand hover:underline"
            title={entry.matchStrategy === 'note' ? 'Matched via Square payment note' : 'Matched via payment-intent ID'}
          >
            <Link2 className="h-3.5 w-3.5" />
            {order.customerName} <span className="text-gray-400 text-xs">#{order.id.slice(0, 8).toUpperCase()}</span>
          </Link>
        ) : entry.paymentId ? (
          <span className="text-amber-700 text-xs inline-flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Unmatched
            <span className="font-mono text-gray-400">{entry.paymentId.slice(0, 12)}…</span>
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

function BookkeeperExportModal({ onClose }: { onClose: () => void }) {
  // Default the date range to the last 90 days (one BAS quarter). Stored as
  // yyyy-mm-dd strings so the <input type="date"> binds cleanly.
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const [fromDate, setFromDate] = useState(toIso(ninetyDaysAgo));
  const [toDate, setToDate] = useState(toIso(now));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The shared api helper only handles JSON responses; CSV needs a raw fetch
  // with the Clerk Bearer token attached manually. Pull the token getter
  // directly from Clerk rather than reaching through window.Clerk.
  const { getToken } = useClerkAuth();

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);
    try {
      // The yyyy-mm-dd from <input type="date"> is a calendar day in the
      // user's tz. Convert to a Brisbane-local window in UTC ms so the
      // server's createdAt filter (UTC ms) catches everything captured
      // 00:00–23:59 Brisbane time on those dates.
      const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
      const fromMs = new Date(`${fromDate}T00:00:00Z`).getTime() - BRISBANE_OFFSET_MS;
      const toMs   = new Date(`${toDate}T23:59:59Z`).getTime()   - BRISBANE_OFFSET_MS;

      const token = await getToken();
      const url = `${API_URL}/api/reports/sales-export?from=${fromMs}&to=${toMs}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Server returned ${res.status}: ${t.slice(0, 120)}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `sales-export_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-brand" /> Export for Bookkeeper
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Downloads a CSV of every paid (and invoice-sent) order in the date range.
          Use it to match bank deposit lines against customer orders.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">Includes payment statuses:</p>
            <p>Paid · Invoice sent · Refunded · Partial refund</p>
            <p className="text-gray-400 mt-1.5">Pending / cancelled / failed orders are excluded — they don't produce bank deposits.</p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || !fromDate || !toDate}
            className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Generating…' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
