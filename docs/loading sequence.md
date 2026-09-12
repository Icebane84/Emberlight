# The One Critical Rule for Engine Script Load Order

Emberlight uses classic browser waterfall `<script>` tags (modules register on `window`/global
scope with no bundler). Execution order in `index.html` is strictly mandatory — a single
misplaced tag produces a silent runtime failure.

---

## SSOT Governance (as of 2026-09-09)

The canonical load order is **no longer hand-maintained in multiple places**.
It lives in a single authoritative file:

```
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
4. Run   node testing/test_sentinel.js      → full 127/127 audit gate
```

`testing/gen_html_scripts.js` parses `index.html` and diffs it against `load_order.js`,
printing any missing, extra, or out-of-order entries. Exit code 0 = clean.

---

## Canonical Load Order Groups (72 Scripts)

Engine scripts follow the strict 11-group topological cascade defined in [`testing/load_order.js`](file:///c:/Users/Chris/Emberlight/testing/load_order.js) and mirrored in [`index.html`](file:///c:/Users/Chris/Emberlight/index.html).

Complex subsystems utilize a **Facade / Subsystem Partition Pattern** (`manifest/`, `battler_baker/`, `pseudo_3d/`, `combat/`, `auditor/`): sub-modules populate temporary staging membranes (`window._<Name>Internal`), and the root facade seals the canonical global before purging the membrane.

| Group                                    | Scripts                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Count | Tier       | Subsystem Directory            |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---: | :--------- | :----------------------------- |
| **1 — Static Data & Kernels**            | `manifest/manifest_*.js` (7 files) $\to$ `manifest.js` (facade), `prng.js`                                                                                                                                                                                                                                                                                                                                                                                                     |   9   | Tier 4     | `manifest/`                    |
| **2 — Host Harness Core**                | `session_store.js`, `event_bus.js`                                                                                                                                                                                                                                                                                                                                                                                                                                             |   2   | Tier 1     | Root                           |
| **3 — World & Ecology**                  | `world_ecology.js`, `district_router.js`                                                                                                                                                                                                                                                                                                                                                                                                                                       |   2   | Tier 1     | Root                           |
| **4 — Audio Drivers**                    | `acoustic_sfx.js`, `synth_soundtrack.js`, `synthetic_voice.js`                                                                                                                                                                                                                                                                                                                                                                                                                 |   3   | Tier 3     | Root                           |
| **5 — Input Driver**                     | `input.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |   1   | Tier 3     | Root                           |
| **6 — Icon & Asset Bakers**              | `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js`                                                                                                                                                                                                                                                                                                                                                                                                              |   4   | Tier 3     | Root                           |
| **7 — Rendering Pipeline**               | `combat_vfx.js`, `dynamic_lights.js`, `pseudo_3d/pseudo_3d_*.js` (4 files) $\to$ `pseudo_3d_renderer.js` (facade), `shader_compositor.js`, `battler_baker/battler_*.js` (5 files) $\to$ `battler_baker.js` (facade), `battle_backdrop.js`, `threat_oracle.js`, `cockpit_renderer.js`, `combat_renderer.js`, `map_renderer.js`, `armory_renderer.js`, `chronicle_renderer.js`, `progression_renderer.js`, `market_renderer.js`, `status_renderer.js`, `relic_forge_renderer.js` |  25   | Tier 3     | `pseudo_3d/`, `battler_baker/` |
| **8 — Ephemeral Districts**              | `progression.js`, `combat/combat_*.js` (5 files) $\to$ `combat.js` (facade), `script.js`, `overworld.js`, `armory.js`, `market.js`, `chronicle.js`, `status.js`                                                                                                                                                                                                                                                                                                                |  13   | Tier 2     | `combat/`                      |
| **9 — Sentinel Audit Battery**           | `auditor/auditor_*.js` (7 pass suites) $\to$ `auditor.js` (facade)                                                                                                                                                                                                                                                                                                                                                                                                             |   8   | Tier 4     | `auditor/`                     |
| **10 — Districts (cont.) & Persistence** | `relic_forge.js`, `dungeon_gen.js`, `lockpick.js`, `settings.js`, `save_manager.js`                                                                                                                                                                                                                                                                                                                                                                                            |   5   | Tier 2 / 1 | Root                           |
| **11 — Orchestration Entry Point**       | `runtime.js`                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |   1   | Tier 1     | Root                           |

**Total Canonical Scripts:** 72

---

## 🏛️ Subsystem Directory & Staging Architecture

1. **`manifest/` (7 Sub-modules $\to$ `manifest.js`)**
   - Populates: `window._ManifestInternal = { Config, Actors, Items, Progression, World, Narrative, Calculators }`
   - Facade: `manifest.js` performs `deepFreeze()`, exports `window.EmberlightManifest`, and runs `delete window._ManifestInternal`.

2. **`pseudo_3d/` (4 Sub-modules $\to$ `pseudo_3d_renderer.js`)**
   - Populates: `window._Pseudo3DInternal = { Textures, DDA, Billboards, Pipeline }`
   - Facade: `pseudo_3d_renderer.js` mounts VSRP-001 lifecycle methods, viewport handlers, exports `window.EmberlightPseudo3D` & `window.EmberlightCorridorSensor`, and runs `delete window._Pseudo3DInternal`.

3. **`battler_baker/` (5 Sub-modules $\to$ `battler_baker.js`)**
   - Populates: `window._BattlerBakerInternal = { Primitives, Heroes, Equipment, Enemies, Pipeline }`
   - Facade: `battler_baker.js` mounts VSRP-001 lifecycle methods, exports `window.EmberlightBattlerBaker`, and runs `delete window._BattlerBakerInternal`.

4. **`combat/` (5 Sub-modules $\to$ `combat.js`)**
   - Populates: `window._CombatInternal = { Calc, Displacement, Queue, AI, State }`
   - Facade: `combat.js` mounts VSRP-001 lifecycle methods, input & gesture routers, exports `window.EmberlightCombat` & factory `createInstance()`, and runs `delete window._CombatInternal`.

5. **`auditor/` (7 Sub-modules $\to$ `auditor.js`)**
   - Populates: `window._AuditorInternal = { Kernel, Contracts, DistrictSims, CombatExtended, Persistence, Constitutional, Endgame }`
   - Facade: `auditor.js` wires the 19-pass execution runner, exports `window.EmberlightAuditor`, and purges `window._AuditorInternal`.

> **Note on `script.js`:** The dialogue runner is present in `index.html` (Group 8/11)
> and in the headless test harness array. Its placement in the test context (between
> `combat.js` and `overworld.js`) predates the SSOT and is preserved because the mock DOM
> context handles it safely at both positions. This is not a bug.
