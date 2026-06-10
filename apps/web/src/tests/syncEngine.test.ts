/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enqueueOutboxItem, drainOutbox, getSyncState, subscribeSyncState } from '../lib/syncEngine';

// Mock the global navigator object to control online/offline state
const navigatorMock = { onLine: true };
vi.stubGlobal('navigator', navigatorMock);

// We need a local mock of the Dexie sync_outbox table.
const outboxStore: any[] = [];
let nextId = 1;

vi.mock('../lib/offlineDb', () => {
  return {
    getOrCreateDeviceId: () => 'dev_test',
    detectPlatformType: () => 'web',
    recordIdMapping: vi.fn().mockResolvedValue(undefined),
    appendAuditTrail: vi.fn().mockResolvedValue(undefined),
    cacheCustomer: vi.fn().mockResolvedValue(undefined),
    cacheSketch: vi.fn().mockResolvedValue(undefined),
    getOfflineDb: () => ({
      sync_outbox: {
        add: async (item: any) => {
          const id = nextId++;
          outboxStore.push({ ...item, id });
          return id;
        },
        update: async (id: number, changes: any) => {
          const idx = outboxStore.findIndex(i => i.id === id);
          if (idx >= 0) outboxStore[idx] = { ...outboxStore[idx], ...changes };
        },
        where: (key: string) => ({
          equals: (val: any) => ({
            first: async () => outboxStore.find(i => i[key] === val),
            modify: async (changes: any) => {
              outboxStore.forEach((item, idx) => {
                if (item[key] === val) outboxStore[idx] = { ...item, ...changes };
              });
            },
            count: async () => outboxStore.filter(i => i[key] === val).length,
          }),
          anyOf: (vals: any[]) => ({
            filter: (predicate: any) => ({
              limit: (n: number) => ({
                sortBy: async (sortKey: string) => outboxStore.filter(i => vals.includes(i[key]) && predicate(i)).slice(0, n)
              }),
              count: async () => outboxStore.filter(i => vals.includes(i[key]) && predicate(i)).length
            }),
            count: async () => outboxStore.filter(i => vals.includes(i[key])).length
          })
        }),
        filter: (predicate: any) => ({
          modify: async (fn: any) => {
            outboxStore.forEach((item, idx) => {
              if (predicate(item)) {
                if (typeof fn === 'function') fn(outboxStore[idx]);
                else outboxStore[idx] = { ...item, ...fn };
              }
            });
          },
          count: async () => outboxStore.filter(predicate).length
        })
      },
      sync_conflicts: {
        filter: () => ({ count: async () => 0 }),
        add: vi.fn()
      },
      photo_blob_queue: {
        where: () => ({
          equals: () => ({
            modify: vi.fn().mockResolvedValue(undefined)
          })
        })
      },
      appointments_cache: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined)
      }
    })
  };
});

describe('SyncEngine', () => {
  beforeEach(() => {
    outboxStore.length = 0;
    nextId = 1;
    navigatorMock.onLine = true;
    vi.restoreAllMocks();
  });

  describe('enqueueOutboxItem', () => {
    it('enqueues a new item with pending status', async () => {
      const id = await enqueueOutboxItem({
        companyId: 'comp_1',
        userId: 'user_1',
        entityType: 'customer',
        entityLocalId: 'loc_cust_1',
        operation: 'create',
        payload: { name: 'Test' }
      });

      expect(id).toBe(1);
      expect(outboxStore.length).toBe(1);
      expect(outboxStore[0].status).toBe('pending');
      expect(outboxStore[0].payloadJson).toContain('Test');
    });

    it('updates existing failed item instead of creating duplicate', async () => {
      await enqueueOutboxItem({
        companyId: 'comp_1',
        userId: 'user_1',
        entityType: 'customer',
        entityLocalId: 'loc_cust_1',
        operation: 'create',
        payload: { name: 'Test' }
      });
      outboxStore[0].status = 'failed';

      await enqueueOutboxItem({
        companyId: 'comp_1',
        userId: 'user_1',
        entityType: 'customer',
        entityLocalId: 'loc_cust_1',
        operation: 'create',
        payload: { name: 'Updated Test' }
      });

      expect(outboxStore.length).toBe(1);
      expect(outboxStore[0].status).toBe('pending');
      expect(outboxStore[0].retryCount).toBe(0);
      expect(outboxStore[0].payloadJson).toContain('Updated Test');
    });
  });

  describe('drainOutbox', () => {
    it('aborts drain if offline and emits offline state', async () => {
      navigatorMock.onLine = false;
      const stateListener = vi.fn();
      const unsub = subscribeSyncState(stateListener);

      await drainOutbox();

      expect(getSyncState().status).toBe('offline');
      expect(stateListener).toHaveBeenCalledWith(expect.objectContaining({ status: 'offline' }));
      unsub();
    });

    it('syncs pending items successfully when online', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'cloud_cust_1', version: 1 })
      });
      vi.stubGlobal('fetch', fetchMock);

      await enqueueOutboxItem({
        companyId: 'comp_1',
        userId: 'user_1',
        entityType: 'customer',
        entityLocalId: 'loc_cust_1',
        operation: 'create',
        payload: { name: 'Test' }
      });

      await drainOutbox();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(outboxStore[0].status).toBe('synced');
      expect(outboxStore[0].entityCloudId).toBe('cloud_cust_1');
      expect(getSyncState().pendingCount).toBe(0);
    });

    it('retries on failure with exponential backoff', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server Error' })
      });
      vi.stubGlobal('fetch', fetchMock);

      await enqueueOutboxItem({
        companyId: 'comp_1',
        userId: 'user_1',
        entityType: 'customer',
        entityLocalId: 'loc_cust_1',
        operation: 'create',
        payload: { name: 'Test' }
      });

      await drainOutbox();

      expect(outboxStore[0].status).toBe('pending');
      expect(outboxStore[0].retryCount).toBe(1);
      expect(outboxStore[0].nextRetryAt).toBeGreaterThan(Date.now());
      expect(getSyncState().pendingCount).toBe(1);
    });
  });
});
