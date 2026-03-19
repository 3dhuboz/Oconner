import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { api } from '@butcher/shared';
import type { Stop, DeliveryDay, DeliveryRun } from '@butcher/shared';
import { useGPS, type GPSStatus } from '../hooks/useGPS';
import { MapPin, Navigation, User, CheckCircle, Clock, Truck } from 'lucide-react';

export default function StopsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { dayId: paramDayId } = useParams<{ dayId?: string }>();
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
    if (paramDayId) {
      api.deliveryDays.get(paramDayId)
        .then((day) => { if (day) setDeliveryDay(day as DeliveryDay); })
        .catch(() => {});
    } else {
      api.deliveryDays.today()
        .then((day) => { if (day) setDeliveryDay(day as DeliveryDay); })
        .catch(() => {});
    }
  }, [user, paramDayId]);

  const [myRun, setMyRun] = useState<DeliveryRun | null>(null);

  useEffect(() => {
    if (!deliveryDay?.id) return;
    // Try to find a run assigned to this driver for the day
    api.deliveryRuns.myRun(deliveryDay.id)
      .then((run) => {
        if (run) {
          setMyRun(run as DeliveryRun);
          return api.stops.listByRun((run as DeliveryRun).id);
        }
        return api.stops.list(deliveryDay.id);
      })
      .then((data) => setStops(data as Stop[]))
      .catch(() => {
        api.stops.list(deliveryDay.id)
          .then((data) => setStops(data as Stop[]))
          .catch(() => {});
      });
  }, [deliveryDay?.id]);

  const handleStartDay = async () => {
    if (!deliveryDay?.id || !user) return;
    const session = await api.drivers.startSession({
      deliveryDayId: deliveryDay.id,
      driverName: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? 'Driver',
    }) as { id: string };
    setSessionId(session.id);
    setTrackingEnabled(true);
  };

  const handleEndDay = async () => {
    if (sessionId) {
      await api.drivers.endSession(sessionId);
    }
    setTrackingEnabled(false);
    setSessionId(null);
  };

  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const total = stops.length;

  return (
    <div className="flex flex-col h-full">
      <header className="bg-brand text-white px-4 pt-3 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-white rounded px-1.5 py-0.5 flex-shrink-0">
              <span className="text-brand font-black text-xs tracking-widest">OC.</span>
            </span>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-wider uppercase">O'Connor</h1>
              {deliveryDay ? (
                <p className="text-white/60 text-xs leading-tight">
                  {new Date(deliveryDay.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              ) : (
                <p className="text-white/50 text-xs leading-tight">Driver App</p>
              )}
            </div>
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
          <div className="flex flex-col h-full">
            <div
              className="relative flex flex-col items-center justify-center px-6 py-12 text-white overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #2d5016 0%, #4a7c2f 40%, #6aaa45 100%)',
                minHeight: '55%',
              }}
            >
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
              <div className="relative text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                  <Truck className="h-10 w-10 text-white" />
                </div>
                <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Welcome back</p>
                <h2 className="text-3xl font-black mb-1">
                  {user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? 'Driver'}
                </h2>
                <p className="text-white/60 text-sm">
                  {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 px-4 py-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">All clear for today</p>
                  <p className="text-sm text-gray-500 mt-0.5">No deliveries have been assigned yet. Check back soon.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Delivery time</p>
                  <p className="text-sm text-gray-500 mt-0.5">Your route will appear here once the admin assigns orders.</p>
                </div>
              </div>
            </div>
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
