# GitHub Repository Health Audit
**Project:** WindowWorldAssistant  
**Audited:** 2026-05-21 · Auditor: Automated GitHub Health Subagent  
**Branch:** `main`

---

## 1. Git Status

| State | Files |
|---|---|
| **Modified (unstaged)** | `apps/web/src/components/MeasurementPhotoCapture.tsx` |
| | `apps/web/src/components/VisualMeasurementAssistant.tsx` |
| | `server/prisma/schema.prisma` |
| | `server/src/routes/intelligence.ts` |
| | `server/src/routes/visualizer.ts` |
| **Untracked** | `server/scripts/fix-db.ts` |
| **Untracked** | `server/prisma/migrations/20260521_production_backfill/migration.sql` |

> ⚠️ **5 modified files** are unstaged. The production backfill migration (`20260521_production_backfill`) and `fix-db.ts` script are **not committed**.

**Diff summary (vs HEAD):**
```
 apps/web/src/components/MeasurementPhotoCapture.tsx   | 148 +++++++++++++++------
 apps/web/src/components/VisualMeasurementAssistant.tsx |  23 +++-
 server/prisma/schema.prisma                            |  35 ++++-
 server/src/routes/intelligence.ts                      |  83 ++++++++++++
 server/src/routes/visualizer.ts                        |  19 ++-
 5 files changed, 255 insertions(+), 53 deletions(-)
```

**Line-ending warnings (non-blocking):** Git reports LF→CRLF conversion warnings on all 5 modified files. Add a `.gitattributes` to enforce line endings.

---

## 2. Branch and Recent Commits

**Active branch:** `main` (up to date with `origin/main`)

### Local branches (non-main)
| Branch | Purpose |
|---|---|
| `subagent-API-Frontend-Mapping-Auditor-...` | Subagent work branch |
| `subagent-GitHub-Repository-Health-and-Secrets-Auditor-...` | This audit |
| `subagent-Supabase-RLS-Security-Engineer-...` | Subagent work branch |
| `subagent-Supabase-Schema-Builder-...` | Subagent work branch |

### Remote branches
- `origin/main`
- `origin/dependabot/npm_and_yarn/npm_and_yarn-2c80b9d731` ← **Dependabot update pending review**

### Recent commits (last 15)
```
9d2fa24 fix(sketch): permanently resolve sketch canvas duplicates and burn-in
f88278b fix: run prisma db push on docker startup to sync schema
da3e370 feat: Master production-readiness audit complete. Added Company isolation, hardened exports, refined Sketch workflow.
f78face fix(sketch): resolve marker race conditions and ensure delete buttons function properly
4a8d4a6 chore: purge Openings from UI and align with Sketch workflow
a684974 fix: code cleanup, sketch integration, and session clear fix
82326be fix: auto-purge orphaned database openings that no longer have a corresponding canvas marker
b713e35 fix: bypass pwa cache for appointments to fix stale data presentation
5b1689c fix: race condition where backend overwrites reconstructed openings before auto-sync
99acae3 fix: auto sync regenerated openings in the background without requiring user to hit save
8618e64 fix: sync sketch markers to state openings to prevent data loss on refresh
9322c59 fix: sync all sketch openings to the backend on save so canonical pricing engine can quote them
91952b0 fix: make marker detail sheet header sticky so close button remains visible when scrolling
a313ed5 fix: combine base drawing and overlay markers in immersive sketch to fix blank contract exports
967ff12 fix: resolve exceljs shared formula error during contract generation
```

---

## 3. Secrets Found

> ✅ **No production secrets found in source code.**

| Pattern Searched | Files Scanned | Result |
|---|---|---|
| `SUPABASE_SERVICE_ROLE` | `apps/**/*.ts(x)`, `server/**/*.ts` | ✅ None found |
| `sk-` (API key prefix) | `apps/**/*.ts(x)` | ⚠️ One match — **test fixture only** (not a real key) |
| `eyJhbGciOiJ` (hardcoded JWT) | `apps/**/*.ts(x)`, `server/**/*.ts` | ✅ None found |
| `<<<<<<` (merge conflicts) | `apps/**/*.ts(x)`, `server/**/*.ts` | ✅ None found |

**Test fixture false-positive:**
```
apps/web/src/utils/fixPrioritization.test.ts:56
  w('sk-1', { category: 'sketch' })
```
This is a test helper id prefix `sk-1`, not an OpenAI or Stripe API key. **Safe — no action required.**

