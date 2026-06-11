import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import type { DeliveryDay } from '@butcher/shared';
import { Plus, X, Trash2, Tag, Percent, DollarSign, Calendar, Hash, ToggleLeft, ToggleRight, Truck } from 'lucide-react';
import { toast } from '../lib/toast';

interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: number | null;
  deliveryDayIds: string | null;
  active: boolean;
  createdAt: number;
}

const EMPTY_FORM = {
  code: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: 10,
  minOrder: 0,
  maxUses: '' as string | number,
  expiresAt: '',
  deliveryDayIds: [] as string[],
};

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [runEditTarget, setRunEditTarget] = useState<PromoCode | null>(null);
  const [runEditDayIds, setRunEditDayIds] = useState<string[]>([]);

  useEffect(() => {
    loadCodes();
    loadDeliveryDays();
  }, []);

  const loadCodes = () => {
    api.get<PromoCode[]>('/api/promo-codes').then(setCodes).catch(() => {});
  };

  const loadDeliveryDays = () => {
    api.deliveryDays.list(true).then((days) => setDeliveryDays(days as DeliveryDay[])).catch(() => {});
  };

  const handleCreate = async () => {
    if (!form.code.trim()) { toast('Please enter a code', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/api/promo-codes', {
        code: form.code,
        type: form.type,
        value: form.type === 'percentage' ? form.value : Math.round(form.value * 100), // convert $ to cents for fixed
        minOrder: Math.round(form.minOrder * 100), // convert $ to cents
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
        deliveryDayIds: form.deliveryDayIds,
      });
      toast('Promo code created!');
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadCodes();
    } catch {
      toast('Failed to create code', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (code: PromoCode) => {
    try {
      await api.patch(`/api/promo-codes/${code.id}`, { active: !code.active });
      setCodes((prev) => prev.map((c) => c.id === code.id ? { ...c, active: !c.active } : c));
      toast(code.active ? 'Code deactivated' : 'Code activated');
    } catch {
      toast('Failed to update', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/promo-codes/${deleteTarget.id}`);
      setCodes((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast('Code deleted');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const isExpired = (code: PromoCode) => code.expiresAt && Date.now() > code.expiresAt;
  const isMaxedOut = (code: PromoCode) => code.maxUses && code.usedCount >= code.maxUses;
  const parseDeliveryDayIds = (value: string | null | undefined) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  };
  const formatDayLabel = (day: DeliveryDay) => {
    const date = new Date(day.date);
    const place = (day as any).marketLocation || (day as any).zones || ((day as any).type === 'pickup' ? 'Pickup' : 'Delivery run');
    return `${date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} - ${place}`;
  };
  const toggleDeliveryDay = (id: string) => {
    setForm((prev) => ({
      ...prev,
      deliveryDayIds: prev.deliveryDayIds.includes(id)
        ? prev.deliveryDayIds.filter((dayId) => dayId !== id)
        : [...prev.deliveryDayIds, id],
    }));
  };
  const openRunEditor = (code: PromoCode) => {
    setRunEditTarget(code);
    setRunEditDayIds(parseDeliveryDayIds(code.deliveryDayIds));
  };
  const toggleRunEditDay = (id: string) => {
    setRunEditDayIds((prev) => prev.includes(id) ? prev.filter((dayId) => dayId !== id) : [...prev, id]);
  };
  const saveRunRestrictions = async () => {
    if (!runEditTarget) return;
    setSaving(true);
    try {
      await api.patch(`/api/promo-codes/${runEditTarget.id}`, { deliveryDayIds: runEditDayIds });
      setCodes((prev) => prev.map((code) => code.id === runEditTarget.id
        ? { ...code, deliveryDayIds: runEditDayIds.length ? JSON.stringify(runEditDayIds) : null }
        : code));
      setRunEditTarget(null);
      toast('Eligible delivery days updated');
    } catch {
      toast('Failed to update delivery days', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand">Promo Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create discount codes for customers to use at checkout</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid"
        >
          <Plus className="h-4 w-4" /> New Code
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center text-gray-400">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No promo codes yet</p>
          <p className="text-sm mt-1">Create your first discount code to share with customers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const expired = isExpired(code);
            const maxed = isMaxedOut(code);
            const inactive = !code.active || expired || maxed;
            const restrictedDayIds = parseDeliveryDayIds(code.deliveryDayIds);
            return (
              <div key={code.id} className={`bg-white rounded-xl border p-5 ${inactive ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-brand/10 rounded-lg px-3 py-2">
                      <p className="font-mono font-bold text-brand text-lg tracking-wider">{code.code}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {code.type === 'percentage' ? `${code.value}% off` : `$${(code.value / 100).toFixed(2)} off`}
                        </span>
                        {code.minOrder > 0 && (
                          <span className="text-xs text-gray-400">min ${(code.minOrder / 100).toFixed(0)} order</span>
                        )}
                        {expired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Expired</span>}
                        {maxed && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Maxed out</span>}
                        {!code.active && !expired && !maxed && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {code.usedCount} used{code.maxUses ? ` / ${code.maxUses} max` : ''}</span>
                        {code.expiresAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {new Date(code.expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {restrictedDayIds.length > 0 && (
                          <span className="flex items-center gap-1 text-brand">
                            <Truck className="h-3 w-3" />
                            {restrictedDayIds.length} selected run{restrictedDayIds.length === 1 ? '' : 's'} only
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openRunEditor(code)} className="text-gray-400 hover:text-brand transition-colors" title="Choose eligible delivery days">
                      <Truck className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleActive(code)} className="text-gray-400 hover:text-brand transition-colors" title={code.active ? 'Deactivate' : 'Activate'}>
                      {code.active ? <ToggleRight className="h-6 w-6 text-brand" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                    <button onClick={() => setDeleteTarget(code)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Create Promo Code</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="percentage">% Percentage Off</option>
                    <option value="fixed">$ Fixed Amount Off</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                    {form.type === 'percentage' ? <><Percent className="h-3 w-3" /> Discount %</> : <><DollarSign className="h-3 w-3" /> Amount ($)</>}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={form.type === 'percentage' ? 100 : undefined}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Min Order ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })}
                    placeholder="0 = no minimum"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max Uses</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Calendar className="h-3 w-3" /> Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Truck className="h-3 w-3" /> Eligible delivery days</label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-400">Leave all unticked to allow this code on every delivery day.</p>
                  {deliveryDays.length === 0 ? (
                    <p className="text-xs text-amber-600">No upcoming delivery days found yet.</p>
                  ) : (
                    deliveryDays.map((day) => (
                      <label key={day.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.deliveryDayIds.includes(day.id)}
                          onChange={() => toggleDeliveryDay(day.id)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                        <span>{formatDayLabel(day)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2.5 rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.code.trim()}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid"
              >
                {saving ? 'Creating…' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold">Delete code "{deleteTarget.code}"?</h2>
                <p className="text-sm text-gray-500">Used {deleteTarget.usedCount} times. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Day Restrictions */}
      {runEditTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRunEditTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg">Eligible Delivery Days</h2>
                <p className="text-sm text-gray-500 font-mono">{runEditTarget.code}</p>
              </div>
              <button onClick={() => setRunEditTarget(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="border rounded-lg p-3 space-y-2 max-h-72 overflow-y-auto">
              <p className="text-xs text-gray-400">Leave all unticked to allow this code on every delivery day.</p>
              {deliveryDays.length === 0 ? (
                <p className="text-xs text-amber-600">No upcoming delivery days found yet.</p>
              ) : (
                deliveryDays.map((day) => (
                  <label key={day.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={runEditDayIds.includes(day.id)}
                      onChange={() => toggleRunEditDay(day.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span>{formatDayLabel(day)}</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRunEditTarget(null)} className="flex-1 border py-2.5 rounded-lg text-sm">Cancel</button>
              <button
                onClick={saveRunRestrictions}
                disabled={saving}
                className="flex-1 bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid"
              >
                {saving ? 'Saving...' : 'Save Days'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
