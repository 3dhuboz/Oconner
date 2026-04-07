import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { toast } from '../lib/toast';
import { Save, Search, Copy, X, Check } from 'lucide-react';

interface Allocation {
  productId: string;
  productName: string;
  allocated: number;
  sold: number;
}

interface ProductInfo {
  id: string;
  name: string;
  stockOnHand: number;
  isMeatPack: boolean;
}

interface DayInfo {
  id: string;
  date: number;
  active?: boolean;
}

export default function StockAllocationTab({ dayId, dayDate }: { dayId: string; dayDate?: number }) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [allDays, setAllDays] = useState<DayInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [allocatedOnly, setAllocatedOnly] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  useEffect(() => {
    if (!dayId) return;
    Promise.all([
      api.deliveryDays.getStock(dayId),
      api.products.list(),
      api.deliveryDays.list(),
    ]).then(([allocData, prodsData, daysData]) => {
      setAllocations(allocData as Allocation[]);
      setProducts(
        (prodsData as any[])
          .filter((p: any) => p.active)
          .map((p: any) => ({ id: p.id, name: p.name, stockOnHand: p.stockOnHand, isMeatPack: p.isMeatPack }))
          .sort((a: ProductInfo, b: ProductInfo) => a.name.localeCompare(b.name)),
      );
      setAllDays(
        (daysData as any[])
          .filter((d: any) => d.active)
          .sort((a: any, b: any) => b.date - a.date),
      );
      setLoaded(true);
    }).catch(() => toast('Failed to load stock data', 'error'));
  }, [dayId]);

  const saveAllocations = async () => {
    setSaving(true);
    try {
      const toSave = allocations.filter((a) => a.allocated > 0);
      await api.deliveryDays.setStock(dayId, toSave);
      toast('Stock allocations saved');
    } catch {
      toast('Failed to save allocations', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateAllocation = (productId: string, productName: string, value: number) => {
    setAllocations((prev) => {
      const existing = prev.find((a) => a.productId === productId);
      if (existing) return prev.map((a) => a.productId === productId ? { ...a, allocated: value } : a);
      return [...prev, { productId, productName, allocated: value, sold: 0 }];
    });
  };

  // Summary stats
  const allocatedProducts = allocations.filter((a) => a.allocated > 0);
  const totalAllocated = allocatedProducts.reduce((s, a) => s + a.allocated, 0);
  const totalSold = allocatedProducts.reduce((s, a) => s + a.sold, 0);
  const fillPct = totalAllocated > 0 ? Math.round((totalSold / totalAllocated) * 100) : 0;

  // Filter products
  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (allocatedOnly) {
      const alloc = allocations.find((a) => a.productId === p.id);
      if (!alloc || alloc.allocated === 0) return false;
    }
    return true;
  });

  // Days for copy-from (exclude current)
  const previousDays = allDays.filter((d) => d.id !== dayId && d.date < (dayDate ?? Date.now()));
  const futureDays = allDays.filter((d) => d.id !== dayId && d.date > (dayDate ?? Date.now()));

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold">Stock Allocation for This Day</h3>
          <p className="text-xs text-gray-400 mt-0.5">Set how much of each product is available for this delivery day</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCopyModal(true)}
            className="flex items-center gap-1.5 border border-brand/30 text-brand px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand/5"
          >
            <Copy className="h-4 w-4" /> Copy / Apply
          </button>
          <button
            onClick={saveAllocations}
            disabled={saving}
            className="flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Allocations'}
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="p-10 text-center text-gray-400">Loading…</div>
      ) : (
        <>
          {/* Summary bar */}
          {allocatedProducts.length > 0 && (
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-6 text-sm flex-wrap">
              <span className="text-gray-500">{allocatedProducts.length} product{allocatedProducts.length !== 1 ? 's' : ''} allocated</span>
              <span className="text-gray-500">{totalAllocated} total units</span>
              <span className="text-gray-500">{totalSold} sold</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${fillPct >= 90 ? 'bg-red-500' : fillPct >= 60 ? 'bg-amber-500' : 'bg-brand'}`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">{fillPct}%</span>
              </div>
            </div>
          )}

          {/* Search and filter */}
          <div className="px-5 py-3 border-b flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                className="accent-brand w-3.5 h-3.5"
                checked={allocatedOnly}
                onChange={(e) => setAllocatedOnly(e.target.checked)}
              />
              Allocated only
            </label>
          </div>

          {/* Product list */}
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No products match your filter</div>
            ) : filtered.map((product) => {
              const alloc = allocations.find((a) => a.productId === product.id);
              const allocated = alloc?.allocated ?? 0;
              const sold = alloc?.sold ?? 0;
              const remaining = allocated - sold;
              const pct = allocated > 0 ? Math.min(100, (sold / allocated) * 100) : 0;
              return (
                <div key={product.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-gray-400">Global: {product.stockOnHand} {product.isMeatPack ? 'units' : 'kg'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <label className="text-[10px] text-gray-400 block">Allocated</label>
                      <input
                        type="number"
                        min={sold > 0 ? sold : 0}
                        step={product.isMeatPack ? 1 : 0.5}
                        value={allocated || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateAllocation(product.id, product.name, Math.max(val, sold));
                        }}
                        className="w-20 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand"
                        placeholder="0"
                      />
                    </div>
                    <div className="text-right w-12">
                      <label className="text-[10px] text-gray-400 block">Sold</label>
                      <p className="text-sm font-medium text-gray-600">{sold}</p>
                    </div>
                    <div className="text-right w-14">
                      <label className="text-[10px] text-gray-400 block">Left</label>
                      <p className={`text-sm font-semibold ${allocated === 0 ? 'text-gray-300' : remaining <= 0 ? 'text-red-600' : remaining <= 3 ? 'text-amber-600' : 'text-green-600'}`}>
                        {allocated > 0 ? remaining : '—'}
                      </p>
                    </div>
                    <div className="w-16">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-brand'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Copy / Apply Modal */}
      {showCopyModal && (
        <CopyModal
          dayId={dayId}
          previousDays={previousDays}
          futureDays={futureDays}
          allocations={allocations}
          onCopied={async () => {
            const fresh = await api.deliveryDays.getStock(dayId) as Allocation[];
            setAllocations(fresh);
          }}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  );
}

function CopyModal({
  dayId,
  previousDays,
  futureDays,
  allocations,
  onCopied,
  onClose,
}: {
  dayId: string;
  previousDays: DayInfo[];
  futureDays: DayInfo[];
  allocations: Allocation[];
  onCopied: () => Promise<void>;
  onClose: () => void;
}) {
  const [copySource, setCopySource] = useState('');
  const [copying, setCopying] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const handleCopyFrom = async () => {
    if (!copySource) return;
    setCopying(true);
    try {
      await api.deliveryDays.copyStock(dayId, copySource);
      await onCopied();
      toast('Copied allocations from selected day');
      onClose();
    } catch {
      toast('Failed to copy allocations', 'error');
    } finally {
      setCopying(false);
    }
  };

  const toggleTarget = (id: string) => {
    setSelectedTargets((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleApplyToFuture = async () => {
    if (selectedTargets.length === 0) return;
    setApplying(true);
    setAppliedCount(0);
    let done = 0;
    for (const targetId of selectedTargets) {
      try {
        await api.deliveryDays.copyStock(targetId, dayId);
        done++;
        setAppliedCount(done);
      } catch {
        // continue with remaining
      }
    }
    toast(`Applied allocations to ${done} day${done !== 1 ? 's' : ''}`);
    setApplying(false);
    onClose();
  };

  const allocatedCount = allocations.filter((a) => a.allocated > 0).length;
  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">Copy Stock Allocations</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Section A: Copy from a previous day */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Copy from a previous day</p>
            <div className="flex gap-2">
              <select
                value={copySource}
                onChange={(e) => setCopySource(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Select a day…</option>
                {previousDays.map((d) => (
                  <option key={d.id} value={d.id}>{fmtDate(d.date)}</option>
                ))}
              </select>
              <button
                onClick={handleCopyFrom}
                disabled={!copySource || copying}
                className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-mid"
              >
                {copying ? 'Copying…' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Replaces current allocations with the selected day's values. Sold counts reset to 0.</p>
          </div>

          {/* Section B: Apply to future days */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Apply to future days</p>
            {allocatedCount === 0 ? (
              <p className="text-sm text-gray-400">Save allocations on this day first, then you can push them to future days.</p>
            ) : futureDays.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming delivery days to apply to.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">Push this day's {allocatedCount} product allocation{allocatedCount !== 1 ? 's' : ''} to:</p>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {futureDays.map((d) => (
                    <label key={d.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-brand w-4 h-4"
                        checked={selectedTargets.includes(d.id)}
                        onChange={() => toggleTarget(d.id)}
                        disabled={applying}
                      />
                      <span className="text-sm">{fmtDate(d.date)}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleApplyToFuture}
                  disabled={selectedTargets.length === 0 || applying}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-brand text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-mid"
                >
                  <Check className="h-4 w-4" />
                  {applying
                    ? `Applying… (${appliedCount}/${selectedTargets.length})`
                    : `Apply to ${selectedTargets.length} day${selectedTargets.length !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
