/**
 * @fileoverview Phoenix Sovereign Engine & Substrate Governance Test Suite
 * Protocols: VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001 / PGE-DSL-1 / PGE-RECEIPT-1
 *
 * Evaluates the full Phoenix Governance substrate in a zero-dependency headless VM context:
 * - SEC-01: PhoenixSovereignEngine API surface & frozen protocol invariants
 * - SEC-02: Layer 1 Structural AST & proposal shape linter
 * - SEC-03: Layer 2 Deterministic Governor lifecycle & capability-gated pipeline
 * - SEC-04: Layer 3 Receipt ledger integrity & cryptographic receipt hashes
 * - SEC-05: PhoenixWebLLMWorkerBridge API surface & proposal parser
 * - SEC-06: PhoenixMonolithExporter API surface & constants
 * - SEC-07: Monolith export self-contained HTML artifact structure
 * - SEC-08: Deterministic hashing and key-order-independent serialization
 * - SEC-09: Watchdog, Framebuffer & Fault Localization
 * - SEC-10: Procedural Audio Synthesizer & Code Generator
 * - SEC-11: Workstation Substrate: IntelliSense, Fuzzy, Diff, Runtime
 * - SEC-12: Tri-Engine Graphics Substrate
 * - SEC-13: 3D Fast Voxel DDA World Engine
 * - SEC-14: Procedural Terrain Raymarcher & Code Studio Substrate
 * - SEC-15: Error Resolution Ledger (ERL-001) & Batch Remediation
 * - SEC-16: Region Scaffolder, Contract & Graph Dependency Verifier
 *
 * Usage: node testing/test_phoenix.js
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createVmContext } = require('./mock_dom.js');

const baseDir = path.resolve(__dirname, '..');

// Canonical load orders
const coreScripts = require('./load_order.js');
const phoenixScripts = [
	'phoenix/templates/starter_pack.js',
	'phoenix/runtime/phoenix_audio_synth.js',
	'phoenix/runtime/phoenix_graphics_2d.js',
	'phoenix/runtime/phoenix_pseudo_3d.js',
	'phoenix/runtime/phoenix_voxel_3d.js',
	'phoenix/runtime/phoenix_terrain_raymarcher.js',
	'phoenix/runtime/phoenix_studio_audio.js',
	'phoenix/runtime/phoenix_studio_viewport.js',
	'phoenix/synarche_parser.js',
	'phoenix/phoenix_sovereign_engine.js',
	'phoenix/sentinel_evaluator.js',
	'phoenix/webllm_worker_bridge.js',
	'phoenix/monolith_exporter.js',
];

const context = createVmContext();

// 1. Evaluate Core Engine Scripts
coreScripts.forEach((file) => {
	const filePath = path.join(baseDir, file);
	const code = fs.readFileSync(filePath, 'utf8');
	vm.runInContext(code, context, { filename: filePath }); // NOSONAR: Test harness requires loading vanilla JS modules into headless DOM VM context
});

// 2. Evaluate Phoenix Substrate Scripts
phoenixScripts.forEach((file) => {
	const filePath = path.join(baseDir, file);
	const code = fs.readFileSync(filePath, 'utf8');
	vm.runInContext(code, context, { filename: filePath }); // NOSONAR: Test harness requires loading vanilla JS modules into headless DOM VM context
});

/* =========================================================================
 * AUDIT CHECK RUNNER
 * ========================================================================= */
let passed = 0;
let failed = 0;
/** @type {Array<{ label: string; status: string; detail?: string }>} */
const auditLog = [];

/**
 * @param {string} label
 * @param {boolean | unknown} condition
 * @param {string} [detail]
 */
function check(label, condition, detail) {
	if (condition) {
		console.log(`  ✓ ${label}`);
		auditLog.push({ label, status: 'PASS' });
		passed += 1;
	} else {
		const detailStr = detail ? ` — ${detail}` : '';
		console.error(`  ✗ ${label}${detailStr}`);
		auditLog.push({ label, status: 'FAIL', detail: detail || '' });
		failed += 1;
	}
}

/* =========================================================================
 * SECTION VERIFIERS (Cognitive Complexity <= 5 per function)
 * ========================================================================= */

/**
 * @param {any} Engine
 */
function verifySec01EngineSurface(Engine) {
	console.log('\n[SEC-01] PhoenixSovereignEngine API surface');
	check('PhoenixSovereignEngine is defined', Boolean(Engine));
	check('VERSION is 7.0.0-ULTIMATE-FUSION', Engine.VERSION === '7.0.0-ULTIMATE-FUSION');
	check(
		'PROTOCOLS contains VSRP-001, PMIP-001, SDCP-001, PERSIST-001',
		[ 'VSRP-001', 'PMIP-001', 'SDCP-001', 'PERSIST-001' ].every((p) =>
			Engine.PROTOCOLS.includes(p)
		)
	);
	check(
		'STATES has NEW, READY, TRANSACTION, DESTROYED',
		Engine.STATES.NEW === 'NEW' &&
		Engine.STATES.READY === 'READY' &&
		Engine.STATES.TRANSACTION === 'TRANSACTION' &&
		Engine.STATES.DESTROYED === 'DESTROYED'
	);
	check(
		'STATUS has PASS, REJECTED, ERROR',
		Engine.STATUS.PASS === 'PASS' &&
		Engine.STATUS.REJECTED === 'REJECTED' &&
		Engine.STATUS.ERROR === 'ERROR'
	);
	check(
		'GATES has STRUCTURAL_GATE, CAPABILITY_GATE, BEHAVIOR_GATE, ALL_GATES, EXECUTION',
		Engine.GATES.STRUCTURAL === 'STRUCTURAL_GATE' &&
		Engine.GATES.CAPABILITY === 'CAPABILITY_GATE' &&
		Engine.GATES.BEHAVIOR === 'BEHAVIOR_GATE' &&
		Engine.GATES.ALL === 'ALL_GATES' &&
		Engine.GATES.EXECUTION === 'EXECUTION'
	);
	check('SCHEMA_VERSION is PGE-DSL-1', Engine.SCHEMA_VERSION === 'PGE-DSL-1');
	check('RECEIPT_VERSION is PGE-RECEIPT-1', Engine.RECEIPT_VERSION === 'PGE-RECEIPT-1');
	check('REPAIR_LOOP_CAP is 3', Engine.REPAIR_LOOP_CAP === 3);
}

/**
 * @param {any} Engine
 */
function verifySec02StructuralLinter(Engine) {
	console.log('\n[SEC-02] Layer 1: Structural Linter');
	check(
		'lintSource catches // ...',
		Engine.lintSource('// ... placeholder').length > 0
	);
	check(
		'lintSource catches /* ... */',
		Engine.lintSource('/* ... */').length > 0
	);
	check(
		'lintSource catches TODO(impl)',
		Engine.lintSource('TODO(impl) fix this').length > 0
	);
	check(
		'lintSource allows clean code',
		Engine.lintSource('const x = 1;').length === 0
	);

	const badProposal = {
		schemaVersion: 'WRONG',
		proposalId: 'p-1',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'test',
		changes: [ { type: 'replace_text', path: 'combat.js', search: 'x', content: 'y' } ],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	};
	check(
		'validateProposalShape rejects wrong schemaVersion',
		Engine.validateProposalShape(badProposal).some((/** @type {string} */ e) =>
			e.includes('schemaVersion')
		)
	);

	const pathTraversalProposal = {
		schemaVersion: 'PGE-DSL-1',
		proposalId: 'p-1',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'test',
		changes: [
			{
				type: 'replace_text',
				path: '../escape.js',
				search: 'x',
				content: 'y',
			},
		],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	};
	check(
		'validateProposalShape rejects path traversal (..)',
		Engine.validateProposalShape(pathTraversalProposal).some((/** @type {string} */ e) =>
			e.includes('unsafe path traversal')
		)
	);
}

/**
 * @param {any} Engine
 */
