/* =========================================================================
   EMBERLIGHT DETERMINISTIC PRNG STREAM KERNEL
   -------------------------------------------------------------------------
   Document Identifier: PRNG-KERNEL-001
   Classification:      Tier 4 Pure Procedural Math Kernel
   Parent Standard:     VSRP-001 / ARCH-001 / PRS-001
   Algorithm:           Mulberry32 (32-bit high-entropy deterministic PRNG)
   ========================================================================= */

const EmberlightPRNG = (() => {
	"use strict";

  /**
   * Internal pure Mulberry32 single-step generator.
   * State is a 32-bit unsigned integer.
   */
  function mulberry32Step(state) {
    let z = Math.trunc(state + 0x6D2B79F5);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    const nextState = Math.trunc(state + 0x6D2B79F5);
    const value = ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    return { value, nextState };
  }

  /**
   * Creates an isolated, deterministic PRNG stream instance.
   * @param {number|string} initialSeed - Numeric or string seed value.
   */
  function create(initialSeed = 1337) {
    let currentSeed = 0;
    if (typeof initialSeed === 'string') {
      let hash = 0;
      for (let i = 0; i < initialSeed.length; i++) {
        hash = Math.trunc(Math.imul(31, hash) + initialSeed.codePointAt(i));
      }
      currentSeed = hash >>> 0;
    } else {
      currentSeed = (Number(initialSeed) || 1337) >>> 0;
    }

    const prng = {
      /**
       * Returns a deterministic float in [0, 1).
       */
      nextFloat() {
        const step = mulberry32Step(currentSeed);
        currentSeed = step.nextState;
        return step.value;
      },

      /**
       * Returns a deterministic integer in [min, max] inclusive.
       */
      nextInt(min, max) {
        const f = this.nextFloat();
        const low = Math.ceil(min);
        const high = Math.floor(max);
        return Math.floor(f * (high - low + 1)) + low;
      },

      /**
       * Returns a deterministic boolean with given probability of true.
       */
      nextBool(probability = 0.5) {
        return this.nextFloat() < probability;
      },

      /**
       * Deterministically picks an element from an array.
       */
      choice(array) {
        if (!Array.isArray(array) || array.length === 0) return undefined;
        const idx = this.nextInt(0, array.length - 1);
        return array[idx];
      },

      /**
       * Returns a deterministic copy of the array shuffled (Fisher-Yates).
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

      /**
       * Serializes internal state for deterministic snapshotting.
       */
      getState() {
        return currentSeed >>> 0;
      },

      /**
       * Restores internal state.
       */
      setState(state) {
        currentSeed = (Number(state) || 0) >>> 0;
      },

      /**
       * Clones this PRNG stream at its exact current state.
       */
      fork() {
        const forked = create(currentSeed);
        return forked;
      },
    };

    return prng;
  }

  return Object.freeze({
    create,
  });
})();

if (typeof window !== 'undefined') {
  window.EmberlightPRNG = EmberlightPRNG;
}
