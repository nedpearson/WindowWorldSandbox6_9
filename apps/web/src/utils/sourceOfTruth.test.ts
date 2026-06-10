import { describe, it, expect } from 'vitest';
import { calculateFinalMeasurement } from './measurementRulesEngine';
import { applyConditionalDefaults, createOpeningWithDefaults, DefaultTracker } from './openingDefaults';
import { validateOpening } from './openingValidation';

describe('Source of Truth - Measurement Basis & Deduction', () => {
  it('calculates the smallest measurement and applies -0.375 deduction for outside basis', () => {
    // Top: 36.125, Middle: 36, Bottom: 35.875
    // Smallest: 35.875
    // Deduction: -0.375
    // Final: 35.5
    const finalWidth = calculateFinalMeasurement(36.125, 36, 35.875, -0.375);
    expect(finalWidth).toBe(35.5);

    // Left: 60.25, Center: 60.125, Right: 60
    // Smallest: 60
    // Deduction: -0.375
    // Final: 59.625
    const finalHeight = calculateFinalMeasurement(60.25, 60.125, 60, -0.375);
    expect(finalHeight).toBe(59.625);
  });

  it('calculates the smallest measurement and applies 0 deduction for inside basis', () => {
    const finalWidth = calculateFinalMeasurement(36.125, 36, 35.875, 0);
    expect(finalWidth).toBe(35.875);
  });
});

describe('Source of Truth - Exterior Defaults', () => {
  it('applies EXT install and No cutback for Brick', () => {
    const { opening, tracker } = createOpeningWithDefaults('app1', 1);
    opening.exteriorType = 'Brick';
    const result = applyConditionalDefaults(opening, tracker, 'exteriorType');
    
    expect(result.opening.installType).toBe('EXT');
    expect(result.opening.cutbackType).toBe('No cutback');
  });

  it('applies INT install and requires trim/header for Siding', () => {
    const { opening, tracker } = createOpeningWithDefaults('app1', 1);
    opening.exteriorType = 'Siding';
    const result = applyConditionalDefaults(opening, tracker, 'exteriorType');
    
    expect(result.opening.installType).toBe('INT');
    expect(result.opening.trimRequired).toBe(true);
    expect(result.opening.headerRequired).toBe(true);
  });

  it('forces cutback selection for Stucco', () => {
    const { opening, tracker } = createOpeningWithDefaults('app1', 1);
    opening.exteriorType = 'Stucco';
    const result = applyConditionalDefaults(opening, tracker, 'exteriorType');
    
    expect(result.opening.cutbackType).toBe('Needs cutback selection');
  });
});

describe('Source of Truth - Validation Blockers', () => {
  it('blocks contract generation if measurementBasis is needs_review', () => {
    const opening: any = {
      width: 36, height: 60, productCategory: 'double_hung',
      roomLocation: 'Living', elevation: 'Front', interiorColor: 'White', exteriorColor: 'White',
      gridStyle: 'None', glassPackage: 'LEE', removalType: 'ALUM',
      measurementBasis: 'needs_review'
    };
    
    const result = validateOpening(opening, [], false);
    expect(result.status).toBe('incomplete');
    expect(result.missingFields.some(f => f.field === 'measurementBasis')).toBe(true);
  });

  it('blocks contract generation if stucco cutback is missing', () => {
    const opening: any = {
      width: 36, height: 60, productCategory: 'double_hung',
      roomLocation: 'Living', elevation: 'Front', interiorColor: 'White', exteriorColor: 'White',
      gridStyle: 'None', glassPackage: 'LEE', removalType: 'ALUM',
      measurementBasis: 'outside', exteriorType: 'Stucco', cutbackType: 'Needs cutback selection'
    };
    
    const result = validateOpening(opening, [], false);
    expect(result.status).toBe('incomplete');
    expect(result.missingFields.some(f => f.field === 'cutbackType')).toBe(true);
  });
  
  it('allows contract generation when fully valid', () => {
    const opening: any = {
      width: 36, height: 60, productCategory: 'double_hung',
      roomLocation: 'Living', elevation: 'Front', interiorColor: 'White', exteriorColor: 'White',
      gridStyle: 'None', glassPackage: 'LEE', removalType: 'ALUM',
      measurementBasis: 'outside', exteriorType: 'Siding', totalPrice: 500
    };
    
    const result = validateOpening(opening, [], false);
    expect(result.status).toBe('ready');
  });
});
