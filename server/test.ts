import { buildWindowWorldOrderData } from './src/workbookEngine.js';
buildWindowWorldOrderData('cmq1486lt008ztn01hkpgwe7i', 'cmpyr9med0001nmwwf2yraoqg').then(r => console.dir(r.exportData.openings.map(o => ({ num: o.windowNumber, id: o.id, model: o.model, qty: o.qty, group: o.groupId })), { depth: null }));
