import { describe, it, expect } from 'vitest';
import { validateDoorLine, validateDoorContract, createEmptyDoorLine, calcDoorDimensions, DOOR_PAYMENT_PLANS } from './doorContract';
import { validateSidingContract, calcSidingTotal, SIDING_SYSTEM_PRICES, SIDING_LABOR_CHARGES, SOFFIT_FASCIA_PRICES } from './sidingContract';

// ═══════════════════════════════════════════════════════════════
// DOOR CONTRACT TESTS
// ═══════════════════════════════════════════════════════════════
describe('Door Contract Engine', () => {
  describe('Door dimension calculations', () => {
    it('calculates unit and rough opening from jamb measurement', () => {
      const dims = calcDoorDimensions(33.5, 78);
      expect(dims.unitWidth).toBe(36);
      expect(dims.roughOpeningWidth).toBe(36.75);
      expect(dims.unitHeight).toBe(79.25);
      expect(dims.roughOpeningHeight).toBe(79.75);
    });
  });

  describe('createEmptyDoorLine', () => {
    it('creates valid defaults', () => {
      const door = createEmptyDoorLine(1);
      expect(door.doorNumber).toBe(1);
      expect(door.swing).toBe('inswing');
      expect(door.glassType).toBe('tempered');
      expect(door.interiorCasing).toBe('3 1/4');
      expect(door.exteriorMoulding).toBe('brickmould');
    });
  });

  describe('Door line validation', () => {
    it('flags all missing required fields', () => {
      const door = createEmptyDoorLine(1);
      const warnings = validateDoorLine(door);
      expect(warnings.some(w => w.field === 'location')).toBe(true);
      expect(warnings.some(w => w.field === 'jambMeasurement')).toBe(true);
      expect(warnings.some(w => w.field === 'sillToHumpHeight')).toBe(true);
    });

    it('passes with complete door', () => {
      const door = {
        ...createEmptyDoorLine(1),
        location: 'Front Entry', jambMeasurement: 34, sillToHumpHeight: 79,
        jambDepth: 4.5, swing: 'inswing' as const, hand: 'right_hand' as const,
        doorStyle: 'Craftsman', hardwareFinish: 'Satin Nickel', exteriorColor: 'White',
      };
      const warnings = validateDoorLine(door);
      expect(warnings.filter(w => w.severity === 'critical').length).toBe(0);
    });

    it('flags non-tempered door glass', () => {
      const door = {
        ...createEmptyDoorLine(1), location: 'Front', jambMeasurement: 34,
        sillToHumpHeight: 79, doorStyle: 'Panel', glassStyle: 'half_lite', glassType: 'clear',
      };
      const warnings = validateDoorLine(door);
      expect(warnings.some(w => w.id.includes('tempered'))).toBe(true);
    });

    it('flags narrow door measurement', () => {
      const door = { ...createEmptyDoorLine(1), location: 'Closet', jambMeasurement: 20, sillToHumpHeight: 79 };
      const warnings = validateDoorLine(door);
      expect(warnings.some(w => w.id.includes('narrow'))).toBe(true);
    });
  });

  describe('Contract validation', () => {
    it('flags missing customer info', () => {
      const contract = {
        customerName: '', address: '', city: '', state: 'LA', zipCode: '', email: '',
        primaryPhone: '', secondaryPhone: '', otherPhone: '', customerId: '',
        completeJob: true, remainingWindows: false, location: 'Baton Rouge' as const,
        homeBuiltYear: 2000, doors: [], totalListPrice: 0, adminFee: 150, salesTax: 0,
        totalAmount: 150, deposit50: 75, balanceDue: 75, amountFinanced: 0,
        stJudeContribution: 0, paymentMethod: 'check' as const, checkNumber: '',
        cardLast4: '', cardExp: '', cardSecCode: '', financeOption: '',
        unfinishedDoorInitials: '', leadContainmentInitials: '', cancellationInitials: '',
      };
      const warnings = validateDoorContract(contract);
      expect(warnings.some(w => w.field === 'customerName')).toBe(true);
      expect(warnings.some(w => w.field === 'doors')).toBe(true);
    });

    it('flags pre-1978 homes for lead containment', () => {
      const contract = {
        customerName: 'Test', address: '123 Main', city: 'BR', state: 'LA', zipCode: '70808',
        email: '', primaryPhone: '', secondaryPhone: '', otherPhone: '', customerId: '',
        completeJob: true, remainingWindows: false, location: 'Baton Rouge' as const,
        homeBuiltYear: 1965, doors: [], totalListPrice: 0, adminFee: 150, salesTax: 0,
        totalAmount: 150, deposit50: 75, balanceDue: 75, amountFinanced: 0,
        stJudeContribution: 0, paymentMethod: 'check' as const, checkNumber: '',
        cardLast4: '', cardExp: '', cardSecCode: '', financeOption: '',
        unfinishedDoorInitials: '', leadContainmentInitials: '', cancellationInitials: '',
      };
      const warnings = validateDoorContract(contract);
      expect(warnings.some(w => w.id === 'door-lead')).toBe(true);
    });
  });

  describe('Payment plans', () => {
    it('has 4 finance options', () => {
      expect(DOOR_PAYMENT_PLANS.length).toBe(4);
    });
    it('includes no-interest options', () => {
      expect(DOOR_PAYMENT_PLANS.filter(p => p.rate === 0).length).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SIDING CONTRACT TESTS
// ═══════════════════════════════════════════════════════════════
describe('Siding Contract Engine', () => {
  describe('Pricing data', () => {
    it('has all 8 siding systems', () => {
      expect(SIDING_SYSTEM_PRICES.length).toBe(8);
    });
    it('Prodigy is $9.35/sqft', () => {
      const p = SIDING_SYSTEM_PRICES.find(s => s.system === 'prodigy')!;
      expect(p.pricePerSqft).toBe(9.35);
    });
    it('Everlast 4.5" is $17.35/sqft', () => {
      const p = SIDING_SYSTEM_PRICES.find(s => s.system === 'everlast_45')!;
      expect(p.pricePerSqft).toBe(17.35);
    });
    it('has soffit & fascia pricing', () => {
      expect(SOFFIT_FASCIA_PRICES.length).toBe(5);
    });
    it('has labor charges', () => {
      expect(Object.keys(SIDING_LABOR_CHARGES).length).toBeGreaterThan(10);
    });
  });

  describe('Price calculation', () => {
    it('calculates Prodigy siding total', () => {
      expect(calcSidingTotal('prodigy', 20)).toBeCloseTo(187.0);
    });
    it('calculates WW-4000 siding total', () => {
      expect(calcSidingTotal('ww4000', 15)).toBeCloseTo(123.75);
    });
  });

  describe('Siding validation', () => {
    const baseContract = (): any => ({
      customerName: 'Test', address: '123 Main', city: 'BR', state: 'LA', zipCode: '70808',
      sidingSystem: 'prodigy', sidingProfile: 'dutch_lap', totalSqft: 20,
      sidingColor: 'Royal Blue', sidingColorInitials: 'TP', trimColor: 'White',
      trimColorInitials: 'TP', homeBuiltYear: 2005, lines: [], laborCharges: [],
      totalListPrice: 187, adminFee: 295, totalAmount: 482,
    });

    it('passes valid contract', () => {
      const w = validateSidingContract(baseContract());
      expect(w.filter(x => x.severity === 'critical').length).toBe(0);
    });

    it('flags missing siding system', () => {
      const c = { ...baseContract(), sidingSystem: '' };
      const w = validateSidingContract(c);
      expect(w.some(x => x.id === 'sid-system')).toBe(true);
    });

    it('flags missing color', () => {
      const c = { ...baseContract(), sidingColor: '' };
      const w = validateSidingContract(c);
      expect(w.some(x => x.id === 'sid-color')).toBe(true);
    });

    it('flags missing sqft', () => {
      const c = { ...baseContract(), totalSqft: 0 };
      const w = validateSidingContract(c);
      expect(w.some(x => x.id === 'sid-sqft')).toBe(true);
    });

    it('flags missing color initials', () => {
      const c = { ...baseContract(), sidingColorInitials: '' };
      const w = validateSidingContract(c);
      expect(w.some(x => x.id === 'sid-color-init')).toBe(true);
    });

    it('flags pre-1978 lead containment', () => {
      const c = { ...baseContract(), homeBuiltYear: 1960, leadInitials: '' };
      const w = validateSidingContract(c);
      expect(w.some(x => x.id === 'sid-lead')).toBe(true);
    });

    it('warns about missing corners on composite', () => {
      const c = { ...baseContract(), sidingSystem: 'everlast_45', lines: [{ description: 'Install siding' }] };
      const w = validateSidingContract(c);
      expect(w.some(x => x.id === 'sid-corners')).toBe(true);
    });
  });
});
