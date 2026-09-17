/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN TEST SUITE: MULTI-SLOT PERSISTENCE & ARCHIVES
 * Document Identifier: TEST-SAVE-SLOTS-001
 * Governing Protocol:  VSRP-001 / Faraday Cage Isolation
 * ============================================================================
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

console.log('=== TEST SUITE: MULTI-SLOT PERSISTENCE & ARCHIVES ===');

// Mock DOM / Browser Environment
class MockStorage {
	constructor() {
		this.store = {};
	}
	getItem(k) {
		return Object.hasOwn(this.store, k) ? this.store[ k ] : null;
	}
	setItem(k, v) {
		this.store[ k ] = String(v);
	}
	removeItem(k) {
		delete this.store[ k ];
	}
	clear() {
		this.store = {};
	}
}

const mockLocalStorage = new MockStorage();
const sandbox = {
	window: {},
	document: {
		getElementById: () => null,
		querySelectorAll: () => [],
		createElement: () => ({ classList: { add: () => { }, remove: () => { } }, style: {} }),
	},
	localStorage: mockLocalStorage,
	console: console,
	setTimeout: setTimeout,
	clearTimeout: clearTimeout,
	Math: Math,
	Date: Date,
	addEventListener: () => { },
	removeEventListener: () => { },
	structuredClone: typeof structuredClone !== 'undefined' ? structuredClone : (x) => structuredClone(x),
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);

// Load SSOT modules in dependency order
const baseDir = path.resolve(__dirname, '..');
const loadOrder = [
	'manifest/manifest_config.js',
	'manifest/manifest_actors.js',
	'manifest/manifest_items.js',
	'manifest/manifest_progression.js',
	'manifest/manifest_world.js',
	'manifest/manifest_narrative.js',
	'manifest/manifest_calculators.js',
	'manifest.js',
	'prng.js',
	'save_manager.js',
	'session_store.js',
	'event_bus.js',
	'acoustic_sfx.js',
	'district_router.js',
	'runtime/runtime_state.js',
	'runtime/runtime_presentation.js',
	'runtime/runtime_interactions.js',
	'runtime/runtime_navigation.js',
	'runtime/runtime_stepper.js',
	'runtime/runtime_events.js',
	'runtime.js'
];

loadOrder.forEach((file) => {
	const filePath = path.join(baseDir, file);
	const code = fs.readFileSync(filePath, 'utf8');
	const script = new vm.Script(code, { filename: file }); // NOSONAR: Headless VM sandbox loading for sovereign test execution
	script.runInContext(context);
});

const saveMgr = context.window.EmberlightSaveManager;
const sessionStore = context.window.EmberlightSessionStore;
const runtime = context.window.GameRuntime;

assert.ok(saveMgr, 'EmberlightSaveManager must be exported');
assert.ok(sessionStore, 'EmberlightSessionStore must be exported');
assert.ok(runtime, 'GameRuntime must be exported');

// Test 1: Initial Empty Slot Listing
console.log('\n--- Test 1: Initial Empty Slot Listing ---');
mockLocalStorage.clear();
const initialSlots = saveMgr.listSlots();
assert.strictEqual(initialSlots.length, 4, 'Must report exactly 4 slots');
const slotIds = initialSlots.map(s => String(s.id));
assert.strictEqual(slotIds[ 0 ], 'SLOT_1');
assert.strictEqual(slotIds[ 1 ], 'SLOT_2');
assert.strictEqual(slotIds[ 2 ], 'SLOT_3');
assert.strictEqual(slotIds[ 3 ], 'AUTO_SAVE');
assert.ok(initialSlots.every(s => s.exists === false), 'All slots must initially be empty');
assert.strictEqual(saveMgr.hasSave(), false, 'hasSave() must be false when empty');
assert.strictEqual(saveMgr.getMostRecentSlotId(), 'SLOT_1', 'Default most recent slot is SLOT_1');
console.log('[PASS] Test 1: Empty slot catalog verified');

