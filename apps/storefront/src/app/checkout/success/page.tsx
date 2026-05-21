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

  // Tell the API the customer completed Square payment. The API now verifies
  // the payment with Square before flipping the row — so a `status: 'pending'`
  // response means Square hasn't settled the order yet and we should retry.
  // Most payments settle by the time the redirect lands, but it can take a
  // beat. Give it ~10s of polling before letting the admin reconcile manually.
  useEffect(() => {
    if (!orderId || updated) return;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        try {
          const res = await api.post<{ ok: boolean; status?: string }>(`/api/orders/${orderId}/mark-paid`, {});
          if (res?.status === 'paid' || res?.status === 'partial') {
            if (!cancelled) setUpdated(true);
            return;
          }
        } catch {
          // 4xx/5xx — stop retrying; admin will reconcile from the order page.
          if (!cancelled) setUpdated(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setUpdated(true);
    })();
    return () => {
      cancelled = true;
    };
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
