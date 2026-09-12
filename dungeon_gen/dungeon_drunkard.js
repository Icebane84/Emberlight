/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DUNGEON DRUNKARD'S WALK SUB-MODULE
 * Document Identifier: VSRP-001-DUNGEON-DRUNKARD
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Math Kernel (Tier 4)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] Drunkard's Walk Stochastic Cavern Expansion Subroutine
 *
 * STAGING MEMBRANE KEY: window._DungeonGenInternal.Drunkard
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DungeonGenInternal = window._DungeonGenInternal || {};
if (typeof globalThis !== 'undefined') globalThis._DungeonGenInternal = globalThis._DungeonGenInternal || {};

(() => {
	'use strict';

	/**
	 * Applies Drunkard's Walk fallback carver if BSP coverage is sparse.
	 * @param {string[][]} map - Tile grid.
	 * @param {number} w - Width.
	 * @param {number} h - Height.
	 * @param {Array<{x:number, y:number}>} carvedCoords - Coordinates accumulator.
	 * @param {function():number} rng - PRNG float supplier.
	 * @returns {void}
	 */
	function applyDrunkardsWalk(map, w, h, carvedCoords, rng) {
		if (carvedCoords.length >= (w - 2) * (h - 2) * 0.35) return;
		let cx = Math.floor(w / 2);
		let cy = Math.floor(h / 2);
		map[cy][cx] = ".";
		carvedCoords.push({ x: cx, y: cy });

		const floorTarget = Math.floor((w - 2) * (h - 2) * 0.48);
		const directions = [
			{ dx: 0, dy: -1 },
			{ dx: 0, dy: 1 },
			{ dx: -1, dy: 0 },
			{ dx: 1, dy: 0 },
		];

		while (carvedCoords.length < floorTarget) {
			const dir = directions[Math.floor(rng() * directions.length)];
			const nx = cx + dir.dx;
			const ny = cy + dir.dy;
			if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
				cx = nx;
				cy = ny;
				if (map[cy][cx] === "#") {
					map[cy][cx] = ".";
					carvedCoords.push({ x: cx, y: cy });
				}
			}
		}
	}

	const Drunkard = Object.freeze({
		applyDrunkardsWalk,
	});

	if (typeof window !== 'undefined') {
		window._DungeonGenInternal.Drunkard = Drunkard;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis._DungeonGenInternal.Drunkard = Drunkard;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Drunkard;
	}
})();
