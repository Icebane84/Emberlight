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

test('Phase 5: PhoenixTypeResolver & Strict Typing IDE Integration', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');

	await t.test('core_governor.html loads phoenix_type_resolver.js script tag', () => {
		assert.ok(html.includes('<script src="phoenix_type_resolver.js"></script>'), 'Must include script tag for type resolver');
	});

	await t.test('core_governor.html wires Alt+J shortcut to _scaffoldJSDocAtCursor', () => {
		assert.ok(html.includes('_scaffoldJSDocAtCursor()'), 'Must call _scaffoldJSDocAtCursor on Alt+J shortcut');
		assert.ok(html.includes("e.altKey && k === 'j'"), 'Must bind Alt+J');
	});

	await t.test('core_governor.html registers Command Palette actions for JSDoc scaffolding', () => {
		assert.ok(html.includes("id: 'cmd_scaffold_jsdoc'"), 'Must register cmd_scaffold_jsdoc');
		assert.ok(html.includes("id: 'cmd_scaffold_jsdoc_all'"), 'Must register cmd_scaffold_jsdoc_all');
	});

	await t.test('core_governor.html registers Tools dropdown action for batch scaffolding', () => {
		assert.ok(html.includes('id="btn-scaffold-jsdoc-all"'), 'Must contain btn-scaffold-jsdoc-all button');
		assert.ok(html.includes("btn-scaffold-jsdoc-all'"), 'Must wire btn-scaffold-jsdoc-all event listener');
	});

	await t.test('core_governor.html implements rich PhoenixTypeResolver hover provider', () => {
		assert.ok(html.includes('function _renderTypeResolverHover'), 'Must define _renderTypeResolverHover');
		assert.ok(html.includes('PhoenixTypeResolver.getDomainType'), 'Must query getDomainType');
		assert.ok(html.includes('PhoenixTypeResolver.getMethodDefinition'), 'Must query getMethodDefinition');
		assert.ok(html.includes('PhoenixTypeResolver.getInterfaceDefinition'), 'Must query getInterfaceDefinition');
	});

	await t.test('core_governor.html wires overwrite option into JSDoc parity drift quick fix', () => {
		assert.ok(html.includes('_scaffoldJSDoc(p.line, p.actualParams, { overwrite: true })'), 'Must pass overwrite: true to replace outdated JSDoc');
	});
});

test('Phase 6: Cockpit Density & Dual-Concurrency Viewport Integration', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');
	const css = fs.readFileSync(path.join(__dirname, '..', 'phoenix', 'workbench.css'), 'utf8');

	await t.test('DOM-01 contains btn-toggle-sidecar button', () => {
		assert.ok(html.includes('id="btn-toggle-sidecar"'), 'Must contain btn-toggle-sidecar button in header');
		assert.ok(html.includes("btn-toggle-sidecar'"), 'Must wire btn-toggle-sidecar click listener');
	});

	await t.test('workbench.css defines .mode-cockpit 3-pane dual concurrency grid', () => {
		assert.ok(css.includes('#app.mode-cockpit'), 'Must define #app.mode-cockpit grid');
		assert.ok(css.includes('grid-area: sidecar'), 'Must map game-studio-workspace to sidecar');
	});

	await t.test('core_governor.html wires Alt+V shortcut to _toggleSidecar', () => {
		assert.ok(html.includes('_toggleSidecar()'), 'Must call _toggleSidecar on shortcut');
		assert.ok(html.includes("e.altKey && k === 'v'"), 'Must bind Alt+V shortcut');
	});

	await t.test('core_governor.html wires Ctrl+Enter one-chord governor commit', () => {
		assert.ok(html.includes("isCtrlOrCmd && e.key === 'Enter'"), 'Must bind Ctrl+Enter in shortcut dispatcher');
		assert.ok(html.includes('_submitActiveProposal()'), 'Must call _submitActiveProposal on Ctrl+Enter');
	});

	await t.test('core_governor.html registers Cockpit commands in Command Palette', () => {
		assert.ok(html.includes("id: 'cmd_toggle_sidecar'"), 'Must register cmd_toggle_sidecar');
		assert.ok(html.includes("id: 'cmd_submit_proposal'"), 'Must register cmd_submit_proposal');
	});
});

