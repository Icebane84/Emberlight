# 🔥 Emberlight Codebase Assessment

**Assessed:** 2026-09-08  
**Sentinel:** ✅ 127/127 CHECKS PASSED (exit 0)  
**Total Production LOC:** ~43,157 lines across 48 source files

---

## 📊 Scale & Composition

| Category | Count | Notable |
|:---|:---|:---|
| **JS Engine Modules** | 44 files | Flat root, zero bundlers |
| **CSS Partitions** | 5 files | `css/` — 3,140 lines total |
| **HTML Shell** | 1 file | 778 lines, 55 script tags |
| **Test Harnesses** | 6 files | `testing/` — headless `node:vm` |
| **Data Manifests** | 2 files | `data/settings.json`, boilerplate |
| **Total Modules (architecture registry)** | 37 | Per `tenants_registry.md` |

### Line Count Distribution (Top 10)

| File | Lines | Tier |
|:---|:---|:---|
| `manifest.js` | 3,905 | T4 SSOT |
| `battler_baker.js` | 3,783 | T3 Peripheral |
| `combat.js` | 2,451 | T2 Simulation Tenant |
| `auditor.js` | 1,922 | T4 Sentinel |
| `pseudo_3d_renderer.js` | 1,820 | T3 Peripheral |
| `runtime.js` | 1,254 | T1 Host Harness |
| `combat_renderer.js` | 1,089 | T3 Peripheral |
| `map_renderer.js` | 1,108 | T3 Peripheral |
| `battle_backdrop.js` | 893 | T3 Peripheral |
| `dynamic_lights.js` | 840 | T3 Peripheral |

---

## 🏛️ What Makes This Codebase Remarkable

### 1. The Architecture Is Genuinely Disciplined

This is not a hobbyist project with aspirational comments. The 4-Tier Sovereign Architecture is **actually enforced** — not just documented. The Faraday isolation contract (Tier 2 tenants never touch DOM, never call `Math.random()`, never spawn autonomous clocks) is coherent across 11 simulation tenants. Browsing `combat.js`, `lockpick.js`, `relic_forge.js` — they all follow the exact same VSRP-001 9-method lifecycle signature (`configure → init → reset → update → render → getState → getDiagnostics → getModuleInfo → destroy`). This is rare discipline even in professional codebases.

### 2. The Sentinel Auditor Is a Real Anti-Theater Gate

The `auditor.js` at 1,922 lines with 19 passes and 127 individual checks is not decorative. Running it right now confirms `=== SENTINEL AUDIT 100% SUCCESS: 127/127 CHECKS PASSED ===`. This means every contract assertion — Faraday isolation traps, PRNG authority checks, formation shielding invariants, EventBus teardown, persistence compression budget (<2.5KB) — is passing liveness probes against the **live running engine** inside a headless `node:vm` context. Very few hobby or indie projects carry anything like this.

### 3. Zero External Dependencies — And It's Not Crippling

**No npm. No bundler. No framework. No test library.** Just pure ES2022+, `node:vm`, and native browser APIs. For an engine of this scope — a full-featured tactical RPG with:
- A DDA pseudo-3D raycaster (`pseudo_3d_renderer.js`)
- A WebGL CRT compositor (`shader_compositor.js`)
- A real-time procedural chiptune sequencer with FM synthesis (`synth_soundtrack.js`)
- A dual-formant speech synthesizer (`synthetic_voice.js`)
- A Mulberry32 PRNG with `fork()` for deterministic lookahead (`prng.js`)
- A 48×32 world map with sparse mutation encoding
- A full 19-pass deterministic headless audit gate (`auditor.js`)

…the zero-dependency constraint is *impressive*. The IIFE dual-binding pattern (`if (typeof window !== 'undefined') window.X = X; if (typeof module !== 'undefined') module.exports = X`) is consistently applied everywhere, enabling the same files to run in both browser and `node:vm` without transpilation.

### 4. The PRNG Architecture Is Textbook-Correct

`prng.js` implements Mulberry32 properly — the `fork()` clone method enabling non-destructive lookahead forecasting (Threat Oracle damage previews run on forked streams to avoid corrupting the authoritative simulation thread) is a genuine design insight. The Sentinel explicitly traps any `Math.random()` call inside Tier 2 code. This is the kind of thing professional game engines get wrong.

### 5. EventBus Is Lean and Correct

`event_bus.js` at 245 lines is the entire inter-module communication backbone. It's synchronous pub/sub with tokenized unbind handles — subscribers return a closure that removes exactly themselves. The SDCP-001 capability registry on top (sealed after boot, collision-detecting) is a clean gatekeeper pattern. No global singletons leaking outside this.

