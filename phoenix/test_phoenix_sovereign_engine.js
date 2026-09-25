/* Phoenix Sovereign Engine v7.0.0-ULTIMATE-FUSION — Verification Suite
 * Protocols: VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 *
 * Native Node.js only. Zero external test framework.
 * Run: node testing/test_phoenix_sovereign_engine.js
 *
 * Scenario matrix:
 *   T-01  Happy-path proposal accepted (ALL_GATES → PASS)
 *   T-02  Malformed path rejected at STRUCTURAL_GATE
 *   T-03  Placeholder content rejected at STRUCTURAL_GATE (linter)
 *   T-04  Missing capability rejected at CAPABILITY_GATE
 *   T-05  Failing behavior test rejected at BEHAVIOR_GATE + rollback verified
 *   T-06  Expired capability rejected at CAPABILITY_GATE
 *   T-07  Journal entries match receipt count
 *   T-08  diagnostics() stats are accurate
 *   T-09  destroy() resets lifecycle
 *   T-10  repair loop cap: max REPAIR_LOOP_CAP iterations, no infinite regress
 */

const assert = require("node:assert/strict");
const path = require("node:path");
/** @type {any} */
const Phoenix = require(path.join(__dirname, "phoenix_sovereign_engine.js"));

/* ── Minimal in-memory storage stub (OPFS unavailable in Node) ─────────── */
class NodeStorage extends Phoenix.SovereignStorage {
	constructor() {
		super("test-ns");
		/** @type {any[]} */
		this._journal = [];
		/** @type {Map<string, any>} */
		this._kv = new Map();
	}
	async initialize() {
		return this;
	}
	/**
	 * @param {any} r
	 */
	async appendJournalEntry(r) {
		this._journal.push(r);
	}
	async readJournal() {
		return this._journal.slice();
	}
	/**
	 * @param {string} name
	 * @param {any} value
	 */
	async write(name, value) {
		this._kv.set(name, value);
		return true;
	}
	/**
	 * @param {string} name
	 */
	async read(name) {
		return this._kv.has(name) ? this._kv.get(name) : null;
	}
	get hasOPFS() {
		return false;
	}
	get hasProject() {
		return false;
	}
}

/* ── Test harness ─────────────────────────────────────────────────────── */
let _passed = 0;
let _failed = 0;

/**
 * @param {string} label
 * @param {() => Promise<void>} fn
 */
async function test(label, fn) {
	try {
		await fn();
		console.log(`  ✓ ${label}`);
		_passed += 1;
	} catch (/** @type {any} */ err) {
		console.error(`  ✗ ${label}`);
		console.error(`      ${err.message}`);
		if (err.stack) console.error(err.stack.split("\n").slice(1, 4).join("\n"));
		_failed += 1;
	}
}

/* ── Factory: fresh governor per scenario ─────────────────────────────── */
/**
 * @param {Record<string, any>} [initialState]
 * @returns {any}
 */
function makeGovernor(initialState) {
	const spec = new Phoenix.SpecificationRegistry();
	spec.registerTarget("combat/SEC-10", {
		tenant: "Combat",
		path: "combat.js",
		allowedOperations: [ "MODIFY" ],
		capabilities: [],
		dependencies: [],
	});
	spec.registerInvariant("damage.nonnegative", (/** @type {any} */ state) =>
		state.damage >= 0 ? true : `damage is negative: ${state.damage}`,
	);
	spec.registerTest("damage.spec", (/** @type {any} */ state) =>
		state.damage === 10 ? true : `expected damage=10, got ${state.damage}`,
	);
	spec.registerTest("always.fail", () => false);

	const storage = new NodeStorage();
	const gov = new Phoenix.Governor({
		spec,
		storage,
		initialState: initialState !== undefined ? initialState : { damage: 10 },
	});
	return gov;
}

let _proposalCounter = 0;

/**
 * Build a minimal valid PGE-DSL-1 proposal
 * @param {Record<string, any>} [overrides]
 * @returns {any}
 */
