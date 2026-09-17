**Document Identifier:** GUCA-CMD-SPEC-002-COMPLETE
**Timestamp:** 2026-09-11T07:30:00-04:00
**Governing Standard:** GUCA-002 / VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001 / MPFS-001
**Index Anchor:** PRS-001

## 1. Architectural Deficit Analysis & Modernized Governance

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   GUCA-002 ENVELOPE & MPFS GOVERNANCE                  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       1. STRUCTURAL OMISSIONS        │  │       2. TOPOLOGY & SSOT PARITY      │
│  • No Pre-condition State Checks     │  │  • SSOT load_order.js drift gate     │
│  • No Rollback / Teardown Directives │  │  • MPFS-001 Staging Membrane standard│
│  • No Explicit Acceptance Assertions │  │  • Multi-Slot Persistence standard   │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

- **Pre-condition Gates:** Commands must never execute against dirty, unverified working directories. Run `node testing/test_sentinel.js` prior to multi-file refactoring.
- **Single Source of Truth (`testing/load_order.js`):** Script dependencies are managed exclusively in `testing/load_order.js`. Manual multi-file array editing is deprecated in favor of `CMD-SYNC-TOPOLOGY` verified by `node testing/gen_html_scripts.js`.
- **MPFS-001 Modular Pipelines:** Subsystem partitioning creates domain subdirectories (`manifest/`, `combat/`, `battler_baker/`, `pseudo_3d/`, `auditor/`) with temporary staging membranes (`window._*Internal`) consumed and sealed by root facades.
- **127-Check Gatekeeper:** Commands require terminal attestation of the 19 Sentinel passes before completion.

---

## 2. GUCA Canonical Envelope Standard

Every command within the Phoenix / Emberlight stack must adhere to this 7-section structural envelope:

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-<NAME>-<VERSION>
PROTOCOL ANCHOR:    <Standard, e.g., VSRP-001 / PMIP-001 / MPFS-001>
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
- Verify TARGET_FILE exists at the project root or within a valid MPFS-001 domain subdirectory.
- Execute "node testing/test_sentinel.js" to confirm working baseline is 100% GREEN (127/127 checks passing) before making any changes.

3. PARAMETERS:
- TARGET_FILE: <Path to file, e.g., combat/combat_calc.js or combat.js>
- REGION_TAG: <Anchor tag, e.g., [SEC-03] DAMAGE FORMULAS>
- REFACTOR_OBJECTIVE: <Precise description of the functional change>

4. INVARIANTS:
- NEVER modify code outside the targeted //#region and //#endregion block.
- ZERO DOM or browser globals (document, window, localStorage) if targeting Tier 2 files.
- ZERO unseeded Math.random() in simulation logic; use EmberlightPRNG.
- INPUT IMMUTABILITY (AC-06): Never mutate context.inputs directly.

5. EXECUTION DIRECTIVES:
1. Locate the exact //#region and //#endregion matching REGION_TAG.
2. Read the surrounding variables for type context, but confine edits entirely within the region.
3. Preserve all existing JSDoc contracts (@typedef, @param, @returns).
4. Implement REFACTOR_OBJECTIVE cleanly using pure logic and Action-Inversion patterns.
5. Update or append JSDoc tags if signatures changed.

6. ACCEPTANCE GATE:
- Execute: "node testing/test_sentinel.js" -> Must exit code 0 (127/127 pass).
- If TARGET_FILE is in combat domain: Execute "node testing/test_combat_input.js" -> Must exit code 0.
- If TARGET_FILE is runtime.js or input.js: Execute "node testing/test_hotkeys_and_expansion.js" -> Must exit code 0.

7. ROLLBACK PROTOCOL:
If acceptance gates fail and errors cannot be resolved in one subsequent pass, immediately revert TARGET_FILE to its pre-command state.

8. OUTPUT FORMAT GUARD:
Return ONLY the raw, executable JavaScript residing inside the specified //#region ... //#endregion block.
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
- TARGET_FILE must be classified under Tier 2 (combat, overworld, progression, armory, market, chronicle, relic_forge, lockpick, settings, script, status, dungeon_gen).

3. PARAMETERS:
- TARGET_FILE: <Path to Tier 2 file, e.g., progression.js>

4. INVARIANTS:
- Zero tolerance for browser primitives: document, window, localStorage, HTMLElement, alert.
- Zero tolerance for autonomous tickers: setTimeout, setInterval, requestAnimationFrame.
- Complete snapshot isolation: reset(snapshot) must sever all references via structuredClone.

