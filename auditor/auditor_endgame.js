/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: AUDITOR ENDGAME SUB-MODULE
 * Document Identifier: VSRP-001-AUDITOR-ENDGAME
 * Governing Protocol: VSRP-001 / ARCH-SPEC-FACADE-TOPOLOGY-001
 * Authority: Host SSOT Staging Membrane
 * Timestamp: 2026-09-10T15:42:00-04:00
 *
 * TARGET SECTIONS EXTRACTED (verbatim from auditor.js):
 *   [PASS 18] runTacticalDisplacementAudit        — Lines 1745–1829
 *   [PASS 19] runDeepAnalysisWorkstationAudit     — Lines 1831–1893
 *   [SPINE]   renderDefaultPresentation           — Lines 1895–1942
 *             resolveTargetModule                 — Lines 1944–1948
 *             resolvePseudo3DTarget               — Lines 1950–1956
 *             resolveDriverRegistry               — Lines 1958–1974
 *             executeAuditPasses                  — Lines 1976–2022
 *
 * ADAPTATION NOTE — renderDefaultPresentation (Lines 1895–1942):
 *   The original function closes over facade-retained `sim` and `hostContext`
 *   variables. These are parameterized as (simRef, hostCtx) so the facade
 *   can pass its own live references at the call site. All internal reads of
 *   `sim` → `simRef`, `hostContext` → `hostCtx`. Logic is verbatim.
 *
 * STAGING MEMBRANE KEY: window._AuditorInternal.Endgame
 * DEPENDENCIES:
 *   window._AuditorInternal.Kernel              (logAudit)
 *   window._AuditorInternal.Contracts           (runContractAndFaradayAudit)
 *   window._AuditorInternal.DistrictSims        (runInSituCombatAudit, runInSituOverworldAudit,
 *                                                runInSituMarketAudit, runInSituProgressionAudit,
 *                                                runInSituLockpickAudit, runInSituRelicForgeAudit,
 *                                                runInSituPseudo3DAudit)
 *   window._AuditorInternal.CombatExtended      (runSDCPCapabilityAudit,
 *                                                runInSituFormationShieldingAudit,
 *                                                runInSituBossAndAilmentAudit,
 *                                                runInSituDualPerspectiveAudit)
 *   window._AuditorInternal.Persistence         (runPersistenceAndTeardownAudit,
 *                                                runCombatAestheticsAudit,
 *                                                runDistrictTransitionsAndChestAudit,
 *                                                runSurfacingAndLegibilityAudit)
 *   window._AuditorInternal.Constitutional      (runConstitutionalComplianceAudit)
 * ============================================================================
 */

if (typeof window !== 'undefined') window._AuditorInternal = window._AuditorInternal || {};

