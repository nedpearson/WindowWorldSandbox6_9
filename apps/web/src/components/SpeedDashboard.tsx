// ═══════════════════════════════════════════════════════════
// Speed Dashboard — Compact timing display + smart
// auto-advancing "Next Step" CTA to minimize idle time
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from 'react';
import {
  getStepSummary, formatDuration, getAppointmentDuration,
  STEP_TARGETS, TOTAL_TARGET,
} from '../utils/speedTracker';

// ── Appointment Timer — live clock in header ─────────────
export function AppointmentTimer({ appointmentId }: { appointmentId: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000); // Update every 10s
    return () => clearInterval(id);
  }, []);

  const elapsed = getAppointmentDuration(appointmentId);
  const pct = Math.min(100, Math.round((elapsed / TOTAL_TARGET) * 100));
  const color = pct <= 60 ? '#22c55e' : pct <= 85 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: 9999,
      background: `${color}10`, border: `1px solid ${color}25`,
    }}>
      <span style={{ fontSize: '0.625rem', fontWeight: 700, color, fontFamily: 'monospace' }}>
        ⏱ {formatDuration(elapsed)}
      </span>
      {/* Tiny progress bar */}
      <div style={{ width: 30, height: 3, borderRadius: 2, background: `${color}20` }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// ── Smart Next Step CTA ──────────────────────────────────
// Context-aware button that tells the rep exactly what to do next
export function SmartNextStep({
  step, stepLabel, appointment, onGoToStep,
}: {
  step: number;
  stepLabel: string;
  appointment: any;
  onGoToStep: (step: number) => void;
}) {
  const openings = appointment.openings || [];
  const measured = openings.filter((o: any) => o.width > 0 && o.height > 0).length;
  const priced = openings.filter((o: any) => o.totalPrice > 0).length;
  const total = openings.length;

  // Determine the smart CTA based on current state
  const cta = useMemo(() => {
    // Step 0: Customer
    if (step === 0) {
      return { label: 'Start Sketching →', nextStep: 1, icon: '✏️', ready: true };
    }

    // Step 1: Sketch
    if (step === 1) {
      return { label: 'Review & Price →', nextStep: 2, icon: '🔍', ready: true };
    }

    // Step 2: Review
    if (step === 2) {
      if (total === 0) {
        return { label: 'Add first opening', nextStep: 2, icon: '➕', ready: false };
      }
      if (measured < total) {
        return { label: `Measure ${total - measured} more →`, nextStep: 2, icon: '📐', ready: false };
      }
      return { label: 'Go to Excel Workbook →', nextStep: 3, icon: '📊', ready: true };
    }

    // Step 3: Workbook
    if (step === 3) {
      return { label: 'Excel Workbook Panel Active', nextStep: 3, icon: '📊', ready: false };
    }

    return { label: 'Complete', nextStep: step, icon: '✅', ready: false };
  }, [step, total, measured, priced]);

  if (step >= 4) return null; // Final step, no CTA

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', padding: '6px 0',
    }}>
      <button onClick={() => cta.ready && onGoToStep(cta.nextStep)} style={{
        padding: '8px 24px', borderRadius: 10, border: 'none', cursor: cta.ready ? 'pointer' : 'default',
        background: cta.ready
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : 'rgba(255,255,255,0.04)',
        color: cta.ready ? '#fff' : 'var(--text-muted)',
        fontSize: '0.875rem', fontWeight: 800,
        boxShadow: cta.ready ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '6px',
        opacity: cta.ready ? 1 : 0.7,
      }}>
        <span>{cta.icon}</span>
        <span>{cta.label}</span>
      </button>
    </div>
  );
}

// ── Speed Summary Bar (compact, for header area) ─────────
export function SpeedSummaryBar({ appointmentId }: { appointmentId: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const summary = getStepSummary(appointmentId);
  if (summary.steps.length === 0) return null;

  // Only show the top 3 time-consuming steps
  const sorted = [...summary.steps].sort((a, b) => b.totalMs - a.totalMs).slice(0, 3);

  return (
    <div style={{
      display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap',
    }}>
      {sorted.map(s => {
        const target = STEP_TARGETS[s.label] || 5 * 60 * 1000;
        const overTime = s.totalMs > target;
        return (
          <span key={s.label} style={{
            fontSize: '0.5rem', fontWeight: 600, padding: '1px 5px', borderRadius: 4,
            background: overTime ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.05)',
            color: overTime ? '#ef4444' : 'var(--text-muted)',
          }}>
            {s.label}: {formatDuration(s.totalMs)}
          </span>
        );
      })}
    </div>
  );
}
