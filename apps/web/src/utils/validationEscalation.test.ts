import { describe, it, expect } from 'vitest';
import {
  toEscalationLevel, getPolicy, createOverride, createAcknowledgement,
  isWarningResolved, checkSubmissionGates, createEscalationState,
  applyOverride, applyAcknowledgement, applyManagerApproval,
  formatOverrideAuditLog, type EscalationState,
} from './validationEscalation';

function makeState(apptId = 'test-1'): EscalationState {
  return createEscalationState(apptId);
}

describe('Validation Escalation Engine', () => {
  describe('Severity mapping', () => {
    it('maps unified severities to escalation levels', () => {
      expect(toEscalationLevel('critical')).toBe('critical');
      expect(toEscalationLevel('blocker')).toBe('critical');
      expect(toEscalationLevel('high')).toBe('high_risk');
      expect(toEscalationLevel('high_risk')).toBe('high_risk');
      expect(toEscalationLevel('warning')).toBe('warning');
      expect(toEscalationLevel('medium')).toBe('warning');
      expect(toEscalationLevel('info')).toBe('info');
      expect(toEscalationLevel('suggestion')).toBe('info');
    });
  });

  describe('Policy definitions', () => {
    it('info does not block anything', () => {
      const p = getPolicy('info');
      expect(p.blocksProposal).toBe(false);
      expect(p.blocksSubmission).toBe(false);
      expect(p.requiresAcknowledgement).toBe(false);
      expect(p.requiresManagerOverride).toBe(false);
    });

    it('warning requires acknowledgement but does not block', () => {
      const p = getPolicy('warning');
      expect(p.requiresAcknowledgement).toBe(true);
      expect(p.requiresConfirmation).toBe(false);
      expect(p.blocksProposal).toBe(false);
      expect(p.blocksSubmission).toBe(false);
      expect(p.overrideRequiresReason).toBe(true);
    });

    it('high_risk requires confirmation and blocks proposal', () => {
      const p = getPolicy('high_risk');
      expect(p.requiresConfirmation).toBe(true);
      expect(p.blocksProposal).toBe(true);
      expect(p.blocksSubmission).toBe(false);
      expect(p.requiresManagerOverride).toBe(false);
    });

    it('critical blocks everything and requires manager', () => {
      const p = getPolicy('critical');
      expect(p.blocksProposal).toBe(true);
      expect(p.blocksSubmission).toBe(true);
      expect(p.requiresManagerOverride).toBe(true);
      expect(p.overrideRequiresManager).toBe(true);
      expect(p.overrideRequiresReason).toBe(true);
    });
  });

  describe('Override creation', () => {
    it('rep can override warning-level', () => {
      const { override, error } = createOverride('w-1', 'warning', 'Test', 'Detail', 'rep1', 'rep', 'Customer confirmed');
      expect(error).toBeUndefined();
      expect(override.warningId).toBe('w-1');
      expect(override.overriddenBy).toBe('rep1');
      expect(override.reason).toBe('Customer confirmed');
      expect(override.overriddenAt).toBeTruthy();
    });

    it('rep cannot override critical-level', () => {
      const { error } = createOverride('w-2', 'critical', 'Test', 'Detail', 'rep1', 'rep', 'reason');
      expect(error).toContain('manager');
    });

    it('manager can override critical-level', () => {
      const { override, error } = createOverride('w-3', 'critical', 'Test', 'Detail', 'mgr1', 'manager', 'Approved after review');
      expect(error).toBeUndefined();
      expect(override.managerApproval).toBeTruthy();
      expect(override.managerApproval!.managerId).toBe('mgr1');
    });

    it('rejects override without reason when required', () => {
      const { error } = createOverride('w-4', 'warning', 'Test', 'Detail', 'rep1', 'rep', '');
      expect(error).toContain('reason');
    });

    it('info override does not require reason', () => {
      const { override, error } = createOverride('w-5', 'info', 'Test', 'Detail', 'rep1', 'rep', '');
      expect(error).toBeUndefined();
      expect(override.warningId).toBe('w-5');
    });
  });

  describe('Acknowledgement', () => {
    it('creates acknowledgement record', () => {
      const ack = createAcknowledgement('w-1', 'warning', 'rep1', false);
      expect(ack.warningId).toBe('w-1');
      expect(ack.acknowledgedBy).toBe('rep1');
      expect(ack.confirmed).toBe(false);
    });
  });

  describe('Resolution checks', () => {
    it('info is always resolved', () => {
      const state = makeState();
      expect(isWarningResolved('w-1', 'info', state)).toBe(true);
    });

    it('warning is resolved after acknowledgement', () => {
      let state = makeState();
      expect(isWarningResolved('w-1', 'warning', state)).toBe(false);
      const ack = createAcknowledgement('w-1', 'warning', 'rep1', false);
      state = applyAcknowledgement(state, ack);
      expect(isWarningResolved('w-1', 'warning', state)).toBe(true);
    });

    it('high_risk needs confirmation, not just acknowledgement', () => {
      let state = makeState();
      const ack = createAcknowledgement('w-1', 'high_risk', 'rep1', false);
      state = applyAcknowledgement(state, ack);
      expect(isWarningResolved('w-1', 'high_risk', state)).toBe(false);
      const confirmed = createAcknowledgement('w-1', 'high_risk', 'rep1', true);
      state = applyAcknowledgement(state, confirmed);
      expect(isWarningResolved('w-1', 'high_risk', state)).toBe(true);
    });

    it('critical needs manager override', () => {
      let state = makeState();
      // Rep override without manager = not resolved
      const { override } = createOverride('w-1', 'critical', 'T', 'D', 'mgr1', 'manager', 'Approved');
      state = applyOverride(state, override);
      expect(isWarningResolved('w-1', 'critical', state)).toBe(true);
    });

    it('critical with rep override but no manager = not resolved', () => {
      let state = makeState();
      // Manually create an override without manager approval
      state = applyOverride(state, {
        warningId: 'w-1', originalLevel: 'critical', originalTitle: 'T', originalDetail: 'D',
        overriddenBy: 'rep1', overriddenByRole: 'rep', overriddenAt: new Date().toISOString(),
        reason: 'Reason',
      });
      expect(isWarningResolved('w-1', 'critical', state)).toBe(false);
    });
  });

  describe('Submission gates', () => {
    it('all clear with no warnings', () => {
      const result = checkSubmissionGates([], makeState());
      expect(result.canGenerateProposal).toBe(true);
      expect(result.canSubmitOrder).toBe(true);
    });

    it('info warnings do not block', () => {
      const warnings = [{ id: 'w-1', severity: 'info', title: 'Tip', detail: '' }];
      const result = checkSubmissionGates(warnings, makeState());
      expect(result.canGenerateProposal).toBe(true);
      expect(result.canSubmitOrder).toBe(true);
    });

    it('unresolved high_risk blocks proposal but not submission', () => {
      const warnings = [{ id: 'w-1', severity: 'high', title: 'Risk', detail: '' }];
      const result = checkSubmissionGates(warnings, makeState());
      expect(result.canGenerateProposal).toBe(false);
      expect(result.canSubmitOrder).toBe(true);
      expect(result.proposalBlockers.length).toBe(1);
    });

    it('unresolved critical blocks both proposal and submission', () => {
      const warnings = [{ id: 'w-1', severity: 'critical', title: 'Blocker', detail: '' }];
      const result = checkSubmissionGates(warnings, makeState());
      expect(result.canGenerateProposal).toBe(false);
      expect(result.canSubmitOrder).toBe(false);
      expect(result.submissionBlockers.length).toBe(1);
    });

    it('resolved critical does not block', () => {
      const warnings = [{ id: 'w-1', severity: 'critical', title: 'Blocker', detail: '' }];
      let state = makeState();
      const { override } = createOverride('w-1', 'critical', 'Blocker', '', 'mgr1', 'manager', 'Approved');
      state = applyOverride(state, override);
      const result = checkSubmissionGates(warnings, state);
      expect(result.canGenerateProposal).toBe(true);
      expect(result.canSubmitOrder).toBe(true);
    });

    it('tracks unresolved counts by level', () => {
      const warnings = [
        { id: 'w-1', severity: 'info', title: 'A', detail: '' },
        { id: 'w-2', severity: 'warning', title: 'B', detail: '' },
        { id: 'w-3', severity: 'high', title: 'C', detail: '' },
        { id: 'w-4', severity: 'critical', title: 'D', detail: '' },
      ];
      const result = checkSubmissionGates(warnings, makeState());
      expect(result.unresolvedCount.info).toBe(0); // info auto-resolved
      expect(result.unresolvedCount.warning).toBe(1);
      expect(result.unresolvedCount.high_risk).toBe(1);
      expect(result.unresolvedCount.critical).toBe(1);
    });
  });

  describe('State management', () => {
    it('applies override immutably', () => {
      const state = makeState();
      const { override } = createOverride('w-1', 'warning', 'T', 'D', 'rep1', 'rep', 'OK');
      const newState = applyOverride(state, override);
      expect(newState.overrides['w-1']).toBeTruthy();
      expect(state.overrides['w-1']).toBeUndefined(); // original unchanged
    });

    it('applies manager approval to existing override', () => {
      let state = makeState();
      state = applyOverride(state, {
        warningId: 'w-1', originalLevel: 'critical', originalTitle: 'T', originalDetail: 'D',
        overriddenBy: 'rep1', overriddenByRole: 'rep', overriddenAt: new Date().toISOString(),
        reason: 'Need approval',
      });
      expect(state.overrides['w-1'].managerApproval).toBeUndefined();
      state = applyManagerApproval(state, 'w-1', 'mgr1', 'Jane Manager');
      expect(state.overrides['w-1'].managerApproval).toBeTruthy();
      expect(state.overrides['w-1'].managerApproval!.managerName).toBe('Jane Manager');
    });
  });

  describe('Audit log', () => {
    it('formats override log entries', () => {
      const { override } = createOverride('w-1', 'warning', 'Mixed grids', 'Kitchen has mixed grids', 'rep1', 'rep', 'Customer wants it');
      const log = formatOverrideAuditLog({ 'w-1': override });
      expect(log.length).toBe(1);
      expect(log[0]).toContain('WARNING');
      expect(log[0]).toContain('Mixed grids');
      expect(log[0]).toContain('Customer wants it');
      expect(log[0]).toContain('rep1');
    });

    it('includes manager info when present', () => {
      const { override } = createOverride('w-2', 'critical', 'Missing tempered', 'Detail', 'mgr1', 'manager', 'Verified on site');
      const log = formatOverrideAuditLog({ 'w-2': override });
      expect(log[0]).toContain('Manager');
      expect(log[0]).toContain('mgr1');
    });
  });
});
