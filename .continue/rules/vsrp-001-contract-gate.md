---
name: VSRP-001 Universal Module Contract & AI Pre-Flight Gate
description: Mandatory pre-flight verification gate for all code touching Emberlight/Phoenix modules.
globs: "**/*.{js,ts,mjs,cjs,json}"
alwaysApply: true
---

# 🏛️ VSRP-001 MANDATORY PRE-FLIGHT COMPLIANCE GATE

You are operating under normative standard **VSRP-001 (Parent Protocol: PMIP-001 / PRS-001)**.
All code changes must strictly maintain the **4-Tier Sovereign Architecture** and **100% Genuine Sentinel Pass (127/127 Checks)**.

---

## ⛔ HARD PRE-CODE EXECUTION CONTRACT

You MUST NOT generate or refactor any implementation code until you output the following verification gate:

```text
=== PRE-FLIGHT COMPLIANCE ATTESTATION ===
1. TARGET TIER: [Tier 1: Host | Tier 2: District | Tier 3: Driver | Tier 4: Math Kernel]
2. 9-METHOD CONTRACT VERIFICATION:
   - Exported: { configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy }
   - configure(): Runs once, deepFreezes config, no DOM/audio/network.
   - reset(snapshot): Pure function, null boots default, identical snapshot = identical state.
   - update(dt): Simulation only. Timestep bound. ZERO unmanaged clocks (no setTimeout/setInterval/RAF).
   - render(): Read-only state. Zero lifecycle mutation. Safe with null/headless renderer.
   - getState(): Detached snapshot via structuredClone / POJO. ZERO live references.
   - destroy(): Releases listeners/handles. Safe no-op on repeat calls.
3. FARADAY BOUNDARY AUDIT:
   - [PASS/FAIL] Zero DOM/window/canvas references in Tier 2/Tier 4.
   - [PASS/FAIL] Zero direct state mutations (emit sealed deltas to Host EventBus).
   - [PASS/FAIL] Zero Math.random() in simulation (Mulberry32 PRNG stream only).
4. POST-EDIT VALIDATION PLAN: [node testing/test_sentinel.js | test_combat_input.js]
VERDICT: [PASS | FAIL]
=========================================
If the verification fails any check, HALT and explain the architectural violation instead of writing code.

🗺️ Architectural Layer Reference
Tier 1 (Host Harness - runtime.js, session_store.js): Authoritative persistent state (canonicalParty, gold). Dispatches update(dt). Forbidden: Simulation math, combat equations.

Tier 2 (Ephemeral Districts - combat.js, overworld.js): Simulation rules, turns, Mulberry32 PRNG. Forbidden: document, window, canvas, setTimeout, setInterval, Math.random().

Tier 3 (Peripheral Drivers - *_renderer.js, audio): DOM manipulation, Canvas rendering, Web Audio. Emits action tokens via emit(token). Zero simulation authority.

Tier 4 (Math Kernels & SSOT - prng.js, manifest.js): Deterministic pure functions, Mulberry32 seeds, schemas. 100% side-effect-free (Object.freeze).

⚠️ Forbidden Constitutional Anti-Patterns
Direct State Mutation: Modifying host state from a tenant (canonicalParty[0].hp = 50).

DOM in Simulation: Any document.getElementById or canvas inside Tier 2.

Autonomous Clocks: Calling setTimeout or setInterval instead of advancing through update(dt).

Bypassing District Router: Calling switchDistrict from inside a child tenant.

Global Randomness: Using Math.random() in combat or procedural generation.
