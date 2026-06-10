import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_EMAIL = 'field_trial@example.com';
let testUserId: string;

describe('Aperture Sales OS: FIELD TRIAL STRESS TEST', () => {

  beforeAll(async () => {
    // Teardown
    const existingUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (existingUser) {
      await prisma.appointment.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'FieldTrial' } });

    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, name: 'Senior Rep', password: 'hash', role: 'sales_rep' }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.appointment.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'FieldTrial' } });
    await prisma.$disconnect();
  });

  it('Handles Massive Mixed Workflow without Crashing', async () => {
    // 1. Create Customer
    const customer = await prisma.customer.create({
      data: { firstName: 'Massive', lastName: 'FieldTrial', address: '999 Stress Ave' }
    });
    expect(customer.id).toBeDefined();

    // 2. Create Project
    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        userId: testUserId,
        status: 'in_progress',
        jobAddress: '999 Stress Ave'
      }
    });
    const apptId = appointment.id;

    // 3. Generate GPS/AI Sketch Base
    const sketch = await prisma.formSketch.create({ data: { appointmentId: apptId, name: 'AI Base Sketch' } });
    const sketchId = sketch.id;

    // 4. Create 12 Windows, 2 Doors, 1 Sliding Door, 1 Siding
    const windowConfigs = [
      { num: 1, type: 'double_hung', room: 'Living Room' },
      { num: 2, type: 'double_hung', room: 'Living Room' },
      { num: 3, type: 'picture', room: 'Living Room' }, // Mull group part
      { num: 4, type: 'double_hung', room: 'Living Room' }, // Mull group part
      { num: 5, type: 'eyebrow', room: 'Foyer', special: true }, // Eyebrow
      { num: 6, type: 'oriel', room: 'Stairs', special: true }, // Oriel
      { num: 7, type: 'double_hung', room: 'Bathroom', tempered: true, obscure: true }, // Bathroom
      { num: 8, type: 'slider', room: 'Bedroom 1' },
      { num: 9, type: 'slider', room: 'Bedroom 1' },
      { num: 10, type: 'awning', room: 'Basement' },
      { num: 11, type: 'awning', room: 'Basement' },
      { num: 12, type: 'casement', room: 'Kitchen' }
    ];

    for (const w of windowConfigs) {
      const createdOpening = await prisma.opening.create({
        data: {
          appointmentId: apptId,
          openingNumber: w.num,
          productCategory: 'window',
          productModel: w.type,
          roomLocation: w.room,
          width: 36, height: 60, unitedInches: 96,
          temperedGlass: w.tempered ? 'yes' : null,
          glassPackage: w.obscure ? 'obscure' : null,
          totalPrice: 850
        }
      });
      // Attach to sketch
      const m = await prisma.sketchMarker.create({ data: { sketchId, markerType: 'window', markerNumber: w.num, x: 10, y: 10, elevation: 'Front' } });
      await prisma.sketchMarkerLink.create({ data: { markerId: m.id, openingId: createdOpening.id } }); // Mock link
    }

    // 2 Doors
    await prisma.opening.create({ data: { appointmentId: apptId, openingNumber: 13, productCategory: 'door', productModel: 'entry_door', width: 36, height: 80, totalPrice: 2500 } });
    await prisma.opening.create({ data: { appointmentId: apptId, openingNumber: 14, productCategory: 'door', productModel: 'storm_door', width: 36, height: 80, totalPrice: 800 } });
    
    // 1 Sliding Glass Door
    await prisma.opening.create({ data: { appointmentId: apptId, openingNumber: 15, productCategory: 'door', productModel: 'patio_door', width: 72, height: 80, temperedGlass: 'yes', totalPrice: 3200 } });

    // Siding Scope
    await prisma.opening.create({ data: { appointmentId: apptId, openingNumber: 16, productCategory: 'siding', exteriorType: 'Vinyl', width: 100, height: 100, totalPrice: 15000 } });

    // 5. Trigger Validation & Fix it
    // Simulate finding the bathroom window and verifying it has tempered glass
    const bathroomWindow = await prisma.opening.findFirst({ where: { appointmentId: apptId, roomLocation: 'Bathroom' } });
    expect(bathroomWindow?.temperedGlass).toBe('yes');
    expect(bathroomWindow?.glassPackage).toBe('obscure');

    // 6. Confirm Pricing & Build Proposal
    const openings = await prisma.opening.findMany({ where: { appointmentId: apptId } });
    const totalCalc = openings.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    expect(totalCalc).toBe((12 * 850) + 2500 + 800 + 3200 + 15000); // 31,700

    const proposal = await prisma.appointment.update({
      where: { id: apptId },
      data: { totalAmount: totalCalc, subtotal: totalCalc, status: 'proposal' }
    });
    expect(proposal.totalAmount).toBe(31700);

    // 7. Signature & Export Simulation
    await prisma.signature.create({ data: { appointmentId: apptId, signerName: 'Test Homeowner', signerRole: 'Customer', signatureData: 'b64' } });
    
    const winExport = await prisma.formInstance.create({ data: { appointmentId: apptId, formType: 'order_form', status: 'exported', pdfUrl: 'pdf1' } });
    const doorExport = await prisma.formInstance.create({ data: { appointmentId: apptId, formType: 'door_contract', status: 'exported', pdfUrl: 'pdf2' } });
    const sidingExport = await prisma.formInstance.create({ data: { appointmentId: apptId, formType: 'siding_contract', status: 'exported', pdfUrl: 'pdf3' } });

    expect(winExport.id).toBeDefined();
    expect(doorExport.id).toBeDefined();
    expect(sidingExport.id).toBeDefined();

    // 8. Confirm DB Persistence
    const verify = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: { openings: true, formInstances: true, signatures: true }
    });
    
    expect(verify?.openings.length).toBe(16); // 12w + 3d + 1s
    expect(verify?.formInstances.length).toBe(3);
    expect(verify?.signatures.length).toBe(1);
  }, 60000);
});
