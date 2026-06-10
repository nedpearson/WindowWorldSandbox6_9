/**
 * CommissionsPage.tsx — My Commissions
 * Full audit-compliant version with:
 * - Commission Catalog section (Section A)
 * - My Commission Records section (Section B)
 * - 5 summary cards
 * - 5 filters (category, product type, status, customer, date range)
 * - Search
 * - Row detail drawer
 * - Export CSV
 * - Loading / empty / error states
 * - Mobile responsive layout
 * - Role-aware visibility
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { toast } from '../components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string;
  category: string;
  subcategory: string | null;
  itemName: string;
  sku: string | null;
  description: string | null;
  priceType: string;
  priceAmount: number | null;
  priceAmount2: number | null;
  pricePercent: number | null;
  commissionType: string;
  commissionAmount: number | null;
  commissionPercent: number | null;
  unit: string | null;
  notes: string | null;
  isActive: boolean;
}

interface CommRecord {
  id: string;
  customerName: string | null;
  customerAddress: string | null;
  region: string | null;
  soldDate: string | null;
  installDate: string | null;
  numWindows: number | null;
  productTypes: any;
  jobAmount: number | null;
  commissionAmount: number | null;
  paidAmount: number | null;
  commissionStatus: string;
  contractNumber: string | null;
  salesRepName: string | null;
  notes: string | null;
  comments: string | null;
  payments: { amount: number; paymentDate: string | null }[];
  adjustments: { adjustmentType: string; amount: number }[];
}

interface Summary {
  estimatedCommission: number;
  paidCommission: number;
  unpaidCommission: number;
  totalSalesAmount: number;
  avgCommissionPerSale: number;
  totalRecords: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  imported:       { label: 'Imported',      color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  pending:        { label: 'Pending',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  expected:       { label: 'Expected',       color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
  paid:           { label: 'Paid',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  partially_paid: { label: 'Partial',        color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  disputed:       { label: 'Disputed',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  adjusted:       { label: 'Adjusted',       color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  ignored:        { label: 'Ignored',        color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

const CAT_COLORS: Record<string, string> = {
  'Windows':                         '#3b82f6',
  'Patio Doors':                     '#8b5cf6',
  'Options':                         '#06b6d4',
  'Other Products':                  '#f59e0b',
  'Additional Labor Charges':        '#ef4444',
  'Value Plus / Energy Star Packs':  '#22c55e',
};
const catColor = (c: string) => CAT_COLORS[c] ?? '#6b7280';

const TABS = ['dashboard', 'catalog', 'records', 'import', 'reports'] as const;
type Tab = typeof TABS[number];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const fmtPct = (n: number | null | undefined) =>
  n != null ? `${(Number(n) * 100).toFixed(1)}%` : '—';

function formatPrice(item: CatalogItem): string {
  switch (item.priceType) {
    case 'book':        return 'BOOK';
    case 'job_amount':  return 'Job Amt %';
    case 'percent_off':
      return item.pricePercent != null
        ? `${Math.abs(Number(item.pricePercent) * 100).toFixed(0)}% Off`
        : '—';
    case 'per_unit':
      if (item.priceAmount == null) return '—';
      return `${fmt(item.priceAmount)}/${item.unit ?? 'unit'}`;
    default:
      if (item.priceAmount == null) return '—';
      if (item.priceAmount2 != null)
        return `${fmt(item.priceAmount)} / ${fmt(item.priceAmount2)}`;
      return fmt(item.priceAmount);
  }
}

function formatComm(item: CatalogItem): string {
  if (item.commissionType === 'percent' && item.commissionPercent != null)
    return fmtPct(Number(item.commissionPercent));
  if (item.commissionType === 'fixed' && item.commissionAmount != null)
    return fmt(item.commissionAmount);
  return '$0';
}

function toCSV(records: CommRecord[]): string {
  const header = [
    'Customer', 'Address', 'Region', 'Sold Date', 'Install Date',
    '# Windows', 'Contract #', 'Job Amount', 'Commission', 'Paid',
    'Unpaid', 'Status', 'Sales Rep', 'Notes',
  ];
  const rows = records.map(r => {
    const paid = r.payments.reduce((s, p) => s + Number(p.amount), 0);
    const unpaid = Math.max(0, Number(r.commissionAmount ?? 0) - paid);
    return [
      r.customerName ?? '',
      r.customerAddress ?? '',
      r.region ?? '',
      r.soldDate ? new Date(r.soldDate).toLocaleDateString() : '',
      r.installDate ? new Date(r.installDate).toLocaleDateString() : '',
      r.numWindows ?? '',
      r.contractNumber ?? '',
      r.jobAmount ?? '',
      r.commissionAmount ?? '',
      paid,
      unpaid,
      r.commissionStatus,
      r.salesRepName ?? '',
      r.notes ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommissionsPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [userRole, setUserRole] = useState<string>('sales_rep');

  // Dashboard
  const [dashboard, setDashboard] = useState<any>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);

  // Records
  const [records, setRecords] = useState<CommRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CommRecord | null>(null);

  // Record filters
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');

  // Catalog
  const [catalog, setCatalog]                   = useState<CatalogItem[]>([]);
  const [catalogTotal, setCatalogTotal]         = useState(0);
  const [catalogCategories, setCatalogCategories] = useState<{ category: string; count: number }[]>([]);
  const [catalogCategory, setCatalogCategory]   = useState('all');
  const [catalogSearch, setCatalogSearch]       = useState('');
  const [catalogLoading, setCatalogLoading]     = useState(false);
  const [catalogError, setCatalogError]         = useState<string | null>(null);
  const [catalogImporting, setCatalogImporting] = useState(false);
  const [importResult, setImportResult]         = useState<any>(null);

  // Legacy import
  const [importState, setImportState] = useState<'idle' | 'analyzing' | 'preview' | 'importing' | 'done'>('idle');
  const [importData, setImportData]   = useState<any>(null);
  const [importExecResult, setImportExecResult] = useState<any>(null);

  // Reports
  const [templateInfo, setTemplateInfo]       = useState<any>(null);
  const [reportGenerating, setReportGenerating] = useState(false);

  // Auth / role
  useEffect(() => {
    api.get('/auth/me').then((u: any) => setUserRole(u.role ?? 'sales_rep')).catch(() => {});
  }, []);

  const isManager = ['manager', 'admin', 'super_admin'].includes(userRole);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    setDashError(null);
    try {
      const [dash, sum] = await Promise.all([
        api.get('/commissions/dashboard'),
        api.get('/commissions/summary').catch(() => null),
      ]);
      setDashboard(dash);
      if (sum) setSummary(sum);
    } catch (err: any) {
      setDashError(err.message || 'Failed to load dashboard');
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (customerFilter) params.set('customer', customerFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('limit', '100');

      const data = await api.get(`/commissions/my?${params}`);
      setRecords(data.records || []);
      setRecordsTotal(data.total || 0);
    } catch (err: any) {
      setRecordsError(err.message || 'Failed to load commission records');
    } finally {
      setRecordsLoading(false);
    }
  }, [search, statusFilter, customerFilter, dateFrom, dateTo]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const params = new URLSearchParams();
      if (catalogCategory !== 'all') params.set('category', catalogCategory);
      if (catalogSearch) params.set('search', catalogSearch);
      params.set('limit', '300');
      const data = await api.get(`/commissions/catalog?${params}`);
      setCatalog(data.items || []);
      setCatalogTotal(data.total || 0);
      setCatalogCategories(data.categories || []);
    } catch (err: any) {
      setCatalogError(err.message || 'Failed to load commission catalog');
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogCategory, catalogSearch]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (tab === 'records') loadRecords(); }, [tab, loadRecords]);
  useEffect(() => { if (tab === 'catalog') loadCatalog(); }, [tab, catalogCategory, loadCatalog]);
  useEffect(() => { if (tab === 'reports' && !templateInfo) loadTemplateInfo(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  const runCatalogImport = async () => {
    setCatalogImporting(true);
    setImportResult(null);
    try {
      const result = await api.post('/commissions/catalog/import-local', {
        // filePath omitted — server uses COMMISSION_SHEET_PATH env var or configured default
      });
      setImportResult(result);
      toast.success(`✅ Imported ${result.rowsImported} items (${result.rowsDuplicate} duplicates skipped)`);
      loadCatalog();
      loadDashboard();
    } catch (err: any) {
      toast.error('Catalog import failed: ' + (err.message || String(err)));
    } finally {
      setCatalogImporting(false);
    }
  };

  const exportExcel = async () => {
    try {
      const token = localStorage.getItem('wwa_token');
      const res = await fetch('/api/commissions/export/excel', {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'Commission_Export.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error('Export failed: ' + err.message); }
  };

  const exportCSV = () => {
    if (records.length === 0) { toast.error('No records to export'); return; }
    const csv = toCSV(records);
    downloadCSV(csv, `Commissions_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${records.length} records as CSV`);
  };

  const analyzeSheet = async () => {
    setImportState('analyzing');
    try {
      const data = await api.post('/commissions/import/analyze', {
        // filePath omitted — server uses COMMISSION_SHEET_PATH env var or configured default
      });
      setImportData(data); setImportState('preview');
    } catch (err: any) { toast.error(err.message || 'Analysis failed'); setImportState('idle'); }
  };

  const executeImport = async () => {
    if (!importData?.parsedData) return;
    setImportState('importing');
    try {
      const result = await api.post('/commissions/import/execute', {
        filePath: importData.filePath,
        parsedData: importData.parsedData,
        columnMapping: importData.suggestedMapping,
      });
      setImportExecResult(result); setImportState('done'); loadDashboard();
    } catch (err: any) { toast.error(err.message || 'Import failed'); setImportState('preview'); }
  };

  const loadTemplateInfo = useCallback(async () => {
    try { setTemplateInfo(await api.get('/commissions/report/template-info')); }
    catch (err) { console.error('Template info error:', err); }
  }, []);

  const generateReport = async (recordId?: string) => {
    setReportGenerating(true);
    try {
      const token = localStorage.getItem('wwa_token');
      const ep = recordId ? '/api/commissions/report/generate' : '/api/commissions/report/generate-blank';
      const res = await fetch(ep, {
        method: 'POST', headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(recordId ? { recordId } : {}),
      });
      if (!res.ok) throw new Error('Report generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disp = res.headers.get('Content-Disposition') || '';
      const match = disp.match(/filename=([^;]+)/);
      a.href = url; a.download = match ? match[1] : 'Commission_Report.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error('Report generation failed: ' + err.message); }
    finally { setReportGenerating(false); }
  };

  // ── Catalog grouping ──────────────────────────────────────────────────────
  const groupedCatalog = catalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // ── Paid amounts ──────────────────────────────────────────────────────────
  const paidFor = (r: CommRecord) => r.payments.reduce((s, p) => s + Number(p.amount), 0);
  const unpaidFor = (r: CommRecord) => Math.max(0, Number(r.commissionAmount ?? 0) - paidFor(r));

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>💰 My Commissions</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {tab === 'records' && records.length > 0 && (
            <>
              <button id="export-csv-btn" className="btn btn-sm"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                onClick={exportCSV}>📄 CSV</button>
              <button id="export-excel-btn" className="btn btn-sm"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                onClick={exportExcel}>📥 Excel</button>
            </>
          )}
          {tab !== 'records' && (
            <button className="btn btn-sm" onClick={exportExcel}
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              📥 Export Excel
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} id={`tab-${t}`} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}>
            {t === 'dashboard' ? '📊 Dashboard'
              : t === 'catalog' ? '📋 Catalog'
              : t === 'records' ? '🗂️ My Records'
              : t === 'import' ? '📂 Import'
              : '📄 Reports'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          DASHBOARD TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div>
          {dashError && <ErrorBanner message={dashError} onRetry={loadDashboard} />}

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <StatCard id="stat-estimated" label="Estimated Commission" value={fmt(summary?.estimatedCommission ?? dashboard?.totalCommission)} color="#3b82f6" />
            <StatCard id="stat-paid"      label="Paid Commission"      value={fmt(summary?.paidCommission ?? dashboard?.totalPaid)} color="#22c55e" />
            <StatCard id="stat-unpaid"    label="Unpaid Commission"    value={fmt(summary?.unpaidCommission ?? dashboard?.totalUnpaid)} color="#f59e0b" />
            <StatCard id="stat-sales"     label="Total Sales Amount"   value={fmt(summary?.totalSalesAmount)} color="#a78bfa" />
            <StatCard id="stat-avg"       label="Avg Commission/Sale"  value={fmt(summary?.avgCommissionPerSale)} color="#06b6d4" />
          </div>

          {/* Status breakdown */}
          {dashboard?.byStatus && Object.keys(dashboard.byStatus).length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>By Status</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(dashboard.byStatus).map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.imported;
                  return (
                    <span key={status} style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                      {cfg.label}: {count as number}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent records */}
          {(dashboard?.recentRecords?.length ?? 0) > 0 && (
            <div className="card" style={{ marginBottom: '1rem', overflowX: 'auto' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Recent Commission Records</h3>
              <table className="data-table" style={{ fontSize: '0.8125rem', minWidth: 600 }}>
                <thead><tr><th>Customer</th><th>Address</th><th>Job Amt</th><th>Commission</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {dashboard.recentRecords.map((r: any) => {
                    const cfg = STATUS_CONFIG[r.commissionStatus] ?? STATUS_CONFIG.imported;
                    return (
                      <tr key={r.id}>
                        <td><strong>{r.customerName || '—'}</strong></td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.customerAddress || '—'}</td>
                        <td>{fmt(r.jobAmount)}</td>
                        <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(r.commissionAmount)}</td>
                        <td>{fmt(r.paidAmount)}</td>
                        <td><StatusBadge cfg={cfg} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!dashboard && !dashError && <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard…</div>}
          {dashboard && dashboard.totalRecords === 0 && !dashError && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <p>No commission records yet.</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Import the Catalog, then import a Commission Sheet to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CATALOG TAB — Section A
          Price/Commission rate matrix from BTR Commission Sheet
      ══════════════════════════════════════════════════════ */}
      {tab === 'catalog' && (
        <div>
          {/* Import card */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>📋 Commission Rate Catalog</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                  Price &amp; commission matrix — imported from BTR Commission Sheet (CS-2400).
                  {catalogTotal > 0 && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>{catalogTotal} items.</span>}
                </p>
              </div>
              <button id="catalog-import-btn" className="btn btn-primary" onClick={runCatalogImport} disabled={catalogImporting} style={{ whiteSpace: 'nowrap' }}>
                {catalogImporting ? '⏳ Importing…' : '📥 Import BTR Sheet → Catalog'}
              </button>
            </div>

            {/* Import result */}
            {importResult && (
              <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, fontSize: '0.8rem' }}>
                <strong style={{ color: '#22c55e' }}>✅ Import Complete</strong>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  <span>Sheet: <strong>{importResult.sheetParsed}</strong></span>
                  <span>Found: <strong>{importResult.rowsFound}</strong></span>
                  <span>Imported: <strong style={{ color: '#22c55e' }}>{importResult.rowsImported}</strong></span>
                  <span>Duplicates skipped: <strong>{importResult.rowsDuplicate}</strong></span>
                  <span>Errors: <strong style={{ color: importResult.errors ? '#ef4444' : '#22c55e' }}>{importResult.errors?.length ?? 0}</strong></span>
                </div>

                {/* Sample rows table — proves price vs commission */}
                {importResult.sampleRows?.length > 0 && (
                  <div style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>SAMPLE ROWS — PRICE vs COMMISSION:</div>
                    <table className="data-table" style={{ fontSize: '0.7rem' }}>
                      <thead>
                        <tr><th>Row</th><th>Status</th><th>Category</th><th>Item</th><th>Price (raw)</th><th>Price (parsed)</th><th>Comm (raw)</th><th>Comm (parsed)</th></tr>
                      </thead>
                      <tbody>
                        {importResult.sampleRows.map((r: any, i: number) => (
                          <tr key={i}>
                            <td>{r.row}</td>
                            <td><span style={{ color: r.status === 'IMPORTED' ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>{r.status}</span></td>
                            <td>{r.category}</td>
                            <td>{r.itemName}{r.sku ? ` (${r.sku})` : ''}</td>
                            <td style={{ fontFamily: 'monospace' }}>{r.priceRaw || '—'}</td>
                            <td style={{ color: '#3b82f6', fontWeight: 600 }}>
                              {r.priceType !== 'fixed' ? r.priceType : (r.priceAmount != null ? fmt(r.priceAmount) : '—')}
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{r.commRaw || '—'}</td>
                            <td style={{ color: '#22c55e', fontWeight: 700 }}>
                              {r.commissionPercent ?? (r.commissionAmount != null ? fmt(r.commissionAmount) : '$0')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Catalog filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input id="catalog-search" className="form-input" placeholder="Search catalog…"
              value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') loadCatalog(); }}
              style={{ flex: 1, minWidth: 180 }} />
            <select id="catalog-category-filter" className="form-input" value={catalogCategory}
              onChange={e => setCatalogCategory(e.target.value)} style={{ minWidth: 200 }}>
              <option value="all">All Categories ({catalogTotal})</option>
              {catalogCategories.map(c => (
                <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
              ))}
            </select>
            <button className="btn btn-sm btn-secondary" onClick={loadCatalog} title="Refresh">🔄</button>
          </div>

          {/* Error state */}
          {catalogError && <ErrorBanner message={catalogError} onRetry={loadCatalog} />}

          {/* Loading state */}
          {catalogLoading && <LoadingCard message="Loading commission catalog…" />}

          {/* Empty state */}
          {!catalogLoading && !catalogError && catalog.length === 0 && (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
              <strong>No catalog items yet</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Click <strong>Import BTR Sheet → Catalog</strong> to populate the rate table.
              </p>
            </div>
          )}

          {/* Catalog grouped by category */}
          {!catalogLoading && Object.entries(groupedCatalog).map(([category, items]) => (
            <div key={category} className="card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
              <div style={{
                padding: '0.625rem 1rem', marginBottom: '0.75rem',
                background: `${catColor(category)}15`,
                borderBottom: `2px solid ${catColor(category)}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: catColor(category), fontSize: '0.9375rem' }}>{category}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th>Category/Sub</th>
                      <th>Item</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th style={{ color: '#22c55e' }}>Commission</th>
                      <th>Unit</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>{item.subcategory || '—'}</td>
                        <td><strong>{item.itemName}</strong></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontFamily: 'monospace' }}>{item.sku || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {item.priceType !== 'fixed'
                            ? <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                                {formatPrice(item)}
                              </span>
                            : formatPrice(item)}
                        </td>
                        <td style={{ color: '#22c55e', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatComm(item)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>{item.unit || '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MY RECORDS TAB — Section B
      ══════════════════════════════════════════════════════ */}
      {tab === 'records' && (
        <div>
          {/* Summary cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <StatCard id="rec-stat-estimated" label="Estimated" value={fmt(summary.estimatedCommission)} color="#3b82f6" />
              <StatCard id="rec-stat-paid"      label="Paid"      value={fmt(summary.paidCommission)}      color="#22c55e" />
              <StatCard id="rec-stat-unpaid"    label="Unpaid"    value={fmt(summary.unpaidCommission)}    color="#f59e0b" />
              <StatCard id="rec-stat-sales"     label="Total Sales" value={fmt(summary.totalSalesAmount)} color="#a78bfa" />
              <StatCard id="rec-stat-avg"       label="Avg/Sale"  value={fmt(summary.avgCommissionPerSale)} color="#06b6d4" />
            </div>
          )}

          {/* Filters row 1: search + customer */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <input id="records-search" className="form-input" placeholder="Search customer, address, contract…"
              value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 2, minWidth: 200 }} />
            <input id="records-customer" className="form-input" placeholder="Customer name filter…"
              value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          </div>

          {/* Filters row 2: status + date range */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select id="records-status-filter" className="form-input" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 160 }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From:</label>
            <input id="records-date-from" type="date" className="form-input" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} style={{ minWidth: 140 }} />
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To:</label>
            <input id="records-date-to" type="date" className="form-input" value={dateTo}
              onChange={e => setDateTo(e.target.value)} style={{ minWidth: 140 }} />
            <button className="btn btn-sm btn-primary" onClick={loadRecords}>🔍 Filter</button>
            <button className="btn btn-sm btn-secondary" onClick={() => { setSearch(''); setStatusFilter('all'); setCustomerFilter(''); setDateFrom(''); setDateTo(''); }}>Clear</button>
          </div>

          {/* Error state */}
          {recordsError && <ErrorBanner message={recordsError} onRetry={loadRecords} />}

          {/* Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>My Commission Records ({recordsTotal})</h3>
              {records.length > 0 && (
                <button className="btn btn-sm" onClick={exportCSV}
                  style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
                  📄 Export CSV ({records.length})
                </button>
              )}
            </div>

            {recordsLoading && <LoadingCard message="Loading commission records…" />}

            {!recordsLoading && !recordsError && records.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗂️</div>
                No commission records match your filters.
              </div>
            )}

            {!recordsLoading && records.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem', minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Sold Date</th>
                      <th># Win</th>
                      <th>Job Amt</th>
                      <th style={{ color: '#22c55e' }}>Commission</th>
                      <th>Paid</th>
                      <th style={{ color: '#f59e0b' }}>Unpaid</th>
                      <th>Status</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => {
                      const paid = paidFor(r);
                      const unpaid = unpaidFor(r);
                      const cfg = STATUS_CONFIG[r.commissionStatus] ?? STATUS_CONFIG.imported;
                      const productLabel = Array.isArray(r.productTypes)
                        ? r.productTypes.slice(0, 2).join(', ')
                        : (r.productTypes ? String(r.productTypes) : '—');
                      return (
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(r)}>
                          <td><strong>{r.customerName || '—'}</strong></td>
                          <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{productLabel}</td>
                          <td>{r.soldDate ? new Date(r.soldDate).toLocaleDateString() : '—'}</td>
                          <td>{r.numWindows ?? '—'}</td>
                          <td>{fmt(r.jobAmount)}</td>
                          <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(r.commissionAmount)}</td>
                          <td>{fmt(paid)}</td>
                          <td style={{ color: unpaid > 0 ? '#f59e0b' : '#22c55e', fontWeight: unpaid > 0 ? 700 : 400 }}>{fmt(unpaid)}</td>
                          <td><StatusBadge cfg={cfg} /></td>
                          <td>
                            <button className="btn btn-sm btn-secondary" style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              onClick={e => { e.stopPropagation(); setSelectedRecord(r); }}>
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          IMPORT TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'import' && (
        <div>
          {/* Catalog import (primary) */}
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '3px solid var(--accent)' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>📋 Import Commission Catalog (Rate Table)</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Parses the BTR Commission Sheet and builds a reusable price/commission rate catalog. Idempotent — safe to run multiple times.
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 4, marginBottom: '1rem' }}>
              📂 Source: Server-configured BTR Commission Sheet (set via <code>COMMISSION_SHEET_PATH</code> on the server)
            </p>
            <button id="import-catalog-btn" className="btn btn-primary" onClick={runCatalogImport} disabled={catalogImporting}>
              {catalogImporting ? '⏳ Importing Catalog…' : '📥 Import BTR Sheet → Catalog'}
            </button>
            {importResult && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Last: <strong style={{ color: '#22c55e' }}>{importResult.rowsImported} items imported</strong>,{' '}
                {importResult.rowsDuplicate} skipped. Categories: {(importResult.categoriesImported || []).join(', ')}.
              </p>
            )}
          </div>

          {/* Legacy commission record import */}
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>📂 Import Commission Record (One-Time Sale)</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Import a completed BTR Commission Sheet to record a specific sale and its earned commission.
            </p>

            {importState === 'idle' && <button className="btn btn-secondary" onClick={analyzeSheet}>🔍 Analyze Commission Sheet</button>}
            {importState === 'analyzing' && <LoadingCard message="Analyzing workbook…" />}

            {importState === 'preview' && importData && (
              <div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <strong>📄 {importData.fileName}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{importData.sheets?.length || 0} sheet(s)</span>
                </div>
                {importData.parsedData?.products?.length > 0 && (
                  <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                    <table className="data-table" style={{ fontSize: '0.75rem' }}>
                      <thead><tr><th>Row</th><th>Qty</th><th>Product</th><th>Book $</th><th>Comm/Unit</th><th>Total Comm</th></tr></thead>
                      <tbody>
                        {importData.parsedData.products.map((p: any, i: number) => (
                          <tr key={i}><td>{p.row}</td><td>{p.qty}</td><td>{p.product}</td><td>{fmt(p.bookPrice)}</td><td>{fmt(p.commissionPerUnit)}</td><td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(p.totalCommission)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={executeImport}>✅ Import Record</button>
                  <button className="btn btn-secondary" onClick={() => { setImportState('idle'); setImportData(null); }}>Cancel</button>
                </div>
              </div>
            )}

            {importState === 'importing' && <LoadingCard message="Importing commission data…" />}

            {importState === 'done' && importExecResult && (
              <div>
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <strong style={{ color: '#22c55e' }}>✅ Import Successful</strong>
                  <p style={{ fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>Rows: {importExecResult.importedRows} · Record ID: {importExecResult.recordId}</p>
                  {importExecResult.commission?.commissionAmount && (
                    <p style={{ fontWeight: 700, color: '#22c55e' }}>Commission: {fmt(Number(importExecResult.commission.commissionAmount))}</p>
                  )}
                </div>
                <button className="btn btn-primary" onClick={() => { setTab('records'); loadRecords(); setImportState('idle'); }}>View My Records →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          REPORTS TAB
      ══════════════════════════════════════════════════════ */}
      {tab === 'reports' && (
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>📄 Commission Report — BTR Template</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Generates an exact replica of the BTR Commission Sheet (CS-2400) with your data, preserving all formulas, formatting, and print settings.
            </p>
            {templateInfo && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <InfoCard label="TEMPLATE" main={templateInfo.templateFile} sub={`Form ${templateInfo.formNumber} · Rev. ${templateInfo.revised}`} />
                <InfoCard label="STRUCTURE" main={`${templateInfo.mergeCount} merges · ${templateInfo.formulaCount} formulas`} sub={`${templateInfo.orientation} · ${templateInfo.printArea}`} />
              </div>
            )}
            <button className="btn btn-primary" onClick={() => generateReport()} disabled={reportGenerating}>
              {reportGenerating ? '⏳ Generating…' : '📥 Download Blank Sheet'}
            </button>
          </div>

          {dashboard?.recentRecords?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Generate from Record</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead><tr><th>Customer</th><th>Region</th><th># Win</th><th>Job Amt</th><th>Commission</th><th>Generate</th></tr></thead>
                  <tbody>
                    {dashboard.recentRecords.map((r: any) => (
                      <tr key={r.id}>
                        <td><strong>{r.customerName || '—'}</strong></td>
                        <td>{r.region || 'BTR'}</td>
                        <td>{r.numWindows || '—'}</td>
                        <td>{fmt(r.jobAmount)}</td>
                        <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(r.commissionAmount)}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => generateReport(r.id)} disabled={reportGenerating}>
                            📄 Generate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ROW DETAIL DRAWER
      ══════════════════════════════════════════════════════ */}
      {selectedRecord && (
        <RecordDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ id, label, value, color }: { id?: string; label: string; value: string | number; color: string }) {
  return (
    <div id={id} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '1.375rem', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function InfoCard({ label, main, sub, mono }: { label: string; main: string; sub?: string; mono?: boolean }) {
  return (
    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: mono ? 'monospace' : undefined }}>{main}</div>
      {sub && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ cfg }: { cfg: { label: string; color: string; bg: string } }) {
  return (
    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function LoadingCard({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>⚠️ {message}</span>
      {onRetry && <button className="btn btn-sm btn-secondary" onClick={onRetry}>Retry</button>}
    </div>
  );
}


function RecordDrawer({ record, onClose }: { record: CommRecord; onClose: () => void }) {
  const paid = record.payments.reduce((s, p) => s + Number(p.amount), 0);
  const unpaid = Math.max(0, Number(record.commissionAmount ?? 0) - paid);
  const cfg = STATUS_CONFIG[record.commissionStatus] ?? STATUS_CONFIG.imported;
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Commission Record Detail"
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(420px, 100vw)',
          background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)',
          zIndex: 1001, overflowY: 'auto', padding: '1.5rem',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Commission Detail</h3>
          <button className="btn btn-sm btn-secondary" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Status */}
        <div style={{ marginBottom: '1rem' }}>
          <StatusBadge cfg={cfg} />
        </div>

        {/* Customer info */}
        <Section title="Customer">
          <Field label="Name" value={record.customerName} />
          <Field label="Address" value={record.customerAddress} />
          <Field label="Region" value={record.region} />
        </Section>

        {/* Job info */}
        <Section title="Job">
          <Field label="Sold Date" value={record.soldDate ? new Date(record.soldDate).toLocaleDateString() : null} />
          <Field label="Install Date" value={record.installDate ? new Date(record.installDate).toLocaleDateString() : null} />
          <Field label="Contract #" value={record.contractNumber} />
          <Field label="# Windows" value={record.numWindows} />
          <Field label="Sales Rep" value={record.salesRepName} />
        </Section>

        {/* Financial */}
        <Section title="Financials">
          <Field label="Job Amount"  value={fmt(record.jobAmount)} highlight />
          <Field label="Commission"  value={fmt(record.commissionAmount)} highlight color="#22c55e" />
          <Field label="Paid"        value={fmt(paid)} color="#22c55e" />
          <Field label="Unpaid"      value={fmt(unpaid)} color={unpaid > 0 ? '#f59e0b' : '#22c55e'} />
        </Section>

        {/* Payments */}
        {record.payments.length > 0 && (
          <Section title={`Payments (${record.payments.length})`}>
            {record.payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8125rem', borderBottom: '1px solid var(--border)' }}>
                <span>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'}</span>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(p.amount)}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Adjustments */}
        {record.adjustments.length > 0 && (
          <Section title={`Adjustments (${record.adjustments.length})`}>
            {record.adjustments.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8125rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ textTransform: 'capitalize' }}>{a.adjustmentType}</span>
                <span style={{ fontWeight: 700 }}>{fmt(a.amount)}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Notes */}
        {(record.notes || record.comments) && (
          <Section title="Notes">
            {record.notes && <p style={{ fontSize: '0.8125rem', margin: 0 }}>{record.notes}</p>}
            {record.comments && <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>{record.comments}</p>}
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, highlight, color }: { label: string; value: any; highlight?: boolean; color?: string }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8125rem', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: color || 'inherit' }}>{value}</span>
    </div>
  );
}
