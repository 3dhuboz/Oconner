import React, { useState, useEffect, useMemo } from 'react';
import { Electrician, CatalogPart } from '../types';
import { Package, Search, Plus, Minus, BarChart3, ScanBarcode, RefreshCw, ChevronDown, ChevronRight, Truck, Warehouse, ArrowRight, ShoppingCart } from 'lucide-react';
import { cn } from '../utils';
import { stockApi } from '../services/api';

const HQ_ID = '__HQ__';
const HQ_NAME = 'HQ Warehouse';

interface StockItem {
  id: string;
  partId: string;
  partName: string;
  barcode?: string;
  technicianId: string;
  technicianName: string;
  quantity: number;
  sellPrice: number;
  costPrice: number;
  lastUpdated: string;
}

interface StockMovementItem {
  id: string;
  partId: string;
  partName: string;
  barcode?: string;
  technicianId: string;
  type: 'stock_in' | 'stock_out' | 'adjust' | 'transfer';
  quantity: number;
  jobId?: string;
  reason?: string;
  fromLocation?: string;
  toLocation?: string;
  timestamp: string;
}

type TabView = 'hq' | 'techs' | 'activity';

interface StocktakeProps {
  electricians: Electrician[];
  partsCatalog: CatalogPart[];
}

// ─── Helper: upsert a stock item via REST API ──────────────
async function upsertStock(
  locationId: string,
  locationName: string,
  part: CatalogPart,
  qty: number,
  currentStock: any[],
) {
  const stockKey = `${locationId}_${part.id}`;
  const existing = currentStock.find(s => s.id === stockKey);
  const current = existing?.quantity || 0;
  await stockApi.upsertItem(stockKey, {
    id: stockKey,
    partId: part.id,
    partName: part.name,
    barcode: part.barcode || null,
    technicianId: locationId,
    technicianName: locationName,
    quantity: Math.max(0, current + qty),
    sellPrice: part.sellPrice ?? part.defaultCost,
    costPrice: part.costPrice ?? part.defaultCost,
    lastUpdated: new Date().toISOString(),
  });
}

