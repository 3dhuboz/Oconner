import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Calendar, User, Zap, LogOut, Wifi, WifiOff, CloudOff, RefreshCw, MapPin } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';
import { useSyncStatus } from '../hooks/useOfflineSync';
import { forceSyncNow } from '../services/syncService';

interface TechLayoutProps {
  children: React.ReactNode;
}

export function TechLayout({ children }: TechLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing } = useSyncStatus();

  if (!user) return null;

  const tabs = [
    { name: 'My Jobs', path: '/', icon: ClipboardList },
    { name: 'Today', path: '/today', icon: Calendar },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top header — compact, branded */}
      <header className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center justify-between shrink-0 safe-top">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Wirez R Us"
            className="w-10 h-10 object-contain"
            style={{ filter: 'drop-shadow(0 0 8px #F5A623) drop-shadow(0 0 3px #F5A623)' }}
          />
          <div>
            <span className="text-sm font-bold tracking-tight">Wirez R Us</span>
            <span className="text-[10px] text-slate-400 ml-2">Tech Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <button
            onClick={() => { if (isOnline && pendingCount > 0) forceSyncNow(); }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors",
              isOnline
                ? pendingCount > 0
                  ? "bg-[#F5A623]/20 text-[#F5A623]"
                  : "bg-emerald-500/20 text-emerald-400"
                : "bg-rose-500/20 text-rose-400"
            )}
          >
            {isSyncing ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing</>
            ) : !isOnline ? (
              <><WifiOff className="w-3 h-3" /> Offline</>
            ) : pendingCount > 0 ? (
              <><CloudOff className="w-3 h-3" /> {pendingCount} pending</>
            ) : (
              <><Wifi className="w-3 h-3" /> Online</>
            )}
          </button>
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
                    ? "text-[#E8862A]"
                    : "text-slate-400"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className={cn("text-[10px] font-semibold", isActive && "text-[#E8862A]")}>
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
