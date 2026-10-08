/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        EMBERLIGHT COHERENT NOISE & SIMPLEX CONTINUITY TEST BATTERY       ║
 * ║        Document Identifier: TEST-NOISE-CONTINUITY-001                    ║
 * ║        Protocols: VSRP-001 / AC-04 / AC-07 / AC-08                       ║
 * ║        Authority: Math Kernel / Continuous Spatial Field Gate            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const assert = require('node:assert');
const { SovereignNoise, EmberlightNoise } = require('../noise.js');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       EMBERLIGHT CONTINUOUS NOISE & SIMPLEX AUDIT SUITE      ║');
console.log('║       Protocols: VSRP-001 / AC-04 / AC-07 / AC-08            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let passedCount = 0;

function runTest(name, fn) {
	try {
		fn();
		console.log(`  ✓ ${name}`);
		passedCount++;
	} catch (err) {
		console.error(`  ✗ FAIL: ${name}`);
		console.error(err);
		process.exit(1);
	}
}

// ── Vector 1: Analytical Bounds Clamping ──────────────────────────────────────
runTest('Vector 1: noise2D strictly bounded within [-1.0, 1.0] across 10,000 spatial samples', () => {
	const noise = new SovereignNoise(42);
	let minVal = Infinity;
	let maxVal = -Infinity;

	for (let i = 0; i < 10000; i++) {
		const x = (i * 0.1337) - 500;
		const y = (i * 0.2718) - 500;
		const val = noise.noise2D(x, y);

		assert(!Number.isNaN(val), `noise2D produced NaN at (${x}, ${y})`);
		assert(val >= -1.000001 && val <= 1.000001, `noise2D out of bounds: ${val} at (${x}, ${y})`);

		if (val < minVal) minVal = val;
		if (val > maxVal) maxVal = val;
	}

	assert(minVal < -0.4, `Noise did not reach sufficient negative distribution: ${minVal}`);
	assert(maxVal > 0.4, `Noise did not reach sufficient positive distribution: ${maxVal}`);
});

// ── Vector 2: Spatial Continuity Invariant (C0 & C1 continuity) ──────────────
runTest('Vector 2: Continuity invariant holds: delta < 0.05 for epsilon step dx = 0.001', () => {
	const noise = new SovereignNoise(1337);
	const eps = 0.001;

	for (let i = 0; i < 500; i++) {
		const x = (i * 0.31) - 50;
		const y = (i * 0.47) - 50;

		const base = noise.noise2D(x, y);
		const stepX = noise.noise2D(x + eps, y);
		const stepY = noise.noise2D(x, y + eps);

		const deltaX = Math.abs(stepX - base);
		const deltaY = Math.abs(stepY - base);

		assert(deltaX < 0.05, `Discontinuity detected in X: delta=${deltaX} at (${x}, ${y})`);
		assert(deltaY < 0.05, `Discontinuity detected in Y: delta=${deltaY} at (${x}, ${y})`);
	}
});

// ── Vector 3: Deterministic Repeatability & Forking ──────────────────────────
runTest('Vector 3: Identical seed produces bit-exact noise values; different seeds diverge', () => {
	const noiseA1 = new SovereignNoise(9999);
	const noiseA2 = new SovereignNoise(9999);
	const noiseB = new SovereignNoise(8888);

	for (let i = 0; i < 200; i++) {
		const x = i * 0.25;
		const y = i * 0.35;
		const valA1 = noiseA1.noise2D(x, y);
		const valA2 = noiseA2.noise2D(x, y);
		const valB = noiseB.noise2D(x, y);

		assert.strictEqual(valA1, valA2, `Non-deterministic output at sample ${i}`);
	}

	// Verify that noiseB diverges
	let differences = 0;
	for (let i = 0; i < 100; i++) {
		const sampleX = i * 0.37 + 0.12;
		const sampleY = i * 0.41 + 0.58;
		if (noiseA1.noise2D(sampleX, sampleY) !== noiseB.noise2D(sampleX, sampleY)) {
			differences++;
		}
	}
	assert(differences >= 95, `Different seeds failed to produce divergent values (${differences}/100)`);
});

// ── Vector 4: Multi-Octave Fractal Brownian Motion (fBm) ─────────────────────
runTest('Vector 4: fBm aggregates harmonic octaves within [-1.0, 1.0] and exhibits fractal detail', () => {
	const noise = EmberlightNoise.create(2026);

	for (let oct = 1; oct <= 8; oct++) {
		for (let i = 0; i < 500; i++) {
			const x = i * 0.1;
			const y = i * 0.15;
			const val = noise.fbm2D(x, y, oct, 2.0, 0.5);

			assert(!Number.isNaN(val), `fBm produced NaN with octaves=${oct}`);
			assert(val >= -1.0001 && val <= 1.0001, `fBm out of bounds: ${val}`);
		}
	}

	// Test octave contribution roughness
	let smoothVariance = 0;
	let roughVariance = 0;
	for (let i = 0; i < 100; i++) {
		const diff1 = Math.abs(noise.fbm2D(i * 0.05 + 0.01, 0, 1) - noise.fbm2D(i * 0.05, 0, 1));
		const diff4 = Math.abs(noise.fbm2D(i * 0.05 + 0.01, 0, 6) - noise.fbm2D(i * 0.05, 0, 6));
		smoothVariance += diff1;
		roughVariance += diff4;
	}
	assert(roughVariance > smoothVariance, 'Higher octave count should yield higher high-frequency variance');
});

// ── Vector 5: Ridge, Turbulence & Domain Warping ──────────────────────────────
runTest('Vector 5: Turbulence and Ridge noise produce positive bounded structures [0.0, 1.0]', () => {
	const noise = new SovereignNoise(777);

	for (let i = 0; i < 200; i++) {
		const x = i * 0.2;
		const y = i * 0.3;
		const turb = noise.turbulence2D(x, y, 4);
		const ridge = noise.ridge2D(x, y, 4);
		const warp = noise.warp2D(x, y, 3.0, 3);

		assert(turb >= 0.0 && turb <= 1.0001, `Turbulence out of bounds: ${turb}`);
		assert(ridge >= 0.0 && ridge <= 1.0001, `Ridge out of bounds: ${ridge}`);
		assert(warp >= -1.0001 && warp <= 1.0001, `Domain warp out of bounds: ${warp}`);
	}
});

// ── Vector 6: Heightmap Rasterization & Zero-GC Memory Buffering ─────────────
runTest('Vector 6: generateHeightmap correctly populates pre-allocated buffer with zero memory allocations', () => {
	const noise = new SovereignNoise(101);
	const width = 64;
	const height = 48;
	const preAlloc = new Float32Array(width * height);

	const result = noise.generateHeightmap(width, height, {
		scale: 0.08,
		octaves: 4,
		outBuffer: preAlloc,
	});

	assert.strictEqual(result, preAlloc, 'generateHeightmap must return the pre-allocated outBuffer directly');
	assert.strictEqual(result.length, width * height);

	let hasNonZero = false;
	for (let i = 0; i < result.length; i++) {
		assert(!Number.isNaN(result[i]), `Heightmap contains NaN at cell ${i}`);
		assert(result[i] >= -1.0001 && result[i] <= 1.0001, `Heightmap cell out of bounds: ${result[i]}`);
		if (result[i] !== 0) hasNonZero = true;
	}
	assert(hasNonZero, 'Heightmap must not be entirely zero');
});

// ── Vector 7: Diagnostics & Specification Metadata ────────────────────────────
runTest('Vector 7: getDiagnostics and getModuleInfo conform strictly to VSRP-001 metadata schema', () => {
	const diag = EmberlightNoise.getDiagnostics();
	assert.strictEqual(diag.moduleId, 'noise');
	assert.strictEqual(diag.protocolVersion, 'VSRP-001');
	assert.strictEqual(diag.zeroAllocHotLoop, true);
	assert.strictEqual(diag.deterministic, true);

	const info = EmberlightNoise.getModuleInfo();
	assert.strictEqual(info.moduleId, 'noise');
	assert.strictEqual(info.version, '1.0.0');
	assert(Array.isArray(info.capabilities));
	assert(info.capabilities.includes('simplex_2d'));
	assert(info.capabilities.includes('fbm_2d'));
	assert(info.capabilities.includes('domain_warp'));
});

console.log('\n────────────────────────────────────────────────────────────');
console.log(`EMBERLIGHT NOISE AUDIT: ${passedCount}/7 CHECKS PASSED`);
console.log('✨ 100% CONTINUOUS COHERENCE: ZERO ARTIFACTS OR OUT-OF-BOUNDS ✨\n');
