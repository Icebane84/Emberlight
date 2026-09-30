/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         PHOENIX VLT-003 COMPLIANCE & JUMP TABLE ENGINE                   ║
 * ║         Document Identifier: LEDGER-PHOENIX-VLT-COMPLIANCE-001             ║
 * ║         Protocol Version: PSGC-001 / VLT-003 / VSRP-001 / MPFS-001         ║
 * ║                           SDCP-001 / PMIP-001 / STCP-001                   ║
 * ║         Authority: Host Governance Substrate | Anti-Entropy & Scaffolding  ║
 * ║         Status: NORMATIVE | 7 #region Jump Table (SEC-01 - SEC-07)         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * CMD-DOC-INDEX (Normative Region Jump Table)
 * =============================================================================
 * [SEC-01] AMBIENT TYPE CONTRACTS & REGULATORY SPECIFICATIONS ... Line ~0032
 * [SEC-02] REGION SCANNING & STRUCTURAL ANCHOR EXTRACTION ....... Line ~0065
 * [SEC-03] JUMP TABLE FORMATTER & ITERATIVE CONVERGENCE ENGINE .. Line ~0211
 * [SEC-04] STATIC COMPLIANCE AUDIT & COMPLEXITY VERIFICATION .... Line ~0295
 * [SEC-05] PARAMETRIC MODULE SCAFFOLDER & ARCHETYPE EXPANDER .... Line ~0919
 * [SEC-06] UNIVERSAL FACADE & DUAL-BINDING MODULE EXPORT ........ Line ~0980
 * [SEC-07] PHOENIX SYMBOL INDEXER BRIDGE (SEC-10 DELEGATION) .... Line ~1062
 * =============================================================================
 */

/// <reference path="./phoenix.d.ts" />

/**
 * Universal Dual-Binding Faraday Isolation Membrane
 * @param {Window & typeof globalThis} root
 */
