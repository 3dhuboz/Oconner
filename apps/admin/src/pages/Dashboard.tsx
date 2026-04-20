import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { api, formatCurrency } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import { ShoppingBag, DollarSign, Truck, Package, Clock, CalendarDays, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import LiveDeliveryTracker from '../components/LiveDeliveryTracker';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  outForDelivery: number;
  todayOrders: number;
  todayRevenue: number;
  thisWeekOrders: number;
  thisWeekRevenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0, outForDelivery: 0, todayOrders: 0, todayRevenue: 0, thisWeekOrders: 0, thisWeekRevenue: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isAuth: boolean } | null>(null);
  const { signOut } = useClerk();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const allOrders = await api.orders.list() as Order[];

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();
      const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekMs = weekStart.getTime();

      // Only count paid/confirmed orders in stats (exclude unpaid/pending)
      const paidOrders = allOrders.filter((o) => (o as any).paymentStatus === 'paid' || o.status === 'delivered');
      const todayFiltered = paidOrders.filter((o) => o.createdAt >= todayMs);
      const weekFiltered = paidOrders.filter((o) => o.createdAt >= weekMs);
      const pending = paidOrders.filter((o) => ['confirmed', 'preparing', 'packed'].includes(o.status));
      const outForDelivery = paidOrders.filter((o) => o.status === 'out_for_delivery');

      setStats({
        totalOrders: paidOrders.length,
        totalRevenue: paidOrders.reduce((s, o) => s + (o.total ?? 0), 0),
        pendingOrders: pending.length,
        outForDelivery: outForDelivery.length,
        todayOrders: todayFiltered.length,
        todayRevenue: todayFiltered.reduce((s, o) => s + (o.total ?? 0), 0),
        thisWeekOrders: weekFiltered.length,
        thisWeekRevenue: weekFiltered.reduce((s, o) => s + (o.total ?? 0), 0),
      });
      setRecentOrders(paidOrders.slice(0, 10));
    } catch (e: any) {
      const msg = String(e?.message ?? 'Unknown error');
      // Auth-flavoured errors — token expired, role changed, etc.
      const isAuth = /unauth|forbidden|401|403/i.test(msg);
      setError({ message: msg, isAuth });
      // Leave stats at their previous values if this was a refresh; on first load they're 0.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    window.location.href = '/';
  };

  const cards = [
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Package, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Out for Delivery', value: stats.outForDelivery, icon: Truck, color: 'bg-brand-light text-brand' },
  ];

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-yellow-100 text-yellow-700',
    packed: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand mb-6">Dashboard</h1>
      {error && (
        <div className={`mb-4 rounded-xl border p-4 flex items-start gap-3 ${error.isAuth ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">
              {error.isAuth ? 'Your sign-in looks stale' : "Couldn't load dashboard data"}
            </p>
            <p className="text-sm mt-0.5">
              {error.isAuth
                ? 'The dashboard is showing zeros because your login session has expired or lost permission. Sign out and sign back in to refresh.'
                : error.message}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
              {error.isAuth && (
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Auto-hides when no driver run is in progress. */}
      <LiveDeliveryTracker />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold mt-0.5">{(loading || error) ? '—' :value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today & This Week summary */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Clock className="h-4 w-4" /> Today
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold">{(loading || error) ? '—' :stats.todayOrders}</p>
              <p className="text-xs text-gray-400">orders</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{(loading || error) ? '—' :formatCurrency(stats.todayRevenue)}</p>
              <p className="text-xs text-gray-400">revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <CalendarDays className="h-4 w-4" /> This Week
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold">{(loading || error) ? '—' :stats.thisWeekOrders}</p>
              <p className="text-xs text-gray-400">orders</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{(loading || error) ? '—' :formatCurrency(stats.thisWeekRevenue)}</p>
              <p className="text-xs text-gray-400">revenue</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link to="/orders" className="text-sm text-brand hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" /></div>
        ) : error ? (
          <div className="text-center py-10 text-gray-400 text-sm">Couldn't load recent orders.</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No orders yet</div>
        ) : (
          <div className="divide-y">
            {recentOrders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 block">
                <div>
                  <p className="font-medium text-sm text-brand">#{(order.id ?? '').slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{order.customerName} · {Array.isArray(order.items) ? order.items.length : 0} items</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {order.status?.replace(/_/g, ' ')}
                  </span>
                  <p className="font-medium text-sm">{formatCurrency(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
