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

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      clearStaleTimer();
    };
  }, [enabled, sessionId]);

  return { status, error, tracking: status === 'active' || status === 'stale' };
}
