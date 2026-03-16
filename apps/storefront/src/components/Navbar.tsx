'use client';

import Link from 'next/link';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { cn } from '@butcher/ui';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = useCart((s) => s.itemCount());

  return (
    <nav className="bg-brand text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="bg-white rounded px-2 py-1 flex flex-col items-center leading-none">
            <span className="text-brand font-black text-xs tracking-widest" style={{fontFamily:'var(--font-heading)'}}>
              OC.
            </span>
          </span>
          <span className="font-black text-base tracking-wider uppercase" style={{fontFamily:'var(--font-heading)'}}>
            O'Connor
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/shop" className="hover:text-brand-light transition-colors">Shop</Link>
          <Link href="/delivery-days" className="hover:text-brand-light transition-colors">Delivery Days</Link>
          <Link href="/account" className="hover:text-brand-light transition-colors flex items-center gap-1">
            <User className="h-4 w-4" /> Account
          </Link>
          <Link href="/cart" className="relative hover:text-brand-light transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-brand-mid px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
          <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link href="/delivery-days" onClick={() => setMenuOpen(false)}>Delivery Days</Link>
          <Link href="/account" onClick={() => setMenuOpen(false)}>Account</Link>
          <Link href="/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Cart
            {itemCount > 0 && <span className="bg-accent text-white text-xs rounded-full px-1.5">{itemCount}</span>}
          </Link>
        </div>
      )}
    </nav>
  );
}
