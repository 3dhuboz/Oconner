import { useState, useEffect, useRef } from 'react';
import { api } from '@butcher/shared';

export type GPSStatus = 'idle' | 'active' | 'stale' | 'unavailable' | 'permission_denied' | 'unsupported';

interface GPSOptions {
  sessionId: string | null;
  enabled: boolean;
}

export function useGPS({ sessionId, enabled }: GPSOptions) {
  const [status, setStatus] = useState<GPSStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStaleTimer = () => {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
  };

  const resetStaleTimer = () => {
    clearStaleTimer();
    staleTimerRef.current = setTimeout(() => setStatus('stale'), 90_000); // stale after 90s
  };

  useEffect(() => {
    if (!enabled || !sessionId) {
      if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
      clearStaleTimer();
      setStatus('idle');
      return;
    }

    if (!navigator.geolocation) {
      setStatus('unsupported');
      setError('GPS not supported on this device.');
      return;
    }

    // Create the position watch. Isolated so we can tear it down + recreate it
    // when the user flips permission granted after a prior denial (the existing
    // watch doesn't wake up on its own).
    const startWatch = () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          setStatus('active');
          setError(null);
          resetStaleTimer();
          if (!sessionId) return;
          try {
            await api.drivers.ping(sessionId, pos.coords.latitude, pos.coords.longitude);
          } catch {
            // best-effort — don't crash driver app on ping fail
          }
        },
        (err) => {
          const newStatus: GPSStatus = err.code === 1 ? 'permission_denied' : 'unavailable';
          setStatus(newStatus);
          setError(err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );
    };

    startWatch();

    // Self-recovery: watch the Permissions API for transitions to 'granted'.
    // If the user enables location permission mid-run (after we've already
    // errored out on a denied watch), tear down and rebuild the watch so GPS
    // actually starts flowing without requiring a page reload or End Day cycle.
    let permStatus: PermissionStatus | null = null;
    let permChangeHandler: (() => void) | null = null;
    if ((navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: 'geolocation' })
        .then((p: PermissionStatus) => {
          permStatus = p;
          permChangeHandler = () => {
            if (p.state === 'granted') startWatch();
          };
          p.addEventListener('change', permChangeHandler);
        })
        .catch(() => {});
    }

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (permStatus && permChangeHandler) permStatus.removeEventListener('change', permChangeHandler);
      clearStaleTimer();
    };
  }, [enabled, sessionId]);

  return { status, error, tracking: status === 'active' || status === 'stale' };
}
