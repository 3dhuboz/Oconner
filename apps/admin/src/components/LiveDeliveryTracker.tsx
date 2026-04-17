import { useEffect, useState, useRef } from 'react';
import { api } from '@butcher/shared';
import type { Stop } from '@butcher/shared';
import { Navigation } from 'lucide-react';

// O'Connor Agriculture depot — Boynedale, QLD
const DEPOT_LAT = -24.2119;
const DEPOT_LNG = 151.2833;
const GOOGLE_MAPS_KEY = 'AIzaSyA1nxhaU5f0ns9ZHJDkYeQh7tNRXlkdmWU';

interface ActiveDriverSession {
  id: string;
  driverName: string;
  deliveryDayId: string;
  lastLat: number;
  lastLng: number;
  lastUpdated: number;
  active: boolean;
  completedStops?: number;
  totalStops?: number;
}

interface Props {
  /**
   * When provided, only show a tracker if an active session exists for this
   * specific delivery day. When omitted, show the first active session
   * regardless of day (used on the dashboard).
   */
  dayId?: string;
  /**
   * Optional initial stops — used on the manifest page where the parent
   * already has them loaded. The component still polls for fresh status.
   */
  initialStops?: Stop[];
}

/**
 * Live in-run tracker. Polls /api/drivers/active and /api/stops?deliveryDayId every 10s.
 * Renders a Google Map with depot, colour-coded stop markers, and the driver's truck
 * at the current GPS position. Returns null if there's no active session to show.
 */
export default function LiveDeliveryTracker({ dayId, initialStops = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [session, setSession] = useState<ActiveDriverSession | null>(null);
  const [stops, setStops] = useState<Stop[]>(initialStops);
  const [tick, setTick] = useState(0);

  // Keep local stops in sync with parent's initial fetch (manifest page case).
  useEffect(() => { if (initialStops.length) setStops(initialStops); }, [initialStops]);

  // Poll for the active session, then pull fresh stops for that session's day.
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        const all = await api.drivers.activeSessions() as ActiveDriverSession[];
        if (cancelled) return;
        const picked = dayId
          ? all.find((s) => s.deliveryDayId === dayId && s.active)
          : all.find((s) => s.active);
        setSession(picked ?? null);
        if (picked) {
          const fresh = await api.stops.list(picked.deliveryDayId) as Stop[];
          if (!cancelled && fresh) setStops(fresh);
        }
      } catch {
        // best-effort
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10_000);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { cancelled = true; clearInterval(interval); clearInterval(tickInterval); };
  }, [dayId]);

  // Render / update the map.
  useEffect(() => {
    if (!session || !mapRef.current) return;
    const geoStops = stops.filter((s) => s.lat && s.lng);
    if (geoStops.length === 0) return;

    const initMap = () => {
      const google = (window as any).google;
      if (!google?.maps) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current!, {
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoom: 11,
          center: { lat: DEPOT_LAT, lng: DEPOT_LNG },
        });
      }
      const map = mapInstanceRef.current;

      const hasDriverPosition = session.lastLat !== 0 && session.lastLng !== 0;
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: DEPOT_LAT, lng: DEPOT_LNG });
      geoStops.forEach((s) => bounds.extend({ lat: s.lat!, lng: s.lng! }));
      if (hasDriverPosition) bounds.extend({ lat: session.lastLat, lng: session.lastLng });
      map.fitBounds(bounds, 60);

      if ((map as any)._markers) (map as any)._markers.forEach((m: any) => m.setMap(null));
      (map as any)._markers = [];

      // Depot
      (map as any)._markers.push(new google.maps.Marker({
        position: { lat: DEPOT_LAT, lng: DEPOT_LNG },
        map,
        label: { text: '🏠', fontSize: '16px' },
        title: 'Depot — Boynedale',
        zIndex: 1000,
      }));

      // Stops
      const STATUS_COLOR: Record<string, string> = {
        delivered: '#16a34a',
        en_route: '#2563eb',
        arrived: '#ea580c',
        pending: '#9ca3af',
        failed: '#dc2626',
      };
      geoStops.forEach((s) => {
        const colour = STATUS_COLOR[s.status] ?? '#9ca3af';
        const marker = new google.maps.Marker({
          position: { lat: s.lat!, lng: s.lng! },
          map,
          label: { text: String(s.sequence ?? ''), color: 'white', fontWeight: 'bold', fontSize: '11px' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: colour,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          },
          title: `${s.sequence}. ${s.customerName} — ${s.status}`,
          zIndex: 500 + (s.sequence ?? 0),
        });
        (map as any)._markers.push(marker);
      });

      // Driver truck
      if (hasDriverPosition) {
        (map as any)._markers.push(new google.maps.Marker({
          position: { lat: session.lastLat, lng: session.lastLng },
          map,
          label: { text: '🚚', fontSize: '20px' },
          title: `${session.driverName} — last update ${new Date(session.lastUpdated).toLocaleTimeString()}`,
          zIndex: 2000,
          animation: google.maps.Animation.DROP,
        }));
      }
    };

    if ((window as any).google?.maps) {
      initMap();
    } else {
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if ((window as any).google?.maps) { clearInterval(check); initMap(); }
        }, 200);
        setTimeout(() => clearInterval(check), 10_000);
      }
    }
  }, [session, stops]);

  if (!session) return null;

  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const failed = stops.filter((s) => s.status === 'failed').length;
  const total = stops.length;
  const pct = total > 0 ? Math.round(((delivered + failed) / total) * 100) : 0;

  const hasDriverPosition = session.lastLat !== 0 && session.lastLng !== 0;
  const secondsSincePing = Math.round((Date.now() - session.lastUpdated) / 1000);
  const pingAgo = !hasDriverPosition ? 'no GPS yet' :
    secondsSincePing < 60 ? 'just now' :
    secondsSincePing < 3600 ? `${Math.round(secondsSincePing / 60)}m ago` :
    `${Math.round(secondsSincePing / 3600)}h ago`;
  void tick; // referenced so pingAgo re-renders every 30s

  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-200 mb-4 overflow-hidden">
      <div className="bg-green-600 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          <span className="font-semibold">Live Delivery Run</span>
          <span className="text-green-100 text-xs">· {session.driverName}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${hasDriverPosition ? 'bg-white/20' : 'bg-amber-500/90'}`}>
          {hasDriverPosition ? `GPS · ${pingAgo}` : 'GPS not broadcasting'}
        </span>
      </div>
      <div className="px-5 py-3 bg-gray-50 flex items-center gap-4 text-sm">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{delivered} delivered{failed > 0 ? `, ${failed} failed` : ''}</span>
            <span className="font-medium">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-gray-500 text-xs whitespace-nowrap">{delivered + failed} of {total}</span>
      </div>
      <div ref={mapRef} style={{ height: 380 }} className="bg-gray-200" />
      {!hasDriverPosition && (
        <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
          Driver hasn't sent a GPS position yet. Ask the driver to check location permission on their device.
        </div>
      )}
    </div>
  );
}
