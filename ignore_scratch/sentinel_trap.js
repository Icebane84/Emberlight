/* =========================================================================
   SENTINEL PRE-BOOT TRAP INJECTION (ZERO-INDEX INTERCEPTOR)
   Document Identifier: VSRP-001-SENTINEL-TRAP
   Classification: In-Situ Hardware Interceptor & Global Boundary Gate
   ========================================================================= */

(() => {
  'use strict';

  if (typeof window === 'undefined') return;

  // 1. Snapshot Pristine Browser Environment
  const pristineKeys = new Set(Object.getOwnPropertyNames(window));
  
  // Whitelist of approved top-level engine anchors
  const APPROVED_ENGINE_GLOBALS = new Set([
    'EmberlightManifest',
    'EmberlightPRNG',
    'EmberlightSessionStore',
    'EmberlightEventBus',
    'EmberlightWorldEcology',
    'EmberlightDistrictRouter',
    'EmberlightAudio',
    'EmberlightAcousticSFX',
    'EmberlightVoice',
    'EmberlightInput',
    'EmberlightIconBaker',
    'EmberlightSkillIconBaker',
    'EmberlightPartyIconBaker',
    'EmberlightSpriteBaker',
    'EmberlightBattlerBaker',
    'EmberlightCombatBackdrop',
    'EmberlightCombatVFX',
    'EmberlightCombatRenderer',
    'EmberlightMapRenderer',
    'EmberlightArmoryRenderer',
    'EmberlightChronicleRenderer',
    'EmberlightProgressionRenderer',
    'EmberlightMarketRenderer',
    'EmberlightStatusRenderer',
    'EmberlightRelicForgeRenderer',
    'EmberlightCockpitRenderer',
    'EmberlightDynamicLights',
    'EmberlightPseudo3D',
    'EmberlightCorridorSensor',
    'EmberlightCompositor',
    'EmberlightThreatOracle',
    'EmberlightOverworld',
    'EmberlightCombat',
    'EmberlightScript',
    'EmberlightArmory',
    'EmberlightProgression',
    'EmberlightStatus',
    'EmberlightMarket',
    'EmberlightChronicle',
    'EmberlightRelicForge',
    'EmberlightLockpick',
    'EmberlightSettings',
    'EmberlightDungeonGen',
    'EmberlightAuditor',
    'EmberlightSaveManager',
    'EmberlightRuntime',
    '__SENTINEL_TRAP__'
  ]);

  const telemetry = {
    randomCalls: [],
    autonomousClocks: [],
    membraneLeaks: [],
    unauthorizedGlobals: [],
    syntaxErrors: []
  };

  // 2. Intercept Native PRNG (Catch Top-Level Math.random() Invocations)
  const nativeRandom = Math.random;
  let trapSealed = false;

  Math.random = function interceptedRandom(...args) {
    if (!trapSealed) {
      const trace = new Error().stack || '';
      telemetry.randomCalls.push({
        timestamp: performance.now(),
        stack: trace.split('\n').slice(2, 5).map(s => s.trim())
      });
    }
    return nativeRandom.apply(this, args);
  };

  // 3. Intercept Autonomous Clocks (Catch setInterval / setTimeout during parsing)
  const nativeSetInterval = window.setInterval;
  const nativeSetTimeout = window.setTimeout;
  const nativeRAF = window.requestAnimationFrame;

  window.setInterval = function interceptedSetInterval(fn, delay, ...args) {
    if (!trapSealed) {
      const trace = new Error().stack || '';
      telemetry.autonomousClocks.push({
        type: 'setInterval',
        delay,
        stack: trace.split('\n').slice(2, 5).map(s => s.trim())
      });
    }
    return nativeSetInterval.call(window, fn, delay, ...args);
  };

  window.setTimeout = function interceptedSetTimeout(fn, delay, ...args) {
    if (!trapSealed) {
      const trace = new Error().stack || '';
      telemetry.autonomousClocks.push({
        type: 'setTimeout',
        delay,
        stack: trace.split('\n').slice(2, 5).map(s => s.trim())
      });
    }
    return nativeSetTimeout.call(window, fn, delay, ...args);
  };

  window.requestAnimationFrame = function interceptedRAF(cb) {
    if (!trapSealed) {
      const trace = new Error().stack || '';
      telemetry.autonomousClocks.push({
        type: 'requestAnimationFrame',
        stack: trace.split('\n').slice(2, 5).map(s => s.trim())
      });
    }
    return nativeRAF.call(window, cb);
  };

  // 4. Global Error Catchment
  window.addEventListener('error', (evt) => {
    telemetry.syntaxErrors.push({
      message: evt.message,
      filename: evt.filename,
      lineno: evt.lineno,
      colno: evt.colno
    });
  });

  // 5. Sentinel Trap Inspection Interface
  window.__SENTINEL_TRAP__ = Object.freeze({
    /**
     * Executes the comprehensive pre-boot boundary audit.
     * Must be invoked by auditor.js before runtime handoff.
     */
    evaluate() {
      // Check current window properties against pristine baseline
      const currentKeys = Object.getOwnPropertyNames(window);
      
      currentKeys.forEach((key) => {
        if (!pristineKeys.has(key)) {
          // Check for lingering staging membranes: window._*Internal
          if (key.startsWith('_') && key.endsWith('Internal')) {
            telemetry.membraneLeaks.push(key);
          } else if (!APPROVED_ENGINE_GLOBALS.has(key)) {
            telemetry.unauthorizedGlobals.push(key);
          }
        }
      });

      const passed = (
        telemetry.randomCalls.length === 0 &&
        telemetry.autonomousClocks.length === 0 &&
        telemetry.membraneLeaks.length === 0 &&
        telemetry.unauthorizedGlobals.length === 0 &&
        telemetry.syntaxErrors.length === 0
      );

      return {
        passed,
        telemetry: structuredClone(telemetry),
        violations: {
          randomCallCount: telemetry.randomCalls.length,
          autonomousClockCount: telemetry.autonomousClocks.length,
          membraneLeakCount: telemetry.membraneLeaks.length,
          unauthorizedGlobalCount: telemetry.unauthorizedGlobals.length,
          syntaxErrorCount: telemetry.syntaxErrors.length
        }
      };
    },

    /**
     * Seals the trap once runtime.js takes over, restoring native methods if desired.
     */
    seal() {
      trapSealed = true;
      Math.random = nativeRandom;
      window.setInterval = nativeSetInterval;
      window.setTimeout = nativeSetTimeout;
      window.requestAnimationFrame = nativeRAF;
    }
  });
})();