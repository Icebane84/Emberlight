/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: PROCEDURAL AUDIO STUDIO CONTROLLER
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-STUDIO-AUDIO
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Audio Studio UI & SFX Controller
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

	let _activeSFXPresetKey = 'LASER';

	/**
	 * Opens the procedural Web Audio synthesizer drawer.
	 */
	function _openAudioStudio() {
		const drawer = document.getElementById('audio-synth-drawer');
		if (drawer) {
			drawer.style.display = 'flex';
			_loadSFXPreset(_activeSFXPresetKey);
			_renderOscilloscope();
		}
	}

	function _closeAudioStudio() {
		const drawer = document.getElementById('audio-synth-drawer');
		if (drawer) drawer.style.display = 'none';
	}

	/**
	 * @param {string} presetKey
	 */
	function _loadSFXPreset(presetKey) {
		_activeSFXPresetKey = presetKey;
		const presets = (global.PhoenixSovereignEngine?.PhoenixAudioSynthesizer?.PRESETS) || (global.PhoenixAudioSynthesizer?.PRESETS) || {};
		const preset = presets[ presetKey ];
		if (!preset) return;

		document.querySelectorAll('.btn-sfx-preset').forEach(btn => {
			btn.classList.toggle('active', (/** @type {HTMLElement} */(btn)).dataset.preset === presetKey);
		});

		const waveEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-param-wave'));
		const sweepEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-param-sweep'));
		const fstartEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fstart'));
		const fendEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fend'));
		const attackEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-attack'));
		const decayEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-decay'));
		const sustainEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-sustain'));
		const volumeEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-volume'));

		if (waveEl) waveEl.value = preset.wave;
		if (sweepEl) sweepEl.value = preset.sweepType || 'exponential';
		if (fstartEl) fstartEl.value = String(preset.freqStart);
		if (fendEl) fendEl.value = String(preset.freqEnd);
		if (attackEl) attackEl.value = String(preset.attack);
		if (decayEl) decayEl.value = String(preset.decay);
		if (sustainEl) sustainEl.value = String(preset.sustain);
		if (volumeEl) volumeEl.value = String(preset.volume);

		_updateSFXParamBadges();
		_renderOscilloscope();
	}

	function _updateSFXParamBadges() {
		const fstartVal = (/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fstart')))?.value || '950';
		const fendVal = (/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fend')))?.value || '120';
		const attackVal = (/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-attack')))?.value || '0.005';
		const decayVal = (/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-decay')))?.value || '0.12';
		const sustainVal = (/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-sustain')))?.value || '0.01';
		const volumeVal = (/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-volume')))?.value || '0.35';

		const bfstart = document.getElementById('val-fstart');
		const bfend = document.getElementById('val-fend');
		const battack = document.getElementById('val-attack');
		const bdecay = document.getElementById('val-decay');
		const bsustain = document.getElementById('val-sustain');
		const bvolume = document.getElementById('val-volume');

		if (bfstart) bfstart.textContent = fstartVal;
		if (bfend) bfend.textContent = fendVal;
		if (battack) battack.textContent = attackVal;
		if (bdecay) bdecay.textContent = decayVal;
		if (bsustain) bsustain.textContent = sustainVal;
		if (bvolume) bvolume.textContent = volumeVal;
	}

	function _getCurrentSFXParams() {
		const wave = (/** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-param-wave')))?.value || 'sawtooth';
		const sweepType = (/** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-param-sweep')))?.value || 'exponential';
		const freqStart = Number((/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fstart')))?.value || 950);
		const freqEnd = Number((/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fend')))?.value || 120);
		const attack = Number((/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-attack')))?.value || 0.005);
		const decay = Number((/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-decay')))?.value || 0.12);
		const sustain = Number((/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-sustain')))?.value || 0.01);
		const volume = Number((/** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-volume')))?.value || 0.35);

		return {
			name: _activeSFXPresetKey,
			wave,
			sweepType,
			freqStart,
			freqEnd,
			attack,
			decay,
			sustain,
			volume
		};
	}

	function _previewSFX() {
		const params = _getCurrentSFXParams();
		const synth = global.PhoenixSovereignEngine?.PhoenixAudioSynthesizer || global.PhoenixAudioSynthesizer;
		if (synth?.playProceduralSFX) {
			synth.playProceduralSFX(params);
		}
	}

	function _renderOscilloscope() {
		const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('sfx-waveform-canvas'));
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		ctx.fillStyle = '#060b0f';
		ctx.fillRect(0, 0, w, h);

		ctx.strokeStyle = '#00ffcc';
		ctx.lineWidth = 2;
		ctx.beginPath();

		const params = _getCurrentSFXParams();
		const samples = 128;
		for (let i = 0; i < samples; i++) {
			const x = (i / samples) * w;
			/** @type {number} */
			let y;
			const t = (i / samples) * Math.PI * 8;

			if (params.wave === 'sawtooth') {
				y = (h / 2) + ((i % 16) / 16 - 0.5) * (h * 0.7);
			} else if (params.wave === 'square') {
				y = (h / 2) + (Math.sin(t) >= 0 ? 1 : -1) * (h * 0.35);
			} else if (params.wave === 'triangle') {
				y = (h / 2) + (Math.asin(Math.sin(t)) / (Math.PI / 2)) * (h * 0.35);
			} else {
				y = (h / 2) + Math.sin(t) * (h * 0.35);
			}

			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	}

	function _getRandomFloat() {
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const buf = new Uint32Array(1);
			crypto.getRandomValues(buf);
			return buf[0] / 4294967296;
		}
		return 0.5;
	}

	function _randomizeSFX() {
		const waves = [ 'sawtooth', 'square', 'sine', 'triangle' ];
		const sweeps = [ 'exponential', 'linear', 'step' ];
		const randomWave = waves[ Math.floor(_getRandomFloat() * waves.length) ];
		const randomSweep = sweeps[ Math.floor(_getRandomFloat() * sweeps.length) ];

		const waveEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-param-wave'));
		const sweepEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-param-sweep'));
		const fstartEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fstart'));
		const fendEl = /** @type {HTMLInputElement | null} */ (document.getElementById('sfx-param-fend'));

		if (waveEl) waveEl.value = randomWave;
		if (sweepEl) sweepEl.value = randomSweep;
		if (fstartEl) fstartEl.value = String(Math.floor(_getRandomFloat() * 1200 + 100));
		if (fendEl) fendEl.value = String(Math.floor(_getRandomFloat() * 800 + 40));

		_updateSFXParamBadges();
		_renderOscilloscope();
		_previewSFX();
	}

	/**
	 * Exports or inserts generated procedural SFX code into the active file.
	 * @returns {void}
	 */
	function _insertSFXCode() {
		const formatEl = /** @type {HTMLSelectElement | null} */ (document.getElementById('sfx-export-format'));
		const format = formatEl?.value === 'eventbus' ? 'eventbus' : 'standalone';
		const params = _getCurrentSFXParams();
		const synth = global.PhoenixSovereignEngine?.PhoenixAudioSynthesizer || global.PhoenixAudioSynthesizer;
		const code = synth?.generateSFXCode ? synth.generateSFXCode(params, format) : `// SFX ${params.name}\nfunction play${params.name}SFX() { /* Procedural Web Audio */ }\n`;

		const editor = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('code-editor-view'));
		if (editor) {
			const start = editor.selectionStart !== undefined ? editor.selectionStart : editor.value.length;
			const end = editor.selectionEnd !== undefined ? editor.selectionEnd : editor.value.length;
			const val = editor.value;
			editor.value = val.substring(0, start) + '\n' + code + '\n' + val.substring(end);
			editor.focus();
			const event = new Event('input', { bubbles: true });
			editor.dispatchEvent(event);
			if (typeof global._toast === 'function') {
				global._toast(`✓ Inserted procedural SFX function (${params.name}) into active file.`, 'pass');
			}
		} else {
			navigator.clipboard?.writeText(code);
			if (typeof global._toast === 'function') {
				global._toast(`✓ Copied ${params.name} SFX code to clipboard.`, 'pass');
			}
		}
	}

	function _exportSFXCode() {
		_insertSFXCode();
	}

	// Attach DOM listeners when loaded in browser
	if (typeof document !== 'undefined') {
		document.getElementById('btn-open-audio-studio')?.addEventListener('click', _openAudioStudio);
		document.getElementById('btn-close-audio-studio')?.addEventListener('click', _closeAudioStudio);
		document.getElementById('btn-close-sfx')?.addEventListener('click', _closeAudioStudio);
		document.getElementById('btn-sfx-play')?.addEventListener('click', _previewSFX);
		document.getElementById('btn-sfx-randomize')?.addEventListener('click', _randomizeSFX);
		document.getElementById('btn-sfx-random')?.addEventListener('click', _randomizeSFX);
		document.getElementById('btn-sfx-copy-code')?.addEventListener('click', _exportSFXCode);
		document.getElementById('btn-sfx-insert')?.addEventListener('click', _insertSFXCode);

		document.querySelectorAll('.btn-sfx-preset').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const pKey = (/** @type {HTMLElement} */(e.currentTarget)).dataset.preset;
				if (pKey) {
					_loadSFXPreset(pKey);
					_previewSFX();
				}
			});
		});

		[ 'sfx-param-wave', 'sfx-param-sweep' ].forEach(id => {
			document.getElementById(id)?.addEventListener('change', () => {
				_renderOscilloscope();
			});
		});

		[ 'sfx-param-fstart', 'sfx-param-fend', 'sfx-param-attack', 'sfx-param-decay', 'sfx-param-sustain', 'sfx-param-volume' ].forEach(id => {
			document.getElementById(id)?.addEventListener('input', () => {
				_updateSFXParamBadges();
				_renderOscilloscope();
			});
		});
	}

	const PhoenixStudioAudio = Object.freeze({
		open: _openAudioStudio,
		close: _closeAudioStudio,
		loadPreset: _loadSFXPreset,
		updateBadges: _updateSFXParamBadges,
		getParams: _getCurrentSFXParams,
		preview: _previewSFX,
		renderOscilloscope: _renderOscilloscope,
		randomize: _randomizeSFX,
		exportCode: _exportSFXCode,
		insertCode: _insertSFXCode
	});

	global.PhoenixStudioAudio = PhoenixStudioAudio;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PhoenixStudioAudio;
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
