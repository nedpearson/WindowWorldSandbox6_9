-- ═══════════════════════════════════════════════════════════════
-- WINDOW WORLD ASSISTANT — COMPANY RLS MIGRATION
-- Updates the user_owns_appointment function to enforce company data isolation
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION user_owns_appointment(appt_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Appointment" a
    LEFT JOIN "User" u ON u.id = auth.uid()::text
    WHERE a.id = appt_id
    AND (
         a."userId" = auth.uid()::text
         OR auth.email() = 'nedpearson@gmail.com'
         OR (a."companyId" IS NOT NULL AND a."companyId" = u."companyId")
         OR (u.role IN ('admin','manager','office') AND (a."companyId" IS NULL OR a."companyId" = u."companyId"))
    )
  );
$$;
