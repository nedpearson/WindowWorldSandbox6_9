import ExcelJS from 'exceljs';

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:\\\\dev\\\\github\\\\business\\\\WindowWorldAssistant\\\\server\\\\templates\\\\window-world\\\\btr-window-contract-template.xlsx');
  
  wb.eachSheet((sheet, id) => {
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell.value && cell.value.toString().toLowerCase().includes('confirmed')) {
          console.log(`Found "${cell.value}" on sheet "${sheet.name}" row ${rowNumber} col ${colNumber}`);
        }
      });
    });
  });
}

main().catch(console.error);
