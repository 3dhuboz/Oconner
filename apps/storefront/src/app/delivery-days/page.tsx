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

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-brand mb-1">Delivery Days</h1>
        <p className="text-gray-500 mb-8">Select a delivery date to start your order.</p>
        <DeliveryCalendar days={days} />
      </main>
      <Footer />
    </>
  );
}
