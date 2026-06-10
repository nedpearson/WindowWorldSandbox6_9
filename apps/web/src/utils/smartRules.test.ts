import { describe, it, expect } from 'vitest';
import { evaluateDbRule, type DbRule } from './ruleExecutionEngine';

function makeMockOpening(overrides: Record<string, any> = {}): any {
  return {
    openingNumber: 1,
    width: '36',
    height: '60',
    exteriorType: 'Siding',
    insideSet: 'true',
    windowType: 'Double Hung',
    series: '3000',
    orielHeight: '40',
    orielSelected: 'true',
    screenType: 'Half Screen',
    exteriorColor: 'White',
    vinylColor: 'White',
    sdlSelected: 'false',
    adjacentToDoor: 'false',
    bottomEdgeFromFloor: '48',
    walkingSurfaceDistance: '36',
    mullSelected: 'false',
    ...overrides,
  };
}

describe('Smart Guideline Rules Engine', () => {
  describe('Operator Evaluation', () => {
    it('handles equals operator correctly', () => {
      const rule: DbRule = {
        id: '1', ruleKey: 'test-eq', name: 'Test Equals', description: '', category: 'window_defaults',
        isActive: true, severity: 'warning', triggerField: 'exteriorType', operator: 'equals', triggerValue: 'Siding',
        actionType: 'set_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };
      
      expect(evaluateDbRule(rule, makeMockOpening({ exteriorType: 'Siding' }))).toBe(true);
      expect(evaluateDbRule(rule, makeMockOpening({ exteriorType: 'Brick' }))).toBe(false);
    });

    it('handles not_equals operator correctly', () => {
      const rule: DbRule = {
        id: '2', ruleKey: 'test-neq', name: 'Test Not Equals', description: '', category: 'window_defaults',
        isActive: true, severity: 'warning', triggerField: 'exteriorType', operator: 'not_equals', triggerValue: 'Wood',
        actionType: 'set_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      expect(evaluateDbRule(rule, makeMockOpening({ exteriorType: 'Siding' }))).toBe(true);
      expect(evaluateDbRule(rule, makeMockOpening({ exteriorType: 'Wood' }))).toBe(false);
    });

    it('handles greater_than operator correctly', () => {
      const rule: DbRule = {
        id: '3', ruleKey: 'test-gt', name: 'Test Greater Than', description: '', category: 'window_defaults',
        isActive: true, severity: 'warning', triggerField: 'width', operator: 'greater_than', triggerValue: '50',
        actionType: 'set_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      expect(evaluateDbRule(rule, makeMockOpening({ width: '60' }))).toBe(true);
      expect(evaluateDbRule(rule, makeMockOpening({ width: '40' }))).toBe(false);
    });

    it('handles contains operator correctly', () => {
      const rule: DbRule = {
        id: '4', ruleKey: 'test-contains', name: 'Test Contains', description: '', category: 'window_defaults',
        isActive: true, severity: 'warning', triggerField: 'gridStyle', operator: 'contains', triggerValue: 'Diamond',
        actionType: 'set_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      expect(evaluateDbRule(rule, makeMockOpening({ gridStyle: 'D1 Diamond Full' }))).toBe(true);
      expect(evaluateDbRule(rule, makeMockOpening({ gridStyle: 'A1 Colonial Flat Full' }))).toBe(false);
    });
  });

  describe('Compound Rules (BTR Guidelines)', () => {
    it('triggers oriel-dh-max-50 rule when DH has oriel height > 50', () => {
      const rule: DbRule = {
        id: '5', ruleKey: 'ww-oriel-dh-max-50', name: '3000 DH Oriel Max 50 Inches', description: '', category: 'oriel',
        isActive: true, severity: 'blocker', triggerField: 'series', operator: 'equals', triggerValue: '3000',
        actionType: 'block_final', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      const invalidOriel = makeMockOpening({ windowType: 'Double Hung', orielSelected: 'true', orielHeight: '52' });
      const validOriel = makeMockOpening({ windowType: 'Double Hung', orielSelected: 'true', orielHeight: '45' });
      const nonOriel = makeMockOpening({ windowType: 'Double Hung', orielSelected: 'false', orielHeight: '52' });

      expect(evaluateDbRule(rule, invalidOriel)).toBe(true);
      expect(evaluateDbRule(rule, validOriel)).toBe(false);
      expect(evaluateDbRule(rule, nonOriel)).toBe(false);
    });

    it('triggers inside-set-trim-required rule when inside set and not wood', () => {
      const rule: DbRule = {
        id: '6', ruleKey: 'ww-inside-set-trim-required', name: 'Inside Set Trim Required', description: '', category: 'exterior_install',
        isActive: true, severity: 'blocker', triggerField: 'insideSet', operator: 'equals', triggerValue: 'true',
        actionType: 'require_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      const sidingInside = makeMockOpening({ insideSet: 'true', exteriorType: 'Siding' });
      const woodInside = makeMockOpening({ insideSet: 'true', exteriorType: 'Wood' });
      const sidingOutside = makeMockOpening({ insideSet: 'false', exteriorType: 'Siding' });

      expect(evaluateDbRule(rule, sidingInside)).toBe(true);
      expect(evaluateDbRule(rule, woodInside)).toBe(false);
      expect(evaluateDbRule(rule, sidingOutside)).toBe(false);
    });

    it('triggers tempered-adjacent-door when adjacent to door and low/close', () => {
      const rule: DbRule = {
        id: '7', ruleKey: 'ww-tempered-adjacent-door', name: 'Tempered Adjacent Door', description: '', category: 'tempered_glass',
        isActive: true, severity: 'blocker', triggerField: 'adjacentToDoor', operator: 'equals', triggerValue: 'true',
        actionType: 'require_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      const hazard = makeMockOpening({ adjacentToDoor: 'true', bottomEdgeFromFloor: '30', walkingSurfaceDistance: '12' });
      const safeDistance = makeMockOpening({ adjacentToDoor: 'true', bottomEdgeFromFloor: '30', walkingSurfaceDistance: '36' });
      const safeHeight = makeMockOpening({ adjacentToDoor: 'true', bottomEdgeFromFloor: '65', walkingSurfaceDistance: '12' });

      expect(evaluateDbRule(rule, hazard)).toBe(true);
      expect(evaluateDbRule(rule, safeDistance)).toBe(false);
      expect(evaluateDbRule(rule, safeHeight)).toBe(false);
    });

    it('triggers mull-casement-pair-0972 when 0971 casement pair fits limits', () => {
      const rule: DbRule = {
        id: '8', ruleKey: 'ww-mull-casement-pair-0972', name: 'Mull Casement Pair', description: '', category: 'mull_joined',
        isActive: true, severity: 'warning', triggerField: 'mullSelected', operator: 'equals', triggerValue: 'true',
        actionType: 'suggest_field', message: '', autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, priority: 0,
        appliesToAllReps: true
      };

      const fitMull = makeMockOpening({ mullSelected: true, productModel: '0971', width: '36', height: '60' });
      const tooWide = makeMockOpening({ mullSelected: true, productModel: '0971', width: '80', height: '60' });
      const notMulled = makeMockOpening({ mullSelected: false, productModel: '0971', width: '36', height: '60' });

      expect(evaluateDbRule(rule, fitMull)).toBe(true);
      expect(evaluateDbRule(rule, tooWide)).toBe(false);
      expect(evaluateDbRule(rule, notMulled)).toBe(false);
    });
  });
});
