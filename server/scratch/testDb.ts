import ExcelJS from 'exceljs';
import path from 'path';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(process.cwd(), 'templates/window-world/btr-window-contract-template.xlsx'));
  const sheet = workbook.getWorksheet('Order Form');
  if (!sheet) { console.log('Order Form not found'); return; }
  
  for (let r = 5; r <= 20; r++) {
    const row = sheet.getRow(r);
    row.eachCell((cell, colNumber) => {
      const val = cell.value?.toString().trim();
      if (val && val.length > 0) {
        console.log(`Row ${r}, Col ${colNumber} (${cell.address}): ${val}`);
      }
    });
  }
}
main();
