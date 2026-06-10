// ═══════════════════════════════════════════════════════════════
// Sketch Sync Engine — Unit Tests
// Covers: marker creation, opening sync, validation, tempered rules
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  createMarkerData,
  createOpeningFromMarker,
  validateSketchSync,
  calcUnitedInches,
  computeMarkerValidation,
  getNextMarkerNumber,
  checkTubShowerRule,
  checkLowGlassRule,
  calculateGlassArea,
  calculateClearStoryCharges,
  buildLockdownChecklist,
  isExportBlocked,
  getMeasurementGuidance,
  resolveMixedMaterialRule,
  detectNearbyMaterial,
  autoApplyMeasurementRule,
  compactRenumberMarkers,
  getActiveOpeningMarkers,
  reconcileSketchOpenings,
} from './sketchSync';
import type { SketchMarkerData, MarkerGroupData } from './sketchSync';

describe('createMarkerData', () => {
  it('creates window_x marker with correct number', () => {
    const m = createMarkerData('sketch1', 'window_x', 100, 200, 'front', []);
    expect(m.markerSymbol).toBe('window_x');
    expect(m.markerNumber).toBe(1);
    expect(m.markerLabel).toBe('X #1');
    expect(m.windowType).toBe('double_hung');
    expect(m.validationStatus).toBe('incomplete');
  });

  it('increments marker number', () => {
    const existing = [createMarkerData('s', 'window_x', 0, 0, 'front', [])];
    const m2 = createMarkerData('s', 'window_x', 50, 50, 'front', existing);
    expect(m2.markerNumber).toBe(2);
  });

  it('front door has a number', () => {
    const m = createMarkerData('s', 'front_door', 100, 100, 'front', []);
    expect(m.markerNumber).toBe(1);
    expect(m.markerLabel).toBe('Front Door');
  });

  it('note marker has no number', () => {
    const m = createMarkerData('s', 'note', 50, 50, 'front', []);
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('Note');
  });

  it('patio_door auto-sets window type', () => {
    const m = createMarkerData('s', 'patio_door', 100, 100, 'rear', []);
    expect(m.windowType).toBe('patio_door');
    expect(m.markerNumber).toBe(1);
  });

  it('oriel auto-sets window type', () => {
    const m = createMarkerData('s', 'oriel', 100, 100, 'front', []);
    expect(m.windowType).toBe('oriel');
  });

  it('special_shape auto-sets window type', () => {
    const m = createMarkerData('s', 'special_shape', 100, 100, 'front', []);
    expect(m.windowType).toBe('special_shape');
  });
});

describe('createOpeningFromMarker', () => {
  it('creates opening with WW defaults', () => {
    const marker = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    const opening = createOpeningFromMarker(marker, 'appt_1');
    expect(opening.appointmentId).toBe('appt_1');
    expect(opening.openingNumber).toBe(1);
    expect(opening.glassPackage).toBe('LEE');
    expect(opening.foamEnhanced).toBe(false);
    expect(opening.removalType).toBe('ALUM');
    expect(opening.seriesModel).toBe('4000 Series');
    expect(opening.interiorColor).toBe('White');
    expect(opening.exteriorColor).toBe('White');
  });

  it('picture window gets no screen', () => {
    const marker = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    marker.windowType = 'picture';
    const opening = createOpeningFromMarker(marker, 'appt_1');
    expect(opening.screenOption).toBe('No Screen');
  });
});

describe('calcUnitedInches', () => {
  it('calculates correctly', () => {
    expect(calcUnitedInches(35.375, 59.875)).toBe(95.25);
  });
  it('returns 0 for zeros', () => {
    expect(calcUnitedInches(0, 0)).toBe(0);
  });
});

