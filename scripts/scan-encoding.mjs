#!/usr/bin/env node
/**
 * scan-encoding.mjs
 *
 * Scans source files for mojibake / corrupted UTF-8 characters.
 * Run: node scripts/scan-encoding.mjs
 * Or:  npm run scan:encoding
 *
 * Fails (exit 1) if any mojibake sequences are found in checked files.
 * Warns (but does not fail) for emoji in comment-only lines.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// File extensions to check
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.sql']);

// Directories to skip
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo']);

// These mojibake patterns are definitive signs of encoding corruption.
// They result from UTF-8 bytes being decoded as Windows-1252 or Latin-1.
const MOJIBAKE_PATTERNS = [
  // Multi-byte UTF-8 read as single-byte Latin-1
  { pattern: /ð[ŸŠ]/, label: 'emoji decoded as Latin-1 (ðŸ...)' },
  { pattern: /â€[""''–—•]|â€[œžŸ]|â€[˜™]/, label: 'curly quotes/dashes as Latin-1 (â€...)' },
  { pattern: /â†[''→←↑↓]|â†\x91|â†\x92/, label: 'arrows decoded as Latin-1 (â†...)' },
  { pattern: /âœ[""']|âœ\x93|âœ\x94/, label: 'checkmark/cross as Latin-1 (âœ...)' },
  { pattern: /Ã[¡-¿]/, label: 'accented chars as Latin-1 (Ã...)' },
  { pattern: /Â[°-¿]/, label: 'Latin-1 supplement (Â...)' },
  // Replacement character
  { pattern: /\uFFFD/, label: 'Unicode replacement character (U+FFFD)' },
  // Common specific mojibake sequences
  { pattern: /â€"/, label: 'em-dash as mojibake (â€")' },
  { pattern: /â€"/, label: 'en-dash as mojibake (â€")' },
  { pattern: /â€œ/, label: 'open quote as mojibake (â€œ)' },
  { pattern: /â€/, label: 'close quote as mojibake (â€)' },
  { pattern: /â€™/, label: "apostrophe as mojibake (â€™)" },
  { pattern: /â€˜/, label: "open single quote as mojibake (â€˜)" },
  { pattern: /â€¢/, label: 'bullet as mojibake (â€¢)' },
  { pattern: /âœ"/, label: 'checkmark as mojibake (âœ")' },
  { pattern: /â†'/, label: 'right arrow as mojibake (â†\')' },
  { pattern: /ðŸ"–/, label: 'book emoji as mojibake (ðŸ"–)' },
  { pattern: /ðŸŽ"/, label: 'graduation cap emoji as mojibake (ðŸŽ")' },
  { pattern: /ðŸ"/, label: 'magnifier emoji as mojibake (ðŸ")' },
];

// Directories and files that should be exempt from the scan
const EXEMPT_PATHS = [
  'scripts/scan-encoding.mjs', // this file itself
  'scripts/scan-encoding.js',  // legacy version of this script (contains example strings)
];

// ---------------------------------------------------------------------------

let totalFiles = 0;
let errorCount = 0;
const errors = [];

function walkDir(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (stat.isFile() && EXTENSIONS.has(extname(entry))) {
      const relPath = relative(ROOT, fullPath).replace(/\\/g, '/');

      // Check exemptions
      if (EXEMPT_PATHS.some(e => relPath.endsWith(e))) continue;

      // Only check web/server source dirs, not node_modules etc.
      if (!relPath.startsWith('apps/') && !relPath.startsWith('server/') && !relPath.startsWith('scripts/')) continue;

      checkFile(fullPath, relPath);
    }
  }
}

function checkFile(fullPath, relPath) {
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    return;
  }

  totalFiles++;
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Skip pure comment lines for emoji (they're just decorative separators)
    const isCommentLine = /^\s*(\/\/|#|\*)\s*/.test(line) && !/[^\x00-\x7F]{3,}/.test(line.replace(/^\s*(\/\/|#|\*)\s*/, ''));

    for (const { pattern, label } of MOJIBAKE_PATTERNS) {
      if (pattern.test(line)) {
        // Allow in comment-only lines IF it's just a separator comment (not actual content)
        const isJustSeparator = isCommentLine && line.trim().length < 10;
        if (isJustSeparator) continue;

        errors.push({ file: relPath, line: lineNum, text: line.trim().slice(0, 120), label });
        errorCount++;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log('\n[scan:encoding] Scanning source files for mojibake / encoding corruption...\n');
walkDir(ROOT);

if (errorCount === 0) {
  console.log(`[scan:encoding] PASS — scanned ${totalFiles} files, no encoding issues found.\n`);
  process.exit(0);
} else {
  console.error(`[scan:encoding] FAIL — found ${errorCount} encoding issue(s) in ${totalFiles} files:\n`);
  for (const e of errors) {
    console.error(`  ${e.file}:${e.line}`);
    console.error(`    Type:  ${e.label}`);
    console.error(`    Line:  ${e.text}`);
    console.error('');
  }
  console.error(`Fix all encoding issues before committing.\n`);
  process.exit(1);
}
