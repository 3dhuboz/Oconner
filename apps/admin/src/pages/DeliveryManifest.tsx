import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency } from '@butcher/shared';
import type { Stop, Order } from '@butcher/shared';
import {
  ArrowLeft, Route, Printer, Bell, Package, FileText,
  CheckCircle, Clock, Navigation, AlertTriangle, User, Camera,
  Eye, MapPin, Timer, TrendingUp,
} from 'lucide-react';

const DRIVER_URL = import.meta.env.VITE_DRIVER_URL ?? 'https://butcher-driver.pages.dev';

function parseTimeWindow(note?: string | null): { earliest?: number; latest?: number } {
  if (!note) return {};
  function mins(s: string): number | undefined {
    const m12 = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (m12) {
      let h = +m12[1]; const m = +(m12[2] ?? 0); const mer = m12[3].toLowerCase();
      if (mer === 'pm' && h !== 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      return h * 60 + m;
    }
    const m24 = s.match(/(\d{1,2}):(\d{2})/);
    if (m24) return +m24[1] * 60 + +m24[2];
    return undefined;
  }
  const lo = note.toLowerCase();
  let earliest: number | undefined, latest: number | undefined;
  const bef = lo.match(/(?:before|by)\s+([\d:apm]+)/i); if (bef) latest = mins(bef[1]);
  const aft = lo.match(/(?:after|from)\s+([\d:apm]+)/i); if (aft) earliest = mins(aft[1]);
  const bet = lo.match(/between\s+([\d:apm]+)\s+(?:and|&|-)\s+([\d:apm]+)/i);
  if (bet) { earliest = mins(bet[1]); latest = mins(bet[2]); }
  if (lo.includes('morning')) latest = latest ?? 12 * 60;
  if (lo.includes('afternoon')) earliest = earliest ?? 12 * 60;
  return { earliest, latest };
}

function minsToTime(m: number): string {
  const h = Math.floor(m / 60), min = m % 60, suf = h >= 12 ? 'pm' : 'am', hr = h % 12 || 12;
  return min === 0 ? `${hr}${suf}` : `${hr}:${String(min).padStart(2, '0')}${suf}`;
}

function fmtMs(ms: number): string {
  const d = new Date(ms); return minsToTime(d.getHours() * 60 + d.getMinutes());
}

function windowStatus(etaMs: number, w: { earliest?: number; latest?: number }): 'ok' | 'late' | 'early' | 'none' {
  if (w.earliest === undefined && w.latest === undefined) return 'none';
  const etaMins = new Date(etaMs).getHours() * 60 + new Date(etaMs).getMinutes();
  if (w.latest !== undefined && etaMins > w.latest + 10) return 'late';
  if (w.earliest !== undefined && etaMins < w.earliest) return 'early';
  return 'ok';
}

function optimizeWithConstraints(stops: Stop[], departureMs: number): Stop[] {
  const AVG = 8 * 60 * 1000;
  let sorted = nearestNeighborRoute([...stops]);
  // ETA pass 1
  let withEta = sorted.map((s, i) => ({ ...s, estimatedArrival: departureMs + i * AVG }));
  // Constraint-aware bubble: move urgent stops earlier
  for (let i = withEta.length - 1; i > 0; i--) {
    const s = withEta[i];
    const w = parseTimeWindow(s.customerNote);
    if (w.latest === undefined) continue;
    const etaMins = new Date(s.estimatedArrival!).getHours() * 60 + new Date(s.estimatedArrival!).getMinutes();
    if (etaMins <= w.latest) continue;
    // Find best earlier slot
    let best = i;
    for (let j = 0; j < i; j++) {
      const candidateMins = new Date(departureMs + j * AVG).getHours() * 60 + new Date(departureMs + j * AVG).getMinutes();
      if (candidateMins <= w.latest) { best = j; break; }
    }
    if (best < i) {
      const [moved] = withEta.splice(i, 1);
      withEta.splice(best, 0, moved);
      withEta = withEta.map((x, k) => ({ ...x, estimatedArrival: departureMs + k * AVG }));
    }
  }
  return withEta;
}

interface DeliveryDayData {
  id: string;
  date: any;
  maxOrders: number;
  orderCount: number;
  notes?: string;
  active: boolean;
  deliveryWindowStart?: string; // HH:MM 24-hr, e.g. "09:00"
}

function departureTimestamp(day: DeliveryDayData | null): number {
  if (!day) return Date.now();
  const base = new Date(day.date as number);
  const [hh, mm] = (day.deliveryWindowStart ?? '09:00').split(':').map(Number);
  base.setHours(hh, mm, 0, 0);
  return base.getTime();
}

function nearestNeighborRoute(stops: Stop[]): Stop[] {
  if (stops.length <= 1) return stops;
  const unvisited = [...stops];
  const route: Stop[] = [];
  route.push(unvisited.splice(0, 1)[0]);
  while (unvisited.length > 0) {
    const last = route[route.length - 1];
    let nearest = 0;
    let minDist = Infinity;
    unvisited.forEach((s, i) => {
      const dist = Math.abs(s.address.postcode.charCodeAt(0) - last.address.postcode.charCodeAt(0)) +
        (s.address.suburb > last.address.suburb ? 1 : -1);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });
    route.push(unvisited.splice(nearest, 1)[0]);
  }
  return route;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: 'Pending', icon: Clock, cls: 'text-gray-500 bg-gray-100' },
  en_route: { label: 'En Route', icon: Navigation, cls: 'text-blue-600 bg-blue-50' },
  arrived: { label: 'Arrived', icon: Navigation, cls: 'text-orange-600 bg-orange-50' },
  delivered: { label: 'Delivered', icon: CheckCircle, cls: 'text-green-600 bg-green-50' },
  failed: { label: 'Failed', icon: AlertTriangle, cls: 'text-red-600 bg-red-50' },
};