describe('validateSketchSync', () => {
  it('warns about missing front door', () => {
    const markers: SketchMarkerData[] = [createMarkerData('s', 'window_x', 100, 100, 'front', [])];
    const warnings = validateSketchSync(markers, [], []);
    expect(warnings.some(w => w.type === 'missing_front_door')).toBe(true);
  });

  it('warns about missing measurement', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m.width = null;
    m.height = null;
    const warnings = validateSketchSync([m], [], []);
    expect(warnings.some(w => w.type === 'missing_measurement')).toBe(true);
  });

  it('warns about marker with no linked opening', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    const warnings = validateSketchSync([m], [], []);
    expect(warnings.some(w => w.type === 'marker_no_opening')).toBe(true);
  });

  it('no opening warning when linked', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m.width = 35; m.height = 60;
    const openings = [{ openingNumber: 1 }];
    const warnings = validateSketchSync([m], openings, []);
    expect(warnings.some(w => w.type === 'marker_no_opening')).toBe(false);
    expect(warnings.some(w => w.type === 'missing_measurement')).toBe(false);
  });

  it('warns about joined group missing note', () => {
    const groups: MarkerGroupData[] = [{
      id: 'g1', sketchId: 's', groupType: 'mull_pair', groupNote: '',
      keepSeparateRows: true, needsReview: true, pricingReviewed: false, memberMarkerIds: ['a', 'b'],
    }];
    const warnings = validateSketchSync([], [], groups);
    expect(warnings.some(w => w.type === 'joined_missing_note')).toBe(true);
  });
});

describe('Tempered Glass Rules', () => {
  it('Rule A: tub within 60 inches triggers', () => {
    expect(checkTubShowerRule(48, 'yes')).toBe(true);
    expect(checkTubShowerRule(60, 'yes')).toBe(true);
  });

  it('Rule A: no tub does not trigger', () => {
    expect(checkTubShowerRule(null, 'no')).toBe(false);
    expect(checkTubShowerRule(72, 'yes')).toBe(false);
  });

  it('Rule B: low glass with large area triggers', () => {
    expect(checkLowGlassRule(14, 10)).toBe(true);
    expect(checkLowGlassRule(17, 15)).toBe(true);
  });

  it('Rule B: high glass does not trigger', () => {
    expect(checkLowGlassRule(18, 10)).toBe(false);
    expect(checkLowGlassRule(14, 8)).toBe(false);
  });

  it('glass area calculation', () => {
    expect(calculateGlassArea(36, 36)).toBe(9);
    expect(calculateGlassArea(48, 48)).toBe(16);
  });
});

describe('Clear Story Pricing', () => {
  it('first = $225, additional = $75', () => {
    const openings = [
      { openingNumber: 1, floorNumber: 2 },
      { openingNumber: 2, floorNumber: 2 },
      { openingNumber: 3, floorNumber: 1 },
    ];
    const charges = calculateClearStoryCharges(openings);
    expect(charges.length).toBe(2);
    expect(charges[0].charge).toBe(225);
    expect(charges[1].charge).toBe(75);
  });
});

