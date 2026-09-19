# 🏛️ Emberlight Modular Directory Topology

```text
Emberlight/
├── index.html                       <-- Master Semantic DOM Shell & SSOT-governed script loader
├── index.css                        <-- Master CSS Manifest (@import Orchestrator)
│
├── data/                            <-- SSOT Game Data & Config Manifests
│   ├── manifest.js                  <-- SCHEMA-1.4.0: Canonical game catalog, nodes & calculus
│   └── settings.json                <-- Operational default keymaps, audio mix & tuning
│
├── css/                             <-- Partitioned Architectural Stylesheets
│   ├── 01_core_cockpit.css          <-- Design tokens, CRT shaders, top bar, mini-HUD, modal deck
│   ├── 02_sensors_cartography.css   <-- Q1 map grid, subterranean shaders, Q2 3D raycaster viewport
│   ├── 03_scanner_progression.css   <-- Q3 field scanner, tactical dock, Q4 party HUD, Aether Matrix
│   ├── 04_combat_arena.css          <-- Dual-zone combat arena, opposing wings, battler sprites
│   └── 05_combat_vfx_nav.css        <-- Energy barriers, status ailments, displacements, global nav
│
├── js/
│   ├── core/                        <-- Tier 2: VSRP-001 Ephemeral Simulation Tenants & Kernel
│   │   ├── prng.js                  <-- Pure 32-bit Mulberry32 Seeded PRNG stream kernel
│   │   ├── session_store.js         <-- Authoritative Session SSOT state store & snapshot reads
│   │   ├── event_bus.js             <-- SDCP-001 synchronous event broker & capability arbiter
│   │   ├── auditor.js               <-- Sentinel 19-pass anti-entropy verification test battery
│   │   ├── runtime.js               <-- Host Lifecycle Coordinator & ticker harness
│   │   │
│   │   │   /* --- The 11 Ephemeral District Tenants (D1–D11) --- */
│   │   ├── overworld.js             <-- [D1] Spatial 2D exploration grid, collision & danger
│   │   ├── combat.js                <-- [D2] Headless CTB combat engine, formulas & displacements
│   │   ├── script.js                <-- [D3] Multi-state typewriter dialogue runner
│   │   ├── armory.js                <-- [D4] Stat-gated equipment validation & gear deltas
│   │   ├── progression.js           <-- [D5] Aether Matrix constellation graph & SP allocation
│   │   ├── status.js                <-- [D6] Party health inspection, row toggling & medicine
│   │   ├── market.js                <-- [D7] Merchant commerce, trade formulas & inventory stock
│   │   ├── chronicle.js             <-- [D8] Quest journal, campaign chronicle & flags
│   │   ├── relic_forge.js           <-- [D9] Procedural relic synthesis forge & matrix seeds
│   │   ├── lockpick.js              <-- [D10] Dual Lissajous harmonic resonance minigame
│   │   └── settings.js              <-- [D11] System configuration BIOS & title ejection
│   │
│   ├── drivers/                     <-- Tier 3: Peripheral Presentation, Audio & Visual Drivers
│   │   │   /* --- Audio & Vocal Synthesis Engines --- */
│   │   ├── acoustic_sfx.js          <-- Web Audio stereo acoustic engine & procedural sound FX
│   │   ├── synth_soundtrack.js      <-- 4-channel generative chiptune sequencer & ambient synthesizer
│   │   ├── synthetic_voice.js       <-- Real-time dual-formant procedural speech synthesizer
│   │   │
│   │   │   /* --- Procedural Bakers, VFX & Viewports --- */
│   │   ├── icons.js                 <-- Offscreen procedural raster item & equipment icon baker
│   │   ├── skill_icons.js           <-- Procedural skill tree glyph generator (36 nodes)
│   │   ├── party_icons.js           <-- Procedural retro character crest generator
│   │   ├── sprite_baker.js          <-- 8-directional character paper-doll compositor
│   │   ├── battler_baker.js         <-- 4-pass 64x64 modular battler sprite synthesizer
│   │   ├── battle_backdrop.js       <-- Procedural parallax biome stage canvas backdrops
│   │   ├── combat_vfx.js            <-- Particle emitter arrays, ballistic arcs & screen trauma
│   │   ├── dynamic_lights.js        <-- Environmental lighting, lantern bloom & 2D shadow fins
│   │   ├── pseudo_3d_renderer.js    <-- First-person DDA raycaster, billboards & mini-radar
│   │   ├── threat_oracle.js         <-- Danger telemetry & 12-turn CTB landing slot projector
│   │   │
│   │   │   /* --- District Presentation & DOM Renderers --- */
│   │   ├── cockpit_renderer.js      <-- Top telemetry, Quick Pouch drawer & mini-HUD projector
│   │   ├── combat_renderer.js       <-- Upper arena stage, opposing wings & CTB ribbon mount
│   │   ├── map_renderer.js          <-- High-fidelity 2D canvas map & sub-pixel camera lerp
│   │   ├── armory_renderer.js       <-- Gear inspector & 2x Deep Analysis Battler paper-doll
│   │   ├── chronicle_renderer.js    <-- Quest listing, details & objective progress projector
│   │   ├── progression_renderer.js  <-- Aether Matrix constellation canvas & attunement UI
│   │   ├── market_renderer.js       <-- Merchant catalog rows, purse tracking & stat diffs
│   │   ├── status_renderer.js       <-- Pentagonal Stat Radar canvas & ECG heartbeat oscilloscope
│   │   └── relic_forge_renderer.js  <-- Relic synthesis preview canvas & particle bursts
│   │
│   ├── shaders/                     <-- Hardware Post-Processing Compositors
│   │   └── shader_compositor.js     <-- WebGL CRT barrel curvature & chromatic aberration
│   │
│   └── subsystems/                  <-- Infrastructure, Routing & Procedural Generation
│       ├── input.js                 <-- Hardware keycode translation & normalized action tokens
│       ├── world_ecology.js         <-- Map topology resolution, sparse mutations & caravan routes
│       ├── district_router.js       <-- Modal navigation router, sub-nav dock & focus traps
│       ├── dungeon_gen.js           <-- Deterministic Drunkard's Walk 2D floor carver
│       └── save_manager.js          <-- Schema v1.4.0 delta serialization & compression engine
│
└── testing/                         <-- Automated Sentinel Verification Suites
    ├── load_order.js                <-- SSOT: Canonical frozen engine script load order (consumed by all VM harnesses)
    ├── gen_html_scripts.js          <-- Drift checker: diffs load_order.js against index.html (exit 0 = clean)
    ├── test_sentinel.js             <-- Node.js headless 19-pass integration test harness
    ├── test_combat_input.js         <-- Combat action dispatch & CTB invariant assertions
    ├── test_hotkeys_and_expansion.js<-- Viewport [Z]/[X] mode toggle verification
    └── test_persistence_wiring.js  <-- StorageManager delta serialization test battery
```

---

## 🧭 Architectural Layer Classification Matrix

| Layer / Directory | Architectural Role | Isolation Invariant | DOM Access Policy |
| :--- | :--- | :--- | :--- |
| **`data/`** | Canonical SSOT manifests & schema defaults | Immutable pure data structures | **Zero DOM** |
| **`css/`** | 5-Partition cascading aesthetic presentation | Native `@import` via `index.css` | **Styling Only** |
| **`js/core/`** | VSRP-001 ephemeral simulation tenants & kernel | Private `sim` closures (Faraday cage) | **Zero DOM** (Delegated via `render()`) |
| **`js/drivers/`** | Presentation projectors, procedural bakers & audio | Read-only detached snapshot consumers | **Full DOM & Canvas2D / WebAudio** |
| **`js/shaders/`** | Post-processing WebGL shader compositor | Framebuffer post-pass filters | **WebGL Context Only** |
| **`js/subsystems/`** | Infrastructure, navigation & procedural carving | Stateless pure utility / event bridges | **Input & Storage Only** |
| **`testing/`** | Node.js headless contract verification suite | Mock DOM/Canvas execution harness | **Headless VM Only** |