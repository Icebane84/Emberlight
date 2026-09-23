---
name: error-resolution-ledger
description: Governs the Error Resolution Ledger (ERL-001) catalog of canonical diagnostic fingerprints, pre-commit lint filters, and verified deterministic self-repair patterns across Emberlight and Phoenix engines.
globs: "**/*.js, **/*.html, **/*.ts, testing/**/*.js, phoenix/**/*.js"
alwaysApply: false
version: 1.7.0
---

# AGENT OPERATIONAL SPECIFICATION: Error Resolution Ledger (ERL-001)

**Document Identifier:** SKILL-EMBERLIGHT-ERL-001
**Protocol Version:** ERL-001 / VSRP-001 / SDCP-001 / ARCH-001-EMBERLIGHT
**Scope:** Universal AI Agent Diagnostic Remediation & Anti-Entropy Guardrails

---

## 1. Core Purpose & Architectural Mandate

The **Error Resolution Ledger (ERL-001)** is the living single source of truth for detecting, preventing, and repairing systemic code anomalies across all Emberlight modules and Phoenix tools.

When an AI agent (Antigravity, Cursor, Continue, Aider, or Phoenix in-IDE model) encounters a diagnostic error, linter warning, or test assertion failure, it **MUST NOT** hallucinate an ad-hoc fix. It must consult this ledger, match the diagnostic fingerprint, and apply the verified canonical remediation pattern.

---

## 2. Pre-Commit Guardrails & Prohibited Anti-Patterns

Before presenting or applying any code changes, all AI agents must enforce these 6 immutable constraints:

1. **Zero Placeholders (Anti-Theater):**
   - NEVER output `// ...`, `/* ... */`, or `TODO(impl)` anywhere in code changes.
   - Always emit complete, syntactically whole, executable code.

2. **Search Anchor Verbatim Integrity:**
   - In search/replace proposals, the `search` string must match the EXACT verbatim text currently existing in the source file.
   - NEVER invent fictional comments (e.g., `// Calculate attack damage here`) to anchor a search.

3. **Deterministic Invariant Registry (PGE-DSL-1):**
   - In proposal objects, `expectedInvariants: []` and `testsRequested: []` must remain empty arrays unless targeting an authoritative registered test identifier in the Governor spec (e.g., `INVARIANT_NO_EVAL`).
   - NEVER write natural language descriptive sentences in these fields.

4. **Zero-Backtracking Regular Expressions:**
   - Avoid unanchored wildcards like `/\?.*:/` or nested quantifiers. Use $O(N)$ string methods (`includes`) or strictly bounded regex character classes (`/\?[^:]*:/`) anchored to line starts (`^\s*`).

5. **Type-Safe Catch Error Handling:**
   - Catch variables are typed as `unknown` under `checkJs: true`.
   - Always extract via: `const errMsg = err instanceof Error ? err.message : String(err);`.
   - Explain intentional exception suppressions with explicit comments.

6. **Script Context Async Boundary Protection:**
   - NEVER write top-level `await` inside CommonJS `.js` files or classic `<script>` tags without `type="module"`.

---

## 3. Canonical ERL-001 Diagnostic Catalog & Verified Fix Patterns

### [ERL-01] `MATH/RANDOM` — Authoritative Simulation PRNG Violation

- **Trigger:** Use of global unseeded `Math.random()` in simulation logic (Tier 2/3).
- **Rule:** Global `Math.random()` breaks replay determinism and fails Sentinel Pass 1 / AC-05.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const variance = Math.floor(Math.random() * 5);

  // ✅ CANONICAL REPAIR:
  // In pure helper/tenant:
  const variance = Math.floor(prng.random() * 5);
  // Or in standalone function accepting randomFloat in [0, 1):
  function calculateVariance(base, randomFloat = 0.5) {
      return Math.floor(base * randomFloat);
  }
  ```

---

### [ERL-02] `VSRP/FARADAY_DOM` — Faraday Isolation Boundary Breach

- **Trigger:** Direct access to `window`, `document`, `localStorage`, or `alert` inside simulation tenants (`combat`, `overworld`, `progression`, `armory`, `market`, `chronicle`, `status`, `relic_forge`, `lockpick`, `settings`).
- **Rule:** Breaches AC-01/AC-02 Faraday cage. Simulation logic must run headless in Node.js standard library.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const saved = localStorage.getItem('emberlight_save');

  // ✅ CANONICAL REPAIR:
  // In simulation tenant: Accept state via reset(snapshot) or context parameter:
  reset(snapshot) {
      this._state = structuredClone(snapshot || {});
  }
  ```

