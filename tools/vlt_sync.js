#!/usr/bin/env node
/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         PHOENIX VLT-003 SYNCHRONIZER & COMPLIANCE CLI (VLT-003)         ║
 * ║         Document Identifier: LEDGER-PHOENIX-VLT-SYNC-CLI-001               ║
 * ║         Protocol Version: PSGC-001 / VLT-003 / VSRP-001 / MPFS-001         ║
 * ║         Authority: Sovereign Dev Tooling | Tri-Mode Compliance Runner      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const fs = require('fs');
const path = require('path');
const VLT = require('../phoenix/vlt_compliance_engine.js');
let LinterSuite = null;
try {
	const { PhoenixLinterSuite } = require('../phoenix/phoenix_sovereign_engine.js');
	LinterSuite = PhoenixLinterSuite;
} catch {
	// Standalone fallback
}

/**
 * Prints CLI usage instructions.
 */
function printHelp() {
	console.log(`
Phoenix VLT-003 Compliance & Scaffolding Tool

Usage:
  node tools/vlt_sync.js --check [files...]         Audit files for VLT compliance & drift
  node tools/vlt_sync.js --fix [files...]           Synchronize CMD-DOC-INDEX jump tables in place
  node tools/vlt_sync.js --scaffold <type> <path>   Generate new compliant module from template

Supported Scaffolding Archetypes:
  facade       Host Substrate Facade / Gateway (arrow IIFE, singleton bridge)
  cartridge    VSRP-001 Simulation Cartridge (9-method lifecycle, PERSIST-001 heap)
  transduction Pure Engine / Computational Transducer (AST parser, lexer)

Examples:
  node tools/vlt_sync.js --check phoenix/sentinel_evaluator.js
  node tools/vlt_sync.js --fix phoenix/*.js
  node tools/vlt_sync.js --scaffold facade phoenix/telemetry_gateway.js
`);
}

/**
 * Resolves list of file paths from args or canonical directories.
 * @param {string[]} fileArgs
 * @returns {string[]}
 */
function resolveTargetFiles(fileArgs) {
	if (fileArgs.length > 0) {
		const resolved = [];
		for (const arg of fileArgs) {
			const abs = path.resolve(process.cwd(), arg);
			if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
				resolved.push(abs);
			}
		}
		return resolved;
	}

	// Default targets: phoenix/*.js
	const phoenixDir = path.resolve(__dirname, '../phoenix');
	if (!fs.existsSync(phoenixDir)) return [];
	return fs.readdirSync(phoenixDir)
		.filter((f) => f.endsWith('.js'))
		.map((f) => path.join(phoenixDir, f));
}

/**
 * Runs --check audit across files.
 * @param {string[]} files
 * @returns {number} Exit code (0 = success, 1 = failure)
 */
function runCheckMode(files) {
	console.log(`\n🔍 AUDITING ${files.length} FILE(S) FOR VLT-003 COMPLIANCE...\n`);
	let totalViolations = 0;

	for (const file of files) {
		const rel = path.relative(process.cwd(), file);
		const content = fs.readFileSync(file, 'utf8');
		const report = VLT.validateCompliance(content, {
			complexityScanner: LinterSuite ? (src, th) => LinterSuite.scanFunctionsComplexity(src, th) : null
		});

		if (report.compliant) {
			console.log(`  ✔ [PASS] ${rel} (${report.regions.length} regions)`);
		} else {
			console.log(`  ✖ [FAIL] ${rel}:`);
			for (const v of report.violations) {
				const lineInfo = v.line ? `Line ${v.line}: ` : '';
				console.log(`      └─ [${v.type}] ${lineInfo}${v.message}`);
				totalViolations++;
			}
		}
	}

	console.log('\n────────────────────────────────────────────────────────────');
	if (totalViolations === 0) {
		console.log('✨ 100% VLT-003 COMPLIANCE: ZERO DRIFT OR COMPLEXITY ERRORS\n');
		return 0;
	} else {
		console.error(`💥 AUDIT FAILED: ${totalViolations} VIOLATION(S) DETECTED\n`);
		return 1;
	}
}

