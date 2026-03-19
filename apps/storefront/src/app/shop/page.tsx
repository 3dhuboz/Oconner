'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { api } from '@butcher/shared';
import { useCart } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { Product } from '@butcher/shared';
import { formatCurrency, formatWeight } from '@butcher/shared';
import { ShoppingCart, Phone } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['All', 'packs', 'beef', 'lamb', 'pork', 'chicken', 'other'];

const BULK_IDS = ['prod-quarter-share', 'prod-half-share'];
const BULK_MIN_KG: Record<string, number> = { 'prod-sausages-mince': 5 };

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
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 capitalize ${
                category === cat
                  ? 'bg-brand text-white shadow-lg shadow-brand/30 scale-110 -translate-y-0.5'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
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
                onAdd={() => {
                  const minKg = BULK_MIN_KG[product.id!] ?? 1;
                  const weightG = product.isMeatPack ? undefined : minKg * 1000;
                  addItem({
                    productId: product.id!,
                    productName: product.name,
                    category: product.category,
                    isMeatPack: product.isMeatPack,
                    weight: weightG,
                    quantity: 1,
                    pricePerKg: product.pricePerKg,
                    fixedPrice: product.fixedPrice,
                    lineTotal: product.isMeatPack ? (product.fixedPrice ?? 0) : Math.round((product.pricePerKg ?? 0) * minKg),
                  });
                }}
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
  const isBulkShare = BULK_IDS.includes(product.id ?? '');
  const minKg = BULK_MIN_KG[product.id ?? ''];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
      ) : (
        <div className="w-full h-48 bg-brand-light flex items-center justify-center text-6xl">🥩</div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs font-medium text-brand uppercase tracking-wide bg-brand-light px-2 py-0.5 rounded-full">
            {product.category}
          </span>
          {isBulkShare && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Bulk order
            </span>
          )}
          {minKg && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Min {minKg} kg
            </span>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-3 flex-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            {product.isMeatPack ? (
              <span className="text-xl font-bold text-brand">{formatCurrency(product.fixedPrice ?? 0)}</span>
            ) : (
              <span className="text-xl font-bold text-brand">
                {formatCurrency(product.pricePerKg ?? 0)}
                <span className="text-sm font-normal text-gray-500">/kg</span>
              </span>
            )}
            {!isBulkShare && product.stockOnHand > 0 && product.stockOnHand <= (product.minThreshold ?? 0) + 2 && (
              <p className="text-xs text-accent font-medium">Low stock</p>
            )}
          </div>
          {isBulkShare ? (
            <Link
              href="/contact"
              className="flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
            >
              <Phone className="h-4 w-4" /> Enquire
            </Link>
          ) : (
            <button
              onClick={onAdd}
              disabled={product.stockOnHand <= 0}
              className="flex items-center gap-1 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              {qty > 0 ? `Add (${qty})` : 'Add'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
