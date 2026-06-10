/**
 * Template Inspector V3 — Focus on pricing rows 71-90+ and sketch area
 */
import ExcelJS from 'exceljs';

const TEMPLATE_PATH = 'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\BTR Window Contract1 -.xlsx';

async function inspect() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  const ws = wb.getWorksheet('Contract')!;

  // Rows 71-114 — pricing/payment/signature area
  console.log('--- CONTRACT rows 71-114 ---');
  for (let r = 71; r <= 114; r++) {
    const row = ws.getRow(r);
    const h = row.height;
    const cells: string[] = [];
    for (let c = 1; c <= 30; c++) {
      const cell = row.getCell(c);
      const v = cell.value;
      if (v !== null && v !== undefined && v !== '') {
        let displayVal: string;
        if (typeof v === 'object' && v !== null) {
          if ('formula' in v) displayVal = `[F:${(v as any).formula}]`;
          else if ('sharedFormula' in v) displayVal = `[SF:${(v as any).sharedFormula}]`;
          else if ('richText' in v) displayVal = `[RT:${(v as any).richText?.map((t: any) => t.text).join('')}]`;
          else displayVal = `[OBJ]`;
        } else {
          displayVal = String(v).substring(0, 100);
        }
        cells.push(`${cell.address}="${displayVal}"`);
      }
    }
    if (cells.length > 0 || h) {
      console.log(`  Row ${r} (h=${h || 'default'}): ${cells.join(' | ')}`);
    }
  }

  // Inspect named ranges / defined names
  console.log('\n--- DEFINED NAMES ---');
  for (const name of (wb as any)._definedNames?.matrixMap ? Object.keys((wb as any)._definedNames.matrixMap) : []) {
    console.log(`  ${name}`);
  }
}

inspect().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
