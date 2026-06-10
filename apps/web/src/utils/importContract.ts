import ExcelJS from 'exceljs/dist/exceljs.min.js';

// The columns from exportContract.ts
const OPEN_COLS = {
  qty: 'C', model: 'D', vinylColor: 'E', intColor: 'F', extColor: 'G',
  width: 'H', height: 'J', legHeight: 'K', customRadius: 'L',
  windowNumber: 'N', hinge: 'O', glassOption: 'P', foamEnhanced: 'Q',
  gridStyle: 'R', gridPattern: 'S', obscureFull: 'U', temperedFull: 'X',
  nailFinNoJ: 'Y', nailFinWithJ: 'Z', fullScreen: 'AA', orielDim: 'AB',
  headerFlash: 'AC', foamExp: 'AD', typeExterior: 'AF', typeTrim: 'AG',
  typeRemoved: 'AH', typeInstall: 'AK', sillRepair: 'AL',
};

// ── Reverse Mappings ──
const REVERSE_COLOR: Record<string, string> = {
  WHT: 'White', ALM: 'Almond', BRZ: 'Bronze', BLK: 'Black',
  CLAY: 'Clay', TAN: 'Tan', BGE: 'Beige', BRN: 'Brown',
  SAND: 'Sandstone', CUST: 'Custom', OTH: 'Other'
};

const REVERSE_GLASS: Record<string, string> = { 
  LE: 'LE', LEE: 'LEE', CLR: 'Clear' 
};

const REVERSE_GRID_STYLE: Record<string, { profile: string, pattern: string }> = {
  A1: { profile: 'Flat', pattern: 'Colonial' },
  B1: { profile: 'Contoured', pattern: 'Colonial' },
  E1: { profile: 'Flat', pattern: 'Prairie' },
  F1: { profile: 'Contoured', pattern: 'Prairie' },
  G1: { profile: 'Contoured', pattern: 'Perimeter' },
  G3: { profile: 'Flat', pattern: 'Perimeter' },
  D1: { profile: 'Flat', pattern: 'Diamond' },
  K1: { profile: 'Flat', pattern: 'Craftsman' },
  SDL: { profile: 'SDL', pattern: 'Colonial' },
  GBG: { profile: 'GBG', pattern: 'Colonial' }
};

const REVERSE_EXT: Record<string, string> = { 
  BRICK: 'Brick', SIDING: 'Vinyl Siding', STUCCO: 'Stucco', 
  WOOD: 'Wood Siding', HARDIE: 'Fiber Cement' 
};

const REVERSE_TRIM: Record<string, string> = { 
  VINYL: 'Vinyl Coil', ALUM: 'Aluminum Coil', WOOD: 'Wood Casing', 
  PVC: 'PVC Casing', BRICK: 'Brickmould', STUCCO: 'Stucco Banding' 
};

const REVERSE_REMOVE: Record<string, string> = { 
  ALUM: 'Alum', WOOD: 'Wood', VINYL: 'Vinyl', STEEL: 'Steel', STORM: 'Storm' 
};

const REVERSE_INSTALL: Record<string, string> = { 
  EXT: 'Exterior', INT: 'Interior', FULL: 'Full Tear Out' 
};

function getCellValue(sheet: ExcelJS.Worksheet, col: string, row: number): string {
  const cell = sheet.getCell(`${col}${row}`);
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String(cell.value.result || '').trim();
  }
  return String(cell.value).trim();
}

/**
 * Parses an imported Excel file and applies the changes to the appointment's openings.
 * Returns an array of fully updated (and newly created) openings.
 */
