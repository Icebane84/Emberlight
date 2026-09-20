---
name: zero-dependency-sovereign-engine
description: Enforces flat-directory and MPFS-001 modular pipeline topology, zero-npm boundaries, VSRP-001 Faraday isolation, load_order.js SSOT governance, Action-Inversion contracts, and headless Node test execution.
globs: "*.js, index.html, index.css, testing/*.js, data/settings.json, manifest/*.js, combat/*.js, battler_baker/*.js, pseudo_3d/*.js, auditor/*.js"
alwaysApply: true
version: 3.0.0
---

# AGENT OPERATIONAL SPECIFICATION: Zero-Dependency Sovereign Engine

**Document Identifier:** SKILL-EMBERLIGHT-003-LOCKED
**Protocol Version:** VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001 / MPFS-001
**Timestamp:** 2026-09-11T07:30:00-04:00
**Environment:** Pure Vanilla Browser Engine (Zero npm Dependencies) + Native Node Headless Test Harnesses

---

## 1. Non-Negotiable Environmental Invariants

You are operating on a browser-native game engine whose architecture is governed by pure zero-npm execution, single-source load order, Faraday tenant isolation, and MPFS-001 modular pipelines. You MUST strictly adhere to the following boundaries:

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

4. **DIRECTORY TOPOLOGY & MPFS-001 MODULAR PIPELINES:**
   - Standalone engine modules, master styles (`index.css`), and host HTML shells (`index.html`) reside at the PROJECT ROOT.
   - **Permitted Domain Subdirectories (MPFS-001):** Sub-modules are strictly confined to the canonical domain directories:
      - `manifest/` (static configuration, actors, items, progression, world, narrative, calculators)
      - `combat/` (calculation, displacement, queue, AI, projection, backdrop, vfx, state)
      - `dynamic_lights/` (primitives, shadows, emitters, pipeline)
      - `battler_baker/` (primitives, heroes, equipment, enemies, pipeline)
      - `pseudo_3d/` (textures, DDA raycaster, billboards, pipeline)
      - `auditor/` (kernel, contracts, district sims, combat extended, persistence, constitutional, endgame)
      - `data/` (raw data tables, bestiary, abilities, encounters)
      - `map/` (spatial hashing, pathfinding, fog of war, tile partitions)
      - `runtime/` (navigation, HUD state machines, modal coordinators)
      - `dungeon_gen/` (BSP trees, cellular automata, room placement)
      - `phoenix/` (Governor, Web IDE substrate, WebLLM bridge, Monolith Exporter)
   - **Faraday Staging Membrane Pattern:** Domain sub-modules populate temporary staging objects (e.g., `window._ManifestInternal`, `window._CombatInternal`, `window._DynamicLightsInternal`, `window._BattlerBakerInternal`, `window._Pseudo3DInternal`, `window._AuditorInternal`).
   - **Root Facade Sealing:** The corresponding root facade (`manifest.js`, `combat.js`, `dynamic_lights.js`, `battler_baker.js`, `pseudo_3d_renderer.js`, `auditor.js`) ingests the staging membrane, seals/freezes it into the public singleton (`EmberlightManifest`, `EmberlightCombat`, `EmberlightDynamicLights`, etc.), and completely purges the staging object (`delete window._*Internal`).
   - **Banned Directories:** NEVER create arbitrary nested subdirectories (e.g., `/src`, `/lib`, `/core`, `/dist`, `/components`, `/utils`).

5. **NO ES MODULE SYNTAX (DUAL-BINDING IIFE PATTERN):**
   - NEVER use `import ... from` or `export default / export const` in engine source files. Engine files are evaluated as global scripts in both the browser and `node:vm`.
   - All modules MUST export via the Universal IIFE Dual-Binding Pattern:

     ```javascript
     const EmberlightModuleName = (() => {
       // Private simulation/driver closure
       return {
         /* public interface */
       };
     })();

     if (typeof window !== "undefined")
       window.EmberlightModuleName = EmberlightModuleName;
     if (typeof module !== "undefined") module.exports = EmberlightModuleName;
     ```