describe('Fixture / Proximity Markers', () => {
  it('tub marker has no number and no opening', () => {
    const m = createMarkerData('s', 'tub', 200, 200, 'front', []);
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('🛁 Tub');
    expect(m.windowType).toBeNull();
    expect(m.markerType).toBe('fixture');
  });

  it('shower marker has no number', () => {
    const m = createMarkerData('s', 'shower', 200, 200, 'front', []);
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('🚿 Shower');
    expect(m.markerType).toBe('fixture');
  });

  it('stairs marker has no number', () => {
    const m = createMarkerData('s', 'stairs', 200, 200, 'front', []);
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('🪜 Stairs');
  });

  it('sink and toilet markers are fixtures', () => {
    const sink = createMarkerData('s', 'sink', 100, 100, 'front', []);
    const toilet = createMarkerData('s', 'toilet', 100, 100, 'front', []);
    expect(sink.markerType).toBe('fixture');
    expect(toilet.markerType).toBe('fixture');
  });

  it('fixture markers do not affect opening numbering', () => {
    const tub = createMarkerData('s', 'tub', 50, 50, 'front', []);
    const shower = createMarkerData('s', 'shower', 100, 100, 'front', [tub]);
    const window1 = createMarkerData('s', 'window_x', 200, 200, 'front', [tub, shower]);
    expect(window1.markerNumber).toBe(1); // tub & shower shouldn't count
  });

  it('tub/shower nearby triggers proximity tempered warning', () => {
    const tub = createMarkerData('s', 'tub', 200, 200, 'front', []);
    const window1 = createMarkerData('s', 'window_x', 250, 250, 'front', []);
    window1.width = 35; window1.height = 60;
    const frontDoor = createMarkerData('s', 'front_door', 0, 0, 'front', []);
    const warnings = validateSketchSync([tub, window1, frontDoor], [{ openingNumber: 1 }], []);
    expect(warnings.some(w => w.type === 'proximity_tempered_warning')).toBe(true);
  });

  it('distant tub does not trigger proximity warning', () => {
    const tub = createMarkerData('s', 'tub', 50, 50, 'front', []);
    const window1 = createMarkerData('s', 'window_x', 500, 500, 'front', []);
    window1.width = 35; window1.height = 60;
    const frontDoor = createMarkerData('s', 'front_door', 1000, 1000, 'front', []);
    const warnings = validateSketchSync([tub, window1, frontDoor], [{ openingNumber: 1 }], []);
    expect(warnings.some(w => w.type === 'proximity_tempered_warning')).toBe(false);
  });

  it('toilet and sink do NOT trigger proximity tempered warning', () => {
    const toilet = createMarkerData('s', 'toilet', 200, 200, 'front', []);
    const sink = createMarkerData('s', 'sink', 210, 210, 'front', []);
    const window1 = createMarkerData('s', 'window_x', 230, 230, 'front', []);
    window1.width = 35; window1.height = 60;
    const frontDoor = createMarkerData('s', 'front_door', 0, 0, 'front', []);
    const warnings = validateSketchSync([toilet, sink, window1, frontDoor], [{ openingNumber: 1 }], []);
    expect(warnings.some(w => w.type === 'proximity_tempered_warning')).toBe(false);
  });
});

describe('Material Markers & Measurement Rules', () => {
  it('brick marker is a material type with no number', () => {
    const m = createMarkerData('s', 'brick', 100, 100, 'front', []);
    expect(m.markerType).toBe('material');
    expect(m.markerNumber).toBeNull();
    expect(m.markerLabel).toBe('🧱 Brick');
    expect(m.windowType).toBeNull();
  });

  it('siding marker is a material type', () => {
    const m = createMarkerData('s', 'siding', 100, 100, 'front', []);
    expect(m.markerType).toBe('material');
    expect(m.markerLabel).toBe('🏠 Siding');
  });

  it('material markers do not affect window numbering', () => {
    const brick = createMarkerData('s', 'brick', 50, 50, 'front', []);
    const wood = createMarkerData('s', 'wood', 100, 100, 'front', [brick]);
    const window1 = createMarkerData('s', 'window_x', 200, 200, 'front', [brick, wood]);
    expect(window1.markerNumber).toBe(1);
  });

  it('brick = measure outside, smallest', () => {
    const g = getMeasurementGuidance('brick');
    expect(g.measureSide).toBe('outside');
    expect(g.rule).toBe('smallest_outside');
    expect(g.instruction).toContain('OUTSIDE');
    expect(g.instruction).toContain('SMALLEST');
  });

  it('siding = measure inside', () => {
    const g = getMeasurementGuidance('siding');
    expect(g.measureSide).toBe('inside');
    expect(g.rule).toBe('inside_standard');
  });

  it('stucco = measure inside', () => {
    const g = getMeasurementGuidance('stucco');
    expect(g.measureSide).toBe('inside');
  });

  it('wood = measure inside', () => {
    const g = getMeasurementGuidance('wood');
    expect(g.measureSide).toBe('inside');
  });

  it('mixed brick outer + wood inner = brick rule wins', () => {
    const g = resolveMixedMaterialRule('brick', 'wood');
    expect(g.measureSide).toBe('outside');
    expect(g.rule).toBe('smallest_outside');
  });

  it('mixed wood outer + brick inner = brick rule still wins', () => {
    const g = resolveMixedMaterialRule('wood', 'brick');
    expect(g.measureSide).toBe('outside');
    expect(g.rule).toBe('smallest_outside');
  });

  it('mixed siding + stucco = siding rule (outer)', () => {
    const g = resolveMixedMaterialRule('siding', 'stucco');
    expect(g.measureSide).toBe('inside');
    expect(g.rule).toBe('inside_standard');
  });

  it('null + null = defaults to siding rule', () => {
    const g = resolveMixedMaterialRule(null, null);
    expect(g.measureSide).toBe('inside');
  });

  it('detects nearby brick marker', () => {
    const brick = createMarkerData('s', 'brick', 100, 100, 'front', []);
    const window1 = createMarkerData('s', 'window_x', 200, 150, 'front', []);
    const material = detectNearbyMaterial(window1, [brick, window1]);
    expect(material).toBe('brick');
  });

  it('no material detected when too far', () => {
    const brick = createMarkerData('s', 'brick', 50, 50, 'front', []);
    const window1 = createMarkerData('s', 'window_x', 500, 500, 'front', []);
    const material = detectNearbyMaterial(window1, [brick, window1]);
    expect(material).toBeNull();
  });

  it('autoApplyMeasurementRule returns brick guidance near brick marker', () => {
    const brick = createMarkerData('s', 'brick', 100, 100, 'front', []);
    const window1 = createMarkerData('s', 'window_x', 200, 150, 'front', []);
    const guidance = autoApplyMeasurementRule(window1, [brick, window1]);
    expect(guidance).not.toBeNull();
    expect(guidance!.measureSide).toBe('outside');
    expect(guidance!.rule).toBe('smallest_outside');
  });
});

