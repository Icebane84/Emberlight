/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: EMBERLIGHT DETERMINISTIC PRNG STREAM KERNEL
 * Document Identifier: PRNG-KERNEL-001
 * Governing Protocol:  VSRP-001
 * Authority:           Math Kernel
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] SplitMix32 & Mulberry32 Mathematical Kernels
 *   [SEC-03] PRNG Stream Factory & Seed Initialization
 *   [SEC-04] Scalar Distribution Generators (Float, Int, Bool)
 *   [SEC-05] Collection & Sampling Utility Operators
 *   [SEC-06] State Snapshotting, Restoration, Cloning & Forking
 *   [SEC-07] Module Export & Global Scope Bindings
 * ============================================================================
 */

const EmberlightPRNG = (() => {
	//#region [SEC-01] Type Definitions & Contract Schemas
	/**
	 * @typedef {Object} Mulberry32StepResult
	 * @property {number} value - Generated pseudo-random float value in [0, 1).
	 * @property {number} nextState - Updated 32-bit unsigned integer state.
	 */

	/**
	 * @typedef {Object} PRNGStream
	 * @property {() => number} nextFloat - Returns a deterministic float in [0, 1).
	 * @property {(min: number, max: number) => number} nextInt - Returns a deterministic integer in [min, max] inclusive.
	 * @property {(p?: number) => boolean} nextBool - Returns a deterministic boolean with given probability of true.
	 * @property {<T>(arr: T[]) => T | undefined} choice - Deterministically picks an element from an array.
	 * @property {<T>(arr: T[]) => T[]} shuffle - Returns a deterministic copy of the array shuffled.
	 * @property {() => number} getState - Serializes internal state for deterministic snapshotting.
	 * @property {(state: number | string) => void} setState - Restores internal state.
	 * @property {(salt?: number | string) => PRNGStream} fork - Forks an isolated, decorrelated child PRNG stream.
	 * @property {() => PRNGStream} clone - Clones this PRNG stream at its exact current state.
	 */
	//#endregion

	//#region [SEC-02] SplitMix32 & Mulberry32 Mathematical Kernels
	/**
	 * Pure SplitMix32 single-step bit-mixing decorrelator.
	 * Passes an integer seed through high-avalanche mixing to decorrelate
	 * low-entropy sequential inputs (e.g., consecutive floor/room/frame seeds).
	 * @param {number} seed - Input 32-bit integer seed value.
	 * @returns {number} High-entropy 32-bit unsigned integer.
	 */
	function splitmix32(seed) {
		let z = Math.trunc(seed + 0x9E3779B9);
		z = Math.imul(z ^ (z >>> 16), 0x21F0AAAD);
		z = Math.imul(z ^ (z >>> 15), 0x735A2D97);
		return ((z ^ (z >>> 15)) >>> 0);
	}

	/**
	 * Internal pure Mulberry32 single-step generator.
	 * State is a 32-bit unsigned integer.
	 * Pure mathematical step procedure.
	 * @param {number} state - Current 32-bit unsigned integer state value.
	 * @returns {Mulberry32StepResult} Object containing the generated value and next state.
	 */
	function mulberry32Step(state) {
		let z = Math.trunc(state + 0x6D2B79F5);
		z = Math.imul(z ^ (z >>> 15), z | 1);
		z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
		const nextState = Math.trunc(state + 0x6D2B79F5);
		const value = ((z ^ (z >>> 14)) >>> 0) / 4294967296;
		return { value, nextState };
	}
	//#endregion

	//#region [SEC-03] PRNG Stream Factory & Seed Initialization
	/**
	 * Computes a 32-bit integer hash from a string seed.
	 * @param {string} str - Input seed string.
	 * @returns {number} 32-bit unsigned hash.
	 */
	function hashStringSeed(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = Math.trunc(Math.imul(31, hash) + (str.codePointAt(i) || 0));
		}
		return hash >>> 0;
	}

	/**
	 * Creates an isolated, deterministic PRNG stream instance.
	 * State-initializing factory procedure with SplitMix32 decorrelation.
	 * @param {number | string} [initialSeed=1337] - Numeric or string seed value.
	 * @returns {PRNGStream} Configured deterministic PRNG stream instance.
	 */
	function create(initialSeed = 1337) {
		let currentSeed = 0;
		if (typeof initialSeed === 'string') {
			const hash = hashStringSeed(initialSeed);
			currentSeed = splitmix32(hash);
		} else {
			const rawSeed = initialSeed === 0 ? 0 : ((Number(initialSeed) || 1337) >>> 0);
			currentSeed = splitmix32(rawSeed);
		}

		const prng = {
			//#endregion

			//#region [SEC-04] Scalar Distribution Generators (Float, Int, Bool)
			/**
			 * Returns a deterministic float in [0, 1).
			 * State-mutating stream generator procedure.
			 * @returns {number} Pseudo-random float value.
			 */
			nextFloat() {
				const step = mulberry32Step(currentSeed);
				currentSeed = step.nextState;
				return step.value;
			},

			/**
			 * Returns a deterministic integer in [min, max] inclusive.
			 * State-mutating stream generator procedure.
			 * @param {number} min - Minimum integer bound (inclusive).
			 * @param {number} max - Maximum integer bound (inclusive).
			 * @returns {number} Pseudo-random integer value.
			 */
			nextInt(min, max) {
				const f = this.nextFloat();
				const low = Math.ceil(min);
				const high = Math.floor(max);
				return Math.floor(f * (high - low + 1)) + low;
			},

			/**
			 * Returns a deterministic boolean with given probability of true.
			 * State-mutating stream generator procedure.
			 * @param {number} [probability=0.5] - Probability threshold for true (0.0 to 1.0).
			 * @returns {boolean} Pseudo-random boolean value.
			 */
			nextBool(probability = 0.5) {
				return this.nextFloat() < probability;
			},
			//#endregion

			//#region [SEC-05] Collection & Sampling Utility Operators
			/**
			 * Deterministically picks an element from an array.
			 * State-mutating sampling procedure.
			 * @template T
			 * @param {T[]} array - Source array items.
			 * @returns {T | undefined} Randomly selected element or undefined if empty.
			 */
			choice(array) {
				if (!Array.isArray(array) || array.length === 0) return undefined;
				const idx = this.nextInt(0, array.length - 1);
				return array[idx];
			},

			/**
			 * Returns a deterministic copy of the array shuffled (Fisher-Yates)[cite: 5].
			 * State-mutating array shuffling procedure.
			 * @template T
			 * @param {T[]} array - Source array items.
			 * @returns {T[]} New shuffled array copy.
			 */
			shuffle(array) {
				if (!Array.isArray(array)) return [];
				const copy = [...array];
				for (let i = copy.length - 1; i > 0; i--) {
					const j = this.nextInt(0, i);
					const temp = copy[i];
					copy[i] = copy[j];
					copy[j] = temp;
				}
				return copy;
			},
			//#endregion

			//#region [SEC-06] State Snapshotting, Restoration, Cloning & Forking
			/**
			 * Serializes internal state for deterministic snapshotting[cite: 5].
			 * Pure state accessor procedure.
			 * @returns {number} 32-bit unsigned integer seed state.
			 */
			getState() {
				return currentSeed >>> 0;
			},

			/**
			 * Restores internal state directly without additional bit-mixing.
			 * State-mutating restoration procedure.
			 * @param {number | string} state - Target state seed value.
			 * @returns {void}
			 */
			setState(state) {
				currentSeed = (Number(state) || 0) >>> 0;
			},

			/**
			 * Clones this PRNG stream at its exact current state without advancing parent.
			 * Pure cloning factory procedure.
			 * @returns {PRNGStream} Cloned PRNG stream instance with identical state.
			 */
			clone() {
				const cloned = create(1337);
				cloned.setState(currentSeed);
				return cloned;
			},

			/**
			 * Forks this PRNG stream into an isolated, decorrelated child stream.
			 * Advances the parent stream state by one step and mixes the parent
			 * state with a golden-ratio salt (or custom salt) via SplitMix32,
			 * guaranteeing that the parent and child sequences diverge immediately
			 * without future value mirroring.
			 * @param {number | string} [salt=0x9E3779B9] - Optional branching salt.
			 * @returns {PRNGStream} Forked, decorrelated child PRNG stream instance.
			 */
			fork(salt = 0x9E3779B9) {
				const parentStep = mulberry32Step(currentSeed);
				currentSeed = parentStep.nextState;

				const saltVal = typeof salt === 'string'
					? hashStringSeed(salt)
					: (Number(salt) || 0x9E3779B9) >>> 0;

				const childSeed = splitmix32(Math.trunc(parentStep.nextState ^ saltVal));
				const child = create(1337);
				child.setState(childSeed);
				return child;
			},
		};

		return prng;
	}
	//#endregion

	//#region [SEC-07] Module Export & Global Scope Bindings
	return Object.freeze({
		create,
		splitmix32,
		mulberry32Step,
	});
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightPRNG = EmberlightPRNG;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightPRNG;
}