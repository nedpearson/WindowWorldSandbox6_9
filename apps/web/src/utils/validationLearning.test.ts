import { describe, it, expect } from 'vitest';
import {
  createLearningDb, recordOutcome, recordAppointmentComplete, analyzePatterns,
  getTopOverriddenRules, getTopIgnoredRules, getFrequentMistakes, getRemakeCauses,
  getCoachingOpportunities, getConfidenceAdjustment, getSmartDefault,
  getRepProfile, generateSmartDefaults, generateInsightsReport,
  type LearningDatabase, type WarningOutcomeRecord,
} from './validationLearning';

function outcome(overrides: Partial<WarningOutcomeRecord> = {}): WarningOutcomeRecord {
  return {
    warningId: 'test-1', rulePattern: 'test-rule', category: 'order',
    severity: 'warning', outcome: 'fixed', timestamp: new Date().toISOString(),
    appointmentId: 'appt-1', userId: 'rep1', ...overrides,
  };
}

function seedDb(records: Partial<WarningOutcomeRecord>[]): LearningDatabase {
  let db = createLearningDb();
  for (const r of records) db = recordOutcome(db, outcome(r));
  return db;
}

describe('Validation Learning System', () => {
  describe('Database creation', () => {
    it('creates empty database', () => {
      const db = createLearningDb();
      expect(db.version).toBe(1);
      expect(db.outcomes.length).toBe(0);
      expect(Object.keys(db.patternStats).length).toBe(0);
    });
  });

  describe('Recording outcomes', () => {
    it('records a fix outcome', () => {
      let db = createLearningDb();
      db = recordOutcome(db, outcome({ outcome: 'fixed' }));
      expect(db.outcomes.length).toBe(1);
      expect(db.patternStats['test-rule'].totalOccurrences).toBe(1);
      expect(db.patternStats['test-rule'].outcomes.fixed).toBe(1);
    });

    it('records an override with reason', () => {
      let db = createLearningDb();
      db = recordOutcome(db, outcome({ outcome: 'overridden', overrideReason: 'Customer confirmed' }));
      const stats = db.patternStats['test-rule'];
      expect(stats.outcomes.overridden).toBe(1);
      expect(stats.commonOverrideReasons[0].reason).toBe('Customer confirmed');
      expect(stats.commonOverrideReasons[0].count).toBe(1);
    });

    it('tracks common fix values', () => {
      let db = createLearningDb();
      db = recordOutcome(db, outcome({ outcome: 'fixed', fieldPath: 'screenOption', fixedValue: 'No Screen' }));
      db = recordOutcome(db, outcome({ outcome: 'fixed', fieldPath: 'screenOption', fixedValue: 'No Screen' }));
      db = recordOutcome(db, outcome({ outcome: 'fixed', fieldPath: 'screenOption', fixedValue: 'Half Screen' }));
      const stats = db.patternStats['test-rule'];
      expect(stats.commonFixValues[0].value).toBe('No Screen');
      expect(stats.commonFixValues[0].count).toBe(2);
    });

    it('calculates rates correctly', () => {
      const db = seedDb([
        { outcome: 'fixed' },
        { outcome: 'fixed' },
        { outcome: 'overridden' },
        { outcome: 'ignored' },
        { outcome: 'reappeared' },
      ]);
      const stats = db.patternStats['test-rule'];
      expect(stats.fixRate).toBe(0.4);
      expect(stats.overrideRate).toBe(0.2);
      expect(stats.ignoreRate).toBe(0.2);
      expect(stats.reappearanceRate).toBe(0.2);
    });

    it('tracks time to resolve', () => {
      const db = seedDb([
        { timeToResolveMs: 10000 },
        { timeToResolveMs: 20000 },
      ]);
      expect(db.patternStats['test-rule'].avgTimeToResolveMs).toBe(15000);
    });

    it('increments appointment count', () => {
      let db = createLearningDb();
      db = recordAppointmentComplete(db);
      db = recordAppointmentComplete(db);
      expect(db.totalAppointments).toBe(2);
    });
  });

  describe('Pattern analysis', () => {
    it('flags high override rate as confidence reduction', () => {
      const db = seedDb([
        { rulePattern: 'oft-overridden', outcome: 'overridden' },
        { rulePattern: 'oft-overridden', outcome: 'overridden' },
        { rulePattern: 'oft-overridden', outcome: 'overridden' },
        { rulePattern: 'oft-overridden', outcome: 'overridden' },
        { rulePattern: 'oft-overridden', outcome: 'fixed' },
      ]);
      analyzePatterns(db);
      expect(db.patternStats['oft-overridden'].confidenceAdjustment).toBeLessThan(0);
    });

    it('flags high fix rate as confidence boost', () => {
      const records = Array.from({ length: 10 }, () => ({ rulePattern: 'reliable', outcome: 'fixed' as const }));
      const db = seedDb(records);
      analyzePatterns(db);
      expect(db.patternStats['reliable'].confidenceAdjustment).toBeGreaterThan(0);
    });

    it('suggests demotion for heavily overridden rules', () => {
      const records = Array.from({ length: 10 }, () => ({ rulePattern: 'demote-me', outcome: 'overridden' as const }));
      const db = seedDb(records);
      analyzePatterns(db);
      expect(db.patternStats['demote-me'].suggestedSeverity).toBe('info');
    });

    it('flags reappearances as coaching opportunity', () => {
      const records: Partial<WarningOutcomeRecord>[] = [
        { rulePattern: 'recurring', outcome: 'reappeared' },
        { rulePattern: 'recurring', outcome: 'reappeared' },
        { rulePattern: 'recurring', outcome: 'fixed' },
        { rulePattern: 'recurring', outcome: 'fixed' },
        { rulePattern: 'recurring', outcome: 'reappeared' },
      ];
      const db = seedDb(records);
      analyzePatterns(db);
      expect(db.patternStats['recurring'].coachingFlag).toBe(true);
      expect(db.patternStats['recurring'].coachingNote).toContain('reappears');
    });

    it('flags high ignore rate as coaching issue', () => {
      const records: Partial<WarningOutcomeRecord>[] = [
        { rulePattern: 'ignored-rule', outcome: 'ignored' },
        { rulePattern: 'ignored-rule', outcome: 'ignored' },
        { rulePattern: 'ignored-rule', outcome: 'fixed' },
      ];
      const db = seedDb(records);
      analyzePatterns(db);
      expect(db.patternStats['ignored-rule'].coachingFlag).toBe(true);
    });
  });

  describe('Query API', () => {
    it('getTopOverriddenRules returns sorted by override rate', () => {
      const db = seedDb([
        { rulePattern: 'low-or', outcome: 'fixed' },
        { rulePattern: 'low-or', outcome: 'fixed' },
        { rulePattern: 'low-or', outcome: 'overridden' },
        { rulePattern: 'high-or', outcome: 'overridden' },
        { rulePattern: 'high-or', outcome: 'overridden' },
        { rulePattern: 'high-or', outcome: 'fixed' },
      ]);
      const top = getTopOverriddenRules(db, 5);
      expect(top.length).toBe(2);
      expect(top[0].rulePattern).toBe('high-or');
    });

    it('getFrequentMistakes returns high-fix-rate patterns', () => {
      const db = seedDb([
        { rulePattern: 'mistake', outcome: 'fixed' },
        { rulePattern: 'mistake', outcome: 'fixed' },
        { rulePattern: 'mistake', outcome: 'fixed' },
      ]);
      const mistakes = getFrequentMistakes(db, 5);
      expect(mistakes.length).toBe(1);
      expect(mistakes[0].fixRate).toBe(1);
    });

    it('getRemakeCauses returns high-reappearance patterns', () => {
      const db = seedDb([
        { rulePattern: 'remake', outcome: 'reappeared' },
        { rulePattern: 'remake', outcome: 'reappeared' },
        { rulePattern: 'remake', outcome: 'fixed' },
      ]);
      const remakes = getRemakeCauses(db, 5);
      expect(remakes.length).toBe(1);
      expect(remakes[0].reappearanceRate).toBeGreaterThan(0.2);
    });

    it('getConfidenceAdjustment returns 0 for unknown patterns', () => {
      const db = createLearningDb();
      expect(getConfidenceAdjustment(db, 'unknown')).toBe(0);
    });
  });

  describe('Smart defaults', () => {
    it('suggests default from common fix values', () => {
      const records: Partial<WarningOutcomeRecord>[] = Array.from({ length: 6 }, () => ({
        rulePattern: 'screen-fix', outcome: 'fixed' as const,
        fieldPath: 'screenOption', fixedValue: 'No Screen',
      }));
      const db = seedDb(records);
      const val = getSmartDefault(db, 'screen-fix', 'screenOption');
      expect(val).toBe('No Screen');
    });

    it('does not suggest default with too few occurrences', () => {
      const db = seedDb([
        { rulePattern: 'rare', outcome: 'fixed', fieldPath: 'f', fixedValue: 'v' },
      ]);
      expect(getSmartDefault(db, 'rare', 'f')).toBeUndefined();
    });

    it('generateSmartDefaults populates db.smartDefaults', () => {
      const records: Partial<WarningOutcomeRecord>[] = Array.from({ length: 8 }, () => ({
        rulePattern: 'temp-fix', outcome: 'fixed' as const,
        fieldPath: 'temperedGlass', fixedValue: 'full',
      }));
      const db = seedDb(records);
      const defaults = generateSmartDefaults(db);
      expect(defaults['temp-fix:temperedGlass']).toBe('full');
    });
  });

  describe('Rep profiles', () => {
    it('tracks per-rep stats', () => {
      const db = seedDb([
        { userId: 'rep1', outcome: 'fixed' },
        { userId: 'rep1', outcome: 'overridden', overrideReason: 'OK' },
        { userId: 'rep1', outcome: 'fixed' },
        { userId: 'rep2', outcome: 'fixed' },
      ]);
      const p1 = getRepProfile(db, 'rep1');
      expect(p1).toBeTruthy();
      expect(p1!.totalWarnings).toBe(3);
      expect(p1!.fixCount).toBe(2);
      expect(p1!.overrideCount).toBe(1);
    });

    it('tracks common mistakes per rep', () => {
      const db = seedDb([
        { userId: 'rep1', rulePattern: 'mistake-A', outcome: 'fixed' },
        { userId: 'rep1', rulePattern: 'mistake-A', outcome: 'fixed' },
        { userId: 'rep1', rulePattern: 'mistake-B', outcome: 'fixed' },
      ]);
      const profile = getRepProfile(db, 'rep1')!;
      expect(profile.commonMistakes[0].rulePattern).toBe('mistake-A');
      expect(profile.commonMistakes[0].count).toBe(2);
    });

    it('generates strengths and coaching areas with enough data', () => {
      const records: Partial<WarningOutcomeRecord>[] = Array.from({ length: 12 }, (_, i) => ({
        userId: 'rep1', outcome: i < 10 ? 'fixed' as const : 'overridden' as const,
        rulePattern: `rule-${i % 3}`,
        timeToResolveMs: 20000,
      }));
      const db = seedDb(records);
      const profile = getRepProfile(db, 'rep1')!;
      expect(profile.strengths.length).toBeGreaterThan(0);
      expect(profile.strengths.some(s => s.includes('fix rate'))).toBe(true);
    });
  });

  describe('Insights report', () => {
    it('generates readable report', () => {
      const db = seedDb([
        { rulePattern: 'override-heavy', outcome: 'overridden', overrideReason: 'Customer OK' },
        { rulePattern: 'override-heavy', outcome: 'overridden', overrideReason: 'Customer OK' },
        { rulePattern: 'override-heavy', outcome: 'overridden', overrideReason: 'Different' },
        { rulePattern: 'fix-heavy', outcome: 'fixed' },
        { rulePattern: 'fix-heavy', outcome: 'fixed' },
        { rulePattern: 'fix-heavy', outcome: 'fixed' },
        { rulePattern: 'remake-risk', outcome: 'reappeared' },
        { rulePattern: 'remake-risk', outcome: 'reappeared' },
        { rulePattern: 'remake-risk', outcome: 'fixed' },
      ]);
      const report = generateInsightsReport(db);
      expect(report.length).toBeGreaterThan(3);
      expect(report.some(l => l.includes('OVERRIDDEN'))).toBe(true);
      expect(report.some(l => l.includes('FREQUENT MISTAKES'))).toBe(true);
      expect(report.some(l => l.includes('REMAKE'))).toBe(true);
    });
  });

  describe('Immutability', () => {
    it('does not mutate original database', () => {
      const db = createLearningDb();
      const db2 = recordOutcome(db, outcome());
      expect(db.outcomes.length).toBe(0);
      expect(db2.outcomes.length).toBe(1);
    });
  });
});
