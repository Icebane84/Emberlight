# PROJECT CONSTITUTION: Emberlight Sovereign Engine Architecture

**Document Identifier:** ARCH-001-EMBERLIGHT
**Governing Standard:** VSRP-001 (Universal Module Contract Specification)
**Parent Protocol:** PMIP-001 (Phoenix Modularization & Integration Protocol) / SDCP-001 / PRS-ARC-020
**Version:** 5.0.0-LOCKED
**Timestamp:** 2026-09-03T22:45:00Z
**Index Anchor:** PRS-001

---

## 1. 4-Tier Sovereign Architecture

```plain text
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: THE HOST HARNESS                        │
│                 GameRuntime (runtime.js) & StorageManager              │
│  • Single Source of Truth (canonicalParty, canonicalGold, inventory)   │
│  • SDCP-001 Capability Execution Registry & Anti-Entropy Seal          │
│  • Central MountDistrict() Coordinator & ui:navigate Event Bus         │
│  • Persistent Q4 Mini-HUD, Quick Field Pouch [I], Game Over Modal      │
│  • Deterministic Sparse Delta Rehydration & Idempotent EventBus Tokens │
│  • Transition Governance & Viewport Synchronization Buffer Clearing    │
│  • Dual-Channel Telemetry Strip & In-Situ Ally Item Targeting          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴────────────────────────────┐
       ▼                                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│    TIER 2: EPHEMERAL DISTRICTS       │  │     TIER 3: PERIPHERAL DRIVERS       │
│  (VSRP-001 9-Method Simulation)      │  │    (Downstream Event Observers)      │
│  • Overworld (overworld.js)          │  │  • Spatial Audio (acoustic_sfx.js)   │
│  • Combat Engine (combat.js)         │  │  • Procedural Synth (synth_sound...) │
│  • Script & Dialogue (script.js)     │  │  • Formant Voice (synthetic_voice.js)│
│  • Armory District (armory.js)       │  │  • Pseudo-3D (pseudo_3d_renderer.js) │
│  • Progression (progression.js)      │  │  • Dynamic Lights (dynamic_lights.js)│
│  • Status Inspector (status.js)      │  │  • WebGL CRT (shader_compositor.js)  │
│  • Market Commerce (market.js)       │  │  • Sprite Baker (sprite_baker.js)    │
│  • Chronicle Journal (chronicle.js)  │  │  • Battler Baker (battler_baker.js)  │
│  • Relic Forge (relic_forge.js)      │  │  • Battle Backdrop (battle_backd...) │
│  • Harmonic Lockpick (lockpick.js)   │  │  • Combat VFX (combat_vfx.js)        │
│  • Settings Modal (settings.js)      │  │  • Threat Oracle (threat_oracle.js)  │
│  • Auditor Core (auditor.js)         │  │  • Input Translator (input.js)       │
│                                      │  │  • Combat Renderer (combat_renderer.js)│
│                                      │  │  • Overworld Renderer (overworld_renderer.js)│
│                                      │  │  • Armory Renderer (armory_renderer.js)│
│                                      │  │  • Chronicle Renderer (chronicle_renderer.js)│
│                                      │  │  • Progression Renderer (progression_renderer.js)│
└──────────────────────────────────────┘  └──────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  TIER 4: PROCEDURAL MATH KERNELS & SSOT                │
│  • Dungeon Carver (dungeon_gen.js)    • Manifest SSOT (manifest.js)    │
│  • Icon Synthesizer (icons.js)        • Skill Glyphs (skill_icons.js)  │
│  • Party Portraits (party_icons.js)   • Sentinel (auditor.js - 16 Pass)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Laws

1. **The Host Harness (`GameRuntime`):** The authoritative Single Source of Truth (SSOT). Owns canonical persistent entities (`canonicalParty`, `canonicalGold`, `canonicalInventory`, `canonicalQuests`, `canonicalDungeonFloor`, `canonicalWorldPos`, `canonicalFlags`, `canonicalSurfaceMutations`, and `canonicalTownMutations`).
2. **Tenant Memory Isolation (The Faraday Rule):** Simulation tenants (`overworld`, `combat`, `armory`, `progression`, `relic_forge`, `lockpick`, etc.) operate inside private closures. They receive state snapshots via `reset()` and emit state changes purely via sealed delta envelopes (`eventBus.publish('<district>:resolved', envelope)`).
3. **Canonical Nine-Method Contract (VSRP-001):** Every simulation tenant strictly implements and exports the canonical nine lifecycle methods:
   `{ configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy }`
4. **Decoupled Peripheral Observers:** Audio, lighting, raycasting, CRT post-processing, combat rendering, and procedural sprite baking have zero simulation authority and never mutate game state. They receive immutable snapshots or subscribe downstream to `EventBus` topics.
5. **Cross-Quadrant Tactical Synergy (PRS-DES-019):** Inter-quadrant coordination (Terrain advantage in combat, proximity billboard/growl cues, and scanner dock pulsing highlights) is achieved strictly via immutable snapshot passing (`reset()`) and semantic bus tokens without direct cross-tenant method invocations.
6. **Aether Matrix & Constellation Suite (PRS-ARC-020 / SPEC-003):** Character stats are never mutated in-place destructively. Effective vitals are derived via a pure functional projection:
   $$\mathbf{Stat}_{\text{total}} = \mathbf{Stat}_{\text{base}}(\text{Level}) + \sum \mathbf{Stat}_{\text{nodes}} + \sum \mathbf{Stat}_{\text{gear}}$$
   Progression is visualized through an ergonomic dual-pane Constellation Suite with dedicated Party Hero Roster Tabs, 6 Essence filters (`ALL`, `IRON`, `EMBER`, `TIDE`, `LUMEN`, `UMBRA`), interactive node selection, and an Aether Attunement Inspector Card providing real-time prerequisite telemetry, stat delta breakdowns, field capability tags (`cap:elemental.scorch`, `cap:elemental.freeze`, `cap:sanctuary.consecrate`, `cap:elemental.dispel`), explicit `[✨ ATTUNE NODE]` actions, full campfire respecs (`progression:respec_completed`), and atomic two-way state synchronization with the host Single Source of Truth (`canonicalParty`).
7. **Sentinel Governance (MVP-001):** Autonomous boot gatekeeper executing a 19-pass anti-entropy verification battery asserting 127/127 checks (100% genuine, anti-theater compliance) including persistence compression budgets ($<2.5\text{KB}$), EventBus unbind idempotency, peripheral driver lifecycle teardown, dual-perspective immersion scaling, boss phase enrage shifts, discrete DOT tick formulas, ailment cleansing, procedural $64\times64$ battler sprite generation, biome backdrop depth horizon rendering, zero-allocation typed array particle clamping, district transition/chest collision invariance, dynamic gear stat projection deltas, quest hierarchy validation, in-situ field pouch vital targeting, the complete 10-point VSRP-001 Constitutional Compliance battery (`AC-01` to `AC-10`), Pass 18 Tactical Displacement & Row Invariance, and Pass 19 Deep Analysis Workstation & Tactical Terminal Canvas before the title screen mounts.
8. **Presentation Coordination & State Surfacing:** Zero blocking browser primitives (`alert()`). District viewports mount via centralized `MountDistrict()` routers with persistent Q4 Mini-HUD vital pips, dual-mode status/quest tickers, exploration quick pouches (`[I]`), and dedicated Game Over defeat modals offering Reload vs Town Yield options.
9. **Quadrant 4 Full-Matrix Expansion Protocol (`[Z]`):** Responsive presentation expansion allowing the Party Readiness Deck, Armory, Progression Tree, and Command Deck to expand across 100% of the War Table matrix (`.q4-expanded-deck`). Hides Quadrants 1-3 cleanly and stretches Q4 into a single high-visibility pane with multi-column party grids and expanded skill trees, toggled seamlessly via `[Z]`, `[ESC]`, or button controls.
10. **Tactical Tile Inspection Stream (`overworld:hover_tile`):** High-performance DOM hover telemetry streaming real-time terrain properties (Cover %, movement speed modifiers, hazard drain rates, and NPC identities) into Quadrant 3 Field Scanner (`#pane-scanner`) without breaking tenant isolation.
11. **Cinematic Victory Cascade & Asynchronous Combat Resolution:** Procedural particle fireworks and celebratory banner orchestration (`combat:victory`) triggered via `EmberlightCombatVFX` with instant battle end detection, interactive continue cards, and verified return to overworld cartography.
12. **Procedural Bestiary Shaders & Status Ailment Engine (AOP-COMBAT-M4):** Multi-segment procedural boss rasterization with enrage heat pulsation (`icons.js`), dynamic card CSS status shaders (`index.css`), and continuous ambient particle loops (`BURN`, `POISON`, `STUN`) in `combat_vfx.js` over pre-allocated typed arrays without GC churn.
13. **Dual-Perspective Immersion Protocol (`[X]` / PRS-DES-013):** Dynamic viewport expansion allowing the First-Person 3D Raycaster (`#pane-sensor`) to span 100% of the upper War Table matrix (`.q2-immersion-deck`). Re-allocates internal resolution buffers from standard 480x260 ($60^\circ$ FOV) to high-density 960x360 ($75^\circ$ FOV), projects rich procedural entity billboards (Chests `$`, Stairs `>`, Campfires `C`, Miasma `%`), renders an inset tactical mini-radar overlay, and surfaces a top-center compass heading ribbon without perturbing the underlying 2D simulation grid. When 3D Immersion mode is active, directional inputs seamlessly switch from cardinal grid navigation (`UP`/`DOWN`/`LEFT`/`RIGHT`) to relative first-person crawler kinematics: `W` (Step Forward in facing vector), `S` (Step Backward), `A` (Turn Left 90° yaw), `D` (Turn Right 90° yaw), and `Q` (Strafe Left).
14. **Dual-Zone Master Combat Arena Protocol (AOP-COMBAT-M5 / PRS-DES-021):** Re-architects the combat presentation into an ergonomic, asymmetric dual-zone layout. The Upper Zone (Grand Battlefield Arena, 55% height) features an expanded 100% full-width 12-slot CTB turn ribbon, opposing Hostile and Allied formation wings with physical row staggering (`.row-front` / `.row-back`), dynamic directional arc ballistics (`combat_vfx.js`), animated grounding clash runes (`.theater-clash-core::before`), and bidirectional focus highlight rings (`.target-focused`). The Lower Zone (Tactical Console, 45% height) hosts the Action Hub on the left and the Threat Oracle & Engagement Log on the right with live hover/focus damage calculations and affinity telemetry streaming. Exploration yaw rotations are completely cleansed of acoustic UI beeps.
15. **Deterministic Sparse Delta Rehydration & Idempotent EventBus Lifecycle Teardown (ARCH-GAP-ANALYSIS-001):** The persistence layer (`StorageManager` v1.4.0) eliminates raw 2D array serialization of whole world maps and catacomb floors, replacing them with deterministic procedural generator descriptors (`canonicalDungeonSpec = { seed, depth, width, height, mutations }`) and sparse surface coordinate dictionaries (`canonicalSurfaceMutations = { "x,y": tile }`). This reduces save payload footprint by $>85\%$ ($<1.6\text{KB}$ nominal, $<2.5\text{KB}$ worst case). Furthermore, the Host EventBus enforces idempotent subscription tokenization where `EventBus.subscribe()` returns unbind closures (`unsub()`), and all peripheral drivers (`acoustic_sfx.js`, `dynamic_lights.js`, `pseudo_3d_renderer.js`, `combat_vfx.js`, `synthetic_voice.js`) retain and release unbind handles upon `destroy()` to guarantee zero memory or event listener leaks across infinite gameplay sessions.
16. **Combat Aesthetics, Symmetrical Full-Body Battlers & Stage Mats (ARCH-SPEC-COMBAT-AESTHETICS-002 / ARCH-EVAL-COMBAT-DZ-UI-002 / PRS-DES-021):** The Dual-Zone Combat Arena embeds procedural $64\times64$ full-body pixel/vector battlers (`battler_baker.js`) across 4 hero phenotypes (`HERO`, `WARRIOR`, `MAGE`, `HEALER`) and 6 hostile archetypes (`SHADE_WOLF`, `BONE_ARCHER`, `CATACOMB_SKELETON`, `CAVE_SPIDER`, `DREAD_ACOLYTE`, `BOSS_MALAKOR`), rendered against dynamic procedural biome horizons and perspective floor mats (`MEADOW`, `TOWN`, `CRYPT`, `BOSS` in `battle_backdrop.js`). Both the Allied (`#party-grid`) and Hostile (`#enemy-row`) wings strictly utilize symmetrical vertical pedestal geometry with normalized $120\text{px}$ card heights, high-contrast sub-bar vitals text (`#f8fafc` with drop shadows for CRT legibility), elliptical contact shadows (`.formation-slot::before`), continuous ambient idle breathing rhythms (`@keyframes hero-idle-breathe` and `enemy-idle-breathe`), low health exhausted postures ($\le 30\%$ HP down on one knee with panting slump and `⚠️ TIRED` badges), attacker step-forward strike lunges (`.unit-lunging` translating $40\text{px}$ forward for $350\text{ms}$), spellcaster levitation auras (`.channeling-surge`), target flinch/hit recoil animations with damage flashes (`.unit-hit-recoil`), and shield deflection recoils (`.deflect-recoil`) with stereo panned audio bursts (`SWIFT_WHOOSH`, `FOOTSTEP_THUD`, `SHIELD_DEFLECT`) without altering deterministic combat simulation math.
17. **Transition Governance, Viewport Synchronization & Chest Mutation Protocol (ARCH-SPEC-TRANSITION-001):** All district transitions (`OVERWORLD`, `COMBAT`, `LOCKPICK`, `DIALOGUE`, `SETTINGS`, and modal decks) and viewport expansion toggles (`[X]` 3D immersion and `[Z]` Q4 fullscreen) execute authoritative input queue purging via `EmberlightInput.clear()`, preventing repeat key latching or stale keystroke leakage. When Quadrant 4 is expanded fullscreen, blind overworld movement is strictly intercepted. Furthermore, treasure chests (`$`) across surface, catacomb, and town domains are marked `walkable: true` with dynamic world map mutations committing atomic tile transmutations to open walkable cobblestone (`.`) upon looting. Lockpick triggers feature coordinate debouncing (`lastInteractedChestPos`) and full keyboard routing (`[W/S]` select, `[A/D]` tune, `[SPACE]` shatter, `[ESC]` abort), preventing control lockups or infinite re-trigger loops upon aborting. Walkable wilderness and catacomb exploration steps execute deterministic PRNG danger encounter rolls (`overworld:encounter`) based on biome hazard coefficients (Grass 35%, Crypts 28%, Open Paths 18%).
18. **Telemetry Surfacing & Legibility Engine (ARCH-SPEC-SURFACING-001):** The presentation framework guarantees persistent vital surfacing, narrative goal clarity, and non-intrusive item targeting. The Top Bar features a stacked dual-channel telemetry strip (`.telemetry-channel-group`) pinning `📜 [QUEST] <Title>: <Stage Description>` with live status action feedback (`#status-line`). The Persistent Q4 Mini-HUD projects live gear-augmented Max HP / Max MP deltas via `manifest.computeCharacterStats()` and renders `.fainted` grayscale styling for fallen allies across all sub-decks. The Quick Field Pouch (`[I]`) reveals an in-situ target selector drawer (`#pouch-target-drawer`) allowing players to direct Potions, Ethers, and Phoenix Embers to specific party members with full validation and zero screen redirection.
19. **Deterministic Seeded PRNG Stream Kernel (`prng.js` / AC-05 / AC-04):** Authoritative simulation entropy is governed strictly by the Mulberry32 32-bit PRNG stream (`EmberlightPRNG`). Unseeded global `Math.random()` invocations in simulation logic are strictly prohibited and actively trapped by Sentinel. PRNG states are ingested deterministically via snapshots, serialized in `getState()`, and can be branched via `prng.fork()` for isolated forecasting, guaranteeing 100% bit-exact replay determinism across combat, encounter rolls, and relic forging.
20. **Host Context Input Immutability (`AC-06`):** Simulation tenants are strictly forbidden from mutating `context.inputs` (e.g. `shift()`, `pop()`, `splice()`). Tenant update loops must process input queues immutably using index iteration or read-only access. The host harness maintains absolute ownership over input lifecycle and frame-to-frame queue draining.
21. **Constitutional Compliance & Anti-Theater Contract (`AC-01` to `AC-10`):** All 10 simulation tenants (`combat`, `overworld`, `market`, `progression`, `lockpick`, `relic_forge`, `armory`, `script`, `chronicle`, `settings`) are continuously attested by Sentinel Pass 17 across 10 executable acceptance criteria:
    - `AC-01`: Full 9-method VSRP-001 interface compliance.
    - `AC-02`: Snapshot isolation (deep copy on reset; zero host object reference entanglement).
    - `AC-03`: Idempotent state round-trip (`reset(getState())`).
    - `AC-04`: Exact replay determinism given identical action and seed streams.
    - `AC-05`: Authoritative PRNG stream enforcement (Zero `Math.random()`).
    - `AC-06`: Input queue immutability in `update(dt, context)`.
    - `AC-07`: Pure, side-effect-free presentation rendering (`render()`).
    - `AC-08`: Strict standardized metadata schema: `{ moduleId, version, protocolVersion, dependencies, capabilities }`.
    - `AC-09`: Idempotent destruction and post-destruction gate assertions (`destroy()`).
    - `AC-10`: Authentic, non-theater verification assertions across all subsystems.
