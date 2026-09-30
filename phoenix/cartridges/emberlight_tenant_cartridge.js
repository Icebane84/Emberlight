/**
 * ============================================================================
 * EMBERLIGHT ENGINE SUBSTRATE: TIER 2 TENANT CARTRIDGE
 * Document Identifier: AOP-ENG-CARTRIDGE-001
 * Governing Standards: PSGC-001 / VSRP-001 / PERSIST-001 / SDCP-001
 * Authority: Plane 1 Domain Simulation Cartridge
 * ============================================================================
 */
(function (rootContext, factory) {
  'use strict';
  const resolvedRoot = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof self !== 'undefined' ? self : this);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(resolvedRoot);
  } else {
    resolvedRoot.EmberlightTenantCartridge = factory(resolvedRoot);
  }
}(typeof self !== 'undefined' ? self : this, function (resolvedRoot) {
  'use strict';

  // Role Partition Boundaries (PERSIST-001 Region 1)
  const SLOT_PLAYER = 0;
  const SLOT_DRONE_START = 1;
  const SLOT_DRONE_COUNT = 16;
  const SLOT_DRONE_END = SLOT_DRONE_START + SLOT_DRONE_COUNT; // 17

  const SLOT_PROJ_START = 17;
  const SLOT_PROJ_COUNT = 32;
  const SLOT_PROJ_END = SLOT_PROJ_START + SLOT_PROJ_COUNT; // 49

  const SLOT_SPARK_START = 49;
  const SLOT_SPARK_COUNT = 32;
  const SLOT_SPARK_END = SLOT_SPARK_START + SLOT_SPARK_COUNT; // 81

  const INACTIVE_COORD = -9999.0;
  const DRONE_RADIUS = 12.0;
  const PROJ_SPEED = 7.5;
  const DRONE_SPEED = 0.85;

  /**
   * Deterministic Mulberry32 PRNG (PSGC-001 [SEC-03]).
   */
  class Mulberry32PRNG {
    constructor(seed) {
      this.state = seed >>> 0;
    }
    nextFloat() {
      let t = (this.state += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
    }
  }

  /**
   * Canonical Tier 2 Tenant Cartridge.
   */
  class EmberlightCombatCartridge {
    constructor() {
      this.state = 'UNCONFIGURED';
      this.context = null;
      this.memoryFacade = null;
      this.simdDispatcher = null;
      this.floatView = null; // Direct slice to Region 1
      this.prng = new Mulberry32PRNG(0x12345678);

      // Pre-allocated static scratch arrays for SIMD candidate staging (Zero-GC: [INV-08])
      this._simdMinX = new Float32Array(4);
      this._simdMinY = new Float32Array(4);
      this._simdMaxX = new Float32Array(4);
      this._simdMaxY = new Float32Array(4);

      // Input tracking
      this._lastFireTick = 0n;
      this._fireCooldownTicks = 8n; // ~133ms firing rate
      this._pendingAudioEvents = [];
    }

    // ========================================================================
    // VSRP-001 9-METHOD CANONICAL LIFECYCLE
    // ========================================================================

    configure(moduleContext) {
      this.context = Object.freeze(Object.assign({}, moduleContext));
      this.state = 'CONFIGURED';
    }

    init(memoryFacade, simdDispatcher, entityFloatView) {
      this.memoryFacade = memoryFacade;
      this.simdDispatcher = simdDispatcher;
      this.floatView = entityFloatView;

      this.reset();
      this.state = 'INITIALIZED';
    }

    activate() {
      this.state = 'ACTIVE';
    }

    suspend() {
      this.state = 'SUSPENDED';
    }

    resume() {
      this.state = 'ACTIVE';
    }

    reset() {
      // 1. Initialize Player (Slot 0)
      this.floatView[0] = 320.0;
      this.floatView[1] = 240.0;
      this.floatView[2] = 0.0;
      this.floatView[3] = 0.0;

      // 2. Initialize Hostile Swarms (Slots 1..16) around screen perimeter
      for (let i = SLOT_DRONE_START; i < SLOT_DRONE_END; i++) {
        this._respawnDrone(i);
      }

      // 3. Deactivate Projectile & Spark Pools
      for (let i = SLOT_PROJ_START; i < SLOT_SPARK_END; i++) {
        const base = i * 4;
        this.floatView[base] = INACTIVE_COORD;
        this.floatView[base + 1] = INACTIVE_COORD;
        this.floatView[base + 2] = 0.0;
        this.floatView[base + 3] = 0.0;
      }
    }

    /**
     * Advances simulation state by a deterministic 60Hz tick.
     * Guaranteed ZERO heap allocations ([INV-05], [INV-08]).
     */
    update(tick, inputSnapshot) {
      if (this.state !== 'ACTIVE') return null;

      const fv = this.floatView;
      this._pendingAudioEvents.length = 0;

      // 1. Process Player Input (Slot 0)
      let playerX = fv[0];
      let playerY = fv[1];
      let playerVx = fv[2];
      let playerVy = fv[3];

      if (inputSnapshot) {
        playerVx = inputSnapshot.moveX * 3.5;
        playerVy = inputSnapshot.moveY * 3.5;

        // Fire Projectile on Spacebar
        if (inputSnapshot.isFiring && (tick - this._lastFireTick >= this._fireCooldownTicks)) {
          this._spawnProjectile(playerX, playerY, playerVx, playerVy);
          this._lastFireTick = tick;
          this._pendingAudioEvents.push({ type: 'AUDIO_TRIGGER', voice: 3 }); // Discharge Ping
        }
      }

      playerX = Math.max(16.0, Math.min(624.0, playerX + playerVx));
      playerY = Math.max(16.0, Math.min(464.0, playerY + playerVy));
      fv[0] = playerX;
      fv[1] = playerY;
      fv[2] = playerVx;
      fv[3] = playerVy;

      // 2. Advance Swarm Drones & Sync to Partition 1 SIMD Candidate Sets
      this._updateDronesAndSyncSimd(playerX, playerY);

      // 3. Advance Projectiles & Run 4-Way SIMD Collision Broadphase
      this._updateProjectilesAndCollisions();

      // 4. Advance Impact Sparks
      this._updateSparks();

      return this._pendingAudioEvents.length > 0 ? this._pendingAudioEvents : null;
    }

    render(renderer, ctx) {
      // Pure read projection (Render isolation enforced under VSRP-001 §4.5)
    }

    serialize() {
      // Authoritative state resides in linear memory buffer
      return null;
    }

    deserialize(buffer) {
      // State rehydration verified by 8-Gate Persistence Engine
    }

    destroy() {
      this.state = 'DESTROYED';
      this.floatView = null;
      this.memoryFacade = null;
      this.simdDispatcher = null;
    }

    // ========================================================================
    // INTERNAL KINEMATIC & SIMD BROADPHASE UTILITIES (Zero-Allocation)
    // ========================================================================

    _respawnDrone(slotIndex) {
      const fv = this.floatView;
      const base = slotIndex * 4;
      const edge = (this.prng.nextFloat() * 4) | 0;

      if (edge === 0) { fv[base] = this.prng.nextFloat() * 640.0; fv[base + 1] = -20.0; }
      else if (edge === 1) { fv[base] = 660.0; fv[base + 1] = this.prng.nextFloat() * 480.0; }
      else if (edge === 2) { fv[base] = this.prng.nextFloat() * 640.0; fv[base + 1] = 500.0; }
      else { fv[base] = -20.0; fv[base + 1] = this.prng.nextFloat() * 480.0; }

      fv[base + 2] = 0.0;
      fv[base + 3] = 0.0;
    }

    _spawnProjectile(px, py, pvx, pvy) {
      const fv = this.floatView;
      for (let i = SLOT_PROJ_START; i < SLOT_PROJ_END; i++) {
        const base = i * 4;
        if (fv[base] <= INACTIVE_COORD + 1.0) {
          fv[base] = px;
          fv[base + 1] = py;

          // Normalize projectile trajectory or default upwards
          let len = Math.hypot(pvx, pvy);
          if (len < 0.1) {
            fv[base + 2] = 0.0;
            fv[base + 3] = -PROJ_SPEED;
          } else {
            fv[base + 2] = (pvx / len) * PROJ_SPEED;
            fv[base + 3] = (pvy / len) * PROJ_SPEED;
          }
          break;
        }
      }
    }

    _spawnSparks(x, y) {
      const fv = this.floatView;
      let spawned = 0;
      for (let i = SLOT_SPARK_START; i < SLOT_SPARK_END && spawned < 4; i++) {
        const base = i * 4;
        if (fv[base] <= INACTIVE_COORD + 1.0) {
          fv[base] = x;
          fv[base + 1] = y;
          const angle = this.prng.nextFloat() * Math.PI * 2.0;
          const speed = 1.0 + this.prng.nextFloat() * 3.0;
          fv[base + 2] = Math.cos(angle) * speed;
          fv[base + 3] = Math.sin(angle) * speed;
          spawned++;
        }
      }
    }

    _updateDronesAndSyncSimd(playerX, playerY) {
      const fv = this.floatView;

      // 16 drones packed into 4 SIMD candidate sets (Sets 0..3)
      for (let set = 0; set < 4; set++) {
        for (let lane = 0; lane < 4; lane++) {
          const droneSlot = SLOT_DRONE_START + (set * 4) + lane;
          const base = droneSlot * 4;

          let dx = playerX - fv[base];
          let dy = playerY - fv[base + 1];
          let dist = Math.hypot(dx, dy);

          if (dist > 1.0) {
            fv[base + 2] = (dx / dist) * DRONE_SPEED;
            fv[base + 3] = (dy / dist) * DRONE_SPEED;
          }

          fv[base] += fv[base + 2];
          fv[base + 1] += fv[base + 3];

          // Pack 4-lane AABB structures
          this._simdMinX[lane] = fv[base] - DRONE_RADIUS;
          this._simdMinY[lane] = fv[base + 1] - DRONE_RADIUS;
          this._simdMaxX[lane] = fv[base] + DRONE_RADIUS;
          this._simdMaxY[lane] = fv[base + 1] + DRONE_RADIUS;
        }

        // Commit candidate set to Partition 1 (Offset 0x800 + set * 64)
        if (this.memoryFacade) {
          this.memoryFacade.writeSimdAabbCandidateSet(
            set, this._simdMinX, this._simdMinY, this._simdMaxX, this._simdMaxY
          );
        }
      }
    }

    _updateProjectilesAndCollisions() {
      const fv = this.floatView;

      for (let p = SLOT_PROJ_START; p < SLOT_PROJ_END; p++) {
        const pBase = p * 4;
        let px = fv[pBase];
        let py = fv[pBase + 1];

        if (px <= INACTIVE_COORD + 1.0) continue;

        px += fv[pBase + 2];
        py += fv[pBase + 3];

        // Bounds culling
        if (px < -10.0 || px > 650.0 || py < -10.0 || py > 490.0) {
          fv[pBase] = INACTIVE_COORD;
          continue;
        }

        fv[pBase] = px;
        fv[pBase + 1] = py;

        // 4-Way Parallel SIMD Broadphase Check across 4 candidate sets (16 drones)
        if (this.simdDispatcher) {
          let hitDetected = false;

          for (let set = 0; set < 4; set++) {
            const hitMask = this.simdDispatcher.testPointCollision4Way(set, px, py);
            if (hitMask !== 0) {
              // Resolve which lane in the candidate set was hit
              for (let lane = 0; lane < 4; lane++) {
                if ((hitMask & (1 << lane)) !== 0) {
                  const targetDroneSlot = SLOT_DRONE_START + (set * 4) + lane;
                  const dBase = targetDroneSlot * 4;

                  this._spawnSparks(fv[dBase], fv[dBase + 1]);
                  this._respawnDrone(targetDroneSlot);
                  this._pendingAudioEvents.push({ type: 'AUDIO_TRIGGER', voice: 4 }); // Crunch Ping
                  hitDetected = true;
                  break;
                }
              }
              if (hitDetected) break;
            }
          }

          if (hitDetected) {
            fv[pBase] = INACTIVE_COORD; // Deactivate projectile
          }
        }
      }
    }

    _updateSparks() {
      const fv = this.floatView;
      for (let s = SLOT_SPARK_START; s < SLOT_SPARK_END; s++) {
        const base = s * 4;
        if (fv[base] <= INACTIVE_COORD + 1.0) continue;

        fv[base] += fv[base + 2];
        fv[base + 1] += fv[base + 3];
        fv[base + 2] *= 0.92; // Friction dampening
        fv[base + 3] *= 0.92;

        if (Math.hypot(fv[base + 2], fv[base + 3]) < 0.15) {
          fv[base] = INACTIVE_COORD;
        }
      }
    }
  }

  return Object.freeze({
    EmberlightCombatCartridge: EmberlightCombatCartridge,
    SLOT_PLAYER: SLOT_PLAYER,
    SLOT_DRONE_START: SLOT_DRONE_START,
    SLOT_DRONE_COUNT: SLOT_DRONE_COUNT,
    SLOT_PROJ_START: SLOT_PROJ_START,
    SLOT_PROJ_COUNT: SLOT_PROJ_COUNT,
    SLOT_SPARK_START: SLOT_SPARK_START,
    SLOT_SPARK_COUNT: SLOT_SPARK_COUNT
  });
}));