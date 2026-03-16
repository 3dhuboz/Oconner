import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { DriverSession } from '@butcher/shared';
import { MapPin, Truck } from 'lucide-react';

export default function MapPage() {
  const [drivers, setDrivers] = useState<DriverSession[]>([]);

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return onSnapshot(
      query(collection(db, 'driverSessions'), where('active', '==', true)),
      (snap) => setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DriverSession))),
    );
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand mb-6">Driver Map</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-brand" />
            Active Drivers ({drivers.length})
          </h2>
          {drivers.length === 0 ? (
            <p className="text-gray-400 text-sm">No active drivers.</p>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div key={driver.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{driver.driverName ?? driver.driverUid}</p>
                    {driver.lastLat && driver.lastLng && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {driver.lastLat.toFixed(4)}, {driver.lastLng.toFixed(4)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Delivery: {driver.deliveryDayId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border overflow-hidden">
          <div className="h-96 lg:h-full min-h-80 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Map View</p>
              <p className="text-sm mt-1">
                Connect Google Maps API in <code className="text-xs bg-gray-200 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
