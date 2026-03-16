'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CheckCircle, Package, RefreshCcw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const BOXES = [
  { id: 'bbq', name: 'BBQ Box', price: 290, weight: '7–9 kg', desc: 'Rib Fillet, Eye Fillet, Sirloin, Topside, Brisket, Mince, Sausages' },
  { id: 'family', name: 'Family Box', price: 290, weight: '10–12 kg', desc: 'Rump, Y-Bone, Rib Roast, Silverside, Diced Beef, Stir Fry, Mince, Sausages' },
  { id: 'double', name: 'Double Box', price: 550, weight: '17–21 kg', desc: 'BBQ Box + Family Box combined — best value per kg' },
  { id: 'value', name: 'Value Box', price: 220, weight: '10 kg', desc: '50% Mince & Sausages, 25% Roasts, 25% Secondary Cuts' },
];

const FREQUENCIES = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'fortnightly', label: 'Fortnightly' },
  { id: 'monthly', label: 'Monthly' },
];

export default function SubscribePage() {
  const [step, setStep] = useState<'select' | 'details' | 'done'>('select');
  const [selectedBox, setSelectedBox] = useState('family');
  const [frequency, setFrequency] = useState('fortnightly');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', suburb: '', postcode: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await addDoc(collection(db, 'subscriptions'), {
      boxId: selectedBox,
      boxName: BOXES.find((b) => b.id === selectedBox)?.name,
      frequency,
      ...form,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setStep('done');
  };

  const box = BOXES.find((b) => b.id === selectedBox);

  if (step === 'done') {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-brand mb-2">You're on the list!</h2>
            <p className="text-gray-600 mb-6">
              Thanks, <strong>{form.name}</strong>. We'll be in touch to confirm your <strong>{box?.name}</strong> subscription ({frequency}).
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
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm font-medium mb-3">
              <RefreshCcw className="h-4 w-4" /> Regular Delivery Subscription
            </div>
            <h1 className="text-4xl font-black text-brand">Never Run Out of Beef</h1>
            <p className="text-gray-600 mt-3 text-lg">
              Set up a regular meat box delivery. We'll notify you before each drop-off.
            </p>
          </div>

          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-bold text-lg text-brand mb-3">1. Choose your box</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {BOXES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBox(b.id)}
                      className={`text-left rounded-2xl border-2 p-5 transition-all ${
                        selectedBox === b.id
                          ? 'border-brand bg-brand/5'
                          : 'border-gray-200 bg-white hover:border-brand/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-brand">{b.name}</p>
                          <p className="text-xs text-gray-500">{b.weight}</p>
                        </div>
                        <span className="text-lg font-black text-brand">${b.price}</span>
                      </div>
                      <p className="text-sm text-gray-600">{b.desc}</p>
                      {selectedBox === b.id && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-brand font-medium">
                          <CheckCircle className="h-3.5 w-3.5" /> Selected
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-bold text-lg text-brand mb-3">2. How often?</h2>
                <div className="flex gap-3 flex-wrap">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrequency(f.id)}
                      className={`px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${
                        frequency === f.id
                          ? 'border-brand bg-brand text-white'
                          : 'border-gray-200 bg-white hover:border-brand/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-brand text-white rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-bold">{box?.name} — {frequency}</p>
                  <p className="text-white/70 text-sm">${box?.price} per delivery · Free delivery included</p>
                </div>
                <button
                  onClick={() => setStep('details')}
                  className="bg-white text-brand font-bold px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-8 space-y-4">
              <h2 className="font-bold text-xl text-brand mb-2 flex items-center gap-2">
                <Package className="h-5 w-5" /> Your Delivery Details
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                <strong>{box?.name}</strong> · {frequency} · ${box?.price}/delivery
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="John Smith" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone *</label>
                  <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="04xx xxx xxx" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Street Address *</label>
                  <input required value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="123 Main St" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Suburb *</label>
                  <input required value={form.suburb} onChange={(e) => setForm((f) => ({ ...f, suburb: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Gladstone" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Postcode *</label>
                  <input required value={form.postcode} onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="4680" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Delivery Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="e.g. Leave at front door. Gate code: 1234. No dogs on Saturdays."
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('select')} className="flex-1 border py-3 rounded-xl text-sm font-medium">← Back</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand text-white py-3 rounded-xl font-bold disabled:opacity-50">
                  {saving ? 'Submitting…' : 'Submit Subscription Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
