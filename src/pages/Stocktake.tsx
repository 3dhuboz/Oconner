import React, { useState, useEffect, useMemo } from 'react';
import { Electrician, CatalogPart } from '../types';
import { Package, Search, Plus, Minus, Users, BarChart3, ScanBarcode, RefreshCw, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import { cn } from '../utils';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc, getDoc, updateDoc } from 'firebase/firestore';

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
  type: 'stock_in' | 'stock_out' | 'adjust';
  quantity: number;
  jobId?: string;
  reason?: string;
  timestamp: string;
}

interface StocktakeProps {
  electricians: Electrician[];
  partsCatalog: CatalogPart[];
}

export function Stocktake({ electricians, partsCatalog }: StocktakeProps) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [expandedTech, setExpandedTech] = useState<string | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showMovements, setShowMovements] = useState(false);

  // Add stock form
  const [addTechId, setAddTechId] = useState('');
  const [addPartId, setAddPartId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addSaving, setAddSaving] = useState(false);

  // Listen to techStock collection
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'techStock'), (snap) => {
      setStock(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockItem)));
    }, () => {});
    return unsub;
  }, []);

  // Listen to stockMovements collection (last 100)
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'stockMovements'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovementItem));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMovements(items.slice(0, 100));
    }, () => {});
    return unsub;
  }, []);

  // Group stock by technician
  const techStock = useMemo(() => {
    const map = new Map<string, { tech: Electrician | null; items: StockItem[]; totalValue: number; totalCost: number }>();

    for (const item of stock) {
      if (item.quantity <= 0) continue;
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

  // Summary stats
  const totalItems = stock.reduce((sum, s) => sum + (s.quantity > 0 ? s.quantity : 0), 0);
  const totalRetailValue = stock.reduce((sum, s) => sum + (s.quantity > 0 ? s.sellPrice * s.quantity : 0), 0);
  const totalCostValue = stock.reduce((sum, s) => sum + (s.quantity > 0 ? s.costPrice * s.quantity : 0), 0);
  const techsWithStock = new Set(stock.filter(s => s.quantity > 0).map(s => s.technicianId)).size;

  // Add stock to a technician
  const handleAddStock = async () => {
    if (!db || !addTechId || !addPartId || addQty < 1) return;
    setAddSaving(true);
    const part = partsCatalog.find(p => p.id === addPartId);
    if (!part) { setAddSaving(false); return; }
    const tech = electricians.find(e => e.id === addTechId);

    const stockKey = `${addTechId}_${addPartId}`;
    const stockRef = doc(db, 'techStock', stockKey);

    try {
      const snap = await getDoc(stockRef);
      if (snap.exists()) {
        const current = snap.data().quantity || 0;
        await updateDoc(stockRef, {
          quantity: current + addQty,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        await setDoc(stockRef, {
          id: stockKey,
          partId: part.id,
          partName: part.name,
          barcode: part.barcode || null,
          technicianId: addTechId,
          technicianName: tech?.name || tech?.email || addTechId,
          quantity: addQty,
          sellPrice: part.sellPrice ?? part.defaultCost,
          costPrice: part.costPrice ?? part.defaultCost,
          lastUpdated: new Date().toISOString(),
        });
      }

      // Log movement
      await addDoc(collection(db, 'stockMovements'), {
        partId: part.id,
        partName: part.name,
        barcode: part.barcode || null,
        technicianId: addTechId,
        type: 'stock_in',
        quantity: addQty,
        reason: `Stock issued to ${tech?.name || 'technician'}`,
        timestamp: new Date().toISOString(),
      });

      setAddQty(1);
      setShowAddStock(false);
    } catch (err) {
      console.error('Failed to add stock:', err);
    }
    setAddSaving(false);
  };

  // Adjust stock quantity inline
  const handleAdjust = async (item: StockItem, delta: number) => {
    if (!db) return;
    const newQty = Math.max(0, item.quantity + delta);
    const stockRef = doc(db, 'techStock', item.id);
    await updateDoc(stockRef, { quantity: newQty, lastUpdated: new Date().toISOString() });

    await addDoc(collection(db, 'stockMovements'), {
      partId: item.partId,
      partName: item.partName,
      barcode: item.barcode || null,
      technicianId: item.technicianId,
      type: 'adjust',
      quantity: delta,
      reason: delta > 0 ? 'Manual stock increase' : 'Manual stock decrease',
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-500" /> Stock Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track parts held by each technician. Scanning barcodes on-site auto-deducts stock.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMovements(!showMovements)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border",
              showMovements ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            <BarChart3 className="w-4 h-4" /> Activity Log
          </button>
          <button
            onClick={() => setShowAddStock(!showAddStock)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Issue Stock
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
          <p className="text-[11px] font-medium text-slate-500">Total Items</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">${totalRetailValue.toFixed(0)}</p>
          <p className="text-[11px] font-medium text-slate-500">Retail Value</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">${totalCostValue.toFixed(0)}</p>
          <p className="text-[11px] font-medium text-slate-500">Cost Value</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{techsWithStock}</p>
          <p className="text-[11px] font-medium text-slate-500">Techs w/ Stock</p>
        </div>
      </div>

      {/* Issue Stock Form */}
      {showAddStock && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">Issue Stock to Technician</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Technician</label>
              <select
                title="Select technician"
                value={addTechId}
                onChange={e => setAddTechId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">Select tech...</option>
                {electricians.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Part</label>
              <select
                title="Select part"
                value={addPartId}
                onChange={e => setAddPartId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="">Select part...</option>
                {partsCatalog.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${(p.sellPrice ?? p.defaultCost).toFixed(2)} {p.barcode ? `(${p.barcode})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={e => setAddQty(Number(e.target.value) || 1)}
                placeholder="1"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddStock}
              disabled={!addTechId || !addPartId || addSaving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Issue to Tech
            </button>
            <button
              onClick={() => setShowAddStock(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parts or barcodes..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          title="Filter by technician"
          value={selectedTech}
          onChange={e => setSelectedTech(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
        >
          <option value="all">All Technicians</option>
          {electricians.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Stock per technician */}
      {techStock.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">{search || selectedTech !== 'all' ? 'No matching stock' : 'No stock issued yet'}</p>
          <p className="text-sm text-slate-400 mt-1">
            Use "Issue Stock" to assign parts to technicians, or scan barcodes on-site.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {techStock.map(([techId, { tech, items, totalValue, totalCost }]) => (
            <div key={techId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedTech(expandedTech === techId ? null : techId)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
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
                  {expandedTech === techId ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {expandedTech === techId && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {items.sort((a, b) => a.partName.localeCompare(b.partName)).map(item => (
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
                        <button
                          onClick={() => handleAdjust(item, -1)}
                          disabled={item.quantity <= 0}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center disabled:opacity-30"
                          title="Decrease stock"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => handleAdjust(item, 1)}
                          className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"
                          title="Increase stock"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-slate-600 w-20 text-right shrink-0">
                        ${(item.sellPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Activity Log */}
      {showMovements && movements.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Recent Stock Movements
            </h3>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {movements.map(m => {
              const tech = electricians.find(e => e.id === m.technicianId);
              return (
                <div key={m.id} className="px-5 py-2.5 flex items-center gap-3 text-xs">
                  <span className={cn("w-16 shrink-0 font-bold",
                    m.type === 'stock_in' ? 'text-emerald-600' :
                    m.type === 'stock_out' ? 'text-rose-600' :
                    'text-amber-600'
                  )}>
                    {m.type === 'stock_in' ? '+ IN' : m.type === 'stock_out' ? '- OUT' : '~ ADJ'}
                  </span>
                  <span className="flex-1 truncate text-slate-700">
                    <span className="font-medium">{m.partName}</span>
                    {m.reason && <span className="text-slate-400 ml-1">— {m.reason}</span>}
                  </span>
                  <span className="text-slate-500 shrink-0">{tech?.name || m.technicianId.substring(0, 8)}</span>
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
  );
}
