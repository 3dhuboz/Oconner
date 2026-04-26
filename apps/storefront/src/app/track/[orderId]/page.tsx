'use client';
export const runtime = 'edge';

import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatCurrency } from '@butcher/shared';
import type { Order } from '@butcher/shared';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@butcher/shared';
import { Package, Truck, CheckCircle, Clock, XCircle, MapPin, Navigation } from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending_payment: <Clock className="h-6 w-6" />,
  confirmed: <Package className="h-6 w-6" />,
  preparing: <Package className="h-6 w-6" />,
  packed: <Package className="h-6 w-6" />,
  out_for_delivery: <Truck className="h-6 w-6" />,
  delivered: <CheckCircle className="h-6 w-6" />,
  cancelled: <XCircle className="h-6 w-6" />,
};

const STATUS_STEPS = ['confirmed', 'preparing', 'packed', 'out_for_delivery', 'delivered'];

interface DriverLocation {
  driverName: string;
  lastLat: number;
  lastLng: number;
  lastUpdated: number;
}

function LiveDriverMap({ deliveryAddress }: { deliveryAddress: { line1: string; suburb: string; state: string; postcode: string; lat?: number; lng?: number } }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [driver, setDriver] = useState<DriverLocation | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) { setLeafletLoaded(true); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => setLeafletLoaded(true);
    document.head.appendChild(js);
  }, []);

  // Poll driver location. Ignore sessions that haven't successfully pinged yet
  // (lastLat/lastLng default to 0 — without this guard the map would centre on
  // (0,0), which is in the Atlantic Ocean off West Africa).
  const fetchDriver = useCallback(async () => {
    try {
      const sessions = await api.drivers.activeSessions() as DriverLocation[];
      const withPosition = sessions.find((s) => s.lastLat !== 0 && s.lastLng !== 0);
      if (withPosition) setDriver(withPosition);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDriver();
    const interval = setInterval(fetchDriver, 10000);
    return () => clearInterval(interval);
  }, [fetchDriver]);

  // Init & update map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !driver) return;
    const L = (window as any).L;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([driver.lastLat, driver.lastLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapInstanceRef.current);
      // Delivery address marker
      const addrLat = deliveryAddress.lat ?? driver.lastLat;
      const addrLng = deliveryAddress.lng ?? driver.lastLng;
      if (deliveryAddress.lat && deliveryAddress.lng) {
        L.marker([addrLat, addrLng], {
          icon: L.divIcon({ className: '', html: '<div style="font-size:24px">📍</div>', iconSize: [28, 28], iconAnchor: [14, 28] }),
        }).addTo(mapInstanceRef.current).bindPopup(`<b>Delivery</b><br/>${deliveryAddress.line1}`);
      }
    }
    // Update driver marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driver.lastLat, driver.lastLng]);
    } else {
      driverMarkerRef.current = L.marker([driver.lastLat, driver.lastLng], {
        icon: L.divIcon({ className: '', html: '<div style="font-size:28px">🚚</div>', iconSize: [32, 32], iconAnchor: [16, 16] }),
      }).addTo(mapInstanceRef.current).bindPopup(`<b>${driver.driverName}</b>`);
    }
    mapInstanceRef.current.panTo([driver.lastLat, driver.lastLng]);
  }, [leafletLoaded, driver, deliveryAddress]);

  const ago = driver ? Math.round((Date.now() - driver.lastUpdated) / 1000) : 0;

  return (
    <div className="rounded-xl border overflow-hidden mb-6">
      <div className="bg-brand text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          <span className="font-semibold text-sm">Live Driver Tracking</span>
        </div>
        {driver && (
          <span className="text-xs text-white/70">
            {driver.driverName} · {ago < 60 ? 'just now' : `${Math.round(ago / 60)}m ago`}
          </span>
        )}
      </div>
      <div ref={mapRef} style={{ height: 280 }} className="bg-gray-100" />
      {!driver && (
        <div className="px-4 py-3 text-sm text-gray-500 text-center">
          Waiting for driver location...
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the public tracking endpoint — returns the safe subset of order
    // fields without customer email/phone/internal notes. The full
    // /api/orders/:id endpoint is now ownership-checked.
    api.orders.tracking(params.orderId)
      .then((data) => { setOrder(data as Order); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.orderId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-700 mb-2">Order Not Found</h1>
            <p className="text-gray-500">This order could not be found or you don't have permission to view it.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? 'gray';

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand">Track Order</h1>
          <p className="text-gray-500 text-sm mt-1">#{params.orderId.slice(-8).toUpperCase()}</p>
        </div>

        <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 bg-${statusColor}-50 text-${statusColor}-700`}>
          {STATUS_ICONS[order.status]}
          <div>
            <p className="font-semibold">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
            {order.status === 'delivered' && order.proofUrl && (
              <a href={order.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">View proof of delivery</a>
            )}
          </div>
        </div>

        {order.status === 'out_for_delivery' && (
          <LiveDriverMap deliveryAddress={order.deliveryAddress} />
        )}

        {order.status !== 'cancelled' && order.status !== 'pending_payment' && (
          <div className="mb-8">
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i <= currentStep ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {i + 1}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 ${i < currentStep ? 'bg-brand' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Confirmed</span><span>Preparing</span><span>Packed</span><span>En Route</span><span>Delivered</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Order Details</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.productName}</span>
                <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>
          <hr />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span className="text-brand">{formatCurrency(order.total)}</span></div>
          </div>
          <hr />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Delivery Address</p>
            <p>{order.deliveryAddress.line1}{order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ''}</p>
            <p>{order.deliveryAddress.suburb} {order.deliveryAddress.state} {order.deliveryAddress.postcode}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
