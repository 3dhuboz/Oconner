import React, { useState, useEffect, useMemo } from 'react';
import { Electrician, CatalogPart } from '../types';
import {
  Package, Search, Plus, Minus, BarChart3, ScanBarcode, RefreshCw,
  ChevronDown, ChevronRight, Truck, Warehouse, ArrowRight, ShoppingCart,
  Trash2, ClipboardCheck, X, Save, AlertTriangle,
} from 'lucide-react';
import { cn } from '../utils';
import { techStockApi, stockMovementsApi, partsCatalogApi } from '../services/api';

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

type TabView = 'hq' | 'techs' | 'stocktake' | 'activity';

interface StocktakeProps {
  electricians: Electrician[];
  partsCatalog: CatalogPart[];
  refreshCatalog?: () => void;
}

// ─── Helper: upsert a stock doc (increment or create) ──────────
async function upsertStock(
  locationId: string,
  locationName: string,
  part: CatalogPart,
  qty: number,
  currentStock: StockItem[],
) {
  const stockKey = `${locationId}_${part.id}`;
  const existing = currentStock.find(s => s.id === stockKey);
  if (existing) {
    await techStockApi.update(stockKey, { quantity: Math.max(0, existing.quantity + qty), lastUpdated: new Date().toISOString() });
  } else {
    await techStockApi.upsert({
      id: stockKey,
      partId: part.id,
      partName: part.name,
      barcode: part.barcode || null,
      technicianId: locationId,
      technicianName: locationName,
      quantity: Math.max(0, qty),
      sellPrice: part.sellPrice ?? part.defaultCost,
      costPrice: part.costPrice ?? part.defaultCost,
      lastUpdated: new Date().toISOString(),
    });
  }
}

// ─── Quick-add new item form ─────────────────────────────────────
interface QuickAddForm {
  name: string;
  category: string;
  costPrice: string;
  sellPrice: string;
  barcode: string;
  supplier: string;
  qty: number;
  location: string; // HQ_ID or tech id
}

