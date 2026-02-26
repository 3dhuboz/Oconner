import React, { useState, useEffect } from 'react';
import { Activity, Shield, Server, Database, Lock, Users, Save, Wifi, AlertTriangle, Flame, KeyRound, Plus, Pencil, Trash2, CreditCard, Building2, UserPlus, ChevronDown, ChevronUp, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import type { Tenant, License, UserProfile, UserRole } from '../types';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'tenants' | 'users' | 'licenses';

export function SuperAdmin() {
  const { backendStatus, license } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toISOString()}] SYSTEM: Dev Console initialized.`,
    `[${new Date().toISOString()}] AUTH: Developer authenticated.`,
  ]);

  // Modal states
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddLicense, setShowAddLicense] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toISOString()}] ${msg}`, ...prev].slice(0, 50));

  // Real-time listeners
  useEffect(() => {
    if (!db) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(onSnapshot(collection(db, 'tenants'), (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant)));
    }));
    unsubs.push(onSnapshot(collection(db, 'userProfiles'), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile)));
    }));
    unsubs.push(onSnapshot(collection(db, 'licenses'), (snap) => {
      setLicenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as License)));
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'tenants', label: 'Customers', icon: <Building2 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'licenses', label: 'Licenses', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dev Console</h1>
          <p className="text-slate-500 mt-1">System monitoring, customer & license management</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" /> DEVELOPER_ACCESS
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px]",
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.icon} {tab.label}
            {tab.id === 'tenants' && <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{tenants.length}</span>}
            {tab.id === 'users' && <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{users.length}</span>}
            {tab.id === 'licenses' && <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{licenses.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab backendStatus={backendStatus} tenants={tenants} users={users} licenses={licenses} logs={logs} />}
      {activeTab === 'tenants' && (
        <TenantsTab
          tenants={tenants}
          licenses={licenses}
          users={users}
          showAdd={showAddTenant}
          setShowAdd={setShowAddTenant}
          editing={editingTenant}
          setEditing={setEditingTenant}
          addLog={addLog}
        />
      )}
      {activeTab === 'users' && (
        <UsersTab
          users={users}
          tenants={tenants}
          showAdd={showAddUser}
          setShowAdd={setShowAddUser}
          editing={editingUser}
          setEditing={setEditingUser}
          addLog={addLog}
        />
      )}
      {activeTab === 'licenses' && (
        <LicensesTab
          licenses={licenses}
          tenants={tenants}
          users={users}
          showAdd={showAddLicense}
          setShowAdd={setShowAddLicense}
          addLog={addLog}
        />
      )}
    </div>
  );
}

