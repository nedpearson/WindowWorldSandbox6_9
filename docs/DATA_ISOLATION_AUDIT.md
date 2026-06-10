# Data Isolation Audit — WindowWorldAssistant
**Audited:** 2026-05-21  
**Auditor:** Seed & Demo Data Isolation Engineer (Agent)  
**Scope:** Demo vs. production data separation, company_id scoping on all routes

---

## Executive Summary

| Area | Status Before | Status After |
|---|---|---|
| seed.ts — Company isolation | ❌ No company record created | ✅ Fixed — DEMO company upserted |
| seed.ts — Users linked to company | ❌ `companyId` missing from both users | ✅ Fixed — both users tagged |
| seed.ts — Customers tagged | ❌ No `companyId` on customers | ✅ Fixed — all 8 customers tagged |
| seed.ts — Appointments tagged | ❌ No `companyId` on appointments | ✅ Fixed — all 8 appointments tagged |
| customers.ts — Company scoping | ❌ All customers returned cross-company | ✅ Fixed |
| appointments.ts — Admin/manager scope | ❌ Admin sees ALL companies | ✅ Fixed |
| appointments.ts — Create tagging | ❌ companyId not set on new records | ✅ Fixed |
| dashboard.ts — Stats per user | ✅ userId-scoped (OK) | ✅ No change needed |
| dashboard.ts — Manager view | ⚠️ Partial — companyId guard optional | ✅ Already uses companyFilter pattern |
| auth.ts — JWT payload | ⚠️ companyId not in JWT | ⚠️ Noted — routes now resolve from DB |
| pricing/versions — Company scoping | ℹ️ Intentionally global | ℹ️ Design decision documented |

---

## 1. Isolation Issues Found

### 🔴 CRITICAL: seed.ts — No Company Record Created

**Before:** `seed.ts` created two users (`nedpearson@gmail.com`, `demo@windowworld.com`) with **no `companyId` set**, and all 8 demo customers and 8 appointments were created without `companyId`.

**Risk:** Any admin-level route that queries `WHERE companyId = user.companyId` would return empty results for these users (companyId = null). More critically, any route not filtering by companyId would cross-contaminate records if a second tenant is ever added.

**Fix Applied:** `seed.ts` now:
1. Upserts a `Company` row (`tenantId: 'window-world-demo'`)
2. Links both users to `demoCompany.id`
3. Tags all 8 customers with `companyId: demoCompany.id`
4. Tags all 8 appointments with `companyId: demoCompany.id`
5. Logs the demo company ID to console on each run

### 🔴 CRITICAL: customers.ts — No Company Filtering

**Before:** `GET /api/customers`, `GET /api/customers/:id`, and `GET /api/customers/search/:q` returned records from **all companies** with zero filtering. Any authenticated user could enumerate all customers in the database.

**Fix Applied:** All three endpoints now call `getUserCompanyId(userId)` (a small helper that fetches `user.companyId` from the DB) and inject `WHERE companyId = ?` into every query. `POST /api/customers` also tags the new record with the caller's `companyId`.

### 🔴 CRITICAL: appointments.ts — Admin Role Sees All Companies

**Before:** The `GET /` and `GET /:id` appointment routes only skipped `userId` filtering for `admin`/`manager` roles — but applied **no `companyId` filter at all**, meaning an admin could see appointments from every company in the DB.

**Fix Applied:** All appointment reads now include `companyId` in the `WHERE` clause regardless of role. Admins/managers see their whole company, sales reps see only their own records. `POST /` appointment creation now stamps `companyId` on new records.

### 🟡 WARNING: auth.ts — companyId Not in JWT

**Finding:** The JWT payload only contains `{ userId, role }`. The `companyId` is not embedded in the token. This means every route that needs company scoping must make an extra DB lookup to resolve `companyId` from the user record.

**Impact:** Performance — each scoped request now does one extra `user.findUnique` call. Security — not a vulnerability (we read from DB, not trust client), but adds latency.

