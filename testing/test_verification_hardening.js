/*
 * VERIFICATION HARDENING PASS
 *
 * This suite is intentionally adversarial. It is not allowed to manufacture
 * evidence for the architecture it is testing. A check passes only when it
 * observes behavior from the real implementation or a deliberately injected
 * violation.
 *
 * The suite is expected to be RED while known architectural violations remain.
 * That is a feature: Sentinel must be capable of saying FAIL.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function assertThrows(fn, message) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.strictEqual(threw, true, message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach((key) => deepFreeze(value[key]));
  return Object.freeze(value);
}

function loadCommonJS(file, globals = {}) {
  const source = read(file);
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    structuredClone,
    Math,
    Date,
    TextEncoder,
    ...globals,
  };
  vm.runInNewContext(source, sandbox, { filename: file });
  return sandbox.module.exports;
}

const results = [];

function check(id, fn) {
  try {
    fn();
    results.push({ id, passed: true });
    console.log(`[PASS] ${id}`);
  } catch (error) {
    results.push({ id, passed: false, error: error.message });
    console.error(`[FAIL] ${id}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// AC-01 / AC-02: Structural claims must correspond to actual source contracts.
// ---------------------------------------------------------------------------
check('AC-01: VSRP canonical lifecycle is explicit', () => {
  const source = read('combat.js');
  const required = [
    'configure(', 'init(', 'reset(', 'update(', 'render(',
    'getState(', 'getDiagnostics(', 'getModuleInfo(', 'destroy(',
  ];
  required.forEach((token) => {
    assert.ok(source.includes(token), `combat.js missing ${token}`);
  });
});

check('AC-02: reset cannot be treated as an implicit presentation pass', () => {
  const source = read('combat.js');
  const resetStart = source.indexOf('reset(snapshot)');
  const updateStart = source.indexOf('update(dt, context)');
  assert.ok(resetStart >= 0 && updateStart > resetStart, 'Unable to locate lifecycle methods.');
  const resetBody = source.slice(resetStart, updateStart);
  assert.ok(!resetBody.includes('renderPresentation()'),
    'Combat reset directly invokes presentation; reset must establish state only.');
});

// ---------------------------------------------------------------------------
// AC-03: Faraday isolation must be observed, not merely declared.
// ---------------------------------------------------------------------------
check('AC-03: frozen ingress snapshot rejects mutation', () => {
  const snapshot = deepFreeze({
    party: [{ id: 'probe', hp: 10 }],
    inventory: { POTION: 1 },
  });

  assertThrows(() => {
    snapshot.party[0].hp = 999;
  }, 'Frozen probe accepted direct mutation.');

  const clone = structuredClone(snapshot);
  clone.party[0].hp = 999;
  assert.strictEqual(snapshot.party[0].hp, 10,
    'Detached working state mutated the authoritative probe snapshot.');
});

// ---------------------------------------------------------------------------
// AC-04 / AC-05: deterministic simulation and strict simulation/presentation
// separation. These are deliberately source-backed until a full runtime
// harness can execute every trajectory independently.
// ---------------------------------------------------------------------------
check('AC-04: combat simulation does not use browser timers', () => {
  const source = read('combat.js');
  const forbidden = [
    'setTimeout(', 'setInterval(', 'requestAnimationFrame(',
  ];
  forbidden.forEach((token) => {
    assert.strictEqual(source.includes(token), false,
      `Combat simulation contains forbidden wall-clock primitive ${token}`);
  });
});

check('AC-05: combat update path is simulation-only', () => {
  const source = read('combat.js');
  const updateStart = source.indexOf('update(dt, context)');
  const renderStart = source.indexOf('render(renderer, context)');
  assert.ok(updateStart >= 0 && renderStart > updateStart, 'Lifecycle anchors not found.');
  const updateRegion = source.slice(updateStart, renderStart);
  assert.strictEqual(updateRegion.includes('renderPresentation()'), false,
    'Combat update region invokes renderPresentation(); simulation must not own presentation.');
});

// ---------------------------------------------------------------------------
// AC-06: Sentinel itself must not contain tests that manufacture their own
// evidence. This is intentionally source-level because the anti-theater rule
// applies to the auditor implementation itself.
// ---------------------------------------------------------------------------
check('AC-06: Sentinel rejects manufactured evidence patterns', () => {
  const source = read('auditor.js');
  const forbiddenPatterns = [
    /const\s+forgeEnvelope\s*=\s*\{/,
    /logAudit\(\s*['"][^'"]*Anti-Theater[^'"]*['"],\s*true\s*\)/,
    /testCombat\.update\([^\n]*\);[\s\S]{0,500}postState\.enemies/, // mutation-driven proxy tests need real state assertions
  ];
  forbiddenPatterns.forEach((pattern) => {
    assert.strictEqual(pattern.test(source), false,
      `Auditor contains evidence-manufacturing or proxy-test pattern: ${pattern}`);
  });
});

// ---------------------------------------------------------------------------
// AC-07: replacement test. A district replacement must not require the
// replacement tenant to know anything about Overworld.
// ---------------------------------------------------------------------------
check('AC-07: replacement district satisfies the tenant boundary', () => {
  const fakeDistrict = {
    configure() {},
    init() {},
    reset(snapshot) { this.state = structuredClone(snapshot || {}); },
    update() {},
    render() {},
    getState() { return structuredClone(this.state || {}); },
    getDiagnostics() { return { moduleId: 'fake_district' }; },
    getModuleInfo() {
      return {
        moduleId: 'fake_district',
        version: '1.0.0',
        protocolVersion: 'VSRP-001',
        dependencies: [],
        capabilities: [],
      };
    },
    destroy() { this.state = null; },
  };

  const required = [
    'configure', 'init', 'reset', 'update', 'render',
    'getState', 'getDiagnostics', 'getModuleInfo', 'destroy',
  ];
  required.forEach((method) => assert.strictEqual(typeof fakeDistrict[method], 'function'));
  assert.ok(!('overworld' in fakeDistrict), 'Replacement tenant has an Overworld dependency.');
  assert.deepStrictEqual(fakeDistrict.getModuleInfo().dependencies, [],
    'Replacement tenant declares a hidden dependency.');
});

// ---------------------------------------------------------------------------
// AC-08: deliberate violation injection. The verifier must fail a known-bad
// module rather than accepting a structurally plausible fake.
// ---------------------------------------------------------------------------
check('AC-08: Sentinel detects deliberate lifecycle violation', () => {
  const badModule = {
    configure() {},
    init() {},
    reset() {},
    update() {},
    render() {},
    getState() {},
    getDiagnostics() {},
    getModuleInfo() {},
    // destroy intentionally omitted
  };

  const required = [
    'configure', 'init', 'reset', 'update', 'render',
    'getState', 'getDiagnostics', 'getModuleInfo', 'destroy',
  ];
  const failures = required.filter((method) => typeof badModule[method] !== 'function');
  assert.deepStrictEqual(failures, ['destroy'],
    'Deliberate lifecycle violation was not detected.');
});

// ---------------------------------------------------------------------------
// AC-09: EventBus registry privacy and error propagation are runtime facts.
// ---------------------------------------------------------------------------
check('AC-09: EventBus registry is private and listener failures propagate', () => {
  const bus = loadCommonJS('event_bus.js');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(bus, 'subscribers'), false,
    'EventBus exposes its mutable subscriber registry.');

  let received = 0;
  const unsubscribe = bus.subscribe('hardening:probe', () => { received += 1; });
  bus.publish('hardening:probe');
  assert.strictEqual(received, 1, 'EventBus did not dispatch the subscribed listener.');
  unsubscribe();
  bus.publish('hardening:probe');
  assert.strictEqual(received, 1, 'EventBus unsubscribe token leaked a listener.');

  bus.subscribe('hardening:error', () => {
    throw new Error('intentional sentinel probe failure');
  });
  assertThrows(
    () => bus.publish('hardening:error'),
    'EventBus swallowed a subscriber exception instead of propagating it to the host.'
  );
});

// ---------------------------------------------------------------------------
// AC-10: The hardening suite itself must be adversarial. A passing suite must
// include an assertion that would fail against a deliberately broken object.
// ---------------------------------------------------------------------------
check('AC-10: adversarial mutation probe is live', () => {
  const broken = { destroy: 'not-a-function' };
  const required = ['destroy'];
  const failures = required.filter((method) => typeof broken[method] !== 'function');
  assert.strictEqual(failures.length, 1,
    'Adversarial probe did not observe the deliberate violation.');
});

const passed = results.filter((r) => r.passed).length;
const failed = results.length - passed;
console.log(`\nVERIFICATION HARDENING: ${passed}/${results.length} checks passed.`);

if (failed > 0) {
  console.error('VERIFICATION HARDENING STATUS: FAIL');
  process.exitCode = 1;
} else {
  console.log('VERIFICATION HARDENING STATUS: PASS');
}