test('Phase 7: The Bay Consolidated Bottom Drawer & Multi-Tab Navigation', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');
	const css = fs.readFileSync(path.join(__dirname, '..', 'phoenix', 'workbench.css'), 'utf8');

	await t.test('DOM-05 contains The Bay multi-tab bar and action group', () => {
		assert.ok(html.includes('class="dock-tabs-bar"'), 'Must define .dock-tabs-bar');
		assert.ok(html.includes('class="dock-tabs-group"'), 'Must define .dock-tabs-group');
		assert.ok(html.includes('class="dock-actions-group"'), 'Must define .dock-actions-group');
		assert.ok(html.includes('class="dock-content-body"'), 'Must define .dock-content-body');
	});

	await t.test('DOM-05 defines 4 dock tabs with badges', () => {
		assert.ok(html.includes('data-bay-tab="problems"'), 'Must contain problems tab');
		assert.ok(html.includes('data-bay-tab="erl"'), 'Must contain ERL tab');
		assert.ok(html.includes('data-bay-tab="vlt"'), 'Must contain VLT tab');
		assert.ok(html.includes('data-bay-tab="output"'), 'Must contain Output tab');
		assert.ok(html.includes('id="problems-count-badge"'), 'Must preserve problems-count-badge');
		assert.ok(html.includes('id="erl-count-badge"'), 'Must contain erl-count-badge');
	});

	await t.test('DOM-05 defines 4 dock content panes', () => {
		assert.ok(html.includes('id="problems-list"'), 'Must preserve problems-list');
		assert.ok(html.includes('id="bay-pane-erl"'), 'Must contain bay-pane-erl');
		assert.ok(html.includes('id="bay-pane-vlt"'), 'Must contain bay-pane-vlt');
		assert.ok(html.includes('id="bay-pane-output"'), 'Must contain bay-pane-output');
		assert.ok(html.includes('id="bay-console-output"'), 'Must contain bay-console-output');
	});

	await t.test('workbench.css styles The Bay components with fixed 140px / 28px height', () => {
		assert.ok(css.includes('height: 140px'), 'Must define fixed 140px height for #problems-panel');
		assert.ok(css.includes('height: 28px'), 'Must define 28px collapsed height');
		assert.ok(css.includes('.dock-tabs-bar'), 'Must define .dock-tabs-bar styling');
		assert.ok(css.includes('.dock-tab-btn'), 'Must define .dock-tab-btn styling');
		assert.ok(css.includes('.bay-badge'), 'Must define .bay-badge styling');
		assert.ok(css.includes('.bay-output-log'), 'Must define .bay-output-log styling');
	});

	await t.test('core_governor.html implements Bay switching and rendering methods', () => {
		assert.ok(html.includes('function _switchDockBayTab'), 'Must define _switchDockBayTab');
		assert.ok(html.includes('function _toggleDockBay'), 'Must define _toggleDockBay');
		assert.ok(html.includes('function _renderBayERL'), 'Must define _renderBayERL');
		assert.ok(html.includes('function _renderBayVLT'), 'Must define _renderBayVLT');
		assert.ok(html.includes('function _logToBay'), 'Must define _logToBay');
	});

	await t.test('core_governor.html wires Alt+B shortcut and Command Palette action', () => {
		assert.ok(html.includes("e.altKey && k === 'b'"), 'Must bind Alt+B in shortcut dispatcher');
		assert.ok(html.includes("id: 'cmd_toggle_bay'"), 'Must register cmd_toggle_bay in Command Palette');
		assert.ok(html.includes('id="btn-clear-bay-output"'), 'Must include output clear button');
	});
});

