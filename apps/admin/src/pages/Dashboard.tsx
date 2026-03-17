import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import { ShoppingBag, DollarSign, Truck, Package } from 'lucide-react';

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  outForDelivery: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ todayOrders: 0, todayRevenue: 0, pendingOrders: 0, outForDelivery: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [todayOrders, recent] = await Promise.all([
        api.orders.today() as Promise<Order[]>,
        api.orders.list() as Promise<Order[]>,
      ]);
      const pending = recent.filter((o) => ['confirmed', 'preparing', 'packed'].includes(o.status));
      const outForDelivery = recent.filter((o) => o.status === 'out_for_delivery');
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayFiltered = todayOrders.filter((o) => o.createdAt >= todayStart.getTime());
      setStats({
        todayOrders: todayFiltered.length,
        todayRevenue: todayFiltered.reduce((s, o) => s + (o.total ?? 0), 0),
        pendingOrders: pending.length,
        outForDelivery: outForDelivery.length,
      });
      setRecentOrders(recent.slice(0, 10));
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Package, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Out for Delivery', value: stats.outForDelivery, icon: Truck, color: 'bg-brand-light text-brand' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recent Orders</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" /></div>
        ) : (
          <div className="divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">#{(order.id ?? '').slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{order.customerName} · {order.items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatCurrency(order.total)}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
