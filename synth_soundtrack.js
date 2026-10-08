/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: GENERATIVE CHIPTUNE & AMBIENT MUSIC ENGINE
 * Document Identifier: VSRP-001-SYNTH-SOUNDTRACK
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-WAR-TABLE-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Constants, Scales & Mood Configurations
 *   [SEC-02] Web Audio Context Initialization, Buffers & User Gesture Unlocking
 *   [SEC-03] Synthesis Channels (Bassline, Arpeggiator, Melody & Percussion)
 *   [SEC-04] Deterministic Step Sequencer Matrix Subroutines
 *   [SEC-05] Public VSRP-001 Peripheral Gateway & Lifecycle Interface
 * ============================================================================
 */

/**
 * @typedef {Object} SoundtrackDiagnostics
 * @property {string} driverId Internal driver identifier string.
 * @property {'TRACKER' | 'BYTEBEAT'} [playbackMode] Active audio playback mode.
 * @property {string} activeMood Active musical mood identifier.
 * @property {number} currentBPM Current beats per minute.
 * @property {number} currentStep Current active sequencer step.
 * @property {boolean} isMuted Mute status flag.
 * @property {string} contextState Web Audio context state string.
 */

/**
 * @typedef {Object} MoodConfig
 * @property {number} bpm Beats per minute.
 * @property {number} rootFreq Root frequency in Hz.
 * @property {number} filterCutoff Lowpass filter cutoff frequency.
 * @property {OscillatorType} bassType Bass oscillator waveform type.
 */

/**
 * @typedef {Object} SoundtrackEventBus
 * @property {(event: string, handler: (payload?: any) => void) => (() => void)} subscribe Subscription registration function.
 * @property {(event: string, payload?: any) => void} [publish] Event publishing function.
 */

