---
name: Emberlight Sovereign Architecture Contract (VSRP-001 & Flat Directory Protocol)
description: Mandatory 4-Tier Boundary, Flat Topology, and 9-Method Lifecycle enforcement for all workspace operations.
globs: '*.js'
alwaysApply: true
---

# 🏛️ Emberlight Sovereign Architecture Contract (VSRP-001 / ARCH-001-EMBERLIGHT / PRS-001)

Document Identifier: ARCH-001-EMBERLIGHT Governing Standard: VSRP-001 (Universal Module Contract Specification) Parent
Protocol: PMIP-001 / SDCP-001 / PRS-ARC-020 Version: 5.0.0-LOCKED Index Anchor: PRS-001

The game executes 100% offline via direct double-click on `index.html` over the `file:///` protocol. ZERO build steps.
ZERO npm dependencies. ZERO external network calls. ZERO module bundlers.

================================================================================

1. WORKSPACE REPOSITORY TOPOLOGY (FLAT DIRECTORY INVARIANT)
   ================================================================================ The workspace contains NO nested
   source directories.

- FORBIDDEN PATHS: Zero `src/`, zero `dist/`, zero `build/`, zero `lib/`, zero `app/`.
- ROOT HOUSING: All 45 runtime JavaScript files reside strictly at `./` (the workspace root).
- TOOL INVOCATION: Any tool targeting (`read_file`, `edit_existing_file`, `grep_search`) MUST use the flat root-relative
  path (e.g., `combat.js`, NEVER `src/combat.js`).

COMPLETE 45-FILE RUNTIME INVENTORY BY TIER:

[TIER 1: THE HOST HARNESS] (5 Files)

- runtime.js : Authoritative host loop, persistent state owner (canonicalParty, gold, inventory).
- session_store.js : LocalStorage persistence adapter with <2.5KB compressed delta envelopes.
- district_router.js : MountDistrict() coordinator, Q4 view deck switcher, modal state machine.
- event_bus.js : Decoupled publisher-subscriber broker with idempotent unbind tokens.
- world_ecology.js : Dynamic world flag mutations, town state transitions, chest despawn maps.

[TIER 2: EPHEMERAL SIMULATION DISTRICTS] (11 Files)

- combat.js : CTB 12-slot turn ribbon, formation rows, ailment pipeline, damage resolution.
- overworld.js : 2D cartography collision, step danger encounter rolls, tile mutations.
- armory.js : Equipment socketing, gear stat calculation, inventory management.
- progression.js : Aether Matrix constellation tree, SP unlock prerequisites, respec refund.
- status.js : Deep party diagnostics, vital telemetry projection, ailment tracking.
- market.js : Merchant inventory, dynamic buy/sell ratios, commerce transaction ledger.
- chronicle.js : Multi-stage quest state machine, journal logging, reward dispatch.
- relic_forge.js : Crucible item synthesis, catalyst combination, artifact unlocking.
- lockpick.js : Harmonic tumbler frequency resonance minigame, tension threshold checks.
- settings.js : Centralized preferences profile, keymap rebinding, audio/accessibility.
- script.js : Branching dialogue graphs, NPC token substitution, scenario triggers.

[TIER 3: PERIPHERAL DRIVERS & PRESENTATION OBSERVERS] (18 Files)

- combat_renderer.js : Grand Battlefield Arena, 120px symmetric cards, clash runes.
- map_renderer.js : 2D Canvas viewport, sub-pixel camera damping (λ=12), autotile masks.
- armory_renderer.js : Loadout comparator cards, slot sockets, gear comparison diffs.
- status_renderer.js : ECG oscilloscope vitals, pentagonal stat radar canvas projection.
- progression_renderer.js: Dual-pane constellation suite, 6 essence filter bars, node cards.
- market_renderer.js : Dual-column merchant/party ledger, transaction quantity pickers.
- chronicle_renderer.js : Parchment quest logbook, stage completion badges, rewards drawer.
- relic_forge_renderer.js: Crucible slot placement, anvil heat pulse animations.
- cockpit_renderer.js : Q3 field scanner, telemetry ticker, field ability macro dock ([F][G][H][V]).
- acoustic_sfx.js : Web Audio API procedural sound synthesizer (noise/oscillators).
- synth_soundtrack.js : Multi-channel procedural chiptune synth with biome mood tracking.
- synthetic_voice.js : Formant vowel phoneme vocalizer for NPC dialogue cadence.
- dynamic_lights.js : 2D ambient darkness mask, 105px lantern cone, shadow extrusions.
- pseudo_3d_renderer.js : First-person DDA raycaster, 1D Z-buffered billboards, 75° FOV ([X]).
- shader_compositor.js : WebGL CRT post-processing, scanlines, barrel distortion, phosphor glow.
- threat_oracle.js : Live damage forecast, element affinity calculation, target hover telemetry.
- input.js : Hardware keyboard/DPAD translator, remappable keymap, queue purging.
- combat_vfx.js : Zero-allocation typed array particle emitter, arc ballistics, slash trails.

