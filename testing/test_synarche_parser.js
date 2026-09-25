/**
 * @fileoverview Test Suite for STCP-001 Synarche Parser & GUCA Emitter
 * Protocols: STCP-001 / VSRP-001 / PERSIST-001 / SDCP-001
 * Authority: Host SSOT | Transduction Compiler Verification
 */
'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
	SynarcheCompiler,
	SynarcheLexer,
	SynarcheParser,
	GUCAEmitter,
	SynarcheAdmissionAuthority,
	CONSTITUTIONAL_RULE_REGISTRY,
	SynarcheASTFactory,
	SynarcheStatementParser,
	SynarcheTypeSystem,
	SynarcheTypeEnvironment,
	SynarcheTypeInferenceEngine,
	ERRORS
} = require('../synarche_parser.js');

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

// ── Plane 2.5: STCP-002 Constitutional Admission Authority Tests ───────────

it('Plane 2.5: SynarcheAdmissionAuthority issues sealed ConstitutionalReceipt on compliant AST', () => {
	const tokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	const { ast, receipt } = parser.parse();

	assert.ok(receipt, 'Receipt must be generated');
	assert.equal(receipt.status, 'ADMITTED');
	assert.equal(receipt.constitutionId, 'PHOENIX_SOVEREIGN_CONSTITUTION');
	assert.equal(receipt.protocolVersion, 'VSRP-001');
	assert.ok(receipt.astHash.startsWith('0x'));
	assert.equal(receipt.errors.length, 0);
	assert.ok(receipt.passedRules.includes('VSRP-001.LIFECYCLE'));
	assert.ok(receipt.passedRules.includes('PERSIST-001.CAPACITY'));
	assert.ok(receipt.passedRules.includes('SDCP-001.FARADAY'));
	assert.ok(receipt.passedRules.includes('SDCP-001.CAPABILITIES'));
	assert.ok(receipt.passedRules.includes('INV-08.HOT_LOOP'));
	assert.ok(receipt.passedRules.includes('STCP-002.ADMISSION_SEAL'));
	assert.equal(ast.admissionReceipt, receipt);
});

it('Plane 2.5: GUCAEmitter rejects unadmitted AST with ERR_0x18 GUCA_EMISSION_DENIED (Fail-Closed)', () => {
	const unadmittedAst = {
		name: 'RogueCartridge',
		version: '1.0.0',
		author: 'Unknown',
		tier: 2,
		capabilities: [],
		memoryLayout: { fields: [], totalBytes: 0 },
		state: [],
		handlers: new Map([['update', { params: [], body: 'window.alert(1);' }]]),
		mixins: new Map(),
		usedMixins: [],
		eventHandlers: []
	};

	assert.throws(() => {
		GUCAEmitter.emit(unadmittedAst, { format: 'IIFE' });
	}, (err) => {
		return err.message.includes('ERR_0x18') && err.message.includes('GUCA_EMISSION_DENIED');
	}, 'GUCAEmitter must fail closed when emitting AST without valid admission proof');
});

it('Plane 2.5: SynarcheAdmissionAuthority rejects non-compliant AST in receipt', () => {
	const rogueAst = {
		name: 'BadMemory',
		version: '1.0.0',
		author: 'Rogue',
		tier: 2,
		capabilities: [],
		memoryLayout: { fields: [], totalBytes: 9999 }, // Exceeds 1952B limit
		state: [],
		handlers: new Map(),
		mixins: new Map(),
		usedMixins: [],
		eventHandlers: []
	};

	const receipt = SynarcheAdmissionAuthority.admit(rogueAst, ['ERR_0x16: FARADAY_CAPABILITY_VIOLATION']);
	assert.equal(receipt.status, 'REJECTED');
	assert.ok(receipt.failedRules.includes('PERSIST-001.CAPACITY'));
	assert.ok(receipt.failedRules.includes('SDCP-001.FARADAY'));
	assert.ok(receipt.failedRules.includes('STCP-002.ADMISSION_SEAL'));
});

