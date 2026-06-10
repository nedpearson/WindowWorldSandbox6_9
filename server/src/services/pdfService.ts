import { jsPDF } from 'jspdf';
import { prisma } from '../index.js';
import fs from 'fs';
import { WINDOW_WORLD_SALES_EMAIL } from '../config/constants.js';

/** Embed sketch image into jsPDF document.
 * Returns the height consumed (y offset to add after sketch box).
 */
function embedSketchInPDF(
  doc: jsPDF,
  sketchImagePath: string | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number
): number {
  if (sketchImagePath && fs.existsSync(sketchImagePath)) {
    try {
      const imgData = fs.readFileSync(sketchImagePath);
      const b64 = imgData.toString('base64');
      // Fit image aspect-ratio inside the box
      // 800x500 is our generated size
      const srcW = 800, srcH = 500;
      const scale = Math.min(maxW / srcW, maxH / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const offsetX = x + (maxW - drawW) / 2;
      doc.addImage(`data:image/png;base64,${b64}`, 'PNG', offsetX, y, drawW, drawH);
      return drawH + 6;
    } catch (err) {
      console.warn('[pdfService] Could not embed sketch image:', err);
    }
  }
  // Fallback: draw dashed border + placeholder text
  doc.setDrawColor(180, 180, 180);
  (doc as any).setLineDash([3, 3]);
  doc.rect(x, y, maxW, maxH);
  (doc as any).setLineDash([]);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('No sketch available for this appointment.', x + maxW / 2, y + maxH / 2, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  return maxH + 6;
}


export async function generateContractPDFBuffer(appointment: any, sketchImagePath?: string): Promise<Buffer> {
  const doc = new jsPDF();
  let y = 20;

  const c = appointment.customer || {};
  const allOpenings = appointment.openings || [];
  const openings = allOpenings.filter((o: any) => (o.totalPrice || 0) > 0);

  const subtotal = openings.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
  const total = subtotal;
  const deposit = Math.max(0, appointment.depositAmount || 0);
  const balance = Math.max(0, total - deposit);

  const totalWindowCount = allOpenings.length;
  const removalCount = totalWindowCount;

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  doc.setFontSize(18);
  doc.text('Window World — Contract / Order Form', 14, y); y += 12;

  // Embed sketch image if available (print-readable-final: 180x140 mm — larger for readability)
  y += embedSketchInPDF(doc, sketchImagePath, 14, y, 180, 140);

  doc.setFontSize(10);
  doc.text(`Customer: ${c.firstName || ''} ${c.lastName || ''}`, 14, y); y += 5;
  doc.text(`Phone: ${c.phone || 'N/A'}  |  Email: ${c.email || 'N/A'}`, 14, y); y += 5;
  doc.text(`Job Address: ${appointment.jobAddress || 'N/A'}`, 14, y); y += 5;
  doc.text(`Date: ${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}`, 14, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Summary', 14, y); y += 7;
  doc.setFontSize(9);
  doc.text(`Total Windows to Install:  ${totalWindowCount}`, 14, y); y += 5;
  doc.text(`Total Windows to Remove:   ${removalCount}`, 14, y); y += 5;

  const byType: Record<string, number> = {};
  for (const o of allOpenings) {
    const rem = (o.removalType || 'standard').toLowerCase();
    const label = rem === 'storm' ? 'Storm' : rem === 'steel' ? 'Steel' : rem === 'none' || rem === 'no_removal' ? 'No Removal' : 'Aluminum/Standard';
    byType[label] = (byType[label] || 0) + 1;
  }
  for (const [label, count] of Object.entries(byType)) {
    doc.text(`   • ${label}: ${count}`, 14, y); y += 4;
  }
  y += 5;

  doc.setFontSize(12);
  doc.text('Opening Schedule', 14, y); y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Headers
  doc.text('#', 14, y);
  doc.text('Room', 25, y);
  doc.text('Elev', 65, y);
  doc.text('W×H', 85, y);
  doc.text('Product', 110, y);
  doc.text('Series', 150, y);
  doc.text('Price', 196, y, { align: 'right' });
  y += 5;
  doc.setLineWidth(0.1);
  doc.line(14, y, 196, y); y += 5;

  doc.setFont('helvetica', 'normal');
  openings.forEach((o: any) => {
    if (y > 265) { doc.addPage(); y = 20; }
    
    doc.text(String(o.openingNumber || ''), 14, y);
    doc.text((o.roomLocation || '').slice(0, 18), 25, y);
    doc.text((o.elevation || '').slice(0, 8), 65, y);
    doc.text(`${o.width || 0}"×${o.height || 0}"`, 85, y);
    doc.text((o.productCategory || '').replace(/_/g, ' ').slice(0, 16), 110, y);
    doc.text((o.seriesModel || '').slice(0, 16), 150, y);
    doc.text(fmt(o.totalPrice || 0), 196, y, { align: 'right' });
    y += 5;
    
    if (o.gridPattern && o.gridPattern !== 'None') {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const sdl = o.gridProfile === 'SDL' ? `SDL ${o.sdlSize || '?'}` : (o.gridProfile || '');
      doc.text(`→ Grid: ${o.gridPattern}, ${sdl}, ${o.gridVerticalCount || 0}V×${o.gridHorizontalCount || 0}H`, 25, y); 
      y += 5;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    }
    y += 2; // Row gap
  });

  y += 6;
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setLineWidth(0.1);
  doc.line(14, y, 200, y); y += 5;

  doc.setFontSize(10);
  doc.text(`Subtotal (${openings.length} window${openings.length !== 1 ? 's' : ''}):`, 160, y, { align: 'right' });
  doc.text(fmt(subtotal), 195, y, { align: 'right' }); y += 6;

  doc.text('Tax:', 160, y, { align: 'right' });
  doc.text('$0.00  (tax-exempt)', 195, y, { align: 'right' }); y += 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 160, y, { align: 'right' });
  doc.text(fmt(total), 195, y, { align: 'right' }); y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (deposit > 0) {
    doc.text('Deposit:', 160, y, { align: 'right' });
    doc.text(fmt(deposit), 195, y, { align: 'right' }); y += 6;
    doc.text('Balance Due:', 160, y, { align: 'right' });
    doc.text(fmt(balance), 195, y, { align: 'right' }); y += 6;
  }

  y += 10;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(9);
  doc.text('Customer Signature: ________________________________  Date: ____________', 14, y); y += 10;
  doc.text('Estimator Signature: _______________________________  Date: ____________', 14, y);
  doc.text(`Estimator Email: ${WINDOW_WORLD_SALES_EMAIL}`, 14, y + 10);

  // Return Buffer instead of saving
  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateOrderFormPDFBuffer(appointment: any, sketchImagePath?: string): Promise<Buffer> {
  const doc = new jsPDF('l', 'pt', 'letter');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('WINDOW AND PATIO DOOR ORDER FORM', 300, 30);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const c = appointment.customer || {};

  // Left column: customer info
  doc.text(`Customer: ${c.firstName || ''} ${c.lastName || ''}`, 20, 50);
  doc.text(`Phone: ${c.phone || ''}`, 20, 65);
  doc.text(`Address: ${appointment.jobAddress || ''}`, 20, 80);

  // Right column: sketch image box (print-readable-final: x=20, y=45, w=750, h=380 pt — full width)
  const sketchConsumedH = embedSketchInPDF(doc, sketchImagePath, 20, 45, 750, 380);
  const sketchBottom = 45 + sketchConsumedH;

  // Opening table starts below the sketch bottom or min y=220
  doc.setFontSize(10);
  doc.setLineWidth(0.5);
  const tableY = Math.max(220, sketchBottom + 10);
  doc.line(20, tableY, 770, tableY);
  
  let y = tableY + 16;
  doc.setFont('helvetica', 'bold');
  doc.text('#', 20, y);
  doc.text('QTY', 45, y);
  doc.text('MODEL', 80, y);
  doc.text('W x H', 180, y);
  doc.text('ROOM', 245, y);
  doc.text('COLORS', 330, y);
  doc.text('GRIDS', 420, y);
  doc.text('GLASS', 500, y);
  doc.text('TRIM', 580, y);
  doc.text('NOTES', 660, y);
  
  doc.line(20, y + 6, 770, y + 6);
  doc.setFont('helvetica', 'normal');
  y += 24;
  
  const openings = appointment.openings || [];
  openings.forEach((o: any, idx: number) => {
    if (y > 550) {
      doc.addPage();
      y = 40;
    }
    doc.text(String(o.openingNumber || idx + 1), 20, y);
    doc.text(`${o.quantity || 1}`, 45, y);
    doc.text(`${o.seriesModel || o.productCategory || ''}`.substring(0, 18), 80, y);
    doc.text(`${o.width || ''} x ${o.height || ''}`, 180, y);
    doc.text(`${o.roomLocation || ''}`.substring(0, 15), 245, y);
    doc.text(`${o.interiorColor || 'WH'}/${o.exteriorColor || 'WH'}`, 330, y);
    doc.text(`${o.gridPattern !== 'None' ? o.gridPattern : 'None'}`, 420, y);
    doc.text(`${o.glassPackage || ''}`.substring(0, 14), 500, y);
    doc.text(`${o.exteriorType || ''}/${o.trimType || ''}`.substring(0, 14), 580, y);
    
    // Notes can be long, allow slight overlap or truncation
    const notes = String(o.installerNotes || '').substring(0, 24);
    doc.text(notes, 660, y);
    y += 18;
  });
  
  return Buffer.from(doc.output('arraybuffer'));
}
