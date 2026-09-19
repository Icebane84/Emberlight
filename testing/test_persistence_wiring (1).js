const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '..');

// SSOT: canonical topological load order — edit testing/load_order.js, not here.
const scripts = require('./load_order.js');

function createMockElement(id = '', tag = 'div') {
  const el = {
    id,
    tagName: tag.toUpperCase(),
    getContext: () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {},
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      clip: () => {},
      arc: () => {},
      ellipse: () => {},
      rect: () => {},
      roundRect: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      measureText: () => ({ width: 10 }),
    }),
    width: 480,
    height: 260,
    toDataURL: () => 'data:image/png;base64,mock',
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      toggle: function(c, force) { if (force !== undefined) { force ? this._classes.add(c) : this._classes.delete(c); } else { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); } },
      contains: function(c) { return this._classes.has(c); }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    innerHTML: '',
    textContent: '',
    children: [],
    querySelector: (sel) => createMockElement(),
    querySelectorAll: (sel) => [createMockElement()],
    appendChild: function(child) { this.children.push(child); return child; },
    setAttribute: () => {},
    getAttribute: () => null,
    dataset: {},
  };
  return el;
}

const mockStorageMap = new Map();
const mockLocalStorage = {
  getItem: (k) => mockStorageMap.get(k) || null,
  setItem: (k, v) => mockStorageMap.set(k, String(v)),
  removeItem: (k) => mockStorageMap.delete(k),
  clear: () => mockStorageMap.clear(),
};

const mockDom = {
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement('', tag),
    querySelector: (sel) => createMockElement(),
    querySelectorAll: (sel) => [createMockElement()],
    createDocumentFragment: () => createMockElement('', 'fragment'),
    body: createMockElement('body', 'body'),
  },
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: mockLocalStorage,
  console: console,
  Math: Math,
  JSON: JSON,
  Date: Date,
  Float32Array: Float32Array,
  Uint32Array: Uint32Array,
  Uint8Array: Uint8Array,
  Uint8ClampedArray: Uint8ClampedArray,
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : function() { return { encode: (s) => Buffer.from(s) }; },
  structuredClone: typeof structuredClone !== 'undefined' ? structuredClone : (x) => JSON.parse(JSON.stringify(x)),
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame: (cb) => { return setTimeout(cb, 16); },
  cancelAnimationFrame: (id) => { clearTimeout(id); },
};

mockDom.window = Object.assign(mockDom.window, mockDom);
const context = vm.createContext(mockDom);

scripts.forEach((file) => {
  const code = fs.readFileSync(path.join(baseDir, file), 'utf8');
  vm.runInContext(code, context);
});

const runtime = context.window.GameRuntime;
const saveMgr = context.window.EmberlightSaveManager;

console.log('=== TEST SUITE: PERSISTENCE & WIRING INTEGRITY ===');

// Test 1: Global Exposure & Dual Binding
assert.ok(saveMgr, 'EmberlightSaveManager must be defined on window');
assert.strictEqual(context.window.StorageManager, saveMgr, 'window.StorageManager must alias window.EmberlightSaveManager');
assert.strictEqual(runtime.StorageManager.CURRENT_VERSION, '1.4.0', 'Runtime bridge version must report 1.4.0');
console.log('[PASS] Test 1: Dual binding and version reporting verified');

// Test 2: Initial empty state
assert.strictEqual(runtime.StorageManager.hasSave(), false, 'Should report no save initially');
assert.strictEqual(runtime.StorageManager.getSaveMetadata(), null, 'Metadata should be null when no save exists');
console.log('[PASS] Test 2: Initial empty state verified');

// Test 3: Save execution through Runtime Bridge
const saveResult = runtime.StorageManager.save();
assert.strictEqual(saveResult, true, 'StorageManager.save() must return true');
assert.strictEqual(runtime.StorageManager.hasSave(), true, 'hasSave() must report true after save');
const meta = runtime.StorageManager.getSaveMetadata();
assert.ok(meta, 'Metadata must exist after save');
assert.strictEqual(meta.version, '1.4.0', 'Saved version must match CURRENT_VERSION');
assert.strictEqual(meta.gold, 100, 'Starting gold should be present in metadata');
console.log('[PASS] Test 3: Runtime save snapshot and metadata extraction verified');

