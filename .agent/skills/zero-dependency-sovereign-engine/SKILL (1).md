---
name: zero-dependency-sovereign-engine
description: Enforces flat-directory engine topology, zero-npm boundaries, VSRP-001 Faraday isolation, Action-Inversion contracts, and headless Node test execution.
globs: "*.js, index.html, index.css, testing/*.js, data/settings.json"
alwaysApply: true
version: 2.2.0
---

# AGENT OPERATIONAL SPECIFICATION: Zero-Dependency Sovereign Engine

**Document Identifier:** SKILL-EMBERLIGHT-002-LOCKED
**Protocol Version:** VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001
**Timestamp:** 2026-09-06T13:20:00-04:00
**Environment:** Pure Vanilla Browser Engine (Zero npm Dependencies) + Native Node Headless Test Harnesses

---

## 1. Non-Negotiable Environmental Invariants

You are operating on a browser-native game engine whose core source modules reside in a single flat root directory. You MUST strictly adhere to the following boundaries:

1. **ZERO NPM / PACKAGE-MANAGER DEPENDENCIES:**
   - NEVER suggest, run, or generate `npm`, `npx`, `yarn`, `pnpm`, or `bun`.
   - NEVER create, modify, or assume the existence of `package.json`, `package-lock.json`, or a `node_modules/` directory.
   - ALL game engine code must execute natively in modern browsers via pure ES2022+, standard CSS, and semantic HTML5.

2. **STATIC ANALYSIS & LINTER AWARENESS (ZERO-DEPENDENCY):**
   - Code hygiene is governed natively via VS Code's internal TypeScript/JavaScript language service (`jsconfig.json` with `checkJs: true`).
   - NEVER suggest or create `.eslintrc`, `.prettierrc`, or external linter configuration files.
   - Code edits MUST NOT introduce undeclared variables, implicit global assignments, or unused references that trigger static diagnostic squiggles.

3. **PERMITTED HEADLESS NODE TEST EXECUTION:**
   - You ARE authorized and required to execute the test scripts in `testing/` using system-level `node`.
   - These test harnesses run strictly on Node's native built-in standard library (`node:vm`, `node:fs`, `node:path`, `node:assert`) with ZERO external packages.
   - NEVER introduce third-party test libraries (e.g., Jest, Mocha, Chai, Vitest, JSDOM).

4. **FLAT SOURCE TOPOLOGY & DIRECTORY BOUNDARIES:**
   - ALL core engine source modules, master styles (`index.css`), and host HTML shells (`index.html`) reside strictly at the PROJECT ROOT.
   - NEVER create source code subdirectories (e.g., `/src`, `/lib`, `/core`, `/dist`).
   - The only valid subdirectories are `/testing` (headless VM test scripts) and `/data` (immutable JSON manifests).
   - Local engine script imports and references MUST use flat relative paths (e.g., `./manifest.js`).

5. **NO ES MODULE SYNTAX (DUAL-BINDING IIFE PATTERN):**
   - NEVER use `import ... from` or `export default / export const` in engine source files. Engine files are evaluated as global scripts in both the browser and `node:vm`.
   - All modules MUST export via the Universal IIFE Dual-Binding Pattern:

     ```javascript
     const EmberlightModuleName = (() => {
       // Private simulation/driver closure
       return { /* public interface */ };
     })();

     if (typeof window !== 'undefined') window.EmberlightModuleName = EmberlightModuleName;
     if (typeof module !== 'undefined') module.exports = EmberlightModuleName;
     ```

6. **TOPOLOGICAL LOAD-ORDER SYNCHRONIZATION:**
   - Because scripts are loaded sequentially without bundlers, load order matters.
   - If you create or rename any script, you MUST register it in topological dependency order in TWO places:
     1. As a `<script src="..."></script>` tag in `index.html`.
     2. In the `scripts` array across all test suites: `testing/test_sentinel.js`, `testing/test_combat_input.js`, `testing/test_hotkeys_and_expansion.js`, and `testing/test_persistence_wiring.js`.