22. **Performance Budget Plan & GPU-Accelerated Compositing ($\le 16.67\text{ms}$ / 60 FPS):** Guarantees rock-solid 60 FPS rendering under active CRT shaders:
    - _Zero-Allocation Canvas Caching (`battler_baker.js`):_ Pre-renders all $64\times64$ battler figures (4 heroes, 6 hostiles) into cached Base64 PNG Data URLs (`cache.set()`) on boot, eliminating mid-combat GC spikes.
    - _GPU-Accelerated Motion Pipeline:_ Drives idle breathing (`translateY`), forward attack lunges (`translateX`), and hit flinches (`scale`/`filter`) strictly through CSS hardware transforms on the compositor thread.
    - _Low-Overhead Parallax Backdrops (`battle_backdrop.js`):_ Renders canvas biomes (`MEADOW`, `TOWN`, `CRYPT`, `BOSS`) using optimized vector primitives and gradient stops ($<1.2\text{ms}$ budget).
    - _Batched DOM Mutation Pipeline:_ Reconciles formation wings via in-place class toggling (`.unit-lunging`, `.unit-hit-recoil`, `.has-ailment-burn`) rather than destructive innerHTML thrashing.
23. **Audiovisual & Combat Architecture Optimization (PRS-ARC-022):**
    - _Layout-Thrash-Free Particle Emitter (`combat_vfx.js`):_ Replaces 60Hz per-frame DOM queries and `getBoundingClientRect()` layout calculations with an indexed slot centroid buffer (`cachedAilmentSlots`) updated every 250ms or on dirty render triggers, eliminating micro-stutters during combat.
    - _Lifecycle-Managed Backdrop RAF (`battle_backdrop.js`):_ Implements active viewport visibility detection (`canvas.offsetParent !== null`), pausing RAF animation cycles when transitioning out of combat to preserve CPU/GPU cycles.
    - _Acoustically Pure Single-Trigger Audio Graph (`acoustic_sfx.js`):_ Strips redundant SFX invocations from `combat:damage` subscriptions, reserving sound generation exclusively for `combat:sfx` to eliminate oscillator double-triggering and phase flanging.
    - _Dynamic Battler Paper-Doll Compositing (`battler_baker.js`):_ Supports dynamic paper-doll composite specs (`{ phenotype, weapon, armor }`), rendering socketed weapon overlays and armor trims directly onto 64x64 combat battlers mirroring overworld sprite mechanics.
    - _Boss Scale Clamping & Threat Stature (`index.css` & `combat.js`):_ Enlarges Malakor and major bosses to $88\times88\text{px}$ (`.boss-battler`) with proportional red-tinted contact shadows ($80\times16\text{px}$) and heat pulsation.
    - _Contextual Soundtrack State Restoration (`synth_soundtrack.js`):_ Tracks exploration biomes (`SURFACE`, `TOWN`, `CATACOMBS`) and restores the ambient mood immediately upon `combat:resolved`.

