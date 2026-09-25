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
 * [SEC-01] Ambient Type Declarations & JSDoc Data Contracts ..... Line ~0026
 * [SEC-02] Singleton Resolution & Environment Attenuation ....... Line ~0038
 * [SEC-03] Layer 1: Synchronous Structural Linter Gate .......... Line ~0085
 * [SEC-04] Layer 2: 3-Tier Governor Submission Pipeline ......... Line ~0135
 * [SEC-05] Layer 3: Automated AI Self-Repair Loop Delegate ...... Line ~0149
 * [SEC-06] Master Evaluator Facade & Multi-Environment Export ... Line ~0194
 * =============================================================================
 */

/// <reference path="./phoenix.d.ts" />

/**
 * @param {Record<string, any>} root
 */
(function(root) {
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
	 * Resolves active Phoenix Sovereign Engine and Governor singletons across global environments.
	 * Enforces explicit fail-stop assertions if core dependencies are missing or uninitialized.
	 *
	 * @throws {Error} If PhoenixSovereignEngine or PhoenixGovernor singletons are unavailable
	 * @returns {{ Engine: PhoenixSovereignEngineFacade, governor: PhoenixGovernorInstance }}
	 */
	function _resolvePhoenixSingletons() {
		/** @type {PhoenixSovereignEngineFacade | undefined} */
		let Engine;
		if (typeof PhoenixSovereignEngine !== 'undefined') {
			Engine = PhoenixSovereignEngine;
		} else if (root?.PhoenixSovereignEngine) {
			Engine = root.PhoenixSovereignEngine;
		} else if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis)).PhoenixSovereignEngine) {
			Engine = (/** @type {any} */ (globalThis)).PhoenixSovereignEngine;
		}

		if (!Engine) {
			throw new Error(
				'[SENTINEL] PhoenixSovereignEngine is not loaded. ' +
				'Ensure phoenix_sovereign_engine.js is evaluated before calling evaluateProposalWithSentinel.'
			);
		}

		/** @type {PhoenixGovernorInstance | undefined} */
		let governor;
		if (typeof PhoenixGovernor !== 'undefined') {
			governor = PhoenixGovernor;
		} else if (root?.PhoenixGovernor) {
			governor = root.PhoenixGovernor;
		} else if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis)).PhoenixGovernor) {
			governor = (/** @type {any} */ (globalThis)).PhoenixGovernor;
		}

		if (!governor || typeof governor.submit !== 'function') {
			throw new Error(
				'[SENTINEL] PhoenixGovernor instance not found or not initialized. ' +
				'Create a Governor, call governor.initialize(), and assign it to window.PhoenixGovernor.'
			);
		}

		return { Engine, governor };
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
	 * Rejects forbidden placeholder tokens ('// ...', block comments, 'T-O-D-O(impl)') before governor submission.
	 *
	 * @param {PhoenixProposalDTO} proposal - Candidate proposal envelope
	 * @param {PhoenixSovereignEngineFacade} Engine - Resolved sovereign engine facade
	 * @param {PhoenixGovernorInstance} governor - Active governor instance for journal persistence
	 * @returns {Promise<PhoenixReceiptDTO | null>} Linter rejection receipt if failed, or null if clean
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
	 */
	function _resolveWebLLMBridge(targetRoot) {
		if (typeof PhoenixWebLLMBridge !== 'undefined') return PhoenixWebLLMBridge;
		if (targetRoot?.PhoenixWebLLMBridge) return targetRoot.PhoenixWebLLMBridge;
		if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis)).PhoenixWebLLMBridge) {
			return (/** @type {any} */ (globalThis)).PhoenixWebLLMBridge;
		}
		return undefined;
	}

	/**
	 * Resolves active proposal parser function.
	 * @param {Record<string, any>} targetRoot
	 * @returns {((rawText: string) => PhoenixProposalDTO | Promise<PhoenixProposalDTO>) | undefined}
	 */
	function _resolveProposalParser(targetRoot) {
		if (typeof PhoenixProposalParser === 'function') return PhoenixProposalParser;
		if (typeof targetRoot?.PhoenixProposalParser === 'function') return targetRoot.PhoenixProposalParser;
		if (typeof globalThis !== 'undefined' && typeof (/** @type {any} */ (globalThis)).PhoenixProposalParser === 'function') {
			return (/** @type {any} */ (globalThis)).PhoenixProposalParser;
		}
		return undefined;
	}

	/**
	 * Ingests successful autonomous repair changes into the Error Resolution Ledger.
	 * @param {Record<string, any>} targetRoot
	 * @param {string} gate
	 * @param {PhoenixProposalDTO} proposal
	 */
	function _ingestRepairedChangesToERL(targetRoot, gate, proposal) {
		/** @type {PhoenixErrorResolutionLedgerInstance | undefined} */
		let erl;
		if (targetRoot?.PhoenixERLLedger) {
			erl = targetRoot.PhoenixERLLedger;
		} else if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis)).PhoenixERLLedger) {
			erl = (/** @type {any} */ (globalThis)).PhoenixERLLedger;
		}

		if (!erl || typeof erl.record !== 'function') return;

		const changes = Array.isArray(proposal?.changes) ? proposal.changes : [];
		for (const ch of changes) {
			if (ch.type === 'replace_text' && ch.search && ch.content) {
				const rule = gate || 'AI-REPAIR';
				erl.record({
					id: `erl_repair_${Date.now()}`,
					fingerprint: erl.computeFingerprint({ rule }, ch.search),
					rule,
					description: `Autonomous self-repair for ${rule} in ${proposal.target}`,
					searchPattern: ch.search,
					replacePattern: ch.content,
					verifiedReceipt: 'PASS',
					timestamp: new Date().toISOString(),
					useCount: 1
				});
			}
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

		const { Engine, governor } = _resolvePhoenixSingletons();

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

	/* ── Dual-Binding Global & CommonJS Export ──────────────────────────────── */
	if (typeof window !== 'undefined') {
		window.evaluateProposalWithSentinel = evaluateProposalWithSentinel;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis.evaluateProposalWithSentinel = evaluateProposalWithSentinel;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = evaluateProposalWithSentinel;
	}
	//#endregion [SEC-06]
})(
	(function() {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
