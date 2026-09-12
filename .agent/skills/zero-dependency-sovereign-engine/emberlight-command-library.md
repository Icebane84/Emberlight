**Document Identifier:** GUCA-CMD-EMBERLIGHT-002
**Timestamp:** 2026-09-11T07:30:00-04:00
**Governing Standard:** VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001 / MPFS-001
**Index Anchor:** PRS-001

## **1. Testing & Sentinel Auditing Commands**

### **CMD-AUDIT-SENTINEL: Full 19-Pass Verification Gate Check**

- **Purpose:** Instructs the model to evaluate modifications against all 127 checks across the 19 Sentinel passes, executing `testing/test_sentinel.js` and verifying zero-entropy compliance before code delivery.
- **Template Prompt:**

```text
Target Subsystem: [FILE_NAME.js]
Task: Audit and verify recent code changes against the Sentinel Gatekeeper.

Execute the following steps:
1. Review the modifications made to [FILE_NAME.js].
2. Cross-reference the changes against the 19 Sentinel passes in auditor.js / auditor/*.js.
3. Validate that running `node testing/test_sentinel.js` outputs:
   "=== SENTINEL AUDIT 100% SUCCESS: 127/127 CHECKS PASSED ==="
4. Assert that:
   - All 9 canonical VSRP-001 lifecycle methods remain intact across all 11 simulation tenants.
   - Snapshot isolation (AC-02) is maintained with zero live host reference leakage.
   - PRNG stream authority (AC-05) is preserved with zero unseeded Math.random() calls.
   - Post-destruction guards (AC-09) throw explicit lifecycle errors.
5. If any check fails, state the exact failure condition and provide the precise code fix.
```

---

### **CMD-AUDIT-FARADAY: Memory Isolation & Snapshot Mutation Audit**

- **Purpose:** Validates that a Tier 2 simulation tenant maintains strict Faraday memory isolation in its working memory, uses `structuredClone()` on snapshot ingestion, and emits mutations purely via sealed delta envelopes.
- **Template Prompt:**

```text
Target File: [TIER_2_FILE.js]
Task: Enforce VSRP-001 Faraday Isolation (Rule 1 & AC-02).

Inspect [TIER_2_FILE.js] and confirm that:
1. Working state is fully enclosed inside a private closure (`sim`).
2. The `reset(snapshot)` method strictly ingests state via `structuredClone(snapshot)`. Zero object references (such as party arrays, inventory dictionaries, or flag maps) remain linked to the host.
3. The tenant contains ZERO references to browser DOM primitives (`window`, `document`, `localStorage`, `HTMLElement`, `alert`).
4. State transitions leave the tenant exclusively via `hostContext.eventBus.publish('<district>:resolved', envelope)`.
5. The `getState()` method returns a detached POJO snapshot that does not leak internal private references.

Refactor any violating lines immediately, preserving existing `//#region` structural boundaries.
```

---

### **CMD-AUDIT-PERSISTENCE: Multi-Slot Persistence & Migration Verification**

- **Purpose:** Validates that save data serialization strictly complies with multi-slot storage (`SLOT_1`, `SLOT_2`, `SLOT_3`, `AUTO_SAVE`), sparse coordinate compression (<2.5KB budget), and backward-compatible schema migration in `save_manager.js`.
- **Template Prompt:**

```text
Target Subsystem: save_manager.js / session_store.js
Task: Verify Multi-Slot Persistence & Storage Integrity (Pass 13).

Instructions:
1. Run `node testing/test_persistence_wiring.js` and verify all assertions pass.
2. Confirm that:
   - Descriptors accurately track metadata (timestamp, party summary, location, play time).
   - Save payloads serialize under the strict <2.5KB compression budget.
   - `_autoMigrateLegacy()` handles v1.0.0 flat schemas without state corruption.
   - Quota exhaustion and storage corruption triggers fallback error handling.
```

---

### **CMD-TEST-SUBSYSTEM: Targeted Headless Harness Execution**

- **Purpose:** Instructs the model to run and validate specific domain test harnesses without browser interaction.
- **Template Prompt:**

```text
Target Test Suite: testing/[TEST_SCRIPT.js]
Target Modules: [LIST_OF_FILES.js]
Task: Validate domain-specific behavior against headless Node assertions.

