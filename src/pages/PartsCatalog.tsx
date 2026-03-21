import React, { useState, useRef, useCallback } from 'react';
import { CatalogPart } from '../types';
import { Plus, Trash2, Package, Search, Edit2, Check, X, ScanBarcode, Upload, Image, Camera, Loader2, CheckCircle2, AlertCircle, StopCircle } from 'lucide-react';
import { cn } from '../utils';
import { uploadsApi } from '../services/api';
import { Html5Qrcode } from 'html5-qrcode';

interface PartsCatalogProps {
  parts: CatalogPart[];
  setParts: React.Dispatch<React.SetStateAction<CatalogPart[]>>;
}

const DEFAULT_CATEGORIES = ['General', 'Cabling', 'Switchboard', 'Smoke Alarm', 'Lighting', 'Safety', 'Other'];

export function PartsCatalog({ parts, setParts }: PartsCatalogProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New part form
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState<number | ''>('');
  const [newCategory, setNewCategory] = useState('General');
  const [newBarcode, setNewBarcode] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editCost, setEditCost] = useState<number | ''>('');
  const [editCategory, setEditCategory] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [uploadingBarcode, setUploadingBarcode] = useState(false);
  const barcodeFileRef = useRef<HTMLInputElement>(null);

  // Detect mobile vs desktop
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // ── Mobile: photo-capture approach ──
  const scanCameraRefAdd = useRef<HTMLInputElement>(null);
  const scanCameraRefEdit = useRef<HTMLInputElement>(null);
  const [scanStatus, setScanStatus] = useState<{ target: 'add' | 'edit'; state: 'scanning' | 'success' | 'error'; message?: string } | null>(null);

  const handleBarcodeScanPhoto = async (e: React.ChangeEvent<HTMLInputElement>, target: 'add' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanStatus({ target, state: 'scanning' });
    try {
      const html5Qr = new Html5Qrcode('barcode-scan-temp-' + target);
      const result = await html5Qr.scanFile(file, true);
      if (target === 'add') setNewBarcode(result);
      else setEditBarcode(result);
      setScanStatus({ target, state: 'success', message: result });
      html5Qr.clear();
      setTimeout(() => setScanStatus(null), 3000);
    } catch {
      setScanStatus({ target, state: 'error', message: 'No barcode found in photo. Try again with better lighting or hold closer.' });
      setTimeout(() => setScanStatus(null), 4000);
    }
    e.target.value = '';
  };

  // ── Desktop: live camera scanner (getUserMedia) ──
  const [liveScanner, setLiveScanner] = useState<'add' | 'edit' | null>(null);
  const liveScannerRef = useRef<Html5Qrcode | null>(null);
  const LIVE_ADD_ID = 'live-scanner-add';
  const LIVE_EDIT_ID = 'live-scanner-edit';

  const stopLiveScanner = useCallback(async () => {
    try {
      if (liveScannerRef.current) {
        await liveScannerRef.current.stop();
        liveScannerRef.current.clear();
      }
    } catch { /* ignore */ }
    liveScannerRef.current = null;
    setLiveScanner(null);
  }, []);

  const startLiveScanner = useCallback((target: 'add' | 'edit') => {
    if (liveScannerRef.current) { stopLiveScanner(); return; }
    setLiveScanner(target);
    setTimeout(() => {
      const elementId = target === 'add' ? LIVE_ADD_ID : LIVE_EDIT_ID;
      if (!document.getElementById(elementId)) { setLiveScanner(null); return; }
      const scanner = new Html5Qrcode(elementId);
      liveScannerRef.current = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.5 },
        (decoded) => {
          if (target === 'add') setNewBarcode(decoded);
          else setEditBarcode(decoded);
          setScanStatus({ target, state: 'success', message: decoded });
          stopLiveScanner();
          setTimeout(() => setScanStatus(null), 3000);
        },
        () => {}
      ).catch(() => { setLiveScanner(null); liveScannerRef.current = null; });
    }, 250);
  }, [stopLiveScanner]);

  const filteredParts = parts.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.supplier || '').toLowerCase().includes(q);
  });

  const categories = [...new Set(parts.map(p => p.category || 'General'))].sort();

  const handleAdd = () => {
    if (!newName.trim()) return;
    if (liveScanner) stopLiveScanner();
    const part: CatalogPart = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName.trim(),
      defaultCost: Number(newCost) || 0,
      category: newCategory,
      barcode: newBarcode.trim() || undefined,
      supplier: newSupplier.trim() || undefined,
    };
    setParts(prev => [...prev, part]);
    setNewName('');
    setNewCost('');
    setNewCategory('General');
    setNewBarcode('');
    setNewSupplier('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this part from the catalog?')) {
      setParts(prev => prev.filter(p => p.id !== id));
    }
  };

  const startEdit = (part: CatalogPart) => {
    setEditingId(part.id);
    setEditName(part.name);
    setEditCost(part.defaultCost);
    setEditCategory(part.category || 'General');
    setEditBarcode(part.barcode || '');
    setEditSupplier(part.supplier || '');
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    setParts(prev => prev.map(p => p.id === editingId ? {
      ...p,
      name: editName.trim(),
      defaultCost: Number(editCost) || 0,
      category: editCategory,
      barcode: editBarcode.trim() || undefined,
      supplier: editSupplier.trim() || undefined,
    } : p));
    setEditingId(null);
  };

  const handleBarcodePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    setUploadingBarcode(true);
    try {
      const { url: uploadUrl, key } = await uploadsApi.getPresignedUrl(`barcodes/${editingId}_${Date.now()}_${file.name}`, file.type);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const photoUrl = uploadsApi.getUrl(key);
      // Store the photo URL as the barcode value (prefixed to distinguish)
      setEditBarcode(`photo:${photoUrl}`);
    } catch (err) {
      console.error('Barcode photo upload failed:', err);
    }
    setUploadingBarcode(false);
    if (barcodeFileRef.current) barcodeFileRef.current.value = '';
  };

  const cancelEdit = () => {
    if (liveScanner) stopLiveScanner();
    setScanStatus(null);
    setEditingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#F5A623]" /> Parts Catalog
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {parts.length} part{parts.length !== 1 ? 's' : ''} &bull; Technicians can quick-add these on site
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" /> Add Part
        </button>
      </div>

      {/* Add Part Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">New Part</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Part Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. 10A Circuit Breaker"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sell Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newCost}
                onChange={e => setNewCost(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <select
                title="Category"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
              >
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
              <input
                type="text"
                value={newSupplier}
                onChange={e => setNewSupplier(e.target.value)}
                placeholder="e.g. Rexel"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <ScanBarcode className="w-3 h-3" /> Barcode
              </label>
              <input
                type="text"
                value={newBarcode}
                onChange={e => setNewBarcode(e.target.value)}
                placeholder="Scan or type barcode"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
              />
              {isMobile ? (
                <>
                  <input ref={scanCameraRefAdd} type="file" accept="image/*" capture="environment" onChange={e => handleBarcodeScanPhoto(e, 'add')} className="hidden" />
                  <div id="barcode-scan-temp-add" className="hidden" />
                  <button type="button" onClick={() => scanCameraRefAdd.current?.click()}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 bg-[#F5A623] text-white hover:bg-[#E8862A] active:bg-[#E8862A] transition-colors shadow-sm"
                    title="Take a photo of the barcode">
                    <Camera className="w-4 h-4" /> Snap Barcode Photo
                  </button>
                </>
              ) : (
                <>
                  <button type="button"
                    onClick={() => liveScanner === 'add' ? stopLiveScanner() : startLiveScanner('add')}
                    className={cn("mt-1.5 w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm",
                      liveScanner === 'add' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-[#F5A623] text-white hover:bg-[#E8862A]'
                    )}
                    title={liveScanner === 'add' ? 'Stop camera' : 'Open camera to scan barcode'}>
                    {liveScanner === 'add' ? <><StopCircle className="w-4 h-4" /> Stop Camera</> : <><Camera className="w-4 h-4" /> Scan Barcode with Camera</>}
                  </button>
                  {liveScanner === 'add' && (
                    <div className="mt-2 rounded-xl border-2 border-[#F5A623] bg-black overflow-hidden shadow-lg">
                      <div className="px-3 py-2 bg-[#F5A623] flex items-center justify-between">
                        <span className="text-white text-xs font-bold flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Point camera at barcode…
                        </span>
                        <button onClick={stopLiveScanner} className="text-white/80 hover:text-white text-xs font-medium flex items-center gap-1" title="Close">
                          <X className="w-3.5 h-3.5" /> Close
                        </button>
                      </div>
                      <div id={LIVE_ADD_ID} />
                    </div>
                  )}
                </>
              )}
              {scanStatus?.target === 'add' && (
                <div className={cn("mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2",
                  scanStatus.state === 'scanning' && 'bg-amber-50 text-[#E8862A] border border-amber-200',
                  scanStatus.state === 'success' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                  scanStatus.state === 'error' && 'bg-rose-50 text-rose-700 border border-rose-200'
                )}>
                  {scanStatus.state === 'scanning' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading barcode from photo…</>}
                  {scanStatus.state === 'success' && <><CheckCircle2 className="w-3.5 h-3.5" /> Barcode found: <span className="font-mono">{scanStatus.message}</span></>}
                  {scanStatus.state === 'error' && <><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {scanStatus.message}</>}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Catalog
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search parts..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
        />
      </div>

      {/* Parts list by category */}
      {filteredParts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">{search ? 'No matching parts' : 'No parts yet'}</p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'Try a different search' : 'Add parts that your technicians commonly use'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(search ? [''] : categories).map(cat => {
            const catParts = search
              ? filteredParts
              : filteredParts.filter(p => (p.category || 'General') === cat);
            if (catParts.length === 0) return null;

            return (
              <div key={cat || 'all'}>
                {!search && (
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{cat}</h3>
                )}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                  {catParts.map(part => (
                    <div key={part.id} className="px-4 py-3">
                      {editingId === part.id ? (
                        /* Edit mode */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Name</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                placeholder="Part name"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Sell Price ($)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editCost}
                                onChange={e => setEditCost(e.target.value ? Number(e.target.value) : '')}
                                placeholder="0.00"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Category</label>
                              <select
                                title="Category"
                                value={editCategory}
                                onChange={e => setEditCategory(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                              >
                                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Supplier</label>
                              <input
                                type="text"
                                value={editSupplier}
                                onChange={e => setEditSupplier(e.target.value)}
                                placeholder="e.g. Rexel"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
                                <ScanBarcode className="w-3 h-3" /> Barcode
                              </label>
                              <input
                                type="text"
                                value={editBarcode.startsWith('photo:') ? '(Photo uploaded)' : editBarcode}
                                onChange={e => setEditBarcode(e.target.value)}
                                placeholder="Enter barcode"
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                                readOnly={editBarcode.startsWith('photo:')}
                              />
                              {isMobile ? (
                                <>
                                  <input ref={scanCameraRefEdit} type="file" accept="image/*" capture="environment" onChange={e => handleBarcodeScanPhoto(e, 'edit')} className="hidden" />
                                  <div id="barcode-scan-temp-edit" className="hidden" />
                                  <button type="button" onClick={() => scanCameraRefEdit.current?.click()}
                                    className="mt-1 w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-[#F5A623] text-white hover:bg-[#E8862A] active:bg-[#E8862A] transition-colors shadow-sm"
                                    title="Take a photo of the barcode">
                                    <Camera className="w-3.5 h-3.5" /> Snap Barcode Photo
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button"
                                    onClick={() => liveScanner === 'edit' ? stopLiveScanner() : startLiveScanner('edit')}
                                    className={cn("mt-1 w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm",
                                      liveScanner === 'edit' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-[#F5A623] text-white hover:bg-[#E8862A]'
                                    )}
                                    title={liveScanner === 'edit' ? 'Stop camera' : 'Open camera to scan barcode'}>
                                    {liveScanner === 'edit' ? <><StopCircle className="w-3.5 h-3.5" /> Stop Camera</> : <><Camera className="w-3.5 h-3.5" /> Scan Barcode with Camera</>}
                                  </button>
                                  {liveScanner === 'edit' && (
                                    <div className="mt-2 rounded-xl border-2 border-[#F5A623] bg-black overflow-hidden shadow-lg">
                                      <div className="px-3 py-1.5 bg-[#F5A623] flex items-center justify-between">
                                        <span className="text-white text-[11px] font-bold flex items-center gap-1.5">
                                          <Loader2 className="w-3 h-3 animate-spin" /> Point camera at barcode…
                                        </span>
                                        <button onClick={stopLiveScanner} className="text-white/80 hover:text-white text-[11px] font-medium flex items-center gap-1" title="Close">
                                          <X className="w-3 h-3" /> Close
                                        </button>
                                      </div>
                                      <div id={LIVE_EDIT_ID} />
                                    </div>
                                  )}
                                </>
                              )}
                              {scanStatus?.target === 'edit' && (
                                <div className={cn("mt-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5",
                                  scanStatus.state === 'scanning' && 'bg-amber-50 text-[#E8862A] border border-amber-200',
                                  scanStatus.state === 'success' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                                  scanStatus.state === 'error' && 'bg-rose-50 text-rose-700 border border-rose-200'
                                )}>
                                  {scanStatus.state === 'scanning' && <><Loader2 className="w-3 h-3 animate-spin" /> Reading barcode…</>}
                                  {scanStatus.state === 'success' && <><CheckCircle2 className="w-3 h-3" /> Found: <span className="font-mono">{scanStatus.message}</span></>}
                                  {scanStatus.state === 'error' && <><AlertCircle className="w-3 h-3 shrink-0" /> {scanStatus.message}</>}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Barcode photo upload + preview */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              ref={barcodeFileRef}
                              type="file"
                              accept="image/*"
                              onChange={handleBarcodePhotoUpload}
                              className="hidden"
                              id="barcode-upload"
                            />
                            <button
                              onClick={() => barcodeFileRef.current?.click()}
                              disabled={uploadingBarcode}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1.5 disabled:opacity-50"
                              title="Upload barcode photo"
                            >
                              {uploadingBarcode ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3 h-3" />}
                              Upload Barcode Photo
                            </button>
                            {editBarcode.startsWith('photo:') && (
                              <a href={editBarcode.replace('photo:', '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                                <Image className="w-3 h-3" /> View photo
                              </a>
                            )}
                            {editBarcode && (
                              <button onClick={() => setEditBarcode('')} className="text-[10px] text-rose-500 hover:underline">Clear barcode</button>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={saveEdit} title="Save" className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEdit} title="Cancel" className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{part.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {part.category && (
                                <span className="text-[10px] text-slate-400">{part.category}</span>
                              )}
                              {part.supplier && (
                                <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">{part.supplier}</span>
                              )}
                              {part.barcode && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                                  <ScanBarcode className="w-2.5 h-2.5" />
                                  {part.barcode.startsWith('photo:') ? 'Photo' : part.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-700 shrink-0">
                            ${part.defaultCost.toFixed(2)}
                          </span>
                          <button
                            onClick={() => startEdit(part)}
                            title="Edit part"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(part.id)}
                            title="Delete part"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
