/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROCEDURAL OVERWORLD SPRITE BAKER (TIER 3)
 * Document Identifier: ARCH-SPEC-SPRITE-BAKER-002
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-OVERWORLD-SPRITES-004
 * Authority:           Multi-Size Environmental Asset Synthesis & Supersampling
 * ============================================================================
 */

const EmberlightSpriteBaker = (() => {
	'use strict';

	const MODULE_INFO = Object.freeze({
		moduleId: 'sprite_baker',
		version: '4.2.0',
		protocolVersion: 'VSRP-001',
		capabilities: ['procedural_sprites', 'multi_size_baking', 'supersampling']
	});

	const VERSION = "4.2.0";
	const RENDER_SCALE = 4; // Strict 4x supersampling resolution envelope

	const assetCache = new Map();
	const diagnosticLog = new Map();

	// HSL/PBR Color Token Registers
	const C = Object.freeze({
		outline: "#080a0f",
		shadow: "rgba(11, 13, 19, 0.65)",
		stone0: "#334155",
		stone1: "#475569",
		stone2: "#64748b",
		stone3: "#94a3b8",
		ember0: "#7c2d12",
		ember1: "#ea580c",
		ember2: "#f97316",
		gold0: "#713f12",
		gold1: "#ca8a04",
		gold2: "#fde047"
	});

	/**
	 * Direct spatial metadata catalog mapping boundary dimensions and layout footprints.
	 * Integrates with overworld_renderer.js parsing offsets cleanly.
	 */
	const DecorationSpecs = Object.freeze({
		// Standard baseline footprint
		CAMPFIRE: { w: 32, h: 32, originYOffset: 0 },
		CHEST: { w: 32, h: 32, originYOffset: 0 },

		// Large scale atmospheric decorations (Multi-Tile vertical/horizontal shifts)
		ANCIENT_ARCH: { w: 64, h: 64, originYOffset: 0 },  // 2x2 grid cell block footprint
		CRYPT_PILLAR: { w: 32, h: 64, originYOffset: 32 }, // 1x2 grid cell vertical column block
		VAULT_OBELISK: { w: 32, h: 64, originYOffset: 32 }  // 1x2 glowing crystalline monolith
	});

	function createOffscreenCanvas(w, h) {
		if (typeof document === 'undefined') return null;
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}

	// --- Procedural Vector Rendering Routines ---

	function drawCryptPillar(ctx, sw, sh) {
		const w = sw / RENDER_SCALE;
		const h = sh / RENDER_SCALE;

		// Ground Contact Drop Shadow
		ctx.fillStyle = C.shadow;
		ctx.beginPath();
		ctx.ellipse(sw * 0.5, sh - (4 * RENDER_SCALE), 14 * RENDER_SCALE, 3 * RENDER_SCALE, 0, 0, Math.PI * 2);
		ctx.fill();

		// Pillar Structural Base
		ctx.fillStyle = C.outline;
		ctx.fillRect(4 * RENDER_SCALE, (h - 10) * RENDER_SCALE, 24 * RENDER_SCALE, 8 * RENDER_SCALE);
		ctx.fillStyle = C.stone0;
		ctx.fillRect(5 * RENDER_SCALE, (h - 9) * RENDER_SCALE, 22 * RENDER_SCALE, 6 * RENDER_SCALE);

		// Vertical Shaft Core
		ctx.fillStyle = C.outline;
		ctx.fillRect(8 * RENDER_SCALE, 6 * RENDER_SCALE, 16 * RENDER_SCALE, (h - 16) * RENDER_SCALE);
		ctx.fillStyle = C.stone1;
		ctx.fillRect(9 * RENDER_SCALE, 7 * RENDER_SCALE, 14 * RENDER_SCALE, (h - 18) * RENDER_SCALE);

		// Fluting Grooves & Highlights
		ctx.fillStyle = C.stone2;
		ctx.fillRect(11 * RENDER_SCALE, 7 * RENDER_SCALE, 3 * RENDER_SCALE, (h - 18) * RENDER_SCALE);
		ctx.fillStyle = C.stone3;
		ctx.fillRect(12 * RENDER_SCALE, 7 * RENDER_SCALE, 1 * RENDER_SCALE, (h - 18) * RENDER_SCALE);

		ctx.fillStyle = C.stone0;
		ctx.fillRect(17 * RENDER_SCALE, 7 * RENDER_SCALE, 3 * RENDER_SCALE, (h - 18) * RENDER_SCALE);

		// Capital Crown
		ctx.fillStyle = C.outline;
		ctx.fillRect(6 * RENDER_SCALE, 2 * RENDER_SCALE, 20 * RENDER_SCALE, 5 * RENDER_SCALE);
		ctx.fillStyle = C.stone2;
		ctx.fillRect(7 * RENDER_SCALE, 3 * RENDER_SCALE, 18 * RENDER_SCALE, 3 * RENDER_SCALE);
	}

	function drawVaultObelisk(ctx, sw, sh) {
		const w = sw / RENDER_SCALE;
		const h = sh / RENDER_SCALE;

		// Shadow Ring
		ctx.fillStyle = C.shadow;
		ctx.beginPath();
		ctx.ellipse(sw * 0.5, sh - (3 * RENDER_SCALE), 12 * RENDER_SCALE, 2.5 * RENDER_SCALE, 0, 0, Math.PI * 2);
		ctx.fill();

		// Monolith Tapered Geometry
		ctx.fillStyle = C.outline;
		ctx.beginPath();
		ctx.moveTo(16 * RENDER_SCALE, 2 * RENDER_SCALE);
		ctx.lineTo(26 * RENDER_SCALE, (h - 4) * RENDER_SCALE);
		ctx.lineTo(6 * RENDER_SCALE, (h - 4) * RENDER_SCALE);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = C.stone0;
		ctx.beginPath();
		ctx.moveTo(16 * RENDER_SCALE, 4 * RENDER_SCALE);
		ctx.lineTo(24 * RENDER_SCALE, (h - 5) * RENDER_SCALE);
		ctx.lineTo(8 * RENDER_SCALE, (h - 5) * RENDER_SCALE);
		ctx.closePath();
		ctx.fill();

		// Shaded Facet Edge
		ctx.fillStyle = C.stone1;
		ctx.beginPath();
		ctx.moveTo(16 * RENDER_SCALE, 4 * RENDER_SCALE);
		ctx.lineTo(24 * RENDER_SCALE, (h - 5) * RENDER_SCALE);
		ctx.lineTo(16 * RENDER_SCALE, (h - 5) * RENDER_SCALE);
		ctx.closePath();
		ctx.fill();

		// Emissive Arcane Runes Inscription Core
		const timeFactor = Date.now() * 0.003;
		const pulseAlpha = 0.4 + Math.sin(timeFactor) * 0.3;
		ctx.fillStyle = `rgba(234, 88, 12, ${pulseAlpha})`; // Ember crystal pulse

		ctx.fillRect(15 * RENDER_SCALE, 16 * RENDER_SCALE, 2 * RENDER_SCALE, 4 * RENDER_SCALE);
		ctx.fillRect(15 * RENDER_SCALE, 24 * RENDER_SCALE, 2 * RENDER_SCALE, 6 * RENDER_SCALE);
		ctx.fillRect(15 * RENDER_SCALE, 34 * RENDER_SCALE, 2 * RENDER_SCALE, 3 * RENDER_SCALE);
	}

	/**
	 * Executes the composition, scaling reduction, and JIT caching pipeline block.
	 */
	function bakeAsset(assetKey, spec) {
		const sw = spec.w * RENDER_SCALE;
		const sh = spec.h * RENDER_SCALE;

		const workCanvas = createOffscreenCanvas(sw, sh);
		if (!workCanvas) return;
		const workCtx = workCanvas.getContext('2d');
		workCtx.imageSmoothingEnabled = false;

		// Route decoration definitions onto vector bakes
		if (assetKey === 'CRYPT_PILLAR') drawCryptPillar(workCtx, sw, sh);
		else if (assetKey === 'VAULT_OBELISK') drawVaultObelisk(workCtx, sw, sh);
		else {
			// Default placeholder drawing block for structural fallbacks
			workCtx.fillStyle = C.outline;
			workCtx.fillRect(4 * RENDER_SCALE, 4 * RENDER_SCALE, (spec.w - 8) * RENDER_SCALE, (spec.h - 8) * RENDER_SCALE);
			workCtx.fillStyle = C.stone2;
			workCtx.fillRect(6 * RENDER_SCALE, 6 * RENDER_SCALE, (spec.w - 12) * RENDER_SCALE, (spec.h - 12) * RENDER_SCALE);
		}

		// Execute Downsample Compression to destination layout dimensions
		const outCanvas = createOffscreenCanvas(spec.w, spec.h);
		if (!outCanvas) return;
		const outCtx = outCanvas.getContext('2d');
		outCtx.imageSmoothingEnabled = true;
		outCtx.imageSmoothingQuality = 'high';

		outCtx.drawImage(workCanvas, 0, 0, sw, sh, 0, 0, spec.w, spec.h);

		const dataUrl = outCanvas.toDataURL('image/png');
		assetCache.set(assetKey, dataUrl);

		diagnosticLog.set(assetKey, {
			moduleId: MODULE_INFO.moduleId,
			resolution: `${spec.w}x${spec.h}`,
			timestamp: Date.now()
		});
	}

	return {
		configure(config) { return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId }); },
		init() {
			// Pre-bake all extended size macro assets on initialization pass
			Object.entries(DecorationSpecs).forEach(([key, spec]) => {
				bakeAsset(key, spec);
			});
		},
		reset() { assetCache.clear(); this.init(); },
		update() { },
		render() { },

		/**
		 * Resolves and extracts the compiled data URL asset payload.
		 * @param {string} assetKey - Dictionary metadata key identification string.
		 * @returns {string|null} Base64 PNG data URL reference string.
		 */
		getAsset(assetKey) {
			const normKey = String(assetKey).toUpperCase();
			if (!assetCache.has(normKey) && DecorationSpecs[normKey]) {
				bakeAsset(normKey, DecorationSpecs[normKey]);
			}
			return assetCache.get(normKey) || null;
		},

		/**
		 * Returns structural blueprint sizing spec values to let renderers manage offsets cleanly.
		 */
		getSpec(assetKey) {
			return DecorationSpecs[String(assetKey).toUpperCase()] || { w: 32, h: 32, originYOffset: 0 };
		},

		getState() { return Object.freeze({ cachedCount: assetCache.size }); },
		getDiagnostics() { return { driverId: MODULE_INFO.moduleId, keys: [...assetCache.keys()] }; },
		getModuleInfo() { return MODULE_INFO; },
		destroy() { assetCache.clear(); diagnosticLog.clear(); }
	};
})();

if (typeof window !== 'undefined') window.EmberlightSpriteBaker = EmberlightSpriteBaker;