Context:
The test harness runs headlessly using Node standard modules (`node:vm`, `node:fs`, `node:assert`) with zero third-party packages.

Instructions:
1. Examine the test cases inside `testing/[TEST_SCRIPT.js]`.
2. Trace execution flow through the target modules in memory.
3. Confirm all assertions pass cleanly with zero uncaught exceptions.
4. Target Test Suites:
   - `testing/test_combat_input.js`: Command hub, action tokens, hotkeys.
   - `testing/test_hotkeys_and_expansion.js`: Viewport expansion, 3D crawler kinematics.
   - `testing/test_combat_victory_transition.js`: Victory rewards, audio fanfare, district handoff.
   - `testing/test_persistence_wiring.js`: Multi-slot saves, delta compression, migrations.
   - `testing/test_input_settings_integration.js`: Keybindings, sound balance, screen shake SSOT.
   - `testing/gen_html_scripts.js`: Script load order SSOT parity audit.
```

---

## **2. Refactoring & Modular Pipeline Commands**

### **CMD-REFACTOR-REGION: Bounded In-Region Modification**

- **Purpose:** Allows safe, targeted modification of functional logic strictly inside a defined `//#region [SEC-XX]` block without modifying out-of-scope code or leaking variables into parent closures.
- **Template Prompt:**

```text
Target File: [FILE_NAME.js]
Target Section: //#region [SEC-XX] [SECTION_NAME]
Task: Refactor logic within designated region boundaries.

Constraints:
1. Confine all code additions, deletions, and edits strictly inside `//#region [SEC-XX]` and `//#endregion`.
2. DO NOT delete, rename, or alter the region header or footer comments.
3. DO NOT introduce closure variables that leak outside this region.
4. Ensure all newly introduced internal functions are pure, receiving dependencies explicitly via parameters.
5. Preserve the top-level table of contents and navigation anchors intact.
6. Return ONLY the refactored code block enclosed within the exact `//#region` and `//#endregion` tags.
```

---

### **CMD-EXTRACT-MPFS-SUBMODULE: Modular Pipeline Facade Subsystem Extraction**

- **Purpose:** Extracts discrete domain sub-features into one of the 5 canonical MPFS-001 directories (`manifest/`, `combat/`, `battler_baker/`, `pseudo_3d/`, `auditor/`) using temporary staging membranes.
- **Template Prompt:**

````text
Source File: [SOURCE_FACADE.js]
Target Subdirectory: [manifest/ | combat/ | battler_baker/ | pseudo_3d/ | auditor/]
New Sub-Module: [TARGET_DIR/SUBMODULE_NAME.js]
Staging Membrane: window._[Domain]Internal
Task: Extract modular pipeline sub-module under MPFS-001.

Execution Directives:
1. Create [TARGET_DIR/SUBMODULE_NAME.js] and populate the staging membrane:
   ```javascript
   (function () {
     'use strict';
     const _target = (typeof window !== 'undefined' ? window : global)._[Domain]Internal =
       (typeof window !== 'undefined' ? window : global)._[Domain]Internal || {};

     _target.extractedMethod = function (...) { ... };
   })();
````

1. Update the root facade to ingest the staging membrane, freeze/export the canonical singleton, and purge `window._[Domain]Internal`.
2. Invoke `CMD-SYNC-TOPOLOGY` to register the new sub-module in `testing/load_order.js` and `index.html`.
3. Verify with `node testing/gen_html_scripts.js` and `node testing/test_sentinel.js`.

````

---

### **CMD-SYNC-TOPOLOGY: SSOT Script Load-Order Synchronization**

* **Purpose:** Synchronizes sequential script load orders in `testing/load_order.js` (SSOT) and `index.html`.
* **Template Prompt:**

