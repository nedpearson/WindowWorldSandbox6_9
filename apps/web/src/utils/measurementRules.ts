// ═══════════════════════════════════════════════════════════════
// Window World — Measurement Rule Engine
// Configurable takeoff/deduction rules for all window types,
// exterior surfaces, and install types.
//
// IMPORTANT: All deduction values marked NEEDS_VERIFICATION must
// be confirmed by Window World management before being applied
// to real orders. Admin-configurable via Supabase.
// ═══════════════════════════════════════════════════════════════

export type ExteriorType = 'brick' | 'siding' | 'wood' | 'stucco' | 'vinyl' | 'other';
export type InstallType = 'EXT' | 'INT' | 'full_frame' | 'insert' | 'replacement' | 'other';
export type RemovalType = 'ALUM' | 'wood' | 'vinyl' | 'full_frame' | 'none';

export type MeasurementRuleStatus = 'verified' | 'needs_verification' | 'draft' | 'inactive';
export type MeasurementType = 'width' | 'height' | 'leg_height' | 'rise' | 'radius' | 'custom_radius' | 'top_sash_width' | 'top_sash_height';

export interface MeasurementRule {
  id: string;
  name: string;
  description: string;
  status: MeasurementRuleStatus;
  actionType?: string;
  windowType?: string;        // 'oriel' | 'double_hung' | 'picture' | etc.
  exteriorType?: ExteriorType | null;
  installType?: InstallType | null;
  removalType?: RemovalType | null;
  // Deduction amounts (applied to raw field measurement)
  widthTakeoffFraction?: string;   // e.g. "1/4"
  heightTakeoffFraction?: string;
  widthTakeoffDecimal?: number;    // in inches (e.g. 0.25)
  heightTakeoffDecimal?: number;
  minDeduction?: number;
  maxDeduction?: number;
  // Behavior
  requiresConfirmation: boolean;
  requiresPhoto: boolean;
  requiresNote: boolean;
  severity: 'blocker' | 'high' | 'medium' | 'low' | 'info';
  // Metadata
  effectiveDate?: string;
  version: number;
  createdBy?: string;
  notes?: string;
}

export interface MeasurementAdjustment {
  rawWidth: number;
  rawHeight: number;
  adjustedWidth: number;
  adjustedHeight: number;
  widthTakeoff: number;
  heightTakeoff: number;
  ruleId?: string;
  ruleName?: string;
  ruleStatus: MeasurementRuleStatus;
  requiresConfirmation: boolean;
  requiresPhoto: boolean;
  notes: string[];
  warnings: string[];
  approved: boolean;
  approvedAt?: Date;
  overrideReason?: string;
}

