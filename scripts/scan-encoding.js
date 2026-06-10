#!/usr/bin/env node
// scripts/scan-encoding.js
// Scans source files for mojibake/corrupted unicode patterns.
// Run: node scripts/scan-encoding.js
// Add to CI: npm run scan:encoding

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCAN_DIRS = ['apps/web/src', 'server/src'];
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// Patterns that indicate encoding corruption:
// - ðŸ  = UTF-8 multi-byte emoji read as Latin-1 (e.g. U+1F3E0 read as two chars)
// - âœ  = corrupted checkmark (✓ or ✔)
// - â€  = corrupted em-dash or smart quote
// - Ã   = corrupted high codepoint
// - Â   = spurious byte from Latin-1 misread
// - \\ud83 or \\udc = JSON-escaped surrogate pairs in source (should be actual emoji or removed)
const CORRUPT_PATTERNS = [
  /\u00f0\u009f/,        // ðŸ (0xF0 0x9F = start of 4-byte emoji, read as Latin-1)
  /\u00e2\u009c/,        // âœ (corrupted checkmark)
  /\u00e2\u0080/,        // â€ (corrupted em-dash / quote)
  /\u00c3[\u0080-\u00bf]/,  // Ã + continuation byte
  /\u00c2[\u0080-\u00bf]/,  // Â + continuation byte (spurious BOM-like sequences)
  /\\ud83[0-9a-f]/i,    // JSON-escaped high surrogate in source
  /\\udc[0-9a-f]{2}/i,  // JSON-escaped low surrogate in source
];

const CORRUPT_PATTERN_NAMES = [
  'ðŸ (corrupted emoji start)',
  'âœ (corrupted checkmark)',
  'â€ (corrupted em-dash/quote)',
  'Ã (corrupted high codepoint)',
  'Â (spurious Latin-1 byte)',
  '\\ud83x (JSON-escaped surrogate)',
  '\\udcxx (JSON-escaped low surrogate)',
];

let totalIssues = 0;
const issues = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, i) => {
    CORRUPT_PATTERNS.forEach((pattern, pi) => {
      if (pattern.test(line)) {
        issues.push({
          file: filePath,
          line: i + 1,
          pattern: CORRUPT_PATTERN_NAMES[pi],
          content: line.trim().substring(0, 100),
        });
        totalIssues++;
      }
    });
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
      walkDir(fullPath);
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      scanFile(fullPath);
    }
  }
}

// Run from project root
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

console.log('Scanning for encoding corruption...\n');
for (const dir of SCAN_DIRS) {
  walkDir(dir);
}

if (issues.length === 0) {
  console.log('✓ No encoding corruption found.\n');
  process.exit(0);
} else {
  console.error(`✗ Found ${issues.length} corruption issue(s):\n`);
  for (const issue of issues) {
    const rel = path.relative(projectRoot, issue.file);
    console.error(`  ${rel}:${issue.line} [${issue.pattern}]`);
    console.error(`    ${issue.content}`);
    console.error('');
  }
  console.error('Fix: Use the file editor tools (never PowerShell Set-Content/Get-Content for source files).');
  console.error('Root cause: PowerShell defaults to Windows-1252 encoding when reading/writing UTF-8 files.');
  process.exit(1);
}
