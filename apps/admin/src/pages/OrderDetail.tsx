import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { Order, OrderStatus } from '@butcher/shared';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from '../lib/toast';

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    api.orders.get(orderId)
      .then((data) => setOrder(data as Order))
      .catch(() => {});
  }, [orderId]);

  const handleStatusChange = async (status: OrderStatus) => {
    if (!orderId) return;
    setSaving(true);
    try {
      await api.orders.updateStatus(orderId, status);
      setOrder((prev) => prev ? { ...prev, status } : prev);
      toast('Order status updated');
    } catch {
      toast('Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  if (!order) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/orders')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-brand">Order #{(orderId ?? '').slice(-8).toUpperCase()}</h1>
        <button onClick={handlePrint} className="ml-auto flex items-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          <Printer className="h-4 w-4" /> Print Packing List
        </button>
      </div>

      <div className="grid gap-6">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Status</h2>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              disabled={saving}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Customer</p><p className="font-medium">{order.customerName}</p></div>
            <div><p className="text-gray-500">Email</p><p className="font-medium">{order.customerEmail}</p></div>
            <div><p className="text-gray-500">Phone</p><p className="font-medium">{order.customerPhone ?? '—'}</p></div>
            <div>
              <p className="text-gray-500">Payment</p>
              <p className="font-medium">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  (order as any).paymentStatus === 'paid' ? 'bg-green-100 text-green-700'
                    : (order as any).paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-700'
                    : (order as any).paymentStatus === 'failed' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {((order as any).paymentStatus ?? 'pending').charAt(0).toUpperCase() + ((order as any).paymentStatus ?? 'pending').slice(1)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Delivery Address</h2>
          <p className="text-sm text-gray-700">
            {order.deliveryAddress.line1}{order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ''}<br />
            {order.deliveryAddress.suburb} {order.deliveryAddress.state} {order.deliveryAddress.postcode}
          </p>
          {order.notes && <p className="text-sm text-gray-500 mt-2 italic">Notes: {order.notes}</p>}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Items</h2>
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-xs uppercase border-b">
              <tr>
                <th className="pb-2 text-left">Product</th>
                <th className="pb-2 text-right">Qty/Weight</th>
                <th className="pb-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item, i) => {
                const isSub = item.productId?.startsWith('sub-') || (order.notes ?? '').toLowerCase().includes('subscription');
                return (
                  <tr key={i}>
                    <td className="py-2">
                      {item.productName}
                      {isSub && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Subscription</span>
                      )}
                      {(item as any).includeSoupBones && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Soup bones</span>
                      )}
                      {(item as any).includeOffal && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Offal</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-gray-500">
                      {(item.isMeatPack || item.quantity)
                        ? `x${item.quantity ?? 1}`
                        : (item.weightKg && typeof item.weightKg === 'number') ? `${item.weightKg}kg`
                          : (item.weight && typeof item.weight === 'number') ? `${item.weight >= 1000 ? `${(item.weight / 1000).toFixed(1)}kg` : `${item.weight}g`}`
                          : '—'}
                    </td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t text-sm">
              <tr><td colSpan={2} className="pt-2 text-gray-500">Subtotal</td><td className="pt-2 text-right">{formatCurrency(order.subtotal)}</td></tr>
              <tr><td colSpan={2} className="text-gray-500">Delivery</td><td className="text-right">{formatCurrency(order.deliveryFee)}</td></tr>
              <tr><td colSpan={2} className="text-gray-500">GST (inc.)</td><td className="text-right">{formatCurrency(order.gst)}</td></tr>
              <tr className="font-bold"><td colSpan={2} className="pt-2">Total</td><td className="pt-2 text-right text-brand">{formatCurrency(order.total)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
