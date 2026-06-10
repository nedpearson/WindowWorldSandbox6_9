import { spawn } from 'child_process';
import path from 'path';

// Start server using development command
const serverProcess = spawn('npm', ['run', 'dev:server'], {
  cwd: path.resolve(process.cwd()),
  shell: true,
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[Server] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server Error] ${data.toString().trim()}`);
});

// Give it 8 seconds to boot up, then fetch endpoints
setTimeout(async () => {
  let passed = true;
  const baseUrl = 'http://localhost:3001/api';
  
  const endpointsToTest = [
    { path: '/health', expectedStatus: 200 },
    { path: '/version', expectedStatus: 200 },
    { path: '/auth/me', expectedStatus: 401 }, // Needs auth
    { path: '/appointments', expectedStatus: 401 },
    { path: '/customers', expectedStatus: 401 },
    { path: '/openings/123', expectedStatus: 401 },
    { path: '/sketches/123', expectedStatus: 401 },
    { path: '/pricing-versions/calculate', expectedStatus: 401, method: 'POST' },
    { path: '/export/proposal/123', expectedStatus: 401, method: 'GET' },
    { path: '/sync/outbox', expectedStatus: 401, method: 'POST' },
  ];

  try {
    for (const ep of endpointsToTest) {
      console.log(`[SMOKE] Testing ${ep.method || 'GET'} ${ep.path}...`);
      const res = await fetch(`${baseUrl}${ep.path}`, { method: ep.method || 'GET' });
      if (res.status === ep.expectedStatus || (ep.expectedStatus === 200 && res.ok)) {
        console.log(`  ✓ Status ${res.status} (Expected: ${ep.expectedStatus})`);
      } else {
        console.error(`  ✗ Status ${res.status} (Expected: ${ep.expectedStatus})`);
        passed = false;
      }
    }

    if (passed) {
      console.log('SMOKE TEST: PASSED ALL ROUTES');
      serverProcess.kill('SIGINT');
      setTimeout(() => process.exit(0), 100);
    } else {
      console.error('SMOKE TEST: FAILED - Endpoint mismatches');
      serverProcess.kill('SIGINT');
      setTimeout(() => process.exit(1), 100);
    }
  } catch (err) {
    console.error('SMOKE TEST: FAILED - Could not connect to API:', err.message);
    serverProcess.kill('SIGINT');
    setTimeout(() => process.exit(1), 100);
  }
}, 8000);
