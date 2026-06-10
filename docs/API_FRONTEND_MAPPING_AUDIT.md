# API ↔ Frontend ↔ Prisma Schema Mapping Audit
**Generated:** 2025-05-21  
**Scope:** All API routes in `server/src/routes/`, all frontend types in `apps/web/src/types/`, all Prisma models in `server/prisma/schema.prisma`, plus `sketchSync.ts`, `MarkerDetailSheet.tsx`, and related components.

---

## Executive Summary

| Category | Count |
|---|---|
| Total mismatches found | **22** |
| Critical (runtime breaking) | **5** |
| Fixed in this pass | **7** |
| Remaining risks (need schema or manual review) | **10** |

---

## Mismatches Found

### 🔴 CRITICAL — Runtime Breaking

#### M-01: `SketchMarker` DB model missing grid + exterior fields
**File:** `server/prisma/schema.prisma` (lines 688–730)  
**File:** `apps/web/src/utils/sketchSync.ts` (lines 34–101)  
**File:** `server/src/routes/sketches.ts` (lines 59–87)

The `SketchMarker` DB model is missing the following fields that the frontend `SketchMarkerData` interface uses and `sketchSync.ts` writes/reads:

| Frontend Field | DB Status | Route Action |
|---|---|---|
| `gridPattern` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridProfile` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridVerticalCount` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridHorizontalCount` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridPlacement` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridNotes` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridConfirmed` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `sdlSize` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `isSDL` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `isGBG` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `gridRequiresAudit` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `exteriorSurface` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `exteriorConditionNotes` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `requiresTrimHeader` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `requiresSpecialHandling` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `copiedFromId` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `measurementConfirmed` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `safetyConfirmed` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `orielType` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `orielUpperSashHeight` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `orielMeasurementBasis` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `orielMeetingRailReference` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `orielConfirmed` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeOrientation` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeSpringlineHeight` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeRise` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeHighSide` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeLowSide` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeSlopeDirection` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `shapeAcrossFlats` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `widthTop` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `widthMiddle` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `widthBottom` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `heightLeft` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `heightCenter` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `heightRight` | ❌ Not in SketchMarker schema | Silently dropped on save |
| `pricingStatus` | ✅ Exists in schema | Sent in route ✅ |
| `markerSymbol` | ✅ Exists in schema | Sent in route ✅ |

**Root Cause:** The `SketchMarker` Prisma model was built with a minimal field set. Grid configuration, oriel details, shape dimensions, measurement multi-point, and surface details were designed for the `Opening` model only — but `sketchSync.ts` carries them on the marker object so the UI can edit them before creating the opening.

**Impact:** Every save of a marker loses grid config, oriel specs, shape details, exterior surface, measurement confirmed state. These fields must be re-entered on the opening record separately.

**Fix:** Requires a Prisma schema migration to add missing fields to `SketchMarker`. The route at `sketches.ts` also needs to be updated to persist them.  
**Status: Schema migration required (not auto-fixable without schema change)**

---

#### M-02: `sketches.ts` marker sync strips fields not in explicit mapping
**File:** `server/src/routes/sketches.ts` (lines 59–87)

The marker sync route uses an explicit field list for `createMany`. Any fields sent from the frontend that aren't in that explicit list are silently ignored. The explicit list includes only:  
`markerType, markerNumber, markerSymbol, markerLabel, windowType, shapeType, x, y, width, height, unitedInches, elevation, roomLocation, floorNumber, productType, specialtyType, ladderReq, removalType, installType, exteriorMaterial, notes, pricingStatus, linkedOrderRowNumber, validationStatus, groupId`

Missing from the explicit list (fields that exist in DB and are sent from frontend):
- None currently (the explicit list covers all current DB fields)

**However:** The route maps `m.windowType || m.productType` — but in the frontend `SketchMarkerData`, the field is always `windowType`. The `productType` fallback creates confusion but doesn't break current behavior.