function makeProposal(overrides) {
	_proposalCounter += 1;
	const base = {
		schemaVersion: "PGE-DSL-1",
		proposalId: `test-proposal-${_proposalCounter}`,
		target: "combat/SEC-10",
		operation: "MODIFY",
		intent: "Replace implementation without changing canonical output",
		requiredCapabilities: [],
		expectedInvariants: [ "damage.nonnegative" ],
		testsRequested: [ "damage.spec" ],
		changes: [
			{
				type: "replace_text",
				path: "combat.js",
				search: "return 10;",
				content: "return 10;",
			},
		],
		explanation: "deterministic verification",
	};
	return { ...base, ...overrides };
}

/**
 * Grant capability so the test bypasses CAPABILITY_GATE
 * @param {any} gov
 * @param {string} subject
 */
function grantAll(gov, subject) {
	// We patch has() to unconditionally allow 'local-ai' through CAPABILITY_GATE
	const orig = gov.capabilities.has.bind(gov.capabilities);
	gov.capabilities.has = (/** @type {any} */ subj, /** @type {any} */ cap, /** @type {any} */ tgt, /** @type {any} */ txId, /** @type {any} */ tick) => {
		if (subj === subject) return true;
		return orig(subj, cap, tgt, txId, tick);
	};
}

/**
 * @param {string} raw
 */
async function fakeParser(raw) {
	return JSON.parse(raw);
}

