/**
 * Workbook Template Engine
 * Copies the master BTR template, populates cells from appointment data,
 * preserves all formatting/formulas/merges, and exports filled workbooks.
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const TEMPLATE_PATH = path.resolve(__dirname2, '../templates/window-world/btr-window-contract-template.xlsx');

// ── Opening row column mapping (mirrors frontend config) ──
const OPENING_START_ROW = 31;
const OPEN_COLS = {
  qty: 'C', model: 'D', vinylColor: 'E', intColor: 'F', extColor: 'G',
  width: 'H', height: 'J', legHeight: 'K', customRadius: 'L',
  windowNumber: 'N', hinge: 'O', glassOption: 'P', foamEnhanced: 'Q',
  gridStyle: 'R', gridPattern: 'S', obscureFull: 'U', temperedFull: 'X',
  nailFinNoJ: 'Y', nailFinWithJ: 'Z', fullScreen: 'AA', orielDim: 'AB',
  headerFlash: 'AC', foamExp: 'AD', typeExterior: 'AF', typeTrim: 'AG',
  typeRemoved: 'AH', typeInstall: 'AK', sillRepair: 'AL',
  mullGroup: 'M',
};

export interface CustomerData {
  firstName: string; lastName: string; email?: string;
  address: string; city: string; state: string; zip: string;
  phone: string; phoneSecondary?: string;
}

export interface OpeningData {
  id?: string;
  groupId?: string;
  rawWidth?: number;
  rawHeight?: number;
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
  // ── Source of Truth Fields ──
  measurementBasis?: string;
  cutbackType?: string;
  headerType?: string;
  // ── New measurement/cutback/guidance fields ──
  preferredMeasurementBasis?: string;
  actualMeasurementBasis?: string;
  cutbackRequired?: boolean;
  cutbackNotes?: string;
  cutbackAmount?: number;
  removalDetail?: string;
  trimIncluded?: boolean;
  headerFlashingIncluded?: boolean;
  measurementGuidanceAccepted?: boolean;
  measurementGuidanceOverrideReason?: string;
  outsidePhotoId?: string;
  measurementVisualAnnotationId?: string;
  mullGroup?: string;
  installMullion?: boolean;
  structuralMullion?: boolean;
  argon?: boolean;
  floorNumber?: number;
  glassPackage?: string;
}

export interface PricingData {
  totalListPrice?: number;     // Computed subtotal (sum of all opening prices)
  totalAmount?: number;        // = totalListPrice (no tax)
  depositAmount?: number;      // Down payment collected
  balanceDue?: number;         // totalAmount - depositAmount
  amtFinanced?: number;        // Financing amount (if applicable)
  stJudeDonation?: number;     // St Jude donation (if applicable)
  yearBuilt?: string;
  customerId?: string;
  financeOptionCode?: string;
  financeTerm?: number;
  monthlyPayment?: number;
}

export interface AppointmentExportData {
  customer: CustomerData;
  openings: OpeningData[];
  estimatorName?: string;
  estimatorEmail?: string;
  estimatorPhone?: string;
  estimatorEmpNum?: string;
  completeJob?: string;
  orderDate?: Date;
  poNumber?: string;
  notes?: string;
  sketchImagePath?: string;           // Local path to sketch PNG (legacy/fallback)
  contractSketchImagePath?: string;   // Local path to Contract sketch PNG (legacy/fallback)
  sketchImageBuffer?: Buffer;         // In-memory PNG buffer (preferred — no temp file needed)
  contractSketchImageBuffer?: Buffer; // In-memory Contract sketch PNG buffer
  pricing?: PricingData;
  groups?: any[];
}

/**
 * Generate a filled workbook from appointment data.
 * Returns the ExcelJS workbook ready for streaming or saving.
 */
export async function generateFilledWorkbook(data: AppointmentExportData): Promise<ExcelJS.Workbook> {
  // Verify template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  }

  // Load the master template (preserves all formatting, merges, formulas)
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  // Enable full calculation on load so Excel recalculates formulas when opened
  workbook.calcProperties.fullCalcOnLoad = true;

  // ── Fill Contract Tab ──
  const contract = workbook.getWorksheet('Contract');
  if (contract) {
    fillContractSheet(contract, data);
    // Insert sketch image into the Contract sheet large white box (B33:K38)
    const contractBuf  = data.contractSketchImageBuffer || data.sketchImageBuffer;
    const contractPath = data.contractSketchImagePath  || data.sketchImagePath;
    if (contractBuf) {
      await insertSketchImageBuffer(workbook, contract, contractBuf,
        { col: 1, row: 32 }, { col: 10, row: 37 });
    } else if (contractPath) {
      await insertContractSketchImage(workbook, contract, contractPath);
    }
  }

  // ── Fill Order Form Tab ──
  const orderForm = workbook.getWorksheet('Order Form');
  if (orderForm) {
    fillOrderFormSheet(orderForm, data);
    // Insert sketch into B2:Q19 — prefer Buffer (no temp file), fall back to path
    const orderBuf  = data.sketchImageBuffer;
    const orderPath = data.sketchImagePath;
    if (orderBuf) {
      await insertSketchImageBuffer(workbook, orderForm, orderBuf,
        { col: 1, row: 1 }, { col: 16, row: 18 });
    } else if (orderPath) {
      await insertSketchImage(workbook, orderForm, orderPath);
    }
  }

  // ── Fill Maintenance Agreement Tab ──
  const maintenance = workbook.getWorksheet('Maintenance Agreement ');
  if (maintenance) {
    fillMaintenanceSheet(maintenance, data);
  }

  // ── Fill Warranty Tab ──
  const warranty = workbook.getWorksheet('Warranty');
  if (warranty) {
    fillWarrantyTab(warranty);
  }

  // ── Add Summary Tab ──
  addSummaryTab(workbook, data);

  // ── Add Photos & Measurements Tab ──
  await addPhotosTab(workbook, data);

  return workbook;
}

