/**
 * Deep Workbook Analyzer — BTR Window Contract Template
 * Inspects every sheet, cell, merge, border, font, formula, print setting
 * Outputs a complete JSON analysis for field mapping
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.resolve(__dirname, '../templates/BTR_Window_Contract_Template.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../templates/workbook_analysis.json');

interface CellAnalysis {
  address: string;
  row: number;
  col: number;
  value: any;
  text: string;
  type: string;
  formula?: string;
  isMerged: boolean;
  mergeRange?: string;
  isMergeOrigin: boolean;
  font?: any;
  alignment?: any;
  border?: any;
  fill?: any;
  numFmt?: string;
  protection?: any;
  style?: any;
}

interface SheetAnalysis {
  name: string;
  rowCount: number;
  columnCount: number;
  usedRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null;
  mergedCells: string[];
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  pageSetup: any;
  headerFooter: any;
  printArea?: string;
  cells: CellAnalysis[];
  staticLabels: CellAnalysis[];
  editableFields: CellAnalysis[];
  formulaCells: CellAnalysis[];
}

async function analyze() {
  console.log('📊 Analyzing workbook:', TEMPLATE_PATH);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);

  console.log(`📑 Sheets found: ${workbook.worksheets.map(s => s.name).join(', ')}`);

  const analysis: { sheets: SheetAnalysis[]; metadata: any } = {
    metadata: {
      fileName: 'BTR Window Contract1 -.xlsx',
      analyzedAt: new Date().toISOString(),
      sheetNames: workbook.worksheets.map(s => s.name),
      sheetCount: workbook.worksheets.length,
    },
    sheets: [],
  };

  for (const sheet of workbook.worksheets) {
    console.log(`\n══════════════════════════════════════`);
    console.log(`📋 Sheet: "${sheet.name}"`);
    console.log(`══════════════════════════════════════`);

    const sheetData: SheetAnalysis = {
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      usedRange: null,
      mergedCells: [],
      columnWidths: {},
      rowHeights: {},
      pageSetup: null,
      headerFooter: null,
      cells: [],
      staticLabels: [],
      editableFields: [],
      formulaCells: [],
    };

    // ── Merged Cells ──
    // ExcelJS stores merges as an object keyed by merge range
    const merges = (sheet as any)._merges || {};
    sheetData.mergedCells = Object.keys(merges).length > 0 
      ? Object.keys(merges) 
      : [];
    
    // Also try the model
    if (sheetData.mergedCells.length === 0 && (sheet as any).model?.merges) {
      sheetData.mergedCells = (sheet as any).model.merges;
    }
    
    console.log(`  Merged cells: ${sheetData.mergedCells.length}`);

    // ── Column Widths ──
    for (let c = 1; c <= Math.min(sheet.columnCount, 30); c++) {
      const col = sheet.getColumn(c);
      if (col.width) sheetData.columnWidths[c] = col.width;
    }

    // ── Row Heights ──
    let minRow = Infinity, maxRow = 0, minCol = Infinity, maxCol = 0;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (row.height) sheetData.rowHeights[rowNumber] = row.height;
      if (rowNumber < minRow) minRow = rowNumber;
      if (rowNumber > maxRow) maxRow = rowNumber;
    });

    // ── Page Setup ──
    sheetData.pageSetup = sheet.pageSetup ? { ...sheet.pageSetup } : null;
    sheetData.headerFooter = sheet.headerFooter ? { ...sheet.headerFooter } : null;
    
    // Print area
    if ((sheet as any).model?.printArea) {
      sheetData.printArea = (sheet as any).model.printArea;
    }

    // ── Cell-by-cell deep scan ──
    sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber < minCol) minCol = colNumber;
        if (colNumber > maxCol) maxCol = colNumber;

        const cellAddr = cell.address || `${String.fromCharCode(64 + colNumber)}${rowNumber}`;
        
        // Determine if cell is part of a merge
        let isMerged = false;
        let mergeRange: string | undefined;
        let isMergeOrigin = false;
        
        for (const merge of sheetData.mergedCells) {
          if (merge.includes(':')) {
            const [start] = merge.split(':');
            if (cellAddr === start) {
              isMerged = true;
              mergeRange = merge;
              isMergeOrigin = true;
              break;
            }
          }
        }

        // Check if cell is covered by a merge but not origin
        if (!isMerged && cell.isMerged) {
          isMerged = true;
          isMergeOrigin = false;
        }

        // Get cell value
        let textValue = '';
        let rawValue = cell.value;
        let cellType = typeof cell.value;
        let formula: string | undefined;

        if (cell.value && typeof cell.value === 'object') {
          if ('formula' in (cell.value as any)) {
            formula = (cell.value as any).formula;
            rawValue = (cell.value as any).result;
            cellType = 'formula';
          } else if ('richText' in (cell.value as any)) {
            textValue = (cell.value as any).richText.map((rt: any) => rt.text).join('');
            cellType = 'richText';
          } else if ('text' in (cell.value as any)) {
            textValue = (cell.value as any).text;
            cellType = 'hyperlink';
          }
        }

        if (!textValue && rawValue !== null && rawValue !== undefined) {
          textValue = String(rawValue);
        }

        const cellInfo: CellAnalysis = {
          address: cellAddr,
          row: rowNumber,
          col: colNumber,
          value: rawValue,
          text: textValue,
          type: cellType,
          formula,
          isMerged,
          mergeRange,
          isMergeOrigin,
          font: cell.font ? { ...cell.font } : undefined,
          alignment: cell.alignment ? { ...cell.alignment } : undefined,
          border: cell.border ? JSON.parse(JSON.stringify(cell.border)) : undefined,
          fill: cell.fill ? JSON.parse(JSON.stringify(cell.fill)) : undefined,
          numFmt: cell.numFmt,
          protection: cell.protection ? { ...cell.protection } : undefined,
        };

        sheetData.cells.push(cellInfo);

        // Classify
        if (formula) {
          sheetData.formulaCells.push(cellInfo);
        }

        if (textValue && textValue.trim() && !formula) {
          // If the cell has text and borders/formatting, it's likely a label
          const isLabel = textValue.length > 0 && !formula;
          if (isLabel) {
            sheetData.staticLabels.push(cellInfo);
          }
        }

        if (!textValue || textValue.trim() === '') {
          // Empty cells with borders are likely editable input fields
          if (cell.border && Object.keys(cell.border).length > 0) {
            sheetData.editableFields.push(cellInfo);
          }
        }
      });
    });

    sheetData.usedRange = {
      startRow: minRow === Infinity ? 1 : minRow,
      startCol: minCol === Infinity ? 1 : minCol,
      endRow: maxRow,
      endCol: maxCol,
    };

    console.log(`  Used range: ${sheetData.usedRange.startRow}:${sheetData.usedRange.startCol} to ${sheetData.usedRange.endRow}:${sheetData.usedRange.endCol}`);
    console.log(`  Total cells scanned: ${sheetData.cells.length}`);
    console.log(`  Static labels: ${sheetData.staticLabels.length}`);
    console.log(`  Editable fields (empty w/ borders): ${sheetData.editableFields.length}`);
    console.log(`  Formula cells: ${sheetData.formulaCells.length}`);
    console.log(`  Column widths: ${JSON.stringify(sheetData.columnWidths)}`);
    
    // Print all labels for reference
    console.log(`\n  ── Static Labels ──`);
    for (const lbl of sheetData.staticLabels) {
      if (lbl.text.trim()) {
        console.log(`    ${lbl.address}: "${lbl.text.trim()}"`);
      }
    }

    // Print formula cells
    if (sheetData.formulaCells.length > 0) {
      console.log(`\n  ── Formulas ──`);
      for (const fc of sheetData.formulaCells) {
        console.log(`    ${fc.address}: =${fc.formula} => ${fc.value}`);
      }
    }

    // Print merged cells
    if (sheetData.mergedCells.length > 0) {
      console.log(`\n  ── Merged Cells ──`);
      for (const m of sheetData.mergedCells) {
        console.log(`    ${m}`);
      }
    }

    analysis.sheets.push(sheetData);
  }

  // Write full analysis JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(analysis, null, 2));
  console.log(`\n✅ Full analysis written to: ${OUTPUT_PATH}`);
}

analyze().catch(console.error);
