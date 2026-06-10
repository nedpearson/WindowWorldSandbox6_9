const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('c:/dev/github/business/WindowWorldAssistant/server/templates/BTR_Window_Contract_Template.xlsx');
  const contract = workbook.getWorksheet('Contract');
  if (contract) {
    console.log('Contract cells:');
    for (let r = 14; r <= 16; r++) {
      console.log(`--- Row ${r} ---`);
      const row = contract.getRow(r);
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        console.log(`Col ${colNumber} (${cell.address}):`, cell.value);
      });
    }
  }
}
run();
