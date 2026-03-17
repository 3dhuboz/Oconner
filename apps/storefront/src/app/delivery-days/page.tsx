import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { DeliveryDay } from '@butcher/shared';
import { api } from '@butcher/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

async function getDeliveryDays(): Promise<DeliveryDay[]> {
  const days = await api.deliveryDays.list(true) as DeliveryDay[];
  return days.filter((d) => d.active && d.date >= Date.now());
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
              const date = new Date(day.date);
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
                    {(day as any).deliveryWindowStart && (
                      <p className="text-sm text-brand-mid font-medium mt-1">
                        🕐 Estimated delivery from {formatTime((day as any).deliveryWindowStart)}
                      </p>
                    )}
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
