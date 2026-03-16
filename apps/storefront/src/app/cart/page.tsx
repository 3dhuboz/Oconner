'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatCurrency } from '@butcher/shared';

const GST_RATE = 0.1;
const DELIVERY_FEE = 1500;

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const subtotal = total();
  const gst = Math.round(subtotal * GST_RATE);
  const grandTotal = subtotal + DELIVERY_FEE;

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-8">Add some premium cuts to get started.</p>
          <Link href="/shop" className="bg-brand text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-mid transition-colors">
            Browse Products
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-brand mb-8">Your Cart</h1>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.weight}`} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-light rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥩</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.productName}</p>
                  <p className="text-sm text-gray-500">
                    {item.isMeatPack ? `${item.quantity} pack` : `${item.weight}g`}
                    {' · '}{formatCurrency(item.lineTotal)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, (item.quantity ?? 1) - 1, item.weight)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 font-bold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity ?? 1}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, (item.quantity ?? 1) + 1, item.weight)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId, item.weight)}
                  className="text-gray-400 hover:text-accent transition-colors ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-6 h-fit">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span><span>{formatCurrency(DELIVERY_FEE)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>GST (inc.)</span><span>{formatCurrency(gst)}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span><span className="text-brand">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="w-full bg-brand text-white py-3 rounded-lg font-medium hover:bg-brand-mid transition-colors text-center block"
            >
              Proceed to Checkout
            </Link>
            <Link href="/shop" className="w-full text-center text-sm text-gray-500 hover:text-brand mt-3 block transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
