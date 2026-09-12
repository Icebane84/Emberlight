/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DUNGEON HAZARDS & ASSET MANIFEST SUB-MODULE
 * Document Identifier: VSRP-001-DUNGEON-HAZARDS
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Math Kernel & District Ecology (Tier 4)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] ASSET_MANIFEST Dictionary
 *   [SEC-02] Hazards, Chasm, Portcullis & Miasma Injection Subroutines
 *
 * STAGING MEMBRANE KEY: window._DungeonGenInternal.Hazards
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DungeonGenInternal = window._DungeonGenInternal || {};
if (typeof globalThis !== 'undefined') globalThis._DungeonGenInternal = globalThis._DungeonGenInternal || {};

(() => {
	'use strict';

	/** @type {Record<string, Object>} */
	const ASSET_MANIFEST = Object.freeze({
		"#": {
			assetId: "WALL_CATACOMB_DEEP",
			name: "Mountain Bedrock Wall",
			variants: 4,
			collision: true,
			castShadow: true,
			baseTint: "#1a1a2e",
			roughness: 0.85,
		},
		".": {
			assetId: "FLOOR_FLAGSTONE_AGED",
			name: "Cobblestone Path",
			variants: 6,
			collision: false,
			castShadow: false,
			baseTint: "#3b3b58",
			roughness: 0.6,
		},
		">": {
			assetId: "PORTAL_DESCENT_RUNIC",
			name: "Descent Gate Portal",
			variants: 2,
			collision: false,
			castShadow: false,
			baseTint: "#ffcc00",
			light: { color: "#ffaa00", radius: 4.5, intensity: 1.2 },
			particleEmitter: { type: "GOLDEN_EMBER", rate: 12 },
		},
		"<": {
			assetId: "PORTAL_ASCENT_BEACON",
			name: "Ascent Ladder Beacon",
			variants: 1,
			collision: false,
			castShadow: false,
			baseTint: "#38bdf8",
			light: { color: "#38bdf8", radius: 3.0, intensity: 0.9 },
		},
		$: {
			assetId: "CHEST_RELIC_ORNATE",
			name: "Ancient Relic Chest",
			variants: 2,
			collision: true,
			castShadow: true,
			baseTint: "#fbbf24",
			light: { color: "#f59e0b", radius: 2.0, intensity: 0.8 },
			particleEmitter: { type: "AETHER_SPARK", rate: 6 },
		},
		C: {
			assetId: "CAMP_SANCTUARY_HEARTH",
			name: "Sanctuary Campsite",
			variants: 1,
			collision: false,
			castShadow: false,
			baseTint: "#34d399",
			light: { color: "#10b981", radius: 5.0, intensity: 1.5 },
			particleEmitter: { type: "HEALING_MIST", rate: 8 },
		},
		"~": {
			assetId: "CHASM_ABYSSAL_WATER",
			name: "Abyssal Water Chasm",
			variants: 3,
			collision: true,
			castShadow: false,
			baseTint: "#0284c7",
			particleEmitter: { type: "TOXIC_BUBBLE", rate: 4 },
		},
		P: {
			assetId: "PORTCULLIS_IRON_REINFORCED",
			name: "Reinforced Portcullis",
			variants: 1,
			collision: true,
			castShadow: true,
			baseTint: "#94a3b8",
		},
		_: {
			assetId: "PLATE_PRESSURE_MECHANICAL",
			name: "Mechanical Pressure Plate",
			variants: 1,
			collision: false,
			castShadow: false,
			baseTint: "#cbd5e1",
		},
		"%": {
			assetId: "MIASMA_TOXIC_CLOUD",
			name: "Toxic Miasma Cloud",
			variants: 2,
			collision: false,
			castShadow: false,
			baseTint: "#a855f7",
			particleEmitter: { type: "POISON_SPORE", rate: 10 },
		},
		'"': {
			assetId: "FOLIAGE_GLOW_MOSS",
			name: "Glow Moss & Mist",
			variants: 3,
			collision: false,
			castShadow: false,
			baseTint: "#64748b",
			light: { color: "#06b6d4", radius: 1.5, intensity: 0.4 },
		},
	});

	/**
	 * Applies abyssal chasm hazard for deep floors.
	 * @param {string[][]} map - Tile grid.
	 * @param {Object} ctx - Hazard context.
	 * @returns {void}
	 */
	function applyChasmHazard(map, ctx) {
		const { floorLevel, w, h, rng, spawn, exitPt, chestPt } = ctx;
		if (floorLevel < 2) return;
		const chasmX = Math.floor(w / 2) + (rng() > 0.5 ? 1 : -1);
		for (let y = 1; y < h - 1; y++) {
			if (
				map[y][chasmX] === "." &&
				(chasmX !== spawn.x || y !== spawn.y) &&
				(chasmX !== exitPt.x || y !== exitPt.y) &&
				(chasmX !== chestPt.x || y !== chestPt.y)
			) {
				map[y][chasmX] = "~";
			}
		}
	}

	/**
	 * Applies portcullis and pressure plate puzzle mechanisms.
	 * @param {string[][]} map - Tile grid.
	 * @param {Object} ctx - Hazard context.
	 * @returns {void}
	 */
	function applyPortcullisHazard(map, ctx) {
		const { exitPt, spawn, sortedByDist } = ctx;
		const cardinalDirs = [
			{ dx: 0, dy: -1 },
			{ dx: 0, dy: 1 },
			{ dx: -1, dy: 0 },
			{ dx: 1, dy: 0 },
		];
		let portcullisPlaced = false;
		for (const d of cardinalDirs) {
			const gx = exitPt.x + d.dx;
			const gy = exitPt.y + d.dy;
			if (map[gy]?.[gx] === "." && (gx !== spawn.x || gy !== spawn.y)) {
				map[gy][gx] = "P";
				portcullisPlaced = true;
				break;
			}
		}

		if (portcullisPlaced) {
			const plateCandidate =
				sortedByDist[Math.floor(sortedByDist.length * 0.75)] || sortedByDist[2];
			if (
				plateCandidate &&
				(plateCandidate.x !== spawn.x || plateCandidate.y !== spawn.y) &&
				map[plateCandidate.y][plateCandidate.x] === "."
			) {
				map[plateCandidate.y][plateCandidate.x] = "_";
			}
		}
	}

	/**
	 * Applies toxic miasma pocket hazards.
	 * @param {string[][]} map - Tile grid.
	 * @param {Object} ctx - Hazard context.
	 * @returns {void}
	 */
	function applyMiasmaHazard(map, ctx) {
		const { floorLevel, sortedByDist, spawn, exitPt, chestPt } = ctx;
		if (floorLevel < 3) return;
		const miasmaCenter = sortedByDist[Math.floor(sortedByDist.length * 0.35)];
		if (!miasmaCenter) return;
		const cardinalDirsWithZero = [
			{ dx: 0, dy: -1 },
			{ dx: 0, dy: 1 },
			{ dx: -1, dy: 0 },
			{ dx: 1, dy: 0 },
			{ dx: 0, dy: 0 },
		];
		cardinalDirsWithZero.forEach((d) => {
			const mx = miasmaCenter.x + d.dx;
			const my = miasmaCenter.y + d.dy;
			if (
				map[my]?.[mx] === "." &&
				(mx !== spawn.x || my !== spawn.y) &&
				(mx !== exitPt.x || my !== exitPt.y) &&
				(mx !== chestPt.x || my !== chestPt.y)
			) {
				map[my][mx] = "%";
			}
		});
	}

	/**
	 * Places floor hazards and puzzle elements based on depth.
	 * @param {string[][]} map - Tile grid.
	 * @param {Array<{x:number, y:number}>} sortedByDist - Sorted coordinates.
	 * @param {Object} ctx - Hazard context.
	 * @returns {void}
	 */
	function applyFloorHazards(map, sortedByDist, ctx) {
		const fullCtx = { ...ctx, sortedByDist };
		applyChasmHazard(map, fullCtx);
		applyPortcullisHazard(map, fullCtx);
		applyMiasmaHazard(map, fullCtx);
	}

	const Hazards = Object.freeze({
		ASSET_MANIFEST,
		applyChasmHazard,
		applyPortcullisHazard,
		applyMiasmaHazard,
		applyFloorHazards,
	});

	if (typeof window !== 'undefined') {
		window._DungeonGenInternal.Hazards = Hazards;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis._DungeonGenInternal.Hazards = Hazards;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Hazards;
	}
})();