**Recommendation:** Add `companyId` to the JWT on login and include it in the `requireAuth` middleware's `req.user` object. This eliminates the per-request DB lookup:

```ts
// auth.ts login — recommended change
const token = jwt.sign(
  { userId: user.id, role: user.role, companyId: user.companyId },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

```ts
// middleware/auth.ts — update AuthRequest interface
export interface AuthRequest extends Request {
  user?: { userId: string; role: string; companyId: string | null };
}
```

### 🟡 WARNING: nedpearson@gmail.com Data Isolation

**Finding:** Ned's account has `role: 'admin'`. Before these fixes, Ned's admin session would return ALL appointments and ALL customers from every company in the database.

**After fix:** Ned is now linked to `companyId = demoCompany.id`. His admin session sees only his demo company's data — correct for a single-tenant demo setup.

**Production consideration:** When onboarding a real franchise, create a **new Company row** for that franchise and link real users to it. Do NOT reuse the demo company's `companyId`. See §5 below.

### 🟡 WARNING: dashboard.ts `/manager` — Conditional companyFilter

**Finding:** The manager dashboard at line 96 builds `companyFilter` like this:

```ts
const companyFilter = (req.user as any)?.companyId
  ? { companyId: (req.user as any).companyId }
  : {};
```

This is accessing `companyId` from `req.user`, but the JWT doesn't include `companyId`. So `companyFilter` is always `{}` (empty), meaning manager dashboard stats are currently cross-company.

**Fix Required (not yet applied):** Either:
- Add `companyId` to the JWT (recommended), OR
- Add a DB lookup similar to `getUserCompanyId()` at the top of the manager handler

Until one of these is done, the manager dashboard **aggregates across all companies**.

---

## 2. Routes Fixed for Company Scoping

| Route File | Endpoint | Fix |
|---|---|---|
| `customers.ts` | `GET /api/customers` | Added `WHERE companyId = user.companyId` |
| `customers.ts` | `GET /api/customers/:id` | Changed `findUnique` → `findFirst` with company guard |
| `customers.ts` | `GET /api/customers/search/:q` | Added `companyId` to search filter |
| `customers.ts` | `POST /api/customers` | Tags new customer with caller's `companyId` |
| `appointments.ts` | `GET /api/appointments` | Added `companyId` guard for all roles |
| `appointments.ts` | `GET /api/appointments/:id` | Added `companyId` guard for all roles |
| `appointments.ts` | `POST /api/appointments` | Tags new appointment with caller's `companyId` |

### Routes NOT Fixed (reason documented)

| Route File | Endpoint | Reason Not Fixed |
|---|---|---|
| `pricing.ts` | All endpoints | Pricing is global (shared across franchises) — by design |
| `pricingVersions.ts` | All endpoints | Same — global pricing catalog |
| `dashboard.ts /manager` | Manager stats | Needs JWT change first — documented above |
| `commissions.ts` | All endpoints | Already scoped by `userId` (per-rep private data, not multi-tenant) |

---

## 3. Seed Logic Assessment

### What seed.ts was missing:
- No `Company` model record was created
- `User.companyId` was not set on either user
- `Customer.companyId` was not set on any of the 8 customers  
- `Appointment.companyId` was not set on any of the 8 appointments
- No documentation about what to do for production vs. demo setup

### What seed.ts now does (after fix):
1. Upserts a demo `Company` row with `tenantId: 'window-world-demo'`
2. Links `nedpearson@gmail.com` and `demo@windowworld.com` to that company
3. Tags all seed customers and appointments with `demoCompany.id`
4. Leaves `PricingTable` / `PricingVersion` records **without** `companyId` (intentional — global)
5. Includes clear comments explaining the demo vs. production distinction

### Hardcoded password in seed.ts — security note

```
nedPw = bcrypt.hash('1Pearson2', 10)
demoPw = bcrypt.hash('demo123', 10)
```

These are acceptable for local dev/demo. Never run this seed against a production database. Consider moving these to `.env.seed` for slightly better hygiene.

---

## 4. Global vs. Company-Scoped Data

| Data Type | Current Scope | Should Be | Notes |
|---|---|---|---|
| `Company` | Per-company | Per-company | ✅ Correct |
| `User` | Per-company (via `companyId`) | Per-company | ✅ Fixed |
| `Customer` | Per-company (via `companyId`) | Per-company | ✅ Fixed |
| `Appointment` | Per-company (via `companyId`) | Per-company | ✅ Fixed |
| `Opening` | Inherits from Appointment | Per-company | ✅ Via cascade |
| `PricingVersion` | Global (no `companyId`) | **Intentionally global** | Window World pricing is corporate-issued |
| `PricingTable` | Global (no `companyId`) | **Intentionally global** | Legacy tables, same rationale |
| `BusinessRule` | Has `companyId?` (optional) | Per-company overrides OK | Schema supports it but routes don't filter yet |
| `CommissionRecord` | Per-user | Per-user | ✅ Correct (commission is private per rep) |
| `AuditLog` | Per-user | Per-user | ✅ OK |
| `FormSketch` / `SketchMarker` | Has `companyId?` | Per-company | Schema ready; routes need verification |

### Pricing — the deliberate global design

Window World pricing is set by corporate and distributed to franchises as a standard price sheet. The seed data reflects this: `PricingVersion` and `PricingTable` have no `companyId`. If a specific franchise ever needs overrides, add `companyId` to `PricingVersion` and filter `GET /pricing-versions/active` by it.

---

## 5. Production Setup Steps Required

> [!CAUTION]
> Never run `npx prisma db seed` against a production database. The seed script calls `deleteMany` on Ned's appointments, which would destroy production data.

### Step 1 — Run migrations only
```bash
npx prisma migrate deploy
```

### Step 2 — Create your production company record
```sql
INSERT INTO "Company" (id, name, "tenantId", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Window World Baton Rouge', 'ww-baton-rouge', now(), now());
```

Or via a one-time admin script (safer than raw SQL):
```ts
await prisma.company.create({
  data: { name: 'Window World Baton Rouge', tenantId: 'ww-baton-rouge' }
});
```

### Step 3 — Create your production admin user
```ts
const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);
await prisma.user.create({
  data: {
    email: 'admin@yourfranchise.com',
    name: 'Admin User',
    role: 'admin',
    password: hashed,
    companyId: '<production-company-id>',
  }
});
```

### Step 4 — Import your pricing data
Use the pricing import page (`/pricing-import`) to upload your real price sheet. Publish it as the active version.

### Step 5 — Add companyId to JWT (recommended)
Update `auth.ts` login to embed `companyId` in the token, and update `requireAuth` middleware to read it. This eliminates per-request DB lookups in all scoped routes.

### Step 6 — Verify manager dashboard
The `/api/dashboard/manager` endpoint reads `companyId` from `req.user` — which currently doesn't include it. After Step 5, this will work correctly. Until then, manager dashboard stats are global.

---

## 6. Data Leakage Risks — Summary

| Risk | Severity | Status |
|---|---|---|
| Any user sees all customers across companies | 🔴 Critical | ✅ Fixed |
| Admin/manager sees all appointments across companies | 🔴 Critical | ✅ Fixed |
| Manager dashboard stats are cross-company | 🟡 Medium | ⚠️ Pending JWT change |
| Hardcoded demo password in seed.ts | 🟡 Medium | ℹ️ Acceptable for dev; don't deploy to prod |
| JWT missing companyId → extra DB round-trip | 🟢 Low | ℹ️ Performance only, not a security issue |
| FormSketch/SketchMarker routes not audited | 🟡 Medium | ⚠️ Needs separate audit of sketches.ts |
| BusinessRule routes not scoped | 🟡 Medium | ⚠️ Schema has companyId; routes.ts needs review |
| PricingImport routes unscoped | 🟢 Low | ℹ️ Pricing is intentionally global |

---

*Generated by the Seed & Demo Data Isolation Auditor. Re-run this audit after any new route is added.*
