// ═══════════════════════════════════════════════════════════════
// Validation Escalation Engine
// Defines severity-based escalation behavior, override tracking,
// and submission gate logic for the validation pipeline.
// ═══════════════════════════════════════════════════════════════

// ── Escalation Levels ───────────────────────────────────────
export type EscalationLevel = 'info' | 'warning' | 'high_risk' | 'critical';

export interface EscalationPolicy {
  level: EscalationLevel;
  label: string;
  icon: string;
  color: string;
  bg: string;
  requiresAcknowledgement: boolean;
  requiresConfirmation: boolean;
  requiresManagerOverride: boolean;
  blocksProposal: boolean;
  blocksSubmission: boolean;
  canOverride: boolean;
  overrideRequiresReason: boolean;
  overrideRequiresManager: boolean;
  autoEscalateAfterMinutes?: number;
  description: string;
}

export const ESCALATION_POLICIES: Record<EscalationLevel, EscalationPolicy> = {
  info: {
    level: 'info',
    label: 'Info',
    icon: 'ℹ️',
    color: '#58a6ff',
    bg: 'rgba(88,166,255,0.08)',
    requiresAcknowledgement: false,
    requiresConfirmation: false,
    requiresManagerOverride: false,
    blocksProposal: false,
    blocksSubmission: false,
    canOverride: true,
    overrideRequiresReason: false,
    overrideRequiresManager: false,
    description: 'Recommendation only. No action required. Informational guidance for the rep.',
  },
  warning: {
    level: 'warning',
    label: 'Warning',
    icon: '⚠️',
    color: '#d29922',
    bg: 'rgba(210,153,34,0.08)',
    requiresAcknowledgement: true,
    requiresConfirmation: false,
    requiresManagerOverride: false,
    blocksProposal: false,
    blocksSubmission: false,
    canOverride: true,
    overrideRequiresReason: true,
    overrideRequiresManager: false,
    description: 'Review recommended. Rep should verify this is intentional before proceeding.',
  },
  high_risk: {
    level: 'high_risk',
    label: 'High Risk',
    icon: '🔴',
    color: '#f0883e',
    bg: 'rgba(240,136,62,0.08)',
    requiresAcknowledgement: true,
    requiresConfirmation: true,
    requiresManagerOverride: false,
    blocksProposal: true,
    blocksSubmission: false,
    canOverride: true,
    overrideRequiresReason: true,
    overrideRequiresManager: false,
    autoEscalateAfterMinutes: 30,
    description: 'Requires rep confirmation. Blocks proposal generation until resolved or confirmed.',
  },
  critical: {
    level: 'critical',
    label: 'Critical',
    icon: '🛑',
    color: '#f85149',
    bg: 'rgba(248,81,73,0.08)',
    requiresAcknowledgement: true,
    requiresConfirmation: true,
    requiresManagerOverride: true,
    blocksProposal: true,
    blocksSubmission: true,
    canOverride: true,
    overrideRequiresReason: true,
    overrideRequiresManager: true,
    autoEscalateAfterMinutes: 15,
    description: 'Blocks proposal finalization and order submission. Requires manager override to proceed.',
  },
};

// ── Override Record ─────────────────────────────────────────
export interface OverrideRecord {
  warningId: string;
  originalLevel: EscalationLevel;
  originalTitle: string;
  originalDetail: string;
  overriddenBy: string;        // user ID or name
  overriddenByRole: 'rep' | 'manager' | 'admin';
  overriddenAt: string;        // ISO timestamp
  reason: string;
  managerApproval?: {
    managerId: string;
    managerName: string;
    approvedAt: string;
  };
  appointmentId?: string;
  openingNumber?: number;
  metadata?: Record<string, any>;
}

// ── Acknowledgement Record ──────────────────────────────────
export interface AcknowledgementRecord {
  warningId: string;
  level: EscalationLevel;
  acknowledgedBy: string;
  acknowledgedAt: string;
  confirmed: boolean;
}

