/**
 * React hooks for offline-first data and sync status.
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeSyncStatus, SyncStatus } from '../services/syncService';
import { offlineJobs, offlineElectricians, syncQueue } from '../services/offlineDb';

// ─── Sync Status Hook ───────────────────────────────────────────
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSyncAt: null,
    isSyncing: false,
  });

  useEffect(() => {
    const unsub = subscribeSyncStatus(setStatus);
    return unsub;
  }, []);

  return status;
}

// ─── Offline-aware job update ───────────────────────────────────
export function useOfflineJobUpdate() {
  /**
   * Updates a job. If online + Firestore is available, updates normally.
   * If offline, writes to IndexedDB and queues for sync.
   */
  const updateJobOffline = useCallback(async (
    id: string,
    updates: Record<string, any>,
    firestoreUpdate: (id: string, updates: Record<string, any>) => Promise<void>
  ) => {
    // Always write to local IndexedDB first
    const allJobs = await offlineJobs.getAll();
    const existing = allJobs.find((j: any) => j.id === id);
    if (existing) {
      await offlineJobs.put({ ...existing, ...updates });
    }

    if (navigator.onLine) {
      try {
        await firestoreUpdate(id, updates);
        return;
      } catch (error) {
        console.warn('[Offline] Firestore update failed, queuing for sync:', error);
      }
    }

    // Queue for background sync
    await syncQueue.add({
      collection: 'jobs',
      docId: id,
      operation: 'update',
      data: updates,
    });
  }, []);

  return { updateJobOffline };
}
