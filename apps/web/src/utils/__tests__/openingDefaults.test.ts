// ═══════════════════════════════════════════════════════════════
// Opening Defaults — Test Suite
// Tests for resolveOpeningDefaults(), WW_OPENING_DEFAULTS,
// measurement basis auto-detection, and validation severity.
// ═══════════════════════════════════════════════════════════════

import { describe, test, expect } from 'vitest';

import {
  WW_OPENING_DEFAULTS,
  createOpeningWithDefaults,
  resolveOpeningDefaults,
  trackOverride,
  applyConditionalDefaults,
} from '../openingDefaults';
import type { DefaultResolverContext } from '../openingDefaultTypes';

describe('WW_OPENING_DEFAULTS', () => {
  test('1. glass defaults to LEE', () => {
    expect(WW_OPENING_DEFAULTS.glassPackage).toBe('LEE');
    expect(WW_OPENING_DEFAULTS.glassOption).toBe('LEE');
  });

  test('2. foam enhanced defaults to false', () => {
    expect(WW_OPENING_DEFAULTS.foamEnhanced).toBe(false);
  });

  test('3. colors default to White', () => {
    expect(WW_OPENING_DEFAULTS.interiorColor).toBe('White');
    expect(WW_OPENING_DEFAULTS.exteriorColor).toBe('White');
  });

  test('4. type removed defaults to ALUM', () => {
    expect(WW_OPENING_DEFAULTS.removalType).toBe('ALUM');
    expect(WW_OPENING_DEFAULTS.typeRemoved).toBe('ALUM');
  });

  test('5. type installed defaults to EXT', () => {
    expect(WW_OPENING_DEFAULTS.installType).toBe('EXT');
  });

  test('6. screen defaults to Half Screen', () => {
    expect(WW_OPENING_DEFAULTS.screenOption).toBe('Half Screen');
  });

  test('7. grid defaults to None', () => {
    expect(WW_OPENING_DEFAULTS.gridStyle).toBe('None');
    expect(WW_OPENING_DEFAULTS.gridPattern).toBe('None');
  });

  test('8. product category defaults to double_hung', () => {
    expect(WW_OPENING_DEFAULTS.productCategory).toBe('double_hung');
  });
});

describe('resolveOpeningDefaults', () => {
  const emptyOpening: Record<string, unknown> = {};
  const ctx: DefaultResolverContext = { stage: 'save_item' };

  test('9. applies LEE glass default for blank opening', () => {
    const result = resolveOpeningDefaults(emptyOpening, ctx);
    expect(result.defaults.glassPackage).toBe('LEE');
    expect(result.fieldStatus.glassPackage).toBe('defaulted');
    expect(result.reasons.glassPackage).toBeTruthy();
  });

  test('10. applies foam enhanced false for blank opening', () => {
    const result = resolveOpeningDefaults(emptyOpening, ctx);
    expect(result.defaults.foamEnhanced).toBe(false);
  });

  test('11. applies ALUM removal type for blank opening', () => {
    const result = resolveOpeningDefaults(emptyOpening, ctx);
    expect(result.defaults.removalType).toBe('ALUM');
  });

  test('12. applies EXT install type for blank opening', () => {
    const result = resolveOpeningDefaults(emptyOpening, ctx);
    expect(result.defaults.installType).toBe('EXT');
  });

  test('13. applies Half Screen for non-picture window', () => {
    const result = resolveOpeningDefaults({ productCategory: 'double_hung' }, ctx);
    expect(result.defaults.screenOption).toBe('Half Screen');
  });

  test('14. picture window defaults to No Screen', () => {
    const result = resolveOpeningDefaults({ productCategory: 'picture' }, ctx);
    expect(result.defaults.screenOption).toBe('No Screen');
  });

  test('15. preserves user-entered values (does not overwrite)', () => {
    const opening = { glassPackage: 'SolarZone', interiorColor: 'Almond' };
    const result = resolveOpeningDefaults(opening, ctx);
    // Should NOT be in defaults (already has a value)
    expect(result.defaults.glassPackage).toBeUndefined();
    expect(result.defaults.interiorColor).toBeUndefined();
    // Should be marked as needs_review (not LE/LEE glass) and interior color confirmed
    expect(result.fieldStatus.glassPackage).toBe('needs_review');
    expect(result.fieldStatus.interiorColor).toBe('confirmed');
  });

  test('16. overridden fields are marked as overridden', () => {
    const overrides = new Set(['glassPackage']);
    const result = resolveOpeningDefaults(emptyOpening, { stage: 'save_item', overriddenFields: overrides });
    expect(result.fieldStatus.glassPackage).toBe('overridden');
    // Should NOT set a default for overridden field
    expect(result.defaults.glassPackage).toBeUndefined();
  });
});

