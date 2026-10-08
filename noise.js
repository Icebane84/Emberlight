/* cSpell:words VSRP VLT MPFS lacunarity OpenSimplex unskew unskewed */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: CONTINUOUS VALUE & GRADIENT NOISE SYNTHESIZER
 * Document Identifier: VSRP-001-NOISE
 * Governing Protocol:  PSGC-001 / VLT-003 / MPFS-001 / VSRP-001
 * Authority:           Math Kernel (Tier 4)
 * Timestamp:           2026-10-08T01:15:00Z
 * Index Anchor:        NOISE-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Mathematical Constants & Gradient Tables
 *   [SEC-03] SovereignNoise Class & Permutation Lattice
 *   [SEC-04] Analytical 2D Simplex Noise Kernel
 *   [SEC-05] Fractional Brownian Motion & Multi-Octave Fractal Synthesis
 *   [SEC-06] Domain Warping, Ridge & Turbulence Harmonics
 *   [SEC-07] Discrete Heightmap Exporter & Memory Buffering
 *   [SEC-08] Diagnostics & Telemetry Interface
 *   [SEC-09] Global Environment & Module Export Gateway
 * ============================================================================
 */

//#region [SEC-01] Type Definitions & Contract Schemas

/**
 * @typedef {Object} FBMOptions
 * @property {number} [octaves=4] - Number of harmonic fractal octaves [1 .. 8].
 * @property {number} [lacunarity=2.0] - Frequency step multiplier between octaves.
 * @property {number} [gain=0.5] - Amplitude decay persistence between octaves.
 */

/**
 * @typedef {Object} HeightmapOptions
 * @property {number} [scale=0.05] - Spatial coordinate sampling scale.
 * @property {number} [octaves=4] - Octave count for fractal brownian motion.
 * @property {number} [lacunarity=2.0] - Lacunarity factor.
 * @property {number} [gain=0.5] - Persistence decay factor.
 * @property {Float32Array} [outBuffer] - Optional pre-allocated buffer for zero-allocation generation.
 */

/**
 * @typedef {Object} NoiseModuleDiagnostics
 * @property {string} moduleId - Canonical module identifier.
 * @property {string} protocolVersion - Governing architecture protocol version.
 * @property {string} version - Semantic version string.
 * @property {string} algorithm - Algorithmic pedigree description.
 * @property {boolean} zeroAllocHotLoop - Confirms zero GC allocation in 2D sampling loop.
 * @property {boolean} deterministic - Confirms bit-exact repeatable execution from seed.
 */

//#endregion

//#region [SEC-02] Mathematical Constants & Gradient Tables

/**
 * Simplex 2D skew factor: F2 = 0.5 * (sqrt(3) - 1).
 * Maps square lattice coordinates into equilateral triangular simplex grid.
 * @type {number}
 */
const F2 = 0.3660254037844386;

/**
 * Simplex 2D unskew factor: G2 = (3 - sqrt(3)) / 6.
 * Maps equilateral simplex vertices back into Cartesian coordinate space.
 * @type {number}
 */
const G2 = 0.21132486540518713;

/**
 * Normalization multiplier scaling the peak sum of 2D simplex kernel contributions
 * into the strict analytical range [-1.0, 1.0].
 * @type {number}
 */
const SIMPLEX_NORM_2D = 70.14805770653953;

/**
 * 12 canonical 2D gradient vectors (x-coordinates).
 * @type {Float32Array}
 */
const GRAD2D_X = new Float32Array([1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0]);

/**
 * 12 canonical 2D gradient vectors (y-coordinates).
 * @type {Float32Array}
 */
const GRAD2D_Y = new Float32Array([1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1]);

/**
 * Pure SplitMix32 bit-mixer used to seed the permutation lattice with high avalanche entropy.
 * @param {number} seed - Initial integer seed.
 * @returns {number} 32-bit unsigned mixed integer.
 */
function splitmix32Seed(seed) {
	let z = Math.trunc(seed + 0x9e3779b9);
	z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
	z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
	return (z ^ (z >>> 15)) >>> 0;
}

//#endregion

//#region [SEC-03] SovereignNoise Class & Permutation Lattice

/**
 * Zero-dependency, deterministic 2D Simplex and Coherent Gradient Noise engine.
 * Implements continuous coordinate evaluation, Fractal Brownian Motion (fBm),
 * domain warping, ridge synthesis, and procedural heightmap rasterization.
 */
