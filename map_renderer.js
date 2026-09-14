/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: CINEMATIC MAP CANVAS & TILE RENDERER
 * Document Identifier: VSRP-001-MAP-RENDERER-COMPLIANT
 * Governing Protocol:  VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Atlas Caching & Canvas Initializers
 *   [SEC-02] Procedural Terrain Texture Baking
 *   [SEC-03] Atmosphere Particle Pool & Raycast Line of Sight
 *   [SEC-04] Dynamic Lighting, Interaction Bindings & Viewport Resize
 *   [SEC-05] Map Frame Compilation & Cinematic Viewport Rendering
 *   [SEC-06] Canonical 9-Method Peripheral Lifecycle Gateway
 *   [SEC-07] Global Export & Dual-Binding Registration
 * ============================================================================
 */

const EmberlightMapRenderer = (() => {
	//#region [SEC-01] Type Definitions, Atlas Caching & Canvas Initializers
	/**
	 * Configuration options dictionary for the map renderer.
	 * @typedef {Object} MapRendererConfig
	 * @property {boolean} [debug] - Optional debug rendering flag.
	 */

	/**
	 * Camera tracking state structure.
	 * @typedef {Object} MapCameraState
	 * @property {number} x - Current camera pixel X.
	 * @property {number} y - Current camera pixel Y.
	 * @property {number} targetX - Target camera pixel X.
	 * @property {number} targetY - Target camera pixel Y.
	 * @property {number} damping - Camera lerp smoothing factor.
	 */

	/**
	 * Player avatar rendering specification.
	 * @typedef {Object} MapAvatarState
	 * @property {string} phenotype - Character phenotype class token.
	 * @property {string} [weapon] - Equipped weapon item identifier.
	 * @property {string} [armor] - Equipped armor item identifier.
	 */

	/**
	 * Overworld monster or entity instance descriptor.
	 * @typedef {Object} MapEntityState
	 * @property {number} x - Grid column index.
	 * @property {number} y - Grid row index.
	 * @property {string} [color] - Entity sprite fill color.
	 */

	/**
	 * Overworld map working state snapshot.
	 * @typedef {Object} MapSnapshot
	 * @property {string[][]} [map] - 2D grid matrix of terrain characters.
	 * @property {{ x: number, y: number }} [playerPos] - Player grid coordinates.
	 * @property {{ x: number, y: number }} [pos] - Fallback player grid coordinates.
	 * @property {'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | string} [facing] - Avatar facing direction.
	 * @property {MapAvatarState} [avatar] - Player gear and phenotype visual spec.
	 * @property {MapEntityState[]} [entities] - Active map entities.
	 * @property {MapEntityState[]} [monsters] - Fallback active monsters array.
	 * @property {number} [dangerSteps] - Encounter threshold step counter.
	 * @property {number} [dungeonDepth] - Subterranean dungeon depth level.
	 * @property {number} [depth] - Fallback dungeon depth level.
	 * @property {{ x: number, y: number }} [activeQuestTarget] - Quest marker coordinates.
	 * @property {number} [stepAnimFrame] - Walk cycle animation frame index.
	 */

	/**
	 * Normalized action token emitted to host or dispatch callback.
	 * @typedef {Object} MapActionToken
	 * @property {string} type - Action command identifier (e.g., 'CONFIRM').
	 * @property {string} [action] - Secondary action specifier.
	 */

	/**
	 * Operational telemetry and diagnostic report schema.
	 * @typedef {Object} MapDiagnostics
	 * @property {'overworld_renderer'} driverId - Canonical driver registration handle.
	 * @property {'VSRP-001'} protocolVersion - Governing normative protocol.
	 * @property {boolean} configured - Configuration binding status.
	 * @property {boolean} initialized - Initialization lifecycle status.
	 * @property {{ x: number, y: number }} cameraPos - Rounded camera coordinates.
	 * @property {number} cachedAtlasTiles - Count of baked terrain textures in atlas.
	 * @property {number} cachedSprites - Count of cached sprite images.
	 * @property {number} activeAtmosphericParticles - Total particle pool count.
	 * @property {boolean} hasCanvas - Canvas element mount verification flag.
	 */

	/**
	 * Static VSRP-001 capability descriptor schema.
	 * @typedef {Object} MapModuleInfo
	 * @property {string} moduleId - Unique module token.
	 * @property {string} version - Semantic version identifier.
	 * @property {'VSRP-001'} protocolVersion - Governing normative protocol.
	 * @property {string[]} capabilities - Array of registered subsystem capabilities.
	 */

	/**
	 * Viewport rendering context struct for terrain compilation.
	 * @typedef {Object} ViewportContext
	 * @property {number} offsetX - Screen X coordinate offset.
	 * @property {number} offsetY - Screen Y coordinate offset.
	 * @property {number} w - Viewport width in pixels.
	 * @property {number} h - Viewport height in pixels.
	 * @property {number} time - Global simulation time reference.
	 */

	const TILE_SIZE = 32;
	const VIEW_WIDTH = 480;
	const VIEW_HEIGHT = 320;

	// Lifecycle & Configuration State
	let configured = false;
	/** @type {Readonly<MapRendererConfig>} */
	let config = Object.freeze({});
	let initialized = false;

	/** @type {HTMLCanvasElement | any} */
	let canvas = null;
	/** @type {CanvasRenderingContext2D | any} */
	let ctx = null;
	/** @type {number | null} */
	let animFrameId = null;
	let lastTimestamp = 0;
	let globalTime = 0;

	// Cached Snapshot & Dispatch Hook
	/** @type {MapSnapshot | null} */
	let currentSnapshot = null;
	/** @type {function(MapActionToken): void | null} */
	let actionDispatch = null;
	/** @type {any} */
	let eventBusRef = null;
	/** @type {{ x: number, y: number } | null} */
	let targetedTileCoord = null;

	// Damped Camera State (World Pixels)
	/** @type {MapCameraState} */
	const camera = {
		x: 48,
		y: 48,
		targetX: 48,
		targetY: 48,
		damping: 0.18,
	};

	// Cached Viewport Matrix (for screen-to-world coordinate translation)
	let lastViewportState = {
		zoom: 1.0,
		offsetX: 0,
		offsetY: 0,
		rect: { left: 0, top: 0, width: 480, height: 320 },
	};

	// Zero-Allocation Sprite Cache
	/** @type {Map<string, HTMLImageElement | any>} */
	const spriteAtlas = new Map();

	/**
	 * Retrieves or bakes a zero-allocation cached sprite image.
	 * State-mutating cache procedure.
	 *
	 * @param {string} phenotype - Character class identifier.
	 * @param {string} facing - Facing direction ('UP' | 'DOWN' | 'LEFT' | 'RIGHT').
	 * @param {number} frame - Animation frame index.
	 * @param {string} [weapon] - Equipped weapon identifier.
	 * @param {string} [armor] - Equipped armor identifier.
	 * @returns {HTMLImageElement | any | null} Cached or newly requested sprite image element.
	 */
	function getCachedSprite(phenotype, facing, frame, weapon, armor) {
		const key = `${phenotype}_${facing}_${frame}_${weapon || 'NONE'}_${armor || 'NONE'}`;
		if (spriteAtlas.has(key)) {
			return spriteAtlas.get(key);
		}

		const spriteUrl =
			typeof EmberlightSpriteBaker !== 'undefined' &&
				typeof EmberlightSpriteBaker.get === 'function'
				? EmberlightSpriteBaker.get(phenotype, { facing, frame, weapon, armor })
				: null;

		if (!spriteUrl || typeof Image === 'undefined') return null;

		const img = new Image();
		img.src = spriteUrl;
		spriteAtlas.set(key, img);
		return img;
	}

	// Procedural Tile Cache
	/** @type {Map<string, HTMLCanvasElement | any>} */
	const tileAtlas = new Map();

	/**
	 * Creates an offscreen canvas element for procedural texture baking.
	 * Pure DOM utility procedure.
	 *
	 * @param {number} [w=32] - Canvas width in pixels.
	 * @param {number} [h=32] - Canvas height in pixels.
	 * @returns {HTMLCanvasElement | any | null} Offscreen canvas element or null in headless mode.
	 */
	function createOffscreenCanvas(w = TILE_SIZE, h = TILE_SIZE) {
		if (typeof document === 'undefined') return null;
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}
	//#endregion

	//#region [SEC-02] Procedural Terrain Texture Baking
	function drawStoneBlock(renderCtx, s) {
		renderCtx.fillStyle = s.col;
		renderCtx.fillRect(s.x, s.y, s.w, s.h);
		renderCtx.fillStyle = s.hi;
		renderCtx.fillRect(s.x, s.y, s.w, 1);
		renderCtx.fillRect(s.x, s.y, 1, s.h);
		renderCtx.fillStyle = s.sh;
		renderCtx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
		renderCtx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
	}

	function bakeCobblestonePath() {
		const cobbleCanvas = createOffscreenCanvas();
		if (!cobbleCanvas) return;
		const renderCtx = cobbleCanvas.getContext('2d');
		if (!renderCtx) return;
		renderCtx.fillStyle = '#0a0a14';
		renderCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		const stones = [
			{ x: 1, y: 1, w: 14, h: 9, col: '#1a1a2e', hi: '#2d2d4f', sh: '#0f0f1c' },
			{
				x: 16,
				y: 1,
				w: 15,
				h: 11,
				col: '#202038',
				hi: '#36365c',
				sh: '#121221',
			},
			{
				x: 2,
				y: 11,
				w: 13,
				h: 10,
				col: '#161626',
				hi: '#282845',
				sh: '#0d0d17',
			},
			{
				x: 16,
				y: 13,
				w: 14,
				h: 9,
				col: '#1d1d33',
				hi: '#303054',
				sh: '#10101d',
			},
			{
				x: 1,
				y: 22,
				w: 14,
				h: 9,
				col: '#22223b',
				hi: '#38385e',
				sh: '#131322',
			},
			{
				x: 16,
				y: 23,
				w: 15,
				h: 8,
				col: '#181829',
				hi: '#2a2a47',
				sh: '#0e0e19',
			},
		];
		stones.forEach((s) => {
			drawStoneBlock(renderCtx, s);
		});
		tileAtlas.set('PATH', cobbleCanvas);
	}

	function bakeBedrockWall() {
		const wallCanvas = createOffscreenCanvas();
		if (!wallCanvas) return;
		const wallCtx = wallCanvas.getContext('2d');
		if (!wallCtx) return;
		wallCtx.fillStyle = '#0e0e1a';
		wallCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		wallCtx.fillStyle = '#06060c';
		wallCtx.fillRect(0, 26, TILE_SIZE, 6);
		wallCtx.strokeStyle = '#22223b';
		wallCtx.lineWidth = 1.5;
		wallCtx.beginPath();
		wallCtx.moveTo(0, 7);
		wallCtx.lineTo(12, 11);
		wallCtx.lineTo(24, 5);
		wallCtx.lineTo(32, 9);
		wallCtx.moveTo(0, 17);
		wallCtx.lineTo(16, 21);
		wallCtx.lineTo(28, 15);
		wallCtx.lineTo(32, 18);
		wallCtx.stroke();
		wallCtx.fillStyle = '#3a3a5c';
		wallCtx.fillRect(6, 4, 2, 2);
		wallCtx.fillRect(22, 12, 3, 2);
		wallCtx.fillRect(14, 23, 2, 2);
		tileAtlas.set('WALL', wallCanvas);
	}

	function drawWaterWave(renderCtx, shift, baseY, waveFn) {
		renderCtx.beginPath();
		for (let x = 0; x < TILE_SIZE; x++) {
			const y = baseY + waveFn(x, shift);
			if (x === 0) {
				renderCtx.moveTo(x, y);
			} else {
				renderCtx.lineTo(x, y);
			}
		}
		renderCtx.stroke();
	}

	function bakeSingleWaterFrame(f) {
		const waterCanvas = createOffscreenCanvas();
		if (!waterCanvas) return;
		const waterCtx = waterCanvas.getContext('2d');
		if (!waterCtx) return;

		waterCtx.fillStyle = '#020611';
		waterCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		const shift = (f / 4) * Math.PI * 2;

		waterCtx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
		waterCtx.lineWidth = 1.5;
		drawWaterWave(waterCtx, shift, 8, (x, s) => Math.sin(x / 6 + s) * 2.5);

		waterCtx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
		drawWaterWave(waterCtx, shift, 20, (x, s) => Math.cos(x / 5 + s) * 2.5);

		tileAtlas.set(`WATER_${f}`, waterCanvas);
	}

	function bakeWaterFrames() {
		if (typeof document === 'undefined') return;
		for (let f = 0; f < 4; f++) {
			bakeSingleWaterFrame(f);
		}
	}

	function bakeGrassFrames() {
		for (let f = 0; f < 2; f++) {
			const grassCanvas = createOffscreenCanvas();
			if (!grassCanvas) continue;
			const grassCtx = grassCanvas.getContext('2d');
			if (!grassCtx) continue;
			grassCtx.fillStyle = '#061008';
			grassCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
			const sway = f === 0 ? 0 : 2.5;
			grassCtx.strokeStyle = '#22c55e';
			grassCtx.lineWidth = 1.5;
			const tufts = [
				{ x: 6, y: 24, h: 12 },
				{ x: 13, y: 28, h: 14 },
				{ x: 21, y: 22, h: 13 },
				{ x: 27, y: 26, h: 10 },
			];
			tufts.forEach((t) => {
				grassCtx.beginPath();
				grassCtx.moveTo(t.x, t.y);
				grassCtx.quadraticCurveTo(t.x + sway, t.y - t.h * 0.5, t.x + sway * 1.5, t.y - t.h);
				grassCtx.stroke();
			});
			tileAtlas.set(`GRASS_${f}`, grassCanvas);
		}
	}

	function bakeIceAndMiasma() {
		const iceCanvas = createOffscreenCanvas();
		if (iceCanvas) {
			const iceCtx = iceCanvas.getContext('2d');
			if (iceCtx) {
				iceCtx.fillStyle = '#091524';
				iceCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
				iceCtx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
				iceCtx.lineWidth = 1.2;
				iceCtx.beginPath();
				iceCtx.moveTo(4, 8);
				iceCtx.lineTo(16, 16);
				iceCtx.lineTo(28, 12);
				iceCtx.moveTo(8, 24);
				iceCtx.lineTo(20, 20);
				iceCtx.lineTo(26, 28);
				iceCtx.stroke();
				tileAtlas.set('ICE', iceCanvas);
			}
		}

		const miasmaCanvas = createOffscreenCanvas();
		if (miasmaCanvas) {
			const miasmaCtx = miasmaCanvas.getContext('2d');
			if (miasmaCtx) {
				miasmaCtx.fillStyle = '#12071a';
				miasmaCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
				miasmaCtx.fillStyle = 'rgba(192, 132, 252, 0.3)';
				miasmaCtx.beginPath();
				miasmaCtx.arc(16, 16, 13, 0, Math.PI * 2);
				miasmaCtx.fill();
				tileAtlas.set('MIASMA', miasmaCanvas);
			}
		}
	}

	function bakeTownWall() {
		const wallCanvas = createOffscreenCanvas();
		if (!wallCanvas) return;
		const wallCtx = wallCanvas.getContext('2d');
		if (!wallCtx) return;

		// Deep dark foundation
		wallCtx.fillStyle = '#140c06';
		wallCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

		// Warm horizontal wooden planks
		for (let y = 4; y < 28; y += 4) {
			wallCtx.fillStyle = (y % 8 === 0) ? '#965a2a' : '#aa6a35';
			wallCtx.fillRect(2, y, 28, 3.5);
			// Wood grain highlights
			wallCtx.fillStyle = '#b87640';
			wallCtx.fillRect(4, y + 1, 10, 1);
			wallCtx.fillRect(18, y + 1, 8, 1);
		}

		// Dark oak timber framing studs
		wallCtx.fillStyle = '#4a250c';
		wallCtx.fillRect(2, 2, 4, 28); // Left heavy post
		wallCtx.fillRect(26, 2, 4, 28); // Right heavy post
		wallCtx.fillRect(14, 2, 4, 28); // Center beam
		wallCtx.fillRect(2, 2, 28, 3); // Top horizontal beam
		wallCtx.fillRect(2, 27, 28, 3); // Bottom sill

		// Diagonal timber brace
		wallCtx.fillStyle = '#3d1e0a';
		wallCtx.beginPath();
		wallCtx.moveTo(6, 6);
		wallCtx.lineTo(14, 14);
		wallCtx.lineTo(14, 17);
		wallCtx.lineTo(6, 9);
		wallCtx.closePath();
		wallCtx.fill();

		// Iron rivet studs
		wallCtx.fillStyle = '#1e1e1e';
		wallCtx.fillRect(4, 4, 2, 2);
		wallCtx.fillRect(26, 4, 2, 2);
		wallCtx.fillRect(4, 26, 2, 2);
		wallCtx.fillRect(26, 26, 2, 2);
		wallCtx.fillRect(15, 15, 2, 2);

		// Terracotta/timber eave cap
		wallCtx.fillStyle = '#78350f';
		wallCtx.fillRect(0, 0, TILE_SIZE, 3);

		tileAtlas.set('TOWN_WALL', wallCanvas);
	}

	function bakeTownPath() {
		const cobbleCanvas = createOffscreenCanvas();
		if (!cobbleCanvas) return;
		const renderCtx = cobbleCanvas.getContext('2d');
		if (!renderCtx) return;
		renderCtx.fillStyle = '#141320';
		renderCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		const stones = [
			{ x: 1, y: 1, w: 14, h: 9, col: '#2c293e', hi: '#423d5d', sh: '#181624' },
			{ x: 16, y: 1, w: 15, h: 11, col: '#333048', hi: '#4b476b', sh: '#1d1b2b' },
			{ x: 2, y: 11, w: 13, h: 10, col: '#28253a', hi: '#3e3a58', sh: '#161422' },
			{ x: 16, y: 13, w: 14, h: 9, col: '#302d44', hi: '#484366', sh: '#1b1928' },
			{ x: 1, y: 22, w: 14, h: 9, col: '#35324c', hi: '#4f4b71', sh: '#1f1d2e' },
			{ x: 16, y: 23, w: 15, h: 8, col: '#2a273c', hi: '#403c5b', sh: '#171523' },
		];
		stones.forEach((s) => {
			drawStoneBlock(renderCtx, s);
		});
		tileAtlas.set('TOWN_PATH', cobbleCanvas);
	}

	function bakeTownGate() {
		const gateCanvas = createOffscreenCanvas();
		if (!gateCanvas) return;
		const ctx = gateCanvas.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = '#0a0a14';
		ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		// Stone pillars
		ctx.fillStyle = '#334155';
		ctx.fillRect(1, 2, 7, 28);
		ctx.fillRect(24, 2, 7, 28);
		ctx.fillStyle = '#64748b';
		ctx.fillRect(0, 0, TILE_SIZE, 6);
		// Archway opening
		ctx.fillStyle = '#181410';
		ctx.fillRect(8, 6, 16, 26);
		// Iron portcullis teeth
		ctx.fillStyle = '#94a3b8';
		for (let x = 9; x <= 22; x += 3) {
			ctx.fillRect(x, 6, 1.5, 18);
		}
		ctx.fillRect(8, 12, 16, 1.5);
		// Golden warning torches
		ctx.fillStyle = '#f59e0b';
		ctx.fillRect(3, 10, 3, 5);
		ctx.fillRect(26, 10, 3, 5);
		tileAtlas.set('TOWN_GATE', gateCanvas);
	}

	/**
	 * Pre-renders procedural textures for all terrain tiles.
	 * State-mutating texture atlas baking procedure.
	 *
	 * @returns {void}
	 */
	function bakeTerrainTextures() {
		if (typeof document === 'undefined') return;
		bakeCobblestonePath();
		bakeBedrockWall();
		bakeTownWall();
		bakeTownPath();
		bakeTownGate();
		bakeWaterFrames();
		bakeGrassFrames();
		bakeIceAndMiasma();
	}
	//#endregion

	//#region [SEC-03] Atmosphere Particle Pool & Raycast Line of Sight
	const PARTICLE_COUNT = 64;
	const particlePool = new Float32Array(PARTICLE_COUNT * 7);
	let particleNoiseSeed = 1337;

	/**
	 * Generates deterministic pseudorandom floats via LCG algorithm.
	 * State-mutating math utility procedure.
	 *
	 * @returns {number} Normalized float in [0, 1).
	 */
	function nextParticleFloat() {
		particleNoiseSeed = (particleNoiseSeed * 1664525 + 1013904223) >>> 0;
		return particleNoiseSeed / 4294967296;
	}

	/**
	 * Populates particle pool buffers with initial positions and velocities.
	 * State-mutating particle initialization procedure.
	 *
	 * @returns {void}
	 */
	function initParticles() {
		particleNoiseSeed = 1337;
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const idx = i * 7;
			let type = 0;
			if (nextParticleFloat() > 0.6) {
				type = nextParticleFloat() > 0.5 ? 2 : 1;
			}
			particlePool[idx] = (nextParticleFloat() - 0.5) * 600;
			particlePool[idx + 1] = (nextParticleFloat() - 0.5) * 400;
			particlePool[idx + 2] = (nextParticleFloat() - 0.5) * 12;
			particlePool[idx + 3] =
				type === 0 ? -8 - nextParticleFloat() * 10 : -2 - nextParticleFloat() * 4;
			particlePool[idx + 4] =
				type === 0 ? 1.5 + nextParticleFloat() * 2 : 1 + nextParticleFloat() * 1.5;
			particlePool[idx + 5] = 0.2 + nextParticleFloat() * 0.6;
			particlePool[idx + 6] = type;
		}
	}

	/**
	 * Advances and renders atmospheric floating dust and ember particles.
	 * State-mutating canvas render procedure.
	 *
	 * @param {CanvasRenderingContext2D | any} renderCtx - Target 2D canvas context.
	 * @param {number} w - Viewport canvas width.
	 * @param {number} h - Viewport canvas height.
	 * @param {number} dt - Elapsed frame delta time in seconds.
	 * @returns {void}
	 */
	function updateAndRenderAtmosphere(renderCtx, w, h, dt) {
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const idx = i * 7;
			const type = particlePool[idx + 6];

			const drift = Math.sin(globalTime * 2 + i) * 15 * dt;
			particlePool[idx] += (particlePool[idx + 2] + drift) * dt;
			particlePool[idx + 1] += particlePool[idx + 3] * dt;

			if (particlePool[idx + 1] < -h / 2) {
				particlePool[idx + 1] = h / 2;
				particlePool[idx] = (nextParticleFloat() - 0.5) * w;
			}
			if (particlePool[idx] < -w / 2) particlePool[idx] = w / 2;
			if (particlePool[idx] > w / 2) particlePool[idx] = -w / 2;

			const screenX = w / 2 + particlePool[idx];
			const screenY = h / 2 + particlePool[idx + 1];
			const size = particlePool[idx + 4];

			renderCtx.globalAlpha = particlePool[idx + 5] * (0.8 + Math.sin(globalTime * 4 + i) * 0.2);

			if (type === 0) {
				renderCtx.fillStyle = '#f59e0b';
				renderCtx.fillRect(screenX, screenY, size, size);
			} else if (type === 1) {
				renderCtx.fillStyle = '#94a3b8';
				renderCtx.fillRect(screenX, screenY, size * 0.8, size * 0.8);
			} else {
				renderCtx.fillStyle = '#38bdf8';
				renderCtx.beginPath();
				renderCtx.arc(screenX, screenY, size * 0.9, 0, Math.PI * 2);
				renderCtx.fill();
			}
		}
		renderCtx.globalAlpha = 1.0;
	}

	/**
	 * Computes line of sight visibility coordinates from player position.
	 * Pure mathematical calculation procedure.
	 *
	 * @param {string[][]} map - 2D terrain grid matrix.
	 * @param {number} px - Player grid column position.
	 * @param {number} py - Player grid row position.
	 * @param {number} [radius=7] - Maximum vision radius in tiles.
	 * @returns {Set<string>} Set of visible coordinate strings ('x,y').
	 */
	function computeLineOfSight(map, px, py, radius = 7) {
		const visible = new Set();
		const height = map.length;
		if (height === 0) return visible;
		const width = map[0].length;

		visible.add(`${px},${py}`);

		const steps = 48;
		for (let i = 0; i < steps; i++) {
			const angle = (i / steps) * Math.PI * 2;
			const dx = Math.cos(angle);
			const dy = Math.sin(angle);

			let cx = px + 0.5;
			let cy = py + 0.5;

			for (let step = 0; step < radius * 2; step++) {
				cx += dx * 0.5;
				cy += dy * 0.5;
				const tx = Math.floor(cx);
				const ty = Math.floor(cy);

				if (tx < 0 || tx >= width || ty < 0 || ty >= height) break;
				visible.add(`${tx},${ty}`);

				if (map[ty][tx] === '#') {
					break;
				}
			}
		}
		return visible;
	}
	//#endregion

	//#region [SEC-04] Dynamic Lighting, Interaction Bindings & Viewport Resize
	/**
	 * Renders radial lantern lighting around the player avatar.
	 * State-mutating canvas render procedure.
	 *
	 * @param {CanvasRenderingContext2D | any} renderCtx - Target 2D canvas context.
	 * @param {number} w - Viewport canvas width.
	 * @param {number} h - Viewport canvas height.
	 * @param {number} playerScreenX - Player avatar screen X pixel position.
	 * @param {number} playerScreenY - Player avatar screen Y pixel position.
	 * @returns {void}
	 */
	function renderDynamicLighting(renderCtx, w, h, playerScreenX, playerScreenY) {
		if (typeof renderCtx.createRadialGradient !== 'function') return;

		const lanternGlow = renderCtx.createRadialGradient(
			playerScreenX + 14,
			playerScreenY + 14,
			12,
			playerScreenX + 14,
			playerScreenY + 14,
			140
		);
		lanternGlow.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
		lanternGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
		lanternGlow.addColorStop(1, 'rgba(4, 4, 12, 0)');

		renderCtx.fillStyle = lanternGlow;
		renderCtx.fillRect(0, 0, w, h);
	}

	function resolveGlobalEventBus() {
		if (eventBusRef) return eventBusRef;
		if (typeof EmberlightEventBus !== 'undefined') return EmberlightEventBus;
		if (typeof window !== 'undefined' && /** @type {any} */ (window).EmberlightEventBus) {
			return /** @type {any} */ (window).EmberlightEventBus;
		}
		if (typeof globalThis !== 'undefined' && /** @type {any} */ (globalThis).EmberlightEventBus) {
			return /** @type {any} */ (globalThis).EmberlightEventBus;
		}
		return null;
	}

	/**
	 * Binds mouse hover, leave, and click interaction handlers to the canvas.
	 * State-mutating DOM event attachment procedure.
	 *
	 * @param {HTMLCanvasElement | any} targetCanvas - Target canvas element.
	 * @returns {void}
	 */
	function attachCanvasInteractions(targetCanvas) {
		if (
			!targetCanvas ||
			targetCanvas._eventsAttached ||
			typeof targetCanvas.addEventListener !== 'function'
		)
			return;

		targetCanvas.addEventListener('mousemove', (e) => {
			if (!currentSnapshot || !canvas) return;
			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const offsetX = Math.floor(rect.width / 2 - camera.x);
			const offsetY = Math.floor(rect.height / 2 - camera.y);

			const tileX = Math.floor((mouseX - offsetX) / TILE_SIZE);
			const tileY = Math.floor((mouseY - offsetY) / TILE_SIZE);

			const map = currentSnapshot.map || [];
			if (tileY >= 0 && tileY < map.length && tileX >= 0 && tileX < (map[0]?.length || 0)) {
				const tileType = map[tileY][tileX];
				const isPlayer =
					tileX === currentSnapshot.playerPos?.x && tileY === currentSnapshot.playerPos?.y;
				const bus = resolveGlobalEventBus();
				if (bus && typeof bus.publish === 'function') {
					bus.publish('overworld:hover_tile', {
						x: tileX,
						y: tileY,
						tileType,
						isPlayer,
						isClear: false,
					});
				}
			}
		});

		targetCanvas.addEventListener('mouseleave', () => {
			const bus = resolveGlobalEventBus();
			if (bus && typeof bus.publish === 'function') {
				bus.publish('overworld:hover_tile', { isClear: true });
			}
		});

		targetCanvas.addEventListener('click', () => {
			const bus = resolveGlobalEventBus();
			if (bus && typeof bus.publish === 'function') {
				bus.publish('input:action', { action: 'CONFIRM' });
			}
			if (typeof actionDispatch === 'function') {
				actionDispatch({ type: 'CONFIRM' });
			}
		});

		targetCanvas._eventsAttached = true;
	}

	/**
	 * Ensures the map canvas element is mounted and attached to the DOM wrapper.
	 * State-mutating DOM initialization procedure.
	 *
	 * @returns {void}
	 */
	function ensureCanvas() {
		if (typeof document === 'undefined') return;
		if (canvas?.parentElement) return;

		const wrapper = document.getElementById('overworld-grid-wrapper');
		if (!wrapper) return;

		wrapper.style.position = 'relative';
		wrapper.style.overflow = 'hidden';

		const legacyGrid = document.getElementById('overworld-grid');
		if (legacyGrid) legacyGrid.style.display = 'none';

		canvas = document.getElementById('map-renderer-canvas');
		if (!canvas) {
			canvas = document.createElement('canvas');
			canvas.id = 'map-renderer-canvas';
			canvas.style.display = 'block';
			canvas.style.width = '100%';
			canvas.style.height = '100%';
			canvas.style.imageRendering = 'pixelated';
			wrapper.appendChild(canvas);
		}

		ctx = canvas.getContext('2d');
		attachCanvasInteractions(canvas);
		resize();
	}

	/**
	 * Resizes canvas internal resolution to match parent bounding box and DPR.
	 * State-mutating presentation procedure.
	 *
	 * @returns {void}
	 */
	function resize() {
		if (!canvas?.parentElement || !ctx) return;
		const rect = canvas.parentElement.getBoundingClientRect();
		const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const w = Math.max(VIEW_WIDTH, Math.floor(rect.width || VIEW_WIDTH));
		const h = Math.max(VIEW_HEIGHT, Math.floor(rect.height || VIEW_HEIGHT));
		canvas.width = Math.floor(w * dpr);
		canvas.height = Math.floor(h * dpr);
		if (typeof ctx.setTransform === 'function') {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);
		}
	}

	/**
	 * Updates the overworld hazard/encounter threat gauge DOM width and color.
	 * State-mutating DOM presentation procedure.
	 *
	 * @param {MapSnapshot} snapshot - Active overworld snapshot.
	 * @returns {void}
	 */
	function updateThreatGauge(snapshot) {
		if (typeof document === 'undefined') return;
		const threatBar = document.getElementById('overworld-threat-gauge');
		if (threatBar) {
			const threatPct = Math.min(100, Math.round(((snapshot.dangerSteps || 0) / 5) * 100));
			threatBar.style.width = `${threatPct}%`;
			threatBar.style.backgroundColor = threatPct > 60 ? 'var(--danger)' : 'var(--ember)';
		}
	}

	/**
	 * Toggles subterranean catacomb visual styling classes on the grid wrapper.
	 * State-mutating DOM presentation procedure.
	 *
	 * @param {MapSnapshot} snapshot - Active overworld snapshot.
	 * @returns {void}
	 */
	function updateCatacombMode(snapshot) {
		if (typeof document === 'undefined') return;
		const isCatacombs = Boolean(
			(snapshot.dungeonDepth && snapshot.dungeonDepth > 0) || (snapshot.depth && snapshot.depth > 0)
		);
		const gridWrapper = document.getElementById('overworld-grid-wrapper');
		if (gridWrapper) {
			gridWrapper.classList.toggle('catacomb-mode', isCatacombs);
		}
	}
	//#endregion

	//#region [SEC-05] Map Frame Compilation & Cinematic Viewport Rendering
	function updateCameraPosition(playerPos, map, w, h) {
		const mapCols = map[0]?.length || 48;
		const mapRows = map.length || 32;
		const worldPixelWidth = mapCols * TILE_SIZE;
		const worldPixelHeight = mapRows * TILE_SIZE;

		const halfViewW = w / 2;
		const halfViewH = h / 2;

		if (worldPixelWidth <= w) {
			camera.targetX = worldPixelWidth / 2;
			camera.x = worldPixelWidth / 2;
		} else {
			camera.targetX = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
			camera.x += (camera.targetX - camera.x) * camera.damping;
			camera.x = Math.max(halfViewW, Math.min(worldPixelWidth - halfViewW, camera.x));
		}

		if (worldPixelHeight <= h) {
			camera.targetY = worldPixelHeight / 2;
			camera.y = worldPixelHeight / 2;
		} else {
			camera.targetY = playerPos.y * TILE_SIZE + TILE_SIZE / 2;
			camera.y += (camera.targetY - camera.y) * camera.damping;
			camera.y = Math.max(halfViewH, Math.min(worldPixelHeight - halfViewH, camera.y));
		}
	}

	function drawTileSpecialFeatures(renderCtx, tile, screenX, screenY) {
		if (tile === 'C') {
			renderCtx.fillStyle = '#f59e0b';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 7 + Math.sin(globalTime * 8) * 2, 0, Math.PI * 2);
			renderCtx.fill();
		} else if (tile === '$') {
			renderCtx.fillStyle = '#d97706';
			renderCtx.fillRect(screenX + 8, screenY + 10, 16, 12);
			renderCtx.strokeStyle = '#fbbf24';
			renderCtx.strokeRect(screenX + 8, screenY + 10, 16, 12);
		} else if (tile === 'H') {
			// The Hearth Inn — cozy golden beacon and timber roof
			renderCtx.fillStyle = 'rgba(245, 158, 11, 0.25)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 12 + Math.sin(globalTime * 4) * 2, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#78350f';
			renderCtx.fillRect(screenX + 6, screenY + 11, 20, 15);
			renderCtx.fillStyle = '#fbbf24';
			renderCtx.fillRect(screenX + 13, screenY + 15, 6, 8);
			renderCtx.fillStyle = '#b45309';
			renderCtx.beginPath();
			renderCtx.moveTo(screenX + 4, screenY + 11);
			renderCtx.lineTo(screenX + 16, screenY + 3);
			renderCtx.lineTo(screenX + 28, screenY + 11);
			renderCtx.closePath();
			renderCtx.fill();
		} else if (tile === 'N') {
			// Town Notice Board — wooden post with double parchment notices
			renderCtx.fillStyle = '#78350f';
			renderCtx.fillRect(screenX + 14, screenY + 18, 4, 12);
			renderCtx.fillStyle = '#92400e';
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 14);
			renderCtx.fillStyle = '#fef3c7';
			renderCtx.fillRect(screenX + 8, screenY + 8, 6, 9);
			renderCtx.fillRect(screenX + 17, screenY + 8, 6, 9);
		} else if (tile === 'A') {
			// Ancient Aether Shrine — glowing celestial monolith
			const pulse = Math.sin(globalTime * 5) * 2.5;
			renderCtx.fillStyle = 'rgba(56, 189, 248, 0.3)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 13 + pulse, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#0f172a';
			renderCtx.fillRect(screenX + 8, screenY + 6, 16, 20);
			renderCtx.strokeStyle = '#38bdf8';
			renderCtx.lineWidth = 1.5;
			renderCtx.strokeRect(screenX + 8, screenY + 6, 16, 20);
			renderCtx.fillStyle = '#7dd3fc';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 14, 4, 0, Math.PI * 2);
			renderCtx.fill();
		} else if (tile === '*') {
			// Resource Cache — shimmering emerald diamond glint
			const sparkle = Math.sin(globalTime * 7) * 2;
			renderCtx.fillStyle = 'rgba(52, 211, 153, 0.25)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 10 + sparkle, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#34d399';
			renderCtx.beginPath();
			renderCtx.moveTo(screenX + 16, screenY + 8);
			renderCtx.lineTo(screenX + 23, screenY + 16);
			renderCtx.lineTo(screenX + 16, screenY + 24);
			renderCtx.lineTo(screenX + 9, screenY + 16);
			renderCtx.closePath();
			renderCtx.fill();
			renderCtx.strokeStyle = '#a7f3d0';
			renderCtx.stroke();
		} else if (tile === 'E') {
			// Elder Rowan — cloaked sage figure with golden wisdom halo
			renderCtx.fillStyle = 'rgba(234, 179, 8, 0.2)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 11, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#0369a1';
			renderCtx.fillRect(screenX + 10, screenY + 12, 12, 14);
			renderCtx.fillStyle = '#fef08a';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 9, 4, 0, Math.PI * 2);
			renderCtx.fill();
		} else if (tile === 'D') {
			// Oakhaven Town Archway
			renderCtx.fillStyle = '#334155';
			renderCtx.fillRect(screenX + 4, screenY + 4, 8, 24);
			renderCtx.fillRect(screenX + 20, screenY + 4, 8, 24);
			renderCtx.fillStyle = '#64748b';
			renderCtx.fillRect(screenX + 4, screenY + 4, 24, 6);
		} else if (tile === 'S') {
			// Catacombs Crypt Gate — pulsing void violet gateway
			renderCtx.fillStyle = 'rgba(168, 85, 247, 0.3)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 13 + Math.sin(globalTime * 6) * 2, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#1e1b4b';
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.strokeStyle = '#c084fc';
			renderCtx.lineWidth = 1.5;
			renderCtx.strokeRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.fillStyle = '#581c87';
			renderCtx.fillRect(screenX + 10, screenY + 10, 12, 12);
		} else if (tile === 'V') {
			// Afflicted Villager / Traveler — hooded figure in purple tunic
			renderCtx.fillStyle = 'rgba(168, 85, 247, 0.2)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 10, 0, Math.PI * 2);
			renderCtx.fill();
			// Torso / Tunic
			renderCtx.fillStyle = '#6b21a8';
			renderCtx.fillRect(screenX + 10, screenY + 13, 12, 13);
			// Hood / Head
			renderCtx.fillStyle = '#c084fc';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 10, 4.5, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#fed7aa';
			renderCtx.fillRect(screenX + 14, screenY + 10, 4, 3);
		} else if (tile === 'G') {
			// Gate Captain Kael / Armored Guard — steel helm, cobalt tabard & shield
			renderCtx.fillStyle = 'rgba(59, 130, 246, 0.25)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 11, 0, Math.PI * 2);
			renderCtx.fill();
			// Armor body
			renderCtx.fillStyle = '#1e3a8a';
			renderCtx.fillRect(screenX + 10, screenY + 12, 12, 14);
			// Steel Helmet
			renderCtx.fillStyle = '#94a3b8';
			renderCtx.fillRect(screenX + 11, screenY + 6, 10, 8);
			renderCtx.fillStyle = '#f59e0b';
			renderCtx.fillRect(screenX + 13, screenY + 9, 6, 2); // visor
			// Shield
			renderCtx.fillStyle = '#cbd5e1';
			renderCtx.fillRect(screenX + 6, screenY + 12, 4, 12);
			renderCtx.strokeStyle = '#3b82f6';
			renderCtx.lineWidth = 1;
			renderCtx.strokeRect(screenX + 6, screenY + 12, 4, 12);
		} else if (tile === '@') {
			// Merchant Caravan / Pack Camel — camel silhouette with cargo bundles
			renderCtx.fillStyle = 'rgba(217, 119, 6, 0.2)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 12, 0, Math.PI * 2);
			renderCtx.fill();
			// Camel body
			renderCtx.fillStyle = '#b45309';
			renderCtx.fillRect(screenX + 7, screenY + 12, 18, 12);
			// Cargo pack
			renderCtx.fillStyle = '#f59e0b';
			renderCtx.fillRect(screenX + 11, screenY + 7, 10, 8);
			renderCtx.strokeStyle = '#78350f';
			renderCtx.lineWidth = 1;
			renderCtx.strokeRect(screenX + 11, screenY + 7, 10, 8);
			// Neck & head
			renderCtx.fillStyle = '#b45309';
			renderCtx.fillRect(screenX + 22, screenY + 6, 5, 10);
			renderCtx.fillRect(screenX + 24, screenY + 4, 6, 5);
		} else if (tile === 'B') {
			// Blacksmith Forge / Armory — glowing anvil and forge hearth
			renderCtx.fillStyle = 'rgba(239, 68, 68, 0.25)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 12 + Math.sin(globalTime * 5) * 2, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#451a03';
			renderCtx.fillRect(screenX + 6, screenY + 10, 20, 16);
			renderCtx.fillStyle = '#ef4444';
			renderCtx.fillRect(screenX + 12, screenY + 14, 8, 8);
			renderCtx.fillStyle = '#fbbf24';
			renderCtx.fillRect(screenX + 14, screenY + 16, 4, 4);
		} else if (tile === 'F') {
			// Relic Crucible / Arcane Forge — spinning arcane crucible
			const runePulse = Math.sin(globalTime * 6) * 2;
			renderCtx.fillStyle = 'rgba(168, 85, 247, 0.3)';
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 11 + runePulse, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = '#312e81';
			renderCtx.fillRect(screenX + 8, screenY + 8, 16, 16);
			renderCtx.strokeStyle = '#a855f7';
			renderCtx.lineWidth = 1.5;
			renderCtx.strokeRect(screenX + 8, screenY + 8, 16, 16);
		} else if (tile === 'P') {
			// Portcullis Locked — heavy iron gate
			renderCtx.fillStyle = '#0f172a';
			renderCtx.fillRect(screenX + 2, screenY + 2, 28, 28);
			renderCtx.fillStyle = '#94a3b8';
			for (let gx = screenX + 5; gx <= screenX + 25; gx += 4) {
				renderCtx.fillRect(gx, screenY + 4, 2, 24);
			}
			renderCtx.fillRect(screenX + 3, screenY + 12, 26, 2.5);
			renderCtx.fillRect(screenX + 3, screenY + 20, 26, 2.5);
		} else if (tile === '/') {
			// Portcullis Open — raised gate
			renderCtx.fillStyle = '#0f172a';
			renderCtx.fillRect(screenX + 2, screenY + 2, 28, 6);
			renderCtx.fillStyle = '#64748b';
			renderCtx.fillRect(screenX + 4, screenY + 2, 24, 4);
		} else if (tile === '_') {
			// Stone Pressure Plate
			renderCtx.fillStyle = '#334155';
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.fillStyle = '#38bdf8';
			renderCtx.fillRect(screenX + 11, screenY + 11, 10, 10);
		} else if (tile === '>') {
			renderCtx.fillStyle = '#1e1b4b';
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.strokeStyle = '#a855f7';
			renderCtx.strokeRect(screenX + 6, screenY + 6, 20, 20);
		} else if (tile === '<') {
			renderCtx.fillStyle = '#0f172a';
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.strokeStyle = '#38bdf8';
			renderCtx.strokeRect(screenX + 6, screenY + 6, 20, 20);
		}
	}

	function drawTile(renderCtx, tile, screenX, screenY, waterFrame, grassFrame, isTown = false) {
		let tileImg = null;
		if (tile === '.') tileImg = tileAtlas.get(isTown ? 'TOWN_PATH' : 'PATH');
		else if (tile === '#') tileImg = tileAtlas.get(isTown ? 'TOWN_WALL' : 'WALL');
		else if (tile === 'O' || (isTown && tile === 'D')) tileImg = tileAtlas.get('TOWN_GATE');
		else if (tile === '~') tileImg = tileAtlas.get(`WATER_${waterFrame}`);
		else if (tile === '"') tileImg = tileAtlas.get(`GRASS_${grassFrame}`);
		else if (tile === '=') tileImg = tileAtlas.get('ICE');
		else if (tile === '%') tileImg = tileAtlas.get('MIASMA');
		else tileImg = tileAtlas.get(isTown ? 'TOWN_PATH' : 'PATH');

		if (tileImg) {
			renderCtx.drawImage(tileImg, screenX, screenY, TILE_SIZE, TILE_SIZE);
		} else {
			renderCtx.fillStyle = '#0c0c16';
			renderCtx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
		}

		drawTileSpecialFeatures(renderCtx, tile, screenX, screenY);
	}

	/**
	 * Renders terrain layer tiles within viewport bounds.
	 * State-mutating canvas render procedure.
	 *
	 * @param {CanvasRenderingContext2D | any} renderCtx - Target 2D canvas context.
	 * @param {string[][]} map - Terrain grid matrix.
	 * @param {Set<string>} visibleTiles - Line of sight coordinate set.
	 * @param {ViewportContext & { isTown?: boolean }} viewport - Viewport dimensions and offset struct.
	 * @returns {void}
	 */
	function renderTerrainLayer(renderCtx, map, visibleTiles, viewport) {
		const { offsetX, offsetY, w, h, time, isTown } = viewport;
		const waterFrame = Math.floor(time * 6) % 4;
		const grassFrame = Math.floor(time * 3) % 2;

		for (let y = 0; y < map.length; y++) {
			for (let x = 0; x < map[y].length; x++) {
				const screenX = offsetX + x * TILE_SIZE;
				const screenY = offsetY + y * TILE_SIZE;

				if (screenX < -TILE_SIZE || screenX > w || screenY < -TILE_SIZE || screenY > h) {
					continue;
				}

				const isVisible = visibleTiles.has(`${x},${y}`);
				const tile = map[y][x];
				drawTile(renderCtx, tile, screenX, screenY, waterFrame, grassFrame, Boolean(isTown));

				if (!isVisible) {
					renderCtx.fillStyle = 'rgba(2, 2, 8, 0.82)';
					renderCtx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
				}
			}
		}
	}

	function renderQuestTargetLine(renderCtx, snapshot, offsetX, offsetY, w, h) {
		if (!snapshot.activeQuestTarget) return;
		const qTarget = snapshot.activeQuestTarget;
		const qScreenX = offsetX + qTarget.x * TILE_SIZE + 16;
		const qScreenY = offsetY + qTarget.y * TILE_SIZE + 16;
		renderCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
		renderCtx.lineWidth = 1.5;
		if (typeof renderCtx.setLineDash === 'function') {
			renderCtx.setLineDash([4, 4]);
		}
		renderCtx.beginPath();
		renderCtx.moveTo(w / 2, h / 2);
		renderCtx.lineTo(qScreenX, qScreenY);
		renderCtx.stroke();
		if (typeof renderCtx.setLineDash === 'function') {
			renderCtx.setLineDash([]);
		}
	}

	function renderEntitiesLayer(renderCtx, snapshot, visibleTiles, offsetX, offsetY) {
		const playerPos = snapshot.playerPos || snapshot.pos || { x: 1, y: 1 };
		const facing = snapshot.facing || 'DOWN';
		const avatar = snapshot.avatar || {
			phenotype: 'HERO',
			weapon: 'IRON_SWORD',
			armor: null,
		};
		const entities = snapshot.entities || snapshot.monsters || [];

		const drawList = [];
		const pScreenX = Math.floor(offsetX + playerPos.x * TILE_SIZE + 2);
		const pScreenY = Math.floor(offsetY + playerPos.y * TILE_SIZE - 2);

		drawList.push({
			y: pScreenY + 28,
			render: () => {
				renderCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
				renderCtx.beginPath();
				renderCtx.ellipse(pScreenX + 14, pScreenY + 28, 9, 4, 0, 0, Math.PI * 2);
				renderCtx.fill();

				const heroImg = getCachedSprite(
					avatar.phenotype || 'HERO',
					facing,
					snapshot.stepAnimFrame || 0,
					avatar.weapon,
					avatar.armor
				);
				if (heroImg?.complete) {
					renderCtx.drawImage(heroImg, pScreenX, pScreenY, 28, 28);
				} else {
					renderCtx.fillStyle = '#ff9d4d';
					renderCtx.fillRect(pScreenX + 6, pScreenY + 6, 16, 16);
				}
			},
		});

		entities.forEach((ent) => {
			if (!visibleTiles.has(`${ent.x},${ent.y}`)) return;
			const eScreenX = Math.floor(offsetX + ent.x * TILE_SIZE + 2);
			const eScreenY = Math.floor(offsetY + ent.y * TILE_SIZE - 2);
			drawList.push({
				y: eScreenY + 28,
				render: () => {
					renderCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
					renderCtx.beginPath();
					renderCtx.ellipse(eScreenX + 14, eScreenY + 28, 8, 3.5, 0, 0, Math.PI * 2);
					renderCtx.fill();

					renderCtx.fillStyle = ent.color || '#ef4444';
					renderCtx.fillRect(eScreenX + 6, eScreenY + 6, 16, 16);
				},
			});
		});

		drawList.sort((a, b) => a.y - b.y);
		for (const item of drawList) {
			item.render();
		}

		return { pScreenX, pScreenY };
	}

	function renderVignetteOverlay(renderCtx, w, h) {
		if (typeof renderCtx.createRadialGradient !== 'function') return;
		const vignette = renderCtx.createRadialGradient(
			w / 2,
			h / 2,
			Math.min(w, h) * 0.35,
			w / 2,
			h / 2,
			Math.max(w, h) * 0.75
		);
		vignette.addColorStop(0, 'rgba(4, 4, 12, 0)');
		vignette.addColorStop(0.7, 'rgba(4, 4, 12, 0.35)');
		vignette.addColorStop(1, 'rgba(2, 2, 8, 0.88)');
		renderCtx.fillStyle = vignette;
		renderCtx.fillRect(0, 0, w, h);
	}

	/**
	 * Compiles and renders a complete overworld map frame, entities, and lighting.
	 * State-mutating canvas render procedure.
	 *
	 * @param {number} [dt=0.016] - Elapsed frame delta time in seconds.
	 * @returns {void}
	 */
	function renderMapFrame(dt = 0.016) {
		if (!canvas || !ctx || !currentSnapshot) return;
		const rect = canvas.parentElement?.getBoundingClientRect() || {
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT,
		};
		const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const w = Math.max(VIEW_WIDTH, Math.floor(rect.width || VIEW_WIDTH));
		const h = Math.max(VIEW_HEIGHT, Math.floor(rect.height || VIEW_HEIGHT));

		// Auto-synchronize internal buffer resolution to matching visible DOM dimensions and DPR
		const expectedCanvasW = Math.floor(w * dpr);
		const expectedCanvasH = Math.floor(h * dpr);
		if (canvas.width !== expectedCanvasW || canvas.height !== expectedCanvasH) {
			canvas.width = expectedCanvasW;
			canvas.height = expectedCanvasH;
			if (typeof ctx.setTransform === 'function') {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.scale(dpr, dpr);
			}
		}

		const map = currentSnapshot.map || [];
		const playerPos = currentSnapshot.playerPos || currentSnapshot.pos || { x: 1, y: 1 };
		const mapCols = map[0]?.length || 15;
		const mapRows = map.length || 11;

		const mapPixelW = mapCols * TILE_SIZE;
		const mapPixelH = mapRows * TILE_SIZE;

		// Target tactical viewing window: ensure at least ~22 tiles visible across, or ~15 tiles vertically
		// If the viewport is compact (windowed mode), zoom scales down to 0.55–0.70 so the world map doesn't feel cramped.
		// If the map is small (e.g. 12x10 dungeon), zoom scales up to 1.35–1.50 to comfortably fill the screen.
		const targetCols = Math.min(mapCols, 24);
		const targetRows = Math.min(mapRows, 16);
		const desiredPixelW = targetCols * TILE_SIZE;
		const desiredPixelH = targetRows * TILE_SIZE;

		let zoom = 1.0;
		if (w > 0 && h > 0 && desiredPixelW > 0 && desiredPixelH > 0) {
			const scaleX = w / desiredPixelW;
			const scaleY = h / desiredPixelH;
			zoom = Math.max(0.55, Math.min(1.5, Math.min(scaleX, scaleY)));
		}

		const effectiveW = w / zoom;
		const effectiveH = h / zoom;

		updateCameraPosition(playerPos, map, effectiveW, effectiveH);
		const offsetX = Math.floor(effectiveW / 2 - camera.x);
		const offsetY = Math.floor(effectiveH / 2 - camera.y);

		lastViewportState = {
			zoom,
			offsetX,
			offsetY,
			rect: {
				left: rect.left || 0,
				top: rect.top || 0,
				width: w,
				height: h,
				right: (rect.left || 0) + w,
				bottom: (rect.top || 0) + h,
			},
		};

		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = '#020206';
		ctx.fillRect(0, 0, w, h);

		const visibleTiles = computeLineOfSight(map, playerPos.x, playerPos.y, 7);

		ctx.save();
		ctx.scale(zoom, zoom);

		const isTown = Boolean(currentSnapshot.townId || currentSnapshot.pos?.inTown || currentSnapshot.playerPos?.inTown);

		renderTerrainLayer(ctx, map, visibleTiles, {
			offsetX,
			offsetY,
			w: effectiveW,
			h: effectiveH,
			time: globalTime,
			isTown,
		});
		renderQuestTargetLine(ctx, currentSnapshot, offsetX, offsetY, effectiveW, effectiveH);

		const { pScreenX, pScreenY } = renderEntitiesLayer(
			ctx,
			currentSnapshot,
			visibleTiles,
			offsetX,
			offsetY
		);

		if (targetedTileCoord) {
			const tx = offsetX + targetedTileCoord.x * TILE_SIZE;
			const ty = offsetY + targetedTileCoord.y * TILE_SIZE;
			ctx.save();
			const pulse = 0.5 + 0.5 * Math.sin(globalTime * 6);
			ctx.fillStyle = `rgba(255, 157, 77, ${0.18 + pulse * 0.14})`;
			ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
			ctx.restore();
		}

		renderDynamicLighting(ctx, effectiveW, effectiveH, pScreenX, pScreenY);
		ctx.restore();

		updateAndRenderAtmosphere(ctx, w, h, dt);
		renderVignetteOverlay(ctx, w, h);
	}

	/**
	 * Main requestAnimationFrame clock tick handler.
	 * State-mutating animation loop procedure.
	 *
	 * @param {number} timestamp - High-resolution DOM animation timestamp.
	 * @returns {void}
	 */
	function tick(timestamp) {
		const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000) || 0.016;
		lastTimestamp = timestamp;
		globalTime += dt;

		renderMapFrame(dt);

		if (typeof requestAnimationFrame !== 'undefined') {
			animFrameId = requestAnimationFrame(tick);
		}
	}
	//#endregion

	//#region [SEC-06] Canonical 9-Method Peripheral Lifecycle Gateway
	return {
		/**
		 * Ingests and locks peripheral driver configuration.
		 * State-mutating lifecycle gateway (transitions to configured).
		 *
		 * @param {MapRendererConfig} [options={}] - Configuration options dictionary.
		 * @returns {Readonly<{ accepted: boolean, driverId: string }>} Acceptance descriptor.
		 */
		configure(options = {}) {
			config = Object.freeze({ ...config, ...options });
			configured = true;
			return Object.freeze({ accepted: true, driverId: 'map_renderer' });
		},

		/**
		 * Binds host context, bakes terrain textures, initializes particle pool, and starts render loop.
		 * State-mutating lifecycle gateway (transitions to initialized).
		 *
		 * @param {any} [context] - Host runtime context or event bus handle.
		 * @returns {void}
		 */
		init(context) {
			if (!configured) {
				configured = true;
			}
			if (initialized) return;

			if (context) {
				if (context.eventBus) {
					eventBusRef = context.eventBus;
				} else if (typeof context.publish === 'function') {
					eventBusRef = context;
				}
			}
			bakeTerrainTextures();
			initParticles();
			ensureCanvas();

			if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
				window.addEventListener('resize', resize);
			}
			if (!animFrameId && typeof requestAnimationFrame !== 'undefined') {
				animFrameId = requestAnimationFrame(tick);
			}
			initialized = true;
		},

		/**
		 * Resets internal snapshot and centers camera on player position.
		 * State-mutating lifecycle gateway (transitions to ready).
		 *
		 * @param {MapSnapshot | null} [snapshot=null] - Overworld state snapshot.
		 * @returns {void}
		 */
		reset(snapshot = null) {
			if (!snapshot) {
				currentSnapshot = null;
			} else {
				currentSnapshot = structuredClone(snapshot);
			}
			globalTime = 0;
			const p = snapshot?.playerPos || snapshot?.pos || { x: 1, y: 1 };
			const startX = p.x * TILE_SIZE + TILE_SIZE / 2;
			const startY = p.y * TILE_SIZE + TILE_SIZE / 2;
			camera.x = startX;
			camera.y = startY;
			camera.targetX = startX;
			camera.targetY = startY;
		},

		/**
		 * Advances local animation clock and particle time step.
		 * State-mutating simulation tick gateway (transitions to running).
		 *
		 * @param {number} [dt] - Elapsed frame delta time in seconds.
		 * @returns {void}
		 */
		update(dt) {
			// Tier-3 presentation local visual update (camera damping, particles)
			globalTime += dt || 0.016;
		},

		/**
		 * Projects snapshot state by delegating to renderOverworld.
		 * State-mutating presentation projection gateway.
		 *
		 * @param {MapSnapshot} snapshot - Overworld state snapshot.
		 * @param {function(MapActionToken): void} [dispatch] - Action dispatch callback.
		 * @returns {void}
		 */
		render(snapshot, dispatch) {
			this.renderOverworld(snapshot, dispatch);
		},

		/**
		 * Projects overworld viewport, threat gauge, catacomb mode, and map frames.
		 * State-mutating presentation projection gateway.
		 *
		 * @param {MapSnapshot} snapshot - Overworld state snapshot.
		 * @param {function(MapActionToken): void} [dispatch] - Action dispatch callback.
		 * @returns {void}
		 */
		renderOverworld(snapshot, dispatch) {
			if (!snapshot) return;
			const prevMap = currentSnapshot?.map;
			currentSnapshot = snapshot;
			actionDispatch = dispatch;
			ensureCanvas();
			updateThreatGauge(snapshot);
			updateCatacombMode(snapshot);

			// Snap camera immediately on new map or large teleport (> 250px)
			const p = snapshot.playerPos || snapshot.pos;
			if (p) {
				const pX = p.x * TILE_SIZE + TILE_SIZE / 2;
				const pY = p.y * TILE_SIZE + TILE_SIZE / 2;
				if (!prevMap || prevMap !== snapshot.map || Math.hypot(camera.x - pX, camera.y - pY) > 250) {
					camera.x = pX;
					camera.y = pY;
					camera.targetX = pX;
					camera.targetY = pY;
				}
			}

			if (ctx) {
				renderMapFrame(0.016);
			}
		},

		/**
		 * Extracts detached serializable clone of current overworld snapshot.
		 * Pure extraction accessor.
		 *
		 * @returns {MapSnapshot | null} Detached snapshot copy.
		 */
		getState() {
			if (!currentSnapshot) return null;
			return structuredClone(currentSnapshot);
		},

		/**
		 * Resolves tile coordinates and screen bounding box from mouse screen coordinates.
		 * @param {number} screenX - Mouse clientX.
		 * @param {number} screenY - Mouse clientY.
		 * @returns {{ tileX: number, tileY: number, tile: string, bbox: { left: number, top: number, width: number, height: number } } | null}
		 */
		resolveTileFromScreen(screenX, screenY) {
			if (!canvas || !currentSnapshot?.map) return null;
			const rect = canvas.getBoundingClientRect();
			if (screenX < rect.left || screenX > rect.right || screenY < rect.top || screenY > rect.bottom) {
				return null;
			}
			const zoom = lastViewportState.zoom || 1.0;
			const localX = (screenX - rect.left) / zoom;
			const localY = (screenY - rect.top) / zoom;
			const tileX = Math.floor((localX - lastViewportState.offsetX) / TILE_SIZE);
			const tileY = Math.floor((localY - lastViewportState.offsetY) / TILE_SIZE);

			const map = currentSnapshot.map;
			if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= (map[0]?.length || 0)) {
				return null;
			}

			const tile = map[tileY][tileX];
			const bbox = this.getTileBoundingBox(tileX, tileY);
			return { tileX, tileY, tile, bbox };
		},

		/**
		 * Computes the viewport-relative bounding box for a given tile coordinate.
		 * @param {number} tileX - Map column index.
		 * @param {number} tileY - Map row index.
		 * @returns {{ left: number, top: number, width: number, height: number }}
		 */
		getTileBoundingBox(tileX, tileY) {
			if (!canvas) {
				return { left: 0, top: 0, width: 32, height: 32 };
			}
			const rect = canvas.getBoundingClientRect();
			const zoom = lastViewportState.zoom || 1.0;
			const left = rect.left + (lastViewportState.offsetX + tileX * TILE_SIZE) * zoom;
			const top = rect.top + (lastViewportState.offsetY + tileY * TILE_SIZE) * zoom;
			const size = TILE_SIZE * zoom;
			return { left, top, width: size, height: size };
		},

		/**
		 * Illuminates and targets a specific map tile coordinate with a radiant canvas shader.
		 * @param {number} tileX - Map column index.
		 * @param {number} tileY - Map row index.
		 * @returns {void}
		 */
		setTargetedTile(tileX, tileY) {
			targetedTileCoord = { x: tileX, y: tileY };
		},

		/**
		 * Clears active targeted tile illumination on the map canvas.
		 * @returns {void}
		 */
		clearTargetedTile() {
			targetedTileCoord = null;
		},

		/**
		 * Triggers immediate canvas buffer re-measurement and scaling.
		 * @returns {void}
		 */
		resize() {
			resize();
		},

		/**
		 * Returns operational diagnostics and camera telemetry.
		 * Pure diagnostic accessor.
		 *
		 * @returns {MapDiagnostics} Diagnostic report descriptor.
		 */
		getDiagnostics() {
			return {
				driverId: 'overworld_renderer',
				protocolVersion: 'VSRP-001',
				configured,
				initialized,
				cameraPos: { x: +camera.x.toFixed(1), y: +camera.y.toFixed(1) },
				cachedAtlasTiles: tileAtlas.size,
				cachedSprites: spriteAtlas.size,
				activeAtmosphericParticles: PARTICLE_COUNT,
				hasCanvas: Boolean(canvas),
			};
		},

		/**
		 * Returns static capability declarations and metadata schema.
		 * Pure manifest accessor.
		 *
		 * @returns {MapModuleInfo} Constitutional VSRP-001 metadata descriptor.
		 */
		getModuleInfo() {
			return {
				moduleId: 'EmberlightMapRenderer',
				version: '2.1.0',
				protocolVersion: 'VSRP-001',
				capabilities: [
					'spatial_viewports',
					'procedural_baking',
					'raycast_los',
					'cinematic_particles',
				],
			};
		},

		/**
		 * Tears down animation loop, removes event listeners, and purges canvas and atlases.
		 * State-mutating terminal lifecycle gateway (transitions to destroyed).
		 *
		 * @returns {void}
		 */
		destroy() {
			if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
			if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
				window.removeEventListener('resize', resize);
			}
			if (canvas?.parentElement && typeof canvas.remove === 'function') {
				canvas.remove();
			}
			canvas = null;
			ctx = null;
			currentSnapshot = null;
			actionDispatch = null;
			eventBusRef = null;
			targetedTileCoord = null;
			tileAtlas.clear();
			spriteAtlas.clear();
			initialized = false;
			configured = false;
		},
	};
	//#endregion
})();

//#region [SEC-07] Global Export & Dual-Binding Registration
if (typeof window !== 'undefined') {
	window['EmberlightMapRenderer'] = EmberlightMapRenderer;
	window['EmberlightOverworldRenderer'] = EmberlightMapRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightMapRenderer;
}
//#endregion
