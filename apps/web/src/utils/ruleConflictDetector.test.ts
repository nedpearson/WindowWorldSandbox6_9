import { describe, it, expect } from 'vitest';
import { detectConflicts, autoResolveConflicts, formatConflictSummary, type RuleConflict } from './ruleConflictDetector';
import type { UnifiedWarning } from './centralValidationOrchestrator';

function w(id: string, overrides: Partial<UnifiedWarning> = {}): UnifiedWarning {
  return {
    id, severity: 'warning', category: 'order', source: 'pricingValidation',
    title: 'Test', detail: 'Test detail', blocksSubmission: false, stage: 'quick_price' as any, ...overrides,
  };
}

describe('Rule Conflict Detector', () => {
  describe('Grid vs Color conflicts', () => {
    it('detects B1/A1 grid conflict with exterior color', () => {
      const warnings = [
        w('pricing-GRD_EXT-1', { category: 'grid', openingNumber: 1, detail: 'Exterior color requires B1 contoured grids' }),
        w('pricing-GRD_DIA-1', { category: 'grid', openingNumber: 1, detail: 'Diamond pattern requires A1 flat grids' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('grid_color');
      expect(conflicts[0].resolution.safestConfig.gridType).toBe('B1');
      expect(conflicts[0].resolution.safestConfig.gridPattern).toBe('Colonial');
      expect(conflicts[0].resolution.autoFixable).toBe(true);
    });

    it('provides alternative configs', () => {
      const warnings = [
        w('a', { category: 'grid', openingNumber: 1, detail: 'B1 contoured required' }),
        w('b', { category: 'grid', openingNumber: 1, detail: 'Diamond needs A1 flat' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts[0].resolution.alternativeConfigs).toBeTruthy();
      expect(conflicts[0].resolution.alternativeConfigs!.length).toBeGreaterThanOrEqual(2);
    });

    it('does not conflict across different openings', () => {
      const warnings = [
        w('a', { category: 'grid', openingNumber: 1, detail: 'B1 required' }),
        w('b', { category: 'grid', openingNumber: 2, detail: 'A1 flat' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('Screen vs Product conflicts', () => {
    it('detects screen conflict on picture window', () => {
      const warnings = [
        w('pricing-SCR_PIC-1', { category: 'screen', openingNumber: 1, detail: 'Picture window cannot have screen' }),
        w('est-scr-missing-1', { category: 'screen', openingNumber: 1, detail: 'No screen selected — should have screen' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('screen_product');
      expect(conflicts[0].resolution.strategy).toBe('prefer_a');
      expect(conflicts[0].resolution.safestConfig.screenOption).toBe('No Screen');
    });
  });

  describe('Tempered conflicts', () => {
    it('detects code-required vs customer decline conflict', () => {
      const warnings = [
        w('safety-bathroom-1', { category: 'tempered', severity: 'critical', openingNumber: 1, detail: 'Building code requires tempered glass in bathroom' }),
        w('override-tempered-1', { category: 'tempered', openingNumber: 1, detail: 'Customer declined tempered glass' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('tempered_override');
      expect(conflicts[0].resolution.safestConfig.temperedGlass).toBe('full');
    });
  });

  describe('Color vs Series conflicts', () => {
    it('detects clay vinyl not available in series', () => {
      const warnings = [
        w('pricing-CLR_CLAY-1', { category: 'color', openingNumber: 1, detail: 'Clay vinyl not available in this series' }),
        w('est-clay-1', { category: 'color', openingNumber: 1, detail: 'Clay vinyl selected' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('color_series');
      expect(conflicts[0].resolution.alternativeConfigs).toBeTruthy();
    });
  });

  describe('Oriel vs Series conflicts', () => {
    it('detects 3000 series oriel > 50" conflict', () => {
      const warnings = [
        w('pricing-ORI-1', { category: 'specialty', openingNumber: 1, detail: '3000 Series DH oriel exceeds 50" max' }),
        w('spec-oriel-1', { category: 'specialty', openingNumber: 1, detail: 'Oriel measurement: 54"' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('oriel_series');
      expect(conflicts[0].resolution.safestConfig.seriesModel).toContain('03A0');
    });
  });

  describe('Specialty trim conflicts', () => {
    it('detects trim required vs polygon no-trim', () => {
      const warnings = [
        w('spec-trim-1', { category: 'specialty', openingNumber: 1, detail: 'Radius shape requires bent trim' }),
        w('spec-poly-1', { category: 'specialty', openingNumber: 1, detail: 'Polygon shape — trim not needed' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('specialty_trim');
      expect(conflicts[0].resolution.strategy).toBe('manual_review');
      expect(conflicts[0].resolution.autoFixable).toBe(false);
    });
  });

  describe('Mull conflicts', () => {
    it('detects mull size exceeding limits', () => {
      const warnings = [
        w('mull-size-1', { category: 'mull', detail: 'Combined mull unit exceeds maximum dimensions' }),
        w('mull-struct-1', { category: 'mull', detail: 'Structural mull bar reinforcement flagged' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('mull_size');
    });
  });

  describe('Size contradictions', () => {
    it('detects both too-small and too-large on same opening', () => {
      const warnings = [
        w('sz-min-1', { category: 'measurement', openingNumber: 1, detail: 'Width is below min width for this model' }),
        w('sz-max-1', { category: 'measurement', openingNumber: 1, detail: 'Height exceeds max height for this model' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('size_product');
      expect(conflicts[0].resolution.strategy).toBe('manual_review');
    });
  });

  describe('Pricing discount conflicts', () => {
    it('detects discount applied on ineligible unit', () => {
      const warnings = [
        w('price-no-disc-1', { category: 'pricing', openingNumber: 1, detail: 'Special shape >84" — not eligible for standard discount, full price required' }),
        w('price-disc-1', { category: 'pricing', openingNumber: 1, detail: '80% standard discount applied' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe('pricing_discount');
    });
  });

  describe('Deduplication', () => {
    it('does not produce duplicate conflicts', () => {
      const warnings = [
        w('a', { category: 'grid', openingNumber: 1, detail: 'B1 required for exterior color' }),
        w('b', { category: 'grid', openingNumber: 1, detail: 'A1 flat selected for diamond' }),
      ];
      // Run twice — should still be 1
      const c1 = detectConflicts(warnings);
      const c2 = detectConflicts(warnings);
      expect(c1.length).toBe(1);
      expect(c2.length).toBe(1);
    });
  });

  describe('Auto-resolver', () => {
    it('auto-fixes grid conflict', () => {
      const openings = [{ openingNumber: 1, gridType: 'A1', gridPattern: 'Diamond', exteriorColor: 'Bronze' }];
      const conflicts: RuleConflict[] = [{
        id: 'c1', conflictType: 'grid_color', field: 'gridType', openingNumber: 1,
        description: 'Grid conflict', warningA: w('a'), warningB: w('b'),
        resolution: { strategy: 'safest_config', recommendation: 'Change to B1', safestConfig: { gridType: 'B1', gridPattern: 'Colonial' }, autoFixable: true },
      }];
      const { updatedOpenings, resolved, needsReview } = autoResolveConflicts(openings, conflicts);
      expect(updatedOpenings[0].gridType).toBe('B1');
      expect(updatedOpenings[0].gridPattern).toBe('Colonial');
      expect(resolved.length).toBe(1);
      expect(needsReview.length).toBe(0);
    });

    it('skips non-auto-fixable conflicts', () => {
      const openings = [{ openingNumber: 1 }];
      const conflicts: RuleConflict[] = [{
        id: 'c1', conflictType: 'specialty_trim', field: 'trimRequired', openingNumber: 1,
        description: 'Trim conflict', warningA: w('a'), warningB: w('b'),
        resolution: { strategy: 'manual_review', recommendation: 'Verify', safestConfig: {}, autoFixable: false },
      }];
      const { resolved, needsReview } = autoResolveConflicts(openings, conflicts);
      expect(resolved.length).toBe(0);
      expect(needsReview.length).toBe(1);
    });

    it('does not mutate original openings', () => {
      const openings = [{ openingNumber: 1, gridType: 'A1' }];
      const conflicts: RuleConflict[] = [{
        id: 'c1', conflictType: 'grid_color', field: 'gridType', openingNumber: 1,
        description: '', warningA: w('a'), warningB: w('b'),
        resolution: { strategy: 'safest_config', recommendation: '', safestConfig: { gridType: 'B1' }, autoFixable: true },
      }];
      autoResolveConflicts(openings, conflicts);
      expect(openings[0].gridType).toBe('A1'); // unchanged
    });
  });

  describe('Summary formatter', () => {
    it('formats conflict summaries', () => {
      const conflicts: RuleConflict[] = [{
        id: 'c1', conflictType: 'grid_color', field: 'gridType', openingNumber: 1,
        description: 'Grid and color conflict', warningA: w('a'), warningB: w('b'),
        resolution: { strategy: 'safest_config', recommendation: '', safestConfig: {}, autoFixable: true },
      }];
      const summaries = formatConflictSummary(conflicts);
      expect(summaries.length).toBe(1);
      expect(summaries[0]).toContain('GRID COLOR');
      expect(summaries[0]).toContain('Auto-fixable');
    });
  });

  describe('No conflicts on clean data', () => {
    it('returns empty for non-conflicting warnings', () => {
      const warnings = [
        w('a', { category: 'tempered', openingNumber: 1, detail: 'Add tempered glass' }),
        w('b', { category: 'screen', openingNumber: 2, detail: 'Missing screen' }),
        w('c', { category: 'order', openingNumber: 3, detail: 'Missing room location' }),
      ];
      const conflicts = detectConflicts(warnings);
      expect(conflicts.length).toBe(0);
    });
  });
});
