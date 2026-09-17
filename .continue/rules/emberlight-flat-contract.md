---
name: Emberlight Sovereign Architecture Contract (VSRP-001 & MPFS-001 Protocol)
description: Mandatory 4-Tier Boundary, MPFS-001 Domain Pipelines, and 9-Method Lifecycle enforcement for all workspace operations.
globs: "*.js, manifest/*.js, combat/*.js, battler_baker/*.js, pseudo_3d/*.js, dynamic_lights/*.js, map/*.js, dungeon_gen/*.js, auditor/*.js"
alwaysApply: true
---

# 🏛️ Emberlight Sovereign Architecture Contract (VSRP-001 / MPFS-001 / ARCH-001-EMBERLIGHT / PRS-001)

**Document Identifier:** ARCH-001-EMBERLIGHT
**Governing Standards:** VSRP-001 (Universal Module Contract) / MPFS-001 (Modular Pipeline Faraday Staging)
**Parent Protocols:** PMIP-001 / SDCP-001 / PRS-ARC-020
**Protocol Version:** 6.0.0-LOCKED
**Verification Target:** 100% Genuine Sentinel Pass (136/136 Checks • 21 Passes)

The game executes 100% offline via direct double-click on `index.html` over the `file:///` protocol. ZERO build steps. ZERO npm dependencies. ZERO external network calls. ZERO module bundlers.

================================================================================

1. # WORKSPACE REPOSITORY TOPOLOGY (MPFS-001 DOMAIN PIPELINE INVARIANT)

The workspace is strictly partitioned into standalone root modules and eight canonical domain pipeline directories:

- **FORBIDDEN PATHS:** Zero `src/`, zero `dist/`, zero `build/`, zero `lib/`, zero `app/`, zero `components/`, zero `utils/`.
- **PERMITTED DOMAIN SUBDIRECTORIES (MPFS-001):**
  - `manifest/` (static configuration, actors, items, progression, world, narrative, calculators)
  - `combat/` (calculation, displacement, queue, AI, state, actions, projection, orchestrator)
  - `battler_baker/` (primitives, heroes, equipment, enemies, pipeline)
  - `pseudo_3d/` (textures, DDA raycaster, billboards, pipeline)
  - `dynamic_lights/` (primitives, shadows, emitters, pipeline)
  - `map/` (textures, particles, line-of-sight, compositor)
  - `dungeon_gen/` (BSP partitioner, drunkard carver, hazard injector)
  - `auditor/` (kernel, contracts, district sims, combat extended, persistence, constitutional, endgame)
- **FARADAY STAGING MEMBRANE PATTERN:**
  - Sub-modules populate temporary staging membranes (e.g., `window._ManifestInternal`, `window._CombatInternal`, `window._BattlerBakerInternal`, etc.).
  - The root facade (`manifest.js`, `combat.js`, `battler_baker.js`, `pseudo_3d_renderer.js`, `dynamic_lights.js`, `map_renderer.js`, `dungeon_gen.js`, `auditor.js`) ingests the membrane, freezes it into the public singleton (`EmberlightManifest`, `EmberlightCombat`, etc.), and completely purges the staging object (`delete window._*Internal`).
- **LOAD-ORDER SSOT GOVERNANCE:**
  - The single source of truth for script evaluation order is `testing/load_order.js`.
  - Zero drift is enforced between `testing/load_order.js` and `index.html` via `node testing/gen_html_scripts.js --check`.

COMPLETE 86-SCRIPT RUNTIME INVENTORY BY TIER:

[TIER 1: THE HOST HARNESS & PERSISTENCE] (6 Files)

- runtime.js : Authoritative host loop, persistent state owner (canonicalParty, gold, inventory).
- session_store.js : LocalStorage persistence adapter with <2.5KB compressed delta envelopes.
- district_router.js : MountDistrict() coordinator, Q4 view deck switcher, modal state machine.
- event_bus.js : Decoupled publisher-subscriber broker with idempotent unbind tokens.
- world_ecology.js : Dynamic world flag mutations, town state transitions, chest despawn maps.
- save_manager.js : Multi-slot persistence orchestrator, sparse coordinate delta compression.

[TIER 2: EPHEMERAL SIMULATION DISTRICTS] (18 Files)

