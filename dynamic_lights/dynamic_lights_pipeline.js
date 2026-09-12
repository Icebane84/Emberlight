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
if (typeof globalThis !== 'undefined') globalThis._DynamicLightsInternal = globalThis._DynamicLightsInternal || {};

(() => {
	'use strict';

	/**
	 * Renders global darkness mask and carves out light visibility circles and shadow volumes.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
	 * @param {number} w - Canvas width in pixels.
	 * @param {number} h - Canvas height in pixels.
	 * @param {number} ambientDarkness - Ambient darkness factor.
	 * @param {Array<Object>} emitters - Active emitters array.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @param {string[][]|null} cachedMap - Cached 2D terrain grid.
	 * @param {number} tileW - Tile width in pixels.
	 * @param {number} tileH - Tile height in pixels.
	 * @param {function} castShadowFromOccluder - Shadow casting subroutine.
	 * @returns {void}
	 */
	function renderDarknessAndShadows(ctx, w, h, ambientDarkness, emitters, offsetX, offsetY, cachedMap, tileW, tileH, castShadowFromOccluder) {
		if (ambientDarkness <= 0 || !ctx) return;

		ctx.save();
		ctx.fillStyle = `rgba(2, 2, 7, ${ambientDarkness})`;
		ctx.fillRect(0, 0, w, h);

		ctx.globalCompositeOperation = 'destination-out';
		emitters.forEach((light) => {
			const radGrad = ctx.createRadialGradient(
				light.x, light.y, light.innerRadius * 0.2,
				light.x, light.y, light.radius
			);
			radGrad.addColorStop(0, `rgba(0, 0, 0, ${light.intensity * 0.92})`);
			radGrad.addColorStop(0.25, `rgba(0, 0, 0, ${light.intensity * 0.75})`);
			radGrad.addColorStop(0.60, `rgba(0, 0, 0, ${light.intensity * 0.35})`);
			radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx.fillStyle = radGrad;
			ctx.beginPath();
			ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.restore();

		if (cachedMap) {
			ctx.save();
			for (let y = 0; y < cachedMap.length; y++) {
				for (let x = 0; x < cachedMap[y].length; x++) {
					const tile = cachedMap[y][x];
					if (tile === '#' || tile === 'P' || tile === 'B') {
						const ox = offsetX + (x * tileW);
						const oy = offsetY + (y * tileH);
						emitters.forEach((light) => {
							const d = Math.hypot(light.x - (ox + tileW * 0.5), light.y - (oy + tileH * 0.5));
							if (d < light.radius * 1.25) {
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
	 * Renders additive radiant light glows and wall edge bevel highlights.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
	 * @param {Array<Object>} emitters - Active emitters array.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @param {string[][]|null} cachedMap - Cached 2D terrain grid.
	 * @param {number} tileW - Tile width in pixels.
	 * @param {number} tileH - Tile height in pixels.
	 * @param {function} drawBeveledWallEdges - Bevel drawing subroutine.
	 * @returns {void}
	 */
	function renderRadiantAndBevelHighlights(ctx, emitters, offsetX, offsetY, cachedMap, tileW, tileH, drawBeveledWallEdges) {
		if (!ctx) return;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';

		emitters.forEach((light) => {
			const glowGrad = ctx.createRadialGradient(
				light.x, light.y, light.isPlayer ? 4 : 0,
				light.x, light.y, light.radius * 0.85
			);
			glowGrad.addColorStop(0, `rgba(${light.color}, ${0.18 * light.intensity})`);
			glowGrad.addColorStop(0.35, `rgba(${light.color}, ${0.08 * light.intensity})`);
			glowGrad.addColorStop(0.70, `rgba(${light.color}, ${0.02 * light.intensity})`);
			glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx.fillStyle = glowGrad;
			ctx.beginPath();
			ctx.arc(light.x, light.y, light.radius * 0.85, 0, Math.PI * 2);
			ctx.fill();

			if (cachedMap) {
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

	/**
	 * Advances and renders floating ambient crypt dust motes.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D canvas rendering context.
	 * @param {number} w - Canvas width in pixels.
	 * @param {number} h - Canvas height in pixels.
	 * @param {number} pScreenX - Player screen X coordinate.
	 * @param {number} pScreenY - Player screen Y coordinate.
	 * @param {Array<Object>} dustMotes - Dust mote particle array.
	 * @param {function} initDustMotes - Dust motes initializer.
	 * @param {function} moteRand - PRNG float generator.
	 * @returns {void}
	 */
	function renderDustMotes(ctx, w, h, pScreenX, pScreenY, dustMotes, initDustMotes, moteRand) {
		if (!ctx) return;
		initDustMotes(dustMotes);
		ctx.save();
		dustMotes.forEach((m) => {
			m.x += m.vx;
			m.y += m.vy;
			if (m.y < 0) { m.y = h; m.x = moteRand() * w; }
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
		globalThis._DynamicLightsInternal.Pipeline = Pipeline;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Pipeline;
	}
})();
