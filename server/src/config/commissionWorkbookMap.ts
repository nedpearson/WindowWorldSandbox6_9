// ═══════════════════════════════════════════════════════════
// Commission Workbook Cell Mapping — BTR Commission Sheet
// Maps app data fields to exact workbook cell addresses.
// Form # CS-2400 — Revised 6/2/2023
// ═══════════════════════════════════════════════════════════

export interface CellMapping {
  sheet: string;
  cell: string;       // e.g. "D4"
  fieldKey: string;    // app field name
  sourceTable: string; // commission_records, appointment, customer
  sourceField: string; // column name in source
  required: boolean;
  formulaPreserved: boolean; // true = never overwrite
  writeBehavior: 'input' | 'formula_preserved' | 'calculated' | 'label';
  numFmt?: string;
  fallback?: any;
  notes?: string;
}

// ── CUSTOMER INFO CELLS (Rows 4-8) ──
// These are INPUT cells — we write directly to them
export const CUSTOMER_INFO_CELLS: CellMapping[] = [
  // Row 4
  { sheet: 'Commission', cell: 'D4',  fieldKey: 'customerId',    sourceTable: 'commission_records', sourceField: 'customerId_',    required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Customer ID' },
  { sheet: 'Commission', cell: 'J4',  fieldKey: 'homePhone',     sourceTable: 'commission_records', sourceField: 'customerPhone',  required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Home Phone (merged I4:J4)' },
  { sheet: 'Commission', cell: 'S4',  fieldKey: 'salesDate',     sourceTable: 'commission_records', sourceField: 'soldDate',       required: false, formulaPreserved: false, writeBehavior: 'input', numFmt: 'mm/dd/yyyy', notes: 'Sales Date' },
  // Row 5
  { sheet: 'Commission', cell: 'D5',  fieldKey: 'customerName',  sourceTable: 'commission_records', sourceField: 'customerName',   required: true,  formulaPreserved: false, writeBehavior: 'input', notes: 'Customer Name' },
  { sheet: 'Commission', cell: 'N5',  fieldKey: 'repNumber',     sourceTable: 'commission_records', sourceField: 'salesRepNumber', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Rep # (merged M5:N5)' },
  { sheet: 'Commission', cell: 'S5',  fieldKey: 'salesRep',      sourceTable: 'commission_records', sourceField: 'salesRepName',   required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Sales Rep Name' },
  // Row 6
  { sheet: 'Commission', cell: 'D6',  fieldKey: 'street',        sourceTable: 'commission_records', sourceField: 'customerAddress', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Street (merged D6:H6)' },
  { sheet: 'Commission', cell: 'O6',  fieldKey: 'result',        sourceTable: 'commission_records', sourceField: 'result',         required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Result (merged M6:Q6)' },
  // Row 7
  { sheet: 'Commission', cell: 'D7',  fieldKey: 'cityStZip',     sourceTable: 'commission_records', sourceField: 'customerCity',   required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'City,St,Zip (merged D7:H7)' },
  { sheet: 'Commission', cell: 'S7',  fieldKey: 'numWindows',    sourceTable: 'commission_records', sourceField: 'numWindows',     required: false, formulaPreserved: false, writeBehavior: 'input', notes: '# Windows' },
  // Row 8
  { sheet: 'Commission', cell: 'D8',  fieldKey: 'region',        sourceTable: 'commission_records', sourceField: 'region',         required: false, formulaPreserved: false, writeBehavior: 'input', fallback: 'BTR', notes: 'Region' },
  { sheet: 'Commission', cell: 'S8',  fieldKey: 'jobAmount',     sourceTable: 'commission_records', sourceField: 'jobAmount',      required: false, formulaPreserved: false, writeBehavior: 'input', numFmt: '$#,##0.00', notes: 'Job Amount' },
];

// ── PRODUCT QUANTITY CELLS (Col A = Quantity, feeds formulas in Col I) ──
// These are the LEFT side product counts
export const PRODUCT_QUANTITY_CELLS: CellMapping[] = [
  // Windows section
  { sheet: 'Commission', cell: 'A13', fieldKey: 'qty_dh_mech',        sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: '4000 DH Mech/Weld 3001 — qty' },
  { sheet: 'Commission', cell: 'A14', fieldKey: 'qty_dh_foam',        sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: '4000 DH Foam Enh. 3001-FE — qty' },
  { sheet: 'Commission', cell: 'A17', fieldKey: 'qty_picture',        sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Picture Window — qty' },
  { sheet: 'Commission', cell: 'A18', fieldKey: 'qty_2lite_slider',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: '2 Lite Slider — qty' },
  { sheet: 'Commission', cell: 'A19', fieldKey: 'qty_3lite_slider',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: '3 Lite Slider — qty' },
  { sheet: 'Commission', cell: 'A20', fieldKey: 'qty_casement',       sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Casement / Awning — qty' },
  { sheet: 'Commission', cell: 'A21', fieldKey: 'qty_dbl_casement',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Double Casement / Awning — qty' },
  { sheet: 'Commission', cell: 'A22', fieldKey: 'qty_foam_upcharge',  sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Foam Enhanced Upcharge — qty' },
  { sheet: 'Commission', cell: 'A23', fieldKey: 'qty_special_oper',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Special Shape w/ Oper. Sash — qty' },
  { sheet: 'Commission', cell: 'A25', fieldKey: 'qty_special_book',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Specialty Windows (Book) — qty' },
  { sheet: 'Commission', cell: 'A27', fieldKey: 'qty_special_book2',  sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Specialty Windows 2 (Book) — qty' },
  // Patio Doors section
  { sheet: 'Commission', cell: 'A30', fieldKey: 'qty_vsp_6ft',        sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'VSP Vinyl Rolling Door 6\' — qty' },
  { sheet: 'Commission', cell: 'A31', fieldKey: 'qty_vsp_8ft',        sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'VSP Vinyl Rolling Door 8\' — qty' },
  { sheet: 'Commission', cell: 'A32', fieldKey: 'qty_vsp_10ft',       sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'VSP Vinyl Rolling Door 10\' — qty' },
  { sheet: 'Commission', cell: 'A33', fieldKey: 'qty_french_door',    sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'French Door — qty' },
  { sheet: 'Commission', cell: 'A34', fieldKey: 'qty_screen_patio',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Screens - Patio Door — qty' },
  { sheet: 'Commission', cell: 'A35', fieldKey: 'qty_grids_patio',    sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Grids - Patio Door — qty' },
  { sheet: 'Commission', cell: 'A36', fieldKey: 'qty_mini_blinds',    sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Integrated Mini Blinds — qty' },
  { sheet: 'Commission', cell: 'A37', fieldKey: 'qty_patio_trim',     sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Vinyl Patio Door Trim — qty' },
  // Other Products section
  { sheet: 'Commission', cell: 'A39', fieldKey: 'qty_impact_windows', sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Impact Windows Job Amt $ — qty' },
  { sheet: 'Commission', cell: 'A40', fieldKey: 'qty_vinyl_siding',   sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Vinyl Siding Job Amt — qty' },
  { sheet: 'Commission', cell: 'A41', fieldKey: 'qty_shutters',       sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Decorative Shutters Per Pair — qty' },
  { sheet: 'Commission', cell: 'A42', fieldKey: 'qty_entry_door',     sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Wincore Entry Door — qty' },
  { sheet: 'Commission', cell: 'A43', fieldKey: 'qty_5200_slider',    sourceTable: 'products', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: '5200 Series Sliding Patio Door — qty' },
];

// ── OPTION QUANTITY CELLS (Col L = Quantity, feeds formulas in Col V) ──
export const OPTION_QUANTITY_CELLS: CellMapping[] = [
  { sheet: 'Commission', cell: 'L11', fieldKey: 'opt_full_screen',        sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Full Screen — qty' },
  { sheet: 'Commission', cell: 'L12', fieldKey: 'opt_beige_clay',         sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Beige / Clay — qty' },
  { sheet: 'Commission', cell: 'L13', fieldKey: 'opt_woodgrain',          sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Wood Grain Inside — qty' },
  { sheet: 'Commission', cell: 'L14', fieldKey: 'opt_solarzone',          sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'SolarZone LE/LEE — qty' },
  { sheet: 'Commission', cell: 'L15', fieldKey: 'opt_tempered_sqft',      sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Tempered Glass Sq Ft — qty' },
  { sheet: 'Commission', cell: 'L16', fieldKey: 'opt_obscure',            sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Obscure Glass — qty' },
  { sheet: 'Commission', cell: 'L17', fieldKey: 'opt_oriel',              sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Oriel Style — qty' },
  { sheet: 'Commission', cell: 'L18', fieldKey: 'opt_colonial_grids',     sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Colonial / Contoured Grids — qty' },
  { sheet: 'Commission', cell: 'L19', fieldKey: 'opt_ext_color',          sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Exterior Color — qty' },
  { sheet: 'Commission', cell: 'L22', fieldKey: 'opt_vpp',                sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Value Plus Pack VPP — qty' },
  { sheet: 'Commission', cell: 'L23', fieldKey: 'opt_esp',                sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Energy Star Pack ESP — qty' },
  { sheet: 'Commission', cell: 'L24', fieldKey: 'opt_tg2_esp',            sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'TG2 Energy Star ESP — qty' },
  { sheet: 'Commission', cell: 'L26', fieldKey: 'opt_remove_storm',       sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Remove Storm Window — qty' },
  { sheet: 'Commission', cell: 'L27', fieldKey: 'opt_window_removal',     sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Window/Patio Door Removal — qty' },
  { sheet: 'Commission', cell: 'L28', fieldKey: 'opt_remove_steel',       sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Remove Steel Window — qty' },
  { sheet: 'Commission', cell: 'L29', fieldKey: 'opt_remove_alum_stucco', sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Remove Aluminum In Stucco — qty' },
  { sheet: 'Commission', cell: 'L30', fieldKey: 'opt_mullion',            sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Install Mullion for multi-unit — qty' },
  { sheet: 'Commission', cell: 'L33', fieldKey: 'opt_nail_fin',           sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Install Nail Fin — qty' },
  { sheet: 'Commission', cell: 'L34', fieldKey: 'opt_jchannel',           sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'J-Channel — qty' },
  { sheet: 'Commission', cell: 'L35', fieldKey: 'opt_sill_repair',        sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Repair Sill Per Foot — qty' },
  { sheet: 'Commission', cell: 'L36', fieldKey: 'opt_2nd_story',          sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: '2nd Story Charge — qty' },
  { sheet: 'Commission', cell: 'L37', fieldKey: 'opt_bay_finish',         sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Bay Window Finish & Trim — qty' },
  { sheet: 'Commission', cell: 'L38', fieldKey: 'opt_header_flash',       sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Header Flashing — qty' },
  { sheet: 'Commission', cell: 'L39', fieldKey: 'opt_jchannel2',          sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'J-Channel (2nd entry) — qty' },
  { sheet: 'Commission', cell: 'L43', fieldKey: 'opt_admin_fee',          sourceTable: 'options', sourceField: 'qty', required: false, formulaPreserved: false, writeBehavior: 'input', notes: 'Administrative Fee — qty' },
];

// ── FORMULA CELLS (Never overwrite these — they calculate from input cells) ──
export const FORMULA_CELLS: string[] = [
  // Product commission calculations (Col I)
  'I14', 'I16', 'I17', 'I18', 'I19', 'I20', 'I21', 'I22', 'I23', 'I25', 'I27',
  'I30', 'I31', 'I32', 'I33', 'I34', 'I35', 'I36', 'I37',
  'I39', 'I40', 'I41', 'I42', 'I43',
  // Option commission calculations (Col V)
  'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19',
  'V20', 'V21', 'V23', 'V24', 'V26', 'V28', 'V29', 'V30', 'V31', 'V32', 'V33',
  'V35', 'V36', 'V37', 'V39', 'V40', 'V41', 'V42',
  // Totals
  'T45', 'U45', 'V45', // Total Commissions = SUM(I13:I43)+SUM(V11:V43)
  'T46', // AVG Commission Per Window
  // Auto-fill cells
  'C25', 'D25', 'C27', 'D27', // Special Shape auto-labels
  // VPP/ESP conditional calcs
  'AA18', 'AA19', 'AA26', 'AA27', 'AB18', 'AB19', 'AB26', 'AB27', 'AD26', 'AD27',
];

// ── COMMENTS CELL ──
export const COMMENTS_CELL: CellMapping = {
  sheet: 'Commission', cell: 'M47', fieldKey: 'comments', sourceTable: 'commission_records',
  sourceField: 'comments', required: false, formulaPreserved: false, writeBehavior: 'input',
  notes: 'Comments area (merged L47:V50)',
};

// All input cell addresses (union of all mapping arrays)
export function getAllInputCells(): string[] {
  return [
    ...CUSTOMER_INFO_CELLS.map(c => c.cell),
    ...PRODUCT_QUANTITY_CELLS.map(c => c.cell),
    ...OPTION_QUANTITY_CELLS.map(c => c.cell),
    COMMENTS_CELL.cell,
  ];
}

// All mappings flat
export function getAllMappings(): CellMapping[] {
  return [
    ...CUSTOMER_INFO_CELLS,
    ...PRODUCT_QUANTITY_CELLS,
    ...OPTION_QUANTITY_CELLS,
    COMMENTS_CELL,
  ];
}
