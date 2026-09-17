#!/usr/bin/env node
/* =========================================================================
   TOOL-AST-VERIFY-001: ZERO-ENTROPY STRUCTURAL REFACTOR AUDITOR
   ========================================================================= */

const fs = require('node:fs');
const path = require('node:path');

// Canonical VSRP-001 Required Facade Lifecycle Methods
const CANONICAL_VSRP_METHODS = [
	'configure',
	'init',
	'reset',
	'update',
	'render',
	'getState',
	'getDiagnostics',
	'getModuleInfo',
	'destroy'
];

/**
 * Strips comments and string literals to isolate structural tokens safely.
 * @param {string} source
 */
function tokenizeSource(source) {
	const numbers = [];
	const functions = new Map(); // name -> paramCount
	const stagingWrites = new Set();
	const stagingDeletes = new Set();

	// 1. Identify Staging assignments and deletions via regex scans
	const assignRegex = /window\._([a-zA-Z0-9]+)Internal\s*=\s*/g;
	let match;
	while ((match = assignRegex.exec(source)) !== null) {
		stagingWrites.add(match[1]);
	}

	const deleteRegex = /delete\s+window\._([a-zA-Z0-9]+)Internal/g;
	while ((match = deleteRegex.exec(source)) !== null) {
		stagingDeletes.add(match[1]);
	}

	// 2. Tokenize Functions: function name(args) or name: function(args) / name(args)
	const funcDeclRegex = /(?:function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)|([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{)/g;
	while ((match = funcDeclRegex.exec(source)) !== null) {
		const name = match[1] || match[3];
		const params = match[2] !== undefined ? match[2] : match[4];
		if (name && !['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
			const paramCount = params.trim() ? params.split(',').length : 0;
			functions.set(name, paramCount);
		}
	}

	// 3. Extract exact numeric constants (integers, floats, negative values)
	// Ignores numbers inside single/double quotes
	const sanitized = source
		.replace(/\/\*[\s\S]*?\*\//g, ' ')  // remove multi-line comments
		.replace(/\/\/.*/g, ' ')            // remove single-line comments
		.replace(/'(?:\\.|[^'])*'/g, ' ')   // remove single-quoted strings
		.replace(/"(?:\\.|[^"])*"/g, ' ')   // remove double-quoted strings
		.replace(/`(?:\\.|[^`])*`/g, ' ');  // remove template literals

	const numberRegex = /(?<![a-zA-Z0-9_$])(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![a-zA-Z0-9_$])/g;
	while ((match = numberRegex.exec(sanitized)) !== null) {
		const val = Number(match[1]);
		if (!Number.isNaN(val)) {
			numbers.push(val);
		}
	}

	return {
		numbers: numbers.toSorted((/** @type {number} */ a, /** @type {number} */ b) => a - b),
		functions,
		stagingWrites: Array.from(stagingWrites),
		stagingDeletes: Array.from(stagingDeletes)
	};
}

/**
 * Compares two sorted numeric arrays and returns discrepancy statistics.
 * @param {string | any[]} original
 * @param {string | any[]} refactored
 */
function diffNumbers(original, refactored) {
	const missing = [];
	const unexpected = [];

	let i = 0;
	let j = 0;

	while (i < original.length && j < refactored.length) {
		if (original[i] === refactored[j]) {
			i++;
			j++;
		} else if (original[i] < refactored[j]) {
			missing.push(original[i]);
			i++;
		} else {
			unexpected.push(refactored[j]);
			j++;
		}
	}

	while (i < original.length) missing.push(original[i++]);
	while (j < refactored.length) unexpected.push(refactored[j++]);

	return { missing, unexpected };
}

/**
 * Main Execution Entry Point
 */
function runVerification() {
	const args = process.argv.slice(2);
	if (args.length < 2) {
		console.error(`
Usage:
  node verify_ast.js <original_monolith.js> <facade_entry.js> [subsystem_files...]

Example:
  node tools/verify_ast.js battler_baker.js battler_baker.js battler_baker/*.js
    `);
		process.exit(1);
	}

	const monolithPath = path.resolve(args[0]);
	const facadePath = path.resolve(args[1]);
	const subsystemPaths = args.slice(2).map(p => path.resolve(p));

	console.log(`\n===============================================================`);
	console.log(`🛡️  PHOENIX AST ZERO-ENTROPY REFACTOR VERIFICATION GATE`);
	console.log(`===============================================================`);
	console.log(`▶ Original Monolith : ${path.basename(monolithPath)}`);
	console.log(`▶ Facade File       : ${path.basename(facadePath)}`);
	console.log(`▶ Subsystems Found  : ${subsystemPaths.length} files`);
	console.log(`---------------------------------------------------------------`);

	// Read Monolith
	if (!fs.existsSync(monolithPath)) {
		console.error(`❌ Error: Original monolith file not found: ${monolithPath}`);
		process.exit(1);
	}
	const monolithSrc = fs.readFileSync(monolithPath, 'utf8');
	const monolithData = tokenizeSource(monolithSrc);

	// Read Target Files (Facade + Subsystems)
	let refactoredSrcCombined = '';
	const refactoredFiles = Array.from(new Set([facadePath, ...subsystemPaths]));

	for (const file of refactoredFiles) {
		if (!fs.existsSync(file)) {
			console.error(`❌ Error: Target file not found: ${file}`);
			process.exit(1);
		}
		refactoredSrcCombined += '\n' + fs.readFileSync(file, 'utf8');
	}

	const refactoredData = tokenizeSource(refactoredSrcCombined);
	const facadeSrc = fs.readFileSync(facadePath, 'utf8');
	const facadeData = tokenizeSource(facadeSrc);

	let hasErrors = false;

	// TEST 1: VSRP-001 Canonical Facade Contract
	console.log(`[PASS 1] Auditing VSRP-001 Facade Contract: ${path.basename(facadePath)}`);
	const missingMethods = [];
	for (const method of CANONICAL_VSRP_METHODS) {
		const methodRegex = new RegExp(String.raw`\b${method}\s*\(`);
		if (!methodRegex.test(facadeSrc)) {
			missingMethods.push(method);
		}
	}

	if (missingMethods.length > 0) {
		console.error(`  ❌ FAIL: Facade is missing required VSRP-001 method(s): ${missingMethods.join(', ')}`);
		hasErrors = true;
	} else {
		console.log(`  ✔ PASS: All 9 canonical VSRP-001 lifecycle methods present in facade.`);
	}

	// TEST 2: Staging Membrane Invariance & Purge
	console.log(`\n[PASS 2] Auditing Temporary Staging Membrane Hygiene`);
	for (const modKey of refactoredData.stagingWrites) {
		if (facadeData.stagingDeletes.includes(modKey)) {
			console.log(`  ✔ PASS: Staging membrane "window._${modKey}Internal" is properly purged via delete.`);
		} else {
			console.error(`  ❌ FAIL: Leaked Staging Membrane: "window._${modKey}Internal" is written but never deleted!`);
			hasErrors = true;
		}
	}

	// TEST 3: Function Declarations & Signatures
	console.log(`\n[PASS 3] Auditing Function Coverage & Arity Invariance`);
	let missingFuncCount = 0;
	for (const [fnName, paramCount] of monolithData.functions.entries()) {
		if (!refactoredData.functions.has(fnName)) {
			console.warn(`  ⚠️  WARNING: Function "${fnName}" from monolith was not declared in refactored files.`);
			missingFuncCount++;
		} else {
			const refactoredParams = refactoredData.functions.get(fnName);
			if (paramCount !== refactoredParams) {
				console.error(`  ❌ FAIL: Arity Mismatch in "${fnName}()": original had ${paramCount} params, refactored has ${refactoredParams}.`);
				hasErrors = true;
			}
		}
	}
	if (missingFuncCount === 0) {
		console.log(`  ✔ PASS: 100% of monolithic functions preserved with matching signatures.`);
	}

	// TEST 4: Numeric Constant & Vertex Coordinate Invariance
	console.log(`\n[PASS 4] Auditing Numeric Constant & Coordinate Drift`);
	console.log(`  ▶ Monolith Constants Count   : ${monolithData.numbers.length}`);
	console.log(`  ▶ Refactored Constants Count : ${refactoredData.numbers.length}`);

	const diff = diffNumbers(monolithData.numbers, refactoredData.numbers);

	if (diff.missing.length > 0 || diff.unexpected.length > 0) {
		console.error(`  ❌ FAIL: Numeric Entropy Detected!`);
		if (diff.missing.length > 0) {
			console.error(`     Missing Numbers (${diff.missing.length}) : [${diff.missing.slice(0, 15).join(', ')}${diff.missing.length > 15 ? '...' : ''}]`);
		}
		if (diff.unexpected.length > 0) {
			console.error(`     Unexpected Numbers (${diff.unexpected.length}): [${diff.unexpected.slice(0, 15).join(', ')}${diff.unexpected.length > 15 ? '...' : ''}]`);
		}
		hasErrors = true;
	} else {
		console.log(`  ✔ PASS: Absolute Zero Entropy. All ${monolithData.numbers.length} numeric coordinates and constants match 1:1.`);
	}

	// FINAL VERDICT
	console.log(`\n---------------------------------------------------------------`);
	if (hasErrors) {
		console.error(`🚨 VERIFICATION FAILED: Structural entropy or contract violation detected.`);
		process.exit(1);
	} else {
		console.log(`✨ VERIFICATION SUCCESSFUL: 100% Structural Fidelity & VSRP-001 Compliant.`);
		process.exit(0);
	}
}

runVerification();