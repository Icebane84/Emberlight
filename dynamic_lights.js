/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DYNAMIC TILE & VOXEL LIGHTING
 * Document Identifier: VSRP-001-DYNAMIC-LIGHTS
 * Protocol Version:    VSRP-001[cite: 3]
 * Authority:           Peripheral Capability Driver & Multi-Source Lighting[cite: 3]
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Module State, Variables & Canvas Initializer
 *   [SEC-02] Viewport Resolution & Zone Evaluation Subroutines
 *   [SEC-03] Transient Emitter Pool Management
 *   [SEC-04] Dynamic Shadow Volume Extrusion & Penumbra Falloff
 *   [SEC-05] Normal-Mapped Wall Edge Beveling & Corner Wrap
 *   [SEC-06] Ambient Floating Crypt Mote Simulation
 *   [SEC-07] Emitter Collection & Scene Assembly Pipeline
 *   [SEC-08] Main Animation & Lighting Compositor Loop
 *   [SEC-09] Canonical VSRP-001 9-Method Interface & Module Export
 * ============================================================================
 */

const EmberlightDynamicLights = (() => {
	'use strict';

	//#region [SEC-01] Module State, Variables & Canvas Initializer
	/**
	 * @typedef {Object} LightEmitter
	 * @property {number} x - Screen X pixel position.
	 * @property {number} y - Screen Y pixel position.
	 * @property {number} radius - Effective light radius.
	 * @property {number} innerRadius - Core high-intensity inner radius.
	 * @property {string} color - RGB color string format (e.g., '255, 160, 60').
	 * @property {number} intensity - Emitter brightness multiplier.
	 * @property {boolean} isPlayer - Flag indicating player avatar emitter.
	 */

	/**
	 * @typedef {Object} TransientLight
	 * @property {number} x - Relative X coordinate.
	 * @property {number} y - Relative Y coordinate.
	 * @property {number} radius - Peak light radius.
	 * @property {string} color - RGB color string format.
	 * @property {number} intensity - Brightness multiplier.
	 * @property {number} life - Remaining lifetime in seconds.
	 * @property {number} maxLife - Total initialized lifetime in seconds.
	 */

	/**
	 * @typedef {Object} DustMote
	 * @property {number} x - Current screen X position.
	 * @property {number} y - Current screen Y position.
	 * @property {number} vx - Horizontal velocity vector.
	 * @property {number} vy - Vertical velocity vector.
	 * @property {number} radius - Mote drawing radius.
	 * @property {number} alpha - Base transparency level.
	 * @property {boolean} isSpectral - Whether mote is spectral purple or gold.
	 */

	/**
	 * @typedef {Object} LightingDiagnostics
	 * @property {string} driverId - Driver identifier string.
	 * @property {string} activeZone - Active lighting zone classification.
	 * @property {number} dungeonDepth - Current subterranean depth level.
	 * @property {boolean} isSubterranean - Subterranean environment flag.
	 * @property {number} transientLightCount - Count of active transient lights.
	 * @property {boolean} hasMap - Whether terrain map is cached.
	 */

	let canvas = null;
	let ctx = null;
	let eventBus = null;
	let animFrameId = null;

	// Cached tile dimensions (dynamically sampled from DOM)
	let tileW = 38;
	let tileH = 30;

	// Player position state (interpolated for smooth tracking)
	let playerX = 1;
	let playerY = 1;
	let targetPlayerX = 1;
	let targetPlayerY = 1;

	// Environmental lighting context
	let activeZoneType = 'SURFACE'; // 'SURFACE' | 'TOWN' | 'CRYPT'
	let dungeonDepth = 0;
	let cachedMap = null;

	// Transient Light Emitter Pool (Zero-allocation circular buffer)
	const MAX_TRANSIENTS = 24;
	/** @type {TransientLight[]} */
	const transientLights = [];

	// Flame flicker phase
	let flickerTime = 0;

	/**
	 * Ensures the dynamic lighting canvas element is mounted and sized.
	 * State-mutating DOM initialization procedure.
	 * @returns {void}
	 */
	function ensureCanvas() {
		if (typeof document === 'undefined') return;
		if (canvas?.parentElement) return;

		const gridWrapper = document.getElementById('overworld-grid-wrapper') || document.getElementById('overworld-grid');
		if (!gridWrapper) return;

		gridWrapper.style.position = 'relative';
		canvas = document.createElement('canvas');
		canvas.id = 'dynamic-lights-canvas';
		canvas.style.position = 'absolute';
		canvas.style.top = '0';
		canvas.style.left = '0';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.pointerEvents = 'none';
		canvas.style.zIndex = '15';
		gridWrapper.appendChild(canvas);

		ctx = (typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;
		resize();
	}
	//#endregion

	//#region [SEC-02] Viewport Resolution & Zone Evaluation Subroutines
	/**
	 * Resizes internal lighting canvas resolution and samples grid dimensions.
	 * State-mutating DOM measurement and scaling procedure.
	 * @returns {void}
	 */
	function resize() {
		if (!canvas?.parentElement || !ctx) return;
		const rect = canvas.parentElement.getBoundingClientRect
			? canvas.parentElement.getBoundingClientRect()
			: { width: 480, height: 320 };
		const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
		canvas.width = Math.floor((rect.width || 480) * dpr);
		canvas.height = Math.floor((rect.height || 320) * dpr);
		if (ctx.setTransform) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);
		}

		if (typeof document !== 'undefined') {
			const sampleTile = /** @type {HTMLElement|null} */ (document.querySelector('#overworld-grid .tile'));
			if (sampleTile) {
				tileW = sampleTile.offsetWidth || 38;
				tileH = sampleTile.offsetHeight || 30;
			}
		}
	}

	/**
	 * Evaluates the lighting zone type for specific grid coordinates.
	 * Pure evaluation procedure.
	 * @param {number} x - Grid column index.
	 * @param {number} y - Grid row index.
	 * @returns {'CRYPT' | 'TOWN' | 'SURFACE'} Zone classification token.
	 */
	function evaluateZone(x, y) {
		if (dungeonDepth > 0) return 'CRYPT';
		if (typeof EmberlightManifest === 'undefined') return 'SURFACE';
		const map = cachedMap || EmberlightManifest.OverworldMap || [];
		const tile = map[y]?.[x];
		if (tile === 'T' || tile === 'O' || tile === 'H' || tile === 'S') return 'TOWN';
		if (tile === '>') return 'CRYPT';
		return 'SURFACE';
	}
	//#endregion

	//#region [SEC-03] Transient Emitter Pool Management
	/**
	 * Spawns a transient light emitter into the circular pool buffer.
	 * State-mutating buffer pool management procedure.
	 * @param {number} x - Relative X pixel position.
	 * @param {number} y - Relative Y pixel position.
	 * @param {number} radius - Effective light radius.
	 * @param {string} color - RGB color string format.
	 * @param {number} [duration=0.5] - Effect duration in seconds.
	 * @param {number} [intensity=1.0] - Brightness multiplier.
	 * @returns {void}
	 */
	function spawnTransientLight(x, y, radius, color, duration = 0.5, intensity = 1.0) {
		if (transientLights.length >= MAX_TRANSIENTS) {
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
	//#endregion

	//#region [SEC-04] Dynamic Shadow Volume Extrusion & Penumbra Falloff
	/**
	 * Casts projected shadow volumes from an occluding wall tile.
	 * State-mutating canvas shadow rendering procedure.
	 * @param {LightEmitter} light - Target light emitter source.
	 * @param {number} ox - Occluder X screen pixel coordinate.
	 * @param {number} oy - Occluder Y screen pixel coordinate.
	 * @param {number} ow - Occluder width in pixels.
	 * @param {number} oh - Occluder height in pixels.
	 * @param {number} [ambientDarkness=0.94] - Ambient background darkness level.
	 * @returns {void}
	 */
	function castShadowFromOccluder(light, ox, oy, ow, oh, ambientDarkness = 0.94) {
		if (!ctx || !light) return;
		const { x: lightX, y: lightY, radius: maxDist } = light;
		const corners = [
			{ x: ox, y: oy },
			{ x: ox + ow, y: oy },
			{ x: ox + ow, y: oy + oh },
			{ x: ox, y: oy + oh },
		];

		for (let i = 0; i < 4; i++) {
			const p1 = corners[i];
			const p2 = corners[(i + 1) % 4];

			const midX = (p1.x + p2.x) * 0.5;
			const midY = (p1.y + p2.y) * 0.5;
			const normalX = -(p2.y - p1.y);
			const normalY = p2.x - p1.x;

			const lightDirX = midX - lightX;
			const lightDirY = midY - lightY;

			// Facing test (only occlude when face normal points away from light)
			if (normalX * lightDirX + normalY * lightDirY > 0) {
				const d1X = p1.x - lightX;
				const d1Y = p1.y - lightY;
				const d2X = p2.x - lightX;
				const d2Y = p2.y - lightY;

				const len1 = Math.hypot(d1X, d1Y) || 1;
				const len2 = Math.hypot(d2X, d2Y) || 1;

				// Inset shadow origin slightly (2.5px) to allow organic light bleed onto the wall face/edge
				const insetOrigin1X = p1.x + (d1X / len1) * 2.5;
				const insetOrigin1Y = p1.y + (d1Y / len1) * 2.5;
				const insetOrigin2X = p2.x + (d2X / len2) * 2.5;
				const insetOrigin2Y = p2.y + (d2Y / len2) * 2.5;

				// Penumbra projection endpoints
				const proj1X = p1.x + (d1X / len1) * maxDist * 1.35;
				const proj1Y = p1.y + (d1Y / len1) * maxDist * 1.35;
				const proj2X = p2.x + (d2X / len2) * maxDist * 1.35;
				const proj2Y = p2.y + (d2Y / len2) * maxDist * 1.35;

				const gradCenterX = (insetOrigin1X + insetOrigin2X) * 0.5;
				const gradCenterY = (insetOrigin1Y + insetOrigin2Y) * 0.5;
				const gradFarX = (proj1X + proj2X) * 0.5;
				const gradFarY = (proj1Y + proj2Y) * 0.5;

				const shadowGrad = ctx.createLinearGradient(gradCenterX, gradCenterY, gradFarX, gradFarY);
				const maxShadowAlpha = ambientDarkness * 0.92;
				// Soft penumbra start allows organic light wrap at edges
				shadowGrad.addColorStop(0, `rgba(2, 2, 7, ${maxShadowAlpha * 0.15})`);
				shadowGrad.addColorStop(0.12, `rgba(2, 2, 7, ${maxShadowAlpha * 0.75})`);
				shadowGrad.addColorStop(0.50, `rgba(2, 2, 7, ${maxShadowAlpha * 0.95})`);
				shadowGrad.addColorStop(1, `rgba(2, 2, 7, ${maxShadowAlpha})`);

				ctx.fillStyle = shadowGrad;
				ctx.beginPath();
				ctx.moveTo(insetOrigin1X, insetOrigin1Y);
				ctx.lineTo(insetOrigin2X, insetOrigin2Y);
				ctx.lineTo(proj2X, proj2Y);
				ctx.lineTo(proj1X, proj1Y);
				ctx.closePath();
				ctx.fill();
			}
		}
	}
	//#endregion

	//#region [SEC-05] Normal-Mapped Wall Edge Beveling & Corner Wrap
	/**
	 * Renders normal-mapped edge bevel highlights on visible wall tiles.
	 * State-mutating canvas highlight rendering procedure.
	 * @param {LightEmitter} light - Target light source emitter.
	 * @param {number} ox - Wall tile screen X pixel coordinate.
	 * @param {number} oy - Wall tile screen Y pixel coordinate.
	 * @param {number} ow - Tile width in pixels.
	 * @param {number} oh - Tile height in pixels.
	 * @returns {void}
	 */
	function drawBeveledWallEdges(light, ox, oy, ow, oh) {
		if (!ctx || !light) return;
		const { x: lightX, y: lightY, radius: maxDist, color: lightColor } = light;
		const cx = ox + ow * 0.5;
		const cy = oy + oh * 0.5;
		const dx = lightX - cx;
		const dy = lightY - cy;
		const dist = Math.hypot(dx, dy);

		if (dist > maxDist || dist < 1) return;

		const attenuation = Math.max(0, 1 - dist / maxDist);
		const intensity = attenuation * (light.intensity || 0.75) * 0.8;
		ctx.lineWidth = 1.5;

		// North Edge
		if (dy < -oh * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.85})`;
			ctx.beginPath();
			ctx.moveTo(ox, oy);
			ctx.lineTo(ox + ow, oy);
			ctx.stroke();
		}
		// South Edge
		if (dy > oh * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.45})`;
			ctx.beginPath();
			ctx.moveTo(ox, oy + oh);
			ctx.lineTo(ox + ow, oy + oh);
			ctx.stroke();
		}
		// West Edge
		if (dx < -ow * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.75})`;
			ctx.beginPath();
			ctx.moveTo(ox, oy);
			ctx.lineTo(ox, oy + oh);
			ctx.stroke();
		}
		// East Edge
		if (dx > ow * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.55})`;
			ctx.beginPath();
			ctx.moveTo(ox + ow, oy);
			ctx.lineTo(ox + ow, oy + oh);
			ctx.stroke();
		}
	}
	//#endregion

	//#region [SEC-06] Ambient Floating Crypt Mote Simulation
	const DUST_MOTE_COUNT = 24;
	/** @type {DustMote[]} */
	const dustMotes = [];
	let moteSeed = 1337;

	/**
	 * Generates deterministic pseudorandom float numbers for motes.
	 * State-mutating math utility procedure.
	 * @returns {number} Normalized float between 0 and 1.
	 */
	function moteRand() {
		moteSeed = (moteSeed * 16807) % 2147483647;
		return (moteSeed - 1) / 2147483646;
	}

	/**
	 * Initializes ambient floating dust mote particle buffers.
	 * State-mutating particle pool initialization procedure.
	 * @returns {void}
	 */
	function initDustMotes() {
		if (dustMotes.length === 0) {
			for (let i = 0; i < DUST_MOTE_COUNT; i++) {
				dustMotes.push({
					x: moteRand() * 480,
					y: moteRand() * 320,
					vx: (moteRand() - 0.5) * 0.35,
					vy: -0.15 - moteRand() * 0.35,
					radius: 0.8 + moteRand() * 1.6,
					alpha: 0.25 + moteRand() * 0.45,
					isSpectral: moteRand() > 0.65,
				});
			}
		}
	}
	//#endregion

	//#region [SEC-07] Emitter Collection & Scene Assembly Pipeline
	/**
	 * Calculates interpolated screen pixel coordinates for player avatar.
	 * Pure DOM coordinate measurement procedure.
	 * @param {number} offsetX - Grid wrapper screen X offset.
	 * @param {number} offsetY - Grid wrapper screen Y offset.
	 * @returns {{ pScreenX: number, pScreenY: number }} Screen coordinate object.
	 */
	function calculateScreenPlayerCoords(offsetX, offsetY) {
		const playerCell = (typeof document !== 'undefined') ? document.querySelector('#overworld-grid .tile.player') : null;
		let pScreenX = offsetX + (playerX * tileW) + (tileW * 0.5);
		let pScreenY = offsetY + (playerY * tileH) + (tileH * 0.5);

		if (playerCell && canvas) {
			const cellRect = (typeof playerCell.getBoundingClientRect === 'function') ? playerCell.getBoundingClientRect() : null;
			const canvasRect = (typeof canvas.getBoundingClientRect === 'function') ? canvas.getBoundingClientRect() : null;
			if (cellRect && canvasRect && cellRect.width > 0 && cellRect.width < 1000) {
				pScreenX = (cellRect.left - canvasRect.left) + cellRect.width * 0.5;
				pScreenY = (cellRect.top - canvasRect.top) + cellRect.height * 0.5;
			}
		}
		return { pScreenX, pScreenY };
	}

	/**
	 * Collects static map light emitters (torches, stairs, crystal beacons).
	 * Pure data collection procedure.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @param {boolean} isSubterranean - Subterranean environment flag.
	 * @returns {LightEmitter[]} Array of static light emitters.
	 */
	function collectStaticMapEmitters(offsetX, offsetY, isSubterranean) {
		/** @type {LightEmitter[]} */
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
	 * State-mutating buffer collection procedure.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @returns {LightEmitter[]} Array of active transient emitters.
	 */
	function collectTransientEmitters(offsetX, offsetY) {
		/** @type {LightEmitter[]} */
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
	 * Pure assembly procedure.
	 * @param {number} pScreenX - Player screen X coordinate.
	 * @param {number} pScreenY - Player screen Y coordinate.
	 * @param {number} flicker - Current flame flicker offset.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @param {boolean} isSubterranean - Subterranean environment flag.
	 * @returns {LightEmitter[]} Combined emitters array.
	 */
	function assembleEmitters(pScreenX, pScreenY, flicker, offsetX, offsetY, isSubterranean) {
		/** @type {LightEmitter[]} */
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
		emitters.push(...collectStaticMapEmitters(offsetX, offsetY, isSubterranean), ...collectTransientEmitters(offsetX, offsetY));
		return emitters;
	}
	//#endregion

	//#region [SEC-08] Main Animation & Lighting Compositor Loop
	/**
	 * Renders global darkness mask and carves out light visibility circles and shadow volumes.
	 * State-mutating canvas compositor procedure.
	 * @param {number} w - Canvas width in pixels.
	 * @param {number} h - Canvas height in pixels.
	 * @param {number} ambientDarkness - Ambient darkness factor.
	 * @param {LightEmitter[]} emitters - Active emitters array.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @returns {void}
	 */
	function renderDarknessAndShadows(w, h, ambientDarkness, emitters, offsetX, offsetY) {
		if (ambientDarkness <= 0) return;

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
								castShadowFromOccluder(light, ox, oy, tileW, tileH, ambientDarkness);
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
	 * State-mutating canvas compositor procedure.
	 * @param {LightEmitter[]} emitters - Active emitters array.
	 * @param {number} offsetX - Screen X offset.
	 * @param {number} offsetY - Screen Y offset.
	 * @returns {void}
	 */
	function renderRadiantAndBevelHighlights(emitters, offsetX, offsetY) {
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
							drawBeveledWallEdges(light, ox, oy, tileW, tileH);
						}
					}
				}
			}
		});
		ctx.restore();
	}

	/**
	 * Advances and renders floating ambient crypt dust motes.
	 * State-mutating particle update and render procedure.
	 * @param {number} w - Canvas width in pixels.
	 * @param {number} h - Canvas height in pixels.
	 * @param {number} pScreenX - Player screen X coordinate.
	 * @param {number} pScreenY - Player screen Y coordinate.
	 * @returns {void}
	 */
	function renderDustMotes(w, h, pScreenX, pScreenY) {
		initDustMotes();
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

	/**
	 * Main animation frame loop for dynamic lighting and shadow compositing.
	 * State-mutating requestAnimationFrame render procedure.
	 * @param {number} [time=0] - High-resolution DOM animation timestamp.
	 * @returns {void}
	 */
	function render(time = 0) {
		if (!canvas || !ctx) return;
		const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 480, height: 320 };
		const w = rect.width || 480;
		const h = rect.height || 320;

		playerX += (targetPlayerX - playerX) * 0.22;
		playerY += (targetPlayerY - playerY) * 0.22;

		flickerTime = time * 0.005;
		const flicker = Math.sin(flickerTime * 11) * 3.5 + Math.cos(flickerTime * 17) * 2.0;

		ctx.clearRect(0, 0, w, h);

		const grid = (typeof document !== 'undefined') ? document.getElementById('overworld-grid') : null;
		const gridWrapper = (typeof document !== 'undefined') ? document.getElementById('overworld-grid-wrapper') : null;
		const offsetX = (grid && gridWrapper) ? grid.offsetLeft : 0;
		const offsetY = (grid && gridWrapper) ? grid.offsetTop : 0;

		const { pScreenX, pScreenY } = calculateScreenPlayerCoords(offsetX, offsetY);

		const isSubterranean = dungeonDepth > 0 || activeZoneType === 'CRYPT';
		const ambientDarkness = isSubterranean ? 0.94 : 0.0;

		const emitters = assembleEmitters(pScreenX, pScreenY, flicker, offsetX, offsetY, isSubterranean);

		renderDarknessAndShadows(w, h, ambientDarkness, emitters, offsetX, offsetY);
		renderRadiantAndBevelHighlights(emitters, offsetX, offsetY);

		if (isSubterranean) {
			renderDustMotes(w, h, pScreenX, pScreenY);
		}

		if (typeof requestAnimationFrame !== 'undefined') {
			animFrameId = requestAnimationFrame(render);
		}
	}
	//#endregion

	//#region [SEC-09] Canonical VSRP-001 9-Method Interface & Module Export
	let unsubs = [];

	return {
		/**
		 * Initializes the dynamic lighting driver and binds event subscriptions.
		 * State-mutating lifecycle gateway.
		 * @param {any} bus - Host event bus instance.
		 * @returns {void}
		 */
		init(bus) {
			this.destroy();
			eventBus = bus;
			ensureCanvas();

			if (typeof window !== 'undefined') {
				window.addEventListener('resize', resize);
			}

			if (eventBus && typeof eventBus.subscribe === 'function') {
				unsubs.push(eventBus.subscribe('overworld:step', (payload) => {
					const pos = payload?.pos;
					const depth = payload?.depth ?? pos?.depth;
					if (typeof depth === 'number') {
						dungeonDepth = depth;
					}
					if (pos) {
						targetPlayerX = pos.x;
						targetPlayerY = pos.y;
						activeZoneType = evaluateZone(pos.x, pos.y);
					}
				}), eventBus.subscribe('overworld:map_loaded', ({ map, depth, pos }) => {
					if (Array.isArray(map)) {
						cachedMap = map;
						resize();
					}
					if (typeof depth === 'number') {
						dungeonDepth = depth;
					}
					if (pos) {
						targetPlayerX = pos.x;
						targetPlayerY = pos.y;
					}
					activeZoneType = evaluateZone(targetPlayerX, targetPlayerY);
				}), eventBus.subscribe('combat:sfx', ({ sfx }) => {
					const sx = targetPlayerX * tileW + tileW * 0.5;
					const sy = targetPlayerY * tileH + tileH * 0.5;
					if (sfx === 'SPELL_BOLT') {
						spawnTransientLight(sx, sy, 180, '56, 189, 248', 0.45, 1.4);
					} else if (sfx === 'ATTACK_HIT') {
						spawnTransientLight(sx, sy, 120, '255, 157, 77', 0.25, 1.1);
					} else if (sfx === 'HEAL') {
						spawnTransientLight(sx, sy, 160, '74, 222, 128', 0.6, 1.2);
					}
				}), eventBus.subscribe('overworld:transmute_request', ({ type, playerPos }) => {
					const px = (playerPos?.x || targetPlayerX) * tileW + tileW * 0.5;
					const py = (playerPos?.y || targetPlayerY) * tileH + tileH * 0.5;
					if (type === 'SCORCH') {
						spawnTransientLight(px, py, 220, '239, 68, 68', 0.6, 1.8);
					} else if (type === 'CONSECRATE') {
						spawnTransientLight(px, py, 240, '250, 204, 21', 0.8, 1.5);
					}
				}));
			}

			if (!animFrameId && typeof requestAnimationFrame !== 'undefined') {
				animFrameId = requestAnimationFrame(render);
			}
		},

		/**
		 * Updates the cached map grid and dungeon depth.
		 * State-mutating configuration gateway.
		 * @param {string[][]} map - 2D terrain map matrix.
		 * @param {number} [depth] - Subterranean dungeon depth.
		 * @returns {void}
		 */
		setMap(map, depth) {
			if (Array.isArray(map)) {
				cachedMap = map;
				resize();
			}
			if (typeof depth === 'number') {
				dungeonDepth = depth;
				activeZoneType = evaluateZone(targetPlayerX, targetPlayerY);
			}
		},

		/**
		 * Updates current subterranean dungeon depth level.
		 * State-mutating configuration gateway.
		 * @param {number} depth - Dungeon depth level.
		 * @returns {void}
		 */
		setDepth(depth) {
			if (typeof depth === 'number') {
				dungeonDepth = depth;
				activeZoneType = evaluateZone(targetPlayerX, targetPlayerY);
			}
		},

		/**
		 * Explicitly sets active environmental lighting zone.
		 * State-mutating configuration gateway.
		 * @param {string} zone - Zone identifier ('SURFACE' | 'TOWN' | 'CRYPT').
		 * @returns {void}
		 */
		setZone(zone) {
			activeZoneType = String(zone || 'SURFACE').toUpperCase();
		},

		/**
		 * Updates target player grid position for smooth camera/light interpolation.
		 * State-mutating coordinate update gateway.
		 * @param {number} x - Grid column index.
		 * @param {number} y - Grid row index.
		 * @returns {void}
		 */
		setTargetPosition(x, y) {
			targetPlayerX = x;
			targetPlayerY = y;
			activeZoneType = evaluateZone(x, y);
		},

		/**
		 * Spawns a transient lighting flare at specified world grid coordinates.
		 * State-mutating effect trigger gateway.
		 * @param {number} x - Grid column index.
		 * @param {number} y - Grid row index.
		 * @param {number} radius - Light radius in pixels.
		 * @param {string} colorRgb - RGB color string format.
		 * @param {number} duration - Effect duration in seconds.
		 * @returns {void}
		 */
		spawnFlare(x, y, radius, colorRgb, duration) {
			const sx = x * tileW + tileW * 0.5;
			const sy = y * tileH + tileH * 0.5;
			spawnTransientLight(sx, sy, radius, colorRgb, duration);
		},

		/**
		 * Triggers resizing routines and ensures canvas mount integrity.
		 * State-mutating presentation gateway.
		 * @returns {void}
		 */
		resize() {
			ensureCanvas();
			resize();
		},

		/**
		 * Pauses the animation and lighting render loop.
		 * State-mutating lifecycle gateway.
		 * @returns {void}
		 */
		pause() {
			if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
		},

		/**
		 * Resumes the animation and lighting render loop.
		 * State-mutating lifecycle gateway.
		 * @returns {void}
		 */
		resume() {
			ensureCanvas();
			resize();
			if (!animFrameId && typeof requestAnimationFrame !== 'undefined') {
				animFrameId = requestAnimationFrame(render);
			}
		},

		/**
		 * Returns operational diagnostics and lighting telemetry.
		 * Pure diagnostic accessor gateway.
		 * @returns {LightingDiagnostics} Diagnostic report descriptor.
		 */
		getDiagnostics() {
			return {
				driverId: 'dynamic_lights_driver',
				activeZone: activeZoneType,
				dungeonDepth,
				isSubterranean: dungeonDepth > 0 || activeZoneType === 'CRYPT',
				transientLightCount: transientLights.length,
				hasMap: Boolean(cachedMap),
			};
		},

		/**
		 * Tears down event listeners, cancels animation frames, and removes canvas.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
		destroy() {
			this.pause();
			unsubs.forEach((u) => {
				try {
					if (typeof u === 'function') u();
				} catch (_) { }
			});
			unsubs = [];

			if (typeof window !== 'undefined') {
				window.removeEventListener('resize', resize);
			}
			if (canvas?.parentElement) {
				canvas.remove();
			}
			canvas = null;
			ctx = null;
			eventBus = null;
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightDynamicLights = EmberlightDynamicLights;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightDynamicLights;
}