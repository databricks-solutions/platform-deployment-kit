#!/usr/bin/env node

/**
 * Script to collect and aggregate code coverage from Playwright tests
 * Uses v8-to-istanbul to convert V8 coverage data into real Istanbul
 * line/branch/function coverage reports.
 */

const v8toIstanbul = require('v8-to-istanbul');
const fs = require('fs');
const path = require('path');

const COVERAGE_DIR = path.join(__dirname, '../.coverage');
const REPORT_DIR = path.join(__dirname, '../coverage/playwright');
const DEPLOY_DIR = path.join(__dirname, '../deploy');

const SOURCE_FILES = [
  'js/app.js',
  'js/utils.js',
  'js/validators.js',
  'js/network-calculator.js',
  'js/template-engine.js',
  'js/template-loader.js',
  'js/terraform-generator.js',
  'js/analytics.js',
  'js/help-content.js',
];

// Ensure output directory exists
fs.mkdirSync(REPORT_DIR, { recursive: true });

console.log('Collecting coverage data...');

// Read all coverage JSON files
const coverageFiles = fs.existsSync(COVERAGE_DIR)
  ? fs.readdirSync(COVERAGE_DIR).filter(f => f.endsWith('.json'))
  : [];

if (coverageFiles.length === 0) {
  console.log('No coverage files found. Make sure to run tests with coverage enabled.');
  process.exit(1);
}

console.log(`Found ${coverageFiles.length} coverage file(s)`);

// Collect all V8 entries keyed by relative path (e.g. "js/app.js")
// Each key maps to an array of V8 function coverage arrays (one per test run).
const v8EntriesByFile = {};

for (const file of coverageFiles) {
  let coverageData;
  try {
    coverageData = JSON.parse(fs.readFileSync(path.join(COVERAGE_DIR, file), 'utf8'));
  } catch (e) {
    console.warn(`Skipping ${file}: ${e.message}`);
    continue;
  }

  if (!Array.isArray(coverageData)) continue;

  for (const entry of coverageData) {
    const url = entry.url || '';
    if (!url) continue;

    // Match URLs like http://localhost:8000/js/app.js
    let relativePath;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\//, ''); // strip leading /
      if (SOURCE_FILES.includes(pathname)) {
        relativePath = pathname;
      }
    } catch (_) {
      continue;
    }

    if (!relativePath) continue;

    if (!v8EntriesByFile[relativePath]) {
      v8EntriesByFile[relativePath] = [];
    }
    if (entry.functions && entry.functions.length > 0) {
      v8EntriesByFile[relativePath].push(entry.functions);
    }
  }
}

const foundFiles = Object.keys(v8EntriesByFile);
if (foundFiles.length === 0) {
  console.log('No matching JS coverage entries found in the collected data.');
  process.exit(1);
}

console.log(`Processing ${foundFiles.length} source file(s)...\n`);

// Convert each file's V8 coverage to Istanbul format and merge across runs
async function processFiles() {
  const mergedIstanbul = {}; // relativePath -> Istanbul coverage data

  for (const relativePath of SOURCE_FILES) {
    const localFilePath = path.join(DEPLOY_DIR, relativePath);

    if (!fs.existsSync(localFilePath)) {
      console.warn(`Source file not found, skipping: ${localFilePath}`);
      continue;
    }

    const sourceContent = fs.readFileSync(localFilePath, 'utf8');
    const runsList = v8EntriesByFile[relativePath] || [];

    if (runsList.length === 0) {
      // File was never loaded — create zero coverage
      const converter = v8toIstanbul(localFilePath, 0, { source: sourceContent });
      await converter.load();
      // Apply empty coverage (all zero)
      converter.applyCoverage([]);
      const istanbul = converter.toIstanbul();
      mergedIstanbul[relativePath] = istanbul[Object.keys(istanbul)[0]];
      continue;
    }

    let merged = null;

    for (const functions of runsList) {
      const converter = v8toIstanbul(localFilePath, 0, { source: sourceContent });
      await converter.load();
      converter.applyCoverage(functions);
      const istanbul = converter.toIstanbul();
      const fileKey = Object.keys(istanbul)[0];
      const data = istanbul[fileKey];

      if (!merged) {
        merged = data;
      } else {
        // Merge: take max of each counter (union of covered areas)
        for (const id of Object.keys(data.s)) {
          merged.s[id] = Math.max(merged.s[id] || 0, data.s[id] || 0);
        }
        for (const id of Object.keys(data.f)) {
          merged.f[id] = Math.max(merged.f[id] || 0, data.f[id] || 0);
        }
        for (const id of Object.keys(data.b)) {
          if (!merged.b[id]) merged.b[id] = data.b[id];
          else {
            merged.b[id] = merged.b[id].map((v, i) => Math.max(v, data.b[id][i] || 0));
          }
        }
      }
    }

    mergedIstanbul[relativePath] = merged;
  }

  return mergedIstanbul;
}

