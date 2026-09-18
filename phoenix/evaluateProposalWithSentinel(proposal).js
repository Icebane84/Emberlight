/* evaluateProposalWithSentinel — Integration Glue v2.0.0-ULTIMATE-FUSION
 * Protocols: VSRP-001 / PMIP-001 / SDCP-001
 *
 * Full pipeline:
 *   1. Synchronous linter (Layer 1) — structural source audit
 *   2. Phoenix 3-tier governor (Layer 2) — STRUCTURAL → CAPABILITY → BEHAVIOR → COMMIT
 *   3. OPFS append-only journal (Layer 3) — receipt persisted after every gate
 *   4. AI repair loop (Layer 3) — rejected receipts routed back through WebLLM bridge
 *
 * Dependencies (must be present on the calling global before this function runs):
 *   window.PhoenixSovereignEngine  — phoenix_sovereign_engine.js
 *   window.PhoenixGovernor         — Governor instance, initialised and READY
 *   window.PhoenixWebLLMBridge     — PhoenixWebLLMWorkerBridge instance (optional)
 *   window.PhoenixProposalParser   — async fn(rawText) → proposal object (optional)
 *
 * @param {Object}  proposal          — PGE-DSL-1 proposal object
 * @param {string}  [subject]         — identity of the submitting agent
 * @param {Object}  [overrideOptions]
 * @param {boolean} [overrideOptions.skipRepairLoop] — disable AI repair (default: false)
 * @returns {Promise<Object>} PGE-RECEIPT-1 receipt
 */
async function evaluateProposalWithSentinel(
	proposal,
	subject,
	overrideOptions,
) {
	const opts = overrideOptions || {};
	const agentId =
		typeof subject === "string" && subject.length > 0
			? subject
			: "sentinel-agent";

	/* ── Resolve dependency references ──────────────────────────────────────── */
	const Engine =
		typeof PhoenixSovereignEngine !== "undefined"
			? PhoenixSovereignEngine
			: typeof globalThis !== "undefined" && globalThis.PhoenixSovereignEngine;

	if (!Engine) {
		throw new Error(
			"[SENTINEL] PhoenixSovereignEngine is not loaded. " +
				"Ensure phoenix_sovereign_engine.js is evaluated before calling evaluateProposalWithSentinel.",
		);
	}

	const governor =
		typeof PhoenixGovernor !== "undefined"
			? PhoenixGovernor
			: typeof globalThis !== "undefined" && globalThis.PhoenixGovernor;

	if (!governor || typeof governor.submit !== "function") {
		throw new Error(
			"[SENTINEL] PhoenixGovernor instance not found or not initialised. " +
				"Create a Governor, call governor.initialize(), and assign it to window.PhoenixGovernor.",
		);
	}

	/* ── Step 1: Synchronous structural linter ──────────────────────────────── */
	if (Array.isArray(proposal && proposal.changes)) {
		for (let i = 0; i < proposal.changes.length; i++) {
			const change = proposal.changes[i];
			if (typeof change.content === "string") {
				const lintErrors = Engine.lintSource(change.content);
				if (lintErrors.length > 0) {
					// Build a synthetic REJECTED receipt — no I/O needed for linter failures
					const linterReceipt = {
						receiptVersion: Engine.RECEIPT_VERSION,
						receiptId: Engine.uid("receipt"),
						proposalId: String(proposal.proposalId || "unknown"),
						transactionId: null,
						timestamp: new Date().toISOString(),
						status: Engine.STATUS.REJECTED,
						gate: "LINTER_GATE",
						details: lintErrors.map((e) => "change[" + i + "]: " + e),
						authority: "PHOENIX-DETERMINISTIC-GOVERNOR",
						protocols: Engine.PROTOCOLS.slice(),
					};
					linterReceipt.integrity = Engine.hash(Engine.stable(linterReceipt));

					// Persist to journal via governor's storage
					if (
						governor.storage &&
						typeof governor.storage.appendJournalEntry === "function"
					) {
						await governor.storage.appendJournalEntry(linterReceipt);
					}

					return linterReceipt;
				}
			}
		}
	}

	/* ── Step 2: Phoenix 3-Tier Governor Gates ──────────────────────────────── */
	// The governor's submit() handles STRUCTURAL, CAPABILITY, and BEHAVIOR gates
	// and appends its own journal entry via its internal _storage reference.
	const governorReceipt = await governor.submit(proposal, agentId);

	/* ── Step 3: AI Repair Loop ─────────────────────────────────────────────── */
	// Only trigger repair on REJECTED receipts and when the bridge is available.
	if (
		governorReceipt.status === Engine.STATUS.REJECTED &&
		!opts.skipRepairLoop
	) {
		const bridge =
			typeof PhoenixWebLLMBridge !== "undefined"
				? PhoenixWebLLMBridge
				: typeof globalThis !== "undefined" && globalThis.PhoenixWebLLMBridge;

		const parser =
			typeof PhoenixProposalParser === "function"
				? PhoenixProposalParser
				: typeof globalThis !== "undefined" &&
						typeof globalThis.PhoenixProposalParser === "function"
					? globalThis.PhoenixProposalParser
					: null;

		if (bridge && bridge.ready && typeof parser === "function") {
			return governor.repairLoop(
				governorReceipt,
				proposal,
				agentId,
				bridge,
				parser,
			);
		}
	}

	return governorReceipt;
}

/* ── Module export for Node test harness ────────────────────────────────── */
if (typeof module !== "undefined" && module.exports) {
	module.exports = evaluateProposalWithSentinel;
}