**Status: ⚠️ Low risk, no immediate fix needed**

---

#### M-03: `validation.ts` references `appointment.houseMap?.sketchData` on appointments that no longer include `houseMap`
**File:** `server/src/routes/validation.ts` (line 94)

The validation route includes `houseMap` in its query but the primary appointments route (`GET /:id`) intentionally omits `houseMap` (line 72–73 of `appointments.ts` has comment "houseMap deprecated"). The validation route's `houseMap` include is safe but inconsistent:

```typescript
// validation.ts:18
houseMap: { include: { markers: true } },
// ...
// validation.ts:94
if (!appointment.houseMap?.sketchData) {
  issues.push({ field: 'sketch', severity: 'HIGH', message: 'No home sketch drawn' });
}
```

This means the validator checks the legacy `HouseMap.sketchData` field but the app now uses `FormSketch`. Appointments using the new `FormSketch` system will always trigger the "No home sketch drawn" warning even when they have a complete sketch.

**Status: 🟡 Functional bug — needs fix**  
**Fix:** The validation route should check for existence of a `FormSketch` record instead of `HouseMap.sketchData`.

---

#### M-04: `OpeningPhoto` frontend type has wrong fields
**File:** `apps/web/src/types/index.ts` (lines 134–140)  
**DB Model:** `OpeningPhoto` in schema (lines 239–271)

Frontend `OpeningPhoto` interface:
```typescript
interface OpeningPhoto {
  id: string;
  openingId: string;
  url: string;         // ❌ DOES NOT EXIST in DB - DB has originalUrl, annotatedUrl, thumbnailUrl
  caption?: string;    // ❌ DOES NOT EXIST in DB
  createdAt: string;
}
```

DB `OpeningPhoto` fields include: `originalUrl`, `annotatedUrl`, `thumbnailUrl`, `storagePath`, `photoType`, `analysisStatus`, `notes`, `confidence` — none of which match `url` or `caption`.

**Impact:** Any component reading `photo.url` will get `undefined`. Any component writing `caption` will send an unknown field that Prisma ignores.

**Status: 🔴 Critical field mismatch**  
**Fix applied in this pass ✅**

---

#### M-05: `batch-sync` opening route uses `id.startsWith('opening_')` heuristic
**File:** `server/src/routes/openings.ts` (line 164)

```typescript
if (id && id.length > 0 && id.startsWith('opening_')) {
```

Prisma generates IDs using `cuid()` which produces strings like `cljz...` — they never start with `opening_`. The frontend's `sketchSync.ts` creates local marker IDs like `marker_${Date.now()}_...`, not `opening_...`. This condition will **always be false**, meaning every sync will fall through to the `findFirst` lookup path. This isn't broken (the fallback works) but the guard condition is dead code.

**Status: ⚠️ Dead code / misleading heuristic. No data corruption.**

---

### 🟡 HIGH — Functional Issues

#### M-06: `Opening` frontend type missing schema fields
**File:** `apps/web/src/types/index.ts` (lines 78–131)  
**DB Model:** `Opening` (lines 148–237)

Fields in DB `Opening` not in frontend `Opening` type:

| Missing Frontend Field | DB Field Name | Impact |
|---|---|---|
| `gridProfile` | `gridProfile` | Grid info lost on reads |
| `gridVerticalCount` | `gridVerticalCount` | Grid info lost |
| `gridHorizontalCount` | `gridHorizontalCount` | Grid info lost |
| `gridPlacement` | `gridPlacement` | Grid info lost |
| `gridNotes` | `gridNotes` | Grid info lost |
| `gridConfirmed` | `gridConfirmed` | Grid audit lost |
| `sdlSize` | `sdlSize` | SDL spec lost |
| `isSDL` | `isSDL` | SDL flag lost |
| `isGBG` | `isGBG` | GBG flag lost |
| `gridRequiresAudit` | `gridRequiresAudit` | Audit flag lost |
| `orielType` | `orielType` | Oriel type lost |
| `orielUpperSashHeight` | `orielUpperSashHeight` | Critical oriel measurement lost |
| `orielMeasurementBasis` | `orielMeasurementBasis` | Oriel spec lost |
| `orielMeetingRailReference` | `orielMeetingRailReference` | Oriel spec lost |
| `orielConfirmed` | `orielConfirmed` | Oriel confirmation flag lost |
| `orielNotes` | `orielNotes` | Notes lost |
| `exteriorSurface` | `exteriorSurface` | Surface check fails |
| `exteriorConditionNotes` | `exteriorConditionNotes` | Condition lost |
| `requiresTrimHeader` | `requiresTrimHeader` | Install requirement lost |
| `requiresSpecialHandling` | `requiresSpecialHandling` | Install flag lost |
| `copiedFromOpeningId` | `copiedFromOpeningId` | Copy provenance lost |
| `measurementConfirmed` | `measurementConfirmed` | Validation state lost |
| `safetyConfirmed` | `safetyConfirmed` | Safety state lost |
| `shapeType` | `shapeType` | Shape info lost |
| `shapeOrientation` | `shapeOrientation` | Shape detail lost |
| `shapeSpringlineHeight` | `shapeSpringlineHeight` | Shape measurement lost |
| `shapeRise` | `shapeRise` | Shape measurement lost |
| `shapeHighSide` | `shapeHighSide` | Shape measurement lost |
| `shapeLowSide` | `shapeLowSide` | Shape measurement lost |
| `shapeSlopeDirection` | `shapeSlopeDirection` | Shape detail lost |
| `shapeAcrossFlats` | `shapeAcrossFlats` | Shape measurement lost |
| `companyId` | `companyId` | Multi-tenant isolation lost |

**Status: 🟡 Types out of sync, TypeScript won't catch runtime reads of these fields**  
**Fix applied in this pass ✅**

---

#### M-07: `sketchSync.ts` `createOpeningFromMarker` sends `gridPattern` but Opening `gridStyle` is the legacy field
**File:** `apps/web/src/utils/sketchSync.ts` (lines 267–335)

`createOpeningFromMarker` sends both `gridPattern` (new) and `gridStyle: 'None'` (legacy hardcoded). The validation route (`validation.ts:57`) checks `op.gridStyle` for "Missing grid selection" but never checks `op.gridPattern`. The `MarkerDetailSheet` updates both (`gridPattern: g, gridStyle: g`) on change, which is correct.

**DB has both fields:** `gridStyle` (legacy) and `gridPattern` (new). Both exist in `Opening` model. The dual-write in `MarkerDetailSheet` is correct. `createOpeningFromMarker` correctly sends `gridStyle: 'None'` default but the named `gridPattern` from the marker.

**Status: ✅ No bug — dual-write covers both fields**

---

#### M-08: `dashboard.ts` manager route reads `performance` relation with field `performanceScore` but accesses `perf?.manualCompletion` 
**File:** `server/src/routes/dashboard.ts` (line 214)

```typescript
manualCompletion: perf?.manualCompletionPct ?? 0,    // ✅ DB field: manualCompletionPct
trainingScenariosPassed: perf?.scenariosPassed ?? 0,  // ✅ DB field: scenariosPassed
```

These actually correctly map to the `RepPerformance` schema fields (lines 630–637). No bug.

**Status: ✅ Correct**

---

#### M-09: `commissions.ts` uses `CommissionRecord.paidAmount` but schema has decimal type
**File:** `server/src/routes/commissions.ts` (lines 493–501)

```typescript
paidAmount: totalPaid,      // number in JS, Decimal in DB
unpaidAmount: commAmt - totalPaid,  // number in JS, Decimal in DB
```

