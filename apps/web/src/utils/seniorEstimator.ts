// ═══════════════════════════════════════════════════════════
// Senior Estimator AI — Cross-opening mistake detection
// Reviews the ENTIRE job like a senior estimator would,
// catching inconsistencies, likely typos, forgotten items,
// impossible geometry, and unusual configurations.
// ═══════════════════════════════════════════════════════════

export type AlertSeverity = 'critical' | 'warning' | 'suggestion';

export interface EstimatorAlert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  detail: string;
  openingNumbers: number[];
  fix?: { label: string; fields: Record<string, any>; targets: number[] };
}

// ── Main Review ──────────────────────────────────────────
export function reviewJob(openings: any[]): EstimatorAlert[] {
  if (openings.length === 0) return [];
  const alerts: EstimatorAlert[] = [];

  alerts.push(...checkDimensionAnomalies(openings));
  alerts.push(...checkImpossibleGeometry(openings));
  alerts.push(...checkForgottenTempered(openings));
  alerts.push(...checkForgottenScreens(openings));
  alerts.push(...checkForgottenDepth(openings));
  alerts.push(...checkInvalidGrids(openings));
  alerts.push(...checkUIRangeAnomalies(openings));
  alerts.push(...checkRoomInconsistencies(openings));
  alerts.push(...checkLikelyTypos(openings));
  alerts.push(...checkColorInconsistencies(openings));
  alerts.push(...checkMissingFields(openings));
  alerts.push(...checkPricingAnomalies(openings));

  return alerts;
}

