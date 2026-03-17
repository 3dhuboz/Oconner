'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useUser, useClerk, SignIn } from '@clerk/nextjs';
import { api, formatCurrency, ORDER_STATUS_LABELS } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { MapPin, Phone, Package, RefreshCw, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
  orderCount: number;
  totalSpent: number;
  createdAt: number;
}

interface Address {
  line1: string;
  line2?: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface Subscription {
  id: string;
  boxName: string;
  frequency: string;
  status: string;
  createdAt: number;
}

const STATUS_COLOURS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Every week',
  fortnightly: 'Every fortnight',
  monthly: 'Every month',
};

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState('');
  const [addrVal, setAddrVal] = useState<Address>({ line1: '', suburb: '', state: 'QLD', postcode: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get<Order[]>('/api/orders/mine').then(setOrders).catch(() => {});
    api.customers.me<CustomerProfile>().then((c) => {
      setCustomer(c as CustomerProfile);
      if (c) {
        const profile = c as CustomerProfile;
        setPhoneVal(profile.phone ?? '');
        setAddrVal(profile.addresses?.[0] ?? { line1: '', suburb: '', state: 'QLD', postcode: '' });
      }
    }).catch(() => {});
    api.subscriptions.mine<Subscription[]>().then((s) => setSubscriptions(s as Subscription[])).catch(() => {});
  }, [user]);

  const savePhone = async () => {
    setSaving(true);
    try {
      await api.customers.updateMe({ phone: phoneVal });
      setCustomer((prev) => prev ? { ...prev, phone: phoneVal } : prev);
      setEditingPhone(false);
    } finally { setSaving(false); }
  };

  const saveAddress = async () => {
    setSaving(true);
    try {
      const newAddresses = [addrVal, ...(customer?.addresses?.slice(1) ?? [])];
      await api.customers.updateMe({ addresses: newAddresses });
      setCustomer((prev) => prev ? { ...prev, addresses: newAddresses } : prev);
      setEditingAddress(false);
    } finally { setSaving(false); }
  };

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

  const initials = (user.fullName ?? user.primaryEmailAddress?.emailAddress ?? '?')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const activeSubscription = subscriptions.find((s) => s.status === 'active' || s.status === 'paused');
  const defaultAddress = customer?.addresses?.[0];

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Profile card ── */}
        <div className="bg-white rounded-2xl border p-6 flex items-start gap-5">
          <div className="h-16 w-16 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.fullName ?? customer?.name ?? 'My Account'}</h1>
                <p className="text-sm text-gray-500">{user.primaryEmailAddress?.emailAddress}</p>
                {customer && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Member since {new Date(customer.createdAt).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
                    {customer.orderCount > 0 && ` · ${customer.orderCount} order${customer.orderCount !== 1 ? 's' : ''}`}
                    {customer.totalSpent > 0 && ` · ${formatCurrency(customer.totalSpent)} spent`}
                  </p>
                )}
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors border border-gray-200 rounded-lg px-3 py-1.5 flex-shrink-0"
              >
                Sign out
              </button>
            </div>

            {/* Phone */}
            <div className="mt-3 flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              {editingPhone ? (
                <div className="flex items-center gap-2">
                  <input
                    value={phoneVal}
                    onChange={(e) => setPhoneVal(e.target.value)}
                    placeholder="04xx xxx xxx"
                    className="text-sm border rounded px-2 py-1 w-40 focus:outline-none focus:border-brand"
                  />
                  <button onClick={savePhone} disabled={saving} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingPhone(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{customer?.phone || <span className="text-gray-400 italic">No phone saved</span>}</span>
                  <button onClick={() => setEditingPhone(true)} className="text-gray-300 hover:text-brand transition-colors"><Pencil className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Delivery address ── */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MapPin className="h-4 w-4 text-brand" /> Delivery Address</h2>
            {!editingAddress && (
              <button onClick={() => setEditingAddress(true)} className="text-xs text-brand hover:underline flex items-center gap-1">
                <Pencil className="h-3 w-3" /> {defaultAddress ? 'Edit' : 'Add address'}
              </button>
            )}
          </div>

          {editingAddress ? (
            <div className="space-y-3">
              <input value={addrVal.line1} onChange={(e) => setAddrVal((a) => ({ ...a, line1: e.target.value }))}
                placeholder="Street address" className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:border-brand" />
              <input value={addrVal.line2 ?? ''} onChange={(e) => setAddrVal((a) => ({ ...a, line2: e.target.value }))}
                placeholder="Apt / unit (optional)" className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:border-brand" />
              <div className="grid grid-cols-3 gap-2">
                <input value={addrVal.suburb} onChange={(e) => setAddrVal((a) => ({ ...a, suburb: e.target.value }))}
                  placeholder="Suburb" className="col-span-2 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:border-brand" />
                <input value={addrVal.postcode} onChange={(e) => setAddrVal((a) => ({ ...a, postcode: e.target.value }))}
                  placeholder="Postcode" className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:border-brand" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={saveAddress} disabled={saving}
                  className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-mid transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save address'}
                </button>
                <button onClick={() => setEditingAddress(false)} className="text-sm text-gray-500 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : defaultAddress ? (
            <p className="text-sm text-gray-700 leading-relaxed">
              {defaultAddress.line1}{defaultAddress.line2 ? `, ${defaultAddress.line2}` : ''}<br />
              {defaultAddress.suburb} {defaultAddress.state} {defaultAddress.postcode}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">No delivery address saved yet.</p>
          )}
        </div>

        {/* ── Subscription ── */}
        {activeSubscription && (
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><RefreshCw className="h-4 w-4 text-brand" /> My Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{activeSubscription.boxName}</p>
                <p className="text-sm text-gray-500">{FREQ_LABELS[activeSubscription.frequency] ?? activeSubscription.frequency}</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${activeSubscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {activeSubscription.status === 'active' ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        )}

        {/* ── Order history ── */}
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><Package className="h-4 w-4 text-brand" /> Order History</h2>
          {orders.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No orders yet</p>
              <Link href="/shop" className="text-brand hover:underline text-sm mt-2 inline-block">Browse the shop →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const expanded = expandedOrder === order.id;
                return (
                  <div key={order.id} className="bg-white rounded-2xl border overflow-hidden">
                    <button
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedOrder(expanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">#{(order.id ?? '').slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full hidden sm:inline-flex ${STATUS_COLOURS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold text-gray-900 text-sm">{formatCurrency(order.total)}</span>
                        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t px-5 py-4 bg-gray-50">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full sm:hidden inline-flex mb-3 ${STATUS_COLOURS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        <div className="space-y-2 mb-4">
                          {(order.items ?? []).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">
                                {item.productName}
                                {item.weight ? ` — ${item.weight >= 1000 ? `${item.weight / 1000}kg` : `${item.weight}g`}` : ''}
                                {(item.quantity ?? 1) > 1 ? ` × ${item.quantity}` : ''}
                              </span>
                              <span className="text-gray-900 font-medium">{formatCurrency(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-3 space-y-1 text-sm">
                          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                          {order.deliveryFee > 0 && <div className="flex justify-between text-gray-500"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>}
                          <div className="flex justify-between font-semibold text-gray-900 pt-1"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                        </div>
                        {(order.status === 'out_for_delivery' || order.status === 'delivered') && (
                          <Link href={`/track/${order.id}`} className="mt-4 inline-block text-sm text-brand font-medium hover:underline">
                            Track delivery →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