Prisma handles JS number → Decimal coercion, but reading it back gives a `Prisma.Decimal` object, not a JS number. The dashboard route wraps with `Number()` on read (line 84–85: `Number(r.commissionAmount || 0)`) which is correct. No runtime bug.

**Status: ✅ Handled correctly with Number() cast**

---

#### M-10: `validation.ts` checks `customer.preLead1978` correctly
**File:** `server/src/routes/validation.ts` (line 104)

DB field `Customer.preLead1978` matches frontend `Customer.preLead1978`. ✅

---

#### M-11: `mobile.ts` raw SQL queries may drift from schema
**File:** `server/src/routes/mobile.ts` (referenced in prior session)

The mobile route uses `prisma.$queryRaw`. Raw SQL is not validated against the Prisma schema. Any schema rename/migration could break raw queries silently.

**Status: ⚠️ Ongoing risk — requires manual review when schema changes**

---

#### M-12: `MarkerDetailSheet.tsx` writes `exteriorSurface` to both marker and opening but uses inconsistent key names
**File:** `apps/web/src/components/MarkerDetailSheet.tsx` (lines 388–395)

```typescript
// On change:
updateLocalMarker({ exteriorMaterial: val, exteriorSurface: val } as any);
updateLocalOpening({ exteriorType: val, exteriorSurface: val });
```

- `exteriorMaterial` → exists on `SketchMarker` DB model ✅
- `exteriorSurface` → does NOT exist on `SketchMarker` DB model ❌ (M-01 above)
- `exteriorType` → exists on `Opening` DB model ✅
- `exteriorSurface` → exists on `Opening` DB model ✅

The double-write to `exteriorSurface` on the marker is harmless since the field doesn't persist, but the validation in `sketchSync.ts` checks `marker.exteriorSurface || marker.exteriorMaterial` which works because `exteriorMaterial` does persist.

**Status: ✅ Functionally works due to dual-read in validation, but semantically impure**

---

#### M-13: `sketchSync.ts` `createOpeningFromMarker` sends unknown field `glassPackage`
**File:** `apps/web/src/utils/sketchSync.ts` (line 287)

`glassPackage: WW_OPENING_DEFAULTS.glassPackage || 'LEE'`

`Opening` DB model has `glassPackage` field (line 177). ✅ This is correct.

---

#### M-14: `HouseMapMarker` frontend field `floorLevel` vs DB field `floorLevel`
**File:** `apps/web/src/types/index.ts` (line 197)  
**DB:** `HouseMapMarker.floorLevel` (line 501)

Frontend and DB both use `floorLevel`. ✅ Match.

---

#### M-15: `Signature` frontend interface missing `createdAt`
**File:** `apps/web/src/types/index.ts` (lines 143–150)

DB `Signature` has `createdAt` field (line 455). Frontend interface omits it. Minor type incompleteness.

**Status: 🟡 Minor — won't cause runtime errors but TypeScript won't surface the field**

---

#### M-16: `SketchMarker` frontend type in `types/index.ts` missing fields vs `SketchMarkerData` in `sketchSync.ts`
**File:** `apps/web/src/types/index.ts` (lines 202–231)

The `SketchMarker` type in `types/index.ts` is used for API response reading. The `SketchMarkerData` in `sketchSync.ts` is the richer working type. The `types/index.ts` version is missing:
- `markerNumber` (optional, exists in both)
- All grid fields (not in DB, so correctly absent)
- All oriel/shape fields (not in DB, so correctly absent)

However `types/index.ts` includes `installComplexity` — this field does exist in `SketchMarker` DB model. ✅

**Status: ✅ `types/index.ts` correctly reflects the DB SketchMarker model**

---

#### M-17: `pricingVersions.ts` `MissingPricingRule.create` sends fields not matching DB model
**File:** `server/src/routes/pricingVersions.ts` (lines 318–320)

```typescript
for (const mr of missingRules) {
  await prisma.missingPricingRule.create({ data: mr });
}
```

