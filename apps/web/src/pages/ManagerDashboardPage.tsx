import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Link } from 'react-router-dom';

// ── Types matching the API response shape ──
interface RepMetrics {
  id: string;
  name: string;
  email: string;
  performanceScore: number;
  trainingScore: number;
  manualCompletion: number;
  trainingScenariosPassed: number;
  trainingScenariosFailed: number;
  measurementErrorRate: number;
  contractErrorRate: number;
  followUpCompliance: number;
  quoteToCloseRate: number;
  avgTimeToResolveHours: number;
  revenueSold: number;
  openIssues: number;
  criticalIssues: number;
  businessRiskIssues: number;
}

interface DashboardIssue {
  id: string;
  jobId: string;
  customerName: string;
  repId: string;
  repName: string;
  severity: string;
  category: string;
  auditor: string;
  description: string;
  correctiveAction: string;
  createdAt: string;
  blocksProduction: boolean;
}

interface ManagerDashboardData {
  companyWide: {
    revenueSold: number;
    revenueAtRisk: number;
    jobsNeedingReview: number;
    jobsBlocked: number;
    revenueLeakageAlerts: number;
    avgQuoteToClose: number;
    commonIssueCategories: { category: string; count: number }[];
  };
  reps: RepMetrics[];
  recentIssues: DashboardIssue[];
}

