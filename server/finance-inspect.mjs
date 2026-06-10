/**
 * finance-inspect.mjs
 * Reads Finance Options.xlsx and reports all sheets, headers, rows, and formulas.
 */
import ExcelJS from 'exceljs';

const FILE = 'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\Finance Options.xlsx';

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(FILE);

console.log('=== WORKBOOK INSPECTION ===');
console.log(`Sheets found: ${wb.worksheets.length}`);

for (const ws of wb.worksheets) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SHEET: "${ws.name}"`);
  console.log(`Dimensions: ${ws.rowCount} rows x ${ws.columnCount} cols`);

  // Collect all rows
  const rows = [];
  ws.eachRow({ includeEmpty: true }, (row, rowNum) => {
    const cells = [];
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      let val = cell.value;
      let formula = null;
      let result = null;
      
      // Extract formula and result
      if (val && typeof val === 'object') {
        if (val.formula) {
          formula = val.formula;
          result = val.result;
          val = result;
        } else if (val.richText) {
          val = val.richText.map(t => t.text).join('');
        } else if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        }
      }
      
      cells.push({
        col: colNum,
        ref: cell.address,
        type: cell.type,
        value: val,
        formula,
        result,
        numFmt: cell.numFmt || null,
      });
    });
    rows.push({ rowNum, cells });
  });

  // Print first 5 rows as header inspection
  console.log('\n--- FIRST 5 ROWS (header detection) ---');
  for (const row of rows.slice(0, 5)) {
    const cells = row.cells.map(c => {
      const v = c.value != null ? String(c.value).slice(0, 40) : '';
      const f = c.formula ? ` [FORMULA: ${c.formula.slice(0,60)}]` : '';
      return `  [${c.ref}] "${v}"${f}`;
    }).filter(s => s.includes('"') && !s.includes('""'));
    if (cells.length > 0) {
      console.log(`Row ${row.rowNum}:`);
      cells.forEach(c => console.log(c));
    }
  }

  // Print all data rows (rows 2+) with non-empty cells
  console.log('\n--- DATA ROWS ---');
  for (const row of rows.slice(1)) {
    const nonEmpty = row.cells.filter(c => c.value != null && c.value !== '');
    if (nonEmpty.length === 0) continue;
    
    console.log(`\nRow ${row.rowNum}:`);
    for (const c of nonEmpty) {
      const v = c.value != null ? String(c.value).slice(0, 80) : '';
      const f = c.formula ? ` [FORMULA: ${c.formula.slice(0, 100)}]` : '';
      const fmt = c.numFmt ? ` [fmt: ${c.numFmt}]` : '';
      console.log(`  [${c.ref}] type=${c.type} val="${v}"${f}${fmt}`);
    }
  }

  // Find formulas
  console.log('\n--- FORMULAS FOUND ---');
  let formulaCount = 0;
  for (const row of rows) {
    for (const c of row.cells) {
      if (c.formula) {
        formulaCount++;
        console.log(`  ${c.ref}: formula="${c.formula}" result="${c.result}"`);
      }
    }
  }
  if (formulaCount === 0) console.log('  (none)');
}

console.log('\n=== INSPECTION COMPLETE ===');
