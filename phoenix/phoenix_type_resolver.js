/**
 * ============================================================================
 * PHOENIX SOVEREIGN TYPE RESOLVER & JSDOC CONTRACT SCAFFOLDER
 * Document Identifier: VLT-003-PHOENIX-TYPE-RESOLVER
 * Governing Protocol:  VSRP-001 / MPFS-001 / PSGC-001 [SEC-01.2]
 * Authority:           Host SSOT | Zero-Dependency Ambient Type Indexer & Inferrer
 * ============================================================================
 */
((/** @type {Record<string, unknown>} */ global) => {
	'use strict';

	/**
	 * Canonical Parameter Semantic Dictionary.
	 * Maps common sovereign domain tokens to their canonical phoenix.d.ts types and descriptions.
	 * @type {Record<string, { type: string; desc: string }>}
	 */
	const DOMAIN_TYPE_DICTIONARY = Object.freeze({
		// Phoenix Governance & DTOs
		proposal: { type: 'PhoenixProposalDTO', desc: 'PGE-DSL-1 proposal envelope to evaluate' },
		prop: { type: 'PhoenixProposalDTO', desc: 'Target proposal envelope' },
		receipt: { type: 'PhoenixReceiptDTO', desc: 'Immutable PGE-RECEIPT-1 cryptographic evaluation receipt' },
		change: { type: 'PhoenixChangeDTO', desc: 'Atomic file or AST change directive' },
		changes: { type: 'PhoenixChangeDTO[]', desc: 'Ordered array of change directives' },
		governor: { type: 'PhoenixGovernorInstance', desc: 'Target sovereign governor instance' },
		gov: { type: 'PhoenixGovernorInstance', desc: 'Governor instance reference' },
		cartridge: { type: 'VSRPCartridgeFacade', desc: 'Active running VSRP-001 cartridge instance' },
		ast: { type: 'CartridgeAST | Record<string, unknown>', desc: 'Structured AST representation' },

		// Virtual Filesystem & Storage
		vfs: { type: 'Map<string, string>', desc: 'Virtual file system storage map' },
		vfsMap: { type: 'Map<string, string>', desc: 'Virtual file system map' },
		filePath: { type: 'string', desc: 'Target file path in the sovereign workspace' },
		path: { type: 'string', desc: 'Resource or module path' },
		code: { type: 'string', desc: 'JavaScript or cartridge source code' },
		source: { type: 'string', desc: 'Raw source code string' },
		content: { type: 'string', desc: 'Text or document content' },

		// Canvas & Graphics Substrates
		ctx: { type: 'CanvasRenderingContext2D', desc: '2D canvas rendering context' },
		canvas: { type: 'HTMLCanvasElement', desc: 'Target viewport canvas element' },
		gl: { type: 'WebGLRenderingContext', desc: 'WebGL rendering context' },
		camera: { type: 'PhoenixCamera2D | { x: number; y: number; zoom: number }', desc: 'Viewport camera state' },
		entId: { type: 'string', desc: 'Target entity unique identifier' },
		entityId: { type: 'string', desc: 'Unique scene entity identifier' },
		tileId: { type: 'number', desc: 'Numeric tile palette identifier' },
		tierKey: { type: "'canvas2d' | 'voxel3d' | 'terrain3d' | 'webgl'", desc: 'Rendering engine tier identifier' },

		// Primitives & General Coordinates
		lineNum: { type: 'number', desc: '1-indexed line number' },
		line: { type: 'number', desc: '1-indexed line offset' },
		col: { type: 'number', desc: '1-indexed column offset' },
		column: { type: 'number', desc: '1-indexed column offset' },
		x: { type: 'number', desc: 'X-axis coordinate' },
		y: { type: 'number', desc: 'Y-axis coordinate' },
		z: { type: 'number', desc: 'Z-axis coordinate' },
		width: { type: 'number', desc: 'Width in pixels' },
		height: { type: 'number', desc: 'Height in pixels' },
		w: { type: 'number', desc: 'Width dimension' },
		h: { type: 'number', desc: 'Height dimension' },
		count: { type: 'number', desc: 'Item count or quantity' },
		timeout: { type: 'number', desc: 'Timeout in milliseconds' },
		timeoutMs: { type: 'number', desc: 'Execution timeout in milliseconds' },
		timestamp: { type: 'number', desc: 'High-resolution performance timestamp' },
		ts: { type: 'number', desc: 'Timestamp value' },
		fps: { type: 'number', desc: 'Frames per second target rate' },

		// Identifiers & Strings
		id: { type: 'string', desc: 'Unique entity or item identifier' },
		name: { type: 'string', desc: 'Descriptive identifier or name' },
		fnName: { type: 'string', desc: 'Target function name' },
		key: { type: 'string', desc: 'Key or identifier token' },
		msg: { type: 'string', desc: 'Informational or error message' },
		rawText: { type: 'string', desc: 'Raw unparsed text content' },
		query: { type: 'string', desc: 'Search query string' },

		// DOM & Events
		e: { type: 'Event | KeyboardEvent | MouseEvent', desc: 'DOM event object' },
		evt: { type: 'Event', desc: 'Triggered event instance' },
		event: { type: 'Event', desc: 'DOM event instance' },
		el: { type: 'HTMLElement', desc: 'Target DOM element' },
		element: { type: 'HTMLElement', desc: 'Target DOM element' },

		// Data structures & Options
		options: { type: 'Record<string, unknown>', desc: 'Optional configuration settings' },
		opts: { type: 'Record<string, unknown>', desc: 'Execution options' },
		config: { type: 'Record<string, unknown>', desc: 'Configuration dictionary' },
		params: { type: 'string[]', desc: 'Parameter names list' },
		items: { type: 'PhoenixSymbolItem[] | unknown[]', desc: 'Collection of elements' },
		list: { type: 'unknown[]', desc: 'List of records' },
		lines: { type: 'string[]', desc: 'Array of source code lines' },
		tokens: { type: 'LexerTokenDTO[] | SynarcheToken[]', desc: 'Token stream array' },
		token: { type: 'LexerTokenDTO | SynarcheToken', desc: 'Lexical token descriptor' },

		// Callbacks & Predicates
		cb: { type: '(...args: unknown[]) => void', desc: 'Callback function' },
		callback: { type: '(...args: unknown[]) => void', desc: 'Completion callback handler' },
		handler: { type: '(...args: unknown[]) => void', desc: 'Event handler callback' },
		predicate: { type: '(item: unknown) => boolean', desc: 'Filtering predicate function' },

		// VLT Compliance & Anchors
		anchorId: { type: 'string', desc: 'Canonical section anchor identifier, e.g. [SEC-01]' },
		regions: { type: 'VLTRegionInfo[]', desc: 'Array of scanned region descriptors' },
		violations: { type: 'VLTComplianceViolation[]', desc: 'Array of compliance violations' },
		report: { type: 'VLTComplianceReport', desc: 'Comprehensive VLT compliance report' },

		// Error Resolution Ledger & Remediation
		erl: { type: 'PhoenixErrorResolutionLedgerInstance', desc: 'Error Resolution Ledger instance' },
		record: { type: 'ERLResolutionRecordDTO | Record<string, unknown>', desc: 'Resolution record' },
		pattern: { type: 'ERLPatternDTO | Record<string, unknown>', desc: 'Error matching pattern descriptor' },

		// Symbols & Indexer
		indexer: { type: 'PhoenixSymbolIndexerFacade & PhoenixSymbolIndexerSingleton', desc: 'Symbol indexer instance or singleton' },
		symbol: { type: 'PhoenixSymbolItem', desc: 'Indexed symbol descriptor' },
		symbols: { type: 'PhoenixSymbolItem[]', desc: 'Collection of indexed symbols' },

		// Diff Engine & Scaffolding
		diff: { type: 'ChunkDiffResultDTO', desc: 'Chunk diff calculation result' },
		contract: { type: 'PhoenixInferredContract', desc: 'Inferred function contract' },
		resolver: { type: 'PhoenixTypeResolverFacade', desc: 'Phoenix type resolver facade' }
	});

	/**
	 * In-memory index of parsed declarations from phoenix.d.ts.
	 * Maps method and function names to their parameter and return signatures.
	 * @type {Map<string, { params: Array<{ name: string; type: string; optional: boolean; desc?: string }>; returnType: string; desc?: string }>}
	 */
	const _methodCatalog = new Map();

	/**
	 * In-memory index of declared interfaces and types.
	 * @type {Map<string, { desc?: string; properties: Record<string, string> }>}
	 */
	const _interfaceCatalog = new Map();

	let _catalogInitialized = false;

	/**
	 * Parses a JSDoc @param line into name, type, and description.
	 * [Pure Function] Complexity <= 6.
	 * @param {string} line - Cleaned JSDoc line starting with @param
	 * @returns {{ name: string; type: string; desc: string } | null}
	 * @private
	 */
	function _parseParamTag(line) {
		const body = line.slice(6).trim();
		let rest = body;
		let type = '';
		if (rest.startsWith('{')) {
			const closeIdx = rest.indexOf('}');
			if (closeIdx !== -1) {
				type = rest.slice(1, closeIdx).trim();
				rest = rest.slice(closeIdx + 1).trim();
			}
		}
		const nameMatch = /^\[?([A-Za-z0-9_$]+)(?:=[^\]]+)?\]?/.exec(rest);
		if (!nameMatch) return null;
		const name = nameMatch[ 1 ];
		let desc = rest.slice(nameMatch[ 0 ].length).trim();
		if (desc.startsWith('-')) desc = desc.slice(1).trim();
		return { name, type, desc };
	}

	/**
	 * Parses a JSDoc @returns line into type and description.
	 * [Pure Function] Complexity <= 4.
	 * @param {string} line - Cleaned JSDoc line starting with @return or @returns
	 * @returns {{ type: string; desc: string }}
	 * @private
	 */
	function _parseReturnTag(line) {
		const body = line.replace(/^@returns?\s*/, '').trim();
		let type = '';
		let desc = body;
		if (desc.startsWith('{')) {
			const closeIdx = desc.indexOf('}');
			if (closeIdx !== -1) {
				type = desc.slice(1, closeIdx).trim();
				desc = desc.slice(closeIdx + 1).trim();
			}
		}
		if (desc.startsWith('-')) desc = desc.slice(1).trim();
		return { type, desc };
	}

	/**
	 * Extracts docstring description and tags above a declaration.
	 * @param {string} rawComment - JSDoc comment text
	 * @returns {{ desc: string; paramDescriptions: Record<string, string>; returnDesc: string }}
	 */
	function _parseJSDocBlock(rawComment) {
		/** @type {Record<string, string>} */
		const paramDescriptions = {};
		let returnDesc = '';
		let mainDesc = '';

		const lines = rawComment.split('\n');
		for (const line of lines) {
			const cleaned = line.replace(/^\s*\/?\*+\/?\s*/, '').trim();
			if (!cleaned) continue;

			if (cleaned.startsWith('@param')) {
				const parsed = _parseParamTag(cleaned);
				if (parsed) {
					paramDescriptions[ parsed.name ] = parsed.desc;
				}
			} else if (cleaned.startsWith('@returns') || cleaned.startsWith('@return')) {
				const parsed = _parseReturnTag(cleaned);
				returnDesc = parsed.desc;
			} else if (!cleaned.startsWith('@') && !mainDesc) {
				mainDesc = cleaned;
			}
		}

		return { desc: mainDesc, paramDescriptions, returnDesc };
	}

	/**
	 * Splits argument strings respecting nested brackets <>, (), and {}.
	 * @param {string} str - Raw comma-separated parameter string
	 * @returns {string[]}
	 */
	function _splitSignatureArgs(str) {
		const results = [];
		let current = '';
		let depthAngle = 0;
		let depthParen = 0;
		let depthBrace = 0;

		for (const element of str) {
			const ch = element;
			if (ch === '<') depthAngle++;
			else if (ch === '>') depthAngle = Math.max(0, depthAngle - 1);
			else if (ch === '(') depthParen++;
			else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
			else if (ch === '{') depthBrace++;
			else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);

			if (ch === ',' && depthAngle === 0 && depthParen === 0 && depthBrace === 0) {
				results.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
		if (current.trim()) results.push(current.trim());
		return results;
	}

	/**
	 * Finds the JSDoc comment immediately preceding a character index in source.
	 * [Pure Function] Complexity <= 4.
	 * @param {string} content
	 * @param {number} index
	 * @returns {string}
	 * @private
	 */
	function _findPrecedingDoc(content, index) {
		const preceding = content.slice(Math.max(0, index - 1000), index).trimEnd();
		if (preceding.endsWith('*/')) {
			const commentStart = preceding.lastIndexOf('/**');
			if (commentStart !== -1) {
				return preceding.slice(commentStart + 3, - 2);
			}
		}
		return '';
	}

	/**
	 * Parses parameter declarations from raw parameter string.
	 * [Pure Function] Complexity <= 6.
	 * @param {string} rawParams
	 * @param {Record<string, string>} paramDescriptions
	 * @returns {Array<{ name: string; type: string; optional: boolean; desc: string }>}
	 * @private
	 */
	function _parseMethodParams(rawParams, paramDescriptions) {
		if (!rawParams) return [];
		return _splitSignatureArgs(rawParams).map(p => {
			const colonIdx = p.indexOf(':');
			const namePart = colonIdx !== -1 ? p.slice(0, colonIdx).trim() : p.trim();
			const typePart = colonIdx !== -1 ? p.slice(colonIdx + 1).trim() : 'unknown';
			const isOptional = namePart.endsWith('?');
			const cleanName = isOptional ? namePart.slice(0, -1) : namePart;
			return {
				name: cleanName,
				type: typePart,
				optional: isOptional,
				desc: paramDescriptions[ cleanName ] || ''
			};
		});
	}

	/**
	 * Parses TypeScript ambient declarations (.d.ts) into the in-memory symbol catalog.
	 * @param {string} dtsContent - Raw contents of phoenix.d.ts
	 * @returns {number} Number of indexed method signatures
	 */
	function ingestDeclarations(dtsContent) {
		if (!dtsContent || typeof dtsContent !== 'string') return 0;
		_methodCatalog.clear();
		_interfaceCatalog.clear();

		// Match method signatures: e.g. methodName(param1: Type1, param2?: Type2): ReturnType;
		const methodRegex = /(?:[a-z]+\s+)*([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*:\s*([^;\x7B\n]+);/g;

		let match;
		let count = 0;
		while ((match = methodRegex.exec(dtsContent)) !== null) {
			const rawDoc = _findPrecedingDoc(dtsContent, match.index);
			const methodName = match[ 1 ];
			const rawParams = match[ 2 ].trim();
			const rawReturnType = match[ 3 ].trim();

			const doc = _parseJSDocBlock(rawDoc);
			const params = _parseMethodParams(rawParams, doc.paramDescriptions);

			_methodCatalog.set(methodName, {
				params,
				returnType: rawReturnType,
				desc: doc.desc
			});
			count++;
		}

		// Match interface declarations: declare interface Name { ... }
		const interfaceRegex = /declare\s+(?:interface|type)\s+([A-Za-z0-9_$]+)/g;
		let ifMatch;
		while ((ifMatch = interfaceRegex.exec(dtsContent)) !== null) {
			const ifDoc = _parseJSDocBlock(_findPrecedingDoc(dtsContent, ifMatch.index));
			const ifName = ifMatch[ 1 ];
			_interfaceCatalog.set(ifName, {
				desc: ifDoc.desc,
				properties: {}
			});
		}

		_catalogInitialized = true;
		return count;
	}

	/**
	 * Infers type of a parameter from function body usage heuristics.
	 * Slices the first 50 lines of the function implementation.
	 * @param {string} paramName - Parameter identifier
	 * @param {string[]} bodyLines - Lines of function implementation
	 * @returns {string | null} Inferred type or null if indeterminate
	 */
	/**
	 * Infers array type of a parameter based on method calls and name heuristics.
	 * [Pure Function] Complexity <= 9.
	 * @param {string} paramName
	 * @param {string} escaped
	 * @param {string} bodyText
	 * @returns {string | null}
	 * @private
	 */
	function _inferArrayParam(paramName, escaped, bodyText) {
		const arrayPattern = new RegExp(String.raw`\b${escaped}\s*\.(?:map|forEach|filter|reduce|push|pop|shift|unshift|slice|includes|indexOf|find|findIndex)\s*\(`, 'm');
		const arrayIndexPattern = new RegExp(String.raw`\b${escaped}\s*\[\s*[A-Za-z0-9_$]+\s*\]`);
		const arrayLengthPattern = new RegExp(String.raw`\b${escaped}\.length\b`);
		if (!arrayPattern.test(bodyText) && (!arrayIndexPattern.test(bodyText) || !arrayLengthPattern.test(bodyText))) {
			return null;
		}

		if (/tokens?$/i.test(paramName)) return 'LexerTokenDTO[] | SynarcheToken[]';
		if (/symbols?$/i.test(paramName)) return 'PhoenixSymbolItem[]';
		if (/lines?$/i.test(paramName)) return 'string[]';
		if (/changes?$/i.test(paramName)) return 'PhoenixChangeDTO[]';
		if (/regions?$/i.test(paramName)) return 'VLTRegionInfo[]';
		if (/violations?$/i.test(paramName)) return 'VLTComplianceViolation[]';
		if (/(?:errors?|messages?)$/i.test(paramName)) return 'string[]';
		return 'unknown[]';
	}

	/**
	 * Infers primitive type of a parameter (string, number, boolean).
	 * [Pure Function] Complexity <= 7.
	 * @param {string} escaped
	 * @param {string} bodyText
	 * @returns {string | null}
	 * @private
	 */
	function _inferPrimitiveParam(escaped, bodyText) {
		const strPattern = new RegExp(String.raw`\b${escaped}\s*\.(?:trim|split|toLowerCase|toUpperCase|substring|slice|startsWith|endsWith|replace|replaceAll|match)\s*\(`, 'm');
		const strTypeofPattern = new RegExp(String.raw`typeof\s+${escaped}\s*===?\s*['"]string['"]`);
		if (strPattern.test(bodyText) || strTypeofPattern.test(bodyText)) {
			return 'string';
		}

		const numPattern = new RegExp(String.raw`Math\.[A-Za-z]+\([^)]*\b${escaped}\b|\b${escaped}\s*(?:[+\-*/%]\s*\d|>=|<=|>|<|\+\+|--)`, 'm');
		const numTypeofPattern = new RegExp(String.raw`typeof\s+${escaped}\s*===?\s*['"]number['"]`);
		if (numPattern.test(bodyText) || numTypeofPattern.test(bodyText)) {
			return 'number';
		}

		const boolTypeofPattern = new RegExp(String.raw`typeof\s+${escaped}\s*===?\s*['"]boolean['"]`);
		if (boolTypeofPattern.test(bodyText)) {
			return 'boolean';
		}

		return null;
	}

	/**
	 * Infers function or collection type of a parameter.
	 * [Pure Function] Complexity <= 6.
	 * @param {string} paramName
	 * @param {string} escaped
	 * @param {string} bodyText
	 * @returns {string | null}
	 * @private
	 */
	function _inferFunctionParam(paramName, escaped, bodyText) {
		const fnPattern = new RegExp(String.raw`\b${escaped}\s*\(|\b${escaped}\s*\.(?:call|apply|bind)\s*\(`, 'm');
		const fnTypeofPattern = new RegExp(String.raw`typeof\s+${escaped}\s*===?\s*['"]function['"]`);
		if (fnPattern.test(bodyText) || fnTypeofPattern.test(bodyText)) {
			if (/predicate|filter/i.test(paramName)) return '(item: unknown) => boolean';
			return '(...args: unknown[]) => unknown';
		}

		if (new RegExp(String.raw`\b${escaped}\s*\.(?:get|set|has|delete)\s*\(`).test(bodyText)) {
			return 'Map<string, unknown>';
		}

		const objPattern = new RegExp(String.raw`\bObject\.(?:keys|values|entries|assign)\s*\(\s*${escaped}\s*[),]|(?:^|[^\w.])${escaped}\.[A-Za-z0-9_$]+`);
		if (objPattern.test(bodyText)) {
			return 'Record<string, unknown>';
		}

		return null;
	}

	/**
	 * Infers type of a parameter from function body usage heuristics.
	 * Slices the first 50 lines of the function implementation.
	 * [Pure Function] Complexity <= 4.
	 * @param {string} paramName - Parameter identifier
	 * @param {string[]} bodyLines - Lines of function implementation
	 * @returns {string | null} Inferred type or null if indeterminate
	 */
	/**
	 * Infers type of a parameter from function body usage heuristics.
	 * Slices the first 50 lines of the function implementation.
	 * [Pure Function] Complexity <= 6.
	 * @param {string} paramName - Parameter identifier
	 * @param {string[]} bodyLines - Lines of function implementation
	 * @returns {string | null} Inferred type or null if indeterminate
	 */
	function _inferParamFromBody(paramName, bodyLines) {
		const escaped = paramName.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
		const bodyText = bodyLines.slice(0, 50).join('\n');

		const arrayType = _inferArrayParam(paramName, escaped, bodyText);
		if (arrayType) return arrayType;

		const primitiveType = _inferPrimitiveParam(escaped, bodyText);
		if (primitiveType) return primitiveType;

		const fnOrObjType = _inferFunctionParam(paramName, escaped, bodyText);
		if (fnOrObjType) return fnOrObjType;

		if (/(?:Source|Text|Content|Str|Raw|Html|Markdown|Input|Output|Label|Title|Message|Description)$/.test(paramName)) {
			return 'string';
		}

		return null;
	}

	/**
	 * Tests if expression evaluates to a boolean primitive.
	 * [Pure Function] Complexity <= 3.
	 * @param {string} e
	 * @returns {boolean}
	 * @private
	 */
	function _isBooleanExpr(e) {
		return e === 'true' || e === 'false' || e.startsWith('Boolean(') || e.startsWith('!') || /[<>=!]/.test(e);
	}

	/**
	 * Tests if expression evaluates to a string primitive.
	 * [Pure Function] Complexity <= 2.
	 * @param {string} e
	 * @returns {boolean}
	 * @private
	 */
	function _isStringExpr(e) {
		return e.startsWith("'") || e.startsWith('"') || e.startsWith('`') || e.startsWith('String(');
	}

	/**
	 * Tests if expression evaluates to a number primitive.
	 * [Pure Function] Complexity <= 2.
	 * @param {string} e
	 * @returns {boolean}
	 * @private
	 */
	function _isNumberExpr(e) {
		return /^-?\d+(?:\.\d+)?$/.test(e) || e.startsWith('Number(') || e.startsWith('Math.');
	}

	/**
	 * Tests if expression evaluates to an array.
	 * [Pure Function] Complexity <= 2.
	 * @param {string} e
	 * @returns {boolean}
	 * @private
	 */
	function _isArrayExpr(e) {
		return e.startsWith('[') || e.includes('.map(') || e.includes('.filter(');
	}

	/**
	 * Tests if expression evaluates to an object.
	 * [Pure Function] Complexity <= 2.
	 * @param {string} e
	 * @returns {boolean}
	 * @private
	 */
	function _isObjectExpr(e) {
		return e.startsWith('\x7B') || e.startsWith('Object.assign') || e.startsWith('Object.freeze');
	}

	/**
	 * Infers array element return type from function name heuristics.
	 * [Pure Function] Complexity <= 5.
	 * @param {string} fnName
	 * @param {boolean} isAsync
	 * @returns {{ type: string; desc: string }}
	 * @private
	 */
	function _inferArrayReturn(fnName, isAsync) {
		if (/(?:get|find|scan)?Tokens$/i.test(fnName)) return { type: isAsync ? 'Promise<LexerTokenDTO[]>' : 'LexerTokenDTO[]', desc: 'Array of lexical tokens' };
		if (/(?:get|find)?Symbols$/i.test(fnName)) return { type: isAsync ? 'Promise<PhoenixSymbolItem[]>' : 'PhoenixSymbolItem[]', desc: 'Array of indexed symbols' };
		if (/(?:get|scan)?Regions$/i.test(fnName)) return { type: isAsync ? 'Promise<VLTRegionInfo[]>' : 'VLTRegionInfo[]', desc: 'Array of region descriptors' };
		if (/(?:get|find)?Lines$/i.test(fnName)) return { type: isAsync ? 'Promise<string[]>' : 'string[]', desc: 'Array of text lines' };
		return { type: isAsync ? 'Promise<unknown[]>' : 'unknown[]', desc: 'Collection array of results' };
	}

	/**
	 * Infers return type from list of returned expressions.
	 * [Pure Function] Complexity <= 7.
	 * @param {string[]} expressions
	 * @param {boolean} isAsync
	 * @param {string} fnName
	 * @returns {{ type: string; desc: string }}
	 * @private
	 */
	function _inferTypeFromExpressions(expressions, isAsync, fnName) {
		if (expressions.every(_isBooleanExpr)) {
			return { type: isAsync ? 'Promise<boolean>' : 'boolean', desc: 'True if operation succeeded, false otherwise' };
		}
		if (expressions.every(_isStringExpr)) {
			return { type: isAsync ? 'Promise<string>' : 'string', desc: 'Synthesized or formatted string result' };
		}
		if (expressions.every(_isNumberExpr)) {
			return { type: isAsync ? 'Promise<number>' : 'number', desc: 'Calculated numeric value' };
		}
		if (expressions.every(_isArrayExpr)) {
			return _inferArrayReturn(fnName, isAsync);
		}
		if (expressions.every(_isObjectExpr)) {
			return { type: isAsync ? 'Promise<Record<string, unknown>>' : 'Record<string, unknown>', desc: 'Result object payload' };
		}

		const firstExpr = expressions[ 0 ];
		if (DOMAIN_TYPE_DICTIONARY[ firstExpr ]) {
			const mapped = DOMAIN_TYPE_DICTIONARY[ firstExpr ];
			return { type: isAsync ? `Promise<${mapped.type}>` : mapped.type, desc: mapped.desc };
		}

		return { type: isAsync ? 'Promise<unknown>' : 'unknown', desc: 'Resolved operation result' };
	}

	/**
	 * Infers function return type by inspecting its return statements and async keyword.
	 * [Pure Function] Complexity <= 4.
	 * @param {boolean} isAsync - True if function declared with async
	 * @param {string[]} bodyLines - Lines of function implementation
	 * @param {string} [fnName=''] - Optional function name for domain inference
	 * @returns {{ type: string; desc: string }}
	 */
	function _inferReturnType(isAsync, bodyLines, fnName = '') {
		const bodyText = bodyLines.join('\n');
		const returnMatches = [ ...bodyText.matchAll(/\breturn\b\s*([^;}\n]*)/g) ];

		if (returnMatches.length === 0) {
			const type = isAsync ? 'Promise<void>' : 'void';
			return { type, desc: isAsync ? 'Promise that resolves when async operations complete' : 'Does not return a value' };
		}

		const expressions = returnMatches
			.map(m => (m[ 1 ] || '').trim())
			.filter(expr => expr.length > 0 && expr !== 'undefined');

		if (expressions.length === 0) {
			const type = isAsync ? 'Promise<void>' : 'void';
			return { type, desc: isAsync ? 'Resolves when complete' : 'Early return' };
		}

		return _inferTypeFromExpressions(expressions, isAsync, fnName);
	}

	/**
	 * Generates a clean human-readable verb-noun description for a function name.
	 * @param {string} fnName - Function name
	 * @returns {string}
	 */
	function _deriveFunctionSummary(fnName) {
		const clean = fnName.replace(/^_+/, '');
		const parts = clean.replace(/([A-Z])/g, ' $1').toLowerCase().trim().split(' ');
		if (parts.length === 0 || !parts[ 0 ]) return `Executes ${clean}.`;

		const verb = parts[ 0 ];
		const rest = parts.slice(1).join(' ');

		/** @type {Record<string, string>} */
		const verbMap = {
			get: 'Retrieves',
			set: 'Sets',
			init: 'Initializes',
			boot: 'Bootstraps and initializes',
			load: 'Loads and parses',
			save: 'Persists',
			render: 'Renders',
			build: 'Constructs',
			create: 'Creates a new',
			mount: 'Mounts',
			unmount: 'Unmounts and tears down',
			bind: 'Binds event listeners for',
			handle: 'Dispatches and handles',
			toggle: 'Toggles active state of',
			format: 'Formats and aligns',
			parse: 'Parses raw content into',
			scan: 'Scans and audits',
			verify: 'Validates integrity and contracts for',
			check: 'Checks status of',
			scaffold: 'Deterministically scaffolds',
			apply: 'Applies',
			reject: 'Reverts and rejects',
			update: 'Updates',
			select: 'Selects and focuses',
			has: 'Determines whether',
			is: 'Determines if'
		};

		let formattedVerb = verbMap[ verb ];
		if (!formattedVerb) {
			const capitalized = verb.charAt(0).toUpperCase() + verb.slice(1);
			formattedVerb = /(?:s|sh|ch|x|z)$/.test(verb) ? `${capitalized}es` : `${capitalized}s`;
		}
		return rest ? `${formattedVerb} ${rest}.` : `${formattedVerb} target state.`;
	}

	/**
	 * Extracts the primary (most specific) type from a TS union string.
	 * For example: `PhoenixProposalDTO | Record<string, unknown>` → `PhoenixProposalDTO`.
	 * If the primary type is a generic built-in, falls back to the full union.
	 * @param {string} typeStr
	 * @returns {string}
	 */
	function _primaryUnionType(typeStr) {
		if (!typeStr.includes(' | ')) return typeStr;
		// Split respecting nested generics
		const parts = [];
		let cur = '';
		let depth = 0;
		for (const ch of typeStr) {
			if (ch === '<') depth++;
			else if (ch === '>') depth--;
			if (ch === '|' && depth === 0) { parts.push(cur.trim()); cur = ''; }
			else cur += ch;
		}
		if (cur.trim()) parts.push(cur.trim());

		// Prefer first member that looks like a sovereign DTO (PascalCase, not generic)
		const GENERIC_PRIMITIVES = /^(?:string|number|boolean|void|null|undefined|unknown|any|object|Record|Map|Array|Promise)/;
		const dtoMember = parts.find(p => /^[A-Z]/.test(p) && !GENERIC_PRIMITIVES.test(p));
		return dtoMember || parts[ 0 ];
	}

	/**
	 * Infers the complete typed contract for a function.
	 * @param {string} fnName - Function identifier
	 * @param {Array<{ name: string; defaultVal?: string }>} rawParams - Extracted parameters
	 * @param {boolean} [isAsync=false] - True if async function
	 * @param {string[]} [bodyLines=[]] - Function body implementation lines for static analysis
	 * @returns {{
	 *   summary: string;
	 *   params: Array<{ name: string; type: string; optional: boolean; defaultVal?: string; desc: string }>;
	 *   returns: { type: string; desc: string };
	 * }}
	 */
	function inferContract(fnName, rawParams, isAsync = false, bodyLines = []) {
		// Tier 1: Check phoenix.d.ts exact method match
		const catalogEntry = _methodCatalog.get(fnName);
		if (catalogEntry) {
			const paramMap = new Map(catalogEntry.params.map(p => [ p.name, p ]));
			const mappedParams = rawParams.map(rp => {
				const matched = paramMap.get(rp.name);
				// Normalize union types: prefer most specific DTO member over generic union
				const rawType = matched?.type || DOMAIN_TYPE_DICTIONARY[ rp.name ]?.type || 'unknown';
				const resolvedType = _primaryUnionType(rawType);
				// If catalog only gives 'unknown', try suffix/body heuristics as fallback
				const finalType = resolvedType === 'unknown'
					? (_inferParamFromBody(rp.name, bodyLines) || 'unknown')
					: resolvedType;
				return {
					name: rp.name,
					type: finalType,
					optional: Boolean(rp.defaultVal || matched?.optional),
					defaultVal: rp.defaultVal,
					desc: matched?.desc || DOMAIN_TYPE_DICTIONARY[ rp.name ]?.desc || `Parameter ${rp.name}`
				};
			});

			// Body-inferred return type wins when body deterministically returns a primitive
			// (guards against catalog over-specifying return type vs. a simple boolean guard function)
			const bodyReturn = bodyLines.length > 0 ? _inferReturnType(isAsync, bodyLines, fnName) : null;
			const PRIMITIVE_RETURNS = /^(?:boolean|string|number|void|Promise<boolean>|Promise<string>|Promise<number>|Promise<void>)$/;
			const catalogReturnType = isAsync && !catalogEntry.returnType.startsWith('Promise<')
				? `Promise<${catalogEntry.returnType}>`
				: catalogEntry.returnType;
			const finalReturn = (bodyReturn && PRIMITIVE_RETURNS.test(bodyReturn.type))
				? bodyReturn
				: { type: catalogReturnType, desc: isAsync ? 'Promise resolving with operation result' : 'Operation result' };

			return {
				summary: catalogEntry.desc || _deriveFunctionSummary(fnName),
				params: mappedParams,
				returns: finalReturn
			};
		}

		// Tier 2 & 3: Multi-tier parameter inference
		const inferredParams = rawParams.map(rp => {
			// 1. Parameter name exact match in domain dictionary
			const dictMatch = DOMAIN_TYPE_DICTIONARY[ rp.name ];
			if (dictMatch) {
				return {
					name: rp.name,
					type: dictMatch.type,
					optional: Boolean(rp.defaultVal),
					defaultVal: rp.defaultVal,
					desc: dictMatch.desc
				};
			}

			// 2. Boolean prefix heuristics (is*, has*, should*, can*, enable*)
			if (/^(?:is|has|should|can|enable)[A-Z]/.test(rp.name)) {
				return {
					name: rp.name,
					type: 'boolean',
					optional: Boolean(rp.defaultVal),
					defaultVal: rp.defaultVal,
					desc: `Flag indicating whether ${rp.name.slice(2).toLowerCase()} is enabled`
				};
			}

			// 3. Inspect function body slicing + name-suffix heuristics (suffix checks work without body)
			const bodyType = _inferParamFromBody(rp.name, bodyLines);
			if (bodyType) {
				return {
					name: rp.name,
					type: bodyType,
					optional: Boolean(rp.defaultVal),
					defaultVal: rp.defaultVal,
					desc: `Input ${rp.name}`
				};
			}

			// 4. Fallback to unknown with parameter name
			return {
				name: rp.name,
				type: 'unknown',
				optional: Boolean(rp.defaultVal),
				defaultVal: rp.defaultVal,
				desc: `Input parameter ${rp.name}`
			};
		});

		// Tier 4: Return type inference
		const returns = _inferReturnType(isAsync, bodyLines, fnName);

		return {
			summary: _deriveFunctionSummary(fnName),
			params: inferredParams,
			returns
		};
	}

	/**
	 * Formats an inferred contract into standard JSDoc comment lines.
	 * @param {{
	 *   summary: string;
	 *   params: Array<{ name: string; type: string; optional: boolean; defaultVal?: string; desc: string }>;
	 *   returns: { type: string; desc: string };
	 * }} contract - Inferred function contract
	 * @param {string} [indent] - Leading indentation string
	 * @returns {string} Clean multi-line JSDoc comment string
	 */
	/**
	 * Formats a single @param tag entry with optional default value expression.
	 * [Pure Function] Complexity <= 3.
	 * @param {{ name: string; type: string; optional: boolean; defaultVal?: string; desc: string }} p
	 * @returns {string}
	 * @private
	 */
	function _formatParamDocTag(p) {
		const paramExpr = p.optional
			? (p.defaultVal ? `[${p.name}=${p.defaultVal}]` : `[${p.name}]`)
			: p.name;
		const descSuffix = p.desc ? ` - ${p.desc}` : '';
		return `@param {${p.type}} ${paramExpr}${descSuffix}`;
	}

	/**
	 * Formats an inferred contract into standard JSDoc comment lines.
	 * [Pure Function] Complexity <= 4.
	 * @param {{
	 *   summary: string;
	 *   params: Array<{ name: string; type: string; optional: boolean; defaultVal?: string; desc: string }>;
	 *   returns: { type: string; desc: string };
	 * }} contract - Inferred function contract
	 * @param {string} [indent] - Leading indentation string
	 * @returns {string} Clean multi-line JSDoc comment string
	 */
	function formatJSDoc(contract, indent = '') {
		const lines = [
			`${indent}/**`,
			`${indent} * ${contract.summary}`
		];

		if (contract.params.length > 0) {
			for (const p of contract.params) {
				lines.push(`${indent} * ${_formatParamDocTag(p)}`);
			}
		}

		if (contract.returns) {
			const returnSuffix = contract.returns.desc ? ` - ${contract.returns.desc}` : '';
			lines.push(`${indent} * @returns {${contract.returns.type}}${returnSuffix}`);
		}

		lines.push(`${indent} */`);
		return lines.join('\n');
	}

	/**
	 * Scaffolds an accurate, strict JSDoc contract above a JavaScript function.
	 * @param {string} fullSource - Entire document source text
	 * @param {number} lineNum - 1-indexed target function line number
	 * @returns {{ scaffoldedSource: string; jsdocBlock: string; insertedLineCount: number } | null}
	 */
	function scaffoldContractAtLine(fullSource, lineNum) {
		if (!fullSource || lineNum <= 0) return null;
		const lines = fullSource.split('\n');
		const targetIndex = lineNum - 1;
		if (targetIndex >= lines.length) return null;

		const lineText = lines[ targetIndex ] || '';
		const indentMatch = /^\s*/.exec(lineText);
		const indent = indentMatch ? indentMatch[ 0 ] : '';

		// Match function declaration variants
		const fnDeclarationRegex = /(?:(async)\s+)?function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)/;
		const arrowFnRegex = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:(async)\s*)?\(([^)]*)\)\s*=>/;
		const methodFnRegex = /^\s*(?:(async)\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{/;

		const fnMatch = fnDeclarationRegex.exec(lineText) ||
			arrowFnRegex.exec(lineText) ||
			methodFnRegex.exec(lineText);

		const isAsync = Boolean(fnMatch?.[ 1 ]);
		const fnName = fnMatch ? fnMatch[ 2 ] : 'anonymous';
		const rawParamStr = fnMatch ? fnMatch[ 3 ] : '';

		const rawParams = rawParamStr.split(',').map(p => {
			const trimmed = p.trim();
			if (!trimmed) return null;
			const parts = trimmed.split('=');
			const name = (parts[ 0 ] || '').trim();
			const defaultVal = parts[ 1 ] ? parts[ 1 ].trim() : undefined;
			return name ? { name, defaultVal } : null;
		}).filter(Boolean);

		// Extract body lines (up to next 80 lines)
		const bodyLines = lines.slice(targetIndex + 1, targetIndex + 80);

		const contract = inferContract(fnName, /** @type {Array<{ name: string; defaultVal?: string }>} */(rawParams), isAsync, bodyLines);
		const jsdocBlock = formatJSDoc(contract, indent);

		// If line right above already has JSDoc or closing comment, don't duplicate
		const prevLine = lines[ targetIndex - 1 ] || '';
		if (prevLine.trim().endsWith('*/')) {
			return null;
		}

		lines.splice(targetIndex, 0, jsdocBlock);

		return {
			scaffoldedSource: lines.join('\n'),
			jsdocBlock,
			insertedLineCount: jsdocBlock.split('\n').length
		};
	}

	/**
	 * Scaffolds strict JSDoc contracts above all un-annotated functions in a document.
	 * @param {string} fullSource - Entire document source text
	 * @returns {{ scaffoldedSource: string; annotatedCount: number }}
	 */
	function scaffoldAllContracts(fullSource) {
		if (!fullSource) return { scaffoldedSource: '', annotatedCount: 0 };
		const lines = fullSource.split('\n');
		let annotatedCount = 0;

		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[ i ];
			const isFn = /(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/.test(line) ||
				/(?:const|let|var)\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/.test(line);

			if (isFn) {
				const prevLine = lines[ i - 1 ] || '';
				if (!prevLine.trim().endsWith('*/')) {
					const res = scaffoldContractAtLine(lines.join('\n'), i + 1);
					if (res) {
						lines.splice(i, 0, res.jsdocBlock);
						annotatedCount++;
					}
				}
			}
		}

		return {
			scaffoldedSource: lines.join('\n'),
			annotatedCount
		};
	}

	/**
	 * Attempts loading declarations from Node.js filesystem paths.
	 * [Pure Function] Complexity <= 7.
	 * @returns {number}
	 * @private
	 */
	function _loadCatalogFromNodeFs() {
		if (typeof require === 'undefined' || typeof process === 'undefined') return 0;
		try {
			const fs = require('node:fs');
			const path = require('node:path');
			const candidates = [
				path.resolve(__dirname, 'phoenix.d.ts'),
				path.resolve(__dirname, '../phoenix/phoenix.d.ts'),
				path.resolve(process.cwd(), 'phoenix/phoenix.d.ts')
			];
			for (const candidatePath of candidates) {
				if (fs.existsSync(candidatePath)) {
					const content = fs.readFileSync(candidatePath, 'utf8');
					return ingestDeclarations(content);
				}
			}
		} catch (_) {
			// Fall through to browser strategy
		}
		return 0;
	}

	/**
	 * Attempts loading declarations from browser VFS or network fetch.
	 * [State-Mutating] Complexity <= 6.
	 * @returns {Promise<number>}
	 * @private
	 */
	async function _loadCatalogFromBrowser() {
		if (typeof window === 'undefined') return 0;

		const vfs = /** @type {{ get(k: string): string | undefined } | undefined} */ (global._vfs);
		if (vfs && typeof vfs.get === 'function') {
			const dts = vfs.get('phoenix/phoenix.d.ts') || vfs.get('phoenix.d.ts');
			if (dts) return ingestDeclarations(dts);
		}

		if (typeof fetch === 'function') {
			try {
				const res = await fetch('phoenix.d.ts');
				if (res.ok) {
					const text = await res.text();
					return ingestDeclarations(text);
				}
			} catch (_) {
				// Fall through to domain dictionary fallback
			}
		}
		return 0;
	}

	/**
	 * Initializes the type catalog from phoenix.d.ts if running in browser or Node environment.
	 * [Pure Function] Complexity <= 3.
	 * @returns {Promise<number>}
	 */
	async function initializeTypeCatalog() {
		if (_catalogInitialized) return _methodCatalog.size;

		const nodeCount = _loadCatalogFromNodeFs();
		if (nodeCount > 0) return nodeCount;

		return _loadCatalogFromBrowser();
	}

	const PhoenixTypeResolver = Object.freeze({
		ingestDeclarations,
		initializeTypeCatalog,
		inferContract,
		formatJSDoc,
		scaffoldContractAtLine,
		scaffoldAllContracts,
		isInitialized: () => _catalogInitialized,
		getMethodCount: () => _methodCatalog.size,
		getInterfaceCount: () => _interfaceCatalog.size
	});

	global.PhoenixTypeResolver = PhoenixTypeResolver;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PhoenixTypeResolver;
	}

	// Auto-trigger background ingestion
	if (typeof setTimeout === 'function') {
		setTimeout(() => {
			initializeTypeCatalog().catch(() => { });
		}, 0);
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
