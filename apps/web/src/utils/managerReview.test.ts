// ═══════════════════════════════════════════════════════════════
// Manager Review Engine — Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createReviewRequest,
  approveReview,
  rejectReview,
  expireStaleReviews,
  getReviewsForAppointment,
  getPendingReviews,
  getApprovedReviews,
  isWarningEscalated,
  isWarningApproved,
  getAuditLog,
  getReviewAuditLog,
  getReviewSummary,
  getUnresolvedBlockers,
  inferEscalationReason,
} from './managerReview';
import type { UnifiedWarning } from './centralValidationOrchestrator';

// ── Mock localStorage ─────────────────────────────────────
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
});

// ── Test Data ──────────────────────────────────────────────
const mockWarning: UnifiedWarning = {
  id: 'w_test_1',
  severity: 'critical',
  category: 'specialty',
  source: 'businessRules',
  openingNumber: 3,
  title: '3000 Series DH exceeds 50" maximum',
  detail: 'Oriel opening at 54" exceeds the 50" limit for 3000 Series.',
  blocksSubmission: true, stage: 'quick_price' as any,
};

const mockWarningHigh: UnifiedWarning = {
  id: 'w_test_2',
  severity: 'high',
  category: 'geometry',
  source: 'openingValidation',
  openingNumber: 5,
  title: 'Aspect ratio exceeds 3:1',
  detail: 'Opening #5 width/height ratio is 3.2:1, exceeding safe limits.',
  blocksSubmission: true, stage: 'quick_price' as any,
};

const mockWarningInfo: UnifiedWarning = {
  id: 'w_test_3',
  severity: 'info',
  category: 'pricing',
  source: 'pricingValidation',
  title: 'Price verification recommended',
  detail: 'Unit price is outside typical range.',
  blocksSubmission: false, stage: 'quick_price' as any,
};

const rep = { id: 'rep1', name: 'John Rep', email: 'john@windowworldassistant.com' };
const manager = { id: 'mgr1', name: 'Jane Manager', email: 'jane@windowworldassistant.com' };

// ═════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════

