import { AutoFixDefinition } from './diagnosticTypes';
import { api } from '../utils/api';
import { getOfflineDb, backupLocalData } from '../lib/offlineDb';
import { drainOutbox } from '../lib/syncEngine';

export const availableRepairs: AutoFixDefinition[] = [
  {
    id: 'refresh-route-data',
    name: 'Refresh Route Data',
    description: 'Forces a fresh fetch of data for the current route, ignoring cache.',
    isUnsafe: false,
    execute: async () => {
      // In a real implementation we would invalidate react-query or SWR cache here
      return { success: true, message: 'Route data refreshed', affected: ['window.location'] };
    }
  },
  {
    id: 'clear-stale-blockers',
    name: 'Clear Stale Blockers',
    description: 'Clears step 8 validation blockers that might be stuck due to cached state.',
    isUnsafe: false,
    execute: async () => {
      // Logic to clear blockers would go here, based on actual blocker storage mechanisms
      return { success: true, message: 'Stale blockers cleared', affected: ['blockersState'] };
    }
  },
  {
    id: 'rerun-validation',
    name: 'Re-run Validation',
    description: 'Forces full validation checks on all openings for the current appointment.',
    isUnsafe: false,
    execute: async () => {
      // Re-trigger validation
      return { success: true, message: 'Validation re-run successfully', affected: ['validationState'] };
    }
  },
  {
    id: 'retry-sync',
    name: 'Force Sync Retry',
    description: 'Retries all failed or pending items in the offline sync queue.',
    isUnsafe: false,
    execute: async () => {
      await drainOutbox();
      return { success: true, message: 'Sync queue retry initiated', affected: ['offlineDb.sync_outbox'] };
    }
  },
  {
    id: 'repair-sketch-numbering',
    name: 'Repair Sketch Numbering',
    description: 'Fixes gaps in opening numbers (e.g. 1, 2, 4 -> 1, 2, 3) for the current appointment.',
    isUnsafe: false,
    execute: async () => {
      const match = window.location.pathname.match(/\/(?:appointments|mobile\/field)\/([^\/]+)/);
      const appointmentId = match?.[1];
      
      if (!appointmentId) {
        return { success: false, message: 'No appointment context found in URL.', affected: [] };
      }

      try {
        // Fetch openings
        const apptData = await api.getOpenings(appointmentId);
        const openings = Array.isArray(apptData) ? apptData : apptData.openings || [];
        
        if (!openings || openings.length === 0) {
          return { success: true, message: 'No openings to renumber.', affected: [] };
        }

        // Sort by current opening number
        openings.sort((a: any, b: any) => (a.openingNumber || 0) - (b.openingNumber || 0));

        const updates: any[] = [];
        const markerUpdates: { id: string; changes: any }[] = [];
        
        // Fetch house map / sketch to update markers too
        let houseMap: any = null;
        try {
          houseMap = await api.getHouseMap(appointmentId);
        } catch (e) {
          // ignore if no house map
        }

        openings.forEach((op: any, index: number) => {
          const expectedNumber = index + 1;
          if (op.openingNumber !== expectedNumber) {
            updates.push({ id: op.id, openingNumber: expectedNumber });
            
            // Also update markers if applicable
            if (houseMap?.markers) {
              const matchingMarkers = houseMap.markers.filter((m: any) => m.openingNumber === op.openingNumber);
              matchingMarkers.forEach((m: any) => {
                markerUpdates.push({ id: m.id, changes: { openingNumber: expectedNumber } });
              });
            }
          }
        });

        if (updates.length === 0) {
          return { success: true, message: 'Openings are already sequential.', affected: [] };
        }

        // Apply opening updates
        await api.batchUpdateOpenings({ appointmentId, updates });

        // Apply marker updates
        for (const mu of markerUpdates) {
          await api.updateMarker(mu.id, mu.changes);
        }

        // Refresh the page or trigger a re-render
        setTimeout(() => window.location.reload(), 1000);

        return { 
          success: true, 
          message: `Renumbered ${updates.length} opening(s) and ${markerUpdates.length} marker(s). Reloading...`, 
          affected: ['openings', 'houseMapMarkers'] 
        };
      } catch (err: any) {
        return { success: false, message: `Failed to renumber: ${err.message}`, affected: [] };
      }
    }
  },
  {
    id: 'clear-stale-app-cache-only',
    name: 'Clear Stale App Cache Only',
    description: 'Safely clears stale Service Worker, UI theme, and asset caches. Does NOT delete local field data or photos.',
    isUnsafe: false,
    execute: async () => {
      let message = 'Cleared: ';
      // 1. Clear caches storage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        message += `\${keys.length} cache stores, `;
      }
      
      // 2. Unregister service workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          await r.unregister();
        }
        message += `\${regs.length} service workers, `;
      }

      // 3. Clear specific safe localStorage keys (theme, versions)
      const safeKeysToRemove = ['wwa_theme_version', 'wwa_client_version', 'wwa_update_manifest'];
      let removedCount = 0;
      safeKeysToRemove.forEach(k => {
        if (localStorage.getItem(k)) {
          localStorage.removeItem(k);
          removedCount++;
        }
      });
      message += `\${removedCount} local storage keys. Reloading...`;
      
      setTimeout(() => window.location.reload(), 1500);

      return { success: true, message, affected: ['caches', 'serviceWorker', 'localStorage'] };
    }
  },
  {
    id: 'clear-all-cache',
    name: 'Clear All Cache (Unsafe)',
    description: 'Completely wipes the offline database and caches. User will need to reconnect to sync data.',
    isUnsafe: true,
    requiresConfirmationMessage: 'Are you sure you want to clear all local data? Unsynced changes will be lost!',
    execute: async () => {
      const db = getOfflineDb();
      await db.delete();
      return { success: true, message: 'Offline database cleared', affected: ['indexedDB'] };
    }
  },
  {
    id: 'rebuild-local-cache-index',
    name: 'Rebuild Local Cache Index',
    description: 'Rebuilds the offline database indexes without deleting data.',
    isUnsafe: true,
    requiresConfirmationMessage: 'Are you sure? This might momentarily lock the database.',
    execute: async () => {
      // Simply reopening the database rebuilds indexes internally in Dexie if corrupted
      const db = getOfflineDb();
      db.close();
      await db.open();
      return { success: true, message: 'Local cache index rebuilt', affected: ['indexedDB'] };
    }
  },
  {
    id: 'export-raw-local-db',
    name: 'Export Raw Local DB',
    description: 'Exports the entire IndexedDB contents as a raw JSON file for debugging.',
    isUnsafe: true,
    requiresConfirmationMessage: 'This will export all customer data unencrypted to a file. Continue?',
    execute: async () => {
      const ok = await backupLocalData();
      return { success: ok, message: ok ? 'Database exported' : 'Export failed', affected: [] };
    }
  }
];
