import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import type { Stop, DeliveryDay } from '@butcher/shared';
import { useGPS, type GPSStatus } from '../hooks/useGPS';
import { MapPin, Navigation, User, CheckCircle, Clock, Truck } from 'lucide-react';

export default function StopsPage() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [deliveryDay, setDeliveryDay] = useState<DeliveryDay | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { status: gpsStatus, error: gpsError, tracking } = useGPS({
    sessionId,
    enabled: trackingEnabled,
  });

  useEffect(() => {
    if (!user) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    return onSnapshot(
      query(
        collection(db, 'deliveryDays'),
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<', Timestamp.fromDate(tomorrow)),
        where('active', '==', true),
      ),
      (snap) => {
        if (!snap.empty) {
          const day = { id: snap.docs[0].id, ...snap.docs[0].data() } as DeliveryDay;
          setDeliveryDay(day);
        }
      },
    );
  }, [user]);

  useEffect(() => {
    if (!deliveryDay?.id) return;
    return onSnapshot(
      query(
        collection(db, 'stops'),
        where('deliveryDayId', '==', deliveryDay.id),
        orderBy('sequence', 'asc'),
      ),
      (snap) => setStops(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Stop))),
    );
  }, [deliveryDay?.id]);

  const handleStartDay = async () => {
    if (!deliveryDay?.id || !user) return;
    const ref = await addDoc(collection(db, 'driverSessions'), {
      driverId: user.uid,
      driverUid: user.uid,
      driverName: user.displayName ?? user.email,
      deliveryDayId: deliveryDay.id,
      active: true,
      gpsStatus: 'idle',
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    setSessionId(ref.id);
    setTrackingEnabled(true);
  };

  const handleEndDay = async () => {
    if (sessionId) {
      await updateDoc(doc(db, 'driverSessions', sessionId), {
        active: false,
        endedAt: Timestamp.now(),
      });
    }
    setTrackingEnabled(false);
    setSessionId(null);
  };

  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const total = stops.length;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-brand text-white px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-lg">Today's Deliveries</h1>
            {deliveryDay ? (
              <p className="text-white/70 text-sm">
                {(deliveryDay.date as unknown as { toDate: () => Date }).toDate?.()?.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            ) : (
              <p className="text-white/50 text-sm">No delivery day today</p>
            )}
          </div>
          <button onClick={() => navigate('/profile')} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5" />
          </button>
        </div>

        {deliveryDay && (
          <>
            <div className="bg-white/10 rounded-xl p-3 mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span>{delivered} of {total} delivered</span>
                <span className="font-medium">{total > 0 ? Math.round((delivered / total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }} />
              </div>
            </div>

            {!trackingEnabled ? (
              <button onClick={handleStartDay} className="w-full bg-white text-brand font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                <Navigation className="h-4 w-4" />
                Start Delivery Day
              </button>
            ) : (
              <div className="flex gap-2">
                <GPSStatusBadge status={gpsStatus} />
                <button onClick={handleEndDay} className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm">
                  End Day
                </button>
              </div>
            )}
            {(gpsStatus === 'unavailable' || gpsStatus === 'permission_denied') && (
              <p className="text-amber-200 text-xs mt-1 bg-amber-500/20 rounded-lg px-2 py-1">
                {gpsStatus === 'permission_denied'
                  ? '⚠ Location permission denied — enable in browser settings'
                  : `⚠ GPS signal lost — ${gpsError ?? 'retrying…'}`}
              </p>
            )}
            {gpsStatus === 'stale' && (
              <p className="text-yellow-200 text-xs mt-1 bg-yellow-500/20 rounded-lg px-2 py-1">
                ⚠ GPS signal weak — last location may be outdated
              </p>
            )}
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        {stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <Truck className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No stops for today</p>
            <p className="text-sm mt-1">Check back when orders are assigned.</p>
          </div>
        ) : (
          <div className="divide-y">
            {stops.map((stop, idx) => (
              <StopCard key={stop.id} stop={stop} index={idx + 1} onClick={() => navigate(`/stop/${stop.id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GPSStatusBadge({ status }: { status: GPSStatus }) {
  const cfg = {
    idle:             { dot: 'bg-gray-400', text: 'GPS Idle' },
    active:           { dot: 'bg-green-400 animate-pulse', text: 'GPS Active' },
    stale:            { dot: 'bg-yellow-400 animate-pulse', text: 'GPS Weak' },
    unavailable:      { dot: 'bg-red-400', text: 'GPS Lost' },
    permission_denied:{ dot: 'bg-red-500', text: 'GPS Denied' },
    unsupported:      { dot: 'bg-gray-400', text: 'No GPS' },
  }[status] ?? { dot: 'bg-gray-400', text: 'GPS Idle' };
  return (
    <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.text}
    </div>
  );
}

function StopCard({ stop, index, onClick }: { stop: Stop; index: number; onClick: () => void }) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' },
    en_route: { icon: Navigation, color: 'text-blue-600', bg: 'bg-blue-50' },
    arrived: { icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50' },
    delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    failed: { icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
  };
  const cfg = statusConfig[stop.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${stop.status === 'delivered' ? 'opacity-60' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <span className={`text-sm font-bold ${cfg.color}`}>{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{stop.customerName}</p>
        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          {stop.address.line1}, {stop.address.suburb}
        </p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
        <Icon className="h-3 w-3" />
        {stop.status}
      </div>
    </button>
  );
}