/**
 * Runs --fix mode to calibrate CMD-DOC-INDEX in place.
 * @param {string[]} files
 * @returns {number}
 */
function runFixMode(files) {
	console.log(`\n⚙️ SYNCHRONIZING CMD-DOC-INDEX ON ${files.length} FILE(S)...\n`);
	let changedCount = 0;

	for (const file of files) {
		const rel = path.relative(process.cwd(), file);
		const content = fs.readFileSync(file, 'utf8');
		const synced = VLT.syncJumpTable(content);

		if (synced !== content) {
			fs.writeFileSync(file, synced, 'utf8');
			console.log(`  ✔ [SYNCED] ${rel}`);
			changedCount++;
		} else {
			console.log(`  ─ [UNCHANGED] ${rel}`);
		}
	}

	console.log(`\n✨ Synchronization complete. ${changedCount} file(s) updated.\n`);
	return 0;
}

/**
 * Runs --scaffold mode to generate a new module.
 * @param {string} archetypeArg
 * @param {string} targetPathArg
 * @returns {number}
 */
function runScaffoldMode(archetypeArg, targetPathArg) {
	if (!archetypeArg || !targetPathArg) {
		console.error('Error: --scaffold requires <archetype> and <targetPath>');
		printHelp();
		return 1;
	}

	const normType = archetypeArg.toLowerCase();
	let templateFile = '';
	if (normType.includes('facade') || normType === 'host') {
		templateFile = 'host_facade_template.js';
	} else if (normType.includes('cartridge') || normType === 'tenant') {
		templateFile = 'simulation_cartridge_template.js';
	} else if (normType.includes('transduction') || normType === 'tool' || normType === 'pure') {
		templateFile = 'pure_transduction_template.js';
	} else {
		console.error(`Error: Unknown archetype '${archetypeArg}'. Use: facade, cartridge, or transduction.`);
		return 1;
	}

	const templatePath = path.resolve(__dirname, '../phoenix/templates', templateFile);
	if (!fs.existsSync(templatePath)) {
		console.error(`Error: Template not found at '${templatePath}'`);
		return 1;
	}

	const targetPath = path.resolve(process.cwd(), targetPathArg);
	if (fs.existsSync(targetPath)) {
		console.error(`Error: Target file already exists at '${targetPath}'`);
		return 1;
	}

	// Derive module name from filename
	const basename = path.basename(targetPath, path.extname(targetPath));
	const moduleName = basename
		.split(/[-_]/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');

	const templateSource = fs.readFileSync(templatePath, 'utf8');
	const rendered = VLT.scaffoldModule(templateSource, {
		MODULE_NAME: moduleName,
		DOC_IDENTIFIER: `LEDGER-PHOENIX-${moduleName.toUpperCase()}-001`
	});

	const targetDir = path.dirname(targetPath);
	if (!fs.existsSync(targetDir)) {
		fs.mkdirSync(targetDir, { recursive: true });
	}

	fs.writeFileSync(targetPath, rendered, 'utf8');
	console.log(`\n✨ Successfully scaffolded ${archetypeArg} -> ${path.relative(process.cwd(), targetPath)}`);
	console.log(`   Module Name: ${moduleName}`);
	console.log(`   Initial Jump Table calibrated: 100% compliant.\n`);
	return 0;
}

/**
 * Main CLI entry point.
 */
function main() {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
		printHelp();
		process.exit(0);
	}

	if (args[0] === '--check') {
		const files = resolveTargetFiles(args.slice(1));
		process.exit(runCheckMode(files));
	}

	if (args[0] === '--scaffold') {
		process.exit(runScaffoldMode(args[1], args[2]));
	}

	if (args[0] === '--fix') {
		const files = resolveTargetFiles(args.slice(1));
		process.exit(runFixMode(files));
	}

	// Default fallback: treat args as file list for --fix
	const files = resolveTargetFiles(args);
	process.exit(runFixMode(files));
}

main();
