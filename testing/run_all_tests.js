/**
 * @fileoverview Master Zero-Dependency Sovereign Test Orchestrator
 *
 * Protocols: VSRP-001 / SDCP-001 / PERSIST-001 / MPFS-001 / PGE-DSL-1
 * Authority: Host SSOT | Master Test Runner
 *
 * Runs all sovereign test suites sequentially with zero external npm dependencies:
 * 1. Emberlight Sentinel Headless Audit Battery (21 Passes / 134 checks)
 * 2. Phoenix Sovereign Substrate & Governance Suite (8 Sections / 48 checks)
 * 3. Static Syntax Compilation & Ast Integrity Battery
 *
 * Usage: node testing/run_all_tests.js
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const testSuites = [
  {
    name: 'Emberlight Sentinel Headless Audit (Pass 1-21)',
    file: 'testing/test_sentinel.js',
  },
  {
    name: 'Phoenix Sovereign Engine & Governance Substrate (SEC 01-16)',
    file: 'testing/test_phoenix.js',
  },
  {
    name: 'Static Syntax Compilation Battery',
    file: 'testing/test_syntax.js',
  },
  {
    name: 'Sentinel Anti-Theater Mutation Crucible',
    file: 'testing/test_mutation.js',
  },
  {
    name: 'STCP Transduction & Synarche Parser Suite',
    file: 'testing/test_synarche_parser.js',
  },
];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       EMBERLIGHT ZERO-DEPENDENCY MASTER TEST RUNNER          ║');
console.log('║       Protocols: VSRP-001 / SDCP-001 / PERSIST-001           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let totalSuites = testSuites.length;
let passedSuites = 0;
let failedSuites = 0;

for (const suite of testSuites) {
  console.log(`\n▶ RUNNING: ${suite.name} [${suite.file}]`);
  console.log('─'.repeat(64));

  const startTime = Date.now();
  const res = spawnSync(process.execPath, [suite.file], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  const duration = Date.now() - startTime;

  if (res.status === 0) {
    passedSuites++;
    console.log(`\n✔ PASS: ${suite.name} (${duration}ms)`);
  } else {
    failedSuites++;
    console.error(`\n✖ FAIL: ${suite.name} (Exit code: ${res.status}, ${duration}ms)`);
  }
}

console.log('\n================================================================');
console.log(`MASTER AUDIT SUMMARY: ${passedSuites}/${totalSuites} SUITES PASSED`);
console.log('================================================================');

if (failedSuites === 0) {
  console.log('✨ ALL SOVEREIGN SUITES 100% SUCCESSFUL: ZERO DRIFT DETECTED ✨\n');
  process.exit(0);
} else {
  console.error(`❌ MASTER AUDIT FAILED: ${failedSuites} SUITES FAILED\n`);
  process.exit(1);
}
