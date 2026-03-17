import { useEffect, useState } from 'react';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { Order, OrderStatus } from '@butcher/shared';
import { Link } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { toast } from '../lib/toast';

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.orders.list(statusFilter === 'all' ? undefined : statusFilter)
      .then((data) => { setOrders(data as Order[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const filtered = search
    ? orders.filter((o) =>
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
        o.id?.toLowerCase().includes(search.toLowerCase()),
      )
    : orders;

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await api.orders.updateStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast(`Order status updated to ${ORDER_STATUS_LABELS[status] ?? status}`);
    } catch {
      toast('Failed to update order status', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Orders</h1>
      </div>

      <div className="bg-white rounded-xl border mb-6 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search by name, email, order ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No orders found</td></tr>
            ) : filtered.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/orders/${order.id}`} className="font-mono font-medium text-brand hover:underline">
                    #{(order.id ?? '').slice(-8).toUpperCase()}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-gray-400">{order.customerEmail}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{order.items.length}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.total)}</td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id!, e.target.value as OrderStatus)}
                    className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/orders/${order.id}`} className="text-brand hover:underline text-xs font-medium">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