[TIER 4: PROCEDURAL MATH KERNELS & STATIC SSOT] (11 Files)

- manifest.js : Frozen static SSOT definitions (Enemies, Items, Quests, Curves, Nodes).
- prng.js : 32-bit Mulberry32 seeded deterministic stream generator (EmberlightPRNG).
- dungeon_gen.js : Deterministic BSP cellular-automata catacomb maze carver.
- save_manager.js : Sparse delta compression serializer and base64 save string unpacker.
- icons.js : Procedural 16x16 vector glyph renderers for items and UI badges.
- skill_icons.js : Procedural 24x24 aether constellation node icon rasterizers.
- party_icons.js : Procedural 32x32 party portrait face bakers with phenotype markers.
- sprite_baker.js : Procedural 16x16 overworld directional walk-cycle sprite generator.
- battler_baker.js : Procedural 64x64 full-body battlers (4 heroes, 6 hostiles, paper-doll gear).
- battle_backdrop.js : Procedural biome horizons and perspective floor mats (Meadow, Town, Crypt).
- auditor.js : Autonomous 19-pass boot gatekeeper asserting 127/127 acceptance criteria.

# ================================================================================ 2. THE FARADAY ISOLATION RULES

1. Zero DOM / Browser Primitives in Simulation: Tier 2 (Districts) and Tier 4 (Kernels) are strictly FORBIDDEN from
   accessing:
   - `document`, `window`, `canvas`, `localStorage`, `sessionStorage`, `alert()`, `confirm()`.
2. Zero Autonomous Clocks:
   - No `setTimeout`, `setInterval`, or unmanaged `requestAnimationFrame` inside simulation.
   - Simulation time is advanced purely deterministically via `update(dt, context)` or the host scheduler.
3. Deterministic Seeded Entropy:
   - Unseeded `Math.random()` is ABSOLUTELY PROHIBITED in simulation code.
   - All randomness must draw strictly from the Mulberry32 PRNG stream (`sim.prngState` / `EmberlightPRNG`).
4. Zero Module / External Syntax:
   - Zero `import`, `export`, or `require()` statements.
   - Cross-module availability is registered exclusively on the global registry (`window.Emberlight*`).
5. Zero Network Overhead:
   - Zero `fetch()`, `XMLHttpRequest`, or WebSocket calls. Configuration is statically frozen in `manifest.js`.
6. Decoupled Peripheral Observers:
   - Simulation districts communicate outward exclusively via `hostContext.eventBus.publish(topic, payload)`.
   - Simulation code must NEVER hold references to or directly invoke peripheral renderers.

================================================================================ 3. CANONICAL VSRP-001 NINE-METHOD
LIFECYCLE CONTRACT
================================================================================

Every Tier 2 Ephemeral District simulation tenant MUST implement and export the 9-method lifecycle interface:

1. configure(cfg)
   - Ingests host config; deep-freezes immutable definitions; sets state to CONFIGURED.
2. init(context)
   - Captures host context references (eventBus, input adapter); sets state to INITIALIZED.
3. reset(snapshot)
   - Rehydrates internal simulation state from snapshot; performs deep copy isolation; sets state to READY.
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
   - Returns standardized schema: { moduleId, version, protocolVersion: "VSRP-001", dependencies, capabilities }.
9. destroy()
   - Halts all pending scheduled tasks, clears internal queues, unbinds event listeners, sets state to DESTROYED.

================================================================================ 4. MANDATORY PRE-FLIGHT COMPLIANCE
ATTESTATION GATE
================================================================================

Before generating any tool call, code block, or file modification, you MUST output this exact block:

```text
=== PRE-FLIGHT COMPLIANCE ATTESTATION ===
1. TARGET FILE: [Must be root relative, e.g. "combat.js", NEVER "src/combat.js"]
2. DIRECTORY TOPOLOGY CHECK:
   - [PASS/FAIL] File verified to exist at workspace root (./).
   - [PASS/FAIL] Zero src/, dist/, or build/ directory prefixes.
3. ARCHITECTURAL TIER: [Tier 1: Host | Tier 2: District | Tier 3: Driver | Tier 4: Kernel]
4. FARADAY BOUNDARY AUDIT:
   - [PASS/FAIL] Zero DOM/window/canvas access if Tier 2 or Tier 4.
   - [PASS/FAIL] Zero autonomous clocks (no setTimeout/setInterval/unmanaged RAF).
   - [PASS/FAIL] Zero Math.random() in simulation (Mulberry32 PRNG only).
   - [PASS/FAIL] Zero ES module syntax (maintain flat window.Emberlight* registry).
   - [PASS/FAIL] Zero fetch() calls (keep config frozen in manifest.js).
5. VSRP-001 9-METHOD CONTRACT:
   - Exported: { configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy }
6. VERIFICATION TARGET: Sentinel Pass (127/127 Checks • 19 Passes)
VERDICT: [PASS | FAIL]
=========================================
```
