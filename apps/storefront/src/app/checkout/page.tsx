'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { api, formatCurrency } from '@butcher/shared';
import type { DeliveryDay } from '@butcher/shared';
import { useCart } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const FREE_DELIVERY_THRESHOLD = 10000; // $100 in cents
const DELIVERY_FEE_AMOUNT = 0;         // was 1000 ($10) — re-enable when delivery fees return

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const { items, total, clearCart } = useCart();
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    line1: '', line2: '', suburb: '', state: 'QLD', postcode: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState<{ promoId: string; code: string; discount: number; label: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [wantSoupBones, setWantSoupBones] = useState(false);
  const [wantOffal, setWantOffal] = useState(false);

  const BULK_IDS = ['prod-quarter-share', 'prod-half-share'];
  const hasBulkItem = items.some((i) => BULK_IDS.includes(i.productId));

  const selectedDay = deliveryDays.find((d) => d.id === selectedDayId);
  const isPickup = (selectedDay as any)?.type === 'pickup';
  const subtotal = total();
  const promoDiscount = promoApplied?.discount ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - promoDiscount);
  const deliveryFee = isPickup ? 0 : (discountedSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE_AMOUNT);
  const gst = 0;
  const grandTotal = discountedSubtotal + deliveryFee;

  useEffect(() => {
    api.deliveryDays.list(true)
      .then((data) => {
        const tomorrow = Date.now() + 86_400_000;
        const days = (data as DeliveryDay[]).filter(
          (d) => d.active && d.date >= tomorrow && (d.orderCount ?? 0) < (d.maxOrders ?? 999),
        );
        setDeliveryDays(days);
        if (days.length > 0) setSelectedDayId(days[0].id!);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        email: user.primaryEmailAddress?.emailAddress ?? f.email,
        name: user.fullName ?? f.name,
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayId) { setError('Please select a delivery day.'); return; }
    if (items.length === 0) { setError('Your cart is empty.'); return; }
    setSubmitting(true);
    setError('');

    try {
      const order = await api.orders.create({
        customerEmail: form.email,
        customerName: form.name,
        customerPhone: form.phone,
        clerkId: user?.id ?? undefined,
        deliveryDayId: selectedDayId,
        fulfillmentType: isPickup ? 'pickup' : 'delivery',
        deliveryAddress: isPickup
          ? { line1: (selectedDay as any)?.marketLocation ?? 'Market Pickup', suburb: '', state: 'QLD', postcode: '' }
          : { line1: form.line1, line2: form.line2, suburb: form.suburb, state: form.state, postcode: form.postcode },
        items: items.map((item) => BULK_IDS.includes(item.productId)
          ? { ...item, includeSoupBones: wantSoupBones, includeOffal: wantOffal }
          : item),
        subtotal,
        deliveryFee: deliveryFee,
        gst,
        total: grandTotal,
        promoId: promoApplied?.promoId ?? undefined,
        promoCode: promoApplied?.code ?? undefined,
        promoDiscount,
        notes: form.notes,
      }) as { id: string };

      // Create Square payment link and redirect customer to pay
      try {
        const paymentResult = await api.post<{ ok: boolean; paymentUrl?: string }>(`/api/orders/${order.id}/payment-link`, {});
        clearCart();
        if (paymentResult.paymentUrl) {
          window.location.href = paymentResult.paymentUrl;
          return;
        }
      } catch {
        // Payment link failed — still show success, staff can send invoice manually
      }

      clearCart();
      router.push(`/checkout/success?orderId=${order.id}`);
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

            {isPickup ? (
              <section>
                <h2 className="text-lg font-semibold mb-4">📍 Market Day Pickup</h2>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="font-medium text-orange-800">{(selectedDay as any)?.marketLocation || (selectedDay as any)?.zones || 'Market Location'}</p>
                  <p className="text-sm text-orange-600 mt-1">Your order will be ready for collection. No delivery fee!</p>
                </div>
              </section>
            ) : (
              <section>
                <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>
                <AddressAutocomplete
                  value={{ line1: form.line1, line2: form.line2, suburb: form.suburb, state: form.state, postcode: form.postcode }}
                  onChange={(addr) => setForm((prev) => ({ ...prev, line1: addr.line1, line2: addr.line2 ?? '', suburb: addr.suburb, state: addr.state, postcode: addr.postcode }))}
                />
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold mb-4">Delivery Day</h2>
              {deliveryDays.length === 0 ? (
                <p className="text-amber-600 text-sm">No delivery days available. Please check back soon.</p>
              ) : (
                <select value={selectedDayId} onChange={(e) => setSelectedDayId(e.target.value)} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm">
                  {deliveryDays.map((day) => {
                    const date = new Date(day.date);
                    return (
                      <option key={day.id} value={day.id}>
                        {(day as any).type === 'pickup' ? '🏪 ' : '🚚 '}
                        {date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} — {(day.maxOrders ?? 0) - (day.orderCount ?? 0)} spots left
                        {(day as any).type === 'pickup' ? ` · Pickup: ${(day as any).marketLocation || (day as any).zones || 'Market'}` : (day as any).zones ? ` · ${(day as any).zones}` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </section>

            <textarea placeholder="Delivery notes (optional)" value={form.notes} onChange={f('notes')} rows={3} className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm resize-none" />

            {hasBulkItem && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Bulk Share Options</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-amber-700">Your order includes a beef share. Would you like to include the following?</p>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-700 group-hover:text-brand transition-colors font-medium">Include soup bones</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wantSoupBones}
                      onClick={() => setWantSoupBones((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${wantSoupBones ? 'bg-brand' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wantSoupBones ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-700 group-hover:text-brand transition-colors font-medium">Include offal</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wantOffal}
                      onClick={() => setWantOffal((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${wantOffal ? 'bg-brand' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wantOffal ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                </div>
              </section>
            )}

            {/* Promo Code */}
            <section>
              <h2 className="text-lg font-semibold mb-3">Promo Code</h2>
              {promoApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-green-800">{promoApplied.code} — {promoApplied.label}</p>
                    <p className="text-xs text-green-600">Saving {formatCurrency(promoApplied.discount)}</p>
                  </div>
                  <button onClick={() => { setPromoApplied(null); setPromoInput(''); }} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    placeholder="Enter code"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                    className="flex-1 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm uppercase"
                  />
                  <button
                    type="button"
                    disabled={!promoInput.trim() || promoLoading}
                    onClick={async () => {
                      setPromoLoading(true);
                      setPromoError('');
                      try {
                        const res = await api.post<any>('/api/promo-codes/validate', { code: promoInput, subtotal });
                        if (res.valid) {
                          setPromoApplied({ promoId: res.promoId, code: res.code, discount: res.discount, label: res.label });
                        } else {
                          setPromoError(res.error ?? 'Invalid code');
                        }
                      } catch { setPromoError('Failed to validate code'); }
                      finally { setPromoLoading(false); }
                    }}
                    className="bg-brand text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-mid disabled:opacity-50"
                  >
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
            </section>
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
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({promoApplied?.label})</span>
                    <span>-{formatCurrency(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{isPickup ? 'Pickup' : 'Delivery'}</span>
                  <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                    {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
                  </span>
                </div>
                {/* Re-enable when delivery fees return:
                {!isPickup && DELIVERY_FEE_AMOUNT > 0 && subtotal < FREE_DELIVERY_THRESHOLD && (
                  <p className="text-xs text-green-600">Spend {formatCurrency(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery!</p>
                )} */}
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-brand">{formatCurrency(grandTotal)}</span></div>
              </div>

              {error && <p className="text-accent text-sm mt-4 p-3 bg-accent-light rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={submitting || deliveryDays.length === 0}
                className="w-full mt-6 bg-brand text-white py-3 rounded-lg font-medium hover:bg-brand-mid transition-colors disabled:opacity-50"
              >
                {submitting ? 'Placing Order…' : `Place Order — ${formatCurrency(grandTotal)}`}
              </button>
              <p className="text-xs text-center text-gray-400 mt-3">We'll confirm your order and arrange payment on delivery.</p>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
