import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { saveAs } from 'file-saver';
import { toFractionDisplay } from './measurementParser';

const OPEN_COLS = {
  qty: 'C', model: 'D', vinylColor: 'E', intColor: 'F', extColor: 'G',
  width: 'H', height: 'J', legHeight: 'K', customRadius: 'L',
  windowNumber: 'N', hinge: 'O', glassOption: 'P', foamEnhanced: 'Q',
  gridStyle: 'R', gridPattern: 'S', obscureFull: 'U', temperedFull: 'X',
  nailFinNoJ: 'Y', nailFinWithJ: 'Z', fullScreen: 'AA', orielDim: 'AB',
  headerFlash: 'AC', foamExp: 'AD', typeExterior: 'AF', typeTrim: 'AG',
  typeRemoved: 'AH', typeInstall: 'AK', sillRepair: 'AL',
};

function getActiveOpenings(openings: any[]): any[] {
  if (!openings) return [];
  const active = openings.filter((o: any) => !o.deletedAt);
  const map = new Map<number, any>();
  for (const o of active) {
    const num = Number(o.openingNumber);
    if (!num) continue;
    const existing = map.get(num);
    if (!existing || new Date(o.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
      map.set(num, o);
    }
  }
  return Array.from(map.values());
}

// ── Abbreviation Helpers (Aligned with OrderFormMapping.ts) ──

export function resolveWindowWorldModel(opening: any): string {
  const modelStr = (opening.seriesModel || opening.productModel || '').trim();
  if (modelStr && !isNaN(Number(modelStr))) {
    return modelStr;
  }
  if (modelStr.match(/^\d+[-a-zA-Z0-9]*$/)) {
    return modelStr;
  }

  const category = (opening.productCategory || '').toLowerCase().replace(/_/g, ' ');
  let model = '';

  if (category.includes('double hung') || category === 'dh' || category.includes('oriel')) {
    // Double Hung defaults to 3002 per BTR product catalog (mission requirement)
    model = '3002';
  } else if (category.includes('single hung') || category === 'sh') {
    model = '3001';
  } else if (category.includes('slider') || category === 'sl') {
    if (opening.productType?.toLowerCase().includes('3-lite') || opening.customerNotes?.toLowerCase().includes('3-lite')) {
      model = '3011'; // 3-lite slider
    } else {
      model = '3010'; // 2-lite slider
    }
  } else if (category.includes('picture') || category === 'pic') {
    model = '3004';
  } else if (category.includes('casement') || category === 'cas') {
    if (opening.productType?.toLowerCase().includes('double') || opening.customerNotes?.toLowerCase().includes('double')) {
      model = '0972';
    } else {
      model = '0971';
    }
  } else if (category.includes('awning') || category === 'awn') {
    model = '0951';
  } else {
    model = 'TBD';
  }

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
  return map[normalized] || 'OTH';
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
    if (normalized.includes('full')) return 'ALUM';
    if (normalized.includes('insert')) return 'ALUM';
  }
  if (category === 'install') {
    if (normalized.includes('ext')) return 'EXT';
    if (normalized.includes('int')) return 'INT';
    if (normalized.includes('full')) return 'FULL';
  }
  return type.toUpperCase().slice(0, 5);
}

export function resolveWorkbookDefaults(opening: any): any {
  const resolved = { ...opening };
  if (!resolved.glassPackage) resolved.glassPackage = 'LEE';
  if (!resolved.interiorColor) resolved.interiorColor = 'White';
  if (!resolved.exteriorColor) resolved.exteriorColor = 'White';
  if (resolved.foamEnhanced === undefined || resolved.foamEnhanced === null) {
    resolved.foamEnhanced = false;
  }
  if (!resolved.removalType) resolved.removalType = 'ALUM';
  if (!resolved.installType) resolved.installType = 'EXT';
  if (!resolved.screenOption) {
    const cat = (resolved.productCategory || '').toLowerCase();
    resolved.screenOption = cat.includes('picture') ? 'No Screen' : 'Half Screen';
  }
  if (!resolved.gridStyle) resolved.gridStyle = 'None';
  if (!resolved.quantity) resolved.quantity = 1;

  const ext = (resolved.exteriorSurface || resolved.exteriorType || '').toLowerCase();
  if (!resolved.trimType && (ext.includes('siding') || ext.includes('wood') || ext.includes('hardie'))) {
    resolved.trimType = 'Vinyl trim';
  }
  return resolved;
}

// ── Tally Helpers for Contract sheet ──

function countProductTypes(openings: any[]) {
  const c = { dh4000: 0, dh4000FE: 0, picture: 0, slider2: 0, slider3: 0, casement: 0, dblCasement: 0, patioDoor6: 0, patioDoor8: 0 };
  for (const rawO of openings) {
    const o = resolveWorkbookDefaults(rawO);
    const qty = o.quantity ?? 1;
    const m = resolveWindowWorldModel(o);
    // 3002 = Double Hung (per BTR catalog, mission requirement)
    if (m === '3002') c.dh4000 += qty;
    else if (m === '3002-FE') c.dh4000FE += qty;
    // Single Hung legacy code
    else if (m === '3001') c.dh4000 += qty;
    else if (m === '3001-FE') c.dh4000FE += qty;
    else if (m === '3004') c.picture += qty;
    else if (m === '3010') c.slider2 += qty;  // 2-lite slider
    else if (m === '3011') c.slider3 += qty;  // 3-lite slider
    else if (['3005', '0951', '0952', '0971', '0973', '0979'].includes(m)) c.casement += qty;
    else if (['3006', '0972'].includes(m)) c.dblCasement += qty;
    else if (['6105', '6406'].includes(m)) c.patioDoor6 += qty;
    else if (['6108', '6408'].includes(m)) c.patioDoor8 += qty;
  }
  return c;
}

