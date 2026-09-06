# 🏛️ Emberlight AI Pre-Flight Compliance Gate & Acceptance Rubric

**Document Identifier:** VSRP-001-AI-GATE  
**Protocol Version:** VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001  
**Classification:** Authoritative AI Pre-Flight Standard & Architectural Governance Rubric  
**Verification Target:** 100% Genuine Sentinel Pass (127/127 Checks • 19 Passes)  

---

## 🧭 Purpose & Scope

This document serves as the **mandatory pre-flight specification** that any AI Agent or human engineer **MUST review and satisfy** before generating, refactoring, or touching code in the Emberlight codebase.

Every single change must strictly adhere to the **4-Tier Sovereign Architecture**, the **VSRP-001 9-Method Contract**, and the **Ten Invariant Acceptance Criteria (`AC-01` through `AC-10`)**.

---

## 🗺️ 1. The 4-Tier Boundary Law (Know Your Layer)

Before writing any line of code, **classify your target file into its exact tier**. You must **NEVER** mix responsibilities across tiers.

``` plain text
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: THE HOST HARNESS                        │
│                     runtime.js & session_store.js                      │
│  • Sole owner of authoritative persistent state (canonicalParty, gold).│
│  • Drives host ticks (hostTick) and dispatches update(dt) to tenants.  │
│  • Executes switchDistrict() and commits sealed resolution deltas.     │
│  • FORBIDDEN: Direct simulation combat math, tile generation logic.    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│     TIER 2: EPHEMERAL DISTRICTS      │  │     TIER 3: PERIPHERAL DRIVERS       │
│         (Simulation Tenants)         │  │        (Presentation Engines)        │
│ • overworld.js, combat.js, etc.      │  │ • combat_renderer.js, map_renderer.js│
│ • OWNS: Rules, math, turns, PRNG,    │  │ • armory_renderer.js, acoustic_sfx.. │
│   stats, damage, sealed delta events.│  │ • OWNS: DOM elements, HTML5 Canvases,│
│ • ZERO DOM references (no document,  │  │   CSS classes, Web Audio playback.   │
│   no window, no canvas, no alert).   │  │ • ZERO simulation authority.         │
│ • ZERO autonomous clocks (no         │  │ • Action Inversion: Emits normalized │
│   setTimeout, setInterval, or RAF).  │  │   action tokens via emit(token).     │
│ • Stepped strictly via update(dt).   │  │ • Renders detached snapshot clones.  │
│ • ZERO Math.random() (use PRNG only).│  │ • Can use Math.random() for visuals. │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 TIER 4: PROCEDURAL MATH KERNELS & SSOT                 │
│         manifest.js, prng.js, dungeon_gen.js, save_manager.js          │
│  • Pure deterministic functions, Mulberry32 PRNG streams, schemas.     │
│  • 100% side-effect-free, frozen structures (Object.freeze).           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 2. The Canonical 20-Point VSRP-001 Acceptance Rubric

Under **VSRP-001 Section 8**, a module or modification is declared **VSRP-001 COMPLIANT** if and only if every condition below evaluates to **PASS**. A single failure results in an overall verdict of **FAIL**.

```text
[ ] 01. All nine canonical interface methods are present and exported:
        { configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy }
[ ] 02. configure() succeeds exactly once; re-configuration throws a lifecycle error.
[ ] 03. Configuration becomes completely immutable prior to runtime execution (deepFreeze / Object.freeze).
[ ] 04. init() binds strictly to host-provided containers without global leaks or window attachments.
[ ] 05. reset(snapshot) produces authoritatively equivalent state regardless of prior session history.
[ ] 06. reset(null) reboots module cleanly to documented baseline default state.
[ ] 07. update(dt) performs simulation only and references no presentation APIs (no document/canvas/DOM).
[ ] 08. update(dt) respects host timestep and contains zero independent clocks (no setTimeout/setInterval/unmanaged RAF).
[ ] 09. render() causes zero mutations to authoritative simulation state (pure functional projection).
[ ] 10. render() causes no lifecycle state transitions (lifecycle remains in READY or RUNNING).
[ ] 11. getState() returns a detached, serializable snapshot with zero live object references (structuredClone).
[ ] 12. Complete round-trip fidelity: getState() -> reset(snapshot) yields authoritatively equivalent state.
[ ] 13. getDiagnostics() produces telemetry with zero simulation side effects.
[ ] 14. getModuleInfo() matches the defined metadata and capability schema ({ moduleId, version, protocolVersion, capabilities }).
[ ] 15. ModuleContext exposes only contract-declared host capabilities and services.
[ ] 16. Input is ingested strictly via canonical action tokens or bitmasks (update(dt, { inputs }) or handleHostAction).
[ ] 17. Cross-boundary communication occurs strictly via declared EventBus channels (<district>:resolved).
[ ] 18. destroy() purges all resources, unbinds handlers; calling destroy() repeatedly is a safe no-op.
[ ] 19. Illegal lifecycle transitions throw explicit, actionable lifecycle errors.
[ ] 20. All exceptions are surfaced to host diagnostics/logging channels without silent suppression.
```

---

## ⚠️ 3. Deadly Anti-Patterns (Immediate Rejection Criteria)

Before committing any file, verify you have **NOT** introduced any of the following:

| Anti-Pattern | Why It Breaks the Architecture | Correct Approach |
|:---|:---|:---|
| **Direct State Mutation** (`canonicalParty[0].hp = 50`) | Bypasses host SSOT, causes desync, breaks save system. | Emit sealed delta envelope (`hostContext.eventBus.publish('<district>:resolved', delta)`). |
| **DOM in Simulation** (`document.getElementById` inside `combat.js`) | Destroys headless testability; breaks Node test runners. | Move DOM logic to Tier-3 presentation driver (`combat_renderer.js`). |
| **Autonomous Clock** (`setTimeout(() => nextTurn(), 500)`) | Breaks deterministic replay, causes race conditions. | Queue task in `scheduledTasks` and advance via `update(dt)`. |
| **Bypassing District Router** (`switchDistrict` inside a child component) | Causes rogue transitions, skips cleanup, leaks active state. | Route through `district_router.js` or emit `district:switch_request`. |
| **Global `Math.random()` in Combat/Dungeons** | Non-deterministic; breaks replay verification (AC-04). | Use `EmberlightPRNG.create(seed).nextFloat()`. |
| **Blocking Browser Primitives** (`alert()`, `prompt()`) | Freezes engine ticker, ruins player immersion. | Use non-blocking status toasts (`notifyStatus()`) or semantic modals. |

---

## 🔄 4. The 5-Step Implementation Runloop

Follow this exact workflow for every task:

``` plain text
1. CLASSIFY ──► Determine component tier (Host, Ephemeral District, Driver, or Math Kernel).
2. BOUND    ──► Enforce Faraday isolation: no DOM in simulation, no state mutation in renderers.
3. CODE     ──► Implement feature using canonical 9-method interface and action inversion tokens.
4. TEST     ──► Run deterministic Node test suites (test_sentinel.js, test_combat_input.js).
5. ATTEST   ──► Confirm all 127 Sentinel checks pass with 100% genuine compliance.
```

---

## 🧪 5. Mandatory Verification Commands

Run these terminal commands after every edit to verify zero entropy:

```bash
# 1. Master Sentinel 19-Pass Verification Battery (127 Checks)
node testing/test_sentinel.js

# 2. Combat Input & Hotkey Verification Suite
node testing/test_combat_input.js

# 3. Combat Victory & State Transition Suite
node testing/test_combat_victory_transition.js

# 4. Save Manager & Persistence Wiring Battery
node testing/test_persistence_wiring.js
```