async function verifySec03GovernorLifecycle(Engine) {
	console.log('\n[SEC-03] Layer 2: Governor Initialization & Lifecycle');
	const gov = new Engine.Governor();
	check('Governor starts in NEW state', gov.diagnostics().lifecycle === 'NEW');

	await gov.initialize();
	check('Governor moves to READY state after initialize()', gov.diagnostics().lifecycle === 'READY');

	// Register a target
	gov.spec.registerTarget('combat/SEC-10', {
		tenant: 'Combat',
		path: 'combat.js',
		allowedOperations: [ 'MODIFY' ],
		capabilities: [],
		dependencies: [],
	});
	check('spec target registered', gov.spec.targets.has('combat/SEC-10'));

	// Register source
	gov.registerSource('combat.js', 'function runCombat() { return 100; }');
	check('getSource returns initial content', gov.getSource('combat.js') === 'function runCombat() { return 100; }');

	// Register test
	gov.spec.registerTest('test-combat-pass', (/** @type {unknown} */ _state, /** @type {unknown} */ _ctx, /** @type {Map<string, { content: string }>} */ sources) => {
		return sources.get('combat.js')?.content.includes('200');
	});

	// Grant capability
	gov.grant('agent-1', 'combat/SEC-10', 'MODIFY');
	check('Capability granted', gov.capabilities.has('agent-1', 'Combat.MODIFY', 'combat/SEC-10'));

	// Submit valid proposal
	const validProposal = {
		schemaVersion: 'PGE-DSL-1',
		proposalId: 'prop-001',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'Update combat damage to 200',
		changes: [
			{
				type: 'replace_text',
				path: 'combat.js',
				search: 'return 100;',
				content: 'return 200;',
			},
		],
		expectedInvariants: [],
		testsRequested: [ 'test-combat-pass' ],
		requiredCapabilities: [],
	};

	const receipt = await gov.submit(validProposal, 'agent-1');
	check('Valid proposal passes with status PASS', receipt.status === 'PASS', `got status: ${receipt.status}`);
	check('Receipt has deterministic integrity hash', typeof receipt.integrity === 'string' && receipt.integrity.length === 8);
	check('Source updated on PASS', gov.getSource('combat.js') === 'function runCombat() { return 200; }');

	// Submit failing proposal (behavior test fails)
	gov.grant('agent-1', 'combat/SEC-10', 'MODIFY');
	const failingProposal = {
		schemaVersion: 'PGE-DSL-1',
		proposalId: 'prop-002',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'Break the test by setting to 999',
		changes: [
			{
				type: 'replace_text',
				path: 'combat.js',
				search: 'return 200;',
				content: 'return 999;',
			},
		],
		expectedInvariants: [],
		testsRequested: [ 'test-combat-pass' ],
		requiredCapabilities: [],
	};

	const failReceipt = await gov.submit(failingProposal, 'agent-1');
	check(
		'Failing test causes REJECTED status at BEHAVIOR_GATE',
		failReceipt.status === 'REJECTED' && failReceipt.gate === 'BEHAVIOR_GATE',
		`got status: ${failReceipt.status}, gate: ${failReceipt.gate}`
	);
	check('Source rolled back on test failure', gov.getSource('combat.js') === 'function runCombat() { return 200; }');

	// Submit hot-loop allocation proposal (rejected at STRUCTURAL_GATE)
	gov.grant('agent-1', 'combat/SEC-10', 'MODIFY');
	const hotLoopProposal = {
		schemaVersion: 'PGE-DSL-1',
		proposalId: 'prop-003',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'Add update loop with transient allocations',
		changes: [
			{
				type: 'replace_text',
				path: 'combat.js',
				search: 'return 200;',
				content: 'function update(dt) { const bad = { val: dt }; } return 200;',
			},
		],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	};

	const hotReceipt = await gov.submit(hotLoopProposal, 'agent-1');
	check(
		'Hot-loop transient allocation rejected at STRUCTURAL_GATE',
		hotReceipt.status === 'REJECTED' && hotReceipt.gate === 'STRUCTURAL_GATE',
		`got status: ${hotReceipt.status}, gate: ${hotReceipt.gate}`
	);

	// Test evaluateProposalWithSentinel pipeline integration
	context.window.PhoenixGovernor = gov;
	const evaluateWithSentinel = context.window.evaluateProposalWithSentinel;
	check('evaluateProposalWithSentinel is defined', typeof evaluateWithSentinel === 'function');

	const sentinelLintProposal = {
		schemaVersion: 'PGE-DSL-1',
		proposalId: 'prop-sentinel-lint',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'Placeholder injection test',
		changes: [
			{
				type: 'replace_text',
				path: 'combat.js',
				search: 'return 200;',
				content: '// ... placeholder',
			},
		],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	};
	const sentinelLintReceipt = await evaluateWithSentinel(sentinelLintProposal, 'agent-1');
	check(
		'evaluateProposalWithSentinel rejects forbidden placeholders at LINTER_GATE',
		sentinelLintReceipt.status === 'REJECTED' && sentinelLintReceipt.gate === 'LINTER_GATE'
	);

	gov.grant('agent-1', 'combat/SEC-10', 'MODIFY');
	const sentinelValidProposal = {
		schemaVersion: 'PGE-DSL-1',
		proposalId: 'prop-sentinel-valid',
		target: 'combat/SEC-10',
		operation: 'MODIFY',
		intent: 'Update combat damage to 300',
		changes: [
			{
				type: 'replace_text',
				path: 'combat.js',
				search: 'return 200;',
				content: 'return 300;',
			},
		],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	};
	const sentinelValidReceipt = await evaluateWithSentinel(sentinelValidProposal, 'agent-1');
	check(
		'evaluateProposalWithSentinel accepts clean proposals with PASS status',
		sentinelValidReceipt.status === 'PASS' && sentinelValidReceipt.gate === 'ALL_GATES'
	);

	// FSA Directory Handle & SovereignStorage / Governor Disk Sync Verification
	/** @type {Map<string, string>} */
	const mockStorageFiles = new Map();
	/**
	 * @param {string} filePath
	 */
	function createMockFileHandle(filePath) {
		return {
			kind: 'file',
			name: filePath.split('/').pop(),
			async getFile() {
				return {
					text: async () => mockStorageFiles.get(filePath) || '',
					size: (mockStorageFiles.get(filePath) || '').length
				};
			},
			async createWritable() {
				let buffer = '';
				return {
					async write(/** @type {string} */ chunk) { buffer += chunk; },
					async close() { mockStorageFiles.set(filePath, buffer); }
				};
			}
		};
	}

	/**
	 * @param {string} [dirPath]
	 */
	function createMockDirHandle(dirPath = '') {
		/** @type {Map<string, any>} */
		const subdirectories = new Map();
		return {
			kind: 'directory',
			name: dirPath ? dirPath.split('/').pop() : 'root',
			async getDirectoryHandle(/** @type {string} */ name, /** @type {{ create?: boolean }} */ opts) {
				const fullPath = dirPath ? `${dirPath}/${name}` : name;
				if (!subdirectories.has(name)) {
					if (opts?.create) {
						subdirectories.set(name, createMockDirHandle(fullPath));
					} else {
						throw new Error(`Directory not found: ${name}`);
					}
				}
				return subdirectories.get(name);
			},
			async getFileHandle(/** @type {string} */ name, /** @type {{ create?: boolean }} */ opts) {
				const fullPath = dirPath ? `${dirPath}/${name}` : name;
				if (!mockStorageFiles.has(fullPath) && !opts?.create) {
					throw new Error(`File not found: ${name}`);
				}
				return createMockFileHandle(fullPath);
			}
		};
	}

	const mockRootDir = createMockDirHandle('');
	gov.storage.mountProjectDirectory(mockRootDir);
	check('mountProjectDirectory mounts root directory handle', gov.storage.hasProject === true);

	await gov.storage.writeProjectFile('src/combat/combat_actions.js', 'export function attack() { return 50; }');
	const readBack = await gov.storage.readProjectFile('src/combat/combat_actions.js');
	check('SovereignStorage writeProjectFile and readProjectFile round-trip correctly', readBack === 'export function attack() { return 50; }');

	gov.registerSource('src/combat/combat_actions.js', 'export function attack() { return 99; }');
	await gov.writeSourceToDisk('src/combat/combat_actions.js');
	const syncedBack = await gov.storage.readProjectFile('src/combat/combat_actions.js');
	check('Governor.writeSourceToDisk writes registered source to disk handle', syncedBack === 'export function attack() { return 99; }');

	return gov;
}

/**
 * @param {any} gov
 */
function verifySec04ReceiptLedger(gov) {
	console.log('\n[SEC-04] Layer 3: Receipt Ledger');
	const receipts = gov.getReceipts();
	check('Ledger contains receipts', receipts.length >= 4, `got ${receipts.length}`);
	check('Receipts have distinct receipt IDs', receipts[ 0 ].receiptId !== receipts[ 1 ].receiptId);
	check('Receipt authority is PHOENIX-DETERMINISTIC-GOVERNOR', receipts[ 0 ].authority === 'PHOENIX-DETERMINISTIC-GOVERNOR');
}

/**
 * @param {any} vmContext
 */
