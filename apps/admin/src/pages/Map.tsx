import { useEffect, useState, useRef } from 'react';
import { api } from '@butcher/shared';
import { MapPin, Truck, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from '../lib/toast';

interface StopPin {
  id: string;
  sequence: number;
  customerName: string;
  status: string;
  lat: number;
  lng: number;
  address: { line1: string; suburb: string; postcode: string };
}

const STOP_COLORS: Record<string, string> = {
  pending: '#6b7280',
  en_route: '#3b82f6',
  arrived: '#f59e0b',
  delivered: '#16a34a',
  failed: '#ef4444',
  skipped: '#9ca3af',
};

interface DriverSession {
  id: string;
  driverName?: string;
  driverUid?: string;
  lastLat?: number;
  lastLng?: number;
  gpsStatus?: string;
  gpsError?: string;
  updatedAt?: any;
  deliveryDayId?: string;
  active?: boolean;
}

function timeSince(ts: any): string {
  if (!ts) return 'unknown';
  const d = new Date(ts);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function isStale(ts: any): boolean {
  if (!ts) return true;
  const d = new Date(ts);
  return Date.now() - d.getTime() > 120_000; // >2 min = stale
}

const GPS_STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  active:           { label: 'Active',    dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  stale:            { label: 'Weak',      dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
  unavailable:      { label: 'Lost',      dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  permission_denied:{ label: 'Denied',   dot: 'bg-red-600', badge: 'bg-red-100 text-red-700' },
  idle:             { label: 'Idle',      dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500' },
  unsupported:      { label: 'No GPS',    dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-500' },
};

export default function MapPage() {
  const [drivers, setDrivers] = useState<DriverSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [stops, setStops] = useState<StopPin[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [, setTick] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const stopMarkersRef = useRef<Record<string, any>>({});

  // Re-render every 15s to update "X min ago" timestamps
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () =>
      api.drivers.activeSessions()
        .then((data) => setDrivers(data as DriverSession[]))
        .catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  // Load stops for the first active driver's delivery day
  useEffect(() => {
    const dayId = drivers[0]?.deliveryDayId;
    if (!dayId) { setStops([]); return; }
    api.stops.list(dayId)
      .then((data: any) => {
        const withCoords = (data as any[]).filter((s: any) => s.lat && s.lng);
        setStops(withCoords.map((s: any) => ({
          id: s.id,
          sequence: s.sequence,
          customerName: s.customerName,
          status: s.status,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
        })));
      })
      .catch(() => {});
  }, [drivers]);

  // Inject Leaflet once
  useEffect(() => {
    if (typeof window === 'undefined' || (window as any).leafletLoaded) return;
    (window as any).leafletLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    document.head.appendChild(script);
  }, []);

  // Init map once
  useEffect(() => {
    const init = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current || mapInstance.current) return;
      const map = L.map(mapRef.current).setView([-24.0, 151.5], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapInstance.current = map;
    };
    const t = setInterval(() => {
      if ((window as any).L) { init(); clearInterval(t); }
    }, 300);
    return () => clearInterval(t);
  }, []);

  // Update driver markers whenever drivers change
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstance.current;
    if (!L || !map) return;

    const seen = new Set<string>();
    drivers.forEach((d) => {
      if (!d.lastLat || !d.lastLng) return;
      seen.add(d.id);
      const stale = isStale(d.updatedAt);
      const gpsOk = d.gpsStatus === 'active';
      const color = gpsOk && !stale ? '#16a34a' : stale ? '#f59e0b' : '#ef4444';
      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)">🚚</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLatLng([d.lastLat, d.lastLng]).setIcon(icon);
      } else {
        const m = L.marker([d.lastLat, d.lastLng], { icon })
          .bindPopup(`<b>${d.driverName ?? 'Driver'}</b><br>GPS: ${d.gpsStatus ?? 'unknown'}<br>Updated: ${timeSince(d.updatedAt)}`)
          .addTo(map);
        markersRef.current[d.id] = m;
      }
    });
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });
  }, [drivers]);

  // Render stop pins whenever stops change
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstance.current;
    if (!L || !map) return;

    // Remove old stop markers
    Object.values(stopMarkersRef.current).forEach((m: any) => m.remove());
    stopMarkersRef.current = {};

    stops.forEach((s) => {
      const color = STOP_COLORS[s.status] ?? '#6b7280';
      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25)">${s.sequence + 1}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const m = L.marker([s.lat, s.lng], { icon })
        .bindPopup(`<b>#${s.sequence + 1} ${s.customerName}</b><br>${s.address.line1}, ${s.address.suburb}<br>Status: ${s.status}`)
        .addTo(map);
      stopMarkersRef.current[s.id] = m;
    });
  }, [stops]);

  const selectedDriver = drivers.find((d) => d.id === selected);

  const handleGeocodeStops = async () => {
    const dayId = drivers[0]?.deliveryDayId;
    if (!dayId) return;
    setGeocoding(true);
    try {
      const result = await api.deliveryDays.geocodeStops(dayId);
      toast(`Geocoded ${result.updated} of ${result.total} stops`);
      // Reload stops
      const data = await api.stops.list(dayId) as any[];
      setStops(data.filter((s: any) => s.lat && s.lng).map((s: any) => ({
        id: s.id, sequence: s.sequence, customerName: s.customerName,
        status: s.status, lat: s.lat, lng: s.lng, address: s.address,
      })));
    } catch {
      toast('Geocoding failed', 'error');
    } finally {
      setGeocoding(false);
    }
  };

  const ungeocodedCount = drivers[0]?.deliveryDayId ? undefined : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand flex items-center gap-2">
          <Truck className="h-6 w-6" /> Driver Map
        </h1>
        <div className="flex items-center gap-3">
          {drivers.length > 0 && (
            <button
              onClick={handleGeocodeStops}
              disabled={geocoding}
              className="flex items-center gap-1.5 text-xs bg-white border rounded-lg px-3 py-1.5 text-gray-600 hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${geocoding ? 'animate-spin' : ''}`} />
              {geocoding ? 'Geocoding…' : 'Geocode Stops'}
            </button>
          )}
          <span className="text-sm text-gray-400">{drivers.length} active driver{drivers.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Driver list */}
        <div className="space-y-3">
          {drivers.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active drivers</p>
            </div>
          ) : (
            drivers.map((d) => {
              const stale = isStale(d.updatedAt);
              const cfg = GPS_STATUS_CFG[d.gpsStatus ?? 'idle'] ?? GPS_STATUS_CFG.idle;
              const hasLocation = !!(d.lastLat && d.lastLng);
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelected(d.id);
                    const map = mapInstance.current;
                    if (map && d.lastLat && d.lastLng) map.flyTo([d.lastLat, d.lastLng], 14);
                  }}
                  className={`w-full text-left bg-white rounded-xl border p-4 hover:border-brand transition-colors ${selected === d.id ? 'border-brand ring-1 ring-brand' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 bg-brand rounded-full flex items-center justify-center">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${cfg.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{d.driverName ?? d.driverUid ?? 'Driver'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {stale && hasLocation && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" /> stale
                          </span>
                        )}
                        {!hasLocation && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-400">
                            <WifiOff className="h-3 w-3" /> no signal
                          </span>
                        )}
                      </div>
                      {d.updatedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">Updated {timeSince(d.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                  {d.gpsError && (
                    <p className="mt-2 text-xs text-red-500 bg-red-50 rounded px-2 py-1">{d.gpsError}</p>
                  )}
                </button>
              );
            })
          )}

          {selectedDriver && (
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-brand">Selected: {selectedDriver.driverName}</p>
              {selectedDriver.lastLat && (
                <p className="text-gray-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedDriver.lastLat.toFixed(5)}, {selectedDriver.lastLng?.toFixed(5)}
                </p>
              )}
              <p className="text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> GPS: {selectedDriver.gpsStatus ?? 'unknown'}
              </p>
            </div>
          )}
        </div>

        {/* Leaflet map */}
        <div className="lg:col-span-2 bg-white rounded-xl border overflow-hidden" style={{ minHeight: 480 }}>
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: 480 }} />
        </div>
      </div>
    </div>
  );
}
