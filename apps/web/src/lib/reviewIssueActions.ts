import type { UnifiedWarning, RecommendedFix, AlternativeFix } from '../utils/centralValidationOrchestrator';

// ─────────────────────────────────────────────────────────────────────
// Action types (superset — some only used at group level)
// ─────────────────────────────────────────────────────────────────────
export type ActionType =
  | 'route_focus'       // navigate to a tab/anchor/field
  | 'apply_field_update'// PATCH an opening or appointment field
  | 'apply_quote_options'
  | 'apply_product_option'
  | 'open_modal'
  | 'schedule_follow_up'
  | 'generate_document'
  | 'manual_required'
  | 'escalate'
  | 'dismiss_with_reason'
  | 'set_fields';       // used internally by business-rules engine output

export interface RouteFocusPayload {
  tab: string;
  hash?: string;
  focusTarget?: string;
  openingNumber?: number;
  focusField?: string;  // specific field name to focus in the OpeningWizard
}

export interface FieldUpdatePayload {
  target: 'appointment' | 'opening';
  openingNumber?: number;
  fields: Record<string, any>;
}

export interface ExtendedFix {
  label: string;
  actionType: ActionType;
  payload?: any;
  priceImpact?: number;
  requiresConfirmation?: boolean;
  requiresReason?: boolean;
}

export interface ActionDefinition {
  issueType: string;
  recommendedFix?: ExtendedFix;
  alternativeFixes?: ExtendedFix[];
}

// ─────────────────────────────────────────────────────────────────────
// Static registry (exact warning IDs)
// ─────────────────────────────────────────────────────────────────────
export const ISSUE_ACTION_REGISTRY: Record<string, ActionDefinition> = {
  'contract-ownerSignature': {
    issueType: 'missing_owner_signature',
    recommendedFix: { label: 'Collect Owner Signature', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'ownerSignature' } },
    alternativeFixes: [
      { label: 'Collect now', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'ownerSignature' } },
      { label: 'Send for remote signature', actionType: 'manual_required' },
      { label: 'Mark draft only', actionType: 'dismiss_with_reason', requiresReason: true },
      { label: 'Schedule follow-up to sign', actionType: 'schedule_follow_up' },
      { label: 'Escalate', actionType: 'escalate' },
    ],
  },
  'contract-signatureDate': {
    issueType: 'missing_signature_date',
    recommendedFix: { label: "Apply Today's Date", actionType: 'apply_field_update', payload: { target: 'appointment', fields: { signatureDate: new Date().toISOString() } } },
    alternativeFixes: [
      { label: "Use today's date", actionType: 'apply_field_update', payload: { target: 'appointment', fields: { signatureDate: new Date().toISOString() } } },
      { label: 'Pick a date', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'signatureDate' } },
      { label: 'Mark draft only', actionType: 'dismiss_with_reason' },
    ],
  },
  'contract-estimatorSignature': {
    issueType: 'missing_estimator_signature',
    recommendedFix: { label: 'Add Estimator Signature', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'estimatorSignature' } },
    alternativeFixes: [
      { label: 'Add now', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'estimatorSignature' } },
      { label: 'Mark draft only', actionType: 'dismiss_with_reason' },
    ],
  },
  'contract-customerInitials': {
    issueType: 'missing_customer_initials',
    recommendedFix: { label: 'Collect Initials', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'customerInitials' } },
    alternativeFixes: [
      { label: 'Add now', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'customerInitials' } },
      { label: 'Mark draft only', actionType: 'dismiss_with_reason' },
    ],
  },
  'header-customerCity': {
    issueType: 'missing_city',
    recommendedFix: { label: 'Enter City', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerCity' } },
    alternativeFixes: [
      { label: 'Enter manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerCity' } },
      { label: 'Mark unknown temporarily', actionType: 'dismiss_with_reason' },
    ],
  },
  'header-customerState': {
    issueType: 'missing_state',
    recommendedFix: { label: 'Enter State', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerState' } },
    alternativeFixes: [{ label: 'Enter manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerState' } }],
  },
  'header-customerZip': {
    issueType: 'missing_zip',
    recommendedFix: { label: 'Enter ZIP', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerZip' } },
    alternativeFixes: [{ label: 'Enter manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerZip' } }],
  },
  'header-customerPhone': {
    issueType: 'missing_phone',
    recommendedFix: { label: 'Enter Phone', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerPhone' } },
    alternativeFixes: [{ label: 'Enter manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerPhone' } }],
  },
  'no-openings': {
    issueType: 'no_openings_entered',
    recommendedFix: { label: 'Add Openings', actionType: 'route_focus', payload: { tab: 'sketch' } },
    alternativeFixes: [{ label: 'Add openings now', actionType: 'route_focus', payload: { tab: 'sketch' } }],
  },
  'no-openings-linked': {
    issueType: 'no_openings_linked',
    recommendedFix: { label: 'Link Sketch Openings', actionType: 'route_focus', payload: { tab: 'sketch' } },
    alternativeFixes: [{ label: 'Link openings now', actionType: 'route_focus', payload: { tab: 'sketch' } }],
  },
  'pricing-mismatch-unpriced': {
    issueType: 'pricing_mismatch',
    recommendedFix: { label: 'Recalculate Pricing', actionType: 'apply_quote_options', payload: { action: 'recalculate' } },
    alternativeFixes: [
      { label: 'Recalculate from openings', actionType: 'apply_quote_options', payload: { action: 'recalculate' } },
      { label: 'Accept job-level price', actionType: 'apply_quote_options', payload: { action: 'confirm_job_level_price' } },
      { label: 'Open pricing tab', actionType: 'route_focus', payload: { tab: 'pricing' } },
    ],
  },
  'reconcile-mismatch': {
    issueType: 'pricing_mismatch',
    recommendedFix: { label: 'Recalculate Pricing', actionType: 'apply_quote_options', payload: { action: 'recalculate' } },
    alternativeFixes: [
      { label: 'Recalculate from openings', actionType: 'apply_quote_options', payload: { action: 'recalculate' } },
      { label: 'Open pricing tab', actionType: 'route_focus', payload: { tab: 'pricing' } },
    ],
  },
  'LA-NRG-003': {
    issueType: 'energy_argon_recommended',
    recommendedFix: { label: 'Add Argon (All Openings)', actionType: 'apply_product_option', payload: { optionCode: 'argon' } },
    alternativeFixes: [
      { label: 'Add argon', actionType: 'apply_product_option', payload: { optionCode: 'argon' } },
      { label: 'Customer declined argon', actionType: 'dismiss_with_reason', requiresReason: true },
      { label: 'Open product options', actionType: 'route_focus', payload: { tab: 'pricing' } },
    ],
  },
  'follow_up_missing': {
    issueType: 'follow_up_missing',
    recommendedFix: { label: 'Schedule Follow-up', actionType: 'schedule_follow_up' },
    alternativeFixes: [{ label: 'No follow-up needed', actionType: 'dismiss_with_reason', requiresReason: true }],
  },
};

