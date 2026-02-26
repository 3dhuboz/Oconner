import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Calendar, Settings, Zap, Users, Shield, CreditCard, LogOut } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['dev', 'admin', 'user'] },
    { name: 'Job Board', path: '/jobs', icon: ClipboardList, roles: ['dev', 'admin', 'user'] },
    { name: 'Calendar', path: '/calendar', icon: Calendar, roles: ['dev', 'admin', 'user'] },
    { name: 'Team', path: '/team', icon: Users, roles: ['dev', 'admin'] },
    { name: 'Integrations', path: '/integrations', icon: Settings, roles: ['dev', 'admin'] },
    { name: 'Billing', path: '/billing', icon: CreditCard, roles: ['dev', 'admin'] },
    { name: 'Dev Console', path: '/admin', icon: Shield, roles: ['dev'] },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg">
            <Zap className="w-6 h-6 text-slate-900" />
          </div>
          <span className="text-xl font-bold tracking-tight">Wirez R Us</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name}</span>
              <span className="text-xs text-slate-500 truncate">{user.role}</span>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-semibold text-slate-800">
            {navItems.find(i => i.path === location.pathname)?.name || 'Wirez R Us CRM'}
          </h1>
          <div className="flex items-center gap-4">
            {user.role !== 'user' && (
              <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                + New Work Order
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
