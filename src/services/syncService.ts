/**
 * Background sync service.
 * Flushes the offline sync queue to the Worker API when online.
 */

import { syncQueue, offlineMeta } from './offlineDb';
import type { SyncQueueItem } from './offlineDb';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MAX_RETRIES = 10;
const SYNC_INTERVAL_MS = 5000;

let cronHandle: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

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
  } catch { /* IndexedDB edge case */ }
}

async function processItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const path = `${API_BASE}/${item.collection}${item.operation === 'delete' ? `/${item.docId}` : item.operation === 'update' ? `/${item.docId}` : ''}`;
    const method = item.operation === 'delete' ? 'DELETE' : item.operation === 'update' ? 'PATCH' : 'POST';

    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: item.operation !== 'delete' ? JSON.stringify({ id: item.docId, ...item.data }) : undefined,
    });

    return res.ok;
  } catch (error: any) {
    console.warn(`[Sync] Failed to process ${item.id}:`, error.message);
    return false;
  }
}

async function flushQueue() {
  if (isSyncing || !navigator.onLine) return;

  isSyncing = true;
  currentStatus.isSyncing = true;
  notifyListeners();

  try {
    const items = await syncQueue.getAll();
    items.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of items) {
      if (!navigator.onLine) break;

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

export function startSyncCron() {
  if (cronHandle) return;

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  currentStatus.isOnline = navigator.onLine;
  updatePendingCount().then(notifyListeners);

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

export async function forceSyncNow() {
  if (!navigator.onLine) {
    console.warn('[Sync] Cannot force sync — offline');
    return;
  }
  await flushQueue();
}
