# ARCHITECTURAL SPECIFICATION: 4-Quadrant Combat Station (Full Integration)

**Document Identifier:** ARCH-SPEC-COMBAT-STATION-002
**Timestamp:** 2026-09-13T16:50:00-04:00
**Governing Standards:** MPFS-001 / VSRP-001 / SDCP-001 / PMIP-001 / MVP-001
**Index Anchor:** PRS-001
**Test Suite Verification:** Pass 21 (Sentinel 21-Pass Test Battery, 134/134 Checks PASS)

---

## 1. Executive Summary & Architectural Invariants

`ARCH-SPEC-COMBAT-STATION-002` formalizes the complete functional and visual implementation of the **4-Quadrant Combat Station** on top of the permanent `#war-table-matrix` topology established in `ARCH-SPEC-WAR-TABLE-SKELETON-001`.

Instead of switching to a generic 1995 RPG battle menu with sluggish nested text menus, combat executes inside four synchronized instrument quadrants operated via a high-velocity **"Flick, Don't Fish"** spatial radial chassis:

```plain text
┌───────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
│ QUADRANT 1: TACTICAL FLANK & KINEMATICS           │ QUADRANT 2: FIRST-PERSON 3D CLASH THEATER         │
│ • 8x6 battle room canvas (#combat-spatial-canvas) │ • Composite eye-level arena (#combat-backdrop-..) │
│ • Frontline / Backline token coordinate nodes     │ • Z-depth scaled paper-doll battlers (0.75-1.20)  │
│ • Environmental hazard walls (Col 0 & 7)          │ • Dynamic volumetric spell illumination           │
│ • Knockback / Pull trajectory prediction arrows   │ • Attack lunges, flinches, & contact shadows      │
│ • Spatial Geometry Wheel on tile RMB              │ • Target-Bound Focus Chassis on enemy RMB         │
├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ QUADRANT 3: THREAT ORACLE & TELEMETRY             │ QUADRANT 4: HERO CHASSIS COMMAND DECK             │
│ • Tier 1: 12-slot interactive CTB timeline ribbon │ • 4 physical hero cards with live HP/MP gauges    │
│ • Tier 2: Hostile intent beacons (Enemy -> Hero)  │ • Amber glowing active-turn elevation aura        │
│ • Tier 3: Elemental affinity scanner (1.5x, 0.5x) │ • 4-leaf Tactical Execution Radial on hero RMB    │
│ • Zero-commitment hover telemetry previews        │ • Hybrid point-and-flick hotkey coordinator       │
└───────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 2. Quadrant Architecture

### Quadrant 1: Tactical Flank & Kinematics (`#pane-cartography`)

- **Rendering Engine:** Dedicated 2D HTML5 canvas (`#combat-spatial-canvas`).
- **Spatial Grid:** $8 \times 6$ matrix with sub-grid coordinate projection.
  - Allied Rear: Column 1, Rows 1–4
  - Allied Vanguard: Column 2, Rows 1–4
  - Clash Zone: Columns 3–4
  - Hostile Front: Column 5, Rows 1–4
  - Hostile Rear: Column 6, Rows 1–4
  - Hazard Dungeon Walls: Columns 0 & 7
- **Trajectory Vectors:** Generates directional displacement vectors `(fromX, fromY) -> (toX, toY)` when selecting or hovering over skills with `KNOCKBACK` or `PULL`. If `toX >= 7`, renders the `💥 SLAM!` wall impact telemetry bonus.

### Quadrant 2: First-Person 3D Clash Theater (`#pane-sensor`)

- **Rendering Engine:** Unified composite canvas (`#combat-backdrop-canvas`).
- **Depth Staggering:** Procedural battler paper-doll scaling based on row depth ($Z=1.0$ for FRONT, $Z=0.75$ for BACK, $Z=1.2$ for party lunges).
- **Volumetric Illumination:** Spells and lantern illumination trigger dynamic light gradients from `dynamic_lights.js`.
- **Kinetic Stances:** Forward attack lunges (`.unit-lunging`), flinch recoils (`.unit-hit-recoil`), exhausted panting slumps ($\le 30\%$ HP), and boss enrage heat pulsation.
- **Raycast Scaling:** Client coordinates on pointer events are normalized against canvas aspect bounding box to prevent projection drift across HiDPI/responsive scaling.

### Quadrant 3: Threat Oracle & Telemetry Stack (`#pane-scanner`)

