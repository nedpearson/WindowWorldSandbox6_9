# 🔒 Architecture Lock — Window World Assistant

> **Status: LOCKED** — All future features must integrate into this architecture.
> Any deviation requires explicit justification documented in this file.

---

## 1. Canonical Workflow

```
Step 0: Customer        — capture customer name, phone, address, lead source
Step 1: Project         — job address, project type, account number, notes
Step 2: Sketch          — house diagram with architectural markers
Step 3: Openings        — per-opening measurements, product, options, install details
Step 4: Pricing         — pricing review, finance options, recalculate
Step 5: Proposal        — generate customer proposal with financing
Step 6: Order Review    — sketch-to-order preview + order form
Step 7: Sign & Contract — signing, warranty, lead disclosure, contract PDF
Step 8: Validation      — MissingInfoCheck, blocker/warning scan
Step 9: Submit          — final export, signature gate, document checklist
```

### Rules
- Steps are **sequential but non-blocking** — reps can jump to any step
- Every step has a **completion badge** computed by `StepCompletionBadge`
- The **validation bar** shows blockers globally at all times
- The **next-step nav** always shows previous/current/next

---

## 2. Canonical Routing Map

### Desktop (Layout sidebar)

| Route | Page | Owner | Role |
|-------|------|-------|------|
| `/` | DashboardPage | All | Sales overview |
| `/appointments` | AppointmentsPage | All | List/create appointments |
| `/appointments/:id` | AppointmentDetailPage | All | **PRIMARY WORKFLOW** (10 steps) |
| `/appointments/:id/walkthrough` | WalkthroughPage | All | Room-by-room assistant (feeds → Openings) |
| `/appointments/:id/sketch` | SketchFieldPage | All | Full-canvas sketch (feeds → FormSketch) |
| `/appointments/:id/lockdown` | FinalLockdownReview | All | Pre-export lockdown review |
| `/office` | OfficeQueuePage | All | Office review queue |
| `/commissions` | CommissionsPage | All | Commission tracking |
| `/profitability` | ProfitabilityPage | All | Profitability analysis |
| `/analytics` | AnalyticsPage | All | Analytics dashboard |
| `/proposals` | ProposalBuilderPage | All | Proposal builder |
| `/specialty` | SpecialtyBuilderPage | All | Specialty shape calculator |
| `/pricing` | PricingAdminPage | Admin | Pricing table admin |
| `/pricing-import` | PricingImportPage | Admin | CSV/PDF pricing import |
| `/rules` | RuleEngineAdminPage | Admin | Business rules CRUD |
| `/measurement-rules` | MeasurementRulesAdminPage | Admin | Measurement rules CRUD |

### Mobile (No sidebar)

| Route | Page | Tabs |
|-------|------|------|
| `/mobile` | MobileHomePage | Appointment list picker |
| `/mobile/field/:id` | MobileFieldPage | Home, Openings, Sketch, Pricing, Checklist, Review |
| `/mobile/order/:id` | MobileOrderFormPage | Landscape order form |

### Isolated

| Route | Page | Purpose |
|-------|------|---------|
| `/sign/:token` | SigningPage | Customer-facing signing (no nav) |

### Deprecated/Redirect

| Route | Status |
|-------|--------|
| `/forms` | → `/appointments` |
| `/forms/order/:id` | → `/appointments` |
| `/qa` | Dev-only, no sidebar link |

---

## 3. Canonical Data Flow

```mermaid
graph TD
    UI[Frontend Component] -->|api.createOpening()| API[Express API Route]
    API -->|prisma.opening.create()| DB[(PostgreSQL via Prisma)]
    DB -->|Response| API
    API -->|JSON| UI
    UI -->|Local-first| LS[Zustand localStorage]
    LS -->|Sync queue| API
```

### Data Authority

| Data Type | Authority | Storage |
|-----------|-----------|---------|
| Customers | Server (Prisma) | `customers` table |
| Appointments | Server (Prisma) | `appointments` table |
| Openings | Server (Prisma) | `openings` table |
| Pricing | Server (Prisma) | `pricing_version_items` table |
| Sketches | Server (Prisma) | `form_sketches` + `sketch_markers` |
| Contracts | Server (Prisma) | `contracts` table |
| Signatures | Server (Prisma) | `signatures` table |
| Voice Data | Server (Prisma) | `voice_sessions` + `voice_transcripts` |
| Offline Drafts | Client (Zustand) | `localStorage:wwa-mobile` |
| Auth Session | Client (Zustand) | `localStorage:wwa-auth` |
| Form Drafts | Client (Zustand) | `localStorage:wwa-drafts` |

