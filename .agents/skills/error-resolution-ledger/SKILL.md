---
name: error-resolution-ledger
description: Governs the Error Resolution Ledger (ERL-001) catalog of canonical diagnostic fingerprints, pre-commit lint filters, and verified deterministic self-repair patterns across Emberlight and Phoenix engines.
globs: "**/*.js, **/*.html, **/*.ts, testing/**/*.js, phoenix/**/*.js"
alwaysApply: false
version: 1.0.0
---

# AGENT OPERATIONAL SPECIFICATION: Error Resolution Ledger (ERL-001)

**Document Identifier:** SKILL-EMBERLIGHT-ERL-001
**Protocol Version:** ERL-001 / VSRP-001 / SDCP-001 / ARCH-001-EMBERLIGHT
**Scope:** Universal AI Agent Diagnostic Remediation & Anti-Entropy Guardrails

---

## 1. Core Purpose & Architectural Mandate

The **Error Resolution Ledger (ERL-001)** is the single source of truth for detecting, preventing, and repairing systemic code anomalies across all Emberlight modules and Phoenix tools.

When an AI agent (Antigravity, Cursor, Continue, Aider, or Phoenix in-IDE model) encounters a diagnostic error, linter warning, or test assertion failure, it **MUST NOT** hallucinate an ad-hoc fix. It must consult this ledger, match the diagnostic fingerprint, and apply the verified canonical remediation pattern.

---

## 2. Pre-Commit Guardrails & Prohibited Anti-Patterns

Before presenting or applying any code changes, all AI agents must enforce these 5 immutable constraints:

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
   - Avoid unanchored wildcards like `/\?.*:/` or nested quantifiers. Use $O(N)$ string methods (`includes`) or strictly bounded regex character classes (`/\?[^:]*:/`).

5. **Type-Safe Catch Error Handling:**
   - Catch variables are typed as `unknown` under `checkJs: true`.
   - Always extract via: `const errMsg = err instanceof Error ? err.message : String(err);`.

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

## 4. Self-Healing Execution Runloop

When an agent is fixing errors:

```plaintext
[Diagnostic Emitted]
        │
        ▼
[Match ERL-001 Catalog Fingerprint]
        │
        ▼
[Apply Canonical Replacement Template]
        │
        ▼
[Execute Verification Gate] ───> `node testing/run_all_tests.js`
        │
        ├── ❌ Fails: Re-inspect trace, refine helper extraction without changing signature.
        │
        └── 🟢 Passes: Commit fix to repository & record pattern if novel.
```

---

## 5. Master Verification Command

Always verify all repairs across the complete triple-suite battery:

```bash
node testing/run_all_tests.js
```

Expected output:

- **124/124** Phoenix Sovereign Engine checks PASS
- **134/134** Sentinel Audit checks PASS
- **86/86** Static Syntax Compilation tests PASS