24. **Combat Zoning Remediation (ARCH-ZONE-COMBAT-001):** `combat.js` is the Tier 2 simulation tenant and owns authoritative turns, damage, status effects, seeded randomness, and resolution envelopes. `combat_renderer.js` is the Tier 3 presentation driver and owns DOM projection, target controls, and presentation callbacks. The host invokes `combat.render(renderer, state)` with a detached snapshot; renderer-originated gestures return normalized action tokens to the tenant and never mutate tenant state directly.

25. **Overworld Zoning Remediation (ARCH-ZONE-OVERWORLD-001):** `overworld.js` is the Tier 2 spatial simulation tenant and owns coordinates, collision, facing, danger steps, and movement events. `overworld_renderer.js` is the Tier 3 presentation driver and owns viewport slicing, autotile masks, DOM projection, sprite selection, and threat-gauge presentation. The host invokes `overworld.render(renderer, state)` with a detached snapshot.

26. **District Renderer Zoning (ARCH-ZONE-DISTRICTS-001):** `armory.js` and `chronicle.js` retain equipment and quest simulation authority while `armory_renderer.js` and `chronicle_renderer.js` own DOM projection. Renderer callbacks return normalized actions to the tenants; renderer code never commits canonical state.

27. **Subterranean Lighting & Creepy Catacomb Ambiance Engine (PRS-ATM-001):**
    - _Atmospheric Lighting Compositor (`dynamic_lights.js`):_ Implements a dynamic illumination gradient differentiating open daylight overworld ($0.0$ ambient darkness mask) from deep subterranean catacombs ($0.94$ darkness mask). Subterranean levels feature a warm flickering emberlight lantern cone ($\approx 105\text{px}$ radius with organic per-frame micro-flicker), dynamic geometric shadow extrusion against solid walls (`#`), glowing static sconces/braziers (`C`, `>`, `<`), and 24 floating procedural crypt dust motes and spectral wisps.
    - _Atmospheric Corridor Projection (`pseudo_3d_renderer.js`):_ Subterranean mode clamps horizon fog depth to $5.4$ units with high-contrast abyssal void shading (`#020206`), tightens radial vignette falloff ($0.50$ factor with eerie ember amber and shadow purple coloration), and projects dark crypt slate ceilings.
    - _Catacomb Tile & Cartography Shaders (`index.css` & `overworld.js`):_ Toggles `.catacomb-mode` across the 2D cartography grid when `dungeonDepth > 0`, transitioning terrain tiles from daylight grass/stone to abyssal obsidian/crypt slate (`#0d0c15`), dark pathways (`#05050b`), pulsing poisonous miasma (`#12041c`), and rune-inscribed glowing crypt gates.