const CATEGORIES = ['General', 'Cabling', 'Switchboard', 'Smoke Alarm', 'Lighting', 'Safety', 'Other'];

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function Stocktake({ electricians, partsCatalog, refreshCatalog }: StocktakeProps) {
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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [formPartId, setFormPartId] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formTechId, setFormTechId] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick-add new item
  const [quickAdd, setQuickAdd] = useState<QuickAddForm>({
    name: '', category: 'General', costPrice: '', sellPrice: '',
    barcode: '', supplier: '', qty: 1, location: HQ_ID,
  });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // Stocktake counts (partId → counted qty)
  const [stocktakeCounts, setStocktakeCounts] = useState<Record<string, string>>({});
  const [stocktakeFilter, setStocktakeFilter] = useState('');
  const [stocktakeCategory, setStocktakeCategory] = useState('all');
  const [stocktakeSaving, setStocktakeSaving] = useState(false);
  const [stocktakeSaved, setStocktakeSaved] = useState(false);

  // ─── Poll API for stock data ────────────────────────────────
  const fetchStock = async () => {
    try {
      const data = await techStockApi.list();
      setStock(data);
    } catch (err: any) { console.warn('Stock fetch error:', err.message); }
  };

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchMovements() {
      try {
        const items = await stockMovementsApi.list();
        items.sort((a: StockMovementItem, b: StockMovementItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMovements(items.slice(0, 150));
      } catch (err: any) { console.warn('Movements fetch error:', err.message); }
    }
    fetchMovements();
    const interval = setInterval(fetchMovements, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialise stocktake counts from current HQ stock whenever catalog or stock changes
  useEffect(() => {
    const counts: Record<string, string> = {};
    for (const part of partsCatalog) {
      const hqItem = stock.find(s => s.technicianId === HQ_ID && s.partId === part.id);
      counts[part.id] = hqItem ? String(hqItem.quantity) : '0';
    }
    setStocktakeCounts(counts);
  }, [partsCatalog, stock]);

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

  // Filtered catalog for stocktake tab
  const stocktakeCatalog = useMemo(() => {
    return partsCatalog.filter(p => {
      const matchSearch = !stocktakeFilter || p.name.toLowerCase().includes(stocktakeFilter.toLowerCase()) || (p.barcode || '').toLowerCase().includes(stocktakeFilter.toLowerCase());
      const matchCat = stocktakeCategory === 'all' || p.category === stocktakeCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [partsCatalog, stocktakeFilter, stocktakeCategory]);

  // Summary
  const hqTotalItems = hqStock.reduce((s, i) => s + i.quantity, 0);
  const hqTotalCost = stock.filter(s => s.technicianId === HQ_ID && s.quantity > 0).reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const hqTotalRetail = stock.filter(s => s.technicianId === HQ_ID && s.quantity > 0).reduce((s, i) => s + i.sellPrice * i.quantity, 0);
  const techTotalItems = stock.filter(s => s.technicianId !== HQ_ID && s.quantity > 0).reduce((s, i) => s + i.quantity, 0);
  const techTotalRetail = stock.filter(s => s.technicianId !== HQ_ID && s.quantity > 0).reduce((s, i) => s + i.sellPrice * i.quantity, 0);
  const techsWithStock = new Set(stock.filter(s => s.technicianId !== HQ_ID && s.quantity > 0).map(s => s.technicianId)).size;

  // ─── Actions ────────────────────────────────────────────────

  const handleReceiveToHQ = async () => {
    if (!formPartId || formQty < 1) return;
    setFormSaving(true);
    const part = partsCatalog.find(p => p.id === formPartId);
    if (!part) { setFormSaving(false); return; }
    try {
      await upsertStock(HQ_ID, HQ_NAME, part, formQty, stock);
      await stockMovementsApi.create({
        partId: part.id, partName: part.name, barcode: part.barcode || null,
        technicianId: HQ_ID,
        type: 'stock_in', quantity: formQty,
        reason: 'Delivery received at HQ',
        timestamp: new Date().toISOString(),
      });
      setFormQty(1); setFormPartId(''); setShowReceive(false);
      await fetchStock();
    } catch (err) { console.error('Receive failed:', err); }
    setFormSaving(false);
  };

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
      await stockMovementsApi.create({
        partId: part.id, partName: part.name, barcode: part.barcode || null,
        technicianId: formTechId,
        type: 'transfer', quantity: formQty,
        fromLocation: HQ_NAME, toLocation: tech?.name || formTechId,
        reason: `Issued from HQ to ${tech?.name || 'technician'}`,
        timestamp: new Date().toISOString(),
      });
      setFormQty(1); setFormPartId(''); setFormTechId(''); setShowIssue(false);
      await fetchStock();
    } catch (err) { console.error('Issue failed:', err); }
    setFormSaving(false);
  };

  const handleSupplierPickup = async () => {
    if (!formPartId || !formTechId || formQty < 1) return;
    setFormSaving(true);
    const part = partsCatalog.find(p => p.id === formPartId);
    if (!part) { setFormSaving(false); return; }
    const tech = electricians.find(e => e.id === formTechId);
    try {
      await upsertStock(formTechId, tech?.name || formTechId, part, formQty, stock);
      await stockMovementsApi.create({
        partId: part.id, partName: part.name, barcode: part.barcode || null,
        technicianId: formTechId,
        type: 'stock_in', quantity: formQty,
        reason: `Supplier pickup on road${formSupplier ? ` (${formSupplier})` : ''}`,
        timestamp: new Date().toISOString(),
      });
      setFormQty(1); setFormPartId(''); setFormTechId(''); setFormSupplier(''); setShowSupplierPickup(false);
      await fetchStock();
    } catch (err) { console.error('Supplier pickup failed:', err); }
    setFormSaving(false);
  };

  const handleAdjust = async (item: StockItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    await techStockApi.update(item.id, { quantity: newQty, lastUpdated: new Date().toISOString() });
    await stockMovementsApi.create({
      partId: item.partId, partName: item.partName, barcode: item.barcode || null,
      technicianId: item.technicianId,
      type: 'adjust', quantity: delta,
      reason: `Manual ${delta > 0 ? 'increase' : 'decrease'}${item.technicianId === HQ_ID ? ' (HQ)' : ''}`,
      timestamp: new Date().toISOString(),
    });
    await fetchStock();
  };

  const handleDelete = async (item: StockItem) => {
    if (!confirm(`Remove "${item.partName}" from stock? This will set the quantity to zero and remove the record.`)) return;
    setDeletingId(item.id);
    try {
      await techStockApi.delete(item.id);
      await stockMovementsApi.create({
        partId: item.partId, partName: item.partName, barcode: item.barcode || null,
        technicianId: item.technicianId,
        type: 'adjust', quantity: -item.quantity,
        reason: `Removed from stock${item.technicianId === HQ_ID ? ' (HQ)' : ''}`,
        timestamp: new Date().toISOString(),
      });
      await fetchStock();
    } catch (err) { console.error('Delete failed:', err); }
    setDeletingId(null);
  };

  // Quick-add new item to catalog + stock
  const handleQuickAdd = async () => {
    if (!quickAdd.name.trim()) return;
    setQuickAddSaving(true);
    try {
      const partId = generateId();
      const cost = parseFloat(quickAdd.costPrice) || 0;
      const sell = parseFloat(quickAdd.sellPrice) || 0;
      const newPart: CatalogPart = {
        id: partId,
        name: quickAdd.name.trim(),
        defaultCost: cost,
        category: quickAdd.category,
        barcode: quickAdd.barcode.trim() || undefined,
        supplier: quickAdd.supplier.trim() || undefined,
        costPrice: cost,
        sellPrice: sell,
      };
      // Save to parts catalog
      await partsCatalogApi.upsert(newPart);
      // Add to stock at chosen location
      if (quickAdd.qty > 0) {
        const locName = quickAdd.location === HQ_ID ? HQ_NAME : (electricians.find(e => e.id === quickAdd.location)?.name || quickAdd.location);
        await upsertStock(quickAdd.location, locName, newPart, quickAdd.qty, stock);
        await stockMovementsApi.create({
          partId, partName: newPart.name, barcode: newPart.barcode || null,
          technicianId: quickAdd.location,
          type: 'stock_in', quantity: quickAdd.qty,
          reason: 'New item added to catalog and stock',
          timestamp: new Date().toISOString(),
        });
      }
      setQuickAdd({ name: '', category: 'General', costPrice: '', sellPrice: '', barcode: '', supplier: '', qty: 1, location: HQ_ID });
      setShowQuickAdd(false);
      refreshCatalog?.();
      await fetchStock();
    } catch (err) { console.error('Quick-add failed:', err); }
    setQuickAddSaving(false);
  };

  // Save full stocktake counts to HQ
  const handleSaveStocktake = async () => {
    setStocktakeSaving(true);
    try {
      for (const part of partsCatalog) {
        const countedStr = stocktakeCounts[part.id];
        if (countedStr === undefined || countedStr === '') continue;
        const counted = parseInt(countedStr, 10);
        if (isNaN(counted) || counted < 0) continue;
        const stockKey = `${HQ_ID}_${part.id}`;
        const existing = stock.find(s => s.id === stockKey);
        const currentQty = existing?.quantity || 0;
        if (counted === currentQty) continue; // no change
        const delta = counted - currentQty;
        if (existing) {
          await techStockApi.update(stockKey, { quantity: counted, lastUpdated: new Date().toISOString() });
        } else if (counted > 0) {
          await techStockApi.upsert({
            id: stockKey,
            partId: part.id,
            partName: part.name,
            barcode: part.barcode || null,
            technicianId: HQ_ID,
            technicianName: HQ_NAME,
            quantity: counted,
            sellPrice: part.sellPrice ?? part.defaultCost,
            costPrice: part.costPrice ?? part.defaultCost,
            lastUpdated: new Date().toISOString(),
          });
        }
        // Log the adjustment
        await stockMovementsApi.create({
          partId: part.id, partName: part.name, barcode: part.barcode || null,
          technicianId: HQ_ID,
          type: 'adjust', quantity: delta,
          reason: `Stocktake count (was ${currentQty}, counted ${counted})`,
          timestamp: new Date().toISOString(),
        });
      }
      await fetchStock();
      setStocktakeSaved(true);
      setTimeout(() => setStocktakeSaved(false), 3000);
    } catch (err) { console.error('Stocktake save failed:', err); }
    setStocktakeSaving(false);
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
      <button
        onClick={() => handleDelete(item)}
        disabled={deletingId === item.id}
        className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center disabled:opacity-40 transition-colors ml-1"
        title="Remove from stock"
      >
        {deletingId === item.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  // ─── Part select helper (shows HQ qty when issuing) ─────────
  const partOptionsForIssue = partsCatalog.map(p => {
    const hqItem = stock.find(s => s.technicianId === HQ_ID && s.partId === p.id);
    const hqQty = hqItem?.quantity || 0;
    return { ...p, hqQty };
  });

  // Count how many stocktake rows have been changed
  const stocktakeChangedCount = useMemo(() => {
    let changed = 0;
    for (const part of partsCatalog) {
      const countedStr = stocktakeCounts[part.id];
      if (countedStr === undefined || countedStr === '') continue;
      const counted = parseInt(countedStr, 10);
      if (isNaN(counted)) continue;
      const existing = stock.find(s => s.technicianId === HQ_ID && s.partId === part.id);
      const currentQty = existing?.quantity || 0;
      if (counted !== currentQty) changed++;
    }
    return changed;
  }, [stocktakeCounts, partsCatalog, stock]);

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
        <button
          onClick={() => { setShowQuickAdd(!showQuickAdd); setShowReceive(false); setShowIssue(false); setShowSupplierPickup(false); }}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
            showQuickAdd ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          )}
        >
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      {/* Quick-add new item (not in catalog) */}
      {showQuickAdd && (
        <div className="bg-violet-50 rounded-xl border border-violet-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-violet-800 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add New Item to Catalog & Stock
            </h3>
            <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-violet-700 mb-1">Item Name *</label>
              <input type="text" value={quickAdd.name} onChange={e => setQuickAdd(q => ({ ...q, name: e.target.value }))}
                placeholder="e.g. 10mm Twin & Earth Cable (per m)" className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Category</label>
              <select value={quickAdd.category} onChange={e => setQuickAdd(q => ({ ...q, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Cost Price ($)</label>
              <input type="number" min="0" step="0.01" value={quickAdd.costPrice} onChange={e => setQuickAdd(q => ({ ...q, costPrice: e.target.value }))}
                placeholder="0.00" className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Sell Price ($)</label>
              <input type="number" min="0" step="0.01" value={quickAdd.sellPrice} onChange={e => setQuickAdd(q => ({ ...q, sellPrice: e.target.value }))}
                placeholder="0.00" className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Barcode (optional)</label>
              <input type="text" value={quickAdd.barcode} onChange={e => setQuickAdd(q => ({ ...q, barcode: e.target.value }))}
                placeholder="Scan or type barcode" className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Supplier (optional)</label>
              <input type="text" value={quickAdd.supplier} onChange={e => setQuickAdd(q => ({ ...q, supplier: e.target.value }))}
                placeholder="e.g. Rexel" className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Initial Stock Qty</label>
              <input type="number" min="0" value={quickAdd.qty} onChange={e => setQuickAdd(q => ({ ...q, qty: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-violet-700 mb-1">Add Stock To</label>
              <select value={quickAdd.location} onChange={e => setQuickAdd(q => ({ ...q, location: e.target.value }))}
                className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm bg-white">
                <option value={HQ_ID}>HQ Warehouse</option>
                {electricians.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleQuickAdd} disabled={!quickAdd.name.trim() || quickAddSaving}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
              {quickAddSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add to Catalog & Stock
            </button>
            <button onClick={() => setShowQuickAdd(false)} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium border border-slate-200">Cancel</button>
          </div>
        </div>
      )}

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
          { key: 'stocktake' as TabView, label: 'Stocktake', icon: ClipboardCheck },
          { key: 'activity' as TabView, label: 'Activity Log', icon: BarChart3 },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
            {t.key === 'stocktake' && stocktakeChangedCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stocktakeChangedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════ HQ WAREHOUSE TAB ═══════════════ */}
      {tab === 'hq' && (
        <div className="space-y-4">
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
                  className="px-4 py-2 bg-[#E8862A] text-white rounded-lg text-sm font-medium hover:bg-[#d4771f] disabled:opacity-50 flex items-center gap-2">
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

      {/* ═══════════════ STOCKTAKE TAB ═══════════════ */}
      {tab === 'stocktake' && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">HQ Warehouse Stocktake</p>
              <p className="text-xs text-amber-700 mt-0.5">Enter the physical count for each item. Items with changed quantities are highlighted. Press <strong>Save Stocktake</strong> when done to update HQ stock and log all adjustments.</p>
            </div>
          </div>

          {/* Filters + Save button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={stocktakeFilter} onChange={e => setStocktakeFilter(e.target.value)} placeholder="Search catalog..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={stocktakeCategory} onChange={e => setStocktakeCategory(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={handleSaveStocktake}
              disabled={stocktakeSaving || stocktakeChangedCount === 0}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {stocktakeSaving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                : stocktakeSaved
                  ? <><ClipboardCheck className="w-4 h-4" /> Saved!</>
                  : <><Save className="w-4 h-4" /> Save Stocktake{stocktakeChangedCount > 0 ? ` (${stocktakeChangedCount})` : ''}</>
              }
            </button>
          </div>

          {partsCatalog.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No items in catalog yet</p>
              <p className="text-sm text-slate-400 mt-1">Add items via the Parts Catalog page or use "Add New Item" above.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                <span className="col-span-5">Item</span>
                <span className="col-span-2 text-center">Category</span>
                <span className="col-span-2 text-center">System Qty</span>
                <span className="col-span-2 text-center">Counted Qty</span>
                <span className="col-span-1 text-center">Diff</span>
              </div>
              <div className="divide-y divide-slate-50">
                {stocktakeCatalog.map(part => {
                  const hqItem = stock.find(s => s.technicianId === HQ_ID && s.partId === part.id);
                  const systemQty = hqItem?.quantity || 0;
                  const countedStr = stocktakeCounts[part.id] ?? String(systemQty);
                  const counted = parseInt(countedStr, 10);
                  const diff = isNaN(counted) ? 0 : counted - systemQty;
                  const hasChange = !isNaN(counted) && diff !== 0;

                  return (
                    <div key={part.id} className={cn(
                      "px-5 py-3 grid grid-cols-12 gap-2 items-center transition-colors",
                      hasChange ? 'bg-amber-50' : 'hover:bg-slate-50'
                    )}>
                      <div className="col-span-5 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{part.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {part.barcode && (
                            <span className="text-[10px] text-emerald-600 font-mono">{part.barcode}</span>
                          )}
                          <span className="text-[10px] text-slate-400">${(part.sellPrice ?? part.defaultCost).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{part.category || 'General'}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-bold text-slate-600">{systemQty}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={countedStr}
                          onChange={e => setStocktakeCounts(prev => ({ ...prev, [part.id]: e.target.value }))}
                          className={cn(
                            "w-16 text-center text-sm font-bold rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2",
                            hasChange
                              ? 'bg-amber-50 border-amber-300 text-amber-800 focus:ring-amber-400'
                              : 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-400'
                          )}
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {hasChange && (
                          <span className={cn(
                            "text-xs font-bold",
                            diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                          )}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Bottom save bar */}
              {stocktakeChangedCount > 0 && (
                <div className="px-5 py-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
                  <p className="text-sm text-amber-800 font-medium">
                    <strong>{stocktakeChangedCount}</strong> item{stocktakeChangedCount !== 1 ? 's' : ''} changed — don't forget to save!
                  </p>
                  <button
                    onClick={handleSaveStocktake}
                    disabled={stocktakeSaving}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {stocktakeSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save All Changes
                  </button>
                </div>
              )}
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
