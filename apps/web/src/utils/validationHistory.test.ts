import { describe, it, expect } from 'vitest';
import {
  createHistory, recordValidationRun, recordFieldChange, recordOverride,
  recordConflict, getOpeningTimeline, getWarningTimeline, getActiveWarnings,
  getResolvedWarnings, getOverriddenWarnings, getManagerAuditTrail,
  getReappearances, formatAuditReport, type ValidationHistory,
} from './validationHistory';
import type { UnifiedWarning } from './centralValidationOrchestrator';
import type { RuleConflict } from './ruleConflictDetector';

function w(id: string, overrides: Partial<UnifiedWarning> = {}): UnifiedWarning {
  return {
    id, severity: 'warning', category: 'order', source: 'test',
    title: 'Test Warning', detail: 'Test detail', blocksSubmission: false, stage: 'quick_price' as any, ...overrides,
  };
}

describe('Validation History Tracker', () => {
  describe('Creation', () => {
    it('creates empty history', () => {
      const h = createHistory('appt-1');
      expect(h.appointmentId).toBe('appt-1');
      expect(Object.keys(h.warnings).length).toBe(0);
      expect(h.timeline.length).toBe(0);
    });
  });

  describe('Recording validation runs', () => {
    it('records new warnings as appeared', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1'), w('w2')], 'rep1');
      expect(Object.keys(h.warnings).length).toBe(2);
      expect(h.warnings['w1'].status).toBe('active');
      expect(h.warnings['w1'].appearanceCount).toBe(1);
      expect(h.timeline.length).toBe(2);
      expect(h.timeline[0].eventType).toBe('appeared');
    });

    it('records resolved warnings when they disappear', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1'), w('w2')], 'rep1');
      h = recordValidationRun(h, [w('w2')], 'rep1'); // w1 gone
      expect(h.warnings['w1'].status).toBe('resolved');
      expect(h.warnings['w1'].resolvedAt).toBeTruthy();
      expect(h.warnings['w1'].resolvedBy).toBe('rep1');
      expect(h.warnings['w2'].status).toBe('active');
    });

    it('tracks reappearances', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1')], 'rep1');     // appeared
      h = recordValidationRun(h, [], 'rep1');              // resolved
      h = recordValidationRun(h, [w('w1')], 'rep1');       // reappeared!
      expect(h.warnings['w1'].status).toBe('active');
      expect(h.warnings['w1'].appearanceCount).toBe(2);
      const reappearEvent = h.warnings['w1'].events.find(e => e.eventType === 'reappeared');
      expect(reappearEvent).toBeTruthy();
    });

    it('detects severity changes', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1', { severity: 'warning' })], 'rep1');
      h = recordValidationRun(h, [w('w1', { severity: 'critical' })], 'rep1');
      const escalated = h.warnings['w1'].events.find(e => e.eventType === 'escalated');
      expect(escalated).toBeTruthy();
      expect(escalated!.previousValue).toBe('warning');
      expect(escalated!.currentValue).toBe('critical');
    });

    it('detects demotion', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1', { severity: 'critical' })], 'rep1');
      h = recordValidationRun(h, [w('w1', { severity: 'info' })], 'rep1');
      const demoted = h.warnings['w1'].events.find(e => e.eventType === 'demoted');
      expect(demoted).toBeTruthy();
    });

    it('takes snapshots', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1', { severity: 'critical' }), w('w2')], 'rep1', 'manual');
      expect(h.snapshots.length).toBe(1);
      expect(h.snapshots[0].activeCount).toBe(2);
      expect(h.snapshots[0].criticalCount).toBe(1);
      expect(h.snapshots[0].trigger).toBe('manual');
    });
  });

  describe('Field change tracking', () => {
    it('records field value changes', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      h = recordFieldChange(h, 'w1', 'screenOption', 'Full Screen', 'No Screen', 'rep1');
      const fieldEvent = h.warnings['w1'].events.find(e => e.eventType === 'field_changed');
      expect(fieldEvent).toBeTruthy();
      expect(fieldEvent!.fieldPath).toBe('screenOption');
      expect(fieldEvent!.previousValue).toBe('Full Screen');
      expect(fieldEvent!.currentValue).toBe('No Screen');
    });

    it('ignores field changes for unknown warnings', () => {
      let h = createHistory('appt-1');
      const before = JSON.stringify(h);
      h = recordFieldChange(h, 'unknown', 'field', 'a', 'b', 'rep1');
      // Should return unchanged (no crash)
      expect(h.timeline.length).toBe(0);
    });
  });

  describe('Override tracking', () => {
    it('records rep override', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      h = recordOverride(h, 'w1', 'Customer confirmed', 'rep1', 'John Rep', 'rep');
      expect(h.warnings['w1'].status).toBe('overridden');
      expect(h.warnings['w1'].overriddenBy).toBe('John Rep');
      expect(h.warnings['w1'].overrideReason).toBe('Customer confirmed');
      const overrideEvent = h.warnings['w1'].events.find(e => e.eventType === 'overridden');
      expect(overrideEvent!.userName).toBe('John Rep');
    });

    it('records manager override with approval', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1', { severity: 'critical' })], 'rep1');
      h = recordOverride(h, 'w1', 'Verified on site', 'mgr1', 'Jane Mgr', 'manager', { managerId: 'mgr1', managerName: 'Jane Mgr' });
      const event = h.warnings['w1'].events.find(e => e.eventType === 'overridden');
      expect(event!.managerApproval).toBeTruthy();
      expect(event!.managerApproval!.managerName).toBe('Jane Mgr');
      expect(event!.notes).toContain('manager approval');
    });
  });

  describe('Conflict tracking', () => {
    it('records conflict detection', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('wA'), w('wB')], 'rep1');
      const conflict: RuleConflict = {
        id: 'c1', conflictType: 'grid_color', field: 'gridType', openingNumber: 1,
        description: 'Grid conflict', warningA: w('wA'), warningB: w('wB'),
        resolution: { strategy: 'safest_config', recommendation: 'Change grid', safestConfig: {}, autoFixable: true },
      };
      h = recordConflict(h, conflict, false, 'rep1');
      const conflictEvents = h.timeline.filter(e => e.eventType === 'conflict_detected');
      expect(conflictEvents.length).toBe(2); // one for each warning in conflict
      expect(conflictEvents[0].conflictId).toBe('c1');
    });

    it('records conflict resolution', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('wA'), w('wB')], 'rep1');
      const conflict: RuleConflict = {
        id: 'c1', conflictType: 'grid_color', field: 'gridType', openingNumber: 1,
        description: 'Grid conflict', warningA: w('wA'), warningB: w('wB'),
        resolution: { strategy: 'safest_config', recommendation: 'Fixed', safestConfig: {}, autoFixable: true },
      };
      h = recordConflict(h, conflict, true, 'rep1');
      const resolved = h.timeline.filter(e => e.eventType === 'conflict_resolved');
      expect(resolved.length).toBe(2);
    });
  });

  describe('Query helpers', () => {
    it('getOpeningTimeline returns events for a specific opening', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [
        w('w1', { openingNumber: 1 }),
        w('w2', { openingNumber: 2 }),
        w('w3', { openingNumber: 1 }),
      ], 'rep1');
      const timeline = getOpeningTimeline(h, 1);
      expect(timeline.length).toBe(2);
      expect(timeline.every(e => e.openingNumber === 1)).toBe(true);
    });

    it('getWarningTimeline returns events for a specific warning', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      h = recordOverride(h, 'w1', 'OK', 'rep1', 'Rep', 'rep');
      const timeline = getWarningTimeline(h, 'w1');
      expect(timeline.length).toBe(2); // appeared + overridden
      expect(timeline[0].eventType).toBe('appeared');
      expect(timeline[1].eventType).toBe('overridden');
    });

    it('getActiveWarnings returns only active', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1'), w('w2')], 'rep1');
      h = recordValidationRun(h, [w('w1')], 'rep1'); // w2 resolved
      expect(getActiveWarnings(h).length).toBe(1);
      expect(getActiveWarnings(h)[0].warningId).toBe('w1');
    });

    it('getResolvedWarnings returns only resolved', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1'), w('w2')], 'rep1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      expect(getResolvedWarnings(h).length).toBe(1);
      expect(getResolvedWarnings(h)[0].warningId).toBe('w2');
    });

    it('getOverriddenWarnings returns only overridden', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      h = recordOverride(h, 'w1', 'OK', 'rep1', 'Rep', 'rep');
      expect(getOverriddenWarnings(h).length).toBe(1);
    });

    it('getManagerAuditTrail returns override and escalation events', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1', { severity: 'warning' })], 'rep1');
      h = recordValidationRun(h, [w('w1', { severity: 'critical' })], 'rep1'); // escalated
      h = recordOverride(h, 'w1', 'Approved', 'mgr1', 'Jane', 'manager', { managerId: 'mgr1', managerName: 'Jane' });
      const trail = getManagerAuditTrail(h);
      expect(trail.length).toBe(2); // escalated + overridden
    });

    it('getReappearances flags repeated warnings', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      h = recordValidationRun(h, [], 'rep1');
      h = recordValidationRun(h, [w('w1')], 'rep1');
      const reappearances = getReappearances(h);
      expect(reappearances.length).toBe(1);
      expect(reappearances[0].appearanceCount).toBe(2);
    });
  });

  describe('Immutability', () => {
    it('does not mutate original history', () => {
      const h = createHistory('appt-1');
      const h2 = recordValidationRun(h, [w('w1')], 'rep1');
      expect(Object.keys(h.warnings).length).toBe(0);
      expect(Object.keys(h2.warnings).length).toBe(1);
    });
  });

  describe('Audit report', () => {
    it('formats a readable audit report', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1'), w('w2')], 'rep1');
      h = recordOverride(h, 'w1', 'Customer OK', 'rep1', 'John', 'rep');
      h = recordValidationRun(h, [w('w2')], 'rep1'); // w1 was overridden, w2 still active
      const report = formatAuditReport(h);
      expect(report.length).toBeGreaterThan(3);
      expect(report[0]).toContain('appt-1');
      expect(report.some(l => l.includes('OVERRIDES'))).toBe(true);
      expect(report.some(l => l.includes('Customer OK'))).toBe(true);
    });

    it('includes reappearance training flags', () => {
      let h = createHistory('appt-1');
      h = recordValidationRun(h, [w('w1', { title: 'Missing tempered' })], 'rep1');
      h = recordValidationRun(h, [], 'rep1');
      h = recordValidationRun(h, [w('w1', { title: 'Missing tempered' })], 'rep1');
      const report = formatAuditReport(h);
      expect(report.some(l => l.includes('REAPPEARANCES'))).toBe(true);
      expect(report.some(l => l.includes('2x'))).toBe(true);
    });
  });
});