28. **Progression Zoning Remediation (ARCH-ZONE-PROGRESSION-001):** `progression.js` is the Tier 2 simulation tenant and owns authoritative Aether Matrix constellation graphs, SP allocation rules, prerequisite adjacency checking, pure functional stat aggregation, and respec refund mechanics. `progression_renderer.js` is the Tier 3 presentation driver and owns hero roster tabs, essence filter bars, constellation node card layouts, and the Aether Attunement Inspector Card. User interactions emit normalized action tokens (`SELECT_CHARACTER`, `SELECT_ESSENCE`, `SELECT_NODE`, `UNLOCK_NODE`, `RESPEC_CHARACTER`) to `progression.handleHostAction(action)` which updates simulation state and re-renders presentation with zero direct DOM mutation from the simulation engine.

29. **VSRP-001 Verification Governance & Testing Taxonomy (ARCH-GOV-TEST-001):** Formally separates verification scopes between simulation and presentation layers:
    - _Tier 2 Simulation Tenants:_ Verified via headless deterministic state machine simulation across 19 Sentinel passes (`auditor.js` Pass 2 through Pass 19), validating Mulberry32 PRNG authority, state round-trip idempotency, replay invariance, and non-mutating update loops. All interactive tenants (`combat`, `overworld`, `progression`, `script`, `lockpick`, `settings`) must expose `handleHostAction(action)`.
    - _Tier 3 Presentation Drivers:_ Verified via Action-Inversion unit testing (`test_sentinel.js`), asserting that UI triggers programmatically emit canonical action tokens (`SELECT_TAB`, `ATTACK`, `GUARD`, `FLEE`, etc.) to the tenant dispatch callback with zero simulation authority and zero direct state mutation. Production boot gatekeeper (`runBootGatekeeper()`) remains lightweight, validating structural contracts and renderer callback delegation without running heavy DOM simulation loops during browser boot.