// ---------- OVERVIEW TAB ----------
function OverviewTab({ backendStatus, tenants, users, licenses, logs }: any) {
  const activeTenants = tenants.filter((t: Tenant) => t.status === 'active').length;
  const activeLicenses = licenses.filter((l: License) => l.status === 'active').length;
  const totalRevenue = tenants.reduce((sum: number, t: Tenant) => {
    const extraTech = Math.max(0, t.techLicenses - 1);
    const baseCost = t.plan === 'starter' ? 49 : t.plan === 'professional' ? 99 : 249;
    return sum + baseCost + (extraTech * 29);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Active Customers" value={activeTenants} total={tenants.length} color="indigo" />
        <StatCard label="Active Licenses" value={activeLicenses} total={licenses.length} color="emerald" />
        <StatCard label="Total Users" value={users.length} color="sky" />
        <StatCard label="Monthly Revenue" value={`$${totalRevenue}`} color="amber" prefix="" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> System Health
          </h3>
          <div className="space-y-4">
            <StatusRow icon={<Server className="w-3 h-3" />} label="API Latency" value={`${backendStatus.latency}ms`} ok={backendStatus.latency < 100} />
            <StatusRow icon={<Database className="w-3 h-3" />} label="Firebase" value={backendStatus.firebase ? 'Connected' : 'Disconnected'} ok={backendStatus.firebase} />
            <StatusRow icon={<Wifi className="w-3 h-3" />} label="Connection" value="Stable" ok={true} />
            <StatusRow icon={<CreditCard className="w-3 h-3" />} label="Stripe" value={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'Configured' : 'Not Set'} ok={!!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY} />
          </div>
        </div>

        {/* System Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" /> Activity Log
          </h3>
          <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 h-52 overflow-y-auto space-y-1">
            {logs.map((log: string, i: number) => (
              <p key={i} className={i === 0 ? 'text-emerald-400' : 'text-slate-500'}>{log}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, total, color, prefix = '' }: { label: string; value: any; total?: number; color: string; prefix?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={cn("p-5 rounded-2xl border", colors[color])}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{prefix}{value}</p>
      {total !== undefined && <p className="text-xs mt-1 opacity-60">of {total} total</p>}
    </div>
  );
}

function StatusRow({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-slate-600">{icon} {label}</span>
      <span className={cn("font-medium flex items-center gap-1", ok ? "text-emerald-600" : "text-rose-600")}>
        {value}
        {!ok && <AlertTriangle className="w-3 h-3" />}
      </span>
    </div>
  );
}

// ---------- TENANTS (CUSTOMERS) TAB ----------
function TenantsTab({ tenants, licenses, users, showAdd, setShowAdd, editing, setEditing, addLog }: any) {
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', plan: 'starter', techLicenses: 1 });

  useEffect(() => {
    if (editing) {
      setForm({ companyName: editing.companyName, contactName: editing.contactName, contactEmail: editing.contactEmail, contactPhone: editing.contactPhone, plan: editing.plan, techLicenses: editing.techLicenses });
      setShowAdd(true);
    }
  }, [editing]);

  const resetForm = () => {
    setForm({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', plan: 'starter', techLicenses: 1 });
    setShowAdd(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!db || !form.companyName || !form.contactEmail) { toast.error('Company name and email required'); return; }
    try {
      const maxTech = form.plan === 'starter' ? 3 : form.plan === 'professional' ? 10 : 999;
      if (editing) {
        await updateDoc(doc(db, 'tenants', editing.id), { ...form, maxTechLicenses: maxTech });
        addLog(`TENANT: Updated "${form.companyName}"`);
        toast.success('Customer updated');
      } else {
        const tenantData: Omit<Tenant, 'id'> = {
          ...form,
          createdAt: new Date().toISOString(),
          status: 'active',
          adminLicenses: 1,
          techLicenses: Number(form.techLicenses),
          maxTechLicenses: maxTech,
        } as any;
        const ref = await addDoc(collection(db, 'tenants'), tenantData);

        // Auto-create included licenses (1 admin + 1 tech)
        await addDoc(collection(db, 'licenses'), { tenantId: ref.id, type: 'admin', status: 'active', createdAt: new Date().toISOString(), isIncluded: true });
        await addDoc(collection(db, 'licenses'), { tenantId: ref.id, type: 'technician', status: 'active', createdAt: new Date().toISOString(), isIncluded: true });

        addLog(`TENANT: Created "${form.companyName}" with starter licenses`);
        toast.success('Customer created with 1 admin + 1 tech license');
      }
      resetForm();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (t: Tenant) => {
    if (!db || !confirm(`Delete "${t.companyName}" and all associated licenses?`)) return;
    try {
      // Delete associated licenses
      const licQ = query(collection(db, 'licenses'), where('tenantId', '==', t.id));
      const licSnap = await getDocs(licQ);
      for (const d of licSnap.docs) await deleteDoc(d.ref);
      await deleteDoc(doc(db, 'tenants', t.id));
      addLog(`TENANT: Deleted "${t.companyName}" and ${licSnap.size} licenses`);
      toast.success('Customer deleted');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleStatus = async (t: Tenant) => {
    if (!db) return;
    const newStatus = t.status === 'active' ? 'suspended' : 'active';
    await updateDoc(doc(db, 'tenants', t.id), { status: newStatus });
    addLog(`TENANT: ${t.companyName} ${newStatus}`);
    toast.success(`Customer ${newStatus}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tenants.length} customer(s) registered</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900">{editing ? 'Edit' : 'New'} Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Company Name *" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <input placeholder="Contact Name" value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <input placeholder="Contact Email *" type="email" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <input placeholder="Contact Phone" value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="starter">Starter ($49/mo)</option>
              <option value="professional">Professional ($99/mo)</option>
              <option value="enterprise">Enterprise ($249/mo)</option>
            </select>
            <div>
              <label className="text-xs text-slate-500">Extra Tech Licenses ($29/mo each)</label>
              <input type="number" min={1} value={form.techLicenses} onChange={e => setForm(p => ({ ...p, techLicenses: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">{editing ? 'Update' : 'Create'} Customer</button>
            <button onClick={resetForm} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Tenant List */}
      <div className="space-y-3">
        {tenants.map((t: Tenant) => {
          const tLicenses = licenses.filter((l: License) => l.tenantId === t.id);
          const tUsers = users.filter((u: UserProfile) => u.tenantId === t.id);
          const extraTech = Math.max(0, t.techLicenses - 1);
          const baseCost = t.plan === 'starter' ? 49 : t.plan === 'professional' ? 99 : 249;
          const monthlyTotal = baseCost + (extraTech * 29);

          return (
            <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-slate-900">{t.companyName}</h4>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>{t.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">{t.plan}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t.contactName} &middot; {t.contactEmail} &middot; {t.contactPhone || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">${monthlyTotal}/mo</span>
                  <button onClick={() => setEditing(t)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                  <button onClick={() => handleToggleStatus(t)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    {t.status === 'active' ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                  <button onClick={() => handleDelete(t)} className="p-1.5 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>{tLicenses.length} license(s)</span>
                <span>{tUsers.length} user(s)</span>
                <span>Created {new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
        {tenants.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No customers yet. Add one above.</p>}
      </div>
    </div>
  );
}

// ---------- USERS TAB ----------
function UsersTab({ users, tenants, showAdd, setShowAdd, editing, setEditing, addLog }: any) {
  const [form, setForm] = useState({ email: '', displayName: '', role: 'admin' as UserRole, tenantId: '', isActive: true });

  useEffect(() => {
    if (editing) {
      setForm({ email: editing.email, displayName: editing.displayName, role: editing.role, tenantId: editing.tenantId || '', isActive: editing.isActive });
      setShowAdd(true);
    }
  }, [editing]);

  const resetForm = () => { setForm({ email: '', displayName: '', role: 'admin', tenantId: '', isActive: true }); setShowAdd(false); setEditing(null); };

  const handleSave = async () => {
    if (!db || !form.email) { toast.error('Email required'); return; }
    try {
      if (editing) {
        await updateDoc(doc(db, 'userProfiles', editing.uid), { displayName: form.displayName, role: form.role, tenantId: form.tenantId || null, isActive: form.isActive });
        addLog(`USER: Updated "${form.email}" role=${form.role}`);
        toast.success('User updated');
      } else {
        // Create a placeholder profile (actual auth user is created on first login)
        const profileId = form.email.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'userProfiles', profileId), {
          uid: profileId,
          email: form.email,
          displayName: form.displayName,
          role: form.role,
          tenantId: form.tenantId || null,
          createdAt: new Date().toISOString(),
          isActive: form.isActive,
        });
        addLog(`USER: Created profile for "${form.email}"`);
        toast.success('User profile created');
      }
      resetForm();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (u: UserProfile) => {
    if (!db || !confirm(`Delete user "${u.email}"?`)) return;
    await deleteDoc(doc(db, 'userProfiles', u.uid));
    addLog(`USER: Deleted "${u.email}"`);
    toast.success('User deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} user(s)</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900">{editing ? 'Edit' : 'New'} User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Email *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} disabled={!!editing} className="px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" />
            <input placeholder="Display Name" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="admin">Admin (Customer)</option>
              <option value="user">Technician</option>
            </select>
            <select value={form.tenantId} onChange={e => setForm(p => ({ ...p, tenantId: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">No Customer Assigned</option>
              {tenants.map((t: Tenant) => <option key={t.id} value={t.id}>{t.companyName}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">{editing ? 'Update' : 'Create'} User</button>
            <button onClick={resetForm} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-500">User</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Last Login</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: UserProfile) => {
              const tenant = tenants.find((t: Tenant) => t.id === u.tenantId);
              return (
                <tr key={u.uid} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{u.displayName || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      u.role === 'dev' ? 'bg-red-100 text-red-700' : u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                    )}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{tenant?.companyName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(u)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No users yet.</p>}
      </div>
    </div>
  );
}

// ---------- LICENSES TAB ----------
function LicensesTab({ licenses, tenants, users, showAdd, setShowAdd, addLog }: any) {
  const [form, setForm] = useState({ tenantId: '', type: 'technician' as 'admin' | 'technician', assignedEmail: '' });

  const resetForm = () => { setForm({ tenantId: '', type: 'technician', assignedEmail: '' }); setShowAdd(false); };

  const handleCreate = async () => {
    if (!db || !form.tenantId) { toast.error('Select a customer'); return; }
    try {
      await addDoc(collection(db, 'licenses'), {
        tenantId: form.tenantId,
        type: form.type,
        status: 'active',
        createdAt: new Date().toISOString(),
        isIncluded: false,
        assignedEmail: form.assignedEmail || null,
      });

      // Update tenant license count
      const tenant = tenants.find((t: Tenant) => t.id === form.tenantId);
      if (tenant) {
        const field = form.type === 'admin' ? 'adminLicenses' : 'techLicenses';
        await updateDoc(doc(db, 'tenants', form.tenantId), { [field]: (tenant[field] || 0) + 1 });
      }

      addLog(`LICENSE: Created ${form.type} license for ${tenant?.companyName || form.tenantId}`);
      toast.success('License created');
      resetForm();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRevoke = async (l: License) => {
    if (!db || !confirm('Revoke this license?')) return;
    await updateDoc(doc(db, 'licenses', l.id), { status: 'suspended' });
    addLog(`LICENSE: Revoked ${l.type} license ${l.id}`);
    toast.success('License revoked');
  };

  const handleActivate = async (l: License) => {
    if (!db) return;
    await updateDoc(doc(db, 'licenses', l.id), { status: 'active' });
    addLog(`LICENSE: Activated ${l.type} license ${l.id}`);
    toast.success('License activated');
  };

  const handleDelete = async (l: License) => {
    if (!db || !confirm('Permanently delete this license?')) return;
    await deleteDoc(doc(db, 'licenses', l.id));
    addLog(`LICENSE: Deleted ${l.type} license ${l.id}`);
    toast.success('License deleted');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{licenses.length} license(s) total</p>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add License
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900">New License</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={form.tenantId} onChange={e => setForm(p => ({ ...p, tenantId: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">Select Customer *</option>
              {tenants.map((t: Tenant) => <option key={t.id} value={t.id}>{t.companyName}</option>)}
            </select>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as any }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="admin">Admin License</option>
              <option value="technician">Technician License ($29/mo extra)</option>
            </select>
            <input placeholder="Assign to email (optional)" value={form.assignedEmail} onChange={e => setForm(p => ({ ...p, assignedEmail: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Create License</button>
            <button onClick={resetForm} className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200">Cancel</button>
          </div>
        </div>
      )}

      {/* License list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Assigned To</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Included</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.map((l: License) => {
              const tenant = tenants.find((t: Tenant) => t.id === l.tenantId);
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 font-medium">{tenant?.companyName || l.tenantId}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      l.type === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'
                    )}>{l.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{l.assignedEmail || l.assignedName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      l.status === 'active' ? 'bg-emerald-100 text-emerald-700' : l.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    )}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{l.isIncluded ? <span className="text-emerald-600 font-medium">Included</span> : <span className="text-amber-600 font-medium">$29/mo</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.status === 'active' ? (
                        <button onClick={() => handleRevoke(l)} className="text-[11px] px-2 py-1 bg-rose-50 text-rose-600 rounded hover:bg-rose-100">Revoke</button>
                      ) : (
                        <button onClick={() => handleActivate(l)} className="text-[11px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">Activate</button>
                      )}
                      <button onClick={() => handleDelete(l)} className="p-1.5 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {licenses.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No licenses yet. Create a customer first.</p>}
      </div>
    </div>
  );
}
