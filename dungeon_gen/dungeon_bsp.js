/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DUNGEON BSP CARVER SUB-MODULE
 * Document Identifier: VSRP-001-DUNGEON-BSP
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Math Kernel (Tier 4)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] PRNG Stream Factory
 *   [SEC-02] Binary Space Partitioning (BSP) Leaf Splitter & Layout Carver
 *
 * STAGING MEMBRANE KEY: window._DungeonGenInternal.BSP
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DungeonGenInternal = window._DungeonGenInternal || {};
if (typeof globalThis !== 'undefined') globalThis._DungeonGenInternal = globalThis._DungeonGenInternal || {};

(() => {
	'use strict';

	/**
	 * Creates a seeded pseudorandom number generator.
	 * @param {number} [seed] - Initialization seed.
	 * @returns {function(): number} PRNG floating-point supplier.
	 */
	function createRNG(seed) {
		if (
			typeof EmberlightPRNG !== "undefined" &&
			typeof EmberlightPRNG.create === "function"
		) {
			const p = EmberlightPRNG.create(seed || 123456789);
			return () => p.nextFloat();
		}
		let s = Number(seed) || 123456789;
		return () => {
			s = (s * 9301 + 49297) % 233280;
			return s / 233280;
		};
	}

	/**
	 * Evaluates and pushes valid leaf rooms during BSP subdivision.
	 * @param {{ rx: number, ry: number, rw: number, rh: number }} leaf - Leaf boundaries.
	 * @param {{ rng: function():number, rooms: Array<Object> }} env - Environment context.
	 * @returns {void}
	 */
	function createLeafRoom(leaf, env) {
		const { rx, ry, rw, rh } = leaf;
		const { rng, rooms } = env;
		const minRoomSize = 3;
		const actualW = Math.max(minRoomSize, Math.floor(rng() * (rw - 2)) + 2);
		const actualH = Math.max(minRoomSize, Math.floor(rng() * (rh - 2)) + 2);
		const startX = rx + Math.floor(rng() * (rw - actualW - 1)) + 1;
		const startY = ry + Math.floor(rng() * (rh - actualH - 1)) + 1;

		rooms.push({
			x: startX,
			y: startY,
			w: actualW,
			h: actualH,
			cx: Math.floor(startX + actualW / 2),
			cy: Math.floor(startY + actualH / 2),
		});
	}

	/**
	 * Recursively carves BSP dungeon leaf nodes.
	 * @param {{ rx: number, ry: number, rw: number, rh: number, depth: number }} leaf - Leaf boundaries and depth.
	 * @param {{ rng: function():number, rooms: Array<Object> }} env - Environment context.
	 * @returns {void}
	 */
	function splitLeaf(leaf, env) {
		const { rx, ry, rw, rh, depth } = leaf;
		const { rng } = env;
		const minRoomSize = 3;

		if (depth <= 0 || (rw < minRoomSize * 2 && rh < minRoomSize * 2)) {
			createLeafRoom({ rx, ry, rw, rh }, env);
			return;
		}

		if (rw > rh && rw > minRoomSize * 2) {
			const split = Math.floor(rng() * (rw - minRoomSize * 2)) + minRoomSize;
			splitLeaf({ rx, ry, rw: split, rh, depth: depth - 1 }, env);
			splitLeaf({ rx: rx + split, ry, rw: rw - split, rh, depth: depth - 1 }, env);
		} else if (rh > minRoomSize * 2) {
			const split = Math.floor(rng() * (rh - minRoomSize * 2)) + minRoomSize;
			splitLeaf({ rx, ry, rw, rh: split, depth: depth - 1 }, env);
			splitLeaf({ rx, ry: ry + split, rw, rh: rh - split, depth: depth - 1 }, env);
		} else {
			splitLeaf({ rx, ry, rw, rh, depth: depth - 1 }, env);
		}
	}

	/**
	 * Carves a single room region onto the tile map.
	 * @param {string[][]} map - Tile grid.
	 * @param {Object} r - Target room.
	 * @param {number} h - Height.
	 * @param {number} w - Width.
	 * @param {Array<{x:number, y:number}>} carvedCoords - Coordinates accumulator.
	 * @returns {void}
	 */
	function carveRoom(map, r, h, w, carvedCoords) {
		for (let ry = r.y; ry < r.y + r.h; ry++) {
			for (let rx = r.x; rx < r.x + r.w; rx++) {
				if (ry > 0 && ry < h - 1 && rx > 0 && rx < w - 1) {
					if (map[ry][rx] === "#") {
						map[ry][rx] = ".";
						carvedCoords.push({ x: rx, y: ry });
					}
				}
			}
		}
	}

	/**
	 * Carves a horizontal corridor segment.
	 * @param {string[][]} map - Tile grid.
	 * @param {number} startX - Start X.
	 * @param {number} targetX - Target X.
	 * @param {number} cy - Current Y.
	 * @param {number} w - Width.
	 * @param {number} h - Height.
	 * @param {Array<{x:number, y:number}>} carvedCoords - Coordinates accumulator.
	 * @returns {number} Updated X coordinate.
	 */
	function carveCorridorH(map, startX, targetX, cy, w, h, carvedCoords) {
		let cx = startX;
		while (cx !== targetX) {
			if (cy > 0 && cy < h - 1 && cx > 0 && cx < w - 1) {
				if (map[cy][cx] === "#") {
					map[cy][cx] = ".";
					carvedCoords.push({ x: cx, y: cy });
				}
			}
			cx += cx < targetX ? 1 : -1;
		}
		return cx;
	}

	/**
	 * Carves a vertical corridor segment.
	 * @param {string[][]} map - Tile grid.
	 * @param {number} cx - Current X.
	 * @param {number} startY - Start Y.
	 * @param {number} targetY - Target Y.
	 * @param {number} w - Width.
	 * @param {number} h - Height.
	 * @param {Array<{x:number, y:number}>} carvedCoords - Coordinates accumulator.
	 * @returns {number} Updated Y coordinate.
	 */
	function carveCorridorV(map, cx, startY, targetY, w, h, carvedCoords) {
		let cy = startY;
		while (cy !== targetY) {
			if (cy > 0 && cy < h - 1 && cx > 0 && cx < w - 1) {
				if (map[cy][cx] === "#") {
					map[cy][cx] = ".";
					carvedCoords.push({ x: cx, y: cy });
				}
			}
			cy += cy < targetY ? 1 : -1;
		}
		return cy;
	}

	/**
	 * Carves rooms and corridors onto the tile map.
	 * @param {string[][]} map - Tile grid.
	 * @param {Array<Object>} rooms - Carved rooms.
	 * @param {number} w - Width.
	 * @param {number} h - Height.
	 * @returns {Array<{x:number, y:number}>} Carved coordinate array.
	 */
	function carveLayout(map, rooms, w, h) {
		const carvedCoords = [];
		rooms.forEach((r) => {
			carveRoom(map, r, h, w, carvedCoords);
		});

		for (let i = 0; i < rooms.length - 1; i++) {
			const curr = rooms[i];
			const next = rooms[i + 1];
			const cx = carveCorridorH(map, curr.cx, next.cx, curr.cy, w, h, carvedCoords);
			carveCorridorV(map, cx, curr.cy, next.cy, w, h, carvedCoords);
		}
		return carvedCoords;
	}

	const BSP = Object.freeze({
		createRNG,
		createLeafRoom,
		splitLeaf,
		carveRoom,
		carveCorridorH,
		carveCorridorV,
		carveLayout,
	});

	if (typeof window !== 'undefined') {
		window._DungeonGenInternal.BSP = BSP;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis._DungeonGenInternal.BSP = BSP;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = BSP;
	}
})();
