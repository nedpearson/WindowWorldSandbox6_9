import { useState, useEffect, useCallback } from 'react';
import { FINANCE_PLANS, calculateMonthlyPayment } from '../config/referenceDocuments';

interface Props {
  appointmentId?: string;
  jobAmount: number;
  selectedPlanId?: string;
  onSelectPlan?: (planId: string | null) => void;
  onAcknowledge?: (key: string, value: boolean) => void;
  acknowledgments?: Record<string, boolean>;
}

interface DbFinanceOption {
  id: string;
  planKey: string;
  planCode: string | null;
  name: string;
  displayName: string | null;
  formulaType: string;
  termMonths: number;
  apr: number;
  promoType: string;
  minimumAmount: string | null;
  monthlyPaymentFactor: string | null;
  disclosureText: string | null;
  isActive: boolean;
}

interface CalcResult {
  estimatedMonthlyPayment: number;
  financedAmount: number;
  totalPayments: number;
  totalInterest: number;
  isEligible: boolean;
  warnings: string[];
  disclosureText: string;
  termMonths: number;
  aprPercent: number;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('wwa_token');
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function FinanceOptionsPanel({
  appointmentId,
  jobAmount,
  selectedPlanId,
  onSelectPlan,
  onAcknowledge,
  acknowledgments = {},
}: Props) {
  const [expanded, setExpanded] = useState(!!selectedPlanId);
  const [dbOptions, setDbOptions] = useState<DbFinanceOption[]>([]);
  const [calcResults, setCalcResults] = useState<Record<string, CalcResult>>({});
  const [selectedDbPlanId, setSelectedDbPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [useDb, setUseDb] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  // Load DB options
  useEffect(() => {
    apiFetch('/finance-options?active=true')
      .then(data => {
        const items: DbFinanceOption[] = data.items || [];
        if (items.length > 0) {
          setDbOptions(items);
          setUseDb(true);
        }
      })
      .catch(() => {
        // Fall back to hardcoded — no error shown
        setUseDb(false);
      });
  }, []);

  // Load existing selection for this appointment
  useEffect(() => {
    if (!appointmentId || !useDb) return;
    apiFetch(`/finance-options/appointment/${appointmentId}/selection`)
      .then(data => {
        if (data && data.financeOptionId) {
          setSelectedDbPlanId(data.financeOptionId);
        }
      })
      .catch(() => {});
  }, [appointmentId, useDb]);

  // Calculate all DB options when jobAmount or options change
  const calculateAll = useCallback(async () => {
    if (!useDb || dbOptions.length === 0 || jobAmount <= 0) return;
    try {
      const data = await apiFetch('/finance-options/calculate', {
        method: 'POST',
        body: JSON.stringify({ projectAmount: jobAmount, calculateAll: true }),
      });
      const map: Record<string, CalcResult> = {};
      for (const r of (data.results || [])) {
        // find the matching DB option by planKey
        const opt = dbOptions.find(o => o.planKey === r.planKey);
        if (opt) map[opt.id] = r;
      }
      setCalcResults(map);
    } catch {
      // Silently fall back to hardcoded
    }
  }, [useDb, dbOptions, jobAmount]);

  useEffect(() => { calculateAll(); }, [calculateAll]);

  // Save DB selection
  const handleSelectDb = async (optionId: string | null) => {
    setSelectedDbPlanId(optionId);
    if (!appointmentId) return;
    if (!optionId) {
      try {
        await apiFetch(`/finance-options/appointment/${appointmentId}/selection`, { method: 'DELETE' });
        setSaveMsg('Financing selection cleared');
      } catch { /* no selection to delete */ }
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const calc = calcResults[optionId];
      await apiFetch(`/finance-options/appointment/${appointmentId}/select`, {
        method: 'POST',
        body: JSON.stringify({
          financeOptionId: optionId,
          projectAmount: jobAmount,
          discussed: acknowledgments['financing_discussed'] || false,
          inPacket: true,
        }),
      });
      setSaveMsg(`✅ ${calc ? `$${calc.estimatedMonthlyPayment.toFixed(2)}/mo saved` : 'Selection saved'}`);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: unknown) {
      setSaveMsg(`❌ ${e instanceof Error ? e.message : 'Save failed'}`);
    } finally {
      setSaving(false);
    }
  };

  const openFinanceDoc = () => {
    window.open(`/api/documents/view/finance_options?token=${localStorage.getItem('wwa_token') || ''}`, '_blank');
  };

  return (
    <div className="card" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          💳 Financing Options
          {(selectedPlanId || selectedDbPlanId) && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>
              Plan Selected
            </span>
          )}
          {useDb && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4, color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
              DB Catalog
            </span>
          )}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Job Total: <strong>{fmt(jobAmount)}</strong> — Select a financing option to present to the customer.
          </p>

          {/* Save message */}
          {saveMsg && (
            <div style={{
              padding: '0.4rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.8125rem',
              background: saveMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: saveMsg.startsWith('✅') ? '#15803d' : '#dc2626',
            }}>
              {saveMsg}
            </div>
          )}

          {/* DB-based plan cards */}
          {useDb && dbOptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {dbOptions.map(opt => {
                const calc = calcResults[opt.id];
                const isSelected = selectedDbPlanId === opt.id;
                const eligible = !calc || calc.isEligible;
                const monthly = calc?.estimatedMonthlyPayment ?? 0;
                const minAmt = opt.minimumAmount ? Number(opt.minimumAmount) : 0;

                return (
                  <div
                    key={opt.id}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 8,
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(59,130,246,0.08)' : eligible ? 'var(--bg-input)' : 'rgba(0,0,0,0.03)',
                      cursor: eligible ? 'pointer' : 'not-allowed',
                      opacity: eligible ? 1 : 0.55,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      if (!eligible || saving) return;
                      const newId = isSelected ? null : opt.id;
                      handleSelectDb(newId);
                      onSelectPlan?.(newId ? opt.planKey : null);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {isSelected && '✅ '}{opt.displayName ?? opt.name}
                          {opt.planCode && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              Code {opt.planCode}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {opt.apr === 0
                            ? `0% interest · ${opt.termMonths} months`
                            : `${opt.apr}% APR · ${opt.termMonths} months`}
                          {minAmt > 0 && ` · min ${fmt(minAmt)}`}
                        </div>
                        {calc && calc.warnings.length > 0 && !eligible && (
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.125rem' }}>
                            {calc.warnings[0]}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '90px' }}>
                        {eligible && monthly > 0 ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#3b82f6' }}>
                              {fmt(monthly)}/mo
                            </div>
                            {calc && calc.totalInterest > 0 && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                Total: {fmt(calc.totalPayments)}
                              </div>
                            )}
                          </>
                        ) : eligible && opt.formulaType === 'half_down' ? (
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#3b82f6' }}>
                            {fmt(jobAmount / 2)} down
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                            Min: {fmt(minAmt || 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* No financing */}
              <div
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8,
                  border: !selectedDbPlanId ? '2px solid var(--text-muted)' : '1px solid var(--border-subtle)',
                  background: !selectedDbPlanId ? 'rgba(0,0,0,0.04)' : 'transparent',
                  cursor: 'pointer', fontSize: '0.8125rem',
                }}
                onClick={() => { handleSelectDb(null); onSelectPlan?.(null); }}
              >
                {!selectedDbPlanId && '✅ '}No Financing — Cash/Check/Card
              </div>
            </div>
          ) : (
            // Fallback: hardcoded FINANCE_PLANS
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {FINANCE_PLANS.filter(p => p.active).map(plan => {
                const monthly = calculateMonthlyPayment(plan, jobAmount);
                const isSelected = selectedPlanId === plan.id;
                const eligible = monthly !== null;

                return (
                  <div
                    key={plan.id}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 8,
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(59,130,246,0.08)' : eligible ? 'var(--bg-input)' : 'rgba(0,0,0,0.03)',
                      cursor: eligible ? 'pointer' : 'not-allowed',
                      opacity: eligible ? 1 : 0.5,
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => { if (!eligible) return; onSelectPlan?.(isSelected ? null : plan.id); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {isSelected && '✅ '}{plan.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                          {plan.disclosureText}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {eligible ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#3b82f6' }}>
                              {fmt(monthly!)}/mo
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                              {plan.termMonths} months
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                            Min: {fmt(plan.minimumAmount || 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8,
                  border: !selectedPlanId ? '2px solid var(--text-muted)' : '1px solid var(--border-subtle)',
                  background: !selectedPlanId ? 'rgba(0,0,0,0.04)' : 'transparent',
                  cursor: 'pointer', fontSize: '0.8125rem',
                }}
                onClick={() => onSelectPlan?.(null)}
              >
                {!selectedPlanId && '✅ '}No Financing — Cash/Check/Card
              </div>
            </div>
          )}

          {/* Document link */}
          <button className="btn btn-sm btn-secondary" onClick={openFinanceDoc} style={{ marginBottom: '1rem' }}>
            📊 View Full Finance Options Worksheet
          </button>

          {/* Acknowledgments */}
          {(selectedPlanId || selectedDbPlanId) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acknowledgments['financing_discussed'] || false}
                  onChange={e => onAcknowledge?.('financing_discussed', e.target.checked)}
                />
                Financing options discussed with customer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acknowledgments['finance_in_packet'] || false}
                  onChange={e => onAcknowledge?.('finance_in_packet', e.target.checked)}
                />
                Finance summary included in customer packet
              </label>
              {(selectedDbPlanId) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  Estimated payment option. Subject to credit approval and lender terms.
                  Create a finance account at WWW.WINWORLDINFO.COM.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
