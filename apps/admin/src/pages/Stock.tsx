import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product, StockMovement } from '@butcher/shared';
import { AlertTriangle } from 'lucide-react';

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    const unsubP = onSnapshot(query(collection(db, 'products'), orderBy('name', 'asc')), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    });
    const unsubM = onSnapshot(query(collection(db, 'stockMovements'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement)));
    });
    return () => { unsubP(); unsubM(); };
  }, []);

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
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {products.map((p) => {
              const pct = Math.min(100, (p.stockOnHand / Math.max(p.stockOnHand + 10, (p.minThreshold ?? 0) * 3)) * 100);
              const isLow = p.stockOnHand <= (p.minThreshold ?? 0);
              return (
                <div key={p.id} className="px-5 py-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{p.name}</span>
                    <span className={isLow ? 'text-red-600 font-bold' : 'text-gray-600'}>
                      {p.stockOnHand} {p.isMeatPack ? 'units' : 'kg'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${isLow ? 'bg-red-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
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
          <div className="divide-y max-h-96 overflow-y-auto">
            {movements.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{m.productName}</p>
                  <p className="text-xs text-gray-400">{m.type} · {m.orderId ?? 'manual'}</p>
                </div>
                <span className={`font-bold ${m.qty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {m.qty > 0 ? '+' : ''}{m.qty} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
