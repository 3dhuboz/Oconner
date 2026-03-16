import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { DeliveryDay } from '@butcher/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

async function getDeliveryDays(): Promise<DeliveryDay[]> {
  const now = new Date();
  const q = query(
    collection(db, 'deliveryDays'),
    where('active', '==', true),
    where('date', '>=', now),
    orderBy('date', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryDay));
}

export default async function DeliveryDaysPage() {
  const days = await getDeliveryDays();

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-brand mb-2">Delivery Days</h1>
        <p className="text-gray-600 mb-8">Choose a delivery day when placing your order.</p>

        {days.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-12 text-center text-gray-500">
            <p className="text-lg">No upcoming delivery days scheduled.</p>
            <p className="text-sm mt-2">Please check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day) => {
              const date = (day.date as unknown as { toDate: () => Date }).toDate?.() ?? new Date(day.date as unknown as string);
              const spotsLeft = (day.maxOrders ?? 0) - (day.orderCount ?? 0);
              const isFull = spotsLeft <= 0;

              return (
                <div
                  key={day.id}
                  className={`bg-white rounded-xl border p-6 flex items-center justify-between ${isFull ? 'opacity-60' : 'hover:border-brand'} transition-colors`}
                >
                  <div>
                    <p className="font-semibold text-lg">
                      {date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isFull ? (
                        <span className="text-accent font-medium">Fully booked</span>
                      ) : (
                        <span className="text-brand-mid font-medium">{spotsLeft} spots remaining</span>
                      )}
                    </p>
                    {day.notes && <p className="text-sm text-gray-400 mt-1">{day.notes}</p>}
                  </div>
                  <Link
                    href={isFull ? '#' : `/shop?deliveryDay=${day.id}`}
                    className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                      isFull
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-brand text-white hover:bg-brand-mid'
                    }`}
                  >
                    {isFull ? 'Full' : 'Order for this day'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
