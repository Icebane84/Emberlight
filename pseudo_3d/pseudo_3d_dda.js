/* cSpell:words Amanatides */
/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTER - DDA RAYCASTING KERNEL & CAMERA MATH
 * Document Identifier: VSRP-001-PSEUDO-3D-DDA
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-FACADE-001
 * Authority:           Peripheral Presentation (Subsystem Module)
 * ============================================================================
 */

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
}

const Pseudo3DDDA = (() => {
	const WALL_TILES = Object.freeze(new Set(["#", "B", "F", "P"]));

	/**
	 * Computes cosine and sine vectors for camera facing angle.
	 * Pure mathematical calculation.
	 * @param {{ angle: number }} camera - Current camera state object.
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
	 * @param {any} _camera - Camera state object.
	 * @param {number} fovRad - Field of view angle in radians.
	 * @param {number} cosA - Cosine of camera angle.
	 * @param {number} sinA - Sine of camera angle.
	 * @returns {{ planeX: number, planeY: number }} Projection plane vector components.
	 */
	function computeFov(_camera, fovRad, cosA, sinA) {
		const fovScale = Math.tan(fovRad / 2);
		return { planeX: -sinA * fovScale, planeY: cosA * fovScale };
	}

	/**
	 * Casts a single DDA ray across the grid map.
	 * Pure raycasting calculation procedure.
	 * @param {any} camera - Camera state object.
	 * @param {number} cameraX - Normalized screen column coordinate (-1 to 1).
	 * @param {{ cosA: number, sinA: number, planeX: number, planeY: number }} plane - Camera plane and vector components.
	 * @param {string[][]} map - 2D grid map matrix.
	 * @param {any} config - Engine configuration dictionary.
	 * @returns {any} Raycast intersection result descriptor.
	 */
	function castDdaRay(camera, cameraX, plane, map, config) {
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
				!map?.[0] ||
				mapY < 0 ||
				mapY >= map.length ||
				!map[mapY] ||
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

	/**
	 * Computes geometry plan for rendering a single vertical wall column.
	 * Pure geometry calculation procedure.
	 * @param {any} ray - Raycast intersection result.
	 * @param {any} camera - Camera state object.
	 * @param {{ width: number, height: number }} dims - Viewport dimensions.
	 * @param {any} config - Engine configuration dictionary.
	 * @returns {any} Wall column draw plan descriptor.
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
	 * @param {any} camera - Camera state object.
	 * @param {number} planeX - Projection plane X vector component.
	 * @param {number} planeY - Projection plane Y vector component.
	 * @param {number} cosA - Cosine of camera angle.
	 * @param {number} sinA - Sine of camera angle.
	 * @param {{ width: number, height: number }} dims - Viewport dimensions.
	 * @returns {any} Floor scanline row plan descriptor.
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
	 * @param {any} camera - Current camera state object.
	 * @param {number} dt - Frame delta time in seconds.
	 * @param {number} rate - Exponential decay smoothing rate.
	 * @returns {any} New interpolated camera state object.
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
	 * Amanatides & Woo (1987) Fast Voxel Traversal Algorithm (DDA 2.5D / Voxel Raycaster).
	 * Pure Vanilla JavaScript | Zero Trigonometry in Hot Loop | O(1) Per Boundary Step.
	 */
	class SovereignDDARaycaster {
		/**
		 * Constructs a new DDA Raycaster on a 1D flat or 2D nested grid.
		 * @param {Array<string|number>|Array<Array<string|number>>|Uint8Array} grid - 1D or 2D grid matrix.
		 * @param {number} mapWidth - Width of grid in cells.
		 * @param {number} mapHeight - Height of grid in cells.
		 * @param {Set<string|number>|((tile: any) => boolean)|Function|null} [solidPredicate=null] - Optional custom obstacle test.
		 */
		constructor(grid, mapWidth, mapHeight, solidPredicate = null) {
			this.grid = grid;
			this.width = Math.trunc(mapWidth);
			this.height = Math.trunc(mapHeight);
			this.is2D = Array.isArray(grid) && Array.isArray(grid[0]);
			this.solidPredicate = solidPredicate;
		}

		/**
		 * Retrieves the tile value at integer grid coordinate (x, y).
		 * @param {number} x - Voxel grid column coordinate.
		 * @param {number} y - Voxel grid row coordinate.
		 * @returns {any} Tile value or null if out of bounds.
		 */
		getTile(x, y) {
			if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
				return null;
			}
			const g = /** @type {any} */ (this.grid);
			return this.is2D ? g[y][x] : g[y * this.width + x];
		}

		/**
		 * Tests whether a tile value constitutes a solid blocking barrier.
		 * @param {any} tile - Cell tile value.
		 * @returns {boolean}
		 */
		isSolid(tile) {
			if (tile === null || tile === undefined) return false;
			if (typeof this.solidPredicate === 'function') {
				return Boolean(this.solidPredicate(tile));
			}
			if (this.solidPredicate && typeof this.solidPredicate.has === 'function') {
				return this.solidPredicate.has(tile);
			}
			if (WALL_TILES.has(tile)) return true;
			if (typeof tile === 'number') return tile > 0;
			return tile !== '.' && tile !== ' ' && tile !== 0;
		}

		/**
		 * Casts an Amanatides & Woo DDA ray from origin (px, py) along direction vector (dx, dy).
		 *
		 * @param {number} px - Ray origin continuous X coordinate.
		 * @param {number} py - Ray origin continuous Y coordinate.
		 * @param {number} dx - Ray direction vector X component.
		 * @param {number} dy - Ray direction vector Y component.
		 * @param {number} [maxDist=32.0] - Maximum traversal distance.
		 * @returns {{ hit: any, distance: number, side: number, mapX: number, mapY: number, hitX: number, hitY: number }}
		 */
		castRay(px, py, dx, dy, maxDist = 32.0) {
			let mapX = Math.floor(px);
			let mapY = Math.floor(py);
			const deltaX = Math.abs(1 / (dx || 1e-6));
			const deltaY = Math.abs(1 / (dy || 1e-6));
			const stepX = dx < 0 ? -1 : 1;
			let sideX = (dx < 0 ? (px - mapX) : (mapX + 1.0 - px)) * deltaX;
			const stepY = dy < 0 ? -1 : 1;
			let sideY = (dy < 0 ? (py - mapY) : (mapY + 1.0 - py)) * deltaY;
			let hit = null;
			let side = 0;
			let distance = 0;

			while (!hit && distance < maxDist) {
				if (sideX < sideY) {
					sideX += deltaX;
					mapX += stepX;
					side = 0;
					distance = sideX - deltaX;
				} else {
					sideY += deltaY;
					mapY += stepY;
					side = 1;
					distance = sideY - deltaY;
				}

				if (mapX < 0 || mapX >= this.width || mapY < 0 || mapY >= this.height) {
					break;
				}

				const tile = this.getTile(mapX, mapY);
				if (this.isSolid(tile)) {
					hit = tile;
					break;
				}
			}

			const hitX = px + (dx || 1e-6) * distance;
			const hitY = py + (dy || 1e-6) * distance;

			return { hit, distance, side, mapX, mapY, hitX, hitY };
		}

		/**
		 * Evaluates whether a cell is in bounds and visits it via callback.
		 * [Internal Helper]
		 * @param {number} x
		 * @param {number} y
		 * @param {(x: number, y: number, tile: any) => boolean|void} callback
		 * @returns {boolean}
		 */
		_visitCell(x, y, callback) {
			if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
				return false;
			}
			return callback(x, y, this.getTile(x, y)) !== false;
		}

		/**
		 * Traverses all voxel grid cells along line segment from (x0, y0) to (x1, y1).
		 * @param {number} x0 - Start coordinate X.
		 * @param {number} y0 - Start coordinate Y.
		 * @param {number} x1 - End coordinate X.
		 * @param {number} y1 - End coordinate Y.
		 * @param {(x: number, y: number, tile: any) => boolean|void} callback - Visitor callback.
		 * @returns {boolean} True if completed without early termination.
		 */
		traverseSegment(x0, y0, x1, y1, callback) {
			const dx = x1 - x0;
			const dy = y1 - y0;
			const totalDist = Math.hypot(dx, dy);
			const startMapX = Math.floor(x0);
			const startMapY = Math.floor(y0);

			if (!this._visitCell(startMapX, startMapY, callback) || totalDist < 1e-6) {
				return true;
			}

			let mapX = startMapX;
			let mapY = startMapY;
			const targetMapX = Math.floor(x1);
			const targetMapY = Math.floor(y1);

			const deltaX = Math.abs(1 / (dx / totalDist || 1e-6));
			const deltaY = Math.abs(1 / (dy / totalDist || 1e-6));
			const stepX = dx < 0 ? -1 : 1;
			let sideX = (dx < 0 ? (x0 - mapX) : (mapX + 1.0 - x0)) * deltaX;
			const stepY = dy < 0 ? -1 : 1;
			let sideY = (dy < 0 ? (y0 - mapY) : (mapY + 1.0 - y0)) * deltaY;

			let currentDist = 0;
			while (currentDist < totalDist) {
				if (mapX === targetMapX && mapY === targetMapY) {
					break;
				}
				if (sideX < sideY) {
					sideX += deltaX;
					mapX += stepX;
					currentDist = sideX - deltaX;
				} else {
					sideY += deltaY;
					mapY += stepY;
					currentDist = sideY - deltaY;
				}

				if (!this._visitCell(mapX, mapY, callback)) {
					return false;
				}
			}

			return true;
		}
	}

	return Object.freeze({
		WALL_TILES,
		computeCameraPlane,
		computeFov,
		castDdaRay,
		computeWallColumnPlan,
		computeFloorRowPlan,
		lerpCamera,
		SovereignDDARaycaster,
		EmberlightDDARaycaster: SovereignDDARaycaster,
	});
})();

if (typeof window !== 'undefined') {
	const win = /** @type {any} */ (window);
	win._Pseudo3DInternal = win._Pseudo3DInternal || {};
	win._Pseudo3DInternal.DDA = Pseudo3DDDA;
	win.SovereignDDARaycaster = Pseudo3DDDA.SovereignDDARaycaster;
	win.EmberlightDDARaycaster = Pseudo3DDDA.SovereignDDARaycaster;
}

((g) => {
	if (!g) return;
	const target = /** @type {any} */ (g);
	target._Pseudo3DInternal = target._Pseudo3DInternal || {};
	target._Pseudo3DInternal.DDA = Pseudo3DDDA;
	target.SovereignDDARaycaster = Pseudo3DDDA.SovereignDDARaycaster;
	target.EmberlightDDARaycaster = Pseudo3DDDA.SovereignDDARaycaster;
})(typeof globalThis !== 'undefined' ? globalThis : null);

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Pseudo3DDDA;
}
