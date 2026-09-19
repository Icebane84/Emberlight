**Document Identifier:** GUCA-CMD-SPEC-001-COMPLETE

**Timestamp:** 2026-09-06T13:28:15-04:00

**Governing Standard:** GUCA-001 / VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001

**Index Anchor:** PRS-001

## 1. Architectural Deficit Analysis: What Was Missing

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   GUCA-001 DEFICIT IDENTIFICATION                      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       1. STRUCTURAL OMISSIONS        │  │       2. FUNCTIONAL OMISSIONS        │
│  • No Pre-condition State Checks     │  │  • No CMD-SYNC-TOPOLOGY              │
│  • No Rollback / Teardown Directives │  │  • No CMD-EXECUTE-GATE               │
│  • No Explicit Acceptance Assertions │  │  • No Schema Definition Standard     │
└──────────────────────────────────────┘  └──────────────────────────────────────┘

```

* **Pre-condition Gates:** Commands must never execute against dirty, unverified working directories. If an agent refactors `combat.js` while `auditor.js` is already failing from an earlier edit, it cannot distinguish old bugs from new regressions.

* **Rollback Protocols:** When a refactor fails an assertion in `test_sentinel.js`, an autonomous script needs an explicit recovery procedure rather than attempting infinite blind patches.

* **`CMD-SYNC-TOPOLOGY`:** Extracting or creating a module requires updating five separate files: `index.html` and the `scripts` arrays inside `test_sentinel.js`, `test_combat_input.js`, `test_hotkeys_and_expansion.js`, and `test_persistence_wiring.js`. Leaving this as a sub-bullet inside extraction causes load-order drift.

* **`CMD-EXECUTE-GATE`:** A dedicated command instructing the model how to parse, extract, and triage failure logs emitted by `node:assert` and `auditor.js`.

---

## 2. GUCA Canonical Envelope Standard

Every command within the Phoenix / Emberlight stack must adhere to this 7-section structural envelope:

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-<NAME>-<VERSION>
PROTOCOL ANCHOR:    <Standard, e.g., VSRP-001 / PMIP-001>
SECURITY / TIER:    <Target Tier: T1, T2, T3, or T4>
================================================================================
1. GOAL & SCOPE
2. PRE-CONDITIONS (State verification prior to execution)
3. PARAMETERS (Typed input variables)
4. INVARIANTS (Constitutional boundaries that must never break)
5. EXECUTION DIRECTIVES (Sequential, deterministic steps)
6. ACCEPTANCE GATE (Automated terminal validation)
7. ROLLBACK PROTOCOL (Failure containment and state reversion)
================================================================================

```

---

## 3. The Complete 5-Command Production Library

### Command 1: `CMD-REFACTOR-REGION`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-REFACTOR-REGION-002
PROTOCOL ANCHOR:    VSRP-001 / ARCH-CODE-PARTITION-001
SECURITY / TIER:    Tier 1, Tier 2, Tier 3, or Tier 4
================================================================================

1. GOAL & SCOPE:
Execute an in-place optimization, bug fix, or refactor strictly bounded within an existing folding region of an engine file without leaking changes into adjacent subsystems.

2. PRE-CONDITIONS:
- Verify TARGET_FILE exists at the project root.
- Execute "node testing/test_sentinel.js" to confirm working baseline is 100% GREEN (127/127 checks passing) before making any changes.

3. PARAMETERS:
- TARGET_FILE: <Path to file, e.g., combat.js>
- REGION_TAG: <Anchor tag, e.g., [SEC-03] DAMAGE FORMULAS>
- REFACTOR_OBJECTIVE: <Precise description of the functional change>

4. INVARIANTS:
- NEVER modify code outside the targeted //#region and //#endregion block.
- ZERO DOM or browser globals (document, window, localStorage) if targeting Tier 2 files.
- ZERO unseeded Math.random() in simulation logic; use EmberlightPRNG.
- INPUT IMMUTABILITY (AC-06): Never call .shift(), .pop(), or .splice() on context.inputs.

