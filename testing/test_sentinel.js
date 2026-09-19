/**
 * @fileoverview Emberlight Sentinel Audit Harness (Pass 1 - Pass 21)
 *
 * Protocols: VSRP-001 / SDCP-001 / PERSIST-001 / MPFS-001
 * Authority: Host SSOT | Sentinel Audit Engine
 *
 * Evaluates the full topological load order of Emberlight game engine modules
 * in a zero-dependency headless VM sandbox and executes the 21-Pass Sentinel Headless Audit.
 *
 * Usage: node testing/test_sentinel.js
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createVmContext } = require('./mock_dom.js');

const baseDir = path.resolve(__dirname, '..');

// SSOT: canonical topological load order — edit testing/load_order.js, not here.
const scripts = require('./load_order.js');

const context = createVmContext();

scripts.forEach((file) => {
  const filePath = path.join(baseDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename: filePath }); // NOSONAR: Test harness requires loading vanilla JS modules into headless DOM VM context
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
  eventBus: runtime.EventBus,
});

const diag = auditor.getDiagnostics();
console.log('AUDIT DIAGNOSTICS:', diag);
const state = auditor.getState();
state.auditLog.forEach((l) => console.log(l.message));

if (diag.score === diag.totalChecks && diag.passed) {
  console.log(`=== SENTINEL AUDIT 100% SUCCESS: ${diag.score}/${diag.totalChecks} CHECKS PASSED ===`);
  process.exit(0);
} else {
  console.error(`=== SENTINEL AUDIT FAILED: ${diag.score}/${diag.totalChecks} ===`);
  process.exit(1);
}
