const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const HTML_PATH = path.join(__dirname, '..', 'phoenix', 'core_governor.html');
const { SynarcheCompiler, SynarcheLexer, SynarcheParser, ERRORS } = require('../phoenix/synarche_parser.js');
const { buildMachineDiagnosticEnvelope, buildDiagnosticDebugPrompt, SOVEREIGN_ENGINE_CONSTITUTION } = require('../phoenix/webllm_worker_bridge.js');

test('Phase 1: Dual-Compiler Diagnostics Engine & Smart Quick-Fix Verification', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');

	await t.test('SynarcheCompiler.lint catches ERR_0x17 (Hot loop allocation)', () => {
		const dsl = `
@cartridge "HotLoopTest"
@version "1.0.0"
capabilities { CAP_RENDER_CANVAS2D }
memory PERSIST_001 {
  tickCount: u32;
}
on update(tick, input) {
  const tempObj = new Object();
}
`;
		const diags = SynarcheCompiler.lint(dsl);
		assert.ok(diags.length > 0, 'Must flag hot loop allocation');
		const err17 = diags.find(d => d.rule === 'ERR_0x17' || d.message.includes('ERR_0x17'));
		assert.ok(err17, 'Must discover ERR_0x17 in update block');
	});

	await t.test('SynarcheCompiler.lint catches ERR_0x16 (Faraday violation)', () => {
		const dsl = `
@cartridge "FaradayTest"
@version "1.0.0"
capabilities { CAP_RENDER_CANVAS2D }
memory PERSIST_001 {
  tickCount: u32;
}
on configure(ctx) {
  window.location.reload();
}
`;
		const diags = SynarcheCompiler.lint(dsl);
		assert.ok(diags.length > 0, 'Must flag Faraday global access');
		const err16 = diags.find(d => d.rule === 'ERR_0x16' || d.message.includes('ERR_0x16'));
		assert.ok(err16, 'Must discover ERR_0x16 for window access');
	});

	await t.test('SynarcheCompiler.lint catches ERR_0x13 (Memory overrun > 1952B)', () => {
		const dsl = `
@cartridge "MemoryOverflow"
@version "1.0.0"
capabilities { CAP_RENDER_CANVAS2D }
memory PERSIST_001 {
  giantArray: f64[300];
}
`;
		const diags = SynarcheCompiler.lint(dsl);
		assert.ok(diags.length > 0, 'Must flag memory capacity overrun');
		const err13 = diags.find(d => d.rule === 'ERR_0x13' || d.message.includes('ERR_0x13'));
		assert.ok(err13, 'Must discover ERR_0x13 when memory exceeds 1952 bytes');
	});

	await t.test('core_governor.html contains rich Synarche Quick-Fix handlers', () => {
		assert.ok(html.includes('_applySynarcheHotLoopFix'), 'Must define _applySynarcheHotLoopFix');
		assert.ok(html.includes('_applySynarcheFaradayFix'), 'Must define _applySynarcheFaradayFix');
		assert.ok(html.includes('_inspectSynarcheMemory'), 'Must define _inspectSynarcheMemory');
	});
});

test('Phase 2: Action Toolbar Transpilation & FSA Physical Disk Bridge', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');

	await t.test('DOM-06 contains btn-compile-cartridge and btn-transpile-stcp', () => {
		assert.ok(html.includes('id="btn-compile-cartridge"'), 'DOM-06 must include btn-compile-cartridge');
		assert.ok(html.includes('id="btn-transpile-stcp"'), 'Tools menu must include btn-transpile-stcp');
	});

	await t.test('Alt+C keyboard shortcut is wired for _transpileActiveCartridge', () => {
		assert.ok(html.includes("e.altKey && e.key.toLowerCase() === 'c'"), 'Must bind Alt+C to transpile');
	});

	await t.test('_transpileActiveCartridge performs compilation and disk sync', () => {
		assert.ok(html.includes("compiler.compile(code, { format: 'IIFE' })"), 'Must compile with IIFE format');
		assert.ok(html.includes('_writeDiskFile(targetJsPath, res.code)'), 'Must sync to physical disk via FSA API');
		assert.ok(html.includes('_renderProblemsPanel(_currentDiagnostics)'), 'Must render diagnostics on compilation failure');
	});

	await t.test('_updateEditorView dynamically toggles compile button', () => {
		assert.ok(html.includes('_isSynarcheFile(_activeFilePath)'), 'Must check active file type');
		assert.ok(html.includes("compileBtn.style.display = isSyn ? 'inline-block' : 'none'"), 'Must toggle compileBtn display');
	});
});

