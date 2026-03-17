'use client';

import { useEffect, useState } from 'react';
import { useUser, useClerk, SignIn } from '@clerk/nextjs';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>('/api/orders/mine')
      .then((data) => setOrders(data))
      .catch(() => {});
  }, [user]);

  if (!isLoaded) {
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
          <SignIn routing="hash" />
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
            <p className="text-gray-500 text-sm mt-1">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
          <button onClick={() => signOut()} className="text-sm text-gray-500 hover:text-accent transition-colors border rounded-lg px-4 py-2">
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
