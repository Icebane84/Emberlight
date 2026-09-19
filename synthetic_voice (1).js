/* cSpell:words Approximants Unsubscription */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROCEDURAL FORMANT SPEECH SYNTHESIZER
 * Document Identifier: VSRP-001-SYNTHETIC-VOICE
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-WAR-TABLE-001
 * Authority:           Peripheral Capability Driver
 * Timestamp:           2026-09-07T12:53:10Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Audio Context Initialization & Gesture Unlock
 *   [SEC-03] Speaker Vocal Profiles & Phonetic Formant Formulations
 *   [SEC-04] Formant Synthesis & Phonetic Bark Generation Engine
 *   [SEC-05] Sub-Harmonic Monster Growl Synthesizer
 *   [SEC-06] Canonical Runtime Lifecycle Gateway & EventBus Subscriptions
 *   [SEC-07] Global Environment & Window Scope Export
 * ============================================================================
 */

/* =========================================================================
	 PERIPHERAL DRIVER: PROCEDURAL FORMANT SPEECH SYNTHESIZER
	 -------------------------------------------------------------------------
	 Document Identifier: VSRP-001-SYNTHETIC-VOICE
	 Protocol Version:    VSRP-001 / ARCH-SPEC-WAR-TABLE-001
	 Classification:      Peripheral Capability Driver
	 Index Anchor:        PRS-001
	 ========================================================================= */

