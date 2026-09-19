/* cSpell:words Tilemap Amanatides Demoscene Raymarcher Raymarch heightmap Raymarching highp fract */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PHOENIX GOVERNOR KERNEL
 * Document Identifier: VSRP-001-PHOENIX-SOVEREIGN-ENGINE
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Deterministic Governance Governor
 * ============================================================================
 *
 * TABLE OF CONTENTS & CANONICAL DOMAIN ANCHORS:
 *   [SEC-01] Constants, Frozen Primitives & Pure Utilities
 *   [SEC-02] Layer 3: Watchdog, Framebuffer & Fault Localization
 *   [SEC-03] Procedural Web Audio Synthesizer Subsystem
 *   [SEC-04] Code Studio Substrate (IntelliSense, Fuzzy, Search, Diff, Sandbox)
 *   [SEC-05] Graphics Tier 1 & 2: WebGL 2D Batcher & Canvas 2D Layer Engine
 *   [SEC-06] Graphics Tier 3: Retro Pseudo-3D DDA Raycaster
 *   [SEC-07] Graphics Tier 4: 3D Fast Voxel DDA World Engine
 *   [SEC-08] Graphics Tier 5: Demoscene Procedural Terrain Raymarcher
 *   [SEC-09] Code Formatting & Deep Linter Suite
 *   [SEC-10] Layer 1: Structural Linter & Proposal Shape Validator
 *   [SEC-11] Layer 0: Specification Registry & Capability Registry
 *   [SEC-12] Layer 3: In-Memory Receipt Ledger
 *   [SEC-13] Layer 0: Sovereign Storage (OPFS & FSA Virtual VFS)
 *   [SEC-14] Layer 2: Governor Core, AI Repair Loop & Canonical Facade Export
 * ============================================================================
 */
