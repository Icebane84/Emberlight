/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: BATTLER EQUIPMENT SUB-MODULE
 * Document Identifier: VSRP-001-BATTLER-EQUIPMENT
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-BATTLER-BAKER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-04] Equipment Overlay Pipeline (Armor & Weapons) (Lines 1705–2140)
 *
 * STAGING MEMBRANE KEY: window._BattlerBakerInternal.Equipment
 * DEPENDENCIES:
 *   window._BattlerBakerInternal.Primitives
 * ============================================================================
 */

if (typeof window !== 'undefined') window._BattlerBakerInternal = window._BattlerBakerInternal || {};

(() => {
	const primitives = /** @type {any} */ (window._BattlerBakerInternal?.Primitives || (typeof require !== 'undefined' ? require('./battler_primitives.js') : {}));
	const { P, poly, line, ellipse, diamond, glow } = primitives;

	//#region [SEC-04] Equipment Overlay Pipeline (Armor & Weapons)
	/**
	 * Renders chainmail armor overlay.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {BattlerLayerResult} Armor layer result descriptor.
	 */
	function renderChainmailArmor(ctx) {
		for (let y = 29; y < 44; y += 3) {
			for (let x = 24; x < 41; x += 4) {
				ellipse(ctx, x + (y % 2 ? 2 : 0), y, 1.1, 0.7, P.steel3, 0.26);
			}
		}
		return {
			kind: "INTENDED",
			family: "CHAINMAIL",
		};
	}

	/**
	 * Renders plate armor overlay.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {BattlerLayerResult} Armor layer result descriptor.
	 */
	function renderPlateArmor(ctx) {
		line(
			ctx,
			[
				[25, 29],
				[39, 29],
			],
			P.steel3,
			1,
			0.55,
		);

		line(
			ctx,
			[
				[24, 36],
				[40, 36],
			],
			P.steel0,
			1.2,
			0.55,
		);

		line(
			ctx,
			[
				[27, 43],
				[37, 43],
			],
			P.steel3,
			1,
			0.4,
		);

		return {
			kind: "INTENDED",
			family: "PLATE",
		};
	}

	/**
	 * Renders leather armor overlay.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {BattlerLayerResult} Armor layer result descriptor.
	 */
	function renderLeatherArmor(ctx) {
		line(
			ctx,
			[
				[24, 31],
				[40, 31],
			],
			P.leather3,
			1,
			0.55,
		);

		for (let y = 34; y < 44; y += 4) {
			line(
				ctx,
				[
					[25, y],
					[39, y + 1],
				],
				P.leather0,
				0.7,
				0.8,
			);
		}

		return {
			kind: "INTENDED",
			family: "LEATHER",
		};
	}

	/**
	 * Renders robe armor overlay.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {BattlerLayerResult} Armor layer result descriptor.
	 */
	function renderRobeArmor(ctx) {
		line(
			ctx,
			[
				[25, 34],
				[39, 34],
			],
			P.cloth3,
			1,
			0.45,
		);

		line(
			ctx,
			[
				[27, 39],
				[38, 39],
			],
			P.cloth0,
			1,
			0.55,
		);

		return {
			kind: "INTENDED",
			family: "ROBE",
		};
	}

	const ARMOR_RULES = Object.freeze([
		{
			tokens: ["CHAIN", "MAIL"],
			renderer: renderChainmailArmor,
		},
		{
			tokens: ["PLATE", "IRON", "STEEL"],
			renderer: renderPlateArmor,
		},
		{
			tokens: ["LEATHER", "VEST", "STUDDED"],
			renderer: renderLeatherArmor,
		},
		{
			tokens: ["ROBE", "SILK", "CLOTH", "VESTMENT"],
			renderer: renderRobeArmor,
		},
	]);

	/**
	 * Evaluates and renders armor equipment overlays.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {string} [id] - Armor item identifier.
	 * @param {string} [phenotype] - Hero phenotype.
	 * @returns {BattlerLayerResult} Layer descriptor object.
	 */
	function armor(ctx, id, phenotype = "HERO") {
		const a = String(id || "").toUpperCase();

		if (!a) {
			return {
				kind: "FALLBACK",
				family: "DEFAULT_ARMOR",
			};
		}

		const rule = ARMOR_RULES.find((r) => r.tokens.some((token) => a.includes(token)));
		if (rule) {
			return rule.renderer(ctx);
		}

		return {
			kind: "FALLBACK",
			family: "UNRECOGNIZED_ARMOR",
			phenotype,
		};
	}

	/**
	 * Evaluates and renders weapon equipment overlays.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {string} [id] - Weapon item identifier.
	 * @param {string} [phenotype] - Hero phenotype.
	 * @returns {BattlerLayerResult} Layer descriptor object.
	 */
	function weapon(ctx, id, phenotype = "HERO") {
		const w = String(id || "").toUpperCase();

		if (!w || w.includes("SWORD") || w.includes("BLADE")) {
			line(
				ctx,
				[
					[45, 43],
					[52, 11],
				],
				P.outline,
				4,
			);

			line(
				ctx,
				[
					[45, 42],
					[52, 11],
				],
				P.steel2,
				2,
			);

			line(
				ctx,
				[
					[52, 11],
					[53, 8],
				],
				P.steel4,
				1,
				0.9,
			);

			line(
				ctx,
				[
					[43, 41],
					[48, 42],
				],
				P.gold2,
				2,
			);

			line(
				ctx,
				[
					[45, 43],
					[43, 47],
				],
				P.leather2,
				2,
			);

			return {
				kind: "INTENDED",
				family: "SWORD",
			};
		}

		if (w.includes("AXE")) {
			line(
				ctx,
				[
					[46, 50],
					[54, 9],
				],
				P.leather2,
				3,
			);

			poly(
				ctx,
				[
					[51, 13],
					[56, 6],
					[62, 8],
					[59, 17],
					[54, 18],
				],
				P.outline,
			);

			poly(
				ctx,
				[
					[53, 13],
					[56, 8],
					[59, 9],
					[57, 15],
					[54, 16],
				],
				P.steel3,
			);

			return {
				kind: "INTENDED",
				family: "AXE",
			};
		}

		if (w.includes("STAFF") || w.includes("WAND") || w.includes("ROD")) {
			line(
				ctx,
				[
					[47, 59],
					[51, 11],
				],
				P.leather2,
				3,
			);

			glow(ctx, 51, 10, 8, P.violet2, 0.22);

			diamond(ctx, 51, 10, 9, 11, P.violet1);

			diamond(ctx, 51, 10, 4, 6, P.violet3);

			return {
				kind: "INTENDED",
				family: "STAFF",
			};
		}

		if (w.includes("MACE") || w.includes("HAMMER")) {
			line(
				ctx,
				[
					[48, 59],
					[51, 20],
				],
				P.leather2,
				3,
			);

			diamond(ctx, 51, 17, 10, 10, P.holy1);

			diamond(ctx, 51, 17, 5, 6, P.holy3);

			return {
				kind: "INTENDED",
				family: "MACE",
			};
		}

		if (w.includes("CINDER") || w.includes("EMBER")) {
			line(
				ctx,
				[
					[48, 58],
					[51, 26],
				],
				P.iron0,
				3,
			);

			glow(ctx, 51, 19, 10, P.fire2, 0.28);

			diamond(ctx, 51, 19, 10, 12, P.fire1);

			diamond(ctx, 51, 19, 6, 8, P.fire3);

			return {
				kind: "INTENDED",
				family: "CINDER",
			};
		}

		if (w.includes("BOW")) {
			line(
				ctx,
				[
					[49, 13],
					[49, 50],
				],
				P.leather3,
				2,
			);

			line(
				ctx,
				[
					[46, 16],
					[49, 31],
					[46, 46],
				],
				P.leather2,
				2,
			);

			line(
				ctx,
				[
					[49, 13],
					[49, 50],
				],
				P.steel4,
				0.55,
				0.8,
			);

			return {
				kind: "INTENDED",
				family: "BOW",
			};
		}

		if (w.includes("DAGGER") || w.includes("DIRK")) {
			line(
				ctx,
				[
					[46, 43],
					[51, 25],
				],
				P.steel3,
				2,
			);

			line(
				ctx,
				[
					[45, 43],
					[49, 44],
				],
				P.gold2,
				2,
			);

			return {
				kind: "INTENDED",
				family: "DAGGER",
			};
		}

		return {
			kind: "FALLBACK",
			family: "NO_WEAPON_OVERLAY",
			phenotype,
		};
	}
	//#endregion

	const Equipment = Object.freeze({
		renderChainmailArmor,
		renderPlateArmor,
		renderLeatherArmor,
		renderRobeArmor,
		ARMOR_RULES,
		armor,
		weapon,
	});

	if (typeof window !== 'undefined') {
		window._BattlerBakerInternal.Equipment = Equipment;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Equipment;
	}
})();
