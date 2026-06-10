/**
 * useMultiPointMeasurement.ts
 *
 * React hook that manages multi-point window measurement state.
 *
 * Supports capturing:
 *   Width:  Top | Middle | Bottom
 *   Height: Left | Center | Right
 *
 * For each point the rep can provide a measurement via:
 *   - Bluetooth BLE (Bosch GLM165-27G)
 *   - Manual entry (typed)
 *   - Photo AI reading
 *   - Tape reading import
 *
 * The hook derives:
 *   - Smallest valid width + which point won
 *   - Smallest valid height + which point won
 *   - Final adjusted width = smallest - deduction rule
 *   - Final adjusted height = smallest - deduction rule
 *   - Variance per axis → review warning if > 1/4"
 *
 * The hook is pure client-side state — it does NOT hit the API.
 * Saving is done by the consumer via the returned `getSessionPayload()`.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  applyRuleToMultiPoint,
  getApplicableRule,
  type MeasurementRule,
  type MultiPointRuleResult,
  type RuleContext,
} from './measurementRules';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CaptureSource = 'bluetooth' | 'manual' | 'photo_ai' | 'tape_reading';

export type WidthPointKey = 'widthTop' | 'widthMiddle' | 'widthBottom';
export type HeightPointKey = 'heightLeft' | 'heightCenter' | 'heightRight';
export type MeasurePointKey = WidthPointKey | HeightPointKey | 'depth' | 'diagonal1' | 'diagonal2';

export interface PointCaptures {
  widthTop: number | null;
  widthMiddle: number | null;
  widthBottom: number | null;
  heightLeft: number | null;
  heightCenter: number | null;
  heightRight: number | null;
  // Optional specialty points
  depth: number | null;
  diagonal1: number | null;
  diagonal2: number | null;
}

export interface PointSources {
  widthTop: CaptureSource | null;
  widthMiddle: CaptureSource | null;
  widthBottom: CaptureSource | null;
  heightLeft: CaptureSource | null;
  heightCenter: CaptureSource | null;
  heightRight: CaptureSource | null;
  depth: CaptureSource | null;
  diagonal1: CaptureSource | null;
  diagonal2: CaptureSource | null;
}

export interface ObstructionState {
  detected: boolean;
  type: 'brick' | 'siding' | 'stucco' | 'trim' | 'sill' | 'frame' | 'unknown' | null;
  notes: string;
}

export interface OverrideState {
  active: boolean;
  finalWidthInches: number | null;
  finalHeightInches: number | null;
  reason: string;
}

export interface MultiPointState {
  points: PointCaptures;
  sources: PointSources;
  activePoint: MeasurePointKey;
  result: MultiPointRuleResult;
  rule: MeasurementRule;
  obstruction: ObstructionState;
  override: OverrideState;
  /** True if the rep has explicitly accepted the final size */
  accepted: boolean;
}

export interface MultiPointActions {
  /** Set the active capture point (next BLE/manual entry goes here) */
  setActivePoint: (point: MeasurePointKey) => void;
  /** Record a measurement for the ACTIVE point */
  captureToActivePoint: (inches: number, source: CaptureSource) => void;
  /** Record a measurement for a SPECIFIC named point */
  captureToPoint: (point: MeasurePointKey, inches: number, source: CaptureSource) => void;
  /** Clear a specific point back to null */
  clearPoint: (point: MeasurePointKey) => void;
  /** Clear all points */
  clearAll: () => void;
  /** Set obstruction state */
  setObstruction: (state: Partial<ObstructionState>) => void;
  /** Activate manual override with custom final values */
  setOverride: (widthInches: number | null, heightInches: number | null, reason: string) => void;
  /** Clear manual override — go back to smallest-opening rule result */
  clearOverride: () => void;
  /** Accept the current final size */
  accept: () => void;
  /** Get the payload to send to the API / save offline */
  getSessionPayload: () => SessionPayload;
}

export interface SessionPayload {
  widthTop: number | null;
  widthMiddle: number | null;
  widthBottom: number | null;
  heightLeft: number | null;
  heightCenter: number | null;
  heightRight: number | null;
  smallestWidthPoint: string | null;
  smallestHeightPoint: string | null;
  rawWidth: number | null;   // = smallestWidthInches
  rawHeight: number | null;  // = smallestHeightInches
  adjWidth: number | null;   // = finalWidthInches
  adjHeight: number | null;  // = finalHeightInches
  widthTakeoff: number;
  heightTakeoff: number;
  ruleId: string;
  ruleName: string;
  sizingMethod: 'smallest_opening' | 'manual_override';
  widthVarianceInches: number | null;
  heightVarianceInches: number | null;
  widthNeedsReview: boolean;
  heightNeedsReview: boolean;
  obstructionDetected: boolean;
  obstructionType: string | null;
  obstructionNotes: string;
  manualOverride: boolean;
  overrideReason: string;
  // What goes on the Opening record
  finalWidthInches: number | null;
  finalHeightInches: number | null;
  measurementMethod: 'smallest_opening';
}

// ── Default state factories ───────────────────────────────────────────────────

function makeEmptyPoints(): PointCaptures {
  return {
    widthTop: null,
    widthMiddle: null,
    widthBottom: null,
    heightLeft: null,
    heightCenter: null,
    heightRight: null,
    depth: null,
    diagonal1: null,
    diagonal2: null,
  };
}

