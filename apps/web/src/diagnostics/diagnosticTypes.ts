export type RootCauseCategory =
  | 'STALE_CACHE'
  | 'WRONG_USER_COMPANY_CACHE_KEY'
  | 'API_FAILURE'
  | 'AUTH_SESSION_FAILURE'
  | 'VALIDATION_BLOCKER'
  | 'STALE_PRICING'
  | 'DOCUMENT_GENERATION_FAILURE'
  | 'SYNC_CONFLICT'
  | 'OFFLINE_UNAVAILABLE_ACTION'
  | 'WORKFLOW_STATE_STUCK'
  | 'ROUTE_MISMATCH'
  | 'SKETCH_OPENING_MISMATCH'
  | 'LOCAL_DB_ISSUE'
  | 'MISSING_REQUIRED_ENV_CONFIG'
  | 'MISSING_TEMPLATE'
  | 'PRISMA_API_MISMATCH'
  | 'UNKNOWN';

export interface DiagnosticReport {
  timestamp: string;
  appVersion: string;
  route: string;
  workflowState: Record<string, unknown>;
  context: {
    userId?: string;
    companyId?: string;
    role?: string;
    isOffline: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
    isIPhone67?: boolean;
    iphone67LayoutWarnings?: string[];
    localPhotoFolderPath?: string;
    localDocumentFolderPath?: string;
  };
  errors: {
    frontend: string[];
    console: string[];
    apiFailures: any[];
  };
  cache: {
    status: string;
    staleKeys: string[];
  };
  localDb: {
    status: string;
    queueSize: number;
    syncStatus: string;
    schemaVersion?: number;
    cachedJobsCount?: number;
    unsyncedOpeningsCount?: number;
    unsyncedPhotosCount?: number;
    unsyncedSketchItemsCount?: number;
    unsyncedDocumentsCount?: number;
    addressVisualsCount?: number;
  };
  validationBlockers: string[];
  pricing: {
    isStale: boolean;
    lastFetchedAt?: string;
    pricingRulesVersion?: string;
  };
  documentGeneration: {
    status: string;
    recentErrors: string[];
    workbookTemplateAvailable?: boolean;
    mapSnapshotAvailable?: boolean;
  };
  windowWorldSpecific: {
    appointmentId?: string;
    workflowStep?: number;
    step8BlockerState?: string;
    openingBlockers?: string[];
    orielSashBlockers?: string[];
    typeRemovedInstalledMismatch?: string[];
    modelColorResolution?: string;
    sketchNumberingMismatches?: string[];
    sketchDrawnLines?: number;
    quoteGroups?: string[];
    acceptedQuotePackage?: string;
    sketchMarkerCount?: number;
    orderRowCount?: number;
    renderedMarkerCount?: number;
  };
  versionChecklist?: {
    featureFlagsActive: string[];
    appVersionServer?: string;
    themeVersion: string;
    pricingRulesVersion: string;
    workbookTemplateVersion: string;
    serviceWorkerVersion?: string;
    localDbVersion: number;
    installedAssetVersion?: string;
    staleCacheDetected: boolean;
  };
  warnings?: Array<{
    component: string;
    issue: string;
    impact: string;
    suggestedFix: string;
  }>;
}

export interface AutoFixDefinition {
  id: string;
  name: string;
  description: string;
  isUnsafe: boolean;
  requiresConfirmationMessage?: string;
  execute: () => Promise<{ success: boolean; message: string; affected: string[] }>;
}

export interface RootCauseSummary {
  category: RootCauseCategory;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedFixId?: string;
}