function countOptions(openings: any[]) {
  const c = {
    fullScreen: 0, nailFin: 0, oriel: 0, grid: 0, obscure: 0, tempered: 0,
    beige: 0, woodGrain: 0, exteriorColor: 0, foamWrap: 0, argon: 0,
    stormRemoval: 0, windowRemoval: 0, steelRemoval: 0, alumInStucco: 0,
    mullion: 0, structuralMull: 0, cutback: 0, woodCutback: 0,
    extCapping: 0, vinylTrim: 0, secondStory: 0, headerFlash: 0,
    specialShapeTrim: 0, rainObscure: 0,
    solarZone: 0, solarZoneElite: 0,
  };
  for (const rawO of openings) {
    const o = resolveWorkbookDefaults(rawO);
    const qty = o.quantity ?? 1;
    if (o.screenOption === 'Full' || o.screenOption === 'Full Screen') c.fullScreen += qty;
    if (o.nailFin) c.nailFin += qty;
    if (o.oriel) c.oriel += qty;
    if (o.gridStyle && o.gridStyle !== 'None') c.grid += qty;
    if (o.obscureGlass === 'full' || o.obscureGlass === 'half') c.obscure += qty;
    if (o.temperedGlass === 'full' || o.temperedGlass === 'half') {
      const sqft = ((Number(o.width) || 0) * (Number(o.height) || 0)) / 144;
      c.tempered += (sqft * qty);
    }
    if (o.headerFlash || o.exteriorSurface === 'vinyl_siding' || o.exteriorSurface === 'wood_siding') c.headerFlash += qty;
    if (o.specialShapeTrimSelected || (o.productCategory === 'shape' && (o.trimIncluded || o.trimType))) c.specialShapeTrim = (c.specialShapeTrim || 0) + qty;
    if (o.cutbackRequired || o.cutbackSelected || (o.cutbackType && o.cutbackType !== 'none')) {
      if (o.cutbackType === 'wood_trim_cutback') {
        c.woodCutback = (c.woodCutback || 0) + qty;
      } else {
        c.cutback = (c.cutback || 0) + qty;
      }
    }
    if (o.installMullion) c.mullion += qty;
    if (o.structuralMullion) c.structuralMull += qty;
    if (o.rainObscure) c.rainObscure = (c.rainObscure || 0) + qty;
    
    const vc = (o.exteriorColor || '').toUpperCase();
    if (vc === 'BG' || vc === 'BEIGE' || vc === 'CLAY') c.beige += qty;

    if (o.foamEnhanced) c.foamWrap += qty;

    const glass = (o.glassPackage || '').toLowerCase();
    if (glass.includes('solar') || glass.includes('lee') || glass.includes('argon') || o.argon) c.argon += qty;
    
    const gp = (o.glassPackage || '').toUpperCase();
    if (gp.includes('SOLARZONE ELITE') || gp.includes('ELITE')) {
      c.solarZoneElite += qty;
    } else if (gp.includes('SOLARZONE') || gp.includes('LOW-E') || gp.includes('LOWE') || gp.includes('LEE')) {
      c.solarZone += qty;
    }

    const rem = (o.removalType || '').toUpperCase();
    const extSurface = (o.exteriorSurface || o.exteriorType || '').toLowerCase();
    if (rem === 'STORM') c.stormRemoval += qty;
    else if (rem === 'ALUM' && extSurface.includes('stucco')) c.alumInStucco += qty;
    else if (rem === 'ALUM') c.windowRemoval += qty;
    else if (rem === 'STEEL') c.steelRemoval += qty;

    const trim = (o.trimType || '').toUpperCase();
    if (trim === 'VINYL') c.vinylTrim += qty;
    if (trim === 'CAP') c.extCapping += qty;
  }
  return c;
}

function setCellValue(sheet: ExcelJS.Worksheet, cellAddr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = sheet.getCell(cellAddr);
  cell.value = value;
}

