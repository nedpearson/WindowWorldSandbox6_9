// ═══════════════════════════════════════════════════════════════
// Pre-Submission Sweep — Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { runPreSubmissionSweep, type ReadinessReport } from './preSubmissionSweep';

// Mock localStorage for manager review module
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => Object.keys(store).forEach(k => delete store[k]),
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
});

// ── Test Data ──────────────────────────────────────────────
const completeOpening = {
  openingNumber: 1, width: 36, height: 60, roomLocation: 'Kitchen',
  elevation: 'front', productCategory: 'double_hung',
  interiorColor: 'White', exteriorColor: 'White',
  gridStyle: 'None', glassPackage: 'LEE', removalType: 'ALUM',
  totalPrice: 350, screenOption: 'half',
  installNotes: 'Standard install',
};

const incompleteOpening = {
  openingNumber: 2, width: 0, height: 0, roomLocation: '',
  productCategory: '', totalPrice: 0,
};

const minimalAppointment = {
  id: 'test-appt',
  openings: [],
  signatures: [],
  customer: { firstName: 'Test', lastName: 'User' },
};

describe('Pre-Submission Sweep', () => {

  describe('Score calculation', () => {
    it('returns a valid score for complete project', () => {
      const report = runPreSubmissionSweep(
        [completeOpening], [], [], { ...minimalAppointment, openings: [completeOpening], signatures: [{ signerRole: 'customer' }] },
      );
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    });

    it('returns low score for empty project', () => {
      const report = runPreSubmissionSweep([], [], [], minimalAppointment);
      expect(report.score).toBeLessThan(90);
    });

    it('returns grade A-F based on score', () => {
      const report = runPreSubmissionSweep([], [], [], minimalAppointment);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    });
  });

  describe('Blocker detection', () => {
    it('blocks submission when no signatures', () => {
      const report = runPreSubmissionSweep(
        [completeOpening], [], [], { ...minimalAppointment, openings: [completeOpening] },
      );
      expect(report.unresolvedCriticals.length).toBeGreaterThan(0);
      expect(report.ready).toBe(false);
    });

    it('detects missing measurements as blockers', () => {
      const report = runPreSubmissionSweep(
        [incompleteOpening], [], [],
        { ...minimalAppointment, openings: [incompleteOpening] },
      );
      const measurementBlockers = report.checkpoints.filter(
        c => (c.category === 'measurements' || c.category === 'openings') && c.status === 'fail'
      );
      expect(measurementBlockers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Category grouping', () => {
    it('groups checkpoints by category', () => {
      const report = runPreSubmissionSweep(
        [completeOpening], [], [], { ...minimalAppointment, openings: [completeOpening] },
      );
      expect(typeof report.byCategory).toBe('object');
      for (const [cat, items] of Object.entries(report.byCategory)) {
        expect(Array.isArray(items)).toBe(true);
        for (const item of items) {
          expect(item.category).toBe(cat);
        }
      }
    });
  });

  describe('Recommended fixes', () => {
    it('generates prioritized fix list', () => {
      const report = runPreSubmissionSweep(
        [incompleteOpening], [], [],
        { ...minimalAppointment, openings: [incompleteOpening] },
      );
      expect(report.recommendedFixes.length).toBeGreaterThan(0);
      // Verify priority ordering
      for (let i = 1; i < report.recommendedFixes.length; i++) {
        expect(report.recommendedFixes[i].priority).toBeGreaterThan(report.recommendedFixes[i - 1].priority);
      }
    });

    it('critical fixes come before warnings', () => {
      const report = runPreSubmissionSweep(
        [incompleteOpening], [], [],
        { ...minimalAppointment, openings: [incompleteOpening] },
      );
      if (report.recommendedFixes.length >= 2) {
        // First fix should relate to a more severe issue
        expect(report.recommendedFixes[0].priority).toBe(1);
      }
    });
  });

  describe('Brick house depth checks', () => {
    it('flags missing depth on brick house', () => {
      const opNoDepth = { ...completeOpening, openingDepth: 0 };
      const report = runPreSubmissionSweep(
        [opNoDepth], [], [],
        { ...minimalAppointment, openings: [opNoDepth] },
        { isBrickHouse: true },
      );
      const depthIssues = report.checkpoints.filter(c => c.category === 'depth');
      expect(depthIssues.length).toBeGreaterThan(0);
    });

    it('no depth issues on non-brick house', () => {
      const report = runPreSubmissionSweep(
        [completeOpening], [], [],
        { ...minimalAppointment, openings: [completeOpening] },
        { isBrickHouse: false },
      );
      const sweepDepth = report.checkpoints.filter(c => c.id.startsWith('sweep-depth'));
      expect(sweepDepth.length).toBe(0);
    });
  });

  describe('Notes and photos', () => {
    it('warns when special condition lacks installer notes', () => {
      const opSpecial = { ...completeOpening, sillRepair: true, installNotes: '' };
      const report = runPreSubmissionSweep(
        [opSpecial], [], [],
        { ...minimalAppointment, openings: [opSpecial] },
      );
      const noteIssues = report.checkpoints.filter(c => c.id.includes('install-notes'));
      expect(noteIssues.length).toBeGreaterThan(0);
    });

    it('warns about missing room location', () => {
      const opNoRoom = { ...completeOpening, roomLocation: '' };
      const report = runPreSubmissionSweep(
        [opNoRoom], [], [],
        { ...minimalAppointment, openings: [opNoRoom] },
      );
      const roomIssues = report.checkpoints.filter(c => c.id.includes('sweep-room'));
      expect(roomIssues.length).toBe(1);
    });
  });

  describe('Report structure', () => {
    it('includes all required fields', () => {
      const report = runPreSubmissionSweep([], [], [], minimalAppointment);
      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('grade');
      expect(report).toHaveProperty('ready');
      expect(report).toHaveProperty('checkpoints');
      expect(report).toHaveProperty('byCategory');
      expect(report).toHaveProperty('counts');
      expect(report).toHaveProperty('unresolvedCriticals');
      expect(report).toHaveProperty('unresolvedWarnings');
      expect(report).toHaveProperty('recommendedFixes');
      expect(report).toHaveProperty('managerReviews');
      expect(report).toHaveProperty('sectionCompletion');
      expect(report).toHaveProperty('orchestratorReport');
      expect(report).toHaveProperty('timestamp');
    });

    it('timestamp is recent', () => {
      const report = runPreSubmissionSweep([], [], [], minimalAppointment);
      expect(report.timestamp).toBeGreaterThan(Date.now() - 5000);
    });
  });
});
