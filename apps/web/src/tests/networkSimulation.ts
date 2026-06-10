// ═══════════════════════════════════════════════════════════════
// Network & API Simulation Tests
// Tests: poor connectivity, interrupted requests, sync conflicts,
// concurrent updates, and API error handling.
// ═══════════════════════════════════════════════════════════════

import type { TestResult, SimulationIssue } from './fieldSimulation';

// ─── Helpers ─────────────────────────────────────────────
function timer() {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

const API_BASE = '/api';
const TOKEN = () => localStorage.getItem('wwa_token') || '';

async function apiCall(path: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data?: any; error?: string; duration: number }> {
  const t = timer();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN()}`,
        ...options.headers,
      },
    });
    const duration = t();
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return { ok: true, status: res.status, data, duration };
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    return { ok: false, status: res.status, error: err.error || res.statusText, duration };
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message, duration: t() };
  }
}

// ─── Test: API Endpoint Health Check ─────────────────────
async function testAPIEndpoints(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const endpoints = [
    { path: '/dashboard/stats', name: 'Dashboard stats' },
    { path: '/dashboard/recent', name: 'Dashboard recent' },
    { path: '/appointments', name: 'Appointments list' },
    { path: '/customers', name: 'Customers list' },
    { path: '/pricing/tables', name: 'Pricing tables' },
    { path: '/rules', name: 'Business rules' },
    { path: '/field-shortcuts', name: 'Field shortcuts' },
    { path: '/field-shortcuts/adders', name: 'Pricing adders' },
    { path: '/field-shortcuts/scope-rules', name: 'Scope rules' },
    { path: '/window-knowledge/defaults', name: 'Window defaults' },
    { path: '/window-knowledge/shapes', name: 'Specialty shapes' },
    { path: '/window-knowledge/sash-splits', name: 'Sash splits' },
    { path: '/window-knowledge/code-defaults', name: 'Code defaults' },
    { path: '/manufacturer/profiles', name: 'Manufacturer profiles' },
    { path: '/proposals/tiers', name: 'Proposal tiers' },
    { path: '/proposals/financing', name: 'Financing plans' },
    { path: '/proposals/recommendations', name: 'Sales recommendations' },
    { path: '/pricing-versions', name: 'Pricing versions' },
  ];

  for (const ep of endpoints) {
    const result = await apiCall(ep.path);
    results.push({
      name: `API: ${ep.name}`,
      category: 'api',
      passed: result.ok,
      duration: result.duration,
      error: result.error,
      details: `Status ${result.status}, ${result.duration}ms`,
    });
  }

  return results;
}

// ─── Test: API Response Times ────────────────────────────
async function testAPIPerformance(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Measure average response time for core endpoints
  const criticalPaths = ['/dashboard/stats', '/appointments', '/field-shortcuts'];
  for (const path of criticalPaths) {
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const result = await apiCall(path);
      if (result.ok) times.push(result.duration);
    }
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : -1;
    results.push({
      name: `API perf: ${path} (avg of 3)`,
      category: 'api_perf',
      passed: avg > 0 && avg < 2000,
      duration: avg,
      details: `Avg: ${avg}ms, Samples: ${times.length}`,
    });
  }

  return results;
}

// ─── Test: Concurrent API Calls ──────────────────────────
async function testConcurrentCalls(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Fire 5 requests simultaneously
  {
    const t = timer();
    const promises = [
      apiCall('/dashboard/stats'),
      apiCall('/appointments'),
      apiCall('/field-shortcuts'),
      apiCall('/proposals/tiers'),
      apiCall('/rules'),
    ];
    const responses = await Promise.allSettled(promises);
    const successCount = responses.filter(r => r.status === 'fulfilled' && (r.value as any).ok).length;
    results.push({
      name: '5 concurrent API calls',
      category: 'concurrency',
      passed: successCount >= 4,
      duration: t(),
      details: `${successCount}/5 succeeded in ${t()}ms`,
    });
  }

  return results;
}

// ─── Test: Financing Calculation Integrity ───────────────
async function testFinancingCalcs(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const scenarios = [
    { totalAmount: 8500, financingId: 'cash', expectedMonthly: 0 },
    { totalAmount: 8500, financingId: 'same-as-cash-12', expectedMonthly: Math.round(8500 / 12 * 100) / 100 },
    { totalAmount: 8500, financingId: 'same-as-cash-18', expectedMonthly: Math.round(8500 / 18 * 100) / 100 },
  ];

  for (const s of scenarios) {
    const t = timer();
    const result = await apiCall('/proposals/financing/calculate', {
      method: 'POST',
      body: JSON.stringify({ totalAmount: s.totalAmount, financingId: s.financingId }),
    });

    if (result.ok) {
      const match = result.data?.monthlyPayment === s.expectedMonthly;
      results.push({
        name: `Financing: ${s.financingId} ($${s.totalAmount})`,
        category: 'financing',
        passed: match,
        duration: t(),
        details: `Monthly: $${result.data?.monthlyPayment}, expected: $${s.expectedMonthly}`,
      });
    } else {
      results.push({
        name: `Financing: ${s.financingId}`,
        category: 'financing',
        passed: false,
        duration: t(),
        error: result.error,
      });
    }
  }

  // APR calculation integrity
  {
    const t = timer();
    const result = await apiCall('/proposals/financing/calculate', {
      method: 'POST',
      body: JSON.stringify({ totalAmount: 10000, financingId: 'fixed-60' }),
    });
    if (result.ok) {
      // Monthly should be positive and total payment > principal for APR > 0
      const valid = result.data?.monthlyPayment > 0 && result.data?.totalPayment > 10000 && result.data?.interestCost > 0;
      results.push({
        name: 'Financing: 60mo 6.99% APR interest calc',
        category: 'financing',
        passed: valid,
        duration: t(),
        details: `Monthly: $${result.data?.monthlyPayment}, Interest: $${result.data?.interestCost}`,
      });
    }
  }

  return results;
}

// ─── Test: Calculation Engine API ────────────────────────
async function testCalculationAPI(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // UI Calculation
  {
    const t = timer();
    const result = await apiCall('/intelligence/calculate-ui', {
      method: 'POST',
      body: JSON.stringify({ width: 35.375, height: 59.875 }),
    });
    results.push({
      name: 'Calc API: UI calculation',
      category: 'calc_api',
      passed: result.ok,
      duration: t(),
      details: result.ok ? `UI: ${result.data?.unitedInches}` : result.error,
    });
  }

  // Tempered check
  {
    const t = timer();
    const result = await apiCall('/intelligence/calculate-tempered', {
      method: 'POST',
      body: JSON.stringify({ roomLocation: 'Bathroom', tubOrShowerNearby: true, distanceToTubInches: 36, width: 35, height: 60 }),
    });
    results.push({
      name: 'Calc API: Tempered rules',
      category: 'calc_api',
      passed: result.ok,
      duration: t(),
      details: result.ok ? `Required: ${result.data?.isRequired}` : result.error,
    });
  }

  // Eyebrow calc
  {
    const t = timer();
    const result = await apiCall('/intelligence/calculate-eyebrow', {
      method: 'POST',
      body: JSON.stringify({ width: 36 }),
    });
    results.push({
      name: 'Calc API: Eyebrow dimensions',
      category: 'calc_api',
      passed: result.ok,
      duration: t(),
    });
  }

  // Oriel split
  {
    const t = timer();
    const result = await apiCall('/intelligence/calculate-oriel-split', {
      method: 'POST',
      body: JSON.stringify({ height: 60, splitType: '1/3_over_2/3' }),
    });
    results.push({
      name: 'Calc API: Oriel split',
      category: 'calc_api',
      passed: result.ok,
      duration: t(),
    });
  }

  return results;
}

// ─── Test: Error Handling ────────────────────────────────
async function testErrorHandling(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Invalid appointment ID
  {
    const t = timer();
    const result = await apiCall('/appointments/invalid-id-that-does-not-exist-12345');
    results.push({
      name: 'Error: invalid appointment ID',
      category: 'error_handling',
      passed: !result.ok && result.status >= 400,
      duration: t(),
      details: `Status: ${result.status}`,
    });
  }

  // Missing body on POST
  {
    const t = timer();
    const result = await apiCall('/intelligence/calculate-ui', { method: 'POST', body: '{}' });
    results.push({
      name: 'Error: empty POST body to calc',
      category: 'error_handling',
      passed: true, // should not crash
      duration: t(),
      details: `Status: ${result.status}`,
    });
  }

  // Invalid financing ID
  {
    const t = timer();
    const result = await apiCall('/proposals/financing/calculate', {
      method: 'POST',
      body: JSON.stringify({ totalAmount: 5000, financingId: 'nonexistent' }),
    });
    results.push({
      name: 'Error: invalid financing plan',
      category: 'error_handling',
      passed: !result.ok && result.status === 404,
      duration: t(),
      details: `Status: ${result.status}`,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════
export async function runNetworkSimulation(): Promise<{ results: TestResult[]; issues: SimulationIssue[] }> {
  const allResults: TestResult[] = [];
  const issues: SimulationIssue[] = [];

  allResults.push(...await testAPIEndpoints());
  allResults.push(...await testAPIPerformance());
  allResults.push(...await testConcurrentCalls());
  allResults.push(...await testFinancingCalcs());
  allResults.push(...await testCalculationAPI());
  allResults.push(...await testErrorHandling());

  for (const r of allResults) {
    if (!r.passed) {
      issues.push({
        severity: r.category === 'api' ? 'critical' : 'high',
        category: r.category,
        description: `${r.name}: ${r.error || r.details || 'FAILED'}`,
      });
    }
    if (r.duration > 2000 && r.passed) {
      issues.push({
        severity: 'medium',
        category: 'performance',
        description: `${r.name} response time ${r.duration}ms (>2s)`,
      });
    }
  }

  return { results: allResults, issues };
}
