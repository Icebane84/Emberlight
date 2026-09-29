/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         PHOENIX SENTINEL PROPOSAL EVALUATOR & GATEWAY (VLT-003)          ║
 * ║         Document Identifier: LEDGER-PHOENIX-SENTINEL-EVAL-001             ║
 * ║         Protocol Version: PSGC-001 / VLT-003 / VSRP-001 / PERSIST-001     ║
 * ║         Authority: Host SSOT | Governance & Proposal Evaluation Pipeline   ║
 * ║         Status: NORMATIVE | 6 #region Jump Table (SEC-01 - SEC-06)         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * CMD-DOC-INDEX (Normative Region Jump Table)
 * =============================================================================
 * [SEC-01] AMBIENT TYPE DECLARATIONS & JSDOC DATA CONTRACTS ..... Line ~0029
 * [SEC-02] SINGLETON RESOLUTION & ENVIRONMENT ATTENUATION ....... Line ~0041
 * [SEC-03] LAYER 1: SYNCHRONOUS STRUCTURAL LINTER GATE .......... Line ~0101
 * [SEC-04] LAYER 2: 3-TIER GOVERNOR SUBMISSION PIPELINE ......... Line ~0178
 * [SEC-05] LAYER 3: AUTOMATED AI SELF-REPAIR LOOP DELEGATE ...... Line ~0195
 * [SEC-06] MASTER EVALUATOR FACADE & MULTI-ENVIRONMENT EXPORT ... Line ~0314
 * =============================================================================
 */

/// <reference path="./phoenix.d.ts" />

/**
 * @param {Record<string, any>} root
 */
