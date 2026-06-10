# Commission Sheet Import Guide

## Overview

The Commission Records module lets you import, track, reconcile, and export your Window World commission data privately. Commission records are **never** included in customer packets, contract exports, or shared with other users.

## File Location

Place your commission workbook at:

```
C:\Users\nedpe\Desktop\WINDOW WORLD DOCS\Commission Sheet BTR.xlsx
```

The importer expects a workbook with a **"Commission"** sheet containing the standard Window World Commission Sheet layout (Form # CS-2400).

## How to Import

### Via Web UI (Recommended)

1. Navigate to **My Commissions** in the sidebar (💰)
2. Click the **Import** tab
3. Click **🔍 Analyze Commission Sheet**
4. Review the detected data:
   - Customer info (name, address, phone, etc.)
   - Products with quantities and commission amounts
   - Options and labor charges
   - Column mapping
5. Click **✅ Import Commission Record**
6. View your imported data in the **Dashboard** tab

### Via CLI

```bash
node server/scripts/import-commission-sheet.cjs
# or with a custom path:
node server/scripts/import-commission-sheet.cjs "C:\path\to\your\file.xlsx"
```

## Commission Sheet Structure

The BTR Commission Sheet (Form CS-2400) has this layout:

| Area | Content |
|------|---------|
| Row 1-3 | Title: "Window World Commission Sheet" |
| Row 4 | Customer ID, Home Phone, Sales Date |
| Row 5 | Name, Rep #, Sales Rep |
| Row 6 | Street, Result |
| Row 7 | City/St/Zip, # Windows |
| Row 8 | Region, Job Amount |
| Row 10 | Section headers: Windows / Options |
| Row 11-28 | Product pricing (DH, Slider, Casement, etc.) |
| Row 29-37 | Patio Doors / Other Products |
| Row 38-43 | Additional products |
| Row 25-43 (Col L-V) | Options/Labor (Remove, Install, Grids, etc.) |
| Row 45 | Total Commissions |
| Row 47 | Comments |

## Column Mapping

| App Field | Sheet Location | Description |
|-----------|---------------|-------------|
| customerName | R5:D | Customer name |
| customerAddress | R6:D | Street address |
| customerCityStZip | R7:D | City, State, Zip |
| customerId | R4:D | WW Customer ID |
| phone | R4:I | Home phone |
| salesDate | R4:R | Sale date |
| salesRep | R5:R | Sales rep name |
| repNumber | R5:M | Rep # |
| numWindows | R7:R | Number of windows |
| jobAmount | R8:R | Total job amount |
| region | R8:D | Region/branch |

## Tracking Commission Status

Each commission record has a status:

| Status | Meaning |
|--------|---------|
| `imported` | Just imported from sheet |
| `pending` | Awaiting verification |
| `expected` | Verified, expecting payment |
| `paid` | Fully paid |
| `partially_paid` | Partial payment received |
| `disputed` | Under dispute |
| `adjusted` | Amount adjusted |
| `ignored` | Marked as ignore |

## Linking to Appointments

Commission records can optionally be linked to app appointments:

1. Open a commission record
2. Click **Link to Appointment**
3. The system will suggest matches based on:
   - Customer name
   - Address
   - Sale date proximity
   - Job amount similarity
4. Confirm the match

Linked commissions will show in the appointment detail view.

## Export Options

- **Excel** — Multi-tab workbook (Summary, Records, Payments, Adjustments)
- **CSV** — Simple flat file export
- **PDF** — Formatted commission summary

## Privacy & Security

- Commission records are **private to the logged-in user**
- Other sales reps cannot view your commission data
- Commissions are **never** included in:
  - Customer packets
  - Contract PDF exports
  - Order Form exports
  - Public sharing links
- Admin override available for `nedpearson@gmail.com`
- Row-Level Security (RLS) enforced in Supabase
- Commission data is hidden from demo mode users

## Database Tables

| Table | Purpose |
|-------|---------|
| `commission_imports` | Import session tracking |
| `commission_import_rows` | Raw row data from each import |
| `commission_records` | Main commission records |
| `commission_record_links` | Links to appointments/customers |
| `commission_adjustments` | Manual amount adjustments |
| `commission_payments` | Payment tracking |

## Troubleshooting

**File not found error:**
```
Commission file not found at C:\Users\nedpe\Desktop\WINDOW WORLD DOCS\Commission Sheet BTR.xlsx
```
→ Verify the file exists at the expected path.

**No data detected:**
→ Ensure the "Commission" sheet exists in the workbook.
→ Check that quantity cells (Column A for products, Column L for options) have numeric values > 0.

**Duplicate import warning:**
→ The system tracks imports by file name and timestamp. Reimporting the same file will create a new import record but will not overwrite existing commission records.
