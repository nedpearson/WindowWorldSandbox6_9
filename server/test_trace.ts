import { buildWindowWorldOrderData } from './src/workbookEngine.js';
buildWindowWorldOrderData('cmq1486lt008ztn01hkpgwe7i', 'cmpyr9med0001nmwwf2yraoqg').then(r => {
  let i = 0;
  let currentRowOffset = 0;
  const processed = new Set();
  while(i < r.exportData.openings.length && currentRowOffset < 24) {
    const o = r.exportData.openings[i];
    if (o.id && processed.has(o.id)) { i++; continue; }
    console.log('Processing opening', o.windowNumber, o.model, 'groupId:', o.groupId);
    if (o.groupId) {
      const groupOpenings = r.exportData.openings.filter(x => x.groupId === o.groupId);
      groupOpenings.forEach(x => { if (x.id) processed.add(x.id); });
      console.log('  Mull Group of', groupOpenings.length);
      currentRowOffset += 1 + groupOpenings.length;
    } else {
      if (o.id) processed.add(o.id);
      console.log('  Single', o.model);
      currentRowOffset++;
    }
    i++;
  }
});
