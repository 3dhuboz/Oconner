import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { Plus, X, Save, ShieldCheck, ShieldOff } from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  active: boolean;
  createdAt: number;
}

const BLANK: Partial<StaffUser> = { id: '', name: '', email: '', role: 'staff', active: true };

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
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<StaffUser> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const openNew = () => { setEditing({ ...BLANK }); setIsNew(true); setError(''); };
  const openEdit = (u: StaffUser) => { setEditing({ ...u }); setIsNew(false); setError(''); };
  const close = () => { setEditing(null); setIsNew(false); setError(''); };

  const handleSave = async () => {
    if (!editing?.id?.trim()) { setError('Clerk User ID is required.'); return; }
    if (!editing?.name?.trim()) { setError('Name is required.'); return; }
    if (!editing?.email?.trim()) { setError('Email is required.'); return; }
    setSaving(true); setError('');
    try {
      if (isNew) {
        await api.users.create({
          id: editing.id!.trim(),
          name: editing.name,
          email: editing.email,
          role: editing.role ?? 'staff',
          active: true,
        });
      } else {
        await api.users.update(editing.id!, {
          name: editing.name,
          email: editing.email,
          role: editing.role,
          active: editing.active,
        });
      }
      load(); close();
    } catch (e: any) {
      setError(e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      await api.users.update(u.id, { active: !u.active });
      load();
    } catch (e: any) {
      alert(e.message ?? 'Failed to update');
    }
  };

  const set = (k: keyof StaffUser, v: any) => setEditing((prev) => prev ? { ...prev, [k]: v } : prev);

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

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
        <strong>To add a new admin or staff member:</strong> they must first create an account at the storefront login page,
        then you copy their <strong>Clerk User ID</strong> from{' '}
        <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline">dashboard.clerk.com</a>{' '}
        → Users, and paste it below.
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Clerk ID</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No staff found</td></tr>
            ) : staff.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[160px] truncate">{u.id}</td>
                <td className="px-4 py-3 text-center">
                  {u.active
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                    : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="text-xs text-brand hover:underline">Edit</button>
                    <button
                      onClick={() => toggleActive(u)}
                      title={u.active ? 'Deactivate' : 'Activate'}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      {u.active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={isNew ? 'Add Staff Member' : 'Edit Staff Member'} onClose={close}>
          {isNew && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Clerk User ID *</label>
              <input
                className={inp}
                placeholder="user_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={editing.id ?? ''}
                onChange={(e) => set('id', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Found in <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="text-brand underline">dashboard.clerk.com</a> → Users → click user → copy ID
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input className={inp} value={editing.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input className={inp} type="email" value={editing.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select className={inp} value={editing.role ?? 'staff'} onChange={(e) => set('role', e.target.value)}>
              <option value="staff">Staff — can view & manage orders, products, deliveries</option>
              <option value="admin">Admin — full access including settings, staff management</option>
            </select>
          </div>
          {!isNew && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-brand" checked={!!editing.active} onChange={(e) => set('active', e.target.checked)} />
              <span className="text-sm font-medium text-gray-700">Account active</span>
            </label>
          )}
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