it('Plane 3: Emitted Cartridge embeds runtime admission proof in metadata', () => {
	const res = SynarcheCompiler.compile(CANONICAL_DSL_FIXTURE);
	assert.ok(res.ok);
	assert.ok(res.receipt);
	assert.equal(res.receipt.status, 'ADMITTED');

	const sandbox = { console, Math, Uint8Array, ArrayBuffer, DataView };
	sandbox.globalThis = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	const script = new vm.Script(res.code);
	script.runInContext(sandbox);

	const cartridge = sandbox.TheDescent;
	assert.ok(cartridge.admission, 'Runtime cartridge must expose admission proof metadata');
	assert.equal(cartridge.admission.status, 'ADMITTED');
	assert.ok(cartridge.admission.astHash.startsWith('0x'));
	assert.ok(cartridge.admission.passedRules.length >= 6);
});

it('Plane 2.5: GUCAEmitter rejects forged or tampered admission receipts (Anti-Spoofing Gate)', () => {
	const tokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	const { ast } = parser.parse();

	// Attacker attempts to pass a spoofed receipt claiming ADMITTED with a fake hash
	const forgedReceipt = {
		status: 'ADMITTED',
		constitutionId: 'PHOENIX_SOVEREIGN_CONSTITUTION',
		protocolVersion: 'VSRP-001',
		compilerVersion: '1.0.0-PRO',
		timestamp: Date.now(),
		astHash: '0xdeadbeef', // Mismatched hash
		capabilities: [],
		memoryBytesRequired: 0,
		passedRules: ['VSRP-001.LIFECYCLE'],
		failedRules: [],
		errors: []
	};

	assert.throws(() => {
		GUCAEmitter.emit(ast, { format: 'IIFE', admission: forgedReceipt });
	}, (err) => {
		return err.message.includes('ERR_0x18') && err.message.includes('hash mismatch');
	}, 'GUCAEmitter must detect forged receipt hash mismatch and fail closed');
});

it('Plane 2.5: Admitted CartridgeAST is deeply frozen against post-admission mutation', () => {
	const tokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	const { ast } = parser.parse();

	assert.ok(Object.isFrozen(ast), 'AST root must be frozen upon admission');
	assert.ok(Object.isFrozen(ast.state), 'AST state array must be frozen');
	assert.ok(Object.isFrozen(ast.capabilities), 'AST capabilities array must be frozen');
	assert.ok(Object.isFrozen(ast.memoryLayout), 'AST memoryLayout must be frozen');

	assert.throws(() => {
		// Attempt to mutate state array
		ast.state.push({ name: 'injected', type: 'boolean', defaultValue: 'true' });
	}, /Cannot add property|not extensible|read only/i, 'Mutating state on admitted AST must throw');
});

// ── Plane 1.5: STCP-003 Expression AST Factory & Recursive-Descent Parser ───

it('Plane 1.5: SynarcheASTFactory constructs canonical AST nodes', () => {
	const id = SynarcheASTFactory.identifier('velocity');
	assert.equal(id.type, 'Identifier');
	assert.equal(id.name, 'velocity');

	const lit = SynarcheASTFactory.literal(42, '42', 'number');
	assert.equal(lit.type, 'Literal');
	assert.equal(lit.value, 42);
	assert.equal(lit.literalType, 'number');

	const bin = SynarcheASTFactory.binaryExpr('+', id, lit);
	assert.equal(bin.type, 'BinaryExpr');
	assert.equal(bin.operator, '+');
	assert.equal(bin.left.type, 'Identifier');
	assert.equal(bin.right.type, 'Literal');

	const decl = SynarcheASTFactory.varDecl('let', 'speed', bin);
	assert.equal(decl.type, 'VarDecl');
	assert.equal(decl.kind, 'let');
	assert.equal(decl.name, 'speed');
	assert.equal(decl.init.type, 'BinaryExpr');
});

it('Plane 1.5: SynarcheStatementParser parses arithmetic precedence climbing (* / > + - > ==)', () => {
	const code = `let res = 2 + 3 * 4;`;
	const tokens = SynarcheLexer.tokenize(code).filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
	const parser = new SynarcheStatementParser(tokens);
	const stmts = parser.parseStatements();

	assert.equal(stmts.length, 1);
	const stmt = stmts[0];
	assert.equal(stmt.type, 'VarDecl');
	assert.equal(stmt.name, 'res');
	// In 2 + 3 * 4, root should be + with left 2 and right (3 * 4) because * has higher precedence than +
	assert.equal(stmt.init.type, 'BinaryExpr');
	assert.equal(stmt.init.operator, '+');
	assert.equal(stmt.init.left.value, 2);
	assert.equal(stmt.init.right.type, 'BinaryExpr');
	assert.equal(stmt.init.right.operator, '*');
	assert.equal(stmt.init.right.left.value, 3);
	assert.equal(stmt.init.right.right.value, 4);
});