5. EXECUTION DIRECTIVES:
1. Scan TARGET_FILE line-by-line for illegal DOM and browser globals. Replace with host context signals or delegate to corresponding Tier 3 renderer.
2. Scan for global unseeded Math.random(). Replace with methods (prng.nextFloat(), prng.choice()).
3. Verify reset(snapshot) uses structuredClone(snapshot) for deep copy isolation.
4. Verify update(dt, context) treats context.inputs as read-only (index iteration only; zero queue mutations).
5. Verify all user interactions are accepted via handleHostAction(action) and emit normalized resolution deltas over EventBus.
6. Verify getModuleInfo() exposes canonical schema: { moduleId, version, protocolVersion, capabilities }.

6. ACCEPTANCE GATE:
- Execute: "node testing/test_sentinel.js"
- Confirm Pass 1 (Faraday Isolation Trap) and Pass 17 (Constitutional Compliance AC-01 to AC-10) pass with zero errors.

7. ROLLBACK PROTOCOL:
If audit refactoring breaks deterministic state reproduction, restore TARGET_FILE and log specific isolation failure lines to terminal diagnostics.
```

---

### Command 3: `CMD-EXTRACT-MODULE`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-EXTRACT-MODULE-002
PROTOCOL ANCHOR:    VSRP-001 / PMIP-001 / MPFS-001
SECURITY / TIER:    Tier 2 (Districts), Tier 3 (Peripherals), or Tier 4 (Kernels)
================================================================================

1. GOAL & SCOPE:
Extract a discrete calculation engine, procedural generator, or presentation driver out of a monolith file into a standalone module or MPFS-001 domain sub-module.

2. PRE-CONDITIONS:
- Confirm source functions within SOURCE_FILE are extraction-ready (pure inputs, zero parent closure side-effects).
- Baseline "node testing/test_sentinel.js" must be 100% green (127/127).

3. PARAMETERS:
- SOURCE_FILE: <Monolith file, e.g., combat.js>
- REGION_TAG: <Region tag, e.g., [SEC-03] DAMAGE FORMULAS>
- NEW_FILE_NAME: <Target file path, e.g., combat/combat_calc.js or standalone at root>
- MODULE_GLOBAL_ID: <Staging membrane key or global ID, e.g., window._CombatInternal.calc or EmberlightCombatCalc>
- IS_MPFS_SUBMODULE: <true | false>

4. INVARIANTS:
- If IS_MPFS_SUBMODULE is true:
  - File MUST reside in one of the 5 canonical domain folders: manifest/, combat/, battler_baker/, pseudo_3d/, auditor/.
  - Must populate the corresponding Faraday Staging Membrane (e.g., window._CombatInternal).
  - Root facade MUST ingest, deep-freeze, export, and delete the staging membrane.
- If IS_MPFS_SUBMODULE is false:
  - File resides directly at the project root using Universal IIFE Dual-Binding Pattern.
- Reference balance tables or schemas MUST be ingested directly from the frozen EmberlightManifest.
- Export syntax MUST NEVER use ES module "export" or "import".

5. EXECUTION DIRECTIVES:
1. Create NEW_FILE_NAME adhering to either the MPFS staging membrane pattern or root IIFE pattern.
2. Cut logic from SOURCE_FILE and delegate calls to the newly extracted methods.
3. Automatically invoke GUCA-CMD-SYNC-TOPOLOGY-002 to register NEW_FILE_NAME in testing/load_order.js and index.html.
4. Execute "node testing/gen_html_scripts.js" to confirm load-order parity.

6. ACCEPTANCE GATE:
- Execute: "node testing/gen_html_scripts.js" -> Must exit code 0.
- Execute: "node testing/test_sentinel.js" -> Must pass 127/127 checks.

7. ROLLBACK PROTOCOL:
If extraction causes circular dependencies or breaks test execution, delete NEW_FILE_NAME, revert SOURCE_FILE, and revert load_order.js registrations.
```

---

### Command 4: `CMD-SYNC-TOPOLOGY`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-SYNC-TOPOLOGY-002
PROTOCOL ANCHOR:    ARCH-001-EMBERLIGHT / MPFS-001 / LOAD-ORDER-SSOT
SECURITY / TIER:    Cross-Cutting Engine Infrastructure
================================================================================

