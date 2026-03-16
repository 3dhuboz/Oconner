'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Order } from '@butcher/shared';
import { formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const q = query(
          collection(db, 'orders'),
          where('customerId', '==', u.uid),
          orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-brand mb-6 text-center">{isRegister ? 'Create Account' : 'Sign In'}</h1>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
              {authError && <p className="text-accent text-sm">{authError}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-mid transition-colors disabled:opacity-50">
                {submitting ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>
            <button onClick={() => setIsRegister(!isRegister)} className="w-full text-center text-sm text-gray-500 hover:text-brand mt-4 transition-colors">
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-brand">My Account</h1>
            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-500 hover:text-accent transition-colors border rounded-lg px-4 py-2">
            Sign Out
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-4">Order History</h2>
        {orders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-500">
            <p>No orders yet.</p>
            <Link href="/shop" className="text-brand hover:underline text-sm mt-2 inline-block">Start shopping →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium">#{(order.id ?? '').slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''} · {formatCurrency(order.total)}</p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <Link href={`/track/${order.id}`} className="text-sm text-brand hover:underline font-medium">
                  Track →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