`missingRules` items contain: `{ openingNumber, productCategory, seriesModel, unitedInches, description }`.

DB `MissingPricingRule` model fields (lines 358–368): `appointmentId?, openingId?, productCategory?, seriesModel?, unitedInches?, optionLabel?, description, resolved, createdAt`.

- `openingNumber` is NOT a field on `MissingPricingRule` → Prisma will throw an error if this unknown field is passed directly.

**Status: 🔴 Will throw Prisma runtime error if unknown fields are passed**  
**Fix applied in this pass ✅**

---

#### M-18: `commissions.ts` `PATCH /:id` passes `req.body` directly to `prisma.commissionRecord.update`
**File:** `server/src/routes/commissions.ts` (lines 435–438)

```typescript
const updated = await prisma.commissionRecord.update({
  where: { id: req.params.id },
  data: req.body,  // ← unvalidated, could include unknown fields
});
```

If the frontend sends any field not in `CommissionRecord`, Prisma throws. No whitelist/sanitization. This is a security/stability risk but not a schema mismatch per se.

**Status: ⚠️ Stability risk — no fix applied (requires validation layer)**

---

#### M-19: `validation.ts` `openingCompleteness` required fields list includes `exteriorSurface` but doesn't include new grid fields
**File:** `server/src/routes/validation.ts` (lines 119–136)

Required fields list: `['width', 'height', 'productCategory', 'seriesModel', 'interiorColor', 'exteriorColor', 'roomLocation', 'elevation', 'glassPackage', 'gridStyle', 'screenOption', 'removalType', 'exteriorSurface']`

- `gridStyle` is used (legacy) but not `gridPattern` (new)
- `gridProfile`, `gridVerticalCount`, `gridHorizontalCount` are checked in the issue generator but not in the completeness list
- This creates inconsistency: issues fire for missing grid detail, but completeness % doesn't penalize

**Status: ⚠️ Inconsistency — validation fires issues but completeness scoring ignores them**

---

#### M-20: `sketches.ts` syncs groups but `MarkerGroupData` uses `memberMarkerIds` array while DB uses `SketchMarkerGroupMember` junction table
**File:** `apps/web/src/utils/sketchSync.ts` (lines 103–112)

```typescript
export interface MarkerGroupData {
  id: string;
  sketchId: string;
  groupType: GroupType;
  groupNote: string;
  keepSeparateRows: boolean;
  needsReview: boolean;
  pricingReviewed: boolean;
  memberMarkerIds: string[];  // flat array
}
```

The API route correctly translates this to `SketchMarkerGroupMember` junction records. No mismatch in the route logic. The frontend type `MarkerGroupData` is a convenience wrapper, not a direct DB type.

**Status: ✅ Correctly handled in route**

---

#### M-21: `AppointmentTimelineEvent` route creates with `userId: userIdReq` ignoring `userId` from body
**File:** `server/src/routes/appointments.ts` (lines 115–122)

```typescript
const { eventType, title, description, userId } = req.body;
// ...
userId: userIdReq || null, // force the authenticated user ID
```

The `userId` destructured from `req.body` is unused (dead variable). The authenticated user ID is used correctly. No bug, but the dead variable is misleading.

**Status: ⚠️ Dead variable — not a data bug**

---

#### M-22: `wallet.ts` / `forms.ts` use `FormInstance` model correctly
**File:** `server/src/routes/forms.ts`

`FormInstance` model (`formType`, `status`, `formData`, `pdfUrl`) matches the route usage. ✅

---

## Fields Fixed

### FIX-01: `apps/web/src/types/index.ts` — `OpeningPhoto` type corrected
**Problem:** Frontend used `url` and `caption` fields that don't exist in DB.  
**Fix:** Updated to match actual DB fields (`originalUrl`, `annotatedUrl`, `thumbnailUrl`, `photoType`, `notes`, `analysisStatus`, `confidence`).