class SovereignNoise {
	/**
	 * Instantiates a sovereign coherent noise generator with a deterministic seed.
	 * @param {number|string} [seed=1337] - Numeric or string seed value.
	 */
	constructor(seed = 1337) {
		/** @type {Uint8Array} */
		this.perm = new Uint8Array(512);
		/** @type {Uint8Array} */
		this.permMod12 = new Uint8Array(512);
		/** @type {number} */
		this.seed = 0;
		this.reseed(seed);
	}

	/**
	 * Re-initializes the 512-entry permutation lattice using SplitMix32 decorrelation.
	 * [State Mutating]
	 * @param {number|string} seed - Input seed value.
	 * @returns {void}
	 */
	reseed(seed) {
		let numSeed = 0;
		if (typeof seed === 'string') {
			let h = 0;
			for (let i = 0; i < seed.length; i++) {
				h = Math.trunc(Math.imul(31, h) + (seed.codePointAt(i) || 0));
			}
			numSeed = h >>> 0;
		} else {
			numSeed = (Number(seed) || 0) >>> 0;
		}
		this.seed = numSeed;

		// Fisher-Yates shuffle over 256 byte entries
		const source = new Uint8Array(256);
		for (let i = 0; i < 256; i++) {
			source[i] = i;
		}

		let rngState = splitmix32Seed(numSeed);
		for (let i = 255; i > 0; i--) {
			rngState = Math.trunc(rngState + 0x6d2b79f5);
			let t = Math.imul(rngState ^ (rngState >>> 15), rngState | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			const rnd = ((t ^ (t >>> 14)) >>> 0) % (i + 1);

			const tmp = source[i];
			source[i] = source[rnd];
			source[rnd] = tmp;
		}

		// Duplicate array across 512 entries to avoid modulo wraparound in inner loop
		for (let i = 0; i < 256; i++) {
			const val = source[i];
			this.perm[i] = val;
			this.perm[i + 256] = val;
			const mod12 = val % 12;
			this.permMod12[i] = mod12;
			this.permMod12[i + 256] = mod12;
		}
	}

	//#endregion

	//#region [SEC-04] Analytical 2D Simplex Noise Kernel

	/**
	 * Evaluates continuous 2D Simplex noise at coordinate (x, y).
	 * Operates with O(1) time complexity, zero heap allocation, and strict bounds [-1.0, 1.0].
	 * @param {number} x - Horizontal coordinate.
	 * @param {number} y - Vertical coordinate.
	 * @returns {number} Continuous noise value in range [-1.0, 1.0].
	 */
	noise2D(x, y) {
		// Skew input coordinate space to determine containing simplex cell
		const s = (x + y) * F2;
		const i = Math.floor(x + s);
		const j = Math.floor(y + s);

		// Unskew cell origin back to Cartesian space
		const t = (i + j) * G2;
		const x0 = x - (i - t);
		const y0 = y - (j - t);

		// Determine simplex traversal traversal order: upper or lower triangle
		let i1 = 0;
		let j1 = 1;
		if (x0 > y0) {
			i1 = 1;
			j1 = 0;
		}

		// Calculate coordinate offsets for remaining two triangle corners
		const x1 = x0 - i1 + G2;
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1.0 + 2.0 * G2;
		const y2 = y0 - 1.0 + 2.0 * G2;

		// Hash corner coordinates through wrapped permutation lookup
		const ii = i & 255;
		const jj = j & 255;
		const gi0 = this.permMod12[ii + this.perm[jj]];
		const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
		const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

		// Calculate corner 0 contribution
		let n0 = 0.0;
		let t0 = 0.5 - x0 * x0 - y0 * y0;
		if (t0 > 0) {
			t0 *= t0;
			n0 = t0 * t0 * (GRAD2D_X[gi0] * x0 + GRAD2D_Y[gi0] * y0);
		}

		// Calculate corner 1 contribution
		let n1 = 0.0;
		let t1 = 0.5 - x1 * x1 - y1 * y1;
		if (t1 > 0) {
			t1 *= t1;
			n1 = t1 * t1 * (GRAD2D_X[gi1] * x1 + GRAD2D_Y[gi1] * y1);
		}

		// Calculate corner 2 contribution
		let n2 = 0.0;
		let t2 = 0.5 - x2 * x2 - y2 * y2;
		if (t2 > 0) {
			t2 *= t2;
			n2 = t2 * t2 * (GRAD2D_X[gi2] * x2 + GRAD2D_Y[gi2] * y2);
		}

		// Normalize sum to [-1.0, 1.0]
		return SIMPLEX_NORM_2D * (n0 + n1 + n2);
	}

	//#endregion

	//#region [SEC-05] Fractional Brownian Motion & Multi-Octave Fractal Synthesis

	/**
	 * Synthesizes multi-octave Fractional Brownian Motion (fBm) continuous field.
	 * Aggregates successive harmonic octaves with geometrically decaying amplitudes.
	 * @param {number} x - Horizontal coordinate.
	 * @param {number} y - Vertical coordinate.
	 * @param {number} [octaves=4] - Octave accumulation count [1 .. 8].
	 * @param {number} [lacunarity=2.0] - Frequency magnification factor per octave.
	 * @param {number} [gain=0.5] - Persistence amplitude factor per octave.
	 * @returns {number} Normalized fractal noise value in range [-1.0, 1.0].
	 */
	fbm2D(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
		const oct = Math.max(1, Math.min(8, Math.trunc(octaves)));
		let total = 0.0;
		let frequency = 1.0;
		let amplitude = 1.0;
		let maxAmp = 0.0;

		for (let i = 0; i < oct; i++) {
			total += this.noise2D(x * frequency, y * frequency) * amplitude;
			maxAmp += amplitude;
			frequency *= lacunarity;
			amplitude *= gain;
		}

		return maxAmp > 0 ? total / maxAmp : 0;
	}

	//#endregion

	//#region [SEC-06] Domain Warping, Ridge & Turbulence Harmonics

	/**
	 * Generates a turbulent billow noise field by accumulating absolute noise values.
	 * Produces sharp crests and billowy cloud/smoke patterns.
	 * @param {number} x - Horizontal coordinate.
	 * @param {number} y - Vertical coordinate.
	 * @param {number} [octaves=4] - Octave count.
	 * @param {number} [lacunarity=2.0] - Frequency step factor.
	 * @param {number} [gain=0.5] - Amplitude decay factor.
	 * @returns {number} Turbulence value in range [0.0, 1.0].
	 */
	turbulence2D(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
		const oct = Math.max(1, Math.min(8, Math.trunc(octaves)));
		let total = 0.0;
		let frequency = 1.0;
		let amplitude = 1.0;
		let maxAmp = 0.0;

		for (let i = 0; i < oct; i++) {
			total += Math.abs(this.noise2D(x * frequency, y * frequency)) * amplitude;
			maxAmp += amplitude;
			frequency *= lacunarity;
			amplitude *= gain;
		}

		return maxAmp > 0 ? total / maxAmp : 0;
	}

	/**
	 * Generates a ridge multi-fractal noise field with inverted sharp mountain crests.
	 * Modeled via (1.0 - |noise|)^2 harmonic synthesis.
	 * @param {number} x - Horizontal coordinate.
	 * @param {number} y - Vertical coordinate.
	 * @param {number} [octaves=4] - Octave count.
	 * @param {number} [lacunarity=2.0] - Frequency step factor.
	 * @param {number} [gain=0.5] - Amplitude decay factor.
	 * @returns {number} Ridge value in range [0.0, 1.0].
	 */
	ridge2D(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
		const oct = Math.max(1, Math.min(8, Math.trunc(octaves)));
		let total = 0.0;
		let frequency = 1.0;
		let amplitude = 1.0;
		let maxAmp = 0.0;

		for (let i = 0; i < oct; i++) {
			let n = 1.0 - Math.abs(this.noise2D(x * frequency, y * frequency));
			n *= n;
			total += n * amplitude;
			maxAmp += amplitude;
			frequency *= lacunarity;
			amplitude *= gain;
		}

		return maxAmp > 0 ? total / maxAmp : 0;
	}

	/**
	 * Evaluates domain-warped fractal noise (Inigo Quilez demoscene formulation).
	 * Distorts the coordinate domain via recursive fBm offset vectors to create swirling fluid dynamics.
	 * @param {number} x - Horizontal coordinate.
	 * @param {number} y - Vertical coordinate.
	 * @param {number} [strength=4.0] - Distortion displacement factor.
	 * @param {number} [octaves=4] - Number of octaves.
	 * @returns {number} Warped noise value in range [-1.0, 1.0].
	 */
	warp2D(x, y, strength = 4.0, octaves = 4) {
		const qx = this.fbm2D(x, y, octaves);
		const qy = this.fbm2D(x + 5.2, y + 1.3, octaves);

		const rx = this.fbm2D(x + strength * qx + 1.7, y + strength * qy + 9.2, octaves);
		const ry = this.fbm2D(x + strength * qx + 8.3, y + strength * qy + 2.8, octaves);

		return this.fbm2D(x + strength * rx, y + strength * ry, octaves);
	}

	//#endregion

	//#region [SEC-07] Discrete Heightmap Exporter & Memory Buffering

	/**
	 * Generates a discrete 2D heightmap matrix into a flat Float32Array.
	 * @param {number} width - Grid width in cells.
	 * @param {number} height - Grid height in cells.
	 * @param {HeightmapOptions} [options={}] - Sampling configuration.
	 * @returns {Float32Array} Row-major float buffer containing normalized values [-1.0, 1.0].
	 */
	generateHeightmap(width, height, options = {}) {
		const w = Math.max(1, Math.trunc(width));
		const h = Math.max(1, Math.trunc(height));
		const size = w * h;
		const out = (options.outBuffer && options.outBuffer.length >= size)
			? options.outBuffer
			: new Float32Array(size);

		const scale = Number(options.scale) || 0.05;
		const octaves = options.octaves !== undefined ? options.octaves : 4;
		const lacunarity = options.lacunarity !== undefined ? options.lacunarity : 2.0;
		const gain = options.gain !== undefined ? options.gain : 0.5;

		let ptr = 0;
		for (let y = 0; y < h; y++) {
			const sampleY = y * scale;
			for (let x = 0; x < w; x++) {
				const sampleX = x * scale;
				out[ptr++] = this.fbm2D(sampleX, sampleY, octaves, lacunarity, gain);
			}
		}

		return out;
	}
}

//#endregion

//#region [SEC-08] Diagnostics & Telemetry Interface

/**
 * Public facade and factory for SovereignNoise.
 */
const EmberlightNoise = Object.freeze({
	/**
	 * Creates a new SovereignNoise instance initialized with the specified seed.
	 * @param {number|string} [seed=1337] - Seed value.
	 * @returns {SovereignNoise} Instantiated noise engine.
	 */
	create(seed = 1337) {
		return new SovereignNoise(seed);
	},

	/**
	 * Class constructor reference.
	 * @type {typeof SovereignNoise}
	 */
	SovereignNoise,

	/**
	 * Engine diagnostic metadata reporter for Sentinel audit and performance telemetry.
	 * @returns {NoiseModuleDiagnostics} Telemetry report.
	 */
	getDiagnostics() {
		return {
			moduleId: 'noise',
			protocolVersion: 'VSRP-001',
			version: '1.0.0',
			algorithm: 'Simplex2D / OpenSimplex Gradient Lattice with fBm (Spencer 2014 / Perlin 2001)',
			zeroAllocHotLoop: true,
			deterministic: true,
		};
	},

	/**
	 * Returns module capabilities and specification metadata.
	 * @returns {{ moduleId: string, version: string, protocolVersion: string, capabilities: string[] }} Module manifest.
	 */
	getModuleInfo() {
		return {
			moduleId: 'noise',
			version: '1.0.0',
			protocolVersion: 'VSRP-001',
			capabilities: [
				'simplex_2d',
				'fbm_2d',
				'ridge_2d',
				'turbulence_2d',
				'domain_warp',
				'heightmap_generator',
				'deterministic_permutation_lattice',
				'zero_alloc_hot_loop',
			],
		};
	},
});

//#endregion

//#region [SEC-09] Global Environment & Module Export Gateway

if (typeof window !== 'undefined') {
	const win = /** @type {any} */ (window);
	win.SovereignNoise = SovereignNoise;
	win.EmberlightNoise = EmberlightNoise;
}

((g) => {
	if (!g) return;
	const target = /** @type {any} */ (g);
	target.SovereignNoise = SovereignNoise;
	target.EmberlightNoise = EmberlightNoise;
})(typeof globalThis !== 'undefined' ? globalThis : null);

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		SovereignNoise,
		EmberlightNoise,
	};
}

//#endregion
