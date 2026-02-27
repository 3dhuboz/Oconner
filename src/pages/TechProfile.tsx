import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Mail, Shield, Zap, Headphones, ExternalLink } from 'lucide-react';

export function TechProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-xl font-bold text-slate-900 shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="text-white min-w-0">
            <h2 className="text-lg font-bold truncate">{user.name}</h2>
            <p className="text-sm text-slate-400">Field Technician</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-medium text-slate-700">{user.email}</p>
            </div>
          </div>
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Role</p>
              <p className="text-sm font-medium text-slate-700 capitalize">{user.role === 'user' ? 'Technician' : user.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* App info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <Zap className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Wirez R Us</p>
            <p className="text-[10px] text-slate-400">Field Management System</p>
          </div>
        </div>
        <a
          href="https://www.facebook.com/pennywiseitoz"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-amber-600 transition-colors"
        >
          <Headphones className="w-3.5 h-3.5" /> Support by Penny Wise I.T
          <ExternalLink className="w-3 h-3 ml-auto" />
        </a>
      </div>

      {/* Sign out */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-semibold text-sm hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