describe('Measurement basis auto-detection', () => {
  const ctx: DefaultResolverContext = { stage: 'save_item' };

  test('17. wood defaults to inside measure with trim and header', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Wood' }, ctx);
    expect(result.defaults.measurementBasis).toBe('inside');
    expect(result.defaults.trimType).toBe('Vinyl trim');
    expect(result.defaults.headerType).toBe('New header');
    expect(result.reasons.measurementBasis).toContain('Siding/Wood');
  });

  test('18. siding defaults to inside measure with trim and header', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Siding' }, ctx);
    expect(result.defaults.measurementBasis).toBe('inside');
    expect(result.defaults.trimType).toBe('Vinyl trim');
    expect(result.defaults.headerType).toBe('New header');
  });

  test('19. siding overrides install type to INT', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Siding' }, ctx);
    expect(result.defaults.installType).toBe('INT');
  });

  test('20. stucco defaults to inside measure', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Stucco' }, ctx);
    expect(result.defaults.measurementBasis).toBe('inside');
  });

  test('21. stucco suggests cutback review', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Stucco' }, ctx);
    const cutbackSuggestion = result.suggestions.find(s => s.field === 'cutbackType');
    expect(cutbackSuggestion).toBeTruthy();
    expect(cutbackSuggestion!.reason).toContain('cutback');
  });

  test('22. brick defaults to outside measure', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Brick' }, ctx);
    expect(result.defaults.measurementBasis).toBe('outside');
    expect(result.reasons.measurementBasis).toContain('Brick');
  });

  test('23. brick with wood return creates needs review', () => {
    const result = resolveOpeningDefaults(
      { exteriorType: 'Brick', whatTouchesWindow: 'Wood' },
      ctx,
    );
    const reviewItem = result.needsReview.find(r => r.field === 'measurementBasis');
    expect(reviewItem).toBeTruthy();
    expect(reviewItem!.reason).toContain('wood/trim return');
    expect(result.fieldStatus.measurementBasis).toBe('needs_review');
  });

  test('24. hardie defaults to inside measure with trim and header', () => {
    const result = resolveOpeningDefaults({ exteriorType: 'Hardie' }, ctx);
    expect(result.defaults.measurementBasis).toBe('inside');
    expect(result.defaults.trimType).toBe('Vinyl trim');
    expect(result.defaults.headerType).toBe('New header');
  });
});

describe('Safety glazing defaults', () => {
  test('25. bathroom triggers safety glazing needs review', () => {
    const result = resolveOpeningDefaults(
      { roomLocation: 'Bathroom', width: 36, height: 48 },
      { stage: 'save_item' },
    );
    const reviewItem = result.needsReview.find(r => r.field === 'safetyGlazingStatus');
    expect(reviewItem).toBeTruthy();
    expect(reviewItem!.reason).toContain('bathtub/shower');
  });

  test('26. no trigger suggests not tempered', () => {
    const result = resolveOpeningDefaults(
      { roomLocation: 'Living Room', width: 36, height: 48 },
      { stage: 'save_item' },
    );
    const suggestion = result.suggestions.find(s => s.field === 'safetyGlazingStatus');
    expect(suggestion).toBeTruthy();
    expect(suggestion!.suggestedValue).toBe('suggested_not_tempered');
  });

  test('27. safety glazing unsure blocks final contract', () => {
    const result = resolveOpeningDefaults(
      { safetyGlazingStatus: 'unsure', width: 36, height: 48 },
      { stage: 'contract_ready' },
    );
    const blocker = result.blockers.find(b => b.field === 'safetyGlazingStatus');
    expect(blocker).toBeTruthy();
    expect(blocker!.reason).toContain('Unsure');
  });
});

describe('Oriel defaults', () => {
  test('28. oriel without upper sash height shows suggestion at save_item', () => {
    const result = resolveOpeningDefaults(
      { oriel: true, width: 36, height: 60 },
      { stage: 'save_item' },
    );
    const suggestion = result.suggestions.find(s => s.field === 'orielUpperSashHeight');
    expect(suggestion).toBeTruthy();
    expect(suggestion!.reason).toContain('upper sash height');
    // Should NOT be a blocker at save_item stage
    expect(result.blockers.find(b => b.field === 'orielUpperSashHeight')).toBeUndefined();
  });

  test('29. oriel without upper sash height blocks at contract_ready', () => {
    const result = resolveOpeningDefaults(
      { oriel: true, width: 36, height: 60 },
      { stage: 'contract_ready' },
    );
    const blocker = result.blockers.find(b => b.field === 'orielUpperSashHeight');
    expect(blocker).toBeTruthy();
    expect(blocker!.blocksAt).toBe('contract_ready');
  });
});

describe('Contract-ready blockers', () => {
  test('30. missing width blocks at contract_ready', () => {
    const result = resolveOpeningDefaults({}, { stage: 'contract_ready' });
    expect(result.blockers.find(b => b.field === 'width')).toBeTruthy();
  });

  test('31. missing height blocks at contract_ready', () => {
    const result = resolveOpeningDefaults({}, { stage: 'contract_ready' });
    expect(result.blockers.find(b => b.field === 'height')).toBeTruthy();
  });

  test('32. valid opening does not block at save_item', () => {
    const result = resolveOpeningDefaults(
      { width: 36, height: 48, productCategory: 'double_hung' },
      { stage: 'save_item' },
    );
    expect(result.blockers).toHaveLength(0);
  });
});

