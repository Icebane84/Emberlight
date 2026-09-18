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
	 * @returns {Record<string, any>}
	 */
	function generate(
		seed = Date.now(),
		width = 12,
		height = 10,
		floorLevel = 1,
	) {
		const rng = createRNG(seed);
		const w = Math.max(8, width);
		const h = Math.max(8, height);

		const map = Array.from({ length: h }, () => new Array(w).fill("#"));
		/** @type {Array<any>} */
		const rooms = [];

		splitLeaf({ rx: 1, ry: 1, rw: w - 2, rh: h - 2, depth: 3 }, { rng, rooms });
		const carvedCoords = carveLayout(map, rooms, w, h);
		applyDrunkardsWalk(map, w, h, carvedCoords, rng);

		const spawn =
			rooms.length > 0
				? { x: rooms[ 0 ].cx, y: rooms[ 0 ].cy }
				: { x: carvedCoords[ 0 ].x, y: carvedCoords[ 0 ].y };
		map[ spawn.y ][ spawn.x ] = "<";

		const sortedByDist = [ ...carvedCoords ].sort((a, b) => {
			const distA = Math.hypot(a.x - spawn.x, a.y - spawn.y);
			const distB = Math.hypot(b.x - spawn.x, b.y - spawn.y);
			return distB - distA;
		});

		const exitPt = sortedByDist[ 0 ];
		map[ exitPt.y ][ exitPt.x ] = ">";

		const chestPt = sortedByDist[ 1 ] || sortedByDist[ 0 ];
		if (chestPt.x !== spawn.x || chestPt.y !== spawn.y) {
			map[ chestPt.y ][ chestPt.x ] = "$";
		}

		const campPt =
			sortedByDist[ Math.floor(sortedByDist.length * 0.5) ] || sortedByDist[ 0 ];
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
		lastSimulation = generate(seed, width, height, depth);
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

	return {
		generate,
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