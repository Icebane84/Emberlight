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
 *   [SEC-02] Mulberry32 Mathematical Kernel Step Function
 *   [SEC-03] PRNG Stream Factory & Seed Initialization
 *   [SEC-04] Scalar Distribution Generators (Float, Int, Bool)
 *   [SEC-05] Collection & Sampling Utility Operators
 *   [SEC-06] State Snapshotting, Restoration & Forking Gateways
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
	 * @property {() => PRNGStream} fork - Clones this PRNG stream at its exact current state.
	 */
	//#endregion

	//#region [SEC-02] Mulberry32 Mathematical Kernel Step Function
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
	 * Creates an isolated, deterministic PRNG stream instance.
	 * State-initializing factory procedure.
	 * @param {number | string} [initialSeed=1337] - Numeric or string seed value.
	 * @returns {PRNGStream} Configured deterministic PRNG stream instance.
	 */
	function create(initialSeed = 1337) {
		let currentSeed = 0;
		if (typeof initialSeed === 'string') {
			let hash = 0;
			for (let i = 0; i < initialSeed.length; i++) {
				hash = Math.trunc(Math.imul(31, hash) + (initialSeed.codePointAt(i) || 0));
			}
			currentSeed = hash >>> 0;
		} else {
			currentSeed = (Number(initialSeed) || 1337) >>> 0;
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

			//#region [SEC-06] State Snapshotting, Restoration & Forking Gateways
			/**
			 * Serializes internal state for deterministic snapshotting[cite: 5].
			 * Pure state accessor procedure.
			 * @returns {number} 32-bit unsigned integer seed state.
			 */
			getState() {
				return currentSeed >>> 0;
			},

			/**
			 * Restores internal state[cite: 5].
			 * State-mutating restoration procedure.
			 * @param {number | string} state - Target state seed value.
			 * @returns {void}
			 */
			setState(state) {
				currentSeed = (Number(state) || 0) >>> 0;
			},

			/**
			 * Clones this PRNG stream at its exact current state[cite: 5].
			 * Pure cloning factory procedure.
			 * @returns {PRNGStream} Forked PRNG stream instance.
			 */
			fork() {
				const forked = create(currentSeed);
				return forked;
			},
		};

		return prng;
	}
	//#endregion

	//#region [SEC-07] Module Export & Global Scope Bindings
	return Object.freeze({
		create,
	});
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightPRNG = EmberlightPRNG;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightPRNG;
}