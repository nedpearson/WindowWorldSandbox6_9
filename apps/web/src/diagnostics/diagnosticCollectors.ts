import { getOfflineDb } from '../lib/offlineDb';
import { useAuthStore } from '../store';
import { DiagnosticReport } from './diagnosticTypes';
import { CLIENT_VERSION } from '../config/version';
import { useUpdateStore } from '../store/updateStore';

// Global error capture cache
export const globalErrorCache: {
  frontend: string[];
  apiFailures: any[];
} = {
  frontend: [],
  apiFailures: [],
};

// We intercept console.error in useDiagnosticRecorder to populate this
export const consoleErrorCache: string[] = [];

export async function collectDiagnostics(): Promise<DiagnosticReport> {
  const db = getOfflineDb();
  const authStore = useAuthStore.getState();

  const user = authStore.user;
  
  // Db status
  const queueCount = await db.sync_outbox.count().catch(() => 0);
  const conflictCount = await db.sync_conflicts.count().catch(() => 0);
  const photoQueueCount = await db.photo_blob_queue.count().catch(() => 0);
  
  const cacheSummary = {
    pricingTables: await db.pricing_cache.count().catch(() => 0),
    appointments: await db.appointments_cache.count().catch(() => 0),
    customers: await db.customers_cache.count().catch(() => 0),
  };

  const unsyncedOpeningsCount = await db.sync_outbox.where('entityType').equals('opening').count().catch(() => 0);
  const unsyncedPhotosCount = await db.sync_outbox.where('entityType').equals('photo').count().catch(() => 0);
  const unsyncedSketchItemsCount = await db.sync_outbox.filter(item => item.entityType === 'sketch' || item.entityType === 'sketch_annotation').count().catch(() => 0);
  const unsyncedDocumentsCount = await db.sync_outbox.where('entityType').equals('document_generation').count().catch(() => 0);
  const addressVisualsCount = await db.address_visuals_cache.count().catch(() => 0);
  const cachedJobsCount = cacheSummary.appointments;

  // WindowWorld Assistant specific states
  const currentApptId = window.location.pathname.match(/\/appointments\/([^\/]+)/)?.[1] 
              || window.location.pathname.match(/\/mobile\/field\/([^\/]+)/)?.[1];

  let workbookTemplateAvailable = false;
  try {
    const res = await fetch('/BTR_Window_Contract_Template.xlsx', { method: 'HEAD' });
    workbookTemplateAvailable = res.ok;
  } catch (e) {
    workbookTemplateAvailable = false;
  }

  let mapSnapshotAvailable = false;
  if (currentApptId) {
    const mapCache = await db.sketches_cache?.where('appointmentId').equals(currentApptId).first().catch(() => null);
    if (mapCache) {
      try {
        const rawSketch = JSON.parse(mapCache.rawJson || '{}');
        mapSnapshotAvailable = !!(rawSketch.mapSnapshotUrl || rawSketch.image || rawSketch.backgroundImage);
      } catch (e) {
        console.warn('Failed to parse cached mapSnapshotUrl for diagnostics', e);
      }
    }
  }

  let sketchMarkerCount = 0;
  let orderRowCount = 0;
  let renderedMarkerCount = 0;
  if (currentApptId) {
    const appt = await db.appointments_cache.get(currentApptId).catch(() => null);
    if (appt) {
      orderRowCount = appt.openings?.length || 0;
      try {
        const fullAppt = JSON.parse(appt.rawJson || '{}');
        sketchMarkerCount = fullAppt.sketchMarkers?.length || 0;
        renderedMarkerCount = fullAppt.sketchMarkers?.filter((m: any) => m.x !== undefined).length || 0;
      } catch (e) {
        console.warn('Failed to parse rawJson for diagnostics', e);
      }
    }
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isIPhone67 = viewportWidth <= 375 && viewportHeight <= 667;
  const iphone67LayoutWarnings = isIPhone67
    ? ['Compact mobile screen detected. Keep touch targets >= 44px and check scrollable overlays.']
    : [];

  const isDesktop = !!(window as any).electronAPI;
  const localPhotoFolderPath = isDesktop
    ? 'AppData\\Roaming\\WindowWorldAssistant\\Photos'
    : 'Browser IndexedDB';
  const localDocumentFolderPath = isDesktop
    ? 'AppData\\Roaming\\WindowWorldAssistant\\Documents'
    : 'Browser Downloads / Local Storage';

  const wwaState = {
    appointmentId: currentApptId,
    workflowStep: undefined,
    step8BlockerState: undefined,
    sketchDrawnLines: 0,
    sketchMarkerCount,
    orderRowCount,
    renderedMarkerCount,
  };

  return {
    timestamp: new Date().toISOString(),
    appVersion: CLIENT_VERSION.version,
    route: window.location.pathname + window.location.search,
    workflowState: {},
    context: {
      userId: user?.id,
      companyId: user?.companyId ?? undefined,
      role: user?.role,
      isOffline: !navigator.onLine,
      viewportWidth,
      viewportHeight,
      isIPhone67,
      iphone67LayoutWarnings,
      localPhotoFolderPath,
      localDocumentFolderPath,
    },
    errors: {
      frontend: [...globalErrorCache.frontend],
      console: [...consoleErrorCache],
      apiFailures: [...globalErrorCache.apiFailures],
    },

    cache: {
      status: `Appointments: ${cacheSummary.appointments}, Customers: ${cacheSummary.customers}`,
      staleKeys: [],
    },
    localDb: {
      status: `OK`,
      queueSize: queueCount + photoQueueCount,
      syncStatus: conflictCount > 0 ? `Conflicts: ${conflictCount}` : 'Synced',
      schemaVersion: 10,
      cachedJobsCount,
      unsyncedOpeningsCount,
      unsyncedPhotosCount,
      unsyncedSketchItemsCount,
      unsyncedDocumentsCount,
      addressVisualsCount,
    },
    warnings: [],
    validationBlockers: [], 
    pricing: {
      isStale: useUpdateStore.getState().updateAvailable,
      pricingRulesVersion: CLIENT_VERSION.pricingRulesVersion,
    },
    documentGeneration: {
      status: 'Unknown',
      recentErrors: [],
      workbookTemplateAvailable,
      mapSnapshotAvailable,
    },
    windowWorldSpecific: wwaState,
    versionChecklist: {
      featureFlagsActive: [
        'outside_measurement_preferred',
        'specialty_shape_pricing',
        'stucco_removal_cutback',
        'photo_annotations_v2',
        'offline_indexeddb_sync'
      ],
      appVersionServer: useUpdateStore.getState().serverManifest?.version ?? 'Unknown',
      themeVersion: CLIENT_VERSION.themeVersion,
      pricingRulesVersion: CLIENT_VERSION.pricingRulesVersion,
      workbookTemplateVersion: CLIENT_VERSION.workbookTemplateVersion,
      serviceWorkerVersion: navigator.serviceWorker?.controller ? 'Active' : 'Not Registered',
      localDbVersion: CLIENT_VERSION.localDbVersion,
      installedAssetVersion: CLIENT_VERSION.version,
      staleCacheDetected: useUpdateStore.getState().updateAvailable,
    }
  };
}
