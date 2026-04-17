import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { Plus, X, Save, ShieldCheck, ShieldOff, Send, Trash2 } from 'lucide-react';
import { toast } from '../lib/toast';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'admin' | 'staff';
  active: boolean;
  createdAt: number;
}

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

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
  driver: 'bg-amber-100 text-amber-700',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<StaffUser> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newForm, setNewForm] = useState({ name: '', email: '', role: 'staff' as 'admin' | 'staff' });

  const load = () => {
    setLoading(true);
    api.users.list()
      .then((data: any) => {
        setStaff((data as StaffUser[]).filter((u) => u.role === 'admin' || u.role === 'staff'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setNewForm({ name: '', email: '', role: 'staff' }); setIsNew(true); setError(''); };
  const openEdit = (u: StaffUser) => { setEditing({ ...u }); setIsNew(false); setError(''); };
  const close = () => { setEditing(null); setIsNew(false); setError(''); };

  const handleAddNew = async () => {
    if (!newForm.name || !newForm.email) { setError('Name and email are required.'); return; }
    setSaving(true); setError('');
    let clerkId: string | null = null;
    try {
      const found = await api.users.findByEmail(newForm.email) as { clerkId: string };
      clerkId = found.clerkId;
    } catch {
      // Not in Clerk yet — use UUID
    }
    const id = clerkId ?? crypto.randomUUID();
    try {
      await api.users.create({ id, name: newForm.name, email: newForm.email, role: newForm.role, active: true });
      load(); close();
      toast(clerkId ? 'Staff member added and linked' : 'Staff member added — they must sign up to enable login');
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editing?.name?.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    try {
      await api.users.update(editing.id!, {
        name: editing.name,
        email: editing.email,
        phone: editing.phone ?? null,
        role: editing.role,
        active: editing.active,
      });
      load(); close();
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<StaffUser | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);

  const sendInvite = async (u: StaffUser) => {
    setInviting(u.id);
    try {
      await api.post('/api/staff/invite', { name: u.name, email: u.email, role: u.role });
      toast(`Invite sent to ${u.email}`);
    } catch (e: any) {
      toast(e?.message ?? 'Failed to send invite', 'error');
    } finally {
      setInviting(null);
    }
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      await api.users.update(u.id, { active: !u.active });
      load();
      toast(`${u.name} ${u.active ? 'deactivated' : 'activated'}`);
    } catch (e: any) {
      toast(e.message ?? 'Failed to update', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/users/${deleteConfirm.id}`);
      setStaff((prev) => prev.filter((u) => u.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast(`${deleteConfirm.name} removed`);
    } catch (e: any) {
      toast(e?.message ?? 'Failed to remove staff member', 'error');
    }
  };

  const setEdit = (k: keyof StaffUser, v: any) => setEditing((prev) => prev ? { ...prev, [k]: v } : prev);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand">Staff & Admins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage who can access the admin panel.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors">
          <Plus className="h-4 w-4" /> Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">No staff found</td></tr>
            ) : staff.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                  {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.active
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                    : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => sendInvite(u)}
                      disabled={inviting === u.id}
                      title="Send sign-up invite email"
                      className="flex items-center gap-1 text-sm bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-mid disabled:opacity-50 font-medium"
                    >
                      <Send className="h-3.5 w-3.5" /> {inviting === u.id ? 'Sending…' : 'Send Invite'}
                    </button>
                    <button onClick={() => openEdit(u)} className="text-sm text-brand font-medium hover:underline">Edit</button>
                    <button onClick={() => toggleActive(u)} title={u.active ? 'Deactivate' : 'Activate'} className="text-gray-400 hover:text-gray-700">
                      {u.active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setDeleteConfirm(u)} title="Remove" className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new staff modal */}
      {isNew && (
        <Modal title="Add Staff Member" onClose={close}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input className={inp} value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input className={inp} type="email" value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select className={inp} value={newForm.role} onChange={(e) => setNewForm((f) => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}>
              <option value="staff">Staff — can view & manage orders, products, deliveries</option>
              <option value="admin">Admin — full access including settings, staff management</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={close} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAddNew} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-mid disabled:opacity-60">
              <Save className="h-3.5 w-3.5" />{saving ? 'Adding…' : 'Add to Team'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal title="Remove Staff Member" onClose={() => setDeleteConfirm(null)}>
          <div className="text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-gray-500">
              Permanently remove <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email}) from the team?
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
            <button onClick={handleDelete} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium">Remove</button>
          </div>
        </Modal>
      )}

      {/* Edit existing staff modal */}
      {editing && !isNew && (
        <Modal title="Edit Staff Member" onClose={close}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
            <input className={inp} value={editing.name ?? ''} onChange={(e) => setEdit('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input className={inp} type="email" value={editing.email ?? ''} onChange={(e) => setEdit('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mobile phone</label>
            <input
              className={inp}
              type="tel"
              placeholder="+61400000000"
              value={editing.phone ?? ''}
              onChange={(e) => setEdit('phone', e.target.value)}
            />
            <p className="text-[11px] text-gray-400 mt-1">Used for driver ops SMS (GPS issues, run alerts). Enter in +61 format.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select className={inp} value={editing.role ?? 'staff'} onChange={(e) => setEdit('role', e.target.value)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-brand" checked={!!editing.active} onChange={(e) => setEdit('active', e.target.checked)} />
            <span className="text-sm font-medium text-gray-700">Account active</span>
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={close} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleEditSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-mid disabled:opacity-60">
              <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