> ⚠️ **Weak JWT fallback detected in server source:**
> ```ts
> server/src/middleware/auth.ts:4
>   const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
> server/src/routes/auth.ts:8
>   const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
> ```
> The fallback string `'dev-secret-change-me'` is safe only in local dev. In production, `JWT_SECRET` **must** be set as a Railway environment variable or the fallback will silently be used.

**`server/.env` tracked by git?** → `git ls-files server/.env` returned **empty** ✅ — the `.env` file is correctly NOT committed.

---

## 4. Conflict Markers

✅ **Zero conflict markers found** across all `.ts` and `.tsx` files in `apps/` and `server/`.

---

## 5. .gitignore Coverage

Current `.gitignore` (18 lines):
```
node_modules/
dist/
.env
.env.local
.env.*.local
*.db
*.db-journal
.DS_Store
*.log
.kilocode/
.vscode/
.idea/
Thumbs.db
*.tsbuildinfo
```

### Assessment

| Coverage | Status |
|---|---|
| `node_modules/` | ✅ Covered |
| `dist/` (build output) | ✅ Covered |
| `.env` and variants | ✅ Covered — `server/.env` is NOT committed |
| SQLite files (`*.db`) | ✅ Covered |
| IDE folders | ✅ Covered |

### Gaps / Recommendations

> ⚠️ **.env.example is missing** — There is no `.env.example` template file in the repo. This makes onboarding new developers difficult and leaves no documentation of required environment variables. **Create one immediately** (see Section 8).

Other recommended additions to `.gitignore`:
```gitignore
# Coverage reports
coverage/
*.lcov

# Temporary / scratch
*.tmp
*.bak
```

---

## 6. Railway / Deployment Config

### `railway.toml`
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### `Dockerfile` Summary
- **Multi-stage build** (5 stages): base → deps → prisma → frontend-build / server-build → production
- **Node 20 Alpine** runtime (matches `engines: { node: ">=20.0.0" }`)
- **Static env baked in:** `VITE_API_URL=/api` and `PORT=8080`
- **Startup command:** `cd server && npx prisma db push --accept-data-loss && node server/dist/index.js`

> 🚨 **`--accept-data-loss` flag on startup:** The Dockerfile CMD runs `prisma db push --accept-data-loss` on every container start. This flag allows destructive schema changes without prompting. For production, **consider using `prisma migrate deploy`** (which applies only tracked migration files) instead of `db push`. The `db push` approach is acceptable for rapid development but risky if schema changes are destructive.

> ℹ️ The Dockerfile does **not** `COPY server/.env` — environment variables must be injected at runtime by Railway. This is correct behavior.

---

## 7. TypeScript Typecheck

**Command:** `cd server && npx tsc --noEmit`  
**Exit code:** `1`  
**Errors:** **1 error**

```
src/routes/intelligence.ts(229,34): error TS6234:
  This expression is not callable because it is a 'get' accessor.
  Did you mean to use it without '()'?
  Type 'String' has no call signatures.
```

**Root cause — `intelligence.ts` line 229:**
```typescript
// ❌ WRONG — text is a property (getter), not a method
const resultText = response?.text?.();

// ✅ CORRECT
const resultText = response?.text;
```

> 🚨 **This is a build-breaking TypeScript error.** The Docker build step `npx tsc` in Stage 4 will fail, causing Railway deploys to fail. **Fix required before next deployment.**

**Frontend (apps/web):** No `typecheck` script found in root `package.json`. Vite build implicitly validates but does not run `tsc --noEmit`. Consider adding a `typecheck:web` script.

---

## 8. Required Environment Variables

### Server (Backend) — `server/.env`

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Required | Prisma pooled connection URL (Supabase) |
| `DIRECT_URL` | ✅ Required | Prisma direct connection (for migrations) |
| `JWT_SECRET` | ✅ Required | Falls back to `'dev-secret-change-me'` — MUST be set in prod |
| `NODE_ENV` | ✅ Required | Set to `production` — controls CORS, error verbosity |
| `PORT` | Optional | Default: `3001` dev / `8080` Docker |
| `GEMINI_API_KEY` | Optional* | Required for AI photo analysis & chat features |
| `GOOGLE_MAPS_API_KEY` | Optional* | Required for geocoding routes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional* | GCP service account JSON path for Vertex AI |
| `GOOGLE_PROJECT_ID` | Optional* | Required when using Vertex AI |

*Optional features will gracefully degrade if not set.

