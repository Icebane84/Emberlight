/* ==========================================================================
   FILE: combat.js
   ROLE: Canonical VSRP-001 Combat Facade Entry Point
   ========================================================================== */
const EmberlightCombat = (() => {
  'use strict';

  // 1. Ingest from Temporary Staging Namespace
  const { Calc, Queue, AI, Displacement } = window._CombatInternal || {};

  // 2. Lifecycle State Machine (VSRP-001 Standard)
  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };

  let lifecycleState = State.UNCONFIGURED;
  let hostConfig = null;
  let hostContext = null;
  let eventBusRef = null;
  let sim = null;

  const diagnostics = {
    executionTimeMs: 0,
    turnsProcessed: 0
  };

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(`[VSRP-001:combat] Lifecycle Error: Invoked in state "${lifecycleState}". Required: ${allowed.join(' | ')}`);
    }
  }

  // 3. Export Canonical VSRP-001 9-Method Interface
  return {
    configure(config) {
      assertLifecycle(State.UNCONFIGURED);
      if (!config?.manifest) throw new Error('[VSRP-001:combat] Missing manifest configuration.');
      hostConfig = Object.freeze({ ...config });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus) throw new Error('[VSRP-001:combat] Missing host eventBus handle.');
      hostContext = context;
      eventBusRef = context.eventBus;
      lifecycleState = State.INITIALIZED;
    },

    reset(snapshot) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
      // Faraday Isolation: Deep-clone incoming host state snapshot
      const incoming = snapshot ? structuredClone(snapshot) : {};
      sim = {
        active: incoming.active || false,
        turn: incoming.turn || 0,
        phase: incoming.phase || 'IDLE',
        party: incoming.party ? structuredClone(incoming.party) : [],
        enemies: incoming.enemies ? structuredClone(incoming.enemies) : []
      };
      lifecycleState = State.READY;
    },

    update(dt, context) {
      assertLifecycle(State.READY, State.RUNNING);
      lifecycleState = State.RUNNING;
      if (!sim?.active) return;

      const startTime = performance.now();
      const activeCtx = context || hostContext;

      // Process input queue through internal subsystem logic
      if (activeCtx?.inputBuffer) {
        while (activeCtx.inputBuffer.length > 0) {
          const action = activeCtx.inputBuffer.shift();
          
          if (action.type === 'DISPLACE' && Displacement) {
            const target = sim.enemies[action.targetIndex];
            if (target) {
              Displacement.applyDisplacement(target, action.displacementType);
              diagnostics.turnsProcessed++;
            }
          }
        }
      }

      diagnostics.executionTimeMs = performance.now() - startTime;
    },

    render(renderer, context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (!sim?.active || !renderer) return;
      if (typeof renderer.render === 'function') {
        renderer.render(this.getState(), context?.dispatch);
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim); // Return detached POJO
    },

    getDiagnostics() {
      return { moduleId: 'combat_core', lifecycleState, ...diagnostics };
    },

    getModuleInfo() {
      return Object.freeze({
        moduleId: 'combat_core',
        version: '4.0.0',
        protocolVersion: 'VSRP-001',
        dependencies: ['manifest'],
        capabilities: ['combat', 'ctb_turns', 'displacement']
      });
    },

    destroy() {
      if (lifecycleState === State.DESTROYED) return;
      sim = null;
      hostConfig = null;
      hostContext = null;
      eventBusRef = null;
      lifecycleState = State.DESTROYED;
    }
  };
})();

// 4. Purge Temporary Staging Namespace & Expose Facade
delete window._CombatInternal;

if (typeof window !== 'undefined') {
  window.EmberlightCombat = EmberlightCombat;
}