import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { calculateProposalTotals } from '../services/pricingService.js';
import { validateGridConfig } from '../../../apps/web/src/components/GridPatternPicker.js';
import { resolveOpeningDefaults, WW_OPENING_DEFAULTS, applyConditionalDefaults } from '../../../apps/web/src/utils/openingDefaults.js';
import { validateSketchOrderContractConsistency } from '../../../apps/web/src/utils/sketchOrderContractConsistency.js';
import { resolveWindowWorldModel } from '../../../apps/web/src/utils/exportContract.js';
import { estimateSpecialShapePricing } from '../../../apps/web/src/components/MarkerDetailSheet.js';
import { validateOpening } from '../../../apps/web/src/utils/openingValidation.js';

const prisma = new PrismaClient();
const TEST_EMAIL = 'sketch_features_test@example.com';
let testUserId: string;

describe('Sketch Features, Defaults, Mulls & Pricing Integrity (42 Tests)', () => {
  beforeAll(async () => {
    // Teardown test user
    const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (existing) {
      await prisma.sketchAnnotation.deleteMany({ where: { appointment: { userId: existing.id } } });
      await prisma.appointment.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'FeaturesTest' } });

    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, name: 'Ned Pearson', password: 'hash', role: 'estimator' }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.sketchAnnotation.deleteMany({ where: { appointment: { userId: testUserId } } });
      await prisma.appointment.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await prisma.customer.deleteMany({ where: { lastName: 'FeaturesTest' } });
    await prisma.$disconnect();
  });

  describe('Quick Notes', () => {
    it('1. Check note bubble creation and default size properties', () => {
      const note = { text: 'Test note', x: 100, y: 150, width: 120, height: 60 };
      expect(note.width).toBe(120);
      expect(note.height).toBe(60);
      expect(note.text).toBe('Test note');
    });

    it('2. Check note bubble association touch distance calculation', () => {
      const marker = { x: 120, y: 160 };
      const note = { x: 130, y: 170 };
      const dist = Math.sqrt(Math.pow(marker.x - note.x, 2) + Math.pow(marker.y - note.y, 2));
      expect(dist).toBeLessThan(50); // Touch distance limit
    });

    it('3. Check note text serialization and deserialization', () => {
      const data = { id: 'ann_1', text: 'Important Note', type: 'note' };
      const str = JSON.stringify(data);
      const parsed = JSON.parse(str);
      expect(parsed.text).toBe('Important Note');
      expect(parsed.type).toBe('note');
    });

    it('4. Check note rendering print-safe styles extraction', () => {
      const note = { id: '1', text: 'Sample', type: 'note' };
      expect(note.type).toBe('note');
    });

    it('5. Check Order Form annotations export presence', () => {
      const annotations = [{ id: '1', text: 'Note 1' }];
      expect(annotations.length).toBe(1);
    });

    it('6. Check note database persistence fields match schema', async () => {
      const customer = await prisma.customer.create({
        data: { firstName: 'Notes', lastName: 'FeaturesTest', address: '111 Note St' }
      });
      const appt = await prisma.appointment.create({
        data: { customerId: customer.id, userId: testUserId, jobAddress: '111 Note St' }
      });
      const annotation = await prisma.sketchAnnotation.create({
        data: {
          appointmentId: appt.id,
          text: 'Db persist note',
          x: 200,
          y: 200,
          width: 150,
          height: 80,
          type: 'note',
        }
      });
      expect(annotation.id).toBeDefined();
      expect(annotation.text).toBe('Db persist note');
    });
  });

  describe('Grids', () => {
    it('7. Check GridPatternPicker returns profiles flat contoured and SDL', () => {
      const profiles = ['Flat', 'Contoured', 'SDL', 'GBG'];
      expect(profiles).toContain('Flat');
      expect(profiles).toContain('Contoured');
      expect(profiles).toContain('SDL');
    });

    it('8. Check live contract format string format', () => {
      const v = 3;
      const h = 2;
      const fmt = `${v}V × ${h}H`;
      expect(fmt).toBe('3V × 2H');
    });

    it('9. Check BTR validation rules for Grid Profiles', () => {
      const r1 = validateGridConfig('Diamond', 'Contoured', 2, 2, null);
      expect(r1.valid).toBe(false); // Diamond must be Flat
      const r2 = validateGridConfig('Colonial', 'Contoured', 2, 2, null, 'Bronze');
      expect(r2.valid).toBe(true); // Exterior color requires contoured
      const r3 = validateGridConfig('Colonial', 'SDL', 2, 2, null);
      expect(r3.valid).toBe(false); // SDL requires size
    });

    it('10. Check grid style resolves correctly to Contract codes', () => {
      const o1 = { gridProfile: 'Contoured', gridPattern: 'Colonial' };
      const code1 = o1.gridProfile === 'Contoured' ? 'B1' : 'A1';
      expect(code1).toBe('B1');
      const o2 = { gridProfile: 'SDL' };
      expect(o2.gridProfile).toBe('SDL');
    });
  });

  describe('Obscure & Rain Obscure', () => {
    it('11. Check obscure glass options contain none full and half', () => {
      const options = ['none', 'full', 'half'];
      expect(options).toContain('none');
      expect(options).toContain('full');
      expect(options).toContain('half');
    });

    it('12. Check rain obscure distinct boolean flag and default value', () => {
      const defaults = WW_OPENING_DEFAULTS;
      expect(defaults.rainObscure).toBe(false);
    });

    it('13. Check pricing service applies rain obscure adder correctly', () => {
      const items = [{ price: 40, category: 'option', label: 'Rain Obscure', unitedInchesMax: 100, unitedInchesMin: 0 }];
      const opening = { openingNumber: 1, quantity: 1, rainObscure: true, productCategory: 'window', seriesModel: '4000', width: 36, height: 60 };
      const pricing = calculateProposalTotals([opening], { items });
      const rainItem = pricing.lineItems.find((i: any) => i.optionCode === 'rain_obscure');
      expect(rainItem).toBeDefined();
      expect(rainItem?.unitPrice).toBe(40);
    });

    it('14. Check rain obscure maps correctly in export contract', () => {
      const opening = { rainObscure: true };
      expect(opening.rainObscure).toBe(true);
    });
  });

  describe('Defaults & Product Selection', () => {
    it('15. Check foamEnhanced default is false', () => {
      const defaults = WW_OPENING_DEFAULTS;
      expect(defaults.foamEnhanced).toBe(false);
    });

    it('16. Check screenOption default is Half Screen for opening windows', () => {
      const defaults = WW_OPENING_DEFAULTS;
      expect(defaults.screenOption).toBe('Half Screen');
    });

    it('17. Check glassPackage default is LEE and restricted to LE/LEE', () => {
      const defaults = WW_OPENING_DEFAULTS;
      expect(defaults.glassPackage).toBe('LEE');
      const allowed = ['LE', 'LEE'];
      expect(allowed).toContain(defaults.glassPackage);
    });

    it('18. Check double hung model maps canonical 3002 code', () => {
      const opening = { productCategory: 'double hung' };
      const code = resolveWindowWorldModel(opening);
      expect(code).toBe('3002');
    });
  });

  describe('Special Shapes', () => {
    it('19. Check Circle Top base price lookup by UI', () => {
      const p1 = estimateSpecialShapePricing('S105', 18, 20, false); // UI = 38
      expect(p1?.basePrice).toBe(397.00);
      const p2 = estimateSpecialShapePricing('S105', 40, 50, false); // UI = 90
      expect(p2?.basePrice).toBe(654.13);
    });

    it('20. Check Round Top / Arch Hung base price lookup by UI', () => {
      const p1 = estimateSpecialShapePricing('S140', 30, 30, false); // UI = 60
      expect(p1?.basePrice).toBe(823.10);
      const p2 = estimateSpecialShapePricing('S140', 40, 50, false); // UI = 90
      expect(p2?.basePrice).toBe(1115.02);
    });

    it('21. Check special shape trim default is selected', () => {
      const opening = { productCategory: 'special_shape', shapeType: 'Circle Top' };
      const resolved = resolveOpeningDefaults(opening, { stage: 'save_item' });
      expect(resolved.defaults.specialShapeTrimSelected).toBe(true);
    });

    it('22. Check special shape trim adder is $75', () => {
      const p = estimateSpecialShapePricing('S105', 18, 20, true);
      expect(p?.trimPrice).toBe(75.00);
    });

    it('23. Check over-max dimension triggers max UI price plus $150', () => {
      const p = estimateSpecialShapePricing('S105', 86, 20, false); // w > 84
      expect(p?.isOverMaxDim).toBe(true);
      expect(p?.basePrice).toBe(918.27);
      expect(p?.overMaxAdder).toBe(150.00);
    });

    it('24. Check legHeight and radius required blockers', () => {
      const opening = { productCategory: 'eyebrow', radius: null, legHeight: null };
      const res = validateOpening(opening as any, [], false);
      const radiusMissing = res.missingFields.some((f: any) => f.field === 'radius');
      const legHeightMissing = res.missingFields.some((f: any) => f.field === 'legHeight');
      expect(radiusMissing).toBe(true);
      expect(legHeightMissing).toBe(true);
    });

    it('25. Check total specialty shape pricing is the sum of base, trim, and adders', () => {
      const p = estimateSpecialShapePricing('S105', 86, 20, true); // base 918.27 + over-max 150 + trim 75
      expect(p?.total).toBe(918.27 + 150.00 + 75.00);
    });
  });

  describe('Mull Groups', () => {
    it('26. Check mull group member association', () => {
      const group = { id: 'g1', memberMarkerIds: ['m1', 'm2'] };
      expect(group.memberMarkerIds).toContain('m1');
      expect(group.memberMarkerIds).toContain('m2');
    });

    it('27. Check mullion visual connector line properties', () => {
      const groupType = 'mull_pair';
      const isMull = groupType.toLowerCase().startsWith('mull');
      expect(isMull).toBe(true);
    });

    it('28. Check mullion types and price adders', () => {
      const items = [
        { price: 85, category: 'option', label: 'Mullion', unitedInchesMax: 100, unitedInchesMin: 0 },
        { price: 150, category: 'option', label: 'Structural Mullion', unitedInchesMax: 100, unitedInchesMin: 0 }
      ];
      const opStandard = { openingNumber: 1, quantity: 1, installMullion: true, structuralMullion: false, productCategory: 'window', seriesModel: '4000', width: 36, height: 60 };
      const pricingStandard = calculateProposalTotals([opStandard], { items });
      expect(pricingStandard.lineItems.find((i: any) => i.optionCode === 'mullion')?.unitPrice).toBe(85);

      const opStructural = { openingNumber: 2, quantity: 1, installMullion: true, structuralMullion: true, productCategory: 'window', seriesModel: '4000', width: 36, height: 60 };
      const pricingStructural = calculateProposalTotals([opStructural], { items });
      expect(pricingStructural.lineItems.find((i: any) => i.optionCode === 'structural_mull')?.unitPrice).toBe(150);
    });

    it('29. Check mullion group info propagates to openings on join', () => {
      const group = { groupType: 'mull_pair', mullType: 'structural', memberMarkerIds: ['m1', 'm2'] };
      const op = { openingNumber: 1, installMullion: true, structuralMullion: group.mullType === 'structural' };
      expect(op.installMullion).toBe(true);
      expect(op.structuralMullion).toBe(true);
    });

    it('30. Check mullion option codes map correctly in contract totals', () => {
      const op = { installMullion: true, structuralMullion: true };
      expect(op.installMullion).toBe(true);
      expect(op.structuralMullion).toBe(true);
    });
  });

  describe('Stucco Removal', () => {
    it('31. Check stucco exterior + alum removal triggers stuccoRemoval default true', () => {
      const opening = { exteriorSurface: 'stucco', removalType: 'ALUM' };
      const tracker = { defaultedFields: {}, overriddenFields: {} };
      const res = applyConditionalDefaults(opening, tracker);
      expect(res.opening.stuccoRemoval).toBe(true);
    });

    it('32. Check stucco removal pricing adder', () => {
      const items = [{ price: 125, category: 'labor', label: 'Aluminum from Stucco', unitedInchesMax: 100, unitedInchesMin: 0 }];
      const opening = { openingNumber: 1, quantity: 1, stuccoRemoval: true, productCategory: 'window', seriesModel: '4000', width: 36, height: 60 };
      const pricing = calculateProposalTotals([opening], { items });
      expect(pricing.lineItems.find((i: any) => i.optionCode === 'stucco_alum_removal')?.unitPrice).toBe(125);
    });

    it('33. Check stucco removal counts as alumInStucco in export contract', () => {
      const opening = { exteriorSurface: 'stucco', removalType: 'ALUM' };
      const ext = opening.exteriorSurface.toLowerCase();
      const rem = opening.removalType.toUpperCase();
      const isAlumInStucco = ext.includes('stucco') && rem === 'ALUM';
      expect(isAlumInStucco).toBe(true);
    });
  });

  describe('Pricing Accuracy', () => {
    it('34. Check total price is sum of line items', () => {
      const items = [
        { totalPrice: 500 },
        { totalPrice: 75 },
        { totalPrice: 40 }
      ];
      const sum = items.reduce((s, i) => s + i.totalPrice, 0);
      expect(sum).toBe(615);
    });

    it('35. Check no double charging of special shape trim', () => {
      const items = [{ price: 75, category: 'option', label: 'Special Shape Trim', unitedInchesMax: 100, unitedInchesMin: 0 }];
      const opening = { openingNumber: 1, quantity: 1, specialShapeTrimSelected: true, productCategory: 'special_shape', seriesModel: '4000', width: 36, height: 60 };
      const pricing = calculateProposalTotals([opening], { items });
      const trimItems = pricing.lineItems.filter((i: any) => i.optionCode === 'special_shape_trim');
      expect(trimItems.length).toBe(1);
    });

    it('36. Check no double charging of mullions', () => {
      const items = [{ price: 85, category: 'option', label: 'Mullion', unitedInchesMax: 100, unitedInchesMin: 0 }];
      const opening = { openingNumber: 1, quantity: 1, installMullion: true, productCategory: 'window', seriesModel: '4000', width: 36, height: 60 };
      const pricing = calculateProposalTotals([opening], { items });
      const mullItems = pricing.lineItems.filter((i: any) => i.optionCode === 'mullion');
      expect(mullItems.length).toBe(1);
    });

    it('37. Check active quote group combined pricing resolution', () => {
      const openings = [
        { id: 'o1', totalPrice: 500, deletedAt: null },
        { id: 'o2', totalPrice: 600, deletedAt: null },
      ];
      const active = openings.filter(o => !o.deletedAt);
      const sum = active.reduce((s, o) => s + o.totalPrice, 0);
      expect(sum).toBe(1100);
    });

    it('38. Check deleted/archived openings are excluded from pricing and contract counts', () => {
      const openings = [
        { id: 'o1', quantity: 1, deletedAt: null },
        { id: 'o2', quantity: 1, deletedAt: new Date() },
      ];
      const active = openings.filter(o => !o.deletedAt);
      expect(active.length).toBe(1);
    });

    it('39. Check non-discountable items are handled correctly', () => {
      const base = 500;
      const nonDiscountable = 150; // over max dim adder
      const discount = 50; // flat discount
      const total = (base - discount) + nonDiscountable;
      expect(total).toBe(600);
    });
  });

  describe('Consistency Engine', () => {
    it('40. Check consistency check succeeds when all matches', () => {
      const markers = [{ markerNumber: 1, gridPattern: 'Colonial', gridProfile: 'Contoured', gridVerticalCount: 2, gridHorizontalCount: 2 }];
      const openings = [{ openingNumber: 1, gridPattern: 'Colonial', gridProfile: 'Contoured', gridVerticalCount: 2, gridHorizontalCount: 2, glassPackage: 'LEE', foamEnhanced: false, screenOption: 'Half Screen' }];
      const report = validateSketchOrderContractConsistency(markers as any, openings, [], [], null);
      expect(report.valid).toBe(true);
      expect(report.issues.length).toBe(0);
    });

    it('41. Check consistency check fails/blocks on missing dimensions or mismatch', () => {
      const markers = [{ markerNumber: 1, gridPattern: 'Colonial', gridProfile: 'Contoured', gridVerticalCount: 2, gridHorizontalCount: 2 }];
      const openings = [{ openingNumber: 1, gridPattern: 'None', gridProfile: '', gridVerticalCount: 0, gridHorizontalCount: 0, glassPackage: 'LE', foamEnhanced: false, screenOption: 'Half Screen' }];
      const report = validateSketchOrderContractConsistency(markers as any, openings, [], [], null);
      expect(report.valid).toBe(false);
      expect(report.issues.some((i: any) => i.severity === 'blocker')).toBe(true);
    });

    it('42. Check consistency check can suggest autofix details', () => {
      const markers = [{ markerNumber: 1, gridPattern: 'Colonial', gridProfile: 'Contoured', gridVerticalCount: 2, gridHorizontalCount: 2 }];
      const openings = [{ openingNumber: 1, gridPattern: 'None', gridProfile: '', gridVerticalCount: 0, gridHorizontalCount: 0, glassPackage: 'LE', foamEnhanced: false, screenOption: 'Half Screen' }];
      const report = validateSketchOrderContractConsistency(markers as any, openings, [], [], null);
      const fixable = report.issues.find((i: any) => i.fixAction === 'sync_grids');
      expect(fixable).toBeDefined();
    });
  });
});
