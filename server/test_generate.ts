import { generateOrderForm } from './src/services/orderFormGeneration.service.js';
import fs from 'fs';

async function run() {
  const result = await generateOrderForm({
    appointmentId: 'cmq1486lt008ztn01hkpgwe7i',
    companyId: 'cmpyr9med0001nmwwf2yraoqg',
    userId: 'test',
    documentType: 'order_form',
    forceRegenerate: true
  });
  if (result.xlsxBuffer) {
    fs.writeFileSync('test.xlsx', result.xlsxBuffer);
    console.log('Wrote test.xlsx');
  } else {
    console.log('No buffer returned');
  }
}
run();
