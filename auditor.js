/* =========================================================================
   DISTRICT 8: SENTINEL AUDITOR & ARCHITECTURAL GATEKEEPER (VSRP-001 TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-AUDITOR-SENTINEL
   Protocol Version:    VSRP-001 / MVP-001 / SDCP-001
   Classification:      Autonomous Architectural Governance & Anti-Entropy Gate
   Index Anchor:        PRS-001
   =========================================================================
   FACADE REBUILD — VSRP-001-ARCH-SPEC-FACADE-TOPOLOGY-001
   =========================================================================
   This file is a thin facade. It ingests all 7 sub-module namespace keys
   from the VSRP-001 staging membrane (window._AuditorInternal), purges
   the membrane, retains the lifecycle state machine, and exports the
   canonical 9-method EmberlightAuditor object.

   Sub-module load order (must precede this file in index.html / load_order.js):
     auditor/auditor_kernel.js
     auditor/auditor_contracts.js
     auditor/auditor_district_sims.js
     auditor/auditor_combat_extended.js
     auditor/auditor_persistence.js
     auditor/auditor_constitutional.js
     auditor/auditor_endgame.js
   ========================================================================= */

const EmberlightAuditor = (() => {
  // ─── Lifecycle State Machine (facade-retained) ────────────────────────────
  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };

  let lifecycleState = State.UNCONFIGURED;
  /** @type {any} */
  let hostConfig = null;
  /** @type {any} */
  let hostContext = null;
  /** @type {any} */
  let sim = null;

  // ─── Membrane Ingestion ───────────────────────────────────────────────────
  // All 7 sub-modules have written their keys to window._AuditorInternal
  // before this IIFE executes. Ingest and immediately purge the membrane.

  const _mem = /** @type {any} */ (window._AuditorInternal);

  // Kernel utilities
  const {
    _bindLog,
    deepFreeze,
    createDefaultState,
    createIsolatedEventBus,
  } = _mem.Kernel;

  // Endgame SPINE & presentation
  const {
    executeAuditPasses,
    resolveDriverRegistry,
    renderDefaultPresentation,
  } = _mem.Endgame;

  // Membrane purge — remove the staging scaffold from the global scope
  delete (/** @type {Record<string, unknown>} */ (window))._AuditorInternal;

  // ─── Facade Utilities (retained here — close over lifecycle state) ────────

  /**
   * Guards lifecycle-gated method invocations.
   * Verbatim from auditor.js:104–111.
   * Intentionally NOT extracted: closes over the facade-owned `lifecycleState`.
   * @param {...string} allowed - Permitted lifecycle states.
   */
  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:auditor_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
        `Required: ${allowed.join(' | ')}`
      );
    }
  }

  // ─── VSRP-001 Canonical 9-Method Lifecycle Object ────────────────────────

  return {
    /**
     * Seals the host configuration. Verbatim delegate from auditor.js:2044–2049.
     * @param {Record<string, any>} [cfg] - { manifest, ... }
     */
    configure(cfg) {
      assertLifecycle(State.UNCONFIGURED);
      hostConfig = deepFreeze({ ...cfg });
      lifecycleState = State.CONFIGURED;
    },

    /**
     * Stores host context (eventBus, renderers). Verbatim from auditor.js:2051–2055.
     * @param {Record<string, any>} [context] - Host context object.
     */
    init(context) {
      assertLifecycle(State.CONFIGURED);
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

    /**
     * Runs all 21 audit passes against the provided snapshot.
     * Verbatim delegate from auditor.js:2057–2069.
     * Facade adaptation: uses Kernel._bindLog(sim) to wire the sim accumulator
     * before delegating to Endgame.executeAuditPasses.
     *
     * @param {Record<string, any>} [snapshot] - { modules, drivers, eventBus }
     */
    reset(snapshot = {}) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
      sim = createDefaultState();
      _bindLog(sim);

      const targets = snapshot?.modules || {};
      const drivers = resolveDriverRegistry(snapshot?.drivers || null);
      let activeManifest = hostConfig?.manifest;
      if (!activeManifest) {
        if (typeof window !== 'undefined' && window.EmberlightManifest) {
          activeManifest = window.EmberlightManifest;
        } else if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis)).EmberlightManifest) {
          activeManifest = (/** @type {any} */ (globalThis)).EmberlightManifest;
        } else {
          activeManifest = {};
        }
      }
      const bus = snapshot?.eventBus || createIsolatedEventBus();

      executeAuditPasses(targets, drivers, activeManifest, bus);

      sim.passed = (sim.complianceScore === sim.totalChecks && sim.totalChecks > 0);
      lifecycleState = State.READY;
    },

    /**
     * Transitions to RUNNING state. Verbatim from auditor.js:2071–2074.
     * @param {number} [_dt]
     * @param {any} [_context]
     */
    update(_dt, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      lifecycleState = State.RUNNING;
    },

    /**
     * Renders audit results via external renderer or built-in DOM presentation.
     * Verbatim from auditor.js:2076–2083.
     * Facade adaptation: passes (sim, hostContext) to renderDefaultPresentation
     * since that function is now parameterized (no facade closure access).
     *
     * @param {{ renderAuditor?: (state: any) => void } | any} [renderer] - Optional external renderer with renderAuditor().
     * @param {any} [_context]
     */
    render(renderer, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (renderer && typeof renderer.renderAuditor === 'function') {
        renderer.renderAuditor(this.getState());
      } else {
        renderDefaultPresentation(sim, hostContext);
      }
    },

    /**
     * Returns a deep clone of the current sim accumulator.
     * Verbatim from auditor.js:2085–2088.
     */
    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

    /**
     * Returns live diagnostic telemetry. Verbatim from auditor.js:2090–2098.
     */
    getDiagnostics() {
      return {
        moduleId: 'auditor_core',
        lifecycleState,
        totalChecks: sim?.totalChecks || 0,
        score: sim?.complianceScore || 0,
        passed: sim?.passed || false,
      };
    },

    /**
     * Returns the canonical module metadata object. Verbatim from auditor.js:2100–2131.
     */
    getModuleInfo() {
      return {
        moduleId: 'auditor_core',
        version: '4.9.0',
        protocolVersion: 'VSRP-001 / MVP-001 / SDCP-001',
        capabilities: [
          'contract_audit',
          'faraday_isolation_trap',
          'in_situ_combat_sim',
          'overworld_collision_sim',
          'market_commerce_sim',
          'progression_graph_sim',
          'lockpick_resonance_sim',
          'relic_forge_sim',
          'pseudo3d_frustum_sim',
          'sdcp_capability_seal_sim',
          'formation_topology_sim',
          'boss_phase_shader_sim',
          'status_ailment_invariance_sim',
          'dual_perspective_immersion_sim',
          'persistence_compression_sim',
          'eventbus_teardown_sim',
          'combat_aesthetics_synthesis_sim',
          'battler_sprite_procedural_sim',
          'biome_backdrop_depth_sim',
          'surfacing_and_legibility_sim',
          'constitutional_compliance_audit',
          'tactical_displacement_sim',
          'deep_analysis_terminal_sim',
          'boot_time_gatekeeper',
        ],
      };
    },

    /**
     * Tears down the auditor. Verbatim from auditor.js:2134–2140.
     * Idempotent: no-op if already DESTROYED.
     */
    destroy() {
      if (lifecycleState === State.DESTROYED) return;
      sim = null;
      hostConfig = null;
      hostContext = null;
      lifecycleState = State.DESTROYED;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightAuditor = EmberlightAuditor;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightAuditor;
}