```text
Script to Register: [PATH_TO_SCRIPT.js]
Insert After: [DEPENDENCY_AFTER.js]
Task: Synchronize topological script load order across SSOT and HTML shell.

Execution Directives:
1. Insert '[PATH_TO_SCRIPT.js]' into `EMBERLIGHT_SCRIPT_LOAD_ORDER` in `testing/load_order.js` after '[DEPENDENCY_AFTER.js]'.
2. Insert `<script src="[PATH_TO_SCRIPT.js]"></script>` into `index.html` at the corresponding location.
3. Run `node testing/gen_html_scripts.js` to assert zero drift.
4. Run `node testing/test_sentinel.js` to assert 100% test pass.
````

---

### **CMD-OPTIMIZE-PERF: 60 FPS Compositor & Zero-GC Loop Optimization**

- **Purpose:** Refactors presentation drivers and particle loops to prevent garbage-collection stutter, eliminate DOM layout thrashing, and enforce GPU-accelerated transforms.
- **Template Prompt:**

```text
Target File: [RENDERER_OR_VFX_FILE.js]
Performance Target: 60 FPS (<= 16.67ms frame budget) / Zero-GC in simulation loops

Instructions:
1. Eliminate per-frame heap allocations inside `update()` and `render()`:
   - Replace dynamic array instantiation (`[]`, `new Array()`) with pre-allocated TypedArrays (`Float32Array`, `Uint8ClampedArray`) or indexed object pools.
   - Disallow `structuredClone()` or object spreading inside 60Hz tick loops.
2. Eliminate layout thrashing:
   - Disallow continuous calls to `getBoundingClientRect()`, `offsetWidth`, or `innerHTML` inside animation loops.
   - Cache centroid buffers and update DOM elements exclusively via CSS hardware transforms (`transform: translate3d(...)`) and class toggles.
3. Assert that canvas offscreen operations pre-render complex sprites into Base64 PNGs or cached buffers during boot rather than mid-frame.
4. Output the refactored loop accompanied by a sub-millisecond execution timing analysis.
```

---

## **3. Architecture-Aware Documentation Commands**

### **CMD-DOC-INDEX: In-File Table of Contents & Anchor Synthesis**

- **Purpose:** Generates or synchronizes an architectural file header, numbered section tags (`[SEC-XX]`), and collapsible region boundaries across large flat-directory modules.
- **Template Prompt:**

````text
Target File: [FILE_NAME.js]
Target Protocol: [VSRP-001-DISTRICT-X or COMPONENT_PROTOCOL]
Task: Construct architectural Table of Contents and jump anchors.

Instructions:
1. Analyze functional subsystems inside [FILE_NAME.js].
2. Generate an architectural header block at lines 1–40 using this exact format:
   ```javascript
   /**
    * ============================================================================
    * EMBERLIGHT SOVEREIGN ENGINE: [SUBSYSTEM NAME]
    * Document Identifier: [DOC-ID]
    * Governing Protocol:  [PROTOCOL-ID]
    * Authority:           [Host SSOT | Ephemeral Simulation | Peripheral Presentation | Math Kernel]
    * ============================================================================
    *
    * TABLE OF CONTENTS & NAVIGATION ANCHORS:
    *   [SEC-01] Type Definitions & Contract Schemas
    *   [SEC-02] Canonical 9-Method Lifecycle Gateway
    *   ...
    * ============================================================================
    */
````

1. Wrap each functional section in the corresponding native folding region:
   `//#region [SEC-XX] [SECTION_NAME]` ... `//#endregion`.
2. Ensure every anchor in the Table of Contents matches its `#region` tag exactly to enable zero-latency search via Ctrl + F.

````

---

### **CMD-DOC-JSDOC: Strict Type Contract Annotation (`checkJs: true`)**

* **Purpose:** Generates comprehensive JSDoc `@typedef`, `@param`, and `@returns` definitions so VS Code's internal language service provides static type checking without a TypeScript compiler.
* **Template Prompt:**

