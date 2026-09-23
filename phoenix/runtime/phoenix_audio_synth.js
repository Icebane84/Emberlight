/* cSpell:words saw wave exponential */
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: PROCEDURAL WEB AUDIO SYNTHESIZER
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-AUDIO
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Runtime Subsystem
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

//#region [SEC-03] Procedural Web Audio Synthesizer Subsystem
const SFX_PRESETS = Object.freeze({
	LASER: Object.freeze({
		name: "Laser",
		wave: "sawtooth",
		freqStart: 950,
		freqEnd: 120,
		attack: 0.005,
		decay: 0.12,
		sustain: 0.01,
		release: 0.05,
		volume: 0.35,
		sweepType: "exponential",
	}),
	EXPLOSION: Object.freeze({
		name: "Explosion",
		wave: "noise",
		freqStart: 220,
		freqEnd: 30,
		attack: 0.01,
		decay: 0.45,
		sustain: 0.05,
		release: 0.25,
		volume: 0.5,
		sweepType: "linear",
	}),
	JUMP: Object.freeze({
		name: "Jump",
		wave: "square",
		freqStart: 180,
		freqEnd: 620,
		attack: 0.01,
		decay: 0.16,
		sustain: 0.02,
		release: 0.06,
		volume: 0.3,
		sweepType: "exponential",
	}),
	HIT: Object.freeze({
		name: "Hit",
		wave: "triangle",
		freqStart: 320,
		freqEnd: 60,
		attack: 0.005,
		decay: 0.1,
		sustain: 0.0,
		release: 0.04,
		volume: 0.45,
		sweepType: "exponential",
	}),
	COIN: Object.freeze({
		name: "Coin",
		wave: "sine",
		freqStart: 987,
		freqEnd: 1318,
		attack: 0.01,
		decay: 0.25,
		sustain: 0.15,
		release: 0.1,
		volume: 0.35,
		sweepType: "step",
	}),
	POWERUP: Object.freeze({
		name: "Powerup",
		wave: "sawtooth",
		freqStart: 220,
		freqEnd: 880,
		attack: 0.02,
		decay: 0.35,
		sustain: 0.2,
		release: 0.15,
		volume: 0.35,
		sweepType: "exponential",
	}),
	FOOTSTEP: Object.freeze({
		name: "Footstep",
		wave: "triangle",
		freqStart: 120,
		freqEnd: 40,
		attack: 0.005,
		decay: 0.06,
		sustain: 0.0,
		release: 0.02,
		volume: 0.2,
		sweepType: "linear",
	}),
	DEFLECT: Object.freeze({
		name: "Deflect",
		wave: "square",
		freqStart: 1400,
		freqEnd: 700,
		attack: 0.002,
		decay: 0.08,
		sustain: 0.02,
		release: 0.04,
		volume: 0.35,
		sweepType: "exponential",
	}),
});

/**
 * @type {AudioContext | null}
 */
let _sharedAudioCtx = null;

function getAudioContext() {
	if (!_sharedAudioCtx) {
		/** @type {typeof AudioContext | null} */
		let AudioContextClass = null;
		const g = /** @type {Record<string, any>} */ (global);
		if (typeof g.AudioContext === "function") {
			AudioContextClass = g.AudioContext;
		} else if (typeof g.webkitAudioContext === "function") {
			AudioContextClass = g.webkitAudioContext;
		}
		if (AudioContextClass) {
			_sharedAudioCtx = new AudioContextClass();
		}
	}
	if (_sharedAudioCtx?.state === "suspended") {
		_sharedAudioCtx.resume().catch(() => { });
	}
	return _sharedAudioCtx;
}

/**
 * Creates a white-noise audio buffer
 * @param {AudioContext | BaseAudioContext} ctx
 * @param {number} [durationSec=0.5]
 * @returns {AudioBuffer}
 */
function createNoiseBuffer(ctx, durationSec = 0.5) {
	const sampleRate = ctx.sampleRate || 44100;
	const bufferSize = Math.floor(sampleRate * durationSec);
	const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
	const output = buffer.getChannelData(0);
	let noiseSeed = 0x853c49e6;
	for (let i = 0; i < bufferSize; i++) {
		noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
		output[ i ] = (noiseSeed / 2147483648) - 1;
	}
	return buffer;
}

/**
 * Synthesizes and plays a procedural sound effect
 * @param {Record<string, unknown>} params
 * @param {AudioContext | BaseAudioContext | null} [audioCtx]
 * @returns {Promise<boolean>}
 */
