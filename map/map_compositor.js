/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MAP COMPOSITOR & VIEWPORT SUB-MODULE
 * Document Identifier: VSRP-001-MAP-COMPOSITOR
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-MAP-RENDERER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] Viewport Defaults & Sprite Atlas Caching (Lines 112–113, 158–191)
 *   [SEC-05] Map Frame Compilation, Special Features & Layer Compositing (Lines 949–1455)
 *
 * STAGING MEMBRANE KEY: window._MapInternal.Compositor
 * DEPENDENCIES: window._MapInternal.Textures (TILE_SIZE, tileAtlas)
 * ============================================================================
 */

if (typeof window !== "undefined") window._MapInternal = window._MapInternal || {};
if (typeof globalThis !== "undefined") globalThis._MapInternal = globalThis._MapInternal || {};

(() => {
	"use strict";

	//#region [SEC-01] Viewport Defaults & Sprite Atlas Caching
	const VIEW_WIDTH = 480;
	const VIEW_HEIGHT = 320;

	/** @type {Map<string, HTMLImageElement | any>} */
	const spriteAtlas = new Map();

	/**
	 * Retrieves or bakes a zero-allocation cached sprite image.
	 * State-mutating cache procedure.
	 *
	 * @param {string} phenotype - Character class identifier.
	 * @param {string} facing - Facing direction ('UP' | 'DOWN' | 'LEFT' | 'RIGHT').
	 * @param {number} frame - Animation frame index.
	 * @param {string} [weapon] - Equipped weapon identifier.
	 * @param {string} [armor] - Equipped armor identifier.
	 * @returns {HTMLImageElement | any | null} Cached or newly requested sprite image element.
	 */
	function getCachedSprite(phenotype, facing, frame, weapon, armor) {
		const key = `${phenotype}_${facing}_${frame}_${weapon || "NONE"}_${armor || "NONE"}`;
		if (spriteAtlas.has(key)) {
			return spriteAtlas.get(key);
		}

		const spriteUrl =
			typeof EmberlightSpriteBaker !== "undefined" &&
				typeof EmberlightSpriteBaker.get === "function"
				? EmberlightSpriteBaker.get(phenotype, { facing, frame, weapon, armor })
				: null;

		if (!spriteUrl || typeof Image === "undefined") return null;

		const img = new Image();
		img.src = spriteUrl;
		spriteAtlas.set(key, img);
		return img;
	}
	//#endregion

	//#region [SEC-05] Viewport Math & Special Feature Rendering
	/**
	 * Updates camera position and damping towards player anchor point.
	 *
	 * @param {{ x: number, y: number, targetX: number, targetY: number, damping: number }} camera
	 * @param {{ x: number, y: number }} playerPos
	 * @param {string[][]} map
	 * @param {number} w - Effective viewport width
	 * @param {number} h - Effective viewport height
	 * @param {number} [tileSize=32]
	 */
	function updateCameraPosition(camera, playerPos, map, w, h, tileSize = 32) {
		const mapCols = map && map[0] ? map[0].length : 48;
		const mapRows = map ? map.length : 32;
		const worldPixelWidth = mapCols * tileSize;
		const worldPixelHeight = mapRows * tileSize;

		const halfViewW = w / 2;
		const halfViewH = h / 2;

		if (worldPixelWidth <= w) {
			camera.targetX = worldPixelWidth / 2;
			camera.x = worldPixelWidth / 2;
		} else {
			camera.targetX = playerPos.x * tileSize + tileSize / 2;
			camera.x += (camera.targetX - camera.x) * camera.damping;
			camera.x = Math.max(
				halfViewW,
				Math.min(worldPixelWidth - halfViewW, camera.x),
			);
		}

		if (worldPixelHeight <= h) {
			camera.targetY = worldPixelHeight / 2;
			camera.y = worldPixelHeight / 2;
		} else {
			camera.targetY = playerPos.y * tileSize + tileSize / 2;
			camera.y += (camera.targetY - camera.y) * camera.damping;
			camera.y = Math.max(
				halfViewH,
				Math.min(worldPixelHeight - halfViewH, camera.y),
			);
		}
	}

	function drawInteractiveSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime = 0) {
		if (tile === "C") {
			renderCtx.fillStyle = "#f59e0b";
			renderCtx.beginPath();
			renderCtx.arc(
				screenX + 16,
				screenY + 16,
				7 + Math.sin(globalTime * 8) * 2,
				0,
				Math.PI * 2,
			);
			renderCtx.fill();
			return true;
		}
		if (tile === "$") {
			renderCtx.fillStyle = "#d97706";
			renderCtx.fillRect(screenX + 8, screenY + 10, 16, 12);
			renderCtx.strokeStyle = "#fbbf24";
			renderCtx.strokeRect(screenX + 8, screenY + 10, 16, 12);
			return true;
		}
		if (tile === "A") {
			const pulse = Math.sin(globalTime * 5) * 2.5;
			renderCtx.fillStyle = "rgba(56, 189, 248, 0.3)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 13 + pulse, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#0f172a";
			renderCtx.fillRect(screenX + 8, screenY + 6, 16, 20);
			renderCtx.strokeStyle = "#38bdf8";
			renderCtx.lineWidth = 1.5;
			renderCtx.strokeRect(screenX + 8, screenY + 6, 16, 20);
			renderCtx.fillStyle = "#7dd3fc";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 14, 4, 0, Math.PI * 2);
			renderCtx.fill();
			return true;
		}
		if (tile === "*") {
			const sparkle = Math.sin(globalTime * 7) * 2;
			renderCtx.fillStyle = "rgba(52, 211, 153, 0.25)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 10 + sparkle, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#34d399";
			renderCtx.beginPath();
			renderCtx.moveTo(screenX + 16, screenY + 8);
			renderCtx.lineTo(screenX + 23, screenY + 16);
			renderCtx.lineTo(screenX + 16, screenY + 24);
			renderCtx.lineTo(screenX + 9, screenY + 16);
			renderCtx.closePath();
			renderCtx.fill();
			renderCtx.strokeStyle = "#a7f3d0";
			renderCtx.stroke();
			return true;
		}
		if (tile === "B") {
			renderCtx.fillStyle = "rgba(239, 68, 68, 0.25)";
			renderCtx.beginPath();
			renderCtx.arc(
				screenX + 16,
				screenY + 16,
				12 + Math.sin(globalTime * 5) * 2,
				0,
				Math.PI * 2,
			);
			renderCtx.fill();
			renderCtx.fillStyle = "#451a03";
			renderCtx.fillRect(screenX + 6, screenY + 10, 20, 16);
			renderCtx.fillStyle = "#ef4444";
			renderCtx.fillRect(screenX + 12, screenY + 14, 8, 8);
			renderCtx.fillStyle = "#fbbf24";
			renderCtx.fillRect(screenX + 14, screenY + 16, 4, 4);
			return true;
		}
		if (tile === "F") {
			const runePulse = Math.sin(globalTime * 6) * 2;
			renderCtx.fillStyle = "rgba(168, 85, 247, 0.3)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 11 + runePulse, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#312e81";
			renderCtx.fillRect(screenX + 8, screenY + 8, 16, 16);
			renderCtx.strokeStyle = "#a855f7";
			renderCtx.lineWidth = 1.5;
			renderCtx.strokeRect(screenX + 8, screenY + 8, 16, 16);
			return true;
		}
		return false;
	}

	function drawTownSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime = 0) {
		if (tile === "H") {
			renderCtx.fillStyle = "rgba(245, 158, 11, 0.25)";
			renderCtx.beginPath();
			renderCtx.arc(
				screenX + 16,
				screenY + 16,
				12 + Math.sin(globalTime * 4) * 2,
				0,
				Math.PI * 2,
			);
			renderCtx.fill();
			renderCtx.fillStyle = "#78350f";
			renderCtx.fillRect(screenX + 6, screenY + 11, 20, 15);
			renderCtx.fillStyle = "#fbbf24";
			renderCtx.fillRect(screenX + 13, screenY + 15, 6, 8);
			renderCtx.fillStyle = "#b45309";
			renderCtx.beginPath();
			renderCtx.moveTo(screenX + 4, screenY + 11);
			renderCtx.lineTo(screenX + 16, screenY + 3);
			renderCtx.lineTo(screenX + 28, screenY + 11);
			renderCtx.closePath();
			renderCtx.fill();
			return true;
		}
		if (tile === "N") {
			renderCtx.fillStyle = "#78350f";
			renderCtx.fillRect(screenX + 14, screenY + 18, 4, 12);
			renderCtx.fillStyle = "#92400e";
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 14);
			renderCtx.fillStyle = "#fef3c7";
			renderCtx.fillRect(screenX + 8, screenY + 8, 6, 9);
			renderCtx.fillRect(screenX + 17, screenY + 8, 6, 9);
			return true;
		}
		if (tile === "E") {
			renderCtx.fillStyle = "rgba(234, 179, 8, 0.2)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 11, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#0369a1";
			renderCtx.fillRect(screenX + 10, screenY + 12, 12, 14);
			renderCtx.fillStyle = "#fef08a";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 9, 4, 0, Math.PI * 2);
			renderCtx.fill();
			return true;
		}
		if (tile === "D") {
			renderCtx.fillStyle = "#334155";
			renderCtx.fillRect(screenX + 4, screenY + 4, 8, 24);
			renderCtx.fillRect(screenX + 20, screenY + 4, 8, 24);
			renderCtx.fillStyle = "#64748b";
			renderCtx.fillRect(screenX + 4, screenY + 4, 24, 6);
			return true;
		}
		if (tile === "V") {
			renderCtx.fillStyle = "rgba(168, 85, 247, 0.2)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 10, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#6b21a8";
			renderCtx.fillRect(screenX + 10, screenY + 13, 12, 13);
			renderCtx.fillStyle = "#c084fc";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 10, 4.5, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#fed7aa";
			renderCtx.fillRect(screenX + 14, screenY + 10, 4, 3);
			return true;
		}
		if (tile === "G") {
			renderCtx.fillStyle = "rgba(59, 130, 246, 0.25)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 11, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#1e3a8a";
			renderCtx.fillRect(screenX + 10, screenY + 12, 12, 14);
			renderCtx.fillStyle = "#94a3b8";
			renderCtx.fillRect(screenX + 11, screenY + 6, 10, 8);
			renderCtx.fillStyle = "#f59e0b";
			renderCtx.fillRect(screenX + 13, screenY + 9, 6, 2);
			renderCtx.fillStyle = "#cbd5e1";
			renderCtx.fillRect(screenX + 6, screenY + 12, 4, 12);
			renderCtx.strokeStyle = "#3b82f6";
			renderCtx.lineWidth = 1;
			renderCtx.strokeRect(screenX + 6, screenY + 12, 4, 12);
			return true;
		}
		if (tile === "@") {
			renderCtx.fillStyle = "rgba(217, 119, 6, 0.2)";
			renderCtx.beginPath();
			renderCtx.arc(screenX + 16, screenY + 16, 12, 0, Math.PI * 2);
			renderCtx.fill();
			renderCtx.fillStyle = "#b45309";
			renderCtx.fillRect(screenX + 7, screenY + 12, 18, 12);
			renderCtx.fillStyle = "#f59e0b";
			renderCtx.fillRect(screenX + 11, screenY + 7, 10, 8);
			renderCtx.strokeStyle = "#78350f";
			renderCtx.lineWidth = 1;
			renderCtx.strokeRect(screenX + 11, screenY + 7, 10, 8);
			renderCtx.fillStyle = "#b45309";
			renderCtx.fillRect(screenX + 22, screenY + 6, 5, 10);
			renderCtx.fillRect(screenX + 24, screenY + 4, 6, 5);
			return true;
		}
		return false;
	}

	function drawDungeonSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime = 0) {
		if (tile === "S") {
			renderCtx.fillStyle = "rgba(168, 85, 247, 0.3)";
			renderCtx.beginPath();
			renderCtx.arc(
				screenX + 16,
				screenY + 16,
				13 + Math.sin(globalTime * 6) * 2,
				0,
				Math.PI * 2,
			);
			renderCtx.fill();
			renderCtx.fillStyle = "#1e1b4b";
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.strokeStyle = "#c084fc";
			renderCtx.lineWidth = 1.5;
			renderCtx.strokeRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.fillStyle = "#581c87";
			renderCtx.fillRect(screenX + 10, screenY + 10, 12, 12);
		} else if (tile === "P") {
			renderCtx.fillStyle = "#0f172a";
			renderCtx.fillRect(screenX + 2, screenY + 2, 28, 28);
			renderCtx.fillStyle = "#94a3b8";
			for (let gx = screenX + 5; gx <= screenX + 25; gx += 4) {
				renderCtx.fillRect(gx, screenY + 4, 2, 24);
			}
			renderCtx.fillRect(screenX + 3, screenY + 12, 26, 2.5);
			renderCtx.fillRect(screenX + 3, screenY + 20, 26, 2.5);
		} else if (tile === "/") {
			renderCtx.fillStyle = "#0f172a";
			renderCtx.fillRect(screenX + 2, screenY + 2, 28, 6);
			renderCtx.fillStyle = "#64748b";
			renderCtx.fillRect(screenX + 4, screenY + 2, 24, 4);
		} else if (tile === "_") {
			renderCtx.fillStyle = "#334155";
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.fillStyle = "#38bdf8";
			renderCtx.fillRect(screenX + 11, screenY + 11, 10, 10);
		} else if (tile === ">") {
			renderCtx.fillStyle = "#1e1b4b";
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.strokeStyle = "#a855f7";
			renderCtx.strokeRect(screenX + 6, screenY + 6, 20, 20);
		} else if (tile === "<") {
			renderCtx.fillStyle = "#0f172a";
			renderCtx.fillRect(screenX + 6, screenY + 6, 20, 20);
			renderCtx.strokeStyle = "#38bdf8";
			renderCtx.strokeRect(screenX + 6, screenY + 6, 20, 20);
		}
	}

	function drawTileSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime = 0) {
		if (drawInteractiveSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime))
			return;
		if (drawTownSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime)) return;
		drawDungeonSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime);
	}

	function resolveTileTextureKey(tile, waterFrame, grassFrame, isTown = false) {
		switch (tile) {
			case ".":
				return isTown ? "TOWN_PATH" : "PATH";
			case "#":
				return isTown ? "TOWN_WALL" : "WALL";
			case "O":
				return "TOWN_GATE";
			case "D":
				return isTown ? "TOWN_GATE" : "PATH";
			case "~":
				return `WATER_${waterFrame}`;
			case '"':
				return `GRASS_${grassFrame}`;
			case "=":
				return "ICE";
			case "%":
				return "MIASMA";
			default:
				return isTown ? "TOWN_PATH" : "PATH";
		}
	}

	function drawTile(
		renderCtx,
		tile,
		screenX,
		screenY,
		waterFrame,
		grassFrame,
		isTown = false,
		globalTime = 0,
		tileAtlas = null,
		tileSize = 32,
	) {
		const key = resolveTileTextureKey(tile, waterFrame, grassFrame, isTown);
		const tileImg = tileAtlas ? tileAtlas.get(key) : null;

		if (tileImg) {
			renderCtx.drawImage(tileImg, screenX, screenY, tileSize, tileSize);
		} else {
			renderCtx.fillStyle = "#0c0c16";
			renderCtx.fillRect(screenX, screenY, tileSize, tileSize);
		}

		drawTileSpecialFeatures(renderCtx, tile, screenX, screenY, globalTime);
	}

	/**
	 * Renders terrain layer tiles within viewport bounds.
	 * State-mutating canvas render procedure.
	 *
	 * @param {CanvasRenderingContext2D | any} renderCtx - Target 2D canvas context.
	 * @param {string[][]} map - Terrain grid matrix.
	 * @param {Set<string>} visibleTiles - Line of sight coordinate set.
	 * @param {{ offsetX: number, offsetY: number, w: number, h: number, time: number, isTown?: boolean }} viewport
	 * @param {Map<string, HTMLCanvasElement> | any} [tileAtlas=null]
	 * @param {number} [tileSize=32]
	 * @returns {void}
	 */
	function renderTerrainLayer(renderCtx, map, visibleTiles, viewport, tileAtlas = null, tileSize = 32) {
		if (!map || !renderCtx) return;
		const { offsetX, offsetY, w, h, time, isTown } = viewport;
		const waterFrame = Math.floor(time * 6) % 4;
		const grassFrame = Math.floor(time * 3) % 2;

		for (let y = 0; y < map.length; y++) {
			for (let x = 0; x < map[y].length; x++) {
				const screenX = offsetX + x * tileSize;
				const screenY = offsetY + y * tileSize;

				if (
					screenX < -tileSize ||
					screenX > w ||
					screenY < -tileSize ||
					screenY > h
				) {
					continue;
				}

				const isVisible = visibleTiles ? visibleTiles.has(`${x},${y}`) : true;
				const tile = map[y][x];
				drawTile(
					renderCtx,
					tile,
					screenX,
					screenY,
					waterFrame,
					grassFrame,
					Boolean(isTown),
					time,
					tileAtlas,
					tileSize,
				);

				if (!isVisible) {
					renderCtx.fillStyle = "rgba(2, 2, 8, 0.82)";
					renderCtx.fillRect(screenX, screenY, tileSize, tileSize);
				}
			}
		}
	}

	function renderQuestTargetLine(renderCtx, snapshot, offsetX, offsetY, w, h, tileSize = 32) {
		if (!snapshot || !snapshot.activeQuestTarget || !renderCtx) return;
		const qTarget = snapshot.activeQuestTarget;
		const qScreenX = offsetX + qTarget.x * tileSize + 16;
		const qScreenY = offsetY + qTarget.y * tileSize + 16;
		renderCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
		renderCtx.lineWidth = 1.5;
		if (typeof renderCtx.setLineDash === "function") {
			renderCtx.setLineDash([4, 4]);
		}
		renderCtx.beginPath();
		renderCtx.moveTo(w / 2, h / 2);
		renderCtx.lineTo(qScreenX, qScreenY);
		renderCtx.stroke();
		if (typeof renderCtx.setLineDash === "function") {
			renderCtx.setLineDash([]);
		}
	}

	function renderEntitiesLayer(
		renderCtx,
		snapshot,
		visibleTiles,
		offsetX,
		offsetY,
		tileSize = 32,
		spriteGetter = null,
	) {
		if (!renderCtx || !snapshot) return { pScreenX: 0, pScreenY: 0 };
		const playerPos = snapshot.playerPos || snapshot.pos || { x: 1, y: 1 };
		const facing = snapshot.facing || "DOWN";
		const avatar = snapshot.avatar || {
			phenotype: "HERO",
			weapon: "IRON_SWORD",
			armor: null,
		};
		const entities = snapshot.entities || snapshot.monsters || [];

		const drawList = [];
		const pScreenX = Math.floor(offsetX + playerPos.x * tileSize + 2);
		const pScreenY = Math.floor(offsetY + playerPos.y * tileSize - 2);

		drawList.push({
			y: pScreenY + 28,
			render: () => {
				renderCtx.fillStyle = "rgba(0, 0, 0, 0.6)";
				renderCtx.beginPath();
				renderCtx.ellipse(
					pScreenX + 14,
					pScreenY + 28,
					9,
					4,
					0,
					0,
					Math.PI * 2,
				);
				renderCtx.fill();

				const heroImg = typeof spriteGetter === "function"
					? spriteGetter(
						avatar.phenotype || "HERO",
						facing,
						snapshot.stepAnimFrame || 0,
						avatar.weapon,
						avatar.armor,
					)
					: getCachedSprite(
						avatar.phenotype || "HERO",
						facing,
						snapshot.stepAnimFrame || 0,
						avatar.weapon,
						avatar.armor,
					);
				if (heroImg?.complete) {
					renderCtx.drawImage(heroImg, pScreenX, pScreenY, 28, 28);
				} else {
					renderCtx.fillStyle = "#ff9d4d";
					renderCtx.fillRect(pScreenX + 6, pScreenY + 6, 16, 16);
				}
			},
		});

		entities.forEach((ent) => {
			if (visibleTiles && !visibleTiles.has(`${ent.x},${ent.y}`)) return;
			const eScreenX = Math.floor(offsetX + ent.x * tileSize + 2);
			const eScreenY = Math.floor(offsetY + ent.y * tileSize - 2);
			drawList.push({
				y: eScreenY + 28,
				render: () => {
					renderCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
					renderCtx.beginPath();
					renderCtx.ellipse(
						eScreenX + 14,
						eScreenY + 28,
						8,
						3.5,
						0,
						0,
						Math.PI * 2,
					);
					renderCtx.fill();

					renderCtx.fillStyle = ent.color || "#ef4444";
					renderCtx.fillRect(eScreenX + 6, eScreenY + 6, 16, 16);
				},
			});
		});

		drawList.sort((a, b) => a.y - b.y);
		for (const item of drawList) {
			item.render();
		}

		return { pScreenX, pScreenY };
	}

	function renderVignetteOverlay(renderCtx, w, h) {
		if (!renderCtx || typeof renderCtx.createRadialGradient !== "function") return;
		const vignette = renderCtx.createRadialGradient(
			w / 2,
			h / 2,
			Math.min(w, h) * 0.35,
			w / 2,
			h / 2,
			Math.max(w, h) * 0.75,
		);
		vignette.addColorStop(0, "rgba(4, 4, 12, 0)");
		vignette.addColorStop(0.7, "rgba(4, 4, 12, 0.35)");
		vignette.addColorStop(1, "rgba(2, 2, 8, 0.88)");
		renderCtx.fillStyle = vignette;
		renderCtx.fillRect(0, 0, w, h);
	}
	//#endregion

	// ─── Staging Membrane Export ──────────────────────────────────────────────
	const Compositor = Object.freeze({
		VIEW_WIDTH,
		VIEW_HEIGHT,
		spriteAtlas,
		getCachedSprite,
		updateCameraPosition,
		drawInteractiveSpecialFeatures,
		drawTownSpecialFeatures,
		drawDungeonSpecialFeatures,
		drawTileSpecialFeatures,
		resolveTileTextureKey,
		drawTile,
		renderTerrainLayer,
		renderQuestTargetLine,
		renderEntitiesLayer,
		renderVignetteOverlay,
	});

	if (typeof window !== "undefined") {
		window._MapInternal.Compositor = Compositor;
	}
	if (typeof globalThis !== "undefined") {
		globalThis._MapInternal.Compositor = Compositor;
	}
	if (typeof module !== "undefined" && module.exports) {
		module.exports = Compositor;
	}
})();
