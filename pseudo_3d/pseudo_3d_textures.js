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
		"@": "🐎",
		">": "\u{1FA9C}",
		"<": "\u{1F6AA}",
		"~": "≈",
		"%": "\u{2623}\u{FE0F}",
		H: "🏮",
		N: "📜",
		A: "\u{2728}",
		"*": "\u{1F48E}",
		D: "🏛️",
		S: "💀",
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
	 * Computes a deterministic pseudo-random 32-bit hash value for (x, y, seed).
	 * Eliminates periodic diagonal modulo striping artifacts.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} [seed=0]
	 * @returns {number} Unsigned 32-bit integer.
	 */
	function decorrelatedHash(x, y, seed = 0) {
		let h = (x * 374761393 + y * 668265263 + seed * 1274126177) ^ 0x27d4eb2d;
		h = Math.imul(h ^ (h >>> 15), 2246822519);
		h = Math.imul(h ^ (h >>> 13), 3266489917);
		return (h ^ (h >>> 16)) >>> 0;
	}

	/**
	 * Computes color for an ashlar brick megalith pixel.
	 * Pure calculation helper to preserve SonarLint S3776 complexity thresholds.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} courseIdx
	 * @param {number} blockCol
	 * @param {number} localX
	 * @param {number} localY
	 * @param {...number} dims Course height and block width dimensions.
	 * @returns {number} Packed color integer.
	 */
	function _shadeBrickPixel(x, y, courseIdx, blockCol, localX, localY, ...dims) {
		const [courseH = 8, blockW = 16] = dims;
		const blockId = courseIdx * 4 + blockCol;
		const blockHash = decorrelatedHash(blockId, 42, 99);
		const blockTone = (blockHash % 19) - 9;

		let r = 74 + blockTone;
		let g = 68 + blockTone;
		let b = 64 + blockTone;

		// Chisel edge relief & beveled block highlights
		if (localY === 1 || localX === 1) {
			r += 20;
			g += 18;
			b += 14;
		} else if (localY === courseH - 1 || localX === blockW - 1) {
			r -= 18;
			g -= 18;
			b -= 16;
		}

		// Isotropic mineral grain pitting
		const grain = (decorrelatedHash(x, y, 77) % 15) - 7;
		r += grain;
		g += grain;
		b += grain;

		// Creeping catacomb iron-moss in lower damp joints
		const isLowerWall = courseIdx >= 2;
		const isDampZone = localY >= 5 || localX <= 2;
		const mossHash = decorrelatedHash(x, y, 149);
		if (isLowerWall && isDampZone && (mossHash % 100 < 32)) {
			r = Math.max(12, Math.trunc(r * 0.42));
			g = Math.min(255, Math.trunc(g * 1.25 + 18));
			b = Math.max(12, Math.trunc(b * 0.38));
		}

		// Iron-oxide mineral vein accents
		if ((blockHash % 7 === 0) && (localX === 7 || localX === 8)) {
			r = Math.min(255, r + 18);
			g = Math.max(0, g + 4);
			b = Math.max(0, b - 10);
		}

		return packColor(
			Math.max(0, Math.min(255, r)),
			Math.max(0, Math.min(255, g)),
			Math.max(0, Math.min(255, b)),
		);
	}

	/**
	 * Bakes hand-carved catacomb masonry wall texture buffer.
	 * Replaces linear modulo diagonal hatching with authentic hand-hewn ashlar megaliths,
	 * staggered stone courses, chisel relief bevels, and subterranean iron-moss accents.
	 * @param {number} size - Texture width and height dimension (typically 32).
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeBrickTexture(size) {
		const tex = new Uint32Array(size * size);
		const courseH = 8;
		const blockW = 16;

		for (let y = 0; y < size; y++) {
			const courseIdx = Math.floor(y / courseH);
			const localY = y % courseH;
			const isMortarH = localY === 0 || y === size - 1;
			const xOffset = (courseIdx % 2 === 1) ? 8 : 0;

			for (let x = 0; x < size; x++) {
				const shiftedX = (x + xOffset) % size;
				const blockCol = Math.floor(shiftedX / blockW);
				const localX = shiftedX % blockW;
				const isMortarV = localX === 0 || shiftedX === size - 1;

				if (isMortarH || isMortarV) {
					// Deep recessed mortar crevice: gritty dark catacomb lime
					const mNoise = (decorrelatedHash(x, y, 11) % 7) - 3;
					tex[y * size + x] = packColor(15 + mNoise, 13 + mNoise, 19 + mNoise);
					continue;
				}

				tex[y * size + x] = _shadeBrickPixel(
					x,
					y,
					courseIdx,
					blockCol,
					localX,
					localY,
					courseH,
					blockW,
				);
			}
		}
		return tex;
	}

	/**
	 * Determines if a pixel coordinate lies within a forged iron stud/rivet.
	 * Pure calculation helper.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} size
	 * @returns {boolean}
	 */
	function _isTimberRivet(x, y, size) {
		const mid = Math.floor(size / 2) - 1;
		const end = size - 3;
		const nearX = Math.abs(x - 2) <= 1 || Math.abs(x - mid) <= 1 || Math.abs(x - end) <= 1;
		const nearY = Math.abs(y - 2) <= 1 || Math.abs(y - mid) <= 1 || Math.abs(y - end) <= 1;
		return nearX && nearY;
	}

	/**
	 * Computes color for an authentic medieval timber framing wall pixel.
	 * Pure calculation helper to preserve SonarLint S3776 complexity thresholds.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} size
	 * @returns {number} Packed color integer.
	 */
	function _shadeTimberPixel(x, y, size) {
		if (_isTimberRivet(x, y, size)) {
			// Forged iron bolt head with specular glint
			const isGlint = (x % 2 === 0) && (y % 2 === 0);
			return isGlint ? packColor(72, 72, 85) : packColor(22, 22, 26);
		}

		const mid = Math.floor(size / 2);
		const isBeamX = x < 4 || x >= size - 4 || (x >= mid - 2 && x <= mid + 1);
		const isBeamY = y < 4 || y >= size - 4 || (y >= mid - 2 && y <= mid + 1);

		if (isBeamX || isBeamY) {
			// Dark aged timber framing beam with longitudinal grain
			const beamNoise = (decorrelatedHash(x, y, 107) % 9) - 4;
			let r = 58 + beamNoise;
			let g = 34 + beamNoise;
			let b = 16 + beamNoise;

			// Chamfer edge highlight on upper-left beam faces
			if (x === 1 || y === 1 || x === mid - 1 || y === mid - 1) {
				r += 14;
				g += 10;
				b += 6;
			}
			return packColor(
				Math.max(0, Math.min(255, r)),
				Math.max(0, Math.min(255, g)),
				Math.max(0, Math.min(255, b)),
			);
		}

		// Vertical heartwood oak infill planks
		const isSeam = x === 8 || x === 9 || x === 22 || x === 23;
		if (isSeam) {
			return packColor(28, 16, 8);
		}

		const plankIdx = Math.floor(x / 5);
		const plankVar = (decorrelatedHash(plankIdx, 0, 43) % 15) - 7;
		const grainY = (decorrelatedHash(x, Math.floor(y / 2), 79) % 11) - 5;
		const grainFine = (decorrelatedHash(x, y, 131) % 7) - 3;

		const r = Math.max(0, Math.min(255, 105 + plankVar + grainY + grainFine));
		const g = Math.max(0, Math.min(255, 66 + Math.floor(plankVar * 0.7) + grainY + grainFine));
		const b = Math.max(0, Math.min(255, 30 + Math.floor(plankVar * 0.4)));

		return packColor(r, g, b);
	}

	/**
	 * Bakes timber wall texture buffer.
	 * Replaces periodic horizontal modulo striping with authentic medieval half-timber
	 * framing beams, forged iron stud rivets, and vertical heartwood oak planks.
	 * @param {number} size - Texture dimension.
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeTimberTexture(size) {
		const tex = new Uint32Array(size * size);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				tex[y * size + x] = _shadeTimberPixel(x, y, size);
			}
		}
		return tex;
	}

	/**
	 * Bakes fractured catacomb masonry rubble fixture texture buffer.
	 * Replaces linear modulo diagonal hatching with fractured stone blocks,
	 * chisel fractures, and deep angular shadow cracks.
	 * @param {number} size - Texture dimension.
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeRubbleTexture(size) {
		const tex = new Uint32Array(size * size);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const h = decorrelatedHash(x, y, 53);
				const isCrack = ((x ^ y) % 9 === 0) || ((x * 3 + y * 5) % 17 === 0);
				if (isCrack) {
					tex[y * size + x] = packColor(12, 10, 16);
				} else {
					const grain = (h % 17) - 8;
					const base = 56 + grain;
					tex[y * size + x] = packColor(base + 4, base + 2, base);
				}
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
				// Subdued dark ashen wilderness soil with subtle dark moss flecks
				const n = ((x * 13 + y * 17 + (x ^ y)) % 11) - 5;
				const isEdge = x === 0 || y === 0;
				const edgeDim = isEdge ? 4 : 0;
				const r = Math.max(8, 18 + n - edgeDim);
				const g = Math.max(10, 24 + n + (n > 0 ? 3 : 0) - edgeDim);
				const b = Math.max(8, 20 + n - edgeDim);
				tex[y * size + x] = packColor(r, g, b);
			}
		}
		return tex;
	}

	/**
	 * Computes color for an interlocking catacomb flagstone paver pixel.
	 * Pure calculation helper to preserve SonarLint S3776 complexity thresholds.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} paverRow
	 * @param {number} paverCol
	 * @param {number} localX
	 * @param {number} localY
	 * @param {...number} dims Paver height and paver width dimensions.
	 * @returns {number} Packed color integer.
	 */
	function _shadeFloorPixel(x, y, paverRow, paverCol, localX, localY, ...dims) {
		const [paverH = 16, paverW = 16] = dims;
		const slabId = paverRow * 4 + paverCol;
		const slabHash = decorrelatedHash(slabId, 19, 83);
		const slabTone = (slabHash % 17) - 8;

		let r = 52 + slabTone;
		let g = 50 + slabTone;
		let b = 58 + slabTone;

		if (localY === 1 || localX === 1) {
			r += 14;
			g += 13;
			b += 16;
		} else if (localY === paverH - 1 || localX === paverW - 1) {
			r -= 14;
			g -= 14;
			b -= 16;
		}

		const centerDist = Math.hypot(localX - 7.5, localY - 7.5);
		if (centerDist < 5.0) {
			r -= 4;
			g -= 4;
			b -= 3;
		}

		const grain = (decorrelatedHash(x, y, 99) % 11) - 5;
		r += grain;
		g += grain;
		b += grain;

		const sheenHash = decorrelatedHash(x, y, 227);
		if ((sheenHash & 0xff) > 0xec && centerDist > 2.0) {
			r += 16;
			g += 17;
			b += 22;
		}

		return packColor(
			Math.max(0, Math.min(255, r)),
			Math.max(0, Math.min(255, g)),
			Math.max(0, Math.min(255, b)),
		);
	}

	/**
	 * Bakes hand-carved catacomb flagstone floor texture buffer.
	 * Replaces linear modulo diagonal hatching with interlocking stone flagstone pavers,
	 * deep mortar channels, foot-worn center dish concavity, and condensation sheen.
	 * @param {number} size - Texture dimension (typically 32).
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeFloorTexture(size) {
		const tex = new Uint32Array(size * size);
		const paverH = 16;
		const paverW = 16;

		for (let y = 0; y < size; y++) {
			const paverRow = Math.floor(y / paverH);
			const localY = y % paverH;
			const isJointH = localY === 0 || y === size - 1;
			const xOffset = (paverRow % 2 === 1) ? 8 : 0;

			for (let x = 0; x < size; x++) {
				const shiftedX = (x + xOffset) % size;
				const paverCol = Math.floor(shiftedX / paverW);
				const localX = shiftedX % paverW;
				const isJointV = localX === 0 || shiftedX === size - 1;

				if (isJointH || isJointV) {
					// Sunken mortar channel between pavers
					const jointNoise = (decorrelatedHash(x, y, 31) % 5) - 2;
					tex[y * size + x] = packColor(10 + jointNoise, 9 + jointNoise, 14 + jointNoise);
					continue;
				}

				tex[y * size + x] = _shadeFloorPixel(
					x,
					y,
					paverRow,
					paverCol,
					localX,
					localY,
					paverH,
					paverW,
				);
			}
		}
		return tex;
	}

	/**
	 * Bakes vaulted catacomb ceiling texture buffer.
	 * Transverse hand-carved stone arch ribs and barrel vault stone bays.
	 * @param {number} size - Texture dimension.
	 * @returns {Uint32Array} Baked texture pixel buffer.
	 */
	function bakeCeilingTexture(size) {
		const tex = new Uint32Array(size * size);
		for (let y = 0; y < size; y++) {
			const isRib = y % 16 < 3;
			const isRibEdge = y % 16 === 0 || y % 16 === 2;
			for (let x = 0; x < size; x++) {
				const h = decorrelatedHash(x, y, 71);
				const grain = (h % 9) - 4;
				if (isRib) {
					if (isRibEdge) {
						tex[y * size + x] = packColor(22 + grain, 20 + grain, 26 + grain);
					} else {
						// Highlighted carved transverse arch rib
						tex[y * size + x] = packColor(46 + grain, 42 + grain, 48 + grain);
					}
				} else {
					// Vault bay stone blocks
					tex[y * size + x] = packColor(18 + grain, 17 + grain, 24 + grain);
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
	 * Includes inverse-square torchlight illumination falloff, warm amber radiance,
	 * and deep subterranean horizon attenuation.
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
		const r = color & 0xff;
		const g = (color >> 8) & 0xff;
		const b = (color >> 16) & 0xff;

		if (isDungeon) {
			// Subterranean Torch Falloff: inverse-square foreground illumination + warm amber glow
			const clampedDist = Math.max(0.65, distance);
			const torchAtten = Math.min(
				1.45,
				(torchFlicker * 1.35) / (1.0 + 0.28 * clampedDist + 0.10 * clampedDist * clampedDist),
			);
			const warmth = Math.max(0.0, 1.0 - distance / 3.8) * (torchFlicker * 0.85);
			const torchR = Math.trunc(38 * warmth);
			const torchG = Math.trunc(20 * warmth);
			const torchB = Math.trunc(3 * warmth);

			const litR = Math.min(255, Math.trunc(r * torchAtten + torchR));
			const litG = Math.min(255, Math.trunc(g * torchAtten + torchG));
			const litB = Math.min(255, Math.trunc(b * torchAtten + torchB));

			// Distance horizon attenuation into the pitch-black catacomb void
			const maxHorizon = fog.maxHorizonDungeon * torchFlicker;
			const fogRatio = Math.min(
				1.0,
				Math.max(0.0, (distance / maxHorizon) ** fog.exponentDungeon),
			);
			const voidColor = fog.voidDungeon;

			const fr = Math.trunc(litR + (voidColor.r - litR) * fogRatio);
			const fg = Math.trunc(litG + (voidColor.g - litG) * fogRatio);
			const fb = Math.trunc(litB + (voidColor.b - litB) * fogRatio);

			return packColor(fr, fg, fb);
		}

		// Surface Environment: cool atmospheric horizon attenuation
		const maxHorizon = config.maxDepth * torchFlicker;
		const fogRatio = Math.min(
			1.0,
			Math.max(0.0, (distance / maxHorizon) ** fog.exponentSurface),
		);
		const voidColor = fog.voidSurface;

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
		decorrelatedHash,
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