test('Phase 3: Machine Context Envelope for Local AI (Antigravity Copilot)', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');

	await t.test('buildMachineDiagnosticEnvelope formats compact, targeted prompt envelope', () => {
		const sourceCode = `
line 1
line 2
line 3
const bad = new Object();
line 5
line 6
`;
		const diags = [
			{ rule: 'ERR_0x17', message: 'Hot-loop allocation forbidden', line: 4, col: 13, severity: 'err' }
		];
		const options = {
			symbols: [ { name: 'update', kind: 'fn' }, { name: 'tickCount', kind: 'sym' } ],
			erlMatch: { searchPattern: 'new Object()', replacePattern: '{}' },
			memoryLayout: { totalBytes: 8, fields: [ { name: 'tickCount', type: 'u32', offset: 0 } ] }
		};

		const envelope = buildMachineDiagnosticEnvelope('cartridge.phx', sourceCode, diags, 4, options);
		assert.ok(envelope.includes('[ANTIGRAVITY TELEMETRY SENSOR ENVELOPE: VLT-003]'), 'Must include Antigravity header');
		assert.ok(envelope.includes('Target: cartridge.phx @ Line 4'), 'Must include target file and active line');
		assert.ok(envelope.includes('fn:update sym:tickCount'), 'Must include symbols');
		assert.ok(envelope.includes('PERSIST-001 HEAP: 8/1952B (1 fields)'), 'Must include memory telemetry');
		assert.ok(envelope.includes('ERR_0x17'), 'Must list failing invariants');
		assert.ok(envelope.includes('ERL-001 TEMPLATE:'), 'Must include ERL template directive');
		assert.ok(envelope.includes('const bad = new Object();'), 'Must include code snippet');
	});

	await t.test('buildMachineDiagnosticEnvelope eliminates constitutional token dump (>65% reduction)', () => {
		const longCode = Array.from({ length: 60 }, (_, i) => `const val_${i} = ${i};`).join('\n');
		const diags = [ { rule: 'ERR_0x17', message: 'Hot loop allocation', line: 30, col: 1, severity: 'err' } ];

		const standardPrompt = buildDiagnosticDebugPrompt('large_file.js', longCode, diags, 30);
		const machineEnvelope = buildMachineDiagnosticEnvelope('large_file.js', longCode, diags, 30);

		assert.ok(!machineEnvelope.includes(SOVEREIGN_ENGINE_CONSTITUTION), 'Must NOT contain full constitutional text dump');
		assert.ok(machineEnvelope.length < standardPrompt.length * 0.35, 'Must achieve >65% reduction in character count');
	});

	await t.test('core_governor.html defines _getDiagnosticTelemetryContext', () => {
		assert.ok(html.includes('function _getDiagnosticTelemetryContext('), 'Must define _getDiagnosticTelemetryContext');
		assert.ok(html.includes('_symbolIndexer'), 'Must extract symbols from _symbolIndexer');
		assert.ok(html.includes('_erl.findMatch'), 'Must look up ERL remediation template');
		assert.ok(html.includes('compiler.parse(source, { mode: \'SLOPPY\' })'), 'Must parse AST memoryLayout');
	});

	await t.test('core_governor.html wires buildMachineDiagnosticEnvelope into AI pipelines', () => {
		assert.ok(html.includes('buildMachineDiagnosticEnvelope(_activeFilePath, source, [ diag ]'), 'Must wire into _debugAndFixDiagnostic');
		assert.ok(html.includes('buildMachineDiagnosticEnvelope(_activeFilePath, intermediateSource, remainingDiags'), 'Must wire into _runBatchLLMSandboxLoop');
		assert.ok(html.includes('buildMachineDiagnosticEnvelope(_activeFilePath, source, failures, undefined, telemetryCtx)'), 'Must wire into _generateAIProposal retry');
	});

	await t.test('_generateAIProposal includes sandbox verification gate', () => {
		assert.ok(html.includes('const verification = _runAISandboxVerification(source, proposal, _activeFilePath)'), 'Must run sandbox verification gate');
		assert.ok(html.includes('_applyAISandboxRepair'), 'Must stage verified repairs');
	});
});

