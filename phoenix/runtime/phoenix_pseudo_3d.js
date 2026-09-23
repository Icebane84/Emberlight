/* cSpell:words Amanatides */
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: RETRO PSEUDO-3D DDA RAYCASTER
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-PSEUDO-3D
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Runtime Subsystem
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

//#region [SEC-06] Graphics Tier 3: Retro Pseudo-3D DDA Raycaster
/**
 * @param {(number | string)[][]} mapGrid
 * @param {number} mapX
 * @param {number} mapY
 * @returns {number}
 */
function _checkCellHit(mapGrid, mapX, mapY) {
	if (mapY < 0 || mapY >= mapGrid.length) return 1;
	const row = mapGrid[ mapY ];
	if (!row || mapX < 0 || mapX >= row.length) return 1;
	const cell = row[ mapX ];
	if (!cell || cell === " " || cell === ".") return 0;
	const num = typeof cell === "number" ? cell : Number(cell);
	return Number.isNaN(num) ? 1 : num;
}

/**
 * @param {(number | string)[][]} mapGrid
 * @param {{ angle: number; x: number; y: number; }} player
 * @param {number} rayAngle
 * @param {number} rayIndex
 */
function _castSingleRay(mapGrid, player, rayAngle, rayIndex) {
	const rayDirX = Math.cos(rayAngle);
	const rayDirY = Math.sin(rayAngle);

	let mapX = Math.floor(player.x);
	let mapY = Math.floor(player.y);

	const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
	const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

	const stepX = rayDirX < 0 ? -1 : 1;
	let sideDistX = rayDirX < 0 ? (player.x - mapX) * deltaDistX : (mapX + 1.0 - player.x) * deltaDistX;

	const stepY = rayDirY < 0 ? -1 : 1;
	let sideDistY = rayDirY < 0 ? (player.y - mapY) * deltaDistY : (mapY + 1.0 - player.y) * deltaDistY;

	let hit = 0;
	let side = 0;
	let maxSteps = 64;

	while (hit === 0 && maxSteps > 0) {
		maxSteps--;
		if (sideDistX < sideDistY) {
			sideDistX += deltaDistX;
			mapX += stepX;
			side = 0;
		} else {
			sideDistY += deltaDistY;
			mapY += stepY;
			side = 1;
		}

		hit = _checkCellHit(mapGrid, mapX, mapY);
	}

	const perpWallDist = side === 0
		? (mapX - player.x + (1 - stepX) / 2) / (rayDirX || 0.00001)
		: (mapY - player.y + (1 - stepY) / 2) / (rayDirY || 0.00001);

	// Fish-eye lens correction
	const correctedDist = Math.max(0.1, perpWallDist * Math.cos(rayAngle - player.angle));

	let wallX = side === 0 ? player.y + perpWallDist * rayDirY : player.x + perpWallDist * rayDirX;
	wallX -= Math.floor(wallX);

	return {
		rayIndex,
		rayAngle,
		distance: correctedDist,
		hitTile: hit,
		side,
		wallX,
		mapX,
		mapY
	};
}

// =========================================================================
// [GRAPHICS TIER 3] Retro Pseudo-3D DDA Raycaster & Mode-7 Engine
// =========================================================================
const PhoenixPseudo3DRaycaster = Object.freeze({
	/**
	 * @param {(number | string)[][]} mapGrid
	 * @param {{ angle: number; x: number; y: number; }} player
	 */
	castRays(mapGrid, player, fov = Math.PI / 3, numRays = 320) {
		if (!mapGrid || !player) return [];
		const results = [];
		const halfFov = fov / 2;

		for (let i = 0; i < numRays; i++) {
			const rayAngle = player.angle - halfFov + (i / numRays) * fov;
			results.push(_castSingleRay(mapGrid, player, rayAngle, i));
		}

		return results;
	},

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Array<{ rayIndex: number; rayAngle: number; distance: number; hitTile: number | string; side: number; wallX: number; mapX: number; mapY: number }>} rayResults
	 * @param {number} screenW
	 * @param {number} screenH
	 */
	render3DView(ctx, rayResults, screenW, screenH, {
		ceilingColor = "#0d131a",
		floorColor = "#06090d",
		wallColor = "#00ffcc",
		fogDensity = 0.12
	} = {}) {
		if (!ctx || !rayResults || rayResults.length === 0) return;

		// Draw ceiling and floor
		ctx.fillStyle = ceilingColor;
		ctx.fillRect(0, 0, screenW, screenH / 2);
		ctx.fillStyle = floorColor;
		ctx.fillRect(0, screenH / 2, screenW, screenH / 2);

		const sliceWidth = screenW / rayResults.length;

		for (let i = 0; i < rayResults.length; i++) {
			const ray = rayResults[ i ];
			const lineHeight = Math.min(screenH * 4, (screenH / ray.distance));
			const drawStart = Math.max(0, -lineHeight / 2 + screenH / 2);
			const drawEnd = Math.min(screenH, lineHeight / 2 + screenH / 2);

			// Darken horizontal walls
			const sideFactor = ray.side === 1 ? 0.7 : 1.0;
			const fog = Math.min(1.0, ray.distance * fogDensity);

			ctx.fillStyle = wallColor;
			ctx.globalAlpha = (1.0 - fog) * sideFactor;
			ctx.fillRect(i * sliceWidth, drawStart, sliceWidth + 0.5, drawEnd - drawStart);
		}
		ctx.globalAlpha = 1.0;
	},

	/**
	 * @param {Array<{ x: number; y: number; [key: string]: unknown }>} sprites
	 * @param {{ angle: number; x: number; y: number; }} player
	 * @param {number} [fov]
	 * @param {number} [screenW]
	 * @param {number} [screenH]
	 */
	projectSprites(sprites, player, fov = Math.PI / 3, screenW = 640, screenH = 480) {
		if (!sprites || !player) return [];
		const projected = [];

		for (const spr of sprites) {
			const spriteX = spr.x - player.x;
			const spriteY = spr.y - player.y;

			const dirX = Math.cos(player.angle);
			const dirY = Math.sin(player.angle);
			const planeX = -dirY * Math.tan(fov / 2);
			const planeY = dirX * Math.tan(fov / 2);

			const invMat = 1.0 / (planeX * dirY - dirX * planeY || 0.00001);
			const transformX = invMat * (dirY * spriteX - dirX * spriteY);
			const transformY = invMat * (-planeY * spriteX + planeX * spriteY);

			if (transformY > 0.1) {
				const screenX = (screenW / 2) * (1 + transformX / transformY);
				const spriteHeight = Math.abs(screenH / transformY);
				const spriteWidth = Math.abs(screenH / transformY);
				projected.push({
					sprite: spr,
					distance: transformY,
					screenX,
					screenY: screenH / 2,
					width: spriteWidth,
					height: spriteHeight
				});
			}
		}

		// Sort back-to-front
		return projected.sort((a, b) => b.distance - a.distance);
	}
});
//#endregion

	global.PhoenixPseudo3DRaycaster = PhoenixPseudo3DRaycaster;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { PhoenixPseudo3DRaycaster };
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
