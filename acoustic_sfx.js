/* cSpell:words EMBERLIGHT Emberlight overworld Overworld debuff DEBUFF lockpick */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: SPATIAL AUDIO & CONVOLUTION REVERB DSP ENGINE
 * Document Identifier: VSRP-001-ACOUSTIC-SFX
 * Governing Protocol:  VSRP-001 / ARCH-GAP-ANALYSIS-001 / AC-09
 * Authority:           Peripheral Audio Synthesis & Idempotent Teardown
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Module State, Type Definitions & Acoustic Zone Profiles
 *   [SEC-02] AudioContext Guards, Dynamics Compression & Gesture Gateway
 *   [SEC-03] Convolution Engine & Algorithmic Impulse Baking
 *   [SEC-04] Procedural Synthesis Generators (Tones, Filtered Noise, FM Synthesis)
 *   [SEC-05] Canonical SFX Waveform Registry & Kinetic Profiles
 *   [SEC-06] Spatial Kinematics & Panning Calculators
 *   [SEC-07] Peripheral Driver Interface, Lifecycle & EventBus Arbitration
 *   [SEC-08] Global Export & Dual-Binding Registration
 * ============================================================================
 */

const EmberlightAcousticSFX = (() => {
	//#region [SEC-01] Module State, Type Definitions & Acoustic Zone Profiles
	const MODULE_INFO = Object.freeze({
		moduleId: "acoustic_sfx",
		version: "5.2.0",
		protocolVersion: "VSRP-001",
		capabilities: [
			"convolution_reverb",
			"spatial_panning",
			"parametric_sfx",
			"noise_synthesis",
			"dynamics_compression",
			"fm_synthesis",
			"idempotent_teardown",
		],
	});

	/**
	 * Canonical acoustic environment zone keys.
	 * @typedef {'MEADOW' | 'TOWN' | 'CRYPT' | string} ZoneKey
	 */

	/**
	 * Acoustic impulse profile configuration.
	 * @typedef {Object} ZoneProfile
	 * @property {number} dry - Direct signal gain coefficient in [0, 1].
	 * @property {number} wet - Convolved reverberant signal gain coefficient in [0, 1].
	 * @property {number} decay - Reverb duration decay time in seconds.
	 * @property {number} power - Exponential decay curve steepness power factor.
	 */

	/**
	 * Health and telemetry diagnostic descriptor for the acoustic subsystem.
	 * @typedef {Object} AcousticDiagnostics
	 * @property {'acoustic_sfx_driver'} serviceId - Registered service identity.
	 * @property {string} contextState - Active AudioContext state ('running' | 'suspended' | 'uninitialized').
	 * @property {ZoneKey} activeZone - Active acoustic profile zone.
	 * @property {boolean} userUnlocked - Autoplay gesture unlock flag.
	 * @property {boolean} isMuted - Global master mute flag.
	 * @property {number} masterVolume - Master output gain multiplier [0.0, 1.0].
	 * @property {boolean} limiterActive - Whether dynamics compressor node is active.
	 * @property {number} activeNodeCount - Currently active playing oscillator/noise nodes.
	 * @property {number} dryLevel - Active dry bus gain level.
	 * @property {number} wetLevel - Active convolution wet bus gain level.
	 */

	/**
	 * Event payload for generic audio and cue broadcasts.
	 * @typedef {Object} GenericSfxPayload
	 * @property {string} [sfx] - Primary SFX identifier key.
	 * @property {string} [cue] - Fallback acoustic cue token.
	 * @property {number} [pan] - Stereo panning offset in [-1.0, 1.0].
	 */

	/**
	 * Event payload for combat-specific audio events.
	 * @typedef {Object} CombatSfxPayload
	 * @property {string} [sfx] - Combat SFX identifier key.
	 * @property {'party' | 'enemy' | string} [targetType] - Target affiliation wing.
	 * @property {number} [targetIndex] - Target entity slot index.
	 */

	/**
	 * Event payload for overworld movement steps.
	 * @typedef {Object} OverworldStepPayload
	 * @property {Object} [pos] - Grid coordinate descriptor.
	 * @property {number} pos.x - Horizontal map grid position.
	 * @property {number} pos.y - Vertical map grid position.
	 * @property {number} [pos.depth] - Subterranean dungeon depth layer.
	 * @property {boolean} [pos.inTown] - Town settlement safety flag.
	 * @property {number} [mapWidth] - Total map tile width for panning calculations.
	 */

	/**
	 * Event payload for administrative system commands.
	 * @typedef {Object} SystemCommandPayload
	 * @property {string} [command] - System command token (e.g., 'TOGGLE_MUTE', 'SET_VOLUME').
	 * @property {number} [value] - Numeric argument for command.
	 */

	/**
	 * Synchronous EventBus consumer contract.
	 * @typedef {Object} EventBusSubscriber
	 * @property {(event: string, handler: (payload?: any) => void) => (() => void)} subscribe - Bus listener registry.
	 * @property {(event: string, payload?: any) => void} [publish] - Bus event broadcaster.
	 */

	/**
	 * Host context dictionary or direct EventBus handle injected on initialization.
	 * @typedef {EventBusSubscriber | { eventBus?: EventBusSubscriber }} AcousticContext
	 */

	/** @type {AudioContext | null} */
	let ctx = null;
	let isMuted = false;
	let masterVolume = 1.0;

	/** @type {GainNode | null} */
	let masterGain = null;
	/** @type {DynamicsCompressorNode | null} */
	let compressorNode = null;
	/** @type {GainNode | null} */
	let dryBus = null;
	/** @type {GainNode | null} */
	let wetBus = null;
	/** @type {ConvolverNode | null} */
	let convolverNode = null;

	let userHasInteracted = false;
	/** @type {ZoneKey} */
	let currentZone = "MEADOW";
	let stepFootToggle = false;
	let noiseSeed = 1337;

	/** @type {Set<AudioNode>} */
	const activeNodes = new Set();
	/** @type {Map<string, AudioBuffer>} */
	const impulseBuffers = new Map();

	/**
	 * Pre-configured acoustic environment zone definitions.
	 * @type {Readonly<Record<string, ZoneProfile>>}
	 */
	const ZONE_PROFILES = Object.freeze({
		MEADOW: { dry: 0.95, wet: 0.05, decay: 0.25, power: 3.5 },
		TOWN: { dry: 0.82, wet: 0.18, decay: 0.65, power: 2.2 },
		CRYPT: { dry: 0.52, wet: 0.48, decay: 2.4, power: 1.6 },
	});
	//#endregion

	//#region [SEC-02] AudioContext Guards, Dynamics Compression & Gesture Gateway
	/**
	 * Safely unwraps an EventBus instance from an arbitrary host context.
	 * Pure resolution procedure.
	 *
	 * @param {AcousticContext | any} [busRef] - Direct EventBus reference or host context container.
	 * @returns {EventBusSubscriber | null} Resolved EventBus reference.
	 */
	function resolveEventBus(busRef) {
		if (busRef && typeof busRef.subscribe === "function") {
			return busRef;
		}
		if (busRef?.eventBus && typeof busRef.eventBus.subscribe === "function") {
			return busRef.eventBus;
		}
		return null;
	}

	/**
	 * Initializes the Web Audio API context, dynamics compressor, master bus, and convolution pipeline.
	 * State-mutating audio subsystem initialization procedure.
	 *
	 * @returns {void}
	 */
	function ensureContext() {
		if (!userHasInteracted || typeof window === "undefined") return;
		if (!ctx) {
			const AudioCtx =
				window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
			if (!AudioCtx) return;
			try {
				const newCtx = new AudioCtx();
				ctx = newCtx;

				// Master Output Stage with Dynamic Master Volume
				const mGain = newCtx.createGain();
				mGain.gain.setValueAtTime(
					isMuted ? 0.0 : masterVolume,
					newCtx.currentTime,
				);
				mGain.connect(newCtx.destination);

				// Master Dynamics Compressor (Anti-Clipping & Distortion Guard)
				let comp = null;
				if (typeof newCtx.createDynamicsCompressor === "function") {
					comp = newCtx.createDynamicsCompressor();
					comp.threshold.setValueAtTime(-12, newCtx.currentTime);
					comp.knee.setValueAtTime(20, newCtx.currentTime);
					comp.ratio.setValueAtTime(8, newCtx.currentTime);
					comp.attack.setValueAtTime(0.003, newCtx.currentTime);
					comp.release.setValueAtTime(0.15, newCtx.currentTime);
					comp.connect(mGain);
				}

				const outputTarget = comp || mGain;

				// Parallel Dry and Wet Acoustic Buses
				const dBus = newCtx.createGain();
				const wBus = newCtx.createGain();
				if (typeof newCtx.createConvolver === "function") {
					const cNode = newCtx.createConvolver();
					cNode.connect(wBus);
					convolverNode = cNode;
				}

				dBus.connect(outputTarget);
				wBus.connect(outputTarget);

				masterGain = mGain;
				compressorNode = comp;
				dryBus = dBus;
				wetBus = wBus;

				// Pre-bake Algorithmic Impulse Buffers
				bakeImpulseResponses();
				applyZoneProfile(currentZone);
			} catch (ignored) { // NOSONAR
				// Expected: AudioContext creation may fail if Web Audio is unsupported in mock or headless contexts
				ctx = null;
			}
		}
		if (ctx?.state === "suspended") {
			ctx.resume().catch((ignored) => { // NOSONAR
				// Expected: Promise rejected if browser autoplay policy prevents resumption prior to gesture
			});
		}
	}

	/**
	 * Attaches one-time DOM interaction listeners to unlock the Web Audio context.
	 * State-mutating browser autoplay mitigation procedure.
	 *
	 * @returns {void}
	 */
	function armUserGestureUnlock() {
		if (
			typeof window === "undefined" ||
			typeof window.addEventListener !== "function"
		)
			return;
		const unlockHandler = () => {
			userHasInteracted = true;
			ensureContext();
			window.removeEventListener("click", unlockHandler);
			window.removeEventListener("keydown", unlockHandler);
			window.removeEventListener("touchstart", unlockHandler);
		};
		window.addEventListener("click", unlockHandler, { once: true });
		window.addEventListener("keydown", unlockHandler, { once: true });
		window.addEventListener("touchstart", unlockHandler, { once: true });
	}
	//#endregion

	//#region [SEC-03] Convolution Engine & Algorithmic Impulse Baking
	/**
	 * Generates deterministic pseudo-random white noise in [-1.0, 1.0].
	 * State-mutating DSP math procedure.
	 *
	 * @returns {number} White noise amplitude sample.
	 */
	function nextAcousticNoise() {
		noiseSeed = Math.trunc(noiseSeed + 0x6d2b79f5);
		let t = noiseSeed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2.0 - 1.0;
	}

	/**
	 * Applies micro-variance pitch jitter to prevent repetitive acoustic fatigue.
	 *
	 * @param {number} baseFreq - Nominal pitch frequency in Hz.
	 * @param {number} [varianceRatio=0.04] - Maximum deviation percentage [0.0, 1.0].
	 * @returns {number} Perturbed frequency in Hz.
	 */
	function applyPitchJitter(baseFreq, varianceRatio = 0.04) {
		const jitter = nextAcousticNoise() * varianceRatio;
		return Math.max(10, baseFreq * (1.0 + jitter));
	}

	/**
	 * Generates procedural impulse response audio buffers for convolution reverb.
	 * State-mutating DSP math synthesis procedure.
	 *
	 * @returns {void}
	 */
	function bakeImpulseResponses() {
		if (!ctx || typeof ctx.createBuffer !== "function") return;
		const localCtx = ctx;
		const sampleRate = localCtx.sampleRate || 44100;

		try {
			Object.entries(ZONE_PROFILES).forEach(([zoneKey, profile]) => {
				const length = Math.floor(sampleRate * profile.decay);
				const impulse = localCtx.createBuffer(2, length, sampleRate);
				const left = impulse.getChannelData(0);
				const right = impulse.getChannelData(1);

				for (let i = 0; i < length; i++) {
					const t = i / length;
					const decayEnvelope = (1.0 - t) ** profile.power;
					left[i] = nextAcousticNoise() * decayEnvelope;
					right[i] = nextAcousticNoise() * decayEnvelope;
				}
				impulseBuffers.set(zoneKey, impulse);
			});
		} catch (ignored) { // NOSONAR
			// Expected: Buffer allocation can fail if mock environment lacks full Web Audio support
		}
	}

	/**
	 * Transitions dynamic acoustic dry/wet levels and swaps the active convolution buffer.
	 * State-mutating DSP mixer procedure.
	 *
	 * @param {ZoneKey} zoneKey - Target zone configuration key.
	 * @returns {void}
	 */
	function applyZoneProfile(zoneKey) {
		currentZone = ZONE_PROFILES[zoneKey] ? zoneKey : "MEADOW";
		if (!ctx || !dryBus || !wetBus) return;

		const profile = ZONE_PROFILES[currentZone];
		if (convolverNode) {
			const buffer = impulseBuffers.get(currentZone);
			if (buffer) {
				convolverNode.buffer = buffer;
			}
		}

		const t = ctx.currentTime;
		if (dryBus.gain && typeof dryBus.gain.setTargetAtTime === "function") {
			dryBus.gain.setTargetAtTime(profile.dry, t, 0.05);
		}
		if (wetBus.gain && typeof wetBus.gain.setTargetAtTime === "function") {
			wetBus.gain.setTargetAtTime(profile.wet, t, 0.05);
		}
	}
	//#endregion

	//#region [SEC-04] Procedural Synthesis Generators (Tones, Filtered Noise, FM Synthesis)
	/**
	 * Routes an audio node into stereo panner nodes, dry bus, and convolution nodes.
	 * State-mutating Web Audio graph connection procedure.
	 *
	 * @param {AudioNode} sourceNode - Audio graph origin node.
	 * @param {number} [panValue=0.0] - Clamped stereo pan coefficient in [-1.0, 1.0].
	 * @returns {void}
	 */
	function routeSpatialSource(sourceNode, panValue = 0.0) {
		if (!ctx || !dryBus) return;
		const clampedPan = Math.max(-1.0, Math.min(1.0, panValue));

		/** @type {StereoPannerNode | null} */
		let panner = null;
		if (typeof ctx.createStereoPanner === "function") {
			try {
				const localPanner = ctx.createStereoPanner();
				localPanner.pan.setValueAtTime(clampedPan, ctx.currentTime);
				panner = localPanner;
			} catch (ignored) { // NOSONAR
				// Expected: StereoPannerNode instantiation can fail in headless or unsupported browser engines
				panner = null;
			}
		}

		if (panner) {
			sourceNode.connect(panner);
			panner.connect(dryBus);
			if (convolverNode) {
				panner.connect(convolverNode);
			}
		} else {
			sourceNode.connect(dryBus);
			if (convolverNode) {
				sourceNode.connect(convolverNode);
			}
		}
	}

	/**
	 * Synthesizes and schedules a localized tone with an exponential envelope.
	 * State-mutating parametric audio synthesis procedure.
	 *
	 * @param {number} freq - Pitch frequency in Hertz.
	 * @param {OscillatorType} type - Standard oscillator waveform shape.
	 * @param {number} startTime - Web Audio scheduling start timestamp in seconds.
	 * @param {number} duration - Tone duration in seconds.
	 * @param {number} [pan=0.0] - Stereo field pan position in [-1.0, 1.0].
	 * @param {number} [gainStart=0.15] - Initial peak volume gain level.
	 * @param {boolean} [applyJitter=false] - Whether to apply micro-pitch variance.
	 * @returns {void}
	 */
	function scheduleSpatialTone(
		freq,
		type,
		startTime,
		duration,
		pan = 0.0,
		gainStart = 0.15,
		applyJitter = false,
	) {
		if (isMuted) return;
		ensureContext();
		if (!ctx || !masterGain) return;

		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			const safeStartGain = Math.max(0.0001, gainStart);
			const targetFreq = applyJitter ? applyPitchJitter(freq, 0.04) : freq;
			const safeFreq = Math.max(10, targetFreq);

			osc.type = type;
			osc.frequency.setValueAtTime(safeFreq, startTime);

			gain.gain.setValueAtTime(safeStartGain, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

			osc.connect(gain);
			routeSpatialSource(gain, pan);

			osc.start(startTime);
			osc.stop(startTime + duration);

			activeNodes.add(osc);
			osc.onended = () => {
				activeNodes.delete(osc);
				try {
					gain.disconnect();
					osc.disconnect();
				} catch (ignored) { // NOSONAR
					// Expected: Audio nodes may already be detached from the graph
				}
			};
		} catch (ignored) { // NOSONAR
			// Expected: Audio graph scheduling may fail if AudioContext is closed or invalid
		}
	}

	/**
	 * Synthesizes a procedural noise burst run through a resonant Biquad filter sweep.
	 * Essential for explosions, fireballs, crunchy impacts, and atmospheric gusts.
	 *
	 * @param {number} duration - Burst duration in seconds.
	 * @param {BiquadFilterType} filterType - Biquad filter configuration ('lowpass' | 'bandpass' | 'highpass').
	 * @param {number} startFreq - Starting filter cutoff frequency in Hz.
	 * @param {number} endFreq - Ending filter cutoff frequency in Hz.
	 * @param {number} [qFactor=3.0] - Resonant filter Q factor.
	 * @param {number} [pan=0.0] - Stereo position in [-1.0, 1.0].
	 * @param {number} [gainStart=0.2] - Initial burst gain.
	 * @returns {void}
	 */
	function scheduleNoiseBurst(
		duration,
		filterType,
		startFreq,
		endFreq,
		qFactor = 3.0,
		pan = 0.0,
		gainStart = 0.2,
	) {
		if (isMuted) return;
		ensureContext();
		if (!ctx || !masterGain) return;

		try {
			const t = ctx.currentTime;
			const sampleRate = ctx.sampleRate || 44100;
			const bufferSize = Math.max(128, Math.floor(sampleRate * duration));
			const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
			const data = noiseBuffer.getChannelData(0);

			for (let i = 0; i < bufferSize; i++) {
				data[i] = nextAcousticNoise();
			}

			const noiseSource = ctx.createBufferSource();
			noiseSource.buffer = noiseBuffer;

			const filter = ctx.createBiquadFilter();
			filter.type = filterType;
			filter.Q.setValueAtTime(qFactor, t);
			filter.frequency.setValueAtTime(Math.max(20, startFreq), t);
			filter.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFreq),
				t + duration,
			);

			const gain = ctx.createGain();
			gain.gain.setValueAtTime(Math.max(0.0001, gainStart), t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

			noiseSource.connect(filter);
			filter.connect(gain);
			routeSpatialSource(gain, pan);

			noiseSource.start(t);
			noiseSource.stop(t + duration);

			activeNodes.add(noiseSource);
			noiseSource.onended = () => {
				activeNodes.delete(noiseSource);
				try {
					gain.disconnect();
					filter.disconnect();
					noiseSource.disconnect();
				} catch (ignored) { // NOSONAR
					// Expected: Audio node cleanup on completion
				}
			};
		} catch (ignored) { // NOSONAR
			// Expected: Audio scheduling in restricted context
		}
	}

	/**
	 * Synthesizes a 2-operator Frequency Modulation (FM) tone for metallic, magical, or dissonant cues.
	 *
	 * @param {number} carrierFreq - Carrier oscillator base frequency in Hz.
	 * @param {number} modFreq - Modulator oscillator frequency in Hz.
	 * @param {number} modIndex - Modulation depth/index.
	 * @param {number} startTime - Scheduling start timestamp in seconds.
	 * @param {number} duration - Tone duration in seconds.
	 * @param {number} [pan=0.0] - Stereo position in [-1.0, 1.0].
	 * @param {number} [gainStart=0.18] - Initial gain level.
	 * @returns {void}
	 */
	function scheduleFMTone(
		carrierFreq,
		modFreq,
		modIndex,
		startTime,
		duration,
		pan = 0.0,
		gainStart = 0.18,
	) {
		if (isMuted) return;
		ensureContext();
		if (!ctx || !masterGain) return;

		try {
			const t = startTime || ctx.currentTime;
			const carrier = ctx.createOscillator();
			const modulator = ctx.createOscillator();
			const modGain = ctx.createGain();
			const masterToneGain = ctx.createGain();

			carrier.type = "sine";
			carrier.frequency.setValueAtTime(Math.max(10, carrierFreq), t);

			modulator.type = "sine";
			modulator.frequency.setValueAtTime(Math.max(10, modFreq), t);

			modGain.gain.setValueAtTime(modFreq * modIndex, t);
			modGain.gain.exponentialRampToValueAtTime(0.01, t + duration);

			modulator.connect(modGain);
			modGain.connect(carrier.frequency);

			masterToneGain.gain.setValueAtTime(Math.max(0.0001, gainStart), t);
			masterToneGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

			carrier.connect(masterToneGain);
			routeSpatialSource(masterToneGain, pan);

			modulator.start(t);
			carrier.start(t);

			modulator.stop(t + duration);
			carrier.stop(t + duration);

			activeNodes.add(carrier);
			carrier.onended = () => {
				activeNodes.delete(carrier);
				try {
					masterToneGain.disconnect();
					carrier.disconnect();
					modGain.disconnect();
					modulator.disconnect();
				} catch (ignored) { // NOSONAR
					// Expected: Audio node cleanup on completion
				}
			};
		} catch (ignored) { // NOSONAR
			// Expected: Audio scheduling in restricted context
		}
	}
	//#endregion

	//#region [SEC-05] Canonical SFX Waveform Registry & Kinetic Profiles
	/**
	 * Authoritative procedural synthesizer definitions for game audio cues.
	 * @type {Record<string, (pan?: number) => void>}
	 */
	const SFX_REGISTRY = {
		/**
		 * UI selection confirmation blip.
		 * @param {number} [pan=0.0]
		 */
		SELECT(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			scheduleSpatialTone(520, "square", ctx.currentTime, 0.06, pan, 0.1);
		},

		/**
		 * Overworld walking footstep with alternating left/right pan and micro-pitch variance.
		 * @param {number} [pan=0.0]
		 */
		STEP(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			stepFootToggle = !stepFootToggle;
			let stepPan = pan;
			if (stepPan === 0.0) {
				stepPan = stepFootToggle ? -0.12 : 0.12;
			}
			scheduleSpatialTone(
				110,
				"triangle",
				ctx.currentTime,
				0.035,
				stepPan,
				0.045,
				true,
			);
		},

		/**
		 * Kinetic weapon slash with high-to-low pitch sweep and light impact crunch.
		 * @param {number} [pan=0.0]
		 */
		ATTACK_HIT(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			try {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();

				osc.type = "sawtooth";
				const startPitch = applyPitchJitter(180, 0.05);
				osc.frequency.setValueAtTime(startPitch, t);
				osc.frequency.exponentialRampToValueAtTime(35, t + 0.14);

				gain.gain.setValueAtTime(0.22, t);
				gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

				osc.connect(gain);
				routeSpatialSource(gain, pan);

				osc.start(t);
				osc.stop(t + 0.14);
				activeNodes.add(osc);
				osc.onended = () => {
					activeNodes.delete(osc);
					try {
						gain.disconnect();
						osc.disconnect();
					} catch (ignored) { // NOSONAR
						// Expected: Node detach error
					}
				};
			} catch (ignored) { // NOSONAR
				// Expected: Scheduling error
			}

			// Light high-frequency impact crackle
			scheduleNoiseBurst(0.08, "bandpass", 1400, 300, 2.5, pan, 0.12);
		},

		/**
		 * Heavy critical strike: Sub-bass drop, resonant noise crunch, and metallic shimmer.
		 * @param {number} [pan=0.0]
		 */
		CRITICAL_HIT(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;

			// Sub-bass heavy thump
			scheduleSpatialTone(95, "triangle", t, 0.28, pan, 0.3);

			// Explosive resonant noise crunch
			scheduleNoiseBurst(0.22, "lowpass", 3200, 180, 4.5, pan, 0.28);

			// Metallic blade shockwave ring
			scheduleFMTone(740, 370, 2.2, t + 0.02, 0.35, pan, 0.18);
		},

		/**
		 * Arcane projectile whoosh.
		 * @param {number} [pan=0.0]
		 */
		SPELL_BOLT(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(620, "sine", t, 0.18, pan, 0.16);
			scheduleSpatialTone(880, "sine", t + 0.06, 0.15, pan + 0.1, 0.14);
		},

		/**
		 * Roaring Fireball launch and detonating blast.
		 * @param {number} [pan=0.0]
		 */
		FIREBALL_EXPLOSION(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;

			// Rising ignite swoosh
			scheduleSpatialTone(140, "sawtooth", t, 0.1, pan - 0.1, 0.15);

			// Lowpass explosive concussion rumble
			scheduleNoiseBurst(0.45, "lowpass", 2400, 60, 3.8, pan, 0.32);

			// Sub-harmonic bass wave
			scheduleSpatialTone(55, "sine", t + 0.06, 0.38, pan, 0.26);
		},

		/**
		 * Resonant restoration chime chord with shimmering stereo spread.
		 * @param {number} [pan=0.0]
		 */
		HEAL(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(330, "triangle", t, 0.18, pan - 0.12, 0.15);
			scheduleSpatialTone(440, "triangle", t + 0.08, 0.2, pan, 0.16);
			scheduleSpatialTone(660, "triangle", t + 0.16, 0.32, pan + 0.12, 0.18);
			scheduleSpatialTone(880, "sine", t + 0.22, 0.4, pan, 0.12);
		},

		/**
		 * Triumphant Level-Up / Blessing arpeggio with high-shelf sparkle.
		 * @param {number} [_pan=0.0]
		 */
		LEVEL_UP(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
			notes.forEach((freq, idx) => {
				const sweepPan = -0.4 + (idx / (notes.length - 1)) * 0.8;
				scheduleSpatialTone(
					freq,
					"triangle",
					t + idx * 0.07,
					0.25,
					sweepPan,
					0.14,
				);
			});
			scheduleNoiseBurst(0.5, "highpass", 4000, 8000, 1.2, 0.0, 0.08);
		},

		/**
		 * Ominous curse or debuff stinger: Inharmonic descending FM dissonant tone.
		 * @param {number} [pan=0.0]
		 */
		CURSE_DEBUFF(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleFMTone(210, 147, 4.5, t, 0.4, pan, 0.22);
			scheduleSpatialTone(70, "sawtooth", t + 0.1, 0.45, pan, 0.2);
		},

		/**
		 * Crystalline loot pickup or coin jingle.
		 * @param {number} [pan=0.0]
		 */
		COIN_LOOT(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(987.77, "sine", t, 0.12, pan - 0.05, 0.16);
			scheduleSpatialTone(1318.51, "sine", t + 0.07, 0.28, pan + 0.05, 0.18);
		},

		/**
		 * Wooden dungeon door / heavy chest latch opening sound.
		 * @param {number} [pan=0.0]
		 */
		DOOR_OPEN(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleFMTone(120, 85, 2.0, t, 0.25, pan - 0.1, 0.15);
			scheduleNoiseBurst(0.18, "bandpass", 600, 200, 3.0, pan, 0.14);
		},

		/**
		 * Combat encounter start warning stinger.
		 * @param {number} [_pan=0.0]
		 */
		ENCOUNTER_TRIGGER(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(240, "square", t, 0.08, -0.3, 0.18);
			scheduleSpatialTone(190, "square", t + 0.07, 0.08, 0.0, 0.18);
			scheduleSpatialTone(140, "square", t + 0.14, 0.16, 0.3, 0.22);
		},

		/**
		 * Triumphant ascending victory fanfare.
		 * @param {number} [_pan=0.0]
		 */
		VICTORY(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			const notes = [523.25, 523.25, 523.25, 659.25, 783.99];
			notes.forEach((freq, idx) => {
				const sweepPan = -0.4 + (idx / (notes.length - 1)) * 0.8;
				scheduleSpatialTone(
					freq,
					"square",
					t + idx * 0.11,
					0.16,
					sweepPan,
					0.12,
				);
			});
		},

		/**
		 * Descending defeat tone.
		 * @param {number} [_pan=0.0]
		 */
		DEFEAT(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			const notes = [320, 270, 220, 170];
			notes.forEach((freq, idx) => {
				scheduleSpatialTone(freq, "sawtooth", t + idx * 0.16, 0.26, 0.0, 0.15);
			});
		},

		/**
		 * Abyssal water hazard warning tone.
		 * @param {number} [pan=0.0]
		 */
		HAZARD_WATER(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(85, "sine", t, 0.22, pan, 0.18);
			scheduleSpatialTone(120, "triangle", t + 0.04, 0.18, pan, 0.1);
			scheduleNoiseBurst(0.25, "bandpass", 350, 120, 4.0, pan, 0.12);
		},

		/**
		 * Iron portcullis mechanical scrape cue.
		 * @param {number} [pan=0.0]
		 */
		HAZARD_PORTCULLIS(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(190, "sawtooth", t, 0.16, pan, 0.15);
			scheduleSpatialTone(70, "square", t + 0.06, 0.24, pan, 0.22);
			scheduleNoiseBurst(0.26, "bandpass", 900, 300, 3.5, pan, 0.14);
		},

		/**
		 * Swift weapon slice or dash whoosh.
		 * @param {number} [pan=0.0]
		 */
		SWIFT_WHOOSH(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(480, "sine", t, 0.08, pan - 0.15, 0.12);
			scheduleSpatialTone(220, "triangle", t + 0.04, 0.09, pan + 0.15, 0.08);
			scheduleNoiseBurst(0.1, "bandpass", 2200, 450, 2.0, pan, 0.14);
		},

		/**
		 * Heavy boot impact on dungeon flagstones with subtle pitch variance.
		 * @param {number} [pan=0.0]
		 */
		FOOTSTEP_THUD(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(85, "triangle", t, 0.05, pan, 0.09, true);
			scheduleSpatialTone(45, "sine", t + 0.02, 0.07, pan, 0.06, true);
		},

		/**
		 * Vanguard shield parry deflection metallic clang.
		 * @param {number} [pan=0.0]
		 */
		SHIELD_DEFLECT(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(720, "triangle", t, 0.06, pan, 0.18);
			scheduleSpatialTone(340, "square", t + 0.02, 0.12, pan, 0.14);
			scheduleFMTone(1100, 550, 3.0, t, 0.18, pan, 0.16);
		},
	};
	//#endregion

	//#region [SEC-06] Spatial Kinematics & Panning Calculators
	/**
	 * Resolves horizontal stereo panning for combat units.
	 * Pure kinematic calculation procedure.
	 *
	 * @param {'party' | 'enemy' | string} targetType - Wing target affiliation.
	 * @param {number} [targetIndex=0] - Array index offset of the targeted entity.
	 * @param {number} [enemyCount=3] - Total hostiles present in the battle stage.
	 * @returns {number} Normalized stereo panning coefficient in [-0.55, 0.75].
	 */
	function computeCombatPan(targetType, targetIndex = 0, enemyCount = 3) {
		if (targetType === "party") {
			const slotOffset = (targetIndex || 0) * 0.12;
			return -0.55 + slotOffset;
		}
		if (enemyCount <= 1) return 0.45;
		const relativePos = (targetIndex || 0) / Math.max(1, enemyCount - 1);
		return 0.25 + relativePos * 0.5;
	}

	/**
	 * Resolves horizontal stereo panning across overworld tile coordinates.
	 * Pure kinematic calculation procedure.
	 *
	 * @param {number} posX - Target entity horizontal tile coordinate.
	 * @param {number} [mapWidth=48] - Grid map horizontal tile bounds.
	 * @returns {number} Normalized stereo panning coefficient in [-0.75, 0.75].
	 */
	function computeOverworldPan(posX, mapWidth = 48) {
		if (typeof posX !== "number") return 0.0;
		const w = typeof mapWidth === "number" && mapWidth > 1 ? mapWidth : 48;
		return (posX / Math.max(1, w - 1)) * 1.5 - 0.75;
	}

	/**
	 * Mapping table resolving legacy audio event tokens to canonical synthesizer methods.
	 * @type {Readonly<Record<string, string>>}
	 */
	const SFX_ALIASES = Object.freeze({
		sfx_confirm: "SELECT",
		sfx_select: "SELECT",
		sfx_bump: "FOOTSTEP_THUD",
		sfx_heal: "HEAL",
		sfx_damage: "ATTACK_HIT",
		sfx_coin: "COIN_LOOT",
		sfx_victory: "VICTORY",
		sfx_defeat: "DEFEAT",
		ATTACK: "ATTACK_HIT",
		SWORD_HIT: "ATTACK_HIT",
		BUMP: "FOOTSTEP_THUD",
		CHEST_OPEN: "COIN_LOOT",
		CRITICAL: "CRITICAL_HIT",
		CRIT: "CRITICAL_HIT",
		EXPLOSION: "FIREBALL_EXPLOSION",
		FIREBALL: "FIREBALL_EXPLOSION",
		LEVEL_UP: "LEVEL_UP",
		BLESSING: "LEVEL_UP",
		CURSE: "CURSE_DEBUFF",
		DEBUFF: "CURSE_DEBUFF",
		COIN: "COIN_LOOT",
		GOLD: "COIN_LOOT",
		DOOR: "DOOR_OPEN",
		SHIELD_PARRY: "SHIELD_DEFLECT",
	});

	/** @type {Array<() => void>} */
	let cleanupCallbacks = [];
	//#endregion

	return {
		//#region [SEC-07] Peripheral Driver Interface, Lifecycle & EventBus Arbitration
		/**
		 * Exposes module identity and capability flags.
		 * @returns {typeof MODULE_INFO}
		 */
		getModuleInfo() {
			return MODULE_INFO;
		},

		/**
		 * Ingests external configuration parameters safely.
		 * @param {any} [config]
		 * @returns {Readonly<{ accepted: boolean, moduleId: string }>}
		 */
		configure(config) {
			if (typeof config?.masterVolume === "number") {
				this.setMasterVolume(config.masterVolume);
			}
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		/**
		 * Initializes the acoustic driver, arms gestures, and binds EventBus subscriptions.
		 * State-mutating peripheral lifecycle gateway.
		 *
		 * @param {AcousticContext | any} [eventBusRef] - Host runtime context or EventBus handle.
		 * @returns {void}
		 */
		init(eventBusRef) {
			this.destroy();
			armUserGestureUnlock();

			const bus = resolveEventBus(eventBusRef);

			if (bus) {
				/**
				 * @param {GenericSfxPayload} [payload={}]
				 */
				const handleGenericSfx = (payload = {}) => {
					const sfxKey = payload?.sfx || payload?.cue;
					if (sfxKey) {
						const pan = typeof payload.pan === "number" ? payload.pan : 0.0;
						this.play(sfxKey, pan);
					}
				};

				cleanupCallbacks.push(
					bus.subscribe("audio:sfx", handleGenericSfx),
					bus.subscribe("overworld:sfx", handleGenericSfx),
					bus.subscribe("dialogue:sfx", handleGenericSfx),
					bus.subscribe("progression:sfx", handleGenericSfx),
					bus.subscribe("armory:sfx", handleGenericSfx),
					bus.subscribe("relic_forge:sfx", handleGenericSfx),
					bus.subscribe("lockpick:sfx", handleGenericSfx),
					bus.subscribe(
						"combat:sfx",
						(/** @type {CombatSfxPayload} */ evt = {}) => {
							const sfx = evt?.sfx;
							if (!sfx) return;
							const pan = evt.targetType
								? computeCombatPan(evt.targetType, evt.targetIndex)
								: 0.0;
							this.play(sfx, pan);
						},
					),
					bus.subscribe(
						"overworld:step",
						(/** @type {OverworldStepPayload} */ evt = {}) => {
							const pos = evt?.pos;
							if (pos) {
								const pan = computeOverworldPan(pos.x, evt.mapWidth || 48);
								this.play("STEP", pan);

								if (pos.x >= 32 || (pos.depth && pos.depth > 0)) {
									this.setZone("CRYPT");
								} else if (pos.inTown) {
									this.setZone("TOWN");
								} else {
									this.setZone("MEADOW");
								}
							}
						},
					),
					bus.subscribe(
						"system:command",
						(/** @type {SystemCommandPayload} */ evt = {}) => {
							if (evt?.command === "TOGGLE_MUTE") {
								this.toggleMute();
							} else if (
								evt?.command === "SET_VOLUME" &&
								typeof evt?.value === "number"
							) {
								this.setMasterVolume(evt.value);
							}
						},
					),
				);
			}
		},

		/**
		 * Resets the driver state between scene swaps.
		 * @returns {void}
		 */
		reset() {
			this.setZone("MEADOW");
			stepFootToggle = false;
		},

		/**
		 * Periodic engine update tick.
		 * @param {number} [_dt]
		 */
		update(_dt) {},

		/**
		 * Presentation render tick (audio requires no DOM frame output).
		 */
		render() {},

		/**
		 * Read-only snapshot of current audio state.
		 * @returns {Readonly<{ activeNodes: number, isMuted: boolean, masterVolume: number, activeZone: ZoneKey }>}
		 */
		getState() {
			return Object.freeze({
				activeNodes: activeNodes.size,
				isMuted,
				masterVolume,
				activeZone: currentZone,
			});
		},

		/**
		 * Synthesizes and plays a designated procedural sound effect.
		 * State-mutating audio dispatch procedure.
		 *
		 * @param {string} sfxName - Registered sound effect name or legacy alias.
		 * @param {number} [pan=0.0] - Normalized stereo field position in [-1.0, 1.0].
		 * @returns {void}
		 */
		play(sfxName, pan = 0.0) {
			if (!sfxName) return;
			const key = SFX_ALIASES[sfxName] || sfxName;
			if (SFX_REGISTRY[key]) {
				SFX_REGISTRY[key](pan);
			}
		},

		/**
		 * Standard alias for modular engine compatibility.
		 * @param {string} sfxName
		 * @param {number} [pan=0.0]
		 */
		playSFX(sfxName, pan = 0.0) {
			this.play(sfxName, pan);
		},

		/**
		 * Updates the active acoustic profile to match a target environmental zone.
		 * State-mutating operational configuration procedure.
		 *
		 * @param {ZoneKey} zoneKey - Environmental zone identifier.
		 * @returns {void}
		 */
		setZone(zoneKey) {
			applyZoneProfile(zoneKey);
		},

		/**
		 * Adjusts master gain volume smoothly.
		 *
		 * @param {number} level - Gain volume level in [0.0, 1.0].
		 * @returns {number} The updated master volume level.
		 */
		setMasterVolume(level) {
			masterVolume = Math.max(0.0, Math.min(1.0, level));
			if (masterGain && ctx && !isMuted) {
				try {
					masterGain.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.03);
				} catch (ignored) { // NOSONAR
					// Expected: Master volume ramp error
				}
			}
			return masterVolume;
		},

		/**
		 * Toggles the global master audio mute state.
		 * State-mutating gain manipulation procedure.
		 *
		 * @returns {boolean} True if muted, false if unmuted.
		 */
		toggleMute() {
			isMuted = !isMuted;
			if (masterGain && ctx) {
				try {
					masterGain.gain.setValueAtTime(
						isMuted ? 0.0 : masterVolume,
						ctx.currentTime,
					);
				} catch (ignored) { // NOSONAR
					// Expected: AudioParam automation failure on suspended context
				}
			}
			return isMuted;
		},

		/**
		 * Extracts health metrics, active nodes, and bus states for auditor validation.
		 * Pure diagnostic accessor procedure.
		 *
		 * @returns {AcousticDiagnostics} Subsystem operational diagnostic telemetry.
		 */
		getDiagnostics() {
			return {
				serviceId: "acoustic_sfx_driver",
				contextState: ctx ? ctx.state : "uninitialized",
				activeZone: currentZone,
				userUnlocked: userHasInteracted,
				isMuted,
				masterVolume,
				limiterActive: compressorNode !== null,
				activeNodeCount: activeNodes.size,
				dryLevel: ZONE_PROFILES[currentZone]?.dry || 1.0,
				wetLevel: ZONE_PROFILES[currentZone]?.wet || 0.0,
			};
		},

		/**
		 * Disposes active oscillator/noise nodes, tears down AudioContext, and purges bus listeners.
		 * State-mutating resource disposal procedure.
		 *
		 * @returns {void}
		 */
		destroy() {
			cleanupCallbacks.forEach((unbind) => {
				try {
					if (typeof unbind === "function") unbind();
				} catch (ignored) { // NOSONAR
					// Expected: Teardown unbind failure
				}
			});
			cleanupCallbacks = [];

			activeNodes.forEach((node) => {
				try {
					/** @type {any} */ (node).stop?.();
					node.disconnect();
				} catch (ignored) { // NOSONAR
					// Expected: Node may already be stopped or disconnected
				}
			});
			activeNodes.clear();

			if (ctx) {
				ctx.close().catch((ignored) => { // NOSONAR
					// Expected: AudioContext closing rejection
				});
				ctx = null;
				masterGain = null;
				compressorNode = null;
				dryBus = null;
				wetBus = null;
				convolverNode = null;
			}
			impulseBuffers.clear();
		},
		//#endregion
	};
})();

//#region [SEC-08] Global Export & Dual-Binding Registration
if (typeof window !== "undefined") {
	window.EmberlightAcousticSFX = EmberlightAcousticSFX;
	window.EmberlightAudio = EmberlightAcousticSFX;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightAcousticSFX;
}
//#endregion
