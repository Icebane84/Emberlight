# ⚡ EMBERLIGHT — Tactical War Table

> **A zero-dependency, browser-native sovereign game engine & governance substrate.**
> Pure ES2022+ · Vanilla CSS · No npm · No bundler · No build step · 100% Headless Testability.

[![Sentinel](https://img.shields.io/badge/Sentinel-219%2F219%20PASS-brightgreen?style=flat-square)](#-sentinel-verification-gate)
[![Master Suites](https://img.shields.io/badge/Master%20Suites-9%2F9%20PASS-brightgreen?style=flat-square)](#-headless-test-batteries)
[![Protocols](https://img.shields.io/badge/Protocols-VSRP--001%20%7C%20MPFS--001%20%7C%20VLT--003%20%7C%20STCP--002-blue?style=flat-square)](#-vsrp-001-universal-module-contract)
[![Architecture](https://img.shields.io/badge/Architecture-4--Tier%20Sovereign-orange?style=flat-square)](#-4-tier-sovereign-architecture)
[![Dependencies](https://img.shields.io/badge/npm%20Dependencies-0-critical?style=flat-square)](#-zero-dependency-constraint)

---

## 🗺️ What Is Emberlight?

Emberlight is a full-featured tactical RPG engine and autonomous governance workbench running entirely in the browser — without a build toolchain, package manager, or external runtime. It unites:

- A **[2×2 Quad-Matrix War Table](#-2x2-quad-matrix-war-table)** (Q1 Tactical Cartography, Q2 First-Person DDA Raycaster, Q3 Tactical Combat Arena & Threat Oracle, Q4 Deep Analysis Workstation).
- A **headless CTB combat simulation** engine with formation tactics, boss enrage phases, and deterministic replay.
- A **procedural chiptune synthesizer** with FM synthesis, SPC700 stereo delay emulation, vacuum-tube saturation curves, and algorithmic Bytebeat audio.
- A **dual-formant speech synthesizer** for typewriter dialogue with distinct speaker profiles.
- A **WebGL CRT post-processing compositor** with barrel curvature, chromatic aberration, and scanline modulation.
- A **21-pass autonomous Sentinel auditor** asserting **219 architectural invariants** at boot.
- The **Phoenix Sovereign Web IDE & Governance Workbench** — an in-browser development environment with AST inspection, live zero-state hotswapping, and PGE-DSL-1 proposal gatekeepers.
- The **Synarche Transduction & Multi-Plane Compiler** (`synarche_parser.js`) enforcing STCP-002 type inference and GUCA cartridge emission.

The engine is strictly governed by **VSRP-001** (Universal Module Contract) and **MPFS-001** (Modular Pipeline File Structure), enforcing Faraday memory isolation, deterministic PRNG authority, Action-Inversion input architecture, and zero-drift topological ordering across all simulation tenants.

---

## 🚀 Running the Engine & Workbench

**No installation required.**

```bash
# 1. Play the Game: Open index.html directly in any modern browser
# OR serve locally (recommended for Web Audio and localStorage features):
npx -y serve . --listen 8080

# 2. Launch the Phoenix Sovereign Governance Workbench & Web IDE:
# Double-click launch_workbench.bat OR run in shell:
./launch_workbench.bat
# (Launches runner.html / phoenix/index.html with full AST and Governor telemetry)
```

> [!IMPORTANT]
> The engine requires no `npm install`, no compilation, and no environment setup. All 73 engine modules load via standard `<script>` tags in strict topological dependency order.

---

## 🧪 Headless Test Batteries

The engine maintains a complete headless testing battery running under native **Node.js ≥ 18** standard libraries (`node:vm`, `node:fs`, `node:path`, `node:assert`, `structuredClone`) with zero test dependencies.

### Master Verification Gate (All 9 Suites)

Run the comprehensive master verification command to evaluate all suites sequentially:

```bash
node testing/run_all_tests.js
```

Expected output: **9/9 SUITES PASSED (100% Success, 0 Drift)**:
- **Plane 1–3:** Synarche Lexer, Parser, Type System & GUCA Cartridge Emitter (28/28 checks)
- **Vector 1–6:** VLT-003 Virtual Lexical Topology & Jump Table Calibration (6/6 checks)
- **Vector 1–6:** SplitMix32 / Mulberry32 PRNG Determinism & Decorrelation (6/6 checks)
- **Vector 1–7:** Continuous Noise, Simplex & Procedural Heightmap Coherence (7/7 checks)
- **Static Syntax:** Headless VM compilation of all 86 modules (86/86 PASS)
- **Phoenix Protocol:** Phoenix Sovereign Engine & Governance Battery (134/134 PASS)
- **Synarche Workbench:** In-IDE AST inspection and workbench integration
- **Sentinel Audit:** 21-Pass Headless Sovereign Audit (219/219 PASS)
- **Mutation Crucible:** Sentinel Anti-Theater Fault-Injection Battery (8/8 mutants killed, 0 survivors)

### Targeted Test Runners

```bash
# 21-Pass Master Sentinel Verification Gate (219 checks)
node testing/test_sentinel.js

# Phoenix Protocol & Governance Verification Suite (134 checks)
node testing/test_phoenix.js

# Anti-Theater Mutation Crucible (8 fault-injection trials)
node testing/test_mutation.js

# STCP Synarche Parser & Transduction Battery (28 checks)
node testing/test_synarche_parser.js

# VLT-003 Jump Table Compliance & Scaffolding Suite (6 checks)
node testing/test_vlt_compliance.js

# PRNG Determinism & Pearson Decorrelation Battery (6 checks)
node testing/test_prng.js

# Simplex & Continuous Noise Invariant Suite (7 checks)
node testing/test_noise.js

# Zero-Warning Syntax & AST Compilation Battery (86 modules)
node testing/test_syntax.js
```

---

## 🏛️ 4-Tier Sovereign Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: THE HOST HARNESS                        │
│   GameRuntime · SessionStore · EventBus · DistrictRouter · SaveMgr     │
│  • Canonical SSOT: party, gold, inventory, worldPos, flags, quests    │
│  • SDCP-001 capability registry · Lifecycle & district orchestration   │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│    TIER 2: EPHEMERAL DISTRICTS   │  │    TIER 3: PERIPHERAL DRIVERS    │
│  Headless VSRP-001 State Machines│  │  Presentation & Hardware I/O     │
│  combat.js · overworld.js        │  │  combat_renderer · map_renderer  │
│  progression.js · armory.js      │  │  dynamic_lights  · pseudo_3d     │
│  lockpick.js · relic_forge.js    │  │  battle_backdrop · shader_comp   │
│  market.js · chronicle.js        │  │  acoustic_sfx    · synth_sound   │
│  script.js · status.js · settings│  │  battler_baker   · sprite_baker  │
└──────────────────────────────────┘  └──────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│               TIER 4: MATH KERNELS & PROCEDURAL SSOT                   │
│   manifest.js · prng.js · noise.js · dungeon_gen.js · auditor.js      │
└────────────────────────────────────────────────────────────────────────┘
```

### MPFS-001 Modular Pipeline File Structure

To prevent massive monolithic files while preserving browser-native zero-bundler execution, complex domains are decomposed into specialized sub-modules within dedicated directories. Sub-modules populate an ephemeral staging membrane on `window` (`window._<Domain>Internal`). A root facade script ingests the membrane, deeply freezes immutable structures, purges the staging membrane, and exports the canonical API:

| Domain | Sub-Module Pipeline Directory | Root Facade |
| :--- | :--- | :--- |
| **Manifest** | `manifest/` (config, actors, items, progression, world, narrative, calculators, lexicon) | [`manifest.js`](./manifest.js) |
| **Combat** | `combat/` (calc, displacement, queue, ai, state, actions, projection, orchestrator) | [`combat.js`](./combat.js) |
| **Auditor** | `auditor/` (kernel, contracts, district_sims, combat_extended, persistence, constitutional, endgame) | [`auditor.js`](./auditor.js) |
| **Runtime** | `runtime/` (state, presentation, interactions, navigation, stepper, events) | [`runtime.js`](./runtime.js) |
| **Battler Baker** | `battler_baker/` (primitives, heroes, equipment, enemies, pipeline) | [`battler_baker.js`](./battler_baker.js) |
| **Pseudo-3D** | `pseudo_3d/` (textures, dda, billboards, pipeline) | [`pseudo_3d_renderer.js`](./pseudo_3d_renderer.js) |
| **Dynamic Lights** | `dynamic_lights/` (primitives, shadows, emitters, pipeline) | [`dynamic_lights.js`](./dynamic_lights.js) |
| **Map Renderer** | `map/` (textures, particles, los, compositor) | [`map_renderer.js`](./map_renderer.js) |
| **Dungeon Gen** | `dungeon_gen/` (bsp, drunkard, hazards) | [`dungeon_gen.js`](./dungeon_gen.js) |

---

## 🖥️ 2×2 Quad-Matrix War Table

```
┌─────────────────────────────┬─────────────────────────────┐
│  Q1: TACTICAL CARTOGRAPHY   │  Q2: CORRIDOR SENSOR  [X]   │
│  • 2D canvas overworld map  │  • DDA pseudo-3D raycaster  │
│  • Sub-pixel camera (λ=12)  │  • 960×360 immersion mode   │
│  • Dynamic lighting & LoS   │  • Mini-radar + compass      │
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
> - **AC-01 / AC-02:** `reset(snapshot)` MUST use `structuredClone(snapshot)`. Tenants are Faraday-isolated: zero direct access to `window`, `document`, or `localStorage`.
> - **AC-05:** `Math.random()` is forbidden in all Tier 2 simulation logic. Use seeded `EmberlightPRNG.create(seed)` exclusively.
> - **AC-06:** `context.inputs` must be processed immutably via index iteration. Never mutate via `shift()`, `pop()`, or `splice()`.
> - **AC-08:** Zero transient GC allocations (`{}`, `[]`, `new Float32Array`) in 60 FPS hot paths (`update()`, `render()`).

---

## 🔬 Component Registry & Canonical Load Order (73 Modules)

The single source of truth for topological load order is [`testing/load_order.js`](file:///c:/Users/Chris/Emberlight/testing/load_order.js). Both `index.html` and the headless test runners ingest this exact sequence:

| Step | Script / Module | Tier | Description |
| :--- | :--- | :--- | :--- |
| **01–08** | `manifest/manifest_*.js` (8 sub-modules) | T4 | Actor stats, item catalog, world data, calculators, lexicon |
| **09** | [`manifest.js`](./manifest.js) | T4 SSOT | Ingests membrane, seals schema, exports `EmberlightManifest` |
| **10** | [`prng.js`](./prng.js) | T4 Kernel | SplitMix32 / Mulberry32 seeded deterministic PRNG |
| **11** | [`noise.js`](./noise.js) | T4 Kernel | Simplex, Perlin, fBm, turbulence, and ridge continuous noise |
| **12–13** | [`session_store.js`](./session_store.js), [`event_bus.js`](./event_bus.js) | T1 Host | Transactional state store, type-safe EventBus, SDCP-001 registry |
| **14–15** | [`world_ecology.js`](./world_ecology.js), [`district_router.js`](./district_router.js) | T1 Host | Spatial map mutation resolver, district lifecycle router |
| **16–18** | [`acoustic_sfx.js`](./acoustic_sfx.js), [`synth_soundtrack.js`](./synth_soundtrack.js), [`synthetic_voice.js`](./synthetic_voice.js) | T3 Audio | Web Audio SFX, FM/Bytebeat chiptune tracker, dual-formant voice |
| **19** | [`input.js`](./input.js) | T3 Input | Action-Inversion hardware keyboard translator |
| **20–23** | `icons.js`, `skill_icons.js`, `party_icons.js`, `sprite_baker.js` | T3 Bakers | Procedural 48px icons, 36px constellation glyphs, 32×32 paper-dolls |
| **24** | [`fabrik_ik.js`](./fabrik_ik.js) | T3 Rigging | Forward And Backward Reaching Inverse Kinematics solver |
| **25** | [`combat_vfx.js`](./combat_vfx.js) | T3 VFX | Particle emitters, screen shake, chromatic damage floaters |
| **26–30** | `dynamic_lights/` (4 sub-modules) $\to$ [`dynamic_lights.js`](./dynamic_lights.js) | T3 Light | Radial emitters, LoS ray casting, soft shadow fin polygons |
| **31–35** | `pseudo_3d/` (4 sub-modules) $\to$ [`pseudo_3d_renderer.js`](./pseudo_3d_renderer.js) | T3 3D | DDA raycaster, decorrelated masonry, billboards, radar |
| **36** | [`shader_compositor.js`](./shader_compositor.js) | T3 Shader | WebGL CRT barrel distortion, phosphors, vignette |
| **37–42** | `battler_baker/` (5 sub-modules) $\to$ [`battler_baker.js`](./battler_baker.js) | T3 Battler | 64×64 animated battler synthesizer across 11 archetypes |
| **43–47** | `battle_backdrop.js`, `threat_oracle.js`, `cockpit_renderer.js`, `combat_renderer.js` | T3 Render | Stage silhouettes, 12-turn CTB forecast, HUD deck cards, arena |
| **48–52** | `map/` (4 sub-modules) $\to$ [`map_renderer.js`](./map_renderer.js) | T3 Render | 2D canvas cartography, dynamic light composite, LoS fog |
| **53–58** | `armory/chronicle/progression/market/status/relic_forge_renderer.js` | T3 Render | District presentation rendering drivers |
| **59** | [`progression.js`](./progression.js) | T2 D5 | Constellation skill tree, node prerequisites, respec |
| **60–67** | `combat/` (7 sub-modules) $\to$ [`combat.js`](./combat.js) | T2 D2 | Headless CTB combat kernel, formations, AI, queue, displacement |
| **68–73** | `script.js`, `overworld.js`, `armory.js`, `market.js`, `chronicle.js`, `status.js` | T2 Dist | Branching dialogue, spatial overworld, gear, shop, quests, status |
| **74–81** | `auditor/` (7 sub-modules) $\to$ [`auditor.js`](./auditor.js) | T4 Gate | Autonomous Sentinel Auditor (21-pass architectural governance) |
| **82–86** | `relic_forge.js`, `dungeon_gen/` (3 sub-modules) $\to$ `dungeon_gen.js`, `lockpick.js`, `settings.js` | T2/T4 | Relic forge, BSP/Drunkard dungeon carver, lockpick, settings |
| **87** | [`save_manager.js`](./save_manager.js) | T1 Store | Sparse delta save encoder (<2.5KB budget), LZ-based migrations |
| **88–94** | `runtime/` (6 sub-modules) $\to$ [`runtime.js`](./runtime.js) | T1 Host | Master loop, frame tick stepper, input dispatch, district router |

---

## 🔒 Zero-Dependency Constraint

This engine enforces an immutable **zero-npm boundary**:

| Forbidden | Reason |
| :--- | :--- |
| `npm`, `npx`, `yarn`, `pnpm` dependencies | Zero third-party supply chain vulnerabilities; long-term durability |
| `package.json`, `node_modules/` in root | No dependency tree overhead; 100% self-contained repository |
| `import … from` / `export default` | Zero bundler requirement; native browser and `node:vm` execution |
| `Jest`, `Mocha`, `Vitest`, `JSDOM` | Headless verification using lightweight `node:vm` and `mock_dom.js` |
| `.eslintrc`, external linter tools | Static typing via VS Code `checkJs: true` and the Error Resolution Ledger |

All modules employ the **Universal IIFE Dual-Binding Pattern**:

```javascript
const EmberlightX = (() => { /* private closure */ return { /* public API */ }; })();
if (typeof window !== 'undefined') window.EmberlightX = EmberlightX;
if (typeof module !== 'undefined') module.exports = EmberlightX;
```

---

## 🛡️ Sentinel Verification Gate (21 Passes / 219 Checks)

The Sentinel Auditor runs a **21-pass, 219-check** anti-entropy battery on boot and in CI:

| Pass | Domain & Audit Scope |
| :--- | :--- |
| **Pass 1** | VSRP-001 Lifecycle & Faraday Isolation Traps (AC-01 through AC-10 across all tenants) |
| **Pass 2** | Headless Combat Simulation Battery (20 automated matches with zero NaN damage) |
| **Pass 3** | Overworld Spatial Grid Simulation, Collision Matrix & Encounter Rates |
| **Pass 4** | Market Commerce, Stock Quantities & Gold Purse Transaction Deltas |
| **Pass 5** | Progression Constellation Graph Validation & Respec Point Conservation |
| **Pass 6** | Harmonic Lockpick Resonance, Lissajous Waveforms & Attenuation Envelopes |
| **Pass 7** | Relic Forge PRNG Determinism & Economic Crafting Bounds |
| **Pass 8** | Pseudo-3D Raycaster Headless Buffer Allocation & Frame Telemetry |
| **Pass 9** | SDCP-001 Capability Registry Attenuation & Anti-Entropy Cryptographic Seals |
| **Pass 10** | Formation Topology, Vanguard Interception & Backline Row Shielding |
| **Pass 11** | Boss Enrage Phase Transitions, Shaders & Status Ailment DOT Damage |
| **Pass 12** | Dual-Perspective Switching & 3D Raycaster Immersion State Transitions |
| **Pass 13** | Persistence Compression (<2.5KB budget), State Serialization & EventBus Teardown |
| **Pass 14** | Combat Aesthetics, Dynamic Backdrops & Procedural Battler Synthesis |
| **Pass 15** | District Router Transitions, Viewport Expansion & Chest Collision Invariance |
| **Pass 16** | Surfacing, Stat Projections & Field Pouch Inventory Targeting (ARCH-SPEC-SURFACING-001) |
| **Pass 17** | VSRP-001 Constitutional Compliance Criteria (AC-01 → AC-10 full verification) |
| **Pass 18** | Tactical Displacement — Knockback & Pull Row Invariance |
| **Pass 19** | Deep Analysis Mode, Stat Radar & ECG Oscilloscope Canvas Rendering |
| **Pass 20** | 4-Quadrant War Table Skeleton & Spatial Projection (AOP-WAR-TABLE-SKELETON-001) |
| **Pass 21** | 4-Quadrant Combat Station Integration & Turn Handshake (AOP-COMBAT-STATION-002) |

**Master Sentinel Acceptance:**
```
============================================================
SENTINEL AUDIT: 219/219 CHECKS PASSED
✨ 100% ZERO-ENTROPY PASS: ALL CONSTITUTIONAL CRITERIA MET ✨
============================================================
```

---

## 🏛️ The Phoenix Sovereign Web IDE & Governance Workbench

Located in [`phoenix/`](file:///c:/Users/Chris/Emberlight/phoenix) and launchable via [`launch_workbench.bat`](file:///c:/Users/Chris/Emberlight/launch_workbench.bat), the Phoenix Workbench is an in-browser development environment and governance tool:

- **Virtual Lexical Topology (VLT-003):** 3-plane code editor featuring transparent `<textarea>` overlay on synchronized `<pre><code>` backdrops with binary-search syntax error location.
- **PGE-DSL-1 Governor:** Safe automated code modification gate that validates proposals against invariants, creates discrete hunks, and verifies changes against Sentinel before committing.
- **PERSIST-001 Memory Visualizer:** Real-time binary heap inspection of linear memory buffers (2048-byte cartridges).
- **Synarche Transduction Engine:** In-browser compilation and execution of sovereign cartridges.

---

## 🗂️ Directory Structure

```
Emberlight/
├── index.html                   # Master DOM shell & 73-module ordered script bundle
├── index.css                    # CSS master aggregator (5 partitions)
├── launch_workbench.bat         # One-click launcher for Phoenix Sovereign Web IDE
├── runner.html                  # Phoenix IDE test & cartridge runner harness
├── globals.d.ts                 # Ambient TypeScript definitions for zero-error checkJs
├── jsconfig.json                # VS Code TypeScript engine configuration (checkJs: true)
│
├── css/                         # 5 Partitioned Magitek Stylesheets
│   ├── 01_core_cockpit.css      # CRT bezel, typography, reset, grid layouts
│   ├── 02_sensors_cartography.css # Q1 map, fog-of-war, compass, lighting
│   ├── 03_scanner_progression.css # Q3 HUD, party cards, Q4 constellations
│   ├── 04_combat_arena.css      # Q3 combat arena, CTB ribbon, command hub
│   └── 05_combat_vfx_nav.css    # Floating damage, particle shaders, modals
│
├── manifest/                    # Tier 4: Static Schema Sub-modules (MPFS-001)
├── combat/                      # Tier 2: CTB Combat Simulation Sub-modules
├── auditor/                     # Tier 4: 21-Pass Sentinel Audit Sub-modules
├── runtime/                     # Tier 1: Host Runtime Orchestration Sub-modules
├── battler_baker/               # Tier 3: Procedural Battler Synthesis Sub-modules
├── pseudo_3d/                   # Tier 3: First-Person DDA Raycaster Sub-modules
├── dynamic_lights/              # Tier 3: 2D LoS Dynamic Lighting Sub-modules
├── map/                         # Tier 3: Tactical Cartography Sub-modules
├── dungeon_gen/                 # Tier 4: BSP & Drunkard Floor Carver Sub-modules
├── phoenix/                     # Phoenix Sovereign Web IDE, Governor & Proposal Engine
│
├── testing/                     # Headless node:vm Test Batteries
│   ├── load_order.js            # Authoritative SSOT for 73-script topological order
│   ├── mock_dom.js              # Minimal headless DOM/Canvas/Audio mock context
│   ├── run_all_tests.js         # Master 9-suite verification test runner
│   ├── test_sentinel.js         # 21-pass Sentinel audit runner (219 checks)
│   ├── test_phoenix.js          # Phoenix Sovereign protocol test runner (134 checks)
│   ├── test_mutation.js         # Sentinel anti-theater mutation crucible (8 trials)
│   ├── test_synarche_parser.js  # STCP Synarche compiler & type unification suite
│   ├── test_vlt_compliance.js   # VLT-003 region & jump table compliance runner
│   ├── test_prng.js             # PRNG determinism & decorrelation suite
│   ├── test_noise.js            # Simplex & continuous noise invariant suite
│   └── test_syntax.js           # Headless VM syntax & AST compilation battery
│
├── data/                        # Static JSON defaults & boilerplates
│   ├── settings.json            # Centralized settings SSOT
│   └── boilerplatetenant.js     # Canonical VSRP-001 district template
│
├── docs/                        # Architectural specifications
│   ├── ARCHITECTURE.md          # Full 4-tier architectural specification
│   ├── VSRP-001_Universal_Module_Contract.md
│   └── tenants_registry.md      # Production topology registry
│
└── [28 Root Facades & Drivers]  # Thin facades (combat.js, auditor.js, runtime.js, etc.)
```

---

## 🎮 Key Hotkeys

| Key | Action |
| :--- | :--- |
| `WASD` / Arrows | Navigate overworld (cardinal) or 3D crawler (relative when `[X]` active) |
| `E` | Armory district (equipment, inventory, stat comparison) |
| `T` | Market district (commerce, buy/sell, merchant stock) |
| `C` | Chronicle journal (quest log, discovery dossiers, telegraph dispatches) |
| `F` | Relic Forge (procedural synthesis, socket attunement) |
| `P` | Progression constellation (Aether Matrix, skill point attunement, respec) |
| `I` | Quick Field Pouch (in-situ item consumption without leaving the overworld) |
| `X` | Toggle first-person 3D immersion (Q2 960×360 raycaster crawler) |
| `Z` | Toggle Deep Analysis Workstation (Q4 fullscreen — Stat Radar, ECG, Paper-Doll) |
| `ESC` | Settings modal / cancel active command |
| `SPACE` / `ENTER` | Confirm action / advance typewriter dialogue |
| `1–4` | Combat skill levers / dialogue response branches |

---

## 📡 EventBus Channel Catalog

| Topic | Producer | Consumer | Payload |
| :--- | :--- | :--- | :--- |
| `input:action` | `input.js` | `runtime.js`, active districts | Normalized action token string |
| `combat:sfx` | `combat.js` | `acoustic_sfx.js` | Procedural audio cue identifier (`SLASH`, `MAGIC`, etc.) |
| `combat:vfx` | `combat.js` | `combat_vfx.js` | Particle & animation trigger descriptor |
| `combat:banner` | `combat.js` | `combat_renderer.js` | Turn alert text and CSS presentation style |
| `combat:resolved` | `combat.js` | `runtime.js` | `{ outcome: 'VICTORY' \| 'DEFEAT', exp, loot, gold }` |
| `stage:illuminate` | `combat.js` | `battle_backdrop.js` | Volumetric optical flash descriptor |
| `pouch:use_item` | `cockpit_renderer.js` | `runtime.js`, `status.js` | Target entity index and item identifier |
| `<district>:resolved` | Any T2 tenant | `runtime.js` | Transactional delta state envelope |
| `system:command` | `settings.js` | `runtime.js` | `SAVE_GAME \| LOAD_GAME \| EJECT_TITLE \| TOGGLE_MUTE` |

---

## ⚖️ License

*All rights reserved — Emberlight Sovereign Engine. See repository owner for licensing terms.*

---

<div align="center">

**⚡ EMBERLIGHT // WAR TABLE ⚡**  
*Zero Entropy. Coherence through Confrontation.*

</div>
