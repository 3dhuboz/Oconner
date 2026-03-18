import { useEffect, useRef, useCallback } from 'react';
import { locationsApi } from '../services/api';

interface GpsOptions {
  uid: string;
  /** Update interval in ms (default 30s) */
  intervalMs?: number;
  /** Only track when enabled */
  enabled?: boolean;
}

/**
 * Background GPS tracker for technicians.
 * Writes { lat, lng, accuracy, updatedAt } to Firestore every N seconds.
 * Runs via the browser Geolocation API — works on mobile Chrome/Safari.
 */
export function useGpsTracking({ uid, intervalMs = 30_000, enabled = true }: GpsOptions) {
  const watchId = useRef<number | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPos = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);

  const writeLocation = useCallback(async (lat: number, lng: number, accuracy: number) => {
    if (!uid) return;
    try {
      await locationsApi.upsert(uid, lat, lng, accuracy);
    } catch (err) {
      console.warn('[GPS] Failed to write location:', err);
    }
  }, [uid]);

  useEffect(() => {
    if (!enabled || !uid || !navigator.geolocation) return;

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastPos.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        writeLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => console.warn('[GPS] Initial position error:', err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch for continuous updates (battery-efficient on mobile)
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPos.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      },
      (err) => console.warn('[GPS] Watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 15000 }
    );

    // Write to Firestore on interval (not every GPS tick — saves writes)
    intervalId.current = setInterval(() => {
      if (lastPos.current) {
        writeLocation(lastPos.current.lat, lastPos.current.lng, lastPos.current.accuracy);
      }
    }, intervalMs);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (intervalId.current !== null) {
        clearInterval(intervalId.current);
      }
    };
  }, [uid, enabled, intervalMs, writeLocation]);

  return lastPos;
}
