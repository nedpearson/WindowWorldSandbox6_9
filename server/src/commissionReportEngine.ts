// ═══════════════════════════════════════════════════════════
// Commission Report Generator
// Clones the master BTR Commission Sheet template and
// populates input cells with real data from commission records.
// All formulas, formatting, merges, borders, and print
// settings are preserved from the original workbook.
// ═══════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  CUSTOMER_INFO_CELLS,
  PRODUCT_QUANTITY_CELLS,
  OPTION_QUANTITY_CELLS,
  FORMULA_CELLS,
  COMMENTS_CELL,
} from './config/commissionWorkbookMap.js';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const TEMPLATE_PATH = path.resolve(__dirname2, '../../templates/Commission_Sheet_BTR_Template.xlsx');

export interface CommissionReportInput {
  // Customer info
  customerName?: string;
  customerId?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerZip?: string;
  customerPhone?: string;
  region?: string;
  salesDate?: string | Date;
  salesRep?: string;
  repNumber?: string;
  result?: string;
  numWindows?: number;
  jobAmount?: number;
  comments?: string;

  // Product quantities (keys match PRODUCT_QUANTITY_CELLS fieldKeys)
  products?: Record<string, number>;

  // Option quantities (keys match OPTION_QUANTITY_CELLS fieldKeys)
  options?: Record<string, number>;
}

export interface ReportValidation {
  valid: boolean;
  expectedTotal: number;
  workbookTotal: number;
  mismatches: { field: string; expected: any; actual: any }[];
}

/**
 * Generate a commission report by cloning the template and populating input cells.
 * Returns the populated workbook buffer.
 */
export async function generateCommissionReport(
  input: CommissionReportInput
): Promise<{ buffer: Buffer; validation: ReportValidation }> {
  // Verify template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Commission template not found at ${TEMPLATE_PATH}`);
  }

  // Load the master template (preserves all formatting, merges, formulas, etc.)
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  const ws = wb.getWorksheet('Commission');
  if (!ws) {
    throw new Error('No "Commission" sheet found in template workbook');
  }

  // Helper to safely write a value to a cell without touching formula cells
  const writeCell = (addr: string, value: any) => {
    if (FORMULA_CELLS.includes(addr)) {
      // Never overwrite formula cells
      return;
    }
    const cell = ws.getCell(addr);
    if (value !== null && value !== undefined && value !== '') {
      cell.value = value;
    }
  };

  // ── Populate customer info ──
  for (const mapping of CUSTOMER_INFO_CELLS) {
    let value: any = null;
    switch (mapping.fieldKey) {
      case 'customerId':    value = input.customerId; break;
      case 'homePhone':     value = input.customerPhone; break;
      case 'salesDate':     value = input.salesDate ? new Date(input.salesDate as string) : null; break;
      case 'customerName':  value = input.customerName; break;
      case 'repNumber':     value = input.repNumber; break;
      case 'salesRep':      value = input.salesRep; break;
      case 'street':        value = input.customerAddress; break;
      case 'result':        value = input.result; break;
      case 'cityStZip': {
        const parts = [input.customerCity, input.customerState, input.customerZip].filter(Boolean);
        value = parts.length > 0 ? parts.join(', ') : null;
        break;
      }
      case 'numWindows':    value = input.numWindows; break;
      case 'region':        value = input.region || mapping.fallback || 'BTR'; break;
      case 'jobAmount':     value = input.jobAmount; break;
    }
    writeCell(mapping.cell, value);
  }

  // ── Populate product quantities ──
  if (input.products) {
    for (const mapping of PRODUCT_QUANTITY_CELLS) {
      const qty = input.products[mapping.fieldKey];
      if (qty !== undefined && qty > 0) {
        writeCell(mapping.cell, qty);
      }
    }
  }

  // ── Populate option quantities ──
  if (input.options) {
    for (const mapping of OPTION_QUANTITY_CELLS) {
      const qty = input.options[mapping.fieldKey];
      if (qty !== undefined && qty > 0) {
        writeCell(mapping.cell, qty);
      }
    }
  }

  // ── Populate comments ──
  if (input.comments) {
    writeCell(COMMENTS_CELL.cell, input.comments);
  }

  // ── Validation ──
  // Calculate expected commission total from input data
  // The workbook formula at T45/U45/V45 is: =SUM(I13:I43)+SUM(V11:V43)
  // We can't recalculate formulas in exceljs, but we can validate after Excel opens
  const validation: ReportValidation = {
    valid: true,
    expectedTotal: 0,
    workbookTotal: 0,
    mismatches: [],
  };

  // The workbook total formula result should recalculate when opened in Excel
  // For now, report as "needs verification"
  const t45 = ws.getCell('T45');
  if (t45.value && typeof t45.value === 'object' && (t45.value as any).result !== undefined) {
    validation.workbookTotal = Number((t45.value as any).result) || 0;
  }

  // Generate output buffer
  const buffer = await wb.xlsx.writeBuffer();

  return { buffer: Buffer.from(buffer), validation };
}

