// ═══════════════════════════════════════════════════════════
// Session Tracker — Interruption-safe position memory
// Remembers where the rep was working so they can resume
// instantly after any interruption.
// ═══════════════════════════════════════════════════════════

const SESSION_KEY = 'wwa_session';

export interface SessionState {
  appointmentId: string;
  customerName: string;
  jobAddress: string;
  step: number;
  stepLabel: string;
  editingOpeningNumber: number | null;
  openingCount: number;
  totalAmount: number;
  timestamp: number;
  incompleteOpenings: number[];
}

// ── Save current position ────────────────────────────────
export function trackPosition(state: SessionState) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (e) { console.debug("[swallowed error]", e); }
}

// ── Get last saved position ──────────────────────────────
export function getLastPosition(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as SessionState;
    // Expire after 24 hours
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      clearPosition();
      return null;
    }
    return state;
  } catch { return null; }
}

// ── Clear position (on project completion) ───────────────
export function clearPosition() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Time-ago formatter ───────────────────────────────────
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Find incomplete openings in an appointment ───────────
export function findIncompleteOpenings(openings: any[]): number[] {
  return openings
    .filter(o => {
      const missing = [
        !o.roomLocation,
        !o.width || o.width === 0,
        !o.height || o.height === 0,
        !o.productCategory,
      ].filter(Boolean).length;
      return missing > 0;
    })
    .map(o => o.openingNumber);
}

// ── Determine the best step to resume on ─────────────────
export function suggestResumeStep(appointment: any): number {
  const openings = appointment.openings || [];
  
  // No openings yet → go to Sketch (step 2) or Project (step 1)
  if (openings.length === 0) {
    return appointment.jobAddress ? 2 : 1;
  }

  // All openings incomplete → go to Openings (step 3)
  const incomplete = findIncompleteOpenings(openings);
  if (incomplete.length > 0) return 3;

  // All openings complete but no prices → go to Pricing (step 4)
  const unpriced = openings.filter((o: any) => !o.totalPrice || o.totalPrice === 0);
  if (unpriced.length > 0) return 4;

  // Has pricing, needs proposal → step 5
  if (!appointment.proposalSent) return 5;

  // Has proposal, needs signature → step 7
  return 7;
}