function addSummaryTab(workbook: ExcelJS.Workbook, data: AppointmentExportData) {
  const sheet = workbook.addWorksheet('Summary');
  // Column widths
  sheet.columns = [
    { width: 12 }, { width: 15 }, { width: 15 }, { width: 20 },
    { width: 20 }, { width: 25 }, { width: 25 }, { width: 12 }, { width: 30 }
  ];

  // Customer Info
  sheet.addRow(['Customer Information']).font = { bold: true, size: 14 };
  sheet.addRow(['Name:', `${data.customer.firstName} ${data.customer.lastName}`]);
  sheet.addRow(['Address:', data.customer.address]);
  sheet.addRow(['City/State/Zip:', `${data.customer.city}, ${data.customer.state} ${data.customer.zip}`]);
  sheet.addRow(['Phone:', data.customer.phone]);
  sheet.addRow(['Email:', data.customer.email]);
  sheet.addRow([]);

  // Job Totals
  const counts = countProductTypes(data.openings);
  sheet.addRow(['Job Totals']).font = { bold: true, size: 14 };
  sheet.addRow(['Double Hung:', counts.dh4000 + counts.dh4000FE]);
  sheet.addRow(['Picture:', counts.picture]);
  sheet.addRow(['Slider 2-Lite:', counts.slider2]);
  sheet.addRow(['Slider 3-Lite:', counts.slider3]);
  sheet.addRow(['Casement:', counts.casement]);
  sheet.addRow(['Double Casement:', counts.dblCasement]);
  sheet.addRow(['Patio Door:', counts.patioDoor6 + counts.patioDoor8]);
  sheet.addRow([]);

  // Financial Summary
  sheet.addRow(['Financial Summary']).font = { bold: true, size: 14 };
  sheet.addRow(['Total List Price:', data.pricing?.totalListPrice || 0]);
  sheet.addRow(['Total Amount:', data.pricing?.totalAmount || 0]);
  sheet.addRow(['Deposit Amount:', data.pricing?.depositAmount || 0]);
  sheet.addRow(['Balance Due:', data.pricing?.balanceDue || 0]);
  sheet.addRow(['Amount Financed:', data.pricing?.amtFinanced || 0]);
  if (data.pricing?.financeOptionCode) sheet.addRow(['Finance Option:', data.pricing.financeOptionCode]);
  if (data.pricing?.financeTerm) sheet.addRow(['Term:', `${data.pricing.financeTerm} mos`]);
  if (data.pricing?.monthlyPayment) sheet.addRow(['Monthly Payment:', `$${data.pricing.monthlyPayment.toFixed(2)}`]);
  sheet.addRow([]);

  // Openings Table
  sheet.addRow(['Openings Details']).font = { bold: true, size: 14 };
  const headers = ['Opening #', 'Location', 'Model', 'Dimensions (W x H)', 'Exterior', 'Install/Removal', 'Glass/Grid', 'Mull Group', 'Notes'];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  
  data.openings.forEach((o, i) => {
    const dim = `${o.width || ''} x ${o.height || ''}`;
    const extParts = [];
    if (o.extColor) extParts.push(o.extColor);
    if (o.typeExterior) extParts.push(o.typeExterior);
    if (o.typeTrim) extParts.push(`Trim: ${o.typeTrim}`);
    const ext = extParts.join(' ');
    const inst = `${o.typeInstall || ''} / ${o.typeRemoved || ''}`;
    const glass = `${o.glassOption || ''} / ${o.gridStyle || 'None'}`;
    sheet.addRow([
      o.windowNumber || i + 1,
      o.roomLocation || '',
      o.model || '',
      dim,
      ext,
      inst,
      glass,
      o.mullGroup || '',
      o.notes || ''
    ]);
  });
}

async function addPhotosTab(workbook: ExcelJS.Workbook, data: AppointmentExportData) {
  const sheet = workbook.addWorksheet('Photos & Measurements');
  
  sheet.columns = [
    { width: 40 }, // Col A
    { width: 40 }, // Col B
  ];

  sheet.addRow(['Photos & Measurements']).font = { bold: true, size: 16 };
  sheet.addRow([]);

  // 1. Main sketch image
  sheet.addRow(['Main Sketch']).font = { bold: true, size: 12 };
  let currentRow = 4;
  
  const sketchBuf = data.contractSketchImageBuffer || data.sketchImageBuffer;
  if (sketchBuf) {
    try {
      const imageId = workbook.addImage({ buffer: sketchBuf as unknown as ArrayBuffer, extension: 'png' });
      sheet.addImage(imageId, {
        tl: { col: 0, row: currentRow - 1 },
        ext: { width: 600, height: 400 }
      });
      currentRow += 22;
    } catch (e) {
      console.warn('Could not add sketch to Photos tab', e);
    }
  } else {
    sheet.addRow(['No sketch available.']);
    currentRow += 1;
  }
  sheet.addRow([]);
  currentRow += 1;

  // 2. Individual Opening Photos
  sheet.addRow(['Opening Photos']).font = { bold: true, size: 14 };
  currentRow += 1;

  const { downloadFileAsBuffer, BUCKETS } = await import('./services/storageService.js');
  
  const sortedOpenings = [...data.openings].sort((a, b) => (a.windowNumber || 0) - (b.windowNumber || 0));

  for (const o of sortedOpenings) {
    if (o.outsidePhotoId || o.measurementVisualAnnotationId) {
      sheet.addRow([`Opening #${o.windowNumber || 'Unknown'} - ${o.roomLocation || ''}`]).font = { bold: true };
      currentRow += 1;
      
      let maxImageRows = 0;
      
      if (o.outsidePhotoId) {
        sheet.getCell(`A${currentRow}`).value = 'Outside Photo';
        const buf = await downloadFileAsBuffer(BUCKETS.OPENING_PHOTOS, o.outsidePhotoId);
        if (buf) {
          try {
            const imageId = workbook.addImage({ buffer: buf as unknown as ArrayBuffer, extension: 'jpeg' });
            sheet.addImage(imageId, {
              tl: { col: 0, row: currentRow },
              ext: { width: 300, height: 300 }
            });
            maxImageRows = 16;
          } catch(e) {}
        }
      }

      if (o.measurementVisualAnnotationId) {
        sheet.getCell(`B${currentRow}`).value = 'Measurement/Annotation';
        const buf = await downloadFileAsBuffer(BUCKETS.OPENING_PHOTOS, o.measurementVisualAnnotationId);
        if (buf) {
          try {
            const imageId = workbook.addImage({ buffer: buf as unknown as ArrayBuffer, extension: 'jpeg' });
            sheet.addImage(imageId, {
              tl: { col: 1, row: currentRow },
              ext: { width: 300, height: 300 }
            });
            maxImageRows = Math.max(maxImageRows, 16);
          } catch(e) {}
        }
      }
      
      currentRow += maxImageRows + 2;
    }
  }
}

