'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircle } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [updated, setUpdated] = useState(false);

  // Tell the API the customer completed Square payment
  useEffect(() => {
    if (!orderId || updated) return;
    api.post(`/api/orders/${orderId}/mark-paid`, {}).then(() => setUpdated(true)).catch(() => {});
  }, [orderId, updated]);

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <CheckCircle className="h-20 w-20 text-brand-mid mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-brand mb-3">Order Confirmed!</h1>
          <p className="text-gray-600 mb-2">
            Thank you for your order. We'll be in touch with delivery details.
          </p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-8">
              Order reference: <span className="font-mono font-medium">#{orderId.slice(-8).toUpperCase()}</span>
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {orderId && (
              <Link
                href={`/track/${orderId}`}
                className="bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-mid transition-colors"
              >
                Track My Order
              </Link>
            )}
            <Link
              href="/shop"
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
