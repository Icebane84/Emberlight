/* load_order.js — SSOT canonical topological script load order
 * Protocols: SDCP-001
 *
 * This file is the single source of truth for the order in which Emberlight
 * modules must be evaluated by the test_sentinel.js VM harness.
 *
 * Rules:
 *   - Paths are relative to the project root (one level above /testing).
 *   - Dependencies must appear before dependents.
 *   - Do not import game-module scripts here; only governance layer scripts
 *     needed by the sentinel bridge test are listed.
 *
 * Note: The Emberlight game module paths (EmberlightCombat, etc.) are
 * referenced by test_sentinel.js but those files live outside this testing
 * directory. Add their relative paths here in the correct topological order
 * once they are available in the project root.
 */

module.exports = [
	/* ── Layer 0: Core governance engine ─────────────────────────── */
	"testing/phoenix_sovereign_engine.js",

	/* ── Layer 1: WebLLM Worker Bridge ───────────────────────────── */
	"testing/webllm_worker_bridge.js",

	/* ── Layer 2: Monolith Exporter ───────────────────────────────── */
	"testing/monolith_exporter.js",

	/* ── Layer 3: Integration glue ────────────────────────────────── */
	// NOTE: evaluateProposalWithSentinel(proposal).js uses a filename
	// with parentheses; paths are handled by test_sentinel.js require().
	// It is listed here for documentation only and loaded separately.

	/* ── Emberlight game modules ───────────────────────────────────
	 * Add paths here as they are integrated. Example:
	 *   'src/combat/emberlight_combat.js',
	 *   'src/overworld/emberlight_overworld.js',
	 * ─────────────────────────────────────────────────────────────── */
];
