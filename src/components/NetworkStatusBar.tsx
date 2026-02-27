import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useSyncStatus } from '../hooks/useOfflineSync';
import { forceSyncNow } from '../services/syncService';
import { useAuth } from '../context/AuthContext';

export function NetworkStatusBar() {
  const { isOnline, pendingCount, isSyncing, lastSyncAt } = useSyncStatus();
  const { user } = useAuth();

  // Don't show bar when online and nothing pending
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  // Tech users have their own indicator in TechLayout header — hide the bottom bar
  if (user?.role === 'user') return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium flex items-center justify-between gap-3 transition-colors ${
      isOnline
        ? 'bg-amber-50 text-amber-800 border-t border-amber-200'
        : 'bg-rose-50 text-rose-800 border-t border-rose-200'
    }`}>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Cloud className="w-4 h-4" />
        ) : (
          <CloudOff className="w-4 h-4" />
        )}
        <span>
          {!isOnline && 'Offline — changes saved locally'}
          {isOnline && isSyncing && 'Syncing changes...'}
          {isOnline && !isSyncing && pendingCount > 0 && `${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync`}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs">
            {pendingCount} queued
          </span>
        )}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <button
            onClick={() => forceSyncNow()}
            className="flex items-center gap-1 px-3 py-1 bg-white rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-xs font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            Sync Now
          </button>
        )}
        {isSyncing && (
          <RefreshCw className="w-4 h-4 animate-spin" />
        )}
      </div>
    </div>
  );
}
