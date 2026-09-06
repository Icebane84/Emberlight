/* =========================================================================
   DISTRICT 9: RELIC FORGE (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-FORGE-EXTENDED
   Classification:      Ephemeral Simulation Tenant
   Protocol Version:    VSRP-001
   Index Anchor:        PRS-001
   ========================================================================= */
const EmberlightRelicForge = (() => {
	"use strict";

  // --- Formal Lifecycle States ---
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

  // --- Private Simulation Vault (Faraday Rule 1) ---
  let sim = null;

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:relic_forge] Lifecycle Error: Invoked in "${lifecycleState}". Required: ${allowed.join(' | ')}`
      );
    }
  }

  function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((prop) => {
      if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
        deepFreeze(obj[prop]);
      }
    });
    return Object.freeze(obj);
  }

  function dispatchSFX(sfxName) {
    hostContext?.eventBus?.publish?.('relic_forge:sfx', { sfx: sfxName });
  }

  // --- SEALED DELTA ENVELOPE (Rule 3) ---
  function finalizeForge() {
    dispatchSFX('SELECT');
    if (hostContext?.eventBus?.publish) {
      hostContext.eventBus.publish('relic_forge:resolved', {
        outcome: 'success',
        goldDelta: sim?.deltas?.goldDelta || 0,
        inventoryDelta: structuredClone(sim?.deltas?.inventoryDelta || {}),
        party: structuredClone(sim?.party || []),
      });
    }
  }

  // --- CANONICAL 9-METHOD CONTRACT (Rule 2) ---
  return {
    configure(config) {
      assertLifecycle(State.UNCONFIGURED);
      if (!config || typeof config !== 'object') {
        throw new TypeError('[VSRP-001:relic_forge] configure() requires a configuration dictionary.');
      }
      hostConfig = deepFreeze({ ...config });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
        throw new Error('[VSRP-001:relic_forge] Capability Error: Missing eventBus handle.');
      }
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

    reset(snapshot = {}) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
      sim = {
        party: structuredClone(snapshot.party || []),
        inventory: structuredClone(snapshot.inventory || {}),
        gold: typeof snapshot.gold === 'number' ? snapshot.gold : 0,
        selectedCharIndex: 0,
        selectedCategory: 'WEAPON', // 'WEAPON' | 'ARMOR' | 'ACCESSORY'
        currentSeed: typeof snapshot.seed === 'number' ? snapshot.seed : (snapshot.gold ? (snapshot.gold * 313 + 10007) % 90000 : 42771),
        deltas: {
          goldDelta: 0,
          inventoryDelta: {},
        },
        active: true,
      };
      lifecycleState = State.READY;
    },

    update(_dt, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (!sim?.active) return;
      lifecycleState = State.RUNNING;
    },

    render(renderer, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (renderer && typeof renderer.renderRelicForge === 'function') {
        renderer.renderRelicForge(this.getState(), (action) => this.handleHostAction(action));
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

    getDiagnostics() {
      return {
        moduleId: 'relic_forge_core',
        lifecycleState,
        activeChar: sim?.party?.[sim?.selectedCharIndex]?.name || null,
        activeCategory: sim?.selectedCategory || null,
        activeSeed: sim?.currentSeed || null,
      };
    },

    getModuleInfo() {
      return {
        moduleId: 'relic_forge_core',
        name: 'EmberlightRelicForge',
        protocolVersion: 'VSRP-001',
        version: '1.1.0',
        capabilities: ['phenotype_crafting', 'events.relic_forge_resolved'],
      };
    },

    destroy() {
      if (lifecycleState === State.DESTROYED) return;
      sim = null;
      hostConfig = null;
      hostContext = null;
      lifecycleState = State.DESTROYED;
    },

    handleHostAction(action) {
      if (!action || !sim) return;
      const type = typeof action === 'string' ? action : action.type;
      if (type === 'SELECT_CHAR') {
        if (typeof action.index === 'number') {
          sim.selectedCharIndex = action.index;
          dispatchSFX('SELECT');
        }
      } else if (type === 'SELECT_CATEGORY') {
        if (action.category) {
          sim.selectedCategory = action.category;
          dispatchSFX('SELECT');
        }
      } else if (type === 'REATTUNE') {
        const prng = (typeof EmberlightPRNG !== 'undefined' && EmberlightPRNG.create)
          ? EmberlightPRNG.create(sim.currentSeed + 7919)
          : null;
        sim.currentSeed = prng ? prng.nextInt(10000, 99999) : (((sim.currentSeed * 1103515245 + 12345) & 0x7fffffff) % 90000 + 10000);
        dispatchSFX('SELECT');
      } else if (type === 'CRAFT_RECIPE') {
        const cost = action.cost || 0;
        if (sim.gold >= cost && action.recipeYield) {
          sim.gold -= cost;
          sim.deltas.goldDelta -= cost;
          sim.inventory[action.recipeYield] = (sim.inventory[action.recipeYield] || 0) + 1;
          sim.deltas.inventoryDelta[action.recipeYield] =
            (sim.deltas.inventoryDelta[action.recipeYield] || 0) + 1;
          dispatchSFX('HEAL');
          finalizeForge();
        }
      } else if (type === 'EXIT') {
        finalizeForge();
      }
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightRelicForge = EmberlightRelicForge;
}