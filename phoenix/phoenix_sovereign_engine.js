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

	/** Regex: valid identifier for IDs, targets, capability names (supports full Unicode, emojis, spaces, em-dashes) */
	const RE_ID = /^[\p{L}\p{N}\p{P}\p{S}\p{M}\s./_@&#+%,'"!()[\]$-]{1,512}$/u;
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
	 * @param {string} [prefix='id']
	 * @returns {string}
	 */
	function uid(prefix = 'id') {
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

	//#region [SEC-03] Procedural Web Audio Synthesizer Bridge (VSRP-001-RUNTIME-DELEGATE)
	/**
	 * Procedural Web Audio Synthesizer Bridge.
	 * Implementation partitioned into modular runtime: phoenix/runtime/phoenix_audio_synth.js
	 */
	const PhoenixAudioSynthesizer = Object.freeze({
		get PRESETS() { return global.PhoenixAudioSynthesizer ? global.PhoenixAudioSynthesizer.PRESETS : {}; },
		/**
		 * @param {any[]} args
		 */
		getAudioContext(...args) { return global.PhoenixAudioSynthesizer?.getAudioContext?.(...args); },
		/**
		 * @param {any[]} args
		 */
		createNoiseBuffer(...args) { return global.PhoenixAudioSynthesizer?.createNoiseBuffer?.(...args); },
		/**
		 * @param {any[]} args
		 */
		playProceduralSFX(...args) { return global.PhoenixAudioSynthesizer?.playProceduralSFX?.(...args); },
		/**
		 * @param {any[]} args
		 */
		generateSFXCode(...args) { return global.PhoenixAudioSynthesizer?.generateSFXCode?.(...args); },
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

	/* =========================================================================
	 * [SEC-05B] CONTEXTUAL 5-STATE LEXICAL SCANNER & STREAMING TOKENIZER (VLT-003)
	 * ========================================================================= */
	/**
	 * Lexer State Constants
	 * @type {Record<string, number>}
	 */
	const LEXER_STATE = Object.freeze({
		CODE: 0,
		BLOCK_COMMENT: 1,
		TEMPLATE_LITERAL: 2,
		TEMPLATE_INTERPOLATION: 3,
		REGEX: 4,
	});

	const OP3_SET = new Set([ "===", "!==", ">>>", "...", "??=", "&&=", "||=" ]);
	const OP2_SET = new Set([
		"==", "!=", "<=", ">=", "&&", "||", "??", "=>",
		"+=", "-=", "*=", "/=", "%=", "++", "--", "<<",
		">>", "&=", "|=", "^="
	]);

	const LEXER_KEYWORDS = new Set([
		"const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
		"switch", "case", "default", "break", "continue", "class", "extends", "new",
		"this", "super", "try", "catch", "finally", "throw", "async", "await", "yield",
		"import", "export", "from", "as", "typeof", "instanceof", "in", "of", "void",
		"delete", "static", "get", "set", "debugger"
	]);

	const LEXER_BUILTINS = new Set([
		"true", "false", "null", "undefined", "NaN", "Infinity",
		"Object", "Array", "String", "Number", "Boolean", "Math", "JSON", "Promise",
		"Set", "Map", "WeakSet", "WeakMap", "Uint8Array", "Float32Array", "Int32Array",
		"Uint16Array", "Int16Array", "Uint32Array", "Float64Array", "ArrayBuffer", "DataView",
		"OffscreenCanvas", "ImageBitmap", "Error", "TypeError", "RangeError", "SyntaxError",
		"Symbol", "BigInt", "RegExp", "Date", "Console", "console", "window", "globalThis",
		"document", "crypto", "performance", "requestAnimationFrame", "cancelAnimationFrame"
	]);

	/**
	 * Single-Pass Contextual Lexer FSM for JavaScript and Sovereign DSLs
	 */
	class PhoenixLexer {
		static get STATES() {
			return LEXER_STATE;
		}

		/**
		 * @param {string} code
		 * @returns {Array<{ type: string; value: string; line: number; col: number; start: number; end: number }>}
		 */
		static tokenize(code) {
			if (typeof code !== "string") return [];
			/** @type {Array<{ type: string; value: string; line: number; col: number; start: number; end: number }>} */
			const tokens = [];
			const lines = code.split(/\r?\n/);
			/** @type {{ state: number; braceDepth: number; depthStack: number[] }} */
			let state = { state: LEXER_STATE.CODE, braceDepth: 0, depthStack: [] };
			let charOffset = 0;

			for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
				const lineText = lines[ lineIdx ];
				const result = this.tokenizeLine(lineText, state);
				let colOffset = 0;

				for (const tok of result.tokens) {
					tokens.push({
						type: tok.type,
						value: tok.value,
						line: lineIdx + 1,
						col: colOffset + 1,
						start: charOffset + colOffset,
						end: charOffset + colOffset + tok.value.length,
					});
					colOffset += tok.value.length;
				}

				state = result.endState;
				charOffset += lineText.length + 1; // +1 for newline
			}

			return tokens;
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @returns {{ token: string; nextIdx: number; endState: number }}
		 */
		static _readBlockComment(line, startIdx) {
			const closeIdx = line.indexOf("*/", startIdx);
			if (closeIdx === -1) {
				return { token: line.slice(startIdx), nextIdx: line.length, endState: LEXER_STATE.BLOCK_COMMENT };
			}
			return { token: line.slice(startIdx, closeIdx + 2), nextIdx: closeIdx + 2, endState: LEXER_STATE.CODE };
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @param {number} currentBraceDepth
		 * @param {number[]} depthStack
		 * @returns {{ tokens: Array<{ type: string; value: string }>; nextIdx: number; endState: number; braceDepth: number }}
		 */
		static _readTemplateLiteral(line, startIdx, currentBraceDepth, depthStack) {
			/** @type {Array<{ type: string; value: string }>} */
			const resultTokens = [];
			let str = "";
			let i = startIdx;
			const len = line.length;
			let endState = Number(LEXER_STATE.TEMPLATE_LITERAL);
			let braceDepth = currentBraceDepth;

			while (i < len) {
				const ch = line[ i ];
				if (ch === "\\" && i + 1 < len) {
					str += ch + line[ i + 1 ];
					i += 2;
				} else if (ch === "`") {
					str += ch;
					i++;
					endState = depthStack.length > 0 ? LEXER_STATE.TEMPLATE_INTERPOLATION : LEXER_STATE.CODE;
					break;
				} else if (ch === "$" && i + 1 < len && line[ i + 1 ] === "{") {
					if (str) resultTokens.push({ type: "TEMPLATE_STRING", value: str });
					resultTokens.push({ type: "PUNCTUATION", value: "${" });
					i += 2;
					depthStack.push(braceDepth);
					braceDepth = 0;
					endState = LEXER_STATE.TEMPLATE_INTERPOLATION;
					str = "";
					break;
				} else {
					str += ch;
					i++;
				}
			}
			if (str) resultTokens.push({ type: "TEMPLATE_STRING", value: str });
			return { tokens: resultTokens, nextIdx: i, endState, braceDepth };
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @param {string} quote
		 * @returns {{ token: string; nextIdx: number }}
		 */
		static _readString(line, startIdx, quote) {
			let str = quote;
			let i = startIdx + 1;
			const len = line.length;
			while (i < len) {
				const c = line[ i ];
				if (c === "\\" && i + 1 < len) {
					str += c + line[ i + 1 ];
					i += 2;
				} else if (c === quote) {
					str += quote;
					i++;
					break;
				} else {
					str += c;
					i++;
				}
			}
			return { token: str, nextIdx: i };
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @returns {{ token: string; nextIdx: number }}
		 */
		static _readRegex(line, startIdx) {
			let regexStr = "/";
			let i = startIdx + 1;
			const len = line.length;
			let inClass = false;
			let escaped = false;
			while (i < len) {
				const c = line[ i ];
				if (escaped) {
					regexStr += c;
					escaped = false;
					i++;
				} else if (c === "\\") {
					regexStr += c;
					escaped = true;
					i++;
				} else if (c === "[") {
					inClass = true;
					regexStr += c;
					i++;
				} else if (c === "]" && inClass) {
					inClass = false;
					regexStr += c;
					i++;
				} else if (c === "/" && !inClass) {
					regexStr += c;
					i++;
					while (i < len && /[a-z]/i.test(line[ i ])) {
						regexStr += line[ i++ ];
					}
					break;
				} else {
					regexStr += c;
					i++;
				}
			}
			return { token: regexStr, nextIdx: i };
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @returns {{ token: string; nextIdx: number }}
		 */
		static _readNumber(line, startIdx) {
			const sub = line.slice(startIdx);
			const hexOrBin = /^0[xXbB][0-9a-fA-F_]+/.exec(sub);
			if (hexOrBin) return { token: hexOrBin[ 0 ], nextIdx: startIdx + hexOrBin[ 0 ].length };
			const dec = /^\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?/.exec(sub);
			if (dec) return { token: dec[ 0 ], nextIdx: startIdx + dec[ 0 ].length };
			return { token: line[ startIdx ], nextIdx: startIdx + 1 };
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @returns {{ token: string; nextIdx: number; isOp: boolean } | null}
		 */
		static _readOperator(line, startIdx) {
			const sub3 = line.slice(startIdx, startIdx + 3);
			if (OP3_SET.has(sub3)) {
				return { token: sub3, nextIdx: startIdx + 3, isOp: true };
			}
			const sub2 = line.slice(startIdx, startIdx + 2);
			if (OP2_SET.has(sub2)) {
				return { token: sub2, nextIdx: startIdx + 2, isOp: true };
			}
			const ch = line[ startIdx ];
			if ("+-*%^&|!~<>?=".includes(ch)) {
				return { token: ch, nextIdx: startIdx + 1, isOp: true };
			}
			if ("(){}[],;.:".includes(ch)) {
				return { token: ch, nextIdx: startIdx + 1, isOp: false };
			}
			return null;
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @param {Set<string>} keywords
		 * @param {Set<string>} builtins
		 * @returns {{ type: string; token: string; nextIdx: number }}
		 */
		static _readIdentifier(line, startIdx, keywords, builtins) {
			let ident = "";
			let i = startIdx;
			const len = line.length;
			while (i < len && /[a-zA-Z0-9_$]/.test(line[ i ])) ident += line[ i++ ];

			let nextNonWs = "";
			let j = i;
			while (j < len && (line[ j ] === " " || line[ j ] === "\t")) j++;
			if (j < len) nextNonWs = line[ j ];

			let type = "IDENTIFIER";
			if (keywords.has(ident)) type = "KEYWORD";
			else if (builtins.has(ident)) type = "BUILTIN";
			else if (nextNonWs === "(") type = "FUNCTION";

			return { type, token: ident, nextIdx: i };
		}

		/**
		 * @param {string | null} type
		 * @returns {boolean}
		 */
		static _isRegexContext(type) {
			return !type || type === "OPERATOR" || type === "PUNCTUATION" || type === "KEYWORD";
		}

		/**
		 * @param {string} ch
		 * @param {number} braceDepth
		 * @param {number[]} depthStack
		 * @returns {{ braceDepth: number; nextState: number }}
		 */
		static _stepInterpolationBrace(ch, braceDepth, depthStack) {
			if (ch === "{") {
				return { braceDepth: braceDepth + 1, nextState: LEXER_STATE.TEMPLATE_INTERPOLATION };
			}
			if (braceDepth > 0) {
				return { braceDepth: braceDepth - 1, nextState: LEXER_STATE.TEMPLATE_INTERPOLATION };
			}
			return { braceDepth: depthStack.pop() || 0, nextState: LEXER_STATE.TEMPLATE_LITERAL };
		}

		/**
		 * @param {string} line
		 * @param {number} i
		 * @param {number} len
		 * @param {string} ch
		 * @returns {{ type: string; token: string; nextIdx: number }}
		 */
		static _readNextToken(line, i, len, ch) {
			if (/\d/.test(ch) || (ch === "." && i + 1 < len && /\d/.test(line[ i + 1 ]))) {
				const res = PhoenixLexer._readNumber(line, i);
				return { type: "NUMBER", token: res.token, nextIdx: res.nextIdx };
			}
			if (/[a-zA-Z_$]/.test(ch)) {
				return PhoenixLexer._readIdentifier(line, i, LEXER_KEYWORDS, LEXER_BUILTINS);
			}
			const opRes = PhoenixLexer._readOperator(line, i);
			if (opRes) {
				return { type: opRes.isOp ? "OPERATOR" : "PUNCTUATION", token: opRes.token, nextIdx: opRes.nextIdx };
			}
			return { type: "IDENTIFIER", token: ch, nextIdx: i + 1 };
		}

		/**
		 * @param {string} line
		 * @param {number} startIdx
		 * @param {number} len
		 * @returns {{ token: string; nextIdx: number }}
		 */
		static _consumeWhitespace(line, startIdx, len) {
			let ws = "";
			let i = startIdx;
			while (i < len) {
				const c = line[ i ];
				if (c !== " " && c !== "\t" && c !== "\r") break;
				ws += c;
				i++;
			}
			return { token: ws, nextIdx: i };
		}

		/**
		 * @param {string} line
		 * @param {number} i
		 * @param {number} len
		 * @param {string | null} prevType
		 * @returns {{ type: string; token: string; nextIdx: number; endState?: number } | null}
		 */
		static _readSlashToken(line, i, len, prevType) {
			const nextChar = i + 1 < len ? line[ i + 1 ] : "";
			if (nextChar === "/") return { type: "COMMENT", token: line.slice(i), nextIdx: len };
			if (nextChar === "*") {
				const res = PhoenixLexer._readBlockComment(line, i);
				return { type: "COMMENT", token: res.token, nextIdx: res.nextIdx, endState: res.endState };
			}
			if (PhoenixLexer._isRegexContext(prevType)) {
				const res = PhoenixLexer._readRegex(line, i);
				return { type: "REGEX", token: res.token, nextIdx: res.nextIdx };
			}
			return null;
		}

		/**
		 * @param {string} line
		 * @param {number} i
		 * @param {number} len
		 * @param {{ currentState: number; braceDepth: number; depthStack: number[]; prevType: string | null }} ctx
		 * @returns {{ type: string; token: string; nextIdx: number; tokens?: Array<{ type: string; value: string }>; endState?: number; braceDepth?: number }}
		 */
		static _dispatchLineToken(line, i, len, ctx) {
			const ch = line[ i ];
			if (ch === " " || ch === "\t" || ch === "\r") {
				const ws = PhoenixLexer._consumeWhitespace(line, i, len);
				return { type: "WHITESPACE", token: ws.token, nextIdx: ws.nextIdx };
			}
			if (ch === "/") {
				const slashTok = PhoenixLexer._readSlashToken(line, i, len, ctx.prevType);
				if (slashTok) return slashTok;
			}
			if (ch === "`") {
				const res = PhoenixLexer._readTemplateLiteral(line, i + 1, ctx.braceDepth, ctx.depthStack);
				return { type: "TEMPLATE_HEAD", token: "`", tokens: res.tokens, nextIdx: res.nextIdx, endState: res.endState, braceDepth: res.braceDepth };
			}
			if (ch === '"' || ch === "'") {
				const res = PhoenixLexer._readString(line, i, ch);
				return { type: "STRING", token: res.token, nextIdx: res.nextIdx };
			}
			if (ctx.currentState === LEXER_STATE.TEMPLATE_INTERPOLATION && (ch === "{" || ch === "}")) {
				const interp = PhoenixLexer._stepInterpolationBrace(ch, ctx.braceDepth, ctx.depthStack);
				return { type: "PUNCTUATION", token: ch, nextIdx: i + 1, endState: interp.nextState, braceDepth: interp.braceDepth };
			}
			return PhoenixLexer._readNextToken(line, i, len, ch);
		}

		/**
		 * @param {Array<{ type: string; value: string }>} tokens
		 * @param {{ prevType: string | null }} stateHolder
		 * @param {string} type
		 * @param {string} value
		 */
		static _emitToken(tokens, stateHolder, type, value) {
			if (!value) return;
			tokens.push({ type, value });
			if (type !== "WHITESPACE") stateHolder.prevType = type;
		}

		/**
		 * @param {Array<{ type: string; value: string }>} tokens
		 * @param {{ prevType: string | null }} stateHolder
		 * @param {{ type: string; token?: string; tokens?: Array<{ type: string; value: string }> }} step
		 */
		static _pushStepTokens(tokens, stateHolder, step) {
			if (step.tokens) {
				PhoenixLexer._emitToken(tokens, stateHolder, step.type === "TEMPLATE_HEAD" ? "TEMPLATE_STRING" : step.type, step.token || "");
				for (const tok of step.tokens) PhoenixLexer._emitToken(tokens, stateHolder, tok.type, tok.value);
			} else if (step.token) {
				PhoenixLexer._emitToken(tokens, stateHolder, step.type, step.token);
			}
		}

		/**
		 * @param {string} line
		 * @param {number} i
		 * @param {number} currentState
		 * @param {number} braceDepth
		 * @param {number[]} depthStack
		 * @returns {{ type: string; token: string; tokens?: Array<{ type: string; value: string }>; nextIdx: number; endState: number; braceDepth: number } | null}
		 */
		static _handleCarryoverState(line, i, currentState, braceDepth, depthStack) {
			if (currentState === LEXER_STATE.BLOCK_COMMENT) {
				const res = PhoenixLexer._readBlockComment(line, i);
				return { type: "COMMENT", token: res.token, nextIdx: res.nextIdx, endState: res.endState, braceDepth };
			}
			if (currentState === LEXER_STATE.TEMPLATE_LITERAL) {
				const res = PhoenixLexer._readTemplateLiteral(line, i, braceDepth, depthStack);
				return { type: "TEMPLATE_STRING", token: "", tokens: res.tokens, nextIdx: res.nextIdx, endState: res.endState, braceDepth: res.braceDepth };
			}
			return null;
		}

		/**
		 * Tokenizes a single line given a carry-over FSM state.
		 * @param {string} line
		 * @param {{ state: number; braceDepth?: number; depthStack?: number[] } | null} [startState]
		 * @returns {{ tokens: Array<{ type: string; value: string }>; endState: { state: number; braceDepth: number; depthStack: number[] } }}
		 */
		static tokenizeLine(line, startState = null) {
			/** @type {Array<{ type: string; value: string }>} */
			const tokens = [];
			let currentState = startState ? startState.state : LEXER_STATE.CODE;
			let braceDepth = startState && typeof startState.braceDepth === "number" ? startState.braceDepth : 0;
			const depthStack = startState && Array.isArray(startState.depthStack) ? startState.depthStack.slice() : [];

			let i = 0;
			const len = line.length;
			const stateHolder = { prevType: /** @type {string | null} */ (null) };

			while (i < len) {
				const carry = PhoenixLexer._handleCarryoverState(line, i, currentState, braceDepth, depthStack);
				if (carry) {
					PhoenixLexer._pushStepTokens(tokens, stateHolder, carry);
					i = carry.nextIdx;
					currentState = carry.endState;
					braceDepth = carry.braceDepth;
					continue;
				}

				const ctx = { currentState, braceDepth, depthStack, prevType: stateHolder.prevType };
				const step = PhoenixLexer._dispatchLineToken(line, i, len, ctx);
				PhoenixLexer._pushStepTokens(tokens, stateHolder, step);

				i = step.nextIdx;
				if (typeof step.endState === "number") currentState = step.endState;
				if (typeof step.braceDepth === "number") braceDepth = step.braceDepth;
			}

			return {
				tokens,
				endState: {
					state: currentState,
					braceDepth,
					depthStack,
				}
			};
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

	//#region [SEC-05] Graphics Tier 1 & 2: WebGL 2D Batcher & Canvas 2D Layer Engine Bridge
	/**
	 * WebGL 2D Quad Batcher and Canvas 2D Layer Engine Bridge.
	 * Implementation partitioned into modular runtime: phoenix/runtime/phoenix_graphics_2d.js
	 */
	const PhoenixWebGLBatcher = Object.freeze({
		get DEFAULT_VS() { return global.PhoenixWebGLBatcher ? global.PhoenixWebGLBatcher.DEFAULT_VS : ''; },
		get DEFAULT_FS() { return global.PhoenixWebGLBatcher ? global.PhoenixWebGLBatcher.DEFAULT_FS : ''; },
		/**
		 * @param {any[]} args
		 */
		compileShader(...args) { return global.PhoenixWebGLBatcher?.compileShader?.(...args); },
		/**
		 * @param {any[]} args
		 */
		createProgram(...args) { return global.PhoenixWebGLBatcher?.createProgram?.(...args); },
		/**
		 * @param {any[]} args
		 */
		createBatcher(...args) { return global.PhoenixWebGLBatcher?.createBatcher?.(...args); },
	});
	const PhoenixCanvas2DLayerEngine = Object.freeze({
		/**
		 * @param {any[]} args
		 */
		createLayerStack(...args) { return global.PhoenixCanvas2DLayerEngine?.createLayerStack?.(...args); },
		/**
		 * @param {any[]} args
		 */
		worldToScreen(...args) { return global.PhoenixCanvas2DLayerEngine?.worldToScreen?.(...args); },
		/**
		 * @param {any[]} args
		 */
		screenToWorld(...args) { return global.PhoenixCanvas2DLayerEngine?.screenToWorld?.(...args); },
		/**
		 * @param {any[]} args
		 */
		drawSprite(...args) { return global.PhoenixCanvas2DLayerEngine?.drawSprite?.(...args); },
	});
	//#endregion

	//#region [SEC-06] Graphics Tier 3: Retro Pseudo-3D DDA Raycaster Bridge
	/**
	 * Retro Pseudo-3D DDA Raycaster Bridge.
	 * Implementation partitioned into modular runtime: phoenix/runtime/phoenix_pseudo_3d.js
	 */
	const PhoenixPseudo3DRaycaster = Object.freeze({
		/**
		 * @param {any[]} args
		 */
		castRay(...args) { return global.PhoenixPseudo3DRaycaster?.castRay?.(...args); },
		/**
		 * @param {any[]} args
		 */
		renderScene(...args) { return global.PhoenixPseudo3DRaycaster?.renderScene?.(...args); },
		/**
		 * @param {any[]} args
		 */
		projectSprites(...args) { return global.PhoenixPseudo3DRaycaster?.projectSprites?.(...args); },
	});
	//#endregion

	//#region [SEC-07] Graphics Tier 4: 3D Fast Voxel DDA World Engine Bridge
	/**
	 * 3D Fast Voxel DDA World Engine Bridge.
	 * Implementation partitioned into modular runtime: phoenix/runtime/phoenix_voxel_3d.js
	 */
	const PhoenixVoxel3DEngine = Object.freeze({
		get VOXEL_TYPES() { return global.PhoenixVoxel3DEngine ? global.PhoenixVoxel3DEngine.VOXEL_TYPES : {}; },
		/**
		 * @param {any[]} args
		 */
		createChunkBuffer(...args) { return global.PhoenixVoxel3DEngine?.createChunkBuffer?.(...args); },
		/**
		 * @param {any[]} args
		 */
		setVoxel(...args) { return global.PhoenixVoxel3DEngine?.setVoxel?.(...args); },
		/**
		 * @param {any[]} args
		 */
		getVoxel(...args) { return global.PhoenixVoxel3DEngine?.getVoxel?.(...args); },
		/**
		 * @param {any[]} args
		 */
		castVoxelRay(...args) { return global.PhoenixVoxel3DEngine?.castVoxelRay?.(...args); },
		/**
		 * @param {any[]} args
		 */
		generateDungeonVolume(...args) { return global.PhoenixVoxel3DEngine?.generateDungeonVolume?.(...args); },
		/**
		 * @param {any[]} args
		 */
		renderVoxelViewport(...args) { return global.PhoenixVoxel3DEngine?.renderVoxelViewport?.(...args); },
	});
	//#endregion

	//#region [SEC-08] Graphics Tier 5: Demoscene Procedural Terrain Raymarcher Bridge
	/**
	 * Demoscene Procedural Terrain Raymarcher Bridge.
	 * Implementation partitioned into modular runtime: phoenix/runtime/phoenix_terrain_raymarcher.js
	 */
	const PhoenixTerrainRaymarcher = Object.freeze({
		/**
		 * @param {any[]} args
		 */
		hash2(...args) { return global.PhoenixTerrainRaymarcher?.hash2?.(...args); },
		/**
		 * @param {any[]} args
		 */
		noise2(...args) { return global.PhoenixTerrainRaymarcher?.noise2?.(...args); },
		/**
		 * @param {any[]} args
		 */
		terrainFBM(...args) { return global.PhoenixTerrainRaymarcher?.terrainFBM?.(...args); },
		/**
		 * @param {any[]} args
		 */
		raymarchHeightmap(...args) { return global.PhoenixTerrainRaymarcher?.raymarchHeightmap?.(...args); },
		/**
		 * @param {any[]} args
		 */
		renderSoftwareTerrain(...args) { return global.PhoenixTerrainRaymarcher?.renderSoftwareTerrain?.(...args); },
		/**
		 * @param {any[]} args
		 */
		generateRaymarchShader(...args) { return global.PhoenixTerrainRaymarcher?.generateRaymarchShader?.(...args); },
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

	/**
	 * Pure Helper: Extract function name from declaration or arrow assignment
	 * @param {string} line
	 * @param {RegExp} declRegex
	 * @param {RegExp} arrowRegex
	 * @returns {string}
	 */
	function _extractFunctionName(line, declRegex, arrowRegex) {
		const declMatch = declRegex.exec(line);
		if (declMatch) return declMatch[ 1 ] || 'anonymous';
		const arrowMatch = arrowRegex.exec(line);
		if (arrowMatch) return arrowMatch[ 1 ] || 'anonymous';
		return '';
	}

	/**
	 * Pure Helper: Slice function body by matching braces
	 * @param {string[]} lines
	 * @param {number} startIdx
	 * @returns {{ endLine: number; fnBody: string }}
	 */
	function _extractFunctionSlice(lines, startIdx) {
		let open = 0;
		let endLine = startIdx;
		const fnLines = [];
		for (let j = startIdx; j < lines.length; j++) {
			fnLines.push(lines[ j ]);
			open += (lines[ j ].match(/\{/g) || []).length;
			open -= (lines[ j ].match(/\}/g) || []).length;
			if (open <= 0 && j > startIdx) {
				endLine = j;
				break;
			}
		}
		return { endLine, fnBody: fnLines.join('\n') };
	}

	/**
	 * @param {string} trimmed
	 * @param {string} rawLine
	 * @param {number} lineNum
	 * @param {string} funcName
	 * @returns {HotLoopViolationDTO | null}
	 */
	function _checkHotLoopAllocationOnLine(trimmed, rawLine, lineNum, funcName) {
		if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return null;

		// 1. Transient Object Literal allocations
		if (/(?:=\s*\{|:\s*\{|return\s+\{|\(\s*\{|,\s*\{)/.test(trimmed) &&
			!/(?:if|for|while|switch|catch)\s*\(.*?\)\s*\{/.test(trimmed)) {
			return {
				line: lineNum,
				col: rawLine.indexOf('{') + 1,
				type: 'HOT_LOOP_OBJECT_ALLOCATION',
				message: `Transient Object literal allocated inside hot path '${funcName}'. Pre-allocate into fixed pool or persistent state.`,
				severity: 'error',
				snippet: trimmed
			};
		}

		// 2. Transient Array Literal allocations
		if (/(?:=\s*\[|:\s*\[|return\s+\[|\(\s*\[|,\s*\[)/.test(trimmed)) {
			return {
				line: lineNum,
				col: rawLine.indexOf('[') + 1,
				type: 'HOT_LOOP_ARRAY_ALLOCATION',
				message: `Transient Array literal allocated inside hot path '${funcName}'. Pre-allocate fixed TypedArray or reusable buffer.`,
				severity: 'error',
				snippet: trimmed
			};
		}

		// 3. Dynamic Heap Instantiations
		const newMatch = /new\s+(?:Array|Object|Set|Map|WeakMap|WeakSet|Float32Array|Uint8Array|Int32Array|ArrayBuffer|Error)\s*\(/.exec(trimmed);
		if (newMatch) {
			return {
				line: lineNum,
				col: rawLine.indexOf(newMatch[ 0 ]) + 1,
				type: 'HOT_LOOP_HEAP_INSTANTIATION',
				message: `Dynamic heap instantiation '${newMatch[ 0 ]}' inside hot path '${funcName}'. Allocation forbidden at 60 FPS.`,
				severity: 'error',
				snippet: trimmed
			};
		}

		// 4. Closures instantiated in hot loop
		if (/(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|function\s*\()/.test(trimmed) &&
			!/^(?:async\s+)?function\s+/.test(trimmed)) {
			return {
				line: lineNum,
				col: 1,
				type: 'HOT_LOOP_CLOSURE_ALLOCATION',
				message: `Inline closure instantiated inside hot path '${funcName}'. Hoist function to module or class scope.`,
				severity: 'warning',
				snippet: trimmed
			};
		}

		// 5. Dynamic Template String / String Concatenation in hot loop
		if (/\$\{[^}]+\}/.test(trimmed) && trimmed.includes('`')) {
			return {
				line: lineNum,
				col: rawLine.indexOf('`') + 1,
				type: 'HOT_LOOP_STRING_ALLOCATION',
				message: `Dynamic template string formatted inside hot path '${funcName}'. Avoid transient string heap allocation.`,
				severity: 'warning',
				snippet: trimmed
			};
		}

		return null;
	}

	/**
	 * @param {string} signatureLine
	 * @returns {{ name: string; params: string[] } | null}
	 */
	function _extractFnSignatureInfo(signatureLine) {
		const trimmed = signatureLine.trim();
		const fnDeclRegex = /^(?:async\s+)?function(?:\s+([A-Za-z0-9_$]+))?\s*\(([^)]*)\)/;
		const arrowRegex = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:\(([^)]*)\)|([A-Za-z0-9_$]+))\s*=>/;
		const methodRegex = /^([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/;

		const match = fnDeclRegex.exec(trimmed) || arrowRegex.exec(trimmed) || methodRegex.exec(trimmed);
		if (!match) return null;

		const fnName = match[ 1 ] || 'anonymous';
		const rawParams = (match[ 2 ] !== undefined ? match[ 2 ] : (match[ 3 ] || '')).trim();
		const params = rawParams ? rawParams.split(',').map(p => {
			let clean = p.trim().replace(/\/\*.*?\*\//g, '').split('=')[ 0 ].trim();
			if (clean.startsWith('{') || clean.startsWith('[')) clean = 'destructured';
			return clean;
		}).filter(Boolean) : [];

		return { name: fnName, params };
	}

	/**
	 * @param {string[]} expected
	 * @param {string[]} actual
	 * @param {string} fnName
	 * @param {number} lineNum
	 * @returns {JSDocParityResultDTO | null}
	 */
	function _compareJSDocAndSignatureParams(expected, actual, fnName, lineNum) {
		if (expected.length === 0 && actual.length === 0) return null;

		if (expected.length !== actual.length) {
			return {
				line: lineNum,
				functionName: fnName,
				issue: 'PARAM_ARITY_MISMATCH',
				message: `Function '${fnName}' has ${actual.length} parameter(s) (${actual.join(', ') || 'none'}) but JSDoc specifies ${expected.length} (${expected.join(', ') || 'none'}).`,
				expectedParams: expected,
				actualParams: actual
			};
		}

		for (let pIdx = 0; pIdx < actual.length; pIdx++) {
			if (actual[ pIdx ] !== 'destructured' && actual[ pIdx ] !== expected[ pIdx ]) {
				return {
					line: lineNum,
					functionName: fnName,
					issue: 'PARAM_NAME_MISMATCH',
					message: `Function '${fnName}' parameter ${pIdx + 1} is named '${actual[ pIdx ]}' but JSDoc documents '${expected[ pIdx ]}'.`,
					expectedParams: expected,
					actualParams: actual
				};
			}
		}

		return null;
	}

	/**
	 * @param {string} line
	 * @returns {{ structuralHits: number; logicalOps: number; openBraces: number; closeBraces: number }}
	 */
	function _scoreLineComplexity(line) {
		const closeBraces = (line.match(/\}/g) || []).length;
		const openBraces = (line.match(/\{/g) || []).length;

		let structuralHits = 0;
		if (/\b(if|for|while|do|catch|switch)\b/.test(line)) structuralHits++;
		if (/\belse\b/.test(line) || (line.includes('?') && line.includes(':'))) structuralHits++;

		const logicalOps = (line.match(/(&&|\|\||\?\?)/g) || []).length;
		return { structuralHits, logicalOps, openBraces, closeBraces };
	}

	/**
	 * @param {string[]} lines
	 * @param {number} startIdx
	 * @param {string} fnName
	 * @param {Array<{ line: number; col: number; type: string; message: string; severity: 'error' | 'warning'; snippet: string }>} violations
	 */
	function _auditHotFunctionBody(lines, startIdx, fnName, violations) {
		const { fnBody } = _extractFunctionSlice(lines, startIdx);
		const bodyLines = fnBody.split(/\r?\n/);

		for (let b = 0; b < bodyLines.length; b++) {
			let testLine = bodyLines[ b ];
			if (b === 0) {
				const braceIdx = testLine.indexOf('{');
				if (braceIdx >= 0) testLine = testLine.slice(braceIdx + 1);
				else continue;
			}
			const v = _checkHotLoopAllocationOnLine(testLine.trim(), testLine, startIdx + b + 1, fnName);
			if (v) violations.push(v);
		}
	}

	/**
	 * @param {string[]} lines
	 * @param {(name: string) => boolean} isHotName
	 * @param {Array<{ line: number; col: number; type: string; message: string; severity: 'error' | 'warning'; snippet: string }>} violations
	 */
	function _scanHotFunctions(lines, isHotName, violations) {
		for (let i = 0; i < lines.length; i++) {
			const sig = _extractFnSignatureInfo(lines[ i ]);
			if (!sig || !isHotName(sig.name)) continue;
			_auditHotFunctionBody(lines, i, sig.name, violations);
		}
	}

	/**
	 * @param {string[]} lines
	 * @param {number} startIdx
	 * @param {string[]} jsdocParams
	 * @param {Array<{ line: number; functionName: string; issue: string; message: string; expectedParams: string[]; actualParams: string[] }>} issues
	 */
	function _checkJSDocSignatureParity(lines, startIdx, jsdocParams, issues) {
		for (let k = startIdx + 1; k < Math.min(lines.length, startIdx + 4); k++) {
			const nextL = lines[ k ].trim();
			if (nextL && !nextL.startsWith('//')) {
				const sigInfo = _extractFnSignatureInfo(nextL);
				if (sigInfo) {
					const issue = _compareJSDocAndSignatureParams(jsdocParams, sigInfo.params, sigInfo.name, k + 1);
					if (issue) issues.push(issue);
				}
				break;
			}
		}
	}

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

				const { structuralHits, logicalOps, openBraces, closeBraces } = _scoreLineComplexity(line);
				if (structuralHits > 0) {
					complexity += structuralHits * (1 + nesting);
				}
				complexity += logicalOps;

				if (openBraces !== closeBraces) {
					nesting = Math.max(0, nesting + openBraces - closeBraces);
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
			/** @type {Array<{ name: string; line: number; endLine: number; complexity: number; score: number; codeSlice: string }>} */
			const results = [];
			const FN_DECL_REGEX = /(?:async\s+)?function(?:\s+([A-Za-z0-9_$]+))?\s*\(/;
			const ARROW_FN_REGEX = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[ i ];
				if (!line.includes('{')) continue;

				const fnName = _extractFunctionName(line, FN_DECL_REGEX, ARROW_FN_REGEX);
				if (!fnName) continue;

				const { endLine, fnBody } = _extractFunctionSlice(lines, i);
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
		},

		/**
		 * Zero-Allocation Hot-Loop Sentinel
		 * Scans source code for transient garbage collection allocations in 60Hz hot paths (update, render, tick, step, etc.)
		 * @param {string} source
		 * @param {string} [contextName='update']
		 * @returns {Array<{ line: number; col: number; type: string; message: string; severity: 'error' | 'warning'; snippet: string }>}
		 */
		// AFTER (Only inspects bodies of hot functions):
		auditHotLoopAllocations(source, contextName = null) {
			/**
			 * @type {{ line: number; col: number; type: string; message: string; severity: "error" | "warning"; snippet: string; }[]}
			 */
			const violations = [];
			if (typeof source !== 'string' || !source) return violations;

			const isHotName = (/** @type {string} */ name) => /(?:update|render|tick|step|_render|draw|animate|loop)/i.test(name);
			const lines = source.split(/\r?\n/);

			if (contextName && isHotName(contextName)) {
				for (let i = 0; i < lines.length; i++) {
					const v = _checkHotLoopAllocationOnLine(lines[ i ].trim(), lines[ i ], i + 1, contextName);
					if (v) violations.push(v);
				}
				return violations;
			}

			_scanHotFunctions(lines, isHotName, violations);
			return violations;
		},

		/**
		 * JSDoc-to-Signature Contract Parity Verifier
		 * Detects arity drift, missing parameters, parameter name mismatches, and return contract drift.
		 * @param {string} source
		 * @returns {Array<{ line: number; functionName: string; issue: string; message: string; expectedParams: string[]; actualParams: string[] }>}
		 */
		verifyJSDocParity(source) {
			/** @type {Array<{ line: number; functionName: string; issue: string; message: string; expectedParams: string[]; actualParams: string[] }>} */
			const issues = [];
			if (typeof source !== 'string' || !source) return issues;

			const lines = source.split(/\r?\n/);
			let inJSDoc = false;
			/** @type {string[]} */
			let jsdocParams = [];
			const paramRegex = /@param\s+(?:\{[^}]+\}\s+)?\[?([A-Za-z0-9_$.]+)\]?/;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[ i ].trim();

				if (line.startsWith('/**')) {
					inJSDoc = true;
					jsdocParams = [];
				}

				if (!inJSDoc) continue;

				const paramMatch = paramRegex.exec(line);
				if (paramMatch) {
					const paramName = paramMatch[ 1 ].split('.')[ 0 ].split('=')[ 0 ];
					if (!jsdocParams.includes(paramName)) {
						jsdocParams.push(paramName);
					}
				}

				if (line.endsWith('*/')) {
					inJSDoc = false;
					_checkJSDocSignatureParity(lines, i, jsdocParams, issues);
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

			this.record({
				id: 'erl_seed_proposal_schema',
				fingerprint: 'GOVERNOR/PROPOSAL_SCHEMA_MISMATCH',
				rule: 'GOVERNOR/PROPOSAL_SCHEMA_MISMATCH',
				description: 'Sanitize proposal envelope to PGE-DSL-1 specification and register target',
				searchPattern: '_governor.submit(proposal',
				replacePattern: '_governor.submit(_sanitizeProposalEnvelope(proposal)',
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
				return this._entries.get(diag.rule) || null;
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
				id: entry.id || `erl_${Date.now()}_${uid('erl')}`,
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
		 * Scans source code for known cataloged anti-patterns in the ledger.
		 * @param {string} sourceCode
		 * @returns {Array<{ rule: string; description: string; pattern: string }>}
		 */
		scanAntiPatterns(sourceCode) {
			if (!sourceCode) return [];
			const found = [];
			const seenRules = new Set();
			for (const entry of this._entries.values()) {
				if (entry.searchPattern && entry.rule?.startsWith('MATH/RANDOM')) {
					if (sourceCode.includes('Math.random()') && !seenRules.has('MATH/RANDOM')) {
						seenRules.add('MATH/RANDOM');
						found.push({
							rule: entry.rule,
							description: 'Unseeded Math.random() detected (violates PRNG authority invariant)',
							pattern: entry.searchPattern
						});
					}
				} else if (entry.searchPattern && entry.rule === 'DEBUGGER') {
					if (sourceCode.includes('debugger;') && !seenRules.has('DEBUGGER')) {
						seenRules.add('DEBUGGER');
						found.push({
							rule: entry.rule,
							description: 'Explicit debugger statement left in source code',
							pattern: entry.searchPattern
						});
					}
				}
			}
			return found;
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

	/* =========================================================================
	 * [SEC-16] DETERMINISTIC REGION SCAFFOLDER, AST CONTRACT & GRAPH ANALYZER
	 * Protocol: ARCH-CODE-PARTITION-001 / VSRP-001 / SDCP-001
	 * ========================================================================= */
	/**
	 * Pure Helper: Handle character when in active string or comment state
	 * @param {string} ch
	 * @param {string} next
	 * @param {{ inBlock: boolean; inLine: boolean; inStr: string | null }} state
	 * @returns {{ advance: number; emit: string } | null}
	 */
	function _handleActiveState(ch, next, state) {
		if (state.inStr) {
			if (ch === '\\') return { advance: 2, emit: ch + next };
			if (ch === state.inStr) state.inStr = null;
			return { advance: 1, emit: ch };
		}
		if (state.inLine) {
			if (ch === '\n') {
				state.inLine = false;
				return { advance: 1, emit: '\n' };
			}
			return { advance: 1, emit: '' };
		}
		if (state.inBlock) {
			if (ch === '*' && next === '/') {
				state.inBlock = false;
				return { advance: 2, emit: '' };
			}
			return { advance: 1, emit: '' };
		}
		return null;
	}

	/**
	 * Pure Helper: Process a single character step in comment stripping
	 * @param {string} source
	 * @param {number} i
	 * @param {{ inBlock: boolean; inLine: boolean; inStr: string | null }} state
	 * @returns {{ advance: number; emit: string }}
	 */
	function _stepStripComments(source, i, state) {
		const ch = source[ i ];
		const next = source[ i + 1 ] || '';

		if (state.inStr || state.inLine || state.inBlock) {
			const res = _handleActiveState(ch, next, state);
			if (res) return res;
		}

		if (ch === '"' || ch === "'" || ch === '`') {
			state.inStr = ch;
			return { advance: 1, emit: ch };
		}

		if (ch === '/' && next === '/') {
			state.inLine = true;
			return { advance: 2, emit: '' };
		}

		if (ch === '/' && next === '*') {
			state.inBlock = true;
			return { advance: 2, emit: '' };
		}

		return { advance: 1, emit: ch };
	}

	/**
	 * Pure Helper: Classify a line into a canonical region category
	 * @param {string} trimmed
	 * @returns {{ kind: string; title: string } | null}
	 */
	function _classifySourceLine(trimmed) {
		if (trimmed.startsWith('/**') && (trimmed.includes('@typedef') || trimmed.includes('@type'))) {
			return { kind: 'types', title: 'Type Definitions & Contract Schemas' };
		}
		if (/^const\s+[A-Z0-9_]+\s*=\s*(?:Object\.freeze)?/.test(trimmed)) {
			return { kind: 'constants', title: 'Constants & Configuration' };
		}
		if (/^(?:class\s+|const\s+[A-Za-z0-9_$]+\s*=\s*\(\(\)\s*=>)/.test(trimmed)) {
			return { kind: 'core', title: 'Core Implementation & State Engine' };
		}
		if (/^(?:if\s*\(typeof\s+window|if\s*\(typeof\s+module|window\.[A-Za-z0-9_$]+\s*=)/.test(trimmed)) {
			return { kind: 'export', title: 'Module Export & Global Scope Bindings' };
		}
		return null;
	}

	const PhoenixRegionScaffolder = Object.freeze({
		/**
		 * Strips comments from JavaScript source code for AST equivalence comparison
		 * @param {string} source
		 * @returns {string} Normalized code without comments
		 */
		stripComments(source) {
			if (typeof source !== 'string') return '';
			let out = '';
			const state = { inBlock: false, inLine: false, inStr: null };
			let i = 0;

			while (i < source.length) {
				const step = _stepStripComments(source, i, state);
				out += step.emit;
				i += step.advance;
			}
			return out.replace(/\s+/g, ' ').trim();
		},

		/**
		 * Checks whether a file contains valid, balanced //#region ... //#endregion blocks
		 * @param {string} source
		 * @returns {{ valid: boolean; count: number; regions: Array<{ id: string; title: string; line: number }> }}
		 */
		inspectRegions(source) {
			if (typeof source !== 'string') return { valid: false, count: 0, regions: [] };
			const lines = source.split(/\r?\n/);
			/** @type {Array<{ id: string; title: string; line: number }>} */
			const regions = [];
			let openCount = 0;
			const REG_REGION = /(?:\/\/|\/\*)\s*#?region\s*(\[SEC-[^\]]+\])?\s*(.*)/i;
			const REG_ENDREGION = /(?:\/\/|\/\*)\s*#?endregion/i;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[ i ].trim();
				const regMatch = REG_REGION.exec(line);
				if (regMatch) {
					openCount++;
					regions.push({
						id: regMatch[ 1 ] || `[SEC-${String(regions.length + 1).padStart(2, '0')}]`,
						title: (regMatch[ 2 ] || 'Unlabeled Subsystem').replace(/\*\/$/, '').trim(),
						line: i + 1
					});
				}
				if (REG_ENDREGION.test(line)) {
					openCount--;
				}
			}

			return {
				valid: openCount === 0 && regions.length > 0,
				count: regions.length,
				regions
			};
		},

		/**
		 * Deterministically scaffolds canonical //#region anchors around top-level code blocks
		 * with 100% executable AST invariance.
		 * @param {string} source
		 * @param {string} [_filename='unknown.js']
		 * @returns {{ scaffoldedSource: string; astEquivalent: boolean; regionCount: number }}
		 */
		scaffoldRegions(source, _filename = 'unknown.js') {
			if (typeof source !== 'string' || !source.trim()) {
				return { scaffoldedSource: source, astEquivalent: true, regionCount: 0 };
			}

			const existing = this.inspectRegions(source);
			if (existing.valid && existing.count >= 2) {
				return { scaffoldedSource: source, astEquivalent: true, regionCount: existing.count };
			}

			// Clean existing fragmented region markers before reconstructing
			const cleanedLines = source
				.split(/\r?\n/)
				.filter(l => !/^\s*(?:\/\/|\/\*)\s*#?(?:region|endregion)/i.test(l.trim()));

			/** @type {Array<{ kind: string; title: string; lines: string[] }>} */
			const blocks = [];
			/** @type {string[]} */
			let currentBlock = [];
			/** @type {string | null} */
			let currentKind = null;

			/**
			 * @param {string} kind
			 * @param {string} title
			 */
			const flushBlock = (kind, title) => {
				if (currentBlock.length > 0) {
					blocks.push({
						kind: currentKind || kind,
						title: title || 'Subsystem Implementation',
						lines: currentBlock.slice()
					});
					currentBlock = [];
					currentKind = null;
				}
			};

			for (const line of cleanedLines) {
				const classified = _classifySourceLine(line.trim());
				if (classified && classified.kind !== currentKind) {
					flushBlock(classified.kind, classified.title);
					currentKind = classified.kind;
				}
				currentBlock.push(line);
			}

			flushBlock('misc', 'Subsystem Implementation');

			// Construct canonical scaffolded file with strict sequential numbering
			/** @type {string[]} */
			const scaffolded = [];
			let secIndex = 1;

			for (const block of blocks) {
				const secTag = `[SEC-${String(secIndex).padStart(2, '0')}]`;
				secIndex++;
				scaffolded.push(
					`//#region ${secTag} ${block.title.toUpperCase()}`,
					...block.lines,
					`//#endregion\n`
				);
			}

			const scaffoldedSource = scaffolded.join('\n').trim() + '\n';
			const astEquivalent = this.stripComments(source) === this.stripComments(scaffoldedSource);

			return {
				scaffoldedSource: astEquivalent ? scaffoldedSource : source,
				astEquivalent,
				regionCount: blocks.length
			};
		},

		/**
		 * Verifies whether declared capabilities in JSDoc / getModuleInfo match actual AST operations.
		 * @param {string} source
		 * @param {string[]} [declaredCapabilities=[]]
		 * @returns {{ compliant: boolean; verifiedCapabilities: string[]; discrepancies: string[] }}
		 */
		verifyContract(source, declaredCapabilities = []) {
			/** @type {string[]} */
			const verified = [];
			/** @type {string[]} */
			const discrepancies = [];

			const hasMathRandom = /Math\.random\(\)/.test(source);
			/** @type {Array<{ cap: string; test: RegExp; checkDiscrepancy?: (present: boolean) => string | null }>} */
			const CAPABILITY_RULES = [
				{
					cap: 'cap:render.canvas',
					test: /getContext\(['"]2d['"]\)|transferControlToOffscreen|fillRect|drawImage/,
					checkDiscrepancy: (present) => present ? null : 'Declared cap:render.canvas but found no Canvas 2D operations.'
				},
				{
					cap: 'cap:render.webgl',
					test: /getContext\(['"]webgl|getContext\(['"]webgl2|gl\./
				},
				{
					cap: 'cap:persist.binary',
					test: /ArrayBuffer|DataView|Float32Array|Uint8Array|Int32Array/,
					checkDiscrepancy: (present) => present ? null : 'Declared cap:persist.binary but found no TypedArray / DataView operations.'
				},
				{
					cap: 'cap:audio.procedural',
					test: /AudioContext|webkitAudioContext|createOscillator|createGain/,
					checkDiscrepancy: (present) => present ? null : 'Declared cap:audio.procedural but found no Web Audio API operations.'
				},
				{
					cap: 'cap:persist.opfs',
					test: /FileSystemSyncAccessHandle|getDirectory|createWritable/
				},
				{
					cap: 'cap:math.prng',
					test: /Mulberry32|calculateCRC32|_prngSeed|EmberlightPRNG/,
					checkDiscrepancy: (_present) => hasMathRandom ? 'Declared cap:math.prng but found unseeded Math.random() calls.' : null
				}
			];

			for (const rule of CAPABILITY_RULES) {
				const isPresent = rule.test.test(source);
				if (isPresent) verified.push(rule.cap);

				if (declaredCapabilities.includes(rule.cap) && rule.checkDiscrepancy) {
					const discrepancy = rule.checkDiscrepancy(isPresent);
					if (discrepancy) discrepancies.push(discrepancy);
				}
			}

			return {
				compliant: discrepancies.length === 0,
				verifiedCapabilities: verified,
				discrepancies
			};
		},

		/**
		 * Analyzes module input/output dependencies and external global symbol bindings
		 * @param {string} source
		 * @returns {{ reads: string[]; writes: string[]; events: string[] }}
		 */
		analyzeDependencies(source) {
			/** @type {Set<string>} */
			const reads = new Set();
			/** @type {Set<string>} */
			const writes = new Set();
			/** @type {Set<string>} */
			const events = new Set();

			const STANDARD_GLOBALS = new Set([ 'Object', 'Array', 'String', 'Number', 'Boolean', 'Math', 'Date', 'JSON', 'Map', 'Set', 'Promise', 'DataView', 'ArrayBuffer' ]);

			// Detect global reads
			const REG_READ = /\b([A-Z][A-Za-z0-9_$]*)\b/g;
			let match;
			while ((match = REG_READ.exec(source)) !== null) {
				const sym = match[ 1 ];
				if (!STANDARD_GLOBALS.has(sym) && sym.length > 1) {
					reads.add(sym);
				}
			}

			// Detect global exports
			const REG_WRITE = /\b(?:window|global)\.([A-Za-z0-9_$]+)\s*=/g;
			while ((match = REG_WRITE.exec(source)) !== null) {
				writes.add(match[ 1 ].trim());
			}

			// Detect EventBus subscriptions / publications
			const REG_EVENT = /\b(?:subscribe|publish)\(['"]([A-Z0-9_:]+)['"]/g;
			while ((match = REG_EVENT.exec(source)) !== null) {
				events.add(match[ 1 ]);
			}

			return {
				reads: Array.from(reads),
				writes: Array.from(writes),
				events: Array.from(events)
			};
		}
	});
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

		/**
		 * @param {string} name
		 * @returns {any}
		 */
		getTarget(name) {
			return this._targets.get(name) || null;
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
		 * @param {FileSystemDirectoryHandle} dirHandle
		 */
		mountProjectDirectory(dirHandle) {
			this._projectDir = dirHandle;
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
		 * @param {string} filePath
		 * @param {string} [content]
		 */
		async writeSourceToDisk(filePath, content) {
			const text = content !== undefined ? content : this.getSource(filePath);
			if (typeof text !== "string") {
				throw new TypeError(`writeSourceToDisk: no content registered for '${filePath}'`);
			}
			return this._storage.writeProjectFile(filePath, text);
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
				return errors;
			}
			if (!t.writable) errors.push(`target is read-only: ${targetName}`);
			if (!t.allowedOperations.includes(String(proposal.operation || "")))
				errors.push(`operation not permitted: ${proposal.operation}`);

			this._checkHotLoopViolations(proposal, targetName, errors);
			return errors;
		}

		/**
		 * @param {PhoenixProposalDTO} proposal
		 * @param {string} targetName
		 * @param {string[]} errors
		 */
		_checkHotLoopViolations(proposal, targetName, errors) {
			if (!proposal.changes || !Array.isArray(proposal.changes)) return;
			for (const c of proposal.changes) {
				const codeToCheck = typeof c.content === "string" ? c.content : "";
				const hotViolations = PhoenixLinterSuite.auditHotLoopAllocations(codeToCheck, targetName);
				if (hotViolations.length > 0) {
					errors.push(`[GATE_FAIL_HOT_LOOP_ALLOCATION] Target '${targetName}' violates zero-allocation hot-loop invariant: ${hotViolations[ 0 ].message}`);
				}
			}
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
		get PhoenixAudioSynthesizer() { return global.PhoenixAudioSynthesizer || PhoenixAudioSynthesizer; },
		PhoenixSymbolIndexer,
		PhoenixLexer,
		PhoenixFuzzySearch,
		PhoenixSearchEngine,
		PhoenixChunkDiffEngine,
		PhoenixRuntimeSandbox,
		get PhoenixWebGLBatcher() { return global.PhoenixWebGLBatcher || PhoenixWebGLBatcher; },
		get PhoenixCanvas2DLayerEngine() { return global.PhoenixCanvas2DLayerEngine || PhoenixCanvas2DLayerEngine; },
		get PhoenixPseudo3DRaycaster() { return global.PhoenixPseudo3DRaycaster || PhoenixPseudo3DRaycaster; },
		get PhoenixVoxel3DEngine() { return global.PhoenixVoxel3DEngine || PhoenixVoxel3DEngine; },
		get PhoenixTerrainRaymarcher() { return global.PhoenixTerrainRaymarcher || PhoenixTerrainRaymarcher; },
		PhoenixCodeFormatter,
		PhoenixLinterSuite,
		PhoenixErrorResolutionLedger,
		PhoenixBatchRemediationPipeline,
		PhoenixRegionScaffolder,
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
