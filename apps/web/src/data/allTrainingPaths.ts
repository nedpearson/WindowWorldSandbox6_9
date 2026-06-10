/**
 * allTrainingPaths.ts
 * Aggregates all training paths from trainingExpansion (paths 1-10)
 * and trainingExpansionPart2 (paths 11-15).
 *
 * Import allTrainingPaths from HERE in ManualPage, not from trainingExpansion directly.
 *
 * ENCODING: ASCII only. No emoji literals.
 */

import { allTrainingPaths as basePaths } from './trainingExpansion';
import {
  quickEstimatePath,
  sketchPath,
  proposalContractPath,
  financeCommissionPath,
  adminPricingPath,
} from './trainingExpansionPart2';
import type { TrainingPath } from './trainingExpansion';

export type { TrainingPath };
export type { TrainingLesson, QuizQuestion, QuizOption } from './trainingExpansion';

/**
 * All 15 training paths combined.
 */
export const allTrainingPaths: TrainingPath[] = [
  ...basePaths,
  quickEstimatePath,
  sketchPath,
  proposalContractPath,
  financeCommissionPath,
  adminPricingPath,
];