function verifySec05WorkerBridge(vmContext) {
	console.log('\n[SEC-05] PhoenixWebLLMWorkerBridge API surface');
	const BridgeClass = vmContext.window.PhoenixWebLLMWorkerBridge;
	check('PhoenixWebLLMWorkerBridge is defined', Boolean(BridgeClass));
	const bridge = new BridgeClass();
	check(
		'bridge has start, generate, destroy',
		typeof bridge.start === 'function' &&
		typeof bridge.generate === 'function' &&
		typeof bridge.destroy === 'function'
	);
	check('bridge.isReady is false before start()', bridge.isReady === false);

	const proposalParser = vmContext.window.phoenixProposalParser;
	check('phoenixProposalParser is defined', typeof proposalParser === 'function');
	const res = proposalParser(
		'Here is the fix:\n```json\n{"schemaVersion":"PGE-DSL-1","target":"x"}\n```'
	);
	check('proposalParser extracts JSON from markdown fence', Boolean(res?.schemaVersion === 'PGE-DSL-1'));

	const buildDecomp = vmContext.window.buildCognitiveDecompositionPrompt;
	check('buildCognitiveDecompositionPrompt is defined', typeof buildDecomp === 'function');
	const prompt = buildDecomp('combat/combat_actions.js', 'function test() {}', { name: 'test', line: 10, complexity: 18 });
	check(
		'buildCognitiveDecompositionPrompt generates targeted directive',
		prompt.includes('COGNITIVE COMPLEXITY REDUCTION') && prompt.includes('combat_actions.js') && prompt.includes('18/15')
	);
}

/**
 * @param {any} vmContext
 */
function verifySec06MonolithExporter(vmContext) {
	console.log('\n[SEC-06] PhoenixMonolithExporter API surface');
	const Exporter = vmContext.window.PhoenixMonolithExporter;
	check('PhoenixMonolithExporter is defined', Boolean(Exporter));
	check('exportMonolith is a function', typeof Exporter.exportMonolith === 'function');
	check('exportMonolithAsync is a function', typeof Exporter.exportMonolithAsync === 'function');
	check(
		'EMPTY_WASM_BASE64 is a non-empty string',
		typeof Exporter.EMPTY_WASM_BASE64 === 'string' && Exporter.EMPTY_WASM_BASE64.length > 0
	);
	check('DEFAULT_WGSL is a non-empty string', typeof Exporter.DEFAULT_WGSL === 'string' && Exporter.DEFAULT_WGSL.length > 0);
	check('MONOLITH_FORMAT is correct', Exporter.MONOLITH_FORMAT === 'PHOENIX-MONOLITH-2');
}

/**
 * @param {any} vmContext
 */
function verifySec07MonolithOutput(vmContext) {
	console.log('\n[SEC-07] Monolith export output');
	const Exporter = vmContext.window.PhoenixMonolithExporter;
	const monolithHtml = Exporter.exportMonolith({
		title: 'Test Monolith',
		sources: [ { path: 'src/combat.js', content: 'function f() { return 1; }' } ],
		wasmKernels: [ { name: 'test.wasm', base64: Exporter.EMPTY_WASM_BASE64 } ],
		shaders: [ { name: 'test.wgsl', source: Exporter.DEFAULT_WGSL } ],
		receipts: [],
	});
	check('exportMonolith returns a string', typeof monolithHtml === 'string');
	check('monolith contains <!doctype html>', monolithHtml.startsWith('<!doctype html>'));
	check('monolith contains PhoenixMonolithManifest', monolithHtml.includes('PhoenixMonolithManifest'));
	check('monolith contains window.exportMonolith', monolithHtml.includes('window.exportMonolith'));
	check('monolith contains WASM loader', monolithHtml.includes('PhoenixWasmKernels'));
	check('monolith has title Test Monolith', monolithHtml.includes('>Test Monolith<'));
}

/**
 * @param {any} Engine
 */
function verifySec08HashDeterminism(Engine) {
	console.log('\n[SEC-08] Hash and stable() determinism');
	const obj1 = { b: 2, a: 1 };
	const obj2 = { a: 1, b: 2 };
	check('stable() is key-order independent', Engine.stable(obj1) === Engine.stable(obj2));
	check('hash() produces 8-char hex string', Engine.hash('hello').length === 8 && /^[0-9a-f]+$/.test(Engine.hash('hello')));

	const hashRef1 = Engine.hash('phoenix');
	const hashRef2 = Engine.hash('phoenix');
	const hashOther = Engine.hash('other');
	check('hash() is deterministic', hashRef1 === hashRef2 && hashRef1 !== hashOther);
}

/**
 * @param {any} Engine
 */
async function verifySec09WatchdogAndFault(Engine) {
	console.log('\n[SEC-09] Watchdog, Framebuffer & Fault Localization');

	// 1. Framebuffer Hashing & Validation
	const dummyPixels = new Uint8ClampedArray([ 255, 0, 0, 255, 0, 255, 0, 255 ]);
	const fbHash = Engine.computeFramebufferHash(dummyPixels);
	check('computeFramebufferHash produces valid 8-char hex string', typeof fbHash === 'string' && fbHash.length === 8);

	const fbResult = Engine.validateFramebufferSignature(
		(/** @type {CanvasRenderingContext2D} */ ctx, /** @type {number} */ w, /** @type {number} */ h) => {
			ctx.fillRect(0, 0, w, h);
		},
		'mock-expected-hash',
		32,
		32
	);
	check('validateFramebufferSignature returns validation object', typeof fbResult === 'object' && typeof fbResult.hash === 'string');

	// 2. Watchdog Timeout Guard
	const fastResult = await Engine.executeWithTimeout(() => 42, 500);
	check('executeWithTimeout completes fast task', fastResult === 42);

	let timeoutCaught = false;
	try {
		await Engine.executeWithTimeout(
			() => new Promise((resolve) => setTimeout(resolve, 300)),
			50
		);
	} catch (/** @type {any} */ err) {
		timeoutCaught = err.message?.includes('timed out');
	}
	check('executeWithTimeout catches hanging execution with timeout error', timeoutCaught);

	// 3. Fault Localization Slicing
	const mockSource = [
		'// [SEC-01] Combat module',
		'function takeDamage(target, amount) {',
		'  target.hp -= amount;',
		'  if (target.hp < 0) target.hp = 0;',
		'  return target.hp;',
		'}',
		'function heal(target, amount) {',
		'  target.hp += amount;',
		'}',
	].join('\n');
	const mockChange = { path: 'combat.js', search: 'target.hp -= amount;', content: 'target.hp -= amount * 2;' };
	const mockFailure = { name: 'test_damage', reason: 'expected HP=50, got HP=0' };
	const faultSlice = Engine.extractFaultSlice(mockSource, mockChange, mockFailure);

	check('extractFaultSlice isolates function scope', faultSlice.scopeName === 'function takeDamage');
	check('extractFaultSlice preserves failure reason', faultSlice.failureReason.includes('expected HP=50'));
	check('extractFaultSlice encloses target line', faultSlice.faultSlice.includes('target.hp -= amount;'));
}

/**
 * @param {any} Engine
 */
function verifySec10AudioSynthesizer(Engine) {
	console.log('\n[SEC-10] Procedural Audio Synthesizer & Code Generator');
	const AudioSynth = Engine.PhoenixAudioSynthesizer;
	check('PhoenixAudioSynthesizer is defined', Boolean(AudioSynth));
	check('PRESETS contains 8 canonical retro sound types', Object.keys(AudioSynth.PRESETS).length === 8);
	check(
		'PRESETS has LASER, EXPLOSION, JUMP, HIT, COIN, POWERUP, FOOTSTEP, DEFLECT',
		[ 'LASER', 'EXPLOSION', 'JUMP', 'HIT', 'COIN', 'POWERUP', 'FOOTSTEP', 'DEFLECT' ].every(
			(k) => Boolean(AudioSynth.PRESETS[ k ])
		)
	);

	// Standalone code generator
	const standaloneCode = AudioSynth.generateSFXCode(AudioSynth.PRESETS.LASER, 'standalone');
	check('generateSFXCode emits standalone function', standaloneCode.includes('function playLaserSFX(') && standaloneCode.includes('exponentialRampToValueAtTime'));

	// EventBus code generator
	const eventBusCode = AudioSynth.generateSFXCode(AudioSynth.PRESETS.EXPLOSION, 'eventbus', 'BOSS_DEFEATED');
	check('generateSFXCode emits EventBus listener', eventBusCode.includes("EmberlightEventBus.subscribe('BOSS_DEFEATED'") && eventBusCode.includes('PhoenixAudioSynthesizer.playProceduralSFX'));
}

/**
 * @param {any} Engine
 */