export async function buildWindowWorldOrderData(appointmentId: string, companyId: string, quoteSource?: { type: string, id: string }): Promise<{ exportData: AppointmentExportData, activeMarkers: any[] }> {
  const { prisma } = await import('./index.js');
  
  const [appt, financeSelection] = await Promise.all([
    prisma.appointment.findFirst({
      where: { id: appointmentId, companyId },
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        lineItems: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.appointmentFinanceSelection.findUnique({
      where: { appointmentId },
      include: { financeOption: true },
    }),
  ]);
  
  if (!appt) {
    throw new Error(`[OrderFormGeneration] Appointment ${appointmentId} not found for company ${companyId}`);
  }

  const { validateSketchForExport, normalizeSketchForDocumentExport } = await import('./services/printSafeSketchRenderer.js');
  const sketchValResult = await validateSketchForExport(appointmentId, companyId);
  if (!sketchValResult.success) {
    const errorMsg = sketchValResult.issues?.[0]?.message || 'Sketch export validation failed';
    console.warn('[OrderFormGeneration] Sketch validation failed (continuing without sketch): ' + errorMsg);
  }

  const sketch = await prisma.formSketch.findFirst({
    where: { appointmentId },
    include: {
      markers: {
        include: {
          links: { include: { opening: true } }
        }
      },
      markerGroups: {
        include: {
          members: true
        }
      }
    }
  });

  const { openings: normalizedOpenings, activeMarkers } = normalizeSketchForDocumentExport(appt, sketch, appt.openings);
  
  let finalOpenings = normalizedOpenings;

  // Filter openings if Quote Group is specified
  if (quoteSource && quoteSource.type === 'quote_group') {
    const group = await prisma.quoteGroup.findFirst({
      where: { id: quoteSource.id, appointmentId },
      include: { openings: true }
    });
    if (group) {
      const selectedIds = group.openings.map((i: any) => i.openingId).filter(Boolean);
      finalOpenings = finalOpenings.filter((o: any) => selectedIds.includes(o.id));
    }
  } else if (quoteSource && quoteSource.type === 'combined_quote') {
    const combo = await prisma.combinedQuote.findFirst({
      where: { id: quoteSource.id, appointmentId },
      include: { quoteGroups: { include: { quoteGroup: { include: { openings: true } } } } }
    });
    if (combo) {
      const selectedIds = new Set<string>();
      for (const g of combo.quoteGroups) {
        if (g.quoteGroup) {
          for (const item of g.quoteGroup.openings) {
            if (item.openingId) selectedIds.add(item.openingId);
          }
        }
      }
      finalOpenings = finalOpenings.filter((o: any) => selectedIds.has(o.id));
    }
  }

  // Filter markers to match the final openings
  const finalOpeningIds = new Set(finalOpenings.map((o: any) => o.id));
  const finalActiveMarkers = activeMarkers.filter((m: any) => {
    const opId = m.links?.[0]?.openingId;
    return opId ? finalOpeningIds.has(opId) : false;
  });

  const openingToGroupId = new Map<string, string>();
  if (sketch?.markerGroups) {
    for (const group of sketch.markerGroups) {
      if (!group.groupType.startsWith('mull') && group.groupType !== 'twin' && group.groupType !== 'triple' && group.groupType !== 'bay_bow') continue;
      for (const member of group.members) {
        const marker = sketch.markers?.find((m: any) => m.id === member.markerId);
        if (marker && marker.links) {
          for (const link of marker.links) {
            if (link.openingId) {
              openingToGroupId.set(link.openingId, group.id);
            }
          }
        }
      }
    }
  }

  const c = appt.customer;
  const { resolveWindowWorldModel, abbreviateWindowWorldColor, abbreviateType, resolveWorkbookDefaults } = await import('./utils/orderFormMapping.js');

  const openingsData: OpeningData[] = [];
  for (const rawOpening of finalOpenings) {
    // Apply business-safe defaults so workbook cells are never blank for standard fields
    const o = resolveWorkbookDefaults(rawOpening);
    const modelCode = resolveWindowWorldModel(o);
    if (!modelCode) {
      console.warn('[OrderFormGeneration] Opening MODEL is missing; emitting row without a model code.');
    }

    openingsData.push({
      id: o.id,
      groupId: o.id ? openingToGroupId.get(o.id) : undefined,
      rawWidth: o.rawWidth || undefined,
      rawHeight: o.rawHeight || undefined,
      qty: o.quantity ?? 1,
      model: modelCode ?? undefined,
      vinylColor: abbreviateWindowWorldColor(o.exteriorColor) || '',
      intColor: abbreviateWindowWorldColor(o.interiorColor) || '',
      extColor: abbreviateWindowWorldColor(o.exteriorColor) || '',
      width: o.width || undefined,
      height: o.height || undefined,
      legHeight: o.legHeight || undefined,
      customRadius: o.customRadius || undefined,
      windowNumber: o.openingNumber,
      hinge: o.hinge || undefined,
      glassOption: (o.glassPackage || '').toLowerCase().includes('solar') || (o.glassPackage || '').toLowerCase().includes('low') ? 'LEE' : (o.glassPackage || undefined),
      foamEnhanced: o.foamEnhanced ? 'FE' : undefined,
      gridStyle: o.gridStyle || undefined,
      gridPattern: o.gridPattern || undefined,
      temperedFull: o.temperedGlass === 'full' ? 'FULL' : o.temperedGlass === 'half' ? 'BSO' : undefined,
      obscureFull: o.obscureGlass === 'full' ? 'FULL' : o.obscureGlass === 'half' ? 'BSO' : undefined,
      fullScreen: (o.screenOption === 'Full' || o.screenOption === 'Full Screen') ? 'Y' : undefined,
      nailFinNoJ: o.nailFin && !o.exteriorType?.toLowerCase().includes('j') ? 'X' : undefined,
      nailFinWithJ: o.nailFin && o.exteriorType?.toLowerCase().includes('j') ? 'X' : undefined,
      orielDim: (o.oriel || o.productCategory === 'oriel' || String(o.productModel || '').toLowerCase().includes('oriel')) ? (o.orielUpperSashHeight ? String(o.orielUpperSashHeight) : '') : '',
      headerFlash: (o.exteriorSurface === 'vinyl_siding' || o.exteriorSurface === 'wood_siding' || o.exteriorType === 'siding') ? 'Y' : undefined,
      typeExterior: abbreviateType(o.exteriorSurface || o.exteriorType, 'exterior') || undefined,
      typeTrim: abbreviateType(o.trimType, 'trim') || undefined,
      typeRemoved: abbreviateType(o.removalType, 'remove') || undefined,
      typeInstall: abbreviateType(o.installType, 'install') || undefined,
      sillRepair: o.sillRepair ? 'X' : undefined,
      roomLocation: o.roomLocation || undefined,
      notes: o.customerNotes || undefined,
      preferredMeasurementBasis: o.preferredMeasurementBasis || undefined,
      actualMeasurementBasis: o.actualMeasurementBasis || undefined,
      cutbackRequired: o.cutbackRequired ?? undefined,
      cutbackType: o.cutbackType || undefined,
      cutbackAmount: o.cutbackAmount || undefined,
      cutbackNotes: o.cutbackNotes || undefined,
      removalDetail: o.removalDetail || undefined,
      trimIncluded: o.trimIncluded ?? undefined,
      headerFlashingIncluded: o.headerFlashingIncluded ?? undefined,
      measurementGuidanceAccepted: o.measurementGuidanceAccepted ?? undefined,
      measurementGuidanceOverrideReason: o.measurementGuidanceOverrideReason || undefined,
      outsidePhotoId: o.outsidePhotoId || undefined,
      measurementVisualAnnotationId: o.measurementVisualAnnotationId || undefined,
      mullGroup: o.mullGroup || undefined,
      installMullion: o.installMullion ?? undefined,
      structuralMullion: o.structuralMullion ?? undefined,
      argon: o.argon ?? undefined,
      floorNumber: o.floorNumber ?? undefined,
      glassPackage: o.glassPackage || undefined,
    });
  }

  const exportData: AppointmentExportData = {
    customer: {
      firstName: c?.firstName || '',
      lastName: c?.lastName || '',
      email: c?.email || '',
      address: appt.jobAddress || c?.address || '',
      city: appt.jobCity || c?.city || '',
      state: appt.jobState || c?.state || 'LA',
      zip: appt.jobZip || c?.zip || '',
      phone: c?.phone || '',
      phoneSecondary: c?.phone2 || undefined,
    },
    openings: openingsData,
    estimatorName: appt.user?.name || undefined,
    estimatorEmail: 'npearson@winworldinfo.com',
    estimatorEmpNum: '',
    estimatorPhone: '225-273-0352', // keeping existing logic but can update if needed. Let's just fix the email.
    completeJob: appt.completeJob ? 'YES' : 'NO',
    orderDate: appt.appointmentDate || new Date(),
    poNumber: appt.poNumber || undefined,
    notes: appt.notes || undefined,
    pricing: {
      totalListPrice: appt.subtotal,
      totalAmount: appt.totalAmount,
      depositAmount: appt.depositAmount,
      balanceDue: appt.balanceDue,
      amtFinanced: financeSelection?.amountFinanced || appt.financingAmount || undefined,
      financeOptionCode: (financeSelection?.financeOption as any)?.code || financeSelection?.financeOption?.name || undefined,
      financeTerm: financeSelection?.termMonths || undefined,
      monthlyPayment: financeSelection?.monthlyPayment || undefined,
      customerId: c?.customerId || undefined,
    },
    groups: sketch?.markerGroups || [],
  };

  return { exportData, activeMarkers: finalActiveMarkers };
}

function setCellValue(sheet: ExcelJS.Worksheet, cellAddr: string, value: any) {
  if (value === undefined || value === null) return;
  const cell = sheet.getCell(cellAddr);
  if (value === '') {
    cell.value = '';
    return;
  }
  
  // If we are injecting a hard value, we must destroy any existing template formula,
  // otherwise Excel will silently overwrite our value upon opening the file.
  if (cell.formula || (cell as any).sharedFormula || (cell.value as any)?.sharedFormula) {
    cell.value = value; // Replace formula object with primitive
  } else {
    cell.value = value;
  }
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

function fillContractSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  const { customer } = data;

  // Customer info
  setCellValue(sheet, 'F9', `${customer.firstName} ${customer.lastName}`);
  setCellValue(sheet, 'J9', customer.email);
  setCellValue(sheet, 'F10', customer.address);
  setCellValue(sheet, 'S10', customer.phone);
  setCellValue(sheet, 'F11', customer.city);
  setCellValue(sheet, 'H11', customer.state || 'LA');
  setCellValue(sheet, 'L11', customer.zip);
  setCellValue(sheet, 'S11', customer.phoneSecondary);

  // Job info
  setCellValue(sheet, 'Q8', data.completeJob || 'Y');

  // Customer ID
  if (data.pricing?.customerId) {
    setCellValue(sheet, 'K10', data.pricing.customerId);
  }

  // Year built (for lead containment law)
  if (data.pricing?.yearBuilt) {
    setCellValue(sheet, 'F41', data.pricing.yearBuilt);
  }

  // Estimator — rows 84-85
  if (data.estimatorName) {
    setCellValue(sheet, 'D84', data.estimatorName);
  }
  setCellValue(sheet, 'D85', data.estimatorEmail);
  setCellValue(sheet, 'C84', ''); // Left blank as requested
  setCellValue(sheet, 'C85', ''); // Left blank as requested

  // Auto-count product types from openings — WINDOWS
  const counts = countProductTypes(data.openings);
  if (counts.dh4000 > 0) setCellValue(sheet, 'C15', counts.dh4000);
  if (counts.dh4000FE > 0) setCellValue(sheet, 'C16', counts.dh4000FE);
  if (counts.picture > 0) setCellValue(sheet, 'C20', counts.picture);
  if (counts.slider2 > 0) setCellValue(sheet, 'C21', counts.slider2);
  if (counts.slider3 > 0) setCellValue(sheet, 'C22', counts.slider3);
  if (counts.casement > 0) setCellValue(sheet, 'C23', counts.casement);
  if (counts.dblCasement > 0) setCellValue(sheet, 'C24', counts.dblCasement);
  if (counts.specialty > 0) setCellValue(sheet, 'C25', counts.specialty);

  // DOORS — rows 43-46 on Contract
  if (counts.patioDoor6 > 0) setCellValue(sheet, 'C43', counts.patioDoor6);
  if (counts.patioDoor8 > 0) setCellValue(sheet, 'C44', counts.patioDoor8);

  // Auto-count options from openings
  const opts = countOptions(data.openings);
  if (opts.fullScreen > 0) setCellValue(sheet, 'M14', opts.fullScreen);
  if (opts.nailFin > 0) setCellValue(sheet, 'M26', opts.nailFin);
  if (opts.oriel > 0) setCellValue(sheet, 'M27', opts.oriel);
  if (opts.grid > 0) setCellValue(sheet, 'M28', opts.grid);
  if (opts.obscure > 0) setCellValue(sheet, 'M24', opts.obscure);
  if (opts.temperedSqFt > 0) setCellValue(sheet, 'M23', Number(opts.temperedSqFt.toFixed(2)));
  if (opts.beige > 0) setCellValue(sheet, 'M19', opts.beige);
  if (opts.woodGrain > 0) setCellValue(sheet, 'M20', opts.woodGrain);
  if (opts.exteriorColor > 0) setCellValue(sheet, 'M29', opts.exteriorColor);
  if (opts.foamWrap > 0) setCellValue(sheet, 'M18', opts.foamWrap);
  if (opts.argon > 0) setCellValue(sheet, 'M16', opts.argon);
  if (opts.solarZone > 0) setCellValue(sheet, 'M21', opts.solarZone);
  if (opts.solarZoneElite > 0) {
    setCellValue(sheet, 'M22', opts.solarZoneElite);
    // The template hardcodes V22 as "INCL", which breaks summation and hides the actual price.
    setCellValue(sheet, 'V22', { formula: 'IF(M22="","",IF((M22-ValuePlusQty)>0,(M22-ValuePlusQty)*T22,0))' });
  }
  
  // Default ValuePlusQty (M36) to 0 so that Excel formulas like (M21 - ValuePlusQty) don't evaluate to #VALUE! when M36 is empty
  setCellValue(sheet, 'M36', 0);

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

  // Pricing — write computed values directly; these override any template formulas
  // so the numbers are always accurate regardless of what the formula was doing.
  if (data.pricing?.totalListPrice != null) setCellValue(sheet, 'T73', data.pricing.totalListPrice);
  setCellValue(sheet, 'T74', 150); // Hardcoded $150 admin fee
  setCellValue(sheet, 'T75', 0); // No tax — Window World does not charge sales tax
  if (data.pricing?.totalAmount != null) setCellValue(sheet, 'T76', data.pricing.totalAmount);
  if (data.pricing?.depositAmount != null && data.pricing.depositAmount > 0) setCellValue(sheet, 'T77', data.pricing.depositAmount);
  if (data.pricing?.balanceDue != null) setCellValue(sheet, 'T78', data.pricing.balanceDue);
  if (data.pricing?.amtFinanced) setCellValue(sheet, 'T79', data.pricing.amtFinanced);
  if (data.pricing?.financeOptionCode) {
    setCellValue(sheet, 'S81', `Finance Option: ${data.pricing.financeOptionCode}`);
  }
  if (data.pricing?.financeTerm) {
    setCellValue(sheet, 'T81', `Term: ${data.pricing.financeTerm} mos`);
  }
  if (data.pricing?.monthlyPayment) {
    setCellValue(sheet, 'T82', `Monthly Payment: $${data.pricing.monthlyPayment.toFixed(2)}`);
  }
  if (data.pricing?.stJudeDonation) setCellValue(sheet, 'T80', data.pricing.stJudeDonation);
}

function fillOrderFormSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  setCellValue(sheet, 'W18', data.estimatorName);
  setCellValue(sheet, 'AG18', data.estimatorPhone);
  setCellValue(sheet, 'AJ18', data.estimatorEmail);

  // PO # and order date
  if (data.poNumber) setCellValue(sheet, 'U9', data.poNumber);
  if (data.orderDate) setCellValue(sheet, 'AH9', data.orderDate);
  
  // Customer Info on Order Form
  const customer = data.customer || {} as any;
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  setCellValue(sheet, 'S14', `Customer:    ${fullName}`);
  setCellValue(sheet, 'AF13', `Phone:    ${customer.phone || ''}`);
  setCellValue(sheet, 'AF14', `Phone:    ${customer.phoneSecondary || customer.phone || ''}`);
  setCellValue(sheet, 'S16', `Address    ${customer.address || ''}`);
  setCellValue(sheet, 'AD16', `City    ${customer.city || 'Baton Rouge'}`);
  setCellValue(sheet, 'AK16', `Zip    ${customer.zip || ''}`);

  // Notes - Append unmapped source of truth fields to job notes
  const extraNotes: string[] = [];
  data.openings.forEach((opening, index) => {
    const openingParts = [];
    const basis = opening.actualMeasurementBasis || opening.measurementBasis;
    if (basis && basis !== 'outside') {
      openingParts.push(`Basis: ${basis}`);
    }
    const needsCutback = opening.cutbackRequired || opening.actualMeasurementBasis === 'Opening' || opening.measurementBasis === 'Opening';
    if (needsCutback) {
      const w = opening.rawWidth || opening.width || 0;
      const h = opening.rawHeight || opening.height || 0;
      openingParts.push(`Measured Size: ${formatExcelFraction(w)}" × ${formatExcelFraction(h)}"`);
      const amtStr = opening.cutbackAmount ? ` (${opening.cutbackAmount}")` : ' (3/8")';
      openingParts.push(`Cutback: ${opening.cutbackType || 'standard'}${amtStr}`);
    } else if (opening.cutbackRequired) {
      const amtStr = opening.cutbackAmount ? ` (${opening.cutbackAmount}")` : '';
      openingParts.push(`Cutback: ${opening.cutbackType || 'standard'}${amtStr}`);
    }
    if (opening.cutbackNotes) {
      openingParts.push(`Cutback Note: ${opening.cutbackNotes}`);
    }
    if (opening.removalDetail) {
      openingParts.push(`Removal: ${opening.removalDetail}`);
    }
    if (opening.trimIncluded) {
      openingParts.push('Trim Included');
    }
    if (opening.headerFlashingIncluded) {
      openingParts.push('Header Flashing Included');
    }
    if (opening.mullGroup) {
      const structuralStr = opening.structuralMullion ? ' (Structural)' : '';
      openingParts.push(`Mull Group: ${opening.mullGroup}${structuralStr}`);
    }
    if (opening.measurementGuidanceOverrideReason) {
      openingParts.push(`Guidance Override Reason: ${opening.measurementGuidanceOverrideReason}`);
    }
    
    if (openingParts.length > 0) {
      extraNotes.push(`Line ${opening.windowNumber || index + 1}: ${openingParts.join(', ')}`);
    }
  });

  const finalNotes = [data.notes, ...extraNotes].filter(Boolean).join('\n');
  if (finalNotes) setCellValue(sheet, 'B59', finalNotes);

  // ── Clear mapped columns to prevent ExcelJS Shared Formula errors ──
  // The template contains shared formulas in these columns (e.g. glassOption in col P).
  // Overwriting a single cell breaks the shared formula clones below it.
  const mappedCols = Object.values(OPEN_COLS);
  for (let r = OPENING_START_ROW; r <= 54; r++) {
    for (const c of mappedCols) {
      const cell = sheet.getCell(`${c}${r}`);
      // Only clear if it's a formula, or just clear all to be safe?
      // Clearing all mapped cells ensures we don't trip over exceljs bugs.
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
      } else if (c === 'AK') {
        cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"EXT,INT,FULL"'] };
      }
    }
  }

  // ── Fill opening rows (31-54) ──
  let currentRowOffset = 0;
  const processedOpeningIds = new Set<string>();

  for (let i = 0; i < data.openings.length && currentRowOffset < 24; i++) {
    const opening = data.openings[i];
    if (opening.id && processedOpeningIds.has(opening.id)) continue;

    // Is it in a mull group?
    if (opening.groupId) {
        const groupOpenings = data.openings.filter(o => o.groupId === opening.groupId);
        groupOpenings.forEach(o => { if (o.id) processedOpeningIds.add(o.id); });

        // Write Mull Header Row
        let row = OPENING_START_ROW + currentRowOffset;
        setCellValue(sheet, `${OPEN_COLS.qty}${row}`, 1);
        setCellValue(sheet, `${OPEN_COLS.model}${row}`, 'Mull Unit');
        
        const totalRawW = groupOpenings.reduce((sum, o) => sum + (o.rawWidth || o.width || 0), 0);
        
        const needsCushion = groupOpenings.some(o => {
           return o.actualMeasurementBasis === 'Opening' || o.measurementBasis === 'Opening' || o.cutbackRequired;
        });
        const cushionAmount = groupOpenings.find(o => o.cutbackAmount)?.cutbackAmount || 0.375;
        const totalW = needsCushion ? totalRawW - cushionAmount : totalRawW;

        const maxH = Math.max(...groupOpenings.map(o => {
           let h = o.rawHeight || o.height || 0;
           return h;
        }));
        
        const finalMaxH = needsCushion ? maxH - cushionAmount : maxH;
        
        setCellValue(sheet, `${OPEN_COLS.width}${row}`, formatExcelFraction(totalW));
        setCellValue(sheet, `${OPEN_COLS.height}${row}`, formatExcelFraction(finalMaxH));
        setCellValue(sheet, `${OPEN_COLS.windowNumber}${row}`, `Consisting of ${groupOpenings.length} Windows:`);
        
        currentRowOffset++;
        
        const childGroups: Record<string, typeof groupOpenings> = {};
        for (const go of groupOpenings) {
          const isSpecial = !!go.legHeight || !!go.customRadius || go.model === 'specialty';
          const key = `${go.model}-${go.vinylColor}-${isSpecial}`;
          if (!childGroups[key]) childGroups[key] = [];
          childGroups[key].push(go);
        }

        for (const key in childGroups) {
          if (currentRowOffset >= 24) break;
          const children = childGroups[key];
          const first = children[0];
          row = OPENING_START_ROW + currentRowOffset;
          
          setCellValue(sheet, `${OPEN_COLS.qty}${row}`, children.length);
          setCellValue(sheet, `${OPEN_COLS.model}${row}`, first.model);
          setCellValue(sheet, `${OPEN_COLS.vinylColor}${row}`, first.vinylColor);
          setCellValue(sheet, `${OPEN_COLS.intColor}${row}`, first.intColor);
          setCellValue(sheet, `${OPEN_COLS.extColor}${row}`, first.extColor);
          setCellValue(sheet, `${OPEN_COLS.glassOption}${row}`, first.glassOption);
          setCellValue(sheet, `${OPEN_COLS.gridStyle}${row}`, first.gridStyle);
          setCellValue(sheet, `${OPEN_COLS.gridPattern}${row}`, first.gridPattern);
          
          setCellValue(sheet, `${OPEN_COLS.width}${row}`, '-');
          
          const isSpecial = !!first.legHeight || !!first.customRadius || first.model === 'specialty';
          if (isSpecial) {
              let dh = first.rawHeight || first.height || 0;
              const isOutside = first.actualMeasurementBasis === 'outside' || first.measurementBasis === 'outside';
              const needsCushion = first.actualMeasurementBasis === 'Opening' || first.measurementBasis === 'Opening' || isOutside;
              if (needsCushion) dh -= (first.cutbackAmount || 0.375);
              setCellValue(sheet, `${OPEN_COLS.height}${row}`, formatExcelFraction(dh));
              const winNums = children.map(c => c.windowNumber).join(',');
              setCellValue(sheet, `${OPEN_COLS.windowNumber}${row}`, first.legHeight ? `LEG: ${formatExcelFraction(first.legHeight)} (${winNums})` : winNums);
          } else {
             setCellValue(sheet, `${OPEN_COLS.height}${row}`, '-');
             setCellValue(sheet, `${OPEN_COLS.mullGroup}${row}`, 'R');
             setCellValue(sheet, `${OPEN_COLS.windowNumber}${row}`, children.map(c => c.windowNumber).join(','));
          }
          currentRowOffset++;
        }
        continue;
    }

    if (opening.id) processedOpeningIds.add(opening.id);
    const row = OPENING_START_ROW + currentRowOffset;
    
    if (opening.qty) setCellValue(sheet, `${OPEN_COLS.qty}${row}`, opening.qty);
    if (opening.model) setCellValue(sheet, `${OPEN_COLS.model}${row}`, opening.model);
    if (opening.vinylColor) setCellValue(sheet, `${OPEN_COLS.vinylColor}${row}`, opening.vinylColor);
    if (opening.intColor) setCellValue(sheet, `${OPEN_COLS.intColor}${row}`, opening.intColor);
    if (opening.extColor) setCellValue(sheet, `${OPEN_COLS.extColor}${row}`, opening.extColor);
    
    let displayWidth = opening.width;
    let displayHeight = opening.height;

    // Deduct standard cushion (default 3/8") only if it's an "Opening" measurement (or explicitly cutback)
    const needsCushion = opening.actualMeasurementBasis === 'Opening' || opening.measurementBasis === 'Opening' || opening.cutbackRequired;
    if (needsCushion) {
      const deduction = opening.cutbackAmount || 0.375;
      displayWidth = (opening.rawWidth !== undefined && opening.rawWidth !== null ? opening.rawWidth : (opening.width || 0)) - deduction;
      displayHeight = (opening.rawHeight !== undefined && opening.rawHeight !== null ? opening.rawHeight : (opening.height || 0)) - deduction;
    }

    if (displayWidth !== undefined) setCellValue(sheet, `${OPEN_COLS.width}${row}`, formatExcelFraction(displayWidth));
    if (displayHeight !== undefined) setCellValue(sheet, `${OPEN_COLS.height}${row}`, formatExcelFraction(displayHeight));
    if (opening.legHeight) setCellValue(sheet, `${OPEN_COLS.legHeight}${row}`, formatExcelFraction(opening.legHeight));
    if (opening.customRadius) setCellValue(sheet, `${OPEN_COLS.customRadius}${row}`, formatExcelFraction(opening.customRadius));
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
    if (opening.orielDim) setCellValue(sheet, `${OPEN_COLS.orielDim}${row}`, formatExcelFraction(Number(opening.orielDim)));
    if (opening.headerFlash) setCellValue(sheet, `${OPEN_COLS.headerFlash}${row}`, opening.headerFlash);
    if (opening.foamExp) setCellValue(sheet, `${OPEN_COLS.foamExp}${row}`, opening.foamExp);
    if (opening.typeExterior) setCellValue(sheet, `${OPEN_COLS.typeExterior}${row}`, opening.typeExterior);
    if (opening.typeTrim) setCellValue(sheet, `${OPEN_COLS.typeTrim}${row}`, opening.typeTrim);
    if (opening.typeRemoved) setCellValue(sheet, `${OPEN_COLS.typeRemoved}${row}`, opening.typeRemoved);
    if (opening.typeInstall) setCellValue(sheet, `${OPEN_COLS.typeInstall}${row}`, opening.typeInstall);
    if (opening.sillRepair) setCellValue(sheet, `${OPEN_COLS.sillRepair}${row}`, opening.sillRepair);
    if (opening.mullGroup) {
      setCellValue(sheet, `${OPEN_COLS.mullGroup}${row}`, opening.mullGroup);
      const mCell = sheet.getCell(`${OPEN_COLS.mullGroup}${row}`);
      mCell.border = { ...mCell.border, left: { style: 'medium' } };
      const nCell = sheet.getCell(`${OPEN_COLS.windowNumber}${row}`);
      nCell.border = { ...nCell.border, left: { style: 'medium' } };
    }

    currentRowOffset++;
  }
}

