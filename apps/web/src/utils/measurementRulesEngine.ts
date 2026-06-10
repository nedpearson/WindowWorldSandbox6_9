import { ExteriorMaterial, WindowType, ShapeType } from './sketchSync';

export interface MeasurementGuidanceDetail {
  surfaceTitle: string;
  measureSide: 'inside' | 'outside';
  instructionHTML: string;
  widthPoints: ('top' | 'middle' | 'bottom')[];
  heightPoints: ('left' | 'center' | 'right')[];
  deductionRule: string;
  defaultDeduction: number;
  requiresPhoto: boolean;
  highRisk: boolean;
  managerVerificationRequired: boolean;
}

export function getMeasurementRules(
  exteriorMaterial: string,
  windowType: WindowType | null,
  shapeType: ShapeType | null
): MeasurementGuidanceDetail {
  
  const ext = (exteriorMaterial || '').toLowerCase();
  
  const isBrick = ext.includes('brick') || ext.includes('stone');
  const isStucco = ext.includes('stucco');
  const isVinyl = ext.includes('vinyl') || ext === 'siding';
  const isWood = ext.includes('wood');
  const isHardie = ext.includes('hardie') || ext.includes('fiber');
  
  if (isBrick) {
    return {
      surfaceTitle: 'Brick / Stone',
      measureSide: 'outside',
      instructionHTML: `
        <ul>
          <li>Measure from the <strong>OUTSIDE</strong>.</li>
          <li>Measure the <strong>brick-to-brick</strong> opening.</li>
          <li>Take the <strong>SMALLEST</strong> measurement.</li>
          <li>Standard deduction: -1/4" Width, -1/4" Height.</li>
        </ul>
      `,
      widthPoints: ['top', 'middle', 'bottom'],
      heightPoints: ['left', 'center', 'right'],
      deductionRule: 'smallest_minus_3_8',
      defaultDeduction: -0.375,
      requiresPhoto: true,
      highRisk: false,
      managerVerificationRequired: false,
    };
  }

  if (isStucco) {
    return {
      surfaceTitle: 'Stucco',
      measureSide: 'inside',
      instructionHTML: `
        <ul>
          <li>Measure from the <strong>INSIDE</strong>.</li>
          <li>Measure jamb-to-jamb and sill-to-header.</li>
          <li><strong style="color:#ef4444;">WARNING:</strong> Stucco requires extra care. Ensure the return is fully accounted for.</li>
        </ul>
      `,
      widthPoints: ['top', 'middle', 'bottom'],
      heightPoints: ['left', 'center', 'right'],
      deductionRule: 'smallest_exact',
      defaultDeduction: 0,
      requiresPhoto: true,
      highRisk: true,
      managerVerificationRequired: true,
    };
  }

  if (isVinyl || isWood || isHardie) {
    return {
      surfaceTitle: isVinyl ? 'Vinyl Siding' : (isWood ? 'Wood Siding' : 'Fiber Cement'),
      measureSide: 'inside',
      instructionHTML: `
        <ul>
          <li>Measure from the <strong>INSIDE</strong>.</li>
          <li>Measure jamb-to-jamb and sill-to-header.</li>
          <li>Take the <strong>SMALLEST</strong> measurement.</li>
        </ul>
      `,
      widthPoints: ['top', 'middle', 'bottom'],
      heightPoints: ['left', 'center', 'right'],
      deductionRule: 'smallest_exact',
      defaultDeduction: 0,
      requiresPhoto: false,
      highRisk: false,
      managerVerificationRequired: false,
    };
  }

  // Default / Unknown
  return {
    surfaceTitle: 'Unknown / Needs Verification',
    measureSide: 'inside',
    instructionHTML: `
      <ul>
        <li>Determine the exterior surface first to get accurate instructions.</li>
        <li>Draft pricing can use raw dimensions, but final contract will be blocked.</li>
      </ul>
    `,
    widthPoints: ['top', 'middle', 'bottom'],
    heightPoints: ['left', 'center', 'right'],
    deductionRule: 'manual',
    defaultDeduction: 0,
    requiresPhoto: true,
    highRisk: true,
    managerVerificationRequired: true,
  };
}