1. GOAL & SCOPE:
Synchronize sequential script load orders across testing/load_order.js (SSOT) and index.html whenever files are added, removed, or reordered.

2. PRE-CONDITIONS:
- All target script files must exist physically in the repository.

3. PARAMETERS:
- FILE_TO_REGISTER: <Relative script path, e.g., combat/combat_calc.js or save_manager.js>
- DEPENDENCY_AFTER: <Preceding dependency path, e.g., progression.js>

4. INVARIANTS:
- testing/load_order.js is the authoritative Single Source of Truth (SSOT).
- index.html must remain a strict browser-subset superset of testing/load_order.js (minus headless-only scripts like script.js).
- Kernels (Tier 4) MUST load before Districts (Tier 2). Districts MUST load before Runtime (Tier 1).

5. EXECUTION DIRECTIVES:
1. Open testing/load_order.js. Insert 'FILE_TO_REGISTER' into EMBERLIGHT_SCRIPT_LOAD_ORDER immediately after 'DEPENDENCY_AFTER'.
2. Open index.html. Insert `<script src="FILE_TO_REGISTER"></script>` in the matching sequential position.
3. Execute "node testing/gen_html_scripts.js" to verify zero drift.

6. ACCEPTANCE GATE:
- Execute: "node testing/gen_html_scripts.js" -> Must exit code 0 ("No drift detected").
- Execute: "node testing/test_sentinel.js" -> Must exit code 0 (127/127 checks passed).

7. ROLLBACK PROTOCOL:
Remove FILE_TO_REGISTER from testing/load_order.js and index.html if load-order resolution causes an unresolved dependency error.
```

---

### Command 5: `CMD-EXECUTE-GATE`

```text
================================================================================
COMMAND IDENTIFIER: GUCA-CMD-EXECUTE-GATE-002
PROTOCOL ANCHOR:    MVP-001 / VSRP-001 / ARCH-GOV-TEST-001
SECURITY / TIER:    Tier 4 Governance (Auditor Gatekeeper)
================================================================================

1. GOAL & SCOPE:
Execute headless verification suites, evaluate Sentinel 19-pass diagnostics, verify load-order drift, parse failure stack traces, and categorize regressions for automated remediation.

2. PRE-CONDITIONS:
- System Node.js runtime must be accessible via terminal execution.
- No uncommitted file collisions in testing/ directory.

3. PARAMETERS:
- SUITE_TARGET: <ALL | SENTINEL | DRIFT | COMBAT | EXPANSION | PERSISTENCE | SETTINGS>

4. INVARIANTS:
- Production code must never be declared complete with less than 127/127 Sentinel checks passing.
- Script load order must have 0 drift against testing/load_order.js.
- Test suites must run natively using Node standard library built-ins without npm packages.

5. EXECUTION DIRECTIVES:
1. Execute the command matching SUITE_TARGET:
   - SENTINEL:    node testing/test_sentinel.js
   - DRIFT:       node testing/gen_html_scripts.js
   - COMBAT:      node testing/test_combat_input.js
   - EXPANSION:   node testing/test_hotkeys_and_expansion.js
   - PERSISTENCE: node testing/test_persistence_wiring.js
   - SETTINGS:    node testing/test_input_settings_integration.js
   - ALL:         node testing/gen_html_scripts.js && node testing/test_sentinel.js
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
  and "[OK] No drift detected."

7. ROLLBACK PROTOCOL:
N/A (Read-only execution command).
```

---

## 4. Framework Evaluation: What / How / Why

### What

A unified, 5-command operational action architecture that translates the architectural laws of `ARCHITECTURE_2.md`, `SKILL.md`, and `MPFS-001` into deterministic execution commands.

### How

Commands operate as declarative contracts with standardized interfaces:

- Developers trigger commands manually or via agent instructions.
- Agents parse the `PARAMETERS` block, follow the `EXECUTION DIRECTIVES`, register load order in `testing/load_order.js`, and verify via `CMD-EXECUTE-GATE`.
- If any assertion trips in `auditor.js` or `node:assert`, the `ROLLBACK PROTOCOL` prevents dirty state corruption.

### Why

- **Elimination of Agent Drift:** Enforces unambiguous rules for file locations, IIFE dual-binding exports, MPFS staging membranes, and load-order registration.
- **Preservation of the 127-Check Gate:** The engine cannot regress as long as `CMD-EXECUTE-GATE` is mandatory prior to completing any task.
