import { useEffect, useState, useRef } from 'react';
import { api } from '@butcher/shared';
import type { Product } from '@butcher/shared';
import { RefreshCcw, Check, X, Phone, Mail, Plus, Upload, Image, Save, ArrowLeftRight, PackageCheck, ShoppingCart } from 'lucide-react';
import { toast } from '../lib/toast';

interface Subscription {
  id: string;
  boxId: string;
  boxName: string;
  alternateBoxId?: string | null;
  alternateBoxName?: string | null;
  nextIsAlternate?: boolean;
  frequency: string;
  customerName?: string | null;
  customerPhone?: string | null;
  email: string;
  notes?: string;
  status: 'pending' | 'active' | 'cancelled';
  createdAt?: any;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const FREQUENCIES = ['weekly', 'fortnightly', 'monthly'];
const EMPTY_FORM: {
  email: string; name: string; phone: string; address: string; suburb: string; postcode: string;
  boxId: string; boxName: string; frequency: string; status: Subscription['status'];
} = { email: '', name: '', phone: '', address: '', suburb: '', postcode: '', boxId: '', boxName: '', frequency: 'monthly', status: 'active' };

function BoxPlanCard({ product, onSaved }: { product: Product & { imageUrl?: string }; onSaved: (id: string, url: string) => void }) {
  const [url, setUrl] = useState(product.imageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    try {
      await api.products.update(product.id!, { imageUrl: url });
      onSaved(product.id!, url);
      toast(`${product.name} image saved`);
    } catch {
      toast('Failed to save image', 'error');
    } finally { setSaving(false); }
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await api.images.upload(file, 'products');
      setUrl(uploaded);
      toast('Image uploaded');
    } catch {
      toast('Upload failed', 'error');
    } finally { setUploading(false); }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-white">
      <p className="font-semibold text-sm">{product.name}</p>
      {url ? (
        <div className="relative">
          <img src={url} alt={product.name} className="w-full h-48 object-cover rounded-lg bg-gray-100"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <button onClick={() => setUrl('')} className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="w-full h-48 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => fileRef.current?.click()}>
          <Image className="h-8 w-8" />
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://image-url.com/box.jpg"
          className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="border rounded-lg px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50" title="Upload">
          <Upload className="h-3.5 w-3.5" />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-xs py-2 rounded-lg hover:bg-brand-mid disabled:opacity-50">
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Saving…' : 'Save Image'}
      </button>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [boxProducts, setBoxProducts] = useState<(Product & { imageUrl?: string })[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Subscription[]>('/api/subscriptions').then(setSubs).catch(() => {});
    api.products.list()
      .then((data) => setBoxProducts((data as (Product & { imageUrl?: string })[]).filter((p) => p.isMeatPack)))
      .catch(() => {});
  }, []);

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/subscriptions/${id}`, { status });
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: status as Subscription['status'] } : s));
      toast(`Subscription ${status}`);
    } catch {
      toast('Failed to update subscription', 'error');
    }
  };

  const [generatingOrder, setGeneratingOrder] = useState<string | null>(null);

  const generateOrder = async (sub: Subscription) => {
    setGeneratingOrder(sub.id);
    try {
      const result = await api.post<{ orderId?: string; error?: string }>(`/api/subscriptions/${sub.id}/generate-order`, {});
      if (result.orderId) {
        toast(`Order created for ${sub.customerName || sub.email}`);
      } else {
        toast(result.error ?? 'No delivery day available', 'error');
      }
    } catch {
      toast('Failed to create order', 'error');
    } finally {
      setGeneratingOrder(null);
    }
  };

  const markSent = async (id: string) => {
    try {
      const res = await api.post<{ nextIsAlternate: boolean }>(`/api/subscriptions/${id}/mark-sent`, {});
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, nextIsAlternate: res.nextIsAlternate } : s));
      toast('Next box updated');
    } catch {
      toast('Failed to update', 'error');
    }
  };

  const handleCreate = async () => {
    if (!form.email || !form.boxId) { toast('Email and box are required', 'error'); return; }
    setSaving(true);
    try {
      const result = await api.subscriptions.create({
        email: form.email, name: form.name, phone: form.phone,
        address: form.address, suburb: form.suburb, postcode: form.postcode,
        boxId: form.boxId, boxName: form.boxName,
        frequency: form.frequency, status: form.status,
      }) as { id: string };
      setSubs((prev) => [{ id: result.id, ...form, createdAt: Date.now() }, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast('Subscription created');
    } catch (e: any) {
      toast(e?.message ?? 'Failed to create subscription', 'error');
    } finally { setSaving(false); }
  };

  const selectedBox = boxProducts.find((p) => p.id === form.boxId);
  const pending = subs.filter((s) => s.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand flex items-center gap-2">
            <RefreshCcw className="h-6 w-6" /> Subscriptions
          </h1>
          {pending > 0 && <p className="text-sm text-amber-600 mt-0.5">{pending} pending request{pending !== 1 ? 's' : ''}</p>}
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Subscription
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden mb-8">
        {subs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCcw className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No subscriptions yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {subs.map((s) => {
              const boxImg = boxProducts.find((p) => p.id === s.boxId)?.imageUrl;
              return (
                <div key={s.id} className="px-5 py-4 flex gap-4 items-start">
                  {boxImg ? (
                    <img src={boxImg} alt={s.boxName} className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Image className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <p className="font-semibold">{s.customerName || s.email}</p>
                        {s.alternateBoxId ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm text-brand font-medium flex items-center gap-1">
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                              {s.boxName} ⇄ {s.alternateBoxName} · {s.frequency}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              s.nextIsAlternate
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-brand/10 text-brand'
                            }`}>
                              Next: {s.nextIsAlternate ? s.alternateBoxName : s.boxName}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-brand font-medium">{s.boxName} · {s.frequency}</p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.pending}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{s.email}</span>
                      {s.customerPhone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{s.customerPhone}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {s.status === 'pending' && (
                      <>
                        <button onClick={() => setStatus(s.id, 'active')}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                          <Check className="h-3.5 w-3.5" /> Activate
                        </button>
                        <button onClick={() => setStatus(s.id, 'cancelled')}
                          className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                          <X className="h-3.5 w-3.5" /> Decline
                        </button>
                      </>
                    )}
                    {s.status === 'active' && s.alternateBoxId && (
                      <button
                        onClick={() => markSent(s.id)}
                        className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700"
                        title="Mark this delivery as sent and flip to the other box for next time"
                      >
                        <PackageCheck className="h-3.5 w-3.5" /> Mark Sent
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button
                        onClick={() => generateOrder(s)}
                        disabled={generatingOrder === s.id}
                        className="flex items-center gap-1 bg-brand text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-mid disabled:opacity-50"
                        title="Create an order for the next delivery day"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {generatingOrder === s.id ? 'Creating…' : 'Create Order'}
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button onClick={() => setStatus(s.id, 'cancelled')}
                        className="flex items-center gap-1 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {boxProducts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Subscription Box Plans</h2>
          <p className="text-sm text-gray-500 mb-4">Manage images for each box option shown on the storefront.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {boxProducts.map((p) => (
              <BoxPlanCard
                key={p.id}
                product={p}
                onSaved={(id, url) => setBoxProducts((prev) => prev.map((bp) => bp.id === id ? { ...bp, imageUrl: url } : bp))}
              />
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg">Add Subscription</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Customer Email *</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="customer@email.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Customer Name</label>
                  <input value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                  <input value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="04xx xxx xxx"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Delivery Address</label>
                <input value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Suburb</label>
                  <input value={form.suburb}
                    onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
                    placeholder="Suburb"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Postcode</label>
                  <input value={form.postcode}
                    onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                    placeholder="4700"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subscription Box *</label>
                <select value={form.boxId}
                  onChange={(e) => {
                    const p = boxProducts.find((bp) => bp.id === e.target.value);
                    setForm((f) => ({ ...f, boxId: e.target.value, boxName: p?.name ?? '' }));
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="">Select a box…</option>
                  {boxProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {selectedBox?.imageUrl && (
                  <img src={selectedBox.imageUrl} alt={selectedBox.name}
                    className="mt-2 w-full h-28 object-cover rounded-lg" />
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Frequency *</label>
                <select value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  {FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Subscription['status'] }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.email || !form.boxId}
                className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
