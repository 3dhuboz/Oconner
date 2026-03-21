import { useEffect, useState } from 'react';
import { api, formatCurrency } from '@butcher/shared';
import type { Customer, Address } from '@butcher/shared';
import { Search, Plus, X, Save, UserX, MapPin } from 'lucide-react';
import { toast } from '../lib/toast';

const BLANK_ADDR: Address = { line1: '', suburb: '', state: 'QLD', postcode: '', country: 'AU' };
const BLANK: Partial<Customer> & { address: Address } = { name: '', email: '', phone: '', notes: '', blacklisted: false, address: { ...BLANK_ADDR } };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<Customer> & { address: Address }) | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.customers.list()
      .then((data) => { setCustomers(data as Customer[]); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const openNew = () => { setEditing({ ...BLANK, address: { ...BLANK_ADDR } }); setIsNew(true); setError(''); };
  const openEdit = (c: Customer) => { setEditing({ ...c, address: c.addresses?.[0] ?? { ...BLANK_ADDR } }); setIsNew(false); setError(''); };
  const close = () => { setEditing(null); setIsNew(false); setError(''); };

  const handleSave = async () => {
    if (!editing?.name || !editing?.email) { setError('Name and email are required.'); return; }
    setSaving(true); setError('');
    try {
      const addresses = editing.address?.line1 ? [editing.address] : [];
      if (isNew) {
        const id = crypto.randomUUID();
        await api.customers.create({ ...editing, id, addresses, createdAt: Date.now(), updatedAt: Date.now() });
        toast('Customer created');
      } else {
        await api.customers.update(editing.id!, { name: editing.name, email: editing.email, phone: editing.phone, notes: editing.notes, blacklisted: editing.blacklisted, blacklistReason: editing.blacklistReason, addresses });
        toast('Customer saved');
      }
      load(); close();
    } catch (e: any) {
      toast(e?.message ?? 'Save failed', 'error');
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof Customer, v: any) => setEditing((prev) => prev ? { ...prev, [k]: v } : prev);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Customers</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors">
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Address</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Spent</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No customers found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(c)}>
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                  {c.addresses?.[0] ? `${c.addresses[0].line1}, ${c.addresses[0].suburb}` : '—'}
                </td>
                <td className="px-4 py-3 text-right">{c.orderCount ?? 0}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.totalSpent ?? 0)}</td>
                <td className="px-4 py-3 text-right">
                  {c.blacklisted
                    ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Blacklisted</span>
                    : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={isNew ? 'Add Customer' : 'Edit Customer'} onClose={close}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <input className={inp} value={editing.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input className={inp} type="email" value={editing.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input className={inp} type="tel" value={editing.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-red-600" checked={!!editing.blacklisted} onChange={(e) => set('blacklisted', e.target.checked)} />
                <span className="text-sm text-red-700 font-medium flex items-center gap-1"><UserX className="h-3.5 w-3.5" /> Blacklisted</span>
              </label>
            </div>
            {editing.blacklisted && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Blacklist Reason</label>
                <input className={inp} value={editing.blacklistReason ?? ''} onChange={(e) => set('blacklistReason', e.target.value)} />
              </div>
            )}
            <div className="col-span-2 border-t pt-3">
              <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> Delivery Address</label>
              <div className="space-y-2">
                <input className={inp} value={editing.address?.line1 ?? ''} onChange={(e) => setEditing((prev) => prev ? { ...prev, address: { ...prev.address, line1: e.target.value } } : prev)} placeholder="Street address" />
                <div className="grid grid-cols-3 gap-2">
                  <input className={`${inp} col-span-1`} value={editing.address?.suburb ?? ''} onChange={(e) => setEditing((prev) => prev ? { ...prev, address: { ...prev.address, suburb: e.target.value } } : prev)} placeholder="Suburb" />
                  <input className={inp} value={editing.address?.state ?? 'QLD'} onChange={(e) => setEditing((prev) => prev ? { ...prev, address: { ...prev.address, state: e.target.value } } : prev)} placeholder="State" />
                  <input className={inp} value={editing.address?.postcode ?? ''} onChange={(e) => setEditing((prev) => prev ? { ...prev, address: { ...prev.address, postcode: e.target.value } } : prev)} placeholder="Postcode" />
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
              <textarea className={`${inp} resize-none`} rows={3} value={editing.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={close} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-mid disabled:opacity-60">
              <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
