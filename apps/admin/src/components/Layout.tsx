import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import {
  LayoutDashboard, ShoppingBag, Package, CalendarDays,
  BarChart2, Users, Map, FileText, LogOut, Menu, X, Settings, Sparkles,
  ExternalLink, Store, Truck, UserCog, RefreshCcw, ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

const STOREFRONT_URL = (import.meta as any).env?.VITE_STOREFRONT_URL ?? 'https://butcher-storefront.pages.dev';
const DRIVER_URL = (import.meta as any).env?.VITE_DRIVER_URL ?? 'https://butcher-driver.pages.dev';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/delivery-days', icon: CalendarDays, label: 'Delivery Days' },
  { to: '/stock', icon: BarChart2, label: 'Stock' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/drivers', icon: UserCog, label: 'Drivers' },
  { to: '/staff', icon: ShieldCheck, label: 'Staff & Admins' },
  { to: '/subscriptions', icon: RefreshCcw, label: 'Subscriptions' },
  { to: '/map', icon: Map, label: 'Driver Map' },
  { to: '/audit', icon: FileText, label: 'Audit Log' },
  { to: '/settings', icon: Settings, label: 'Site Settings' },
  { to: '/social-hub', icon: Sparkles, label: 'Social AI Studio' },
];

export default function Layout() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebar = (
    <aside className="flex flex-col h-full bg-brand text-white w-64 flex-shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="bg-white rounded px-1.5 py-0.5">
            <span className="text-brand font-black text-xs tracking-widest">OC.</span>
          </span>
          <h1 className="font-black text-sm tracking-wider uppercase">O'Connor</h1>
        </div>
        <p className="text-xs text-white/60">Agriculture — Admin</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-1">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors w-full px-2 py-1.5"
        >
          <Store className="h-4 w-4" />
          View Storefront
          <ExternalLink className="h-3 w-3 ml-auto" />
        </a>
        <a
          href={DRIVER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors w-full px-2 py-1.5"
        >
          <Truck className="h-4 w-4" />
          Driver App
          <ExternalLink className="h-3 w-3 ml-auto" />
        </a>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors w-full px-2 py-1.5 mt-2 pt-2 border-t border-white/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">{sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="flex-shrink-0">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden bg-brand text-white px-4 h-14 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1"><Menu className="h-5 w-5" /></button>
          <span className="font-semibold">Admin</span>
          <div className="w-7" />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