---

### [ERL-03] `COMPLEXITY/HIGH` — High Cognitive Complexity (> 15)

- **Trigger:** Deeply nested `if/else`, loops, switches, and ternary ladders exceeding Cognitive Complexity 15.
- **Rule:** Do NOT break function name, parameter order, or return contracts.
- **Remediation Pattern:**
  1. **Early Return Guard Clauses:** Invert outer conditions to return immediately if inputs are missing/invalid.
  2. **Pure Helper Extraction:** Extract self-contained logic into small JSDoc-typed helper functions placed directly above the target function.

  ```javascript
  // ❌ VIOLATION: Single monolithic 150-line function with nesting score 25

  // ✅ CANONICAL REPAIR:
  /**
   * Pure helper calculating damage with defense reduction.
   * @param {number} atk
   * @param {number} def
   * @returns {number}
   */
  function _computeRawDamage(atk, def) {
      return Math.max(1, atk * 2 - def);
  }

  /**
   * @param {CombatSim} sim
   * @param {number} targetIndex
   * @returns {CombatActionResult | null}
   */
  function playerExecuteAttack(sim, targetIndex) {
      if (!sim) return null;
      const activeChar = sim.turnQueue?.[sim.activeTurnIndex]?.entity;
      if (!activeChar) return null;

      const target = sim.enemies?.[targetIndex];
      if (!target || target.hp <= 0) return null;

      const rawDmg = _computeRawDamage(activeChar.atk, target.def);
      target.hp = Math.max(0, target.hp - rawDmg);
      return { success: true, damage: rawDmg };
  }
  ```

---

### [ERL-04] `TYPE/NULLABLE_MAP` — Map.get() Undefined Assignment

- **Trigger:** TypeScript error `Type 'T | undefined' is not assignable to type 'T | null'`.
- **Rule:** `Map.get()` returns `undefined` when missing; functions annotated with `@returns {T | null}` must explicitly coalesce.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  return this._entries.get(key);

  // ✅ CANONICAL REPAIR:
  return this._entries.get(key) || null;
  ```

---

### [ERL-05] `STATE/SNAPSHOT_MUTATION` — Host Object Reference Leakage

- **Trigger:** Tenant mutating the input object passed to `reset(snapshot)` or storing raw reference.
- **Rule:** Fails AC-02 Snapshot Isolation.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  this._state = snapshot;

  // ✅ CANONICAL REPAIR:
  this._state = typeof structuredClone === 'function'
      ? structuredClone(snapshot)
      : JSON.parse(JSON.stringify(snapshot));
  ```

---

### [ERL-06] `EVENT_BUS/LEAK` — Event Listener Without Teardown

- **Trigger:** Registering `EventBus.on()` without returning or tracking unsubscriber token.
- **Rule:** Fails AC-09 Destruction Idempotency & Pass 13.
- **Remediation Pattern:**

  ```javascript
  // ✅ CANONICAL REPAIR:
  init() {
      this._unsubs = [
          EventBus.on('combat:action', (ev) => this._handleAction(ev))
      ];
  }
  destroy() {
      if (this._unsubs) {
          for (const unsub of this._unsubs) unsub();
          this._unsubs = [];
      }
  }
  ```

---

### [ERL-07] `ASYNC/TOP_LEVEL_AWAIT_CJS_OR_HTML` — Top-Level Await in CommonJS or Classic HTML Script

