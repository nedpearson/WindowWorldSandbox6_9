/**
 * Workbook Field Map — BTR Window Contract Template
 * Maps every editable/populated cell to its app data source.
 * Generated from deep analysis of BTR_Window_Contract_Template.xlsx
 */

export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'select' | 'formula' | 'signature';
export type SourceType = 'customer' | 'appointment' | 'opening' | 'quote' | 'pricing' | 'user' | 'calculated' | 'manual' | 'ai';

export interface WorkbookField {
  key: string;
  sheet: 'Contract' | 'Order Form';
  cell: string;           // Primary cell address (merge origin)
  mergeRange?: string;    // e.g. "F9:H9"
  label: string;
  fieldType: FieldType;
  sourceType: SourceType;
  sourcePath?: string;    // e.g. "customer.firstName + customer.lastName"
  formula?: string;       // Excel formula if calculated
  required?: boolean;
  validation?: string;
  aiPopulatable?: boolean;
}

export interface OpeningRowMap {
  rowNumber: number;      // Excel row (31-54)
  columns: Record<string, string>; // fieldKey → column letter
}

// ═══════════════════════════════════════════════════
//  CONTRACT TAB — Field Mappings
// ═══════════════════════════════════════════════════
export const contractFields: WorkbookField[] = [
  // ── Customer Info (rows 9-11) ──
  { key: 'customerName', sheet: 'Contract', cell: 'F9', mergeRange: 'F9:H9', label: 'Customer Name', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.firstName + customer.lastName', required: true, aiPopulatable: true },
  { key: 'customerEmail', sheet: 'Contract', cell: 'J9', label: 'Email', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.email', aiPopulatable: true },
  { key: 'customerAddress', sheet: 'Contract', cell: 'F10', mergeRange: 'F10:H10', label: 'Address', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.address', required: true, aiPopulatable: true },
  { key: 'customerId', sheet: 'Contract', cell: 'K10', mergeRange: 'K10:N10', label: 'Customer ID #', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.id' },
  { key: 'primaryPhone', sheet: 'Contract', cell: 'S10', label: 'Primary #', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.phone', aiPopulatable: true },
  { key: 'customerCity', sheet: 'Contract', cell: 'F11', label: 'City', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.city', required: true, aiPopulatable: true },
  { key: 'customerState', sheet: 'Contract', cell: 'H11', label: 'State', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.state', required: true },
  { key: 'customerZip', sheet: 'Contract', cell: 'L11', label: 'Zip Code', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.zip', required: true, aiPopulatable: true },
  { key: 'secondaryPhone', sheet: 'Contract', cell: 'S11', label: 'Secondary #', fieldType: 'text', sourceType: 'customer', sourcePath: 'customer.phoneSecondary', aiPopulatable: true },
  { key: 'completeJob', sheet: 'Contract', cell: 'Q8', label: 'Complete Job?', fieldType: 'select', sourceType: 'appointment', validation: 'Y|N' },
  { key: 'remainingWindows', sheet: 'Contract', cell: 'W8', label: 'Remaining # of Windows?', fieldType: 'number', sourceType: 'appointment' },

  // ── Product Counts — Double Hung (rows 15-16) ──
  { key: 'dh4000Qty', sheet: 'Contract', cell: 'C15', label: 'DH 4000 Fusion Weld QTY', fieldType: 'number', sourceType: 'calculated', sourcePath: 'openings.count(model=3001)' },
  { key: 'dh4000Price', sheet: 'Contract', cell: 'H15', label: 'DH 4000 Price', fieldType: 'currency', sourceType: 'pricing' },
  { key: 'dh4000Total', sheet: 'Contract', cell: 'J15', label: 'DH 4000 Total', fieldType: 'formula', sourceType: 'calculated', formula: '=IF(C15="","",C15*H15)' },
  { key: 'dh4000FEQty', sheet: 'Contract', cell: 'C16', label: 'DH 4000 Foam Enhanced QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'dh4000FEPrice', sheet: 'Contract', cell: 'H16', label: 'DH 4000 FE Price', fieldType: 'currency', sourceType: 'pricing' },
  { key: 'dh4000FETotal', sheet: 'Contract', cell: 'J16', label: 'DH 4000 FE Total', fieldType: 'formula', sourceType: 'calculated', formula: '=IF(C16="","",C16*H16)' },

  // ── Other Styles (rows 20-27) ──
  { key: 'pictureQty', sheet: 'Contract', cell: 'C20', label: 'Picture Window QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'pictureTotal', sheet: 'Contract', cell: 'J20', formula: '=IF(C20="","",C20*H20)', label: 'Picture Total', fieldType: 'formula', sourceType: 'calculated' },
  { key: 'slider2Qty', sheet: 'Contract', cell: 'C21', label: '2 Lite Slider QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'slider3Qty', sheet: 'Contract', cell: 'C22', label: '3 Lite Slider QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'casementQty', sheet: 'Contract', cell: 'C23', label: 'Casement/Awning QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'dblCasementQty', sheet: 'Contract', cell: 'C24', label: 'Double Casement QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'foamUpchargeQty', sheet: 'Contract', cell: 'C25', label: 'Foam Enhanced Upcharge QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'shapeWithSashQty', sheet: 'Contract', cell: 'C26', label: 'SH Shape W/ Sash QTY', fieldType: 'number', sourceType: 'calculated' },

  // ── Specialty Windows (rows 28-32) ──
  { key: 'specialty1Desc', sheet: 'Contract', cell: 'E29', mergeRange: 'E29:G29', label: 'Specialty 1 Description', fieldType: 'text', sourceType: 'manual', aiPopulatable: true },
  { key: 'specialty1Qty', sheet: 'Contract', cell: 'C29', label: 'Specialty 1 QTY', fieldType: 'number', sourceType: 'manual' },
  { key: 'specialty1Price', sheet: 'Contract', cell: 'H29', label: 'Specialty 1 Price', fieldType: 'currency', sourceType: 'manual' },
  { key: 'specialty2Desc', sheet: 'Contract', cell: 'E30', mergeRange: 'E30:G30', label: 'Specialty 2 Description', fieldType: 'text', sourceType: 'manual', aiPopulatable: true },
  { key: 'specialty2Qty', sheet: 'Contract', cell: 'C30', label: 'Specialty 2 QTY', fieldType: 'number', sourceType: 'manual' },
  { key: 'specialty2Price', sheet: 'Contract', cell: 'H30', label: 'Specialty 2 Price', fieldType: 'currency', sourceType: 'manual' },
  { key: 'specialty3Desc', sheet: 'Contract', cell: 'E31', mergeRange: 'E31:G31', label: 'Specialty 3 Description', fieldType: 'text', sourceType: 'manual', aiPopulatable: true },
  { key: 'specialty3Qty', sheet: 'Contract', cell: 'C31', label: 'Specialty 3 QTY', fieldType: 'number', sourceType: 'manual' },
  { key: 'specialty3Price', sheet: 'Contract', cell: 'H31', label: 'Specialty 3 Price', fieldType: 'currency', sourceType: 'manual' },

  // ── Options (rows 13-30 right side) ──
  { key: 'halfScreenQty', sheet: 'Contract', cell: 'M13', label: 'Half Screen QTY', fieldType: 'formula', sourceType: 'calculated', formula: '=IF(ESVPQty=0,"",ESVPQty)' },
  { key: 'fullScreenQty', sheet: 'Contract', cell: 'M14', label: 'Full Screen QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'fullScreenTotal', sheet: 'Contract', cell: 'V14', formula: '=IF(M14="","",M14*T14)', label: 'Full Screen Total', fieldType: 'formula', sourceType: 'calculated' },
  { key: 'argonQty', sheet: 'Contract', cell: 'M16', label: 'Argon Gas QTY', fieldType: 'formula', sourceType: 'calculated' },
  { key: 'kryptonQty', sheet: 'Contract', cell: 'M17', label: 'Krypton Gas QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'foamWrapQty', sheet: 'Contract', cell: 'M18', label: 'Foam Insulation Wrap QTY', fieldType: 'formula', sourceType: 'calculated' },
  { key: 'beigeClayQty', sheet: 'Contract', cell: 'M19', label: 'Beige/Clay Color QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'woodGrainQty', sheet: 'Contract', cell: 'M20', label: 'Wood Grain QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'solarZoneQty', sheet: 'Contract', cell: 'M21', label: 'SolarZone Low-E QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'solarZoneEliteQty', sheet: 'Contract', cell: 'M22', label: 'SolarZone Elite QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'temperedSqFt', sheet: 'Contract', cell: 'M23', label: 'Tempered Glass Sq Ft', fieldType: 'number', sourceType: 'manual' },
  { key: 'obscureQty', sheet: 'Contract', cell: 'M24', label: 'Obscure Glass QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'glassBreakQty', sheet: 'Contract', cell: 'M25', label: 'Glass Break Warranty QTY', fieldType: 'formula', sourceType: 'calculated' },
  { key: 'nailFinQty', sheet: 'Contract', cell: 'M26', label: 'Nail Fin QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'orielQty', sheet: 'Contract', cell: 'M27', label: 'Oriel QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'gridQty', sheet: 'Contract', cell: 'M28', label: 'Grid QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'extColorQty', sheet: 'Contract', cell: 'M29', label: 'Exterior Color QTY', fieldType: 'number', sourceType: 'calculated' },

  // ── Specialty Options (rows 31-34 right side) ──
  { key: 'specOption1Desc', sheet: 'Contract', cell: 'O32', mergeRange: 'O32:S32', label: 'Specialty Option 1', fieldType: 'text', sourceType: 'manual' },
  { key: 'specOption1Qty', sheet: 'Contract', cell: 'M32', label: 'Spec Option 1 QTY', fieldType: 'number', sourceType: 'manual' },
  { key: 'specOption1Price', sheet: 'Contract', cell: 'T32', label: 'Spec Option 1 Price', fieldType: 'currency', sourceType: 'manual' },

  // ── Patio Doors (rows 43-60) ──
  { key: 'patioDoor6Qty', sheet: 'Contract', cell: 'C43', label: '6ft Patio Door QTY', fieldType: 'number', sourceType: 'calculated' },
  { key: 'patioDoor8Qty', sheet: 'Contract', cell: 'C44', label: '8ft Patio Door QTY', fieldType: 'number', sourceType: 'calculated' },

  // ── Additional Labor (rows 43-60 right side) ──
  { key: 'laborItem1Desc', sheet: 'Contract', cell: 'E43', mergeRange: 'E43:G43', label: 'Labor Item 1', fieldType: 'text', sourceType: 'manual', aiPopulatable: true },
  { key: 'laborItem1Qty', sheet: 'Contract', cell: 'C43', label: 'Labor 1 QTY', fieldType: 'number', sourceType: 'manual' },
  { key: 'laborItem1Price', sheet: 'Contract', cell: 'H43', label: 'Labor 1 Price', fieldType: 'currency', sourceType: 'manual' },

  // ── Pricing Summary (rows 73-80) ──
  { key: 'totalListPrice', sheet: 'Contract', cell: 'T73', mergeRange: 'T73:V73', label: 'Total List Price', fieldType: 'formula', sourceType: 'calculated', formula: '=SUM(J15:J16,J20:J26,J28:J32,J43:J60,V14,V16:V30,V32:V34,V36:V39,V41:V60)' },
  { key: 'adminFee', sheet: 'Contract', cell: 'T74', mergeRange: 'T74:V74', label: 'Administrative & Setup Fee', fieldType: 'currency', sourceType: 'pricing' },
  { key: 'salesTax', sheet: 'Contract', cell: 'T75', mergeRange: 'T75:V75', label: 'Sales Tax (MS Only 7%)', fieldType: 'currency', sourceType: 'calculated' },
  { key: 'totalAmount', sheet: 'Contract', cell: 'T76', mergeRange: 'T76:V76', label: 'Total Amount', fieldType: 'formula', sourceType: 'calculated', formula: '=SUM(T73:T75,T80)' },
  { key: 'depositAmount', sheet: 'Contract', cell: 'T77', mergeRange: 'T77:V77', label: 'Custom Order Deposit 50%', fieldType: 'formula', sourceType: 'calculated', formula: '=0.5*JobAmount' },
  { key: 'balanceDue', sheet: 'Contract', cell: 'T78', mergeRange: 'T78:V78', label: 'Balance Paid to Installer', fieldType: 'formula', sourceType: 'calculated', formula: '=JobAmount-T77' },
  { key: 'amtFinanced', sheet: 'Contract', cell: 'T79', label: 'Amount Financed', fieldType: 'currency', sourceType: 'manual' },
  { key: 'stjudeContrib', sheet: 'Contract', cell: 'T80', label: 'St. Jude Contribution', fieldType: 'currency', sourceType: 'manual' },

  // ── Payment (rows 82-83) ──
  { key: 'checkNumber', sheet: 'Contract', cell: 'L76', label: 'Check #', fieldType: 'text', sourceType: 'manual' },
  { key: 'cardInfo', sheet: 'Contract', cell: 'O83', label: 'Card Type/Number', fieldType: 'text', sourceType: 'manual' },
  { key: 'cardExpDate', sheet: 'Contract', cell: 'S83', label: 'Exp. Date', fieldType: 'text', sourceType: 'manual' },
  { key: 'cardSecCode', sheet: 'Contract', cell: 'V83', label: 'Sec. Code', fieldType: 'text', sourceType: 'manual' },

  // ── Signatures (rows 84-89) ──
  { key: 'empNumber', sheet: 'Contract', cell: 'C84', mergeRange: 'C84:C85', label: 'Employee #', fieldType: 'text', sourceType: 'user', sourcePath: 'user.empNumber' },
  { key: 'estimatorName', sheet: 'Contract', cell: 'D84', mergeRange: 'D84:G84', label: 'Estimator Name', fieldType: 'text', sourceType: 'user', sourcePath: 'user.name' },
  { key: 'estimatorDate', sheet: 'Contract', cell: 'H84', label: 'Estimator Date', fieldType: 'formula', sourceType: 'calculated', formula: '=TODAY()' },
  { key: 'ownerSignature1', sheet: 'Contract', cell: 'K84', mergeRange: 'K84:S84', label: 'Owner Signature 1', fieldType: 'signature', sourceType: 'manual', required: true },
  { key: 'ownerDate1', sheet: 'Contract', cell: 'T84', mergeRange: 'T84:V84', label: 'Owner Date 1', fieldType: 'formula', sourceType: 'calculated', formula: '=TODAY()' },
  { key: 'ownerSignature2', sheet: 'Contract', cell: 'K87', mergeRange: 'K87:S87', label: 'Owner Signature 2', fieldType: 'signature', sourceType: 'manual' },
  { key: 'ownerDate2', sheet: 'Contract', cell: 'T87', mergeRange: 'T87:V87', label: 'Owner Date 2', fieldType: 'date', sourceType: 'manual' },
];

// ═══════════════════════════════════════════════════
//  ORDER FORM TAB — Header Fields
// ═══════════════════════════════════════════════════
export const orderFormHeaderFields: WorkbookField[] = [
  { key: 'poNumber', sheet: 'Order Form', cell: 'S9', mergeRange: 'S9:T9', label: 'PO#', fieldType: 'text', sourceType: 'appointment' },
  { key: 'acctNumber', sheet: 'Order Form', cell: 'AB9', mergeRange: 'AB9:AC9', label: 'Acct #', fieldType: 'formula', sourceType: 'calculated', formula: '=Contract!K10' },
  { key: 'orderDate', sheet: 'Order Form', cell: 'AH9', label: 'Order Date', fieldType: 'date', sourceType: 'appointment', sourcePath: 'appointment.appointmentDate' },
  // Customer info pulled from Contract via formulas
  { key: 'ofCustomerName', sheet: 'Order Form', cell: 'S13', mergeRange: 'S13:AC13', label: 'Customer Name', fieldType: 'formula', sourceType: 'calculated', formula: '=Contract!F9' },
  { key: 'ofWorkPhone', sheet: 'Order Form', cell: 'AG13', mergeRange: 'AG13:AL13', label: 'Work Phone', fieldType: 'text', sourceType: 'customer' },
  { key: 'ofCellPhone', sheet: 'Order Form', cell: 'AG14', mergeRange: 'AG14:AL14', label: 'Cell Phone', fieldType: 'text', sourceType: 'customer' },
  { key: 'ofAddress', sheet: 'Order Form', cell: 'S15', mergeRange: 'S15:AC15', label: 'Address', fieldType: 'formula', sourceType: 'calculated', formula: '=Contract!F10' },
  { key: 'ofCity', sheet: 'Order Form', cell: 'AD15', mergeRange: 'AD15:AI15', label: 'City', fieldType: 'formula', sourceType: 'calculated', formula: '=Contract!F11' },
  { key: 'ofZip', sheet: 'Order Form', cell: 'AK15', mergeRange: 'AK15:AL15', label: 'Zip', fieldType: 'formula', sourceType: 'calculated', formula: '=Contract!L11' },
  { key: 'ofEstimator', sheet: 'Order Form', cell: 'W18', mergeRange: 'W18:AD18', label: 'Estimator', fieldType: 'text', sourceType: 'user', sourcePath: 'user.name' },
  { key: 'ofEstimatorPhone', sheet: 'Order Form', cell: 'AG18', mergeRange: 'AG18:AL18', label: 'Estimator Phone', fieldType: 'text', sourceType: 'user' },
];

// ═══════════════════════════════════════════════════
//  ORDER FORM — Sketch Box Image Overlay
//  The large blank box at upper-left of Order Form
//  Range: B2:R22 — completely empty, bordered area
// ═══════════════════════════════════════════════════
export interface SketchBoxConfig {
  key: string;
  sheet: 'Order Form';
  targetType: 'image_overlay';
  topLeftCell: string;
  bottomRightCell: string;
  range: string;
  label: string;
  sourcePath: string;
  required: boolean;
  exportToPdf: boolean;
  exportToExcel: boolean;
  // Approximate pixel dimensions (from column widths × 7.5px, row heights × 1.33px)
  approxWidthPx: number;
  approxHeightPx: number;
  aspectRatio: number;
  paddingPx: number;
}

export const ORDER_FORM_SKETCH_BOX: SketchBoxConfig = {
  key: 'order_form_sketch_box',
  sheet: 'Order Form',
  targetType: 'image_overlay',
  topLeftCell: 'B2',
  bottomRightCell: 'R22',
  range: 'B2:R22',
  label: 'Order Form Sketch / Drawing Box',
  sourcePath: 'appointment.sketch.primaryImage',
  required: true,
  exportToPdf: true,
  exportToExcel: true,
  approxWidthPx: 651,
  approxHeightPx: 215,
  aspectRatio: 3.03,
  paddingPx: 4,
};

// ═══════════════════════════════════════════════════
//  ORDER FORM TAB — Opening Row Column Mapping
//  Rows 31-54 are the 24 opening slots
// ═══════════════════════════════════════════════════
export const openingColumns = {
  rowNumber: 'B',      // Opening # (1-24)
  qty: 'C',            // Quantity
  model: 'D',          // Model number (e.g. 3001, 3002)
  vinylColor: 'E',     // WH, BG
  intColor: 'F',       // Interior color
  extColor: 'G',       // Exterior color
  width: 'H',          // MFG width
  separator: 'I',      // "x"
  height: 'J',         // MFG height
  legHeight: 'K',      // Leg height
  customRadius: 'L',   // Custom radius
  windowNumber: 'N',   // Window marker #
  hinge: 'O',          // Hinge side
  glassOption: 'P',    // LE, LEE
  foamEnhanced: 'Q',   // Foam enhanced Y/N
  gridStyle: 'R',      // Grid style
  gridPattern: 'S',    // Grid pattern (merged S:T)
  obscureFull: 'U',    // Obscure full/BSO (merged U:W)
  temperedFull: 'X',   // Tempered full/BSO
  nailFinNoJ: 'Y',     // Nail fin no J-channel
  nailFinWithJ: 'Z',   // Nail fin with J-channel
  fullScreen: 'AA',    // Full screen
  orielDim: 'AB',      // Oriel dimension
  headerFlash: 'AC',   // Header/flashing
  foamExp: 'AD',       // Foam expansion
  typeExterior: 'AF',  // Type exterior (BRICK/ALUM/STUCCO/WOOD)
  typeTrim: 'AG',      // Trim type (VINYL/CAP/F&T)
  typeRemoved: 'AH',   // Type removed (ALUM/STEEL/STORM/WOOD) (merged AH:AJ)
  typeInstall: 'AK',   // Type install (IN/OUT/EXT)
  sillRepair: 'AL',    // Sill repair (Yes/No)
} as const;

export const OPENING_START_ROW = 31;
export const OPENING_END_ROW = 54;
export const MAX_OPENINGS = OPENING_END_ROW - OPENING_START_ROW + 1; // 24

// ── Order Form reference value rows (rows 26-30) ──
export const orderFormRefRows = {
  extColorOptions: { row: 26, values: { AF: 'BRICK', AG: 'VINYL', AH: 'ALUM', AK: 'IN', AL: 'Yes' } },
  extColorOptions2: { row: 27, values: { AF: 'ALUM', AG: 'CAP', AH: 'STEEL', AK: 'OUT', AL: 'No' } },
  extColorOptions3: { row: 28, values: { AF: 'STUCCO', AG: 'F&T', AH: 'STORM', AK: 'EXT' } },
  extColorOptions4: { row: 29, values: { AF: 'WOOD', AH: 'WOOD' } },
  vinylColorRef: { row: 29, values: { E: 'WH', G: 'WH' } },
  vinylColorRef2: { row: 30, values: { E: 'BG', G: 'FW', P: 'LE' } },
};

// ── Order Form footer/signature area ──
export const orderFormFooterFields: WorkbookField[] = [
  { key: 'ofNotes', sheet: 'Order Form', cell: 'B59', mergeRange: 'B59:Q59', label: 'Notes', fieldType: 'text', sourceType: 'appointment', sourcePath: 'appointment.notes', aiPopulatable: true },
  { key: 'ofSignature', sheet: 'Order Form', cell: 'R56', mergeRange: 'R56:AE56', label: 'Owner Signature', fieldType: 'signature', sourceType: 'manual' },
  { key: 'ofSignatureDate', sheet: 'Order Form', cell: 'AF55', mergeRange: 'AF55:AL55', label: 'Signature Date', fieldType: 'date', sourceType: 'manual' },
];

// ═══════════════════════════════════════════════════
//  ORDER FORM — Summary/Count Rows (rows 60-170)
//  These are formula-driven model count summaries
// ═══════════════════════════════════════════════════
export const orderFormSummaryFormulas = [
  { cell: 'C75', name: 'Model0201', formula: '=SUMIF(ModelRange,"0201",NumWinsRange)' },
  { cell: 'C76', name: 'Model0501', formula: '=SUMIF(ModelRange,"0501",NumWinsRange)' },
  // ... all 70+ SUMIF formulas from rows 75-170 are preserved in the template
  // They auto-calculate from the opening rows — no app intervention needed
];

// ═══════════════════════════════════════════════════
//  COMBINED EXPORT: All fields in one flat list
// ═══════════════════════════════════════════════════
export const allFields: WorkbookField[] = [
  ...contractFields,
  ...orderFormHeaderFields,
  ...orderFormFooterFields,
];

// ═══════════════════════════════════════════════════
//  HELPER: Get all fields for a given sheet
// ═══════════════════════════════════════════════════
export function getFieldsForSheet(sheet: 'Contract' | 'Order Form'): WorkbookField[] {
  return allFields.filter(f => f.sheet === sheet);
}

export function getRequiredFields(): WorkbookField[] {
  return allFields.filter(f => f.required);
}

export function getAIPopulatableFields(): WorkbookField[] {
  return allFields.filter(f => f.aiPopulatable);
}