processFiles().then(mergedIstanbul => {
  // ---- Text summary ----
  printTextSummary(mergedIstanbul);

  // ---- HTML report ----
  const html = generateHTML(mergedIstanbul);
  const htmlPath = path.join(REPORT_DIR, 'index.html');
  fs.writeFileSync(htmlPath, html);

  // ---- Istanbul JSON (for tooling) ----
  const jsonPath = path.join(REPORT_DIR, 'coverage-final.json');
  // Build a flat map keyed by absolute file path
  const finalJson = {};
  for (const [rel, data] of Object.entries(mergedIstanbul)) {
    if (data) {
      finalJson[path.join(DEPLOY_DIR, rel)] = data;
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(finalJson, null, 2));

  console.log(`\nReports written to: ${REPORT_DIR}/`);
  console.log(`  HTML:             ${htmlPath}`);
  console.log(`  JSON:             ${jsonPath}`);
}).catch(err => {
  console.error('Coverage processing failed:', err);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcStats(data) {
  if (!data) {
    return { stmts: [0, 0], funcs: [0, 0], branches: [0, 0], lines: [0, 0] };
  }

  const stmtTotal = Object.keys(data.s).length;
  const stmtCovered = Object.values(data.s).filter(v => v > 0).length;

  const funcTotal = Object.keys(data.f).length;
  const funcCovered = Object.values(data.f).filter(v => v > 0).length;

  let branchTotal = 0;
  let branchCovered = 0;
  for (const counts of Object.values(data.b)) {
    branchTotal += counts.length;
    branchCovered += counts.filter(v => v > 0).length;
  }

  // Lines: use statementMap to determine which lines are covered
  const lineMap = {};
  for (const [id, loc] of Object.entries(data.statementMap || {})) {
    const line = loc.start.line;
    if (lineMap[line] === undefined) lineMap[line] = 0;
    lineMap[line] = Math.max(lineMap[line], data.s[id] || 0);
  }
  const lineTotal = Object.keys(lineMap).length;
  const lineCovered = Object.values(lineMap).filter(v => v > 0).length;

  return {
    stmts: [stmtCovered, stmtTotal],
    funcs: [funcCovered, funcTotal],
    branches: [branchCovered, branchTotal],
    lines: [lineCovered, lineTotal],
  };
}

function pct(covered, total) {
  if (total === 0) return '100.00';
  return ((covered / total) * 100).toFixed(2);
}

function printTextSummary(mergedIstanbul) {
  const COL = 30;
  const header = [
    'File'.padEnd(COL),
    'Stmts'.padStart(8),
    'Branch'.padStart(8),
    'Funcs'.padStart(8),
    'Lines'.padStart(8),
  ].join(' | ');
  const sep = '-'.repeat(header.length);

  console.log('\n' + sep);
  console.log(header);
  console.log(sep);

  const totals = { stmts: [0, 0], funcs: [0, 0], branches: [0, 0], lines: [0, 0] };

  for (const rel of SOURCE_FILES) {
    const data = mergedIstanbul[rel];
    const s = calcStats(data);

    for (const k of ['stmts', 'funcs', 'branches', 'lines']) {
      totals[k][0] += s[k][0];
      totals[k][1] += s[k][1];
    }

    const row = [
      rel.padEnd(COL),
      `${pct(s.stmts[0], s.stmts[1])}%`.padStart(8),
      `${pct(s.branches[0], s.branches[1])}%`.padStart(8),
      `${pct(s.funcs[0], s.funcs[1])}%`.padStart(8),
      `${pct(s.lines[0], s.lines[1])}%`.padStart(8),
    ].join(' | ');
    console.log(row);
  }

  console.log(sep);
  const allRow = [
    'All files'.padEnd(COL),
    `${pct(totals.stmts[0], totals.stmts[1])}%`.padStart(8),
    `${pct(totals.branches[0], totals.branches[1])}%`.padStart(8),
    `${pct(totals.funcs[0], totals.funcs[1])}%`.padStart(8),
    `${pct(totals.lines[0], totals.lines[1])}%`.padStart(8),
  ].join(' | ');
  console.log(allRow);
  console.log(sep + '\n');
}

function coverageClass(p) {
  const n = parseFloat(p);
  if (n >= 80) return 'high';
  if (n >= 50) return 'medium';
  return 'low';
}

function generateHTML(mergedIstanbul) {
  const rows = SOURCE_FILES.map(rel => {
    const data = mergedIstanbul[rel];
    const s = calcStats(data);
    const sp = pct(s.stmts[0], s.stmts[1]);
    const bp = pct(s.branches[0], s.branches[1]);
    const fp = pct(s.funcs[0], s.funcs[1]);
    const lp = pct(s.lines[0], s.lines[1]);
    return `<tr>
      <td>${rel}</td>
      <td class="cov ${coverageClass(sp)}">${sp}%<br><small>${s.stmts[0]}/${s.stmts[1]}</small></td>
      <td class="cov ${coverageClass(bp)}">${bp}%<br><small>${s.branches[0]}/${s.branches[1]}</small></td>
      <td class="cov ${coverageClass(fp)}">${fp}%<br><small>${s.funcs[0]}/${s.funcs[1]}</small></td>
      <td class="cov ${coverageClass(lp)}">${lp}%<br><small>${s.lines[0]}/${s.lines[1]}</small></td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Coverage Report</title>
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #ccc; padding: 20px; }
    h1 { color: #fff; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #444; padding: 8px 14px; text-align: right; }
    th { background: #333; color: #fff; }
    td:first-child { text-align: left; }
    .cov.high { color: #6ec96e; }
    .cov.medium { color: #e6c86e; }
    .cov.low { color: #e06c75; }
    small { color: #888; }
    p.ts { color: #666; font-size: 0.85em; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>Playwright Coverage Report</h1>
  <table>
    <thead>
      <tr>
        <th>File</th>
        <th>Statements</th>
        <th>Branches</th>
        <th>Functions</th>
        <th>Lines</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="ts">Generated: ${new Date().toISOString()}</p>
</body>
</html>`;
}
