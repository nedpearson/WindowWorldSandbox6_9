# Workbook Mapping Audit - Window World Sandbox

This document details the mapping of the Excel workbook template (`BTR Window Contract1 -.xlsx` or `BTR_Window_Contract_Template.xlsx`) to the application database models (`Customer`, `Appointment`, `Opening`), frontend TypeScript interfaces, and API routes.

---

## 1. Sheet Mappings Overview

The BTR Window Contract template contains five sheets:
1. **Contract**: Customer invoice, deposit/balance calculations, and style totals.
2. **Order Form**: Dimensional specifications per opening (up to 24 openings).
3. **Window World Financing**: Finance plan calculations and terms.
4. **Contractors License**: Pre-embedded license image (no data mapping).
5. **COI**: Certificate of Insurance (no data mapping).

---

## 2. Customer & Header Details

These fields appear in both the **Contract** and **Order Form** tabs. The canvas sketch metadata is exported as a static image into the Order Form sheet.

| Excel Cell (Contract) | Excel Cell (Order Form) | Field Description | Database Model / Column | Frontend UI / JSON Key |
| :--- | :--- | :--- | :--- | :--- |
| **Q8** | — | Job Complete? | `Appointment.completeJob` | `completeJob` (Boolean) |
| **W8** | — | Remaining Windows | `Appointment.notes` | parsed from notes |
| **F9** | **S13:AC13** | Customer Name | `Customer.firstName` + `lastName` | `firstName` / `lastName` |
| **J9** | — | Customer Email | `Customer.email` | `email` |
| **F10** | **S15:AC15** | Billing Address | `Customer.address` | `address` |
| **K10** | **AB9:AC9** | Customer ID # | `Customer.id` / `customerId` | `customerId` / `id` |
| **S10** | **AG13:AL13** | Primary Phone | `Customer.phone` | `phone` |
| **F11** | **AD15:AI15** | Billing City | `Customer.city` | `city` |
| **H11** | — | Billing State | `Customer.state` | `state` (default "LA") |
| **L11** | **AK15:AL15** | Billing Zip Code | `Customer.zip` | `zip` |
| **S11** | **AG14:AL14** | Secondary Phone | `Customer.phone2` | `phone2` |
| **Q8** | **S9:T9** | Purchase Order # | `Appointment.poNumber` | `poNumber` |
| — | **AB9:AC9** | Account Number | `Appointment.accountNumber` | `accountNumber` |
| — | **AH9** | Order Date | `Appointment.appointmentDate` | `appointmentDate` |
| **D84** | **W18:AD18** | Estimator Name | `User.name` | `user.name` |
| — | **AG18:AL18** | Estimator Phone | `User.phone` | `user.phone` |
| — | **B2:AL30 (Draw)**| Sketch Diagram | `FormSketch.sketchData` (base64) | Drawn to Excel canvas |

---

## 3. Opening Specifications (Order Form Rows 31–54)

Each row in the **Order Form** sheet represents a single window/door opening. The columns map directly to the `Opening` database model.

