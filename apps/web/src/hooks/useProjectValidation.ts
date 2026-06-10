// ═══════════════════════════════════════════════════════════════
// useProjectValidation — React hook for centralized validation
// Auto-runs validation when openings/markers/groups change.
// Provides unified warnings, quick-fix actions, and submission
// readiness across Sketch Canvas, Order Form, and Proposal.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  runFullValidation,
  applyRecommendedFix,
  type ProjectValidationReport,
  type UnifiedWarning,
  type RecommendedFix,
} from '../utils/centralValidationOrchestrator';
import type { SketchMarkerData, MarkerGroupData } from '../utils/sketchSync';
import type { OpeningSafetyReview } from '../utils/safetyGlazingRules';

export interface UseProjectValidationOptions {
  /** Whether the house is brick (triggers depth requirements) */
  isBrickHouse?: boolean;
  /** Existing safety reviews from previous runs */
  safetyReviews?: OpeningSafetyReview[];
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
  /** If false, validation won't run automatically */
  enabled?: boolean;
}

export interface UseProjectValidationReturn {
  /** Full validation report */
  report: ProjectValidationReport | null;
  /** Whether validation is currently running */
  isValidating: boolean;
  /** Get warnings for a specific opening number */
  getOpeningWarnings: (openingNumber: number) => UnifiedWarning[];
  /** Get warnings for a specific category */
  getCategoryWarnings: (category: string) => UnifiedWarning[];
  /** Get warnings for sketch markers (by opening number from marker) */
  getMarkerWarnings: (markerNumber: number | null) => UnifiedWarning[];
  /** Apply a quick fix and return updated openings */
  executeRecommendedFix: (fix: RecommendedFix) => any[];
  /** Re-run validation manually */
  revalidate: () => void;
  /** Whether submission is blocked */
  submissionBlocked: boolean;
  /** List of blocker descriptions */
  submissionBlockers: string[];
  /** Summary counts */
  counts: { critical: number; high: number; warning: number; info: number; total: number };
  /** Integrity check report (hidden failure audit) */
  integrity: import('../utils/validationIntegrity').IntegrityReport | null;
  /** Fix prioritization plan */
  fixPlan: import('../utils/fixPrioritization').FixPlan | null;
  /** Detected rule conflicts */
  conflicts: import('../utils/ruleConflictDetector').RuleConflict[];
}

export function useProjectValidation(
  openings: any[],
  markers: SketchMarkerData[],
  groups: MarkerGroupData[],
  appointment: any,
  opts: UseProjectValidationOptions = {},
): UseProjectValidationReturn {
  const { isBrickHouse = false, safetyReviews, debounceMs = 300, enabled = true } = opts;
  const [report, setReport] = useState<ProjectValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable reference to latest data for debounced callback
  const latestRef = useRef({ openings, markers, groups, appointment, isBrickHouse, safetyReviews });
  latestRef.current = { openings, markers, groups, appointment, isBrickHouse, safetyReviews };

  const runValidation = useCallback(() => {
    const { openings: o, markers: m, groups: g, appointment: a, isBrickHouse: b, safetyReviews: sr } = latestRef.current;
    setIsValidating(true);
    // Run synchronously (it's fast — pure computation, no I/O)
    const result = runFullValidation(o, m, g, a, { isBrickHouse: b, safetyReviews: sr });
    setReport(result);
    setIsValidating(false);
  }, []);

  // Auto-run on data changes (debounced)
  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runValidation, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [openings, markers, groups, appointment, isBrickHouse, safetyReviews, enabled, debounceMs, runValidation]);

  const getOpeningWarnings = useCallback((num: number): UnifiedWarning[] => {
    return report?.byOpening[num] || [];
  }, [report]);

  const getCategoryWarnings = useCallback((cat: string): UnifiedWarning[] => {
    return report?.byCategory[cat] || [];
  }, [report]);

  const getMarkerWarnings = useCallback((markerNumber: number | null): UnifiedWarning[] => {
    if (markerNumber === null) return [];
    return report?.byOpening[markerNumber] || [];
  }, [report]);

  const executeRecommendedFix = useCallback((fix: RecommendedFix): any[] => {
    return applyRecommendedFix(latestRef.current.openings, fix);
  }, []);

  const revalidate = useCallback(() => { runValidation(); }, [runValidation]);

  const emptyCounts = { critical: 0, high: 0, warning: 0, info: 0, total: 0 };

  return {
    report,
    isValidating,
    getOpeningWarnings,
    getCategoryWarnings,
    getMarkerWarnings,
    executeRecommendedFix,
    revalidate,
    submissionBlocked: report?.submissionBlocked ?? false,
    submissionBlockers: report?.submissionBlockers ?? [],
    counts: report?.counts ?? emptyCounts,
    // ── Extended intelligence fields ──
    integrity: report?.integrity ?? null,
    fixPlan: report?.fixPlan ?? null,
    conflicts: report?.conflicts ?? [],
  };
}
