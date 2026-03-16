import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Plus, X, Truck, User, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';

const EMPTY_FORM = { name: '', email: '', password: '' };

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

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'driver')),
      (snap) => setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DriverUser))),
    );
  }, []);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const firebaseConfig = {
        apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
        authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
        storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
      };
      const secondaryAppName = `driver-create-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name,
        email: form.email,
        role: 'driver',
        active: true,
        createdAt: serverTimestamp(),
      });
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create driver.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (driver: DriverUser) => {
    await updateDoc(doc(db, 'users', driver.id), { active: !driver.active });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Drivers</h1>
        <button
          onClick={() => { setShowForm(true); setError(''); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Driver
        </button>
      </div>

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
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Set login password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