describe('Lockdown Checklist', () => {
  it('blocks export with unresolved items', () => {
    const markers: SketchMarkerData[] = [
      { ...createMarkerData('s', 'window_x', 100, 100, 'front', []), width: null, height: null },
    ];
    const checklist = buildLockdownChecklist(markers, [], [], []);
    const { blocked } = isExportBlocked(checklist);
    expect(blocked).toBe(true);
  });

  it('allows export when all checks pass', () => {
    const m = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m.width = 35; m.height = 60;
    const openings = [{ openingNumber: 1, glassPackage: 'LEE', removalType: 'ALUM', totalPrice: 500, pricingStatus: 'complete' }];
    const checklist = buildLockdownChecklist([m], openings, [], []);
    const blockerItems = checklist.filter(i => i.blocker && i.status === 'fail');
    // Should have no blocker failures (front door warning is non-blocker)
    expect(blockerItems.length).toBe(0);
  });
});

describe('getNextMarkerNumber — gap recovery', () => {
  it('returns 1 for empty markers', () => {
    expect(getNextMarkerNumber([])).toBe(1);
  });

  it('fills gap after deletion: [1, 3] → next is 2', () => {
    const m1 = createMarkerData('s', 'window_x', 10, 10, 'front', []);
    const m3 = createMarkerData('s', 'window_x', 30, 30, 'front', [m1]);
    // Force m3 to number 3 (simulating delete of #2)
    m3.markerNumber = 3;
    expect(getNextMarkerNumber([m1, m3])).toBe(2);
  });

  it('fills earliest gap: [1, 3, 5] → next is 2', () => {
    const m1 = createMarkerData('s', 'window_x', 10, 10, 'front', []);
    const m3 = { ...createMarkerData('s', 'slider', 30, 30, 'front', [m1]), markerNumber: 3 };
    const m5 = { ...createMarkerData('s', 'casement', 50, 50, 'front', [m1, m3 as any]), markerNumber: 5 };
    expect(getNextMarkerNumber([m1, m3 as any, m5 as any])).toBe(2);
  });

  it('returns max+1 when no gaps: [1, 2, 3] → next is 4', () => {
    const m1 = createMarkerData('s', 'window_x', 10, 10, 'front', []);
    const m2 = createMarkerData('s', 'window_x', 20, 20, 'front', [m1]);
    const m3 = createMarkerData('s', 'window_x', 30, 30, 'front', [m1, m2]);
    expect(getNextMarkerNumber([m1, m2, m3])).toBe(4);
  });

  it('ignores non-opening markers in numbering', () => {
    const tub = createMarkerData('s', 'tub', 50, 50, 'front', []);
    const note = createMarkerData('s', 'note', 60, 60, 'front', [tub]);
    const m1 = createMarkerData('s', 'window_x', 10, 10, 'front', [tub, note]);
    expect(m1.markerNumber).toBe(1);
    // After creating m1, next should be 2 (fixtures don't count)
    expect(getNextMarkerNumber([tub, note, m1])).toBe(2);
  });

  it('handles duplicate numbers by filling from 1', () => {
    // Two markers both numbered 2 — gap at 1
    const m = createMarkerData('s', 'window_x', 10, 10, 'front', []);
    m.markerNumber = 2;
    const m2 = createMarkerData('s', 'slider', 30, 30, 'front', [m]);
    m2.markerNumber = 2;
    expect(getNextMarkerNumber([m, m2])).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// Compact Renumbering Tests
// ═══════════════════════════════════════════════════════════════

describe('compactRenumberMarkers', () => {
  it('renumbers 10 markers with gaps (#2,3,5,6,7,8,9,10,11,12) to 1..10', () => {
    // This is the exact production bug scenario
    const nums = [2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
    const markers = nums.map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 50, 100, 'front', []);
      m.markerNumber = n;
      m.markerLabel = `X #${n}`;
      return m;
    });

    const { renumbered, numberMap, changed } = compactRenumberMarkers(markers);
    expect(changed).toBe(true);

    const openingMarkers = renumbered.filter(m => m.markerNumber !== null);
    expect(openingMarkers.length).toBe(10);

    const newNumbers = openingMarkers.map(m => m.markerNumber!).sort((a, b) => a - b);
    expect(newNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Verify mapping
    expect(numberMap.get(2)).toBe(1);
    expect(numberMap.get(3)).toBe(2);
    expect(numberMap.get(5)).toBe(3);
    expect(numberMap.get(12)).toBe(10);
  });

  it('does not change already-compact numbering', () => {
    const markers = [1, 2, 3].map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 50, 100, 'front', []);
      m.markerNumber = n;
      return m;
    });

    const { changed } = compactRenumberMarkers(markers);
    expect(changed).toBe(false);
  });

  it('preserves non-opening markers untouched', () => {
    const note = createMarkerData('s', 'note', 100, 100, 'front', []);
    const tub = createMarkerData('s', 'tub', 200, 200, 'front', []);
    const m1 = createMarkerData('s', 'window_x', 50, 50, 'front', []);
    m1.markerNumber = 5; // gap

    const { renumbered } = compactRenumberMarkers([note, tub, m1]);
    const noteResult = renumbered.find(m => m.markerSymbol === 'note');
    expect(noteResult?.markerNumber).toBeNull();
    const tubResult = renumbered.find(m => m.markerSymbol === 'tub');
    expect(tubResult?.markerNumber).toBeNull();
    const windowResult = renumbered.find(m => m.markerSymbol === 'window_x');
    expect(windowResult?.markerNumber).toBe(1);
  });

  it('updates markerLabel and linkedOrderRowNumber', () => {
    const m = createMarkerData('s', 'dh', 100, 100, 'front', []);
    m.markerNumber = 5;
    m.markerLabel = 'DH #5';

    const { renumbered } = compactRenumberMarkers([m]);
    const result = renumbered.find(m => m.markerSymbol === 'dh');
    expect(result?.markerNumber).toBe(1);
    expect(result?.markerLabel).toBe('DH #1');
    expect(result?.linkedOrderRowNumber).toBe(1);
  });

  it('handles empty array', () => {
    const { renumbered, changed } = compactRenumberMarkers([]);
    expect(renumbered.length).toBe(0);
    expect(changed).toBe(false);
  });

  it('handles deleted markers do not consume numbers', () => {
    // After deleting #1 and #4 from [1,2,3,4,5], remaining [2,3,5] → [1,2,3]
    const markers = [2, 3, 5].map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 50, 100, 'front', []);
      m.markerNumber = n;
      return m;
    });

    const { renumbered, changed } = compactRenumberMarkers(markers);
    expect(changed).toBe(true);
    const nums = renumbered.filter(m => m.markerNumber !== null).map(m => m.markerNumber!).sort((a, b) => a - b);
    expect(nums).toEqual([1, 2, 3]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Active Opening Selector Tests
// ═══════════════════════════════════════════════════════════════

describe('getActiveOpeningMarkers', () => {
  it('excludes non-opening markers from count', () => {
    const m1 = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    const note = createMarkerData('s', 'note', 200, 200, 'front', []);
    const tub = createMarkerData('s', 'tub', 300, 300, 'front', []);

    const { activeCount } = getActiveOpeningMarkers([m1, note, tub]);
    expect(activeCount).toBe(1);
  });

  it('warns about numbering gaps', () => {
    const markers = [1, 3].map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 100, 100, 'front', []);
      m.markerNumber = n;
      return m;
    });

    const { warnings } = getActiveOpeningMarkers(markers);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('gaps');
  });

  it('warns about duplicate numbers', () => {
    const m1 = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m1.markerNumber = 1;
    const m2 = createMarkerData('s', 'dh', 200, 200, 'front', []);
    m2.markerNumber = 1;

    const { warnings } = getActiveOpeningMarkers([m1, m2]);
    expect(warnings.some(w => w.includes('Duplicate'))).toBe(true);
  });

  it('document count equals active marker count, not max number', () => {
    // 10 markers numbered up to 12 → count should be 10, not 12
    const nums = [2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
    const markers = nums.map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 50, 100, 'front', []);
      m.markerNumber = n;
      return m;
    });

    const { activeCount } = getActiveOpeningMarkers(markers);
    expect(activeCount).toBe(10);
    expect(activeCount).not.toBe(12); // must NOT use highest number as count
  });
});

