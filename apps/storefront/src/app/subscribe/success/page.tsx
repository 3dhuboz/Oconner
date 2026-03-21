'use client';

export const runtime = 'edge';

import { CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SubscribeSuccessPage() {
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
            Your payment was successful and your subscription is now active. We&apos;ll deliver your first box on your next scheduled delivery day.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            You can manage or cancel your subscription anytime by contacting us.
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
