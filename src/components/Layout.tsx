import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Calendar, Settings, Zap, Users, Shield, CreditCard, LogOut, Headphones, ExternalLink, MapPin, Menu, X, Package } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['dev', 'admin', 'user'] },
    { name: 'Job Board', path: '/jobs', icon: ClipboardList, roles: ['dev', 'admin', 'user'] },
    { name: 'Calendar', path: '/calendar', icon: Calendar, roles: ['dev', 'admin', 'user'] },
    { name: 'Live Map', path: '/map', icon: MapPin, roles: ['dev', 'admin'] },
    { name: 'Team', path: '/team', icon: Users, roles: ['dev', 'admin'] },
    { name: 'Parts Catalog', path: '/parts', icon: Package, roles: ['dev', 'admin'] },
    { name: 'Integrations', path: '/integrations', icon: Settings, roles: ['dev', 'admin'] },
    { name: 'Billing', path: '/billing', icon: CreditCard, roles: ['dev', 'admin'] },
    { name: 'Dev Console', path: '/admin', icon: Shield, roles: ['dev'] },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, slide-in when open */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Wirez R Us</span>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm sm:text-base">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 bg-slate-800/50 rounded-xl mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name}</span>
              <span className="text-xs text-slate-500 truncate">{user.role}</span>
            </div>
          </div>
          
          <a
            href="https://www.facebook.com/pennywiseitoz"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium mb-1"
          >
            <Headphones className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Support by Penny Wise I.T</span>
            <ExternalLink className="w-3 h-3 ml-auto shrink-0" />
          </a>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger menu — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-800 truncate">
              {navItems.find(i => i.path === location.pathname)?.name || 'Wirez R Us CRM'}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user.role !== 'user' && (
              <button className="hidden sm:block px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                + New Work Order
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
