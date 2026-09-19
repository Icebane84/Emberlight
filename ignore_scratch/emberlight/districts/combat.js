/* ==========================================================================
   FILE: districts/combat.js
   ROLE: Real-Time Combat Simulation Tenant (VSRP-001 Compliant)
   ========================================================================== */
window._CombatDistrictInternal = window._CombatDistrictInternal || {};

(() => {
  'use strict';

  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };

  let lifecycleState = State.UNCONFIGURED;
  let eventBusRef = null;
  let sim = null;

  const diagnostics = { executionTimeMs: 0, attacksProcessed: 0 };

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(`[VSRP-001:district_combat] Lifecycle Error: Invoked in state "${lifecycleState}".`);
    }
  }

  function configure(cfg) {
    assertLifecycle(State.UNCONFIGURED);
    lifecycleState = State.CONFIGURED;
  }

  function init(ctx) {
    assertLifecycle(State.CONFIGURED);
    eventBusRef = ctx?.eventBus;
    lifecycleState = State.INITIALIZED;
  }

  function reset(snapshot) {
    assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
    const incoming = snapshot ? structuredClone(snapshot) : {};

    sim = {
      active: incoming.active || false,
      player: incoming.player || { x: 1.5, y: 1.5, hp: 48, maxHp: 48, stamina: 100, attackCooldown: 0 },
      enemies: incoming.enemies ? structuredClone(incoming.enemies) : [
        { id: 'enemy_1', x: 5.5, y: 5.5, name: "Dread Archer", hp: 32, maxHp: 32, attackTimer: 0, range: 1.8 }
      ]
    };
    lifecycleState = State.READY;
  }

  function update(dt, ctx) {
    assertLifecycle(State.READY, State.RUNNING);
    lifecycleState = State.RUNNING;
    if (!sim?.active) return;

    const startTime = performance.now();
    const activeCtx = ctx || {};

    // 1. Process Real-Time Player Inputs (e.g., Melee Swing)
    if (activeCtx.inputBuffer) {
      while (activeCtx.inputBuffer.length > 0) {
        const action = activeCtx.inputBuffer.shift();
        if (action.type === 'REALTIME_STRIKE') {
          executeRealTimeStrike();
        }
      }
    }

    // 2. Tick Enemy AI Cooldowns & Real-Time Aggro
    sim.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;

      enemy.attackTimer += dt;
      // If enemy attack cooldown elapsed (e.g., every 1.5 seconds)
      if (enemy.attackTimer >= 1.5) {
        enemy.attackTimer = 0;
        sim.player.hp = Math.max(0, sim.player.hp - 8);
        if (eventBusRef) {
          eventBusRef.publish('combat:damage_taken', { amount: 8, source: enemy.name });
        }
      }
    });

    diagnostics.executionTimeMs = performance.now() - startTime;
  }

  function render(renderer, ctx) {
    assertLifecycle(State.READY, State.RUNNING);
    // Read-only projection handled by Q3 presentation driver
  }

  function getState() {
    assertLifecycle(State.READY, State.RUNNING);
    return structuredClone(sim);
  }

  function getDiagnostics() {
    return { ...diagnostics, activeEnemies: sim?.enemies?.length || 0 };
  }

  function getModuleInfo() {
    return Object.freeze({
      moduleId: "district_combat_realtime",
      version: "1.1.0",
      protocolVersion: "VSRP-001",
      capabilities: ["REALTIME_COMBAT", "events.combat_strike"]
    });
  }

  function destroy() {
    if (lifecycleState === State.DESTROYED) return;
    sim = null;
    lifecycleState = State.DESTROYED;
  }

  function executeRealTimeStrike() {
    diagnostics.attacksProcessed++;
    // Check if any enemy is within melee range (e.g., < 1.5 distance units)
    sim.enemies.forEach(enemy => {
      const dx = enemy.x - sim.player.x;
      const dy = enemy.y - sim.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 1.5 && enemy.hp > 0) {
        enemy.hp -= 16;
        if (eventBusRef) {
          eventBusRef.publish('combat:strike_landed', { target: enemy.name, damage: 16, hp: enemy.hp });
        }
      }
    });
  }

  window._CombatDistrictInternal.CombatDistrict = Object.freeze({
    configure, init, reset, update, render, getState, getDiagnostics, getModuleInfo, destroy
  });
})();

if (typeof window !== 'undefined') {
  window.EmberlightCombatDistrict = window._CombatDistrictInternal.CombatDistrict;
}
delete window._CombatDistrictInternal;