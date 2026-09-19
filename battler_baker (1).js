/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: EMBERLIGHT BATTLER BAKER
 * Document Identifier: VSRP-001-BATTLER-BAKER-V4
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Module Constants, Palettes & Canvas Context Helpers
 *   [SEC-02] Drawing Primitives & Supersampling Scale Math
 *   [SEC-03] Hero Anatomy, Silhouette Builders & Class Bakers
 *   [SEC-04] Equipment Overlay Pipeline (Armor & Weapons)
 *   [SEC-05] Enemy Battler Silhouette Bakers
 *   [SEC-06] Semantic Resolution, Aliasing & Asset Resolvers
 *   [SEC-07] PNG Encoding & Composition Pipeline
 *   [SEC-08] Caching, Telemetry & Diagnostic Reporters
 *   [SEC-09] Canonical VSRP-001 9-Method Interface & Module Export
 * ============================================================================
 */

const EmberlightBattlerBaker = (() => {
	'use strict';

	//#region [SEC-01] Module Constants, Palettes & Canvas Context Helpers
	/**
	 * @typedef {Object} BattlerSpec
	 * @property {string} [id] - Requested asset identifier or enemy key.
	 * @property {string} [phenotype] - Hero class phenotype token.
	 * @property {string} [weapon] - Equipped weapon item identifier.
	 * @property {string} [armor] - Equipped armor item identifier.
	 */

	/**
	 * @typedef {Object} BattlerLayerResult
	 * @property {string} kind - Evaluation classification ('INTENDED' | 'FALLBACK').
	 * @property {string} family - Asset family descriptor.
	 * @property {string} [phenotype] - Associated phenotype if fallback.
	 */

	/**
	 * @typedef {Object} RenderHeroResult
	 * @property {string | null} dataUrl - Generated base64 PNG data URL.
	 * @property {string} status - Render status ('INTENDED' | 'FALLBACK' | 'ERROR_FALLBACK').
	 * @property {string} [reason] - Failure explanation if applicable.
	 * @property {{ armor: BattlerLayerResult, weapon: BattlerLayerResult }} [layers] - Layered equipment results.
	 */

	/**
	 * @typedef {Object} EnemyResolution
	 * @property {string} requested - Normalized requested key.
	 * @property {string} canonical - Canonical target key.
	 * @property {function(CanvasRenderingContext2D): void} baker - Enemy rendering baker function.
	 * @property {string} classification - Match classification.
	 * @property {string} resolution - Resolution strategy.
	 * @property {string} [reason] - Resolution notes.
	 */

	/**
	 * @typedef {Object} HeroResolution
	 * @property {string} requested - Normalized requested key.
	 * @property {string} canonical - Canonical target hero phenotype.
	 * @property {string} classification - Match classification.
	 * @property {string} resolution - Resolution strategy.
	 * @property {string} [reason] - Resolution notes.
	 */

	/**
	 * @typedef {Object} DiagnosticEntry
	 * @property {string} requested - Requested identifier.
	 * @property {string} canonical - Resolved canonical asset key.
	 * @property {string} classification - Asset classification status.
	 * @property {string} resolution - Resolution path.
	 * @property {string} [assetType] - Asset categorization token.
	 * @property {string} [compositeKey] - Cached composite key.
	 * @property {boolean} returned - Whether asset was returned successfully.
	 * @property {string} [reason] - Fallback or error reason.
	 * @property {string} moduleVersion - Baker software version.
	 * @property {number} timestamp - Epoch timestamp in milliseconds.
	 */

	/**
	 * @typedef {Object} DiagnosticReport
	 * @property {string} driverId - Driver identifier string.
	 * @property {string} moduleVersion - Baker software version.
	 * @property {string} [requested] - Specific requested entity.
	 * @property {boolean} [found] - Whether entity was located in logs.
	 * @property {string} [classification] - Status classification.
	 * @property {string} [resolution] - Resolution method.
	 * @property {DiagnosticEntry | null} [report] - Latest telemetry entry.
	 * @property {string} [spriteDimensions] - Output sprite dimensions.
	 * @property {number} [renderScale] - Supersampling render scale factor.
	 * @property {number} [cacheSize] - Total cached asset count.
	 * @property {number} [diagnosticCount] - Total logged diagnostic count.
	 * @property {Object.<string, number>} [counts] - Classification frequency counts.
	 * @property {readonly any[]} [entries] - Cloned log entries array.
	 */

	/**
	 * @typedef {Object} AssetValidationResult
	 * @property {boolean} pass - Overall compliance pass state.
	 * @property {number} total - Total required canonical assets.
	 * @property {number} passed - Total passing canonical assets.
	 * @property {number} failed - Total failing canonical assets.
	 * @property {Array<{ key: string, exists: boolean, classification: string, pass: boolean }>} results - Individual asset results.
	 */

	const VERSION = "4.0.0";
	const SPRITE_SIZE = 64;
	const RENDER_SCALE = 4;
	const WORK_SIZE = SPRITE_SIZE * RENDER_SCALE;

	const cache = new Map();
	const diagnosticLog = new Map();

	const P = Object.freeze({
		outline: "#080a0f",
		deepest: "#0b0d13",
		black: "#11131a",

		steel0: "#26303b",
		steel1: "#475569",
		steel2: "#94a3b8",
		steel3: "#dbe4ef",
		steel4: "#ffffff",

		iron0: "#292d33",
		iron1: "#525963",
		iron2: "#89929d",
		iron3: "#d6dbe1",

		leather0: "#29160c",
		leather1: "#63371b",
		leather2: "#a16207",
		leather3: "#d4a24c",

		cloth0: "#211330",
		cloth1: "#45236a",
		cloth2: "#7650a6",
		cloth3: "#b99add",

		blue0: "#102a63",
		blue1: "#1d4ed8",
		blue2: "#60a5fa",
		blue3: "#bfdbfe",

		red0: "#4c1117",
		red1: "#991b1b",
		red2: "#ef4444",
		red3: "#fca5a5",

		gold0: "#6b3f05",
		gold1: "#b7791f",
		gold2: "#f6c453",
		gold3: "#fff0a6",

		skin0: "#7b3f1d",
		skin1: "#b86f3f",
		skin2: "#e6a66b",
		skin3: "#ffd2a1",

		green0: "#064e3b",
		green1: "#047857",
		green2: "#34d399",
		green3: "#a7f3d0",

		violet0: "#2e1065",
		violet1: "#6d28d9",
		violet2: "#a78bfa",
		violet3: "#e9d5ff",

		fire0: "#7c2d12",
		fire1: "#ea580c",
		fire2: "#fb923c",
		fire3: "#fef08a",

		holy0: "#a16207",
		holy1: "#eab308",
		holy2: "#fde047",
		holy3: "#ffffff",
	});

	/**
	 * Instantiates an offscreen working canvas for sprite baking.
	 * Pure DOM utility procedure.
	 * @param {number} [size=WORK_SIZE] - Canvas dimension in pixels.
	 * @returns {HTMLCanvasElement | null} Configured canvas element or null in headless environments.
	 */
	function canvas(size = WORK_SIZE) {
		if (typeof document === "undefined") return null;

		const c = document.createElement("canvas");
		c.width = size;
		c.height = size;
		return c;
	}

	/**
	 * Configures 2D canvas rendering smoothing and styling flags.
	 * State-mutating canvas configuration procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {boolean} smoothing - Image smoothing enablement flag.
	 * @returns {void}
	 */
	function ctxConfig(ctx, smoothing) {
		ctx.imageSmoothingEnabled = !!smoothing;

		if ("imageSmoothingQuality" in ctx) {
			ctx.imageSmoothingQuality = "high";
		}

		ctx.lineJoin = "round";
		ctx.lineCap = "round";
	}
	//#endregion

	//#region [SEC-02] Drawing Primitives & Supersampling Scale Math
	const S = (n) => n * RENDER_SCALE;

	/**
	 * Renders a solid color rectangle scaled for supersampling.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} x - Rectangle X coordinate.
	 * @param {number} y - Rectangle Y coordinate.
	 * @param {number} w - Rectangle width.
	 * @param {number} h - Rectangle height.
	 * @param {string} fill - Fill color style.
	 * @param {number} [alpha=1] - Global alpha transparency.
	 * @returns {void}
	 */
	function rect(ctx, x, y, w, h, fill, alpha = 1) {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = fill;
		ctx.fillRect(S(x), S(y), S(w), S(h));
		ctx.restore();
	}

	/**
	 * Renders a rounded rectangle with explicit fill and alpha.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} x - Rectangle X coordinate.
	 * @param {number} y - Rectangle Y coordinate.
	 * @param {[number, number]} size - Width and height tuple.
	 * @param {number} r - Corner radius.
	 * @param {string} fill - Fill color style.
	 * @param {number} [alpha=1] - Global alpha transparency.
	 * @returns {void}
	 */
	function rr(ctx, x, y, size, r, fill, alpha = 1) {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = fill;

		ctx.beginPath();
		ctx.roundRect(S(x), S(y), S(size[0]), S(size[1]), S(r));

		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders a filled polygon path from coordinate points.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number[][]} points - Array of [x, y] coordinate pairs.
	 * @param {string} fill - Fill color style.
	 * @param {number} [alpha=1] - Global alpha transparency.
	 * @returns {void}
	 */
	function poly(ctx, points, fill, alpha = 1) {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = fill;

		ctx.beginPath();
		ctx.moveTo(S(points[0][0]), S(points[0][1]));

		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(S(points[i][0]), S(points[i][1]));
		}

		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders a stroked line path through coordinate points.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number[][]} points - Array of [x, y] coordinate pairs.
	 * @param {string} stroke - Stroke color style.
	 * @param {number} [width=1] - Line width.
	 * @param {number} [alpha=1] - Global alpha transparency.
	 * @returns {void}
	 */
	function line(ctx, points, stroke, width = 1, alpha = 1) {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = stroke;
		ctx.lineWidth = S(width);

		ctx.beginPath();
		ctx.moveTo(S(points[0][0]), S(points[0][1]));

		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(S(points[i][0]), S(points[i][1]));
		}

		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Renders a filled ellipse.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} x - Center X coordinate.
	 * @param {number} y - Center Y coordinate.
	 * @param {number} rx - Horizontal radius.
	 * @param {number} ry - Vertical radius.
	 * @param {string} fill - Fill color style.
	 * @param {number} [alpha=1] - Global alpha transparency.
	 * @returns {void}
	 */
	function ellipse(ctx, x, y, rx, ry, fill, alpha = 1) {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = fill;

		ctx.beginPath();
		ctx.ellipse(S(x), S(y), S(rx), S(ry), 0, 0, Math.PI * 2);

		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders a diamond-shaped polygon.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} x - Center X coordinate.
	 * @param {number} y - Center Y coordinate.
	 * @param {number} w - Diamond width.
	 * @param {number} h - Diamond height.
	 * @param {string} fill - Fill color style.
	 * @param {number} [alpha=1] - Global alpha transparency.
	 * @returns {void}
	 */
	function diamond(ctx, x, y, w, h, fill, alpha = 1) {
		poly(
			ctx,
			[
				[x, y - h / 2],
				[x + w / 2, y],
				[x, y + h / 2],
				[x - w / 2, y],
			],
			fill,
			alpha,
		);
	}

	/**
	 * Clears the entire working supersampling canvas buffer.
	 * State-mutating canvas reset procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @returns {void}
	 */
	function reset(ctx) {
		ctx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
	}

	/**
	 * Renders a grounded shadow beneath a battler sprite.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} [width=24] - Shadow ellipse width.
	 * @param {number} [x=32] - Shadow center X.
	 * @param {number} [y=61] - Shadow center Y.
	 * @returns {void}
	 */
	function ground(ctx, width = 24, x = 32, y = 61) {
		ellipse(ctx, x, y, width, 3.2, P.deepest, 0.72);

		ellipse(ctx, x, y - 0.7, width * 0.72, 1.25, P.steel1, 0.13);
	}

	/**
	 * Renders a radial glow aura.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} x - Glow center X.
	 * @param {number} y - Glow center Y.
	 * @param {number} radius - Glow outer radius.
	 * @param {string} color - Glow gradient base color.
	 * @param {number} [alpha=0.35] - Global alpha transparency.
	 * @returns {void}
	 */
	function glow(ctx, x, y, radius, color, alpha = 0.35) {
		const g = ctx.createRadialGradient(S(x), S(y), 0, S(x), S(y), S(radius));

		g.addColorStop(0, color);
		g.addColorStop(0.3, color);
		g.addColorStop(1, "rgba(0,0,0,0)");

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = g;

		ctx.beginPath();
		ctx.arc(S(x), S(y), S(radius), 0, Math.PI * 2);

		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders a specular highlight rectangle.
	 * State-mutating canvas draw procedure.
	 * @param {CanvasRenderingContext2D | any} ctx - Target 2D rendering context.
	 * @param {number} x - Highlight X coordinate.
	 * @param {number} y - Highlight Y coordinate.
	 * @param {number} w - Highlight width.
	 * @param {number} h - Highlight height.
	 * @param {string} [color=P.steel4] - Highlight color style.
	 * @param {number} [alpha=0.75] - Global alpha transparency.
	 * @returns {void}
	 */
	function spec(ctx, x, y, w, h, color = P.steel4, alpha = 0.75) {
		rect(ctx, x + 0.25, y + 0.25, w, h, /** @type {string} */(color), alpha);
	}
	//#endregion

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
		rr(ctx, cx - 7.5, top, [15, 15], 4, P.outline);

		rr(ctx, cx - 6, top + 1, [12, 13], 3, skin ? P.skin1 : P.cloth1);

		if (skin) {
			poly(
				ctx,
				[
					[cx - 5, top + 5],
					[cx - 4, top + 2],
					[cx + 4, top + 2],
					[cx + 5, top + 6],
					[cx + 3, top + 12],
					[cx - 3, top + 12],
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
		rr(ctx, left - 4, y, [10, 9], 2.5, palette[0]);

		rr(ctx, right - 6, y, [10, 9], 2.5, palette[0]);

		poly(
			ctx,
			[
				[left - 3, y + 2],
				[left + 3, y + 2],
				[left + 1, y + 7],
				[left - 2, y + 7],
			],
			palette[1],
		);

		poly(
			ctx,
			[
				[right - 3, y + 2],
				[right + 3, y + 2],
				[right + 2, y + 7],
				[right - 1, y + 7],
			],
			palette[1],
		);

		spec(ctx, left - 2, y + 2, 2.2, 3.2, palette[2], 0.65);

		spec(ctx, right - 1, y + 2, 2, 3.2, palette[2], 0.6);
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
				[16, 30],
				[12, 37],
				[15, 51],
				[20, 49],
				[22, 36],
			],
			P.blue0,
		);

		poly(
			ctx,
			[
				[48, 30],
				[53, 37],
				[50, 51],
				[45, 49],
				[42, 36],
			],
			P.red0,
		);

		poly(
			ctx,
			[
				[22, 46],
				[30, 46],
				[29, 57],
				[27, 60],
				[20, 60],
				[23, 54],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[34, 46],
				[42, 46],
				[43, 54],
				[46, 60],
				[38, 60],
				[35, 57],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[23, 48],
				[29, 48],
				[28, 55],
				[25, 57],
				[22, 57],
			],
			P.steel1,
		);

		poly(
			ctx,
			[
				[35, 48],
				[41, 48],
				[42, 55],
				[39, 57],
				[36, 55],
			],
			P.steel2,
		);

		rect(ctx, 24, 49, 4, 2, P.steel2, 0.6);

		rect(ctx, 36, 49, 4, 2, P.steel3, 0.5);

		rr(ctx, 20, 57, [9, 5], 1.5, P.iron0);

		rr(ctx, 38, 57, [9, 5], 1.5, P.iron0);

		spec(ctx, 21, 58, 5, 0.9, P.steel2, 0.55);

		spec(ctx, 39, 58, 5, 0.9, P.steel2, 0.55);

		poly(
			ctx,
			[
				[20, 27],
				[27, 24],
				[37, 24],
				[44, 27],
				[42, 48],
				[36, 52],
				[28, 52],
				[22, 48],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[22, 28],
				[28, 26],
				[36, 26],
				[42, 28],
				[40, 46],
				[35, 49],
				[29, 49],
				[24, 46],
			],
			P.blue1,
		);

		poly(
			ctx,
			[
				[28, 27],
				[36, 27],
				[38, 46],
				[34, 48],
				[30, 48],
			],
			P.blue2,
		);

		poly(
			ctx,
			[
				[23, 31],
				[27, 29],
				[27, 45],
				[24, 43],
			],
			P.blue0,
		);

		poly(
			ctx,
			[
				[28, 34],
				[36, 34],
				[37, 48],
				[32, 51],
				[27, 48],
			],
			P.red1,
		);

		poly(
			ctx,
			[
				[30, 34],
				[35, 34],
				[35, 47],
				[32, 49],
				[30, 47],
			],
			P.red2,
		);

		diamond(ctx, 32, 41, 5, 7, P.gold2);

		diamond(ctx, 32, 41, 2.6, 4, P.gold3, 0.9);

		line(
			ctx,
			[
				[28, 35],
				[36, 35],
			],
			P.gold2,
			1,
			0.8,
		);

		rect(ctx, 23, 45, 19, 4, P.gold0);

		rect(ctx, 24, 45.5, 17, 2, P.gold2, 0.65);

		diamond(ctx, 32, 47, 4, 4, P.gold3, 0.9);

		shoulderArmor(ctx, 22, 42, 26, [P.steel0, P.steel1, P.steel2]);

		poly(
			ctx,
			[
				[18, 28],
				[24, 30],
				[23, 42],
				[18, 47],
				[15, 44],
				[18, 39],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[19, 30],
				[23, 31],
				[22, 40],
				[19, 44],
				[17, 43],
				[19, 38],
			],
			P.blue1,
		);

		poly(
			ctx,
			[
				[46, 29],
				[42, 30],
				[43, 41],
				[48, 47],
				[51, 44],
				[47, 38],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[45, 31],
				[42, 32],
				[44, 40],
				[48, 44],
				[49, 43],
				[46, 38],
			],
			P.red1,
		);

		rr(ctx, 14.5, 42, [5, 6], 2, P.skin1);

		rr(ctx, 47, 43, [5, 6], 2, P.skin2);

		rect(ctx, 15.5, 43, 2, 2, P.skin3, 0.55);

		rect(ctx, 48, 44, 2, 2, P.skin3, 0.55);

		rect(ctx, 28, 23, 8, 5, P.skin1);

		heroHead(ctx, 32, 11, true);

		poly(
			ctx,
			[
				[25, 16],
				[25, 11],
				[29, 8],
				[37, 9],
				[40, 13],
				[38, 18],
				[35, 14],
				[31, 17],
			],
			P.iron0,
		);

		poly(
			ctx,
			[
				[27, 13],
				[30, 10],
				[35, 10],
				[37, 13],
				[34, 12],
				[31, 15],
			],
			P.iron2,
		);

		rect(ctx, 28, 17, 2, 1.4, P.steel3, 0.7);

		rect(ctx, 35, 17, 2, 1.4, P.steel3, 0.65);

		poly(
			ctx,
			[
				[27, 11],
				[29, 7],
				[32, 3],
				[35, 7],
				[38, 11],
			],
			P.steel0,
		);

		poly(
			ctx,
			[
				[29, 8],
				[32, 4],
				[35, 8],
				[34, 10],
				[30, 10],
			],
			P.steel2,
		);

		spec(ctx, 31, 6, 1.1, 4, P.steel4, 0.7);

		poly(
			ctx,
			[
				[39, 31],
				[45, 29],
				[48, 39],
				[45, 43],
				[41, 40],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[41, 31],
				[44, 31],
				[46, 39],
				[44, 41],
				[42, 39],
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
				[14, 28],
				[9, 38],
				[12, 56],
				[20, 51],
				[22, 34],
			],
			P.red0,
		);

		poly(
			ctx,
			[
				[50, 28],
				[55, 37],
				[52, 56],
				[45, 51],
				[42, 34],
			],
			P.red1,
		);

		poly(
			ctx,
			[
				[21, 45],
				[31, 46],
				[29, 59],
				[25, 63],
				[18, 63],
				[21, 54],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[33, 45],
				[43, 45],
				[47, 54],
				[46, 63],
				[38, 63],
				[35, 57],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[22, 48],
				[29, 48],
				[28, 56],
				[25, 60],
				[21, 60],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[35, 48],
				[42, 48],
				[45, 55],
				[44, 60],
				[39, 60],
				[37, 56],
			],
			P.iron2,
		);

		rect(ctx, 22, 51, 6, 2, P.steel3, 0.55);

		rect(ctx, 37, 51, 5, 2, P.steel3, 0.5);

		rr(ctx, 18, 59, [11, 5], 1.5, P.iron0);

		rr(ctx, 39, 59, [10, 5], 1.5, P.iron0);

		poly(
			ctx,
			[
				[18, 25],
				[27, 21],
				[38, 21],
				[47, 26],
				[44, 49],
				[37, 53],
				[26, 52],
				[19, 48],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[20, 27],
				[28, 24],
				[37, 24],
				[45, 28],
				[42, 46],
				[36, 49],
				[27, 49],
				[22, 46],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[25, 26],
				[37, 25],
				[40, 45],
				[35, 48],
				[28, 47],
			],
			P.iron2,
		);

		line(
			ctx,
			[
				[24, 31],
				[41, 30],
			],
			P.iron0,
			2,
			0.8,
		);

		line(
			ctx,
			[
				[23, 38],
				[42, 37],
			],
			P.iron0,
			2,
			0.75,
		);

		line(
			ctx,
			[
				[24, 44],
				[41, 43],
			],
			P.iron0,
			2,
			0.8,
		);

		spec(ctx, 26, 27, 2, 10, P.steel4, 0.35);

		rect(ctx, 21, 45, 23, 5, P.leather0);

		rect(ctx, 22, 46, 21, 2, P.leather3, 0.7);

		rr(ctx, 30, 45, [5, 5], 1, P.gold1);

		rr(ctx, 31, 46, [3, 3], 0.7, P.gold3, 0.8);

		shoulderArmor(ctx, 20, 45, 24, [P.iron0, P.iron1, P.iron3]);

		poly(
			ctx,
			[
				[16, 27],
				[23, 29],
				[22, 43],
				[17, 49],
				[12, 45],
				[15, 37],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[17, 29],
				[21, 30],
				[20, 41],
				[17, 46],
				[14, 44],
				[17, 37],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[48, 28],
				[42, 29],
				[43, 43],
				[48, 48],
				[52, 44],
				[49, 36],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[47, 30],
				[43, 31],
				[44, 41],
				[48, 45],
				[50, 43],
				[48, 37],
			],
			P.iron2,
		);

		rr(ctx, 12, 43, [6, 6], 2, P.leather2);

		rr(ctx, 47, 43, [6, 6], 2, P.leather2);

		rect(ctx, 27, 20, 10, 7, P.skin1);

		heroHead(ctx, 32, 8, false);

		poly(
			ctx,
			[
				[22, 17],
				[24, 8],
				[29, 5],
				[36, 5],
				[41, 9],
				[43, 18],
				[38, 21],
				[26, 21],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[25, 16],
				[26, 10],
				[30, 7],
				[36, 7],
				[39, 10],
				[40, 17],
				[36, 19],
				[28, 19],
			],
			P.iron1,
		);

		poly(
			ctx,
			[
				[27, 10],
				[31, 7],
				[36, 8],
				[38, 11],
				[35, 12],
				[29, 12],
			],
			P.iron3,
		);

		rect(ctx, 28, 14, 9, 4, P.deepest);

		rect(ctx, 29, 15, 7, 1.4, P.red2, 0.9);

		poly(
			ctx,
			[
				[25, 10],
				[19, 4],
				[22, 14],
			],
			P.leather2,
		);

		poly(
			ctx,
			[
				[39, 10],
				[45, 4],
				[42, 14],
			],
			P.leather3,
		);

		spec(ctx, 28, 9, 1.4, 5, P.steel4, 0.5);

		line(
			ctx,
			[
				[47, 48],
				[54, 10],
			],
			P.leather0,
			4,
		);

		line(
			ctx,
			[
				[47, 47],
				[54, 10],
			],
			P.leather3,
			1.4,
		);

		poly(
			ctx,
			[
				[45, 13],
				[50, 6],
				[59, 6],
				[61, 10],
				[56, 18],
				[49, 18],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[47, 13],
				[51, 8],
				[57, 8],
				[58, 10],
				[54, 16],
				[49, 16],
			],
			P.steel2,
		);

		poly(
			ctx,
			[
				[50, 9],
				[56, 9],
				[54, 12],
				[49, 12],
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
				[20, 27],
				[44, 27],
				[48, 40],
				[53, 61],
				[40, 62],
				[32, 56],
				[24, 62],
				[11, 61],
				[17, 42],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[22, 29],
				[42, 29],
				[45, 41],
				[49, 59],
				[40, 59],
				[33, 53],
				[26, 59],
				[15, 59],
				[19, 42],
			],
			P.cloth1,
		);

		poly(
			ctx,
			[
				[27, 29],
				[37, 29],
				[41, 54],
				[33, 58],
				[24, 55],
			],
			P.cloth2,
		);

		poly(
			ctx,
			[
				[34, 30],
				[41, 31],
				[44, 48],
				[40, 56],
				[36, 51],
			],
			P.cloth3,
			0.42,
		);

		poly(
			ctx,
			[
				[29, 29],
				[35, 29],
				[36, 55],
				[32, 59],
				[29, 54],
			],
			P.violet1,
		);

		line(
			ctx,
			[
				[32, 30],
				[33, 54],
			],
			P.violet3,
			1,
			0.65,
		);

		line(
			ctx,
			[
				[21, 38],
				[27, 55],
			],
			P.cloth3,
			1,
			0.45,
		);

		line(
			ctx,
			[
				[42, 38],
				[38, 56],
			],
			P.violet3,
			1,
			0.4,
		);

		line(
			ctx,
			[
				[18, 48],
				[25, 59],
			],
			P.violet0,
			1.5,
			0.8,
		);

		poly(
			ctx,
			[
				[19, 29],
				[26, 31],
				[23, 44],
				[16, 50],
				[12, 46],
				[17, 38],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[20, 31],
				[24, 32],
				[21, 42],
				[16, 47],
				[14, 45],
				[18, 38],
			],
			P.cloth2,
		);

		poly(
			ctx,
			[
				[45, 29],
				[39, 31],
				[41, 43],
				[47, 50],
				[51, 46],
				[47, 38],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[44, 31],
				[41, 32],
				[43, 42],
				[48, 47],
				[49, 45],
				[46, 38],
			],
			P.cloth2,
		);

		rr(ctx, 13, 44, [5, 6], 2, P.skin2);

		rr(ctx, 47, 44, [5, 6], 2, P.skin2);

		rect(ctx, 28, 21, 8, 8, P.skin1);

		heroHead(ctx, 32, 10, true);

		poly(
			ctx,
			[
				[22, 22],
				[22, 12],
				[27, 6],
				[36, 5],
				[42, 11],
				[42, 23],
				[38, 28],
				[26, 27],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[25, 20],
				[25, 13],
				[29, 9],
				[35, 8],
				[39, 12],
				[39, 21],
				[35, 25],
				[29, 24],
			],
			P.cloth1,
		);

		poly(
			ctx,
			[
				[27, 12],
				[30, 9],
				[36, 10],
				[39, 14],
				[35, 15],
				[29, 15],
			],
			P.cloth3,
			0.45,
		);

		poly(
			ctx,
			[
				[28, 16],
				[38, 15],
				[38, 22],
				[34, 25],
				[29, 23],
			],
			P.skin1,
		);

		rect(ctx, 29, 18, 2.4, 1.5, P.violet3, 0.85);

		rect(ctx, 35, 18, 2.4, 1.5, P.violet3, 0.85);

		line(
			ctx,
			[
				[47, 57],
				[51, 10],
			],
			P.leather0,
			4,
		);

		line(
			ctx,
			[
				[48, 56],
				[51, 11],
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
				[20, 27],
				[44, 27],
				[49, 42],
				[51, 61],
				[39, 61],
				[32, 56],
				[25, 61],
				[13, 61],
				[16, 43],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[22, 29],
				[42, 29],
				[46, 42],
				[48, 59],
				[40, 59],
				[33, 53],
				[25, 59],
				[16, 59],
				[19, 42],
			],
			P.steel3,
		);

		poly(
			ctx,
			[
				[26, 30],
				[38, 30],
				[41, 53],
				[33, 57],
				[24, 54],
			],
			P.steel4,
		);

		poly(
			ctx,
			[
				[27, 29],
				[37, 29],
				[35, 53],
				[32, 57],
				[29, 53],
			],
			P.gold1,
		);

		line(
			ctx,
			[
				[32, 30],
				[32, 54],
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
				[19, 29],
				[26, 31],
				[23, 44],
				[16, 50],
				[12, 46],
				[17, 38],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[20, 31],
				[24, 32],
				[21, 42],
				[16, 47],
				[14, 45],
				[18, 38],
			],
			P.steel2,
		);

		poly(
			ctx,
			[
				[45, 29],
				[39, 31],
				[41, 43],
				[48, 50],
				[52, 46],
				[47, 38],
			],
			P.outline,
		);

		poly(
			ctx,
			[
				[44, 31],
				[41, 32],
				[43, 42],
				[48, 47],
				[50, 45],
				[46, 38],
			],
			P.steel3,
		);

		rr(ctx, 13, 44, [5, 6], 2, P.skin2);

		rr(ctx, 47, 44, [5, 6], 2, P.skin2);

		rect(ctx, 28, 21, 8, 8, P.skin1);

		heroHead(ctx, 32, 10, true);

		line(
			ctx,
			[
				[24, 16],
				[27, 10],
				[32, 8],
				[37, 10],
				[40, 16],
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
				[47, 57],
				[51, 24],
			],
			P.leather0,
			4,
		);

		line(
			ctx,
			[
				[48, 56],
				[51, 25],
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

	//#region [SEC-09] Canonical VSRP-001 9-Method Interface & Module Export
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
		 * @returns {AssetValidationResult} Validation outcome descriptor.
		 */
		init() {
			if (!cache.size) {
				bakeAll();
			}

			return validateCanonicalAssets();
		},

		/**
		 * Resets and re-bakes all cached assets.
		 * State-mutating reset gateway.
		 * @returns {void}
		 */
		reset() {
			bakeAll();
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
		 * @param {Object} [context={}] - Render context parameters.
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
				cacheSize: cache.size,

				diagnosticCount: diagnosticLog.size,

				moduleVersion: VERSION,
			});
		},

		/**
		 * Returns operational diagnostics and telemetry reports.
		 * Pure diagnostic accessor gateway.
		 * @returns {Object} Report descriptor.
		 */
		getDiagnostics() {
			const report = /** @type {any} */ (getDiagnosticReport());

			return {
				driverId: report.driverId,

				moduleVersion: report.moduleVersion,

				spriteDimensions: report.spriteDimensions,

				renderScale: report.renderScale,

				cachedCount: report.cacheSize,

				diagnosticCount: report.diagnosticCount,

				counts: report.counts,

				availableKeys: [...cache.keys()],

				entries: report.entries,
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

				canonicalEnemyCount: Object.keys(ENEMY_BAKERS).length,

				canonicalHeroCount: Object.keys(HERO_BAKERS).length,
			});
		},

		get,

		bakeBattler: get,

		getSprite: get,

		bakeAll,

		clearCache: reset,

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
	//#endregion
})();

if (typeof window !== "undefined") {
	window.EmberlightBattlerBaker = EmberlightBattlerBaker;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightBattlerBaker;
}