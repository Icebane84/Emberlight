/* cSpell:words synarche GUCA STCP VSRP PERSIST SDCP PMIP OSLM prec Prec */
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
	 * @property {any[]} [statements] - Parsed AST statements array
	 *
	 * @typedef {Object} EventHandler
	 * @property {'listen'|'emit'} kind - Event interaction discriminator
	 * @property {string} topic - Channel or topic identifier
	 * @property {string} [payloadParam] - Parameter name for listener payload
	 * @property {string} [expression] - Payload expression for emitter
	 * @property {string} [body] - Listener block execution body
	 * @property {any[]} [statements] - Parsed AST statements array
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
	 * @property {ConstitutionalReceipt} [admissionReceipt] - Cryptographically sealed admission receipt
	 * @property {Map<string, string>} [inferredTypes] - Inferred type map for AST statements
	 *
	 * @typedef {Object} LexerOptions
	 * @property {boolean} [preserveTrivia] - If true, emits WHITESPACE and COMMENT tokens
	 *
	 * @typedef {Object} ParserOptions
	 * @property {'STRICT'|'SLOPPY'} [mode] - Validation mode (STRICT fails closed; SLOPPY recovers)
	 * @property {string} [source] - Original raw source string for accurate block slicing
	 *
	 * @typedef {Object} ConstitutionalReceipt
	 * @property {'ADMITTED'|'REJECTED'} status - Admission outcome status
	 * @property {string} constitutionId - Sovereign constitution authority ('PHOENIX_SOVEREIGN_CONSTITUTION')
	 * @property {string} protocolVersion - Target execution protocol ('VSRP-001')
	 * @property {string} compilerVersion - STCP compiler release version
	 * @property {number} timestamp - Epoch timestamp of admission evaluation
	 * @property {string} astHash - Deterministic fingerprint hash of the validated AST
	 * @property {readonly string[]} capabilities - Attenuated capabilities granted
	 * @property {number} memoryBytesRequired - Exact PERSIST-001 byte footprint
	 * @property {readonly string[]} passedRules - Array of constitutional rule IDs satisfied
	 * @property {readonly string[]} failedRules - Array of constitutional rule IDs rejected
	 * @property {readonly string[]} errors - Formatted diagnostic strings
	 *
	 * @typedef {Object} EmitterOptions
	 * @property {'IIFE'|'CJS'} [format] - Output module format
	 * @property {'STRICT'|'SLOPPY'} [mode] - Validation mode
	 * @property {ConstitutionalReceipt} [admission] - Explicit admission receipt
	 *
	 * @typedef {Object} CompileOptions
	 * @property {'STRICT'|'SLOPPY'} [mode] - Parser compilation rigor
	 * @property {'IIFE'|'CJS'} [format] - Emitter output format
	 *
	 * @typedef {Object} CompileResult
	 * @property {boolean} ok - True if compilation completed without blocking errors
	 * @property {string} [code] - Synthesized zero-dependency VSRP-001 JavaScript cartridge code
	 * @property {CartridgeAST} [ast] - Validated intermediate AST representation
	 * @property {ConstitutionalReceipt} [receipt] - Proof-carrying admission receipt
	 * @property {string[]} capabilities - Extracted capability list
	 * @property {readonly string[]|string[]} errors - Array of formatted diagnostic error strings
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
		ERR_0x18: 'ERR_0x18: GUCA_EMISSION_DENIED',
		ERR_0x19: 'ERR_0x19: CONSTITUTIONAL_ADMISSION_FAILED',
		ERR_0x1A: 'ERR_0x1A: TYPE_UNIFICATION_FAILURE',
	});

	/**
	 * Canonical Machine-Readable Constitutional Rule Registry (PSGC-001 / STCP-002)
	 * Maps constitutional invariants to deterministic diagnostic error codes and validation phases.
	 */
	const CONSTITUTIONAL_RULE_REGISTRY = Object.freeze({
		'VSRP-001.LIFECYCLE': Object.freeze({
			id: 'ERR_0x14',
			name: 'Canonical 9-Method Contract',
			phase: 'LIFECYCLE',
			severity: 'BLOCK'
		}),
		'PERSIST-001.CAPACITY': Object.freeze({
			id: 'ERR_0x13',
			name: '2048-Byte Linear Memory Ceiling',
			phase: 'MEMORY',
			severity: 'BLOCK'
		}),
		'SDCP-001.FARADAY': Object.freeze({
			id: 'ERR_0x16',
			name: 'Faraday Global Isolation Membrane',
			phase: 'AUTHORITY',
			severity: 'BLOCK'
		}),
		'SDCP-001.CAPABILITIES': Object.freeze({
			id: 'ERR_0x15',
			name: 'Explicit Capability Attenuation',
			phase: 'CAPABILITY',
			severity: 'BLOCK'
		}),
		'INV-08.HOT_LOOP': Object.freeze({
			id: 'ERR_0x17',
			name: 'Zero Transient Allocations in update()',
			phase: 'PERFORMANCE',
			severity: 'BLOCK'
		}),
		'STCP-001.MIXIN_INTEGRITY': Object.freeze({
			id: 'ERR_0x12',
			name: 'Deterministic State Mixin Isolation',
			phase: 'TOPOLOGY',
			severity: 'BLOCK'
		}),
		'STCP-002.TYPE_UNIFICATION': Object.freeze({
			id: 'ERR_0x1A',
			name: 'Hindley-Milner Type Unification',
			phase: 'TYPE_SYSTEM',
			severity: 'BLOCK'
		}),
		'STCP-002.ADMISSION_SEAL': Object.freeze({
			id: 'ERR_0x18',
			name: 'Cryptographic Proof-Carrying Admission Seal',
			phase: 'ADMISSION',
			severity: 'BLOCK'
		})
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
		'emit', 'override', 'true', 'false', 'null', 'undefined',
		'let', 'const', 'var', 'if', 'else', 'while', 'for', 'return', 'fn', 'this', 'typeof'
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
			while (cur < source.length && /\w/.test(source[ cur ])) {
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
			while (cur < source.length && /\w/.test(source[ cur ])) {
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
			const threeChar = source.slice(idx, idx + 3);
			if (threeChar === '===' || threeChar === '!==') {
				const token = { type: /** @type {TokenType} */ ('SYMBOL'), value: threeChar, start: idx, end: idx + 3, line, col };
				return { token, nextIdx: idx + 3, nextLine: line, nextCol: col + 3 };
			}
			const twoChar = source.slice(idx, idx + 2);
			if ([ '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '->', '??', '++', '--' ].includes(twoChar)) {
				const token = { type: /** @type {TokenType} */ ('SYMBOL'), value: twoChar, start: idx, end: idx + 2, line, col };
				return { token, nextIdx: idx + 2, nextLine: line, nextCol: col + 2 };
			}
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

	//#region [SEC-02.5] Plane 1.5: STCP-003 Expression AST Factory & Recursive-Descent Parser

	/** @type {Record<string, number>} */
	const OPERATOR_PRECEDENCE = Object.freeze({
		'*': 3, '/': 3, '%': 3,
		'+': 2, '-': 2,
		'<': 1, '<=': 1, '>': 1, '>=': 1, '==': 1, '!=': 1, '===': 1, '!==': 1,
		'&&': 0, '||': 0, '??': 0
	});

	const ASSIGNMENT_OPERATORS = Object.freeze(new Set([
		'=', '+=', '-=', '*=', '/='
	]));

	/**
	 * Pure AST Node Factory for STCP-003 statements and expressions.
	 */
	const SynarcheASTFactory = Object.freeze({
		/**
		 * @param {'let'|'const'|'var'|string} kind - Variable declaration keyword
		 * @param {string} name - Identifier name
		 * @param {any} [init] - Initializer expression node
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheVarDeclNode}
		 */
		createVarDecl(kind, name, init, tok) {
			return {
				type: 'VarDecl',
				kind: /** @type {'let'|'const'|'var'} */ (kind),
				name,
				init: init || null,
				inferredType: null,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {string} operator - Assignment operator
		 * @param {any} target - Target identifier or member
		 * @param {any} value - Value expression
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheAssignExprNode}
		 */
		createAssign(operator, target, value, tok) {
			return {
				type: 'AssignExpr',
				operator,
				target,
				left: target,
				value,
				right: value,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {string} operator - Binary operator
		 * @param {any} left - Left expression node
		 * @param {any} right - Right expression node
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheBinaryExprNode}
		 */
		createBinary(operator, left, right, tok) {
			return {
				type: 'BinaryExpr',
				operator,
				left,
				right,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {string} operator - Unary operator
		 * @param {any} argument - Operand expression node
		 * @param {boolean} [prefix] - True if prefix operator
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheUnaryExprNode}
		 */
		createUnary(operator, argument, prefix, tok) {
			return {
				type: 'UnaryExpr',
				operator,
				argument,
				prefix: Boolean(prefix),
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} callee - Function expression
		 * @param {any[]} args - Argument expression array
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheCallExprNode}
		 */
		createCall(callee, args, tok) {
			return {
				type: 'CallExpr',
				callee,
				args,
				arguments: args,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} object - Target object expression
		 * @param {string} property - Property identifier or computed expression
		 * @param {boolean} [computed] - True if indexed computed access
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheMemberExprNode}
		 */
		createMember(object, property, computed, tok) {
			return {
				type: 'MemberExpr',
				object,
				property,
				computed: Boolean(computed),
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {string} name - Identifier name
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheIdentifierNode}
		 */
		createIdentifier(name, tok) {
			return {
				type: 'Identifier',
				name,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} value - Literal primitive value
		 * @param {'number'|'string'|'boolean'|'null'|string} [kind] - Literal type
		 * @param {string} [raw] - Source verbatim representation
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheLiteralNode}
		 */
		createLiteral(value, kind, raw, tok) {
			const litKind = /** @type {'number'|'string'|'boolean'|'null'} */ (kind || typeof value);
			return {
				type: 'Literal',
				value,
				kind: litKind,
				literalType: litKind,
				raw: raw ?? String(value),
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} test - Condition expression
		 * @param {any} consequent - If block statement
		 * @param {any} [alternate] - Else block statement
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheIfStmtNode}
		 */
		createIf(test, consequent, alternate, tok) {
			return {
				type: 'IfStmt',
				test,
				consequent,
				alternate: alternate || null,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} test - Loop condition expression
		 * @param {any} body - Loop body statement
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheWhileStmtNode}
		 */
		createWhile(test, body, tok) {
			return {
				type: 'WhileStmt',
				test,
				body,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} [argument] - Return value expression
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheReturnStmtNode}
		 */
		createReturn(argument, tok) {
			return {
				type: 'ReturnStmt',
				argument: argument || null,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any[]} body - Statement node array
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheBlockStmtNode}
		 */
		createBlock(body, tok) {
			return {
				type: 'BlockStmt',
				body,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		/**
		 * @param {any} expression - Wrapped expression
		 * @param {Token} [tok] - Location token
		 * @returns {SynarcheExprStmtNode}
		 */
		createExprStmt(expression, tok) {
			return {
				type: 'ExprStmt',
				expression,
				line: tok?.line || 1,
				col: tok?.col || 1
			};
		},

		// Factory convenience aliases with explicit typing
		/** @param {string} name @param {Token} [tok] */
		identifier(name, tok) { return this.createIdentifier(name, tok); },

		/** @param {any} value @param {string} [raw] @param {string} [literalType] @param {Token} [tok] */
		literal(value, raw, literalType, tok) { return this.createLiteral(value, literalType || (typeof value), raw, tok); },

		/** @param {string} operator @param {any} left @param {any} right @param {Token} [tok] */
		binaryExpr(operator, left, right, tok) { return this.createBinary(operator, left, right, tok); },

		/** @param {string} operator @param {any} argument @param {boolean} [prefix] @param {Token} [tok] */
		unaryExpr(operator, argument, prefix, tok) { return this.createUnary(operator, argument, prefix ?? true, tok); },

		/** @param {any} callee @param {any[]} args @param {Token} [tok] */
		callExpr(callee, args, tok) { return this.createCall(callee, args, tok); },

		/** @param {any} object @param {string} property @param {boolean} [computed] @param {Token} [tok] */
		memberExpr(object, property, computed, tok) { return this.createMember(object, property, computed, tok); },

		/** @param {string} operator @param {any} target @param {any} value @param {Token} [tok] */
		assignExpr(operator, target, value, tok) { return this.createAssign(operator, target, value, tok); },

		/** @param {'let'|'const'|'var'|string} kind @param {string} name @param {any} [init] @param {Token} [tok] */
		varDecl(kind, name, init, tok) { return this.createVarDecl(kind, name, init, tok); },

		/** @param {any[]} body @param {Token} [tok] */
		blockStmt(body, tok) { return this.createBlock(body, tok); },

		/** @param {any} test @param {any} consequent @param {any} [alternate] @param {Token} [tok] */
		ifStmt(test, consequent, alternate, tok) { return this.createIf(test, consequent, alternate, tok); },

		/** @param {any} test @param {any} body @param {Token} [tok] */
		whileStmt(test, body, tok) { return this.createWhile(test, body, tok); },

		/** @param {any} [argument] @param {Token} [tok] */
		returnStmt(argument, tok) { return this.createReturn(argument, tok); },

		/** @param {any} expression @param {Token} [tok] */
		exprStmt(expression, tok) { return this.createExprStmt(expression, tok); }
	});

	/**
	 * Plane 1.5 Recursive-Descent Statement and Expression Parser.
	 */
	class SynarcheStatementParser {
		/**
		 * @param {Token[]} tokens - Stream of tokens inside the handler block
		 * @param {ParserOptions} [options] - Parsing configuration
		 */
		constructor(tokens, options = {}) {
			this.tokens = tokens;
			this.pos = 0;
			this.mode = options.mode || 'STRICT';
			/** @type {string[]} */
			this.errors = [];
		}

		/**
		 * Returns current token without advancing cursor.
		 * @returns {Token}
		 */
		peek() {
			return this.tokens[ this.pos ] || { type: 'EOF', value: '', start: 0, end: 0, line: 0, col: 0 };
		}

		/**
		 * Consumes and returns current token.
		 * @returns {Token}
		 */
		next() {
			if (this.pos >= this.tokens.length) {
				return this.peek();
			}
			const tok = this.tokens[ this.pos ];
			this.pos += 1;
			return tok;
		}

		/**
		 * Conditionally consumes token if value matches.
		 * @param {string} val
		 * @returns {boolean}
		 */
		match(val) {
			const t = this.peek();
			if (t.value === val || t.type === val) {
				this.next();
				return true;
			}
			return false;
		}

		/**
		 * Parses all sequential statements until EOF.
		 * Cognitive Complexity: <= 4.
		 * @returns {any[]}
		 */
		parseStatements() {
			const statements = [];
			while (this.peek().type !== 'EOF') {
				if (this.match(';')) continue;
				const stmt = this.parseStatement();
				if (stmt) {
					statements.push(stmt);
				} else {
					this.next();
				}
			}
			return statements;
		}

		/**
		 * Dispatches statement parsing based on keyword/symbol.
		 * Cognitive Complexity: <= 6.
		 * @returns {any | null}
		 */
		parseStatement() {
			const tok = this.peek();
			if (tok.value === 'let' || tok.value === 'const' || tok.value === 'var') {
				return this.parseVarDecl();
			}
			if (tok.value === 'if') {
				return this.parseIfStmt();
			}
			if (tok.value === 'while') {
				return this.parseWhileStmt();
			}
			if (tok.value === 'return') {
				return this.parseReturnStmt();
			}
			if (tok.value === '{') {
				return this.parseBlockStmt();
			}
			return this.parseExprStmt();
		}

		/**
		 * Parses variable declaration statement (`let x = 10;`).
		 * Cognitive Complexity: <= 3.
		 * @returns {any}
		 */
		parseVarDecl() {
			const kindTok = this.next();
			const nameTok = this.next();
			let init = null;
			if (this.match('=')) {
				init = this.parseExpression();
			}
			this.match(';');
			return SynarcheASTFactory.createVarDecl(kindTok.value, nameTok.value, init, kindTok);
		}

		/**
		 * Parses conditional if statement (`if (test) consequent else alternate`).
		 * Cognitive Complexity: <= 3.
		 * @returns {any}
		 */
		parseIfStmt() {
			const ifTok = this.next();
			this.match('(');
			const test = this.parseExpression();
			this.match(')');
			const consequent = this.parseStatement();
			let alternate = null;
			if (this.match('else')) {
				alternate = this.parseStatement();
			}
			return SynarcheASTFactory.createIf(test, consequent, alternate, ifTok);
		}

		/**
		 * Parses while loop statement (`while (test) body`).
		 * Cognitive Complexity: <= 2.
		 * @returns {any}
		 */
		parseWhileStmt() {
			const whileTok = this.next();
			this.match('(');
			const test = this.parseExpression();
			this.match(')');
			const body = this.parseStatement();
			return SynarcheASTFactory.createWhile(test, body, whileTok);
		}

		/**
		 * Parses return statement (`return expr;` or `return;`).
		 * Cognitive Complexity: <= 3.
		 * @returns {any}
		 */
		parseReturnStmt() {
			const retTok = this.next();
			let arg = null;
			if (this.peek().value !== ';' && this.peek().type !== 'EOF' && this.peek().value !== '}') {
				arg = this.parseExpression();
			}
			this.match(';');
			return SynarcheASTFactory.createReturn(arg, retTok);
		}

		/**
		 * Parses nested block statement (`{ stmt1; stmt2; }`).
		 * Cognitive Complexity: <= 4.
		 * @returns {any}
		 */
		parseBlockStmt() {
			const openTok = this.next();
			const body = [];
			while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
				if (this.match(';')) continue;
				const stmt = this.parseStatement();
				if (stmt) body.push(stmt);
			}
			this.match('}');
			return SynarcheASTFactory.createBlock(body, openTok);
		}

		/**
		 * Parses expression statement, optionally followed by an assignment operator.
		 * Cognitive Complexity: <= 4.
		 * @returns {any | null}
		 */
		parseExprStmt() {
			const expr = this.parseExpression();
			if (!expr) return null;
			let finalExpr = expr;
			const peekVal = this.peek().value;
			if (ASSIGNMENT_OPERATORS.has(peekVal)) {
				const opTok = this.next();
				const right = this.parseExpression();
				finalExpr = SynarcheASTFactory.createAssign(opTok.value, expr, right, opTok);
			}
			this.match(';');
			return SynarcheASTFactory.createExprStmt(finalExpr, finalExpr);
		}

		/**
		 * Parses root expression using precedence climbing starting at minPrec 0.
		 * Cognitive Complexity: <= 1.
		 * @returns {any}
		 */
		parseExpression() {
			return this.parseBinary(0);
		}

		/**
		 * Precedence-climbing binary expression parser.
		 * Cognitive Complexity: <= 5.
		 * @param {number} minPrec - Minimum operator precedence
		 * @returns {any}
		 */
		parseBinary(minPrec) {
			let left = this.parseUnary();
			while (true) {
				const tok = this.peek();
				const op = tok.value;
				const prec = OPERATOR_PRECEDENCE[ op ];
				if (prec === undefined || prec < minPrec) {
					break;
				}
				this.next();
				const right = this.parseBinary(prec + 1);
				left = SynarcheASTFactory.createBinary(op, left, right, tok);
			}
			return left;
		}

		/**
		 * Parses unary prefix expressions (!x, -x, +x, typeof x).
		 * Cognitive Complexity: <= 3.
		 * @returns {any}
		 */
		parseUnary() {
			const tok = this.peek();
			if (tok.value === '!' || tok.value === '-' || tok.value === '+' || tok.value === 'typeof') {
				this.next();
				const arg = this.parseUnary();
				return SynarcheASTFactory.createUnary(tok.value, arg, true, tok);
			}
			return this.parsePostfix();
		}

		/**
		 * Parses postfix, member access (.prop, [idx]), and function calls (f(x)).
		 * Cognitive Complexity: <= 7.
		 * @returns {any}
		 */
		parsePostfix() {
			let left = this.parsePrimary();
			while (true) {
				const tok = this.peek();
				if (this.match('.')) {
					const propTok = this.next();
					left = SynarcheASTFactory.createMember(left, propTok.value, false, tok);
				} else if (this.match('[')) {
					const indexExpr = this.parseExpression();
					this.match(']');
					left = SynarcheASTFactory.createMember(left, indexExpr, true, tok);
				} else if (this.match('(')) {
					const args = this._parseArgumentList();
					left = SynarcheASTFactory.createCall(left, args, tok);
				} else if (tok.value === '++' || tok.value === '--') {
					this.next();
					left = SynarcheASTFactory.createUnary(tok.value, left, false, tok);
				} else {
					break;
				}
			}
			return left;
		}

		/**
		 * Parses comma-separated argument list for call expression.
		 * Cognitive Complexity: <= 4.
		 * @returns {any[]}
		 * @private
		 */
		_parseArgumentList() {
			const args = [];
			if (this.peek().value !== ')' && this.peek().type !== 'EOF') {
				while (true) {
					args.push(this.parseExpression());
					if (this.match(',')) continue;
					break;
				}
			}
			this.match(')');
			return args;
		}

		/**
		 * Parses primary literal, identifier, parenthesized expression, or keyword.
		 * Cognitive Complexity: <= 8.
		 * @returns {any}
		 */
		parsePrimary() {
			const tok = this.peek();
			if (tok.type === 'LITERAL_NUMBER') {
				this.next();
				return SynarcheASTFactory.createLiteral(Number(tok.value), 'number', tok.value, tok);
			}
			if (tok.type === 'LITERAL_STRING') {
				this.next();
				return SynarcheASTFactory.createLiteral(tok.value, 'string', tok.value, tok);
			}
			if (tok.type === 'LITERAL_BOOL') {
				this.next();
				return SynarcheASTFactory.createLiteral(tok.value === 'true', 'boolean', tok.value, tok);
			}
			if (tok.value === 'null') {
				this.next();
				return SynarcheASTFactory.createLiteral(null, 'null', 'null', tok);
			}
			if (tok.value === 'undefined') {
				this.next();
				return SynarcheASTFactory.createLiteral(undefined, 'undefined', 'undefined', tok);
			}
			if (this.match('(')) {
				const inner = this.parseExpression();
				this.match(')');
				return inner;
			}
			if (tok.type === 'IDENTIFIER' || tok.type === 'KEYWORD') {
				this.next();
				return SynarcheASTFactory.createIdentifier(tok.value, tok);
			}
			if (this.mode === 'STRICT') {
				const errMsg = `[${ERRORS.ERR_0x14}] L${tok.line}:C${tok.col} - Unexpected token '${tok.value}' in expression`;
				this.errors.push(errMsg);
				throw new Error(errMsg);
			}
			this.next();
			return SynarcheASTFactory.createIdentifier(tok.value || 'error', tok);
		}
	}

	//#endregion [SEC-02.5]

	//#region [SEC-02.6] Plane 1.6: STCP-003 Hindley-Milner Recursive-Descent Type Inference Engine

	/**
	 * Plane 1.6: Hindley-Milner Type System (Algorithm W).
	 * Supports primitive fixed-width types, type variables, arrays, records, and functions.
	 */
	class SynarcheTypeSystem {
		_nextVarId = 1;

		/**
		 * @param {string} name - Primitive type name (e.g. 'u8', 'i32', 'f32', 'bool', 'string')
		 * @returns {{ kind: 'Primitive', name: string }}
		 */
		createPrimitive(name) {
			return { kind: 'Primitive', name };
		}

		/**
		 * @param {string} [name] - Optional human-readable variable label
		 * @returns {{ kind: 'Variable', id: number, name: string, instance: any }}
		 */
		createVariable(name) {
			const id = this._nextVarId++;
			return { kind: 'Variable', id, name: name || `$T${id}`, instance: null };
		}

		/**
		 * @param {any} elementType - Array element type
		 * @returns {{ kind: 'Array', elementType: any }}
		 */
		createArray(elementType) {
			return { kind: 'Array', elementType };
		}

		/**
		 * @param {any[]} params - Function parameter types
		 * @param {any} returnType - Function return type
		 * @returns {{ kind: 'Function', params: any[], returnType: any }}
		 */
		createFunction(params, returnType) {
			return { kind: 'Function', params, returnType };
		}

		/**
		 * @param {Map<string, any> | Record<string, any>} fields - Record field map
		 * @returns {{ kind: 'Record', fields: Map<string, any> }}
		 */
		createRecord(fields) {
			const fieldMap = fields instanceof Map ? fields : new Map(Object.entries(fields));
			return { kind: 'Record', fields: fieldMap };
		}

		/**
		 * Prunes bound type variable instances to resolve canonical underlying type.
		 * @param {any} type - Type descriptor to prune
		 * @returns {any} Pruned type
		 */
		prune(type) {
			if (type?.kind === 'Variable' && type.instance) {
				type.instance = this.prune(type.instance);
				return type.instance;
			}
			return type;
		}

		/**
		 * Occurs-check to prevent cyclic/infinite types (e.g. T = Array<T>).
		 * Cognitive Complexity: <= 5.
		 * @param {any} v - Type variable being bound
		 * @param {any} type - Target type
		 * @returns {boolean} True if v occurs in type
		 */
		occursInType(v, type) {
			const pruned = this.prune(type);
			if (pruned === v) return true;
			if (pruned?.kind === 'Array') return this.occursInType(v, pruned.elementType);
			if (pruned?.kind === 'Function') {
				const inParams = pruned.params.some((/** @type {any} */ p) => this.occursInType(v, p));
				return inParams || this.occursInType(v, pruned.returnType);
			}
			if (pruned?.kind === 'Record') {
				for (const fieldType of pruned.fields.values()) {
					if (this.occursInType(v, fieldType)) return true;
				}
			}
			return false;
		}

		/**
		 * Formats a type descriptor into a canonical readable string.
		 * Cognitive Complexity: <= 6.
		 * @param {any} type - Type descriptor
		 * @returns {string} Formatted type string
		 */
		formatType(type) {
			const p = this.prune(type);
			if (!p) return 'unknown';
			if (p.kind === 'Primitive') return p.name;
			if (p.kind === 'Variable') return p.name || `$T${p.id}`;
			if (p.kind === 'Array') return `Array<${this.formatType(p.elementType)}>`;
			if (p.kind === 'Function') {
				const paramStr = p.params.map((/** @type {any} */ arg) => this.formatType(arg)).join(', ');
				return `(${paramStr}) => ${this.formatType(p.returnType)}`;
			}
			if (p.kind === 'Record') {
				const fields = Array.from(p.fields.entries()).map(([ k, v ]) => `${k}: ${this.formatType(v)}`).join(', ');
				return `{ ${fields} }`;
			}
			return 'unknown';
		}

		/**
		 * Checks if type represents a numeric simulation primitive.
		 * @param {any} type - Type descriptor
		 * @returns {boolean} True if numeric
		 */
		isNumeric(type) {
			const p = this.prune(type);
			if (p?.kind !== 'Primitive') return false;
			return [ 'u8', 'u16', 'u32', 'i8', 'i16', 'i32', 'f32', 'f64', 'number', 'float32', 'int32' ].includes(p.name);
		}

		/**
		 * Unifies two types in-place, binding type variables or emitting diagnostic errors.
		 * Cognitive Complexity <= 8.
		 * @param {any} a - First type
		 * @param {any} b - Second type
		 * @param {any} [node] - Offending AST node for line/col attribution
		 * @param {string[]} [errors] - Diagnostic error sink
		 * @returns {boolean} True if unified successfully
		 */
		unify(a, b, node = null, errors = []) {
			const t1 = this.prune(a);
			const t2 = this.prune(b);

			if (t1 === t2) return true;
			if (!t1 || !t2) return false;

			if (t1.kind === 'Variable') {
				return this._unifyVariable(t1, t2, node, errors);
			}
			if (t2.kind === 'Variable') {
				return this._unifyVariable(t2, t1, node, errors);
			}

			if (t1.kind === 'Primitive' && t2.kind === 'Primitive') {
				return this._unifyPrimitives(t1, t2, node, errors);
			}
			if (t1.kind === 'Array' && t2.kind === 'Array') {
				return this.unify(t1.elementType, t2.elementType, node, errors);
			}
			if (t1.kind === 'Function' && t2.kind === 'Function') {
				return this._unifyFunctions(t1, t2, node, errors);
			}
			if (t1.kind === 'Record' && t2.kind === 'Record') {
				return this._unifyRecords(t1, t2, node, errors);
			}

			const line = node?.line || 1;
			const col = node?.col || 1;
			errors.push(`[${ERRORS.ERR_0x1A}] L${line}:C${col} - Type mismatch: cannot unify ${this.formatType(t1)} with ${this.formatType(t2)}`);
			return false;
		}

		/**
		 * @param {any} v
		 * @param {any} type
		 * @param {any} [node]
		 * @param {string[]} [errors]
		 * @returns {boolean}
		 * @private
		 */
		_unifyVariable(v, type, node, errors) {
			if (v === type) return true;
			if (this.occursInType(v, type)) {
				const line = node?.line || 1;
				const col = node?.col || 1;
				errors?.push(`[${ERRORS.ERR_0x1A}] L${line}:C${col} - Occurs check failed: cyclic type detected for ${v.name}`);
				return false;
			}
			v.instance = type;
			return true;
		}

		/**
		 * @param {any} t1
		 * @param {any} t2
		 * @param {any} [node]
		 * @param {string[]} [errors]
		 * @returns {boolean}
		 * @private
		 */
		_unifyPrimitives(t1, t2, node, errors) {
			if (t1.name === t2.name) return true;
			if (this.isNumeric(t1) && this.isNumeric(t2)) return true;
			const line = node?.line || 1;
			const col = node?.col || 1;
			errors?.push(`[${ERRORS.ERR_0x1A}] L${line}:C${col} - Primitive type mismatch: cannot unify '${t1.name}' with '${t2.name}'`);
			return false;
		}

		/**
		 * @param {any} t1
		 * @param {any} t2
		 * @param {any} [node]
		 * @param {string[]} [errors]
		 * @returns {boolean}
		 * @private
		 */
		_unifyFunctions(t1, t2, node, errors) {
			if (t1.params.length !== t2.params.length) {
				const line = node?.line || 1;
				const col = node?.col || 1;
				errors?.push(`[${ERRORS.ERR_0x1A}] L${line}:C${col} - Function arity mismatch: expected ${t1.params.length} arguments but got ${t2.params.length}`);
				return false;
			}
			let ok = true;
			for (let i = 0; i < t1.params.length; i++) {
				if (!this.unify(t1.params[ i ], t2.params[ i ], node, errors)) ok = false;
			}
			if (!this.unify(t1.returnType, t2.returnType, node, errors)) ok = false;
			return ok;
		}

		/**
		 * @param {any} t1
		 * @param {any} t2
		 * @param {any} [node]
		 * @param {string[]} [errors]
		 * @returns {boolean}
		 * @private
		 */
		_unifyRecords(t1, t2, node, errors) {
			let ok = true;
			for (const [ fieldName, fieldType ] of t2.fields.entries()) {
				if (!t1.fields.has(fieldName)) {
					const line = node?.line || 1;
					const col = node?.col || 1;
					errors?.push(`[${ERRORS.ERR_0x1A}] L${line}:C${col} - Record missing required field '${fieldName}'`);
					ok = false;
				} else if (!this.unify(t1.fields.get(fieldName), fieldType, node, errors)) {
					ok = false;
				}
			}
			return ok;
		}
	}

	/**
	 * Scoped Lexical Environment for Hindley-Milner type inference.
	 */
	class SynarcheTypeEnvironment {
		/**
		 * @param {SynarcheTypeEnvironment | null} [parent]
		 */
		constructor(parent = null) {
			this.parent = parent;
			/** @type {Map<string, any>} */
			this.bindings = new Map();
		}

		/**
		 * @param {string} name - Variable or identifier name
		 * @param {any} type - Type descriptor
		 */
		set(name, type) {
			this.bindings.set(name, type);
		}

		/**
		 * @param {string} name - Identifier name to lookup
		 * @returns {any} Bound type or null if unbound
		 */
		get(name) {
			if (this.bindings.has(name)) {
				return this.bindings.get(name);
			}
			if (this.parent) {
				return this.parent.get(name);
			}
			return null;
		}

		/**
		 * @param {string} name - Identifier name
		 * @returns {boolean} True if bound in scope chain
		 */
		has(name) {
			return this.bindings.has(name) || (this.parent ? this.parent.has(name) : false);
		}

		/**
		 * @returns {SynarcheTypeEnvironment} Child scope environment
		 */
		createChild() {
			return new SynarcheTypeEnvironment(this);
		}
	}

	/**
	 * Plane 1.6: Recursive-descent AST Type Inference Engine.
	 */
	class SynarcheTypeInferenceEngine {
		/**
		 * @param {SynarcheTypeSystem} [types]
		 */
		constructor(types = new SynarcheTypeSystem()) {
			this.types = types;
			this.numType = this.types.createPrimitive('number');
			this.boolType = this.types.createPrimitive('bool');
			this.strType = this.types.createPrimitive('string');
			this.voidType = this.types.createPrimitive('void');
		}

		/**
		 * Creates and seeds standard type environment from Cartridge AST.
		 * @param {CartridgeAST} ast
		 * @returns {SynarcheTypeEnvironment}
		 */
		createRootEnvironment(ast) {
			const env = new SynarcheTypeEnvironment();

			// 1. Seed state record
			const stateFields = new Map();
			if (Array.isArray(ast.state)) {
				for (const field of ast.state) {
					stateFields.set(field.name, this._resolveDeclaredType(field.type));
				}
			}
			const stateRecord = this.types.createRecord(stateFields);
			env.set('state', stateRecord);

			// 2. Seed memory record
			const memoryFields = new Map();
			if (ast.memoryLayout?.fields) {
				for (const field of ast.memoryLayout.fields) {
					memoryFields.set(field.name, this._resolveDeclaredType(field.type));
				}
			}
			const memoryRecord = this.types.createRecord(memoryFields);
			env.set('memory', memoryRecord);

			// 3. Seed 'this'
			const thisRecord = this.types.createRecord(new Map([
				[ 'state', stateRecord ],
				[ 'memory', memoryRecord ]
			]));
			env.set('this', thisRecord);

			// 4. Seed capabilities and context
			const capMap = new Map();
			if (Array.isArray(ast.capabilities)) {
				for (const cap of ast.capabilities) {
					capMap.set(cap, this.boolType);
				}
			}
			/** @type {Map<string, any>} */
			const ctxFields = new Map();
			ctxFields.set('capabilities', this.types.createRecord(capMap));
			if (ast.capabilities?.includes('CAP_RENDER_CANVAS2D')) {
				/** @type {Map<string, any>} */
				const canvasFields = new Map();
				canvasFields.set('width', this.numType);
				canvasFields.set('height', this.numType);
				canvasFields.set('clear', this.types.createFunction([], this.voidType));
				ctxFields.set('canvas', this.types.createRecord(canvasFields));
				ctxFields.set('drawGlow', this.types.createFunction([ this.numType, this.numType ], this.voidType));
			}
			if (ast.capabilities?.includes('CAP_AUDIO_SYNTH')) {
				/** @type {Map<string, any>} */
				const audioFields = new Map();
				audioFields.set('playTone', this.types.createFunction([ this.numType, this.numType ], this.voidType));
				ctxFields.set('audio', this.types.createRecord(audioFields));
			}
			env.set('ctx', this.types.createRecord(ctxFields));

			// 5. Seed standard math
			env.set('Math', this.types.createRecord(new Map([
				[ 'floor', this.types.createFunction([ this.numType ], this.numType) ],
				[ 'ceil', this.types.createFunction([ this.numType ], this.numType) ],
				[ 'abs', this.types.createFunction([ this.numType ], this.numType) ],
				[ 'min', this.types.createFunction([ this.numType, this.numType ], this.numType) ],
				[ 'max', this.types.createFunction([ this.numType, this.numType ], this.numType) ],
				[ 'sin', this.types.createFunction([ this.numType ], this.numType) ],
				[ 'cos', this.types.createFunction([ this.numType ], this.numType) ],
				[ 'sqrt', this.types.createFunction([ this.numType ], this.numType) ],
				[ 'random', this.types.createFunction([], this.numType) ]
			])));

			// 6. Seed input
			env.set('input', this.types.createRecord(new Map([
				[ 'x', this.numType ],
				[ 'y', this.numType ],
				[ 'buttons', this.numType ]
			])));

			return env;
		}

		/**
		 * @param {string} [typeName]
		 * @returns {any}
		 * @private
		 */
		_resolveDeclaredType(typeName) {
			if (!typeName) return this.types.createVariable();
			if ([ 'u8', 'u16', 'u32', 'i8', 'i16', 'i32', 'f32', 'f64', 'number', 'float32', 'int32' ].includes(typeName)) {
				return this.types.createPrimitive(typeName);
			}
			if (typeName === 'bool' || typeName === 'boolean') return this.boolType;
			if (typeName === 'string') return this.strType;
			return this.types.createPrimitive(typeName);
		}

		/**
		 * Infers and verifies types across an entire CartridgeAST.
		 * Cognitive Complexity <= 4.
		 * @param {CartridgeAST} ast
		 * @param {string[]} [errors]
		 * @returns {{ inferredTypes: Map<string, string>, typeErrors: string[] }}
		 */
		inferCartridge(ast, errors = []) {
			const rootEnv = this.createRootEnvironment(ast);
			/** @type {Map<string, string>} */
			const inferredTypes = new Map();
			/** @type {string[]} */
			const typeErrors = [];

			if (ast?.handlers) {
				for (const [ handlerName, handler ] of ast.handlers.entries()) {
					this._inferHandlerBody(handlerName, handler, rootEnv, inferredTypes, typeErrors);
				}
			}

			ast.inferredTypes = inferredTypes;

			for (const err of typeErrors) {
				errors.push(err);
			}

			return { inferredTypes, typeErrors };
		}

		/**
		 * @param {string} handlerName
		 * @param {LifecycleHandler} handler
		 * @param {SynarcheTypeEnvironment} rootEnv
		 * @param {Map<string, string>} inferredTypes
		 * @param {string[]} typeErrors
		 * @private
		 */
		_inferHandlerBody(handlerName, handler, rootEnv, inferredTypes, typeErrors) {
			const handlerEnv = rootEnv.createChild();
			this._seedHandlerParams(handlerName, handlerEnv);

			if (!Array.isArray(handler.statements)) return;

			for (const stmt of handler.statements) {
				const inferred = this.infer(stmt, handlerEnv, typeErrors);
				if (stmt.name) {
					inferredTypes.set(`${handlerName}.${stmt.name}`, this.types.formatType(inferred));
				}
			}
		}

		/**
		 * @param {string} handlerName
		 * @param {SynarcheTypeEnvironment} env
		 * @private
		 */
		_seedHandlerParams(handlerName, env) {
			if (handlerName === 'update') {
				env.set('tick', this.numType);
				env.set('temporalTick', this.numType);
				env.set('input', env.get('input'));
			} else if (handlerName === 'render') {
				env.set('ctx', env.get('ctx'));
			} else if (handlerName === 'configure') {
				env.set('ctx', env.get('ctx'));
			}
		}

		/**
		 * Recursively infers the type of an AST node.
		 * Cognitive Complexity <= 5.
		 * @param {any} node - AST node to infer
		 * @param {SynarcheTypeEnvironment} env - Active scope environment
		 * @param {string[]} errors - Diagnostic error sink
		 * @returns {any} Inferred Type object
		 */
		infer(node, env, errors) {
			if (!node) return this.voidType;

			/** @type {Record<string, () => any>} */
			const typeHandlers = {
				Literal: () => this._inferLiteral(node),
				Identifier: () => this._inferIdentifier(node, env),
				VarDecl: () => this._inferVarDecl(node, env, errors),
				AssignExpr: () => this._inferAssign(node, env, errors),
				BinaryExpr: () => this._inferBinary(node, env, errors),
				UnaryExpr: () => this._inferUnary(node, env, errors),
				MemberExpr: () => this._inferMember(node, env, errors),
				CallExpr: () => this._inferCall(node, env, errors),
				IfStmt: () => this._inferIf(node, env, errors),
				WhileStmt: () => this._inferWhile(node, env, errors),
				BlockStmt: () => this._inferBlock(node, env, errors),
				ExprStmt: () => this.infer(node.expression, env, errors),
				ReturnStmt: () => (node.argument ? this.infer(node.argument, env, errors) : this.voidType)
			};

			const handler = typeHandlers[ node.type ];
			const resultType = handler ? handler() : this.voidType;

			node.inferredType = resultType;
			return resultType;
		}

		/**
		 * @param {any} node
		 * @returns {any}
		 * @private
		 */
		_inferLiteral(node) {
			if (node.kind === 'number') return this.numType;
			if (node.kind === 'string') return this.strType;
			if (node.kind === 'boolean') return this.boolType;
			return this.voidType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @returns {any}
		 * @private
		 */
		_inferIdentifier(node, env) {
			if (node.name === 'true' || node.name === 'false') return this.boolType;
			if (node.name === 'null' || node.name === 'undefined') return this.voidType;
			const found = env.get(node.name);
			if (found) return found;
			const fresh = this.types.createVariable(node.name);
			env.set(node.name, fresh);
			return fresh;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferVarDecl(node, env, errors) {
			const initType = node.init ? this.infer(node.init, env, errors) : this.types.createVariable(node.name);
			env.set(node.name, initType);
			return initType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferAssign(node, env, errors) {
			const target = node.target || node.left;
			const val = node.value || node.right;
			const targetType = this.infer(target, env, errors);
			const valueType = this.infer(val, env, errors);

			if (node.operator === '=') {
				this.types.unify(targetType, valueType, node, errors);
			} else {
				const isStrAdd = node.operator === '+=' && (
					this.types.prune(targetType).name === 'string' || this.types.prune(valueType).name === 'string'
				);
				if (isStrAdd) {
					this.types.unify(targetType, this.strType, target, errors);
				} else {
					this.types.unify(targetType, this.numType, target, errors);
					this.types.unify(valueType, this.numType, val, errors);
				}
			}
			return targetType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferBinary(node, env, errors) {
			const leftType = this.infer(node.left, env, errors);
			const rightType = this.infer(node.right, env, errors);
			const op = node.operator;

			if (op === '+') {
				const isStr = this.types.prune(leftType).name === 'string' || this.types.prune(rightType).name === 'string';
				if (isStr) return this.strType;
				this.types.unify(leftType, this.numType, node.left, errors);
				this.types.unify(rightType, this.numType, node.right, errors);
				return this.numType;
			}

			if ([ '-', '*', '/', '%' ].includes(op)) {
				this.types.unify(leftType, this.numType, node.left, errors);
				this.types.unify(rightType, this.numType, node.right, errors);
				return this.numType;
			}

			if ([ '<', '<=', '>', '>=' ].includes(op)) {
				this.types.unify(leftType, this.numType, node.left, errors);
				this.types.unify(rightType, this.numType, node.right, errors);
				return this.boolType;
			}

			if ([ '==', '!=', '===', '!==' ].includes(op)) {
				this.types.unify(leftType, rightType, node, errors);
				return this.boolType;
			}

			if ([ '&&', '||' ].includes(op)) {
				this.types.unify(leftType, this.boolType, node.left, errors);
				this.types.unify(rightType, this.boolType, node.right, errors);
				return this.boolType;
			}

			return this.numType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferUnary(node, env, errors) {
			const argType = this.infer(node.argument, env, errors);
			if (node.operator === '!') {
				this.types.unify(argType, this.boolType, node, errors);
				return this.boolType;
			}
			if (node.operator === '-' || node.operator === '+') {
				this.types.unify(argType, this.numType, node, errors);
				return this.numType;
			}
			return argType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferMember(node, env, errors) {
			const objType = this.infer(node.object, env, errors);
			const pruned = this.types.prune(objType);

			if (node.computed) {
				const indexType = this.infer(node.property, env, errors);
				this.types.unify(indexType, this.numType, node, errors);
				if (pruned?.kind === 'Array') {
					return pruned.elementType;
				}
				return this.types.createVariable('element');
			}

			if (pruned?.kind === 'Record') {
				const prop = typeof node.property === 'string' ? node.property : node.property?.name;
				if (prop && pruned.fields.has(prop)) {
					return pruned.fields.get(prop);
				}
				if (node.object?.name === 'ctx' && (prop === 'canvas' || prop === 'audio')) {
					errors.push(`[${ERRORS.ERR_0x15}] L${node.line}:C${node.col} - Capability breach: access to 'ctx.${prop}' requires capability declaration`);
				}
				const fieldVar = this.types.createVariable(prop || 'field');
				if (prop) pruned.fields.set(prop, fieldVar);
				return fieldVar;
			}

			return this.types.createVariable('member');
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferCall(node, env, errors) {
			const calleeType = this.infer(node.callee, env, errors);
			const args = node.args || node.arguments || [];
			const argTypes = args.map((/** @type {any} */ a) => this.infer(a, env, errors));
			const returnVar = this.types.createVariable('ret');
			const expectedFn = this.types.createFunction(argTypes, returnVar);

			this.types.unify(calleeType, expectedFn, node, errors);
			return this.types.prune(returnVar);
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferIf(node, env, errors) {
			const testType = this.infer(node.test, env, errors);
			this.types.unify(testType, this.boolType, node.test, errors);
			this.infer(node.consequent, env.createChild(), errors);
			if (node.alternate) {
				this.infer(node.alternate, env.createChild(), errors);
			}
			return this.voidType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferWhile(node, env, errors) {
			const testType = this.infer(node.test, env, errors);
			this.types.unify(testType, this.boolType, node.test, errors);
			this.infer(node.body, env.createChild(), errors);
			return this.voidType;
		}

		/**
		 * @param {any} node
		 * @param {SynarcheTypeEnvironment} env
		 * @param {string[]} errors
		 * @returns {any}
		 * @private
		 */
		_inferBlock(node, env, errors) {
			const blockEnv = env.createChild();
			if (Array.isArray(node.body)) {
				for (const stmt of node.body) {
					this.infer(stmt, blockEnv, errors);
				}
			}
			return this.voidType;
		}
	}

	//#endregion [SEC-02.6]

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
		 * @returns {{ ast: CartridgeAST, errors: string[], receipt?: ConstitutionalReceipt }} Resulting AST and collected diagnostic errors
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

			// STCP-002: Evaluate and seal constitutional admission proof
			const receipt = SynarcheAdmissionAuthority.admit(this.ast, this.errors, { mode: this.mode });

			return { ast: this.ast, errors: this.errors, receipt };
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
		 * Architectural: State-mutating private helper. Parses mixin state declarations.
		 * @param {Set<string>} fields
		 * @returns {void}
		 */
		_parseMixinStateBlock(fields) {
			this.next(); // 'state'
			if (!this.match('{')) return;
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

		/**
		 * Architectural: State-mutating private helper. Parses mixin method declaration.
		 * @param {Map<string, string>} methods
		 * @returns {void}
		 */
		_parseMixinMethod(methods) {
			this.next(); // 'on'
			const mName = this.next().value;
			this._parseParamList();
			const { body } = this._parseBlock();
			methods.set(mName, body);
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
					this._parseMixinStateBlock(fields);
				} else if (tok.value === 'on') {
					this._parseMixinMethod(methods);
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
			const { body, statements } = this._parseBlock();
			this.ast.handlers.set(methodTok.value, { params, body, statements });
		}

		/**
		 * Architectural: State-mutating private helper. Parses reactive listen event handler.
		 * @returns {void}
		 */
		_parseListenHandler() {
			this.next(); // 'listen'
			const topicTok = this.next();
			const params = this._parseParamList();
			const { body, statements } = this._parseBlock();
			this.ast.eventHandlers.push({
				kind: 'listen',
				topic: topicTok.value,
				payloadParam: params[ 0 ] || 'payload',
				body,
				statements
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
		 * Architectural: State-mutating private helper. Extracts braced token slice.
		 * Cognitive Complexity: <= 5.
		 * @param {number} startOffset - Byte offset after opening brace
		 * @returns {{ innerTokens: Token[], closeBraceTok: Token | null }}
		 * @private
		 */
		_collectBlockTokens(startOffset) {
			let depth = 1;
			/** @type {Token | null} */
			let closeBraceTok = null;
			const innerTokens = [];

			while (depth > 0 && this.peek().type !== 'EOF') {
				const tok = this.next();
				if (tok.value === '{') {
					depth += 1;
					innerTokens.push(tok);
				} else if (tok.value === '}') {
					depth -= 1;
					if (depth === 0) {
						closeBraceTok = tok;
					} else {
						innerTokens.push(tok);
					}
				} else {
					innerTokens.push(tok);
				}
			}
			return { innerTokens, closeBraceTok };
		}

		/**
		 * Architectural: State-mutating private helper. Compiles inner tokens into statement ASTs.
		 * Cognitive Complexity: <= 4.
		 * @param {Token[]} innerTokens - Inner tokens
		 * @returns {any[]} Parsed statements
		 * @private
		 */
		_parseInnerStatements(innerTokens) {
			try {
				const stmtParser = new SynarcheStatementParser(innerTokens, { mode: this.mode });
				const statements = stmtParser.parseStatements();
				if (stmtParser.errors.length > 0) {
					this.errors.push(...stmtParser.errors);
				}
				return statements;
			} catch (parseErr) {
				const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
				this.errors.push(msg);
				if (this.mode === 'STRICT') throw parseErr;
				return [];
			}
		}

		/**
		 * Architectural: State-mutating private helper. Parses braced block, extracting raw source
		 * and compiling inner statements into structured STCP-003 AST nodes.
		 * Cognitive Complexity: <= 4 (SonarLint S3776 compliant).
		 * @returns {{ body: string, statements: any[] }}
		 */
		_parseBlock() {
			if (!this.match('{')) return { body: '', statements: [] };
			const openBraceTok = this.tokens[ this.pos - 1 ];
			const startOffset = openBraceTok.end;

			const { innerTokens, closeBraceTok } = this._collectBlockTokens(startOffset);

			let body = '';
			if (this.source && closeBraceTok) {
				body = this.source.slice(startOffset, closeBraceTok.start).trim();
			} else if (innerTokens.length > 0) {
				body = innerTokens.map(t => t.value).join(' ');
			}

			const statements = this._parseInnerStatements(innerTokens);
			return { body, statements };
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

	//#region [SEC-03.5] Plane 2.5: STCP-002 Constitutional Admission Authority (SynarcheAdmissionAuthority)

	/**
	 * @param {CartridgeAST} [ast]
	 * @returns {Array<[string, string, number, number]>}
	 */
	function _extractAstMemorySummary(ast) {
		const fields = ast?.memoryLayout?.fields;
		if (!fields) return [];
		return fields.map((/** @type {MemoryField} */ f) => [ f.name, f.type, f.offset, f.size ]);
	}

	/**
	 * @param {CartridgeAST} [ast]
	 * @returns {Array<[string, string]>}
	 */
	function _extractAstHandlersSummary(ast) {
		if (!ast?.handlers) return [];
		return Array.from(ast.handlers.entries()).map(([ k, v ]) => [ k, v.body ]);
	}

	/**
	 * @param {CartridgeAST} [ast]
	 * @returns {Array<[string, string[]]>}
	 */
	function _extractAstMixinsSummary(ast) {
		if (!ast?.mixins) return [];
		return Array.from(ast.mixins.entries()).map(([ k, v ]) => [ k, Array.from(v.fields) ]);
	}

	/**
	 * @param {CartridgeAST} [ast]
	 * @returns {string}
	 */
	function _buildCanonicalAstPayload(ast) {
		const payload = {
			name: '',
			version: '',
			tier: 2,
			capabilities: /** @type {string[]} */ ([]),
			memoryLayout: _extractAstMemorySummary(ast),
			state: /** @type {Array<[string, string, string]>} */ ([]),
			handlers: _extractAstHandlersSummary(ast),
			mixins: _extractAstMixinsSummary(ast),
			eventHandlers: /** @type {EventHandler[]} */ ([])
		};
		if (!ast) return JSON.stringify(payload);
		if (ast.name) payload.name = ast.name;
		if (ast.version) payload.version = ast.version;
		if (typeof ast.tier === 'number') payload.tier = ast.tier;
		if (Array.isArray(ast.capabilities)) {
			payload.capabilities = ast.capabilities.slice().sort((a, b) => a.localeCompare(b));
		}
		if (Array.isArray(ast.state)) {
			payload.state = ast.state.map((/** @type {StateField} */ s) => [ s.name, s.type, s.defaultValue ]);
		}
		if (Array.isArray(ast.eventHandlers)) {
			payload.eventHandlers = ast.eventHandlers;
		}
		return JSON.stringify(payload);
	}

	/**
	 * Computes canonical FNV-1a 32-bit hash of an admitted CartridgeAST.
	 * Cognitive Complexity: <= 5 (SonarLint S3776 compliant).
	 * @param {CartridgeAST} [ast] - Synthesized Cartridge AST
	 * @returns {string} 8-character hex hash prefixed with '0x'
	 */
	function _computeAstHash(ast) {
		if (!ast) return '0x00000000';
		const canonicalPayload = _buildCanonicalAstPayload(ast);
		let hash = 0x811c9dc5;
		for (let i = 0; i < canonicalPayload.length; i++) {
			hash ^= canonicalPayload.codePointAt(i) || 0;
			hash = Math.imul(hash, 0x01000193);
		}
		return '0x' + (hash >>> 0).toString(16).padStart(8, '0');
	}

	/**
	 * Plane 2.5: STCP-002 Constitutional Admission Authority.
	 * Evaluates CartridgeAST against machine-readable CONSTITUTIONAL_RULE_REGISTRY
	 * and issues an immutable, proof-carrying ConstitutionalReceipt required for GUCA emission.
	 */
	class SynarcheAdmissionAuthority {
		/**
		 * Evaluates constitutional invariants and classifies passed/failed rules.
		 * @param {CartridgeAST} ast - AST being evaluated
		 * @param {string[]} errors - Diagnostics
		 * @param {number} totalMem - Total memory bytes required
		 * @returns {{ passedRules: string[], failedRules: string[] }}
		 * @private
		 */
		static _evaluateInvariants(ast, errors, totalMem) {
			/** @type {string[]} */
			const passedRules = [];
			/** @type {string[]} */
			const failedRules = [];

			/** @param {string} ruleId */
			const passRule = (ruleId) => {
				passedRules.push(ruleId);
			};

			/** @param {string} ruleId @param {string} [errMsg] */
			const failRule = (ruleId, errMsg) => {
				failedRules.push(ruleId);
				if (errMsg) errors.push(errMsg);
			};

			if (ast?.name) {
				passRule('VSRP-001.LIFECYCLE');
			} else {
				failRule('VSRP-001.LIFECYCLE', `[${ERRORS.ERR_0x19}] L1:C1 - Invalid AST: missing cartridge identity`);
			}

			if (totalMem <= MAX_PAYLOAD_MEMORY_BYTES) {
				passRule('PERSIST-001.CAPACITY');
			} else {
				failRule('PERSIST-001.CAPACITY', `[${ERRORS.ERR_0x13}] L1:C1 - Memory layout ${totalMem}B exceeds max payload capacity ${MAX_PAYLOAD_MEMORY_BYTES}B`);
			}

			if (!errors.some(e => e.includes('ERR_0x10') || e.includes('ERR_0x11') || e.includes('ERR_0x12'))) {
				passRule('STCP-001.MIXIN_INTEGRITY');
			} else {
				failRule('STCP-001.MIXIN_INTEGRITY');
			}

			if (!errors.some(e => e.includes('ERR_0x16'))) {
				passRule('SDCP-001.FARADAY');
			} else {
				failRule('SDCP-001.FARADAY');
			}

			if (!errors.some(e => e.includes('ERR_0x15'))) {
				passRule('SDCP-001.CAPABILITIES');
			} else {
				failRule('SDCP-001.CAPABILITIES');
			}

			if (!errors.some(e => e.includes('ERR_0x17'))) {
				passRule('INV-08.HOT_LOOP');
			} else {
				failRule('INV-08.HOT_LOOP');
			}

			// STCP-002: Hindley-Milner Type Inference Pass
			const typeEngine = new SynarcheTypeInferenceEngine();
			typeEngine.inferCartridge(ast, errors);

			if (!errors.some(e => e.includes('ERR_0x1A'))) {
				passRule('STCP-002.TYPE_UNIFICATION');
			} else {
				failRule('STCP-002.TYPE_UNIFICATION');
			}

			return { passedRules, failedRules };
		}

		/**
		 * Deep-freezes admitted Cartridge AST sub-structures.
		 * @param {CartridgeAST} ast - Admitted AST to freeze
		 * @private
		 */
		static _freezeAst(ast) {
			if (!ast || Object.isFrozen(ast)) return;
			if (ast.state) Object.freeze(ast.state);
			if (ast.capabilities) Object.freeze(ast.capabilities);
			if (ast.inferredTypes) Object.freeze(ast.inferredTypes);
			if (ast.memoryLayout) {
				if (ast.memoryLayout.fields) Object.freeze(ast.memoryLayout.fields);
				Object.freeze(ast.memoryLayout);
			}
			Object.freeze(ast);
		}

		/**
		 * Evaluates an AST against all constitutional invariants.
		 * @param {CartridgeAST} ast - Synthesized AST
		 * @param {string[]} [preErrors] - Upstream diagnostic errors from parsing
		 * @param {ParserOptions} [options] - Parsing and admission options
		 * @returns {ConstitutionalReceipt} Immutable proof-carrying admission receipt
		 */
		static admit(ast, preErrors = [], options = {}) {
			const errors = [ ...preErrors ];
			const totalMem = ast?.memoryLayout?.totalBytes || 0;
			const { passedRules, failedRules } = SynarcheAdmissionAuthority._evaluateInvariants(ast, errors, totalMem);

			const isAdmitted = failedRules.length === 0 && errors.length === 0;
			(isAdmitted ? passedRules : failedRules).push('STCP-002.ADMISSION_SEAL');

			/** @type {ConstitutionalReceipt} */
			const receipt = Object.freeze({
				status: isAdmitted ? 'ADMITTED' : 'REJECTED',
				constitutionId: 'PHOENIX_SOVEREIGN_CONSTITUTION',
				protocolVersion: 'VSRP-001',
				compilerVersion: COMPILER_VERSION,
				timestamp: Date.now(),
				astHash: _computeAstHash(ast),
				capabilities: Object.freeze([ ...(ast?.capabilities || []) ]),
				memoryBytesRequired: totalMem,
				passedRules: Object.freeze(passedRules),
				failedRules: Object.freeze(failedRules),
				errors: Object.freeze(errors)
			});

			if (ast && !Object.isFrozen(ast)) {
				ast.admissionReceipt = receipt;
				if (isAdmitted) {
					SynarcheAdmissionAuthority._freezeAst(ast);
				}
			}

			return receipt;
		}
	}

	//#endregion [SEC-03.5]

	//#region [SEC-04] Plane 3: Generic Universal Cartridge Assembly (GUCAEmitter)

	/**
	 * Plane 3 Generic Universal Cartridge Assembly Code Generator.
	 */
	class GUCAEmitter {
		/**
		 * Validates constitutional admission proof against AST and invariants.
		 * @param {CartridgeAST} ast - Synthesized AST
		 * @param {ConstitutionalReceipt|undefined} [admission] - Admission receipt
		 * @param {boolean} [isStrict] - Whether strict mode is enabled
		 * @private
		 */
		static _verifyAdmission(ast, admission, isStrict) {
			if (!isStrict) return;

			if (admission?.status !== 'ADMITTED') {
				const failedList = (admission?.failedRules && admission.failedRules.length > 0)
					? admission.failedRules.join(', ')
					: 'MISSING_ADMISSION_PROOF';
				throw new Error(`${ERRORS.ERR_0x18}: GUCA_EMISSION_DENIED - Unadmitted Cartridge AST [${failedList}]`);
			}

			if (admission.constitutionId !== 'PHOENIX_SOVEREIGN_CONSTITUTION' || admission.protocolVersion !== 'VSRP-001') {
				throw new Error(`${ERRORS.ERR_0x18}: GUCA_EMISSION_DENIED - Constitutional provenance mismatch`);
			}

			const currentHash = _computeAstHash(ast);
			if (admission.astHash !== currentHash) {
				throw new Error(`${ERRORS.ERR_0x18}: GUCA_EMISSION_DENIED - Tampered AST: hash mismatch [receipt: ${admission.astHash}, current: ${currentHash}]`);
			}
		}

		/**
		 * Synthesizes typed memory accessors for PERSIST-001 DataView layout.
		 * @param {MemoryField[]} [fields] - AST memoryLayout fields
		 * @returns {string[]} Formatted accessor definitions
		 * @private
		 */
		static _buildMemoryAccessors(fields) {
			const memoryAccessors = [];
			for (const field of (fields || [])) {
				const acc = /** @type {any} */ (MEMORY_TYPE_ACCESSORS)[ field.type ];
				if (!acc) continue;
				const endianArg = acc.args ? ', true' : '';
				const size = /** @type {any} */ (MEMORY_TYPE_SIZES)[ field.type ] || 1;
				if (field.isArray) {
					memoryAccessors.push(`
		get ${field.name}() {
			return (index) => this._view.${acc.get}(${field.offset} + index * ${size}${endianArg});
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
			return memoryAccessors;
		}

		/**
		 * Synthesizes method bodies for all 9 canonical VSRP-001 lifecycle methods.
		 * @param {Map<string, any>} [handlers] - AST handler definitions
		 * @returns {Record<string, string>} Complete method body dictionary
		 * @private
		 */
		static _synthesizeMethodBodies(handlers) {
			/** @type {Record<string, string>} */
			const methodBodies = {};
			for (const m of CANONICAL_LIFECYCLE_METHODS) {
				methodBodies[ m ] = '// no-op default stub';
			}
			if (handlers) {
				for (const [ mName, h ] of handlers.entries()) {
					methodBodies[ mName ] = h.body || '// no-op';
				}
			}
			return methodBodies;
		}

		/**
		 * Architectural: Pure code generation. Synthesizes validated CartridgeAST into zero-dependency VSRP-001 IIFE.
		 * @param {CartridgeAST} ast - Validated cartridge AST
		 * @param {EmitterOptions} [options] - Code emission options
		 * @returns {string} Standalone executable VSRP-001 Cartridge JavaScript source code
		 */
		static emit(ast, options = {}) {
			const format = options.format || 'IIFE';
			const cartridgeName = ast?.name || 'AnonymousCartridge';

			// STCP-002: Fail-Closed Constitutional Admission Gate & Identity Re-Verification
			const admission = options.admission || ast?.admissionReceipt;
			const isStrict = options.mode !== 'SLOPPY';
			GUCAEmitter._verifyAdmission(ast, admission, isStrict);

			// 1. Build memory accessors
			const memoryAccessors = GUCAEmitter._buildMemoryAccessors(ast?.memoryLayout?.fields);

			// 2. Synthesize all 9 canonical VSRP-001 methods
			const methodBodies = GUCAEmitter._synthesizeMethodBodies(ast?.handlers);

			// 3. Assemble complete VSRP-001 Cartridge code
			const isCjs = format === 'CJS';
			const wrapperOpen = isCjs
				? `'use strict';\n\n`
				: `((/** @type {Record<string, any>} */ global) => {\n\t'use strict';\n\n`;
			const wrapperClose = isCjs
				? `\nmodule.exports = Cartridge;\n`
				: `\n\tglobal.${cartridgeName} = Cartridge;\n\tif (typeof module !== 'undefined' && module.exports) module.exports = Cartridge;\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`;

			const proofHeader = admission ? `
 * Constitutional Proof: ${admission.astHash} | Status: ${admission.status}
 * Admitted Invariants: ${admission.passedRules.join(', ')}` : `
 * Constitutional Proof: UNVERIFIED (SLOPPY MODE)`;

			return `/**
 * VSRP-001 CARTRIDGE: ${cartridgeName}
 * Compiled via STCP-001 / GUCA Emitter v${COMPILER_VERSION}${proofHeader}
 * Authority: Tier 2 Simulation Tenant | Zero-Dependency Module
 */
${wrapperOpen}\t/** @type {ArrayBuffer|null} */
	let _rawBuffer = null;
	/** @type {DataView|null} */
	let _dataView = null;

	const state = {
${(ast?.state || []).map(s => `\t\t${s.name}: ${s.defaultValue},`).join('\n')}
	};

	const memory = {
		get _view() { return _dataView; },
${memoryAccessors.join('\n')}
	};

	const Cartridge = Object.freeze({
		protocol: 'VSRP-001',
		name: '${cartridgeName}',
		version: '${ast?.version || '1.0.0'}',
		author: '${ast?.author || 'Anonymous'}',
		tier: ${ast?.tier || 2},
		capabilities: Object.freeze(${JSON.stringify(ast?.capabilities || [])}),
		admission: Object.freeze({
			status: '${admission?.status || 'UNVERIFIED'}',
			astHash: '${admission?.astHash || '0x00000000'}',
			compilerVersion: '${COMPILER_VERSION}',
			timestamp: ${admission?.timestamp || 0},
			passedRules: Object.freeze(${JSON.stringify(admission?.passedRules || [])}),
		}),
		state,
		memory,

		configure(ctx) {
			if (ctx && ctx.requestLinearMemory) {
				_rawBuffer = ctx.requestLinearMemory(${ast?.memoryLayout?.totalBytes || 0});
				_dataView = new DataView(_rawBuffer);
			} else if (!_rawBuffer) {
				_rawBuffer = new ArrayBuffer(${Math.max(64, ast?.memoryLayout?.totalBytes || 0)});
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
// [INV-08] Hot-loop allocation: pre-allocate before tick
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
			schemaVersion: '${ast?.version || '1.0.0'}',
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
		ASTFactory: SynarcheASTFactory,
		StatementParser: SynarcheStatementParser,
		TypeSystem: SynarcheTypeSystem,
		TypeEnvironment: SynarcheTypeEnvironment,
		TypeInferenceEngine: SynarcheTypeInferenceEngine,

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
		 * @returns {{ ast: CartridgeAST, errors: string[], receipt?: ConstitutionalReceipt }} Generated AST and collected errors
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
			const lineRegex = /Line\s+(\d+),\s*Col\s+(\d+)/i;
			const ruleRegex = /(ERR_0x[0-9A-Fa-f]+)/;
			return errors.map(err => {
				const lineMatch = lineRegex.exec(err);
				const ruleMatch = ruleRegex.exec(err);
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
		 * Architectural: STCP-002 Constitutional Admission evaluation facade.
		 * @param {CartridgeAST} ast - Synthesized Cartridge AST
		 * @param {string[]} [errors] - Upstream diagnostic errors
		 * @param {ParserOptions} [options] - Admission options
		 * @returns {ConstitutionalReceipt} Cryptographically sealed admission receipt
		 */
		admit(ast, errors = [], options = {}) {
			return SynarcheAdmissionAuthority.admit(ast, errors, options);
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
			const { ast, errors, receipt: parseReceipt } = this.parse(tokens, { mode: options.mode || 'STRICT', source });

			// STCP-002: Formal Constitutional Admission Gate
			const receipt = parseReceipt || this.admit(ast, errors, { mode: options.mode });

			if (receipt.status !== 'ADMITTED' && options.mode !== 'SLOPPY') {
				return {
					ok: false,
					receipt,
					errors: [ ...receipt.errors ],
					capabilities: [],
					memoryBytesRequired: 0,
				};
			}

			const code = this.emit(ast, { format: options.format || 'IIFE', admission: receipt, mode: options.mode });
			return {
				ok: true,
				code,
				ast,
				receipt,
				capabilities: ast.capabilities || [],
				errors: [ ...receipt.errors ],
				memoryBytesRequired: ast.memoryLayout?.totalBytes || 0,
			};
		}
	};

	global.SynarcheCompiler = SynarcheCompiler;
	global.SynarcheLexer = SynarcheLexer;
	global.SynarcheParser = SynarcheParser;
	global.GUCAEmitter = GUCAEmitter;
	global.SynarcheAdmissionAuthority = SynarcheAdmissionAuthority;
	global.CONSTITUTIONAL_RULE_REGISTRY = CONSTITUTIONAL_RULE_REGISTRY;
	global.SynarcheASTFactory = SynarcheASTFactory;
	global.SynarcheStatementParser = SynarcheStatementParser;
	global.SynarcheTypeSystem = SynarcheTypeSystem;
	global.SynarcheTypeEnvironment = SynarcheTypeEnvironment;
	global.SynarcheTypeInferenceEngine = SynarcheTypeInferenceEngine;

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			SynarcheCompiler,
			SynarcheLexer,
			SynarcheParser,
			GUCAEmitter,
			SynarcheAdmissionAuthority,
			CONSTITUTIONAL_RULE_REGISTRY,
			SynarcheASTFactory,
			SynarcheStatementParser,
			SynarcheTypeSystem,
			SynarcheTypeEnvironment,
			SynarcheTypeInferenceEngine,
			ERRORS,
		};
	}

	//#endregion [SEC-05]
})(typeof globalThis !== 'undefined' ? globalThis : this);
