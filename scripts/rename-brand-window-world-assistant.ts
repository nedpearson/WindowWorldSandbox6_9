#!/usr/bin/env tsx
/**
 * scripts/rename-brand-window-world-assistant.ts
 *
 * Safe, idempotent brand migration script.
 * Renames FrameFlow -> Window World Assistant in stored database values.
 *
 * Usage:
 *   npx tsx scripts/rename-brand-window-world-assistant.ts          # dry run
 *   npx tsx scripts/rename-brand-window-world-assistant.ts --apply  # apply changes
 *
 * Rules:
 *   - Only updates visible brand text fields (name, displayName, description, bodyMarkdown, etc.)
 *   - Does NOT alter IDs, table names, foreign keys, auth IDs, user emails, or route paths
 *   - Does NOT overwrite unrelated customer data (customer names, appointment data, etc.)
 *   - Idempotent -- safe to run multiple times
 *   - Logs every change (or planned change in dry-run mode)
 *   - No secrets in this file; uses DATABASE_URL from environment
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

// ── Brand replacement map ─────────────────────────────────────────────────────
// Order matters: more specific strings first to avoid double-replacement.
const REPLACEMENTS: Array<[string, string]> = [
  ['FrameFlow AI',           'Window World Assistant'],
  ['FrameFlow',              'Window World Assistant'],
  ['Frameflow',              'Window World Assistant'],
  ['Frame Flow',             'Window World Assistant'],
  ['Fenstra',                'Window World Assistant'],
];

function applyReplacements(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  let result = text;
  for (const [from, to] of REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

function hasChanged(original: string | null | undefined, updated: string | null | undefined): boolean {
  return original !== updated;
}

let totalChecked = 0;
let totalChanged = 0;

function log(table: string, id: string, field: string, oldVal: string, newVal: string) {
  console.log(`[${APPLY ? 'APPLY' : 'DRY-RUN'}] ${table} id=${id} field=${field}`);
  console.log(`  Before: ${oldVal.substring(0, 120)}`);
  console.log(`  After:  ${newVal.substring(0, 120)}`);
  console.log('');
  totalChanged++;
}

// ── Company / Workspace ───────────────────────────────────────────────────────
async function migrateCompanies() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });

  for (const c of companies) {
    totalChecked++;
    const newName = applyReplacements(c.name);
    if (hasChanged(c.name, newName)) {
      log('Company', c.id, 'name', c.name!, newName!);
      if (APPLY) {
        await prisma.company.update({ where: { id: c.id }, data: { name: newName! } });
      }
    }
  }
}

// ── FieldManualArticle ────────────────────────────────────────────────────────
async function migrateManualArticles() {
  const articles = await prisma.fieldManualArticle.findMany({
    select: { id: true, slug: true, title: true, summary: true, bodyMarkdown: true },
  });

  for (const a of articles) {
    totalChecked++;
    const newTitle   = applyReplacements(a.title);
    const newSummary = applyReplacements(a.summary);
    const newBody    = applyReplacements(a.bodyMarkdown);

    const updateData: Record<string, string> = {};

    if (hasChanged(a.title, newTitle)) {
      log('FieldManualArticle', a.id, 'title', a.title!, newTitle!);
      updateData.title = newTitle!;
    }
    if (hasChanged(a.summary, newSummary)) {
      log('FieldManualArticle', a.id, 'summary', a.summary ?? '', newSummary ?? '');
      if (newSummary !== null && newSummary !== undefined) updateData.summary = newSummary;
    }
    if (hasChanged(a.bodyMarkdown, newBody)) {
      log('FieldManualArticle', a.id, 'bodyMarkdown', (a.bodyMarkdown ?? '').substring(0, 80), (newBody ?? '').substring(0, 80));
      if (newBody !== null && newBody !== undefined) updateData.bodyMarkdown = newBody;
    }

    if (APPLY && Object.keys(updateData).length > 0) {
      await prisma.fieldManualArticle.update({ where: { id: a.id }, data: updateData });
    }
  }
}

// ── TrainingPath ──────────────────────────────────────────────────────────────
async function migrateTrainingPaths() {
  const paths = await prisma.trainingPath.findMany({
    select: { id: true, title: true, description: true },
  });

  for (const p of paths) {
    totalChecked++;
    const newTitle = applyReplacements(p.title);
    const newDesc  = applyReplacements(p.description);
    const updateData: Record<string, string> = {};

    if (hasChanged(p.title, newTitle)) {
      log('TrainingPath', p.id, 'title', p.title!, newTitle!);
      updateData.title = newTitle!;
    }
    if (hasChanged(p.description, newDesc)) {
      log('TrainingPath', p.id, 'description', p.description ?? '', newDesc ?? '');
      if (newDesc !== null && newDesc !== undefined) updateData.description = newDesc;
    }

    if (APPLY && Object.keys(updateData).length > 0) {
      await prisma.trainingPath.update({ where: { id: p.id }, data: updateData });
    }
  }
}

// ── TrainingLesson ────────────────────────────────────────────────────────────
async function migrateTrainingLessons() {
  const lessons = await prisma.trainingLesson.findMany({
    select: { id: true, title: true, summary: true, bodyMarkdown: true },
  });

  for (const l of lessons) {
    totalChecked++;
    const newTitle   = applyReplacements(l.title);
    const newSummary = applyReplacements(l.summary);
    const newBody    = applyReplacements(l.bodyMarkdown);
    const updateData: Record<string, string> = {};

    if (hasChanged(l.title, newTitle)) {
      log('TrainingLesson', l.id, 'title', l.title!, newTitle!);
      updateData.title = newTitle!;
    }
    if (hasChanged(l.summary, newSummary)) {
      log('TrainingLesson', l.id, 'summary', l.summary ?? '', newSummary ?? '');
      if (newSummary !== null && newSummary !== undefined) updateData.summary = newSummary;
    }
    if (hasChanged(l.bodyMarkdown, newBody)) {
      log('TrainingLesson', l.id, 'bodyMarkdown', (l.bodyMarkdown ?? '').substring(0, 80), (newBody ?? '').substring(0, 80));
      if (newBody !== null && newBody !== undefined) updateData.bodyMarkdown = newBody;
    }

    if (APPLY && Object.keys(updateData).length > 0) {
      await prisma.trainingLesson.update({ where: { id: l.id }, data: updateData });
    }
  }
}

// ── FieldManualCategory ───────────────────────────────────────────────────────
async function migrateManualCategories() {
  const cats = await prisma.fieldManualCategory.findMany({
    select: { id: true, title: true, description: true },
  });

  for (const c of cats) {
    totalChecked++;
    const newTitle = applyReplacements(c.title);
    const newDesc  = applyReplacements(c.description);
    const updateData: Record<string, string> = {};

    if (hasChanged(c.title, newTitle)) {
      log('FieldManualCategory', c.id, 'title', c.title!, newTitle!);
      updateData.title = newTitle!;
    }
    if (hasChanged(c.description, newDesc)) {
      log('FieldManualCategory', c.id, 'description', c.description ?? '', newDesc ?? '');
      if (newDesc !== null && newDesc !== undefined) updateData.description = newDesc;
    }

    if (APPLY && Object.keys(updateData).length > 0) {
      await prisma.fieldManualCategory.update({ where: { id: c.id }, data: updateData });
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('=== Window World Assistant Brand Migration Script ===');
  console.log(`Mode: ${APPLY ? 'APPLY (changes will be written)' : 'DRY-RUN (no changes will be written)'}`);
  console.log('');

  if (!APPLY) {
    console.log('-- Run with --apply flag to write changes to the database.\n');
  }

  await migrateCompanies();
  await migrateManualCategories();
  await migrateManualArticles();
  await migrateTrainingPaths();
  await migrateTrainingLessons();

  console.log('=== Summary ===');
  console.log(`Records checked:  ${totalChecked}`);
  console.log(`Records changed:  ${totalChanged}`);
  if (!APPLY && totalChanged > 0) {
    console.log('-- Re-run with --apply to write these changes.');
  }
  if (totalChanged === 0) {
    console.log('No brand references found -- database is already up to date.');
  }
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
