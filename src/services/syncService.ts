/**
 * Background sync service.
 * Runs a cron interval that checks for network connectivity and
 * flushes the offline sync queue to the REST API when online.
 * Also provides a React hook for network status.
 */

import { jobsApi, electriciansApi, partsApi } from './api';
import { syncQueue, offlineMeta } from './offlineDb';
import type { SyncQueueItem } from './offlineDb';

const MAX_RETRIES = 10;
const SYNC_INTERVAL_MS = 5000; // check every 5 seconds

let cronHandle: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// Listeners for sync status changes
type SyncStatusListener = (status: SyncStatus) => void;
const listeners: Set<SyncStatusListener> = new Set();

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}

let currentStatus: SyncStatus = {
  isOnline: navigator.onLine,
  pendingCount: 0,
  lastSyncAt: null,
  isSyncing: false,
};

function notifyListeners() {
  listeners.forEach(fn => fn({ ...currentStatus }));
}

export function subscribeSyncStatus(fn: SyncStatusListener): () => void {
  listeners.add(fn);
  fn({ ...currentStatus });
  return () => { listeners.delete(fn); };
}

async function updatePendingCount() {
  try {
    const items = await syncQueue.getAll();
    currentStatus.pendingCount = items.length;
  } catch {
    // IndexedDB might fail in rare edge cases
  }
}

// ─── Process a single queue item ────────────────────────────────
async function processItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const apiMap: Record<string, any> = { jobs: jobsApi, electricians: electriciansApi, partsCatalog: partsApi };
    const api = apiMap[item.collection];
    if (!api) { console.warn(`[Sync] Unknown collection: ${item.collection}`); return true; }

    switch (item.operation) {
      case 'set':
        await api.create({ ...item.data, id: item.docId });
        break;
      case 'update':
        await api.update(item.docId, item.data || {});
        break;
      case 'delete':
        await api.delete(item.docId);
        break;
    }
    return true;
  } catch (error: any) {
    console.warn(`[Sync] Failed to process ${item.id}:`, error.message);
    return false;
  }
}

// ─── Flush queue ────────────────────────────────────────────────
async function flushQueue() {
  if (isSyncing || !navigator.onLine) return;

  isSyncing = true;
  currentStatus.isSyncing = true;
  notifyListeners();

  try {
    const items = await syncQueue.getAll();
    // Sort by timestamp ascending (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of items) {
      if (!navigator.onLine) break; // stop if we lost connection mid-sync

      const success = await processItem(item);
      if (success) {
        await syncQueue.remove(item.id);
      } else {
        const newRetries = item.retries + 1;
        if (newRetries >= MAX_RETRIES) {
          console.error(`[Sync] Dropping item ${item.id} after ${MAX_RETRIES} retries`);
          await syncQueue.remove(item.id);
        } else {
          await syncQueue.updateRetries(item.id, newRetries);
        }
      }
    }

    await offlineMeta.set('lastSyncAt', new Date().toISOString());
    currentStatus.lastSyncAt = new Date().toISOString();
  } catch (error) {
    console.error('[Sync] Queue flush error:', error);
  } finally {
    isSyncing = false;
    currentStatus.isSyncing = false;
    await updatePendingCount();
    notifyListeners();
  }
}

// ─── Cron lifecycle ─────────────────────────────────────────────
export function startSyncCron() {
  if (cronHandle) return; // already running

  // Network event listeners
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial status
  currentStatus.isOnline = navigator.onLine;
  updatePendingCount().then(notifyListeners);

  // Start interval
  cronHandle = setInterval(async () => {
    currentStatus.isOnline = navigator.onLine;
    await updatePendingCount();
    notifyListeners();

    if (navigator.onLine && currentStatus.pendingCount > 0) {
      await flushQueue();
    }
  }, SYNC_INTERVAL_MS);

  console.log('[Sync] Background sync cron started');
}

export function stopSyncCron() {
  if (cronHandle) {
    clearInterval(cronHandle);
    cronHandle = null;
  }
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  console.log('[Sync] Background sync cron stopped');
}

function handleOnline() {
  console.log('[Sync] Network restored — flushing queue');
  currentStatus.isOnline = true;
  notifyListeners();
  flushQueue();
}

function handleOffline() {
  console.log('[Sync] Network lost — writes will be queued locally');
  currentStatus.isOnline = false;
  notifyListeners();
}

// ─── Manual trigger ─────────────────────────────────────────────
export async function forceSyncNow() {
  if (!navigator.onLine) {
    console.warn('[Sync] Cannot force sync — offline');
    return;
  }
  await flushQueue();
}
