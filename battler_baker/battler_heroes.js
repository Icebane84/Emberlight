/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: BATTLER HEROES SUB-MODULE
 * Document Identifier: VSRP-001-BATTLER-HEROES
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-BATTLER-BAKER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-03] Hero Anatomy, Silhouette Builders & Class Bakers (Lines 438–1703)
 *
 * STAGING MEMBRANE KEY: window._BattlerBakerInternal.Heroes
 * DEPENDENCIES:
 *   window._BattlerBakerInternal.Primitives
 * ============================================================================
 */

if (typeof window !== "undefined")
	window._BattlerBakerInternal = window._BattlerBakerInternal || {};

(() => {
	const primitives = /** @type {any} */ (window._BattlerBakerInternal?.Primitives || (typeof require !== "undefined" ? require("./battler_primitives.js") : {}));
	const { P, rect, rr, poly, line, diamond, ground, glow, spec } = primitives;

	//#region [SEC-03] Hero Anatomy, Silhouette Builders & Class Bakers
	/**
	 * Renders a hero head anatomy structure with hair and facial features.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} cx - Head center X coordinate.
	 * @param {number} top - Head top Y coordinate.
	 * @param {boolean} [skin=true] - Whether to render exposed skin or helmet base.
	 * @returns {void}
	 */
	function heroHead(ctx, cx, top, skin = true) {
		rr(ctx, cx - 7.5, top, [ 15, 15 ], 4, P.outline);

		rr(ctx, cx - 6, top + 1, [ 12, 13 ], 3, skin ? P.skin1 : P.cloth1);

		if (skin) {
			poly(
				ctx,
				[
					[ cx - 5, top + 5 ],
					[ cx - 4, top + 2 ],
					[ cx + 4, top + 2 ],
					[ cx + 5, top + 6 ],
					[ cx + 3, top + 12 ],
					[ cx - 3, top + 12 ],
				],
				P.skin2,
			);

			rect(ctx, cx - 4.5, top + 5, 2.5, 2, P.skin3, 0.7);

			rect(ctx, cx + 2, top + 5, 2.5, 2, P.skin3, 0.55);

			rect(ctx, cx - 4, top + 8, 3, 1.3, P.skin1);

			rect(ctx, cx + 1, top + 8, 3, 1.3, P.skin1);

			rect(ctx, cx - 1, top + 10, 2, 1.2, P.skin1);
		}
	}

	/**
	 * Renders symmetrical shoulder armor plates.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} left - Left shoulder X coordinate.
	 * @param {number} right - Right shoulder X coordinate.
	 * @param {number} y - Shoulder Y coordinate.
	 * @param {string[]} palette - Material color palette array.
	 * @returns {void}
	 */
	function shoulderArmor(ctx, left, right, y, palette) {
		rr(ctx, left - 4, y, [ 10, 9 ], 2.5, palette[ 0 ]);

		rr(ctx, right - 6, y, [ 10, 9 ], 2.5, palette[ 0 ]);

		poly(
			ctx,
			[
				[ left - 3, y + 2 ],
				[ left + 3, y + 2 ],
				[ left + 1, y + 7 ],
				[ left - 2, y + 7 ],
			],
			palette[ 1 ],
		);

		poly(
			ctx,
			[
				[ right - 3, y + 2 ],
				[ right + 3, y + 2 ],
				[ right + 2, y + 7 ],
				[ right - 1, y + 7 ],
			],
			palette[ 1 ],
		);

		spec(ctx, left - 2, y + 2, 2.2, 3.2, palette[ 2 ], 0.65);

		spec(ctx, right - 1, y + 2, 2, 3.2, palette[ 2 ], 0.6);
	}

	/**
	 * Renders the base Hero class silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function drawHero(ctx) {
		ground(ctx, 22);

		poly(
			ctx,
			[
				[ 16, 30 ],
				[ 12, 37 ],
				[ 15, 51 ],
				[ 20, 49 ],
				[ 22, 36 ],
			],
			P.blue0,
		);

		poly(
			ctx,
			[
				[ 48, 30 ],
				[ 53, 37 ],
				[ 50, 51 ],
				[ 45, 49 ],
				[ 42, 36 ],
			],
			P.red0,
		);

		poly(
			ctx,
			[
				[ 22, 46 ],
				[ 30, 46 ],
				[ 29, 57 ],
				[ 27, 60 ],
				[ 20, 60 ],
				[ 23, 54 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 34, 46 ],
				[ 42, 46 ],
				[ 43, 54 ],
				[ 46, 60 ],
				[ 38, 60 ],
				[ 35, 57 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 23, 48 ],
				[ 29, 48 ],
				[ 28, 55 ],
				[ 25, 57 ],
				[ 22, 57 ],
			],
			P.steel1,
		);

		poly(
			ctx,
			[
				[ 35, 48 ],
				[ 41, 48 ],
				[ 42, 55 ],
				[ 39, 57 ],
				[ 36, 55 ],
			],
			P.steel2,
		);

		rect(ctx, 24, 49, 4, 2, P.steel2, 0.6);

		rect(ctx, 36, 49, 4, 2, P.steel3, 0.5);

		rr(ctx, 20, 57, [ 9, 5 ], 1.5, P.iron0);

		rr(ctx, 38, 57, [ 9, 5 ], 1.5, P.iron0);

		spec(ctx, 21, 58, 5, 0.9, P.steel2, 0.55);

		spec(ctx, 39, 58, 5, 0.9, P.steel2, 0.55);

		poly(
			ctx,
			[
				[ 20, 27 ],
				[ 27, 24 ],
				[ 37, 24 ],
				[ 44, 27 ],
				[ 42, 48 ],
				[ 36, 52 ],
				[ 28, 52 ],
				[ 22, 48 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 22, 28 ],
				[ 28, 26 ],
				[ 36, 26 ],
				[ 42, 28 ],
				[ 40, 46 ],
				[ 35, 49 ],
				[ 29, 49 ],
				[ 24, 46 ],
			],
			P.blue1,
		);

		poly(
			ctx,
			[
				[ 28, 27 ],
				[ 36, 27 ],
				[ 38, 46 ],
				[ 34, 48 ],
				[ 30, 48 ],
			],
			P.blue2,
		);

		poly(
			ctx,
			[
				[ 23, 31 ],
				[ 27, 29 ],
				[ 27, 45 ],
				[ 24, 43 ],
			],
			P.blue0,
		);

		poly(
			ctx,
			[
				[ 28, 34 ],
				[ 36, 34 ],
				[ 37, 48 ],
				[ 32, 51 ],
				[ 27, 48 ],
			],
			P.red1,
		);

		poly(
			ctx,
			[
				[ 30, 34 ],
				[ 35, 34 ],
				[ 35, 47 ],
				[ 32, 49 ],
				[ 30, 47 ],
			],
			P.red2,
		);

		diamond(ctx, 32, 41, 5, 7, P.gold2);

		diamond(ctx, 32, 41, 2.6, 4, P.gold3, 0.9);

		line(
			ctx,
			[
				[ 28, 35 ],
				[ 36, 35 ],
			],
			P.gold2,
			1,
			0.8,
		);

		rect(ctx, 23, 45, 19, 4, P.gold0);

		rect(ctx, 24, 45.5, 17, 2, P.gold2, 0.65);

		diamond(ctx, 32, 47, 4, 4, P.gold3, 0.9);

		shoulderArmor(ctx, 22, 42, 26, [ P.steel0, P.steel1, P.steel2 ]);

		poly(
			ctx,
			[
				[ 18, 28 ],
				[ 24, 30 ],
				[ 23, 42 ],
				[ 18, 47 ],
				[ 15, 44 ],
				[ 18, 39 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 19, 30 ],
				[ 23, 31 ],
				[ 22, 40 ],
				[ 19, 44 ],
				[ 17, 43 ],
				[ 19, 38 ],
			],
			P.blue1,
		);

		poly(
			ctx,
			[
				[ 46, 29 ],
				[ 42, 30 ],
				[ 43, 41 ],
				[ 48, 47 ],
				[ 51, 44 ],
				[ 47, 38 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 45, 31 ],
				[ 42, 32 ],
				[ 44, 40 ],
				[ 48, 44 ],
				[ 49, 43 ],
				[ 46, 38 ],
			],
			P.red1,
		);

		rr(ctx, 14.5, 42, [ 5, 6 ], 2, P.skin1);

		rr(ctx, 47, 43, [ 5, 6 ], 2, P.skin2);

		rect(ctx, 15.5, 43, 2, 2, P.skin3, 0.55);

		rect(ctx, 48, 44, 2, 2, P.skin3, 0.55);

		rect(ctx, 28, 23, 8, 5, P.skin1);

		heroHead(ctx, 32, 11, true);

		poly(
			ctx,
			[
				[ 25, 16 ],
				[ 25, 11 ],
				[ 29, 8 ],
				[ 37, 9 ],
				[ 40, 13 ],
				[ 38, 18 ],
				[ 35, 14 ],
				[ 31, 17 ],
			],
			P.iron0,
		);

		poly(
			ctx,
			[
				[ 27, 13 ],
				[ 30, 10 ],
				[ 35, 10 ],
				[ 37, 13 ],
				[ 34, 12 ],
				[ 31, 15 ],
			],
			P.iron2,
		);

		rect(ctx, 28, 17, 2, 1.4, P.steel3, 0.7);

		rect(ctx, 35, 17, 2, 1.4, P.steel3, 0.65);

		poly(
			ctx,
			[
				[ 27, 11 ],
				[ 29, 7 ],
				[ 32, 3 ],
				[ 35, 7 ],
				[ 38, 11 ],
			],
			P.steel0,
		);

		poly(
			ctx,
			[
				[ 29, 8 ],
				[ 32, 4 ],
				[ 35, 8 ],
				[ 34, 10 ],
				[ 30, 10 ],
			],
			P.steel2,
		);

		spec(ctx, 31, 6, 1.1, 4, P.steel4, 0.7);

		poly(
			ctx,
			[
				[ 39, 31 ],
				[ 45, 29 ],
				[ 48, 39 ],
				[ 45, 43 ],
				[ 41, 40 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 41, 31 ],
				[ 44, 31 ],
				[ 46, 39 ],
				[ 44, 41 ],
				[ 42, 39 ],
			],
			P.steel1,
		);

		rect(ctx, 42, 33, 2, 5, P.steel3, 0.5);
	}

	/**
	 * Renders the Warrior class silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function drawWarrior(ctx) {
		ground(ctx, 25);

		poly(
			ctx,
			[
				[ 14, 28 ],
				[ 9, 38 ],
				[ 12, 56 ],
				[ 20, 51 ],
				[ 22, 34 ],
			],
			P.red0,
		);

		poly(
			ctx,
			[
				[ 50, 28 ],
				[ 55, 37 ],
				[ 52, 56 ],
				[ 45, 51 ],
				[ 42, 34 ],
			],
			P.red1,
		);

		poly(
			ctx,
			[
				[ 21, 45 ],
				[ 31, 46 ],
				[ 29, 59 ],
				[ 25, 63 ],
				[ 18, 63 ],
				[ 21, 54 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 33, 45 ],
				[ 43, 45 ],
				[ 47, 54 ],
				[ 46, 63 ],
				[ 38, 63 ],
				[ 35, 57 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 22, 48 ],
				[ 29, 48 ],
				[ 28, 56 ],
				[ 25, 60 ],
				[ 21, 60 ],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[ 35, 48 ],
				[ 42, 48 ],
				[ 45, 55 ],
				[ 44, 60 ],
				[ 39, 60 ],
				[ 37, 56 ],
			],
			P.iron2,
		);

		rect(ctx, 22, 51, 6, 2, P.steel3, 0.55);

		rect(ctx, 37, 51, 5, 2, P.steel3, 0.5);

		rr(ctx, 18, 59, [ 11, 5 ], 1.5, P.iron0);

		rr(ctx, 39, 59, [ 10, 5 ], 1.5, P.iron0);

		poly(
			ctx,
			[
				[ 18, 25 ],
				[ 27, 21 ],
				[ 38, 21 ],
				[ 47, 26 ],
				[ 44, 49 ],
				[ 37, 53 ],
				[ 26, 52 ],
				[ 19, 48 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 20, 27 ],
				[ 28, 24 ],
				[ 37, 24 ],
				[ 45, 28 ],
				[ 42, 46 ],
				[ 36, 49 ],
				[ 27, 49 ],
				[ 22, 46 ],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[ 25, 26 ],
				[ 37, 25 ],
				[ 40, 45 ],
				[ 35, 48 ],
				[ 28, 47 ],
			],
			P.iron2,
		);

		line(
			ctx,
			[
				[ 24, 31 ],
				[ 41, 30 ],
			],
			P.iron0,
			2,
			0.8,
		);

		line(
			ctx,
			[
				[ 23, 38 ],
				[ 42, 37 ],
			],
			P.iron0,
			2,
			0.75,
		);

		line(
			ctx,
			[
				[ 24, 44 ],
				[ 41, 43 ],
			],
			P.iron0,
			2,
			0.8,
		);

		spec(ctx, 26, 27, 2, 10, P.steel4, 0.35);

		rect(ctx, 21, 45, 23, 5, P.leather0);

		rect(ctx, 22, 46, 21, 2, P.leather3, 0.7);

		rr(ctx, 30, 45, [ 5, 5 ], 1, P.gold1);

		rr(ctx, 31, 46, [ 3, 3 ], 0.7, P.gold3, 0.8);

		shoulderArmor(ctx, 20, 45, 24, [ P.iron0, P.iron1, P.iron3 ]);

		poly(
			ctx,
			[
				[ 16, 27 ],
				[ 23, 29 ],
				[ 22, 43 ],
				[ 17, 49 ],
				[ 12, 45 ],
				[ 15, 37 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 17, 29 ],
				[ 21, 30 ],
				[ 20, 41 ],
				[ 17, 46 ],
				[ 14, 44 ],
				[ 17, 37 ],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[ 48, 28 ],
				[ 42, 29 ],
				[ 43, 43 ],
				[ 48, 48 ],
				[ 52, 44 ],
				[ 49, 36 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 47, 30 ],
				[ 43, 31 ],
				[ 44, 41 ],
				[ 48, 45 ],
				[ 50, 43 ],
				[ 48, 37 ],
			],
			P.iron2,
		);

		rr(ctx, 12, 43, [ 6, 6 ], 2, P.leather2);

		rr(ctx, 47, 43, [ 6, 6 ], 2, P.leather2);

		rect(ctx, 27, 20, 10, 7, P.skin1);

		heroHead(ctx, 32, 8, false);

		poly(
			ctx,
			[
				[ 22, 17 ],
				[ 24, 8 ],
				[ 29, 5 ],
				[ 36, 5 ],
				[ 41, 9 ],
				[ 43, 18 ],
				[ 38, 21 ],
				[ 26, 21 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 25, 16 ],
				[ 26, 10 ],
				[ 30, 7 ],
				[ 36, 7 ],
				[ 39, 10 ],
				[ 40, 17 ],
				[ 36, 19 ],
				[ 28, 19 ],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[ 27, 10 ],
				[ 31, 7 ],
				[ 36, 8 ],
				[ 38, 11 ],
				[ 35, 12 ],
				[ 29, 12 ],
			],
			P.iron3,
		);

		rect(ctx, 28, 14, 9, 4, P.deepest);

		rect(ctx, 29, 15, 7, 1.4, P.red2, 0.9);

		poly(
			ctx,
			[
				[ 25, 10 ],
				[ 19, 4 ],
				[ 22, 14 ],
			],
			P.leather2,
		);

		poly(
			ctx,
			[
				[ 39, 10 ],
				[ 45, 4 ],
				[ 42, 14 ],
			],
			P.leather3,
		);

		spec(ctx, 28, 9, 1.4, 5, P.steel4, 0.5);

		line(
			ctx,
			[
				[ 47, 48 ],
				[ 54, 10 ],
			],
			P.leather0,
			4,
		);

		line(
			ctx,
			[
				[ 47, 47 ],
				[ 54, 10 ],
			],
			P.leather3,
			1.4,
		);

		poly(
			ctx,
			[
				[ 45, 13 ],
				[ 50, 6 ],
				[ 59, 6 ],
				[ 61, 10 ],
				[ 56, 18 ],
				[ 49, 18 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 47, 13 ],
				[ 51, 8 ],
				[ 57, 8 ],
				[ 58, 10 ],
				[ 54, 16 ],
				[ 49, 16 ],
			],
			P.steel2,
		);

		poly(
			ctx,
			[
				[ 50, 9 ],
				[ 56, 9 ],
				[ 54, 12 ],
				[ 49, 12 ],
			],
			P.steel4,
			0.7,
		);
	}

	/**
	 * Renders the Mage class silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function drawMage(ctx) {
		ground(ctx, 23);

		poly(
			ctx,
			[
				[ 20, 27 ],
				[ 44, 27 ],
				[ 48, 40 ],
				[ 53, 61 ],
				[ 40, 62 ],
				[ 32, 56 ],
				[ 24, 62 ],
				[ 11, 61 ],
				[ 17, 42 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 22, 29 ],
				[ 42, 29 ],
				[ 45, 41 ],
				[ 49, 59 ],
				[ 40, 59 ],
				[ 33, 53 ],
				[ 26, 59 ],
				[ 15, 59 ],
				[ 19, 42 ],
			],
			P.cloth1,
		);

		poly(
			ctx,
			[
				[ 27, 29 ],
				[ 37, 29 ],
				[ 41, 54 ],
				[ 33, 58 ],
				[ 24, 55 ],
			],
			P.cloth2,
		);

		poly(
			ctx,
			[
				[ 34, 30 ],
				[ 41, 31 ],
				[ 44, 48 ],
				[ 40, 56 ],
				[ 36, 51 ],
			],
			P.cloth3,
			0.42,
		);

		poly(
			ctx,
			[
				[ 29, 29 ],
				[ 35, 29 ],
				[ 36, 55 ],
				[ 32, 59 ],
				[ 29, 54 ],
			],
			P.violet1,
		);

		line(
			ctx,
			[
				[ 32, 30 ],
				[ 33, 54 ],
			],
			P.violet3,
			1,
			0.65,
		);

		line(
			ctx,
			[
				[ 21, 38 ],
				[ 27, 55 ],
			],
			P.cloth3,
			1,
			0.45,
		);

		line(
			ctx,
			[
				[ 42, 38 ],
				[ 38, 56 ],
			],
			P.violet3,
			1,
			0.4,
		);

		line(
			ctx,
			[
				[ 18, 48 ],
				[ 25, 59 ],
			],
			P.violet0,
			1.5,
			0.8,
		);

		poly(
			ctx,
			[
				[ 19, 29 ],
				[ 26, 31 ],
				[ 23, 44 ],
				[ 16, 50 ],
				[ 12, 46 ],
				[ 17, 38 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 20, 31 ],
				[ 24, 32 ],
				[ 21, 42 ],
				[ 16, 47 ],
				[ 14, 45 ],
				[ 18, 38 ],
			],
			P.cloth2,
		);

		poly(
			ctx,
			[
				[ 45, 29 ],
				[ 39, 31 ],
				[ 41, 43 ],
				[ 47, 50 ],
				[ 51, 46 ],
				[ 47, 38 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 44, 31 ],
				[ 41, 32 ],
				[ 43, 42 ],
				[ 48, 47 ],
				[ 49, 45 ],
				[ 46, 38 ],
			],
			P.cloth2,
		);

		rr(ctx, 13, 44, [ 5, 6 ], 2, P.skin2);

		rr(ctx, 47, 44, [ 5, 6 ], 2, P.skin2);

		rect(ctx, 28, 21, 8, 8, P.skin1);

		heroHead(ctx, 32, 10, true);

		poly(
			ctx,
			[
				[ 22, 22 ],
				[ 22, 12 ],
				[ 27, 6 ],
				[ 36, 5 ],
				[ 42, 11 ],
				[ 42, 23 ],
				[ 38, 28 ],
				[ 26, 27 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 25, 20 ],
				[ 25, 13 ],
				[ 29, 9 ],
				[ 35, 8 ],
				[ 39, 12 ],
				[ 39, 21 ],
				[ 35, 25 ],
				[ 29, 24 ],
			],
			P.cloth1,
		);

		poly(
			ctx,
			[
				[ 27, 12 ],
				[ 30, 9 ],
				[ 36, 10 ],
				[ 39, 14 ],
				[ 35, 15 ],
				[ 29, 15 ],
			],
			P.cloth3,
			0.45,
		);

		poly(
			ctx,
			[
				[ 28, 16 ],
				[ 38, 15 ],
				[ 38, 22 ],
				[ 34, 25 ],
				[ 29, 23 ],
			],
			P.skin1,
		);

		rect(ctx, 29, 18, 2.4, 1.5, P.violet3, 0.85);

		rect(ctx, 35, 18, 2.4, 1.5, P.violet3, 0.85);

		line(
			ctx,
			[
				[ 47, 57 ],
				[ 51, 10 ],
			],
			P.leather0,
			4,
		);

		line(
			ctx,
			[
				[ 48, 56 ],
				[ 51, 11 ],
			],
			P.leather3,
			1.2,
		);

		glow(ctx, 51, 10, 9, P.violet2, 0.22);

		diamond(ctx, 51, 10, 9, 11, P.violet1);

		diamond(ctx, 51, 10, 5, 7, P.violet3, 0.9);

		diamond(ctx, 51, 10, 2, 4, P.steel4, 0.9);

		diamond(ctx, 44, 25, 2, 3, P.violet3, 0.8);

		diamond(ctx, 48, 20, 1.6, 2.4, P.violet2, 0.7);
	}

	/**
	 * Renders the Healer class silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function drawHealer(ctx) {
		ground(ctx, 23);

		poly(
			ctx,
			[
				[ 20, 27 ],
				[ 44, 27 ],
				[ 49, 42 ],
				[ 51, 61 ],
				[ 39, 61 ],
				[ 32, 56 ],
				[ 25, 61 ],
				[ 13, 61 ],
				[ 16, 43 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 22, 29 ],
				[ 42, 29 ],
				[ 46, 42 ],
				[ 48, 59 ],
				[ 40, 59 ],
				[ 33, 53 ],
				[ 25, 59 ],
				[ 16, 59 ],
				[ 19, 42 ],
			],
			P.steel3,
		);

		poly(
			ctx,
			[
				[ 26, 30 ],
				[ 38, 30 ],
				[ 41, 53 ],
				[ 33, 57 ],
				[ 24, 54 ],
			],
			P.steel4,
		);

		poly(
			ctx,
			[
				[ 27, 29 ],
				[ 37, 29 ],
				[ 35, 53 ],
				[ 32, 57 ],
				[ 29, 53 ],
			],
			P.gold1,
		);

		line(
			ctx,
			[
				[ 32, 30 ],
				[ 32, 54 ],
			],
			P.gold3,
			1.5,
			0.8,
		);

		rect(ctx, 29.5, 37, 5, 13, P.holy2);

		rect(ctx, 26, 40.5, 12, 5, P.holy2);

		rect(ctx, 31, 38, 2, 10, P.holy3, 0.9);

		poly(
			ctx,
			[
				[ 19, 29 ],
				[ 26, 31 ],
				[ 23, 44 ],
				[ 16, 50 ],
				[ 12, 46 ],
				[ 17, 38 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 20, 31 ],
				[ 24, 32 ],
				[ 21, 42 ],
				[ 16, 47 ],
				[ 14, 45 ],
				[ 18, 38 ],
			],
			P.steel2,
		);

		poly(
			ctx,
			[
				[ 45, 29 ],
				[ 39, 31 ],
				[ 41, 43 ],
				[ 48, 50 ],
				[ 52, 46 ],
				[ 47, 38 ],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[ 44, 31 ],
				[ 41, 32 ],
				[ 43, 42 ],
				[ 48, 47 ],
				[ 50, 45 ],
				[ 46, 38 ],
			],
			P.steel3,
		);

		rr(ctx, 13, 44, [ 5, 6 ], 2, P.skin2);

		rr(ctx, 47, 44, [ 5, 6 ], 2, P.skin2);

		rect(ctx, 28, 21, 8, 8, P.skin1);

		heroHead(ctx, 32, 10, true);

		line(
			ctx,
			[
				[ 24, 16 ],
				[ 27, 10 ],
				[ 32, 8 ],
				[ 37, 10 ],
				[ 40, 16 ],
			],
			P.gold2,
			2,
		);

		diamond(ctx, 32, 9, 4, 5, P.holy3, 0.95);

		rect(ctx, 29, 17, 2, 1.3, P.steel4, 0.75);

		rect(ctx, 35, 17, 2, 1.3, P.steel4, 0.75);

		line(
			ctx,
			[
				[ 47, 57 ],
				[ 51, 24 ],
			],
			P.leather0,
			4,
		);

		line(
			ctx,
			[
				[ 48, 56 ],
				[ 51, 25 ],
			],
			P.gold2,
			1.2,
		);

		glow(ctx, 51, 18, 9, P.holy2, 0.2);

		diamond(ctx, 51, 18, 11, 11, P.holy1);

		diamond(ctx, 51, 18, 7, 7, P.holy2);

		diamond(ctx, 51, 18, 3, 5, P.holy3);
	}

	const HERO_BAKERS = Object.freeze({
		HERO: drawHero,
		WARRIOR: drawWarrior,
		MAGE: drawMage,
		HEALER: drawHealer,
	});
	//#endregion

	const Heroes = Object.freeze({
		heroHead,
		shoulderArmor,
		drawHero,
		drawWarrior,
		drawMage,
		drawHealer,
		HERO_BAKERS,
	});

	if (typeof window !== "undefined") {
		window._BattlerBakerInternal.Heroes = Heroes;
	}
	if (typeof module !== "undefined" && module.exports) {
		module.exports = Heroes;
	}
})();
