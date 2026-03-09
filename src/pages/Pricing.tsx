import React, { useState, useEffect, useMemo } from 'react';
import { Search, Upload, AlertTriangle, TrendingUp, TrendingDown, Package, RefreshCw, DollarSign, BarChart3, CheckCircle2, XCircle, ArrowRight, Check, Percent, Settings, RefreshCcw, Pencil } from 'lucide-react';
import { cn } from '../utils';

interface PartEntry {
  _id: string;
  partName: string;
  partKey: string;
  supplier: string;
  costPrice: number;
  sellPrice: number | null;
  markupPercent: number | null;
  previousPrice: number | null;
  priceChangePercent: number | null;
  flagged: boolean;
  invoiceRef: string | null;
  barcode: string | null;
  source: string;
  updatedAt: string;
}

export function Pricing() {
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [filterSupplier, setFilterSupplier] = useState('ALL');
  const [showUpload, setShowUpload] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvSupplier, setCsvSupplier] = useState('');
  const [csvInvoiceRef, setCsvInvoiceRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Preview / review state for smart import
  const [previewItems, setPreviewItems] = useState<Array<{
    partName: string;
    partKey: string;
    newPrice: number;
    oldPrice: number | null;
    changePercent: number | null;
    status: 'new' | 'unchanged' | 'price_change';
    supplier: string;
    quantity: number;
    barcode: string | null;
    itemCode: string | null;
    selected: boolean;
  }>>([]);
  const [previewSummary, setPreviewSummary] = useState<{ new: number; priceChanges: number; unchanged: number } | null>(null);
  const [previewSupplier, setPreviewSupplier] = useState('');
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [analyzing, setAnalyzing] = useState(false);

  // Manual add
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualSupplier, setManualSupplier] = useState('Rexel');
  const [manualBarcode, setManualBarcode] = useState('');

  // Sell price / markup
  const [globalMarkup, setGlobalMarkup] = useState<number>(30);
  const [showSettings, setShowSettings] = useState(false);
  const [editingSellPrice, setEditingSellPrice] = useState<string | null>(null);
  const [editSellValue, setEditSellValue] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/xero/pricing');
      if (res.ok) {
        const data = await res.json();
        setParts(data.parts || []);
      }
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchParts(); }, []);

  // Auto-sync pricing items to Parts Catalog whenever parts load/change
  useEffect(() => {
    if (parts.length === 0) return;
    const syncToCatalog = async () => {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');
        if (!db) return;
        for (const part of parts) {
          const sell = part.sellPrice ?? part.costPrice * (1 + globalMarkup / 100);
          await setDoc(doc(db, 'partsCatalog', part.partKey), {
            id: part.partKey,
            name: part.partName,
            defaultCost: sell,
            category: categoriseFromName(part.partName),
            supplier: part.supplier,
            costPrice: part.costPrice,
            sellPrice: sell,
            barcode: part.barcode || null,
            syncedFromPricing: true,
          }, { merge: true });
        }
        console.log(`[AutoSync] ${parts.length} parts synced to catalog with sell prices`);
      } catch (err) {
        console.warn('[AutoSync] Failed to sync pricing to catalog:', err);
      }
    };
    syncToCatalog();
  }, [parts, globalMarkup]);

  const suppliers = useMemo(() => {
    const set = new Set(parts.map(p => p.supplier).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, [parts]);

  const filtered = useMemo(() => {
    let list = [...parts];
    if (filterFlagged) list = list.filter(p => p.flagged);
    if (filterSupplier !== 'ALL') list = list.filter(p => p.supplier === filterSupplier);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.partName || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.supplier || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      return (a.partName || '').localeCompare(b.partName || '');
    });
  }, [parts, search, filterFlagged, filterSupplier]);

  const stats = useMemo(() => ({
    total: parts.length,
    flagged: parts.filter(p => p.flagged).length,
    suppliers: new Set(parts.map(p => p.supplier)).size,
    avgPrice: parts.length > 0 ? (parts.reduce((s, p) => s + (p.costPrice || 0), 0) / parts.length) : 0,
  }), [parts]);

  // Step 1: Analyze CSV — dry run to compare against existing catalog
  const handleAnalyzeCSV = async () => {
    if (!csvText.trim()) return;
    setAnalyzing(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/xero/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvText,
          supplier: csvSupplier || undefined,
          invoiceRef: csvInvoiceRef || undefined,
          dryRun: true,
        }),
      });
      const data = await res.json();
      if (data.dryRun && data.items) {
        setPreviewItems(data.items.map((it: any) => ({ ...it, selected: it.status !== 'unchanged' })));
        setPreviewSummary(data.summary);
        setPreviewSupplier(data.supplier || '');
        setImportStep('preview');
      } else if (data.error) {
        setUploadResult({ error: data.error });
      }
    } catch (err: any) {
      setUploadResult({ error: err.message });
    }
    setAnalyzing(false);
  };

  // Step 2: Import only selected items
  const handleConfirmImport = async () => {
    const selected = previewItems.filter(it => it.selected);
    if (selected.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/xero/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selected.map(it => ({
            partName: it.partName,
            supplier: it.supplier,
            costPrice: it.newPrice,
            invoiceRef: csvInvoiceRef || null,
            barcode: it.barcode || null,
            source: 'csv',
          })),
        }),
      });
      const data = await res.json();
      setUploadResult({
        success: true,
        imported: selected.length,
        skipped: previewItems.length - selected.length,
        newParts: selected.filter(it => it.status === 'new').length,
        priceUpdates: selected.filter(it => it.status === 'price_change').length,
        flaggedChanges: data.flaggedChanges || 0,
      });
      setImportStep('done');
      setCsvText('');
      setCsvSupplier('');
      setCsvInvoiceRef('');
      fetchParts();
    } catch (err: any) {
      setUploadResult({ error: err.message });
    }
    setUploading(false);
  };

  const handleResetImport = () => {
    setImportStep('upload');
    setPreviewItems([]);
    setPreviewSummary(null);
    setPreviewSupplier('');
    setUploadResult(null);
    setCsvText('');
    setCsvSupplier('');
    setCsvInvoiceRef('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleManualAdd = async () => {
    if (!manualName.trim() || !manualPrice) return;
    try {
      await fetch('/api/xero/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            partName: manualName.trim(),
            supplier: manualSupplier,
            costPrice: parseFloat(manualPrice),
            barcode: manualBarcode || undefined,
            source: 'manual',
          }],
        }),
      });
      setManualName('');
      setManualPrice('');
      setManualBarcode('');
      setShowManual(false);
      fetchParts();
    } catch (err) {
      console.error('Manual add failed:', err);
    }
  };

  // Compute effective sell price for a part
  const getSellPrice = (part: PartEntry): number => {
    if (part.sellPrice !== null && part.sellPrice !== undefined) return part.sellPrice;
    if (part.markupPercent !== null && part.markupPercent !== undefined) {
      return part.costPrice * (1 + part.markupPercent / 100);
    }
    return part.costPrice * (1 + globalMarkup / 100);
  };

  const isCustomSellPrice = (part: PartEntry): boolean => {
    return part.sellPrice !== null && part.sellPrice !== undefined;
  };

  // Save per-item sell price
  const handleSaveSellPrice = async (part: PartEntry) => {
    const val = parseFloat(editSellValue);
    if (isNaN(val) || val <= 0) { setEditingSellPrice(null); return; }
    try {
      await fetch('/api/xero/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partKey: part.partKey, sellPrice: val }),
      });
      setParts(prev => prev.map(p => p.partKey === part.partKey ? { ...p, sellPrice: val } : p));
    } catch (err) {
      console.error('Failed to save sell price:', err);
    }
    setEditingSellPrice(null);
  };

  // Clear per-item sell price (revert to global markup)
  const handleClearSellPrice = async (part: PartEntry) => {
    try {
      await fetch('/api/xero/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partKey: part.partKey, sellPrice: null }),
      });
      setParts(prev => prev.map(p => p.partKey === part.partKey ? { ...p, sellPrice: null } : p));
    } catch (err) {
      console.error('Failed to clear sell price:', err);
    }
  };

  // Sync all pricing items to Parts Catalog (Firestore partsCatalog collection)
  const handleSyncToCatalog = async () => {
    setSyncing(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      if (!db) throw new Error('Firestore not available');

      let synced = 0;
      for (const part of parts) {
        const catalogPart = {
          id: part.partKey,
          name: part.partName,
          defaultCost: getSellPrice(part),
          category: categoriseFromName(part.partName),
          supplier: part.supplier,
          costPrice: part.costPrice,
          sellPrice: getSellPrice(part),
          barcode: part.barcode || null,
          syncedFromPricing: true,
        };
        await setDoc(doc(db, 'partsCatalog', part.partKey), catalogPart, { merge: true });
        synced++;
      }
      alert(`Synced ${synced} parts to the Parts Catalog. Field techs can now access them.`);
    } catch (err: any) {
      console.error('Sync failed:', err);
      alert('Sync failed: ' + err.message);
    }
    setSyncing(false);
  };

  // Simple auto-category from part name
  function categoriseFromName(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('cable') || n.includes('wire') || n.includes('conduit')) return 'Cabling';
    if (n.includes('switch') || n.includes('breaker') || n.includes('rcd') || n.includes('mcb')) return 'Switchboard';
    if (n.includes('smoke') || n.includes('alarm') || n.includes('detector')) return 'Smoke Alarm';
    if (n.includes('light') || n.includes('lamp') || n.includes('downlight') || n.includes('led')) return 'Lighting';
    if (n.includes('power point') || n.includes('gpo') || n.includes('outlet')) return 'General';
    if (n.includes('saddle') || n.includes('clip') || n.includes('bracket') || n.includes('mount')) return 'General';
    if (n.includes('gland') || n.includes('connector') || n.includes('terminal')) return 'General';
    return 'Other';
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parts & Pricing</h1>
          <p className="text-sm text-slate-500">Rexel, Middy's, L&H — import invoices, track price changes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowManual(!showManual)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" /> Add Part
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-3 py-2 bg-[#F5A623] text-white rounded-xl text-sm font-bold hover:bg-[#E8862A] flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'px-3 py-2 border rounded-xl text-sm font-medium flex items-center gap-1.5',
              showSettings ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            <Settings className="w-4 h-4" /> Markup
          </button>
          <button
            onClick={handleSyncToCatalog}
            disabled={syncing || parts.length === 0}
            className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5"
            title="Push all pricing items to Parts Catalog for field techs"
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync to Catalog'}
          </button>
          <button onClick={fetchParts} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50" title="Refresh">
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Package className="w-3.5 h-3.5" /> Total Parts
          </div>
          <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-red-500 text-xs font-medium mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Price Alerts
          </div>
          <span className={cn('text-2xl font-bold', stats.flagged > 0 ? 'text-red-600' : 'text-slate-900')}>{stats.flagged}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <BarChart3 className="w-3.5 h-3.5" /> Suppliers
          </div>
          <span className="text-2xl font-bold text-slate-900">{stats.suppliers}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <DollarSign className="w-3.5 h-3.5" /> Avg Price
          </div>
          <span className="text-2xl font-bold text-slate-900">${stats.avgPrice.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Markup Settings ── */}
      {showSettings && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
            <Percent className="w-4 h-4" /> Global Markup Settings
          </h3>
          <p className="text-xs text-blue-600">
            Set a default markup percentage applied to all parts. You can override the sell price on individual items.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-blue-700">Default Markup %</label>
            <input
              type="number"
              min="0"
              max="500"
              step="1"
              value={globalMarkup}
              onChange={e => setGlobalMarkup(Number(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-blue-200 rounded-lg text-sm font-bold text-center bg-white focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-xs text-blue-600">
              e.g. $10.00 cost → <strong>${(10 * (1 + globalMarkup / 100)).toFixed(2)}</strong> sell
            </span>
          </div>
          <p className="text-[10px] text-blue-500">
            Items with a custom sell price (pencil icon) will ignore this setting. Click "Sync to Catalog" to push sell prices to the Parts Catalog for field techs.
          </p>
        </div>
      )}

      {/* ── Manual Add ── */}
      {showManual && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">Add Part Manually</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Part name / description" value={manualName} onChange={e => setManualName(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <input type="number" placeholder="Cost price (ex GST)" value={manualPrice} onChange={e => setManualPrice(e.target.value)} step="0.01"
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            <select title="Supplier" value={manualSupplier} onChange={e => setManualSupplier(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="Rexel">Rexel</option>
              <option value="Middy's">Middy's</option>
              <option value="L&H">L&H</option>
              <option value="JRT">JRT</option>
              <option value="Clipsal">Clipsal</option>
              <option value="Other">Other</option>
            </select>
            <input type="text" placeholder="Barcode (optional)" value={manualBarcode} onChange={e => setManualBarcode(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <button onClick={handleManualAdd} disabled={!manualName.trim() || !manualPrice}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-40">
            Save Part
          </button>
        </div>
      )}

      {/* ── CSV Smart Import ── */}
      {showUpload && (
        <div className="bg-amber-50 rounded-xl border-2 border-amber-300 p-5 space-y-4">

          {/* ── Step indicator ── */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={cn('px-2.5 py-1 rounded-full', importStep === 'upload' ? 'bg-[#F5A623] text-white' : 'bg-amber-200 text-[#E8862A]')}>1. Upload</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className={cn('px-2.5 py-1 rounded-full', importStep === 'preview' ? 'bg-[#F5A623] text-white' : 'bg-amber-200 text-[#E8862A]')}>2. Review</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className={cn('px-2.5 py-1 rounded-full', importStep === 'done' ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-[#E8862A]')}>3. Done</span>
          </div>

          {/* ════════════════════ STEP 1: UPLOAD ════════════════════ */}
          {importStep === 'upload' && (
            <>
              <h3 className="text-base font-bold text-amber-900">Import Supplier Price List / Invoice CSV</h3>
              <p className="text-sm text-[#E8862A]">
                Upload a <strong>.csv</strong> file or paste text. We'll compare every item against your existing catalog
                and show you what's <strong>new</strong>, what <strong>changed price</strong>, and what's <strong>unchanged</strong> before importing.
              </p>

              {/* ── Drag & drop / file picker zone ── */}
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer',
                  csvText ? 'border-emerald-400 bg-emerald-50' : 'border-amber-300 bg-white hover:bg-amber-100/50 hover:border-[#F5A623]'
                )}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => setCsvText((ev.target?.result as string) || '');
                    reader.readAsText(file);
                  }
                }}
                onClick={() => document.getElementById('csv-file-input')?.click()}
              >
                <input id="csv-file-input" type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                {csvText ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-bold text-emerald-800">CSV loaded — {csvText.trim().split('\n').length} rows</p>
                    <p className="text-xs text-emerald-600">Click to replace with a different file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6 text-[#E8862A]" />
                    </div>
                    <p className="text-sm font-bold text-amber-800">Click to choose a CSV file, or drag & drop here</p>
                    <p className="text-xs text-[#E8862A]">Accepts .csv and .txt files from Rexel, Middy's, L&H, or generic format</p>
                  </div>
                )}
              </div>

              {/* ── Or paste manually ── */}
              <details className="group">
                <summary className="text-xs font-semibold text-[#E8862A] cursor-pointer hover:text-amber-900 select-none">
                  Or paste CSV text manually ▸
                </summary>
                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder="Paste CSV content here..."
                  className="w-full mt-2 px-3 py-2 border border-amber-200 rounded-lg text-xs font-mono bg-white min-h-[120px] placeholder:text-amber-300"
                />
              </details>

              {/* ── Supplier & invoice ref ── */}
              <div className="flex gap-2">
                <input type="text" placeholder="Supplier (auto-detected if blank)" value={csvSupplier} onChange={e => setCsvSupplier(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-amber-200 rounded-xl text-sm bg-white" />
                <input type="text" placeholder="Invoice ref (optional)" value={csvInvoiceRef} onChange={e => setCsvInvoiceRef(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-amber-200 rounded-xl text-sm bg-white" />
              </div>

              {/* ── Buttons ── */}
              <div className="flex gap-2">
                <button onClick={handleAnalyzeCSV} disabled={!csvText.trim() || analyzing}
                  className={cn(
                    'px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors',
                    csvText.trim()
                      ? 'bg-[#E8862A] hover:bg-[#E8862A] text-white shadow-sm'
                      : 'bg-amber-200 text-[#F5A623] cursor-not-allowed'
                  )}>
                  {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {analyzing ? 'Analyzing...' : 'Analyze & Compare'}
                </button>
                <button onClick={() => { setShowUpload(false); handleResetImport(); }}
                  className="px-4 py-3 bg-white border border-amber-200 rounded-xl text-sm text-[#E8862A] font-medium hover:bg-amber-50">
                  Cancel
                </button>
              </div>

              {uploadResult?.error && (
                <div className="p-3 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200">
                  ❌ {uploadResult.error}
                </div>
              )}
            </>
          )}

          {/* ════════════════════ STEP 2: PREVIEW / REVIEW ════════════════════ */}
          {importStep === 'preview' && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-amber-900">Review Price Import — {previewSupplier}</h3>
                  <p className="text-sm text-[#E8862A]">Check each item below. Uncheck items you don't want to import or overwrite.</p>
                </div>
              </div>

              {/* ── Summary badges ── */}
              {previewSummary && (
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {previewSummary.new} new part{previewSummary.new !== 1 ? 's' : ''}
                  </span>
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold border',
                    previewSummary.priceChanges > 0
                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  )}>
                    {previewSummary.priceChanges} price change{previewSummary.priceChanges !== 1 ? 's' : ''}
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {previewSummary.unchanged} unchanged
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {previewItems.filter(it => it.selected).length} selected for import
                  </span>
                </div>
              )}

              {/* ── Select/Deselect helpers ── */}
              <div className="flex gap-2 text-xs">
                <button onClick={() => setPreviewItems(items => items.map(it => ({ ...it, selected: true })))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
                  Select All
                </button>
                <button onClick={() => setPreviewItems(items => items.map(it => ({ ...it, selected: false })))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">
                  Deselect All
                </button>
                <button onClick={() => setPreviewItems(items => items.map(it => ({ ...it, selected: it.status === 'new' })))}
                  className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 font-medium">
                  New Only
                </button>
                <button onClick={() => setPreviewItems(items => items.map(it => ({ ...it, selected: it.status !== 'unchanged' })))}
                  className="px-2 py-1 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-100 font-medium">
                  New + Changed
                </button>
              </div>

              {/* ── Preview table ── */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-3 py-2.5 w-10">
                        <input
                          type="checkbox"
                          title="Toggle all"
                          checked={previewItems.every(it => it.selected)}
                          onChange={e => setPreviewItems(items => items.map(it => ({ ...it, selected: e.target.checked })))}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2.5">Part Name</th>
                      <th className="px-3 py-2.5 text-right">Old Price</th>
                      <th className="px-3 py-2.5 text-center w-8"></th>
                      <th className="px-3 py-2.5 text-right">New Price</th>
                      <th className="px-3 py-2.5 text-right">Change</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewItems.map((item, idx) => {
                      const isUp = item.changePercent !== null && item.changePercent > 0;
                      const isDown = item.changePercent !== null && item.changePercent < 0;
                      const bigChange = item.changePercent !== null && Math.abs(item.changePercent) >= 10;
                      return (
                        <tr
                          key={item.partKey + idx}
                          className={cn(
                            'transition-colors',
                            !item.selected && 'opacity-40',
                            item.status === 'price_change' && bigChange && item.selected && 'bg-red-50/50',
                            item.status === 'new' && item.selected && 'bg-blue-50/30',
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              title={`Select ${item.partName}`}
                              checked={item.selected}
                              onChange={() => setPreviewItems(items =>
                                items.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it)
                              )}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium text-slate-900">{item.partName}</span>
                            {item.barcode && <span className="ml-2 text-[10px] text-slate-400">{item.barcode}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                            {item.oldPrice !== null ? `$${item.oldPrice.toFixed(2)}` : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.status === 'price_change' && <ArrowRight className="w-3.5 h-3.5 text-slate-400 mx-auto" />}
                          </td>
                          <td className={cn('px-3 py-2.5 text-right font-mono font-bold',
                            item.status === 'new' ? 'text-blue-700' :
                            item.status === 'price_change' ? (isUp ? 'text-red-600' : 'text-emerald-600') :
                            'text-slate-500'
                          )}>
                            ${item.newPrice.toFixed(2)}
                          </td>
                          <td className={cn('px-3 py-2.5 text-right text-xs font-bold',
                            isUp ? 'text-red-600' : isDown ? 'text-emerald-600' : 'text-slate-400'
                          )}>
                            {item.changePercent !== null ? (
                              <span className="inline-flex items-center gap-0.5">
                                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {isUp ? '+' : ''}{item.changePercent}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.status === 'new' && (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">NEW</span>
                            )}
                            {item.status === 'price_change' && (
                              <span className={cn(
                                'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold',
                                bigChange ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                              )}>
                                {bigChange ? 'BIG CHANGE' : 'CHANGED'}
                              </span>
                            )}
                            {item.status === 'unchanged' && (
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold">SAME</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Confirm / Back buttons ── */}
              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                <button onClick={() => { setImportStep('upload'); setPreviewItems([]); setPreviewSummary(null); }}
                  className="px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm text-[#E8862A] font-medium hover:bg-amber-50">
                  ← Back to Upload
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {previewItems.filter(it => it.selected).length} of {previewItems.length} items selected
                  </span>
                  <button
                    onClick={handleConfirmImport}
                    disabled={previewItems.filter(it => it.selected).length === 0 || uploading}
                    className={cn(
                      'px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm',
                      previewItems.some(it => it.selected)
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {uploading ? 'Importing...' : `Confirm Import (${previewItems.filter(it => it.selected).length})`}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════ STEP 3: DONE ════════════════════ */}
          {importStep === 'done' && uploadResult && (
            <>
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900">Import Complete</h3>
                {uploadResult.success && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {uploadResult.imported} imported
                      </span>
                      {uploadResult.newParts > 0 && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {uploadResult.newParts} new
                        </span>
                      )}
                      {uploadResult.priceUpdates > 0 && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                          {uploadResult.priceUpdates} price updates
                        </span>
                      )}
                      {uploadResult.skipped > 0 && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {uploadResult.skipped} skipped
                        </span>
                      )}
                      {uploadResult.flaggedChanges > 0 && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          {uploadResult.flaggedChanges} flagged (&gt;10%)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">Your parts catalog has been updated. Check the table below for details.</p>
                  </div>
                )}
                {uploadResult.error && (
                  <p className="text-sm text-red-600 font-medium">❌ {uploadResult.error}</p>
                )}
                <div className="flex justify-center gap-2 pt-2">
                  <button onClick={handleResetImport}
                    className="px-5 py-2.5 bg-[#F5A623] hover:bg-[#E8862A] text-white rounded-xl text-sm font-bold flex items-center gap-1.5">
                    <Upload className="w-4 h-4" /> Import Another
                  </button>
                  <button onClick={() => { setShowUpload(false); handleResetImport(); }}
                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50">
                    Close
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search parts, barcodes, suppliers..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#F5A623]" />
        </div>
        <select title="Filter by supplier" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
          {suppliers.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Suppliers' : s}</option>)}
        </select>
        <button
          onClick={() => setFilterFlagged(!filterFlagged)}
          className={cn(
            'px-3 py-2 rounded-xl text-sm font-medium border flex items-center gap-1.5 whitespace-nowrap',
            filterFlagged ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Price Alerts {stats.flagged > 0 && `(${stats.flagged})`}
        </button>
      </div>

      {/* ── Parts Table ── */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading pricing data...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">{search || filterFlagged ? 'No matching parts' : 'No parts in catalog yet'}</p>
          <p className="text-sm mt-1">Import a CSV or add parts manually to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-3">Part Name</div>
            <div className="col-span-2">Supplier</div>
            <div className="col-span-1 text-right">Cost</div>
            <div className="col-span-2 text-right">Sell Price</div>
            <div className="col-span-2 text-right">Change</div>
            <div className="col-span-2 text-right">Source</div>
          </div>

          {filtered.map(part => {
            const sell = getSellPrice(part);
            const margin = sell - part.costPrice;
            const isCustom = isCustomSellPrice(part);
            const isEditing = editingSellPrice === part.partKey;

            return (
            <div key={part._id || part.partKey} className={cn(
              'grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
              part.flagged && 'bg-red-50/50'
            )}>
              {/* Part name */}
              <div className="sm:col-span-3">
                <span className="text-sm font-medium text-slate-900">{part.partName}</span>
                {part.barcode && <span className="ml-2 text-[10px] text-slate-400 font-mono">{part.barcode}</span>}
                {part.flagged && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-2.5 h-2.5" /> PRICE CHANGE
                  </span>
                )}
              </div>
              {/* Supplier */}
              <div className="sm:col-span-2">
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{part.supplier}</span>
              </div>
              {/* Cost Price */}
              <div className="sm:col-span-1 sm:text-right">
                <span className="text-sm font-bold text-slate-900">${(part.costPrice || 0).toFixed(2)}</span>
                {part.previousPrice != null && part.previousPrice !== part.costPrice && (
                  <span className="block text-[10px] text-slate-400 line-through">${part.previousPrice.toFixed(2)}</span>
                )}
              </div>
              {/* Sell Price */}
              <div className="sm:col-span-2 sm:text-right">
                {isEditing ? (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editSellValue}
                      onChange={e => setEditSellValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveSellPrice(part);
                        if (e.key === 'Escape') setEditingSellPrice(null);
                      }}
                      className="w-20 px-2 py-1 border border-blue-300 rounded text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                      autoFocus
                      placeholder="Sell price"
                    />
                    <button onClick={() => handleSaveSellPrice(part)} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Save">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 justify-end">
                    <span className={cn('text-sm font-bold', isCustom ? 'text-blue-700' : 'text-emerald-700')}>
                      ${sell.toFixed(2)}
                    </span>
                    {isCustom && (
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold">CUSTOM</span>
                    )}
                    <button
                      onClick={() => { setEditingSellPrice(part.partKey); setEditSellValue(sell.toFixed(2)); }}
                      className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Set custom sell price"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {isCustom && (
                      <button
                        onClick={() => handleClearSellPrice(part)}
                        className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Revert to markup"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-[9px] text-slate-400 block">+${margin.toFixed(2)}</span>
                  </div>
                )}
              </div>
              {/* Change */}
              <div className="sm:col-span-2 sm:text-right">
                {part.priceChangePercent != null ? (
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-bold',
                    part.priceChangePercent > 0 ? 'text-red-600' : 'text-emerald-600'
                  )}>
                    {part.priceChangePercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {part.priceChangePercent > 0 ? '+' : ''}{part.priceChangePercent}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>
              {/* Source */}
              <div className="sm:col-span-2 sm:text-right">
                <span className="text-[10px] text-slate-400">{part.source || 'manual'}</span>
                {part.invoiceRef && <span className="ml-1 text-[10px] text-slate-300">{part.invoiceRef.substring(0, 15)}</span>}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-slate-400 py-2">
        {filtered.length} of {parts.length} parts
      </div>
    </div>
  );
}