7. **FARADAY TENANT ISOLATION & DEEP CLONING (VSRP-001):**
   - Tier 2 Simulation Tenants (`combat.js`, `overworld.js`, `progression.js`, etc.) MUST remain pure headless state machines operating in private closures.
   - Tier 2 code MUST NEVER reference DOM or browser globals (`document`, `window`, `localStorage`, `HTMLElement`, `alert`).
   - Snapshot ingestion inside `reset(snapshot)` MUST use `structuredClone(snapshot)` to sever all object references. Shallow copies (`{ ...snapshot }`) violate AC-02.
   - State mutations leave simulation tenants exclusively via sealed delta envelopes published to `eventBus`.

8. **DETERMINISTIC ENTROPY & PRNG FORK STREAMING (MULBERRY32):**
   - Global unseeded `Math.random()` is STRICTLY FORBIDDEN in all simulation logic (Tier 2).
   - All procedural generation, dice rolls, critical hit checks, encounter calculations, and relic forging MUST use `EmberlightPRNG` (`prng.js`).
   - **PRNG State Ingestion & Branching:** The PRNG stream must ingest seed snapshots deterministically and support non-destructive cloning via `prng.fork()`. Lookahead forecasting (e.g., Threat Oracle damage predictions) MUST operate on forked streams to prevent corrupting the authoritative simulation entropy thread.
   - Tier 3 presentation drivers MAY use `Math.random()` strictly for visual particle dispersion and acoustic jitter.

---

## 2. Component Tier Classification & Action-Inversion Matrix

Before writing or editing code, identify the target file's tier and obey its authority boundaries:

| Tier | Resident Files | Authority & Strict Boundaries |
| :--- | :--- | :--- |
| **Tier 1: Host Harness** | `runtime.js`, `session_store.js`, `event_bus.js`, `district_router.js`, `world_ecology.js`, `save_manager.js` | Owns persistent SSOT (`canonicalParty`, `canonicalGold`, inventory), lifecycle orchestration, transactional commits, and event arbitration. Direct simulation combat math and direct presentation DOM rendering are forbidden. |
| **Tier 2: Ephemeral Districts** | `combat.js`, `overworld.js`, `script.js`, `armory.js`, `progression.js`, `status.js`, `market.js`, `chronicle.js`, `relic_forge.js`, `lockpick.js`, `settings.js` | Headless simulation closures implementing the 9-method VSRP-001 contract. Zero DOM, zero autonomous clocks (`setTimeout`, `setInterval`, RAF), zero global `Math.random()`. **Interactive Communication:** Tier 2 tenants must NEVER call Tier 3 presentation handlers directly. All user inputs and control signals MUST be ingested via normalized action tokens (`handleHostAction(action)`), preserving 100% headless testability. |
| **Tier 3: Peripheral Drivers** | `combat_renderer.js`, `map_renderer.js`, `armory_renderer.js`, `chronicle_renderer.js`, `progression_renderer.js`, `market_renderer.js`, `status_renderer.js`, `relic_forge_renderer.js`, `cockpit_renderer.js`, `acoustic_sfx.js`, `synth_soundtrack.js`, `synthetic_voice.js`, `input.js`, `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js`, `battler_baker.js`, `battle_backdrop.js`, `combat_vfx.js`, `dynamic_lights.js`, `pseudo_3d_renderer.js`, `shader_compositor.js`, `threat_oracle.js` | Pure presentation and hardware translation. Owns DOM elements, canvas buffers, CSS classes, Web Audio synthesis, and hardware input normalization. ZERO simulation authority. Communicates strictly by emitting normalized action tokens to callbacks. |
| **Tier 4: Kernels & Gatekeepers** | `manifest.js`, `prng.js`, `dungeon_gen.js`, `auditor.js` | Pure deterministic math kernels, static schema SSOT (frozen via `Object.freeze`), procedural floor carvers, and the 19-pass verification gate. |

---

## 3. Large File Editing & Partitioning Rules

When modifying files exceeding 500 lines (e.g., `combat.js`, `runtime.js`, `manifest.js`):

1. **Read Table of Contents & Anchors First:**
   - Inspect lines 1–60 to find the file's architectural index and locate the exact section anchor (e.g., `[SEC-03] DAMAGE FORMULAS`).