const EmberlightSoundtrack = (() => {
	//#region [SEC-01] Type Definitions, Constants, Scales & Mood Configurations
	/** @type {AudioContext|null} */
	let ctx = null;
	/** @type {GainNode|null} */
	let masterGain = null;
	let isMuted = false;
	let userUnlocked = false;
	/** @type {SoundtrackEventBus|null} */
	let eventBus = null;
	/** @type {Array<() => void>} */
	let unsubs = [];

	// Active Sequencer State
	let currentMood = "SURFACE"; // 'SURFACE' | 'TOWN' | 'CATACOMBS' | 'COMBAT' | 'BOSS'
	let targetMood = "SURFACE";
	let currentBPM = 98;
	let targetBPM = 98;
	let currentStep = 0;
	let nextStepTime = 0;
	const LOOKAHEAD_SEC = 0.12; // 120ms forward scheduling window

	// Algorithmic Bytebeat State (AOP-BYTEBEAT-001)
	let playbackMode = "TRACKER"; // 'TRACKER' | 'BYTEBEAT'
	/** @type {AudioBufferSourceNode|null} */
	let bytebeatSource = null;

	// Noise Buffer Cache for Percussion
	/** @type {AudioBuffer|null} */
	let noiseBuffer = null;

	// --- SCALE DICTIONARIES (MIDI Note Arrays) ---
	const SCALES = {
		SURFACE: [57, 60, 62, 64, 67, 69, 72, 74], // A Dorian (A3 to D5)
		TOWN: [60, 62, 64, 66, 67, 69, 71, 72], // C Lydian (C4 to C5)
		CATACOMBS: [50, 53, 57, 58, 61, 62, 65, 69], // D Harmonic Minor
		COMBAT: [52, 53, 55, 57, 59, 60, 62, 64], // E Phrygian
		BOSS: [50, 51, 54, 56, 57, 60, 62, 63], // D Locrian / Diminished
	};

	/** @type {Record<string, MoodConfig>} */
	const MOOD_CONFIG = {
		SURFACE: {
			bpm: 98,
			rootFreq: 110.0,
			filterCutoff: 650,
			bassType: "triangle",
		},
		TOWN: { bpm: 86, rootFreq: 130.8, filterCutoff: 900, bassType: "triangle" },
		CATACOMBS: {
			bpm: 108,
			rootFreq: 73.4,
			filterCutoff: 420,
			bassType: "sawtooth",
		},
		COMBAT: {
			bpm: 138,
			rootFreq: 82.4,
			filterCutoff: 1200,
			bassType: "sawtooth",
		},
		BOSS: { bpm: 152, rootFreq: 73.4, filterCutoff: 1600, bassType: "square" },
	};

	/**
	 * Canonical 8-bit algorithmic Bytebeat formulas (AOP-BYTEBEAT-001).
	 * Evaluated on integer tick t at 8000 Hz virtual clock rate.
	 * @type {Readonly<Record<string, (t: number) => number>>}
	 */
	const BYTEBEAT_FORMULAS = Object.freeze({
		SURFACE: (t) => ((t * 5 & t >> 7) | (t * 3 & t >> 10)) & 0xFF,
		TOWN: (t) => (((t >> 6 | t | t >> (t >> 16)) * 10 + ((t >> 11) & 7)) & 0xFF),
		CATACOMBS: (t) => ((t * (t >> 11 & t >> 8 & 123 & t >> 3)) & 0xFF),
		COMBAT: (t) => ((((t * (t >> 8 | t >> 9) & 46 & t >> 8)) ^ (t & t >> 13 | t >> 6)) & 0xFF),
		BOSS: (t) => ((((t >> 7 | t | t >> 6) * 10 + 4 * (t & t >> 13 | t >> 6))) & 0xFF),
	});
	//#endregion

	//#region [SEC-02] Web Audio Context Initialization, Buffers & User Gesture Unlocking
	/**
	 * Converts a MIDI note number to frequency in Hertz.
	 * (Pure calculation utility)
	 * @param {number} midi MIDI note integer.
	 * @returns {number} Frequency in Hz.
	 */
	function midiToFreq(midi) {
		return 440 * 2 ** ((midi - 69) / 12);
	}

	/**
	 * Ensures the WebAudio context is initialized and active.
	 * (State-mutating audio context builder)
	 * @returns {void}
	 */
	function ensureContext() {
		if (!userUnlocked || typeof window === "undefined") return;
		if (!ctx) {
			const AudioContextClass =
				window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
			if (!AudioContextClass) return;
			try {
				ctx = new AudioContextClass();
				masterGain = ctx.createGain();
				masterGain.gain.setValueAtTime(isMuted ? 0.0 : 0.45, ctx.currentTime);
				masterGain.connect(ctx.destination);
				bakeNoiseBuffer();
			} catch {
				// Fallback gracefully if Web Audio context instantiation is denied by environment
				ctx = null;
			}
		}
		if (ctx?.state === "suspended") {
			ctx.resume().catch(() => { });
		}
	}

	/**
	 * Resolves EmberlightPRNG ambient module across browser and headless environments.
	 * @returns {any}
	 */
	function getPRNGModule() {
		if (typeof window !== "undefined") return window.EmberlightPRNG;
		if (typeof globalThis !== "undefined") return (/** @type {any} */ (globalThis)).EmberlightPRNG;
		return null;
	}

	/**
	 * Generates white noise buffer cache for percussion synthesis using deterministic PRNG.
	 * (State-mutating buffer generator)
	 * @returns {void}
	 */
	function bakeNoiseBuffer() {
		if (!ctx || typeof ctx.createBuffer !== "function") return;
		try {
			const bufferSize = Math.floor(ctx.sampleRate * 0.1);
			noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
			const output = noiseBuffer.getChannelData(0);
			const prngModule = getPRNGModule();
			const prng =
				prngModule && typeof prngModule.create === "function"
					? prngModule.create(1337)
					: null;
			for (let i = 0; i < bufferSize; i++) {
				const val = prng ? prng.nextFloat() : (i % 1000) / 500 - 1;
				output[i] = val * 2 - 1;
			}
		} catch {
			// Ignore buffer creation failures in headless or mocked audio environments
		}
	}

	/**
	 * Arms window gesture listeners to unlock audio context playback.
	 * (State-mutating DOM listener procedure)
	 * @returns {void}
	 */
	function armGestureUnlock() {
		if (
			typeof window === "undefined" ||
			typeof window.addEventListener !== "function"
		)
			return;
		const unlock = () => {
			userUnlocked = true;
			ensureContext();
			if (ctx && nextStepTime === 0) {
				nextStepTime = ctx.currentTime + 0.1;
			}
			window.removeEventListener("click", unlock);
			window.removeEventListener("keydown", unlock);
			window.removeEventListener("touchstart", unlock);
		};
		window.addEventListener("click", unlock, { once: true });
		window.addEventListener("keydown", unlock, { once: true });
		window.addEventListener("touchstart", unlock, { once: true });
	}
	//#endregion

	//#region [SEC-03] Synthesis Channels (Bassline, Arpeggiator, Melody & Percussion)
	// --- SYNTHESIS CHANNEL 1: BASSLINE ---
	/**
	 * Plays a synthesized bass note.
	 * (State-mutating audio scheduling procedure)
	 * @param {number} freq Note frequency in Hz.
	 * @param {number} time AudioContext schedule time.
	 * @param {number} duration Note duration in seconds.
	 * @param {OscillatorType} type Oscillator waveform type.
	 * @param {number} cutoff Filter cutoff frequency.
	 * @returns {void}
	 */
	function playBassNote(freq, time, duration, type, cutoff) {
		if (!ctx || isMuted || !masterGain) return;
		try {
			const osc = ctx.createOscillator();
			const filter = ctx.createBiquadFilter();
			const gain = ctx.createGain();

			osc.type = type;
			osc.frequency.setValueAtTime(freq, time);

			filter.type = "lowpass";
			filter.frequency.setValueAtTime(cutoff, time);
			filter.frequency.exponentialRampToValueAtTime(
				Math.max(40, cutoff * 0.4),
				time + duration,
			);

			gain.gain.setValueAtTime(0.28, time);
			gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(masterGain);

			osc.start(time);
			osc.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 2: 16TH-NOTE ARPEGGIATOR ---
	/**
	 * Plays an arpeggiated sequencer note.
	 * (State-mutating audio scheduling procedure)
	 * @param {number} freq Note frequency in Hz.
	 * @param {number} time AudioContext schedule time.
	 * @param {number} duration Note duration in seconds.
	 * @returns {void}
	 */
	function playArpNote(freq, time, duration) {
		if (!ctx || isMuted || !masterGain) return;
		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type =
				currentMood === "COMBAT" || currentMood === "BOSS"
					? "square"
					: "triangle";
			osc.frequency.setValueAtTime(freq, time);

			gain.gain.setValueAtTime(0.12, time);
			gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

			osc.connect(gain);
			gain.connect(masterGain);

			osc.start(time);
			osc.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 3: MELODY / MOTIF ---
	/**
	 * Plays a lead melody note.
	 * (State-mutating audio scheduling procedure)
	 * @param {number} freq Note frequency in Hz.
	 * @param {number} time AudioContext schedule time.
	 * @param {number} duration Note duration in seconds.
	 * @returns {void}
	 */
	function playLeadNote(freq, time, duration) {
		if (!ctx || isMuted || !masterGain) return;
		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, time);
			osc.frequency.exponentialRampToValueAtTime(
				freq * 1.01,
				time + duration * 0.5,
			);

			gain.gain.setValueAtTime(0.001, time);
			gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

			osc.connect(gain);
			gain.connect(masterGain);

			osc.start(time);
			osc.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 4: CHIPTUNE PERCUSSION ---
	/**
	 * Plays a chiptune percussion sound (kick, snare, hi-hat).
	 * (State-mutating audio scheduling procedure)
	 * @param {string} type Percussion type ('KICK' | 'SNARE' | 'HAT').
	 * @param {number} time AudioContext schedule time.
	 * @returns {void}
	 */
	function playPercussion(type, time) {
		if (!ctx || !noiseBuffer || isMuted || !masterGain) return;
		try {
			if (type === "KICK") {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "triangle";
				osc.frequency.setValueAtTime(120, time);
				osc.frequency.exponentialRampToValueAtTime(32, time + 0.08);

				gain.gain.setValueAtTime(0.35, time);
				gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

				osc.connect(gain);
				gain.connect(masterGain);
				osc.start(time);
				osc.stop(time + 0.09);
			} else if (type === "SNARE" || type === "HAT") {
				const node = ctx.createBufferSource();
				const filter = ctx.createBiquadFilter();
				const gain = ctx.createGain();

				node.buffer = noiseBuffer;
				filter.type = type === "HAT" ? "highpass" : "bandpass";
				filter.frequency.setValueAtTime(type === "HAT" ? 6000 : 1800, time);

				const dur = type === "HAT" ? 0.03 : 0.08;
				const vol = type === "HAT" ? 0.08 : 0.22;

				gain.gain.setValueAtTime(vol, time);
				gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

				node.connect(filter);
				filter.connect(gain);
				gain.connect(masterGain);

				node.start(time);
				node.stop(time + dur);
			}
		} catch {
			// Ignore buffer playback failures
		}
	}
	//#endregion

	//#region [SEC-04] Deterministic Step Sequencer Matrix Subroutines
	/**
	 * Schedules bass notes for the active step.
	 * (State-mutating sequencer routine)
	 * @param {number} stepIdx Step index in matrix.
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {MoodConfig} cfg Active mood configuration.
	 * @returns {void}
	 */
	function scheduleBass(stepIdx, stepTime, stepDuration, cfg) {
		if ([0, 3, 6, 10, 12].includes(stepIdx)) {
			const root = cfg.rootFreq;
			const octaveMod = stepIdx === 6 || stepIdx === 12 ? 1.5 : 1.0;
			playBassNote(
				root * octaveMod,
				stepTime,
				stepDuration * 2.2,
				cfg.bassType,
				cfg.filterCutoff,
			);
		}
	}

	/**
	 * Schedules arpeggiator notes for the active step.
	 * (State-mutating sequencer routine)
	 * @param {number} stepIdx Step index in matrix.
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {number[]} scale Active MIDI scale array.
	 * @returns {void}
	 */
	function scheduleArp(stepIdx, stepTime, stepDuration, scale) {
		const arpNoteIdx = (stepIdx * 3 + (stepIdx >= 8 ? 2 : 0)) % scale.length;
		const arpMidi = scale[arpNoteIdx];
		playArpNote(midiToFreq(arpMidi), stepTime, stepDuration * 0.85);
	}

	/**
	 * Schedules lead melody notes for the active step.
	 * (State-mutating sequencer routine)
	 * @param {number} stepIdx Step index in matrix.
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {number[]} scale Active MIDI scale array.
	 * @returns {void}
	 */
	function scheduleLead(stepIdx, stepTime, stepDuration, scale) {
		if (stepIdx === 0 || stepIdx === 8) {
			const leadNote = scale[(stepIdx === 0 ? 4 : 7) % scale.length] + 12;
			playLeadNote(midiToFreq(leadNote), stepTime, stepDuration * 3.8);
		}
	}

	/**
	 * Schedules percussion events for the active step.
	 * (State-mutating sequencer routine)
	 * @param {number} stepIdx Step index in matrix.
	 * @param {number} stepTime AudioContext schedule time.
	 * @returns {void}
	 */
	function schedulePercussion(stepIdx, stepTime) {
		if (currentMood === "COMBAT" || currentMood === "BOSS") {
			if (
				stepIdx === 0 ||
				stepIdx === 8 ||
				(currentMood === "BOSS" && stepIdx === 14)
			) {
				playPercussion("KICK", stepTime);
			}
			if (stepIdx === 4 || stepIdx === 12) {
				playPercussion("SNARE", stepTime);
			}
			if (stepIdx % 2 === 1) {
				playPercussion("HAT", stepTime);
			}
		} else if (currentMood === "CATACOMBS") {
			if (stepIdx === 0) playPercussion("KICK", stepTime);
			if (stepIdx === 8) playPercussion("HAT", stepTime);
		}
	}

	/**
	 * Schedules all sequencer channels for the current step.
	 * (State-mutating sequencer runner)
	 * @param {number} stepIdx Step index in matrix.
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @returns {void}
	 */
	function scheduleStep(stepIdx, stepTime, stepDuration) {
		const scale = (/** @type {Record<string, number[]>} */ (SCALES))[currentMood] || SCALES.SURFACE;
		const cfg = (/** @type {Record<string, any>} */ (MOOD_CONFIG))[currentMood] || MOOD_CONFIG.SURFACE;

		scheduleBass(stepIdx, stepTime, stepDuration, cfg);
		scheduleArp(stepIdx, stepTime, stepDuration, scale);
		scheduleLead(stepIdx, stepTime, stepDuration, scale);
		schedulePercussion(stepIdx, stepTime);
	}

	/**
	 * Evaluates an 8-bit bytebeat formula at sample tick t.
	 * Pure integer arithmetic procedure.
	 *
	 * @param {string} formulaKey - Mood identifier or formula name.
	 * @param {number} t - Non-negative integer time tick.
	 * @returns {number} Unsigned 8-bit integer in [0, 255].
	 */
	function evaluateBytebeatFormula(formulaKey, t) {
		const it = Math.trunc(t) >>> 0;
		switch (formulaKey) {
			case "TOWN":
				return (((it >> 6 | it | it >> (it >> 16)) * 10 + ((it >> 11) & 7)) & 0xFF);
			case "CATACOMBS":
				return ((it * (it >> 11 & it >> 8 & 123 & it >> 3)) & 0xFF);
			case "COMBAT":
				return ((((it * (it >> 8 | it >> 9) & 46 & it >> 8)) ^ (it & it >> 13 | it >> 6)) & 0xFF);
			case "BOSS":
				return ((((it >> 7 | it | it >> 6) * 10 + 4 * (it & it >> 13 | it >> 6))) & 0xFF);
			case "SURFACE":
			default:
				return (((it * 5 & it >> 7) | (it * 3 & it >> 10)) & 0xFF);
		}
	}

	/**
	 * Synthesizes an array of PCM samples using an algorithmic bytebeat expression.
	 * Pure DSP mathematical synthesis procedure.
	 *
	 * @param {string} formulaKey - Formula mood key ('SURFACE', 'TOWN', 'CATACOMBS', 'COMBAT', 'BOSS').
	 * @param {number} sampleCount - Total number of samples to synthesize.
	 * @param {number} [sampleRate=8000] - Playback sample rate in Hz.
	 * @returns {Float32Array} Normalized float PCM buffer in [-1.0, 1.0].
	 */
	function generateBytebeatPCM(formulaKey, sampleCount, sampleRate = 8000) {
		const count = Math.max(1, Math.floor(sampleCount));
		const pcm = new Float32Array(count);
		for (let i = 0; i < count; i++) {
			const byteVal = evaluateBytebeatFormula(formulaKey, i);
			pcm[i] = (byteVal / 127.5) - 1.0;
		}
		return pcm;
	}

	/**
	 * Constructs a Web Audio AudioBuffer for the given bytebeat formula.
	 * Resamples virtual 8000 Hz bytebeat clock into host AudioContext rate.
	 *
	 * @param {string} formulaKey - Formula mood key.
	 * @param {number} [durationSec=4.0] - Loop duration in seconds.
	 * @param {AudioContext | any} [targetCtx=ctx] - Target Web Audio context.
	 * @returns {AudioBuffer | any}
	 */
	function buildBytebeatAudioBuffer(formulaKey, durationSec = 4.0, targetCtx = ctx) {
		const sampleRate = targetCtx?.sampleRate || 8000;
		const bytebeatRate = 8000;
		const targetSamples = Math.floor(sampleRate * durationSec);
		const pcm = new Float32Array(targetSamples);
		const ratio = bytebeatRate / sampleRate;

		for (let i = 0; i < targetSamples; i++) {
			const tick = Math.floor(i * ratio);
			const byteVal = evaluateBytebeatFormula(formulaKey, tick);
			pcm[i] = (byteVal / 127.5) - 1.0;
		}

		if (targetCtx && typeof targetCtx.createBuffer === "function") {
			try {
				const buf = targetCtx.createBuffer(1, targetSamples, sampleRate);
				buf.getChannelData(0).set(pcm);
				return buf;
			} catch {
				// Fallback to conforming descriptor in headless contexts
			}
		}

		return {
			numberOfChannels: 1,
			length: targetSamples,
			sampleRate,
			duration: durationSec,
			getChannelData: () => pcm,
		};
	}

	/**
	 * Activates continuous loop streaming for the active bytebeat formula.
	 * (State-mutating Web Audio routine)
	 * @returns {void}
	 */
	function startBytebeatStream() {
		if (!userUnlocked || !ctx || !masterGain || isMuted) return;
		stopBytebeatStream();
		try {
			const buf = buildBytebeatAudioBuffer(currentMood, 4.0, ctx);
			if (buf && typeof ctx.createBufferSource === "function") {
				const src = ctx.createBufferSource();
				src.buffer = buf;
				src.loop = true;
				src.connect(masterGain);
				src.start(0);
				bytebeatSource = src;
			}
		} catch {
			bytebeatSource = null;
		}
	}

	/**
	 * Halts and detaches the active bytebeat streaming node.
	 * (State-mutating cleanup routine)
	 * @returns {void}
	 */
	function stopBytebeatStream() {
		if (bytebeatSource) {
			try {
				bytebeatSource.stop();
				bytebeatSource.disconnect();
			} catch {
				// Ignore node disconnect errors
			}
			bytebeatSource = null;
		}
	}
	//#endregion

	//#region [SEC-05] Public VSRP-001 Peripheral Gateway & Lifecycle Interface
	return {
		/**
		 * Initializes the soundtrack engine and event subscriptions.
		 * (State-mutating lifecycle gateway)
		 * @param {any} [bus] Event bus handle or parent context.
		 * @returns {void}
		 */
		init(bus) {
			this.destroy();
			let resolvedBus = null;
			if (bus && typeof bus.subscribe === "function") {
				resolvedBus = bus;
			} else if (
				bus?.eventBus &&
				typeof bus.eventBus.subscribe === "function"
			) {
				resolvedBus = bus.eventBus;
			}
			eventBus = resolvedBus;
			armGestureUnlock();

			if (eventBus) {
				let lastAmbientMood = "SURFACE";

				unsubs.push(
					eventBus.subscribe("world:zone_change", (evt = {}) => {
						const zone = evt?.zone || (evt?.townId ? "TOWN" : "SURFACE");
						let mood = "SURFACE";
						if (zone === "TOWN") {
							mood = "TOWN";
						} else if (zone === "CATACOMBS") {
							mood = "CATACOMBS";
						}
						lastAmbientMood = mood;
						if (currentMood !== "COMBAT" && currentMood !== "BOSS") {
							this.setMood(lastAmbientMood);
						}
					}),
					eventBus.subscribe("overworld:step", (evt = {}) => {
						const pos = evt?.pos;
						if (pos) {
							let amb;
							if (evt.townId || pos.townId || pos.inTown || pos.tile === "T" || pos.tile === "D") {
								amb = "TOWN";
							} else if (pos.depth && pos.depth > 0) {
								amb = "CATACOMBS";
							} else {
								amb = "SURFACE";
							}
							lastAmbientMood = amb;
							if (currentMood !== "COMBAT" && currentMood !== "BOSS") {
								this.setMood(amb);
							}
						}
					}),
					eventBus.subscribe("stage:biome", (evt = {}) => {
						const b = String(evt?.biome || "").toUpperCase();
						if (b.includes("CRYPT") || b.includes("CATACOMB"))
							lastAmbientMood = "CATACOMBS";
						else if (b.includes("TOWN")) lastAmbientMood = "TOWN";
						else if (b.includes("MEADOW") || b.includes("SURFACE"))
							lastAmbientMood = "SURFACE";
						if (currentMood !== "COMBAT" && currentMood !== "BOSS") {
							this.setMood(lastAmbientMood);
						}
					}),
					eventBus.subscribe("overworld:encounter", (evt = {}) => {
						const encounterKey = evt?.encounterKey;
						if (encounterKey === "BOSS_MALAKOR") {
							this.setMood("BOSS");
						} else {
							this.setMood("COMBAT");
						}
					}),
					eventBus.subscribe("combat:resolved", () => {
						this.setMood(lastAmbientMood || "SURFACE");
					}),
					eventBus.subscribe("system:command", (evt = {}) => {
						if (evt?.command === "TOGGLE_MUTE") {
							this.toggleMute();
						} else if (evt?.command === "SET_PLAYBACK_MODE" && evt?.value) {
							this.setPlaybackMode(evt.value);
						}
					}),
				);
			}
		},

		/**
		 * Sets the active or target soundtrack mood.
		 * (State-mutating action gateway)
		 * @param {string} newMood Target mood identifier string.
		 * @returns {void}
		 */
		setMood(newMood) {
			if (!MOOD_CONFIG[newMood]) return;
			targetMood = newMood;
			targetBPM = MOOD_CONFIG[newMood].bpm;
			if (playbackMode === "BYTEBEAT" && currentMood !== newMood) {
				currentMood = newMood;
				startBytebeatStream();
			}
		},

		/**
		 * Sets the soundtrack playback engine mode ('TRACKER' or 'BYTEBEAT').
		 * (State-mutating action gateway)
		 * @param {'TRACKER' | 'BYTEBEAT'} mode
		 * @returns {'TRACKER' | 'BYTEBEAT'}
		 */
		setPlaybackMode(mode) {
			const target = mode === "BYTEBEAT" ? "BYTEBEAT" : "TRACKER";
			if (playbackMode !== target) {
				playbackMode = target;
				if (playbackMode === "BYTEBEAT") {
					startBytebeatStream();
				} else {
					stopBytebeatStream();
					if (ctx && nextStepTime === 0) {
						nextStepTime = ctx.currentTime + 0.05;
					}
				}
			}
			return playbackMode;
		},

		/**
		 * Retrieves the active playback mode.
		 * @returns {'TRACKER' | 'BYTEBEAT'}
		 */
		getPlaybackMode() {
			return playbackMode;
		},

		/**
		 * Evaluates an 8-bit bytebeat formula at tick t.
		 * @param {string} formulaKey
		 * @param {number} t
		 * @returns {number}
		 */
		evaluateBytebeatFormula(formulaKey, t) {
			return evaluateBytebeatFormula(formulaKey, t);
		},

		/**
		 * Generates raw Float32Array PCM samples from a bytebeat expression.
		 * @param {string} formulaKey
		 * @param {number} sampleCount
		 * @param {number} [sampleRate=8000]
		 * @returns {Float32Array}
		 */
		generateBytebeatPCM(formulaKey, sampleCount, sampleRate = 8000) {
			return generateBytebeatPCM(formulaKey, sampleCount, sampleRate);
		},

		/**
		 * Builds a Web Audio buffer containing a bytebeat loop.
		 * @param {string} formulaKey
		 * @param {number} [durationSec=4.0]
		 * @param {any} [targetCtx]
		 * @returns {any}
		 */
		buildBytebeatAudioBuffer(formulaKey, durationSec = 4.0, targetCtx) {
			return buildBytebeatAudioBuffer(formulaKey, durationSec, targetCtx);
		},

		/**
		 * Exposes the immutable Bytebeat formulas catalog.
		 * @returns {typeof BYTEBEAT_FORMULAS}
		 */
		getBytebeatFormulas() {
			return BYTEBEAT_FORMULAS;
		},

		/**
		 * Toggles global soundtrack mute state.
		 * (State-mutating action gateway)
		 * @returns {boolean} Current mute status flag.
		 */
		toggleMute() {
			isMuted = !isMuted;
			if (masterGain && ctx) {
				masterGain.gain.setValueAtTime(isMuted ? 0.0 : 0.45, ctx.currentTime);
			}
			if (playbackMode === "BYTEBEAT") {
				if (isMuted) {
					stopBytebeatStream();
				} else {
					startBytebeatStream();
				}
			}
			return isMuted;
		},

		/**
		 * Lookahead frame scheduler driven by GameRuntime.hostTick(dt).
		 * Strictly satisfies VSRP-001 (Zero unmanaged clocks).
		 * (State-mutating update runner)
		 * @param {number} [_dt=0.016] Delta time in seconds.
		 * @returns {void}
		 */
		update(_dt = 0.016) {
			if (!userUnlocked || !ctx) return;

			if (playbackMode === "BYTEBEAT") {
				if (!bytebeatSource && !isMuted) {
					startBytebeatStream();
				}
				return;
			}

			if (currentMood !== targetMood) {
				currentMood = targetMood;
				currentBPM = targetBPM;
			}

			const bpm = Math.max(20, Math.min(300, currentBPM || 98));
			const stepDuration = 60 / (bpm * 4); // 16th note in seconds

			const now = ctx.currentTime;
			if (nextStepTime < now - 0.5) {
				// Tab was throttled or backgrounded, resync to present
				nextStepTime = now;
			}

			let safetyCount = 0;
			while (nextStepTime < now + LOOKAHEAD_SEC && safetyCount < 32) {
				scheduleStep(currentStep, nextStepTime, stepDuration);
				nextStepTime += stepDuration;
				currentStep = (currentStep + 1) % 16;
				safetyCount++;
			}
		},

		/**
		 * Collects real-time soundtrack diagnostic telemetry.
		 * (Pure telemetry collector)
		 * @returns {SoundtrackDiagnostics} Diagnostic report dictionary.
		 */
		getDiagnostics() {
			return {
				driverId: "synth_soundtrack_driver",
				playbackMode,
				activeMood: currentMood,
				currentBPM,
				currentStep,
				isMuted,
				contextState: ctx ? ctx.state : "uninitialized",
			};
		},

		/**
		 * Purges runtime WebAudio nodes, unsubscriptions, and resets state.
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() {
			unsubs.forEach((u) => {
				try {
					if (typeof u === "function") u();
				} catch {
					// Ignore unbind errors
				}
			});
			unsubs = [];

			stopBytebeatStream();

			if (ctx) {
				ctx.close().catch(() => { });
				ctx = null;
				masterGain = null;
			}
			eventBus = null;
			userUnlocked = false;
			nextStepTime = 0;
			currentStep = 0;
		},
	};
	//#endregion
})();

if (typeof window !== "undefined") {
	window.EmberlightSoundtrack = EmberlightSoundtrack;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightSoundtrack;
}