- combat.js + combat/\*.js (8 sub-modules) : CTB 12-slot turn ribbon, formation rows, displacement cascade, AI, state.
- overworld.js : 2D cartography collision, step danger encounter rolls, tile mutations.
- armory.js : Equipment socketing, gear stat calculation, inventory management.
- progression.js : Aether Matrix constellation tree (77 nodes), SP unlock prerequisites, respec.
- status.js : Deep party diagnostics, vital telemetry projection, ailment tracking.
- market.js : Merchant inventory, dynamic buy/sell ratios, commerce transaction ledger.
- chronicle.js : Multi-stage quest state machine (5 quests), journal logging, reward dispatch.
- relic_forge.js : Crucible item synthesis, catalyst combination, artifact unlocking.
- lockpick.js : Harmonic tumbler frequency resonance minigame, tension threshold checks.
- settings.js : Centralized preferences profile, keymap rebinding, audio/accessibility.
- script.js : Branching dialogue graphs, NPC token substitution, scenario triggers.

[TIER 3: PERIPHERAL DRIVERS & PRESENTATION OBSERVERS] (33 Files)

- combat_renderer.js : 4-Quadrant War Table, contextual radial flick wheels, polarized threat lasers, hero chassis.
- map_renderer.js + map/\*.js (4 sub-modules) : 2D Canvas viewport, sub-pixel camera damping, autotiles, dynamic particles, LOS.
- pseudo_3d_renderer.js + pseudo_3d/\*.js (4 sub-modules) : First-person DDA raycaster (960x360 / 75° FOV), billboards, pipeline.
- dynamic_lights.js + dynamic_lights/\*.js (4 sub-modules) : 2D ambient darkness mask, lantern cone, shadow raycasting.
- armory_renderer.js : Loadout comparator cards, slot sockets, gear comparison diffs.
- status_renderer.js : ECG oscilloscope vitals, pentagonal stat radar canvas projection.
- progression_renderer.js : Dual-pane constellation suite, essence filter bars, node cards.
- market_renderer.js : Dual-column merchant/party ledger, transaction quantity pickers.
- chronicle_renderer.js : Parchment quest logbook, stage completion badges, rewards drawer.
- relic_forge_renderer.js : Crucible slot placement, anvil heat pulse animations.
- cockpit_renderer.js : Title cockpit mode, telemetry ticker, field ability macros.
- acoustic_sfx.js : Web Audio API procedural sound synthesizer (noise/oscillators, spatial panning).
- synth_soundtrack.js : Multi-channel procedural chiptune synth with biome mood tracking.
- synthetic_voice.js : Formant vowel phoneme vocalizer for NPC dialogue cadence.
- shader_compositor.js : WebGL CRT post-processing, scanlines, barrel distortion, phosphor glow.
- threat_oracle.js : 12-turn CTB timeline, dynamic ghost slot forecasting, affinity telemetry.
- input.js : Hardware keyboard/DPAD translator, remappable keymap, queue purging.
- combat_vfx.js : Zero-allocation typed array particle emitter, arc ballistics, slash trails.

[TIER 4: PROCEDURAL MATH KERNELS, STATIC SSOT & VERIFICATION] (29 Files)

- manifest.js + manifest/\*.js (7 sub-modules) : Frozen static SSOT (Enemies, Items, Quests, Curves, Nodes, Actors, World).
- prng.js : 32-bit Mulberry32 seeded deterministic stream generator (EmberlightPRNG).
- dungeon_gen.js + dungeon_gen/\*.js (3 sub-modules) : Deterministic BSP cellular-automata catacomb maze carver & hazard injector.
- battler_baker.js + battler_baker/\*.js (5 sub-modules) : Procedural 64x64 full-body battlers (10/10 battlers, paper-doll gear).
- battle_backdrop.js : Procedural biome horizons and perspective floor mats (Meadow, Town, Crypt, Boss).
- icons.js : Procedural 16x16 vector glyph renderers for items and UI badges.
- skill_icons.js : Procedural 24x24 aether constellation node icon rasterizers.
- party_icons.js : Procedural 32x32 party portrait face bakers with phenotype markers.
- sprite_baker.js : Procedural 16x16 overworld directional walk-cycle sprite generator.
- auditor.js + auditor/\*.js (7 sub-modules) : Autonomous 21-pass boot gatekeeper asserting 136/136 acceptance criteria.

# ================================================================================ 2. THE FARADAY ISOLATION RULES (LAW 11 / VSRP-001)

1. Zero DOM / Browser Primitives in Simulation:
   - Tier 2 (Districts) and Tier 4 (Kernels) are strictly FORBIDDEN from referencing `document`, `window`, `canvas`, `localStorage`, `sessionStorage`, `alert()`, `confirm()`.
