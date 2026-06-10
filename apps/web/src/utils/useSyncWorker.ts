// ═══════════════════════════════════════════════════════════
// useSyncWorker — Background sync queue processor
// Drains the mobile store sync queue when the device comes online.
// Retries failed items with exponential backoff (max 3 attempts).
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useMobileStore } from '../store/mobileStore';
import { api } from './api';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function processItem(item: any): Promise<void> {
  const { entityType, operation, payload, entityId } = item;

  switch (entityType) {
    case 'opening': {
      if (operation === 'create') {
        await api.createOpening(payload);
      } else if (operation === 'update') {
        await api.updateOpening(entityId, payload);
      } else if (operation === 'delete') {
        await api.del(`/openings/${entityId}`);
      }
      break;
    }
    case 'note': {
      await api.post('/mobile/notes', payload);
      break;
    }
    case 'measurement': {
      await api.updateOpening(entityId, payload);
      break;
    }
    case 'sketch': {
      await api.put(`/house-maps/${entityId}`, payload);
      break;
    }
    case 'photo': {
      // Photo upload is handled separately via the photo queue
      break;
    }
    default:
      console.warn(`[SyncWorker] Unknown entity type: ${entityType}`);
  }
}

export function useSyncWorker() {
  const store = useMobileStore();
  const processingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drain = useCallback(async () => {
    if (processingRef.current || !store.isOnline) return;
    processingRef.current = true;

    try {
      const pending = store.syncQueue.filter(i => i.status === 'pending' && (i.retryCount || 0) < MAX_RETRIES);
      if (pending.length === 0) {
        processingRef.current = false;
        return;
      }

      for (const item of pending) {
        store.markSyncing(item.id);
        try {
          await processItem(item);
          store.markSynced(item.id);
          store.setLastSync();
        } catch (err: any) {
          store.incrementRetry(item.id);
          const errMsg = err?.message || 'Sync failed';
          const newRetry = (item.retryCount || 0) + 1;

          if (newRetry >= MAX_RETRIES) {
            store.markFailed(item.id, `Max retries reached: ${errMsg}`);
            console.error(`[SyncWorker] Item ${item.id} permanently failed:`, errMsg);
          } else {
            store.markFailed(item.id, errMsg);
            // Re-queue as pending after delay (exponential backoff)
            const delay = BASE_DELAY_MS * Math.pow(2, newRetry - 1);
            setTimeout(() => {
              useMobileStore.setState(s => ({
                syncQueue: s.syncQueue.map(i =>
                  i.id === item.id ? { ...i, status: 'pending' } : i
                )
              }));
            }, delay);
          }
        }
      }

      // Prune old completed items to keep localStorage small
      store.pruneCompleted();
    } finally {
      processingRef.current = false;
    }
  }, [store.isOnline, store.syncQueue]);

  // Drain on mount and when coming back online
  useEffect(() => {
    if (store.isOnline) {
      drain();
    }
  }, [store.isOnline]);

  // Poll every 30s for any stuck pending items
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (store.isOnline && store.pendingCount() > 0) {
        drain();
      }
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    pendingCount: store.pendingCount(),
    failedCount: store.failedCount(),
    lastSyncAt: store.lastSyncAt,
    isOnline: store.isOnline,
    retryAll: () => {
      // Reset failed items back to pending for manual retry
      useMobileStore.setState(s => ({
        syncQueue: s.syncQueue.map(i =>
          i.status === 'failed' ? { ...i, status: 'pending', retryCount: 0 } : i
        )
      }));
      drain();
    },
  };
}