// ── Escalation State (per project/appointment) ──────────────
export interface EscalationState {
  appointmentId: string;
  overrides: Record<string, OverrideRecord>;
  acknowledgements: Record<string, AcknowledgementRecord>;
  lastUpdated: string;
}

// ── Map unified severity → escalation level ─────────────────
export function toEscalationLevel(severity: string): EscalationLevel {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'blocker') return 'critical';
  if (s === 'high' || s === 'high_risk') return 'high_risk';
  if (s === 'warning' || s === 'medium') return 'warning';
  return 'info';
}

export function getPolicy(level: EscalationLevel): EscalationPolicy {
  return ESCALATION_POLICIES[level];
}

// ── Check if a warning is resolved ──────────────────────────
export function isWarningResolved(
  warningId: string,
  level: EscalationLevel,
  state: EscalationState,
): boolean {
  const override = state.overrides[warningId];
  if (override) {
    const policy = getPolicy(level);
    if (policy.overrideRequiresManager && !override.managerApproval) {
      return false; // needs manager but doesn't have it
    }
    if (policy.overrideRequiresReason && !override.reason.trim()) {
      return false; // needs reason but doesn't have it
    }
    return true;
  }

  const ack = state.acknowledgements[warningId];
  if (ack) {
    const policy = getPolicy(level);
    if (policy.requiresConfirmation && !ack.confirmed) {
      return false; // needs confirmation, only acknowledged
    }
    if (!policy.requiresConfirmation && policy.requiresAcknowledgement) {
      return true; // just needed acknowledgement
    }
    return ack.confirmed;
  }

  // Info level doesn't need any action
  return level === 'info';
}

// ── Create override record ──────────────────────────────────
export function createOverride(
  warningId: string,
  level: EscalationLevel,
  title: string,
  detail: string,
  userId: string,
  userRole: 'rep' | 'manager' | 'admin',
  reason: string,
  openingNumber?: number,
  appointmentId?: string,
): { override: OverrideRecord; error?: string } {
  const policy = getPolicy(level);

  if (!policy.canOverride) {
    return { override: null as any, error: `${policy.label} warnings cannot be overridden.` };
  }

  if (policy.overrideRequiresReason && !reason.trim()) {
    return { override: null as any, error: 'Override reason is required.' };
  }

  if (policy.overrideRequiresManager && userRole === 'rep') {
    return {
      override: null as any,
      error: `${policy.label} warnings require manager override. Rep cannot override this warning.`,
    };
  }

  const override: OverrideRecord = {
    warningId,
    originalLevel: level,
    originalTitle: title,
    originalDetail: detail,
    overriddenBy: userId,
    overriddenByRole: userRole,
    overriddenAt: new Date().toISOString(),
    reason,
    openingNumber,
    appointmentId,
    managerApproval: userRole === 'manager' || userRole === 'admin'
      ? { managerId: userId, managerName: userId, approvedAt: new Date().toISOString() }
      : undefined,
  };

  return { override };
}

// ── Create acknowledgement ──────────────────────────────────
export function createAcknowledgement(
  warningId: string,
  level: EscalationLevel,
  userId: string,
  confirmed: boolean,
): AcknowledgementRecord {
  return {
    warningId,
    level,
    acknowledgedBy: userId,
    acknowledgedAt: new Date().toISOString(),
    confirmed,
  };
}

// ── Submission gate check ───────────────────────────────────
export interface SubmissionGateResult {
  canGenerateProposal: boolean;
  canSubmitOrder: boolean;
  proposalBlockers: GateBlocker[];
  submissionBlockers: GateBlocker[];
  unresolvedCount: { info: number; warning: number; high_risk: number; critical: number };
  pendingManagerOverrides: string[];
}

export interface GateBlocker {
  warningId: string;
  level: EscalationLevel;
  title: string;
  reason: string;
  resolution: 'fix' | 'override' | 'manager_override' | 'acknowledge' | 'confirm';
}