6. **AMBIENT TYPE SCHEMA FACADES & JSDOC GOVERNANCE (`globals.d.ts`):**
   - Type contracts and schema facades are maintained in `globals.d.ts` for zero-build VS Code and AI context grounding (`checkJs: true`).
   - **The Ambient Rule (No `export`):** `globals.d.ts` MUST NEVER use top-level `export` or `import` statements; doing so isolates the file into an ES module and breaks ambient global discovery for vanilla JS scripts.
   - **Ambient Identifier Declarations:** CommonJS module singletons (`EmberlightManifest`, `EmberlightCombat`, `_CombatInternal`, `_DynamicLightsInternal`) are declared via top-level `declare var [Name]: any;` in `globals.d.ts`.
   - **Type-Safe EventBus Generics:** Pub/sub channels are typed via `EmberlightEventMap` using generic JSDoc constraints: `@template {string & keyof EmberlightEventMap} T`.

7. **TOPOLOGICAL LOAD-ORDER SSOT GOVERNANCE (`testing/load_order.js`):**
   - Sequential script evaluation order is authored in exactly ONE single source of truth: `testing/load_order.js`.
   - When adding, removing, or reordering any module:
     1. Insert the script path in dependency order into `testing/load_order.js`.
     2. Insert the corresponding `<script src="..."></script>` tag in `index.html`.
     3. Run `node testing/gen_html_scripts.js` to assert zero drift between the SSOT and `index.html`.
     4. Run `node testing/run_all_tests.js` to assert 100% test pass across all 3 suites.

8. **FARADAY TENANT ISOLATION & DEEP CLONING (VSRP-001):**
   - Tier 2 Simulation Tenants (`combat.js`, `overworld.js`, `progression.js`, `armory.js`, `market.js`, `chronicle.js`, `status.js`, `relic_forge.js`, `lockpick.js`, `dungeon_gen.js`, `settings.js`) MUST remain pure headless state machines operating in private closures.
   - Tier 2 code MUST NEVER reference DOM or browser globals (`document`, `window`, `localStorage`, `HTMLElement`, `alert`).
   - Snapshot ingestion inside `reset(snapshot)` MUST use `structuredClone(snapshot)` to sever all object references. Shallow copies violate AC-02.
   - State mutations leave simulation tenants exclusively via sealed delta envelopes published to `eventBus`.

9. **DETERMINISTIC ENTROPY & PRNG FORK STREAMING (MULBERRY32):**
   - Global unseeded `Math.random()` is STRICTLY FORBIDDEN in all simulation logic (Tier 2 and Tier 4).
   - All procedural generation, dice rolls, critical hit checks, encounter calculations, and relic forging MUST use `EmberlightPRNG` (`prng.js`).
   - Lookahead forecasting (e.g., Threat Oracle damage predictions) MUST operate on forked streams (`prng.fork()`) to prevent corrupting the authoritative simulation entropy thread.
   - Tier 3 presentation drivers MAY use `Math.random()` strictly for visual particle dispersion and acoustic jitter.

10. **MULTI-SLOT PERSISTENCE & STORAGE ISOLATION (v1.4.0):**
    - Persistence is orchestrated exclusively via `save_manager.js`.
    - Supports multi-slot storage (`SLOT_1`, `SLOT_2`, `SLOT_3`, `AUTO_SAVE`) with metadata descriptors and sparse coordinate delta compression (<2.5KB budget).
    - State rehydration must run through schema migration (`_autoMigrateLegacy()`) to safeguard backward compatibility.

11. **DEDICATED TITLE SCREEN & COCKPIT MODAL TOPOLOGY:**
    - The title screen runs in `#game-cockpit.title-mode`, decoupling title navigation and save slot management from the active game session.
    - District modals (Shop, Forge, Audit) are triggered via in-world interaction gateways (`@`/`$` for Market, `B`/`F` for Forge), keeping the command bar uncluttered and context-aware.

---

## 2. Component Tier Classification & 76-Module Authority Matrix

Before writing or editing code, identify the target file's tier and obey its authority boundaries:

| Tier | Resident Modules (76 Canonical Files) | Authority & Strict Boundaries |
| :--- | :--- | :--- |
| **Tier 1: Host Harness & Persistence** | `runtime.js`, `session_store.js`, `event_bus.js`, `district_router.js`, `world_ecology.js`, `save_manager.js`, `input.js`, `index.html` | Owns persistent SSOT (`canonicalParty`, `canonicalGold`, inventory, quest state), lifecycle orchestration, transactional commits, multi-slot persistence, and event arbitration. Direct simulation combat math and direct presentation DOM rendering are forbidden. |
| **Tier 2: Ephemeral Districts (11 Simulation Tenants)** | `combat.js` (+ `combat/*.js`), `overworld.js`, `progression.js`, `armory.js`, `market.js`, `chronicle.js`, `status.js`, `relic_forge.js`, `dungeon_gen.js`, `lockpick.js`, `settings.js`, `script.js` | Headless simulation closures implementing the 9-method VSRP-001 contract. Zero DOM, zero autonomous clocks (`setTimeout`, `setInterval`, RAF), zero global `Math.random()`. User inputs and control signals are ingested exclusively via normalized action tokens (`handleHostAction(action)`). |
| **Tier 3: Peripheral Drivers & Renderers** | `combat_renderer.js`, `map_renderer.js`, `armory_renderer.js`, `chronicle_renderer.js`, `progression_renderer.js`, `market_renderer.js`, `status_renderer.js`, `relic_forge_renderer.js`, `cockpit_renderer.js`, `pseudo_3d_renderer.js` (+ `pseudo_3d/*.js`), `battler_baker.js` (+ `battler_baker/*.js`), `battle_backdrop.js`, `combat_vfx.js`, `dynamic_lights.js` (+ `dynamic_lights/*.js`), `shader_compositor.js`, `threat_oracle.js`, `acoustic_sfx.js`, `synth_soundtrack.js`, `synthetic_voice.js`, `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js` | Pure presentation, canvas graphics, asset baking, audio synthesis, and hardware input normalization. ZERO simulation authority. Communicates strictly by emitting normalized action tokens to callbacks or listening to EventBus deltas. |
| **Tier 4: Kernels & Gatekeepers** | `manifest.js` (+ `manifest/*.js`), `prng.js`, `auditor.js` (+ `auditor/*.js`), `globals.d.ts` | Pure deterministic math kernels, static schema SSOT (frozen via `Object.freeze`), procedural generation algorithms, ambient TypeScript contracts, and the 21-pass verification gatekeeper. |

---

## 3. Large File Editing & Partitioning Rules

When modifying large or sectioned engine files:

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
   - Maintain all `@typedef`, `@param`, and `@returns` annotations to preserve VS Code's `checkJs: true` static type analysis.

---

## 4. Mandatory 3-Gate Verification Suite

Before completing any task or refactor, you MUST execute and confirm 100% clean passes on all three verification gates:

```bash
# Gate 1: Master Multi-Pass Architectural Sentinel (136/136 checks across 21 passes)
node testing/test_sentinel.js

# Gate 2: Interactive Combat & War Table Battery (18/18 tests)
node testing/test_combat_input.js

# Gate 3: Repository-Wide Static Type & Diagnostic Gate (Zero errors)
node testing/test_types.js
```

### 21-Pass Sentinel Architecture Reference

Before writing code, inspect the corresponding pass in `auditor.js` / `auditor/*.js` to satisfy the exact assertions:

- **Pass 1:** Contract & Faraday Isolation Battery (`AC-01` to `AC-10`)
- **Pass 2:** Headless Combat Simulation (20 Matches, Zero NaN, Zero Leak)
- **Pass 3:** Overworld Simulation & Collision Matrix
- **Pass 4:** Market Commerce & Economy Balance
- **Pass 5:** Progression & Skill Tree Graph Validation (77 Nodes, Respec)
- **Pass 6:** Harmonic Lockpick Resonance & Envelope Battery
- **Pass 7:** Relic Forge Determinism & Economic Envelope Battery
- **Pass 8:** Pseudo-3D Raycaster Headless Buffer & Telemetry Battery
- **Pass 9:** SDCP-001 Capability Registry & Anti-Entropy Seal
- **Pass 10:** Formation Topology & Backline Shielding Invariance
- **Pass 11:** Boss Phase Shaders & Status Ailment Invariance
- **Pass 12:** Dual-Perspective & 3D Raycaster Immersion Battery (960x360 / 75° FOV)
- **Pass 13:** Persistence Compression (<2.5KB) & EventBus Teardown Battery
- **Pass 14:** Battler Sprite Synthesis (10/10 Battlers) & Procedural Backdrops (4 Biomes)
- **Pass 15:** Overworld Mutability, Chest Looting & Navigation Invariance
- **Pass 16:** Surfacing & Legibility Engine Battery (Dynamic Stats, 5 Quests, Pouch)
- **Pass 17:** VSRP-001 Constitutional Compliance Battery (`AC-01` to `AC-10`)
- **Pass 18:** Tactical Displacement & Row Invariance (Knockback / Pull / Boss Immunity)
- **Pass 19:** Deep Analysis Mode & Workstation Architecture (Biometrics, Radar Canvas)
- **Pass 20:** 4-Quadrant War Table Skeleton & Projection Battery (`PMIP-001`)
- **Pass 21:** 4-Quadrant Combat Station Integration Battery (8x6 Grid, Threat Oracle, Hero Chassis)

