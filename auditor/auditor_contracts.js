/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: AUDITOR CONTRACTS SUB-MODULE
 * Document Identifier: VSRP-001-AUDITOR-CONTRACTS
 * Governing Protocol: VSRP-001 / ARCH-SPEC-FACADE-TOPOLOGY-001
 * Authority: Host SSOT Staging Membrane
 * Timestamp: 2026-09-09T20:44:00-04:00
 *
 * TARGET SECTIONS EXTRACTED (verbatim from auditor.js):
 *   [PASS 1] auditTenantSignaturesAndActions — Lines 139–159
 *   [PASS 1] auditCombatRendererDelegation   — Lines 161–178
 *   [PASS 1] auditFaradayIsolation           — Lines 180–212
 *   [PASS 1] auditPeripheralDrivers          — Lines 214–248
 *   [PASS 1] auditRendererPresentations      — Lines 250–317
 *   [PASS 1] runContractAndFaradayAudit      — Lines 320–374
 *
 * PRIVATE CONSTS (exclusively used by this sub-module, per schema decision):
 *   REQUIRED_LIFECYCLE_METHODS  (originally auditor.js:25–35)
 *   PERIPHERAL_DRIVER_CONTRACTS (originally auditor.js:38–102)
 *
 * STAGING MEMBRANE KEY: window._AuditorInternal.Contracts
 * DEPENDENCIES:
 *   window._AuditorInternal.Kernel.logAudit
 *   window._AuditorInternal.Kernel.deepFreeze
 * ============================================================================
 */

if (typeof window !== 'undefined') window._AuditorInternal = window._AuditorInternal || {};

