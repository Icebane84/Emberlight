/* evaluateProposalWithSentinel — Integration Glue v2.0.0-ULTIMATE-FUSION
 * Protocols: VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 *
 * Full pipeline:
 *   1. Synchronous linter (Layer 1) — structural source audit
 *   2. Phoenix 3-tier governor (Layer 2) — STRUCTURAL → CAPABILITY → BEHAVIOR → COMMIT
 *   3. OPFS append-only journal (Layer 3) — receipt persisted after every gate
 *   4. AI repair loop (Layer 3) — rejected receipts routed back through WebLLM bridge
 *
 * Dependencies (must be present on the calling global before this function runs):
 *   window.PhoenixSovereignEngine  — phoenix_sovereign_engine.js
 *   window.PhoenixGovernor         — Governor instance, initialized and READY
 *   window.PhoenixWebLLMBridge     — PhoenixWebLLMWorkerBridge instance (optional)
 *   window.PhoenixProposalParser   — async fn(rawText) → proposal object (optional)
 */

/**
 * Resolves Phoenix Engine and Governor singletons from global scopes.
 * @returns {{ Engine: PhoenixSovereignEngineFacade, governor: PhoenixGovernorInstance }}
 */
function _resolvePhoenixSingletons() {
	/** @type {PhoenixSovereignEngineFacade | undefined} */
	let Engine;
	if (typeof PhoenixSovereignEngine !== "undefined") {
		Engine = PhoenixSovereignEngine;
	} else if (typeof globalThis !== "undefined") {
		Engine = globalThis.PhoenixSovereignEngine;
	}

	if (!Engine) {
		throw new Error(
			"[SENTINEL] PhoenixSovereignEngine is not loaded. " +
			"Ensure phoenix_sovereign_engine.js is evaluated before calling evaluateProposalWithSentinel.",
		);
	}

	/** @type {PhoenixGovernorInstance | undefined} */
	let governor;
	if (typeof PhoenixGovernor !== "undefined") {
		governor = PhoenixGovernor;
	} else if (typeof globalThis !== "undefined") {
		governor = globalThis.PhoenixGovernor;
	}

	if (!governor || typeof governor.submit !== "function") {
		throw new Error(
			"[SENTINEL] PhoenixGovernor instance not found or not initialized. " +
			"Create a Governor, call governor.initialize(), and assign it to window.PhoenixGovernor.",
		);
	}

	return { Engine, governor };
}

/**
 * Runs synchronous structural linter on all proposal changes.
 * @param {PhoenixProposalDTO} proposal
 * @param {PhoenixSovereignEngineFacade} Engine
 * @param {PhoenixGovernorInstance} governor
 * @returns {Promise<PhoenixReceiptDTO | null>}
 */
async function _lintProposalChanges(proposal, Engine, governor) {
	if (!Array.isArray(proposal?.changes)) return null;

	for (let i = 0; i < proposal.changes.length; i++) {
		const change = proposal.changes[ i ];
		if (typeof change?.content !== "string") continue;

		const lintErrors = Engine.lintSource(change.content);
		if (lintErrors.length > 0) {
			/** @type {PhoenixReceiptDTO} */
			const linterReceipt = {
				receiptVersion: Engine.RECEIPT_VERSION,
				receiptId: Engine.uid("receipt"),
				proposalId: String(proposal.proposalId || "unknown"),
				transactionId: null,
				timestamp: new Date().toISOString(),
				status: Engine.STATUS.REJECTED,
				gate: "LINTER_GATE",
				details: lintErrors.map((e) => `change[${i}]: ${e}`),
				authority: "PHOENIX-DETERMINISTIC-GOVERNOR",
				protocols: Engine.PROTOCOLS.slice(),
			};
			linterReceipt.integrity = Engine.hash(Engine.stable(linterReceipt));

			if (typeof governor.storage?.appendJournalEntry === "function") {
				await governor.storage.appendJournalEntry(linterReceipt);
			}

			return linterReceipt;
		}
	}

	return null;
}

/**
 * Attempts AI repair loop on rejected receipts when bridge and parser are present.
 * @param {PhoenixGovernorInstance} governor
 * @param {PhoenixReceiptDTO} receipt
 * @param {PhoenixProposalDTO} proposal
 * @param {string} agentId
 * @returns {Promise<PhoenixReceiptDTO>}
 */
async function _attemptAiRepair(governor, receipt, proposal, agentId) {
	/** @type {PhoenixWebLLMWorkerBridgeInstance | undefined} */
	let bridge;
	if (typeof PhoenixWebLLMBridge !== "undefined") {
		bridge = PhoenixWebLLMBridge;
	} else if (typeof globalThis !== "undefined") {
		bridge = globalThis.PhoenixWebLLMBridge;
	}

	/** @type {((rawText: string) => Promise<PhoenixProposalDTO>) | undefined} */
	let parser;
	if (typeof PhoenixProposalParser === "function") {
		parser = PhoenixProposalParser;
	} else if (typeof globalThis !== "undefined" && typeof globalThis.PhoenixProposalParser === "function") {
		parser = globalThis.PhoenixProposalParser;
	}

	if (bridge?.ready && typeof parser === "function") {
		return governor.repairLoop(
			receipt,
			proposal,
			agentId,
			bridge,
			parser,
		);
	}

	return receipt;
}

/**
 * Evaluates proposal through Sentinel governance pipeline.
 * @param {PhoenixProposalDTO | Record<string, unknown>} proposal - PGE-DSL-1 proposal object
 * @param {string} [subject] - identity of the submitting agent
 * @param {{ skipRepairLoop?: boolean }} [overrideOptions]
 * @returns {Promise<PhoenixReceiptDTO>} PGE-RECEIPT-1 receipt
 */
async function evaluateProposalWithSentinel(
	proposal,
	subject,
	overrideOptions,
) {
	const opts = overrideOptions || {};
	const agentId = typeof subject === "string" && subject.length > 0 ? subject : "sentinel-agent";
	const typedProposal = /** @type {PhoenixProposalDTO} */ (proposal);

	const { Engine, governor } = _resolvePhoenixSingletons();

	/* ── Step 1: Synchronous structural linter ──────────────────────────────── */
	const lintReceipt = await _lintProposalChanges(typedProposal, Engine, governor);
	if (lintReceipt) return lintReceipt;

	/* ── Step 2: Phoenix 3-Tier Governor Gates ──────────────────────────────── */
	const governorReceipt = await governor.submit(typedProposal, agentId);

	/* ── Step 3: AI Repair Loop ─────────────────────────────────────────────── */
	if (governorReceipt.status === Engine.STATUS.REJECTED && !opts.skipRepairLoop) {
		return _attemptAiRepair(governor, governorReceipt, typedProposal, agentId);
	}

	return governorReceipt;
}

/* ── Module export for Node test harness ────────────────────────────────── */
if (typeof module !== "undefined" && module.exports) {
	module.exports = evaluateProposalWithSentinel;
}