// ─── CONFIGURABLE MEASUREMENT RULES ─────────────────────────
// These are seeded into Supabase. NEEDS_VERIFICATION rules must
// be confirmed by Window World before live use.
export const MEASUREMENT_RULES: MeasurementRule[] = [

  // ── ORIEL WINDOWS ───────────────────────────────────────
  {
    id: 'mr-oriel-top-sash',
    name: 'Oriel — Top Sash Measurement',
    description: 'Oriel windows must always be measured using the TOP SASH. No width/height deduction is applied — the top sash measurement IS the order measurement. This rule enforces top sash confirmation.',
    status: 'verified',
    windowType: 'oriel',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'blocker',
    version: 1,
    notes: 'Oriel: always use top sash measurement as-is for the order form.',
  },

  // ── STANDARD INSERT / BRICK ──────────────────────────────
  {
    id: 'mr-insert-brick-std',
    name: 'Insert Install / Brick — Standard Takeoff',
    description: 'Standard insert into brick opening. Apply 1/4" takeoff to width and height. NEEDS_VERIFICATION — confirm with Window World installer guidelines.',
    status: 'needs_verification',
    installType: 'INT',
    exteriorType: 'brick',
    widthTakeoffFraction: '1/4',
    widthTakeoffDecimal: 0.25,
    heightTakeoffFraction: '1/4',
    heightTakeoffDecimal: 0.25,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm brick insert takeoff with Window World.',
  },

  // ── FULL FRAME / SIDING ──────────────────────────────────
  {
    id: 'mr-fullframe-siding',
    name: 'Full Frame Install / Siding — No Deduction',
    description: 'Full frame replacement in siding opening. Measure rough opening width and height. No takeoff applied — uses full RO. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    installType: 'EXT',
    exteriorType: 'siding',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'medium',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm full-frame siding takeoff rules.',
  },

  // ── EXT INSTALL / BRICK ──────────────────────────────────
  {
    id: 'mr-ext-brick',
    name: 'EXT Install / Brick — No Takeoff',
    description: 'EXT (exterior) install in brick. Measure from the existing frame. No standard deduction. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    installType: 'EXT',
    exteriorType: 'brick',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'medium',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm EXT brick measurement protocol.',
  },

  // ── SPECIALTY / CIRCLE TOP ───────────────────────────────
  {
    id: 'mr-circle-top-radius',
    name: 'Circle Top — Radius Measurement',
    description: 'Circle top windows require width, leg height, and rise measurement. Radius is computed as (rise/2) + (width²/8·rise). No standard width/height takeoff.',
    status: 'verified',
    windowType: 'circle_top',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'high',
    version: 1,
    notes: 'Circle top: collect width, leg height, rise. App computes radius.',
  },

  // ── SPECIALTY / EYEBROW ──────────────────────────────────
  {
    id: 'mr-eyebrow',
    name: 'Eyebrow Window — Width + Rise + Leg Height',
    description: 'Eyebrow windows require width, rise (center height), and left/right leg heights. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: 'eyebrow',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm eyebrow measurement set.',
  },

  // ── SPECIALTY / ARCH ────────────────────────────────────
  {
    id: 'mr-arch',
    name: 'Arch / Half Round — Width + Height + Rise',
    description: 'Full arch/half-round: measure overall width and height. Rise = height. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: 'arch',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm arch measurement protocol.',
  },

  // ── SPECIALTY / QUARTER ARCH ─────────────────────────────
  {
    id: 'mr-quarter-arch',
    name: 'Quarter Arch — Width + Height + Leg Heights',
    description: 'Quarter arch: width, height, left leg height, right leg height required. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: 'quarter_arch',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm quarter arch dimension requirements.',
  },

  // ── PATIO DOOR ──────────────────────────────────────────
  {
    id: 'mr-patio-door',
    name: 'Patio Door — Rough Opening Measurement',
    description: 'Patio doors: measure rough opening width and height. Confirm door swing direction and panel configuration. NEEDS_VERIFICATION for takeoff.',
    status: 'needs_verification',
    windowType: 'patio_door',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm patio door RO measurement protocol.',
  },
];