5. EXECUTION DIRECTIVES:
1. Locate the exact //#region and //#endregion matching REGION_TAG.
2. Read the surrounding variables for type context, but confine edits entirely within the region.
3. Preserve all existing JSDoc contracts (@typedef, @param, @returns).
4. Implement REFACTOR_OBJECTIVE cleanly using pure logic and Action-Inversion patterns where applicable.
5. Update or append JSDoc tags if signatures changed.

6. ACCEPTANCE GATE:
- Execute: "node testing/test_sentinel.js" -> Must exit code 0 (127/127 pass).
- If TARGET_FILE is combat.js: Execute "node testing/test_combat_input.js" -> Must exit code 0.
- If TARGET_FILE is runtime.js or input.js: Execute "node testing/test_hotkeys_and_expansion.js" -> Must exit code 0.

7. ROLLBACK PROTOCOL:
If acceptance gates fail and errors cannot be resolved in one subsequent pass, immediately revert TARGET_FILE to its pre-command git state. Do not leave the codebase in an unverified or broken state.

8. OUTPUT FORMAT GUARD:
Return ONLY the raw, executable JavaScript residing inside the specified //#region ... //#endregion block. Do NOT include conversational setup, preambles, or markdown backticks (```).

```

---

### Command 2: `CMD-AUDIT-FARADAY`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-AUDIT-FARADAY-002
PROTOCOL ANCHOR:    VSRP-001 / AC-01 to AC-10
SECURITY / TIER:    Tier 2 Ephemeral Districts (Simulation Engines)
================================================================================

1. GOAL & SCOPE:
Audit, detect, and neutralize all memory isolation leaks, forbidden DOM references, autonomous clocks, and mutable state references in a Tier 2 simulation tenant.

2. PRE-CONDITIONS:
- TARGET_FILE must be classified under Tier 2 (overworld, combat, progression, armory, market, chronicle, relic_forge, lockpick, settings, script, status).

3. PARAMETERS:
- TARGET_FILE: <Path 2 Tier e.g., file, progression.js to>

4. INVARIANTS:
- Zero tolerance for browser primitives: document, window, localStorage, HTMLElement, alert.
- Zero tolerance for autonomous tickers: setTimeout, setInterval, requestAnimationFrame.
- Complete snapshot isolation: reset(snapshot) must sever all references via structuredClone.

5. EXECUTION DIRECTIVES:
1. Scan TARGET_FILE line-by-line for illegal DOM and browser globals. Replace with host context signals or delegate to corresponding Tier 3 renderer.
2. Scan for global unseeded Math.random(). Replace with EmberlightPRNG methods (prng.nextFloat(), prng.choice()).
3. Verify reset(snapshot) uses structuredClone(snapshot) for deep copy isolation.
4. Verify update(dt, context) treats context.inputs as read-only (index iteration only; zero queue mutations).
5. Verify all user interactions are accepted via handleHostAction(action) and emit normalized resolution deltas over EventBus.
6. Verify getModuleInfo() exposes canonical schema: { moduleId, version, protocolVersion, capabilities }.

6. ACCEPTANCE GATE:
- Execute: "node testing/test_sentinel.js"
- Confirm Pass 1 (Faraday Isolation Trap) and Pass 17 (Constitutional Compliance AC-01 to AC-10) pass with zero errors.

7. ROLLBACK PROTOCOL:
If audit refactoring breaks deterministic state reproduction, restore TARGET_FILE and log specific isolation failure lines to terminal diagnostics.

8. OUTPUT FORMAT GUARD:
Provide an itemized audit log of all identified violations (File, Line, Severity, Fix), followed by the complete corrected file.

```

---

### Command 3: `CMD-EXTRACT-MODULE`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-EXTRACT-MODULE-002
PROTOCOL ANCHOR:    VSRP-001 / PMIP-001
SECURITY / TIER:    Tier 2 (Districts), Tier 3 (Peripherals), or Tier 4 (Kernels)
================================================================================

1. GOAL & SCOPE:
Extract a discrete calculation engine, procedural generator, or presentation driver out of a monolith file into a dedicated, flat root-level module.