### FIX-02: `apps/web/src/types/index.ts` — `Opening` type extended with missing fields
**Problem:** 32 DB fields missing from frontend `Opening` type.  
**Fix:** Added all missing fields: grid fields, oriel fields, shape fields, exterior surface fields, copy/confirmation fields.

### FIX-03: `server/src/routes/pricingVersions.ts` — `MissingPricingRule.create` field sanitization
**Problem:** `openingNumber` key sent to Prisma which throws on unknown fields.  
**Fix:** Strip `openingNumber` before inserting, use `description` from missingRules object directly.

### FIX-04: `server/src/routes/validation.ts` — Sketch check updated for FormSketch
**Problem:** Validation checked legacy `HouseMap.sketchData` instead of `FormSketch`.  
**Fix:** Updated to check for a `FormSketch` record via separate DB query.

### FIX-05: `apps/web/src/types/index.ts` — `Signature` type gets `createdAt` field
**Problem:** `createdAt` missing from `Signature` frontend type.  
**Fix:** Added `createdAt` to `Signature` interface.

### FIX-06: `apps/web/src/types/index.ts` — `CommissionRecord` type extended
**Problem:** Several DB fields missing from the frontend `CommissionRecord` interface.  
**Fix:** Added `customerAddress`, `salesRepName`, `paidAmount`, `unpaidAmount`, `notes`, `isDeleted`.

### FIX-07: `apps/web/src/types/index.ts` — Added `SketchMarkerGroup` and `SketchMarkerLink` types
**Problem:** No frontend type for `SketchMarkerGroup` — used as `any[]` in some places.  
**Fix:** Added typed interfaces for both.

---

## Routes Fixed

### R-01: `server/src/routes/pricingVersions.ts` — `MissingPricingRule` create
**Line 319:** Stripped `openingNumber` from `mr` objects before passing to Prisma.

### R-02: `server/src/routes/validation.ts` — Sketch validation query  
**Line 11–19, 94:** Added `formSketches: true` to the Prisma include and updated the sketch check logic to also pass for appointments with a `FormSketch` record.

---

## Remaining Risks

### RISK-01: 🔴 `SketchMarker` DB model missing 35+ fields (M-01)
The most significant gap in the codebase. The entire grid configuration, oriel measurement, shape dimension, multi-point measurement, exterior surface, and copy-tracking data that the UI captures at the marker level is **never persisted to the database**. It flows correctly into the `Opening` record via `createOpeningFromMarker`, but if the user saves a marker without immediately creating an opening, all that configuration is lost on page reload.

**Required fix:** Schema migration to add fields to `SketchMarker`. Until then, the opening creation step must always immediately follow marker saving.

### RISK-02: 🟡 `mobile.ts` raw SQL queries (M-11)
All raw SQL queries bypass Prisma schema validation. These need manual review after any schema migration.

### RISK-03: 🟡 `PATCH /api/commissions/:id` unvalidated body passthrough (M-18)
Sending unknown fields to Prisma update will throw a runtime error. A whitelist of allowed fields should be added.

### RISK-04: 🟡 Completeness scoring vs. validation issue list inconsistency (M-19)
Grid detail issues fire but don't reduce completeness %. Could create confusion where an appointment shows "85% complete" but has BLOCKER issues.

### RISK-05: 🟡 `businessRule` model used via `(prisma as any).businessRule` in `rules.ts`
The `BusinessRule` model exists in the schema (lines 883–911), but the route accesses it via `(prisma as any).businessRule` suggesting a client regeneration issue. The actual Prisma model is `BusinessRule` (PascalCase) which maps to `prisma.businessRule` — this should work once the client is regenerated after the schema is updated.

### RISK-06: 🟡 `pricingVersions.ts` `calculate` route references `opening.openingNumber` in line items
Line 244: `openingNumber: opening.openingNumber` — this field is sent from the frontend in the request body, not from the DB. No schema dependency. Fine as-is.

