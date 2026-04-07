'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { api } from '@butcher/shared';
import { useCart } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { Product } from '@butcher/shared';
import { formatCurrency, formatWeight } from '@butcher/shared';
import { ShoppingCart, Phone, X, Plus, Minus, Star, Package } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['All', 'packs', 'beef', 'share/bulk'];
const CATEGORY_MAP: Record<string, string> = { 'share/bulk': 'other' };

const BULK_IDS = ['prod-quarter-share', 'prod-half-share'];
const BULK_MIN_KG: Record<string, number> = { 'prod-sausages-mince': 5 };

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [wantSoupBones, setWantSoupBones] = useState(false);
  const [wantOffal, setWantOffal] = useState(false);
  const { addItem, removeItem, updateQuantity, items } = useCart();

  useEffect(() => {
    setLoading(true);
    api.products.list(true)
      .then((data) => setProducts(data as Product[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actualCategory = CATEGORY_MAP[category] ?? category;
  const filtered = category === 'All' ? products : products.filter((p) => p.category === actualCategory);
  const boxes = filtered.filter((p) => p.category === 'packs');
  const cuts = filtered.filter((p) => p.category !== 'packs' && p.category !== 'other');
  const other = filtered.filter((p) => p.category === 'other');

  const getItemQty = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    return item?.quantity ?? 0;
  };

  const getItemWeight = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    return item?.weight;
  };

  const renderCard = (product: Product) => (
    <ProductCard
      key={product.id}
      product={product}
      qty={getItemQty(product.id!)}
      onOpen={() => { setModal(product); setModalQty(1); setWantSoupBones(false); setWantOffal(false); }}
      onAdd={() => {
        const minKg = BULK_MIN_KG[product.id!] ?? 1;
        const weightG = product.isMeatPack ? undefined : minKg * 1000;
        addItem({
          productId: product.id!, productName: product.name, category: product.category,
          isMeatPack: product.isMeatPack, weight: weightG, quantity: 1,
          pricePerKg: product.pricePerKg, fixedPrice: product.fixedPrice,
          lineTotal: product.isMeatPack ? (product.fixedPrice ?? 0) : Math.round((product.pricePerKg ?? 0) * minKg),
        });
      }}
      onIncrement={() => {
        const w = getItemWeight(product.id!);
        updateQuantity(product.id!, getItemQty(product.id!) + 1, w);
      }}
      onDecrement={() => {
        const w = getItemWeight(product.id!);
        const currentQty = getItemQty(product.id!);
        if (currentQty <= 1) removeItem(product.id!, w);
        else updateQuantity(product.id!, currentQty - 1, w);
      }}
    />
  );

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
          <>
            {boxes.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Package className="h-6 w-6 text-brand" />
                  <h2 className="text-2xl font-bold text-gray-800" style={{fontFamily:'var(--font-heading)'}}>Boxes & Packs</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {boxes.map((product) => renderCard(product))}
                </div>
              </section>
            )}

            {cuts.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="h-6 w-6 text-brand" />
                  <h2 className="text-2xl font-bold text-gray-800" style={{fontFamily:'var(--font-heading)'}}>Individual Cuts</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cuts.map((product) => renderCard(product))}
                </div>
              </section>
            )}

            {other.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Phone className="h-6 w-6 text-brand" />
                  <h2 className="text-2xl font-bold text-gray-800" style={{fontFamily:'var(--font-heading)'}}>Bulk & Share Orders</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {other.map((product) => renderCard(product))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Glassmorphism Product Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(32px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: '0 8px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setModal(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Image */}
            {modal.imageUrl ? (
              <img src={modal.imageUrl} alt={modal.name} className="w-full h-52 object-cover" />
            ) : (
              <div className="w-full h-52 bg-brand/20 flex items-center justify-center text-7xl">🥩</div>
            )}

            {/* Content */}
            <div className="p-6" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
              {/* Badge + Name */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-brand uppercase tracking-wide bg-brand/10 px-2.5 py-1 rounded-full">
                  {modal.category}
                </span>
                {BULK_IDS.includes(modal.id ?? '') && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">Bulk order</span>
                )}
                {modal.stockOnHand <= 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">Out of stock</span>
                )}
              </div>
              <h2 className="text-2xl font-black text-brand mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{modal.name}</h2>

              {modal.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{modal.description}</p>
              )}
              {(modal as any).cookingTips && (
                <p className="text-sm text-brand/80 italic mb-4 flex items-start gap-1.5">
                  <span className="text-base">🍳</span> {(modal as any).cookingTips}
                </p>
              )}

              {/* Bulk share options */}
              {BULK_IDS.includes(modal.id ?? '') && (
                <div className="mb-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customise your share</p>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-700 group-hover:text-brand transition-colors">Include soup bones</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wantSoupBones}
                      onClick={() => setWantSoupBones((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${wantSoupBones ? 'bg-brand' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wantSoupBones ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-gray-700 group-hover:text-brand transition-colors">Include offal</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wantOffal}
                      onClick={() => setWantOffal((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${wantOffal ? 'bg-brand' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wantOffal ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                </div>
              )}

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Price</p>
                  {modal.isMeatPack ? (
                    <p className="text-3xl font-black text-brand">{formatCurrency(modal.fixedPrice ?? 0)}</p>
                  ) : (
                    <p className="text-3xl font-black text-brand">
                      {formatCurrency(modal.pricePerKg ?? 0)}<span className="text-base font-normal text-gray-400">/kg</span>
                    </p>
                  )}
                </div>

                {!BULK_IDS.includes(modal.id ?? '') && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1">
                      <button
                        onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-lg bg-white shadow flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-brand">{modalQty}</span>
                      <button
                        onClick={() => setModalQty((q) => q + 1)}
                        className="w-7 h-7 rounded-lg bg-white shadow flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      disabled={modal.stockOnHand <= 0}
                      onClick={() => {
                        const minKg = BULK_MIN_KG[modal.id ?? ''] ?? 1;
                        const weightG = modal.isMeatPack ? undefined : minKg * 1000;
                        for (let i = 0; i < modalQty; i++) {
                          addItem({
                            productId: modal.id!,
                            productName: modal.name,
                            category: modal.category,
                            isMeatPack: modal.isMeatPack,
                            weight: weightG,
                            quantity: 1,
                            pricePerKg: modal.pricePerKg,
                            fixedPrice: modal.fixedPrice,
                            lineTotal: modal.isMeatPack ? (modal.fixedPrice ?? 0) : Math.round((modal.pricePerKg ?? 0) * minKg),
                          });
                        }
                        setModal(null);
                      }}
                      className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand/30"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add {modalQty > 1 ? `(${modalQty}) ` : ''}to Cart
                    </button>
                  </div>
                )}

                {BULK_IDS.includes(modal.id ?? '') && (
                  <Link
                    href={`/contact?subject=${encodeURIComponent(`${modal.name} Enquiry`)}&message=${encodeURIComponent(`Hi, I'm interested in the ${modal.name}.\n\nSoup bones: ${wantSoupBones ? 'Yes please' : 'No thanks'}\nOffal: ${wantOffal ? 'Yes please' : 'No thanks'}\n\nPlease let me know the next available cutting date.`)}`}
                    className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand/90 transition-colors"
                  >
                    <Phone className="h-4 w-4" /> Enquire
                  </Link>
                )}
              </div>

              {!modal.isMeatPack && (BULK_MIN_KG[modal.id ?? ''] ?? 0) > 0 && (
                <p className="text-xs text-gray-400 mt-3">Minimum order: {BULK_MIN_KG[modal.id ?? '']} kg</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProductCard({
  product,
  qty,
  onAdd,
  onOpen,
  onIncrement,
  onDecrement,
}: {
  product: Product;
  qty: number;
  onAdd: () => void;
  onOpen: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const isBulkShare = BULK_IDS.includes(product.id ?? '');
  const minKg = BULK_MIN_KG[product.id ?? ''];
  const outOfStock = !isBulkShare && product.stockOnHand <= 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col group ${outOfStock ? 'opacity-75' : ''}`}>
      <button onClick={onOpen} className="relative overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? 'grayscale-[40%]' : ''}`} />
        ) : (
          <div className={`w-full h-48 bg-brand-light flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-300 ${outOfStock ? 'grayscale-[40%]' : ''}`}>🥩</div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-xl shadow-lg border border-gray-200 -rotate-6">
              <p className="text-sm font-bold text-gray-700 tracking-wide">Sold Out</p>
              <p className="text-[10px] text-gray-400 text-center">Check back soon</p>
            </div>
          </div>
        )}
        {!outOfStock && (
          <div className="absolute inset-0 bg-brand/0 group-hover:bg-brand/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-brand text-xs font-bold px-3 py-1.5 rounded-full shadow">View Details</span>
          </div>
        )}
      </button>
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
        <button onClick={onOpen} className="text-left">
          <h3 className="font-semibold text-lg mb-1 hover:text-brand transition-colors">{product.name}</h3>
        </button>
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
            <div className={`flex items-center gap-0 rounded-lg overflow-hidden border-2 ${qty > 0 ? 'border-brand' : 'border-gray-200'} ${outOfStock ? 'opacity-40 pointer-events-none' : ''}`}>
              <button
                onClick={(e) => { e.stopPropagation(); onDecrement(); }}
                disabled={qty <= 0}
                className="flex items-center justify-center w-9 h-9 bg-gray-50 text-gray-500 hover:bg-brand/10 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className={`w-9 h-9 flex items-center justify-center text-sm font-bold bg-white ${qty > 0 ? 'text-brand' : 'text-gray-400'}`}>
                {qty}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); qty === 0 ? onAdd() : onIncrement(); }}
                className="flex items-center justify-center w-9 h-9 bg-brand text-white hover:bg-brand-mid transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
