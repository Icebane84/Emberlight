/* cSpell:words synarche GUCA STCP VSRP PERSIST SDCP PMIP OSLM */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: STCP TRANSDUCTION COMPILER & INGESTION BRIDGE
 * Document Identifier: STCP-001-SYNARCHE-PARSER
 * Governing Protocol:  VSRP-001 / STCP-001 / PERSIST-001 / SDCP-001 / PMIP-001
 * Authority:           Host SSOT | Transduction Compiler Subsystem
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Constants, Hex Error Registry & Type Primitives
 *   [SEC-02] Plane 1: Lexical Ingestion & Scanner (SynarcheLexer)
 *   [SEC-03] Plane 2: Mixin-Stack Parser & State Atomicity (SynarcheParser)
 *   [SEC-04] Plane 3: Generic Universal Cartridge Assembly (GUCAEmitter)
 *   [SEC-05] Master Transduction Facade & Universal Exports (SynarcheCompiler)
 * ============================================================================
 */
((/** @type {Record<string, any>} */ global) => {
	'use strict';

	//#region [SEC-01] Constants, Hex Error Registry & Type Primitives

	/**
	 * @typedef {'DIRECTIVE'|'KEYWORD'|'IDENTIFIER'|'LITERAL_STRING'|'LITERAL_NUMBER'|'LITERAL_BOOL'|'SYMBOL'|'COMMENT'|'WHITESPACE'|'EOF'} TokenType
	 *
	 * @typedef {Object} Token
	 * @property {TokenType} type - Categorical token identifier
	 * @property {string} value - Raw string value of the token
	 * @property {number} start - 0-indexed starting byte offset in source
	 * @property {number} end - 0-indexed ending byte offset in source
	 * @property {number} line - 1-indexed line number in source
	 * @property {number} col - 1-indexed column number in source
	 *
	 * @typedef {Object} MemoryField
	 * @property {string} name - Field identifier
	 * @property {'u8'|'i8'|'u16'|'i16'|'u32'|'i32'|'f32'|'f64'} type - Primitive numerical type
	 * @property {number} size - Field size in bytes
	 * @property {number} offset - Byte offset from beginning of heap payload partition
	 * @property {boolean} isArray - True if field represents a fixed-length array
	 * @property {number} arrayLength - Array element count (1 if scalar)
	 *
	 * @typedef {Object} MemoryLayout
	 * @property {MemoryField[]} fields - Ordered array of memory field descriptors
	 * @property {number} totalBytes - Total memory capacity consumed in bytes
	 *
	 * @typedef {Object} StateField
	 * @property {string} name - State variable identifier
	 * @property {string} type - Declared primitive type name
	 * @property {string} defaultValue - Serialized default initialization expression
	 *
	 * @typedef {Object} MixinDefinition
	 * @property {string} name - Mixin unique identifier
	 * @property {Map<string, string>} methods - Map of method names to source bodies
	 * @property {Set<string>} fields - Set of declared state variable names
	 *
	 * @typedef {Object} LifecycleHandler
	 * @property {string[]} params - Parameter names list
	 * @property {string} body - Executable handler block body
	 *
	 * @typedef {Object} EventHandler
	 * @property {'listen'|'emit'} kind - Event interaction discriminator
	 * @property {string} topic - Channel or topic identifier
	 * @property {string} [payloadParam] - Parameter name for listener payload
	 * @property {string} [expression] - Payload expression for emitter
	 * @property {string} [body] - Listener block execution body
	 *
	 * @typedef {Object} CartridgeAST
	 * @property {string} name - Cartridge unique identifier
	 * @property {string} version - Semantic version string
	 * @property {string} author - Author or foundry designation
	 * @property {number} tier - Authority tier (defaults to 2 for Simulation Tenant)
	 * @property {string[]} capabilities - Declared required capabilities list
	 * @property {MemoryLayout} memoryLayout - PERSIST-001 linear memory partition layout
	 * @property {StateField[]} state - High-level JavaScript state fields
	 * @property {string[]} usedMixins - Ordered list of included mixin identifiers
	 * @property {Map<string, MixinDefinition>} mixins - Catalog of declared mixin AST structures
	 * @property {Map<string, LifecycleHandler>} handlers - Canonical lifecycle handlers
	 * @property {EventHandler[]} eventHandlers - Reactive event handler declarations
	 *
	 * @typedef {Object} LexerOptions
	 * @property {boolean} [preserveTrivia] - If true, emits WHITESPACE and COMMENT tokens
	 *
	 * @typedef {Object} ParserOptions
	 * @property {'STRICT'|'SLOPPY'} [mode] - Validation mode (STRICT fails closed; SLOPPY recovers)
	 * @property {string} [source] - Original raw source string for accurate block slicing
	 *
	 * @typedef {Object} EmitterOptions
	 * @property {'IIFE'|'CJS'} [format] - Output module format
	 *
	 * @typedef {Object} CompileOptions
	 * @property {'STRICT'|'SLOPPY'} [mode] - Parser compilation rigor
	 * @property {'IIFE'|'CJS'} [format] - Emitter output format
	 *
	 * @typedef {Object} CompileResult
	 * @property {boolean} ok - True if compilation completed without blocking errors
	 * @property {string} [code] - Synthesized zero-dependency VSRP-001 JavaScript cartridge code
	 * @property {CartridgeAST} [ast] - Validated intermediate AST representation
	 * @property {string[]} capabilities - Extracted capability list
	 * @property {string[]} errors - Array of formatted diagnostic error strings
	 * @property {number} memoryBytesRequired - Exact linear memory bytes needed in PERSIST-001 partition
	 */

	const ERRORS = Object.freeze({
		ERR_0x10: 'ERR_0x10: CYCLIC_MIXIN_DEPENDENCY',
		ERR_0x11: 'ERR_0x11: MIXIN_COLLISION',
		ERR_0x12: 'ERR_0x12: MIXIN_FIELD_COLLISION',
		ERR_0x13: 'ERR_0x13: PERSIST_CAPACITY_EXCEEDED',
		ERR_0x14: 'ERR_0x14: INVALID_DSL_SYNTAX',
		ERR_0x15: 'ERR_0x15: UNMAPPED_CAPABILITY',
		ERR_0x16: 'ERR_0x16: FARADAY_CAPABILITY_VIOLATION',
		ERR_0x17: 'ERR_0x17: TRANSIENT_HOT_LOOP_ALLOCATION',
	});

	const FARADAY_RESTRICTED_GLOBALS = Object.freeze(new Set([
		'window', 'document', 'localStorage', 'sessionStorage',
		'fetch', 'XMLHttpRequest', 'eval', 'Function', 'debugger'
	]));

	const COMPILER_VERSION = '1.0.0-PRO';
	const MAX_PERSIST_HEAP_BYTES = 2048;
	const TRIPARTITE_HEADER_BYTES = 96;
	const MAX_PAYLOAD_MEMORY_BYTES = MAX_PERSIST_HEAP_BYTES - TRIPARTITE_HEADER_BYTES; // 1952 bytes

	const MEMORY_TYPE_SIZES = Object.freeze({
		u8: 1, i8: 1,
		u16: 2, i16: 2,
		u32: 4, i32: 4,
		f32: 4, f64: 8,
	});

	const MEMORY_TYPE_ACCESSORS = Object.freeze({
		u8: { get: 'getUint8', set: 'setUint8', args: false },
		i8: { get: 'getInt8', set: 'setInt8', args: false },
		u16: { get: 'getUint16', set: 'setUint16', args: true },
		i16: { get: 'getInt16', set: 'setInt16', args: true },
		u32: { get: 'getUint32', set: 'setUint32', args: true },
		i32: { get: 'getInt32', set: 'setInt32', args: true },
		f32: { get: 'getFloat32', set: 'setFloat32', args: true },
		f64: { get: 'getFloat64', set: 'setFloat64', args: true },
	});

	const CANONICAL_LIFECYCLE_METHODS = Object.freeze([
		'configure', 'boot', 'activate', 'update',
		'render', 'suspend', 'serialize', 'deserialize', 'destroy'
	]);

	//#endregion [SEC-01]

	//#region [SEC-02] Plane 1: Lexical Ingestion & Scanner (SynarcheLexer)

	const KEYWORDS = new Set([
		'capabilities', 'memory', 'state', 'mixin', 'use', 'on', 'listen',
		'emit', 'override', 'true', 'false', 'null', 'undefined'
	]);

	const DIRECTIVES = new Set([
		'@cartridge', '@version', '@author', '@tier'
	]);

	/**
	 * Plane 1 Lexical Ingestion Scanner.
	 */
	class SynarcheLexer {
		/**
		 * Architectural: Pure helper. Scans contiguous whitespace.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @param {boolean} preserveTrivia - Whether to preserve trivia as tokens
		 * @returns {{ token: Token | null, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanWhitespace(source, idx, line, col, preserveTrivia) {
			const start = idx;
			const startLine = line;
			const startCol = col;
			let cur = idx;
			let curLine = line;
			let curCol = col;
			let val = '';
			while (cur < source.length && /\s/.test(source[ cur ])) {
				val += source[ cur ];
				if (source[ cur ] === '\n') {
					curLine++;
					curCol = 1;
				} else {
					curCol++;
				}
				cur++;
			}
			/** @type {Token | null} */
			const token = preserveTrivia
				? { type: 'WHITESPACE', value: val, start, end: cur, line: startLine, col: startCol }
				: null;
			return { token, nextIdx: cur, nextLine: curLine, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Scans single-line comment.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @param {boolean} preserveTrivia - Whether to preserve trivia as tokens
		 * @returns {{ token: Token | null, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanLineComment(source, idx, line, col, preserveTrivia) {
			const start = idx;
			const startLine = line;
			const startCol = col;
			let cur = idx;
			let curCol = col;
			let val = '';
			while (cur < source.length && source[ cur ] !== '\n') {
				val += source[ cur++ ];
				curCol++;
			}
			/** @type {Token | null} */
			const token = preserveTrivia
				? { type: 'COMMENT', value: val, start, end: cur, line: startLine, col: startCol }
				: null;
			return { token, nextIdx: cur, nextLine: line, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Scans multi-line block comment.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @param {boolean} preserveTrivia - Whether to preserve trivia as tokens
		 * @returns {{ token: Token | null, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanBlockComment(source, idx, line, col, preserveTrivia) {
			const start = idx;
			const startLine = line;
			const startCol = col;
			let cur = idx + 2;
			let curLine = line;
			let curCol = col + 2;
			let val = '/*';
			while (cur < source.length && !(source[ cur ] === '*' && source[ cur + 1 ] === '/')) {
				val += source[ cur ];
				if (source[ cur ] === '\n') {
					curLine++;
					curCol = 1;
				} else {
					curCol++;
				}
				cur++;
			}
			if (cur < source.length) {
				val += '*/';
				cur += 2;
				curCol += 2;
			}
			/** @type {Token | null} */
			const token = preserveTrivia
				? { type: 'COMMENT', value: val, start, end: cur, line: startLine, col: startCol }
				: null;
			return { token, nextIdx: cur, nextLine: curLine, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Dispatches to line or block comment scanner.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @param {boolean} preserveTrivia - Whether to preserve trivia as tokens
		 * @returns {{ token: Token | null, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanComment(source, idx, line, col, preserveTrivia) {
			if (source[ idx + 1 ] === '/') {
				return this._scanLineComment(source, idx, line, col, preserveTrivia);
			}
			return this._scanBlockComment(source, idx, line, col, preserveTrivia);
		}

		/**
		 * Architectural: Pure helper. Scans @ directives or identifiers.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @returns {{ token: Token, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanDirective(source, idx, line, col) {
			const start = idx;
			let cur = idx + 1;
			let curCol = col + 1;
			let val = '@';
			while (cur < source.length && /[a-zA-Z0-9_]/.test(source[ cur ])) {
				val += source[ cur++ ];
				curCol++;
			}
			/** @type {TokenType} */
			const type = DIRECTIVES.has(val) ? 'DIRECTIVE' : 'IDENTIFIER';
			const token = { type, value: val, start, end: cur, line, col };
			return { token, nextIdx: cur, nextLine: line, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Scans quoted string literals.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @returns {{ token: Token, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanStringLiteral(source, idx, line, col) {
			const start = idx;
			const quote = source[ idx ];
			let cur = idx + 1;
			let curCol = col + 1;
			let val = '';
			while (cur < source.length && source[ cur ] !== quote) {
				if (source[ cur ] === '\\' && cur + 1 < source.length) {
					val += source[ cur++ ];
					curCol++;
				}
				val += source[ cur++ ];
				curCol++;
			}
			if (cur < source.length) {
				cur++;
				curCol++;
			}
			const token = { type: /** @type {TokenType} */ ('LITERAL_STRING'), value: val, start, end: cur, line, col };
			return { token, nextIdx: cur, nextLine: line, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Scans numeric literals (decimal and hexadecimal).
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @returns {{ token: Token, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanNumericLiteral(source, idx, line, col) {
			const start = idx;
			let cur = idx;
			let curCol = col;
			let val = source[ idx ];
			cur++; curCol++;
			const isHex = val === '0' && cur < source.length && (source[ cur ] === 'x' || source[ cur ] === 'X');

			if (isHex) {
				val += source[ cur++ ]; curCol++;
				while (cur < source.length && /[0-9a-fA-F]/.test(source[ cur ])) {
					val += source[ cur++ ]; curCol++;
				}
			} else {
				while (cur < source.length && /[0-9.]/.test(source[ cur ])) {
					val += source[ cur++ ]; curCol++;
				}
			}

			const token = { type: /** @type {TokenType} */ ('LITERAL_NUMBER'), value: val, start, end: cur, line, col };
			return { token, nextIdx: cur, nextLine: line, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Scans identifiers, keywords, or boolean literals.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @returns {{ token: Token, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanWord(source, idx, line, col) {
			const start = idx;
			let cur = idx;
			let curCol = col;
			let val = '';
			while (cur < source.length && /[a-zA-Z0-9_]/.test(source[ cur ])) {
				val += source[ cur++ ];
				curCol++;
			}
			/** @type {TokenType} */
			let type = 'IDENTIFIER';
			if (val === 'true' || val === 'false') {
				type = 'LITERAL_BOOL';
			} else if (KEYWORDS.has(val)) {
				type = 'KEYWORD';
			}
			const token = { type, value: val, start, end: cur, line, col };
			return { token, nextIdx: cur, nextLine: line, nextCol: curCol };
		}

		/**
		 * Architectural: Pure helper. Scans single-character symbol or fallback token.
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @returns {{ token: Token, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanSymbol(source, idx, line, col) {
			const token = { type: /** @type {TokenType} */ ('SYMBOL'), value: source[ idx ], start: idx, end: idx + 1, line, col };
			return { token, nextIdx: idx + 1, nextLine: line, nextCol: col + 1 };
		}

		/**
		 * Architectural: Pure helper. Dispatches token scanning based on initial character.
		 * Cognitive Complexity: <= 11 (SonarLint S3776 compliant).
		 * @param {string} source - Input character stream
		 * @param {number} idx - Current character index
		 * @param {number} line - Current line number
		 * @param {number} col - Current column number
		 * @param {boolean} preserveTrivia - Whether to preserve trivia as tokens
		 * @returns {{ token: Token | null, nextIdx: number, nextLine: number, nextCol: number }}
		 */
		static _scanNextToken(source, idx, line, col, preserveTrivia) {
			const char = source[ idx ];
			const nextChar = source[ idx + 1 ] || '';

			if (/\s/.test(char)) {
				return this._scanWhitespace(source, idx, line, col, preserveTrivia);
			}
			if (char === '/' && (nextChar === '/' || nextChar === '*')) {
				return this._scanComment(source, idx, line, col, preserveTrivia);
			}
			if (char === '@') {
				return this._scanDirective(source, idx, line, col);
			}
			if (char === '"' || char === "'") {
				return this._scanStringLiteral(source, idx, line, col);
			}
			if (/\d/.test(char) || (char === '-' && /\d/.test(nextChar))) {
				return this._scanNumericLiteral(source, idx, line, col);
			}
			if (/[a-zA-Z_]/.test(char)) {
				return this._scanWord(source, idx, line, col);
			}
			return this._scanSymbol(source, idx, line, col);
		}

		/**
		 * Architectural: Pure lexical scanner. Scans character stream into typed tokens.
		 * Cognitive Complexity: <= 3 (SonarLint S3776 compliant).
		 * @param {string} source - Input character stream
		 * @param {LexerOptions} [options] - Optional lexical scanner configuration
		 * @returns {Token[]} Sequenced stream of typed tokens
		 */
		static tokenize(source, options = {}) {
			const preserveTrivia = Boolean(options.preserveTrivia);
			/** @type {Token[]} */
			const tokens = [];
			const len = source.length;
			let idx = 0;
			let line = 1;
			let col = 1;

			while (idx < len) {
				const res = this._scanNextToken(source, idx, line, col, preserveTrivia);
				if (res.token) {
					tokens.push(res.token);
				}
				idx = res.nextIdx;
				line = res.nextLine;
				col = res.nextCol;
			}

			tokens.push({ type: 'EOF', value: '', start: idx, end: idx, line, col });
			return tokens;
		}
	}

	//#endregion [SEC-02]

	//#region [SEC-03] Plane 2: Mixin-Stack Parser & State Atomicity (SynarcheParser)

	/**
	 * Plane 2 Mixin-Stack Semantic Synthesizer & Validator.
	 */
	class SynarcheParser {
		/**
		 * Architectural: State-mutating constructor. Initializes parser cursor, AST, and error log.
		 * @param {Token[]} tokens - Sequenced stream of lexed tokens
		 * @param {ParserOptions} [options] - Parser configuration and optional source text
		 */
		constructor(tokens, options = {}) {
			this.source = options.source || '';
			this.tokens = tokens.filter(t => t.type !== 'WHITESPACE' && t.type !== 'COMMENT');
			this.pos = 0;
			this.mode = options.mode || 'STRICT';
			/** @type {string[]} */
			this.errors = [];
			/** @type {CartridgeAST} */
			this.ast = {
				name: 'AnonymousCartridge',
				version: '1.0.0',
				author: 'Sovereign',
				tier: 2,
				capabilities: [],
				memoryLayout: {
					fields: [],
					totalBytes: 0,
				},
				state: [],
				usedMixins: [],
				mixins: new Map(),
				handlers: new Map(),
				eventHandlers: [],
			};
		}

		/**
		 * Architectural: Pure inspection. Returns the token at current position without advancing cursor.
		 * @returns {Token} Current token or EOF token
		 */
		peek() {
			return this.tokens[ this.pos ] || { type: 'EOF', value: '', start: 0, end: 0, line: 0, col: 0 };
		}

		/**
		 * Architectural: State-mutating. Consumes and returns current token, advancing parser position.
		 * @returns {Token} The consumed token
		 */
		next() {
			const t = this.peek();
			if (this.pos < this.tokens.length) this.pos++;
			return t;
		}

		/**
		 * Architectural: State-mutating. Conditionally consumes current token if type or value matches.
		 * @param {string} typeOrVal - Token type or literal string value to match
		 * @returns {boolean} True if matched and advanced; otherwise false
		 */
		match(typeOrVal) {
			const t = this.peek();
			if (t.type === typeOrVal || t.value === typeOrVal) {
				this.next();
				return true;
			}
			return false;
		}

		/**
		 * Architectural: State-mutating. Records diagnostic error and throws if in STRICT mode.
		 * @param {string} errCode - Hex error code identifier from ERRORS registry
		 * @param {string} msg - Detailed error message description
		 * @param {Token} [tok] - Offending token for line/column attribution
		 * @returns {void}
		 */
		fail(errCode, msg, tok) {
			const target = tok || this.peek();
			const formatted = `[${errCode}] L${target.line}:C${target.col} - ${msg}`;
			this.errors.push(formatted);
			if (this.mode === 'STRICT') {
				throw new Error(formatted);
			}
		}

		/**
		 * Architectural: State-mutating. Parses token stream into complete CartridgeAST.
		 * @returns {{ ast: CartridgeAST, errors: string[] }} Resulting AST and collected diagnostic errors
		 */
		parse() {
			while (this.peek().type !== 'EOF') {
				const tok = this.peek();

				if (tok.type === 'DIRECTIVE') {
					this._parseDirective();
				} else if (tok.value === 'capabilities') {
					this._parseCapabilities();
				} else if (tok.value === 'memory') {
					this._parseMemoryBlock();
				} else if (tok.value === 'state') {
					this._parseStateBlock();
				} else if (tok.value === 'use') {
					this._parseUseMixin();
				} else if (tok.value === 'mixin') {
					this._parseMixinDecl();
				} else if (tok.value === 'on') {
					this._parseLifecycleHandler();
				} else if (tok.value === 'listen') {
					this._parseListenHandler();
				} else if (tok.value === 'emit') {
					this._parseEmitStatement();
				} else {
					this.fail(ERRORS.ERR_0x14, `Unexpected token '${tok.value}'`);
					this.next();
				}
			}

			// Post-parse semantic verifications
			this._validateCapabilities();
			this._validateMixins();
			this._validateFaradayAndHotLoops();

			return { ast: this.ast, errors: this.errors };
		}

		/**
		 * Architectural: State-mutating private helper. Parses header directives (@cartridge, @version, etc.).
		 * @returns {void}
		 */
		_parseDirective() {
			const dir = this.next().value;
			const valTok = this.next();
			if (dir === '@cartridge') {
				this.ast.name = valTok.value;
			} else if (dir === '@version') {
				this.ast.version = valTok.value;
			} else if (dir === '@author') {
				this.ast.author = valTok.value;
			} else if (dir === '@tier') {
				this.ast.tier = Number.parseInt(valTok.value, 10) || 2;
			}
		}

		/**
		 * Architectural: State-mutating private helper. Parses capabilities block and registers tokens.
		 * @returns {void}
		 */
		_parseCapabilities() {
			this.next(); // 'capabilities'
			if (!this.match('{')) this.fail(ERRORS.ERR_0x14, "Expected '{' after capabilities");
			while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
				const capTok = this.next();
				if (capTok.type === 'IDENTIFIER') {
					this.ast.capabilities.push(capTok.value);
				}
				this.match(',');
			}
			this.match('}');
		}

		/**
		 * Architectural: State-mutating private helper. Parses memory PERSIST_001 block and calculates byte offsets.
		 * @returns {void}
		 */
		_parseMemoryBlock() {
			this.next(); // 'memory'
			const ident = this.next();
			if (ident.value !== 'PERSIST_001') {
				this.fail(ERRORS.ERR_0x14, `Expected 'PERSIST_001', found '${ident.value}'`);
			}
			if (!this.match('{')) this.fail(ERRORS.ERR_0x14, "Expected '{' in memory block");

			let offset = 0;
			while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
				const nameTok = this.next();
				if (!this.match(':')) this.fail(ERRORS.ERR_0x14, "Expected ':' after field name");
				const typeTok = this.next();
				const itemSize = MEMORY_TYPE_SIZES[/** @type {keyof typeof MEMORY_TYPE_SIZES} */ (typeTok.value) ];
				if (!itemSize) {
					this.fail(ERRORS.ERR_0x14, `Invalid memory primitive '${typeTok.value}'`);
				}

				let isArray = false;
				let arrayLength = 1;
				if (this.match('[')) {
					isArray = true;
					const lenTok = this.next();
					arrayLength = Number.parseInt(lenTok.value, 10) || 1;
					this.match(']');
				}
				this.match(';');

				const fieldSize = (itemSize || 1) * arrayLength;
				this.ast.memoryLayout.fields.push({
					name: nameTok.value,
					type: /** @type {'u8'|'i8'|'u16'|'i16'|'u32'|'i32'|'f32'|'f64'} */ (typeTok.value),
					size: fieldSize,
					offset,
					isArray,
					arrayLength
				});
				offset += fieldSize;
			}
			this.match('}');

			this.ast.memoryLayout.totalBytes = offset;
			if (offset > MAX_PAYLOAD_MEMORY_BYTES) {
				this.fail(ERRORS.ERR_0x13, `Memory layout requires ${offset}B, exceeding max ${MAX_PAYLOAD_MEMORY_BYTES}B payload limit`);
			}
		}

		/**
		 * Architectural: State-mutating private helper. Parses state block into high-level state field descriptors.
		 * @returns {void}
		 */
		_parseStateBlock() {
			this.next(); // 'state'
			if (!this.match('{')) this.fail(ERRORS.ERR_0x14, "Expected '{' in state block");
			while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
				const nameTok = this.next();
				if (!this.match(':')) this.fail(ERRORS.ERR_0x14, "Expected ':' in state field");
				const typeTok = this.next();
				let defaultValue = 'null';
				if (this.match('=')) {
					const valTok = this.next();
					defaultValue = valTok.value;
				}
				this.match(';');
				this.ast.state.push({
					name: nameTok.value,
					type: typeTok.value,
					defaultValue
				});
			}
			this.match('}');
		}

		/**
		 * Architectural: State-mutating private helper. Parses use mixin inclusion statement.
		 * @returns {void}
		 */
		_parseUseMixin() {
			this.next(); // 'use'
			this.match('mixin');
			const nameTok = this.next();
			this.match(';');
			this.ast.usedMixins.push(nameTok.value);
		}

		/**
		 * Architectural: State-mutating private helper. Parses mixin declaration block.
		 * @returns {void}
		 */
		_parseMixinDecl() {
			this.next(); // 'mixin'
			const nameTok = this.next();
			if (!this.match('{')) this.fail(ERRORS.ERR_0x14, "Expected '{' in mixin declaration");

			/** @type {Map<string, string>} */
			const methods = new Map();
			/** @type {Set<string>} */
			const fields = new Set();

			while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
				const tok = this.peek();
				if (tok.value === 'state') {
					this.next();
					if (this.match('{')) {
						while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
							const fTok = this.next();
							fields.add(fTok.value);
							while (this.peek().value !== ';' && this.peek().value !== '}' && this.peek().type !== 'EOF') {
								this.next();
							}
							this.match(';');
						}
						this.match('}');
					}
				} else if (tok.value === 'on') {
					this.next();
					const mName = this.next().value;
					this._parseParamList();
					const body = this._parseBlock();
					methods.set(mName, body);
				} else {
					this.next();
				}
			}
			this.match('}');
			this.ast.mixins.set(nameTok.value, { name: nameTok.value, methods, fields });
		}

		/**
		 * Architectural: State-mutating private helper. Parses canonical 9-method lifecycle handler.
		 * @returns {void}
		 */
		_parseLifecycleHandler() {
			this.next(); // 'on'
			const methodTok = this.next();
			if (!CANONICAL_LIFECYCLE_METHODS.includes(methodTok.value)) {
				this.fail(ERRORS.ERR_0x14, `Unknown lifecycle method '${methodTok.value}'`);
			}
			const params = this._parseParamList();
			const body = this._parseBlock();
			this.ast.handlers.set(methodTok.value, { params, body });
		}

		/**
		 * Architectural: State-mutating private helper. Parses reactive listen event handler.
		 * @returns {void}
		 */
		_parseListenHandler() {
			this.next(); // 'listen'
			const topicTok = this.next();
			const params = this._parseParamList();
			const body = this._parseBlock();
			this.ast.eventHandlers.push({
				kind: 'listen',
				topic: topicTok.value,
				payloadParam: params[ 0 ] || 'payload',
				body
			});
		}

		/**
		 * Architectural: State-mutating private helper. Parses reactive emit event statement.
		 * @returns {void}
		 */
		_parseEmitStatement() {
			this.next(); // 'emit'
			const topicTok = this.next();
			let expression = '';
			if (this.match('(')) {
				while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
					expression += this.next().value;
				}
				this.match(')');
			}
			this.match(';');
			this.ast.eventHandlers.push({
				kind: 'emit',
				topic: topicTok.value,
				expression
			});
		}

		/**
		 * Architectural: State-mutating private helper. Parses parenthesized identifier parameter list.
		 * @returns {string[]} Array of extracted parameter names
		 */
		_parseParamList() {
			const params = [];
			if (this.match('(')) {
				while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
					const pTok = this.next();
					if (pTok.type === 'IDENTIFIER') params.push(pTok.value);
					this.match(',');
				}
				this.match(')');
			}
			return params;
		}

		/**
		 * Architectural: State-mutating private helper. Parses braced block and extracts sliced source code.
		 * @returns {string} Trimmed inner block body source string
		 */
		_parseBlock() {
			if (!this.match('{')) return '';
			const openBraceTok = this.tokens[ this.pos - 1 ];
			const startOffset = openBraceTok.end;
			let depth = 1;
			let closeBraceTok = null;
			while (depth > 0 && this.peek().type !== 'EOF') {
				const tok = this.next();
				if (tok.value === '{') depth++;
				else if (tok.value === '}') {
					depth--;
					if (depth === 0) closeBraceTok = tok;
				}
			}
			if (this.source && closeBraceTok) {
				return this.source.slice(startOffset, closeBraceTok.start).trim();
			}
			return '';
		}

		/**
		 * Architectural: State-mutating verification pass. Asserts that subsystem calls match declared capabilities.
		 * @returns {void}
		 */
		_validateCapabilities() {
			const declared = new Set(this.ast.capabilities);
			for (const [ method, handler ] of this.ast.handlers.entries()) {
				if (/ctx\.audio|playTone|oscillator/i.test(handler.body) && !declared.has('CAP_AUDIO_SYNTH')) {
					this.fail(ERRORS.ERR_0x15, `Method '${method}' invokes audio without CAP_AUDIO_SYNTH declaration`);
				}
				if (/ctx\.draw|ctx\.canvas|fill(Rect|Text)|stroke/i.test(handler.body) && !declared.has('CAP_RENDER_CANVAS2D')) {
					this.fail(ERRORS.ERR_0x15, `Method '${method}' invokes canvas rendering without CAP_RENDER_CANVAS2D declaration`);
				}
			}
		}

		/**
		 * Architectural: State-mutating verification pass. Verifies mixin composition and flags state collisions.
		 * @returns {void}
		 */
		_validateMixins() {
			const seenFields = new Set(this.ast.state.map(s => s.name));
			for (const mixinName of this.ast.usedMixins) {
				const mixin = this.ast.mixins.get(mixinName);
				if (!mixin) continue;

				for (const field of mixin.fields) {
					if (seenFields.has(field)) {
						this.fail(ERRORS.ERR_0x12, `State field collision: '${field}' in mixin '${mixinName}'`);
					}
					seenFields.add(field);
				}
			}
		}

		/**
		 * Architectural: State-mutating verification pass. Asserts Faraday isolation (SDCP-001) and zero-allocation hot loops.
		 * @returns {void}
		 */
		_validateFaradayAndHotLoops() {
			for (const [ method, handler ] of this.ast.handlers.entries()) {
				for (const forbidden of FARADAY_RESTRICTED_GLOBALS) {
					const regex = new RegExp(String.raw`\b` + forbidden + String.raw`\b`);
					if (regex.test(handler.body)) {
						this.fail(ERRORS.ERR_0x16, `Faraday isolation breach: forbidden global '${forbidden}' in handler '${method}'`);
					}
				}
				if (method === 'update' && (
					/\bnew\s+(?!DataView|ArrayBuffer)[A-Za-z0-9_$]+/.test(handler.body) ||
					/\b(new\s+Object|new\s+Array|Array\.from|Object\.assign|Object\.create)\b/.test(handler.body)
				)) {
					this.fail(ERRORS.ERR_0x17, `Transient hot-loop heap allocation in 'update' handler violates zero-GC invariant`);
				}
			}
		}
	}

	//#endregion [SEC-03]

	//#region [SEC-04] Plane 3: Generic Universal Cartridge Assembly (GUCAEmitter)

	/**
	 * Plane 3 Generic Universal Cartridge Assembly Code Generator.
	 */
	class GUCAEmitter {
		/**
		 * Architectural: Pure code generation. Synthesizes validated CartridgeAST into zero-dependency VSRP-001 IIFE.
		 * @param {CartridgeAST} ast - Validated cartridge AST
		 * @param {EmitterOptions} [options] - Code emission options
		 * @returns {string} Standalone executable VSRP-001 Cartridge JavaScript source code
		 */
		static emit(ast, options = {}) {
			const format = options.format || 'IIFE';
			const cartridgeName = ast.name || 'AnonymousCartridge';

			// 1. Build memory accessors
			const memoryAccessors = [];
			for (const field of ast.memoryLayout.fields) {
				const acc = MEMORY_TYPE_ACCESSORS[ field.type ];
				if (!acc) continue;
				const endianArg = acc.args ? ', true' : '';
				if (field.isArray) {
					memoryAccessors.push(`
		get ${field.name}() {
			return (index) => this._view.${acc.get}(${field.offset} + index * ${MEMORY_TYPE_SIZES[ field.type ]}${endianArg});
		},
		set ${field.name}(setterFn) {
			// Array setter via indexed helper
		},`);
				} else {
					memoryAccessors.push(`
		get ${field.name}() {
			return this._view ? this._view.${acc.get}(${field.offset}${endianArg}) : 0;
		},
		set ${field.name}(val) {
			if (this._view) this._view.${acc.set}(${field.offset}, val${endianArg});
		},`);
				}
			}

			// 2. Synthesize all 9 canonical VSRP-001 methods
			/** @type {Record<string, string>} */
			const methodBodies = {};
			for (const m of CANONICAL_LIFECYCLE_METHODS) {
				methodBodies[ m ] = '// no-op default stub';
			}

			// Integrate user handlers
			for (const [ mName, h ] of ast.handlers.entries()) {
				methodBodies[ mName ] = h.body || '// no-op';
			}

			// 3. Assemble complete VSRP-001 Cartridge code
			const isCjs = format === 'CJS';
			const wrapperOpen = isCjs
				? `'use strict';\n\n`
				: `((/** @type {Record<string, any>} */ global) => {\n\t'use strict';\n\n`;
			const wrapperClose = isCjs
				? `\nmodule.exports = Cartridge;\n`
				: `\n\tglobal.${cartridgeName} = Cartridge;\n\tif (typeof module !== 'undefined' && module.exports) module.exports = Cartridge;\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`;

			return `/**
 * VSRP-001 CARTRIDGE: ${cartridgeName}
 * Compiled via STCP-001 / GUCA Emitter v${COMPILER_VERSION}
 * Authority: Tier 2 Simulation Tenant | Zero-Dependency Module
 */
${wrapperOpen}\t/** @type {ArrayBuffer|null} */
	let _rawBuffer = null;
	/** @type {DataView|null} */
	let _dataView = null;

	const state = {
${ast.state.map(s => `\t\t${s.name}: ${s.defaultValue},`).join('\n')}
	};

	const memory = {
		get _view() { return _dataView; },
${memoryAccessors.join('\n')}
	};

	const Cartridge = Object.freeze({
		protocol: 'VSRP-001',
		name: '${cartridgeName}',
		version: '${ast.version}',
		author: '${ast.author}',
		tier: ${ast.tier || 2},
		capabilities: Object.freeze(${JSON.stringify(ast.capabilities)}),
		state,
		memory,

		configure(ctx) {
			if (ctx && ctx.requestLinearMemory) {
				_rawBuffer = ctx.requestLinearMemory(${ast.memoryLayout.totalBytes});
				_dataView = new DataView(_rawBuffer);
			} else if (!_rawBuffer) {
				_rawBuffer = new ArrayBuffer(${Math.max(64, ast.memoryLayout.totalBytes)});
				_dataView = new DataView(_rawBuffer);
			}
			${methodBodies.configure}
		},

		boot(canvas) {
			${methodBodies.boot}
		},

		activate() {
			${methodBodies.activate}
		},

		update(temporalTick, input) {
			const deltaEnvelope = { protocol: 'VSRP-001', updates: [] };
			${methodBodies.update}
			return deltaEnvelope;
		},

		render(ctx) {
			${methodBodies.render}
		},

		suspend() {
			${methodBodies.suspend}
		},

		serialize() {
			if (!_rawBuffer) return new Uint8Array(0);
			${methodBodies.serialize !== '// no-op default stub' ? methodBodies.serialize : 'return new Uint8Array(_rawBuffer.slice(0));'}
		},

		deserialize(buffer) {
			if (!buffer) return;
			${methodBodies.deserialize !== '// no-op default stub' ? methodBodies.deserialize : 'const src = new Uint8Array(buffer); if (_rawBuffer) new Uint8Array(_rawBuffer).set(src.subarray(0, _rawBuffer.byteLength));'}
		},

		destroy() {
			${methodBodies.destroy}
			_rawBuffer = null;
			_dataView = null;
		},

		/* 64-BYTE PEVM CODEX PROVENANCE EMBEDDING */
		_pevmProvenance: Object.freeze({
			magic: 0x5053594E,
			schemaVersion: '${ast.version}',
			compiler: 'STCP-GUCA-v${COMPILER_VERSION}',
			compiledAt: ${Date.now()},
		})
	});
${wrapperClose}`;
		}
	}

	//#endregion [SEC-04]

	//#region [SEC-05] Master Transduction Facade & Universal Exports (SynarcheCompiler)

	/**
	 * Master STCP Compiler Facade.
	 */
	const SynarcheCompiler = {
		VERSION: COMPILER_VERSION,
		ERRORS,

		/**
		 * Architectural: Pure lexical facade. Tokenizes input source stream.
		 * @param {string} source - Input character stream
		 * @param {LexerOptions} [options] - Optional lexical scanner configuration
		 * @returns {Token[]} Sequenced stream of typed tokens
		 */
		tokenize(source, options) {
			return SynarcheLexer.tokenize(source, options);
		},

		/**
		 * Architectural: State-mutating parser facade. Parses token stream or source text into AST.
		 * @param {Token[]|string} input - Sequenced stream of lexed tokens or raw source text
		 * @param {ParserOptions} [options] - Parser configuration and optional source text
		 * @returns {{ ast: CartridgeAST, errors: string[] }} Generated AST and collected errors
		 */
		parse(input, options = {}) {
			const tokens = typeof input === 'string' ? this.tokenize(input) : input;
			const source = typeof input === 'string' ? input : options.source;
			const parser = new SynarcheParser(tokens, { ...options, source });
			return parser.parse();
		},

		/**
		 * Architectural: Pure linter facade. Runs SLOPPY mode parser and returns IDE diagnostic records.
		 * @param {string} source - Input character stream
		 * @returns {Array<{ line: number, col: number, rule: string, message: string, severity: 'err'|'warn' }>}
		 */
		lint(source) {
			const { errors } = this.parse(source, { mode: 'SLOPPY' });
			return errors.map(err => {
				const lineMatch = err.match(/Line\s+(\d+),\s*Col\s+(\d+)/i);
				const ruleMatch = err.match(/(ERR_0x[0-9A-Fa-f]+)/);
				const line = lineMatch ? Number.parseInt(lineMatch[ 1 ], 10) : 1;
				const col = lineMatch ? Number.parseInt(lineMatch[ 2 ], 10) : 1;
				const rule = ruleMatch ? ruleMatch[ 1 ] : 'STCP/ERR';
				return {
					line,
					col,
					rule,
					message: err,
					severity: 'err'
				};
			});
		},

		/**
		 * Architectural: Pure code emitter facade. Transpiles AST into cartridge code.
		 * @param {CartridgeAST} ast - Validated cartridge AST
		 * @param {EmitterOptions} [options] - Code emission options
		 * @returns {string} Executable JavaScript cartridge source
		 */
		emit(ast, options) {
			return GUCAEmitter.emit(ast, options);
		},

		/**
		 * Architectural: Pure end-to-end compilation pipeline. Tokenizes, parses, validates, and emits cartridge code.
		 * @param {string} source - Complete .phx or .syn DSL source text
		 * @param {CompileOptions} [options] - End-to-end compilation configuration options
		 * @returns {CompileResult} Complete compilation result containing code, AST, capabilities, and errors
		 */
		compile(source, options = {}) {
			const tokens = this.tokenize(source);
			const { ast, errors } = this.parse(tokens, { mode: options.mode || 'STRICT', source });

			if (errors.length > 0 && options.mode !== 'SLOPPY') {
				return {
					ok: false,
					errors,
					capabilities: [],
					memoryBytesRequired: 0,
				};
			}

			const code = this.emit(ast, { format: options.format || 'IIFE' });
			return {
				ok: true,
				code,
				ast,
				capabilities: ast.capabilities || [],
				errors,
				memoryBytesRequired: ast.memoryLayout?.totalBytes || 0,
			};
		}
	};

	global.SynarcheCompiler = SynarcheCompiler;
	global.SynarcheLexer = SynarcheLexer;
	global.SynarcheParser = SynarcheParser;
	global.GUCAEmitter = GUCAEmitter;

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			SynarcheCompiler,
			SynarcheLexer,
			SynarcheParser,
			GUCAEmitter,
			ERRORS,
		};
	}

	//#endregion [SEC-05]
})(typeof globalThis !== 'undefined' ? globalThis : this);
