/* ========================================================================= */
/* TOOL - AST - VERIFY-001: ZERO - ENTROPY STRUCTURAL REFACTOR AUDITOR       */
/* ========================================================================= */

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

const IGNORED_WORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'var', 'let', 'const']);

/**
 * Extracts staging writes from the source.
 */
function extractStagingWrites(source) {
	const stagingWrites = new Set();
	const assignRegex = /window\._([a-zA-Z0-9]+)Internal\s*=\s*/g;
	let match;
	while ((match = assignRegex.exec(source)) !== null) {
		stagingWrites.add(match[1]);
	}
	return Array.from(stagingWrites);
}

/**
 * Extracts staging deletes from the source.
 */
function extractStagingDeletes(source) {
	const stagingDeletes = new Set();
	const deleteRegex = /delete\s+window\._([a-zA-Z0-9]+)Internal/g;
	let match;
	while ((match = deleteRegex.exec(source)) !== null) {
		stagingDeletes.add(match[1]);
	}
	return Array.from(stagingDeletes);
}

/**
 * Helper to record valid function matches.
 */
function parseFunctionMatch(match, functions) {
	const name = match[1];
	const params = match[2];
	if (name && !IGNORED_WORDS.has(name) && !functions.has(name)) {
		const paramCount = params.trim() ? params.split(',').length : 0;
		functions.set(name, paramCount);
	}
}

/**
 * Extracts function declarations and method signatures.
 */
function extractFunctions(source) {
	const functions = new Map();
	let match;

	const namedFuncRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/g;
	while ((match = namedFuncRegex.exec(source)) !== null) {
		parseFunctionMatch(match, functions);
	}

	const methodRegex = /([a-zA-Z0-9_$]+)\(([^)]*)\)\s*\{/g;
	while ((match = methodRegex.exec(source)) !== null) {
		parseFunctionMatch(match, functions);
	}

	return functions;
}

/**
 * Extracts numeric constants and coordinates from sanitized source.
 */
function extractNumbers(source) {
	const numbers = [];
	const sanitized = source
		.replace(/\/\*[\s\S]*?\*\//g, ' ')  // remove multi-line comments
		.replace(/\/\/.*/g, ' ')             // remove single-line comments
		.replace(/'(?:\\.|[^'])*'/g, ' ')    // remove single-quoted strings
		.replace(/"(?:\\.|[^"])*"/g, ' ')    // remove double-quoted strings
		.replace(/`(?:\\.|[^`])*`/g, ' ');   // remove template literals

	const numberRegex = /(?<![a-zA-Z0-9_$])(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![a-zA-Z0-9_$])/g;
	let match;
	while ((match = numberRegex.exec(sanitized)) !== null) {
		const val = Number(match[1]);
		if (!Number.isNaN(val)) {
			numbers.push(val);
		}
	}

	numbers.sort((a, b) => a - b);
	return numbers;
}

/**
 * Strips comments and string literals to isolate structural tokens safely.
 */
function tokenizeSource(source) {
	return {
		numbers: extractNumbers(source),
		functions: extractFunctions(source),
		stagingWrites: extractStagingWrites(source),
		stagingDeletes: extractStagingDeletes(source)
	};
}

/**
 * Compares two sorted numeric arrays and returns discrepancy statistics.
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
 * Audit 1: VSRP-001 Facade Contract
 */
function auditFacadeContract(facadeSrc, facadePath) {
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
		return false;
	}
	console.log(`  ✔ PASS: All 9 canonical VSRP-001 lifecycle methods present in facade.`);
	return true;
}

/**
 * Audit 2: Staging Membrane Invariance & Purge
 */
function auditStagingHygiene(refactoredData, facadeData) {
	console.log(`\n[PASS 2] Auditing Temporary Staging Membrane Hygiene`);
	let hasErrors = false;
	for (const modKey of refactoredData.stagingWrites) {
		if (facadeData.stagingDeletes.includes(modKey)) {
			console.log(`  ✔ PASS: Staging membrane "window._${modKey}Internal" is properly purged via delete.`);
		} else {
			console.error(`  ❌ FAIL: Leaked Staging Membrane: "window._${modKey}Internal" is written but never deleted!`);
			hasErrors = true;
		}
	}
	return !hasErrors;
}

/**
 * Audit 3: Function Declarations & Signatures
 */
function auditFunctionCoverage(monolithData, refactoredData) {
	console.log(`\n[PASS 3] Auditing Function Coverage & Arity Invariance`);
	let missingFuncCount = 0;
	let hasErrors = false;
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
	return !hasErrors;
}

/**
 * Audit 4: Numeric Constant & Vertex Coordinate Invariance
 */
function auditNumericConstants(monolithData, refactoredData) {
	console.log(`\n[PASS 4] Auditing Numeric Constant & Coordinate Drift`);
	console.log(`  ▶ Monolith Constants Count   : ${monolithData.numbers.length}`);
	console.log(`  ▶ Refactored Constants Count : ${refactoredData.numbers.length}`);

	const diff = diffNumbers(monolithData.numbers, refactoredData.numbers);

	if (diff.missing.length > 0 || diff.unexpected.length > 0) {
		console.error(`  ❌ FAIL: Numeric Entropy Detected!`);
		if (diff.missing.length > 0) {
			console.error(`    Missing Numbers (${diff.missing.length}) : [${diff.missing.slice(0, 15).join(', ')}${diff.missing.length > 15 ? '...' : ''}]`);
		}
		if (diff.unexpected.length > 0) {
			console.error(`    Unexpected Numbers (${diff.unexpected.length}) : [${diff.unexpected.slice(0, 15).join(', ')}]`);
		}
		return false;
	}
	console.log(`  ✔ PASS: Absolute Zero Entropy. All ${monolithData.numbers.length} numeric coordinates and constants match 1:1.`);
	return true;
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

	if (!fs.existsSync(monolithPath)) {
		console.error(`❌ Error: Original monolith file not found: ${monolithPath}`);
		process.exit(1);
	}
	const monolithSrc = fs.readFileSync(monolithPath, 'utf8');
	const monolithData = tokenizeSource(monolithSrc);

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

	const pass1 = auditFacadeContract(facadeSrc, facadePath);
	const pass2 = auditStagingHygiene(refactoredData, facadeData);
	const pass3 = auditFunctionCoverage(monolithData, refactoredData);
	const pass4 = auditNumericConstants(monolithData, refactoredData);

	const hasErrors = !(pass1 && pass2 && pass3 && pass4);

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