---

## 5. Remediation Protocol for Test Failures

If executing any test harness emits an assertion failure or non-zero exit code:

1. **Analyze the Trace:** Read the exact error message and stack trace emitted by `node:assert`.
2. **Isolate the Violation:** Determine whether the failure was caused by a contract violation, a Faraday isolation breach, a load order mismatch, or a mathematical divergence.
3. **Self-Correct & Re-Run:** Refactor the code strictly within its tier boundaries and re-run the failed test script until it passes cleanly.
4. **Final Gate Attestation:** Re-run the Mandatory 3-Gate Verification Suite to confirm 100% clean verification across all passes, load-order parity, and static diagnostics.

---

- **Decoupled Input & Centralized Settings SSOT:**

  ```bash
  node testing/test_input_settings_integration.js
  ```

### 19-Pass Sentinel Architecture Reference

Before writing code, inspect the corresponding pass in `auditor.js` / `auditor/*.js` to satisfy the exact assertions:

- **Pass 1:** Contract & Faraday Isolation Battery (`AC-01` to `AC-10`)
- **Pass 2:** Headless Combat Simulation (20 Matches, Zero NaN, Zero Leak)
- **Pass 3:** Overworld Simulation & Collision Matrix
- **Pass 4:** Market Commerce & Economy Balance
- **Pass 5:** Progression & Skill Tree Graph Validation (77 Nodes, Respec)
- **Pass 6:** Harmonic Lockpick Resonance & Envelope Battery
- **Pass 7:** Relic Forge Determinism & Economic Envelope Battery
- **Pass 8:** Pseudo-3D Raycaster Headless Buffer & Telemetry Battery
- **Pass 9:** SDCP-001 Capability Registry & Anti-Entropy Seal
- **Pass 10:** Formation Topology & Backline Shielding Invariance
- **Pass 11:** Boss Phase Shaders & Status Ailment Invariance
- **Pass 12:** Dual-Perspective & 3D Raycaster Immersion Battery (960x360 / 75° FOV)
- **Pass 13:** Persistence Compression (<2.5KB) & EventBus Teardown Battery
- **Pass 14:** Battler Sprite Synthesis (10/10 Battlers) & Procedural Backdrops (4 Biomes)
- **Pass 15:** Overworld Mutability, Chest Looting & Navigation Invariance
- **Pass 16:** Surfacing & Legibility Engine Battery (Dynamic Stats, 5 Quests, Pouch)
- **Pass 17:** VSRP-001 Constitutional Compliance Battery (`AC-01` to `AC-10`)
- **Pass 18:** Tactical Displacement & Row Invariance (Knockback / Pull / Boss Immunity)
- **Pass 19:** Deep Analysis Mode & Workstation Architecture (Biometrics, Radar Canvas)

---

## 5. Remediation Protocol for Test Failures (ERL-001)

If executing any test harness emits an assertion failure or non-zero exit code:

1. **Analyze the Trace:** Read the exact error message and stack trace emitted by `node:assert`.
2. **Consult ERL-001 Ledger:** Match the diagnostic against canonical fingerprints in [`.agent/skills/error-resolution-ledger/SKILL.md`](file:///c:/Users/Chris/Emberlight/.agent/skills/error-resolution-ledger/SKILL.md) (`MATH/RANDOM`, `VSRP/FARADAY_DOM`, `COMPLEXITY/HIGH`, `TYPE/NULLABLE_MAP`, `STATE/SNAPSHOT_MUTATION`).
3. **Apply Canonical Template:** Refactor the code strictly within its tier boundaries using verified templates (e.g. guard clauses and pure JSDoc helpers for complexity) without changing function contracts or mutating host closures.
4. **Final Gate Attestation:** Re-run the Master Battery:

   ```bash
   node testing/run_all_tests.js
   ```

   Confirm 100% clean verification across all passes, load-order parity, and static diagnostics.