export function Stocktake({ electricians, partsCatalog }: StocktakeProps) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [tab, setTab] = useState<TabView>('hq');
  const [search, setSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Forms
  const [showReceive, setShowReceive] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showSupplierPickup, setShowSupplierPickup] = useState(false);
  const [formPartId, setFormPartId] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formTechId, setFormTechId] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // ─── Poll stock + movements every 30s ────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      try { setStock((await stockApi.listItems()) as StockItem[]); } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const items = (await stockApi.listMovements()) as StockMovementItem[];
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMovements(items.slice(0, 150));
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  // ─── Derived data ───────────────────────────────────────────
  const hqStock = useMemo(() => {
    return stock.filter(s => s.technicianId === HQ_ID && s.quantity > 0)
      .filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.partName.toLowerCase().includes(q) || (s.barcode || '').toLowerCase().includes(q);
      })
      .sort((a, b) => a.partName.localeCompare(b.partName));
  }, [stock, search]);

  const techStockGrouped = useMemo(() => {
    const map = new Map<string, { tech: Electrician | null; items: StockItem[]; totalValue: number; totalCost: number }>();
    for (const item of stock) {
      if (item.technicianId === HQ_ID || item.quantity <= 0) continue;
      if (search) {
        const q = search.toLowerCase();
        if (!item.partName.toLowerCase().includes(q) && !(item.barcode || '').toLowerCase().includes(q)) continue;
      }
      if (selectedTech !== 'all' && item.technicianId !== selectedTech) continue;
      if (!map.has(item.technicianId)) {
        const tech = electricians.find(e => e.id === item.technicianId) || null;
        map.set(item.technicianId, { tech, items: [], totalValue: 0, totalCost: 0 });
      }
      const entry = map.get(item.technicianId)!;
      entry.items.push(item);
      entry.totalValue += item.sellPrice * item.quantity;
      entry.totalCost += item.costPrice * item.quantity;
    }
    return Array.from(map.entries()).sort((a, b) => (a[1].tech?.name || '').localeCompare(b[1].tech?.name || ''));
  }, [stock, electricians, search, selectedTech]);

  // Summary
  const hqTotalItems = hqStock.reduce((s, i) => s + i.quantity, 0);
  const hqTotalCost = stock.filter(s => s.technicianId === HQ_ID && s.quantity > 0).reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const hqTotalRetail = stock.filter(s => s.technicianId === HQ_ID && s.quantity > 0).reduce((s, i) => s + i.sellPrice * i.quantity, 0);
  const techTotalItems = stock.filter(s => s.technicianId !== HQ_ID && s.quantity > 0).reduce((s, i) => s + i.quantity, 0);
  const techTotalRetail = stock.filter(s => s.technicianId !== HQ_ID && s.quantity > 0).reduce((s, i) => s + i.sellPrice * i.quantity, 0);
  const techsWithStock = new Set(stock.filter(s => s.technicianId !== HQ_ID && s.quantity > 0).map(s => s.technicianId)).size;

  // ─── Actions ────────────────────────────────────────────────

  // Receive delivery into HQ
  const handleReceiveToHQ = async () => {
    if (!formPartId || formQty < 1) return;
    setFormSaving(true);
    const part = partsCatalog.find(p => p.id === formPartId);
    if (!part) { setFormSaving(false); return; }
    try {
      await upsertStock(HQ_ID, HQ_NAME, part, formQty, stock);
      await stockApi.addMovement({
        partId: part.id, partName: part.name, barcode: part.barcode || null,
        technicianId: HQ_ID,
        type: 'stock_in', quantity: formQty,
        reason: 'Delivery received at HQ',
        timestamp: new Date().toISOString(),
      });
      setFormQty(1); setFormPartId(''); setShowReceive(false);
    } catch (err) { console.error('Receive failed:', err); }
    setFormSaving(false);
  };

  // Issue from HQ to tech (deduct HQ, add to tech)
  const handleIssueToTech = async () => {
    if (!formPartId || !formTechId || formQty < 1) return;
    setFormSaving(true);
    const part = partsCatalog.find(p => p.id === formPartId);
    if (!part) { setFormSaving(false); return; }
    const tech = electricians.find(e => e.id === formTechId);

    const hqItem = stock.find(s => s.technicianId === HQ_ID && s.partId === formPartId);
    const hqQty = hqItem?.quantity || 0;
    if (hqQty < formQty) {
      alert(`HQ only has ${hqQty} in stock. Cannot issue ${formQty}.`);
      setFormSaving(false);
      return;
    }

    try {
      await upsertStock(HQ_ID, HQ_NAME, part, -formQty, stock);
      await upsertStock(formTechId, tech?.name || formTechId, part, formQty, stock);
      await stockApi.addMovement({
        partId: part.id, partName: part.name, barcode: part.barcode || null,
        technicianId: formTechId,
        type: 'transfer', quantity: formQty,
        fromLocation: HQ_NAME, toLocation: tech?.name || formTechId,
        reason: `Issued from HQ to ${tech?.name || 'technician'}`,
        timestamp: new Date().toISOString(),
      });
      setFormQty(1); setFormPartId(''); setFormTechId(''); setShowIssue(false);
    } catch (err) { console.error('Issue failed:', err); }
    setFormSaving(false);
  };

  // Tech picks up from supplier on the road (adds directly to tech, no HQ deduction)
  const handleSupplierPickup = async () => {
    if (!formPartId || !formTechId || formQty < 1) return;
    setFormSaving(true);
    const part = partsCatalog.find(p => p.id === formPartId);
    if (!part) { setFormSaving(false); return; }
    const tech = electricians.find(e => e.id === formTechId);

    try {
      await upsertStock(formTechId, tech?.name || formTechId, part, formQty, stock);
      await stockApi.addMovement({
        partId: part.id, partName: part.name, barcode: part.barcode || null,
        technicianId: formTechId,
        type: 'stock_in', quantity: formQty,
        reason: `Supplier pickup on road${formSupplier ? ` (${formSupplier})` : ''}`,
        timestamp: new Date().toISOString(),
      });
      setFormQty(1); setFormPartId(''); setFormTechId(''); setFormSupplier(''); setShowSupplierPickup(false);
    } catch (err) { console.error('Supplier pickup failed:', err); }
    setFormSaving(false);
  };

  // Adjust stock quantity inline (works for HQ or tech)
  const handleAdjust = async (item: StockItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    await stockApi.upsertItem(item.id, { ...item, quantity: newQty, lastUpdated: new Date().toISOString() });
    await stockApi.addMovement({
      partId: item.partId, partName: item.partName, barcode: item.barcode || null,
      technicianId: item.technicianId,
      type: 'adjust', quantity: delta,
      reason: `Manual ${delta > 0 ? 'increase' : 'decrease'}${item.technicianId === HQ_ID ? ' (HQ)' : ''}`,
      timestamp: new Date().toISOString(),
    });
    setStock(prev => prev.map(s => s.id === item.id ? { ...s, quantity: newQty } : s));
  };

  // ─── Shared stock row renderer ──────────────────────────────
  const renderStockRow = (item: StockItem) => (
    <div key={item.id} className="px-5 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{item.partName}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.barcode && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
              <ScanBarcode className="w-2.5 h-2.5" /> {item.barcode}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            Sell: ${item.sellPrice.toFixed(2)} &bull; Cost: ${item.costPrice.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => handleAdjust(item, -1)} disabled={item.quantity <= 0}
          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center disabled:opacity-30" title="Decrease">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-10 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
        <button onClick={() => handleAdjust(item, 1)}
          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center" title="Increase">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <span className="text-sm font-bold text-slate-600 w-20 text-right shrink-0">
        ${(item.sellPrice * item.quantity).toFixed(2)}
      </span>
    </div>
  );

  // ─── Part select helper (shows HQ qty when issuing) ─────────
  const partOptionsForIssue = partsCatalog.map(p => {
    const hqItem = stock.find(s => s.technicianId === HQ_ID && s.partId === p.id);
    const hqQty = hqItem?.quantity || 0;
    return { ...p, hqQty };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-500" /> Stock Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            HQ warehouse holds main stock. Issue to techs as needed. Barcodes auto-deduct on-site.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-700">{hqTotalItems}</p>
          <p className="text-[11px] font-medium text-indigo-500">HQ Stock</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">${hqTotalCost.toFixed(0)}</p>
          <p className="text-[11px] font-medium text-slate-500">HQ Cost Value</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-[#E8862A]">{techTotalItems}</p>
          <p className="text-[11px] font-medium text-slate-500">Tech Stock</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">${(hqTotalRetail + techTotalRetail).toFixed(0)}</p>
          <p className="text-[11px] font-medium text-slate-500">Total Retail</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{techsWithStock}</p>
          <p className="text-[11px] font-medium text-slate-500">Techs w/ Stock</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { key: 'hq' as TabView, label: 'HQ Warehouse', icon: Warehouse },
          { key: 'techs' as TabView, label: 'Tech Stock', icon: Package },
          { key: 'activity' as TabView, label: 'Activity Log', icon: BarChart3 },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ HQ WAREHOUSE TAB ═══════════════ */}
      {tab === 'hq' && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setShowReceive(!showReceive); setShowIssue(false); setShowSupplierPickup(false); }}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
                showReceive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}>
              <Plus className="w-4 h-4" /> Receive Delivery
            </button>
            <button onClick={() => { setShowIssue(!showIssue); setShowReceive(false); setShowSupplierPickup(false); }}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
                showIssue ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}>
              <ArrowRight className="w-4 h-4" /> Issue to Tech
            </button>
            <button onClick={() => { setShowSupplierPickup(!showSupplierPickup); setShowReceive(false); setShowIssue(false); }}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
                showSupplierPickup ? 'bg-amber-50 text-[#E8862A] border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}>
              <ShoppingCart className="w-4 h-4" /> Supplier Pickup
            </button>
          </div>

          {/* Receive Delivery Form */}
          {showReceive && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <Warehouse className="w-4 h-4" /> Receive Stock Delivery to HQ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-emerald-700 mb-1">Part</label>
                  <select title="Select part" value={formPartId} onChange={e => setFormPartId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg text-sm bg-white">
                    <option value="">Select part...</option>
                    {partsCatalog.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — ${(p.sellPrice ?? p.defaultCost).toFixed(2)}{p.barcode ? ` (${p.barcode})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-700 mb-1">Quantity</label>
                  <input type="number" min="1" value={formQty} onChange={e => setFormQty(Number(e.target.value) || 1)}
                    placeholder="1" className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReceiveToHQ} disabled={!formPartId || formSaving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {formSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Receive into HQ
                </button>
                <button onClick={() => setShowReceive(false)} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200">Cancel</button>
              </div>
            </div>
          )}

          {/* Issue to Tech Form */}
          {showIssue && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" /> Issue from HQ to Technician
              </h3>
              <p className="text-xs text-indigo-600">Deducts from HQ and adds to the technician's on-hand stock.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1">Technician</label>
                  <select title="Select technician" value={formTechId} onChange={e => setFormTechId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-lg text-sm bg-white">
                    <option value="">Select tech...</option>
                    {electricians.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-indigo-700 mb-1">Part (HQ stock shown)</label>
                  <select title="Select part" value={formPartId} onChange={e => setFormPartId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-lg text-sm bg-white">
                    <option value="">Select part...</option>
                    {partOptionsForIssue.filter(p => p.hqQty > 0).map(p => (
                      <option key={p.id} value={p.id}>{p.name} — HQ has {p.hqQty}{p.barcode ? ` (${p.barcode})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1">Quantity</label>
                  <input type="number" min="1" value={formQty} onChange={e => setFormQty(Number(e.target.value) || 1)}
                    placeholder="1" className="w-full px-3 py-2.5 border border-indigo-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleIssueToTech} disabled={!formTechId || !formPartId || formSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {formSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Issue to Tech
                </button>
                <button onClick={() => setShowIssue(false)} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200">Cancel</button>
              </div>
            </div>
          )}

          {/* Supplier Pickup Form */}
          {showSupplierPickup && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Tech Supplier Pickup (On the Road)
              </h3>
              <p className="text-xs text-[#E8862A]">For when a tech collects stock directly from a supplier while out on a job. Adds straight to the tech's on-hand — does not deduct from HQ.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#E8862A] mb-1">Technician</label>
                  <select title="Select technician" value={formTechId} onChange={e => setFormTechId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm bg-white">
                    <option value="">Select tech...</option>
                    {electricians.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E8862A] mb-1">Part</label>
                  <select title="Select part" value={formPartId} onChange={e => setFormPartId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm bg-white">
                    <option value="">Select part...</option>
                    {partsCatalog.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — ${(p.sellPrice ?? p.defaultCost).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E8862A] mb-1">Supplier</label>
                  <input type="text" value={formSupplier} onChange={e => setFormSupplier(e.target.value)}
                    placeholder="e.g. Rexel Lonsdale" className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#E8862A] mb-1">Quantity</label>
                  <input type="number" min="1" value={formQty} onChange={e => setFormQty(Number(e.target.value) || 1)}
                    placeholder="1" className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSupplierPickup} disabled={!formTechId || !formPartId || formSaving}
                  className="px-4 py-2 bg-[#E8862A] text-white rounded-lg text-sm font-medium hover:bg-[#E8862A] disabled:opacity-50 flex items-center gap-2">
                  {formSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  Log Pickup
                </button>
                <button onClick={() => setShowSupplierPickup(false)} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200">Cancel</button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search HQ stock..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>

          {/* HQ Stock List */}
          {hqStock.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">{search ? 'No matching HQ stock' : 'HQ warehouse is empty'}</p>
              <p className="text-sm text-slate-400 mt-1">Use "Receive Delivery" to add stock to HQ.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-50 overflow-hidden">
              {hqStock.map(renderStockRow)}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TECH STOCK TAB ═══════════════ */}
      {tab === 'techs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tech stock..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <select title="Filter by technician" value={selectedTech} onChange={e => setSelectedTech(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="all">All Technicians</option>
              {electricians.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {techStockGrouped.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">{search || selectedTech !== 'all' ? 'No matching stock' : 'No tech stock yet'}</p>
              <p className="text-sm text-slate-400 mt-1">Issue stock from HQ or log a supplier pickup.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {techStockGrouped.map(([techId, { tech, items, totalValue }]) => (
                <div key={techId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedSection(expandedSection === techId ? null : techId)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {(tech?.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800">{tech?.name || techId}</p>
                        <p className="text-[11px] text-slate-400">{items.length} part{items.length !== 1 ? 's' : ''} &bull; {items.reduce((s, i) => s + i.quantity, 0)} units</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">${totalValue.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400">retail value</p>
                      </div>
                      {expandedSection === techId ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {expandedSection === techId && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {items.sort((a, b) => a.partName.localeCompare(b.partName)).map(renderStockRow)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ ACTIVITY LOG TAB ═══════════════ */}
      {tab === 'activity' && (
        <div className="space-y-4">
          {movements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No stock movements yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                {movements.map(m => {
                  const tech = m.technicianId === HQ_ID ? null : electricians.find(e => e.id === m.technicianId);
                  const locName = m.technicianId === HQ_ID ? 'HQ' : (tech?.name || m.technicianId.substring(0, 8));
                  return (
                    <div key={m.id} className="px-5 py-2.5 flex items-center gap-3 text-xs">
                      <span className={cn("w-20 shrink-0 font-bold",
                        m.type === 'stock_in' ? 'text-emerald-600' :
                        m.type === 'stock_out' ? 'text-rose-600' :
                        m.type === 'transfer' ? 'text-indigo-600' :
                        'text-[#E8862A]'
                      )}>
                        {m.type === 'stock_in' ? '+ IN' : m.type === 'stock_out' ? '- OUT' : m.type === 'transfer' ? '→ TRANSFER' : '~ ADJ'}
                      </span>
                      <span className="flex-1 truncate text-slate-700">
                        <span className="font-medium">{m.partName}</span>
                        {m.reason && <span className="text-slate-400 ml-1">— {m.reason}</span>}
                      </span>
                      <span className="text-slate-500 shrink-0">{locName}</span>
                      <span className="text-slate-400 font-mono shrink-0 w-14 text-right">×{Math.abs(m.quantity)}</span>
                      <span className="text-slate-400 shrink-0 w-28 text-right">
                        {new Date(m.timestamp).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
