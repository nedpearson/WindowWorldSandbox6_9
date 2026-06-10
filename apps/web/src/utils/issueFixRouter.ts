import { NavigateFunction } from 'react-router-dom';
import { SweepCheckpoint } from './preSubmissionSweep';
import { toast } from '../components/Toast';

export function handleFixIssue(
  issue: SweepCheckpoint,
  appointmentId: string,
  navigate: NavigateFunction,
  options?: { returnTo?: string }
) {
  const returnParam = options?.returnTo ? `?returnTo=${encodeURIComponent(options.returnTo)}` : '';
  const action = issue.fixAction;

  if (!action) {
    // Fallback if there is no fixAction defined
    toast.info(`Manual Fix Required: ${issue.fix || issue.detail}`);
    return;
  }

  try {
    switch (action.type) {
      case 'sketch_marker':
        navigate(`/appointments/${appointmentId}/sketch${returnParam}${returnParam ? '&' : '?'}focusMarker=${action.markerId || action.openingNumber}`);
        break;

      case 'pricing_stale':
        // Typically we would either run recalculate inline or route to the pricing tab
        toast.info('Please run Recalculate Pricing to refresh stale prices.');
        // Route to the Pricing tab
        navigate(`/mobile/field/${appointmentId}#pricing`);
        break;

      case 'customer_details':
        // Use hash routing for tab, and query params for focus
        navigate(`/mobile/field/${appointmentId}#home${returnParam}${returnParam ? '&' : '?'}focusField=${action.field}`);
        break;

      case 'oriel_upper_sash':
      case 'type_removed_installed':
      case 'exterior_measurement_rule':
      case 'model_number':
      case 'color_abbreviation':
      case 'measurement':
      case 'opening_details':
        // Route to the Sketch Canvas and focus the exact marker/opening and field
        let url = `/appointments/${appointmentId}/sketch?focusOpening=${action.openingNumber || action.openingId}`;
        if (action.field) {
          url += `&focusField=${action.field}`;
        }
        if (options?.returnTo) {
          url += `&returnTo=${encodeURIComponent(options.returnTo)}`;
        }
        // Force the URL to change
        url += `&t=${Date.now()}`;
        navigate(url);
        break;

      case 'manual_instruction':
      default:
        toast.info(action.instruction || issue.fix || issue.detail);
        break;
    }
  } catch (error) {
    console.error('Error navigating to fix target:', error);
    toast.error(`Could not open fix target for this issue.`);
  }
}
