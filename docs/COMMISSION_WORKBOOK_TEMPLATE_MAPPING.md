# Commission Workbook Template Mapping

## Source Workbook

| Property | Value |
|----------|-------|
| File | `Commission Sheet BTR.xlsx` |
| Form # | CS-2400 |
| Revised | 6/2/2023 |
| Stored Template | `server/templates/Commission_Sheet_BTR_Template.xlsx` |
| Sheet Name | Commission |
| Rows | 71 |
| Columns | 48 (A-AV) |
| Merges | 32 |
| Formulas | 69 |
| Print Area | A1:W51 |
| Orientation | Portrait |
| Scale | 90% |
| Margins | L:0.5, R:0.25, T:0.5, B:0.25 |
| Horizontal Center | Yes |
| Grid Lines | Hidden |
| Row/Col Headers | Hidden |

---

## Sheet Layout Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Rows 1-3:  Title Banner — "Window World Commission Sheet"       │
│            (merged A1:V3)                                        │
├──────────────────────────────────────────────────────────────────┤
│ Row 4:     Customer ID (D4) | Home Phone (J4) | Sales Date (S4) │
│ Row 5:     Name (D5) | Rep # (N5) | Sales Rep (S5)              │
│ Row 6:     Street (D6) | Result (O6)                            │
│ Row 7:     City,St,Zip (D7) | # Windows (S7)                    │
│ Row 8:     Region (D8) | Job Amount (S8)                         │
├──────────────────────────────────────────────────────────────────┤
│ Row 9:     Spacer (height 0.75)                                  │
│ Row 10:    Section Headers — "Windows" (A10) | "Options" (K10)  │
├──────────────────────────────────────────────────────────────────┤
│ PRODUCT SECTION (Left Side)  │  OPTIONS SECTION (Right Side)     │
│ Col A = Qty                  │  Col L = Qty                      │
│ Col C = Product Name         │  Col M = Option Name              │
│ Col E = Book Price           │  Col R = Price                    │
│ Col G = Commission/Unit      │  Col T = Commission Rate          │
│ Col I = Total Commission     │  Col V = Total Commission         │
│      (FORMULA)               │      (FORMULA)                    │
│                              │                                   │
│ Rows 11-28: Window types     │  Rows 11-24: Glass/Style options  │
│ Rows 29-37: Patio Doors      │  Rows 25-43: Labor/Install       │
│ Rows 38-43: Other Products   │                                   │
├──────────────────────────────────────────────────────────────────┤
│ Row 44:    Spacer                                                │
│ Row 45:    Total Commissions $ (R45 label, T45/U45/V45 formula) │
│ Row 46:    AVG Commission Per Window $ (R46 label, T46 formula) │
│ Row 47-50: Comments (L47:V50 merged)                             │
│ Row 51:    Form #, Revision date                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Input Cells (Populated by App Data)

### Customer Information (Rows 4-8)

| Cell | Field Key | Source | Required | Notes |
|------|-----------|--------|----------|-------|
| D4 | customerId | commission_records.customerId_ | No | Customer ID |
| J4 | homePhone | commission_records.customerPhone | No | Merged I4:J4 |
| S4 | salesDate | commission_records.soldDate | No | Date format |
| D5 | customerName | commission_records.customerName | **Yes** | Primary key |
| N5 | repNumber | commission_records.salesRepNumber | No | Merged M5:N5 |
| S5 | salesRep | commission_records.salesRepName | No | |
| D6 | street | commission_records.customerAddress | No | Merged D6:H6 |
| O6 | result | commission_records.result | No | Merged M6:Q6 |
| D7 | cityStZip | commission_records.customerCity + State + Zip | No | Merged D7:H7 |
| S7 | numWindows | commission_records.numWindows | No | |
| D8 | region | commission_records.region | No | Default: BTR |
| S8 | jobAmount | commission_records.jobAmount | No | Currency |

### Product Quantities (Column A, Rows 13-43)

| Cell | Product | Book Price (Col E) | Comm/Unit (Col G) |
|------|---------|-------------------:|-------------------:|
| A13 | 4000 DH Mech/Weld 3001 | $365 | $20 |
| A14 | 4000 DH Foam Enh. 3001-FE | $390 | $23 |
| A17 | Picture Window | $429 | $20 |
| A18 | 2 Lite Slider | $429 | $20 |
| A19 | 3 Lite Slider | $590 | $20 |
| A20 | Casement / Awning | $509 | $15 |
| A21 | Double Casement / Awning | $998 | $25 |
| A22 | Foam Enhanced Upcharge | $25 | $3 |
| A23 | Special Shape w/ Oper. Sash | $599 | $25 |
| A25 | Specialty Windows (Book, 20% off) | BOOK | $25 |
| A27 | Specialty Windows 2 (Book) | BOOK | $15 |
| A30 | VSP Vinyl Rolling Door 6' | $1,409 | $25 |
| A31 | VSP Vinyl Rolling Door 8' | (formula) | $25 |
| A32 | VSP Vinyl Rolling Door 10' | (formula) | $25 |
| A33 | French Door | (formula) | $25 |
| A34 | Screens - Patio Door | (formula) | $25 |
| A35 | Grids - Patio Door ($60/pn) | $60/pn | $10 |
| A36 | Integrated Mini Blinds | (formula) | 10% |
| A37 | Vinyl Patio Door Trim | $95 | $10 |
| A39 | Impact Windows (Job Amt $) | varies | 5% |
| A40 | Vinyl Siding (Job Amt) | varies | 10% |
| A41 | Decorative Shutters Per Pair | varies | $5 |
| A42 | Wincore Entry Door | varies | 10% |
| A43 | 5200 Series Sliding Patio Door | varies | $25 |

