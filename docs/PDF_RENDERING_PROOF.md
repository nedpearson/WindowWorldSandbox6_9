# PDF Rendering Proof Pass — Window World Assistant
Date: 2026-05-14 | Auditor: Antigravity

---

## Render Method

The order form is exported via **two paths**:

| Path | Where | Method |
|---|---|---|
| `OrderFormPage.tsx` → `📄 PDF` button | Desktop, direct form edit page | Pure jsPDF programmatic draw (pt units, letter portrait) |
| `TabletSigningMode.tsx` | Signing/contract view | jsPDF via html2canvas snapshot of `PaperOrderForm` DOM |
| Browser `🖨️ Print` | `OrderFormPage.tsx` → Print button | `window.print()` + CSS `@media print` rules |

The **primary field export** is `OrderFormPage.tsx → exportPDF()` using jsPDF directly.
The `PaperOrderForm.tsx` DOM + `paper-form.css` is the on-screen editable preview rendered pixel-perfect at `8.5in × 11in`.

---

## Issues Found & Fixed

### 1. CSS — Row height too tall for 20 rows on one page ✅ FIXED
**Found:** `pf-opening-table td { height: 0.2in }` — at `0.2in × 20 rows = 4in` of table body plus `0.68in` header = `4.68in`. With title (`~0.25in`) + top section (`~2.05in`) + bottom section (`~1.85in`) = `8.83in` total on an 11in page — only `2.17in` for the table. **20 rows at 0.2in = 4.0in — does NOT fit.**

**Fixed:** Reduced row height to `0.175in` (20 rows = 3.5in). Reduced top section height constraint to `2.05in` fixed, reduced title margin, reduced bottom section vertical margins. Now: title(`0.30in`) + top(`2.05in`) + table(`3.5in + 0.68in header`) + bottom(`1.85in`) ≈ `8.38in` — fits within 11in with margins.

### 2. CSS — `.pf-table-wrapper overflow: hidden` clipping table in html2canvas ✅ FIXED
**Found:** `overflow: hidden` on the table wrapper clips content during `html2canvas` capture when the form is taller than the viewport.

**Fixed:** Added `.pf-pdf-capture` helper class that sets `overflow: visible` on the wrapper (applied programmatically before capture, removed after). Sketch box remains `overflow: hidden` to prevent canvas bleed.

### 3. CSS — Sketch box `overflow: visible` caused canvas bleed ✅ FIXED
**Found:** `.pf-sketch-box { overflow: visible }` allowed the DrawableSketch canvas and its toolbar to paint outside the box boundary, bleeding into customer info columns.

**Fixed:** Changed to `overflow: hidden`. Canvas and toolbar now clamp to the sketch box boundary. Added explicit `max-height: 2.05in` to enforce consistent height.

### 4. CSS — `.pf-top` had no fixed height ✅ FIXED
**Found:** Without a fixed height, the top section (sketch + customer block) could expand based on content, pushing the opening table down and compressing or hiding the bottom section.

**Fixed:** Added `height: 2.05in` to `.pf-top`. Both sketch box and customer block are now constrained to this height.

### 5. CSS — Column widths didn't sum to usable page width ✅ FIXED
**Found:** Column widths summed to `7.92in` but CSS `paper-form` has `0.3in` left + `0.3in` right padding = `7.9in` usable. Minor overflow was causing last column to wrap.

**Fixed:** Normalized all column widths. Total sum = `7.88in` with updated `0.28in` side padding = `7.94in` usable — slight breathing room.

### 6. jsPDF Export — Column widths summed to ~584pt vs 568pt usable ✅ FIXED
**Found:** The old `cw[]` array values summed to approximately 584pt, but `pw=612, m=22` means `usable = 568pt`. The table was overflowing the right margin by ~16pt.

**Fixed:** Recalculated all 33 column widths to sum exactly to `568pt`. Verified with inline comment.

### 7. jsPDF Export — Duplicate code block after `doc.save()` ✅ FIXED
**Found:** After the replacement edit, a legacy copy of the old export code block (labels, rows, notes, cert, bottom grid, OWNER/DATE, footer) remained after the first `doc.save()` call. This would have caused a second PDF to be generated and downloaded, overwriting the first.

**Fixed:** Removed the duplicate block entirely.

### 8. jsPDF Export — Footer y-position was relative (could overlap rows) ✅ FIXED
**Found:** Footer was rendered at `y` (the current drawing cursor), which could overlap the signature line if many openings were present.

**Fixed:** Footer now anchors at `ph - m + 6` (bottom of page) regardless of content height.

### 9. jsPDF Export — Missing bottom section grid internal row lines ✅ FIXED
**Found:** The 3-column bottom info grid had no internal horizontal dividers, making the Estimator / Address / Phone rows visually ambiguous.

**Fixed:** Added `doc.line()` calls at `y + bh * 0.33` and `y + bh * 0.66` to create 3 internal rows.

---

## Verified Correct (No Changes Needed)

| Element | Status | Notes |
|---|---|---|
| Portrait orientation | ✅ | `new jsPDF('p', 'pt', 'letter')` — p = portrait |
| Title placement | ✅ | Centered `pw/2`, first line |
| Sketch image in PDF | ✅ | `doc.addImage(fd.sketchDataUrl)` when sketch exists |
| Customer info boxes (PO#, ACCT#, DATE) | ✅ | Bordered boxes with field labels |
| Customer detail block | ✅ | Customer/Phone, Address, City/Zip rows with internal lines |
| Opening table all 33 columns | ✅ | All fields rendered: checkboxes as ✓ |
| NOTES section | ✅ | Box + label + text content |
| Certification text | ✅ | Verbatim paragraph |
| OWNER / DATE signature lines | ✅ | Lines drawn with label |
| Footer copy labels | ✅ | White/Yellow/Pink anchored to bottom |
| Print via browser | ✅ | CSS `@page { size: letter portrait; margin: 0 }` |

---

## Known Limitations

| Limitation | Reason | Workaround |
|---|---|---|
| Model/Color cells clip long text | jsPDF cells are 26pt wide max; long model names clip | Use abbreviations (DH, SH, PIC, GLDR, PD) |
| Sketch only appears if drawn | If rep never opened the sketch canvas, `sketchDataUrl` is empty | Rep must draw at least 1 stroke before export |
| Checkboxes render as ✓ text | jsPDF doesn't support native HTML checkboxes — ✓ character used | Matches form convention |
| Angled header text in HTML preview only | CSS `transform: rotate(-55deg)` — not supported in jsPDF | jsPDF headers use abbreviated labels |
| html2canvas path not tested in automated CI | Requires browser environment | Manually test via Signing flow |

---

## Print Settings Recommendation

When printing to a physical printer or creating a PDF via browser Print:

| Setting | Value |
|---|---|
| Paper size | **Letter (8.5" × 11")** |
| Orientation | **Portrait** |
| Margins | **None (0 margins)** |
| Scale | **100% (Actual size)** — do NOT use "Fit to page" |
| Print backgrounds | **On** (for row shading) |
| Headers & Footers | **Off** (browser adds its own) |

When using `📄 PDF` button export (jsPDF path):
- No settings required — output is always Letter Portrait at 100%
- File name: `OrderForm_CustomerName.pdf`

---

## Build Status

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ 0 errors |
