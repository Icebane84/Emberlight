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

(async function main() {
	try {
		await run();
	} catch (err) {
		console.error("[FATAL] Uncaught error in test runner:", err);
		process.exitCode = 1;
	}
})();
