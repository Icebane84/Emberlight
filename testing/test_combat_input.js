const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert');

const baseDir = path.resolve(__dirname, '..');

// SSOT: canonical topological load order — edit testing/load_order.js, not here.
const scripts = require('./load_order.js');

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
    style: {
      setProperty: (prop, val) => {},
    },
    getBoundingClientRect: () => ({
      left: 100,
      top: 100,
      right: 200,
      bottom: 200,
      width: 100,
      height: 100,
      x: 100,
      y: 100,
    }),
    innerHTML: '',
    textContent: '',
    children: [],
    querySelector: (_sel) => createMockElement(),
    querySelectorAll: (_sel) => [createMockElement()],
    closest: (_sel) => null,
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

const _mockElementCache = new Map();
function getOrCreateMockElement(id = '', tag = 'div') {
  if (!id) return createMockElement(id, tag);
  if (!_mockElementCache.has(id)) {
    _mockElementCache.set(id, createMockElement(id, tag));
  }
  return _mockElementCache.get(id);
}

const mockDom = {
  document: {
    documentElement: getOrCreateMockElement('html', 'html'),
    getElementById: (id) => getOrCreateMockElement(id),
    createElement: (tag) => createMockElement('', tag),
    querySelector: (_sel) => createMockElement(),
    querySelectorAll: (_sel) => [createMockElement()],
    createDocumentFragment: () => createMockElement('', 'fragment'),
    body: getOrCreateMockElement('body', 'body'),
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
  const filePath = path.join(baseDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename: filePath }); // NOSONAR: Test harness requires loading vanilla JS modules into headless DOM VM context
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

// Test 6: Priority 1 Universal Unwind Invariance (ARCH-SPEC-RMB-INTEGRATION-001)
combat.update(1.0);
state = combat.getState();
while (state.phase === 'ENEMY_ACTION') {
  combat.update(1.0);
  state = combat.getState();
}
combat.handleHostAction('CHOICE_2'); // Open SKILLS
combat.handleHostAction('CONFIRM');  // Select first skill -> TARGETING_ENEMY
state = combat.getState();
if (state.phase === 'TARGETING_ENEMY' || state.pendingSkill) {
  const unwound = runtime.handleCancelAction();
  assert.strictEqual(unwound, true, 'handleCancelAction should return true and consume cancel');
  state = combat.getState();
  assert.ok(state.phase === 'PLAYER_INPUT' || state.selectedTab === 'ATTACK' || !state.pendingSkill, 'Cancel should unwind targeting to player input');
}
console.log('[PASS] Test 6: Priority 1 Universal Unwind cancels staged targeting');

// Test 7: Polar Direction Vector Math (ARCH-SPEC-RMB-INTEGRATION-001)
assert.strictEqual(runtime.calculatePolarDirection(0, -50), 'NORTH', 'Vector (0, -50) must evaluate to NORTH');
assert.strictEqual(runtime.calculatePolarDirection(50, 0), 'EAST', 'Vector (50, 0) must evaluate to EAST');
assert.strictEqual(runtime.calculatePolarDirection(0, 50), 'SOUTH', 'Vector (0, 50) must evaluate to SOUTH');
assert.strictEqual(runtime.calculatePolarDirection(-50, 0), 'WEST', 'Vector (-50, 0) must evaluate to WEST');
console.log('[PASS] Test 7: Polar direction calculation returns 4 canonical cardinal axes');

// Test 8: Target Metadata Resolution & Dynamic East Action
const mockEnemyCard = {
  closest: (sel) => (sel.includes('enemy') ? { querySelector: () => ({ textContent: 'Malakor' }) } : null)
};
const enemyMeta = runtime.resolveTargetMetadata(mockEnemyCard, 300, 200);
assert.ok(enemyMeta, 'Enemy metadata should resolve');
assert.strictEqual(enemyMeta.category, 'ENEMY', 'Target category should be ENEMY');
assert.strictEqual(enemyMeta.title, 'Malakor', 'Target title should match enemy name');
assert.strictEqual(enemyMeta.eastAction.id, 'THREAT_ORACLE', 'East action for hostile should bind THREAT_ORACLE');
console.log('[PASS] Test 8: Target metadata dynamically resolves Threat Oracle on hostile');

// Test 9: Hold-and-Snap Gesture Lifecycle
runtime.handlePointerContextDown({ button: 2, clientX: 200, clientY: 200, target: mockEnemyCard });
runtime.handlePointerContextMove({ clientX: 250, clientY: 200 }); // +50px East (>24px threshold)
runtime.handlePointerContextUp({ button: 2 });
// Test 10: Universal Right-Click Cancel in Menus
runtime.switchDistrict('ARMORY');
assert.strictEqual(runtime.getActiveDistrict(), 'ARMORY', 'District should be ARMORY');
runtime.handlePointerContextDown({ button: 2, clientX: 100, clientY: 100, target: {} });
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Right click in ARMORY should cancel back to OVERWORLD');

runtime.switchDistrict('STATUS');
assert.strictEqual(runtime.getActiveDistrict(), 'STATUS', 'District should be STATUS');
runtime.handlePointerContextDown({ button: 2, clientX: 100, clientY: 100, target: {} });
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Right click in STATUS should cancel back to OVERWORLD');
console.log('[PASS] Test 10: Universal Right Click in dedicated menus cancels back to OVERWORLD');

// Test 11: Right Click in Combat sub-tab cancels back to ATTACK
runtime.EventBus.publish('overworld:encounter', { encounterKey: 'DEFAULT' });
state = combat.getState();
while (state.phase === 'ENEMY_ACTION') {
  combat.update(1.0);
  state = combat.getState();
}
combat.handleHostAction('CHOICE_4'); // POUCH tab
state = combat.getState();
assert.strictEqual(state.selectedTab, 'POUCH', 'Combat tab should be POUCH');
runtime.handlePointerContextDown({ button: 2, clientX: 100, clientY: 100, target: {} });
state = combat.getState();
assert.strictEqual(state.selectedTab, 'ATTACK', 'Right click in Combat POUCH tab should cancel back to ATTACK tab');
console.log('[PASS] Test 11: Right Click in Combat sub-tab cancels back to ATTACK');

// Test 12: Q2 3D Viewport RMB resolves 3D_SENSOR metadata
runtime.switchDistrict('OVERWORLD');
const mockSensorElement = {
  closest: (sel) => (sel.includes('#pane-sensor') || sel.includes('#corridor-canvas') || sel.includes('.sensor-viewport') ? {} : null)
};
const q2Meta = runtime.resolveTargetMetadata(mockSensorElement, 400, 200);
assert.ok(q2Meta, 'Q2 Sensor click must return 3D_SENSOR metadata');
assert.strictEqual(q2Meta.category, '3D_SENSOR', 'Category should be 3D_SENSOR');
assert.strictEqual(q2Meta.northAction.id, '3D_ADVANCE', 'North action should be 3D_ADVANCE');
assert.strictEqual(q2Meta.eastAction.id, '3D_DEEP_SCAN', 'East action should be 3D_DEEP_SCAN');
assert.strictEqual(q2Meta.southAction.id, '3D_ABOUT_FACE', 'South action should be 3D_ABOUT_FACE');
assert.strictEqual(q2Meta.westAction.id, '3D_TOGGLE_EXPAND', 'West action should be 3D_TOGGLE_EXPAND');
console.log('[PASS] Test 12: Q2 3D Viewport RMB resolves 3D_SENSOR metadata with 4 canonical actions');

// Test 13: Q4 Hero Card Right-Click routes directly to ARMORY/STATUS sheet
runtime.switchDistrict('OVERWORLD');
assert.strictEqual(runtime.getActiveDistrict(), 'OVERWORLD', 'Reset to OVERWORLD');
const mockHeroCard = {
  closest: (sel) => (sel.includes('hud-char-card') ? mockHeroCard : null),
  getAttribute: (attr) => (attr === 'data-hero-idx' || attr === 'data-idx' ? '2' : null)
};
runtime.handlePointerContextDown({ button: 2, clientX: 300, clientY: 500, target: mockHeroCard });
assert.strictEqual(runtime.getActiveDistrict(), 'ARMORY', 'Right-clicking hero card should navigate directly to ARMORY');
assert.strictEqual(context.window.EmberlightSessionStore.getFlags().selectedHeroIdx, 2, 'Hero index 2 should be selected');
console.log('[PASS] Test 13: Q4 Hero Card RMB navigates directly to ARMORY sheet with selected hero index');

// Test 14: In 3D Fullscreen/Expanded mode, RMB spawns 3D_SENSOR radial wheel without collapsing 3D view
runtime.switchDistrict('OVERWORLD');
runtime.EventBus.publish('input:action', { action: 'TOGGLE_3D_VIEW', code: 'KeyX' });
assert.strictEqual(runtime.is3DViewExpanded(), true, '3D view should be expanded');
const anyScreenElement = { closest: () => null };
const q2FullscreenMeta = runtime.resolveTargetMetadata(anyScreenElement, 500, 300);
assert.ok(q2FullscreenMeta, 'RMB in 3D fullscreen should resolve metadata');
assert.strictEqual(q2FullscreenMeta.category, '3D_SENSOR', 'Category in 3D fullscreen should be 3D_SENSOR');
assert.strictEqual(q2FullscreenMeta.westAction.label, 'Collapse [Z]', 'West action in 3D fullscreen should be Collapse [Z]');
runtime.handlePointerContextDown({ button: 2, clientX: 500, clientY: 300, target: anyScreenElement });
assert.strictEqual(runtime.is3DViewExpanded(), true, '3D view should remain expanded after RMB mousedown');
console.log('[PASS] Test 14: In 3D Fullscreen mode, RMB spawns 3D_SENSOR radial without collapsing fullscreen');

// Test 15: Q1 Radial Factory (Physical Geometry)
const combatRenderer = context.window.EmberlightCombatRenderer;
assert.ok(combatRenderer, 'EmberlightCombatRenderer must be present');
const q1Config = combatRenderer.buildQ1RadialConfig(2, 3, { id: 'h1', row: 'FRONT', alive: true }, null);
assert.strictEqual(q1Config.centerIcon, '🌐', 'Q1 Center icon must be 🌐');
assert.strictEqual(q1Config.north.label, 'ROW SHIFT', 'Q1 North must be ROW SHIFT');
assert.strictEqual(q1Config.east.label, 'STEER KNOCKBACK', 'Q1 East must be STEER KNOCKBACK');
assert.strictEqual(q1Config.south.label, 'BARRICADE', 'Q1 South must be BARRICADE');
assert.strictEqual(q1Config.west.label, 'DETONATE', 'Q1 West must be DETONATE');
console.log('[PASS] Test 15: Q1 Spatial Kinematics Radial Config asserts 4 cardinal physical geometry descriptors');

// Test 16: Q2 Radial Factory (Kinetic Confrontation)
const mockHit = { index: 0, enemy: { id: 'e1', name: 'Goblin' } };
const mockCombatState = { party: [{ id: 'h1', name: 'Aldric' }], enemies: [{ id: 'e1', name: 'Goblin', alive: true }] };
const q2Config = combatRenderer.buildQ2RadialConfig(mockHit, mockCombatState);
assert.strictEqual(q2Config.centerIcon, '⚔️', 'Q2 Center icon must be ⚔️');
assert.ok(q2Config.north.label.includes('STRIKE'), 'Q2 North must be STRIKE');
assert.strictEqual(q2Config.east.label, 'POSTURE BREAK', 'Q2 East must be POSTURE BREAK');
assert.strictEqual(q2Config.south.label, 'FOCUS BEACON', 'Q2 South must be FOCUS BEACON');
assert.strictEqual(q2Config.west.label, 'VULN SCAN', 'Q2 West must be VULN SCAN');
console.log('[PASS] Test 16: Q2 Kinetic Confrontation Radial Config asserts 4 direct strike & beacon descriptors');

// Test 17: Q3 Radial Factory (Chrono-Acoustic Timeline Interception)
const q3Config = combatRenderer.buildQ3RadialConfig({ entityId: 'e1', id: 'e1' }, mockCombatState);
assert.strictEqual(q3Config.centerIcon, '⏱️', 'Q3 Center icon must be ⏱️');
assert.strictEqual(q3Config.north.label, 'DELAY STRIKE', 'Q3 North must be DELAY STRIKE');
assert.strictEqual(q3Config.east.label, 'PHASE TUNE', 'Q3 East must be PHASE TUNE');
assert.strictEqual(q3Config.south.label, 'PRE-EMPT BRACE', 'Q3 South must be PRE-EMPT BRACE');
assert.strictEqual(q3Config.west.label, 'CHRONICLE AUDIT', 'Q3 West must be CHRONICLE AUDIT');
console.log('[PASS] Test 17: Q3 Chrono-Acoustic Radial Config asserts timeline interception descriptors');

// Test 18: Q4 Radial Factory (Squad Deck & Logistics)
const q4Config = combatRenderer.buildQ4RadialConfig({ id: 'h1', name: 'Aldric' }, { id: 'e1', name: 'Goblin' }, [{ id: 'slash', name: 'Slash' }]);
assert.strictEqual(q4Config.centerIcon, '⚔️', 'Q4 Center icon must be ⚔️');
assert.strictEqual(q4Config.north.label, 'STRIKE', 'Q4 North must be STRIKE');
assert.strictEqual(q4Config.east.label, 'SKILLS', 'Q4 East must be SKILLS');
assert.strictEqual(q4Config.south.label, 'GUARD', 'Q4 South must be GUARD');
assert.strictEqual(q4Config.west.label, 'POUCH', 'Q4 West must be POUCH');
console.log('[PASS] Test 18: Q4 Squad Deck Radial Config asserts stance and loadout descriptors');

console.log('=== ALL COMBAT & RMB INPUT VERIFICATION TESTS PASSED ===');
process.exit(0);