export default function DeliveryManifestPage() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const [day, setDay] = useState<DeliveryDayData | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [routeOptimised, setRouteOptimised] = useState(false);

  useEffect(() => {
    if (!dayId) return;
    Promise.all([
      api.deliveryDays.get(dayId),
      api.stops.list(dayId),
      api.orders.list(),
    ]).then(([dayData, stopsData, ordersData]) => {
      setDay(dayData as unknown as DeliveryDayData);
      setStops(stopsData as Stop[]);
      setOrders((ordersData as Order[]).filter((o) => (o as any).deliveryDayId === dayId));
    }).catch(() => {});
  }, [dayId]);

  const optimizeRoute = async () => {
    if (!dayId || stops.length === 0) return;
    setOptimizing(true);
    const departure = departureTimestamp(day);
    const withEtas = optimizeWithConstraints(stops, departure).map((s, i) => ({ ...s, sequence: i + 1 }));
    await Promise.all(withEtas.map((s, i) => api.stops.updateSequence(s.id!, i + 1)));
    setStops(withEtas);
    setRouteOptimised(true);
    setShowPreview(true);
    setOptimizing(false);
  };

  const sendDayBeforeNotice = async () => {
    if (!dayId) return;
    setNotifying(true);
    await api.deliveryDays.sendReminders(dayId);
    setNotifySent(true);
    setNotifying(false);
  };

  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const total = stops.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  const dateStr = day?.date
    ? new Date(day.date as unknown as number).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/delivery-days')} className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand">Delivery Manifest</h1>
          <p className="text-sm text-gray-500">
            {dateStr}{day?.deliveryWindowStart ? ` — Departs ${day.deliveryWindowStart}` : ''}
          </p>
        </div>
        <button
          onClick={() => window.open(`${import.meta.env.VITE_PDF_GENERATOR_URL}/delivery-list/${dayId}`, '_blank')}
          className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" /> Delivery List
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Stops', value: total, icon: Package },
          { label: 'Delivered', value: delivered, icon: CheckCircle },
          { label: 'Remaining', value: total - delivered, icon: Clock },
          { label: 'Revenue', value: formatCurrency(totalRevenue), icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
              <Icon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-brand h-2 rounded-full transition-all"
            style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={optimizeRoute}
          disabled={optimizing || stops.length === 0}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid disabled:opacity-50"
        >
          <Route className="h-4 w-4" />
          {optimizing ? 'Optimising…' : routeOptimised ? '✓ Route Optimised' : 'Optimise Route'}
        </button>
        {stops.length > 0 && (
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showPreview ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Driver Preview' : 'Preview Driver Run'}
          </button>
        )}
        <button
          onClick={sendDayBeforeNotice}
          disabled={notifying || notifySent}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {notifySent ? '✓ Notification Sent' : notifying ? 'Sending…' : 'Notify Customers — Delivery Tomorrow'}
        </button>
      </div>

      {showPreview && (() => {
        const sorted = [...stops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const departure = departureTimestamp(day);
        const stopsWithEta = sorted.map((s, i) => ({
          ...s,
          estimatedArrival: (s as any).estimatedArrival ?? (departure + i * 8 * 60 * 1000),
        }));
        const constrained = stopsWithEta.filter((s) => {
          const w = parseTimeWindow(s.customerNote);
          return w.earliest !== undefined || w.latest !== undefined;
        });
        const conflicts = stopsWithEta.filter((s) => {
          const w = parseTimeWindow(s.customerNote);
          return windowStatus(s.estimatedArrival!, w) === 'late' || windowStatus(s.estimatedArrival!, w) === 'early';
        });
        const lastEta = stopsWithEta[stopsWithEta.length - 1]?.estimatedArrival;
        return (
          <div className="mb-6 bg-white rounded-2xl border-2 border-indigo-100 overflow-hidden">
            {/* Summary header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold text-sm tracking-wide uppercase">Driver Run Preview</span>
                  </div>
                  <p className="text-indigo-100 text-xs">{!routeOptimised && 'Run Optimise Route first for AI-adjusted sequence · '}{constrained.length} customer time request{constrained.length !== 1 ? 's' : ''} detected</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-indigo-200 text-xs">Departs</p>
                    <p className="font-bold">{day?.deliveryWindowStart ? minsToTime(+day.deliveryWindowStart.split(':')[0] * 60 + +day.deliveryWindowStart.split(':')[1]) : '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-indigo-200 text-xs">Est. Finish</p>
                    <p className="font-bold">{lastEta ? fmtMs(lastEta + 8 * 60 * 1000) : '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-indigo-200 text-xs">Stops</p>
                    <p className="font-bold">{stopsWithEta.length}</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    conflicts.length === 0 ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'
                  }`}>
                    {conflicts.length === 0 ? '✓ All windows met' : `⚠ ${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''}`}
                  </div>
                  <a
                    href={`${DRIVER_URL}/run/${dayId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Open in Driver App
                  </a>
                </div>
              </div>
            </div>
            {/* Per-stop timeline */}
            <div className="divide-y divide-indigo-50">
              {stopsWithEta.map((stop, idx) => {
                const w = parseTimeWindow(stop.customerNote);
                const ws = windowStatus(stop.estimatedArrival!, w);
                const hasWindow = ws !== 'none';
                return (
                  <div key={stop.id} className="px-5 py-3 flex items-start gap-4">
                    {/* Sequence + ETA */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        ws === 'late' ? 'bg-red-100 text-red-700' : ws === 'early' ? 'bg-amber-100 text-amber-700' : ws === 'ok' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < stopsWithEta.length - 1 && <div className="w-px h-4 bg-indigo-100" />}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{stop.customerName}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {stop.address.line1}, {stop.address.suburb} {stop.address.postcode}
                          </p>
                          {stop.customerNote && (
                            <p className="text-xs text-amber-700 mt-1">💬 {stop.customerNote}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-sm font-semibold text-indigo-700">{fmtMs(stop.estimatedArrival!)}</span>
                          </div>
                          {hasWindow && (
                            <div className="flex items-center gap-1">
                              {w.earliest && w.latest ? (
                                <span className="text-xs text-gray-500">{minsToTime(w.earliest)}–{minsToTime(w.latest)}</span>
                              ) : w.latest ? (
                                <span className="text-xs text-gray-500">Before {minsToTime(w.latest)}</span>
                              ) : (
                                <span className="text-xs text-gray-500">After {minsToTime(w.earliest!)}</span>
                              )}
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                ws === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {ws === 'ok' ? '✓' : ws === 'late' ? 'Late' : 'Early'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold">Stops ({total})</h2>
          <p className="text-sm text-gray-500">{day?.notes}</p>
        </div>
        {stops.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No stops for this day.</p>
          </div>
        ) : (
          <div className="divide-y">
            {stops.map((stop, idx) => {
              const cfg = STATUS_CONFIG[stop.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={stop.id} className={`px-5 py-4 flex gap-4 ${stop.status === 'delivered' ? 'opacity-60' : ''}`}>
                  <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{stop.customerName}</p>
                        <p className="text-sm text-gray-500">{stop.address.line1}, {stop.address.suburb} {stop.address.postcode}</p>
                        {stop.customerNote && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-1 inline-block">
                            ⚠ {stop.customerNote}
                          </p>
                        )}
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${cfg.cls}`}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stop.items?.map((item, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {item.productName} {item.isMeatPack ? `×${item.quantity}` : `${item.weight}g`}
                        </span>
                      ))}
                    </div>
                    {stop.proofUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <Camera className="h-3 w-3 text-green-600" />
                        <a href={stop.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline">
                          Proof of delivery photo
                        </a>
                      </div>
                    )}
                    {stop.driverNote && (
                      <p className="text-xs text-gray-500 mt-1 italic">Driver: {stop.driverNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    {stop.customerPhone}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
