---
name: wiring
description: Governs the Thin SSOT Bridge architecture, Host-Tenant lifecycle dispatch, District Router navigation, and type-safe EventBus pub/sub integration.
globs: "runtime.js, district_router.js, event_bus.js, session_store.js, input.js"
alwaysApply: false
version: 2.0.0
---

# AGENT OPERATIONAL SPECIFICATION: Host-Tenant Wiring & EventBus Architecture

**Document Identifier:** SKILL-EMBERLIGHT-WIRING-002
**Protocol Version:** VSRP-001 / PMIP-001 / SDCP-001
**Authority:** Tier 1 Host Harness Infrastructure

---

## 1. The Thin SSOT Bridge Pattern

Emberlight decouples game state authority (Tier 1 Host Harness) from simulation logic (Tier 2 Ephemeral Districts) and presentation (Tier 3 Peripheral Drivers):

1. **Persistent Authority (Tier 1):**
   - `session_store.js`: Holds raw canonical arrays (`canonicalParty`, `canonicalGold`, `canonicalInventory`, `canonicalQuests`, `canonicalFlags`).
   - `save_manager.js`: Handles disk serialization, multi-slot save files, and schema migration.
2. **Ephemeral Simulation (Tier 2):**
   - Headless state machines (`combat.js`, `overworld.js`, `market.js`, etc.) run isolated in private closures.
   - Initialized via `tenant.reset(snapshot)` with detached snapshot copies.
   - When actions resolve (e.g. combat ends, item bought), tenants publish sealed delta envelopes back to the EventBus.
3. **Peripheral Presentation (Tier 3):**
   - Renderers (`combat_renderer.js`, `map_renderer.js`, `pseudo_3d_renderer.js`) read detached state DTOs and render directly to DOM/Canvas.
   - NEVER own simulation authority; user input events are normalized via `input.js` and dispatched to the active district.

---

## 2. District Router Lifecycle & Modal Topology

`district_router.js` acts as the master navigation coordinator across districts:

- **Supported Districts:** `OVERWORLD`, `COMBAT`, `DIALOGUE`, `STATUS`, `ARMORY`, `PROGRESSION`, `MARKET`, `CHRONICLE`, `RELIC_FORGE`, `LOCKPICK`, `AUDITOR`, `SETTINGS`, `TITLE`, `GAME_OVER`.
- **Navigation Flow:**
  - `mountDistrict(districtId, snapshot)` hides inactive views, unhides target view DOM containers, and invokes `TENANT_RENDERERS[districtId](snapshot, ctx)`.
  - Right-click / Cancel key in sub-menus unwinds directly to `OVERWORLD`.
  - In Combat sub-tabs (Item, Skill, Status), Right-Click cancels back to `ATTACK`.

---

## 3. Type-Safe EventBus Wiring (`globals.d.ts` + `event_bus.js`)

Pub/sub event channels are statically typed via `EmberlightEventMap` in `globals.d.ts`:

```javascript
// Publishing an event:
EmberlightEventBus.publish("overworld:step", {
  pos: { x: 10, y: 12, inTown: false },
  tile: ".",
  facing: "DOWN",
  depth: 0,
});

// Subscribing with auto-cleanup handle:
const unbind = EmberlightEventBus.subscribe("combat:resolved", (payload) => {
  console.log("Outcome:", payload.outcome, "Loot:", payload.loot);
});

// Teardown on destroy():
unbind();
```

---

## 4. Input Gateway & Right-Click (RMB) Matrix

Hardware events are captured in `input.js`, normalized into semantic tokens (`UP`, `DOWN`, `LEFT`, `RIGHT`, `CONFIRM`, `CANCEL`, `TOGGLE_3D_VIEW`, `TOGGLE_EXPAND_DECK`), and dispatched to the active district.

### Universal RMB Unwind Rules

- **In Dedicated Menus:** Closes the modal and returns to `OVERWORLD`.
- **In Combat Deck Sub-Tabs:** Unwinds back to primary `ATTACK` tab.
- **In 3D Viewport:** Opens contextual `3D_SENSOR` radial diagnostics without collapsing viewport.
- **On Q4 Hero Cards:** Navigates directly to the hero's `ARMORY` inspection sheet.

---

## 5. Tri-Engine Graphics & Procedural Audio Wiring

1. **Tri-Engine Graphics Integration:**
   - **Canvas 2D (`map_renderer.js`, `combat_renderer.js`):** Direct 2D canvas drawing with dynamic lighting compositing (`dynamic_lights.js`).
   - **Pseudo-3D DDA Raycaster (`pseudo_3d_renderer.js` / `pseudo_3d/`):** 960x360 75° FOV first-person perspective rendering with billboarded sprite projections.
   - **WebGL Batcher & 3D Voxel Engine (`phoenix_sovereign_engine.js`):** Hardware-accelerated textured quad batching and 3D voxel volume DDA raycasting.

2. **Procedural Audio Synthesizer (`acoustic_sfx.js`, `synth_soundtrack.js`):**
   - Web Audio API pure DAC procedural generator (no external WAV/MP3 files).
   - Driven via EventBus triggers: `audio:sfx` with 8 canonical retro presets (`LASER`, `EXPLOSION`, `JUMP`, `HIT`, `COIN`, `POWERUP`, `FOOTSTEP`, `DEFLECT`).