### Flow Rule
> **Server is ALWAYS the source of truth for business data.**
> Client stores (Zustand) are ONLY for offline caching and sync queue management.
> No business logic should depend solely on client state.

---

## 4. Canonical State Ownership

### Zustand Stores

| Store | Key | Scope | Persisted |
|-------|---------|-------|-----------|
| `useAuthStore` | `wwa-auth` | Auth (user, token) | ✅ |
| `useDraftStore` | `wwa-drafts` | Generic KV drafts for form fields | ✅ |
| `useMobileStore` | `wwa-mobile` | Mobile-specific offline state | ✅ (partial) |

### `useMobileStore` Sections

| Section | Purpose | Syncs to Server? |
|---------|---------|-----------------|
| `recordings` | Voice recordings + extractions | Yes, via `/api/voice` |
| `notes` | Text notes + AI extractions | Yes, via `/api/mobile/notes` |
| `draftOpenings` | Offline opening drafts | Yes, via `/api/openings` |
| `syncQueue` | Pending server operations | N/A (queue metadata) |
| `conflicts` | Local vs server data conflicts | N/A (resolution UI) |
| `drafts` | Generic KV form drafts | No (local-only) |
| `photoQueue` | Pending photo uploads | Yes, via upload API |

### Rules
- **No new Zustand stores** without documenting in this table
- **No business calculations in stores** — calculations happen in server or utility functions
- **No duplicate state** — if data lives in Prisma, don't cache it in Zustand unless for offline support

---

## 5. Canonical Database Ownership

### Active Models (49 models in Prisma schema)

| Domain | Models | Owner API |
|--------|--------|-----------|
| **Core** | `User`, `Customer`, `Appointment` | `/api/auth`, `/api/customers`, `/api/appointments` |
| **Openings** | `Opening`, `OpeningPhoto` | `/api/openings` |
| **Pricing Engine** | `PricingVersion`, `PricingVersionItem`, `PricingImport`, `PricingImportRow`, `MissingPricingRule` | `/api/pricing-versions`, `/api/pricing` |
| **Quote/Line Items** | `QuoteLineItem` | `/api/appointments` (recalculate) |
| **Contract/Sign** | `Contract`, `Signature`, `Payment` | `/api/appointments`, `/api/exports` |
| **Sketch V2** | `FormSketch`, `SketchLayer`, `SketchMarker`, `SketchMarkerGroup`, `SketchMarkerGroupMember`, `SketchMarkerLink` | `/api/sketches` |
| **Sketch Validation** | `SketchMeasurementValidation`, `SketchPricingValidation`, `SketchAiInterpretation`, `SketchWarningFlag`, `SketchCompletenessScore`, `InstallerClarityScore` | `/api/sketches` |
| **Voice** | `VoiceSession`, `VoiceTranscript`, `VoiceExtractedEntity` | `/api/voice` |
| **Forms** | `FormInstance` | `/api/forms` |
| **Rules** | `BusinessRule`, `BusinessRuleExecutionLog`, `AiValidationWarning` | `/api/rules` |
| **Safety** | `OpeningSafetyGlazingReview`, `TemperedGlazingFlag` | `/api/validation` |
| **Measurement** | `MeasurementRule`, `MeasurementAdjustment`, `MeasurementCapturePhoto`, `MeasurementPhotoRead`, `MeasurementRuleExecutionLog` | `/api/measurement-rules` |
| **Specialty** | `SpecialtyMeasurementSession`, `SpecialtyMeasurementValue`, `SpecialtyMeasurementValidation` | `/api/openings` |
| **Commissions** | `WorkbookTemplate`, `CommissionImport`, `CommissionRecord` | `/api/commissions` |
| **Timeline** | `AppointmentTimelineEvent`, `AuditLog` | `/api/appointments/:id/timeline` |
| **Walkthrough** | Managed via `/api/walkthrough` | `/api/walkthrough` |

### Deprecated Models (DO NOT USE)

| Model | Replacement | Status |
|-------|-------------|--------|
| `HouseMap` | `FormSketch` | ⛔ Deprecated — route disabled, query removed |
| `HouseMapMarker` | `SketchMarker` | ⛔ Deprecated — no active reads/writes |
| `PricingTable` | `PricingVersion` | ⚠️ Legacy — PricingAdminPage still reads, migration pending |
| `PricingItem` | `PricingVersionItem` | ⚠️ Legacy — same migration path |

---

## 6. Canonical Calculation Ownership