export function calculateFinalMeasurement(
  p1: number | null, p2: number | null, p3: number | null, deduction: number
): number | null {
  const points = [p1, p2, p3].filter(p => p !== null && p > 0) as number[];
  if (points.length === 0) return null;
  const smallest = Math.min(...points);
  return smallest + deduction;
}

/**
 * Simple mode: single raw measurement minus deduction.
 * Example: 36" raw - 3/8" deduction = 35.625" final
 */
export function calculateSimpleFinalMeasurement(
  rawValue: number | null,
  deduction: number
): number | null {
  if (rawValue === null || rawValue <= 0) return null;
  return rawValue + deduction; // deduction is negative, e.g. -0.375
}

/**
 * Detect measurement mode from existing data.
 * If any multi-point field has a value, the opening was measured in advanced mode.
 */
export function detectMeasurementMode(marker: {
  measurementMode?: 'simple' | 'advanced';
  widthTop?: number | null;
  widthMiddle?: number | null;
  widthBottom?: number | null;
  heightLeft?: number | null;
  heightCenter?: number | null;
  heightRight?: number | null;
  insideWidthTop?: number | null;
  insideWidthMiddle?: number | null;
  insideWidthBottom?: number | null;
  insideHeightLeft?: number | null;
  insideHeightCenter?: number | null;
  insideHeightRight?: number | null;
}): 'simple' | 'advanced' {
  // Explicit mode takes priority
  if (marker.measurementMode) return marker.measurementMode;
  
  // Auto-detect from existing data: if any multi-point field is filled → advanced
  const multiPointFields = [
    marker.widthTop, marker.widthMiddle, marker.widthBottom,
    marker.heightLeft, marker.heightCenter, marker.heightRight,
    marker.insideWidthTop, marker.insideWidthMiddle, marker.insideWidthBottom,
    marker.insideHeightLeft, marker.insideHeightCenter, marker.insideHeightRight,
  ];
  const hasMultiPoint = multiPointFields.some(v => v !== null && v !== undefined && v > 0);
  return hasMultiPoint ? 'advanced' : 'simple';
}

export interface MeasurementDefaultsResult {
  basis: 'inside' | 'outside' | 'needs_review';
  includeTrim: boolean;
  includeHeaderFlashing: boolean;
  reason: string;
}

/**
 * Resolves the default measurement basis, trim, and header rules
 * based on what exterior surface touches the window.
 */
export function resolveMeasurementDefaultsForOpening(opening: any): MeasurementDefaultsResult {
  const ext = (opening.exteriorSurface || opening.exteriorType || '').toLowerCase();
  const touching = (opening.whatTouchesWindow || '').toLowerCase();

  // If we know what touches the window, we use that for logic
  const surface = touching || ext;

  const isBrick = surface.includes('brick') || surface.includes('stone');
  const isStucco = surface.includes('stucco');
  const isVinyl = surface.includes('vinyl') || surface === 'siding';
  const isWood = surface.includes('wood');
  const isHardie = surface.includes('hardie') || surface.includes('fiber');

  // Wood/Siding: Inside measure, includes trim, includes header flashing
  if (isVinyl || isWood || isHardie) {
    return {
      basis: 'inside',
      includeTrim: true,
      includeHeaderFlashing: true,
      reason: `Inside measure because ${isVinyl ? 'Siding' : isWood ? 'Wood' : 'Hardie'} touches the window. Trim and Header Flashing included.`,
    };
  }

  // Stucco: Inside measure, trim/header false by default
  if (isStucco) {
    return {
      basis: 'inside',
      includeTrim: false,
      includeHeaderFlashing: false,
      reason: 'Inside measure because Stucco touches the window. Trim and header flashing not included by default.',
    };
  }

  // Brick-to-Brick: Outside measure
  if (isBrick) {
    if (touching === 'wood') {
      return {
        basis: 'inside',
        includeTrim: false,
        includeHeaderFlashing: false,
        reason: 'Inside measure because wood return touches the window on a brick exterior.',
      };
    }
    return {
      basis: 'outside',
      includeTrim: false,
      includeHeaderFlashing: true,
      reason: 'Outside measure because Brick touches the window. Header flashing is required unless previously capped.',
    };
  }

  return {
    basis: 'needs_review',
    includeTrim: false,
    includeHeaderFlashing: false,
    reason: 'Surface type unknown. Needs manual review.',
  };
}
