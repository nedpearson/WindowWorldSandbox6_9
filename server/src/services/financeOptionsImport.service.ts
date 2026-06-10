/**
 * financeOptionsImport.service.ts
 * Reads Finance Options.xlsx and imports plans into the FinanceOption catalog.
 *
 * Sheet: "Price Aid" (27 rows × 10 cols)
 * All formulas reference E4 (project total). We extract:
 *   - formulaType from the formula pattern (E4/N → zero_interest, E4*factor → factor)
 *   - factor value from the raw Excel formula
 *   - term, APR, plan code, min amount from the row label text
 */

import ExcelJS from 'exceljs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Global disclosure text from row 25 ────────────────────────
const GLOBAL_DISCLOSURE =
  'Create a finance account at WWW.WINWORLDINFO.COM. Click on finance tab for secure application. ' +
  'Estimated payment option. Subject to credit approval and lender terms.';

// ── Allowed import paths (security allowlist) ─────────────────
const ALLOWED_IMPORT_PATHS: string[] = [
  'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\Finance Options.xlsx',
  '/tmp/finance-options-import.xlsx',
  '/app/uploads/finance-options.xlsx',
];

import path from 'path';

export function isAllowedFinancePath(filePath: string): boolean {
  const normalized = path.resolve(filePath);
  return ALLOWED_IMPORT_PATHS.some(p => path.resolve(p) === normalized);
}

// ── Finance option row definition ─────────────────────────────

interface ParsedFinanceRow {
  planKey: string;
  planCode: string | null;
  lenderName: string | null;
  name: string;
  displayName: string;
  formulaType: 'zero_interest' | 'factor' | 'amortized' | 'half_down' | 'custom';
  formulaJson: object;
  termMonths: number;
  apr: number;
  promoType: string;
  deferredInterestMonths: number | null;
  sameAsCashMonths: number | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  downPaymentPercent: number | null;
  monthlyPaymentFactor: number | null;
  disclosureText: string;
  sortOrder: number;
  sourceSheet: string;
  sourceRowNumber: number;
  sourceHash: string;
}

// ── Label parsing helpers ─────────────────────────────────────

/** Extract term in months from label text, e.g. "36 months @ 6.99%" → 36 */
function extractTerm(label: string): number {
  const m = label.match(/(\d+)\s*months?/i);
  return m ? parseInt(m[1], 10) : 0;
}

/** Extract APR from label, e.g. "36 months @ 6.99% interest" → 6.99 */
function extractApr(label: string): number {
  const m = label.match(/(@|at)\s*([\d.]+)\s*%/i);
  if (!m) return 0;
  return parseFloat(m[2]);
}

