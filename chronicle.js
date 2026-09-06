/* =========================================================================
   DISTRICT 7: QUEST & WORLD STATE REGISTRY (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-CHRONICLE-CORE
   Protocol Version:    VSRP-001
   Classification:      Ephemeral Simulation Tenant & World Evaluator
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightChronicle = (() => {
  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };
  "use strict";

  let lifecycleState = State.UNCONFIGURED;
  let hostConfig = null;
  let hostContext = null;

  // Authoritative Ephemeral Working Memory
  let sim = null;

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:chronicle_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
        `Required: ${allowed.join(' | ')}`
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

  function getActiveManifest() {
    return hostConfig?.manifest || (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {});
  }

  function dispatchSFX(sfxName) {
    hostContext?.eventBus?.publish?.('chronicle:sfx', { sfx: sfxName });
  }

  function createDefaultState() {
    return {
      flags: {},
      quests: {},
      selectedQuestId: null,
      deltas: {
        flagsDelta: {},
        questsDelta: {},
      },
    };
  }

  function getQuestDefinition(questId) {
    const manifest = getActiveManifest();
    return manifest?.Quests?.[questId] || null;
  }

  function setFlag(flagKey, value) {
    sim.flags[flagKey] = value;
    sim.deltas.flagsDelta[flagKey] = value;
    hostContext?.eventBus?.publish?.('chronicle:flag_set', { flag: flagKey, value });
  }

  function advanceQuest(questId, targetStage) {
    const questDef = getQuestDefinition(questId);
    if (!questDef) return false;

    if (!sim.quests[questId]) {
      sim.quests[questId] = { stage: 0, completed: false };
    }

    const current = sim.quests[questId];
    const newStage = typeof targetStage === 'number' ? targetStage : current.stage + 1;
    const stages = Array.isArray(questDef.stages) ? questDef.stages : [];
    const stageData = stages[newStage];

    current.stage = newStage;
    current.completed = stageData && typeof stageData === 'object'
      ? Boolean(stageData.completed)
      : (stages.length > 0 && newStage >= stages.length);

    sim.deltas.questsDelta[questId] = { stage: newStage, completed: current.completed };

    hostContext?.eventBus?.publish?.('chronicle:quest_updated', {
      questId,
      stage: newStage,
      completed: current.completed,
    });

    dispatchSFX('SELECT');
    return true;
  }

  function finalizeChronicle() {
    const payload = {
      flagsDelta: structuredClone(sim.deltas.flagsDelta),
      questDeltas: structuredClone(sim.deltas.questsDelta),
      questsDelta: structuredClone(sim.deltas.questsDelta),
    };

    hostContext?.eventBus?.publish?.('chronicle:resolved', payload);
  }

  // --- Canonical 9-Method Interface Export ---
  const api = {
    configure(cfg) {
      assertLifecycle(State.UNCONFIGURED);
      if (!cfg || typeof cfg !== 'object') {
        throw new TypeError('[VSRP-001:chronicle_core] configure() requires a valid configuration object.');
      }
      hostConfig = deepFreeze({ ...cfg });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus?.publish || typeof context.eventBus.publish !== 'function') {
        throw new Error('[VSRP-001:chronicle_core] Capability Error: Missing eventBus.publish handle.');
      }
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

    reset(snapshot) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

      const baseline = createDefaultState();
      const incoming = snapshot ? structuredClone(snapshot) : {};

      sim = {
        ...baseline,
        ...incoming,
        flags: incoming.flags || {},
        quests: incoming.quests || {},
        deltas: {
          flagsDelta: {},
          questsDelta: {},
        },
      };

      const questKeys = Object.keys(getActiveManifest()?.Quests || {});
      if (questKeys.length > 0 && !sim.selectedQuestId) {
        sim.selectedQuestId = questKeys[0];
      }

      lifecycleState = State.READY;
    },

    update(_dt, context) {
      assertLifecycle(State.READY, State.RUNNING);
      lifecycleState = State.RUNNING;

      const activeCtx = context || hostContext;
      if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
        for (const action of activeCtx.inputs) {
          this.handleHostAction(action);
        }
      }
    },

    render(renderer, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (renderer && typeof renderer.renderChronicle === 'function') {
        renderer.renderChronicle(this.getState(), (action) => this.handleHostAction(action));
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

    getDiagnostics() {
      if (lifecycleState === State.DESTROYED) {
        throw new Error('[VSRP-001:chronicle_core] Cannot read diagnostics on a DESTROYED instance.');
      }
      return {
        moduleId: 'chronicle_core',
        lifecycleState,
        activeQuestCount: Object.keys(sim?.quests || {}).length,
        flagCount: Object.keys(sim?.flags || {}).length,
      };
    },

    getModuleInfo() {
      return {
        moduleId: 'chronicle_core',
        version: '1.2.0',
        protocolVersion: 'VSRP-001',
        dependencies: ['manifest'],
        capabilities: [
          'world_state',
          'quest_tracking',
          'map_mutations',
          'events.chronicle_sfx',
          'events.chronicle_resolved',
        ],
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

      if (type === 'SET_FLAG') {
        setFlag(action.flag, action.value);
      } else if (type === 'ADVANCE_QUEST') {
        advanceQuest(action.questId, action.stage);
      } else if (type === 'SELECT_QUEST') {
        sim.selectedQuestId = action.questId || null;
      } else if (type === 'EXIT') {
        finalizeChronicle();
      }
    },
  };

  return api;
})();

if (typeof window !== 'undefined') {
  window.EmberlightChronicle = EmberlightChronicle;
}