| Calculation | Owner | Location | Consumers |
|-------------|-------|----------|-----------|
| United Inches | `calculateUI()` | `services/calculations.ts` | OpeningEditor, WalkthroughPage, SketchSync |
| Opening Total Price | Server `recalculate` | `/api/appointments/:id/recalculate` | PricingReview |
| Appointment Totals | Server `recalculate` | `/api/appointments/:id/recalculate` | PricingReview, Dashboard |
| Validation | `validateAppointment()` | `utils/validationEngine.ts` | StepCompletionBadge, MissingInfoCheck, AppointmentDetailPage |
| Opening Validation | `validateOpening()` | `utils/openingValidation.ts` | OpeningEditor, OpeningWizard |
| Pricing Lookup | `lookupPrice()` | `utils/pricingValidation.ts` | PricingReview |
| Business Rules | `evaluateRules()` | Server `/api/rules/evaluate` | OpeningEditor |
| Quality Score | Server `/api/mobile/quality-score` | MobileFieldPage | MobileFieldPage |

### Rules
- **One function per calculation** — no duplicate price calculators
- **Server owns totals** — client never independently calculates `totalAmount`
- **Validation is client-side** — `validationEngine.ts` is the single validator

---

## 7. Enforcement Rules for New Features

### Pre-Flight Checklist

Before adding any new feature, answer these questions:

> [!CAUTION]
> If any answer is YES to the red questions, the feature design must be revised.

| # | Question | Expected |
|---|----------|----------|
| 1 | Does this feature bypass the canonical 10-step workflow? | ❌ NO |
| 2 | Does this create a new Zustand store? | ❌ NO (extend existing) |
| 3 | Does this create a new way to create Openings? | ❌ NO (use `api.createOpening()`) |
| 4 | Does this create a new way to calculate pricing? | ❌ NO (use `/api/appointments/:id/recalculate`) |
| 5 | Does this create a new validation system? | ❌ NO (use `validationEngine.ts`) |
| 6 | Does this duplicate an existing route? | ❌ NO |
| 7 | Does this read from a deprecated model? | ❌ NO |
| 8 | Does the UI have a clear "where am I?" indicator? | ✅ YES |
| 9 | Does this integrate into an existing step? | ✅ YES |
| 10 | Is the data authority clearly server-side? | ✅ YES |

### Integration Rules

```
RULE 1: One Action = One Place
  Every major action (create, edit, delete, calculate) has ONE canonical
  entry point. Speed shortcuts may exist but MUST call the same underlying
  function.

RULE 2: Server = Truth
  Prisma/PostgreSQL is the authoritative data store. Zustand stores are
  ONLY for offline caching, sync queues, and UI state.

RULE 3: No Orphan Data
  Every record must connect to: Customer → Appointment → Opening.
  No standalone sketches, measurements, or pricing without an appointment.

RULE 4: No Shadow Workflows
  If a new screen adds "create opening" functionality, it MUST call
  api.createOpening() — not implement its own creation logic.

RULE 5: Step Integration
  New features must map to an existing workflow step (0-9).
  If a feature doesn't fit any step, it belongs in a modal or panel
  within the nearest step.

RULE 6: Mobile Parity
  Any feature added to desktop must have a mobile equivalent, or an
  explicit documented reason why mobile is excluded.
```

---

## 8. File Reference Index

| Purpose | File |
|---------|------|
| Route definitions | [App.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/App.tsx) |
| Desktop workflow | [AppointmentDetailPage.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/pages/AppointmentDetailPage.tsx) |
| Mobile workflow | [MobileFieldPage.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/pages/MobileFieldPage.tsx) |
| Auth store | [store/index.ts](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/store/index.ts) |
| Mobile store | [store/mobileStore.ts](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/store/mobileStore.ts) |
| Validation engine | [utils/validationEngine.ts](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/utils/validationEngine.ts) |
| API client | [utils/api.ts](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/utils/api.ts) |
| Server entry | [server/src/index.ts](file:///c:/dev/github/business/WindowWorldAssistant/server/src/index.ts) |
| Database schema | [server/prisma/schema.prisma](file:///c:/dev/github/business/WindowWorldAssistant/server/prisma/schema.prisma) |
| Sidebar/nav | [components/Layout.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/components/Layout.tsx) |
| Step completion | [components/StepCompletion.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/components/StepCompletion.tsx) |
| Opening creation | [components/OpeningEditor.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/components/OpeningEditor.tsx) |
| Sketch engine | [components/DrawableSketch.tsx](file:///c:/dev/github/business/WindowWorldAssistant/apps/web/src/components/DrawableSketch.tsx) |