(() => {
    // ─── Dependency Ingestion from Kernel ────────────────────────────────────
    const { logAudit, deepFreeze } = /** @type {any} */ (
        (typeof window !== 'undefined' ? window._AuditorInternal?.Kernel : null) ||
        (typeof require !== 'undefined' ? require('./auditor_kernel.js') : {})
    );

    // ─── Private Constants (exclusively consumed by Pass 1 functions) ─────────

    /**
     * Canonical 9-method VSRP-001 lifecycle interface.
     * Verbatim from auditor.js:25–35.
     * @type {ReadonlyArray<string>}
     */
    const REQUIRED_LIFECYCLE_METHODS = Object.freeze([
        'configure',
        'init',
        'reset',
        'update',
        'render',
        'getState',
        'getDiagnostics',
        'getModuleInfo',
        'destroy',
    ]);

    /**
     * Peripheral driver signature registry.
     * Verbatim from auditor.js:38–102.
     * @type {Readonly<Record<string, {name: string, required: string[], expectedServiceId?: string, expectedDriverId?: string}>>}
     */
    const PERIPHERAL_DRIVER_CONTRACTS = Object.freeze({
        acoustic: {
            name: 'EmberlightAcousticSFX',
            required: ['init', 'play', 'getDiagnostics', 'destroy'],
            expectedServiceId: 'acoustic_sfx_driver',
        },
        pseudo3d: {
            name: 'EmberlightPseudo3D',
            required: ['init', 'update', 'render', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'pseudo_3d_renderer',
        },
        lights: {
            name: 'EmberlightDynamicLights',
            required: ['init', 'pause', 'resume', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'dynamic_lights_driver',
        },
        combatRenderer: {
            name: 'EmberlightCombatRenderer',
            required: ['init', 'render', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'combat_renderer',
        },
        overworldRenderer: {
            name: 'EmberlightOverworldRenderer',
            required: ['init', 'renderOverworld', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'overworld_renderer',
        },
        armoryRenderer: {
            name: 'EmberlightArmoryRenderer',
            required: ['renderArmory', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'armory_renderer',
        },
        chronicleRenderer: {
            name: 'EmberlightChronicleRenderer',
            required: ['renderChronicle', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'chronicle_renderer',
        },
        progressionRenderer: {
            name: 'EmberlightProgressionRenderer',
            required: ['renderProgression', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'progression_renderer',
        },
        marketRenderer: {
            name: 'EmberlightMarketRenderer',
            required: ['renderMarket', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'market_renderer',
        },
        statusRenderer: {
            name: 'EmberlightStatusRenderer',
            required: ['renderStatus', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'status_renderer',
        },
        relicForgeRenderer: {
            name: 'EmberlightRelicForgeRenderer',
            required: ['renderRelicForge', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'relic_forge_renderer',
        },
        cockpitRenderer: {
            name: 'EmberlightCockpitRenderer',
            required: ['init', 'render', 'getDiagnostics', 'destroy'],
            expectedDriverId: 'cockpit_renderer',
        },
    });

    // ─── Pass 1 Audit Helpers ────────────────────────────────────────────────

    /**
     * Verifies the 9 canonical VSRP-001 lifecycle methods and the optional
     * handleHostAction contract on a registered simulation tenant.
     * Verbatim from auditor.js:139–159.
     *
     * @param {string} name - Tenant registry key.
     * @param {unknown} mod - Simulation tenant module instance.
     * @returns {void}
     */
    function auditTenantSignaturesAndActions(name, mod) {
        const m = /** @type {Record<string, unknown>} */ (mod);
        let signaturePass = true;
        for (const method of REQUIRED_LIFECYCLE_METHODS) {
            if (typeof m[method] !== 'function') {
                logAudit(`[FAIL] ${name} missing required interface: ${method}()`, false);
                signaturePass = false;
            }
        }
        if (signaturePass) {
            logAudit(`[PASS] ${name}: 9/9 Canonical VSRP-001 lifecycle methods verified.`, true);
        }

        const interactiveTenants = ['combat', 'overworld', 'progression', 'script', 'lockpick', 'settings'];
        if (interactiveTenants.includes(name)) {
            if (typeof m.handleHostAction === 'function') {
                logAudit(`[PASS] ${name}: Interactive host action contract verified (handleHostAction exposed).`, true);
            } else {
                logAudit(`[FAIL] ${name}: Missing interactive host action contract: handleHostAction()`, false);
            }
        }
    }

    /**
     * Verifies that EmberlightCombat.render(renderer) correctly delegates
     * snapshot and dispatch callback to the provided Tier 3 renderer.
     * Verbatim from auditor.js:161–178.
     *
     * @param {unknown} testInst - Live combat instance pre-loaded with a reset snapshot.
     * @returns {void}
     */
    function auditCombatRendererDelegation(testInst) {
        let customRendererInvoked = false;
        let customRendererReceivedDispatch = false;
        const mockCustomRenderer = {
            render: (/** @type {unknown} */ _snapshot, /** @type {unknown} */ dispatch) => {
                customRendererInvoked = true;
                if (typeof dispatch === 'function') {
                    customRendererReceivedDispatch = true;
                }
            },
        };
        /** @type {any} */ (testInst).render(mockCustomRenderer);
        if (customRendererInvoked && customRendererReceivedDispatch) {
            logAudit('[PASS] combat: render(renderer) properly delegated snapshot and dispatch callback to Tier 3 renderer.', true);
        } else {
            logAudit('[FAIL] combat: render(renderer) failed to delegate to provided Tier 3 renderer or pass dispatch callback.', false);
        }
    }

    /**
     * Verifies that a simulation tenant cannot mutate a frozen host snapshot
     * (Faraday Cage contract). For combat, exercises the full createInstance
     * factory path and renderer delegation.
     * Verbatim from auditor.js:180–212.
     *
     * @param {string} name - Tenant registry key.
     * @param {unknown} mod - Simulation tenant module instance.
     * @param {unknown[]} mockParty - Synthetic party roster for snapshot construction.
     * @param {unknown} manifest - Active EmberlightManifest reference.
     * @param {unknown} registeredDrivers - Resolved peripheral driver registry.
     * @returns {void}
     */
    function auditFaradayIsolation(name, mod, mockParty, manifest, registeredDrivers) {
        const m = /** @type {any} */ (mod);
        try {
            const frozenSnapshot = deepFreeze({
                party: structuredClone(mockParty),
                gold: 100,
                inventory: { POTION: 3, ETHER: 1 },
                playerPos: { x: 1, y: 1 },
                map: [['#', '#', '#'], ['.', '.', '.'], ['#', '#', '#']],
                shopId: 'VILLAGE_BLACKSMITH',
                encounterKey: 'DEFAULT',
                scriptId: null,
                active: false,
                isHeadless: true,
            });

            if (name === 'combat' && typeof m.createInstance === 'function') {
                const testInst = m.createInstance({ isHeadless: true });
                testInst.configure({ manifest });
                testInst.init({
                    eventBus: { publish: () => {}, subscribe: () => {} },
                    combatRenderer: registeredDrivers ? /** @type {any} */ (registeredDrivers).combatRenderer : null,
                });
                testInst.reset(frozenSnapshot);
                auditCombatRendererDelegation(testInst);
                testInst.destroy();
            } else {
                m.reset(frozenSnapshot);
            }
            logAudit(`[PASS] ${name}: Faraday Isolation verified (zero snapshot mutation).`, true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logAudit(`[FAIL] ${name}: Faraday Isolation VIOLATION! ${msg}`, false);
        }
    }

    /**
     * @param {{ name: string, expectedServiceId?: string, expectedDriverId?: string }} contract
     * @param {Record<string, unknown>} driverInstance
     */
    function auditDriverDiagnostics(contract, driverInstance) {
        if (typeof driverInstance.getDiagnostics !== 'function') return;
        try {
            const diag = /** @type {any} */ (driverInstance.getDiagnostics());
            if (contract.expectedServiceId && diag.serviceId !== contract.expectedServiceId) {
                logAudit(`[FAIL] ${contract.name} reported invalid serviceId: "${diag.serviceId}" (expected "${contract.expectedServiceId}").`, false);
            } else if (contract.expectedDriverId && diag.driverId !== contract.expectedDriverId) {
                logAudit(`[FAIL] ${contract.name} reported invalid driverId: "${diag.driverId}" (expected "${contract.expectedDriverId}").`, false);
            } else {
                logAudit(`[PASS] ${contract.name}: Diagnostics verified and telemetry active.`, true);
            }
        } catch (diagErr) {
            const msg = diagErr instanceof Error ? diagErr.message : String(diagErr);
            logAudit(`[FAIL] ${contract.name} error reading diagnostics: ${msg}`, false);
        }
    }

    /**
     * Inspects a single peripheral driver for contract methods and diagnostics.
     * @param {{ name: string, required: string[], expectedServiceId?: string, expectedDriverId?: string }} contract
     * @param {Record<string, unknown>} driverInstance
     */
    function auditSinglePeripheralDriver(contract, driverInstance) {
        let contractPass = true;
        for (const method of contract.required) {
            if (typeof driverInstance[method] !== 'function') {
                logAudit(`[FAIL] ${contract.name} missing peripheral contract method: ${method}()`, false);
                contractPass = false;
            }
        }
        if (contractPass) {
            logAudit(`[PASS] ${contract.name}: Peripheral interface verified (${contract.required.join(', ')}).`, true);
        }
        auditDriverDiagnostics(contract, driverInstance);
    }

    /**
     * Verifies the peripheral driver signature and diagnostics telemetry
     * for all 13 registered Tier 3 drivers.
     * Verbatim from auditor.js:214–248.
     *
     * @param {Record<string, unknown>} driverRegistry - Resolved { [driverKey]: driverInstance } map.
     * @returns {void}
     */
    function auditPeripheralDrivers(driverRegistry) {
        for (const [driverKey, contract] of Object.entries(PERIPHERAL_DRIVER_CONTRACTS)) {
            const driverInstance = /** @type {Record<string, unknown> | undefined} */ (driverRegistry[driverKey]);
            if (!driverInstance) {
                logAudit(`[FAIL] Peripheral driver "${contract.name}" (${driverKey}) is not mounted.`, false);
                continue;
            }
            auditSinglePeripheralDriver(contract, driverInstance);
        }
    }

    /**
     * Audits passive presentation of combat renderer.
     * @param {any} combatRenderer
     */
    function auditCombatPresentation(combatRenderer) {
        if (!combatRenderer || typeof combatRenderer.render !== 'function') return;
        try {
            let dispatchedActions = 0;
            const renderSnapshot = deepFreeze({
                phase: 'PLAYER_INPUT',
                party: [
                    { id: 'hero', name: 'Aldric', phenotype: 'HERO', hp: 32, maxHp: 32, mp: 12, maxMp: 12, alive: true, level: 1 },
                    { id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', hp: 35, maxHp: 35, mp: 8, maxMp: 8, alive: true, level: 1 },
                    { id: 'mage', name: 'Selene', phenotype: 'MAGE', hp: 24, maxHp: 24, mp: 20, maxMp: 20, alive: true, level: 1 },
                ],
                enemies: [
                    { id: 'goblin_1', name: 'Goblin Scout', hp: 14, maxHp: 14, alive: true, intent: 'STRIKE' },
                ],
                turn: 1,
                activeUnitId: 'hero',
                selectedAction: null,
            });

            combatRenderer.render(null, renderSnapshot, (_snapshot = {}, dispatch = null) => {
                if (dispatch) {
                    dispatchedActions += 1;
                }
            });

            if (dispatchedActions > 0) {
                throw new Error(`Detached CombatRenderer illegally dispatched ${dispatchedActions} action(s) during passive render()!`);
            }
            logAudit('[PASS] EmberlightCombatRenderer: Detached combat snapshot rendered without simulation dispatch.', true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logAudit(`[FAIL] EmberlightCombatRenderer presentation error: ${msg}`, false);
        }
    }

    /**
     * Audits passive presentation of overworld renderer.
     * @param {any} overworldRenderer
     */
    function auditOverworldPresentation(overworldRenderer) {
        if (!overworldRenderer || typeof overworldRenderer.render !== 'function') return;
        try {
            const mockMap = [
                ['#', '#', '#'],
                ['#', '.', '#'],
                ['#', '#', '#'],
            ];
            const overworldSnapshot = deepFreeze({
                playerPos: { x: 1, y: 1 },
                facing: 'SOUTH',
                map: mockMap,
                flags: {},
                stepCounter: 0,
            });

            let mutatedState = false;
            overworldRenderer.render(null, overworldSnapshot, () => {
                mutatedState = true;
            });

            if (mutatedState) {
                throw new Error('OverworldRenderer triggered state mutation during render!');
            }
            logAudit('[PASS] EmberlightOverworldRenderer: Detached Overworld snapshot projected without simulation authority.', true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logAudit(`[FAIL] EmberlightOverworldRenderer presentation error: ${msg}`, false);
        }
    }

    /**
     * Audits passive presentation of progression renderer.
     * @param {any} progressionRenderer
     * @param {any} mockParty
     */
    function auditProgressionPresentation(progressionRenderer, mockParty) {
        if (!progressionRenderer) return;
        let renderFn = null;
        if (typeof progressionRenderer.renderProgression === 'function') {
            renderFn = progressionRenderer.renderProgression.bind(progressionRenderer);
        } else if (typeof progressionRenderer.render === 'function') {
            renderFn = progressionRenderer.render.bind(progressionRenderer);
        }
        if (!renderFn) return;
        try {
            const progressionSnapshot = deepFreeze({
                party: mockParty,
                activeTab: 'SKILLS',
                selectedHeroId: 'test_hero',
                selectedCharacterId: mockParty[0]?.id || 'test_hero',
                selectedEssence: 'ALL',
                selectedNodeId: 'iron_root',
            });

            let progressionDispatched = false;
            renderFn(progressionSnapshot, () => {
                progressionDispatched = true;
            });

            if (progressionDispatched) {
                throw new Error('ProgressionRenderer triggered state mutation during render!');
            }
            logAudit('[PASS] EmberlightProgressionRenderer: Detached Progression snapshot rendered without simulation dispatch.', true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logAudit(`[FAIL] EmberlightProgressionRenderer presentation error: ${msg}`, false);
        }
    }

    /**
     * Verifies that the three detached renderer drivers (combat, overworld,
     * progression) render passively from frozen snapshots without dispatching
     * actions or contaminating host state.
     * Verbatim from auditor.js:250–317.
     *
     * @param {Record<string, unknown>} driverRegistry - Resolved peripheral driver registry.
     * @param {unknown[]} mockParty - Synthetic party roster for snapshot construction.
     * @returns {void}
     */
    function auditRendererPresentations(driverRegistry, mockParty) {
        auditCombatPresentation(driverRegistry.combatRenderer);
        auditOverworldPresentation(driverRegistry.overworldRenderer);
        auditProgressionPresentation(driverRegistry.progressionRenderer, mockParty);
    }

    // ─── Pass 1 Dispatcher ───────────────────────────────────────────────────

    /**
     * Helper to retrieve global scope cleanly without nested ternaries.
     * @returns {Record<string, any>}
     */
    function getGlobalScope() {
        if (typeof window !== 'undefined') return /** @type {Record<string, any>} */ (window);
        if (typeof globalThis !== 'undefined') return /** @type {Record<string, any>} */ (globalThis);
        return /** @type {Record<string, any>} */ ({});
    }

    /**
     * @param {unknown} registeredDrivers
     * @returns {Record<string, any>}
     */
    function resolveDriverRegistry(registeredDrivers) {
        if (registeredDrivers && typeof registeredDrivers === 'object') return /** @type {Record<string, any>} */ (registeredDrivers);
        const globalScope = getGlobalScope();
        return {
            acoustic: globalScope.EmberlightAcousticSFX || null,
            pseudo3d: globalScope.EmberlightPseudo3D || null,
            lights:   globalScope.EmberlightDynamicLights || null,
            combatRenderer: globalScope.EmberlightCombatRenderer || null,
            overworldRenderer: globalScope.EmberlightOverworldRenderer || null,
            armoryRenderer: globalScope.EmberlightArmoryRenderer || null,
            chronicleRenderer: globalScope.EmberlightChronicleRenderer || null,
            progressionRenderer: globalScope.EmberlightProgressionRenderer || null,
            marketRenderer: globalScope.EmberlightMarketRenderer || null,
            statusRenderer: globalScope.EmberlightStatusRenderer || null,
            relicForgeRenderer: globalScope.EmberlightRelicForgeRenderer || null,
            cockpitRenderer: globalScope.EmberlightCockpitRenderer || null,
        };
    }

    /**
     * Sequences all Pass 1 audit sub-checks: VSRP-001 tenant interface verification,
     * Faraday isolation traps, peripheral driver contract checks, and renderer
     * presentation isolation.
     * Verbatim from auditor.js:320–374.
     *
     * @param {unknown} registeredModules - Tenant module registry.
     * @param {unknown} registeredDrivers - Peripheral driver registry (or null for window fallback).
     * @param {unknown} manifest - Active EmberlightManifest reference.
     * @returns {void}
     */
    function runContractAndFaradayAudit(registeredModules, registeredDrivers, manifest) {
        logAudit('=== PASS 1: VSRP-001 Structural Interface, Peripheral Drivers & Faraday Trap ===', true);
        if (!registeredModules || typeof registeredModules !== 'object') {
            logAudit('No module dictionary provided to auditor.', false);
            return;
        }

        const mockParty = [
            {
                id: 'test_hero',
                phenotype: 'HERO',
                name: 'Aldric',
                level: 1,
                exp: 0,
                skillPoints: 2,
                hp: 32,
                maxHp: 32,
                mp: 12,
                maxMp: 12,
                atk: 9,
                def: 5,
                agi: 7,
                alive: true,
                unlocked: [],
                spent: {},
                equipment: { weapon: null, armor: null, accessory: null },
            },
        ];

        for (const [name, mod] of Object.entries(registeredModules)) {
            if (!mod || name === 'pseudo3d' || name === 'pseudo3D') {
                continue;
            }
            auditTenantSignaturesAndActions(name, mod);
            auditFaradayIsolation(name, mod, mockParty, manifest, registeredDrivers);
        }

        const driverRegistry = resolveDriverRegistry(registeredDrivers);
        auditPeripheralDrivers(driverRegistry);
        auditRendererPresentations(driverRegistry, mockParty);
    }

    // ─── Staging Membrane Export ──────────────────────────────────────────────

    const Contracts = Object.freeze({
        runContractAndFaradayAudit,
    });

    if (typeof window !== 'undefined' && window._AuditorInternal) {
        window._AuditorInternal.Contracts = Contracts;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Contracts;
    }
})();