export async function importContract(file: File, appointment: any): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const orderSheet = workbook.getWorksheet('Order Form');
  if (!orderSheet) {
    throw new Error('Could not find "Order Form" sheet in the uploaded Excel file.');
  }

  // Create a map of existing openings by windowNumber
  const existingOpenings = new Map<string, any>();
  const activeOpenings = (appointment?.openings || []).filter((o: any) => !o.deletedAt);
  for (const o of activeOpenings) {
    if (o.windowNumber) existingOpenings.set(String(o.windowNumber), o);
    else if (o.openingNumber) existingOpenings.set(String(o.openingNumber), o);
  }

  const updatedOpenings: any[] = [];
  let maxOpeningNumber = activeOpenings.reduce((max: number, o: any) => Math.max(max, Number(o.openingNumber) || 0), 0);

  // Scan rows 31 through 150 (max likely rows)
  for (let r = 31; r <= 150; r++) {
    const qtyStr = getCellValue(orderSheet, OPEN_COLS.qty, r);
    const winNumStr = getCellValue(orderSheet, OPEN_COLS.windowNumber, r);
    
    // If no window number or qty is 0, skip
    if (!winNumStr && !qtyStr) continue;
    if (qtyStr && Number(qtyStr) === 0) continue;

    let baseOpening = existingOpenings.get(winNumStr);
    
    if (!baseOpening && winNumStr) {
      // Create new opening if it doesn't exist
      maxOpeningNumber++;
      baseOpening = {
        id: `local_new_${Date.now()}_${r}`,
        appointmentId: appointment.id,
        openingNumber: maxOpeningNumber,
        windowNumber: winNumStr,
        quantity: 1,
        status: 'verified', // Consider imported rows as verified
        productCategory: 'Double Hung', // Safe default
      };
    } else if (!baseOpening) {
      continue; // No window number and no existing matching opening
    }

    // Apply updates from Excel
    const o = { ...baseOpening };
    
    // Quantity
    if (qtyStr) o.quantity = Number(qtyStr) || 1;

    // Dimensions
    const w = getCellValue(orderSheet, OPEN_COLS.width, r);
    const h = getCellValue(orderSheet, OPEN_COLS.height, r);
    if (w) o.width = w;
    if (h) o.height = h;

    // Colors
    const vColor = getCellValue(orderSheet, OPEN_COLS.vinylColor, r);
    const iColor = getCellValue(orderSheet, OPEN_COLS.intColor, r);
    const eColor = getCellValue(orderSheet, OPEN_COLS.extColor, r);
    if (vColor) o.exteriorColor = REVERSE_COLOR[vColor] || vColor;
    if (iColor) o.interiorColor = REVERSE_COLOR[iColor] || iColor;
    if (eColor) o.exteriorColor = REVERSE_COLOR[eColor] || eColor;

    // Glass
    const glass = getCellValue(orderSheet, OPEN_COLS.glassOption, r);
    if (glass) o.glassPackage = REVERSE_GLASS[glass] || glass;

    // Foam
    const foam = getCellValue(orderSheet, OPEN_COLS.foamExp, r); // AD column
    if (foam) o.foamEnhanced = foam.toUpperCase() === 'Y';

    // Grids
    const grid = getCellValue(orderSheet, OPEN_COLS.gridStyle, r); // R column
    if (grid && REVERSE_GRID_STYLE[grid]) {
      o.gridProfile = REVERSE_GRID_STYLE[grid].profile;
      o.gridPattern = REVERSE_GRID_STYLE[grid].pattern;
    } else if (grid === 'None' || !grid) {
      o.gridPattern = 'None';
    }

    // Screens
    const screen = getCellValue(orderSheet, OPEN_COLS.fullScreen, r); // AA column
    if (screen) {
      o.screenOption = screen.toUpperCase() === 'Y' ? 'Full Screen' : 'Half Screen';
    }

    // Obscure / Tempered
    const obscure = getCellValue(orderSheet, OPEN_COLS.obscureFull, r);
    const tempered = getCellValue(orderSheet, OPEN_COLS.temperedFull, r);
    if (obscure === 'FUL') o.obscureGlass = 'full';
    else if (obscure === 'BSO') o.obscureGlass = 'bso';
    else if (obscure === 'None') o.obscureGlass = 'none';

    if (tempered === 'FUL') o.temperedGlass = 'full';
    else if (tempered === 'BSO') o.temperedGlass = 'bso';
    else if (tempered === 'None') o.temperedGlass = 'none';

    // Install Types
    const ext = getCellValue(orderSheet, OPEN_COLS.typeExterior, r);
    const trim = getCellValue(orderSheet, OPEN_COLS.typeTrim, r);
    const rem = getCellValue(orderSheet, OPEN_COLS.typeRemoved, r);
    const inst = getCellValue(orderSheet, OPEN_COLS.typeInstall, r);

    if (ext) o.exteriorSurface = REVERSE_EXT[ext] || o.exteriorSurface;
    if (trim) o.trimType = REVERSE_TRIM[trim] || o.trimType;
    if (rem) o.removalType = REVERSE_REMOVE[rem] || o.removalType;
    if (inst) o.installType = REVERSE_INSTALL[inst] || o.installType;

    // Sill Repair
    const sill = getCellValue(orderSheet, OPEN_COLS.sillRepair, r);
    if (sill === 'Y') o.sillRepair = true;

    // Leg Height & Custom Radius
    const leg = getCellValue(orderSheet, OPEN_COLS.legHeight, r);
    const rad = getCellValue(orderSheet, OPEN_COLS.customRadius, r);
    if (leg) o.legHeight = leg;
    if (rad) o.customRadius = rad;

    updatedOpenings.push(o);
    // Remove from existing map so we don't duplicate
    existingOpenings.delete(winNumStr);
  }

  // Any openings that were in the DB but NOT in the Excel?
  // We can choose to leave them alone, mark them deleted, or just include them.
  // We'll leave them alone (include them untouched) to prevent accidental data loss.
  for (const untouched of existingOpenings.values()) {
    updatedOpenings.push(untouched);
  }

  return updatedOpenings;
}
