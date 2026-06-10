import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export interface CustomerData {
  firstName: string; lastName: string; email?: string;
  address: string; city: string; state: string; zip: string;
  phone: string; phoneSecondary?: string;
}

export interface OpeningData {
  qty?: number; model?: string; vinylColor?: string;
  intColor?: string; extColor?: string;
  width?: number; height?: number; legHeight?: number; customRadius?: number;
  windowNumber?: number; hinge?: string; glassOption?: string;
  foamEnhanced?: string; gridStyle?: string; gridPattern?: string;
  obscureFull?: string; temperedFull?: string;
  nailFinNoJ?: string; nailFinWithJ?: string; fullScreen?: string;
  orielDim?: string; headerFlash?: string; foamExp?: string;
  typeExterior?: string; typeTrim?: string; typeRemoved?: string;
  typeInstall?: string; sillRepair?: string;
  roomLocation?: string; notes?: string;
  measurementBasis?: string;
  cutbackType?: string;
  headerType?: string;
}

export interface PricingData {
  totalListPrice?: number;
  totalAmount?: number;
  depositAmount?: number;
  balanceDue?: number;
  amtFinanced?: number;
  stJudeDonation?: number;
  yearBuilt?: string;
  customerId?: string;
}

export interface AppointmentExportData {
  customer: CustomerData;
  openings: OpeningData[];
  estimatorName?: string;
  estimatorEmail?: string;
  estimatorPhone?: string;
  estimatorEmpNum?: string;
  completeJob?: string;
  orderDate?: Date | string;
  poNumber?: string;
  notes?: string;
  sketchImageBase64?: string;
  pricing?: PricingData;
}

const OPENING_START_ROW = 31;
const OPEN_COLS = {
  qty: 'C', model: 'D', vinylColor: 'E', intColor: 'F', extColor: 'G',
  width: 'H', height: 'J', legHeight: 'K', customRadius: 'L',
  windowNumber: 'N', hinge: 'O', glassOption: 'P', foamEnhanced: 'Q',
  gridStyle: 'R', gridPattern: 'S', obscureFull: 'U', temperedFull: 'X',
  nailFinNoJ: 'Y', nailFinWithJ: 'Z', fullScreen: 'AA', orielDim: 'AB',
  headerFlash: 'AC', foamExp: 'AD', typeExterior: 'AF', typeTrim: 'AG',
  typeRemoved: 'AH', typeInstall: 'AK', sillRepair: 'AL',
};

function setCellValue(sheet: ExcelJS.Worksheet, cellAddr: string, value: any) {
  if (value === undefined || value === null || value === '') return;
  const cell = sheet.getCell(cellAddr);
  if (cell.formula || (cell as any).sharedFormula || (cell.value as any)?.sharedFormula) {
    cell.value = value;
  } else {
    cell.value = value;
  }
}

interface ProductCounts {
  dh4000: number; dh4000FE: number; picture: number;
  slider2: number; slider3: number; casement: number; dblCasement: number;
  patioDoor6: number; patioDoor8: number; specialty: number;
}

function countProductTypes(openings: OpeningData[]): ProductCounts {
  const c: ProductCounts = { dh4000: 0, dh4000FE: 0, picture: 0, slider2: 0, slider3: 0, casement: 0, dblCasement: 0, patioDoor6: 0, patioDoor8: 0, specialty: 0 };
  for (const o of openings) {
    const qty = o.qty || 1;
    const m = o.model || '';
    if (m === '3001') c.dh4000 += qty;
    else if (m === '3001-FE') c.dh4000FE += qty;
    else if (m === '3004') c.picture += qty;
    else if (m === '3002') c.slider2 += qty;
    else if (m === '3003') c.slider3 += qty;
    else if (['3005', '0951', '0952', '0971', '0973', '0979'].includes(m)) c.casement += qty;
    else if (['3006', '0972'].includes(m)) c.dblCasement += qty;
    else if (['6105', '6406'].includes(m)) c.patioDoor6 += qty;
    else if (['6108', '6408'].includes(m)) c.patioDoor8 += qty;
  }
  return c;
}

interface OptionCounts {
  fullScreen: number; nailFin: number; oriel: number; grid: number;
  obscure: number; tempered: number; beige: number; woodGrain: number;
  exteriorColor: number; foamWrap: number; argon: number;
  stormRemoval: number; windowRemoval: number; steelRemoval: number;
  alumInStucco: number; mullion: number; structuralMull: number;
  cutback: number; woodCutback: number; extCapping: number;
  vinylTrim: number; secondStory: number; headerFlash: number;
}

