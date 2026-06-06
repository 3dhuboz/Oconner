'use client';

const PRODUCTION_HOSTS = new Set(['oconnoragriculture.com.au', 'www.oconnoragriculture.com.au']);
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://oconner-api.steve-700.workers.dev';
const SKIP_PATH_RE = /^\/(api|admin|login|sign-in|sign-up|ticket|images)\b/i;

let lastEventKey = '';
let lastEventAt = 0;

function shouldTrack(path: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!PRODUCTION_HOSTS.has(window.location.hostname)) return false;
  if (!path.startsWith('/') || SKIP_PATH_RE.test(path)) return false;
  return true;
}

function postTrack(path: string, itemId?: string) {
  if (!shouldTrack(path)) return;

  const cleanPath = path.split('#')[0].split('?')[0] || '/';
  const key = `${cleanPath}:${itemId ?? ''}`;
  const now = Date.now();
  if (key === lastEventKey && now - lastEventAt < 5000) return;
  lastEventKey = key;
  lastEventAt = now;

  fetch(`${API_URL}/api/track/pageview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: cleanPath, itemId }),
    keepalive: true,
  }).catch(() => {});
}

export function trackPageview(path: string) {
  postTrack(path);
}

export function trackItemView(itemId: string, currentPath?: string) {
  const path = currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/shop');
  postTrack(path, itemId);
}