function verifySec11WorkstationSubstrate(Engine) {
	console.log('\n[SEC-11] Workstation Substrate: IntelliSense, Fuzzy, Diff, Runtime');

	// 1. Symbol Indexer
	const indexer = new Engine.PhoenixSymbolIndexer();
	const sampleCode = [
		'// [SEC-01] Engine Core',
		'/**',
		' * Calculates combat damage',
		' * @param {number} base',
		' * @returns {number}',
		' */',
		'function calculateDamage(base) {',
		'  return base * 2;',
		'}',
		'class BattleEngine {',
		'  constructor() {}',
		'}',
		'const MAX_HP = 9999;',
	].join('\n');
	indexer.indexFile('battle.js', sampleCode);

	const defDamage = indexer.findDefinition('calculateDamage');
	check('SymbolIndexer resolves function definition', defDamage.length > 0 && defDamage[ 0 ].file === 'battle.js' && defDamage[ 0 ].line === 7);
	check('SymbolIndexer extracts JSDoc comment', defDamage[ 0 ].jsdoc.includes('Calculates combat damage'));

	const defClass = indexer.findDefinition('BattleEngine');
	check('SymbolIndexer resolves class definition', defClass.length > 0 && defClass[ 0 ].type === 'class');

	const completions = indexer.getCompletions('calc');
	check('SymbolIndexer returns completions matching prefix', completions.length === 1 && completions[ 0 ].name === 'calculateDamage');

	indexer.removeFile('battle.js');
	check('SymbolIndexer purges file symbols on removeFile', indexer.findDefinition('calculateDamage').length === 0);

	// 2. Fuzzy Search
	const fuzzy = Engine.PhoenixFuzzySearch;
	check('PhoenixFuzzySearch scores exact match highest', fuzzy.score('combat', 'combat') === 1000);
	check('PhoenixFuzzySearch scores prefix matches high', fuzzy.score('comb', 'combat.js') >= 800);
	check('PhoenixFuzzySearch handles camelCase boundary matches', fuzzy.score('pge', 'phoenixGovernorEngine') > 0);

	const filesList = [ 'src/combat.js', 'src/render.js', 'src/audio_synth.js' ];
	const filtered = fuzzy.filter('aud', filesList);
	check('PhoenixFuzzySearch filters and ranks list', filtered.length === 1 && filtered[ 0 ] === 'src/audio_synth.js');

	// 3. Search Engine
	const searchEngine = Engine.PhoenixSearchEngine;
	const sampleDoc = 'const damage = 100;\nconst maxDamage = 200;\nconst damage = 300;';
	const allMatches = searchEngine.findAll(sampleDoc, 'damage', { wholeWord: true });
	check('PhoenixSearchEngine finds whole word matches with lines/cols', allMatches.length === 2 && allMatches[ 0 ].line === 1 && allMatches[ 1 ].line === 3);

	const replaced = searchEngine.replaceAll(sampleDoc, 'damage', 'power', { wholeWord: true });
	check('PhoenixSearchEngine replaces matching tokens', replaced.count === 2 && replaced.text.includes('const power = 100;'));

	// 4. Chunk Diff Engine
	const diffEngine = Engine.PhoenixChunkDiffEngine;
	const oldDoc = 'line 1\nline 2\nline 3\nline 4\nline 5';
	const newDoc = 'line 1\nline 2 MODIFIED\nline 3\nline 4\nline 5';
	const hunks = diffEngine.computeHunks(oldDoc, newDoc);
	check('PhoenixChunkDiffEngine computes diff hunks', hunks.length === 1 && hunks[ 0 ].delLines.length === 1 && hunks[ 0 ].addLines.length === 1);

	const applied = diffEngine.applyHunk(oldDoc, hunks[ 0 ]);
	check('PhoenixChunkDiffEngine applies selective hunk', applied === newDoc);

	const reverted = diffEngine.rejectHunk(newDoc, hunks[ 0 ]);
	check('PhoenixChunkDiffEngine rejects selective hunk', reverted === oldDoc);

	// 5. Runtime Sandbox
	const sandbox = Engine.PhoenixRuntimeSandbox;
	const vfsMap = new Map([
		[ 'index.html', '<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>' ],
		[ 'game.js', 'console.log("game initialized");' ],
	]);
	const bundledHtml = sandbox.buildRuntimeHTML(vfsMap, 'index.html');
	check('PhoenixRuntimeSandbox bundles VFS into executable HTML', bundledHtml.includes('window.__PHOENIX_RUNTIME__') && bundledHtml.includes('game.js'));

	let ticksCount = 0;
	const ticker = sandbox.createTickController({
		onTick: () => { ticksCount++; },
		targetFPS: 60,
	});
	ticker.step(3);
	check('PhoenixRuntimeSandbox tick controller steps deterministic ticks', ticksCount === 3);
	check('PhoenixRuntimeSandbox getState exposes telemetry', ticker.getState().frameCount === 3);
}

/**
 * @param {any} Engine
 */
function verifySec12GraphicsSubstrate(Engine) {
	console.log('\n[SEC-12] Tri-Engine Graphics: WebGL Batcher, Canvas 2D & Pseudo-3D');

	// 1. WebGL Batcher & Particles
	const glBatcher = Engine.PhoenixWebGLBatcher;
	check('PhoenixWebGLBatcher is defined', Boolean(glBatcher));
	check('PhoenixWebGLBatcher has default shaders', Boolean(glBatcher.DEFAULT_VS && glBatcher.DEFAULT_FS));

	const particleSys = glBatcher.createParticleSystem(100);
	particleSys.emit(100, 100, 15, { speed: 3, life: 1.0 });
	check('ParticleSystem emits active particles', particleSys.getCount() === 15);
	particleSys.update(0.5);
	check('ParticleSystem updates particle lifetimes', particleSys.getCount() === 15);
	particleSys.update(0.6);
	check('ParticleSystem purges expired particles', particleSys.getCount() === 0);

	// 2. Canvas 2D Layer Engine & Camera
	const canvasEngine = Engine.PhoenixCanvas2DLayerEngine;
	check('PhoenixCanvas2DLayerEngine is defined', Boolean(canvasEngine));
	const camera = canvasEngine.createCamera({ x: 100, y: 100, zoom: 2 });
	const screenPos = camera.worldToScreen(100, 100, 640, 480);
	check('Camera worldToScreen centers target in viewport', screenPos.x === 320 && screenPos.y === 240);

	const worldPos = camera.screenToWorld(320, 240, 640, 480);
	check('Camera screenToWorld inverse projection is exact', worldPos.x === 100 && worldPos.y === 100);

	const mockGrid = [
		[ 1, 1, 1, 1, 1 ],
		[ 1, 0, 0, 0, 1 ],
		[ 1, 0, 1, 0, 1 ],
		[ 1, 1, 1, 1, 1 ]
	];
	const mockPalette = { 1: '#00ffcc' };
	const renderedTileCount = canvasEngine.renderTilemap(
		{ fillStyle: '', fillRect: () => { } },
		mockGrid,
		32,
		mockPalette,
		camera,
		640,
		480
	);
	check('Tilemap renderer culls and counts visible tiles', renderedTileCount > 0);

	// 3. Pseudo-3D DDA Raycaster
	const raycaster = Engine.PhoenixPseudo3DRaycaster;
	check('PhoenixPseudo3DRaycaster is defined', Boolean(raycaster));
	const player = { x: 1.5, y: 1.5, angle: 0 };
	const rayHits = raycaster.castRays(mockGrid, player, Math.PI / 3, 32);
	check('Raycaster casts rays across 2D map grid', rayHits.length === 32);
	check('Raycaster detects wall collision distance', rayHits[ 16 ].distance > 0 && rayHits[ 16 ].hitTile === 1);

	const sprites = [ { x: 2.5, y: 1.5, id: 'chest' } ];
	const projSprites = raycaster.projectSprites(sprites, player, Math.PI / 3, 640, 480);
	check('Raycaster projects billboarded sprites in 3D camera space', projSprites.length === 1 && projSprites[ 0 ].distance > 0);
}

/**
 * @param {any} Engine
 */
