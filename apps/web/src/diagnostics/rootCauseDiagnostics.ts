import { collectDiagnostics } from './diagnosticCollectors';
import { RootCauseSummary, RootCauseCategory, DiagnosticReport } from './diagnosticTypes';

export async function analyzeRootCause(): Promise<{ report: DiagnosticReport; summary: RootCauseSummary }> {
  const report = await collectDiagnostics();
  let category: RootCauseCategory = 'UNKNOWN';
  let description = 'Unable to identify the root cause automatically.';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let recommendedFixId: string | undefined;

  // 1. Check API Failures
  if (report.errors.apiFailures.length > 0) {
    category = 'API_FAILURE';
    description = 'Recent API calls have failed, possibly causing state mismatch.';
    confidence = 'HIGH';
    recommendedFixId = 'retry-sync';
  }
  // 2. Check Workflow stuck state
  else if (report.windowWorldSpecific.step8BlockerState || report.validationBlockers.length > 0) {
    category = 'VALIDATION_BLOCKER';
    description = 'Workflow is blocked by missing or invalid required data fields.';
    confidence = 'HIGH';
    recommendedFixId = 'rerun-validation';
  }
  // 3. Check Sync Conflicts
  else if (report.localDb.syncStatus.includes('Conflicts')) {
    category = 'SYNC_CONFLICT';
    description = 'There are unresolved offline sync conflicts preventing data saving.';
    confidence = 'HIGH';
  }
  // 4. Check Stale Cache / Appointment flicker
  else if (report.errors.frontend.some(err => err.includes('cache') || err.includes('stale'))) {
    category = 'STALE_CACHE';
    description = 'The local cache is stale and conflicting with remote data.';
    confidence = 'MEDIUM';
    recommendedFixId = 'refresh-route-data';
  }

  // 5. Check Address Visuals
  if (report.localDb.addressVisualsCount === 0) {
    if (!report.warnings) report.warnings = [];
    report.warnings.push({
      component: 'Visuals',
      issue: 'No property address visuals or maps cached locally.',
      impact: 'User cannot see property imagery offline.',
      suggestedFix: 'Open Appointment and let Mapbox/Street View load.'
    });
  }

  return {
    report,
    summary: {
      category,
      description,
      confidence,
      recommendedFixId,
    }
  };
}