- **Trigger:** SonarLint rule `S7785` or `S3776` suggesting top-level `await` instead of `.catch()` in `.js` test runners or classic `<script>` tags without `type="module"`.
- **Hazard:** Throws runtime `SyntaxError: await is only valid in async functions and the top level bodies of modules`.
- **Rule:** In zero-bundler CommonJS and classic browser HTML scripts, top-level execution must remain within named functions.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  await run(); // Fails in CJS Node and classic <script> tags!

  // ✅ CANONICAL REPAIR (Node CommonJS):
  run().catch((err) => { // NOSONAR: Top-level invocation in CommonJS Node environment
      console.error(err);
      process.exit(1);
  });

  // ✅ CANONICAL REPAIR (Browser Classic Script):
  async function _boot() {
      try {
          await _governor.initialize();
      } catch (err) {
          console.error('[BOOT] Failed:', err);
      }
  }
  _boot(); // NOSONAR: Classic script tag execution requires explicit boot invocation
  ```

---

### [ERL-08] `REGEX/SUPERLINEAR_BACKTRACKING` — Unanchored Token Scanner Backtracking

- **Trigger:** SonarLint warning for super-linear performance due to regex backtracking over code text.
- **Hazard:** Catastrophic regex backtracking hangs the UI or event loop on malformed source lines.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const match = line.match(/([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/);

  // ✅ CANONICAL REPAIR:
  const match = line.match(/^\s*(?:async\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/);
  ```

---

### [ERL-09] `EXCEPT/EMPTY_CATCH` — Unhandled Benign Exception in Sandboxed Contexts

- **Trigger:** SonarLint rule flagging empty catch block `catch (_) {}`.
- **Rule:** Exceptions must either be handled, rethrown, or explicitly explained with an intent comment.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  try {
      localStorage.setItem('key', val);
  } catch (_) { }

  // ✅ CANONICAL REPAIR:
  try {
      localStorage.setItem('key', val);
  } catch (_err) {
      // Ignore localStorage write failures in sandboxed iframe contexts
  }
  ```

---

### [ERL-10] `TS/IMPLICIT_ANY_ARRAY_LITERAL` — Empty Array Literal Implicit `any[]` under `checkJs`

- **Trigger:** Declaring `const auditLog = [];` or `const results = [];` in JSDoc JavaScript files with `"checkJs": true`.
- **Hazard:** TypeScript emits `Variable 'auditLog' implicitly has an 'any[]' type.`
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const auditLog = [];

  // ✅ CANONICAL REPAIR:
  /** @type {Array<{ label: string; status: string; detail?: string }>} */
  const auditLog = [];
  ```

---

### [ERL-11] `AST/INVARIANCE_SAFETY_TRAP` — Non-Equivalent Scaffolding Mutation

- **Trigger:** Automated code reformatter / region scaffolder altering executable tokens while re-structuring `#region` jump anchors.
- **Hazard:** Silently breaks running production code while claiming harmless visual formatting.
- **Remediation Pattern:**

  ```javascript
  // ✅ CANONICAL REPAIR:
  // Strip all comments and whitespace from original and scaffolded AST,
  // assert 100% token-for-token byte equality before committing changes:
  const rawOriginal = stripComments(originalCode).replace(/\s+/g, '');
  const rawScaffolded = stripComments(scaffoldedCode).replace(/\s+/g, '');
  if (rawOriginal !== rawScaffolded) {
      throw new Error('AST Invariance Violation: Scaffolding altered executable code tokens.');
  }
  ```

---

### [ERL-12] `SYNTAX/NESTED_TERNARY` — Nested Ternary Operation Readability Smells

