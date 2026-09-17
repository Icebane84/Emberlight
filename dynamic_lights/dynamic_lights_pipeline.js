/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DYNAMIC LIGHTS PIPELINE SUB-MODULE
 * Document Identifier: VSRP-001-DYNAMIC-LIGHTS-PIPELINE
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-06] Ambient Floating Crypt Mote Simulation
 *   [SEC-08] Main Animation & Lighting Compositor Loop Stages
 *
 * STAGING MEMBRANE KEY: window._DynamicLightsInternal.Pipeline
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DynamicLightsInternal = window._DynamicLightsInternal || {};
if (typeof globalThis !== 'undefined') (/** @type {any} */ (globalThis))._DynamicLightsInternal = (/** @type {any} */ (globalThis))._DynamicLightsInternal || {};

(() => {

	/**
	 * @param {any[]} args
	 */
	function parseDarknessParams(args) {
		const [arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11] = args;
		if (typeof arg2 === 'object' && arg2 !== null && !Array.isArray(arg2)) {
			const mapState = arg4 || {};
			return {
				w: arg2.w || 480,
				h: arg2.h || 320,
				ambientDarkness: typeof arg2.ambientDarkness === 'number' ? arg2.ambientDarkness : 0,
				emitters: Array.isArray(arg3) ? arg3 : [],
				offsetX: mapState.offsetX || 0,
				offsetY: mapState.offsetY || 0,
				cachedMap: mapState.cachedMap || null,
				tileW: mapState.tileW || 38,
				tileH: mapState.tileH || 30,
				castShadowFromOccluder: (typeof arg5 === 'object' ? arg5?.castShadowFromOccluder : arg5) || (() => {}),
			};
		}
		return {
			w: arg2 || 480,
			h: arg3 || 320,
			ambientDarkness: typeof arg4 === 'number' ? arg4 : 0,
			emitters: Array.isArray(arg5) ? arg5 : [],
			offsetX: arg6 || 0,
			offsetY: arg7 || 0,
			cachedMap: arg8 || null,
			tileW: arg9 || 38,
			tileH: arg10 || 30,
			castShadowFromOccluder: typeof arg11 === 'function' ? arg11 : (() => {}),
		};
	}

	/**
	 * Renders global darkness mask and carves out light visibility circles and shadow volumes.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
	 * @param {...any} args - Grouped object configuration or positional parameter list.
	 * @returns {void}
	 */
	function renderDarknessAndShadows(ctx, ...args) {
		if (!ctx) return;
		const {
			w, h, ambientDarkness, emitters, offsetX, offsetY, cachedMap, tileW, tileH, castShadowFromOccluder
		} = parseDarknessParams(args);

		if (ambientDarkness <= 0 || !Array.isArray(emitters) || emitters.length === 0) return;

		ctx.save();
		ctx.fillStyle = `rgba(2, 2, 7, ${ambientDarkness})`;
		ctx.fillRect(0, 0, w, h);

		ctx.globalCompositeOperation = 'destination-out';
		emitters.forEach((light) => {
			if (!light) return;
			const radGrad = ctx.createRadialGradient(
				light.x, light.y, (light.innerRadius || 0) * 0.2,
				light.x, light.y, light.radius || 50
			);
			radGrad.addColorStop(0, `rgba(0, 0, 0, ${(light.intensity || 1) * 0.92})`);
			radGrad.addColorStop(0.25, `rgba(0, 0, 0, ${(light.intensity || 1) * 0.75})`);
			radGrad.addColorStop(0.60, `rgba(0, 0, 0, ${(light.intensity || 1) * 0.35})`);
			radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx.fillStyle = radGrad;
			ctx.beginPath();
			ctx.arc(light.x, light.y, light.radius || 50, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.restore();

		if (cachedMap && typeof castShadowFromOccluder === 'function') {
			ctx.save();
			for (let y = 0; y < cachedMap.length; y++) {
				for (let x = 0; x < cachedMap[y].length; x++) {
					const tile = cachedMap[y][x];
					if (tile === '#' || tile === 'P' || tile === 'B') {
						const ox = offsetX + (x * tileW);
						const oy = offsetY + (y * tileH);
						emitters.forEach((light) => {
							if (!light) return;
							const d = Math.hypot(light.x - (ox + tileW * 0.5), light.y - (oy + tileH * 0.5));
							if (d < (light.radius || 50) * 1.25) {
								castShadowFromOccluder(ctx, light, ox, oy, tileW, tileH, ambientDarkness);
							}
						});
					}
				}
			}
			ctx.restore();
		}
	}

	/**
	 * @param {any[]} args
	 */
	function parseRadiantParams(args) {
		const [arg2, arg3, arg4, arg5, arg6, arg7, arg8] = args;
		const emitters = Array.isArray(arg2) ? arg2 : [];
		if (typeof arg3 === 'object' && arg3 !== null && !Array.isArray(arg3)) {
			return {
				emitters,
				offsetX: arg3.offsetX || 0,
				offsetY: arg3.offsetY || 0,
				cachedMap: arg3.cachedMap || null,
				tileW: arg3.tileW || 38,
				tileH: arg3.tileH || 30,
				drawBeveledWallEdges: typeof arg4 === 'function' ? arg4 : (() => {}),
			};
		}
		return {
			emitters,
			offsetX: arg3 || 0,
			offsetY: arg4 || 0,
			cachedMap: arg5 || null,
			tileW: arg6 || 38,
			tileH: arg7 || 30,
			drawBeveledWallEdges: typeof arg8 === 'function' ? arg8 : (() => {}),
		};
	}

	/**
	 * Renders additive radiant light glows and wall edge bevel highlights.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
	 * @param {...any} args - Grouped object configuration or positional parameter list.
	 * @returns {void}
	 */
	function renderRadiantAndBevelHighlights(ctx, ...args) {
		if (!ctx) return;
		const {
			emitters, offsetX, offsetY, cachedMap, tileW, tileH, drawBeveledWallEdges
		} = parseRadiantParams(args);

		if (!Array.isArray(emitters) || emitters.length === 0) return;

		ctx.save();
		ctx.globalCompositeOperation = 'lighter';

		emitters.forEach((light) => {
			if (!light) return;
			const glowGrad = ctx.createRadialGradient(
				light.x, light.y, light.isPlayer ? 4 : 0,
				light.x, light.y, (light.radius || 50) * 0.85
			);
			const color = light.color || '255, 160, 60';
			const intensity = light.intensity || 1;
			glowGrad.addColorStop(0, `rgba(${color}, ${0.18 * intensity})`);
			glowGrad.addColorStop(0.35, `rgba(${color}, ${0.08 * intensity})`);
			glowGrad.addColorStop(0.70, `rgba(${color}, ${0.02 * intensity})`);
			glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx.fillStyle = glowGrad;
			ctx.beginPath();
			ctx.arc(light.x, light.y, (light.radius || 50) * 0.85, 0, Math.PI * 2);
			ctx.fill();

			if (cachedMap && typeof drawBeveledWallEdges === 'function') {
				for (let y = 0; y < cachedMap.length; y++) {
					for (let x = 0; x < cachedMap[y].length; x++) {
						if (cachedMap[y][x] === '#' || cachedMap[y][x] === 'P' || cachedMap[y][x] === 'B') {
							const ox = offsetX + (x * tileW);
							const oy = offsetY + (y * tileH);
							drawBeveledWallEdges(ctx, light, ox, oy, tileW, tileH);
						}
					}
				}
			}
		});
		ctx.restore();
	}

	let fallbackMoteSeed = 1337;
	/**
	 * Generates deterministic fallback pseudorandom float numbers for motes.
	 * @returns {number} Normalized float between 0 and 1.
	 */
	function fallbackMoteRand() {
		fallbackMoteSeed = (fallbackMoteSeed * 16807) % 2147483647;
		return (fallbackMoteSeed - 1) / 2147483646;
	}

	/**
	 * @param {any[]} args
	 */
	function parseDustParams(args) {
		const [arg2, arg3, arg4, arg5, arg6, arg7, arg8] = args;
		if (typeof arg2 === 'object' && arg2 !== null && !Array.isArray(arg2)) {
			const moteState = arg3 || {};
			return {
				w: arg2.w || 480,
				h: arg2.h || 320,
				pScreenX: arg2.pScreenX || 0,
				pScreenY: arg2.pScreenY || 0,
				dustMotes: moteState.dustMotes || [],
				initDustMotes: moteState.initDustMotes || (() => {}),
				moteRand: moteState.moteRand || fallbackMoteRand,
			};
		}
		return {
			w: arg2 || 480,
			h: arg3 || 320,
			pScreenX: arg4 || 0,
			pScreenY: arg5 || 0,
			dustMotes: Array.isArray(arg6) ? arg6 : [],
			initDustMotes: typeof arg7 === 'function' ? arg7 : (() => {}),
			moteRand: typeof arg8 === 'function' ? arg8 : fallbackMoteRand,
		};
	}

	/**
	 * Advances and renders floating ambient crypt dust motes.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
	 * @param {...any} args - Grouped object configuration or positional parameter list.
	 * @returns {void}
	 */
	function renderDustMotes(ctx, ...args) {
		if (!ctx) return;
		const {
			w, h, pScreenX, pScreenY, dustMotes, initDustMotes, moteRand
		} = parseDustParams(args);

		if (typeof initDustMotes === 'function') {
			initDustMotes(dustMotes);
		}

		ctx.save();
		dustMotes.forEach((/** @type {any} */ m) => {
			m.x += m.vx;
			m.y += m.vy;
			if (m.y < 0) { m.y = h; m.x = (typeof moteRand === 'function' ? moteRand() : fallbackMoteRand()) * w; }
			if (m.x < 0) m.x = w;
			if (m.x > w) m.x = 0;

			const dToPlayer = Math.hypot(m.x - pScreenX, m.y - pScreenY);
			if (dToPlayer < 135) {
				const vis = (1.0 - dToPlayer / 135) * m.alpha;
				ctx.fillStyle = m.isSpectral
					? `rgba(168, 85, 247, ${vis * 0.6})`
					: `rgba(255, 200, 120, ${vis * 0.75})`;
				ctx.beginPath();
				ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
				ctx.fill();
			}
		});
		ctx.restore();
	}

	const Pipeline = Object.freeze({
		renderDarknessAndShadows,
		renderRadiantAndBevelHighlights,
		renderDustMotes,
	});

	if (typeof window !== 'undefined') {
		window._DynamicLightsInternal.Pipeline = Pipeline;
	}
	if (typeof globalThis !== 'undefined') {
		(/** @type {any} */ (globalThis))._DynamicLightsInternal.Pipeline = Pipeline;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Pipeline;
	}
})();