/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTER - PIXEL RENDERING & HUD PIPELINE
 * Document Identifier: VSRP-001-PSEUDO-3D-PIPELINE
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-FACADE-001
 * Authority:           Peripheral Presentation (Subsystem Module)
 * ============================================================================
 */

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
}

const Pseudo3DPipeline = (() => {
	/**
	 * Computes raw sky color for scanline row.
	 * Pure calculation helper.
	 * @param {number} y - Row Y coordinate.
	 * @param {number} H - Viewport height.
	 * @param {(r: number, g: number, b: number) => number} packColor - Color packer.
	 * @returns {number} Packed color integer.
	 */
	function getSkyColor(y, H, packColor) {
		const halfH = H / 2;
		const skyRatio = (y - halfH) / halfH;
		const sr = Math.floor(6 + skyRatio * 10);
		const sg = Math.floor(10 + skyRatio * 18);
		const sb = Math.floor(22 + skyRatio * 32);
		return packColor(sr, sg, sb);
	}

	/**
	 * Processes a single scanline row for floors and ceilings.
	 * @param {number} y - Row Y coordinate.
	 * @param {any} plane - Projection plane vectors.
	 * @param {any} lighting - Lighting parameters.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function processFloorScanline(y, plane, lighting, state, math) {
		const { planeX, planeY, cosA, sinA } = plane;
		const { torchFlicker, isTown, isDungeon } = lighting;
		const { camera, dims, W, H, config, textures, pixelBuf } = state;
		const plan = math.computeFloorRowPlan(
			y,
			camera,
			planeX,
			planeY,
			cosA,
			sinA,
			dims,
		);
		let { floorX, floorY } = plan;
		const ceilY = H - y;
		const rowOffsetFloor = y * W;
		const rowOffsetCeil = ceilY * W;
		const size = config.textureSize;
		let floorTex;
		if (isDungeon) {
			floorTex = textures.FLOOR;
		} else if (isTown) {
			floorTex = textures.COBBLE || textures.TIMBER;
		} else {
			floorTex = textures.GRASS || textures.FLOOR;
		}
		const ceilTex = textures.CEILING;
		const stride = config.columnStride;

		for (let x = 0; x < W; x += stride) {
			const tx = Math.trunc(floorX * size) & (size - 1);
			const ty = Math.trunc(floorY * size) & (size - 1);
			const texIdx = ty * size + tx;

			const shadedFloor = math.applyFog(
				floorTex[texIdx],
				plan.rowDistance,
				torchFlicker,
				isDungeon,
				config,
			);
			for (let k = 0; k < stride && x + k < W; k++)
				pixelBuf[rowOffsetFloor + x + k] = shadedFloor;

			const rawCeil = isDungeon ? ceilTex[texIdx] : getSkyColor(y, H, math.packColor);
			const shadedCeil = math.applyFog(
				rawCeil,
				plan.rowDistance,
				torchFlicker,
				isDungeon,
				config,
			);
			for (let k = 0; k < stride && x + k < W; k++)
				pixelBuf[rowOffsetCeil + x + k] = shadedCeil;

			floorX += plan.stepX * stride;
			floorY += plan.stepY * stride;
		}
	}

	/**
	 * Renders floor and ceiling pixels onto the pixel buffer.
	 * @param {number} torchFlicker - Current torch flicker multiplier.
	 * @param {boolean} isTown - Town mode activation flag.
	 * @param {boolean} isDungeon - Subterranean dungeon mode flag.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function renderFloorAndCeiling(torchFlicker, isTown, isDungeon, state, math) {
		if (!state.pixelBuf) return;
		const { cosA, sinA } = math.computeCameraPlane(state.camera);
		const { planeX, planeY } = math.computeFov(
			state.camera,
			state.FOV,
			cosA,
			sinA,
		);
		const plane = { planeX, planeY, cosA, sinA };
		const lighting = { torchFlicker, isTown, isDungeon };
		const halfH = state.H / 2;

		for (let y = Math.trunc(halfH) + 1; y < state.H; y++) {
			processFloorScanline(y, plane, lighting, state, math);
		}
	}

	/**
	 * Renders a single vertical wall column onto the pixel buffer.
	 * @param {number} x - Column X coordinate.
	 * @param {string[][]} map - Map matrix.
	 * @param {any} plane - Camera plane vectors.
	 * @param {number} torchFlicker - Torch flicker factor.
	 * @param {boolean} isTown - Town mode flag.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function renderWallColumn(x, map, plane, torchFlicker, isTown, state, math) {
		const { camera, config, W, dims, depthBuffer, textures, pixelBuf } = state;
		const cameraX = (2 * x) / W - 1;
		const ray = math.castDdaRay(
			camera,
			cameraX,
			plane,
			map,
			config,
		);
		for (let k = 0; k < config.columnStride && x + k < W; k++)
			depthBuffer[x + k] = ray.perpDist;

		const plan = math.computeWallColumnPlan(
			ray,
			camera,
			dims,
			config,
		);
		const texKey = math.resolveWallTextureKey(ray.hitTile, isTown);
		const activeTex = textures[texKey];
		let texPos = plan.texPosStart;
		const size = config.textureSize;

		for (let y = plan.drawStart; y <= plan.drawEnd; y++) {
			const texY = Math.trunc(texPos) & (size - 1);
			texPos += plan.step;
			let color = activeTex[texY * size + plan.texX];

			if (color !== 0) {
				if (ray.side === 1) {
					const f = config.sideShadeFactor;
					const r = Math.trunc((color & 0xff) * f);
					const g = Math.trunc(((color >> 8) & 0xff) * f);
					const b = Math.trunc(((color >> 16) & 0xff) * f);
					color = math.packColor(r, g, b);
				}
				const shaded = math.applyFog(
					color,
					ray.perpDist,
					torchFlicker,
					false,
					config,
				);
				for (let k = 0; k < config.columnStride && x + k < W; k++)
					pixelBuf[y * W + x + k] = shaded;
			}
		}
	}

	/**
	 * Renders vertical wall columns onto the pixel buffer.
	 * @param {string[][]} map - 2D grid map matrix.
	 * @param {number} torchFlicker - Torch flicker multiplier.
	 * @param {boolean} isTown - Town mode activation flag.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function renderWalls(map, torchFlicker, isTown, state, math) {
		if (!state.pixelBuf) return;
		const { cosA, sinA } = math.computeCameraPlane(state.camera);
		const { planeX, planeY } = math.computeFov(
			state.camera,
			state.FOV,
			cosA,
			sinA,
		);
		const plane = { cosA, sinA, planeX, planeY };
		const stride = state.config.columnStride;

		for (let x = 0; x < state.W; x += stride) {
			renderWallColumn(x, map, plane, torchFlicker, isTown, state, math);
		}
	}

	/**
	 * Renders a single sprite billboard onto the canvas context.
	 * @param {any} sp - Visible sprite descriptor.
	 * @param {{ planeX: number, planeY: number, cosA: number, sinA: number }} plane - Projection plane vectors.
	 * @param {number} torchFlicker - Torch flicker factor.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function drawSpriteBillboard(sp, plane, torchFlicker, state, math) {
		const glyph = math.BILLBOARD_GLYPHS[sp.tile];
		if (!glyph) return;
		const proj = math.projectSprite(
			state.camera,
			sp,
			plane.planeX,
			plane.planeY,
			plane.cosA,
			plane.sinA,
			state.dims,
		);
		if (!proj) return;
		if (proj.spriteScreenX < 0 || proj.spriteScreenX >= state.W) return;
		if (proj.transformY >= state.depthBuffer[proj.spriteScreenX]) return;

		const ctx = state.ctx;
		if (!ctx) return;
		ctx.save();
		const fontSize = Math.max(
			state.config.billboard.fontMin,
			Math.min(state.config.billboard.fontMax, proj.spriteH),
		);
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.globalAlpha = Math.max(
			0.15,
			1.0 -
			(sp.dist / (state.config.maxDepth * torchFlicker)) **
			state.config.billboard.fadeExponent,
		);

		const shadow = math.resolveBillboardShadow(sp.tile);
		ctx.shadowColor = shadow.color;
		ctx.shadowBlur = shadow.blur;
		if (ctx.fillText)
			ctx.fillText(glyph, proj.spriteScreenX, state.H / 2 + proj.spriteH * 0.08);
		ctx.restore();
	}

	/**
	 * Renders visible billboard sprites onto the 2D canvas context.
	 * @param {string[][]} map - 2D grid map matrix.
	 * @param {number} torchFlicker - Torch flicker multiplier.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function renderBillboards(map, torchFlicker, state, math) {
		if (!state.ctx) return;
		const sprites = math.computeVisibleSprites(state.camera, map, state.config);
		if (sprites.length === 0) return;

		const { cosA, sinA } = math.computeCameraPlane(state.camera);
		const { planeX, planeY } = math.computeFov(
			state.camera,
			state.FOV,
			cosA,
			sinA,
		);
		const plane = { planeX, planeY, cosA, sinA };

		for (const sp of sprites) {
			drawSpriteBillboard(sp, plane, torchFlicker, state, math);
		}
	}

	/**
	 * Updates compass ribbon DOM element bearing text.
	 * @param {number} angle - Camera facing angle in radians.
	 * @param {string} compassRibbonId - Element ID.
	 */
	function updateCompassRibbon(angle, compassRibbonId) {
		if (typeof document === "undefined") return;
		const el = document.getElementById(compassRibbonId);
		if (!el) return;
		let deg = ((angle * 180) / Math.PI + 90) % 360;
		if (deg < 0) deg += 360;
		deg = Math.trunc(deg);
		let cardinal = "NORTH";
		if (deg >= 45 && deg < 135) cardinal = "EAST";
		else if (deg >= 135 && deg < 225) cardinal = "SOUTH";
		else if (deg >= 225 && deg < 315) cardinal = "WEST";
		el.textContent = `\u25B2 ${cardinal} (${deg.toString().padStart(3, "0")}\u00B0)`;
	}

	/**
	 * @typedef {Object} MinimapCellParams
	 * @property {string[][]} map
	 * @property {{ x: number, y: number }} playerPos
	 * @property {number} radius
	 * @property {number} cellW
	 * @property {number} cellH
	 * @property {CanvasRenderingContext2D} minimapCtx
	 * @property {any} math
	 */

	/**
	 * Renders a single cell on the minimap radar.
	 * @param {MinimapCellParams} params - Minimap context parameters.
	 * @param {number} dx - Relative grid X offset.
	 * @param {number} dy - Relative grid Y offset.
	 */
	function drawMinimapCell(params, dx, dy) {
		const { map, playerPos, radius, cellW, cellH, minimapCtx, math } = params;
		if (!minimapCtx) return;
		const gx = playerPos.x + dx;
		const gy = playerPos.y + dy;
		const rx = (dx + radius) * cellW;
		const ry = (dy + radius) * cellH;
		const oob = !map?.[0] || gy < 0 || gy >= map.length || gx < 0 || gx >= map[0].length;
		const tile = oob ? "" : (map[gy]?.[gx] || "");
		minimapCtx.fillStyle = math.getMinimapTileColor(tile, oob);
		minimapCtx.fillRect(rx, ry, cellW - 1, cellH - 1);
	}

	/**
	 * Renders minimap radar overlay onto minimap canvas context.
	 * @param {string[][]} map - 2D grid map matrix.
	 * @param {{ x: number, y: number }} playerPos - Player grid coordinates.
	 * @param {any} state - Pipeline state container.
	 * @param {any} math - RaycastMath operations container.
	 */
	function renderMinimapRadar(map, playerPos, state, math) {
		const { minimapCtx, minimapCanvas, config, camera } = state;
		if (!minimapCtx || !minimapCanvas || !map || !playerPos) return;
		const mw = minimapCanvas.width,
			mh = minimapCanvas.height;
		const radius = config.minimap.radiusTiles;
		const cellW = mw / (radius * 2 + 1);
		const cellH = mh / (radius * 2 + 1);

		minimapCtx.fillStyle = "rgba(5, 8, 18, 0.95)";
		minimapCtx.fillRect(0, 0, mw, mh);

		const cellParams = { map, playerPos, radius, cellW, cellH, minimapCtx, math };
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				drawMinimapCell(cellParams, dx, dy);
			}
		}

		const pcx = radius * cellW + cellW / 2,
			pcy = radius * cellH + cellH / 2;
		minimapCtx.fillStyle = "#fbbf24";
		minimapCtx.beginPath();
		minimapCtx.arc(pcx, pcy, Math.min(cellW, cellH) * 0.35, 0, Math.PI * 2);
		minimapCtx.fill();

		const { cosA, sinA } = math.computeCameraPlane(camera);
		minimapCtx.strokeStyle = "#38bdf8";
		minimapCtx.lineWidth = 1.5;
		minimapCtx.beginPath();
		minimapCtx.moveTo(pcx, pcy);
		minimapCtx.lineTo(
			pcx + cosA * (cellW * 0.85),
			pcy + sinA * (cellH * 0.85),
		);
		minimapCtx.stroke();

		minimapCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
		minimapCtx.lineWidth = 1;
		minimapCtx.strokeRect(0, 0, mw, mh);
	}

	/**
	 * Renders lighting vignette overlay.
	 * @param {CanvasRenderingContext2D} ctx - Canvas context.
	 * @param {number} W - Viewport width.
	 * @param {number} H - Viewport height.
	 * @param {boolean} isDungeon - Dungeon mode flag.
	 */
	function renderVignette(ctx, W, H, isDungeon) {
		if (!ctx?.createRadialGradient || !ctx.fillRect) return;
		ctx.save();
		const vignette = ctx.createRadialGradient(
			W / 2,
			H / 2,
			isDungeon ? 25 : 40,
			W / 2,
			H / 2,
			W * (isDungeon ? 0.5 : 0.55),
		);
		if (isDungeon) {
			vignette.addColorStop(0, "rgba(255, 140, 50, 0.05)");
			vignette.addColorStop(0.55, "rgba(5, 3, 10, 0.45)");
			vignette.addColorStop(1, "rgba(2, 2, 6, 0.96)");
		} else {
			vignette.addColorStop(0, "rgba(255, 157, 77, 0.02)");
			vignette.addColorStop(0.7, "rgba(5, 5, 13, 0.20)");
			vignette.addColorStop(1, "rgba(3, 3, 8, 0.82)");
		}
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, W, H);
		ctx.restore();
	}

	/**
	 * Renders debug HUD text overlay.
	 * @param {CanvasRenderingContext2D} ctx - Canvas context.
	 * @param {string[][]} map - 2D map matrix.
	 * @param {string} facing - Player facing token.
	 * @param {any} camera - Camera state.
	 * @param {boolean} isExpandedMode - Expanded viewport mode flag.
	 */
	function renderDebugHud(ctx, map, facing, camera, isExpandedMode) {
		if (!ctx?.fillText || isExpandedMode) return;
		ctx.save();
		ctx.fillStyle = "#ff9d4d";
		ctx.font = '8px "Press Start 2P", monospace';
		ctx.textAlign = "left";
		ctx.fillText(`BEARING: ${facing || "DOWN"}`, 16, 22);

		const aheadX = Math.trunc(camera.x + Math.cos(camera.angle) * 1.0);
		const aheadY = Math.trunc(camera.y + Math.sin(camera.angle) * 1.0);
		const aheadTile = map[aheadY]?.[aheadX] || "#";
		ctx.fillStyle = "#7a7a9e";
		ctx.font = '7px "Press Start 2P", monospace';
		ctx.fillText(`AHEAD: [${aheadTile}]`, 16, 34);
		ctx.restore();
	}

	/**
	 * @typedef {Object} VignetteAndHudParams
	 * @property {CanvasRenderingContext2D} ctx - Canvas 2D context.
	 * @property {number} W - Viewport width.
	 * @property {number} H - Viewport height.
	 * @property {boolean} isDungeon - Dungeon environment flag.
	 * @property {string[][]} map - 2D grid map matrix.
	 * @property {string} facing - Facing orientation string.
	 * @property {any} camera - Camera state descriptor.
	 * @property {boolean} isExpandedMode - Expanded view flag.
	 */

	/**
	 * Renders lighting vignette and debug HUD information overlay.
	 * @param {VignetteAndHudParams} params - Render parameters container.
	 */
	function renderVignetteAndDebugHud(params) {
		renderVignette(params.ctx, params.W, params.H, params.isDungeon);
		renderDebugHud(params.ctx, params.map, params.facing, params.camera, params.isExpandedMode);
	}

	/**
	 * Extracts environment flags from state and map.
	 * @param {any} state - Game state.
	 * @param {string[][]} map - Map matrix.
	 * @param {{ x: number, y: number }} playerPos - Player coordinates.
	 * @returns {{ isDungeon: boolean, isTown: boolean }} Resolved environment flags.
	 */
	function resolveEnvironment(state, map, playerPos) {
		const isDungeon = Boolean(
			(state.depth && state.depth > 0) ||
			(state.dungeonDepth && state.dungeonDepth > 0) ||
			(map[playerPos.y]?.[playerPos.x] === ">")
		);
		const isTown = Boolean(
			state.townId ||
			state.inTown ||
			state.pos?.inTown ||
			state.playerPos?.inTown ||
			state.flags?.in_town ||
			state.flags?.townId ||
			(map[playerPos.y]?.[playerPos.x] === "T")
		);
		return { isDungeon, isTown };
	}

	/**
	 * Computes current torch flicker factor.
	 * @param {number} cameraT - Camera internal clock.
	 * @returns {number} Torch flicker multiplier.
	 */
	function computeTorchFlicker(cameraT) {
		return 0.94 + Math.sin(cameraT * 3.7) * 0.05 + Math.cos(cameraT * 7.1) * 0.03;
	}

	return Object.freeze({
		getSkyColor,
		processFloorScanline,
		renderFloorAndCeiling,
		renderWallColumn,
		renderWalls,
		drawSpriteBillboard,
		renderBillboards,
		updateCompassRibbon,
		drawMinimapCell,
		renderMinimapRadar,
		renderVignette,
		renderDebugHud,
		renderVignetteAndDebugHud,
		resolveEnvironment,
		computeTorchFlicker,
	});
})();

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
	window._Pseudo3DInternal.Pipeline = Pseudo3DPipeline;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Pseudo3DPipeline;
}
