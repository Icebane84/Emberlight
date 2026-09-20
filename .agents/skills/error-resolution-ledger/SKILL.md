---
name: error-resolution-ledger
description: Governs the Error Resolution Ledger (ERL-001) catalog of canonical diagnostic fingerprints, pre-commit lint filters, and verified deterministic self-repair patterns across Emberlight and Phoenix engines.
globs: "**/*.js, **/*.html, **/*.ts, testing/**/*.js, phoenix/**/*.js"
alwaysApply: false
version: 1.1.0
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