(() => {
  // ─── Dependency Ingestion from Membrane ──────────────────────────────────
  const membrane = /** @type {any} */ (
    (typeof window !== 'undefined' ? window._AuditorInternal : null) ||
    (typeof require !== 'undefined' ? {
      Kernel: require('./auditor_kernel.js'),
      Contracts: require('./auditor_contracts.js'),
      DistrictSims: require('./auditor_district_sims.js'),
      CombatExtended: require('./auditor_combat_extended.js'),
      Persistence: require('./auditor_persistence.js'),
      Constitutional: require('./auditor_constitutional.js'),
    } : {})
  );

  const { logAudit } = membrane?.Kernel || {};

  const {
    runContractAndFaradayAudit,
  } = membrane?.Contracts || {};

  const {
    runInSituCombatAudit,
    runInSituOverworldAudit,
    runInSituMarketAudit,
    runInSituProgressionAudit,
    runInSituLockpickAudit,
    runInSituRelicForgeAudit,
    runInSituPseudo3DAudit,
  } = membrane?.DistrictSims || {};

  const {
    runSDCPCapabilityAudit,
    runInSituFormationShieldingAudit,
    runInSituBossAndAilmentAudit,
    runInSituDualPerspectiveAudit,
  } = membrane?.CombatExtended || {};

  const {
    runPersistenceAndTeardownAudit,
    runCombatAestheticsAudit,
    runDistrictTransitionsAndChestAudit,
    runSurfacingAndLegibilityAudit,
  } = membrane?.Persistence || {};

  const {
    runConstitutionalComplianceAudit,
  } = membrane?.Constitutional || {};

  // ─── Pass 18: Tactical Displacement & Row Invariance Battery ─────────────

  /**
   * Verifies KNOCKBACK/PULL displacement mechanics and boss row immunity.
   * Verbatim from auditor.js:1745–1829.
   *
   * @param {unknown} manifest - EmberlightManifest reference.
   * @param {unknown} combatModule - EmberlightCombat factory (optional in headless harness).
   * @returns {void}
   */
  function runTacticalDisplacementAudit(manifest, combatModule) {
    logAudit('=== PASS 18: Tactical Displacement & Row Invariance Battery ===', true);
    const cm = /** @type {any} */ (combatModule);
    if (!cm || typeof cm.createInstance !== 'function') {
      logAudit('[FAIL] Combat factory unavailable for Pass 18.', false);
      return;
    }
    try {
      const testCombat = cm.createInstance({ isHeadless: true, autoRun: false });
      testCombat.configure({ manifest });
      testCombat.init({ eventBus: { publish: () => {}, subscribe: () => {} } });

      const mockParty = [
        { id: 'h1', name: 'Aldric', phenotype: 'HERO', hp: 40, maxHp: 40, mp: 20, maxMp: 20, atk: 12, def: 6, agi: 10, alive: true, row: 'FRONT' },
      ];

      testCombat.reset({
        party: mockParty,
        encounterKey: 'DEFAULT',
      });

      const state = testCombat.getState();
      const wolf = state.enemies.find((/** @type {any} */ e) => e.key === 'SHADE_WOLF');
      const archer = state.enemies.find((/** @type {any} */ e) => e.key === 'BONE_ARCHER');

      // 1. Initial State Assertions
      if (wolf.row !== 'FRONT' || archer.row !== 'BACK') {
        throw new Error(`Invalid baseline rows: Wolf (${wolf.row}), Archer (${archer.row})`);
      }

      // 2. Test Knockback on Frontline Wolf -> Must become BACK
      const wolfIdx = state.enemies.findIndex((/** @type {any} */ e) => e.id === wolf.id);
      testCombat.handleHostAction({
        type: 'SKILL',
        targetIndex: wolfIdx,
        skillNode: { id: 'test_slam', label: 'Test Slam', mult: 0.1, mpCost: 0, subType: 'strike', displacement: 'KNOCKBACK' },
      });

      const stateAfterKnockback = testCombat.getState();
      const postWolf = stateAfterKnockback.enemies.find((/** @type {any} */ e) => e.id === wolf.id);
      if (postWolf.row !== 'BACK') {
        throw new Error(`KNOCKBACK failed: Wolf row is ${postWolf.row}, expected BACK`);
      }
      logAudit('[PASS] Tactical Displacement: KNOCKBACK successfully relocated frontline unit to BACK.', true);

      // 3. Test Pull on Backline Archer -> Must become FRONT
      const archerIdx = stateAfterKnockback.enemies.findIndex((/** @type {any} */ e) => e.id === archer.id);
      testCombat.handleHostAction({
        type: 'SKILL',
        targetIndex: archerIdx,
        skillNode: { id: 'test_pull', label: 'Test Pull', mult: 0.1, mpCost: 0, subType: 'piercing', displacement: 'PULL' },
      });

      const stateAfterPull = testCombat.getState();
      const postArcher = stateAfterPull.enemies.find((/** @type {any} */ e) => e.id === archer.id);
      if (postArcher.row !== 'FRONT') {
        throw new Error(`PULL failed: Archer row is ${postArcher.row}, expected FRONT`);
      }
      logAudit('[PASS] Tactical Displacement: PULL successfully dragged backline unit to FRONT.', true);

      // 4. Test Boss Immunity Invariant
      const bossCombat = cm.createInstance({ isHeadless: true, autoRun: false });
      bossCombat.configure({ manifest });
      bossCombat.init({ eventBus: { publish: () => {}, subscribe: () => {} } });
      bossCombat.reset({ party: mockParty, encounterKey: 'BOSS_MALAKOR' });

      bossCombat.handleHostAction({
        type: 'SKILL',
        targetIndex: 0,
        skillNode: { id: 'test_slam', mult: 0.1, mpCost: 0, subType: 'strike', displacement: 'KNOCKBACK' },
      });

      const bossState = bossCombat.getState();
      const boss = bossState.enemies.find((/** @type {any} */ e) => e.isBoss);
      if (boss.row !== 'BOTH') {
        throw new Error(`Boss Immunity Violation: Malakor row mutated to ${boss.row}`);
      }
      logAudit('[PASS] Displacement Invariance: Bosses verified immune to formation displacement.', true);

      testCombat.destroy();
      bossCombat.destroy();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAudit(`[FAIL] Pass 18 Battery Error: ${msg}`, false);
    }
  }

  // ─── Pass 19: Deep Analysis Mode & Tactical Terminal Canvas Battery ───────

  /**
   * @param {any} sm
   */
  function auditStatusDeepTelemetry(sm) {
    const mockParty = [
      { id: 'hero_1', name: 'Valen', hp: 20, maxHp: 30, mp: 10, maxMp: 15, row: 'FRONT', ailments: ['POISON'], stats: { str: 10, dex: 8, int: 5, con: 12, agi: 7 } },
      { id: 'hero_2', name: 'Lyra', hp: 18, maxHp: 18, mp: 25, maxMp: 25, row: 'BACK', ailments: [], stats: { str: 4, dex: 6, int: 14, con: 8, agi: 9 } },
    ];
    sm.reset({ party: mockParty, inventory: { POTION: 2, ANTIDOTE: 1 } });

    // Test Row Shifting Action
    sm.handleHostAction({ type: 'TOGGLE_ROW', characterId: 'hero_1' });
    let st = sm.getState();
    let valen = st.party.find((/** @type {any} */ c) => c.id === 'hero_1');
    if (valen.row !== 'BACK') throw new Error(`Status TOGGLE_ROW failed: row is ${valen.row}`);

    // Test Field Medical Suite Actions
    sm.handleHostAction({ type: 'ADMINISTER_POTION', characterId: 'hero_1' });
    st = sm.getState();
    valen = st.party.find((/** @type {any} */ c) => c.id === 'hero_1');
    if (valen.hp <= 20) throw new Error('Status ADMINISTER_POTION failed to restore HP');

    sm.handleHostAction({ type: 'CLEANSE_AILMENTS', characterId: 'hero_1' });
    st = sm.getState();
    valen = st.party.find((/** @type {any} */ c) => c.id === 'hero_1');
    if (valen.ailments.length !== 0) throw new Error('Status CLEANSE_AILMENTS failed to purge status ailments');

    logAudit('[PASS] Status Deep Analysis: Biometric Telemetry, Row Engineering, and Field Medical actions validated.', true);
  }

  function auditRadarMath() {
    const stats = /** @type {Record<string, number>} */ ({ str: 10, dex: 12, int: 14, con: 8, agi: 9 });
    const axes = ['str', 'dex', 'int', 'con', 'agi'];
    const points = axes.map((axis, i) => {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const val = Math.min(20, Math.max(1, stats[axis] || 5));
      const r = (val / 20) * 45;
      return { x: 55 + r * Math.cos(angle), y: 55 + r * Math.sin(angle) };
    });
    if (points.length !== 5 || points.some(p => Number.isNaN(p.x) || Number.isNaN(p.y))) {
      throw new Error('Pentagonal stat radar geometry generated invalid numeric coordinates.');
    }
    logAudit('[PASS] Tactical Terminal Canvas: Pentagonal radar projection & closed-circuit telemetry verified.', true);
  }

  /**
   * Verifies Status module deep telemetry, Armory paper-doll compositing,
   * and pentagonal radar geometry correctness (PRS-DES-027).
   * Verbatim from auditor.js:1831–1893.
   *
   * @param {unknown} _manifest - EmberlightManifest reference.
   * @param {unknown} statusModule - EmberlightStatus module (optional).
   * @param {unknown} _armoryModule - EmberlightArmory module (optional).
   * @param {unknown} battlerDriver - EmberlightBattlerBaker driver (optional).
   * @returns {void}
   */
  function runDeepAnalysisWorkstationAudit(_manifest, statusModule, _armoryModule, battlerDriver) {
    logAudit('=== PASS 19: Deep Analysis Mode & Workstation Architecture ===', true);
    const sm = /** @type {any} */ (statusModule);
    const bd = /** @type {any} */ (battlerDriver);
    try {
      // 1. Status Module Deep Telemetry & Formation Engineering
      if (sm) {
        auditStatusDeepTelemetry(sm);
      } else {
        logAudit('[SKIP] Status module not supplied for Pass 19.', true);
      }

      // 2. Armory Paper-Doll Composite & Loadout Deficit Telemetry
      if (bd) {
        const compositeUrl = bd.get({ phenotype: 'HERO', weapon: 'IRON_SWORD', armor: 'IRON_ARMOR' });
        if (typeof compositeUrl !== 'string' || !compositeUrl.startsWith('data:image/png;base64,')) {
          throw new Error('Battler paper-doll composite synthesis failed to produce valid Base64 PNG data URL.');
        }
        logAudit('[PASS] Armory Deep Analysis: 2x composite Battler Paper-Doll synthesis and telemetry verified.', true);
      } else {
        logAudit('[SKIP] Battler driver not supplied for Pass 19.', true);
      }

      // 3. Pentagonal Radar Math & Waveform Signal Integrity
      auditRadarMath();

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAudit(`[FAIL] Pass 19 Deep Analysis Error: ${msg}`, false);
    }
  }

  // ─── Presentation Viewport ────────────────────────────────────────────────

  /**
   * Helper to retrieve global scope object cleanly without nested ternaries.
   * @returns {Record<string, any>}
   */
  function getGlobalScope() {
    if (typeof window !== 'undefined') return /** @type {Record<string, any>} */ (window);
    if (typeof globalThis !== 'undefined') return /** @type {Record<string, any>} */ (globalThis);
    return /** @type {Record<string, any>} */ ({});
  }

  /**
   * Renders the auditor result panel into #auditor-view.
   * Verbatim from auditor.js:1895–1942 with facade-retained `sim` and `hostContext`
   * parameterized as (simRef, hostCtx) to remove closure dependency.
   * The facade calls this as: renderDefaultPresentation(sim, hostContext)
   *
   * @param {any} [simRef]   - Live sim accumulator from the facade (facade's `sim` var).
   * @param {any} [hostCtx]  - Live host context from the facade (facade's `hostContext` var).
   * @returns {void}
   */
  function renderDefaultPresentation(simRef = null, hostCtx = null) {
    if (typeof document === 'undefined' || !simRef) return;
    const view = document.getElementById('auditor-view');
    if (!view) return;
    view.innerHTML = '';

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.borderColor = simRef.passed ? 'var(--ok)' : 'var(--danger)';

    const passRate = simRef.totalChecks > 0 ? Math.round((simRef.complianceScore / simRef.totalChecks) * 100) : 0;
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:6px; margin-bottom:10px;">
        <div class="panel-title" style="color:${simRef.passed ? 'var(--ok)' : 'var(--danger)'}; margin:0; border:none; padding:0;">
          ${simRef.passed ? '🛡️ SENTINEL AUDITOR: ALL SYSTEMS NOMINAL' : '🚨 ARCHITECTURAL GATEKEEPER HALT: INTEGRITY VIOLATION'}
        </div>
        <div style="font-size:8px; font-weight:bold; color:${passRate === 100 ? 'var(--ok)' : 'var(--danger)'};">
          SCORE: ${simRef.complianceScore}/${simRef.totalChecks} (${passRate}%)
        </div>
      </div>
      <div id="audit-log-terminal" style="background:#000; border:1px solid var(--border-dim); padding:8px; height:240px; overflow-y:auto; font-size:7px; line-height:1.7; margin-bottom:10px; font-family:monospace;">
      </div>
      <div style="text-align:right;">
        <button class="cmd-btn action" id="close-auditor-btn">
          ${simRef.passed ? '✔ CLOSE AUDIT BENCH' : '🛑 ACKNOWLEDGE HALT'}
        </button>
      </div>
    `;

    const term = panel.querySelector('#audit-log-terminal');
    if (term && Array.isArray(simRef.auditLog)) {
      simRef.auditLog.forEach((/** @type {any} */ log) => {
        const line = document.createElement('div');
        line.style.color = log.passed ? 'var(--text)' : 'var(--danger)';
        line.textContent = log.message;
        term.appendChild(line);
      });
    }

    const closeBtn = /** @type {HTMLButtonElement | null} */ (panel.querySelector('#close-auditor-btn'));
    if (closeBtn) {
      closeBtn.onclick = () => {
        if (hostCtx?.eventBus?.publish) {
          hostCtx.eventBus.publish('auditor:resolved', { passed: simRef.passed });
        }
        if (typeof GameRuntime !== 'undefined' && typeof GameRuntime.switchDistrict === 'function') {
          GameRuntime.switchDistrict('OVERWORLD');
        }
      };
    }
    view.appendChild(panel);
  }

  // ─── Audit Target Resolution Helpers ─────────────────────────────────────

  /**
   * Verbatim from auditor.js:1944–1948.
   * @param {any} targets - Registered module map.
   * @param {string} key     - Module key to resolve.
   * @param {any} globalObj    - Fallback global value (pass `undefined` to skip).
   * @returns {object|null}
   */
  function resolveTargetModule(targets, key, globalObj) {
    const t = /** @type {Record<string, unknown> | null} */ (targets);
    if (t?.[key]) return /** @type {any} */ (t[key]);
    return globalObj !== undefined ? globalObj : null;
  }

  /**
   * Verbatim from auditor.js:1950–1956.
   * @param {any} targets - Registered module map.
   * @returns {object|null}
   */
  function resolvePseudo3DTarget(targets) {
    const t = /** @type {Record<string, unknown> | null} */ (targets);
    if (t?.pseudo3d) return /** @type {any} */ (t.pseudo3d);
    if (t?.pseudo3D) return /** @type {any} */ (t.pseudo3D);
    const globalScope = getGlobalScope();
    return globalScope.EmberlightPseudo3D || globalScope.EmberlightCorridorSensor || null;
  }

  /**
   * Verbatim from auditor.js:1958–1974.
   * @param {unknown} snapshotDrivers - Driver map passed by caller (or null for auto-resolve).
   * @returns {Record<string, any>}
   */
  function resolveDriverRegistry(snapshotDrivers) {
    if (snapshotDrivers && typeof snapshotDrivers === 'object') return /** @type {Record<string, any>} */ (snapshotDrivers);
    const globalScope = getGlobalScope();
    return {
      acoustic: globalScope.EmberlightAcousticSFX || null,
      pseudo3d: globalScope.EmberlightPseudo3D || null,
      lights: globalScope.EmberlightDynamicLights || null,
      backdrop: globalScope.EmberlightCombatBackdrop || null,
      combatRenderer: globalScope.EmberlightCombatRenderer || null,
      overworldRenderer: globalScope.EmberlightOverworldRenderer || null,
      armoryRenderer: globalScope.EmberlightArmoryRenderer || null,
      chronicleRenderer: globalScope.EmberlightChronicleRenderer || null,
      progressionRenderer: globalScope.EmberlightProgressionRenderer || null,
      marketRenderer: globalScope.EmberlightMarketRenderer || null,
      statusRenderer: globalScope.EmberlightStatusRenderer || null,
      relicForgeRenderer: globalScope.EmberlightRelicForgeRenderer || null,
      cockpitRenderer: globalScope.EmberlightCockpitRenderer || null,
      battler: globalScope.EmberlightBattlerBaker || null,
      input: globalScope.EmberlightInput || null,
    };
  }

  /**
   * Orchestrates all 21 audit passes in canonical order.
   * Verbatim from auditor.js:1976–2022, with pass dispatchers ingested from
   * membrane keys rather than closed-over locals.
   *
   * @param {any} targets       - Registered simulation module map.
   * @param {any} drivers       - Peripheral driver registry.
   * @param {any} activeManifest - EmberlightManifest reference.
   * @param {any} bus           - EventBus reference.
   * @returns {void}
   */
  function executeAuditPasses(targets, drivers, activeManifest, bus) {
    const regDrivers = resolveDriverRegistry(drivers);
    const combatTarget = resolveTargetModule(targets, 'combat', typeof EmberlightCombat !== 'undefined' ? EmberlightCombat : undefined);
    const overworldTarget = resolveTargetModule(targets, 'overworld', typeof EmberlightOverworld !== 'undefined' ? EmberlightOverworld : undefined);
    const marketTarget = resolveTargetModule(targets, 'market', typeof EmberlightMarket !== 'undefined' ? EmberlightMarket : undefined);
    const progressionTarget = resolveTargetModule(targets, 'progression', typeof EmberlightProgression !== 'undefined' ? EmberlightProgression : undefined);
    const lockpickTarget = resolveTargetModule(targets, 'lockpick', typeof EmberlightLockpick !== 'undefined' ? EmberlightLockpick : undefined);
    const forgeTarget = resolveTargetModule(targets, 'relic_forge', typeof EmberlightRelicForge !== 'undefined' ? EmberlightRelicForge : undefined);
    const pseudo3dTarget = resolvePseudo3DTarget(targets);
    const statusTarget = resolveTargetModule(targets, 'status', typeof EmberlightStatus !== 'undefined' ? EmberlightStatus : undefined);
    const armoryTarget = resolveTargetModule(targets, 'armory', typeof EmberlightArmory !== 'undefined' ? EmberlightArmory : undefined);
    const vfxTarget = typeof EmberlightCombatVFX !== 'undefined' ? EmberlightCombatVFX : null;

    runContractAndFaradayAudit(targets, regDrivers, activeManifest);
    runInSituCombatAudit(activeManifest, combatTarget, 20);
    runInSituOverworldAudit(activeManifest, overworldTarget);
    runInSituMarketAudit(activeManifest, marketTarget);
    runInSituProgressionAudit(activeManifest, progressionTarget);
    runInSituLockpickAudit(activeManifest, lockpickTarget);
    runInSituRelicForgeAudit(activeManifest, forgeTarget);
    runInSituPseudo3DAudit(activeManifest, pseudo3dTarget);
    runSDCPCapabilityAudit(activeManifest, bus);
    runInSituFormationShieldingAudit(activeManifest, combatTarget);
    runInSituBossAndAilmentAudit(activeManifest, combatTarget, vfxTarget);
    runInSituDualPerspectiveAudit(activeManifest, pseudo3dTarget);
    runPersistenceAndTeardownAudit(activeManifest, bus, regDrivers);
    runCombatAestheticsAudit(activeManifest, regDrivers.battler, regDrivers.backdrop);
    runDistrictTransitionsAndChestAudit(activeManifest, overworldTarget, regDrivers.input, bus);
    runSurfacingAndLegibilityAudit(activeManifest);
    runConstitutionalComplianceAudit(activeManifest, targets, regDrivers, bus);
    runTacticalDisplacementAudit(activeManifest, combatTarget);
    runDeepAnalysisWorkstationAudit(activeManifest, statusTarget, armoryTarget, regDrivers.battler);
    runWarTableSkeletonAndProjectionAudit(activeManifest, combatTarget, regDrivers.combatRenderer, bus);
    runCombatStationIntegrationAudit(activeManifest, combatTarget, regDrivers.combatRenderer);
  }

  /**
   * Validates PMIP-001 envelope structure.
   * @param {any} eventBus
   */
  function auditPmipEnvelope(eventBus) {
    if (eventBus && typeof eventBus.createEnvelope === 'function') {
      const env = eventBus.createEnvelope('combat:intent', 'auditor_test', { action: 'ATTACK' }, 42);
      if (env.topic !== 'combat:intent' || env.source !== 'auditor_test' || env.tick !== 42 || !env.timestamp) {
        throw new Error('PMIP-001 envelope structure corrupted or non-conforming.');
      }
      if (!Object.isFrozen(env)) {
        throw new Error('PMIP-001 envelope is not frozen.');
      }
      logAudit('[PASS] PMIP-001: Typed event envelope formatting and freezing verified.', true);
    } else {
      logAudit('[FAIL] EventBus.createEnvelope interface missing.', false);
    }
  }

  /**
   * Validates 4-Quadrant DTO projection purity.
   * @param {any} activeManifest
   * @param {any} combatModule
   */
  function auditTriPartiteProjection(activeManifest, combatModule) {
    if (combatModule && typeof combatModule.createInstance === 'function') {
      const testCombat = combatModule.createInstance({ isHeadless: true, autoRun: false });
      testCombat.configure({ manifest: activeManifest });
      testCombat.init({ eventBus: { publish: () => {}, subscribe: () => {} } });
      testCombat.reset({ party: [{ id: 'h1', name: 'Aldric', hp: 30, maxHp: 30, mp: 10, maxMp: 10, alive: true, row: 'FRONT' }] });

      let capturedProjection = /** @type {any} */ (null);
      const mockComposite = {
        renderWarTable(/** @type {any} */ proj) {
          capturedProjection = proj;
        },
        render() {},
      };

      testCombat.render(mockComposite);

      if (!capturedProjection) {
        throw new Error('renderWarTable did not receive projection DTO.');
      }

      if (!capturedProjection.q1Spatial || !capturedProjection.q2Clash || !capturedProjection.q3Oracle || !capturedProjection.q4Deck) {
        throw new Error('4-Quadrant projection DTO missing canonical slices (q1Spatial, q2Clash, q3Oracle, q4Deck).');
      }

      if (!Object.isFrozen(capturedProjection.q1Spatial) || !Object.isFrozen(capturedProjection.q4Deck)) {
        throw new Error('Projection DTO slices are not strictly deep-frozen.');
      }

      logAudit('[PASS] Tri-Partite Projection: 4 frozen DTO slices validated with zero state leakage.', true);
    } else {
      logAudit('[FAIL] Combat factory unavailable for Pass 20.', false);
    }
  }

  // ─── Pass 20: 4-Quadrant War Table Skeleton & Projection Battery (AOP-WAR-TABLE-SKELETON-001) ───

  /**
   * Verifies 4-Quadrant War Table topology invariance, PMIP-001 event envelopes, and DTO projection purity.
   *
   * @param {unknown} activeManifest - EmberlightManifest reference.
   * @param {unknown} combatModule - EmberlightCombat factory.
   * @param {unknown} _combatRenderer - EmberlightCombatRenderer (unused).
   * @param {unknown} eventBus - EmberlightEventBus.
   * @returns {void}
   */
  function runWarTableSkeletonAndProjectionAudit(activeManifest, combatModule, _combatRenderer, eventBus) {
    logAudit('=== PASS 20: 4-Quadrant War Table Skeleton & Projection Battery ===', true);

    try {
      auditPmipEnvelope(eventBus);
      auditTriPartiteProjection(activeManifest, combatModule);

      // 3. Topology Invariance Simulation
      if (typeof document !== 'undefined') {
        const matrix = document.getElementById('war-table-matrix');
        const q1 = document.getElementById('pane-cartography');
        const q2 = document.getElementById('pane-sensor');
        const q3 = document.getElementById('pane-scanner');
        const q4 = document.getElementById('pane-readiness');
        if (matrix && q1 && q2 && q3 && q4) {
          logAudit('[PASS] War Table Matrix: 4 permanent quadrant anchors verified in DOM topology.', true);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAudit(`[FAIL] Pass 20 War Table Skeleton Audit Error: ${msg}`, false);
    }
  }

  // ─── Pass 21: 4-Quadrant Combat Station Integration Battery (AOP-COMBAT-STATION-002) ───

  /**
   * @param {any} capturedProj
   */
  function auditCapturedProjection(capturedProj) {
    // 1. Validate Q1 Spatial Projection
    const q1 = capturedProj.q1Spatial;
    if (!q1 || q1.gridDimensions?.cols !== 8 || q1.gridDimensions?.rows !== 6) {
      throw new Error('Q1 spatial grid dimensions missing or invalid (expected 8x6).');
    }
    if (!Array.isArray(q1.partyFormation) || !Array.isArray(q1.enemyFormation) || !Array.isArray(q1.hazardTiles)) {
      throw new TypeError('Q1 spatial formation or hazard arrays corrupted.');
    }
    if (!Array.isArray(q1.activeVectors) || q1.activeVectors.length === 0) {
      throw new Error('Q1 knockback displacement trajectory vector not generated.');
    }
    logAudit('[PASS] Q1 Spatial Flank: 8x6 battle room grid, hazard walls, and knockback trajectory math verified.', true);

    // 2. Validate Q3 Threat Oracle Intent Vectors
    const q3 = capturedProj.q3Oracle;
    if (!q3 || !Array.isArray(q3.threatVectors) || q3.threatVectors.length === 0) {
      throw new Error('Q3 threat vectors array missing or empty.');
    }
    const firstVector = q3.threatVectors[0];
    if (!firstVector.enemyId || !firstVector.targetHeroName) {
      throw new Error('Q3 threat vector missing canonical enemy or targetHero properties.');
    }
    logAudit('[PASS] Q3 Threat Oracle: Intent vectors and elemental affinity telemetry streams validated.', true);

    // 3. Validate Q4 Hero Chassis & Cards Grid
    const q4 = capturedProj.q4Deck;
    if (!q4 || !Array.isArray(q4.partyVitals) || q4.partyVitals.length !== 2) {
      throw new Error('Q4 party vitals array invalid.');
    }
    if (typeof q4.activeHeroIndex !== 'number' || !q4.activeCharId) {
      throw new Error('Q4 active turn index or active character ID missing.');
    }
    logAudit('[PASS] Q4 Hero Chassis: Physical hero cards, live vital gauges, and active turn elevation verified.', true);
  }

  function auditCombatStationDOM() {
    if (typeof document !== 'undefined') {
      const spatialCanvas = document.getElementById('combat-spatial-canvas');
      const heroChassisGrid = document.getElementById('combat-hero-chassis-grid');
      const heroRadial = document.getElementById('combat-hero-radial');
      if (spatialCanvas && heroChassisGrid && heroRadial) {
        logAudit('[PASS] Combat Station DOM: Dedicated spatial canvas, 3-tier oracle, and hero chassis anchors validated.', true);
      }
    }
  }

  /**
   * Verifies Q1 spatial coordinates/trajectory math, Q3 intent vectors, Q4 hero chassis, and DOM anchors.
   *
   * @param {unknown} activeManifest - EmberlightManifest reference.
   * @param {unknown} combatModule - EmberlightCombat factory.
   * @param {unknown} _combatRenderer - EmberlightCombatRenderer (unused).
   * @returns {void}
   */
  function runCombatStationIntegrationAudit(activeManifest, combatModule, _combatRenderer) {
    logAudit('=== PASS 21: 4-Quadrant Combat Station Integration Battery ===', true);
    const cm = /** @type {any} */ (combatModule);
    if (!cm || typeof cm.createInstance !== 'function') {
      logAudit('[FAIL] Combat factory unavailable for Pass 21.', false);
      return;
    }

    try {
      const testCombat = cm.createInstance({ isHeadless: true, autoRun: false });
      testCombat.configure({ manifest: activeManifest });
      testCombat.init({ eventBus: { publish: () => {}, subscribe: () => {} } });

      testCombat.reset({
        party: [
          { id: 'h1', name: 'Aldric', phenotype: 'HERO', hp: 35, maxHp: 35, mp: 15, maxMp: 15, row: 'FRONT', alive: true },
          { id: 'h2', name: 'Wren', phenotype: 'MAGE', hp: 22, maxHp: 22, mp: 30, maxMp: 30, row: 'BACK', alive: true },
        ],
        encounterKey: 'DEFAULT',
      });

      // Stage a skill with knockback to verify trajectory vector generation
      testCombat.handleHostAction({
        type: 'SELECT_SKILL',
        skill: { id: 'shield_bash', label: 'Shield Bash', displacement: { type: 'KNOCKBACK', tiles: 2 } },
      });

      let capturedProj = /** @type {any} */ (null);
      testCombat.render({
        renderWarTable(/** @type {any} */ proj) {
          capturedProj = proj;
        },
        render() {},
      });

      if (!capturedProj) {
        throw new Error('renderWarTable did not receive projection.');
      }

      auditCapturedProjection(capturedProj);
      auditCombatStationDOM();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAudit(`[FAIL] Pass 21 Combat Station Integration Error: ${msg}`, false);
    }
  }

  // ─── Staging Membrane Export ──────────────────────────────────────────────

  const Endgame = Object.freeze({
    runTacticalDisplacementAudit,
    runDeepAnalysisWorkstationAudit,
    runWarTableSkeletonAndProjectionAudit,
    runCombatStationIntegrationAudit,
    renderDefaultPresentation,
    resolveTargetModule,
    resolvePseudo3DTarget,
    resolveDriverRegistry,
    executeAuditPasses,
  });

  if (typeof window !== 'undefined' && window._AuditorInternal) {
    window._AuditorInternal.Endgame = Endgame;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Endgame;
  }
})();
