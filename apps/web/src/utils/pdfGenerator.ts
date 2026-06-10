import { toast } from '../components/Toast';
import { logError } from './productionGuards';
import { saveLocalFile } from './localFileSaver';

export async function generateContractPDF(appointment: any) {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let y = 20;

    const c = appointment.customer || {};
    // Include ALL openings (including unpriced $0) for removal count
    const allOpenings = appointment.openings || [];
    // Only priced openings for the schedule and money totals
    const openings = allOpenings.filter((o: any) => (o.totalPrice || 0) > 0);

    // ── Compute totals directly from openings (never trust stale DB fields) ──
    const subtotal = openings.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
    const total = subtotal;                        // No tax — Window World does not charge sales tax
    const deposit = Math.max(0, appointment.depositAmount || 0);
    const balance = Math.max(0, total - deposit);

    // Removal count = all openings (every window installed = one window removed)
    const totalWindowCount = allOpenings.length;
    const removalCount = totalWindowCount; // 1-for-1: every new window replaces one old window

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

    // ── Header ──
    doc.setFontSize(18);
    doc.text('Window World — Contract / Order Form', 14, y); y += 12;

    doc.setFontSize(10);
    doc.text(`Customer: ${c.firstName || ''} ${c.lastName || ''}`, 14, y); y += 5;
    doc.text(`Phone: ${c.phone || 'N/A'}  |  Email: ${c.email || 'N/A'}`, 14, y); y += 5;
    doc.text(`Job Address: ${appointment.jobAddress || 'N/A'}`, 14, y); y += 5;
    doc.text(`Date: ${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}`, 14, y); y += 5;
    let estimatorEmail = appointment?.user?.email || 'npearson@winworldinfo.com';
    if (estimatorEmail === 'nedpearson@gmail.com' || estimatorEmail === 'gpearson@winworldinfo.com') {
      estimatorEmail = 'npearson@winworldinfo.com';
    }
    doc.text(`Sales Rep: ${estimatorEmail}`, 14, y);
    y += 10;

    // ── Window Summary ──
    doc.setFontSize(12);
    doc.text('Summary', 14, y); y += 7;
    doc.setFontSize(9);
    doc.text(`Total Windows to Install:  ${totalWindowCount}`, 14, y); y += 5;
    doc.text(`Total Windows to Remove:   ${removalCount}`, 14, y); y += 5;
    // Break out removal by type
    const byType: Record<string, number> = {};
    for (const o of allOpenings) {
      const rem = (o.removalType || 'standard').toLowerCase();
      const label =
        rem === 'storm' ? 'Storm' :
        rem === 'steel' ? 'Steel' :
        rem === 'none' || rem === 'no_removal' ? 'No Removal' :
        'Aluminum/Standard';
      byType[label] = (byType[label] || 0) + 1;
    }
    for (const [label, count] of Object.entries(byType)) {
      doc.text(`   • ${label}: ${count}`, 14, y); y += 4;
    }
    y += 5;

    // ── Opening Schedule ──
    doc.setFontSize(12);
    doc.text('Opening Schedule', 14, y); y += 7;
    doc.setFontSize(7);
    doc.text('#   Room             Elev    W×H        UI    Product           Series          Price', 14, y); y += 5;
    doc.setLineWidth(0.1);
    doc.line(14, y, 200, y); y += 3;

    openings.forEach((o: any) => {
      if (y > 265) { doc.addPage(); y = 20; }
      const line = [
        String(o.openingNumber || '').padEnd(4),
        (o.roomLocation || '').slice(0, 17).padEnd(17),
        (o.elevation || '').slice(0, 7).padEnd(7),
        `${o.width || 0}"×${o.height || 0}"`.padEnd(11),
        String(o.unitedInches || 0).padEnd(6),
        (o.productCategory || '').replace(/_/g, ' ').slice(0, 16).padEnd(16),
        (o.seriesModel || '').slice(0, 14).padEnd(14),
        fmt(o.totalPrice || 0),
      ].join('');
      doc.text(line, 14, y); y += 4;

      // Extra notes for special types
      if (o.oriel || o.productCategory === 'oriel') {
        doc.text(`      → Oriel: ${o.orielType || 'Standard'}, Upper Sash H: ${o.orielUpperSashHeight || '?'}"`, 14, y); y += 4;
      } else if (o.productCategory === 'special_shape') {
        doc.text(`      → Shape: ${o.shapeType || '?'}, Orientation: ${o.shapeOrientation || 'N/A'}`, 14, y); y += 4;
      }
      if (o.gridPattern && o.gridPattern !== 'None') {
        const sdl = o.gridProfile === 'SDL' ? `SDL ${o.sdlSize || '?'}` : (o.gridProfile || '');
        doc.text(`      → Grid: ${o.gridPattern}, ${sdl}, ${o.gridVerticalCount || 0}V×${o.gridHorizontalCount || 0}H`, 14, y); y += 4;
      }
      if (o.removalType && o.removalType !== 'ALUM' && o.removalType !== 'full_tearout') {
        doc.text(`      → Removal: ${o.removalType}`, 14, y); y += 4;
      }
    });

    // ── Pricing Summary ──
    y += 6;
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setLineWidth(0.1);
    doc.line(14, y, 200, y); y += 5;

    doc.setFontSize(10);
    doc.text(`Subtotal (${openings.length} window${openings.length !== 1 ? 's' : ''}):`, 130, y);
    doc.text(fmt(subtotal), 168, y, { align: 'right' }); y += 6;

    doc.text('Tax:', 130, y);
    doc.text('$0.00  (tax-exempt)', 168, y, { align: 'right' }); y += 6;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 130, y);
    doc.text(fmt(total), 168, y, { align: 'right' }); y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (deposit > 0) {
      doc.text('Deposit:', 130, y);
      doc.text(fmt(deposit), 168, y, { align: 'right' }); y += 6;
      doc.text('Balance Due:', 130, y);
      doc.text(fmt(balance), 168, y, { align: 'right' }); y += 6;
    }

    // ── Signatures ──
    y += 10;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text('Customer Signature: ________________________________  Date: ____________', 14, y); y += 10;
    doc.text('Estimator Signature: _______________________________  Date: ____________', 14, y);

    const blob = doc.output('blob');
    await saveLocalFile(blob, `${c.lastName || 'Unknown'}_${c.firstName || ''}_Contract.pdf`, 'application/pdf', 'pdf');
  } catch (err: any) {
    toast.error('PDF export failed: ' + (err.message || 'Unknown error'));
    logError({
      level: 'error', category: 'pdf',
      message: `PDF export failed: ${err.message}`,
      technicalDetail: err?.stack,
      appointmentId: appointment?.id,
    });
  }
}
