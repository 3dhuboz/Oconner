import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@butcher/shared';
import type { Stop, StopStatus } from '@butcher/shared';
import { ArrowLeft, MapPin, Phone, Navigation, CheckCircle, Camera, AlertTriangle, ChevronRight, Undo2, PackagePlus } from 'lucide-react';
import { formatWeight } from '@butcher/shared';

/**
 * Detect offal/suet/bones add-on requests typed into the free-text customer
 * note during checkout. Returns the matched excerpts so the driver can see
 * exactly what was asked for ("Suet 2kg") rather than just a generic flag.
 * Used to render a prominent red banner on StopDetail so these add-ons don't
 * get missed when loading the ute.
 */
const ADDON_KEYWORDS = [
  'offal', 'suet', 'liver', 'kidney', 'kidneys',
  'heart', 'hearts', 'tongue', 'tripe', 'brain', 'brains',
  'oxtail', 'marrow', 'bones', 'trotter', 'trotters',
];
function detectAddOns(note: string | null | undefined): string[] {
  if (!note) return [];
  const lines = note.split(/[,;\n]+|\.\s+/g).map((s) => s.trim()).filter(Boolean);
  const matched: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (ADDON_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(lower))) {
      matched.push(line);
    }
  }
  return matched;
}

export default function StopDetailPage() {
  const { stopId } = useParams<{ stopId: string }>();
  const navigate = useNavigate();
  const [stop, setStop] = useState<Stop | null>(null);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!stopId) return;
    api.get<Stop>(`/api/stops/${stopId}`)
      .then((data) => {
        setStop(data);
        // Load all stops in this delivery day to enable auto-advance
        if (data.deliveryDayId) {
          api.stops.list(data.deliveryDayId)
            .then((stops) => setAllStops(stops as Stop[]))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [stopId]);

  // Find next undelivered stop in sequence
  const getNextStop = (): Stop | null => {
    if (!stop || allStops.length === 0) return null;
    const remaining = allStops
      .filter((s) => s.id !== stop.id && s.status !== 'delivered' && s.status !== 'failed')
      .sort((a, b) => a.sequence - b.sequence);
    return remaining[0] ?? null;
  };

  const nextStop = getNextStop();
  const deliveredCount = allStops.filter((s) => s.status === 'delivered' || s.id === stopId && (stop?.status === 'delivered' || proofUrl)).length;
  const totalStops = allStops.length;

  const goToNextOrHome = () => {
    const next = getNextStop();
    if (next) {
      // Reset state for next stop
      setNote('');
      setProofUrl(null);
      navigate(`/stop/${next.id}`, { replace: true });
    } else {
      navigate('/');
    }
  };

  // Capture a photo and either:
  //  - just upload it (mode: 'upload') — driver decides to finish delivery separately
  //  - upload + mark delivered + trigger SMS to customer (mode: 'deliver') — the "Deliver with Photo & Send" flow
  const [captureMode, setCaptureMode] = useState<'upload' | 'deliver'>('upload');

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !stopId) return;
    setUploadingPhoto(true);
    try {
      const url = await api.images.upload(file, 'proof');
      setProofUrl(url);
      if (captureMode === 'deliver') {
        // Proof-of-delivery path — photo goes out to customer via SMS on the server side.
        await api.stops.updateStatus(stopId, { status: 'delivered', proofUrl: url, driverNote: note || undefined });
        setStop((s) => s ? { ...s, status: 'delivered' as StopStatus, proofUrl: url } : s);
        setAllStops((prev) => prev.map((s) => s.id === stopId ? { ...s, status: 'delivered' as StopStatus } : s));
        goToNextOrHome();
      }
      // mode === 'upload': photo stored locally; driver still needs to tap "Mark as Delivered" to commit.
    } catch {
      // best-effort
    } finally {
      setUploadingPhoto(false);
      setCaptureMode('upload'); // reset for next time
    }
  };

  const updateStatus = async (status: StopStatus, extra?: { driverNote?: string; failReason?: string }) => {
    if (!stopId) return;
    setUpdating(true);
    await api.stops.updateStatus(stopId, { status, proofUrl: proofUrl ?? undefined, ...extra });
    setStop((s) => s ? { ...s, status: status } : s);
    setAllStops((prev) => prev.map((s) => s.id === stopId ? { ...s, status } : s));
    setUpdating(false);
    if (status === 'delivered' || status === 'failed') {
      goToNextOrHome();
    }
  };

  // Undo a mistap on "Delivered" or "Cannot Deliver". Resets the stop to en_route so the driver
  // can re-deliver it. Server clears completedAt and reverts the order status if needed.
  const undoStatus = async () => {
    if (!stopId || !stop) return;
    setUpdating(true);
    try {
      await api.stops.updateStatus(stopId, { status: 'en_route' });
      setProofUrl(null);
      setStop((s) => s ? { ...s, status: 'en_route' as StopStatus, proofUrl: undefined } : s);
      setAllStops((prev) => prev.map((s) => s.id === stopId ? { ...s, status: 'en_route' as StopStatus, proofUrl: undefined } : s));
    } finally {
      setUpdating(false);
    }
  };

  const confirmCannotDeliver = () => {
    if (!window.confirm(`Mark ${stop?.customerName ?? 'this stop'} as failed? You can undo this after.`)) return;
    updateStatus('failed', { failReason: note || 'No answer', driverNote: note });
  };

  const deliverWithPhoto = () => {
    setCaptureMode('deliver');
    fileInputRef.current?.click();
  };

  const takeOptionalPhoto = () => {
    setCaptureMode('upload');
    fileInputRef.current?.click();
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
        {(() => {
          const addOns = detectAddOns(stop.customerNote);
          if (addOns.length === 0) return null;
          return (
            <div className="bg-red-600 text-white rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <PackagePlus className="h-5 w-5" />
                <h2 className="font-bold uppercase tracking-wide text-sm">Add-ons to load</h2>
              </div>
              <ul className="space-y-1">
                {addOns.map((line, i) => (
                  <li key={i} className="text-base font-semibold bg-white/10 rounded-lg px-3 py-1.5">
                    {line}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-white/75 mt-2">From the customer's note. Double-check you have these before you get to the door.</p>
            </div>
          );
        })()}
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
          {stop.customerNote && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-0.5">Delivery Notes</p>
              <p>{stop.customerNote}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Order Items</h2>
          <div className="space-y-2">
            {stop.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.productName}</span>
                <span className="font-medium text-gray-500">
                  {item.isMeatPack ? `x${item.quantity ?? 1}` : item.weight ? formatWeight(item.weight) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Proof of Delivery</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          {proofUrl || stop.proofUrl ? (
            <div className="space-y-2">
              <img
                src={proofUrl ?? stop.proofUrl ?? ''}
                alt="Proof of delivery"
                className="w-full rounded-xl object-cover max-h-48"
              />
              <p className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Photo saved
              </p>
              <button
                onClick={takeOptionalPhoto}
                className="text-xs text-brand underline"
              >
                Retake photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full border-2 border-dashed border-brand/30 rounded-xl py-6 flex flex-col items-center gap-2 text-brand/60 hover:border-brand/60 transition-colors disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
              ) : (
                <>
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Take delivery photo</span>
                  <span className="text-xs">Photo is sent to the customer</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Driver Notes</h2>
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
                {/* Primary: quick hand-delivery, no photo. Most deliveries go this way. */}
                <button
                  onClick={() => updateStatus('delivered', { driverNote: note })}
                  disabled={updating || uploadingPhoto}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="h-5 w-5" />
                  {proofUrl || stop.proofUrl ? 'Mark as Delivered (with photo)' : 'Mark as Delivered'}
                </button>
                {/* Secondary: capture photo + deliver + SMS the customer the photo link. */}
                {!proofUrl && !stop.proofUrl && (
                  <button
                    onClick={deliverWithPhoto}
                    disabled={updating || uploadingPhoto}
                    className="w-full bg-white border-2 border-green-600 text-green-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                    {uploadingPhoto ? 'Uploading & Delivering…' : 'Deliver with Photo & Send'}
                  </button>
                )}
                <button
                  onClick={confirmCannotDeliver}
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
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-semibold">
              <CheckCircle className="h-5 w-5" />
              Delivered {totalStops > 0 && <span className="text-gray-400 font-normal text-sm">({deliveredCount}/{totalStops})</span>}
            </div>
            {nextStop ? (
              <button
                onClick={goToNextOrHome}
                className="w-full bg-brand text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                Next: {nextStop.customerName}
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-5 w-5 text-green-500" />
                All Deliveries Complete
              </button>
            )}
            <button
              onClick={undoStatus}
              disabled={updating}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4" />
              Undo — mark as not delivered
            </button>
          </div>
        )}
        {stop.status === 'failed' && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 py-2 text-red-600 font-semibold">
              <AlertTriangle className="h-5 w-5" />
              Delivery Failed
            </div>
            {nextStop ? (
              <button
                onClick={goToNextOrHome}
                className="w-full bg-brand text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                Next: {nextStop.customerName}
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold"
              >
                Back to Run
              </button>
            )}
            <button
              onClick={undoStatus}
              disabled={updating}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4" />
              Undo — not actually failed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