const EmberlightVoice = (() => {
	'use strict';

	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} VocalProfile
	 * @property {number} f0 - Fundamental frequency in Hz.
	 * @property {string} oscType - Glottal oscillator waveform type.
	 * @property {number} q1 - Formant 1 Q-factor.
	 * @property {number} q2 - Formant 2 Q-factor.
	 * @property {number} duration - Syllable duration in seconds.
	 * @property {number} pitchJitter - Random pitch variation factor.
	 * @property {number} volume - Master volume gain.
	 */

	/**
	 * @typedef {Object} PhonemeRecord
	 * @property {number} f1 - Formant 1 frequency in Hz.
	 * @property {number} f2 - Formant 2 frequency in Hz.
	 * @property {number} noise - Consonant noise mixing ratio.
	 */

	/**
	 * @typedef {Object} VoiceDiagnostics
	 * @property {string} driverId - Driver identifier.
	 * @property {string} contextState - AudioContext state string.
	 * @property {boolean} userUnlocked - User gesture unlock assertion flag.
	 * @property {boolean} isMuted - Mute state assertion flag.
	 * @property {string[]} availableProfiles - Available speaker profile keys.
	 */

	/**
	 * @typedef {Object} EventBusPayload
	 * @property {string} [char] - Character glyph.
	 * @property {string} [speaker] - Speaker key.
	 * @property {string} [sfx] - SFX identifier.
	 * @property {number} [intensity] - Growl intensity.
	 * @property {string} [command] - System command.
	 */
	//#endregion

	//#region [SEC-02] Audio Context Initialization & Gesture Unlock
	/** @type {AudioContext|null} */
	let ctx = null;
	/** @type {GainNode|null} */
	let masterGain = null;
	/** @type {AudioBuffer|null} */
	let noiseBuffer = null;
	let isMuted = false;
	let userUnlocked = false;
	/** @type {any|null} */
	let eventBus = null;

	/**
	 * Ensures Web Audio context is initialized and active.
	 * [State Mutating]
	 * @returns {void}
	 */
	function ensureContext() {
		if (!userUnlocked || typeof window === 'undefined') return;
		if (!ctx) {
			const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
			if (!AudioCtx) return;
			try {
				ctx = new AudioCtx();
				masterGain = ctx.createGain();
				masterGain.gain.setValueAtTime(isMuted ? 0.0 : 1.0, ctx.currentTime);
				masterGain.connect(ctx.destination);
				bakeNoiseBuffer();
			} catch (err) {
				// AudioContext instantiation may fail due to browser autoplay policies or missing hardware support; safely ignored.
			}
		}
		if (ctx?.state === 'suspended') {
			ctx.resume().catch(() => {
				// AudioContext resume failures are non-fatal and safely ignored.
			});
		}
	}

	/**
	 * Bakes white noise buffer for consonant fricative synthesis.
	 * [State Mutating]
	 * @returns {void}
	 */
	function bakeNoiseBuffer() {
		if (!ctx || typeof ctx.createBuffer !== 'function') return;
		try {
			const len = Math.trunc(ctx.sampleRate * 0.1);
			noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
			const data = noiseBuffer.getChannelData(0);
			for (let i = 0; i < len; i++) {
				// NOSONAR: Non-cryptographic Math.random is used intentionally here for procedural audio jitter/noise generation.
				data[i] = Math.random() * 2 - 1; // NOSONAR
			}
		} catch (err) {
			// Noise buffer baking failures are non-fatal and safely ignored.
		}
	}

	/**
	 * Arms browser user gesture listeners for audio context unlocking.
	 * [State Mutating]
	 * @returns {void}
	 */
	function armGestureUnlock() {
		if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
		const unlock = () => {
			userUnlocked = true;
			ensureContext();
			window.removeEventListener('click', unlock);
			window.removeEventListener('keydown', unlock);
			window.removeEventListener('touchstart', unlock);
		};
		window.addEventListener('click', unlock, { once: true });
		window.addEventListener('keydown', unlock, { once: true });
		window.addEventListener('touchstart', unlock, { once: true });
	}
	//#endregion

	//#region [SEC-03] Speaker Vocal Profiles & Phonetic Formant Formulations
	// --- SPEAKER VOCAL PROFILES ---
	/** @type {Record<string, VocalProfile>} */
	const PROFILES = {
		DEFAULT: {
			f0: 130,             // Fundamental pitch in Hz
			oscType: 'sawtooth', // Glottal pulse wave
			q1: 4.5,             // Formant 1 Q-factor
			q2: 5.5,             // Formant 2 Q-factor
			duration: 0.055,     // Syllable duration in seconds
			pitchJitter: 0.02,   // Random pitch variation
			volume: 0.22,
		},
		ELDER: {
			f0: 82,
			oscType: 'sawtooth',
			q1: 6.0,
			q2: 4.0,
			duration: 0.075,
			pitchJitter: 0.015,
			volume: 0.26,
		},
		GUARD: {
			f0: 165,
			oscType: 'square',
			q1: 3.5,
			q2: 6.0,
			duration: 0.045,
			pitchJitter: 0.01,
			volume: 0.20,
		},
		SCOUT: {
			f0: 215,
			oscType: 'triangle',
			q1: 3.0,
			q2: 4.0,
			duration: 0.065,
			pitchJitter: 0.06,   // High trembling jitter
			volume: 0.24,
		},
		BOSS: {
			f0: 52,
			oscType: 'sawtooth',
			q1: 8.0,
			q2: 7.0,
			duration: 0.095,
			pitchJitter: 0.03,
			volume: 0.32,
		},
	};

	// --- PHONETIC FORMANT FORMULAS ---
	/** @type {Record<string, PhonemeRecord>} */
	const PHONEMES = {
		// Vowels
		a: { f1: 750, f2: 1220, noise: 0.00 },
		e: { f1: 520, f2: 1840, noise: 0.00 },
		i: { f1: 290, f2: 2280, noise: 0.00 },
		o: { f1: 500, f2: 980, noise: 0.00 },
		u: { f1: 330, f2: 860, noise: 0.00 },
		// Fricatives & Sibilants
		s: { f1: 2200, f2: 4800, noise: 0.50 },
		z: { f1: 1800, f2: 4200, noise: 0.35 },
		f: { f1: 1400, f2: 3800, noise: 0.40 },
		v: { f1: 600, f2: 2400, noise: 0.25 },
		c: { f1: 2000, f2: 4400, noise: 0.45 },
		x: { f1: 2100, f2: 4600, noise: 0.48 },
		// Plosives / Stops
		t: { f1: 450, f2: 1600, noise: 0.30 },
		p: { f1: 380, f2: 1200, noise: 0.25 },
		k: { f1: 420, f2: 1800, noise: 0.32 },
		d: { f1: 380, f2: 1500, noise: 0.15 },
		b: { f1: 300, f2: 1100, noise: 0.12 },
		g: { f1: 350, f2: 1400, noise: 0.18 },
		// Nasals & Approximants
		m: { f1: 320, f2: 1200, noise: 0.05 },
		n: { f1: 340, f2: 1400, noise: 0.05 },
		l: { f1: 400, f2: 1300, noise: 0.02 },
		r: { f1: 380, f2: 1150, noise: 0.02 },
		h: { f1: 800, f2: 1600, noise: 0.40 },
		w: { f1: 320, f2: 850, noise: 0.02 },
		y: { f1: 300, f2: 2200, noise: 0.02 },
	};

	/**
	 * Resolves vocal profile configuration for speaker key.
	 * [Pure Query]
	 * @param {string} [speakerKey] - Speaker identifier token.
	 * @returns {VocalProfile} Vocal profile configuration.
	 */
	function resolveProfile(speakerKey) {
		if (!speakerKey) return PROFILES.DEFAULT;
		const sk = speakerKey.toUpperCase();
		if (sk.includes('ELDER') || sk.includes('ROWAN')) return PROFILES.ELDER;
		if (sk.includes('GUARD') || sk.includes('KAEL')) return PROFILES.GUARD;
		if (sk.includes('SCOUT') || sk.includes('AFFLICTED')) return PROFILES.SCOUT;
		if (sk.includes('MALAKOR') || sk.includes('BOSS') || sk.includes('REVENANT')) return PROFILES.BOSS;
		return PROFILES.DEFAULT;
	}
	//#endregion

	//#region [SEC-04] Formant Synthesis & Phonetic Bark Generation Engine
	// --- SYNTHESIZE A SINGLE PHONETIC BARK ---
	/**
	 * Synthesizes a single phonetic bark character.
	 * [State Mutating]
	 * @param {string} char - Character glyph.
	 * @param {string} [speakerKey] - Speaker identifier.
	 * @returns {void}
	 */
	function synthesizeBark(char, speakerKey) {
		if (isMuted || !char || char === ' ' || char === '\n') return;
		ensureContext();
		if (!ctx || !masterGain) return;

		const profile = resolveProfile(speakerKey);
		const charKey = char.toLowerCase();
		const phoneme = PHONEMES[charKey] || PHONEMES.e; // Default to neutral mid-vowel

		const t0 = ctx.currentTime;
		const dur = profile.duration;

		// NOSONAR: Non-cryptographic Math.random is used intentionally here for procedural audio pitch jitter variance.
		const jitter = 1.0 + (Math.random() * 2 - 1) // NOSONAR * profile.pitchJitter;
		let basePitch = profile.f0 * jitter;

		// Pitch inflection on punctuation
		if (['?', '!'].includes(char)) basePitch *= 1.25;
		else if (['.', ';'].includes(char)) basePitch *= 0.85;

		const safePitch = Math.max(20, basePitch);
		const safeVol = Math.max(0.001, profile.volume);

		try {
			// 1. Glottal Pulse Generator (Oscillator)
			const osc = ctx.createOscillator();
			/** @type {OscillatorType} */
			const oscType = /** @type {any} */ (profile.oscType);
			osc.type = oscType;
			osc.frequency.setValueAtTime(safePitch, t0);
			osc.frequency.exponentialRampToValueAtTime(Math.max(20, safePitch * 0.94), t0 + dur);

			// 2. Formant 1 Bandpass Filter (Pharyngeal Cavity)
			const filter1 = ctx.createBiquadFilter();
			filter1.type = 'bandpass';
			filter1.frequency.setValueAtTime(phoneme.f1, t0);
			filter1.Q.setValueAtTime(profile.q1, t0);

			// 3. Formant 2 Bandpass Filter (Oral Cavity)
			const filter2 = ctx.createBiquadFilter();
			filter2.type = 'bandpass';
			filter2.frequency.setValueAtTime(phoneme.f2, t0);
			filter2.Q.setValueAtTime(profile.q2, t0);

			// 4. Syllable Envelope Shaper
			const envGain = ctx.createGain();
			envGain.gain.setValueAtTime(0.001, t0);
			envGain.gain.linearRampToValueAtTime(safeVol, t0 + dur * 0.18);
			envGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

			// Connect Formant Banks
			osc.connect(filter1);
			osc.connect(filter2);
			filter1.connect(envGain);
			filter2.connect(envGain);

			// 5. Consonant Noise Burst
			if (phoneme.noise > 0 && noiseBuffer) {
				const noiseSource = ctx.createBufferSource();
				noiseSource.buffer = noiseBuffer;

				const noiseFilter = ctx.createBiquadFilter();
				noiseFilter.type = 'bandpass';
				noiseFilter.frequency.setValueAtTime(phoneme.f2 * 1.2, t0);
				noiseFilter.Q.setValueAtTime(2.0, t0);

				const noiseGain = ctx.createGain();
				const safeNoiseVol = Math.max(0.0001, safeVol * phoneme.noise * 0.6);
				noiseGain.gain.setValueAtTime(safeNoiseVol, t0);
				noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.6);

				noiseSource.connect(noiseFilter);
				noiseFilter.connect(noiseGain);
				noiseGain.connect(masterGain);

				noiseSource.start(t0);
				noiseSource.stop(t0 + dur);
			}

			envGain.connect(masterGain);

			osc.start(t0);
			osc.stop(t0 + dur);
		} catch (err) {
			// Audio node scheduling exceptions are non-fatal and safely ignored.
		}
	}
	//#endregion

	//#region [SEC-05] Sub-Harmonic Monster Growl Synthesizer
	/**
	 * Synthesizes sub-harmonic monster growl sound.
	 * [State Mutating]
	 * @param {number} [intensity=1.0] - Growl intensity factor.
	 * @returns {void}
	 */
	function growl(intensity = 1.0) {
		if (isMuted) return;
		ensureContext();
		if (!ctx || !masterGain) return;

		const t0 = ctx.currentTime;
		const dur = 0.42;
		const safeIntensity = Math.max(0.01, Math.min(1.0, intensity));
		const targetGain = Math.max(0.001, 0.32 * safeIntensity);

		try {
			// Sub-harmonic glottal pulse
			const osc = ctx.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(46, t0);
			osc.frequency.exponentialRampToValueAtTime(28, t0 + dur);

			// Vocal tract throat constriction filter
			const filter = ctx.createBiquadFilter();
			filter.type = 'bandpass';
			filter.frequency.setValueAtTime(180, t0);
			filter.Q.setValueAtTime(6.0, t0);

			// Envelope shaper
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0.001, t0);
			gain.gain.linearRampToValueAtTime(targetGain, t0 + 0.08);
			gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(masterGain);

			osc.start(t0);
			osc.stop(t0 + dur);
		} catch (err) {
			// Audio node scheduling exceptions are non-fatal and safely ignored.
		}
	}
	//#endregion

	//#region [SEC-06] Canonical Runtime Lifecycle Gateway & EventBus Subscriptions
	// --- CANONICAL RUNTIME INTERFACE ---
	/** @type {Array<function(): void>} */
	let unsubs = [];

	return {
		/**
		 * Initializes speech synthesizer driver with event bus.
		 * [Lifecycle: INIT]
		 * @param {any} bus - Event bus instance or host context wrapper.
		 * @returns {void}
		 */
		init(bus) {
			this.destroy();
			let resolvedBus = null;
			if (bus && typeof bus.subscribe === 'function') {
				resolvedBus = bus;
			} else if (bus?.eventBus && typeof bus.eventBus.subscribe === 'function') {
				resolvedBus = bus.eventBus;
			}
			eventBus = resolvedBus;
			armGestureUnlock();

			if (eventBus) {
				unsubs.push(
					eventBus.subscribe('dialogue:char', (/** @type {EventBusPayload} */ evt = {}) => {
						if (evt?.char) synthesizeBark(evt.char, evt.speaker);
					}),
					eventBus.subscribe('dialogue:sfx', (/** @type {EventBusPayload} */ evt = {}) => {
						if (evt?.sfx === 'SELECT' && evt?.char) {
							synthesizeBark(evt.char, evt.speaker);
						}
					}),
					eventBus.subscribe('audio:growl', (/** @type {EventBusPayload} */ evt = {}) => {
						this.growl(evt?.intensity ?? 1.0);
					}),
					eventBus.subscribe('system:command', (/** @type {EventBusPayload} */ evt = {}) => {
						if (evt?.command === 'TOGGLE_MUTE') {
							this.toggleMute();
						}
					})
				);
			}
		},

		growl,

		/**
		 * Speaks a single character phonetic bark.
		 * [State Mutating]
		 * @param {string} char - Character to speak.
		 * @param {string} [speakerKey] - Speaker profile key.
		 * @returns {void}
		 */
		speak(char, speakerKey) {
			if (!char) return;
			synthesizeBark(char, speakerKey);
		},

		/**
		 * Toggles global voice synthesizer mute state.
		 * [State Mutating]
		 * @returns {boolean} Current muted state.
		 */
		toggleMute() {
			isMuted = !isMuted;
			if (masterGain && ctx) {
				try {
					masterGain.gain.setValueAtTime(isMuted ? 0.0 : 1.0, ctx.currentTime);
				} catch (err) {
					// Audio parameter scheduling exceptions are non-fatal and safely ignored.
				}
			}
			return isMuted;
		},

		/**
		 * Retrieves driver diagnostic report.
		 * [Pure Query]
		 * @returns {VoiceDiagnostics} Diagnostic dictionary.
		 */
		getDiagnostics() {
			return {
				driverId: 'synthetic_voice_driver',
				contextState: ctx ? ctx.state : 'uninitialized',
				userUnlocked,
				isMuted,
				availableProfiles: Object.keys(PROFILES),
			};
		},

		/**
		 * Destroys synthesizer resources and unsubscribes event handlers.
		 * [Lifecycle: DESTROY]
		 * @returns {void}
		 */
		destroy() {
			unsubs.forEach((u) => {
				try {
					if (typeof u === 'function') u();
				} catch (err) {
					// Unsubscription handler exceptions are non-fatal and safely ignored.
				}
			});
			unsubs = [];

			if (ctx) {
				ctx.close().catch((err) => {
					// AudioContext closure errors are non-fatal and safely ignored.
				});
				ctx = null;
				masterGain = null;
			}
			eventBus = null;
			userUnlocked = false;
		},
	};
	//#endregion
})();

//#region [SEC-07] Global Environment & Window ScopeExport
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.EmberlightVoice = EmberlightVoice;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightVoice;
}
//#endregion