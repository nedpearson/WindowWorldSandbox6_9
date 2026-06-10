import React, { useState } from 'react';
import { api } from '../utils/api';

/**
 * SidingOutsideMeasureCard
 *
 * Shown inside the opening editor when:
 *   - exteriorSurface is siding/wood/hardie/composite, AND
 *   - measurementMethod is 'outside' (or outsideMeasureUsed = true)
 *
 * Enforces three rules in one unified card (so the rep isn't overwhelmed):
 *
 *   Rule B — Cutback Likely (requires decision)
 *   Rule C — Header Required (auto-applied, shows status)
 *   Rule D — Trim Decision Required (rep must choose)
 *
 * Design goals:
 *   - One card, not three scattered warnings
 *   - All decisions save immediately to backend
 *   - Mobile/iPad-friendly touch targets
 *   - Cannot proceed to proposal/contract with manager_review unresolved
 */

interface Props {
  opening: any;
  appointmentId: string;
  onUpdate: (updated: Partial<any>) => void;
}

type CutbackDecision = 'confirmed' | 'not_needed' | 'manager_review' | null;
type TrimDecision    = 'add_trim'  | 'not_needed' | 'manager_review' | null;

export function SidingOutsideMeasureCard({ opening, appointmentId, onUpdate }: Props) {
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [cutbackDecision, setCutbackDecision] = useState<CutbackDecision>(
    (opening.cutbackReviewStatus as CutbackDecision) || null,
  );
  const [trimDecision, setTrimDecision]     = useState<TrimDecision>(
    (opening.trimDecision as TrimDecision) || null,
  );
  const [trimReason, setTrimReason]         = useState(opening.trimDecisionReason || '');
  const [showTrimReasonInput, setShowTrimReasonInput] = useState(false);

  const headerAdded   = !!opening.headerSelected || !!opening.headerRequired;
  const allResolved   =
    cutbackDecision !== null &&
    trimDecision !== null &&
    (trimDecision !== 'not_needed' || trimReason.trim().length > 0);

  async function save(patch: Record<string, any>) {
    setSaving(true);
    setError(null);
    try {
      await api.updateOpening(opening.id, patch);
      onUpdate(patch);
    } catch {
      setError('Save failed — tap again to retry.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCutbackDecision(decision: CutbackDecision) {
    if (!decision) return;
    setCutbackDecision(decision);
    const patch: Record<string, any> = {
      cutbackSelected:    decision === 'confirmed',
      cutbackReviewStatus: decision,
    };
    if (decision === 'confirmed') {
      patch.installerNotes = [
        opening.installerNotes,
        'CUTBACK CONFIRMED — outside measure on siding; cutback included in quote.',
      ].filter(Boolean).join(' | ');
    } else if (decision === 'not_needed') {
      patch.installerNotes = [
        opening.installerNotes,
        'Cutback reviewed — not required for this opening.',
      ].filter(Boolean).join(' | ');
    } else {
      patch.managerReviewRequired = true;
    }
    await save(patch);
  }

  async function handleTrimDecision(decision: TrimDecision) {
    if (!decision) return;
    if (decision === 'not_needed') {
      setTrimDecision(decision);
      setShowTrimReasonInput(true);
      return; // wait for reason before saving
    }
    setTrimDecision(decision);
    setShowTrimReasonInput(false);
    const patch: Record<string, any> = {
      trimDecision:         decision,
      trimSelected:         decision === 'add_trim',
      managerReviewRequired: decision === 'manager_review',
    };
    if (decision === 'add_trim') {
      patch.installerNotes = [
        opening.installerNotes,
        'TRIM — added per field condition (siding/outside measure).',
      ].filter(Boolean).join(' | ');
    } else if (decision === 'manager_review') {
      patch.installerNotes = [
        opening.installerNotes,
        'TRIM — manager review required before final contract.',
      ].filter(Boolean).join(' | ');
    }
    await save(patch);
  }

  async function handleTrimNotNeededConfirm() {
    if (!trimReason.trim()) return;
    const patch: Record<string, any> = {
      trimDecision:       'not_needed',
      trimDecisionReason: trimReason,
      trimSelected:       false,
      installerNotes: [
        opening.installerNotes,
        `TRIM NOT NEEDED — existing trim remains. Reason: ${trimReason}`,
      ].filter(Boolean).join(' | '),
    };
    setShowTrimReasonInput(false);
    await save(patch);
  }

  const choiceBtn = (
    label: string,
    active: boolean,
    color: string,
    onClick: () => void,
    id: string,
  ) => (
    <button
      id={id}
      onClick={onClick}
      disabled={saving}
      style={{
        padding: '0.375rem 0.75rem',
        background: active ? color : 'rgba(255,255,255,0.06)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 6,
        fontSize: '0.78rem',
        fontWeight: active ? 700 : 500,
        cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      background: 'rgba(249,115,22,0.07)',
      border: '1px solid rgba(249,115,22,0.3)',
      borderRadius: 10,
      padding: '0.875rem 1rem',
      marginTop: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f97316' }}>
          Siding + Outside Measure — Action Required
        </span>
        {allResolved && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>
            All resolved
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Outside measure on siding requires careful verification of header, cutback, and trim. Please confirm each item below.
      </p>

      {/* ── Rule C: Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={headerAdded ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {headerAdded
              ? <polyline points="20 6 9 17 4 12"/>
              : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
            }
          </svg>
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Header Flashing
          </span>
        </div>
        <span style={{
          fontSize: '0.78rem',
          color: headerAdded ? '#22c55e' : '#ef4444',
          fontWeight: 600,
        }}>
          {headerAdded ? 'Required — Added' : 'REQUIRED — Not Selected'}
        </span>
      </div>

      {/* ── Rule B: Cutback ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
          Cutback
          {opening.cutbackLikely && <span style={{ fontSize: '0.73rem', color: '#f97316', marginLeft: '0.375rem' }}>— Likely</span>}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {choiceBtn('Add to Quote',    cutbackDecision === 'confirmed',      '#22c55e', () => handleCutbackDecision('confirmed'),      `cutback-add-${opening.id}`)}
          {choiceBtn('Not Needed',      cutbackDecision === 'not_needed',     '#64748b', () => handleCutbackDecision('not_needed'),      `cutback-skip-${opening.id}`)}
          {choiceBtn('Manager Review',  cutbackDecision === 'manager_review', '#7c3aed', () => handleCutbackDecision('manager_review'),  `cutback-mgr-${opening.id}`)}
        </div>
      </div>

      {/* ── Rule D: Trim ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
          Trim
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {choiceBtn('Add Trim',        trimDecision === 'add_trim',       '#22c55e', () => handleTrimDecision('add_trim'),       `trim-add-${opening.id}`)}
          {choiceBtn('Not Needed',      trimDecision === 'not_needed',     '#64748b', () => handleTrimDecision('not_needed'),     `trim-skip-${opening.id}`)}
          {choiceBtn('Manager Review',  trimDecision === 'manager_review', '#7c3aed', () => handleTrimDecision('manager_review'), `trim-mgr-${opening.id}`)}
        </div>

        {/* Reason input when "Not Needed" selected */}
        {showTrimReasonInput && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Reason trim is not needed (required):
            </label>
            <input
              id={`trim-reason-${opening.id}`}
              type="text"
              value={trimReason}
              onChange={e => setTrimReason(e.target.value)}
              placeholder="Existing trim in good condition, customer keeping trim, etc."
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '0.375rem 0.5rem',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              id={`trim-reason-confirm-${opening.id}`}
              onClick={handleTrimNotNeededConfirm}
              disabled={!trimReason.trim() || saving}
              style={{
                alignSelf: 'flex-start',
                padding: '0.35rem 0.75rem',
                background: trimReason.trim() ? '#64748b' : 'rgba(100,116,139,0.3)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: trimReason.trim() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving…' : 'Confirm — Trim Not Needed'}
            </button>
          </div>
        )}
      </div>

      {/* Photo prompt */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 6,
        padding: '0.5rem 0.75rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Photos recommended:</strong>{' '}
        Straight-on exterior shot, close-up of siding/trim/header condition, and return/depth detail showing how the existing window is set.
      </div>

      {error && <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444' }}>{error}</p>}
    </div>
  );
}
