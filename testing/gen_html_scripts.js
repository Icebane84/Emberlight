#!/usr/bin/env node
// cSpell:ignore SSOT VSRP
/**
 * @fileoverview Drift Checker — Audits `index.html` against the SSOT load order.
 *
 * Run: node testing/gen_html_scripts.js
 *
 * Exits 0 if index.html script block is a superset of load_order.js (minus script.js,
 * which is intentionally absent from the browser entry point).
 * Exits 1 and prints the diff if drift is detected.
 *
 * @protocol VSRP-001
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LOAD_ORDER = require('./load_order.js');

// script.js is intentionally excluded from index.html (browser bootstrap runs
// separately; it is present in the test harness context for headless coverage).
const BROWSER_ONLY_EXCLUDED = new Set(['script.js']);

// ── Parse index.html for <script src="..."> tags ──────────────────────────────
const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SCRIPT_TAG_RE = /<script\s+src="([^"]+)"/g;
const htmlScripts = [];
let m;
while ((m = SCRIPT_TAG_RE.exec(htmlSrc)) !== null) {
  htmlScripts.push(m[1]);
}
const htmlSet = new Set(htmlScripts);

// ── Expected browser list = SSOT minus headless-only exclusions ───────────────
const expectedBrowserScripts = LOAD_ORDER.filter(s => !BROWSER_ONLY_EXCLUDED.has(s));

let driftDetected = false;

console.log('=== EMBERLIGHT SCRIPT LOAD ORDER DRIFT CHECKER ===\n');

// 1. Missing from index.html
const missingFromHtml = expectedBrowserScripts.filter(s => !htmlSet.has(s));
if (missingFromHtml.length > 0) {
  driftDetected = true;
  console.error('[DRIFT] The following scripts are in load_order.js but MISSING from index.html:');
  missingFromHtml.forEach(s => console.error(`  - ${s}`));
  console.error('');
}

// 2. Extra in index.html (not in SSOT — should be added to load_order.js)
const extraInHtml = htmlScripts.filter(s => !LOAD_ORDER.includes(s));
if (extraInHtml.length > 0) {
  driftDetected = true;
  console.error('[DRIFT] The following scripts are in index.html but MISSING from load_order.js:');
  extraInHtml.forEach(s => console.error(`  - ${s}`));
  console.error('');
}

// 3. Order check — warn if relative order differs
const htmlOrderFiltered = htmlScripts.filter(s => expectedBrowserScripts.includes(s));
let orderOk = true;
for (let i = 0; i < expectedBrowserScripts.length; i++) {
  if (htmlOrderFiltered[i] !== expectedBrowserScripts[i]) {
    orderOk = false;
    break;
  }
}
if (!orderOk) {
  driftDetected = true;
  console.error('[DRIFT] Script load ORDER differs between load_order.js and index.html.');
  console.error('  SSOT order (browser subset):');
  expectedBrowserScripts.forEach((s, i) => {
    const htmlPos = htmlOrderFiltered.indexOf(s);
    const marker = htmlPos !== i ? ' ← ORDER MISMATCH' : '';
    console.error(`    [${String(i).padStart(2, '0')}] ${s}${marker}`);
  });
  console.error('');
}

if (!driftDetected) {
  console.log(`[OK] No drift detected. ${expectedBrowserScripts.length} scripts match between`);
  console.log('     testing/load_order.js and index.html.');
  console.log('');
  // Print expected <script> block for reference
  console.log('-- Expected index.html <script> block (canonical order) --');
  const groups = [
    { label: '1. Core Foundations & Host Harness', end: 3 },
    { label: '2. World & Ecology Systems',         end: 5 },
    { label: '3. Audio & Input Peripheral Drivers',end: 9 },
    { label: '4. Icon & Asset Bakers',             end: 13 },
    { label: '5. Rendering Pipeline',              end: 29 },
    { label: '6. Game Logic & State Systems',      end: 40 },
    { label: '7. Orchestration & Entry Point',     end: 42 },
  ];
  expectedBrowserScripts.forEach(s => {
    console.log(`    <script src="${s}"></script>`);
  });
  process.exit(0);
} else {
  process.exit(1);
}
