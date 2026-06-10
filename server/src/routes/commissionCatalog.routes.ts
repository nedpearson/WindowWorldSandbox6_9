/**
 * commissionCatalog.routes.ts
 * Commission Catalog — reusable price/commission rate matrix
 * Imported from the BTR Commission Sheet (CS-2400, Form #CS-2400).
 *
 * SECURITY:
 *  - All routes require JWT auth via requireAuth middleware
 *  - companyId is always fetched from the DB (never trusted from client body)
 *  - Import route restricts file path to an allowlist — no arbitrary FS reads
 *  - Sales reps see only their own earned commissions (/my, /summary)
 *  - Managers/admins see all company commissions (/summary with role check)
 *
 * PARSING RULES (per spec):
 *  1. First value = priceAmount (larger dollar amount)
 *  2. Smaller adjacent value = commissionAmount ($) or commissionPercent (%)
 *  3. BOOK → priceType = book
 *  4. "20% Off" → priceType = percent_off, pricePercent = -0.20
 *  5. "Job Amt $" → priceType = job_amount
 *  6. "$25/Ft" → unit = foot, priceAmount = 25
 *  7. "$7/Sq.ft" → unit = square_foot, priceAmount = 7
 *  8. "$60/pr" or "$60/pn" → unit = pair, priceAmount = 60
 *  9. "10%" commission → commissionType = percent, commissionPercent = 0.10
 * 10. "$25" commission → commissionType = fixed, commissionAmount = 25
 * 11. Skip blank/divider/formatting rows
 * 12. Preserve category/subcategory from merged section headers
 * 13. sourceHash → SHA-256 dedup — idempotent re-import
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();
export const commissionCatalogRoutes = Router();
commissionCatalogRoutes.use(requireAuth);

// ── Allowed import file paths (prevent arbitrary FS read) ───────────────────
const ALLOWED_IMPORT_PATHS = [
  'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\Commission Sheet BTR.xlsx',
  '/tmp/commission-import.xlsx',      // production upload landing zone
  '/app/uploads/commission.xlsx',      // Railway production path
];
const DEFAULT_BTR_PATH = ALLOWED_IMPORT_PATHS[0];

function isAllowedImportPath(filePath: string): boolean {
  // Normalize both paths for comparison
  const normalized = path.resolve(filePath);
  return ALLOWED_IMPORT_PATHS.some(p => path.resolve(p) === normalized);
}

// ── Helper: fetch companyId from DB for a userId ────────────────────────────
// JWT only contains { userId, role } — companyId must always come from the DB.
async function getCompanyId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  return user?.companyId ?? null;
}

// ── Parsing helpers ─────────────────────────────────────────────────────────

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/** Trim whitespace, collapse internal spaces; remove leading/trailing underscores */
function cleanCell(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/^_+|_+$/g, '') // strip leading/trailing underscores (divider rows)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse the first dollar amount from a raw cell string. Returns null if none found. */
function parseDollar(raw: string): number | null {
  if (!raw) return null;
  // Handle "30" as a plain number at end of row (Admin Fee edge case)
  const plainNum = raw.match(/^(\d+(?:\.\d+)?)$/);
  if (plainNum) {
    const v = parseFloat(plainNum[1]);
    return isNaN(v) ? null : v;
  }
  // "$115/$135" → first value = 115
  const slashMatch = raw.match(/\$?([\d,]+(?:\.\d+)?)\s*\/\s*\$?([\d,]+(?:\.\d+)?)/);
  if (slashMatch) return parseFloat(slashMatch[1].replace(/,/g, ''));
  // Standard "$365" or "365"
  const m = raw.match(/\$?([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ''));
  return isNaN(v) ? null : v;
}

/** Parse the second dollar amount from a range like "$115/$135" → 135 */
function parseDollar2(raw: string): number | null {
  if (!raw) return null;
  const m = raw.match(/\$?([\d,]+(?:\.\d+)?)\s*\/\s*\$?([\d,]+(?:\.\d+)?)/);
  if (m) return parseFloat(m[2].replace(/,/g, ''));
  return null;
}

/** Parse "10%" → 0.10. Returns null if not a pure percent string. */
function parsePercent(raw: string): number | null {
  const m = String(raw ?? '').trim().match(/^([\d.]+)%\s*$/);
  if (!m) return null;
  const v = parseFloat(m[1]) / 100;
  return isNaN(v) ? null : v;
}

interface ParsedPriceResult {
  priceType: string;
  priceAmount: number | null;
  priceAmount2: number | null;
  pricePercent: number | null;
  unit: string | null;
  notes: string | null;
}

/** Parse a raw price cell per rules 3–8 */
function parsePrice(raw: string): ParsedPriceResult {
  const s = cleanCell(raw);
  const empty: ParsedPriceResult = { priceType: 'fixed', priceAmount: null, priceAmount2: null, pricePercent: null, unit: null, notes: null };
  if (!s) return empty;

  // Rule 3: BOOK
  if (/^BOOK$/i.test(s)) {
    return { ...empty, priceType: 'book', notes: 'BOOK pricing' };
  }

  // Rule 4: "20% Off"
  const pctOffMatch = s.match(/^([\d.]+)%\s*Off$/i);
  if (pctOffMatch) {
    return { ...empty, priceType: 'percent_off', pricePercent: -(parseFloat(pctOffMatch[1]) / 100), notes: s };
  }

  // Rule 5: "Job Amt $"
  if (/Job\s*Amt\s*\$/i.test(s)) {
    return { ...empty, priceType: 'job_amount', unit: 'job', notes: 'Percent of job amount' };
  }

  // Rule 7: "$7/Sq.ft" — must come before /Ft to avoid false match
  const perSqFtMatch = s.match(/\$([\d,]+(?:\.\d+)?)\s*\/\s*Sq\.?ft/i);
  if (perSqFtMatch) {
    return { ...empty, priceType: 'per_unit', priceAmount: parseFloat(perSqFtMatch[1].replace(/,/g, '')), unit: 'square_foot', notes: 'Per square foot' };
  }

  // Rule 6: "$25/Ft"
  const perFtMatch = s.match(/\$([\d,]+(?:\.\d+)?)\s*\/\s*Ft/i);
  if (perFtMatch) {
    return { ...empty, priceType: 'per_unit', priceAmount: parseFloat(perFtMatch[1].replace(/,/g, '')), unit: 'foot', notes: 'Per linear foot' };
  }

  // Rule 8: "$60/pn" or "$60/pr" (pane/pair)
  const perPairMatch = s.match(/\$([\d,]+(?:\.\d+)?)\s*\/\s*(pn|pr|pair|pane)/i);
  if (perPairMatch) {
    return { ...empty, priceType: 'per_unit', priceAmount: parseFloat(perPairMatch[1].replace(/,/g, '')), unit: 'pair', notes: 'Per pair/pane' };
  }

  // Range: "$115/$135"
  const d2 = parseDollar2(s);
  if (d2 !== null) {
    return { ...empty, priceType: 'fixed', priceAmount: parseDollar(s), priceAmount2: d2, notes: s };
  }

  // Standard dollar amount
  const dollar = parseDollar(s);
  if (dollar !== null) {
    return { ...empty, priceType: 'fixed', priceAmount: dollar };
  }

  // Unrecognized (e.g. "BOOK" variant, text-only)
  return { ...empty, notes: s };
}

interface ParsedCommResult {
  commissionType: string;
  commissionAmount: number | null;
  commissionPercent: number | null;
}

/** Parse a raw commission cell per rules 9–10 */
function parseCommission(raw: string): ParsedCommResult {
  const s = cleanCell(raw);
  if (!s) return { commissionType: 'none', commissionAmount: null, commissionPercent: null };

  // Rule 9: percent — must check before dollar (so "10%" is not read as $10)
  const pct = parsePercent(s);
  if (pct !== null) {
    return { commissionType: 'percent', commissionAmount: null, commissionPercent: pct };
  }

  // Rule 10: dollar amount
  const dollar = parseDollar(s);
  if (dollar !== null) {
    if (dollar === 0) return { commissionType: 'none', commissionAmount: null, commissionPercent: null };
    return { commissionType: 'fixed', commissionAmount: dollar, commissionPercent: null };
  }

  return { commissionType: 'none', commissionAmount: null, commissionPercent: null };
}

/** True if this row should be skipped (blank, divider, subtotal, title, formatting-only) */
function isSkipRow(rawName: string, rawPrice: string, rawComm: string): boolean {
  const n = cleanCell(rawName);
  const p = cleanCell(rawPrice);
  const c = cleanCell(rawComm);

  if (!n && !p && !c) return true;                                // all blank
  if (!n) return true;                                            // no item name
  if (/^_+$/.test(rawName.trim())) return true;                  // underscores only
  if (/^_{4,}/.test(n)) return true;                             // long divider
  if (/^Total\s+Comm/i.test(n)) return true;                    // subtotal row
  if (/^AVG\s+Comm/i.test(n)) return true;                      // average row
  if (/^COMMENTS/i.test(n)) return true;                         // comments label
  if (n === 'Form # CS-2400') return true;                       // footer
  if (/^Revised\s+\d/.test(n)) return true;                     // revision date
  if (/^Window\s+World/i.test(n)) return true;                  // sheet title/header
  if (/^Commission\s+Sheet/i.test(n)) return true;              // sheet title
  if (/^CS-24/i.test(n)) return true;                           // form number
  if (/^Date:/i.test(n)) return true;                           // date header
  if (/^Rep\s+Name/i.test(n)) return true;                      // rep name header
  if (/^Salesperson/i.test(n)) return true;                     // salesperson header
  if (/^Customer\s+Name/i.test(n)) return true;                 // customer name header
  if (/^Product/i.test(n) && !p && !c) return true;             // product header (no data)
  if (/^Price/i.test(n) && /^Comm/i.test(p)) return true;       // column header row
  return false;
}

/** Extract SKU from an item name like "4000 DH Mech/Weld 3001" → sku="3001" */
function extractSku(itemName: string): { name: string; sku: string | null } {
  // Match trailing SKU code: 4-digit number optionally followed by -XX suffix
  const m = itemName.match(/\b(\d{4}(?:-[A-Z0-9]+)?)\b\s*$/);
  if (m) {
    const sku = m[1];
    const name = itemName.slice(0, m.index).replace(/\s+/g, ' ').trim();
    return { name: name || itemName.trim(), sku };
  }
  return { name: itemName.trim(), sku: null };
}

// ══════════════════════════════════════════════════════════════════════════
// BTR Sheet Layout — explicit column indices (0-based from raw string[][])
//
// The sheet has two side-by-side data blocks:
//
// LEFT block (Windows, Patio Doors, Other Products):
//   Col 2 (C) = item name (indented items start with a space in the raw cell)
//   Col 4 (E) = price
//   Col 6 (G) = commission
//
// RIGHT block (Options, Labor, VPP/ESP):
//   Col 12 (M) = item name
//   Col 17 (R) = price
//   Col 19 (T) = commission
//
// Section headers:
//   Col 0 (A) = major left section header (Windows, Patio Doors, Other Products)
//   Col 2 (C) = subcategory header (Double Hung, Other Styles, Specialty Windows)
//   Col 10 (K) = major right section header (Options, Additional Labor Charges)
//   Col 12 (M) = right items (bold headers like Value Plus Pack appear here too)
//
// Row map (1-indexed):
//   R9:  "Windows" (A) | "Options" (K)
//   R11: " Double Hung" (C subcategory) | " Full Screen" (M)
//   R12: " 4000 DH Mech/Weld 3001" | " Beige / Clay"
//   R13: " 4000 DH Foam Enh. 3001-FE" | " Wood Grain..."
//   R15: "Other Styles" (C subcategory header)
//   R23: "Specialty Windows" (C subcategory header)
//   R24: BOOK $25 row (specialty)
//   R25: 20% Off row (specialty)
//   R26: BOOK $15 row (specialty)
//   R28: "Patio Doors" (A) | "Additional Labor Charges" (K)
//   R35: "Integrated Mini Blinds" — no price, only commission
//   R37: "Other Products" (A)
//   R38: " Impact Windows Job Amt $" | ...
//   R21: "Value Plus Pack - VPP" (right M col, bold)
//   R22: "Energy Star Pack - ESP" (right M col, bold)
//   R23: "TG2 Energy Star - ESP" (right M col, bold)
//   R42: "Administrative Fee" (right M col)
// ══════════════════════════════════════════════════════════════════════════

interface CatalogRow {
  category: string;
  subcategory: string | null;
  itemName: string;
  priceRaw: string;
  commRaw: string;
  sourceRowNumber: number;
}

// Known top-level section headers (left and right)
const LEFT_SECTION_HEADERS = new Set(['Windows', 'Patio Doors', 'Other Products']);
const LEFT_SUBCATEGORY_HEADERS = new Set(['Double Hung', 'Other Styles', 'Specialty Windows']);
const RIGHT_SECTION_HEADERS = new Set(['Options', 'Additional Labor Charges']);
// VPP/ESP items in col M that need their own category
const VPP_ITEMS = new Set(['Value Plus Pack - VPP', 'Energy Star Pack - ESP', 'TG2 Energy Star - ESP']);
// Admin fee also lives in col M
const ADMIN_FEE = 'Administrative Fee';

// Row offset: the BTR sheet has several header rows before product data starts.
// We skip the first 8 rows to avoid title/header/meta rows.
const SKIP_BEFORE_ROW = 8;

function parseBTRSheet(rows: string[][]): CatalogRow[] {
  const results: CatalogRow[] = [];

  let leftCategory = 'Windows';
  let leftSubcategory: string | null = 'Double Hung';
  let rightCategory = 'Options';
  let rightSubcategory: string | null = null;

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rowNum = rIdx + 1;

    // Skip header/title rows at the top of the sheet
    if (rowNum <= SKIP_BEFORE_ROW) continue;

    // ── Safely get raw cell value ─────────────────────────────
    const raw = (i: number) => String(row[i] ?? '');
    const cell = (i: number) => cleanCell(raw(i));

    const colA = cell(0);   // left major header
    const colC = cell(2);   // left name / subcategory header
    const colE = cell(4);   // left price
    const colG = cell(6);   // left commission
    const colK = cell(10);  // right major header
    const colM = cell(12);  // right name / VPP headers
    const colR = cell(17);  // right price
    const colT = cell(19);  // right commission

    // ── Left section header detection ─────────────────────────
    if (LEFT_SECTION_HEADERS.has(colA)) {
      leftCategory = colA;
      leftSubcategory = null;
    } else if (LEFT_SUBCATEGORY_HEADERS.has(colC)) {
      leftSubcategory = colC;
    }

    // ── Right section header detection ─────────────────────────
    if (RIGHT_SECTION_HEADERS.has(colK)) {
      rightCategory = colK;
      rightSubcategory = null;
    }

    // ── LEFT column item capture ───────────────────────────────
    // An item row has the name in col C. Item names start with a space in the
    // raw sheet data. After trim it's just the product name.
    // We detect items vs section headers by checking: col C has data AND
    // is NOT a known section header AND has price or commission data.
    const rawColC = raw(2).trim();
    const hasLeftData = rawColC && !LEFT_SUBCATEGORY_HEADERS.has(rawColC) && !LEFT_SECTION_HEADERS.has(rawColC);

    if (hasLeftData && (colE || colG)) {
      if (!isSkipRow(rawColC, colE, colG)) {
        results.push({
          category: leftCategory,
          subcategory: leftSubcategory,
          itemName: rawColC,
          priceRaw: colE,
          commRaw: colG,
          sourceRowNumber: rowNum,
        });
      }
    }

    // ── RIGHT column item capture ──────────────────────────────
    // VPP/ESP/Admin Fee items appear in col M with their own categories
    if (VPP_ITEMS.has(colM) && (colR || colT)) {
      results.push({
        category: 'Value Plus / Energy Star Packs',
        subcategory: null,
        itemName: colM,
        priceRaw: colR,
        commRaw: colT,
        sourceRowNumber: rowNum,
      });
      continue; // Don't double-process this row
    }

    if (colM === ADMIN_FEE && (colR || colT)) {
      results.push({
        category: 'Additional Labor Charges',
        subcategory: null,
        itemName: ADMIN_FEE,
        priceRaw: colR,
        commRaw: colT || raw(21), // col V (index 21) has the "30" for admin fee
        sourceRowNumber: rowNum,
      });
      continue;
    }

    // Regular right-column items: must have a name in colM and not be a section header
    const rawColM = raw(12).trim();
    const hasRightData = rawColM && !RIGHT_SECTION_HEADERS.has(rawColM) && !VPP_ITEMS.has(rawColM) && rawColM !== ADMIN_FEE;

    if (hasRightData && (colR || colT)) {
      if (!isSkipRow(rawColM, colR, colT)) {
        results.push({
          category: rightCategory,
          subcategory: rightSubcategory,
          itemName: rawColM,
          priceRaw: colR,
          commRaw: colT,
          sourceRowNumber: rowNum,
        });
      }
    }
  }

  return results;
}