2. Zero Autonomous Clocks:
   - No `setTimeout`, `setInterval`, or unmanaged `requestAnimationFrame` inside simulation.
   - Simulation time advances purely deterministically via `update(dt, context)` or the host scheduler.
3. Deterministic Seeded Entropy:
   - Unseeded `Math.random()` is ABSOLUTELY PROHIBITED in simulation code.
   - All randomness draws strictly from the Mulberry32 PRNG stream (`sim.prngState` / `EmberlightPRNG`).
   - Forecasting / prediction routines must fork PRNG streams (`prng.fork()`) to preserve authoritative sequence integrity.
4. Zero Module / External Syntax (Universal IIFE Dual-Binding):
   - Zero `import`, `export`, or `require()` statements in runtime engine scripts.
   - All modules export via:

     ```javascript
     const EmberlightModuleName = (() => {
       /* ... */
     })();
     if (typeof window !== "undefined")
       window.EmberlightModuleName = EmberlightModuleName;
     if (typeof module !== "undefined") module.exports = EmberlightModuleName;
     ```

5. Zero Network Overhead:
   - Zero `fetch()`, `XMLHttpRequest`, or WebSocket calls. Configuration is statically frozen in `manifest.js`.
6. Decoupled Peripheral Observers & Action Inversion:
   - Simulation districts communicate outward exclusively via `hostContext.eventBus.publish(topic, payload)`.
   - Simulation code must NEVER hold direct references to peripheral renderers.
   - Peripheral drivers dispatch intent via normalized action tokens (`emit(action)`).

# ================================================================================ 3. CANONICAL VSRP-001 NINE-METHOD LIFECYCLE CONTRACT

Every Tier 2 Ephemeral District simulation tenant MUST implement and export the 9-method lifecycle interface:

1. configure(cfg)
   - Ingests host config; deep-freezes immutable definitions; sets state to CONFIGURED.
2. init(context)
   - Captures host context references (eventBus, input adapter); sets state to INITIALIZED.
3. reset(snapshot)
   - Rehydrates internal simulation state from snapshot; performs deep copy isolation (structuredClone); sets state to READY.
4. update(dt, context)
   - Advances discrete simulation math by delta-time `dt`.
   - Reads `context.inputs` immutably (must NEVER call shift(), pop(), or splice() on host arrays).
5. render(renderer, state)
   - Delegates presentation to an external Tier 3 driver with a detached structuredClone snapshot.
6. getState()
   - Returns an isolated `structuredClone(sim)` snapshot of current simulation state.
7. getDiagnostics()
   - Returns module telemetry: { moduleId, lifecycleState, phase, turnIndex, livingCount, ... }.
8. getModuleInfo()
   - Returns standardized schema: { moduleId, version, protocolVersion: "VSRP-001", capabilities }.
9. destroy()
   - Halts all pending scheduled tasks, clears internal queues, unbinds event listeners, sets state to DESTROYED.

# ================================================================================ 4. MANDATORY PRE-FLIGHT COMPLIANCE ATTESTATION GATE

Before generating any tool call, code block, or file modification, you MUST output this exact block:

```text
=== PRE-FLIGHT COMPLIANCE ATTESTATION ===
1. TARGET FILE: [Must be root or MPFS-001 domain relative, e.g. "combat.js" or "combat/combat_actions.js"]
2. DIRECTORY TOPOLOGY CHECK:
   - [PASS/FAIL] File verified to exist at workspace root (./) or canonical MPFS-001 directory.
   - [PASS/FAIL] Zero src/, dist/, build/, or arbitrary nested prefixes.
3. ARCHITECTURAL TIER: [Tier 1: Host | Tier 2: District | Tier 3: Driver | Tier 4: Kernel]
4. FARADAY BOUNDARY AUDIT:
   - [PASS/FAIL] Zero DOM/window/canvas access if Tier 2 or Tier 4.
   - [PASS/FAIL] Zero autonomous clocks (no setTimeout/setInterval/unmanaged RAF).
   - [PASS/FAIL] Zero Math.random() in simulation (Mulberry32 PRNG only).
   - [PASS/FAIL] Zero ES module syntax (maintain universal IIFE global registry).
   - [PASS/FAIL] Zero fetch() calls (keep config frozen in manifest.js).
5. VSRP-001 9-METHOD CONTRACT:
   - Exported: { configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy }
6. VERIFICATION TARGET: Sentinel Pass (136/136 Checks • 21 Passes)
VERDICT: [PASS | FAIL]
=========================================
```