### Option Quantities (Column L, Rows 11-43)

| Cell | Option | Price (Col R) | Comm Rate (Col T) |
|------|--------|-------------:|-------------------:|
| L11 | Full Screen | $22 | $3 |
| L12 | Beige / Clay | $52 | $5 |
| L13 | Wood Grain Inside | $90 | $10 |
| L14 | SolarZone LE / LEE | $90/$110 | $5 |
| L15 | Tempered Glass Sq Ft | $7/sqft | 10% |
| L16 | Obscure Glass | $30 | $0 |
| L17 | Oriel Style (40/60 or 60/40) | $36 | $2 |
| L18 | Colonial / Contoured Grids | $45 | $5 |
| L19 | Exterior Color | $250 | $10 |
| L22 | Value Plus Pack (VPP) | $104 | $8 |
| L23 | Energy Star Pack (ESP) | $124 | $10 |
| L24 | TG2 Energy Star (ESP) | $144 | $15 |
| L26 | Remove Storm Window | $10 | $0 |
| L27 | Window/Patio Door Removal | $60 | $5 |
| L28 | Remove Steel Window | $70 | $5 |
| L29 | Remove Aluminum In Stucco | $90 | $10 |
| L30 | Install Mullion | $30 | $0 |
| L35 | Repair Sill Per Foot | $25/ft | 10% |
| L36 | 2nd Story Charge | $10 | $0 |
| L37 | Bay Window Finish & Trim | $300 | $20 |
| L38 | Header Flashing | $12 | $2 |
| L39 | J-Channel | $40 | $5 |
| L43 | Administrative Fee | $150 | $30 |

### Comments

| Cell | Notes |
|------|-------|
| M47 | Comments area (merged L47:V50) |

---

## Formula Cells (NEVER Overwrite)

### Product Commission Formulas (Column I)

| Cell | Formula | Description |
|------|---------|-------------|
| I14 | `=IF(A14="","",A14*G14)` | qty × commission |
| I16 | `=IF(A16="","",A16*G16)` | qty × commission |
| I17 | `=I16` (shared) | qty × commission |
| I18-I20 | `=I16` (shared) | qty × commission |
| I21 | `=IF(A21="","",A21*G21)` | qty × commission |
| I22-I23 | `=I16` (shared) | qty × commission |
| I25 | `=IF(A25="","",A25*G25)` | specialty calc |
| I27 | `=IF(A27="","",A27*G27)` | specialty calc |
| I30 | `=IF(A30="","",A30*G30)` | patio door |
| I31-I37 | `=I30` (shared) | patio door |
| I39 | `=IF(A39="","",A39*E39*G39)` | impact/siding % |
| I40-I43 | `=IF(A40="","",A40*E40*G40)` | % based |

### Option Commission Formulas (Column V)

| Cell | Formula | Description |
|------|---------|-------------|
| V11 | `=IF(L11="","",L11*T11)` | qty × rate |
| V12-V14 | Same pattern | qty × rate |
| V15 | `=IF(L15="","",L15*7*T15)` | sqft × $7 × rate |
| V16 | `=IF(L16="","",L16*T16)` | qty × rate |
| V17-V21 | `=V16` (shared) | qty × rate |
| V23-V24 | `=V16` (shared) | qty × rate |
| V26 | `=IF(L26="","",L26*T26)` | qty × rate |
| V28-V33 | `=V26` (shared) | qty × rate |
| V35 | `=IF(L35="","",L35*15*T35)` | feet × $15 × rate |
| V36-V37 | Same pattern | qty × rate |
| V39-V42 | Same pattern | qty × rate |

### Summary Formulas

| Cell | Formula | Description |
|------|---------|-------------|
| T45 | `=SUM(I13:I43)+SUM(V11:V43)` | **Total Commissions** |
| U45 | `=SUM(I13:I43)+SUM(V11:V43)` | (duplicate) |
| V45 | `=SUM(I13:I43)+SUM(V11:V43)` | (duplicate) |
| T46 | `=IF(NumWindows=0,"",TotalCommissions/NumWindows)` | AVG per window |

### Auto-Fill Formulas

