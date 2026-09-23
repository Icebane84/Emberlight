/**
 * @fileoverview Test Suite for STCP-001 Synarche Parser & GUCA Emitter
 * Protocols: STCP-001 / VSRP-001 / PERSIST-001 / SDCP-001
 * Authority: Host SSOT | Transduction Compiler Verification
 */
'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const { SynarcheCompiler, SynarcheLexer, SynarcheParser, GUCAEmitter, ERRORS } = require('../synarche_parser.js');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       STCP-001 SYNARCHE PARSER & GUCA EMITTER TEST SUITE      ║');
console.log('║       Protocols: STCP-001 / VSRP-001 / PERSIST-001           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let passCount = 0;

function it(desc, fn) {
	try {
		fn();
		console.log(`  ✓ ${desc}`);
		passCount++;
	} catch (err) {
		console.error(`  ✗ FAIL: ${desc}`);
		console.error(err);
		process.exit(1);
	}
}

// ── Plane 1: Lexer Tests ───────────────────────────────────────────────────

it('Plane 1: SynarcheLexer tokenizes directives, symbols, and keywords', () => {
	const src = `@cartridge "TestCartridge"\n@version "1.0.0"\ncapabilities { CAP_RENDER_CANVAS2D }`;
	const tokens = SynarcheLexer.tokenize(src);
	assert.ok(tokens.length >= 6);
	assert.equal(tokens[0].type, 'DIRECTIVE');
	assert.equal(tokens[0].value, '@cartridge');
	assert.equal(tokens[1].type, 'LITERAL_STRING');
	assert.equal(tokens[1].value, 'TestCartridge');
});

it('Plane 1: SynarcheLexer disambiguates comments and numeric literals', () => {
	const src = `// comment\n/* block */ 120.5 -50 0xFF`;
	const tokens = SynarcheLexer.tokenize(src);
	const nums = tokens.filter(t => t.type === 'LITERAL_NUMBER');
	assert.equal(nums.length, 3);
	assert.equal(nums[0].value, '120.5');
	assert.equal(nums[1].value, '-50');
	assert.equal(nums[2].value, '0xFF');
});

// ── Plane 2: Parser & AST Invariants ────────────────────────────────────────

const CANONICAL_DSL_FIXTURE = `
@cartridge "TheDescent"
@version "1.0.0"
@author "Synarche Sovereign Foundry"
@tier 2

capabilities {
    CAP_RENDER_CANVAS2D,
    CAP_AUDIO_SYNTH,
    CAP_INPUT_FIFO
}

memory PERSIST_001 {
    depth: f32;
    descentRate: f32;
    fuelLevel: u16;
    hullIntegrity: u8;
    score: u32;
}

state {
    isActive: boolean = false;
    lightRadius: float32 = 120.0;
    hazardCount: int32 = 0;
}

on configure(ctx) {
    this.state.isActive = true;
}

on update(tick, input) {
    if (!this.state.isActive) return;
    this.memory.depth += 1.0;
}

on render(ctx) {
    ctx.drawGlow(this.memory.depth, this.state.lightRadius);
}
`;

it('Plane 2: SynarcheParser generates complete structured AST', () => {
	const tokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	const { ast, errors } = parser.parse();

	assert.equal(errors.length, 0);
	assert.equal(ast.name, 'TheDescent');
	assert.equal(ast.version, '1.0.0');
	assert.equal(ast.tier, 2);
	assert.deepEqual(ast.capabilities, ['CAP_RENDER_CANVAS2D', 'CAP_AUDIO_SYNTH', 'CAP_INPUT_FIFO']);

	// Memory layout check
	assert.equal(ast.memoryLayout.fields.length, 5);
	assert.equal(ast.memoryLayout.fields[0].name, 'depth');
	assert.equal(ast.memoryLayout.fields[0].offset, 0);
	assert.equal(ast.memoryLayout.fields[1].name, 'descentRate');
	assert.equal(ast.memoryLayout.fields[1].offset, 4);
	assert.equal(ast.memoryLayout.totalBytes, 15); // 4 + 4 + 2 + 1 + 4 = 15

	// State fields check
	assert.equal(ast.state.length, 3);
	assert.equal(ast.state[0].name, 'isActive');

	// Lifecycle handlers check
	assert.ok(ast.handlers.has('configure'));
	assert.ok(ast.handlers.has('update'));
	assert.ok(ast.handlers.has('render'));
});

it('Plane 2: Rejects memory declarations exceeding PERSIST_001 capacity (ERR_0x13)', () => {
	const hugeMemoryDsl = `
@cartridge "HugeMemory"
memory PERSIST_001 {
    giantArray: f64[300]; // 300 * 8 = 2400 bytes > 1952 bytes payload
}
`;
	const tokens = SynarcheLexer.tokenize(hugeMemoryDsl);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	assert.throws(() => {
		parser.parse();
	}, (err) => {
		return err.message.includes('ERR_0x13');
	});
});

it('Plane 2: Detects state variable collisions across mixins (ERR_0x12)', () => {
	const collisionDsl = `
@cartridge "CollisionTest"
state {
    health: int32 = 100;
}
mixin CombatMixin {
    state {
        health: int32;
    }
}
use mixin CombatMixin;
`;
	const tokens = SynarcheLexer.tokenize(collisionDsl);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	assert.throws(() => {
		parser.parse();
	}, (err) => {
		return err.message.includes('ERR_0x12');
	});
});

it('Plane 2: Fault-tolerant SLOPPY mode captures errors without throwing', () => {
	const invalidDsl = `
@cartridge "SloppyTest"
memory PERSIST_001 {
    brokenField: invalidType;
}
`;
	const tokens = SynarcheLexer.tokenize(invalidDsl);
	const parser = new SynarcheParser(tokens, { mode: 'SLOPPY' });
	const { errors } = parser.parse();
	assert.ok(errors.length > 0);
});

// ── Plane 3: GUCA Emitter & VSRP-001 Cartridge Execution ───────────────────

it('Plane 3: GUCA Emitter synthesizes all 9 canonical VSRP-001 methods', () => {
	const tokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	const { ast } = parser.parse();
	const code = GUCAEmitter.emit(ast, { format: 'IIFE' });

	assert.ok(code.includes('configure(ctx)'));
	assert.ok(code.includes('boot(canvas)'));
	assert.ok(code.includes('activate()'));
	assert.ok(code.includes('update(temporalTick, input)'));
	assert.ok(code.includes('render(ctx)'));
	assert.ok(code.includes('suspend()'));
	assert.ok(code.includes('serialize()'));
	assert.ok(code.includes('deserialize(buffer)'));
	assert.ok(code.includes('destroy()'));
	assert.ok(code.includes('_pevmProvenance'));
});

it('Plane 3: Emitted Cartridge compiles and executes cleanly in isolated vm.Context', () => {
	const res = SynarcheCompiler.compile(CANONICAL_DSL_FIXTURE);
	assert.ok(res.ok);
	assert.ok(res.code);

	const sandbox = { console, Math, Uint8Array, ArrayBuffer, DataView };
	sandbox.globalThis = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	const script = new vm.Script(res.code);
	script.runInContext(sandbox);

	const cartridge = sandbox.TheDescent;
	assert.ok(cartridge, 'TheDescent must be bound on global scope');
	assert.equal(cartridge.protocol, 'VSRP-001');
	assert.equal(cartridge.name, 'TheDescent');

	// Exercise 9-Method lifecycle
	cartridge.configure({ requestLinearMemory: (b) => new ArrayBuffer(b) });
	assert.equal(cartridge.state.isActive, true);

	cartridge.boot(null);
	cartridge.activate();

	// Test memory accessors & update delta
	cartridge.memory.depth = 42.5;
	assert.equal(cartridge.memory.depth, 42.5);

	const delta = cartridge.update({ deltaTime: 0.016, elapsedTime: 1.0 }, { isDown: () => false });
	assert.equal(delta.protocol, 'VSRP-001');
	assert.equal(cartridge.memory.depth, 43.5);

	// Test serialize / deserialize roundtrip
	const serialized = cartridge.serialize();
	assert.ok(serialized instanceof Uint8Array);
	assert.ok(serialized.length > 0);

	cartridge.memory.depth = 0;
	cartridge.deserialize(serialized);
	assert.equal(cartridge.memory.depth, 43.5);

	cartridge.suspend();
	cartridge.destroy();
});

it('Plane 2: Catches Faraday isolation violations (ERR_0x16)', () => {
	const breachDsl = `
@cartridge "FaradayBreach"
on update {
    window.location.href = "https://evil.com";
}
`;
	const diags = SynarcheCompiler.lint(breachDsl);
	assert.ok(diags.some(d => d.rule.includes('ERR_0x16')), 'Must catch window global Faraday breach');
});

it('Plane 2: Detects transient hot-loop allocations (ERR_0x17) and verifies SynarcheCompiler.lint()', () => {
	const hotLoopAllocDsl = `
@cartridge "HotLoopAlloc"
on update {
    const tempObj = new Object();
}
`;
	const diags = SynarcheCompiler.lint(hotLoopAllocDsl);
	assert.ok(diags.some(d => d.rule.includes('ERR_0x17')), 'Must catch new Object allocation in update handler');
	assert.ok(diags[0].line >= 1);
	assert.ok(diags[0].severity === 'err');
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`STCP SYNARCHE PARSER AUDIT: ${passCount}/${passCount} CHECKS PASSED`);
console.log(`✨ 100% CLEAN TRANSDUCTION: ZERO SYNTAX OR SEMANTIC DRIFT ✨\n`);
