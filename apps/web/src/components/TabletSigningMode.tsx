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
      doc.text('Customer Details', margin, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${c.firstName || ''} ${c.lastName || ''}`, margin, 47);
      doc.text(c.address || '', margin, 53);
      doc.text(`${c.phone || ''} · ${c.email || ''}`, margin, 59);
      doc.text(`Sales Rep: npearson@winworldinfo.com`, margin, 65);
    }

    // Order Summary & Specifications Table
    const openings = (appointment.openings || []).filter((o: any) => !o.deletedAt);
    const total = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Order Summary & Specifications', margin, 74);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Draw table headers
    let tableY = 81;
    doc.setFont('helvetica', 'bold');
    doc.text('#', margin, tableY);
    doc.text('Room Location', margin + 10, tableY);
    doc.text('Size (W x H)', margin + 45, tableY);
    doc.text('Product / Colors / Options', margin + 75, tableY);
    doc.text('Price', margin + 175, tableY, { align: 'right' });
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, tableY + 2, w - margin, tableY + 2);
    
    tableY += 6;
    doc.setFont('helvetica', 'normal');
    
    for (const o of openings) {
      if (tableY > 260) {
        doc.addPage();
        tableY = 20;
        // Repeat headers
        doc.setFont('helvetica', 'bold');
        doc.text('#', margin, tableY);
        doc.text('Room Location', margin + 10, tableY);
        doc.text('Size (W x H)', margin + 45, tableY);
        doc.text('Product / Colors / Options', margin + 75, tableY);
        doc.text('Price', margin + 175, tableY, { align: 'right' });
        doc.line(margin, tableY + 2, w - margin, tableY + 2);
        tableY += 6;
        doc.setFont('helvetica', 'normal');
      }
      
      const winNum = String(o.windowNumber || o.openingNumber);
      const room = String(o.roomLocation || 'Unnamed');
      const sizeStr = `${o.width || ''}" × ${o.height || ''}"`;
      
      const opts = [];
      if (o.productCategory) opts.push(o.productCategory.replace(/_/g, ' '));
      if (o.interiorColor || o.exteriorColor) opts.push(`${o.interiorColor || 'White'}/${o.exteriorColor || 'White'}`);
      if (o.gridStyle && o.gridStyle !== 'None') opts.push(`${o.gridStyle} grids`);
      if (o.glassPackage) opts.push(o.glassPackage);
      const desc = opts.join(', ');
      
      const priceStr = `$${(o.totalPrice || 0).toFixed(2)}`;
      
      doc.text(winNum, margin, tableY);
      doc.text(room, margin + 10, tableY);
      doc.text(sizeStr, margin + 45, tableY);
      
      // Limit description length to fit on line
      const truncatedDesc = desc.length > 55 ? desc.substring(0, 52) + '...' : desc;
      doc.text(truncatedDesc, margin + 75, tableY);
      
      doc.text(priceStr, margin + 175, tableY, { align: 'right' });
      
      tableY += 5;
    }
    
    // Draw total row
    doc.setDrawColor(150, 150, 150);
    doc.line(margin, tableY, w - margin, tableY);
    tableY += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total (${openings.length} openings):`, margin, tableY);
    doc.text(`$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 175, tableY, { align: 'right' });
    
    let y = tableY + 12;

    // Each signature block
    for (const field of SIGNATURE_FIELDS) {
      const entry = sigs[field.key];
      if (!entry) continue;

      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      // Remove field.icon to prevent garbled emoji unicode characters in PDF
      doc.text(field.title, margin, y);
      
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
    }

    const blob = doc.output('blob');
    await saveLocalFile(blob, `WindowWorld_Signed_${appointment.customer?.lastName || 'Contract'}_${Date.now()}.pdf`, 'application/pdf', 'pdf');
  } catch (e) {
    console.error('PDF error:', e);
    toast.error('PDF generation failed. Please try again.');
  }
}

// ── Saved PDF generator ──

// ══════════════════════════════════════════════════════════
// TABLET SIGNING MODE — Full screen guided flow
// ══════════════════════════════════════════════════════════
export function TabletSigningMode({ appointment, onClose }: { appointment: any; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [sigs, setSigs] = useState<AppointmentSignatures>(() => getSignatures(appointment.id));
  const [generating, setGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const field = SIGNATURE_FIELDS[step];
  const total = SIGNATURE_FIELDS.length;
  const done = allSignaturesComplete(sigs);
  const requiredDone = SIGNATURE_FIELDS.filter(f => f.required).every(f => !!sigs[f.key]);

  const customerName = `${appointment.customer?.firstName || ''} ${appointment.customer?.lastName || ''}`.trim() || 'Customer';

  const activeOpenings = (appointment.openings || []).filter((o: any) => !o.deletedAt);
  const totalPrice = activeOpenings.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.5rem 1.5rem', maxWidth: 760, margin: '0 auto', width: '100%', overflowY: 'auto' }}>

        {/* 📄 Collapsible Order Details Summary */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', width: '100%',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowDetails(!showDetails)}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📄 Order Details Summary</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>({activeOpenings.length} openings)</span>
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 850, color: 'var(--accent)', fontSize: '0.9375rem' }}>Total: ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{showDetails ? '▲ Hide Details' : '▼ Show Details'}</span>
            </div>
          </div>

          {showDetails && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px dashed var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <div>
                  <strong>Customer:</strong> {appointment.customer?.firstName} {appointment.customer?.lastName}<br />
                  <strong>Address:</strong> {appointment.customer?.address}, {appointment.customer?.city || 'Baton Rouge'}<br />
                  <strong>Phone:</strong> {appointment.customer?.phone}
                </div>
                <div>
                  <strong>Sales Rep:</strong> {appointment.user?.name || 'npearson@winworldinfo.com'}<br />
                  <strong>Date:</strong> {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : new Date().toLocaleDateString()}<br />
                  {appointment.financingAmount > 0 && (
                    <span><strong>Financing:</strong> ${appointment.financingAmount.toLocaleString()} ({appointment.financeOptionCode || 'Standard Term'})</span>
                  )}
                </div>
              </div>

              <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <th style={{ padding: '4px' }}>#</th>
                      <th style={{ padding: '4px' }}>Location</th>
                      <th style={{ padding: '4px' }}>Size</th>
                      <th style={{ padding: '4px' }}>Description</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOpenings.map((o: any) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '5px 4px', fontWeight: 700 }}>#{o.windowNumber || o.openingNumber}</td>
                        <td style={{ padding: '5px 4px' }}>{o.roomLocation || 'Unnamed'}</td>
                        <td style={{ padding: '5px 4px' }}>{o.width}" × {o.height}"</td>
                        <td style={{ padding: '5px 4px', color: 'var(--text-muted)' }}>
                          {o.productCategory?.replace(/_/g, ' ')} • {o.interiorColor}/{o.exteriorColor}
                        </td>
                        <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 600 }}>${o.totalPrice?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Disclosure card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--border)',
          borderLeft: '5px solid var(--blue)',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.25rem',
          width: '100%',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{field.title}</div>
              {field.required && (
                <span style={{
                  fontSize: '0.6875rem',
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  fontWeight: 800,
                  border: '1px solid rgba(239,68,68,0.2)',
                  marginTop: '0.25rem',
                  display: 'inline-block'
                }}>
                  REQUIRED ACTION
                </span>
              )}
            </div>
          </div>
          <p style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
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
