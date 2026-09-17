# The One Critical Rule for Engine Script Load Order

Emberlight uses classic browser waterfall `<script>` tags (modules register on `window`/global
scope with no bundler). Execution order in `index.html` is strictly mandatory — a single
misplaced tag produces a silent runtime failure.

---

## SSOT Governance (as of 2026-09-09)

The canonical load order is **no longer hand-maintained in multiple places**.
It lives in a single authoritative file:

```text
testing/load_order.js
```

This frozen array is:

- `require()`'d by every VM-based headless test harness (`test_sentinel.js`,
  `test_combat_input.js`, `test_hotkeys_and_expansion.js`, `test_persistence_wiring.js`)
- Manually mirrored in the `<script>` block of `index.html`

**When you add or rename a module**, the update workflow is:

```
1. Edit  testing/load_order.js          ← one place to touch
2. Add   <script src="..."> in index.html at the matching position
3. Run   node testing/gen_html_scripts.js   → confirms 0 drift
4. Run   node testing/test_sentinel.js      → full 134/134 audit gate
```

`testing/gen_html_scripts.js` parses `index.html` and diffs it against `load_order.js`,
printing any missing, extra, or out-of-order entries. Exit code 0 = clean.

---

## Canonical Load Order Groups (86 Scripts)

Engine scripts follow the strict 11-group topological cascade defined in [`testing/load_order.js`](file:///c:/Users/Chris/Emberlight/testing/load_order.js) and mirrored in [`index.html`](file:///c:/Users/Chris/Emberlight/index.html).

Complex subsystems utilize a **Facade / Subsystem Partition Pattern** (`manifest/`, `dynamic_lights/`, `pseudo_3d/`, `battler_baker/`, `map/`, `combat/`, `auditor/`, `dungeon_gen/`): sub-modules populate temporary staging membranes (`window._<Name>Internal`), and the root facade seals the canonical global before purging the membrane.

| Group                                    | Scripts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Count | Tier       | Subsystem Directory                                        |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---: | :--------- | :--------------------------------------------------------- |
| **1 — Static Data & Kernels**            | `manifest/manifest_*.js` (7 files) $\to$ `manifest.js` (facade), `prng.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                            |   9   | Tier 4     | `manifest/`                                                |
| **2 — Host Harness Core**                | `session_store.js`, `event_bus.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |   2   | Tier 1     | Root                                                       |
| **3 — World & Ecology**                  | `world_ecology.js`, `district_router.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |   2   | Tier 1     | Root                                                       |
| **4 — Audio Drivers**                    | `acoustic_sfx.js`, `synth_soundtrack.js`, `synthetic_voice.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |   3   | Tier 3     | Root                                                       |
| **5 — Input Driver**                     | `input.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |   1   | Tier 3     | Root                                                       |
| **6 — Icon & Asset Bakers**              | `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |   4   | Tier 3     | Root                                                       |
| **7 — Rendering Pipeline**               | `combat_vfx.js`, `dynamic_lights/dynamic_lights_*.js` (4 files) $\to$ `dynamic_lights.js` (facade), `pseudo_3d/pseudo_3d_*.js` (4 files) $\to$ `pseudo_3d_renderer.js` (facade), `shader_compositor.js`, `battler_baker/battler_*.js` (5 files) $\to$ `battler_baker.js` (facade), `battle_backdrop.js`, `threat_oracle.js`, `cockpit_renderer.js`, `combat_renderer.js`, `map/map_*.js` (4 files) $\to$ `map_renderer.js` (facade), `armory_renderer.js`, `chronicle_renderer.js`, `progression_renderer.js`, `market_renderer.js`, `status_renderer.js`, `relic_forge_renderer.js` |  33   | Tier 3     | `dynamic_lights/`, `pseudo_3d/`, `battler_baker/`, `map/` |
| **8 — Ephemeral Districts**              | `progression.js`, `combat/combat_*.js` (8 files) $\to$ `combat.js` (facade), `overworld.js`, `armory.js`, `market.js`, `chronicle.js`, `status.js`                                                                                                                                                                                                                                                                                                                                                                                 |  14   | Tier 2     | `combat/`                                                  |
| **9 — Sentinel Audit Battery**           | `auditor/auditor_*.js` (7 pass suites) $\to$ `auditor.js` (facade)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |   8   | Tier 4     | `auditor/`                                                 |
| **10 — Districts (cont.) & Persistence** | `relic_forge.js`, `dungeon_gen/dungeon_*.js` (3 files) $\to$ `dungeon_gen.js` (facade), `lockpick.js`, `settings.js`, `save_manager.js`                                                                                                                                                                                                                                                                                                                                                                                              |   8   | Tier 2 / 1 | `dungeon_gen/`, Root                                       |
| **11 — Orchestration Entry Point**       | `runtime.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |   1   | Tier 1     | Root                                                       |

**Total Canonical Scripts:** 86

---

## 🏛️ Subsystem Directory & Staging Architecture

1. **`manifest/` (7 Sub-modules $\to$ `manifest.js`)**
   - Populates: `window._ManifestInternal = { Config, Actors, Items, Progression, World, Narrative, Calculators }`
   - Facade: `manifest.js` performs `deepFreeze()`, exports `window.EmberlightManifest`, and runs `delete window._ManifestInternal`.

2. **`dynamic_lights/` (4 Sub-modules $\to$ `dynamic_lights.js`)**
   - Populates: `window._DynamicLightsInternal = { Primitives, Shadows, Emitters, Pipeline }`
   - Facade: `dynamic_lights.js` mounts VSRP-001 lifecycle methods, exports `window.EmberlightDynamicLights`, and purges `_DynamicLightsInternal`.

3. **`pseudo_3d/` (4 Sub-modules $\to$ `pseudo_3d_renderer.js`)**
   - Populates: `window._Pseudo3DInternal = { Textures, DDA, Billboards, Pipeline }`
   - Facade: `pseudo_3d_renderer.js` mounts VSRP-001 lifecycle methods, viewport handlers, exports `window.EmberlightPseudo3D` & `window.EmberlightCorridorSensor`, and runs `delete window._Pseudo3DInternal`.

4. **`battler_baker/` (5 Sub-modules $\to$ `battler_baker.js`)**
   - Populates: `window._BattlerBakerInternal = { Primitives, Heroes, Equipment, Enemies, Pipeline }`
   - Facade: `battler_baker.js` mounts VSRP-001 lifecycle methods, exports `window.EmberlightBattlerBaker`, and runs `delete window._BattlerBakerInternal`.

5. **`map/` (4 Sub-modules $\to$ `map_renderer.js`)**
   - Populates: `window._MapRendererInternal = { Textures, Particles, LoS, Compositor }`
   - Facade: `map_renderer.js` mounts VSRP-001 lifecycle methods, camera damping, exports `window.EmberlightMapRenderer`, and purges `_MapRendererInternal`.

6. **`combat/` (8 Sub-modules $\to$ `combat.js`)**
   - Populates: `window._CombatInternal = { Calc, Displacement, Queue, AI, State, Actions, Projection, Orchestrator }`
   - Facade: `combat.js` mounts VSRP-001 lifecycle methods, input & gesture routers, exports `window.EmberlightCombat` & factory `createInstance()`, and runs `delete window._CombatInternal`.

7. **`auditor/` (7 Sub-modules $\to$ `auditor.js`)**
   - Populates: `window._AuditorInternal = { Kernel, Contracts, DistrictSims, CombatExtended, Persistence, Constitutional, Endgame }`
   - Facade: `auditor.js` wires the 21-pass execution runner, exports `window.EmberlightAuditor`, and purges `window._AuditorInternal`.

8. **`dungeon_gen/` (3 Sub-modules $\to$ `dungeon_gen.js`)**
   - Populates: `window._DungeonGenInternal = { BSP, Drunkard, Hazards }`
   - Facade: `dungeon_gen.js` mounts generator pipeline, exports `window.EmberlightDungeonGen`, and purges `_DungeonGenInternal`.
