# Production Database Baseline Guide

> **⚠️ WARNING**: Never run `prisma migrate reset`, `prisma db push --force-reset`,
> or any destructive command against a production database. Always backup first.

## Background

The WindowWorldAssistant production database was set up directly in Supabase
before Prisma Migrate was adopted. The schema is correct and fully functional,
but the database lacks a `_prisma_migrations` table — the table Prisma uses to
track which migrations have been applied.

Without this table, `prisma migrate deploy` fails with **Error P3005**:
> "The database schema is not empty."

The production startup script (`server/scripts/production-start.cjs`) handles
this gracefully: it checks for `_prisma_migrations` and skips migration commands
if the table doesn't exist, allowing the app to boot normally.

## How to Baseline

Baselining tells Prisma "all existing migrations are already applied" without
actually running them. Do this once, then future `prisma migrate deploy` calls
will work.

### Prerequisites

1. **Backup the production database first.**
2. Confirm the existing schema matches the Prisma schema:
   ```bash
   # From local dev machine with DATABASE_URL pointing to production (read-only check):
   npx prisma db pull --schema=server/prisma/schema.prisma
   git diff server/prisma/schema.prisma
   # If diff is empty or trivial → schema matches.
   ```

### Step 1: Inspect existing migration state

```bash
# Check if _prisma_migrations table exists
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations LIMIT 5;"
```

If you get "relation does not exist", proceed to Step 2.

### Step 2: Create the migrations table and mark all migrations as applied

```bash
# This creates the _prisma_migrations table and marks ALL existing migrations
# as "already applied" without running their SQL:
cd server

# Mark each migration as applied (in chronological order):
npx prisma migrate resolve --applied 20260513030626_init
npx prisma migrate resolve --applied 20260513031257_voice_pricing_forms
npx prisma migrate resolve --applied 20260513053202_sketch_drawing_system
npx prisma migrate resolve --applied 20260513053222_enable_rls
npx prisma migrate resolve --applied 20260513053500_enable_rls
npx prisma migrate resolve --applied 20260513200000_mobile_field_app
npx prisma migrate resolve --applied 20260513201000_mobile_rls
npx prisma migrate resolve --applied 20260513202500_sales_rep_assistant
npx prisma migrate resolve --applied 20260515_field_intelligence_m1_m5
npx prisma migrate resolve --applied 20260515_field_intelligence_m6_m10
npx prisma migrate resolve --applied 20260515_field_intelligence_m11_m19
npx prisma migrate resolve --applied 20260521_ai_credits
npx prisma migrate resolve --applied 20260521_astari_integration
npx prisma migrate resolve --applied 20260521_company_model
npx prisma migrate resolve --applied 20260521_company_rls
npx prisma migrate resolve --applied 20260521_production_backfill
npx prisma migrate resolve --applied 20260521_production_rls_final
npx prisma migrate resolve --applied 20260521_production_schema_final
npx prisma migrate resolve --applied 20260521_production_storage
npx prisma migrate resolve --applied 20260521_sketch_prevent_duplicates
npx prisma migrate resolve --applied 20260522_commission_catalog_item
npx prisma migrate resolve --applied 20260522_finance_options_v2
npx prisma migrate resolve --applied 20260523000000_previsit_inspection_review
npx prisma migrate resolve --applied 20260523120000_property_research_refactor
npx prisma migrate resolve --applied 20260523120000_property_vision
npx prisma migrate resolve --applied 20260525220000_add_measurement_rule_companyid
npx prisma migrate resolve --applied 20260525230000_add_mobile_recording_fix_quality_score
npx prisma migrate resolve --applied 20260526000000_add_opening_number_to_line_items
npx prisma migrate resolve --applied 20260530000000_add_siding_special_shape_rules
npx prisma migrate resolve --applied 20260531_offline_sync_idempotency
```

### Step 3: Verify

```bash
npx prisma migrate status
```

Expected output: "Database schema is up to date!"

### Step 4: Test future migrations

After baselining, the production startup script will automatically run
`prisma migrate deploy` on each container boot, applying only new migrations.

## Commands that are NEVER safe on production

| Command | Danger |
|---------|--------|
| `prisma migrate reset` | **Drops all data** |
| `prisma migrate dev` | Interactive, creates new migration files |
| `prisma db push --force-reset` | **Drops all data** |
| `prisma db push` (without `--force-reset`) | Can fail with P3005 on non-empty DBs |
| `prisma db seed` (on production) | May duplicate seed data |

## Commands that ARE safe on production

| Command | Purpose |
|---------|---------|
| `prisma migrate deploy` | Applies pending migrations (after baseline) |
| `prisma migrate resolve --applied <name>` | Marks a migration as applied |
| `prisma migrate status` | Shows migration state (read-only) |
| `prisma generate` | Regenerates Prisma Client (build-time only) |
| `prisma db pull` | Introspects schema (read-only) |