30. **Tactical Displacement & Dynamic Row Shifting (Pass 18 / PRS-SPEC-025 / ARCH-SPEC-DISPLACEMENT-001):** Authoritative dynamic formation relocation in combat. Supports `KNOCKBACK` (relocating vanguard frontline units to the protected rear row) and `PULL` (dragging protected backline spellcasters/archers forward into the frontline vanguard) purely routed through EventBus envelopes (`combat:animation`) and updated in `target.row`. Boss archetypes are certified immune to displacement.

31. **Deep Analysis Workstation & Tactical Terminal Canvas (Pass 19 / PRS-DES-027):** Full-matrix expanded workstation mode for party inspection and loadout customization (`[Z]` / `.q4-expanded-deck`). Features real-time pentagonal Stat Radar HTML5 canvas rendering (evaluating HP, MP, ATK, DEF, AGI), animated ECG heartbeat oscilloscope, Overworld Formation Bench (`FRONT` $\leftrightarrow$ `BACK` row toggling with instant frontline shielding recomputation), $2\times$ composite Battler Paper-Doll visualizer, requirement deficit warnings, and party-wide loadout comparator with zero DOM mutations in simulation engines.

32. **Master 2x2 Quad-Matrix War Table Architecture (ARCH-SPEC-WAR-TABLE-001):** Decouples the primary screen into 4 distinct quadrants:
    - **Quadrant 1 (Top-Left): Tactical Cartography** (2D canvas map, sub-pixel camera damping $\lambda=12$, animated terrain tiles, dynamic shadow extrusions).
    - **Quadrant 2 (Top-Right): Corridor Sensor** (First-person DDA 3D raycaster, 1D Z-buffered billboards, mini-radar, compass ribbon, $960\times360\text{px}$ `[X]` immersion mode, relative crawler kinematics `W/S/A/D/Q`).
    - **Quadrant 3 (Bottom-Left): Tactical Scanner / Combat Arena** (Mini-HUD, quick field pouch drawer, 12-slot CTB turn ribbon, opposing wings, threat oracle telemetry).
    - **Quadrant 4 (Bottom-Right): Readiness Deck / District Modals** (Party vitals, 11 district workstations, `[Z]` Deep Analysis fullscreen deck).

