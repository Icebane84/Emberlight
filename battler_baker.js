/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: EMBERLIGHT BATTLER BAKER (FACADE)
 * Document Identifier: VSRP-001-BATTLER-BAKER-V4
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-BATTLER-BAKER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * This file is a thin facade. It ingests all 5 sub-module namespace keys
 * from the VSRP-001 staging membrane (window._BattlerBakerInternal), purges
 * the membrane, and exports the canonical VSRP-001 EmberlightBattlerBaker object.
 *
 * Sub-module load order (must precede this file in index.html / load_order.js):
 *   battler_baker/battler_primitives.js
 *   battler_baker/battler_heroes.js
 *   battler_baker/battler_equipment.js
 *   battler_baker/battler_enemies.js
 *   battler_baker/battler_pipeline.js
 * ============================================================================
 */

const EmberlightBattlerBaker = (() => {
	// ─── Membrane Ingestion ───────────────────────────────────────────────────
	const _mem = /** @type {any} */ (
		(typeof window !== "undefined" && window._BattlerBakerInternal) ||
		(typeof globalThis !== "undefined" && (/** @type {any} */ (globalThis))._BattlerBakerInternal) ||
		{}
	);

	const { VERSION, SPRITE_SIZE, RENDER_SCALE, cache, diagnosticLog } =
		_mem.Primitives || {};
	const { HERO_BAKERS } = _mem.Heroes || {};
	const { ENEMY_BAKERS } = _mem.Enemies || {};
	const { get, bakeAll, getDiagnosticReport, validateCanonicalAssets } =
		_mem.Pipeline || {};

	// ─── Faraday Membrane Purge ───────────────────────────────────────────────
	if (typeof window !== "undefined" && window._BattlerBakerInternal) {
		delete (/** @type {any} */ (window))._BattlerBakerInternal;
	}
	if (typeof globalThis !== "undefined" && (/** @type {any} */ (globalThis))._BattlerBakerInternal) {
		delete (/** @type {any} */ (globalThis))._BattlerBakerInternal;
	}

	// ─── Canonical VSRP-001 9-Method Interface & Module Export ────────────────
	return {
		/**
		 * Configures the battler baker driver.
		 * State-mutating configuration gateway.
		 * @param {Object} [config={}] - Configuration parameters dictionary.
		 * @returns {Readonly<Object>} Acceptance descriptor.
		 */
		configure(config = {}) {
			return Object.freeze({
				accepted: true,
				driverId: "battler_baker",
				moduleVersion: VERSION,
				renderScale: RENDER_SCALE,
				spriteDimensions: `${SPRITE_SIZE}x${SPRITE_SIZE}`,
				requestedConfig: {
					...config,
				},
			});
		},

		/**
		 * Initializes the baker module and validates canonical assets.
		 * State-mutating initialization gateway.
		 * @returns {any} Validation outcome descriptor.
		 */
		init() {
			if (cache && !cache.size && typeof bakeAll === "function") {
				bakeAll();
			}

			return typeof validateCanonicalAssets === "function"
				? validateCanonicalAssets()
				: { pass: true };
		},

		/**
		 * Resets and re-bakes all cached assets.
		 * State-mutating reset gateway.
		 * @returns {void}
		 */
		reset() {
			if (typeof bakeAll === "function") bakeAll();
		},

		/**
		 * Simulation update heartbeat.
		 * Pure lifecycle stub.
		 * @returns {void}
		 */
		update() { },

		/**
		 * Renders a battler sprite through a host renderer.
		 * State-mutating presentation projection gateway.
		 * @param {any} renderer - Host rendering engine interface.
		 * @param {Record<string, any>} [context={}] - Render context parameters.
		 * @returns {void}
		 */
		render(renderer, context = {}) {
			if (renderer && typeof renderer.drawBattler === "function") {
				renderer.drawBattler(
					this.get(context.spec || "HERO", context.options),
					context,
				);
			}
		},

		/**
		 * Returns internal operational state.
		 * Pure accessor gateway.
		 * @returns {Readonly<Object>} State summary descriptor.
		 */
		getState() {
			return Object.freeze({
				cacheSize: cache ? cache.size : 0,
				diagnosticCount: diagnosticLog ? diagnosticLog.size : 0,
				moduleVersion: VERSION,
			});
		},

		/**
		 * Returns operational diagnostics and telemetry reports.
		 * Pure diagnostic accessor gateway.
		 * @returns {Object} Report descriptor.
		 */
		getDiagnostics() {
			const report =
				typeof getDiagnosticReport === "function" ? getDiagnosticReport() : {};

			return {
				driverId: report.driverId || "battler_baker",
				moduleVersion: report.moduleVersion || VERSION,
				spriteDimensions:
					report.spriteDimensions || `${SPRITE_SIZE}x${SPRITE_SIZE}`,
				renderScale: report.renderScale || RENDER_SCALE,
				cachedCount: report.cacheSize || (cache ? cache.size : 0),
				diagnosticCount:
					report.diagnosticCount || (diagnosticLog ? diagnosticLog.size : 0),
				counts: report.counts || {},
				availableKeys: cache ? [...cache.keys()] : [],
				entries: report.entries || [],
			};
		},

		getDiagnosticReport,
		validateCanonicalAssets,

		/**
		 * Returns static module metadata and capabilities.
		 * Pure manifest accessor gateway.
		 * @returns {Readonly<Object>} Constitutional VSRP-001 metadata descriptor.
		 */
		getModuleInfo() {
			return Object.freeze({
				driverId: "battler_baker",
				moduleName: "EmberlightBattlerBaker",
				version: VERSION,
				protocol: "VSRP-001",
				spriteDimensions: `${SPRITE_SIZE}x${SPRITE_SIZE}`,
				renderScale: RENDER_SCALE,
				rendering: "procedural layered art at 4x -> controlled 64x64 reduction",
				deterministic: true,
				externalAssets: false,
				canonicalEnemyCount: ENEMY_BAKERS
					? Object.keys(ENEMY_BAKERS).length
					: 7,
				canonicalHeroCount: HERO_BAKERS ? Object.keys(HERO_BAKERS).length : 4,
			});
		},

		get,
		bakeBattler: get,
		getSprite: get,
		bakeAll,
		clearCache() {
			if (typeof bakeAll === "function") bakeAll();
		},

		/**
		 * Tears down module resources.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
		destroy() {
			// No listeners, timers, DOM ownership, or external resources.
			// Cache intentionally survives district unmounts.
		},
	};
})();

if (typeof window !== "undefined") {
	window.EmberlightBattlerBaker = EmberlightBattlerBaker;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightBattlerBaker;
}
