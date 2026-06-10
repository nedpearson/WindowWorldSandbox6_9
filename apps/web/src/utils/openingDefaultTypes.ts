// ─────────────────────────────────────────────────────────────────────────────
// openingDefaultTypes.ts — Shared types for the opening defaults system
//
// Used by openingDefaults.ts, openingValidation.ts, UI badge components,
// and the workbook engine to track field-level default/override/review status.
// ─────────────────────────────────────────────────────────────────────────────

/** Status of a single field in the default resolver output */
export type FieldStatus =
  | 'defaulted'      // Value was auto-applied because the field was blank
  | 'suggested'      // Value is recommended but not yet applied
  | 'overridden'     // User manually changed a previously defaulted value
  | 'confirmed'      // User explicitly accepted the suggested/defaulted value
  | 'needs_review';  // Ambiguous situation requiring user decision

/** Validation severity for staged validation */
export type ValidationSeverity =
  | 'info'           // Informational — does not block anything
  | 'suggestion'     // Advisory — default applied, shown as badge
  | 'warning'        // Caution — shown prominently, blocks at final contract
  | 'blocking';      // Critical — blocks at current stage

/** Validation stage determines which severity level applies to each field */
export type ValidationStage =
  | 'save_item'          // Normal save during field entry
  | 'full_details'       // Full details review
  | 'contract_ready'     // Pre-contract/export validation
  | 'production_handoff'; // Final handoff to production

/** A suggestion item returned by the default resolver */
export interface SuggestionItem {
  field: string;
  label: string;
  suggestedValue: string | number | boolean;
  reason: string;
  severity: ValidationSeverity;
}

/** An item that needs user review */
export interface ReviewItem {
  field: string;
  label: string;
  reason: string;
  severity: 'warning' | 'blocking';
  /** Optional action to resolve — e.g., "Select what touches the window" */
  action?: string;
  /** If true, shows a prompt asking the user to confirm */
  requiresConfirmation?: boolean;
}

/** A critical blocker that prevents final contract/export */
export interface BlockerItem {
  field: string;
  label: string;
  reason: string;
  /** Stage at which this becomes a blocker */
  blocksAt: ValidationStage;
}

/** Complete output of resolveOpeningDefaults() */
export interface DefaultResolverResult {
  /** Field→value map for fields that were blank and got a default applied */
  defaults: Record<string, string | number | boolean | null>;
  /** Advisory suggestions (not auto-applied) */
  suggestions: SuggestionItem[];
  /** Items needing user review/decision */
  needsReview: ReviewItem[];
  /** Critical blockers (stage-dependent) */
  blockers: BlockerItem[];
  /** Field→reason explaining why each default was chosen */
  reasons: Record<string, string>;
  /** Field→status tracking whether each value is defaulted/overridden/etc. */
  fieldStatus: Record<string, FieldStatus>;
}

/** Context passed to resolveOpeningDefaults() */
export interface DefaultResolverContext {
  /** Current validation stage */
  stage: ValidationStage;
  /** Product category (double_hung, picture, slider, etc.) */
  productCategory?: string;
  /** Exterior surface/type (brick, siding, wood, stucco, etc.) */
  exteriorSurface?: string;
  /** Other openings in the same appointment (for "never ask twice" logic) */
  siblingOpenings?: Array<Record<string, unknown>>;
  /** Previously tracked field overrides */
  overriddenFields?: Set<string>;
  /** Whether this is a new opening being created */
  isNew?: boolean;
}
