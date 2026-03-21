import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@butcher/shared';
import { DollarSign, ShoppingBag, TrendingUp, XCircle, Download } from 'lucide-react';

type Period = 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

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

interface ReportData {
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

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (api.reports.revenue(period) as Promise<ReportData>)
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
