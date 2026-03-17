'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell, Smartphone, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://butcher-api.oconner.com.au';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function db64u(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

export default function InstallPrompt() {
  const { isSignedIn, getToken } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('pwa-dismissed')) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isSignedIn) setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, [isSignedIn]);

  // After sign-in, prompt for notification permission
  useEffect(() => {
    if (!isSignedIn) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (localStorage.getItem('push-dismissed') || localStorage.getItem('push-subscribed')) return;
    if (Notification.permission === 'denied') return;

    if (Notification.permission === 'granted') {
      subscribeToPush();
      return;
    }

    const timer = setTimeout(() => setShowNotif(true), 4000);
    return () => clearTimeout(timer);
  }, [isSignedIn]);

  const subscribeToPush = async () => {
    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: db64u(VAPID_PUBLIC_KEY),
      });
      const token = await getToken();
      await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      });
      localStorage.setItem('push-subscribed', '1');
    } catch {
      // Silently fail — user may have blocked or the device doesn't support push
    }
  };

  const requestNotification = async () => {
    setShowNotif(false);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPush();
    } else {
      localStorage.setItem('push-dismissed', '1');
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShowInstall(false);
    setDeferredPrompt(null);
    localStorage.setItem('pwa-dismissed', '1');
  };

  const dismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-dismissed', '1');
  };

  const dismissNotif = () => {
    setShowNotif(false);
    localStorage.setItem('push-dismissed', '1');
  };

  if (!showInstall && !showNotif) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-2 duration-300">
      {showNotif && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">Stay ahead of your delivery</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                We'll send you a heads-up the day before your order arrives — straight to your phone, no SMS charges.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={requestNotification}
                  className="flex-1 bg-brand text-white text-xs py-2 px-3 rounded-lg font-medium hover:bg-brand-mid transition-colors"
                >
                  Allow notifications
                </button>
                <button
                  onClick={dismissNotif}
                  className="flex-1 border border-gray-200 text-xs py-2 px-3 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={dismissNotif} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showInstall && !showNotif && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">Add to Home Screen</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Install the O'Connor app for quick access, order tracking, and delivery notifications.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={installApp}
                  className="flex-1 bg-brand text-white text-xs py-2 px-3 rounded-lg font-medium hover:bg-brand-mid transition-colors"
                >
                  Install app
                </button>
                <button
                  onClick={dismissInstall}
                  className="flex-1 border border-gray-200 text-xs py-2 px-3 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={dismissInstall} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
