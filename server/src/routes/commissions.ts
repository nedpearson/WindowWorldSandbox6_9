import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const prisma = new PrismaClient();
export const commissionRoutes = Router();
commissionRoutes.use(requireAuth);

// ═══════════════════════════════════════════════════════════
// Commission Module — Private sales rep commission tracking
// ═══════════════════════════════════════════════════════════

// ── GET /api/commissions — list commission records ──
commissionRoutes.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, search, dateFrom, dateTo, linked, limit = '50', offset = '0' } = req.query;

    const where: any = {
      userId,
      isDeleted: false,
    };

    if (status && status !== 'all') where.commissionStatus = status;
    if (dateFrom || dateTo) {
      where.soldDate = {};
      if (dateFrom) where.soldDate.gte = new Date(dateFrom as string);
      if (dateTo) where.soldDate.lte = new Date(dateTo as string);
    }
    if (search) {
      where.OR = [
        { customerName: { contains: search as string, mode: 'insensitive' } },
        { customerAddress: { contains: search as string, mode: 'insensitive' } },
        { contractNumber: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.commissionRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: { links: true, payments: true, adjustments: true },
      }),
      prisma.commissionRecord.count({ where }),
    ]);

    res.json({ records, total });
  } catch (err: any) {
    console.error('Commission list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/commissions/dashboard — summary stats ──
commissionRoutes.get('/dashboard', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const where = { userId, isDeleted: false };

    const [records, imports] = await Promise.all([
      prisma.commissionRecord.findMany({ where, include: { payments: true } }),
      prisma.commissionImport.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    let totalCommission = 0, totalPaid = 0, totalUnpaid = 0, totalPending = 0;
    const byStatus: Record<string, number> = {};
    const byMonth: Record<string, { commission: number; paid: number }> = {};

    for (const r of records) {
      const commAmt = Number(r.commissionAmount || 0);
      const paidAmt = r.payments.reduce((s, p) => s + Number(p.amount), 0);
      
      totalCommission += commAmt;
      totalPaid += paidAmt;
      
      if (r.commissionStatus === 'pending' || r.commissionStatus === 'expected') {
        totalPending += commAmt;
      }
      
      byStatus[r.commissionStatus] = (byStatus[r.commissionStatus] || 0) + 1;
      
      if (r.soldDate) {
        const month = r.soldDate.toISOString().substring(0, 7);
        if (!byMonth[month]) byMonth[month] = { commission: 0, paid: 0 };
        byMonth[month].commission += commAmt;
        byMonth[month].paid += paidAmt;
      }
    }

    totalUnpaid = totalCommission - totalPaid;

    res.json({
      totalRecords: records.length,
      totalCommission,
      totalPaid,
      totalUnpaid,
      totalPending,
      byStatus,
      byMonth,
      recentImports: imports,
      recentRecords: records.slice(0, 10).map(r => ({
        ...r,
        commissionAmount: Number(r.commissionAmount || 0),
        jobAmount: Number(r.jobAmount || 0),
        paidAmount: r.payments.reduce((s, p) => s + Number(p.amount), 0),
      })),
    });
  } catch (err: any) {
    console.error('Commission dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/commissions/import/analyze — analyze workbook ──
commissionRoutes.post('/import/analyze', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Security: restrict to allowlisted paths — no arbitrary FS reads
    const ALLOWED_PATHS = [
      'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\Commission Sheet BTR.xlsx',
      '/tmp/commission-import.xlsx',
      '/app/uploads/commission.xlsx',
    ];
    const normalizedPath = path.resolve(filePath);
    if (!ALLOWED_PATHS.some(p => path.resolve(p) === normalizedPath)) {
      return res.status(403).json({
        error: 'File path not in allowed list.',
        allowed: ALLOWED_PATHS,
      });
    }
    const targetPath = filePath;

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({
        error: `Commission file not found at ${targetPath}`,
        hint: 'Place your commission workbook at the expected path or provide a different path.',
      });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(targetPath);

    const sheets = wb.worksheets.map(ws => {
      // Extract structure from each sheet
      const headers: { col: string; label: string; colNumber: number }[] = [];
      const sampleRows: Record<string, any>[] = [];

      // Detect header row (look for rows with label-like content)
      // The commission sheet has a unique layout - rows 4-8 are customer info labels
      // Rows 10+ are product/pricing data
      // We'll extract the key data fields
      const detectedFields: Record<string, { row: number; col: string; value: string }> = {};

      for (let r = 1; r <= Math.min(ws.rowCount, 50); r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= Math.min(ws.columnCount, 30); c++) {
          const cell = row.getCell(c);
          let val = cell.value;
          if (val && typeof val === 'object') {
            if ((val as any).result !== undefined) val = (val as any).result;
            else if ((val as any).richText) val = (val as any).richText.map((t: any) => t.text).join('');
            else if (val instanceof Date) val = val.toISOString().split('T')[0];
            else continue; // Skip formulas without results
          }
          if (val !== null && val !== undefined && val !== '') {
            const colLetter = ws.getColumn(c).letter;
            if (!colLetter) continue;

            const strVal = String(val).trim();
            if (strVal.endsWith(':') || strVal.includes('ID') || strVal.includes('Phone') || strVal.includes('Date') || strVal.includes('Amount') || strVal.includes('Rep')) {
              detectedFields[`R${r}${colLetter}`] = { row: r, col: colLetter, value: strVal };
            }
          }
        }
      }

      return {
        name: ws.name,
        rowCount: ws.rowCount,
        columnCount: ws.columnCount,
        detectedFields,
      };
    });

    // Parse the specific Commission Sheet BTR layout
    const commSheet = wb.getWorksheet('Commission');
    let parsedData: any = null;

    if (commSheet) {
      const getCellValue = (row: number, col: number) => {
        const cell = commSheet.getRow(row).getCell(col);
        let v = cell.value;
        if (v && typeof v === 'object') {
          if ((v as any).result !== undefined) return (v as any).result;
          if ((v as any).richText) return (v as any).richText.map((t: any) => t.text).join('');
          if (v instanceof Date) return v.toISOString().split('T')[0];
          return null;
        }
        return v;
      };

      // Extract customer info fields (rows 4-8)
      parsedData = {
        customerInfo: {
          customerId: getCellValue(4, 4), // D4
          homePhone: getCellValue(4, 10), // J4 (merged from I)
          salesDate: getCellValue(4, 19), // S4 (merged from R)
          name: getCellValue(5, 4), // D5
          repNumber: getCellValue(5, 14), // N5
          salesRep: getCellValue(5, 19), // S5
          street: getCellValue(6, 4), // D6
          result: getCellValue(6, 14), // N6 (merged from M)
          cityStZip: getCellValue(7, 4), // D7
          numWindows: getCellValue(7, 19), // S7
          region: getCellValue(8, 4), // D8
          jobAmount: getCellValue(8, 19), // S8
        },
        // Detect product rows with quantity > 0
        products: [] as any[],
        // Extract totals
        totalCommission: getCellValue(45, 21), // U45
        comments: getCellValue(47, 13), // M47 area
      };

      // Scan quantity column A for product counts
      for (let r = 11; r <= 43; r++) {
        const qty = getCellValue(r, 1); // Column A = quantity
        const product = getCellValue(r, 3); // Column C = product name
        const bookPrice = getCellValue(r, 5); // Column E = book price
        const commission = getCellValue(r, 7); // Column G = commission per unit
        const totalComm = getCellValue(r, 9); // Column I = total commission

        if (qty && Number(qty) > 0 && product) {
          parsedData.products.push({
            row: r,
            qty: Number(qty),
            product: String(product).trim(),
            bookPrice: Number(bookPrice) || 0,
            commissionPerUnit: Number(commission) || 0,
            totalCommission: Number(totalComm) || 0,
          });
        }
      }

      // Scan options column L for option counts
      for (let r = 11; r <= 43; r++) {
        const qty = getCellValue(r, 12); // Column L = option quantity
        const option = getCellValue(r, 13); // Column M = option name
        const optPrice = getCellValue(r, 18); // Column R = option price
        const optCommRate = getCellValue(r, 20); // Column T = commission rate
        const optComm = getCellValue(r, 22); // Column V = option commission

        if (qty && Number(qty) > 0 && option) {
          parsedData.products.push({
            row: r,
            qty: Number(qty),
            product: `[Option] ${String(option).trim()}`,
            bookPrice: Number(optPrice) || 0,
            commissionPerUnit: Number(optCommRate) || 0,
            totalCommission: Number(optComm) || 0,
            isOption: true,
          });
        }
      }
    }

    res.json({
      fileName: path.basename(targetPath),
      filePath: targetPath,
      sheets,
      parsedData,
      suggestedMapping: {
        customerName: 'R5:D — Name',
        customerAddress: 'R6:D — Street',
        customerCityStZip: 'R7:D — City,St,Zip',
        customerId: 'R4:D — Customer ID',
        phone: 'R4:I — Home Phone',
        salesDate: 'R4:R — Sales Date',
        salesRep: 'R5:R — Sales Rep',
        repNumber: 'R5:M — Rep #',
        numWindows: 'R7:R — # Windows',
        jobAmount: 'R8:R — Job Amount',
        region: 'R8:D — Region',
        result: 'R6:M — Result',
      },
    });
  } catch (err: any) {
    console.error('Commission analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/commissions/import/execute — run the import ──
commissionRoutes.post('/import/execute', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { filePath, parsedData, columnMapping } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Security: restrict to allowlisted paths
    const ALLOWED_PATHS_EX = [
      'C:\\Users\\nedpe\\Desktop\\WINDOW WORLD DOCS\\Commission Sheet BTR.xlsx',
      '/tmp/commission-import.xlsx',
      '/app/uploads/commission.xlsx',
    ];
    const normPathEx = path.resolve(filePath);
    if (!ALLOWED_PATHS_EX.some(p => path.resolve(p) === normPathEx)) {
      return res.status(403).json({
        error: 'File path not in allowed list.',
        allowed: ALLOWED_PATHS_EX,
      });
    }
    const targetPath = filePath;

    if (!parsedData?.customerInfo) {
      return res.status(400).json({ error: 'No parsed data provided. Run analyze first.' });
    }

    const ci = parsedData.customerInfo;

    // Create import record
    const importRecord = await prisma.commissionImport.create({
      data: {
        userId,
        sourceFileName: path.basename(targetPath),
        sourceFilePath: targetPath,
        sourceSheetName: 'Commission',
        totalRows: (parsedData.products || []).length + 1, // products + header record
        status: 'importing',
        mappingStatus: 'confirmed',
        columnMapping: columnMapping || {},
        metadata: {
          title: 'Window World Commission Sheet',
          parsedAt: new Date().toISOString(),
          customerInfo: ci,
        },
      },
    });

    // Create the main commission record from the sheet header
    const commissionRecord = await prisma.commissionRecord.create({
      data: {
        userId,
        importId: importRecord.id,
        sourceFileName: path.basename(targetPath),
        sourceSheetName: 'Commission',
        sourceRowNumber: 0,
        customerName: ci.name || null,
        customerId_: ci.customerId || null,
        customerAddress: ci.street || null,
        customerPhone: ci.homePhone || null,
        region: ci.region || null,
        soldDate: ci.salesDate ? new Date(ci.salesDate) : null,
        salesRepName: ci.salesRep || null,
        salesRepNumber: ci.repNumber || null,
        result: ci.result || null,
        numWindows: ci.numWindows ? parseInt(ci.numWindows) : null,
        jobAmount: ci.jobAmount ? parseFloat(String(ci.jobAmount).replace(/[$,]/g, '')) : null,
        commissionAmount: parsedData.totalCommission ? parseFloat(String(parsedData.totalCommission)) : null,
        productTypes: parsedData.products || [],
        commissionStatus: 'imported',
        comments: parsedData.comments || null,
      },
    });

    // Store import rows for audit
    let importedRows = 0;
    if (parsedData.products && parsedData.products.length > 0) {
      await prisma.commissionImportRow.createMany({
        data: parsedData.products.map((product: any) => ({
          importId: importRecord.id,
          rowNumber: product.row,
          rawData: product,
          mappedData: {
            product: product.product,
            qty: product.qty,
            bookPrice: product.bookPrice,
            commissionPerUnit: product.commissionPerUnit,
            totalCommission: product.totalCommission,
          },
          status: 'imported',
          recordId: commissionRecord.id,
        })),
      });
      importedRows = parsedData.products.length;
    }

    // Update import status
    await prisma.commissionImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'completed',
        importedRows,
        importedAt: new Date(),
      },
    });

    res.json({
      success: true,
      importId: importRecord.id,
      recordId: commissionRecord.id,
      importedRows,
      commission: commissionRecord,
    });
  } catch (err: any) {
    console.error('Commission import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/commissions/imports — list import history ──
commissionRoutes.get('/imports', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const imports = await prisma.commissionImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { rows: true, records: true } } },
    });

    res.json(imports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/commissions/:id — update a commission record ──
commissionRoutes.patch('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const record = await prisma.commissionRecord.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!record) return res.status(404).json({ error: 'Commission record not found' });

    const updated = await prisma.commissionRecord.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/commissions/:id — soft delete ──
commissionRoutes.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.commissionRecord.updateMany({
      where: { id: req.params.id, userId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/commissions/:id/payments — record a payment ──
commissionRoutes.post('/:id/payments', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const record = await prisma.commissionRecord.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!record) return res.status(404).json({ error: 'Not found' });

    const payment = await prisma.commissionPayment.create({
      data: {
        commissionId: req.params.id,
        amount: req.body.amount,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        checkNumber: req.body.checkNumber,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
        recordedBy: userId,
      },
    });

    // Update paid amount and status
    const allPayments = await prisma.commissionPayment.findMany({
      where: { commissionId: req.params.id },
    });
    const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0);
    const commAmt = Number(record.commissionAmount || 0);

    await prisma.commissionRecord.update({
      where: { id: req.params.id },
      data: {
        paidAmount: totalPaid,
        unpaidAmount: commAmt - totalPaid,
        commissionStatus: totalPaid >= commAmt ? 'paid' : totalPaid > 0 ? 'partially_paid' : record.commissionStatus,
        paymentDate: new Date(),
      },
    });

    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/commissions/:id/link — link to appointment ──
commissionRoutes.post('/:id/link', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const record = await prisma.commissionRecord.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!record) return res.status(404).json({ error: 'Not found' });

    const link = await prisma.commissionRecordLink.create({
      data: {
        commissionId: req.params.id,
        appointmentId: req.body.appointmentId,
        customerId: req.body.customerId,
        linkType: req.body.linkType || 'manual',
        matchConfidence: req.body.matchConfidence,
        matchReason: req.body.matchReason,
        confirmedAt: new Date(),
        confirmedBy: userId,
      },
    });

    res.json(link);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/commissions/export/excel — export to Excel ──
commissionRoutes.get('/export/excel', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const records = await prisma.commissionRecord.findMany({
      where: { userId, isDeleted: false },
      include: { payments: true, adjustments: true, links: true },
      orderBy: { soldDate: 'desc' },
    });

    const wb = new ExcelJS.Workbook();

    // Summary tab
    const summary = wb.addWorksheet('Summary');
    summary.addRow(['Commission Export Summary']);
    summary.addRow(['Generated', new Date().toISOString()]);
    summary.addRow([]);
    summary.addRow(['Total Records', records.length]);
    summary.addRow(['Total Commission', records.reduce((s, r) => s + Number(r.commissionAmount || 0), 0)]);
    summary.addRow(['Total Paid', records.reduce((s, r) => s + r.payments.reduce((ps, p) => ps + Number(p.amount), 0), 0)]);

    // Records tab
    const sheet = wb.addWorksheet('Commission Records');
    sheet.addRow([
      'Customer', 'Address', 'City', 'Region', 'Sold Date', 'Install Date',
      'Rep', '# Windows', 'Job Amount', 'Commission', 'Paid', 'Unpaid', 'Status', 'Notes',
    ]);
    for (const r of records) {
      const paid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
      sheet.addRow([
        r.customerName, r.customerAddress, r.customerCity, r.region,
        r.soldDate, r.installDate,
        r.salesRepName, r.numWindows,
        Number(r.jobAmount || 0), Number(r.commissionAmount || 0),
        paid, Number(r.commissionAmount || 0) - paid,
        r.commissionStatus, r.notes,
      ]);
    }

    // Payments tab
    const paySheet = wb.addWorksheet('Payments');
    paySheet.addRow(['Customer', 'Amount', 'Date', 'Check #', 'Method', 'Notes']);
    for (const r of records) {
      for (const p of r.payments) {
        paySheet.addRow([r.customerName, Number(p.amount), p.paymentDate, p.checkNumber, p.paymentMethod, p.notes]);
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Commission_Export.xlsx');
    await wb.xlsx.write(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// COMMISSION REPORT GENERATION — Exact Excel Template Replica
// ═══════════════════════════════════════════════════════════

import { generateCommissionReport, buildReportInputFromRecord, type CommissionReportInput } from '../commissionReportEngine.js';

// ── POST /api/commissions/report/generate — generate report from commission record ──
commissionRoutes.post('/report/generate', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { recordId, input: manualInput } = req.body;

    let reportInput: CommissionReportInput;

    if (recordId) {
      // Generate from a specific commission record
      const record = await prisma.commissionRecord.findFirst({
        where: { id: recordId, userId },
        include: { payments: true, adjustments: true },
      });
      if (!record) return res.status(404).json({ error: 'Commission record not found' });
      reportInput = buildReportInputFromRecord(record);
    } else if (manualInput) {
      // Generate from manual input
      reportInput = manualInput;
    } else {
      return res.status(400).json({ error: 'Provide recordId or input data' });
    }

    const { buffer, validation } = await generateCommissionReport(reportInput);

    const customerName = (reportInput.customerName || 'blank').replace(/\s+/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Commission_Report_BTR_${date}_${customerName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('X-Validation-Status', validation.valid ? 'valid' : 'needs_review');
    res.send(buffer);
  } catch (err: any) {
    console.error('Commission report generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/commissions/report/generate-blank — generate blank commission sheet ──
commissionRoutes.post('/report/generate-blank', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Generate a blank sheet with just the rep info
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const reportInput: CommissionReportInput = {
      salesRep: user?.name || '',
      region: 'BTR',
    };

    const { buffer } = await generateCommissionReport(reportInput);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Commission_Sheet_BTR_${date}_blank.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/commissions/report/template-info — get template analysis ──
commissionRoutes.get('/report/template-info', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const templatePath = path.resolve(__dirname2, '../../templates/Commission_Sheet_BTR_Template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Commission template not found' });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);
    const ws = wb.getWorksheet('Commission');

    res.json({
      templateFile: 'Commission_Sheet_BTR_Template.xlsx',
      formNumber: 'CS-2400',
      revised: '6/2/2023',
      sheets: wb.worksheets.map(s => s.name),
      mergeCount: Object.keys((ws as any)?._merges || {}).length,
      formulaCount: 69,
      printArea: ws?.pageSetup?.printArea || 'A1:W51',
      orientation: ws?.pageSetup?.orientation || 'portrait',
      scale: ws?.pageSetup?.scale || 90,
      inputCellCount: 49, // customer + product + option + comments
      sections: {
        customerInfo: { rows: '4-8', cells: 12 },
        productQuantities: { rows: '13-43', cells: 24, colA: true },
        optionQuantities: { rows: '11-43', cells: 25, colL: true },
        formulas: { count: 69, totalCell: 'T45/U45/V45' },
        comments: { row: 47, range: 'L47:V50' },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
