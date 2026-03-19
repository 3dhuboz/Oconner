import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import type { DeliveryDay } from '@butcher/shared';
import { Plus, X, CalendarDays, ClipboardList, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '../lib/toast';
import { useNavigate } from 'react-router-dom';

export default function DeliveryDaysPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState<DeliveryDay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', maxOrders: 20, notes: '', deliveryWindowStart: '09:00' });
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState({ dayOfWeek: 5, weeks: 12, maxOrders: 40, deliveryWindowStart: '09:00' });
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    api.deliveryDays.list()
      .then((data) => setDays(data as DeliveryDay[]))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.date) return;
    setSaving(true);
    try {
      const result = await api.deliveryDays.create({
        date: new Date(form.date).getTime(),
        maxOrders: form.maxOrders,
        notes: form.notes,
        deliveryWindowStart: form.deliveryWindowStart,
      }) as { id: string };
      const newDay: DeliveryDay = {
        id: result.id,
        date: new Date(form.date).getTime(),
        maxOrders: form.maxOrders,
        orderCount: 0,
        notes: form.notes,
        active: true,
        deliveryWindowStart: form.deliveryWindowStart,
      } as unknown as DeliveryDay;
      setDays((prev) => [...prev, newDay].sort((a, b) => a.date - b.date));
      setShowForm(false);
      setForm({ date: '', maxOrders: 20, notes: '', deliveryWindowStart: '09:00' });
      toast('Delivery day created');
    } catch {
      toast('Failed to create delivery day', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCreate = async () => {
    setBulkSaving(true);
    try {
      const upcoming: Date[] = [];
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      // advance to next occurrence of chosen day-of-week
      while (start.getDay() !== bulkForm.dayOfWeek) start.setDate(start.getDate() + 1);
      for (let w = 0; w < bulkForm.weeks; w++) {
        const d = new Date(start);
        d.setDate(start.getDate() + w * 7);
        upcoming.push(d);
      }
      let created = 0;
      for (const d of upcoming) {
        const ts = d.getTime();
        // skip if already exists
        if (days.some((x) => Math.abs(x.date - ts) < 86_400_000)) continue;
        await api.deliveryDays.create({ date: ts, maxOrders: bulkForm.maxOrders, deliveryWindowStart: bulkForm.deliveryWindowStart });
        created++;
      }
      const updated = await api.deliveryDays.list() as DeliveryDay[];
      setDays(updated);
      setShowBulk(false);
      toast(`${created} delivery day${created !== 1 ? 's' : ''} created`);
    } catch {
      toast('Failed to create delivery days', 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleActive = async (day: DeliveryDay) => {
    try {
      await api.deliveryDays.update(day.id!, { active: !day.active });
      setDays((prev) => prev.map((d) => d.id === day.id ? { ...d, active: !d.active } : d));
    } catch {
      toast('Failed to update delivery day', 'error');
    }
  };

  const allPast = days.length > 0 && days.every((d) => d.date < Date.now());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand">Delivery Days</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 border border-brand text-brand px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/5">
            <RefreshCw className="h-4 w-4" /> Bulk Create Recurring
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid">
            <Plus className="h-4 w-4" /> Add Day
          </button>
        </div>
      </div>

      {allPast && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">All delivery days are in the past — customers can't book online</p>
            <p className="text-xs text-amber-600 mt-0.5">Use <strong>Bulk Create Recurring</strong> to generate upcoming delivery days in one click.</p>
          </div>
          <button onClick={() => setShowBulk(true)} className="flex-shrink-0 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600">
            Create Now
          </button>
        </div>
      )}

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

      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Bulk Create Recurring Days</h2>
              <button onClick={() => setShowBulk(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Day of Week</label>
                <select value={bulkForm.dayOfWeek} onChange={(e) => setBulkForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">How many weeks ahead</label>
                <input type="number" min={1} max={52} value={bulkForm.weeks} onChange={(e) => setBulkForm((f) => ({ ...f, weeks: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                <p className="text-xs text-gray-400 mt-1">Creates up to {bulkForm.weeks} {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][bulkForm.dayOfWeek]}s starting from the next upcoming one</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Orders per Day</label>
                <input type="number" min={1} value={bulkForm.maxOrders} onChange={(e) => setBulkForm((f) => ({ ...f, maxOrders: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estimated Start Time</label>
                <input type="time" value={bulkForm.deliveryWindowStart} onChange={(e) => setBulkForm((f) => ({ ...f, deliveryWindowStart: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBulk(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleBulkCreate} disabled={bulkSaving} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {bulkSaving ? (<><span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" /> Creating…</>) : `Create ${bulkForm.weeks} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

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