it('Plane 1.5: SynarcheStatementParser respects parentheses overriding precedence', () => {
	const code = `let res = (2 + 3) * 4;`;
	const tokens = SynarcheLexer.tokenize(code).filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
	const parser = new SynarcheStatementParser(tokens);
	const stmts = parser.parseStatements();

	assert.equal(stmts.length, 1);
	const stmt = stmts[0];
	// In (2 + 3) * 4, root should be * with left (2 + 3) and right 4
	assert.equal(stmt.init.type, 'BinaryExpr');
	assert.equal(stmt.init.operator, '*');
	assert.equal(stmt.init.left.type, 'BinaryExpr');
	assert.equal(stmt.init.left.operator, '+');
	assert.equal(stmt.init.left.left.value, 2);
	assert.equal(stmt.init.left.right.value, 3);
	assert.equal(stmt.init.right.value, 4);
});

it('Plane 1.5: SynarcheStatementParser parses relational, logical, and unary precedence', () => {
	const code = `let flag = a + b > c * d && !e;`;
	const tokens = SynarcheLexer.tokenize(code).filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
	const parser = new SynarcheStatementParser(tokens);
	const stmts = parser.parseStatements();

	assert.equal(stmts.length, 1);
	const stmt = stmts[0];
	// Root should be && (prec 0)
	assert.equal(stmt.init.type, 'BinaryExpr');
	assert.equal(stmt.init.operator, '&&');
	// Left of && is a + b > c * d (relational > prec 1)
	assert.equal(stmt.init.left.type, 'BinaryExpr');
	assert.equal(stmt.init.left.operator, '>');
	assert.equal(stmt.init.left.left.operator, '+');
	assert.equal(stmt.init.left.right.operator, '*');
	// Right of && is !e (unary)
	assert.equal(stmt.init.right.type, 'UnaryExpr');
	assert.equal(stmt.init.right.operator, '!');
	assert.equal(stmt.init.right.argument.name, 'e');
});

it('Plane 1.5: SynarcheStatementParser parses control flow statements (IfStmt, WhileStmt, ReturnStmt)', () => {
	const code = `
		if (x > 10) {
			y = y + 1;
		} else {
			y = 0;
		}
		while (active) {
			tick();
		}
		return y;
	`;
	const tokens = SynarcheLexer.tokenize(code).filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
	const parser = new SynarcheStatementParser(tokens);
	const stmts = parser.parseStatements();

	assert.equal(stmts.length, 3);
	// 1. IfStmt
	assert.equal(stmts[0].type, 'IfStmt');
	assert.equal(stmts[0].test.operator, '>');
	assert.equal(stmts[0].consequent.type, 'BlockStmt');
	assert.equal(stmts[0].consequent.body[0].type, 'ExprStmt');
	assert.equal(stmts[0].consequent.body[0].expression.type, 'AssignExpr');
	assert.equal(stmts[0].alternate.type, 'BlockStmt');
	assert.equal(stmts[0].alternate.body[0].type, 'ExprStmt');
	assert.equal(stmts[0].alternate.body[0].expression.type, 'AssignExpr');

	// 2. WhileStmt
	assert.equal(stmts[1].type, 'WhileStmt');
	assert.equal(stmts[1].test.name, 'active');
	assert.equal(stmts[1].body.type, 'BlockStmt');
	assert.equal(stmts[1].body.body[0].type, 'ExprStmt');
	assert.equal(stmts[1].body.body[0].expression.type, 'CallExpr');

	// 3. ReturnStmt
	assert.equal(stmts[2].type, 'ReturnStmt');
	assert.equal(stmts[2].argument.name, 'y');
});

