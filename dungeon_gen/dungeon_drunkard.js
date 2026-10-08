/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DUNGEON DRUNKARD'S WALK & CELLULAR CAVERN SUB-MODULE
 * Document Identifier: VSRP-001-DUNGEON-DRUNKARD
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Math Kernel (Tier 4)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] Drunkard's Walk Stochastic Carving Subroutine
 *   [SEC-02] Cellular Automata 4-5 Convergence Kernel (B5678/S45678)
 *   [SEC-03] Flood-Fill Topological Connectivity & Island Pruning
 *   [SEC-04] Module Export & Staging Membrane Registration
 *
 * STAGING MEMBRANE KEY: window._DungeonGenInternal.Drunkard
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DungeonGenInternal = window._DungeonGenInternal || {};
if (typeof globalThis !== 'undefined') globalThis._DungeonGenInternal = globalThis._DungeonGenInternal || {};

(() => {
	//#region [SEC-01] Drunkard's Walk Stochastic Carving Subroutine
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
	//#endregion

	//#region [SEC-02] Cellular Automata 4-5 Convergence Kernel (B5678/S45678)
	/**
	 * Initializes a 1D Uint8Array noise grid with clamped perimeter walls.
	 * @param {number} w - Width.
	 * @param {number} h - Height.
	 * @param {number} fillProb - Initial solid wall probability.
	 * @param {() => number} rng - PRNG float supplier.
	 * @returns {Uint8Array}
	 */
	function initNoiseGrid(w, h, fillProb, rng) {
		const grid = new Uint8Array(w * h);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const isBorder = (x === 0 || x === w - 1 || y === 0 || y === h - 1);
				grid[y * w + x] = (isBorder || rng() < fillProb) ? 1 : 0;
			}
		}
		return grid;
	}

	/**
	 * Counts solid wall neighbors in the 8-cell Moore neighborhood.
	 * @param {Uint8Array} grid - Flattened grid.
	 * @param {number} x - Center X.
	 * @param {number} y - Center Y.
	 * @param {number} w - Grid width.
	 * @returns {number}
	 */
	function countMooreNeighbors(grid, x, y, w) {
		let walls = 0;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx !== 0 || dy !== 0) {
					walls += grid[(y + dy) * w + (x + dx)];
				}
			}
		}
		return walls;
	}

	/**
	 * Executes iterative 4-5 convergence passes (B5678/S45678) using double-buffering.
	 * @param {Uint8Array} grid - Flattened grid.
	 * @param {number} w - Grid width.
	 * @param {number} h - Grid height.
	 * @param {number} passes - Smoothing pass count.
	 * @returns {void}
	 */
	function runAutomataSmoothing(grid, w, h, passes) {
		const buffer = new Uint8Array(w * h);
		for (let y = 0; y < h; y++) {
			buffer[y * w] = 1;
			buffer[y * w + (w - 1)] = 1;
		}
		for (let x = 0; x < w; x++) {
			buffer[x] = 1;
			buffer[(h - 1) * w + x] = 1;
		}

		for (let p = 0; p < passes; p++) {
			for (let y = 1; y < h - 1; y++) {
				for (let x = 1; x < w - 1; x++) {
					const walls = countMooreNeighbors(grid, x, y, w);
					const idx = y * w + x;
					if (walls >= 5) {
						buffer[idx] = 1;
					} else if (walls < 4) {
						buffer[idx] = 0;
					} else {
						buffer[idx] = grid[idx];
					}
				}
			}
			grid.set(buffer);
		}
	}
	//#endregion

	//#region [SEC-03] Flood-Fill Topological Connectivity & Island Pruning
	/**
	 * Explores an open floor component from a starting coordinate using BFS.
	 * @param {Uint8Array} grid - Flattened grid.
	 * @param {Uint8Array} visited - Visited mask.
	 * @param {number} startX - Start X coordinate.
	 * @param {number} startY - Start Y coordinate.
	 * @param {number} w - Grid width.
	 * @param {number} h - Grid height.
	 * @returns {Array<{x: number, y: number}>}
	 */
	function collectFloorComponent(grid, visited, startX, startY, w, h) {
		const comp = [];
		const queue = [{ x: startX, y: startY }];
		visited[startY * w + startX] = 1;
		let head = 0;

		while (head < queue.length) {
			const pt = queue[head++];
			comp.push(pt);
			const nbs = [
				{ x: pt.x + 1, y: pt.y },
				{ x: pt.x - 1, y: pt.y },
				{ x: pt.x, y: pt.y + 1 },
				{ x: pt.x, y: pt.y - 1 },
			];
			for (let i = 0; i < 4; i++) {
				const nb = nbs[i];
				if (nb.x <= 0 || nb.x >= w - 1 || nb.y <= 0 || nb.y >= h - 1) continue;
				const nIdx = nb.y * w + nb.x;
				if (grid[nIdx] === 0 && visited[nIdx] === 0) {
					visited[nIdx] = 1;
					queue.push(nb);
				}
			}
		}
		return comp;
	}

	/**
	 * Discovers all contiguous open floor components via BFS traversal.
	 * @param {Uint8Array} grid - Flattened grid.
	 * @param {number} w - Grid width.
	 * @param {number} h - Grid height.
	 * @returns {Array<Array<{x: number, y: number}>>}
	 */
	function findConnectedFloors(grid, w, h) {
		const visited = new Uint8Array(w * h);
		const components = [];

		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				const startIdx = y * w + x;
				if (grid[startIdx] === 0 && visited[startIdx] === 0) {
					components.push(collectFloorComponent(grid, visited, x, y, w, h));
				}
			}
		}

		components.sort((a, b) => b.length - a.length);
		return components;
	}

	/**
	 * Prunes secondary disconnected caverns and guarantees minimum playable floor area.
	 * @param {Uint8Array} grid - Flattened grid.
	 * @param {number} w - Grid width.
	 * @param {number} h - Grid height.
	 * @param {() => number} rng - PRNG float supplier.
	 * @returns {Array<{x: number, y: number}>}
	 */
	function pruneAndConnectCavern(grid, w, h, rng) {
		const components = findConnectedFloors(grid, w, h);
		const targetFloor = Math.floor((w - 2) * (h - 2) * 0.40);

		// Seal secondary disconnected pockets into solid rock
		for (let c = 1; c < components.length; c++) {
			for (const pt of components[c]) {
				grid[pt.y * w + pt.x] = 1;
			}
		}

		const mainComponent = components[0] || [];
		if (mainComponent.length >= targetFloor) {
			return mainComponent;
		}

		// Expand main chamber organically if under 40% floor target
		let cx = mainComponent[0]?.x || Math.floor(w / 2);
		let cy = mainComponent[0]?.y || Math.floor(h / 2);
		grid[cy * w + cx] = 0;
		if (mainComponent.length === 0) {
			mainComponent.push({ x: cx, y: cy });
		}

		const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
		let safety = 0;
		while (mainComponent.length < targetFloor && safety < 1200) {
			safety++;
			const dir = dirs[Math.floor(rng() * dirs.length)];
			const nx = cx + dir.dx;
			const ny = cy + dir.dy;
			if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
				cx = nx;
				cy = ny;
				const idx = cy * w + cx;
				if (grid[idx] === 1) {
					grid[idx] = 0;
					mainComponent.push({ x: cx, y: cy });
				}
			}
		}
		return mainComponent;
	}

	/**
	 * Applies Conway (1970) / B5678/S45678 Cellular Automata smoothing
	 * with flood-fill topological connectivity and solid boundary clamping.
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
		const grid = initNoiseGrid(w, h, fillProb, rng);
		runAutomataSmoothing(grid, w, h, passes);
		pruneAndConnectCavern(grid, w, h, rng);

		// Commit grid to map and record carved floor coordinates
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const isBorder = (x === 0 || x === w - 1 || y === 0 || y === h - 1);
				if (isBorder || grid[y * w + x] === 1) {
					map[y][x] = '#';
				} else {
					map[y][x] = '.';
					carvedCoords.push({ x, y });
				}
			}
		}
	}
	//#endregion

	//#region [SEC-04] Module Export & Staging Membrane Registration
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
	//#endregion
})();
