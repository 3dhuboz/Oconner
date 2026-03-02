import React, { useState, useEffect, useMemo } from 'react';
import { Search, Upload, AlertTriangle, TrendingUp, TrendingDown, Package, RefreshCw, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '../utils';

interface PartEntry {
  _id: string;
  partName: string;
  partKey: string;
  supplier: string;
  costPrice: number;
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

  // Manual add
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualSupplier, setManualSupplier] = useState('Rexel');
  const [manualBarcode, setManualBarcode] = useState('');

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

  const handleCSVUpload = async () => {
    if (!csvText.trim()) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/xero/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvText,
          supplier: csvSupplier || undefined,
          invoiceRef: csvInvoiceRef || undefined,
        }),
      });
      const data = await res.json();
      setUploadResult(data);
      if (data.success) {
        setCsvText('');
        setCsvSupplier('');
        setCsvInvoiceRef('');
        fetchParts();
      }
    } catch (err: any) {
      setUploadResult({ error: err.message });
    }
    setUploading(false);
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

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parts & Pricing</h1>
          <p className="text-sm text-slate-500">Rexel, Middy's, L&H — import invoices, track price changes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManual(!showManual)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" /> Add Part
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-3 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Import CSV
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

      {/* ── CSV Upload ── */}
      {showUpload && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-amber-800">Import Supplier Invoice CSV</h3>
          <p className="text-xs text-amber-700">
            Paste CSV text below or upload a .csv file. Auto-detects Rexel, Middy's, L&H column layouts.
          </p>
          <div className="flex gap-2">
            <input type="text" placeholder="Supplier (auto-detected if blank)" value={csvSupplier} onChange={e => setCsvSupplier(e.target.value)}
              className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" />
            <input type="text" placeholder="Invoice ref (optional)" value={csvInvoiceRef} onChange={e => setCsvInvoiceRef(e.target.value)}
              className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white" />
          </div>
          <div>
            <label className="block mb-1">
              <span className="text-xs font-medium text-amber-700">Upload CSV file:</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="block mt-1 text-sm" />
            </label>
          </div>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={'Paste CSV here...\n\n"Item Code","Description","Qty","Unit Price","Total"\n"ABC123","Clipsal 30M Switch",2,12.50,25.00'}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs font-mono bg-white min-h-[120px]"
          />
          <div className="flex gap-2">
            <button onClick={handleCSVUpload} disabled={!csvText.trim() || uploading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Importing...' : 'Import'}
            </button>
            <button onClick={() => { setShowUpload(false); setUploadResult(null); }}
              className="px-4 py-2 bg-white border border-amber-200 rounded-lg text-sm text-amber-700">
              Cancel
            </button>
          </div>
          {uploadResult && (
            <div className={cn(
              'p-3 rounded-lg text-sm',
              uploadResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            )}>
              {uploadResult.success ? (
                <>
                  Imported <strong>{uploadResult.rowsParsed}</strong> items from <strong>{uploadResult.supplier}</strong>.
                  {uploadResult.pricing?.flaggedChanges > 0 && (
                    <span className="ml-2 text-red-600 font-bold">
                      {uploadResult.pricing.flaggedChanges} price change alert{uploadResult.pricing.flaggedChanges > 1 ? 's' : ''}!
                    </span>
                  )}
                </>
              ) : (
                <>{uploadResult.error || 'Import failed'}</>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search parts, barcodes, suppliers..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500" />
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
            <div className="col-span-4">Part Name</div>
            <div className="col-span-2">Supplier</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Change</div>
            <div className="col-span-2 text-right">Source</div>
          </div>

          {filtered.map(part => (
            <div key={part._id || part.partKey} className={cn(
              'grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
              part.flagged && 'bg-red-50/50'
            )}>
              {/* Part name */}
              <div className="sm:col-span-4">
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
              {/* Price */}
              <div className="sm:col-span-2 sm:text-right">
                <span className="text-sm font-bold text-slate-900">${(part.costPrice || 0).toFixed(2)}</span>
                {part.previousPrice != null && part.previousPrice !== part.costPrice && (
                  <span className="ml-1 text-[10px] text-slate-400 line-through">${part.previousPrice.toFixed(2)}</span>
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
          ))}
        </div>
      )}

      <div className="text-center text-xs text-slate-400 py-2">
        {filtered.length} of {parts.length} parts
      </div>
    </div>
  );
}
