import { useState, useEffect, useRef } from 'react';
import { toast } from './Toast';
import {
  SIGNATURE_FIELDS, getSignatures, saveSignature, clearSignature,
  allSignaturesComplete, type AppointmentSignatures,
} from '../utils/signatureStore';
import { saveLocalFile } from '../utils/localFileSaver';
import { SignaturePad } from './SignaturePad';

// ── Signing Progress Dots ─────────────────────────────────
function ProgressDots({ total, current, sigs }: { total: number; current: number; sigs: AppointmentSignatures }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
      {SIGNATURE_FIELDS.map((f, i) => {
        const done = !!sigs[f.key];
        const active = i === current;
        return (
          <div key={f.key} style={{
            width: active ? 28 : 10, height: 10, borderRadius: 5,
            background: done ? 'var(--ok)' : active ? 'var(--blue)' : 'var(--border)',
            transition: 'all 0.3s ease',
          }} />
        );
      })}
    </div>
  );
}

// ── Signature Confirmation PDF generator (canvas-based) ──
async function generateSignedPDF(appointment: any, sigs: AppointmentSignatures) {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const w = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Window World — Signed Contract Confirmation', margin, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 28);

    // Customer info
    const c = appointment.customer;
    if (c) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer', margin, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${c.firstName || ''} ${c.lastName || ''}`, margin, 47);
      doc.text(c.address || '', margin, 53);
      doc.text(`${c.phone || ''} · ${c.email || ''}`, margin, 59);
      doc.text(`Sales Rep: npearson@winworldinfo.com`, margin, 65);
    }

    // Order summary
    const openings = appointment.openings || [];
    const total = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Order Summary', margin, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`${openings.length} openings · Total: $${total.toFixed(2)}`, margin, 79);

    let y = 92;
    // Each signature block
    for (const field of SIGNATURE_FIELDS) {
      const entry = sigs[field.key];
      if (!entry) continue;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${field.icon} ${field.title}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(field.description, w - margin * 2);
      doc.text(lines, margin, y + 6);
      y += 6 + lines.length * 4;

      // Signature image
      if (entry.dataUrl) {
        try {
          const imgH = field.type === 'initials' ? 15 : 25;
          doc.addImage(entry.dataUrl, 'PNG', margin, y, field.type === 'initials' ? 40 : 80, imgH);
          y += imgH + 3;
        } catch (e) { console.debug("[swallowed error]", e); }
      }

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Signed by: ${entry.signerName} · ${new Date(entry.signedAt).toLocaleString()}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 8;

      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, w - margin, y);
      y += 6;

      if (y > 250) { doc.addPage(); y = 20; }
    }

    const blob = doc.output('blob');
    await saveLocalFile(blob, `WindowWorld_Signed_${appointment.customer?.lastName || 'Contract'}_${Date.now()}.pdf`, 'application/pdf', 'pdf');
  } catch (e) {
    console.error('PDF error:', e);
    toast.error('PDF generation failed. Please try again.');
  }
}

