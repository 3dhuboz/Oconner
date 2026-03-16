import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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
        const user = auth.currentUser;
        if (!user || !sessionId) return;
        try {
          await updateDoc(doc(db, 'driverSessions', sessionId), {
            lastLat: pos.coords.latitude,
            lastLng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            gpsStatus: 'active',
            updatedAt: Timestamp.now(),
          });
        } catch {
          // best-effort — don't crash driver app on Firestore write fail
        }
      },
      async (err) => {
        const newStatus: GPSStatus = err.code === 1 ? 'permission_denied' : 'unavailable';
        setStatus(newStatus);
        setError(err.message);
        const user = auth.currentUser;
        if (user && sessionId) {
          try {
            await updateDoc(doc(db, 'driverSessions', sessionId), {
              gpsStatus: newStatus,
              gpsError: err.message,
              updatedAt: Timestamp.now(),
            });
          } catch { /* best-effort */ }
        }
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
