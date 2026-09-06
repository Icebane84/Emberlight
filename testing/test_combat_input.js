const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert');

const baseDir = path.resolve(__dirname, '..');

const scripts = [
  'manifest.js',
  'prng.js',
  'session_store.js',
  'event_bus.js',
  'world_ecology.js',
  'district_router.js',
  'acoustic_sfx.js',
  'synth_soundtrack.js',
  'synthetic_voice.js',
  'input.js',
  'icons.js',
  'skill_icons.js',
  'party_icons.js',
  'sprite_baker.js',
  'combat_vfx.js',
  'dynamic_lights.js',
  'pseudo_3d_renderer.js',
  'shader_compositor.js',
  'battler_baker.js',
  'battle_backdrop.js',
  'threat_oracle.js',
  'cockpit_renderer.js',
  'combat_renderer.js',
  'map_renderer.js',
  'armory_renderer.js',
  'chronicle_renderer.js',
  'progression_renderer.js',
  'market_renderer.js',
  'status_renderer.js',
  'relic_forge_renderer.js',
  'progression.js',
  'combat.js',
  'script.js',
  'overworld.js',
  'armory.js',
  'market.js',
  'chronicle.js',
  'status.js',
  'auditor.js',
  'relic_forge.js',
  'dungeon_gen.js',
  'lockpick.js',
  'settings.js',
  'save_manager.js',
  'runtime.js',
];

function createMockElement(id = '', tag = 'div') {
  const listeners = {};
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
      add: function(...cls) {
        for (const c of cls) this._classes.add(c);
      },
      remove: function(...cls) {
        for (const c of cls) this._classes.delete(c);
      },
      toggle: function(c, force) {
        if (force !== undefined) {
          if (force) {
            this._classes.add(c);
          } else {
            this._classes.delete(c);
          }
        } else if (this._classes.has(c)) {
          this._classes.delete(c);
        } else {
          this._classes.add(c);
        }
      },
      contains: function(c) {
        return this._classes.has(c);
      },
    },
    addEventListener: (evt, fn) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    removeEventListener: () => {},
    click: () => {
      if (listeners.click) {
        for (const fn of listeners.click) {
          fn({ preventDefault: () => {} });
        }
      }
    },
    style: {},
    innerHTML: '',
    textContent: '',
    children: [],
    querySelector: (_sel) => createMockElement(),
    querySelectorAll: (_sel) => [createMockElement()],
    appendChild: function(child) {
      this.children.push(child);
      return child;
    },
    setAttribute: () => {},
    getAttribute: () => null,
    dataset: {},
  };
  return el;
}

const mockDom = {
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement('', tag),
    querySelector: (_sel) => createMockElement(),
    querySelectorAll: (_sel) => [createMockElement()],
    createDocumentFragment: () => createMockElement('', 'fragment'),
    body: createMockElement('body', 'body'),
  },
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  console,
  Math,
  JSON,
  Date,
  Float32Array,
  Uint32Array,
  Uint8Array,
  Uint8ClampedArray,
  TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : () => ({ encode: (s) => Buffer.from(s) }),
  structuredClone: typeof structuredClone !== 'undefined' ? structuredClone : (x) => structuredClone(x),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => { clearTimeout(id); },
};

mockDom.window = Object.assign(mockDom.window, mockDom);
const context = vm.createContext(mockDom);

for (const file of scripts) {
  const code = fs.readFileSync(path.join(baseDir, file), 'utf8');
  vm.runInContext(code, context);
}

const runtime = context.window.GameRuntime;
runtime.init();

const combat = context.window.EmberlightCombat;

// Test 1: Enter combat and verify initial state
runtime.EventBus.publish('overworld:encounter', { encounterKey: 'DEFAULT' });
let state = combat.getState();
while (state.phase === 'ENEMY_ACTION') {
  combat.update(1.0);
  state = combat.getState();
}
assert.ok(state.phase === 'PLAYER_INPUT' || state.phase === 'TARGETING_ENEMY', 'Combat phase should be in player input phase');
console.log('[PASS] Test 1: Combat initialized in player turn phase');

// Test 2: Tab selection via hotkeys (CHOICE_1..4)
combat.handleHostAction('CHOICE_2'); // SKILLS
state = combat.getState();
assert.strictEqual(state.selectedTab, 'SKILLS', 'CHOICE_2 should switch tab to SKILLS');

combat.handleHostAction('CHOICE_3'); // GUARD
state = combat.getState();
assert.strictEqual(state.selectedTab, 'GUARD', 'CHOICE_3 should switch tab to GUARD');

combat.handleHostAction('CHOICE_4'); // POUCH
state = combat.getState();
assert.strictEqual(state.selectedTab, 'POUCH', 'CHOICE_4 should switch tab to POUCH');
console.log('[PASS] Test 2: Tab hotkeys 2, 3, 4 switch tabs');

// Test 3: Directional navigation (LEFT, RIGHT)
combat.handleHostAction('LEFT'); // from POUCH -> GUARD
state = combat.getState();
assert.strictEqual(state.selectedTab, 'GUARD', 'LEFT should cycle tab from POUCH to GUARD');

combat.handleHostAction('RIGHT'); // from GUARD -> POUCH
state = combat.getState();
assert.strictEqual(state.selectedTab, 'POUCH', 'RIGHT should cycle tab back to POUCH');
console.log('[PASS] Test 3: Directional navigation (LEFT/RIGHT) functional');

// Test 4: Cancel action (CANCEL)
combat.handleHostAction('CANCEL'); // Reverts to ATTACK tab
state = combat.getState();
assert.strictEqual(state.selectedTab, 'ATTACK', 'CANCEL should return to ATTACK tab');
console.log('[PASS] Test 4: CANCEL key reverts to ATTACK');

// Test 5: CONFIRM action executes attack on first living enemy
const enemyHpBefore = state.enemies[0].hp;
combat.handleHostAction('CONFIRM');
state = combat.getState();
assert.ok(state.enemies[0].hp < enemyHpBefore || !state.enemies[0].alive, 'CONFIRM in ATTACK tab should damage enemy');
console.log('[PASS] Test 5: CONFIRM executes strike on living enemy');

console.log('=== ALL COMBAT INPUT VERIFICATION TESTS PASSED ===');
process.exit(0);