// ══════════════════════════════════════════════════════════
// TABLET SIGNING MODE — Full screen guided flow
// ══════════════════════════════════════════════════════════
export function TabletSigningMode({ appointment, onClose }: { appointment: any; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [sigs, setSigs] = useState<AppointmentSignatures>(() => getSignatures(appointment.id));
  const [generating, setGenerating] = useState(false);

  const field = SIGNATURE_FIELDS[step];
  const total = SIGNATURE_FIELDS.length;
  const done = allSignaturesComplete(sigs);
  const requiredDone = SIGNATURE_FIELDS.filter(f => f.required).every(f => !!sigs[f.key]);

  const customerName = `${appointment.customer?.firstName || ''} ${appointment.customer?.lastName || ''}`.trim() || 'Customer';

  const handleSave = (dataUrl: string) => {
    const entry = { dataUrl, signedAt: Date.now(), signerName: customerName };
    saveSignature(appointment.id, field.key, entry);
    setSigs(prev => ({ ...prev, [field.key]: entry }));
  };

  const handleClear = () => {
    clearSignature(appointment.id, field.key);
    setSigs(prev => { const n = { ...prev }; delete n[field.key]; return n; });
  };

  const goNext = () => { if (step < total - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    await generateSignedPDF(appointment, sigs);
    setGenerating(false);
  };

  // Lock screen orientation on mount if API available
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      color: 'var(--text)',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', gap: '0.5rem', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🪟</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.625rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>WINDOW WORLD — CUSTOMER SIGNING</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customerName}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ padding: '0.375rem 0.75rem', flexShrink: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
          Exit
        </button>
      </div>

      {/* Progress */}
      <div style={{ padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
          STEP {step + 1} OF {total}
        </div>
        <ProgressDots total={total} current={step} sigs={sigs} />
        {/* Step labels — scrollable on mobile */}
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', overflowX: 'auto', maxWidth: '100%', paddingBottom: '2px' }}>
          {SIGNATURE_FIELDS.map((f, i) => {
            const done = !!sigs[f.key];
            return (
              <button key={f.key} onClick={() => setStep(i)} style={{
                fontSize: '0.5625rem', padding: '2px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                background: done ? 'rgba(25,135,84,0.12)' : i === step ? 'var(--infobg)' : 'var(--bg)',
                color: done ? 'var(--ok)' : i === step ? 'var(--blue)' : 'var(--muted)',
              }}>
                {done ? '✓ ' : ''}{f.title.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main signing area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', maxWidth: 760, margin: '0 auto', width: '100%' }}>

        {/* Disclosure card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem', width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>{field.icon}</span>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{field.title}</div>
              {field.required && <span style={{ fontSize: '0.625rem', padding: '2px 6px', borderRadius: 4, background: '#fdecec', color: '#a32d2d', fontWeight: 700 }}>REQUIRED</span>}
            </div>
          </div>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--muted)', margin: 0 }}>
            {field.description}
          </p>
        </div>

        {/* Signature pad */}
        <div style={{ width: '100%', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            {field.label}
          </div>
          <SignaturePad
            key={field.key}
            onSave={handleSave}
            onClear={handleClear}
            height={field.type === 'initials' ? 120 : 180}
            label={field.type === 'initials' ? 'Initials here' : 'Sign here'}
            existingDataUrl={sigs[field.key]?.dataUrl}
            isInitials={field.type === 'initials'}
          />
          {sigs[field.key] && (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem', textAlign: 'right' }}>
              Captured {new Date(sigs[field.key]!.signedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: 'var(--card)' }}>
        <button onClick={goPrev} disabled={step === 0} style={{
          padding: '0.75rem 1.5rem', fontSize: '0.9375rem', background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, color: step === 0 ? 'var(--muted)' : 'var(--text)', cursor: step === 0 ? 'not-allowed' : 'pointer', fontWeight: 600,
        }}>← Back</button>

        {/* Summary of completed */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            {SIGNATURE_FIELDS.map(f => (
              <div key={f.key} style={{ fontSize: '0.75rem' }}>{sigs[f.key] ? '✅' : f.required ? '⬜' : '◻️'}</div>
            ))}
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            {Object.keys(sigs).length}/{SIGNATURE_FIELDS.filter(f => f.required).length} required
          </div>
        </div>

        {step < total - 1 ? (
          <button onClick={goNext} style={{
            padding: '0.75rem 2rem', fontSize: '0.9375rem', fontWeight: 700,
            background: sigs[field.key] ? 'var(--blue)' : 'var(--border)',
            border: 'none', borderRadius: 8, color: sigs[field.key] ? 'white' : 'var(--muted)', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {field.required && !sigs[field.key] ? 'Sign to Continue →' : 'Next →'}
          </button>
        ) : (
          <button onClick={handleGeneratePDF} disabled={!requiredDone || generating} style={{
            padding: '0.75rem 2rem', fontSize: '0.9375rem', fontWeight: 700,
            background: requiredDone ? 'var(--ok)' : 'var(--border)',
            border: 'none', borderRadius: 8, color: requiredDone ? 'white' : 'var(--muted)', cursor: requiredDone ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
          }}>
            {generating ? '⏳ Generating...' : requiredDone ? '✅ Generate Signed PDF' : '⬜ Complete Required Signatures'}
          </button>
        )}
      </div>

      {/* All complete banner */}
      {done && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', opacity: 0, animation: 'fadeIn 0.5s ease 0.2s forwards' }}>
          <div style={{ fontSize: '4rem' }}>🎉</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ok)' }}>All Signatures Complete!</div>
        </div>
      )}
    </div>
  );
}

// ── Signing Status Badge (shown in appointment detail) ────
export function SigningStatusBadge({ appointmentId, onEnterSigningMode }: {
  appointmentId: string;
  onEnterSigningMode: () => void;
}) {
  const sigs = getSignatures(appointmentId);
  const required = SIGNATURE_FIELDS.filter(f => f.required);
  const completed = required.filter(f => !!sigs[f.key]).length;
  const allDone = completed === required.length;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: allDone ? 'rgba(25,135,84,0.08)' : 'var(--infobg)', border: `1px solid ${allDone ? 'var(--ok)' : 'var(--blue)'}`, borderRadius: '12px', marginBottom: '1rem' }}>
      <span style={{ fontSize: '1.25rem' }}>{allDone ? '✅' : '✍️'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: allDone ? 'var(--ok)' : 'var(--text)' }}>
          {allDone ? 'All Signatures Complete' : `Signatures: ${completed}/${required.length} required`}
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
          {SIGNATURE_FIELDS.filter(f => f.required).map(f => (
            <span key={f.key} style={{ fontSize: '0.5625rem', padding: '1px 6px', borderRadius: 4, fontWeight: 700, background: sigs[f.key] ? 'rgba(25,135,84,0.15)' : 'var(--bg)', color: sigs[f.key] ? 'var(--ok)' : 'var(--muted)' }}>
              {sigs[f.key] ? '✓ ' : ''}{f.title}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onEnterSigningMode} className="btn btn-sm" style={{ background: allDone ? 'rgba(25,135,84,0.15)' : 'var(--blue)', color: allDone ? 'var(--ok)' : 'white', border: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {allDone ? 'View Signatures' : '✍️ Start Signing'}
      </button>
    </div>
  );
}
