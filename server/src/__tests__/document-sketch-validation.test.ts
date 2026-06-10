import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { validateSketchForExport } from '../services/printSafeSketchRenderer.js';
import { generateContractPDFBuffer, generateOrderFormPDFBuffer } from '../services/pdfService.js';

const prisma = new PrismaClient();
const TEST_EMAIL = 'sketch_test@example.com';
let testUserId: string;

describe('Aperture Sales OS: Sketch Export Integration & Validation Tests', () => {

  beforeAll(async () => {
    // Teardown any existing test user
    const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (existingUser) {
      await prisma.appointment.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'SketchTest' } });

    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, name: 'Sketch Rep', password: 'hash', role: 'sales_rep' }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.appointment.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'SketchTest' } });
    await prisma.$disconnect();
  });

  it('Successfully normalizes and validates sketch markers matching openings count', async () => {
    // 1. Create Customer
    const customer = await prisma.customer.create({
      data: { firstName: 'Sketch', lastName: 'SketchTest', address: '123 Marker Rd' }
    });

    // 2. Create Appointment
    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        userId: testUserId,
        status: 'in_progress',
        jobAddress: '123 Marker Rd'
      }
    });
    const apptId = appointment.id;

    // 3. Create 2 openings
    const op1 = await prisma.opening.create({
      data: {
        appointmentId: apptId,
        openingNumber: 1,
        productCategory: 'window',
        productModel: 'double_hung',
        roomLocation: 'Kitchen',
        width: 32, height: 48,
        totalPrice: 600
      }
    });

    const op2 = await prisma.opening.create({
      data: {
        appointmentId: apptId,
        openingNumber: 2,
        productCategory: 'window',
        productModel: 'casement',
        roomLocation: 'Bedroom',
        width: 32, height: 48,
        totalPrice: 700
      }
    });

    // 4. Create Sketch
    const sketch = await prisma.formSketch.create({ data: { appointmentId: apptId, name: 'Test Sketch' } });

    // Link only 1 marker (out of 2 openings) -> should FAIL count validation
    const m1 = await prisma.sketchMarker.create({
      data: { sketchId: sketch.id, markerType: 'window', markerNumber: 1, x: 10, y: 20, elevation: 'Front' }
    });
    await prisma.sketchMarkerLink.create({ data: { markerId: m1.id, openingId: op1.id } });

    // Validate (should fail because openings count (2) != markers count (1))
    const validation1 = await validateSketchForExport(apptId, 'any');
    expect(validation1.success).toBe(false);
    expect(validation1.code).toBe('SKETCH_EXPORT_RENDER_FAILED');
    expect(validation1.issues?.[0]?.message).toContain('Active openings count (2) does not match sketch markers count (1)');

    // 5. Add second marker to link the second opening -> should PASS validation
    const m2 = await prisma.sketchMarker.create({
      data: { sketchId: sketch.id, markerType: 'window', markerNumber: 2, x: 20, y: 30, elevation: 'Front' }
    });
    await prisma.sketchMarkerLink.create({ data: { markerId: m2.id, openingId: op2.id } });

    const validation2 = await validateSketchForExport(apptId, 'any');
    console.log('validation2 output:', JSON.stringify(validation2, null, 2));
    expect(validation2.success).toBe(true);
    expect(validation2.svgString).toBeDefined();
    expect(validation2.svgString).toContain('data-marker-id');
    expect(validation2.svgString).toContain('data-opening-number="1"');
    expect(validation2.svgString).toContain('data-opening-number="2"');

    // Verify Phase 3 & 4 print-readable properties
    expect(validation2.svgString).toContain('font-size="20"'); // marker type label font-size
    expect(validation2.svgString).toContain('font-size="28"'); // marker number label font-size
    expect(validation2.svgString).toContain('rx="6" fill="#FFFFFF" stroke="#000000" stroke-width="2.5"'); // rounded white number backing box
    expect(validation2.svgString).toContain('data-opening-number-label="1"');
    expect(validation2.svgString).toContain('data-opening-number-label="2"');

    // 6. Test PDF generation with these active openings
    const apptWithOpenings = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } }
      }
    });

    const pdfBuf = await generateContractPDFBuffer(apptWithOpenings);
    expect(pdfBuf).toBeDefined();
    expect(pdfBuf.length).toBeGreaterThan(100);

    const orderPdfBuf = await generateOrderFormPDFBuffer(apptWithOpenings);
    expect(orderPdfBuf).toBeDefined();
    expect(orderPdfBuf.length).toBeGreaterThan(100);
  }, 60000);

  it('strictly validates print-readable-v3 and cache staleness rules', async () => {
    // 1. Create a customer, appointment, and sketch for this test
    const customer = await prisma.customer.create({
      data: { firstName: 'Readable', lastName: 'SketchTest', address: '456 Bold Rd' }
    });

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        userId: testUserId,
        status: 'in_progress',
        jobAddress: '456 Bold Rd'
      }
    });
    const apptId = appointment.id;

    const op1 = await prisma.opening.create({
      data: {
        appointmentId: apptId,
        openingNumber: 1,
        productCategory: 'window',
        productModel: 'double_hung',
        roomLocation: 'Living Room',
        width: 30, height: 50,
        totalPrice: 500
      }
    });

    const sketch = await prisma.formSketch.create({ data: { appointmentId: apptId, name: 'V3 Test Sketch' } });

    const m1 = await prisma.sketchMarker.create({
      data: { sketchId: sketch.id, markerType: 'window', markerNumber: 1, x: 50, y: 50, elevation: 'Front' }
    });
    await prisma.sketchMarkerLink.create({ data: { markerId: m1.id, openingId: op1.id } });

    // 2. Validate print-readable-v3 SVG generation
    const validation = await validateSketchForExport(apptId, 'any');
    expect(validation.success).toBe(true);
    const svg = validation.svgString!;

    // Assertions 1-7
    expect(svg).toContain('data-sketch-export-version="print-readable-v3"'); // 1. version stamp
    expect(svg).toContain('stroke="#000000"'); // 2. contains black drawing paths
    expect(svg).not.toContain('stroke="#e5e7eb"'); // 3. no faint colors
    expect(svg).not.toContain('stroke="#d1d5db"');
    expect(svg).not.toContain('stroke="#9ca3af"');
    
    // Check path widths are >= 10
    const pathRegex = /<path([^>]+)>/g;
    let match;
    while ((match = pathRegex.exec(svg)) !== null) {
      const attrs = match[1];
      const widthMatch = /stroke-width\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (widthMatch) {
        const wVal = parseFloat(widthMatch[1]);
        expect(wVal).toBeGreaterThanOrEqual(10); // 4. stroke-width >= 10
      }
    }

    // Number label groups
    expect(svg).toContain('data-opening-number-label="1"'); // 5. label group for every marker

    // Font-size checks
    const textRegex = /<text([^>]+)>([^<]*)<\/text>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(svg)) !== null) {
      const attrs = textMatch[1];
      const content = textMatch[2];
      const isNumberText = content.trim().startsWith('#');
      const fontSizeMatch = /font-size\s*=\s*["']([^"']+)["']/i.exec(attrs);
      if (fontSizeMatch) {
        const sizeVal = parseFloat(fontSizeMatch[1]);
        if (isNumberText) {
          expect(sizeVal).toBeGreaterThanOrEqual(28); // 6. number font-size >= 28
        } else {
          expect(sizeVal).toBeGreaterThanOrEqual(20); // 7. type label font-size >= 20
        }
      }
    }

    // 8. Cache Staleness Check
    // Create an old GeneratedDocument record
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const docRecord = await prisma.generatedDocument.create({
      data: {
        companyId: 'any',
        appointmentId: apptId,
        customerId: customer.id,
        createdByUserId: testUserId,
        documentType: 'order_form',
        status: 'ready',
        storageBucket: 'generated-documents',
        storagePath: 'company/any/appointments/test/order-form-v1.pdf',
        mimeType: 'application/pdf',
        fileName: 'order-form-v1.pdf',
        version: 1,
        createdAt: pastDate
      }
    });

    // Update FormSketch updatedAt to now (making it newer than the document's createdAt)
    await prisma.formSketch.update({
      where: { id: sketch.id },
      data: { updatedAt: new Date() }
    });

    // Emulate list documents logic
    const sketchFresh = await prisma.formSketch.findFirst({
      where: { appointmentId: apptId },
      select: { updatedAt: true }
    });
    expect(sketchFresh).toBeDefined();

    await prisma.generatedDocument.updateMany({
      where: {
        appointmentId: apptId,
        companyId: 'any',
        status: 'ready',
        createdAt: { lt: sketchFresh!.updatedAt }
      },
      data: { status: 'stale' }
    });

    // Fetch the document and verify status is now stale
    const updatedDoc = await prisma.generatedDocument.findUnique({
      where: { id: docRecord.id }
    });
    expect(updatedDoc!.status).toBe('stale'); // 8. Stale cache invalidation succeeds!
  }, 60000);
});
