import type { SketchMarkerData, MarkerGroupData } from './sketchSync';

export interface SketchAnnotation {
  id: string;
  appointmentId: string;
  sketchId?: string | null;
  markerId?: string | null;
  openingId?: string | null;
  type: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConsistencyIssue {
  category: 'sketch' | 'orderForm' | 'contract' | 'pricing';
  field: string;
  openingNumber?: number;
  expected: string;
  actual: string;
  severity: 'blocker' | 'warning';
  fixAction?: string;
}

export interface PricingLineItem {
  openingNumber: number;
  label: string;
  category: 'product' | 'option' | 'labor';
  optionCode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function validateSketchOrderContractConsistency(
  markers: SketchMarkerData[],
  openings: any[],
  groups: MarkerGroupData[],
  annotations: SketchAnnotation[],
  pricingResult: { lineItems: PricingLineItem[]; total: number } | null,
): { valid: boolean; issues: ConsistencyIssue[] } {
  const issues: ConsistencyIssue[] = [];

  const activeMarkers = markers.filter(
    m => m.markerNumber !== null && !['note', 'arrow', 'dimension_line', 'room_label', 'elevation_label', 'number_marker', 'tempered_marker', 'obscure_marker', 'bath_marker', 'clear_story', 'second_floor'].includes(m.markerSymbol)
  );

  const activeOpenings = openings.filter(o => !o.deletedAt);

  // 1. Every active marker has a linked opening in DB
  for (const marker of activeMarkers) {
    const linked = activeOpenings.find(o => o.openingNumber === marker.markerNumber);
    if (!linked) {
      issues.push({
        category: 'sketch',
        field: 'openingNumber',
        openingNumber: marker.markerNumber || undefined,
        expected: `Opening #${marker.markerNumber} to exist`,
        actual: 'No opening record in database',
        severity: 'blocker',
        fixAction: 'sync_markers',
      });
    }
  }

  // 2. Every active opening in DB has a sketch marker
  for (const opening of activeOpenings) {
    const marker = activeMarkers.find(m => m.markerNumber === opening.openingNumber);
    if (!marker) {
      issues.push({
        category: 'contract',
        field: 'markerNumber',
        openingNumber: opening.openingNumber,
        expected: `Sketch marker #${opening.openingNumber} to exist`,
        actual: 'No sketch marker on canvas',
        severity: 'blocker',
        fixAction: 'delete_stale_opening',
      });
    }
  }

  // 3. Grid configuration match between marker and opening
  for (const marker of activeMarkers) {
    const opening = activeOpenings.find(o => o.openingNumber === marker.markerNumber);
    if (!opening) continue;

    if (
      opening.gridPattern !== marker.gridPattern ||
      opening.gridProfile !== marker.gridProfile ||
      opening.gridVerticalCount !== marker.gridVerticalCount ||
      opening.gridHorizontalCount !== marker.gridHorizontalCount
    ) {
      issues.push({
        category: 'orderForm',
        field: 'gridPattern',
        openingNumber: marker.markerNumber || undefined,
        expected: `${marker.gridPattern} ${marker.gridVerticalCount}x${marker.gridHorizontalCount} (${marker.gridProfile})`,
        actual: `${opening.gridPattern} ${opening.gridVerticalCount}x${opening.gridHorizontalCount} (${opening.gridProfile})`,
        severity: 'blocker',
        fixAction: 'sync_grids',
      });
    }
  }

  // 4. Stucco removal logic
  for (const opening of activeOpenings) {
    const ext = (opening.exteriorSurface || opening.exteriorType || '').toLowerCase();
    const rem = (opening.removalType || '').toUpperCase();
    if (ext.includes('stucco') && rem === 'ALUM' && !opening.stuccoRemoval) {
      issues.push({
        category: 'pricing',
        field: 'stuccoRemoval',
        openingNumber: opening.openingNumber,
        expected: 'stuccoRemoval: true',
        actual: 'stuccoRemoval: false',
        severity: 'warning',
        fixAction: 'set_stucco_removal',
      });
    }
  }

  // 5. Special shape specifications
  for (const opening of activeOpenings) {
    const isSpecialty = opening.productCategory === 'special_shape' || (opening.productModel && opening.productModel.startsWith('S1'));
    if (isSpecialty) {
      if (!opening.shapeType) {
        issues.push({
          category: 'orderForm',
          field: 'shapeType',
          openingNumber: opening.openingNumber,
          expected: 'Selected shapeType',
          actual: 'shapeType: missing',
          severity: 'blocker',
        });
      }
      if (opening.radius === undefined || opening.radius === null) {
        issues.push({
          category: 'orderForm',
          field: 'radius',
          openingNumber: opening.openingNumber,
          expected: 'Radius / Rise measurement value',
          actual: 'radius: missing',
          severity: 'blocker',
        });
      }
      if (opening.legHeight === undefined || opening.legHeight === null) {
        issues.push({
          category: 'orderForm',
          field: 'legHeight',
          openingNumber: opening.openingNumber,
          expected: 'Leg height measurement value',
          actual: 'legHeight: missing',
          severity: 'blocker',
        });
      }
    }
  }

  // 6. Mullion group checks
  for (const opening of activeOpenings) {
    const marker = activeMarkers.find(m => m.markerNumber === opening.openingNumber);
    if (!marker) continue;

    const group = groups.find(g => g.memberMarkerIds.includes(marker.id));
    if (group && (group.groupType === 'mull_pair' || group.groupType.startsWith('mull'))) {
      if (!opening.installMullion) {
        issues.push({
          category: 'pricing',
          field: 'installMullion',
          openingNumber: opening.openingNumber,
          expected: 'installMullion: true',
          actual: 'installMullion: false',
          severity: 'blocker',
          fixAction: 'set_mullion',
        });
      }
      const isStructural = group.mullType === 'structural';
      if (opening.structuralMullion !== isStructural) {
        issues.push({
          category: 'pricing',
          field: 'structuralMullion',
          openingNumber: opening.openingNumber,
          expected: `structuralMullion: ${isStructural}`,
          actual: `structuralMullion: ${opening.structuralMullion}`,
          severity: 'blocker',
          fixAction: 'sync_mull_type',
        });
      }
    }
  }

  // 7. Glass restriction check
  for (const opening of activeOpenings) {
    const glass = opening.glassPackage || '';
    if (!['LE', 'LEE'].includes(glass)) {
      issues.push({
        category: 'contract',
        field: 'glassPackage',
        openingNumber: opening.openingNumber,
        expected: 'LE or LEE glass package',
        actual: `Glass package: ${glass || 'none'}`,
        severity: 'blocker',
        fixAction: 'set_glass_package',
      });
    }
  }

  // 8. Foam enhanced default check
  for (const opening of activeOpenings) {
    if (opening.foamEnhanced) {
      issues.push({
        category: 'pricing',
        field: 'foamEnhanced',
        openingNumber: opening.openingNumber,
        expected: 'foamEnhanced: false (default)',
        actual: 'foamEnhanced: true',
        severity: 'warning',
        fixAction: 'disable_foam',
      });
    }
  }

  // 9. Screen option default check
  for (const opening of activeOpenings) {
    const cat = (opening.productCategory || '').toLowerCase();
    const isPic = cat.includes('picture');
    const expectedScreen = isPic ? 'No Screen' : 'Half Screen';
    if (opening.screenOption !== expectedScreen) {
      issues.push({
        category: 'pricing',
        field: 'screenOption',
        openingNumber: opening.openingNumber,
        expected: expectedScreen,
        actual: opening.screenOption || 'none',
        severity: 'warning',
        fixAction: 'reset_screen',
      });
    }
  }

  // 10. Pricing total check
  if (pricingResult) {
    const summedOpenings = activeOpenings.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const diff = Math.abs(summedOpenings - pricingResult.total);
    if (diff > 0.05) {
      issues.push({
        category: 'pricing',
        field: 'totalPrice',
        expected: `Pricing engine total: $${pricingResult.total.toFixed(2)}`,
        actual: `Sum of openings: $${summedOpenings.toFixed(2)}`,
        severity: 'blocker',
        fixAction: 'recalculate_pricing',
      });
    }
  }

  return {
    valid: !issues.some(i => i.severity === 'blocker'),
    issues,
  };
}