test('Phase 4: Live Viewport Cartridge Injector & Zero-State Hotswapper', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');
	const { PhoenixErrorResolutionLedger } = require('../phoenix/phoenix_sovereign_engine.js');

	await t.test('core_governor.html implements live cartridge runner harness in [SEC-14]', () => {
		assert.ok(html.includes('function _mountCartridgeToStudio('), 'Must define _mountCartridgeToStudio');
		assert.ok(html.includes('function _unmountCartridgeFromStudio('), 'Must define _unmountCartridgeFromStudio');
		assert.ok(html.includes('function _mountActiveCartridge('), 'Must define _mountActiveCartridge');
		assert.ok(html.includes('window._mountCartridgeToStudio = _mountCartridgeToStudio'), 'Must export _mountCartridgeToStudio on window');
		assert.ok(html.includes('cmd_mount_active_cartridge'), 'Must register mount command in Command Palette');
	});

	await t.test('_transpileActiveCartridge auto-mounts compiled cartridge into studio', () => {
		assert.ok(html.includes('_mountCartridgeToStudio(res.code, res.ast?.name)'), 'Must call _mountCartridgeToStudio on compilation');
	});

	await t.test('PERSIST-001 Zero-State Preservation survives simulated hotswap', () => {
		const dslV1 = `
@cartridge "HotswapTest"
@version "1.0.0"
capabilities { CAP_RENDER_CANVAS2D }
memory PERSIST_001 {
  playerScore: u32;
  posX: f32;
}
on update(tick, input) {
  this.memory.playerScore += 10;
}
`;
		const resV1 = SynarcheCompiler.compile(dslV1, { format: 'IIFE' });
		assert.ok(resV1.ok);

		// Execute V1 in sandbox
		const sandboxV1 = { console, Math, Uint8Array, ArrayBuffer, DataView };
		sandboxV1.globalThis = sandboxV1;
		sandboxV1.window = sandboxV1;
		const vm = require('node:vm');
		vm.createContext(sandboxV1);
		new vm.Script(resV1.code).runInContext(sandboxV1);

		const cartV1 = sandboxV1.HotswapTest;
		cartV1.configure({ requestLinearMemory: (b) => new ArrayBuffer(b) });
		cartV1.boot(null);
		cartV1.activate();

		// Mutate state during gameplay
		cartV1.memory.playerScore = 550;
		cartV1.memory.posX = 142.5;

		// 1. Snapshot linear heap
		const savedHeap = cartV1.serialize();
		assert.ok(savedHeap instanceof Uint8Array);
		assert.ok(savedHeap.length > 0);
		cartV1.suspend();
		cartV1.destroy();

		// 2. Transpile updated cartridge V2 (modified game logic)
		const dslV2 = `
@cartridge "HotswapTest"
@version "2.0.0"
capabilities { CAP_RENDER_CANVAS2D }
memory PERSIST_001 {
  playerScore: u32;
  posX: f32;
}
on update(tick, input) {
  this.memory.playerScore += 20;
}
`;
		const resV2 = SynarcheCompiler.compile(dslV2, { format: 'IIFE' });
		assert.ok(resV2.ok);

		const sandboxV2 = { console, Math, Uint8Array, ArrayBuffer, DataView };
		sandboxV2.globalThis = sandboxV2;
		sandboxV2.window = sandboxV2;
		vm.createContext(sandboxV2);
		new vm.Script(resV2.code).runInContext(sandboxV2);

		const cartV2 = sandboxV2.HotswapTest;
		cartV2.configure({ requestLinearMemory: (b) => new ArrayBuffer(b) });
		cartV2.boot(null);
		cartV2.activate();

		// 3. Zero-State Hotswap restoration
		cartV2.deserialize(savedHeap);

		// 4. Assert exact state restored
		assert.equal(cartV2.memory.playerScore, 550, 'Score must be preserved across hotswap');
		assert.equal(cartV2.memory.posX, 142.5, 'Position must be preserved across hotswap');

		// 5. Update with new V2 logic (+20)
		cartV2.update({ deltaTime: 0.016, elapsedTime: 1.0 }, { isDown: () => false });
		assert.equal(cartV2.memory.playerScore, 570, 'New mechanics must apply seamlessly on top of preserved state');
	});

	await t.test('Error Resolution Ledger (ERL-001) catalog records ERL-26 and ERL-27', () => {
		const erlAgentPath = path.join(__dirname, '..', '.agent', 'skills', 'error-resolution-ledger', 'SKILL.md');
		const erlAgentsPath = path.join(__dirname, '..', '.agents', 'skills', 'error-resolution-ledger', 'SKILL.md');
		const dtsPath = path.join(__dirname, '..', 'phoenix', 'phoenix.d.ts');

		const erlAgentContent = fs.readFileSync(erlAgentPath, 'utf8');
		const erlAgentsContent = fs.readFileSync(erlAgentsPath, 'utf8');
		const dtsContent = fs.readFileSync(dtsPath, 'utf8');

		assert.ok(erlAgentContent.includes('[ERL-26]'), '.agent SKILL.md must contain [ERL-26]');
		assert.ok(erlAgentContent.includes('[ERL-27]'), '.agent SKILL.md must contain [ERL-27]');
		assert.ok(erlAgentsContent.includes('[ERL-26]'), '.agents SKILL.md must contain [ERL-26]');
		assert.ok(erlAgentsContent.includes('[ERL-27]'), '.agents SKILL.md must contain [ERL-27]');

		assert.ok(dtsContent.includes('VSRPCartridgeFacade'), 'phoenix.d.ts must declare VSRPCartridgeFacade');
		assert.ok(dtsContent.includes('_mountCartridgeToStudio'), 'phoenix.d.ts must declare _mountCartridgeToStudio');

		const ledger = new PhoenixErrorResolutionLedger();
		const hotswapSeed = ledger.lookup('VSRP/HOTSWAP_HEAP_OVERFLOW');
		const bloatSeed = ledger.lookup('AI/PROMPT_CONSTITUTIONAL_BLOAT');
		assert.ok(hotswapSeed, 'PhoenixErrorResolutionLedger must include VSRP/HOTSWAP_HEAP_OVERFLOW seed');
		assert.ok(bloatSeed, 'PhoenixErrorResolutionLedger must include AI/PROMPT_CONSTITUTIONAL_BLOAT seed');
	});
});


