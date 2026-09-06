/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: Real-Time Workspace File Watcher Engine
 * Document Identifier: ARCH-WATCHER-ENGINE-001
 * Authority:           Host Presentation & Automation Peripheral
 * Dependencies:        Pure Native Node.js (fs, child_process, path)
 * ============================================================================
 */

const fs = require('node:fs');
const { exec } = require('node:child_process');
const path = require('node:path');

const ROOT_DIR = process.cwd();
const TESTING_DIR = path.join(ROOT_DIR, 'testing');

// Track file states to debounce multi-fire OS write buffers
let watchDebounceMap = new Map();

console.log('𒉭 Emberlight Sovereign Watcher active.');
console.log(`Monitoring flat directory source matrix at: ${ROOT_DIR}\n`);

/**
 * Maps altered source modules directly to their targeted headless test harnesses.
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

// Instantiate native recursive directory monitor
fs.watch(ROOT_DIR, (eventType, filename) => {
	if (!filename || !filename.endsWith('.js')) return;

	// Exclude test suite mirrors to prevent cyclic execution feedback loops
	if (filename.startsWith('test_') || filename === 'watch_engine.js') return;

	const now = Date.now();
	const lastSeen = watchDebounceMap.get(filename) || 0;

	// Clamp OS file-system buffer double-triggers (250ms threshold)
	if (now - lastSeen < 250) return;
	watchDebounceMap.set(filename, now);

	executeTargetedValidation(filename);
});
