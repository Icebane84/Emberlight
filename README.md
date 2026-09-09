# ⚡ EMBERLIGHT — Tactical War Table

> **A zero-dependency, browser-native sovereign game engine.**  
> Pure ES2022+ · Vanilla CSS · No npm · No bundler · No build step.

[![Sentinel](https://img.shields.io/badge/Sentinel-127%2F127%20PASS-brightgreen?style=flat-square)](#-sentinel-verification-gate)
[![Protocol](https://img.shields.io/badge/Protocol-VSRP--001%20v1.0.0--LOCKED-blue?style=flat-square)](#-vsrp-001-universal-module-contract)
[![Architecture](https://img.shields.io/badge/Architecture-4--Tier%20Sovereign-orange?style=flat-square)](#-4-tier-sovereign-architecture)
[![Dependencies](https://img.shields.io/badge/npm%20Dependencies-0-critical?style=flat-square)](#-zero-dependency-constraint)

---

## 🗺️ What Is Emberlight?

Emberlight is a full-featured tactical RPG engine running entirely in the browser — no build toolchain, no package manager, no external runtime. It implements a [2×2 Quad-Matrix War Table](#-2x2-quad-matrix-war-table) comprising:

- A **2D canvas cartography grid** with sub-pixel camera damping, fog-of-war, and dynamic shadow extrusions
- A **DDA pseudo-3D first-person raycaster** with entity billboards, mini-radar, and relative crawler kinematics
- A **headless CTB combat simulation** engine with formation tactics, boss enrage phases, and deterministic replay
- A **procedural chiptune sequencer** with FM synthesis and real-time biome mood transitions
- A **dual-formant speech synthesizer** for typewriter dialogue with distinct speaker profiles
- A **WebGL CRT post-processing compositor** with barrel curvature and scanline modulation
- A **19-pass autonomous Sentinel auditor** asserting 127 architectural invariants at boot

The engine is governed by [VSRP-001](#-vsrp-001-universal-module-contract) — a formal module lifecycle contract enforcing Faraday memory isolation, deterministic PRNG authority, and Action-Inversion input architecture across all simulation tenants.

---

## 🚀 Running the Engine

**No installation required.**

```bash
# Open index.html directly in any modern browser
# OR serve locally (recommended for audio/localStorage features):
npx -y serve . --listen 8080
```

> [!IMPORTANT]
> The engine requires no `npm install`, no compilation, and no environment setup. All modules are loaded via standard `<script>` tags in strict topological dependency order.

### Running the Headless Test Suite

Requires **Node.js ≥ 18** (for native `structuredClone` and `node:vm`).

```bash
# Master 19-pass Sentinel verification gate (127/127 checks)
node testing/test_sentinel.js

# Targeted subsystem suites
node testing/test_combat_input.js           # Combat input & Command Hub
node testing/test_hotkeys_and_expansion.js  # Viewport expansion & 3D crawler
node testing/test_combat_victory_transition.js  # Victory lifecycle
node testing/test_persistence_wiring.js     # Save/load & storage faults
node testing/test_input_settings_integration.js  # Decoupled input & settings SSOT
```

Expected output for all suites: **exit code 0**.

---

## 🏛️ 4-Tier Sovereign Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: THE HOST HARNESS                        │
│  GameRuntime (runtime.js) · SessionStore · EventBus · DistrictRouter  │
│  • Canonical SSOT: party, gold, inventory, worldPos, flags, quests    │
│  • SDCP-001 capability registry · Lifecycle orchestration             │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│    TIER 2: EPHEMERAL DISTRICTS   │  │    TIER 3: PERIPHERAL DRIVERS    │
│  Headless VSRP-001 State Machines│  │  Presentation & Hardware I/O     │
│  combat.js · overworld.js        │  │  combat_renderer.js · map_renderer│
│  progression.js · armory.js      │  │  dynamic_lights.js · pseudo_3d   │
│  lockpick.js · relic_forge.js    │  │  battle_backdrop.js · shader_comp│
│  market.js · chronicle.js        │  │  acoustic_sfx.js · synth_sound   │
│  script.js · status.js · ...     │  │  battler_baker.js · sprite_baker │
└──────────────────────────────────┘  └──────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│               TIER 4: MATH KERNELS & PROCEDURAL SSOT                   │
│  manifest.js · prng.js · dungeon_gen.js · auditor.js                  │
└────────────────────────────────────────────────────────────────────────┘
```

| Tier | Authority | Key Invariant |
|:---|:---|:---|
| **T1 Host Harness** | Persistent SSOT ownership, lifecycle | Never runs combat math or renders DOM directly |
| **T2 Simulation Tenants** | Authoritative game state within a session | Zero DOM · Zero `Math.random()` · Zero autonomous clocks |
| **T3 Peripheral Drivers** | Presentation, audio, hardware input | Zero simulation authority · Never mutates canonical state |
| **T4 Kernels & SSOT** | Pure math, frozen schema, procedural generation | Side-effect-free · `Object.freeze`d |

---

## 🖥️ 2×2 Quad-Matrix War Table

```
┌─────────────────────────────┬─────────────────────────────┐
│  Q1: TACTICAL CARTOGRAPHY   │  Q2: CORRIDOR SENSOR  [X]   │
│  • 2D canvas overworld map  │  • DDA pseudo-3D raycaster  │
│  • Sub-pixel camera (λ=12)  │  • 960×360 immersion mode   │
│  • Fog-of-war · Lantern     │  • Mini-radar + compass      │
├─────────────────────────────┼─────────────────────────────┤
│  Q3: TACTICAL SCANNER       │  Q4: READINESS DECK   [Z]   │
│  • Mini-HUD · Field Pouch   │  • 11 district workstations │
│  • Combat Arena + CTB Ribbon│  • Stat Radar · ECG canvas  │
│  • Threat Oracle telemetry  │  • Constellation skill tree  │
└─────────────────────────────┴─────────────────────────────┘
```

- **`[X]`** — Toggle first-person 3D immersion (Q1+Q2 fullscreen, 75° FOV, relative `W/A/S/D/Q` crawler)
- **`[Z]`** — Toggle Deep Analysis Workstation (Q4 fullscreen — Stat Radar, ECG, Formation Bench, Paper-Doll)
- **`[I]`** — Open in-situ Quick Field Pouch (item use without leaving the overworld)
- **`[ESC]`** — Settings modal / cancel active action

---

## 📜 VSRP-001 Universal Module Contract

Every Tier 2 simulation tenant **must** export exactly 9 lifecycle methods:

```javascript
const EmberlightMyDistrict = (() => {
  // Private closure — Faraday isolated
  return {
    configure(config) {},    // Ingest static operational parameters (once)
    init(context) {},        // Bind to host-provided capability handles
    reset(snapshot) {},      // Prime from structuredClone(snapshot) — never shallow copy
    update(dt, context) {},  // Advance simulation (no DOM, no Math.random())
    render(renderer, ctx) {},// Project state onto host renderer (no state mutation)
    getState() {},           // Return detached, JSON-serializable POJO snapshot
    getDiagnostics() {},     // Return telemetry (zero side-effects)
    getModuleInfo() {},      // Return { moduleId, version, protocolVersion, dependencies, capabilities }
    destroy() {},            // Release all handles, unbind EventBus tokens (idempotent)
  };
})();

if (typeof window !== 'undefined') window.EmberlightMyDistrict = EmberlightMyDistrict;
if (typeof module !== 'undefined') module.exports = EmberlightMyDistrict;
```

> [!IMPORTANT]
> **AC-02:** `reset(snapshot)` MUST use `structuredClone(snapshot)` — never `{ ...snapshot }`. Shallow copies sever the Faraday isolation contract.  
> **AC-05:** `Math.random()` is forbidden in all Tier 2 code. Use `EmberlightPRNG.create(seed)` exclusively.  
> **AC-06:** `context.inputs` must be processed immutably (index iteration). Never `shift()`, `pop()`, or `splice()`.

---

## 🔬 Component Registry (37 Modules)

| # | File | Tier | Role |
|:---|:---|:---|:---|
| 01 | [`manifest.js`](./manifest.js) | T4 SSOT | Game data, world map, stat calculators, item/enemy/quest catalog |
| 02 | [`prng.js`](./prng.js) | T4 Kernel | Mulberry32 seeded PRNG — `nextFloat`, `nextInt`, `fork()` |
| 02A | [`session_store.js`](./session_store.js) | T1 | Canonical session state, transactional mutators, persistence bridge |
| 02B | [`event_bus.js`](./event_bus.js) | T1 | Synchronous pub/sub + SDCP-001 sealed capability registry |
| 02C | [`world_ecology.js`](./world_ecology.js) | T1 | Map resolution, sparse tile mutations, dungeon bridging |
| 02D | [`district_router.js`](./district_router.js) | T1 | District navigation, modal isolation, transition lifecycle |
| 03 | [`acoustic_sfx.js`](./acoustic_sfx.js) | T3 | Web Audio engine — stereo panning, convolution reverb, 11 SFX |
| 04 | [`synth_soundtrack.js`](./synth_soundtrack.js) | T3 | 4-channel FM procedural chiptune sequencer |
| 05 | [`synthetic_voice.js`](./synthetic_voice.js) | T3 | Dual-formant procedural speech synthesizer |
| 06 | [`input.js`](./input.js) | T3 | Hardware-to-action token translator + `clear()` gate |
| 07 | [`icons.js`](./icons.js) | T3 | JIT 48px procedural icon baker — boss heat pulsation, glass refraction |
| 08 | [`skill_icons.js`](./skill_icons.js) | T3 | 36px skill glyph baker for all 36 constellation nodes |
| 09 | [`party_icons.js`](./party_icons.js) | T3 | Procedural character portrait generator |
| 10 | [`sprite_baker.js`](./sprite_baker.js) | T3 | 32×32 overworld paper-doll synthesizer (4× supersampling) |
| 11 | [`battler_baker.js`](./battler_baker.js) | T3 | 64×64 combat battler synthesizer — 11 archetypes, PBR lighting |
| 12 | [`battle_backdrop.js`](./battle_backdrop.js) | T3 | Parallax combat stage renderer — 4 biomes with god-rays |
| 13 | [`combat_vfx.js`](./combat_vfx.js) | T3 | Kinetic VFX overlay — particles, arcs, damage floaters, screen shake |
| 13A | [`combat_renderer.js`](./combat_renderer.js) | T3 | Combat stage DOM presenter — CTB ribbon, wings, Command Hub |
| 13B | [`map_renderer.js`](./map_renderer.js) | T3 | 2D canvas map + camera — LoS fog, HiDPI, Y-sorted entities |
| 13C–I | `armory/chronicle/progression/market/status/relic_forge/cockpit_renderer.js` | T3 | District presentation drivers |
| 14 | [`dynamic_lights.js`](./dynamic_lights.js) | T3 | Environmental lighting — lantern cone, shadow fins, crypt motes |
| 15 | [`pseudo_3d_renderer.js`](./pseudo_3d_renderer.js) | T3 | DDA raycaster — textures, billboards, radar, compass |
| 16 | [`shader_compositor.js`](./shader_compositor.js) | T3 | WebGL CRT — barrel distortion, chromatic aberration, scanlines |
| 17 | [`threat_oracle.js`](./threat_oracle.js) | T3 | 12-turn CTB forecast + damage range telemetry |
| 18 | [`overworld.js`](./overworld.js) | T2 D1 | Spatial grid sim — collision, danger rolls, encounter triggers |
| 19 | [`combat.js`](./combat.js) | T2 D2 | CTB combat sim — formations, ailments, boss phases, displacement |
| 20 | [`script.js`](./script.js) | T2 D3 | Branching dialogue runner — typewriter, choices, token interpolation |
| 21 | [`armory.js`](./armory.js) | T2 D4 | Equipment district — stat-gated validation, equip deltas |
| 22 | [`progression.js`](./progression.js) | T2 D5 | Aether Matrix — constellation SP allocation, respec |
| 23 | [`status.js`](./status.js) | T2 D6 | Party status — row shifting, field healing, ailment tracking |
| 24 | [`market.js`](./market.js) | T2 D7 | Commerce district — buy/sell, stock validation, purse deltas |
| 25 | [`chronicle.js`](./chronicle.js) | T2 D8 | Quest journal — stage progression, flag registry |
| 26 | [`relic_forge.js`](./relic_forge.js) | T2 D9 | Procedural relic synthesis — seed attunement, deterministic crafting |
| 27 | [`lockpick.js`](./lockpick.js) | T2 D10 | Harmonic lockpick minigame — Lissajous waveforms, phase matching |
| 28 | [`settings.js`](./settings.js) | T2 D11 | System config — audio, CRT, keymaps, save/eject |
| 29 | [`dungeon_gen.js`](./dungeon_gen.js) | T4 | BSP + Drunkard's Walk floor carver — 100% path connectivity |
| 30 | [`auditor.js`](./auditor.js) | T4 | 19-pass Sentinel gate — 127/127 anti-entropy checks |
| 31 | [`save_manager.js`](./save_manager.js) | T1 | Persistence — sparse delta encoding (<2.5KB budget), migrations |
| 32 | [`runtime.js`](./runtime.js) | T1 | Host lifecycle coordinator — frame tick, viewport, district dispatch |
| 33 | [`index.css`](./index.css) | Style | 5-partition CSS aggregator → `css/` |
| 34 | [`index.html`](./index.html) | Shell | Semantic DOM shell, 55-module ordered script bundle |

---

## 🔒 Zero-Dependency Constraint

This engine deliberately enforces a **zero-npm boundary**:

| Forbidden | Reason |
|:---|:---|
| `npm`, `npx`, `yarn`, `pnpm` | No package manager surface |
| `package.json`, `node_modules/` | No dependency tree |
| `import … from` / `export default` | No ES module syntax — IIFE dual-binding only |
| `Jest`, `Mocha`, `Vitest`, `JSDOM` | Test harnesses use native `node:vm` exclusively |
| `.eslintrc`, external linter configs | Static analysis via VS Code `checkJs: true` in `jsconfig.json` |

All modules use the **Universal IIFE Dual-Binding Pattern**:

```javascript
const EmberlightX = (() => { /* private closure */ return { /* public API */ }; })();
if (typeof window !== 'undefined') window.EmberlightX = EmberlightX;
if (typeof module !== 'undefined') module.exports = EmberlightX;
```

This allows every module to execute identically in the browser **and** inside the headless `node:vm` Sentinel test context without any transpilation.

---

## 🛡️ Sentinel Verification Gate

The Sentinel Auditor (`auditor.js`) runs a **19-pass, 127-check** anti-entropy battery at engine boot and in CI:

| Pass | Domain |
|:---|:---|
| 1 | Lifecycle & Faraday Isolation Traps (AC-01 → AC-10) |
| 2 | Combat Simulation & Damage Formulas |
| 3 | Overworld Navigation & Collision |
| 4 | Market Commerce & Purse Deltas |
| 5 | Progression Constellation & Respec |
| 6 | Harmonic Lockpick Waves |
| 7 | Relic Forge Determinism |
| 8 | Pseudo-3D Raycaster Buffer Telemetry |
| 9 | SDCP-001 Capabilities & Anti-Entropy Seal |
| 10 | Formation Shielding & Vanguard Interception |
| 11 | Boss Enrage Phases & Status Ailment DOTs |
| 12 | Peripheral Driver Lifecycle Contracts |
| 13 | Persistence Compression (<2.5KB) & EventBus Teardown |
| 14 | Battler Synthesis & Biome Backdrop Depth |
| 15 | District Transition & Chest Collision Invariance |
| 16 | Surfacing, Stat Projections & Field Pouch Targeting |
| 17 | VSRP-001 Constitutional Compliance (AC-01 → AC-10, all 11 tenants) |
| 18 | Tactical Displacement — Knockback / Pull Row Invariance |
| 19 | Deep Analysis Workstation & ECG Oscilloscope Canvas |

**Acceptance:** `=== SENTINEL AUDIT 100% SUCCESS: 127/127 CHECKS PASSED ===` (exit 0).  
Any regression that breaks a single check fails the gate (exit 1).

---

## 🗂️ Directory Structure

```
Emberlight/
├── index.html              # DOM shell & ordered 55-module script bundle
├── index.css               # CSS aggregator → css/
├── css/
│   ├── 01_core_cockpit.css
│   ├── 02_sensors_cartography.css
│   ├── 03_scanner_progression.css
│   ├── 04_combat_arena.css
│   └── 05_combat_vfx_nav.css
├── data/
│   ├── settings.json       # Centralized settings SSOT (keymap, audio, tuning, debug)
│   └── boilerplatetenant.js # VSRP-001 compliant district scaffold template
├── testing/
│   ├── test_sentinel.js    # Master 19-pass audit runner
│   ├── test_combat_input.js
│   ├── test_hotkeys_and_expansion.js
│   ├── test_combat_victory_transition.js
│   ├── test_persistence_wiring.js
│   └── test_input_settings_integration.js
├── docs/
│   ├── ARCHITECTURE.md              # Full 4-tier architecture specification
│   ├── VSRP-001_Universal_Module_Contract.md
│   └── tenants_registry.md          # 37-component production topology registry
└── [44 engine .js modules]          # All flat at root — no src/, no dist/
```

---

## 🎮 Key Hotkeys

| Key | Action |
|:---|:---|
| `WASD` / Arrows | Navigate overworld (cardinal) or 3D crawler (relative when `[X]` active) |
| `E` | Armory district |
| `T` | Market district |
| `C` | Chronicle journal |
| `F` | Relic Forge |
| `P` | Progression constellation |
| `I` | Quick Field Pouch (in-situ item use) |
| `X` | Toggle first-person 3D immersion (Q2 fullscreen) |
| `Z` | Toggle Deep Analysis Workstation (Q4 fullscreen) |
| `ESC` | Settings modal / cancel |
| `SPACE` / `ENTER` | Confirm / advance dialogue |
| `1–4` | Combat action choices / dialogue choices |

---

## 📡 EventBus Channel Catalog

| Topic | Producer | Consumer | Payload |
|:---|:---|:---|:---|
| `input:action` | `input.js` | `runtime.js`, active districts | Normalized action token |
| `combat:sfx` | `combat.js` | `acoustic_sfx.js` | Audio cue identifier |
| `combat:vfx` | `combat.js` | `combat_vfx.js` | VFX trigger descriptor |
| `combat:banner` | `combat.js` | `combat_renderer.js` | Turn alert text & style |
| `combat:resolved` | `combat.js` | `runtime.js` | `{ outcome, exp, loot, gold }` |
| `stage:illuminate` | `combat.js` | `battle_backdrop.js` | Optical flash trigger |
| `pouch:use_item` | `cockpit_renderer.js` | `runtime.js`, `status.js` | Item consumption target |
| `<district>:resolved` | Any T2 tenant | `runtime.js` | Delta envelope |
| `system:command` | `settings.js` | `runtime.js` | `SAVE_GAME \| LOAD_GAME \| EJECT_TITLE \| TOGGLE_MUTE` |

---

## ⚖️ License

*All rights reserved — Emberlight Sovereign Engine. See repository owner for licensing terms.*

---

<div align="center">

**⚡ EMBERLIGHT // WAR TABLE ⚡**  
*Zero Entropy. Coherence through Confrontation.*

</div>