// Test 2: Multi-Slot Isolation & Discrete Persistence
console.log('\n--- Test 2: Multi-Slot Isolation & Discrete Persistence ---');

// Slot 1: Gold 100, Wilderness
const snap1 = {
	canonicalParty: [ { id: 'hero', name: 'Aldric', phenotype: 'HERO', level: 1, hp: 30, maxHp: 30, mp: 10, maxMp: 10, alive: true } ],
	canonicalGold: 150,
	canonicalInventory: { POTION: 2 },
	canonicalWorldPos: { x: 5, y: 5 },
	canonicalTownId: null,
	canonicalDungeonDepth: 0
};
assert.strictEqual(saveMgr.save(snap1, 'SLOT_1'), true, 'Save to SLOT_1 must succeed');

// Slot 2: Gold 500, Oakhaven Hamlet
const snap2 = {
	canonicalParty: [
		{ id: 'hero', name: 'Aldric', phenotype: 'HERO', level: 3, hp: 45, maxHp: 45, mp: 15, maxMp: 15, alive: true },
		{ id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', level: 3, hp: 60, maxHp: 60, mp: 8, maxMp: 8, alive: true }
	],
	canonicalGold: 500,
	canonicalInventory: { POTION: 5, ETHER: 2 },
	canonicalWorldPos: { x: 3, y: 7 },
	canonicalTownId: 'OAKHAVEN',
	canonicalDungeonDepth: 0
};
assert.strictEqual(saveMgr.save(snap2, 'SLOT_2'), true, 'Save to SLOT_2 must succeed');

// Slot 3: Gold 1200, Catacombs Floor 2
const snap3 = {
	canonicalParty: [
		{ id: 'hero', name: 'Aldric', phenotype: 'HERO', level: 6, hp: 65, maxHp: 65, mp: 25, maxMp: 25, alive: true },
		{ id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', level: 6, hp: 90, maxHp: 90, mp: 12, maxMp: 12, alive: true },
		{ id: 'mage', name: 'Selene', phenotype: 'MAGE', level: 6, hp: 40, maxHp: 40, mp: 45, maxMp: 45, alive: true }
	],
	canonicalGold: 1200,
	canonicalInventory: { POTION: 8, ETHER: 4, PHOENIX_EMBER: 1 },
	canonicalWorldPos: { x: 8, y: 2 },
	canonicalTownId: null,
	canonicalDungeonDepth: 2
};
assert.strictEqual(saveMgr.save(snap3, 'SLOT_3'), true, 'Save to SLOT_3 must succeed');

// Verify Slots State
const catalog = saveMgr.listSlots();
const s1 = catalog.find(s => s.id === 'SLOT_1');
const s2 = catalog.find(s => s.id === 'SLOT_2');
const s3 = catalog.find(s => s.id === 'SLOT_3');
const auto = catalog.find(s => s.id === 'AUTO_SAVE');

assert.strictEqual(s1.exists, true);
assert.strictEqual(s1.gold, 150);
assert.strictEqual(s1.locationName, '🌲 The Ashen Wilds');

assert.strictEqual(s2.exists, true);
assert.strictEqual(s2.gold, 500);
assert.strictEqual(s2.locationName, '🏰 Oakhaven Hamlet');
assert.strictEqual(s2.party.length, 2);

assert.strictEqual(s3.exists, true);
assert.strictEqual(s3.gold, 1200);
assert.strictEqual(s3.locationName, '⛩️ Catacombs (Floor 2)');
assert.strictEqual(s3.party.length, 3);

assert.strictEqual(auto.exists, false);

console.log('[PASS] Test 2: Multi-slot data isolation verified');

// Test 3: Load Rehydration per Slot
console.log('\n--- Test 3: Load Rehydration per Slot ---');
const loadedS2 = saveMgr.load('SLOT_2');
assert.ok(loadedS2, 'Loaded SLOT_2 payload must be non-null');
assert.strictEqual(loadedS2.canonicalGold, 500);
assert.strictEqual(loadedS2.canonicalTownId, 'OAKHAVEN');
assert.strictEqual(loadedS2.canonicalParty.length, 4); // Autocompletes 4-party roster

const loadedS3 = saveMgr.load('SLOT_3');
assert.ok(loadedS3, 'Loaded SLOT_3 payload must be non-null');
assert.strictEqual(loadedS3.canonicalGold, 1200);
assert.strictEqual(loadedS3.canonicalDungeonDepth, 2);
assert.strictEqual(loadedS3.canonicalParty.length, 4);
console.log('[PASS] Test 3: Accurate slot rehydration verified');

// Test 4: Most Recent Slot Detection
console.log('\n--- Test 4: Most Recent Slot Detection ---');
assert.strictEqual(saveMgr.getMostRecentSlotId(), 'SLOT_3', 'Latest saved slot must be detected as SLOT_3');
console.log('[PASS] Test 4: Most recent slot detection verified');

// Test 5: Slot Deletion
console.log('\n--- Test 5: Slot Deletion ---');
assert.strictEqual(saveMgr.deleteSlot('SLOT_2'), true, 'Deleting SLOT_2 must return true');
assert.strictEqual(saveMgr.hasSave('SLOT_2'), false, 'SLOT_2 must no longer exist');
assert.strictEqual(saveMgr.hasSave('SLOT_1'), true, 'SLOT_1 must still exist');
assert.strictEqual(saveMgr.hasSave('SLOT_3'), true, 'SLOT_3 must still exist');
console.log('[PASS] Test 5: Slot deletion verified');

// Test 6: Legacy Migration from EMBERLIGHT_SAVE_V1
console.log('\n--- Test 6: Legacy Migration from EMBERLIGHT_SAVE_V1 ---');
saveMgr.clear();
mockLocalStorage.clear();
const legacyData = {
	version: '1.0.0',
	timestamp: '2026-01-01T00:00:00.000Z',
	party: [ { id: 'hero', name: 'LegacyHero', phenotype: 'HERO', level: 5, hp: 50, maxHp: 50, mp: 20, maxMp: 20, alive: true } ],
	gold: 777,
	inventory: { POTION: 3 },
	worldPos: { x: 2, y: 4 },
	flags: { tutorialDone: true }
};
mockLocalStorage.setItem('EMBERLIGHT_SAVE_V1', JSON.stringify(legacyData));

// Querying slots should auto-migrate legacy data into SLOT_1
assert.strictEqual(saveMgr.hasSave('SLOT_1'), true, 'Legacy save should be migrated to SLOT_1');
const migratedMeta = saveMgr.getSaveMetadata('SLOT_1');
assert.strictEqual(migratedMeta.gold, 777, 'Migrated gold must equal legacy gold');
assert.strictEqual(migratedMeta.version, '1.4.0', 'Migrated version must be upgraded to 1.4.0');
console.log('[PASS] Test 6: Legacy migration from EMBERLIGHT_SAVE_V1 verified');

// Test 7: SessionStore & Runtime Active Slot Integration
console.log('\n--- Test 7: SessionStore & Runtime Active Slot Integration ---');
sessionStore.StorageManager.setActiveSlotId('SLOT_3');
assert.strictEqual(sessionStore.StorageManager.getActiveSlotId(), 'SLOT_3');

sessionStore.setGold(999);
sessionStore.StorageManager.save(); // Should save to active slot (SLOT_3)

const s3Meta = saveMgr.getSaveMetadata('SLOT_3');
assert.strictEqual(s3Meta.gold, 999, 'Active slot persistence must save to SLOT_3');
console.log('[PASS] Test 7: SessionStore active slot coordination verified');

console.log('\n=== ALL MULTI-SLOT PERSISTENCE TESTS PASSED (100%) ===\n');
