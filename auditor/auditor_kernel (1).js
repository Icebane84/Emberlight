/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: AUDITOR KERNEL SUB-MODULE
 * Document Identifier: VSRP-001-AUDITOR-KERNEL
 * Governing Protocol: VSRP-001 / ARCH-SPEC-FACADE-TOPOLOGY-001
 * Authority: Host SSOT Staging Membrane
 * Timestamp: 2026-09-09T20:40:00-04:00
 *
 * TARGET SECTIONS EXTRACTED (verbatim from auditor.js):
 *   [UTIL] deepFreeze         — Lines 113–121
 *   [UTIL] createDefaultState — Lines 123–131
 *   [UTIL] logAudit           — Lines 133–137 (adapted: sim injected via _bindLog)
 *   [UTIL] createIsolatedEventBus — Lines 2024–2042
 *
 * STAGING MEMBRANE KEY: window._AuditorInternal.Kernel
 * ============================================================================
 */

window._AuditorInternal = window._AuditorInternal || {};

(() => {
    'use strict';

    /**
     * Live sim accumulator reference — bound by the facade via _bindLog(simRef)
     * immediately after createDefaultState() is called in reset().
     * All sub-modules call logAudit() through this module; none hold a direct sim ref.
     * @type {{ auditLog: Array, complianceScore: number, totalChecks: number, combatSimResults: any, passed: boolean } | null}
     */
    let _boundSim = null;

    /**
     * Recursively freezes an object tree to guarantee strict runtime immutability.
     * Verbatim extraction from auditor.js:113–121.
     * @template T
     * @param {T} obj - Object graph to seal.
     * @returns {Readonly<T>} Immutable reference to sealed object graph.
     */
    function deepFreeze(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        Object.keys(obj).forEach((prop) => {
            if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
                deepFreeze(obj[prop]);
            }
        });
        return Object.freeze(obj);
    }

    /**
     * Returns a fresh, zeroed AuditState accumulator object.
     * Verbatim extraction from auditor.js:123–131.
     * @returns {{ auditLog: Array, complianceScore: number, totalChecks: number, combatSimResults: null, passed: boolean }}
     */
    function createDefaultState() {
        return {
            auditLog: [],
            complianceScore: 0,
            totalChecks: 0,
            combatSimResults: null,
            passed: false,
        };
    }

    /**
     * Records one check result into the bound sim accumulator.
     * Adapted from auditor.js:133–137: sim reference is injected via _bindLog()
     * rather than captured from the facade closure directly.
     *
     * @param {string} message - Human-readable audit entry text.
     * @param {boolean} [passed=true] - Whether this check passed.
     * @returns {void}
     */
    function logAudit(message, passed = true) {
        if (!_boundSim) return;
        _boundSim.totalChecks += 1;
        if (passed) _boundSim.complianceScore += 1;
        _boundSim.auditLog.push({ message, passed, timestamp: new Date().toISOString() });
    }

    /**
     * Returns a minimal in-process synchronous EventBus instance for isolated
     * auditor sub-test contexts that require publish/subscribe wiring without
     * depending on the production EmberlightEventBus global.
     * Verbatim extraction from auditor.js:2024–2042.
     *
     * @returns {{ publish(event: string, payload: any): void, subscribe(event: string, cb: Function): Function }}
     */
    function createIsolatedEventBus() {
        const subscribers = {};
        return {
            publish(event, payload) {
                if (Array.isArray(subscribers[event])) {
                    subscribers[event].forEach((cb) => {
                        try { cb(payload); } catch (_) { }
                    });
                }
            },
            subscribe(event, cb) {
                if (!subscribers[event]) subscribers[event] = [];
                subscribers[event].push(cb);
                return () => {
                    subscribers[event] = subscribers[event].filter((fn) => fn !== cb);
                };
            },
        };
    }

    window._AuditorInternal.Kernel = Object.freeze({
        /**
         * Binds the live sim accumulator for the current audit run.
         * The facade calls this once per reset() immediately after createDefaultState().
         * Sub-modules MUST NOT store simRef directly — they call logAudit() through this module.
         * @param {{ auditLog: Array, complianceScore: number, totalChecks: number } | null} simRef
         */
        _bindLog(simRef) {
            _boundSim = simRef;
        },

        /**
         * Returns the currently bound sim accumulator reference.
         * Only used by sub-modules that need to write non-log fields directly
         * (e.g., combatSimResults in auditor_district_sims.js).
         * @returns {{ combatSimResults: any } | null}
         */
        getBoundSim() {
            return _boundSim;
        },

        deepFreeze,
        createDefaultState,
        logAudit,
        createIsolatedEventBus,
    });
})();
