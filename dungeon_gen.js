/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROCEDURAL DUNGEON CARVER FACADE
 * Document Identifier: VSRP-001-DUNGEON-GEN
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Math Kernel (Tier 4)
 * ============================================================================
 *
 * SUB-MODULE DEPENDENCIES (Staging Membrane):
 *   - dungeon_gen/dungeon_bsp.js      -> _DungeonGenInternal.BSP
 *   - dungeon_gen/dungeon_drunkard.js -> _DungeonGenInternal.Drunkard
 *   - dungeon_gen/dungeon_hazards.js  -> _DungeonGenInternal.Hazards
 * ============================================================================
 */

const EmberlightDungeonGen = (() => {
	// Ingest sub-module dependencies from staging membrane
	/** @type {any} */
	const membrane = (typeof window !== 'undefined' && window._DungeonGenInternal)
		|| (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis))._DungeonGenInternal)
		|| {};

	const {
		createRNG = (/** @type {any} */ s) => {
			let seed = Number(s) || 123456789;
			return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
		},
		splitLeaf = (/** @type {any} */ _leaf, /** @type {any} */ _ctx) => { },
		carveLayout = (/** @type {any} */ _m, /** @type {any} */ _r, /** @type {any} */ _w, /** @type {any} */ _h) => [],
	} = membrane.BSP || {};

	const {
		applyDrunkardsWalk = (/** @type {any} */ _m, /** @type {any} */ _w, /** @type {any} */ _h, /** @type {any} */ _c, /** @type {any} */ _r) => { },
		applyCellularAutomataCaves = (/** @type {any} */ _m, /** @type {any} */ _w, /** @type {any} */ _h, /** @type {any} */ _c, /** @type {any} */ _r) => { },
	} = membrane.Drunkard || {};

	const {
		ASSET_MANIFEST = {},
		applyFloorHazards = (/** @type {any} */ _m, /** @type {any} */ _s, /** @type {any} */ _o) => { },
	} = membrane.Hazards || {};

	// Clean membrane
	if (typeof window !== 'undefined' && (/** @type {any} */ (window))._DungeonGenInternal) {
		delete (/** @type {any} */ (window))._DungeonGenInternal;
	}
	if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis))._DungeonGenInternal) {
		delete (/** @type {any} */ (globalThis))._DungeonGenInternal;
	}

	let configured = false;
	let config = Object.freeze({});
	let initialized = false;
	/** @type {any} */
	let lastSimulation = null;

	/**
	 * @param {number} [seed]
	 * @param {number} [width]
	 * @param {number} [height]
	 * @param {number} [floorLevel]
	 * @param {Record<string, any>} [options]
	 * @returns {Record<string, any>}
	 */
	function generate(
		seed = Date.now(),
		width = 12,
		height = 10,
		floorLevel = 1,
		options = {},
	) {
		const rng = createRNG(seed);
		const w = Math.max(8, width);
		const h = Math.max(8, height);

		const map = Array.from({ length: h }, () => new Array(w).fill("#"));
		/** @type {Array<any>} */
		const rooms = [];
		/** @type {Array<{x: number, y: number}>} */
		let carvedCoords = [];

		const isCavern = options?.layoutType === 'CAVERN' || options?.layoutType === 'cavern';
		const isPureBSP = options?.layoutType === 'BSP' || options?.layoutType === 'bsp'
			|| options?.layoutType === 'ARCHITECTURAL' || options?.layoutType === 'architectural';

		if (isCavern) {
			applyCellularAutomataCaves(map, w, h, carvedCoords, rng, options?.passes || 4, options?.fillProb || 0.45);
			const cx = Math.floor(w / 2);
			const cy = Math.floor(h / 2);
			rooms.push({ rx: 1, ry: 1, rw: w - 2, rh: h - 2, cx, cy });
		} else if (isPureBSP) {
			const depth = Math.max(1, Number(options?.depth) || 3);
			splitLeaf({ rx: 1, ry: 1, rw: w - 2, rh: h - 2, depth }, { rng, rooms });
			carvedCoords = carveLayout(map, rooms, w, h);
		} else {
			splitLeaf({ rx: 1, ry: 1, rw: w - 2, rh: h - 2, depth: 3 }, { rng, rooms });
			carvedCoords = carveLayout(map, rooms, w, h);
			applyDrunkardsWalk(map, w, h, carvedCoords, rng);
		}

		const spawn =
			rooms.length > 0 && map[ rooms[ 0 ].cy ]?.[ rooms[ 0 ].cx ] === "."
				? { x: rooms[ 0 ].cx, y: rooms[ 0 ].cy }
				: { x: carvedCoords[ 0 ]?.x || 1, y: carvedCoords[ 0 ]?.y || 1 };
		map[ spawn.y ][ spawn.x ] = "<";

		const sortedByDist = [ ...carvedCoords ].sort((a, b) => {
			const distA = Math.hypot(a.x - spawn.x, a.y - spawn.y);
			const distB = Math.hypot(b.x - spawn.x, b.y - spawn.y);
			return distB - distA;
		});

		const exitPt = sortedByDist[ 0 ] || spawn;
		map[ exitPt.y ][ exitPt.x ] = ">";

		const chestPt = sortedByDist[ 1 ] || sortedByDist[ 0 ] || spawn;
		if (chestPt.x !== spawn.x || chestPt.y !== spawn.y) {
			map[ chestPt.y ][ chestPt.x ] = "$";
		}

		const campPt =
			sortedByDist[ Math.floor(sortedByDist.length * 0.5) ] || sortedByDist[ 0 ] || spawn;
		if (
			(campPt.x !== spawn.x || campPt.y !== spawn.y) &&
			(campPt.x !== exitPt.x || campPt.y !== exitPt.y)
		) {
			map[ campPt.y ][ campPt.x ] = "C";
		}

		applyFloorHazards(map, sortedByDist, { spawn, exitPt, chestPt, floorLevel, w, h, rng });

		carvedCoords.forEach((/** @type {any} */ pt) => {
			if (
				map[ pt.y ][ pt.x ] === "." &&
				(pt.x !== spawn.x || pt.y !== spawn.y) &&
				(pt.x !== exitPt.x || pt.y !== exitPt.y) &&
				rng() < 0.18
			) {
				map[ pt.y ][ pt.x ] = '"';
			}
		});

		const metadataMap = map.map((row, y) =>
			row.map((char, x) => {
				const rule = ASSET_MANIFEST[ char ] || ASSET_MANIFEST[ "." ];
				const variantCount = rule?.variants || 1;
				const selectedVariant = Math.floor(rng() * variantCount);

				let elevation = 0;
				if (char === "~") {
					elevation = -1;
				} else if (char === "#") {
					elevation = 1;
				}

				return {
					x,
					y,
					glyph: char,
					assetId: rule?.assetId || "UNKNOWN",
					name: rule?.name || "Unknown",
					variant: selectedVariant,
					elevation,
					collision: Boolean(rule?.collision),
					castShadow: Boolean(rule?.castShadow),
					tint: rule?.baseTint || "#ffffff",
					light: rule?.light ? { ...rule.light } : null,
					particles: rule?.particleEmitter ? { ...rule.particleEmitter } : null,
				};
			}),
		);

		return {
			map,
			metadataMap,
			spawn,
			exit: exitPt,
			depth: floorLevel,
			width: w,
			height: h,
			rooms,
			seed,
		};
	}

	/**
	 * @param {Record<string, any>} [options]
	 */
	function configure(options = {}) {
		config = Object.freeze({ ...config, ...options });
		configured = true;
		return Object.freeze({ accepted: true, driverId: "dungeon_gen" });
	}

	/**
	 * @param {any} [context]
	 */
	function init(context) {
		if (!configured) configured = true;
		initialized = true;
		if (context) {
			// Acknowledge context reference
		}
		return true;
	}

	/**
	 * @param {any} [snapshot]
	 */
	function reset(snapshot = null) {
		const seed = snapshot?.seed || Date.now();
		const width = snapshot?.width || 12;
		const height = snapshot?.height || 10;
		const depth = snapshot?.depth || 1;
		const options = snapshot?.options || {};
		lastSimulation = generate(seed, width, height, depth, options);
		return lastSimulation;
	}

	/**
	 * @param {number} [dt]
	 */
	function update(dt) {
		if (dt) {
			// Delta time acknowledged
		}
	}

	/**
	 * @param {any} [renderer]
	 * @param {any} [context]
	 */
	function render(renderer, context) {
		if (renderer || context) {
			// Render context acknowledged
		}
	}

	function getState() {
		return lastSimulation ? { ...lastSimulation } : null;
	}

	function getDiagnostics() {
		let dimensionsStr = "N/A";
		if (lastSimulation) {
			dimensionsStr = `${lastSimulation.width}x${lastSimulation.height}`;
		}

		return {
			driverId: "dungeon_gen_master",
			version: "4.0.0",
			protocolVersion: "VSRP-001",
			configured,
			initialized,
			hasLastSimulation: Boolean(lastSimulation),
			lastGridDimensions: dimensionsStr,
			lastDepth: lastSimulation?.depth || 0,
			supportedManifestGlyphs: Object.keys(ASSET_MANIFEST),
		};
	}

	function getModuleInfo() {
		return {
			moduleId: "EmberlightDungeonGen",
			version: "4.0.0",
			protocolVersion: "VSRP-001",
			capabilities: [
				"hybrid_bsp_carver",
				"cellular_automata_caves",
				"pure_bsp_architectural_carver",
				"deterministic_layout",
				"puzzle_mechanisms",
				"rich_asset_manifest",
				"lighting_descriptors",
			],
		};
	}

	function getInfo() {
		return getModuleInfo();
	}

	function destroy() {
		lastSimulation = null;
		initialized = false;
		configured = false;
	}

	/**
	 * Generates an organic cavernous layout using Conway Cellular Automata.
	 * @param {number} [seed]
	 * @param {number} [width=12]
	 * @param {number} [height=10]
	 * @param {number} [passes=4]
	 * @param {number} [fillProb=0.45]
	 * @returns {{ map: string[][], carvedCoords: Array<{x: number, y: number}>, spawn: {x: number, y: number}, exitPt: {x: number, y: number} }}
	 */
	function carveCaverns(seed = Date.now(), width = 12, height = 10, passes = 4, fillProb = 0.45) {
		const rng = createRNG(seed);
		const w = Math.max(8, width);
		const h = Math.max(8, height);
		const map = Array.from({ length: h }, () => new Array(w).fill("#"));
		/** @type {Array<{x: number, y: number}>} */
		const carvedCoords = [];
		applyCellularAutomataCaves(map, w, h, carvedCoords, rng, passes, fillProb);

		const spawn = carvedCoords[ 0 ] || { x: Math.floor(w / 2), y: Math.floor(h / 2) };
		const exitPt = carvedCoords.at(-1) || spawn;
		map[ spawn.y ][ spawn.x ] = "<";
		map[ exitPt.y ][ exitPt.x ] = ">";

		return { map, carvedCoords, spawn, exitPt };
	}

	/**
	 * Generates a pure rectilinear architectural layout using Binary Space Partitioning (BSP).
	 * Preserves clean rectangular rooms and connecting corridors without Drunkard's Walk erosion.
	 *
	 * @param {number} [seed]
	 * @param {number} [width=16]
	 * @param {number} [height=12]
	 * @param {number} [depth=3]
	 * @returns {{ map: string[][], rooms: Array<any>, carvedCoords: Array<{x: number, y: number}>, spawn: {x: number, y: number}, exitPt: {x: number, y: number} }}
	 */
	function carveBSPDungeon(seed = Date.now(), width = 16, height = 12, depth = 3) {
		const rng = createRNG(seed);
		const w = Math.max(8, width);
		const h = Math.max(8, height);
		const map = Array.from({ length: h }, () => new Array(w).fill("#"));
		/** @type {Array<any>} */
		const rooms = [];
		splitLeaf({ rx: 1, ry: 1, rw: w - 2, rh: h - 2, depth }, { rng, rooms });
		const carvedCoords = carveLayout(map, rooms, w, h);

		const spawn = rooms.length > 0 && map[rooms[0].cy]?.[rooms[0].cx] === "."
			? { x: rooms[0].cx, y: rooms[0].cy }
			: (carvedCoords[0] || { x: 1, y: 1 });
		const lastRoom = rooms.at(-1);
		const exitPt = lastRoom && map[lastRoom.cy]?.[lastRoom.cx] === "."
			? { x: lastRoom.cx, y: lastRoom.cy }
			: (carvedCoords.at(-1) || spawn);

		map[spawn.y][spawn.x] = "<";
		map[exitPt.y][exitPt.x] = ">";

		return { map, rooms, carvedCoords, spawn, exitPt };
	}

	return {
		generate,
		carveCaverns,
		carveBSPDungeon,
		applyCellularAutomataCaves,
		ASSET_MANIFEST,
		configure,
		init,
		reset,
		update,
		render,
		getState,
		getDiagnostics,
		getModuleInfo,
		getInfo,
		destroy,
	};
})();

if (typeof window !== "undefined") {
	window.EmberlightDungeonGen = EmberlightDungeonGen;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightDungeonGen;
}