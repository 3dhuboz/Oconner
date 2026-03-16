import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot, doc, getDoc,
  orderBy, updateDoc, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ArrowLeft, Route, Printer, Bell, Package,
  CheckCircle, Clock, Navigation, AlertTriangle, User, Camera,
} from 'lucide-react';
import { formatCurrency } from '@butcher/shared';
import type { Stop, Order } from '@butcher/shared';

interface DeliveryDayData {
  id: string;
  date: any;
  maxOrders: number;
  orderCount: number;
  notes?: string;
  active: boolean;
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

  useEffect(() => {
    if (!dayId) return;
    getDoc(doc(db, 'deliveryDays', dayId)).then((snap) => {
      if (snap.exists()) setDay({ id: snap.id, ...snap.data() } as DeliveryDayData);
    });
  }, [dayId]);

  useEffect(() => {
    if (!dayId) return;
    const unsubStops = onSnapshot(
      query(collection(db, 'stops'), where('deliveryDayId', '==', dayId), orderBy('sequence', 'asc')),
      (snap) => setStops(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Stop))),
    );
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), where('deliveryDayId', '==', dayId)),
      (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))),
    );
    return () => { unsubStops(); unsubOrders(); };
  }, [dayId]);

  const optimizeRoute = async () => {
    if (!dayId || stops.length === 0) return;
    setOptimizing(true);
    const sorted = nearestNeighborRoute([...stops]);
    const batch = writeBatch(db);
    sorted.forEach((stop, i) => {
      batch.update(doc(db, 'stops', stop.id!), { sequence: i + 1, updatedAt: Timestamp.now() });
    });
    await batch.commit();
    setOptimizing(false);
  };

  const sendDayBeforeNotice = async () => {
    if (!dayId) return;
    setNotifying(true);
    await updateDoc(doc(db, 'deliveryDays', dayId), {
      notificationSentAt: Timestamp.now(),
      notificationStatus: 'sent',
    });
    setNotifySent(true);
    setNotifying(false);
  };

  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const total = stops.length;
  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  const dateStr = day?.date?.toDate
    ? day.date.toDate().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/delivery-days')} className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand">Delivery Manifest</h1>
          <p className="text-sm text-gray-500">{dateStr}</p>
        </div>
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
          {optimizing ? 'Optimising…' : 'Optimise Route'}
        </button>
        <button
          onClick={sendDayBeforeNotice}
          disabled={notifying || notifySent}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {notifySent ? '✓ Notification Sent' : notifying ? 'Sending…' : 'Notify Customers — Delivery Tomorrow'}
        </button>
      </div>

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
