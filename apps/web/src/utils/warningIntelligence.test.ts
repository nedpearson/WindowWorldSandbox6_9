import { describe, it, expect } from 'vitest';
import { applyWarningIntelligence, getIntelligenceSummary, type EnrichedWarning } from './warningIntelligence';
import type { UnifiedWarning } from './centralValidationOrchestrator';

function w(id: string, overrides: Partial<UnifiedWarning> = {}): UnifiedWarning {
  return {
    id, severity: 'warning', category: 'order', source: 'openingValidation',
    title: 'Test Warning', detail: 'Test detail', blocksSubmission: false,
    ...overrides,
  } as UnifiedWarning;
}

describe('Warning Intelligence', () => {
  describe('Confidence scoring', () => {
    it('pricingValidation gets highest base confidence', () => {
      const result = applyWarningIntelligence([w('p1', { source: 'pricingValidation' })], []);
      expect(result[0].intelligence.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('seniorEstimator gets lower base confidence', () => {
      const result = applyWarningIntelligence([w('e1', { source: 'seniorEstimator' })], []);
      expect(result[0].intelligence.confidence).toBeLessThan(0.7);
    });

    it('lowers confidence for "Verify" language', () => {
      const normal = applyWarningIntelligence([w('n1', { source: 'businessRules', detail: 'Grid type required' })], []);
      const verify = applyWarningIntelligence([w('v1', { source: 'businessRules', detail: 'Verify this is correct' })], []);
      expect(verify[0].intelligence.confidence).toBeLessThan(normal[0].intelligence.confidence);
    });

    it('assigns confidence labels correctly', () => {
      const result = applyWarningIntelligence([
        w('h1', { source: 'pricingValidation' }),
        w('l1', { source: 'seniorEstimator', detail: 'Verify this unusual value' }),
      ], []);
      expect(result[0].intelligence.confidenceLabel).toBe('certain');
      // Estimator + "Verify" = low
      expect(['medium', 'low']).toContain(result[1].intelligence.confidenceLabel);
    });
  });

  describe('Contextual confidence adjustment', () => {
    it('lowers price anomaly confidence on small jobs', () => {
      const result = applyWarningIntelligence(
        [w('est-price-high-1', { source: 'seniorEstimator', category: 'pricing', detail: 'Price is 3x above average' })],
        [{ width: 35, height: 53, totalPrice: 500 }, { width: 30, height: 40, totalPrice: 300 }],
      );
      expect(result[0].intelligence.confidence).toBeLessThan(0.3);
      expect(result[0].intelligence.contextNotes).toContain('Too few');
    });

    it('does not penalize price anomaly on large jobs', () => {
      const openings = Array.from({ length: 8 }, (_, i) => ({ width: 35, height: 53, totalPrice: 400 + i }));
      const result = applyWarningIntelligence(
        [w('est-price-high-1', { source: 'seniorEstimator', category: 'pricing', detail: 'price 3x above' })],
        openings,
      );
      // Still estimator-level confidence, but not penalized for job size
      expect(result[0].intelligence.contextNotes).toBeUndefined();
    });
  });

  describe('Semantic deduplication', () => {
    it('suppresses duplicate warnings from different engines on same opening', () => {
      const result = applyWarningIntelligence([
        w('p-screen-1', { source: 'pricingValidation', category: 'screen', openingNumber: 1, detail: 'Picture window cannot have full screen' }),
        w('r-screen-1', { source: 'businessRules', category: 'screen', openingNumber: 1, detail: 'Full screen on picture window is invalid' }),
      ], [{ openingNumber: 1 }]);

      const suppressed = result.filter(r => r.intelligence.suppressed);
      expect(suppressed.length).toBe(1);
      expect(suppressed[0].intelligence.suppressReason).toContain('Duplicate');
    });

    it('does not suppress warnings on different openings', () => {
      const result = applyWarningIntelligence([
        w('p-screen-1', { source: 'pricingValidation', category: 'screen', openingNumber: 1, detail: 'Full screen invalid' }),
        w('p-screen-2', { source: 'pricingValidation', category: 'screen', openingNumber: 2, detail: 'Full screen invalid' }),
      ], [{ openingNumber: 1 }, { openingNumber: 2 }]);

      const suppressed = result.filter(r => r.intelligence.suppressed);
      expect(suppressed.length).toBe(0);
    });
  });

  describe('Conflict resolution', () => {
    it('suppresses "missing screen" when picture window screen block exists', () => {
      const result = applyWarningIntelligence([
        w('pricing-SCR_PIC-1', { source: 'pricingValidation', category: 'screen', openingNumber: 1, detail: 'Picture cannot have screen', severity: 'critical' }),
        w('est-scr-missing-1', { source: 'seniorEstimator', category: 'screen', openingNumber: 1, detail: 'No screen selected' }),
      ], [{ openingNumber: 1 }]);

      const missing = result.find(r => r.id === 'est-scr-missing-1');
      expect(missing!.intelligence.suppressed).toBe(true);
      expect(missing!.intelligence.suppressReason).toContain('picture window');
    });

    it('suppresses "whole-inch typo" when dimensions are missing', () => {
      const result = applyWarningIntelligence([
        w('missing-width-1', { category: 'order', openingNumber: 1, detail: 'Missing width' }),
        w('est-typo-whole-1', { source: 'seniorEstimator', openingNumber: 1, detail: 'Whole inch dimensions' }),
      ], [{ openingNumber: 1 }]);

      const typo = result.find(r => r.id === 'est-typo-whole-1');
      expect(typo!.intelligence.suppressed).toBe(true);
    });
  });

  describe('Contextual suppression', () => {
    it('suppresses front door warning when no openings exist', () => {
      const result = applyWarningIntelligence([
        w('sketch-missing_front_door-g', { category: 'sketch', detail: 'No front door' }),
      ], []);

      expect(result[0].intelligence.suppressed).toBe(true);
      expect(result[0].intelligence.suppressReason).toContain('not started');
    });

    it('suppresses price anomalies with fewer than 3 priced openings', () => {
      const result = applyWarningIntelligence([
        w('est-price-high-1', { source: 'seniorEstimator', category: 'pricing', detail: 'High price' }),
      ], [{ totalPrice: 500 }, { totalPrice: 300 }]);

      expect(result[0].intelligence.suppressed).toBe(true);
    });
  });

  describe('Low-confidence critical demotion', () => {
    it('demotes estimator critical with low confidence to warning', () => {
      const result = applyWarningIntelligence([
        w('est-geo-something', {
          source: 'seniorEstimator', severity: 'critical', blocksSubmission: true,
          detail: 'Verify this unusual dimension ratio',
        }),
      ], []);

      const item = result[0];
      // Should have been demoted because: estimator + "Verify" + critical = low confidence
      expect(item.severity).toBe('warning');
      expect(item.blocksSubmission).toBe(false);
    });

    it('does not demote high-confidence criticals', () => {
      const result = applyWarningIntelligence([
        w('pricing-SCR_PIC-1', { source: 'pricingValidation', severity: 'critical', blocksSubmission: true, detail: 'Picture cannot have screen' }),
      ], []);

      expect(result[0].severity).toBe('critical');
      expect(result[0].blocksSubmission).toBe(true);
    });
  });

  describe('Grouping', () => {
    it('groups tempered warnings when 3+ exist', () => {
      const result = applyWarningIntelligence([
        w('t1', { category: 'tempered', openingNumber: 1 }),
        w('t2', { category: 'tempered', openingNumber: 2 }),
        w('t3', { category: 'tempered', openingNumber: 3 }),
      ], [{ openingNumber: 1 }, { openingNumber: 2 }, { openingNumber: 3 }]);

      const groups = result.filter(r => r.intelligence.groupId === 'tempered-review');
      expect(groups.length).toBe(3);
      expect(groups[0].intelligence.groupLabel).toContain('Tempered Glass Review');
    });

    it('groups consistency warnings', () => {
      const result = applyWarningIntelligence([
        w('c1', { category: 'consistency', detail: 'Mixed grids' }),
        w('c2', { category: 'consistency', detail: 'Mixed colors' }),
      ], []);

      const groups = result.filter(r => r.intelligence.groupId === 'consistency-review');
      expect(groups.length).toBe(2);
    });
  });

  describe('Prioritization', () => {
    it('ranks critical blockers above info suggestions', () => {
      const result = applyWarningIntelligence([
        w('info1', { severity: 'info', source: 'seniorEstimator', detail: 'Suggestion' }),
        w('crit1', { severity: 'critical', source: 'pricingValidation', blocksSubmission: true, detail: 'Blocker' }),
      ], []);

      const visible = result.filter(r => !r.intelligence.suppressed);
      expect(visible[0].id).toBe('crit1');
    });

    it('boosts warnings with quick fixes', () => {
      const result = applyWarningIntelligence([
        w('nofix', { severity: 'warning', source: 'openingValidation', detail: 'Issue A' }),
        w('hasfix', { severity: 'warning', source: 'openingValidation', detail: 'Issue B', recommendedFix: { label: 'Fix', actionType: 'set_fields', payload: { fields: {} }, targetOpenings: [] } as any }),
      ], []);

      const vis = result.filter(r => !r.intelligence.suppressed);
      const fixIdx = vis.findIndex(r => r.id === 'hasfix');
      const noFixIdx = vis.findIndex(r => r.id === 'nofix');
      expect(fixIdx).toBeLessThan(noFixIdx);
    });
  });

  describe('Overflow suppression', () => {
    it('caps visible warnings at maxVisibleWarnings', () => {
      const many = Array.from({ length: 40 }, (_, i) => w(`w${i}`, { severity: 'info', source: 'seniorEstimator', detail: `Warning ${i}` }));
      const result = applyWarningIntelligence(many, [], { maxVisibleWarnings: 10 });
      const visible = result.filter(r => !r.intelligence.suppressed);
      expect(visible.length).toBeLessThanOrEqual(10);
    });

    it('never suppresses critical warnings due to overflow', () => {
      const criticals = Array.from({ length: 5 }, (_, i) => w(`c${i}`, { severity: 'critical', source: 'pricingValidation', detail: `Critical ${i}`, blocksSubmission: true }));
      const infos = Array.from({ length: 30 }, (_, i) => w(`i${i}`, { severity: 'info', source: 'seniorEstimator', detail: `Info ${i}` }));
      const result = applyWarningIntelligence([...criticals, ...infos], [], { maxVisibleWarnings: 10 });
      const visibleCritical = result.filter(r => !r.intelligence.suppressed && r.severity === 'critical');
      expect(visibleCritical.length).toBe(5);
    });
  });

  describe('Intelligence summary', () => {
    it('calculates correct summary stats', () => {
      const result = applyWarningIntelligence([
        w('v1', { source: 'pricingValidation', detail: 'A' }),
        w('v2', { source: 'seniorEstimator', detail: 'B' }),
        w('v3', { source: 'seniorEstimator', detail: 'Verify unusual C', category: 'pricing' }),
      ], [{ totalPrice: 100 }]);

      const summary = getIntelligenceSummary(result);
      expect(summary.total).toBe(3);
      expect(summary.visible).toBeLessThanOrEqual(3);
      expect(summary.avgConfidence).toBeGreaterThan(0);
      expect(summary.avgConfidence).toBeLessThanOrEqual(100);
    });
  });
});
