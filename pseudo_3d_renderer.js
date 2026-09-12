/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTING ENGINE & CORRIDOR VIEWPORT (v2 Facade)
 * Document Identifier: VSRP-001-PSEUDO-3D-RENDERER
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-FACADE-001 / PRS-DES-013
 * Authority:           Peripheral Presentation (VSRP-001 Root Facade)
 * ============================================================================
 */

'use strict';

const EmberlightPseudo3D = (() => {
	// ── Ingest Faraday Staging Membrane or Node.js Fallbacks ───────────
	const _staging = (typeof window !== 'undefined' && window._Pseudo3DInternal) ? window._Pseudo3DInternal : {};
	const Textures = _staging.Textures || (typeof require === 'function' ? require('./pseudo_3d/pseudo_3d_textures.js') : {});
	const DDA = _staging.DDA || (typeof require === 'function' ? require('./pseudo_3d/pseudo_3d_dda.js') : {});
	const Billboards = _staging.Billboards || (typeof require === 'function' ? require('./pseudo_3d/pseudo_3d_billboards.js') : {});
	const Pipeline = _staging.Pipeline || (typeof require === 'function' ? require('./pseudo_3d/pseudo_3d_pipeline.js') : {});

	const DEFAULT_CONFIG = Textures.DEFAULT_CONFIG;
	const deepMerge = Textures.deepMerge;
	const TILE_LEGEND = Textures.TILE_LEGEND;
	const BILLBOARD_GLYPHS = Textures.BILLBOARD_GLYPHS || Billboards.BILLBOARD_GLYPHS;
	const WALL_TILES = Textures.WALL_TILES || DDA.WALL_TILES;
	const FACING_ANGLES = Textures.FACING_ANGLES;
	const resolveBillboardShadow = Textures.resolveBillboardShadow;
	const getMinimapTileColor = Textures.getMinimapTileColor;
	const getModuleInfo = Textures.getModuleInfo;

	const RaycastMath = Object.freeze({
		packColor: Textures.packColor,
		bakeTextures: Textures.bakeTextures,
		resolveWallTextureKey: Textures.resolveWallTextureKey,
		applyFog: Textures.applyFog,
		computeCameraPlane: DDA.computeCameraPlane,
		computeFov: DDA.computeFov,
		castDdaRay: DDA.castDdaRay,
		computeWallColumnPlan: DDA.computeWallColumnPlan,
		computeFloorRowPlan: DDA.computeFloorRowPlan,
		lerpCamera: DDA.lerpCamera,
		computeVisibleSprites: Billboards.computeVisibleSprites,
		projectSprite: Billboards.projectSprite,
		evaluateProximityTriggers: Billboards.evaluateProximityTriggers,
		isDirty: Billboards.isDirty,
		FACING_ANGLES,
		WALL_TILES,
		BILLBOARD_GLYPHS,
		resolveBillboardShadow,
		getMinimapTileColor,
	});

	/**
	 * Creates an isolated pseudo-3D viewport instance.
	 * State-initializing factory procedure.
	 * @param {Object} [options={}] - Instance creation options dictionary.
	 * @returns {any} Configured pseudo-3D viewport instance.
	 */
	function createInstance(options = {}) {
		let config = deepMerge(DEFAULT_CONFIG, options.config);
		const isHeadless = Boolean(options.isHeadless);
		let eventBus = options.eventBus || null;
		const canvasId = options.canvasId || "corridor-canvas";
		const minimapCanvasId =
			options.minimapCanvasId || "corridor-minimap-canvas";
		const compassRibbonId =
			options.compassRibbonId || "corridor-compass-ribbon";
		const minimapOverlayId =
			options.minimapOverlayId || "corridor-minimap-overlay";

		const textures = RaycastMath.bakeTextures(config);

		/** @type {HTMLCanvasElement | null} */
		let canvas = null;
		/** @type {CanvasRenderingContext2D | null} */
		let ctx = null;
		/** @type {HTMLCanvasElement | null} */
		let minimapCanvas = null;
		/** @type {CanvasRenderingContext2D | null} */
		let minimapCtx = null;
		/** @type {ImageData | null} */
		let imgData = null;
		/** @type {Uint32Array | null} */
		let pixelBuf = null;
		/** @type {Float32Array | null} */
		let depthBuffer = null;
		let isExpandedMode = false;
		let isPaused = false;
		let W = config.standard.width;
		let H = config.standard.height;
		let FOV = (config.standard.fovDeg * Math.PI) / 180;

		/** @type {any} */
		let camera = {
			x: 1.5,
			y: 1.5,
			targetX: 1.5,
			targetY: 1.5,
			angle: Math.PI / 2,
			targetAngle: Math.PI / 2,
			t: 0,
		};
		let triggerLatches = new Map();
		let lastFrameDescriptor = null;
		let dirtyOverride = true;

		function dims() {
			return { width: W, height: H };
		}

		function getPipelineState() {
			return {
				camera,
				dims: dims(),
				W,
				H,
				FOV,
				config,
				textures,
				pixelBuf,
				depthBuffer,
				ctx,
				minimapCtx,
				minimapCanvas,
			};
		}

		function attachDom() {
			if (isHeadless || typeof document === "undefined") return;
			/** @type {HTMLCanvasElement | null} */
			const canvasElem = /** @type {HTMLCanvasElement | null} */ (document.getElementById(canvasId));
			canvas = canvasElem;
			if (canvas && typeof canvas.getContext === "function") {
				canvas.width = W;
				canvas.height = H;
				/** @type {CanvasRenderingContext2D | null} */
				const context2D = canvas.getContext("2d");
				ctx = context2D;
				if (ctx && typeof ctx.createImageData === "function") {
					imgData = ctx.createImageData(W, H);
					if (imgData?.data?.buffer) {
						pixelBuf = new Uint32Array(imgData.data.buffer);
					}
				}
			}
			/** @type {HTMLCanvasElement | null} */
			const miniElem = /** @type {HTMLCanvasElement | null} */ (document.getElementById(minimapCanvasId));
			minimapCanvas = miniElem;
			if (minimapCanvas && typeof miniElem?.getContext === "function") {
				/** @type {CanvasRenderingContext2D | null} */
				const miniCtx2D = minimapCanvas.getContext("2d");
				minimapCtx = miniCtx2D;
			}
		}

		function resizeBuffers(targetW, targetH, targetFovRad) {
			W = targetW;
			H = targetH;
			FOV = targetFovRad;
			depthBuffer = new Float32Array(W);
			attachDom();
		}

		function ensureBuffers() {
			if (isHeadless) {
				if (!depthBuffer || depthBuffer.length !== W)
					depthBuffer = new Float32Array(W);
				return;
			}
			if (
				!pixelBuf ||
				(canvas && (canvas.width !== W || canvas.height !== H))
			) {
				resizeBuffers(W, H, FOV);
			}
		}

		function evaluateAndPublishTriggers(map, state) {
			const { events, nextLatches } = RaycastMath.evaluateProximityTriggers(
				camera,
				map,
				config,
				state,
				triggerLatches,
			);
			triggerLatches = nextLatches;
			if (eventBus && typeof eventBus.publish === "function") {
				for (const evt of events) eventBus.publish(evt.eventName, evt.payload);
			}
			return events;
		}

		function executeHeadlessRender(map, events, isDungeon, isTown, torchFlicker) {
			const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
			const { planeX, planeY } = RaycastMath.computeFov(
				camera,
				FOV,
				cosA,
				sinA,
			);
			const plane = { cosA, sinA, planeX, planeY };
			const centerRay = RaycastMath.castDdaRay(
				camera,
				0,
				plane,
				map,
				config,
			);
			const sprites = RaycastMath.computeVisibleSprites(camera, map, config);
			return {
				skipped: false,
				events,
				camera: { ...camera },
				centerRay,
				spriteCount: sprites.length,
				isDungeon,
				isTown,
				torchFlicker,
			};
		}

		function evaluateDirtyState(map, isTown, isDungeon, torchFlicker) {
			const descriptor = {
				x: camera.x,
				y: camera.y,
				angle: camera.angle,
				torchFlicker,
				mapRef: map,
				isTown,
				isDungeon,
			};
			const dirty =
				dirtyOverride ||
				RaycastMath.isDirty(lastFrameDescriptor, descriptor, config);
			dirtyOverride = false;
			lastFrameDescriptor = descriptor;
			return dirty;
		}

		function init(busOrOpts) {
			if (busOrOpts) {
				if (typeof busOrOpts.publish === "function") {
					eventBus = busOrOpts;
				} else if (
					busOrOpts.eventBus &&
					typeof busOrOpts.eventBus.publish === "function"
				) {
					eventBus = busOrOpts.eventBus;
				}
			}
			ensureBuffers();
			if (!isHeadless && typeof window !== "undefined") {
				window.addEventListener("resize", () => ensureBuffers());
			}
			return api;
		}

		function setExpanded(expanded) {
			isExpandedMode = Boolean(expanded);
			const src = isExpandedMode ? config.expanded : config.standard;
			resizeBuffers(src.width, src.height, (src.fovDeg * Math.PI) / 180);
			if (!isHeadless && typeof document !== "undefined") {
				const compassRibbon = document.getElementById(compassRibbonId);
				const minimapOverlay = document.getElementById(minimapOverlayId);
				if (compassRibbon)
					compassRibbon.classList.toggle("hidden", !isExpandedMode);
				if (minimapOverlay)
					minimapOverlay.classList.toggle("hidden", !isExpandedMode);
			}
		}

		function getDimensions() {
			return {
				width: W,
				height: H,
				isExpanded: isExpandedMode,
				fovDeg: Math.round((FOV * 180) / Math.PI),
			};
		}

		function update(context, dt) {
			let safeDt = 0.016;
			if (typeof dt === 'number') {
				safeDt = dt;
			} else if (typeof context === 'number') {
				safeDt = context;
			}
			camera.t += safeDt;
			ensureBuffers();
			camera = RaycastMath.lerpCamera(camera, safeDt, config.cameraLerpRate);
		}

		function markDirty() {
			dirtyOverride = true;
		}

		function render(state) {
			if (isPaused || !state) return null;
			const { map, playerPos, facing } = state;
			if (!map || !Array.isArray(map) || map.length === 0 || !map[0] || !playerPos) return null;

			camera.targetX = playerPos.x + 0.5;
			camera.targetY = playerPos.y + 0.5;
			if (facing && Object.hasOwn(RaycastMath.FACING_ANGLES, facing))
				camera.targetAngle = RaycastMath.FACING_ANGLES[facing];

			const env = Pipeline.resolveEnvironment(state, map, playerPos);
			const torchFlicker = Pipeline.computeTorchFlicker(camera.t);
			const events = evaluateAndPublishTriggers(map, state);
			const dirty = evaluateDirtyState(map, env.isTown, env.isDungeon, torchFlicker);

			if (!dirty) {
				return isHeadless ? { skipped: true, events } : null;
			}

			if (isHeadless) {
				return executeHeadlessRender(map, events, env.isDungeon, env.isTown, torchFlicker);
			}

			ensureBuffers();
			if (!canvas || !ctx || !pixelBuf) return null;

			const pipeState = getPipelineState();
			Pipeline.renderFloorAndCeiling(torchFlicker, env.isTown, env.isDungeon, pipeState, RaycastMath);
			Pipeline.renderWalls(map, torchFlicker, env.isTown, pipeState, RaycastMath);
			if (ctx.putImageData && imgData) ctx.putImageData(imgData, 0, 0);
			Pipeline.renderBillboards(map, torchFlicker, pipeState, RaycastMath);

			if (isExpandedMode) {
				Pipeline.updateCompassRibbon(camera.angle, compassRibbonId);
				Pipeline.renderMinimapRadar(map, playerPos, pipeState, RaycastMath);
			}
			Pipeline.renderVignetteAndDebugHud(ctx, W, H, env.isDungeon, map, state.facing, camera, isExpandedMode);
			return { skipped: false, events };
		}

		function pause() {
			isPaused = true;
		}

		function resume() {
			isPaused = false;
		}

		function getDiagnostics() {
			return {
				driverId: "pseudo_3d_renderer",
				renderResolution: `${W}x${H}`,
				isExpanded: isExpandedMode,
				isPaused,
				isHeadless,
				cameraPos: { x: camera.x.toFixed(2), y: camera.y.toFixed(2) },
				cameraAngle: camera.angle.toFixed(2),
				fovDeg: Math.round((FOV * 180) / Math.PI),
				activeLatches: [...triggerLatches.entries()]
					.filter(([, v]) => v)
					.map(([k]) => k),
			};
		}

		function destroy() {
			pixelBuf = null;
			imgData = null;
			depthBuffer = null;
			canvas = null;
			ctx = null;
			minimapCanvas = null;
			minimapCtx = null;
			triggerLatches = new Map();
			lastFrameDescriptor = null;
		}

		function configure(cfg = {}) {
			config = deepMerge(config, cfg);
			return Object.freeze({ accepted: true, driverId: "pseudo_3d_renderer" });
		}

		function reset() {
			triggerLatches = new Map();
			lastFrameDescriptor = null;
			dirtyOverride = true;
			camera = {
				x: 1.5,
				y: 1.5,
				targetX: 1.5,
				targetY: 1.5,
				angle: Math.PI / 2,
				targetAngle: Math.PI / 2,
				t: 0,
			};
			return true;
		}

		function getState() {
			return Object.freeze({
				driverId: "pseudo_3d_renderer",
				isExpanded: isExpandedMode,
				isPaused,
				isHeadless,
				camera: { ...camera },
				resolution: `${W}x${H}`,
				fovDeg: Math.round((FOV * 180) / Math.PI),
			});
		}

		/** @type {any} */
		const api = {
			configure,
			init,
			reset,
			update,
			render,
			getState,
			getDiagnostics,
			getModuleInfo,
			destroy,
			pause,
			resume,
			setExpanded,
			getDimensions,
			markDirty,
			_test: isHeadless
				? { camera: () => ({ ...camera }), config, textures }
				: undefined,
		};

		return api;
	}

	let _defaultInstance = null;

	function _getDefaultInstance(opts = {}) {
		if (!_defaultInstance) {
			_defaultInstance = createInstance(opts);
		}
		return _defaultInstance;
	}

	return Object.freeze({
		createInstance,
		RaycastMath,
		TILE_LEGEND,
		BILLBOARD_GLYPHS,
		DEFAULT_CONFIG,

		configure: (cfg) => _getDefaultInstance().configure(cfg),
		init: (busOrOpts) => {
			const opts = (typeof busOrOpts === "object" && busOrOpts !== null) ? busOrOpts : {};
			return _getDefaultInstance(opts).init(busOrOpts);
		},
		reset: () => _getDefaultInstance().reset(),
		update: (context, dt) => _getDefaultInstance().update(context, dt),
		render: (state) => _getDefaultInstance().render(state),
		getState: () => _getDefaultInstance().getState(),
		getDiagnostics: () => _getDefaultInstance().getDiagnostics(),
		getModuleInfo: () => _getDefaultInstance().getModuleInfo(),
		destroy: () => {
			if (_defaultInstance) {
				_defaultInstance.destroy();
				_defaultInstance = null;
			}
		},
		pause: () => _getDefaultInstance().pause(),
		resume: () => _getDefaultInstance().resume(),
		setExpanded: (expanded) => _getDefaultInstance().setExpanded(expanded),
		getDimensions: () => _getDefaultInstance().getDimensions(),
		markDirty: () => _getDefaultInstance().markDirty(),
	});
})();

if (typeof window !== "undefined") {
	/** @type {any} */
	const win = window;
	win.EmberlightPseudo3D = EmberlightPseudo3D;
	win.EmberlightCorridorSensor = EmberlightPseudo3D;
	delete win._Pseudo3DInternal;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightPseudo3D;
}