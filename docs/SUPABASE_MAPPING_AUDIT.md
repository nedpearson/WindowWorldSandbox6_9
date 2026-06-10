# SUPABASE MAPPING AUDIT — Window World Assistant
Generated: 2026-05-14 | Auditor: Antigravity

---

## BUILD STATUS

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run build` (Vite) | ✅ 394 modules, 0 errors |
| `npx prisma validate` | ✅ Schema valid |

---

## PHASE 1 — ARCHITECTURE OVERVIEW

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript strict |
| Styling | Vanilla CSS |
| Backend | Express.js (port 3001) |
| ORM | Prisma → Supabase PostgreSQL |
| Auth | JWT in localStorage (`wwa_token`) |
| PDF | jsPDF + html2canvas (portrait layout) |
| Voice | Web Speech API (browser-native) |
| Sketch | HTML5 Canvas (`DrawableSketch`) |
| Pricing | `businessRules.ts` + `PricingVersion` |
| Measurement | `measurementRules.ts` (configurable) |

---

## PHASE 2 — TABLE STATUS

### Prisma-managed core tables (all verified ✅)
`User`, `Customer`, `Appointment`, `Opening`, `OpeningPhoto`, `QuoteLineItem`, `Contract`, `Signature`, `Payment`, `HouseMap`, `HouseMapMarker`, `PricingVersion`, `PricingVersionItem`, `PricingImport`, `PricingImportRow`, `MissingPricingRule`, `VoiceSession`, `VoiceTranscript`, `VoiceExtractedEntity`, `FormInstance`, `AuditLog`, `FormSketch`, `SketchLayer`, `SketchMarker`, `SketchMarkerLink`, `SketchMeasurementValidation`, `SketchPricingValidation`, `SketchAiInterpretation`, `SketchWarningFlag`, `SketchCompletenessScore`, `BusinessRule`, `BusinessRuleExecutionLog`, `AppointmentTimelineEvent`, `OpeningSafetyGlazingReview`, `TemperedGlazingFlag`, `AiValidationWarning`, `MeasurementRule`, `MeasurementAdjustment`, `MeasurementCapturePhoto`, `MeasurementPhotoRead`, `SpecialtyMeasurementSession`, `SpecialtyMeasurementValue`, `SpecialtyMeasurementValidation`

### Added by `master_supabase_migration.sql`
| Table | Purpose |
|---|---|
| `form_instance_values` | Per-field values with source tracking |
| `form_exports` | Export history, PDF URLs |
| `form_signatures` | QR-session and drawn signatures |
| `export_readiness_checks` | Gating results per category |
| `export_blockers` | Specific blocker messages |
| `mobile_sync_queue` | Offline-first sync queue |
| `mobile_offline_drafts` | Local drafts before sync |
| `opening_installation_notes` | Typed notes per opening |
| `ai_field_suggestions` | AI suggestions pending review |
| `voice_field_mappings` | Voice entities → specific fields |
| `pricing_overrides` | Manual price overrides with reason |
| `quote_health_checks` | Score snapshots |
| `measurement_rule_conditions` | Extended rule matching |
| `appointment_completion_checks` | Per-category completion |
| `rep_preferences` | Per-rep defaults |
| `customer_conversation_notes` | Objections, follow-up items |
| `sales_followups` | Post-appointment tasks |
| `field_sessions` | Mobile session analytics |
| `cross_device_sync_events` | Sync audit trail |

---

## PHASE 4 — RLS STATUS

| Policy | Status |
|---|---|
| Rep sees own appointments only | ✅ `user_owns_appointment()` helper |
| Admin override (`nedpearson@gmail.com`) | ✅ All policies |
| Office/manager read-all | ✅ role IN ('admin','manager','office') |
| Pricing publish — admin only | ✅ |
| Rule editing — admin only | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` server-only | ✅ Never in Vite env |
| All 20 new tables have RLS enabled | ✅ |

---

## PHASE 5 — ORDER FORM FIELD MAPPING

### Customer / Header
| Field | Mapped To | Status |
|---|---|---|
| PO # | `Appointment.poNumber` | ✅ |
| ACCT # | `Appointment.accountNumber` | ✅ |
| Order Date | `OrderFormData.orderDate` | ✅ |
| Customer Name | `Customer.firstName + lastName` | ✅ |
| Phone | `Customer.phone` | ✅ |
| Phone 2 | `Customer.phone2` | ✅ |
| Address | `Customer.address` | ✅ |
| City/State/ZIP | `Customer.city/state/zip` | ✅ |
| Estimator | `User.name` | ✅ |
| Sketch Box | `FormSketch.sketchData` → PNG | ✅ |