async function playProceduralSFX(params, audioCtx) {
	const ctx = audioCtx || getAudioContext();
	if (!ctx) return false;

	const wave = typeof params.wave === "string" ? params.wave : "sine";
	const freqStart = Math.max(20, Number(params.freqStart) || 440);
	const freqEnd = Math.max(20, Number(params.freqEnd) || 220);
	const attack = Math.max(0.001, Number(params.attack) || 0.01);
	const decay = Math.max(0.01, Number(params.decay) || 0.15);
	const sustain = Math.max(0, Math.min(1, Number(params.sustain) || 0.1));
	const release = Math.max(0.01, Number(params.release) || 0.05);
	const volume = Math.max(0, Math.min(1, Number(params.volume) || 0.3));
	const sweepType = typeof params.sweepType === "string" ? params.sweepType : "exponential";

	const now = ctx.currentTime;
	const totalDuration = attack + decay + release;

	const masterGain = ctx.createGain();
	masterGain.gain.setValueAtTime(0.0001, now);
	masterGain.gain.exponentialRampToValueAtTime(volume, now + attack);
	masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * sustain), now + attack + decay);
	masterGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);
	masterGain.connect(ctx.destination);

	if (wave === "noise") {
		const noiseBuffer = createNoiseBuffer(ctx, totalDuration);
		const noiseSource = ctx.createBufferSource();
		noiseSource.buffer = noiseBuffer;

		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(freqStart, now);
		if (sweepType === "exponential") {
			filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + totalDuration);
		} else {
			filter.frequency.linearRampToValueAtTime(freqEnd, now + totalDuration);
		}

		noiseSource.connect(filter);
		filter.connect(masterGain);
		noiseSource.start(now);
		noiseSource.stop(now + totalDuration);
	} else {
		const osc = ctx.createOscillator();
		osc.type = /** @type {OscillatorType} */ (wave);
		osc.frequency.setValueAtTime(freqStart, now);

		if (sweepType === "exponential") {
			osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + totalDuration);
		} else if (sweepType === "step") {
			osc.frequency.setValueAtTime(freqStart, now);
			osc.frequency.setValueAtTime(freqEnd, now + (attack + decay) * 0.5);
		} else {
			osc.frequency.linearRampToValueAtTime(freqEnd, now + totalDuration);
		}

		osc.connect(masterGain);
		osc.start(now);
		osc.stop(now + totalDuration);
	}

	return true;
}

/**
 * Generates standalone or EventBus-wired JavaScript code for a sound preset
 * @param {Record<string, unknown>} params
 * @param {"standalone" | "eventbus"} [format="standalone"]
 * @param {string} [eventName="SFX_TRIGGERED"]
 * @returns {string}
 */
function generateSFXCode(params, format = "standalone", eventName = "SFX_TRIGGERED") {
	const sfxName = typeof params.name === "string" ? params.name : "Custom";
	const sfxConfig = {
		name: sfxName,
		wave: typeof params.wave === "string" ? params.wave : "sine",
		freqStart: Number(params.freqStart) || 440,
		freqEnd: Number(params.freqEnd) || 220,
		attack: Number(params.attack) || 0.01,
		decay: Number(params.decay) || 0.15,
		sustain: Number(params.sustain) || 0.1,
		release: Number(params.release) || 0.05,
		volume: Number(params.volume) || 0.3,
		sweepType: typeof params.sweepType === "string" ? params.sweepType : "exponential",
	};

	if (format === "eventbus") {
		return `// [SEC-AUDIO] Procedural SFX EventBus Listener (${sfxName})
if (typeof EmberlightEventBus !== 'undefined') {
  EmberlightEventBus.subscribe('${eventName}', () => {
    PhoenixAudioSynthesizer.playProceduralSFX(${JSON.stringify(sfxConfig, null, 2)});
  });
}`;
	}

	const fnName = `play${sfxName.replace(/[^A-Za-z0-9]/g, "")}SFX`;
	return `/**
 * Procedural SFX: ${sfxName}
 * Protocol: VSRP-001 / Pure Web Audio Synthesis (0KB Assets)
 * @param {AudioContext | BaseAudioContext} [audioCtx]
 */
function ${fnName}(audioCtx) {
  const ctx = audioCtx || (typeof AudioContext !== 'undefined' ? new AudioContext() : null);
  if (!ctx) return;
  const cfg = ${JSON.stringify(sfxConfig)};
  const now = ctx.currentTime;
  const totalDuration = cfg.attack + cfg.decay + cfg.release;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(cfg.volume, now + cfg.attack);
  masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, cfg.volume * cfg.sustain), now + cfg.attack + cfg.decay);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration);
  masterGain.connect(ctx.destination);

  if (cfg.wave === 'noise') {
    const bufferSize = Math.floor((ctx.sampleRate || 44100) * totalDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate || 44100);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cfg.freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, cfg.freqEnd), now + totalDuration);
    noise.connect(filter);
    filter.connect(masterGain);
    noise.start(now);
    noise.stop(now + totalDuration);
  } else {
    const osc = ctx.createOscillator();
    osc.type = cfg.wave;
    osc.frequency.setValueAtTime(cfg.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, cfg.freqEnd), now + totalDuration);
    osc.connect(masterGain);
    osc.start(now);
    osc.stop(now + totalDuration);
  }
}`;
}

const PhoenixAudioSynthesizer = Object.freeze({
	PRESETS: SFX_PRESETS,
	getAudioContext,
	createNoiseBuffer,
	playProceduralSFX,
	generateSFXCode,
});
//#endregion

	global.PhoenixAudioSynthesizer = PhoenixAudioSynthesizer;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { PhoenixAudioSynthesizer, SFX_PRESETS, getAudioContext, createNoiseBuffer, playProceduralSFX, generateSFXCode };
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
