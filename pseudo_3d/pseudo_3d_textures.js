/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTER - TEXTURES & COLOR UTILITIES
 * Document Identifier: VSRP-001-PSEUDO-3D-TEXTURES
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-FACADE-001
 * Authority:           Peripheral Presentation (Subsystem Module)
 * ============================================================================
 */

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
}

const Pseudo3DTextures = (() => {
	//#region Module Configuration & Defaults
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
				isArmed: (/** @type {any} */ gameState) => !gameState?.flags?.boss_slain,
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

	//#region Tile Legend, Constants & Glyph Maps
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
		H: "The Hearth Inn tavern billboard sprite.",
		N: "Town Notice Board billboard sprite.",
		A: "Ancient Aether Shrine billboard sprite.",
		"*": "Resource cache diamond billboard sprite.",
		D: "Settlement gate billboard sprite.",
		S: "Catacombs descent gate billboard sprite.",
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
		H: "\u{1F3E8}",
		N: "\u{1F4CB}",
		A: "\u{2728}",
		"*": "\u{1F48E}",
		D: "\u{1F3F0}",
		S: "\u{26E9}\u{FE0F}",
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
		if (tile === "H") return { color: "#f59e0b", blur: 16 };
		if (tile === "N") return { color: "#e2e8f0", blur: 10 };
		if (tile === "A") return { color: "#38bdf8", blur: 20 };
		if (tile === "*") return { color: "#34d399", blur: 14 };
		if (tile === "S") return { color: "#a855f7", blur: 18 };
		if (tile === "D") return { color: "#94a3b8", blur: 14 };
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
		if (tile === "H") return "#f59e0b";
		if (tile === "N") return "#94a3b8";
		if (tile === "A") return "#38bdf8";
		if (tile === "*") return "#34d399";
		if (tile === "D") return "#64748b";
		if (tile === "S") return "#a855f7";
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

	//#region Texture Baking & Fog Utilities
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
				const isVerticalStud = x % 8 === 0 || x === 0 || x === size - 1;
				const isHorizontalRail = y % 16 === 0 || y === 0 || y === size - 1;
				const isDiagonalBrace = (Math.floor(y / 16) % 2 === 0)
					? (x % 16 === Math.floor(y % 16))
					: (x % 16 === 15 - Math.floor(y % 16));
				const grain = Math.sin(y * 0.75 + x * 0.15) * 8;

				if (isVerticalStud || isHorizontalRail || isDiagonalBrace) {
					// Dark oak timber beam framing
					tex[y * size + x] = packColor(48, 24, 10);
				} else {
					// Warm wooden horizontal planking
					const plankLine = (y % 4 === 0) ? -12 : 0;
					const r = Math.max(0, Math.min(255, 110 + grain + plankLine));
					const g = Math.max(0, Math.min(255, 68 + (grain * 0.6) + (plankLine * 0.6)));
					const b = Math.max(0, Math.min(255, 28 + (grain * 0.2)));
					tex[y * size + x] = packColor(r, g, b);
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
	 * Bakes town cobblestone street floor texture buffer.
	 * @param {number} size - Texture dimension.
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeCobbleTexture(size) {
		const tex = new Uint32Array(size * size);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const isGrout = x % 8 === 0 || y % 8 === 0;
				if (isGrout) {
					tex[y * size + x] = packColor(18, 18, 26);
				} else {
					const noise = ((x * 19 + y * 23) % 13) - 6;
					const r = Math.max(0, 48 + noise);
					const g = Math.max(0, 46 + noise);
					const b = Math.max(0, 56 + noise);
					tex[y * size + x] = packColor(r, g, b);
				}
			}
		}
		return tex;
	}

	/**
	 * Bakes wild green meadow grass floor texture buffer.
	 * @param {number} size - Texture dimension.
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeGrassTexture(size) {
		const tex = new Uint32Array(size * size);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const noise = ((x * 37 + y * 41) % 29) - 14;
				const r = Math.max(0, 14 + Math.floor(noise * 0.4));
				const g = Math.max(0, 44 + noise);
				const b = Math.max(0, 18 + Math.floor(noise * 0.5));
				tex[y * size + x] = packColor(r, g, b);
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
	 * @param {any} config - Engine configuration dictionary.
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
			COBBLE: bakeCobbleTexture(size),
			GRASS: bakeGrassTexture(size),
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
	 * @param {any} config - Engine configuration dictionary.
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

	return Object.freeze({
		DEFAULT_CONFIG,
		deepMerge,
		TILE_LEGEND,
		BILLBOARD_GLYPHS,
		WALL_TILES,
		FACING_ANGLES,
		resolveBillboardShadow,
		getMinimapTileColor,
		getModuleInfo,
		packColor,
		bakeBrickTexture,
		bakeTimberTexture,
		bakeRubbleTexture,
		bakePortcullisTexture,
		bakeFloorTexture,
		bakeCeilingTexture,
		bakeTextures,
		resolveWallTextureKey,
		applyFog,
	});
})();

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
	window._Pseudo3DInternal.Textures = Pseudo3DTextures;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Pseudo3DTextures;
}
