// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/types.ts — Canonical types for the Field Intelligence layer
//
// ARCHITECTURE RULE: This layer is advisory and assistive ONLY.
// The source of truth remains Supabase/Postgres + Dexie offline DB +
// deterministic pricing/measurement/contract/sync engines.
//
// Findings may never silently modify measurements, pricing, contracts,
// customers, appointments, openings, photos, sketches, or sync conflicts.
// Every suggested change requires explicit human approval.
// ═══════════════════════════════════════════════════════════════════════════

// ── Finding Severity ──────────────────────────────────────────────────────
// info      → cosmetic / helpful suggestion, no action required
// warning   → should review before final contract
// blocking  → must resolve before proposal/export

export type FindingSeverity = 'info' | 'warning' | 'blocking';

// ── Finding Category ──────────────────────────────────────────────────────
export type FindingCategory =
  | 'measurement'
  | 'photo'
  | 'pricing'
  | 'contract'
  | 'sync'
  | 'customer'
  | 'sketch'
  | 'opening';

// ── Finding Source ────────────────────────────────────────────────────────
// deterministic_rule → pure logic, 100% reliable offline
// ai_assistant       → Gemini-powered, requires credits, may be unavailable
// sync_engine        → reads Dexie outbox/conflict tables
// photo_qa           → local photo metadata analysis
// pricing_qa         → deterministic pricing engine checks
export type FindingSource =
  | 'deterministic_rule'
  | 'ai_assistant'
  | 'sync_engine'
  | 'photo_qa'
  | 'pricing_qa';

// ── Finding Status ────────────────────────────────────────────────────────
// open           → new, requires attention
// applied        → user explicitly approved + applied suggested action
// ignored        → user dismissed (reason required)
// reviewed       → user marked as reviewed but no action taken
// manager_review → escalated to manager
export type FindingStatus = 'open' | 'applied' | 'ignored' | 'reviewed' | 'manager_review';

// ── Core Finding ─────────────────────────────────────────────────────────
export interface FieldIntelligenceFinding {
  /** Stable ID for this finding — derived as hash of appointmentId+openingId+category+source+issueType */
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  source: FindingSource;
  appointmentId: string;
  /** Optional — only set when finding is opening-specific */
  openingId?: string;
  /** Optional — display-only opening number */
  openingNumber?: number;
  /** Short display title for the finding card */
  title: string;
  /** Full human-readable explanation */
  message: string;
  /** Human-readable suggested action text — advisory only, never auto-applied */
  suggestedAction?: string;
  /** If true, user must explicitly approve before any action is taken */
  requiresApproval: boolean;
  /** 0.0–1.0, null for deterministic findings */
  confidence?: number;
  /** Current lifecycle status */
  status: FindingStatus;
  /** Date.now() when finding was generated */
  createdAt: number;
  /** Extra context for display or filtering */
  metadataJson?: Record<string, unknown>;
}

// ── Engine Report ─────────────────────────────────────────────────────────
export interface FieldIntelligenceReport {
  appointmentId: string;
  /** Date.now() when this report was generated */
  runAt: number;
  findings: FieldIntelligenceFinding[];
  counts: {
    blocking: number;
    warning: number;
    info: number;
    total: number;
  };
  /** True if generated from offline-only deterministic checks */
  isOffline: boolean;
  /** Top 3 human-readable next actions for the rep */
  nextBestActions: string[];
}

// ── Approval Audit Entry ──────────────────────────────────────────────────
// Mirrors ReviewActionLog in the server schema.
// Used for local optimistic audit trail before cloud sync.
export interface FindingApprovalEntry {
  id: string;
  findingId: string;
  appointmentId: string;
  openingId?: string;
  userId: string;
  action: FindingStatus;
  reason?: string;
  appliedSuggestedAction?: string;
  createdAt: number;
}

// ── Command Map ───────────────────────────────────────────────────────────
// Voice/command-ready structure — see VoiceAssistant.tsx for activation.
// These map command strings to deterministic actions that still require
// confirmation where destructive or data-modifying.
export type FieldIntelligenceCommand =
  | 'runSmartCheck'
  | 'showMissingItems'
  | 'showMeasurementWarnings'
  | 'showSyncIssues'
  | 'recalculate'
  | 'openFinalReview'
  | 'prepareContract'
  | 'captureWidthTop'
  | 'captureWidthMiddle'
  | 'captureWidthBottom'
  | 'captureHeightLeft'
  | 'captureHeightCenter'
  | 'captureHeightRight'
  | 'markBrickProtrusion'
  | 'markTrimObstruction';

export interface FieldIntelligenceCommandDef {
  command: string;
  aliases?: string[];
  action: FieldIntelligenceCommand;
  requiresConfirmation: boolean;
  isDestructive: boolean;
  description: string;
}
