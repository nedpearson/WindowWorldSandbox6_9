import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_USER_EMAIL = 'stress_tester@example.com';
let testUserId: string;

describe('Aperture Sales OS: Database & Architecture Stress Test', () => {

  beforeAll(async () => {
    // Clean up any previous failed test runs
    const existingUser = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
    if (existingUser) {
      await prisma.appointment.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }
    await prisma.customer.deleteMany({ where: { lastName: { in: ['Job', 'Audit'] } } });

    // Create isolated test user
    const user = await prisma.user.create({
      data: {
        email: TEST_USER_EMAIL,
        name: 'Automated Stress Tester',
        password: 'hash', // mock
        role: 'sales_rep',
      }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Teardown: delete appointments first to respect FK, then user, then customers
    if (testUserId) {
      await prisma.appointment.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.customer.deleteMany({ where: { lastName: { in: ['Job', 'Audit'] } } });
    await prisma.$disconnect();
  });

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Standard 10-Window Job (Mapping & Hierarchy Verification)
  // ────────────────────────────────────────────────────────────────────────
  it('Scenario 1: Creates a 10-window job and verifies Source of Truth hierarchy mappings', async () => {
    // 1. Customer
    const customer = await prisma.customer.create({
      data: { firstName: 'Standard', lastName: 'Job', phone: '555-0001' }
    });

    // 2. Appointment (Project)
    const appointment = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId, status: 'draft' }
    });

    // 3. Sketch Map
    const sketch = await prisma.formSketch.create({
      data: { appointmentId: appointment.id, name: 'Main House' }
    });

    // 4. Generate 10 Openings + Markers + Links
    for (let i = 1; i <= 10; i++) {
      const opening = await prisma.opening.create({
        data: {
          appointmentId: appointment.id,
          openingNumber: i,
          width: 35.5,
          height: 59.5,
          roomLocation: i <= 5 ? 'Living Room' : 'Bedroom',
          elevation: i <= 5 ? 'Front' : 'Rear',
          productCategory: 'window',
          productModel: 'double_hung',
        }
      });

      const marker = await prisma.sketchMarker.create({
        data: {
          sketchId: sketch.id,
          markerType: 'window',
          markerNumber: i,
          x: i * 10,
          y: 50,
        }
      });

      await prisma.sketchMarkerLink.create({
        data: { markerId: marker.id, openingId: opening.id }
      });
    }

    // Verify Hierarchy Mappings
    const savedAppt = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        openings: true,
        formSketches: { include: { markers: { include: { links: true } } } }
      }
    });

    expect(savedAppt).toBeDefined();
    expect(savedAppt?.openings.length).toBe(10);
    expect(savedAppt?.formSketches[0].markers.length).toBe(10);
    expect(savedAppt?.formSketches[0].markers[0].links[0].openingId).toBeDefined();
  }, 30000);

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Large 50-Opening Job (Stress Test & Performance)
  // ────────────────────────────────────────────────────────────────────────
  it('Scenario 2: Handles 50 openings rapidly without timeouts or disconnected mapping', async () => {
    const customer = await prisma.customer.create({
      data: { firstName: 'Mansion', lastName: 'Job', phone: '555-0002' }
    });
    const appointment = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId }
    });

    const openingsData = Array.from({ length: 50 }).map((_, i) => ({
      appointmentId: appointment.id,
      openingNumber: i + 1,
      width: 40,
      height: 60,
      productCategory: 'window'
    }));

    // Stress test bulk creation
    const startTime = Date.now();
    await prisma.opening.createMany({ data: openingsData });
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(2000); // Should insert 50 records in under 2s

    const count = await prisma.opening.count({ where: { appointmentId: appointment.id } });
    expect(count).toBe(50);
  });

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Mixed Windows + Doors + Siding (Category Segmentation)
  // ────────────────────────────────────────────────────────────────────────
  it('Scenario 3: Maps Windows, Doors, and Siding correctly under a single appointment', async () => {
    const customer = await prisma.customer.create({
      data: { firstName: 'Mixed', lastName: 'Job', phone: '555-0003' }
    });
    const appointment = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId }
    });

    await prisma.opening.create({ data: { appointmentId: appointment.id, openingNumber: 1, productCategory: 'window' } });
    await prisma.opening.create({ data: { appointmentId: appointment.id, openingNumber: 2, productCategory: 'door', exteriorType: 'Steel' } });
    await prisma.opening.create({ data: { appointmentId: appointment.id, openingNumber: 3, productCategory: 'siding', exteriorType: 'Vinyl' } });

    const openings = await prisma.opening.findMany({ where: { appointmentId: appointment.id } });
    expect(openings.filter(o => o.productCategory === 'window').length).toBe(1);
    expect(openings.filter(o => o.productCategory === 'door').length).toBe(1);
    expect(openings.filter(o => o.productCategory === 'siding').length).toBe(1);
  });

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 5/6: Specialty Shapes & Eyebrows (Measurement Validity)
  // ────────────────────────────────────────────────────────────────────────
  it('Scenario 5 & 6: Stores custom radii and extended legs for specialty geometry', async () => {
    const customer = await prisma.customer.create({
      data: { firstName: 'Specialty', lastName: 'Job', phone: '555-0005' }
    });
    const appointment = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId }
    });

    const specialty = await prisma.opening.create({
      data: {
        appointmentId: appointment.id,
        openingNumber: 1,
        productCategory: 'window',
        productModel: 'special_shape',
        width: 72,
        height: 48,
        radius: 36,
        legHeight: 24
      }
    });

    expect(specialty.radius).toBe(36);
    expect(specialty.legHeight).toBe(24);
  });

  // ────────────────────────────────────────────────────────────────────────
  // SCENARIO 13/14: Proposal + Signature + Contract Export (Final Workflow)
  // ────────────────────────────────────────────────────────────────────────
  it('Scenario 13 & 14: Finalizes proposal, tracks signature, and cascades contract generation', async () => {
    const customer = await prisma.customer.create({
      data: { firstName: 'Contract', lastName: 'Job', phone: '555-0013' }
    });
    const appointment = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId, status: 'sold', totalAmount: 12500 }
    });

    // Signature
    const signature = await prisma.signature.create({
      data: { appointmentId: appointment.id, signerName: 'John Doe', signerRole: 'Customer', signatureData: 'base64:blob' }
    });

    // Payment Deposit
    const payment = await prisma.payment.create({
      data: { appointmentId: appointment.id, amount: 6250, method: 'Check' }
    });

    // Contract
    const contract = await prisma.contract.create({
      data: { appointmentId: appointment.id, status: 'generated', formData: '{"mapped":"true"}' }
    });

    // Verify relations
    const finalAppt = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: { signatures: true, payments: true, contracts: true }
    });

    expect(finalAppt?.signatures[0].id).toBe(signature.id);
    expect(finalAppt?.payments[0].amount).toBe(6250);
    expect(finalAppt?.contracts[0].status).toBe('generated');
  });

  // ────────────────────────────────────────────────────────────────────────
  // CASCADE & ORPHAN PREVENTION TEST
  // ────────────────────────────────────────────────────────────────────────
  it('Orphan Audit: Verifies deleting an Appointment destroys all child dependencies', async () => {
    const customer = await prisma.customer.create({
      data: { firstName: 'Orphan', lastName: 'Audit', phone: '555-9999' }
    });
    const appointment = await prisma.appointment.create({
      data: { customerId: customer.id, userId: testUserId }
    });

    // Create deep children
    const sketch = await prisma.formSketch.create({ data: { appointmentId: appointment.id } });
    const marker = await prisma.sketchMarker.create({ data: { sketchId: sketch.id, markerType: 'window', x: 0, y: 0 } });
    const opening = await prisma.opening.create({ data: { appointmentId: appointment.id, openingNumber: 1 } });
    await prisma.sketchMarkerLink.create({ data: { markerId: marker.id, openingId: opening.id } });
    await prisma.quoteLineItem.create({ data: { appointmentId: appointment.id, label: 'Window', category: 'product' }});

    // DELETE Appointment
    await prisma.appointment.delete({ where: { id: appointment.id } });

    // Assert ALL children are gone (Cascade Success)
    const sketchCount = await prisma.formSketch.count({ where: { appointmentId: appointment.id } });
    const markerCount = await prisma.sketchMarker.count({ where: { sketchId: sketch.id } });
    const openingCount = await prisma.opening.count({ where: { appointmentId: appointment.id } });
    const lineItemCount = await prisma.quoteLineItem.count({ where: { appointmentId: appointment.id } });
    const linkCount = await prisma.sketchMarkerLink.count({ where: { markerId: marker.id } });

    expect(sketchCount).toBe(0);
    expect(markerCount).toBe(0);
    expect(openingCount).toBe(0);
    expect(lineItemCount).toBe(0);
    expect(linkCount).toBe(0);
  }, 30000);

});
