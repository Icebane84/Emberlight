/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MAP PROCEDURAL TEXTURES SUB-MODULE
 * Document Identifier: VSRP-001-MAP-TEXTURES
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-MAP-RENDERER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] Type Definitions, Atlas Caching & Canvas Initializers (Lines 111, 194–211)
 *   [SEC-02] Procedural Terrain Texture Baking (Lines 214–583)
 *
 * STAGING MEMBRANE KEY: window._MapInternal.Textures
 * DEPENDENCIES: None (Root of map presentation pipeline)
 * ============================================================================
 */

if (typeof window !== "undefined") window._MapInternal = window._MapInternal || {};
if (typeof globalThis !== "undefined") globalThis._MapInternal = globalThis._MapInternal || {};

(() => {
	"use strict";

	//#region [SEC-01] Atlas Caching & Canvas Initializers
	const TILE_SIZE = 32;

	/** @type {Map<string, HTMLCanvasElement | any>} */
	const tileAtlas = new Map();

	/**
	 * Creates an offscreen canvas element for procedural texture baking.
	 * Pure DOM utility procedure.
	 *
	 * @param {number} [w=32] - Canvas width in pixels.
	 * @param {number} [h=32] - Canvas height in pixels.
	 * @returns {HTMLCanvasElement | any | null} Offscreen canvas element or null in headless mode.
	 */
	function createOffscreenCanvas(w = TILE_SIZE, h = TILE_SIZE) {
		if (typeof document === "undefined") return null;
		const c = document.createElement("canvas");
		c.width = w;
		c.height = h;
		return c;
	}
	//#endregion

	//#region [SEC-02] Procedural Terrain Texture Baking
	function drawStoneBlock(renderCtx, s) {
		renderCtx.fillStyle = s.col;
		renderCtx.fillRect(s.x, s.y, s.w, s.h);
		renderCtx.fillStyle = s.hi;
		renderCtx.fillRect(s.x, s.y, s.w, 1);
		renderCtx.fillRect(s.x, s.y, 1, s.h);
		renderCtx.fillStyle = s.sh;
		renderCtx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
		renderCtx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
	}

	function bakeCobblestonePath() {
		const cobbleCanvas = createOffscreenCanvas();
		if (!cobbleCanvas) return;
		const renderCtx = cobbleCanvas.getContext("2d");
		if (!renderCtx) return;
		renderCtx.fillStyle = "#0a0a14";
		renderCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		const stones = [
			{ x: 1, y: 1, w: 14, h: 9, col: "#1a1a2e", hi: "#2d2d4f", sh: "#0f0f1c" },
			{
				x: 16,
				y: 1,
				w: 15,
				h: 11,
				col: "#202038",
				hi: "#36365c",
				sh: "#121221",
			},
			{
				x: 2,
				y: 11,
				w: 13,
				h: 10,
				col: "#161626",
				hi: "#282845",
				sh: "#0d0d17",
			},
			{
				x: 16,
				y: 13,
				w: 14,
				h: 9,
				col: "#1d1d33",
				hi: "#303054",
				sh: "#10101d",
			},
			{
				x: 1,
				y: 22,
				w: 14,
				h: 9,
				col: "#22223b",
				hi: "#38385e",
				sh: "#131322",
			},
			{
				x: 16,
				y: 23,
				w: 15,
				h: 8,
				col: "#181829",
				hi: "#2a2a47",
				sh: "#0e0e19",
			},
		];
		stones.forEach((s) => {
			drawStoneBlock(renderCtx, s);
		});
		tileAtlas.set("PATH", cobbleCanvas);
	}

	function bakeBedrockWall() {
		const wallCanvas = createOffscreenCanvas();
		if (!wallCanvas) return;
		const wallCtx = wallCanvas.getContext("2d");
		if (!wallCtx) return;
		wallCtx.fillStyle = "#0e0e1a";
		wallCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		wallCtx.fillStyle = "#06060c";
		wallCtx.fillRect(0, 26, TILE_SIZE, 6);
		wallCtx.strokeStyle = "#22223b";
		wallCtx.lineWidth = 1.5;
		wallCtx.beginPath();
		wallCtx.moveTo(0, 7);
		wallCtx.lineTo(12, 11);
		wallCtx.lineTo(24, 5);
		wallCtx.lineTo(32, 9);
		wallCtx.moveTo(0, 17);
		wallCtx.lineTo(16, 21);
		wallCtx.lineTo(28, 15);
		wallCtx.lineTo(32, 18);
		wallCtx.stroke();
		wallCtx.fillStyle = "#3a3a5c";
		wallCtx.fillRect(6, 4, 2, 2);
		wallCtx.fillRect(22, 12, 3, 2);
		wallCtx.fillRect(14, 23, 2, 2);
		tileAtlas.set("WALL", wallCanvas);
	}

	function drawWaterWave(renderCtx, shift, baseY, waveFn) {
		renderCtx.beginPath();
		for (let x = 0; x < TILE_SIZE; x++) {
			const y = baseY + waveFn(x, shift);
			if (x === 0) {
				renderCtx.moveTo(x, y);
			} else {
				renderCtx.lineTo(x, y);
			}
		}
		renderCtx.stroke();
	}

	function bakeSingleWaterFrame(f) {
		const waterCanvas = createOffscreenCanvas();
		if (!waterCanvas) return;
		const waterCtx = waterCanvas.getContext("2d");
		if (!waterCtx) return;

		waterCtx.fillStyle = "#020611";
		waterCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		const shift = (f / 4) * Math.PI * 2;

		waterCtx.strokeStyle = "rgba(56, 189, 248, 0.55)";
		waterCtx.lineWidth = 1.5;
		drawWaterWave(waterCtx, shift, 8, (x, s) => Math.sin(x / 6 + s) * 2.5);

		waterCtx.strokeStyle = "rgba(14, 165, 233, 0.35)";
		drawWaterWave(waterCtx, shift, 20, (x, s) => Math.cos(x / 5 + s) * 2.5);

		tileAtlas.set(`WATER_${f}`, waterCanvas);
	}

	function bakeWaterFrames() {
		if (typeof document === "undefined") return;
		for (let f = 0; f < 4; f++) {
			bakeSingleWaterFrame(f);
		}
	}

	function bakeGrassFrames() {
		for (let f = 0; f < 2; f++) {
			const grassCanvas = createOffscreenCanvas();
			if (!grassCanvas) continue;
			const grassCtx = grassCanvas.getContext("2d");
			if (!grassCtx) continue;
			grassCtx.fillStyle = "#061008";
			grassCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
			const sway = f === 0 ? 0 : 2.5;
			grassCtx.strokeStyle = "#22c55e";
			grassCtx.lineWidth = 1.5;
			const tufts = [
				{ x: 6, y: 24, h: 12 },
				{ x: 13, y: 28, h: 14 },
				{ x: 21, y: 22, h: 13 },
				{ x: 27, y: 26, h: 10 },
			];
			tufts.forEach((t) => {
				grassCtx.beginPath();
				grassCtx.moveTo(t.x, t.y);
				grassCtx.quadraticCurveTo(
					t.x + sway,
					t.y - t.h * 0.5,
					t.x + sway * 1.5,
					t.y - t.h,
				);
				grassCtx.stroke();
			});
			tileAtlas.set(`GRASS_${f}`, grassCanvas);
		}
	}

	function bakeIceAndMiasma() {
		const iceCanvas = createOffscreenCanvas();
		if (iceCanvas) {
			const iceCtx = iceCanvas.getContext("2d");
			if (iceCtx) {
				iceCtx.fillStyle = "#091524";
				iceCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
				iceCtx.strokeStyle = "rgba(186, 230, 253, 0.5)";
				iceCtx.lineWidth = 1.2;
				iceCtx.beginPath();
				iceCtx.moveTo(4, 8);
				iceCtx.lineTo(16, 16);
				iceCtx.lineTo(28, 12);
				iceCtx.moveTo(8, 24);
				iceCtx.lineTo(20, 20);
				iceCtx.lineTo(26, 28);
				iceCtx.stroke();
				tileAtlas.set("ICE", iceCanvas);
			}
		}

		const miasmaCanvas = createOffscreenCanvas();
		if (miasmaCanvas) {
			const miasmaCtx = miasmaCanvas.getContext("2d");
			if (miasmaCtx) {
				miasmaCtx.fillStyle = "#12071a";
				miasmaCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
				miasmaCtx.fillStyle = "rgba(192, 132, 252, 0.3)";
				miasmaCtx.beginPath();
				miasmaCtx.arc(16, 16, 13, 0, Math.PI * 2);
				miasmaCtx.fill();
				tileAtlas.set("MIASMA", miasmaCanvas);
			}
		}
	}

	function bakeTownWall() {
		const wallCanvas = createOffscreenCanvas();
		if (!wallCanvas) return;
		const wallCtx = wallCanvas.getContext("2d");
		if (!wallCtx) return;

		// Deep dark foundation
		wallCtx.fillStyle = "#140c06";
		wallCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

		// Warm horizontal wooden planks
		for (let y = 4; y < 28; y += 4) {
			wallCtx.fillStyle = y % 8 === 0 ? "#965a2a" : "#aa6a35";
			wallCtx.fillRect(2, y, 28, 3.5);
			// Wood grain highlights
			wallCtx.fillStyle = "#b87640";
			wallCtx.fillRect(4, y + 1, 10, 1);
			wallCtx.fillRect(18, y + 1, 8, 1);
		}

		// Dark oak timber framing studs
		wallCtx.fillStyle = "#4a250c";
		wallCtx.fillRect(2, 2, 4, 28); // Left heavy post
		wallCtx.fillRect(26, 2, 4, 28); // Right heavy post
		wallCtx.fillRect(14, 2, 4, 28); // Center beam
		wallCtx.fillRect(2, 2, 28, 3); // Top horizontal beam
		wallCtx.fillRect(2, 27, 28, 3); // Bottom sill

		// Diagonal timber brace
		wallCtx.fillStyle = "#3d1e0a";
		wallCtx.beginPath();
		wallCtx.moveTo(6, 6);
		wallCtx.lineTo(14, 14);
		wallCtx.lineTo(14, 17);
		wallCtx.lineTo(6, 9);
		wallCtx.closePath();
		wallCtx.fill();

		// Iron rivet studs
		wallCtx.fillStyle = "#1e1e1e";
		wallCtx.fillRect(4, 4, 2, 2);
		wallCtx.fillRect(26, 4, 2, 2);
		wallCtx.fillRect(4, 26, 2, 2);
		wallCtx.fillRect(26, 26, 2, 2);
		wallCtx.fillRect(15, 15, 2, 2);

		// Terracotta/timber eave cap
		wallCtx.fillStyle = "#78350f";
		wallCtx.fillRect(0, 0, TILE_SIZE, 3);

		tileAtlas.set("TOWN_WALL", wallCanvas);
	}

	function bakeTownPath() {
		const cobbleCanvas = createOffscreenCanvas();
		if (!cobbleCanvas) return;
		const renderCtx = cobbleCanvas.getContext("2d");
		if (!renderCtx) return;
		renderCtx.fillStyle = "#141320";
		renderCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		const stones = [
			{ x: 1, y: 1, w: 14, h: 9, col: "#2c293e", hi: "#423d5d", sh: "#181624" },
			{
				x: 16,
				y: 1,
				w: 15,
				h: 11,
				col: "#333048",
				hi: "#4b476b",
				sh: "#1d1b2b",
			},
			{
				x: 2,
				y: 11,
				w: 13,
				h: 10,
				col: "#28253a",
				hi: "#3e3a58",
				sh: "#161422",
			},
			{
				x: 16,
				y: 13,
				w: 14,
				h: 9,
				col: "#302d44",
				hi: "#484366",
				sh: "#1b1928",
			},
			{
				x: 1,
				y: 22,
				w: 14,
				h: 9,
				col: "#35324c",
				hi: "#4f4b71",
				sh: "#1f1d2e",
			},
			{
				x: 16,
				y: 23,
				w: 15,
				h: 8,
				col: "#2a273c",
				hi: "#403c5b",
				sh: "#171523",
			},
		];
		stones.forEach((s) => {
			drawStoneBlock(renderCtx, s);
		});
		tileAtlas.set("TOWN_PATH", cobbleCanvas);
	}

	function bakeTownGate() {
		const gateCanvas = createOffscreenCanvas();
		if (!gateCanvas) return;
		const ctx = gateCanvas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "#0a0a14";
		ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
		// Stone pillars
		ctx.fillStyle = "#334155";
		ctx.fillRect(1, 2, 7, 28);
		ctx.fillRect(24, 2, 7, 28);
		ctx.fillStyle = "#64748b";
		ctx.fillRect(0, 0, TILE_SIZE, 6);
		// Archway opening
		ctx.fillStyle = "#181410";
		ctx.fillRect(8, 6, 16, 26);
		// Iron portcullis teeth
		ctx.fillStyle = "#94a3b8";
		for (let x = 9; x <= 22; x += 3) {
			ctx.fillRect(x, 6, 1.5, 18);
		}
		ctx.fillRect(8, 12, 16, 1.5);
		// Golden warning torches
		ctx.fillStyle = "#f59e0b";
		ctx.fillRect(3, 10, 3, 5);
		ctx.fillRect(26, 10, 3, 5);
		tileAtlas.set("TOWN_GATE", gateCanvas);
	}

	/**
	 * Pre-renders procedural textures for all terrain tiles.
	 * State-mutating texture atlas baking procedure.
	 *
	 * @returns {void}
	 */
	function bakeTerrainTextures() {
		if (typeof document === "undefined") return;
		bakeCobblestonePath();
		bakeBedrockWall();
		bakeTownWall();
		bakeTownPath();
		bakeTownGate();
		bakeWaterFrames();
		bakeGrassFrames();
		bakeIceAndMiasma();
	}
	//#endregion

	// ─── Staging Membrane Export ──────────────────────────────────────────────
	const Textures = Object.freeze({
		TILE_SIZE,
		tileAtlas,
		createOffscreenCanvas,
		drawStoneBlock,
		bakeCobblestonePath,
		bakeBedrockWall,
		drawWaterWave,
		bakeSingleWaterFrame,
		bakeWaterFrames,
		bakeGrassFrames,
		bakeIceAndMiasma,
		bakeTownWall,
		bakeTownPath,
		bakeTownGate,
		bakeTerrainTextures,
	});

	if (typeof window !== "undefined") {
		window._MapInternal.Textures = Textures;
	}
	if (typeof globalThis !== "undefined") {
		globalThis._MapInternal.Textures = Textures;
	}
	if (typeof module !== "undefined" && module.exports) {
		module.exports = Textures;
	}
})();
