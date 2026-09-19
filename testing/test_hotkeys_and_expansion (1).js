const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert');

const baseDir = path.resolve(__dirname, '..');

// SSOT: canonical topological load order — edit testing/load_order.js, not here.
const scripts = require('./load_order.js');

function createMockElement(id = '', tag = 'div') {
  const listeners = {};
  const classSet = new Set();
  const el = {
    id,
    tagName: tag.toUpperCase(),
    dataset: {},
    classList: {
      add: (cls) => classSet.add(cls),
      remove: (cls) => classSet.delete(cls),
      contains: (cls) => classSet.has(cls),
      toggle: (cls, force) => {
        if (typeof force === 'boolean') {
          if (force) classSet.add(cls);
          else classSet.delete(cls);
          return force;
        }
        if (classSet.has(cls)) {
          classSet.delete(cls);
          return false;
        }
        classSet.add(cls);
        return true;
      },
    },
    style: {},
    textContent: '',
    innerHTML: '',
    children: [],
    closest: () => null,
    appendChild: (child) => {
      el.children.push(child);
      child.parentElement = el;
      return child;
    },
    remove: () => {},
    addEventListener: (type, fn) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    dispatchEvent: (type, evt = {}) => {
      if (listeners[type]) {
        listeners[type].forEach((fn) => fn(evt));
      }
    },
    querySelector: (sel) => {
      if (sel === '.expand-label') return createMockElement('expand-label', 'span');
      return createMockElement('sub-elem');
    },
    querySelectorAll: () => [],
    toDataURL: () => 'data:image/png;base64,mock',
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      rect: () => {},
      roundRect: () => {},
      clip: () => {},
      strokeRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => ({}),
      getImageData: () => ({ data: new Uint8ClampedArray(480 * 320 * 4) }),
      putImageData: () => {},
      createImageData: (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      setTransform: () => {},
      scale: () => {},
      translate: () => {},
      rotate: () => {},
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 320 }),
  };
  return el;
}

const mockElements = new Map();
function getOrCreateElement(id) {
  if (!mockElements.has(id)) {
    mockElements.set(id, createMockElement(id));
  }
  return mockElements.get(id);
}

const context = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Set,
  Map,
  Uint32Array,
  Float32Array,
  structuredClone: typeof structuredClone !== 'undefined' ? structuredClone : (x) => JSON.parse(JSON.stringify(x)),
  document: {
    getElementById: (id) => getOrCreateElement(id),
    querySelector: (sel) => {
      if (sel.startsWith('#')) return getOrCreateElement(sel.slice(1));
      return createMockElement('sel-mock');
    },
    querySelectorAll: () => [],
    createElement: (tag) => createMockElement(`created-${tag}`, tag),
    body: createMockElement('body'),
    addEventListener: () => {},
  },
  window: {
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
};
context.window.document = context.document;
vm.createContext(context);

scripts.forEach((file) => {
  const fullPath = path.join(baseDir, file);
  const code = fs.readFileSync(fullPath, 'utf8');
  vm.runInContext(code, context);
});

console.log('=== TEST SUITE: HOTKEYS & VIEWPORT EXPANSION VERIFICATION ===');

const runtime = context.window.GameRuntime;
const input = context.window.EmberlightInput;
const bus = context.window.EmberlightEventBus;

// Test 1: Start game and verify initial overworld state
runtime.init();
runtime.switchDistrict('OVERWORLD');
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Should be in OVERWORLD district');
assert.strictEqual(runtime.isQ4DeckExpanded(), false, 'Q4 deck should be collapsed initially');
assert.strictEqual(runtime.is3DViewExpanded(), false, '3D view should be collapsed initially');
console.log('[PASS] Test 1: Initial OVERWORLD state verified');

// Test 2: [Z] Key toggles Q4 Fullscreen Deck
bus.publish('input:action', { action: 'TOGGLE_EXPAND_DECK', code: 'KeyZ' });
assert.strictEqual(runtime.isQ4DeckExpanded(), true, 'Q4 deck should be expanded after [Z]');
assert.strictEqual(runtime.is3DViewExpanded(), false, '3D view should remain collapsed');

// Test 3: [ESC] Key collapses expanded Q4 Deck
bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
assert.strictEqual(runtime.isQ4DeckExpanded(), false, 'Q4 deck should collapse back to normal on [ESC]');
console.log('[PASS] Test 2 & 3: [Z] expand and [ESC] collapse verified');

// Test 4: [X] Key toggles 3D Immersion Viewport
bus.publish('input:action', { action: 'TOGGLE_3D_VIEW', code: 'KeyX' });
assert.strictEqual(runtime.is3DViewExpanded(), true, '3D view should be expanded after [X]');
assert.strictEqual(runtime.isQ4DeckExpanded(), false, 'Q4 deck should remain collapsed');