### Frontend (apps/web) — Build-time only

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Optional | Defaults to `/api` (baked into Dockerfile) |

> ⚠️ **Missing `.env.example`** — Create `server/.env.example` with all variables above (values redacted). This is essential for team onboarding and deployment documentation.

---

## 9. Uncommitted Files Inventory

### A. New Migration: `server/prisma/migrations/20260521_production_backfill/migration.sql`
- **Contents:** Production data backfill (idempotent). Fixes NULL defaults for `Opening`, `Appointment`, deduplicates `SketchMarker` and `SketchMarkerLink`.
- **Safety:** All statements are guarded with `WHERE ... IS NULL`, `IF EXISTS`, and ROW_NUMBER deduplication. Safe to run.
- **Status:** ⚠️ **NOT committed** — must be staged before deploy.

### B. New Script: `server/scripts/fix-db.ts`
- **Contents:** Prisma-based TypeScript duplicate-finder for `Opening`, `SketchMarker`, `SketchMarkerLink`.
- **Status:** ⚠️ **NOT committed** — needs decision: commit to repo as utility, or discard after migration achieves the same goal.

### C. Modified Files (unstaged)
All 5 modified files represent active feature work:
- `MeasurementPhotoCapture.tsx` — Photo capture improvements (+148/-53 lines)
- `VisualMeasurementAssistant.tsx` — Visual assistant updates
- `server/prisma/schema.prisma` — Schema additions (35 lines new)
- `server/src/routes/intelligence.ts` — AI analysis route additions (**contains TS error**)
- `server/src/routes/visualizer.ts` — Visualizer route updates

---

## 10. Release Checklist

Before committing unstaged changes and deploying:

- [ ] **Fix TypeScript error** in `server/src/routes/intelligence.ts:229`
  - Change: `response?.text?.()` → `response?.text`
- [ ] **Stage the production backfill migration:**
  ```bash
  git add server/prisma/migrations/20260521_production_backfill/
  ```
- [ ] **Decide on `fix-db.ts`** — commit it or remove it
  ```bash
  git add server/scripts/fix-db.ts  # if keeping
  ```
- [ ] **Review all 5 modified files** and commit when ready:
  ```bash
  git add apps/web/src/components/MeasurementPhotoCapture.tsx
  git add apps/web/src/components/VisualMeasurementAssistant.tsx
  git add server/prisma/schema.prisma
  git add server/src/routes/intelligence.ts
  git add server/src/routes/visualizer.ts
  git commit -m "feat: measurement photo capture, visual assistant, AI analysis routes, schema updates"
  ```
- [ ] **Create `server/.env.example`** with all env vars documented (redacted values)
- [ ] **Verify `JWT_SECRET`** is set in Railway environment variables (strong random ≥32 chars)
- [ ] **Review Dependabot PR** `origin/dependabot/npm_and_yarn/npm_and_yarn-2c80b9d731`
- [ ] **Consider replacing `prisma db push --accept-data-loss`** with `prisma migrate deploy` in Dockerfile CMD
- [ ] **Add `.gitattributes`** to normalize LF line endings across the repo
- [ ] Verify `/api/health` endpoint returns 200 after deploy

---

## 11. Rollback Plan

### Railway Deployment Rollback
1. In Railway dashboard → select the **WindowWorldAssistant** service
2. Click **Deployments** → find the last known-good deploy (by commit SHA)
3. Click **Redeploy** on that deployment to instantly revert

### Database Rollback

> 🚨 The project uses `prisma db push` (schema sync) rather than `prisma migrate deploy` (tracked migrations). This means **schema rollback requires manual SQL**.

**If a bad schema change reaches production:**
1. Connect to Supabase SQL editor
2. Revert the specific column/table changes manually
3. Update `schema.prisma` locally to match the reverted DB state
4. Run `npx prisma db pull` to regenerate the schema

**If the backfill migration causes issues:**
- All backfill `UPDATE` statements touch only NULL rows — non-destructive
- The deduplication `DELETE` statements **remove older duplicate rows** — **not reversible** without a pre-migration backup
- **Recommend:** Take a Supabase database backup before running the backfill migration in production

### Git Rollback
```bash
# Safe revert (creates new commit)
git revert HEAD
git push origin main

# Hard reset (destructive — coordinate with team)
git reset --hard <last-good-sha>
git push --force-with-lease origin main
```

---

*Audit complete. No secrets found in source. One TypeScript error blocks production build. One new migration and one utility script are untracked and need to be committed.*
