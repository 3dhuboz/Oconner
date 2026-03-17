import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import type { DeliveryDay } from '@butcher/shared';
import { Plus, X, CalendarDays, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeliveryDaysPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState<DeliveryDay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', maxOrders: 20, notes: '', deliveryWindowStart: '09:00' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.deliveryDays.list()
      .then((data) => setDays(data as DeliveryDay[]))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.date) return;
    setSaving(true);
    const created = await api.deliveryDays.create({
      date: new Date(form.date).getTime(),
      maxOrders: form.maxOrders,
      notes: form.notes,
      deliveryWindowStart: form.deliveryWindowStart,
    }) as DeliveryDay;
    setDays((prev) => [...prev, created].sort((a, b) => a.date - b.date));
    setSaving(false);
    setShowForm(false);
    setForm({ date: '', maxOrders: 20, notes: '', deliveryWindowStart: '09:00' });
  };

  const toggleActive = async (day: DeliveryDay) => {
    await api.deliveryDays.update(day.id!, { active: !day.active });
    setDays((prev) => prev.map((d) => d.id === day.id ? { ...d, active: !d.active } : d));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Delivery Days</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid">
          <Plus className="h-4 w-4" /> Add Day
        </button>
      </div>

      <div className="space-y-3">
        {days.length === 0 && (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No delivery days scheduled.</p>
          </div>
        )}
        {days.map((day) => {
          const date = typeof day.date === 'number' ? new Date(day.date) : new Date();
          const isPast = date < new Date();
          return (
            <div key={day.id} className={`bg-white rounded-xl border p-5 flex items-center justify-between ${isPast ? 'opacity-60' : ''}`}>
              <div>
                <p className="font-semibold">
                  {date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {day.orderCount ?? 0} / {day.maxOrders ?? 0} orders
                  {(day as any).deliveryWindowStart && ` · From ${(day as any).deliveryWindowStart}`}
                  {day.notes && ` · ${day.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-brand h-1.5 rounded-full" style={{ width: `${Math.min(100, ((day.orderCount ?? 0) / (day.maxOrders ?? 1)) * 100)}%` }} />
                </div>
                <button
                  onClick={() => navigate(`/delivery-days/${day.id}`)}
                  className="flex items-center gap-1 text-xs text-brand border border-brand/30 px-2 py-1 rounded-lg hover:bg-brand/5"
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Manifest
                </button>
                <button onClick={() => toggleActive(day)} className={`w-10 h-5 rounded-full transition-colors ${day.active ? 'bg-brand' : 'bg-gray-300'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${day.active ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add Delivery Day</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Orders</label>
                <input type="number" value={form.maxOrders} onChange={(e) => setForm((f) => ({ ...f, maxOrders: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estimated Start Time</label>
                <input type="time" value={form.deliveryWindowStart} onChange={(e) => setForm((f) => ({ ...f, deliveryWindowStart: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.date} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