// Test 4: Custom state snapshot save & load roundtrip
const customSnapshot = {
  canonicalParty: [
    { id: 'hero', name: 'Aldric', phenotype: 'HERO', level: 10, exp: 500, hp: 80, maxHp: 80, mp: 25, maxMp: 25, atk: 22, def: 14, agi: 12, alive: true, unlocked: ['node_1'], equipment: { weapon: 'FLAME_BLADE', armor: 'MITHRIL_MAIL' }, ailments: [] },
    { id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', level: 10, exp: 500, hp: 120, maxHp: 120, mp: 10, maxMp: 10, atk: 28, def: 20, agi: 8, alive: true, unlocked: [], equipment: { weapon: 'WAR_HAMMER', armor: 'PLATE_ARMOR' }, ailments: [] },
    { id: 'mage', name: 'Selene', phenotype: 'MAGE', level: 10, exp: 500, hp: 55, maxHp: 55, mp: 60, maxMp: 60, atk: 12, def: 8, agi: 16, alive: true, unlocked: ['node_fire'], equipment: { weapon: 'EMBER_ROD', armor: 'SILK_ROBE' }, ailments: [] },
    { id: 'healer', name: 'Wren', phenotype: 'HEALER', level: 10, exp: 500, hp: 65, maxHp: 65, mp: 50, maxMp: 50, atk: 14, def: 10, agi: 14, alive: true, unlocked: ['node_heal'], equipment: { weapon: 'HOLY_MACE', armor: 'SILK_ROBE' }, ailments: [] },
  ],
  canonicalGold: 2450,
  canonicalInventory: { POTION: 8, ETHER: 5, PHOENIX_EMBER: 3 },
  canonicalWorldPos: { x: 7, y: 9 },
  canonicalFlags: { boss_slain: true, forest_cleared: true },
  canonicalQuests: { MAIN_QUEST: { stage: 4, completed: false } },
  canonicalDungeonDepth: 2,
  canonicalDungeonSpec: { seed: 887766, depth: 2, width: 12, height: 10, mutations: { '2,3': '.' } },
  canonicalSurfaceMutations: { '7,9': '.' },
  canonicalTownMutations: { SUNKEN_VILLAGE: { '1,2': 'C' } },
  canonicalTownId: 'SUNKEN_VILLAGE',
  canonicalMacroPos: { x: 3, y: 2 },
  canonicalStepCounter: 180,
};

const customSaveOk = saveMgr.save(customSnapshot);
assert.strictEqual(customSaveOk, true, 'Direct save must succeed');

const loadedState = saveMgr.load();
assert.ok(loadedState, 'Loaded state must not be null');
assert.strictEqual(loadedState.canonicalGold, 2450, 'Gold must match 2450');
assert.strictEqual(loadedState.canonicalParty.length, 4, 'Party must have 4 heroes');
assert.strictEqual(loadedState.canonicalParty[0].level, 10, 'Aldric must be level 10');
assert.strictEqual(loadedState.canonicalParty[0].equipment.weapon, 'FLAME_BLADE', 'Equipped weapon preserved');
assert.strictEqual(loadedState.canonicalDungeonSpec.seed, 887766, 'Dungeon seed preserved');
assert.strictEqual(loadedState.canonicalSurfaceMutations['7,9'], '.', 'Surface mutation preserved');
assert.strictEqual(loadedState.canonicalTownMutations.SUNKEN_VILLAGE['1,2'], 'C', 'Town mutation preserved');
console.log('[PASS] Test 4: Custom state snapshot serialization & rehydration verified');

// Test 5: Multi-version Migration Cascade (1.0.0 -> 1.4.0)
const legacyV1Payload = {
  version: '1.0.0',
  canonicalParty: [
    { name: 'Aldric', class: 'hero', level: 2 }
  ],
  canonicalGold: 50,
  canonicalSurfaceMap: [
    ['#', '#', '#'],
    ['#', '.', '#'],
    ['#', '#', '#']
  ]
};

const migratedPayload = saveMgr.migrate(legacyV1Payload);
assert.strictEqual(migratedPayload.version, '1.4.0', 'Migration must reach 1.4.0');
assert.ok(migratedPayload.canonicalFlags, 'canonicalFlags must be created');
assert.ok(migratedPayload.canonicalQuests, 'canonicalQuests must be created');
assert.ok(migratedPayload.canonicalInventory, 'canonicalInventory must be created');
assert.ok(migratedPayload.canonicalSurfaceMutations, 'canonicalSurfaceMutations must be created');
assert.strictEqual(migratedPayload.canonicalSurfaceMap, undefined, 'Raw 2D map must be stripped');
console.log('[PASS] Test 5: Full schema migration cascade (1.0.0 -> 1.4.0) verified');

// Test 6: In-Memory Storage Fallback under Storage Fault
const throwingStorage = {
  getItem: () => { throw new Error('SecurityError: Access denied'); },
  setItem: () => { throw new Error('QuotaExceededError'); },
  removeItem: () => { throw new Error('SecurityError'); }
};
context.window.localStorage = throwingStorage;

const fallbackSaveOk = saveMgr.save({
  canonicalParty: [{ id: 'hero', name: 'Aldric', phenotype: 'HERO', level: 1, hp: 30, maxHp: 30, alive: true }],
  canonicalGold: 777
});
assert.strictEqual(fallbackSaveOk, true, 'Save must succeed using in-memory store even if localStorage throws');

const fallbackLoaded = saveMgr.load();
assert.ok(fallbackLoaded, 'Load from in-memory fallback must succeed');
assert.strictEqual(fallbackLoaded.canonicalGold, 777, 'In-memory gold must match 777');
console.log('[PASS] Test 6: In-memory storage resilience and fallback verified');

// Test 7: StorageManager.clear()
saveMgr.clear();
assert.strictEqual(saveMgr.hasSave(), false, 'hasSave() must report false after clear');
console.log('[PASS] Test 7: StorageManager.clear() verified');

console.log('=== ALL PERSISTENCE WIRING & REFACTORING TESTS PASSED (100%) ===');
process.exit(0);