function verifySec13VoxelEngine(Engine) {
	console.log('\n[SEC-13] 3D Fast Voxel DDA World Engine');
	const voxelEngine = Engine.PhoenixVoxel3DEngine;
	check('PhoenixVoxel3DEngine is defined', Boolean(voxelEngine));

	const volume = voxelEngine.createVolume(8, 4, 8, 0);
	check('createVolume creates initialized volume buffer', volume.sizeX === 8 && volume.data.length === 8 * 4 * 8);

	const setSuccess = voxelEngine.setVoxel(volume, 2, 1, 3, 4);
	check('setVoxel mutates target coordinate in volume', setSuccess && voxelEngine.getVoxel(volume, 2, 1, 3) === 4);

	const outOfBoundsVoxel = voxelEngine.getVoxel(volume, -1, 10, 2);
	check('getVoxel handles out-of-bounds queries gracefully', outOfBoundsVoxel === 0);

	const ddaRay = voxelEngine.castRay3D(volume, { x: 2, y: 1, z: 0.5 }, { x: 0, y: 0, z: 1 }, 10);
	check(
		'castRay3D detects 3D voxel intersection with accurate face',
		ddaRay.hit && ddaRay.x === 2 && ddaRay.y === 1 && ddaRay.z === 3 && ddaRay.face === 'north' && ddaRay.normal[ 2 ] === -1
	);

	const dungeonVol = voxelEngine.generateDungeonVolume(12, 6, 12);
	check('generateDungeonVolume carves floor, ceiling and boundary walls', dungeonVol.data.length === 12 * 6 * 12 && voxelEngine.getVoxel(dungeonVol, 0, 0, 0) === 1);
}

/**
 * @param {any} Engine
 */
function verifySec14TerrainAndLinter(Engine) {
	console.log('\n[SEC-14] Procedural Terrain Raymarcher & Code Studio Substrate');
	const terrainEngine = Engine.PhoenixTerrainRaymarcher;
	check('PhoenixTerrainRaymarcher is defined', Boolean(terrainEngine));

	const elevation = terrainEngine.sampleHeight(10, 20);
	check('sampleHeight calculates non-negative elevation', elevation >= 0.5);

	const norm = terrainEngine.computeNormal(10, 20);
	const normLen = Math.hypot(norm[ 0 ], norm[ 1 ], norm[ 2 ]);
	check('computeNormal produces normalized unit vector', Math.abs(normLen - 1.0) < 1e-4);

	const terrainRay = terrainEngine.castTerrainRay({ x: 0, y: 40, z: 0 }, { x: 0, y: -1, z: 0 }, 50);
	check('castTerrainRay detects downward terrain collision', terrainRay.hit && terrainRay.height > 0);

	const glslSource = terrainEngine.getWebGLTerrainShaderSource();
	check('getWebGLTerrainShaderSource returns GLSL shader program', glslSource.includes('void main()') && glslSource.includes('mapTerrain'));

	const formatter = Engine.PhoenixCodeFormatter;
	check('PhoenixCodeFormatter is defined', Boolean(formatter));
	const unformattedJS = 'function test(){\nlet x=1;\nreturn x;\n}';
	const formattedJS = formatter.formatJS(unformattedJS, { indent: 2 });
	check('PhoenixCodeFormatter.formatJS applies clean indentation', formattedJS.includes('  let x=1;'));

	const formattedJSON = formatter.formatJSON('{"a":1,"b":2}');
	check('PhoenixCodeFormatter.formatJSON pretty-prints valid JSON', formattedJSON.includes('  "a": 1'));

	const linter = Engine.PhoenixLinterSuite;
	check('PhoenixLinterSuite is defined', Boolean(linter));
	const badSource = 'function bad() {\n  // ...\n  eval("x");\n}';
	const lintIssues = linter.lintCode(badSource, 'test.js');
	check('PhoenixLinterSuite catches forbidden placeholders and eval', lintIssues.length >= 2);

	const complexSource = [
		'function deeplyNested(a, b, c) {',
		'  if (a) {',
		'    if (b) {',
		'      for (let i = 0; i < 10; i++) {',
		'        if (c && i > 5) {',
		'          return i;',
		'        }',
		'      }',
		'    }',
		'  }',
		'  return 0;',
		'}'
	].join('\n');
	const complexScore = linter.calculateCognitiveComplexity(complexSource);
	check('calculateCognitiveComplexity measures nested control flow', complexScore >= 10);
	const scanned = linter.scanFunctionsComplexity(complexSource, 8);
	check('scanFunctionsComplexity identifies functions exceeding threshold', scanned.length === 1 && scanned[ 0 ].name === 'deeplyNested');

	// Hot-Loop Allocation Sentinel Verification
	const hotLoopCode = `
function update(dt) {
  const temp = { x: dt * 2 };
  const arr = [1, 2, 3];
  const buf = new Float32Array(16);
  const fn = () => dt;
  const str = \`frame: \${dt}\`;
}
`;
	const hotViolations = linter.auditHotLoopAllocations(hotLoopCode);
	check('auditHotLoopAllocations detects object, array, heap, closure, and template allocations in update()', hotViolations.length >= 4);
	check('auditHotLoopAllocations flags HOT_LOOP_OBJECT_ALLOCATION', hotViolations.some((/** @type {any} */ v) => v.type === 'HOT_LOOP_OBJECT_ALLOCATION'));
	check('auditHotLoopAllocations flags HOT_LOOP_ARRAY_ALLOCATION', hotViolations.some((/** @type {any} */ v) => v.type === 'HOT_LOOP_ARRAY_ALLOCATION'));
	check('auditHotLoopAllocations flags HOT_LOOP_HEAP_INSTANTIATION', hotViolations.some((/** @type {any} */ v) => v.type === 'HOT_LOOP_HEAP_INSTANTIATION'));

	// JSDoc Parity Verifier Verification
	const jsdocDriftCode = `
/**
 * @param {number} a
 * @param {number} b
 * @param {number} c
 */
function add(a, b) {
  return a + b;
}

/**
 * @param {number} targetX
 */
function move(targetY) {
  return targetY;
}
`;
	const jsdocIssues = linter.verifyJSDocParity(jsdocDriftCode);
	check('verifyJSDocParity detects arity and param name drift', jsdocIssues.length >= 2);
	check('verifyJSDocParity detects PARAM_ARITY_MISMATCH', jsdocIssues.some((/** @type {any} */ i) => i.issue === 'PARAM_ARITY_MISMATCH'));
	check('verifyJSDocParity detects PARAM_NAME_MISMATCH', jsdocIssues.some((/** @type {any} */ i) => i.issue === 'PARAM_NAME_MISMATCH'));

	// 5-State Lexer FSM Verification
	const Lexer = Engine.PhoenixLexer;
	check('PhoenixLexer is defined', typeof Lexer === 'function');
	const lexerSample = 'const x = `hello ${foo + 10} world`; const re = /[/*]/g; /* multiline\ncomment */ const y = 42;';
	const tokens = Lexer.tokenize(lexerSample);
	check('PhoenixLexer.tokenize extracts streaming tokens', tokens.length >= 10);
	check('PhoenixLexer disambiguates template strings with interpolation', tokens.some((/** @type {any} */ t) => t.type === 'TEMPLATE_STRING'));
	check('PhoenixLexer disambiguates regex literals', tokens.some((/** @type {any} */ t) => t.type === 'REGEX'));

	// Test line-by-line FSM carryover
	const line1Res = Lexer.tokenizeLine('/* start of multiline comment');
	check('tokenizeLine sets BLOCK_COMMENT endState', line1Res.endState.state === Lexer.STATES.BLOCK_COMMENT);
	const line2Res = Lexer.tokenizeLine('   end of comment */ const a = 1;', line1Res.endState);
	check('tokenizeLine recovers CODE state after block comment', line2Res.endState.state === Lexer.STATES.CODE && line2Res.tokens.some((/** @type {any} */ t) => t.type === 'KEYWORD'));
}

/**
 * @param {any} vmContext
 */
