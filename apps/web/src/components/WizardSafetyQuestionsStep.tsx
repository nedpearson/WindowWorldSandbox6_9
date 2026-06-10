import { useState } from 'react';
import { WizardSafetyAnswers } from '../utils/safetyGlazingRules';

interface WizardSafetyStepProps {
  answers: WizardSafetyAnswers;
  onChange: (answers: WizardSafetyAnswers) => void;
}

const QUESTIONS: Array<{
  key: keyof WizardSafetyAnswers;
  label: string;
  subtext?: string;
  icon: string;
  severity: 'high' | 'medium' | 'low';
}> = [
  { key: 'isInOrPartOfDoor', icon: '🚪', label: 'Is this opening in or part of a door?', subtext: 'e.g. patio door, sliding door, entrance door, storm door', severity: 'high' },
  { key: 'isNextToDoor', icon: '↔️', label: 'Is this opening next to a door?', subtext: 'e.g. sidelight, glass panel beside an entrance', severity: 'high' },
  { key: 'isInWetArea', icon: '🚿', label: 'Is this in a bathroom, shower, tub, or wet area?', subtext: 'Bath, shower, tub enclosure, pool/spa area', severity: 'high' },
  { key: 'isCloseToFloor', icon: '⬇️', label: 'Is the glass close to the floor / walking surface?', subtext: 'Bottom edge less than ~18" from floor, or floor-to-ceiling glass', severity: 'high' },
  { key: 'isNearStairs', icon: '🪜', label: 'Is this near stairs, a landing, or a ramp?', subtext: 'Stairway, stair landing, ramp, top/bottom of steps', severity: 'high' },
  { key: 'isLargeFixedPanel', icon: '🖼️', label: 'Is this a large fixed / picture glass panel?', subtext: 'Large picture window or fixed panel where breakage could be a hazard', severity: 'medium' },
  { key: 'isHighTrafficArea', icon: '🚶', label: 'Is this in a high-traffic or impact-risk area?', subtext: 'Entry hall, main corridor, busy area of the home', severity: 'medium' },
  { key: 'childArea', icon: '👶', label: 'Is this in a child room or play area?', severity: 'medium' },
  { key: 'unsureAboutTempered', icon: '❓', label: 'Are you unsure whether tempered glass is required?', subtext: 'When in doubt, mark it for review', severity: 'medium' },
];

export function WizardSafetyQuestionsStep({ answers, onChange }: WizardSafetyStepProps) {
  const setAnswer = (key: keyof WizardSafetyAnswers, val: boolean) => {
    onChange({ ...answers, [key]: val });
  };

  const yesCount = Object.values(answers).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 600, textAlign: 'center' }}>
        🛡️ Safety Glazing Check — Review tempered glass before finalizing
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, padding: '0.5rem' }}>
        Answer the questions below. If any apply, the app will flag this opening for tempered glass review.
        <br /><em>This does not substitute for code compliance verification.</em>
      </div>

      {QUESTIONS.map(q => {
        const val = answers[q.key];
        return (
          <div key={q.key} style={{
            padding: '0.75rem', borderRadius: 8,
            border: `1px solid ${val === true ? (q.severity === 'high' ? 'var(--danger)' : 'var(--warning)') : 'var(--border)'}`,
            background: val === true ? (q.severity === 'high' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)') : 'var(--bg-secondary)',
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {q.icon} {q.label}
                </div>
                {q.subtext && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {q.subtext}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                {[
                  { v: true, label: 'Yes', color: q.severity === 'high' ? 'var(--danger)' : 'var(--warning)' },
                  { v: false, label: 'No', color: 'var(--success)' },
                ].map(opt => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setAnswer(q.key, opt.v)}
                    style={{
                      padding: '0.375rem 0.875rem', borderRadius: 6, fontWeight: 700, fontSize: '0.8125rem',
                      border: `2px solid ${val === opt.v ? opt.color : 'transparent'}`,
                      background: val === opt.v ? `${opt.color}22` : 'var(--bg-primary)',
                      color: val === opt.v ? opt.color : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {yesCount > 0 && (
        <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', textAlign: 'center', fontWeight: 700, color: 'var(--danger)' }}>
          ⚠️ {yesCount} condition{yesCount > 1 ? 's' : ''} flagged — tempered glass review will be required for this opening.
        </div>
      )}
    </div>
  );
}
