'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, addDoc, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useCart } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatCurrency } from '@butcher/shared';
import type { DeliveryDay } from '@butcher/shared';

const DELIVERY_FEE = 1500;
const GST_RATE = 0.1;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    line1: '', line2: '', suburb: '', state: 'WA', postcode: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const subtotal = total();
  const gst = Math.round(subtotal * GST_RATE);
  const grandTotal = subtotal + DELIVERY_FEE;

  useEffect(() => {
    const fetchDays = async () => {
      const q = query(
        collection(db, 'deliveryDays'),
        where('active', '==', true),
        where('date', '>=', new Date()),
        orderBy('date', 'asc'),
      );
      const snap = await getDocs(q);
      const days = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as DeliveryDay))
        .filter((d) => (d.orderCount ?? 0) < (d.maxOrders ?? 999));
      setDeliveryDays(days);
      if (days.length > 0) setSelectedDayId(days[0].id!);
    };
    fetchDays();

    const user = auth.currentUser;
    if (user) setForm((f) => ({ ...f, email: user.email ?? '', name: user.displayName ?? '' }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId) { setError('Please select a delivery day.'); return; }
    if (items.length === 0) { setError('Your cart is empty.'); return; }
    setSubmitting(true);
    setError('');

    try {
      let uid = auth.currentUser?.uid;
      if (!uid) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, form.email, Math.random().toString(36).slice(2) + '!A1');
          uid = cred.user.uid;
        } catch {
          const cred = await signInWithEmailAndPassword(auth, form.email, '');
          uid = cred.user.uid;
        }
      }

      const selectedDay = deliveryDays.find((d) => d.id === selectedDayId)!;
      const orderRef = await addDoc(collection(db, 'orders'), {
        customerId: uid,
        customerEmail: form.email,
        customerName: form.name,
        customerPhone: form.phone,
        deliveryDayId: selectedDayId,
        deliveryDate: selectedDay.date,
        deliveryAddress: { line1: form.line1, line2: form.line2, suburb: form.suburb, state: form.state, postcode: form.postcode },
        items,
        subtotal,
        deliveryFee: DELIVERY_FEE,
        gst,
        total: grandTotal,
        paymentProvider: 'stripe',
        paymentStatus: 'pending',
        status: 'pending_payment',
        notes: form.notes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await updateDoc(doc(db, 'deliveryDays', selectedDayId), {
        orderCount: increment(1),
      });

      clearCart();
      router.push(`/checkout/success?orderId=${orderRef.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-brand mb-8">Checkout</h1>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
              <div className="space-y-3">
                <input required placeholder="Full Name" value={form.name} onChange={f('name')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
                <input required type="email" placeholder="Email Address" value={form.email} onChange={f('email')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
                <input required placeholder="Phone Number" value={form.phone} onChange={f('phone')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
              <div className="space-y-3">
                <input required placeholder="Street Address" value={form.line1} onChange={f('line1')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
                <input placeholder="Apt / Unit (optional)" value={form.line2} onChange={f('line2')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="Suburb" value={form.suburb} onChange={f('suburb')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
                  <input required placeholder="Postcode" value={form.postcode} onChange={f('postcode')} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Delivery Day</h2>
              {deliveryDays.length === 0 ? (
                <p className="text-amber-600 text-sm">No delivery days available. Please check back soon.</p>
              ) : (
                <select value={selectedDayId} onChange={(e) => setSelectedDayId(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm">
                  {deliveryDays.map((day) => {
                    const date = (day.date as unknown as { toDate: () => Date }).toDate?.() ?? new Date();
                    return (
                      <option key={day.id} value={day.id}>
                        {date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} — {(day.maxOrders ?? 0) - (day.orderCount ?? 0)} spots left
                      </option>
                    );
                  })}
                </select>
              )}
            </section>

            <textarea placeholder="Delivery notes (optional)" value={form.notes} onChange={f('notes')} rows={3} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm resize-none" />
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
              <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.weight}`} className="flex justify-between text-sm">
                    <span className="truncate mr-2">{item.productName}</span>
                    <span className="flex-shrink-0">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <hr className="mb-3" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{formatCurrency(DELIVERY_FEE)}</span></div>
                <div className="flex justify-between text-gray-500"><span>GST (inc.)</span><span>{formatCurrency(gst)}</span></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-brand">{formatCurrency(grandTotal)}</span></div>
              </div>

              {error && <p className="text-accent text-sm mt-4 p-3 bg-accent-light rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={submitting || deliveryDays.length === 0}
                className="w-full mt-6 bg-brand text-white py-3 rounded-lg font-medium hover:bg-brand-mid transition-colors disabled:opacity-50"
              >
                {submitting ? 'Placing Order…' : `Pay ${formatCurrency(grandTotal)}`}
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">Secured by Stripe. Your payment info is never stored.</p>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
