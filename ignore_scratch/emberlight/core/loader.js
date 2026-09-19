/* ==========================================================================
   FILE: core/loader.js
   ROLE: Canonical Script Loading Registry & Sequential Injector
   ========================================================================== */
const EMBERLIGHT_MANIFEST = Object.freeze({
  version: '1.0.0',
  executionLayers: [
    {
      layer: '01_KERNEL',
      description: 'Authority, Reference Monitors, and Core Drivers',
      files: [
        'core/sentinel_kernel.js',
        'core/audio_driver.js'
      ]
    },
    {
      layer: '02_SUBSYSTEMS',
      description: 'Internal Domain Subsystems (Staging Membrane)',
      files: [
        'viewports/cartography_q1.js',
        'viewports/raycaster_q2.js',
        'viewports/combat_q3.js',
        'combat/combat_calc.js',
        'combat/combat_queue.js',
        'combat/combat_ai.js',
        'combat/combat_displacement.js'
      ]
    },
    {
      layer: '03_FACADES',
      description: 'VSRP-001 Canonical Facade Entry Points',
      files: [
        'combat.js'
      ]
    }
  ]
});

(function loadSovereigntyStack() {
  const flatScripts = EMBERLIGHT_MANIFEST.executionLayers.flatMap(l => l.files);
  
  function injectNext(index) {
    if (index >= flatScripts.length) {
      console.log('[LOADER] Sovereign engine stack fully hydrated and verified.');
      window.dispatchEvent(new CustomEvent('emberlight:hydrated'));
      return;
    }
    const path = flatScripts[index];
    const script = document.createElement('script');
    script.src = path;
    script.onload = () => injectNext(index + 1);
    script.onerror = () => console.error(`[LOADER_PANIC] Failed to load subsystem: ${path}`);
    document.head.appendChild(script);
  }

  injectNext(0);
})();