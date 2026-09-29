/* cSpell:words TELEMETRYGATEWAY */
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         PHOENIX VLT-003 COMPLIANCE & JUMP TABLE TEST BATTERY             ║
 * ║         Document Identifier: TEST-PHOENIX-VLT-COMPLIANCE-001               ║
 * ║         Protocol Version: PSGC-001 / VLT-003 / VSRP-001 / MPFS-001         ║
 * ║         Authority: Headless CI / Sentinel Structural Integrity Gate        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const VLT = require('../phoenix/vlt_compliance_engine.js');
const { PhoenixLinterSuite } = require('../phoenix/phoenix_sovereign_engine.js');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       VLT-003 COMPLIANCE & JUMP TABLE VERIFICATION SUITE     ║');
console.log('║       Protocols: PSGC-001 / VLT-003 / MPFS-001 / VSRP-001    ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let passedCount = 0;

function runTest(name, fn) {
	try {
		fn();
		console.log(`  ✓ ${name}`);
		passedCount++;
	} catch (err) {
		console.error(`  ✗ FAIL: ${name}`);
		console.error(err);
		process.exit(1);
	}
}

// ── Vector 1: Structural Parser & Region Scanner ─────────────────────────────
runTest('Vector 1: scanRegions correctly identifies regions and 1-indexed lines', () => {
	const sample = [
		'// Some comment',
		'//#region [SEC-01] --- FIRST SECTION',
		'const a = 1;',
		'//#endregion',
		'//#region [SEC-02] SECOND SECTION',
		'const b = 2;',
		'//#endregion'
	].join('\n');

	const regions = VLT.scanRegions(sample);
	assert.strictEqual(regions.length, 2);
	assert.strictEqual(regions[ 0 ].sec, 'SEC-01');
	assert.strictEqual(regions[ 0 ].title, 'FIRST SECTION');
	assert.strictEqual(regions[ 0 ].line, 2);
	assert.strictEqual(regions[ 1 ].sec, 'SEC-02');
	assert.strictEqual(regions[ 1 ].title, 'SECOND SECTION');
	assert.strictEqual(regions[ 1 ].line, 5);
});

// ── Vector 2: Jump Table Formatter ──────────────────────────────────────────
runTest('Vector 2: formatJumpTable produces canonical dot-padded jump entries', () => {
	const regions = [
		{ sec: 'SEC-01', title: 'Data Contracts', line: 28, rawLine: '' },
		{ sec: 'SEC-02', title: 'Execution Core', line: 150, rawLine: '' }
	];

	const lines = VLT.formatJumpTable(regions);
	assert.strictEqual(lines.length, 2);
	assert.match(lines[ 0 ], /^\s\*\s\[SEC-01\] Data Contracts \.+ Line ~0028$/);
	assert.match(lines[ 1 ], /^\s\*\s\[SEC-02\] Execution Core \.+ Line ~0150$/);
});

// ── Vector 3: Iterative Convergence Synchronizer ────────────────────────────
runTest('Vector 3: syncJumpTable calibrates drifted line offsets to exact parity', () => {
	const driftedModule = [
		'/*',
		' * CMD-DOC-INDEX (Normative Region Jump Table)',
		' * =============================================================================',
		' * [SEC-01] Initial Core ................................. Line ~9999',
		' * [SEC-02] Terminal Core ................................ Line ~0001',
		' * =============================================================================',
		' */',
		'',
		'((root) => {',
		"	'use strict';",
		'',
		'	//#region [SEC-01] --- Initial Core',
		'	const x = 10;',
		'	//#endregion',
		'',
		'	//#region [SEC-02] --- Terminal Core',
		'	const y = 20;',
		'	//#endregion',
		'})(this);'
	].join('\n');

	const calibrated = VLT.syncJumpTable(driftedModule);
	assert.ok(!calibrated.includes('Line ~9999'));
	assert.ok(!calibrated.includes('Line ~0001'));

	const report = VLT.validateCompliance(calibrated);
	assert.strictEqual(report.compliant, true);
	assert.strictEqual(report.violations.length, 0);
	assert.strictEqual(report.regions.length, 2);
});

// ── Vector 4: Anti-Entropy Compliance & Drift Detection ─────────────────────
runTest('Vector 4: validateCompliance detects line drift, order mismatch, and tokens', () => {
	const invalidModule = [
		'/*',
		' * CMD-DOC-INDEX (Normative Region Jump Table)',
		' * =============================================================================',
		' * [SEC-01] First ........................................ Line ~0012',
		' * [SEC-03] Third ........................................ Line ~0020',
		' * =============================================================================',
		' */',
		'',
		'(function(root) {',
		"	'use strict';",
		'',
		'	//#region [SEC-01] --- First',
		'	// ...',
		'	//#endregion',
		'',
		'	//#region [SEC-03] --- Third',
		'	const z = 30;',
		'	//#endregion',
		'})(this);'
	].join('\n');

	const report = VLT.validateCompliance(invalidModule);
	assert.strictEqual(report.compliant, false);

	const types = new Set(report.violations.map((v) => v.type));
	assert.ok(types.has('ORDER'), 'Must catch out-of-order SEC-03 (expected SEC-02)');
	assert.ok(types.has('TOKEN'), 'Must catch forbidden placeholder // ...');
	assert.ok(types.has('CLOSURE'), 'Must warn on function(root) instead of arrow IIFE');
});

// ── Vector 5: Parametric Scaffolder & Archetype Generation ──────────────────
runTest('Vector 5: scaffoldModule instantiates zero-defect modules from templates', () => {
	const facadeTmplPath = path.resolve(__dirname, '../phoenix/templates/host_facade_template.js');
	const tmpl = fs.readFileSync(facadeTmplPath, 'utf8');

	const rendered = VLT.scaffoldModule(tmpl, {
		MODULE_NAME: 'TelemetryGateway',
		DOC_IDENTIFIER: 'LEDGER-PHOENIX-TELEMETRY-001'
	});

	assert.ok(rendered.includes('PHOENIX TELEMETRYGATEWAY (VLT-003)'));
	assert.ok(rendered.includes('telemetryGateway'));

	const report = VLT.validateCompliance(rendered, {
		complexityScanner: (src, th) => PhoenixLinterSuite.scanFunctionsComplexity(src, th)
	});
	assert.strictEqual(report.compliant, true, 'Scaffolded module must pass compliance gate with zero errors');
	assert.strictEqual(report.violations.length, 0);
});

// ── Vector 6: Phoenix Core Substrate Compliance Gate ────────────────────────
runTest('Vector 6: Core modules adhere strictly to VLT-003 and SonarLint S3776', () => {
	const targetModules = [
		'phoenix/sentinel_evaluator.js',
		'phoenix/vlt_compliance_engine.js'
	];

	for (const modRel of targetModules) {
		const abs = path.resolve(__dirname, '..', modRel);
		const source = fs.readFileSync(abs, 'utf8');
		const report = VLT.validateCompliance(source, {
			complexityScanner: (src, th) => PhoenixLinterSuite.scanFunctionsComplexity(src, th)
		});

		assert.strictEqual(
			report.compliant,
			true,
			`Module ${modRel} failed VLT-003 audit: ${JSON.stringify(report.violations)}`
		);
		assert.strictEqual(report.violations.length, 0);
	}
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`VLT-003 COMPLIANCE AUDIT: ${passedCount}/${passedCount} CHECKS PASSED`);
console.log('✨ 100% CLEAN TOPOLOGY: ZERO DRIFT OR COMPLEXITY DEFECTS ✨\n');
