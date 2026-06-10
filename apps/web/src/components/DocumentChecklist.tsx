import { getRequiredPacketDocuments, isLeadDisclosureRequired, REFERENCE_DOCUMENTS } from '../config/referenceDocuments';

interface Props {
  appointment: any;
  acknowledgments: Record<string, boolean>;
  selectedFinancePlan?: string;
}

export function DocumentChecklist({ appointment, acknowledgments, selectedFinancePlan }: Props) {
  const pre1978 = isLeadDisclosureRequired(
    appointment.customer?.homeBuiltYear,
    appointment.customer?.pre1978 || appointment.pre1978Status
  );
  const financing = !!selectedFinancePlan;
  const requiredDocs = getRequiredPacketDocuments(pre1978, financing);

  const checks = [
    {
      key: 'warranty',
      label: 'Warranty Document',
      required: true,
      included: acknowledgments['warranty_in_packet'] || false,
      reviewed: acknowledgments['warranty_reviewed'] || false,
    },
    {
      key: 'lead_disclosure',
      label: 'Lead-Based Paint Disclosure',
      required: pre1978,
      included: pre1978 ? (acknowledgments['lead_disclosure_provided'] || false) : false,
      reviewed: pre1978 ? (acknowledgments['lead_disclosure_reviewed'] || false) : false,
      acknowledged: pre1978 ? (acknowledgments['lead_disclosure_acknowledged'] || false) : false,
      blocker: pre1978 && !acknowledgments['lead_disclosure_acknowledged'],
    },
    {
      key: 'finance',
      label: 'Finance Option Summary',
      required: financing,
      included: financing ? (acknowledgments['finance_in_packet'] || false) : false,
      reviewed: financing ? (acknowledgments['financing_discussed'] || false) : false,
    },
  ];

  const blockers = checks.filter(c => c.required && (c as any).blocker);
  const allRequired = checks.filter(c => c.required);
  const allIncluded = allRequired.every(c => c.included);

  return (
    <div className="card" style={{
      borderColor: blockers.length > 0 ? 'rgba(239,68,68,0.3)' : allIncluded ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)',
      background: blockers.length > 0 ? 'rgba(239,68,68,0.03)' : allIncluded ? 'rgba(34,197,94,0.03)' : 'rgba(245,158,11,0.03)',
    }}>
      <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        📋 Customer Packet Checklist
        {blockers.length > 0 && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
            {blockers.length} BLOCKER{blockers.length > 1 ? 'S' : ''}
          </span>
        )}
        {blockers.length === 0 && allIncluded && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>
            COMPLETE
          </span>
        )}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {checks.map(check => {
          if (!check.required) {
            return (
              <div key={check.key} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 0.5rem', fontSize: '0.8125rem',
                color: 'var(--text-muted)',
              }}>
                <span>➖</span>
                <span>{check.label} — Not Required</span>
              </div>
            );
          }

          return (
            <div key={check.key} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.375rem 0.5rem', borderRadius: 4,
              background: (check as any).blocker ? 'rgba(239,68,68,0.05)' : check.included ? 'rgba(34,197,94,0.05)' : 'rgba(245,158,11,0.05)',
              fontSize: '0.8125rem',
            }}>
              <span>{(check as any).blocker ? '🛑' : check.included ? '✅' : '⚠️'}</span>
              <span style={{ fontWeight: 600 }}>{check.label}</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                {check.reviewed ? '• Reviewed' : ''}
                {check.included ? ' • In Packet' : ''}
                {(check as any).acknowledged ? ' • Acknowledged' : ''}
              </span>
              {(check as any).blocker && (
                <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: '#ef4444', fontWeight: 700 }}>
                  BLOCKS EXPORT
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Packet contents summary */}
      <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-input)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <strong>Packet will include:</strong> Contract + Order Form (Excel/PDF)
        {acknowledgments['warranty_in_packet'] && ' • Warranty Documents'}
        {pre1978 && acknowledgments['lead_disclosure_provided'] && ' • Lead Paint Disclosure'}
        {financing && acknowledgments['finance_in_packet'] && ' • Finance Summary'}
      </div>
    </div>
  );
}