// ══════════════════════════════════════════════════════════════
// POST /api/commissions/catalog/import-local
// Parses the BTR Commission Sheet into CommissionCatalogItem rows.
// Idempotent — duplicate rows are skipped via sourceHash.
// Security: only allowed file paths accepted.
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.post('/catalog/import-local', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    // ── Security: restrict file path to allowlist ─────────────
    const requestedPath: string = req.body?.filePath ?? DEFAULT_BTR_PATH;
    if (!isAllowedImportPath(requestedPath)) {
      return res.status(403).json({
        error: 'File path not in allowed list. This route may not read arbitrary local files.',
        allowed: ALLOWED_IMPORT_PATHS,
      });
    }
    const filePath = requestedPath;

    // ── Company scoping — always from DB, never from client ───
    const companyId = await getCompanyId(user.userId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: `Commission file not found at ${filePath}`,
        hint: 'Ensure the BTR Commission Sheet is at the expected path.',
      });
    }

    // ── Load workbook ──────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const sheetsFound: string[] = wb.worksheets.map(ws => ws.name);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ error: 'Workbook has no sheets' });

    // ── Convert to raw 2D string array ─────────────────────────
    // Preserve original cell values including leading spaces (ExcelJS trims with padding)
    const rawRows: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        let v = cell.value;
        if (v && typeof v === 'object') {
          if ((v as any).result !== undefined) v = (v as any).result;
          else if ((v as any).richText) v = (v as any).richText.map((t: any) => t.text).join('');
          else if (v instanceof Date) v = v.toISOString().split('T')[0];
          else v = '';
        }
        // Note: do NOT trim here — we need raw values to detect leading spaces
        cells.push(v !== null && v !== undefined ? String(v) : '');
      });
      rawRows.push(cells);
    });

    // ── Parse BTR sheet ────────────────────────────────────────
    const catalogRows = parseBTRSheet(rawRows);

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: string[] = [];
    const sampleRows: any[] = [];

    for (const row of catalogRows) {
      try {
        const { name: cleanName, sku } = extractSku(row.itemName);
        const price = parsePrice(row.priceRaw);
        const comm = parseCommission(row.commRaw);

        // Build dedup hash from stable fields (category + name + price + comm)
        const hashInput = [
          row.category,
          row.subcategory ?? '',
          cleanName,
          sku ?? '',
          row.priceRaw,
          row.commRaw,
        ].join('|');
        const sourceHash = sha256(hashInput);

        // ── Duplicate check ───────────────────────────────────
        const existing = await prisma.commissionCatalogItem.findUnique({ where: { sourceHash } });
        if (existing) {
          duplicates++;
          // Collect duplicate samples too for verification
          if (sampleRows.length < 12) {
            sampleRows.push({
              row: row.sourceRowNumber,
              status: 'DUPLICATE_SKIPPED',
              category: row.category,
              subcategory: row.subcategory,
              itemName: cleanName,
              sku,
              priceRaw: row.priceRaw,
              commRaw: row.commRaw,
              priceType: price.priceType,
              priceAmount: price.priceAmount,
              commissionType: comm.commissionType,
              commissionAmount: comm.commissionAmount,
              commissionPercent: comm.commissionPercent !== null ? `${(comm.commissionPercent * 100).toFixed(1)}%` : null,
            });
          }
          continue;
        }

        // ── Create catalog item ────────────────────────────────
        const created = await prisma.commissionCatalogItem.create({
          data: {
            companyId,
            category: row.category,
            subcategory: row.subcategory ?? null,
            itemName: cleanName,
            sku: sku ?? null,
            priceType: price.priceType,
            priceAmount: price.priceAmount !== null ? price.priceAmount : undefined,
            priceAmount2: price.priceAmount2 !== null ? price.priceAmount2 : undefined,
            pricePercent: price.pricePercent !== null ? price.pricePercent : undefined,
            commissionType: comm.commissionType,
            commissionAmount: comm.commissionAmount !== null ? comm.commissionAmount : undefined,
            commissionPercent: comm.commissionPercent !== null ? comm.commissionPercent : undefined,
            unit: price.unit ?? null,
            notes: price.notes ?? null,
            sourceSheet: ws.name,
            sourceRowNumber: row.sourceRowNumber,
            sourceHash,
            isActive: true,
          },
        });

        imported++;

        if (sampleRows.length < 12) {
          sampleRows.push({
            row: row.sourceRowNumber,
            status: 'IMPORTED',
            category: row.category,
            subcategory: row.subcategory,
            itemName: cleanName,
            sku,
            priceRaw: row.priceRaw,
            commRaw: row.commRaw,
            priceType: price.priceType,
            priceAmount: price.priceAmount,
            commissionType: comm.commissionType,
            commissionAmount: comm.commissionAmount,
            commissionPercent: comm.commissionPercent !== null ? `${(comm.commissionPercent * 100).toFixed(1)}%` : null,
            unit: price.unit,
            id: created.id,
          });
        }
      } catch (rowErr: any) {
        // Row-level errors are logged without crashing the whole import
        console.error(`Row ${row.sourceRowNumber} error:`, rowErr);
        errors.push(`Row ${row.sourceRowNumber} (${row.itemName}): ${rowErr.message}`);
        skipped++;
      }
    }

    // Category summary (from DB, reflects all items for this company)
    const categorySummary = await prisma.commissionCatalogItem.groupBy({
      by: ['category'],
      where: {
        isActive: true,
        OR: [{ companyId }, { companyId: null }],
      },
      _count: { _all: true },
    });

    res.json({
      success: true,
      sheetsFound,
      sheetParsed: ws.name,
      categoriesImported: [...new Set(catalogRows.map(r => r.category))],
      rowsFound: catalogRows.length,
      rowsImported: imported,
      rowsSkipped: skipped,
      rowsDuplicate: duplicates,
      errors: errors.length > 0 ? errors : undefined,
      sampleRows,
      catalogSummary: categorySummary.map(g => ({ category: g.category, count: g._count._all })),
    });
  } catch (err: any) {
    console.error('Catalog import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/commissions/catalog
// List catalog items with category/search filters.
// Includes both global (companyId=null) and company-specific items.
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.get('/catalog', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const companyId = await getCompanyId(user.userId);
    const { category, search, active = 'true', limit = '200', offset = '0' } = req.query;

    const baseWhere: any = {
      isActive: active === 'true',
      OR: [
        ...(companyId ? [{ companyId }] : []),
        { companyId: null },
      ],
    };

    if (category && category !== 'all') baseWhere.category = category as string;

    if (search) {
      baseWhere.AND = [{
        OR: [
          { itemName: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { category: { contains: search as string, mode: 'insensitive' } },
          { subcategory: { contains: search as string, mode: 'insensitive' } },
        ],
      }];
    }

    const [items, total, categories] = await Promise.all([
      prisma.commissionCatalogItem.findMany({
        where: baseWhere,
        orderBy: [{ category: 'asc' }, { subcategory: 'asc' }, { itemName: 'asc' }],
        take: Math.min(parseInt(limit as string) || 200, 500),
        skip: parseInt(offset as string) || 0,
      }),
      prisma.commissionCatalogItem.count({ where: baseWhere }),
      prisma.commissionCatalogItem.groupBy({
        by: ['category'],
        where: {
          isActive: true,
          OR: [...(companyId ? [{ companyId }] : []), { companyId: null }],
        },
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    res.json({
      items,
      total,
      categories: categories.map(c => ({ category: c.category, count: c._count._all })),
    });
  } catch (err: any) {
    console.error('Catalog list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/commissions/catalog/summary
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.get('/catalog/summary', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const companyId = await getCompanyId(user.userId);

    const where = {
      isActive: true,
      OR: [...(companyId ? [{ companyId }] : []), { companyId: null }],
    };

    const [total, byCategory, byCommType] = await Promise.all([
      prisma.commissionCatalogItem.count({ where }),
      prisma.commissionCatalogItem.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
      prisma.commissionCatalogItem.groupBy({
        by: ['commissionType'],
        where,
        _count: { _all: true },
      }),
    ]);

    res.json({
      totalItems: total,
      byCategory: byCategory.map(g => ({ category: g.category, count: g._count._all })),
      byCommissionType: byCommType.map(g => ({ type: g.commissionType, count: g._count._all })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/commissions/catalog/calculate
// Calculate commission from a catalog item + quantity + salePrice
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.post('/catalog/calculate', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const companyId = await getCompanyId(user.userId);
    const { catalogItemId, quantity = 1, salePrice } = req.body;
    const warnings: string[] = [];

    if (!catalogItemId) return res.status(400).json({ error: 'catalogItemId is required' });

    // Verify catalog item belongs to this company or is global
    const item = await prisma.commissionCatalogItem.findFirst({
      where: {
        id: catalogItemId,
        OR: [...(companyId ? [{ companyId }] : []), { companyId: null }],
      },
    });
    if (!item) return res.status(404).json({ error: 'Catalog item not found' });

    const qty = Math.max(1, Number(quantity) || 1);
    const salePriceNum = salePrice !== undefined && salePrice !== null ? Number(salePrice) : null;

    // Effective price
    let effectivePrice: number | null = null;
    if (item.priceType === 'fixed' && item.priceAmount !== null) {
      effectivePrice = Number(item.priceAmount);
    } else if (item.priceType === 'per_unit' && item.priceAmount !== null) {
      effectivePrice = Number(item.priceAmount);
    } else if (item.priceType === 'book') {
      if (salePriceNum !== null) effectivePrice = salePriceNum;
      else warnings.push('BOOK pricing — provide salePrice for accurate calculation');
    } else if (item.priceType === 'job_amount') {
      if (salePriceNum !== null) effectivePrice = salePriceNum;
      else warnings.push('Job Amount pricing — provide salePrice (total job amount)');
    } else if (item.priceType === 'percent_off') {
      if (salePriceNum !== null && item.pricePercent !== null) {
        effectivePrice = salePriceNum * (1 + Number(item.pricePercent));
      } else {
        warnings.push('Percent-off pricing requires salePrice');
      }
    }

    // Commission calculation
    let commissionPerUnit: number | null = null;
    let commissionTotal: number | null = null;

    if (item.commissionType === 'fixed' && item.commissionAmount !== null) {
      commissionPerUnit = Number(item.commissionAmount);
      commissionTotal = commissionPerUnit * qty;
    } else if (item.commissionType === 'percent' && item.commissionPercent !== null) {
      // For percent commissions, the base is the effective price or the sale price
      const base = effectivePrice ?? salePriceNum;
      if (base !== null) {
        commissionPerUnit = base * Number(item.commissionPercent);
        commissionTotal = commissionPerUnit * qty;
      } else {
        warnings.push('Percent commission requires a price — provide salePrice');
      }
    } else if (item.commissionType === 'none') {
      commissionPerUnit = 0;
      commissionTotal = 0;
    }

    const totalPrice = effectivePrice !== null ? effectivePrice * qty : null;

    res.json({
      item: {
        id: item.id,
        itemName: item.itemName,
        category: item.category,
        subcategory: item.subcategory,
        unit: item.unit,
        priceType: item.priceType,
        commissionType: item.commissionType,
      },
      calculation: {
        quantity: qty,
        effectivePrice,
        totalPrice,
        commissionPerUnit,
        commissionTotal,
        commissionType: item.commissionType,
        commissionPercent: item.commissionPercent !== null ? Number(item.commissionPercent) : null,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    console.error('Commission calculate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/commissions/catalog/:id — single catalog item
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.get('/catalog/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const companyId = await getCompanyId(user.userId);

    const item = await prisma.commissionCatalogItem.findFirst({
      where: {
        id: req.params.id,
        OR: [...(companyId ? [{ companyId }] : []), { companyId: null }],
      },
    });
    if (!item) return res.status(404).json({ error: 'Catalog item not found' });

    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/commissions/my
// Earned commission records for the authenticated sales rep.
// Always scoped to the calling user — reps cannot see others' records.
// Managers/admins should use GET /api/commissions (company-level).
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.get('/my', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      status,
      search,
      dateFrom,
      dateTo,
      limit = '50',
      offset = '0',
    } = req.query;

    // ALWAYS scoped to this user — never read userId from request body or query
    const where: any = {
      userId: user.userId,
      isDeleted: false,
    };

    if (status && status !== 'all') where.commissionStatus = status;
    if (dateFrom || dateTo) {
      where.soldDate = {};
      if (dateFrom) where.soldDate.gte = new Date(dateFrom as string);
      if (dateTo) where.soldDate.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search as string, mode: 'insensitive' } },
        { customerAddress: { contains: search as string, mode: 'insensitive' } },
        { contractNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.commissionRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string) || 50,
        skip: parseInt(offset as string) || 0,
        include: { payments: true, adjustments: true },
      }),
      prisma.commissionRecord.count({ where }),
    ]);

    res.json({ records, total });
  } catch (err: any) {
    console.error('My commissions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/commissions/calculate
// Root-level commission calculation (not catalog-based).
// Accepts raw sale price + commission rate or fixed amount.
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.post('/calculate', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const { salePrice, commissionRate, commissionFixed, quantity = 1, catalogItemId } = req.body;
    const warnings: string[] = [];

    const qty = Math.max(1, Number(quantity) || 1);
    const salePriceNum = salePrice !== undefined ? Number(salePrice) : null;

    // If catalogItemId is provided, delegate to catalog calculate
    if (catalogItemId) {
      const companyId = await getCompanyId(user.userId);
      const item = await prisma.commissionCatalogItem.findFirst({
        where: {
          id: catalogItemId,
          OR: [...(companyId ? [{ companyId }] : []), { companyId: null }],
        },
      });
      if (!item) return res.status(404).json({ error: 'Catalog item not found' });

      let commissionPerUnit: number | null = null;
      if (item.commissionType === 'fixed' && item.commissionAmount !== null) {
        commissionPerUnit = Number(item.commissionAmount);
      } else if (item.commissionType === 'percent' && item.commissionPercent !== null && salePriceNum !== null) {
        commissionPerUnit = salePriceNum * Number(item.commissionPercent);
      }

      const commissionTotal = commissionPerUnit !== null ? commissionPerUnit * qty : null;
      return res.json({
        salePrice: salePriceNum,
        quantity: qty,
        commissionPerUnit,
        commissionTotal,
        totalSalePrice: salePriceNum !== null ? salePriceNum * qty : null,
        source: 'catalog',
        catalogItemId: item.id,
        itemName: item.itemName,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    }

    // Manual calculation
    if (salePriceNum === null) {
      return res.status(400).json({ error: 'salePrice is required' });
    }

    let commissionPerUnit: number | null = null;
    if (commissionFixed !== undefined) {
      commissionPerUnit = Number(commissionFixed);
    } else if (commissionRate !== undefined) {
      commissionPerUnit = salePriceNum * Number(commissionRate);
    } else {
      warnings.push('Provide commissionFixed or commissionRate for calculation');
    }

    const commissionTotal = commissionPerUnit !== null ? commissionPerUnit * qty : null;
    res.json({
      salePrice: salePriceNum,
      quantity: qty,
      commissionPerUnit,
      commissionTotal,
      totalSalePrice: salePriceNum * qty,
      source: 'manual',
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    console.error('Commission calculate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/commissions/summary
// Aggregated summary for the authenticated user's commissions.
// Sales reps: own commissions only.
// Managers/admins: all commissions (company-scoped when companyId available).
// ══════════════════════════════════════════════════════════════

commissionCatalogRoutes.get('/summary', async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user?.userId) return res.status(401).json({ error: 'Unauthorized' });

    const isManager = ['manager', 'admin', 'super_admin'].includes(user.role ?? '');
    const companyId = await getCompanyId(user.userId);

    const where: any = { isDeleted: false };

    if (!isManager) {
      // Sales rep: always scoped to own records
      where.userId = user.userId;
    } else if (companyId) {
      // Manager: see all records for their company
      // Requires joining through User → companyId. We filter by userId IN (users with same companyId)
      const companyUsers = await prisma.user.findMany({
        where: { companyId },
        select: { id: true },
      });
      where.userId = { in: companyUsers.map(u => u.id) };
    }
    // super_admin without companyId → sees all (no further filter)

    const records = await prisma.commissionRecord.findMany({
      where,
      include: { payments: true },
    });

    let estimatedTotal = 0;
    let paidTotal = 0;
    let unpaidTotal = 0;
    let totalSales = 0;

    for (const r of records) {
      const comm = Number(r.commissionAmount ?? 0);
      const paid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
      estimatedTotal += comm;
      paidTotal += paid;
      unpaidTotal += Math.max(0, comm - paid);
      totalSales += Number(r.jobAmount ?? 0);
    }

    const avgCommissionPerSale = records.length > 0 ? estimatedTotal / records.length : 0;

    res.json({
      estimatedCommission: estimatedTotal,
      paidCommission: paidTotal,
      unpaidCommission: unpaidTotal,
      totalSalesAmount: totalSales,
      avgCommissionPerSale,
      totalRecords: records.length,
    });
  } catch (err: any) {
    console.error('Commission summary error:', err);
    res.status(500).json({ error: err.message });
  }
});
