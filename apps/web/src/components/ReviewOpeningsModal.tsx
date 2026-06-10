// ═══════════════════════════════════════════════════════════════
// ReviewOpeningsModal.tsx
// Guided flow for "Fix Openings & Pricing" review action.
// Detects the right sub-flow automatically:
//   1. No openings + sketch markers → offer reconcile
//   2. No openings + no markers → link to Add Opening
//   3. Job-level price only → offer confirm or add openings
//   4. Opening totals mismatch → offer recalculate
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { api } from '../utils/api';
import { toast } from './Toast';

export interface ReviewOpeningsModalProps {
  appointment: any;
  /** The IDs of the active opening/pricing issues e.g. 'no-openings', 'reconcile-mismatch', etc. */
  issueIds: string[];
  onSaved: () => void;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

type FlowState = 'detecting' | 'no_openings_no_markers' | 'no_openings_has_markers' | 'job_level' | 'mismatch' | 'unpriced';

export function ReviewOpeningsModal({
  appointment,
  issueIds,
  onSaved,
  onClose,
  onNavigate,
}: ReviewOpeningsModalProps) {
  const openings: any[] = appointment?.openings || [];
  const subtotal: number = appointment?.subtotal || 0;
  const hasMarkersInSketch = !!appointment?._sketchMarkerCount; // optional meta
  const jobLevelConfirmed: boolean = appointment?.jobLevelPriceConfirmed || false;
  const [loading, setLoading] = useState(false);

  // Determine which flow to show based on issue IDs and appointment state
  let flow: FlowState = 'detecting';
  if (issueIds.includes('no-openings') || issueIds.includes('no_openings_entered')) {
    flow = hasMarkersInSketch ? 'no_openings_has_markers' : 'no_openings_no_markers';
  } else if (issueIds.includes('no-openings-linked')) {
    flow = 'no_openings_has_markers';
  } else if (issueIds.includes('pricing-mismatch-no-openings') || issueIds.includes('pricing-mismatch-unpriced')) {
    flow = openings.length === 0 ? 'job_level' : 'unpriced';
  } else if (issueIds.includes('reconcile-mismatch')) {
    flow = 'mismatch';
  } else if (openings.length === 0 && subtotal > 0) {
    flow = 'job_level';
  } else if (openings.length === 0) {
    flow = 'no_openings_no_markers';
  } else {
    flow = 'mismatch';
  }

  const handleReconcile = async () => {
    setLoading(true);
    try {
      const result = await api.reconcileOpenings(appointment.id);
      toast.success(result.message || `Linked ${result.created} openings from sketch.`);
      onSaved();
    } catch (err: any) {
      toast.error(`Could not reconcile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJobLevel = async () => {
    setLoading(true);
    try {
      await api.confirmJobLevelPrice(appointment.id);
      toast.success('Job-level pricing confirmed. Validation warning cleared.');
      onSaved();
    } catch (err: any) {
      toast.error(`Could not confirm: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      await api.applyReviewAction({
        appointmentId: appointment.id,
        actionType: 'apply_quote_options',
        payload: { action: 'recalculate' },
      });
      toast.success('Pricing recalculated from openings.');
      onSaved();
    } catch (err: any) {
      toast.error(`Could not recalculate: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '1.5rem',
        width: '100%', maxWidth: 520,
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>📐 Fix Openings & Pricing</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* ── No openings, sketch markers exist → reconcile ── */}
        {flow === 'no_openings_has_markers' && (
          <FlowSection
            emoji="🔗"
            title="Sketch markers found but not linked"
            description="Your sketch has window/door markers drawn, but they haven't been linked to pricing openings. Reconcile to automatically create and price each opening."
            primaryLabel={loading ? 'Reconciling…' : 'Link Sketch Openings Now'}
            primaryDisabled={loading}
            onPrimary={handleReconcile}
            secondaryLabel="Open Sketch Manually"
            onSecondary={() => { onClose(); onNavigate('sketch'); }}
          />
        )}

        {/* ── No openings, no markers → route to sketch ── */}
        {flow === 'no_openings_no_markers' && (
          <FlowSection
            emoji="🪟"
            title="No openings entered"
            description="No windows or doors have been measured or added yet. Add them in the Sketch section or the Pricing section."
            primaryLabel="Go to Sketch → Add Opening"
            onPrimary={() => { onClose(); onNavigate('sketch'); }}
            secondaryLabel="Go to Pricing Tab"
            onSecondary={() => { onClose(); onNavigate('pricing'); }}
          />
        )}

        {/* ── Job-level price but no openings → confirm or add ── */}
        {flow === 'job_level' && (
          <>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.55 }}>
              A job-level subtotal of{' '}
              <strong style={{ color: '#f1f5f9' }}>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>{' '}
              exists without individual opening prices. Choose how to proceed:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <OptionButton
                emoji="✅"
                label="Confirm job-level price is correct"
                description="I deliberately set a single price for the whole job — no per-opening pricing needed."
                disabled={loading || jobLevelConfirmed}
                note={jobLevelConfirmed ? 'Already confirmed' : undefined}
                onClick={handleConfirmJobLevel}
              />
              <OptionButton
                emoji="📐"
                label="Add individual openings instead"
                description="I'll go to Sketch and enter each window/door separately."
                onClick={() => { onClose(); onNavigate('sketch'); }}
              />
              <OptionButton
                emoji="🔗"
                label="Link sketch markers to pricing"
                description="Sketch markers exist — auto-create openings from them."
                onClick={handleReconcile}
                disabled={loading}
              />
            </div>
          </>
        )}

        {/* ── Opening totals mismatch ── */}
        {flow === 'mismatch' && (
          <FlowSection
            emoji="⚖️"
            title="Opening totals don't match proposal subtotal"
            description={`Opening prices total $${openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} but proposal subtotal is $${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Recalculate to sync them.`}
            primaryLabel={loading ? 'Recalculating…' : 'Recalculate Pricing'}
            primaryDisabled={loading}
            onPrimary={handleRecalculate}
            secondaryLabel="Edit Openings in Pricing Tab"
            onSecondary={() => { onClose(); onNavigate('pricing'); }}
          />
        )}

        {/* ── Openings exist but unpriced ── */}
        {flow === 'unpriced' && (
          <FlowSection
            emoji="💵"
            title="Openings exist but have no prices"
            description={`${openings.length} opening${openings.length !== 1 ? 's' : ''} found, but none have prices assigned. Recalculate to apply pricing from the active pricing table.`}
            primaryLabel={loading ? 'Recalculating…' : 'Apply Pricing to Openings'}
            primaryDisabled={loading}
            onPrimary={handleRecalculate}
            secondaryLabel="Edit in Pricing Tab"
            onSecondary={() => { onClose(); onNavigate('pricing'); }}
          />
        )}

        {/* Dismiss */}
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600,
              background: 'transparent', color: '#64748b', border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowSection({
  emoji, title, description, primaryLabel, primaryDisabled, onPrimary, secondaryLabel, onSecondary,
}: {
  emoji: string; title: string; description: string;
  primaryLabel: string; primaryDisabled?: boolean; onPrimary: () => void;
  secondaryLabel?: string; onSecondary?: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{title}</div>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.55 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <button
          onClick={onPrimary}
          disabled={primaryDisabled}
          style={{
            padding: '0.7rem 1.2rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700,
            background: primaryDisabled ? 'rgba(99,102,241,0.3)' : '#6366f1',
            color: '#fff', border: 'none', cursor: primaryDisabled ? 'wait' : 'pointer',
          }}
        >
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            style={{
              padding: '0.65rem 1.2rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
              background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
            }}
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </>
  );
}

function OptionButton({
  emoji, label, description, disabled, note, onClick,
}: {
  emoji: string; label: string; description: string; disabled?: boolean; note?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        padding: '0.85rem 1rem', borderRadius: 9, width: '100%', textAlign: 'left',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        color: 'inherit', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
    >
      <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#f1f5f9' }}>{label}</div>
        <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2, lineHeight: 1.45 }}>{description}</div>
        {note && <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: 3 }}>{note}</div>}
      </div>
    </button>
  );
}
