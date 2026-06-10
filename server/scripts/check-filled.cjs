const ExcelJS = require('exceljs');
async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:/Users/nedpe/Desktop/test_generated_contract.xlsx');
  const orderForm = workbook.getWorksheet('Order Form');
  if (orderForm) {
    console.log('Filled Order Form Data:');
    for (let r = 31; r <= 35; r++) {
      const row = orderForm.getRow(r);
      console.log(`Row ${r}:`);
      console.log(`  B (Row #):`, row.getCell('B').value);
      console.log(`  C (Qty):`, row.getCell('C').value);
      console.log(`  D (Model):`, row.getCell('D').value);
      console.log(`  N (Window #):`, row.getCell('N').value);
    }
  }
}
run();
