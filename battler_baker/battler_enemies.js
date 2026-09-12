/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: BATTLER ENEMIES SUB-MODULE
 * Document Identifier: VSRP-001-BATTLER-ENEMIES
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-BATTLER-BAKER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-05] Enemy Battler Silhouette Bakers (Lines 2142–3669)
 *
 * STAGING MEMBRANE KEY: window._BattlerBakerInternal.Enemies
 * DEPENDENCIES:
 *   window._BattlerBakerInternal.Primitives
 * ============================================================================
 */

if (typeof window !== 'undefined') window._BattlerBakerInternal = window._BattlerBakerInternal || {};

(() => {
	'use strict';

	const { P, rect, rr, poly, line, ellipse, diamond, ground, glow, spec } = window._BattlerBakerInternal.Primitives || (typeof require !== 'undefined' ? require('./battler_primitives.js') : {});

	//#region [SEC-05] Enemy Battler Silhouette Bakers
	/**
	 * Renders the Shade Wolf enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function shadeWolf(ctx) {
		ground(ctx, 23);

		poly(
			ctx,
			[
				[18, 39],
				[8, 32],
				[5, 35],
				[13, 43],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[15, 39],
				[9, 34],
				[8, 36],
				[13, 41],
			],
			P.steel1,
		);

		poly(
			ctx,
			[
				[17, 42],
				[25, 45],
				[23, 59],
				[18, 61],
				[15, 57],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[40, 43],
				[47, 42],
				[50, 57],
				[46, 61],
				[41, 58],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[18, 45],
				[23, 46],
				[21, 56],
				[18, 58],
			],
			P.steel1,
		);

		poly(
			ctx,
			[
				[42, 45],
				[46, 44],
				[48, 56],
				[45, 58],
			],
			P.steel2,
		);

		poly(
			ctx,
			[
				[14, 28],
				[25, 21],
				[39, 22],
				[50, 30],
				[47, 45],
				[39, 51],
				[24, 49],
				[16, 43],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[17, 30],
				[26, 24],
				[38, 25],
				[47, 31],
				[44, 42],
				[38, 47],
				[25, 46],
				[19, 41],
			],
			P.steel0,
		);

		poly(
			ctx,
			[
				[25, 27],
				[38, 27],
				[43, 33],
				[39, 41],
				[28, 43],
				[21, 38],
			],
			P.steel1,
		);

		poly(
			ctx,
			[
				[20, 33],
				[28, 28],
				[30, 42],
				[24, 44],
			],
			P.steel2,
			0.32,
		);

		poly(
			ctx,
			[
				[37, 27],
				[39, 17],
				[45, 23],
				[53, 20],
				[57, 27],
				[54, 37],
				[46, 40],
				[38, 36],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[40, 27],
				[41, 20],
				[45, 25],
				[52, 22],
				[55, 27],
				[52, 34],
				[45, 37],
				[40, 34],
			],
			P.black,
		);

		poly(
			ctx,
			[
				[41, 21],
				[44, 25],
				[41, 27],
			],
			P.steel2,
			0.55,
		);

		poly(
			ctx,
			[
				[52, 23],
				[54, 27],
				[51, 28],
			],
			P.steel1,
			0.7,
		);

		diamond(ctx, 46, 29, 4, 3, P.red2);

		diamond(ctx, 52, 28, 4, 3, P.red2);

		rect(ctx, 45.5, 28.6, 1.3, 0.9, P.red3);

		rect(ctx, 51.5, 27.6, 1.3, 0.9, P.red3);

		poly(
			ctx,
			[
				[46, 32],
				[55, 31],
				[52, 38],
				[47, 37],
			],
			P.steel1,
		);

		rect(ctx, 49, 36, 1, 2, P.steel4, 0.9);

		rect(ctx, 53, 35, 1, 2, P.steel4, 0.9);

		for (const x of [17, 21, 44, 48]) {
			line(
				ctx,
				[
					[x, 56],
					[x - 1, 59],
				],
				P.steel3,
				1,
				0.8,
			);
		}

		glow(ctx, 48, 29, 6, P.red2, 0.08);
	}

	/**
	 * Renders the Bone Archer enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function boneArcher(ctx) {
		ground(ctx, 20);

		poly(
			ctx,
			[
				[19, 27],
				[45, 27],
				[49, 47],
				[54, 61],
				[41, 59],
				[35, 62],
				[28, 58],
				[19, 62],
				[12, 58],
				[17, 46],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[21, 29],
				[42, 29],
				[46, 47],
				[49, 58],
				[41, 56],
				[35, 59],
				[29, 56],
				[20, 59],
				[16, 56],
				[20, 44],
			],
			P.black,
		);

		rect(ctx, 25, 31, 13, 3, P.steel2);

		rect(ctx, 24, 36, 15, 2, P.steel3);

		rect(ctx, 24, 41, 15, 2, P.steel2);

		line(
			ctx,
			[
				[28, 30],
				[28, 45],
			],
			P.steel3,
			1,
		);

		line(
			ctx,
			[
				[36, 30],
				[36, 45],
			],
			P.steel3,
			1,
		);

		line(
			ctx,
			[
				[22, 32],
				[16, 47],
			],
			P.steel2,
			3,
		);

		line(
			ctx,
			[
				[42, 32],
				[46, 44],
			],
			P.steel3,
			3,
		);

		rr(ctx, 24, 11, [17, 18], 4, P.outline);

		rr(ctx, 26, 13, [13, 14], 3, P.steel3);

		rect(ctx, 28, 17, 4, 4, P.outline);

		rect(ctx, 34, 17, 4, 4, P.outline);

		rect(ctx, 29, 18, 2, 1, P.green2, 0.85);

		rect(ctx, 35, 18, 2, 1, P.green2, 0.85);

		poly(
			ctx,
			[
				[29, 23],
				[36, 23],
				[34, 27],
				[31, 27],
			],
			P.steel1,
		);

		poly(
			ctx,
			[
				[20, 15],
				[24, 9],
				[30, 6],
				[39, 8],
				[44, 14],
				[41, 17],
				[37, 12],
				[27, 12],
			],
			P.red0,
		);

		line(
			ctx,
			[
				[14, 11],
				[14, 53],
			],
			P.leather3,
			2.5,
		);

		line(
			ctx,
			[
				[14, 11],
				[19, 31],
				[14, 53],
			],
			P.leather1,
			2,
		);

		line(
			ctx,
			[
				[14, 11],
				[14, 53],
			],
			P.steel4,
			0.6,
			0.8,
		);

		line(
			ctx,
			[
				[16, 32],
				[46, 32],
			],
			P.steel2,
			0.7,
			0.8,
		);

		line(
			ctx,
			[
				[18, 31],
				[47, 31],
			],
			P.steel3,
			1.2,
		);

		poly(
			ctx,
			[
				[47, 31],
				[43, 29],
				[43, 33],
			],
			P.steel4,
		);

		glow(ctx, 36, 18, 5, P.green2, 0.06);
	}

	/**
	 * Renders the Catacomb Skeleton enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function catacombSkeleton(ctx) {
		ground(ctx, 20);

		poly(
			ctx,
			[
				[18, 29],
				[25, 25],
				[40, 26],
				[47, 31],
				[45, 48],
				[40, 53],
				[24, 51],
				[18, 46],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[21, 30],
				[27, 27],
				[38, 28],
				[44, 32],
				[42, 45],
				[38, 49],
				[26, 48],
				[21, 44],
			],
			P.leather0,
		);

		for (let i = 0; i < 4; i++) {
			line(
				ctx,
				[
					[27, 31 + i * 4],
					[38, 31 + i * 4],
				],
				P.steel3,
				1.5,
				0.9,
			);
		}

		line(
			ctx,
			[
				[32, 30],
				[32, 47],
			],
			P.steel2,
			1.2,
		);

		rr(ctx, 24, 10, [17, 20], 4, P.outline);

		rr(ctx, 26, 12, [13, 16], 3, P.steel3);

		poly(
			ctx,
			[
				[27, 13],
				[31, 11],
				[38, 14],
				[38, 19],
				[27, 19],
			],
			P.steel4,
			0.65,
		);

		rect(ctx, 28, 17, 4, 4, P.outline);

		rect(ctx, 34, 17, 4, 4, P.outline);

		rect(ctx, 29, 18, 2, 1, P.fire2);

		rect(ctx, 35, 18, 2, 1, P.fire2);

		poly(
			ctx,
			[
				[30, 23],
				[36, 23],
				[33, 27],
			],
			P.steel1,
		);

		line(
			ctx,
			[
				[21, 31],
				[15, 47],
			],
			P.steel2,
			3,
		);

		line(
			ctx,
			[
				[42, 31],
				[48, 45],
			],
			P.steel3,
			3,
		);

		line(
			ctx,
			[
				[48, 47],
				[55, 16],
			],
			P.leather1,
			3,
		);

		line(
			ctx,
			[
				[55, 16],
				[57, 11],
			],
			P.steel3,
			2,
		);

		line(
			ctx,
			[
				[53, 29],
				[58, 30],
			],
			P.gold2,
			2,
		);

		line(
			ctx,
			[
				[27, 47],
				[24, 60],
			],
			P.steel2,
			4,
		);

		line(
			ctx,
			[
				[37, 47],
				[41, 60],
			],
			P.steel2,
			4,
		);

		line(
			ctx,
			[
				[22, 61],
				[29, 61],
			],
			P.steel1,
			3,
		);

		line(
			ctx,
			[
				[39, 61],
				[46, 61],
			],
			P.steel1,
			3,
		);
	}

	/**
	 * Renders the Cave Spider enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function caveSpider(ctx) {
		ground(ctx, 24);

		const legs = [
			[
				[24, 35],
				[15, 29],
				[7, 25],
			],
			[
				[23, 39],
				[13, 37],
				[5, 35],
			],
			[
				[23, 44],
				[13, 46],
				[6, 51],
			],
			[
				[27, 47],
				[19, 54],
				[13, 61],
			],
			[
				[40, 35],
				[49, 29],
				[57, 25],
			],
			[
				[41, 39],
				[51, 37],
				[59, 35],
			],
			[
				[41, 44],
				[51, 46],
				[58, 51],
			],
			[
				[37, 47],
				[45, 54],
				[51, 61],
			],
		];

		for (const pts of legs) {
			line(ctx, pts, P.outline, 4);

			line(ctx, pts, P.violet1, 1.7);

			diamond(ctx, pts[1][0], pts[1][1], 2.5, 2.5, P.violet2, 0.7);
		}

		ellipse(ctx, 32, 43, 14, 12, P.outline);

		ellipse(ctx, 32, 42, 12, 10, P.violet0);

		ellipse(ctx, 32, 39, 9, 7, P.violet1);

		diamond(ctx, 32, 39, 5, 6, P.green2, 0.9);

		diamond(ctx, 32, 48, 4, 5, P.red2, 0.75);

		ellipse(ctx, 32, 26, 11, 9, P.outline);

		ellipse(ctx, 32, 26, 9, 7, P.black);

		for (const [x, y] of [
			[27, 24],
			[32, 22],
			[37, 24],
			[28, 28],
			[36, 28],
		]) {
			diamond(ctx, x, y, 3, 3, P.green2, 0.95);

			rect(ctx, x - 0.5, y - 0.4, 1, 0.7, P.green3);
		}

		poly(
			ctx,
			[
				[27, 30],
				[30, 30],
				[29, 35],
			],
			P.steel4,
		);

		poly(
			ctx,
			[
				[37, 30],
				[34, 30],
				[35, 35],
			],
			P.steel4,
		);

		glow(ctx, 32, 25, 9, P.green2, 0.09);
	}

	/**
	 * Renders the Dread Acolyte enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function dreadAcolyte(ctx) {
		ground(ctx, 21);

		poly(
			ctx,
			[
				[19, 27],
				[45, 27],
				[49, 41],
				[53, 62],
				[40, 61],
				[32, 55],
				[24, 61],
				[11, 62],
				[16, 42],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[21, 29],
				[43, 29],
				[46, 42],
				[49, 59],
				[40, 58],
				[33, 52],
				[25, 58],
				[15, 59],
				[19, 42],
			],
			P.violet0,
		);

		poly(
			ctx,
			[
				[26, 30],
				[38, 30],
				[40, 53],
				[33, 56],
				[25, 53],
			],
			P.violet1,
		);

		line(
			ctx,
			[
				[32, 30],
				[33, 53],
			],
			P.violet3,
			1.2,
			0.5,
		);

		poly(
			ctx,
			[
				[21, 25],
				[22, 13],
				[27, 7],
				[37, 6],
				[43, 12],
				[43, 26],
				[38, 31],
				[26, 30],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[24, 23],
				[25, 14],
				[29, 10],
				[36, 9],
				[40, 13],
				[40, 23],
				[36, 27],
				[28, 26],
			],
			P.violet0,
		);

		poly(
			ctx,
			[
				[27, 14],
				[30, 10],
				[36, 11],
				[39, 14],
				[36, 16],
				[29, 16],
			],
			P.violet2,
			0.35,
		);

		poly(
			ctx,
			[
				[27, 16],
				[38, 15],
				[38, 23],
				[34, 27],
				[29, 24],
			],
			P.deepest,
		);

		rect(ctx, 29, 18, 3, 1.6, P.violet3);

		rect(ctx, 34, 18, 3, 1.6, P.violet3);

		rr(ctx, 13, 43, [6, 6], 2, P.skin1);

		rr(ctx, 45, 43, [6, 6], 2, P.skin1);

		diamond(ctx, 16, 45, 3, 4, P.fire2);

		diamond(ctx, 48, 45, 3, 4, P.fire2);

		line(
			ctx,
			[
				[48, 58],
				[51, 13],
			],
			P.leather0,
			3,
		);

		line(
			ctx,
			[
				[49, 57],
				[51, 14],
			],
			P.leather3,
			1,
		);

		poly(
			ctx,
			[
				[51, 15],
				[47, 10],
				[51, 4],
				[55, 10],
			],
			P.violet1,
		);

		diamond(ctx, 51, 9, 5, 6, P.violet3, 0.85);

		glow(ctx, 51, 10, 8, P.violet2, 0.18);

		diamond(ctx, 32, 38, 8, 10, P.red1, 0.9);

		diamond(ctx, 32, 38, 4, 6, P.fire3, 0.9);
	}

	/**
	 * Renders the Iron Brute enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function ironBrute(ctx) {
		ground(ctx, 27);

		poly(
			ctx,
			[
				[13, 26],
				[22, 20],
				[42, 20],
				[51, 27],
				[48, 43],
				[45, 52],
				[38, 55],
				[26, 55],
				[19, 51],
				[15, 42],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[16, 28],
				[23, 23],
				[41, 23],
				[48, 29],
				[45, 42],
				[42, 49],
				[36, 52],
				[27, 51],
				[21, 48],
				[18, 40],
			],
			P.iron0,
		);

		poly(
			ctx,
			[
				[21, 27],
				[30, 24],
				[31, 42],
				[23, 43],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[33, 24],
				[41, 26],
				[43, 43],
				[34, 42],
			],
			P.iron2,
		);

		line(
			ctx,
			[
				[22, 31],
				[29, 30],
			],
			P.steel3,
			1,
			0.5,
		);

		line(
			ctx,
			[
				[35, 30],
				[41, 31],
			],
			P.steel4,
			1,
			0.45,
		);

		line(
			ctx,
			[
				[21, 38],
				[29, 37],
			],
			P.iron3,
			1,
			0.55,
		);

		line(
			ctx,
			[
				[35, 38],
				[43, 39],
			],
			P.iron0,
			1,
			0.8,
		);

		glow(ctx, 32, 37, 9, P.fire2, 0.18);

		diamond(ctx, 32, 37, 9, 11, P.fire1);

		diamond(ctx, 32, 37, 5, 7, P.fire3);

		diamond(ctx, 32, 37, 2, 4, P.steel4);

		poly(
			ctx,
			[
				[21, 47],
				[30, 47],
				[29, 61],
				[18, 63],
				[18, 57],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[34, 47],
				[43, 47],
				[47, 61],
				[37, 63],
				[34, 58],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[22, 49],
				[29, 49],
				[27, 59],
				[20, 60],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[35, 49],
				[41, 49],
				[44, 59],
				[38, 60],
			],
			P.iron2,
		);

		poly(
			ctx,
			[
				[22, 14],
				[27, 8],
				[38, 8],
				[43, 14],
				[42, 27],
				[36, 31],
				[27, 29],
				[21, 24],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[25, 15],
				[29, 11],
				[36, 11],
				[40, 15],
				[39, 24],
				[35, 27],
				[28, 26],
				[24, 22],
			],
			P.iron1,
		);

		rect(ctx, 27, 18, 12, 5, P.deepest);

		rect(ctx, 29, 19, 8, 1.6, P.red2);

		spec(ctx, 27, 13, 3, 1.2, P.steel4, 0.6);

		poly(
			ctx,
			[
				[16, 29],
				[22, 30],
				[20, 45],
				[15, 52],
				[9, 49],
				[12, 39],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[17, 31],
				[20, 32],
				[18, 43],
				[14, 49],
				[11, 47],
				[14, 39],
			],
			P.iron2,
		);

		poly(
			ctx,
			[
				[48, 29],
				[42, 30],
				[44, 45],
				[50, 52],
				[55, 49],
				[52, 39],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[47, 31],
				[44, 32],
				[46, 43],
				[50, 49],
				[53, 47],
				[50, 39],
			],
			P.iron1,
		);

		rr(ctx, 9, 47, [7, 7], 2, P.iron2);

		rr(ctx, 49, 47, [7, 7], 2, P.iron3);

		for (const [x, y] of [
			[23, 29],
			[39, 29],
			[23, 42],
			[41, 43],
			[27, 14],
			[37, 14],
		]) {
			diamond(ctx, x, y, 2, 2, P.steel3, 0.8);
		}
	}

	/**
	 * Renders the Boss Malakor enemy silhouette.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function bossMalakor(ctx) {
		ground(ctx, 28);

		glow(ctx, 32, 32, 27, P.fire1, 0.16);

		glow(ctx, 32, 45, 20, P.fire2, 0.1);

		poly(
			ctx,
			[
				[24, 24],
				[11, 14],
				[4, 25],
				[13, 31],
				[7, 43],
				[20, 40],
				[18, 57],
				[27, 48],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[40, 24],
				[53, 14],
				[60, 25],
				[51, 31],
				[57, 43],
				[44, 40],
				[46, 57],
				[37, 48],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[22, 26],
				[12, 18],
				[8, 25],
				[17, 31],
				[11, 39],
				[21, 37],
				[20, 49],
				[26, 43],
			],
			P.red0,
		);

		poly(
			ctx,
			[
				[42, 26],
				[52, 18],
				[56, 25],
				[47, 31],
				[53, 39],
				[43, 37],
				[44, 49],
				[38, 43],
			],
			P.red1,
		);

		poly(
			ctx,
			[
				[22, 43],
				[31, 45],
				[29, 61],
				[20, 63],
				[17, 58],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[33, 45],
				[42, 43],
				[47, 58],
				[44, 63],
				[35, 61],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[23, 46],
				[30, 47],
				[27, 59],
				[21, 60],
			],
			P.fire0,
		);

		poly(
			ctx,
			[
				[34, 47],
				[40, 46],
				[44, 59],
				[37, 60],
			],
			P.fire1,
		);

		poly(
			ctx,
			[
				[18, 22],
				[26, 17],
				[38, 17],
				[46, 22],
				[44, 47],
				[37, 53],
				[27, 52],
				[20, 46],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[21, 23],
				[27, 20],
				[37, 20],
				[43, 24],
				[41, 44],
				[36, 49],
				[28, 48],
				[23, 44],
			],
			P.fire0,
		);

		poly(
			ctx,
			[
				[26, 23],
				[37, 22],
				[40, 42],
				[35, 47],
				[29, 45],
			],
			P.fire1,
		);

		poly(
			ctx,
			[
				[28, 24],
				[37, 24],
				[37, 40],
				[32, 44],
				[28, 41],
			],
			P.fire2,
			0.75,
		);

		glow(ctx, 32, 34, 11, P.fire3, 0.25);

		diamond(ctx, 32, 34, 11, 14, P.fire1);

		diamond(ctx, 32, 34, 7, 10, P.fire3);

		diamond(ctx, 32, 34, 3, 6, P.holy3);

		poly(
			ctx,
			[
				[21, 16],
				[23, 8],
				[29, 3],
				[36, 3],
				[42, 9],
				[43, 18],
				[38, 25],
				[27, 24],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[24, 15],
				[26, 9],
				[30, 6],
				[36, 6],
				[40, 10],
				[40, 17],
				[36, 21],
				[29, 20],
			],
			P.red0,
		);

		poly(
			ctx,
			[
				[27, 9],
				[31, 6],
				[36, 7],
				[39, 10],
				[36, 12],
				[29, 12],
			],
			P.fire1,
		);

		rect(ctx, 27, 14, 5, 3, P.fire3);

		rect(ctx, 34, 14, 5, 3, P.fire3);

		rect(ctx, 29, 17, 9, 3, P.deepest);

		diamond(ctx, 32, 20, 5, 5, P.red2);

		poly(
			ctx,
			[
				[27, 7],
				[18, 0],
				[20, 11],
				[25, 14],
			],
			P.fire1,
		);

		poly(
			ctx,
			[
				[37, 7],
				[46, 0],
				[44, 11],
				[39, 14],
			],
			P.fire2,
		);

		poly(
			ctx,
			[
				[18, 24],
				[24, 26],
				[22, 42],
				[15, 49],
				[10, 45],
				[15, 35],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[19, 26],
				[22, 27],
				[20, 40],
				[15, 46],
				[12, 44],
				[17, 35],
			],
			P.red1,
		);

		poly(
			ctx,
			[
				[46, 24],
				[40, 26],
				[42, 42],
				[49, 49],
				[54, 45],
				[49, 35],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[45, 26],
				[42, 27],
				[44, 40],
				[49, 46],
				[52, 44],
				[47, 35],
			],
			P.red2,
		);

		line(
			ctx,
			[
				[50, 46],
				[57, 17],
			],
			P.outline,
			4,
		);

		line(
			ctx,
			[
				[50, 45],
				[57, 17],
			],
			P.steel2,
			2,
		);

		spec(ctx, 56, 18, 1, 16, P.steel4, 0.75);

		poly(
			ctx,
			[
				[26, 8],
				[28, 1],
				[32, 7],
				[36, 1],
				[39, 8],
			],
			P.gold1,
		);

		diamond(ctx, 32, 7, 4, 4, P.gold3, 0.9);
	}

	const ENEMY_BAKERS = Object.freeze({
		SHADE_WOLF: shadeWolf,
		BONE_ARCHER: boneArcher,
		CATACOMB_SKELETON: catacombSkeleton,
		CAVE_SPIDER: caveSpider,
		DREAD_ACOLYTE: dreadAcolyte,
		IRON_BRUTE: ironBrute,
		BOSS_MALAKOR: bossMalakor,
	});

	const EXPLICIT_ALIASES = Object.freeze({
		CRYPT_SKELETON: "CATACOMB_SKELETON",
		BLIGHT_SPIDER: "CAVE_SPIDER",
		MALAKOR: "BOSS_MALAKOR",
		CINDER_REVENANT: "BOSS_MALAKOR",
	});

	const SEMANTIC_RULES = Object.freeze([
		["WOLF", "SHADE_WOLF"],
		["ARCHER", "BONE_ARCHER"],
		["SKELETON", "CATACOMB_SKELETON"],
		["SPIDER", "CAVE_SPIDER"],
		["ACOLYTE", "DREAD_ACOLYTE"],
		["CULTIST", "DREAD_ACOLYTE"],
		["BRUTE", "IRON_BRUTE"],
		["GOLEM", "IRON_BRUTE"],
		["MALAKOR", "BOSS_MALAKOR"],
		["REVENANT", "BOSS_MALAKOR"],
		["BOSS", "BOSS_MALAKOR"],
	]);
	//#endregion

	const Enemies = Object.freeze({
		shadeWolf,
		boneArcher,
		catacombSkeleton,
		caveSpider,
		dreadAcolyte,
		ironBrute,
		bossMalakor,
		ENEMY_BAKERS,
		EXPLICIT_ALIASES,
		SEMANTIC_RULES,
	});

	if (typeof window !== 'undefined') {
		window._BattlerBakerInternal.Enemies = Enemies;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Enemies;
	}
})();
