import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[migrate] Creating FieldManual and Training tables...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FieldManualCategory" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "icon" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FieldManualCategory_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  FieldManualCategory OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FieldManualArticle" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "categoryId" TEXT,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "summary" TEXT,
      "bodyMarkdown" TEXT NOT NULL,
      "decisionGuideJson" JSONB,
      "doChooseJson" JSONB,
      "doNotChooseJson" JSONB,
      "requiredPhotosJson" JSONB,
      "requiredMeasurementsJson" JSONB,
      "chargeableOptionsJson" JSONB,
      "managerReviewFlagsJson" JSONB,
      "commonMistakesJson" JSONB,
      "installerNotesJson" JSONB,
      "contractNotesJson" JSONB,
      "relatedWindowTypesJson" JSONB,
      "relatedDoorTypesJson" JSONB,
      "relatedSidingTypesJson" JSONB,
      "tagsJson" JSONB,
      "videoAssetsJson" JSONB,
      "status" TEXT NOT NULL DEFAULT 'published',
      "version" INTEGER NOT NULL DEFAULT 1,
      "createdByUserId" TEXT,
      "approvedByUserId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FieldManualArticle_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  FieldManualArticle OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingAsset" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "sourceType" TEXT NOT NULL DEFAULT 'youtube',
      "sourceUrl" TEXT NOT NULL,
      "embedUrl" TEXT,
      "thumbnailUrl" TEXT,
      "channelName" TEXT,
      "attribution" TEXT,
      "copyrightNote" TEXT,
      "approvedForTraining" BOOLEAN NOT NULL DEFAULT false,
      "category" TEXT,
      "tagsJson" JSONB,
      "metadataJson" JSONB,
      "createdByUserId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingAsset_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  TrainingAsset OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingPath" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "slug" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "roleTarget" TEXT NOT NULL DEFAULT 'sales_rep',
      "required" BOOLEAN NOT NULL DEFAULT false,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "iconEmoji" TEXT,
      "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingPath_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  TrainingPath OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingLesson" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "trainingPathId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "summary" TEXT,
      "lessonType" TEXT NOT NULL,
      "bodyMarkdown" TEXT,
      "assetIdsJson" JSONB,
      "quizJson" JSONB,
      "scenarioJson" JSONB,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "passingScore" INTEGER NOT NULL DEFAULT 70,
      "durationMinutes" INTEGER NOT NULL DEFAULT 5,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingLesson_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TrainingLesson_trainingPathId_fkey" FOREIGN KEY ("trainingPathId") REFERENCES "TrainingPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  console.log('  TrainingLesson OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingProgress" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "userId" TEXT NOT NULL,
      "trainingPathId" TEXT NOT NULL,
      "lessonId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'not_started',
      "score" DOUBLE PRECISION,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "completedAt" TIMESTAMP(3),
      "metadataJson" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TrainingProgress_trainingPathId_fkey" FOREIGN KEY ("trainingPathId") REFERENCES "TrainingPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "TrainingProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TrainingLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log('  TrainingProgress OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingQuestionBank" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "lessonId" TEXT,
      "questionType" TEXT NOT NULL DEFAULT 'multiple_choice',
      "questionText" TEXT NOT NULL,
      "imageAssetId" TEXT,
      "videoAssetId" TEXT,
      "optionsJson" JSONB,
      "correctAnswerJson" JSONB,
      "explanationMarkdown" TEXT,
      "difficulty" TEXT NOT NULL DEFAULT 'medium',
      "tagsJson" JSONB,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrainingQuestionBank_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TrainingQuestionBank_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TrainingLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log('  TrainingQuestionBank OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ManagerTrainingReview" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "userId" TEXT NOT NULL,
      "reviewerUserId" TEXT,
      "trainingPathId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "notes" TEXT,
      "approvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ManagerTrainingReview_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ManagerTrainingReview_trainingPathId_fkey" FOREIGN KEY ("trainingPathId") REFERENCES "TrainingPath"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  console.log('  ManagerTrainingReview OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ContentSource" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "sourceName" TEXT NOT NULL,
      "sourceUrl" TEXT,
      "sourceType" TEXT NOT NULL DEFAULT 'website',
      "approved" BOOLEAN NOT NULL DEFAULT false,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  ContentSource OK');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ManualFeatureLink" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "companyId" TEXT,
      "featureKey" TEXT NOT NULL,
      "routePattern" TEXT,
      "componentKey" TEXT,
      "articleSlug" TEXT,
      "lessonId" TEXT,
      "validationRuleId" TEXT,
      "helpLabel" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ManualFeatureLink_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('  ManualFeatureLink OK');

  // Add indexes
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "FieldManualCategory_slug_companyId_key" ON "FieldManualCategory"("slug", "companyId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FieldManualCategory_companyId_idx" ON "FieldManualCategory"("companyId")`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "FieldManualArticle_slug_companyId_key" ON "FieldManualArticle"("slug", "companyId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FieldManualArticle_companyId_idx" ON "FieldManualArticle"("companyId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FieldManualArticle_categoryId_idx" ON "FieldManualArticle"("categoryId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FieldManualArticle_status_idx" ON "FieldManualArticle"("status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TrainingAsset_approvedForTraining_idx" ON "TrainingAsset"("approvedForTraining")`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPath_slug_companyId_key" ON "TrainingPath"("slug", "companyId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TrainingPath_companyId_idx" ON "TrainingPath"("companyId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TrainingLesson_trainingPathId_idx" ON "TrainingLesson"("trainingPathId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TrainingProgress_trainingPathId_idx" ON "TrainingProgress"("trainingPathId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TrainingProgress_userId_idx" ON "TrainingProgress"("userId")`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ManualFeatureLink_featureKey_companyId_key" ON "ManualFeatureLink"("featureKey", "companyId")`);
  console.log('  Indexes OK');

  // Add FK from FieldManualArticle to FieldManualCategory
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FieldManualArticle" ADD CONSTRAINT "FieldManualArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FieldManualCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
  } catch (e: any) {
    if (!e.message?.includes('already exists')) console.log('  FK note:', e.message);
  }
  console.log('  Foreign keys OK');

  console.log('[migrate] All 10 tables created successfully!');
}

main().catch(e => { console.error('[migrate] ERROR:', e); process.exit(1); }).finally(() => prisma.$disconnect());
