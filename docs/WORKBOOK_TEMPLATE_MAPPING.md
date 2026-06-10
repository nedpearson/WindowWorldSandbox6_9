# Workbook Template Mapping — BTR Window Contract

## Source File
`BTR Window Contract1 -.xlsx` → stored at `server/templates/BTR_Window_Contract_Template.xlsx`

## Workbook Structure

| Sheet | Rows | Cols | Merged Ranges | Print Area | Orientation |
|-------|------|------|---------------|------------|-------------|
| Contract | 113 | 27 | 76 | Full sheet | Landscape |
| Order Form | 171 | 49 | 114 | B2:AL60 | Landscape |
| Window World Financing | 23 | 9 | 13 | — | — |
| Contractors License | 0 | 0 | 0 | — (embedded image) | — |
| COI | 0 | 0 | 0 | — (embedded image) | — |

---

## Contract Tab — Mapped Fields

### Customer Info (Rows 9-11)
| Cell | Merge | Field | Source |
|------|-------|-------|--------|
| F9 | F9:H9 | Customer Name | customer.firstName + lastName |
| J9 | — | Email | customer.email |
| F10 | F10:H10 | Address | customer.address |
| K10 | K10:N10 | Customer ID # | customer.id |
| S10 | — | Primary Phone | customer.phone |
| F11 | — | City | customer.city |
| H11 | — | State | customer.state (default: LA) |
| L11 | — | Zip Code | customer.zip |
| S11 | — | Secondary Phone | customer.phoneSecondary |
| Q8 | — | Complete Job? | Y/N |
| W8 | — | Remaining Windows | number |

### Product Counts — Double Hung (Rows 15-16)
| Cell | Field | Formula |
|------|-------|---------|
| C15 | DH 4000 QTY | Auto-counted from openings |
| H15 | DH 4000 Price | 385 (from pricing) |
| J15 | DH 4000 Total | `=IF(C15="","",C15*H15)` |
| C16 | DH 4000 FE QTY | Auto-counted |
| H16 | DH 4000 FE Price | 410 |
| J16 | DH 4000 FE Total | `=IF(C16="","",C16*H16)` |

### Other Styles (Rows 20-27)
| Cell | Field | Model# | Price |
|------|-------|--------|-------|
| C20 | Picture Window | 3004 | 449 |
| C21 | 2 Lite Slider | 3002 | 449 |
| C22 | 3 Lite Slider | 3003 | 610 |
| C23 | Casement/Awning | — | 529 |
| C24 | Double Casement | — | 1018 |
| C25 | Foam Enhanced Upcharge | — | 25 |
| C26 | SH Shape W/ Sash | — | 619 |

### Specialty Windows (Rows 28-32)
| Cell | Field |
|------|-------|
| E29:G29 | Specialty 1 Description |
| C29, H29 | Specialty 1 QTY, Price |
| E30:G30 | Specialty 2 Description |
| E31:G31 | Specialty 3 Description |

### Options (Right side, Rows 13-30)
| Cell | Option | Price |
|------|--------|-------|
| M13 | Half Screen | Incl. |
| M14 | Full Screen | $22 |
| M16 | Argon Gas | $21 (Incl.) |
| M17 | Krypton Gas | $119 |
| M18 | Foam Insulation Wrap | $15 (Incl.) |
| M19 | Beige/Clay Color | $52 |
| M20 | Wood Grain | $90 |
| M21 | SolarZone Low-E | $90 |
| M22 | SolarZone Elite | $110 (Incl.) |
| M23 | Tempered Glass Sq Ft | $7/sq.ft |
| M24 | Obscure Glass | $30 |
| M25 | Glass Break Warranty | $39 (Incl.) |
| M26 | Nail Fin | $10 |
| M27 | Oriel/Cottage 60/40 | $36 |
| M28 | Flat/Contoured Grids | $45 |
| M29 | Exterior Color | $250 |

### Pricing Summary (Rows 73-80)
| Cell | Merge | Field | Formula |
|------|-------|-------|---------|
| T73 | T73:V73 | Total List Price | `=SUM(J15:J16,J20:J26,J28:J32,J43:J60,V14,V16:V30,V32:V34,V36:V39,V41:V60)` |
| T74 | T74:V74 | Admin Fee | $150 (static) |
| T75 | T75:V75 | Sales Tax (MS) | Manual |
| T76 | T76:V76 | Total Amount | `=SUM(T73:T75,T80)` |
| T77 | T77:V77 | Deposit 50% | `=0.5*JobAmount` |
| T78 | T78:V78 | Balance Due | `=JobAmount-T77` |
| T79 | — | Amt Financed | Manual |
| T80 | — | St. Jude | Manual |

### Signatures (Rows 84-89)
| Cell | Merge | Field |
|------|-------|-------|
| C84 | — | Employee # |
| D84 | D84:G84 | Estimator Name |
| H84 | — | Estimator Date (`=TODAY()`) |
| K84 | K84:S84 | Owner Signature 1 |
| T84 | T84:V84 | Owner Date 1 |

