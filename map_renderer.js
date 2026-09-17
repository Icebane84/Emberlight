/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: CINEMATIC MAP CANVAS & TILE RENDERER (FACADE)
 * Document Identifier: VSRP-001-MAP-RENDERER-COMPLIANT
 * Governing Protocol:  VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * This file is a thin facade. It ingests all 4 sub-module namespace keys
 * from the VSRP-001 staging membrane (window._MapInternal), purges
 * the membrane, and exports the canonical VSRP-001 EmberlightMapRenderer object.
 *
 * Sub-module load order (must precede this file in index.html / load_order.js):
 *   map/map_textures.js
 *   map/map_particles.js
 *   map/map_los.js
 *   map/map_compositor.js
 * ============================================================================
 */

const EmberlightMapRenderer = (() => {
	// ─── Membrane Ingestion ───────────────────────────────────────────────────
	/** @type {Record<string, any>} */
	const _mem =
		(typeof window !== "undefined" && (/** @type {any} */ (window))._MapInternal) ||
		(typeof globalThis !== "undefined" && (/** @type {any} */ (globalThis))._MapInternal) ||
		{};

	const {
		TILE_SIZE = 32,
		tileAtlas = new Map(),
		bakeTerrainTextures = () => { },
	} = _mem.Textures || {};

	const {
		PARTICLE_COUNT = 64,
		initParticles = () => { },
		updateAndRenderAtmosphere = () => { },
	} = _mem.Particles || {};

	const {
		computeLineOfSight = () => new Set(),
		renderDynamicLighting = () => { },
	} = _mem.LOS || {};

	const {
		VIEW_WIDTH = 480,
		VIEW_HEIGHT = 320,
		spriteAtlas = new Map(),
		getCachedSprite = () => null,
		updateCameraPosition = () => { },
		renderTerrainLayer = () => { },
		renderQuestTargetLine = () => { },
		renderEntitiesLayer = () => ({ pScreenX: 0, pScreenY: 0 }),
		renderVignetteOverlay = () => { },
	} = _mem.Compositor || {};

	// ─── Faraday Membrane Purge ───────────────────────────────────────────────
	if (typeof window !== "undefined" && (/** @type {any} */ (window))._MapInternal) {
		delete (/** @type {any} */ (window))._MapInternal;
	}
	if (typeof globalThis !== "undefined" && (/** @type {any} */ (globalThis))._MapInternal) {
		delete (/** @type {any} */ (globalThis))._MapInternal;
	}

	//#region [SEC-01] Type Definitions & Internal State
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
	 * @property {{ x: number, y: number, inTown?: boolean }} [playerPos] - Player grid coordinates.
	 * @property {{ x: number, y: number, inTown?: boolean }} [pos] - Fallback player grid coordinates.
	 * @property {'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | string} [facing] - Avatar facing direction.
	 * @property {MapAvatarState} [avatar] - Player gear and phenotype visual spec.
	 * @property {MapEntityState[]} [entities] - Active map entities.
	 * @property {MapEntityState[]} [monsters] - Fallback active monsters array.
	 * @property {number} [dangerSteps] - Encounter threshold step counter.
	 * @property {number} [dungeonDepth] - Subterranean dungeon depth level.
	 * @property {number} [depth] - Fallback dungeon depth level.
	 * @property {{ x: number, y: number }} [activeQuestTarget] - Quest marker coordinates.
	 * @property {number} [stepAnimFrame] - Walk cycle animation frame index.
	 * @property {string} [townId] - Active town identifier.
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
	/** @type {((token: MapActionToken) => void) | null} */
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
		rect: { left: 0, top: 0, width: 480, height: 320, right: 480, bottom: 320 },
	};
	//#endregion

	//#region [SEC-02] Host Events & Canvas Initialization
	function resolveGlobalEventBus() {
		if (eventBusRef) return eventBusRef;
		if (typeof EmberlightEventBus !== "undefined") return EmberlightEventBus;
		if (
			typeof window !== "undefined" &&
			/** @type {any} */ (window).EmberlightEventBus
		) {
			return /** @type {any} */ (window).EmberlightEventBus;
		}
		if (
			typeof globalThis !== "undefined" &&
			/** @type {any} */ (globalThis).EmberlightEventBus
		) {
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
			typeof targetCanvas.addEventListener !== "function"
		)
			return;

		targetCanvas.addEventListener("mousemove", (/** @type {MouseEvent | any} */ e) => {
			if (!currentSnapshot || !canvas) return;
			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const offsetX = Math.floor(rect.width / 2 - camera.x);
			const offsetY = Math.floor(rect.height / 2 - camera.y);

			const tileX = Math.floor((mouseX - offsetX) / TILE_SIZE);
			const tileY = Math.floor((mouseY - offsetY) / TILE_SIZE);

			const map = currentSnapshot.map || [];
			if (
				tileY >= 0 &&
				tileY < map.length &&
				tileX >= 0 &&
				tileX < (map[0]?.length || 0)
			) {
				const tileType = map[tileY][tileX];
				const isPlayer =
					tileX === currentSnapshot.playerPos?.x &&
					tileY === currentSnapshot.playerPos?.y;
				const bus = resolveGlobalEventBus();
				if (bus && typeof bus.publish === "function") {
					bus.publish("overworld:hover_tile", {
						x: tileX,
						y: tileY,
						tileType,
						isPlayer,
						isClear: false,
					});
				}
			}
		});

		targetCanvas.addEventListener("mouseleave", () => {
			const bus = resolveGlobalEventBus();
			if (bus && typeof bus.publish === "function") {
				bus.publish("overworld:hover_tile", { isClear: true });
			}
		});

		targetCanvas.addEventListener("click", () => {
			const bus = resolveGlobalEventBus();
			if (bus && typeof bus.publish === "function") {
				bus.publish("input:action", { action: "CONFIRM" });
			}
			if (typeof actionDispatch === "function") {
				actionDispatch({ type: "CONFIRM" });
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
		if (typeof document === "undefined") return;
		if (canvas?.parentElement) return;

		const wrapper = document.getElementById("overworld-grid-wrapper");
		if (!wrapper) return;

		wrapper.style.position = "relative";
		wrapper.style.overflow = "hidden";

		const legacyGrid = document.getElementById("overworld-grid");
		if (legacyGrid) legacyGrid.style.display = "none";

		canvas = document.getElementById("map-renderer-canvas");
		if (!canvas) {
			canvas = document.createElement("canvas");
			canvas.id = "map-renderer-canvas";
			canvas.style.display = "block";
			canvas.style.width = "100%";
			canvas.style.height = "100%";
			canvas.style.imageRendering = "pixelated";
			wrapper.appendChild(canvas);
		}

		ctx = canvas.getContext("2d");
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
		const dpr =
			typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const w = Math.max(VIEW_WIDTH, Math.floor(rect.width || VIEW_WIDTH));
		const h = Math.max(VIEW_HEIGHT, Math.floor(rect.height || VIEW_HEIGHT));
		canvas.width = Math.floor(w * dpr);
		canvas.height = Math.floor(h * dpr);
		if (typeof ctx.setTransform === "function") {
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
		if (typeof document === "undefined") return;
		const threatBar = document.getElementById("overworld-threat-gauge");
		if (threatBar) {
			const threatPct = Math.min(
				100,
				Math.round(((snapshot.dangerSteps || 0) / 5) * 100),
			);
			threatBar.style.width = `${threatPct}%`;
			threatBar.style.backgroundColor =
				threatPct > 60 ? "var(--danger)" : "var(--ember)";
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
		if (typeof document === "undefined") return;
		const isCatacombs = Boolean(
			(snapshot.dungeonDepth && snapshot.dungeonDepth > 0) ||
			(snapshot.depth && snapshot.depth > 0),
		);
		const gridWrapper = document.getElementById("overworld-grid-wrapper");
		if (gridWrapper) {
			gridWrapper.classList.toggle("catacomb-mode", isCatacombs);
		}
	}
	//#endregion

	//#region [SEC-03] Map Frame Compilation & Animation Loop
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
		const dpr =
			typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const w = Math.max(VIEW_WIDTH, Math.floor(rect.width || VIEW_WIDTH));
		const h = Math.max(VIEW_HEIGHT, Math.floor(rect.height || VIEW_HEIGHT));

		// Auto-synchronize internal buffer resolution to matching visible DOM dimensions and DPR
		const expectedCanvasW = Math.floor(w * dpr);
		const expectedCanvasH = Math.floor(h * dpr);
		if (canvas.width !== expectedCanvasW || canvas.height !== expectedCanvasH) {
			canvas.width = expectedCanvasW;
			canvas.height = expectedCanvasH;
			if (typeof ctx.setTransform === "function") {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.scale(dpr, dpr);
			}
		}

		const map = currentSnapshot.map || [];
		const playerPos = currentSnapshot.playerPos ||
			currentSnapshot.pos || { x: 1, y: 1 };
		const mapCols = map[0]?.length || 15;
		const mapRows = map.length || 11;

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

		updateCameraPosition(camera, playerPos, map, effectiveW, effectiveH, TILE_SIZE);
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
		ctx.fillStyle = "#020206";
		ctx.fillRect(0, 0, w, h);

		const visibleTiles = computeLineOfSight(map, playerPos.x, playerPos.y, 7);

		ctx.save();
		ctx.scale(zoom, zoom);

		const isTown = Boolean(
			currentSnapshot.townId ||
			currentSnapshot.pos?.inTown ||
			currentSnapshot.playerPos?.inTown,
		);

		renderTerrainLayer(
			ctx,
			map,
			visibleTiles,
			{
				offsetX,
				offsetY,
				w: effectiveW,
				h: effectiveH,
				time: globalTime,
				isTown,
			},
			tileAtlas,
			TILE_SIZE,
		);
		renderQuestTargetLine(
			ctx,
			currentSnapshot,
			offsetX,
			offsetY,
			effectiveW,
			effectiveH,
			TILE_SIZE,
		);

		const { pScreenX, pScreenY } = renderEntitiesLayer(
			ctx,
			currentSnapshot,
			visibleTiles,
			offsetX,
			offsetY,
			TILE_SIZE,
			getCachedSprite,
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

		updateAndRenderAtmosphere(ctx, w, h, dt, globalTime);
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

		if (typeof requestAnimationFrame !== "undefined") {
			animFrameId = requestAnimationFrame(tick);
		}
	}
	//#endregion

	//#region [SEC-04] Canonical 9-Method Peripheral Lifecycle Gateway
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
			return Object.freeze({ accepted: true, driverId: "map_renderer" });
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
				} else if (typeof context.publish === "function") {
					eventBusRef = context;
				}
			}
			bakeTerrainTextures();
			initParticles();
			ensureCanvas();

			if (
				typeof window !== "undefined" &&
				typeof window.addEventListener === "function"
			) {
				window.addEventListener("resize", resize);
			}
			if (!animFrameId && typeof requestAnimationFrame !== "undefined") {
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
			globalTime += dt || 0.016;
		},

		/**
		 * Projects snapshot state by delegating to renderOverworld.
		 * State-mutating presentation projection gateway.
		 *
		 * @param {MapSnapshot} snapshot - Overworld state snapshot.
		 * @param {(token: MapActionToken) => void} [dispatch] - Action dispatch callback.
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
		 * @param {(token: MapActionToken) => void} [dispatch] - Action dispatch callback.
		 * @returns {void}
		 */
		renderOverworld(snapshot, dispatch) {
			if (!snapshot) return;
			const prevMap = currentSnapshot?.map;
			currentSnapshot = snapshot;
			actionDispatch = dispatch || null;
			ensureCanvas();
			updateThreatGauge(snapshot);
			updateCatacombMode(snapshot);

			// Snap camera immediately on new map or large teleport (> 250px)
			const p = snapshot.playerPos || snapshot.pos;
			if (p) {
				const pX = p.x * TILE_SIZE + TILE_SIZE / 2;
				const pY = p.y * TILE_SIZE + TILE_SIZE / 2;
				if (
					!prevMap ||
					prevMap !== snapshot.map ||
					Math.hypot(camera.x - pX, camera.y - pY) > 250
				) {
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
			if (
				screenX < rect.left ||
				screenX > rect.right ||
				screenY < rect.top ||
				screenY > rect.bottom
			) {
				return null;
			}
			const zoom = lastViewportState.zoom || 1.0;
			const localX = (screenX - rect.left) / zoom;
			const localY = (screenY - rect.top) / zoom;
			const tileX = Math.floor(
				(localX - lastViewportState.offsetX) / TILE_SIZE,
			);
			const tileY = Math.floor(
				(localY - lastViewportState.offsetY) / TILE_SIZE,
			);

			const map = currentSnapshot.map;
			if (
				tileY < 0 ||
				tileY >= map.length ||
				tileX < 0 ||
				tileX >= (map[0]?.length || 0)
			) {
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
			const left =
				rect.left + (lastViewportState.offsetX + tileX * TILE_SIZE) * zoom;
			const top =
				rect.top + (lastViewportState.offsetY + tileY * TILE_SIZE) * zoom;
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
				driverId: "overworld_renderer",
				protocolVersion: "VSRP-001",
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
				moduleId: "EmberlightMapRenderer",
				version: "2.1.0",
				protocolVersion: "VSRP-001",
				capabilities: [
					"spatial_viewports",
					"procedural_baking",
					"raycast_los",
					"cinematic_particles",
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
			if (animFrameId && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
			if (
				typeof window !== "undefined" &&
				typeof window.removeEventListener === "function"
			) {
				window.removeEventListener("resize", resize);
			}
			if (canvas?.parentElement && typeof canvas.remove === "function") {
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

// ─── Dual Global Bindings & Export ──────────────────────────────────────────
if (typeof window !== "undefined") {
	window.EmberlightMapRenderer = EmberlightMapRenderer;
	window.EmberlightOverworldRenderer = EmberlightMapRenderer;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightMapRenderer;
}
