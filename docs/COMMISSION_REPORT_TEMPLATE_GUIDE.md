# Commission Report Template Guide

## Overview

The Commission Report system generates Excel workbooks that are **exact replicas** of the original BTR Commission Sheet (Form CS-2400). The original workbook is stored as a template and cloned for each new report — preserving all formatting, formulas, borders, merged cells, and print settings.

## How It Works

### Template-Based Generation

Instead of recreating the report from scratch, the system:

1. **Clones** the master template (`server/templates/Commission_Sheet_BTR_Template.xlsx`)
2. **Populates** only the input cells (customer info + product quantities + option quantities)
3. **Preserves** all 69 formulas, 32 merged cells, and print settings
4. **Outputs** a `.xlsx` file that opens perfectly in Excel

### What Gets Written

| Section | Cells | Written? |
|---------|-------|----------|
| Customer Info | D4-S8 | ✅ Input data |
| Product Quantities | Col A (13-43) | ✅ Input data |
| Option Quantities | Col L (11-43) | ✅ Input data |
| Comments | M47 | ✅ Input data |
| Product Commissions | Col I | ❌ Formula preserved |
| Option Commissions | Col V | ❌ Formula preserved |
| Total Commissions | T45-V45 | ❌ Formula preserved |
| AVG Per Window | T46 | ❌ Formula preserved |
| Book Prices | Col E | ❌ Template value |
| Commission Rates | Col G, T | ❌ Template value |

### What Gets Preserved

- ✅ All 69 formulas
- ✅ All 32 merged cell ranges
- ✅ Row heights (21 custom heights)
- ✅ Column widths (23 columns)
- ✅ Borders and grid lines
- ✅ Fonts, sizes, colors
- ✅ Fill colors
- ✅ Number formats (currency, dates)
- ✅ Print area (A1:W51)
- ✅ Page orientation (portrait)
- ✅ Scale (90%)
- ✅ Margins
- ✅ Named ranges (NumWindows, TotalCommissions)

## How to Generate a Report

### Via Web UI

1. Navigate to **My Commissions** → **Reports** tab
2. View the template info card showing preserved formatting details
3. Click **📥 Download Blank Commission Sheet** for an empty form
4. Or select a commission record and click **📄 Generate** for a populated report

### Via API

```bash
# Generate from a commission record
POST /api/commissions/report/generate
{ "recordId": "clxyz123..." }

# Generate blank sheet with rep info
POST /api/commissions/report/generate-blank

# Get template analysis info
GET /api/commissions/report/template-info
```

## Data Source Mapping

### From Commission Records

| App Field | → | Workbook Cell |
|-----------|---|---------------|
| customerName | → | D5 |
| customerId_ | → | D4 |
| customerAddress | → | D6 |
| customerCity + State + Zip | → | D7 |
| customerPhone | → | J4 |
| region | → | D8 |
| soldDate | → | S4 |
| salesRepName | → | S5 |
| salesRepNumber | → | N5 |
| result | → | O6 |
| numWindows | → | S7 |
| jobAmount | → | S8 |
| comments | → | M47 |

### From Product Types (JSON array in commission record)

Products are auto-mapped by name matching:
- "double hung" → A13 (DH Mech)
- "dh foam" → A14 (DH Foam Enhanced)
- "picture" → A17 (Picture Window)
- "2 lite" → A18 (2 Lite Slider)
- "3 lite" → A19 (3 Lite Slider)
- "casement" → A20 (Casement/Awning)

Options (prefixed with `[Option]`) are mapped similarly.

## Formula Validation

After generation, the system validates:

1. **Total formula** (T45) should equal SUM(I13:I43) + SUM(V11:V43)
2. **AVG formula** (T46) should equal TotalCommissions / NumWindows

> **Note**: ExcelJS cannot recalculate formulas. The formulas will recalculate automatically when the file is opened in Excel. The validation check compares against stored template values.

## File Naming

| Type | Pattern |
|------|---------|
| Populated | `Commission_Report_BTR_YYYY-MM-DD_CustomerName.xlsx` |
| Blank | `Commission_Sheet_BTR_YYYY-MM-DD_blank.xlsx` |

## Updating the Template

If Window World updates the commission sheet:

1. Place the new file at: `C:\Users\nedpe\Desktop\WINDOW WORLD DOCS\Commission Sheet BTR.xlsx`
2. Copy it to: `server/templates/Commission_Sheet_BTR_Template.xlsx`
3. Run the deep analysis script: `node server/scripts/analyzeCommissionDeep.cjs`
4. Update `server/src/config/commissionWorkbookMap.ts` if cell addresses changed
5. Rebuild the server

## Known Limitations

1. **Formula recalculation**: ExcelJS does not recalculate formulas. Totals will show the template's default values until opened in Excel.
2. **PDF export**: Direct PDF generation from ExcelJS is not supported. For PDF, open the generated `.xlsx` in Excel and print to PDF.
3. **Conditional formatting**: VPP/ESP conditional formulas (AA/AB columns) reference cells that may have `#REF!` errors in the template — these are preserved as-is.
4. **Named ranges**: `NumWindows` and `TotalCommissions` are defined in the workbook and referenced by T46 — these must remain intact.

## Privacy & Security

- Commission reports are **private** to the logged-in user
- Reports are generated on-demand (not stored permanently unless exported)
- Reports are **never** included in customer packets or shared exports
- All API endpoints require authentication
- User ID scoping prevents cross-user data access
