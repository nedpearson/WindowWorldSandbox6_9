import { describe, it, expect } from 'vitest';
import { validateLouisianaCode, auditProject, calcNetClearOpening, LA_CODE_RULES } from './louisianaCode';

const base = (overrides: any = {}) => ({
  openingNumber: 1, width: 36, height: 60, productCategory: 'double_hung',
  roomLocation: 'Living Room', temperedGlass: 'none', glassPackage: 'SolarZone',
  argon: true, nailFin: false, ...overrides,
});

describe('Louisiana Building Code Engine', () => {
  describe('Rule definitions', () => {
    it('has all required rule categories', () => {
      const cats = new Set(LA_CODE_RULES.map(r => r.category));
      expect(cats.has('egress')).toBe(true);
      expect(cats.has('tempered')).toBe(true);
      expect(cats.has('energy')).toBe(true);
      expect(cats.has('replacement')).toBe(true);
    });
    it('every rule has code reference', () => {
      for (const r of LA_CODE_RULES) {
        expect(r.codeRef.length).toBeGreaterThan(0);
        expect(r.codeSource.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Egress validation', () => {
    it('flags bedroom with small window', () => {
      const op = base({ roomLocation: 'Master Bedroom', width: 24, height: 30 });
      const v = validateLouisianaCode(op, [op]);
      const egress = v.filter(x => x.rule.category === 'egress');
      expect(egress.length).toBeGreaterThan(0);
      expect(egress.some(e => e.ruleId === 'LA-EGR-001')).toBe(true);
    });
    it('passes bedroom with adequate window', () => {
      const op = base({ roomLocation: 'Bedroom', width: 36, height: 60 });
      const v = validateLouisianaCode(op, [op]);
      const egress = v.filter(x => x.ruleId === 'LA-EGR-001');
      expect(egress.length).toBe(0);
    });
    it('flags picture window in bedroom', () => {
      const op = base({ roomLocation: 'Bedroom', productCategory: 'picture' });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-EGR-005')).toBe(true);
    });
    it('flags high sill in bedroom', () => {
      const op = base({ roomLocation: 'Guest Bedroom', sillHeight: 48 });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-EGR-004')).toBe(true);
    });
    it('does not flag non-bedroom rooms for egress', () => {
      const op = base({ roomLocation: 'Kitchen', width: 20, height: 20 });
      const v = validateLouisianaCode(op, [op]);
      expect(v.filter(x => x.rule.category === 'egress').length).toBe(0);
    });
  });

  describe('Tempered / Safety Glazing', () => {
    it('flags doors without tempered', () => {
      const op = base({ productCategory: 'front_door', temperedGlass: 'none' });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-TMP-001')).toBe(true);
    });
    it('flags SGD without tempered', () => {
      const op = base({ productCategory: 'sgd', temperedGlass: 'none' });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-TMP-002')).toBe(true);
    });
    it('does not flag door with tempered', () => {
      const op = base({ productCategory: 'front_door', temperedGlass: 'full' });
      const v = validateLouisianaCode(op, [op]);
      expect(v.filter(x => x.ruleId.startsWith('LA-TMP-001')).length).toBe(0);
    });
    it('flags bathroom without tempered', () => {
      const op = base({ roomLocation: 'Master Bath' });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-TMP-004')).toBe(true);
    });
    it('flags window near door', () => {
      const op = base({ nearDoor: true });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-TMP-003')).toBe(true);
    });
    it('flags window near stairs', () => {
      const op = base({ nearStairway: true });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-TMP-006')).toBe(true);
    });
    it('flags large low glass', () => {
      const op = base({ width: 48, height: 72, sillHeight: 12 });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-TMP-005')).toBe(true);
    });
  });

  describe('Energy compliance', () => {
    it('flags clear glass for energy', () => {
      const op = base({ glassPackage: 'Clear' });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-NRG-001')).toBe(true);
    });
    it('recommends argon', () => {
      const op = base({ argon: false });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-NRG-003')).toBe(true);
    });
    it('does not flag SolarZone with argon', () => {
      const op = base({ glassPackage: 'SolarZone', argon: true });
      const v = validateLouisianaCode(op, [op]);
      expect(v.filter(x => x.ruleId === 'LA-NRG-001').length).toBe(0);
      expect(v.filter(x => x.ruleId === 'LA-NRG-003').length).toBe(0);
    });
  });

  describe('Installation rules', () => {
    it('flags nail fin on brick', () => {
      const op = base({ exteriorType: 'brick', nailFin: true });
      const v = validateLouisianaCode(op, [op]);
      expect(v.some(x => x.ruleId === 'LA-INS-002')).toBe(true);
    });
    it('does not flag nail fin on siding', () => {
      const op = base({ exteriorType: 'siding', nailFin: true });
      const v = validateLouisianaCode(op, [op]);
      expect(v.filter(x => x.ruleId === 'LA-INS-002').length).toBe(0);
    });
  });

  describe('Net clear opening calculation', () => {
    it('calculates correctly', () => {
      expect(calcNetClearOpening(24, 36)).toBeCloseTo(6.0);
      expect(calcNetClearOpening(20, 24)).toBeCloseTo(3.33, 1);
    });
  });

  describe('Project audit', () => {
    it('generates complete report', () => {
      const openings = [
        base({ roomLocation: 'Master Bedroom', width: 24, height: 30 }),
        base({ openingNumber: 2, roomLocation: 'Master Bath' }),
        base({ openingNumber: 3, productCategory: 'sgd', temperedGlass: 'none' }),
      ];
      const report = auditProject(openings);
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.counts.total).toBe(report.violations.length);
      expect(report.egressCompliant).toBe(false);
      expect(report.safetyGlazingComplete).toBe(false);
      expect(typeof report.energyCompliant).toBe('boolean');
    });
  });
});
