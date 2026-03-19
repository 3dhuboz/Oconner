import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { Plus, X, Truck, User, ToggleLeft, ToggleRight, Mail, Send, Map } from 'lucide-react';
import { toast } from '../lib/toast';
import MapPage from './Map';

const EMPTY_FORM = { name: '', email: '', sendInvite: true };

interface DriverUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  active?: boolean;
  createdAt?: any;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    api.users.drivers()
      .then((data) => setDrivers(data as DriverUser[]))
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    let clerkId: string | null = null;
    try {
      const found = await api.users.findByEmail(form.email) as { clerkId: string };
      clerkId = found.clerkId;
    } catch {
      // Not in Clerk yet — use UUID, they can log in after signing up
    }
    const id = clerkId ?? crypto.randomUUID();
    try {
      await api.users.create({ id, name: form.name, email: form.email, role: 'driver', active: true });
      const newDriver: DriverUser = { id, name: form.name, email: form.email, role: 'driver', active: true };
      setDrivers((prev) => [...prev, newDriver]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      if (form.sendInvite) {
        try {
          await api.drivers.invite(form.name, form.email);
          toast(clerkId ? 'Driver created, invite sent' : 'Driver created, invite sent — they must sign up to enable login');
        } catch {
          toast('Driver created but invite failed to send', 'error');
        }
      } else {
        toast(clerkId ? 'Driver created and linked' : 'Driver created — they must sign up at the storefront to enable login');
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg ?? 'Failed to create driver.');
      toast(msg ?? 'Failed to create driver', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sendInvite = async (driver: DriverUser) => {
    setInviting(driver.id);
    try {
      await api.drivers.invite(driver.name ?? driver.email, driver.email);
      toast(`Invite sent to ${driver.email}`);
    } catch {
      toast('Failed to send invite', 'error');
    } finally {
      setInviting(null);
    }
  };

  const toggleActive = async (driver: DriverUser) => {
    try {
      await api.users.update(driver.id, { active: !driver.active });
      setDrivers((prev) => prev.map((d) => d.id === driver.id ? { ...d, active: !d.active } : d));
    } catch {
      toast('Failed to update driver', 'error');
    }
  };

  const [tab, setTab] = useState<'list' | 'map'>('list');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand">Drivers</h1>
        {tab === 'list' && (
          <button
            onClick={() => { setShowForm(true); setError(''); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Driver
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'list' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-brand'}`}>
          <Truck className="h-4 w-4" /> Driver List
        </button>
        <button onClick={() => setTab('map')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'map' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-brand'}`}>
          <Map className="h-4 w-4" /> Live Map
        </button>
      </div>

      {tab === 'map' ? <MapPage /> : (
      <div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No drivers yet</p>
            <p className="text-sm mt-1">Add a driver to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Invite</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-brand" />
                      </div>
                      <span className="font-medium">{d.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.email}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(d)}>
                      {d.active !== false
                        ? <ToggleRight className="h-6 w-6 text-brand mx-auto" />
                        : <ToggleLeft className="h-6 w-6 text-gray-400 mx-auto" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => sendInvite(d)}
                      disabled={inviting === d.id}
                      title="Send driver app invite email"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand border border-brand/30 rounded-lg px-2.5 py-1.5 hover:bg-brand/5 disabled:opacity-50 transition-colors"
                    >
                      {inviting === d.id
                        ? <span className="animate-spin h-3 w-3 border-2 border-brand border-t-transparent rounded-full" />
                        : <Send className="h-3 w-3" />}
                      Send Invite
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand" /> Add Driver
              </h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    placeholder="e.g. John Smith"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="driver@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-brand/5 border border-brand/20 rounded-lg">
                <input
                  type="checkbox"
                  checked={form.sendInvite}
                  onChange={(e) => setForm((f) => ({ ...f, sendInvite: e.target.checked }))}
                  className="accent-brand w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-brand">Send invite email</p>
                  <p className="text-xs text-gray-500">Email the driver a link to the app with install instructions</p>
                </div>
              </label>
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? 'Creating…' : form.sendInvite ? <><Mail className="h-4 w-4" /> Create & Send Invite</> : 'Create Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
