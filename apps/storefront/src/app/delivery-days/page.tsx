import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { DeliveryDay } from '@butcher/shared';
import { api } from '@butcher/shared';
import DeliveryCalendar from './DeliveryCalendar';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

async function getDeliveryDays(): Promise<DeliveryDay[]> {
  try {
    const days = await api.deliveryDays.list(true) as DeliveryDay[];
    return days.filter((d) => d.active);
  } catch {
    return [];
  }
}

export default async function DeliveryDaysPage() {
  const days = await getDeliveryDays();
  const now = Date.now();
  const marketDays = days.filter((d: any) => d.type === 'pickup' && d.date >= now);
  const deliveryDays2 = days.filter((d: any) => d.type !== 'pickup');

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-brand mb-1">Delivery Days</h1>
        <p className="text-gray-500 mb-8">Select a delivery date to start your order.</p>
        <DeliveryCalendar days={deliveryDays2} />

        {marketDays.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-brand mb-2 flex items-center gap-2">
              🏪 Upcoming Market Days
            </h2>
            <p className="text-gray-500 mb-6">Come see us in person — no delivery fee on market day orders!</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketDays.map((day: any) => {
                const date = new Date(day.date);
                const spotsLeft = (day.maxOrders ?? 0) - (day.orderCount ?? 0);
                return (
                  <div key={day.id} className="bg-white rounded-xl border-2 border-orange-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg text-gray-900">
                          {date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-sm text-orange-600 font-medium mt-0.5">
                          📍 {day.marketLocation || day.zones || 'Market Pickup'}
                        </p>
                      </div>
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
                        Pickup
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        {day.deliveryWindowStart && `From ${day.deliveryWindowStart}`}
                        {spotsLeft > 0 ? ` · ${spotsLeft} spots left` : ''}
                      </p>
                      <a href="/shop" className="text-sm text-brand font-medium hover:underline">
                        Order now →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
