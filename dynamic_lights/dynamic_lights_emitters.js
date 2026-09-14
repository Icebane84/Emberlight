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

if (typeof window !== "undefined")
	window._DynamicLightsInternal = window._DynamicLightsInternal || {};
if (typeof globalThis !== "undefined")
	globalThis._DynamicLightsInternal = globalThis._DynamicLightsInternal || {};

(() => {
	/**
	 * Spawns a transient light emitter into the circular pool buffer.
	 * @param {Array<Object>} transientLights - Target transient pool.
	 * @param {number} maxTransients - Maximum allowed transients in pool.
	 * @param {Object} opts - Emitter parameters object.
	 * @param {number} opts.x - Relative X pixel position.
	 * @param {number} opts.y - Relative Y pixel position.
	 * @param {number} opts.radius - Effective light radius.
	 * @param {string} opts.color - RGB color string format.
	 * @param {number} [opts.duration=0.5] - Effect duration in seconds.
	 * @param {number} [opts.intensity=1.0] - Brightness multiplier.
	 * @returns {void}
	 */
	function spawnTransientLight(
		transientLights,
		maxTransients,
		arg3,
		arg4,
		arg5,
		arg6,
		arg7,
		arg8,
	) {
		if (!Array.isArray(transientLights)) return;
		let x,
			y,
			radius,
			color,
			duration = 0.5,
			intensity = 1.0;
		if (typeof arg3 === "object" && arg3 !== null) {
			x = arg3.x;
			y = arg3.y;
			radius = arg3.radius;
			color = arg3.color;
			if (typeof arg3.duration === "number") duration = arg3.duration;
			if (typeof arg3.intensity === "number") intensity = arg3.intensity;
		} else {
			x = arg3;
			y = arg4;
			radius = arg5;
			color = arg6;
			if (typeof arg7 === "number") duration = arg7;
			if (typeof arg8 === "number") intensity = arg8;
		}

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
	function collectStaticMapEmitters(
		cachedMap,
		tileW,
		tileH,
		offsetX,
		offsetY,
		isSubterranean,
		flickerTime,
	) {
		const mapEmitters = [];
		if (!cachedMap) return mapEmitters;

		for (let y = 0; y < cachedMap.length; y++) {
			for (let x = 0; x < cachedMap[y].length; x++) {
				const tile = cachedMap[y][x];
				const hx = offsetX + x * tileW + tileW * 0.5;
				const hy = offsetY + y * tileH + tileH * 0.5;

				if (tile === "C") {
					mapEmitters.push({
						x: hx,
						y: hy,
						radius: 78 + Math.sin(flickerTime * 5 + x) * 3,
						innerRadius: 8,
						color: "245, 158, 11",
						intensity: 0.7,
						isPlayer: false,
					});
				} else if (tile === ">") {
					mapEmitters.push({
						x: hx,
						y: hy,
						radius: 80 + Math.sin(flickerTime * 4) * 2.5,
						innerRadius: 10,
						color: "168, 85, 247",
						intensity: 0.75,
						isPlayer: false,
					});
				} else if (tile === "<" && isSubterranean) {
					mapEmitters.push({
						x: hx,
						y: hy,
						radius: 75 + Math.sin(flickerTime * 3) * 2.5,
						innerRadius: 10,
						color: "56, 189, 248",
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
	 * @param {Object} playerState - Player screen coordinates and flicker state.
	 * @param {Object} viewportState - Viewport offset, tile dimensions, and subterranean flag.
	 * @param {Object} mapState - Map grid and animation time.
	 * @param {Array<Object>} transientLights - Transient emitter pool.
	 * @returns {Array<Object>} Combined emitters array.
	 */
	function assembleEmitters(
		arg1,
		arg2,
		arg3,
		arg4,
		arg5,
		arg6,
		arg7,
		arg8,
		arg9,
		arg10,
		arg11,
	) {
		let pScreenX = 0,
			pScreenY = 0,
			flicker = 0;
		let offsetX = 0,
			offsetY = 0,
			isSubterranean = false,
			tileW = 38,
			tileH = 30;
		let cachedMap = null,
			flickerTime = 0,
			transientLights = [];

		if (typeof arg1 === "object" && arg1 !== null) {
			// Grouped object signature: (playerState, viewportState, mapState, transientLights)
			pScreenX = arg1.pScreenX || 0;
			pScreenY = arg1.pScreenY || 0;
			flicker = arg1.flicker || 0;

			if (arg2) {
				offsetX = arg2.offsetX || 0;
				offsetY = arg2.offsetY || 0;
				isSubterranean = Boolean(arg2.isSubterranean);
				tileW = arg2.tileW || 38;
				tileH = arg2.tileH || 30;
			}
			if (arg3) {
				cachedMap = arg3.cachedMap || null;
				flickerTime = arg3.flickerTime || 0;
			}
			transientLights = Array.isArray(arg4) ? arg4 : [];
		} else {
			// Positional arguments signature: (pScreenX, pScreenY, flicker, offsetX, offsetY, isSubterranean, cachedMap, tileW, tileH, flickerTime, transientLights)
			pScreenX = typeof arg1 === "number" ? arg1 : 0;
			pScreenY = typeof arg2 === "number" ? arg2 : 0;
			flicker = typeof arg3 === "number" ? arg3 : 0;
			offsetX = typeof arg4 === "number" ? arg4 : 0;
			offsetY = typeof arg5 === "number" ? arg5 : 0;
			isSubterranean = Boolean(arg6);
			cachedMap = Array.isArray(arg7) ? arg7 : null;
			tileW = typeof arg8 === "number" ? arg8 : 38;
			tileH = typeof arg9 === "number" ? arg9 : 30;
			flickerTime = typeof arg10 === "number" ? arg10 : 0;
			transientLights = Array.isArray(arg11) ? arg11 : [];
		}

		const emitters = [];
		if (isSubterranean) {
			emitters.push({
				x: pScreenX,
				y: pScreenY,
				radius: Math.max(45, 85 + flicker),
				innerRadius: 16,
				color: "255, 160, 60",
				intensity: 0.85,
				isPlayer: true,
			});
		}
		emitters.push(
			...collectStaticMapEmitters(
				cachedMap,
				tileW,
				tileH,
				offsetX,
				offsetY,
				isSubterranean,
				flickerTime,
			),
			...collectTransientEmitters(transientLights, offsetX, offsetY),
		);
		return emitters;
	}

	const Emitters = Object.freeze({
		spawnTransientLight,
		collectStaticMapEmitters,
		collectTransientEmitters,
		assembleEmitters,
	});

	if (typeof window !== "undefined") {
		window._DynamicLightsInternal.Emitters = Emitters;
	}
	if (typeof globalThis !== "undefined") {
		globalThis._DynamicLightsInternal.Emitters = Emitters;
	}
	if (typeof module !== "undefined" && module.exports) {
		module.exports = Emitters;
	}
})();
