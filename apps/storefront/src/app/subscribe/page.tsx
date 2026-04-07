'use client';

export const runtime = 'edge';

import { useState, useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';
import { api, formatCurrency } from '@butcher/shared';
import type { Product } from '@butcher/shared';
import { CheckCircle, Package, RefreshCcw, Truck, Clock, Leaf, Star, ChevronRight, ArrowLeftRight, CreditCard, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/lib/cart';

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID ?? '';
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? '';

const FREQUENCIES = [
  { id: 'weekly', label: 'Weekly', sub: 'Every week', deliveries: 52 },
  { id: 'fortnightly', label: 'Fortnightly', sub: 'Every 2 weeks', deliveries: 26 },
  { id: 'monthly', label: 'Monthly', sub: 'Once a month', deliveries: 12 },
];

const VALUE_PROPS = [
  { icon: <Truck className="h-6 w-6" />, title: 'Free Delivery', body: 'Every box is delivered straight to your door at no extra cost.' },
  { icon: <Clock className="h-6 w-6" />, title: 'Skip or Cancel Anytime', body: 'Full flexibility — pause, skip or cancel with no lock-in period.' },
  { icon: <Leaf className="h-6 w-6" />, title: '100% Grass Fed', body: 'Locally raised in the Boyne Valley, Calliope QLD. Farm-fresh guaranteed.' },
];

const GRADIENTS = [
  'from-green-900 to-green-700',
  'from-red-900 to-red-700',
  'from-amber-900 to-amber-700',
  'from-slate-700 to-slate-600',
  'from-emerald-900 to-emerald-700',
  'from-rose-900 to-rose-700',
];

export default function SubscribePage() {
  const [step, setStep] = useState<'select' | 'details' | 'done'>('select');
  const [boxes, setBoxes] = useState<Product[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [alternateBox, setAlternateBox] = useState<string | null>(null);
  const [alternating, setAlternating] = useState(false);
  const [frequency, setFrequency] = useState('fortnightly');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', suburb: '', postcode: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [payError, setPayError] = useState('');
  const [squareReady, setSquareReady] = useState(false);
  const cardRef = useRef<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const { items } = useCart();

  // Initialize Square card form when step changes to 'details'
  const initSquareCard = useCallback(async () => {
    if (!SQUARE_APP_ID || !SQUARE_LOCATION_ID || cardRef.current) return;
    try {
      const payments = (window as any).Square?.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
      if (!payments) return;
      const card = await payments.card();
      if (cardContainerRef.current) {
        await card.attach(cardContainerRef.current);
        cardRef.current = card;
        setSquareReady(true);
      }
    } catch (e) {
      console.error('Square init failed:', e);
    }
  }, []);

  useEffect(() => {
    if (step === 'details' && SQUARE_APP_ID) {
      // Small delay to ensure DOM is ready
      const t = setTimeout(initSquareCard, 300);
      return () => clearTimeout(t);
    }
  }, [step, initSquareCard]);

  useEffect(() => {
    api.products.list(true).then((data) => {
      const packs = (data as Product[])
        .filter((p) => p.category === 'packs' && p.active)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setBoxes(packs);
      if (packs.length > 0 && !selectedBox) setSelectedBox(packs[0].id!);
    }).catch(() => {});
  }, []);

  const box = boxes.find((b) => b.id === selectedBox);
  const altBoxProduct = alternating && alternateBox ? boxes.find((b) => b.id === alternateBox) : null;
  const freq = FREQUENCIES.find((f) => f.id === frequency)!;
  const boxPrice = box ? (box.fixedPrice ?? 0) / 100 : 0;
  const annualSpend = boxPrice * (freq?.deliveries ?? 26);

  const cartPack = items.find((i) => i.isMeatPack);
  const suggestedBoxId = cartPack
    ? boxes.find((b) => b.name.toLowerCase().includes(cartPack.productName.toLowerCase().split(' ')[0]))?.id ?? null
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!box) return;
    setSaving(true);
    setPayError('');

    try {
      let sourceId: string | undefined;

      // Tokenize the card if Square SDK is ready
      if (cardRef.current && squareReady) {
        const tokenResult = await cardRef.current.tokenize();
        if (tokenResult.status === 'OK') {
          sourceId = tokenResult.token;
        } else {
          setPayError(tokenResult.errors?.[0]?.message ?? 'Card validation failed. Please check your details.');
          setSaving(false);
          return;
        }
      }

      const result = await api.post<{ ok?: boolean; url?: string; cardLast4?: string }>('/api/subscriptions/checkout', {
        boxId: selectedBox,
        boxName: box.name,
        alternateBoxId: altBoxProduct?.id ?? undefined,
        alternateBoxName: altBoxProduct?.name ?? undefined,
        frequency,
        ...form,
        sourceId,
      });

      if (result.ok) {
        // Payment processed inline — show success
        setStep('done');
      } else if (result.url) {
        // Fallback: redirect to Square Payment Link
        window.location.href = result.url;
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setSaving(false);
    }
  };

  if (step === 'done' || !freq) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-brand mb-2">Subscription Active!</h2>
            <p className="text-gray-600 mb-6">
              Thanks, <strong>{form.name}</strong>. Your <strong>{box?.name}</strong> subscription ({frequency}) is now active. We&apos;ll deliver your first box soon.
            </p>
            <a href="/" className="inline-block bg-brand text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-mid transition-colors">
              Back to Home
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <div className="relative bg-brand overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80')] bg-cover bg-center" />
          <div className="relative max-w-4xl mx-auto px-4 py-16 text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <RefreshCcw className="h-4 w-4" /> Regular Delivery Subscription
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              Never Run Out of<br />Premium Beef
            </h1>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Grass-fed, locally raised from the Boyne Valley. Choose your box, set your schedule, and we handle the rest.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/90">
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> Free delivery</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Skip anytime</span>
              <span className="flex items-center gap-1.5"><Leaf className="h-4 w-4" /> Grass-fed, Calliope QLD</span>
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4" /> Trusted by local families</span>
            </div>
          </div>
        </div>

        {/* Cart upsell banner */}
        {cartPack && step === 'select' && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-900">
                  <strong>You have {cartPack.productName} in your cart!</strong> Subscribe instead and never worry about reordering.
                </p>
              </div>
              {suggestedBoxId && (
                <button
                  onClick={() => setSelectedBox(suggestedBoxId)}
                  className="flex-shrink-0 bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap"
                >
                  Subscribe &amp; Save
                </button>
              )}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-10">
          {step === 'select' && (
            <div className="space-y-10">

              {/* Box selection */}
              <div>
                <h2 className="text-xl font-black text-brand mb-1">1. Choose your box</h2>
                <p className="text-sm text-gray-500 mb-4">All boxes packed fresh. Prices include delivery.</p>
                {boxes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">Loading products…</div>
                ) : (
                  <div className="space-y-3">
                    {boxes.map((b, i) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBox(b.id!)}
                        className={`relative w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 flex ${
                          selectedBox === b.id
                            ? 'border-brand bg-brand/5 shadow-lg shadow-brand/15'
                            : 'border-gray-200 bg-white hover:border-brand/40 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex-shrink-0 w-28 sm:w-36">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full min-h-[96px] bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-3xl`}>
                              🥩
                            </div>
                          )}
                        </div>
                        <div className="flex-1 px-4 py-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-black text-brand text-base leading-tight">{b.name}</p>
                            </div>
                            <span className="text-xl font-black text-brand flex-shrink-0">{formatCurrency(b.fixedPrice ?? 0)}</span>
                          </div>
                          {b.description && (
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{b.description}</p>
                          )}
                          {selectedBox === b.id && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-brand font-bold">
                              <CheckCircle className="h-3.5 w-3.5" /> Selected
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Alternate box toggle */}
              <div>
                <h2 className="text-xl font-black text-brand mb-1">2. Mix it up?</h2>
                <p className="text-sm text-gray-500 mb-4">Some customers love alternating between two boxes — variety keeps things fresh.</p>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => { setAlternating(false); setAlternateBox(null); }}
                    className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-semibold transition-all ${!alternating ? 'border-brand bg-brand text-white shadow-lg shadow-brand/20' : 'border-gray-200 bg-white text-gray-600 hover:border-brand/40'}`}
                  >
                    Same box every time
                  </button>
                  <button
                    onClick={() => setAlternating(true)}
                    className={`flex-1 py-3 px-4 rounded-2xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${alternating ? 'border-brand bg-brand text-white shadow-lg shadow-brand/20' : 'border-gray-200 bg-white text-gray-600 hover:border-brand/40'}`}
                  >
                    <ArrowLeftRight className="h-4 w-4" /> Alternate two boxes
                  </button>
                </div>

                {alternating && (
                  <div className="bg-brand/5 rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-brand">Choose your alternate box (delivered on the opposite week):</p>
                    <div className="space-y-2">
                      {boxes.filter((b) => b.id !== selectedBox).map((b, i) => (
                        <button
                          key={b.id}
                          onClick={() => setAlternateBox(b.id!)}
                          className={`w-full text-left flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                            alternateBox === b.id
                              ? 'border-brand bg-white shadow-sm'
                              : 'border-gray-200 bg-white hover:border-brand/40'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            {b.imageUrl
                              ? <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />
                              : <div className={`w-full h-full bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center text-lg`}>🥩</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-brand">{b.name}</p>
                            <p className="text-xs text-gray-400">{formatCurrency(b.fixedPrice ?? 0)}</p>
                          </div>
                          {alternateBox === b.id && <CheckCircle className="h-5 w-5 text-brand flex-shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {alternateBox && box && altBoxProduct && (
                      <div className="mt-3 bg-white rounded-xl border border-brand/20 px-4 py-3">
                        <p className="text-xs font-bold text-brand mb-2 uppercase tracking-wide">Your rotation preview</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="bg-brand text-white px-2.5 py-1 rounded-lg font-semibold text-xs">Delivery 1</span>
                          <span className="font-medium">{box.name}</span>
                          <ArrowLeftRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="bg-brand/20 text-brand px-2.5 py-1 rounded-lg font-semibold text-xs">Delivery 2</span>
                          <span className="font-medium">{altBoxProduct.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">…then repeats. You can switch anytime.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Frequency */}
              <div>
                <h2 className="text-xl font-black text-brand mb-1">3. How often?</h2>
                <p className="text-sm text-gray-500 mb-4">More frequent = fresher beef, always stocked.</p>
                <div className="grid grid-cols-3 gap-3">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrequency(f.id)}
                      className={`py-4 px-3 rounded-2xl border-2 font-semibold transition-all duration-200 text-center ${
                        frequency === f.id
                          ? 'border-brand bg-brand text-white shadow-lg shadow-brand/30 scale-105'
                          : 'border-gray-200 bg-white hover:border-brand/40'
                      }`}
                    >
                      <p className="font-black text-base">{f.label}</p>
                      <p className={`text-xs mt-0.5 ${frequency === f.id ? 'text-white/70' : 'text-gray-400'}`}>{f.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary CTA */}
              {box && (
                <div className="bg-brand rounded-2xl p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      {alternating && altBoxProduct ? (
                        <p className="text-xl font-black">{box.name} ⇄ {altBoxProduct.name} — {freq.label}</p>
                      ) : (
                        <p className="text-xl font-black">{box.name} — {freq.label}</p>
                      )}
                      <p className="text-white/70 text-sm mt-0.5">{formatCurrency(box.fixedPrice ?? 0)} per delivery · Free delivery included</p>
                      <p className="text-white/80 text-sm mt-1">
                        {freq.deliveries} deliveries/year · approx. ${annualSpend.toLocaleString()}/year
                      </p>
                    </div>
                    <button
                      onClick={() => setStep('details')}
                      className="flex items-center justify-center gap-2 bg-white text-brand font-black px-7 py-3.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0 text-lg"
                    >
                      Get Started <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Value props */}
              <div className="grid sm:grid-cols-3 gap-4">
                {VALUE_PROPS.map((v) => (
                  <div key={v.title} className="bg-brand/5 rounded-2xl p-5 text-center">
                    <div className="w-11 h-11 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-3 text-brand">
                      {v.icon}
                    </div>
                    <p className="font-black text-brand mb-1">{v.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{v.body}</p>
                  </div>
                ))}
              </div>

            </div>
          )}

          {step === 'details' && box && (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-5">
              <button type="button" onClick={() => setStep('select')} className="text-sm text-gray-400 hover:text-brand flex items-center gap-1 mb-1">
                ← Back to box selection
              </button>

              <div className="flex items-center gap-4">
                {box.imageUrl ? (
                  <img src={box.imageUrl} alt={box.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand to-brand-mid flex items-center justify-center text-2xl flex-shrink-0">🥩</div>
                )}
                <div>
                  <h2 className="font-black text-xl text-brand flex items-center gap-2">
                    <Package className="h-5 w-5" /> Your Delivery Details
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{box.name} · {frequency} · {formatCurrency(box.fixedPrice ?? 0)}/delivery · Free delivery</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Smith' },
                  { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
                  { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '04xx xxx xxx' },
                  { key: 'address', label: 'Street Address', type: 'text', placeholder: '123 Main St' },
                  { key: 'suburb', label: 'Suburb', type: 'text', placeholder: 'Gladstone' },
                  { key: 'postcode', label: 'Postcode', type: 'text', placeholder: '4680' },
                ] as const).map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">{field.label} *</label>
                    <input
                      required
                      type={field.type}
                      value={form[field.key]}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Delivery Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="e.g. Leave at front door. Gate code: 1234."
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>

              {/* Square card input */}
              {SQUARE_APP_ID && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-2 block flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Payment Details
                  </label>
                  <div
                    ref={cardContainerRef}
                    id="card-container"
                    className="border rounded-xl p-3 min-h-[50px] bg-white"
                  />
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Your card will be saved for automatic recurring payments. You can cancel anytime.
                  </p>
                </div>
              )}

              {payError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {payError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || (SQUARE_APP_ID ? !squareReady : false)}
                className="w-full bg-brand text-white py-4 rounded-xl font-black text-lg disabled:opacity-50 hover:bg-brand-mid transition-colors"
              >
                {saving ? 'Processing payment…' : `Subscribe & Pay ${box ? formatCurrency(box.fixedPrice ?? 0) : ''}`}
              </button>
              <Script src="https://web.squareup.com/v1/square.js" strategy="lazyOnload" />
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
