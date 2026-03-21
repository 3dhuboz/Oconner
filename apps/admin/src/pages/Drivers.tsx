import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { Plus, X, Truck, User, ToggleLeft, ToggleRight, Mail, Send, Map, Pencil, Trash2, Phone, MapPin, Car, Shield, Heart } from 'lucide-react';
import { toast } from '../lib/toast';
import MapPage from './Map';

const EMPTY_FORM = { name: '', email: '', sendInvite: true };
const EMPTY_EDIT = {
  name: '', email: '', phone: '', address: '',
  vehicleInfo: '', registrationNumber: '', licenseNumber: '',
  nextOfKinName: '', nextOfKinPhone: '', zones: '',
};

interface DriverUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  active?: boolean;
  phone?: string | null;
  address?: string | null;
  vehicleInfo?: string | null;
  registrationNumber?: string | null;
  licenseNumber?: string | null;
  nextOfKin?: string | null;
  zones?: string | null;
  createdAt?: any;
}

function parseZones(zones?: string | null): string[] {
  if (!zones) return [];
  try { return JSON.parse(zones) as string[]; } catch { return []; }
}

function parseNextOfKin(nok?: string | null): { name: string; phone: string } {
  if (!nok) return { name: '', phone: '' };
  try { return JSON.parse(nok) as { name: string; phone: string }; } catch { return { name: '', phone: '' }; }
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverUser | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DriverUser | null>(null);

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

  const openEdit = (driver: DriverUser) => {
    const nok = parseNextOfKin(driver.nextOfKin);
    setEditingDriver(driver);
    setEditForm({
      name: driver.name ?? '', email: driver.email,
      phone: driver.phone ?? '', address: driver.address ?? '',
      vehicleInfo: driver.vehicleInfo ?? '', registrationNumber: driver.registrationNumber ?? '',
      licenseNumber: driver.licenseNumber ?? '',
      nextOfKinName: nok.name, nextOfKinPhone: nok.phone,
      zones: parseZones(driver.zones).join(', '),
    });
  };

  const handleEdit = async () => {
    if (!editingDriver) return;
    setEditSaving(true);
    const zonesArr = editForm.zones.split(',').map((z) => z.trim()).filter(Boolean);
    const nextOfKin = editForm.nextOfKinName || editForm.nextOfKinPhone
      ? JSON.stringify({ name: editForm.nextOfKinName, phone: editForm.nextOfKinPhone })
      : null;
    const update = {
      name: editForm.name, email: editForm.email,
      phone: editForm.phone || null, address: editForm.address || null,
      vehicleInfo: editForm.vehicleInfo || null, registrationNumber: editForm.registrationNumber || null,
      licenseNumber: editForm.licenseNumber || null,
      nextOfKin, zones: JSON.stringify(zonesArr),
    };
    try {
      await api.users.update(editingDriver.id, update);
      setDrivers((prev) => prev.map((d) => d.id === editingDriver.id ? { ...d, ...update } : d));
      setEditingDriver(null);
      toast('Driver updated');
    } catch {
      toast('Failed to update driver', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.users.update(deleteConfirm.id, { active: false });
      setDrivers((prev) => prev.filter((d) => d.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast('Driver removed');
    } catch {
      toast('Failed to remove driver', 'error');
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
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Zones</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Invite</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.map((d) => {
                const zones = parseZones(d.zones);
                return (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-brand" />
                      </div>
                      <div>
                        <span className="font-medium block">{d.name ?? '—'}</span>
                        {d.vehicleInfo && <span className="text-xs text-gray-400">{d.vehicleInfo}{d.registrationNumber ? ` · ${d.registrationNumber}` : ''}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500 text-sm block">{d.email}</span>
                    {d.phone && <span className="text-xs text-gray-400">{d.phone}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {zones.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {zones.map((z) => (
                          <span key={z} className="bg-brand/10 text-brand text-xs px-2 py-0.5 rounded-full font-medium">{z}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">No zones</span>
                    )}
                  </td>
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
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-brand rounded-lg hover:bg-brand/5" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(d)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
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
      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Pencil className="h-5 w-5 text-brand" /> Edit Driver
              </h2>
              <button onClick={() => setEditingDriver(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              {/* Personal */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personal</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                  <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="04xx xxx xxx" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</label>
                  <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Home address" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>

              {/* Vehicle */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Vehicle</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Car className="h-3 w-3" /> Vehicle</label>
                  <input value={editForm.vehicleInfo} onChange={(e) => setEditForm((f) => ({ ...f, vehicleInfo: e.target.value }))}
                    placeholder="e.g. Toyota HiLux 2022" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Registration</label>
                  <input value={editForm.registrationNumber} onChange={(e) => setEditForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                    placeholder="ABC 123" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>

              {/* License & Emergency */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">License & Emergency</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Shield className="h-3 w-3" /> Store / Driver License</label>
                <input value={editForm.licenseNumber} onChange={(e) => setEditForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  placeholder="License number" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Heart className="h-3 w-3" /> Next of Kin Name</label>
                  <input value={editForm.nextOfKinName} onChange={(e) => setEditForm((f) => ({ ...f, nextOfKinName: e.target.value }))}
                    placeholder="Emergency contact" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Next of Kin Phone</label>
                  <input value={editForm.nextOfKinPhone} onChange={(e) => setEditForm((f) => ({ ...f, nextOfKinPhone: e.target.value }))}
                    placeholder="04xx xxx xxx" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>

              {/* Delivery Zones */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Delivery Zones</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><MapPin className="h-3 w-3" /> Assigned Postcodes</label>
                <input value={editForm.zones} onChange={(e) => setEditForm((f) => ({ ...f, zones: e.target.value }))}
                  placeholder="e.g. 4700, 4701, 4702" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                <p className="text-xs text-gray-400 mt-1">Comma-separated postcodes. Stops in these zones will be auto-assigned to this driver.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingDriver(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Remove Driver?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Remove <strong>{deleteConfirm.name ?? deleteConfirm.email}</strong> from the driver list? They won't be able to access the driver app.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