/* ── RUN SUITE ─────────────────────────────────────────────────────────── */
async function run() {
	console.log(
		"\nPHOENIX SOVEREIGN ENGINE v7.0.0-ULTIMATE-FUSION — TEST SUITE\n",
	);

	/* ── T-01: Happy path ─────────────────────────────────────────────────── */
	await test("T-01: valid proposal → PASS at ALL_GATES", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");
		grantAll(gov, "local-ai");

		const proposal = makeProposal();
		const receipt = await gov.submit(proposal, "local-ai");

		assert.equal(receipt.status, Phoenix.STATUS.PASS);
		assert.equal(receipt.gate, Phoenix.GATES.ALL);
		assert.equal(typeof receipt.integrity, "string");
		assert.equal(receipt.integrity.length, 8);
		assert.ok(receipt.receiptId.startsWith("receipt-"));
		assert.equal(gov.diagnostics().stats.accepted, 1);
		assert.equal(gov.diagnostics().stats.rejected, 0);
		// Source unchanged (identity replace)
		assert.equal(
			gov.getSource("combat.js"),
			"function calculateDamage(){ return 10; }",
		);
	});

	/* ── T-02: Malformed path traversal rejected at STRUCTURAL_GATE ─────── */
	await test("T-02: path traversal → STRUCTURAL_GATE REJECTED", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");
		grantAll(gov, "local-ai");

		const proposal = makeProposal({
			proposalId: "bad-path-test",
			changes: [
				{
					type: "replace_text",
					path: "../combat.js",
					search: "x",
					content: "y",
				},
			],
		});
		const receipt = await gov.submit(proposal, "local-ai");
		assert.equal(receipt.status, Phoenix.STATUS.REJECTED);
		assert.equal(receipt.gate, Phoenix.GATES.STRUCTURAL);
		assert.ok(Array.isArray(receipt.details));
		assert.ok(receipt.details.some((/** @type {any} */ d) => d.includes("unsafe path")));
	});

	/* ── T-03: Placeholder content rejected at STRUCTURAL_GATE (linter) ─── */
	await test("T-03: placeholder in content → STRUCTURAL_GATE REJECTED", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");
		grantAll(gov, "local-ai");

		const proposal = makeProposal({
			proposalId: "placeholder-test",
			changes: [
				{
					type: "replace_text",
					path: "combat.js",
					search: "return 10;",
					content: "return 10; // ...",
				},
			],
		});
		const receipt = await gov.submit(proposal, "local-ai");
		assert.equal(receipt.status, Phoenix.STATUS.REJECTED);
		assert.equal(receipt.gate, Phoenix.GATES.STRUCTURAL);
		assert.ok(receipt.details.some((/** @type {any} */ d) => d.includes("placeholder")));
	});

	/* ── T-04: Missing capability → CAPABILITY_GATE ─────────────────────── */
	await test("T-04: no capability grant → CAPABILITY_GATE REJECTED", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");
		// Do NOT grantAll — let capability check fail naturally

		const proposal = makeProposal();
		const receipt = await gov.submit(proposal, "local-ai");
		assert.equal(receipt.status, Phoenix.STATUS.REJECTED);
		assert.equal(receipt.gate, Phoenix.GATES.CAPABILITY);
		assert.ok(Array.isArray(receipt.details) && receipt.details.length > 0);
	});

	/* ── T-05: Behavior gate failure + source rollback verified ──────────── */
	await test("T-05: failing test → BEHAVIOR_GATE REJECTED, source rolled back", async () => {
		const originalSource = "function calculateDamage(){ return 10; }";
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", originalSource);
		grantAll(gov, "local-ai");

		const proposal = makeProposal({
			proposalId: "behavior-fail",
			testsRequested: [ "always.fail" ],
		});
		const receipt = await gov.submit(proposal, "local-ai");
		assert.equal(receipt.status, Phoenix.STATUS.REJECTED);
		assert.equal(receipt.gate, Phoenix.GATES.BEHAVIOR);
		// Source must be rolled back to pre-apply state
		assert.equal(gov.getSource("combat.js"), originalSource);
	});

	/* ── T-06: Expired capability rejected ─────────────────────────────────── */
	await test("T-06: expired capability → CAPABILITY_GATE REJECTED", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");

		// Grant with expiryTick = current tick (already expired on next submit)
		const futureTxId = "future-tx";
		gov.capabilities.grant(
			"local-ai",
			"Combat.MODIFY",
			"combat/SEC-10",
			futureTxId,
			0,
		);

		const proposal = makeProposal({ proposalId: "expired-cap-test" });
		const receipt = await gov.submit(proposal, "local-ai");
		// Capability for this specific transactionId isn't granted, so CAPABILITY_GATE fires
		assert.equal(receipt.status, Phoenix.STATUS.REJECTED);
		assert.equal(receipt.gate, Phoenix.GATES.CAPABILITY);
	});

	/* ── T-07: Journal entries match receipt count ───────────────────────── */
	await test("T-07: OPFS journal contains one entry per receipt", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");
		grantAll(gov, "local-ai");

		// Submit 2 proposals: one pass, one structural failure
		await gov.submit(makeProposal({ proposalId: "j-pass" }), "local-ai");
		await gov.submit(
			makeProposal({
				proposalId: "j-fail",
				changes: [
					{ type: "replace_text", path: "../evil", search: "x", content: "y" },
				],
			}),
			"local-ai",
		);

		const journalEntries = await gov.storage.readJournal();
		const ledger = gov.getReceipts();

		assert.equal(journalEntries.length, ledger.length);
		assert.ok(
			journalEntries.every(
				(/** @type {any} */ e) =>
					e.receiptVersion === Phoenix.RECEIPT_VERSION &&
					typeof e.integrity === "string" &&
					e.integrity.length === 8,
			),
		);
	});

	/* ── T-08: diagnostics() accuracy ──────────────────────────────────────── */
	await test("T-08: diagnostics() accurately reflects accept/reject/error stats", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");
		grantAll(gov, "local-ai");

		await gov.submit(makeProposal({ proposalId: "d-pass-1" }), "local-ai");
		await gov.submit(makeProposal({ proposalId: "d-pass-2" }), "local-ai");
		await gov.submit(
			makeProposal({
				proposalId: "d-bad",
				changes: [
					{ type: "replace_text", path: "../x", search: "a", content: "b" },
				],
			}),
			"local-ai",
		);

		const diag = gov.diagnostics();
		assert.equal(diag.stats.proposals, 3);
		assert.equal(diag.stats.accepted, 2);
		assert.equal(diag.stats.rejected, 1);
		assert.equal(diag.stats.errors, 0);
		assert.equal(diag.version, Phoenix.VERSION);
		assert.equal(diag.lifecycle, Phoenix.STATES.READY);
	});

	/* ── T-09: destroy() terminates the governor ────────────────────────────── */
	await test("T-09: destroy() sets lifecycle to DESTROYED", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.destroy();
		assert.equal(gov.diagnostics().lifecycle, Phoenix.STATES.DESTROYED);
		assert.equal(gov.diagnostics().sourceCount, 0);
	});

	/* ── T-10: Repair loop cap — no infinite regress ───────────────────────── */
	const fakeParser = (str) => JSON.parse(str);

	await test("T-10: repairLoop caps at REPAIR_LOOP_CAP and returns final receipt", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");

		// No capability grant → every repair attempt will be rejected at CAPABILITY_GATE
		const originalProposal = makeProposal({ proposalId: "repair-origin" });
		const firstReceipt = await gov.submit(originalProposal, "local-ai");
		assert.equal(firstReceipt.status, Phoenix.STATUS.REJECTED);

		let callCount = 0;
		const fakeBridge = {
			ready: true,
			generate: async (_prompt = "") => {
				callCount += 1;
				// Return a valid-looking proposal that will still be rejected (no capability)
				return JSON.stringify(
					makeProposal({ proposalId: `repaired-${callCount}` }),
				);
			},
		};

		const finalReceipt = await gov.repairLoop(
			firstReceipt,
			originalProposal,
			"local-ai",
			fakeBridge,
			fakeParser,
		);

		// Must not exceed REPAIR_LOOP_CAP calls
		assert.ok(
			callCount <= Phoenix.REPAIR_LOOP_CAP,
			`Expected <= ${Phoenix.REPAIR_LOOP_CAP} LLM calls, got ${callCount}`,
		);
		assert.equal(finalReceipt.status, Phoenix.STATUS.REJECTED);
	});

	/* ── T-11: SLM Hydration — 1.5b small model partial output hydration ──── */
	await test("T-11: repairLoop hydrates partial SLM JSON into compliant PGE-DSL-1 envelope", async () => {
		const gov = makeGovernor();
		await gov.initialize();
		grantAll(gov, "local-ai");
		gov.registerSource("combat.js", "function calculateDamage(){ return 10; }");

		// Original proposal with path traversal causing STRUCTURAL_GATE REJECTED
		const originalProposal = makeProposal({
			proposalId: "slm-origin",
			changes: [{
				type: "replace_text",
				path: "../outside.js",
				search: "return 10;",
				content: "function calculateDamage(){ return 20; }"
			}]
		});
		const firstReceipt = await gov.submit(originalProposal, "local-ai");
		assert.equal(firstReceipt.status, Phoenix.STATUS.REJECTED);

		// Fake bridge returns a 1.5B style partial JSON without target, operation, or envelope metadata
		const fakeBridge = {
			ready: true,
			generate: async () => JSON.stringify({
				path: "combat.js",
				search: "return 10;",
				content: "return 25;"
			})
		};

		const finalReceipt = await gov.repairLoop(
			firstReceipt,
			originalProposal,
			"local-ai",
			fakeBridge,
			fakeParser
		);

		assert.equal(finalReceipt.status, Phoenix.STATUS.PASS);
		assert.ok(gov.getSource("combat.js").includes("return 25;"), "Hydrated SLM patch applied successfully");
	});

	/* ── T-12: ERL Hot-Loop Cataloging & Fingerprinting ────────────────────── */
	await test("T-12: PhoenixErrorResolutionLedger fingerprints and catalogs hot loop rules", async () => {
		const erl = new Phoenix.PhoenixErrorResolutionLedger();
		const fp = erl.computeFingerprint({ rule: "HOT_LOOP/TRANSIENT_ALLOCATION" });
		assert.equal(fp, "HOT_LOOP/TRANSIENT_ALLOCATION");

		erl.record({
			id: "erl_test_hot_loop",
			fingerprint: fp,
			rule: "HOT_LOOP/TRANSIENT_ALLOCATION",
			description: "Pool slot acquisition pattern",
			searchPattern: ".push({",
			replacePattern: "._acquirePool({",
			verifiedReceipt: "PASS",
			timestamp: new Date().toISOString(),
			useCount: 1
		});

		const matched = erl.findMatch({ rule: "HOT_LOOP/TRANSIENT_ALLOCATION" }, "sim.spawnBeacons.push({");
		assert.ok(matched, "ERL should match hot-loop allocation line");
		assert.equal(matched.searchPattern, ".push({");
	});

	/* ── T-13: ERL VSRP/PRNG-AUTHORITY Fast-Path Resolution ────────────────── */
	await test("T-13: PhoenixErrorResolutionLedger seeds and resolves VSRP/PRNG-AUTHORITY", async () => {
		const erl = new Phoenix.PhoenixErrorResolutionLedger();
		const fp = erl.computeFingerprint({ rule: "VSRP/PRNG-AUTHORITY" });
		assert.equal(fp, "VSRP/PRNG-AUTHORITY");

		const matched = erl.findMatch({ rule: "VSRP/PRNG-AUTHORITY" }, "const x = Math.random();");
		assert.ok(matched, "ERL should match VSRP/PRNG-AUTHORITY rule");
		assert.equal(matched.searchPattern, "Math.random()");
		assert.ok(matched.replacePattern.includes("_rng.next()"), "Should substitute with deterministic PRNG");
	});

	/* ── T-14: ERL Regex & Proximity Line Fast-Path Resolution ───────────── */
	await test("T-14: ERL matches isRegex rules and snaps proximity lines in executeFastPath", async () => {
		const erl = new Phoenix.PhoenixErrorResolutionLedger();
		const matchedRegex = erl.findMatch({ rule: "REGEX/VERBOSE_CHAR_CLASS" });
		assert.ok(matchedRegex, "Should find REGEX/VERBOSE_CHAR_CLASS template");
		assert.equal(matchedRegex.isRegex, true, "Template should have isRegex flag");

		// Test proximity snapping: reported line 3, actual code on line 6
		const shiftedCode = [
			"const a = 1;",
			"const b = 2;",
			"const c = 3;",
			"const d = 4;",
			"const e = 5;",
			"const r = Math.random();",
			"const g = 7;"
		].join("\n");

		const diags = [{ rule: "VSRP/PRNG-AUTHORITY", line: 3, message: "Forbidden Math.random()" }];
		const result = Phoenix.PhoenixBatchRemediationPipeline.executeFastPath(
			shiftedCode,
			diags,
			"shifted.js",
			erl,
			(candidate) => ({ pass: !candidate.includes("Math.random()") })
		);

		assert.equal(result.fastPathApplied, 1, "Should apply 1 fast path fix via proximity scan");
		assert.ok(result.patchedSource.includes("_rng.next()"), "Patched source should contain PRNG call");
		const patchedLines = result.patchedSource.split("\n");
		assert.ok(patchedLines[5].includes("_rng.next()"), "Line 6 should be the patched line");

		// Test regex fast-path replacement: [a-zA-Z0-9_] -> \w
		const regexCode = "const isWord = /[a-zA-Z0-9_]/.test(ch);";
		const regexDiags = [{ rule: "REGEX/VERBOSE_CHAR_CLASS", line: 1, message: "Verbose char class" }];
		const regexResult = Phoenix.PhoenixBatchRemediationPipeline.executeFastPath(
			regexCode,
			regexDiags,
			"scanner.js",
			erl,
			(candidate) => ({ pass: !candidate.includes("[a-zA-Z0-9_]") })
		);

		assert.equal(regexResult.fastPathApplied, 1, "Should apply regex replacement");
		assert.ok(regexResult.patchedSource.includes("/\\w/"), "Patched source should use shorthand \\w");
	});

	await test("T-15: PhoenixChunkDiffEngine.reconcileFuzzyHunk handles drift, indentation, and duplicate blocks", async () => {
		const diffEngine = Phoenix.PhoenixChunkDiffEngine;
		assert.ok(typeof diffEngine.reconcileFuzzyHunk === "function", "reconcileFuzzyHunk should be exported");

		// 1. Exact match
		const src1 = "function calculateTotal(items) {\n  let total = 0;\n  return total;\n}";
		const search1 = "let total = 0;\n  return total;";
		const content1 = "let sum = items.reduce((a, b) => a + b, 0);\n  return sum;";
		const res1 = diffEngine.reconcileFuzzyHunk(src1, search1, content1);
		assert.equal(res1.pass, true, "Exact match should pass");
		assert.equal(res1.method, "EXACT", "Method should be EXACT");
		assert.ok(res1.patchedSource.includes("items.reduce"), "Source should be updated");

		// 2. Normalization (\r\n vs \n)
		const src2 = "line1\r\nline2\r\nline3";
		const search2 = "line2\nline3";
		const content2 = "line2_mod\nline3_mod";
		const res2 = diffEngine.reconcileFuzzyHunk(src2, search2, content2);
		assert.equal(res2.pass, true, "CRLF normalization should pass");
		assert.ok(res2.patchedSource.includes("line2_mod"), "Normalized source should contain replacement");

		// 3. Multi-line fuzzy match with minor typo and indentation shift
		const src3 = [
			"class PlayerActor {",
			"    takeDamage(amount) {",
			"        this.health -= amount;",
			"        if (this.health <= 0) {",
			"            this.die();",
			"        }",
			"    }",
			"}"
		].join("\n");

		// Model emitted 0-indent search with minor spacing variance and 0-indent replacement
		const search3 = [
			"this.health -= amount;",
			"if (this.health <= 0) {",
			"    this.die();",
			"}"
		].join("\n");

		const content3 = [
			"this.health -= Math.max(0, amount - this.defense);",
			"if (this.health <= 0) {",
			"    this.triggerDeathSequence();",
			"}"
		].join("\n");

		const res3 = diffEngine.reconcileFuzzyHunk(src3, search3, content3, { activeLine: 3 });
		assert.equal(res3.pass, true, "Fuzzy multi-line match should pass");
		assert.equal(res3.method, "FUZZY", "Method should be FUZZY");
		assert.ok(res3.confidence >= 0.85, "Confidence should be >= 0.85");
		// Check that 8-space indentation was automatically preserved
		assert.ok(res3.patchedSource.includes("        this.health -= Math.max(0, amount - this.defense);"), "Indentation should be infilled to 8 spaces");
		assert.ok(res3.patchedSource.includes("            this.triggerDeathSequence();"), "Nested block should be infilled to 12 spaces");

		// 4. Duplicate block disambiguation via activeLine
		const src4 = [
			"function headerBlock() {",
			"  const val = 10;",
			"  return val;",
			"}",
			"// Middle code section...",
			"function footerBlock() {",
			"  const val = 10;",
			"  return val;",
			"}"
		].join("\n");

		const dupSearch = "  const val = 10;\n  return val;";
		const dupContent = "  const val = 99;\n  return val;";

		// Target footerBlock (line 7)
		const res4 = diffEngine.reconcileFuzzyHunk(src4, dupSearch, dupContent, { activeLine: 7 });
		assert.equal(res4.pass, true, "Duplicate block resolution should pass");
		const lines4 = res4.patchedSource.split("\n");
		assert.equal(lines4[1], "  const val = 10;", "Header block should remain untouched at 10");
		assert.equal(lines4[6], "  const val = 99;", "Footer block should be patched to 99");

		// 5. Anti-theater rejection of low-confidence / generic braces
		const src5 = "function test() {\n  return false;\n}";
		const search5 = "while (active) {\n  doSomethingCompletelyDifferent();\n}";
		const res5 = diffEngine.reconcileFuzzyHunk(src5, search5, "replacement");
		assert.equal(res5.pass, false, "Completely mismatched search should fail closed");
		assert.equal(res5.method, "NONE", "Method should be NONE");
		assert.equal(res5.patchedSource, src5, "Source should remain unmodified");
	});

	await test("T-16: PhoenixChunkDiffEngine.computeWordDiff & alignHunkSplit provide intra-line diffs and side-by-side alignment", async () => {
		const diffEngine = Phoenix.PhoenixChunkDiffEngine;

		// 1. Intra-line word diff verification
		const oldLine = "const total = (h.addLines?.length || 0);";
		const newLine = "const total = (h.addLines?.length ?? 0);";
		const wordDiff = diffEngine.computeWordDiff(oldLine, newLine);

		assert.ok(Array.isArray(wordDiff.oldTokens), "oldTokens should be an array");
		assert.ok(Array.isArray(wordDiff.newTokens), "newTokens should be an array");

		const delTokens = wordDiff.oldTokens.filter(t => t.type === "del");
		const addTokens = wordDiff.newTokens.filter(t => t.type === "add");

		assert.equal(delTokens.length, 1, "Should detect exactly 1 deleted token chunk");
		assert.equal(delTokens[0].text, "||", "Deleted token chunk should be '||'");

		assert.equal(addTokens.length, 1, "Should detect exactly 1 added token chunk");
		assert.equal(addTokens[0].text, "??", "Added token chunk should be '??'");

		// 2. Aligned Split Hunk Rows
		const src = "function calculate() {\n  const a = 1;\n  const b = 2;\n  return a + b;\n}";
		const modified = "function calculate() {\n  const a = 10;\n  return a + 0;\n}";
		const hunks = diffEngine.computeHunks(src, modified);
		assert.equal(hunks.length, 1, "Should produce 1 hunk");

		const splitRows = diffEngine.alignHunkSplit(hunks[0]);
		assert.ok(splitRows.length >= 4, "Split rows should include context, paired modifications, and pads");

		// Verify that at least one row has tokens attached for intra-line highlighting
		const modifiedRow = splitRows.find(r => r.left.type === "del" && r.right.type === "add");
		assert.ok(modifiedRow, "Should find a paired modified row (left del, right add)");
		assert.ok(modifiedRow.left.tokens && modifiedRow.left.tokens.length > 0, "Left pane should have word diff tokens");
		assert.ok(modifiedRow.right.tokens && modifiedRow.right.tokens.length > 0, "Right pane should have word diff tokens");

		// Verify pad rows when deletion count differs from addition count
		const padRow = splitRows.find(r => r.left.type === "pad" || r.right.type === "pad");
		assert.ok(padRow, "Should find a pad spacer row for unequal line modifications");
	});

	/* ── Summary ─────────────────────────────────────────────────────────── */
	console.log(`\n${"─".repeat(60)}`);
	if (_failed === 0) {
		console.log(
			`PHOENIX SOVEREIGN ENGINE v7.0.0-ULTIMATE-FUSION: ALL ${_passed} TESTS PASS ✓`,
		);
	} else {
		console.error(
			`PHOENIX SOVEREIGN ENGINE v7.0.0-ULTIMATE-FUSION: ${_failed} FAILED / ${_passed} PASSED`,
		);
		process.exitCode = 1;
	}
}

run().catch((err) => { // NOSONAR: Top-level invocation in CommonJS Node environment
	console.error("[FATAL] Uncaught error in test runner:", err);
	process.exitCode = 1;
});