// ─── FIND BEST MATCHING RULE ─────────────────────────────────
export function findMeasurementRule(
  windowType?: string,
  exteriorType?: string,
  installType?: string,
  rules: MeasurementRule[] = MEASUREMENT_RULES,
): MeasurementRule | null {
  const wt = (windowType || '').toLowerCase();
  const et = (exteriorType || '').toLowerCase() as ExteriorType;
  const it = (installType || '').toUpperCase() as InstallType;

  // Priority: most-specific match first
  const candidates = rules.filter(r => {
    const matchWT = !r.windowType || r.windowType.toLowerCase() === wt;
    const matchET = !r.exteriorType || r.exteriorType === et;
    const matchIT = !r.installType || r.installType.toUpperCase() === it;
    return matchWT && matchET && matchIT;
  });

  if (candidates.length === 0) return null;

  // Score specificity
  const scored = candidates.map(r => ({
    rule: r,
    score: (r.windowType ? 3 : 0) + (r.exteriorType ? 2 : 0) + (r.installType ? 1 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].rule;
}

// ─── APPLY RULE TO RAW MEASUREMENTS ─────────────────────────
export function applyMeasurementRule(
  rawWidth: number,
  rawHeight: number,
  rule: MeasurementRule | null,
): MeasurementAdjustment {
  if (!rule) {
    return {
      rawWidth, rawHeight,
      adjustedWidth: rawWidth,
      adjustedHeight: rawHeight,
      widthTakeoff: 0,
      heightTakeoff: 0,
      ruleStatus: 'needs_verification',
      requiresConfirmation: true,
      requiresPhoto: false,
      notes: [],
      warnings: ['⚠️ No verified measurement rule found. Manual review required. Do not apply without rep approval.'],
      approved: false,
    };
  }

  const widthTakeoff = rule.widthTakeoffDecimal ?? 0;
  const heightTakeoff = rule.heightTakeoffDecimal ?? 0;
  
  let adjustedWidth = Math.max(0, rawWidth - widthTakeoff);
  let adjustedHeight = Math.max(0, rawHeight - heightTakeoff);

  const notes: string[] = [];
  const warnings: string[] = [];

  if (rule.status === 'needs_verification') {
    warnings.push(`⚠️ Rule "${rule.name}" is marked NEEDS_VERIFICATION. Confirm with Window World before finalizing.`);
  }

  const action = (rule.actionType || 'deduct').toLowerCase();

  if (action === 'warn') {
    adjustedWidth = rawWidth;
    adjustedHeight = rawHeight;
    warnings.push(`⚠️ [Warning] ${rule.description || `${rule.name} triggered.`}`);
  } else if (action === 'block') {
    adjustedWidth = rawWidth;
    adjustedHeight = rawHeight;
    warnings.push(`🛑 [BLOCKER] ${rule.description || `${rule.name} prevents final export.`}`);
  } else if (action === 'require_photo') {
    warnings.push(`📷 Photo verification required: ${rule.name}`);
  } else if (action === 'require_note') {
    warnings.push(`📝 Install note required: ${rule.name}`);
  } else if (action === 'require_confirmation') {
    warnings.push(`✅ Rep confirmation required: ${rule.name}`);
  } else {
    // Default 'deduct' action
    if (widthTakeoff > 0) notes.push(`Width deduction: ${widthTakeoff}" (${rule.widthTakeoffFraction || widthTakeoff + '"'})`);
    if (heightTakeoff > 0) notes.push(`Height deduction: ${heightTakeoff}" (${rule.heightTakeoffFraction || heightTakeoff + '"'})`);
    if (widthTakeoff === 0 && heightTakeoff === 0) notes.push('No deduction applied — measure is order-ready size.');
  }

  const requiresConfirmation = rule.requiresConfirmation || action === 'require_confirmation';
  const requiresPhoto = rule.requiresPhoto || action === 'require_photo';
  const requiresNote = rule.requiresNote || action === 'require_note';

  if (requiresNote) warnings.push('📝 This rule requires an install note.');
  if (requiresPhoto) warnings.push('📷 This rule requires a measurement photo.');

  return {
    rawWidth, rawHeight,
    adjustedWidth, adjustedHeight,
    widthTakeoff: action === 'deduct' ? widthTakeoff : 0,
    heightTakeoff: action === 'deduct' ? heightTakeoff : 0,
    ruleId: rule.id,
    ruleName: rule.name,
    ruleStatus: rule.status,
    requiresConfirmation,
    requiresPhoto,
    notes, warnings,
    approved: false,
  };
}

// ─── SPECIALTY SHAPE DIMENSION REQUIREMENTS ──────────────────
export interface SpecialtyDimensionSet {
  id: string;
  windowType: string;
  label: string;
  icon: string;
  requiredDimensions: SpecialtyDimension[];
  optionalDimensions: SpecialtyDimension[];
  requiredPhotos: string[];
  requiresSketchMarker: boolean;
  computedFields?: ComputedField[];
  orderFormNotes: string;
  status: MeasurementRuleStatus;
}

export interface SpecialtyDimension {
  key: string;
  label: string;
  unit: 'inches' | 'fraction_inches';
  hint?: string;
  min?: number;
  max?: number;
}

export interface ComputedField {
  key: string;
  label: string;
  formula: string;
  description: string;
}

export const SPECIALTY_DIMENSION_SETS: SpecialtyDimensionSet[] = [
  {
    id: 'spec-oriel',
    windowType: 'oriel',
    label: 'Oriel Window',
    icon: '🪟',
    requiredDimensions: [
      { key: 'orielUpperSashHeight', label: 'Top Sash Height', unit: 'fraction_inches', hint: 'Measure THE TOP SASH only' },
    ],
    optionalDimensions: [
      { key: 'overallWidth', label: 'Overall Unit Width', unit: 'fraction_inches', hint: 'Full oriel unit width (reference only)' },
      { key: 'overallHeight', label: 'Overall Unit Height', unit: 'fraction_inches', hint: 'Full oriel unit height (reference only)' },
    ],
    requiredPhotos: ['Tape on top sash width', 'Tape on top sash height'],
    requiresSketchMarker: true,
    orderFormNotes: 'Oriel measured by top sash.',
    status: 'verified',
  },
  {
    id: 'spec-circle-top',
    windowType: 'circle_top',
    label: 'Circle Top / Extended Leg',
    icon: '⌒',
    requiredDimensions: [
      { key: 'width', label: 'Width', unit: 'fraction_inches', hint: 'Full unit width at widest point' },
      { key: 'legHeight', label: 'Leg Height', unit: 'fraction_inches', hint: 'Rectangular portion height below the arch' },
      { key: 'rise', label: 'Rise (center height above legs)', unit: 'fraction_inches', hint: 'Height of arch from top of leg to crown' },
    ],
    optionalDimensions: [
      { key: 'customRadius', label: 'Custom Radius', unit: 'fraction_inches', hint: 'Leave blank to auto-compute from width and rise' },
    ],
    requiredPhotos: ['Width tape measurement', 'Leg height tape measurement', 'Rise tape measurement'],
    requiresSketchMarker: true,
    computedFields: [{ key: 'radius', label: 'Computed Radius', formula: '(rise/2) + (width²/8·rise)', description: 'Auto-computed from width and rise' }],
    orderFormNotes: 'Circle top — see leg height and radius fields.',
    status: 'verified',
  },
  {
    id: 'spec-eyebrow',
    windowType: 'eyebrow',
    label: 'Eyebrow Window',
    icon: '⌢',
    requiredDimensions: [
      { key: 'width', label: 'Width', unit: 'fraction_inches', hint: 'Full width at widest point' },
      { key: 'rise', label: 'Rise (center height)', unit: 'fraction_inches', hint: 'Center height from base chord to crown' },
      { key: 'legHeightLeft', label: 'Left Leg Height', unit: 'fraction_inches', hint: 'Left side leg height (may be 0)' },
      { key: 'legHeightRight', label: 'Right Leg Height', unit: 'fraction_inches', hint: 'Right side leg height (may be 0)' },
    ],
    optionalDimensions: [
      { key: 'customRadius', label: 'Custom Radius (if asymmetric)', unit: 'fraction_inches' },
    ],
    requiredPhotos: ['Width tape', 'Rise tape', 'Overall unit photo'],
    requiresSketchMarker: true,
    orderFormNotes: 'Eyebrow window — see rise and leg height fields.',
    status: 'needs_verification',
  },
  {
    id: 'spec-arch',
    windowType: 'arch',
    label: 'Full Arch / Half Round',
    icon: '⌣',
    requiredDimensions: [
      { key: 'width', label: 'Width', unit: 'fraction_inches', hint: 'Full arch width (diameter)' },
      { key: 'height', label: 'Height', unit: 'fraction_inches', hint: 'Full arch height (should be ≈ width/2 for half round)' },
    ],
    optionalDimensions: [],
    requiredPhotos: ['Width tape', 'Height tape'],
    requiresSketchMarker: true,
    orderFormNotes: 'Full arch/half round.',
    status: 'needs_verification',
  },
  {
    id: 'spec-quarter-arch',
    windowType: 'quarter_arch',
    label: 'Quarter Arch',
    icon: '◜',
    requiredDimensions: [
      { key: 'width', label: 'Width', unit: 'fraction_inches', hint: 'Full unit width' },
      { key: 'height', label: 'Height', unit: 'fraction_inches', hint: 'Full unit height' },
      { key: 'legHeightLeft', label: 'Left Leg Height', unit: 'fraction_inches' },
      { key: 'legHeightRight', label: 'Right Leg Height', unit: 'fraction_inches' },
    ],
    optionalDimensions: [
      { key: 'customRadius', label: 'Custom Radius', unit: 'fraction_inches' },
    ],
    requiredPhotos: ['Width tape', 'Height tape', 'Corner detail'],
    requiresSketchMarker: true,
    orderFormNotes: 'Quarter arch — see leg heights.',
    status: 'needs_verification',
  },
  {
    id: 'spec-picture',
    windowType: 'picture',
    label: 'Picture / Fixed Window',
    icon: '🖼️',
    requiredDimensions: [
      { key: 'width', label: 'Width', unit: 'fraction_inches' },
      { key: 'height', label: 'Height', unit: 'fraction_inches' },
    ],
    optionalDimensions: [],
    requiredPhotos: [],
    requiresSketchMarker: false,
    orderFormNotes: '',
    status: 'verified',
  },
  {
    id: 'spec-patio-door',
    windowType: 'patio_door',
    label: 'Patio / Sliding Glass Door',
    icon: '🚪',
    requiredDimensions: [
      { key: 'width', label: 'Rough Opening Width', unit: 'fraction_inches', hint: 'Measure rough opening width' },
      { key: 'height', label: 'Rough Opening Height', unit: 'fraction_inches', hint: 'Measure rough opening height' },
    ],
    optionalDimensions: [
      { key: 'panelConfiguration', label: 'Panel Config (e.g. OXO, XO)', unit: 'inches' },
    ],
    requiredPhotos: [],
    requiresSketchMarker: true,
    orderFormNotes: 'Patio door — confirm swing and panel config.',
    status: 'needs_verification',
  },
  {
    id: 'spec-custom',
    windowType: 'custom_shape',
    label: 'Custom / Geometric Shape',
    icon: '✦',
    requiredDimensions: [
      { key: 'width', label: 'Width', unit: 'fraction_inches' },
      { key: 'height', label: 'Height', unit: 'fraction_inches' },
    ],
    optionalDimensions: [
      { key: 'legHeight', label: 'Leg Height', unit: 'fraction_inches' },
      { key: 'rise', label: 'Rise', unit: 'fraction_inches' },
      { key: 'customRadius', label: 'Custom Radius', unit: 'fraction_inches' },
      { key: 'legHeightLeft', label: 'Left Leg Height', unit: 'fraction_inches' },
      { key: 'legHeightRight', label: 'Right Leg Height', unit: 'fraction_inches' },
    ],
    requiredPhotos: ['Unit photo', 'All tape measurements'],
    requiresSketchMarker: true,
    orderFormNotes: 'Custom shape — see all dimension fields.',
    status: 'needs_verification',
  },
];

export function getSpecialtyDimensionSet(windowType: string): SpecialtyDimensionSet | null {
  return SPECIALTY_DIMENSION_SETS.find(s => s.windowType === windowType) || null;
}

// ─── COMPUTE DERIVED FIELDS ──────────────────────────────────
export function computeCircleTopRadius(width: number, rise: number): number {
  if (!rise || !width) return 0;
  return (rise / 2) + (Math.pow(width, 2) / (8 * rise));
}

// ─── MEASUREMENT EXPORT READINESS ───────────────────────────
export interface MeasurementExportCheck {
  blocked: boolean;
  blockers: string[];
  warnings: string[];
}

export function checkMeasurementExportReadiness(
  openings: any[],
  adjustments: Record<number, MeasurementAdjustment>,
): MeasurementExportCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const op of openings) {
    const opNum = op.openingNumber || 1;
    const adj = adjustments[opNum];

    // Oriel: top sash must be confirmed and upper sash height provided
    const isOriel = (op.productCategory || op.model || '').toLowerCase().includes('oriel');
    if (isOriel) {
      if (!op.topSashConfirmed) {
        blockers.push(`Opening #${opNum}: Oriel window — top sash measurement NOT confirmed.`);
      }
      if (!op.orielUpperSashHeight) {
        blockers.push(`Opening #${opNum}: Oriel window — upper sash height missing.`);
      }
    }

    // Specialty: check required dimensions
    const spec = getSpecialtyDimensionSet(op.productCategory || '');
    if (spec) {
      for (const dim of spec.requiredDimensions) {
        const val = op[dim.key] || op.specialtyDimensions?.[dim.key];
        if (!val) {
          blockers.push(`Opening #${opNum}: Missing required dimension "${dim.label}" for ${spec.label}.`);
        }
      }
    }

    // Unapproved adjustment
    if (adj && !adj.approved && adj.ruleId) {
      blockers.push(`Opening #${opNum}: Measurement adjustment not approved by rep.`);
    }

    // Missing rule with no override
    if (adj && !adj.ruleId && !adj.overrideReason) {
      warnings.push(`Opening #${opNum}: No measurement rule applied — verify dimensions manually.`);
    }

    // Unverified rule
    if (adj && adj.ruleStatus === 'needs_verification') {
      warnings.push(`Opening #${opNum}: Applied rule marked NEEDS_VERIFICATION — confirm with Window World.`);
    }
  }

  return { blocked: blockers.length > 0, blockers, warnings };
}