2. **Confine Edits Strictly to `#region` Boundaries:**
   - Code is partitioned into collapsible native regions:
     - JavaScript: `//#region [SEC-XX] NAME` ... `//#endregion`
     - CSS: `/* #region [CSS-XX] NAME */` ... `/* #endregion */`
     - HTML: `<!-- #region [DOM-XX] NAME -->` ... `<!-- #endregion -->`
   - Keep modifications bounded inside the relevant `#region` block.
   - NEVER leak closure-scoped variables across region boundaries.
   - NEVER delete, rename, or collapse region headers without an explicit refactoring instruction.
3. **Preserve JSDoc Type Contracts:**
   - Maintain all `@typedef`, `@param`, and `@returns` annotations to preserve VS Code's `checkJs: true` static type analysis and ensure calculation functions remain extraction-ready.

---

## 4. Automated Verification & Sentinel Gatekeeper Suite

You MUST verify your code modifications using the built-in headless test harnesses before declaring any task complete.

### Master Verification Gate (Mandatory Run)

After any architectural or functional modification, execute the master 19-pass Sentinel verification suite:

```bash
node testing/test_sentinel.js

```

- **What:** Spawns an isolated `node:vm` context, loads all engine scripts, boots `GameRuntime`, and executes `EmberlightAuditor` across all 19 passes (127/127 checks).
- **Invariant Assertions:** Asserts VSRP-001 9-method compliance, Faraday memory isolation, deterministic Mulberry32 PRNG authority, formation shielding, boss enrage phases, persistence compression (<2.5KB), and EventBus listener teardown.
- **Acceptance Criteria:** The script MUST exit with code 0:
`=== SENTINEL AUDIT 100% SUCCESS: 127/127 CHECKS PASSED ===`

### Targeted Subsystem Test Suites

When modifying specific engine domains, run the corresponding targeted test suite:

- **Combat Input, Command Hub & Tab Hotkeys:**

```bash
node testing/test_combat_input.js

```

- **Viewport Expansion & 3D Crawler Kinematics:**

```bash
node testing/test_hotkeys_and_expansion.js

```

- **Combat Victory Lifecycle & Transitions:**

```bash
node testing/test_combat_victory_transition.js

```

- **Persistence, Migrations & Storage Faults:**

```bash
node testing/test_persistence_wiring.js

```

- **Decoupled Input & Centralized Settings SSOT:**

```bash
node testing/test_input_settings_integration.js

```

### Static Oracle Cross-Reference

Before writing code, inspect the corresponding pass in `auditor.js` to ensure your implementation satisfies the exact assertions that the test runner enforces:

- **Lifecycle & Faraday Traps:** Pass 1 & Pass 17 (`AC-01` to `AC-10`)
- **Combat Simulation & Damage Formulas:** Pass 2
- **Overworld Navigation & Collision:** Pass 3 & Pass 15
- **Market Commerce & Purse Deltas:** Pass 4
- **Progression Constellation Graph & Respec:** Pass 5
- **Harmonic Lockpick Waves:** Pass 6
- **Relic Forge Determinism:** Pass 7
- **Pseudo-3D Raycaster & Buffer Telemetry:** Pass 8 & Pass 12
- **SDCP Capabilities & Anti-Entropy Seal:** Pass 9
- **Formation Shielding & Vanguard Interception:** Pass 10
- **Boss Enrage Phases & Status Ailment DOTs:** Pass 11
- **Persistence Compression & EventBus Teardown:** Pass 13
- **Battler Paper-Doll Art & Biome Backdrops:** Pass 14
- **Surfacing & Stat Projections:** Pass 16
- **Tactical Displacement (Knockback / Pull):** Pass 18
- **Deep Analysis Workstation & ECG Oscilloscope:** Pass 19

---

## 5. Remediation Protocol for Test Failures

If executing any test harness emits an assertion failure or non-zero exit code:

1. **Analyze the Trace:** Read the exact error message and stack trace emitted by `node:assert`.
2. **Isolate the Violation:** Determine whether the failure was caused by a contract violation, a Faraday isolation breach, or a mathematical divergence.
3. **Self-Correct & Re-Run:** Refactor the code strictly within its tier boundaries and re-run the failed test script until it passes cleanly.
4. **Final Gate Attestation:** Re-run `node testing/test_sentinel.js` to confirm no secondary regressions were introduced across the other 18 passes.