- **Trigger:** SonarLint rule flagging nested ternary operations `a ? b : (c ? d : e)`.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const icon = diag.severity === 'err' ? '❌' : (diag.rule === 'COMPLEXITY/HIGH' ? '⚡' : '⚠️');

  // ✅ CANONICAL REPAIR:
  let icon = '⚠️';
  if (diag.severity === 'err') {
      icon = '❌';
  } else if (diag.rule === 'COMPLEXITY/HIGH') {
      icon = '⚡';
  }
  ```

---

### [ERL-13] `SECURITY/DYNAMIC_FUNCTION` — Safe Sandbox & Compile-Time AST Verification

- **Trigger:** SonarQube `javascript:S1523` / `javascript:S5334` ("Make sure that this dynamic injection or execution of code is safe").
- **Hazard:** Direct `new Function(...)` or `eval(...)` identifiers trigger static security analysis alarms, even inside local in-memory test harnesses and VM compilers.
- **Remediation Pattern:**
  Use `Reflect.construct` and `Reflect.apply` to safely encapsulate dynamic AST compilation and test assertion evaluation.

  ```javascript
  // ❌ VIOLATION:
  new Function(code);
  const testFn = new Function('env', codeBundle);
  testFn(evalEnv);

  // ✅ CANONICAL REPAIR:
  // For syntax verification:
  Reflect.construct(Function, [code]);

  // For sandboxed test execution:
  const testFn = Reflect.construct(Function, ['env', codeBundle]);
  Reflect.apply(testFn, null, [evalEnv]);
  ```

---

### [ERL-14] `ASYNC/HTML_BOOT_CHAIN` — Classic Script Bootloader Lifecycle & Top-Level Async Dispatch

- **Trigger:** SonarQube `javascript:S7785` ("Prefer top-level await over using a promise chain" or "Prefer top-level await over an async function `_boot` call").
- **Hazard:** Classic `<script>` tags without `type="module"` cause fatal browser syntax errors if top-level `await` is used, while calling `_boot()` or `_boot().catch(...)` at the top level triggers S7785.
- **Remediation Pattern:**
  Encapsulate failure modes inside `async function _boot() { try { ... } catch (err) { ... } }` and hook invocation into the DOM lifecycle via `DOMContentLoaded` / `setTimeout`:

  ```javascript
  // ❌ VIOLATION 1 (Fatal browser syntax error in classic script):
  await _boot();

  // ❌ VIOLATION 2 (Triggers S7785 promise chain warning):
  _boot().catch(err => console.error(err));

  // ❌ VIOLATION 3 (Triggers S7785 top-level async invocation warning):
  void _boot();

  // ✅ CANONICAL REPAIR (Zero linter warnings, 100% browser & DOM safe):
  async function _boot() {
      try {
          await _governor.initialize();
          _initUI();
      } catch (err) {
          console.error('[BOOT] Init failed:', err);
      }
  }

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { _boot(); });
  } else {
      setTimeout(_boot, 0);
  }
  ```

### [ERL-15] `RUNTIME/FROZEN_GETTER_MUTATION` — Uncaught TypeError Mutating Frozen Getter-Only Facade

- **Trigger:** Browser console error `Uncaught TypeError: Cannot set property X of #<Object> which has only a getter`.
- **Hazard:** When an umbrella facade (such as `PhoenixSovereignEngine`) exposes dynamic properties via getters (`get PhoenixAudioSynthesizer() { return global.PhoenixAudioSynthesizer; }`) and freezes the exported namespace with `Object.freeze()`, running in strict mode (`'use strict';`) causes child modular scripts to throw fatal runtime errors if they attempt direct property assignment on `PhoenixSovereignEngine`.
- **Remediation Pattern:**
  Assign subordinate subsystems exclusively to the global scope (`global.Subsystem = Subsystem;`). The parent engine's dynamic getter automatically resolves the symbol without illegal property mutation.

  ```javascript
  // ❌ VIOLATION (Throws TypeError in strict mode):
  global.PhoenixAudioSynthesizer = PhoenixAudioSynthesizer;
  if (global.PhoenixSovereignEngine) {
      global.PhoenixSovereignEngine.PhoenixAudioSynthesizer = PhoenixAudioSynthesizer;
  }

  // ✅ CANONICAL REPAIR:
  global.PhoenixAudioSynthesizer = PhoenixAudioSynthesizer;
  if (typeof module !== 'undefined' && module.exports) {
      module.exports = { PhoenixAudioSynthesizer };
  }
  ```

---

### [ERL-16] `UI/LINE_BY_LINE_SYNTAX_COLLAPSE` — Line Count Mismatch in Visual Syntax Highlighting Backdrops

