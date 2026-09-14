const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert');

const baseDir = path.resolve(__dirname, '..');
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
        } else {
          if (classSet.has(cls)) classSet.delete(cls);
          else classSet.add(cls);
        }
      }
    },
    style: {},
    innerHTML: '',
    textContent: '',
    children: [],
    appendChild: (child) => { el.children.push(child); return child; },
    removeChild: (child) => {
      const idx = el.children.indexOf(child);
      if (idx !== -1) el.children.splice(idx, 1);
      return child;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, handler) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener: () => {},
    focus: () => {},
    blur: () => {},
    width: 480,
    height: 260,
    toDataURL: () => 'data:image/png;base64,mock',
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
      measureText: () => ({ width: 10 })
    })
  };
  return el;
}

const domElements = {};
const mockDocument = {
  getElementById: (id) => {
    if (!domElements[id]) domElements[id] = createMockElement(id);
    return domElements[id];
  },
  createElement: (tag) => createMockElement('', tag),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return mockDocument.getElementById(sel.slice(1));
    return createMockElement('', 'div');
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: createMockElement('body')
};

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  document: mockDocument,
  window: {
    document: mockDocument,
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    removeEventListener: () => {},
    AudioContext: class {
      createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } }; }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
      createBufferSource() { return { connect: () => {}, start: () => {} }; }
      get destination() { return {}; }
      get currentTime() { return 0; }
    }
  },
  AudioContext: class {
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } }; }
    createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
    createBufferSource() { return { connect: () => {}, start: () => {} }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
  },
  localStorage: {
    _data: {},
    getItem: (k) => sandbox.localStorage._data[k] || null,
    setItem: (k, v) => { sandbox.localStorage._data[k] = String(v); },
    removeItem: (k) => { delete sandbox.localStorage._data[k]; },
    clear: () => { sandbox.localStorage._data = {}; }
  },
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  Set,
  Map,
  JSON,
  structuredClone: (obj) => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)))
};

const context = vm.createContext(sandbox);

for (const scriptFile of scripts) {
  const filePath = path.join(baseDir, scriptFile);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename: scriptFile });
}

const {
  GameRuntime,
  EmberlightSessionStore,
  EmberlightEventBus,
  EmberlightCombat
} = sandbox.window;

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
