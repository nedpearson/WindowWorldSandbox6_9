// ═══════════════════════════════════════════════════════════════
// Central Validation Orchestrator
// Single entry point that calls ALL rule engines and normalizes
// output into a unified ProjectValidationReport.
// ═══════════════════════════════════════════════════════════════

import { validateOpening, validateOpeningWithStage, calculateProjectHealth } from './openingValidation';
import { evaluateRules, type RuleResult } from './businessRules';
import { reviewJob, type EstimatorAlert } from './seniorEstimator';
import { validateWindowConfiguration, type ValidationResult as PricingValidationResult, type WindowConfig } from './pricingValidation';
import { evaluateSafetyGlazingRules, buildSafetyReview, type OpeningSafetyReview } from './safetyGlazingRules';
import { findMeasurementRule, applyMeasurementRule, getSpecialtyDimensionSet } from './measurementRules';
import { validateSketchSync, type SyncWarning, type SketchMarkerData, type MarkerGroupData } from './sketchSync';
import { explainRule, type RuleExplanation } from './ruleExplainability';
import { applyWarningIntelligence, getIntelligenceSummary, type EnrichedWarning, type WarningIntelligence } from './warningIntelligence';
import { detectConflicts, type RuleConflict } from './ruleConflictDetector';
import { buildFixPlan, type FixPlan } from './fixPrioritization';
import { runIntegrityCheck, type IntegrityReport } from './validationIntegrity';
import { validateLouisianaCode, type CodeViolation } from './louisianaCode';
import { analyzeRemakeRisks } from './remakePreventionAI';
import { runMeasurementIntelligence } from './measurementIntelligence';
import { enrichValidationWarning } from '../lib/reviewIssueActions';
import {
  ORDER_FORM_HEADER, CONTRACT_FIELDS, SPECIALTY_SHAPES, CASEMENT_AWNING,
  type FormFieldDef,
} from './formFieldDefs';

