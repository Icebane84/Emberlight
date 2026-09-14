/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DYNAMIC TILE & VOXEL LIGHTING FACADE
 * Document Identifier: VSRP-001-DYNAMIC-LIGHTS
 * Protocol Version:    VSRP-001 / MPFS-001
 * Authority:           Peripheral Capability Driver (Tier 3)
 * ============================================================================
 *
 * SUB-MODULE DEPENDENCIES (Staging Membrane):
 *   - dynamic_lights/dynamic_lights_primitives.js -> _DynamicLightsInternal.Primitives
 *   - dynamic_lights/dynamic_lights_shadows.js    -> _DynamicLightsInternal.Shadows
 *   - dynamic_lights/dynamic_lights_emitters.js   -> _DynamicLightsInternal.Emitters
 *   - dynamic_lights/dynamic_lights_pipeline.js   -> _DynamicLightsInternal.Pipeline
 * ============================================================================
 */

const EmberlightDynamicLights = (() => {
	// Ingest sub-module dependencies from staging membrane
	const membrane =
		(typeof window !== "undefined" && window._DynamicLightsInternal) ||
		(typeof globalThis !== "undefined" && globalThis._DynamicLightsInternal) ||
		{};

	const {
		MAX_TRANSIENTS = 24,
		moteRand = () => Math.random(),
		initDustMotes = () => { },
		calculateScreenPlayerCoords = (px, py, tw, th, ox, oy) => ({
			pScreenX: ox + px * tw,
			pScreenY: oy + py * th,
		}),
		evaluateZone = () => "SURFACE",
	} = membrane.Primitives || {};

	const { castShadowFromOccluder = () => { }, drawBeveledWallEdges = () => { } } =
		membrane.Shadows || {};

	const { spawnTransientLight = () => { }, assembleEmitters = () => [] } =
		membrane.Emitters || {};

	const {
		renderDarknessAndShadows = () => { },
		renderRadiantAndBevelHighlights = () => { },
		renderDustMotes = () => { },
	} = membrane.Pipeline || {};

	// Clean membrane
	if (typeof window !== "undefined" && window._DynamicLightsInternal) {
		delete window._DynamicLightsInternal;
	}
	if (typeof globalThis !== "undefined" && globalThis._DynamicLightsInternal) {
		delete globalThis._DynamicLightsInternal;
	}

	let canvas = null;
	let ctx = null;
	let eventBus = null;
	let animFrameId = null;

	let tileW = 38;
	let tileH = 30;

	let playerX = 1;
	let playerY = 1;
	let targetPlayerX = 1;
	let targetPlayerY = 1;

	let activeZoneType = "SURFACE";
	let dungeonDepth = 0;
	let cachedMap = null;

	const transientLights = [];
	const dustMotes = [];
	let flickerTime = 0;
	let unsubs = [];

	function ensureCanvas() {
		if (typeof document === "undefined") return;
		if (canvas?.parentElement) return;

		const gridWrapper =
			document.getElementById("overworld-grid-wrapper") ||
			document.getElementById("overworld-grid");
		if (!gridWrapper) return;

		gridWrapper.style.position = "relative";
		canvas = document.createElement("canvas");
		canvas.id = "dynamic-lights-canvas";
		canvas.style.position = "absolute";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "15";
		gridWrapper.appendChild(canvas);

		ctx =
			typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
		resize();
	}

	function resize() {
		if (!canvas?.parentElement || !ctx) return;
		const rect = canvas.parentElement.getBoundingClientRect
			? canvas.parentElement.getBoundingClientRect()
			: { width: 480, height: 320 };
		const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
		canvas.width = Math.floor((rect.width || 480) * dpr);
		canvas.height = Math.floor((rect.height || 320) * dpr);
		if (ctx.setTransform) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);
		}

		if (typeof document !== "undefined") {
			const sampleTile = document.querySelector("#overworld-grid .tile");
			if (sampleTile) {
				tileW = sampleTile.offsetWidth || 38;
				tileH = sampleTile.offsetHeight || 30;
			}
		}
	}

	function render(time = 0) {
		if (!canvas || !ctx) return;
		const rect = canvas.getBoundingClientRect
			? canvas.getBoundingClientRect()
			: { width: 480, height: 320 };
		const w = rect.width || 480;
		const h = rect.height || 320;

		playerX += (targetPlayerX - playerX) * 0.22;
		playerY += (targetPlayerY - playerY) * 0.22;

		flickerTime = time * 0.005;
		const flicker =
			Math.sin(flickerTime * 11) * 3.5 + Math.cos(flickerTime * 17) * 2.0;

		ctx.clearRect(0, 0, w, h);

		const grid =
			typeof document !== "undefined"
				? document.getElementById("overworld-grid")
				: null;
		const gridWrapper =
			typeof document !== "undefined"
				? document.getElementById("overworld-grid-wrapper")
				: null;
		const offsetX = grid && gridWrapper ? grid.offsetLeft : 0;
		const offsetY = grid && gridWrapper ? grid.offsetTop : 0;

		const { pScreenX, pScreenY } = calculateScreenPlayerCoords(
			playerX,
			playerY,
			tileW,
			tileH,
			offsetX,
			offsetY,
			canvas,
		);

		const isSubterranean = dungeonDepth > 0 || activeZoneType === "CRYPT";
		const ambientDarkness = isSubterranean ? 0.94 : 0.0;

		const emitters = assembleEmitters(
			pScreenX,
			pScreenY,
			flicker,
			offsetX,
			offsetY,
			isSubterranean,
			cachedMap,
			tileW,
			tileH,
			flickerTime,
			transientLights,
		);

		renderDarknessAndShadows(
			ctx,
			w,
			h,
			ambientDarkness,
			emitters,
			offsetX,
			offsetY,
			cachedMap,
			tileW,
			tileH,
			castShadowFromOccluder,
		);
		renderRadiantAndBevelHighlights(
			ctx,
			emitters,
			offsetX,
			offsetY,
			cachedMap,
			tileW,
			tileH,
			drawBeveledWallEdges,
		);

		if (isSubterranean) {
			renderDustMotes(
				ctx,
				w,
				h,
				pScreenX,
				pScreenY,
				dustMotes,
				initDustMotes,
				moteRand,
			);
		}

		if (typeof requestAnimationFrame !== "undefined") {
			animFrameId = requestAnimationFrame(render);
		}
	}

	return {
		init(bus) {
			this.destroy();
			eventBus = bus;
			ensureCanvas();

			if (typeof window !== "undefined") {
				window.addEventListener("resize", resize);
			}

			if (eventBus && typeof eventBus.subscribe === "function") {
				unsubs.push(
					eventBus.subscribe("overworld:step", (payload) => {
						const pos = payload?.pos;
						const depth = payload?.depth ?? pos?.depth;
						if (typeof depth === "number") dungeonDepth = depth;
						if (pos) {
							targetPlayerX = pos.x;
							targetPlayerY = pos.y;
							activeZoneType = evaluateZone(
								pos.x,
								pos.y,
								dungeonDepth,
								cachedMap,
							);
						}
					}),
					eventBus.subscribe("overworld:map_loaded", ({ map, depth, pos }) => {
						if (Array.isArray(map)) {
							cachedMap = map;
							resize();
						}
						if (typeof depth === "number") dungeonDepth = depth;
						if (pos) {
							targetPlayerX = pos.x;
							targetPlayerY = pos.y;
						}
						activeZoneType = evaluateZone(
							targetPlayerX,
							targetPlayerY,
							dungeonDepth,
							cachedMap,
						);
					}),
					eventBus.subscribe("combat:sfx", ({ sfx }) => {
						const sx = targetPlayerX * tileW + tileW * 0.5;
						const sy = targetPlayerY * tileH + tileH * 0.5;
						if (sfx === "SPELL_BOLT") {
							spawnTransientLight(
								transientLights,
								MAX_TRANSIENTS,
								sx,
								sy,
								180,
								"56, 189, 248",
								0.45,
								1.4,
							);
						} else if (sfx === "ATTACK_HIT") {
							spawnTransientLight(
								transientLights,
								MAX_TRANSIENTS,
								sx,
								sy,
								120,
								"255, 157, 77",
								0.25,
								1.1,
							);
						} else if (sfx === "HEAL") {
							spawnTransientLight(
								transientLights,
								MAX_TRANSIENTS,
								sx,
								sy,
								160,
								"74, 222, 128",
								0.6,
								1.2,
							);
						}
					}),
					eventBus.subscribe(
						"overworld:transmute_request",
						({ type, playerPos }) => {
							const px = (playerPos?.x || targetPlayerX) * tileW + tileW * 0.5;
							const py = (playerPos?.y || targetPlayerY) * tileH + tileH * 0.5;
							if (type === "SCORCH") {
								spawnTransientLight(
									transientLights,
									MAX_TRANSIENTS,
									px,
									py,
									220,
									"239, 68, 68",
									0.6,
									1.8,
								);
							} else if (type === "CONSECRATE") {
								spawnTransientLight(
									transientLights,
									MAX_TRANSIENTS,
									px,
									py,
									240,
									"250, 204, 21",
									0.8,
									1.5,
								);
							}
						},
					),
				);
			}

			if (!animFrameId && typeof requestAnimationFrame !== "undefined") {
				animFrameId = requestAnimationFrame(render);
			}
		},

		setMap(map, depth) {
			if (Array.isArray(map)) {
				cachedMap = map;
				resize();
			}
			if (typeof depth === "number") {
				dungeonDepth = depth;
				activeZoneType = evaluateZone(
					targetPlayerX,
					targetPlayerY,
					dungeonDepth,
					cachedMap,
				);
			}
		},

		setDepth(depth) {
			if (typeof depth === "number") {
				dungeonDepth = depth;
				activeZoneType = evaluateZone(
					targetPlayerX,
					targetPlayerY,
					dungeonDepth,
					cachedMap,
				);
			}
		},

		setZone(zone) {
			activeZoneType = String(zone || "SURFACE").toUpperCase();
		},

		setTargetPosition(x, y) {
			targetPlayerX = x;
			targetPlayerY = y;
			activeZoneType = evaluateZone(x, y, dungeonDepth, cachedMap);
		},

		spawnFlare(x, y, radius, colorRgb, duration) {
			const sx = x * tileW + tileW * 0.5;
			const sy = y * tileH + tileH * 0.5;
			spawnTransientLight(
				transientLights,
				MAX_TRANSIENTS,
				sx,
				sy,
				radius,
				colorRgb,
				duration,
			);
		},

		resize() {
			ensureCanvas();
			resize();
		},

		pause() {
			if (animFrameId && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
		},

		resume() {
			ensureCanvas();
			resize();
			if (!animFrameId && typeof requestAnimationFrame !== "undefined") {
				animFrameId = requestAnimationFrame(render);
			}
		},

		getDiagnostics() {
			return {
				driverId: "dynamic_lights_driver",
				activeZone: activeZoneType,
				dungeonDepth,
				isSubterranean: dungeonDepth > 0 || activeZoneType === "CRYPT",
				transientLightCount: transientLights.length,
				hasMap: Boolean(cachedMap),
			};
		},

		destroy() {
			this.pause();
			unsubs.forEach((u) => {
				try {
					if (typeof u === "function") u();
				} catch (_) { }
			});
			unsubs = [];

			if (typeof window !== "undefined") {
				window.removeEventListener("resize", resize);
			}
			if (canvas?.parentElement) {
				canvas.remove();
			}
			canvas = null;
			ctx = null;
			eventBus = null;
		},
	};
})();

if (typeof window !== "undefined") {
	window.EmberlightDynamicLights = EmberlightDynamicLights;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightDynamicLights;
}
