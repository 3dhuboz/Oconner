import { useEffect, useState, useRef } from 'react';
import { api } from '@butcher/shared';
import { Receipt, Camera, ImagePlus, Trash2, RefreshCcw, CheckCircle2, AlertCircle, Settings, Save, X } from 'lucide-react';
import { toast } from '../lib/toast';

/**
 * Receipt capture mini-app.
 *
 * Built so Seamus can snap a fuel/feed/supplies receipt on his phone in the
 * cab of the truck and have it in Hubdoc 5 seconds later — instead of being
 * chased by the bookkeeper every BAS quarter.
 *
 * Mobile-first: the big "Snap Receipt" button opens the phone's camera
 * directly via `<input type="file" capture="environment">` so there's no
 * gallery-picker step. Desktop falls back to a normal file picker.
 *
 * Multi-tenant from day one — every read/write is scoped to a business the
 * user belongs to (currently only O'Connor Agriculture). The business
 * switcher only renders when the user belongs to >1 business.
 */

interface Business {
  id: string;
  name: string;
  slug: string;
  hubdocEmail: string | null;
  active: boolean;
  role: string;
}

interface ReceiptRow {
  id: string;
  businessId: string;
  photoUrl: string;
  photoKey: string;
  notes: string | null;
  merchant: string | null;
  amountCents: number | null;
  hubdocForwardedAt: number | null;
  hubdocForwardError: string | null;
  capturedAt: number;
  createdAt: number;
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const formatAmount = (cents: number | null) =>
  cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

export default function ReceiptsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string>('');
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hubdocEmailDraft, setHubdocEmailDraft] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentBiz = businesses.find((b) => b.id === businessId);

  useEffect(() => {
    api.businesses.mine()
      .then((rows) => {
        const list = rows as Business[];
        setBusinesses(list);
        // Default to the first business — for Seamus that's always O'Connor.
        if (list.length > 0) setBusinessId((prev) => prev || list[0].id);
      })
      .catch(() => toast('Could not load businesses', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!businessId) return;
    api.receipts.list(businessId)
      .then((rows) => setReceipts(rows as ReceiptRow[]))
      .catch(() => toast('Could not load receipts', 'error'));
  }, [businessId]);

  const refresh = async () => {
    if (!businessId) return;
    try {
      const rows = await api.receipts.list(businessId) as ReceiptRow[];
      setReceipts(rows);
    } catch {
      toast('Could not refresh', 'error');
    }
  };

  const handleFile = async (file: File) => {
    if (!businessId) {
      toast('No business selected', 'error');
      return;
    }
    setUploading(true);
    try {
      const result = await api.receipts.upload(file, businessId) as ReceiptRow;
      setReceipts((prev) => [result, ...prev]);
      if (result.hubdocForwardedAt) {
        toast('Receipt saved + forwarded to Hubdoc');
      } else if (currentBiz?.hubdocEmail) {
        toast('Receipt saved (Hubdoc forward failed — you can retry)', 'error');
      } else {
        toast('Receipt saved. Configure Hubdoc email in settings to auto-forward.');
      }
    } catch (e: any) {
      toast(e?.message ?? 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!confirm('Delete this receipt? Removes it from the gallery but the Hubdoc copy stays.')) return;
    try {
      await api.receipts.remove(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      toast('Receipt deleted');
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const retryForward = async (id: string) => {
    try {
      const result = await api.receipts.retryForward(id) as { ok: boolean; hubdocForwardedAt: number | null };
      if (result.ok && result.hubdocForwardedAt) {
        setReceipts((prev) => prev.map((r) => r.id === id ? { ...r, hubdocForwardedAt: result.hubdocForwardedAt, hubdocForwardError: null } : r));
        toast('Forwarded to Hubdoc');
      } else {
        toast('Forward failed — check Hubdoc email setting', 'error');
      }
    } catch (e: any) {
      toast(e?.message ?? 'Retry failed', 'error');
    }
  };

  const openSettings = () => {
    setHubdocEmailDraft(currentBiz?.hubdocEmail ?? '');
    setShowSettings(true);
  };

  const saveSettings = async () => {
    if (!currentBiz) return;
    setSavingSettings(true);
    try {
      const updated = await api.businesses.update(currentBiz.id, { hubdocEmail: hubdocEmailDraft.trim() || null }) as Business;
      setBusinesses((prev) => prev.map((b) => b.id === updated.id ? { ...b, hubdocEmail: updated.hubdocEmail } : b));
      toast('Settings saved');
      setShowSettings(false);
    } catch (e: any) {
      toast(e?.message ?? 'Save failed', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" /></div>;
  }

  if (businesses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p>You're not a member of any business yet.</p>
        <p className="text-xs mt-1">Ask an admin to add you.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand flex items-center gap-2">
            <Receipt className="h-6 w-6" /> Receipts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Snap a receipt on your phone — it'll auto-forward to your bookkeeper.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {businesses.length > 1 && (
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
            title="Hubdoc email + settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {currentBiz && !currentBiz.hubdocEmail && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 mb-4 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <strong>Hubdoc email not set yet.</strong> Receipts will be saved here but not auto-forwarded.
            <button onClick={openSettings} className="ml-1 underline font-medium">Configure now</button>
          </div>
        </div>
      )}

      {/* ── Big snap button (the whole point of this page) ── */}
      <div className="bg-white border rounded-2xl p-6 mb-6">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !businessId}
          className="w-full flex flex-col items-center justify-center gap-3 bg-brand text-white py-10 rounded-xl text-lg font-bold hover:bg-brand-mid transition-colors disabled:opacity-50"
        >
          <Camera className="h-10 w-10" />
          {uploading ? 'Uploading…' : 'Snap Receipt'}
        </button>
        {/*
          capture="environment" tells mobile browsers to default to the back
          camera. Desktop browsers ignore it and fall back to file picker.
        */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <p className="text-xs text-gray-500 text-center mt-3">
          Tap to open your camera, or drag a photo from your computer.
        </p>
      </div>

      {/* ── Gallery ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">
          Recent receipts {receipts.length > 0 && <span className="text-gray-400 font-normal">({receipts.length})</span>}
        </h2>
        <button onClick={refresh} className="text-xs text-gray-500 hover:text-brand flex items-center gap-1">
          <RefreshCcw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border text-gray-400">
          <ImagePlus className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No receipts yet — snap one above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {receipts.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl overflow-hidden">
              <a href={r.photoUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-gray-50 overflow-hidden">
                <img
                  src={r.photoUrl}
                  alt={r.merchant ?? 'Receipt'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.merchant ?? 'Untagged'}</p>
                    <p className="text-xs text-gray-500">{formatDate(r.capturedAt)}</p>
                  </div>
                  <p className="font-semibold text-sm text-brand flex-shrink-0">{formatAmount(r.amountCents)}</p>
                </div>
                {r.notes && <p className="text-xs text-gray-500 line-clamp-2">{r.notes}</p>}
                <div className="flex items-center justify-between pt-1.5">
                  {r.hubdocForwardedAt ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> In Hubdoc
                    </span>
                  ) : r.hubdocForwardError ? (
                    <button
                      onClick={() => retryForward(r.id)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full hover:bg-red-100"
                      title={r.hubdocForwardError}
                    >
                      <RefreshCcw className="h-3 w-3" /> Retry forward
                    </button>
                  ) : currentBiz?.hubdocEmail ? (
                    <button
                      onClick={() => retryForward(r.id)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full hover:bg-gray-200"
                    >
                      <RefreshCcw className="h-3 w-3" /> Forward now
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400">No Hubdoc</span>
                  )}
                  <button
                    onClick={() => deleteReceipt(r.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && currentBiz && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-brand" /> Receipt settings
              </h2>
              <button onClick={() => setShowSettings(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Hubdoc email-in address</label>
                <input
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={hubdocEmailDraft}
                  onChange={(e) => setHubdocEmailDraft(e.target.value)}
                  placeholder="your-account@yourcompany.hubdoc.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Find this in Hubdoc → Settings → Account → "Send documents to". Receipts will be emailed here automatically.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSettings(false)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brand-mid flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" /> {savingSettings ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