function countOptions(openings: OpeningData[]): OptionCounts {
  const c: OptionCounts = {
    fullScreen: 0, nailFin: 0, oriel: 0, grid: 0, obscure: 0, tempered: 0,
    beige: 0, woodGrain: 0, exteriorColor: 0, foamWrap: 0, argon: 0,
    stormRemoval: 0, windowRemoval: 0, steelRemoval: 0, alumInStucco: 0,
    mullion: 0, structuralMull: 0, cutback: 0, woodCutback: 0,
    extCapping: 0, vinylTrim: 0, secondStory: 0, headerFlash: 0,
  };
  for (const o of openings) {
    const qty = o.qty || 1;
    if (o.fullScreen) c.fullScreen += qty;
    if (o.nailFinNoJ || o.nailFinWithJ) c.nailFin += qty;
    if (o.orielDim) c.oriel += qty;
    if (o.gridStyle && o.gridStyle !== 'None') c.grid += qty;
    if (o.obscureFull) c.obscure += qty;
    if (o.temperedFull) c.tempered += qty;
    if (o.headerFlash) c.headerFlash += qty;
    const vc = (o.vinylColor || '').toUpperCase();
    if (vc === 'BG' || vc === 'BEIGE' || vc === 'CLAY') c.beige += qty;
    const rem = (o.typeRemoved || '').toUpperCase();
    if (rem === 'STORM') c.stormRemoval += qty;
    else if (rem === 'ALUM') c.windowRemoval += qty;
    else if (rem === 'STEEL') c.steelRemoval += qty;
    const trim = (o.typeTrim || '').toUpperCase();
    if (trim === 'VINYL') c.vinylTrim += qty;
    if (trim === 'CAP') c.extCapping += qty;
  }
  return c;
}

function fillContractSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  const { customer } = data;
  setCellValue(sheet, 'F9', `${customer.firstName} ${customer.lastName}`);
  setCellValue(sheet, 'J9', customer.email);
  setCellValue(sheet, 'F10', customer.address);
  setCellValue(sheet, 'S10', customer.phone);
  setCellValue(sheet, 'F11', customer.city);
  setCellValue(sheet, 'H11', customer.state || 'LA');
  setCellValue(sheet, 'L11', customer.zip);
  setCellValue(sheet, 'S11', customer.phoneSecondary);
  setCellValue(sheet, 'Q8', data.completeJob || 'Y');
  if (data.pricing?.customerId) setCellValue(sheet, 'K10', data.pricing.customerId);
  if (data.pricing?.yearBuilt) setCellValue(sheet, 'F41', data.pricing.yearBuilt);
  if (data.estimatorName) {
    setCellValue(sheet, 'D84', data.estimatorName);
  }
  let email = data.estimatorEmail || 'npearson@winworldinfo.com';
  if (email === 'nedpearson@gmail.com' || email === 'gpearson@winworldinfo.com') {
    email = 'npearson@winworldinfo.com';
  }
  setCellValue(sheet, 'D85', email);
  if (data.estimatorEmpNum) {
    setCellValue(sheet, 'C84', data.estimatorEmpNum);
    setCellValue(sheet, 'C85', data.estimatorEmpNum);
  }
  const counts = countProductTypes(data.openings);
  if (counts.dh4000 > 0) setCellValue(sheet, 'C15', counts.dh4000);
  if (counts.dh4000FE > 0) setCellValue(sheet, 'C16', counts.dh4000FE);
  if (counts.picture > 0) setCellValue(sheet, 'C20', counts.picture);
  if (counts.slider2 > 0) setCellValue(sheet, 'C21', counts.slider2);
  if (counts.slider3 > 0) setCellValue(sheet, 'C22', counts.slider3);
  if (counts.casement > 0) setCellValue(sheet, 'C23', counts.casement);
  if (counts.dblCasement > 0) setCellValue(sheet, 'C24', counts.dblCasement);
  if (counts.patioDoor6 > 0) setCellValue(sheet, 'C43', counts.patioDoor6);
  if (counts.patioDoor8 > 0) setCellValue(sheet, 'C44', counts.patioDoor8);

  const opts = countOptions(data.openings);
  if (opts.fullScreen > 0) setCellValue(sheet, 'M14', opts.fullScreen);
  if (opts.nailFin > 0) setCellValue(sheet, 'M26', opts.nailFin);
  if (opts.oriel > 0) setCellValue(sheet, 'M27', opts.oriel);
  if (opts.grid > 0) setCellValue(sheet, 'M28', opts.grid);
  if (opts.obscure > 0) setCellValue(sheet, 'M24', opts.obscure);
  if (opts.tempered > 0) setCellValue(sheet, 'M23', opts.tempered);
  if (opts.beige > 0) setCellValue(sheet, 'M19', opts.beige);
  if (opts.woodGrain > 0) setCellValue(sheet, 'M20', opts.woodGrain);
  if (opts.exteriorColor > 0) setCellValue(sheet, 'M29', opts.exteriorColor);
  if (opts.foamWrap > 0) setCellValue(sheet, 'M18', opts.foamWrap);
  if (opts.argon > 0) setCellValue(sheet, 'M16', opts.argon);
  if (opts.stormRemoval > 0) setCellValue(sheet, 'M41', opts.stormRemoval);
  if (opts.windowRemoval > 0) setCellValue(sheet, 'M42', opts.windowRemoval);
  if (opts.steelRemoval > 0) setCellValue(sheet, 'M43', opts.steelRemoval);
  if (opts.alumInStucco > 0) setCellValue(sheet, 'M44', opts.alumInStucco);
  if (opts.mullion > 0) setCellValue(sheet, 'M45', opts.mullion);
  if (opts.structuralMull > 0) setCellValue(sheet, 'M46', opts.structuralMull);
  if (opts.cutback > 0) setCellValue(sheet, 'M47', opts.cutback);
  if (opts.woodCutback > 0) setCellValue(sheet, 'M48', opts.woodCutback);
  if (opts.extCapping > 0) setCellValue(sheet, 'M49', opts.extCapping);
  if (opts.vinylTrim > 0) setCellValue(sheet, 'M50', opts.vinylTrim);
  if (opts.secondStory > 0) setCellValue(sheet, 'M53', opts.secondStory);
  if (opts.headerFlash > 0) setCellValue(sheet, 'M52', opts.headerFlash);

  if (data.pricing?.totalListPrice != null) setCellValue(sheet, 'T73', data.pricing.totalListPrice);
  setCellValue(sheet, 'T74', 0);
  setCellValue(sheet, 'T75', 0);
  if (data.pricing?.totalAmount != null) setCellValue(sheet, 'T76', data.pricing.totalAmount);
  if (data.pricing?.depositAmount != null && data.pricing.depositAmount > 0) setCellValue(sheet, 'T77', data.pricing.depositAmount);
  if (data.pricing?.balanceDue != null) setCellValue(sheet, 'T78', data.pricing.balanceDue);
  if (data.pricing?.amtFinanced) setCellValue(sheet, 'T79', data.pricing.amtFinanced);
  if (data.pricing?.stJudeDonation) setCellValue(sheet, 'T80', data.pricing.stJudeDonation);
}

function fillOrderFormSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  if (data.estimatorName) setCellValue(sheet, 'W18', data.estimatorName);
  if (data.estimatorPhone) setCellValue(sheet, 'AG18', data.estimatorPhone);
  if (data.poNumber) setCellValue(sheet, 'U9', data.poNumber);
  if (data.orderDate) setCellValue(sheet, 'AH9', data.orderDate);

  const extraNotes: string[] = [];
  data.openings.forEach((opening, index) => {
    const openingParts = [];
    if (opening.measurementBasis && opening.measurementBasis !== 'outside') openingParts.push(`Basis: ${opening.measurementBasis}`);
    if (opening.cutbackType && opening.cutbackType !== 'Needs cutback selection') openingParts.push(`Cutback: ${opening.cutbackType}`);
    if (opening.headerType && opening.headerType !== 'None' && opening.headerType !== '') openingParts.push(`Header: ${opening.headerType}`);
    if (openingParts.length > 0) extraNotes.push(`Line ${opening.windowNumber || index + 1}: ${openingParts.join(', ')}`);
  });
  const finalNotes = [data.notes, ...extraNotes].filter(Boolean).join('\n');
  if (finalNotes) setCellValue(sheet, 'B59', finalNotes);

  const mappedCols = Object.values(OPEN_COLS);
  for (let r = OPENING_START_ROW; r <= 54; r++) {
    for (const c of mappedCols) {
      const cell = sheet.getCell(`${c}${r}`);
      cell.value = null;
    }
  }

  for (let i = 0; i < Math.min(data.openings.length, 24); i++) {
    const opening = data.openings[i];
    const row = OPENING_START_ROW + i;
    if (opening.qty) setCellValue(sheet, `${OPEN_COLS.qty}${row}`, opening.qty);
    if (opening.model) setCellValue(sheet, `${OPEN_COLS.model}${row}`, opening.model);
    if (opening.vinylColor) setCellValue(sheet, `${OPEN_COLS.vinylColor}${row}`, opening.vinylColor);
    if (opening.intColor) setCellValue(sheet, `${OPEN_COLS.intColor}${row}`, opening.intColor);
    if (opening.extColor) setCellValue(sheet, `${OPEN_COLS.extColor}${row}`, opening.extColor);
    if (opening.width) setCellValue(sheet, `${OPEN_COLS.width}${row}`, opening.width);
    if (opening.height) setCellValue(sheet, `${OPEN_COLS.height}${row}`, opening.height);
    if (opening.legHeight) setCellValue(sheet, `${OPEN_COLS.legHeight}${row}`, opening.legHeight);
    if (opening.customRadius) setCellValue(sheet, `${OPEN_COLS.customRadius}${row}`, opening.customRadius);
    if (opening.windowNumber) setCellValue(sheet, `${OPEN_COLS.windowNumber}${row}`, opening.windowNumber);
    if (opening.hinge) setCellValue(sheet, `${OPEN_COLS.hinge}${row}`, opening.hinge);
    if (opening.glassOption) setCellValue(sheet, `${OPEN_COLS.glassOption}${row}`, opening.glassOption);
    if (opening.foamEnhanced) setCellValue(sheet, `${OPEN_COLS.foamEnhanced}${row}`, opening.foamEnhanced);
    if (opening.gridStyle) setCellValue(sheet, `${OPEN_COLS.gridStyle}${row}`, opening.gridStyle);
    if (opening.gridPattern) setCellValue(sheet, `${OPEN_COLS.gridPattern}${row}`, opening.gridPattern);
    if (opening.obscureFull) setCellValue(sheet, `${OPEN_COLS.obscureFull}${row}`, opening.obscureFull);
    if (opening.temperedFull) setCellValue(sheet, `${OPEN_COLS.temperedFull}${row}`, opening.temperedFull);
    if (opening.nailFinNoJ) setCellValue(sheet, `${OPEN_COLS.nailFinNoJ}${row}`, opening.nailFinNoJ);
    if (opening.nailFinWithJ) setCellValue(sheet, `${OPEN_COLS.nailFinWithJ}${row}`, opening.nailFinWithJ);
    if (opening.fullScreen) setCellValue(sheet, `${OPEN_COLS.fullScreen}${row}`, opening.fullScreen);
    if (opening.orielDim) setCellValue(sheet, `${OPEN_COLS.orielDim}${row}`, opening.orielDim);
    if (opening.headerFlash) setCellValue(sheet, `${OPEN_COLS.headerFlash}${row}`, opening.headerFlash);
    if (opening.foamExp) setCellValue(sheet, `${OPEN_COLS.foamExp}${row}`, opening.foamExp);
    if (opening.typeExterior) setCellValue(sheet, `${OPEN_COLS.typeExterior}${row}`, opening.typeExterior);
    if (opening.typeTrim) setCellValue(sheet, `${OPEN_COLS.typeTrim}${row}`, opening.typeTrim);
    if (opening.typeRemoved) setCellValue(sheet, `${OPEN_COLS.typeRemoved}${row}`, opening.typeRemoved);
    if (opening.typeInstall) setCellValue(sheet, `${OPEN_COLS.typeInstall}${row}`, opening.typeInstall);
    if (opening.sillRepair) setCellValue(sheet, `${OPEN_COLS.sillRepair}${row}`, opening.sillRepair);
  }
}

