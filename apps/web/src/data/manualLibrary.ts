/**
 * manualLibrary.ts -- Master index
 * Re-exports all library chapters from Parts 1-6 as a single combined array.
 *
 * ENCODING: ASCII only. No emoji literals.
 */

import type { ManualChapter } from './manualContent';
import { manualLibraryPart1Chapters } from './manualLibraryPart1';
import { manualLibraryPart2Chapters } from './manualLibraryPart2';
import { manualLibraryPart3Chapters } from './manualLibraryPart3';
import { manualLibraryPart4Chapters } from './manualLibraryPart4';
import { manualLibraryPart5Chapters } from './manualLibraryPart5';
import { manualLibraryPart6Chapters } from './manualLibraryPart6';
import { manualLibraryLaserChapters } from './manualLibraryLaser';

export type { ManualChapter };
export { manualLibraryPart1Chapters };
export { manualLibraryPart2Chapters };
export { manualLibraryPart3Chapters };
export { manualLibraryPart4Chapters };
export { manualLibraryPart5Chapters };
export { manualLibraryPart6Chapters };

/**
 * All library chapters combined -- import this in ManualPage and expansionChapters.
 * Parts 1-2: Window types, Door types, Measuring rules, Glass, Exterior conditions, Contract/Sales
 * Part 3: Dashboard, Appointments, Quick Quote, Sketch, Field App, QR Sync, Pre-Visit
 * Part 4: Opening Wizard (window/door/siding), Opening Editor, Pricing, Validation
 * Part 5: Proposal, Order Form, Contract, Signing, Follow-Up, Finance, Commissions, Warranty
 * Part 6: Manager Dashboard, Office Queue, Pricing Admin, Rule Engine, Measurement Admin,
 *          Roles, Troubleshooting, Glossary
 */
export const allLibraryChapters: ManualChapter[] = [
  ...manualLibraryPart1Chapters,
  ...manualLibraryPart2Chapters,
  ...manualLibraryPart3Chapters,
  ...manualLibraryPart4Chapters,
  ...manualLibraryPart5Chapters,
  ...manualLibraryPart6Chapters,
  ...manualLibraryLaserChapters,
];

/**
 * Library categories derived from the chapters.
 */
export const libraryCategories: string[] = [
  ...new Set(allLibraryChapters.map((ch) => ch.category)),
];

/**
 * Flat tag index for search -- maps tag to chapter IDs.
 */
export function buildTagIndex(chapters: ManualChapter[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const ch of chapters) {
    for (const tag of ch.tags ?? []) {
      const lower = tag.toLowerCase();
      if (!index.has(lower)) index.set(lower, []);
      index.get(lower)!.push(ch.id);
    }
  }
  return index;
}
