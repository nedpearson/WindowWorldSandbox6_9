// ═══════════════════════════════════════════════════════════════
// Validation Service — Client-side validation abstraction
// Combines opening validation, safety glazing, and measurement
// checks into a single unified validation pipeline.
// ═══════════════════════════════════════════════════════════════

import type { Opening } from '../types';
import { calculateUI, quickTemperedCheck, calculateGlassArea } from './calculations';

// ─── Types ───────────────────────────────────────────────────
export interface ValidationIssue {
  id: string;
  field: string;
  severity: 'blocker' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  autoFixable: boolean;
  autoFixValue?: any;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  completionPct: number;
  blockerCount: number;
}

// ─── Required Fields ─────────────────────────────────────────
const REQUIRED_FIELDS: { field: keyof Opening; label: string; severity: 'blocker' | 'high' }[] = [
  { field: 'width', label: 'Width', severity: 'blocker' },
  { field: 'height', label: 'Height', severity: 'blocker' },
  { field: 'productCategory', label: 'Window Type', severity: 'blocker' },
  { field: 'roomLocation', label: 'Room Location', severity: 'high' },
  { field: 'elevation', label: 'Elevation', severity: 'high' },
  { field: 'exteriorType', label: 'Exterior Material', severity: 'high' },
  { field: 'removalType', label: 'Removal Type', severity: 'high' },
];

/**
 * Validate a single opening. Returns issues sorted by severity.
 * This runs client-side for instant feedback.
 * The server /api/validation endpoint is the authority.
 */
export function validateOpening(opening: Partial<Opening>): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required fields check
  for (const { field, label, severity } of REQUIRED_FIELDS) {
    const val = opening[field];
    if (val === undefined || val === null || val === '' || val === 0) {
      issues.push({
        id: `missing-${field}`,
        field,
        severity,
        message: `${label} is required`,
        autoFixable: false,
      });
    }
  }

  // Dimension sanity checks
  if (opening.width && opening.width > 0) {
    if (opening.width < 10) {
      issues.push({ id: 'width-small', field: 'width', severity: 'high', message: 'Width under 10" — verify measurement', autoFixable: false });
    }
    if (opening.width > 120) {
      issues.push({ id: 'width-large', field: 'width', severity: 'high', message: 'Width over 120" — verify or check if mulled', autoFixable: false });
    }
  }

  if (opening.height && opening.height > 0) {
    if (opening.height < 10) {
      issues.push({ id: 'height-small', field: 'height', severity: 'high', message: 'Height under 10" — verify measurement', autoFixable: false });
    }
    if (opening.height > 96) {
      issues.push({ id: 'height-large', field: 'height', severity: 'medium', message: 'Height over 96" — may need structural review', autoFixable: false });
    }
  }

  // UI tier check
  if (opening.width && opening.height) {
    const ui = calculateUI(opening.width, opening.height);
    if (ui > 150) {
      issues.push({ id: 'ui-oversized', field: 'unitedInches', severity: 'medium', message: `United inches (${ui}) exceeds 150 — oversized pricing may apply`, autoFixable: false });
    }
  }

  // Tempered glass quick check
  const tempered = quickTemperedCheck({
    roomLocation: opening.roomLocation,
    width: opening.width,
    height: opening.height,
  });
  if (tempered.likely && opening.temperedGlass === 'none') {
    issues.push({
      id: 'tempered-likely',
      field: 'temperedGlass',
      severity: 'high',
      message: `Tempered glass likely required: ${tempered.reason}`,
      autoFixable: false,
    });
  }

  // Calculate completion percentage
  const totalFields = REQUIRED_FIELDS.length;
  const completedFields = REQUIRED_FIELDS.filter(({ field }) => {
    const val = opening[field];
    return val !== undefined && val !== null && val !== '' && val !== 0;
  }).length;
  const completionPct = Math.round((completedFields / totalFields) * 100);

  // Sort by severity
  const severityOrder: Record<string, number> = { blocker: 0, high: 1, medium: 2, low: 3, info: 4 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const blockerCount = issues.filter(i => i.severity === 'blocker').length;

  return {
    isValid: blockerCount === 0,
    issues,
    completionPct,
    blockerCount,
  };
}

/**
 * Validate all openings for an appointment.
 * Returns overall readiness status.
 */
export function validateAllOpenings(openings: Partial<Opening>[]): {
  allValid: boolean;
  totalBlockers: number;
  totalIssues: number;
  overallCompletionPct: number;
  perOpening: Map<number, ValidationResult>;
} {
  const perOpening = new Map<number, ValidationResult>();
  let totalBlockers = 0;
  let totalIssues = 0;
  let completionSum = 0;

  for (const opening of openings) {
    const result = validateOpening(opening);
    perOpening.set(opening.openingNumber || 0, result);
    totalBlockers += result.blockerCount;
    totalIssues += result.issues.length;
    completionSum += result.completionPct;
  }

  const overallCompletionPct = openings.length > 0 ? Math.round(completionSum / openings.length) : 0;

  return {
    allValid: totalBlockers === 0,
    totalBlockers,
    totalIssues,
    overallCompletionPct,
    perOpening,
  };
}
