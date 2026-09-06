/* =========================================================================
   DISTRICT 6: COMMERCE DISTRICT (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-MARKET-CORE
   Protocol Version:    VSRP-001
   Classification:      Ephemeral Simulation Tenant
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightMarket = (() => {
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
  let hostConfig = null;
  let hostContext = null;
  let sim = null;

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:market_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
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
      hostContext.eventBus.publish('market:sfx', { sfx: sfxName });
    }
  }

  function createDefaultState() {
    return {
      shopId: null,
      party: [],
      inventory: {},
      gold: 0,
      workingStock: {},
      currentTab: 'BUY',
      selectedItemId: null,
      deltas: {
        goldDelta: 0,
        inventoryDelta: {},
        partyEquipDelta: [],
      },
    };
  }

  function getItem(itemId) {
    const manifest = getActiveManifest();
    return manifest?.Items?.[itemId] || null;
  }

  function getShop(shopId) {
    const manifest = getActiveManifest();
    return manifest?.Shops?.[shopId] || null;
  }

  function buyItem(itemId) {
    const item = getItem(itemId);
    const shop = getShop(sim.shopId);
    if (!item || !shop) return false;

    const unitCost = Math.round(item.cost * (shop.buyRate || 1.0));
    if (sim.gold < unitCost) return false;

    if (sim.workingStock[itemId] !== undefined && sim.workingStock[itemId] <= 0) {
      return false;
    }

    sim.gold -= unitCost;
    sim.deltas.goldDelta -= unitCost;
    sim.inventory[itemId] = (sim.inventory[itemId] || 0) + 1;
    sim.deltas.inventoryDelta[itemId] = (sim.deltas.inventoryDelta[itemId] || 0) + 1;

    if (sim.workingStock[itemId] !== undefined) {
      sim.workingStock[itemId] -= 1;
    }

    dispatchSFX('SELECT');
    return true;
  }

  function sellItem(itemId) {
    const item = getItem(itemId);
    const shop = getShop(sim.shopId);
    if (!item || !shop) return false;
    if ((sim.inventory[itemId] || 0) <= 0) return false;

    const unitValue = Math.max(1, Math.round(item.cost * (shop.sellRate || 0.5)));

    sim.gold += unitValue;
    sim.deltas.goldDelta += unitValue;
    sim.inventory[itemId] -= 1;
    sim.deltas.inventoryDelta[itemId] = (sim.deltas.inventoryDelta[itemId] || 0) - 1;

    if (sim.inventory[itemId] <= 0) {
      delete sim.inventory[itemId];
    }

    if (sim.workingStock[itemId] !== undefined) {
      sim.workingStock[itemId] += 1;
    }

    dispatchSFX('SELECT');
    return true;
  }

  function finalizeMarket() {
    const payload = {
      goldDelta: sim.deltas.goldDelta,
      inventoryDelta: structuredClone(sim.deltas.inventoryDelta),
      partyEquipDelta: structuredClone(sim.deltas.partyEquipDelta),
    };
    if (hostContext?.eventBus?.publish) {
      hostContext.eventBus.publish('market:resolved', payload);
    }
  }

  // --- Stateless Inspection Calculus ---
  function computeItemDiff(character, item) {
    if (!item?.slot) return null;
    const manifest = getActiveManifest();
    const currentEquippedId = character.equipment?.[item.slot];
    const currentItem = currentEquippedId ? manifest.Items?.[currentEquippedId] : null;

    const currentDeltas = currentItem?.statDeltas || {};
    const newDeltas = item.statDeltas || {};

    const diff = {};
    const allStats = new Set([...Object.keys(currentDeltas), ...Object.keys(newDeltas)]);
    let totalPositive = 0;
    let totalNegative = 0;

    allStats.forEach((st) => {
      const delta = (newDeltas[st] || 0) - (currentDeltas[st] || 0);
      if (delta !== 0) {
        diff[st] = delta;
        if (delta > 0) totalPositive += delta;
        else totalNegative += Math.abs(delta);
      }
    });

    let rating = 'neutral';
    if (totalPositive > 0 && totalNegative === 0) rating = 'upgrade';
    else if (totalNegative > 0 && totalPositive === 0) rating = 'downgrade';
    else if (totalPositive > 0 && totalNegative > 0) rating = 'sidegrade';

    return { diff, rating, currentEquippedLabel: currentItem?.label || 'Empty' };
  }

  // --- Canonical 9-Method Interface Export ---
  return {
    configure(cfg) {
      assertLifecycle(State.UNCONFIGURED);
      if (!cfg || typeof cfg !== 'object') {
        throw new TypeError('[VSRP-001:market_core] configure() requires a non-null configuration dictionary.');
      }
      hostConfig = deepFreeze({ ...cfg });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
        throw new Error('[VSRP-001:market_core] Capability Error: Missing eventBus.publish handle.');
      }
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

    reset(snapshot = {}) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
      const incoming = snapshot || {};
      const shopId = incoming.shopId || 'VILLAGE_BLACKSMITH';
      const shop = getShop(shopId);

      const workingStock = {};
      if (shop?.stock) {
        shop.stock.forEach((entry) => {
          workingStock[entry.itemId] = entry.maxQuantity;
        });
      }

      sim = {
        shopId,
        gold: typeof incoming.gold === 'number' ? incoming.gold : 100,
        inventory: structuredClone(incoming.inventory || {}),
        party: structuredClone(incoming.party || []),
        workingStock,
        currentTab: 'BUY',
        selectedItemId: shop?.stock?.[0]?.itemId || null,
        deltas: {
          goldDelta: 0,
          inventoryDelta: {},
          stockDelta: {},
        },
        active: true,
      };

      lifecycleState = State.READY;
    },

    update(_dt, context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (!sim?.active) return;
      lifecycleState = State.RUNNING;

      const activeCtx = context || hostContext;
      if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
        for (const element of activeCtx.inputs) {
          this.handleHostAction(element);
        }
      }
    },

    render(renderer, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (renderer && typeof renderer.renderMarket === 'function') {
        renderer.renderMarket(this.getState(), (action) => this.handleHostAction(action));
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

    getDiagnostics() {
      if (lifecycleState === State.DESTROYED) {
        throw new Error('[VSRP-001:market_core] Cannot read diagnostics on a DESTROYED instance.');
      }
      return {
        moduleId: 'market_core',
        lifecycleState,
        activeShop: sim?.shopId || null,
        tab: sim?.currentTab || null,
        selectedItem: sim?.selectedItemId || null,
        pendingGoldDelta: sim?.deltas?.goldDelta || 0,
        pendingInventoryDeltas: Object.keys(sim?.deltas?.inventoryDelta || {}).length,
      };
    },

    getModuleInfo() {
      return {
        moduleId: 'market_core',
        version: '1.2.0',
        protocolVersion: 'VSRP-001',
        dependencies: ['manifest'],
        capabilities: [
          'commerce',
          'stock_tracking',
          'stat_diff_preview',
          'events.market_sfx',
          'events.market_resolved',
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
      if (type === 'BUY') {
        buyItem(action.itemId);
      } else if (type === 'SELL') {
        sellItem(action.itemId);
      } else if (type === 'SWITCH_TAB') {
        sim.currentTab = action.tab || 'BUY';
      } else if (type === 'SELECT_ITEM') {
        sim.selectedItemId = action.itemId;
      } else if (type === 'EXIT') {
        finalizeMarket();
      }
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightMarket = EmberlightMarket;
}