it('Plane 2: SynarcheParser parses handler blocks into structured AST statements while preserving raw body', () => {
	const tokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const parser = new SynarcheParser(tokens, { mode: 'STRICT' });
	const { ast } = parser.parse();

	const updateHandler = ast.handlers.get('update');
	assert.ok(updateHandler, 'update handler must exist');
	assert.ok(typeof updateHandler.body === 'string' && updateHandler.body.length > 0, 'updateHandler.body must remain string');
	assert.ok(Array.isArray(updateHandler.statements), 'updateHandler.statements must be populated');
	assert.ok(updateHandler.statements.length >= 2, 'updateHandler.statements should contain parsed statements');

	// Verify the statements contain structured nodes (such as assignments, member expressions)
	const hasAssign = updateHandler.statements.some(s => s.type === 'AssignExpr' || (s.type === 'ExprStmt' && s.expression?.type === 'AssignExpr'));
	assert.ok(hasAssign, 'updateHandler.statements must contain assignment AST node');
});

it('Plane 1.6: SynarcheTypeSystem unifies primitive types, type variables, and occurs check', () => {
	const ts = new SynarcheTypeSystem();
	const u32Type = ts.createPrimitive('u32');
	const f32Type = ts.createPrimitive('f32');
	const boolType = ts.createPrimitive('bool');

	// 1. Primitive unification
	assert.ok(ts.unify(u32Type, u32Type));
	// 2. Numeric compatibility promotion
	assert.ok(ts.unify(u32Type, f32Type));
	// 3. Type variable binding
	const tVar = ts.createVariable('T');
	assert.ok(ts.unify(tVar, boolType));
	assert.equal(ts.prune(tVar).name, 'bool');
	// 4. Occurs check prevents cyclic type
	const cyclicVar = ts.createVariable('C');
	const arrType = ts.createArray(cyclicVar);
	const errors = [];
	assert.equal(ts.unify(cyclicVar, arrType, null, errors), false);
	assert.ok(errors.some(e => e.includes('cyclic type')));
});

it('Plane 1.6: SynarcheTypeInferenceEngine infers expressions & detects type mismatch', () => {
	const ts = new SynarcheTypeSystem();
	const engine = new SynarcheTypeInferenceEngine(ts);
	const env = new SynarcheTypeEnvironment();

	// Test arithmetic inference
	const code = `let a = 10; let b = a + 5; let flag = a > 0 && true;`;
	const tokens = SynarcheLexer.tokenize(code).filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
	const parser = new SynarcheStatementParser(tokens);
	const stmts = parser.parseStatements();

	const errors = [];
	for (const stmt of stmts) {
		engine.infer(stmt, env, errors);
	}
	assert.equal(errors.length, 0);
	assert.equal(ts.prune(env.get('a')).name, 'number');
	assert.equal(ts.prune(env.get('b')).name, 'number');
	assert.equal(ts.prune(env.get('flag')).name, 'bool');
});

it('Plane 2.5: SynarcheAdmissionAuthority enforces STCP-002.TYPE_UNIFICATION on CartridgeAST', () => {
	// 1. Valid AST passes STCP-002.TYPE_UNIFICATION
	const validTokens = SynarcheLexer.tokenize(CANONICAL_DSL_FIXTURE);
	const validParser = new SynarcheParser(validTokens, { mode: 'STRICT' });
	const { receipt: validReceipt } = validParser.parse();

	assert.equal(validReceipt.status, 'ADMITTED');
	assert.ok(validReceipt.passedRules.includes('STCP-002.TYPE_UNIFICATION'));

	// 2. Type Mismatch AST is rejected
	const invalidDsl = CANONICAL_DSL_FIXTURE.replace(
		'this.state.isActive = true;',
		'this.state.isActive = "invalid_string_type";'
	);
	const invalidTokens = SynarcheLexer.tokenize(invalidDsl);
	const invalidParser = new SynarcheParser(invalidTokens, { mode: 'SLOPPY' });
	const { receipt: invalidReceipt } = invalidParser.parse();

	assert.equal(invalidReceipt.status, 'REJECTED');
	assert.ok(invalidReceipt.failedRules.includes('STCP-002.TYPE_UNIFICATION'));
	assert.ok(invalidReceipt.errors.some(e => e.includes('ERR_0x1A')));
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`STCP SYNARCHE PARSER AUDIT: ${passCount}/${passCount} CHECKS PASSED`);
console.log(`✨ 100% CLEAN TRANSDUCTION: ZERO SYNTAX OR SEMANTIC DRIFT ✨\n`);
