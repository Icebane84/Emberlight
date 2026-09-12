/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: BATTLER PIPELINE & DIAGNOSTICS SUB-MODULE
 * Document Identifier: VSRP-001-BATTLER-PIPELINE
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-BATTLER-BAKER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-06] Semantic Resolution, Aliasing & Asset Resolvers (Lines 3671–3772)
 *   [SEC-07] PNG Encoding & Composition Pipeline (Lines 3774–3874)
 *   [SEC-08] Caching, Telemetry & Diagnostic Reporters (Lines 3876–4210)
 *
 * STAGING MEMBRANE KEY: window._BattlerBakerInternal.Pipeline
 * DEPENDENCIES:
 *   window._BattlerBakerInternal.Primitives
 *   window._BattlerBakerInternal.Heroes
 *   window._BattlerBakerInternal.Equipment
 *   window._BattlerBakerInternal.Enemies
 * ============================================================================
 */

if (typeof window !== 'undefined') window._BattlerBakerInternal = window._BattlerBakerInternal || {};

(() => {
	'use strict';

	const { VERSION, SPRITE_SIZE, RENDER_SCALE, WORK_SIZE, cache, diagnosticLog, canvas, ctxConfig, reset } = window._BattlerBakerInternal.Primitives || (typeof require !== 'undefined' ? require('./battler_primitives.js') : {});
	const { HERO_BAKERS } = window._BattlerBakerInternal.Heroes || (typeof require !== 'undefined' ? require('./battler_heroes.js') : {});
	const { armor, weapon } = window._BattlerBakerInternal.Equipment || (typeof require !== 'undefined' ? require('./battler_equipment.js') : {});
	const { ENEMY_BAKERS, EXPLICIT_ALIASES, SEMANTIC_RULES } = window._BattlerBakerInternal.Enemies || (typeof require !== 'undefined' ? require('./battler_enemies.js') : {});

	//#region [SEC-06] Semantic Resolution, Aliasing & Asset Resolvers
	/**
	 * Normalizes an asset identifier string for registry lookups.
	 * Pure string transformation utility.
	 * @param {any} v - Input identifier value.
	 * @returns {string} Normalized uppercase string.
	 */
	function norm(v) {
		return String(v == null ? "" : v)
			.trim()
			.toUpperCase();
	}

	/**
	 * Resolves requested enemy identifier to canonical baker and telemetry records.
	 * Pure resolution procedure.
	 * @param {string} requested - Requested enemy name or token.
	 * @returns {EnemyResolution | null} Resolved enemy descriptor or null.
	 */
	function resolveEnemy(requested) {
		const key = norm(requested);

		if (ENEMY_BAKERS[key]) {
			return {
				requested: key,
				canonical: key,
				baker: ENEMY_BAKERS[key],
				classification: "INTENDED",
				resolution: "CANONICAL",
			};
		}

		if (EXPLICIT_ALIASES[key]) {
			const canonical = EXPLICIT_ALIASES[key];

			return {
				requested: key,
				canonical,
				baker: ENEMY_BAKERS[canonical],
				classification: "ALIAS",
				resolution: "EXPLICIT_ALIAS",
				reason: `"${key}" is an explicit alias for "${canonical}".`,
			};
		}

		const rule = SEMANTIC_RULES.find(([token]) => key.includes(token));

		if (rule) {
			return {
				requested: key,
				canonical: rule[1],
				baker: ENEMY_BAKERS[rule[1]],
				classification: "SEMANTIC_FALLBACK",
				resolution: "SEMANTIC_MATCH",
				reason:
					`Matched semantic token "${rule[0]}"; ` +
					`no exact canonical asset was requested.`,
			};
		}

		return null;
	}

	/**
	 * Resolves requested hero phenotype to canonical hero definitions.
	 * Pure resolution procedure.
	 * @param {string} requested - Requested hero class or phenotype.
	 * @returns {HeroResolution} Resolved hero classification descriptor.
	 */
	function resolveHero(requested) {
		const key = norm(requested) || "HERO";

		if (HERO_BAKERS[key]) {
			return {
				requested: key,
				canonical: key,
				classification: "INTENDED",
				resolution: "CANONICAL",
			};
		}

		for (const type of ["WARRIOR", "MAGE", "HEALER"]) {
			if (key.includes(type)) {
				return {
					requested: key,
					canonical: type,
					classification: "SEMANTIC_FALLBACK",
					resolution: "SEMANTIC_MATCH",
					reason: `Matched hero phenotype token "${type}".`,
				};
			}
		}

		return {
			requested: key,
			canonical: "HERO",
			classification: "SEMANTIC_FALLBACK",
			resolution: "DEFAULT_HERO",
			reason: "No exact hero phenotype exists; HERO is the documented default.",
		};
	}
	//#endregion

	//#region [SEC-07] PNG Encoding & Composition Pipeline
	/**
	 * Encodes a working supersampling canvas into a 64x64 PNG data URL.
	 * State-mutating canvas readback and encoding procedure.
	 * @param {HTMLCanvasElement | any} work - Source working canvas element.
	 * @returns {string | null} Base64 PNG data URL or null.
	 */
	function encode(work) {
		const out = canvas(SPRITE_SIZE);

		if (!out) return null;

		const c = out.getContext("2d");

		if (!c) return null;

		ctxConfig(c, true);

		c.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

		c.drawImage(work, 0, 0, SPRITE_SIZE, SPRITE_SIZE);

		return out.toDataURL("image/png");
	}

	/**
	 * Composes hero body art with equipment overlays.
	 * State-mutating canvas composition procedure.
	 * @param {CanvasRenderingContext2D | any} workCtx - Target working 2D canvas context.
	 * @param {string} phenotype - Hero phenotype.
	 * @param {string} [weaponId] - Weapon identifier.
	 * @param {string} [armorId] - Armor identifier.
	 * @returns {{ armor: BattlerLayerResult, weapon: BattlerLayerResult }} Layer result descriptors.
	 */
	function composeHeroToCanvas(workCtx, phenotype, weaponId, armorId) {
		HERO_BAKERS[phenotype](workCtx);

		const armorResult = armor(workCtx, armorId, phenotype);

		const weaponResult = weapon(workCtx, weaponId, phenotype);

		return {
			armor: armorResult,
			weapon: weaponResult,
		};
	}

	/**
	 * Renders and encodes a composite hero sprite.
	 * State-mutating render procedure.
	 * @param {string} phenotype - Hero phenotype.
	 * @param {string} [weaponId] - Weapon identifier.
	 * @param {string} [armorId] - Armor identifier.
	 * @returns {RenderHeroResult} Render result descriptor.
	 */
	function renderHero(phenotype, weaponId, armorId) {
		const work = canvas();

		if (!work) {
			return {
				dataUrl: null,
				status: "ERROR_FALLBACK",
				reason: "Canvas unavailable.",
			};
		}

		const c = work.getContext("2d");

		if (!c) {
			return {
				dataUrl: null,
				status: "ERROR_FALLBACK",
				reason: "2D context unavailable.",
			};
		}

		ctxConfig(c, false);
		reset(c);

		const layers = composeHeroToCanvas(c, phenotype, weaponId, armorId);

		const dataUrl = encode(work);

		if (!dataUrl) {
			return {
				dataUrl: null,
				status: "ERROR_FALLBACK",
				reason: "PNG encoding failed.",
				layers,
			};
		}

		return {
			dataUrl,
			layers,
			status: Object.values(layers).some((x) => x.kind === "FALLBACK")
				? "FALLBACK"
				: "INTENDED",
		};
	}
	//#endregion

	//#region [SEC-08] Caching, Telemetry & Diagnostic Reporters
	/**
	 * Logs a diagnostic event entry to the telemetry ledger.
	 * State-mutating telemetry procedure.
	 * @param {string} key - Telemetry ledger key.
	 * @param {Object} entry - Diagnostic entry payload.
	 * @returns {void}
	 */
	function logDiagnostic(key, entry) {
		diagnosticLog.set(
			key,
			Object.freeze({
				...entry,
				moduleVersion: VERSION,
				timestamp: Date.now(),
			}),
		);
	}

	/**
	 * Pre-bakes all canonical heroes and enemies into the memory cache.
	 * State-mutating cache baking procedure.
	 * @returns {boolean} True if cache populated successfully.
	 */
	function bakeAll() {
		cache.clear();
		diagnosticLog.clear();

		const heroes = {
			HERO: ["IRON_SWORD", "CHAINMAIL"],

			WARRIOR: ["GREATAXE", "CHAINMAIL"],

			MAGE: ["OAK_STAFF", "MAGE_ROBE"],

			HEALER: ["SUN_MACE", "MAGE_ROBE"],
		};

		for (const [type, [wpn, arm]] of Object.entries(heroes)) {
			const work = canvas();

			if (!work) continue;

			const c = work.getContext("2d");

			ctxConfig(c, false);
			reset(c);

			const layers = composeHeroToCanvas(c, type, wpn, arm);

			const data = encode(work);

			if (!data) continue;

			const key = `${type}_W:${wpn}_A:${arm}`;

			cache.set(type, data);
			cache.set(key, data);

			logDiagnostic(type, {
				requested: type,
				canonical: type,
				classification: "INTENDED",
				resolution: "CANONICAL",
				assetType: "HERO",
				compositeKey: key,
				layers,
				returned: true,
			});
		}

		for (const [key, baker] of Object.entries(ENEMY_BAKERS)) {
			const work = canvas();

			if (!work) continue;

			const c = work.getContext("2d");

			ctxConfig(c, false);
			reset(c);

			baker(c);

			const data = encode(work);

			if (!data) continue;

			cache.set(key, data);

			logDiagnostic(key, {
				requested: key,
				canonical: key,
				classification: "INTENDED",
				resolution: "CANONICAL",
				assetType: "ENEMY",
				returned: true,
			});
		}

		return cache.size > 0;
	}

	/**
	 * Parses various request specifier formats into a normalized structure.
	 * Pure parsing utility procedure.
	 * @param {string | BattlerSpec} [spec="HERO"] - Request specifier object or string.
	 * @param {BattlerSpec | null} [options=null] - Additional configuration options.
	 * @returns {BattlerSpec} Normalized spec structure.
	 */
	function parseSpec(spec = "HERO", options = null) {
		if (spec && typeof spec === "object") {
			return {
				id: String(spec.id || spec.phenotype || "HERO"),

				phenotype: String(spec.phenotype || spec.id || "HERO"),

				weapon: spec.weapon || null,

				armor: spec.armor || null,
			};
		}

		const specStr = typeof spec === "string" ? spec : "HERO";
		return {
			id: specStr,
			phenotype: specStr,
			weapon: options?.weapon || null,
			armor: options?.armor || null,
		};
	}

	/**
	 * Retrieves or bakes a requested battler sprite by specifier.
	 * State-mutating cache retrieval and composition procedure.
	 * @param {string | BattlerSpec} [spec="HERO"] - Asset specification string or object.
	 * @param {BattlerSpec | null} [options=null] - Optional override parameters.
	 * @returns {string | null} Base64 PNG data URL or null.
	 */
	function get(spec = "HERO", options = null) {
		const parsed = parseSpec(spec, options);

		const requested = norm(parsed.id);

		const enemy = resolveEnemy(requested);

		if (enemy && !parsed.weapon && !parsed.armor) {
			const data = cache.get(enemy.canonical) || null;

			logDiagnostic(`request:${requested}`, {
				...enemy,
				assetType: "ENEMY",
				returned: !!data,
			});

			return data;
		}

		const hero = resolveHero(parsed.phenotype);

		if (!parsed.weapon && !parsed.armor) {
			const data = cache.get(hero.canonical) || cache.get("HERO") || null;

			logDiagnostic(`request:${requested}`, {
				...hero,
				assetType: "HERO",
				returned: !!data,
			});

			return data;
		}

		const w = norm(parsed.weapon) || "DEFAULT";

		const a = norm(parsed.armor) || "DEFAULT";

		const key = `${hero.canonical}_W:${w}_A:${a}`;

		if (cache.has(key)) {
			logDiagnostic(`request:${requested}:${key}`, {
				...hero,
				assetType: "HERO_COMPOSITE",
				compositeKey: key,
				resolution: "CACHE_HIT",
				returned: true,
			});

			return cache.get(key);
		}

		const rendered = renderHero(hero.canonical, parsed.weapon, parsed.armor);

		if (!rendered.dataUrl) {
			const fallback = cache.get(hero.canonical) || cache.get("HERO") || null;

			logDiagnostic(`request:${requested}:${key}`, {
				requested,
				canonical: hero.canonical,
				classification: "ERROR_FALLBACK",
				resolution: "RENDER_FAILURE",
				assetType: "HERO_COMPOSITE",
				compositeKey: key,
				returned: !!fallback,
				reason: rendered.reason,
			});

			return fallback;
		}

		cache.set(key, rendered.dataUrl);

		const classification =
			rendered.status === "FALLBACK" || hero.classification !== "INTENDED"
				? "FALLBACK"
				: "INTENDED";

		logDiagnostic(`request:${requested}:${key}`, {
			requested,
			canonical: hero.canonical,
			classification,
			resolution: "COMPOSED",
			assetType: "HERO_COMPOSITE",
			compositeKey: key,
			layers: rendered.layers,
			returned: true,
		});

		return rendered.dataUrl;
	}

	/**
	 * Generates a diagnostic telemetry report for specific requests or the full ledger.
	 * Pure diagnostic accessor procedure.
	 * @param {string | BattlerSpec | null} [spec=null] - Optional target specifier.
	 * @param {BattlerSpec | null} [options=null] - Optional configuration options.
	 * @returns {DiagnosticReport} Diagnostic report structure.
	 */
	function getDiagnosticReport(spec = null, options = null) {
		if (spec !== null && spec !== undefined) {
			const requested = norm(parseSpec(spec, options).id);

			const matches = [...diagnosticLog.values()].filter(
				(x) => x.requested === requested,
			);

			const latest = matches.length ? matches.at(-1) : null;

			return Object.freeze({
				driverId: "battler_baker",
				moduleVersion: VERSION,
				requested,
				found: !!latest,
				classification: latest?.classification || "UNRESOLVED",

				resolution: latest?.resolution || "NO_REQUEST_RECORDED",

				report: latest || null,
			});
		}

		const entries = [...diagnosticLog.values()];

		const counts = {};

		for (const e of entries) {
			counts[e.classification] = (counts[e.classification] || 0) + 1;
		}

		return Object.freeze({
			driverId: "battler_baker",
			moduleVersion: VERSION,

			spriteDimensions: `${SPRITE_SIZE}x${SPRITE_SIZE}`,

			renderScale: RENDER_SCALE,

			cacheSize: cache.size,

			diagnosticCount: entries.length,

			counts: Object.freeze(counts),

			entries: Object.freeze(entries.slice()),
		});
	}

	/**
	 * Validates that all canonical assets are correctly cached and intended.
	 * Pure asset verification procedure.
	 * @returns {AssetValidationResult} Asset validation report descriptor.
	 */
	function validateCanonicalAssets() {
		const required = [
			"HERO",
			"WARRIOR",
			"MAGE",
			"HEALER",

			"SHADE_WOLF",
			"BONE_ARCHER",
			"CATACOMB_SKELETON",
			"CAVE_SPIDER",
			"DREAD_ACOLYTE",
			"IRON_BRUTE",
			"BOSS_MALAKOR",
		];

		const results = required.map((key) => {
			const d = diagnosticLog.get(key);

			return {
				key,

				exists: cache.has(key),

				classification: d?.classification || "UNREPORTED",

				pass: cache.has(key) && d?.classification === "INTENDED",
			};
		});

		return {
			pass: results.every((x) => x.pass),

			total: results.length,

			passed: results.filter((x) => x.pass).length,

			failed: results.filter((x) => !x.pass).length,

			results,
		};
	}

	bakeAll();
	//#endregion

	const Pipeline = Object.freeze({
		norm,
		resolveEnemy,
		resolveHero,
		encode,
		composeHeroToCanvas,
		renderHero,
		logDiagnostic,
		bakeAll,
		parseSpec,
		get,
		getDiagnosticReport,
		validateCanonicalAssets,
	});

	if (typeof window !== 'undefined') {
		window._BattlerBakerInternal.Pipeline = Pipeline;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Pipeline;
	}
})();
