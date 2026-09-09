/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DETERMINISTIC STREAM SEED KERNEL
 * Document Identifier: VSRP-001-PRNG
 * Governing Protocol:  VSRP-001 / AC-04 / AC-05
 * Authority:           Authoritative Mulberry32 32-bit PRNG Stream Forking
 * ============================================================================
 */

const EmberlightPRNG = (() => {
	const MODULE_INFO = Object.freeze({
		moduleId: "prng_stream_kernel",
		version: "3.0.0",
		protocolVersion: "VSRP-001",
		capabilities: ["seeded_determinism", "stream_forking", "relic_calculus"],
	});

	/**
	 * Factory function spinning up an isolated 32-bit state sequence context instance.
	 * Pure internal execution generator framework.
	 */
	function createStreamInstance(initialSeed) {
		let state = initialSeed | 0; // Enforce explicit 32-bit signed integer boundary constraint

		/**
		 * Core 32-bit Mulberry32 algorithm.
		 */
		function nextFloat() {
			state = (state + 0x6d2b79f5) | 0;
			let z = state;
			z = Math.imul(z ^ (z >>> 15), z | 1);
			z = (z + Math.imul(z ^ (z >>> 7), z | 61)) | 0;
			return ((z ^ (z >>> 14)) >>> 0) / 4294967296.0;
		}

		return {
			nextFloat,
			nextInt(min, max) {
				return Math.floor(nextFloat() * (max - min + 1)) + min;
			},
			choice(array) {
				if (!array || array.length === 0) return null;
				return array[Math.floor(nextFloat() * array.length)];
			},
			getState() {
				return state;
			},
			setState(s) {
				state = s | 0;
			},

			/**
			 * Branches the generator out into an isolated child stream.
			 * Utilizes current sequence state to generate a deterministic seed branch value.
			 */
			fork() {
				const branchedSeed = Math.trunc(nextFloat() * 4294967296.0);
				return createStreamInstance(branchedSeed);
			},
		};
	}

	// Auth state engine singleton wrapper tracking active operational streams
	let masterStream = createStreamInstance(1337);

	return {
		getModuleInfo() {
			return MODULE_INFO;
		},
		configure(config) {
			if (config.seed !== undefined) {
				masterStream = createStreamInstance(config.seed);
			}
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		init(context) { },
		reset(snapshot) {
			const TargetSeed =
				snapshot && snapshot.masterSeed ? snapshot.masterSeed : 1337;
			masterStream = createStreamInstance(TargetSeed);
		},

		update(dt) { },
		render() { },

		// Proxy core accessor mapping targeting master sequence line
		nextFloat() {
			return masterStream.nextFloat();
		},
		nextInt(min, max) {
			return masterStream.nextInt(min, max);
		},
		choice(arr) {
			return masterStream.choice(arr);
		},

		/**
		 * Exposes direct sub-stream branch capability.
		 */
		fork(customSeed) {
			if (customSeed !== undefined) {
				return createStreamInstance(customSeed);
			}
			return masterStream.fork();
		},

		/**
		 * Calculates deterministic relic item drop suffixes and matrix values
		 * using a branched child stream to protect the master loop.
		 */
		calculateDeterministicRelicDrop(relicBaseId, zoneSeed) {
			// 1. Fork specific generation sequence branch
			const dropStream = createStreamInstance(zoneSeed);

			const suffixes = [
				"OF THE EMBER",
				"OF THE TIDE",
				"OF LUMEN CRYSTAL",
				"OF THE ABYSSAL VOID",
			];
			const chosenSuffix = dropStream.choice(suffixes);

			// 2. Compute randomized attributes using isolated stream
			const powerRating = dropStream.nextInt(5, 25);
			const critMultiplier = parseFloat(
				(1.1 + dropStream.nextFloat() * 0.4).toFixed(2),
			);

			return Object.freeze({
				id: `${relicBaseId}_PROCEDURAL_${zoneSeed}`,
				label: `${relicBaseId.replace("_", " ")} ${chosenSuffix}`,
				modifiers: {
					atk: powerRating,
					critMult: critMultiplier,
				},
			});
		},

		getState() {
			return Object.freeze({ masterStreamState: masterStream.getState() });
		},

		getDiagnostics() {
			return { masterSeedLineActive: true };
		},
		destroy() { },
	};
})();

if (typeof window !== "undefined") window.EmberlightPRNG = EmberlightPRNG;
