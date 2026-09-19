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
  'phoenix/phoenix_sovereign_engine.js',
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

(async () => {
  console.log('\n============================================================');
  console.log('PHOENIX SOVEREIGN ENGINE & GOVERNANCE SUBSTRATE VERIFICATION');
  console.log('============================================================');

  /* ── SEC-01: Engine exports on window ───────────────────────────────── */
  console.log('\n[SEC-01] PhoenixSovereignEngine API surface');
  const Engine = context.window.PhoenixSovereignEngine;
  check('PhoenixSovereignEngine is defined', Boolean(Engine));
  check('VERSION is 7.0.0-ULTIMATE-FUSION', Engine.VERSION === '7.0.0-ULTIMATE-FUSION');
  check(
    'PROTOCOLS contains VSRP-001, PMIP-001, SDCP-001, PERSIST-001',
    ['VSRP-001', 'PMIP-001', 'SDCP-001', 'PERSIST-001'].every((p) =>
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

  /* ── SEC-02: Structural Linter ─────────────────────────────────────── */
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
    changes: [{ type: 'replace_text', path: 'combat.js', search: 'x', content: 'y' }],
    expectedInvariants: [],
    testsRequested: [],
    requiredCapabilities: [],
  };
  check(
    'validateProposalShape rejects wrong schemaVersion',
    Engine.validateProposalShape(badProposal).some((e) =>
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
    Engine.validateProposalShape(pathTraversalProposal).some((e) =>
      e.includes('unsafe path traversal')
    )
  );

  /* ── SEC-03: Governor Initialization & Lifecycle ────────────────────── */
  console.log('\n[SEC-03] Layer 2: Governor Initialization & Lifecycle');
  const gov = new Engine.Governor();
  check('Governor starts in NEW state', gov.diagnostics().lifecycle === 'NEW');

  await gov.initialize();
  check('Governor moves to READY state after initialize()', gov.diagnostics().lifecycle === 'READY');

  // Register a target
  gov.spec.registerTarget('combat/SEC-10', {
    tenant: 'Combat',
    path: 'combat.js',
    allowedOperations: ['MODIFY'],
    capabilities: [],
    dependencies: [],
  });
  check(
    'spec target registered',
    gov.spec.targets.has('combat/SEC-10')
  );

  // Register source
  gov.registerSource('combat.js', 'function runCombat() { return 100; }');
  check(
    'getSource returns initial content',
    gov.getSource('combat.js') === 'function runCombat() { return 100; }'
  );

  // Register test
  gov.spec.registerTest('test-combat-pass', (_state, _ctx, sources) => {
    return sources.get('combat.js').content.includes('200');
  });

  // Grant capability
  gov.grant('agent-1', 'combat/SEC-10', 'MODIFY');
  check(
    'Capability granted',
    gov.capabilities.has('agent-1', 'Combat.MODIFY', 'combat/SEC-10')
  );

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
    testsRequested: ['test-combat-pass'],
    requiredCapabilities: [],
  };

  const receipt = await gov.submit(validProposal, 'agent-1');
  check(
    'Valid proposal passes with status PASS',
    receipt.status === 'PASS',
    `got status: ${receipt.status}`
  );
  check(
    'Receipt has deterministic integrity hash',
    typeof receipt.integrity === 'string' && receipt.integrity.length === 8
  );
  check(
    'Source updated on PASS',
    gov.getSource('combat.js') === 'function runCombat() { return 200; }'
  );

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
    testsRequested: ['test-combat-pass'],
    requiredCapabilities: [],
  };

  const failReceipt = await gov.submit(failingProposal, 'agent-1');
  check(
    'Failing test causes REJECTED status at BEHAVIOR_GATE',
    failReceipt.status === 'REJECTED' &&
    failReceipt.gate === 'BEHAVIOR_GATE',
    `got status: ${failReceipt.status}, gate: ${failReceipt.gate}`
  );
  check(
    'Source rolled back on test failure',
    gov.getSource('combat.js') === 'function runCombat() { return 200; }'
  );

  /* ── SEC-04: Receipt Ledger & Integrity ────────────────────────────── */
  console.log('\n[SEC-04] Layer 3: Receipt Ledger');
  const receipts = gov.getReceipts();
  check(
    'Ledger contains 2 receipts',
    receipts.length === 2,
    `got ${receipts.length}`
  );
  check(
    'Receipts have distinct receipt IDs',
    receipts[0].receiptId !== receipts[1].receiptId
  );
  check(
    'Receipt authority is PHOENIX-DETERMINISTIC-GOVERNOR',
    receipts[0].authority === 'PHOENIX-DETERMINISTIC-GOVERNOR'
  );

  /* ── SEC-05: WebLLMWorkerBridge API surface ────────────────────────── */
  console.log('\n[SEC-05] PhoenixWebLLMWorkerBridge API surface');
  const BridgeClass = context.window.PhoenixWebLLMWorkerBridge;
  check('PhoenixWebLLMWorkerBridge is defined', Boolean(BridgeClass));
  const bridge = new BridgeClass();
  check(
    'bridge has start, generate, destroy',
    typeof bridge.start === 'function' &&
    typeof bridge.generate === 'function' &&
    typeof bridge.destroy === 'function'
  );
  check('bridge.isReady is false before start()', bridge.isReady === false);

  const proposalParser = context.window.phoenixProposalParser;
  check('phoenixProposalParser is defined', typeof proposalParser === 'function');
  check(
    'proposalParser extracts JSON from markdown fence',
    (() => {
      try {
        const res = proposalParser(
          'Here is the fix:\n```json\n{"schemaVersion":"PGE-DSL-1","target":"x"}\n```'
        );
        return res.schemaVersion === 'PGE-DSL-1';
      } catch (_) {
        return false;
      }
    })()
  );

  /* ── SEC-06: PhoenixMonolithExporter API surface ────────────────────── */
  console.log('\n[SEC-06] PhoenixMonolithExporter API surface');
  const Exporter = context.window.PhoenixMonolithExporter;
  check('PhoenixMonolithExporter is defined', Boolean(Exporter));
  check(
    'exportMonolith is a function',
    typeof Exporter.exportMonolith === 'function'
  );
  check(
    'exportMonolithAsync is a function',
    typeof Exporter.exportMonolithAsync === 'function'
  );
  check(
    'EMPTY_WASM_BASE64 is a non-empty string',
    typeof Exporter.EMPTY_WASM_BASE64 === 'string' &&
    Exporter.EMPTY_WASM_BASE64.length > 0
  );
  check(
    'DEFAULT_WGSL is a non-empty string',
    typeof Exporter.DEFAULT_WGSL === 'string' && Exporter.DEFAULT_WGSL.length > 0
  );
  check(
    'MONOLITH_FORMAT is correct',
    Exporter.MONOLITH_FORMAT === 'PHOENIX-MONOLITH-2'
  );

  /* ── SEC-07: Monolith export output structure ───────────────────────── */
  console.log('\n[SEC-07] Monolith export output');
  const monolithHtml = Exporter.exportMonolith({
    title: 'Test Monolith',
    sources: [{ path: 'src/combat.js', content: 'function f() { return 1; }' }],
    wasmKernels: [{ name: 'test.wasm', base64: Exporter.EMPTY_WASM_BASE64 }],
    shaders: [{ name: 'test.wgsl', source: Exporter.DEFAULT_WGSL }],
    receipts: [],
  });
  check('exportMonolith returns a string', typeof monolithHtml === 'string');
  check(
    'monolith contains <!doctype html>',
    monolithHtml.startsWith('<!doctype html>')
  );
  check(
    'monolith contains PhoenixMonolithManifest',
    monolithHtml.includes('PhoenixMonolithManifest')
  );
  check(
    'monolith contains window.exportMonolith',
    monolithHtml.includes('window.exportMonolith')
  );
  check(
    'monolith contains WASM loader',
    monolithHtml.includes('PhoenixWasmKernels')
  );
  check(
    'monolith has title Test Monolith',
    monolithHtml.includes('>Test Monolith<')
  );

  /* ── SEC-08: hash & stable determinism ─────────────────────────────── */
  console.log('\n[SEC-08] Hash and stable() determinism');
  const obj1 = { b: 2, a: 1 };
  const obj2 = { a: 1, b: 2 };
  check(
    'stable() is key-order independent',
    Engine.stable(obj1) === Engine.stable(obj2)
  );
  check(
    'hash() produces 8-char hex string',
    Engine.hash('hello').length === 8 && /^[0-9a-f]+$/.test(Engine.hash('hello'))
  );
  const hashRef1 = Engine.hash('phoenix');
  const hashRef2 = Engine.hash('phoenix');
  const hashOther = Engine.hash('other');
  check(
    'hash() is deterministic',
    hashRef1 === hashRef2 && hashRef1 !== hashOther
  );

  /* ── SEC-09: Watchdog, Framebuffer & Fault Localization ─────────────── */
  console.log('\n[SEC-09] Watchdog, Framebuffer & Fault Localization');
  
  // 1. Framebuffer Hashing & Validation
  const dummyPixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const fbHash = Engine.computeFramebufferHash(dummyPixels);
  check('computeFramebufferHash produces valid 8-char hex string', typeof fbHash === 'string' && fbHash.length === 8);
  
  const fbResult = Engine.validateFramebufferSignature(
    (ctx, w, h) => {
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
  } catch (err) {
    timeoutCaught = err.message.includes('timed out');
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

  /* ── SEC-10: Procedural Audio Synthesizer & Code Generator ─────────── */
  console.log('\n[SEC-10] Procedural Audio Synthesizer & Code Generator');
  const AudioSynth = Engine.PhoenixAudioSynthesizer;
  check('PhoenixAudioSynthesizer is defined', Boolean(AudioSynth));
  check('PRESETS contains 8 canonical retro sound types', Object.keys(AudioSynth.PRESETS).length === 8);
  check(
    'PRESETS has LASER, EXPLOSION, JUMP, HIT, COIN, POWERUP, FOOTSTEP, DEFLECT',
    ['LASER', 'EXPLOSION', 'JUMP', 'HIT', 'COIN', 'POWERUP', 'FOOTSTEP', 'DEFLECT'].every(
      (k) => Boolean(AudioSynth.PRESETS[k])
    )
  );
  
  // Standalone code generator
  const standaloneCode = AudioSynth.generateSFXCode(AudioSynth.PRESETS.LASER, 'standalone');
  check('generateSFXCode emits standalone function', standaloneCode.includes('function playLaserSFX(') && standaloneCode.includes('exponentialRampToValueAtTime'));
  
  // EventBus code generator
  const eventBusCode = AudioSynth.generateSFXCode(AudioSynth.PRESETS.EXPLOSION, 'eventbus', 'BOSS_DEFEATED');
  check('generateSFXCode emits EventBus listener', eventBusCode.includes("EmberlightEventBus.subscribe('BOSS_DEFEATED'") && eventBusCode.includes('PhoenixAudioSynthesizer.playProceduralSFX'));

  // Noise buffer generation mock
  const mockAudioCtx = {
    sampleRate: 44100,
    createBuffer: (channels, length, rate) => ({
      getChannelData: () => new Float32Array(length),
    }),
  };
  /* ── SEC-11: Workstation Substrate: IntelliSense, Fuzzy, Diff, Runtime ── */
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
  check('SymbolIndexer resolves function definition', defDamage.length > 0 && defDamage[0].file === 'battle.js' && defDamage[0].line === 7);
  check('SymbolIndexer extracts JSDoc comment', defDamage[0].jsdoc.includes('Calculates combat damage'));

  const defClass = indexer.findDefinition('BattleEngine');
  check('SymbolIndexer resolves class definition', defClass.length > 0 && defClass[0].type === 'class');

  const completions = indexer.getCompletions('calc');
  check('SymbolIndexer returns completions matching prefix', completions.length === 1 && completions[0].name === 'calculateDamage');

  indexer.removeFile('battle.js');
  check('SymbolIndexer purges file symbols on removeFile', indexer.findDefinition('calculateDamage').length === 0);

  // 2. Fuzzy Search
  const fuzzy = Engine.PhoenixFuzzySearch;
  check('PhoenixFuzzySearch scores exact match highest', fuzzy.score('combat', 'combat') === 1000);
  check('PhoenixFuzzySearch scores prefix matches high', fuzzy.score('comb', 'combat.js') >= 800);
  check('PhoenixFuzzySearch handles camelCase boundary matches', fuzzy.score('pge', 'phoenixGovernorEngine') > 0);
  
  const filesList = ['src/combat.js', 'src/render.js', 'src/audio_synth.js'];
  const filtered = fuzzy.filter('aud', filesList);
  check('PhoenixFuzzySearch filters and ranks list', filtered.length === 1 && filtered[0] === 'src/audio_synth.js');

  // 3. Search Engine
  const searchEngine = Engine.PhoenixSearchEngine;
  const sampleDoc = 'const damage = 100;\nconst maxDamage = 200;\nconst damage = 300;';
  const allMatches = searchEngine.findAll(sampleDoc, 'damage', { wholeWord: true });
  check('PhoenixSearchEngine finds whole word matches with lines/cols', allMatches.length === 2 && allMatches[0].line === 1 && allMatches[1].line === 3);

  const replaced = searchEngine.replaceAll(sampleDoc, 'damage', 'power', { wholeWord: true });
  check('PhoenixSearchEngine replaces matching tokens', replaced.count === 2 && replaced.text.includes('const power = 100;'));

  // 4. Chunk Diff Engine
  const diffEngine = Engine.PhoenixChunkDiffEngine;
  const oldDoc = 'line 1\nline 2\nline 3\nline 4\nline 5';
  const newDoc = 'line 1\nline 2 MODIFIED\nline 3\nline 4\nline 5';
  const hunks = diffEngine.computeHunks(oldDoc, newDoc);
  check('PhoenixChunkDiffEngine computes diff hunks', hunks.length === 1 && hunks[0].delLines.length === 1 && hunks[0].addLines.length === 1);

  const applied = diffEngine.applyHunk(oldDoc, hunks[0]);
  check('PhoenixChunkDiffEngine applies selective hunk', applied === newDoc);

  const reverted = diffEngine.rejectHunk(newDoc, hunks[0]);
  check('PhoenixChunkDiffEngine rejects selective hunk', reverted === oldDoc);

  // 5. Runtime Sandbox
  const sandbox = Engine.PhoenixRuntimeSandbox;
  const vfsMap = new Map([
    ['index.html', '<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>'],
    ['game.js', 'console.log("game initialized");'],
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

  /* ── SEC-12: Tri-Engine Graphics Substrate ─────────────────────────── */
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
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1]
  ];
  const mockPalette = { 1: '#00ffcc' };
  const renderedTileCount = canvasEngine.renderTilemap(
    { fillStyle: '', fillRect: () => {} },
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
  check('Raycaster detects wall collision distance', rayHits[16].distance > 0 && rayHits[16].hitTile === 1);

  const sprites = [{ x: 2.5, y: 1.5, id: 'chest' }];
  const projSprites = raycaster.projectSprites(sprites, player, Math.PI / 3, 640, 480);
  check('Raycaster projects billboarded sprites in 3D camera space', projSprites.length === 1 && projSprites[0].distance > 0);

  /* ── SEC-13: 3D Fast Voxel DDA Engine & Chunk Volumes ──────────────── */
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
  check('castRay3D detects 3D voxel intersection with accurate face', ddaRay.hit && ddaRay.x === 2 && ddaRay.y === 1 && ddaRay.z === 3 && ddaRay.face === 'north' && ddaRay.normal[2] === -1);

  const dungeonVol = voxelEngine.generateDungeonVolume(12, 6, 12);
  check('generateDungeonVolume carves floor, ceiling and boundary walls', dungeonVol.data.length === 12 * 6 * 12 && voxelEngine.getVoxel(dungeonVol, 0, 0, 0) === 1);

  /* ── SEC-14: Procedural Terrain Raymarcher & Code Studio Substrate ───── */
  console.log('\n[SEC-14] Procedural Terrain Raymarcher & Code Studio Substrate');
  const terrainEngine = Engine.PhoenixTerrainRaymarcher;
  check('PhoenixTerrainRaymarcher is defined', Boolean(terrainEngine));

  const elevation = terrainEngine.sampleHeight(10, 20);
  check('sampleHeight calculates non-negative elevation', elevation >= 0.5);

  const norm = terrainEngine.computeNormal(10, 20);
  const normLen = Math.hypot(norm[0], norm[1], norm[2]);
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


  /* =========================================================================
   * SUMMARY
   * ========================================================================= */
  const totalChecks = passed + failed;
  console.log(`\n${'─'.repeat(60)}`);
  if (failed === 0) {
    console.log(`=== PHOENIX SUBSTRATE AUDIT 100% SUCCESS: ${passed}/${totalChecks} CHECKS PASSED ===`);
    process.exit(0);
  } else {
    console.error(`=== PHOENIX SUBSTRATE AUDIT FAILED: ${passed}/${totalChecks} PASSED, ${failed} FAILED ===`);
    process.exit(1);
  }
})();
