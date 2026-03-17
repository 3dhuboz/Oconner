import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import type { Product, StockMovement } from '@butcher/shared';
import { AlertTriangle, Plus, Minus, Package, X } from 'lucide-react';
import { toast } from '../lib/toast';

const REASONS = ['Restock', 'Damaged / Waste', 'Stocktake correction', 'Return', 'Transfer in', 'Transfer out', 'Other'];

interface AdjustState {
  product: Product;
  delta: number;
  reason: string;
  note: string;
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [adjust, setAdjust] = useState<AdjustState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.products.list() as Promise<Product[]>,
      api.get<StockMovement[]>('/api/stock/movements'),
    ]).then(([prods, movs]) => {
      setProducts(prods.sort((a, b) => a.name.localeCompare(b.name)));
      setMovements(movs);
    }).catch(() => {});
  }, []);

  const openAdjust = (p: Product, direction: 1 | -1) =>
    setAdjust({ product: p, delta: direction, reason: REASONS[0], note: '' });

  const handleAdjust = async () => {
    if (!adjust) return;
    setSaving(true);
    const { product, delta, reason, note } = adjust;
    try {
      await api.post('/api/stock/adjust', {
        productId: product.id,
        delta,
        reason,
        note: note || null,
      });
      setProducts((prev) => prev.map((p) =>
        p.id === product.id ? { ...p, stockOnHand: Math.max(0, p.stockOnHand + delta) } : p,
      ));
      setAdjust(null);
      toast(`Stock adjusted: ${adjust.product.name} ${adjust.delta > 0 ? '+' : ''}${adjust.delta}`);
    } catch {
      toast('Failed to save adjustment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const lowStock = products.filter((p) => p.stockOnHand <= (p.minThreshold ?? 0));

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand mb-6">Stock Management</h1>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <AlertTriangle className="h-5 w-5" />
            {lowStock.length} product{lowStock.length !== 1 ? 's' : ''} below minimum threshold
          </div>
          <div className="space-y-1">
            {lowStock.map((p) => (
              <p key={p.id} className="text-sm text-red-600">
                <span className="font-medium">{p.name}</span> — {p.stockOnHand} remaining (min: {p.minThreshold})
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border">
          <div className="p-5 border-b">
            <h2 className="font-semibold">Current Stock Levels</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click +/− to manually adjust any product</p>
          </div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {products.map((p) => {
              const max = Math.max(p.stockOnHand + 20, (p.minThreshold ?? 0) * 4, 1);
              const pct = Math.min(100, (p.stockOnHand / max) * 100);
              const isLow = p.stockOnHand <= (p.minThreshold ?? 0);
              return (
                <div key={p.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="font-medium text-sm truncate">{p.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openAdjust(p, -1)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className={`text-sm font-semibold min-w-[3rem] text-center ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                        {p.stockOnHand} {p.isMeatPack ? 'u' : 'kg'}
                      </span>
                      <button
                        onClick={() => openAdjust(p, 1)}
                        className="w-6 h-6 rounded-full bg-green-100 text-green-700 hover:bg-green-200 flex items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border">
          <div className="p-5 border-b">
            <h2 className="font-semibold">Recent Movements</h2>
          </div>
          <div className="divide-y max-h-[520px] overflow-y-auto">
            {movements.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No movements yet.</p>
            ) : movements.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-start justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.productName}</p>
                  <p className="text-xs text-gray-400">{(m as any).reason ?? m.type} · {m.orderId ?? 'manual'}</p>
                  {(m as any).note && <p className="text-xs text-gray-500 italic">{(m as any).note}</p>}
                </div>
                <span className={`font-bold flex-shrink-0 ${m.qty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {m.qty > 0 ? '+' : ''}{m.qty} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Adjust dialog */}
      {adjust && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-brand" />
                <h2 className="font-semibold text-lg">
                  {adjust.delta > 0 ? 'Add Stock' : 'Remove Stock'}
                </h2>
              </div>
              <button onClick={() => setAdjust(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{adjust.product.name}</span> — currently <span className="font-semibold">{adjust.product.stockOnHand} {adjust.product.isMeatPack ? 'units' : 'kg'}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantity ({adjust.delta > 0 ? 'adding' : 'removing'})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdjust((a) => a ? { ...a, delta: a.delta > 0 ? Math.max(1, a.delta - 1) : Math.min(-1, a.delta + 1) } : a)}
                    className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold"
                  >−</button>
                  <span className="text-2xl font-black w-12 text-center">{Math.abs(adjust.delta)}</span>
                  <button
                    onClick={() => setAdjust((a) => a ? { ...a, delta: a.delta > 0 ? a.delta + 1 : a.delta - 1 } : a)}
                    className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold"
                  >+</button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  New total: <strong>{Math.max(0, adjust.product.stockOnHand + adjust.delta)}</strong> {adjust.product.isMeatPack ? 'units' : 'kg'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select
                  value={adjust.reason}
                  onChange={(e) => setAdjust((a) => a ? { ...a, reason: e.target.value } : a)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Note (optional)</label>
                <input
                  placeholder="e.g. Delivery from supplier XYZ"
                  value={adjust.note}
                  onChange={(e) => setAdjust((a) => a ? { ...a, note: e.target.value } : a)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setAdjust(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button
                onClick={handleAdjust}
                disabled={saving}
                className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
