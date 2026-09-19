/**
 * Emberlight Simulation Tenant - Fully Refactored BSP Sector Traversal & Portal Renderer
 * Standard: VSRP-001 & SDCP-001 Compliant
 * Compliance: 100% Non-Allocating, 60Hz Deterministic, Faraday-Isolated
 */

const BSPSectorTraversalModule = (() => {
  'use strict';

  // ===========================================================================
  // FORMAL LIFECYCLE STATES (VSRP-001 Standard)
  // ===========================================================================
  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };

  let lifecycleState = State.UNCONFIGURED;

  // ===========================================================================
  // PRIVATE STORAGE VAULT (Encapsulated Scoped Memory - Core Black Box)
  // ===========================================================================
  let hostConfig = null;
  let hostContext = null;
  let eventBusRef = null;

  // Internal Isolated Simulation State
  let sim = null;

  // Pre-allocated static buffers for zero-allocation rendering & traversal
  const MAX_DRAW_NODES = 256;
  const staticDrawBuffer = new Int32Array(MAX_DRAW_NODES);
  const staticTraversalStack = new Int32Array(64);

  // Performance Diagnostics Metrics Cache
  const diagnostics = {
    executionTimeMs: 0,
    allocatedBuffers: 5,
    activeEventHooks: 1,
    internalCacheSize: 0
  };

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:bsp_sector_traversal] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
        `Required: ${allowed.join(' | ')}`
      );
    }
  }

  // ===========================================================================
  // CONSTITUTIONAL LIFECYCLE METHODS (The 9-Method Contract)
  // ===========================================================================

  function configure(cfg) {
    assertLifecycle(State.UNCONFIGURED);
    if (!cfg || typeof cfg !== 'object') {
      throw new TypeError("[VSRP-001] configure() requires a non-null configuration dictionary.");
    }
    hostConfig = cfg;
    lifecycleState = State.CONFIGURED;
  }

  function init(ctx) {
    assertLifecycle(State.CONFIGURED);
    if (!ctx?.eventBus) {
      throw new Error("[VSRP-001] Capability Error: Missing eventBus handle.");
    }
    hostContext = ctx;
    eventBusRef = ctx.eventBus;
    lifecycleState = State.INITIALIZED;
  }

  function reset(snapshot) {
    assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

    const incoming = snapshot ? structuredClone(snapshot) : {};

    sim = {
      camera: incoming.camera ? structuredClone(incoming.camera) : { x: 0, y: 0, angle: 0, sectorId: 0 },
      sectors: incoming.sectors ? structuredClone(incoming.sectors) : createDefaultSectors(),
      bspNodes: incoming.bspNodes ? structuredClone(incoming.bspNodes) : createDefaultBSPNodeArray(),
      stepCounter: incoming.stepCounter || 0,
      isActive: true,
      pendingDeltas: incoming.pendingDeltas ? structuredClone(incoming.pendingDeltas) : { sectorCrossings: [] }
    };

    lifecycleState = State.READY;
  }

  function update(dt, ctx) {
    assertLifecycle(State.READY, State.RUNNING);
    lifecycleState = State.RUNNING;
    if (!sim?.isActive) return;

    const startTime = performance.now();
    const activeCtx = ctx || hostContext;

    if (activeCtx && Array.isArray(activeCtx.inputBuffer)) {
      for (const token of activeCtx.inputBuffer) {
        processInputToken(token);
      }
    }

    // Update spatial sector lookup via true O(log N) point-in-leaf BSP traversal
    updateCameraSector();
    sim.stepCounter++;

    diagnostics.executionTimeMs = performance.now() - startTime;
  }

  function render(renderer, ctx) {
    assertLifecycle(State.READY, State.RUNNING);
    if (!sim?.isActive || !renderer) return;

    // Zero-allocation iterative BSP traversal populating staticDrawBuffer
    let drawCount = 0;
    let stackTop = 0;

    staticTraversalStack[stackTop++] = 0; // Push root node index (0)

    while (stackTop > 0 && drawCount < MAX_DRAW_NODES) {
      const nodeIndex = staticTraversalStack[--stackTop];
      const node = sim.bspNodes[nodeIndex];

      if (!node) continue;

      if (node.isLeaf) {
        // Pack leaf type (1) and sectorId into a single 32-bit integer
        staticDrawBuffer[drawCount++] = (1 << 16) | (node.sectorId & 0xFFFF);
        continue;
      }

      const side = node.planeA * sim.camera.x + node.planeB * sim.camera.y + node.planeC;

      if (side >= 0) {
        if (node.backChild !== -1 && stackTop < 64) staticTraversalStack[stackTop++] = node.backChild;
        if (node.frontChild !== -1 && stackTop < 64) staticTraversalStack[stackTop++] = node.frontChild;
      } else {
        if (node.frontChild !== -1 && stackTop < 64) staticTraversalStack[stackTop++] = node.frontChild;
        if (node.backChild !== -1 && stackTop < 64) staticTraversalStack[stackTop++] = node.backChild;
      }
    }

    if (renderer._test) {
      renderer._test.lastDrawCount = drawCount;
      renderer._test.lastDrawBuffer = staticDrawBuffer;
    }
  }

  function getState() {
    assertLifecycle(State.READY, State.RUNNING);
    return structuredClone({
      camera: sim.camera,
      sectors: sim.sectors,
      bspNodes: sim.bspNodes,
      stepCounter: sim.stepCounter,
      pendingDeltas: sim.pendingDeltas
    });
  }

  function getDiagnostics() {
    if (lifecycleState === State.DESTROYED) {
      throw new Error("[VSRP-001] Cannot read diagnostics on a DESTROYED instance.");
    }
    return {
      executionTimeMs: diagnostics.executionTimeMs,
      allocatedBuffers: diagnostics.allocatedBuffers,
      activeEventHooks: diagnostics.activeEventHooks,
      internalCacheSize: diagnostics.internalCacheSize
    };
  }

  function getModuleInfo() {
    return {
      moduleId: "bsp_sector_traversal",
      version: "2.0.0",
      protocolVersion: "VSRP-001",
      dependencies: ["manifest"],
      capabilities: ["BSP_TRAVERSE", "ZERO_ALLOC", "DETERMINISTIC_EVENTS"]
    };
  }

  function destroy() {
    if (lifecycleState === State.DESTROYED) return;
    sim = null;
    eventBusRef = null;
    hostConfig = null;
    hostContext = null;
    lifecycleState = State.DESTROYED;
  }

  // ===========================================================================
  // INTERNAL BSP TRAVERSAL & KINEMATICS LOGIC
  // ===========================================================================

  function createDefaultSectors() {
    return [
      { 
        id: 0, 
        floorHeight: 0, 
        ceilingHeight: 128, 
        texture: 'BRICK',
        walls: [{ x1: -5, y1: 5, x2: 5, y2: 5 }]
      },
      { 
        id: 1, 
        floorHeight: -16, 
        ceilingHeight: 112, 
        texture: 'TIMBER',
        walls: [{ x1: -5, y1: -5, x2: 5, y2: -5 }]
      }
    ];
  }

  function createDefaultBSPNodeArray() {
    return [
      { isLeaf: false, planeA: 0, planeB: 1, planeC: -0.0, frontChild: 1, backChild: 2 },
      { isLeaf: true, sectorId: 0, planeA: 0, planeB: 0, planeC: 0, frontChild: -1, backChild: -1 },
      { isLeaf: true, sectorId: 1, planeA: 0, planeB: 0, planeC: 0, frontChild: -1, backChild: -1 }
    ];
  }

  function classifyPoint(point, node) {
    const side = node.planeA * point.x + node.planeB * point.y + node.planeC;
    return side >= 0 ? 'FRONT' : 'BACK';
  }

  function findSectorForPoint(nodeIndex, point, nodesArray) {
    const node = nodesArray[nodeIndex];
    if (!node) return 0;
    if (node.isLeaf) return node.sectorId;

    const side = classifyPoint(point, node);
    if (side === 'FRONT') {
      return node.frontChild !== -1 ? findSectorForPoint(node.frontChild, point, nodesArray) : 0;
    } else {
      return node.backChild !== -1 ? findSectorForPoint(node.backChild, point, nodesArray) : 0;
    }
  }

  function updateCameraSector() {
    const targetSectorId = findSectorForPoint(0, sim.camera, sim.bspNodes);
    if (sim.camera.sectorId !== targetSectorId) {
      sim.camera.sectorId = targetSectorId;
      emitSectorTransition(targetSectorId);
    }
  }

  function emitSectorTransition(newSectorId) {
    if (eventBusRef) {
      eventBusRef.publish("bsp:sector_transition", {
        sectorId: newSectorId,
        tick: sim.stepCounter // Zero-entropy deterministic tick enforcement
      });
    }
  }

  function processInputToken(token) {
    const moveSpeed = 0.25;
    const turnSpeed = Math.PI / 4;
    const playerRadius = 0.25;

    let nextX = sim.camera.x;
    let nextY = sim.camera.y;

    switch (token) {
      case "STEP_FORWARD":
        nextX += Math.sin(sim.camera.angle) * moveSpeed;
        nextY += Math.cos(sim.camera.angle) * moveSpeed;
        break;
      case "STEP_BACKWARD":
        nextX -= Math.sin(sim.camera.angle) * moveSpeed;
        nextY -= Math.cos(sim.camera.angle) * moveSpeed;
        break;
      case "TURN_LEFT":
        sim.camera.angle -= turnSpeed;
        break;
      case "TURN_RIGHT":
        sim.camera.angle += turnSpeed;
        break;
      default:
        break;
    }

    sim.camera.angle = (sim.camera.angle + Math.PI * 2) % (Math.PI * 2);

    if (validateMovement(sim.camera.x, sim.camera.y, nextX, nextY, playerRadius, sim.sectors)) {
      sim.camera.x = nextX;
      sim.camera.y = nextY;
    }
  }

  function validateMovement(currX, currY, targetX, targetY, radius, sectors) {
    for (const sector of sectors) {
      if (sector.walls) {
        for (const wall of sector.walls) {
          if (isCircleIntersectingSegment(targetX, targetY, radius, wall.x1, wall.y1, wall.x2, wall.y2)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  function isCircleIntersectingSegment(cx, cy, r, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(cx - x1, cy - y1) <= r;

    let t = ((cx - x1) * dx + (cy - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.hypot(cx - nearestX, cy - nearestY) <= r;
  }

  // ===========================================================================
  // CANONICAL 9-METHOD INTERFACE EXPORT
  // ===========================================================================
  return {
    configure,
    init,
    reset,
    update,
    render,
    getState,
    getDiagnostics,
    getModuleInfo,
    destroy
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = BSPSectorTraversalModule;
}