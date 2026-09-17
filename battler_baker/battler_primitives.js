/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: BATTLER BAKER PRIMITIVES SUB-MODULE
 * Document Identifier: VSRP-001-BATTLER-PRIMITIVES
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-BATTLER-BAKER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] Module Constants, Palettes & Canvas Context Helpers (Lines 25–215)
 *   [SEC-02] Drawing Primitives & Supersampling Scale Math (Lines 217–436)
 *
 * STAGING MEMBRANE KEY: window._BattlerBakerInternal.Primitives
 * DEPENDENCIES: None (Root of presentation pipeline)
 * ============================================================================
 */

if (typeof window !== 'undefined') window._BattlerBakerInternal = window._BattlerBakerInternal || {};

(() => {
	//#region [SEC-01] Module Constants, Palettes & Canvas Context Helpers
	const VERSION = '4.0.0';
	const SPRITE_SIZE = 64;
	const RENDER_SCALE = 4;
	const WORK_SIZE = SPRITE_SIZE * RENDER_SCALE;

	const cache = new Map();
	const diagnosticLog = new Map();

	const P = Object.freeze({
		outline: '#080a0f',
		deepest: '#0b0d13',
		black: '#11131a',

		steel0: '#26303b',
		steel1: '#475569',
		steel2: '#94a3b8',
		steel3: '#dbe4ef',
		steel4: '#ffffff',

		iron0: '#292d33',
		iron1: '#525963',
		iron2: '#89929d',
		iron3: '#d6dbe1',

		leather0: '#29160c',
		leather1: '#63371b',
		leather2: '#a16207',
		leather3: '#d4a24c',

		cloth0: '#211330',
		cloth1: '#45236a',
		cloth2: '#7650a6',
		cloth3: '#b99add',

		blue0: '#102a63',
		blue1: '#1d4ed8',
		blue2: '#60a5fa',
		blue3: '#bfdbfe',

		red0: '#4c1117',
		red1: '#991b1b',
		red2: '#ef4444',
		red3: '#fca5a5',

		gold0: '#6b3f05',
		gold1: '#b7791f',
		gold2: '#f6c453',
		gold3: '#fff0a6',

		skin0: '#7b3f1d',
		skin1: '#b86f3f',
		skin2: '#e6a66b',
		skin3: '#ffd2a1',

		green0: '#064e3b',
		green1: '#047857',
		green2: '#34d399',
		green3: '#a7f3d0',

		violet0: '#2e1065',
		violet1: '#6d28d9',
		violet2: '#a78bfa',
		violet3: '#e9d5ff',

		fire0: '#7c2d12',
		fire1: '#ea580c',
		fire2: '#fb923c',
		fire3: '#fef08a',

		holy0: '#a16207',
		holy1: '#eab308',
		holy2: '#fde047',
		holy3: '#ffffff',
	});

	/**
	 * Instantiates an offscreen working canvas for sprite baking.
	 * Pure DOM utility procedure.
	 * @param {number} [size=WORK_SIZE] - Canvas dimension in pixels.
	 * @returns {HTMLCanvasElement | null} Configured canvas element or null in headless environments.
	 */
	function canvas(size = WORK_SIZE) {
		if (typeof document === 'undefined') return null;

		const c = document.createElement('canvas');
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

		if ('imageSmoothingQuality' in ctx) {
			ctx.imageSmoothingQuality = 'high';
		}

		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
	}
	//#endregion

	//#region [SEC-02] Drawing Primitives & Supersampling Scale Math
	const S = (/** @type {number} */ n) => n * RENDER_SCALE;

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
		g.addColorStop(1, 'rgba(0,0,0,0)');

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
		rect(ctx, x + 0.25, y + 0.25, w, h, /** @type {string} */ (color), alpha);
	}
	//#endregion

	// ─── Staging Membrane Export ──────────────────────────────────────────────
	const Primitives = Object.freeze({
		VERSION,
		SPRITE_SIZE,
		RENDER_SCALE,
		WORK_SIZE,
		cache,
		diagnosticLog,
		P,
		canvas,
		ctxConfig,
		S,
		rect,
		rr,
		poly,
		line,
		ellipse,
		diamond,
		reset,
		ground,
		glow,
		spec,
	});

	if (typeof window !== 'undefined') {
		window._BattlerBakerInternal.Primitives = Primitives;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Primitives;
	}
})();
