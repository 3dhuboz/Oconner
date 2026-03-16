'use client';

import Link from 'next/link';
import { ShoppingCart, User, Menu, X, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useCart } from '@/lib/cart';
import { cn } from '@butcher/ui';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://butcher-admin.pages.dev';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const itemCount = useCart((s) => s.itemCount());

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setIsAdmin(false); return; }
      const snap = await getDoc(doc(db, 'users', u.uid));
      setIsAdmin(snap.exists() && snap.data()?.role === 'admin');
    });
  }, []);

  return (
    <nav className="bg-brand text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src="/oc-logo.jpg"
            alt="O'Connor Agriculture"
            className="h-10 w-10 rounded object-cover flex-shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
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
          {isAdmin && (
            <a
              href={ADMIN_URL}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-white text-sm font-semibold transition-colors border border-white/20"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Admin
            </a>
          )}
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
          {isAdmin && (
            <a href={ADMIN_URL} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 font-semibold">
              <LayoutDashboard className="h-4 w-4" /> Admin Panel
            </a>
          )}
          <Link href="/cart" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Cart
            {itemCount > 0 && <span className="bg-accent text-white text-xs rounded-full px-1.5">{itemCount}</span>}
          </Link>
        </div>
      )}
    </nav>
  );
}
