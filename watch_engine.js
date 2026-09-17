/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: REAL-TIME WORKSPACE FILE WATCHER ENGINE
 * Document Identifier: ARCH-WATCHER-ENGINE-001
 * Governing Protocol:  VSRP-001 / ARCH-001-EMBERLIGHT
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Module Imports & Workspace Context Baselines
 *   [SEC-03] Test Harness Routing & Target Mapping
 *   [SEC-04] Validation Execution & Latency Telemetry
 *   [SEC-05] File-System Watcher & Debounce Event Loop
 * ============================================================================
 */

//#region [SEC-01] Type Definitions & Contract Schemas
/**
 * @typedef {'test_combat_input.js' | 'test_hotkeys_and_expansion.js' | 'test_persistence_wiring.js' | 'test_sentinel.js'} TargetTestHarness
 */

/**
 * @typedef {'rename' | 'change'} WatchEventType
 */

/**
 * @typedef {Object} WatcherTelemetry
 * @property {string} filename - Source module altered.
 * @property {TargetTestHarness} targetScript - Triggered test harness script.
 * @property {number} latencyMs - Execution duration in milliseconds.
 * @property {boolean} passed - Execution success flag.
 */
//#endregion

//#region [SEC-02] Module Imports & Workspace Context Baselines
const fs = require('node:fs');
const { exec } = require('node:child_process');
const path = require('node:path');

const ROOT_DIR = process.cwd();
const TESTING_DIR = path.join(ROOT_DIR, 'testing');

/** @type {Map<string, number>} */
const watchDebounceMap = new Map();

console.log('𒉭 Emberlight Sovereign Watcher active.');
console.log(`Monitoring flat directory source matrix at: ${ROOT_DIR}\n`);
//#endregion

//#region [SEC-03] Test Harness Routing & Target Mapping
/**
 * Maps altered source modules directly to their targeted headless test harnesses.
 * Pure heuristic mapping function.
 * @param {string} filename - Name of altered source module.
 * @returns {TargetTestHarness} Target test harness filename.
 */
function determineTargetHarness(filename) {
	if (filename === 'combat.js' || filename === 'input.js') {
		return 'test_combat_input.js';
	}
	if (filename === 'pseudo_3d_renderer.js' || filename === 'runtime.js') {
		return 'test_hotkeys_and_expansion.js';
	}
	if (filename === 'save_manager.js' || filename === 'session_store.js') {
		return 'test_persistence_wiring.js';
	}
	// Baseline catch-all triggers the full 19-Pass verification block
	return 'test_sentinel.js';
}
//#endregion

//#region [SEC-04] Validation Execution & Latency Telemetry
/**
 * Spawns an asynchronous headless test runner process and logs latency telemetry.
 * State-mutating child process execution procedure.
 * @param {string} filename - Target source module filename requiring validation.
 * @returns {void}
 */
function executeTargetedValidation(filename) {
	const targetScript = determineTargetHarness(filename);
	const testPath = path.join(TESTING_DIR, targetScript);

	console.log(`\n[CHANGE DETECTED] Source file modified: ${filename}`);
	console.log(`🔬 Triggering targeted headless harness: testing/${targetScript}...`);

	const startTime = process.hrtime.bigint();

	exec(`node "${testPath}"`, (error, stdout, stderr) => {
		const endTime = process.hrtime.bigint();
		const latencyMs = (Number(endTime - startTime) / 1000000).toFixed(2);

		if (error) {
			console.log(`\n❌ [FAIL] Assertion Breach identified in ${filename} (${latencyMs}ms)`);
			if (stdout) console.log(stdout.trim());
			if (stderr) console.error(stderr.trim());
		} else {
			console.log(`\n=== ✅ [PASS] ${targetScript} executed cleanly in ${latencyMs}ms ===`);
		}
	});
}
//#endregion

//#region [SEC-05] File-System Watcher & Debounce Event Loop
// Instantiate native recursive directory monitor
fs.watch(ROOT_DIR, (_eventType, filename) => {
	if (!filename?.endsWith('.js')) return;

	// Exclude test suite mirrors to prevent cyclic execution feedback loops
	if (filename.startsWith('test_') || filename === 'watch_engine.js') return;

	const now = Date.now();
	const lastSeen = watchDebounceMap.get(filename) || 0;

	// Clamp OS file-system buffer double-triggers (250ms threshold)
	if (now - lastSeen < 250) return;
	watchDebounceMap.set(filename, now);

	executeTargetedValidation(filename);
});
//#endregion