((/** @type {any} */ global) => {
	//#region [SEC-01] Constants, Frozen Primitives & Pure Utilities
	const VERSION = "7.0.0-ULTIMATE-FUSION";
	const PROTOCOLS = Object.freeze([
		"VSRP-001",
		"PMIP-001",
		"SDCP-001",
		"PERSIST-001",
		"UMB-GOV-01",
		"PRS-SPEC-GOVERNANCE-001",
	]);
	const STATES = Object.freeze({
		NEW: "NEW",
		READY: "READY",
		TRANSACTION: "TRANSACTION",
		DESTROYED: "DESTROYED",
	});
	const STATUS = Object.freeze({
		PASS: "PASS",
		REJECTED: "REJECTED",
		ERROR: "ERROR",
	});
	const GATES = Object.freeze({
		STRUCTURAL: "STRUCTURAL_GATE",
		CAPABILITY: "CAPABILITY_GATE",
		BEHAVIOR: "BEHAVIOR_GATE",
		ALL: "ALL_GATES",
		EXECUTION: "EXECUTION",
	});

	/** Allowed proposal schema version */
	const SCHEMA_VERSION = "PGE-DSL-1";
	/** Allowed receipt format version */
	const RECEIPT_VERSION = "PGE-RECEIPT-1";
	/** OPFS namespace for all persisted state */
	const OPFS_NAMESPACE = "phoenix-v7";
	/** OPFS filename for append-only receipt journal */
	const JOURNAL_FILE = "receipt-journal.ndjson";
	/** OPFS filename for AST cache manifest */
	const AST_CACHE_FILE = "ast-cache-manifest.json";
	/** OPFS filename for model cache manifest */
	const MODEL_CACHE_FILE = "model-cache-manifest.json";
	/** Maximum entries in the in-memory receipt ledger */
	const LEDGER_LIMIT = 500;
	/** Maximum AST cache entries before LRU eviction */
	const AST_CACHE_LIMIT = 50;
	/** Maximum repair iterations per original proposal ID */
	const REPAIR_LOOP_CAP = 3;
	/** Default capability expiry in governor ticks (proposals processed) */
	const DEFAULT_CAP_EXPIRY = 16;

	/** Regex: valid identifier for IDs, targets, capability names */
	const RE_ID = /^[A-Za-z0-9_.:/()[\]@\s&+#%,'"!$-]{1,256}$/;
	const RE_CAP = /^[A-Za-z0-9_.:-]{1,128}$/;

	/**
	 * @param {boolean | unknown} ok
	 * @param {string} message
	 */
	function assert(ok, message) {
		if (!ok) throw new Error(`[PHOENIX] ${message}`);
	}

	/**
	 * @template T
	 * @param {T} value
	 * @returns {T}
	 */
	function clone(value) {
		return structuredClone(value);
	}

	/**
	 * @param {unknown} value
	 * @returns {boolean}
	 */
	function isPlain(value) {
		if (value === null || typeof value !== "object") return false;
		const proto = Object.getPrototypeOf(value);
		return proto === Object.prototype || proto === null;
	}

	/** Deterministic canonical JSON — keys sorted at every level, no circular refs */
	/**
	 * @param {unknown} value
	 * @returns {string}
	 */
	function stable(value) {
		const seen = new WeakSet();
		/**
		 * @param {unknown} v
		 * @returns {unknown}
		 */
		function normalize(v) {
			if (v === null || typeof v !== "object") return v;
			if (seen.has(v))
				throw new Error("Circular data is forbidden in stable().");
			seen.add(v);
			if (Array.isArray(v)) {
				const a = v.map((item) => normalize(item));
				seen.delete(v);
				return a;
			}
			/** @type {Record<string, unknown>} */
			const o = {};
			Object.keys(v)
				.sort((a, b) => a.localeCompare(b))
				.forEach((k) => {
					o[ k ] = normalize((/** @type {Record<string, unknown>} */ (v))[ k ]);
				});
			seen.delete(v);
			return o;
		}
		return JSON.stringify(normalize(value));
	}

	/** FNV-1a 32-bit hash — deterministic, collision-resistant for receipt integrity */
	/**
	 * @param {string} text
	 * @returns {string}
	 */
	function hash(text) {
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.codePointAt(i) || 0;
			h = Math.imul(h, 0x01000193) >>> 0;
		}
		return h.toString(16).padStart(8, "0");
	}

	/** Monotonic ID generator. Prefix + timestamp (base-36) + auto-increment */
	let _seq = 0;
	/**
	 * @param {string} prefix
	 * @returns {string}
	 */
	function uid(prefix) {
		return `${prefix}-${Date.now().toString(36)}-${(++_seq).toString(36)}`;
	}

	function isoNow() {
		return new Date().toISOString();
	}
	//#endregion

	//#region [SEC-02] Layer 3: Watchdog, Framebuffer & Fault Localization
	/**
	 * Compute 32-bit FNV-1a hash over raw pixel bytes or byte buffer
	 * @param {ArrayLike<number>} buffer
	 * @returns {string}
	 */
	function hashBuffer(buffer) {
		let h = 0x811c9dc5;
		const len = buffer.length;
		for (let i = 0; i < len; i++) {
			h ^= buffer[ i ];
			h = Math.imul(h, 0x01000193) >>> 0;
		}
		return h.toString(16).padStart(8, "0");
	}

	/**
	 * Compute deterministic framebuffer signature from ImageData, Canvas, or pixel array
	 * @param {ImageData | HTMLCanvasElement | OffscreenCanvas | ArrayLike<number> | null} target
	 * @returns {string}
	 */
	function computeFramebufferHash(target) {
		if (!target) return hashBuffer([]);
		const imgTarget = /** @type {ImageData} */ (target);
		if (imgTarget.data && typeof imgTarget.data.length === "number") {
			return hashBuffer(imgTarget.data);
		}
		const canvasTarget = /** @type {HTMLCanvasElement | OffscreenCanvas} */ (target);
		if (canvasTarget.getContext && typeof canvasTarget.getContext === "function") {
			const ctx = /** @type {CanvasRenderingContext2D | null} */ (canvasTarget.getContext("2d"));
			if (ctx?.getImageData) {
				const w = canvasTarget.width || 64;
				const h = canvasTarget.height || 64;
				const imgData = ctx.getImageData(0, 0, w, h);
				return hashBuffer(imgData.data);
			}
		}
		if (ArrayBuffer.isView(target) || Array.isArray(target)) {
			return hashBuffer(/** @type {ArrayLike<number>} */(target));
		}
		return hashBuffer([]);
	}

	/**
	 * Run a rendering function on an in-memory canvas and validate against golden hash
	 * @param {Function} renderFn
	 * @param {string} goldenHash
	 * @param {number} [width=64]
	 * @param {number} [height=64]
	 * @returns {{ pass: boolean, hash: string, expected: string }}
	 */
	function validateFramebufferSignature(renderFn, goldenHash, width = 64, height = 64) {
		assert(typeof renderFn === "function", "validateFramebufferSignature: renderFn must be a function");
		let canvas;
		if (typeof global.OffscreenCanvas === "function") {
			canvas = new global.OffscreenCanvas(width, height);
		} else if (global.document && typeof global.document.createElement === "function") {
			canvas = global.document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
		} else {
			// Mock headless software framebuffer for environments without DOM/OffscreenCanvas
			const buffer = new Uint8ClampedArray(width * height * 4);
			const mockCtx = {
				fillStyle: "#000000",
				/**
				 * @param {number} x
				 * @param {number} y
				 * @param {number} w
				 * @param {number} h
				 */
				fillRect(x, y, w, h) {
					for (let py = Math.max(0, y); py < Math.min(height, y + h); py++) {
						for (let px = Math.max(0, x); px < Math.min(width, x + w); px++) {
							const idx = (py * width + px) * 4;
							buffer[ idx ] = 255;
							buffer[ idx + 1 ] = 255;
							buffer[ idx + 2 ] = 255;
							buffer[ idx + 3 ] = 255;
						}
					}
				},
				getImageData() {
					return { data: buffer, width, height };
				}
			};
			renderFn(mockCtx, width, height);
			const actualHash = hashBuffer(buffer);
			return {
				pass: actualHash === goldenHash,
				hash: actualHash,
				expected: goldenHash
			};
		}

		const ctx = canvas.getContext ? /** @type {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null} */ (canvas.getContext("2d")) : null;
		if (ctx && typeof ctx.getImageData === "function") {
			renderFn(ctx, width, height);
			const imgData = ctx.getImageData(0, 0, width, height);
			const actualHash = hashBuffer(imgData ? imgData.data : []);
			return {
				pass: actualHash === goldenHash,
				hash: actualHash,
				expected: goldenHash
			};
		}
		const fallbackHash = hashBuffer([]);
		return {
			pass: fallbackHash === goldenHash,
			hash: fallbackHash,
			expected: goldenHash
		};
	}

	/**
	 * Asynchronous or synchronous execution wrapper with timeout guard
	 * @param {Function} fn
	 * @param {number} [timeoutMs=2000]
	 * @param {unknown} [context]
	 * @returns {Promise<unknown>}
	 */
	async function executeWithTimeout(fn, timeoutMs = 2000, context = null) {
		assert(typeof fn === "function", "executeWithTimeout: fn must be a function");
		return new Promise((resolve, reject) => {
			let settled = false;
			const timer = setTimeout(() => {
				if (!settled) {
					settled = true;
					reject(new Error(`Execution timed out after ${timeoutMs}ms (Watchdog Protection)`));
				}
			}, timeoutMs);

			try {
				const result = fn(context);
				if (result && typeof result.then === "function") {
					result.then(
						(/** @type {unknown} */ val) => {
							if (!settled) {
								settled = true;
								clearTimeout(timer);
								resolve(val);
							}
						},
						(/** @type {unknown} */ err) => {
							if (!settled) {
								settled = true;
								clearTimeout(timer);
								reject(err);
							}
						}
					);
				} else {
					settled = true;
					clearTimeout(timer);
					resolve(result);
				}
			} catch (err) {
				if (!settled) {
					settled = true;
					clearTimeout(timer);
					reject(err);
				}
			}
		});
	}

	/**
	 * @param {unknown} failure
	 * @returns {string}
	 */
	function _resolveFailureReason(failure) {
		if (typeof failure === "string") return failure;
		if (failure instanceof Error) return failure.message || failure.name;
		if (failure && typeof failure === "object") {
			const fObj = /** @type {Record<string, unknown>} */ (failure);
			if (typeof fObj.reason === "string") return fObj.reason;
			if (typeof fObj.message === "string") return fObj.message;
			if (typeof fObj.name === "string") return fObj.name;
		}
		return "Behavior failure";
	}

	/**
	 * Extract localized AST / code slice enclosing a specific patch change and failure
	 * @param {string} source
	 * @param {PhoenixChangeDTO | { path?: string; search?: string; content?: string }} change
	 * @param {PhoenixFailureDTO | Error | string | { reason?: string; message?: string; name?: string } | unknown} failure
	 * @returns {{ targetPath: string, scopeName: string, failureReason: string, faultSlice: string }}
	 */
	function extractFaultSlice(source, change, failure) {
		const targetPath = (change?.path) || "unknown";
		const failureReason = _resolveFailureReason(failure);
		if (typeof source !== "string" || !change) {
			return {
				targetPath,
				scopeName: "Global",
				failureReason,
				faultSlice: String(change ? change.content || change.search || "" : "")
			};
		}

		const searchAnchor = change.search || change.content || "";
		const anchorIdx = source.indexOf(searchAnchor);
		if (anchorIdx < 0) {
			return {
				targetPath,
				scopeName: "Target",
				failureReason,
				faultSlice: change.content || searchAnchor
			};
		}

		// Find enclosing function or region
		const lines = source.split("\n");
		let charCount = 0;
		let lineNum = 1;
		for (let i = 0; i < lines.length; i++) {
			charCount += lines[ i ].length + 1;
			if (charCount >= anchorIdx) {
				lineNum = i + 1;
				break;
			}
		}

		let scopeName = "Global";
		let startLine = Math.max(0, lineNum - 10);
		const endLine = Math.min(lines.length, lineNum + 10);

		const faultFnRegex = /(?:async\s+)?function\s+([A-Za-z0-9_$]+)/;
		const faultMethodRegex = /^\s*(?:async\s+)?([A-Za-z0-9_$]+)\([^()\r\n]*\)/;
		const faultSecRegex = /\[SEC-[^\]]+\]/;

		for (let i = lineNum - 1; i >= 0; i--) {
			const l = lines[ i ];
			const fnMatch = faultFnRegex.exec(l) || faultMethodRegex.exec(l);
			const regMatch = faultSecRegex.exec(l);
			if (fnMatch) {
				scopeName = `function ${fnMatch[ 1 ]}`;
				startLine = i;
				break;
			}
			if (regMatch) {
				scopeName = `region ${regMatch[ 0 ]}`;
				startLine = i;
				break;
			}
		}

		const faultSlice = lines.slice(startLine, endLine).join("\n");
		return {
			targetPath,
			scopeName,
			failureReason,
			faultSlice
		};
	}
	//#endregion

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

	//#region [SEC-04] Code Studio Substrate (IntelliSense, Fuzzy, Search, Diff, Sandbox)
	const _INDEXER_PATTERNS = {
		region: /(?:#?region\s+)?\[(SEC-\w+)\]\s*(.*)/i,
		func: /(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*(\([^)]*\))/,
		cls: /class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?/,
		arrow: /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|([A-Za-z0-9_$]+))\s*=>/,
		variable: /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/
	};

	/**
	 * @param {string[]} lines
	 * @param {number} idx
	 */
	function _extractPrecedingJSDoc(lines, idx) {
		if (idx <= 0) return "";
		let prevIdx = idx - 1;
		while (prevIdx >= 0 && lines[ prevIdx ].trim() === "") prevIdx--;
		if (prevIdx < 0 || !lines[ prevIdx ].trim().endsWith("*/")) return "";

		const docLines = [];
		while (prevIdx >= 0) {
			docLines.unshift(lines[ prevIdx ]);
			if (lines[ prevIdx ].trim().startsWith("/**") || lines[ prevIdx ].trim().startsWith("/*")) break;
			prevIdx--;
		}
		return docLines.join("\n").trim();
	}

	/**
	 * @param {string} line
	 * @param {string} filePath
	 * @param {number} lineNum
	 * @param {string} jsdoc
	 */
	function _matchSymbolFromLine(line, filePath, lineNum, jsdoc) {
		const secMatch = _INDEXER_PATTERNS.region.exec(line);
		if (secMatch) {
			const tail = secMatch[ 2 ] ? ` ${secMatch[ 2 ].trim()}` : "";
			return {
				name: `[${secMatch[ 1 ]}]`,
				type: "region",
				file: filePath,
				line: lineNum,
				col: (secMatch.index || 0) + 1,
				signature: `[${secMatch[ 1 ]}]${tail}`.trim(),
				jsdoc,
			};
		}

		const fnMatch = _INDEXER_PATTERNS.func.exec(line);
		if (fnMatch) {
			return {
				name: fnMatch[ 1 ],
				type: "function",
				file: filePath,
				line: lineNum,
				col: (fnMatch.index || 0) + 1,
				signature: `function ${fnMatch[ 1 ]}${fnMatch[ 2 ]}`,
				jsdoc,
			};
		}

		const classMatch = _INDEXER_PATTERNS.cls.exec(line);
		if (classMatch) {
			const extendsSuffix = classMatch[ 2 ] ? ` extends ${classMatch[ 2 ]}` : "";
			return {
				name: classMatch[ 1 ],
				type: "class",
				file: filePath,
				line: lineNum,
				col: (classMatch.index || 0) + 1,
				signature: `class ${classMatch[ 1 ]}${extendsSuffix}`,
				jsdoc,
			};
		}

		const arrowMatch = _INDEXER_PATTERNS.arrow.exec(line);
		if (arrowMatch) {
			const paramStr = arrowMatch[ 2 ] !== undefined ? `(${arrowMatch[ 2 ]})` : `(${arrowMatch[ 3 ]})`;
			return {
				name: arrowMatch[ 1 ],
				type: "arrow",
				file: filePath,
				line: lineNum,
				col: (arrowMatch.index || 0) + 1,
				signature: `const ${arrowMatch[ 1 ]} = ${paramStr} =>`,
				jsdoc,
			};
		}

		const constMatch = _INDEXER_PATTERNS.variable.exec(line);
		if (constMatch) {
			return {
				name: constMatch[ 1 ],
				type: "variable",
				file: filePath,
				line: lineNum,
				col: (constMatch.index || 0) + 1,
				signature: `const ${constMatch[ 1 ]}`,
				jsdoc,
			};
		}

		return null;
	}

	class PhoenixSymbolIndexer {
		constructor() {
			/** @type {Map<string, Array<{name: string; type: string; file: string; line: number; col: number; signature: string; jsdoc: string}>>} */
			this._fileSymbols = new Map();
			/** @type {Map<string, Array<{name: string; type: string; file: string; line: number; col: number; signature: string; jsdoc: string}>>} */
			this._symbolTable = new Map();
		}

		/**
		 * @param {string} filePath
		 * @param {string} code
		 */
		indexFile(filePath, code) {
			if (!filePath || typeof code !== "string") return [];
			this.removeFile(filePath);

			const symbols = [];
			const lines = code.split("\n");

			for (let i = 0; i < lines.length; i++) {
				const line = lines[ i ];
				const jsdoc = _extractPrecedingJSDoc(lines, i);
				const sym = _matchSymbolFromLine(line, filePath, i + 1, jsdoc);
				if (sym) {
					symbols.push(sym);
				}
			}

			this._fileSymbols.set(filePath, symbols);
			for (const sym of symbols) {
				const existing = this._symbolTable.get(sym.name) || [];
				existing.push(sym);
				this._symbolTable.set(sym.name, existing);
			}
			return symbols;
		}

		/**
		 * @param {string} filePath
		 */
		removeFile(filePath) {
			const existing = this._fileSymbols.get(filePath);
			if (!existing) return;
			this._fileSymbols.delete(filePath);
			for (const sym of existing) {
				const list = this._symbolTable.get(sym.name);
				if (list) {
					const filtered = list.filter((s) => s.file !== filePath);
					if (filtered.length > 0) {
						this._symbolTable.set(sym.name, filtered);
					} else {
						this._symbolTable.delete(sym.name);
					}
				}
			}
		}

		/**
		 * @param {string} symbolName
		 */
		findDefinition(symbolName) {
			if (!symbolName) return [];
			const direct = this._symbolTable.get(symbolName);
			if (direct && direct.length > 0) return direct.slice();

			// Case-insensitive fallback
			const lower = symbolName.toLowerCase();
			for (const [ key, list ] of this._symbolTable.entries()) {
				if (key.toLowerCase() === lower) return list.slice();
			}
			return [];
		}

		/**
		 * @param {string} prefix
		 */
		getCompletions(prefix) {
			if (!prefix || typeof prefix !== "string") return [];
			const p = prefix.toLowerCase();
			const results = [];
			const seen = new Set();

			for (const [ name, list ] of this._symbolTable.entries()) {
				if (name.toLowerCase().startsWith(p) && !seen.has(name)) {
					seen.add(name);
					results.push(list[ 0 ]);
				}
			}
			return results.sort((a, b) => a.name.localeCompare(b.name));
		}

		getAllSymbols(filePath = null) {
			if (filePath) return (this._fileSymbols.get(filePath) || []).slice();
			const all = [];
			for (const list of this._fileSymbols.values()) {
				all.push(...list);
			}
			return all;
		}

		clear() {
			this._fileSymbols.clear();
			this._symbolTable.clear();
		}
	}

	/**
	 * @param {string} p
	 * @param {string} c
	 * @param {string} candidate
	 */
	function _computeSubsequenceScore(p, c, candidate) {
		const candidateText = String(candidate);
		let pIdx = 0;
		let score = 0;
		let consecutive = 0;
		let prevIdx = -1;

		for (let cIdx = 0; cIdx < c.length && pIdx < p.length; cIdx++) {
			if (c[ cIdx ] === p[ pIdx ]) {
				score += 20;
				if (prevIdx === cIdx - 1) {
					consecutive++;
					score += consecutive * 10;
				} else {
					consecutive = 0;
				}
				// CamelCase or delimiter boundary bonus
				if (cIdx === 0 || /[-_./\s]/.test(candidateText[ cIdx - 1 ]) || (candidateText[ cIdx ] >= "A" && candidateText[ cIdx ] <= "Z")) {
					score += 25;
				}
				prevIdx = cIdx;
				pIdx++;
			}
		}

		return pIdx === p.length ? score : 0;
	}

	const PhoenixFuzzySearch = Object.freeze({
		/**
		 * @param {string} pattern
		 * @param {string} candidate
		 * @returns {number}
		 */
		score(pattern, candidate) {
			if (!pattern || !candidate || typeof candidate !== "string") return 0;
			const p = pattern.toLowerCase();
			const c = candidate.toLowerCase();

			if (p === c) return 1000;
			if (c.startsWith(p)) return 800 + Math.max(0, 100 - c.length);
			if (c.includes(p)) return 500 - c.indexOf(p);

			return _computeSubsequenceScore(p, c, candidate);
		},

		/**
		 * @template T
		 * @param {string} pattern
		 * @param {T[]} items
		 * @param {(item: T) => string} [keyGetter]
		 * @returns {T[]}
		 */
		filter(pattern, items, keyGetter = String) {
			if (!items || !Array.isArray(items)) return [];
			if (!pattern) return items.slice();

			/** @type {Array<{ item: T; score: number }>} */
			const scored = [];
			for (const item of items) {
				const key = keyGetter(item);
				const sc = this.score(pattern, String(key));
				if (sc > 0) {
					scored.push({ item, score: sc });
				}
			}
			return scored.slice().sort((a, b) => b.score - a.score).map((s) => s.item);
		},
	});

	const PhoenixSearchEngine = Object.freeze({
		/**
		 * @param {string} text
		 * @param {string} query
		 * @param {{ matchCase?: boolean; wholeWord?: boolean; isRegex?: boolean }} [options]
		 * @returns {Array<{ index: number; length: number; line: number; col: number; matchText: string }>}
		 */
		findAll(text, query, { matchCase = false, wholeWord = false, isRegex = false } = {}) {
			if (!text || !query) return [];
			const matches = [];

			let regex;
			try {
				let pattern = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
				if (wholeWord) pattern = String.raw`\b${pattern}\b`;
				const flags = matchCase ? "g" : "gi";
				regex = new RegExp(pattern, flags);
			} catch (err) {
				// Suppress dynamic user regex syntax exception and return empty matches
				if (err) return [];
				return [];
			}

			let match;
			const lines = text.split("\n");
			const lineStarts = [];
			let cum = 0;
			for (const element of lines) {
				lineStarts.push(cum);
				cum += element.length + 1;
			}

			while ((match = regex.exec(text)) !== null) {
				const idx = match.index;
				const len = match[ 0 ].length;
				if (len === 0) {
					regex.lastIndex++;
					continue;
				}

				// Find line and column
				let line = 1;
				while (line < lineStarts.length && lineStarts[ line ] <= idx) {
					line++;
				}
				const col = idx - lineStarts[ line - 1 ] + 1;

				matches.push({
					index: idx,
					length: len,
					line,
					col,
					matchText: match[ 0 ],
				});
			}
			return matches;
		},

		/**
		 * @param {string} text
		 * @param {string} query
		 * @param {string} replacement
		 * @param {{ matchCase?: boolean; wholeWord?: boolean; isRegex?: boolean }} [options]
		 * @returns {{ text: string; count: number }}
		 */
		replaceAll(text, query, replacement, options = {}) {
			if (typeof text !== "string") return { text: "", count: 0 };
			if (!query) return { text, count: 0 };

			const matches = this.findAll(text, query, options);
			if (matches.length === 0) return { text, count: 0 };

			let regex;
			let pattern = options.isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
			if (options.wholeWord) pattern = String.raw`\b${pattern}\b`;
			const flags = options.matchCase ? "g" : "gi";
			regex = new RegExp(pattern, flags);

			const newText = text.replace(regex, replacement);
			return { text: newText, count: matches.length };
		},
	});

	/**
	 * @param {{
	 *   hunkId: number;
	 *   oldLines: string[];
	 *   newLines: string[];
	 *   oldStart: number;
	 *   newStart: number;
	 *   delLines: string[];
	 *   addLines: string[];
	 *   i: number;
	 *   j: number;
	 *   contextLines: number;
	 * }} options
	 */
	function _buildHunkRecord({ hunkId, oldLines, newLines, oldStart, newStart, delLines, addLines, i, j, contextLines }) {
		const lines = [];

		const ctxStart = Math.max(0, oldStart - contextLines);
		for (let k = ctxStart; k < oldStart; k++) {
			lines.push({ type: "ctx", text: oldLines[ k ], oldLine: k + 1, newLine: newStart - (oldStart - k) + 1 });
		}

		delLines.forEach((text, idx) => {
			lines.push({ type: "del", text, oldLine: oldStart + idx + 1, newLine: null });
		});

		addLines.forEach((text, idx) => {
			lines.push({ type: "add", text, oldLine: null, newLine: newStart + idx + 1 });
		});

		const ctxEnd = Math.min(oldLines.length, i + contextLines);
		for (let k = i; k < ctxEnd; k++) {
			lines.push({ type: "ctx", text: oldLines[ k ], oldLine: k + 1, newLine: j + (k - i) + 1 });
		}

		return {
			id: hunkId,
			oldStart: oldStart + 1,
			oldCount: delLines.length,
			newStart: newStart + 1,
			newCount: addLines.length,
			delLines,
			addLines,
			lines,
			header: `@@ -${oldStart + 1},${delLines.length || 1} +${newStart + 1},${addLines.length || 1} @@`,
		};
	}

	/**
	 * @param {string[]} oldLines
	 * @param {string[]} newLines
	 * @param {number} startI
	 * @param {number} startJ
	 */
	function _collectHunkDiff(oldLines, newLines, startI, startJ) {
		let i = startI;
		let j = startJ;
		const delLines = [];
		const addLines = [];

		while (i < oldLines.length && (j >= newLines.length || oldLines[ i ] !== newLines[ j ])) {
			const lookaheadNew = newLines.indexOf(oldLines[ i ], j);
			if (lookaheadNew !== -1 && lookaheadNew - j <= 3) {
				while (j < lookaheadNew) {
					addLines.push(newLines[ j ]);
					j++;
				}
				break;
			}
			delLines.push(oldLines[ i ]);
			i++;
		}

		while (j < newLines.length && (i >= oldLines.length || oldLines[ i ] !== newLines[ j ])) {
			addLines.push(newLines[ j ]);
			j++;
		}

		return { i, j, delLines, addLines };
	}

	const PhoenixChunkDiffEngine = Object.freeze({
		/**
		 * @param {string} oldText
		 * @param {string} newText
		 * @param {number} [contextLines=2]
		 */
		computeHunks(oldText, newText, contextLines = 2) {
			const oldLines = (oldText || "").split("\n");
			const newLines = (newText || "").split("\n");
			const hunks = [];

			let i = 0;
			let j = 0;
			let hunkId = 0;

			while (i < oldLines.length || j < newLines.length) {
				if (i < oldLines.length && j < newLines.length && oldLines[ i ] === newLines[ j ]) {
					i++;
					j++;
					continue;
				}

				const oldStart = i;
				const newStart = j;
				const diff = _collectHunkDiff(oldLines, newLines, i, j);
				i = diff.i;
				j = diff.j;

				if (diff.delLines.length > 0 || diff.addLines.length > 0) {
					hunkId++;
					hunks.push(_buildHunkRecord({
						hunkId,
						oldLines,
						newLines,
						oldStart,
						newStart,
						delLines: diff.delLines,
						addLines: diff.addLines,
						i,
						j,
						contextLines
					}));
				}
			}

			return hunks;
		},

		/**
		 * @param {string} baseText
		 * @param {PhoenixHunkDTO | { oldStart: number; delLines?: string[]; oldCount?: number; addLines?: string[] }} hunk
		 */
		applyHunk(baseText, hunk) {
			if (!baseText && baseText !== "") return "";
			if (!hunk) return baseText;

			const lines = baseText.split("\n");
			const targetIdx = Math.max(0, hunk.oldStart - 1);
			const delCount = hunk.delLines?.length ?? hunk.oldCount ?? 0;
			const addLines = hunk.addLines || [];

			lines.splice(targetIdx, delCount, ...addLines);
			return lines.join("\n");
		},

		/**
		 * @param {string} stagedText
		 * @param {PhoenixHunkDTO | { newStart: number; addLines?: string[]; newCount?: number; delLines?: string[] }} hunk
		 */
		rejectHunk(stagedText, hunk) {
			if (!stagedText && stagedText !== "") return "";
			if (!hunk) return stagedText;

			const lines = stagedText.split("\n");
			const targetIdx = Math.max(0, hunk.newStart - 1);
			const addCount = hunk.addLines?.length ?? hunk.newCount ?? 0;
			const delLines = hunk.delLines || [];

			lines.splice(targetIdx, addCount, ...delLines);
			return lines.join("\n");
		},
	});

	/**
	 * Resolves file text from a VFS map using relative or basename lookup.
	 * @param {Map<string, string> | { get: (k: string) => string | undefined; has: (k: string) => boolean; entries?: () => Iterable<[string, string]> }} vfsMap
	 * @param {string} filePath
	 * @returns {string | undefined}
	 */
	function _lookupVFS(vfsMap, filePath) {
		if (!vfsMap || typeof vfsMap.get !== "function") return undefined;
		const clean = filePath.replace(/^\.?\//, "").trim();
		if (vfsMap.has(clean)) return vfsMap.get(clean);
		if (vfsMap.has("./" + clean)) return vfsMap.get("./" + clean);
		const baseName = clean.split("/").pop() || clean;
		if (vfsMap.has(baseName)) return vfsMap.get(baseName);
		if (typeof vfsMap.entries === "function") {
			for (const [ k, v ] of vfsMap.entries()) {
				if (k.endsWith("/" + clean) || k.endsWith("/" + baseName)) return v;
			}
		}
		return undefined;
	}

	/**
	 * Inlines all stylesheet links found in HTML markup.
	 * @param {string} html
	 * @param {Map<string, string> | any} vfsMap
	 * @returns {string}
	 */
	function _inlineStylesheets(html, vfsMap) {
		const reLink = /<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*?>/gi;
		return html.replace(reLink, (match, href) => {
			if (!match.includes("stylesheet") && !href.endsWith(".css")) return match;
			const css = _lookupVFS(vfsMap, href);
			if (css !== undefined) {
				return `<style>/* [VFS INLINE CSS: ${href}] */\n${css}\n</style>`;
			}
			return `<!-- [VFS External CSS Skipped: ${href}] -->`;
		});
	}

	/**
	 * Inlines all script tags found in HTML markup in declared order.
	 * @param {string} html
	 * @param {Map<string, string> | any} vfsMap
	 * @param {Set<string>} inlinedSet
	 * @returns {{ html: string, hasScriptTags: boolean }}
	 */
	function _inlineScripts(html, vfsMap, inlinedSet) {
		let hasScriptTags = false;
		const reScript = /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?>\s*<\/script>/gi;
		const safeClosingScript = "<" + "/script>";
		const safeOpeningScript = "<script>";
		const transformed = html.replace(reScript, (_match, src) => {
			hasScriptTags = true;
			const code = _lookupVFS(vfsMap, src);
			if (code !== undefined) {
				inlinedSet.add(src.replace(/^\.?\//, "").trim());
				const safeCode = code.replaceAll("</script>", safeClosingScript);
				return `${safeOpeningScript}/* [VFS INLINE SCRIPT: ${src}] */\n${safeCode}\n${safeClosingScript}`;
			}
			return `<!-- [VFS External Script Skipped: ${src}] -->`;
		});
		return { html: transformed, hasScriptTags };
	}

	/**
	 * Builds fallback bundle when no script tags were declared in entry HTML.
	 * @param {Map<string, string> | any} vfsMap
	 * @param {Set<string>} inlinedSet
	 * @returns {string}
	 */
	function _buildFallbackScriptBundle(vfsMap, inlinedSet) {
		if (!vfsMap || typeof vfsMap.entries !== "function") return "";
		const scripts = [];
		const safeClosingScript = "<" + "/script>";
		const safeOpeningScript = "<script>";
		for (const [ path, code ] of vfsMap.entries()) {
			const clean = path.replace(/^\.?\//, "");
			if (path.endsWith(".js") && !path.includes("test_") && !inlinedSet.has(clean)) {
				const safeCode = code.replaceAll("</script>", safeClosingScript);
				scripts.push(`/* [VFS: ${path}] */\n${safeCode}`);
			}
		}
		return scripts.length > 0 ? `${safeOpeningScript}\n${scripts.join("\n\n")}\n${safeClosingScript}` : "";
	}

	const PhoenixRuntimeSandbox = Object.freeze({
		/**
		 * @param {Map<string, string> | { get: (k: string) => string | undefined; has: (k: string) => boolean; entries: () => Iterable<[string, string]> }} vfsMap
		 * @param {string} [entryFile="index.html"]
		 * @returns {string}
		 */
		buildRuntimeHTML(vfsMap, entryFile = "index.html") {
			const defaultCanvas = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Phoenix Game Runtime</title><style>body{margin:0;background:#05080c;color:#00ffcc;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;}canvas{border:1px solid #00ffcc44;box-shadow:0 0 16px rgba(0,255,204,0.15);}</style></head><body><canvas id=\"gameCanvas\" width=\"640\" height=\"480\"></canvas></body></html>";

			let baseHtml = (vfsMap && typeof vfsMap.get === "function" && vfsMap.has(entryFile))
				? (vfsMap.get(entryFile) || defaultCanvas)
				: defaultCanvas;

			baseHtml = _inlineStylesheets(baseHtml, vfsMap);

			const inlinedScripts = new Set();
			const scriptRes = _inlineScripts(baseHtml, vfsMap, inlinedScripts);
			baseHtml = scriptRes.html;

			const fallbackBundle = scriptRes.hasScriptTags ? "" : _buildFallbackScriptBundle(vfsMap, inlinedScripts);

			const hookScript = [
				"<script>",
				"(function() {",
				"	window.__PHOENIX_RUNTIME__ = {",
				"		active: true,",
				"		fps: 60,",
				"		lastTick: performance.now(),",
				"		frameCount: 0,",
				"		isPaused: false,",
				"		step() { window.__PHOENIX_RUNTIME__.frameCount++; },",
				"		pause() { window.__PHOENIX_RUNTIME__.isPaused = true; },",
				"		resume() { window.__PHOENIX_RUNTIME__.isPaused = false; }",
				"	};",
				"	window.addEventListener('error', function(e) {",
				"		if (window.parent) {",
				"			window.parent.postMessage({ type: 'PHOENIX_RUNTIME_ERROR', message: e.message, line: e.lineno }, '*');",
				"		}",
				"	});",
				"})();",
				"<" + "/script>"
			].join("\n");

			baseHtml = baseHtml.includes("</head>")
				? baseHtml.replace("</head>", `${hookScript}\n</head>`)
				: `${hookScript}\n${baseHtml}`;

			if (fallbackBundle) {
				baseHtml = baseHtml.includes("</body>")
					? baseHtml.replace("</body>", `${fallbackBundle}\n</body>`)
					: `${baseHtml}\n${fallbackBundle}`;
			}

			return baseHtml;
		},

		/**
		 * @param {{ onTick?: (tickState: { frameCount: number; delta: number; timestamp: number }) => void; targetFPS?: number }} [config]
		 */
		createTickController({ onTick, targetFPS = 60 } = {}) {
			let running = false;
			let paused = false;
			/**
			 * @type {number | null}
			 */
			let animId = null;
			let lastTime = 0;
			let frameCount = 0;
			let currentFPS = targetFPS;
			let fpsCounter = 0;
			let lastFpsUpdate = 0;

			/**
			 * @param {number} timestamp
			 */
			function loop(timestamp) {
				if (!running) return;
				if (!lastTime) lastTime = timestamp;
				if (!lastFpsUpdate) lastFpsUpdate = timestamp;

				const interval = 1000 / targetFPS;
				const delta = timestamp - lastTime;

				if (delta >= interval && !paused) {
					lastTime = timestamp - (delta % interval);
					frameCount++;
					fpsCounter++;
					if (typeof onTick === "function") {
						try {
							onTick({ frameCount, delta, timestamp });
						} catch (_) { }
					}
				}

				if (timestamp - lastFpsUpdate >= 500) {
					currentFPS = Math.round((fpsCounter * 1000) / (timestamp - lastFpsUpdate));
					fpsCounter = 0;
					lastFpsUpdate = timestamp;
				}

				if (typeof requestAnimationFrame !== "undefined") {
					animId = requestAnimationFrame(loop);
				}
			}

			return {
				play() {
					if (running && !paused) return;
					running = true;
					paused = false;
					lastTime = 0;
					if (typeof requestAnimationFrame !== "undefined") {
						animId = requestAnimationFrame(loop);
					}
				},
				pause() {
					paused = true;
				},
				step(count = 1) {
					for (let k = 0; k < count; k++) {
						frameCount++;
						if (typeof onTick === "function") {
							try {
								onTick({ frameCount, delta: 1000 / targetFPS, timestamp: Date.now() });
							} catch (_) { }
						}
					}
				},
				stop() {
					running = false;
					paused = false;
					if (animId && typeof cancelAnimationFrame !== "undefined") {
						cancelAnimationFrame(animId);
						animId = null;
					}
				},
				getState() {
					return { running, paused, frameCount, currentFPS, targetFPS };
				},
				/**
				 * @param {number} fps
				 */
				setFPS(fps) {
					targetFPS = Math.max(1, Math.min(240, Number(fps) || 60));
				},
			};
		},
	});
	//#endregion

	//#region [SEC-05] Graphics Tier 1 & 2: WebGL 2D Batcher & Canvas 2D Layer Engine
	const PhoenixWebGLBatcher = Object.freeze({
		DEFAULT_VS: `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
in vec4 a_color;
uniform vec2 u_resolution;
out vec2 v_uv;
out vec4 v_color;
void main() {
	vec2 zeroToOne = a_pos / u_resolution;
	vec2 zeroToTwo = zeroToOne * 2.0;
	vec2 clipSpace = zeroToTwo - 1.0;
	gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
	v_uv = a_uv;
	v_color = a_color;
}`,
		DEFAULT_FS: `#version 300 es
precision mediump float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_texture;
uniform int u_useTexture;
out vec4 fragColor;
void main() {
	vec4 texColor = (u_useTexture == 1) ? texture(u_texture, v_uv) : vec4(1.0);
	fragColor = texColor * v_color;
}`,
		POST_CRT_FS: `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_screen;
uniform float u_time;
uniform float u_scanlineIntensity;
out vec4 fragColor;
void main() {
	vec2 uv = v_uv;
	vec4 col = texture(u_screen, uv);
	float scanline = sin(uv.y * 480.0 * 3.14159) * u_scanlineIntensity;
	col.rgb -= scanline;
	fragColor = col;
}`,

		/**
		 * @param {WebGL2RenderingContext | WebGLRenderingContext | null} gl
		 * @param {number} type
		 * @param {string} source
		 */
		compileShader(gl, type, source) {
			if (!gl) return null;
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				const info = gl.getShaderInfoLog(shader);
				gl.deleteShader(shader);
				throw new Error("Shader compile error: " + info);
			}
			return shader;
		},

		/**
		 * @param {WebGL2RenderingContext | WebGLRenderingContext | null} gl
		 * @param {string} vsSource
		 * @param {string} fsSource
		 */
		createProgram(gl, vsSource, fsSource) {
			if (!gl) return null;
			const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
			const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
			if (!vs || !fs) return null;
			const program = gl.createProgram();
			if (!program) return null;
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				const info = gl.getProgramInfoLog(program);
				gl.deleteProgram(program);
				throw new Error("Program link error: " + info);
			}
			return program;
		},

		/**
		 * @param {WebGL2RenderingContext | WebGLRenderingContext | null} gl
		 * @param {number} [maxQuads=2000]
		 */
		createBatcher(gl, maxQuads = 2000) {
			if (!gl) {
				return {
					begin() { },
					drawQuad() { },
					flush() { return 0; },
					destroy() { }
				};
			}

			const program = this.createProgram(gl, this.DEFAULT_VS, this.DEFAULT_FS);
			if (!program) {
				return {
					begin() { },
					drawQuad() { },
					flush() { return 0; },
					destroy() { }
				};
			}
			const uResLoc = gl.getUniformLocation(program, "u_resolution");
			const uUseTexLoc = gl.getUniformLocation(program, "u_useTexture");

			const aPosLoc = gl.getAttribLocation(program, "a_pos");
			const aUvLoc = gl.getAttribLocation(program, "a_uv");
			const aColorLoc = gl.getAttribLocation(program, "a_color");

			const FLOATS_PER_VERTEX = 8;
			const VERTICES_PER_QUAD = 6;
			const bufferData = new Float32Array(maxQuads * VERTICES_PER_QUAD * FLOATS_PER_VERTEX);
			let quadCount = 0;

			const gl2 = /** @type {WebGL2RenderingContext} */ (/** @type {unknown} */ (gl));
			const vbo = gl.createBuffer();
			const vao = typeof gl2.createVertexArray === "function" ? gl2.createVertexArray() : null;

			if (vao && typeof gl2.bindVertexArray === "function") gl2.bindVertexArray(vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, bufferData.byteLength, gl.DYNAMIC_DRAW);

			const stride = FLOATS_PER_VERTEX * 4;
			if (aPosLoc !== -1) {
				gl.enableVertexAttribArray(aPosLoc);
				gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, stride, 0);
			}
			if (aUvLoc !== -1) {
				gl.enableVertexAttribArray(aUvLoc);
				gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, stride, 2 * 4);
			}
			if (aColorLoc !== -1) {
				gl.enableVertexAttribArray(aColorLoc);
				gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, stride, 4 * 4);
			}

			return {
				/**
				 * @param {number} width
				 * @param {number} height
				 */
				begin(width, height) {
					quadCount = 0;
					gl.useProgram(program);
					if (uResLoc) gl.uniform2f(uResLoc, width, height);
					if (uUseTexLoc) gl.uniform1i(uUseTexLoc, 0);
					if (vao && typeof gl2.bindVertexArray === "function") gl2.bindVertexArray(vao);
					else gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
				},

				/**
				 * @param {number} x
				 * @param {number} y
				 * @param {number} w
				 * @param {number} h
				 * @param {number[] | { u0?: number; v0?: number; u1?: number; v1?: number }} [uvs]
				 * @param {number[] | { r?: number; g?: number; b?: number; a?: number }} [color]
				 */
				drawQuad(x, y, w, h, uvs = [ 0, 0, 1, 1 ], color = [ 1, 1, 1, 1 ]) {
					if (quadCount >= maxQuads) this.flush();

					let u0 = 0, v0 = 0, u1 = 1, v1 = 1;
					if (Array.isArray(uvs)) {
						[ u0 = 0, v0 = 0, u1 = 1, v1 = 1 ] = uvs;
					} else if (uvs && typeof uvs === "object") {
						({ u0 = 0, v0 = 0, u1 = 1, v1 = 1 } = uvs);
					}

					let r = 1, g = 1, b = 1, a = 1;
					if (Array.isArray(color)) {
						[ r = 1, g = 1, b = 1, a = 1 ] = color;
					} else if (color && typeof color === "object") {
						({ r = 1, g = 1, b = 1, a = 1 } = color);
					}

					const offset = quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX;
					const x2 = x + w;
					const y2 = y + h;

					bufferData[ offset ] = x; bufferData[ offset + 1 ] = y; bufferData[ offset + 2 ] = u0; bufferData[ offset + 3 ] = v0;
					bufferData[ offset + 4 ] = r; bufferData[ offset + 5 ] = g; bufferData[ offset + 6 ] = b; bufferData[ offset + 7 ] = a;

					bufferData[ offset + 8 ] = x2; bufferData[ offset + 9 ] = y; bufferData[ offset + 10 ] = u1; bufferData[ offset + 11 ] = v0;
					bufferData[ offset + 12 ] = r; bufferData[ offset + 13 ] = g; bufferData[ offset + 14 ] = b; bufferData[ offset + 15 ] = a;

					bufferData[ offset + 16 ] = x; bufferData[ offset + 17 ] = y2; bufferData[ offset + 18 ] = u0; bufferData[ offset + 19 ] = v1;
					bufferData[ offset + 20 ] = r; bufferData[ offset + 21 ] = g; bufferData[ offset + 22 ] = b; bufferData[ offset + 23 ] = a;

					bufferData[ offset + 24 ] = x2; bufferData[ offset + 25 ] = y; bufferData[ offset + 26 ] = u1; bufferData[ offset + 27 ] = v0;
					bufferData[ offset + 28 ] = r; bufferData[ offset + 29 ] = g; bufferData[ offset + 30 ] = b; bufferData[ offset + 31 ] = a;

					bufferData[ offset + 32 ] = x2; bufferData[ offset + 33 ] = y2; bufferData[ offset + 34 ] = u1; bufferData[ offset + 35 ] = v1;
					bufferData[ offset + 36 ] = r; bufferData[ offset + 37 ] = g; bufferData[ offset + 38 ] = b; bufferData[ offset + 39 ] = a;

					bufferData[ offset + 40 ] = x; bufferData[ offset + 41 ] = y2; bufferData[ offset + 42 ] = u0; bufferData[ offset + 43 ] = v1;
					bufferData[ offset + 44 ] = r; bufferData[ offset + 45 ] = g; bufferData[ offset + 46 ] = b; bufferData[ offset + 47 ] = a;

					quadCount++;
				},

				flush() {
					if (quadCount === 0) return 0;
					const count = quadCount;
					gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
					gl.bufferSubData(gl.ARRAY_BUFFER, 0, bufferData.subarray(0, quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX));
					gl.drawArrays(gl.TRIANGLES, 0, quadCount * VERTICES_PER_QUAD);
					quadCount = 0;
					return count;
				},

				destroy() {
					if (vbo) gl.deleteBuffer(vbo);
					if (program) gl.deleteProgram(program);
					if (vao && typeof gl2.deleteVertexArray === "function") gl2.deleteVertexArray(vao);
				}
			};
		},

		createParticleSystem(maxParticles = 500) {
			/** @type {Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number[]; size: number }>} */
			const particles = [];
			let prngSeed = 0x12345678;
			function nextFloat() {
				prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
				return prngSeed / 4294967296;
			}

			return {
				/**
				 * @param {number} x
				 * @param {number} y
				 * @param {number} [count=10]
				 * @param {{ color?: number[]; speed?: number; life?: number; size?: number }} [config]
				 */
				emit(x, y, count = 10, { color = [ 0, 1, 0.8, 1 ], speed = 2, life = 1.0, size = 4 } = {}) {
					for (let i = 0; i < count && particles.length < maxParticles; i++) {
						const angle = nextFloat() * Math.PI * 2;
						const spd = (nextFloat() * 0.8 + 0.2) * speed;
						particles.push({
							x,
							y,
							vx: Math.cos(angle) * spd,
							vy: Math.sin(angle) * spd,
							life,
							maxLife: life,
							size,
							color: color.slice()
						});
					}
				},

				/**
				 * @param {number} dt
				 */
				update(dt) {
					for (let i = particles.length - 1; i >= 0; i--) {
						const p = particles[ i ];
						p.x += p.vx;
						p.y += p.vy;
						p.life -= dt;
						if (p.life <= 0) {
							particles.splice(i, 1);
						}
					}
				},

				/**
				 * @param {{ drawQuad: (arg0: number, arg1: number, arg2: number, arg3: number, arg4?: number[] | { u0?: number; v0?: number; u1?: number; v1?: number }, arg5?: number[] | { r?: number; g?: number; b?: number; a?: number }) => void; }} batcher
				 */
				render(batcher) {
					for (const p of particles) {
						const alpha = Math.max(0, p.life / p.maxLife) * (p.color[ 3 ] || 1);
						batcher.drawQuad(
							p.x - p.size / 2,
							p.y - p.size / 2,
							p.size,
							p.size,
							[ 0, 0, 1, 1 ],
							[ p.color[ 0 ], p.color[ 1 ], p.color[ 2 ], alpha ]
						);
					}
				},

				getCount() {
					return particles.length;
				},

				clear() {
					particles.length = 0;
				}
			};
		}
	});

	// =========================================================================
	// [GRAPHICS TIER 2] Canvas 2D Viewport Matrix & Tilemap Layer Engine
	// =========================================================================
	const PhoenixCanvas2DLayerEngine = Object.freeze({
		createCamera({ x = 0, y = 0, zoom = 1, minZoom = 0.25, maxZoom = 4 } = {}) {
			let trauma = 0;
			let rot = 0;
			let prngSeed = 0x98765432;
			function nextFloat() {
				prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
				return prngSeed / 4294967296;
			}

			return {
				x,
				y,
				zoom,
				rotation: rot,
				/**
				 * @param {number} amount
				 */
				addTrauma(amount) {
					trauma = Math.min(1.0, trauma + amount);
				},
				/**
				 * @param {number} dt
				 */
				update(dt) {
					if (trauma > 0) {
						trauma = Math.max(0, trauma - dt * 1.5);
					}
				},
				/**
				 * @param {number} targetX
				 * @param {number} targetY
				 */
				lookAt(targetX, targetY, lerp = 0.1) {
					this.x += (targetX - this.x) * lerp;
					this.y += (targetY - this.y) * lerp;
				},
				/**
				 * @param {number} z
				 */
				setZoom(z) {
					this.zoom = Math.max(minZoom, Math.min(maxZoom, z));
				},
				getShakeOffset() {
					const shake = trauma * trauma;
					const offsetX = (nextFloat() * 2 - 1) * shake * 16;
					const offsetY = (nextFloat() * 2 - 1) * shake * 16;
					const offsetAngle = (nextFloat() * 2 - 1) * shake * 0.1;
					return { offsetX, offsetY, offsetAngle };
				},
				/**
				 * @param {{ save: () => void; translate: (arg0: number, arg1: number) => void; rotate: (arg0: number) => void; scale: (arg0: number, arg1: number) => void; }} ctx
				 * @param {number} viewportW
				 * @param {number} viewportH
				 */
				applyTransform(ctx, viewportW, viewportH) {
					const { offsetX, offsetY, offsetAngle } = this.getShakeOffset();
					ctx.save();
					ctx.translate((viewportW / 2) + offsetX, (viewportH / 2) + offsetY);
					ctx.rotate(this.rotation + offsetAngle);
					ctx.scale(this.zoom, this.zoom);
					ctx.translate(-this.x, -this.y);
				},
				/**
				 * @param {{ restore: () => void; }} ctx
				 */
				resetTransform(ctx) {
					ctx.restore();
				},
				/**
				 * @param {number} worldX
				 * @param {number} worldY
				 * @param {number} viewportW
				 * @param {number} viewportH
				 */
				worldToScreen(worldX, worldY, viewportW, viewportH) {
					return {
						x: (worldX - this.x) * this.zoom + (viewportW / 2),
						y: (worldY - this.y) * this.zoom + (viewportH / 2)
					};
				},
				/**
				 * @param {number} screenX
				 * @param {number} screenY
				 * @param {number} viewportW
				 * @param {number} viewportH
				 */
				screenToWorld(screenX, screenY, viewportW, viewportH) {
					return {
						x: (screenX - (viewportW / 2)) / this.zoom + this.x,
						y: (screenY - (viewportH / 2)) / this.zoom + this.y
					};
				}
			};
		},

		/**
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {(number | string)[][]} grid
		 * @param {number} tileSize
		 * @param {Record<string | number, string | { color: string }>} tilePalette
		 * @param {{ screenToWorld: (sx: number, sy: number, vw: number, vh: number) => { x: number; y: number } }} camera
		 * @param {number} viewportW
		 * @param {number} viewportH
		 */
		renderTilemap(ctx, grid, tileSize, tilePalette, camera, viewportW, viewportH) {
			if (!grid || !Array.isArray(grid) || grid.length === 0) return 0;
			const rows = grid.length;
			const cols = grid[ 0 ].length;

			const topLeft = camera.screenToWorld(0, 0, viewportW, viewportH);
			const botRight = camera.screenToWorld(viewportW, viewportH, viewportW, viewportH);

			const minCol = Math.max(0, Math.floor(topLeft.x / tileSize));
			const maxCol = Math.min(cols - 1, Math.floor(botRight.x / tileSize) + 1);
			const minRow = Math.max(0, Math.floor(topLeft.y / tileSize));
			const maxRow = Math.min(rows - 1, Math.floor(botRight.y / tileSize) + 1);

			let renderedTiles = 0;
			for (let r = minRow; r <= maxRow; r++) {
				const rowData = grid[ r ];
				if (!rowData) continue;
				for (let c = minCol; c <= maxCol; c++) {
					const tileId = rowData[ c ];
					if (tileId === undefined || tileId === null || tileId === 0 || tileId === " " || tileId === ".") continue;

					const drawX = c * tileSize;
					const drawY = r * tileSize;
					const paletteEntry = tilePalette[ tileId ];

					if (typeof paletteEntry === "string") {
						ctx.fillStyle = paletteEntry;
						ctx.fillRect(drawX, drawY, tileSize, tileSize);
					} else if (paletteEntry?.color) {
						ctx.fillStyle = paletteEntry.color;
						ctx.fillRect(drawX, drawY, tileSize, tileSize);
					}
					renderedTiles++;
				}
			}
			return renderedTiles;
		},

		/**
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {string | HTMLCanvasElement | ImageBitmap} colorOrCanvas
		 * @param {number} speedRatio
		 * @param {{ x: number; y: number; }} camera
		 * @param {number} viewportW
		 * @param {number} viewportH
		 */
		renderParallax(ctx, colorOrCanvas, speedRatio, camera, viewportW, viewportH) {
			ctx.save();
			const offsetX = -(camera.x * speedRatio) % viewportW;
			const offsetY = -(camera.y * speedRatio) % viewportH;

			if (typeof colorOrCanvas === "string") {
				ctx.fillStyle = colorOrCanvas;
				ctx.fillRect(0, 0, viewportW, viewportH);
			} else if (colorOrCanvas?.width) {
				for (let x = offsetX - viewportW; x < viewportW * 2; x += colorOrCanvas.width) {
					for (let y = offsetY - viewportH; y < viewportH * 2; y += colorOrCanvas.height) {
						ctx.drawImage(colorOrCanvas, x, y);
					}
				}
			}
			ctx.restore();
		}
	});
	//#endregion

	//#region [SEC-06] Graphics Tier 3: Retro Pseudo-3D DDA Raycaster
	/**
	 * @param {(number | string)[][]} mapGrid
	 * @param {number} mapX
	 * @param {number} mapY
	 * @returns {number}
	 */
	function _checkCellHit(mapGrid, mapX, mapY) {
		if (mapY < 0 || mapY >= mapGrid.length) return 1;
		const row = mapGrid[ mapY ];
		if (!row || mapX < 0 || mapX >= row.length) return 1;
		const cell = row[ mapX ];
		if (!cell || cell === " " || cell === ".") return 0;
		const num = typeof cell === "number" ? cell : Number(cell);
		return Number.isNaN(num) ? 1 : num;
	}

	/**
	 * @param {(number | string)[][]} mapGrid
	 * @param {{ angle: number; x: number; y: number; }} player
	 * @param {number} rayAngle
	 * @param {number} rayIndex
	 */
	function _castSingleRay(mapGrid, player, rayAngle, rayIndex) {
		const rayDirX = Math.cos(rayAngle);
		const rayDirY = Math.sin(rayAngle);

		let mapX = Math.floor(player.x);
		let mapY = Math.floor(player.y);

		const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
		const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

		const stepX = rayDirX < 0 ? -1 : 1;
		let sideDistX = rayDirX < 0 ? (player.x - mapX) * deltaDistX : (mapX + 1.0 - player.x) * deltaDistX;

		const stepY = rayDirY < 0 ? -1 : 1;
		let sideDistY = rayDirY < 0 ? (player.y - mapY) * deltaDistY : (mapY + 1.0 - player.y) * deltaDistY;

		let hit = 0;
		let side = 0;
		let maxSteps = 64;

		while (hit === 0 && maxSteps > 0) {
			maxSteps--;
			if (sideDistX < sideDistY) {
				sideDistX += deltaDistX;
				mapX += stepX;
				side = 0;
			} else {
				sideDistY += deltaDistY;
				mapY += stepY;
				side = 1;
			}

			hit = _checkCellHit(mapGrid, mapX, mapY);
		}

		const perpWallDist = side === 0
			? (mapX - player.x + (1 - stepX) / 2) / (rayDirX || 0.00001)
			: (mapY - player.y + (1 - stepY) / 2) / (rayDirY || 0.00001);

		// Fish-eye lens correction
		const correctedDist = Math.max(0.1, perpWallDist * Math.cos(rayAngle - player.angle));

		let wallX = side === 0 ? player.y + perpWallDist * rayDirY : player.x + perpWallDist * rayDirX;
		wallX -= Math.floor(wallX);

		return {
			rayIndex,
			rayAngle,
			distance: correctedDist,
			hitTile: hit,
			side,
			wallX,
			mapX,
			mapY
		};
	}

	// =========================================================================
	// [GRAPHICS TIER 3] Retro Pseudo-3D DDA Raycaster & Mode-7 Engine
	// =========================================================================
	const PhoenixPseudo3DRaycaster = Object.freeze({
		/**
		 * @param {(number | string)[][]} mapGrid
		 * @param {{ angle: number; x: number; y: number; }} player
		 */
		castRays(mapGrid, player, fov = Math.PI / 3, numRays = 320) {
			if (!mapGrid || !player) return [];
			const results = [];
			const halfFov = fov / 2;

			for (let i = 0; i < numRays; i++) {
				const rayAngle = player.angle - halfFov + (i / numRays) * fov;
				results.push(_castSingleRay(mapGrid, player, rayAngle, i));
			}

			return results;
		},

		/**
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {Array<{ rayIndex: number; rayAngle: number; distance: number; hitTile: number | string; side: number; wallX: number; mapX: number; mapY: number }>} rayResults
		 * @param {number} screenW
		 * @param {number} screenH
		 */
		render3DView(ctx, rayResults, screenW, screenH, {
			ceilingColor = "#0d131a",
			floorColor = "#06090d",
			wallColor = "#00ffcc",
			fogDensity = 0.12
		} = {}) {
			if (!ctx || !rayResults || rayResults.length === 0) return;

			// Draw ceiling and floor
			ctx.fillStyle = ceilingColor;
			ctx.fillRect(0, 0, screenW, screenH / 2);
			ctx.fillStyle = floorColor;
			ctx.fillRect(0, screenH / 2, screenW, screenH / 2);

			const sliceWidth = screenW / rayResults.length;

			for (let i = 0; i < rayResults.length; i++) {
				const ray = rayResults[ i ];
				const lineHeight = Math.min(screenH * 4, (screenH / ray.distance));
				const drawStart = Math.max(0, -lineHeight / 2 + screenH / 2);
				const drawEnd = Math.min(screenH, lineHeight / 2 + screenH / 2);

				// Darken horizontal walls
				const sideFactor = ray.side === 1 ? 0.7 : 1.0;
				const fog = Math.min(1.0, ray.distance * fogDensity);

				ctx.fillStyle = wallColor;
				ctx.globalAlpha = (1.0 - fog) * sideFactor;
				ctx.fillRect(i * sliceWidth, drawStart, sliceWidth + 0.5, drawEnd - drawStart);
			}
			ctx.globalAlpha = 1.0;
		},

		/**
		 * @param {Array<{ x: number; y: number; [key: string]: unknown }>} sprites
		 * @param {{ angle: number; x: number; y: number; }} player
		 * @param {number} [fov]
		 * @param {number} [screenW]
		 * @param {number} [screenH]
		 */
		projectSprites(sprites, player, fov = Math.PI / 3, screenW = 640, screenH = 480) {
			if (!sprites || !player) return [];
			const projected = [];

			for (const spr of sprites) {
				const spriteX = spr.x - player.x;
				const spriteY = spr.y - player.y;

				const dirX = Math.cos(player.angle);
				const dirY = Math.sin(player.angle);
				const planeX = -dirY * Math.tan(fov / 2);
				const planeY = dirX * Math.tan(fov / 2);

				const invMat = 1.0 / (planeX * dirY - dirX * planeY || 0.00001);
				const transformX = invMat * (dirY * spriteX - dirX * spriteY);
				const transformY = invMat * (-planeY * spriteX + planeX * spriteY);

				if (transformY > 0.1) {
					const screenX = (screenW / 2) * (1 + transformX / transformY);
					const spriteHeight = Math.abs(screenH / transformY);
					const spriteWidth = Math.abs(screenH / transformY);
					projected.push({
						sprite: spr,
						distance: transformY,
						screenX,
						screenY: screenH / 2,
						width: spriteWidth,
						height: spriteHeight
					});
				}
			}

			// Sort back-to-front
			return projected.sort((a, b) => b.distance - a.distance);
		}
	});
	//#endregion

	//#region [SEC-07] Graphics Tier 4: 3D Fast Voxel DDA World Engine
	/**
	 * Pure Helper: Resolve face name and normal vector from hit side and ray step
	 * @param {number} side
	 * @param {number} stepX
	 * @param {number} stepY
	 * @param {number} stepZ
	 * @returns {{ normal: [number, number, number]; face: string }}
	 */
	function _resolveHitFaceAndNormal(side, stepX, stepY, stepZ) {
		if (side === 0) {
			return {
				normal: [ -stepX, 0, 0 ],
				face: stepX < 0 ? 'east' : 'west'
			};
		}
		if (side === 1) {
			return {
				normal: [ 0, -stepY, 0 ],
				face: stepY < 0 ? 'top' : 'bottom'
			};
		}
		return {
			normal: [ 0, 0, -stepZ ],
			face: stepZ < 0 ? 'south' : 'north'
		};
	}

	/**
	 * Pure Helper: Carve a perimeter wall column
	 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} vol
	 * @param {number} x
	 * @param {number} z
	 * @param {number} sizeY
	 */
	function _carvePerimeterWall(vol, x, z, sizeY) {
		for (let y = 1; y < sizeY - 1; y++) {
			vol.data[ (y * vol.sizeZ + z) * vol.sizeX + x ] = 2;
		}
	}

	/**
	 * Pure Helper: Carve interior dungeon pillar or pedestal
	 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} vol
	 * @param {number} x
	 * @param {number} z
	 * @param {number} sizeY
	 */
	function _carveInteriorFeature(vol, x, z, sizeY) {
		if ((x % 4 === 0) && (z % 4 === 0)) {
			for (let y = 1; y < sizeY - 1; y++) {
				vol.data[ (y * vol.sizeZ + z) * vol.sizeX + x ] = 3;
			}
		} else if ((x === 4 && z === 4) || (x === 11 && z === 11)) {
			vol.data[ (1 * vol.sizeZ + z) * vol.sizeX + x ] = 4;
		}
	}

	const PhoenixVoxel3DEngine = Object.freeze({
		/**
		 * Create a new 3D Voxel Volume Chunk
		 * @param {number} [sizeX=16]
		 * @param {number} [sizeY=8]
		 * @param {number} [sizeZ=16]
		 * @param {number} [defaultVoxel=0]
		 */
		createVolume(sizeX = 16, sizeY = 8, sizeZ = 16, defaultVoxel = 0) {
			const data = new Uint8Array(sizeX * sizeY * sizeZ);
			if (defaultVoxel > 0) data.fill(defaultVoxel);
			return {
				sizeX,
				sizeY,
				sizeZ,
				data
			};
		},

		/**
		 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
		 * @param {number} x
		 * @param {number} y
		 * @param {number} z
		 */
		getVoxel(volume, x, y, z) {
			if (!volume?.data) return 0;
			const ix = Math.floor(x);
			const iy = Math.floor(y);
			const iz = Math.floor(z);
			if (ix < 0 || ix >= volume.sizeX || iy < 0 || iy >= volume.sizeY || iz < 0 || iz >= volume.sizeZ) {
				return 0;
			}
			return volume.data[ (iy * volume.sizeZ + iz) * volume.sizeX + ix ];
		},

		/**
		 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
		 * @param {number} x
		 * @param {number} y
		 * @param {number} z
		 * @param {number} voxelType
		 */
		setVoxel(volume, x, y, z, voxelType) {
			if (!volume?.data) return false;
			const ix = Math.floor(x);
			const iy = Math.floor(y);
			const iz = Math.floor(z);
			if (ix < 0 || ix >= volume.sizeX || iy < 0 || iy >= volume.sizeY || iz < 0 || iz >= volume.sizeZ) {
				return false;
			}
			volume.data[ (iy * volume.sizeZ + iz) * volume.sizeX + ix ] = Math.max(0, Math.min(255, voxelType));
			return true;
		},

		/**
		 * Fast 3D Amanatides & Woo DDA Raycaster
		 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
		 * @param {{ x: number; y: number; z: number }} origin
		 * @param {{ x: number; y: number; z: number }} dir
		 * @param {number} [maxDist=32]
		 */
		castRay3D(volume, origin, dir, maxDist = 32) {
			const len = Math.hypot(dir.x, dir.y, dir.z) || 1.0;
			const dx = dir.x / len;
			const dy = dir.y / len;
			const dz = dir.z / len;

			let mapX = Math.floor(origin.x);
			let mapY = Math.floor(origin.y);
			let mapZ = Math.floor(origin.z);

			const stepX = dx < 0 ? -1 : 1;
			const stepY = dy < 0 ? -1 : 1;
			const stepZ = dz < 0 ? -1 : 1;

			const deltaDistX = Math.abs(1 / (dx || 1e-6));
			const deltaDistY = Math.abs(1 / (dy || 1e-6));
			const deltaDistZ = Math.abs(1 / (dz || 1e-6));

			let sideDistX = dx < 0 ? (origin.x - mapX) * deltaDistX : (mapX + 1.0 - origin.x) * deltaDistX;
			let sideDistY = dy < 0 ? (origin.y - mapY) * deltaDistY : (mapY + 1.0 - origin.y) * deltaDistY;
			let sideDistZ = dz < 0 ? (origin.z - mapZ) * deltaDistZ : (mapZ + 1.0 - origin.z) * deltaDistZ;

			let hit = 0;
			let side = 0;
			let distance = 0;
			let maxSteps = 96;

			while (hit === 0 && distance < maxDist && maxSteps > 0) {
				maxSteps--;
				if (sideDistX < sideDistY && sideDistX < sideDistZ) {
					distance = sideDistX;
					sideDistX += deltaDistX;
					mapX += stepX;
					side = 0;
				} else if (sideDistY < sideDistZ) {
					distance = sideDistY;
					sideDistY += deltaDistY;
					mapY += stepY;
					side = 1;
				} else {
					distance = sideDistZ;
					sideDistZ += deltaDistZ;
					mapZ += stepZ;
					side = 2;
				}

				hit = this.getVoxel(volume, mapX, mapY, mapZ);
			}

			if (hit === 0 || distance >= maxDist) {
				return { hit: false, distance: maxDist, x: mapX, y: mapY, z: mapZ, voxel: 0, face: 'none', normal: [ 0, 0, 0 ] };
			}

			const { normal, face } = _resolveHitFaceAndNormal(side, stepX, stepY, stepZ);

			return {
				hit: true,
				distance,
				x: mapX,
				y: mapY,
				z: mapZ,
				voxel: hit,
				side,
				face,
				normal
			};
		},

		/**
		 * Procedural 3D Voxel Dungeon Generator
		 * @param {number} [sizeX=16]
		 * @param {number} [sizeY=6]
		 * @param {number} [sizeZ=16]
		 */
		generateDungeonVolume(sizeX = 16, sizeY = 6, sizeZ = 16) {
			const vol = this.createVolume(sizeX, sizeY, sizeZ, 0);

			for (let x = 0; x < sizeX; x++) {
				for (let z = 0; z < sizeZ; z++) {
					this.setVoxel(vol, x, 0, z, 1);
					this.setVoxel(vol, x, sizeY - 1, z, 1);

					const isPerimeter = x === 0 || x === sizeX - 1 || z === 0 || z === sizeZ - 1;
					if (isPerimeter) {
						_carvePerimeterWall(vol, x, z, sizeY);
					} else {
						_carveInteriorFeature(vol, x, z, sizeY);
					}
				}
			}
			return vol;
		},

		/**
		 * Render 3D Voxel Perspective View to 2D Canvas
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
		 * @param {{ x: number; y: number; z: number; yaw: number; pitch: number }} camera
		 * @param {number} screenW
		 * @param {number} screenH
		 * @param {{ fov?: number; numRays?: number; fogDensity?: number; palette?: Record<number, string> }} [options]
		 */
		renderVoxelView(ctx, volume, camera, screenW, screenH, {
			fov = Math.PI / 3,
			numRays = 160,
			fogDensity = 0.08,
			palette = {
				1: '#3a4750', // Floor/Ceiling Stone
				2: '#00ffa3', // Boundary Wall Cyan/Emerald
				3: '#00b4d8', // Pillar Azure
				4: '#ffd166', // Gold/Pedestal
				5: '#ff006e'  // Lava/Ruby
			}
		} = {}) {
			if (!ctx || !volume) return;

			const gradCeiling = ctx.createLinearGradient(0, 0, 0, screenH / 2);
			gradCeiling.addColorStop(0, '#04070a');
			gradCeiling.addColorStop(1, '#0c131a');
			ctx.fillStyle = gradCeiling;
			ctx.fillRect(0, 0, screenW, screenH / 2);

			const gradFloor = ctx.createLinearGradient(0, screenH / 2, 0, screenH);
			gradFloor.addColorStop(0, '#080d12');
			gradFloor.addColorStop(1, '#020406');
			ctx.fillStyle = gradFloor;
			ctx.fillRect(0, screenH / 2, screenW, screenH / 2);

			const sliceW = screenW / numRays;
			const cosPitch = Math.cos(camera.pitch || 0);
			const sinPitch = Math.sin(camera.pitch || 0);

			for (let i = 0; i < numRays; i++) {
				const rayYaw = (camera.yaw || 0) - fov / 2 + (i / numRays) * fov;
				const rayDir = {
					x: Math.cos(rayYaw) * cosPitch,
					y: sinPitch,
					z: Math.sin(rayYaw) * cosPitch
				};

				const result = this.castRay3D(volume, camera, rayDir, 28);
				if (result.hit) {
					const correctedDist = Math.max(0.1, result.distance * Math.cos(rayYaw - (camera.yaw || 0)));
					const sliceHeight = Math.min(screenH * 3, (screenH / correctedDist) * 1.2);
					const horizonOffset = sinPitch * (screenH / 2);
					const drawTop = (screenH / 2) - (sliceHeight / 2) + horizonOffset;

					const baseColor = palette[ result.voxel ] || '#00ffcc';
					let brightness = 0.7;
					if (result.face === 'top') brightness = 1.2;
					else if (result.face === 'bottom') brightness = 0.5;
					else if (result.face === 'east' || result.face === 'west') brightness = 0.85;

					const fog = Math.min(1.0, correctedDist * fogDensity);

					ctx.save();
					ctx.fillStyle = baseColor;
					ctx.globalAlpha = Math.max(0.05, (1.0 - fog) * brightness);
					ctx.fillRect(i * sliceW, drawTop, sliceW + 0.5, sliceHeight);

					ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
					ctx.fillRect(i * sliceW, drawTop, sliceW + 0.5, 2);
					ctx.restore();
				}
			}
		}
	});
	//#endregion

	//#region [SEC-08] Graphics Tier 5: Demoscene Procedural Terrain Raymarcher
	const PhoenixTerrainRaymarcher = Object.freeze({
		/**
		 * Deterministic 2D PRNG Hash
		 * @param {number} x
		 * @param {number} z
		 */
		hash2(x, z) {
			const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
			return n - Math.floor(n);
		},

		/**
		 * Smooth 2D Interpolated Value Noise
		 * @param {number} x
		 * @param {number} z
		 */
		noise2(x, z) {
			const ix = Math.floor(x);
			const iz = Math.floor(z);
			const fx = x - ix;
			const fz = z - iz;

			const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
			const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

			const a = this.hash2(ix, iz);
			const b = this.hash2(ix + 1, iz);
			const c = this.hash2(ix, iz + 1);
			const d = this.hash2(ix + 1, iz + 1);

			return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
		},

		/**
		 * Fractional Brownian Motion (FBM) Multi-Octave Noise
		 * @param {number} x
		 * @param {number} z
		 * @param {number} [octaves=5]
		 */
		fbm(x, z, octaves = 5) {
			let total = 0.0;
			let amplitude = 0.5;
			let frequency = 1.0;

			for (let i = 0; i < octaves; i++) {
				total += amplitude * this.noise2(x * frequency, z * frequency);
				frequency *= 2.02;
				amplitude *= 0.5;
			}
			return total;
		},

		/**
		 * Sample elevation height at world coordinate (x, z)
		 * @param {number} x
		 * @param {number} z
		 * @param {number} [scale=0.035]
		 * @param {number} [maxHeight=24]
		 */
		sampleHeight(x, z, scale = 0.035, maxHeight = 24) {
			const raw = this.fbm(x * scale, z * scale, 5);
			const elevation = Math.pow(raw, 1.4) * maxHeight;
			return Math.max(0.5, elevation);
		},

		/**
		 * Compute analytical surface normal at world coordinate (x, z)
		 * @param {number} x
		 * @param {number} z
		 * @param {number} [eps=0.15]
		 */
		computeNormal(x, z, eps = 0.15) {
			const hL = this.sampleHeight(x - eps, z);
			const hR = this.sampleHeight(x + eps, z);
			const hD = this.sampleHeight(x, z - eps);
			const hU = this.sampleHeight(x, z + eps);

			const nx = hL - hR;
			const ny = 2.0 * eps;
			const nz = hD - hU;
			const len = Math.hypot(nx, ny, nz) || 1.0;

			return [ nx / len, ny / len, nz / len ];
		},

		/**
		 * Raymarch across procedural heightmap terrain
		 * @param {{ x: number; y: number; z: number }} origin
		 * @param {{ x: number; y: number; z: number }} dir
		 * @param {number} [maxDist=120]
		 * @param {number} [stepSize=0.6]
		 */
		castTerrainRay(origin, dir, maxDist = 120, stepSize = 0.6) {
			let t = 0.5;
			let hit = false;
			let px = origin.x;
			let py = origin.y;
			let pz = origin.z;
			let currentHeight = 0;

			while (t < maxDist) {
				px = origin.x + dir.x * t;
				py = origin.y + dir.y * t;
				pz = origin.z + dir.z * t;

				currentHeight = this.sampleHeight(px, pz);
				if (py <= currentHeight) {
					hit = true;
					break;
				}

				const distAboveTerrain = py - currentHeight;
				t += Math.max(stepSize, distAboveTerrain * 0.4);
			}

			if (!hit) {
				return { hit: false, distance: maxDist, x: px, y: py, z: pz, height: 0, normal: [ 0, 1, 0 ], material: 'sky' };
			}

			const normal = this.computeNormal(px, pz);
			let material = 'grass';
			if (currentHeight < 2.0) material = 'water';
			else if (currentHeight > 16.0) material = 'snow';
			else if (normal[ 1 ] < 0.65) material = 'rock';

			return {
				hit: true,
				distance: t,
				x: px,
				y: py,
				z: pz,
				height: currentHeight,
				normal,
				material
			};
		},

		/**
		 * Render Procedural Landscape with Sun Lighting & Atmosphere to 2D Canvas
		 * @param {CanvasRenderingContext2D} ctx
		 * @param {{ x: number; y: number; z: number; yaw: number; pitch: number }} camera
		 * @param {number} screenW
		 * @param {number} screenH
		 * @param {{ fov?: number; numRays?: number; sunAngle?: number; fogDensity?: number }} [options]
		 */
		renderTerrainView(ctx, camera, screenW, screenH, {
			fov = Math.PI / 3,
			numRays = 160,
			sunAngle = 0.8,
			fogDensity = 0.015
		} = {}) {
			if (!ctx) return;

			const sunX = Math.cos(sunAngle);
			const sunY = Math.sin(sunAngle);
			const sunZ = 0.5;

			const skyGrad = ctx.createLinearGradient(0, 0, 0, screenH);
			skyGrad.addColorStop(0.0, '#030814');
			skyGrad.addColorStop(0.5, '#0b1d3a');
			skyGrad.addColorStop(0.7, '#1b3b6f');
			skyGrad.addColorStop(1.0, '#468faf');
			ctx.fillStyle = skyGrad;
			ctx.fillRect(0, 0, screenW, screenH);

			const sunScreenY = screenH * 0.35 - (camera.pitch || 0) * (screenH / 2);
			const sunScreenX = screenW * 0.65 - (camera.yaw || 0) * 120;
			const sunGlow = ctx.createRadialGradient(sunScreenX, sunScreenY, 5, sunScreenX, sunScreenY, 80);
			sunGlow.addColorStop(0.0, 'rgba(255, 235, 180, 0.9)');
			sunGlow.addColorStop(0.3, 'rgba(255, 180, 80, 0.4)');
			sunGlow.addColorStop(1.0, 'rgba(255, 120, 50, 0.0)');
			ctx.fillStyle = sunGlow;
			ctx.beginPath();
			ctx.arc(sunScreenX, sunScreenY, 80, 0, Math.PI * 2);
			ctx.fill();

			const sliceW = screenW / numRays;
			const cosPitch = Math.cos(camera.pitch || 0);
			const sinPitch = Math.sin(camera.pitch || 0);

			for (let i = 0; i < numRays; i++) {
				const rayYaw = (camera.yaw || 0) - fov / 2 + (i / numRays) * fov;
				const rayDir = {
					x: Math.cos(rayYaw) * cosPitch,
					y: sinPitch - 0.15,
					z: Math.sin(rayYaw) * cosPitch
				};

				const result = this.castTerrainRay(camera, rayDir, 90);
				if (result.hit) {
					const correctedDist = Math.max(0.1, result.distance * Math.cos(rayYaw - (camera.yaw || 0)));
					const horizonOffset = sinPitch * (screenH / 2);
					const drawTop = (screenH / 2) + horizonOffset - (result.height * 2.5);

					const dotSun = Math.max(0.1, result.normal[ 0 ] * sunX + result.normal[ 1 ] * sunY + result.normal[ 2 ] * sunZ);

					let r = 20, g = 140, b = 60;
					if (result.material === 'snow') { r = 220; g = 235; b = 255; }
					else if (result.material === 'rock') { r = 90; g = 95; b = 105; }
					else if (result.material === 'water') { r = 0; g = 120; b = 210; }

					const fog = Math.min(1.0, correctedDist * fogDensity);
					const finalR = Math.round(r * dotSun * (1.0 - fog) + 27 * fog);
					const finalG = Math.round(g * dotSun * (1.0 - fog) + 59 * fog);
					const finalB = Math.round(b * dotSun * (1.0 - fog) + 111 * fog);

					ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
					ctx.fillRect(i * sliceW, Math.max(0, drawTop), sliceW + 0.5, screenH - drawTop);
				}
			}
		},

		/**
		 * Standalone Demoscene GLSL Raymarching Fragment Shader (< 4KB)
		 */
		getWebGLTerrainShaderSource() {
			return `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_cam_pos;
uniform vec2 u_cam_angle;

float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i + vec2(0,0)), hash2(i + vec2(1,0)), u.x),
               mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise2(p); p *= 2.03; a *= 0.5; }
    return v;
}
float mapTerrain(vec3 p) {
    float h = pow(fbm(p.xz * 0.04), 1.5) * 20.0;
    return p.y - h;
}
vec3 calcNormal(vec3 p) {
    float d = mapTerrain(p);
    vec2 e = vec2(0.05, 0.0);
    return normalize(vec3(mapTerrain(p + e.xyy) - d, e.x, mapTerrain(p + e.yyx) - d));
}
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    vec3 rayDir = normalize(vec3(uv.x, uv.y - 0.2, 1.0));
    vec3 rayPos = u_cam_pos;
    float t = 0.2;
    vec3 col = mix(vec3(0.05, 0.1, 0.25), vec3(0.3, 0.6, 0.8), uv.y + 0.5);
    for (int i = 0; i < 64; i++) {
        vec3 p = rayPos + rayDir * t;
        float dist = mapTerrain(p);
        if (dist < 0.02) {
            vec3 n = calcNormal(p);
            vec3 sunDir = normalize(vec3(0.8, 0.6, 0.4));
            float diff = max(dot(n, sunDir), 0.1);
            vec3 matCol = p.y < 1.0 ? vec3(0.0, 0.5, 0.9) : (p.y > 14.0 ? vec3(0.9, 0.95, 1.0) : vec3(0.1, 0.6, 0.25));
            float fog = 1.0 - exp(-t * 0.018);
            col = mix(matCol * diff, col, fog);
            break;
        }
        t += max(0.2, dist * 0.5);
        if (t > 100.0) break;
    }
    gl_FragColor = vec4(col, 1.0);
}`;
		}
	});
	//#endregion

	//#region [SEC-09] Code Formatting & Deep Linter Suite
	const PhoenixCodeFormatter = Object.freeze({
		/**
		 * Lightweight Zero-Dependency Deterministic JS Code Formatter
		 * @param {string} code
		 * @param {{ indent?: number; tab?: boolean }} [options]
		 */
		formatJS(code, { indent = 2, tab = false } = {}) {
			if (typeof code !== 'string') return '';
			const indentStr = tab ? '\t' : ' '.repeat(indent);
			const lines = code.split(/\r?\n/);
			let level = 0;
			const formattedLines = [];

			for (const rawLine of lines) {
				const line = rawLine.trim();
				if (!line) {
					formattedLines.push('');
					continue;
				}

				if (/^[}\])]/.test(line)) {
					level = Math.max(0, level - 1);
				}

				formattedLines.push(indentStr.repeat(level) + line);

				if (/[{([]$/.test(line)) {
					level++;
				}
			}
			return formattedLines.join('\n');
		},

		/**
		 * Pretty Print JSON string with error fallback
		 * @param {string} jsonStr
		 * @param {number} [indent=2]
		 */
		formatJSON(jsonStr, indent = 2) {
			try {
				const parsed = JSON.parse(jsonStr);
				return JSON.stringify(parsed, null, indent);
			} catch {
				// Fallback to unformatted raw string if JSON parsing fails
				return jsonStr;
			}
		}
	});

	const PhoenixLinterSuite = Object.freeze({
		/**
		 * Computes the cognitive complexity score of a JavaScript code block or function.
		 * @param {string} code
		 * @returns {number}
		 */
		calculateCognitiveComplexity(code) {
			if (typeof code !== 'string') return 0;
			const lines = code.split(/\r?\n/);
			let complexity = 0;
			let nesting = 0;

			for (const rawLine of lines) {
				const line = rawLine.replace(/\/\/.*/, '').replace(/\/\*.*?\*\//g, '').trim();
				if (!line) continue;

				const closeBraces = (line.match(/\}/g) || []).length;
				const openBraces = (line.match(/\{/g) || []).length;

				const hasIf = /\bif\s*\(/.test(line);
				const hasElseIf = /\belse\s+if\s*\(/.test(line);
				const hasElse = /\belse\b/.test(line) && !hasElseIf;
				const hasLoop = /\b(for|while|do)\b/.test(line);
				const hasCatch = /\bcatch\s*\(/.test(line);
				const hasSwitch = /\bswitch\s*\(/.test(line);
				const hasTernary = /\?.*:/.test(line);

				let structuralHits = 0;
				if (hasIf || hasElseIf || hasLoop || hasCatch || hasSwitch) structuralHits++;
				if (hasElse || hasTernary) structuralHits++;

				const logicalOps = (line.match(/(&&|\|\||\?\?)/g) || []).length;

				if (structuralHits > 0) {
					complexity += structuralHits * (1 + nesting);
				}
				complexity += logicalOps;

				if (openBraces > closeBraces) {
					nesting += (openBraces - closeBraces);
				} else if (closeBraces > openBraces) {
					nesting = Math.max(0, nesting - (closeBraces - openBraces));
				}
			}
			return complexity;
		},

		/**
		 * Scans source code for function declarations and measures cognitive complexity against threshold.
		 * @param {string} source
		 * @param {number} [threshold=15]
		 * @returns {Array<{ name: string; line: number; endLine: number; complexity: number; score: number; codeSlice: string }>}
		 */
		scanFunctionsComplexity(source, threshold = 15) {
			if (typeof source !== 'string') return [];
			const lines = source.split(/\r?\n/);
			const results = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[ i ];
				const fnMatch = line.match(/(?:async\s+)?function\s*([A-Za-z0-9_$]+)?\s*\(([^)]*)\)|(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/);
				if (fnMatch && line.includes('{')) {
					const fnName = fnMatch[ 1 ] || fnMatch[ 3 ] || 'anonymous';
					let open = 0;
					let endLine = i;
					const fnLines = [];
					for (let j = i; j < lines.length; j++) {
						fnLines.push(lines[ j ]);
						open += (lines[ j ].match(/\{/g) || []).length;
						open -= (lines[ j ].match(/\}/g) || []).length;
						if (open <= 0 && j > i) {
							endLine = j;
							break;
						}
					}
					const fnBody = fnLines.join('\n');
					const score = this.calculateCognitiveComplexity(fnBody);
					if (score > threshold) {
						results.push({
							name: fnName,
							line: i + 1,
							endLine: endLine + 1,
							complexity: score,
							score,
							codeSlice: fnBody
						});
					}
				}
			}
			return results;
		},

		/**
		 * Multi-Pass Structural and Syntax Linter
		 * @param {string} source
		 * @param {string} [filename='unknown.js']
		 * @returns {Array<{ line: number; col: number; message: string; severity: 'error' | 'warning' }>}
		 */
		lintCode(source, filename = 'unknown.js') {
			/** @type {Array<{ line: number; col: number; message: string; severity: 'error' | 'warning' }>} */
			const issues = [];
			if (typeof source !== 'string') return issues;
			const lines = source.split(/\r?\n/);

			for (let i = 0; i < lines.length; i++) {
				const lineNum = i + 1;
				const line = lines[ i ];

				if (line.includes('// ...') || line.includes('/* ... */')) {
					issues.push({ line: lineNum, col: 1, message: 'Forbidden incomplete placeholder code pattern', severity: 'error' });
				}
				if (line.includes('TODO(impl)') || line.includes('FIXME')) {
					issues.push({ line: lineNum, col: 1, message: 'Unfinished implementation annotation found', severity: 'warning' });
				}
				if (line.includes('eval(') || line.includes('new Function(')) {
					issues.push({ line: lineNum, col: 1, message: 'Dynamic code execution forbidden by Faraday Isolation', severity: 'error' });
				}
				if (line.includes('debugger;')) {
					issues.push({ line: lineNum, col: 1, message: 'Leftover debugger statement', severity: 'warning' });
				}
			}
			return issues;
		}
	});

	/* =========================================================================
	 * [SEC-15] ERROR RESOLUTION LEDGER (ERL-001) & BATCH REMEDIATION PIPELINE
	 * ========================================================================= */
	/**
	 * @typedef {Object} ERLResolutionTemplate
	 * @property {string} id
	 * @property {string} fingerprint
	 * @property {string} rule
	 * @property {string} description
	 * @property {string} searchPattern
	 * @property {string} replacePattern
	 * @property {boolean} [isRegex]
	 * @property {string} [verifiedReceipt]
	 * @property {string} timestamp
	 * @property {number} useCount
	 */

	class PhoenixErrorResolutionLedger {
		constructor() {
			/** @type {Map<string, ERLResolutionTemplate>} */
			this._entries = new Map();
			this._initSeedTemplates();
		}

		_initSeedTemplates() {
			this.record({
				id: 'erl_seed_math_random',
				fingerprint: 'MATH/RANDOM',
				rule: 'MATH/RANDOM',
				description: 'Replace unseeded Math.random() with deterministic Emberlight PRNG',
				searchPattern: 'Math.random()',
				replacePattern: '(_rng.next() / 0xFFFFFFFF)',
				verifiedReceipt: 'PASS',
				timestamp: '2026-01-01T00:00:00.000Z',
				useCount: 1
			});

			this.record({
				id: 'erl_seed_debugger',
				fingerprint: 'DEBUGGER',
				rule: 'DEBUGGER',
				description: 'Strip leftover debugger statements',
				searchPattern: 'debugger;',
				replacePattern: '',
				verifiedReceipt: 'PASS',
				timestamp: '2026-01-01T00:00:00.000Z',
				useCount: 1
			});
		}

		/**
		 * Computes structural diagnostic fingerprint
		 * @param {{ rule?: string; message?: string; line?: number; fnName?: string }} diag
		 * @param {string} [codeSnippet]
		 * @returns {string}
		 */
		computeFingerprint(diag, codeSnippet = '') {
			const rule = diag?.rule || 'UNKNOWN';
			if (rule === 'MATH/RANDOM') return 'MATH/RANDOM';
			if (rule === 'DEBUGGER' || (codeSnippet?.includes('debugger;'))) return 'DEBUGGER';
			if (diag?.fnName) return `${rule}:${diag.fnName}`;
			if (codeSnippet) {
				const trimmed = codeSnippet.trim().slice(0, 80);
				return `${rule}:${hash(trimmed)}`;
			}
			return rule;
		}

		/**
		 * Look up an exact or rule-based template
		 * @param {string} fingerprint
		 * @returns {ERLResolutionTemplate | null}
		 */
		lookup(fingerprint) {
			if (!fingerprint) return null;
			return this._entries.get(fingerprint) || null;
		}

		/**
		 * Checks if diagnostic matches a template
		 * @param {{ rule?: string; message?: string; line?: number; fnName?: string }} diag
		 * @param {string} [lineText='']
		 * @returns {ERLResolutionTemplate | null}
		 */
		findMatch(diag, lineText = '') {
			const fp = this.computeFingerprint(diag, lineText);
			const exact = this.lookup(fp);
			if (exact) return exact;
			if (diag?.rule && this._entries.has(diag.rule)) {
				return this._entries.get(diag.rule);
			}
			return null;
		}

		/**
		 * Record or update a resolution template
		 * @param {ERLResolutionTemplate} entry
		 */
		record(entry) {
			if (!entry?.fingerprint) return;
			const existing = this._entries.get(entry.fingerprint);
			const useCount = (existing ? existing.useCount : 0) + (entry.useCount || 1);
			const finalized = {
				id: entry.id || `erl_${Date.now()}_${uid()}`,
				fingerprint: entry.fingerprint,
				rule: entry.rule || 'UNKNOWN',
				description: entry.description || 'Verified error repair template',
				searchPattern: entry.searchPattern || '',
				replacePattern: entry.replacePattern || '',
				verifiedReceipt: entry.verifiedReceipt || 'PASS',
				timestamp: entry.timestamp || new Date().toISOString(),
				useCount
			};
			this._entries.set(entry.fingerprint, finalized);
		}

		/**
		 * Serializes all ledger entries to NDJSON format
		 * @returns {string}
		 */
		exportNDJSON() {
			const lines = [];
			for (const entry of this._entries.values()) {
				lines.push(JSON.stringify(entry));
			}
			return lines.join('\n');
		}

		/**
		 * Deserializes and loads NDJSON content
		 * @param {string} ndjson
		 * @returns {number} count of imported records
		 */
		importNDJSON(ndjson) {
			if (typeof ndjson !== 'string' || !ndjson.trim()) return 0;
			const lines = ndjson.split(/\r?\n/);
			let count = 0;
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				try {
					const parsed = JSON.parse(trimmed);
					if (parsed.fingerprint) {
						this.record(parsed);
						count++;
					}
				} catch (e) {
					console.warn('[PHOENIX/ERL] Skipped invalid NDJSON line:', e);
				}
			}
			return count;
		}

		get size() {
			return this._entries.size;
		}

		getAllEntries() {
			return Array.from(this._entries.values());
		}
	}

	class PhoenixBatchRemediationPipeline {
		/**
		 * Executes a 2-phase batch remediation (Ledger fast-path + optional AI fallback)
		 * @param {string} sourceCode
		 * @param {Array<{ rule?: string; message?: string; line?: number; col?: number; fnName?: string; quickFix?: any }>} diagnostics
		 * @param {string} filePath
		 * @param {PhoenixErrorResolutionLedger} ledger
		 * @param {Function} sandboxVerifier Function(patchedSource) -> { pass: boolean, remainingErrors: any[] }
		 * @returns {{ pass: boolean; patchedSource: string; fastPathApplied: number; unresolvedDiagnostics: Array<any>; appliedChanges: Array<any> }}
		 */
		static executeFastPath(sourceCode, diagnostics, filePath, ledger, sandboxVerifier) {
			let currentSource = sourceCode;
			const lines = currentSource.split('\n');
			const unresolvedDiagnostics = [];
			const appliedChanges = [];
			let fastPathApplied = 0;

			for (const diag of diagnostics) {
				const lineIdx = (diag.line || 1) - 1;
				const lineText = lines[ lineIdx ] || '';
				const match = ledger ? ledger.findMatch(diag, lineText) : null;

				if (match?.searchPattern && currentSource.includes(match.searchPattern)) {
					const candidate = currentSource.replace(match.searchPattern, match.replacePattern);
					const verification = typeof sandboxVerifier === 'function' ? sandboxVerifier(candidate) : { pass: true };
					if (verification.pass) {
						currentSource = candidate;
						fastPathApplied++;
						match.useCount = (match.useCount || 0) + 1;
						appliedChanges.push({
							type: 'replace_text',
							search: match.searchPattern,
							content: match.replacePattern,
							rule: match.rule,
							via: 'ERL-001'
						});
						continue;
					}
				}

				unresolvedDiagnostics.push(diag);
			}

			return {
				pass: unresolvedDiagnostics.length === 0,
				patchedSource: currentSource,
				fastPathApplied,
				unresolvedDiagnostics,
				appliedChanges
			};
		}
	}
	//#endregion

	//#region [SEC-10] Layer 1: Structural Linter & Proposal Shape Validator
	/**
	 * Audit a single source string for forbidden patterns
	 * @param {string} source
	 * @returns {string[]}
	 */
	function lintSource(source) {
		const errors = [];
		if (typeof source !== "string") {
			errors.push("source must be a string");
			return errors;
		}
		if (source.includes("// ..."))
			errors.push('placeholder "// ..." is forbidden');
		if (source.includes("/* ... */"))
			errors.push('placeholder "/* ... */" is forbidden');
		if (source.includes("TODO(impl)"))
			errors.push("placeholder TODO(impl) is forbidden");
		return errors;
	}

	/**
	 * Validates individual change entries in proposal
	 * @param {PhoenixChangeDTO | Record<string, unknown>} c
	 * @param {number} idx
	 * @param {string[]} e
	 */
	function _validateChangeEntry(c, idx, e) {
		if (!isPlain(c)) {
			e.push(`change[${idx}] must be a plain object`);
			return;
		}
		const ALLOWED_TYPES = [
			"replace_text",
			"insert_before",
			"insert_after",
			"create_file",
			"delete_file",
		];
		if (!ALLOWED_TYPES.includes(String(c.type)))
			e.push(`change[${idx}] unsupported type: ${c.type}`);
		if (
			typeof c.path !== "string" ||
			c.path.length < 1 ||
			c.path.length > 512
		) {
			e.push(`change[${idx}] invalid path`);
		} else if (
			c.path.includes("..") ||
			c.path.startsWith("/") ||
			c.path.includes("\\")
		) {
			e.push(`change[${idx}] unsafe path traversal`);
		}
		if (c.type !== "delete_file" && typeof c.content !== "string")
			e.push(`change[${idx}] content must be a string`);
		if (typeof c.content === "string") {
			const lintErrors = lintSource(c.content);
			lintErrors.forEach((le) => {
				e.push(`change[${idx}] linter: ${le}`);
			});
		}
	}

	/**
	 * Full structural validation of a proposal object per PGE-DSL-1 schema
	 * @param {PhoenixProposalDTO | Record<string, unknown>} p
	 * @returns {string[]}
	 */
	function validateProposalShape(p) {
		/** @type {string[]} */
		const e = [];
		if (!isPlain(p)) return [ "proposal must be a plain object" ];
		if (p.schemaVersion !== SCHEMA_VERSION)
			e.push(`schemaVersion must be ${SCHEMA_VERSION}`);
		if (!RE_ID.test(String(p.proposalId || "")))
			e.push("proposalId is invalid");
		if (!RE_ID.test(String(p.target || ""))) e.push("target is invalid");
		if (![ "CREATE", "MODIFY", "DELETE", "REPLACE" ].includes(String(p.operation)))
			e.push("invalid operation");
		if (
			typeof p.intent !== "string" ||
			p.intent.length < 1 ||
			p.intent.length > 4096
		)
			e.push("intent must be 1..4096 characters");
		if (
			!Array.isArray(p.changes) ||
			p.changes.length < 1 ||
			p.changes.length > 64
		)
			e.push("changes must contain 1..64 entries");
		if (!Array.isArray(p.expectedInvariants))
			e.push("expectedInvariants must be an array");
		if (!Array.isArray(p.testsRequested))
			e.push("testsRequested must be an array");
		if (!Array.isArray(p.requiredCapabilities))
			e.push("requiredCapabilities must be an array");

		const reqCaps = Array.isArray(p.requiredCapabilities) ? p.requiredCapabilities : [];
		reqCaps.forEach((/** @type {string} */ c) => {
			if (!RE_CAP.test(String(c))) e.push(`invalid capability: ${c}`);
		});

		const changes = Array.isArray(p.changes) ? p.changes : [];
		changes.forEach((/** @type {PhoenixChangeDTO | Record<string, unknown>} */ c, /** @type {number} */ idx) => {
			_validateChangeEntry(c, idx, e);
		});
		return e;
	}
	//#endregion

	//#region [SEC-11] Layer 0: Specification Registry & Capability Registry
	class SpecificationRegistry {
		constructor() {
			/** @type {Map<string, { id: string; tenant: string; path: string; writable: boolean; allowedOperations: string[]; capabilities: string[]; dependencies: string[]; }>} */
			this._targets = new Map();
			/** @type {Map<string, Function>} */
			this._contracts = new Map();
			/** @type {Map<string, Function>} */
			this._invariants = new Map();
			/** @type {Map<string, Function>} */
			this._tests = new Map();
		}

		/**
		 * @param {string} name
		 * @param {Record<string, unknown>} descriptor
		 */
		registerTarget(name, descriptor) {
			assert(RE_ID.test(name), `invalid target name: ${name}`);
			assert(isPlain(descriptor), "target descriptor must be a plain object");
			this._targets.set(
				name,
				Object.freeze({
					id: name,
					tenant: typeof descriptor.tenant === "string" ? descriptor.tenant : "unknown",
					path: typeof descriptor.path === "string" ? descriptor.path : name,
					writable: descriptor.writable !== false,
					allowedOperations: Array.isArray(descriptor.allowedOperations)
						? descriptor.allowedOperations.slice()
						: [ "MODIFY" ],
					capabilities: Array.isArray(descriptor.capabilities)
						? descriptor.capabilities.slice()
						: [],
					dependencies: Array.isArray(descriptor.dependencies)
						? descriptor.dependencies.slice()
						: [],
				}),
			);
		}

		/**
		 * @param {string} name
		 * @param {Function} fn
		 */
		registerContract(name, fn) {
			assert(
				RE_ID.test(name) && typeof fn === "function",
				`invalid contract: ${name}`,
			);
			this._contracts.set(name, fn);
		}

		/**
		 * @param {string} name
		 * @param {Function} fn
		 */
		registerInvariant(name, fn) {
			assert(
				RE_ID.test(name) && typeof fn === "function",
				`invalid invariant: ${name}`,
			);
			this._invariants.set(name, fn);
		}

		/**
		 * @param {string} name
		 * @param {Function} fn
		 */
		registerTest(name, fn) {
			assert(
				RE_ID.test(name) && typeof fn === "function",
				`invalid test: ${name}`,
			);
			this._tests.set(name, fn);
		}

		get targets() {
			return this._targets;
		}
		get contracts() {
			return this._contracts;
		}
		get invariants() {
			return this._invariants;
		}
		get tests() {
			return this._tests;
		}
	}

	class CapabilityRegistry {
		constructor() {
			/** @type {Map<string, { granted: boolean, expiryTick: number }>} */
			this._grants = new Map();
		}

		/**
		 * @param {string} subject
		 * @param {string} capability
		 * @param {string} target
		 * @param {string} [transactionId]
		 * @param {number} [expiryTick]
		 * @returns {string}
		 */
		grant(subject, capability, target, transactionId = "tx-0", expiryTick = Number.POSITIVE_INFINITY) {
			assert(RE_CAP.test(capability), `invalid capability: ${capability}`);
			const key = `${subject}|${capability}|${target}|${transactionId}`;
			this._grants.set(key, {
				granted: true,
				expiryTick,
			});
			return key;
		}

		/**
		 * @param {string} subject
		 * @param {string} capability
		 * @param {string} target
		 * @param {string} [transactionId]
		 * @param {number} [currentTick]
		 * @returns {boolean}
		 */
		has(subject, capability, target, transactionId, currentTick) {
			const tx = transactionId || "tx-0";
			const key = `${subject}|${capability}|${target}|${tx}`;
			let entry = this._grants.get(key);
			if (!entry && tx !== "tx-0") {
				entry = this._grants.get(`${subject}|${capability}|${target}|tx-0`);
			}
			if (!entry) return false;
			if (currentTick !== undefined && currentTick > entry.expiryTick) {
				this._grants.delete(key);
				return false;
			}
			return entry.granted;
		}

		/**
		 * @param {string} transactionId
		 */
		clearTransaction(transactionId) {
			const suffix = `|${transactionId}`;
			for (const key of this._grants.keys()) {
				if (key.endsWith(suffix)) this._grants.delete(key);
			}
		}

		/**
		 * @param {number} currentTick
		 */
		pruneExpired(currentTick) {
			for (const [ key, entry ] of this._grants) {
				if (currentTick > entry.expiryTick) this._grants.delete(key);
			}
		}
	}
	//#endregion

	//#region [SEC-12] Layer 3: In-Memory Receipt Ledger
	class ReceiptLedger {
		/**
		 * @param {number} [limit]
		 */
		constructor(limit) {
			this._limit = limit || LEDGER_LIMIT;
			/** @type {PhoenixReceiptDTO[]} */
			this._items = [];
		}

		/**
		 * @param {PhoenixReceiptDTO} receipt
		 */
		append(receipt) {
			this._items.push(clone(receipt));
			if (this._items.length > this._limit) this._items.shift();
		}

		/** @returns {PhoenixReceiptDTO[]} */
		list() {
			return this._items.map(clone);
		}

		/** @returns {PhoenixReceiptDTO | null} */
		latest() {
			const last = this._items.at(-1);
			return last ? clone(last) : null;
		}
		get size() {
			return this._items.length;
		}
	}
	//#endregion

	//#region [SEC-13] Layer 0: Sovereign Storage (OPFS & FSA Virtual VFS)
	class SovereignStorage {
		/**
		 * @param {string} [namespace]
		 */
		constructor(namespace) {
			this._namespace = namespace || OPFS_NAMESPACE;
			this._opfsDir = null;
			this._projectDir = null;
			/** @type {Map<string, Record<string, unknown>>} */
			this._astCache = new Map();
			/** @type {Record<string, { size: number; cachedAt: string }>} */
			this._modelManifest = {};
		}

		async initialize() {
			if (
				global.navigator?.storage &&
				typeof global.navigator.storage.getDirectory === "function"
			) {
				try {
					const root = await global.navigator.storage.getDirectory();
					this._opfsDir = await root.getDirectoryHandle(this._namespace, {
						create: true,
					});
					const mm = await this._opfsRead(MODEL_CACHE_FILE);
					if (isPlain(mm)) this._modelManifest = mm;
				} catch {
					// OPFS unavailable or storage access denied — fallback to in-memory mode
					this._opfsDir = null;
				}
			}
			return this;
		}

		/**
		 * @param {string} filename
		 */
		async _opfsRead(filename) {
			if (!this._opfsDir) return null;
			try {
				const handle = await this._opfsDir.getFileHandle(filename);
				const text = await (await handle.getFile()).text();
				return JSON.parse(text);
			} catch {
				// OPFS file handle missing or unreadable
				return null;
			}
		}

		/**
		 * @param {string} filename
		 * @param {unknown} value
		 */
		async _opfsWrite(filename, value) {
			if (!this._opfsDir) return false;
			const handle = await this._opfsDir.getFileHandle(filename, {
				create: true,
			});
			const writable = await handle.createWritable();
			try {
				await writable.write(JSON.stringify(value));
			} finally {
				await writable.close();
			}
			return true;
		}

		/**
		 * @param {string} name
		 * @param {unknown} value
		 */
		async write(name, value) {
			if (await this._opfsWrite(`${name}.json`, value)) return true;
			if (global.localStorage) {
				global.localStorage.setItem(
					`${this._namespace}:${name}`,
					JSON.stringify(value),
				);
				return true;
			}
			return false;
		}

		/**
		 * @param {string} name
		 */
		async read(name) {
			const result = await this._opfsRead(`${name}.json`);
			if (result !== null) return result;
			if (global.localStorage) {
				const raw = global.localStorage.getItem(`${this._namespace}:${name}`);
				return raw ? JSON.parse(raw) : null;
			}
			return null;
		}

		/**
		 * @param {PhoenixReceiptDTO} receipt
		 */
		async appendJournalEntry(receipt) {
			if (!this._opfsDir) {
				const raw = global.localStorage
					? global.localStorage.getItem(`${this._namespace}:journal`) || "[]"
					: "[]";
				const arr = JSON.parse(raw);
				arr.push(receipt);
				if (global.localStorage)
					global.localStorage.setItem(
						`${this._namespace}:journal`,
						JSON.stringify(arr),
					);
				return;
			}
			try {
				const handle = await this._opfsDir.getFileHandle(JOURNAL_FILE, {
					create: true,
				});
				const existing = await handle.getFile();
				const size = existing.size;
				const line = `${JSON.stringify(receipt)}\n`;
				const writable = await handle.createWritable({
					keepExistingData: true,
				});
				try {
					await writable.seek(size);
					await writable.write(line);
				} finally {
					await writable.close();
				}
			} catch (err) {
				if (global.console) {
					const msg = err instanceof Error ? err.message : String(err);
					global.console.warn("[PHOENIX/journal]", msg);
				}
			}
		}

		async readJournal() {
			if (!this._opfsDir) {
				if (global.localStorage) {
					const raw = global.localStorage.getItem(`${this._namespace}:journal`);
					return raw ? JSON.parse(raw) : [];
				}
				return [];
			}
			try {
				const handle = await this._opfsDir.getFileHandle(JOURNAL_FILE);
				const text = await (await handle.getFile()).text();
				return text
					.trim()
					.split("\n")
					.filter(Boolean)
					.map((/** @type {string} */ line) => {
						try {
							return JSON.parse(line);
						} catch {
							// Ignore corrupted or partial NDJSON lines
							return null;
						}
					})
					.filter(Boolean);
			} catch {
				// Journal file missing or unreadable in OPFS
				return [];
			}
		}

		/**
		 * @param {string} sourceHash
		 * @param {Record<string, unknown>} astData
		 */
		async writeASTCache(sourceHash, astData) {
			if (this._astCache.size >= AST_CACHE_LIMIT) {
				const oldestKey = this._astCache.keys().next().value;
				if (oldestKey !== undefined) {
					this._astCache.delete(oldestKey);
				}
			}
			this._astCache.set(sourceHash, astData);
			/** @type {Record<string, { cachedAt: string }>} */
			const manifest = {};
			for (const [ k, v ] of this._astCache) {
				const cachedAtVal = typeof v.cachedAt === "string" ? v.cachedAt : isoNow();
				manifest[ k ] = { cachedAt: cachedAtVal };
			}
			await this._opfsWrite(AST_CACHE_FILE, manifest);
		}

		/**
		 * @param {string} sourceHash
		 */
		readASTCache(sourceHash) {
			return this._astCache.get(sourceHash) || null;
		}

		/**
		 * @param {string} modelId
		 * @param {number} sizeBytes
		 */
		async registerModelCache(modelId, sizeBytes) {
			this._modelManifest[ modelId ] = { size: sizeBytes, cachedAt: isoNow() };
			await this._opfsWrite(MODEL_CACHE_FILE, this._modelManifest);
		}

		getModelManifest() {
			return clone(this._modelManifest);
		}

		async selectProjectDirectory() {
			const g = /** @type {Record<string, any>} */ (global);
			assert(
				typeof g.showDirectoryPicker === "function",
				"File System Access API unavailable in this context.",
			);
			const picker = /** @type {(options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>} */ (g.showDirectoryPicker);
			this._projectDir = await picker({
				mode: "readwrite",
			});
			return this._projectDir;
		}

		/**
		 * @param {string} filePath
		 */
		async readProjectFile(filePath) {
			if (!this._projectDir) {
				throw new Error("project directory not authorized — call selectProjectDirectory() first");
			}
			return _traverseRead(this._projectDir, filePath);
		}

		/**
		 * @param {string} filePath
		 * @param {string} text
		 */
		async writeProjectFile(filePath, text) {
			if (!this._projectDir) {
				throw new Error("project directory not authorized — call selectProjectDirectory() first");
			}
			assert(
				typeof text === "string",
				"writeProjectFile: text must be a string",
			);
			return _traverseWrite(this._projectDir, filePath, text);
		}

		get namespace() {
			return this._namespace;
		}
		get hasOPFS() {
			return this._opfsDir !== null;
		}
		get hasProject() {
			return this._projectDir !== null;
		}
	}

	/**
	 * @param {FileSystemDirectoryHandle} root
	 * @param {string} filePath
	 */
	async function _traverseRead(root, filePath) {
		const parts = filePath.split("/").filter(Boolean);
		assert(parts.length > 0, "file path must not be empty");
		let dir = root;
		for (let i = 0; i < parts.length - 1; i++) {
			dir = await dir.getDirectoryHandle(parts[ i ]);
		}
		const fileHandle = /** @type {FileSystemFileHandle} */ (await dir.getFileHandle(parts.at(-1) || ""));
		return (await fileHandle.getFile()).text();
	}

	/**
	 * @param {FileSystemDirectoryHandle} root
	 * @param {string} filePath
	 * @param {string} text
	 */
	async function _traverseWrite(root, filePath, text) {
		const parts = filePath.split("/").filter(Boolean);
		assert(parts.length > 0, "file path must not be empty");
		let dir = root;
		for (let i = 0; i < parts.length - 1; i++) {
			dir = await dir.getDirectoryHandle(parts[ i ], { create: true });
		}
		const fileHandle = /** @type {FileSystemFileHandle} */ (await dir.getFileHandle(parts.at(-1) || "", { create: true }));
		const writable = await fileHandle.createWritable();
		try {
			await writable.write(text);
		} finally {
			await writable.close();
		}
		return true;
	}
	//#endregion

	//#region [SEC-14] Layer 2: Governor Core, AI Repair Loop & Canonical Facade Export
	class Governor {
		/**
		 * @param {{
		 *   spec?: SpecificationRegistry,
		 *   capabilities?: CapabilityRegistry,
		 *   storage?: SovereignStorage,
		 *   receipts?: ReceiptLedger,
		 *   initialState?: Record<string, unknown>
		 * }} [options]
		 */
		constructor(options) {
			const o = options || {};
			this._spec = o.spec || new SpecificationRegistry();
			this._caps = o.capabilities || new CapabilityRegistry();
			this._storage = o.storage || new SovereignStorage();
			this._ledger = o.receipts || new ReceiptLedger();
			/** @type {Map<string, { content: string; descriptor: Record<string, unknown>; revision: number }>} */
			this._sources = new Map();
			this._state = clone(o.initialState === undefined ? {} : o.initialState);
			/** @type {string} */
			this._lifecycle = STATES.NEW;
			this._tick = 0;
			this._stats = { proposals: 0, accepted: 0, rejected: 0, errors: 0 };
			/** @type {{ transactionId: string; tick: number } | null} */
			this._activeTx = null;
			/** @type {Map<string, number>} */
			this._repairCounters = new Map();
		}

		async initialize() {
			assert(this._lifecycle === STATES.NEW, "governor is already initialized");
			await this._storage.initialize();
			this._lifecycle = STATES.READY;
			return this;
		}

		/**
		 * @param {string} filePath
		 * @param {string} content
		 * @param {Record<string, unknown>} [descriptor]
		 */
		registerSource(filePath, content, descriptor) {
			assert(
				typeof filePath === "string" && filePath.length > 0,
				"source path required",
			);
			assert(typeof content === "string", "source content must be a string");
			this._sources.set(filePath, {
				content,
				descriptor: clone(descriptor || {}),
				revision: 0,
			});
		}

		/**
		 * @param {string} filePath
		 * @returns {string | null}
		 */
		getSource(filePath) {
			const entry = this._sources.get(filePath);
			return entry ? entry.content : null;
		}

		/**
		 * @param {string} subject
		 * @param {string} target
		 * @param {string} operation
		 * @param {string} [transactionId]
		 */
		grant(subject, target, operation, transactionId) {
			const t = this._spec.targets.get(target);
			if (!t) throw new Error(`unknown target: ${target}`);
			assert(
				t.allowedOperations.includes(operation),
				`operation not permitted: ${operation}`,
			);
			const cap = `${t.tenant}.${operation}`;
			const expiryTick = this._tick + DEFAULT_CAP_EXPIRY;
			return this._caps.grant(subject, cap, target, transactionId, expiryTick);
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 */
		_buildContext(proposal) {
			const targetName = proposal.target || "";
			const t = this._spec.targets.get(targetName);
			if (!t) throw new Error(`unknown target: ${targetName}`);
			return Object.freeze({
				target: clone(t),
				targetSource: this.getSource(t.path),
				dependencies: (t.dependencies || []).map((/** @type {string} */ p) => ({
					path: p,
					content: this.getSource(p),
				})),
				invariants: (proposal.expectedInvariants || []).slice(),
				tests: (proposal.testsRequested || []).slice(),
				capabilities: (proposal.requiredCapabilities || []).slice(),
			});
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 * @returns {string[]}
		 */
		_gateStructural(proposal) {
			const errors = validateProposalShape(proposal);
			const targetName = proposal.target || "";
			const t = this._spec.targets.get(targetName);
			if (!t) {
				errors.push(`unknown target: ${targetName}`);
			} else {
				if (!t.writable) errors.push(`target is read-only: ${targetName}`);
				if (!t.allowedOperations.includes(String(proposal.operation || "")))
					errors.push(`operation not permitted: ${proposal.operation}`);
			}
			return errors;
		}

		/**
		 * @param {PhoenixChangeDTO} c
		 * @param {{ content: string; descriptor: Record<string, unknown>; revision: number }} old
		 * @returns {string}
		 */
		_computeModifiedContent(c, old) {
			let text = old.content;
			const search = typeof c.search === "string" ? c.search : "";
			const content = typeof c.content === "string" ? c.content : "";
			assert(
				search.length > 0,
				`search anchor required for ${c.type} on ${c.path}`,
			);
			const at = text.indexOf(search);
			assert(at >= 0, `search anchor not found in: ${c.path}`);
			assert(
				!text.includes(search, at + search.length),
				`search anchor is not unique in: ${c.path}`,
			);

			if (c.type === "replace_text") {
				text = text.slice(0, at) + content + text.slice(at + search.length);
			} else if (c.type === "insert_before") {
				text = text.slice(0, at) + content + text.slice(at);
			} else {
				text =
					text.slice(0, at + search.length) +
					content +
					text.slice(at + search.length);
			}

			const postLintErrors = lintSource(text);
			assert(
				postLintErrors.length === 0,
				`post-apply linter: ${postLintErrors.join("; ")}`,
			);
			return text;
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 * @returns {Map<string, { content: string; descriptor: Record<string, unknown>; revision: number } | null>}
		 */
		_applyChanges(proposal) {
			/** @type {Map<string, { content: string; descriptor: Record<string, unknown>; revision: number } | null>} */
			const before = new Map();
			const changes = proposal.changes || [];
			for (const c of changes) {
				const old = this._sources.get(c.path);
				before.set(c.path, old ? clone(old) : null);

				if (c.type === "create_file") {
					assert(!old, `file already exists: ${c.path}`);
					this._sources.set(c.path, {
						content: typeof c.content === "string" ? c.content : "",
						descriptor: {},
						revision: 0,
					});
					continue;
				}
				if (c.type === "delete_file") {
					assert(old, `file does not exist: ${c.path}`);
					this._sources.delete(c.path);
					continue;
				}

				if (!old) {
					assert(false, `file does not exist: ${c.path}`);
					continue;
				}
				const modifiedText = this._computeModifiedContent(c, old);

				this._sources.set(c.path, {
					content: modifiedText,
					descriptor: old.descriptor,
					revision: old.revision + 1,
				});
			}
			return before;
		}

		/**
		 * @param {Map<string, { content: string; descriptor: Record<string, unknown>; revision: number } | null>} before
		 */
		_rollback(before) {
			for (const [ filePath, value ] of before) {
				if (value === null) this._sources.delete(filePath);
				else this._sources.set(filePath, value);
			}
		}

		/**
		 * @param {Map<string, Function>} registry
		 * @param {string[]} names
		 * @param {Record<string, unknown>} state
		 * @param {Record<string, unknown>} context
		 * @param {Map<string, { content: string; descriptor: Record<string, unknown>; revision: number }>} sources
		 * @param {string} itemType
		 * @returns {Array<{ name: string, reason: string }>}
		 */
		_evaluateSpecRegistry(registry, names, state, context, sources, itemType) {
			const failures = [];
			for (const name of names) {
				const fn = registry.get(name);
				if (!fn) {
					failures.push({ name, reason: `${itemType} not registered` });
					continue;
				}
				try {
					const result = fn(state, context, sources);
					if (result !== true)
						failures.push({ name, reason: String(result || "returned false") });
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					failures.push({ name, reason: msg });
				}
			}
			return failures;
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 * @param {Record<string, unknown>} context
		 * @returns {Array<{ name: string, reason: string }>}
		 */
		_gateBehavior(proposal, context) {
			const invFailures = this._evaluateSpecRegistry(
				this._spec.invariants,
				proposal.expectedInvariants || [],
				this._state,
				context,
				this._sources,
				"invariant",
			);
			const testFailures = this._evaluateSpecRegistry(
				this._spec.tests,
				proposal.testsRequested || [],
				this._state,
				context,
				this._sources,
				"test",
			);
			return invFailures.concat(testFailures);
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 * @param {string} status
		 * @param {string} gate
		 * @param {unknown} details
		 * @param {string | null} transactionId
		 * @returns {PhoenixReceiptDTO}
		 */
		_buildReceipt(proposal, status, gate, details, transactionId) {
			/** @type {PhoenixReceiptDTO} */
			const r = {
				receiptVersion: RECEIPT_VERSION,
				receiptId: uid("receipt"),
				proposalId: proposal.proposalId,
				transactionId: transactionId || null,
				timestamp: isoNow(),
				status: /** @type {'PASS' | 'REJECTED' | 'ERROR'} */ (status),
				gate: /** @type {'ALL_GATES' | 'STRUCTURAL_GATE' | 'CAPABILITY_GATE' | 'BEHAVIOR_GATE' | 'EXECUTION'} */ (gate),
				details: clone(details),
				authority: "PHOENIX-DETERMINISTIC-GOVERNOR",
				protocols: PROTOCOLS.slice(),
				integrity: "",
			};
			r.integrity = hash(stable(r));
			this._ledger.append(r);
			return r;
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 * @param {string} subject
		 * @returns {Promise<PhoenixReceiptDTO>}
		 */
		async submit(proposal, subject) {
			assert(
				this._lifecycle === STATES.READY,
				`governor is not ready (state: ${this._lifecycle})`,
			);
			assert(
				typeof subject === "string" && subject.length > 0,
				"subject must be a non-empty string",
			);

			this._tick += 1;
			this._stats.proposals += 1;
			this._caps.pruneExpired(this._tick);

			const structuralErrors = this._gateStructural(proposal);
			if (structuralErrors.length > 0) {
				this._stats.rejected += 1;
				const receipt = this._buildReceipt(
					proposal,
					STATUS.REJECTED,
					GATES.STRUCTURAL,
					structuralErrors,
					null,
				);
				await this._storage.appendJournalEntry(receipt);
				return receipt;
			}

			this._lifecycle = STATES.TRANSACTION;
			const transactionId = uid("tx");
			this._activeTx = { transactionId, tick: this._tick };

			try {
				const targetName = proposal.target || "";
				const target = this._spec.targets.get(targetName);
				if (!target) throw new Error(`Target ${targetName} not registered`);
				const required = [ `${target.tenant}.${proposal.operation}` ].concat(
					proposal.requiredCapabilities || [],
				);
				const missing = required.filter((cap) =>
					!this._caps.has(
						subject,
						cap,
						targetName,
						transactionId,
						this._tick,
					)
				);

				if (missing.length > 0) {
					this._stats.rejected += 1;
					this._lifecycle = STATES.READY;
					this._caps.clearTransaction(transactionId);
					const receipt = this._buildReceipt(
						proposal,
						STATUS.REJECTED,
						GATES.CAPABILITY,
						missing,
						transactionId,
					);
					await this._storage.appendJournalEntry(receipt);
					return receipt;
				}

				const context = this._buildContext(proposal);
				const before = this._applyChanges(proposal);
				const failures = this._gateBehavior(proposal, context);

				if (failures.length > 0) {
					this._rollback(before);
					this._stats.rejected += 1;
					this._lifecycle = STATES.READY;
					this._caps.clearTransaction(transactionId);
					const receipt = this._buildReceipt(
						proposal,
						STATUS.REJECTED,
						GATES.BEHAVIOR,
						failures,
						transactionId,
					);
					await this._storage.appendJournalEntry(receipt);
					return receipt;
				}

				this._stats.accepted += 1;
				this._lifecycle = STATES.READY;
				this._caps.clearTransaction(transactionId);
				const receipt = this._buildReceipt(
					proposal,
					STATUS.PASS,
					GATES.ALL,
					{
						changedPaths: (proposal.changes || []).map((/** @type {PhoenixChangeDTO} */ c) => c.path),
						contextDigest: hash(stable(context)),
					},
					transactionId,
				);
				await this._storage.appendJournalEntry(receipt);
				return receipt;
			} catch (err) {
				this._stats.errors += 1;
				this._lifecycle = STATES.READY;
				this._caps.clearTransaction(transactionId);
				const errObj = err instanceof Error ? err : new Error(String(err));
				const receipt = this._buildReceipt(
					proposal,
					STATUS.ERROR,
					GATES.EXECUTION,
					{ message: errObj.message, stack: errObj.stack || null },
					transactionId,
				);
				await this._storage.appendJournalEntry(receipt);
				return receipt;
			} finally {
				this._activeTx = null;
			}
		}

		/**
		 * @param {PhoenixReceiptDTO} receipt
		 * @param {PhoenixProposalDTO} originalProposal
		 * @param {string} subject
		 * @param {{ generate: (prompt: string, options?: { maxTokens?: number; temperature?: number }) => Promise<string> } | null} [llmBridge]
		 * @param {((rawText: string) => Promise<PhoenixProposalDTO>) | null} [proposalParser]
		 * @returns {Promise<PhoenixReceiptDTO>}
		 */
		async repairLoop(
			receipt,
			originalProposal,
			subject,
			llmBridge,
			proposalParser,
		) {
			if (
				!receipt ||
				!originalProposal ||
				typeof subject !== "string" ||
				!llmBridge ||
				typeof llmBridge.generate !== "function" ||
				typeof proposalParser !== "function"
			) {
				return receipt;
			}
			assert(isPlain(receipt), "repairLoop: receipt must be a plain object");
			assert(
				isPlain(originalProposal),
				"repairLoop: originalProposal must be a plain object",
			);
			assert(
				typeof subject === "string" && subject.length > 0,
				"repairLoop: subject required",
			);
			assert(
				llmBridge && typeof llmBridge.generate === "function",
				"repairLoop: llmBridge must expose generate()",
			);
			assert(
				typeof proposalParser === "function",
				"repairLoop: proposalParser must be a function",
			);

			const originId = originalProposal.proposalId;
			const count = this._repairCounters.get(originId) || 0;

			if (count >= REPAIR_LOOP_CAP) {
				return receipt;
			}

			this._repairCounters.set(originId, count + 1);

			// Extract localized fault slices across proposal changes
			const faultSlices = (originalProposal.changes || []).map((/** @type {{ path: string; }} */ c) => {
				const src = this.getSource(c.path) || "";
				return extractFaultSlice(src, c, /** @type {Record<string, unknown>} */(receipt.details));
			});

			const repairPrompt = [
				"PHOENIX SOVEREIGN GOVERNOR: AUTOMATIC REPAIR REQUEST",
				"Protocol: VSRP-001 / MPFS-001 / PGE-DSL-1 (Zero-Dependency Sovereign Engine)",
				`Iteration: ${count + 1} of ${REPAIR_LOOP_CAP}`,
				`Original Proposal ID: ${originId}`,
				`Rejection Gate: ${receipt.gate}`,
				`Rejection Details: ${JSON.stringify(receipt.details, null, 2)}`,
				`Original Intent: ${originalProposal.intent}`,
				`Target Path: ${originalProposal.target}`,
				"",
				"LOCALIZED FAULT SLICE (AST / CODE CONTEXT):",
				...faultSlices.map(
					(/** @type {{ targetPath: string; scopeName: string; failureReason: string; faultSlice: string; }} */ f) => `--- [${f.targetPath}] Scope: ${f.scopeName} | Failure: ${f.failureReason} ---\n${f.faultSlice}`
				),
				"",
				"CONSTITUTIONAL SOVEREIGN INVARIANTS:",
				"  1. Output ONLY a valid PGE-DSL-1 JSON proposal object enclosed in ```json ``` markdown code fences.",
				'  2. schemaVersion must be "PGE-DSL-1".',
				"  3. NEVER output placeholder comments (// ..., /* ... */, TODO(impl)). Code must be 100% complete.",
				'  4. NEVER traverse paths with ".." or leading "/".',
				"  5. NEVER use import or export statements (Zero-npm, Universal IIFE Dual-Binding only).",
				"  6. Use structuredClone() for state snapshots in simulation tenants; never mutate host context.",
				"  7. PRNG authority: Never use Math.random() in Tier 2 simulations (use EmberlightPRNG or seeds).",
				`  8. Fix the exact failure causing rejection at ${receipt.gate}.`,
			].join("\n");

			let rawText;
			try {
				rawText = await llmBridge.generate(repairPrompt, {
					maxTokens: 2048,
					temperature: 0.2,
				});
			} catch (_bridgeErr) {
				return receipt;
			}

			let repairedProposal;
			try {
				repairedProposal = await proposalParser(rawText);
			} catch (_parseErr) {
				return receipt;
			}

			if (!isPlain(repairedProposal)) return receipt;

			repairedProposal = {
				...repairedProposal,
				proposalId: uid(`repair-${count}`),
			};

			const newReceipt = await this.submit(repairedProposal, subject);

			if (newReceipt.status === STATUS.PASS) {
				this._repairCounters.delete(originId);
				return newReceipt;
			}

			return this.repairLoop(
				newReceipt,
				originalProposal,
				subject,
				llmBridge,
				proposalParser,
			);
		}

		getState() {
			return clone(this._state);
		}
		getReceipts() {
			return this._ledger.list();
		}
		getStorage() {
			return this._storage;
		}

		diagnostics() {
			return {
				version: VERSION,
				protocols: PROTOCOLS.slice(),
				lifecycle: this._lifecycle,
				tick: this._tick,
				sourceCount: this._sources.size,
				ledgerSize: this._ledger.size,
				stats: { ...this._stats },
				opfsAvailable: this._storage.hasOPFS,
				projectMounted: this._storage.hasProject,
			};
		}

		destroy() {
			this._sources.clear();
			this._caps._grants.clear();
			this._repairCounters.clear();
			this._lifecycle = STATES.DESTROYED;
		}

		get spec() {
			return this._spec;
		}
		get capabilities() {
			return this._caps;
		}
		get storage() {
			return this._storage;
		}
		get ledger() {
			return this._ledger;
		}
	}

	const API = Object.freeze({
		VERSION,
		PROTOCOLS,
		STATES,
		STATUS,
		GATES,
		SCHEMA_VERSION,
		RECEIPT_VERSION,
		REPAIR_LOOP_CAP,
		SpecificationRegistry,
		CapabilityRegistry,
		ReceiptLedger,
		SovereignStorage,
		Governor,
		validateProposalShape,
		lintSource,
		stable,
		hash,
		uid,
		hashBuffer,
		computeFramebufferHash,
		validateFramebufferSignature,
		executeWithTimeout,
		extractFaultSlice,
		PhoenixAudioSynthesizer,
		PhoenixSymbolIndexer,
		PhoenixFuzzySearch,
		PhoenixSearchEngine,
		PhoenixChunkDiffEngine,
		PhoenixRuntimeSandbox,
		PhoenixWebGLBatcher,
		PhoenixCanvas2DLayerEngine,
		PhoenixPseudo3DRaycaster,
		PhoenixVoxel3DEngine,
		PhoenixTerrainRaymarcher,
		PhoenixCodeFormatter,
		PhoenixLinterSuite,
		PhoenixErrorResolutionLedger,
		PhoenixBatchRemediationPipeline,
	});

	global.PhoenixSovereignEngine = API;
	if (typeof module !== "undefined" && module.exports) module.exports = API;
	//#endregion
})(
	(() => {
		if (typeof globalThis !== "undefined") return globalThis;
		if (typeof window !== "undefined") return window;
		if (typeof global !== "undefined") return global;
		return {};
	})()
);
