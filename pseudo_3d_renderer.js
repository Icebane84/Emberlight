/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTING ENGINE & CORRIDOR VIEWPORT (v2)
 * Document Identifier: VSRP-001-PSEUDO-3D-RENDERER
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-WAR-TABLE-001 / PRS-DES-013
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Module Configuration & Defaults
 *   [SEC-03] Tile Legend, Constants & Glyph Maps
 *   [SEC-04] Pure Math Core: Texture Baking & Fog Utilities
 *   [SEC-05] Pure Math Core: Camera Math & DDA Raycasting Kernel
 *   [SEC-06] Pure Math Core: Wall, Floor & Billboard Geometry Planning
 *   [SEC-07] Pure Math Core: Proximity Triggers & Frame Dirty Checking
 *   [SEC-08] Factory Instance: DOM Buffers & Viewport Buffering
 *   [SEC-09] Factory Instance: Pixel Rendering & HUD Pipeline
 *   [SEC-10] Factory Instance API & Singleton Facade Exports
 * ============================================================================
 */

const EmberlightPseudo3D = (() => {
	'use strict';

	//#region [SEC-01] Type Definitions & Contract Schemas
	/**
	 * @typedef {Object} RenderConfigFogVoid
	 * @property {number} r - Red channel value.
	 * @property {number} g - Green channel value.
	 * @property {number} b - Blue channel value.
	 */

	/**
	 * @typedef {Object} RenderConfigFog
	 * @property {number} exponentSurface - Surface fog exponent.
	 * @property {number} exponentDungeon - Dungeon fog exponent.
	 * @property {number} maxHorizonDungeon - Absolute view horizon underground.
	 * @property {RenderConfigFogVoid} voidSurface - Surface void color.
	 * @property {RenderConfigFogVoid} voidDungeon - Dungeon void color.
	 */

	/**
	 * @typedef {Object} RenderConfigBillboard
	 * @property {number} heightFactor - Billboard height scaling factor.
	 * @property {number} fadeExponent - Distance fade exponent.
	 * @property {number} fontMin - Minimum font size.
	 * @property {number} fontMax - Maximum font size.
	 */

	/**
	 * @typedef {Object} ProximityTriggerDef
	 * @property {string} tile - Target trigger map glyph tile.
	 * @property {string} eventName - Event bus publication token.
	 * @property {string} payloadTag - Event payload categorization tag.
	 * @property {number} enterRadius - Distance threshold to trigger entry.
	 * @property {number} exitRadius - Distance threshold to trigger exit.
	 * @property {function(any): boolean} [isArmed] - Optional arming predicate.
	 */

	/**
	 * @typedef {Object} RenderConfig
	 * @property {number} textureSize - Texture side dimension in pixels.
	 * @property {{ width: number, height: number, fovDeg: number }} standard - Standard viewport metrics.
	 * @property {{ width: number, height: number, fovDeg: number }} expanded - Expanded viewport metrics.
	 * @property {number} maxDepth - Maximum raycast view depth.
	 * @property {number} ddaMaxSteps - Maximum DDA iteration step count.
	 * @property {number} columnStride - Raycast horizontal column stride.
	 * @property {number} cameraLerpRate - Camera exponential smoothing decay rate.
	 * @property {number} wallHeightScale - Vertical wall height scale multiplier.
	 * @property {number} sideShadeFactor - North/south wall shading factor.
	 * @property {RenderConfigFog} fog - Fog configuration parameters.
	 * @property {RenderConfigBillboard} billboard - Billboard sizing and fade parameters.
	 * @property {{ radiusTiles: number }} minimap - Minimap grid radius.
	 * @property {{ enableFlickerWhileIdle: boolean, positionEpsilon: number, angleEpsilon: number, flickerEpsilon: number }} idle - Idle frame skipping configuration.
	 * @property {ProximityTriggerDef[]} proximityTriggers - Data-driven proximity trigger definitions.
	 */

	/**
	 * @typedef {Object} CameraState
	 * @property {number} x - Current camera world X position.
	 * @property {number} y - Current camera world Y position.
	 * @property {number} targetX - Target camera world X position.
	 * @property {number} targetY - Target camera world Y position.
	 * @property {number} angle - Current camera facing angle in radians.
	 * @property {number} targetAngle - Target camera facing angle in radians.
	 * @property {number} t - Elapsed internal animation time in seconds.
	 */

	/**
	 * @typedef {Object} RaycastResult
	 * @property {number} rayDirX - Ray direction X vector component.
	 * @property {number} rayDirY - Ray direction Y vector component.
	 * @property {string} hitTile - Hit wall tile glyph character.
	 * @property {number} side - DDA hit wall orientation side (0 for X-side, 1 for Y-side).
	 * @property {number} perpDist - Corrected perpendicular distance to hit point.
	 * @property {number} mapX - Integer map column grid coordinate.
	 * @property {number} mapY - Integer map row grid coordinate.
	 * @property {boolean} outOfBounds - Flag indicating ray exited map bounds.
	 */

	/**
	 * @typedef {Object} WallColumnPlan
	 * @property {number} drawStart - Screen Y pixel column start draw index.
	 * @property {number} drawEnd - Screen Y pixel column end draw index.
	 * @property {number} texX - Sampled integer texture column coordinate.
	 * @property {number} step - Texture vertical step increment per screen pixel.
	 * @property {number} texPosStart - Initial floating-point texture sample position.
	 */

	/**
	 * @typedef {Object} FloorRowPlan
	 * @property {number} rowDistance - World distance to the scanline row.
	 * @property {number} stepX - Floor world X coordinate increment per horizontal pixel.
	 * @property {number} stepY - Floor world Y coordinate increment per horizontal pixel.
	 * @property {number} floorX - Starting floor world X coordinate.
	 * @property {number} floorY - Starting floor world Y coordinate.
	 */

	/**
	 * @typedef {Object} VisibleSprite
	 * @property {number} x - Sprite world center X coordinate.
	 * @property {number} y - Sprite world center Y coordinate.
	 * @property {number} dist - Distance from camera to sprite.
	 * @property {string} tile - Map glyph tile representing the sprite.
	 */

	/**
	 * @typedef {Object} ProjectedSprite
	 * @property {number} spriteScreenX - Projected horizontal screen pixel X coordinate.
	 * @property {number} spriteH - Projected vertical screen height in pixels.
	 * @property {number} transformY - Transformed camera-space Y depth coordinate.
	 */

	/**
	 * @typedef {Object} GameState
	 * @property {string[][]} map - 2D grid map matrix.
	 * @property {{ x: number, y: number }} playerPos - Current player grid coordinates.
	 * @property {string} [facing] - Player cardinal facing direction token ('UP' | 'DOWN' | 'LEFT' | 'RIGHT').
	 * @property {number} [depth] - Subterranean dungeon depth level.
	 * @property {number} [dungeonDepth] - Alternate subterranean depth property.
	 * @property {Record<string, any>} [flags] - Gameplay state flags dictionary.
	 */

	/**
	 * @typedef {Object} RenderViewportInstance
	 * @property {function(any): RenderViewportInstance} init - Initializes DOM event listeners and canvas contexts.
	 * @property {function(boolean): void} setExpanded - Toggles expanded viewport mode.
	 * @property {function(): { width: number, height: number, isExpanded: boolean, fovDeg: number }} getDimensions - Returns current viewport dimensions.
	 * @property {function(any, number): void} update - Advances camera smoothing state.
	 * @property {function(): void} markDirty - Forces full redraw on next render pass.
	 * @property {function(GameState): any} render - Renders pseudo-3D corridor frame from game state.
	 * @property {function(): void} pause - Pauses rendering updates.
	 * @property {function(): void} resume - Resumes rendering updates.
	 * @property {function(): Object} getDiagnostics - Returns diagnostic telemetry metrics.
	 * @property {function(): void} destroy - Tears down DOM bindings and internal buffers.
	 * @property {function(Object): Readonly<{ accepted: boolean, driverId: string }>} configure - Configures runtime overrides.
	 * @property {function(): boolean} reset - Resets camera and latch states.
	 * @property {function(): Readonly<Object>} getState - Returns current instance state snapshot.
	 * @property {function(): Readonly<Object>} getModuleInfo - Returns module metadata manifest.
	 * @property {Object} [_test] - Headless unit test hooks.
	 */
	//#endregion

	//#region [SEC-02] Module Configuration & Defaults
	const DEFAULT_CONFIG = Object.freeze({
		textureSize: 32,
		standard: { width: 480, height: 260, fovDeg: 60 },
		expanded: { width: 960, height: 360, fovDeg: 75 },
		maxDepth: 8.5,
		ddaMaxSteps: 32,
		columnStride: 2,
		cameraLerpRate: 10,
		wallHeightScale: 1.05,
		sideShadeFactor: 0.75,
		fog: {
			exponentSurface: 1.25,
			exponentDungeon: 1.45,
			maxHorizonDungeon: 5.4,
			voidSurface: { r: 5, g: 5, b: 13 },
			voidDungeon: { r: 2, g: 2, b: 6 },
		},
		billboard: {
			heightFactor: 0.75,
			fadeExponent: 1.35,
			fontMin: 14,
			fontMax: 80,
		},
		minimap: { radiusTiles: 3 },
		idle: {
			enableFlickerWhileIdle: false,
			positionEpsilon: 0.001,
			angleEpsilon: 0.001,
			flickerEpsilon: 0.01,
		},
		proximityTriggers: [
			{
				tile: "K",
				eventName: "renderer:proximity_trigger",
				payloadTag: "boss_lair",
				enterRadius: 2.2,
				exitRadius: 2.8,
				isArmed: (/** @type {GameState} */ gameState) => !gameState?.flags?.boss_slain,
			},
		],
	});

	/**
	 * Deep merges base configuration with caller overrides.
	 * Pure data transformation procedure.
	 * @param {any} base - Base configuration object.
	 * @param {any} override - Override configuration object.
	 * @returns {any} Merged configuration object.
	 */
	function deepMerge(base, override) {
		if (!override) return base;
		const out = Array.isArray(base) ? base.slice() : { ...base };
		for (const key of Object.keys(override)) {
			const bVal = base ? base[key] : undefined;
			const oVal = override[key];
			if (
				oVal &&
				typeof oVal === "object" &&
				!Array.isArray(oVal) &&
				typeof bVal === "object" &&
				bVal !== null
			) {
				out[key] = deepMerge(bVal, oVal);
			} else {
				out[key] = oVal;
			}
		}
		return out;
	}
	//#endregion

	//#region [SEC-03] Tile Legend, Constants & Glyph Maps
	const TILE_LEGEND = Object.freeze({
		"#": "Structural stone wall. Blocking. Renders with BRICK texture.",
		B: "Timber/wood wall. Blocking. Renders with TIMBER texture.",
		F: "Fixture — a blocking obstacle that is not structural wall.",
		P: "Portcullis / iron gate. Blocking, but partially see-through.",
		T: "Town floor marker. Not blocking.",
		">": "Downward stairs. Traversal only — no proximity trigger.",
		"<": "Upward stairs / exit. Traversal only — no proximity trigger.",
		K: "Boss lair marker. Dedicated tile for boss-proximity events.",
		$: "Treasure billboard sprite.",
		C: "Campfire / torch billboard sprite.",
		E: "Elder / quest-giver NPC billboard sprite.",
		G: "Guardian / armored NPC billboard sprite.",
		V: "Villager / traveler billboard sprite.",
		"@": "Mount / pack-animal billboard sprite.",
		"~": "Water hazard billboard sprite.",
		"%": "Hazard / toxin zone billboard sprite.",
	});

	const BILLBOARD_GLYPHS = Object.freeze({
		$: "\u{1F4B0}",
		C: "\u{1F525}",
		E: "\u{1F9D3}",
		G: "\u{1F6E1}\u{FE0F}",
		V: "\u{1F464}",
		"@": "\u{1F42B}",
		">": "\u{1FA9C}",
		"<": "\u{1F6AA}",
		"~": "\u{1F30A}",
		"%": "\u{2623}\u{FE0F}",
	});

	const WALL_TILES = Object.freeze(new Set(["#", "B", "F", "P"]));

	const FACING_ANGLES = Object.freeze({
		UP: -Math.PI / 2,
		DOWN: Math.PI / 2,
		LEFT: Math.PI,
		RIGHT: 0,
	});

	/**
	 * Resolves billboard shadow color and blur parameters.
	 * Pure resolution helper.
	 * @param {string} tile - Billboard glyph tile character.
	 * @returns {{ color: string, blur: number }} Shadow style descriptor.
	 */
	function resolveBillboardShadow(tile) {
		if (tile === "C") return { color: "#f59e0b", blur: 18 };
		if (tile === "$") return { color: "#fbbf24", blur: 12 };
		if (tile === "%") return { color: "#c084fc", blur: 14 };
		return { color: "#ff9d4d", blur: 6 };
	}

	/**
	 * Returns minimap cell color for given map tile glyph.
	 * Pure evaluation helper.
	 * @param {string} tile - Map tile glyph character.
	 * @param {boolean} isOutOfBounds - Out of bounds flag.
	 * @returns {string} CSS color string.
	 */
	function getMinimapTileColor(tile, isOutOfBounds) {
		if (isOutOfBounds) return "#0a0d17";
		if (tile === "#" || tile === "B" || tile === "F") return "#334155";
		if (tile === "T") return "#14532d";
		if (tile === "~") return "#1e3a8a";
		if (tile === "%") return "#581c87";
		if (tile === "$") return "#f59e0b";
		if (tile === "C") return "#ef4444";
		if (tile === ">" || tile === "<" || tile === "K") return "#38bdf8";
		return "#1e293b";
	}

	/**
	 * Returns module metadata manifest.
	 * Pure manifest accessor gateway.
	 * @returns {Readonly<Object>} Constitutional metadata descriptor.
	 */
	function getModuleInfo() {
		return Object.freeze({
			driverId: "pseudo_3d_renderer",
			moduleName: "EmberlightPseudo3D",
			version: "2.0.0",
			protocol: "VSRP-001",
			classification: "Peripheral Capability Driver & 3D Corridor Viewport",
			specDoc: "VSRP-001 / ARCH-SPEC-WAR-TABLE-001 / PRS-DES-013",
		});
	}
	//#endregion

	//#region [SEC-04] Pure Math Core: Texture Baking & Fog Utilities
	const RaycastMath = (() => {
		/**
		 * Packs RGBA color components into a 32-bit integer pixel value.
		 * Pure calculation helper.
		 * @param {number} r - Red channel (0-255).
		 * @param {number} g - Green channel (0-255).
		 * @param {number} b - Blue channel (0-255).
		 * @param {number} [a=255] - Alpha channel (0-255).
		 * @returns {number} Packed 32-bit color integer.
		 */
		function packColor(r, g, b, a = 255) {
			return (a << 24) | (b << 16) | (g << 8) | r;
		}

		/**
		 * Bakes brick wall texture buffer.
		 * Pure texture generation procedure.
		 * @param {number} size - Texture width and height dimension.
		 * @returns {Uint32Array} Baked texture pixel buffer.
		 */
		function bakeBrickTexture(size) {
			const tex = new Uint32Array(size * size);
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const isMortarH =
						y === 0 || y === Math.floor(size / 2) - 1 || y === size - 1;
					const isMortarV1 = y < size / 2 && x === 0;
					const isMortarV2 = y >= size / 2 && x === Math.floor(size / 2);
					if (isMortarH || isMortarV1 || isMortarV2) {
						tex[y * size + x] = packColor(18, 18, 30);
					} else {
						const noise = ((x * 17 + y * 29) % 23) - 11;
						const base = 48 + noise;
						tex[y * size + x] = packColor(base, base + 2, base + 14);
					}
				}
			}
			return tex;
		}

		/**
		 * Bakes timber wall texture buffer.
		 * Pure texture generation procedure.
		 * @param {number} size - Texture dimension.
		 * @returns {Uint32Array} Baked texture pixel buffer.
		 */
		function bakeTimberTexture(size) {
			const tex = new Uint32Array(size * size);
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const isSeam = x % 8 === 0;
					const grain = Math.sin(y * 0.8) * 6;
					if (isSeam) {
						tex[y * size + x] = packColor(30, 15, 5);
					} else {
						const r = Math.max(0, 95 + grain);
						const g = Math.max(0, 55 + grain * 0.5);
						tex[y * size + x] = packColor(r, g, 20);
					}
				}
			}
			return tex;
		}

		/**
		 * Bakes rubble fixture texture buffer.
		 * Pure texture generation procedure.
		 * @param {number} size - Texture dimension.
		 * @returns {Uint32Array} Baked texture pixel buffer.
		 */
		function bakeRubbleTexture(size) {
			const tex = new Uint32Array(size * size);
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const noise = ((x * 31 + y * 11) % 19) - 9;
					const base = 40 + noise;
					tex[y * size + x] = packColor(base + 4, base + 2, base);
				}
			}
			return tex;
		}

		/**
		 * Bakes portcullis gate texture buffer.
		 * Pure texture generation procedure.
		 * @param {number} size - Texture dimension.
		 * @returns {Uint32Array} Baked texture pixel buffer.
		 */
		function bakePortcullisTexture(size) {
			const tex = new Uint32Array(size * size);
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const isBar =
						x % 6 < 2 ||
						y === Math.floor(size / 4) ||
						y === Math.floor((size * 3) / 4);
					if (isBar) {
						const iron = x % 6 === 0 ? 140 : 80;
						tex[y * size + x] = packColor(iron, iron, iron + 10);
					} else {
						tex[y * size + x] = 0;
					}
				}
			}
			return tex;
		}

		/**
		 * Bakes floor texture buffer.
		 * Pure texture generation procedure.
		 * @param {number} size - Texture dimension.
		 * @returns {Uint32Array} Baked texture pixel buffer.
		 */
		function bakeFloorTexture(size) {
			const tex = new Uint32Array(size * size);
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const isJoint = x === 0 || y === 0;
					if (isJoint) {
						tex[y * size + x] = packColor(10, 10, 18);
					} else {
						const d = (x * 13 + y * 7) % 17;
						tex[y * size + x] = packColor(22 + d, 22 + d, 32 + d);
					}
				}
			}
			return tex;
		}

		/**
		 * Bakes ceiling texture buffer.
		 * Pure texture generation procedure.
		 * @param {number} size - Texture dimension.
		 * @returns {Uint32Array} Baked texture pixel buffer.
		 */
		function bakeCeilingTexture(size) {
			const tex = new Uint32Array(size * size);
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					const isBeam = y % 16 < 3;
					if (isBeam) {
						tex[y * size + x] = packColor(35, 20, 10);
					} else {
						const d = x % 4;
						tex[y * size + x] = packColor(10 + d, 10 + d, 20 + d);
					}
				}
			}
			return tex;
		}

		/**
		 * Bakes all structural textures for the renderer instance.
		 * Pure initialization helper.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @returns {Object.<string, Uint32Array>} Dictionary of baked texture buffers.
		 */
		function bakeTextures(config) {
			const size = config.textureSize;
			return {
				BRICK: bakeBrickTexture(size),
				TIMBER: bakeTimberTexture(size),
				RUBBLE: bakeRubbleTexture(size),
				PORTCULLIS: bakePortcullisTexture(size),
				FLOOR: bakeFloorTexture(size),
				CEILING: bakeCeilingTexture(size),
			};
		}

		/**
		 * Resolves wall texture key based on hit tile glyph and town mode state.
		 * Pure resolution procedure.
		 * @param {string} hitTile - Hit map tile glyph character.
		 * @param {boolean} isTown - Town mode activation flag.
		 * @returns {string} Texture key identifier.
		 */
		function resolveWallTextureKey(hitTile, isTown) {
			if (hitTile === "P") return "PORTCULLIS";
			if (hitTile === "F") return "RUBBLE";
			if (hitTile === "B" || isTown) return "TIMBER";
			return "BRICK";
		}

		/**
		 * Applies distance fog and torch flicker attenuation to color.
		 * Pure color shading calculation.
		 * @param {number} color - Packed input color integer.
		 * @param {number} distance - Distance to camera.
		 * @param {number} torchFlicker - Current torch flicker multiplier.
		 * @param {boolean} isDungeon - Subterranean dungeon mode flag.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @returns {number} Shaded packed color integer.
		 */
		function applyFog(color, distance, torchFlicker, isDungeon, config) {
			if (color === 0) return 0;
			const fog = config.fog;
			const maxHorizon = isDungeon ? fog.maxHorizonDungeon : config.maxDepth;
			const fogMax = maxHorizon * torchFlicker;
			const exponent = isDungeon ? fog.exponentDungeon : fog.exponentSurface;
			const fogRatio = Math.min(
				1.0,
				Math.max(0.0, (distance / fogMax) ** exponent),
			);

			const r = color & 0xff;
			const g = (color >> 8) & 0xff;
			const b = (color >> 16) & 0xff;

			const voidColor = isDungeon ? fog.voidDungeon : fog.voidSurface;

			const fr = Math.trunc(r + (voidColor.r - r) * fogRatio);
			const fg = Math.trunc(g + (voidColor.g - g) * fogRatio);
			const fb = Math.trunc(b + (voidColor.b - b) * fogRatio);

			return packColor(fr, fg, fb);
		}
		//#endregion

		//#region [SEC-05] Pure Math Core: Camera Math & DDA Raycasting Kernel
		/**
		 * Computes cosine and sine vectors for camera facing angle.
		 * Pure mathematical calculation.
		 * @param {CameraState} camera - Current camera state object.
		 * @returns {{ cosA: number, sinA: number }} Computed cosine and sine values.
		 */
		function computeCameraPlane(camera) {
			const cosA = Math.cos(camera.angle);
			const sinA = Math.sin(camera.angle);
			return { cosA, sinA };
		}

		/**
		 * Computes camera projection plane vectors for given field of view.
		 * Pure mathematical calculation.
		 * @param {CameraState} camera - Camera state object.
		 * @param {number} fovRad - Field of view angle in radians.
		 * @param {number} cosA - Cosine of camera angle.
		 * @param {number} sinA - Sine of camera angle.
		 * @returns {{ planeX: number, planeY: number }} Projection plane vector components.
		 */
		function computeFov(camera, fovRad, cosA, sinA) {
			const fovScale = Math.tan(fovRad / 2);
			return { planeX: -sinA * fovScale, planeY: cosA * fovScale };
		}

		/**
		 * Casts a single DDA ray across the grid map.
		 * Pure raycasting calculation procedure.
		 * @param {CameraState} camera - Camera state object.
		 * @param {number} cameraX - Normalized screen column coordinate (-1 to 1).
		 * @param {{ cosA: number, sinA: number, planeX: number, planeY: number }} plane - Camera plane and vector components.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @returns {RaycastResult} Raycast intersection result descriptor.
		 */
		function castDdaRay(
			camera,
			cameraX,
			plane,
			map,
			config,
		) {
			const { cosA, sinA, planeX, planeY } = plane;
			const rayDirX = cosA + planeX * cameraX;
			const rayDirY = sinA + planeY * cameraX;

			let mapX = Math.trunc(camera.x);
			let mapY = Math.trunc(camera.y);

			const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
			const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

			const stepX = rayDirX < 0 ? -1 : 1;
			let sideDistX =
				rayDirX < 0
					? (camera.x - mapX) * deltaDistX
					: (mapX + 1.0 - camera.x) * deltaDistX;

			const stepY = rayDirY < 0 ? -1 : 1;
			let sideDistY =
				rayDirY < 0
					? (camera.y - mapY) * deltaDistY
					: (mapY + 1.0 - camera.y) * deltaDistY;

			let side = 0;
			let hitTile = "#";
			let loopCount = 0;
			let outOfBounds = false;

			while (loopCount++ < config.ddaMaxSteps) {
				if (sideDistX < sideDistY) {
					sideDistX += deltaDistX;
					mapX += stepX;
					side = 0;
				} else {
					sideDistY += deltaDistY;
					mapY += stepY;
					side = 1;
				}

				if (
					mapY < 0 ||
					mapY >= map.length ||
					mapX < 0 ||
					mapX >= map[0].length
				) {
					outOfBounds = true;
					break;
				}

				const tile = map[mapY][mapX];
				if (WALL_TILES.has(tile)) {
					hitTile = tile;
					break;
				}
			}

			let perpDist =
				side === 0
					? (mapX - camera.x + (1 - stepX) / 2) / rayDirX
					: (mapY - camera.y + (1 - stepY) / 2) / rayDirY;

			perpDist = Math.max(0.1, perpDist);

			return {
				rayDirX,
				rayDirY,
				hitTile,
				side,
				perpDist,
				mapX,
				mapY,
				outOfBounds,
			};
		}
		//#endregion

		//#region [SEC-06] Pure Math Core: Wall, Floor & Billboard Geometry Planning
		/**
		 * Computes geometry plan for rendering a single vertical wall column.
		 * Pure geometry calculation procedure.
		 * @param {RaycastResult} ray - Raycast intersection result.
		 * @param {CameraState} camera - Camera state object.
		 * @param {{ width: number, height: number }} dims - Viewport dimensions.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @returns {WallColumnPlan} Wall column draw plan descriptor.
		 */
		function computeWallColumnPlan(ray, camera, dims, config) {
			const { rayDirX, rayDirY, side, perpDist } = ray;
			const lineHeight = Math.trunc(
				(dims.height / perpDist) * config.wallHeightScale,
			);
			const halfH = dims.height / 2;
			const drawStart = Math.max(0, Math.trunc(halfH - lineHeight / 2));
			const drawEnd = Math.min(
				dims.height - 1,
				Math.trunc(halfH + lineHeight / 2),
			);

			let wallX =
				side === 0
					? camera.y + perpDist * rayDirY
					: camera.x + perpDist * rayDirX;
			wallX -= Math.floor(wallX);
			const size = config.textureSize;
			let texX = Math.trunc(wallX * size) & (size - 1);
			if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
				texX = size - texX - 1;
			}

			const step = size / lineHeight;
			const texPosStart = (drawStart - halfH + lineHeight / 2) * step;

			return { drawStart, drawEnd, texX, step, texPosStart };
		}

		/**
		 * Computes geometry plan for rendering a floor/ceiling scanline row.
		 * Pure geometry calculation procedure.
		 * @param {number} y - Current screen row Y coordinate.
		 * @param {CameraState} camera - Camera state object.
		 * @param {number} planeX - Projection plane X vector component.
		 * @param {number} planeY - Projection plane Y vector component.
		 * @param {number} cosA - Cosine of camera angle.
		 * @param {number} sinA - Sine of camera angle.
		 * @param {{ width: number, height: number }} dims - Viewport dimensions.
		 * @returns {FloorRowPlan} Floor scanline row plan descriptor.
		 */
		function computeFloorRowPlan(y, camera, planeX, planeY, cosA, sinA, dims) {
			const halfH = dims.height / 2;
			const p = y - halfH;
			const rowDistance = halfH / p;
			const stepX = (rowDistance * (planeX * 2)) / dims.width;
			const stepY = (rowDistance * (planeY * 2)) / dims.width;
			const floorX = camera.x + rowDistance * (cosA - planeX);
			const floorY = camera.y + rowDistance * (sinA - planeY);
			return { rowDistance, stepX, stepY, floorX, floorY };
		}

		/**
		 * Smooths camera position and orientation using time-based exponential decay.
		 * Pure state transformation procedure.
		 * @param {CameraState} camera - Current camera state object.
		 * @param {number} dt - Frame delta time in seconds.
		 * @param {number} rate - Exponential decay smoothing rate.
		 * @returns {CameraState} New interpolated camera state object.
		 */
		function lerpCamera(camera, dt, rate) {
			const t = 1 - Math.exp(-rate * dt);
			let dAngle = camera.targetAngle - camera.angle;
			while (dAngle < -Math.PI) dAngle += Math.PI * 2;
			while (dAngle > Math.PI) dAngle -= Math.PI * 2;

			return {
				...camera,
				x: camera.x + (camera.targetX - camera.x) * t,
				y: camera.y + (camera.targetY - camera.y) * t,
				angle: camera.angle + dAngle * t,
			};
		}

		/**
		 * Computes visible billboard sprites within view depth.
		 * Pure spatial collection procedure.
		 * @param {CameraState} camera - Camera state object.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @returns {VisibleSprite[]} Sorted array of visible sprites.
		 */
		function computeVisibleSprites(camera, map, config) {
			const sprites = [];
			const minX = Math.max(0, Math.trunc(camera.x - config.maxDepth));
			const maxX = Math.min(
				map[0].length - 1,
				Math.trunc(camera.x + config.maxDepth),
			);
			const minY = Math.max(0, Math.trunc(camera.y - config.maxDepth));
			const maxY = Math.min(
				map.length - 1,
				Math.trunc(camera.y + config.maxDepth),
			);

			for (let y = minY; y <= maxY; y++) {
				for (let x = minX; x <= maxX; x++) {
					const tile = map[y][x];
					if (BILLBOARD_GLYPHS[tile]) {
						const dx = x + 0.5 - camera.x;
						const dy = y + 0.5 - camera.y;
						const dist = Math.hypot(dx, dy);
						if (dist > 0.35 && dist < config.maxDepth) {
							sprites.push({ x: x + 0.5, y: y + 0.5, dist, tile });
						}
					}
				}
			}
			return sprites.sort((a, b) => b.dist - a.dist);
		}

		/**
		 * Projects a 3D world sprite onto 2D screen coordinates.
		 * Pure projection calculation procedure.
		 * @param {CameraState} camera - Camera state object.
		 * @param {VisibleSprite} sprite - Target sprite descriptor.
		 * @param {number} planeX - Projection plane X vector.
		 * @param {number} planeY - Projection plane Y vector.
		 * @param {number} cosA - Cosine of camera angle.
		 * @param {number} sinA - Sine of camera angle.
		 * @param {{ width: number, height: number }} dims - Viewport dimensions.
		 * @returns {ProjectedSprite | null} Projected sprite screen metrics or null if behind camera.
		 */
		function projectSprite(camera, sprite, planeX, planeY, cosA, sinA, dims) {
			const invDet = 1.0 / (planeX * sinA - cosA * planeY || 1e-6);
			const spX = sprite.x - camera.x;
			const spY = sprite.y - camera.y;

			const transformX = invDet * (sinA * spX - cosA * spY);
			const transformY = invDet * (-planeY * spX + planeX * spY);

			if (transformY <= 0.2) return null;

			const spriteScreenX = Math.trunc(
				(dims.width / 2) * (1 + transformX / transformY),
			);
			const spriteH = Math.trunc(Math.abs((dims.height / transformY) * 0.75));

			return { spriteScreenX, spriteH, transformY };
		}
		//#endregion

		//#region [SEC-07] Pure Math Core: Proximity Triggers & Frame Dirty Checking
		function evaluateTriggerCell(trigger, pos, ctx) {
			const { x, y } = pos;
			const { camera, gameState, nextLatches, events } = ctx;
			const latchKey = `${trigger.tile}:${x}:${y}`;
			const dist = Math.hypot(x + 0.5 - camera.x, y + 0.5 - camera.y);
			const wasLatched = nextLatches.get(latchKey) === true;
			const armed = typeof trigger.isArmed === "function" ? trigger.isArmed(gameState) : true;

			if (armed && !wasLatched && dist <= trigger.enterRadius) {
				nextLatches.set(latchKey, true);
				events.push({
					eventName: trigger.eventName,
					payload: {
						tag: trigger.payloadTag,
						tile: trigger.tile,
						x,
						y,
						distance: dist,
						phase: "enter",
					},
				});
				return;
			}
			if (wasLatched && dist > trigger.exitRadius) {
				nextLatches.set(latchKey, false);
				events.push({
					eventName: trigger.eventName,
					payload: {
						tag: trigger.payloadTag,
						tile: trigger.tile,
						x,
						y,
						distance: dist,
						phase: "exit",
					},
				});
			}
		}

		function evaluateTriggerRow(trigger, y, rangeX, ctx, map) {
			for (let x = rangeX.minX; x <= rangeX.maxX; x++) {
				if (map[y][x] === trigger.tile) {
					evaluateTriggerCell(trigger, { x, y }, ctx);
				}
			}
		}

		/**
		 * Evaluates camera proximity triggers against map entities.
		 * Pure evaluation procedure.
		 * @param {CameraState} camera - Camera state object.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @param {GameState} gameState - Current game state snapshot.
		 * @param {Map<string, boolean>} prevLatches - Previous trigger latch state map.
		 * @returns {{ events: Array<{ eventName: string, payload: any }>, nextLatches: Map<string, boolean> }} Evaluated events and updated latches.
		 */
		function evaluateProximityTriggers(
			camera,
			map,
			config,
			gameState,
			prevLatches,
		) {
			const events = [];
			const nextLatches = new Map(prevLatches);
			const triggers = config.proximityTriggers || [];
			if (triggers.length === 0) return { events, nextLatches };

			const minX = Math.max(0, Math.trunc(camera.x - config.maxDepth));
			const maxX = Math.min(
				map[0].length - 1,
				Math.trunc(camera.x + config.maxDepth),
			);
			const minY = Math.max(0, Math.trunc(camera.y - config.maxDepth));
			const maxY = Math.min(
				map.length - 1,
				Math.trunc(camera.y + config.maxDepth),
			);

			const ctx = { camera, gameState, nextLatches, events };
			const rangeX = { minX, maxX };

			for (const trigger of triggers) {
				for (let y = minY; y <= maxY; y++) {
					evaluateTriggerRow(trigger, y, rangeX, ctx, map);
				}
			}

			return { events, nextLatches };
		}

		/**
		 * Determines whether camera or environment movement requires a full frame redraw.
		 * Pure comparison function.
		 * @param {any} prev - Previous frame descriptor.
		 * @param {any} next - Current frame descriptor.
		 * @param {RenderConfig} config - Engine configuration dictionary.
		 * @returns {boolean} True if frame is dirty and requires redraw.
		 */
		function isDirty(prev, next, config) {
			if (!prev) return true;
			const idle = config.idle;
			if (Math.abs(next.x - prev.x) > idle.positionEpsilon) return true;
			if (Math.abs(next.y - prev.y) > idle.positionEpsilon) return true;
			let dAngle = Math.abs(next.angle - prev.angle);
			if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
			if (dAngle > idle.angleEpsilon) return true;
			if (next.mapRef !== prev.mapRef) return true;
			if (next.isTown !== prev.isTown || next.isDungeon !== prev.isDungeon)
				return true;
			if (
				idle.enableFlickerWhileIdle &&
				Math.abs(next.torchFlicker - prev.torchFlicker) > idle.flickerEpsilon
			)
				return true;
			return false;
		}

		return {
			packColor,
			bakeTextures,
			resolveWallTextureKey,
			applyFog,
			computeCameraPlane,
			computeFov,
			castDdaRay,
			computeWallColumnPlan,
			computeFloorRowPlan,
			lerpCamera,
			computeVisibleSprites,
			projectSprite,
			evaluateProximityTriggers,
			isDirty,
			FACING_ANGLES,
			WALL_TILES,
		};
	})();
	//#endregion

	//#region [SEC-08] Factory Instance: DOM Buffers & Viewport Buffering
	/**
	 * Creates an isolated pseudo-3D viewport instance.
	 * State-initializing factory procedure.
	 * @param {Object} [options={}] - Instance creation options dictionary.
	 * @param {RenderConfig} [options.config] - Custom configuration overrides.
	 * @param {boolean} [options.isHeadless] - Headless execution mode flag.
	 * @param {any} [options.eventBus] - Host event bus handle.
	 * @param {string} [options.canvasId] - Main canvas DOM element ID.
	 * @param {string} [options.minimapCanvasId] - Minimap canvas DOM element ID.
	 * @param {string} [options.compassRibbonId] - Compass ribbon DOM element ID.
	 * @param {string} [options.minimapOverlayId] - Minimap overlay DOM element ID.
	 * @returns {RenderViewportInstance} Configured pseudo-3D viewport instance.
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

		/** @type {CameraState} */
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

		/**
		 * Returns current viewport dimensions.
		 * Pure accessor helper.
		 * @returns {{ width: number, height: number }} Viewport dimensions.
		 */
		function dims() {
			return { width: W, height: H };
		}

		/**
		 * Attaches DOM canvas elements and rendering contexts.
		 * State-mutating DOM binding procedure.
		 * @returns {void}
		 */
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

		/**
		 * Resizes pixel buffers and projection dimensions.
		 * State-mutating buffer allocation procedure.
		 * @param {number} targetW - Target width in pixels.
		 * @param {number} targetH - Target height in pixels.
		 * @param {number} targetFovRad - Target field of view in radians.
		 * @returns {void}
		 */
		function resizeBuffers(targetW, targetH, targetFovRad) {
			W = targetW;
			H = targetH;
			FOV = targetFovRad;
			depthBuffer = new Float32Array(W);
			attachDom();
		}

		/**
		 * Ensures pixel buffers and canvas contexts are allocated and valid.
		 * State-mutating buffer verification procedure.
		 * @returns {void}
		 */
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
		//#endregion

		//#region [SEC-09] Factory Instance: Pixel Rendering & HUD Pipeline
		/**
		 * Computes raw sky color for scanline row.
		 * Pure calculation helper.
		 * @param {number} y - Row Y coordinate.
		 * @returns {number} Packed color integer.
		 */
		function getSkyColor(y) {
			const halfH = H / 2;
			const skyRatio = (y - halfH) / halfH;
			const sr = Math.floor(6 + skyRatio * 10);
			const sg = Math.floor(10 + skyRatio * 18);
			const sb = Math.floor(22 + skyRatio * 32);
			return RaycastMath.packColor(sr, sg, sb);
		}

		/**
		 * Processes a single scanline row for floors and ceilings.
		 * State-mutating pixel buffer helper.
		 * @param {number} y - Row Y coordinate.
		 * @param {{ planeX: number, planeY: number, cosA: number, sinA: number }} plane - Projection plane vectors.
		 * @param {{ torchFlicker: number, isTown: boolean, isDungeon: boolean }} lighting - Lighting parameters.
		 * @returns {void}
		 */
		function processFloorScanline(y, plane, lighting) {
			const { planeX, planeY, cosA, sinA } = plane;
			const { torchFlicker, isTown, isDungeon } = lighting;
			const plan = RaycastMath.computeFloorRowPlan(
				y,
				camera,
				planeX,
				planeY,
				cosA,
				sinA,
				dims(),
			);
			let { floorX, floorY } = plan;
			const ceilY = H - y;
			const rowOffsetFloor = y * W;
			const rowOffsetCeil = ceilY * W;
			const size = config.textureSize;
			const floorTex = isTown ? textures.TIMBER : textures.FLOOR;
			const ceilTex = textures.CEILING;
			const stride = config.columnStride;

			for (let x = 0; x < W; x += stride) {
				const tx = Math.trunc(floorX * size) & (size - 1);
				const ty = Math.trunc(floorY * size) & (size - 1);
				const texIdx = ty * size + tx;

				const shadedFloor = RaycastMath.applyFog(
					floorTex[texIdx],
					plan.rowDistance,
					torchFlicker,
					isDungeon,
					config,
				);
				for (let k = 0; k < stride && x + k < W; k++)
					pixelBuf[rowOffsetFloor + x + k] = shadedFloor;

				const rawCeil = (isDungeon || isTown) ? ceilTex[texIdx] : getSkyColor(y);
				const shadedCeil = RaycastMath.applyFog(
					rawCeil,
					plan.rowDistance,
					torchFlicker,
					isDungeon,
					config,
				);
				for (let k = 0; k < stride && x + k < W; k++)
					pixelBuf[rowOffsetCeil + x + k] = shadedCeil;

				floorX += plan.stepX * stride;
				floorY += plan.stepY * stride;
			}
		}

		/**
		 * Renders floor and ceiling pixels onto the pixel buffer.
		 * State-mutating pixel buffer rendering procedure.
		 * @param {number} torchFlicker - Current torch flicker multiplier.
		 * @param {boolean} isTown - Town mode activation flag.
		 * @param {boolean} isDungeon - Subterranean dungeon mode flag.
		 * @returns {void}
		 */
		function renderFloorAndCeiling(torchFlicker, isTown, isDungeon) {
			if (!pixelBuf) return;
			const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
			const { planeX, planeY } = RaycastMath.computeFov(
				camera,
				FOV,
				cosA,
				sinA,
			);
			const plane = { planeX, planeY, cosA, sinA };
			const lighting = { torchFlicker, isTown, isDungeon };
			const halfH = H / 2;

			for (let y = Math.trunc(halfH) + 1; y < H; y++) {
				processFloorScanline(y, plane, lighting);
			}
		}

		/**
		 * Renders a single vertical wall column onto the pixel buffer.
		 * State-mutating pixel buffer helper.
		 * @param {number} x - Column X coordinate.
		 * @param {string[][]} map - Map matrix.
		 * @param {{ cosA: number, sinA: number, planeX: number, planeY: number }} plane - Camera plane vectors.
		 * @param {number} torchFlicker - Torch flicker factor.
		 * @param {boolean} isTown - Town mode flag.
		 * @returns {void}
		 */
		function renderWallColumn(x, map, plane, torchFlicker, isTown) {
			const cameraX = (2 * x) / W - 1;
			const ray = RaycastMath.castDdaRay(
				camera,
				cameraX,
				plane,
				map,
				config,
			);
			for (let k = 0; k < config.columnStride && x + k < W; k++)
				depthBuffer[x + k] = ray.perpDist;

			const plan = RaycastMath.computeWallColumnPlan(
				ray,
				camera,
				dims(),
				config,
			);
			const texKey = RaycastMath.resolveWallTextureKey(ray.hitTile, isTown);
			const activeTex = textures[texKey];
			let texPos = plan.texPosStart;
			const size = config.textureSize;

			for (let y = plan.drawStart; y <= plan.drawEnd; y++) {
				const texY = Math.trunc(texPos) & (size - 1);
				texPos += plan.step;
				let color = activeTex[texY * size + plan.texX];

				if (color !== 0) {
					if (ray.side === 1) {
						const f = config.sideShadeFactor;
						const r = Math.trunc((color & 0xff) * f);
						const g = Math.trunc(((color >> 8) & 0xff) * f);
						const b = Math.trunc(((color >> 16) & 0xff) * f);
						color = RaycastMath.packColor(r, g, b);
					}
					const shaded = RaycastMath.applyFog(
						color,
						ray.perpDist,
						torchFlicker,
						false,
						config,
					);
					for (let k = 0; k < config.columnStride && x + k < W; k++)
						pixelBuf[y * W + x + k] = shaded;
				}
			}
		}

		/**
		 * Renders vertical wall columns onto the pixel buffer.
		 * State-mutating pixel buffer rendering procedure.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {number} torchFlicker - Torch flicker multiplier.
		 * @param {boolean} isTown - Town mode activation flag.
		 * @returns {void}
		 */
		function renderWalls(map, torchFlicker, isTown) {
			if (!pixelBuf) return;
			const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
			const { planeX, planeY } = RaycastMath.computeFov(
				camera,
				FOV,
				cosA,
				sinA,
			);
			const plane = { cosA, sinA, planeX, planeY };
			const stride = config.columnStride;

			for (let x = 0; x < W; x += stride) {
				renderWallColumn(x, map, plane, torchFlicker, isTown);
			}
		}

		/**
		 * Renders a single sprite billboard onto the canvas context.
		 * State-mutating canvas drawing helper.
		 * @param {VisibleSprite} sp - Visible sprite descriptor.
		 * @param {number} planeX - Projection plane X.
		 * @param {number} planeY - Projection plane Y.
		 * @param {number} cosA - Cosine of angle.
		 * @param {number} sinA - Sine of angle.
		 * @param {number} torchFlicker - Torch flicker factor.
		 * @returns {void}
		 */
		function drawSpriteBillboard(sp, planeX, planeY, cosA, sinA, torchFlicker) {
			const glyph = BILLBOARD_GLYPHS[sp.tile];
			if (!glyph) return;
			const proj = RaycastMath.projectSprite(
				camera,
				sp,
				planeX,
				planeY,
				cosA,
				sinA,
				dims(),
			);
			if (!proj) return;
			if (proj.spriteScreenX < 0 || proj.spriteScreenX >= W) return;
			if (proj.transformY >= depthBuffer[proj.spriteScreenX]) return;

			if (!ctx) return;
			ctx.save();
			const fontSize = Math.max(
				config.billboard.fontMin,
				Math.min(config.billboard.fontMax, proj.spriteH),
			);
			ctx.font = `${fontSize}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.globalAlpha = Math.max(
				0.15,
				1.0 -
				(sp.dist / (config.maxDepth * torchFlicker)) **
				config.billboard.fadeExponent,
			);

			const shadow = resolveBillboardShadow(sp.tile);
			ctx.shadowColor = shadow.color;
			ctx.shadowBlur = shadow.blur;
			if (ctx.fillText)
				ctx.fillText(glyph, proj.spriteScreenX, H / 2 + proj.spriteH * 0.08);
			ctx.restore();
		}

		/**
		 * Renders visible billboard sprites onto the 2D canvas context.
		 * State-mutating canvas drawing procedure.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {number} torchFlicker - Torch flicker multiplier.
		 * @returns {void}
		 */
		function renderBillboards(map, torchFlicker) {
			if (!ctx) return;
			const sprites = RaycastMath.computeVisibleSprites(camera, map, config);
			if (sprites.length === 0) return;

			const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
			const { planeX, planeY } = RaycastMath.computeFov(
				camera,
				FOV,
				cosA,
				sinA,
			);

			for (const sp of sprites) {
				drawSpriteBillboard(sp, planeX, planeY, cosA, sinA, torchFlicker);
			}
		}

		/**
		 * Updates compass ribbon DOM element bearing text.
		 * State-mutating DOM manipulation procedure.
		 * @param {number} angle - Camera facing angle in radians.
		 * @returns {void}
		 */
		function updateCompassRibbon(angle) {
			if (typeof document === "undefined") return;
			const el = document.getElementById(compassRibbonId);
			if (!el) return;
			let deg = ((angle * 180) / Math.PI + 90) % 360;
			if (deg < 0) deg += 360;
			deg = Math.trunc(deg);
			let cardinal = "NORTH";
			if (deg >= 45 && deg < 135) cardinal = "EAST";
			else if (deg >= 135 && deg < 225) cardinal = "SOUTH";
			else if (deg >= 225 && deg < 315) cardinal = "WEST";
			el.textContent = `\u25B2 ${cardinal} (${deg.toString().padStart(3, "0")}\u00B0)`;
		}

		/**
		 * Renders a single cell on the minimap radar.
		 * State-mutating canvas drawing helper.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {{ x: number, y: number }} playerPos - Player coordinates.
		 * @param {number} radius - Minimap radius.
		 * @param {number} cellW - Cell width.
		 * @param {number} cellH - Cell height.
		 * @param {number} dx - Grid X delta.
		 * @param {number} dy - Grid Y delta.
		 * @returns {void}
		 */
		function drawMinimapCell(map, playerPos, radius, cellW, cellH, dx, dy) {
			if (!minimapCtx) return;
			const gx = playerPos.x + dx;
			const gy = playerPos.y + dy;
			const rx = (dx + radius) * cellW;
			const ry = (dy + radius) * cellH;
			const oob = gy < 0 || gy >= map.length || gx < 0 || gx >= map[0].length;
			const tile = oob ? "" : map[gy][gx];
			minimapCtx.fillStyle = getMinimapTileColor(tile, oob);
			minimapCtx.fillRect(rx, ry, cellW - 1, cellH - 1);
		}

		/**
		 * Renders minimap radar overlay onto minimap canvas context.
		 * State-mutating canvas drawing procedure.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {{ x: number, y: number }} playerPos - Player grid coordinates.
		 * @returns {void}
		 */
		function renderMinimapRadar(map, playerPos) {
			if (!minimapCtx || !minimapCanvas || !map || !playerPos) return;
			const mw = minimapCanvas.width,
				mh = minimapCanvas.height;
			const radius = config.minimap.radiusTiles;
			const cellW = mw / (radius * 2 + 1);
			const cellH = mh / (radius * 2 + 1);

			minimapCtx.fillStyle = "rgba(5, 8, 18, 0.95)";
			minimapCtx.fillRect(0, 0, mw, mh);

			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					drawMinimapCell(map, playerPos, radius, cellW, cellH, dx, dy);
				}
			}

			const pcx = radius * cellW + cellW / 2,
				pcy = radius * cellH + cellH / 2;
			minimapCtx.fillStyle = "#fbbf24";
			minimapCtx.beginPath();
			minimapCtx.arc(pcx, pcy, Math.min(cellW, cellH) * 0.35, 0, Math.PI * 2);
			minimapCtx.fill();

			const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
			minimapCtx.strokeStyle = "#38bdf8";
			minimapCtx.lineWidth = 1.5;
			minimapCtx.beginPath();
			minimapCtx.moveTo(pcx, pcy);
			minimapCtx.lineTo(
				pcx + cosA * (cellW * 0.85),
				pcy + sinA * (cellH * 0.85),
			);
			minimapCtx.stroke();

			minimapCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
			minimapCtx.lineWidth = 1;
			minimapCtx.strokeRect(0, 0, mw, mh);
		}

		/**
		 * Renders lighting vignette overlay.
		 * State-mutating canvas drawing helper.
		 * @param {boolean} isDungeon - Dungeon mode flag.
		 * @returns {void}
		 */
		function renderVignette(isDungeon) {
			if (!ctx?.createRadialGradient || !ctx.fillRect) return;
			ctx.save();
			const vignette = ctx.createRadialGradient(
				W / 2,
				H / 2,
				isDungeon ? 25 : 40,
				W / 2,
				H / 2,
				W * (isDungeon ? 0.5 : 0.55),
			);
			if (isDungeon) {
				vignette.addColorStop(0, "rgba(255, 140, 50, 0.05)");
				vignette.addColorStop(0.55, "rgba(5, 3, 10, 0.45)");
				vignette.addColorStop(1, "rgba(2, 2, 6, 0.96)");
			} else {
				vignette.addColorStop(0, "rgba(255, 157, 77, 0.02)");
				vignette.addColorStop(0.7, "rgba(5, 5, 13, 0.20)");
				vignette.addColorStop(1, "rgba(3, 3, 8, 0.82)");
			}
			ctx.fillStyle = vignette;
			ctx.fillRect(0, 0, W, H);
			ctx.restore();
		}

		/**
		 * Renders debug HUD text overlay.
		 * State-mutating canvas drawing helper.
		 * @param {string[][]} map - 2D map matrix.
		 * @param {string} [facing] - Player facing token.
		 * @returns {void}
		 */
		function renderDebugHud(map, facing) {
			if (!ctx?.fillText || isExpandedMode) return;
			ctx.save();
			ctx.fillStyle = "#ff9d4d";
			ctx.font = '8px "Press Start 2P", monospace';
			ctx.textAlign = "left";
			ctx.fillText(`BEARING: ${facing || "DOWN"}`, 12, 18);

			const aheadX = Math.trunc(camera.x + Math.cos(camera.angle) * 1.0);
			const aheadY = Math.trunc(camera.y + Math.sin(camera.angle) * 1.0);
			const aheadTile = map[aheadY]?.[aheadX] || "#";
			ctx.fillStyle = "#7a7a9e";
			ctx.font = '7px "Press Start 2P", monospace';
			ctx.fillText(`AHEAD: [${aheadTile}]`, 12, 30);
			ctx.restore();
		}

		/**
		 * Renders lighting vignette and debug HUD information overlay.
		 * State-mutating canvas drawing procedure.
		 * @param {boolean} isDungeon - Subterranean dungeon mode flag.
		 * @param {string[][]} map - 2D grid map matrix.
		 * @param {string} [facing] - Player facing direction token.
		 * @returns {void}
		 */
		function renderVignetteAndDebugHud(isDungeon, map, facing) {
			renderVignette(isDungeon);
			renderDebugHud(map, facing);
		}
		//#endregion

		//#region [SEC-10] Factory Instance API & Singleton Facade Exports
		/**
		 * Evaluates triggers and publishes proximity events.
		 * State-mutating trigger evaluation helper.
		 * @param {string[][]} map - Map matrix.
		 * @param {GameState} state - Game state snapshot.
		 * @returns {Array<{ eventName: string, payload: any }>} Fired proximity events.
		 */
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

		/**
		 * Executes headless render pass and returns frame descriptor.
		 * Pure calculation helper for headless execution.
		 * @param {string[][]} map - Map matrix.
		 * @param {Array<any>} events - Fired proximity events.
		 * @param {boolean} isDungeon - Dungeon mode flag.
		 * @param {boolean} isTown - Town mode flag.
		 * @param {number} torchFlicker - Torch flicker factor.
		 * @returns {Object} Headless frame descriptor.
		 */
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

		/**
		 * Extracts environment flags from state and map.
		 * Pure extraction helper.
		 * @param {GameState} state - Game state.
		 * @param {string[][]} map - Map matrix.
		 * @param {{ x: number, y: number }} playerPos - Player coordinates.
		 * @returns {{ isDungeon: boolean, isTown: boolean }} Resolved environment flags.
		 */
		function resolveEnvironment(state, map, playerPos) {
			const isDungeon = Boolean(
				(state.depth && state.depth > 0) ||
				(state.dungeonDepth && state.dungeonDepth > 0) ||
				(map[playerPos.y]?.[playerPos.x] === ">")
			);
			const isTown =
				(map[playerPos.y]?.[playerPos.x] === "T") ||
				Boolean(state.flags?.in_town);
			return { isDungeon, isTown };
		}

		/**
		 * Computes current torch flicker factor.
		 * Pure calculation helper.
		 * @returns {number} Torch flicker multiplier.
		 */
		function computeTorchFlicker() {
			return 0.94 + Math.sin(camera.t * 3.7) * 0.05 + Math.cos(camera.t * 7.1) * 0.03;
		}

		/**
		 * Evaluates frame dirtyness and updates frame descriptor.
		 * State-mutating dirty check helper.
		 * @param {string[][]} map - Map matrix.
		 * @param {boolean} isTown - Town mode flag.
		 * @param {boolean} isDungeon - Dungeon mode flag.
		 * @param {number} torchFlicker - Torch flicker factor.
		 * @returns {boolean} True if redraw required.
		 */
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

		/**
		 * Initializes the viewport instance and event bus bindings.
		 * State-mutating initialization gateway.
		 * @param {any} [busOrOpts] - Event bus handle or options dictionary.
		 * @returns {RenderViewportInstance} Configured viewport instance API.
		 */
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

		/**
		 * Toggles expanded viewport mode.
		 * State-mutating configuration gateway.
		 * @param {boolean} expanded - Expanded mode activation flag.
		 * @returns {void}
		 */
		function setExpanded(expanded) {
			isExpandedMode = Boolean(expanded);
			const src = isExpandedMode ? config.expanded : config.standard;
			resizeBuffers(src.width, src.height, (src.fovDeg * Math.PI) / 180);
			if (!isHeadless && typeof document !== "undefined") {
				/** @type {HTMLElement | null} */
				const compassRibbon = document.getElementById(compassRibbonId);
				/** @type {HTMLElement | null} */
				const minimapOverlay = document.getElementById(minimapOverlayId);
				if (compassRibbon)
					compassRibbon.classList.toggle("hidden", !isExpandedMode);
				if (minimapOverlay)
					minimapOverlay.classList.toggle("hidden", !isExpandedMode);
			}
		}

		/**
		 * Returns current viewport dimensions.
		 * Pure accessor gateway.
		 * @returns {{ width: number, height: number, isExpanded: boolean, fovDeg: number }} Viewport dimensions descriptor.
		 */
		function getDimensions() {
			return {
				width: W,
				height: H,
				isExpanded: isExpandedMode,
				fovDeg: Math.round((FOV * 180) / Math.PI),
			};
		}

		/**
		 * Advances camera smoothing state.
		 * State-mutating frame update gateway.
		 * @param {any} context - Host context frame reference.
		 * @param {number} [dt] - Elapsed frame delta time in seconds.
		 * @returns {void}
		 */
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

		/**
		 * Forces full redraw on next render pass.
		 * State-mutating flag setter gateway.
		 * @returns {void}
		 */
		function markDirty() {
			dirtyOverride = true;
		}

		/**
		 * Renders pseudo-3D corridor frame from game state.
		 * State-mutating render gateway.
		 * @param {GameState} state - Current game state snapshot.
		 * @returns {any} Render frame results or null if skipped.
		 */
		function render(state) {
			if (isPaused || !state) return null;
			const { map, playerPos, facing } = state;
			if (!map || !playerPos) return null;

			camera.targetX = playerPos.x + 0.5;
			camera.targetY = playerPos.y + 0.5;
			if (facing && FACING_ANGLES_HAS(facing))
				camera.targetAngle = RaycastMath.FACING_ANGLES[facing];

			const env = resolveEnvironment(state, map, playerPos);
			const torchFlicker = computeTorchFlicker();
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

			renderFloorAndCeiling(torchFlicker, env.isTown, env.isDungeon);
			renderWalls(map, torchFlicker, env.isTown);
			if (ctx.putImageData && imgData) ctx.putImageData(imgData, 0, 0);
			renderBillboards(map, torchFlicker);

			if (isExpandedMode) {
				updateCompassRibbon(camera.angle);
				renderMinimapRadar(map, playerPos);
			}
			renderVignetteAndDebugHud(env.isDungeon, map, state.facing);
			return { skipped: false, events };
		}

		/**
		 * Checks if facing angle token is valid.
		 * Pure evaluation helper.
		 * @param {string} facing - Facing direction token.
		 * @returns {boolean} True if facing token exists.
		 */
		function FACING_ANGLES_HAS(facing) {
			return Object.hasOwn(RaycastMath.FACING_ANGLES, facing);
		}

		/**
		 * Pauses rendering updates.
		 * State-mutating lifecycle gateway.
		 * @returns {void}
		 */
		function pause() {
			isPaused = true;
		}

		/**
		 * Resumes rendering updates.
		 * State-mutating lifecycle gateway.
		 * @returns {void}
		 */
		function resume() {
			isPaused = false;
		}

		/**
		 * Returns diagnostic telemetry metrics.
		 * Pure diagnostic accessor gateway.
		 * @returns {Object} Diagnostic report descriptor.
		 */
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

		/**
		 * Tears down DOM bindings and internal buffers.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
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

		/**
		 * Configures runtime settings.
		 * State-mutating configuration gateway.
		 * @param {Object} [cfg={}] - Configuration overrides.
		 * @returns {Readonly<{ accepted: boolean, driverId: string }>} Acceptance descriptor.
		 */
		function configure(cfg = {}) {
			config = deepMerge(config, cfg);
			return Object.freeze({ accepted: true, driverId: "pseudo_3d_renderer" });
		}

		/**
		 * Resets camera and latch states.
		 * State-mutating reset gateway.
		 * @returns {boolean} Success status boolean.
		 */
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

		/**
		 * Returns current instance state snapshot.
		 * Pure accessor gateway.
		 * @returns {Readonly<Object>} State snapshot descriptor.
		 */
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

		/** @type {RenderViewportInstance} */
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

	/** @type {RenderViewportInstance | null} */
	let _defaultInstance = null;

	/**
	 * Retrieves or instantiates the default singleton viewport instance.
	 * State-initializing factory helper.
	 * @param {Object} [opts={}] - Instantiation options.
	 * @returns {RenderViewportInstance} Default viewport instance.
	 */
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
	//#endregion
})();

if (typeof window !== "undefined") {
	/** @type {any} */
	const win = window;
	win.EmberlightPseudo3D = EmberlightPseudo3D;
	win.EmberlightCorridorSensor = EmberlightPseudo3D;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightPseudo3D;
}