// Test 5: [ESC] Key collapses 3D Immersion Viewport
bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
assert.strictEqual(runtime.is3DViewExpanded(), false, '3D view should collapse back on [ESC]');
console.log('[PASS] Test 4 & 5: [X] 3D immersion and [ESC] collapse verified');

// Test 6: Modal hotkeys ([E] Armory, [T] Progression, [C] Status) and [ESC] return
bus.publish('input:action', { action: 'MENU_ARMORY', code: 'KeyE' });
assert.strictEqual(runtime.getActiveDistrict(), 'ARMORY', 'Should switch to ARMORY on KeyE');
bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Should return to OVERWORLD on ESC');

bus.publish('input:action', { action: 'MENU_PROGRESSION', code: 'KeyT' });
assert.strictEqual(runtime.getActiveDistrict(), 'PROGRESSION', 'Should switch to PROGRESSION on KeyT');
bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Should return to OVERWORLD on ESC');

bus.publish('input:action', { action: 'MENU_STATUS', code: 'KeyC' });
assert.strictEqual(runtime.getActiveDistrict(), 'STATUS', 'Should switch to STATUS on KeyC');
bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Should return to OVERWORLD on ESC');
console.log('[PASS] Test 6: Modal hotkeys [E], [T], [C] and [ESC] returns verified');

// Test 7: Directional movement in 2D vs 3D immersion mode
runtime.switchDistrict('OVERWORLD');
runtime.setWorldPos({ x: 5, y: 5 });
bus.publish('input:action', { action: 'RIGHT', code: 'KeyD' });
assert.strictEqual(runtime.getWorldPos().x, 6, '2D right should move to x=6');
assert.strictEqual(runtime.getWorldPos().y, 5, '2D right should keep y=5');

// Enable 3D view and test turning
bus.publish('input:action', { action: 'TOGGLE_3D_VIEW', code: 'KeyX' });
assert.strictEqual(runtime.is3DViewExpanded(), true, '3D view active');

// In 3D view, facing is RIGHT. Pressing LEFT (KeyA) turns yaw to UP without changing position
bus.publish('input:action', { action: 'LEFT', code: 'KeyA' });
assert.strictEqual(runtime.getWorldPos().x, 6, 'Position x unchanged during 3D yaw turn');
assert.strictEqual(runtime.getWorldPos().y, 5, 'Position y unchanged during 3D yaw turn');
assert.strictEqual(context.window.EmberlightSessionStore.getFlags().facingDirection, 'UP', 'Facing turned to UP');

// Pressing UP (KeyW) moves 1 step forward in facing direction (UP -> y - 1)
bus.publish('input:action', { action: 'UP', code: 'KeyW' });
assert.strictEqual(runtime.getWorldPos().x, 6, 'Moved forward x=6');
assert.strictEqual(runtime.getWorldPos().y, 4, 'Moved forward y=4');

bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
console.log('[PASS] Test 7: 2D and 3D crawler movement verified');

// Test 8: Combat encounter transition from 3D Immersion Mode
runtime.switchDistrict('OVERWORLD');
bus.publish('input:action', { action: 'TOGGLE_3D_VIEW', code: 'KeyX' });
assert.strictEqual(runtime.is3DViewExpanded(), true, '3D view active prior to encounter');

bus.publish('overworld:encounter', { encounterKey: 'DEFAULT' });
assert.strictEqual(runtime.getActiveDistrict(), 'COMBAT', 'Should switch to COMBAT district upon encounter');
assert.strictEqual(runtime.is3DViewExpanded(), false, '3D view should automatically collapse upon entering COMBAT');
console.log('[PASS] Test 8: Combat encounter transition from 3D immersion verified');

// Test 9: Treasure chest interaction & Harmonic Lockpick District
runtime.switchDistrict('OVERWORLD');
runtime.setWorldPos({ x: 9, y: 7 }); // adjacent to chest at (9, 8)
bus.publish('input:action', { action: 'DOWN', code: 'KeyS' }); // Step onto chest at (9, 8)
assert.strictEqual(runtime.getActiveDistrict(), 'LOCKPICK', 'Stepping onto locked chest should enter LOCKPICK district');

// Abort lockpick
bus.publish('input:action', { action: 'CANCEL', code: 'Escape' });
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Aborting lockpick should return to OVERWORLD');
console.log('[PASS] Test 9: Treasure chest interaction & Lockpick resolution verified');

console.log('=== ALL HOTKEY & VIEWPORT EXPANSION TESTS PASSED 100% ===');
