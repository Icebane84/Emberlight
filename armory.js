/* =========================================================================
   DISTRICT 5: EQUIPMENT & GEAR ENGINE (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-ARMORY-CORE
   Protocol Version:    VSRP-001
   Classification:      Ephemeral Simulation Tenant
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightArmory = (() => {
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

  // --- Host Context & Configuration ---
  let hostConfig = null;
  let hostContext = null;

  // --- Authoritative Working Memory ---
  let sim = null;

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:armory_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
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
    if (hostContext?.eventBus?.publish) {
      hostContext.eventBus.publish('armory:sfx', { sfx: sfxName });
    }
  }

  function createDefaultState() {
    return {
      party: [],
      inventory: {},
      selectedCharIndex: 0,
      selectedSlot: 'weapon',
      deltas: {
        partyEquipDelta: [], 
        inventoryDelta: {},  
      }
    };
  }

  function getItem(itemId) {
    const manifest = getActiveManifest();
    return manifest?.Items?.[itemId] || null;
  }

  function evaluateEquipRequirements(char, newItem) {
    if (newItem.requirements) {
      const manifest = getActiveManifest();
      const stats = typeof manifest.computeCharacterStats === 'function'
        ? manifest.computeCharacterStats(char)
        : char;

      for (const [stat, reqVal] of Object.entries(newItem.requirements)) {
        if (stat === 'level') {
          if ((char.level || 1) < reqVal) return false;
        } else if ((stats[stat] || 0) < reqVal) {
          return false;
        }
      }
      return true;
    }

    const allowed = newItem.allowedPhenotypes || newItem.allowedClasses;
    return !(allowed && !allowed.includes(char.phenotype));
  }

  function swapEquippedItem(char, slot, newItemId) {
    const oldItemId = char.equipment[slot];

    sim.inventory[newItemId] -= 1;
    sim.deltas.inventoryDelta[newItemId] = (sim.deltas.inventoryDelta[newItemId] || 0) - 1;

    if (oldItemId) {
      sim.inventory[oldItemId] = (sim.inventory[oldItemId] || 0) + 1;
      sim.deltas.inventoryDelta[oldItemId] = (sim.deltas.inventoryDelta[oldItemId] || 0) + 1;
    }

    char.equipment[slot] = newItemId;

    sim.deltas.partyEquipDelta.push({
      characterId: char.id,
      slot,
      previousItem: oldItemId,
      newItem: newItemId,
    });
  }

  function equipItem(characterId, slot, newItemId) {
    const char = sim.party.find((c) => c.id === characterId);
    if (!char) return false;

    if (!char.equipment) {
      char.equipment = { weapon: null, armor: null, accessory: null };
    }

    const newItem = getItem(newItemId);
    if (!newItem || newItem.slot !== slot) return false;

    if (!evaluateEquipRequirements(char, newItem)) return false;

    if ((sim.inventory[newItemId] || 0) <= 0) return false;

    swapEquippedItem(char, slot, newItemId);
    dispatchSFX('SELECT');
    return true;
  }

  // --- Canonical 9-Method Interface Export ---
  const api = {
    configure(cfg) {
      assertLifecycle(State.UNCONFIGURED);
      if (!cfg || typeof cfg !== 'object') {
        throw new TypeError('[VSRP-001:armory_core] configure() requires a non-null configuration dictionary.');
      }
      hostConfig = deepFreeze({ ...cfg });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
        throw new Error('[VSRP-001:armory_core] Capability Error: Missing eventBus.publish handle.');
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
        party: incoming.party ? incoming.party : [],
        inventory: incoming.inventory ? incoming.inventory : {},
        deltas: {
          partyEquipDelta: [],
          inventoryDelta: {},
        },
      };

      sim.party.forEach((c) => {
        if (!c.equipment) {
          c.equipment = { weapon: null, armor: null, accessory: null };
        }
      });

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
      if (renderer && typeof renderer.renderArmory === 'function') {
        renderer.renderArmory(this.getState(), (action) => this.handleHostAction(action));
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

    getDiagnostics() {
      if (lifecycleState === State.DESTROYED) {
        throw new Error('[VSRP-001:armory_core] Cannot read diagnostics on a DESTROYED instance.');
      }
      return {
        moduleId: 'armory_core',
        lifecycleState,
        selectedChar: sim?.party?.[sim?.selectedCharIndex]?.id || null,
        selectedSlot: sim?.selectedSlot || null,
        pendingEquipDeltas: sim?.deltas?.partyEquipDelta?.length || 0,
      };
    },

    getModuleInfo() {
      return {
        moduleId: 'armory_core',
        version: '1.0.0',
        protocolVersion: 'VSRP-001',
        dependencies: ['manifest'],
        capabilities: [
          'armory',
          'events.armory_item_equipped',
          'events.armory_item_unequipped',
          'events.armory_sfx',
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

      if (type === 'EQUIP') {
        equipItem(action.characterId, action.slot, action.itemId);
      } else if (type === 'UNEQUIP') {
        unequipItem(action.characterId, action.slot);
      } else if (type === 'SELECT_CHAR') {
        sim.selectedCharIndex = action.index || 0;
      } else if (type === 'SELECT_SLOT') {
        sim.selectedSlot = action.slot || 'weapon';
      } else if (type === 'EXIT') {
        finalizeArmory();
      }
    },
  };

  return api;
})();

if (typeof window !== 'undefined') {
  window.EmberlightArmory = EmberlightArmory;
}