| Col | Header Name | Database Model Field | Type | Mapping Notes / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **B** | Row # | — | Static | Index 1 to 24 |
| **C** | QTY | `Opening.quantity` | Int | Checked in rule engine (default `1`) |
| **D** | MODEL | `Opening.productModel` | String | e.g. "3001" (Double Hung), "3004" (Picture) |
| **E** | VINYL COLOR | `Opening.seriesModel` | String | e.g. "WH" (White), "BG" (Beige) |
| **F** | INT COLOR | `Opening.interiorColor` | String | Wood grains: "LO", "DO", "CH" |
| **G** | EXT COLOR | `Opening.exteriorColor` | String | e.g. "WH", "BG", custom paints |
| **H** | WIDTH | `Opening.width` | Float | Measured width in inches |
| **I** | x | — | Static | Separator character "x" |
| **J** | HEIGHT | `Opening.height` | Float | Measured height in inches |
| **K** | LEG HEIGHT | `Opening.legHeight` | Float | Required for arch/specialty shapes |
| **L** | CUSTOM RADIUS | `Opening.customRadius` | Float | Required for custom radius arches |
| **N** | WINDOW # | `Opening.openingNumber` | Int | Unique index mapping to sketch marker |
| **O** | HINGE | `Opening.hinge` | String | swing orientation: "L" (Left) or "R" (Right) |
| **P** | GLASS OPTION | `Opening.glassPackage` | String | defaults: "LE" (Low-E), "LEE" (Low-E Elite) |
| **Q** | FOAM ENHANCED | `Opening.foamEnhanced` | Boolean | upcharge indicator |
| **R** | GRID STYLE | `Opening.gridStyle` | String | e.g. "Colonial", "Prairie", "None" |
| **S:T**| GRID PATTERN | `Opening.gridPattern` | String | Merged column: e.g. "6x6", "4x4" |
| **U:W**| OBSCURE | `Opening.obscureGlass` | String | Merged column: "none", "full", "half" |
| **X** | TEMPERED | `Opening.temperedGlass` | String | Safety glazing check: "none", "full", "half" |
| **Y** | NAIL FIN NO J | `Opening.nailFin` | Boolean | standard nail fin |
| **Z** | NAIL FIN W/ J | `Opening.nailFin` | Boolean | nail fin with J-channel |
| **AA**| FULL SCREEN | `Opening.screenOption` | String | screen type selection |
| **AB**| ORIEL DIM | `Opening.orielUpperSashHeight` | Float | oriel height measurement |
| **AC**| HDR/FLASH | `Opening.headerRequired` | Boolean | header flashing indicator |
| **AD**| FOAM EXP | `Opening.foamEnhanced` | Boolean | foam expansion wrap upcharge |
| **AF**| TYPE EXT | `Opening.exteriorType` | String | siding type: "BRICK", "ALUM", "WOOD", etc. |
| **AG**| TYPE TRIM | `Opening.trimType` | String | e.g. "VINYL", "CAP", "F&T" |
| **AH**| TYPE REMOVED | `Opening.removalType` | String | e.g. "ALUM", "WOOD", "STORM" |
| **AK**| TYPE INSTALL | `Opening.installType` | String | e.g. "IN" (Inside), "OUT" (Outside) |
| **AL**| SILL REPAIR | `Opening.sillRepair` | Boolean | indicates wood rot repair required |

---

## 4. Contract Pricing Summary

Pricing cells on the **Contract** tab are calculated via Excel formulas referencing cell counts, or filled programmatically from the `Appointment` totals.

| Excel Cell (Contract) | Description | Formula / Source | Database Value |
| :--- | :--- | :--- | :--- |
| **J15** | DH 4000 Total | `=IF(C15="","",C15*H15)` | Calculated in sheet |
| **J16** | DH 4000 FE Total | `=IF(C16="","",C16*H16)` | Calculated in sheet |
| **T73** | Total List Price | `=SUM(...)` of style totals | `Appointment.subtotal` |
| **T74** | Admin Fee | Static `$150.00` | `Appointment.adminFee` |
| **T75** | Sales Tax | Managed via `taxRate` | `Appointment.taxAmount` |
| **T76** | Total Amount | `=SUM(T73:T75, T80)` | `Appointment.totalAmount` |
| **T77** | Deposit 50% | `=0.5*JobAmount` | `Appointment.depositAmount` |
| **T78** | Balance Due | `=JobAmount-T77` | `Appointment.balanceDue` |
| **T79** | Amt Financed | Programmatic | `Appointment.financingAmount` |
| **T80** | St. Jude Donation | Programmatic | `Appointment.discount` (negative/positive) |

---

## 5. Named Ranges & Excel Bindings

The spreadsheet binds several formulas and calculations to defined **Named Ranges**:

* `JobAmount`: References `Contract!$T$76` (Total invoice amount, bound to financing tab).
* `ModelRange`: References `Order Form!$D$31:$D$54` (Used for model counts).
* `NumWinsRange`: References `Order Form!$C$31:$C$54` (Used for total window quantity calculations).
* `GlassOptionRange`: References `Order Form!$P$31:$P$54` (Used to auto-calculate SolarZone Low-E counts).

---

*Audit completed: 2026-06-10*  
*Auditor: Antigravity*