export function checkSubmissionGates(
  warnings: Array<{ id: string; severity: string; title: string; detail: string; openingNumber?: number }>,
  state: EscalationState,
): SubmissionGateResult {
  const proposalBlockers: GateBlocker[] = [];
  const submissionBlockers: GateBlocker[] = [];
  const pendingManagerOverrides: string[] = [];
  const unresolvedCount = { info: 0, warning: 0, high_risk: 0, critical: 0 };

  for (const w of warnings) {
    const level = toEscalationLevel(w.severity);
    const policy = getPolicy(level);
    const resolved = isWarningResolved(w.id, level, state);

    if (!resolved) {
      unresolvedCount[level]++;

      if (policy.blocksProposal) {
        const resolution = policy.requiresManagerOverride ? 'manager_override'
          : policy.requiresConfirmation ? 'confirm'
          : policy.requiresAcknowledgement ? 'acknowledge'
          : 'fix';
        proposalBlockers.push({ warningId: w.id, level, title: w.title, reason: policy.description, resolution });
      }

      if (policy.blocksSubmission) {
        submissionBlockers.push({
          warningId: w.id, level, title: w.title,
          reason: `${policy.label}: ${w.title} — ${policy.description}`,
          resolution: 'manager_override',
        });
      }

      if (policy.overrideRequiresManager) {
        const override = state.overrides[w.id];
        if (override && !override.managerApproval) {
          pendingManagerOverrides.push(w.id);
        }
      }
    }
  }

  return {
    canGenerateProposal: proposalBlockers.length === 0,
    canSubmitOrder: submissionBlockers.length === 0,
    proposalBlockers,
    submissionBlockers,
    unresolvedCount,
    pendingManagerOverrides,
  };
}

// ── Escalation state factory ────────────────────────────────
export function createEscalationState(appointmentId: string): EscalationState {
  return {
    appointmentId,
    overrides: {},
    acknowledgements: {},
    lastUpdated: new Date().toISOString(),
  };
}

// ── Apply override to state ─────────────────────────────────
export function applyOverride(state: EscalationState, override: OverrideRecord): EscalationState {
  return {
    ...state,
    overrides: { ...state.overrides, [override.warningId]: override },
    lastUpdated: new Date().toISOString(),
  };
}

// ── Apply acknowledgement to state ──────────────────────────
export function applyAcknowledgement(state: EscalationState, ack: AcknowledgementRecord): EscalationState {
  return {
    ...state,
    acknowledgements: { ...state.acknowledgements, [ack.warningId]: ack },
    lastUpdated: new Date().toISOString(),
  };
}

// ── Apply manager approval to pending override ──────────────
export function applyManagerApproval(
  state: EscalationState,
  warningId: string,
  managerId: string,
  managerName: string,
): EscalationState {
  const override = state.overrides[warningId];
  if (!override) return state;

  return {
    ...state,
    overrides: {
      ...state.overrides,
      [warningId]: {
        ...override,
        managerApproval: { managerId, managerName, approvedAt: new Date().toISOString() },
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ── Persistence helpers (localStorage) ──────────────────────
const STORAGE_PREFIX = 'ww_escalation_';

export function saveEscalationState(state: EscalationState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${state.appointmentId}`, JSON.stringify(state));
  } catch { /* quota exceeded — silent */ }
}

export function loadEscalationState(appointmentId: string): EscalationState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${appointmentId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Audit log formatter ─────────────────────────────────────
export function formatOverrideAuditLog(overrides: Record<string, OverrideRecord>): string[] {
  return Object.values(overrides).map(o => {
    const mgr = o.managerApproval
      ? ` | Manager: ${o.managerApproval.managerName} at ${new Date(o.managerApproval.approvedAt).toLocaleString()}`
      : '';
    return `[${new Date(o.overriddenAt).toLocaleString()}] ${o.originalLevel.toUpperCase()} "${o.originalTitle}" — `
      + `Overridden by ${o.overriddenBy} (${o.overriddenByRole}). `
      + `Reason: "${o.reason}"${mgr}`;
  });
}