function verifySec15ERLAndRemediation(vmContext) {
	console.log('\n[SEC-15] Error Resolution Ledger (ERL-001) & Batch Remediation');
	const ERLLedgerClass = vmContext.window.PhoenixSovereignEngine.PhoenixErrorResolutionLedger;
	check('PhoenixErrorResolutionLedger is defined', typeof ERLLedgerClass === 'function');
	const erl = new ERLLedgerClass();
	check('ERL initialized with seed templates', erl.size >= 2);

	const mathDiag = { rule: 'MATH/RANDOM', line: 10, message: 'Math.random() is forbidden' };
	const matched = erl.findMatch(mathDiag, 'const r = Math.random();');
	check('ERL matches MATH/RANDOM diagnostic', matched !== null && matched.searchPattern === 'Math.random()');

	// Test recording a novel pattern
	erl.record({
		id: 'erl_custom_1',
		fingerprint: 'CUSTOM/TEST',
		rule: 'CUSTOM/TEST',
		description: 'Custom test template',
		searchPattern: 'oldVarName',
		replacePattern: 'newVarName',
		verifiedReceipt: 'PASS',
		timestamp: new Date().toISOString(),
		useCount: 1
	});
	check('ERL records new pattern', erl.lookup('CUSTOM/TEST') !== null);

	// Test NDJSON serialization / deserialization
	const ndjson = erl.exportNDJSON();
	check('exportNDJSON produces valid lines', ndjson.includes('CUSTOM/TEST') && ndjson.split('\n').length >= 3);
	const erl2 = new ERLLedgerClass();
	const importedCount = erl2.importNDJSON(ndjson);
	check('importNDJSON restores all records', importedCount >= 3 && erl2.lookup('CUSTOM/TEST') !== null);

	// Test Batch Remediation Fast-Path
	const BatchPipeline = vmContext.window.PhoenixSovereignEngine.PhoenixBatchRemediationPipeline;
	check('PhoenixBatchRemediationPipeline is defined', typeof BatchPipeline === 'function');

	const rawSampleCode = 'function doRoll() {\n  return Math.random();\n}';
	const diags = [
		{ rule: 'MATH/RANDOM', line: 2, message: 'Forbidden Math.random()' },
		{ rule: 'UNKNOWN/NOVEL', line: 1, message: 'Novel issue' }
	];
	const batchFastResult = BatchPipeline.executeFastPath(
		rawSampleCode,
		diags,
		'test.js',
		erl,
		(/** @type {string} */ candidate) => ({ pass: !candidate.includes('Math.random()') })
	);
	check('Batch fast-path applies cached resolution', batchFastResult.fastPathApplied === 1 && batchFastResult.patchedSource.includes('_rng.next()'));
	check('Batch fast-path leaves novel diagnostics unresolved', batchFastResult.unresolvedDiagnostics.length === 1 && batchFastResult.unresolvedDiagnostics[ 0 ].rule === 'UNKNOWN/NOVEL');

	// Test proximity snapping & regex support in batch fast-path
	const shiftedCode = 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst r = Math.random();\nconst d = 4;';
	const shiftedDiags = [{ rule: 'MATH/RANDOM', line: 1, message: 'Forbidden Math.random()' }];
	const proximityResult = BatchPipeline.executeFastPath(
		shiftedCode,
		shiftedDiags,
		'shifted.js',
		erl,
		(/** @type {string} */ candidate) => ({ pass: !candidate.includes('Math.random()') })
	);
	check('Batch fast-path snaps proximity within ±25 lines', proximityResult.fastPathApplied === 1 && proximityResult.patchedSource.includes('_rng.next()'));

	const regexMatched = erl.findMatch({ rule: 'REGEX/VERBOSE_CHAR_CLASS' });
	check('ERL matches REGEX/VERBOSE_CHAR_CLASS with isRegex', regexMatched !== null && regexMatched.isRegex === true);

	const execMatched = erl.findMatch({ rule: 'javascript:S6594' });
	check('ERL matches javascript:S6594 for RegExp.exec preference', execMatched !== null && execMatched.fingerprint === 'REGEX/EXEC_NON_GLOBAL_PREFERENCE');

	const arrayAtMatched = erl.findMatch({ rule: 'javascript:S7755' });
	check('ERL matches javascript:S7755 for Array.at preference', arrayAtMatched !== null && arrayAtMatched.fingerprint === 'LINT/ARRAY_AT_PREFERENCE');

	// Test batch prompt generator
	const buildBatchPrompt = vmContext.window.buildBatchDiagnosticDebugPrompt;
	check('buildBatchDiagnosticDebugPrompt is defined', typeof buildBatchPrompt === 'function');
	const batchPrompt = buildBatchPrompt('combat.js', rawSampleCode, batchFastResult.unresolvedDiagnostics);
	check('buildBatchDiagnosticDebugPrompt contains BATCH REMEDIATION DIRECTIVE', batchPrompt.includes('BATCH ERROR REMEDIATION DIRECTIVE') && batchPrompt.includes('combat.js'));

	// Test Tier 5 ERL Anti-Pattern Scanner
	const antiPatterns = erl.scanAntiPatterns('const x = Math.random(); debugger;');
	check('scanAntiPatterns detects cataloged anti-patterns', antiPatterns.length === 2 && antiPatterns.some((/** @type {{ rule: string }} */ a) => a.rule.startsWith('MATH/RANDOM')) && antiPatterns.some((/** @type {{ rule: string }} */ a) => a.rule === 'DEBUGGER'));

	// Test Upstream Placeholder Rejection in Parser
	const parser = vmContext.window.phoenixProposalParser;
	let caughtPlaceholder = false;
	try {
		parser('```json\n{ "schemaVersion": "PGE-DSL-1", "changes": [{ "type": "replace_text", "search": "foo", "content": "// ... rest of code" }] }\n```');
	} catch (/** @type {any} */ err) {
		caughtPlaceholder = err.message?.includes('forbidden placeholder token');
	}
	check('phoenixProposalParser rejects lazy // ... truncations upstream', caughtPlaceholder);

	// Test Upstream Self-Healing on Worker Bridge
	const testBridge = new vmContext.window.PhoenixWebLLMWorkerBridge();
	check('generateProposalWithSelfHealing is defined on bridge', typeof testBridge.generateProposalWithSelfHealing === 'function');
}

/**
 * @param {any} vmContext
 */
function verifySec16RegionScaffolder(vmContext) {
	console.log('\n[SEC-16] Region Scaffolder, Contract & Graph Dependency Verifier');
	const scaffolder = vmContext.window.PhoenixSovereignEngine.PhoenixRegionScaffolder;
	check('PhoenixRegionScaffolder is defined', typeof scaffolder === 'object' && scaffolder !== null);

	const sampleUnstructuredCode = `
/** @typedef {Object} SampleState */
const CONFIG = Object.freeze({ speed: 10 });
function updateMath(x) { return x * 2; }
class SampleEngine {
  constructor() { this.x = 0; }
  getDiagnostics() { return { x: this.x }; }
}
window.SampleEngine = SampleEngine;
`;

	const scaffoldResult = scaffolder.scaffoldRegions(sampleUnstructuredCode, 'sample.js');
	check('scaffoldRegions preserves 100% AST Equivalence', scaffoldResult.astEquivalent === true);
	check('scaffoldRegions creates structured regions', scaffoldResult.regionCount >= 3);
	check('scaffoldRegions contains [SEC-01]', scaffoldResult.scaffoldedSource.includes('[SEC-01]'));
	check('scaffoldRegions contains [SEC-02]', scaffoldResult.scaffoldedSource.includes('[SEC-02]'));

	const contractResult = scaffolder.verifyContract(
		'class AudioTest { constructor() { this.ctx = new AudioContext(); } }',
		[ 'cap:audio.procedural' ]
	);
	check('verifyContract verifies valid capability', contractResult.compliant === true);
	check('verifyContract detects audio capability', contractResult.verifiedCapabilities.includes('cap:audio.procedural'));

	const depResult = scaffolder.analyzeDependencies(
		'window.Combat = {}; EmberlightEventBus.subscribe("ATTACK", () => {}); EmberlightPRNG.nextFloat();'
	);
	check('analyzeDependencies detects global reads', depResult.reads.includes('EmberlightEventBus') && depResult.reads.includes('EmberlightPRNG'));
	check('analyzeDependencies detects global writes', depResult.writes.includes('Combat'));
	check('analyzeDependencies detects event channels', depResult.events.includes('ATTACK'));
}

/**
 * @param {string} raw
 */
function cleanPathSlashes(raw) {
	let p = (raw || '').trim();
	while (p.startsWith('/') || p.startsWith('\\')) {
		p = p.slice(1);
	}
	return p.trim();
}