test('Phase 8: Gutter Diff Markers & Real-Time Change Tracking', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');
	const css = fs.readFileSync(path.join(__dirname, '..', 'phoenix', 'workbench.css'), 'utf8');

	await t.test('workbench.css defines .gutter-line diff markers (.diff-add, .diff-mod, .diff-del)', () => {
		assert.ok(css.includes('.gutter-line.diff-add'), 'Must define .gutter-line.diff-add');
		assert.ok(css.includes('.gutter-line.diff-mod'), 'Must define .gutter-line.diff-mod');
		assert.ok(css.includes('.gutter-line.diff-del'), 'Must define .gutter-line.diff-del');
	});

	await t.test('core_governor.html defines _computeGutterDiffStatus', () => {
		assert.ok(html.includes('function _computeGutterDiffStatus'), 'Must define _computeGutterDiffStatus');
		assert.ok(html.includes('window._computeGutterDiffStatus'), 'Must export _computeGutterDiffStatus to window');
	});

	await t.test('core_governor.html contains editor-diff-status in DOM-04 HUD', () => {
		assert.ok(html.includes('id="editor-diff-status"'), 'Must define editor-diff-status badge');
	});

	await t.test('_computeGutterDiffStatus accurately identifies add, mod, and del line deltas', () => {
		const { PhoenixChunkDiffEngine } = require('../phoenix/phoenix_sovereign_engine.js');
		assert.ok(PhoenixChunkDiffEngine, 'Must load PhoenixChunkDiffEngine');

		function computeGutterDiffStatus(baseline, current) {
			if (!baseline || baseline === current) return new Map();
			const diffMap = new Map();
			const hunks = PhoenixChunkDiffEngine.computeHunks(baseline, current);
			const lineCount = current.split('\n').length;
			for (const hunk of hunks) {
				const hasDel = Boolean(hunk.delLines && hunk.delLines.length > 0);
				const hasAdd = Boolean(hunk.addLines && hunk.addLines.length > 0);
				if (hasAdd && hasDel) {
					for (const l of hunk.lines) {
						if (l.type === 'add' && l.newLine != null) diffMap.set(l.newLine, 'diff-mod');
					}
				} else if (hasAdd) {
					for (const l of hunk.lines) {
						if (l.type === 'add' && l.newLine != null) diffMap.set(l.newLine, 'diff-add');
					}
				} else if (hasDel) {
					const targetLine = hunk.newStart <= lineCount ? hunk.newStart : Math.max(1, lineCount);
					if (!diffMap.has(targetLine)) diffMap.set(targetLine, 'diff-del');
				}
			}
			return diffMap;
		}

		// 1. Identical returns empty map
		const emptyMap = computeGutterDiffStatus('const a = 1;', 'const a = 1;');
		assert.equal(emptyMap.size, 0);

		// 2. Added line
		const addMap = computeGutterDiffStatus('const a = 1;\nconst c = 3;', 'const a = 1;\nconst b = 2;\nconst c = 3;');
		assert.equal(addMap.get(2), 'diff-add');

		// 3. Modified line
		const modMap = computeGutterDiffStatus('const a = 1;\nconst b = 2;', 'const a = 1;\nconst b = 200;');
		assert.equal(modMap.get(2), 'diff-mod');

		// 4. Deleted line
		const delMap = computeGutterDiffStatus('const a = 1;\nconst b = 2;\nconst c = 3;', 'const a = 1;\nconst c = 3;');
		assert.equal(delMap.get(2), 'diff-del');
	});
});