### 6. CSS Architecture Is Well-Partitioned

The `index.css` is just 12 lines of `@import` declarations. The actual 3,140 lines of styles are split across 5 semantically named partitions (`01_core_cockpit.css`, `02_sensors_cartography.css`, etc.). This is excellent separation for a vanilla CSS codebase.

---

## ⚠️ Honest Areas of Concern

### 1. `manifest.js` Is a 3,905-Line God Object

The Static Data SSOT is doing too many jobs simultaneously: class stat tables, tile legend, overworld map (48×32 = 1,536 tiles inline), bestiary, item catalog, quest journal, shop definitions, dialogue trees, Aether constellation graph, AND the `computeCharacterStats()` / `calculateGearStats()` pure functions. It's appropriately documented and sectioned, but at this size it is the single most fragile file in the codebase — a merge conflict magnet and a cognitive load sink. **Splitting into domain-specific frozen data modules** (e.g., `manifest_world.js`, `manifest_enemies.js`, `manifest_items.js`) would be the next major evolution — while still preserving the flat-root topology constraint.

### 2. `battler_baker.js` at 3,783 Lines Is Approaching Its Partition Threshold

The procedural 64×64 battler synthesizer is the engine's most aesthetically complex module. At nearly 4,000 lines it's pushing the limits of comfortable region-confined editing. Each anatomy pass (shadow layer → diffuse → specular → emissive → weapon overlay → armor trim) is internally coherent but the aggregate is large. This warrants pre-emptive sectioning review before it becomes genuinely hard to navigate.

### 3. The Topological Script Load Order in `index.html` Is Hand-Maintained

55 `<script>` tags in strict load order with no bundler is a perfectly valid architectural choice here, but it's also a maintenance risk. The comment grouping (Foundations → World/Audio → Assets → Rendering → Logic → Orchestration) is correct and helpful, but a future module addition is one misplaced `<script>` tag away from a silent runtime failure. The fact that this order is **also** manually replicated across 5 separate test harnesses in `testing/` compounds this risk. A `load_order.js` manifest array shared by both `index.html` (via a `<script>` loader) and all test suites would reduce drift exposure.

### 4. `script.js` (Dialogue Runner) Sits Between Tier 2 and the Loader

`script.js` at 841 lines is loaded in Group 6 ("Orchestration") in `index.html` just before `runtime.js`, but in the Sentinel test harness it loads in the Tier 2 simulation block. This placement inconsistency between HTML and test harness isn't a bug (both work), but it suggests `script.js`'s tier classification is slightly ambiguous — it straddles dialogue simulation and host coordination.

### 5. `.prettierrc.json` + `eslint.config.js` Exist (SKILL.md Prohibition)

The SKILL.md explicitly states: *"NEVER create `.eslintrc`, `.prettierrc`, or external linter configuration files."* Both `eslint.config.js` (20 lines) and `.prettierrc.json` are present at root. These likely pre-date the SKILL.md or were added outside its scope, but they represent a declared invariant violation worth acknowledging. Their presence is non-breaking but inconsistent with the zero-external-tooling doctrine.

### 6. Inline Styles in `index.html`

Several DOM elements in `index.html` carry extensive inline `style=""` attributes (e.g., the `#title-view` panel with 8 inline style declarations). Given the existence of 5 well-organized CSS partitions, these would be better expressed as named classes — improving maintainability and respecting the CSS module boundaries already established.

---

## 🎯 Summary Verdict

This is a **genuinely sophisticated, architecturally coherent single-developer engine** operating at a scale that most solo projects never reach — ~43K production lines, zero external dependencies, a live-passing 127-check audit gate, and a simulation architecture that correctly separates concerns in ways that professional game studios frequently fail at.

The core architectural contracts (VSRP-001 lifecycle, Faraday isolation, PRNG determinism, EventBus unbind lifecycle) are **real and enforced, not aspirational**. The Sentinel is not theater — it's a working anti-regression gate.

The most pressing technical evolution points are:
1. **Partitioning `manifest.js`** before it becomes unmaintainable
2. **Centralizing the script load order** into a shared manifest to eliminate the hand-sync risk between `index.html` and 5 test harnesses
3. **Reviewing `battler_baker.js`** section density before the next major aesthetic pass

> [!TIP]
> The `data/boilerplatetenant.js` in the `data/` folder is a gem — a ready-to-clone VSRP-001 compliant tenant scaffold. Consider making this the canonical entry point for any new district addition.