describe('Manager Review Engine', () => {

  describe('Create Review Request', () => {
    it('creates a review with correct fields', () => {
      const req = createReviewRequest('appt_1', mockWarning, 'oversized_specialty', 'Customer insists on this size', rep);
      expect(req.id).toMatch(/^mr_/);
      expect(req.appointmentId).toBe('appt_1');
      expect(req.warningId).toBe('w_test_1');
      expect(req.escalationReason).toBe('oversized_specialty');
      expect(req.repNotes).toBe('Customer insists on this size');
      expect(req.status).toBe('pending');
      expect(req.requestedBy.name).toBe('John Rep');
      expect(req.warningSnapshot.title).toBe('3000 Series DH exceeds 50" maximum');
    });

    it('sets a 24h expiry', () => {
      const req = createReviewRequest('appt_1', mockWarning, 'oversized_specialty', 'notes', rep);
      const expiry = new Date(req.expiresAt).getTime();
      const created = new Date(req.requestedAt).getTime();
      const diff = expiry - created;
      expect(diff).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
    });

    it('creates audit log entry', () => {
      const req = createReviewRequest('appt_1', mockWarning, 'oversized_specialty', 'notes', rep);
      const log = getReviewAuditLog(req.id);
      expect(log.length).toBe(1);
      expect(log[0].event).toBe('created');
      expect(log[0].actor.name).toBe('John Rep');
    });
  });

  describe('Approve Review', () => {
    it('approves a pending review', () => {
      const req = createReviewRequest('appt_2', mockWarning, 'oversized_specialty', 'notes', rep);
      const result = approveReview(req.id, manager, 'Approved with reinforcement', { mullType: 'structural' }, 'Must use header');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('approved');
      expect(result!.resolution?.decision).toBe('approved');
      expect(result!.resolution?.reviewer.name).toBe('Jane Manager');
      expect(result!.resolution?.notes).toBe('Approved with reinforcement');
      expect(result!.resolution?.conditions).toBe('Must use header');
    });

    it('creates audit log for approval', () => {
      const req = createReviewRequest('appt_2a', mockWarning, 'oversized_specialty', 'notes', rep);
      approveReview(req.id, manager, 'OK');
      const log = getReviewAuditLog(req.id);
      expect(log.length).toBe(2);
      expect(log[1].event).toBe('approved');
    });

    it('returns null for non-pending review', () => {
      const req = createReviewRequest('appt_3', mockWarning, 'oversized_specialty', 'notes', rep);
      approveReview(req.id, manager, 'OK');
      const secondApproval = approveReview(req.id, manager, 'OK again');
      expect(secondApproval).toBeNull();
    });
  });

  describe('Reject Review', () => {
    it('rejects a pending review', () => {
      const req = createReviewRequest('appt_4', mockWarning, 'oversized_specialty', 'notes', rep);
      const result = rejectReview(req.id, manager, 'Must use single-hung instead', 'Exceeds structural limits');
      expect(result!.status).toBe('rejected');
      expect(result!.resolution?.decision).toBe('rejected');
      expect(result!.resolution?.rejectionReason).toBe('Exceeds structural limits');
    });
  });

  describe('Expiry', () => {
    it('expires stale reviews', () => {
      const req = createReviewRequest('appt_5', mockWarning, 'oversized_specialty', 'notes', rep);
      // Manually set expiry to the past
      const state = JSON.parse(store['wwa_manager_reviews']);
      state.reviews[0].expiresAt = new Date(Date.now() - 1000).toISOString();
      store['wwa_manager_reviews'] = JSON.stringify(state);

      const count = expireStaleReviews();
      expect(count).toBe(1);
      expect(getPendingReviews('appt_5').length).toBe(0);
    });
  });

  describe('Query Helpers', () => {
    it('getReviewsForAppointment returns only matching', () => {
      createReviewRequest('appt_A', mockWarning, 'oversized_specialty', 'notes', rep);
      createReviewRequest('appt_B', mockWarningHigh, 'high_risk_geometry', 'notes', rep);
      createReviewRequest('appt_A', mockWarningHigh, 'high_risk_geometry', 'notes', rep);
      expect(getReviewsForAppointment('appt_A').length).toBe(2);
      expect(getReviewsForAppointment('appt_B').length).toBe(1);
    });

    it('isWarningEscalated detects existing escalation', () => {
      createReviewRequest('appt_C', mockWarning, 'oversized_specialty', 'notes', rep);
      expect(isWarningEscalated('appt_C', 'w_test_1')).toBeDefined();
      expect(isWarningEscalated('appt_C', 'w_nonexistent')).toBeUndefined();
    });

    it('isWarningApproved returns true after approval', () => {
      const req = createReviewRequest('appt_D', mockWarning, 'oversized_specialty', 'notes', rep);
      expect(isWarningApproved('appt_D', 'w_test_1')).toBe(false);
      approveReview(req.id, manager, 'OK');
      expect(isWarningApproved('appt_D', 'w_test_1')).toBe(true);
    });

    it('getReviewSummary counts correctly', () => {
      const r1 = createReviewRequest('appt_E', mockWarning, 'oversized_specialty', 'notes', rep);
      createReviewRequest('appt_E', mockWarningHigh, 'high_risk_geometry', 'notes', rep);
      approveReview(r1.id, manager, 'OK');
      const summary = getReviewSummary('appt_E');
      expect(summary.total).toBe(2);
      expect(summary.approved).toBe(1);
      expect(summary.pending).toBe(1);
    });
  });

  describe('Unresolved Blockers', () => {
    it('filters out approved blockers', () => {
      const req = createReviewRequest('appt_F', mockWarning, 'oversized_specialty', 'notes', rep);
      approveReview(req.id, manager, 'OK');
      const blockers = getUnresolvedBlockers('appt_F', [mockWarning, mockWarningHigh]);
      // mockWarning is approved, mockWarningHigh is still blocking
      expect(blockers.length).toBe(1);
      expect(blockers[0].id).toBe('w_test_2');
    });

    it('does not filter non-blocking warnings', () => {
      const blockers = getUnresolvedBlockers('appt_G', [mockWarningInfo]);
      expect(blockers.length).toBe(0);
    });
  });

  describe('Audit Log', () => {
    it('returns full audit trail for appointment', () => {
      const r1 = createReviewRequest('appt_H', mockWarning, 'oversized_specialty', 'notes', rep);
      approveReview(r1.id, manager, 'OK');
      createReviewRequest('appt_H', mockWarningHigh, 'high_risk_geometry', 'notes', rep);
      const log = getAuditLog('appt_H');
      expect(log.length).toBe(3); // create + approve + create
    });
  });

  describe('Infer Escalation Reason', () => {
    it('detects oversized from title', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Opening exceeds maximum size' } as any)).toBe('oversized_specialty');
    });

    it('detects mull from title', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Unsupported mull configuration', detail: '' } as any)).toBe('unsupported_mull');
    });

    it('detects geometry from title', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Aspect ratio too wide', detail: '' } as any)).toBe('high_risk_geometry');
    });

    it('detects pricing override', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Manual price override applied', detail: '' } as any)).toBe('pricing_override');
    });

    it('detects discount', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Custom discount applied', detail: '' } as any)).toBe('manual_discount');
    });

    it('detects conflict', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Rules conflict detected', detail: '' } as any)).toBe('conflicting_rules');
    });

    it('detects tempered', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Tempered glass override', detail: '' } as any)).toBe('tempered_override');
    });

    it('detects measurement', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Measurement out of tolerance', detail: '' } as any)).toBe('measurement_exception');
    });

    it('falls back to custom', () => {
      expect(inferEscalationReason({ ...mockWarning, title: 'Unknown issue', detail: '' } as any)).toBe('custom');
    });
  });
});