function calculateSketchFit(imageWidth: number, imageHeight: number) {
  const boxWidth = 651;
  const boxHeight = 215;
  const padding = 4;
  const availW = boxWidth - (padding * 2);
  const availH = boxHeight - (padding * 2);
  const scaleX = availW / imageWidth;
  const scaleY = availH / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  const fitWidth = Math.round(imageWidth * scale);
  const fitHeight = Math.round(imageHeight * scale);
  return { fitWidth, fitHeight, scale };
}

async function insertSketchImageBase64(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, base64: string, tl: any, br: any) {
  if (!base64) return;
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, "");
  const imageId = workbook.addImage({
    base64: base64Data,
    extension: 'png',
  });
  sheet.addImage(imageId, {
    tl: tl,
    br: br,
    editAs: 'absolute',
  });
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

export async function generateWorkbookLocally(data: AppointmentExportData, templatePath: string): Promise<Buffer> {
  if (!fs.existsSync(templatePath)) throw new Error(`Template not found at ${templatePath}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const contract = workbook.getWorksheet('Contract');
  if (contract) {
    fillContractSheet(contract, data);
    if (data.sketchImageBase64) {
      await insertSketchImageBase64(workbook, contract, data.sketchImageBase64, { col: 1, row: 32 }, { col: 10, row: 37 });
    }
  }

  const orderForm = workbook.getWorksheet('Order Form');
  if (orderForm) {
    fillOrderFormSheet(orderForm, data);
    if (data.sketchImageBase64) {
      await insertSketchImageBase64(workbook, orderForm, data.sketchImageBase64, { col: 1, row: 1 }, { col: 16, row: 18 });
    }
  }

  const maintenance = workbook.getWorksheet('Maintenance Agreement ');
  if (maintenance) {
    const totalWindows = data.openings.reduce((sum, o) => sum + (o.qty || 1), 0);
    setCellValue(maintenance, 'C8', totalWindows > 0 ? totalWindows : undefined);
  }

  const warranty = workbook.getWorksheet('Warranty');
  if (warranty) {
    fillWarrantyTab(warranty);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