function verifySec17MultiTabAndFileManagement() {
	console.log('\n--- [SEC-17] Multi-Document Tab Bar & Explorer File CRUD Verification ---');

	// Tab and Dirty tracking state simulator
	/** @type {string[]} */
	const openTabs = [];
	/** @type {Set<string>} */
	const dirtyTabs = new Set();
	let activeFile = '';

	/**
	 * @param {string} filePath
	 */
	function openFile(filePath) {
		activeFile = filePath;
		if (!openTabs.includes(filePath)) {
			openTabs.push(filePath);
		}
	}

	/**
	 * @param {string} filePath
	 */
	function closeTab(filePath) {
		const idx = openTabs.indexOf(filePath);
		if (idx === -1) return;
		openTabs.splice(idx, 1);
		dirtyTabs.delete(filePath);
		if (activeFile === filePath) {
			activeFile = openTabs.length > 0 ? openTabs[Math.min(idx, openTabs.length - 1)] : '';
		}
	}

	/**
	 * @param {string} filePath
	 * @param {string} current
	 * @param {string} committed
	 */
	function onContentChange(filePath, current, committed) {
		if (current !== committed) {
			dirtyTabs.add(filePath);
		} else {
			dirtyTabs.delete(filePath);
		}
	}

	// 1. Tab open & active file verification
	openFile('combat/combat_actions.js');
	openFile('entities/player.js');
	openFile('render/viewport.js');
	check('Multi-tab strip accumulates open files without duplicates', openTabs.length === 3 && activeFile === 'render/viewport.js');

	openFile('combat/combat_actions.js');
	check('Opening existing open tab does not duplicate tab strip entries', openTabs.length === 3 && activeFile === 'combat/combat_actions.js');

	// 2. Dirty tracking verification
	onContentChange('combat/combat_actions.js', 'function test() { return 2; }', 'function test() { return 1; }');
	check('Dirty tabs set tracks unsaved modifications', dirtyTabs.has('combat/combat_actions.js'));

	onContentChange('combat/combat_actions.js', 'function test() { return 1; }', 'function test() { return 1; }');
	check('Reverting content clears dirty tab indicator', !dirtyTabs.has('combat/combat_actions.js'));

	// 3. Tab closing & adjacent selection verification
	onContentChange('entities/player.js', 'dirty', 'clean');
	closeTab('entities/player.js');
	check('Closing tab removes from open tabs array', openTabs.length === 2 && !openTabs.includes('entities/player.js'));
	check('Closing tab clears dirty state for that file', !dirtyTabs.has('entities/player.js'));

	closeTab('combat/combat_actions.js');
	check('Closing active tab switches to remaining adjacent tab', activeFile === 'render/viewport.js');

	closeTab('render/viewport.js');
	check('Closing final tab clears active file selection', openTabs.length === 0 && activeFile === '');

	// 4. VFS CRUD simulator verification
	/** @type {Map<string, string>} */
	const vfs = new Map();
	/**
	 * @param {string} path
	 * @param {string} content
	 */
	function createVfsFile(path, content) {
		const clean = cleanPathSlashes(path);
		vfs.set(clean, content);
		return clean;
	}
	/**
	 * @param {string} oldPath
	 * @param {string} newPath
	 */
	function renameVfsFile(oldPath, newPath) {
		const clean = cleanPathSlashes(newPath);
		const content = vfs.get(oldPath) || '';
		vfs.delete(oldPath);
		vfs.set(clean, content);
		return clean;
	}
	/**
	 * @param {string} path
	 */
	function deleteVfsFile(path) {
		return vfs.delete(path);
	}

	createVfsFile('combat/boss_encounter.js', 'export const boss = {};');
	check('createVfsFile creates new entry in VFS map', vfs.has('combat/boss_encounter.js'));

	renameVfsFile('combat/boss_encounter.js', 'combat/malakor_boss.js');
	check('renameVfsFile transfers content and updates key in VFS', vfs.has('combat/malakor_boss.js') && !vfs.has('combat/boss_encounter.js'));

	deleteVfsFile('combat/malakor_boss.js');
	check('deleteVfsFile removes entry from VFS', !vfs.has('combat/malakor_boss.js'));
}

/**
 * @param {any} vmContext
 */
function verifySec18ProposalSanitizationAndUnicodeTargets(vmContext) {
	console.log('\n[SEC-18] Unicode Target Registration, Proposal Envelope Sanitization & Hunk Operations');
	const Engine = vmContext.window.PhoenixSovereignEngine;
	const spec = new Engine.SpecificationRegistry();

	// 1. Unicode & whitespace target registration
	const unicodePath1 = 'Synarche_Workspace/incoming/🔗 SYNG.Link.Forge_ The Ingestion-to-Canonization Bridge.md';
	const unicodePath2 = 'Vertical Slices/The Descent/The Descent — Vertical Slice v7.html';
	const unicodePath3 = 'Vector Nexus - Copy.html';

	spec.registerTarget(unicodePath1, {
		tenant: 'SYNARCHE',
		path: unicodePath1,
		writable: true,
		allowedOperations: [ 'MODIFY', 'REPLACE' ],
		capabilities: [],
		dependencies: []
	});
	check('SpecificationRegistry accepts emoji & bracket paths', spec.getTarget(unicodePath1) !== null);

	spec.registerTarget(unicodePath2, {
		tenant: 'DESCENT',
		path: unicodePath2,
		writable: true,
		allowedOperations: [ 'MODIFY', 'REPLACE' ],
		capabilities: [],
		dependencies: []
	});
	check('SpecificationRegistry accepts em-dash & space paths', spec.getTarget(unicodePath2) !== null);

	spec.registerTarget(unicodePath3, {
		tenant: 'VECTOR NEXUS',
		path: unicodePath3,
		writable: true,
		allowedOperations: [ 'MODIFY', 'REPLACE' ],
		capabilities: [],
		dependencies: []
	});
	check('SpecificationRegistry accepts tenant names and copy filenames with spaces', spec.getTarget(unicodePath3) !== null);

	// 2. Proposal envelope sanitizer contract simulation
	/**
	 * @param {any} rawProposal
	 * @param {string} [fallbackTarget]
	 * @param {string} [fallbackIntent]
	 */
	function sanitizeProposalEnvelope(rawProposal, fallbackTarget = 'index.html', fallbackIntent = 'Auto-repair update') {
		const target = String(rawProposal?.target || fallbackTarget || 'index.html').trim();
		const schemaVersion = 'PGE-DSL-1';
		const proposalId = (typeof rawProposal?.proposalId === 'string' && rawProposal.proposalId.trim())
			? rawProposal.proposalId.trim()
			: `prop-${Date.now().toString(36)}`;
		const operation = (typeof rawProposal?.operation === 'string' && rawProposal.operation.trim())
			? rawProposal.operation.trim().toUpperCase()
			: 'MODIFY';
		const rawIntent = typeof rawProposal?.intent === 'string' ? rawProposal.intent.trim() : '';
		const intent = (rawIntent.length >= 1 && rawIntent.length <= 4096) ? rawIntent : fallbackIntent;
		const requiredCapabilities = Array.isArray(rawProposal?.requiredCapabilities) ? rawProposal.requiredCapabilities : [];
		const expectedInvariants = Array.isArray(rawProposal?.expectedInvariants) ? rawProposal.expectedInvariants : [ 'damage.nonnegative' ];
		const testsRequested = Array.isArray(rawProposal?.testsRequested) ? rawProposal.testsRequested : [ 'sentinel.headless' ];
		const changes = Array.isArray(rawProposal?.changes) && rawProposal.changes.length > 0 ? rawProposal.changes : [
			{ type: 'replace_text', path: target, search: '', content: '// default' }
		];
		return { schemaVersion, proposalId, target, operation, intent, requiredCapabilities, expectedInvariants, testsRequested, changes };
	}

	const sparseProposal = { changes: [ { type: 'replace_text', path: 'Vector Nexus - Copy.html', search: 'A', content: 'B' } ] };
	const clean = sanitizeProposalEnvelope(sparseProposal, 'Vector Nexus - Copy.html', 'Sanitized test proposal');
	check('Sanitizer normalizes schemaVersion to PGE-DSL-1', clean.schemaVersion === 'PGE-DSL-1');
	check('Sanitizer fills default target', clean.target === 'Vector Nexus - Copy.html');
	check('Sanitizer fills required arrays', Array.isArray(clean.expectedInvariants) && Array.isArray(clean.testsRequested) && Array.isArray(clean.requiredCapabilities));
	check('Sanitizer preserves changes', clean.changes.length === 1 && clean.changes[ 0 ].content === 'B');

	// 3. Diff Hunk compute, apply, and reject
	const DiffEngine = Engine.PhoenixChunkDiffEngine;
	const oldCode = 'line 1\nline 2\nline 3';
	const newCode = 'line 1\nline 2 MODIFIED\nline 3';
	const hunks = DiffEngine.computeHunks(oldCode, newCode);
	check('ChunkDiffEngine computes single hunk for line change', hunks.length === 1);

	const applied = DiffEngine.applyHunk(oldCode, hunks[ 0 ]);
	check('applyHunk commits change to baseline', applied === newCode);

	const rejected = DiffEngine.rejectHunk(newCode, hunks[ 0 ]);
	check('rejectHunk reverts modified code to old state', rejected === oldCode);
}