---

## Order Form Tab — Mapped Fields

### Header (Rows 9-19)
| Cell | Merge | Field | Formula |
|------|-------|-------|---------|
| S9:T9 | ✓ | PO# | Manual |
| AB9:AC9 | ✓ | Acct # | `=Contract!K10` |
| AH9 | — | Order Date | Manual |
| S13:AC13 | ✓ | Customer Name | `=Contract!F9` |
| AG13:AL13 | ✓ | Work Phone | Manual |
| AG14:AL14 | ✓ | Cell Phone | Manual |
| S15:AC15 | ✓ | Address | `=Contract!F10` |
| AD15:AI15 | ✓ | City | `=Contract!F11` |
| AK15:AL15 | ✓ | Zip | `=Contract!L11` |
| W18:AD18 | ✓ | Estimator Name | user.name |
| AG18:AL18 | ✓ | Estimator Phone | user.phone |

### Column Headers (Rows 23-24)
QTY | MODEL | VINYL COLOR | INT COLOR | EXT COLOR | WIDTH | x | HEIGHT | LEG HEIGHT | CUSTOM RADIUS | WINDOW# | HINGE | GLASS OPTION | FOAM ENHANCED | GRID STYLE | GRID PATTERN | OBSCURE | TEMPERED | NAIL FIN | FULL SCREEN | ORIEL DIM | HDR FLASH | FOAM EXP | TYPE EXT | TYPE TRIM | TYPE REMOVED | TYPE INSTALL | SILL REPAIR

### Opening Rows: **31-54** (24 slots)
| Column | Letter | Notes |
|--------|--------|-------|
| Row # | B | Pre-filled 1-24 |
| QTY | C | Usually 1 |
| MODEL | D | e.g. 3001, 3004, 0951 |
| VINYL COLOR | E | WH or BG |
| INT COLOR | F | LO, DO, CH |
| EXT COLOR | G | WH, FW, LO, DO, CH |
| WIDTH | H | inches |
| x | I | separator (static "x") |
| HEIGHT | J | inches |
| LEG HEIGHT | K | if applicable |
| CUSTOM RADIUS | L | if applicable |
| WINDOW # | N | Opening marker number |
| HINGE | O | L or R |
| GLASS OPTION | P | LE, LEE |
| FOAM ENHANCED | Q | Y |
| GRID STYLE | R | Colonial, Prairie, etc. |
| GRID PATTERN | S:T | merged, e.g. 2x2 |
| OBSCURE | U:W | merged, FULL or BSO |
| TEMPERED | X | FULL or BSO |
| NAIL FIN NO J | Y | Y |
| NAIL FIN W/ J | Z | Y |
| FULL SCREEN | AA | Y |
| ORIEL DIM | AB | dimension |
| HDR/FLASH | AC | Y (auto from formula) |
| FOAM EXP | AD | Y |
| TYPE EXT | AF | BRICK, ALUM, STUCCO, WOOD |
| TYPE TRIM | AG | VINYL, CAP, F&T |
| TYPE REMOVED | AH:AJ | merged, ALUM, STEEL, STORM, WOOD |
| TYPE INSTALL | AK | IN, OUT, EXT |
| SILL REPAIR | AL | Yes, No |

### Print Area
`B2:AL60` — landscape, 92% scale, fit to 1×1 page

---

## Formulas Detected

### Contract Tab
- Product totals: `=IF(C{row}="","",C{row}*H{row})`
- Option totals: `=IF(M{row}="","",M{row}*T{row})`
- Total List Price: `=SUM(J15:J16,J20:J26,J28:J32,J43:J60,V14,V16:V30,V32:V34,V36:V39,V41:V60)`
- Total Amount: `=SUM(T73:T75,T80)`
- Deposit: `=0.5*JobAmount`
- Balance: `=JobAmount-T77`
- Dates: `=TODAY()`

### Order Form Tab
- Customer info: `=Contract!F9`, `=Contract!F10`, `=Contract!F11`, `=Contract!L11`
- Glass option auto-fill: `=IF(D{row}="","",IF(LEFT(D{row},1)="M","",IF(SolarZoneLeeQty<>"","LEE",...)))`
- Vinyl color auto-fill: `=IF(D{row}="","",IF(LEFT(D{row},1)="M","",IF(BeigeColorQty>0,"BG","WH")))`
- Type defaults auto-fill from row above
- 70+ SUMIF model count formulas (rows 75-170)

---

## Named Ranges
- `JobAmount` — references T76 (Total Amount)
- `ModelRange`, `NumWinsRange` — opening row model/qty ranges
- `GlassOptionRange`, `GridStyleRange`, etc. — option ranges

---

## Manual Verification Required
1. **Patio Door rows** (Contract rows 43-60) — need full price mapping
2. **Additional Labor** (Contract right side rows 36-60) — need labor item mapping
3. **Named range definitions** — verify exact cell references
4. **Financing tab formulas** — `JobAmount` named range binding
5. **Embedded images** — Contractors License and COI tabs contain images, not cell data