function makeEmptySources(): PointSources {
  return {
    widthTop: null,
    widthMiddle: null,
    widthBottom: null,
    heightLeft: null,
    heightCenter: null,
    heightRight: null,
    depth: null,
    diagonal1: null,
    diagonal2: null,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseMultiPointMeasurementOptions {
  ctx?: RuleContext;
  initialPoints?: Partial<PointCaptures>;
}

export function useMultiPointMeasurement(
  options: UseMultiPointMeasurementOptions = {}
): MultiPointState & MultiPointActions {
  const { ctx = {} } = options;

  // ── State ────────────────────────────────────────────────────────────────────
  const [points, setPoints] = useState<PointCaptures>({
    ...makeEmptyPoints(),
    ...options.initialPoints,
  });

  const [sources, setSources] = useState<PointSources>(makeEmptySources());

  // Which point will receive the next BLE/manual capture
  const [activePoint, setActivePoint] = useState<MeasurePointKey>('widthTop');

  const [obstruction, setObstructionState] = useState<ObstructionState>({
    detected: false,
    type: null,
    notes: '',
  });

  const [override, setOverrideState] = useState<OverrideState>({
    active: false,
    finalWidthInches: null,
    finalHeightInches: null,
    reason: '',
  });

  const [accepted, setAccepted] = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────────
  const rule = useMemo(() => getApplicableRule(ctx), [ctx.productType, ctx.installType, ctx.exteriorSurface]);

  const result = useMemo(
    () =>
      applyRuleToMultiPoint({
        widthTop: points.widthTop,
        widthMiddle: points.widthMiddle,
        widthBottom: points.widthBottom,
        heightLeft: points.heightLeft,
        heightCenter: points.heightCenter,
        heightRight: points.heightRight,
        rule,
      }),
    [points, rule]
  );

  // ── Actions ──────────────────────────────────────────────────────────────────

  const captureToPoint = useCallback(
    (point: MeasurePointKey, inches: number, source: CaptureSource) => {
      setPoints(prev => ({ ...prev, [point]: inches }));
      setSources(prev => ({ ...prev, [point]: source }));
      setAccepted(false); // un-accept when new data comes in
    },
    []
  );

  const captureToActivePoint = useCallback(
    (inches: number, source: CaptureSource) => {
      captureToPoint(activePoint, inches, source);
    },
    [activePoint, captureToPoint]
  );

  const clearPoint = useCallback((point: MeasurePointKey) => {
    setPoints(prev => ({ ...prev, [point]: null }));
    setSources(prev => ({ ...prev, [point]: null }));
    setAccepted(false);
  }, []);

  const clearAll = useCallback(() => {
    setPoints(makeEmptyPoints());
    setSources(makeEmptySources());
    setOverrideState({ active: false, finalWidthInches: null, finalHeightInches: null, reason: '' });
    setAccepted(false);
  }, []);

  const setObstruction = useCallback((state: Partial<ObstructionState>) => {
    setObstructionState(prev => ({ ...prev, ...state }));
  }, []);

  const setOverride = useCallback(
    (widthInches: number | null, heightInches: number | null, reason: string) => {
      setOverrideState({ active: true, finalWidthInches: widthInches, finalHeightInches: heightInches, reason });
    },
    []
  );

  const clearOverride = useCallback(() => {
    setOverrideState({ active: false, finalWidthInches: null, finalHeightInches: null, reason: '' });
  }, []);

  const accept = useCallback(() => {
    setAccepted(true);
  }, []);

  const getSessionPayload = useCallback((): SessionPayload => {
    // If manual override is active, use override values; otherwise use rule result
    const finalW = override.active ? override.finalWidthInches : result.finalWidthInches;
    const finalH = override.active ? override.finalHeightInches : result.finalHeightInches;

    // needsVerification = review needed OR override conflicts with rule result
    const overrideConflictsWidth =
      override.active &&
      result.finalWidthInches !== null &&
      override.finalWidthInches !== null &&
      Math.abs(override.finalWidthInches - result.finalWidthInches) > 0.0001;
    const overrideConflictsHeight =
      override.active &&
      result.finalHeightInches !== null &&
      override.finalHeightInches !== null &&
      Math.abs(override.finalHeightInches - result.finalHeightInches) > 0.0001;

    return {
      widthTop: points.widthTop,
      widthMiddle: points.widthMiddle,
      widthBottom: points.widthBottom,
      heightLeft: points.heightLeft,
      heightCenter: points.heightCenter,
      heightRight: points.heightRight,
      smallestWidthPoint: result.smallestWidthPoint,
      smallestHeightPoint: result.smallestHeightPoint,
      rawWidth: result.smallestWidthInches,
      rawHeight: result.smallestHeightInches,
      adjWidth: finalW,
      adjHeight: finalH,
      widthTakeoff: result.widthDeductionInches,
      heightTakeoff: result.heightDeductionInches,
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      sizingMethod: override.active ? 'manual_override' : 'smallest_opening',
      widthVarianceInches: result.widthVarianceInches,
      heightVarianceInches: result.heightVarianceInches,
      widthNeedsReview: result.widthNeedsReview || overrideConflictsWidth,
      heightNeedsReview: result.heightNeedsReview || overrideConflictsHeight,
      obstructionDetected: obstruction.detected,
      obstructionType: obstruction.type,
      obstructionNotes: obstruction.notes,
      manualOverride: override.active,
      overrideReason: override.reason,
      finalWidthInches: finalW,
      finalHeightInches: finalH,
      measurementMethod: 'smallest_opening',
    };
  }, [points, result, override, obstruction]);

  return {
    // State
    points,
    sources,
    activePoint,
    result,
    rule,
    obstruction,
    override,
    accepted,
    // Actions
    setActivePoint,
    captureToActivePoint,
    captureToPoint,
    clearPoint,
    clearAll,
    setObstruction,
    setOverride,
    clearOverride,
    accept,
    getSessionPayload,
  };
}
