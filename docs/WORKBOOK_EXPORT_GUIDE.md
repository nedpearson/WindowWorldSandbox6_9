# Workbook Export Guide

## Overview
The Window World Assistant uses the original BTR Excel workbook as the master template for all Contract and Order Form exports. The template is never modified — a copy is generated for each export with appointment data filled into the mapped cells.

## How It Works

### Template Flow
```
BTR_Window_Contract_Template.xlsx (master, read-only)
        ↓ copy
Filled workbook (per-appointment)
        ↓ populate cells from appointment data
        ↓ preserve all formatting, formulas, merges
Excel download (.xlsx) or PDF print
```

### Architecture
- **Template file**: `server/templates/BTR_Window_Contract_Template.xlsx`
- **Template engine**: `server/src/workbookEngine.ts`
- **Field mapping (frontend)**: `apps/web/src/config/workbookFieldMap.ts`
- **Export API route**: `server/src/routes/exports.ts` → `GET /api/exports/excel/:appointmentId`
- **UI component**: `apps/web/src/components/ContractExport.tsx`

## Export Types

### 1. Excel Workbook (.xlsx) — Primary
Downloads a filled copy of the BTR template with:
- **Contract tab**: Customer info, product counts, options, pricing, signatures
- **Order Form tab**: Opening rows 31-54 with all measurements, colors, glass, install types
- **Financing tab**: Monthly payment formulas auto-calculated from `JobAmount`
- All formulas, merges, borders, print settings preserved

**API**: `GET /api/exports/excel/:appointmentId`

### 2. PDF Contract
Client-side generated PDF with contract summary. Uses jsPDF.
Note: This is a simplified version. For exact workbook layout, use Excel export and print from Excel/Google Sheets.

### 3. CSV Opening Schedule
Tab-separated opening data for import into other systems.

### 4. JSON Backup
Full appointment data as JSON for archival.

## Auto-Fill Mapping

### Contract Tab Fills
| Data Source | Workbook Cell | Notes |
|-------------|---------------|-------|
| customer.name | F9 | First + Last |
| customer.email | J9 | |
| customer.address | F10 | |
| customer.phone | S10 | |
| customer.city | F11 | |
| customer.state | H11 | Default: LA |
| customer.zip | L11 | |
| Opening counts | C15-C27 | Auto-counted by model |
| Option counts | M13-M29 | Auto-counted from openings |
| Estimator info | C84-D85 | From logged-in user |

### Order Form Tab Fills
| Data Source | Workbook Column | Rows |
|-------------|----------------|------|
| Opening QTY | C | 31-54 |
| Model # | D | 31-54 |
| Vinyl Color | E | WH or BG |
| Width | H | 31-54 |
| Height | J | 31-54 |
| Glass Option | P | LE or LEE |
| Foam Enhanced | Q | Y |
| Type Removed | AH | Default: ALUM |
| Type Install | AK | IN/OUT/EXT per business rules |
| And 20+ more columns... | | |

## Reconciliation Engine
Before export, the system checks:
- ✅ Customer name/address/phone present
- ✅ All openings have width + height
- ✅ Product categories assigned
- ✅ Opening count ≤ 24 (template capacity)
- ✅ Pricing totals match
- ✅ Deposit doesn't exceed total
- ⚠️ Tempered glass review status
- ⚠️ Oriel top sash confirmed
- ⚠️ Picture window screen override

**Blockers** prevent export. **Warnings** are advisory.

## How to Replace the Workbook Template

1. Go to **Admin > Workbook Templates** (future)
2. Upload new `.xlsx` file
3. System auto-detects sheets and compares field layout
4. Mark new version as active
5. All future exports use the new template

**Manual process (current)**:
1. Replace `server/templates/BTR_Window_Contract_Template.xlsx` with new file
2. Run `npx tsx server/scripts/analyzeWorkbook.ts` to verify structure
3. Update `apps/web/src/config/workbookFieldMap.ts` if cells moved
4. Commit and deploy

## Known Limitations

1. **PDF export** is simplified — for exact layout, print the Excel export
2. **Images/sketches** are not yet inserted into Excel (included as separate attachment)
3. **More than 24 openings** overflow the template's 24-row capacity
4. **Named ranges** (`JobAmount`, `ModelRange`) are preserved from template but not dynamically created
5. **Financing tab** formulas require `JobAmount` named range to be set correctly

## Testing

Run the workbook analysis:
```bash
npx tsx server/scripts/analyzeWorkbook.ts
```

Test with sample data:
```bash
# Hit the export endpoint with a test appointment ID
curl -H "Authorization: Bearer <token>" \
  https://wwassistant.bridgebox.ai/api/exports/excel/<appointmentId> \
  -o test_export.xlsx
```
