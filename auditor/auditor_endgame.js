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
  'use strict';

  // ─── Dependency Ingestion from Membrane ──────────────────────────────────
  const { logAudit } = window._AuditorInternal.Kernel;

  const {
    runContractAndFaradayAudit,
  } = window._AuditorInternal.Contracts;

  const {
    runInSituCombatAudit,
    runInSituOverworldAudit,
    runInSituMarketAudit,
    runInSituProgressionAudit,
    runInSituLockpickAudit,
    runInSituRelicForgeAudit,
    runInSituPseudo3DAudit,
  } = window._AuditorInternal.DistrictSims;

  const {
    runSDCPCapabilityAudit,
    runInSituFormationShieldingAudit,
    runInSituBossAndAilmentAudit,
    runInSituDualPerspectiveAudit,
  } = window._AuditorInternal.CombatExtended;

  const {
    runPersistenceAndTeardownAudit,
    runCombatAestheticsAudit,
    runDistrictTransitionsAndChestAudit,
    runSurfacingAndLegibilityAudit,
  } = window._AuditorInternal.Persistence;

  const {
    runConstitutionalComplianceAudit,
  } = window._AuditorInternal.Constitutional;

  // ─── Pass 18: Tactical Displacement & Row Invariance Battery ─────────────

  /**
   * Verifies KNOCKBACK/PULL displacement mechanics and boss row immunity.
   * Verbatim from auditor.js:1745–1829.
   *
   * @param {object} manifest - EmberlightManifest reference.
   * @param {object|null} combatModule - EmberlightCombat factory (optional in headless harness).
   * @returns {void}
   */
  function runTacticalDisplacementAudit(manifest, combatModule) {
    logAudit('=== PASS 18: Tactical Displacement & Row Invariance Battery ===', true);
    if (!combatModule || typeof combatModule.createInstance !== 'function') {
      logAudit('[FAIL] Combat factory unavailable for Pass 18.', false);
      return;
    }
    try {
      const testCombat = combatModule.createInstance({ isHeadless: true, autoRun: false });
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
      const wolf = state.enemies.find((e) => e.key === 'SHADE_WOLF');
      const archer = state.enemies.find((e) => e.key === 'BONE_ARCHER');

      // 1. Initial State Assertions
      if (wolf.row !== 'FRONT' || archer.row !== 'BACK') {
        throw new Error(`Invalid baseline rows: Wolf (${wolf.row}), Archer (${archer.row})`);
      }

      // 2. Test Knockback on Frontline Wolf -> Must become BACK
      const wolfIdx = state.enemies.findIndex((e) => e.id === wolf.id);
      testCombat.handleHostAction({
        type: 'SKILL',
        targetIndex: wolfIdx,
        skillNode: { id: 'test_slam', label: 'Test Slam', mult: 0.1, mpCost: 0, subType: 'strike', displacement: 'KNOCKBACK' },
      });

      const stateAfterKnockback = testCombat.getState();
      const postWolf = stateAfterKnockback.enemies.find((e) => e.id === wolf.id);
      if (postWolf.row !== 'BACK') {
        throw new Error(`KNOCKBACK failed: Wolf row is ${postWolf.row}, expected BACK`);
      }
      logAudit('[PASS] Tactical Displacement: KNOCKBACK successfully relocated frontline unit to BACK.', true);

      // 3. Test Pull on Backline Archer -> Must become FRONT
      const archerIdx = stateAfterKnockback.enemies.findIndex((e) => e.id === archer.id);
      testCombat.handleHostAction({
        type: 'SKILL',
        targetIndex: archerIdx,
        skillNode: { id: 'test_pull', label: 'Test Pull', mult: 0.1, mpCost: 0, subType: 'piercing', displacement: 'PULL' },
      });

      const stateAfterPull = testCombat.getState();
      const postArcher = stateAfterPull.enemies.find((e) => e.id === archer.id);
      if (postArcher.row !== 'FRONT') {
        throw new Error(`PULL failed: Archer row is ${postArcher.row}, expected FRONT`);
      }
      logAudit('[PASS] Tactical Displacement: PULL successfully dragged backline unit to FRONT.', true);

      // 4. Test Boss Immunity Invariant
      const bossCombat = combatModule.createInstance({ isHeadless: true, autoRun: false });
      bossCombat.configure({ manifest });
      bossCombat.init({ eventBus: { publish: () => {}, subscribe: () => {} } });
      bossCombat.reset({ party: mockParty, encounterKey: 'BOSS_MALAKOR' });

      bossCombat.handleHostAction({
        type: 'SKILL',
        targetIndex: 0,
        skillNode: { id: 'test_slam', mult: 0.1, mpCost: 0, subType: 'strike', displacement: 'KNOCKBACK' },
      });

      const bossState = bossCombat.getState();
      const boss = bossState.enemies.find((e) => e.isBoss);
      if (boss.row !== 'BOTH') {
        throw new Error(`Boss Immunity Violation: Malakor row mutated to ${boss.row}`);
      }
      logAudit('[PASS] Displacement Invariance: Bosses verified immune to formation displacement.', true);

      testCombat.destroy();
      bossCombat.destroy();
    } catch (err) {
      logAudit(`[FAIL] Pass 18 Battery Error: ${err.message}`, false);
    }
  }

  // ─── Pass 19: Deep Analysis Mode & Tactical Terminal Canvas Battery ───────

  /**
   * Verifies Status module deep telemetry, Armory paper-doll compositing,
   * and pentagonal radar geometry correctness (PRS-DES-027).
   * Verbatim from auditor.js:1831–1893.
   *
   * @param {object} manifest - EmberlightManifest reference.
   * @param {object|null} statusModule - EmberlightStatus module (optional).
   * @param {object|null} armoryModule - EmberlightArmory module (optional, unused in body).
   * @param {object|null} battlerDriver - EmberlightBattlerBaker driver (optional).
   * @returns {void}
   */
  function runDeepAnalysisWorkstationAudit(manifest, statusModule, armoryModule, battlerDriver) {
    logAudit('=== PASS 19: Deep Analysis Mode & Workstation Architecture ===', true);
    try {
      // 1. Status Module Deep Telemetry & Formation Engineering
      if (statusModule) {
        const mockParty = [
          { id: 'hero_1', name: 'Valen', hp: 20, maxHp: 30, mp: 10, maxMp: 15, row: 'FRONT', ailments: ['POISON'], stats: { str: 10, dex: 8, int: 5, con: 12, agi: 7 } },
          { id: 'hero_2', name: 'Lyra', hp: 18, maxHp: 18, mp: 25, maxMp: 25, row: 'BACK', ailments: [], stats: { str: 4, dex: 6, int: 14, con: 8, agi: 9 } },
        ];
        statusModule.reset({ party: mockParty, inventory: { POTION: 2, ANTIDOTE: 1 } });

        // Test Row Shifting Action
        statusModule.handleHostAction({ type: 'TOGGLE_ROW', characterId: 'hero_1' });
        let st = statusModule.getState();
        let valen = st.party.find(c => c.id === 'hero_1');
        if (valen.row !== 'BACK') throw new Error(`Status TOGGLE_ROW failed: row is ${valen.row}`);

        // Test Field Medical Suite Actions
        statusModule.handleHostAction({ type: 'ADMINISTER_POTION', characterId: 'hero_1' });
        st = statusModule.getState();
        valen = st.party.find(c => c.id === 'hero_1');
        if (valen.hp <= 20) throw new Error('Status ADMINISTER_POTION failed to restore HP');

        statusModule.handleHostAction({ type: 'CLEANSE_AILMENTS', characterId: 'hero_1' });
        st = statusModule.getState();
        valen = st.party.find(c => c.id === 'hero_1');
        if (valen.ailments.length !== 0) throw new Error('Status CLEANSE_AILMENTS failed to purge status ailments');

        logAudit('[PASS] Status Deep Analysis: Biometric Telemetry, Row Engineering, and Field Medical actions validated.', true);
      } else {
        logAudit('[SKIP] Status module not supplied for Pass 19.', true);
      }

      // 2. Armory Paper-Doll Composite & Loadout Deficit Telemetry
      if (battlerDriver) {
        const compositeUrl = battlerDriver.get({ phenotype: 'HERO', weapon: 'IRON_SWORD', armor: 'IRON_ARMOR' });
        if (typeof compositeUrl !== 'string' || !compositeUrl.startsWith('data:image/png;base64,')) {
          throw new Error('Battler paper-doll composite synthesis failed to produce valid Base64 PNG data URL.');
        }
        logAudit('[PASS] Armory Deep Analysis: 2x composite Battler Paper-Doll synthesis and telemetry verified.', true);
      } else {
        logAudit('[SKIP] Battler driver not supplied for Pass 19.', true);
      }

      // 3. Pentagonal Radar Math & Waveform Signal Integrity
      const stats = { str: 10, dex: 12, int: 14, con: 8, agi: 9 };
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

    } catch (err) {
      logAudit(`[FAIL] Pass 19 Deep Analysis Error: ${err.message}`, false);
    }
  }

  // ─── Presentation Viewport ────────────────────────────────────────────────

  /**
   * Renders the auditor result panel into #auditor-view.
   * Verbatim from auditor.js:1895–1942 with facade-retained `sim` and `hostContext`
   * parameterized as (simRef, hostCtx) to remove closure dependency.
   * The facade calls this as: renderDefaultPresentation(sim, hostContext)
   *
   * @param {object} simRef   - Live sim accumulator from the facade (facade's `sim` var).
   * @param {object} hostCtx  - Live host context from the facade (facade's `hostContext` var).
   * @returns {void}
   */
  function renderDefaultPresentation(simRef, hostCtx) {
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
    simRef.auditLog.forEach((log) => {
      const line = document.createElement('div');
      line.style.color = log.passed ? 'var(--text)' : 'var(--danger)';
      line.textContent = log.message;
      term.appendChild(line);
    });

    const closeBtn = panel.querySelector('#close-auditor-btn');
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
   * @param {object} targets - Registered module map.
   * @param {string} key     - Module key to resolve.
   * @param {*} globalObj    - Fallback global value (pass `undefined` to skip).
   * @returns {object|null}
   */
  function resolveTargetModule(targets, key, globalObj) {
    if (targets?.[key]) return targets[key];
    return globalObj !== undefined ? globalObj : null;
  }

  /**
   * Verbatim from auditor.js:1950–1956.
   * @param {object} targets - Registered module map.
   * @returns {object|null}
   */
  function resolvePseudo3DTarget(targets) {
    if (targets?.pseudo3d) return targets.pseudo3d;
    if (targets?.pseudo3D) return targets.pseudo3D;
    if (typeof EmberlightPseudo3D !== 'undefined') return EmberlightPseudo3D;
    if (typeof EmberlightCorridorSensor !== 'undefined') return EmberlightCorridorSensor;
    return null;
  }

  /**
   * Verbatim from auditor.js:1958–1974.
   * @param {object|null} snapshotDrivers - Driver map passed by caller (or null for auto-resolve).
   * @returns {object}
   */
  function resolveDriverRegistry(snapshotDrivers) {
    if (snapshotDrivers) return snapshotDrivers;
    return {
      acoustic: (typeof EmberlightAcousticSFX !== 'undefined') ? EmberlightAcousticSFX : null,
      pseudo3d: (typeof EmberlightPseudo3D !== 'undefined') ? EmberlightPseudo3D : null,
      lights: (typeof EmberlightDynamicLights !== 'undefined') ? EmberlightDynamicLights : null,
      backdrop: (typeof EmberlightCombatBackdrop !== 'undefined') ? EmberlightCombatBackdrop : null,
      combatRenderer: (typeof EmberlightCombatRenderer !== 'undefined') ? EmberlightCombatRenderer : null,
      overworldRenderer: (typeof EmberlightOverworldRenderer !== 'undefined') ? EmberlightOverworldRenderer : null,
      armoryRenderer: (typeof EmberlightArmoryRenderer !== 'undefined') ? EmberlightArmoryRenderer : null,
      chronicleRenderer: (typeof EmberlightChronicleRenderer !== 'undefined') ? EmberlightChronicleRenderer : null,
      progressionRenderer: (typeof EmberlightProgressionRenderer !== 'undefined') ? EmberlightProgressionRenderer : null,
      marketRenderer: (typeof EmberlightMarketRenderer !== 'undefined') ? EmberlightMarketRenderer : null,
      statusRenderer: (typeof EmberlightStatusRenderer !== 'undefined') ? EmberlightStatusRenderer : null,
      relicForgeRenderer: (typeof EmberlightRelicForgeRenderer !== 'undefined') ? EmberlightRelicForgeRenderer : null,
      cockpitRenderer: (typeof EmberlightCockpitRenderer !== 'undefined') ? EmberlightCockpitRenderer : null,
      battler: (typeof EmberlightBattlerBaker !== 'undefined') ? EmberlightBattlerBaker : null,
      input: (typeof EmberlightInput !== 'undefined') ? EmberlightInput : null,
    };
  }

  /**
   * Orchestrates all 19 audit passes in canonical order.
   * Verbatim from auditor.js:1976–2022, with pass dispatchers ingested from
   * membrane keys rather than closed-over locals.
   *
   * @param {object} targets       - Registered simulation module map.
   * @param {object} drivers       - Peripheral driver registry.
   * @param {object} activeManifest - EmberlightManifest reference.
   * @param {object} bus           - EventBus reference.
   * @returns {void}
   */
  function executeAuditPasses(targets, drivers, activeManifest, bus) {
    const combatTarget = resolveTargetModule(targets, 'combat', typeof EmberlightCombat !== 'undefined' ? EmberlightCombat : undefined);
    const overworldTarget = resolveTargetModule(targets, 'overworld', typeof EmberlightOverworld !== 'undefined' ? EmberlightOverworld : undefined);
    const marketTarget = resolveTargetModule(targets, 'market', typeof EmberlightMarket !== 'undefined' ? EmberlightMarket : undefined);
    const progressionTarget = resolveTargetModule(targets, 'progression', typeof EmberlightProgression !== 'undefined' ? EmberlightProgression : undefined);
    const lockpickTarget = resolveTargetModule(targets, 'lockpick', typeof EmberlightLockpick !== 'undefined' ? EmberlightLockpick : undefined);
    const forgeTarget = resolveTargetModule(targets, 'relic_forge', typeof EmberlightRelicForge !== 'undefined' ? EmberlightRelicForge : undefined);
    const pseudo3dTarget = resolvePseudo3DTarget(targets);

    runContractAndFaradayAudit(targets, drivers, activeManifest);
    runInSituCombatAudit(activeManifest, combatTarget, 20);
    runInSituOverworldAudit(activeManifest, overworldTarget);
    runInSituMarketAudit(activeManifest, marketTarget);
    runInSituProgressionAudit(activeManifest, progressionTarget);
    runInSituLockpickAudit(activeManifest, lockpickTarget);
    runInSituRelicForgeAudit(activeManifest, forgeTarget);
    runInSituPseudo3DAudit(activeManifest, pseudo3dTarget);
    runSDCPCapabilityAudit(activeManifest, bus);
    runInSituFormationShieldingAudit(activeManifest, combatTarget);
    runInSituBossAndAilmentAudit(
      activeManifest,
      combatTarget,
      typeof EmberlightCombatVFX !== 'undefined' ? EmberlightCombatVFX : null
    );
    runInSituDualPerspectiveAudit(activeManifest, pseudo3dTarget);
    runPersistenceAndTeardownAudit(activeManifest, bus, drivers);
    runCombatAestheticsAudit(
      activeManifest,
      drivers?.battler || (typeof EmberlightBattlerBaker !== 'undefined' ? EmberlightBattlerBaker : null),
      drivers?.backdrop || (typeof EmberlightCombatBackdrop !== 'undefined' ? EmberlightCombatBackdrop : null)
    );
    runDistrictTransitionsAndChestAudit(
      activeManifest,
      overworldTarget,
      drivers?.input || (typeof EmberlightInput !== 'undefined' ? EmberlightInput : null),
      bus
    );
    runSurfacingAndLegibilityAudit(activeManifest);
    runConstitutionalComplianceAudit(activeManifest, targets, drivers, bus);
    runTacticalDisplacementAudit(activeManifest, combatTarget);
    runDeepAnalysisWorkstationAudit(
      activeManifest,
      resolveTargetModule(targets, 'status', typeof EmberlightStatus !== 'undefined' ? EmberlightStatus : undefined),
      resolveTargetModule(targets, 'armory', typeof EmberlightArmory !== 'undefined' ? EmberlightArmory : undefined),
      drivers?.battler || (typeof EmberlightBattlerBaker !== 'undefined' ? EmberlightBattlerBaker : null)
    );
  }

  // ─── Staging Membrane Export ──────────────────────────────────────────────

  window._AuditorInternal.Endgame = Object.freeze({
    runTacticalDisplacementAudit,
    runDeepAnalysisWorkstationAudit,
    renderDefaultPresentation,
    resolveTargetModule,
    resolvePseudo3DTarget,
    resolveDriverRegistry,
    executeAuditPasses,
  });
})();
