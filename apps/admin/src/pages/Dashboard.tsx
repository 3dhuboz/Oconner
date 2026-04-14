import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import { ShoppingBag, DollarSign, Truck, Package, Clock, CalendarDays } from 'lucide-react';

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

  useEffect(() => {
    const load = async () => {
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
      } catch (e) {
        console.error('Dashboard load failed:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold mt-0.5">{loading ? '—' : value}</p>
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
              <p className="text-2xl font-bold">{loading ? '—' : stats.todayOrders}</p>
              <p className="text-xs text-gray-400">orders</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{loading ? '—' : formatCurrency(stats.todayRevenue)}</p>
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
              <p className="text-2xl font-bold">{loading ? '—' : stats.thisWeekOrders}</p>
              <p className="text-xs text-gray-400">orders</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{loading ? '—' : formatCurrency(stats.thisWeekRevenue)}</p>
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
