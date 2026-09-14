# ARCHITECTURAL SPECIFICATION: 4-Quadrant Combat Rig Foundation & Matrix Invariance

**Document Identifier:** ARCH-SPEC-WAR-TABLE-SKELETON-001  
**Timestamp:** 2026-09-13T15:25:00-04:00  
**Governing Standards:** MPFS-001 / VSRP-001 / SDCP-001 / PMIP-001 / MVP-001  
**Index Anchor:** PRS-001  
**Test Suite Verification:** Pass 20 (Sentinel 20-Pass Test Battery, 131/131 Checks PASS)

---

## 1. Executive Summary & Architectural Invariants

`ARCH-SPEC-WAR-TABLE-SKELETON-001` formalizes the structural stabilization and DOM topology invariance of the **4-Quadrant War Table Matrix** (`#war-table-matrix`).

Prior to this specification, entering combat triggered a destructive viewport swap (`hideElement("expedition-rig")` / `showElement("combat-theater")`), discarding the 2x2 grid layout, creating layout thrashing, tearing down WebGL/2D canvas rendering contexts, and breaking the cohesive identity of the War Table.

Under this specification:
1. **Topology Preservation (Zero-Tear Down):** `#war-table-matrix` remains permanently mounted in the DOM across both Exploration and Combat modes.
2. **Layer Inversion via Pure CSS:** Toggling combat state applies the `.combat-active-matrix` class to `#war-table-matrix`, seamlessly switching active layer display within each quadrant without re-creating DOM nodes or tearing down canvases.
3. **Strict Lateral Isolation:** Quadrants 1 through 4 have zero direct peer-to-peer references or invocations. All cross-quadrant telemetry and coordination flows exclusively through the `EmberlightEventBus` via immutable PMIP-001 envelopes.
4. **Tri-Partite Projection DTO Isolation:** `combat.js` (Tier 2 simulation engine) constructs and deep-freezes 4 discrete projection DTOs (`q1Spatial`, `q2Clash`, `q3Oracle`, `q4Deck`) and emits them to peripheral renderers via `renderWarTable(projection)`.

---

## 2. Permanent 2x2 War Table Matrix Topology

```plain text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   #war-table-matrix                                    │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ QUADRANT 1 (Top-Left): TACTICAL ARENA     │ QUADRANT 2 (Top-Right): CLASH PERSPECTIVE  │
│ DOM ID: #pane-cartography                 │ DOM ID: #pane-sensor                       │
│ Exploration: #overworld-grid (2D Map)     │ Exploration: #corridor-canvas (3D Raycast) │
│ Combat: #combat-spatial-view              │ Combat: #combat-arena-view                 │
│         - #combat-ctb-ribbon-bar          │         - #combat-backdrop-canvas          │
│         - #combat-party-spatial           │         - #enemy-row (Hostile Wing)        │
│         - #combat-enemy-spatial           │         - #party-grid (Allied Wing)        │
│                                           │         - #theater-clash-core              │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ QUADRANT 3 (Bottom-Left): THREAT ORACLE   │ QUADRANT 4 (Bottom-Right): COMMAND DECK    │
│ DOM ID: #pane-scanner                     │ DOM ID: #pane-readiness                    │
│ Exploration: #scanner-content             │ Exploration: #readiness-content, Districts │
│ Combat: #combat-oracle-view               │ Combat: #combat-command-view               │
│         - #telemetry-dmg-range            │         - #command-primary-ribbon          │
│         - #telemetry-hit-rate             │         - #command-sub-deck                │
│         - #telemetry-affinity-tag         │         - #combat-flee-btn                 │
│         - #log-box (Engagement Feed)      │                                            │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 3. Tri-Partite Projection DTO Schema

The authoritative combat simulation tenant (`combat.js`) generates an immutable projection snapshot adhering to the canonical schema:

```typescript
interface WarTableCombatProjection {
  phase: "PLAYER_INPUT" | "EXECUTING" | "VICTORY" | "DEFEAT";
  round: number;
  turn: number;
  activeActorId: string | null;
  activeTargetId: string | null;
  selectedAction: CombatAction | null;
  