33. **Instant Battle End Detection & Interactive Victory Protocol (ARCH-SPEC-COMBAT-VICTORY-001):** Evaluates `checkBattleEnd()` immediately upon lethal damage in physical strikes or skill execution. Dispatches `combat:victory` and `combat:banner` events, computes EXP/Gold spoils and item drops, and mounts an interactive Victory Card with `▶ CONTINUE EXPEDITION [SPACE]` button and automatic scheduled fallback transition to overworld cartography.

34. **Decoupled Host Input Architecture & Centralized Settings Profile (ARCH-SPEC-INPUT-SETTINGS-001):**
    - _Three-Layer Input Architecture:_
      1. **Remappable Keymap Dictionary (Configuration):** Physical key bindings are defined externally in mutable keymap profiles (`data/settings.json` and `EmberlightManifest.DefaultSettings.input.keymap`) mapping hardware event codes (e.g. `KeyW`, `ArrowUp`) to canonical action tokens (`UP`, `CONFIRM`, `TOGGLE_EXPAND_DECK`, `CHOICE_1`, etc.). Ingested into `EmberlightInput.configure({ keymap })`.
      2. **Host Input Manager (Event Translation):** The host peripheral driver (`EmberlightInput`) strictly owns all DOM listeners (`keydown`, `keyup`, `blur`, on-screen DPAD). It maps raw hardware events to canonical action tokens and buffers them into an internal queue while publishing `input:action` events across `EmberlightEventBus`. Direct DOM event listener registration inside simulation tenants is strictly forbidden.
      3. **Capability-Scoped Delivery (`ModuleContext`):** During simulation ticks, the host injects active action tokens and input state into tenants via `update(dt, context)` or `handleHostAction(action)`. Simulation code evaluates `context.input.isPressed('ACTION')` or `isDown('ACTION')`, ensuring 100% headless testability with mock input fixtures.
    - _Centralized Settings SSOT (`data/settings.json` & `EmberlightManifest.DefaultSettings`):_ A unified JSON manifest defining immutable operational profiles across 5 domains: `input.keymap`, `audio` (`masterVolume`, `sfxVolume`, `bgmVolume`, `isMuted`), `tuning` (`combatEncounterRate`, `criticalMultiplier`, `stepPoisonTickRate`), `accessibility` (`screenShake`, `highContrastUI`, `crtScanlines`), and `debug` (`godMode`, `showCollisionMesh`, `logTelemetry`).

