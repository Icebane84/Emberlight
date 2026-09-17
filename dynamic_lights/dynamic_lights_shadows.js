/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DYNAMIC LIGHTS SHADOWS SUB-MODULE
 * Document Identifier: VSRP-001-DYNAMIC-LIGHTS-SHADOWS
 * Governing Protocol:  VSRP-001 / MPFS-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-04] Dynamic Shadow Volume Extrusion & Penumbra Falloff
 *   [SEC-05] Normal-Mapped Wall Edge Beveling & Corner Wrap
 *
 * STAGING MEMBRANE KEY: window._DynamicLightsInternal.Shadows
 * ============================================================================
 */

if (typeof window !== 'undefined') window._DynamicLightsInternal = window._DynamicLightsInternal || {};
if (typeof globalThis !== 'undefined') (/** @type {any} */ (globalThis))._DynamicLightsInternal = (/** @type {any} */ (globalThis))._DynamicLightsInternal || {};

(() => {
	/**
	 * @typedef {Object} DynamicLightSource
	 * @property {number} x - Light emitter screen X pixel coordinate.
	 * @property {number} y - Light emitter screen Y pixel coordinate.
	 * @property {number} radius - Illumination and shadow radius in pixels.
	 * @property {string} [color] - RGB light color channel string (e.g. '255, 180, 70').
	 * @property {number} [intensity] - Light intensity multiplier.
	 */

	/**
	 * Casts projected shadow volumes from an occluding wall tile.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
	 * @param {DynamicLightSource} light - Target light emitter source.
	 * @param {number} ox - Occluder X screen pixel coordinate.
	 * @param {number} oy - Occluder Y screen pixel coordinate.
	 * @param {number} ow - Occluder width in pixels.
	 * @param {number} oh - Occluder height in pixels.
	 * @param {number} [ambientDarkness=0.94] - Ambient background darkness level.
	 * @returns {void}
	 */
	function castShadowFromOccluder(ctx, light, ox, oy, ow, oh, ambientDarkness = 0.94) {
		if (!ctx || !light) return;
		const { x: lightX, y: lightY, radius: maxDist } = light;
		const corners = [
			{ x: ox, y: oy },
			{ x: ox + ow, y: oy },
			{ x: ox + ow, y: oy + oh },
			{ x: ox, y: oy + oh },
		];

		for (let i = 0; i < 4; i++) {
			const p1 = corners[i];
			const p2 = corners[(i + 1) % 4];

			const midX = (p1.x + p2.x) * 0.5;
			const midY = (p1.y + p2.y) * 0.5;
			const normalX = -(p2.y - p1.y);
			const normalY = p2.x - p1.x;

			const lightDirX = midX - lightX;
			const lightDirY = midY - lightY;

			// Facing test (only occlude when face normal points away from light)
			if (normalX * lightDirX + normalY * lightDirY > 0) {
				const d1X = p1.x - lightX;
				const d1Y = p1.y - lightY;
				const d2X = p2.x - lightX;
				const d2Y = p2.y - lightY;

				const len1 = Math.hypot(d1X, d1Y) || 1;
				const len2 = Math.hypot(d2X, d2Y) || 1;

				// Inset shadow origin slightly (2.5px) to allow organic light bleed onto the wall face/edge
				const insetOrigin1X = p1.x + (d1X / len1) * 2.5;
				const insetOrigin1Y = p1.y + (d1Y / len1) * 2.5;
				const insetOrigin2X = p2.x + (d2X / len2) * 2.5;
				const insetOrigin2Y = p2.y + (d2Y / len2) * 2.5;

				// Penumbra projection endpoints
				const proj1X = p1.x + (d1X / len1) * maxDist * 1.35;
				const proj1Y = p1.y + (d1Y / len1) * maxDist * 1.35;
				const proj2X = p2.x + (d2X / len2) * maxDist * 1.35;
				const proj2Y = p2.y + (d2Y / len2) * maxDist * 1.35;

				const gradCenterX = (insetOrigin1X + insetOrigin2X) * 0.5;
				const gradCenterY = (insetOrigin1Y + insetOrigin2Y) * 0.5;
				const gradFarX = (proj1X + proj2X) * 0.5;
				const gradFarY = (proj1Y + proj2Y) * 0.5;

				const shadowGrad = ctx.createLinearGradient(gradCenterX, gradCenterY, gradFarX, gradFarY);
				const maxShadowAlpha = ambientDarkness * 0.92;
				// Soft penumbra start allows organic light wrap at edges
				shadowGrad.addColorStop(0, `rgba(2, 2, 7, ${maxShadowAlpha * 0.15})`);
				shadowGrad.addColorStop(0.12, `rgba(2, 2, 7, ${maxShadowAlpha * 0.75})`);
				shadowGrad.addColorStop(0.50, `rgba(2, 2, 7, ${maxShadowAlpha * 0.95})`);
				shadowGrad.addColorStop(1, `rgba(2, 2, 7, ${maxShadowAlpha})`);

				ctx.fillStyle = shadowGrad;
				ctx.beginPath();
				ctx.moveTo(insetOrigin1X, insetOrigin1Y);
				ctx.lineTo(insetOrigin2X, insetOrigin2Y);
				ctx.lineTo(proj2X, proj2Y);
				ctx.lineTo(proj1X, proj1Y);
				ctx.closePath();
				ctx.fill();
			}
		}
	}

	/**
	 * Renders normal-mapped edge bevel highlights on visible wall tiles.
	 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
	 * @param {DynamicLightSource} light - Target light source emitter.
	 * @param {number} ox - Wall tile screen X pixel coordinate.
	 * @param {number} oy - Wall tile screen Y pixel coordinate.
	 * @param {number} ow - Tile width in pixels.
	 * @param {number} oh - Tile height in pixels.
	 * @returns {void}
	 */
	function drawBeveledWallEdges(ctx, light, ox, oy, ow, oh) {
		if (!ctx || !light) return;
		const { x: lightX, y: lightY, radius: maxDist, color: lightColor } = light;
		const cx = ox + ow * 0.5;
		const cy = oy + oh * 0.5;
		const dx = lightX - cx;
		const dy = lightY - cy;
		const dist = Math.hypot(dx, dy);

		if (dist > maxDist || dist < 1) return;

		const attenuation = Math.max(0, 1 - dist / maxDist);
		const intensity = attenuation * (light.intensity || 0.75) * 0.8;
		ctx.lineWidth = 1.5;

		// North Edge
		if (dy < -oh * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.85})`;
			ctx.beginPath();
			ctx.moveTo(ox, oy);
			ctx.lineTo(ox + ow, oy);
			ctx.stroke();
		}
		// South Edge
		if (dy > oh * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.45})`;
			ctx.beginPath();
			ctx.moveTo(ox, oy + oh);
			ctx.lineTo(ox + ow, oy + oh);
			ctx.stroke();
		}
		// West Edge
		if (dx < -ow * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.75})`;
			ctx.beginPath();
			ctx.moveTo(ox, oy);
			ctx.lineTo(ox, oy + oh);
			ctx.stroke();
		}
		// East Edge
		if (dx > ow * 0.25) {
			ctx.strokeStyle = `rgba(${lightColor}, ${intensity * 0.55})`;
			ctx.beginPath();
			ctx.moveTo(ox + ow, oy);
			ctx.lineTo(ox + ow, oy + oh);
			ctx.stroke();
		}
	}

	const Shadows = Object.freeze({
		castShadowFromOccluder,
		drawBeveledWallEdges,
	});

	if (typeof window !== 'undefined') {
		window._DynamicLightsInternal = window._DynamicLightsInternal || {};
		window._DynamicLightsInternal.Shadows = Shadows;
	}
	if (typeof globalThis !== 'undefined') {
		(/** @type {any} */ (globalThis))._DynamicLightsInternal = (/** @type {any} */ (globalThis))._DynamicLightsInternal || {};
		(/** @type {any} */ (globalThis))._DynamicLightsInternal.Shadows = Shadows;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Shadows;
	}
})();
