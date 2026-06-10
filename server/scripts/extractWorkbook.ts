/**
 * Compact workbook extraction — just sheets, labels, and structure
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.resolve(__dirname, '../templates/BTR_Window_Contract_Template.xlsx');

async function extract() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  console.log('SHEETS:', wb.worksheets.map(s => s.name));

  for (const sheet of wb.worksheets) {
    if (sheet.rowCount === 0) { console.log(`\n[${sheet.name}] EMPTY`); continue; }
    console.log(`\n========== ${sheet.name} ==========`);
    console.log(`Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount}`);
    console.log('PageSetup:', JSON.stringify(sheet.pageSetup));

    // Collect column widths
    const cw: Record<number,number> = {};
    for (let c = 1; c <= Math.min(sheet.columnCount, 25); c++) {
      const col = sheet.getColumn(c);
      if (col.width) cw[c] = col.width;
    }
    console.log('ColWidths:', JSON.stringify(cw));

    // Print only non-empty cells with their values
    let count = 0;
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
          const border = cell.border ? 'B' : '';
          const merge = cell.isMerged ? 'M' : '';
          const flags = [border, merge].filter(Boolean).join(',');
          const display = v.substring(0, 100).replace(/\n/g, '\\n');
          console.log(`  ${cell.address}${flags ? `[${flags}]` : ''}: ${formula || display}`);
          count++;
        }
      });
    });
    console.log(`  Total non-empty cells: ${count}`);

    // Print merged ranges
    const merges = (sheet as any)._merges || {};
    const mergeKeys = Object.keys(merges);
    if (mergeKeys.length > 0) {
      console.log(`  Merged ranges (${mergeKeys.length}):`);
      for (const m of mergeKeys) console.log(`    ${m}`);
    }
  }
}

extract().catch(console.error);