// ── Helpers: auto-count product types from openings ──

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
    else if (m === 'ORIEL' || m.toLowerCase().includes('specialty')) c.specialty += qty;
  }
  return c;
}

interface OptionCounts {
  fullScreen: number; nailFin: number; oriel: number; grid: number;
  obscure: number; temperedSqFt: number; beige: number; woodGrain: number;
  exteriorColor: number; foamWrap: number; argon: number;
  stormRemoval: number; windowRemoval: number; steelRemoval: number;
  alumInStucco: number; mullion: number; structuralMull: number;
  cutback: number; woodCutback: number; extCapping: number;
  vinylTrim: number; secondStory: number; headerFlash: number;
  solarZone: number; solarZoneElite: number;
}

function countOptions(openings: OpeningData[]): OptionCounts {
  const c: OptionCounts = {
    fullScreen: 0, nailFin: 0, oriel: 0, grid: 0, obscure: 0, temperedSqFt: 0,
    beige: 0, woodGrain: 0, exteriorColor: 0, foamWrap: 0, argon: 0,
    stormRemoval: 0, windowRemoval: 0, steelRemoval: 0, alumInStucco: 0,
    mullion: 0, structuralMull: 0, cutback: 0, woodCutback: 0,
    extCapping: 0, vinylTrim: 0, secondStory: 0, headerFlash: 0,
    solarZone: 0, solarZoneElite: 0,
  };
  for (const o of openings) {
    const qty = o.qty || 1;
    if (o.fullScreen) c.fullScreen += qty;
    if (o.nailFinNoJ || o.nailFinWithJ) c.nailFin += qty;
    if (o.orielDim) c.oriel += qty;
    if (o.gridStyle && o.gridStyle !== 'None') c.grid += qty;
    if (o.obscureFull) c.obscure += qty;
    
    if (o.temperedFull) {
      const w = o.width || 0;
      const h = o.height || 0;
      let sqft = (w * h) / 144;
      if (o.temperedFull === 'BSO') sqft /= 2;
      c.temperedSqFt += sqft * qty;
    }
    
    if (o.headerFlash) c.headerFlash += qty;

    // Argon
    if (o.argon) c.argon += qty;

    // Foam insulation wrap
    if (o.foamEnhanced || o.foamExp) c.foamWrap += qty;

    // SolarZone / glass packages
    const gp = (o.glassPackage || '').toUpperCase();
    if (gp.includes('SOLARZONE ELITE') || gp.includes('ELITE')) {
      c.solarZoneElite += qty;
    } else if (gp.includes('SOLARZONE') || gp.includes('LOW-E') || gp.includes('LOWE') || gp.includes('LEE') || gp === 'LE') {
      c.solarZone += qty;
    }

    // Mullions
    if (o.installMullion && !o.structuralMullion) c.mullion += qty;
    if (o.structuralMullion) c.structuralMull += qty;

    // Cutbacks
    const cbType = o.cutbackType || '';
    if (o.cutbackRequired || cbType) {
      if (cbType.includes('wood') || cbType === 'wood_trim_cutback') {
        c.woodCutback += qty;
      } else {
        c.cutback += qty;
      }
    }

    // Second story
    if (o.floorNumber && o.floorNumber > 1) {
      c.secondStory += qty;
    }

    // Color-based
    const vc = (o.vinylColor || '').toUpperCase();
    if (vc === 'BG' || vc === 'BEIGE' || vc === 'CLAY') c.beige += qty;
    const ec = (o.extColor || '').toUpperCase();
    if (ec && !['WHT', 'WHITE', 'NONE', ''].includes(ec)) c.exteriorColor += qty;

    // Removal types
    const rem = (o.typeRemoved || '').toUpperCase();
    const extSurface = (o.typeExterior || '').toUpperCase();
    if (rem === 'STORM') c.stormRemoval += qty;
    else if (rem === 'ALUM' && extSurface.includes('STUCCO')) c.alumInStucco += qty;
    else if (rem === 'ALUM') c.windowRemoval += qty;
    else if (rem === 'STEEL') c.steelRemoval += qty;
    
    // Trim/install
    const trim = (o.typeTrim || '').toUpperCase();
    if (trim === 'VINYL') c.vinylTrim += qty;
    if (trim === 'CAP' || trim === 'ALUM' || trim.includes('ALUM')) c.extCapping += qty;
  }
  return c;
}

