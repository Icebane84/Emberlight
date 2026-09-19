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

## Canonical Load Order Groups

All scripts reside at the **project root** (flat topology — no subdirectories for sources).

| Group | Scripts | Tier |
| :--- | :--- | :--- |
| 1 — Kernels & Static Schema | `manifest.js`, `prng.js` | Tier 4 |
| 2 — Host Harness Core | `session_store.js`, `event_bus.js` | Tier 1 |
| 3 — World & Ecology | `world_ecology.js`, `district_router.js` | Tier 1 |
| 4 — Audio Drivers | `acoustic_sfx.js`, `synth_soundtrack.js`, `synthetic_voice.js` | Tier 3 |
| 5 — Input Driver | `input.js` | Tier 3 |
| 6 — Icon & Asset Bakers | `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js` | Tier 3 |
| 7 — Rendering Pipeline | `combat_vfx.js` → `relic_forge_renderer.js` (14 files) | Tier 3 |
| 8 — Simulation Districts | `progression.js`, `combat.js`, `overworld.js` … `status.js` | Tier 2 |
| 9 — Audit Kernel | `auditor.js` | Tier 4 |
| 10 — Districts (cont.) & Persistence | `relic_forge.js`, `dungeon_gen.js`, `lockpick.js`, `settings.js`, `save_manager.js` | Tier 2 / 1 |
| 11 — Orchestration & Entry Points | `script.js`, `runtime.js` | Tier 2 / 1 |

> **Note on `script.js`:** The dialogue runner is present in `index.html` (Group 11)
> and in the headless test harness array. Its placement in the test context (between
> `combat.js` and `overworld.js`) predates the SSOT and is preserved because the mock DOM
> context handles it safely at both positions. This is not a bug.