function fillWarrantyTab(sheet: ExcelJS.Worksheet) {
  const writeRow = (rowNum: number, text: string, options: { bold?: boolean; size?: number; italic?: boolean; rowHeight?: number } = {}) => {
    try {
      sheet.mergeCells(`B${rowNum}:X${rowNum}`);
    } catch (e) {
      // already merged or error - ignore
    }
    const cell = sheet.getCell(`B${rowNum}`);
    cell.value = text;
    cell.font = {
      name: 'Arial',
      size: options.size || 9,
      bold: !!options.bold,
      italic: !!options.italic,
    };
    cell.alignment = {
      wrapText: true,
      vertical: 'top',
      horizontal: 'left',
    };
    if (options.rowHeight) {
      const row = sheet.getRow(rowNum);
      row.height = options.rowHeight;
    }
  };

  // Section 1: Lifetime Warranty Details
  writeRow(7, "Subject to the limitations and exclusions below, Window World (\"Company\") warrants to the original purchaser/property owner (\"Owner\") and, if any, Owner's immediate transferee, excluding all other subsequent transferees, that any basic window installed by the Company is free from defects in material and workmanship for as long as the Owner or Owner's immediate transferee resides in the home in which the windows are installed.", { rowHeight: 45 });
  writeRow(10, "Vinyl Parts Warranty – That under normal use, the vinyl components of the window will not blister, peel, rot or corrode.", { bold: true, rowHeight: 20 });
  writeRow(12, "Mechanical Parts Warranty – That all mechanical parts (locks, vent locks, balances) are warranted to be free from manufactured defects in material and workmanship. Replacement parts will be supplied at no charge.", { bold: true, rowHeight: 28 });
  writeRow(15, "Insulated Glass Warranty – The sealed insulated glass unit is warranted against defects resulting in material obstruction of vision from film formation caused by dust or moisture in the dead air space of the sealed unit for the life of the window. If the glass unit fails, the Company will provide the Owner with a replacement insulated glass unit at no extra charge.", { bold: true, rowHeight: 42 });
  writeRow(19, "Glass Breakage Warranty* – The Company will provide the Owner with a replacement insulated glass unit in the event of accidental glass breakage. Exclusions listed below apply. *Optional if denoted on contract.", { bold: true, rowHeight: 28 });
  writeRow(22, "Labor Warranty – That all labor necessary to correct any item covered by this warranty will be provided at no extra charge by the Company.", { bold: true, rowHeight: 20 });
  writeRow(24, "Transferable Warranty – This warranty may be transferred to the Owner's immediate transferee provided the transferee notifies the Company, in writing, at the address below, within 30 days of the property's transfer date. The correspondence must include a transfer fee of $350, the original Owner's name and address, transferee's name and address, and the Window World location responsible for the installation (8405 Airline Hwy, Baton Rouge, LA 70815).", { bold: true, rowHeight: 45 });

  // Exclusions Sub-section
  writeRow(30, "General Limitations and Exclusions:", { bold: true, size: 10, rowHeight: 18 });
  writeRow(31, "1. Acts of God (hurricanes, tornados, flood, etc.), acts of war, riots, fire, modifications, and vandalism are not covered by this warranty.", { rowHeight: 20 });
  writeRow(33, "2. Color variance may occur between replacement parts and weathered original material.", { rowHeight: 15 });
  writeRow(34, "3. Labor warranty does not transfer to Owner's immediate transferee.", { rowHeight: 15 });
  writeRow(35, "4. This warranty is exclusively for windows and patio doors installed by the Company. Any additional products, such as entry doors and storm doors, installed by the Company, in conjunction with the window and/or patio door contract, will carry the warranty provided by their manufacturer.", { rowHeight: 35 });
  writeRow(38, "5. Caulking - To seal window frame or trim package against water and/or air filtration, caulking may be necessary on some installations. Caulking maintenance is the responsibility of the homeowner. It is not considered part of the product and is not covered under the warranty.", { rowHeight: 35 });
  writeRow(41, "6. Condensation - On windows and patio doors, condensation may occur as the natural result of humidity within a home or changes in interior/exterior temperature. It does not indicate a product defect. The warranty covers neither condensation, nor frost, nor freezing from condensation on the windows or patio doors.", { rowHeight: 40 });
  writeRow(45, "Warranty Coverage Begins With Project Completion and Final Payment", { bold: true, size: 10, italic: true, rowHeight: 18 });

  // Section 2: Installation Warranty Details
  writeRow(55, "Window World warrants that the installation of your windows will be performed in a professional, workmanlike manner. Any installation-related defects will be repaired at no cost to the customer for a period of two (2) years from the date of completion.", { rowHeight: 35 });
  writeRow(58, "Installation Exclusions:", { bold: true, size: 10, rowHeight: 18 });
  writeRow(59, "• Damage caused by building movement, structural settlement, or weathering.", { rowHeight: 15 });
  writeRow(60, "• Unauthorized repairs or modifications performed by non-certified Window World installers.", { rowHeight: 15 });
  writeRow(61, "• Maintenance issues such as homeowner caulking, normal wear and tear, or environmental discoloration.", { rowHeight: 20 });

  // Section 3: Waiver of Maintenance Agreement
  writeRow(75, "By signing this waiver, the customer acknowledges that they have declined the optional seven (7) year Maintenance Agreement and choose to rely solely on the standard lifetime product warranty and installation warranty.", { italic: true, rowHeight: 35 });
  writeRow(78, "Owner Signature: ____________________________________             Date: ________________________", { bold: true, rowHeight: 20 });
}

/**
 * Downloads and populates the Window World Contract Excel template.
 * @param appointment - The appointment data (customer, openings)
 * @param finResult - Financial calculations (total amount)
 * @param tier - The selected package tier (glass, grid options)
 */
