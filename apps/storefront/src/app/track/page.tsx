'use client';

export const runtime = 'edge';

import { useState, useEffect, useRef } from 'react';
import { api } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Truck, MapPin, CheckCircle, Clock, Phone } from 'lucide-react';

interface DriverSession {
  id: string;
  driverName?: string;
  lastLat?: number;
  lastLng?: number;
  heading?: number;
  lastUpdated?: any;
  active?: boolean;
  deliveryDayId?: string;
}

interface Stop {
  id: string;
  sequence: number;
  customerName: string;
  address: { line1: string; suburb: string; postcode: string };
  status: string;
  customerPhone?: string;
  lat?: number;
  lng?: number;
}

function formatTime(ts: any): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
}

export default function TrackPage() {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    const load = () =>
      api.drivers.activeSessions()
        .then((data: any) => {
          setLoading(false);
          const sessions = data as DriverSession[];
          setSession(sessions.length > 0 ? sessions[0] : null);
        })
        .catch(() => setLoading(false));
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!session?.deliveryDayId) return;
    api.stops.list(session.deliveryDayId)
      .then((data: any) => setStops(data as Stop[]))
      .catch(() => {});
  }, [session?.deliveryDayId]);

  useEffect(() => {
    if (!session?.lastLat || !session?.lastLng || !mapRef.current) return;
    if (typeof window === 'undefined') return;

    if (!mapInstance.current) {
      const L = (window as any).L;
      if (!L) return;
      const map = L.map(mapRef.current).setView([session.lastLat, session.lastLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      mapInstance.current = map;

      const icon = L.divIcon({
        html: `<div style="background:#1a3c2b;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚚</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      markerRef.current = L.marker([session.lastLat, session.lastLng], { icon }).addTo(map);
    } else {
      markerRef.current?.setLatLng([session.lastLat, session.lastLng]);
      mapInstance.current.panTo([session.lastLat, session.lastLng]);
    }
  }, [session?.lastLat, session?.lastLng]);

  const delivered = stops.filter((s) => s.status === 'delivered').length;
  const pending = stops.filter((s) => s.status === 'pending').length;
  const nextStop = stops.find((s) => s.status === 'pending');

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `if(typeof window!=='undefined'&&!window.L){var l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);var s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';document.head.appendChild(s);}`,
        }}
      />
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1 rounded-full text-sm font-medium mb-3">
              <Truck className="h-4 w-4" /> Live Driver Tracking
            </div>
            <h1 className="text-3xl font-black text-brand">Track Your Delivery</h1>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
            </div>
          )}

          {!loading && !session && (
            <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No active delivery in progress.</p>
              <p className="text-sm mt-1">Check back on your delivery day.</p>
            </div>
          )}

          {session && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Delivered', value: delivered, icon: CheckCircle, cls: 'text-green-600 bg-green-50' },
                  { label: 'Remaining', value: pending, icon: Clock, cls: 'text-amber-600 bg-amber-50' },
                  { label: 'Total Stops', value: stops.length, icon: MapPin, cls: 'text-brand bg-brand/10' },
                ].map(({ label, value, icon: Icon, cls }) => (
                  <div key={label} className={`rounded-xl p-4 text-center ${cls}`}>
                    <Icon className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-xs font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {nextStop && (
                <div className="bg-brand text-white rounded-2xl p-5">
                  <p className="text-sm font-medium text-white/70 mb-1">Next Stop</p>
                  <p className="font-bold text-lg">{nextStop.customerName}</p>
                  <p className="text-white/80 text-sm">{nextStop.address.line1}, {nextStop.address.suburb} {nextStop.address.postcode}</p>
                  {nextStop.customerPhone && (
                    <a href={`tel:${nextStop.customerPhone}`} className="flex items-center gap-1 text-white/70 text-sm mt-2 hover:text-white">
                      <Phone className="h-3.5 w-3.5" /> {nextStop.customerPhone}
                    </a>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border overflow-hidden">
                <div ref={mapRef} style={{ height: 320 }} className="w-full" />
                {session.lastLat && session.lastLng && (
                  <p className="text-xs text-gray-400 px-4 py-2">
                    Last updated: {formatTime(session.lastUpdated)} · Driver: {session.driverName ?? 'On the way'}
                  </p>
                )}
                {(!session.lastLat || !session.lastLng) && (
                  <div className="h-40 flex items-center justify-center text-gray-400">
                    <p className="text-sm">Waiting for driver GPS signal…</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50">
                  <h2 className="font-semibold text-sm">All Stops</h2>
                </div>
                <div className="divide-y">
                  {stops.map((stop, i) => (
                    <div key={stop.id} className={`px-5 py-3 flex items-center gap-3 ${stop.status === 'delivered' ? 'opacity-50' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        stop.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        stop.status === 'en_route' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {stop.status === 'delivered' ? '✓' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{stop.customerName}</p>
                        <p className="text-xs text-gray-400">{stop.address.suburb} {stop.address.postcode}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        stop.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        stop.status === 'en_route' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {stop.status === 'delivered' ? 'Delivered' : stop.status === 'en_route' ? 'En Route' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
