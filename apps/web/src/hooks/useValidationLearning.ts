// ═══════════════════════════════════════════════════════════════
// useValidationLearning — React hook for the learning system
// Tracks outcomes, feeds back into confidence, and provides
// coaching insights.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  createLearningDb, loadLearningDb, saveLearningDb,
  recordOutcome, recordAppointmentComplete, analyzePatterns,
  getTopOverriddenRules, getFrequentMistakes, getRemakeCauses,
  getCoachingOpportunities, getConfidenceAdjustment, getSmartDefault,
  getRepProfile, generateSmartDefaults, generateInsightsReport,
  type LearningDatabase, type WarningOutcomeRecord, type WarningOutcome,
  type RulePatternStats,
} from '../utils/validationLearning';
import type { WarningCategory, UnifiedSeverity } from '../utils/centralValidationOrchestrator';

interface UseLearningOptions {
  userId?: string;
  autoPersist?: boolean;
}

export function useValidationLearning(opts: UseLearningOptions = {}) {
  const { userId, autoPersist = true } = opts;

  const [db, setDb] = useState<LearningDatabase>(() =>
    loadLearningDb() || createLearningDb()
  );

  useEffect(() => {
    if (autoPersist) saveLearningDb(db);
  }, [db, autoPersist]);

  const track = useCallback((
    warningId: string, rulePattern: string, category: WarningCategory,
    severity: UnifiedSeverity, out: WarningOutcome, appointmentId: string,
    extra: Partial<WarningOutcomeRecord> = {},
  ) => {
    setDb(prev => recordOutcome(prev, {
      warningId, rulePattern, category, severity, outcome: out,
      timestamp: new Date().toISOString(), appointmentId,
      userId, ...extra,
    }));
  }, [userId]);

  const completeAppointment = useCallback(() => {
    setDb(prev => {
      const updated = recordAppointmentComplete(prev);
      analyzePatterns(updated);
      generateSmartDefaults(updated);
      return updated;
    });
  }, []);

  const confidenceAdj = useCallback((pattern: string) => getConfidenceAdjustment(db, pattern), [db]);
  const smartDefault = useCallback((pattern: string, field: string) => getSmartDefault(db, pattern, field), [db]);
  const repProfile = useMemo(() => userId ? getRepProfile(db, userId) : undefined, [db, userId]);
  const topOverridden = useMemo(() => getTopOverriddenRules(db, 5), [db]);
  const frequentMistakes = useMemo(() => getFrequentMistakes(db, 5), [db]);
  const remakeCauses = useMemo(() => getRemakeCauses(db, 5), [db]);
  const coaching = useMemo(() => getCoachingOpportunities(db), [db]);
  const insightsReport = useMemo(() => generateInsightsReport(db), [db]);

  return {
    db, track, completeAppointment,
    confidenceAdj, smartDefault, repProfile,
    topOverridden, frequentMistakes, remakeCauses, coaching,
    insightsReport,
    totalOutcomes: db.outcomes.length,
    totalAppointments: db.totalAppointments,
  };
}