  // Quadrant 1: Spatial Top-Down Perspective
  q1Spatial: {
    allies: Array<{ id: string; name: string; hp: number; maxHp: number; row: "FRONT" | "BACK"; isFainted: boolean }>;
    enemies: Array<{ id: string; name: string; hp: number; maxHp: number; row: "FRONT" | "BACK"; isDead: boolean }>;
    ctbTimeline: Array<{ id: string; name: string; isEnemy: boolean; delay: number }>;
  };

  // Quadrant 2: 2.5D Cinematic Arena Clash
  q2Clash: {
    backdropBiome: string;
    enemies: Array<{ id: string; name: string; hp: number; maxHp: number; sprite: string; statusEffects: string[] }>;
    allies: Array<{ id: string; name: string; hp: number; maxHp: number; sprite: string; statusEffects: string[] }>;
    activeClashAnimation: string | null;
  };

  // Quadrant 3: Tactical Threat Oracle & Engagement Feed
  q3Oracle: {
    forecast: {
      damageRange: [number, number];
      hitRate: number;
      affinityTag: string;
      breakdownText: string;
    };
    logHistory: string[];
  };

  // Quadrant 4: Command Deck & Skill Matrix
  q4Deck: {
    availableActions: string[];
    actorSkills: Array<{ id: string; name: string; cost: number; targetScope: string }>;
    actorItems: Array<{ id: string; name: string; count: number }>;
    canFlee: boolean;
  };

  // Backwards compatibility pointer for legacy renderers
  snapshot: any;
}
```

---

## 4. PMIP-001 EventBus Enveloping & Re-Entrancy Guard

All cross-district and cross-quadrant events pass through `EmberlightEventBus` wrapped in frozen PMIP-001 envelopes:

```javascript
EventBus.createEnvelope(topic, source, payload, tick);
// Returns Object.freeze({ topic, source, payload: Object.freeze({...}), tick, timestamp })
```

To eliminate synchronous call-stack recursion and stack overflow errors when subscribers trigger nested event dispatches, `EmberlightEventBus.publish()` implements a FIFO `dispatchQueue`:

```javascript
let isDispatching = false;
const dispatchQueue = [];

publish(topic, payload) {
  dispatchQueue.push({ topic, payload });
  if (isDispatching) return;
  isDispatching = true;
  try {
    while (dispatchQueue.length > 0) {
      const { topic: currentTopic, payload: currentPayload } = dispatchQueue.shift();
      const listeners = subscriptions.get(currentTopic);
      if (listeners) {
        listeners.forEach(cb => cb(currentPayload));
      }
    }
  } finally {
    isDispatching = false;
  }
}
```

---

## 5. Verification & Sentinel Pass 20 Gate

Pass 20 (`Pass20_WarTableSkeleton_Battery` in `auditor/auditor_endgame.js`) enforces the following invariants on every boot:

1. **PMIP-001 Envelope Construction & Deep Freeze:** Asserts envelope attributes `topic`, `source`, `payload`, `tick`, `timestamp` and immutability via `Object.isFrozen()`.
2. **Re-Entrant Event Queue Protection:** Confirms that nested event dispatches inside subscriber callbacks execute sequentially without crashing or truncating queue processing.
3. **Four-Quadrant Projection DTO Construction:** Asserts `q1Spatial`, `q2Clash`, `q3Oracle`, and `q4Deck` presence and deep-frozen immutability from `combat.js:render()`.
4. **DOM Topology Invariance:** Verifies that `#war-table-matrix` contains all 4 quadrant panes (`#pane-cartography`, `#pane-sensor`, `#pane-scanner`, `#pane-readiness`) and child elements (`#combat-spatial-view`, `#combat-arena-view`, `#combat-oracle-view`, `#combat-command-view`) without `#combat-theater` container pollution.
5. **Renderer Bridge Compatibility:** Confirms `combat_renderer.js` cleanly exposes `renderWarTable(projection, dispatch)`.
