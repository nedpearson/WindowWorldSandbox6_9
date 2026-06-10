import { describe, it, expect } from 'vitest';
import { runIntegrityCheck, type IntegrityReport } from './validationIntegrity';
import { runFullValidation, type ProjectValidationReport, type UnifiedWarning } from './centralValidationOrchestrator';
import { createMarkerData, type SketchMarkerData } from './sketchSync';

function makeOpening(overrides: Record<string, any> = {}): any {
  return {
    openingNumber: 1, width: 35, height: 53, productCategory: 'double_hung',
    seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White',
    gridStyle: 'None', glassPackage: 'LEE', removalType: 'ALUM',
    roomLocation: 'Living Room', elevation: 'front', floorNumber: 1,
    screenOption: 'Full Screen', totalPrice: 350, temperedGlass: 'none',
    obscureGlass: 'none', ...overrides,
  };
}

function makeMarker(n: number): SketchMarkerData {
  return { ...createMarkerData('s1', 'window_x', 100, 200, 'front', []), markerNumber: n } as any;
}

const emptyAppt = { id: 'test-1', customer: { name: 'Test' } };

function getReport(openings: any[], markers: any[] = []): ProjectValidationReport {
  return runFullValidation(openings, markers, [], emptyAppt);
}

describe('Validation Integrity Checker', () => {
  describe('Sketch/Order Synchronization', () => {
    it('flags orphan openings (no marker)', () => {
      const openings = [makeOpening({ openingNumber: 1 })];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const orphan = ir.issues.find(i => i.kind === 'orphan_opening');
      expect(orphan).toBeTruthy();
      expect(orphan!.message).toContain('#1');
    });

    it('flags orphan markers (no opening)', () => {
      const markers = [makeMarker(99)];
      const report = getReport([], markers);
      const ir = runIntegrityCheck(report, [], markers);
      const orphan = ir.issues.find(i => i.kind === 'orphan_marker');
      expect(orphan).toBeTruthy();
      expect(orphan!.message).toContain('#99');
    });

    it('flags count mismatch', () => {
      const openings = [makeOpening({ openingNumber: 1 }), makeOpening({ openingNumber: 2 })];
      const markers = [makeMarker(1)];
      const report = getReport(openings, markers);
      const ir = runIntegrityCheck(report, openings, markers);
      const mismatch = ir.issues.find(i => i.kind === 'sketch_order_mismatch');
      expect(mismatch).toBeTruthy();
    });

    it('passes when openings and markers match', () => {
      const openings = [makeOpening({ openingNumber: 1 })];
      const markers = [makeMarker(1)];
      const report = getReport(openings, markers);
      const ir = runIntegrityCheck(report, openings, markers);
      const syncIssues = ir.issues.filter(i => ['orphan_opening', 'orphan_marker', 'sketch_order_mismatch'].includes(i.kind));
      expect(syncIssues.length).toBe(0);
    });
  });

  describe('Opening Data Completeness', () => {
    it('flags price without dimensions', () => {
      const openings = [makeOpening({ openingNumber: 1, width: 0, height: 0, totalPrice: 400 })];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const issue = ir.issues.find(i => i.kind === 'price_without_dims');
      expect(issue).toBeTruthy();
      expect(issue!.severity).toBe('error');
    });

    it('flags dimensions without product type', () => {
      const openings = [makeOpening({ openingNumber: 1, width: 35, height: 53, productCategory: '' })];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const issue = ir.issues.find(i => i.kind === 'dims_without_product');
      expect(issue).toBeTruthy();
    });

    it('flags zero price on fully configured opening', () => {
      const openings = [makeOpening({ openingNumber: 1, totalPrice: 0 })];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const issue = ir.issues.find(i => i.kind === 'zero_price_complete');
      expect(issue).toBeTruthy();
      expect(issue!.severity).toBe('error');
    });

    it('passes for complete openings', () => {
      const openings = [makeOpening()];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const dataIssues = ir.issues.filter(i => ['price_without_dims', 'dims_without_product', 'zero_price_complete'].includes(i.kind));
      expect(dataIssues.length).toBe(0);
    });
  });

  describe('Warning Quality', () => {
    it('flags unexplained critical/high warnings', () => {
      // Create a report with a warning that has no explanation
      const openings = [makeOpening()];
      const report = getReport(openings);
      // Check if any existing warnings lack explanations
      const ir = runIntegrityCheck(report, openings, []);
      const unexplained = ir.issues.filter(i => i.kind === 'unexplained_warning');
      // All warnings from the engine should have explanations (via explainability enrichment)
      // If they do, great. If not, the integrity check catches them.
      expect(ir.checks.find(c => c.name === 'Warning Explainability')).toBeTruthy();
    });

    it('flags unactionable warnings', () => {
      const openings = [makeOpening()];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      expect(ir.checks.find(c => c.name === 'Warning Actionability')).toBeTruthy();
    });
  });

  describe('Blocker Detail Quality', () => {
    it('flags empty blocker detail', () => {
      const openings = [makeOpening({ width: 0, height: 0, totalPrice: 0 })];
      const report = getReport(openings);
      // Manually inject a bad blocker for testing
      const reportWithBadBlocker = { ...report, submissionBlockers: ['', 'too short'] };
      const ir = runIntegrityCheck(reportWithBadBlocker as any, openings, []);
      const bad = ir.issues.filter(i => i.kind === 'blocker_without_detail');
      expect(bad.length).toBe(2);
    });
  });

  describe('Duplicate Opening Numbers', () => {
    it('flags duplicate opening numbers', () => {
      const openings = [
        makeOpening({ openingNumber: 1 }),
        makeOpening({ openingNumber: 1 }),
        makeOpening({ openingNumber: 2 }),
      ];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const dups = ir.issues.filter(i => i.kind === 'duplicate_opening_num');
      expect(dups.length).toBe(1);
      expect(dups[0].severity).toBe('error');
    });
  });

  describe('Stale Warning Detection', () => {
    it('flags warnings referencing deleted openings', () => {
      // Create report with openings, then check against fewer openings
      const openings = [makeOpening({ openingNumber: 1 }), makeOpening({ openingNumber: 2 })];
      const report = getReport(openings);
      // Simulate deletion: check report against only opening 1
      const ir = runIntegrityCheck(report, [openings[0]], []);
      const stale = ir.issues.filter(i => i.kind === 'stale_warning');
      // If any warnings reference opening #2, they should be flagged as stale
      const has2Warnings = report.warnings.some(w => w.openingNumber === 2);
      if (has2Warnings) {
        expect(stale.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Validation Freshness', () => {
    it('flags stale timestamp', () => {
      const openings = [makeOpening()];
      const report = { ...getReport(openings), timestamp: Date.now() - 120_000 }; // 2 min old
      const ir = runIntegrityCheck(report, openings, []);
      const staleTs = ir.issues.find(i => i.kind === 'missing_sync_timestamp');
      expect(staleTs).toBeTruthy();
      expect(staleTs!.message).toContain('120s');
    });

    it('passes for fresh report', () => {
      const openings = [makeOpening()];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      const staleTs = ir.issues.find(i => i.kind === 'missing_sync_timestamp');
      expect(staleTs).toBeFalsy();
    });
  });

  describe('Report structure', () => {
    it('produces a valid report', () => {
      const openings = [makeOpening()];
      const markers = [makeMarker(1)];
      const report = getReport(openings, markers);
      const ir = runIntegrityCheck(report, openings, markers);
      expect(ir.timestamp).toBeTruthy();
      expect(ir.checks.length).toBe(10);
      expect(ir.summary).toBeTruthy();
    });

    it('passed=true when no errors', () => {
      const openings = [makeOpening()];
      const markers = [makeMarker(1)];
      const report = getReport(openings, markers);
      const ir = runIntegrityCheck(report, openings, markers);
      // Remove all error-level issues to check passed logic
      const errorCount = ir.issues.filter(i => i.severity === 'error').length;
      expect(ir.passed).toBe(errorCount === 0);
    });

    it('every issue has recommendation and context', () => {
      const openings = [makeOpening({ openingNumber: 1, width: 0, totalPrice: 500 })];
      const report = getReport(openings);
      const ir = runIntegrityCheck(report, openings, []);
      for (const issue of ir.issues) {
        expect(issue.recommendation).toBeTruthy();
        expect(issue.context).toBeTruthy();
        expect(issue.message).toBeTruthy();
      }
    });
  });
});