// ── 1. Dimension Anomalies ───────────────────────────────
// Detect dimensions that are wildly different from siblings
function checkDimensionAnomalies(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];
  const measured = openings.filter(o => o.width > 0 && o.height > 0);
  if (measured.length < 4) return alerts;

  const widths = measured.map(o => o.width);
  const heights = measured.map(o => o.height);
  const avgW = widths.reduce((a, b) => a + b, 0) / widths.length;
  const avgH = heights.reduce((a, b) => a + b, 0) / heights.length;
  const stdW = Math.sqrt(widths.reduce((s, w) => s + (w - avgW) ** 2, 0) / widths.length);
  const stdH = Math.sqrt(heights.reduce((s, h) => s + (h - avgH) ** 2, 0) / heights.length);

  for (const o of measured) {
    // Flag dimensions > 2 std deviations from mean (likely typo or misread)
    if (stdW > 3 && Math.abs(o.width - avgW) > 2 * stdW) {
      alerts.push({
        id: `dim-w-${o.openingNumber}`, severity: 'warning', category: 'Dimensions',
        title: `#${o.openingNumber} width is unusual`,
        detail: `Width ${o.width}" is far from the job average of ${avgW.toFixed(0)}". Verify measurement.`,
        openingNumbers: [o.openingNumber],
      });
    }
    if (stdH > 3 && Math.abs(o.height - avgH) > 2 * stdH) {
      alerts.push({
        id: `dim-h-${o.openingNumber}`, severity: 'warning', category: 'Dimensions',
        title: `#${o.openingNumber} height is unusual`,
        detail: `Height ${o.height}" is far from the job average of ${avgH.toFixed(0)}". Verify measurement.`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  // Same-room openings with very different dimensions
  const roomMap = groupByRoom(measured);
  for (const [room, ops] of roomMap) {
    if (ops.length < 2) continue;
    for (let i = 1; i < ops.length; i++) {
      const a = ops[0], b = ops[i];
      const wDiff = Math.abs(a.width - b.width);
      const hDiff = Math.abs(a.height - b.height);
      if (wDiff > 15 || hDiff > 15) {
        alerts.push({
          id: `dim-room-${a.openingNumber}-${b.openingNumber}`, severity: 'suggestion', category: 'Dimensions',
          title: `${room}: #${a.openingNumber} and #${b.openingNumber} differ significantly`,
          detail: `Same room, but ${wDiff > 15 ? `widths differ by ${wDiff}"` : ''}${wDiff > 15 && hDiff > 15 ? ' and ' : ''}${hDiff > 15 ? `heights differ by ${hDiff}"` : ''}. Verify both measurements.`,
          openingNumbers: [a.openingNumber, b.openingNumber],
        });
      }
    }
  }

  return alerts;
}

// ── 2. Impossible Geometry ───────────────────────────────
function checkImpossibleGeometry(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];

  for (const o of openings) {
    if (!o.width || !o.height) continue;

    // Too small to be real
    if (o.width > 0 && o.width < 10) {
      alerts.push({
        id: `geo-small-w-${o.openingNumber}`, severity: 'critical', category: 'Geometry',
        title: `#${o.openingNumber} width too small`,
        detail: `Width ${o.width}" is below minimum manufacturable size. Did you enter feet instead of inches?`,
        openingNumbers: [o.openingNumber],
      });
    }
    if (o.height > 0 && o.height < 10) {
      alerts.push({
        id: `geo-small-h-${o.openingNumber}`, severity: 'critical', category: 'Geometry',
        title: `#${o.openingNumber} height too small`,
        detail: `Height ${o.height}" is below minimum manufacturable size. Did you enter feet instead of inches?`,
        openingNumbers: [o.openingNumber],
      });
    }

    // Too large to be a window
    if (o.width > 120) {
      alerts.push({
        id: `geo-big-w-${o.openingNumber}`, severity: 'critical', category: 'Geometry',
        title: `#${o.openingNumber} width ${o.width}" exceeds 10 feet`,
        detail: `This is unusually large for a single window. Should this be two openings?`,
        openingNumbers: [o.openingNumber],
      });
    }
    if (o.height > 96) {
      alerts.push({
        id: `geo-big-h-${o.openingNumber}`, severity: 'critical', category: 'Geometry',
        title: `#${o.openingNumber} height ${o.height}" exceeds 8 feet`,
        detail: `This is unusually tall. Verify measurement and check if tempered glass is required.`,
        openingNumbers: [o.openingNumber],
      });
    }

    // Width/height swapped? (height much larger than width for a slider)
    if (o.productCategory === 'slider' && o.height > o.width * 1.5) {
      alerts.push({
        id: `geo-swap-${o.openingNumber}`, severity: 'warning', category: 'Geometry',
        title: `#${o.openingNumber} slider taller than wide`,
        detail: `Slider is ${o.width}" W × ${o.height}" H — did you swap width and height?`,
        openingNumbers: [o.openingNumber],
      });
    }

    // Picture window that's very narrow
    if (o.productCategory === 'picture' && o.width < 20 && o.height > 40) {
      alerts.push({
        id: `geo-narrow-pic-${o.openingNumber}`, severity: 'suggestion', category: 'Geometry',
        title: `#${o.openingNumber} very narrow picture window`,
        detail: `${o.width}" wide — is this actually a sidelight? Consider casement for ventilation.`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  return alerts;
}

// ── 3. Forgotten Tempered ────────────────────────────────
function checkForgottenTempered(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];

  for (const o of openings) {
    if (o.temperedGlass === 'full') continue;
    const room = (o.roomLocation || '').toLowerCase();

    // Bathrooms
    if (room.match(/bath|shower|powder|lavatory|half bath/)) {
      alerts.push({
        id: `temp-bath-${o.openingNumber}`, severity: 'critical', category: 'Tempered',
        title: `#${o.openingNumber} bathroom missing tempered`,
        detail: `${o.roomLocation} — bathroom windows require tempered glass per building code.`,
        openingNumbers: [o.openingNumber],
        fix: { label: 'Add tempered', fields: { temperedGlass: 'full' }, targets: [o.openingNumber] },
      });
    }

    // Large panes near floor (>9 sq ft with bottom < 18")
    if (o.width > 0 && o.height > 0) {
      const sqft = (o.width * o.height) / 144;
      if (sqft > 9 && o.floorNumber === 1) {
        alerts.push({
          id: `temp-large-${o.openingNumber}`, severity: 'warning', category: 'Tempered',
          title: `#${o.openingNumber} large pane — check tempered`,
          detail: `${sqft.toFixed(1)} sq ft — if bottom edge is within 18" of floor, tempered glass is required.`,
          openingNumbers: [o.openingNumber],
        });
      }
    }

    // Patio doors always need tempered
    if (o.productCategory === 'patio_door') {
      alerts.push({
        id: `temp-door-${o.openingNumber}`, severity: 'critical', category: 'Tempered',
        title: `#${o.openingNumber} patio door missing tempered`,
        detail: `Patio doors require tempered glass. This is a building code requirement.`,
        openingNumbers: [o.openingNumber],
        fix: { label: 'Add tempered', fields: { temperedGlass: 'full' }, targets: [o.openingNumber] },
      });
    }
  }

  return alerts;
}

// ── 4. Forgotten Screens ─────────────────────────────────
function checkForgottenScreens(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];
  const operable = openings.filter(o =>
    o.productCategory && !['picture', 'eyebrow', 'circle_top', 'quarter_arch'].includes(o.productCategory)
  );

  for (const o of operable) {
    if (!o.screenOption || o.screenOption === 'None' || o.screenOption === 'No Screen') {
      alerts.push({
        id: `scr-missing-${o.openingNumber}`, severity: 'suggestion', category: 'Screens',
        title: `#${o.openingNumber} has no screen`,
        detail: `${o.productCategory?.replace(/_/g, ' ')} is operable but has no screen. Intentional?`,
        openingNumbers: [o.openingNumber],
        fix: { label: 'Add standard screen', fields: { screenOption: 'Standard' }, targets: [o.openingNumber] },
      });
    }
  }

  return alerts;
}

// ── 5. Forgotten Depth / Install Notes ───────────────────
function checkForgottenDepth(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];
  const brickOpenings = openings.filter(o =>
    (o.exteriorType || '').toLowerCase().includes('brick')
  );

  for (const o of brickOpenings) {
    if (!o.installNotes || !o.installNotes.toLowerCase().includes('depth')) {
      alerts.push({
        id: `depth-brick-${o.openingNumber}`, severity: 'warning', category: 'Install',
        title: `#${o.openingNumber} brick — no depth noted`,
        detail: `Brick openings need return depth measurement for proper installation. Add to install notes.`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  // Upper floor without ladder/scaffold note
  const upperFloor = openings.filter(o => (o.floorNumber || 1) >= 2);
  for (const o of upperFloor) {
    if (!o.installNotes || !o.installNotes.toLowerCase().match(/ladder|scaffold|access|upper|second/)) {
      alerts.push({
        id: `depth-upper-${o.openingNumber}`, severity: 'suggestion', category: 'Install',
        title: `#${o.openingNumber} upper floor — no access note`,
        detail: `Floor ${o.floorNumber} — document ladder/scaffold requirements for installers.`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  return alerts;
}

// ── 6. Invalid Grids ─────────────────────────────────────
function checkInvalidGrids(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];

  for (const o of openings) {
    // Grids on picture windows — uncommon, flag it
    if (o.productCategory === 'picture' && o.gridStyle && o.gridStyle !== 'None') {
      alerts.push({
        id: `grid-pic-${o.openingNumber}`, severity: 'suggestion', category: 'Grids',
        title: `#${o.openingNumber} picture window has grids`,
        detail: `Picture windows with ${o.gridStyle} grids — is this intentional? Grids on picture windows are uncommon.`,
        openingNumbers: [o.openingNumber],
      });
    }

    // Inconsistent grids in same room
    // (handled in checkRoomInconsistencies)
  }

  return alerts;
}

// ── 7. UI Range Anomalies ────────────────────────────────
function checkUIRangeAnomalies(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];

  for (const o of openings) {
    if (!o.width || !o.height) continue;
    const ui = o.width + o.height;

    // Extremely low UI — likely a typo
    if (ui > 0 && ui < 40) {
      alerts.push({
        id: `ui-low-${o.openingNumber}`, severity: 'critical', category: 'Dimensions',
        title: `#${o.openingNumber} UI ${ui}" is suspiciously low`,
        detail: `Combined width + height = ${ui}". Standard windows are 60-150 UI. Did you enter partial dimensions?`,
        openingNumbers: [o.openingNumber],
      });
    }

    // Extremely high UI
    if (ui > 180) {
      alerts.push({
        id: `ui-high-${o.openingNumber}`, severity: 'warning', category: 'Dimensions',
        title: `#${o.openingNumber} UI ${ui}" is very high`,
        detail: `This is a very large opening. Verify measurements and check max UI limits for the selected product.`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  return alerts;
}

// ── 8. Room Inconsistencies ──────────────────────────────
function checkRoomInconsistencies(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];
  const roomMap = groupByRoom(openings);

  for (const [room, ops] of roomMap) {
    if (ops.length < 2) continue;

    // Different grids in same room
    const grids = new Set(ops.map(o => o.gridStyle).filter(Boolean));
    if (grids.size > 1) {
      alerts.push({
        id: `room-grid-${room}`, severity: 'warning', category: 'Consistency',
        title: `${room}: mixed grid styles`,
        detail: `Openings in ${room} have different grids: ${Array.from(grids).join(', ')}. Usually all openings in a room match.`,
        openingNumbers: ops.map(o => o.openingNumber),
      });
    }

    // Different colors in same room
    const intColors = new Set(ops.map(o => o.interiorColor).filter(Boolean));
    if (intColors.size > 1) {
      alerts.push({
        id: `room-color-${room}`, severity: 'warning', category: 'Consistency',
        title: `${room}: mixed interior colors`,
        detail: `Openings in ${room} have different interior colors: ${Array.from(intColors).join(', ')}. This is unusual.`,
        openingNumbers: ops.map(o => o.openingNumber),
      });
    }

    // Different product types in same room (acceptable but worth noting)
    const types = new Set(ops.map(o => o.productCategory).filter(Boolean));
    if (types.size > 1 && !types.has('picture')) {
      alerts.push({
        id: `room-type-${room}`, severity: 'suggestion', category: 'Consistency',
        title: `${room}: mixed window types`,
        detail: `${room} has ${Array.from(types).map(t => (t as string).replace(/_/g, ' ')).join(' and ')}. Verify this is intentional.`,
        openingNumbers: ops.map(o => o.openingNumber),
      });
    }
  }

  return alerts;
}

// ── 9. Likely Typos ──────────────────────────────────────
function checkLikelyTypos(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];

  for (const o of openings) {
    if (!o.width || !o.height) continue;

    // Whole-inch dimensions (unusual — most windows have fractions)
    if (o.width === Math.round(o.width) && o.height === Math.round(o.height) && o.width > 20) {
      // Check if rounded to nearest inch (should have fractions like 35 3/8)
      if (o.width % 1 === 0 && o.height % 1 === 0) {
        alerts.push({
          id: `typo-whole-${o.openingNumber}`, severity: 'suggestion', category: 'Dimensions',
          title: `#${o.openingNumber} has whole-inch dimensions`,
          detail: `${o.width}" × ${o.height}" — most window measurements include fractions (e.g., 35 3/8"). Did you round?`,
          openingNumbers: [o.openingNumber],
        });
      }
    }

    // Identical width and height (unusual)
    if (o.width === o.height && o.width > 20) {
      alerts.push({
        id: `typo-square-${o.openingNumber}`, severity: 'suggestion', category: 'Dimensions',
        title: `#${o.openingNumber} is perfectly square`,
        detail: `${o.width}" × ${o.height}" — exactly square windows are uncommon. Did you accidentally duplicate a measurement?`,
        openingNumbers: [o.openingNumber],
      });
    }

    // Very common measurement swap: 35 and 53
    if ((o.width === 53 && o.height === 35) || (o.width === 35 && o.height === 53)) {
      // This is actually common and fine, but check if it's a slider
      if (o.productCategory === 'double_hung' && o.width > o.height) {
        alerts.push({
          id: `typo-swap-${o.openingNumber}`, severity: 'warning', category: 'Dimensions',
          title: `#${o.openingNumber} double hung is wider than tall`,
          detail: `${o.width}" W × ${o.height}" H — double hungs are typically taller than wide. Did you swap width and height?`,
          openingNumbers: [o.openingNumber],
        });
      }
    }

    // Double hung wider than tall (general check)
    if (o.productCategory === 'double_hung' && o.width > o.height && o.width > 40) {
      alerts.push({
        id: `typo-dh-wide-${o.openingNumber}`, severity: 'warning', category: 'Dimensions',
        title: `#${o.openingNumber} double hung is wider than tall`,
        detail: `${o.width}" W × ${o.height}" H — double hungs are typically taller than wide. Verify orientation.`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  return alerts;
}

// ── 10. Color Inconsistencies ────────────────────────────
function checkColorInconsistencies(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];
  if (openings.length < 3) return alerts;

  // One opening has a different exterior color than all others
  const extColors = openings.map(o => o.exteriorColor).filter(Boolean);
  const extCounts: Record<string, number> = {};
  for (const c of extColors) extCounts[c] = (extCounts[c] || 0) + 1;
  const extEntries = Object.entries(extCounts).sort((a, b) => b[1] - a[1]);

  if (extEntries.length >= 2 && extEntries[1][1] <= 1 && extEntries[0][1] >= 3) {
    const outlierColor = extEntries[1][0];
    const outliers = openings.filter(o => o.exteriorColor === outlierColor);
    alerts.push({
      id: 'color-ext-outlier', severity: 'warning', category: 'Consistency',
      title: `Opening with different exterior color`,
      detail: `${outliers.length} opening(s) have ${outlierColor} exterior while ${extEntries[0][1]} others have ${extEntries[0][0]}. Is this intentional?`,
      openingNumbers: outliers.map(o => o.openingNumber),
    });
  }

  return alerts;
}

// ── 11. Missing Fields ───────────────────────────────────
function checkMissingFields(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];

  // Openings with dimensions but no product type
  const noProduct = openings.filter(o => o.width > 0 && !o.productCategory);
  if (noProduct.length > 0) {
    alerts.push({
      id: 'missing-product', severity: 'warning', category: 'Completeness',
      title: `${noProduct.length} opening(s) missing product type`,
      detail: `Openings ${noProduct.map(o => `#${o.openingNumber}`).join(', ')} have measurements but no product selected.`,
      openingNumbers: noProduct.map(o => o.openingNumber),
    });
  }

  // Openings with no elevation
  const noElev = openings.filter(o => !o.elevation && o.width > 0);
  if (noElev.length > 0) {
    alerts.push({
      id: 'missing-elev', severity: 'suggestion', category: 'Completeness',
      title: `${noElev.length} opening(s) missing elevation`,
      detail: `Elevation (front/rear/left/right) helps organize the job for installers.`,
      openingNumbers: noElev.map(o => o.openingNumber),
    });
  }

  return alerts;
}

// ── 12. Pricing Anomalies ────────────────────────────────
function checkPricingAnomalies(openings: any[]): EstimatorAlert[] {
  const alerts: EstimatorAlert[] = [];
  const priced = openings.filter(o => o.totalPrice > 0);
  if (priced.length < 3) return alerts;

  const prices = priced.map(o => o.totalPrice);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  for (const o of priced) {
    // Price is more than 3x the average
    if (o.totalPrice > avg * 3) {
      alerts.push({
        id: `price-high-${o.openingNumber}`, severity: 'warning', category: 'Pricing',
        title: `#${o.openingNumber} price is 3x+ above average`,
        detail: `$${o.totalPrice.toFixed(0)} vs average $${avg.toFixed(0)}. Verify pricing is correct.`,
        openingNumbers: [o.openingNumber],
      });
    }
    // Price is less than 1/3 the average
    if (o.totalPrice < avg / 3 && o.totalPrice > 0) {
      alerts.push({
        id: `price-low-${o.openingNumber}`, severity: 'warning', category: 'Pricing',
        title: `#${o.openingNumber} price is 3x+ below average`,
        detail: `$${o.totalPrice.toFixed(0)} vs average $${avg.toFixed(0)}. Was a discount applied incorrectly?`,
        openingNumbers: [o.openingNumber],
      });
    }
  }

  return alerts;
}

// ── Helper ───────────────────────────────────────────────
function groupByRoom(openings: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const o of openings) {
    const room = o.roomLocation || 'Unassigned';
    if (!map.has(room)) map.set(room, []);
    map.get(room)!.push(o);
  }
  return map;
}
