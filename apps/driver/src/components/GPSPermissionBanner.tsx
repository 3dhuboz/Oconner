import { useEffect, useState } from 'react';
import { MapPin, X, ChevronRight } from 'lucide-react';

/**
 * App-level banner that appears on every page when the browser's geolocation
 * permission is set to `denied`, which silently kills the customer-facing live
 * map. Tapping the banner opens instructions for Chrome on Android (the most
 * common device for O'Connor drivers).
 *
 * Uses the Permissions API (`navigator.permissions.query({ name: 'geolocation' })`)
 * so we can detect the denied state without needing to run the GPS watcher first.
 * If the Permissions API is missing (older browsers) we fall back to probing
 * `getCurrentPosition` — same detection, noisier.
 */
export default function GPSPermissionBanner() {
  const [state, setState] = useState<PermissionState | 'unsupported'>('prompt');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!navigator.geolocation) {
        if (!cancelled) setState('unsupported');
        return;
      }
      // Preferred: Permissions API
      if ((navigator as any).permissions?.query) {
        try {
          const result = await (navigator as any).permissions.query({ name: 'geolocation' }) as PermissionStatus;
          if (cancelled) return;
          setState(result.state);
          result.onchange = () => setState(result.state);
          return;
        } catch {
          // fall through to probe
        }
      }
      // Fallback: try getCurrentPosition once to get the permission outcome
      navigator.geolocation.getCurrentPosition(
        () => !cancelled && setState('granted'),
        (err) => !cancelled && setState(err.code === 1 ? 'denied' : 'prompt'),
        { timeout: 5000 },
      );
    }

    check();
    // Re-check when the tab becomes visible (user may have changed permission in another tab)
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (state !== 'denied') return null;

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="w-full bg-red-600 text-white px-4 py-2.5 flex items-center gap-2 text-sm font-semibold shadow-md"
      >
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">GPS blocked — customers can't see you on the map</span>
        <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded">Fix it</span>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Turn on location</h2>
              <button onClick={() => setShowHelp(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm text-gray-700">
              <p>
                Location is blocked for <strong>driver.oconnoragriculture.com.au</strong>.
                Without it, the map on customers' tracking links won't show where you are.
              </p>
              <div className="bg-gray-50 border rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">On Chrome (Android):</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Tap the <strong>padlock icon</strong> in the address bar (left of the URL).</li>
                  <li>Tap <strong>Permissions</strong>.</li>
                  <li>Tap <strong>Location</strong> → select <strong>Allow</strong>.</li>
                  <li>Reload this page.</li>
                </ol>
              </div>
              <div className="bg-gray-50 border rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">On Safari (iPhone):</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Open the <strong>Settings</strong> app.</li>
                  <li>Scroll down to <strong>Safari</strong> → <strong>Location</strong>.</li>
                  <li>Select <strong>Allow</strong>.</li>
                  <li>Come back here and reload the page.</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500">
                If your phone's <strong>overall</strong> location setting is off (Settings → Location), no app can get GPS at all.
                Check that first.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-brand text-white font-bold py-3 rounded-xl"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