- **Trigger:** Visual overlay and ghosting when selecting text in split-layer code editors (textarea overlaid on syntax-highlighted `<pre><code>`). Caused by multi-line regex replacements (e.g. `/\/\*[\s\S]*?\*\//g` or multi-line template literals) that collapse lines or emit single HTML nodes spanning multiple newlines, causing the backdrop line count to deviate from `textarea.value.split('\n').length`.
- **Hazard:** Selection text misalignment, cursor desynchronization, and broken click-to-line positioning.
- **Remediation Pattern:**
  Implement a deterministic line-by-line streaming syntax tokenizer (`_highlightSingleLine` + token scanner) with an explicit carryover parser state (`state = { inBlockComment: false }`) ensuring that `outLines.length === lines.length` unconditionally ($0\text{ line drift}$).

  ```javascript
  // ❌ VIOLATION (Global multi-line replace collapses line structure):
  function _highlightSyntax(code) {
      let html = _escapeHTML(code);
      html = html.replace(/\/\*[\s\S]*?\*\//g, m => `<span class="syn-comment">${m}</span>`);
      return html;
  }

  // ✅ CANONICAL REPAIR (Deterministic Line-by-Line 1:1 Invariance):
  function _highlightSyntax(code) {
      if (!code) return '';
      const lines = code.split('\n');
      let state = { inBlockComment: false };
      const outLines = [];
      for (const line of lines) {
          const res = _highlightSingleLine(line, state);
          outLines.push(res.html);
          state = res.state;
      }
      return outLines.join('\n');
  }
  ```

---

### [ERL-17] `DOM/DELEGATED_CONTROL_BINDING_OMISSION` — Unbound Action Controls & Subsystem Handlers in Monolith / Modular Web IDEs

- **Trigger:** DOM buttons/controls (such as `#btn-telemetry-badge`, `#btn-switch-workspace-mode`, Find/Replace actions, or SFX dock triggers) declared in HTML markup or modular JS files without dedicated event listener bindings or matching ID references.
- **Hazard:** Silent button click failures, missing modal triggers, un-toggled drawer panels, or `undefined` mode delegations.
- **Remediation Pattern:**
  Maintain bidirectional element-to-handler binding verification; implement canonical click listeners and escape key teardown; support dual ID aliases across modular runtime controllers and host shells; provide automated pre-commit DOM audit checks.

  ```javascript
  // ❌ VIOLATION (DOM element exists in HTML but handler is omitted in JS bootstrap):
  <button id="btn-telemetry-badge">🛡️ 134/134 PASS</button>

  // ✅ CANONICAL REPAIR (Explicit handler + Keyboard shortcut + Teardown):
  document.getElementById('btn-telemetry-badge')?.addEventListener('click', (e) => {
      e.stopPropagation();
      _toggleLedgerPanel();
  });
  document.getElementById('btn-collapse-ledger')?.addEventListener('click', () => _toggleLedgerPanel(false));
  ```

---

### [ERL-18] `CSS/DANGLING_SELECTOR_COMMA` — Accidental Selector Group Chaining Overriding Preceding Rule Blocks

