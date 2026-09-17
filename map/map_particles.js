/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MAP ATMOSPHERIC PARTICLES SUB-MODULE
 * Document Identifier: VSRP-001-MAP-PARTICLES
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-MAP-RENDERER-001
 * Authority:           Peripheral Presentation (Tier 3)
 * ============================================================================
 *
 * SECTIONS EXTRACTED:
 *   [SEC-03] Atmosphere Particle Pool & Kinematics (Lines 586–678)
 *
 * STAGING MEMBRANE KEY: window._MapInternal.Particles
 * DEPENDENCIES: None
 * ============================================================================
 */

if (typeof window !== "undefined") window._MapInternal = window._MapInternal || {};
if (typeof globalThis !== "undefined") globalThis._MapInternal = globalThis._MapInternal || {};

(() => {

	//#region [SEC-03] Atmosphere Particle Pool & Kinematics
	const PARTICLE_COUNT = 64;
	const particlePool = new Float32Array(PARTICLE_COUNT * 7);
	let particleNoiseSeed = 1337;

	/**
	 * Generates deterministic pseudorandom floats via LCG algorithm.
	 * State-mutating math utility procedure.
	 *
	 * @returns {number} Normalized float in [0, 1).
	 */
	function nextParticleFloat() {
		particleNoiseSeed = (particleNoiseSeed * 1664525 + 1013904223) >>> 0;
		return particleNoiseSeed / 4294967296;
	}

	/**
	 * Populates particle pool buffers with initial positions and velocities.
	 * State-mutating particle initialization procedure.
	 *
	 * @returns {void}
	 */
	function initParticles() {
		particleNoiseSeed = 1337;
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const idx = i * 7;
			let type = 0;
			if (nextParticleFloat() > 0.6) {
				type = nextParticleFloat() > 0.5 ? 2 : 1;
			}
			particlePool[idx] = (nextParticleFloat() - 0.5) * 600;
			particlePool[idx + 1] = (nextParticleFloat() - 0.5) * 400;
			particlePool[idx + 2] = (nextParticleFloat() - 0.5) * 12;
			particlePool[idx + 3] =
				type === 0
					? -8 - nextParticleFloat() * 10
					: -2 - nextParticleFloat() * 4;
			particlePool[idx + 4] =
				type === 0
					? 1.5 + nextParticleFloat() * 2
					: 1 + nextParticleFloat() * 1.5;
			particlePool[idx + 5] = 0.2 + nextParticleFloat() * 0.6;
			particlePool[idx + 6] = type;
		}
	}

	/**
	 * Advances and renders atmospheric floating dust and ember particles.
	 * State-mutating canvas render procedure.
	 *
	 * @param {CanvasRenderingContext2D | any} renderCtx - Target 2D canvas context.
	 * @param {number} w - Viewport canvas width.
	 * @param {number} h - Viewport canvas height.
	 * @param {number} dt - Elapsed frame delta time in seconds.
	 * @param {number} [globalTime=0] - Global simulation time reference.
	 * @returns {void}
	 */
	function updateAndRenderAtmosphere(renderCtx, w, h, dt, globalTime = 0) {
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const idx = i * 7;
			const type = particlePool[idx + 6];

			const drift = Math.sin(globalTime * 2 + i) * 15 * dt;
			particlePool[idx] += (particlePool[idx + 2] + drift) * dt;
			particlePool[idx + 1] += particlePool[idx + 3] * dt;

			if (particlePool[idx + 1] < -h / 2) {
				particlePool[idx + 1] = h / 2;
				particlePool[idx] = (nextParticleFloat() - 0.5) * w;
			}
			if (particlePool[idx] < -w / 2) particlePool[idx] = w / 2;
			if (particlePool[idx] > w / 2) particlePool[idx] = -w / 2;

			const screenX = w / 2 + particlePool[idx];
			const screenY = h / 2 + particlePool[idx + 1];
			const size = particlePool[idx + 4];

			renderCtx.globalAlpha =
				particlePool[idx + 5] * (0.8 + Math.sin(globalTime * 4 + i) * 0.2);

			if (type === 0) {
				renderCtx.fillStyle = "#f59e0b";
				renderCtx.fillRect(screenX, screenY, size, size);
			} else if (type === 1) {
				renderCtx.fillStyle = "#94a3b8";
				renderCtx.fillRect(screenX, screenY, size * 0.8, size * 0.8);
			} else {
				renderCtx.fillStyle = "#38bdf8";
				renderCtx.beginPath();
				renderCtx.arc(screenX, screenY, size * 0.9, 0, Math.PI * 2);
				renderCtx.fill();
			}
		}
		renderCtx.globalAlpha = 1.0;
	}
	//#endregion

	// ─── Staging Membrane Export ──────────────────────────────────────────────
	const Particles = Object.freeze({
		PARTICLE_COUNT,
		particlePool,
		nextParticleFloat,
		initParticles,
		updateAndRenderAtmosphere,
	});

	if (typeof window !== "undefined") {
		window._MapInternal.Particles = Particles;
	}
	if (typeof globalThis !== "undefined") {
		globalThis._MapInternal.Particles = Particles;
	}
	if (typeof module !== "undefined" && module.exports) {
		module.exports = Particles;
	}
})();
