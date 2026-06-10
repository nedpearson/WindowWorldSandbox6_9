import { describe, it, expect } from 'vitest';
import {
  buildFixPlan, getNextFix, getInvalidatedCategories, shouldRevalidateAll,
  type PrioritizedFix, type FixPlan,
} from './fixPrioritization';
import type { UnifiedWarning } from './centralValidationOrchestrator';

function w(id: string, overrides: Partial<UnifiedWarning> = {}): UnifiedWarning {
  return {
    id, severity: 'warning', category: 'order', source: 'test',
    title: 'Test Warning', detail: 'Test detail', blocksSubmission: false, ...overrides,
  } as UnifiedWarning;
}

describe('Fix Prioritization Engine', () => {
  describe('Tier classification', () => {
    it('classifies critical blockers as tier 1', () => {
      const plan = buildFixPlan([
        w('crit-1', { severity: 'critical', blocksSubmission: true, category: 'pricing' }),
      ]);
      expect(plan.fixes[0].tier).toBe('critical_blocker');
    });

    it('classifies missing dimensions as measurement', () => {
      const plan = buildFixPlan([
        w('missing-width-1', { category: 'order', detail: 'Missing width' }),
      ]);
      expect(plan.fixes[0].tier).toBe('measurement');
    });

    it('classifies geometry/specialty as geometry tier', () => {
      const plan = buildFixPlan([
        w('geo-1', { category: 'geometry' }),
        w('spec-1', { category: 'specialty' }),
      ]);
      expect(plan.fixes.every(f => f.tier === 'geometry')).toBe(true);
    });

    it('classifies tempered as safety tier', () => {
      const plan = buildFixPlan([w('temp-1', { category: 'tempered' })]);
      expect(plan.fixes[0].tier).toBe('safety');
    });

    it('classifies screen/grid/color as pricing tier', () => {
      const plan = buildFixPlan([
        w('s1', { category: 'screen' }),
        w('g1', { category: 'grid' }),
        w('c1', { category: 'color' }),
      ]);
      expect(plan.fixes.every(f => f.tier === 'pricing')).toBe(true);
    });

    it('classifies consistency/sketch as cosmetic', () => {
      const plan = buildFixPlan([
        w('con-1', { category: 'consistency' }),
        w('sk-1', { category: 'sketch' }),
      ]);
      expect(plan.fixes.every(f => f.tier === 'cosmetic')).toBe(true);
    });
  });

  describe('Priority ordering', () => {
    it('orders critical blockers before everything', () => {
      const plan = buildFixPlan([
        w('cosmetic-1', { category: 'consistency', severity: 'info' }),
        w('blocker-1', { severity: 'critical', blocksSubmission: true, category: 'pricing' }),
        w('measure-1', { category: 'measurement', severity: 'high' }),
      ]);
      expect(plan.fixes[0].warning.id).toBe('blocker-1');
      expect(plan.fixes[0].tier).toBe('critical_blocker');
    });

    it('orders measurements before geometry', () => {
      const plan = buildFixPlan([
        w('geo-1', { category: 'geometry', severity: 'high' }),
        w('missing-width-1', { category: 'order', severity: 'high' }),
      ]);
      expect(plan.fixes[0].warning.id).toBe('missing-width-1');
    });

    it('orders safety before pricing', () => {
      const plan = buildFixPlan([
        w('price-1', { category: 'pricing', severity: 'high' }),
        w('temp-1', { category: 'tempered', severity: 'high' }),
      ]);
      const tempRank = plan.fixes.find(f => f.warning.id === 'temp-1')!.rank;
      const priceRank = plan.fixes.find(f => f.warning.id === 'price-1')!.rank;
      expect(tempRank).toBeLessThan(priceRank);
    });

    it('orders pricing before cosmetic', () => {
      const plan = buildFixPlan([
        w('cos-1', { category: 'consistency', severity: 'warning' }),
        w('price-1', { category: 'pricing', severity: 'warning' }),
      ]);
      const priceRank = plan.fixes.find(f => f.warning.id === 'price-1')!.rank;
      const cosRank = plan.fixes.find(f => f.warning.id === 'cos-1')!.rank;
      expect(priceRank).toBeLessThan(cosRank);
    });

    it('within same tier, higher severity comes first', () => {
      const plan = buildFixPlan([
        w('t-info', { category: 'tempered', severity: 'info' }),
        w('t-crit', { category: 'tempered', severity: 'critical' }),
      ]);
      expect(plan.fixes[0].warning.id).toBe('t-crit');
    });

    it('quick-fix warnings rank higher than non-quickfix within same tier', () => {
      const plan = buildFixPlan([
        w('no-qf', { category: 'tempered', severity: 'warning' }),
        w('has-qf', { category: 'tempered', severity: 'warning', recommendedFix: { label: 'Fix', actionType: 'set_fields', payload: { fields: {} }, targetOpenings: [] } as any }),
      ]);
      const qfRank = plan.fixes.find(f => f.warning.id === 'has-qf')!.rank;
      const noRank = plan.fixes.find(f => f.warning.id === 'no-qf')!.rank;
      expect(qfRank).toBeLessThan(noRank);
    });
  });

  describe('Dependency chains', () => {
    it('measurement fix lists downstream dependents', () => {
      const plan = buildFixPlan([
        w('m1', { category: 'measurement', openingNumber: 1 }),
        w('g1', { category: 'geometry', openingNumber: 1 }),
        w('p1', { category: 'pricing', openingNumber: 1 }),
      ]);
      const mFix = plan.fixes.find(f => f.warning.id === 'm1')!;
      expect(mFix.dependents).toContain('g1');
      expect(mFix.dependents).toContain('p1');
      expect(mFix.estimatedImpact).toBeGreaterThanOrEqual(2);
    });

    it('geometry fix lists dependsOn measurement', () => {
      const plan = buildFixPlan([
        w('m1', { category: 'measurement', openingNumber: 1 }),
        w('g1', { category: 'geometry', openingNumber: 1 }),
      ]);
      const gFix = plan.fixes.find(f => f.warning.id === 'g1')!;
      expect(gFix.dependsOn).toContain('m1');
    });

    it('does not link dependents across different openings', () => {
      const plan = buildFixPlan([
        w('m1', { category: 'measurement', openingNumber: 1 }),
        w('g2', { category: 'geometry', openingNumber: 2 }),
      ]);
      const mFix = plan.fixes.find(f => f.warning.id === 'm1')!;
      expect(mFix.dependents).not.toContain('g2');
    });

    it('color fix cascades to grid', () => {
      const plan = buildFixPlan([
        w('c1', { category: 'color', openingNumber: 1 }),
        w('g1', { category: 'grid', openingNumber: 1 }),
      ]);
      const cFix = plan.fixes.find(f => f.warning.id === 'c1')!;
      expect(cFix.dependents).toContain('g1');
    });
  });

  describe('Fix instructions', () => {
    it('uses explanation.howToFix when available', () => {
      const plan = buildFixPlan([
        w('w1', { explanation: { whatIsWrong: 'x', whyItMatters: 'y', consequence: 'z', howToFix: 'Do ABC', sourceRule: 'rule', overrideAllowed: false } }),
      ]);
      expect(plan.fixes[0].fixInstruction).toBe('Do ABC');
    });

    it('falls back to suggestion', () => {
      const plan = buildFixPlan([w('w1', { suggestion: 'Try this instead' })]);
      expect(plan.fixes[0].fixInstruction).toBe('Try this instead');
    });

    it('falls back to recommendedFix description', () => {
      const plan = buildFixPlan([w('w1', { recommendedFix: { label: 'Fix it', actionType: 'set_fields', payload: { fields: { temperedGlass: 'full' } }, targetOpenings: [1] } as any })]);
      expect(plan.fixes[0].fixInstruction).toContain('temperedGlass');
    });
  });

  describe('nextUp / getNextFix', () => {
    it('marks only the first fix as isNextUp', () => {
      const plan = buildFixPlan([
        w('a', { category: 'consistency' }),
        w('b', { category: 'measurement' }),
        w('c', { severity: 'critical', blocksSubmission: true, category: 'grid' }),
      ]);
      const nextUps = plan.fixes.filter(f => f.isNextUp);
      expect(nextUps.length).toBe(1);
      expect(plan.nextUp).toBeTruthy();
    });

    it('getNextFix returns actionable message', () => {
      const { fix, message, remaining } = getNextFix([
        w('blocker-1', { severity: 'critical', blocksSubmission: true, title: 'Missing width', category: 'order' }),
        w('info-1', { category: 'consistency', severity: 'info' }),
      ]);
      expect(fix).toBeTruthy();
      expect(message).toContain('Missing width');
      expect(remaining).toBe(2);
    });

    it('getNextFix reports all-clear when no warnings', () => {
      const { fix, message } = getNextFix([]);
      expect(fix).toBeNull();
      expect(message).toContain('All clear');
    });

    it('includes impact count in message', () => {
      const { message } = getNextFix([
        w('m1', { category: 'measurement', openingNumber: 1, title: 'Missing width' }),
        w('g1', { category: 'geometry', openingNumber: 1 }),
        w('p1', { category: 'pricing', openingNumber: 1 }),
      ]);
      expect(message).toContain('resolve');
    });
  });

  describe('Incremental re-validation', () => {
    it('measurement fix invalidates all downstream categories', () => {
      const cats = getInvalidatedCategories(w('m1', { category: 'measurement' }));
      expect(cats).toContain('geometry');
      expect(cats).toContain('pricing');
      expect(cats).toContain('screen');
      expect(cats).toContain('grid');
      expect(cats).toContain('measurement'); // always re-check self
    });

    it('color fix invalidates grid', () => {
      const cats = getInvalidatedCategories(w('c1', { category: 'color' }));
      expect(cats).toContain('grid');
      expect(cats).toContain('color');
    });

    it('tempered fix invalidates egress', () => {
      const cats = getInvalidatedCategories(w('t1', { category: 'tempered' }));
      expect(cats).toContain('egress');
    });

    it('shouldRevalidateAll returns true for measurement/order', () => {
      expect(shouldRevalidateAll(w('m1', { category: 'measurement' }))).toBe(true);
      expect(shouldRevalidateAll(w('m1', { category: 'order' }))).toBe(true);
      expect(shouldRevalidateAll(w('missing-width-1'))).toBe(true);
      expect(shouldRevalidateAll(w('missing-height-2'))).toBe(true);
    });

    it('shouldRevalidateAll returns false for cosmetic', () => {
      expect(shouldRevalidateAll(w('c1', { category: 'consistency' }))).toBe(false);
    });
  });

  describe('Summary', () => {
    it('builds readable summary', () => {
      const plan = buildFixPlan([
        w('b1', { severity: 'critical', blocksSubmission: true, category: 'grid' }),
        w('b2', { severity: 'critical', blocksSubmission: true, category: 'screen' }),
        w('m1', { category: 'measurement' }),
        w('c1', { category: 'consistency' }),
      ]);
      expect(plan.summary).toContain('2 critical blockers');
      expect(plan.summary).toContain('1 measurement issue');
      expect(plan.summary).toContain('1 recommendation');
    });

    it('reports all-clear when empty', () => {
      const plan = buildFixPlan([]);
      expect(plan.summary).toContain('clean');
    });
  });

  describe('Plan structure', () => {
    it('tiers contain correct grouping', () => {
      const plan = buildFixPlan([
        w('b1', { severity: 'critical', blocksSubmission: true, category: 'grid' }),
        w('m1', { category: 'measurement' }),
        w('t1', { category: 'tempered' }),
        w('c1', { category: 'consistency' }),
      ]);
      expect(plan.tiers.critical_blocker.length).toBe(1);
      expect(plan.tiers.measurement.length).toBe(1);
      expect(plan.tiers.safety.length).toBe(1);
      expect(plan.tiers.cosmetic.length).toBe(1);
      expect(plan.totalFixable).toBe(4);
    });

    it('ranks are sequential 1-based', () => {
      const plan = buildFixPlan([
        w('a', { category: 'consistency' }),
        w('b', { category: 'measurement' }),
        w('c', { category: 'tempered' }),
      ]);
      const ranks = plan.fixes.map(f => f.rank);
      expect(ranks).toEqual([1, 2, 3]);
    });
  });
});