// ─────────────────────────────────────────────────────────────────────
// Pattern-based resolution for dynamically-generated warning IDs
// Call this when the registry lookup fails.
// ─────────────────────────────────────────────────────────────────────
export function resolveActionByPattern(warning: UnifiedWarning): ActionDefinition | null {
  const id = warning.id;
  const n = warning.openingNumber;

  // ── missing-{field}-{N} (from openingValidation.ts missingFields) ──
  if (id.startsWith('missing-')) {
    const field = id.replace(/^missing-/, '').replace(/-\d+$/, '');
    return {
      issueType: `missing_opening_field_${field}`,
      recommendedFix: {
        label: `Edit Opening${n !== undefined ? ` #${n}` : ''} — Fix ${fieldLabel(field)}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: field },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Skip for now', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── ov-tempered-{N} (bathroom tempered glass required) ──
  if (id.startsWith('ov-tempered-')) {
    return {
      issueType: 'opening_tempered_required',
      recommendedFix: {
        label: `Add Tempered Glass — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'apply_field_update',
        payload: { target: 'opening', openingNumber: n, fields: { temperedGlass: 'full' } },
      },
      alternativeFixes: [
        { label: 'Set tempered = full', actionType: 'apply_field_update', payload: { target: 'opening', openingNumber: n, fields: { temperedGlass: 'full' } } },
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n, focusField: 'temperedGlass' } },
        { label: 'Confirm customer declined', actionType: 'dismiss_with_reason', requiresReason: true },
        { label: 'Escalate', actionType: 'escalate' },
      ],
    };
  }

  // ── ov-depth-{N} (brick depth warning from openingValidation) ──
  if (id.startsWith('ov-depth-')) {
    return {
      issueType: 'opening_missing_depth',
      recommendedFix: {
        label: `Enter Depth — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: 'openingDepth' },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Dismiss — will measure on-site', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── ov-outlier-{N} ──
  if (id.startsWith('ov-outlier-')) {
    return {
      issueType: 'opening_measurement_outlier',
      recommendedFix: {
        label: `Verify Measurement — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: 'width' },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Measurement is correct — dismiss', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── ov-risk-{N} ──
  if (id.startsWith('ov-risk-')) {
    return {
      issueType: 'opening_high_risk',
      recommendedFix: {
        label: `Review Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Escalate to manager', actionType: 'escalate' },
        { label: 'Dismiss — acknowledged', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── meas-depth-{N} (measurement rules engine brick depth) ──
  if (id.startsWith('meas-depth-')) {
    return {
      issueType: 'opening_missing_return_depth',
      recommendedFix: {
        label: `Enter Return Depth — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: 'openingDepth' },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Escalate to manager', actionType: 'escalate' },
      ],
    };
  }

  // ── spec-dim-{key}-{N} (specialty shape missing dimension) ──
  if (id.startsWith('spec-dim-')) {
    const parts = id.split('-');
    // spec-dim-{key}-{openingNumber}
    const field = parts.slice(2, parts.length - 1).join('-');
    return {
      issueType: `specialty_missing_${field}`,
      recommendedFix: {
        label: `Enter ${fieldLabel(field)} — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: field },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Escalate — specialty shape', actionType: 'escalate' },
      ],
    };
  }

  // ── safety-{ruleId}-{N} (safety glazing flags) ──
  if (id.startsWith('safety-')) {
    return {
      issueType: 'safety_glazing_flag',
      recommendedFix: {
        label: `Add Tempered Glass — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'apply_field_update',
        payload: { target: 'opening', openingNumber: n, fields: { temperedGlass: 'full' } },
      },
      alternativeFixes: [
        { label: 'Set tempered = full', actionType: 'apply_field_update', payload: { target: 'opening', openingNumber: n, fields: { temperedGlass: 'full' } } },
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n, focusField: 'temperedGlass' } },
        { label: 'Reviewed — not required here', actionType: 'dismiss_with_reason', requiresReason: true },
        { label: 'Escalate', actionType: 'escalate' },
      ],
    };
  }

  // ── est-{id} (senior estimator alerts) ──
  if (id.startsWith('est-')) {
    // If there's a recommendedFix already from the orchestrator (set_fields), keep it as primary
    // but ensure alternativeFixes include opening editor
    return {
      issueType: 'estimator_alert',
      recommendedFix: warning.recommendedFix
        ? undefined // keep existing
        : {
            label: `Review${n !== undefined ? ` Opening #${n}` : ''}`,
            actionType: 'route_focus',
            payload: { tab: 'pricing', openingNumber: n },
          },
      alternativeFixes: [
        ...(n !== undefined ? [{ label: `Open Opening #${n} editor`, actionType: 'route_focus' as ActionType, payload: { tab: 'pricing', openingNumber: n } }] : []),
        { label: 'Escalate to manager', actionType: 'escalate' },
        { label: 'Acknowledged — dismiss', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── pricing-{id}-{N} (pricing book validation) ──
  if (id.startsWith('pricing-')) {
    return {
      issueType: 'pricing_config_warning',
      recommendedFix: {
        label: `Edit Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Dismiss — configuration is correct', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── code-{ruleId}-{N} (Louisiana building code) ──
  if (id.startsWith('code-')) {
    return {
      issueType: 'code_violation',
      recommendedFix: warning.recommendedFix
        ? undefined // keep existing code-supplied fix
        : {
            label: `Fix Code Issue — Opening${n !== undefined ? ` #${n}` : ''}`,
            actionType: 'route_focus',
            payload: { tab: 'pricing', openingNumber: n },
          },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus' as ActionType, payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Escalate to manager', actionType: 'escalate' },
        { label: 'Apply code override with reason', actionType: 'dismiss_with_reason', requiresReason: true },
      ],
    };
  }

  // ── remakeAI-{id} (remake prevention AI) ──
  if (id.startsWith('remakeAI-')) {
    return {
      issueType: 'remake_risk',
      recommendedFix: warning.recommendedFix ?? {
        label: `Review Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n },
      },
      alternativeFixes: [
        ...(n !== undefined ? [{ label: `Open Opening #${n} editor`, actionType: 'route_focus' as ActionType, payload: { tab: 'pricing', openingNumber: n } }] : []),
        { label: 'Escalate to manager', actionType: 'escalate' },
        { label: 'Acknowledged — proceed with caution', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── sketch-missing_front_door-g ──
  if (id.startsWith('sketch-missing_front_door')) {
    return {
      issueType: 'sketch_missing_front_door',
      recommendedFix: {
        label: 'Place Front Door Marker',
        actionType: 'route_focus',
        payload: { tab: 'sketch', hash: '#sketch', focusTarget: 'place_front_door' },
      },
      alternativeFixes: [
        { label: 'Go to sketch — add front door', actionType: 'route_focus', payload: { tab: 'sketch' } },
        { label: 'Dismiss — no front door at this property', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── sketch-no_linked_opening-{N} ──
  if (id.startsWith('sketch-no_linked_opening')) {
    return {
      issueType: 'sketch_marker_no_opening',
      recommendedFix: {
        label: `Link Marker${n !== undefined ? ` #${n}` : ''} to Opening`,
        actionType: 'route_focus',
        payload: { tab: 'sketch', openingNumber: n },
      },
      alternativeFixes: [
        { label: 'Go to sketch — link marker', actionType: 'route_focus', payload: { tab: 'sketch' } },
        { label: 'Create opening from marker', actionType: 'apply_quote_options', payload: { action: 'reconcile_openings' } },
      ],
    };
  }

  // ── sketch-missing_dimensions-{N} ──
  if (id.startsWith('sketch-missing_dimensions')) {
    return {
      issueType: 'sketch_missing_dimensions',
      recommendedFix: {
        label: `Enter Dimensions — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: 'width' },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Go to sketch to measure', actionType: 'route_focus', payload: { tab: 'sketch' } },
      ],
    };
  }

  // ── sketch-missing_window_type-{N} ──
  if (id.startsWith('sketch-missing_window_type')) {
    return {
      issueType: 'sketch_missing_window_type',
      recommendedFix: {
        label: `Select Window Type — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n, focusField: 'productCategory' },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
      ],
    };
  }

  // ── sketch-{type}-{N} (any remaining sketch sync warnings) ──
  if (id.startsWith('sketch-')) {
    return {
      issueType: 'sketch_sync_warning',
      recommendedFix: {
        label: `Fix in Sketch${n !== undefined ? ` — Marker #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'sketch', openingNumber: n },
      },
      alternativeFixes: [
        { label: 'Open sketch', actionType: 'route_focus', payload: { tab: 'sketch' } },
        { label: 'Dismiss', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  // ── rule-{ruleId}-{N} (business rules engine) ──
  if (id.startsWith('rule-')) {
    // Extract ruleId to give useful context
    const ruleId = id.replace(/^rule-/, '').replace(/-\d+$/, '');
    const isScreen = ruleId.includes('screen');
    const isOriel = ruleId.includes('oriel');
    const isTrimHeader = ruleId.includes('trim') || ruleId.includes('header');

    if (isTrimHeader) {
      return {
        issueType: 'trim_header_recommended',
        recommendedFix: {
          label: `Add Trim + Header — Opening${n !== undefined ? ` #${n}` : ''}`,
          actionType: 'apply_field_update',
          payload: { target: 'opening', openingNumber: n, fields: { trimRequired: true, headerRequired: true } },
        },
        alternativeFixes: [
          { label: 'Add trim only', actionType: 'apply_field_update', payload: { target: 'opening', openingNumber: n, fields: { trimRequired: true } } },
          { label: 'Add header only', actionType: 'apply_field_update', payload: { target: 'opening', openingNumber: n, fields: { headerRequired: true } } },
          { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
          { label: 'Customer declined — dismiss', actionType: 'dismiss_with_reason', requiresReason: true },
        ],
      };
    }

    if (isOriel) {
      return {
        issueType: 'oriel_split_needed',
        recommendedFix: {
          label: `Enter Oriel Split — Opening${n !== undefined ? ` #${n}` : ''}`,
          actionType: 'route_focus',
          payload: { tab: 'pricing', openingNumber: n, focusField: 'specialtyNotes' },
        },
        alternativeFixes: [
          { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
          { label: 'Escalate — specialty shape', actionType: 'escalate' },
        ],
      };
    }

    if (isScreen) {
      return {
        issueType: 'screen_option_needed',
        recommendedFix: {
          label: `Set Screen Option — Opening${n !== undefined ? ` #${n}` : ''}`,
          actionType: 'route_focus',
          payload: { tab: 'pricing', openingNumber: n, focusField: 'screenOption' },
        },
        alternativeFixes: [
          { label: 'No screen — picture window', actionType: 'apply_field_update', payload: { target: 'opening', openingNumber: n, fields: { screenOption: 'None' } } },
          { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus', payload: { tab: 'pricing', openingNumber: n } },
        ],
      };
    }

    // Generic rule fix
    return {
      issueType: `rule_${ruleId}`,
      recommendedFix: warning.recommendedFix ?? {
        label: `Fix Rule Issue — Opening${n !== undefined ? ` #${n}` : ''}`,
        actionType: 'route_focus',
        payload: { tab: 'pricing', openingNumber: n },
      },
      alternativeFixes: [
        { label: `Open Opening${n !== undefined ? ` #${n}` : ''} editor`, actionType: 'route_focus' as ActionType, payload: { tab: 'pricing', openingNumber: n } },
        { label: 'Dismiss', actionType: 'dismiss_with_reason' },
      ],
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Enrich a warning with recommended + alternative actions
// ─────────────────────────────────────────────────────────────────────
export function enrichValidationWarning(warning: UnifiedWarning): UnifiedWarning {
  // Exact registry match
  let actionDef: ActionDefinition | null = ISSUE_ACTION_REGISTRY[warning.id] ?? null;

  // Pattern-based fallback
  if (!actionDef) actionDef = resolveActionByPattern(warning);

  if (actionDef) {
    return {
      ...warning,
      recommendedFix: (warning.recommendedFix || actionDef.recommendedFix) as any,
      alternativeFixes: (warning.alternativeFixes?.length ? warning.alternativeFixes : actionDef.alternativeFixes) as any,
    };
  }

  // Last-resort fallback: route to the correct tab based on category
  if (!warning.recommendedFix) {
    let tab = 'home';
    if (warning.category === 'order') tab = 'proposal';
    if (warning.category === 'pricing') tab = 'pricing';
    if (warning.category === 'sketch') tab = 'sketch';
    if (warning.openingNumber !== undefined) tab = 'pricing';

    return {
      ...warning,
      recommendedFix: {
        label: warning.openingNumber !== undefined ? `Edit Opening #${warning.openingNumber}` : 'Open Section',
        actionType: 'route_focus',
        payload: {
          tab,
          openingNumber: warning.openingNumber,
          focusTarget: warning.fieldPath?.split('.').pop(),
        },
      } as any,
    };
  }

  return warning;
}

// ── Helper: human-readable field label ──────────────────────────────
function fieldLabel(field: string): string {
  const MAP: Record<string, string> = {
    width: 'Width',
    height: 'Height',
    roomLocation: 'Room / Location',
    elevation: 'Elevation',
    productCategory: 'Product Type',
    interiorColor: 'Interior Color',
    exteriorColor: 'Exterior Color',
    gridStyle: 'Grid Style',
    glassPackage: 'Glass Package',
    removalType: 'Removal Type',
    openingDepth: 'Return Depth',
    temperedGlass: 'Tempered Glass',
    obscureGlass: 'Obscure Glass',
    specialtyNotes: 'Oriel Sash Split',
    radius: 'Radius',
    legHeight: 'Leg Height',
    screenOption: 'Screen Option',
    totalPrice: 'Total Price',
    trimRequired: 'Vinyl Trim',
    headerRequired: 'Header Flashing',
    actualMeasurementBasis: 'Measurement Basis',
    cutbackRequired: 'Stucco Cutback',
    orielUpperSashHeight: 'Oriel Sash Height',
    measurementGuidanceAccepted: 'Guidance Acknowledgment',
    outsidePhotoId: 'Outside Photo',
    measurementVisualAnnotationId: 'Photo Annotation',
    removalDetail: 'Removal Detail',
    trimIncluded: 'Trim Included',
    headerFlashingIncluded: 'Header Flashing Included',
  };
  return MAP[field] ?? field.replace(/([A-Z])/g, ' $1').trim();
}