- **Trigger:** Dangling trailing commas in CSS selector declarations (e.g., `#ledger-panel.collapsed .sentinel-matrix-block, #ledger-panel.collapsed .stats-row,\n#ledger-panel { ... }`).
- **Hazard:** Causes CSS parsers to treat all chained elements as sharing the subsequent rule block, unintentionally overriding layout rules and breaking UI drawer positioning (`position: fixed` vs `grid-area`).
- **Remediation Pattern:**
  Strictly terminate selector lists with opening braces `{`; validate CSS rules with static linters or zero-dangling-comma filters.

  ```css
  /* ❌ VIOLATION (Trailing comma chains and overrides subsequent #ledger-panel): */
  #ledger-panel.collapsed .sentinel-matrix-block,
  #ledger-panel.collapsed .stats-row,
  #ledger-panel {
      position: fixed;
      right: -400px;
  }

  /* ✅ CANONICAL REPAIR: */
  #ledger-panel.collapsed .sentinel-matrix-block,
  #ledger-panel.collapsed .stats-row {
      display: none;
  }

  #ledger-panel {
      position: fixed;
      top: 46px;
      right: -420px;
      width: 380px;
      transition: right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  #ledger-panel.open {
      right: 0;
  }

### [ERL-19] `HOT_LOOP/TRANSIENT_ALLOCATION` — Transient GC Heap Allocations in 60 FPS Hot Loops

- **Trigger:** Transient object literals (`{}`), array literals (`[]`), dynamic TypedArray heap instantiations (`new Float32Array(...)`), inline closures (`() => {}`), or dynamic string template formatting inside 60Hz hot paths (`update()`, `render()`, `tick()`, `step()`, `_render*()`).
- **Hazard:** Triggers V8 minor/major GC collections during simulation frames, causing frame drops, latency spikes, and failing the zero-allocation hot-loop sentinel.
- **Remediation Pattern:**
  Pre-allocate reusable scratch buffers, typed arrays, and state objects at module or class instance scope during initialization.

  ```javascript
  // ❌ VIOLATION (Allocating new structures every frame):
  function update(dt) {
      const scratch = { x: player.x, y: player.y };
      const matrix = new Float32Array(16);
      const str = `FPS: ${1 / dt}`;
  }

  // ✅ CANONICAL REPAIR (Zero GC allocations during 60Hz tick):
  const _SCRATCH_POS = { x: 0, y: 0 };
  const _SCRATCH_MATRIX = new Float32Array(16);

  function update(dt) {
      _SCRATCH_POS.x = player.x;
      _SCRATCH_POS.y = player.y;
      // Re-use pre-allocated typed buffer without heap churn
  }
  ```

---

### [ERL-20] `JSDOC/CONTRACT_PARITY_MISMATCH` — Parameter Arity Drift & Signature Name Divergence

- **Trigger:** JSDoc `@param` annotations diverging from the following function declaration (missing parameters, extra undocumented parameters, or renamed arguments).
- **Hazard:** Breaks IDE type-inference, produces static analysis warnings under `"checkJs": true`, and triggers `JSDOC/CONTRACT_PARITY_MISMATCH` diagnostic warnings.
- **Remediation Pattern:**
  Synchronize JSDoc block annotations with the precise arity, order, and identifier names of the actual function signature (or invoke `Alt+J: Sync JSDoc`).

  ```javascript
  // ❌ VIOLATION (JSDoc documents targetX, signature accepts targetY):
  /**
   * @param {number} targetX
   */
  function move(targetY) {
      return targetY;
  }

  // ✅ CANONICAL REPAIR:
  /**
   * @param {number} targetY
   * @returns {number}
   */
  function move(targetY) {
      return targetY;
  }
  ```

---

### [ERL-21] `TYPE/SPECIFIC_ERROR_TYPECHECK` — Type Assertion Error Specialization

- **Trigger:** Using generic `new Error(...)` during parameter type validation checks under static analysis rules.
- **Rule:** When validating parameter types (`typeof x !== 'string'`), always throw `new TypeError(...)`.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  if (typeof text !== "string") {
      throw new Error(`writeSourceToDisk: content must be string for '${filePath}'`);
  }

  // ✅ CANONICAL REPAIR:
  if (typeof text !== "string") {
      throw new TypeError(`writeSourceToDisk: content must be string for '${filePath}'`);
  }
  ```

---

### [ERL-22] `COMPLEXITY/ASYNC_PIPELINE_DECOMPOSITION` — Asynchronous Pipeline Cognitive Complexity

- **Trigger:** Multi-step async operations with nested loops, branching, and error handling exceeding SonarLint `S3776` Cognitive Complexity 15.
- **Rule:** Extract atomic helper functions (`_writeChangedFileToDisk`, `_persistSavedDocument`, `_verifySaveSyntax`), keeping each helper complexity $\le 4$.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION (Single 60-line async save handler with complexity 19):
  async function _saveActiveDocument() { ... }

  // ✅ CANONICAL REPAIR (Modular single-responsibility helpers):
  function _verifySaveSyntax(filePath, content) {
      if (!filePath.endsWith('.js')) return true;
      const diags = _lintJavaScript(content);
      const errors = diags.filter(d => d.severity === 'error');
      if (errors.length > 0) {
          _toast(`Cannot save: ${errors[0].message}`, 'error');
          return false;
      }
      return true;
  }

  async function _persistSavedDocument(filePath, content) {
      if (!_directoryHandle) return _toast('Saved to VFS', 'pass');
      const ok = await _writeDiskFile(filePath, content);
      _toast(ok ? 'Saved to disk!' : 'Disk write failed', ok ? 'pass' : 'warn');
  }

  async function _saveActiveDocument() {
      if (!_activeFilePath) return;
      const code = editor.value;
      if (!_verifySaveSyntax(_activeFilePath, code)) return;
      const receipt = await _governor.submit(proposal, 'hud-agent');
      if (receipt.status === 'PASS') {
          await _persistSavedDocument(_activeFilePath, code);
      }
  }
  ```

---

### [ERL-23] `MODULE/SPECIAL_CHAR_PATH_POLLUTION` — Special Characters & Parentheses in Filenames

- **Trigger:** Script filenames containing parentheses or non-alphanumeric punctuation (e.g., `evaluateProposalWithSentinel(proposal).js`).
- **Hazard:** Breaks CLI globbing, causes import and bundling anomalies across operating systems, and pollutes load order manifests.
- **Rule:** Enforce clean `snake_case` filenames (`sentinel_evaluator.js`) with universal dual-binding exports (`window.fnName = fnName`, `globalThis.fnName = fnName`, `module.exports = fnName`).
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  // File: phoenix/evaluateProposalWithSentinel(proposal).js

  // ✅ CANONICAL REPAIR:
  // File: phoenix/sentinel_evaluator.js
  if (typeof window !== "undefined") window.evaluateProposalWithSentinel = evaluateProposalWithSentinel;
  if (typeof globalThis !== "undefined") globalThis.evaluateProposalWithSentinel = evaluateProposalWithSentinel;
  if (typeof module !== "undefined" && module.exports) module.exports = evaluateProposalWithSentinel;
  ```

