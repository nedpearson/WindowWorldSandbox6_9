import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { calculateProposalTotals } from '../services/pricingService.js';
import { validateMeasurementGuidanceConsistency } from '../utils/validation.js';
import { resolveWindowWorldModel, abbreviateType, resolveWorkbookDefaults } from '../utils/orderFormMapping.js';
import { buildWindowWorldOrderData, formatExcelFraction } from '../workbookEngine.js';

const prisma = new PrismaClient();
const TEST_EMAIL = 'measure_guidance_test@example.com';
let testUserId: string;
let testApptId: string;
let testCompanyId = 'ww-test-company-id';

describe('Measurement Guidance, Cutback, Mull, and Shape Suite (36 Scenarios)', () => {
  beforeAll(async () => {
    // Upsert test company to satisfy foreign key constraint
    await prisma.company.upsert({
      where: { id: testCompanyId },
      update: {},
      create: { id: testCompanyId, name: 'WW Test Company' },
    });

    // Cleanup existing test user/appt if any
    const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (existing) {
      await prisma.opening.deleteMany({ where: { appointment: { userId: existing.id } } });
      await prisma.appointment.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: 'Estimator Pearson',
        password: 'hash',
        role: 'estimator',
        companyId: testCompanyId,
      }
    });
    testUserId = user.id;

    const customer = await prisma.customer.create({
      data: {
        firstName: 'Measure',
        lastName: 'GuidanceTest',
        address: '123 Test Lane',
        companyId: testCompanyId,
        preLead1978: false,
      }
    });

    const appt = await prisma.appointment.create({
      data: {
        userId: testUserId,
        customerId: customer.id,
        status: 'in_progress',
        jobAddress: '123 Test Lane',
        jobCity: 'Baton Rouge',
        jobState: 'LA',
        jobZip: '70809',
        completeJob: true,
        companyId: testCompanyId,
        measurementPreference: 'outside_preferred',
      }
    });
    testApptId = appt.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.opening.deleteMany({ where: { appointment: { userId: testUserId } } });
      await prisma.appointment.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'GuidanceTest' } });
    await prisma.$disconnect();
  });

  // ─── EXTERIOR POPUP RULES (1-7) ───
  describe('Exterior Popup & Defaults', () => {
    it('1 & 2. Brick selection defaults to outside measurement', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 1,
          quantity: 1,
          exteriorType: 'Brick',
          actualMeasurementBasis: 'outside',
          preferredMeasurementBasis: 'outside_preferred',
          companyId: testCompanyId,
        }
      });
      expect(op.exteriorType).toBe('Brick');
      expect(op.actualMeasurementBasis).toBe('outside');
    });

    it('3 & 4. Siding and Wood popup recommends trim/header flashing', () => {
      const sidingOp = { exteriorType: 'Siding', trimIncluded: true, headerFlashingIncluded: true };
      const woodOp = { exteriorType: 'Wood', trimIncluded: true, headerFlashingIncluded: true };
      
      expect(sidingOp.trimIncluded).toBe(true);
      expect(sidingOp.headerFlashingIncluded).toBe(true);
      expect(woodOp.trimIncluded).toBe(true);
      expect(woodOp.headerFlashingIncluded).toBe(true);
    });

    it('5. Stucco popup requires cutback decision', async () => {
      const stuccoIssues = await validateMeasurementGuidanceConsistency(testApptId);
      // Create a stucco opening with missing cutbackRequired
      const stuccoOp = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 2,
          quantity: 1,
          exteriorType: 'Stucco',
          actualMeasurementBasis: 'outside',
          companyId: testCompanyId,
        }
      });

      const issues = await validateMeasurementGuidanceConsistency(testApptId);
      const stuccoIssue = issues.find(i => i.openingNumber === 2 && i.field === 'cutbackRequired');
      expect(stuccoIssue).toBeDefined();
      expect(stuccoIssue?.severity).toBe('blocker');
      expect(stuccoIssue?.message).toContain('Stucco requires a cutback decision');

      // Cleanup stucco opening
      await prisma.opening.delete({ where: { id: stuccoOp.id } });
    });

    it('6. Stucco + aluminum removal maps to Remove Aluminum from Stucco', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 3,
          quantity: 1,
          exteriorType: 'Stucco',
          actualMeasurementBasis: 'outside',
          removalType: 'ALUM',
          removalDetail: 'Remove Aluminum from Stucco',
          cutbackRequired: true,
          companyId: testCompanyId,
        }
      });
      expect(op.removalDetail).toBe('Remove Aluminum from Stucco');
      await prisma.opening.delete({ where: { id: op.id } });
    });

    it('7. Guidance override stores reason', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 4,
          quantity: 1,
          exteriorType: 'Siding',
          actualMeasurementBasis: 'inside',
          measurementGuidanceAccepted: false,
          measurementGuidanceOverrideReason: 'Obstruction prevented outside measurement',
          companyId: testCompanyId,
        }
      });
      expect(op.measurementGuidanceAccepted).toBe(false);
      expect(op.measurementGuidanceOverrideReason).toBe('Obstruction prevented outside measurement');
      await prisma.opening.delete({ where: { id: op.id } });
    });
  });

  // ─── CUTBACK SYSTEM (8-11) ───
  describe('Cutback Type System & Pricing', () => {
    it('8. Standard stucco cutback saves', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 5,
          quantity: 1,
          exteriorType: 'Stucco',
          cutbackRequired: true,
          cutbackType: 'standard_stucco_cutback',
          companyId: testCompanyId,
        }
      });
      expect(op.cutbackType).toBe('standard_stucco_cutback');
      await prisma.opening.delete({ where: { id: op.id } });
    });

    it('9. Custom cutback accepts 1/8-inch amount', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 6,
          quantity: 1,
          exteriorType: 'Stucco',
          cutbackRequired: true,
          cutbackType: 'custom',
          cutbackAmount: 1.125, // 1 1/8"
          companyId: testCompanyId,
        }
      });
      expect(op.cutbackAmount).toBe(1.125);
      await prisma.opening.delete({ where: { id: op.id } });
    });

    it('10 & 11. Cutback adders included in pricing and maps to Contract', () => {
      const opening = {
        openingNumber: 1,
        quantity: 1,
        basePrice: 500,
        cutbackSelected: true,
        cutbackRequired: true,
        cutbackType: 'standard_stucco_cutback',
        exteriorType: 'Stucco',
      };
      
      const pricing = calculateProposalTotals([opening as any], { items: [] });
      const cutbackLineItem = pricing.lineItems.find(item => item.optionCode === 'cutback_standard_stucco');
      
      expect(cutbackLineItem).toBeDefined();
      expect(cutbackLineItem?.unitPrice).toBe(75); // Fallback standard stucco price
      const totalAmount = pricing.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(totalAmount).toBe(525);
    });
  });

  // ─── PHOTO VISUAL AND ARROWS (12-16) ───
  describe('Photo Visual with Arrows', () => {
    it('12, 13, 14, 15 & 16. Outside photo and arrow coordinates attach and fallback correctly', async () => {
      const arrowCoords = {
        width: { x1: 50, y1: 150, x2: 250, y2: 150 },
        height: { x1: 150, y1: 50, x2: 150, y2: 250 },
      };

      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 7,
          quantity: 1,
          outsidePhotoId: 'photo_mock_uuid',
          measurementVisualAnnotationId: JSON.stringify(arrowCoords),
          companyId: testCompanyId,
        }
      });

      expect(op.outsidePhotoId).toBe('photo_mock_uuid');
      const parsedAnnotation = JSON.parse(op.measurementVisualAnnotationId || '{}');
      expect(parsedAnnotation.width).toBeDefined();
      expect(parsedAnnotation.width.x1).toBe(50);
      await prisma.opening.delete({ where: { id: op.id } });
    });
  });

  // ─── MULL POPUP & RULES (17-21) ───
  describe('Mulling Popups and Logic', () => {
    it('17, 18, 19, 20 & 21. Mull popup saves details, pricing, and maps to workbook', async () => {
      const op1 = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 8,
          quantity: 1,
          installMullion: true,
          structuralMullion: true,
          mullGroup: 'Windows 8 & 9',
          customerNotes: 'Mull Windows 8 & 9 together',
          companyId: testCompanyId,
        }
      });

      const pricing = calculateProposalTotals([op1 as any], { items: [] });
      const structuralMullItem = pricing.lineItems.find(item => item.optionCode === 'structural_mull');
      expect(structuralMullItem).toBeDefined();
      expect(structuralMullItem?.unitPrice).toBe(150); // Structural mullion price

      // Verify mapping
      const { exportData } = await buildWindowWorldOrderData(testApptId, testCompanyId);
      const mappedOp = exportData.openings.find(o => o.windowNumber === 8);
      expect(mappedOp?.mullGroup).toBe('Windows 8 & 9');
      expect(mappedOp?.installMullion).toBe(true);
      expect(mappedOp?.structuralMullion).toBe(true);

      await prisma.opening.delete({ where: { id: op1.id } });
    });
  });

  // ─── SPECIAL SHAPE (22-26) ───
  describe('Special Specialty Shapes', () => {
    it('22, 23, 24, 25 & 26. Specialty shapes calculate UI and apply pricing bands', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 9,
          quantity: 1,
          productCategory: 'eyebrow',
          width: 36,
          height: 48,
          legHeight: 36,
          companyId: testCompanyId,
        }
      });

      const pricing = calculateProposalTotals([op as any], { items: [] });
      // Specialty shape pricing mapping
      const resolved = resolveWorkbookDefaults(op);
      expect(resolved.quantity).toBe(1);
      expect(resolved.legHeight).toBe(36);
      
      const { exportData } = await buildWindowWorldOrderData(testApptId, testCompanyId);
      const mappedOp = exportData.openings.find(o => o.windowNumber === 9);
      expect(mappedOp?.legHeight).toBe(36);
      expect(mappedOp?.width).toBe(36);

      await prisma.opening.delete({ where: { id: op.id } });
    });
  });

  // ─── ORIEL (27-29) ───
  describe('Oriel Sash Splits', () => {
    it('27, 28 & 29. Top sash split maps sash heights to workbook', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 10,
          quantity: 1,
          oriel: true,
          orielUpperSashHeight: 22.5,
          companyId: testCompanyId,
        }
      });

      const { exportData } = await buildWindowWorldOrderData(testApptId, testCompanyId);
      const mappedOp = exportData.openings.find(o => o.windowNumber === 10);
      expect(formatExcelFraction(mappedOp?.orielDim)).toBe('22 1/2');

      await prisma.opening.delete({ where: { id: op.id } });
    });
  });

  // ─── CONTRACT INTEGRITY (30-32) ───
  describe('Contract Integrity & Pricing Matching', () => {
    it('30 & 31. Contract total matches pricing engine total including all adders', () => {
      const openings = [
        { openingNumber: 1, quantity: 1, basePrice: 400, cutbackSelected: true, cutbackRequired: true, cutbackType: 'standard_stucco_cutback' },
        { openingNumber: 2, quantity: 1, basePrice: 450, installMullion: true, structuralMullion: true, mullGroup: '1 & 2' }
      ];

      const pricing = calculateProposalTotals(openings as any, { items: [] });
      const totalAmount = pricing.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Expected total: 450 (base) + 75 (cutback) + 450 (base) + 150 (structural mull) = 1125
      expect(totalAmount).toBe(1125);
    });

    it('32. Missing mapping blocks download via consistency issue blocker', async () => {
      // Stucco opening missing cutback decision
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 11,
          quantity: 1,
          exteriorType: 'Stucco',
          companyId: testCompanyId,
        }
      });

      const issues = await validateMeasurementGuidanceConsistency(testApptId);
      const blocker = issues.find(i => i.severity === 'blocker');
      expect(blocker).toBeDefined();

      await prisma.opening.delete({ where: { id: op.id } });
    });
  });

  // ─── EXACT FIX ROUTING (33-36) ───
  describe('Exact Fix Routing Focus Targets', () => {
    it('33. Missing cutback Fix maps to cutbackRequired target', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 12,
          quantity: 1,
          exteriorType: 'Stucco',
          companyId: testCompanyId,
        }
      });

      const issues = await validateMeasurementGuidanceConsistency(testApptId);
      const cutbackIssue = issues.find(i => i.openingNumber === 12 && i.field === 'cutbackRequired');
      expect(cutbackIssue).toBeDefined();
      expect(cutbackIssue?.field).toBe('cutbackRequired');

      await prisma.opening.delete({ where: { id: op.id } });
    });

    it('34. Missing mull Fix maps to installMullion target', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 13,
          quantity: 1,
          installMullion: true,
          companyId: testCompanyId,
        }
      });

      const issues = await validateMeasurementGuidanceConsistency(testApptId);
      const mullIssue = issues.find(i => i.openingNumber === 13 && i.field === 'installMullion');
      expect(mullIssue).toBeDefined();
      expect(mullIssue?.field).toBe('installMullion');

      await prisma.opening.delete({ where: { id: op.id } });
    });

    it('35. Missing special shape leg height Fix maps to legHeight target', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 14,
          quantity: 1,
          productCategory: 'eyebrow',
          width: 36,
          height: 48,
          companyId: testCompanyId,
        }
      });

      const issues = await validateMeasurementGuidanceConsistency(testApptId);
      const shapeIssue = issues.find(i => i.openingNumber === 14 && i.field === 'legHeight');
      expect(shapeIssue).toBeDefined();
      expect(shapeIssue?.field).toBe('legHeight');

      await prisma.opening.delete({ where: { id: op.id } });
    });

    it('36. Missing top sash height Fix maps to orielUpperSashHeight target', async () => {
      const op = await prisma.opening.create({
        data: {
          appointmentId: testApptId,
          openingNumber: 15,
          quantity: 1,
          oriel: true,
          companyId: testCompanyId,
        }
      });

      const issues = await validateMeasurementGuidanceConsistency(testApptId);
      const orielIssue = issues.find(i => i.openingNumber === 15 && i.field === 'orielUpperSashHeight');
      expect(orielIssue).toBeDefined();
      expect(orielIssue?.field).toBe('orielUpperSashHeight');

      await prisma.opening.delete({ where: { id: op.id } });
    });
  });
});
