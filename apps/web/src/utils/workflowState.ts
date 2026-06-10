// Canonical 9-step Sales Appointment Workflow
export const APPOINTMENT_STEPS = [
  { id: 'customer', label: 'Customer', icon: '👤' },
  { id: 'price', label: 'Price', icon: '⚡' },
  { id: 'product', label: 'Product', icon: '🪟' },
  { id: 'measure', label: 'Measure', icon: '📐' },
  { id: 'review', label: 'Review', icon: '🔍' },
  { id: 'proposal', label: 'Proposal', icon: '📊' },
  { id: 'contract', label: 'Order / Contract', icon: '📝' },
  { id: 'close', label: 'Close / Follow-Up', icon: '🤝' },
];

export type WorkflowStepId = typeof APPOINTMENT_STEPS[number]['id'];

/**
 * Returns the logical step index for routing or progress bars (0-indexed).
 */
export function getStepIndex(stepId: string): number {
  const index = APPOINTMENT_STEPS.findIndex(s => s.id === stepId);
  return index === -1 ? 0 : index;
}

/**
 * Derives the current active step based on appointment data state.
 */
export function determineActiveStep(appointment: any): WorkflowStepId {
  if (!appointment) return 'customer';
  
  // If the appointment is marked as completed/closed
  if (appointment.status === 'Completed' || appointment.status === 'Closed') {
    return 'close';
  }

  // If a contract exists or is signed
  if (Array.isArray(appointment.documents) && appointment.documents.some((d: any) => d?.type === 'contract')) {
    return 'contract';
  }

  // If there are measured openings but no contract
  if (Array.isArray(appointment.openings) && appointment.openings.length > 0) {
    const allPriced = appointment.openings.every((o: any) => o?.totalPrice > 0);
    if (allPriced) return 'proposal';
    return 'measure';
  }

  // If there's a quick quote but no detailed measurements
  if (appointment.quickQuoteTotal) {
    return 'product';
  }

  // Default to price if we have customer info
  if (appointment.customerName) {
    return 'price';
  }

  return 'customer';
}
