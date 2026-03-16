import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Stop, StopStatus } from '@butcher/shared';
import { ArrowLeft, MapPin, Phone, Navigation, CheckCircle, Camera, AlertTriangle } from 'lucide-react';

export default function StopDetailPage() {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<Stop | null>(null);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!stopId) return;
    return onSnapshot(doc(db, 'stops', stopId), (snap) => {
      if (snap.exists()) setStop({ id: snap.id, ...snap.data() } as Stop);
    });
  }, [stopId]);

  const updateStatus = async (status: StopStatus, extra?: Record<string, unknown>) => {
    if (!stopId) return;
    setUpdating(true);
    await updateDoc(doc(db, 'stops', stopId), {
      status,
      updatedAt: Timestamp.now(),
      ...(status === 'delivered' ? { deliveredAt: Timestamp.now() } : {}),
      ...(status === 'failed' ? { failedAt: Timestamp.now() } : {}),
      ...extra,
    });
    setUpdating(false);
    if (status === 'delivered' || status === 'failed') navigate('/');
  };

  const openMaps = () => {
    if (!stop) return;
    const addr = encodeURIComponent(`${stop.address.line1}, ${stop.address.suburb} ${stop.address.state} ${stop.address.postcode}`);
    window.open(`https://maps.google.com/?q=${addr}`, '_blank');
  };

  const callCustomer = () => {
    if (!stop?.customerPhone) return;
    window.location.href = `tel:${stop.customerPhone}`;
  };

  if (!stop) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-brand text-white px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold">{stop.customerName}</h1>
            <p className="text-white/70 text-sm">Stop #{stop.sequence}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={openMaps} className="flex-1 bg-white/10 border border-white/20 rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
            <Navigation className="h-4 w-4" />
            Navigate
          </button>
          {stop.customerPhone && (
            <button onClick={callCustomer} className="flex-1 bg-white/10 border border-white/20 rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4" />
              Call
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Delivery Address</h2>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{stop.address.line1}</p>
              {stop.address.line2 && <p className="text-gray-600">{stop.address.line2}</p>}
              <p className="text-gray-600">{stop.address.suburb} {stop.address.state} {stop.address.postcode}</p>
            </div>
          </div>
          {stop.deliveryNotes && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-0.5">Delivery Notes</p>
              <p>{stop.deliveryNotes}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Order Items</h2>
          <div className="space-y-2">
            {stop.orderItems?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.productName}</span>
                <span className="font-medium text-gray-500">
                  {item.isMeatPack ? `x${item.quantity}` : `${item.weight}g`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Delivery Notes</h2>
          <textarea
            placeholder="Add a note about this delivery (optional)…"
            value={note} onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
        </div>
      </main>

      <div className="p-4 bg-white border-t flex-shrink-0 space-y-2">
        {stop.status !== 'delivered' && stop.status !== 'failed' && (
          <>
            {stop.status === 'pending' && (
              <button
                onClick={() => updateStatus('en_route')}
                disabled={updating}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Navigation className="h-5 w-5" />
                Start Driving to Stop
              </button>
            )}
            {(stop.status === 'en_route' || stop.status === 'arrived') && (
              <>
                <button
                  onClick={() => updateStatus('delivered', { driverNote: note })}
                  disabled={updating}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5" />
                  Mark as Delivered
                </button>
                <button
                  onClick={() => updateStatus('failed', { failReason: note || 'No answer', driverNote: note })}
                  disabled={updating}
                  className="w-full bg-red-100 text-red-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Cannot Deliver
                </button>
              </>
            )}
          </>
        )}
        {stop.status === 'delivered' && (
          <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-semibold">
            <CheckCircle className="h-5 w-5" />
            Delivered
          </div>
        )}
        {stop.status === 'failed' && (
          <div className="flex items-center justify-center gap-2 py-3 text-red-600 font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Delivery Failed
          </div>
        )}
      </div>
    </div>
  );
}
