/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTER - DDA RAYCASTING KERNEL & CAMERA MATH
 * Document Identifier: VSRP-001-PSEUDO-3D-DDA
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-FACADE-001
 * Authority:           Peripheral Presentation (Subsystem Module)
 * ============================================================================
 */

'use strict';

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
	 * @param {any} camera - Camera state object.
	 * @param {number} fovRad - Field of view angle in radians.
	 * @param {number} cosA - Cosine of camera angle.
	 * @param {number} sinA - Sine of camera angle.
	 * @returns {{ planeX: number, planeY: number }} Projection plane vector components.
	 */
	function computeFov(camera, fovRad, cosA, sinA) {
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

	return Object.freeze({
		WALL_TILES,
		computeCameraPlane,
		computeFov,
		castDdaRay,
		computeWallColumnPlan,
		computeFloorRowPlan,
		lerpCamera,
	});
})();

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
	window._Pseudo3DInternal.DDA = Pseudo3DDDA;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Pseudo3DDDA;
}