```text
Target File: [FILE_NAME.js]
Target Functions: [FUNCTION_NAMES or //#region [SEC-XX]]
Task: Author strict JSDoc type contracts for zero-dependency static validation.

Requirements:
1. Define comprehensive `@typedef` domain objects for all state shapes, snapshots, action tokens, and event payloads at the head of the file or section.
2. Annotate every function with:
   - Clear architectural description (indicating whether it is pure or state-mutating).
   - `@param` with explicit primitive or custom typedef types.
   - `@returns` with explicit return shapes (use `@returns {void}` if no return).
3. If an input or parameter is optional, mark it as `[paramName]`.
4. Ensure all parameter types align with `jsconfig.json` rules so VS Code flags type errors under `"checkJs": true` without requiring any npm packages.
````

---

## **4. Integration & Diagnostics Commands**

### **CMD-DIAG-ASSERTION: Headless VM Assertion Failure Triage**

- **Purpose:** Analyzes stack traces and assertion failures emitted by Node's built-in test runner, mapping the failure directly to the responsible architectural invariant.
- **Template Prompt:**

```text
Error Output:
"""
[PASTE TERMINAL ASSERTION FAILURE / STACK TRACE HERE]
"""

Task: Triage and rectify test failure.

Follow this systematic resolution protocol:
1. Isolate the failing test script and line number (e.g., `testing/test_sentinel.js:Pass 18`).
2. Identify the broken invariant:
   - Is it an AC-01 lifecycle signature mismatch?
   - Is it an AC-02 snapshot isolation leak?
   - Is it an AC-04/AC-05 non-deterministic PRNG replay drift?
   - Is it a tactical displacement / formation shielding failure?
   - Is it a load-order dependency fault?
3. Pinpoint the root cause within the offending module.
4. Deliver the minimal, exact code modification required to restore the test to passing status.
5. Provide terminal verification instructions to confirm the test suite exits with code 0.
```

---

### **CMD-DIAG-ENTROPY: PRNG Authority & Zero-Math.random Verification**

- **Purpose:** Scans target simulation modules, identifies unauthorized global `Math.random()` invocations, and transitions simulation entropy to the deterministic `EmberlightPRNG` stream.
- **Template Prompt:**

```text
Target Files: [Tier 2 Simulation Files or Tier 4 Procedural Kernels]
Task: Attest PRNG Authority (AC-05) and eliminate unseeded entropy.

Instructions:
1. Scan the target file(s) for any occurrence of global `Math.random()`.
2. For every occurrence:
   - If located inside a Tier 2 simulation tenant or Tier 4 math kernel, flag it as a CRITICAL CONSTITUTIONAL VIOLATION.
   - Replace `Math.random()` with explicit calls to `prng.nextFloat()`, `prng.nextInt(min, max)`, or `prng.choice(arr)`.
3. Verify that the `prng` stream instance is:
   - Passed down deterministically through `reset(snapshot)` or context updates.
   - Serialized in `getState()` via `prng.getState()` to preserve bit-exact replayability.
4. Assert that running Pass 5 and Pass 17 of `auditor.js` confirms zero global random calls during active simulation cycles.
```

---

### **CMD-DIAG-LIFECYCLE: VSRP-001 State Machine & Teardown Remediation**

- **Purpose:** Inspects module lifecycle transitions, ensuring strict adherence to the state machine (UNCONFIGURED -> CONFIGURED -> INITIALIZED -> READY -> RUNNING -> DESTROYED) and guaranteeing idempotent teardown.
- **Template Prompt:**

```text
Target Module: [MODULE_NAME.js]
Task: Remediate VSRP-001 Lifecycle State Machine and Teardown Leaks.

Audit the module against VSRP-001 Section 3 and Section 4.9:
1. Verify the formal state transition guard `assertLifecycle(...allowedStates)`:
   - Ensure `configure()` can only be called from `UNCONFIGURED` and locks configuration.
   - Ensure `init()`, `reset()`, `update()`, and `render()` throw if invoked out of sequence.
2. Verify teardown idempotency in `destroy()`:
   - Purge all DOM handles, canvas buffers, Web Audio oscillator nodes, and timers.
   - Release and unbind all `EventBus` subscription tokens (`unsub()`).
   - Confirm that calling `destroy()` repeatedly is a safe no-op.
   - Confirm that calling any other method after `destroy()` throws an explicit lifecycle exception.
3. Validate that Pass 13 and Pass 17 (AC-09) in `auditor.js` evaluate to PASS.
```