// Step mapping for jump-to-fix
const STEP_MAP: Record<string, number> = {
  'Customer': 0, 'Job Info': 1, 'Sketch': 2, 'Openings': 2, 'Measurements': 2,
  'Product & Options': 2, 'Installation': 2, 'Pricing': 3, 'Order Form': 6,
  'Contract': 6, 'Product Counts': 6, 'Job Scope': 6, 'Acknowledgments': 6,
  'Signatures': 7, 'Header': 0,
};

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function getVal(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function shouldCheck(field: FormFieldDef, opening?: any, appointment?: any): boolean {
  if (!field.condition) return true;
  switch (field.condition) {
    case 'isSpecialtyShape': return opening && SPECIALTY_SHAPES.includes(opening.productCategory);
    case 'isCasementOrAwning': return opening && CASEMENT_AWNING.includes(opening.productCategory);
    case 'hasGrid': return opening && opening.gridPattern && opening.gridPattern !== 'None';
    case 'preLead1978Home': return appointment?.customer?.preLead1978 === true;
    default: return true;
  }
}

// ── Unified Warning Type ────────────────────────────────────
export type UnifiedSeverity = 'critical' | 'high' | 'warning' | 'info';
export type WarningCategory =
  | 'measurement' | 'screen' | 'grid' | 'tempered' | 'color'
  | 'specialty' | 'pricing' | 'mull' | 'brick' | 'order'
  | 'sketch' | 'egress' | 'consistency' | 'geometry'
  | 'energy' | 'sill_height' | 'door' | 'siding'
  | 'bedroom' | 'bathroom' | 'low_glass' | 'stair_proximity'
  | 'replacement' | 'installation';

export type ValidationStage = 'quick_price' | 'full_details' | 'contract_ready' | 'production_handoff';

export interface UnifiedWarning {
  id: string;
  severity: UnifiedSeverity;
  category: WarningCategory;
  stage: ValidationStage;
  source: string; // which engine produced it
  openingNumber?: number;
  title: string;
  detail: string;
  suggestion?: string;
  recommendedFix?: RecommendedFix;
  alternativeFixes?: AlternativeFix[];
  routeTarget?: { step: number; field?: string };
  fieldPath?: string;
  blocksSubmission: boolean;
  // ── Rule Explainability (populated during enrichment pass) ──
  explanation?: RuleExplanation;
}

export interface RecommendedFix {
  label: string;
  actionType: 'apply_quote_options' | 'set_fields' | 'dismiss_with_reason' | 'escalate' | 'route_focus' | 'apply_field_update' | 'schedule_follow_up' | 'manual_required' | 'open_modal' | 'generate_document' | 'apply_product_option';
  payload?: any;
  priceImpact?: number;
  commissionImpact?: number;
  requiresConfirmation?: boolean;
  issueId?: string;
  issueType?: string;
}

export interface AlternativeFix {
  label: string;
  actionType: 'apply_quote_options' | 'set_fields' | 'dismiss_with_reason' | 'escalate' | 'route_focus' | 'apply_field_update' | 'schedule_follow_up' | 'manual_required' | 'open_modal' | 'generate_document' | 'apply_product_option';
  payload?: any;
  requiresReason?: boolean;
  issueId?: string;
  issueType?: string;
}

export interface ProjectValidationReport {
  warnings: UnifiedWarning[];
  bySeverity: Record<UnifiedSeverity, UnifiedWarning[]>;
  byCategory: Record<string, UnifiedWarning[]>;
  byOpening: Record<number, UnifiedWarning[]>;
  global: UnifiedWarning[]; // not tied to a specific opening
  counts: { critical: number; high: number; warning: number; info: number; total: number };
  submissionBlocked: boolean;
  submissionBlockers: string[];
  projectHealth: ReturnType<typeof calculateProjectHealth> | null;
  safetyReviews: OpeningSafetyReview[];
  timestamp: number;
  // ── Warning Intelligence metadata ──
  intelligence: {
    total: number;
    visible: number;
    suppressed: number;
    byConfidence: Record<string, number>;
    avgConfidence: number;
    groupCount: number;
  };
  // ── Rule Conflicts ──
  conflicts: RuleConflict[];
  // ── Fix Prioritization ──
  fixPlan: FixPlan;
  // ── Integrity Check ──
  integrity: IntegrityReport;
  // ── Section Completion ──
  sections: Record<string, { total: number; filled: number; pct: number }>;
  overallPct: number;
}

// ── Severity normalization helpers ──────────────────────────
function normSeverity(s: string): UnifiedSeverity {
  const l = s.toLowerCase();
  if (l === 'critical' || l === 'blocker') return 'critical';
  if (l === 'high') return 'high';
  if (l === 'medium' || l === 'warning') return 'warning';
  return 'info';
}

function determineStage(source: string, category: WarningCategory, field?: string): ValidationStage {
  if (source === 'openingValidation' && field) {
    if (['width', 'height', 'productCategory', 'windowType', 'exteriorColor', 'model', 'seriesModel'].includes(field)) {
      return 'quick_price';
    }
    return 'full_details';
  }
  if (source === 'pricingValidation' || source === 'safetyGlazing') {
    return 'quick_price';
  }
  if (category === 'tempered' || category === 'pricing' || category === 'specialty' || category === 'screen' || category === 'grid' || category === 'color') {
    return 'quick_price';
  }
  if (source === 'louisianaCode' || source === 'remakePreventionAI') {
    return 'contract_ready';
  }
  return 'full_details';
}

// ── MAIN ORCHESTRATOR ───────────────────────────────────────
export function runFullValidation(
  openings: any[],
  markers: SketchMarkerData[],
  groups: MarkerGroupData[],
  appointment: any,
  opts: { isBrickHouse?: boolean; safetyReviews?: OpeningSafetyReview[]; maxVisibleWarnings?: number } = {},
): ProjectValidationReport {
  const warnings: UnifiedWarning[] = [];
  const isBrick = opts.isBrickHouse ?? false;

  const sectionCounts: Record<string, { total: number; filled: number }> = {};
  const track = (section: string, isFilled: boolean) => {
    if (!sectionCounts[section]) sectionCounts[section] = { total: 0, filled: 0 };
    sectionCounts[section].total++;
    if (isFilled) sectionCounts[section].filled++;
  };

  const customer = appointment?.customer || {};
  const signatures = appointment?.signatures || [];

  // ─── 0. ORDER FORM HEADER / CUSTOMER ──────────────────
  for (const field of ORDER_FORM_HEADER) {
    if (!shouldCheck(field, null, appointment)) continue;
    let val: any;
    if (field.source === 'customer') val = getVal(customer, field.dataPath);
    else if (field.source === 'appointment') val = getVal(appointment, field.dataPath);
    const filled = !isEmpty(val);
    track(field.section, filled);
    if (field.required && !filled) {
      warnings.push({
        id: `header-${field.id}`,
        severity: normSeverity(field.severity),
        category: 'order',
        stage: 'quick_price',
        source: 'validationEngine',
        title: `Missing: ${field.label}`,
        detail: `The ${field.label} field is required.`,
        fieldPath: `${field.source}.${field.dataPath}`,
        blocksSubmission: field.severity === 'BLOCKER',
      });
    }
  }

  // ─── 0. CONTRACT FIELDS & SIGNATURES ──────────────────
  for (const field of CONTRACT_FIELDS) {
    if (!shouldCheck(field, null, appointment)) continue;
    let val: any;
    if (field.source === 'customer') val = getVal(customer, field.dataPath);
    else if (field.source === 'pricing' || field.source === 'appointment') val = getVal(appointment, field.dataPath);
    else if (field.source === 'signature') val = signatures.find((s: any) => s.signerRole === field.dataPath);
    else if (field.dataPath.startsWith('_computed_')) {
      const cats = openings.map((o: any) => o.productCategory);
      if (field.dataPath === '_computed_dh_count') val = cats.filter(c => c === 'double_hung').length;
      else if (field.dataPath === '_computed_other_count') val = cats.filter(c => !['double_hung', 'patio_door', ...SPECIALTY_SHAPES].includes(c)).length;
      else if (field.dataPath === '_computed_spec_count') val = cats.filter(c => SPECIALTY_SHAPES.includes(c)).length;
      else if (field.dataPath === '_computed_door_count') val = cats.filter(c => c === 'patio_door').length;
    }

    const filled = !isEmpty(val);
    track(field.section, filled);

    if (field.required && !filled) {
      warnings.push({
        id: `contract-${field.id}`,
        severity: normSeverity(field.severity),
        category: 'order',
        stage: 'contract_ready',
        source: 'validationEngine',
        title: `Missing: ${field.label}`,
        detail: `Contract requires ${field.label}.`,
        fieldPath: `${field.source}.${field.dataPath}`,
        blocksSubmission: field.severity === 'BLOCKER',
      });
    }
  }

  // ─── 0. OPENING COUNT VALIDATION ──────────────────────
  if (openings.length === 0) {
    if (markers.length > 0) {
      warnings.push({
        id: 'no-openings-linked',
        severity: 'critical',
        category: 'order',
        stage: 'quick_price',
        source: 'validationEngine',
        title: 'Sketch markers exist, but no openings priced',
        detail: `${markers.length} openings drawn on sketch, but 0 openings linked to pricing.`,
        fieldPath: 'openings',
        blocksSubmission: true,
      });
    } else {
      warnings.push({
        id: 'no-openings',
        severity: 'critical',
        category: 'order',
        stage: 'quick_price',
        source: 'validationEngine',
        title: 'No openings entered',
        detail: 'At least one window/door opening is required for this appointment.',
        fieldPath: 'openings',
        blocksSubmission: true,
      });
    }
  }

  // ─── 0. PRICING RECONCILIATION VALIDATION ─────────────
  if (appointment?.subtotal > 0) {
    const computedTotal = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
    if (Math.abs(computedTotal - appointment.subtotal) > 0.01) {
      if (computedTotal === 0 && openings.length > 0) {
        warnings.push({
          id: 'pricing-mismatch-unpriced',
          severity: 'critical',
          category: 'pricing',
          stage: 'contract_ready',
          source: 'validationEngine',
          title: 'Pricing exists, but openings are unpriced',
          detail: `Proposal subtotal is $${appointment.subtotal.toFixed(2)}, but none of the ${openings.length} openings have pricing assigned.`,
          fieldPath: 'pricing.subtotal',
          blocksSubmission: true,
        });
      } else if (computedTotal === 0 && openings.length === 0) {
        // Only warn if the rep has NOT deliberately confirmed this is intentional
        if (!appointment?.jobLevelPriceConfirmed) {
          warnings.push({
            id: 'pricing-mismatch-no-openings',
            severity: 'warning',
            category: 'pricing',
            stage: 'contract_ready',
            source: 'validationEngine',
            title: 'Job-level price used',
            detail: `A job-level subtotal of $${appointment.subtotal.toFixed(2)} exists without individual opening prices.`,
            fieldPath: 'pricing.subtotal',
            blocksSubmission: false,
          });
        }
      } else {
        warnings.push({
          id: 'reconcile-mismatch',
          severity: 'critical',
          category: 'pricing',
          stage: 'contract_ready',
          source: 'validationEngine',
          title: 'Opening totals do not match proposal subtotal',
          detail: `Opening totals ($${computedTotal.toFixed(2)}) do not match subtotal ($${appointment.subtotal.toFixed(2)}).`,
          fieldPath: 'pricing.subtotal',
          blocksSubmission: true,
        });
      }
    }
  }

  // ─── 1. Sketch Sync Warnings ────────────────────────────
  const syncWarnings = validateSketchSync(markers, openings, groups);
  for (const sw of syncWarnings) {
    warnings.push({
      id: `sketch-${sw.type}-${sw.markerNumber ?? sw.openingNumber ?? 'g'}`,
      severity: normSeverity(sw.severity),
      category: 'sketch',
      stage: determineStage('sketchSync', 'sketch'),
      source: 'sketchSync',
      openingNumber: sw.markerNumber ?? sw.openingNumber,
      title: sw.type.replace(/_/g, ' '),
      detail: sw.message,
      blocksSubmission: sw.severity === 'blocker',
    });
  }

  // ─── 2. Per-Opening Validation (openingValidation.ts) ───
  for (const op of openings) {
    const v = validateOpeningWithStage(op, openings, isBrick, 'save_item');

    for (const mf of v.missingFields) {
      warnings.push({
        id: `missing-${mf.field}-${op.openingNumber}`,
        severity: mf.severity === 'required' ? 'critical' : 'warning',
        category: 'order',
        stage: determineStage('openingValidation', 'order', mf.field),
        source: 'openingValidation',
        openingNumber: op.openingNumber,
        title: `Missing: ${mf.label}`,
        detail: `Opening #${op.openingNumber} is missing ${mf.label}.`,
        fieldPath: `opening.${op.openingNumber}.${mf.field}`,
        blocksSubmission: mf.severity === 'required',
      });
    }

    for (const w of v.warnings) {
      const cat: WarningCategory = w.code === 'tempered' ? 'tempered'
        : w.code === 'depth' ? 'brick'
        : w.code === 'outlier' ? 'consistency'
        : w.code === 'risk' ? 'measurement'
        : 'order';
      warnings.push({
        id: `ov-${w.code}-${op.openingNumber}`,
        severity: normSeverity(w.severity),
        category: cat,
        stage: determineStage('openingValidation', cat),
        source: 'openingValidation',
        openingNumber: op.openingNumber,
        title: w.message.slice(0, 60),
        detail: w.message,
        blocksSubmission: w.severity === 'critical',
        recommendedFix: w.code === 'tempered' ? { label: 'Add tempered glass', actionType: 'set_fields', payload: { fields: { temperedGlass: 'full' }, targetOpenings: [op.openingNumber] } } : undefined,
      });
    }
  }

  // ─── 2a. Measurement Guidance Consistency Check ──────────────────
  for (const op of openings) {
    const ext = (op.exteriorType || '').toLowerCase();
    const surface = (op.exteriorSurface || '').toLowerCase();

    // 1. Exterior selected has measurement basis.
    if ((op.exteriorType || op.exteriorSurface) && !op.actualMeasurementBasis) {
      warnings.push({
        id: `missing-actualMeasurementBasis-${op.openingNumber}`,
        severity: 'critical',
        category: 'measurement',
        stage: 'full_details',
        source: 'measurementGuidanceConsistency',
        openingNumber: op.openingNumber,
        title: 'Missing: Measurement Basis',
        detail: `Opening #${op.openingNumber}: Exterior selected (${op.exteriorType || op.exteriorSurface}) requires measurement basis selection.`,
        recommendedFix: {
          label: 'Select Measurement Basis',
          actionType: 'route_focus',
          payload: { tab: 'pricing', openingNumber: op.openingNumber, field: 'actualMeasurementBasis', focusField: 'actualMeasurementBasis' },
        },
        blocksSubmission: true,
      });
    }

    // 2. Stucco has cutback decision.
    if ((ext.includes('stucco') || surface.includes('stucco')) && (op.cutbackRequired === null || op.cutbackRequired === undefined)) {
      warnings.push({
        id: `missing-cutbackRequired-${op.openingNumber}`,
        severity: 'critical',
        category: 'siding',
        stage: 'full_details',
        source: 'measurementGuidanceConsistency',
        openingNumber: op.openingNumber,
        title: 'Missing: Stucco Cutback Decision',
        detail: `Opening #${op.openingNumber}: Stucco requires a cutback decision.`,
        recommendedFix: {
          label: 'Select Cutback Option',
          actionType: 'route_focus',
          payload: { tab: 'pricing', openingNumber: op.openingNumber, field: 'cutbackRequired', focusField: 'cutbackRequired' },
        },
        blocksSubmission: true,
      });
    }

    // 3. Stucco aluminum removal maps correctly.
    if ((ext.includes('stucco') || surface.includes('stucco')) && op.removalType === 'ALUM' && op.removalDetail !== 'Remove Aluminum from Stucco') {
      warnings.push({
        id: `missing-removalDetail-${op.openingNumber}`,
        severity: 'high',
        category: 'installation',
        stage: 'full_details',
        source: 'measurementGuidanceConsistency',
        openingNumber: op.openingNumber,
        title: 'Incorrect Stucco Removal Detail',
        detail: `Opening #${op.openingNumber}: Stucco with aluminum removal should specify 'Remove Aluminum from Stucco'.`,
        recommendedFix: {
          label: 'Set Removal Detail',
          actionType: 'apply_field_update',
          payload: { target: 'opening', openingNumber: op.openingNumber, fields: { removalDetail: 'Remove Aluminum from Stucco' } },
        },
        blocksSubmission: false,
      });
    }

    // 4. Siding/wood trim/header flashing recommendation accepted or overridden.
    const isSidingOrWood = ext.includes('siding') || ext.includes('wood') || surface.includes('siding') || surface.includes('wood');
    if (isSidingOrWood && op.trimIncluded === null && op.headerFlashingIncluded === null && !op.measurementGuidanceAccepted) {
      warnings.push({
        id: `missing-measurementGuidanceAccepted-${op.openingNumber}`,
        severity: 'high',
        category: 'siding',
        stage: 'full_details',
        source: 'measurementGuidanceConsistency',
        openingNumber: op.openingNumber,
        title: 'Guidance Acknowledgment Needed',
        detail: `Opening #${op.openingNumber}: Siding/Wood exterior measurement guidance must be accepted or overridden.`,
        recommendedFix: {
          label: 'Accept Recommended Guidance',
          actionType: 'apply_field_update',
          payload: { target: 'opening', openingNumber: op.openingNumber, fields: { trimIncluded: true, headerFlashingIncluded: true, measurementGuidanceAccepted: true } },
        },
        blocksSubmission: false,
      });
    }

    // 5. Mull has window numbers and contract mapping.
    if (op.installMullion) {
      const hasMullDetails = op.customerNotes?.toLowerCase().includes('mull') || op.installNotes?.toLowerCase().includes('mull') || op.mullGroup;
      if (!hasMullDetails) {
        warnings.push({
          id: `missing-mull-details-${op.openingNumber}`,
          severity: 'critical',
          category: 'mull',
          stage: 'contract_ready',
          source: 'measurementGuidanceConsistency',
          openingNumber: op.openingNumber,
          title: 'Missing Mull Details',
          detail: `Opening #${op.openingNumber}: Mull is selected but missing window numbers or group configuration.`,
          recommendedFix: {
            label: 'Open Mulling Section',
            actionType: 'route_focus',
            payload: { tab: 'pricing', openingNumber: op.openingNumber, field: 'installMullion', focusField: 'installMullion' },
          },
          blocksSubmission: true,
        });
      }
    }

    // 6. Special shape has required fields and pricing.
    const cat = (op.productCategory || '').toLowerCase();
    const isSpecialShape = ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape', 'special_shape'].includes(cat) || (op.seriesModel || '').startsWith('S1');
    if (isSpecialShape) {
      if (!op.width || !op.height || !op.legHeight) {
        warnings.push({
          id: `missing-special-shape-fields-${op.openingNumber}`,
          severity: 'critical',
          category: 'specialty',
          stage: 'contract_ready',
          source: 'measurementGuidanceConsistency',
          openingNumber: op.openingNumber,
          title: 'Missing Specialty Dimensions',
          detail: `Opening #${op.openingNumber}: Special shape requires Width, Full Height, and Leg Height.`,
          recommendedFix: {
            label: 'Enter Leg Height',
            actionType: 'route_focus',
            payload: { tab: 'pricing', openingNumber: op.openingNumber, field: 'legHeight', focusField: 'legHeight' },
          },
          blocksSubmission: true,
        });
      }
    }

    // 7. Oriel has top sash height if selected.
    if (op.oriel && !op.orielUpperSashHeight) {
      warnings.push({
        id: `missing-orielUpperSashHeight-${op.openingNumber}`,
        severity: 'critical',
        category: 'specialty',
        stage: 'contract_ready',
        source: 'measurementGuidanceConsistency',
        openingNumber: op.openingNumber,
        title: 'Missing Sash Split Height',
        detail: `Opening #${op.openingNumber}: Oriel double hung requires top sash height.`,
        recommendedFix: {
          label: 'Enter Oriel Sash Height',
          actionType: 'route_focus',
          payload: { tab: 'pricing', openingNumber: op.openingNumber, field: 'orielUpperSashHeight', focusField: 'orielUpperSashHeight' },
        },
        blocksSubmission: true,
      });
    }

    // 8. Photo annotations linked if used.
    if (op.outsidePhotoId && !op.measurementVisualAnnotationId) {
      warnings.push({
        id: `missing-measurementVisualAnnotationId-${op.openingNumber}`,
        severity: 'high',
        category: 'measurement',
        stage: 'full_details',
        source: 'measurementGuidanceConsistency',
        openingNumber: op.openingNumber,
        title: 'Annotation Required',
        detail: `Opening #${op.openingNumber}: Outside photo is uploaded but has no arrow annotation.`,
        recommendedFix: {
          label: 'Annotate Photo',
          actionType: 'route_focus',
          payload: { tab: 'pricing', openingNumber: op.openingNumber, field: 'outsidePhotoId', focusField: 'outsidePhotoId' },
        },
        blocksSubmission: false,
      });
    }
  }

  // ─── 3. Business Rules Engine ───────────────────────────
  for (const op of openings) {
    const ruleResults = evaluateRules(op, { allOpenings: openings, appointment }, ['opening_save', 'form_validate', 'pre_export']);
    for (const rr of ruleResults) {
      // Check if any action has a set_field with a quick-fix
      const setAction = rr.actions.find(a => a.type === 'set_field' && a.field);
      const suggestion = setAction ? `Auto-set ${setAction.field} to "${setAction.value}"` : undefined;
      const recommendedFix = setAction && setAction.field
        ? { label: `Apply: ${setAction.message?.slice(0, 30) || rr.ruleName}`, actionType: 'set_fields' as const, payload: { fields: { [setAction.field]: setAction.value }, targetOpenings: [op.openingNumber] } }
        : undefined;

      for (const action of rr.actions) {
        if (action.type === 'add_warning' || action.type === 'require_confirmation' || action.type === 'flag_field') {
          const cat: WarningCategory =
            rr.ruleId.includes('screen') ? 'screen'
            : rr.ruleId.includes('color') ? 'color'
            : rr.ruleId.includes('oriel') ? 'specialty'
            : rr.ruleId.includes('special-shape') ? 'specialty'
            : rr.ruleId.includes('siding') || rr.ruleId.includes('wood') || rr.ruleId.includes('header') || rr.ruleId.includes('cutback') || rr.ruleId.includes('trim') ? 'siding'
            : rr.ruleId.includes('dimension') ? 'measurement'
            : 'order';
          warnings.push({
            id: `rule-${rr.ruleId}-${op.openingNumber}`,
            severity: normSeverity(rr.severity),
            category: cat,
            stage: determineStage('businessRules', cat),
            source: 'businessRules',
            openingNumber: op.openingNumber,
            title: rr.ruleName,
            detail: action.message || rr.ruleName,
            suggestion,
            recommendedFix,
            blocksSubmission: rr.severity === 'blocker',
          });
        }
      }
    }
  }

  // ─── 3a. Explicit Blocker Checks for New Exterior Rules ─
  for (const op of openings) {
    // Rule A: Special shape trim required but not selected — hard blocker
    if (op.specialShapeTrimRequired && !op.specialShapeTrimSelected) {
      const key = `blocker-special-shape-trim-${op.openingNumber}`;
      if (!warnings.find(w => w.id === key)) {
        warnings.push({
          id: key,
          severity: 'critical',
          category: 'specialty',
          stage: 'contract_ready',
          source: 'exteriorRules',
          openingNumber: op.openingNumber,
          title: 'Special Shape Trim — Not Confirmed',
          detail: `Opening #${op.openingNumber}: Special shape trim is required but has not been confirmed or priced. This must be resolved before the contract can be finalized.`,
          suggestion: 'Open the opening editor and confirm special shape trim.',
          recommendedFix: {
            label: 'Confirm Special Shape Trim',
            actionType: 'set_fields',
            payload: { fields: { specialShapeTrimSelected: true }, targetOpenings: [op.openingNumber] },
          },
          blocksSubmission: true,
        });
      }
    }

    // Rule A: Special shape trim required but no price — pricing blocker
    if (op.specialShapeTrimRequired && op.specialShapeTrimSelected && !op.specialShapeTrimPrice) {
      const key = `blocker-special-shape-trim-price-${op.openingNumber}`;
      if (!warnings.find(w => w.id === key)) {
        warnings.push({
          id: key,
          severity: 'critical',
          category: 'pricing',
          stage: 'contract_ready',
          source: 'exteriorRules',
          openingNumber: op.openingNumber,
          title: 'Special Shape Trim — Missing Price',
          detail: `Opening #${op.openingNumber}: Special shape trim is required but has no price. Add the price in Admin or contact your manager before finalizing the contract.`,
          blocksSubmission: true,
        });
      }
    }

    // Rule C: Header required but not selected — hard blocker
    if (op.headerRequired && !op.headerSelected && !op.headerFlashingSelected) {
      const key = `blocker-header-required-${op.openingNumber}`;
      if (!warnings.find(w => w.id === key)) {
        warnings.push({
          id: key,
          severity: 'critical',
          category: 'siding',
          stage: 'contract_ready',
          source: 'exteriorRules',
          openingNumber: op.openingNumber,
          title: 'Header Flashing — Not Added',
          detail: `Opening #${op.openingNumber}: Header flashing is required for this siding/outside-measure opening but has not been added. This must be resolved before the contract can be finalized.`,
          suggestion: 'Open the opening editor and confirm header flashing.',
          recommendedFix: {
            label: 'Add Header Flashing',
            actionType: 'set_fields',
            payload: { fields: { headerSelected: true, headerFlashingSelected: true }, targetOpenings: [op.openingNumber] },
            requiresConfirmation: false,
          },
          blocksSubmission: true,
        });
      }
    }

    // Rule D: Trim decision outstanding on siding/outside measure
    if (op.trimRequiredReview && !op.trimDecision) {
      const key = `warn-trim-decision-${op.openingNumber}`;
      if (!warnings.find(w => w.id === key)) {
        warnings.push({
          id: key,
          severity: 'high',
          category: 'siding',
          stage: 'full_details',
          source: 'exteriorRules',
          openingNumber: op.openingNumber,
          title: 'Trim Decision Needed',
          detail: `Opening #${op.openingNumber}: Trim decision is required for this siding/outside-measure opening. Choose: Add Trim / Not Needed / Manager Review.`,
          blocksSubmission: false, // high priority but not a hard blocker until manager_review escalation
        });
      }
    }

    // Rule B: Cutback review outstanding
    if (op.cutbackLikely && !op.cutbackReviewStatus) {
      const key = `warn-cutback-review-${op.openingNumber}`;
      if (!warnings.find(w => w.id === key)) {
        warnings.push({
          id: key,
          severity: 'high',
          category: 'siding',
          stage: 'full_details',
          source: 'exteriorRules',
          openingNumber: op.openingNumber,
          title: 'Cutback Review Pending',
          detail: `Opening #${op.openingNumber}: Outside measure on siding — cutback decision not yet recorded. Confirm whether cutback is needed.`,
          blocksSubmission: false,
        });
      }
    }
  }

  // ─── 4. Pricing Book Validation ─────────────────────────
  for (const op of openings) {
    const config: WindowConfig = {
      series: op.seriesModel,
      model: op.model,
      productCategory: op.productCategory,
      width: op.width,
      height: op.height,
      orielSize: op.orielUpperSashHeight,
      hasOriel: op.oriel,
      screenType: (op.screenOption || '').toLowerCase().includes('full') ? 'full' : (op.screenOption || '').toLowerCase().includes('half') ? 'half' : undefined,
      gridType: op.gridType || op.gridStyle,
      gridPattern: op.gridPattern,
      isSDL: op.isSDL,
      sdlSize: op.sdlSize,
      vinylColor: op.vinylColor,
      exteriorColor: op.exteriorColor !== 'White' ? op.exteriorColor : undefined,
      interiorColor: op.interiorColor !== 'White' ? op.interiorColor : undefined,
      isSpecialShape: ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape', 'special_shape'].includes(op.productCategory),
      specialShapeType: op.shapeType || op.productCategory,
      installType: op.installType,
      exteriorType: op.exteriorType,
      hasTrim: op.trimRequired,
      hasHeaderFlashing: op.headerRequired,
      removalType: op.removalType,
      roomType: (op.roomLocation || '').toLowerCase().includes('bath') ? 'bathroom' : undefined,
      nailFins: op.nailFin,
    };
    const pricingResults = validateWindowConfiguration(config);
    for (const pr of pricingResults) {
      // Deduplicate: don't re-add if already covered by business rules
      const dupeKey = `pricing-${pr.id}-${op.openingNumber}`;
      if (warnings.find(w => w.id === dupeKey)) continue;
      const cat: WarningCategory = pr.category.toLowerCase().includes('screen') ? 'screen'
          : pr.category.toLowerCase().includes('grid') ? 'grid'
          : pr.category.toLowerCase().includes('oriel') ? 'specialty'
          : pr.category.toLowerCase().includes('color') ? 'color'
          : pr.category.toLowerCase().includes('tempered') ? 'tempered'
          : pr.category.toLowerCase().includes('special') ? 'specialty'
          : pr.category.toLowerCase().includes('size') ? 'measurement'
          : 'pricing';
      warnings.push({
        id: dupeKey,
        severity: normSeverity(pr.severity),
        category: cat,
        stage: determineStage('pricingValidation', cat),
        source: 'pricingValidation',
        openingNumber: op.openingNumber,
        title: pr.message.slice(0, 80),
        detail: pr.message,
        suggestion: pr.suggestion,
        blocksSubmission: pr.severity === 'critical',
      });
    }
  }

  // ─── 5. Safety Glazing Rules ────────────────────────────
  const safetyReviews: OpeningSafetyReview[] = [];
  for (const op of openings) {
    const existing = opts.safetyReviews?.find(r => r.openingNumber === op.openingNumber);
    const review = existing ?? buildSafetyReview(op, op.openingNumber);
    safetyReviews.push(review);

    for (const flag of review.flags) {
      warnings.push({
        id: `safety-${flag.ruleId}-${op.openingNumber}`,
        severity: normSeverity(flag.severity),
        category: 'tempered',
        stage: determineStage('safetyGlazing', 'tempered'),
        source: 'safetyGlazing',
        openingNumber: op.openingNumber,
        title: flag.ruleName,
        detail: flag.flagReason,
        recommendedFix: flag.severity === 'high' ? { label: 'Add tempered glass', actionType: 'set_fields', payload: { fields: { temperedGlass: 'full' }, targetOpenings: [op.openingNumber] } } : undefined,
        blocksSubmission: flag.severity === 'high' && review.temperedRequired === 'not_reviewed',
      });
    }
  }

  // ─── 6. Senior Estimator Cross-Check ────────────────────
  const estimatorAlerts = reviewJob(openings);
  for (const ea of estimatorAlerts) {
    // Deduplicate against existing warnings
    if (warnings.find(w => w.id === `est-${ea.id}`)) continue;
    const cat: WarningCategory = ea.category.toLowerCase().includes('dimension') ? 'measurement'
        : ea.category.toLowerCase().includes('geometry') ? 'geometry'
        : ea.category.toLowerCase().includes('tempered') ? 'tempered'
        : ea.category.toLowerCase().includes('screen') ? 'screen'
        : ea.category.toLowerCase().includes('grid') ? 'grid'
        : ea.category.toLowerCase().includes('consistency') ? 'consistency'
        : ea.category.toLowerCase().includes('pricing') ? 'pricing'
        : ea.category.toLowerCase().includes('install') ? 'brick'
        : 'order';
    warnings.push({
      id: `est-${ea.id}`,
      severity: normSeverity(ea.severity),
      category: cat,
      stage: determineStage('seniorEstimator', cat),
      source: 'seniorEstimator',
      openingNumber: ea.openingNumbers[0],
      title: ea.title,
      detail: ea.detail,
      recommendedFix: ea.fix ? { label: ea.fix.label, actionType: 'set_fields', payload: { fields: (ea.fix as any).fields || (ea.fix as any).payload?.fields, targetOpenings: ea.fix.targets } } : undefined,
      blocksSubmission: ea.severity === 'critical',
    });
  }

  // ─── 7. Measurement Rule Checks ─────────────────────────
  for (const op of openings) {
    if (isBrick && (!op.openingDepth || op.openingDepth === 0)) {
      const key = `meas-depth-${op.openingNumber}`;
      if (!warnings.find(w => w.id === key)) {
        warnings.push({
          id: key,
          severity: 'critical',
          category: 'brick',
          stage: determineStage('measurementRules', 'brick'),
          source: 'measurementRules',
          openingNumber: op.openingNumber,
          title: 'Brick opening missing depth',
          detail: `Opening #${op.openingNumber}: Brick replacement requires depth measurement for proper installation.`,
          suggestion: 'Open depth measurement popup and record return depth.',
          blocksSubmission: true,
        });
      }
    }

    // Specialty dimension checks
    const spec = getSpecialtyDimensionSet(op.productCategory || '');
    if (spec) {
      for (const dim of spec.requiredDimensions) {
        const val = op[dim.key] || op.specialtyDimensions?.[dim.key];
        if (!val) {
          warnings.push({
            id: `spec-dim-${dim.key}-${op.openingNumber}`,
            severity: 'critical',
            category: 'specialty',
            stage: determineStage('measurementRules', 'specialty'),
            source: 'measurementRules',
            openingNumber: op.openingNumber,
            title: `Missing ${dim.label}`,
            detail: `${spec.label} #${op.openingNumber} requires ${dim.label}. ${dim.hint || ''}`,
            blocksSubmission: true,
          });
        }
      }
    }
  }

  // ─── 7a. Measurement Intelligence (Outliers & Transpositions) ─
  const measWarnings = runMeasurementIntelligence(openings);
  for (const mw of measWarnings) {
    if (!warnings.find(w => w.id === mw.id)) {
      warnings.push(mw);
    }
  }

  // ─── 8. Louisiana Building Code Engine ───────────────────
  for (const op of openings) {
    const codeViolations = validateLouisianaCode(op, openings);
    for (const cv of codeViolations) {
      const key = `code-${cv.ruleId}-${cv.openingNumber}`;
      if (warnings.find(w => w.id === key)) continue;
      warnings.push({
        id: key,
        severity: normSeverity(cv.rule.severity),
        category: cv.rule.category as WarningCategory,
        stage: determineStage('louisianaCode', cv.rule.category as WarningCategory),
        source: 'louisianaCode',
        openingNumber: cv.openingNumber,
        title: cv.rule.name,
        detail: cv.detail,
        suggestion: cv.rule.howToFix,
        recommendedFix: cv.recommendedFix ? { label: cv.recommendedFix.label, actionType: 'set_fields', payload: { fields: cv.recommendedFix.fields, targetOpenings: [cv.openingNumber] } } : undefined,
        fieldPath: cv.currentValue ? `opening.${cv.openingNumber}` : undefined,
        blocksSubmission: cv.rule.blocksSubmission,
        explanation: {
          whatIsWrong: cv.detail,
          whyItMatters: cv.rule.whyItMatters,
          consequence: `Code violation: ${cv.rule.codeRef} (${cv.rule.codeSource})`,
          howToFix: cv.rule.howToFix,
          sourceRule: `${cv.rule.codeRef} — ${cv.rule.codeSource}`,
          overrideAllowed: cv.rule.overrideAllowed,
          overrideRequires: cv.rule.overrideRequires,
        },
      });
    }
  }

  // ─── 9. Remake Prevention AI ──────────────────────────────
  const remakeRisks = analyzeRemakeRisks(openings, groups);
  for (const risk of remakeRisks) {
    const key = `remakeAI-${risk.id}`;
    if (warnings.find(w => w.id === key)) continue;
    
    // Add AI indicator prefix
    const titleWithAI = `🤖 AI Prediction: ${risk.title}`;
    
    warnings.push({
      id: key,
      severity: risk.severity,
      category: risk.riskType === 'missing_field' ? 'order' : risk.riskType === 'install_issue' ? 'installation' : 'consistency',
      stage: determineStage('remakePreventionAI', risk.riskType === 'missing_field' ? 'order' : risk.riskType === 'install_issue' ? 'installation' : 'consistency'),
      source: 'remakePreventionAI',
      openingNumber: risk.openingNumbers[0],
      title: titleWithAI,
      detail: risk.detail + ` (Risk Probability: ${risk.probability}%)`,
      blocksSubmission: risk.severity === 'critical',
    });
  }

  // ─── Deduplicate ────────────────────────────────────────
  const seen = new Set<string>();
  const deduped = warnings.filter(w => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });

  // ─── Enrich with Rule Explainability ────────────────────
  for (const w of deduped) {
    w.explanation = explainRule(w.id, w.detail, w.openingNumber);
    // Upgrade title and detail from explanation if richer
    if (w.explanation.affectedField && !w.fieldPath) {
      w.fieldPath = w.explanation.affectedField;
    }
  }

  // ─── Warning Intelligence Pipeline ─────────────────────
  // Scores confidence, removes false positives, suppresses
  // noise, groups related warnings, and prioritizes by
  // actionability. This replaces the old severity-only sort.
  const intelligent = applyWarningIntelligence(deduped, openings, { maxVisibleWarnings: opts.maxVisibleWarnings });
  const visibleWarnings = intelligent.filter(w => !w.intelligence.suppressed).map(enrichValidationWarning);
  const intelligenceSummary = getIntelligenceSummary(intelligent);

  // ─── Group results (only visible warnings) ─────────────
  const bySeverity: Record<UnifiedSeverity, UnifiedWarning[]> = { critical: [], high: [], warning: [], info: [] };
  const byCategory: Record<string, UnifiedWarning[]> = {};
  const byOpening: Record<number, UnifiedWarning[]> = {};
  const global: UnifiedWarning[] = [];

  for (const w of visibleWarnings) {
    bySeverity[w.severity].push(w);
    if (!byCategory[w.category]) byCategory[w.category] = [];
    byCategory[w.category].push(w);
    if (w.openingNumber !== undefined) {
      if (!byOpening[w.openingNumber]) byOpening[w.openingNumber] = [];
      byOpening[w.openingNumber].push(w);
    } else {
      global.push(w);
    }
  }

  // Blockers check ALL warnings (including suppressed) — critical issues cannot be hidden
  const blockers = intelligent.filter(w => w.blocksSubmission && !w.intelligence.suppressed);

  const projectHealth = openings.length > 0 ? calculateProjectHealth(openings, isBrick) : null;

  const report: ProjectValidationReport = {
    warnings: visibleWarnings,
    bySeverity,
    byCategory,
    byOpening,
    global,
    counts: {
      critical: bySeverity.critical.length,
      high: bySeverity.high.length,
      warning: bySeverity.warning.length,
      info: bySeverity.info.length,
      total: visibleWarnings.length,
    },
    submissionBlocked: blockers.length > 0,
    submissionBlockers: blockers.map(b => b.detail),
    projectHealth,
    safetyReviews,
    timestamp: Date.now(),
    intelligence: intelligenceSummary,
    conflicts: detectConflicts(intelligent),
    fixPlan: buildFixPlan(visibleWarnings),
    integrity: null as any, // filled below
    sections: {} as any, // filled below
    overallPct: 0,
  };

  // Final pass: section completion metrics
  const sections: Record<string, { total: number; filled: number; pct: number }> = {};
  for (const [k, v] of Object.entries(sectionCounts)) {
    sections[k] = { ...v, pct: v.total > 0 ? Math.round((v.filled / v.total) * 100) : 0 };
  }
  const totalChecks = Object.values(sectionCounts).reduce((s, v) => s + v.total, 0);
  const totalFilled = Object.values(sectionCounts).reduce((s, v) => s + v.filled, 0);
  report.sections = sections;
  report.overallPct = totalChecks > 0 ? Math.round((totalFilled / totalChecks) * 100) : 0;

  // Final pass: integrity check (needs completed report)
  report.integrity = runIntegrityCheck(report, openings, markers);

  return report;
}