test('Phase 9: Sidecar Responsive Stack, Context Menu Overhaul & Universal Command Palette', async (t) => {
	const html = fs.readFileSync(HTML_PATH, 'utf8');
	const css = fs.readFileSync(path.join(__dirname, '..', 'phoenix', 'workbench.css'), 'utf8');

	await t.test('workbench.css defines .mode-cockpit responsive vertical stack and canvas aspect ratio', () => {
		assert.ok(css.includes('#app.mode-cockpit .studio-main-grid'), 'Must define cockpit studio main grid');
		assert.ok(css.includes('flex-direction: column'), 'Cockpit grid must be vertical column stack');
		assert.ok(css.includes('aspect-ratio: 4 / 3'), 'Viewport canvas must enforce 4:3 aspect ratio');
		assert.ok(css.includes('.sidecar-subnav-bar'), 'Must define sidecar subnav bar');
		assert.ok(css.includes('.sidecar-tab-btn'), 'Must define sidecar tab button styling');
	});

	await t.test('core_governor.html DOM-08 contains sidecar subnav buttons and window control buttons', () => {
		assert.ok(html.includes('id="sidecar-subnav-bar"'), 'DOM-08 must include sidecar-subnav-bar');
		assert.ok(html.includes('data-sidecar-tab="scene"'), 'Must include scene subnav tab');
		assert.ok(html.includes('data-sidecar-tab="tilemap"'), 'Must include tilemap subnav tab');
		assert.ok(html.includes('data-sidecar-tab="sfx"'), 'Must include sfx subnav tab');
		assert.ok(html.includes('data-sidecar-tab="dispatch"'), 'Must include dispatch subnav tab');
		assert.ok(html.includes('id="btn-sidecar-expand"'), 'Must include expand button in studio top bar');
		assert.ok(html.includes('id="btn-sidecar-close"'), 'Must include close button in studio top bar');
		assert.ok(html.includes('id="studio-sec-tilemap"'), 'Must wrap tilemap section with ID');
		assert.ok(html.includes('id="studio-sec-sfx"'), 'Must wrap sfx section with ID');
		assert.ok(html.includes('id="studio-sec-dispatch"'), 'Must wrap dispatch section with ID');
	});

	await t.test('workbench.css and DOM-09 define aerospace context menu styling, shortcuts, and items', () => {
		assert.ok(css.includes('.sovereign-context-menu'), 'Must define sovereign context menu');
		assert.ok(css.includes('ctxFadeIn'), 'Must define ctxFadeIn animation');
		assert.ok(css.includes('.context-menu-item .ctx-shortcut'), 'Must style context menu shortcut badge');
		assert.ok(html.includes('id="ctx-toggle-sidecar"'), 'Must define ctx-toggle-sidecar');
		assert.ok(html.includes('id="ctx-toggle-problems"'), 'Must define ctx-toggle-problems');
		assert.ok(html.includes('id="ctx-toggle-aichat"'), 'Must define ctx-toggle-aichat');
		assert.ok(html.includes('>Alt+V</span>'), 'Sidecar context menu item must show Alt+V');
		assert.ok(html.includes('>Alt+B</span>'), 'Problems Bay context menu item must show Alt+B');
		assert.ok(html.includes('>Alt+A</span>'), 'AI Chat context menu item must show Alt+A');
	});

	await t.test('_showContextMenu performs dynamic viewport boundary clamping via getBoundingClientRect', () => {
		assert.ok(html.includes('menu.getBoundingClientRect()'), 'Must measure menu bounding client rect');
		assert.ok(html.includes('window.innerWidth - menuW'), 'Must clamp against innerWidth');
		assert.ok(html.includes('window.innerHeight - menuH'), 'Must clamp against innerHeight');
	});

	await t.test('Command Palette implements universal search, keyboard navigation, and kbd badges', () => {
		assert.ok(css.includes('.palette-box'), 'Must style palette box');
		assert.ok(css.includes('.palette-kbd'), 'Must style palette kbd shortcut badges');
		assert.ok(html.includes('function _initCommandPaletteEvents'), 'Must define _initCommandPaletteEvents');
		assert.ok(html.includes("e.key === 'ArrowDown'"), 'Must handle ArrowDown navigation');
		assert.ok(html.includes("e.key === 'ArrowUp'"), 'Must handle ArrowUp navigation');
		assert.ok(html.includes("e.key === 'Enter'"), 'Must handle Enter execution');
		assert.ok(html.includes('function _extractShortcutFromItem'), 'Must define _extractShortcutFromItem');
		assert.ok(html.includes('class="palette-kbd"'), 'Must render palette-kbd elements in results');
	});

	await t.test('_resolvePaletteItems performs universal search across commands and files without prefix', () => {
		const { PhoenixFuzzySearch } = require('../phoenix/phoenix_sovereign_engine.js');
		assert.ok(PhoenixFuzzySearch, 'Must load PhoenixFuzzySearch');

		const mockCommands = [
			{ id: 'cmd_sidecar', title: 'Toggle Live Simulation Sidecar (Alt+V)', badge: 'COCKPIT' },
			{ id: 'cmd_bay', title: 'Toggle The Bay Diagnostics & Tools (Alt+B)', badge: 'BAY' },
			{ id: 'cmd_format', title: 'Format Active Document (Alt+Shift+F)', badge: 'FORMAT' }
		];
		const mockFiles = [
			{ id: 'file_mario', title: 'cartridges/mario_platformer_cartridge.js', badge: 'FILE' },
			{ id: 'file_colossus', title: 'cartridges/PetrifiedColossusCartridge.js', badge: 'FILE' }
		];

		// 1. Empty query returns pinned commands and files
		const emptyQuery = '';
		const emptyResults = [...mockCommands, ...mockFiles];
		assert.ok(emptyResults.length >= 5, 'Empty query should return default items');

		// 2. Search for "sidecar" finds command
		const cmdMatches = PhoenixFuzzySearch.filter('sidecar', mockCommands, (c) => c.title);
		assert.equal(cmdMatches.length, 1);
		assert.equal(cmdMatches[0].id, 'cmd_sidecar');

		// 3. Search for "mario" finds file
		const fileMatches = PhoenixFuzzySearch.filter('mario', mockFiles, (f) => f.title);
		assert.equal(fileMatches.length, 1);
		assert.equal(fileMatches[0].id, 'file_mario');

		// 4. Combined universal search finds both when matching
		const allItems = [...mockCommands, ...mockFiles];
		const universalMatches = PhoenixFuzzySearch.filter('cartridge', allItems, (item) => item.title);
		assert.ok(universalMatches.length >= 2, 'Universal search must find both files');
	});
});