export function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRep, setSelectedRep] = useState('All');
  const [issueSeverity, setIssueSeverity] = useState('All');
  const [auditorCategory, setAuditorCategory] = useState('All');

  // Drill-down states
  const [drilldownData, setDrilldownData] = useState<{ title: string, content: React.ReactNode } | null>(null);

  // ── Fetch real data from the API ──
  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getManagerDashboard()
      .then((result: ManagerDashboardData) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Failed to load manager dashboard');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Manager Accountability Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.5rem',
            }}>
              <div style={{ height: 16, width: '60%', borderRadius: 4, background: 'var(--bg-primary)', marginBottom: '0.75rem', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: 32, width: '80%', borderRadius: 6, background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in" style={{ maxWidth: 600, margin: '3rem auto', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
      </div>
    );
  }

  if (!data) return null;

  const reps = data.reps.filter(r => selectedRep === 'All' || r.id === selectedRep);
  const issues = data.recentIssues.filter(i => {
    return (selectedRep === 'All' || i.repId === selectedRep) &&
           (issueSeverity === 'All' || i.severity === issueSeverity) &&
           (auditorCategory === 'All' || i.auditor === auditorCategory);
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Drilldown Handlers
  const handleRevenueAtRiskClick = () => {
    setDrilldownData({
      title: 'Revenue At Risk Analysis',
      content: (
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Detailed view of jobs where underpricing, missing add-ons, or missed follow-ups could cost money.</p>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>Job ID</th>
                <th style={{ padding: '0.5rem' }}>Customer</th>
                <th style={{ padding: '0.5rem' }}>Rep</th>
                <th style={{ padding: '0.5rem' }}>Auditor</th>
                <th style={{ padding: '0.5rem' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {data.recentIssues.filter(i => i.auditor.includes('Revenue') || i.auditor.includes('Pricing')).map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem', color: 'var(--accent)' }}><Link to={`/appointments/${i.jobId}`}>{i.jobId.slice(0, 8)}…</Link></td>
                  <td style={{ padding: '0.5rem' }}>{i.customerName}</td>
                  <td style={{ padding: '0.5rem' }}>{i.repName}</td>
                  <td style={{ padding: '0.5rem', color: '#ef4444' }}>{i.auditor}</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{i.description}</td>
                </tr>
              ))}
              {data.recentIssues.filter(i => i.auditor.includes('Revenue') || i.auditor.includes('Pricing')).length === 0 && (
                <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>No revenue/pricing issues found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )
    });
  };

  const handleCriticalIssuesClick = () => {
    setDrilldownData({
      title: 'Critical & Business Risk Issues',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {issues.filter(i => i.severity === 'Critical' || i.severity === 'Business Risk').map(i => (
            <div key={i.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ color: '#ef4444' }}>{i.severity}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(i.createdAt).toLocaleString()}</span>
              </div>
              <h4 style={{ margin: '0.5rem 0' }}>Job: <Link to={`/appointments/${i.jobId}`}>{i.customerName}</Link> ({i.repName})</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{i.description}</p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent)' }}><strong>Action:</strong> {i.correctiveAction}</div>
            </div>
          ))}
          {issues.filter(i => i.severity === 'Critical' || i.severity === 'Business Risk').length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              ✅ No critical or business risk issues found
            </div>
          )}
        </div>
      )
    });
  };

  const handleMeasurementErrorsClick = () => {
    setDrilldownData({
      title: 'Measurement Errors Drilldown',
      content: (
        <div>
          <p style={{ color: 'var(--text-secondary)' }}>Jobs flagged by the Measurement Auditor for missing dimensions, missing photos, or unacknowledged tempered glass.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {issues.filter(i => i.category === 'Measurement').map(i => (
              <div key={i.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong>{i.customerName}</strong> ({i.repName})
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#ef4444' }}>{i.description}</p>
                <Link to={`/appointments/${i.jobId}/sketch`} className="btn btn-secondary btn-sm">Fix Sketch/Measurements</Link>
              </div>
            ))}
            {issues.filter(i => i.category === 'Measurement').length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                ✅ No measurement issues found
              </div>
            )}
          </div>
        </div>
      )
    });
  };

  return (
    <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Manager Accountability Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>System health, revenue protection, and sales rep performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select value={selectedRep} onChange={e => setSelectedRep(e.target.value)} className="form-select">
            <option value="All">All Reps</option>
            {data.reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {/* Global KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <DashboardCard title="Revenue Sold" value={formatCurrency(data.companyWide.revenueSold)} type="success" />
        <DashboardCard title="Revenue At Risk" value={formatCurrency(data.companyWide.revenueAtRisk)} type="danger" onClick={handleRevenueAtRiskClick} />
        <DashboardCard title="Jobs Blocked from Production" value={data.companyWide.jobsBlocked.toString()} type="danger" onClick={handleCriticalIssuesClick} />
        <DashboardCard title="Jobs Needing Manager Review" value={data.companyWide.jobsNeedingReview.toString()} type="warning" />
        <DashboardCard title="Avg Quote-to-Close" value={`${data.companyWide.avgQuoteToClose}%`} type="neutral" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Most Common Issue Categories */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Most Common Issue Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.companyWide.commonIssueCategories.length > 0 ? (
              data.companyWide.commonIssueCategories.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{c.category}</span>
                  <span style={{ fontWeight: 600, background: 'var(--bg-primary)', padding: '0.2rem 0.6rem', borderRadius: 12 }}>{c.count}</span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                ✅ No open issues
              </div>
            )}
          </div>
        </div>

        {/* Global Auditor Issue Filters */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Auditor & Severity Filters</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity Level</label>
              <select value={issueSeverity} onChange={e => setIssueSeverity(e.target.value)} className="form-select" style={{ width: '100%' }}>
                <option value="All">All Severities</option>
                <option value="Minor">Level 1 - Minor</option>
                <option value="Warning">Level 2 - Warning</option>
                <option value="Critical">Level 3 - Critical</option>
                <option value="Business Risk">Level 4 - Business Risk</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Auditor Category</label>
              <select value={auditorCategory} onChange={e => setAuditorCategory(e.target.value)} className="form-select" style={{ width: '100%' }}>
                <option value="All">All Auditors</option>
                <option value="Measurement Auditor">Measurement</option>
                <option value="Contract Auditor">Contract</option>
                <option value="Pricing Auditor">Pricing</option>
                <option value="Follow-Up Auditor">Follow-Up</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Issues List */}
      {issues.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Open Issues ({issues.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {issues.slice(0, 20).map(issue => (
              <div key={issue.id} style={{
                padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid var(--border)',
                borderLeft: `4px solid ${issue.severity === 'Critical' || issue.severity === 'Business Risk' ? '#ef4444' : issue.severity === 'Warning' ? '#f59e0b' : 'var(--border)'}`,
                background: 'var(--bg-primary)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SeverityBadge severity={issue.severity} />
                    <Link to={`/appointments/${issue.jobId}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>{issue.customerName}</Link>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({issue.repName})</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rep Performance Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <h3 style={{ margin: 0, padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>Rep Accountability & Performance</h3>
        {reps.length > 0 ? (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>Sales Rep</th>
                <th style={{ padding: '1rem' }}>Performance Score</th>
                <th style={{ padding: '1rem' }}>Training / Manual Completion</th>
                <th style={{ padding: '1rem' }}>Scenarios Passed/Failed</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={handleMeasurementErrorsClick}>Meas. Error Rate 🔍</th>
                <th style={{ padding: '1rem' }}>Contract Error Rate</th>
                <th style={{ padding: '1rem' }}>Follow-Up Comp.</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={handleCriticalIssuesClick}>Critical/Risk Issues 🔍</th>
                <th style={{ padding: '1rem' }}>Revenue Sold</th>
                <th style={{ padding: '1rem' }}>Time to Resolve</th>
              </tr>
            </thead>
            <tbody>
              {reps.map(rep => (
                <tr key={rep.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{rep.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <ScoreBadge score={rep.performanceScore} />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                      <span>Training: <ScoreBadge score={rep.trainingScore} mini /></span>
                      <span>Manual: <ScoreBadge score={rep.manualCompletion} mini /></span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    <span style={{ color: '#22c55e' }}>{rep.trainingScenariosPassed}</span> / <span style={{ color: '#ef4444' }}>{rep.trainingScenariosFailed}</span>
                  </td>
                  <td style={{ padding: '1rem', color: rep.measurementErrorRate > 5 ? '#ef4444' : 'inherit' }}>{rep.measurementErrorRate}%</td>
                  <td style={{ padding: '1rem', color: rep.contractErrorRate > 2 ? '#ef4444' : 'inherit' }}>{rep.contractErrorRate}%</td>
                  <td style={{ padding: '1rem', color: rep.followUpCompliance < 90 ? '#ef4444' : 'inherit' }}>{rep.followUpCompliance}%</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {rep.criticalIssues > 0 && <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>{rep.criticalIssues} C</span>}
                      {rep.businessRiskIssues > 0 && <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#b91c1c', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>{rep.businessRiskIssues} R</span>}
                      {rep.criticalIssues === 0 && rep.businessRiskIssues === 0 && <span style={{ color: 'var(--text-muted)' }}>0</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(rep.revenueSold)}</td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{rep.avgTimeToResolveHours} hrs</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No sales reps found. Add users with the "sales_rep" role to see performance data here.
          </div>
        )}
      </div>

      {/* Drilldown Modal */}
      {drilldownData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="fade-in" style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{drilldownData.title}</h2>
              <button onClick={() => setDrilldownData(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            {drilldownData.content}
          </div>
        </div>
      )}

    </div>
  );
}

function DashboardCard({ title, value, type, onClick }: { title: string, value: string, type: 'success' | 'danger' | 'warning' | 'neutral', onClick?: () => void }) {
  let color = 'var(--text-primary)';

  if (type === 'success') color = '#22c55e';
  if (type === 'danger') color = '#ef4444';
  if (type === 'warning') color = '#f59e0b';

  return (
    <div 
      onClick={onClick}
      style={{ 
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.5rem',
        cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s',
        boxShadow: onClick ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ color, fontSize: '2rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ScoreBadge({ score, mini = false }: { score: number, mini?: boolean }) {
  let color = '#22c55e'; // green
  if (score < 80) color = '#f59e0b'; // orange
  if (score < 60) color = '#ef4444'; // red

  return (
    <span style={{ 
      background: `${color}15`, color, padding: mini ? '0.1rem 0.3rem' : '0.25rem 0.5rem', 
      borderRadius: 6, fontWeight: 600, fontSize: mini ? '0.75rem' : '0.9rem' 
    }}>
      {score}%
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    'Minor': { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
    'Warning': { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    'Critical': { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    'Business Risk': { bg: 'rgba(185,28,28,0.2)', text: '#b91c1c' },
  };
  const c = colors[severity] || colors['Minor'];
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '0.15rem 0.5rem', borderRadius: 4,
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    }}>
      {severity}
    </span>
  );
}
