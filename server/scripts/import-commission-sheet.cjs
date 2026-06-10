#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// Commission Sheet Import Script
// Reads the BTR Commission Sheet Excel workbook and outputs
// detected structure for verification before database import.
//
// Usage: npm run import:commissions
//        node scripts/import-commission-sheet.cjs [path]
// ═══════════════════════════════════════════════════════════

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const DEFAULT_PATH = 'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\Commission Sheet BTR.xlsx';

async function main() {
  const filePath = process.argv[2] || DEFAULT_PATH;

  console.log('═══════════════════════════════════════════════');
  console.log('  Window World Commission Sheet Importer');
  console.log('═══════════════════════════════════════════════');
  console.log(`\nFile: ${filePath}\n`);

  // Step 1: Check file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Commission file not found at ${filePath}`);
    console.error('   Place your commission workbook at the expected path or provide a different path.');
    process.exit(1);
  }
  console.log('✅ File found');

  // Step 2: Read workbook
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  console.log(`✅ Workbook loaded — ${wb.worksheets.length} sheet(s): ${wb.worksheets.map(s => s.name).join(', ')}`);

  // Step 3: Process Commission sheet
  const ws = wb.getWorksheet('Commission');
  if (!ws) {
    console.error('❌ No "Commission" sheet found in workbook');
    console.log('   Available sheets:', wb.worksheets.map(s => s.name).join(', '));
    process.exit(1);
  }
  console.log(`✅ Commission sheet: ${ws.rowCount} rows × ${ws.columnCount} columns\n`);

  // Helper to get cell value
  const getVal = (row, col) => {
    const cell = ws.getRow(row).getCell(col);
    let v = cell.value;
    if (v && typeof v === 'object') {
      if (v.result !== undefined) return v.result;
      if (v.richText) return v.richText.map(t => t.text).join('');
      if (v instanceof Date) return v.toISOString().split('T')[0];
      return null;
    }
    return v;
  };

  // Step 4: Extract customer info
  console.log('── CUSTOMER INFO ──────────────────────');
  const customerInfo = {
    customerId: getVal(4, 4),
    homePhone: getVal(4, 10),
    salesDate: getVal(4, 19),
    name: getVal(5, 4),
    repNumber: getVal(5, 14),
    salesRep: getVal(5, 19),
    street: getVal(6, 4),
    result: getVal(6, 14),
    cityStZip: getVal(7, 4),
    numWindows: getVal(7, 19),
    region: getVal(8, 4),
    jobAmount: getVal(8, 19),
  };

  for (const [k, v] of Object.entries(customerInfo)) {
    if (v) console.log(`  ${k}: ${v}`);
  }

  // Step 5: Detect products with quantities
  console.log('\n── PRODUCTS WITH QUANTITIES ───────────');
  const products = [];
  for (let r = 11; r <= 43; r++) {
    const qty = getVal(r, 1);
    const product = getVal(r, 3);
    const bookPrice = getVal(r, 5);
    const commPerUnit = getVal(r, 7);
    const totalComm = getVal(r, 9);

    if (qty && Number(qty) > 0 && product) {
      const p = {
        row: r,
        qty: Number(qty),
        product: String(product).trim(),
        bookPrice: Number(bookPrice) || 0,
        commPerUnit: Number(commPerUnit) || 0,
        totalComm: Number(totalComm) || 0,
      };
      products.push(p);
      console.log(`  Row ${r}: ${p.qty}x ${p.product} — Book: $${p.bookPrice} | Comm: $${p.commPerUnit}/ea = $${p.totalComm}`);
    }
  }

  // Step 6: Detect options with quantities
  console.log('\n── OPTIONS WITH QUANTITIES ────────────');
  const options = [];
  for (let r = 11; r <= 43; r++) {
    const qty = getVal(r, 12);
    const option = getVal(r, 13);
    const optPrice = getVal(r, 18);
    const optCommRate = getVal(r, 20);
    const optComm = getVal(r, 22);

    if (qty && Number(qty) > 0 && option) {
      const o = {
        row: r,
        qty: Number(qty),
        option: String(option).trim(),
        price: Number(optPrice) || 0,
        commRate: Number(optCommRate) || 0,
        totalComm: Number(optComm) || 0,
      };
      options.push(o);
      console.log(`  Row ${r}: ${o.qty}x ${o.option} — $${o.price} | Rate: ${o.commRate} = $${o.totalComm}`);
    }
  }

  // Step 7: Total commission
  const totalCommission = getVal(45, 21) || 0;
  const comments = getVal(47, 13) || '';

  console.log('\n── SUMMARY ───────────────────────────');
  console.log(`  Products: ${products.length}`);
  console.log(`  Options:  ${options.length}`);
  console.log(`  Product Commission: $${products.reduce((s, p) => s + p.totalComm, 0).toFixed(2)}`);
  console.log(`  Option Commission:  $${options.reduce((s, o) => s + o.totalComm, 0).toFixed(2)}`);
  console.log(`  Total Commission:   $${totalCommission}`);
  if (comments) console.log(`  Comments: ${comments}`);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Import analysis complete.');
  console.log('  To import into the database, use the web UI:');
  console.log('  Office Mode → My Commissions → Import');
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