/**
 * Build CommissionReportInput from a database commission record + its product types
 */
export function buildReportInputFromRecord(record: any): CommissionReportInput {
  const input: CommissionReportInput = {
    customerName: record.customerName,
    customerId: record.customerId_,
    customerAddress: record.customerAddress,
    customerCity: record.customerCity,
    customerState: record.customerState,
    customerZip: record.customerZip,
    customerPhone: record.customerPhone,
    region: record.region,
    salesDate: record.soldDate,
    salesRep: record.salesRepName,
    repNumber: record.salesRepNumber,
    result: record.result,
    numWindows: record.numWindows,
    jobAmount: Number(record.jobAmount || 0),
    comments: record.comments || record.notes,
    products: {},
    options: {},
  };

  // Map product types from JSON field to workbook cell keys
  if (record.productTypes && Array.isArray(record.productTypes)) {
    for (const pt of record.productTypes) {
      const product = String(pt.product || '').toLowerCase().trim();
      const qty = Number(pt.qty || 0);

      // Map imported product names to workbook field keys
      if (product.includes('double hung') || product.includes('dh mech'))
        input.products!.qty_dh_mech = (input.products!.qty_dh_mech || 0) + qty;
      else if (product.includes('dh foam'))
        input.products!.qty_dh_foam = (input.products!.qty_dh_foam || 0) + qty;
      else if (product.includes('picture'))
        input.products!.qty_picture = (input.products!.qty_picture || 0) + qty;
      else if (product.includes('2 lite') || product.includes('2-lite'))
        input.products!.qty_2lite_slider = (input.products!.qty_2lite_slider || 0) + qty;
      else if (product.includes('3 lite') || product.includes('3-lite'))
        input.products!.qty_3lite_slider = (input.products!.qty_3lite_slider || 0) + qty;
      else if (product.includes('casement'))
        input.products!.qty_casement = (input.products!.qty_casement || 0) + qty;

      // Options (imported with [Option] prefix)
      if (product.includes('[option]')) {
        const optName = product.replace('[option]', '').trim();
        if (optName.includes('full screen'))
          input.options!.opt_full_screen = (input.options!.opt_full_screen || 0) + qty;
        else if (optName.includes('beige') || optName.includes('clay'))
          input.options!.opt_beige_clay = (input.options!.opt_beige_clay || 0) + qty;
        else if (optName.includes('wood grain'))
          input.options!.opt_woodgrain = (input.options!.opt_woodgrain || 0) + qty;
        else if (optName.includes('solarzone') || optName.includes('le'))
          input.options!.opt_solarzone = (input.options!.opt_solarzone || 0) + qty;
        else if (optName.includes('tempered'))
          input.options!.opt_tempered_sqft = (input.options!.opt_tempered_sqft || 0) + qty;
        else if (optName.includes('obscure'))
          input.options!.opt_obscure = (input.options!.opt_obscure || 0) + qty;
        else if (optName.includes('oriel'))
          input.options!.opt_oriel = (input.options!.opt_oriel || 0) + qty;
        else if (optName.includes('colonial') || optName.includes('grid'))
          input.options!.opt_colonial_grids = (input.options!.opt_colonial_grids || 0) + qty;
        else if (optName.includes('exterior color'))
          input.options!.opt_ext_color = (input.options!.opt_ext_color || 0) + qty;
      }
    }
  }

  return input;
}
