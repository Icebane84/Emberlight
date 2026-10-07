/* cSpell:words saw wave exponential zzfx */
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: PROCEDURAL WEB AUDIO SYNTHESIZER
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-AUDIO
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Runtime Subsystem & ZzFX Facade
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
		zzfx: Object.freeze([ 0.7, 0, 950, 0.005, 0.01, 0.12, 2, 1, -15, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.05, 0 ])
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
		zzfx: Object.freeze([ 1.2, 0.1, 220, 0.01, 0.05, 0.45, 4, 1, -5, 0, 0, 0, 0, 1, 0, 0.1, 0, 0.1, 0.25, 0 ])
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
		zzfx: Object.freeze([ 0.8, 0, 180, 0.01, 0.02, 0.16, 5, 1, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.06, 0 ])
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
		zzfx: Object.freeze([ 0.9, 0.05, 320, 0.005, 0, 0.1, 1, 1, -12, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0.04, 0 ])
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
		zzfx: Object.freeze([ 0.8, 0, 987, 0.01, 0.15, 0.25, 0, 1, 0, 0, 6, 0.05, 0, 0, 0, 0, 0, 0.3, 0.1, 0 ])
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
		zzfx: Object.freeze([ 0.8, 0, 220, 0.02, 0.2, 0.35, 2, 1, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.15, 0 ])
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
		zzfx: Object.freeze([ 0.5, 0.1, 120, 0.005, 0, 0.06, 1, 1, -8, 0, 0, 0, 0, 0.3, 0, 0, 0, 0, 0.02, 0 ])
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
		zzfx: Object.freeze([ 0.8, 0, 1400, 0.002, 0.02, 0.08, 5, 1, -18, 0, 0, 0, 0, 0.1, 0, 0, 0, 0.1, 0.04, 0 ])
	}),
});

/**
 * @type {AudioContext | null}
 */
let _sharedAudioCtx = null;

function getAudioContext() {
	if (typeof global.zzfx !== 'undefined' && global.PhoenixZzFX?.getAudioContext) {
		return global.PhoenixZzFX.getAudioContext();
	}
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
 * Converts a legacy audio configuration object to a 20-element ZzFX parameter array.
 * @param {Record<string, any>} params
 * @returns {number[]}
 */
function toZzfxParameters(params) {
	if (Array.isArray(params.zzfx)) return params.zzfx;
	const waveMap = { sine: 0, triangle: 1, sawtooth: 2, tan: 3, noise: 4, square: 5 };
	const waveStr = typeof params.wave === 'string' ? params.wave.toLowerCase() : 'sine';
	const shape = waveMap[waveStr] ?? 0;
	const vol = Math.max(0, Math.min(2, Number(params.volume) || 0.5));
	const fStart = Math.max(20, Number(params.freqStart) || 440);
	const fEnd = Math.max(20, Number(params.freqEnd) || fStart);
	const attack = Math.max(0, Number(params.attack) || 0.01);
	const decay = Math.max(0, Number(params.decay) || 0.1);
	const sustain = Math.max(0, Number(params.sustain) || 0.05);
	const release = Math.max(0, Number(params.release) || 0.05);
	const slide = (fEnd - fStart) / 100;
	return [ vol, 0.02, fStart, attack, sustain, release, shape, 1, slide, 0, 0, 0, 0, shape === 4 ? 0.8 : 0, 0, 0, 0, sustain, decay, 0 ];
}

/**
 * Synthesizes and plays a procedural sound effect via ZzFX or Web Audio.
 * @param {Record<string, unknown> | number[]} params
 * @param {AudioContext | BaseAudioContext | null} [audioCtx]
 * @returns {Promise<boolean>}
 */
async function playProceduralSFX(params, audioCtx) {
	if (!params) return false;

	// 1. Direct ZzFX Array Path
	const zzfxFn = global.zzfx || global.PhoenixZzFX?.zzfx;
	if (Array.isArray(params)) {
		if (typeof zzfxFn === 'function') {
			zzfxFn(...params);
			return true;
		}
	}

	// 2. Preset with zzfx definition
	const paramObj = /** @type {Record<string, any>} */ (params);
	if (Array.isArray(paramObj.zzfx) && typeof zzfxFn === 'function') {
		zzfxFn(...paramObj.zzfx);
		return true;
	}

	// 3. Convert legacy parameters to ZzFX if available
	if (typeof zzfxFn === 'function') {
		try {
			const zzParams = toZzfxParameters(paramObj);
			zzfxFn(...zzParams);
			return true;
		} catch (_) {}
	}

	// 4. Native Web Audio Fallback
	const ctx = audioCtx || getAudioContext();
	if (!ctx) return false;

	const wave = typeof paramObj.wave === "string" ? paramObj.wave : "sine";
	const freqStart = Math.max(20, Number(paramObj.freqStart) || 440);
	const freqEnd = Math.max(20, Number(paramObj.freqEnd) || 220);
	const attack = Math.max(0.001, Number(paramObj.attack) || 0.01);
	const decay = Math.max(0.01, Number(paramObj.decay) || 0.15);
	const sustain = Math.max(0, Math.min(1, Number(paramObj.sustain) || 0.1));
	const release = Math.max(0.01, Number(paramObj.release) || 0.05);
	const volume = Math.max(0, Math.min(1, Number(paramObj.volume) || 0.3));
	const sweepType = typeof paramObj.sweepType === "string" ? paramObj.sweepType : "exponential";

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
 * Generates standalone or EventBus-wired JavaScript code for a sound preset.
 * Supports both compact ZzFX array execution and standalone Web Audio functions.
 *
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
	const zzfxArr = Array.isArray(params.zzfx) ? JSON.stringify(params.zzfx) : JSON.stringify(toZzfxParameters(sfxConfig));

	return `/**
 * Procedural SFX: ${sfxName}
 * Protocol: VSRP-001 / ZzFX CC0 & Web Audio Synthesizer
 * @param {AudioContext | BaseAudioContext} [audioCtx]
 */
function ${fnName}(audioCtx) {
  if (typeof zzfx === 'function') {
    zzfx(...${zzfxArr});
    return;
  }
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
  const osc = ctx.createOscillator();
  osc.type = cfg.wave === 'noise' ? 'sawtooth' : cfg.wave;
  osc.frequency.setValueAtTime(cfg.freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, cfg.freqEnd), now + totalDuration);
  osc.connect(masterGain);
  osc.start(now);
  osc.stop(now + totalDuration);
}`;
}

const PhoenixAudioSynthesizer = Object.freeze({
	PRESETS: SFX_PRESETS,
	getAudioContext,
	createNoiseBuffer,
	playProceduralSFX,
	generateSFXCode,
	toZzfxParameters,
	get zzfx() { return global.zzfx || global.PhoenixZzFX?.zzfx; },
	get zzfxMutate() { return global.zzfxMutate || global.PhoenixZzFX?.zzfxMutate; }
});
//#endregion

	global.PhoenixAudioSynthesizer = PhoenixAudioSynthesizer;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { PhoenixAudioSynthesizer, SFX_PRESETS, getAudioContext, createNoiseBuffer, playProceduralSFX, generateSFXCode, toZzfxParameters };
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
