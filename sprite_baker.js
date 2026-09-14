/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROCEDURAL OVERWORLD SPRITE BAKER & PAPER-DOLL V4
 * Document Identifier: VSRP-001-SPRITE-BAKER-V4-ARTISTIC-UPGRADE
 * Governing Protocol:  VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-SPEC-012
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Buffer Configuration & Canvas Memory Lifecycle
 *   [SEC-03] 4-Tier HSL/PBR Palette Matrix
 *   [SEC-04] Geometric Vector Drawing Primitives
 *   [SEC-05] Layer 1: Base Silhouette & Anatomy Compositor
 *   [SEC-06] Layer 2: Armor & Robe Equipment Overlays
 *   [SEC-07] Layer 3: Helmet & Headgear Overlays
 *   [SEC-08] Layer 4: Weapon & Off-Hand Overlays
 *   [SEC-09] Hostile Entity Synthesizer (Enemy Generation)
 *   [SEC-10] Town NPC Synthesizer (Civilian & Guard Generation)
 *   [SEC-11] Canonical VSRP-001 Lifecycle & Synthesis Gateway
 *   [SEC-12] Module Export & Global Scope Bindings
 * ============================================================================
 */

// @ts-expect-error
const EmberlightSpriteBaker = (() => {
	//#region [SEC-01] Type Definitions & Contract Schemas
	/**
	 * @typedef {Object} Point2D
	 * @property {number} x - Horizontal coordinate in 32-space.
	 * @property {number} y - Vertical coordinate in 32-space.
	 */

	/**
	 * @typedef {Object} SpriteBakeOptions
	 * @property {'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | string} [facing='DOWN'] - Facing orientation direction.
	 * @property {number} [frame=0] - Animation gait frame index (0 or 1).
	 * @property {string | null} [weapon=null] - Equipped weapon asset identifier.
	 * @property {string | null} [armor=null] - Equipped armor asset identifier.
	 * @property {string} [key] - Specific entity variant or enemy/NPC archetype key.
	 */

	/**
	 * @typedef {Object} SpriteBakerContext
	 * @property {{ publish?: function(string, any): void }} [eventBus] - Host event bus reference.
	 * @property {function(string, any): void} [publish] - Direct publication routine.
	 */

	/**
	 * @typedef {Object} SpriteBakerState
	 * @property {number} cachedSpritesCount - Total number of cached rasterized sprites.
	 * @property {number} renderScale - Internal scaling multiplier factor.
	 * @property {string} targetResolution - Output sprite resolution descriptor.
	 * @property {string} workResolution - Internal canvas buffer resolution descriptor.
	 */

	/**
	 * @typedef {Object} SpriteBakerDiagnostics
	 * @property {string} driverId - Unique peripheral driver identifier.
	 * @property {string} version - Semantic version tag.
	 * @property {string} protocolVersion - Governing normative protocol standard.
	 * @property {boolean} configured - Configuration lifecycle status.
	 * @property {boolean} initialized - Initialization lifecycle status.
	 * @property {number} cachedSpriteCount - Current cached sprite entry count.
	 * @property {number} supersamplingFactor - High-definition scaling factor.
	 * @property {string} bufferResolution - Output dimension format string.
	 * @property {boolean} eventBusBound - Flag confirming host event bus attachment.
	 */

	/**
	 * @typedef {Object} SpriteBakerModuleInfo
	 * @property {string} moduleId - Subsystem module identifier.
	 * @property {string} version - Semantic version tag.
	 * @property {'VSRP-001'} protocolVersion - Protocol standard compliance token.
	 * @property {string[]} capabilities - Declared capability tokens.
	 */

	/**
	 * @typedef {Object} SpriteBakerResetSnapshot
	 * @property {boolean} [clearCache] - Whether to purge cached sprite textures.
	 */
	//#endregion

	//#region [SEC-02] Buffer Configuration & Canvas Memory Lifecycle
	// --- Dimensions & 4x Scaling Configuration ---
	const TARGET_SIZE = 32;
	const SCALE_FACTOR = 4;
	const WORK_SIZE = TARGET_SIZE * SCALE_FACTOR; // 128x128 internal high-definition canvas

	/** @type {Map<string, string>} */
	const cache = new Map();

	// Lifecycle & Configuration State
	let configured = false;
	/** @type {Readonly<Record<string, any>>} */
	let config = Object.freeze({});
	let initialized = false;
	/** @type {any} */
	let eventBusRef = null;

	/** @type {HTMLCanvasElement | null} */
	let workCanvas = null;
	/** @type {CanvasRenderingContext2D | null} */
	let workCtx = null;
	/** @type {HTMLCanvasElement | null} */
	let targetCanvas = null;
	/** @type {CanvasRenderingContext2D | null} */
	let targetCtx = null;

	/**
	 * Allocates working multi-sampled and target canvas contexts in browser environments.
	 * State-mutating buffer allocation procedure.
	 * @returns {void}
	 */
	function ensureCanvases() {
		if (workCanvas && workCtx && targetCanvas && targetCtx) return;
		if (
			typeof document === "undefined" ||
			typeof document.createElement !== "function"
		)
			return;

		workCanvas = /** @type {HTMLCanvasElement} */ (
			document.createElement("canvas")
		);
		workCanvas.width = WORK_SIZE;
		workCanvas.height = WORK_SIZE;
		workCtx = workCanvas.getContext("2d");
		if (workCtx) {
			workCtx.imageSmoothingEnabled = true;
			workCtx.imageSmoothingQuality = "high";
			workCtx.lineJoin = "round";
			workCtx.lineCap = "round";
		}

		targetCanvas = /** @type {HTMLCanvasElement} */ (
			document.createElement("canvas")
		);
		targetCanvas.width = TARGET_SIZE;
		targetCanvas.height = TARGET_SIZE;
		targetCtx = targetCanvas.getContext("2d");
		if (targetCtx) {
			targetCtx.imageSmoothingEnabled = true;
			targetCtx.imageSmoothingQuality = "high";
		}
	}

	/**
	 * Clears internal multi-sampled and output canvas buffers.
	 * State-mutating canvas operation.
	 * @returns {void}
	 */
	function clearWorkCanvas() {
		if (workCtx) workCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
		if (targetCtx) targetCtx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);
	}
	//#endregion

	//#region [SEC-03] 4-Tier HSL/PBR Palette Matrix
	// =========================================================================
	// 4-TIER HSL/PBR PALETTE MATRIX
	// =========================================================================
	const P = Object.freeze({
		// Neutral & Dark Foundations
		void: "#06070a",
		shadowAO: "rgba(0, 0, 0, 0.52)",
		ironDark: "#111827",
		ironMid: "#1f2937",
		ironLight: "#374151",

		// Metallic Steel (4 Tiers)
		steelDark: "#334155",
		steelMid: "#64748b",
		steelLight: "#cbd5e1",
		steelSpec: "#ffffff",

		// Organic Skin Tones (4 Tiers)
		skinDeep: "#92400e",
		skinShadow: "#d97706",
		skinMid: "#fbd38d",
		skinLight: "#fef3c7",

		// Royal Gold & Brass (4 Tiers)
		goldDark: "#78350f",
		goldMid: "#ca8a04",
		goldLight: "#facc15",
		goldSpec: "#fef08a",

		// Organic Leather & Wood
		leatherDark: "#291003",
		leatherMid: "#78350f",
		leatherLight: "#b45309",
		woodDark: "#271005",
		woodMid: "#451a03",
		woodLight: "#78350f",

		// Vestment & Fabric Tones
		clothRedDark: "#450a0a",
		clothRed: "#b91c1c",
		clothRedLight: "#f87171",

		clothBlueDark: "#172554",
		clothBlue: "#1d4ed8",
		clothBlueLight: "#60a5fa",

		clothVioletDark: "#2e1065",
		clothViolet: "#6d28d9",
		clothVioletLight: "#c084fc",

		clothGreenDark: "#064e3b",
		clothGreen: "#059669",
		clothGreenLight: "#34d399",

		clothWhiteDark: "#94a3b8",
		clothWhite: "#e2e8f0",
		clothWhiteLight: "#ffffff",

		// Emissive & Arcane Cores
		emberCore: "#ff5500",
		emberGlow: "#facc15",
		arcaneCyan: "#38bdf8",
		arcaneViolet: "#e879f9",
		venomGreen: "#22c55e",
		soulRed: "#ef4444",
	});
	//#endregion

	//#region [SEC-04] Geometric Vector Drawing Primitives
	/**
	 * Scales a 32-space coordinate value to the internal 128-space work canvas.
	 * Pure mathematical coordinate transformation procedure.
	 * @param {number} val - 32-space coordinate scalar.
	 * @returns {number} 128-space coordinate scalar.
	 */
	const S = (val) => val * SCALE_FACTOR;

	/**
	 * Renders a rounded rectangle on the high-definition canvas context.
	 * State-mutating canvas drawing procedure.
	 * @param {CanvasRenderingContext2D | null} ctx - Target 2D rendering context.
	 * @param {[number, number, number, number]} bounds - [x, y, w, h] coordinates in 32-space.
	 * @param {number} r - Corner radius in 32-space.
	 * @param {string | null} [fill=null] - Fill color style.
	 * @param {string | null} [stroke=null] - Stroke color style.
	 * @param {number} [strokeW=1] - Outline stroke width in 32-space.
	 * @returns {void}
	 */
	function drawRoundedRect(
		ctx,
		bounds,
		r,
		fill = null,
		stroke = null,
		strokeW = 1,
	) {
		if (!ctx) return;
		const [x, y, w, h] = bounds;
		ctx.save();
		ctx.beginPath();
		if (typeof ctx.roundRect === "function") {
			ctx.roundRect(S(x), S(y), S(w), S(h), S(r));
		} else {
			ctx.rect(S(x), S(y), S(w), S(h));
		}
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fill();
		}
		if (stroke) {
			ctx.strokeStyle = stroke;
			ctx.lineWidth = S(strokeW);
			ctx.stroke();
		}
		ctx.restore();
	}

	/**
	 * Renders a shaded polygon on the high-definition canvas context.
	 * State-mutating canvas drawing procedure.
	 * @param {CanvasRenderingContext2D | null} ctx - Target 2D rendering context.
	 * @param {Point2D[]} points - Array of vertices in 32-space.
	 * @param {string | null} [fill=null] - Fill color style.
	 * @param {string | null} [stroke=null] - Stroke color style.
	 * @param {number} [strokeW=1] - Outline stroke width in 32-space.
	 * @returns {void}
	 */
	function drawShadedPoly(
		ctx,
		points,
		fill = null,
		stroke = null,
		strokeW = 1,
	) {
		if (!ctx || points.length < 3) return;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(S(points[0].x), S(points[0].y));
		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(S(points[i].x), S(points[i].y));
		}
		ctx.closePath();
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fill();
		}
		if (stroke) {
			ctx.strokeStyle = stroke;
			ctx.lineWidth = S(strokeW);
			ctx.stroke();
		}
		ctx.restore();
	}

	/**
	 * Renders a filled ellipse on the high-definition canvas context.
	 * State-mutating canvas drawing procedure.
	 * @param {CanvasRenderingContext2D | null} ctx - Target 2D rendering context.
	 * @param {number} cx - Center horizontal coordinate in 32-space.
	 * @param {number} cy - Center vertical coordinate in 32-space.
	 * @param {number} rx - Horizontal radius in 32-space.
	 * @param {number} ry - Vertical radius in 32-space.
	 * @param {string} fill - Fill color style.
	 * @returns {void}
	 */
	function drawEllipse(ctx, cx, cy, rx, ry, fill) {
		if (!ctx) return;
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(S(cx), S(cy), S(rx), S(ry), 0, 0, Math.PI * 2);
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.restore();
	}
	//#endregion

	//#region [SEC-05] Layer 1: Base Silhouette & Anatomy Compositor
	// =========================================================================
	// LAYER 1: BASE PHENOTYPE SILHOUETTE & ANATOMY (4X RESOLUTION)
	// =========================================================================
	/**
	 * Renders hero legs and boots based on facing direction and gait step.
	 * State-mutating canvas composite procedure.
	 * @param {string} facing - Facing orientation direction.
	 * @param {boolean} isStep - Walk animation gait step flag.
	 * @returns {void}
	 */
	function drawLegsAndBoots(facing, isStep) {
		const legColor = P.ironDark;
		const bootColor = P.steelDark;
		const bootRim = P.steelMid;

		if (facing === "UP" || facing === "DOWN") {
			const leftY = isStep ? 22 : 19.5;
			const rightY = isStep ? 19.5 : 22;

			drawRoundedRect(
				workCtx,
				[9.5, leftY, 4.5, 7.5],
				1.2,
				legColor,
				bootColor,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[9.0, leftY + 5.5, 5.5, 2.8],
				1.0,
				bootColor,
				bootRim,
				0.4,
			);

			drawRoundedRect(
				workCtx,
				[18.0, rightY, 4.5, 7.5],
				1.2,
				legColor,
				bootColor,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[17.5, rightY + 5.5, 5.5, 2.8],
				1.0,
				bootColor,
				bootRim,
				0.4,
			);
			return;
		}
		if (facing === "LEFT") {
			const legOffset = isStep ? 2 : 0;
			drawRoundedRect(
				workCtx,
				[11.5 + legOffset, 20.5, 5.5, 8.0],
				1.2,
				legColor,
				bootColor,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[10.0 + legOffset, 25.5, 7.0, 3.2],
				1.0,
				bootColor,
				bootRim,
				0.4,
			);
			if (isStep) {
				drawRoundedRect(workCtx, [16.5, 19.5, 4.5, 7.5], 1.0, P.ironDark);
			}
			return;
		}
		if (facing === "RIGHT") {
			const legOffset = isStep ? -2 : 0;
			drawRoundedRect(
				workCtx,
				[15.0 + legOffset, 20.5, 5.5, 8.0],
				1.2,
				legColor,
				bootColor,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[15.0 + legOffset, 25.5, 7.0, 3.2],
				1.0,
				bootColor,
				bootRim,
				0.4,
			);
			if (isStep) {
				drawRoundedRect(workCtx, [11.0, 19.5, 4.5, 7.5], 1.0, P.ironDark);
			}
		}
	}

	/**
	 * Resolves the primary and shadow colors for the hero archetype torso.
	 * Pure evaluation helper.
	 * @param {string} phenotype - Hero phenotype archetype token.
	 * @returns {{ torsoPrimary: string, torsoShadow: string }} Torso color pair.
	 */
	function resolveTorsoPalette(phenotype) {
		if (phenotype === "WARRIOR") {
			return { torsoPrimary: P.steelMid, torsoShadow: P.steelDark };
		}
		if (phenotype === "MAGE") {
			return { torsoPrimary: P.clothViolet, torsoShadow: P.clothVioletDark };
		}
		if (phenotype === "HEALER") {
			return { torsoPrimary: P.clothWhite, torsoShadow: P.clothWhiteDark };
		}
		return { torsoPrimary: P.clothBlue, torsoShadow: P.clothBlueDark };
	}

	/**
	 * Renders directional face, eyes, and hair on the cranium.
	 * State-mutating canvas composite procedure.
	 * @param {string} facing - Facing orientation direction.
	 * @param {number} bobY - Vertical bob offset.
	 * @returns {void}
	 */
	function drawVisageAndHair(facing, bobY) {
		if (facing === "DOWN") {
			drawRoundedRect(workCtx, [13.0, 7.5 + bobY, 2.2, 1.8], 0.5, P.void);
			drawRoundedRect(workCtx, [16.8, 7.5 + bobY, 2.2, 1.8], 0.5, P.void);
			drawRoundedRect(workCtx, [13.2, 7.7 + bobY, 1.4, 1.2], 0.3, P.arcaneCyan);
			drawRoundedRect(workCtx, [17.0, 7.7 + bobY, 1.4, 1.2], 0.3, P.arcaneCyan);
			drawRoundedRect(
				workCtx,
				[11.5, 4.5 + bobY, 9.0, 2.5],
				1.0,
				P.leatherDark,
			);
			return;
		}
		if (facing === "LEFT") {
			drawRoundedRect(workCtx, [12.0, 7.5 + bobY, 2.2, 1.8], 0.5, P.void);
			drawRoundedRect(workCtx, [12.2, 7.7 + bobY, 1.4, 1.2], 0.3, P.arcaneCyan);
			drawRoundedRect(
				workCtx,
				[11.0, 4.5 + bobY, 8.0, 3.0],
				1.0,
				P.leatherDark,
			);
			return;
		}
		if (facing === "RIGHT") {
			drawRoundedRect(workCtx, [17.8, 7.5 + bobY, 2.2, 1.8], 0.5, P.void);
			drawRoundedRect(workCtx, [18.0, 7.7 + bobY, 1.4, 1.2], 0.3, P.arcaneCyan);
			drawRoundedRect(
				workCtx,
				[13.0, 4.5 + bobY, 8.0, 3.0],
				1.0,
				P.leatherDark,
			);
			return;
		}
		if (facing === "UP") {
			drawRoundedRect(
				workCtx,
				[11.0, 4.2 + bobY, 10.0, 6.5],
				2.5,
				P.leatherDark,
				P.void,
				0.4,
			);
		}
	}

	/**
	 * Renders foundational phenotype anatomy, gait offsets, and facial features.
	 * State-mutating canvas composite procedure.
	 * @param {string} phenotype - Hero archetype classification ('HERO' | 'WARRIOR' | 'MAGE' | 'HEALER').
	 * @param {string} facing - Facing orientation direction ('UP' | 'DOWN' | 'LEFT' | 'RIGHT').
	 * @param {number} frame - Walk animation gait frame index.
	 * @returns {void}
	 */
	function drawBaseAnatomy(phenotype, facing, frame) {
		if (!workCtx) return;
		const isStep = frame % 2 === 1;
		const bobY = isStep ? -0.75 : 0;
		const p = (phenotype || "HERO").toUpperCase();

		// 1. Ambient Ground Contact Shadow
		drawEllipse(workCtx, 16, 28.5, 9.5, 3.8, P.shadowAO);

		// 2. Articulated Legs & Boots (Walk Gait)
		drawLegsAndBoots(facing, isStep);

		// 3. Torso Core Tunics & Belt
		const { torsoPrimary, torsoShadow } = resolveTorsoPalette(p);
		drawRoundedRect(
			workCtx,
			[10.5, 12.5 + bobY, 11.0, 8.5],
			2.0,
			torsoPrimary,
			torsoShadow,
			0.5,
		);
		drawRoundedRect(
			workCtx,
			[10.0, 18.5 + bobY, 12.0, 2.2],
			0.8,
			P.leatherMid,
			P.goldMid,
			0.3,
		);

		// 4. Articulated Head, Neck & Cranium
		drawRoundedRect(workCtx, [13.5, 11.0 + bobY, 5.0, 3.5], 1.0, P.skinShadow);
		drawRoundedRect(
			workCtx,
			[11.5, 5.0 + bobY, 9.0, 7.5],
			3.0,
			P.skinMid,
			P.skinShadow,
			0.4,
		);

		// 5. Directional Visage / Eyes / Hair
		drawVisageAndHair(facing, bobY);
	}
	//#endregion

	//#region [SEC-06] Layer 2: Armor & Robe Equipment Overlays
	// =========================================================================
	// LAYER 2: ARMOR & ROBE OVERLAYS (4X RESOLUTION)
	// =========================================================================
	/**
	 * Renders modular cuirass, robe, and shoulder armor overlays.
	 * State-mutating canvas composite procedure.
	 * @param {string} armorId - Armor configuration token.
	 * @param {string} facing - Facing orientation direction.
	 * @param {number} frame - Walk animation gait frame index.
	 * @returns {void}
	 */
	function drawArmorOverlay(armorId, facing, frame) {
		if (!workCtx || !armorId) return;
		const isStep = frame % 2 === 1;
		const bobY = isStep ? -0.75 : 0;
		const arm = String(armorId).toUpperCase();

		if (arm.includes("LEATHER") || arm.includes("VEST")) {
			drawRoundedRect(
				workCtx,
				[10.0, 12.0 + bobY, 12.0, 8.0],
				1.8,
				P.leatherMid,
				P.leatherDark,
				0.5,
			);
			drawRoundedRect(workCtx, [11.5, 13.5 + bobY, 2.0, 2.0], 0.5, P.goldLight);
			drawRoundedRect(workCtx, [18.5, 13.5 + bobY, 2.0, 2.0], 0.5, P.goldLight);
		} else if (
			arm.includes("CHAIN") ||
			arm.includes("PLATE") ||
			arm.includes("IRON")
		) {
			drawRoundedRect(
				workCtx,
				[9.5, 11.5 + bobY, 13.0, 8.5],
				2.0,
				P.steelMid,
				P.steelDark,
				0.6,
			);
			drawRoundedRect(
				workCtx,
				[11.0, 12.2 + bobY, 10.0, 5.0],
				1.2,
				P.steelLight,
				P.steelSpec,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[8.0, 11.0 + bobY, 3.5, 4.5],
				1.0,
				P.steelLight,
				P.goldMid,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[20.5, 11.0 + bobY, 3.5, 4.5],
				1.0,
				P.steelLight,
				P.goldMid,
				0.4,
			);
		} else if (
			arm.includes("ROBE") ||
			arm.includes("SILK") ||
			arm.includes("VESTMENT")
		) {
			const robeColor = arm.includes("CLERIC") ? P.clothWhite : P.clothViolet;
			const stoleColor = arm.includes("CLERIC") ? P.clothGreen : P.goldMid;
			drawRoundedRect(
				workCtx,
				[9.0, 12.0 + bobY, 14.0, 11.0],
				2.5,
				robeColor,
				P.void,
				0.5,
			);
			drawRoundedRect(
				workCtx,
				[13.5, 12.5 + bobY, 5.0, 10.0],
				1.0,
				stoleColor,
				P.goldSpec,
				0.3,
			);
		}
	}
	//#endregion

	//#region [SEC-07] Layer 3: Helmet & Headgear Overlays
	// =========================================================================
	// LAYER 3: HELMET & HEADGEAR OVERLAYS (4X RESOLUTION)
	// =========================================================================
	/**
	 * Renders phenotype-aligned headgear, crests, and haloes.
	 * State-mutating canvas composite procedure.
	 * @param {string} phenotype - Hero archetype classification.
	 * @param {string} facing - Facing orientation direction.
	 * @param {number} frame - Walk animation gait frame index.
	 * @returns {void}
	 */
	function drawHeadgearOverlay(phenotype, facing, frame) {
		if (!workCtx) return;
		const isStep = frame % 2 === 1;
		const bobY = isStep ? -0.75 : 0;
		const p = (phenotype || "HERO").toUpperCase();

		if (p === "HERO") {
			drawRoundedRect(
				workCtx,
				[11.0, 3.8 + bobY, 10.0, 4.0],
				1.5,
				P.steelLight,
				P.goldMid,
				0.4,
			);
			if (facing === "DOWN") {
				drawRoundedRect(workCtx, [15.0, 5.5 + bobY, 2.0, 4.0], 0.5, P.steelMid);
			}
		} else if (p === "WARRIOR") {
			drawRoundedRect(
				workCtx,
				[10.5, 3.5 + bobY, 11.0, 5.5],
				2.0,
				P.ironDark,
				P.steelMid,
				0.6,
			);
			drawShadedPoly(
				workCtx,
				[
					{ x: 10.5, y: 5.0 + bobY },
					{ x: 7.5, y: 1.5 + bobY },
					{ x: 11.0, y: 3.5 + bobY },
				],
				P.goldMid,
				P.goldDark,
				0.3,
			);
			drawShadedPoly(
				workCtx,
				[
					{ x: 21.5, y: 5.0 + bobY },
					{ x: 24.5, y: 1.5 + bobY },
					{ x: 21.0, y: 3.5 + bobY },
				],
				P.goldMid,
				P.goldDark,
				0.3,
			);
		} else if (p === "MAGE") {
			drawRoundedRect(
				workCtx,
				[10.0, 3.2 + bobY, 12.0, 8.5],
				3.5,
				P.clothViolet,
				P.clothVioletDark,
				0.6,
			);
			if (facing === "DOWN") {
				drawRoundedRect(workCtx, [12.0, 6.0 + bobY, 8.0, 4.5], 2.0, P.void);
				drawRoundedRect(
					workCtx,
					[13.5, 7.5 + bobY, 1.8, 1.2],
					0.4,
					P.arcaneViolet,
				);
				drawRoundedRect(
					workCtx,
					[16.7, 7.5 + bobY, 1.8, 1.2],
					0.4,
					P.arcaneViolet,
				);
			}
		} else if (p === "HEALER") {
			drawEllipse(workCtx, 16.0, 3.5 + bobY, 7.0, 2.2, P.goldMid);
			drawEllipse(workCtx, 16.0, 3.5 + bobY, 5.0, 1.4, P.goldSpec);
		}
	}
	//#endregion

	//#region [SEC-08] Layer 4: Weapon & Off-Hand Overlays
	// =========================================================================
	// LAYER 4: WEAPON & OFF-HAND OVERLAYS (4X RESOLUTION)
	// =========================================================================
	/**
	 * Renders modular swords, battleaxes, staves, and maces.
	 * State-mutating canvas composite procedure.
	 * @param {string} weaponId - Weapon asset identifier token.
	 * @param {string} facing - Facing orientation direction.
	 * @param {number} frame - Walk animation gait frame index.
	 * @returns {void}
	 */
	function drawWeaponOverlay(weaponId, facing, frame) {
		if (!workCtx || !weaponId) return;
		const isStep = frame % 2 === 1;
		const bobY = isStep ? -0.75 : 0;
		const w = String(weaponId).toUpperCase();

		if (w.includes("SWORD") || w.includes("BLADE")) {
			if (facing === "RIGHT") {
				drawRoundedRect(
					workCtx,
					[20.0, 14.0 + bobY, 10.0, 2.2],
					0.6,
					P.steelLight,
					P.steelSpec,
					0.3,
				);
				drawRoundedRect(workCtx, [19.0, 12.5 + bobY, 2.0, 5.0], 0.5, P.goldMid);
			} else if (facing === "LEFT") {
				drawRoundedRect(
					workCtx,
					[2.0, 14.0 + bobY, 10.0, 2.2],
					0.6,
					P.steelLight,
					P.steelSpec,
					0.3,
				);
				drawRoundedRect(workCtx, [11.0, 12.5 + bobY, 2.0, 5.0], 0.5, P.goldMid);
			} else {
				drawRoundedRect(
					workCtx,
					[21.0, 11.0 + bobY, 2.2, 12.0],
					0.6,
					P.steelLight,
					P.steelSpec,
					0.3,
				);
				drawRoundedRect(workCtx, [19.5, 12.0 + bobY, 5.0, 2.0], 0.5, P.goldMid);
			}
		} else if (w.includes("AXE")) {
			drawRoundedRect(workCtx, [20.5, 9.0 + bobY, 2.4, 15.0], 0.5, P.woodMid);
			drawShadedPoly(
				workCtx,
				[
					{ x: 21.5, y: 9.0 + bobY },
					{ x: 26.5, y: 7.0 + bobY },
					{ x: 27.5, y: 12.5 + bobY },
					{ x: 21.5, y: 11.5 + bobY },
				],
				P.steelLight,
				P.steelSpec,
				0.4,
			);
		} else if (w.includes("STAFF")) {
			drawRoundedRect(
				workCtx,
				[21.0, 8.0 + bobY, 2.2, 16.0],
				0.5,
				P.woodDark,
				P.goldMid,
				0.3,
			);
			drawEllipse(workCtx, 22.0, 7.0 + bobY, 3.2, 3.2, P.arcaneViolet);
			drawEllipse(workCtx, 22.0, 7.0 + bobY, 1.5, 1.5, P.steelSpec);
		} else if (w.includes("MACE")) {
			drawRoundedRect(
				workCtx,
				[21.0, 11.0 + bobY, 2.2, 13.0],
				0.5,
				P.woodMid,
				P.goldMid,
				0.3,
			);
			drawEllipse(workCtx, 22.0, 10.0 + bobY, 3.5, 3.5, P.goldMid);
			drawEllipse(workCtx, 22.0, 10.0 + bobY, 2.0, 2.0, P.goldSpec);
		}
	}
	//#endregion

	//#region [SEC-09] Hostile Entity Synthesizer (Enemy Generation)
	// =========================================================================
	// HOSTILE ENTITY SYNTHESIZER (ENEMY)
	// =========================================================================
	/**
	 * Procedurally synthesizes animated hostile monster sprites.
	 * State-mutating canvas composite procedure.
	 * @param {string} enemyKey - Enemy archetype identifier token.
	 * @param {number} frame - Walk animation gait frame index.
	 * @returns {void}
	 */
	function drawAnimatedEnemy(enemyKey, frame) {
		if (!workCtx) return;
		const isStep = frame % 2 === 1;
		const bobY = isStep ? -0.75 : 0;
		const k = String(enemyKey || "SHADE_WOLF").toUpperCase();

		// Ground Shadow
		drawEllipse(workCtx, 16, 28, 10, 4, P.shadowAO);

		if (k.includes("WOLF") || k.includes("SHADE")) {
			drawRoundedRect(
				workCtx,
				[8.0, 14.0 + bobY, 16.0, 10.0],
				3.5,
				P.clothVioletDark,
				P.void,
				0.6,
			);
			drawRoundedRect(
				workCtx,
				[18.0, 10.0 + bobY, 10.0, 8.0],
				2.5,
				P.clothVioletDark,
				P.arcaneViolet,
				0.4,
			);
			drawRoundedRect(workCtx, [23.0, 14.0 + bobY, 6.0, 4.0], 1.5, P.ironDark);
			drawRoundedRect(
				workCtx,
				[21.0, 11.5 + bobY, 2.5, 1.8],
				0.5,
				P.arcaneViolet,
			);
			drawRoundedRect(workCtx, [21.5, 11.8 + bobY, 1.2, 1.0], 0.3, P.steelSpec);
		} else if (k.includes("SPIDER")) {
			drawEllipse(workCtx, 16.0, 16.0 + bobY, 7.5, 6.0, P.ironDark);
			drawEllipse(workCtx, 16.0, 21.0 + bobY, 6.0, 4.5, P.steelDark);
			drawRoundedRect(workCtx, [14.0, 19.5 + bobY, 1.5, 1.5], 0.3, P.soulRed);
			drawRoundedRect(workCtx, [16.5, 19.5 + bobY, 1.5, 1.5], 0.3, P.soulRed);
			drawRoundedRect(
				workCtx,
				[14.5, 14.0 + bobY, 3.0, 2.0],
				0.5,
				P.venomGreen,
			);
		} else if (k.includes("SKELETON") || k.includes("BONE")) {
			drawRoundedRect(
				workCtx,
				[11.5, 12.0 + bobY, 9.0, 8.0],
				1.5,
				P.steelLight,
				P.steelMid,
				0.4,
			);
			drawRoundedRect(
				workCtx,
				[11.0, 5.0 + bobY, 10.0, 7.0],
				2.5,
				P.steelLight,
				P.steelMid,
				0.4,
			);
			drawRoundedRect(workCtx, [13.0, 7.5 + bobY, 2.2, 2.0], 0.4, P.soulRed);
			drawRoundedRect(workCtx, [17.0, 7.5 + bobY, 2.2, 2.0], 0.4, P.soulRed);
		} else if (k.includes("ACOLYTE")) {
			drawRoundedRect(
				workCtx,
				[9.0, 10.0 + bobY, 14.0, 14.0],
				3.0,
				P.ironDark,
				P.venomGreen,
				0.5,
			);
			drawRoundedRect(workCtx, [11.5, 5.0 + bobY, 9.0, 7.0], 2.0, P.steelLight);
			drawRoundedRect(workCtx, [13.5, 7.0 + bobY, 1.8, 1.8], 0.4, P.venomGreen);
			drawRoundedRect(workCtx, [16.8, 7.0 + bobY, 1.8, 1.8], 0.4, P.venomGreen);
		} else if (k.includes("MALAKOR") || k.includes("BOSS")) {
			drawShadedPoly(
				workCtx,
				[
					{ x: 16.0, y: 12.0 + bobY },
					{ x: 2.0, y: 4.0 + bobY },
					{ x: 6.0, y: 18.0 + bobY },
				],
				P.clothRedDark,
				P.void,
				0.5,
			);
			drawShadedPoly(
				workCtx,
				[
					{ x: 16.0, y: 12.0 + bobY },
					{ x: 30.0, y: 4.0 + bobY },
					{ x: 26.0, y: 18.0 + bobY },
				],
				P.clothRedDark,
				P.void,
				0.5,
			);
			drawRoundedRect(
				workCtx,
				[10.0, 9.0 + bobY, 12.0, 12.0],
				2.5,
				P.ironDark,
				P.clothRed,
				0.6,
			);
			drawEllipse(workCtx, 16.0, 14.0 + bobY, 3.5, 3.5, P.emberCore);
		} else {
			drawRoundedRect(
				workCtx,
				[10.0, 11.0 + bobY, 12.0, 11.0],
				2.5,
				P.clothRedDark,
				P.soulRed,
				0.5,
			);
		}
	}
	//#endregion

	//#region [SEC-10] Town NPC Synthesizer (Civilian & Guard Generation)
	// =========================================================================
	// TOWN NPC SYNTHESIZER (NPC)
	// =========================================================================
	/**
	 * Procedurally synthesizes animated town civilians, elders, guards, and merchants.
	 * State-mutating canvas composite procedure.
	 * @param {string} npcKey - NPC entity classification archetype key.
	 * @param {number} frame - Walk animation gait frame index.
	 * @returns {void}
	 */
	function drawAnimatedNPC(npcKey, frame) {
		if (!workCtx) return;
		const isStep = frame % 2 === 1;
		const bobY = isStep ? -0.75 : 0;
		const k = String(npcKey || "ELDER").toUpperCase();

		// Ground Shadow
		drawEllipse(workCtx, 16, 28, 9, 3.5, P.shadowAO);

		if (k.includes("ELDER") || k === "E") {
			drawRoundedRect(
				workCtx,
				[9.5, 11.0 + bobY, 13.0, 13.0],
				2.5,
				P.ironDark,
				P.goldMid,
				0.4,
			);
			drawRoundedRect(workCtx, [12.0, 5.0 + bobY, 8.0, 6.5], 2.5, P.skinMid);
			drawRoundedRect(
				workCtx,
				[11.0, 9.5 + bobY, 10.0, 7.0],
				2.0,
				P.clothWhite,
			);
			drawRoundedRect(
				workCtx,
				[22.0, 7.0 + bobY, 2.0, 18.0],
				0.5,
				P.woodMid,
				P.goldMid,
				0.3,
			);
		} else if (k.includes("GUARD") || k === "G") {
			drawRoundedRect(
				workCtx,
				[9.5, 11.0 + bobY, 13.0, 11.0],
				2.0,
				P.steelLight,
				P.steelMid,
				0.5,
			);
			drawRoundedRect(
				workCtx,
				[11.0, 4.5 + bobY, 10.0, 7.0],
				2.0,
				P.steelLight,
				P.steelDark,
				0.5,
			);
			drawRoundedRect(workCtx, [12.5, 2.5 + bobY, 7.0, 3.0], 1.0, P.clothRed);
			drawRoundedRect(
				workCtx,
				[6.0, 13.0 + bobY, 4.5, 9.0],
				1.5,
				P.steelLight,
				P.goldMid,
				0.4,
			);
		} else if (k.includes("MERCHANT") || k === "M") {
			drawRoundedRect(
				workCtx,
				[9.0, 11.0 + bobY, 14.0, 12.0],
				2.5,
				P.clothViolet,
				P.goldMid,
				0.5,
			);
			drawRoundedRect(workCtx, [11.5, 5.0 + bobY, 9.0, 6.5], 2.0, P.skinMid);
			drawRoundedRect(workCtx, [10.0, 3.5 + bobY, 12.0, 2.5], 1.0, P.goldMid);
			drawEllipse(workCtx, 21.0, 17.0 + bobY, 3.0, 3.0, P.goldLight);
		} else {
			drawRoundedRect(
				workCtx,
				[10.0, 11.0 + bobY, 12.0, 12.0],
				2.0,
				P.steelDark,
				P.leatherMid,
				0.4,
			);
			drawRoundedRect(workCtx, [11.5, 5.0 + bobY, 9.0, 6.5], 2.0, P.skinMid);
			drawRoundedRect(workCtx, [12.5, 9.5 + bobY, 7.0, 3.0], 1.0, P.clothGreen);
		}
	}
	//#endregion

	//#region [SEC-11] Canonical VSRP-001 Lifecycle & Synthesis Gateway
	// =========================================================================
	// CANONICAL VSRP-001 9-METHOD LIFECYCLE IMPLEMENTATION
	// =========================================================================

	return {
		/**
		 * Configures peripheral driver options.
		 * State-mutating configuration gateway.
		 * @param {Record<string, any>} [options={}] - Custom configuration dictionary.
		 * @returns {Readonly<{ accepted: boolean, driverId: string }>} Acceptance descriptor.
		 */
		configure(options = {}) {
			config = Object.freeze({ ...config, ...options });
			configured = true;
			return Object.freeze({ accepted: true, driverId: "sprite_baker" });
		},

		/**
		 * Initializes procedural canvas contexts and optional host event bus handles.
		 * State-mutating initialization gateway.
		 * @param {SpriteBakerContext} [context] - Host initialization context.
		 * @returns {void}
		 */
		init(context) {
			if (!configured) {
				configured = true;
			}
			if (initialized) return;

			if (context) {
				if (context.eventBus) {
					eventBusRef = context.eventBus;
				} else if (typeof context.publish === "function") {
					eventBusRef = context;
				}
			}
			ensureCanvases();
			initialized = true;
		},

		/**
		 * Resets runtime state and optionally clears the rasterization cache.
		 * State-mutating reset gateway.
		 * @param {SpriteBakerResetSnapshot | null} [snapshot=null] - Reset options descriptor.
		 * @returns {void}
		 */
		reset(snapshot = null) {
			if (snapshot?.clearCache) {
				cache.clear();
			}
		},

		/**
		 * Ticks the peripheral driver during simulation cycles.
		 * Pure stateless procedure during ticks.
		 * @param {number} [_dt] - Frame delta time in seconds.
		 * @returns {void}
		 */
		update(_dt) {
			// Stateless asset baker during ticks
		},

		/**
		 * Renders peripheral viewports directly.
		 * Pure stateless placeholder gateway.
		 * @param {any} [_snapshot] - Viewport snapshot reference.
		 * @param {any} [_dispatch] - Dispatch routine.
		 * @returns {void}
		 */
		render(_snapshot, _dispatch) {
			// Peripheral asset provider does not render directly to root viewport
		},

		/**
		 * Returns an operational state snapshot of the rasterization cache.
		 * Pure state accessor gateway.
		 * @returns {SpriteBakerState} Current baker operational metrics.
		 */
		getState() {
			return {
				cachedSpritesCount: cache.size,
				renderScale: SCALE_FACTOR,
				targetResolution: `${TARGET_SIZE}x${TARGET_SIZE}`,
				workResolution: `${WORK_SIZE}x${WORK_SIZE}`,
			};
		},

		/**
		 * Returns operational diagnostics and telemetry reports.
		 * Pure diagnostic accessor gateway.
		 * @returns {SpriteBakerDiagnostics} Diagnostic report descriptor.
		 */
		getDiagnostics() {
			return {
				driverId: "sprite_baker_driver",
				version: "4.0.0-ARTISTIC-UPGRADE",
				protocolVersion: "VSRP-001",
				configured,
				initialized,
				cachedSpriteCount: cache.size,
				supersamplingFactor: SCALE_FACTOR,
				bufferResolution: `${TARGET_SIZE}x${TARGET_SIZE}`,
				eventBusBound: Boolean(eventBusRef),
			};
		},

		/**
		 * Returns static module metadata and capabilities.
		 * Pure manifest accessor gateway.
		 * @returns {SpriteBakerModuleInfo} Constitutional metadata descriptor.
		 */
		getModuleInfo() {
			return {
				moduleId: "EmberlightSpriteBaker",
				version: "4.0.0",
				protocolVersion: "VSRP-001",
				capabilities: [
					"procedural_baking",
					"paper_doll_compositor",
					"4x_supersampling",
					"4_tier_pbr",
				],
			};
		},

		/**
		 * Tears down canvas buffers and clears the rasterization cache.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
		destroy() {
			cache.clear();
			workCanvas = null;
			workCtx = null;
			targetCanvas = null;
			targetCtx = null;
			eventBusRef = null;
			initialized = false;
			configured = false;
		},

		/**
		 * Synthesizes or retrieves a cached composite data URL for an animated entity.
		 * State-mutating procedural baking and caching procedure.
		 * @param {string} [entityType='HERO'] - Entity archetype class ('HERO' | 'WARRIOR' | 'MAGE' | 'HEALER' | 'NPC' | 'ENEMY').
		 * @param {SpriteBakeOptions} [options={}] - Composite layering and direction parameters.
		 * @returns {string | null} Base64 PNG data URL or null on failure.
		 */
		get(entityType = "HERO", options = {}) {
			ensureCanvases();
			if (!workCanvas || !workCtx || !targetCanvas || !targetCtx) return null;

			const type = String(entityType || "HERO").toUpperCase();
			const facing = String(options.facing || "DOWN").toUpperCase();
			const frame = (options.frame || 0) % 2;
			const weapon = options.weapon || null;
			const armor = options.armor || null;
			const key = options.key || type;

			const cacheKey = `${type}_${key}_${facing}_F${frame}_W:${weapon || "NONE"}_A:${armor || "NONE"}`;
			if (cache.has(cacheKey)) {
				return /** @type {string} */ (cache.get(cacheKey));
			}

			clearWorkCanvas();

			if (["HERO", "WARRIOR", "MAGE", "HEALER"].includes(type)) {
				drawBaseAnatomy(type, facing, frame);
				if (armor) drawArmorOverlay(armor, facing, frame);
				drawHeadgearOverlay(type, facing, frame);
				if (weapon) drawWeaponOverlay(weapon, facing, frame);
			} else if (type === "ENEMY") {
				drawAnimatedEnemy(key, frame);
			} else if (type === "NPC") {
				drawAnimatedNPC(key, frame);
			} else {
				drawBaseAnatomy("HERO", facing, frame);
			}

			// High-Quality Bicubic Downsampling from 128x128 to 32x32
			targetCtx.drawImage(
				workCanvas,
				0,
				0,
				WORK_SIZE,
				WORK_SIZE,
				0,
				0,
				TARGET_SIZE,
				TARGET_SIZE,
			);

			try {
				const dataUrl = targetCanvas.toDataURL("image/png");
				cache.set(cacheKey, dataUrl);
				return dataUrl;
			} catch (err) {
				console.error("[EmberlightSpriteBaker] Bake failed:", err);
				return null;
			}
		},

		/**
		 * Purges the internal composite texture cache.
		 * State-mutating cache eviction procedure.
		 * @returns {void}
		 */
		clearCache() {
			cache.clear();
		},
	};
	//#endregion
})();

//#region [SEC-12] Module Export & Global Scope Bindings
if (typeof window !== "undefined") {
	window.EmberlightSpriteBaker = EmberlightSpriteBaker;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightSpriteBaker;
}
//#endregion
