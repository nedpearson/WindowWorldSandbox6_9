import { getOfflineDb, backupLocalData } from '../lib/offlineDb';
import { CLIENT_VERSION } from '../config/version';

export interface VersionManifest {
  appName: string;
  version: string;
  buildHash: string;
  builtAt: string;
  themeVersion: string;
  pricingRulesVersion: string;
  workbookTemplateVersion: string;
  minimumLocalDbVersion: string;
  updateRequired: boolean;
}

export interface CheckUpdateResult {
  updateAvailable: boolean;
  serverManifest?: VersionManifest;
  clientVersion: typeof CLIENT_VERSION;
  error?: string;
}

/**
 * Check if a new version is available on the server.
 */
export async function checkForAppUpdates(): Promise<CheckUpdateResult> {
  if (!navigator.onLine) {
    return { updateAvailable: false, clientVersion: CLIENT_VERSION, error: 'offline' };
  }

  try {
    const res = await fetch('/api/version', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch version manifest: ${res.statusText}`);
    }

    const serverManifest: VersionManifest = await res.json();

    // Compare major/minor/patch version OR themeVersion OR pricingRulesVersion OR workbookTemplateVersion
    const versionMismatch = serverManifest.version !== CLIENT_VERSION.version;
    const themeMismatch = serverManifest.themeVersion !== CLIENT_VERSION.themeVersion;
    const pricingMismatch = serverManifest.pricingRulesVersion !== CLIENT_VERSION.pricingRulesVersion;
    const workbookMismatch = serverManifest.workbookTemplateVersion !== CLIENT_VERSION.workbookTemplateVersion;

    const updateAvailable = versionMismatch || themeMismatch || pricingMismatch || workbookMismatch;

    return {
      updateAvailable,
      serverManifest,
      clientVersion: CLIENT_VERSION
    };
  } catch (err: any) {
    console.error('[UpdateService] Update check failed:', err);
    return {
      updateAvailable: false,
      clientVersion: CLIENT_VERSION,
      error: err.message || 'unknown_error'
    };
  }
}

/**
 * Get count of unsynced items in IndexedDB.
 */
export async function getUnsyncedOutboxCount(): Promise<number> {
  try {
    const db = getOfflineDb();
    const queueCount = await db.sync_outbox.count().catch(() => 0);
    const photoQueueCount = await db.photo_blob_queue.count().catch(() => 0);
    return queueCount + photoQueueCount;
  } catch (e) {
    console.error('[UpdateService] Failed to read outbox count:', e);
    return 0;
  }
}

/**
 * Run safe update flow.
 * Checks for unsynced changes first. If forced is true, bypasses warning block.
 */
export async function triggerAppUpdate(force = false): Promise<{ success: boolean; error?: string; unsyncedCount?: number }> {
  const unsyncedCount = await getUnsyncedOutboxCount();

  if (unsyncedCount > 0 && !force) {
    return { success: false, error: 'unsynced_data_exists', unsyncedCount };
  }

  try {
    // 1. Run local DB backup before reload/migration
    console.log('[UpdateService] backing up local database...');
    await backupLocalData();

    // 2. Perform safe cache clearance and reload
    const dest = '/mobile'; // Default home destination after update
    window.location.replace(`/update?then=${encodeURIComponent(dest)}`);
    return { success: true };
  } catch (err: any) {
    console.error('[UpdateService] Update execution failed:', err);
    return { success: false, error: err.message || 'failed_to_update' };
  }
}
