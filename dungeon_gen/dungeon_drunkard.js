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

	/**
	 * Applies Drunkard's Walk fallback carver if BSP coverage is sparse.
	 * @param {string[][]} map - Tile grid.
	 * @param {number} w - Width.
	 * @param {number} h - Height.
	 * @param {Array<{x:number, y:number}>} carvedCoords - Coordinates accumulator.
	 * @param {() => number} rng - PRNG float supplier.
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

	/**
	 * Applies Conway (1970) / B5678/S45678 Cellular Automata smoothing
	 * to generate organic subterranean caves, lakes, and caverns.
	 * @param {string[][]} map - Tile grid to carve into.
	 * @param {number} w - Grid width.
	 * @param {number} h - Grid height.
	 * @param {Array<{x:number, y:number}>} carvedCoords - Coordinates accumulator.
	 * @param {() => number} rng - PRNG float supplier.
	 * @param {number} [passes=4] - Simulation smoothing passes.
	 * @param {number} [fillProb=0.45] - Initial random wall density.
	 * @returns {void}
	 */
	function applyCellularAutomataCaves(map, w, h, carvedCoords, rng, passes = 4, fillProb = 0.45) {
		// 1. Initialize interior with random noise while clamping outer perimeter
		let grid = Array.from({ length: h }, (_, y) =>
			Array.from({ length: w }, (_, x) => {
				if (x === 0 || x === w - 1 || y === 0 || y === h - 1) return 1;
				return rng() < fillProb ? 1 : 0;
			})
		);

		// 2. Cellular Automata passes (B5678/S45678: wall if >= 5 wall neighbors)
		for (let p = 0; p < passes; p++) {
			const nextGrid = Array.from({ length: h }, (_, y) =>
				Array.from({ length: w }, (_, x) => {
					if (x === 0 || x === w - 1 || y === 0 || y === h - 1) return 1;

					let walls = 0;
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							if (dx === 0 && dy === 0) continue;
							walls += grid[ y + dy ][ x + dx ];
						}
					}
					return walls >= 5 ? 1 : 0;
				})
			);
			grid = nextGrid;
		}

		// 3. Commit to map and accumulate carved coordinates
		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				if (grid[ y ][ x ] === 0) {
					map[ y ][ x ] = '.';
					carvedCoords.push({ x, y });
				} else {
					map[ y ][ x ] = '#';
				}
			}
		}
	}

	const Drunkard = Object.freeze({
		applyDrunkardsWalk,
		applyCellularAutomataCaves,
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
