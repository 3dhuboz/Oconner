import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, Timestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency } from '@butcher/shared';
import type { Product } from '@butcher/shared';
import { Plus, Pencil, X } from 'lucide-react';

const CATEGORIES = ['beef', 'lamb', 'pork', 'chicken', 'seafood', 'deli', 'pack', 'other'];
const EMPTY: Partial<Product> = { name: '', category: 'beef', pricePerKg: 0, fixedPrice: 0, stockOnHand: 0, minThreshold: 0, active: true, isMeatPack: false };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<(Partial<Product> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onSnapshot(query(collection(db, 'products'), orderBy('displayOrder', 'asc')), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    });
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, ...data } = editing;
    const payload = { ...data, updatedAt: Timestamp.now() };
    if (id) {
      await updateDoc(doc(db, 'products', id), payload);
    } else {
      await addDoc(collection(db, 'products'), { ...payload, createdAt: Timestamp.now(), displayOrder: products.length });
    }
    setSaving(false);
    setEditing(null);
  };

  const toggleActive = async (product: Product) => {
    await updateDoc(doc(db, 'products', product.id!), { active: !product.active, updatedAt: Timestamp.now() });
  };

  const f = <K extends keyof Product>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditing((prev) => prev ? { ...prev, [k]: (e.target.type === 'number' ? Number(e.target.value) : e.target.value) } : prev);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Products</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{p.category}</td>
                <td className="px-4 py-3 text-right">
                  {p.isMeatPack ? formatCurrency(p.fixedPrice ?? 0) : `${formatCurrency(p.pricePerKg ?? 0)}/kg`}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={p.stockOnHand <= (p.minThreshold ?? 0) ? 'text-red-600 font-medium' : ''}>
                    {p.stockOnHand}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(p)} className={`w-10 h-5 rounded-full transition-colors ${p.active ? 'bg-brand' : 'bg-gray-300'}`}>
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${p.active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing({ ...p })} className="text-brand hover:underline text-xs font-medium">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{editing.id ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Product Name" value={editing.name ?? ''} onChange={f('name')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              <input placeholder="Description" value={editing.description ?? ''} onChange={f('description')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
              <select value={editing.category ?? 'beef'} onChange={f('category')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Price per kg (cents)</label>
                  <input type="number" value={editing.pricePerKg ?? 0} onChange={f('pricePerKg')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fixed price (cents)</label>
                  <input type="number" value={editing.fixedPrice ?? 0} onChange={f('fixedPrice')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stock on hand</label>
                  <input type="number" value={editing.stockOnHand ?? 0} onChange={f('stockOnHand')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Min threshold</label>
                  <input type="number" value={editing.minThreshold ?? 0} onChange={f('minThreshold')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
