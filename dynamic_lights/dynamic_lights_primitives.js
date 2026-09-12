/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DYNAMIC LIGHTS PRIMITIVES SUB-MODULE
 * Document Identifier: VSRP-001-DYNAMIC-LIGHTS-PRIMITIVES
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Peripheral Capability Driver & Math Kernel (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-01] Module Constants & Dust Mote Particle Buffers
 *   [SEC-02] Viewport Measurement & Coordinate Sampling Subroutines
 *   [SEC-03] Zone Classification Logic
 *
 * STAGING MEMBRANE KEY: window._DynamicLightsInternal.Primitives
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DynamicLightsInternal = window._DynamicLightsInternal || {};
if (typeof globalThis !== 'undefined') globalThis._DynamicLightsInternal = globalThis._DynamicLightsInternal || {};

(() => {
	'use strict';

	const MAX_TRANSIENTS = 24;
	const DUST_MOTE_COUNT = 24;

	let moteSeed = 1337;

	/**
	 * Generates deterministic pseudorandom float numbers for motes.
	 * @returns {number} Normalized float between 0 and 1.
	 */
	function moteRand() {
		moteSeed = (moteSeed * 16807) % 2147483647;
		return (moteSeed - 1) / 2147483646;
	}

	/**
	 * Initializes ambient floating dust mote particle buffers.
	 * @param {Array<Object>} dustMotes - Target dust motes array.
	 * @returns {void}
	 */
	function initDustMotes(dustMotes) {
		if (dustMotes.length === 0) {
			for (let i = 0; i < DUST_MOTE_COUNT; i++) {
				dustMotes.push({
					x: moteRand() * 480,
					y: moteRand() * 320,
					vx: (moteRand() - 0.5) * 0.35,
					vy: -0.15 - moteRand() * 0.35,
					radius: 0.8 + moteRand() * 1.6,
					alpha: 0.25 + moteRand() * 0.45,
					isSpectral: moteRand() > 0.65,
				});
			}
		}
	}

	/**
	 * Calculates interpolated screen pixel coordinates for player avatar.
	 * @param {number} playerX - Interpolated grid X coordinate.
	 * @param {number} playerY - Interpolated grid Y coordinate.
	 * @param {number} tileW - Tile width in pixels.
	 * @param {number} tileH - Tile height in pixels.
	 * @param {number} offsetX - Grid wrapper screen X offset.
	 * @param {number} offsetY - Grid wrapper screen Y offset.
	 * @param {HTMLCanvasElement|null} canvas - Dynamic lights canvas element.
	 * @returns {{ pScreenX: number, pScreenY: number }} Screen coordinate object.
	 */
	function calculateScreenPlayerCoords(playerX, playerY, tileW, tileH, offsetX, offsetY, canvas) {
		const playerCell = (typeof document !== 'undefined') ? document.querySelector('#overworld-grid .tile.player') : null;
		let pScreenX = offsetX + (playerX * tileW) + (tileW * 0.5);
		let pScreenY = offsetY + (playerY * tileH) + (tileH * 0.5);

		if (playerCell && canvas) {
			const cellRect = (typeof playerCell.getBoundingClientRect === 'function') ? playerCell.getBoundingClientRect() : null;
			const canvasRect = (typeof canvas.getBoundingClientRect === 'function') ? canvas.getBoundingClientRect() : null;
			if (cellRect && canvasRect && cellRect.width > 0 && cellRect.width < 1000) {
				pScreenX = (cellRect.left - canvasRect.left) + cellRect.width * 0.5;
				pScreenY = (cellRect.top - canvasRect.top) + cellRect.height * 0.5;
			}
		}
		return { pScreenX, pScreenY };
	}

	/**
	 * Evaluates the lighting zone type for specific grid coordinates.
	 * @param {number} x - Grid column index.
	 * @param {number} y - Grid row index.
	 * @param {number} dungeonDepth - Current subterranean depth level.
	 * @param {string[][]|null} cachedMap - Cached terrain map grid.
	 * @returns {'CRYPT' | 'TOWN' | 'SURFACE'} Zone classification token.
	 */
	function evaluateZone(x, y, dungeonDepth, cachedMap) {
		if (dungeonDepth > 0) return 'CRYPT';
		if (typeof EmberlightManifest === 'undefined') return 'SURFACE';
		const map = cachedMap || EmberlightManifest.OverworldMap || [];
		const tile = map[y]?.[x];
		if (tile === 'T' || tile === 'O' || tile === 'H' || tile === 'S') return 'TOWN';
		if (tile === '>') return 'CRYPT';
		return 'SURFACE';
	}

	const Primitives = Object.freeze({
		MAX_TRANSIENTS,
		DUST_MOTE_COUNT,
		moteRand,
		initDustMotes,
		calculateScreenPlayerCoords,
		evaluateZone,
	});

	if (typeof window !== 'undefined') {
		window._DynamicLightsInternal.Primitives = Primitives;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis._DynamicLightsInternal.Primitives = Primitives;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Primitives;
	}
})();
