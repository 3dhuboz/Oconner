import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Calendar, User, Zap, LogOut } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';

interface TechLayoutProps {
  children: React.ReactNode;
}

export function TechLayout({ children }: TechLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const tabs = [
    { name: 'My Jobs', path: '/', icon: ClipboardList },
    { name: 'Today', path: '/today', icon: Calendar },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top header — compact, branded */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 safe-top">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <Zap className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">Wirez R Us</span>
            <span className="text-[10px] text-slate-400 ml-2">Tech Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{user.name}</span>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content — scrollable, fills space above bottom nav */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom tab bar — mobile native feel */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 pb-safe z-40">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);

            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors min-w-[64px]",
                  isActive
                    ? "text-amber-600"
                    : "text-slate-400"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className={cn("text-[10px] font-semibold", isActive && "text-amber-600")}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
