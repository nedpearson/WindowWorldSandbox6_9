import { useState, useEffect, useCallback } from 'react';

interface FinanceOption {
  id: string;
  planKey: string;
  planCode: string | null;
  lenderName: string | null;
  name: string;
  displayName: string | null;
  formulaType: string;
  termMonths: number;
  apr: number;
  promoType: string;
  minimumAmount: string | null;
  maximumAmount: string | null;
  monthlyPaymentFactor: string | null;
  deferredInterestMonths: number | null;
  disclosureText: string | null;
  isActive: boolean;
  sortOrder: number;
  sourceSheet: string | null;
  sourceRowNumber: number | null;
  createdAt: string;
  formulaJson: unknown;
}

const API = '/api';

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('wwa_token');
  const res = await fetch(`${API}${path}`, {
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

function formatMoney(val: string | number | null | undefined): string {
  if (val == null) return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export default function FinanceOptionsPage() {
  const [options, setOptions] = useState<FinanceOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showAllActive, setShowAllActive] = useState(false);
  const [detailOption, setDetailOption] = useState<FinanceOption | null>(null);
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcResults, setCalcResults] = useState<unknown[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/finance-options?active=${showAllActive ? 'false' : 'true'}`);
      setOptions(data.items || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [showAllActive]);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setImportError('Please select a .xlsx file (Finance Options.xlsx)');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    setImportError(null);
    try {
      const token = localStorage.getItem('wwa_token');
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch('/api/finance-options/import-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: arrayBuffer,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setImportResult(
        `✅ Import complete — ${data.rowsImported} imported, ${data.rowsDuplicate} skipped (duplicate). ` +
        `Sheets: ${(data.sheetNames || []).join(', ')}`,
      );
      await loadOptions();
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportLoading(false);
    }
  };


  const handleToggle = async (id: string) => {
    try {
      await apiFetch(`/finance-options/${id}/toggle`, { method: 'PATCH' });
      await loadOptions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleCalculateAll = async () => {
    const amt = parseFloat(calcAmount);
    if (!amt || amt <= 0) { setCalcError('Enter a valid project amount'); return; }
    setCalcLoading(true);
    setCalcError(null);
    setCalcResults([]);
    try {
      const data = await apiFetch('/finance-options/calculate', {
        method: 'POST',
        body: JSON.stringify({ projectAmount: amt, calculateAll: true }),
      });
      setCalcResults(data.results || []);
    } catch (e: unknown) {
      setCalcError(e instanceof Error ? e.message : String(e));
    } finally {
      setCalcLoading(false);
    }
  };

  const formulaLabel = (type: string) => {
    switch (type) {
      case 'zero_interest': return '÷ months (0% APR)';
      case 'factor': return '× factor';
      case 'half_down': return '÷ 2 (50% down)';
      case 'amortized': return 'PMT formula';
      default: return type;
    }
  };

  const promoLabel = (type: string) => {
    switch (type) {
      case 'interest_free': return 'Interest-Free';
      case 'same_as_cash': return 'Same-as-Cash (Promo)';
      case 'fixed_rate': return 'Fixed Rate';
      case 'cash_down': return '50% Down Payment';
      default: return type;
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--royal)', margin: 0 }}>
            💳 Finance Options Catalog
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            {total} finance plan{total !== 1 ? 's' : ''} — imported from Finance Options.xlsx
          </p>
        </div>
        {/* Hidden file input + trigger button */}
        <label style={{ display: 'inline-block' }}>
          <input
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
            disabled={importLoading}
          />
          <span
            style={{
              display: 'inline-block', padding: '0.6rem 1.25rem', background: 'var(--blue)', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 700, cursor: importLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', opacity: importLoading ? 0.7 : 1, userSelect: 'none',
            }}
          >
            {importLoading ? '⏳ Importing…' : '⬆ Import from Spreadsheet'}
          </span>
        </label>
      </div>

      {/* Import result */}
      {importResult && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#065f46', fontSize: '0.875rem' }}>
          {importResult}
        </div>
      )}
      {importError && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          ❌ {importError}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAllActive}
            onChange={e => setShowAllActive(e.target.checked)}
          />
          Show inactive plans
        </label>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading finance options…</div>
      )}

      {/* Table */}
      {!loading && options.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', color: '#6b7280' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
          <p style={{ fontWeight: 700 }}>No finance options imported yet</p>
          <p style={{ fontSize: '0.875rem' }}>Click "Import from Spreadsheet" to load Finance Options.xlsx</p>
        </div>
      )}

      {!loading && options.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                {['Plan', 'Term', 'APR', 'Type', 'Formula', 'Min Amount', 'Factor', 'Plan Code', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {options.map((opt, i) => (
                <tr
                  key={opt.id}
                  style={{
                    background: i % 2 === 0 ? 'white' : '#f9fafb',
                    opacity: opt.isActive ? 1 : 0.5,
                    cursor: 'pointer',
                  }}
                  onClick={() => setDetailOption(detailOption?.id === opt.id ? null : opt)}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--blue)' }}>
                    {opt.displayName ?? opt.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {opt.termMonths > 0 ? `${opt.termMonths} mo` : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {opt.apr === 0 ? <span style={{ color: '#059669', fontWeight: 600 }}>0%</span> : `${opt.apr}%`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      background: opt.promoType === 'interest_free' || opt.promoType === 'same_as_cash' ? '#dbeafe' : opt.promoType === 'fixed_rate' ? '#fef3c7' : '#f3f4f6',
                      color: opt.promoType === 'interest_free' || opt.promoType === 'same_as_cash' ? '#1e40af' : opt.promoType === 'fixed_rate' ? '#92400e' : '#374151',
                      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {promoLabel(opt.promoType)}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {formulaLabel(opt.formulaType)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{formatMoney(opt.minimumAmount)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
                    {opt.monthlyPaymentFactor ? Number(opt.monthlyPaymentFactor).toFixed(6) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{opt.planCode ?? '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                      background: opt.isActive ? '#10b981' : '#d1d5db', marginRight: '0.4rem',
                    }} />
                    {opt.isActive ? 'Active' : 'Disabled'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleToggle(opt.id); }}
                      style={{
                        padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                        background: opt.isActive ? '#fee2e2' : '#d1fae5',
                        color: opt.isActive ? '#991b1b' : '#065f46',
                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                      }}
                    >
                      {opt.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {detailOption && (
        <div style={{ marginTop: '1.5rem', background: 'var(--infobg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text)', fontSize: '1.1rem', fontWeight: 700 }}>
            📋 {detailOption.displayName ?? detailOption.name}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
            {[
              ['Source Sheet', detailOption.sourceSheet ?? '—'],
              ['Source Row', detailOption.sourceRowNumber?.toString() ?? '—'],
              ['Lender', detailOption.lenderName ?? '—'],
              ['Formula Type', detailOption.formulaType],
              ['Deferred Interest Months', detailOption.deferredInterestMonths?.toString() ?? '—'],
              ['Max Amount', formatMoney(detailOption.maximumAmount)],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ color: '#6b7280', fontFamily: label === 'Formula Type' ? 'monospace' : undefined }}>{value}</div>
              </div>
            ))}
          </div>
          {detailOption.disclosureText && (
            <div style={{ marginTop: '1rem', background: '#fef3c7', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#92400e', fontStyle: 'italic' }}>
              <strong>Disclosure:</strong> {detailOption.disclosureText}
            </div>
          )}
          {detailOption.formulaJson != null && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#374151', fontSize: '0.875rem' }}>📐 Formula JSON (raw from spreadsheet)</summary>
              <pre style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', fontSize: '0.75rem', overflowX: 'auto', marginTop: '0.5rem' }}>
                {JSON.stringify(detailOption.formulaJson as Record<string, unknown>, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Calculator section */}
      <div style={{ marginTop: '2rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--royal)', margin: '0 0 1rem' }}>
          🧮 Payment Calculator — Verify All Plans
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
              Project Amount
            </label>
            <input
              type="number"
              value={calcAmount}
              onChange={e => setCalcAmount(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '1rem', width: '160px', background: '#fff', color: 'var(--text)' }}
            />
          </div>
          <button
            onClick={handleCalculateAll}
            disabled={calcLoading || options.length === 0}
            style={{
              padding: '0.6rem 1.25rem', background: 'var(--blue)', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
              fontSize: '0.9rem', opacity: calcLoading || options.length === 0 ? 0.6 : 1,
            }}
          >
            {calcLoading ? 'Calculating…' : 'Calculate All Plans'}
          </button>
        </div>

        {calcError && (
          <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '0.75rem', color: '#991b1b', fontSize: '0.875rem' }}>
            ❌ {calcError}
          </div>
        )}

        {calcResults.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--royal)', color: 'white' }}>
                  {['Plan', 'Amount', 'Down', 'Financed', 'Monthly', 'Total', 'Interest', 'Eligible'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(calcResults as {
                  planKey: string; displayName: string; projectAmount: number;
                  downPaymentAmount: number; financedAmount: number;
                  estimatedMonthlyPayment: number; totalPayments: number;
                  totalInterest: number; isEligible: boolean; warnings: string[];
                }[]).map((r, i) => (
                  <tr key={r.planKey} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--blue)' }}>{r.displayName}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>${r.projectAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>{r.downPaymentAmount > 0 ? `$${r.downPaymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>${r.financedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.6rem 1rem', fontWeight: 700, color: 'var(--blue)' }}>
                      {r.estimatedMonthlyPayment > 0 ? `$${r.estimatedMonthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo` : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>${r.totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.6rem 1rem', color: r.totalInterest > 0 ? '#dc2626' : '#059669' }}>
                      {r.totalInterest > 0 ? `$${r.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'None'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      {r.isEligible ? (
                        <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ color: '#dc2626' }} title={r.warnings[0]}>✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