describe('Model number resolution', () => {
  test('33. double_hung suggests model 3002', () => {
    const result = resolveOpeningDefaults(
      { productCategory: 'double_hung' },
      { stage: 'save_item' },
    );
    const modelSuggestion = result.suggestions.find(s => s.field === 'seriesModel');
    expect(modelSuggestion).toBeTruthy();
    expect(modelSuggestion!.suggestedValue).toMatch(/^3002/);
  });

  test('34. double_hung with foam enhanced suggests model 3002-FE', () => {
    const result = resolveOpeningDefaults(
      { productCategory: 'double_hung', foamEnhanced: true },
      { stage: 'save_item' },
    );
    const modelSuggestion = result.suggestions.find(s => s.field === 'seriesModel');
    expect(modelSuggestion).toBeTruthy();
    expect(modelSuggestion!.suggestedValue).toBe('3002-FE');
  });

  test('35. picture window suggests model 3004', () => {
    const result = resolveOpeningDefaults(
      { productCategory: 'picture' },
      { stage: 'save_item' },
    );
    const modelSuggestion = result.suggestions.find(s => s.field === 'seriesModel');
    expect(modelSuggestion).toBeTruthy();
    expect(modelSuggestion!.suggestedValue).toMatch(/^3004/);
  });
});

describe('createOpeningWithDefaults', () => {
  test('36. creates opening with all WW defaults applied', () => {
    const { opening, tracker } = createOpeningWithDefaults('appt-1', 1);
    expect(opening.glassPackage).toBe('LEE');
    expect(opening.foamEnhanced).toBe(false);
    expect(opening.removalType).toBe('ALUM');
    expect(opening.installType).toBe('EXT');
    expect(opening.screenOption).toBe('Half Screen');
    expect(opening.interiorColor).toBe('White');
    expect(opening.exteriorColor).toBe('White');
    // Tracker should have all defaults recorded
    expect(tracker.defaultedFields.glassPackage).toBeTruthy();
    expect(tracker.defaultedFields.foamEnhanced).toBeTruthy();
  });

  test('37. never ask twice overrides company defaults', () => {
    const neverAskTwice = { interiorColor: 'Almond', glassPackage: 'SolarZone' };
    const { opening, tracker } = createOpeningWithDefaults('appt-1', 1, [], neverAskTwice);
    expect(opening.interiorColor).toBe('Almond');
    expect(opening.glassPackage).toBe('SolarZone');
    expect(tracker.defaultedFields.interiorColor.source).toBe('never_ask_twice');
  });
});

describe('trackOverride', () => {
  test('38. records override when user changes a defaulted field', () => {
    const { tracker } = createOpeningWithDefaults('appt-1', 1);
    const updated = trackOverride(tracker, 'glassPackage', 'SolarZone');
    expect(updated.overriddenFields.glassPackage).toBeTruthy();
    expect(updated.overriddenFields.glassPackage.originalDefault).toBe('LEE');
    expect(updated.overriddenFields.glassPackage.newValue).toBe('SolarZone');
  });
});

describe('applyConditionalDefaults', () => {
  test('39. siding triggers trim and header defaults', () => {
    const { opening, tracker } = createOpeningWithDefaults('appt-1', 1);
    opening.exteriorType = 'Siding';
    const result = applyConditionalDefaults(opening, tracker, 'exteriorType');
    expect(result.opening.trimType).toBe('Vinyl trim');
    expect(result.opening.headerType).toBe('New header');
    expect(result.opening.installType).toBe('INT');
    expect(result.appliedRules.length).toBeGreaterThan(0);
  });

  test('40. brick triggers EXT install and no cutback', () => {
    const { opening, tracker } = createOpeningWithDefaults('appt-1', 1);
    opening.exteriorType = 'Brick';
    const result = applyConditionalDefaults(opening, tracker, 'exteriorType');
    expect(result.opening.installType).toBe('EXT');
    expect(result.opening.cutbackType).toBe('No cutback');
  });

  test('41. picture window triggers No Screen', () => {
    const { opening, tracker } = createOpeningWithDefaults('appt-1', 1);
    opening.productCategory = 'picture';
    const result = applyConditionalDefaults(opening, tracker, 'productCategory');
    expect(result.opening.screenOption).toBe('No Screen');
  });

  test('42. conditional default does not override manual override', () => {
    const { opening, tracker } = createOpeningWithDefaults('appt-1', 1);
    // User manually set installType to something else
    const overriddenTracker = trackOverride(tracker, 'installType', 'INT');
    opening.exteriorType = 'Brick';
    opening.installType = 'INT';
    const result = applyConditionalDefaults(opening, overriddenTracker, 'exteriorType');
    // installType should NOT be overridden back to EXT
    expect(result.opening.installType).toBe('INT');
  });
});
