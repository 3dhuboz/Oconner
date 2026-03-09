import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Mail, Shield, Zap, Headphones, ExternalLink, Download, Smartphone, Share2 } from 'lucide-react';

export function TechProfile() {
  const { user, logout } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Capture the beforeinstallprompt event for "Add to Home Screen"
  useEffect(() => {
    // Check if already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (!user) return null;

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#F5A623] flex items-center justify-center text-xl font-bold text-slate-900 shrink-0">
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

      {/* Add to Home Screen */}
      {!isInstalled && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Add to Home Screen</p>
              <p className="text-[11px] text-slate-400">Launch like a native app</p>
            </div>
          </div>

          {deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> Install App
            </button>
          ) : isIOS ? (
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2">
              <p className="text-xs text-slate-600 font-medium">On your iPhone/iPad:</p>
              <ol className="text-xs text-slate-500 space-y-1.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  Tap the <Share2 className="w-3.5 h-3.5 inline text-blue-500 mx-0.5" /> Share button at the bottom of Safari
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  Tap <strong>"Add"</strong> to confirm
                </li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2">
              <p className="text-xs text-slate-600 font-medium">On your Android:</p>
              <ol className="text-xs text-slate-500 space-y-1.5 pl-1">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  Tap the <strong>⋮</strong> menu in Chrome (top-right)
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>
                </li>
              </ol>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Use your browser's menu to add this app to your home screen for quick access.</p>
          )}
        </div>
      )}

      {isInstalled && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">App Installed</p>
            <p className="text-xs text-emerald-600">You can launch Wirez R Us from your home screen</p>
          </div>
        </div>
      )}

      {/* App info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="bg-[#F5A623] p-1.5 rounded-lg">
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
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#E8862A] transition-colors"
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