2. PRE-CONDITIONS:
- Confirm source functions within SOURCE_FILE are extraction-ready (pure inputs, zero parent closure side-effects).
- Baseline "node testing/test_sentinel.js" must be 100% green.

3. PARAMETERS:
- SOURCE_FILE: <Monolith being combat.js e.g., extracted file from,>
- REGION_TAG: <Region DAMAGE FORMULAS [SEC-03] containing e.g., logic move, to>
- NEW_FILE_NAME: <Target combat_calc.js e.g., file, root>
- MODULE_GLOBAL_ID: <Global EmberlightCombatCalc e.g., identifier,>
- TARGET_TIER: <Tier 2, 3, 4 Tier or>

4. INVARIANTS:
- Extracted module must reside directly at the PROJECT ROOT (zero subdirectories).
- SOURCING SSOT: Reference balance tables or schemas MUST be ingested directly from the frozen EmberlightManifest or via parameters. NEVER create duplicate local stat dictionaries.
- Export syntax MUST follow the Universal IIFE Dual-Binding Pattern. NEVER use ES module "export" or "import".

5. EXECUTION DIRECTIVES:
1. Create NEW_FILE_NAME at project root using the standard VSRP-001 header:
   ```javascript
   const MODULE_GLOBAL_ID = (() => {
     // Extracted logic
     return { /* public interface */ };
   })();
   if (typeof window !== 'undefined') window.MODULE_GLOBAL_ID = MODULE_GLOBAL_ID;
   if (typeof module !== 'undefined') module.exports = MODULE_GLOBAL_ID;

```

1. Cut logic from SOURCE_FILE and replace it with delegation calls to MODULE_GLOBAL_ID.
2. Automatically invoke GUCA-CMD-SYNC-TOPOLOGY-001 to register the new file in index.html and all test suites.
3. Update jsconfig.json include list if explicit matching is active.
4. ACCEPTANCE GATE:

* Execute: "node testing/test_sentinel.js" -> Must pass 127/127 checks.
* Verify zero "ReferenceError: MODULE_GLOBAL_ID is not defined" exceptions across headless and browser runtimes.

1. ROLLBACK PROTOCOL:
If extraction causes circular references or breaks test execution, delete NEW_FILE_NAME, revert SOURCE_FILE, and revert topology registrations.

---

### Command 4: `CMD-SYNC-TOPOLOGY`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-SYNC-TOPOLOGY-001
PROTOCOL ANCHOR:    ARCH-001-EMBERLIGHT / ARCH-GAP-FINAL-001
SECURITY / TIER:    Cross-Cutting Engine Infrastructure
================================================================================

1. GOAL & SCOPE:
Synchronize sequential script load orders across the production HTML shell and all headless VM test harnesses whenever files are added, removed, or reordered.

2. PRE-CONDITIONS:
- All target script files must exist physically at the project root.

3. PARAMETERS:
- FILE_TO_REGISTER: <Filename at combat_calc.js e.g., root,>
- DEPENDENCY_AFTER: <Preceding dependency, e.g., prng.js script>

4. INVARIANTS:
- All 5 manifest files MUST remain in 100% strict topological parity at all times:
  1. index.html (<script src="...">)
  2. testing/test_sentinel.js (const scripts = [...])
  3. testing/test_combat_input.js (const scripts = [...])
  4. testing/test_hotkeys_and_expansion.js (const scripts = [...])
  5. testing/test_persistence_wiring.js (const scripts = [...])
- Kernels (Tier 4) MUST load before Districts (Tier 2). Districts MUST load before Runtime (Tier 1).

5. EXECUTION DIRECTIVES:
1. Locate DEPENDENCY_AFTER inside index.html. Insert `<script src="FILE_TO_REGISTER"></script>` immediately after it.
2. Open testing/test_sentinel.js. Insert 'FILE_TO_REGISTER' into the `scripts` array immediately after 'DEPENDENCY_AFTER'.
3. Open testing/test_combat_input.js. Insert 'FILE_TO_REGISTER' in the exact identical array position.
4. Open testing/test_hotkeys_and_expansion.js. Insert 'FILE_TO_REGISTER' in the exact identical array position.
5. Open testing/test_persistence_wiring.js. Insert 'FILE_TO_REGISTER' in the exact identical array position.