((root) => {
	'use strict';

	//#region [SEC-01] --- AMBIENT TYPE DECLARATIONS & JSDOC DATA CONTRACTS
	/**
	 * Canonical contract types for Sentinel Evaluator are declared in phoenix.d.ts:
	 * - {PhoenixSovereignEngineFacade} Engine - Umbrella namespace for Phoenix subsystems
	 * - {PhoenixGovernorInstance} governor - Central constitutional governor coordinator
	 * - {PhoenixProposalDTO} proposal - PGE-DSL-1 compliant proposal envelope
	 * - {PhoenixReceiptDTO} receipt - Cryptographically sealed PGE-RECEIPT-1 audit receipt
	 * - {PhoenixChangeDTO} change - Discrete atomic file modification hunk
	 * - {SentinelEvaluatorOptions} options - Execution overrides for Sentinel gates
	 */
	//#endregion [SEC-01]

	//#region [SEC-02] --- SINGLETON RESOLUTION & ENVIRONMENT ATTENUATION

	/**
	 * Resolves active PhoenixSovereignEngine facade across runtime environments.
	 * @param {Record<string, any>} targetRoot
	 * @returns {PhoenixSovereignEngineFacade}
	 * @private
	 */
	function _resolveEngineSingleton(targetRoot) {
		const Engine = (typeof PhoenixSovereignEngine !== 'undefined' ? PhoenixSovereignEngine : null)
			|| targetRoot?.PhoenixSovereignEngine
			|| (typeof globalThis !== 'undefined' ? (/** @type {any} */ (globalThis)).PhoenixSovereignEngine : null);

		if (!Engine) {
			throw new Error(
				'[SENTINEL] PhoenixSovereignEngine is not loaded. ' +
				'Ensure phoenix_sovereign_engine.js is evaluated before calling evaluateProposalWithSentinel.'
			);
		}
		return Engine;
	}

	/**
	 * Resolves active PhoenixGovernor coordinator across runtime environments.
	 * @param {Record<string, any>} targetRoot
	 * @returns {PhoenixGovernorInstance}
	 * @private
	 */
	function _resolveGovernorSingleton(targetRoot) {
		const governor = (typeof PhoenixGovernor !== 'undefined' ? PhoenixGovernor : null)
			|| targetRoot?.PhoenixGovernor
			|| (typeof globalThis !== 'undefined' ? (/** @type {any} */ (globalThis)).PhoenixGovernor : null);

		if (!governor || typeof governor.submit !== 'function') {
			throw new Error(
				'[SENTINEL] PhoenixGovernor instance not found or not initialized. ' +
				'Create a Governor, call governor.initialize(), and assign it to window.PhoenixGovernor.'
			);
		}
		return governor;
	}

	/**
	 * Resolves active Phoenix Sovereign Engine and Governor singletons across global environments.
	 * Enforces explicit fail-stop assertions if core dependencies are missing or uninitialized.
	 *
	 * @param {Record<string, any>} targetRoot
	 * @throws {Error} If PhoenixSovereignEngine or PhoenixGovernor singletons are unavailable
	 * @returns {{ Engine: PhoenixSovereignEngineFacade, governor: PhoenixGovernorInstance }}
	 * @private
	 */
	function _resolvePhoenixSingletons(targetRoot) {
		return {
			Engine: _resolveEngineSingleton(targetRoot),
			governor: _resolveGovernorSingleton(targetRoot)
		};
	}

	//#endregion [SEC-02]

	//#region [SEC-03] --- LAYER 1: SYNCHRONOUS STRUCTURAL LINTER GATE

	/**
	 * Creates a PGE-RECEIPT-1 rejection receipt for structural linter failures.
	 * @param {PhoenixProposalDTO} proposal
	 * @param {PhoenixSovereignEngineFacade} Engine
	 * @param {string[]} lintErrors
	 * @param {number} changeIndex
	 * @returns {PhoenixReceiptDTO}
	 * @private
	 */
	function _createLinterReceipt(proposal, Engine, lintErrors, changeIndex) {
		const protocols = Array.isArray(Engine.PROTOCOLS) ? Engine.PROTOCOLS.slice() : ['PSGC-001', 'VLT-003'];
		/** @type {PhoenixReceiptDTO} */
		const receipt = {
			receiptVersion: Engine.RECEIPT_VERSION || 'PGE-RECEIPT-1',
			receiptId: Engine.uid('receipt'),
			proposalId: String(proposal?.proposalId || 'unknown'),
			transactionId: null,
			timestamp: new Date().toISOString(),
			status: Engine.STATUS.REJECTED,
			gate: 'LINTER_GATE',
			details: lintErrors.map((e) => `change[${changeIndex}]: ${e}`),
			authority: 'PHOENIX-DETERMINISTIC-GOVERNOR',
			protocols
		};
		receipt.integrity = Engine.hash(Engine.stable(receipt));
		return receipt;
	}

	/**
	 * Appends linter rejection receipt to OPFS journal if available.
	 * @param {PhoenixGovernorInstance} governor
	 * @param {PhoenixReceiptDTO} receipt
	 * @returns {Promise<void>}
	 * @private
	 */
	async function _appendLinterJournal(governor, receipt) {
		if (typeof governor.storage?.appendJournalEntry !== 'function') return;
		try {
			await governor.storage.appendJournalEntry(receipt);
		} catch (journalErr) {
			const errMsg = journalErr instanceof Error ? journalErr.message : String(journalErr);
			console.warn('[SENTINEL/LINTER] OPFS journal append failed:', errMsg);
		}
	}

	/**
	 * Executes Layer 1 synchronous structural linting on all discrete changes within a proposal.
	 * Rejects forbidden placeholder tokens ('// ...', block comments, 'TO-DO(impl)') before governor submission.
	 *
	 * @param {PhoenixProposalDTO} proposal - Candidate proposal envelope
	 * @param {PhoenixSovereignEngineFacade} Engine - Resolved sovereign engine facade
	 * @param {PhoenixGovernorInstance} governor - Active governor instance for journal persistence
	 * @returns {Promise<PhoenixReceiptDTO | null>} Linter rejection receipt if failed, or null if clean
	 * @private
	 */
	async function _lintProposalChanges(proposal, Engine, governor) {
		if (!Array.isArray(proposal?.changes)) return null;

		for (let i = 0; i < proposal.changes.length; i++) {
			const change = proposal.changes[i];
			if (typeof change?.content !== 'string') continue;

			const lintErrors = Engine.lintSource(change.content);
			if (lintErrors.length > 0) {
				const linterReceipt = _createLinterReceipt(proposal, Engine, lintErrors, i);
				await _appendLinterJournal(governor, linterReceipt);
				return linterReceipt;
			}
		}

		return null;
	}

	//#endregion [SEC-03]

	//#region [SEC-04] --- LAYER 2: 3-TIER GOVERNOR SUBMISSION PIPELINE

	/**
	 * Submits proposal to Phoenix Governor 3-tier gates (STRUCTURAL → CAPABILITY → BEHAVIOR → COMMIT).
	 *
	 * @param {PhoenixProposalDTO} proposal - Proposal envelope to audit
	 * @param {string} agentId - Submitting subject or agent identifier
	 * @param {PhoenixGovernorInstance} governor - Active governor instance
	 * @returns {Promise<PhoenixReceiptDTO>} Gate evaluation receipt
	 * @private
	 */
	async function _submitToGovernorGates(proposal, agentId, governor) {
		return governor.submit(proposal, agentId);
	}

	//#endregion [SEC-04]

	//#region [SEC-05] --- LAYER 3: AUTOMATED AI SELF-REPAIR LOOP DELEGATE

	/**
	 * Resolves active WebLLM worker bridge instance.
	 * @param {Record<string, any>} targetRoot
	 * @returns {any}
	 * @private
	 */
	function _resolveWebLLMBridge(targetRoot) {
		return (typeof PhoenixWebLLMBridge !== 'undefined' ? PhoenixWebLLMBridge : null)
			|| targetRoot?.PhoenixWebLLMBridge
			|| (typeof globalThis !== 'undefined' ? (/** @type {any} */ (globalThis)).PhoenixWebLLMBridge : null)
			|| undefined;
	}

	/**
	 * Resolves active proposal parser function.
	 * @param {Record<string, any>} targetRoot
	 * @returns {((rawText: string) => PhoenixProposalDTO | Promise<PhoenixProposalDTO>) | undefined}
	 * @private
	 */
	function _resolveProposalParser(targetRoot) {
		return (typeof PhoenixProposalParser === 'function' ? PhoenixProposalParser : null)
			|| (typeof targetRoot?.PhoenixProposalParser === 'function' ? targetRoot.PhoenixProposalParser : null)
			|| (typeof globalThis !== 'undefined' && typeof (/** @type {any} */ (globalThis)).PhoenixProposalParser === 'function' ? (/** @type {any} */ (globalThis)).PhoenixProposalParser : null)
			|| undefined;
	}

	/**
	 * Resolves active PhoenixERLLedger singleton.
	 * @param {Record<string, any>} targetRoot
	 * @returns {PhoenixErrorResolutionLedgerInstance | null}
	 * @private
	 */
	function _resolveERLLedger(targetRoot) {
		return targetRoot?.PhoenixERLLedger
			|| (typeof globalThis !== 'undefined' ? (/** @type {any} */ (globalThis)).PhoenixERLLedger : null)
			|| null;
	}

	/**
	 * Records a single replace_text change entry into the Error Resolution Ledger.
	 * @param {PhoenixErrorResolutionLedgerInstance} erl
	 * @param {PhoenixChangeDTO} ch
	 * @param {string} gate
	 * @param {string} targetFile
	 * @private
	 */
	function _recordChangeEntryInERL(erl, ch, gate, targetFile) {
		if (ch.type !== 'replace_text' || !ch.search || !ch.content) return;
		const rule = gate || 'AI-REPAIR';
		erl.record({
			id: `erl_repair_${Date.now()}`,
			fingerprint: erl.computeFingerprint({ rule }, ch.search),
			rule,
			description: `Autonomous self-repair for ${rule} in ${targetFile}`,
			searchPattern: ch.search,
			replacePattern: ch.content,
			verifiedReceipt: 'PASS',
			timestamp: new Date().toISOString(),
			useCount: 1
		});
	}

	/**
	 * Ingests successful autonomous repair changes into the Error Resolution Ledger.
	 * @param {Record<string, any>} targetRoot
	 * @param {string} gate
	 * @param {PhoenixProposalDTO} proposal
	 * @private
	 */
	function _ingestRepairedChangesToERL(targetRoot, gate, proposal) {
		const erl = _resolveERLLedger(targetRoot);
		if (!erl || typeof erl.record !== 'function') return;

		const changes = Array.isArray(proposal?.changes) ? proposal.changes : [];
		const targetFile = proposal?.target || 'unknown';
		for (const ch of changes) {
			_recordChangeEntryInERL(erl, ch, gate, targetFile);
		}
	}

	/**
	 * Dispatches automated AI self-repair pass if proposal was rejected and AI bridge is operational.
	 *
	 * @param {PhoenixGovernorInstance} governor - Active governor instance
	 * @param {PhoenixReceiptDTO} receipt - Terminal rejection receipt from governor
	 * @param {PhoenixProposalDTO} proposal - Original failing proposal
	 * @param {string} agentId - Identity of the submitting agent
	 * @param {Record<string, any>} targetRoot - Global environment root
	 * @returns {Promise<PhoenixReceiptDTO>} Repaired receipt or original rejection receipt
	 * @private
	 */
	async function _attemptAiRepair(governor, receipt, proposal, agentId, targetRoot) {
		const bridge = _resolveWebLLMBridge(targetRoot);
		const parser = _resolveProposalParser(targetRoot);

		if (!bridge?.ready || typeof parser !== 'function' || typeof governor.repairLoop !== 'function') {
			return receipt;
		}

		const repairedReceipt = await governor.repairLoop(
			receipt,
			proposal,
			agentId,
			bridge,
			parser
		);

		if (repairedReceipt?.status === 'PASS') {
			const effectiveProposal = (/** @type {any} */ (repairedReceipt)).proposal || proposal;
			_ingestRepairedChangesToERL(targetRoot, receipt.gate, effectiveProposal);
		}

		return repairedReceipt || receipt;
	}

	//#endregion [SEC-05]

	//#region [SEC-06] --- MASTER EVALUATOR FACADE & MULTI-ENVIRONMENT EXPORT

	/**
	 * Evaluates a candidate proposal envelope through the complete 3-layer Sentinel governance pipeline:
	 *   1. Layer 1: Synchronous structural linter gate (AST validity & placeholder rejection)
	 *   2. Layer 2: Phoenix 3-tier Governor gates (STRUCTURAL, CAPABILITY, BEHAVIOR)
	 *   3. Layer 3: Automated AI self-repair loop delegate (if rejected and bridge ready)
	 *
	 * @param {PhoenixProposalDTO | Record<string, unknown>} proposal - PGE-DSL-1 proposal object
	 * @param {string} [subject='sentinel-agent'] - Identity of the submitting agent or actor
	 * @param {SentinelEvaluatorOptions} [overrideOptions] - Optional configuration overrides
	 * @returns {Promise<PhoenixReceiptDTO>} Cryptographically sealed PGE-RECEIPT-1 receipt
	 */
	async function evaluateProposalWithSentinel(proposal, subject, overrideOptions) {
		const opts = overrideOptions || {};
		const agentId = typeof subject === 'string' && subject.length > 0 ? subject : 'sentinel-agent';
		const typedProposal = /** @type {PhoenixProposalDTO} */ (proposal);

		const { Engine, governor } = _resolvePhoenixSingletons(root);

		/* ── Step 1: Synchronous structural linter ──────────────────────────────── */
		const lintReceipt = await _lintProposalChanges(typedProposal, Engine, governor);
		if (lintReceipt) return lintReceipt;

		/* ── Step 2: Phoenix 3-Tier Governor Gates ──────────────────────────────── */
		const governorReceipt = await _submitToGovernorGates(typedProposal, agentId, governor);

		/* ── Step 3: AI Self-Repair Loop (if rejected) ──────────────────────────── */
		if (governorReceipt.status === Engine.STATUS.REJECTED && !opts.skipRepairLoop) {
			return _attemptAiRepair(governor, governorReceipt, typedProposal, agentId, root);
		}

		return governorReceipt;
	}

	const api = /** @type {PhoenixSentinelEvaluatorFacade} */ (evaluateProposalWithSentinel);
	/* ── Attach Self-References for Modular Facade Access ───────────────────── */
	api.evaluateProposalWithSentinel = api;
	api.evaluate = api;

	/* ── Dual-Binding Global & CommonJS Export ──────────────────────────────── */
	if (typeof window !== 'undefined') {
		(/** @type {Record<string, unknown>} */ (window)).evaluateProposalWithSentinel = api;
		(/** @type {Record<string, unknown>} */ (window)).PhoenixSentinelEvaluator = api;
	}
	if (typeof globalThis !== 'undefined') {
		(/** @type {Record<string, unknown>} */ (globalThis)).evaluateProposalWithSentinel = api;
		(/** @type {Record<string, unknown>} */ (globalThis)).PhoenixSentinelEvaluator = api;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
		module.exports.evaluateProposalWithSentinel = api;
		module.exports.PhoenixSentinelEvaluator = api;
	}

	//#endregion [SEC-06]
})(typeof globalThis !== 'undefined' ? globalThis : this);
