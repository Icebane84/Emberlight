/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MAP LINE OF SIGHT & LIGHTING SUB-MODULE
 * Document Identifier: VSRP-001-MAP-LOS
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-MAP-RENDERER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-03] Raycast Line of Sight (Lines 680–722)
 *   [SEC-04] Dynamic Lighting Solvers (Lines 726–760)
 *
 * STAGING MEMBRANE KEY: window._MapInternal.LOS
 * DEPENDENCIES: None
 * ============================================================================
 */

if (typeof window !== "undefined") window._MapInternal = window._MapInternal || {};
if (typeof globalThis !== "undefined") globalThis._MapInternal = globalThis._MapInternal || {};

(() => {
	"use strict";

	//#region [SEC-03] Raycast Line of Sight
	/**
	 * Computes line of sight visibility coordinates from player position.
	 * Pure mathematical calculation procedure.
	 *
	 * @param {string[][]} map - 2D terrain grid matrix.
	 * @param {number} px - Player grid column position.
	 * @param {number} py - Player grid row position.
	 * @param {number} [radius=7] - Maximum vision radius in tiles.
	 * @returns {Set<string>} Set of visible coordinate strings ('x,y').
	 */
	function computeLineOfSight(map, px, py, radius = 7) {
		const visible = new Set();
		const height = map ? map.length : 0;
		if (height === 0) return visible;
		const width = map[0] ? map[0].length : 0;

		visible.add(`${px},${py}`);

		const steps = 48;
		for (let i = 0; i < steps; i++) {
			const angle = (i / steps) * Math.PI * 2;
			const dx = Math.cos(angle);
			const dy = Math.sin(angle);

			let cx = px + 0.5;
			let cy = py + 0.5;

			for (let step = 0; step < radius * 2; step++) {
				cx += dx * 0.5;
				cy += dy * 0.5;
				const tx = Math.floor(cx);
				const ty = Math.floor(cy);

				if (tx < 0 || tx >= width || ty < 0 || ty >= height) break;
				visible.add(`${tx},${ty}`);

				if (map[ty][tx] === "#") {
					break;
				}
			}
		}
		return visible;
	}
	//#endregion

	//#region [SEC-04] Dynamic Lighting Solvers
	/**
	 * Renders radial lantern lighting around the player avatar.
	 * State-mutating canvas render procedure.
	 *
	 * @param {CanvasRenderingContext2D | any} renderCtx - Target 2D canvas context.
	 * @param {number} w - Viewport canvas width.
	 * @param {number} h - Viewport canvas height.
	 * @param {number} playerScreenX - Player avatar screen X pixel position.
	 * @param {number} playerScreenY - Player avatar screen Y pixel position.
	 * @returns {void}
	 */
	function renderDynamicLighting(
		renderCtx,
		w,
		h,
		playerScreenX,
		playerScreenY,
	) {
		if (!renderCtx || typeof renderCtx.createRadialGradient !== "function") return;

		const lanternGlow = renderCtx.createRadialGradient(
			playerScreenX + 14,
			playerScreenY + 14,
			12,
			playerScreenX + 14,
			playerScreenY + 14,
			140,
		);
		lanternGlow.addColorStop(0, "rgba(245, 158, 11, 0.22)");
		lanternGlow.addColorStop(0.5, "rgba(245, 158, 11, 0.08)");
		lanternGlow.addColorStop(1, "rgba(4, 4, 12, 0)");

		renderCtx.fillStyle = lanternGlow;
		renderCtx.fillRect(0, 0, w, h);
	}
	//#endregion

	// ─── Staging Membrane Export ──────────────────────────────────────────────
	const LOS = Object.freeze({
		computeLineOfSight,
		renderDynamicLighting,
	});

	if (typeof window !== "undefined") {
		window._MapInternal.LOS = LOS;
	}
	if (typeof globalThis !== "undefined") {
		globalThis._MapInternal.LOS = LOS;
	}
	if (typeof module !== "undefined" && module.exports) {
		module.exports = LOS;
	}
})();