/** Extract minimum amount from label, e.g. "(Min $2000)" → 2000 */
function extractMin(label: string): number | null {
  const m = label.match(/Min\s*\$?([\d,]+)/i);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

/** Extract plan code from label, e.g. "Plan Code 2317" → "2317" */
function extractPlanCode(label: string): string | null {
  const m = label.match(/Plan\s+Code\s+(\d+)/i);
  return m ? m[1] : null;
}

/** Determine if this is a promotional/same-as-cash plan */
function isPromoPlan(label: string): boolean {
  return /promotional|promo|same.as.cash/i.test(label);
}

// ── SHA-256 source hash ───────────────────────────────────────

function makeSourceHash(fields: object): string {
  const str = JSON.stringify(fields, Object.keys(fields).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ── Parse formula string ──────────────────────────────────────

type ParsedFormula = {
  formulaType: 'zero_interest' | 'factor' | 'half_down' | 'amortized';
  factor: number | null;
  divisor: number | null;
};

function parseFormula(formulaStr: string): ParsedFormula {
  if (!formulaStr) return { formulaType: 'amortized', factor: null, divisor: null };

  const normF = formulaStr.trim().toUpperCase();

  // E4/N → zero_interest
  const divMatch = normF.match(/^E4\s*\/\s*([\d.]+)$/);
  if (divMatch) {
    const divisor = parseFloat(divMatch[1]);
    if (divisor === 2) {
      return { formulaType: 'half_down', factor: null, divisor: 2 };
    }
    return { formulaType: 'zero_interest', factor: null, divisor };
  }

  // E4*factor → factor-based
  const mulMatch = normF.match(/^E4\s*\*\s*([\d.]+)$/);
  if (mulMatch) {
    const factor = parseFloat(mulMatch[1]);
    return { formulaType: 'factor', factor, divisor: null };
  }

  return { formulaType: 'amortized', factor: null, divisor: null };
}

// ── Main parse function: "Price Aid" sheet ────────────────────

function parsePriceAidSheet(ws: ExcelJS.Worksheet, sheetName: string): ParsedFinanceRow[] {
  const results: ParsedFinanceRow[] = [];
  let sortOrder = 0;

  // Rows of interest (1-indexed):
  // Row 4: project total input (E4 = $10,000 sample)
  // Row 5/6: 50% down plan
  // Row 9: 6 months @ 0%
  // Row 11: 15 months @ 0%
  // Row 13: 18 months @ 0% Promo
  // Row 15: 24 months @ 0% Promo
  // Row 17: 36 months @ 6.99% (Plan 2317)
  // Row 19: 60 months @ 7.99% (Plan 4357)
  // Row 21: 96 months @ 9.99%
  // Row 23: 120 months @ 9.99%

  const FINANCE_ROWS = [5, 9, 11, 13, 15, 17, 19, 21, 23];

  for (const rowNum of FINANCE_ROWS) {
    const row = ws.getRow(rowNum);

    // Get label from column A (merged cell — read raw value)
    const labelCell = row.getCell(1);
    let rawLabel = '';
    const lv = labelCell.value;
    if (typeof lv === 'string') {
      rawLabel = lv;
    } else if (lv && typeof lv === 'object') {
      // CellRichTextValue has richText array
      const richObj = lv as unknown as { richText?: Array<{ text: string }> };
      if (richObj.richText) {
        rawLabel = richObj.richText.map((t) => t.text).join('');
      }
    }
    rawLabel = rawLabel.trim();


    if (!rawLabel) continue;

    // Get formula from column E
    const formulaCell = row.getCell(5);
    const fv = formulaCell.value;
    const formulaObj = fv && typeof fv === 'object' ? fv as unknown as { formula?: string; result?: number } : null;
    const rawFormula: string = formulaObj?.formula ?? '';
    const formulaResult: number = formulaObj?.result != null ? Number(formulaObj.result) : 0;

    // Parse formula
    const parsed = parseFormula(rawFormula);

    // Extract metadata from label
    const term = extractTerm(rawLabel);
    const apr = extractApr(rawLabel);
    const minAmount = extractMin(rawLabel);
    const planCode = extractPlanCode(rawLabel);
    const isPromo = isPromoPlan(rawLabel);

    // Build planKey (stable identifier)
    let planKey: string;
    let displayName: string;
    let promoType: string;

    if (parsed.formulaType === 'half_down') {
      planKey = 'half-down-cash';
      displayName = '50% Down — Balance at Completion';
      promoType = 'cash_down';
    } else if (apr === 0) {
      planKey = `zero-${term}mo`;
      displayName = `${term}-Month Interest-Free${isPromo ? ' (Promo)' : ''}`;
      promoType = isPromo ? 'same_as_cash' : 'interest_free';
    } else {
      planKey = `factor-${term}mo`;
      displayName = `${term}-Month Fixed ${apr}% APR`;
      promoType = 'fixed_rate';
    }

    // Build name from label
    const name = rawLabel.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();

    // Build formulaJson
    const formulaJson = {
      rawFormula,
      formulaResult,
      divisor: parsed.divisor,
      factor: parsed.factor,
      term,
      apr,
    };

    // Build source hash for dedup
    const sourceHash = makeSourceHash({ planKey, sheetName, rowNum, rawFormula, term, apr });

    // Build deferredInterest / sameAsCash
    const deferredInterestMonths = (isPromo && apr === 0) ? term : null;
    const sameAsCashMonths = (isPromo && apr === 0) ? term : null;

    results.push({
      planKey,
      planCode,
      lenderName: 'Window World Finance',
      name,
      displayName,
      formulaType: parsed.formulaType,
      formulaJson,
      termMonths: term,
      apr,
      promoType,
      deferredInterestMonths,
      sameAsCashMonths,
      minimumAmount: minAmount,
      maximumAmount: null,
      downPaymentPercent: parsed.formulaType === 'half_down' ? 0.5 : null,
      monthlyPaymentFactor: parsed.factor,
      disclosureText: GLOBAL_DISCLOSURE,
      sortOrder: ++sortOrder,
      sourceSheet: sheetName,
      sourceRowNumber: rowNum,
      sourceHash,
    });
  }

  return results;
}

// ── Import summary ────────────────────────────────────────────

export interface FinanceImportSummary {
  batchId: string;
  fileName: string;
  sheetNames: string[];
  rowsFound: number;
  rowsImported: number;
  rowsDuplicate: number;
  rowsSkipped: number;
  rowsErrored: number;
  errors: { row: number; message: string }[];
  options: { planKey: string; displayName: string; termMonths: number; apr: number }[];
}

// ── Main import function ──────────────────────────────────────

export async function importFinanceOptions(
  filePath: string,
  userId: string,
  companyId: string | null,
): Promise<FinanceImportSummary> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const sheetNames = wb.worksheets.map(ws => ws.name);
  const fileName = path.basename(filePath);

  // Create import batch
  const batch = await prisma.financeOptionImportBatch.create({
    data: {
      companyId,
      uploadedById: userId,
      fileName,
      originalPath: filePath,
      sheetNames,
      status: 'pending',
    },
  });

  const errors: { row: number; message: string }[] = [];
  let rowsFound = 0;
  let rowsImported = 0;
  let rowsDuplicate = 0;
  let rowsSkipped = 0;
  const importedOptions: { planKey: string; displayName: string; termMonths: number; apr: number }[] = [];

  for (const ws of wb.worksheets) {
    const rows = parsePriceAidSheet(ws, ws.name);
    rowsFound += rows.length;

    for (const row of rows) {
      try {
        // Dedup check by sourceHash
        const existing = await prisma.financeOption.findUnique({
          where: { sourceHash: row.sourceHash },
        });

        if (existing) {
          rowsDuplicate++;
          continue;
        }

        // Also check planKey uniqueness (may exist from previous hardcoded seeding)
        const existingByKey = await prisma.financeOption.findUnique({
          where: { planKey: row.planKey },
        });

        if (existingByKey) {
          // Update existing record with new data instead of inserting duplicate
          await prisma.financeOption.update({
            where: { planKey: row.planKey },
            data: {
              companyId: companyId ?? existingByKey.companyId,
              importBatchId: batch.id,
              planCode: row.planCode,
              lenderName: row.lenderName,
              name: row.name,
              displayName: row.displayName,
              formulaType: row.formulaType,
              formulaJson: row.formulaJson,
              termMonths: row.termMonths,
              apr: row.apr,
              promoType: row.promoType,
              deferredInterestMonths: row.deferredInterestMonths,
              sameAsCashMonths: row.sameAsCashMonths,
              minimumAmount: row.minimumAmount,
              downPaymentPercent: row.downPaymentPercent,
              monthlyPaymentFactor: row.monthlyPaymentFactor,
              disclosureText: row.disclosureText,
              sortOrder: row.sortOrder,
              sourceSheet: row.sourceSheet,
              sourceRowNumber: row.sourceRowNumber,
              sourceHash: row.sourceHash,
              isActive: true,
            },
          });
          rowsImported++;
        } else {
          await prisma.financeOption.create({
            data: {
              companyId,
              importBatchId: batch.id,
              planKey: row.planKey,
              planCode: row.planCode,
              lenderName: row.lenderName,
              name: row.name,
              displayName: row.displayName,
              formulaType: row.formulaType,
              formulaJson: row.formulaJson,
              termMonths: row.termMonths,
              apr: row.apr,
              promoType: row.promoType,
              deferredInterestMonths: row.deferredInterestMonths,
              sameAsCashMonths: row.sameAsCashMonths,
              minimumAmount: row.minimumAmount,
              downPaymentPercent: row.downPaymentPercent,
              monthlyPaymentFactor: row.monthlyPaymentFactor,
              disclosureText: row.disclosureText,
              sortOrder: row.sortOrder,
              sourceSheet: row.sourceSheet,
              sourceRowNumber: row.sourceRowNumber,
              sourceHash: row.sourceHash,
              isActive: true,
              paymentFormula: row.formulaJson ? JSON.stringify(row.formulaJson) : null,
            },
          });
          rowsImported++;
        }

        importedOptions.push({
          planKey: row.planKey,
          displayName: row.displayName,
          termMonths: row.termMonths,
          apr: row.apr,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: row.sourceRowNumber, message: msg });
        rowsSkipped++;
        console.error(`Finance import row ${row.sourceRowNumber} error:`, msg);
      }
    }
  }

  const rowsErrored = errors.length;

  // Update batch status
  await prisma.financeOptionImportBatch.update({
    where: { id: batch.id },
    data: {
      rowCount: rowsFound,
      importedCount: rowsImported,
      skippedCount: rowsDuplicate,
      errorCount: rowsErrored,
      status: rowsErrored > 0 && rowsImported === 0 ? 'failed' : 'completed',
      errorLog: errors.length > 0 ? errors : undefined,
    },
  });

  return {
    batchId: batch.id,
    fileName,
    sheetNames,
    rowsFound,
    rowsImported,
    rowsDuplicate,
    rowsSkipped,
    rowsErrored,
    errors,
    options: importedOptions,
  };
}