### RISK-07: ⚠️ `sketches.ts` marker sync deletes and recreates all markers (no upsert)
Lines 55–87: Full delete-and-recreate means any server-side IDs are invalidated every sync. If the frontend holds stale marker IDs (e.g., for `SketchMarkerLink` joins), links will break. Consider moving to upsert-by-marker-number.

### RISK-08: ⚠️ `batch-sync` opening ID heuristic is dead code (M-05)
The `startsWith('opening_')` check is always false. This is harmless currently but could confuse future developers.

### RISK-09: ⚠️ `forms.ts` and `housemap.ts` routes not audited for completeness
These routes were not fully audited in this pass. They may have additional field mapping issues.

### RISK-10: ⚠️ `types/index.ts` HouseMap and HouseMapMarker types — legacy, low priority
The legacy `HouseMap` and `HouseMapMarker` types are correct against the DB schema. However, since `houseMap` is deprecated in favor of `FormSketch`, these types will eventually be deleted. No action needed now.

---

## Appendix: Schema ↔ Frontend Field Map

### `Appointment` Model
| DB Field | Frontend Type | Route Coverage |
|---|---|---|
| `id` | ✅ `id` | ✅ |
| `customerId` | ✅ `customerId` | ✅ |
| `userId` | ✅ `userId` | ✅ |
| `status` | ✅ `status` | ✅ |
| `appointmentDate` | ✅ `appointmentDate` | ✅ |
| `jobAddress` | ✅ `jobAddress` | ✅ |
| `jobCity` | ✅ `jobCity` | ✅ |
| `jobState` | ✅ `jobState` | ✅ |
| `jobZip` | ✅ `jobZip` | ✅ |
| `projectType` | ✅ `projectType` | ✅ |
| `completeJob` | ✅ `completeJob` | ✅ |
| `poNumber` | ✅ `poNumber` | ✅ |
| `accountNumber` | ✅ `accountNumber` | ✅ |
| `notes` | ✅ `notes` | ✅ |
| `estimatorNotes` | ✅ `estimatorNotes` | ✅ |
| `installerNotes` | ✅ `installerNotes` | ✅ |
| `officeNotes` | ✅ `officeNotes` | ✅ |
| `subtotal` | ✅ `subtotal` | ✅ |
| `taxRate` | ✅ `taxRate` | ✅ |
| `taxAmount` | ✅ `taxAmount` | ✅ |
| `adminFee` | ✅ `adminFee` | ✅ |
| `discount` | ✅ `discount` | ✅ |
| `totalAmount` | ✅ `totalAmount` | ✅ |
| `depositAmount` | ✅ `depositAmount` | ✅ |
| `balanceDue` | ✅ `balanceDue` | ✅ |
| `financingAmount` | ✅ `financingAmount` | ✅ |
| `pricingVersionId` | ✅ `pricingVersionId` | ✅ |
| `completionPct` | ✅ `completionPct` | ✅ |
| `lockedAt` | ✅ `lockedAt` | ✅ |
| `lockedReason` | ✅ `lockedReason` | ✅ |
| `companyId` | ❌ Not in frontend type | Used in queries only |

### `Customer` Model
All fields correctly mapped. ✅

### `Opening` Model — Post-Fix Status
All significant fields now in frontend type after FIX-02. ✅

### `SketchMarker` Model — Gap Summary
DB has 24 fields. Frontend `SketchMarkerData` has 60+ fields. The extra 35+ frontend fields are:
- **Not in DB** → Silently dropped on save (RISK-01)
- The mismatch is intentional in the sense that these fields DO persist to `Opening` via `createOpeningFromMarker`
- But they are NOT persisted on the marker itself, meaning they can't be recovered if the page is refreshed before an opening is created

---

*Audit completed: 2025-05-21*  
*Auditor: API/Frontend Mapping Subagent*
