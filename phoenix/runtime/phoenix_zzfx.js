// cSpell:ignore ZZFX zzfx Zzfx Bitcrush FXAPI
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: PROCEDURAL AUDIO SUBSTRATE (ZzFX)
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-ZZFX
 * Governing Protocol:  VSRP-001 / PERSIST-001 / CC0-PUBLIC-DOMAIN
 * Authority:           Frank Force (CC0) | Phoenix Sovereign Runtime Subsystem
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

	/** @type {AudioContext | null} */
	let _zzfxAudioContext = null;

	/**
	 * Returns or lazily instantiates the shared W3C AudioContext.
	 * @returns {AudioContext | null}
	 */
	function getZzfxAudioContext() {
		if (!_zzfxAudioContext && typeof AudioContext !== 'undefined') {
			_zzfxAudioContext = new AudioContext();
		}
		return _zzfxAudioContext;
	}

	/**
	 * Computes wave shape amplitude for a given angle.
	 * @param {number} shape - Wave shape: 0=sin, 1=tri, 2=saw, 3=tan, 4=noise, 5=square
	 * @param {number} t - Time angle
	 * @returns {number} Sample amplitude between -1 and 1
	 */
	function _sampleWaveShape(shape, t) {
		switch (shape) {
			case 1: // Triangle
				return 1 - 4 * Math.abs(Math.round(t / Math.PI) - t / Math.PI);
			case 2: // Sawtooth
				return 1 - (((2 * t) / Math.PI) % 2 + 2) % 2;
			case 3: // Tan
				return Math.tan(t);
			case 4: // Noise
				return Math.random() * 2 - 1; // NOSONAR: Procedural white noise audio generation
			case 5: // Square
				return Math.sin(t) > 0 ? 1 : -1;
			default: // 0: Sine
				return Math.sin(t);
		}
	}

	/**
	 * Computes ADSR volume envelope factor.
	 * @param {number} i - Current sample index
	 * @param {number} attack
	 * @param {number} decay
	 * @param {number} sustain
	 * @param {number} release
	 * @param {number} delayEnd
	 * @param {number} sustainVolume
	 * @returns {number} Envelope volume multiplier (0-1)
	 */
	function _computeEnvelope(i, attack, decay, sustain, release, delayEnd, sustainVolume) {
		if (i < attack) {
			return i / attack;
		}
		if (i < attack + decay) {
			return 1 - ((i - attack) / decay) * (1 - sustainVolume);
		}
		if (i < attack + decay + sustain) {
			return sustainVolume;
		}
		if (i < delayEnd) {
			return ((delayEnd - i) / release) * sustainVolume;
		}
		return 0;
	}

	/**
	 * Applies delay feedback to sample.
	 * @param {number} s - Input sample
	 * @param {number} i - Sample index
	 * @param {number} delay - Delay offset
	 * @param {number[]} b - Output buffer
	 * @returns {number} Delayed sample
	 */
	function _applyDelay(s, i, delay, b) {
		if (!delay) return s;
		const echo = i > delay ? (b[Math.trunc(i - delay)] || 0) / 2 : 0;
		return s / 2 + echo;
	}

	/**
	 * ZzFX Sound Synthesis Generator (zzfxG).
	 * Generates raw floating-point audio samples for procedural sound synthesis.
	 * Dedicated to Public Domain (CC0) by Frank Force.
	 *
	 * @param {...any} params - 20-number ZzFX sound parameter list or array:
	 *   [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
	 *    slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
	 *    bitCrush, delay, sustainVolume, decay, tremolo]
	 * @returns {number[]} Array of 32-bit audio sample points
	 */
	function zzfxG(...params) {
		const unpacked = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
		const [
			volume = 1,
			randomness = 0.05,
			baseFrequency = 220,
			attackTime = 0,
			sustainTime = 0,
			releaseTime = 0.1,
			shape = 0,
			shapeCurve = 1,
			slideAmount = 0,
			deltaSlideAmount = 0,
			pitchJumpAmount = 0,
			pitchJumpOffset = 0,
			repeatInterval = 0,
			noise = 0, // eslint-disable-line no-unused-vars
			modulationDepth = 0,
			bitCrush = 0,
			delayTime = 0,
			sustainVolume = 1,
			decayTime = 0,
			tremolo = 0
		] = unpacked;

		const sampleRate = 44100;
		const sign = (/** @type {number} */ v) => (v < 0 ? -1 : 1);
		let slide = slideAmount * ((500 * Math.PI) / sampleRate / sampleRate);
		const startSlide = slide;
		const randomJitter = (Math.random() * 2 - 1); // NOSONAR: Procedural audio frequency jitter
		let frequency = (baseFrequency * ((1 + randomness * randomJitter) * Math.PI * 2)) / sampleRate;
		let startFrequency = frequency;
		const b = [];
		let t = 0;
		let i = 0;
		let j = 1;
		let r = 0;
		let c = 0;
		let s = 0;
		let f = 0;

		const attack = attackTime * sampleRate + 9;
		const decay = decayTime * sampleRate;
		const sustain = sustainTime * sampleRate;
		const release = releaseTime * sampleRate;
		const delay = delayTime * sampleRate;
		const deltaSlide = deltaSlideAmount * ((500 * Math.PI) / sampleRate / sampleRate / sampleRate);
		const modulation = modulationDepth * (Math.PI * 2 / sampleRate);
		const pitchJump = pitchJumpAmount * ((500 * Math.PI) / sampleRate / sampleRate);
		const pitchJumpTime = pitchJumpOffset * sampleRate;
		const repeatTime = Math.trunc(repeatInterval * sampleRate);
		const crushStep = Math.trunc(bitCrush * 100);
		const length = Math.trunc(attack + decay + sustain + release + delay);
		const delayEnd = length - delay;

		for (; i < length; b[i++] = s) {
			if (!crushStep || !(++c % crushStep)) {
				s = _sampleWaveShape(shape, t);

				const tremoloMod = repeatTime
					? 1 - tremolo + tremolo * Math.sin((Math.PI * 2 * i) / repeatTime)
					: 1;
				const env = _computeEnvelope(i, attack, decay, sustain, release, delayEnd, sustainVolume);

				s = tremoloMod * sign(s) * Math.pow(Math.abs(s), shapeCurve) * volume * env;
				s = _applyDelay(s, i, delay, b);
			}

			slide += deltaSlide;
			frequency += slide;
			f = frequency;
			t += f - f * modulation * Math.sin((Math.PI * 2 * i) / sampleRate);

			if (j && ++j > pitchJumpTime) {
				frequency += pitchJump;
				startFrequency += pitchJump;
				j = 0;
			}

			if (repeatTime && !(++r % repeatTime)) {
				frequency = startFrequency;
				slide = startSlide;
				j = j || 1;
			}
		}

		return b;
	}

	/**
	 * ZzFX Sound Player (zzfxP).
	 * Plays floating-point audio samples using Web Audio API buffer.
	 *
	 * @param {...any} samples - Raw audio samples or sample array
	 * @returns {AudioBufferSourceNode | null}
	 */
	function zzfxP(...samples) {
		const ctx = getZzfxAudioContext();
		if (!ctx) return null;

		// Handle passing nested array or arguments
		const sampleArray = Array.isArray(samples[0]) ? samples[0] : samples;
		const buffer = ctx.createBuffer(1, sampleArray.length, 44100);
		buffer.getChannelData(0).set(sampleArray);

		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		source.start();
		return source;
	}

	/**
	 * Primary ZzFX execution facade (zzfx).
	 * Generates and immediately plays a procedural sound effect.
	 *
	 * @param {...any} parameters - 20-number ZzFX sound parameter list
	 * @returns {AudioBufferSourceNode | null}
	 */
	function zzfx(...parameters) {
		return zzfxP(zzfxG(...parameters));
	}

	/**
	 * Mutates an existing ZzFX parameter array with controlled procedural randomness.
	 *
	 * @param {number[]} params - Input ZzFX parameter array
	 * @param {number} [amount=0.15] - Mutation variance intensity (0-1)
	 * @returns {number[]} Mutated ZzFX parameter array
	 */
	function zzfxMutate(params, amount = 0.15) {
		return params.map((val, idx) => {
			if (idx === 6) return val; // Keep wave shape invariant
			if (typeof val !== 'number') return val;
			const delta = (Math.random() * 2 - 1) * amount * (val === 0 ? 0.1 : Math.abs(val)); // NOSONAR: Procedural audio mutation
			return Number((val + delta).toFixed(3));
		});
	}

	const ZzFXAPI = Object.freeze({
		zzfx,
		zzfxG,
		zzfxP,
		zzfxMutate,
		getAudioContext: getZzfxAudioContext,
		sampleRate: 44100
	});

	global.zzfx = zzfx;
	global.zzfxG = zzfxG;
	global.zzfxP = zzfxP;
	global.zzfxMutate = zzfxMutate;
	global.PhoenixZzFX = ZzFXAPI;

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = ZzFXAPI;
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