- **Tier 1 (Initiative):** 12-slot CTB forward turn ribbon (`#combat-ctb-ribbon-bar`) with dynamic slide preview on skill hover.
- **Tier 2 (Intent):** Active threat vector feed (`#oracle-intent-feed`) linking enemy focus to targeted heroes in Q4 (e.g. `🎯 Shade Wolf ➔ Wren ⚔️ [BASIC STRIKE]`, `⚡ [CHARGED SKILL]` for enraged bosses).
- **Tier 3 (Affinity & Log):** Elemental matrix badges (`WEAK: FIRE (1.5x)`, `RESIST: DARK (0.5x)`, `IMMUNE: HOLY (0.0x)`) and compact combat event feed (`#log-box`).
- **Zero-Commitment Previews:** Hovering over any action immediately projects damage envelopes (`28 ~ 36 DMG`), CTB timeline displacement ($+1100\text{ ms}$), and Q1 reachability without committing state.

### Quadrant 4: Hero Chassis Command Deck (`#pane-readiness`)

- **Hero Cards Grid:** 4 side-by-side interactive hero chassis cards (`#combat-hero-chassis-grid`) with live dual HP/MP gradient progress bars, phenotype badges, and front/back row tags.
- **Active Turn Elevation:** The acting hero card is highlighted with an amber border, elevated $-2\text{px}$, and pulsates with an ember aura.
- **Dual-Input Targeting Mode:** Seamlessly bridges keyboard hotkeys (`[1]-[4]`, `[SPACE]`, `[ESC]`) with gesture flick and mouse targeting.

---

## 3. The Core Philosophy: "Flick, Don't Fish"

Standard turn-based RPGs force players through tedious menu fishing: `Tab -> Submenu -> Scroll List -> Confirm`.

The Emberlight 4-Quadrant Command Deck operates on **muscle-memory spatial gestures** via a 4-cardinal-leaf radial chassis. A seasoned player never reads menus; they right-click and flick in a cardinal direction within 100 milliseconds.

The chassis enforces **Spatial Contextualization**: the 4 cardinal leaves change predictably based on _where_ the player right-clicks across the War Table.

```plain text
                       [NORTH: PRIMARY OFFENSE]
                                  │
    [WEST: TACTICAL / UTILITY] ───┼─── [EAST: LOGISTICS / SPELLS]
                                  │
                       [SOUTH: DEFENSE / RETREAT]
```

---

## 4. Quadrant-Specific Radial Schemas

### A. In Q4 (The Hero Cards): Tactical Execution Wheel

Right-clicking directly on an allied hero card acts as their immediate turn intent hub.

| Leaf             | Default Action            | Gesture / Intent                                      | Dynamic Telemetry Feedback                                |
| :--------------- | :------------------------ | :---------------------------------------------------- | :-------------------------------------------------------- |
| **North (Up)**   | **Basic Strike / Cleave** | Quick flick forward to execute physical attack.       | Q1 lights up targetable enemy frontline tiles in red.     |
| **East (Right)** | **Signature Skill Deck**  | Flick toward center theater to open 3-leaf skill arc. | Q3 calculates MP cost and projected damage range.         |
| **South (Down)** | **Tactical Guard Stance** | Pull back to turtle (-50% DMG, +2 MP).                | Q4 card displays blue warding halo; CTB timeline updates. |
| **West (Left)**  | **Field Pouch / Item**    | Pull outward to open quick-use belt (Potion/Ether).   | Q4 displays squad target drawer.                          |

### B. In Q2 (The 3D Clash Viewport): Target-Bound Focus Chassis

Right-clicking directly on an enemy model snaps the radial to their screen bounding box:

```plain text
                     [NORTH: EXECUTE QUEUED ACTION]
                                   │
   [WEST: INSPECT TELEMETRY] ──────┼────── [EAST: DISPLACEMENT / PULL]
                                   │
                      [SOUTH: FOCUS FIRE MARKER]
```

- **North (Execute Action):** Confirms pending readied attack or spell against this exact target.
- **East (Tactical Displacement):** Commands an active ally with knockback/pull to relocate this enemy between rows.
- **South (Focus Fire Marker):** Tags the target with an amber combat reticle, prioritizing party targeting.
- **West (Diagnostic Inspect):** Forces Q3 to lock onto this enemy, revealing elemental affinities, exact HP, and CTB delay.

### C. In Q1 (The Tactical Grid): Spatial Geometry Wheel

Right-clicking a tile on the 2D spatial grid manipulates physical positioning and hazards:

- **North (Advance / Lunge):** Commands an ally to step forward into the Frontline row.
- **South (Fall Back / Cover):** Shifts an ally into the Backline row (+15% Evasion, behind frontline cover).
- **East (Detonate / Transmute):** If clicking a hazard tile (`%` Miasma / `~` Chasm), triggers environmental reaction.
- **West (Earthen Barricade):** Plants a temporary cover obstacle to block linear enemy trajectories.

### D. In Q3 (Threat Oracle / CTB): Timeline Interception Wheel

Right-clicking an enemy icon directly on the CTB initiative ribbon:

- **North (Delay Strike):** Prepares an attack designed to deal Stun/Delay to push their turn back.
- **South (Brace for Impact):** Directs the targeted ally into an automatic defensive posture.
- **East (Phase Resonance):** Locks Q3 harmonic frequency to counter charged enemy boss shields.

---

## 5. Unified Control Schema: Hybrid Point-and-Flick

Mouse gestures and keyboard shortcuts complement each other with zero conflict:

```plain text
┌─────────────────────────────────────────────────────────────┐
│ LEFT HAND: Key Hotkeys          │ RIGHT HAND: Mouse / Wheel │
├─────────────────────────────────┼───────────────────────────┤
│ [1] Attack / Strike (North)     │ RMB Down: Open Radial     │
│ [2] Skill Deck (East)           │ Flick + Release: Select   │
│ [3] Guard Stance (South)        │ LMB: Target / Confirm     │
│ [4] Field Pouch (West)          │ Wheel Scroll: Cycle Skill │
│ [SPACE]: Confirm Turn / Auto    │ [ESC]: Cancel / Dismiss   │
└─────────────────────────────────┴───────────────────────────┘
```

### Core Ergonomic Flow

1. **Hold-and-Release Gesture:** Press and hold RMB over hero card. Dragging $\ge 20\text{px}$ in a cardinal direction highlights the leaf. Releasing RMB immediately commits the selection without requiring a second click.
2. **Zero-Commitment Telemetry:** Hovering over any leaf projects full predictive telemetry in Q3 (damage ranges, CTB delay, reachability) and resets cleanly on mouse-out.
3. **Smart Default Targeting:** Flicking North for `Attack` automatically selects the nearest unshielded frontline enemy. A single tap of `[SPACE]` or `LMB` executes the strike.

---

## 6. Anti-Entropy & Depth Guardrails

1. **Strict 4-Cardinal Leaf Limit:** Radial menus must strictly maintain 4 cardinal leaves (North, South, East, West). No 8-wedge or 12-wedge mini-wheels are permitted.
2. **Max 1 Tier of Arc Expansion:** Sub-menus (such as Brogan's skill deck) project as a clean 3-leaf arc above the card rather than nested circular wheels.
3. **Dual Dispatch & Idempotency Compliance:** All radial interactions emit canonical EventBus envelopes (`combat:intent_action`) and invoke active direct callbacks (`actionHandler`). Simulation core enforces transient `intentId` idempotency locks.
4. **Deterministic Kinetic Scaling:** Drag radius ($r \ge 75\text{px}$) scales `powerScale` (1.0x to 1.5x) for visual particle bursts and acoustic punch while keeping base mathematical damage calculations strictly deterministic.

---

## 7. Gesture Engine State Machine & Intent Envelope

```plaintext
                       [IDLE]
                         │
               pointerdown (RMB)
                         ▼
                  [RADIAL_ACTIVE]
                  Snap Center (X0, Y0)
                  Mount 4 Cardinal Leaves
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
  pointermove       pointermove       pointerup
   (r < 18px)    (18px <= r < 75px)   (r < 18px)
       │                 │                 │
       ▼                 ▼                 ▼
  [DEADZONE]       [LEAF_LATCHED]      [DISMISSED]
  Clear Preview   Live Q3 Forecast    Zero Mutations
                         │
                   pointerup (r >= 18px)
                         ▼
              [EMIT_INTENT_ENVELOPE]
                         │
     ┌───────────────────┴───────────────────┐
     ▼                                       ▼
EventBus: 'combat:intent_action'      Renderer: dispatchAction()
     │                                       │
     └───────────────────┬───────────────────┘
                         ▼
               EmberlightCombat Core
```

### Canonical Intent Envelope Schema

```json
{
  "topic": "combat:intent_action",
  "payload": {
    "intentId": "intent_1789328200000_1",
    "actorId": "brogan",
    "cardinal": "EAST",
    "actionType": "SKILL",
    "skillId": "shield_bash",
    "vectorAngle": 1.57,
    "powerScale": 1.25,
    "targetSlot": 0,
    "isAlly": false
  }
}
```

---

## 8. Sentinel Pass 21 Verification Gate

Pass 21 (`Pass21_CombatStation_Integration_Battery` in `auditor/auditor_endgame.js`) asserts:

1. $8\times6$ spatial grid dimensions, node coordinate mappings, hazard walls, and knockback trajectory math.
2. Threat vector intent links with enemy name, target hero name, and charged state.
3. Hero chassis cards party vitals, row indicators, active turn elevation, and radial action tokens.
4. Permanent DOM anchor presence for `#combat-spatial-canvas`, `#combat-backdrop-canvas`, `#combat-hero-chassis-grid`, and `#combat-hero-radial`.
5. Dual Dispatch and EventBus intent routing verified with 100% test suite parity.
