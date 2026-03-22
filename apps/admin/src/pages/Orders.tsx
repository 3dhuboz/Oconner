import { useEffect, useState } from 'react';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { Order, OrderStatus } from '@butcher/shared';
import { Link } from 'react-router-dom';
import { Search, Plus, X, Trash2, Pencil, Receipt } from 'lucide-react';
import { toast } from '../lib/toast';
import AddressAutocomplete from '../components/AddressAutocomplete';

interface Product {
  id: string;
  name: string;
  category: string;
  pricePerKg: number | null;
  fixedPrice: number | null;
  active: boolean;
}

interface DeliveryDay {
  id: string;
  date: number;
  maxOrders: number;
  orderCount: number;
  active: boolean;
  notes?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  weightKg?: number;
  quantity?: number;
  pricePerKg?: number;
  fixedPrice?: number;
  lineTotal: number;
}

const STATUSES: OrderStatus[] = ['pending_payment', 'confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'invoice', label: 'Invoice' },
];

const EMPTY_FORM = {
  customerName: '', customerEmail: '', customerPhone: '',
  deliveryDayId: '', status: 'confirmed' as OrderStatus,
  paymentStatus: 'paid',
  internalNotes: '', deliveryFee: 0,
  address: { line1: '', line2: '', suburb: '', state: 'QLD', postcode: '' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemWeight, setItemWeight] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editSelectedProduct, setEditSelectedProduct] = useState('');
  const [editItemWeight, setEditItemWeight] = useState('');
  const [editItemQty, setEditItemQty] = useState('1');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.orders.list(statusFilter === 'all' ? undefined : statusFilter)
      .then((data) => { setOrders(data as Order[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setItems([]);
    setSelectedProduct('');
    setItemWeight('');
    setItemQty('1');
    Promise.all([api.products.list() as Promise<Product[]>, api.deliveryDays.list() as Promise<DeliveryDay[]>])
      .then(([prods, days]) => {
        setProducts((prods as Product[]).filter((p) => p.active !== false));
        setDeliveryDays(days as DeliveryDay[]);
      }).catch(() => {});
    setShowCreate(true);
  };

  const currentProduct = products.find((p) => p.id === selectedProduct);
  const isWeightBased = !!(currentProduct && currentProduct.pricePerKg != null);

  const addItem = () => {
    if (!currentProduct) return;
    let lineTotal = 0;
    let weightKg: number | undefined;
    let quantity: number | undefined;
    if (isWeightBased) {
      weightKg = parseFloat(itemWeight);
      if (!weightKg || weightKg <= 0) return;
      lineTotal = weightKg * (currentProduct.pricePerKg ?? 0);
    } else {
      quantity = parseInt(itemQty, 10);
      if (!quantity || quantity <= 0) return;
      lineTotal = quantity * (currentProduct.fixedPrice ?? 0);
    }
    setItems((prev) => [...prev, {
      productId: currentProduct.id,
      productName: currentProduct.name,
      ...(isWeightBased ? { weightKg, pricePerKg: currentProduct.pricePerKg ?? 0 } : { quantity, fixedPrice: currentProduct.fixedPrice ?? 0 }),
      lineTotal,
    }]);
    setSelectedProduct('');
    setItemWeight('');
    setItemQty('1');
  };

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const total = subtotal + (form.deliveryFee || 0);

  const handleCreate = async () => {
    if (!form.customerName || !form.customerEmail || !form.deliveryDayId) {
      toast('Name, email and delivery day are required', 'error'); return;
    }
    if (items.length === 0) { toast('Add at least one item', 'error'); return; }
    if (!form.address.line1 || !form.address.suburb || !form.address.postcode) {
      toast('Delivery address is required', 'error'); return;
    }
    setCreating(true);
    try {
      const result = await api.orders.create({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone || undefined,
        deliveryDayId: form.deliveryDayId,
        items,
        deliveryAddress: { line1: form.address.line1, line2: form.address.line2 || undefined, suburb: form.address.suburb, state: form.address.state, postcode: form.address.postcode },
        subtotal,
        deliveryFee: form.deliveryFee,
        gst: 0,
        total,
        status: form.status,
        paymentStatus: form.paymentStatus,
        internalNotes: form.internalNotes || undefined,
      }) as { id: string };
      const updated = await api.orders.list(statusFilter === 'all' ? undefined : statusFilter) as Order[];
      setOrders(updated);
      setShowCreate(false);
      toast(`Order #${result.id.slice(-8).toUpperCase()} created`);
    } catch (e: any) {
      toast(e?.message ?? 'Failed to create order', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filtered = orders.filter((o) => {
    if (search && !(
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (fulfillmentFilter !== 'all' && (o as any).fulfillmentType !== fulfillmentFilter) return false;
    return true;
  });

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await api.orders.updateStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast(`Order status updated to ${ORDER_STATUS_LABELS[status] ?? status}`);
    } catch {
      toast('Failed to update order status', 'error');
    }
  };

  const setAddr = (k: keyof typeof form.address, v: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const setEditAddr = (k: keyof typeof editForm.address, v: string) =>
    setEditForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const editCurrentProduct = products.find((p) => p.id === editSelectedProduct);
  const editIsWeightBased = !!(editCurrentProduct && editCurrentProduct.pricePerKg != null);

  const addEditItem = () => {
    if (!editCurrentProduct) return;
    let lineTotal = 0;
    let weightKg: number | undefined;
    let quantity: number | undefined;
    if (editIsWeightBased) {
      weightKg = parseFloat(editItemWeight);
      if (!weightKg || weightKg <= 0) return;
      lineTotal = weightKg * (editCurrentProduct.pricePerKg ?? 0);
    } else {
      quantity = parseInt(editItemQty, 10);
      if (!quantity || quantity <= 0) return;
      lineTotal = quantity * (editCurrentProduct.fixedPrice ?? 0);
    }
    setEditItems((prev) => [...prev, {
      productId: editCurrentProduct.id,
      productName: editCurrentProduct.name,
      ...(editIsWeightBased ? { weightKg, pricePerKg: editCurrentProduct.pricePerKg ?? 0 } : { quantity, fixedPrice: editCurrentProduct.fixedPrice ?? 0 }),
      lineTotal,
    }]);
    setEditSelectedProduct('');
    setEditItemWeight('');
    setEditItemQty('1');
  };

  const editSubtotal = editItems.reduce((s, i) => s + i.lineTotal, 0);
  const editTotal = editSubtotal + (editForm.deliveryFee || 0);

  const openEdit = (order: Order) => {
    const addr = order.deliveryAddress ?? { line1: '', line2: '', suburb: '', state: 'QLD', postcode: '' };
    setEditForm({
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      deliveryDayId: order.deliveryDayId ?? '',
      status: order.status as OrderStatus,
      paymentStatus: (order as any).paymentStatus ?? 'paid',
      internalNotes: order.internalNotes ?? '',
      deliveryFee: order.deliveryFee ?? 0,
      address: {
        line1: addr.line1 ?? '', line2: addr.line2 ?? '',
        suburb: addr.suburb ?? '', state: addr.state ?? 'QLD', postcode: addr.postcode ?? '',
      },
    });
    // Convert order items to edit format
    const orderItems: OrderItem[] = (order.items ?? []).map((item: any) => ({
      productId: item.productId ?? '',
      productName: item.productName ?? '',
      weightKg: item.weight ? item.weight / 1000 : item.weightKg,
      quantity: item.quantity,
      pricePerKg: item.pricePerKg,
      fixedPrice: item.fixedPrice,
      lineTotal: item.lineTotal ?? 0,
    }));
    setEditItems(orderItems);
    setEditSelectedProduct('');
    setEditItemWeight('');
    setEditItemQty('1');
    Promise.all([api.products.list() as Promise<Product[]>, api.deliveryDays.list() as Promise<DeliveryDay[]>])
      .then(([prods, days]) => {
        setProducts((prods as Product[]).filter((p) => p.active !== false));
        setDeliveryDays(days as DeliveryDay[]);
      }).catch(() => {});
    setEditingOrder(order);
  };

  const handleEdit = async () => {
    if (!editingOrder?.id) return;
    if (!editForm.customerName || !editForm.customerEmail) {
      toast('Name and email are required', 'error'); return;
    }
    if (editItems.length === 0) { toast('Add at least one item', 'error'); return; }
    setSaving(true);
    try {
      const updated = await api.orders.update(editingOrder.id, {
        customerName: editForm.customerName,
        customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone || undefined,
        deliveryDayId: editForm.deliveryDayId,
        items: editItems,
        deliveryAddress: { line1: editForm.address.line1, line2: editForm.address.line2 || undefined, suburb: editForm.address.suburb, state: editForm.address.state, postcode: editForm.address.postcode },
        subtotal: editSubtotal,
        deliveryFee: editForm.deliveryFee,
        gst: 0,
        total: editTotal,
        status: editForm.status,
        internalNotes: editForm.internalNotes || undefined,
      }) as Order;
      setOrders((prev) => prev.map((o) => o.id === editingOrder.id ? updated : o));
      setEditingOrder(null);
      toast('Order updated successfully');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to update order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await api.orders.remove(deleteTarget.id);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast('Order deleted');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to delete order', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const sendInvoice = async (order: Order) => {
    setInvoiceSending(order.id);
    try {
      const result = await api.post<{ ok: boolean; method: string; url?: string }>(`/api/orders/${order.id}/invoice`, {});
      if (result.url) {
        toast(`Payment link sent to ${order.customerEmail}`);
      } else {
        toast(`Invoice sent to ${order.customerEmail}`);
      }
    } catch (e: any) {
      toast(e?.message ?? 'Failed to send invoice', 'error');
    } finally {
      setInvoiceSending(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Orders</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Order
        </button>
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
        <select
          value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value as 'all' | 'delivery' | 'pickup')}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">All Types</option>
          <option value="delivery">🚚 Delivery</option>
          <option value="pickup">🏪 Pickup</option>
        </select>
      </div>

      {/* ── Mobile card layout ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center py-10 text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-gray-400">No orders found</p>
        ) : filtered.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="block bg-white rounded-xl border p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-medium text-brand text-sm">#{(order.id ?? '').slice(-8).toUpperCase()}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                order.status === 'delivered' ? 'bg-green-100 text-green-700'
                  : order.status === 'cancelled' || order.status === 'refunded' ? 'bg-red-100 text-red-700'
                  : order.status === 'out_for_delivery' ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
            </div>
            <p className="font-medium text-sm">{order.customerName}</p>
            <p className="text-xs text-gray-400">{order.customerEmail}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
              <span className="font-semibold text-sm">{formatCurrency(order.total)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Desktop table layout ── */}
      <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
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
                  {(order as any).fulfillmentType === 'pickup' && (
                    <span className="ml-1.5 text-[10px] font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Pickup</span>
                  )}
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
                  <div className="flex items-center gap-2">
                    <Link to={`/orders/${order.id}`} className="text-brand hover:underline text-xs font-medium">View</Link>
                    <button onClick={() => openEdit(order)} className="text-gray-400 hover:text-brand transition-colors" title="Edit order">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {order.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => sendInvoice(order)}
                        disabled={invoiceSending === order.id}
                        className="text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                        title="Send Square invoice"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(order)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete order">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit Order Modal ── */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-brand" /> Edit Order #{(editingOrder.id ?? '').slice(-8).toUpperCase()}
                </h2>
                <button onClick={() => setEditingOrder(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                      <input value={editForm.customerName} onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                      <input type="email" value={editForm.customerEmail} onChange={(e) => setEditForm((f) => ({ ...f, customerEmail: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input value={editForm.customerPhone} onChange={(e) => setEditForm((f) => ({ ...f, customerPhone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Delivery Day</label>
                      <select value={editForm.deliveryDayId} onChange={(e) => setEditForm((f) => ({ ...f, deliveryDayId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="">Select delivery day…</option>
                        {deliveryDays.map((d) => (
                          <option key={d.id} value={d.id}>
                            {new Date(d.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} — {d.orderCount}/{d.maxOrders} orders
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Order Items</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={editSelectedProduct}
                      onChange={(e) => { setEditSelectedProduct(e.target.value); setEditItemWeight(''); setEditItemQty('1'); }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Add product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.pricePerKg != null ? `$${p.pricePerKg}/kg` : `$${p.fixedPrice} ea`}
                        </option>
                      ))}
                    </select>
                    {editCurrentProduct && (
                      editIsWeightBased ? (
                        <input type="number" placeholder="kg" value={editItemWeight} onChange={(e) => setEditItemWeight(e.target.value)} step="0.1" min="0.1" className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                      ) : (
                        <input type="number" placeholder="qty" value={editItemQty} onChange={(e) => setEditItemQty(e.target.value)} min="1" className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                      )
                    )}
                    <button onClick={addEditItem} disabled={!editCurrentProduct} className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-mid transition-colors">
                      Add
                    </button>
                  </div>
                  {editCurrentProduct && (
                    <p className="text-xs text-gray-400 mb-2">
                      {editIsWeightBased
                        ? `$${editCurrentProduct.pricePerKg}/kg${editItemWeight ? ` → ${formatCurrency(parseFloat(editItemWeight || '0') * (editCurrentProduct.pricePerKg ?? 0))}` : ''}`
                        : `$${editCurrentProduct.fixedPrice} each${editItemQty ? ` → ${formatCurrency(parseInt(editItemQty || '1') * (editCurrentProduct.fixedPrice ?? 0))}` : ''}`}
                    </p>
                  )}
                  {editItems.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden divide-y">
                      {editItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-50">
                          <div>
                            <p className="text-sm font-medium">{item.productName}</p>
                            <p className="text-xs text-gray-400">
                              {item.weightKg ? `${item.weightKg}kg${item.pricePerKg ? ` @ $${item.pricePerKg}/kg` : ''}` : `${item.quantity ?? 1}x${item.fixedPrice ? ` @ $${item.fixedPrice} ea` : ''}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{formatCurrency(item.lineTotal)}</span>
                            <button onClick={() => setEditItems((prev) => prev.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">No items — add at least one</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Delivery Address</p>
                  <AddressAutocomplete value={editForm.address} onChange={(addr) => setEditForm((f) => ({ ...f, address: addr }))} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Summary</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Order Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as OrderStatus }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Payment Status</label>
                      <select value={editForm.paymentStatus} onChange={(e) => setEditForm((f) => ({ ...f, paymentStatus: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        {PAYMENT_STATUSES.map((ps) => <option key={ps.value} value={ps.value}>{ps.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Delivery Fee ($)</label>
                      <input type="number" value={editForm.deliveryFee} onChange={(e) => setEditForm((f) => ({ ...f, deliveryFee: parseFloat(e.target.value) || 0 }))} step="0.01" min="0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
                    <textarea value={editForm.internalNotes} onChange={(e) => setEditForm((f) => ({ ...f, internalNotes: e.target.value }))} rows={2} placeholder="Notes visible to staff only…" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(editSubtotal)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(editForm.deliveryFee)}</span></div>
                    <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-200"><span>Total</span><span className="text-brand">{formatCurrency(editTotal)}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t">
                <button onClick={() => setEditingOrder(null)} className="flex-1 border py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleEdit} disabled={saving} className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid transition-colors">
                  {saving ? 'Saving…' : `Save Changes — ${formatCurrency(editTotal)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-brand" /> Create Manual Order
                </h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                      <input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="Jane Smith" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                      <input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} placeholder="jane@example.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} placeholder="0400 000 000" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Delivery Day *</label>
                      <select value={form.deliveryDayId} onChange={(e) => setForm((f) => ({ ...f, deliveryDayId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        <option value="">Select delivery day…</option>
                        {deliveryDays.map((d) => (
                          <option key={d.id} value={d.id}>
                            {new Date(d.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} — {d.orderCount}/{d.maxOrders} orders
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Order Items</p>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={selectedProduct}
                      onChange={(e) => { setSelectedProduct(e.target.value); setItemWeight(''); setItemQty('1'); }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.pricePerKg != null ? `$${p.pricePerKg}/kg` : `$${p.fixedPrice} ea`}
                        </option>
                      ))}
                    </select>
                    {currentProduct && (
                      isWeightBased ? (
                        <input type="number" placeholder="kg" value={itemWeight} onChange={(e) => setItemWeight(e.target.value)} step="0.1" min="0.1" className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                      ) : (
                        <input type="number" placeholder="qty" value={itemQty} onChange={(e) => setItemQty(e.target.value)} min="1" className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                      )
                    )}
                    <button onClick={addItem} disabled={!currentProduct} className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-mid transition-colors">
                      Add
                    </button>
                  </div>
                  {currentProduct && (
                    <p className="text-xs text-gray-400 mb-2">
                      {isWeightBased
                        ? `$${currentProduct.pricePerKg}/kg${itemWeight ? ` → ${formatCurrency(parseFloat(itemWeight || '0') * (currentProduct.pricePerKg ?? 0))}` : ''}`
                        : `$${currentProduct.fixedPrice} each${itemQty ? ` → ${formatCurrency(parseInt(itemQty || '1') * (currentProduct.fixedPrice ?? 0))}` : ''}`}
                    </p>
                  )}
                  {items.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden divide-y">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-50">
                          <div>
                            <p className="text-sm font-medium">{item.productName}</p>
                            <p className="text-xs text-gray-400">
                              {item.weightKg ? `${item.weightKg}kg${item.pricePerKg ? ` @ $${item.pricePerKg}/kg` : ''}` : `${item.quantity ?? 1}x${item.fixedPrice ? ` @ $${item.fixedPrice} ea` : ''}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{formatCurrency(item.lineTotal)}</span>
                            <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="p-1 hover:bg-red-50 rounded text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">No items added yet</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Delivery Address</p>
                  <AddressAutocomplete value={form.address} onChange={(addr) => setForm((f) => ({ ...f, address: addr }))} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Summary</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Order Status</label>
                      <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as OrderStatus }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Payment Status</label>
                      <select value={form.paymentStatus} onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                        {PAYMENT_STATUSES.map((ps) => <option key={ps.value} value={ps.value}>{ps.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Delivery Fee ($)</label>
                      <input type="number" value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: parseFloat(e.target.value) || 0 }))} step="0.01" min="0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Internal Notes</label>
                    <textarea value={form.internalNotes} onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))} rows={2} placeholder="Notes visible to staff only…" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(form.deliveryFee)}</span></div>
                    <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-200"><span>Total</span><span className="text-brand">{formatCurrency(total)}</span></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t">
                <button onClick={() => setShowCreate(false)} className="flex-1 border py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid transition-colors">
                  {creating ? 'Creating…' : `Create Order — ${formatCurrency(total)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-red-600">Delete Order</h2>
              <button onClick={() => setDeleteTarget(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to delete order <span className="font-semibold">#{(deleteTarget.id ?? '').slice(-8).toUpperCase()}</span>?
            </p>
            <p className="text-sm text-gray-500 mb-1">{deleteTarget.customerName} — {formatCurrency(deleteTarget.total)}</p>
            <p className="text-xs text-red-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
