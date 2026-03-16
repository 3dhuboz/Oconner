import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../lib/firebase';

interface GPSOptions {
  deliveryDayId: string;
  enabled: boolean;
}

export function useGPS({ deliveryDayId, enabled }: GPSOptions) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendPing = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const token = await user.getIdToken();
          await fetch(import.meta.env.VITE_GPS_RELAY_URL + '/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              deliveryDayId,
            }),
          });
        } catch {
          // Silent fail — GPS pings are best-effort
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [deliveryDayId]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTracking(false);
      return;
    }
    setTracking(true);
    sendPing();
    intervalRef.current = setInterval(sendPing, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, sendPing]);

  return { tracking, error };
}