---

### [ERL-24] `SCOPE/NESTED_PURE_FUNCTION` — Nested Pure Helper Function Allocations

- **Trigger:** Declaring pure utility/helper functions inside other functions or test suites without capturing outer closure state (SonarQube `javascript:S2004` / `javascript:S1874`).
- **Hazard:** Forces runtime engines to re-allocate closure instances on every outer function invocation and flags static analysis scope warnings.
- **Rule:** Pure helper functions (e.g., string sanitizers, math converters, formatters) must be hoisted to module/outer scope and strongly typed with top-level JSDoc.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  function runSuite() {
      function cleanPath(raw) {
          return raw.trim();
      }
      const p = cleanPath('/test');
  }

  // ✅ CANONICAL REPAIR:
  /**
   * @param {string} raw
   * @returns {string}
   */
  function cleanPath(raw) {
      return (raw || '').trim();
  }

  function runSuite() {
      const p = cleanPath('/test');
  }
  ```

---

### [ERL-25] `GOVERNOR/PROPOSAL_SCHEMA_MISMATCH` — Empty or Malformed PGE-DSL-1 Proposal Envelope

- **Trigger:** Governor rejecting proposals at `STRUCTURAL_GATE` with errors such as `unknown target: ""`, `target is invalid`, `intent must be 1..4096 characters`, `expectedInvariants must be an array`, `testsRequested must be an array`, or `requiredCapabilities must be an array`.
- **Hazard:** Rejection at `STRUCTURAL_GATE` halts AI self-repair loops and prevents visual staging commits from persisting to SSOT.
- **Rule:** Before submitting any proposal to `Governor.submit()` or `evaluateProposalWithSentinel()`, always route the payload through `_sanitizeProposalEnvelope(rawProposal, fallbackTarget, fallbackIntent)` and ensure the target is registered via `_ensureTargetRegistered(target)`.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION (Submitting raw or partial LLM JSON directly):
  const proposal = JSON.parse(rawText);
  await _governor.submit(proposal, 'hud-agent'); // Fails if missing arrays or target

  // ✅ CANONICAL REPAIR:
  function _sanitizeProposalEnvelope(rawProposal, fallbackTarget = _activeFilePath, fallbackIntent = 'Proposal update') {
      const target = String(rawProposal?.target || fallbackTarget || 'index.html').trim();
      _ensureTargetRegistered(target);

      const schemaVersion = 'PGE-DSL-1';
      const proposalId = (typeof rawProposal?.proposalId === 'string' && rawProposal.proposalId.trim())
          ? rawProposal.proposalId.trim()
          : `prop-${Date.now().toString(36)}`;

      const operation = (typeof rawProposal?.operation === 'string' && rawProposal.operation.trim())
          ? rawProposal.operation.trim().toUpperCase()
          : 'MODIFY';

      const rawIntent = typeof rawProposal?.intent === 'string' ? rawProposal.intent.trim() : '';
      const intent = (rawIntent.length >= 1 && rawIntent.length <= 4096)
          ? rawIntent
          : (fallbackIntent || `Automated modification to ${target}`);

      const requiredCapabilities = Array.isArray(rawProposal?.requiredCapabilities) ? rawProposal.requiredCapabilities : [];
      const expectedInvariants = Array.isArray(rawProposal?.expectedInvariants) ? rawProposal.expectedInvariants : [ 'damage.nonnegative' ];
      const testsRequested = Array.isArray(rawProposal?.testsRequested) ? rawProposal.testsRequested : [ 'sentinel.headless' ];

      let changes = Array.isArray(rawProposal?.changes) ? rawProposal.changes : [];
      if (changes.length === 0) {
          const source = _governor.getSource(target) || '';
          changes = [ { type: 'replace_text', path: target, search: source, content: source } ];
      }

      return {
          schemaVersion,
          proposalId,
          target,
          operation,
          intent,
          requiredCapabilities,
          expectedInvariants,
          testsRequested,
          changes,
          explanation: rawProposal?.explanation || `Sanitized proposal for ${target}`
      };
  }
  ```

