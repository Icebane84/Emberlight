/* =========================================================================
   EMBERLIGHT SESSION STORE (HOST SSOT & TRANSACTIONAL MUTATOR)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-SESSION-STORE
   Protocol Version:    VSRP-001
   Classification:      Host Single Source of Truth (SSOT) Store
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightSessionStore = (() => {
  'use strict';

  // --- Authoritative Ephemeral Session State ---
  let canonicalParty = [];
  let canonicalGold = 100;
  let canonicalInventory = { POTION: 3, ETHER: 1 };
  let canonicalWorldPos = { x: 1, y: 1 };
  let canonicalFlags = {};
  let canonicalQuests = {};
  let canonicalDungeonFloor = null;
  let canonicalDungeonDepth = 0; // 0 = Surface Overworld
  let canonicalSurfaceMap = null;
  let canonicalSurfaceMutations = {}; // Sparse dictionary: { "x,y": tile }
  let canonicalTownMutations = {}; // Sparse dictionary: { townId: { "x,y": tile } }
  let canonicalDungeonSpec = null; // Sparse descriptor: { seed, depth, width, height, mutations: { "x,y": tile } }
  let canonicalTownId = null; // null = Macro Wilderness, 'OAKHAVEN' = Inside town
  let canonicalMacroPos = { x: 1, y: 1 }; // Cached wilderness coords before town entry
  let canonicalStepCounter = 0;
  let lastInteractedChestPos = null;

  // --- Sparse World Mutation Helpers ---
  function recordDungeonMutation(key, x, y, newTile) {
    if (!canonicalDungeonSpec) {
      canonicalDungeonSpec = {
        seed: 123456,
        depth: canonicalDungeonDepth,
        width: 12,
        height: 10,
        mutations: {},
      };
    }
    if (!canonicalDungeonSpec.mutations) canonicalDungeonSpec.mutations = {};
    canonicalDungeonSpec.mutations[key] = newTile;
    if (canonicalDungeonFloor?.[y]) {
      canonicalDungeonFloor[y][x] = newTile;
    }
  }

  function recordTownMutation(key, newTile) {
    if (!canonicalTownMutations) canonicalTownMutations = {};
    if (!canonicalTownMutations[canonicalTownId]) canonicalTownMutations[canonicalTownId] = {};
    canonicalTownMutations[canonicalTownId][key] = newTile;
  }

  function recordSurfaceMutation(key, x, y, newTile) {
    if (!canonicalSurfaceMutations) canonicalSurfaceMutations = {};
    canonicalSurfaceMutations[key] = newTile;
    if (canonicalSurfaceMap?.[y]) {
      canonicalSurfaceMap[y][x] = newTile;
    }
  }

  function recordTileMutation(x, y, newTile) {
    const key = `${x},${y}`;
    if (canonicalDungeonDepth > 0) {
      recordDungeonMutation(key, x, y, newTile);
    } else if (canonicalTownId) {
      recordTownMutation(key, newTile);
    } else {
      recordSurfaceMutation(key, x, y, newTile);
    }
  }

  // --- Canonical Party Integrity & Anti-Contamination Sanitizer ---
  function sanitizeCanonicalParty() {
    const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
    const phenotypes = manifest.Phenotypes || {};
    const templates = [
      { id: 'hero', name: 'Aldric', phenotype: 'HERO', weapon: 'IRON_SWORD', armor: 'CLOTH_TUNIC' },
      { id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', weapon: 'IRON_SWORD', armor: 'CHAINMAIL' },
      { id: 'mage', name: 'Selene', phenotype: 'MAGE', weapon: 'OAK_STAFF', armor: 'MAGE_ROBE' },
      { id: 'healer', name: 'Wren', phenotype: 'HEALER', weapon: 'OAK_STAFF', armor: 'MAGE_ROBE' },
    ];

    if (Array.isArray(canonicalParty)) {
      canonicalParty.forEach((c) => {
        if (c) {
          if (c.name === 'AuditHero' || c.name === 'test_hero') c.name = 'Aldric';
          if (c.id === 'test_hero') c.id = 'hero';
        }
      });
    }

    if (typeof EmberlightProgression !== 'undefined' && typeof EmberlightProgression.getState === 'function') {
      try {
        const progState = EmberlightProgression.getState();
        if (Array.isArray(progState?.party)) {
          progState.party.forEach((c) => {
            if (c) {
              if (c.name === 'AuditHero' || c.name === 'test_hero') c.name = 'Aldric';
              if (c.id === 'test_hero') c.id = 'hero';
            }
          });
        }
      } catch (_) {
        // Progression tenant is in UNCONFIGURED/uninitialized state, skip progression sync
      }
    }

    const isCorrupt =
      !Array.isArray(canonicalParty) ||
      canonicalParty.length < 4 ||
      canonicalParty.some(
        (c) => !c?.name || c.level === undefined || !c.phenotype || c.phenotype === 'undefined'
      );

    if (isCorrupt) {
      const existingMap = new Map();
      if (Array.isArray(canonicalParty)) {
        canonicalParty.forEach((c) => {
          if (c && (c.id || c.name)) {
            if (c.name === 'AuditHero') c.name = 'Aldric';
            if (c.id === 'test_hero') c.id = 'hero';
            if (c.id) existingMap.set(c.id, c);
            if (c.name) existingMap.set(c.name, c);
            if (c.phenotype && c.phenotype !== 'undefined') {
              existingMap.set(c.phenotype.toUpperCase(), c);
            }
          }
        });
      }

      canonicalParty = templates.map((tmpl) => {
        const existing =
          existingMap.get(tmpl.id) || existingMap.get(tmpl.name) || existingMap.get(tmpl.phenotype);
        const pKey = (
          existing?.phenotype && existing.phenotype !== 'undefined'
            ? existing.phenotype
            : tmpl.phenotype
        ).toUpperCase();
        const pheno = phenotypes[pKey] || {};
        const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };

        if (existing?.level !== undefined && !Number.isNaN(existing.level)) {
          return {
            ...existing,
            id: existing.id || tmpl.id,
            name: existing.name || tmpl.name,
            phenotype: pKey,
            level: existing.level || 1,
            exp: existing.exp || 0,
            skillPoints: existing.skillPoints ?? existing.unspentSP ?? 1,
            unspentSP: existing.unspentSP ?? existing.skillPoints ?? 1,
            unlocked: Array.isArray(existing.unlocked) ? existing.unlocked : [],
            unlockedNodes: Array.isArray(existing.unlockedNodes) ? existing.unlockedNodes : [],
            spent: existing.spent || {},
            equipment: existing.equipment || { weapon: tmpl.weapon, armor: tmpl.armor, accessory: null },
            ailments: Array.isArray(existing.ailments) ? existing.ailments : [],
            alive: existing.alive !== false && (existing.hp === undefined || existing.hp > 0),
            hp: existing.hp !== undefined && existing.hp > 0 ? existing.hp : base.hp,
            maxHp: existing.maxHp || base.hp,
            mp: existing.mp !== undefined && existing.mp >= 0 ? existing.mp : base.mp,
            maxMp: existing.maxMp || base.mp,
            atk: existing.atk || base.atk,
            def: existing.def || base.def,
            agi: existing.agi || base.agi,
          };
        }

        return {
          id: tmpl.id,
          name: tmpl.name,
          phenotype: pKey,
          level: 1,
          exp: 0,
          skillPoints: 1,
          unspentSP: 1,
          unlocked: [],
          unlockedNodes: [],
          spent: {},
          equipment: { weapon: tmpl.weapon, armor: tmpl.armor, accessory: null },
          ailments: [],
          alive: true,
          hp: base.hp,
          maxHp: base.hp,
          mp: base.mp,
          maxMp: base.mp,
          atk: base.atk,
          def: base.def,
          agi: base.agi,
        };
      });
    }
  }

  function startNewGame() {
    const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
    const phenotypes = manifest.Phenotypes || {};

    const rosterTemplates = [
      { id: 'hero', name: 'Aldric', phenotype: 'HERO', weapon: 'IRON_SWORD', armor: 'CLOTH_TUNIC' },
      { id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', weapon: 'IRON_SWORD', armor: 'CHAINMAIL' },
      { id: 'mage', name: 'Selene', phenotype: 'MAGE', weapon: 'OAK_STAFF', armor: 'MAGE_ROBE' },
      { id: 'healer', name: 'Wren', phenotype: 'HEALER', weapon: 'OAK_STAFF', armor: 'MAGE_ROBE' },
    ];

    canonicalParty = rosterTemplates.map((template) => {
      const pKey = template.phenotype.toUpperCase();
      const pheno = phenotypes[pKey] || {};
      const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };

      return {
        id: template.id,
        name: template.name,
        phenotype: pKey,
        level: 1,
        exp: 0,
        skillPoints: 1,
        unspentSP: 1,
        unlocked: [],
        unlockedNodes: [],
        spent: {},
        equipment: { weapon: template.weapon, armor: template.armor, accessory: null },
        ailments: [],
        alive: true,
        hp: base.hp,
        maxHp: base.hp,
        mp: base.mp,
        maxMp: base.mp,
        atk: base.atk,
        def: base.def,
        agi: base.agi,
      };
    });

    canonicalGold = 100;
    canonicalInventory = { POTION: 3, ETHER: 1 };
    canonicalWorldPos = { x: 1, y: 1 };
    canonicalFlags = {};
    canonicalQuests = {
      TALL_GRASS: { stage: 0, completed: false },
      SEALED_PASS: { stage: 0, completed: false },
      CINDER_CATACLYSM: { stage: 0, completed: false },
      CRUCIBLE_IRON: { stage: 0, completed: false },
      LIGHT_SANCTUARY: { stage: 0, completed: false },
    };
    canonicalDungeonFloor = null;
    canonicalDungeonDepth = 0;
    canonicalSurfaceMap = null;
    canonicalSurfaceMutations = {};
    canonicalTownMutations = {};
    canonicalDungeonSpec = null;
    canonicalTownId = null;
    canonicalMacroPos = { x: 1, y: 1 };
    canonicalStepCounter = 0;
    lastInteractedChestPos = null;

    if (typeof EmberlightSaveManager !== 'undefined') {
      StorageManager.save();
    }
  }

  // --- Persistence Gateway ---
  const StorageManager = {
    get CURRENT_VERSION() {
      return typeof EmberlightSaveManager !== 'undefined' ? EmberlightSaveManager.CURRENT_VERSION : '1.4.0';
    },

    get MIGRATIONS() {
      return typeof EmberlightSaveManager !== 'undefined' ? EmberlightSaveManager.MIGRATIONS : {};
    },

    migrate(payload) {
      if (typeof EmberlightSaveManager !== 'undefined') {
        return EmberlightSaveManager.migrate(payload);
      }
      return payload;
    },

    hasSave() {
      return typeof EmberlightSaveManager !== 'undefined' && EmberlightSaveManager.hasSave();
    },

    getSaveMetadata() {
      return typeof EmberlightSaveManager !== 'undefined' ? EmberlightSaveManager.getSaveMetadata() : null;
    },

    save(arg) {
      if (typeof EmberlightSaveManager === 'undefined') {
        return false;
      }
      let snapshot;
      let notifyFn = null;
      if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
        snapshot = arg;
      } else {
        if (typeof arg === 'function') notifyFn = arg;
        snapshot = {
          canonicalParty,
          canonicalGold,
          canonicalInventory,
          canonicalWorldPos,
          canonicalFlags,
          canonicalQuests,
          canonicalDungeonDepth,
          canonicalDungeonSpec,
          canonicalSurfaceMutations,
          canonicalTownMutations,
          canonicalTownId,
          canonicalMacroPos,
          canonicalStepCounter,
        };
      }
      const ok = EmberlightSaveManager.save(snapshot);
      if (ok && typeof notifyFn === 'function') {
        notifyFn('Game state saved to local storage.');
      }
      return ok;
    },

    load(notifyFn) {
      if (typeof EmberlightSaveManager === 'undefined') {
        console.warn('[StorageManager] Load failed: EmberlightSaveManager is undefined.');
        return false;
      }
      const payload = EmberlightSaveManager.load();
      if (!payload) return false;

      canonicalParty = payload.canonicalParty;
      sanitizeCanonicalParty();
      canonicalGold = typeof payload.canonicalGold === 'number' ? payload.canonicalGold : 100;
      canonicalInventory = payload.canonicalInventory || { POTION: 4, ETHER: 2, PHOENIX_EMBER: 1 };
      canonicalWorldPos = payload.canonicalWorldPos || { x: 1, y: 1 };
      canonicalFlags = payload.canonicalFlags || {};
      canonicalQuests = payload.canonicalQuests || {};
      canonicalDungeonDepth = typeof payload.canonicalDungeonDepth === 'number' ? payload.canonicalDungeonDepth : 0;
      canonicalDungeonSpec = payload.canonicalDungeonSpec || null;
      canonicalSurfaceMutations = payload.canonicalSurfaceMutations || {};
      canonicalTownMutations = payload.canonicalTownMutations || {};
      canonicalSurfaceMap = null; // Reconstituted on demand
      canonicalDungeonFloor = null; // Reconstituted on demand
      canonicalTownId = payload.canonicalTownId || null;
      canonicalMacroPos = payload.canonicalMacroPos || { x: 1, y: 1 };
      canonicalStepCounter = typeof payload.canonicalStepCounter === 'number' ? payload.canonicalStepCounter : 0;

      if (typeof notifyFn === 'function') {
        notifyFn(`Session restored (v${payload.version}).`);
      }
      return true;
    },

    clear(notifyFn) {
      if (typeof EmberlightSaveManager !== 'undefined') {
        EmberlightSaveManager.clear();
      }
      if (typeof notifyFn === 'function') {
        notifyFn('Data cleared. Reloading...');
      }
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 400);
    },
  };

  const storeInstance = {
    getSnapshot() {
      return structuredClone({
        party: canonicalParty,
        gold: canonicalGold,
        inventory: canonicalInventory,
        worldPos: canonicalWorldPos,
        flags: canonicalFlags,
        quests: canonicalQuests,
        dungeonDepth: canonicalDungeonDepth,
        dungeonFloor: canonicalDungeonFloor,
        dungeonSpec: canonicalDungeonSpec,
        surfaceMap: canonicalSurfaceMap,
        surfaceMutations: canonicalSurfaceMutations,
        townMutations: canonicalTownMutations,
        townId: canonicalTownId,
        macroPos: canonicalMacroPos,
        stepCounter: canonicalStepCounter,
        lastInteractedChestPos,
      });
    },

    // Getters
    getParty: () => canonicalParty,
    getGold: () => canonicalGold,
    getInventory: () => canonicalInventory,
    getWorldPos: () => canonicalWorldPos,
    getFlags: () => canonicalFlags,
    getFlag: (key) => (canonicalFlags ? canonicalFlags[key] : undefined),
    getQuests: () => canonicalQuests,
    getDungeonDepth: () => canonicalDungeonDepth,
    getDungeonFloor: () => canonicalDungeonFloor,
    getDungeonSpec: () => canonicalDungeonSpec,
    getSurfaceMap: () => canonicalSurfaceMap,
    getSurfaceMutations: () => canonicalSurfaceMutations,
    getTownMutations: () => canonicalTownMutations,
    getTownId: () => canonicalTownId,
    getMacroPos: () => canonicalMacroPos,
    getStepCounter: () => canonicalStepCounter,
    getLastInteractedChestPos: () => lastInteractedChestPos,

    // Setters & Transactional Mutators
    setParty(party) {
      if (Array.isArray(party)) {
        canonicalParty = party;
        sanitizeCanonicalParty();
      }
    },
    setGold(gold) {
      if (typeof gold === 'number') canonicalGold = Math.max(0, gold);
    },
    modifyGold(delta) {
      canonicalGold = Math.max(0, canonicalGold + delta);
      return canonicalGold;
    },
    setInventory(inv) {
      if (inv && typeof inv === 'object') canonicalInventory = inv;
    },
    modifyItem(itemId, delta) {
      canonicalInventory[itemId] = Math.max(0, (canonicalInventory[itemId] || 0) + delta);
      return canonicalInventory[itemId];
    },
    setWorldPos(pos) {
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        canonicalWorldPos = { x: pos.x, y: pos.y };
      }
    },
    setFlags(flags) {
      if (flags && typeof flags === 'object') canonicalFlags = { ...canonicalFlags, ...flags };
    },
    setFlag(key, val) {
      canonicalFlags[key] = val;
    },
    setQuests(quests) {
      if (quests && typeof quests === 'object') canonicalQuests = { ...canonicalQuests, ...quests };
    },
    setQuest(key, val) {
      canonicalQuests[key] = val;
    },
    setDungeonDepth(depth) {
      canonicalDungeonDepth = depth;
    },
    setDungeonFloor(floor) {
      canonicalDungeonFloor = floor;
    },
    setDungeonSpec(spec) {
      canonicalDungeonSpec = spec;
    },
    setSurfaceMap(map) {
      canonicalSurfaceMap = map;
    },
    setTownId(townId) {
      canonicalTownId = townId;
    },
    setMacroPos(pos) {
      if (pos) canonicalMacroPos = { ...pos };
    },
    setStepCounter(cnt) {
      canonicalStepCounter = cnt;
    },
    incrementStepCounter() {
      canonicalStepCounter++;
      return canonicalStepCounter;
    },
    setLastInteractedChestPos(pos) {
      lastInteractedChestPos = pos ? { ...pos } : null;
    },

    // Mutations
    recordTileMutation,
    recordDungeonMutation,
    recordTownMutation,
    recordSurfaceMutation,
    sanitizeCanonicalParty,
    startNewGame,

    commit(reason) {
      return StorageManager.save();
    },

    // Persistence Delegation
    StorageManager,
  };

  sanitizeCanonicalParty();

  return storeInstance;
})();

if (typeof window !== 'undefined') {
  window.EmberlightSessionStore = EmberlightSessionStore;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightSessionStore;
}
