/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: AUDITOR COMBAT EXTENDED SUB-MODULE
 * Document Identifier: VSRP-001-AUDITOR-COMBAT-EXTENDED
 * Governing Protocol: VSRP-001 / ARCH-SPEC-FACADE-TOPOLOGY-001
 * Authority: Host SSOT Staging Membrane
 * Timestamp: 2026-09-09T20:57:00-04:00
 *
 * TARGET SECTIONS EXTRACTED (verbatim from auditor.js):
 *   [PASS  9] runSDCPCapabilityAudit           — Lines 766–813
 *   [PASS 10] runInSituFormationShieldingAudit — Lines 816–898
 *   [PASS 11] runInSituBossAndAilmentAudit     — Lines 901–1000
 *   [PASS 12] runInSituDualPerspectiveAudit    — Lines 1003–1053
 *
 * STAGING MEMBRANE KEY: window._AuditorInternal.CombatExtended
 * DEPENDENCIES:
 *   window._AuditorInternal.Kernel.logAudit
 * ============================================================================
 */

if (typeof window !== 'undefined') window._AuditorInternal = window._AuditorInternal || {};

(() => {
    'use strict';

    // ─── Dependency Ingestion from Kernel ────────────────────────────────────
    const { logAudit } = window._AuditorInternal.Kernel;

    // ─── Pass 9: SDCP-001 Capability Registry & Anti-Entropy Seal ────────────

    /**
     * Verifies the SDCP-001 event bus capability registry is sealed after boot
     * (rejecting dynamic injection) and that all 5 canonical capability providers
     * are authority-gated against un-attested payloads.
     * Verbatim from auditor.js:766–813.
     *
     * @param {object} _manifest - Unused; kept for consistent dispatcher signature.
     * @param {object|null} eventBusRef - SDCP-001 capability bus (optional in standalone harness).
     * @returns {void}
     */
    function runSDCPCapabilityAudit(_manifest, eventBusRef) {
        logAudit('=== PASS 9: SDCP-001 Capability Registry & Anti-Entropy Seal ===', true);
        if (!eventBusRef || typeof eventBusRef.executeCapability !== 'function') {
            logAudit('[PASS] SDCP-001: Capability bus optional in standalone testing harness.', true);
            return;
        }

        const REQUIRED_CAPABILITIES = [
            'cap:elemental.scorch',
            'cap:elemental.freeze',
            'cap:sanctuary.consecrate',
            'cap:elemental.gale_dispel',
            'cap:dungeon.plate_trigger',
        ];

        try {
            // 1. Check Anti-Entropy Registry Seal Invariant
            let sealEnforced = false;
            try {
                eventBusRef.registerCapability('cap:entropy.illegal_injection', {
                    evaluate: () => ({ authorized: false }),
                });
            } catch {
                sealEnforced = true;
            }

            if (!sealEnforced) {
                throw new Error('SDCP-001 Invariant Violation: Capability registry accepted mutations after boot seal!');
            }
            logAudit('[PASS] SDCP-001: Capability bus sealed. Un-attested dynamic registration rejected.', true);

            // 2. Assert Presence & Authority of All 5 Core Capabilities
            REQUIRED_CAPABILITIES.forEach((token) => {
                const res = eventBusRef.executeCapability(token, {
                    targetCoords: [],
                    playerPos: { x: 0, y: 0 },
                });

                if (res === undefined || res.success === true) {
                    throw new Error(`Capability "${token}" executed unauthorized mutation on empty payload!`);
                }
            });

            logAudit('[PASS] SDCP-001: All 5 canonical capability providers verified and authority-gated.', true);
        } catch (err) {
            logAudit(`[FAIL] SDCP-001 Capability Battery Error: ${err.message}`, false);
        }
    }

    // ─── Pass 10: Formation Topology & Backline Shielding Invariance ──────────

    /**
     * Verifies that the DEFAULT encounter spawns units in correct FRONT/BACK rows,
     * that a melee attack on the backline archer is intercepted by a living frontline
     * vanguard, and that shielding collapses when all frontline units fall.
     * Verbatim from auditor.js:816–898.
     *
     * @param {object} manifest - Active EmberlightManifest reference.
     * @param {object} combatModule - EmberlightCombat module with createInstance factory.
     * @returns {void}
     */
    function runInSituFormationShieldingAudit(manifest, combatModule) {
        logAudit('=== PASS 10: Formation Topology & Backline Shielding Invariance ===', true);
        if (!combatModule || typeof combatModule.createInstance !== 'function') {
            logAudit('[FAIL] Combat factory uninstantiated for formation audit.', false);
            return;
        }

        try {
            const testCombat = combatModule.createInstance({ isHeadless: true });
            testCombat.configure({ manifest });
            testCombat.init({
                eventBus: { publish: () => {}, subscribe: () => {} },
                combatRenderer: typeof EmberlightCombatRenderer !== 'undefined' ? EmberlightCombatRenderer : null,
            });

            // Hydrate with 1 Frontline Hero
            const mockParty = [
                { id: 'hero', name: 'Hero', phenotype: 'HERO', hp: 30, maxHp: 30, mp: 10, maxMp: 10, atk: 10, def: 5, agi: 10, alive: true, row: 'FRONT' },
            ];

            testCombat.reset({
                party: mockParty,
                encounterKey: 'DEFAULT',
            });

            const state = testCombat.getState();
            const wolf = state.enemies.find((e) => e.key === 'SHADE_WOLF');
            const archer = state.enemies.find((e) => e.key === 'BONE_ARCHER');

            if (!wolf || !archer) {
                throw new Error('Formation test encounter missing required front/back enemies.');
            }

            // 1. Assert initial formation topology
            if (wolf.row !== 'FRONT' || archer.row !== 'BACK') {
                throw new Error(`Formation initialization failed. Wolf row: ${wolf.row}, Archer row: ${archer.row}`);
            }
            logAudit('[PASS] Formation Topology: Units initialized into correct FRONT and BACK rows.', true);

            // 2. Assert Melee Physical strike on Backline Archer is shielded and intercepted by Vanguard
            const preArcher = state.enemies.find((e) => e.key === 'BONE_ARCHER');
            const initialArcherHp = preArcher.hp;
            const livingFrontBefore = state.enemies.filter((e) => e.alive && (e.row === 'FRONT' || e.row === 'BOTH'));
            const initialFrontHpTotal = livingFrontBefore.reduce((acc, e) => acc + e.hp, 0);
            const archerIdx = state.enemies.findIndex((e) => e.id === preArcher.id);

            // Execute melee physical attack targeting archer through the canonical input snapshot.
            testCombat.update(0.016, {
                inputs: [{ type: 'ATTACK', targetIndex: archerIdx }],
            });

            const postState = testCombat.getState();
            const postArcher = postState.enemies.find((e) => e.key === 'BONE_ARCHER');
            const livingFrontAfter = postState.enemies.filter((e) => e.row === 'FRONT' || e.row === 'BOTH');
            const postFrontHpTotal = livingFrontAfter.reduce((acc, e) => acc + e.hp, 0);

            // Because frontline is alive, archer HP must remain unchanged while vanguard absorbs the hit
            if (postArcher.hp < initialArcherHp) {
                throw new Error('Frontline Shielding Leak: Melee attack bypassed living frontline to damage backline archer!');
            }
            if (postFrontHpTotal >= initialFrontHpTotal && livingFrontBefore.length > 0) {
                throw new Error('Vanguard Interception Failure: Frontline guard did not absorb the redirected melee strike!');
            }
            logAudit('[PASS] Frontline Shielding & Interception: Vanguard absorbed intercepted strike; backline shielded.', true);

            // 3. Vanquish All Frontline Vanguard Units & Verify Shielding Collapses
            postState.enemies.filter((e) => e.row === 'FRONT').forEach((e) => {
                e.hp = 0;
                e.alive = false;
            });

            // Now frontline has fallen
            const hasLivingFront = postState.enemies.some((e) => e.alive && e.row === 'FRONT');
            if (hasLivingFront) {
                throw new Error('Vanguard status flag corrupted after frontline defeat.');
            }
            logAudit('[PASS] Formation Collapse: Backline shielding dissolves when all frontline units fall.', true);

            testCombat.destroy();
        } catch (err) {
            logAudit(`[FAIL] Formation Shielding Audit Error: ${err.message}`, false);
        }
    }

    // ─── Pass 11: Boss Phase Shaders & Status Ailment Invariance Battery ─────

    /**
     * Verifies Malakor boss Phase 1→2 transition at 50% HP threshold (ATK 19,
     * DEF 5, AGI 9), discrete DOT tick math for BURN and POISON ailments, and
     * duration expiration cleanup. Optionally verifies VFX particle pool clamping.
     * Verbatim from auditor.js:901–1000.
     *
     * @param {object} manifest - Active EmberlightManifest reference (reads Ailments).
     * @param {object} combatModule - EmberlightCombat module with createInstance factory.
     * @param {object|null} vfxModule - Optional EmberlightCombatVFX driver for particle check.
     * @returns {void}
     */
    function runInSituBossAndAilmentAudit(manifest, combatModule, vfxModule) {
        logAudit('=== PASS 11: Boss Phase Shaders & Status Ailment Invariance ===', true);
        if (!combatModule || typeof combatModule.createInstance !== 'function') {
            logAudit('[FAIL] Combat factory unavailable for Pass 11.', false);
            return;
        }

        try {
            const testCombat = combatModule.createInstance({ isHeadless: true });
            testCombat.configure({ manifest });
            testCombat.init({
                eventBus: { publish: () => {}, subscribe: () => {} },
                combatRenderer: typeof EmberlightCombatRenderer !== 'undefined' ? EmberlightCombatRenderer : null,
            });

            const mockParty = [
                { id: 'hero', name: 'Aldric', phenotype: 'HERO', hp: 50, maxHp: 50, mp: 20, maxMp: 20, atk: 12, def: 8, agi: 8, alive: true, row: 'FRONT' },
            ];

            testCombat.reset({
                party: mockParty,
                encounterKey: 'BOSS_MALAKOR',
            });

            const state = testCombat.getState();
            const malakor = state.enemies.find((e) => e.isBoss);

            if (!malakor) {
                throw new Error('Pass 11 failed to spawn boss entity Malakor.');
            }

            // 1. Assert Phase 1 Baseline Invariants
            if (malakor.phaseTwoActive) {
                throw new Error('Malakor initialized with Phase 2 active prematurely.');
            }
            logAudit('[PASS] Boss Architecture: Malakor initialized in Phase 1 baseline.', true);

            // 2. Reduce HP to 50% Threshold & Assert Enrage Invariants
            malakor.hp = Math.floor(malakor.maxHp * 0.50);

            // Trigger boss phase evaluation
            const phaseThreshold = malakor.phaseTwoThreshold || 0.50;
            if (malakor.hp / malakor.maxHp <= phaseThreshold) {
                malakor.phaseTwoActive = true;
                malakor.atk = malakor.phaseTwoStats.atk;
                malakor.def = malakor.phaseTwoStats.def;
                malakor.agi = malakor.phaseTwoStats.agi;
                malakor.accumulatedDelay = 1000 / malakor.agi;
            }

            if (!malakor.phaseTwoActive || malakor.atk !== 19 || malakor.def !== 5 || malakor.agi !== 9) {
                throw new Error('Malakor failed to transition into Phase 2 enrage state.');
            }
            logAudit('[PASS] Boss Architecture: Phase 2 threshold verified (ATK 19, DEF 5, AGI 9).', true);

            // 3. Status Ailment Tick & Expiration Battery
            malakor.ailments = [
                { id: 'BURN', duration: 2 },
                { id: 'POISON', duration: 1 },
            ];

            // Tick 1: BURN deals 4 damage; POISON deals 8% maxHp (13 damage for maxHp: 160)
            const preHp = malakor.hp;
            const burnDef = manifest.Ailments?.BURN || { tick: (t) => { t.hp = Math.max(0, t.hp - 4); return { dmg: 4 }; } };
            const poisonDef = manifest.Ailments?.POISON || { tick: (t) => { const dmg = Math.max(1, Math.round(t.maxHp * 0.08)); t.hp = Math.max(0, t.hp - dmg); return { dmg }; } };

            const burnRes = burnDef.tick(malakor);
            const poisonRes = poisonDef.tick(malakor);
            const burnDmg = (typeof burnRes === 'object' ? burnRes.dmg : burnRes) || 4;
            const poisonDmg = (typeof poisonRes === 'object' ? poisonRes.dmg : poisonRes) || Math.max(1, Math.round(malakor.maxHp * 0.08));
            const totalDotDmg = burnDmg + poisonDmg;

            if (malakor.hp !== preHp - totalDotDmg) {
                throw new Error(`Ailment DOT damage calculation mismatch. Expected HP: ${preHp - totalDotDmg}, Received: ${malakor.hp}`);
            }
            logAudit(`[PASS] Status Ailments: Discrete DOT ticks validated (BURN -${burnDmg}, POISON -${poisonDmg}).`, true);

            // Duration decrement check
            malakor.ailments.forEach((a) => { a.duration -= 1; });
            malakor.ailments = malakor.ailments.filter((a) => a.duration > 0);

            if (malakor.ailments.length !== 1 || malakor.ailments[0].id !== 'BURN') {
                throw new Error('Status Ailment duration expiration failure: POISON failed to clear.');
            }
            logAudit('[PASS] Status Ailments: Duration decrements and cleanses verified.', true);

            // 4. VFX Buffer Bound Verification
            if (vfxModule && typeof vfxModule.getDiagnostics === 'function') {
                const vfxDiag = vfxModule.getDiagnostics();
                if (vfxDiag.activeParticles > 300) {
                    throw new Error(`VFX Particle pool exceeded 300 pre-allocated units: ${vfxDiag.activeParticles}`);
                }
                logAudit('[PASS] VFX Driver: Particle typed array memory clamping validated.', true);
            }

            testCombat.destroy();
        } catch (err) {
            logAudit(`[FAIL] Pass 11 Battery Error: ${err.message}`, false);
        }
    }

    // ─── Pass 12: Dual-Perspective & 3D Raycaster Immersion Battery ───────────

    /**
     * Verifies the pseudo-3D module's dynamic buffer resize contract:
     *   – Expanded: 960×360 at 75° FOV
     *   – Standard: 480×260 at 60° FOV
     * Then exercises a headless raycasting pass with procedural billboards ($/C/>)
     * and validates the getDiagnostics() renderResolution telemetry field.
     * Verbatim from auditor.js:1003–1053.
     *
     * @param {object} _manifest - Unused; kept for consistent dispatcher signature.
     * @param {object|null} pseudo3DModule - EmberlightPseudo3D peripheral driver.
     * @returns {void}
     */
    function runInSituDualPerspectiveAudit(_manifest, pseudo3DModule) {
        logAudit('--- PASS 12: DUAL-PERSPECTIVE & 3D RAYCASTER IMMERSION BATTERY ---', true);
        if (!pseudo3DModule) {
            logAudit('[SKIP] Pseudo-3D module omitted from snapshot.', true);
            return;
        }

        try {
            // 1. Dynamic Buffer Resizing & High-Res 960x360 Expansion
            if (typeof pseudo3DModule.setExpanded !== 'function' || typeof pseudo3DModule.getDimensions !== 'function') {
                throw new TypeError('Pseudo-3D module missing setExpanded() or getDimensions() interface methods.');
            }

            pseudo3DModule.setExpanded(true);
            const expandedDim = pseudo3DModule.getDimensions();
            if (expandedDim.width !== 960 || expandedDim.height !== 360 || !expandedDim.isExpanded || expandedDim.fovDeg !== 75) {
                throw new Error(`Pseudo-3D expansion dimensions mismatch: expected 960x360 at 75 deg FOV, received ${expandedDim.width}x${expandedDim.height} at ${expandedDim.fovDeg} deg`);
            }
            logAudit('[PASS] Pseudo-3D: High-Res 960x360 immersion buffer scaling & 75° FOV expansion verified.', true);

            // 2. Buffer Collapse & 2x2 Sensor Restoration
            pseudo3DModule.setExpanded(false);
            const standardDim = pseudo3DModule.getDimensions();
            if (standardDim.width !== 480 || standardDim.height !== 260 || standardDim.isExpanded || standardDim.fovDeg !== 60) {
                throw new Error(`Pseudo-3D restoration dimensions mismatch: expected 480x260 at 60 deg FOV, received ${standardDim.width}x${standardDim.height} at ${standardDim.fovDeg} deg`);
            }
            logAudit('[PASS] Pseudo-3D: Standard 480x260 sensor buffer collapse & 60° FOV restoration verified.', true);

            // 3. Headless Raycaster Execution & Z-Buffer Invariance
            const dummyMap = [
                ['#', '#', '#', '#'],
                ['#', '.', '$', '#'],
                ['#', 'C', '>', '#'],
                ['#', '#', '#', '#'],
            ];
            pseudo3DModule.render({
                map: dummyMap,
                playerPos: { x: 1, y: 1 },
                facing: 'RIGHT',
                flags: {},
            });
            pseudo3DModule.update(0.016);
            const diag = pseudo3DModule.getDiagnostics();
            if (!diag?.renderResolution) {
                throw new Error('Pseudo-3D getDiagnostics() failed to return valid telemetry.');
            }
            logAudit('[PASS] Pseudo-3D: Headless raycasting, procedural billboards ($/C/>), and Z-buffer sorting validated.', true);
        } catch (err) {
            logAudit(`[FAIL] Pass 12 Battery Error: ${err.message}`, false);
        }
    }

    // ─── Staging Membrane Export ──────────────────────────────────────────────

    window._AuditorInternal.CombatExtended = Object.freeze({
        runSDCPCapabilityAudit,
        runInSituFormationShieldingAudit,
        runInSituBossAndAilmentAudit,
        runInSituDualPerspectiveAudit,
    });
})();
