import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { Order, OrderStatus } from '@butcher/shared';
import { ArrowLeft, Printer, AlertTriangle, Pencil, X } from 'lucide-react';
import { toast } from '../lib/toast';
import AddressAutocomplete from '../components/AddressAutocomplete';

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];

interface DeliveryDayOption {
  id: string;
  date: number;
  maxOrders: number;
  orderCount: number;
}

const EMPTY_ADDRESS = { line1: '', line2: '', suburb: '', state: 'QLD', postcode: '' };

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

  const [confirmRefund, setConfirmRefund] = useState<OrderStatus | null>(null);
  const handleStatusChange = async (status: OrderStatus) => {
    if (!orderId) return;
    // Refund is special: marking the column as 'refunded' here does NOT move
    // money. Surface a confirmation modal so admin understands they still
    // need to issue the refund through Square (or whatever processor) first.
    if (status === 'refunded') {
      setConfirmRefund(status);
      return;
    }
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

  const confirmAndApplyRefund = async () => {
    if (!orderId || !confirmRefund) return;
    setSaving(true);
    try {
      await api.orders.updateStatus(orderId, confirmRefund);
      setOrder((prev) => prev ? { ...prev, status: confirmRefund } : prev);
      toast('Order marked as refunded');
    } catch {
      toast('Failed to update status', 'error');
    } finally {
      setSaving(false);
      setConfirmRefund(null);
    }
  };

  const handlePrint = () => window.print();

  // ── Edit modal state ───────────────────────────────────────────────────────
  // Seamus reported he couldn't amend an order on his phone (e.g. fix a wrong
  // email). The Orders list has an inline edit modal but its trigger button
  // is hidden on mobile, and OrderDetail had no edit at all. This adds a
  // focused edit sheet on OrderDetail for the most common mobile fixes:
  // customer name/email/phone, delivery day, address, internal notes.
  // Item-level edits stay on the desktop Orders list (they're rare and the
  // weight/qty controls don't fit a phone screen well).
  const [showEdit, setShowEdit] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDayOption[]>([]);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryDayId: '',
    address: EMPTY_ADDRESS,
    internalNotes: '',
  });

  const openEdit = async () => {
    if (!order) return;
    const addr = order.deliveryAddress ?? EMPTY_ADDRESS;
    setEditForm({
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      deliveryDayId: order.deliveryDayId ?? '',
      address: {
        line1: addr.line1 ?? '',
        line2: addr.line2 ?? '',
        suburb: addr.suburb ?? '',
        state: addr.state ?? 'QLD',
        postcode: addr.postcode ?? '',
      },
      internalNotes: (order as any).internalNotes ?? '',
    });
    // Fetch delivery days so the dropdown isn't empty when the sheet opens.
    try {
      const days = await api.deliveryDays.list() as DeliveryDayOption[];
      setDeliveryDays(days);
    } catch {
      // best-effort — sheet still opens without options if this fails
    }
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!orderId) return;
    if (!editForm.customerName.trim() || !editForm.customerEmail.trim()) {
      toast('Name and email are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.orders.update(orderId, {
        customerName: editForm.customerName.trim(),
        customerEmail: editForm.customerEmail.trim(),
        customerPhone: editForm.customerPhone.trim() || undefined,
        deliveryDayId: editForm.deliveryDayId || undefined,
        deliveryAddress: {
          line1: editForm.address.line1,
          line2: editForm.address.line2 || undefined,
          suburb: editForm.address.suburb,
          state: editForm.address.state,
          postcode: editForm.address.postcode,
        },
        internalNotes: editForm.internalNotes || undefined,
      }) as Order;
      setOrder(updated);
      setShowEdit(false);
      toast('Order updated');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to update order', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!order) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => navigate('/orders')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-brand">Order #{(orderId ?? '').slice(-8).toUpperCase()}</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openEdit} className="flex items-center gap-2 bg-brand text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors">
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
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
            <div><p className="text-gray-500">Email</p><p className="font-medium break-all">{order.customerEmail}</p></div>
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

      {confirmRefund && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 rounded-full p-2 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Mark order as refunded?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This only updates the status column — it does <strong>not</strong> move money.
                  Issue the actual refund in your <strong>Square dashboard first</strong>, then mark the order here.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmRefund(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={confirmAndApplyRefund} disabled={saving} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 font-medium">
                {saving ? 'Saving…' : 'Mark refunded'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Order sheet (mobile-friendly) ─────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start sm:items-center justify-center sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-xl min-h-screen sm:min-h-0">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-brand" /> Edit Order
                </h2>
                <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                      <input
                        value={editForm.customerName}
                        onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                      <input
                        type="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={editForm.customerEmail}
                        onChange={(e) => setEditForm((f) => ({ ...f, customerEmail: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input
                        type="tel"
                        value={editForm.customerPhone}
                        onChange={(e) => setEditForm((f) => ({ ...f, customerPhone: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Delivery Day</label>
                      <select
                        value={editForm.deliveryDayId}
                        onChange={(e) => setEditForm((f) => ({ ...f, deliveryDayId: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        {deliveryDays.length === 0 && <option value={editForm.deliveryDayId}>Loading days…</option>}
                        {deliveryDays.map((d) => (
                          <option key={d.id} value={d.id}>
                            {new Date(d.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} — {d.orderCount}/{d.maxOrders}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Delivery Address</p>
                  <AddressAutocomplete
                    value={editForm.address}
                    onChange={(addr) => setEditForm((f) => ({ ...f, address: addr }))}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Internal Notes</p>
                  <textarea
                    value={editForm.internalNotes}
                    onChange={(e) => setEditForm((f) => ({ ...f, internalNotes: e.target.value }))}
                    rows={3}
                    placeholder="Notes visible to staff only…"
                    className="w-full border rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>

                <p className="text-xs text-gray-400">
                  To change items, weights, or pricing, use the Orders list on a desktop.
                </p>
              </div>

              <div className="flex gap-3 p-4 sm:p-6 border-t sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowEdit(false)}
                  className="flex-1 border py-3 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 bg-brand text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
