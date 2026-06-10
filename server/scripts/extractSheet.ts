/**
 * Per-sheet extraction — run with env SHEET_NAME="Contract" or "Order Form"
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const TEMPLATE_PATH = path.resolve(__dirname2, '../templates/BTR_Window_Contract_Template.xlsx');

const targetSheet = process.argv[2] || 'Contract';

async function extract() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  const sheet = wb.getWorksheet(targetSheet);
  if (!sheet) { console.log('Sheet not found:', targetSheet); return; }

  console.log(`\n========== ${sheet.name} ==========`);
  console.log(`Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount}`);
  console.log('PageSetup:', JSON.stringify(sheet.pageSetup));

  const cw: Record<number,number> = {};
  for (let c = 1; c <= Math.min(sheet.columnCount, 30); c++) {
    const col = sheet.getColumn(c);
    if (col.width) cw[c] = col.width;
  }
  console.log('ColWidths:', JSON.stringify(cw));

  // Row heights
  const rh: Record<number,number> = {};
  sheet.eachRow({ includeEmpty: false }, (row, rn) => {
    if (row.height && row.height !== 15) rh[rn] = row.height;
  });
  console.log('RowHeights (non-default):', JSON.stringify(rh));

  // Non-empty cells
  console.log('\n--- All Non-Empty Cells ---');
  sheet.eachRow({ includeEmpty: false }, (row, rn) => {
    row.eachCell({ includeEmpty: false }, (cell, cn) => {
      let v = '';
      let formula = '';
      if (cell.value && typeof cell.value === 'object') {
        if ('formula' in (cell.value as any)) {
          formula = '=' + (cell.value as any).formula;
          v = String((cell.value as any).result ?? '');
        } else if ('richText' in (cell.value as any)) {
          v = (cell.value as any).richText.map((rt:any) => rt.text).join('');
        } else {
          v = String(cell.value);
        }
      } else if (cell.value !== null && cell.value !== undefined) {
        v = String(cell.value);
      }
      if (v || formula) {
        const flags = [];
        if (cell.border && Object.keys(cell.border).length > 0) flags.push('B');
        if (cell.isMerged) flags.push('M');
        if (cell.font?.bold) flags.push('bold');
        if (cell.font?.size && cell.font.size !== 11) flags.push(`sz${cell.font.size}`);
        const f = flags.length > 0 ? `[${flags.join(',')}]` : '';
        const display = (formula || v).substring(0, 120).replace(/\n/g, '\\n');
        console.log(`  ${cell.address}${f}: ${display}`);
      }
    });
  });

  // Merged ranges
  const merges = (sheet as any)._merges || {};
  const mergeKeys = Object.keys(merges);
  console.log(`\n--- Merged Ranges (${mergeKeys.length}) ---`);
  for (const m of mergeKeys) console.log(`  ${m}`);
}

extract().catch(console.error);
