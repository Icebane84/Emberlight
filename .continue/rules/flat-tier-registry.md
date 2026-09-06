---
name: Emberlight Flat-File Tier Registry
description: 4-Tier classification and offline file:// guardrails
globs: "*.js"
alwaysApply: true
---

# 🗺️ Flat-File Tier Classification Registry

### Tier 1: The Host Harness (Persistent State SSOT)
- **Files:** `runtime.js`, `session_store.js`, `district_router.js`, `event_bus.js`, `world_ecology.js`.
- Sole owner of canonical state (`canonicalParty`, `canonicalGold`, `canonicalInventory`).
- Drives the simulation tick loop and commits delta envelopes.
- **FORBIDDEN:** Combat calculations, tile generation math, direct DOM projection.

### Tier 2: Ephemeral Districts (VSRP-001 Simulation Tenants)
- **Files:** `combat.js`, `overworld.js`, `armory.js`, `progression.js`, `status.js`, `market.js`, `chronicle.js`, `relic_forge.js`, `lockpick.js`, `settings.js`, `script.js`.
- Owns simulation logic, turn scheduling, damage formulas, and sealed deltas.
- **FORBIDDEN:** `document`, `window`, `canvas`, `alert()`, `setTimeout`, `setInterval`, `Math.random()`.
- Inputs consumed strictly via `update(dt, context)` or `handleHostAction(action)`.

### Tier 3: Peripheral Drivers (Presentation Engines & Observers)
- **Files:** `combat_renderer.js`, `map_renderer.js`, `armory_renderer.js`, `status_renderer.js`, `progression_renderer.js`, `market_renderer.js`, `chronicle_renderer.js`, `relic_forge_renderer.js`, `cockpit_renderer.js`, `acoustic_sfx.js`, `synth_soundtrack.js`, `synthetic_voice.js`, `dynamic_lights.js`, `pseudo_3d_renderer.js`, `shader_compositor.js`, `threat_oracle.js`, `input.js`.
- Owns DOM elements, HTML5 Canvases, CSS animations, and Web Audio synthesizers.
- **FORBIDDEN:** Simulation authority, direct mutation of simulation state. Action inversion only: emits normalized action tokens.

### Tier 4: Procedural Math Kernels & Static SSOT
- **Files:** `manifest.js`, `prng.js`, `dungeon_gen.js`, `save_manager.js`, `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js`, `battler_baker.js`, `battle_backdrop.js`, `auditor.js`.
- Pure deterministic routines, Mulberry32 PRNG streams, frozen schemas (`Object.freeze`).

---

## ⚠️ Critical Offline & file:// Guardrails
- **Never introduce import or export:** Continue using global aliases (e.g. `window.EmberlightCombat = ...`).
- **Never introduce fetch():** Default configs and data tables remain statically embedded in `manifest.js`.
- **Never introduce external assets:** Keep all icons, sprites, backdrops, and sound generated procedurally via Canvas and Web Audio APIs.