export async function exportContract(appointment: any, finResult: any, tier: any, selectedPlanId?: string) {
  try {
      if (localStorage.getItem('sketch_has_unsaved_' + appointment.id) === 'true') {
        throw new Error('You have unsaved changes in your sketch. Please save the sketch before generating the contract.');
      }

      // 1. Fetch the raw template from the public directory
    const response = await fetch('/BTR_Window_Contract_Template.xlsx');
    if (!response.ok) {
      throw new Error('Failed to download Excel template');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load the workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Retrieve local sketch image if available
    let bestSketch: string | null = null;
    const elevations = ['1st_story', '2nd_story', 'front'];
    let maxMarkers = -1;

    for (const elev of elevations) {
      try {
        const raw = localStorage.getItem(`wwa_sketch_${appointment.id}_${elev}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.markers) {
            const markerCount = Array.isArray(parsed.markers) ? parsed.markers.length : 0;
            if (markerCount > maxMarkers) {
              maxMarkers = markerCount;
              bestSketch = parsed.dataUrl || 
                           localStorage.getItem(`sketch_canvas_clean_${appointment.id}_${elev}`) || 
                           localStorage.getItem(`sketch_canvas_${appointment.id}_${elev}`);
            }
          }
        }
      } catch (e) { console.debug("[swallowed error]", e); }
    }

    if (!bestSketch) {
      for (const elev of elevations) {
        try {
          const raw = localStorage.getItem(`wwa_sketch_${appointment.id}_${elev}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.dataUrl) {
              bestSketch = parsed.dataUrl;
              break;
            }
          }
          const cleanUrl = localStorage.getItem(`sketch_canvas_clean_${appointment.id}_${elev}`);
          if (cleanUrl) {
            bestSketch = cleanUrl;
            break;
          }
          const baseUrl = localStorage.getItem(`sketch_canvas_${appointment.id}_${elev}`);
          if (baseUrl) {
            bestSketch = baseUrl;
            break;
          }
        } catch (e) { console.debug("[swallowed error]", e); }
      }
    }

    // 4. Fill out the 'Contract' sheet
    const contractSheet = workbook.getWorksheet('Contract');
    if (contractSheet) {
      const customer = appointment?.customer || {};
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      
      // Customer Info
      setCellValue(contractSheet, 'F9', fullName);
      setCellValue(contractSheet, 'J9', customer.email || '');
      setCellValue(contractSheet, 'F10', appointment?.jobAddress || customer.address || '');
      setCellValue(contractSheet, 'S10', customer.phone || '');
      setCellValue(contractSheet, 'F11', appointment?.city || customer.city || '');
      setCellValue(contractSheet, 'H11', appointment?.state || customer.state || 'LA');
      setCellValue(contractSheet, 'L11', appointment?.zip || customer.zip || '');
      setCellValue(contractSheet, 'S11', customer.phone2 || '');
      
      // Job Info
      setCellValue(contractSheet, 'Q8', appointment?.completeJob ? 'YES' : 'NO');
      if (appointment?.customer?.customerId) {
        setCellValue(contractSheet, 'K10', appointment.customer.customerId);
      }

      // Estimator info — name on row 84, email on row 85 (canonical default: npearson@winworldinfo.com)
      const estimator = appointment?.user?.name || 'Ned Pearson';
      let estimatorEmail = appointment?.user?.email || 'npearson@winworldinfo.com';
      if (estimatorEmail === 'nedpearson@gmail.com' || estimatorEmail === 'gpearson@winworldinfo.com') {
        estimatorEmail = 'npearson@winworldinfo.com';
      }
      setCellValue(contractSheet, 'D84', estimator);
      setCellValue(contractSheet, 'D85', estimatorEmail);

      // Quantities of windows on Contract sheet
      const rawOpenings = appointment?.openings || [];
      const activeOpenings = getActiveOpenings(rawOpenings);
      const counts = countProductTypes(activeOpenings);
      if (counts.dh4000 > 0) setCellValue(contractSheet, 'C15', counts.dh4000);
      if (counts.dh4000FE > 0) setCellValue(contractSheet, 'C16', counts.dh4000FE);
      if (counts.picture > 0) setCellValue(contractSheet, 'C20', counts.picture);
      if (counts.slider2 > 0) setCellValue(contractSheet, 'C21', counts.slider2);
      if (counts.slider3 > 0) setCellValue(contractSheet, 'C22', counts.slider3);
      if (counts.casement > 0) setCellValue(contractSheet, 'C23', counts.casement);
      if (counts.dblCasement > 0) setCellValue(contractSheet, 'C24', counts.dblCasement);
      if (counts.patioDoor6 > 0) setCellValue(contractSheet, 'C43', counts.patioDoor6);
      if (counts.patioDoor8 > 0) setCellValue(contractSheet, 'C44', counts.patioDoor8);

      // Options on Contract sheet
      const opts = countOptions(activeOpenings);
      if (opts.fullScreen > 0) setCellValue(contractSheet, 'M14', opts.fullScreen);
      if (opts.nailFin > 0) setCellValue(contractSheet, 'M26', opts.nailFin);
      if (opts.oriel > 0) setCellValue(contractSheet, 'M27', opts.oriel);
      if (opts.grid > 0) setCellValue(contractSheet, 'M28', opts.grid);
      if (opts.obscure > 0) setCellValue(contractSheet, 'M24', opts.obscure);
      if (opts.tempered > 0) setCellValue(contractSheet, 'M23', Math.ceil(opts.tempered * 100) / 100);
      if (opts.beige > 0) setCellValue(contractSheet, 'M19', opts.beige);
      if (opts.woodGrain > 0) setCellValue(contractSheet, 'M20', opts.woodGrain);
      if (opts.exteriorColor > 0) setCellValue(contractSheet, 'M29', opts.exteriorColor);
      if (opts.foamWrap > 0) setCellValue(contractSheet, 'M18', opts.foamWrap);
      if (opts.argon > 0) setCellValue(contractSheet, 'M16', opts.argon);
      if (opts.stormRemoval > 0) setCellValue(contractSheet, 'M41', opts.stormRemoval);
      if (opts.windowRemoval > 0) setCellValue(contractSheet, 'M42', opts.windowRemoval);
      if (opts.steelRemoval > 0) setCellValue(contractSheet, 'M43', opts.steelRemoval);
      if (opts.alumInStucco > 0) setCellValue(contractSheet, 'M44', opts.alumInStucco);
      if (opts.mullion > 0) setCellValue(contractSheet, 'M45', opts.mullion);
      if (opts.structuralMull > 0) setCellValue(contractSheet, 'M46', opts.structuralMull);
      if (opts.cutback > 0) setCellValue(contractSheet, 'M47', opts.cutback);
      if (opts.woodCutback > 0) setCellValue(contractSheet, 'M48', opts.woodCutback);
      if (opts.extCapping > 0) setCellValue(contractSheet, 'M49', opts.extCapping);
      if (opts.vinylTrim > 0) setCellValue(contractSheet, 'M50', opts.vinylTrim);
      if (opts.secondStory > 0) setCellValue(contractSheet, 'M53', opts.secondStory);
      if (opts.headerFlash > 0) setCellValue(contractSheet, 'M52', opts.headerFlash);
      if (opts.specialShapeTrim > 0) setCellValue(contractSheet, 'M51', opts.specialShapeTrim);
      if (opts.cutback > 0) setCellValue(contractSheet, 'M47', opts.cutback);
      if (opts.rainObscure > 0) setCellValue(contractSheet, 'M25', opts.rainObscure);
      if (opts.solarZone > 0) setCellValue(contractSheet, 'M21', opts.solarZone);
      if (opts.solarZoneElite > 0) setCellValue(contractSheet, 'M22', opts.solarZoneElite);

      // Pricing Mappings
      const summedSubtotal = activeOpenings.reduce((sum, o) => sum + (o.basePrice || 0) * (o.quantity || 1), 0);
      const summedTotal = activeOpenings.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      
      const totalListPrice = finResult?.subtotal || appointment?.subtotal || summedSubtotal || 0;
      const totalAmount = finResult?.totalAmount || appointment?.totalAmount || summedTotal || 0;
      const depositAmount = appointment?.depositAmount || finResult?.depositAmount || 0;
      const balanceDue = appointment?.balanceDue || (totalAmount - depositAmount);
      let amtFinanced = appointment?.financingAmount || 0;
      if (selectedPlanId && selectedPlanId !== 'cash') {
        amtFinanced = totalAmount - depositAmount;
      } else if (finResult && !finResult.isCash) {
        amtFinanced = totalAmount - depositAmount;
      }
      const stJudeDonation = appointment?.stJudeDonation || 0;

      setCellValue(contractSheet, 'T73', totalListPrice);
      setCellValue(contractSheet, 'T74', 150);
      setCellValue(contractSheet, 'T75', 0);
      setCellValue(contractSheet, 'T76', totalAmount);
      if (depositAmount > 0) setCellValue(contractSheet, 'T77', depositAmount);
      setCellValue(contractSheet, 'T78', balanceDue);
      if (amtFinanced > 0) setCellValue(contractSheet, 'T79', amtFinanced);
      if (stJudeDonation > 0) setCellValue(contractSheet, 'T80', stJudeDonation);
    }

    // 5. Fill out the 'Order Form' sheet
    const orderSheet = workbook.getWorksheet('Order Form');
    if (orderSheet) {
      // Clear mapped columns to prevent ExcelJS Shared Formula errors
      const mappedCols = Object.values(OPEN_COLS);
      for (let r = 31; r <= 54; r++) {
        for (const c of mappedCols) {
          const cell = orderSheet.getCell(`${c}${r}`);
          cell.value = null;

          // Apply data validations based on column
          if (c === 'E' || c === 'F' || c === 'G') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"WHT,ALM,BRZ,BLK,CLAY,TAN,BGE,BRN,SAND,CUST,OTH"'] };
          } else if (c === 'P') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"LE,LEE,CLR"'] };
          } else if (c === 'Q' || c === 'AD' || c === 'AA' || c === 'AL') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"Y,N"'] };
          } else if (c === 'R') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"A1,B1,E1,F1,G1,G3,D1,K1,SDL,GBG"'] };
          } else if (c === 'U' || c === 'X') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"FUL,BSO"'] };
          } else if (c === 'AF') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"BRICK,SIDING,STUCCO,WOOD,HARDIE"'] };
          } else if (c === 'AG') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"VINYL,ALUM,WOOD,PVC,BRICK,STUCCO"'] };
          } else if (c === 'AH') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"ALUM,WOOD,VINYL,STEEL,STORM"'] };
          } else if (c === 'AK') {
            cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"EXT,INT,FULL"'] };
          }
        }
      }

      const customer = appointment?.customer || {};
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      
      // Customer Info on Order Form
      setCellValue(orderSheet, 'U14', fullName);
      setCellValue(orderSheet, 'AG13', customer.phone || '');
      setCellValue(orderSheet, 'AG14', customer.phone2 || customer.phone || '');
      setCellValue(orderSheet, 'T16', appointment?.jobAddress || customer.address || '');
      setCellValue(orderSheet, 'AE16', appointment?.city || customer.city || 'Baton Rouge');
      setCellValue(orderSheet, 'AH16', appointment?.zip || customer.zip || '');
      
      const dateStr = new Date().toLocaleDateString();
      setCellValue(orderSheet, 'AH9', dateStr);

      const estimator = appointment?.user?.name || 'Ned Pearson';
      const estimatorPhone = appointment?.user?.phone || '225-328-2500';
      let estimatorEmail = appointment?.user?.email || 'npearson@winworldinfo.com';
      if (estimatorEmail === 'nedpearson@gmail.com' || estimatorEmail === 'gpearson@winworldinfo.com') {
        estimatorEmail = 'npearson@winworldinfo.com';
      }
      setCellValue(orderSheet, 'W18', estimator);
      setCellValue(orderSheet, 'AG18', estimatorPhone);
      setCellValue(orderSheet, 'AJ18', estimatorEmail);

      // Write openings (line items) starting at row 31
      const activeOpenings = getActiveOpenings(appointment?.openings || []);
      
      // Generate map of opening ID to group ID
      const openingToGroupId = new Map<string, string>();
      if (appointment?.formSketches) {
        for (const sketch of appointment.formSketches) {
          if (sketch.groups) {
            for (const group of sketch.groups) {
              if (!group.groupType.startsWith('mull') && group.groupType !== 'twin' && group.groupType !== 'triple' && group.groupType !== 'bay_bow') continue;
              for (const member of group.members) {
                const marker = sketch.markers?.find((m: any) => m.id === member.markerId);
                if (marker && marker.links) {
                  for (const link of marker.links) {
                    openingToGroupId.set(link.openingId, group.id);
                  }
                }
              }
            }
          }
        }
      }

      // Apply groupId to openings
      const openingsWithGroups = activeOpenings.map((rawO: any) => {
        const o = resolveWorkbookDefaults(rawO);
        return {
          ...o,
          groupId: openingToGroupId.get(o.id)
        };
      });

      let currentRowOffset = 0;
      const processedOpeningIds = new Set<string>();

      for (let i = 0; i < openingsWithGroups.length && currentRowOffset < 24; i++) {
        const o = openingsWithGroups[i];
        if (o.id && processedOpeningIds.has(o.id)) continue;

        // Is it in a mull group?
        if (o.groupId) {
            const groupOpenings = openingsWithGroups.filter((go: any) => go.groupId === o.groupId);
            groupOpenings.forEach((go: any) => { if (go.id) processedOpeningIds.add(go.id); });

            // Write Mull Header Row
            let row = 31 + currentRowOffset;
            setCellValue(orderSheet, `C${row}`, 1);
            setCellValue(orderSheet, `D${row}`, 'Mull Unit');
            
            const totalRawW = groupOpenings.reduce((sum: number, go: any) => sum + (go.rawWidth !== undefined && go.rawWidth !== null ? go.rawWidth : (go.width || 0)), 0);
            const needsCutback = groupOpenings.some((go: any) => go.cutbackRequired || go.actualMeasurementBasis === 'Opening' || go.measurementBasis === 'Opening');
            const cutbackAmount = groupOpenings.find((go: any) => go.cutbackAmount)?.cutbackAmount || 0.375;
            const totalW = needsCutback ? totalRawW - cutbackAmount : totalRawW;
            
            const maxRawH = Math.max(...groupOpenings.map((go: any) => go.rawHeight !== undefined && go.rawHeight !== null ? go.rawHeight : (go.height || 0)));
            const maxH = needsCutback ? maxRawH - cutbackAmount : maxRawH;
            
            setCellValue(orderSheet, `H${row}`, toFractionDisplay(totalW));
            setCellValue(orderSheet, `J${row}`, toFractionDisplay(maxH));
            setCellValue(orderSheet, `N${row}`, `Consisting of ${groupOpenings.length} Windows:`);
            
            currentRowOffset++;
            
            const childGroups: Record<string, typeof groupOpenings> = {};
            for (const go of groupOpenings) {
              const isSpecial = !!go.legHeight || !!go.customRadius || go.productCategory === 'specialty';
              const modelCode = resolveWindowWorldModel(go) || '';
              const key = `${modelCode}-${go.exteriorColor}-${isSpecial}`;
              if (!childGroups[key]) childGroups[key] = [];
              childGroups[key].push(go);
            }

            for (const key in childGroups) {
              if (currentRowOffset >= 24) break;
              const children = childGroups[key];
              const first = children[0];
              row = 31 + currentRowOffset;
              const mCode = resolveWindowWorldModel(first);
              
              setCellValue(orderSheet, `C${row}`, children.length);
              setCellValue(orderSheet, `D${row}`, mCode);
              setCellValue(orderSheet, `E${row}`, abbreviateWindowWorldColor(first.exteriorColor));
              setCellValue(orderSheet, `F${row}`, abbreviateWindowWorldColor(first.interiorColor));
              setCellValue(orderSheet, `G${row}`, abbreviateWindowWorldColor(first.exteriorColor));
              
              // Glass Options
              let glassCode = '';
              if (first.glassPackage) {
                const gpLower = first.glassPackage.toLowerCase();
                if (gpLower.includes('solar') || gpLower.includes('low')) glassCode = 'LEE';
                else if (gpLower.includes('clear')) glassCode = 'CLR';
              }
              setCellValue(orderSheet, `P${row}`, glassCode);

              // Grid Style & Pattern
              let gridStyleCode = '';
              if (first.gridStyle && first.gridStyle !== 'none') {
                const sLower = first.gridStyle.toLowerCase();
                if (sLower === 'sdl') gridStyleCode = 'SDL';
                else {
                  const isContoured = sLower.includes('contoured');
                  const patLower = (first.gridPattern || '').toLowerCase();
                  if (patLower === 'prairie') gridStyleCode = isContoured ? 'G1' : 'F1';
                  else if (patLower === 'craftsman') gridStyleCode = 'K1';
                  else gridStyleCode = isContoured ? 'B1' : 'A1';
                }
              }
              setCellValue(orderSheet, `R${row}`, gridStyleCode);
              if (first.gridVerticalCount > 0 || first.gridHorizontalCount > 0) {
                setCellValue(orderSheet, `S${row}`, `${first.gridVerticalCount || 0}Vx${first.gridHorizontalCount || 0}H`);
              }

              setCellValue(orderSheet, `H${row}`, '-');
              
              const isSpecial = !!first.legHeight || !!first.customRadius || first.productCategory === 'specialty';
              if (isSpecial) {
                 let dh = first.rawHeight || first.height || 0;
                 const needsCutback = first.cutbackRequired || first.actualMeasurementBasis === 'Opening';
                 if (needsCutback && (!first.rawHeight || first.rawHeight === first.height)) dh -= (first.cutbackAmount || 0.375);
                 setCellValue(orderSheet, `J${row}`, toFractionDisplay(dh));
                 const winNums = children.map((c: any) => c.openingNumber).join(',');
                 setCellValue(orderSheet, `N${row}`, first.legHeight ? `LEG: ${toFractionDisplay(first.legHeight)} (${winNums})` : winNums);
              } else {
                 setCellValue(orderSheet, `J${row}`, '-');
                 setCellValue(orderSheet, `M${row}`, 'R');
                 setCellValue(orderSheet, `N${row}`, children.map((c: any) => c.openingNumber).join(','));
              }
              currentRowOffset++;
            }
            continue;
        }

        if (o.id) processedOpeningIds.add(o.id);
        const currentRow = 31 + currentRowOffset;
        
        setCellValue(orderSheet, `C${currentRow}`, o.quantity || 1);
        const modelCode = resolveWindowWorldModel(o);
        if (modelCode) setCellValue(orderSheet, `D${currentRow}`, modelCode);

        // Colors (WHT, ALM, CLAY, etc.)
        setCellValue(orderSheet, `E${currentRow}`, abbreviateWindowWorldColor(o.exteriorColor));
        setCellValue(orderSheet, `F${currentRow}`, abbreviateWindowWorldColor(o.interiorColor));
        setCellValue(orderSheet, `G${currentRow}`, abbreviateWindowWorldColor(o.exteriorColor));

        let displayW = o.rawWidth !== undefined && o.rawWidth !== null ? o.rawWidth : (o.width || 0);
        let displayH = o.rawHeight !== undefined && o.rawHeight !== null ? o.rawHeight : (o.height || 0);
        const needsCutback = o.cutbackRequired || o.actualMeasurementBasis === 'Opening' || o.measurementBasis === 'Opening';
        if (needsCutback) {
          const deduction = o.cutbackAmount || 0.375;
          displayW -= deduction;
          displayH -= deduction;
        }

        setCellValue(orderSheet, `H${currentRow}`, toFractionDisplay(displayW));
        setCellValue(orderSheet, `J${currentRow}`, toFractionDisplay(displayH));

        if (o.legHeight) setCellValue(orderSheet, `K${currentRow}`, toFractionDisplay(o.legHeight));
        if (o.customRadius) setCellValue(orderSheet, `L${currentRow}`, toFractionDisplay(o.customRadius));
        setCellValue(orderSheet, `N${currentRow}`, o.openingNumber);
        if (o.hinge) setCellValue(orderSheet, `O${currentRow}`, o.hinge);

        // Glass Options (LEE vs CLR)
        if (o.glassPackage) {
          const gpLower = o.glassPackage.toLowerCase();
          if (gpLower.includes('solar') || gpLower.includes('low')) {
            setCellValue(orderSheet, `P${currentRow}`, 'LEE');
          } else if (gpLower.includes('clear')) {
            setCellValue(orderSheet, `P${currentRow}`, 'CLR');
          }
        }

        // Grid Style (A1, B1, G1, F1, K1, SDL)
        let gridStyleCode = '';
        if (o.gridStyle && o.gridStyle !== 'none') {
          const sLower = o.gridStyle.toLowerCase();
          if (sLower === 'sdl') {
            gridStyleCode = 'SDL';
          } else {
            const isContoured = sLower.includes('contoured');
            const patLower = (o.gridPattern || '').toLowerCase();
            if (patLower === 'prairie') {
              gridStyleCode = isContoured ? 'G1' : 'F1';
            } else if (patLower === 'craftsman') {
              gridStyleCode = 'K1';
            } else {
              gridStyleCode = isContoured ? 'B1' : 'A1';
            }
          }
        }
        setCellValue(orderSheet, `R${currentRow}`, gridStyleCode);
        // Grid pattern (e.g., '3Vx2H')
        if (o.gridVerticalCount > 0 || o.gridHorizontalCount > 0) {
          const gp = `${o.gridVerticalCount || 0}Vx${o.gridHorizontalCount || 0}H`;
          setCellValue(orderSheet, `S${currentRow}`, gp);
        }
        
        const foam = o.foamEnhanced ? 'Y' : 'N';
        setCellValue(orderSheet, `AD${currentRow}`, foam);
        
        const argon = o.argon || tier?.defaults?.argon ? 'Y' : 'N';
        setCellValue(orderSheet, `Q${currentRow}`, argon === 'Y' ? 'Argon' : '');
        
        // Tempered / Obscure (abbreviated FUL / BSO)
        if (o.temperedGlass && o.temperedGlass !== 'none') {
          setCellValue(orderSheet, `X${currentRow}`, o.temperedGlass === 'full' ? 'FUL' : 'BSO');
        }
        if (o.obscureGlass && o.obscureGlass !== 'none') {
          setCellValue(orderSheet, `U${currentRow}`, o.obscureGlass === 'full' ? 'FUL' : 'BSO');
        }
        
        // Screen option
        if (o.screenOption === 'Full Screen' || o.screenOption === 'Full') {
          setCellValue(orderSheet, `AA${currentRow}`, 'Y');
        }

        // Trim, Removed, Install Types abbreviated
        const extTypeAbbr = abbreviateType(o.exteriorSurface || o.exteriorType, 'exterior');
        const trimTypeAbbr = abbreviateType(o.trimType, 'trim');
        const remTypeAbbr = abbreviateType(o.removalType, 'remove');
        const instTypeAbbr = abbreviateType(o.installType, 'install');

        setCellValue(orderSheet, `AF${currentRow}`, extTypeAbbr);
        setCellValue(orderSheet, `AG${currentRow}`, trimTypeAbbr);
        setCellValue(orderSheet, `AH${currentRow}`, remTypeAbbr);
        setCellValue(orderSheet, `AK${currentRow}`, instTypeAbbr);

        if (o.sillRepair) {
          setCellValue(orderSheet, `AL${currentRow}`, 'Yes');
        }
        
        currentRowOffset++;
      }

      // Notes - Append unmapped source of truth fields to job notes in B59
      const extraNotes: string[] = [];
      activeOpenings.forEach((o: any, index: number) => {
        const openingParts = [];
        const basis = o.actualMeasurementBasis || o.measurementBasis;
        if (basis && basis !== 'outside') {
          openingParts.push(`Basis: ${basis}`);
        }
        const needsCutback = o.cutbackRequired || o.actualMeasurementBasis === 'Opening' || o.measurementBasis === 'Opening';
        if (needsCutback) {
          const rawW = o.rawWidth || o.width || 0;
          const rawH = o.rawHeight || o.height || 0;
          openingParts.push(`Measured Size: ${toFractionDisplay(rawW)}" × ${toFractionDisplay(rawH)}"`);
          const amtStr = o.cutbackAmount ? ` (${o.cutbackAmount}")` : ' (3/8")';
          openingParts.push(`Cutback: ${o.cutbackType || 'standard'}${amtStr}`);
        } else if (o.cutbackRequired) {
          const amtStr = o.cutbackAmount ? ` (${o.cutbackAmount}")` : '';
          openingParts.push(`Cutback: ${o.cutbackType || 'standard'}${amtStr}`);
        }
        if (o.cutbackNotes) {
          openingParts.push(`Cutback Note: ${o.cutbackNotes}`);
        }
        if (o.removalDetail) {
          openingParts.push(`Removal: ${o.removalDetail}`);
        }
        if (o.trimIncluded) {
          openingParts.push('Trim Included');
        }
        if (o.headerFlashingIncluded) {
          openingParts.push('Header Flashing Included');
        }
        if (o.mullGroup) {
          const structuralStr = o.structuralMullion ? ' (Structural)' : '';
          openingParts.push(`Mull Group: ${o.mullGroup}${structuralStr}`);
        }
        if (o.measurementGuidanceOverrideReason) {
          openingParts.push(`Guidance Override Reason: ${o.measurementGuidanceOverrideReason}`);
        }
        
        if (openingParts.length > 0) {
          extraNotes.push(`Line ${o.windowNumber || o.openingNumber || index + 1}: ${openingParts.join(', ')}`);
        }
      });

      const finalNotes = [appointment?.notes || appointment?.estimatorNotes, ...extraNotes].filter(Boolean).join('\n');
      if (finalNotes) {
        setCellValue(orderSheet, 'B59', finalNotes);
      }
    }

    // 5.5 Fill out the Warranty sheet
    const warrantySheet = workbook.getWorksheet('Warranty');
    if (warrantySheet) {
      fillWarrantyTab(warrantySheet);
    }

    // 6. Fill out the Maintenance Agreement
    const maintenanceSheet = workbook.getWorksheet('Maintenance Agreement ');
    if (maintenanceSheet) {
      const customer = appointment?.customer || {};
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      setCellValue(maintenanceSheet, 'C6', fullName);
      setCellValue(maintenanceSheet, 'I6', customer.phone || '');
      setCellValue(maintenanceSheet, 'B7', appointment?.jobAddress || customer.address || '');
      setCellValue(maintenanceSheet, 'F7', appointment?.city || customer.city || '');
      setCellValue(maintenanceSheet, 'H7', appointment?.state || customer.state || 'LA');
      setCellValue(maintenanceSheet, 'J7', appointment?.zip || customer.zip || '');
      
      if (appointment?.customer?.customerId) {
        setCellValue(maintenanceSheet, 'G6', appointment.customer.customerId);
      }
      
      const totalWindows = (appointment?.openings || []).reduce((sum: number, o: any) => sum + (o.quantity || 1), 0);
      maintenanceSheet.getCell('C8').value = totalWindows > 0 ? totalWindows : undefined;
      maintenanceSheet.getCell('E37').value = new Date().toLocaleDateString();
    }

    // 7. Inject sketch image into Contract and Order Form sheets if available
    if (bestSketch) {
      const base64Data = bestSketch.replace(/^data:image\/[a-z]+;base64,/, "");

      // Insert into Contract sheet white box (B33:K38 -> col 1, row 32 to col 10, row 37)
      if (contractSheet) {
        try {
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });
          contractSheet.addImage(imageId, {
            tl: { col: 1, row: 32 },
            br: { col: 10, row: 37 },
            editAs: 'absolute',
          });
        } catch (imgErr) {
          console.warn('Failed to embed sketch into Contract sheet:', imgErr);
        }
      }

      // Insert into Order Form sheet big blank box (B2:Q19 -> col 1, row 1 to col 16, row 18)
      if (orderSheet) {
        try {
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });
          orderSheet.addImage(imageId, {
            tl: { col: 1, row: 1 },
            br: { col: 16, row: 18 },
            editAs: 'absolute',
          });
        } catch (imgErr) {
          console.warn('Failed to embed sketch into Order Form sheet:', imgErr);
        }
      }
    }

    // 8. Save and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const customerLastName = appointment?.customer?.lastName || 'Customer';
    const filename = `${customerLastName}_WW_Contract_${new Date().getTime()}.xlsx`;
    
    saveAs(blob, filename);

  } catch (error) {
    console.error('Error generating Excel contract:', error);
    throw error;
  }
}

