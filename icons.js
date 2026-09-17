/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROCEDURAL ICON BAKER & RASTER ENGINE
 * Document Identifier: VSRP-001-ICON-BAKER-CINEMATIC
 * Governing Protocol:  VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT[cite: 1, 2]
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Constants & Canvas Initialization
 *   [SEC-02] Cinematic Item Procedural Renderers
 *   [SEC-03] Cinematic Bestiary & Boss Icon Renderers
 *   [SEC-04] Cinematic Hero Avatar Renderers
 *   [SEC-05] Recipe Registry Mapping
 *   [SEC-06] Canonical 9-Method Lifecycle Gateway & Public APIs
 * ============================================================================
 */

/**
 * @typedef {Object} IconConfig
 * @property {boolean} [debug] Optional debug flag for tracing asset baking operations.
 */

/**
 * @typedef {Object} IconModuleContext
 * @property {Object} [eventBus] Host event bus reference for channel communication.
 */

/**
 * @typedef {Object} IconDiagnostics
 * @property {string} driverId Internal driver identifier.
 * @property {string} protocolVersion Protocol compliance version.
 * @property {boolean} configured Whether the module has been configured.
 * @property {boolean} initialized Whether the module has been initialized.
 * @property {Object} config Immutable configuration object.
 * @property {boolean} hasEventBus Whether an event bus is bound.
 * @property {number} cachedIconCount Current count of cached icons.
 * @property {string} bufferResolution Raster buffer resolution string.
 */

/**
 * @typedef {Object} IconModuleInfo
 * @property {string} moduleId Unique module identifier.
 * @property {string} version Semantic version string.
 * @property {string} protocolVersion Protocol version string.
 * @property {string[]} capabilities Declared module capabilities.
 */

/**
 * @typedef {Object} IconSnapshot
 * @property {boolean} [clearCache] Optional flag indicating whether to purge cached rasters.
 * @property {number} [cacheSize] Current count of cached icons.
 * @property {string[]} [cachedKeys] Cached recipe keys.
 */

