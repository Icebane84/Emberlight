const assert = require('assert');

// 1. Load Host & Systems
const EmberlightManifest = require('../manifest.js');
global.EmberlightManifest = EmberlightManifest;

const EmberlightPRNG = require('../prng.js');
global.EmberlightPRNG = EmberlightPRNG;

const EmberlightEventBus = require('../event_bus.js');
global.EmberlightEventBus = EmberlightEventBus;

const EmberlightSessionStore = require('../session_store.js');
global.EmberlightSessionStore = EmberlightSessionStore;

const EmberlightDistrictRouter = require('../district_router.js');
global.EmberlightDistrictRouter = EmberlightDistrictRouter;

const EmberlightCombat = require('../combat.js');
global.EmberlightCombat = EmberlightCombat;

const EmberlightCombatVFX = require('../combat_vfx.js');
global.EmberlightCombatVFX = EmberlightCombatVFX;

const GameRuntime = require('../runtime.js');
global.GameRuntime = GameRuntime;

// Initialize Runtime
GameRuntime.init();

// Start a fresh game
EmberlightSessionStore.startNewGame();
GameRuntime.switchDistrict('OVERWORLD');
assert.strictEqual(GameRuntime.getActiveDistrict(), 'OVERWORLD', 'Should be in OVERWORLD after switchDistrict');

let victoryEventFired = false;
let resolvedEventFired = false;

EmberlightEventBus.subscribe('combat:victory', () => {
  victoryEventFired = true;
});

EmberlightEventBus.subscribe('combat:resolved', (payload) => {
  resolvedEventFired = true;
  assert.strictEqual(payload.outcome, 'victory', 'Outcome should be victory');
});

// Trigger Combat
EmberlightEventBus.publish('overworld:encounter', { encounterKey: 'DEFAULT' });
assert.strictEqual(GameRuntime.getActiveDistrict(), 'COMBAT', 'Should switch to COMBAT');

// Attack the enemy until defeated
let matchResolved = false;
for (let turn = 0; turn < 80; turn++) {
  const state = EmberlightCombat.getState();
  if (state.phase === 'VICTORY' || state.phase === 'DEFEAT' || !state.enemies.some(e => e.alive)) {
    matchResolved = true;
    break;
  }
  if (state.phase === 'PLAYER_INPUT') {
    // Attack first living enemy
    const targetIdx = state.enemies.findIndex(e => e.alive);
    if (targetIdx !== -1) {
      EmberlightCombat.handleHostAction({ type: 'ATTACK', targetIndex: targetIdx });
    }
  }
  // Step simulation time
  EmberlightCombat.update(0.7, { inputs: [] });
}

assert.ok(matchResolved, 'Combat should resolve after attacks');
assert.ok(victoryEventFired, 'combat:victory event should have fired');

// Advance scheduled victory transition
EmberlightCombat.update(2.0, { inputs: [] });
assert.ok(resolvedEventFired, 'combat:resolved event should have fired');
assert.strictEqual(GameRuntime.getActiveDistrict(), 'OVERWORLD', 'Should transition back to OVERWORLD');

console.log('=== COMBAT VICTORY TRANSITION TEST PASSED 100% ===');
