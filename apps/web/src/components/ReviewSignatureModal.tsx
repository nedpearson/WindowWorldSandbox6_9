// ═══════════════════════════════════════════════════════════════
// ReviewSignatureModal.tsx
// Inline modal that collects all 4 required signature fields,
// saves them to the backend, and refreshes validation.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { SignaturePad } from './SignaturePad';
import { api } from '../utils/api';
import { toast } from './Toast';

export interface ReviewSignatureModalProps {
  appointmentId: string;
  /** Which fields are still missing — determines which pads are highlighted */
  missingFields: string[];
  onSaved: () => void;
  onClose: () => void;
}

const SIGNATURE_FIELDS = [
  {
    key: 'ownerSignature',
    label: 'Owner Signature',
    role: 'Owner',
    isInitials: false,
    required: true,
    description: 'Customer/homeowner authorises the work',
  },
  {
    key: 'signatureDate',
    label: 'Signature Date',
    role: 'Date',
    isDate: true,
    required: true,
    description: 'Date the agreement is signed',
  },
  {
    key: 'estimatorSignature',
    label: 'Estimator Signature',
    role: 'Estimator',
    isInitials: false,
    required: true,
    description: 'Sales rep or estimator authorises the quote',
  },
  {
    key: 'customerInitials',
    label: 'Customer Initials',
    role: 'Initials',
    isInitials: true,
    required: true,
    description: 'Customer initials acknowledging terms',
  },
] as const;

export function ReviewSignatureModal({
  appointmentId,
  missingFields,
  onSaved,
  onClose,
}: ReviewSignatureModalProps) {
  const [sigs, setSigs] = useState<Record<string, string>>({});
  const [signatureDate, setSignatureDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  const isMissing = (key: string) => missingFields.includes(key) || missingFields.length === 0;

  const handleSave = async () => {
    const hasOwner = !!sigs.ownerSignature;
    const hasDate = !!signatureDate;
    if (!hasOwner || !hasDate) {
      toast.error('Owner signature and signature date are required.');
      return;
    }

    setSaving(true);
    try {
      const sigPayload: Record<string, string> = { ...sigs };
      if (signatureDate) sigPayload.signatureDate = signatureDate;

      await api.saveSignatures(appointmentId, sigPayload);
      toast.success('Signatures saved successfully.');
      onSaved();
    } catch (err: any) {
      toast.error(`Could not save signatures: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = SIGNATURE_FIELDS.filter(f => {
    if (f.key === 'signatureDate') return !!signatureDate;
    return !!sigs[f.key];
  }).length;

  return (
    /* Overlay */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '1.5rem',
        width: '100%', maxWidth: 600,
        maxHeight: '90dvh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>✍️ Complete Signatures</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
              {completedCount} of {SIGNATURE_FIELDS.length} completed
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem' }}
          >✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: '1.5rem' }}>
          <div style={{
            height: '100%', borderRadius: 2, transition: 'width 0.3s ease',
            background: completedCount === SIGNATURE_FIELDS.length ? 'var(--ok)' : 'var(--blue)',
            width: `${(completedCount / SIGNATURE_FIELDS.length) * 100}%`,
          }} />
        </div>

        {/* Signature fields */}
        {SIGNATURE_FIELDS.map(field => {
          const missing = isMissing(field.key);
          const isDone = field.key === 'signatureDate' ? !!signatureDate : !!sigs[field.key];

          return (
            <div
              key={field.key}
              id={field.key}
              data-focus={field.key}
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                borderRadius: 10,
                background: isDone ? 'rgba(25,135,84,0.06)' : 'var(--bg)',
                border: `1px solid ${isDone ? 'var(--ok)' : missing ? '#a32d2d' : 'var(--border)'}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isDone ? 'var(--ok)' : 'var(--text)' }}>
                    {isDone ? '✓ ' : ''}{field.label}
                    {field.required && !isDone && <span style={{ color: '#a32d2d', marginLeft: 4 }}>*</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 1 }}>{field.description}</div>
                </div>
              </div>

              {/* Date picker for signatureDate */}
              {(field as any).isDate ? (
                <input
                  id="signatureDate"
                  name="signatureDate"
                  data-focus="signatureDate"
                  type="date"
                  value={signatureDate}
                  onChange={e => setSignatureDate(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: 8, fontSize: '0.9rem',
                    background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              ) : (
                /* Signature canvas */
                <SignaturePad
                  key={field.key}
                  label={`Sign here — ${field.label}`}
                  height={(field as any).isInitials ? 100 : 160}
                  isInitials={(field as any).isInitials ?? false}
                  existingDataUrl={sigs[field.key]}
                  onSave={dataUrl => setSigs(prev => ({ ...prev, [field.key]: dataUrl }))}
                  onClear={() => setSigs(prev => { const n = { ...prev }; delete n[field.key]; return n; })}
                />
              )}
            </div>
          );
        })}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
              background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !sigs.ownerSignature || !signatureDate}
            style={{
              padding: '0.6rem 1.4rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700,
              background: sigs.ownerSignature && signatureDate ? 'var(--blue)' : 'var(--border)',
              color: sigs.ownerSignature && signatureDate ? '#fff' : 'var(--muted)', border: 'none', cursor: saving ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving…' : `Save Signatures (${completedCount}/${SIGNATURE_FIELDS.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
