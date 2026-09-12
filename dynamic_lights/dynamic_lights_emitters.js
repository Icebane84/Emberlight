/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DYNAMIC LIGHTS EMITTERS SUB-MODULE
 * Document Identifier: VSRP-001-DYNAMIC-LIGHTS-EMITTERS
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-03] Transient Emitter Pool Management
 *   [SEC-07] Emitter Collection & Scene Assembly Pipeline
 *
 * STAGING MEMBRANE KEY: window._DynamicLightsInternal.Emitters
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DynamicLightsInternal = window._DynamicLightsInternal || {};
if (typeof globalThis !== 'undefined') globalThis._DynamicLightsInternal = globalThis._DynamicLightsInternal || {};

(() => {
	'use strict';

	/**
	 * Spawns a transient light emitter into the circular pool buffer.
	 * @param {Array<Object>} transientLights - Target transient pool.
	 * @param {number} maxTransients - Maximum allowed transients in pool.
	 * @param {number} x - Relative X pixel position.
	 * @param {number} y - Relative Y pixel position.
	 * @param {number} radius - Effective light radius.
	 * @param {string} color - RGB color string format.
	 * @param {number} [duration=0.5] - Effect duration in seconds.
	 * @param {number} [intensity=1.0] - Brightness multiplier.
	 * @returns {void}
	 */
	function spawnTransientLight(transientLights, maxTransients, x, y, radius, color, duration = 0.5, intensity = 1.0) {
		if (transientLights.length >= maxTransients) {
			transientLights.shift();
		}
		transientLights.push({
			x,
			y,
			radius,
			color,
			intensity,
			life: duration,
			maxLife: duration,
		});
	}

	/**
	 * Collects static map light emitters (torches, stairs, crystal beacons).
	 * @param {string[][]|null} cachedMap - Cached 2D map grid.
	 * @param {number} tileW - Tile width in pixels.
	 * @param {number} tileH - Tile height in pixels.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @param {boolean} isSubterranean - Subterranean environment flag.
	 * @param {number} flickerTime - High-resolution flicker phase.
	 * @returns {Array<Object>} Array of static light emitters.
	 */
	function collectStaticMapEmitters(cachedMap, tileW, tileH, offsetX, offsetY, isSubterranean, flickerTime) {
		const mapEmitters = [];
		if (!cachedMap) return mapEmitters;

		for (let y = 0; y < cachedMap.length; y++) {
			for (let x = 0; x < cachedMap[y].length; x++) {
				const tile = cachedMap[y][x];
				const hx = offsetX + (x * tileW) + (tileW * 0.5);
				const hy = offsetY + (y * tileH) + (tileH * 0.5);

				if (tile === 'C') {
					mapEmitters.push({
						x: hx,
						y: hy,
						radius: 78 + Math.sin(flickerTime * 5 + x) * 3,
						innerRadius: 8,
						color: '245, 158, 11',
						intensity: 0.70,
						isPlayer: false,
					});
				} else if (tile === '>') {
					mapEmitters.push({
						x: hx,
						y: hy,
						radius: 80 + Math.sin(flickerTime * 4) * 2.5,
						innerRadius: 10,
						color: '168, 85, 247',
						intensity: 0.75,
						isPlayer: false,
					});
				} else if (tile === '<' && isSubterranean) {
					mapEmitters.push({
						x: hx,
						y: hy,
						radius: 75 + Math.sin(flickerTime * 3) * 2.5,
						innerRadius: 10,
						color: '56, 189, 248',
						intensity: 0.75,
						isPlayer: false,
					});
				}
			}
		}
		return mapEmitters;
	}

	/**
	 * Advances transient light timers and collects active transient emitters.
	 * @param {Array<Object>} transientLights - Target transient pool.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @returns {Array<Object>} Array of active transient emitters.
	 */
	function collectTransientEmitters(transientLights, offsetX, offsetY) {
		const active = [];
		for (let i = transientLights.length - 1; i >= 0; i--) {
			const tl = transientLights[i];
			tl.life -= 0.016;
			if (tl.life <= 0) {
				transientLights.splice(i, 1);
				continue;
			}
			const progress = tl.life / tl.maxLife;
			active.push({
				x: offsetX + tl.x,
				y: offsetY + tl.y,
				radius: tl.radius * (0.5 + progress * 0.5),
				innerRadius: 4,
				color: tl.color,
				intensity: tl.intensity * progress,
				isPlayer: false,
			});
		}
		return active;
	}

	/**
	 * Assembles all static, transient, and player light emitters for the frame.
	 * @param {number} pScreenX - Player screen X coordinate.
	 * @param {number} pScreenY - Player screen Y coordinate.
	 * @param {number} flicker - Current flame flicker offset.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @param {boolean} isSubterranean - Subterranean environment flag.
	 * @param {string[][]|null} cachedMap - Cached 2D map grid.
	 * @param {number} tileW - Tile width in pixels.
	 * @param {number} tileH - Tile height in pixels.
	 * @param {number} flickerTime - High-resolution flicker phase.
	 * @param {Array<Object>} transientLights - Transient emitter pool.
	 * @returns {Array<Object>} Combined emitters array.
	 */
	function assembleEmitters(pScreenX, pScreenY, flicker, offsetX, offsetY, isSubterranean, cachedMap, tileW, tileH, flickerTime, transientLights) {
		const emitters = [];
		if (isSubterranean) {
			emitters.push({
				x: pScreenX,
				y: pScreenY,
				radius: Math.max(45, 85 + flicker),
				innerRadius: 16,
				color: '255, 160, 60',
				intensity: 0.85,
				isPlayer: true,
			});
		}
		emitters.push(
			...collectStaticMapEmitters(cachedMap, tileW, tileH, offsetX, offsetY, isSubterranean, flickerTime),
			...collectTransientEmitters(transientLights, offsetX, offsetY)
		);
		return emitters;
	}

	const Emitters = Object.freeze({
		spawnTransientLight,
		collectStaticMapEmitters,
		collectTransientEmitters,
		assembleEmitters,
	});

	if (typeof window !== 'undefined') {
		window._DynamicLightsInternal.Emitters = Emitters;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis._DynamicLightsInternal.Emitters = Emitters;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Emitters;
	}
})();
