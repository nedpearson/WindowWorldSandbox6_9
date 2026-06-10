// ═══════════════════════════════════════════════════════════════
// Window World — Quote Health & Confidence Engine
// Analyzes an entire appointment and its openings to determine
// completeness, identify risks, and calculate a confidence score.
// ═══════════════════════════════════════════════════════════════

import { detectColorConsistency, detectGridPattern } from './neverAskTwice';

export interface HealthIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'pricing' | 'completeness' | 'consistency' | 'risk';
  message: string;
  openingNumber?: number;
  field?: string;
  actionRequired: boolean;
}

export interface QuoteHealth {
  score: number; // 0-100
  status: 'Critical' | 'Needs Review' | 'Healthy' | 'Export Ready';
  issues: HealthIssue[];
  missingBlockers: number;
  openingsCount: number;
}

const CRITICAL_FIELDS = ['width', 'height', 'productCategory', 'removalType', 'installType'];
const HIGH_VALUE_FIELDS = ['interiorColor', 'exteriorColor', 'glassOption', 'gridStyle'];

export function analyzeQuoteHealth(appointment: any, openings: any[]): QuoteHealth {
  const issues: HealthIssue[] = [];
  let score = 100;

  // 1. Check Appointment Basics
  if (!appointment.customerName) {
    issues.push({ id: 'no-cust', type: 'error', category: 'completeness', message: 'Missing customer name', actionRequired: true });
    score -= 10;
  }
  if (!appointment.address) {
    issues.push({ id: 'no-addr', type: 'error', category: 'completeness', message: 'Missing job address', actionRequired: true });
    score -= 10;
  }

  // 2. Check Openings
  if (!openings || openings.length === 0) {
    issues.push({ id: 'no-ops', type: 'error', category: 'completeness', message: 'No openings added to this quote', actionRequired: true });
    score = 0;
    return { score, status: 'Critical', issues, missingBlockers: issues.filter(i => i.type === 'error').length, openingsCount: 0 };
  }

  // Per-opening checks
  let missingCritical = 0;
  openings.forEach((op, index) => {
    const opNum = op.openingNumber || index + 1;

    // Dimensions
    if (!op.width || !op.height || op.width <= 0 || op.height <= 0) {
      issues.push({ id: `dim-${op.id}`, type: 'error', category: 'completeness', message: `Missing dimensions on Opening ${opNum}`, openingNumber: opNum, actionRequired: true });
      score -= 5;
      missingCritical++;
    } else {
      // Dimension sanity checks
      if (op.width > 120 || op.height > 120) {
        issues.push({ id: `large-${op.id}`, type: 'warning', category: 'risk', message: `Oversized dimensions (${op.width}x${op.height}) on Opening ${opNum}`, openingNumber: opNum, actionRequired: true });
        score -= 2;
      }
    }

    // Critical fields
    for (const field of CRITICAL_FIELDS) {
      if (!op[field] || op[field] === 'none') {
        if (field !== 'width' && field !== 'height') {
          issues.push({ id: `miss-${field}-${op.id}`, type: 'error', category: 'completeness', message: `Missing ${field} on Opening ${opNum}`, openingNumber: opNum, field, actionRequired: true });
          score -= 5;
          missingCritical++;
        }
      }
    }

    // High value fields
    for (const field of HIGH_VALUE_FIELDS) {
      if (!op[field] || op[field] === 'none') {
        issues.push({ id: `miss-hv-${field}-${op.id}`, type: 'warning', category: 'completeness', message: `Missing ${field} on Opening ${opNum}`, openingNumber: opNum, field, actionRequired: false });
        score -= 2;
      }
    }

    // Risk checks
    if (op.floorNumber >= 2 && !op.installNotes?.toLowerCase().includes('ladder') && !op.installNotes?.toLowerCase().includes('scaffold')) {
      issues.push({ id: `access-${op.id}`, type: 'warning', category: 'risk', message: `Upper floor Opening ${opNum} has no ladder/access notes`, openingNumber: opNum, actionRequired: false });
      score -= 3;
    }

    if ((op.exteriorType || '').toLowerCase().includes('brick') && (!op.installNotes?.toLowerCase().includes('return') && !op.installNotes?.toLowerCase().includes('brickmold'))) {
      issues.push({ id: `brick-${op.id}`, type: 'warning', category: 'risk', message: `Brick Opening ${opNum} should have notes on return depth/brickmold condition`, openingNumber: opNum, actionRequired: false });
      score -= 2;
    }

    if (op.productCategory === 'patio_door' && !op.installType) {
       issues.push({ id: `door-${op.id}`, type: 'error', category: 'risk', message: `Patio Door ${opNum} must specify Install Type (usually New Construction vs Retrofit)`, openingNumber: opNum, actionRequired: true });
       score -= 5;
    }
    
    // Tempered glass check for bathrooms/doors
    if ((op.roomLocation || '').toLowerCase().includes('bath') && op.temperedGlass !== 'full' && op.temperedGlass !== 'half' && op.temperedGlass !== true && op.temperedGlass !== 'true') {
        issues.push({ id: `temp-${op.id}`, type: 'warning', category: 'risk', message: `Bathroom Opening ${opNum} may require tempered glass`, openingNumber: opNum, actionRequired: false });
        score -= 3;
    }
  });

  // Consistency checks
  const colorCheck = detectColorConsistency(openings);
  if (!colorCheck.isConsistent && colorCheck.suggestion) {
    issues.push({ id: 'color-mix', type: 'info', category: 'consistency', message: colorCheck.suggestion, actionRequired: false });
    score -= 1;
  }

  const gridCheck = detectGridPattern(openings);
  if (gridCheck.hasMixedGrids && gridCheck.suggestion) {
    issues.push({ id: 'grid-mix', type: 'info', category: 'consistency', message: gridCheck.suggestion, actionRequired: false });
    score -= 1;
  }

  // Pricing completeness check
  if (appointment.totalAmount === 0 && openings.length > 0) {
      issues.push({ id: 'no-price', type: 'error', category: 'pricing', message: 'Total price is $0.00. Please run pricing engine.', actionRequired: true });
      score -= 10;
  } else if (appointment.totalAmount > 0) {
      // Check for labor/install charges if 5+ windows
      if (openings.length >= 5 && appointment.adminFee === 0) {
          issues.push({ id: 'no-admin', type: 'warning', category: 'pricing', message: 'No admin/setup fee charged on a large job.', actionRequired: false });
      }
  }

  // Cap score
  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: QuoteHealth['status'] = 'Export Ready';
  if (score < 50 || missingCritical > 0) status = 'Critical';
  else if (score < 85) status = 'Needs Review';
  else if (score < 95 || issues.length > 0) status = 'Healthy';

  return {
    score,
    status,
    issues: issues.sort((a, b) => {
        if (a.type === 'error' && b.type !== 'error') return -1;
        if (a.type !== 'error' && b.type === 'error') return 1;
        if (a.type === 'warning' && b.type !== 'warning') return -1;
        if (a.type !== 'warning' && b.type === 'warning') return 1;
        return 0;
    }),
    missingBlockers: issues.filter(i => i.type === 'error').length,
    openingsCount: openings.length
  };
}

// ─── CALCULATE SINGLE OPENING CONFIDENCE ────────────────────
export function calculateOpeningConfidence(opening: any): number {
    let score = 100;
    
    // Critical (blockers)
    for (const field of CRITICAL_FIELDS) {
        if (!opening[field] || opening[field] === 'none') {
            score -= 15;
        }
    }
    
    // High Value
    for (const field of HIGH_VALUE_FIELDS) {
         if (!opening[field] || opening[field] === 'none') {
            score -= 5;
         }
    }

    // Dimension checks
    if (!opening.width || !opening.height) score -= 20;

    return Math.max(0, Math.min(100, score));
}
