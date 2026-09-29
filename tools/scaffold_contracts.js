#!/usr/bin/env node
/**
 * ============================================================================
 * PHOENIX SOVEREIGN JSDOC CONTRACT SCAFFOLDER CLI
 * Document Identifier: CLI-PHOENIX-CONTRACT-SCAFFOLDER
 * Governing Protocol:  VSRP-001 / MPFS-001 / PSGC-001 [SEC-01.2]
 * ============================================================================
 *
 * Usage:
 *   node tools/scaffold_contracts.js <filePath> [--line <lineNum>] [--write] [--dry-run]
 *
 * Examples:
 *   node tools/scaffold_contracts.js phoenix/runtime/phoenix_studio_viewport.js --dry-run
 *   node tools/scaffold_contracts.js phoenix/runtime/phoenix_studio_viewport.js --line 760
 *   node tools/scaffold_contracts.js phoenix/runtime/phoenix_studio_viewport.js --write
 */

const fs = require('node:fs');
const path = require('node:path');
const PhoenixTypeResolver = require('../phoenix/phoenix_type_resolver.js');

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
		console.log(`
PHOENIX JSDOC CONTRACT SCAFFOLDER CLI (v8.0.0)
Usage:
  node tools/scaffold_contracts.js <filePath> [options]

Options:
  --line <number>   Scaffold JSDoc specifically for the function at target line
  --write           Persist changes to the target file on disk
  --dry-run         Show preview diff of generated JSDoc contracts without writing
  --dts <path>      Explicit path to phoenix.d.ts file (defaults to phoenix/phoenix.d.ts)
  --help, -h        Display this help information
`);
		process.exit(0);
	}

	const targetArg = args.find(a => !a.startsWith('--'));
	if (!targetArg) {
		console.error('Error: Missing target file path.');
		process.exit(1);
	}

	const targetPath = path.resolve(process.cwd(), targetArg);
	if (!fs.existsSync(targetPath)) {
		console.error(`Error: File not found: ${targetPath}`);
		process.exit(1);
	}

	const shouldWrite = args.includes('--write');
	const isDryRun = args.includes('--dry-run') || !shouldWrite;
	const lineIdx = args.indexOf('--line');
	const targetLine = lineIdx !== -1 && args[lineIdx + 1] ? Number(args[lineIdx + 1]) : null;

	// Ingest phoenix.d.ts
	const dtsIdx = args.indexOf('--dts');
	const dtsPath = dtsIdx !== -1 ? path.resolve(process.cwd(), args[dtsIdx + 1]) : path.resolve(__dirname, '../phoenix/phoenix.d.ts');
	if (fs.existsSync(dtsPath)) {
		const dtsContent = fs.readFileSync(dtsPath, 'utf8');
		const count = PhoenixTypeResolver.ingestDeclarations(dtsContent);
		console.log(`[TYPE-RESOLVER] Ingested ${count} signatures from ${path.relative(process.cwd(), dtsPath)}`);
	} else {
		console.warn(`[TYPE-RESOLVER] Warning: phoenix.d.ts not found at ${dtsPath}, using domain dictionary`);
	}

	const source = fs.readFileSync(targetPath, 'utf8');

	if (targetLine) {
		console.log(`[TYPE-RESOLVER] Scaffolding contract for function at line ${targetLine}...`);
		const result = PhoenixTypeResolver.scaffoldContractAtLine(source, targetLine);
		if (!result) {
			console.log('No un-annotated function found at target line, or function already has JSDoc.');
			process.exit(0);
		}

		console.log('\n--- Generated JSDoc Contract ---');
		console.log(result.jsdocBlock);
		console.log('--------------------------------\n');

		if (shouldWrite) {
			fs.writeFileSync(targetPath, result.scaffoldedSource, 'utf8');
			console.log(`✓ Wrote updated contract to ${targetArg}`);
		} else {
			console.log('(Dry-run mode active. Use --write to persist changes to disk.)');
		}
	} else {
		console.log(`[TYPE-RESOLVER] Scanning entire file for missing contracts: ${targetArg}...`);
		const result = PhoenixTypeResolver.scaffoldAllContracts(source);
		console.log(`[TYPE-RESOLVER] Scaffolded ${result.annotatedCount} missing contract(s).`);

		if (result.annotatedCount > 0) {
			if (shouldWrite) {
				fs.writeFileSync(targetPath, result.scaffoldedSource, 'utf8');
				console.log(`✓ Wrote ${result.annotatedCount} updated contract(s) to ${targetArg}`);
			} else {
				console.log('(Dry-run mode active. Use --write to persist changes to disk.)');
			}
		}
	}
}

main().catch(err => {
	console.error('Fatal CLI Error:', err);
	process.exit(1);
});
