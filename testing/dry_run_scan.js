const fs = require('node:fs');
const path = require('node:path');
const PhoenixSovereignEngine = require('../phoenix/phoenix_sovereign_engine.js');
const loadOrder = require('./load_order.js');

const linter = PhoenixSovereignEngine.PhoenixLinterSuite;
const erl = new PhoenixSovereignEngine.PhoenixErrorResolutionLedger();

let totalFiles = 0;
let filesWithIssues = 0;
let totalIssues = 0;
let totalHighComplexity = 0;
let erlResolvable = 0;
const report = [];

for (const relPath of loadOrder) {
	const fullPath = path.join(__dirname, '..', relPath);
	if (!fs.existsSync(fullPath)) continue;
	totalFiles++;
	const code = fs.readFileSync(fullPath, 'utf8');

	// 1. Lint code
	const issues = linter.lintCode(code, relPath);

	// 2. Check Math.random
	const lines = code.split('\n');
	lines.forEach((line, idx) => {
		if (line.includes('Math.random()')) {
			issues.push({ line: idx + 1, message: 'Math.random() is forbidden', severity: 'error', rule: 'MATH/RANDOM' });
		}
	});

	// 3. Check cognitive complexity > 15
	const complexFns = linter.scanFunctionsComplexity(code, 15);

	const allIssues = issues.concat(complexFns.map(f => ({
		line: f.line,
		message: "Function '" + f.name + "' has high cognitive complexity (" + f.complexity + "/15)",
		severity: 'warning',
		rule: 'COMPLEXITY/HIGH',
		fn: f
	})));

	if (allIssues.length > 0) {
		filesWithIssues++;
		totalIssues += allIssues.length;
		totalHighComplexity += complexFns.length;

		const erlMatches = allIssues.filter(iss => erl.findMatch(iss, lines[ (iss.line || 1) - 1 ] || '')).length;
		erlResolvable += erlMatches;

		report.push({
			file: relPath,
			issuesCount: allIssues.length,
			complexityCount: complexFns.length,
			erlMatches,
			details: allIssues.map(i => "  - L" + i.line + ": [" + (i.rule || 'LINT') + "] " + i.message)
		});
	}
}

console.log('=== DRY RUN WORKSPACE DIAGNOSTIC SUMMARY ===');
console.log('Total Canonical Files Scanned: ' + totalFiles);
console.log('Files with Diagnostics: ' + filesWithIssues + ' / ' + totalFiles);
console.log('Total Diagnostic Issues: ' + totalIssues);
console.log('  - High Cognitive Complexity (>15): ' + totalHighComplexity);
console.log('  - ERL-001 Instant Resolvable: ' + erlResolvable);
console.log('  - Novel / AI Required: ' + (totalIssues - erlResolvable));
console.log('\nTop Files with Diagnostics:');
report.toSorted((a, b) => b.issuesCount - a.issuesCount).slice(0, 15).forEach(r => {
	console.log(r.file + ' (' + r.issuesCount + ' issues, ' + r.complexityCount + ' complex, ' + r.erlMatches + ' ERL):');
	r.details.slice(0, 5).forEach(d => console.log(d));
});
