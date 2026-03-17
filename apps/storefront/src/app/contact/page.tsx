'use client';

export const runtime = 'edge';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Mail, MapPin, Facebook, Send, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://butcher-api.oconner.com.au';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* ── Header ── */}
        <section className="bg-brand text-white py-16 px-4 text-center">
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Get in Touch
          </h1>
          <p className="text-brand-light text-lg max-w-xl mx-auto">
            Questions about our beef, placing a bulk order, or just want to say g'day?
            We'd love to hear from you.
          </p>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-12">

          {/* ── Contact info ── */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">How to reach us</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Email</p>
                    <a href="mailto:orders@oconnoragriculture.com.au" className="text-brand text-sm hover:underline">
                      orders@oconnoragriculture.com.au
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Facebook className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Facebook</p>
                    <a
                      href="https://www.facebook.com/profile.php?id=61574996320860"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm hover:underline"
                    >
                      @OConnorAgriculture
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5">Message us for quick responses</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Location</p>
                    <p className="text-gray-600 text-sm">Calliope & Boyne Valley, QLD</p>
                    <p className="text-xs text-gray-400 mt-0.5">Free delivery to your door</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-brand/5 rounded-2xl p-5 border border-brand/10">
              <h3 className="font-bold text-gray-900 mb-2">Bulk Orders</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Interested in a quarter or half share of beef? Get in touch and we'll walk you
                through the process, pricing, and next available cutting date.
              </p>
              <a
                href="mailto:orders@oconnoragriculture.com.au?subject=Bulk%20Order%20Enquiry"
                className="inline-flex items-center gap-2 mt-3 bg-brand text-white text-xs px-4 py-2 rounded-lg font-semibold hover:bg-brand-mid transition-colors"
              >
                <Mail className="h-3.5 w-3.5" /> Email about bulk orders
              </a>
            </div>
          </div>

          {/* ── Contact form ── */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Send a message</h2>

            {status === 'sent' ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 text-lg mb-2">Message sent!</h3>
                <p className="text-gray-600 text-sm">
                  Thanks for reaching out. We'll get back to you as soon as we can.
                </p>
                <button
                  onClick={() => { setForm({ name: '', email: '', subject: '', message: '' }); setStatus('idle'); }}
                  className="mt-4 text-brand text-sm font-medium hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors"
                    placeholder="Order enquiry, bulk beef, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
                    placeholder="How can we help you?"
                  />
                </div>
                {status === 'error' && (
                  <p className="text-red-600 text-xs">Something went wrong. Please try emailing us directly.</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full flex items-center justify-center gap-2 bg-brand text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-mid transition-colors disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {status === 'sending' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