// ── Quick fix applicator ────────────────────────────────────
export function applyRecommendedFix(
  openings: any[],
  fix: RecommendedFix,
): any[] {
  return openings.map(op => {
    if (fix.payload?.targetOpenings?.includes(op.openingNumber)) {
      return { ...op, ...fix.payload?.fields };
    }
    return op;
  });
}

// ── Category display helpers ────────────────────────────────
export const CATEGORY_LABELS: Record<WarningCategory, { icon: string; label: string; color: string }> = {
  measurement: { icon: '📏', label: 'Measurements', color: '#f85149' },
  screen: { icon: '🪟', label: 'Screen Rules', color: '#d29922' },
  grid: { icon: '🔲', label: 'Grid Rules', color: '#d29922' },
  tempered: { icon: '🛡️', label: 'Tempered Glass', color: '#f85149' },
  color: { icon: '🎨', label: 'Color Rules', color: '#bc8cff' },
  specialty: { icon: '⬡', label: 'Specialty Shapes', color: '#f0883e' },
  pricing: { icon: '💰', label: 'Pricing', color: '#d29922' },
  mull: { icon: '🔗', label: 'Mull Rules', color: '#58a6ff' },
  brick: { icon: '🧱', label: 'Brick / Install', color: '#d2691e' },
  order: { icon: '📋', label: 'Order Completeness', color: '#8b949e' },
  sketch: { icon: '✏️', label: 'Sketch Sync', color: '#6366f1' },
  egress: { icon: '🚪', label: 'Egress', color: '#f85149' },
  consistency: { icon: '🔄', label: 'Consistency', color: '#d29922' },
  geometry: { icon: '📐', label: 'Geometry', color: '#f85149' },
  energy: { icon: '⚡', label: 'Energy Code', color: '#22c55e' },
  sill_height: { icon: '📏', label: 'Sill Height', color: '#f97316' },
  door: { icon: '🚪', label: 'Door Rules', color: '#7c3aed' },
  siding: { icon: '🏠', label: 'Siding / Exterior', color: '#64748b' },
  bedroom: { icon: '🛏️', label: 'Bedroom Safety', color: '#f85149' },
  bathroom: { icon: '🛁', label: 'Bathroom Safety', color: '#0ea5e9' },
  low_glass: { icon: '⬇️', label: 'Low Glass Hazard', color: '#f97316' },
  stair_proximity: { icon: '🪜', label: 'Stair Proximity', color: '#f97316' },
  replacement: { icon: '🔄', label: 'Replacement Rules', color: '#d29922' },
  installation: { icon: '🔧', label: 'Installation', color: '#d2691e' },
};

export const SEVERITY_CONFIG: Record<UnifiedSeverity, { icon: string; label: string; color: string; bg: string }> = {
  critical: { icon: '🛑', label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  high:     { icon: '⚠️', label: 'High Risk', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  warning:  { icon: '💡', label: 'Warning',   color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  info:     { icon: 'ℹ️', label: 'Info',       color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
};
