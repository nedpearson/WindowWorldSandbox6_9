import { Opening } from '@prisma/client';

export function resolveWindowWorldModel(opening: Partial<Opening>): string | null {
  const modelStr = (opening.seriesModel || opening.productModel || '').trim();
  if (modelStr && !isNaN(Number(modelStr))) {
    return modelStr;
  }
  
  // Also check if they included "-FE" like "3001-FE"
  if (modelStr.match(/^\d+[-a-zA-Z0-9]*$/)) {
    return modelStr;
  }

  const category = (opening.productCategory || '').toLowerCase().replace(/_/g, ' ');
  
  let model = '';
  if (category.includes('double hung') || category === 'dh' || category.includes('single hung') || category === 'sh') {
    model = '3001'; // 3001 is standard double hung / single hung family
  } else if (category.includes('oriel')) {
    model = 'ORIEL'; // Specialty Oriel window
  } else if (category.includes('slider') || category === 'sl') {
    // Check if it's a 3-lite slider
    if (opening.productType?.toLowerCase().includes('3-lite') || opening.customerNotes?.toLowerCase().includes('3-lite')) {
      model = '3003';
    } else {
      model = '3002'; // 3002 is 2-lite slider
    }
  } else if (category.includes('picture') || category === 'pic') {
    model = '3004'; // 3004 is picture window
  } else if (category.includes('casement') || category === 'cas') {
    if (opening.productType?.toLowerCase().includes('double') || opening.customerNotes?.toLowerCase().includes('double')) {
      model = '0972'; // 0972 is double casement
    } else {
      model = '0971'; // 0971 is single casement
    }
  } else if (category.includes('awning') || category === 'awn') {
    model = '0951'; // 0951 is vinyl awning
  } else {
    // If we can't safely resolve it, return "TBD" so it doesn't block order generation.
    model = 'TBD';
  }

  // Append -FE if foam enhanced (used for DH4000FE tally)
  if (opening.foamEnhanced && model !== 'TBD') {
    model += '-FE';
  }
  
  return model;
}

export function abbreviateWindowWorldColor(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = value.trim().toLowerCase();
  
  const map: Record<string, string> = {
    'white': 'WHT',
    'wh': 'WHT',
    'wht': 'WHT',
    'almond': 'ALM',
    'alm': 'ALM',
    'bronze': 'BRZ',
    'brz': 'BRZ',
    'black': 'BLK',
    'blk': 'BLK',
    'clay': 'CLAY',
    'tan': 'TAN',
    'beige': 'BGE',
    'bge': 'BGE',
    'brown': 'BRN',
    'brn': 'BRN',
    'sandstone': 'SAND',
    'sand': 'SAND',
    'custom': 'CUST',
    'other': 'OTH',
  };

  if (map[normalized]) return map[normalized];
  
  // If we don't know it, return CUST or OTH and let user add notes
  return 'OTH';
}

export function abbreviateType(type: string | null | undefined, category: 'remove' | 'install' | 'trim' | 'exterior'): string {
  if (!type) return '';
  const normalized = type.trim().toLowerCase().replace(/_/g, ' ');

  if (category === 'exterior') {
    if (normalized.includes('brick')) return 'BRICK';
    if (normalized.includes('siding')) return 'SIDING';
    if (normalized.includes('stucco')) return 'STUCCO';
    if (normalized.includes('wood')) return 'WOOD';
    if (normalized.includes('hardie')) return 'HARDIE';
  }

  if (category === 'trim') {
    if (normalized.includes('vinyl')) return 'VINYL';
    if (normalized.includes('alum')) return 'ALUM';
    if (normalized.includes('wood')) return 'WOOD';
  }

  if (category === 'remove') {
    if (normalized.includes('alum')) return 'ALUM';
    if (normalized.includes('wood')) return 'WOOD';
    if (normalized.includes('vinyl')) return 'VINYL';
    if (normalized.includes('steel')) return 'STEEL';
    if (normalized.includes('storm')) return 'STORM';
    if (normalized.includes('full')) return 'ALUM'; // Full tearout often defaults to ALUM or similar
    if (normalized.includes('insert')) return 'ALUM';
  }

  if (category === 'install') {
    if (normalized.includes('ext')) return 'EXT';
    if (normalized.includes('int')) return 'INT';
    if (normalized.includes('full')) return 'FULL';
  }

  return type.toUpperCase().slice(0, 5); // Fallback abbreviation
}

/**
 * Apply business-safe defaults to an opening before Excel generation.
 * Ensures workbook cells are never blank for standard fields.
 * Does NOT mutate the original — returns a new object.
 */
export function resolveWorkbookDefaults(opening: Partial<Opening>): Partial<Opening> {
  const resolved = { ...opening };

  // Glass package
  if (!resolved.glassPackage) {
    resolved.glassPackage = 'LEE';
  }

  // Colors
  if (!resolved.interiorColor) resolved.interiorColor = 'White';
  if (!resolved.exteriorColor) resolved.exteriorColor = 'White';

  // Foam enhanced (only default to false if it is completely missing)
  if (resolved.foamEnhanced === undefined || resolved.foamEnhanced === null) {
    resolved.foamEnhanced = false;
  }

  // Removal type
  if (!resolved.removalType) resolved.removalType = 'ALUM';

  // Install type
  if (!resolved.installType) resolved.installType = 'EXT';

  // Screen option (picture windows get no screen)
  if (!resolved.screenOption) {
    const cat = (resolved.productCategory || '').toLowerCase();
    resolved.screenOption = cat.includes('picture') ? 'No Screen' : 'Half Screen';
  }

  // Grid style
  if (!resolved.gridStyle) resolved.gridStyle = 'None';

  // Quantity
  if (!resolved.quantity) resolved.quantity = 1;

  // Trim type — only default for siding/wood exteriors
  const ext = (resolved.exteriorSurface || resolved.exteriorType || '').toLowerCase();
  if (!resolved.trimType && (ext.includes('siding') || ext.includes('wood') || ext.includes('hardie'))) {
    resolved.trimType = 'Vinyl trim';
  }

  return resolved;
}