6. ACCEPTANCE GATE:
- Execute: "node testing/test_sentinel.js"
- Execute: "node testing/test_combat_input.js"
- Execute: "node testing/test_hotkeys_and_expansion.js"
- Execute: "node testing/test_persistence_wiring.js"
All four test suites must parse, load scripts in context, and exit code 0 with zero VM script-ordering faults.

7. ROLLBACK PROTOCOL:
Remove FILE_TO_REGISTER from all 5 targets if load-order resolution causes an unresolved dependency error.

```

---

### Command 5: `CMD-EXECUTE-GATE`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-EXECUTE-GATE-001
PROTOCOL ANCHOR:    MVP-001 / VSRP-001 / ARCH-GOV-TEST-001
SECURITY / TIER:    Tier 4 Governance (Auditor Gatekeeper)
================================================================================

1. GOAL & SCOPE:
Execute headless verification suites, evaluate Sentinel 19-pass diagnostics, parse failure stack traces, and categorize regressions for automated remediation.

2. PRE-CONDITIONS:
- System Node.js runtime must be accessible via terminal execution.
- No uncommitted file collisions in testing/ directory.

3. PARAMETERS:
- SUITE_TARGET: <ALL COMBAT EXPANSION PERSISTENCE SENTINEL SETTINGS |>

4. INVARIANTS:
- Production code must never be declared complete with less than 127/127 Sentinel checks passing.
- Test suites must be run natively using Node standard library built-ins without npm packages.

5. EXECUTION DIRECTIVES:
1. Execute the command matching SUITE_TARGET:
   - SENTINEL:    node testing/test_sentinel.js
   - COMBAT:      node testing/test_combat_input.js
   - EXPANSION:   node testing/test_hotkeys_and_expansion.js
   - PERSISTENCE: node testing/test_persistence_wiring.js
   - SETTINGS:    node testing/test_input_settings_integration.js
   - ALL:         Execute all five suites sequentially.
2. Intercept process exit code:
   - If Exit Code == 0: Return "[PASS] All architectural assertions validated."
   - If Exit Code != 0: Intercept stderr and stdout.
3. Triage Failure Signature:
   - Identify failing Pass (Pass 1 through Pass 19).
   - Identify violated Acceptance Criteria (AC-01 through AC-10).
   - Extract failing file, line number, and error message from node:assert.
4. Formulate targeted remediation strategy matching the failing subsystem.

6. ACCEPTANCE GATE:
- Terminal output ends with:
  "=== SENTINEL AUDIT 100% SUCCESS: 127/127 CHECKS PASSED ==="
  (or targeted suite 100% success banner).

7. ROLLBACK PROTOCOL:
N/A (Read-only execution command).

```

---

## 4. Framework Evaluation: What / How / Why

### What

A unified, 5-command operational action architecture that translates the architectural laws of `ARCHITECTURE_2.md` and `SKILL.md` into discrete commands.

### How

Commands operate as declarative contracts with standardized interfaces:

* Developers trigger commands manually via IDE snippets or terminal prompts.
* Automated agent scripts parse the `PARAMETERS` block, execute the `EXECUTION DIRECTIVES`, and verify the `ACCEPTANCE GATE` before committing code.

* If any assertion in `auditor.js` or `node:assert` trips, the `ROLLBACK PROTOCOL` prevents dirty state corruption.

### Why

* **Elimination of Agent Drift:** LLMs fail when given open-ended instructions like *"Extract this code into a new file."* They succeed when given a structured protocol that explicitly tells them where to put the file, what export pattern to use, which four test files to update, and what CLI command to verify.

* **Preservation of the 127-Check Gate:** The engine cannot regress as long as `CMD-EXECUTE-GATE` is mandatory prior to completing any task.
