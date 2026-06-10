// ═══════════════════════════════════════════════════════════
// Step Completeness Sidebar — Shows completion % per step
// ═══════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { runFullValidation } from '../utils/centralValidationOrchestrator';

const STEP_SECTIONS: Record<number, string[]> = {
  0: ['Header'],         // Customer
  1: ['Header'],         // Project
  2: ['Sketch'],         // Sketch
  3: ['Openings'],       // Openings
  4: ['Pricing'],        // Pricing
  5: [],                 // Proposal
  6: ['Customer', 'Job Scope', 'Product Counts', 'Pricing', 'Acknowledgments'], // Order Review
  7: ['Signatures'],     // Sign & Contract
};

export function StepCompletionBadge({
  stepIndex,
  appointment,
}: {
  stepIndex: number;
  appointment: any;
}) {
  const result = useMemo(
    () => runFullValidation(appointment.openings || [], [], [], appointment),
    [appointment]
  );

  // Calculate step-specific completeness
  const sectionNames = STEP_SECTIONS[stepIndex] || [];
  let total = 0;
  let filled = 0;
  for (const name of sectionNames) {
    const s = result.sections[name];
    if (s) {
      total += s.total;
      filled += s.filled;
    }
  }

  // For openings step, use opening data
  if (stepIndex === 3) {
    if (result.projectHealth) {
       return (
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.25rem' }}>
           <span className="step-badge" style={{ background: '#3b82f6', color: 'white', padding: '1px 4px', borderRadius: 4, fontSize: '0.625rem' }}>
             {result.projectHealth.avgScore}%
           </span>
         </div>
       );
    }
  }

  const pct = total > 0 ? Math.round((filled / total) * 100) : (stepIndex <= 1 ? 100 : 0);

  if (total === 0 && stepIndex > 4) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.25rem' }}>
      {/* Completion percentage */}
      <span style={{
        fontSize: '0.625rem', fontWeight: 700,
        color: pct === 100 ? '#22c55e' : pct > 60 ? '#f59e0b' : '#ef4444',
      }}>
        {pct}%
      </span>
    </div>
  );
}

/** Simple overall readiness badge for dashboard */
export function ReadinessBadge({ appointment }: { appointment: any }) {
  const result = useMemo(() => runFullValidation(appointment.openings || [], [], [], appointment), [appointment]);

  let readyState = 'incomplete';
  if (result.submissionBlocked) {
    readyState = 'missing_info';
  } else if (result.counts.total > 0) {
    readyState = 'review';
  } else {
    readyState = 'ready_to_export';
  }

  const config: Record<string, { color: string; label: string }> = {
    incomplete:           { color: '#ef4444', label: `${result.overallPct}% Complete` },
    missing_info:         { color: '#ef4444', label: 'Missing Info' },
    review:               { color: '#f59e0b', label: 'Ready for Review' },
    ready_for_signature:  { color: '#3b82f6', label: 'Ready for Signature' },
    ready_to_export:      { color: '#22c55e', label: 'Ready to Export' },
  };

  const c = config[readyState] || config.incomplete;
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, color: c.color,
      background: `${c.color}18`, padding: '2px 8px', borderRadius: 9999,
    }}>
      {c.label}
    </span>
  );
}
