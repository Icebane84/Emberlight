/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        EMBERLIGHT PRNG DETERMINISM & DECORRELATION TEST BATTERY         ║
 * ║        Document Identifier: TEST-PRNG-DETERMINISM-001                    ║
 * ║        Protocols: VSRP-001 / AC-04 / AC-05                               ║
 * ║        Authority: Math Kernel / Deterministic Replay Integrity Gate      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const assert = require('node:assert');
const path = require('node:path');
const EmberlightPRNG = require('../prng.js');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║       EMBERLIGHT PRNG DETERMINISM & DECORRELATION SUITE      ║');
console.log('║       Protocols: VSRP-001 / AC-04 / AC-05 / PERSIST-001      ║');
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

/**
 * Computes Pearson correlation coefficient between two numeric arrays.
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number}
 */
function pearsonCorrelation(x, y) {
	const n = x.length;
	let sumX = 0;
	let sumY = 0;
	let sumX2 = 0;
	let sumY2 = 0;
	let sumXY = 0;

	for (let i = 0; i < n; i++) {
		sumX += x[i];
		sumY += y[i];
		sumX2 += x[i] * x[i];
		sumY2 += y[i] * y[i];
		sumXY += x[i] * y[i];
	}

	const numerator = n * sumXY - sumX * sumY;
	const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
	return denominator === 0 ? 0 : numerator / denominator;
}

// ── Vector 1: SplitMix32 Bit Avalanche & Decorrelation ────────────────────────
runTest('Vector 1: SplitMix32 decorrelates consecutive seeds with near-zero Pearson correlation (|r| < 0.05)', () => {
	const stream1 = EmberlightPRNG.create(1);
	const stream2 = EmberlightPRNG.create(2);

	const samples1 = [];
	const samples2 = [];
	for (let i = 0; i < 5000; i++) {
		samples1.push(stream1.nextFloat());
		samples2.push(stream2.nextFloat());
	}

	const r = pearsonCorrelation(samples1, samples2);
	assert.ok(
		Math.abs(r) < 0.05,
		`Pearson correlation between seeds 1 and 2 must be < 0.05, got ${r.toFixed(4)}`
	);
});

// ── Vector 2: Exact Deterministic Replay Parity (AC-04) ───────────────────────
runTest('Vector 2: Identical numeric and string seeds produce bit-exact float sequences', () => {
	const s1 = EmberlightPRNG.create(42817);
	const s2 = EmberlightPRNG.create(42817);

	for (let i = 0; i < 500; i++) {
		assert.strictEqual(s1.nextFloat(), s2.nextFloat(), `Mismatch at iteration ${i}`);
	}

	const str1 = EmberlightPRNG.create('dungeon_floor_07');
	const str2 = EmberlightPRNG.create('dungeon_floor_07');

	for (let i = 0; i < 500; i++) {
		assert.strictEqual(str1.nextFloat(), str2.nextFloat(), `String seed mismatch at iteration ${i}`);
	}
});

// ── Vector 3: State Snapshot & Restoration Fidelity ──────────────────────────
runTest('Vector 3: getState() / setState() round-trip preserves bit-exact continuation', () => {
	const stream = EmberlightPRNG.create(9999);
	for (let i = 0; i < 100; i++) stream.nextFloat();

	const snapshot = stream.getState();
	const referenceValues = [];
	for (let i = 0; i < 100; i++) referenceValues.push(stream.nextFloat());

	// Restore snapshot and re-advance
	stream.setState(snapshot);
	for (let i = 0; i < 100; i++) {
		assert.strictEqual(
			stream.nextFloat(),
			referenceValues[i],
			`State restore mismatch at index ${i}`
		);
	}
});

// ── Vector 4: Salted Forking & Sequence Divergence ────────────────────────────
runTest('Vector 4: fork() advances parent and decorrelates child sequence without collision', () => {
	const parent = EmberlightPRNG.create(777);
	const preState = parent.getState();

	const child = parent.fork('sub_oracle_forecast');
	const postState = parent.getState();

	// Parent state must advance
	assert.notStrictEqual(preState, postState, 'Parent state must advance during fork()');

	// Child and parent future values must diverge immediately
	const parentFuture = [];
	const childFuture = [];
	for (let i = 0; i < 5000; i++) {
		parentFuture.push(parent.nextFloat());
		childFuture.push(child.nextFloat());
	}

	const r = pearsonCorrelation(parentFuture, childFuture);
	assert.ok(
		Math.abs(r) < 0.05,
		`Forked stream correlation must be < 0.05, got ${r.toFixed(4)}`
	);

	// Zero 1:1 collisions in the first 50 values
	let collisions = 0;
	for (let i = 0; i < 50; i++) {
		if (parentFuture[i] === childFuture[i]) collisions++;
	}
	assert.strictEqual(collisions, 0, 'Forked child must not mirror parent future values');
});

// ── Vector 5: clone() Exact State Duplication ─────────────────────────────────
runTest('Vector 5: clone() replicates current state without advancing or altering parent', () => {
	const original = EmberlightPRNG.create(12345);
	for (let i = 0; i < 50; i++) original.nextFloat();

	const originalState = original.getState();
	const clone = original.clone();

	assert.strictEqual(original.getState(), originalState, 'clone() must not advance original state');
	assert.strictEqual(clone.getState(), originalState, 'clone() must inherit exact state');

	for (let i = 0; i < 200; i++) {
		assert.strictEqual(original.nextFloat(), clone.nextFloat(), `Clone diverge at step ${i}`);
	}
});

// ── Vector 6: Scalar Distributions & Collection Sampling ─────────────────────
runTest('Vector 6: nextInt, nextBool, choice, and shuffle conform to bounds and contracts', () => {
	const stream = EmberlightPRNG.create(54321);

	// nextInt bounds check
	let minHit = false;
	let maxHit = false;
	for (let i = 0; i < 2000; i++) {
		const v = stream.nextInt(3, 7);
		assert.ok(v >= 3 && v <= 7, `nextInt out of bounds: ${v}`);
		if (v === 3) minHit = true;
		if (v === 7) maxHit = true;
	}
	assert.ok(minHit && maxHit, 'nextInt must cover both min and max bounds inclusive');

	// nextBool edge bounds
	for (let i = 0; i < 50; i++) {
		assert.strictEqual(stream.nextBool(0.0), false, 'nextBool(0) must always be false');
		assert.strictEqual(stream.nextBool(1.0), true, 'nextBool(1) must always be true');
	}

	// choice sampling
	const items = ['FIRE', 'ICE', 'LIGHTNING', 'AETHER'];
	const picked = stream.choice(items);
	assert.ok(items.includes(picked), `choice picked invalid item: ${picked}`);
	assert.strictEqual(stream.choice([]), undefined, 'choice on empty array returns undefined');

	// shuffle non-mutation
	const originalArray = [1, 2, 3, 4, 5, 6, 7, 8];
	const shuffled = stream.shuffle(originalArray);
	assert.strictEqual(originalArray.length, 8, 'shuffle must not mutate original length');
	assert.strictEqual(originalArray[0], 1, 'shuffle must not mutate original element order');
	assert.strictEqual(shuffled.length, 8, 'shuffled array must have identical length');
	assert.deepStrictEqual(
		[...shuffled].sort((a, b) => a - b),
		originalArray,
		'shuffled array must contain identical elements'
	);
});

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`EMBERLIGHT PRNG DETERMINISM AUDIT: ${passedCount}/${passedCount} CHECKS PASSED`);
console.log('✨ 100% REPLAY DETERMINISM: ZERO ENTROPY CORRELATION DETECTED ✨\n');