35. **VSRP-001 Facade / Subsystem Topology & Faraday Staging Protocol (ARCH-SPEC-FACADE-001):**
    Complex or large-scale tenants (e.g. Static Manifest, Battler Baker, Pseudo-3D Raycaster, Combat Engine, Sentinel Auditor) are partitioned into domain-specific sub-modules residing in dedicated sub-directories (`manifest/`, `battler_baker/`, `pseudo_3d/`, `combat/`, `auditor/`).
    - _Isomorphic Staging Membrane:_ Sub-modules declare a defensive preamble (`if (typeof window !== 'undefined') window._[Name]Internal = window._[Name]Internal || {};`) and attach their localized functions/constants to the staging object.
    - _Root Facade Sealing & Export:_ The root facade script (`manifest.js`, `battler_baker.js`, `pseudo_3d_renderer.js`, `combat.js`, `auditor.js`) loads after all domain sub-modules, ingests the staging membrane, seals the public contract (`EmberlightManifest`, `EmberlightBattlerBaker`, `EmberlightPseudo3D` / `EmberlightCorridorSensor`, `EmberlightCombat`, `EmberlightAuditor`), mounts VSRP-001 canonical lifecycle methods, and **completely purges the staging global** (`delete window._[Name]Internal`).
    - _Zero-Bundler Isolation:_ Guarantees high modularity, regional file navigation, and zero namespace collision while strictly preserving double-click `file://` browser execution and zero external build tooling.
