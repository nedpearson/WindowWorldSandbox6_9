#!/usr/bin/env node
/**
 * Production Environment Audit Script
 * Validates all required env vars before allowing a production build/deploy.
 * Run via: npm run audit:prod-env
 * Fails with exit code 1 if any required variable is missing.
 */

const REQUIRED = [
  {
    key: 'VITE_MAPBOX_PUBLIC_TOKEN',
    desc: 'Mapbox public browser token — required for property maps in Quick Estimate and Sketch',
    validate: (v) => v.startsWith('pk.'),
    hint: 'Get from mapbox.com → Tokens. Must start with pk.',
  },
  {
    key: 'DATABASE_URL',
    desc: 'PostgreSQL connection string for Prisma',
    validate: (v) => v.startsWith('postgres') || v.startsWith('postgresql'),
    hint: 'Set to your Railway Postgres or Supabase connection string',
  },
  {
    key: 'JWT_SECRET',
    desc: 'JWT signing secret',
    validate: (v) => v.length >= 32 && v !== 'dev-secret-change-me',
    hint: 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  },
];

const OPTIONAL = [
  { key: 'MAPBOX_PUBLIC_TOKEN', desc: 'Alias for VITE_MAPBOX_PUBLIC_TOKEN (runtime fallback)' },
  { key: 'SUPABASE_URL', desc: 'Server-side Supabase URL' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Server-side Supabase service role key' },
  { key: 'VITE_SUPABASE_URL', desc: 'Supabase project URL (optional/legacy frontend config)' },
  { key: 'VITE_SUPABASE_ANON_KEY', desc: 'Supabase anonymous/public key (optional/legacy frontend config)' },
  { key: 'VITE_GOOGLE_MAPS_BROWSER_KEY', desc: 'Google Maps JS API restricted browser key' },
  { key: 'GOOGLE_MAPS_API_KEY', desc: 'Google Maps API key for server-side geocoding' },
  { key: 'NODE_ENV', desc: 'Node environment' },
  { key: 'PORT', desc: 'Server port (default 8080)' },
];

const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN  = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

let failed = false;

console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${CYAN}  Window World Assistant -- Production Environment Audit${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════════${RESET}\n`);

console.log(`${BOLD}Required Variables:${RESET}`);
for (const req of REQUIRED) {
  const val = process.env[req.key];
  if (!val) {
    console.log(`  ${RED}✗ MISSING${RESET}  ${BOLD}${req.key}${RESET}`);
    console.log(`           ${req.desc}`);
    console.log(`           ${YELLOW}Hint: ${req.hint}${RESET}`);
    failed = true;
  } else if (req.validate && !req.validate(val)) {
    console.log(`  ${YELLOW}⚠ INVALID${RESET}  ${BOLD}${req.key}${RESET}`);
    console.log(`           ${req.desc}`);
    console.log(`           ${YELLOW}Hint: ${req.hint}${RESET}`);
    failed = true;
  } else {
    const preview = val.length > 12 ? val.substring(0, 8) + '...' + val.slice(-4) : '(short)';
    console.log(`  ${GREEN}✓ OK${RESET}       ${BOLD}${req.key}${RESET} ${YELLOW}[${preview}]${RESET}`);
  }
}

console.log(`\n${BOLD}Optional Variables:${RESET}`);
for (const opt of OPTIONAL) {
  const val = process.env[opt.key];
  if (val) {
    console.log(`  ${GREEN}✓ set${RESET}      ${opt.key}`);
  } else {
    console.log(`  ${YELLOW}– not set${RESET}  ${opt.key} (${opt.desc})`);
  }
}

console.log('');

if (failed) {
  console.log(`${RED}${BOLD}AUDIT FAILED — Fix missing variables before deploying to production.${RESET}`);
  console.log(`${YELLOW}In Railway: Project → Service → Variables → Add the missing vars → Save → Redeploy${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}AUDIT PASSED — All required environment variables are configured.${RESET}\n`);
  process.exit(0);
}
