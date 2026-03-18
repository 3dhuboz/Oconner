import { useEffect, useState, useRef } from 'react';
import { api, formatCurrency } from '@butcher/shared';
import type { Product } from '@butcher/shared';
import { Plus, Pencil, X, Upload, Sparkles, Image } from 'lucide-react';
import { toast } from '../lib/toast';

const CATEGORIES = ['beef', 'lamb', 'pork', 'chicken', 'seafood', 'deli', 'pack', 'other'];
const EMPTY: Partial<Product> = { name: '', category: 'beef', pricePerKg: 0, fixedPrice: 0, stockOnHand: 0, minThreshold: 0, active: true, isMeatPack: false };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<(Partial<Product> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgGenerating, setImgGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.products.list()
      .then((data) => setProducts(data as Product[]))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { id, ...data } = editing;
      if (id) {
        await api.products.update(id, data);
        setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...data } as Product : p));
        toast('Product updated');
      } else {
        const created = await api.products.create({ ...data, displayOrder: products.length }) as Product;
        setProducts((prev) => [...prev, created]);
        toast('Product created');
      }
      setEditing(null);
    } catch {
      toast('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    await api.products.update(product.id!, { active: !product.active });
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, active: !p.active } : p));
  };

  const f = <K extends keyof Product>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditing((prev) => prev ? { ...prev, [k]: (e.target.type === 'number' ? Number(e.target.value) : e.target.value) } : prev);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setImgUploading(true);
    try {
      const url = await api.images.upload(file, 'products');
      setEditing((prev) => prev ? { ...prev, imageUrl: url } : prev);
      toast('Image uploaded');
    } catch {
      toast('Image upload failed', 'error');
    } finally {
      setImgUploading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!editing?.name) { toast('Enter a product name first', 'info'); return; }
    setImgGenerating(true);
    try {
      const prompt = encodeURIComponent(`${editing.name}, premium quality meat, food photography, dark background, restaurant quality, high resolution`);
      const url = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=600&nologo=true&seed=${Date.now()}`;
      setEditing((prev) => prev ? { ...prev, imageUrl: url } : prev);
      toast('AI image generated — save product to store it');
    } catch {
      toast('Failed to generate AI image', 'error');
    } finally {
      setImgGenerating(false);
    }
  };

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
              <th className="px-4 py-3 text-left w-10"></th>
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
                <td className="px-4 py-3">
                  {(p as any).imageUrl ? (
                    <img src={(p as any).imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Image className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                </td>
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

              {/* Image section */}
              <div className="border border-dashed rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-gray-500">Product Image</p>
                {(editing as any).imageUrl ? (
                  <div className="relative">
                    <img
                      src={(editing as any).imageUrl}
                      alt="preview"
                      className="w-full h-40 object-cover rounded-lg bg-gray-100"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      onClick={() => setEditing((prev) => prev ? { ...prev, imageUrl: '' } : prev)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                    <Image className="h-8 w-8" />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imgUploading}
                    className="flex-1 flex items-center justify-center gap-1.5 border rounded-lg px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {imgUploading ? 'Uploading…' : 'Upload Image'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={imgGenerating}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg px-3 py-2 text-xs font-medium hover:bg-purple-100 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {imgGenerating ? 'Generating…' : 'AI Generate'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
                <p className="text-xs text-gray-400">Or paste a URL:</p>
                <input
                  placeholder="https://example.com/image.jpg"
                  value={(editing as any).imageUrl ?? ''}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, imageUrl: e.target.value } : prev)}
                  className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
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