| Cell | Formula | Description |
|------|---------|-------------|
| C25 | `=IF(A25="","","Special Shape")` | Auto-label |
| D25 | `=IF(A25="","","Special Shape")` | Auto-label |
| C27 | `=IF(A27="","","Special Shape")` | Auto-label |
| D27 | `=IF(A27="","","Special Shape")` | Auto-label |

### VPP/ESP Conditional Formulas

| Cell | Formula | Purpose |
|------|---------|---------|
| AA18 | `=AND(L16>0,L23="")` | VPP check |
| AA19 | `=IF(AA18=FALSE,"",L16*R15)` | VPP calc |
| AB18-AB19 | VPP label logic | |
| AA26-AA27 | ESP conditional | |
| AB26-AB27 | ESP label | |

---

## Merged Cells

| Range | Content |
|-------|---------|
| A1:V3 | Title: "Window World Commission Sheet" |
| K4:? | (Customer ID area) |
| T4:? | (Sales Date area) |
| N5:? | Rep # |
| S5:? | Sales Rep |
| D6:H6 | Street |
| O6:Q6 | Result |
| D7:H7 | City,St,Zip |
| T7:? | # Windows |
| F8:? | Region area |
| T8:? | Job Amount |
| A10:J10 | "Windows" header |
| K10:? | "Options" header |
| A29:J29 | "Patio Doors" header |
| K25:W25 | "Additional Labor Charges" header |
| A38:J38 | "Other Products" header |
| L47:V50 | Comments area |
| T44:? | (spacer) |
| T45:V45 | Total Commissions |

---

## Column Widths

| Column | Width |
|--------|-------|
| A | 3.7 |
| B | 1.1 (spacer) |
| C | 8.7 |
| D | 19.3 |
| E | 7.1 |
| F | 1.1 (spacer) |
| G | 5.1 |
| H | 1.1 (spacer) |
| I | 8.9 |
| J | 0.9 (spacer) |
| K | 0.9 (spacer) |
| L | 3.7 |
| M | 11.0 |
| N | 1.1 |
| O | 6.3 |
| P | 3.3 |
| Q | 5.9 |
| R | 7.4 |
| S | 1.1 |
| T | 4.7 |
| U | 1.1 |
| V | 8.7 |
| W | 0.9 |

---

## Row Heights (Non-Default)

| Row | Height | Purpose |
|-----|--------|---------|
| 1 | 21 | Title |
| 2 | 30.75 | Title |
| 3 | 20.25 | Title |
| 4-8 | 18 | Customer info |
| 9 | 0.75 | Spacer |
| 10 | 17.1 | Section header |
| 11 | 20.1 | First data row |
| 12-28 | 15.95 | Product rows |
| 29-30 | 13.5 | Patio door header |
| 31 | 13.5 | Patio door |
| 32-43 | 15.95 | Products/options |
| 44-50 | 15.95 | Totals/comments |
| 51 | 21 | Form # |

---

## Page Setup

```json
{
  "fitToPage": true,
  "orientation": "portrait",
  "scale": 90,
  "horizontalDpi": 300,
  "verticalDpi": 300,
  "printArea": "A1:W51",
  "fitToWidth": 1,
  "fitToHeight": 1,
  "horizontalCentered": true,
  "showRowColHeaders": false,
  "showGridLines": false,
  "margins": {
    "left": 0.5,
    "right": 0.25,
    "top": 0.5,
    "bottom": 0.25
  }
}
```

---

## Named Ranges (Detected from Formulas)

| Name | Used In | Purpose |
|------|---------|---------|
| NumWindows | T46 | References S7 (# Windows input) |
| TotalCommissions | T46 | References T45 (sum formula) |

---

## Report Generation Workflow

1. **Template Clone**: Copy `server/templates/Commission_Sheet_BTR_Template.xlsx`
2. **Write Input Cells Only**: Populate customer info (D4-S8), product qtys (Col A), option qtys (Col L), comments (M47)
3. **Skip Formula Cells**: Never overwrite cells in Col I, Col V, Row 45-46, C25/D25/C27/D27
4. **Preserve Everything**: Merges, borders, fonts, colors, row heights, column widths, print area, page setup
5. **Output**: Generate `.xlsx` buffer → serve as download

---

## Assumptions

1. The workbook has exactly 1 sheet named "Commission"
2. Product book prices (Col E) and commission rates (Col G/T) are static template values — not overwritten
3. Only quantity cells (Col A for products, Col L for options) are input cells
4. Named ranges `NumWindows` and `TotalCommissions` reference the expected cells
5. Formula recalculation occurs when the file is opened in Excel (ExcelJS does not recalculate)

---

## Manual Verification Items

- [ ] Open generated `.xlsx` in Excel and verify formulas recalculate
- [ ] Verify print preview matches original template layout
- [ ] Verify all 32 merged cell ranges are preserved
- [ ] Verify no formula cells have been overwritten
- [ ] Verify Total Commissions (T45) = SUM(I13:I43) + SUM(V11:V43)
- [ ] Verify AVG Commission Per Window (T46) calculates correctly
- [ ] Verify page orientation is portrait at 90% scale
- [ ] Verify print area is A1:W51
