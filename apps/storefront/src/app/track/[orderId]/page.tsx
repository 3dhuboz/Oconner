'use client';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatCurrency } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@butcher/shared';
import { Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending_payment: <Clock className="h-6 w-6" />,
  confirmed: <Package className="h-6 w-6" />,
  preparing: <Package className="h-6 w-6" />,
  packed: <Package className="h-6 w-6" />,
  out_for_delivery: <Truck className="h-6 w-6" />,
  delivered: <CheckCircle className="h-6 w-6" />,
  cancelled: <XCircle className="h-6 w-6" />,
};

const STATUS_STEPS = ['confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered'];

export default function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.orders.get(params.orderId)
      .then((data) => { setOrder(data as Order); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.orderId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-700 mb-2">Order Not Found</h1>
            <p className="text-gray-500">This order could not be found or you don't have permission to view it.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'gray';

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand">Track Order</h1>
          <p className="text-gray-500 text-sm mt-1">#{params.orderId.slice(-8).toUpperCase()}</p>
        </div>

        <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 bg-${statusColor}-50 text-${statusColor}-700`}>
          {STATUS_ICONS[order.status]}
          <div>
            <p className="font-semibold">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
            {order.status === 'delivered' && order.proofUrl && (
              <a href={order.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">View proof of delivery</a>
            )}
          </div>
        </div>

        {order.status !== 'cancelled' && order.status !== 'pending_payment' && (
          <div className="mb-8">
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i <= currentStep ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 ${i < currentStep ? 'bg-brand' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Confirmed</span><span>Preparing</span><span>Packed</span><span>En Route</span><span>Delivered</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Order Details</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.productName}</span>
                <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <hr />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span className="text-brand">{formatCurrency(order.total)}</span></div>
          </div>
          <hr />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Delivery Address</p>
            <p>{order.deliveryAddress.line1}{order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ''}</p>
            <p>{order.deliveryAddress.suburb} {order.deliveryAddress.state} {order.deliveryAddress.postcode}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