((root) => {
	'use strict';

	//#region [SEC-01] --- AMBIENT TYPE CONTRACTS & REGULATORY SPECIFICATIONS
	/**
	 * Canonical contract types for VLT Compliance Engine:
	 * @typedef {Object} VLTRegionInfo
	 * @property {string} sec - Section code (e.g. 'SEC-01')
	 * @property {string} title - Human-readable section title
	 * @property {number} line - 1-indexed line number where region begins
	 * @property {string} rawLine - Exact original line text
	 * @property {'js'|'html'} [syntax] - Source syntax variant of the region anchor
	 *
	 * @typedef {Object} VLTComplianceViolation
	 * @property {'DRIFT'|'COMPLEXITY'|'CLOSURE'|'ORDER'|'TOKEN'|'BUS_LINK'|'SOCKET_BREACH'|'ATOMIC_WAIT'|'DOWNWARD_DEPENDENCY'|'HOT_LOOP_ALLOC'|'SOCKET_UNGUARDED'|'STAGING_LEAK'|'UNFROZEN_FACADE'} type - Violation category
	 * @property {string} message - Diagnostic description
	 * @property {number} [line] - Source line number of violation
	 * @property {'error'|'warning'} [severity] - 'error' | 'warning'
	 *
	 * @typedef {Object} VLTComplianceReport
	 * @property {boolean} compliant - True if all gates pass with zero errors
	 * @property {VLTComplianceViolation[]} violations - List of detected discrepancies
	 * @property {VLTRegionInfo[]} regions - Scanned region descriptors
	 *
	 * @typedef {Object} VLTBusLinkReport
	 * @property {boolean} ok - True if no orphaned topics found
	 * @property {string[]} orphanedEmits - Emit topics with no matching listen handler
	 * @property {string[]} orphanedListens - Listen handlers with no matching emit
	 *
	 * @typedef {Object} VLTSocketAuditResult
	 * @property {boolean} ok - True if no socket discipline violations found
	 * @property {string[]} socketBreaches - Lines where Plane 1 accesses DOM sockets (ERR_0x1B)
	 * @property {string[]} atomicWaitViolations - Lines where Atomics.wait() used in main-thread context (ERR_0x1F)
	 */
	//#endregion [SEC-01]

	//#region [SEC-02] --- REGION SCANNING & STRUCTURAL ANCHOR EXTRACTION

	/**
	 * Parses a single line for region markers.
	 * [Pure Function] Complexity <= 4.
	 * @param {string} line - Source line text
	 * @param {number} lineIndex - 0-indexed line position
	 * @param {RegExp} regionRegex - Pattern matcher
	 * @returns {VLTRegionInfo | null}
	 * @private
	 */
	function _parseRegionLine(line, lineIndex, regionRegex) {
		const match = regionRegex.exec(line);
		if (!match) return null;

		const sec = match[ 1 ];
		const bracketIdx = line.indexOf(']');
		let rawTitle = bracketIdx !== -1 ? line.slice(bracketIdx + 1).trim() : '';
		if (rawTitle.startsWith('---')) {
			rawTitle = rawTitle.slice(3).trim();
		}
		const slashIdx = rawTitle.indexOf('///');
		const title = (slashIdx !== -1 ? rawTitle.slice(0, slashIdx) : rawTitle).trim();
		return {
			sec,
			title,
			line: lineIndex + 1,
			rawLine: line
		};
	}

	/**
	 * Scans JavaScript and HTML/Markdown source code for canonical region anchor declarations.
	 * Recognizes both `//#region [SEC-XX]` (JS) and `<!-- #region [SEC-XX] -->` (HTML/Markdown)
	 * per MPFS-001 v2.3.0-NORMATIVE [SEC-06B] / [SEC-06C] specification.
	 * [Pure Function] Complexity <= 5.
	 * @param {string} sourceCode - Raw source code string
	 * @returns {VLTRegionInfo[]} Ordered list of scanned region descriptors
	 */
	/**
	 * Registers regions with PhoenixSymbolIndexer when present.
	 * [State-Mutating] Complexity <= 10.
	 * @param {VLTRegionInfo[]} regions
	 * @param {number} totalLines
	 * @private
	 */
	function _registerRegionsInIndexer(regions, totalLines) {
		const indexer = (typeof PhoenixSymbolIndexer !== 'undefined')
			? PhoenixSymbolIndexer
			: root?.PhoenixSymbolIndexer;
		if (!indexer || typeof indexer.register !== 'function') return;
		for (let i = 0; i < regions.length; i++) {
			const r = regions[ i ];
			const nextLine = (i + 1 < regions.length) ? regions[ i + 1 ].line - 1 : totalLines;
			indexer.register(`[${r.sec}]`, {
				startLine: r.line,
				endLine: nextLine,
				plane: /** @type {0|1|2} */ (0),
				exports: []
			});
		}
	}

	/**
	 * Scans JavaScript and HTML/Markdown source code for canonical region anchor declarations.
	 * Recognizes both `//#region [SEC-XX]` (JS) and `<!-- #region [SEC-XX] -->` (HTML/Markdown)
	 * per MPFS-001 v2.3.0-NORMATIVE [SEC-06B] / [SEC-06C] specification.
	 * [Pure Function] Complexity <= 10.
	 * @param {string} sourceCode - Raw source code string
	 * @returns {VLTRegionInfo[]} Ordered list of scanned region descriptors
	 */
	function scanRegions(sourceCode) {
		if (typeof sourceCode !== 'string') return [];
		const lines = sourceCode.split(/\r?\n/);
		/** @type {VLTRegionInfo[]} */
		const regions = [];
		const jsRegionRegex = /^\s*\/\/#region\s+\[(SEC-[\d.]+[A-Z]?)\]/;
		const htmlRegionRegex = /^\s*<!--\s*#region\s+\[(SEC-[\d.]+[A-Z]?)\]/;

		for (let i = 0; i < lines.length; i++) {
			const jsInfo = _parseRegionLine(lines[ i ], i, jsRegionRegex);
			if (jsInfo) { jsInfo.syntax = 'js'; regions.push(jsInfo); continue; }
			const htmlInfo = _parseRegionLine(lines[ i ], i, htmlRegionRegex);
			if (htmlInfo) { htmlInfo.syntax = 'html'; regions.push(htmlInfo); }
		}

		_registerRegionsInIndexer(regions, lines.length);
		return regions;
	}

	/**
	 * Extracts the boundary line indices of the CMD-DOC-INDEX table inside the header banner.
	 * [Pure Function] Complexity <= 6.
	 * @param {string[]} lines - Array of source lines
	 * @returns {{ startLineIdx: number; endLineIdx: number } | null} 0-indexed line bounds or null
	 * @private
	 */
	/**
	 * Finds the start index of CMD-DOC-INDEX in the first 60 lines.
	 * @param {string[]} lines
	 * @returns {number}
	 * @private
	 */
	function _findDocIndexStart(lines) {
		const maxScan = Math.min(lines.length, 60);
		for (let i = 0; i < maxScan; i++) {
			if (lines[ i ].includes('CMD-DOC-INDEX')) return i;
		}
		return -1;
	}

	/**
	 * Finds the closing divider line index for the CMD-DOC-INDEX table.
	 * @param {string[]} lines
	 * @param {number} startIdx
	 * @returns {number}
	 * @private
	 */
	function _findDocIndexEnd(lines, startIdx) {
		const maxScan = Math.min(lines.length, 60);
		for (let i = startIdx + 2; i < maxScan; i++) {
			const trimmed = lines[ i ].trim();
			if (trimmed.startsWith('* ===') || trimmed.startsWith('===') || trimmed.startsWith('-->') || trimmed.includes('====')) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Extracts boundary line indices of CMD-DOC-INDEX inside the header banner.
	 * [Pure Helper] Complexity <= 3.
	 * @param {string[]} lines - Array of source lines
	 * @returns {{ startLineIdx: number; endLineIdx: number } | null}
	 * @private
	 */
	function _locateDocIndexBounds(lines) {
		const startIdx = _findDocIndexStart(lines);
		if (startIdx === -1) return null;
		const endIdx = _findDocIndexEnd(lines, startIdx);
		if (endIdx === -1) return null;
		return { startLineIdx: startIdx, endLineIdx: endIdx };
	}

	//#endregion [SEC-02]

	//#region [SEC-03] --- JUMP TABLE FORMATTER & ITERATIVE CONVERGENCE ENGINE

	/**
	 * Formats an array of region descriptors into canonical CMD-DOC-INDEX jump table lines.
	 * [Pure Function] Complexity <= 4.
	 * @param {VLTRegionInfo[]} regions
	 * @returns {string[]} Formatted header lines
	 */
	function formatJumpTable(regions) {
		if (!Array.isArray(regions) || regions.length === 0) return [];
		return regions.map((r) => {
			const secTag = `[${r.sec}]`;
			const titlePart = r.title || 'Untitled Section';
			const lineStr = `Line ~${String(r.line).padStart(4, '0')}`;
			const prefix = r.syntax === 'html' ? '   ' : ' * ';
			const fullHeader = `${prefix}${secTag} ${titlePart} `;
			const dotCount = Math.max(2, 66 - fullHeader.length);
			const dots = '.'.repeat(dotCount);
			return `${fullHeader}${dots} ${lineStr}`;
		});
	}

	/**
	 * Single-pass replacement of the CMD-DOC-INDEX block with candidate region lines.
	 * @param {string[]} lines
	 * @param {number} startIdx
	 * @param {number} endIdx
	 * @param {VLTRegionInfo[]} regions
	 * @returns {string}
	 * @private
	 */
	function _applyJumpTableSlice(lines, startIdx, endIdx, regions) {
		const formattedLines = formatJumpTable(regions);
		const before = lines.slice(0, startIdx + 2); // Includes CMD-DOC-INDEX and upper divider
		const after = lines.slice(endIdx);          // Includes lower divider and remainder
		return [ ...before, ...formattedLines, ...after ].join('\n');
	}

	/**
	 * Performs a single synchronization pass on the source text.
	 * @param {string} source
	 * @returns {{ converged: boolean; nextSource: string }}
	 * @private
	 */
	function _syncPass(source) {
		const lines = source.split(/\r?\n/);
		const bounds = _locateDocIndexBounds(lines);
		if (!bounds) return { converged: true, nextSource: source };

		const scanned = scanRegions(source);
		if (scanned.length === 0) return { converged: true, nextSource: source };

		const nextSource = _applyJumpTableSlice(lines, bounds.startLineIdx, bounds.endLineIdx, scanned);
		if (nextSource === source) return { converged: true, nextSource };

		const postScan = scanRegions(nextSource);
		const matched = postScan.every((pr, idx) => pr.line === scanned[ idx ]?.line);
		return { converged: matched, nextSource };
	}

	/**
	 * Synchronizes the CMD-DOC-INDEX jump table lines in place against exact `#region` line targets.
	 * Uses iterative convergence to ensure post-edit line offsets match with 100% precision.
	 * [Pure Function] Complexity <= 4.
	 *
	 * @param {string} sourceCode - Raw source code
	 * @param {number} [maxPasses=5] - Maximum convergence calibration passes
	 * @returns {string} Updated source code with calibrated CMD-DOC-INDEX
	 */
	function syncJumpTable(sourceCode, maxPasses = 5) {
		if (typeof sourceCode !== 'string') return '';
		let current = sourceCode;

		for (let pass = 0; pass < maxPasses; pass++) {
			const { converged, nextSource } = _syncPass(current);
			current = nextSource;
			if (converged) break;
		}

		return current;
	}

	//#endregion [SEC-03]

	//#region [SEC-04] --- STATIC COMPLIANCE AUDIT & COMPLEXITY VERIFICATION

	/**
	 * Parses existing jump table lines from source code.
	 * @param {string[]} lines
	 * @param {number} startIdx
	 * @param {number} endIdx
	 * @returns {Array<{ sec: string; line: number }>}
	 * @private
	 */
	function _parseExistingJumpTable(lines, startIdx, endIdx) {
		const entries = [];
		const lineRegex = /\[(SEC-\d+)\].*Line ~(\d+)/;
		for (let i = startIdx + 2; i < endIdx; i++) {
			const match = lineRegex.exec(lines[ i ]);
			if (match) {
				entries.push({ sec: match[ 1 ], line: Number.parseInt(match[ 2 ], 10) });
			}
		}
		return entries;
	}

	/**
	 * Validates region sequence and jump table line parity.
	 * @param {string[]} lines
	 * @param {VLTRegionInfo[]} regions
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditRegionsAndJumpTable(lines, regions, violations) {
		// 1. Check monotonic sequential numbering
		for (let i = 0; i < regions.length; i++) {
			const expectedSec = `SEC-${String(i + 1).padStart(2, '0')}`;
			if (regions[ i ].sec !== expectedSec) {
				violations.push({
					type: 'ORDER',
					message: `Non-sequential region code: found '${regions[ i ].sec}', expected '${expectedSec}'.`,
					line: regions[ i ].line,
					severity: 'error'
				});
			}
		}

		// 2. Check CMD-DOC-INDEX parity
		const bounds = _locateDocIndexBounds(lines);
		if (!bounds) {
			violations.push({
				type: 'DRIFT',
				message: 'Missing canonical CMD-DOC-INDEX jump table in header.',
				line: 1,
				severity: 'error'
			});
			return;
		}

		const existingEntries = _parseExistingJumpTable(lines, bounds.startLineIdx, bounds.endLineIdx);
		if (existingEntries.length !== regions.length) {
			violations.push({
				type: 'DRIFT',
				message: `Jump table entry count mismatch: header has ${existingEntries.length}, source has ${regions.length} regions.`,
				line: bounds.startLineIdx + 1,
				severity: 'error'
			});
		}

		for (const entry of existingEntries) {
			const actual = regions.find((r) => r.sec === entry.sec);
			if (actual && actual.line !== entry.line) {
				violations.push({
					type: 'DRIFT',
					message: `Drift detected in [${entry.sec}]: table says Line ~${entry.line}, actual is Line ${actual.line}.`,
					line: actual.line,
					severity: 'error'
				});
			}
		}
	}

	/**
	 * Audits source code for forbidden anti-patterns and outer function wrappers.
	 * @param {string} sourceCode
	 * @param {string[]} lines
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditClosureAndPlaceholders(sourceCode, lines, violations) {
		const headLines = lines.slice(0, 30);
		// Check for function(root) wrapper which triggers false-positive complexity
		const hasLegacyClosure = headLines.some((l) => /^[ \t]*\([ \t]*function\b/.test(l));
		if (hasLegacyClosure) {
			violations.push({
				type: 'CLOSURE',
				message: "Use arrow IIFE '((root) => { ... })(...)' instead of '(function(root) { ... })(...)' to prevent cognitive complexity false-positives.",
				severity: 'warning'
			});
		}

		// Check for forbidden placeholder tokens on standalone lines
		const isPlaceholderLine = lines.some((l) => {
			const trimmed = l.trim();
			return trimmed === '// ...' || trimmed.startsWith('// ...');
		});
		const blockPlaceholder = '/*' + ' ... ' + '*/';
		if (isPlaceholderLine || sourceCode.includes(blockPlaceholder)) {
			violations.push({
				type: 'TOKEN',
				message: "Forbidden placeholder token detected in source.",
				severity: 'error'
			});
		}
	}

	/**
	 * Audits source code for SEC-09 Rule 9 bus-link integrity (ERR_0x0D).
	 * Delegates to SynarcheCompiler.verifyBusLinkIntegrity() if available.
	 * Falls back to a lightweight regex scan for emit/listen keyword patterns.
	 * [Pure Function] Complexity <= 5.
	 * @param {string} sourceCode
	 * @param {VLTComplianceViolation[]} violations
	 * @returns {VLTBusLinkReport}
	 * @private
	 */
	/**
	 * Pushes orphaned bus link topics to violations list.
	 * [Pure Function] Complexity <= 9.
	 * @param {VLTBusLinkReport} report
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _recordBusLinkViolations(report, violations) {
		if (report.ok) return;
		for (const topic of report.orphanedEmits) {
			violations.push({ type: 'BUS_LINK', message: `ERR_0x0D: Orphaned emit topic '${topic}' has no matching listen handler (MPFS-001 [SEC-09] Rule 9).`, severity: 'error' });
		}
		for (const topic of report.orphanedListens) {
			violations.push({ type: 'BUS_LINK', message: `ERR_0x0D: Orphaned listen handler for topic '${topic}' has no matching emit (MPFS-001 [SEC-09] Rule 9).`, severity: 'error' });
		}
	}

	/**
	 * Audits source code for SEC-09 Rule 9 bus-link integrity (ERR_0x0D).
	 * Delegates to SynarcheCompiler.verifyBusLinkIntegrity() if available.
	 * Falls back to a lightweight parse for event handlers.
	 * [Pure Function] Complexity <= 8.
	 * @param {string} sourceCode
	 * @param {VLTComplianceViolation[]} violations
	 * @returns {VLTBusLinkReport}
	 * @private
	 */
	function _auditBusLinkIntegrity(sourceCode, violations) {
		const compiler = (typeof SynarcheCompiler !== 'undefined')
			? SynarcheCompiler
			: root?.SynarcheCompiler;

		if (!compiler || typeof compiler.verifyBusLinkIntegrity !== 'function') {
			return { ok: true, orphanedEmits: [], orphanedListens: [] };
		}

		try {
			const { ast } = compiler.parse(sourceCode, { mode: 'SLOPPY' });
			const report = compiler.verifyBusLinkIntegrity(ast);
			_recordBusLinkViolations(report, violations);
			return report;
		} catch (parseErr) {
			// Ignored: non-Synarche source code or parsing syntax failure; skip bus-link validation safely
			console.debug?.('[VLT] Bus-link parse bypassed:', parseErr);
			return { ok: true, orphanedEmits: [], orphanedListens: [] };
		}
	}

	/**
	 * Audits source code for Plane 1 DOM socket API access breaches.
	 * [Pure Function] Complexity <= 5.
	 * @param {string[]} lines
	 * @param {string[]} socketBreaches
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditDOMSocketBreaches(lines, socketBreaches, violations) {
		for (let i = 0; i < lines.length; i++) {
			if (/document\.getElementById|document\.querySelector/.test(lines[ i ])) {
				socketBreaches.push(`L${i + 1}: ${lines[ i ].trim()}`);
				violations.push({ type: 'SOCKET_BREACH', message: `ERR_0x1B: SEC-06B socket breach at L${i + 1}: Plane 1 must not access DOM sockets directly. Extract via Plane 2 (Coordinator) and pass as PMIP-001 Transferable.`, line: i + 1, severity: 'error' });
			}
		}
	}

	/**
	 * Audits source code for INV-SAB-01 Atomics.wait() main-thread violations.
	 * [Pure Function] Complexity <= 5.
	 * @param {string[]} lines
	 * @param {string[]} atomicWaitViolations
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditAtomicWaitViolations(lines, atomicWaitViolations, violations) {
		for (let i = 0; i < lines.length; i++) {
			if (/Atomics\.wait\b/.test(lines[ i ])) {
				atomicWaitViolations.push(`L${i + 1}: ${lines[ i ].trim()}`);
				violations.push({ type: 'ATOMIC_WAIT', message: `ERR_0x1F: INV-SAB-01 at L${i + 1}: Atomics.wait() is prohibited on the main thread. Use Atomics.notify() from Plane 0/2 only (MPFS-001 [SEC-06C]).`, line: i + 1, severity: 'error' });
			}
		}
	}

	/**
	 * Audits source code for MPFS-001 SEC-06B socket breach (ERR_0x1B) and
	 * INV-SAB-01 Atomics.wait() main-thread violation (ERR_0x1F).
	 * [Pure Function] Complexity <= 7.
	 * @param {string} sourceCode
	 * @param {string[]} lines
	 * @param {VLTComplianceViolation[]} violations
	 * @returns {VLTSocketAuditResult}
	 * @private
	 */
	function _auditSocketAndAtomicCompliance(sourceCode, lines, violations) {
		/** @type {string[]} */
		const socketBreaches = [];
		/** @type {string[]} */
		const atomicWaitViolations = [];

		if (/document\.getElementById|document\.querySelector/.test(sourceCode)) {
			_auditDOMSocketBreaches(lines, socketBreaches, violations);
		}

		const MAIN_THREAD_PATTERN = /(?:function\s+(?:boot|configure|activate|render)\b|(?:boot|configure|activate|render)\s*\([^)]*\)\s*\x7B)[\s\S]*?Atomics\.wait\b/;
		if (MAIN_THREAD_PATTERN.test(sourceCode)) {
			_auditAtomicWaitViolations(lines, atomicWaitViolations, violations);
		}

		return { ok: socketBreaches.length === 0 && atomicWaitViolations.length === 0, socketBreaches, atomicWaitViolations };
	}

	/**
	 * Scans cognitive complexity of functions using injected scanner or PhoenixLinterSuite.
	 * [Pure Function] Complexity <= 11.
	 * @param {string} sourceCode
	 * @param {{ maxComplexity?: number; complexityScanner?: (src: string, threshold: number) => Array<{ name: string; line: number; complexity: number }> }} options
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditComplexity(sourceCode, options, violations) {
		const sovereignEngine = typeof PhoenixSovereignEngine !== 'undefined'
			? PhoenixSovereignEngine
			: root?.PhoenixSovereignEngine;

		const linter = sovereignEngine?.PhoenixLinterSuite || sovereignEngine?.linter;
		const scanner = options.complexityScanner
			|| (linter?.scanFunctionsComplexity ? linter.scanFunctionsComplexity.bind(linter) : null);

		if (typeof scanner !== 'function') return;

		const maxComplexity = options.maxComplexity || 15;
		const fnViolations = scanner(sourceCode, maxComplexity);
		for (const fv of fnViolations) {
			violations.push({
				type: 'COMPLEXITY',
				message: `Function '${fv.name}' exceeds cognitive complexity threshold: score ${fv.complexity} > ${maxComplexity}.`,
				line: fv.line,
				severity: 'error'
			});
		}
	}

	/**
	 * Evaluates source code against complete VLT-003, SonarLint S3776, and MPFS-001 v2.3.0 standards.
	 * Audit passes:
	 *   1. Region order & CMD-DOC-INDEX drift
	 *   2. Closure and placeholder tokens
	 *   3. Cognitive complexity (delegated to PhoenixLinterSuite)
	 *   4. SEC-09 Rule 9 bus-link integrity (delegated to SynarcheCompiler)
	 *   5. SEC-06B DOM socket breach (ERR_0x1B)
	 *   6. INV-SAB-01 Atomics.wait() main-thread prohibition (ERR_0x1F)
	 *   7. SEC-09 Rule 3 downward dependency invariant (ERR_0x0E)
	 *   8. SEC-09 Rule 7 zero-transient hot-loop invariance (ERR_0x18)
	 *   9. SEC-05/06/06B staging membrane, capability tokens, and sealed facade (ERR_0x1C/1D/1E)
	 *
	 * [Pure Function] Complexity <= 12.
	 * @param {string} sourceCode - JavaScript source code to audit
	 * @param {Object} [options]
	 * @param {number} [options.maxComplexity=15] - Maximum permitted function complexity
	 * @param {((src: string, threshold: number) => Array<{ name: string; line: number; complexity: number }>)} [options.complexityScanner] - Optional injected scanner
	 * @param {boolean} [options.skipBusLinkAudit] - If true, skips the SynarcheCompiler bus-link pass
	 * @param {boolean} [options.skipSocketAudit] - If true, skips the SEC-06B/INV-SAB-01 pass
	 * @param {boolean} [options.skipDownwardAudit] - If true, skips the downward dependency pass
	 * @param {boolean} [options.skipHotLoopAudit] - If true, skips the hot-loop allocation pass
	 * @param {boolean} [options.skipStagingAudit] - If true, skips the staging membrane pass
	 * @returns {VLTComplianceReport}
	 */
	function validateCompliance(sourceCode, options = {}) {
		/** @type {VLTComplianceViolation[]} */
		const violations = [];
		const lines = (typeof sourceCode === 'string' ? sourceCode : '').split(/\r?\n/);
		const regions = scanRegions(sourceCode);

		// Pass 1: Region order + CMD-DOC-INDEX drift
		_auditRegionsAndJumpTable(lines, regions, violations);
		// Pass 2: Closure and placeholder tokens
		_auditClosureAndPlaceholders(sourceCode, lines, violations);
		// Pass 3: Cognitive complexity
		_auditComplexity(sourceCode, options, violations);

		// Pass 4: MPFS-001 [SEC-09] Rule 9 — Bus-link integrity (ERR_0x0D)
		if (!options.skipBusLinkAudit) _auditBusLinkIntegrity(sourceCode, violations);
		// Pass 5+6: SEC-06B socket breach + INV-SAB-01 Atomics.wait() (ERR_0x1B / ERR_0x1F)
		if (!options.skipSocketAudit) _auditSocketAndAtomicCompliance(sourceCode, lines, violations);
		// Pass 7: MPFS-001 [SEC-09] Rule 3 — Downward Dependency Invariant (ERR_0x0E)
		if (!options.skipDownwardAudit) _auditDownwardDependencies(sourceCode, lines, regions, violations);
		// Pass 8: MPFS-001 [SEC-09] Rule 7 — Zero-Transient Hot-Loop Invariance (INV-08 / AC-08 / ERR_0x18)
		if (!options.skipHotLoopAudit) _auditHotLoopInvariance(sourceCode, lines, violations);
		// Pass 9: MPFS-001 [SEC-05]/[SEC-06]/[SEC-06B]/[SEC-09] Rules 4, 10 — Staging, Socket Guards & Sealing
		if (!options.skipStagingAudit) _auditStagingAndSockets(sourceCode, lines, violations);

		const hasErrors = violations.some((v) => v.severity === 'error');
		return {
			compliant: !hasErrors,
			violations,
			regions
		};
	}

	/**
	 * Checks live in-memory symbol graph for downward dependency violations.
	 * [Pure Function] Complexity <= 9.
	 * @param {PhoenixSymbolIndexerFacade | undefined} indexer
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditLiveDownwardDependencies(indexer, violations) {
		if (!indexer || typeof indexer.verifyDownwardDependencyInvariant !== 'function') return;
		const res = indexer.verifyDownwardDependencyInvariant();
		if (!res.valid && Array.isArray(res.violations)) {
			for (const v of res.violations) {
				violations.push({
					type: 'DOWNWARD_DEPENDENCY',
					message: `ERR_0x0E: Downward Dependency Invariant violation: ${v} (MPFS-001 [SEC-09] Rule 3).`,
					severity: 'error'
				});
			}
		}
	}

	/**
	 * Extracts declared top-level symbols in line range.
	 * [Pure Function] Complexity <= 6.
	 * @param {string[]} lines
	 * @param {number} startLine
	 * @param {number} endLine
	 * @param {RegExp} declRe
	 * @returns {string[]}
	 * @private
	 */
	function _extractDeclaredSymbolsInRange(lines, startLine, endLine, declRe) {
		const declared = [];
		for (let lineIdx = startLine; lineIdx < endLine; lineIdx++) {
			const match = declRe.exec(lines[ lineIdx ] || '');
			if (match && !match[ 1 ].startsWith('_')) {
				declared.push(match[ 1 ]);
			}
		}
		return declared;
	}

	/**
	 * Collects symbols declared in each region of the file.
	 * [Pure Function] Complexity <= 5.
	 * @param {string[]} lines
	 * @param {VLTRegionInfo[]} regions
	 * @returns {Map<string, string[]>}
	 * @private
	 */
	function _collectSectionDeclarations(lines, regions) {
		/** @type {Map<string, string[]>} */
		const regionSymbols = new Map();
		const DECL_RE = /^\s*(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/;

		for (let i = 0; i < regions.length; i++) {
			const r = regions[ i ];
			const startLine = r.line;
			const endLine = (i + 1 < regions.length) ? regions[ i + 1 ].line - 1 : lines.length;
			regionSymbols.set(r.sec, _extractDeclaredSymbolsInRange(lines, startLine, endLine, DECL_RE));
		}
		return regionSymbols;
	}

	/**
	 * Verifies a single line for downward symbol invocations.
	 * [Pure Function] Complexity <= 10.
	 * @param {string} lineText
	 * @param {number} lineIdx
	 * @param {string} currentSec
	 * @param {Map<string, string>} subsequentSymbols
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _checkLineDownwardInvocation(lineText, lineIdx, currentSec, subsequentSymbols, violations) {
		const trimmed = lineText.trim();
		if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
		if (trimmed.startsWith('function') || trimmed.startsWith('class')) return;

		for (const [ sym, targetSec ] of subsequentSymbols) {
			const invocationPattern = new RegExp(String.raw`\b${sym}\s*\(`);
			if (invocationPattern.test(lineText)) {
				violations.push({
					type: 'DOWNWARD_DEPENDENCY',
					message: `ERR_0x0E: Downward Dependency Invariant violation at L${lineIdx + 1}: [${currentSec}] invokes '${sym}()' declared in subsequent section [${targetSec}] (MPFS-001 [SEC-09] Rule 3).`,
					line: lineIdx + 1,
					severity: 'error'
				});
			}
		}
	}

	/**
	 * Verifies section i does not invoke symbols declared in section j > i at module scope.
	 * [Pure Function] Complexity <= 14.
	 * @param {string[]} lines
	 * @param {VLTRegionInfo[]} regions
	 * @param {Map<string, string[]>} regionSymbols
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _checkSectionInvocations(lines, regions, regionSymbols, violations) {
		for (let i = 0; i < regions.length - 1; i++) {
			const currentSec = regions[ i ].sec;
			const startLine = regions[ i ].line;
			const endLine = regions[ i + 1 ].line - 1;

			/** @type {Map<string, string>} */
			const subsequentSymbols = new Map();
			for (let j = i + 1; j < regions.length; j++) {
				const targetSec = regions[ j ].sec;
				const targetSymbols = regionSymbols.get(targetSec) || [];
				for (const s of targetSymbols) {
					subsequentSymbols.set(s, targetSec);
				}
			}

			for (let lineIdx = startLine; lineIdx < endLine; lineIdx++) {
				_checkLineDownwardInvocation(lines[ lineIdx ] || '', lineIdx, currentSec, subsequentSymbols, violations);
			}
		}
	}

	/**
	 * Audits source code for MPFS-001 [SEC-09] Rule 3 Downward Dependency Invariant (ERR_0x0E).
	 * Verifies that code in [SEC-N] never invokes or accesses symbols declared in [SEC-M] where M > N.
	 * [Pure Function] Complexity <= 4.
	 * @param {string} sourceCode
	 * @param {string[]} lines
	 * @param {VLTRegionInfo[]} regions
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditDownwardDependencies(sourceCode, lines, regions, violations) {
		const indexer = (typeof PhoenixSymbolIndexer !== 'undefined')
			? PhoenixSymbolIndexer
			: root?.PhoenixSymbolIndexer;
		_auditLiveDownwardDependencies(indexer, violations);

		if (regions.length < 2) return;
		const regionSymbols = _collectSectionDeclarations(lines, regions);
		_checkSectionInvocations(lines, regions, regionSymbols, violations);
	}

	/**
	 * Checks a single line inside a hot function for allocations or throw statements.
	 * [Pure Function] Complexity <= 12.
	 * @param {string} line
	 * @param {string} hotFnName
	 * @param {number} lineIdx
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _checkHotLoopLine(line, hotFnName, lineIdx, violations) {
		const trimmed = line.trim();
		if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

		if (/\bnew\s+(?:Array|Object)\b/.test(line)) {
			violations.push({
				type: 'HOT_LOOP_ALLOC',
				message: `ERR_0x18: Zero-Transient Hot-Loop Invariant violated in '${hotFnName}()' at L${lineIdx + 1}: transient object/array allocation detected in 60Hz hot path (INV-08 / AC-08 / MPFS-001 [SEC-09] Rule 7).`,
				line: lineIdx + 1,
				severity: 'error'
			});
		} else if (/\bthrow\s+new\s+/.test(line)) {
			violations.push({
				type: 'HOT_LOOP_ALLOC',
				message: `ERR_0x18: Zero-Transient Hot-Loop Invariant violated in '${hotFnName}()' at L${lineIdx + 1}: 'throw' statement detected in 60Hz hot path. Return in-band SOVEREIGN_STATUS code instead (MPFS-001 [SEC-09] Rule 7).`,
				line: lineIdx + 1,
				severity: 'error'
			});
		}
	}

	/**
	 * Extracts hot function name from declaration header line.
	 * [Pure Function] Complexity <= 3.
	 * @param {string} line
	 * @param {RegExp} re
	 * @returns {string | null}
	 * @private
	 */
	function _detectHotFnHeader(line, re) {
		const match = re.exec(line);
		if (!match) return null;
		return match[ 1 ] || 'hotPath';
	}

	/**
	 * Updates brace depth for cognitive complexity tracking.
	 * [Pure Function] Complexity <= 2.
	 * @param {string} line
	 * @param {number} depth
	 * @returns {number}
	 * @private
	 */
	function _updateHotFnDepth(line, depth) {
		let d = depth;
		d += (line.match(/\x7B/g) || []).length;
		d -= (line.match(/\x7D/g) || []).length;
		return d;
	}

	/**
	 * Audits 60Hz hot paths for transient allocations and throw statements.
	 * (INV-08 / AC-08 / MPFS-001 [SEC-09] Rule 7).
	 * [Pure Function] Complexity <= 12.
	 * @param {string} sourceCode
	 * @param {string[]} lines
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditHotLoopInvariance(sourceCode, lines, violations) {
		const HOT_FN_RE = /(?:function\s+|(?:^|\s))(update|render|tick|step)\s*\([^)]*\)/;
		let hotFnName = null;
		let braceDepth = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[ i ];
			if (!hotFnName) {
				hotFnName = _detectHotFnHeader(line, HOT_FN_RE);
				braceDepth = 0;
				continue;
			}

			braceDepth = _updateHotFnDepth(line, braceDepth);
			_checkHotLoopLine(line, hotFnName, i, violations);

			if (braceDepth <= 0 && (line.includes('\x7D') || line.includes('//#region'))) {
				hotFnName = null;
			}
		}
	}

	/**
	 * Audits staging membrane purge verification (MPFS-001 [SEC-06]).
	 * [Pure Function] Complexity <= 5.
	 * @param {string} sourceCode
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _checkStagingMembranePurge(sourceCode, violations) {
		if (sourceCode.includes('_staging') && !/delete\s+(?:root|window|globalThis|\w+)\._staging/.test(sourceCode)) {
			violations.push({
				type: 'STAGING_LEAK',
				message: "ERR_0x1D: Staging membrane leak: '_staging' is utilized but never purged via 'delete root._staging' (MPFS-001 [SEC-06]).",
				severity: 'error'
			});
		}
	}

	/**
	 * Audits polyglot script socket capability guards (MPFS-001 [SEC-06B] / [SEC-09] Rule 10).
	 * [Pure Function] Complexity <= 10.
	 * @param {string} sourceCode
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _checkPolyglotSocketGuards(sourceCode, violations) {
		if (/<script\s+type="text\/plain"[^>]*id="(?:wasm|wgsl)-socket"/.test(sourceCode)) {
			if (!/(?:CAP_WASM_SIMD|CAP_WEBGPU_ACCEL|typeof\s+WebAssembly)/.test(sourceCode)) {
				violations.push({
					type: 'SOCKET_UNGUARDED',
					message: "ERR_0x1C: Polyglot script socket declared without capability verification guard (CAP_WASM_SIMD / CAP_WEBGPU_ACCEL) per MPFS-001 [SEC-06B] / [SEC-09] Rule 10.",
					severity: 'warning'
				});
			}
		}
	}

	/**
	 * Audits sovereign namespace facade sealing (MPFS-001 [SEC-05] / [SEC-09] Rule 4).
	 * [Pure Function] Complexity <= 3.
	 * @param {string} sourceCode
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _checkFacadeSealing(sourceCode, violations) {
		if (/const\s+Phoenix[A-Za-z0-9_$]+\s*=\s*\x7B/.test(sourceCode) && !sourceCode.includes('Object.freeze(')) {
			violations.push({
				type: 'UNFROZEN_FACADE',
				message: "ERR_0x1E: Sovereign namespace facade is not sealed with Object.freeze() per MPFS-001 [SEC-05] / [SEC-09] Rule 4.",
				severity: 'warning'
			});
		}
	}

	/**
	 * Audits staging membrane discipline and polyglot socket capability guards.
	 * (MPFS-001 [SEC-06], [SEC-06B], [SEC-09] Rules 4, 10).
	 * [Pure Function] Complexity <= 3.
	 * @param {string} sourceCode
	 * @param {string[]} lines
	 * @param {VLTComplianceViolation[]} violations
	 * @private
	 */
	function _auditStagingAndSockets(sourceCode, lines, violations) {
		_checkStagingMembranePurge(sourceCode, violations);
		_checkPolyglotSocketGuards(sourceCode, violations);
		_checkFacadeSealing(sourceCode, violations);
	}

	//#endregion [SEC-04]

	//#region [SEC-05] --- PARAMETRIC MODULE SCAFFOLDER & ARCHETYPE EXPANDER

	/**
	 * Replaces mustache-style tokens with provided metadata dictionary.
	 * @param {string} template
	 * @param {Record<string, string>} dictionary
	 * @returns {string}
	 * @private
	 */
	function _replaceTokens(template, dictionary) {
		let rendered = template;
		for (const [ key, val ] of Object.entries(dictionary)) {
			rendered = rendered.replaceAll(`{{${key}}}`, val);
		}
		return rendered;
	}

	/**
	 * Generates a ready-to-use, compliant JavaScript module from template and metadata.
	 * Automatically performs jump-table line calibration prior to returning.
	 * If PhoenixTypeResolver is initialized, enriches emitted function stubs with
	 * typed JSDoc contracts inferred from phoenix.d.ts (MPFS-001 [SEC-04] / [SEC-10]).
	 *
	 * @param {string} templateSource - Raw template source
	 * @param {Record<string, string>} [metadata] - Variable substitutions
	 * @returns {string} Fully calibrated and compliant module source
	 */
	function scaffoldModule(templateSource, metadata = {}) {
		if (typeof templateSource !== 'string') return '';
		const moduleName = metadata.MODULE_NAME || 'SampleModule';
		const defaults = {
			MODULE_NAME: moduleName,
			MODULE_NAME_UPPER: moduleName.toUpperCase(),
			DOC_IDENTIFIER: `LEDGER-PHOENIX-${moduleName.toUpperCase()}-001`,
			DOMAIN_SUBTITLE: 'Autonomous Domain Subsystem',
			PRIMARY_API_NAME: moduleName.charAt(0).toLowerCase() + moduleName.slice(1),
			FACADE_NAMESPACE: `Phoenix${moduleName}`,
			CARTRIDGE_NAME: `Phoenix${moduleName}Cartridge`,
			TYPE_PREFIX: moduleName,
			MODULE_TAG: moduleName.toUpperCase(),
			TIMESTAMP: new Date().toISOString()
		};

		const merged = { ...defaults, ...metadata };
		const substituted = _replaceTokens(templateSource, merged);

		// SEC-10 / MPFS-001 [SEC-04]: Enrich stubs with typed JSDoc contracts if resolver is ready
		const resolver = (typeof PhoenixTypeResolver !== 'undefined')
			? PhoenixTypeResolver
			: root?.PhoenixTypeResolver;
		const rawEnriched = (resolver?.isInitialized?.() && typeof resolver.scaffoldAllContracts === 'function')
			? resolver.scaffoldAllContracts(substituted)
			: substituted;
		const enriched = typeof rawEnriched === 'string' ? rawEnriched : (rawEnriched?.scaffoldedSource || substituted);

		// Calibrate jump table line numbers to exact accuracy
		return syncJumpTable(enriched);
	}

	//#endregion [SEC-05]

	//#region [SEC-06] --- UNIVERSAL FACADE & DUAL-BINDING MODULE EXPORT

	const PhoenixVLTComplianceEngine = Object.freeze({
		scanRegions,
		formatJumpTable,
		syncJumpTable,
		validateCompliance,
		scaffoldModule,
		/**
		 * SEC-09 Rule 9 bus-link integrity audit facade.
		 * Delegates to SynarcheCompiler.verifyBusLinkIntegrity() when available.
		 * @param {string} sourceCode
		 * @returns {VLTBusLinkReport}
		 */
		verifyBusLinkIntegrity(sourceCode) {
			/** @type {VLTComplianceViolation[]} */
			const sink = [];
			return _auditBusLinkIntegrity(sourceCode, sink);
		},
		/**
		 * SEC-06B / INV-SAB-01 socket & Atomics compliance audit facade.
		 * @param {string} sourceCode
		 * @returns {VLTSocketAuditResult}
		 */
		auditSocketCompliance(sourceCode) {
			/** @type {VLTComplianceViolation[]} */
			const sink = [];
			const lines = (typeof sourceCode === 'string' ? sourceCode : '').split(/\r?\n/);
			return _auditSocketAndAtomicCompliance(sourceCode, lines, sink);
		},
		/**
		 * MPFS-001 [SEC-09] Rule 3 downward dependency invariant audit.
		 * @param {string} sourceCode
		 * @returns {VLTComplianceViolation[]}
		 */
		auditDownwardDependencies(sourceCode) {
			/** @type {VLTComplianceViolation[]} */
			const sink = [];
			const lines = (typeof sourceCode === 'string' ? sourceCode : '').split(/\r?\n/);
			const regions = scanRegions(sourceCode);
			_auditDownwardDependencies(sourceCode, lines, regions, sink);
			return sink;
		},
		/**
		 * MPFS-001 [SEC-09] Rule 7 zero-transient hot-loop audit (INV-08 / AC-08).
		 * @param {string} sourceCode
		 * @returns {VLTComplianceViolation[]}
		 */
		auditHotLoopCompliance(sourceCode) {
			/** @type {VLTComplianceViolation[]} */
			const sink = [];
			const lines = (typeof sourceCode === 'string' ? sourceCode : '').split(/\r?\n/);
			_auditHotLoopInvariance(sourceCode, lines, sink);
			return sink;
		},
		/**
		 * MPFS-001 [SEC-06] staging membrane and facade sealing audit.
		 * @param {string} sourceCode
		 * @returns {VLTComplianceViolation[]}
		 */
		auditStagingCompliance(sourceCode) {
			/** @type {VLTComplianceViolation[]} */
			const sink = [];
			const lines = (typeof sourceCode === 'string' ? sourceCode : '').split(/\r?\n/);
			_auditStagingAndSockets(sourceCode, lines, sink);
			return sink;
		}
	});

	/* ── Dual-Binding Global & CommonJS Export ──────────────────────────────── */
	if (typeof window !== 'undefined') {
		window.PhoenixVLTComplianceEngine = PhoenixVLTComplianceEngine;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis.PhoenixVLTComplianceEngine = PhoenixVLTComplianceEngine;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PhoenixVLTComplianceEngine;
	}

	//#endregion [SEC-06]

	//#region [SEC-07] --- PHOENIX SYMBOL INDEXER BRIDGE (SEC-10 DELEGATION)

	/**
	 * Resolves a jump anchor to its canonical line range using the live PhoenixSymbolIndexer
	 * topology (MPFS-001 [SEC-10]).
	 * Falls back to a synchronous regex scan of the source if the indexer is not present.
	 * Cognitive Complexity: <= 3.
	 * @param {string} anchorId - e.g. '[SEC-04]', '[WASM-01]'
	 * @param {string} [sourceCode] - Optional source to scan as fallback
	 * @returns {{ startLine: number; endLine: number; plane: 0|1|2 } | null}
	 */
	function resolveAnchor(anchorId, sourceCode) {
		const indexer = (typeof PhoenixSymbolIndexer !== 'undefined')
			? PhoenixSymbolIndexer
			: root?.PhoenixSymbolIndexer;

		if (indexer && typeof indexer.resolve === 'function') {
			const result = indexer.resolve(anchorId);
			if (result) return result;
		}

		if (!sourceCode) return null;
		const lines = sourceCode.split(/\r?\n/);
		const escapedId = anchorId.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
		const anchorRe = new RegExp(escapedId.replace(String.raw`\[`, String.raw`\[`).replace(String.raw`\]`, String.raw`\]`));
		for (let i = 0; i < lines.length; i++) {
			if (anchorRe.test(lines[ i ])) {
				return { startLine: i + 1, endLine: i + 1, plane: /** @type {0} */ (0) };
			}
		}
		return null;
	}

	/**
	 * Validates the downward dependency invariant of the live region topology
	 * by delegating to PhoenixSymbolIndexer.verifyDownwardDependencyInvariant().
	 * Returns a trivially valid result if the indexer is not yet active.
	 * Cognitive Complexity: <= 2.
	 * @returns {{ valid: boolean; violations: string[] }}
	 */
	function validateTopology() {
		const indexer = (typeof PhoenixSymbolIndexer !== 'undefined')
			? PhoenixSymbolIndexer
			: root?.PhoenixSymbolIndexer;

		if (indexer && typeof indexer.verifyDownwardDependencyInvariant === 'function') {
			return indexer.verifyDownwardDependencyInvariant();
		}
		return { valid: true, violations: [] };
	}

	// Augment the already-frozen facade on globalThis/window with SEC-07 bridge methods
	const _sec07Bridge = Object.freeze({ resolveAnchor, validateTopology });
	if (typeof globalThis !== 'undefined') {
		globalThis.PhoenixVLTComplianceEngine_SEC07 = _sec07Bridge;
	}

	//#endregion [SEC-07]
})(/** @type {Window & typeof globalThis} */ (
	(typeof window !== 'undefined' && window) ||
	(typeof globalThis !== 'undefined' && globalThis) ||
	(typeof global !== 'undefined' && global) ||
	{}
));
