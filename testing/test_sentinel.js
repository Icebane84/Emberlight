const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
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

// Boot GameRuntime which registers and seals SDCP-001 capabilities
const runtime = context.window.GameRuntime;
runtime.init();

// Run Sentinel Auditor
const auditor = context.window.EmberlightAuditor;

const targetModules = {
  combat: context.window.EmberlightCombat,
  overworld: context.window.EmberlightOverworld,
  market: context.window.EmberlightMarket,
  progression: context.window.EmberlightProgression,
  lockpick: context.window.EmberlightLockpick,
  relic_forge: context.window.EmberlightRelicForge,
  pseudo3d: context.window.EmberlightPseudo3D,
  armory: context.window.EmberlightArmory,
  script: context.window.EmberlightScript,
  status: context.window.EmberlightStatus,
  chronicle: context.window.EmberlightChronicle,
  settings: context.window.EmberlightSettings,
};

const peripheralDrivers = {
  acoustic: context.window.EmberlightAcousticSFX,
  pseudo3d: context.window.EmberlightPseudo3D,
  lights: context.window.EmberlightDynamicLights,
  vfx: context.window.EmberlightCombatVFX,
  voice: context.window.EmberlightVoice,
  battler: context.window.EmberlightBattlerBaker,
  backdrop: context.window.EmberlightCombatBackdrop,
  input: context.window.EmberlightInput,
  combatRenderer: context.window.EmberlightCombatRenderer,
  overworldRenderer: context.window.EmberlightOverworldRenderer,
  armoryRenderer: context.window.EmberlightArmoryRenderer,
  chronicleRenderer: context.window.EmberlightChronicleRenderer,
  progressionRenderer: context.window.EmberlightProgressionRenderer,
  marketRenderer: context.window.EmberlightMarketRenderer,
  statusRenderer: context.window.EmberlightStatusRenderer,
  relicForgeRenderer: context.window.EmberlightRelicForgeRenderer,
  cockpitRenderer: context.window.EmberlightCockpitRenderer,
};

auditor.reset({
  modules: targetModules,
  drivers: peripheralDrivers,
  eventBus: runtime.EventBus
});

const diag = auditor.getDiagnostics();
console.log('AUDIT DIAGNOSTICS:', diag);
const state = auditor.getState();
state.auditLog.forEach(l => console.log(l.message));

if (diag.score === diag.totalChecks && diag.passed) {
  console.log(`=== SENTINEL AUDIT 100% SUCCESS: ${diag.score}/${diag.totalChecks} CHECKS PASSED ===`);
  process.exit(0);
} else {
  console.error(`=== SENTINEL AUDIT FAILED: ${diag.score}/${diag.totalChecks} ===`);
  process.exit(1);
}