// ── Fill Maintenance Agreement sheet ──
function fillMaintenanceSheet(sheet: ExcelJS.Worksheet, data: AppointmentExportData) {
  const { customer } = data;
  setCellValue(sheet, 'C6', `${customer.firstName} ${customer.lastName}`);
  setCellValue(sheet, 'I6', customer.phone);
  setCellValue(sheet, 'B7', customer.address);
  setCellValue(sheet, 'F7', customer.city);
  setCellValue(sheet, 'H7', customer.state || 'LA');
  setCellValue(sheet, 'J7', customer.zip);
  
  if (data.pricing?.customerId) {
    setCellValue(sheet, 'G6', data.pricing.customerId);
  }

  const totalWindows = data.openings.reduce((sum, o) => sum + (o.qty || 1), 0);
  setCellValue(sheet, 'C8', totalWindows > 0 ? totalWindows : undefined);
  
  if (data.orderDate) {
    setCellValue(sheet, 'E37', data.orderDate);
  }
}

/**
 * Generate filled workbook and return as a Buffer for download
 */
export async function generateWorkbookBuffer(data: AppointmentExportData): Promise<Buffer> {
  const workbook = await generateFilledWorkbook(data);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// ═══════════════════════════════════════════════════
//  SKETCH IMAGE INSERTION — Order Form (B2:R22)
// ═══════════════════════════════════════════════════

async function insertSketchImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  imagePath: string
): Promise<void> {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Sketch image not found at ${imagePath} — skipping insertion`);
    return;
  }

  const ext = path.extname(imagePath).toLowerCase();
  const extensionMap: Record<string, 'png' | 'jpeg' | 'gif'> = {
    '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.gif': 'gif',
  };
  const excelExt = extensionMap[ext] || 'png';

  const imageId = workbook.addImage({
    filename: imagePath,
    extension: excelExt,
  });

  sheet.addImage(imageId, {
    tl: { col: 1, row: 1 } as any,  // B2 (0-indexed)
    ext: { width: 643, height: 207 }, // default fallback size if imgW/H not read
    editAs: 'oneCell',
  });
}

// ═══════════════════════════════════════════════════
//  SKETCH IMAGE BUFFER INSERTION — accepts Buffer directly
//  Preferred over insertSketchImage when the PNG is in
//  memory (downloaded from Supabase Storage). No temp file.
// ═══════════════════════════════════════════════════

async function insertSketchImageBuffer(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  buffer: Buffer,
  tl: { col: number; row: number },
  br: { col: number; row: number }
): Promise<void> {
  if (!buffer || buffer.length === 0) {
    console.warn('[workbookEngine] insertSketchImageBuffer called with empty buffer — skipping');
    return;
  }

  let imgW = 800;
  let imgH = 500;
  if (buffer.length > 24 && buffer.slice(0, 4).toString('hex') === '89504e47') {
    imgW = buffer.readUInt32BE(16);
    imgH = buffer.readUInt32BE(20);
  }

  const { fitWidth, fitHeight } = calculateSketchFit(imgW, imgH);

  // ExcelJS addImage expects ArrayBuffer; convert Node Buffer via Uint8Array
  const arrayBuffer: ArrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const imageId = workbook.addImage({
    buffer: arrayBuffer,
    extension: 'png',
  });

  sheet.addImage(imageId, {
    tl: tl as any,
    ext: { width: fitWidth, height: fitHeight },
    editAs: 'oneCell',
  });
}

// ═══════════════════════════════════════════════════
//  SKETCH IMAGE INSERTION — Contract sheet white box
//  The large white sketch area is at approximately
//  B33:K38 (rows 33-38, cols B-K). The template has
//  a merged text block there (Good Housekeeping seal)
//  which we overlay the sketch image on top of.
// ═══════════════════════════════════════════════════

async function insertContractSketchImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  imagePath: string
): Promise<void> {
  if (!fs.existsSync(imagePath)) {
    console.warn(`Contract sketch image not found at ${imagePath} — skipping`);
    return;
  }

  const ext = path.extname(imagePath).toLowerCase();
  const extensionMap: Record<string, 'png' | 'jpeg' | 'gif'> = {
    '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.gif': 'gif',
  };
  const excelExt = extensionMap[ext] || 'png';

  let imgW = 800;
  let imgH = 500;
  try {
    if (ext === '.png') {
      const fd = fs.openSync(imagePath, 'r');
      const buf = Buffer.alloc(24);
      fs.readSync(fd, buf, 0, 24, 0);
      fs.closeSync(fd);
      if (buf.slice(0, 4).toString('hex') === '89504e47') {
        imgW = buf.readUInt32BE(16);
        imgH = buf.readUInt32BE(20);
      }
    }
  } catch (e) { console.debug("[swallowed error]", e); }

  const { fitWidth, fitHeight } = calculateSketchFit(imgW, imgH);

  const imageId = workbook.addImage({
    filename: imagePath,
    extension: excelExt,
  });

  // Contract sheet white sketch box: B33 to K38 (0-indexed: col=1,row=32)
  sheet.addImage(imageId, {
    tl: { col: 1, row: 32 } as any,
    ext: { width: fitWidth, height: fitHeight },
    editAs: 'oneCell',
  });
}

/**
 * Calculate contain-fit dimensions for a sketch image
 * to fit inside the Order Form sketch box (B2:R22)
 */
export function calculateSketchFit(imageWidth: number, imageHeight: number) {
  const boxWidth = 651;  // approx px width of B2:R22
  const boxHeight = 215; // approx px height of B2:R22
  const padding = 4;

  const availW = boxWidth - (padding * 2);
  const availH = boxHeight - (padding * 2);

  const scaleX = availW / imageWidth;
  const scaleY = availH / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Never scale up

  const fitWidth = Math.round(imageWidth * scale);
  const fitHeight = Math.round(imageHeight * scale);

  const tooSmall = fitWidth < 200 || fitHeight < 80;

  return {
    fitWidth,
    fitHeight,
    scale,
    tooSmall,
    warning: tooSmall ? 'Sketch may be too small to read in the Order Form box. Consider adding a full-size sketch page.' : null,
  };
}

/**
 * Convert numeric values (decimals) to fractional strings in 1/8 increments
 * for clean Excel display (e.g. 55.125 -> "55 1/8", 72 -> "72")
 */
export function formatExcelFraction(val: number | string | null | undefined): string | null {
  if (val === null || val === undefined) return null;
  
  let num: number;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (isNaN(Number(trimmed))) {
      return trimmed;
    }
    num = parseFloat(trimmed);
  } else {
    num = val;
  }
  
  if (isNaN(num) || num <= 0) return typeof val === 'string' ? val : null;

  const whole = Math.floor(num);
  const remainder = num - whole;
  if (remainder === 0) return String(whole);

  // Find closest 1/8th fraction
  const FRACTIONS: Record<string, number> = {
    '1/8': 0.125, '1/4': 0.25, '3/8': 0.375, '1/2': 0.5,
    '5/8': 0.625, '3/4': 0.75, '7/8': 0.875,
  };
  
  let closestFrac = '';
  let minDiff = Infinity;
  for (const [label, fracVal] of Object.entries(FRACTIONS)) {
    const diff = Math.abs(remainder - fracVal);
    if (diff < minDiff) {
      minDiff = diff;
      closestFrac = label;
    }
  }
  
  if (minDiff < 0.01 && closestFrac) {
    return whole > 0 ? `${whole} ${closestFrac}` : closestFrac;
  }
  
  return String(num);
}
