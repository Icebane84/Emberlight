/* cSpell:words VSRP BYTEBEAT Bytebeat bytebeat */
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
 * @property {string} [subsystemId] Subsystem identifier (e.g. SUBSYSTEM_C).
 * @property {string} [subsystemName] Formal subsystem name.
 * @property {'TRACKER' | 'BYTEBEAT'} [playbackMode] Active audio playback mode.
 * @property {string} activeMood Active musical mood identifier.
 * @property {string} [activeMoodTitle] Title of active musical mood.
 * @property {string} [activeScale] Active musical scale name.
 * @property {number} currentBPM Current beats per minute.
 * @property {number} currentStep Current active sequencer step.
 * @property {number} [currentBar] Current active 4-bar phrase index (0-3).
 * @property {boolean} isMuted Mute status flag.
 * @property {number} [delayFeedbackMs] Feedback delay in ms.
 * @property {boolean} [vacuumTubePreampActive] Vacuum-tube preamp active flag.
 * @property {string} contextState Web Audio context state string.
 */

/**
 * @typedef {Object} MoodConfig
 * @property {string} [title] Human-readable title for the musical mood.
 * @property {number} bpm Beats per minute.
 * @property {string} [scale] Scale name.
 * @property {number} rootFreq Root frequency in Hz.
 * @property {number} filterCutoff Lowpass filter cutoff frequency.
 * @property {OscillatorType} bassType Bass oscillator waveform type.
 * @property {string} [description] Descriptive lore/texture.
 * @property {string} [progression] Harmonic progression notation.
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

	// Vacuum-Tube Audio Preamplifier WaveShaper (Subsystem C)
	/** @type {WaveShaperNode|null} */
	let tubePreampNode = null;

	/**
	 * Canonical Subsystem C Specification & Resonance Metadata (CANON-MAGITEK-AETHERPUNK-001)
	 */
	const RESONATOR_METADATA = Object.freeze({
		subsystemId: "SUBSYSTEM_C",
		name: "The Subterranean Ley-Flux Acoustic Resonator",
		diegeticLore:
			"The soundtrack is not an arbitrary musical accompaniment; it is the amplified electromagnetic resonance of the subterranean leylines flowing through deep rock strata, captured by wire-wound copper induction coils mounted on the table's foundation pylons.",
		consoleInterface:
			"Vacuum-tube audio preamplifiers, twin-detuned Commodore SID-style pulse-width modulators, and an internal SPC700-style acoustic echo delay line (240ms feedback loop).",
		delayFeedbackMs: 240,
		bytebeatClockHz: 8000,
		supportedModes: Object.freeze(["TRACKER", "BYTEBEAT"]),
	});

	// Stereo Feedback Echo Bus (SPC700 Emulation - 240ms feedback loop)
	/** @type {DelayNode|null} */
	let delayNode = null;
	/** @type {GainNode|null} */
	let delayFeedbackGain = null;
	/** @type {BiquadFilterNode|null} */
	let delayFilter = null;
	/** @type {GainNode|null} */
	let delaySendGain = null;

	// Algorithmic Bytebeat State (AOP-BYTEBEAT-001)
	/** @type {'TRACKER' | 'BYTEBEAT'} */
	let playbackMode = "TRACKER";
	/** @type {AudioBufferSourceNode|null} */
	let bytebeatSource = null;

	// Noise Buffer Cache for Percussion
	/** @type {AudioBuffer|null} */
	let noiseBuffer = null;

	// --- MOOD CONFIGURATIONS ---

	/** @type {Record<string, MoodConfig>} */
	const MOOD_CONFIG = {
		SURFACE: {
			title: "Horizon of Embers",
			bpm: 98,
			scale: "A Dorian",
			rootFreq: 110.0,
			filterCutoff: 650,
			bassType: "triangle",
			description: "Windswept nomadic flute leads bathed in stereo delay",
			progression: "Am7 -> Fmaj7 -> Cmaj7 -> Em7/D",
		},
		TOWN: {
			title: "Oakhaven Hearth",
			bpm: 86,
			scale: "C Lydian",
			rootFreq: 130.8,
			filterCutoff: 900,
			bassType: "triangle",
			description: "Warm acoustic lute and harp fingerpicking dancing across cobblestones and magma boilers",
			progression: "Cmaj7 -> D/C -> Fmaj7 -> G7",
		},
		CATACOMBS: {
			title: "Subterranean Hollows",
			bpm: 108,
			scale: "D Harmonic Minor",
			rootFreq: 73.4,
			filterCutoff: 420,
			bassType: "sawtooth",
			description: "Echoing subterranean drip delay, augmented-fourth mystery, and haunting low-pass filter sweeps",
			progression: "Dm -> Bbmaj7 -> Gm6 -> A7b9",
		},
		COMBAT: {
			title: "Phrygian Blitz",
			bpm: 138,
			scale: "E Phrygian",
			rootFreq: 82.4,
			filterCutoff: 1200,
			bassType: "sawtooth",
			description: "Driving 16th-note galloping square basslines, searing pitch-scooped lead synths, and explosive Bar-4 cadence drum fills",
			progression: "Em -> F/E -> Dm/E -> Bdim7",
		},
		BOSS: {
			title: "Malakor's Requiem",
			bpm: 152,
			scale: "D Locrian",
			rootFreq: 73.4,
			filterCutoff: 1600,
			bassType: "square",
			description: "Heavy distorted square-wave overdrive, apocalyptic chromatic descents, and industrial polyrhythms",
			progression: "Ddim -> Eb/D -> Cm/D -> Ab5/Bbdim",
		},
	};

	/**
	 * 4-Bar Chord Progressions per Mood (AOP-TRACKER-002)
	 * Each mood has 4 bars of distinct harmonic development.
	 * @type {Record<string, Array<{ rootFreq: number, arpNotes: number[], leadNote?: number }>>}
	 */
	const CHORD_PROGRESSIONS = {
		SURFACE: [
			// Bar 0: Am7 (A - C - E - G) - The Wandering Nomad
			{ rootFreq: 110.0, arpNotes: [57, 60, 64, 67, 69, 72, 76, 79], leadNote: 69 },
			// Bar 1: Fmaj7 (F - A - C - E) - Soaring Horizon
			{ rootFreq: 87.31, arpNotes: [53, 57, 60, 65, 69, 72, 77, 81], leadNote: 72 },
			// Bar 2: Cmaj7 (C - E - G - B) - Hopeful Vista
			{ rootFreq: 130.81, arpNotes: [48, 55, 60, 64, 67, 72, 76, 79], leadNote: 76 },
			// Bar 3: Em7 -> D (E - G - B - D) - Nomad Cadence
			{ rootFreq: 82.41, arpNotes: [52, 55, 59, 62, 67, 71, 74, 79], leadNote: 71 },
		],
		TOWN: [
			// Bar 0: Cmaj7 (C - E - G - B) - Oakhaven Hearth
			{ rootFreq: 65.41, arpNotes: [60, 64, 67, 71, 72, 76, 79, 83], leadNote: 72 },
			// Bar 1: D/C - Lydian #4 (D - F# - A - C) - Market Wonder
			{ rootFreq: 73.42, arpNotes: [62, 66, 69, 72, 74, 78, 81, 84], leadNote: 74 },
			// Bar 2: Fmaj7 (F - A - C - E) - Cobblestone Stroll
			{ rootFreq: 87.31, arpNotes: [53, 57, 60, 65, 69, 72, 77, 81], leadNote: 69 },
			// Bar 3: Gsus4 -> G7 (G - C - D -> G - B - D - F) - Tavern Welcome
			{ rootFreq: 98.00, arpNotes: [55, 60, 62, 65, 67, 71, 74, 79], leadNote: 71 },
		],
		COMBAT: [
			// Bar 0: Em (Driving Root - E Phrygian) - Vanguard Advance
			{ rootFreq: 82.41, arpNotes: [52, 55, 59, 64, 67, 71, 76, 79], leadNote: 76 },
			// Bar 1: F/E (Neapolitan Tension - F - A - C) - Gothic Clash
			{ rootFreq: 87.31, arpNotes: [53, 57, 60, 65, 69, 72, 77, 81], leadNote: 77 },
			// Bar 2: Dm/E (D - F - A) - Counter-Offensive
			{ rootFreq: 73.42, arpNotes: [50, 53, 57, 62, 65, 69, 74, 77], leadNote: 74 },
			// Bar 3: Bdim -> C turnaround - Climax & Fill
			{ rootFreq: 61.74, arpNotes: [47, 50, 53, 56, 59, 62, 65, 68], leadNote: 71 },
		],
		BOSS: [
			// Bar 0: Ddim / D Locrian - Dread Eclipse
			{ rootFreq: 73.42, arpNotes: [50, 53, 56, 62, 65, 68, 74, 77], leadNote: 74 },
			// Bar 1: Eb/D - Tritone Crushing Pressure
			{ rootFreq: 77.78, arpNotes: [51, 55, 58, 63, 67, 70, 75, 79], leadNote: 75 },
			// Bar 2: Cm/D - Industrial Grind
			{ rootFreq: 65.41, arpNotes: [48, 51, 55, 60, 63, 67, 72, 75], leadNote: 72 },
			// Bar 3: Ab5 / Bbdim - Apocalyptic Requiem
			{ rootFreq: 51.91, arpNotes: [44, 48, 51, 56, 60, 63, 68, 72], leadNote: 68 },
		],
		CATACOMBS: [
			// Bar 0: Dm (D Harmonic Minor) - Subterranean Hollows
			{ rootFreq: 73.42, arpNotes: [50, 53, 57, 62, 65, 69, 74, 77], leadNote: 69 },
			// Bar 1: Bbmaj7 - Whispering Shadows
			{ rootFreq: 58.27, arpNotes: [46, 50, 53, 58, 62, 65, 70, 74], leadNote: 70 },
			// Bar 2: Gm6 - Ancient Relic Chamber
			{ rootFreq: 49.00, arpNotes: [43, 46, 50, 55, 58, 62, 67, 71], leadNote: 67 },
			// Bar 3: A7b9 - Augmented Descent
			{ rootFreq: 55.00, arpNotes: [45, 49, 52, 55, 58, 61, 64, 67], leadNote: 69 },
		],
	};

	/**
	 * Canonical 4-Bar Melodic Motifs (AOP-TRACKER-003)
	 * Each entry: { step: number (0-15), midi: number, dur: number (in steps), slide?: number }
	 * @type {Record<string, Array<Array<{ step: number, midi: number, dur: number, slide?: number }>>>}
	 */
	const LEAD_PHRASES = {
		SURFACE: [
			// Bar 0: The Wandering Nomad Call
			[
				{ step: 0, midi: 69, dur: 3 },
				{ step: 4, midi: 72, dur: 2 },
				{ step: 7, midi: 71, dur: 1 },
				{ step: 8, midi: 69, dur: 4 },
				{ step: 14, midi: 72, dur: 2 },
			],
			// Bar 1: Soaring Horizon Lift
			[
				{ step: 0, midi: 74, dur: 3 },
				{ step: 4, midi: 76, dur: 3 },
				{ step: 8, midi: 77, dur: 4 },
				{ step: 13, midi: 76, dur: 3 },
			],
			// Bar 2: Hopeful Vista Peak
			[
				{ step: 0, midi: 79, dur: 4 },
				{ step: 5, midi: 76, dur: 2 },
				{ step: 8, midi: 74, dur: 3 },
				{ step: 12, midi: 72, dur: 3 },
			],
			// Bar 3: Resolution & Cadence
			[
				{ step: 0, midi: 71, dur: 3 },
				{ step: 4, midi: 67, dur: 3 },
				{ step: 8, midi: 69, dur: 6, slide: 71 },
			],
		],
		TOWN: [
			// Bar 0: Oakhaven Fireside
			[
				{ step: 0, midi: 72, dur: 3 },
				{ step: 4, midi: 76, dur: 2 },
				{ step: 6, midi: 74, dur: 2 },
				{ step: 8, midi: 72, dur: 4 },
				{ step: 14, midi: 74, dur: 2 },
			],
			// Bar 1: Lydian Sparkle (#4 F#)
			[
				{ step: 0, midi: 78, dur: 3 },
				{ step: 4, midi: 76, dur: 3 },
				{ step: 8, midi: 74, dur: 4 },
				{ step: 13, midi: 76, dur: 2 },
			],
			// Bar 2: Cobblestone Waltz
			[
				{ step: 0, midi: 77, dur: 3 },
				{ step: 4, midi: 76, dur: 2 },
				{ step: 7, midi: 72, dur: 2 },
				{ step: 10, midi: 69, dur: 4 },
			],
			// Bar 3: Homecoming Cadence
			[
				{ step: 0, midi: 71, dur: 3 },
				{ step: 4, midi: 74, dur: 3 },
				{ step: 8, midi: 72, dur: 6 },
			],
		],
		COMBAT: [
			// Bar 0: Iron Vanguard Advance
			[
				{ step: 0, midi: 64, dur: 2, slide: 67 },
				{ step: 3, midi: 67, dur: 2 },
				{ step: 6, midi: 65, dur: 2 },
				{ step: 8, midi: 64, dur: 3 },
				{ step: 12, midi: 71, dur: 2 },
				{ step: 14, midi: 72, dur: 2 },
			],
			// Bar 1: Neapolitan Gothic Strike (F Phrygian peak)
			[
				{ step: 0, midi: 72, dur: 2 },
				{ step: 3, midi: 74, dur: 2 },
				{ step: 6, midi: 76, dur: 2 },
				{ step: 8, midi: 77, dur: 3 },
				{ step: 12, midi: 76, dur: 2 },
				{ step: 14, midi: 74, dur: 2 },
			],
			// Bar 2: Blade Flurry Counter
			[
				{ step: 0, midi: 72, dur: 2 },
				{ step: 3, midi: 71, dur: 2 },
				{ step: 6, midi: 69, dur: 2 },
				{ step: 8, midi: 67, dur: 3 },
				{ step: 12, midi: 65, dur: 2 },
				{ step: 14, midi: 64, dur: 2 },
			],
			// Bar 3: Turnaround Surge into Drum Fill
			[
				{ step: 0, midi: 71, dur: 2 },
				{ step: 3, midi: 72, dur: 2 },
				{ step: 6, midi: 74, dur: 2 },
				{ step: 8, midi: 75, dur: 3 },
				{ step: 12, midi: 76, dur: 4 },
			],
		],
		BOSS: [
			// Bar 0: Malakor's Dark Dread
			[
				{ step: 0, midi: 62, dur: 3 },
				{ step: 4, midi: 65, dur: 2 },
				{ step: 7, midi: 68, dur: 3 },
				{ step: 11, midi: 67, dur: 2 },
				{ step: 13, midi: 65, dur: 3 },
			],
			// Bar 1: Apocalypse Descending Run
			[
				{ step: 0, midi: 74, dur: 2 },
				{ step: 3, midi: 73, dur: 2 },
				{ step: 6, midi: 71, dur: 2 },
				{ step: 9, midi: 70, dur: 2 },
				{ step: 12, midi: 68, dur: 4 },
			],
			// Bar 2: Chaos Triplet Accents
			[
				{ step: 0, midi: 62, dur: 2 },
				{ step: 3, midi: 68, dur: 2 },
				{ step: 6, midi: 74, dur: 3 },
				{ step: 10, midi: 71, dur: 2 },
				{ step: 13, midi: 68, dur: 3 },
			],
			// Bar 3: Eclipse Turnaround
			[
				{ step: 0, midi: 67, dur: 3 },
				{ step: 4, midi: 65, dur: 3 },
				{ step: 8, midi: 63, dur: 3 },
				{ step: 12, midi: 62, dur: 4 },
			],
		],
		CATACOMBS: [
			// Bar 0: Echoing Cavern Drip
			[
				{ step: 0, midi: 62, dur: 4 },
				{ step: 6, midi: 65, dur: 3 },
				{ step: 11, midi: 69, dur: 4 },
			],
			// Bar 1: Subterranean Hollow
			[
				{ step: 0, midi: 70, dur: 4 },
				{ step: 6, midi: 69, dur: 3 },
				{ step: 10, midi: 65, dur: 4 },
			],
			// Bar 2: Forgotten Catacomb Crypt
			[
				{ step: 0, midi: 67, dur: 4 },
				{ step: 6, midi: 66, dur: 3 },
				{ step: 10, midi: 62, dur: 4 },
			],
			// Bar 3: Resonant Augmented 4th Cadence
			[
				{ step: 0, midi: 68, dur: 3 },
				{ step: 4, midi: 69, dur: 3 },
				{ step: 8, midi: 61, dur: 3 },
				{ step: 12, midi: 62, dur: 4 },
			],
		],
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
	 * Builds a soft-saturation transfer curve emulating vacuum-tube triode preamplifiers.
	 * Pure DSP mathematical array generator for Subsystem C induction coil preamplification.
	 * @param {number} [samples=256] Number of points in lookup table.
	 * @param {number} [k=1.8] Saturation curvature parameter.
	 * @returns {Float32Array} Transfer lookup curve bounded in [-1.0, 1.0].
	 */
	function buildTubeSaturationCurve(samples = 256, k = 1.8) {
		const count = Math.max(16, Math.floor(samples));
		const curve = new Float32Array(count);
		for (let i = 0; i < count; i++) {
			const x = (i * 2) / (count - 1) - 1;
			// Soft-clipping hyperbolic/rational curve modeling vacuum-tube compression:
			// f(x) = (1 + k) * x / (1 + k * |x|)
			curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
		}
		return curve;
	}

	/**
	 * Ensures the WebAudio context is initialized and active.
	 * (State-mutating audio context builder)
	 * @returns {void}
	 */
	/**
	 * Instantiates and wires the vacuum-tube waveshaper preamplifier node.
	 * Pure setup helper.
	 * @param {AudioContext} audioCtx
	 * @param {GainNode} outGain
	 * @returns {WaveShaperNode|null}
	 */
	function _initTubePreamp(audioCtx, outGain) {
		if (typeof audioCtx.createWaveShaper !== "function") return null;
		try {
			const node = audioCtx.createWaveShaper();
			node.curve = /** @type {any} */ (buildTubeSaturationCurve(256, 1.8));
			node.oversample = "2x";
			node.connect(outGain);
			return node;
		} catch {
			return null;
		}
	}

	/**
	 * Configures stereo feedback delay loop for SPC700 acoustic emulation.
	 * State-mutating setup helper.
	 * @param {AudioContext} audioCtx
	 * @param {AudioNode} voiceBus
	 * @returns {void}
	 */
	function _initDelayBus(audioCtx, voiceBus) {
		if (typeof audioCtx.createDelay !== "function") return;
		try {
			delayNode = audioCtx.createDelay();
			delayNode.delayTime.setValueAtTime(0.24, audioCtx.currentTime);

			delayFeedbackGain = audioCtx.createGain();
			delayFeedbackGain.gain.setValueAtTime(0.32, audioCtx.currentTime);

			delayFilter = audioCtx.createBiquadFilter();
			delayFilter.type = "lowpass";
			delayFilter.frequency.setValueAtTime(1400, audioCtx.currentTime);

			delaySendGain = audioCtx.createGain();
			delaySendGain.gain.setValueAtTime(0.38, audioCtx.currentTime);

			delaySendGain.connect(delayNode);
			delayNode.connect(delayFilter);
			delayFilter.connect(delayFeedbackGain);
			delayFeedbackGain.connect(delayNode);
			delayFilter.connect(voiceBus);
		} catch {
			delayNode = null;
			delayFeedbackGain = null;
			delayFilter = null;
			delaySendGain = null;
		}
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

				tubePreampNode = _initTubePreamp(ctx, masterGain);
				const voiceBus = tubePreampNode || masterGain;
				_initDelayBus(ctx, voiceBus);

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
	/**
	 * Synthesizes a twin-detuned Commodore SID-style pulse-width modulated voice.
	 * Detunes twin oscillators (±cents) with optional pitch scoop, envelope shaping,
	 * and vacuum-tube saturation routing.
	 * (State-mutating audio scheduling procedure)
	 * @param {number} freq Note frequency in Hz.
	 * @param {number} time AudioContext schedule time.
	 * @param {number} duration Note duration in seconds.
	 * @param {Object} [opts] Voice synthesis options.
	 * @param {OscillatorType} [opts.type='square'] Oscillator waveform.
	 * @param {number} [opts.detuneCents=8] Detune spread in cents.
	 * @param {number} [opts.cutoff=1400] Filter cutoff frequency in Hz.
	 * @param {number} [opts.peakGain=0.22] Peak voice amplitude.
	 * @param {number} [opts.pitchScoop] Exponential pitch scoop multiplier.
	 * @param {number} [opts.slideFreq] Expressive slide destination frequency in Hz.
	 * @param {boolean} [opts.sendEcho=false] Route into 240ms SPC700 delay bus.
	 * @returns {void}
	 */
	function playSIDVoice(freq, time, duration, opts = {}) {
		if (!ctx || isMuted || !masterGain) return;
		try {
			const osc1 = ctx.createOscillator();
			const osc2 = ctx.createOscillator();
			const filter = ctx.createBiquadFilter();
			const gain = ctx.createGain();

			const oscType = opts.type || "square";
			osc1.type = oscType;
			osc2.type = oscType;

			const cents = opts.detuneCents || 8;
			if (osc1.detune) osc1.detune.setValueAtTime(-cents, time);
			if (osc2.detune) osc2.detune.setValueAtTime(cents, time);

			if (opts.pitchScoop) {
				osc1.frequency.setValueAtTime(freq * opts.pitchScoop, time);
				osc1.frequency.exponentialRampToValueAtTime(freq, time + 0.025);
				osc2.frequency.setValueAtTime(freq * opts.pitchScoop, time);
				osc2.frequency.exponentialRampToValueAtTime(freq, time + 0.025);
			} else {
				osc1.frequency.setValueAtTime(freq, time);
				osc2.frequency.setValueAtTime(freq, time);
			}

			if (opts.slideFreq) {
				osc1.frequency.setValueAtTime(freq, time + duration * 0.3);
				osc1.frequency.linearRampToValueAtTime(opts.slideFreq, time + duration * 0.85);
				osc2.frequency.setValueAtTime(freq, time + duration * 0.3);
				osc2.frequency.linearRampToValueAtTime(opts.slideFreq, time + duration * 0.85);
			}

			const cutoff = opts.cutoff || 1400;
			filter.type = "lowpass";
			filter.frequency.setValueAtTime(cutoff, time);
			filter.frequency.exponentialRampToValueAtTime(
				Math.max(40, cutoff * 0.4),
				time + duration,
			);

			const peak = opts.peakGain || 0.22;
			gain.gain.setValueAtTime(0.001, time);
			gain.gain.linearRampToValueAtTime(peak, time + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

			osc1.connect(filter);
			osc2.connect(filter);
			filter.connect(gain);

			const voiceBus = tubePreampNode || masterGain;
			gain.connect(voiceBus);

			if (opts.sendEcho && delaySendGain) {
				gain.connect(delaySendGain);
			}

			osc1.start(time);
			osc2.start(time);
			osc1.stop(time + duration);
			osc2.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 1: BASSLINE ---
	/**
	 * Plays a synthesized bass note.
	 * Employs twin-detuned Commodore SID PWM in combat/boss profiles, or filtered waves in ambient profiles.
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
		if (currentMood === "COMBAT") {
			playSIDVoice(freq, time, duration, {
				type: "square",
				detuneCents: 9,
				cutoff,
				peakGain: 0.28,
			});
			return;
		}
		if (currentMood === "BOSS") {
			playSIDVoice(freq, time, duration, {
				type: "square",
				detuneCents: 12,
				cutoff: cutoff * 1.25,
				peakGain: 0.32,
			});
			return;
		}
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
			const voiceBus = tubePreampNode || masterGain;
			gain.connect(voiceBus);

			osc.start(time);
			osc.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 2: 16TH-NOTE ARPEGGIATOR ---
	/**
	 * Plays an arpeggiated sequencer note routed through the vacuum-tube preamplifier.
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

			const peakGain = currentMood === "COMBAT" ? 0.14 : 0.11;
			gain.gain.setValueAtTime(peakGain, time);
			gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

			osc.connect(gain);
			const voiceBus = tubePreampNode || masterGain;
			gain.connect(voiceBus);

			// Send gentle arpeggios to delay bus in TOWN and SURFACE (240ms SPC700 feedback loop)
			if (delaySendGain && (currentMood === "TOWN" || currentMood === "SURFACE")) {
				gain.connect(delaySendGain);
			}

			osc.start(time);
			osc.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 3: MELODY / MOTIF ---
	/**
	 * Plays a lead melody note with optional expressive pitch slide and twin-detuned SID PWM.
	 * (State-mutating audio scheduling procedure)
	 * @param {number} freq Note frequency in Hz.
	 * @param {number} time AudioContext schedule time.
	 * @param {number} duration Note duration in seconds.
	 * @param {number} [slideFreq] Optional pitch slide target frequency in Hz.
	 * @returns {void}
	 */
	function playLeadNote(freq, time, duration, slideFreq) {
		if (!ctx || isMuted || !masterGain) return;
		if (currentMood === "COMBAT") {
			playSIDVoice(freq, time, duration, {
				type: "square",
				detuneCents: 8,
				pitchScoop: 0.94,
				slideFreq,
				cutoff: 2400,
				peakGain: 0.22,
				sendEcho: true,
			});
			return;
		}
		if (currentMood === "BOSS") {
			playSIDVoice(freq, time, duration, {
				type: "sawtooth",
				detuneCents: 11,
				slideFreq,
				cutoff: 3200,
				peakGain: 0.24,
				sendEcho: true,
			});
			return;
		}
		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			if (currentMood === "TOWN") {
				osc.type = "triangle";
				osc.frequency.setValueAtTime(freq, time);
			} else {
				// SURFACE & CATACOMBS: Ethereal flute or hollow reverberation with vibrato
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, time);
				if (duration > 0.15) {
					osc.frequency.linearRampToValueAtTime(freq * 1.008, time + duration * 0.4);
					osc.frequency.linearRampToValueAtTime(freq * 0.995, time + duration * 0.7);
					osc.frequency.linearRampToValueAtTime(freq, time + duration);
				}
			}

			// Expressive pitch slide if defined
			if (slideFreq) {
				osc.frequency.setValueAtTime(freq, time + duration * 0.3);
				osc.frequency.linearRampToValueAtTime(slideFreq, time + duration * 0.85);
			}

			gain.gain.setValueAtTime(0.001, time);
			const attackTime = 0.03;
			const peakVol = 0.18;
			gain.gain.linearRampToValueAtTime(peakVol, time + attackTime);
			gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

			osc.connect(gain);
			const voiceBus = tubePreampNode || masterGain;
			gain.connect(voiceBus);

			// Send to SPC700 Delay Echo bus (240ms feedback loop) for spatial depth
			if (delaySendGain && (currentMood === "SURFACE" || currentMood === "TOWN" || currentMood === "CATACOMBS")) {
				gain.connect(delaySendGain);
			}

			osc.start(time);
			osc.stop(time + duration);
		} catch {
			// Ignore scheduling errors on inactive Web Audio nodes
		}
	}

	// --- SYNTHESIS CHANNEL 4: CHIPTUNE PERCUSSION ---
	/**
	 * Plays a chiptune percussion sound (kick, snare, hi-hat) through the vacuum-tube preamplifier.
	 * (State-mutating audio scheduling procedure)
	 * @param {string} type Percussion type ('KICK' | 'SNARE' | 'HAT').
	 * @param {number} time AudioContext schedule time.
	 * @returns {void}
	 */
	function playPercussion(type, time) {
		if (!ctx || !noiseBuffer || isMuted || !masterGain) return;
		const voiceBus = tubePreampNode || masterGain;
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
				gain.connect(voiceBus);
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
				gain.connect(voiceBus);

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
	 * Schedules bass notes for the active step in the 4-bar phrase.
	 * (State-mutating sequencer routine)
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {MoodConfig} cfg Active mood configuration.
	 * @param {{ rootFreq: number, arpNotes: number[] }} chord Active chord voicing.
	 * @param {number} _barIdx Active bar index in 4-bar phrase (0-3).
	 * @returns {void}
	 */
	/**
	 * Bass rhythm and octave modification parameters per musical mood.
	 * Pure constant lookup matrix.
	 * @type {Record<string, { durFactor: number, steps: number[], octaveMods: Record<number, number> }>}
	 */
	const BASS_MOOD_TABLE = {
		COMBAT: {
			durFactor: 1.1,
			steps: [0, 2, 3, 6, 8, 10, 11, 14],
			octaveMods: { 6: 1.5, 11: 1.5, 14: 2.0 },
		},
		BOSS: {
			durFactor: 1.2,
			steps: [0, 2, 4, 6, 8, 10, 12, 14],
			octaveMods: { 6: 0.5, 14: 0.5 },
		},
		TOWN: {
			durFactor: 3.0,
			steps: [0, 6, 10],
			octaveMods: { 6: 1.5 },
		},
		CATACOMBS: {
			durFactor: 3.5,
			steps: [0, 8],
			octaveMods: { 8: 1.334 },
		},
		SURFACE: {
			durFactor: 2.0,
			steps: [0, 3, 6, 8, 10, 12],
			octaveMods: { 6: 1.5, 12: 1.5 },
		},
	};

	/**
	 * Resolves bass timing and octave parameters based on mood and step index.
	 * Pure calculation helper with O(1) cognitive complexity.
	 * @param {string} mood Active mood identifier.
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @returns {{ shouldPlay: boolean, octaveMod: number, durFactor: number }}
	 */
	function _resolveBassStepPattern(mood, stepInBar) {
		const pattern = BASS_MOOD_TABLE[mood] || BASS_MOOD_TABLE.SURFACE;
		if (!pattern.steps.includes(stepInBar)) {
			return { shouldPlay: false, octaveMod: 1.0, durFactor: pattern.durFactor };
		}
		const octaveMod = pattern.octaveMods[stepInBar] ?? 1.0;
		return { shouldPlay: true, octaveMod, durFactor: pattern.durFactor };
	}

	/**
	 * Schedules bassline notes for the active step in the 4-bar phrase.
	 * (State-mutating sequencer routine)
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {MoodConfig} cfg Mood configuration object.
	 * @param {{ rootFreq: number, arpNotes: number[] }} chord Active chord voicing.
	 * @param {number} _barIdx Active bar index in 4-bar phrase (0-3).
	 * @returns {void}
	 */
	function scheduleBass(stepInBar, stepTime, stepDuration, cfg, chord, _barIdx) {
		const { shouldPlay, octaveMod, durFactor } = _resolveBassStepPattern(currentMood, stepInBar);
		if (!shouldPlay) return;

		playBassNote(
			chord.rootFreq * octaveMod,
			stepTime,
			stepDuration * durFactor,
			cfg.bassType,
			cfg.filterCutoff,
		);
	}

	/**
	 * Schedules arpeggiator notes for the active step in the 4-bar phrase.
	 * (State-mutating sequencer routine)
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {{ rootFreq: number, arpNotes: number[] }} chord Active chord voicing.
	 * @param {number} _barIdx Active bar index in 4-bar phrase (0-3).
	 * @returns {void}
	 */
	function scheduleArp(stepInBar, stepTime, stepDuration, chord, _barIdx) {
		const arpNotes = chord.arpNotes;
		if (!arpNotes || arpNotes.length === 0) return;

		let noteIndex;
		if (currentMood === "COMBAT" || currentMood === "BOSS") {
			const arpSequence = [0, 2, 4, 6, 7, 5, 3, 1, 0, 3, 5, 7, 6, 4, 2, 1];
			noteIndex = arpSequence[stepInBar % 16] % arpNotes.length;
		} else if (currentMood === "TOWN") {
			const arpSequence = [0, 2, 4, 2, 5, 3, 1, 3, 0, 4, 6, 4, 5, 3, 2, 1];
			noteIndex = arpSequence[stepInBar % 16] % arpNotes.length;
		} else {
			const arpSequence = [0, 2, 4, 7, 5, 3, 1, 2, 0, 3, 6, 4, 2, 1, 3, 5];
			noteIndex = arpSequence[stepInBar % 16] % arpNotes.length;
		}

		const arpMidi = arpNotes[noteIndex];
		playArpNote(midiToFreq(arpMidi), stepTime, stepDuration * 0.85);
	}

	/**
	 * Schedules lead melody notes for the active step in the 4-bar phrase.
	 * (State-mutating sequencer routine)
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @param {number} barIdx Active bar index in 4-bar phrase (0-3).
	 * @returns {void}
	 */
	function scheduleLead(stepInBar, stepTime, stepDuration, barIdx) {
		const phrases = LEAD_PHRASES[currentMood] || LEAD_PHRASES.SURFACE;
		const barPhrase = phrases[barIdx % phrases.length];
		if (!barPhrase) return;

		const noteDef = barPhrase.find((n) => n.step === stepInBar);
		if (noteDef) {
			const freq = midiToFreq(noteDef.midi);
			const duration = stepDuration * noteDef.dur;
			const slideFreq = noteDef.slide ? midiToFreq(noteDef.slide) : undefined;
			playLeadNote(freq, stepTime, duration, slideFreq);
		}
	}

	/**
	 * Schedules percussion events for the active step in the 4-bar phrase.
	 * (State-mutating sequencer routine)
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} barIdx Active bar index in 4-bar phrase (0-3).
	 * @returns {void}
	 */
	/**
	 * Schedules percussion triggers for COMBAT mood.
	 * @param {number} stepInBar
	 * @param {number} stepTime
	 * @param {number} barIdx
	 */
	function _scheduleCombatPercussion(stepInBar, stepTime, barIdx) {
		if (barIdx === 3 && stepInBar >= 12) {
			if (stepInBar === 12 || stepInBar === 14 || stepInBar === 15) playPercussion("SNARE", stepTime);
			if (stepInBar === 13) playPercussion("KICK", stepTime);
			if (stepInBar === 15) playPercussion("HAT", stepTime);
			return;
		}
		if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 14) {
			playPercussion("KICK", stepTime);
		}
		if (stepInBar === 4 || stepInBar === 12) {
			playPercussion("SNARE", stepTime);
		}
		if (stepInBar % 2 === 1) {
			playPercussion("HAT", stepTime);
		}
	}

	/**
	 * Schedules percussion triggers for BOSS mood.
	 * @param {number} stepInBar
	 * @param {number} stepTime
	 * @param {number} barIdx
	 */
	function _scheduleBossPercussion(stepInBar, stepTime, barIdx) {
		if (barIdx === 3 && stepInBar >= 12) {
			playPercussion("KICK", stepTime);
			playPercussion("SNARE", stepTime);
			return;
		}
		if (stepInBar === 0 || stepInBar === 3 || stepInBar === 8 || stepInBar === 11) {
			playPercussion("KICK", stepTime);
		}
		if (stepInBar === 4 || stepInBar === 12 || stepInBar === 14) {
			playPercussion("SNARE", stepTime);
		}
		if (stepInBar % 2 === 1 || stepInBar === 2 || stepInBar === 10) {
			playPercussion("HAT", stepTime);
		}
	}

	/**
	 * Schedules ambient percussion triggers (SURFACE, TOWN, CATACOMBS).
	 * @param {string} mood
	 * @param {number} stepInBar
	 * @param {number} stepTime
	 * @param {number} barIdx
	 */
	function _scheduleAmbientPercussion(mood, stepInBar, stepTime, barIdx) {
		if (mood === "SURFACE") {
			if (stepInBar === 0 || stepInBar === 8) playPercussion("KICK", stepTime);
			if (stepInBar === 4 || stepInBar === 12) playPercussion("SNARE", stepTime);
			if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) playPercussion("HAT", stepTime);
			if (barIdx === 3 && (stepInBar === 14 || stepInBar === 15)) playPercussion("HAT", stepTime);
			return;
		}
		if (stepInBar === 0) playPercussion("KICK", stepTime);
		if (stepInBar === 8) playPercussion("HAT", stepTime);
		if (mood === "CATACOMBS" && barIdx === 3 && stepInBar === 14) {
			playPercussion("SNARE", stepTime);
		}
	}

	/**
	 * Schedules procedural percussion sounds for the active step in the 4-bar phrase.
	 * (State-mutating sequencer routine)
	 * @param {number} stepInBar Step index in bar (0-15).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} barIdx Active bar index in 4-bar phrase (0-3).
	 * @returns {void}
	 */
	function schedulePercussion(stepInBar, stepTime, barIdx) {
		if (currentMood === "COMBAT") {
			_scheduleCombatPercussion(stepInBar, stepTime, barIdx);
		} else if (currentMood === "BOSS") {
			_scheduleBossPercussion(stepInBar, stepTime, barIdx);
		} else {
			_scheduleAmbientPercussion(currentMood, stepInBar, stepTime, barIdx);
		}
	}

	/**
	 * Schedules all sequencer channels for the current step.
	 * (State-mutating sequencer runner)
	 * @param {number} stepIdx Step index in matrix (0-63).
	 * @param {number} stepTime AudioContext schedule time.
	 * @param {number} stepDuration Step duration in seconds.
	 * @returns {void}
	 */
	function scheduleStep(stepIdx, stepTime, stepDuration) {
		const barIdx = Math.floor(stepIdx / 16) % 4;
		const stepInBar = stepIdx % 16;
		const chords = CHORD_PROGRESSIONS[currentMood] || CHORD_PROGRESSIONS.SURFACE;
		const chord = chords[barIdx] || chords[0];
		const cfg = (/** @type {Record<string, any>} */ (MOOD_CONFIG))[currentMood] || MOOD_CONFIG.SURFACE;

		scheduleBass(stepInBar, stepTime, stepDuration, cfg, chord, barIdx);
		scheduleArp(stepInBar, stepTime, stepDuration, chord, barIdx);
		scheduleLead(stepInBar, stepTime, stepDuration, barIdx);
		schedulePercussion(stepInBar, stepTime, barIdx);
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
	 * Routes through the vacuum-tube preamplifier to impart warm analog resonance.
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
				const voiceBus = tubePreampNode || masterGain;
				src.connect(voiceBus);
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
						const encounterKey = String(evt?.encounterKey || "").toUpperCase();
						if (encounterKey.includes("MALAKOR") || encounterKey.includes("BOSS")) {
							this.setMood("BOSS");
						} else {
							this.setMood("COMBAT");
						}
					}),
					eventBus.subscribe("combat:resolved", () => {
						this.setMood(lastAmbientMood || "SURFACE");
					}),
					eventBus.subscribe("soundtrack:toggle_mode", () => {
						this.togglePlaybackMode();
					}),
					eventBus.subscribe("soundtrack:set_mode", (evt = {}) => {
						if (evt?.mode) {
							this.setPlaybackMode(evt.mode);
						}
					}),
					eventBus.subscribe("system:command", (evt = {}) => {
						if (evt?.command === "TOGGLE_MUTE") {
							this.toggleMute();
						} else if (evt?.command === "SET_PLAYBACK_MODE" && evt?.value) {
							this.setPlaybackMode(evt.value);
						} else if (evt?.command === "TOGGLE_PLAYBACK_MODE") {
							this.togglePlaybackMode();
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
		 * Switches seamlessly between 64-step FM tracker synthesis and raw Precursor Bytebeat equations.
		 * (State-mutating action gateway)
		 * @param {'TRACKER' | 'BYTEBEAT'} mode
		 * @returns {'TRACKER' | 'BYTEBEAT'}
		 */
		setPlaybackMode(mode) {
			/** @type {'TRACKER' | 'BYTEBEAT'} */
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
				eventBus?.publish?.("soundtrack:mode_changed", { playbackMode });
			}
			return playbackMode;
		},

		/**
		 * Toggles the playback engine mode between TRACKER and BYTEBEAT.
		 * (State-mutating action gateway)
		 * @returns {'TRACKER' | 'BYTEBEAT'}
		 */
		togglePlaybackMode() {
			const next = playbackMode === "TRACKER" ? "BYTEBEAT" : "TRACKER";
			return this.setPlaybackMode(next);
		},

		/**
		 * Retrieves the active playback mode.
		 * @returns {'TRACKER' | 'BYTEBEAT'}
		 */
		getPlaybackMode() {
			return playbackMode;
		},

		/**
		 * Exposes canonical Subsystem C Ley-Flux Resonator metadata.
		 * (Pure metadata inspector)
		 * @returns {typeof RESONATOR_METADATA}
		 */
		getSubsystemInfo() {
			return RESONATOR_METADATA;
		},

		/**
		 * Exposes canonical 64-step harmonic mood profile configurations.
		 * (Pure metadata inspector)
		 * @returns {typeof MOOD_CONFIG}
		 */
		getMoodProfiles() {
			return MOOD_CONFIG;
		},

		/**
		 * Exposes the vacuum-tube preamplifier transfer curve generator.
		 * (Pure DSP utility)
		 * @param {number} [samples=256]
		 * @param {number} [k=1.8]
		 * @returns {Float32Array}
		 */
		buildTubeSaturationCurve(samples = 256, k = 1.8) {
			return buildTubeSaturationCurve(samples, k);
		},

		/**
		 * Synthesizes a twin-detuned Commodore SID-style pulse-width modulated voice.
		 * (State-mutating audio scheduling procedure)
		 * @param {number} freq
		 * @param {number} time
		 * @param {number} duration
		 * @param {Object} [opts]
		 * @returns {void}
		 */
		playSIDVoice(freq, time, duration, opts = {}) {
			return playSIDVoice(freq, time, duration, opts);
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
		buildBytebeatAudioBuffer(formulaKey, durationSec = 4.0, targetCtx = null) {
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
				currentStep = 0;
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
				currentStep = (currentStep + 1) % 64;
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
				subsystemId: "SUBSYSTEM_C",
				subsystemName: "The Subterranean Ley-Flux Acoustic Resonator",
				playbackMode,
				activeMood: currentMood,
				activeMoodTitle: MOOD_CONFIG[currentMood]?.title || currentMood,
				activeScale: MOOD_CONFIG[currentMood]?.scale || "A Dorian",
				currentBPM,
				currentStep,
				currentBar: Math.floor(currentStep / 16) % 4,
				isMuted,
				delayFeedbackMs: 240,
				vacuumTubePreampActive: Boolean(tubePreampNode),
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

			if (delayNode) {
				try {
					delayNode.disconnect();
					delayFeedbackGain?.disconnect();
					delayFilter?.disconnect();
					delaySendGain?.disconnect();
				} catch {
					// Ignore node disconnect errors
				}
				delayNode = null;
				delayFeedbackGain = null;
				delayFilter = null;
				delaySendGain = null;
			}

			if (tubePreampNode) {
				try {
					tubePreampNode.disconnect();
				} catch {
					// Ignore node disconnect errors
				}
				tubePreampNode = null;
			}

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