function verifySec19HostInfillEngine(ctx) {
	console.log('\n[SEC-19] Host Slot-Filling (Infill) & Micro-Envelope Construction Engine');
	const Engine = ctx.window.PhoenixSovereignEngine;
	const InfillEngine = Engine.PhoenixHostInfillEngine;
	check('PhoenixHostInfillEngine is defined', Boolean(InfillEngine));

	const sampleSource = [
		'function updateParticle(p) {',
		'    const t = p.charge;',
		'    const angle = Math.random() * Math.PI * 2;',
		'    p.vx = Math.cos(angle);',
		'}'
	].join('\n');

	// 1. buildMicroContext extracts target line, indentation, and surrounding context
	const micro = InfillEngine.buildMicroContext(sampleSource, 3, 2);
	check('buildMicroContext extracts target line correctly', Boolean(micro?.targetLine === '    const angle = Math.random() * Math.PI * 2;'));
	check('buildMicroContext preserves leading indentation', Boolean(micro?.leadingIndent === '    '));
	check('buildMicroContext includes <TARGET_LINE> tag', Boolean(micro?.contextLines.some(l => l.includes('<TARGET_LINE>'))));

	// 2. parseModelOutput hybrid fallback
	const jsonOut = '{\n  "replacement": "const angle = EmberlightPRNG.nextFloat() * Math.PI * 2;"\n}';
	check('parseModelOutput parses structured JSON correctly', InfillEngine.parseModelOutput(jsonOut) === 'const angle = EmberlightPRNG.nextFloat() * Math.PI * 2;');

	const markdownJson = '```json\n{"replacement": "const angle = 1.0;"}\n```';
	check('parseModelOutput strips markdown wrapped JSON', InfillEngine.parseModelOutput(markdownJson) === 'const angle = 1.0;');

	const rawCodeOut = '```javascript\nconst angle = EmberlightPRNG.nextFloat() * Math.PI * 2;\n```';
	check('parseModelOutput extracts raw code from markdown fences', InfillEngine.parseModelOutput(rawCodeOut) === 'const angle = EmberlightPRNG.nextFloat() * Math.PI * 2;');

	const bareLine = 'const angle = 0.5;';
	check('parseModelOutput handles bare code line', InfillEngine.parseModelOutput(bareLine) === 'const angle = 0.5;');

	// 3. assembleInfillProposal determinism and 0% anchor drift
	const proposal = InfillEngine.assembleInfillProposal('test.js', micro.targetLine, 'const angle = 0.5;', micro.leadingIndent);
	check('assembleInfillProposal sets PGE-DSL-1 schema', proposal.schemaVersion === 'PGE-DSL-1');
	check('assembleInfillProposal produces exactly 1 change', proposal.changes.length === 1);
	check('assembleInfillProposal sets exact search anchor with 0% drift', proposal.changes[0].search === micro.targetLine);
	check('assembleInfillProposal restores leading indentation on content', proposal.changes[0].content === '    const angle = 0.5;');
}

/**
 * @param {any} ctx
 */
function verifySec20SynarcheLexerERL(ctx) {
	console.log('\n[SEC-20] SynarcheLexer Token-Accurate Code Slicing & ERL Remediation');

	const Engine = ctx.window.PhoenixSovereignEngine;
	const Ledger = Engine.PhoenixErrorResolutionLedger;
	const Pipeline = Engine.PhoenixBatchRemediationPipeline;
	const Lexer = ctx.window.SynarcheLexer;

	check('SynarcheLexer is available on VM global scope', Boolean(Lexer && typeof Lexer.tokenize === 'function'));

	const ledger = new Ledger();

	// 1. Token disambiguation: verify string literal and comment containing pattern are preserved
	const mixedLine = 'const note = "Math.random() is bad"; const val = Math.random(); // call Math.random()';
	const diagRandom = { rule: 'VSRP/PRNG-AUTHORITY', line: 1 };
	const matchRandom = ledger.findMatch(diagRandom, mixedLine);

	check('findMatch attaches tokenMatch for mixed line', Boolean(matchRandom?.tokenMatch));
	check('tokenMatch targets exact executable Math.random() start offset', matchRandom?.tokenMatch?.start === 49);
	check('tokenMatch targets exact executable Math.random() end offset', matchRandom?.tokenMatch?.end === 62);
	check('tokenMatch matchedText is Math.random()', matchRandom?.tokenMatch?.matchedText === 'Math.random()');

	// 2. Fast-path remediation preserves string and comment, only replacing executable code
	const fastPathRes = Pipeline.executeFastPath(mixedLine, [ diagRandom ], 'mixed.js', ledger, () => ({ pass: true }));
	check('executeFastPath succeeds with 1 applied change', fastPathRes.pass && fastPathRes.fastPathApplied === 1);
	check('applied change via is ERL-001/SYNARCHE-LEXER', fastPathRes.appliedChanges[0]?.via === 'ERL-001/SYNARCHE-LEXER');
	check('patched string preserves string literal intact', fastPathRes.patchedSource.includes('const note = "Math.random() is bad";'));
	check('patched string preserves comment intact', fastPathRes.patchedSource.includes('// call Math.random()'));
	check('patched string replaces only executable code with PRNG call', fastPathRes.patchedSource.includes('const val = (_rng.next() / 0xFFFFFFFF);'));

	// 3. Faraday Isolation (ERR_0x16) Seed Template Resolution
	const faradayLine = 'const w = window.innerWidth;';
	const diagFaraday = { rule: 'ERR_0x16: FARADAY_CAPABILITY_VIOLATION', line: 1 };
	const matchFaraday = ledger.findMatch(diagFaraday, faradayLine);
	check('findMatch resolves ERR_0x16 Faraday seed template', Boolean(matchFaraday?.searchPattern === 'window.'));
	const faradayRes = Pipeline.executeFastPath(faradayLine, [ diagFaraday ], 'faraday.js', ledger, () => ({ pass: true }));
	check('executeFastPath replaces window. with attenuated capabilities membrane', faradayRes.patchedSource === 'const w = ctx.capabilities?.dom?.innerWidth;');

	// 4. Hot Loop Allocation (ERR_0x17) Seed Template Resolution
	const hotLoopLine = 'const temp = new Object();';
	const diagHotLoop = { rule: 'ERR_0x17: TRANSIENT_HOT_LOOP_ALLOCATION', line: 1 };
	const matchHotLoop = ledger.findMatch(diagHotLoop, hotLoopLine);
	check('findMatch resolves ERR_0x17 Hot Loop seed template', Boolean(matchHotLoop?.searchPattern === 'new Object()'));
	const hotLoopRes = Pipeline.executeFastPath(hotLoopLine, [ diagHotLoop ], 'loop.js', ledger, () => ({ pass: true }));
	check('executeFastPath replaces new Object() with scratchpad reference', hotLoopRes.patchedSource === 'const temp = _scratchpad;');

	const arrayLine = 'const arr = new Array();';
	const matchArray = ledger.findMatch(diagHotLoop, arrayLine);
	check('findMatch resolves ERR_0x17 Array allocation template', matchArray?.searchPattern === 'new Array()');
	const arrayRes = Pipeline.executeFastPath(arrayLine, [ diagHotLoop ], 'arr.js', ledger, () => ({ pass: true }));
	check('executeFastPath replaces new Array() with scratchArray reference', arrayRes.patchedSource === 'const arr = _scratchArray;');
}

function printSummary() {
	const totalChecks = passed + failed;
	console.log(`\n${'─'.repeat(60)}`);
	if (failed === 0) {
		console.log(`=== PHOENIX SUBSTRATE AUDIT 100% SUCCESS: ${passed}/${totalChecks} CHECKS PASSED ===`);
		process.exit(0);
	} else {
		console.error(`=== PHOENIX SUBSTRATE AUDIT FAILED: ${passed}/${totalChecks} PASSED, ${failed} FAILED ===`);
		auditLog.filter(e => e.status === 'FAIL').forEach(e => console.error(`  - ${e.label}: ${e.detail}`));
		process.exit(1);
	}
}

async function runVerification() {
	console.log('\n============================================================');
	console.log('PHOENIX SOVEREIGN ENGINE & GOVERNANCE SUBSTRATE VERIFICATION');
	console.log('============================================================');

	const Engine = context.window.PhoenixSovereignEngine;
	verifySec01EngineSurface(Engine);
	verifySec02StructuralLinter(Engine);
	const gov = await verifySec03GovernorLifecycle(Engine);
	verifySec04ReceiptLedger(gov);
	verifySec05WorkerBridge(context);
	verifySec06MonolithExporter(context);
	verifySec07MonolithOutput(context);
	verifySec08HashDeterminism(Engine);
	await verifySec09WatchdogAndFault(Engine);
	verifySec10AudioSynthesizer(Engine);
	verifySec11WorkstationSubstrate(Engine);
	verifySec12GraphicsSubstrate(Engine);
	verifySec13VoxelEngine(Engine);
	verifySec14TerrainAndLinter(Engine);
	verifySec15ERLAndRemediation(context);
	verifySec16RegionScaffolder(context);
	verifySec17MultiTabAndFileManagement();
	verifySec18ProposalSanitizationAndUnicodeTargets(context);
	verifySec19HostInfillEngine(context);
	verifySec20SynarcheLexerERL(context);

	printSummary();
}

runVerification().catch((err) => { // NOSONAR: Top-level invocation in CommonJS Node environment
	console.error(err);
	process.exit(1);
});
