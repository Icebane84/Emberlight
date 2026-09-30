/**
 * ============================================================================
 * TOOLS: AST / LEXICAL ES MODULE VIOLATION LINTER (audit_esm.js)
 * Protocol: PSGC-001 [INV-02], [INV-03] / MPFS-001 §2.X
 * Usage: node tools/audit_esm.js [targetDirectory]
 * ============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TARGET_DIR = process.argv[ 2 ] || process.cwd();
const EXTENSIONS_TO_SCAN = new Set([ '.js', '.html' ]);
const EXCLUDED_DIRS = new Set([ 'node_modules', '.git', 'docs' ]);

// Pattern matches line-level ESM import/export tokens without super-linear backtracking
const ESM_TOKEN_REGEX = /\b(?:import\s*\(|import\s+[^'"]+?\bfrom\b|export\s+(?:default|const|let|var|function|class|\*|\{))/;

let totalFilesAudited = 0;
let totalViolationsFound = 0;

/**
 * @type {{ file: string; line: number; token: string; sourceSnippet: string; }[]}
 */
const violationLog = [];

/**
 * Recursively scans directory for ESM tokens.
 * @param {string} currentPath - Path to directory
 */
function scanDirectory(currentPath) {
	const entries = fs.readdirSync(currentPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(currentPath, entry.name);

		if (entry.isDirectory()) {
			if (!EXCLUDED_DIRS.has(entry.name)) {
				scanDirectory(fullPath);
			}
			continue;
		}

		const extension = path.extname(entry.name).toLowerCase();
		if (!EXTENSIONS_TO_SCAN.has(extension)) {
			continue;
		}

		totalFilesAudited++;
		const fileContent = fs.readFileSync(fullPath, 'utf8');
		const lines = fileContent.split('\n');

		lines.forEach((lineText, lineIndex) => {
			const strippedLine = lineText.trim();
			// Ignore single-line comments or JSDoc lines
			if (strippedLine.startsWith('//') || strippedLine.startsWith('*') || strippedLine.startsWith('/*')) {
				return;
			}

			ESM_TOKEN_REGEX.lastIndex = 0;
			const match = ESM_TOKEN_REGEX.exec(lineText);
			if (match) {
				totalViolationsFound++;
				violationLog.push({
					file: path.relative(TARGET_DIR, fullPath),
					line: lineIndex + 1,
					token: match[ 0 ],
					sourceSnippet: strippedLine
				});
			}
		});
	}
}

console.log(`[ESM-AUDIT] Initiating lexical audit on target: ${TARGET_DIR}`);
scanDirectory(TARGET_DIR);

console.log('='.repeat(70));
console.log(`[ESM-AUDIT] Files Scanned: ${totalFilesAudited}`);
console.log(`[ESM-AUDIT] Violations Detected: ${totalViolationsFound}`);
console.log('='.repeat(70));

if (totalViolationsFound > 0) {
	console.error('\x1b[31m[CRITICAL] ES MODULE KEYWORD VIOLATIONS DETECTED:\x1b[0m');
	violationLog.forEach(v => {
		console.error(`  -> ${v.file}:${v.line} [${v.token}] => "${v.sourceSnippet}"`);
	});
	process.exit(1);
} else {
	console.log('\x1b[32m[PASS] Zero ES Module violations detected. Target conforms to file:/// executability.\x1b[0m');
	process.exit(0);
}