const EmberlightIcons = (() => {


	//#region [SEC-01] Type Definitions, Constants & Canvas Initialization
	const SIZE = 48;
	const cache = new Map();

	// Lifecycle & Configuration State
	let configured = false;
	/** @type {any} */
	let config = null; // Resolved useless assignment by ensuring utilization in diagnostics
	let initialized = false;
	/**
	 * @type {Object | null}
	 */
	let eventBusRef = null; // Resolved useless assignment by utilizing in diagnostics

	/**
	 * @type {HTMLCanvasElement | null}
	 */
	let canvas = null;
	/**
	 * @type {CanvasRenderingContext2D | null}
	 */
	let ctx = null;

	/**
	 * Ensures the offscreen raster canvas and 2D rendering context are initialized.
	 * (State-mutating utility)
	 * @returns {void}
	 */
	function ensureCanvas() {
		if (canvas && ctx) return;
		canvas = (typeof document !== 'undefined' && typeof document.createElement === 'function')
			? document.createElement('canvas')
			: null;

		if (canvas) {
			canvas.width = SIZE;
			canvas.height = SIZE;
			ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
		}
	}

	/**
	 * Clears the active offscreen canvas buffer.
	 * (State-mutating utility)
	 * @returns {void}
	 */
	function clear() {
		if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
	}
	//#endregion

	//#region [SEC-02] Cinematic Item Procedural Renderers
	/**
	 * Renders a cinematic potion or liquid flask icon with multi-stop luminescence.
	 * (Pure presentation drawing procedure)[cite: 2]
	 * @param {string} liquidColor Base hex or rgba color for the liquid.
	 * @param {string} glowColor Radiance/glow color for the flask aura.
	 * @param {number} fillRatio Numeric ratio (0.0 to 1.0) representing liquid fill level.
	 * @returns {void}
	 */
	function drawFlask(liquidColor, glowColor, fillRatio) {
		if (!ctx) return;
		clear();

		if (ctx.createRadialGradient) {
			const bgGlow = ctx.createRadialGradient(24, 28, 4, 24, 28, 20);
			bgGlow.addColorStop(0, glowColor);
			bgGlow.addColorStop(1, 'transparent');
			ctx.fillStyle = bgGlow;
			ctx.fillRect(0, 0, SIZE, SIZE);
		}

		ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
		ctx.strokeStyle = '#94a3b8';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(24, 28, 14, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.save();
		ctx.beginPath();
		ctx.arc(24, 28, 12, 0, Math.PI * 2);
		ctx.clip();

		if (ctx.createLinearGradient) {
			const liqGrad = ctx.createLinearGradient(12, 16, 12, 40);
			liqGrad.addColorStop(0, glowColor);
			liqGrad.addColorStop(0.5, liquidColor);
			liqGrad.addColorStop(1, '#020617');
			ctx.fillStyle = liqGrad;
		} else {
			ctx.fillStyle = liquidColor;
		}

		const top = 40 - (24 * fillRatio);
		ctx.fillRect(10, top, 28, 30);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
		ctx.fillRect(10, top, 28, 2.5);
		ctx.restore();

		ctx.fillStyle = '#475569';
		ctx.fillRect(20, 8, 8, 8);
		ctx.fillStyle = '#b45309';
		ctx.fillRect(19, 4, 10, 5);
		ctx.fillStyle = '#f59e0b';
		ctx.fillRect(21, 6, 6, 1);

		ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(24, 28, 11, Math.PI * 0.85, Math.PI * 1.35);
		ctx.stroke();
	}

	/**
	 * Renders a cinematic sword icon with metallic gradients and fuller refractions.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawSword() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);
		ctx.rotate(-Math.PI / 4);

		if (ctx.createLinearGradient) {
			const grad = ctx.createLinearGradient(-4, 0, 4, 0);
			grad.addColorStop(0, '#e2e8f0');
			grad.addColorStop(0.3, '#94a3b8');
			grad.addColorStop(0.5, '#f8fafc');
			grad.addColorStop(0.7, '#475569');
			grad.addColorStop(1, '#cbd5e1');
			ctx.fillStyle = grad;
		} else {
			ctx.fillStyle = '#cbd5e1';
		}
		ctx.beginPath();
		ctx.moveTo(-4, -6);
		ctx.lineTo(0, -23);
		ctx.lineTo(4, -6);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = '#1e293b';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, -5);
		ctx.lineTo(0, -18);
		ctx.stroke();

		ctx.fillStyle = '#fbbf24';
		ctx.shadowColor = '#d97706';
		ctx.shadowBlur = 4;
		ctx.fillRect(-10, -5, 20, 3.5);

		ctx.fillStyle = '#78350f';
		ctx.fillRect(-2, -1.5, 4, 11);
		ctx.fillStyle = '#451a03';
		ctx.fillRect(-2, 1, 4, 2);
		ctx.fillRect(2, 4, 4, 2);

		ctx.fillStyle = '#fbbf24';
		ctx.beginPath();
		ctx.arc(0, 10.5, 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders an arcane staff icon with a glowing crystal core.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawStaff() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);
		ctx.rotate(Math.PI / 4);

		if (ctx.createLinearGradient) {
			const woodGrad = ctx.createLinearGradient(-2, 0, 2, 0);
			woodGrad.addColorStop(0, '#a16207');
			woodGrad.addColorStop(0.5, '#713f12');
			woodGrad.addColorStop(1, '#451a03');
			ctx.fillStyle = woodGrad;
		} else {
			ctx.fillStyle = '#854d0e';
		}
		ctx.fillRect(-2.5, -18, 5, 38);

		ctx.strokeStyle = '#fde047';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, -18, 7.5, Math.PI * 0.1, Math.PI * 0.9, true);
		ctx.stroke();

		const crystalGlow = ctx.createRadialGradient(0, -18, 1, 0, -18, 9);
		crystalGlow.addColorStop(0, '#fef08a');
		crystalGlow.addColorStop(0.4, '#38bdf8');
		crystalGlow.addColorStop(1, 'rgba(2, 132, 199, 0)');
		ctx.fillStyle = crystalGlow;
		ctx.beginPath();
		ctx.arc(0, -18, 9, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#e0f2fe';
		ctx.beginPath();
		ctx.arc(0, -18, 4.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders an embossed tactical armor or plate vest icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @param {boolean} isHeavy Flag indicating heavy plate vs light vest construction.
	 * @returns {void}
	 */
	function drawArmor(isHeavy) {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		if (ctx.createLinearGradient) {
			const plateGrad = ctx.createLinearGradient(-12, -14, 12, 14);
			plateGrad.addColorStop(0, isHeavy ? '#94a3b8' : '#64748b');
			plateGrad.addColorStop(0.5, isHeavy ? '#64748b' : '#334155');
			plateGrad.addColorStop(1, isHeavy ? '#334155' : '#1e293b');
			ctx.fillStyle = plateGrad;
		} else {
			ctx.fillStyle = isHeavy ? '#64748b' : '#334155';
		}

		ctx.strokeStyle = isHeavy ? '#f8fafc' : '#cbd5e1';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(-11, -15);
		ctx.lineTo(11, -15);
		ctx.lineTo(13, -4);
		ctx.lineTo(9, 15);
		ctx.lineTo(-9, 15);
		ctx.lineTo(-13, -4);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.strokeStyle = '#f59e0b';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(0, -12);
		ctx.lineTo(0, 8);
		ctx.moveTo(-5, -4);
		ctx.lineTo(5, -4);
		ctx.stroke();

		if (isHeavy) {
			ctx.fillStyle = '#cbd5e1';
			ctx.fillRect(-15, -15, 6, 9);
			ctx.fillRect(9, -15, 6, 9);
		}
		ctx.restore();
	}

	/**
	 * Renders an embroidered magical robe icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawRobe() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		if (ctx.createLinearGradient) {
			const robeGrad = ctx.createLinearGradient(-14, -14, 14, 16);
			robeGrad.addColorStop(0, '#6366f1');
			robeGrad.addColorStop(0.5, '#4338ca');
			robeGrad.addColorStop(1, '#312e81');
			ctx.fillStyle = robeGrad;
		} else {
			ctx.fillStyle = '#4338ca';
		}

		ctx.beginPath();
		ctx.moveTo(-11, -15);
		ctx.lineTo(11, -15);
		ctx.lineTo(15, 17);
		ctx.lineTo(-15, 17);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, -15);
		ctx.lineTo(0, 17);
		ctx.moveTo(-11, -5);
		ctx.lineTo(11, -5);
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Renders a polished gold ring icon with an embedded emerald gemstone.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawRing() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.strokeStyle = '#fbbf24';
		ctx.lineWidth = 3.5;
		ctx.shadowColor = '#d97706';
		ctx.shadowBlur = 4;
		ctx.beginPath();
		ctx.arc(0, 2, 10.5, 0, Math.PI * 2);
		ctx.stroke();

		const gemGlow = ctx.createRadialGradient(0, -7, 1, 0, -7, 7);
		gemGlow.addColorStop(0, '#6ee7b7');
		gemGlow.addColorStop(0.5, '#10b981');
		gemGlow.addColorStop(1, '#065f46');
		ctx.fillStyle = gemGlow;
		ctx.beginPath();
		ctx.moveTo(0, -13);
		ctx.lineTo(6, -8);
		ctx.lineTo(0, -3);
		ctx.lineTo(-6, -8);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders a glowing radiant ember icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @param {string} [coreColor='#ff9d4d'] Core color hex string.
	 * @param {string} [shadowCol='#ff5555'] Shadow/aura color hex string.
	 * @returns {void}
	 */
	function drawEmber(coreColor = '#ff9d4d', shadowCol = '#ff5555') {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		const emberGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
		emberGlow.addColorStop(0, '#fef08a');
		emberGlow.addColorStop(0.5, coreColor);
		emberGlow.addColorStop(1, 'transparent');
		ctx.fillStyle = emberGlow;
		ctx.beginPath();
		ctx.arc(0, 0, 18, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = coreColor;
		ctx.shadowColor = shadowCol;
		ctx.shadowBlur = 12;
		ctx.beginPath();
		ctx.moveTo(0, -16);
		ctx.lineTo(13, 0);
		ctx.lineTo(0, 16);
		ctx.lineTo(-13, 0);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#fef08a';
		ctx.beginPath();
		ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	//#endregion

	//#region [SEC-03] Cinematic Bestiary & Boss Icon Renderers
	/**
	 * Renders a shade wolf bestiary icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawWolf() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.fillStyle = '#1e1b4b';
		ctx.strokeStyle = '#818cf8';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, 21, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#312e81';
		ctx.beginPath();
		ctx.moveTo(-13, -8);
		ctx.lineTo(-17, -19);
		ctx.lineTo(-7, -13);
		ctx.lineTo(0, -17);
		ctx.lineTo(7, -13);
		ctx.lineTo(17, -19);
		ctx.lineTo(13, -8);
		ctx.lineTo(0, 13);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#fbbf24';
		ctx.shadowColor = '#fbbf24';
		ctx.shadowBlur = 8;
		ctx.fillRect(-6, -4, 3.5, 2.5);
		ctx.fillRect(2.5, -4, 3.5, 2.5);

		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.moveTo(-2, 4);
		ctx.lineTo(0, 10);
		ctx.lineTo(2, 4);
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders a bone archer bestiary icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawArcher() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.fillStyle = '#1c1917';
		ctx.strokeStyle = '#a8a29e';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, 21, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.strokeStyle = '#e7e5e4';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(4, 0, 15, Math.PI * 0.7, Math.PI * 1.3, false);
		ctx.stroke();

		ctx.strokeStyle = '#78716c';
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.moveTo(-7, -11);
		ctx.lineTo(-7, 11);
		ctx.moveTo(-17, 0);
		ctx.lineTo(13, 0);
		ctx.stroke();

		ctx.fillStyle = '#38bdf8';
		ctx.shadowColor = '#0284c7';
		ctx.shadowBlur = 6;
		ctx.beginPath();
		ctx.moveTo(13, 0);
		ctx.lineTo(7, -3.5);
		ctx.lineTo(7, 3.5);
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders an iron brute bestiary icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawBrute() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.fillStyle = '#171717';
		ctx.strokeStyle = '#ef4444';
		ctx.lineWidth = 2;
		ctx.fillRect(-19, -19, 38, 38);
		ctx.strokeRect(-19, -19, 38, 38);

		ctx.fillStyle = '#52525b';
		ctx.beginPath();
		ctx.moveTo(-15, -6);
		ctx.lineTo(-11, -15);
		ctx.lineTo(11, -15);
		ctx.lineTo(15, -6);
		ctx.lineTo(11, 11);
		ctx.lineTo(-11, 11);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#ef4444';
		ctx.shadowColor = '#f87171';
		ctx.shadowBlur = 10;
		ctx.fillRect(-9, -2.5, 18, 3.5);
		ctx.restore();
	}

	/**
	 * Renders a crypt skeleton bestiary icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawSkeleton() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.fillStyle = '#020617';
		ctx.strokeStyle = '#38bdf8';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, 21, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#f1f5f9';
		ctx.beginPath();
		ctx.arc(0, -3, 11.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#0284c7';
		ctx.shadowColor = '#38bdf8';
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.arc(-4, -2, 3.2, 0, Math.PI * 2);
		ctx.arc(4, -2, 3.2, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#64748b';
		ctx.fillRect(-5.5, 6, 11, 4.5);
		ctx.restore();
	}

	/**
	 * Renders a blight spider bestiary icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawSpider() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.fillStyle = '#022c22';
		ctx.strokeStyle = '#4ade80';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, 21, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#166534';
		ctx.beginPath();
		ctx.arc(0, 2, 7.5, 0, Math.PI * 2);
		ctx.arc(0, -5, 5.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = '#86efac';
		ctx.lineWidth = 1.8;
		for (const dir of [ -1, 1 ]) {
			for (let i = -1; i <= 2; i++) {
				ctx.beginPath();
				ctx.moveTo(dir * 4, i * 3);
				ctx.lineTo(dir * 13, (i * 4) - 4);
				ctx.lineTo(dir * 18, i * 4);
				ctx.stroke();
			}
		}

		ctx.fillStyle = '#bbf7d0';
		ctx.shadowColor = '#22c55e';
		ctx.shadowBlur = 6;
		ctx.fillRect(-2.5, -7, 2, 2);
		ctx.fillRect(0.5, -7, 2, 2);
		ctx.restore();
	}

	/**
	 * Renders a dread acolyte bestiary icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawAcolyte() {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		ctx.fillStyle = '#2e1065';
		ctx.strokeStyle = '#d8b4fe';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, 0, 21, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#6b21a8';
		ctx.beginPath();
		ctx.moveTo(0, -17);
		ctx.lineTo(13, -4);
		ctx.lineTo(11, 15);
		ctx.lineTo(-11, 15);
		ctx.lineTo(-13, -4);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#000000';
		ctx.beginPath();
		ctx.arc(0, -2, 6.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#f3e8ff';
		ctx.shadowColor = '#c084fc';
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(0, -2, 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	/**
	 * Renders the Malakor / Cinder Revenant boss icon with dynamic heat pulsation.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @param {boolean} [isEnraged=false] Flag indicating enraged state formatting.
	 * @param {number} [heatPulse=1.0] Numeric pulsation multiplier for visual scaling.
	 * @returns {void}
	 */
	function drawMalakorBoss(isEnraged = false, heatPulse = 1.0) {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		const pulseScale = 1.0 + (heatPulse - 1.0) * 0.15;
		const auraRadius = (isEnraged ? 24 : 21) * pulseScale;

		const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, auraRadius);
		auraGrad.addColorStop(0, `rgba(${isEnraged ? '239, 68, 68' : '249, 115, 22'}, 0.9)`);
		auraGrad.addColorStop(0.5, `rgba(${isEnraged ? '127, 29, 29' : '154, 52, 18'}, 0.45)`);
		auraGrad.addColorStop(1, 'transparent');
		ctx.fillStyle = auraGrad;
		ctx.beginPath();
		ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#1c0a0a';
		ctx.strokeStyle = isEnraged ? '#f87171' : '#fb923c';
		ctx.lineWidth = 1.8;
		ctx.beginPath();
		ctx.arc(0, 2, 13, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		const coreGrad = ctx.createRadialGradient(0, 2, 1, 0, 2, 9 * pulseScale);
		coreGrad.addColorStop(0, '#fef08a');
		coreGrad.addColorStop(0.5, isEnraged ? '#ef4444' : '#f97316');
		coreGrad.addColorStop(1, 'transparent');
		ctx.fillStyle = coreGrad;
		ctx.beginPath();
		ctx.arc(0, 2, 9 * pulseScale, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#450a0a';
		ctx.strokeStyle = isEnraged ? '#fca5a5' : '#ffedd5';
		ctx.lineWidth = 1.2;

		ctx.beginPath();
		ctx.moveTo(-13, -4);
		ctx.quadraticCurveTo(-17, -15, -19, -21);
		ctx.quadraticCurveTo(-12, -13, -8, -10);
		ctx.lineTo(0, -19);
		ctx.lineTo(8, -10);
		ctx.quadraticCurveTo(12, -13, 19, -21);
		ctx.quadraticCurveTo(17, -15, 13, -4);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#050202';
		ctx.beginPath();
		ctx.arc(0, -1, 7.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = isEnraged ? '#ffffff' : '#fef08a';
		ctx.shadowColor = isEnraged ? '#ff0000' : '#ff9d4d';
		ctx.shadowBlur = 10;
		ctx.fillRect(-4.5, -2, 3, 2.5);
		ctx.fillRect(1.5, -2, 3, 2.5);

		ctx.restore();
	}
	//#endregion

	//#region [SEC-04] Cinematic Hero Avatar Renderers
	/**
	 * Renders a directional hero avatar icon.[cite: 2]
	 * (Pure presentation drawing procedure)
	 * @param {string} [facing='DOWN'] Facing direction token ('UP' | 'DOWN' | 'LEFT' | 'RIGHT').
	 * @returns {void}
	 */
	function drawHeroSprite(facing = 'DOWN') {
		if (!ctx) return;
		clear();
		ctx.save();
		ctx.translate(24, 24);

		const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 17);
		aura.addColorStop(0, 'rgba(255, 157, 77, 0.5)');
		aura.addColorStop(1, 'transparent');
		ctx.fillStyle = aura;
		ctx.beginPath();
		ctx.arc(0, 0, 17, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#334155';
		ctx.fillRect(-8.5, -4.5, 17, 17);
		ctx.fillStyle = '#64748b';
		ctx.fillRect(-6.5, -2.5, 13, 13);

		ctx.fillStyle = '#cbd5e1';
		ctx.beginPath();
		ctx.arc(0, -7.5, 8.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#fbbf24';
		ctx.fillRect(-7.5, -12, 15, 3.5);

		ctx.fillStyle = '#0f172a';
		if (facing === 'UP') {
			ctx.fillStyle = '#475569';
			ctx.fillRect(-5.5, -9.5, 11, 4.5);
		} else if (facing === 'LEFT') {
			ctx.fillRect(-7.5, -7.5, 6.5, 3.5);
			ctx.fillStyle = '#38bdf8';
			ctx.fillRect(-6.5, -6.5, 2.5, 2.5);
		} else if (facing === 'RIGHT') {
			ctx.fillRect(1, -7.5, 6.5, 3.5);
			ctx.fillStyle = '#38bdf8';
			ctx.fillRect(4, -6.5, 2.5, 2.5);
		} else {
			ctx.fillRect(-5.5, -7.5, 11, 3.5);
			ctx.fillStyle = '#38bdf8';
			ctx.fillRect(-3.5, -6.5, 2.5, 2.5);
			ctx.fillRect(1, -6.5, 2.5, 2.5);
		}

		ctx.fillStyle = '#f59e0b';
		if (facing === 'LEFT') {
			ctx.fillRect(-12, -3.5, 3.5, 13);
		} else if (facing === 'RIGHT') {
			ctx.fillRect(8.5, -3.5, 3.5, 13);
		} else {
			ctx.fillRect(-9.5, 1, 3.5, 10);
		}

		ctx.restore();
	}
	//#endregion

	//#region [SEC-05] Recipe Registry Mapping
	/** @type {Record<string, () => void>} */
	const RECIPES = Object.freeze({
		PLAYER_UP: () => drawHeroSprite('UP'),
		PLAYER_DOWN: () => drawHeroSprite('DOWN'),
		PLAYER_LEFT: () => drawHeroSprite('LEFT'),
		PLAYER_RIGHT: () => drawHeroSprite('RIGHT'),
		POTION: () => drawFlask('#ef4444', 'rgba(239, 68, 68, 0.4)', 0.75),
		ETHER: () => drawFlask('#3b82f6', 'rgba(59, 130, 246, 0.4)', 0.65),
		PHOENIX_EMBER: () => drawEmber('#ff9d4d', '#ff5555'),
		IRON_SWORD: () => drawSword(),
		OAK_STAFF: () => drawStaff(),
		CHAIN_VEST: () => drawArmor(false),
		CHAINMAIL: () => drawArmor(true),
		MAGE_ROBE: () => drawRobe(),
		SWIFT_RING: () => drawRing(),
		CINDER_CORE: () => drawEmber('#ef4444', '#dc2626'),
		SHADE_WOLF: () => drawWolf(),
		BONE_ARCHER: () => drawArcher(),
		IRON_BRUTE: () => drawBrute(),
		CRYPT_SKELETON: () => drawSkeleton(),
		BLIGHT_SPIDER: () => drawSpider(),
		DREAD_ACOLYTE: () => drawAcolyte(),
		CINDER_REVENANT: () => drawMalakorBoss(false, 1.0),
	});
	//#endregion

	//#region [SEC-06] Canonical 9-Method Lifecycle Gateway & Public APIs
	return {
		/**
		 * Configures the icon baker module with immutable host options.
		 * (State-mutating lifecycle gateway)
		 * @param {IconConfig} [options={}] Configuration options object.
		 * @returns {void}
		 */
		configure(options = {}) {
			if (configured) {
				throw new Error('[VSRP-001] Lifecycle Error: EmberlightIcons already configured.');
			}
			config = Object.freeze({ ...options });
			configured = true;
		},

		/**
		 * Initializes the icon baker module, binding optional event buses and pre-baking assets.
		 * (State-mutating lifecycle gateway)
		 * @param {IconModuleContext} [context] Host context binding container.
		 * @returns {void}
		 */
		init(context) {
			if (!configured) {
				throw new Error('[VSRP-001] Lifecycle Error: Module must be configured before initialization.');
			}
			if (initialized) return;

			if (context?.eventBus) {
				eventBusRef = context.eventBus;
			}
			ensureCanvas();
			this.bakeAll();
			initialized = true;
		},

		/**
		 * Resets the module state or purges the icon cache based on snapshot directives.
		 * (State-mutating lifecycle gateway)
		 * @param {IconSnapshot | null} [snapshot=null] Optional reset snapshot containing cache control instructions.
		 * @returns {void}
		 */
		reset(snapshot = null) {
			if (snapshot?.clearCache) { // Resolved S6582 optional chaining
				cache.clear();
			}
		},

		/**
		 * Advances the presentation tick (stateless for static icon assets).
		 * (Pure simulation interface)
		 * @param {number} _dt Delta time in seconds.
		 * @returns {void}
		 */
		update(_dt) {
			// Asset baker is stateless during simulation ticks
		},

		/**
		 * Renders the state or forces a bake cycle.
		 * (State-mutating presentation tick)
		 * @returns {void}
		 */
		render() {
			if (cache.size === 0) {
				this.bakeAll();
			}
		},

		/**
		 * Captures a serializable snapshot of the icon cache state.
		 * (Pure state projection)
		 * @returns {IconSnapshot} Serialized module state object.
		 */
		getState() {
			return {
				cacheSize: cache.size,
				cachedKeys: Array.from(cache.keys()),
			};
		},

		/**
		 * Returns diagnostic telemetry for system health audits.
		 * (Pure telemetry collection)
		 * @returns {IconDiagnostics} Diagnostic metrics object.
		 */
		getDiagnostics() {
			return {
				driverId: 'icon_baker_driver_cinematic',
				protocolVersion: 'VSRP-001',
				configured,
				initialized,
				config,
				hasEventBus: Boolean(eventBusRef),
				cachedIconCount: cache.size,
				bufferResolution: `${SIZE}x${SIZE}`,
			};
		},

		/**
		 * Returns metadata matching the module capability schema.
		 * (Pure metadata projection)
		 * @returns {IconModuleInfo} Module metadata object.
		 */
		getModuleInfo() {
			return {
				moduleId: 'EmberlightIcons',
				version: '3.0.0',
				protocolVersion: 'VSRP-001',
				capabilities: [ 'cinematic_procedural_icons', 'raster_engine', 'glow_shaders' ],
			};
		},

		/**
		 * Purges resources, unbinds event listeners, and resets lifecycle gates.
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() {
			cache.clear();
			canvas = null;
			ctx = null;
			eventBusRef = null;
			initialized = false;
			configured = false;
		},

		/**
		 * Bakes all registered icon recipes into PNG data URLs and stores them in the cache.
		 * (State-mutating utility)
		 * @returns {void}
		 */
		bakeAll() {
			ensureCanvas();
			if (!canvas?.toDataURL) return; // Resolved S6582 optional chaining
			const cvs = canvas;
			for (const [ id, renderFn ] of Object.entries(RECIPES)) {
				renderFn();
				try {
					cache.set(id, cvs.toDataURL('image/png'));
				} catch (_) { }
			}
			clear();
		},

		/**
		 * Retrieves a cached PNG data URL for a specific icon identifier.[cite: 2]
		 * (State-mutating / lookup utility)
		 * @param {string} id Unique icon recipe or entity key.
		 * @returns {string|null} Base64 PNG data URL or null if unavailable.
		 */
		get(id) {
			ensureCanvas();
			if (cache.size === 0) {
				this.bakeAll();
			}
			return cache.get(id) || null;
		},

		/**
		 * Synthesizes a dynamic boss icon data URL with specialized heat pulsing and rage states.[cite: 2]
		 * (Pure rendering utility)
		 * @param {boolean} [isEnraged=false] Whether the boss is in an enraged phase.
		 * @param {number} [heatPulse=1.0] Pulsation scale factor.
		 * @returns {string|null} Base64 PNG data URL or null if unavailable.
		 */
		getBossIcon(isEnraged = false, heatPulse = 1.0) {
			ensureCanvas();
			if (!canvas?.toDataURL) return null; // Resolved S6582 optional chaining
			drawMalakorBoss(isEnraged, heatPulse);
			return canvas.toDataURL('image/png');
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightIcons = EmberlightIcons;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightIcons;
}