### Opening Row Fields (20 rows)
| Field | OpeningRow Key | Opening DB Field | Status |
|---|---|---|---|
| Qty | `qty` | `quantity` | ✅ |
| Model | `model` | `productModel` | ✅ |
| Vinyl/White Color | `vinylColor` | `seriesModel` | ✅ |
| Int Color | `intColor` | `interiorColor` | ✅ |
| Ext Color | `extColor` | `exteriorColor` | ✅ |
| Width | `width` | `width` Float | ✅ |
| Height | `height` | `height` Float | ✅ |
| Leg Height | `legHeight` | `legHeight` | ✅ |
| Custom Radius | `customRadius` | `customRadius` | ✅ |
| Window Number | `windowNumber` | `openingNumber` | ✅ |
| Hinge | `hinge` | `hinge` | ✅ |
| Glass Option | `glassOption` | `glassPackage` | ✅ |
| Foam Enhanced | `foamEnhanced` | `foamEnhanced` | ✅ |
| Grid Style | `gridStyle` | `gridStyle` | ✅ |
| Grid Pattern | `gridPattern` | `gridPattern` | ✅ |
| Obscure Full/Half | `typeFull/typeHalf` | `obscureGlass` | ✅ |
| Tempered Full/Half | `tempFull/tempS` | `temperedGlass` | ✅ |
| Nail Fin | `nailFin` | `nailFin` | ✅ |
| Full Screen | `fullScreen` | `screenOption` | ✅ |
| Oriel | `oriel` | `oriel` | ✅ |
| Horizontal R&R | `hor` | `horizontalRR` | ✅ |
| Type Exterior | `typeExt` | `exteriorType` | ✅ |
| Floor Number | `floor` | `floorNumber` | ✅ |
| Type Interior | `typeInt` | `trimType` | ✅ |
| Type Removed | `rmvInst` | `removalType` | ✅ |
| Type Install | `rmvInst` | `installType` | ✅ |
| Sill Repair | `sill` | `sillRepair` | ✅ |
| Notes | notes suffix | `customerNotes` | ✅ |

---

## PHASE 8 — BUSINESS RULES

| Rule | Auto-Apply | Log Table | Status |
|---|---|---|---|
| Default glass = LEE | ✅ | `BusinessRuleExecutionLog` | ✅ |
| Default Foam Enhanced | ✅ | `BusinessRuleExecutionLog` | ✅ |
| Default Type Removed = ALUM | ✅ | `BusinessRuleExecutionLog` | ✅ |
| Brick → EXT install | ✅ | `BusinessRuleExecutionLog` | ✅ |
| Siding/Wood → INT + trim warning | ⚠️ warn | `AiValidationWarning` | ✅ |
| Picture → no screen | ✅ | `BusinessRuleExecutionLog` | ✅ |
| Different color → mark-out warning | ⚠️ warn | `AiValidationWarning` | ✅ |
| Clear story → ladder + $225/$75 | ⚠️ + price | `QuoteLineItem` | ✅ |
| BSO → expand abbreviation | ✅ | inline note | ✅ |
| Oriel → top sash confirmation | 🔒 blocker | `MeasurementAdjustment` | ✅ |
| Tempered checkpoint per opening | ⚠️ review | `OpeningSafetyGlazingReview` | ✅ |
| Specialty → required dims/photos | 🔒 blocker | `SpecialtyMeasurementValidation` | ✅ |

---

## PHASE 14 — EXPORT GATES

Signoff in `MobileOrderFormPage` runs in order:
1. `checkExportReadiness(safetyReviews)` — safety glazing gate
2. `checkMeasurementExportReadiness(openings, adjustments)` — measurement gate

Both gates produce human-readable blocker messages shown via `alert()` before blocking contract generation.

---

## PHASE 16 — ENVIRONMENT VARIABLES

| Variable | Purpose | Status |
|---|---|---|
| `DATABASE_URL` | Prisma (server) | ✅ |
| `DIRECT_URL` | Migrations | ✅ |
| `SUPABASE_URL` | Server | ✅ |
| `SUPABASE_ANON_KEY` | Server | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Server ONLY | ✅ Never in frontend |
| `VITE_SUPABASE_URL` | Frontend | ✅ Added |
| `VITE_SUPABASE_ANON_KEY` | Frontend | ✅ Added |
| `JWT_SECRET` | Auth | ✅ |
| `GOOGLE_CLIENT_ID/SECRET` | Drive OAuth | ✅ |
| `GOOGLE_DRIVE_API_KEY` | Drive API | ✅ Added |
| `SPEECH_TO_TEXT_PROVIDER` | Voice | ✅ |
| `PDF_RENDER_MODE` | Export | ✅ |
| `APP_BASE_URL` | CORS | ✅ |
| `STORAGE_BUCKET_PHOTOS/EXPORTS/RECORDINGS/SKETCHES` | Storage | ✅ Added |

---

## ⚠️ NEEDS_VERIFICATION ITEMS

These must be confirmed with Window World before production use:

1. All measurement takeoff/deduction values in `measurementRules.ts`
2. Clear story pricing ($225 first / $75 additional)
3. Louisiana tempered glass flagging (advisory only — not legal advice)
4. Eyebrow/Quarter Arch/Custom specialty dimension sets
5. Patio door rough opening measurement protocol

---

## REMAINING MANUAL SETUP STEPS

1. Run `server/prisma/master_supabase_migration.sql` in Supabase SQL Editor
2. Run `safety_glazing_migration.sql` and `measurement_intelligence_migration.sql` if not already applied
3. Run `npx prisma migrate dev` to push Prisma schema to DB
4. Create 4 Supabase storage buckets: `wwa-opening-photos`, `wwa-form-exports`, `wwa-voice-recordings`, `wwa-sketches`
5. Copy `.env.example` → `.env` in both `server/` and `apps/web/`, fill in real values
6. Verify all `NEEDS_VERIFICATION` measurement rules with Window World
7. Replace `analyzeTapePhoto` simulation with real Gemini Vision API call when ready
