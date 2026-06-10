# Reference Documents Setup Guide

## Overview
The WindowWorldAssistant integrates four critical business documents into the sales workflow:

| Document | Type | Required | Applies When |
|----------|------|----------|--------------|
| Window Warranty (AM-WWi-239) | Warranty | Always | All appointments |
| All-Inclusive Lifetime Warranty | Warranty | Always | All appointments |
| Lead-Based Paint Disclosure | Compliance | Conditional | Pre-1978 homes |
| Finance Options | Finance | Conditional | Customer financing |

## File Locations
Place documents in the project `reference-documents/` folder:

```
C:\dev\github\business\WindowWorldAssistant\reference-documents\
├── AM-WWi-239_Window Warranty Rev 08.24 (1).pdf
├── Finance Options.xlsx
├── Lead Base Paint Disclosure.pdf
└── WW All Inclusive Lifetime Warranty.pdf
```

## Workflow Integration

### 1. Pricing Review (Step 5)
- **Finance Options Panel** shows all 4 financing plans
- Monthly payment calculated live from job total
- Plans: 15mo free, 18mo free, 60mo@7.99%, 120mo@9.99%
- Sales rep selects which plan to present

### 2. Contract Review (Step 7)
- **Warranty Panel** shows coverage summary, exclusions, and coverage start date
- Glass breakage warranty status highlighted (selected vs not)
- PDF viewer buttons for both warranty documents
- Acknowledgment: "Warranty reviewed with customer"
- **Lead Disclosure Panel** appears when home is pre-1978 or unknown
- Federal law requirement banner
- PDF viewer button
- 3-step acknowledgment checklist (provided, reviewed, acknowledged)

### 3. Export / Final Packet (Step 9)
- **Document Checklist** shows required vs included documents
- Blockers prevent export (e.g. lead disclosure not acknowledged)
- Packet contents summary
- Excel workbook download (primary export)

## Lead-Based Paint Disclosure Logic

```
IF home_built_before_1978 = "yes" OR "unknown" THEN
  → Lead disclosure REQUIRED
  → Must be provided/reviewed/acknowledged before export
  → PDF auto-included in customer packet
ELSE
  → Lead disclosure NOT REQUIRED
  → Not included in packet
```

**Export is blocked if:**
- Home is pre-1978 or unknown
- AND customer has NOT acknowledged the lead disclosure

## Finance Plans (from workbook)

| Plan | Term | APR | Formula | Min Amount |
|------|------|-----|---------|------------|
| 15 Months Interest Free | 15 mo | 0% | ROUNDUP(total/15) | — |
| 18 Months Interest Free | 18 mo | 0% | ROUNDUP(total/18) | — |
| 7.99% Fixed | 60 mo | 7.99% | ROUNDUP(total×0.020406) | — |
| 9.99% Fixed | 120 mo | 9.99% | ROUNDUP(total×0.013252) | $10,000 |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents/list` | List all reference documents |
| GET | `/api/documents/view/:key` | View document inline (PDF) |
| GET | `/api/documents/download/:key` | Download document file |

Document keys: `window_warranty`, `lifetime_warranty`, `lead_paint_disclosure`, `finance_options`

## Database Tables

| Table | Purpose |
|-------|---------|
| `ReferenceDocument` | Document registry |
| `DocumentAcknowledgment` | Per-appointment acknowledgments |
| `LeadDisclosureReview` | Lead paint disclosure tracking |
| `FinanceOption` | Finance plan definitions |
| `AppointmentFinanceSelection` | Selected finance plan per appointment |
| `CustomerDocumentPacket` | Assembled customer packet tracking |
| `DocumentExportLog` | Export audit trail |

## Deployment Notes

- Documents are served from the `reference-documents/` folder relative to the server
- In production (Docker/Railway), ensure the folder is copied into the container
- Add to Dockerfile if needed: `COPY reference-documents/ ./reference-documents/`
- Documents are never publicly accessible — requires authentication token
