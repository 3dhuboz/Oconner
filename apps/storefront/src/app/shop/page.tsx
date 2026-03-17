'use client';

import { useState, useEffect } from 'react';
import { api } from '@butcher/shared';
import { useCart } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { Product } from '@butcher/shared';
import { formatCurrency, formatWeight } from '@butcher/shared';
import { ShoppingCart, Plus, Minus } from 'lucide-react';

const CATEGORIES = ['All', 'packs', 'beef', 'lamb', 'pork', 'chicken', 'other'];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const { addItem, items } = useCart();

  useEffect(() => {
    setLoading(true);
    api.products.list(true)
      .then((data) => setProducts(data as Product[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = category === 'All' ? products : products.filter((p) => p.category === category);

  const getItemQty = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    return item?.quantity ?? 0;
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black uppercase tracking-wide text-brand mb-8" style={{fontFamily:'var(--font-heading)'}}>Our Products</h1>

        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                category === cat
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No products found in this category.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                qty={getItemQty(product.id!)}
                onAdd={() => addItem({
                  productId: product.id!,
                  productName: product.name,
                  category: product.category,
                  isMeatPack: product.isMeatPack,
                  weight: product.isMeatPack ? undefined : 500,
                  quantity: 1,
                  pricePerKg: product.pricePerKg,
                  fixedPrice: product.fixedPrice,
                  lineTotal: product.isMeatPack ? (product.fixedPrice ?? 0) : Math.round((product.pricePerKg ?? 0) * 0.5),
                })}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function ProductCard({
  product,
  qty,
  onAdd,
}: {
  product: Product;
  qty: number;
  onAdd: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-brand-light flex items-center justify-center text-6xl">🥩</div>
      )}
      <div className="p-4">
        <span className="text-xs font-medium text-brand uppercase tracking-wide bg-brand-light px-2 py-0.5 rounded-full">
          {product.category}
        </span>
        <h3 className="font-semibold text-lg mt-2 mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {product.isMeatPack ? (
              <span className="text-xl font-bold text-brand">{formatCurrency(product.fixedPrice ?? 0)}</span>
            ) : (
              <span className="text-xl font-bold text-brand">{formatCurrency(product.pricePerKg ?? 0)}<span className="text-sm font-normal text-gray-500">/kg</span></span>
            )}
            {product.stockOnHand <= (product.minThreshold ?? 0) + 2 && (
              <p className="text-xs text-accent font-medium">Low stock</p>
            )}
          </div>
          <button
            onClick={onAdd}
            disabled={product.stockOnHand <= 0}
            className="flex items-center gap-1 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            {qty > 0 ? `Add (${qty})` : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
