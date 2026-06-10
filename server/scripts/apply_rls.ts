// Run Supabase RLS + storage policy SQL via Prisma's raw connection
// Usage: node --loader ts-node/esm apply_rls.ts  OR  npx ts-node apply_rls.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyRLS() {
  console.log('🔒 Applying RLS policies to SketchExport and GeneratedDocument...\n');

  try {
    // 1. Enable RLS on SketchExport
    await prisma.$executeRawUnsafe(`ALTER TABLE public."SketchExport" ENABLE ROW LEVEL SECURITY`);
    console.log('✅ RLS enabled on SketchExport');

    // 2. Enable RLS on GeneratedDocument
    await prisma.$executeRawUnsafe(`ALTER TABLE public."GeneratedDocument" ENABLE ROW LEVEL SECURITY`);
    console.log('✅ RLS enabled on GeneratedDocument');

    // 3. SketchExport company-isolation policy
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'SketchExport'
            AND policyname = 'SketchExport: company isolation'
        ) THEN
          CREATE POLICY "SketchExport: company isolation"
          ON public."SketchExport"
          FOR ALL
          USING (
            "companyId" IN (
              SELECT "companyId" FROM public."User"
              WHERE id = auth.uid()::text
                AND "companyId" IS NOT NULL
            )
          )
          WITH CHECK (
            "companyId" IN (
              SELECT "companyId" FROM public."User"
              WHERE id = auth.uid()::text
                AND "companyId" IS NOT NULL
            )
          );
        END IF;
      END $$
    `);
    console.log('✅ SketchExport company-isolation policy created');

    // 4. GeneratedDocument company-isolation policy
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'GeneratedDocument'
            AND policyname = 'GeneratedDocument: company isolation'
        ) THEN
          CREATE POLICY "GeneratedDocument: company isolation"
          ON public."GeneratedDocument"
          FOR ALL
          USING (
            "companyId" IN (
              SELECT "companyId" FROM public."User"
              WHERE id = auth.uid()::text
                AND "companyId" IS NOT NULL
            )
          )
          WITH CHECK (
            "companyId" IN (
              SELECT "companyId" FROM public."User"
              WHERE id = auth.uid()::text
                AND "companyId" IS NOT NULL
            )
          );
        END IF;
      END $$
    `);
    console.log('✅ GeneratedDocument company-isolation policy created');

    // 5. Storage object policies for sketch-exports
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname = 'sketch-exports: authenticated read own company'
        ) THEN
          CREATE POLICY "sketch-exports: authenticated read own company"
          ON storage.objects FOR SELECT TO authenticated
          USING (
            bucket_id = 'sketch-exports'
            AND (storage.foldername(name))[1] = 'company'
            AND (storage.foldername(name))[2] IN (
              SELECT "companyId" FROM public."User"
              WHERE id = auth.uid()::text
            )
          );
        END IF;
      END $$
    `);
    console.log('✅ sketch-exports storage read policy created');

    // 6. Storage object policies for generated-documents
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname = 'generated-documents: authenticated read own company'
        ) THEN
          CREATE POLICY "generated-documents: authenticated read own company"
          ON storage.objects FOR SELECT TO authenticated
          USING (
            bucket_id = 'generated-documents'
            AND (storage.foldername(name))[1] = 'company'
            AND (storage.foldername(name))[2] IN (
              SELECT "companyId" FROM public."User"
              WHERE id = auth.uid()::text
            )
          );
        END IF;
      END $$
    `);
    console.log('✅ generated-documents storage read policy created');

    // 7. Verify
    console.log('\n🔍 Verifying policies...');
    const policies = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE tablename IN ('SketchExport', 'GeneratedDocument')
         OR (schemaname = 'storage' AND tablename = 'objects'
             AND (policyname LIKE '%sketch-exports%' OR policyname LIKE '%generated-documents%'))
      ORDER BY tablename, policyname
    `);
    console.log('\nActive policies:');
    for (const p of policies) {
      console.log(`  [${p.tablename}] ${p.policyname} (${p.cmd})`);
    }

    const rlsTables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('SketchExport', 'GeneratedDocument')
    `);
    console.log('\nRLS status:');
    for (const t of rlsTables) {
      console.log(`  [${t.tablename}] rowsecurity=${t.rowsecurity}`);
    }

    console.log('\n✅ ALL DONE — RLS applied successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyRLS();
