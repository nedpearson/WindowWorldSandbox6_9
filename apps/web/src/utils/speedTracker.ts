// ═══════════════════════════════════════════════════════════
// Speed Tracker — Measures time spent on each workflow step
// Provides data for optimizing appointment duration.
// Stores timing data in localStorage per appointment.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'wwa_speed_tracker';

export interface StepTiming {
  step: number;
  label: string;
  enterTime: number;    // timestamp when rep entered this step
  exitTime?: number;    // timestamp when rep left this step
  totalMs: number;      // cumulative milliseconds on this step
}

export interface AppointmentTiming {
  appointmentId: string;
  startTime: number;
  steps: StepTiming[];
  currentStep: number;
  lastActivity: number;
}

// ── Get or create timing record ──────────────────────────
export function getTimings(appointmentId: string): AppointmentTiming {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${appointmentId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.debug("[swallowed error]", e); }
  return {
    appointmentId,
    startTime: Date.now(),
    steps: [],
    currentStep: -1,
    lastActivity: Date.now(),
  };
}

function saveTiming(timing: AppointmentTiming) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${timing.appointmentId}`, JSON.stringify(timing));
  } catch (e) { console.debug("[swallowed error]", e); }
}

// ── Record step entry ────────────────────────────────────
export function trackStepEnter(appointmentId: string, step: number, label: string) {
  const timing = getTimings(appointmentId);

  // Close out previous step
  if (timing.currentStep >= 0) {
    const prev = timing.steps.find(s => s.step === timing.currentStep);
    if (prev && prev.enterTime && !prev.exitTime) {
      prev.exitTime = Date.now();
      prev.totalMs += (prev.exitTime - prev.enterTime);
    }
  }

  // Open new step
  let existing = timing.steps.find(s => s.step === step);
  if (!existing) {
    existing = { step, label, enterTime: Date.now(), totalMs: 0 };
    timing.steps.push(existing);
  } else {
    existing.enterTime = Date.now();
    existing.exitTime = undefined;
  }

  timing.currentStep = step;
  timing.lastActivity = Date.now();
  saveTiming(timing);
}

// ── Get total appointment duration ───────────────────────
export function getAppointmentDuration(appointmentId: string): number {
  const timing = getTimings(appointmentId);
  return Date.now() - timing.startTime;
}

// ── Get formatted step times ─────────────────────────────
export function getStepSummary(appointmentId: string): {
  steps: { label: string; totalMs: number; pct: number }[];
  totalMs: number;
  currentStepMs: number;
} {
  const timing = getTimings(appointmentId);
  const totalMs = Date.now() - timing.startTime;

  const steps = timing.steps.map(s => {
    let ms = s.totalMs;
    // Add live time if this is the current step
    if (s.step === timing.currentStep && s.enterTime && !s.exitTime) {
      ms += (Date.now() - s.enterTime);
    }
    return {
      label: s.label,
      totalMs: ms,
      pct: totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0,
    };
  }).sort((a, b) => {
    // Sort by step order (using label for ordering since step index is available)
    return 0; // keep insertion order
  });

  const currentStep = timing.steps.find(s => s.step === timing.currentStep);
  const currentStepMs = currentStep
    ? currentStep.totalMs + (currentStep.enterTime && !currentStep.exitTime ? Date.now() - currentStep.enterTime : 0)
    : 0;

  return { steps, totalMs, currentStepMs };
}

// ── Format milliseconds to human-readable ────────────────
export function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remainSecs}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

// ── Benchmark targets (based on ideal appointment flow) ──
export const STEP_TARGETS: Record<string, number> = {
  'Customer': 3 * 60 * 1000,       // 3 min — intro + verify info
  'Project': 2 * 60 * 1000,        // 2 min — project scope
  'Sketch': 5 * 60 * 1000,         // 5 min — walk the house
  'Openings': 15 * 60 * 1000,      // 15 min — measure all openings
  'Pricing': 3 * 60 * 1000,        // 3 min — pricing review
  'Proposal': 5 * 60 * 1000,       // 5 min — present to customer
  'Order Review': 3 * 60 * 1000,   // 3 min — review order form
  'Sign & Contract': 5 * 60 * 1000, // 5 min — signatures
  'Validation': 2 * 60 * 1000,     // 2 min — final check
  'Submit': 1 * 60 * 1000,         // 1 min — submit
};

export const TOTAL_TARGET = 44 * 60 * 1000; // 44 min ideal total