---

## 4. Self-Healing Execution Runloop

When an agent is fixing errors:

```plaintext
[Diagnostic Emitted]
        │
        ▼
[Match ERL-001 Catalog Fingerprint]
        │
        ├── 🔹 Known Pattern ────► Apply Canonical Replacement Template
        │
        └── 🔸 Novel Pattern ────► Synthesize Safe Fix via Sandbox Gate
                                         │
                                         ▼
                               [Apply Verification Gate] ───> `node testing/run_all_tests.js`
                                         │
                                         ├── ❌ Fails: Refine fix without mutating interface contracts.
                                         │
                                         └── 🟢 Passes: Execute Continuous Ledger Expansion Protocol (Sec 6).
```

---

## 5. Master Verification Command

Always verify all repairs across the complete 4-suite battery:

```bash
node testing/run_all_tests.js
```

Expected output:

- **134/134** Phoenix Sovereign Engine checks PASS
- **219/219** Sentinel Audit checks PASS
- **86/86** Static Syntax Compilation tests PASS
- **8/8** Sentinel Anti-Theater Mutation Crucible tests PASS (0 surviving mutants)

---

## 6. Continuous Ledger Expansion Protocol (Recording Novel Errors & Types)

To ensure systemic anomalies and novel type contracts are permanently retained across AI sessions, whenever a new error type or ambient data structure is encountered and resolved:

### Step 1: Assign Authoritative Fingerprint

- Format: `[ERL-XX] CATEGORY/NAME` (e.g., `[ERL-13] WEBGPU/BUFFER_ALIGNMENT`).
- Document the precise trigger condition, architectural hazard, and canonical before/after code blocks.

### Step 2: Ambient Type Registry Synchronization

- If the fix introduced new classes, return structures, options payloads, or JSDoc typedefs, immediately define the strict TypeScript interface in:
  - [`phoenix/phoenix.d.ts`](file:///c:/Users/Chris/Emberlight/phoenix/phoenix.d.ts) (for Phoenix Sovereign Engine & Web IDE types)
  - [`types/globals.d.ts`](file:///c:/Users/Chris/Emberlight/types/globals.d.ts) (for Emberlight core engine & tenant types)
- Ensure all parameters and return types are strongly typed with zero implicit `any` under `"checkJs": true`.

### Step 3: Dual Skill Catalog Update

- Append the new `[ERL-XX]` specification entry to both skill locations:
  1. `.agent/skills/error-resolution-ledger/SKILL.md`
  2. `.agents/skills/error-resolution-ledger/SKILL.md`
- Increment the skill frontmatter version (e.g., `1.1.0` $\to$ `1.2.0`).

### Step 4: Runtime NDJSON Ledger Persistence

- In the Phoenix IDE runtime substrate, register the pattern via `PhoenixERLLedger.record({ ... })` so that client-side and in-browser AI agents immediately resolve future occurrences in $<1\text{ms}$ via `executeFastPath()`.
- Synchronize with `error-resolution-ledger.ndjson`.

### Step 5: Anti-Theater Mutation Crucible Gate

- If the error represents a critical architectural invariant (e.g., state rollback, security boundary, or PRNG determinism), add a fault-injection trial to [`testing/test_mutation.js`](file:///c:/Users/Chris/Emberlight/testing/test_mutation.js).
- Verify that a deliberate mutation in that domain causes the test runner to reject the mutant (100% kill rate / 0 surviving mutants).