// ═══════════════════════════════════════════════════════════════
// Reconciliation Tests
// ═══════════════════════════════════════════════════════════════

describe('reconcileSketchOpenings', () => {
  it('detects orphan openings (DB row without sketch marker)', () => {
    const m1 = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m1.markerNumber = 1;
    const openings = [
      { openingNumber: 1 },
      { openingNumber: 4 }, // orphan — no marker #4
    ];

    const result = reconcileSketchOpenings([m1], openings);
    expect(result.issues.some(i => i.type === 'orphan_opening' && i.openingNumber === 4)).toBe(true);
  });

  it('detects orphan markers (marker without DB opening)', () => {
    const m1 = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m1.markerNumber = 1;

    const result = reconcileSketchOpenings([m1], []);
    expect(result.issues.some(i => i.type === 'orphan_marker' && i.markerNumber === 1)).toBe(true);
  });

  it('detects numbering gaps', () => {
    const markers = [1, 3].map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 100, 100, 'front', []);
      m.markerNumber = n;
      return m;
    });

    const result = reconcileSketchOpenings(markers, [{ openingNumber: 1 }, { openingNumber: 3 }]);
    expect(result.needsRenumber).toBe(true);
    expect(result.issues.some(i => i.type === 'number_gap')).toBe(true);
  });

  it('excludes soft-deleted openings from active count', () => {
    const m1 = createMarkerData('s', 'window_x', 100, 100, 'front', []);
    m1.markerNumber = 1;
    const openings = [
      { openingNumber: 1, deletedAt: null },
      { openingNumber: 2, deletedAt: '2024-01-01T00:00:00Z' }, // soft-deleted
    ];

    const result = reconcileSketchOpenings([m1], openings);
    expect(result.openingDbCount).toBe(1); // only 1 active
  });

  it('reports counts match when sketch and DB agree', () => {
    const markers = [1, 2, 3].map((n, i) => {
      const m = createMarkerData('s', 'window_x', i * 100, 100, 'front', []);
      m.markerNumber = n;
      return m;
    });
    const openings = [
      { openingNumber: 1 },
      { openingNumber: 2 },
      { openingNumber: 3 },
    ];

    const result = reconcileSketchOpenings(markers, openings);
    expect(result.countsMatch).toBe(true);
    expect(result.needsRenumber).toBe(false);
    expect(result.markerActiveCount).toBe(3);
    expect(result.openingDbCount).toBe(3);
  });
});
