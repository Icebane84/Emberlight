/* cSpell:words WebLLM PMIP VSRP PGE NDJSON WebGPU */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: WEBLLM WORKER BRIDGE & PROPOSAL SYNTHESIZER
 * Document Identifier: BRIDGE-001-WEBLLM-WORKER
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host WebWorker Substrate | AI Inference Transduction
 * ============================================================================
 *
 * This bridge transports prompts and results ONLY.
 * The worker is granted ZERO filesystem, proposal-commit,
 * capability, or runtime authority.
 *
 * Contract:
 *   - Never downloads a model without an explicit adapterFactory.
 *   - Never silently falls back to remote inference.
 *   - Never blocks the main thread during inference.
 *   - Supports streaming token callbacks via onToken option.
 *   - WebGPU adapter stub is provided; host supplies the real implementation.
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS (Ctrl+F):
 *   [SEC-01] .......... Line ~35   -- Constants, Sovereign Constitution & Sampling Schemas
 *   [SEC-02] .......... Line ~125  -- WebGPU Adapter Stub & Streaming SSE / Line Processors
 *   [SEC-03] .......... Line ~309  -- Native Ollama & OpenAI-Compatible Model Adapters
 *   [SEC-04] .......... Line ~449  -- Headless Worker Script Generation (_buildWorkerSource)
 *   [SEC-05] .......... Line ~545  -- Context Packer, Prompt Factories & Diagnostic Envelopes
 *   [SEC-06] .......... Line ~838  -- AST Proposal Parser, Code Repair & Sanitizer
 *   [SEC-07] .......... Line ~1023 -- Sovereign Host Bridge Controller (PhoenixWebLLMWorkerBridge)
 *   [SEC-08] .......... Line ~1254 -- Universal Export Envelope & Module Exports
 * ============================================================================
 */
((/** @type {Record<string, any>} */ global) => {
	'use strict';

	//#region [SEC-01] Constants, Sovereign Constitution & Sampling Schemas

	/**
	 * @typedef {Object} SamplingOptions
	 * @property {number} temperature
	 * @property {number} topP
	 * @property {number} repeatPenalty
	 * @property {number} maxTokens
	 * @property {string | null} format
	 */

	const SOVEREIGN_ENGINE_CONSTITUTION = [
		"You are the Phoenix Master Artificer, an expert AI coder operating on Emberlight under the Zero-Dependency Sovereign Engine specification (VSRP-001 / MPFS-001).",
		"",
		"CORE ARCHITECTURAL CONSTITUTION:",
		"1. ZERO NPM / ZERO BUNDLER DEPENDENCIES:",
		"   - Never use import/export statements. Never reference node_modules, npm, or external packages.",
		"   - All modules execute natively in modern browsers via vanilla ES2022+, HTML5 Canvas, and Web Audio.",
		"2. UNIVERSAL DUAL-BINDING IIFE PATTERN:",
		"   All modules must wrap their implementation in a closure and export cleanly:",
		"   const EmberlightModuleName = (() => {",
		"     /* private state / methods */",
		"     return { /* public interface */ };",
		"   })();",
		"   if (typeof window !== 'undefined') window.EmberlightModuleName = EmberlightModuleName;",
		"   if (typeof module !== 'undefined') module.exports = EmberlightModuleName;",
		"3. FARADAY TENANT ISOLATION (VSRP-001):",
		"   - Tier 2 Simulation Tenants (combat, overworld, progression, armory, market, chronicle, status, relic_forge, lockpick, settings) MUST NEVER reference DOM/window/document/localStorage.",
		"   - State ingestion in reset(snapshot) MUST use structuredClone(snapshot). Never mutate host objects.",
		"   - Tenant update(dt, context) must be pure and never mutate input queues.",
		"4. DETERMINISTIC ENTROPY (PRNG):",
		"   - Global Math.random() is strictly forbidden in simulation logic. Use EmberlightPRNG or passed seeds.",
		"5. ZERO PLACEHOLDERS (ANTI-THEATER):",
		"   - Never output placeholder comments such as '// ...', '/* ... */', or 'TODO(impl)'. Provide complete, executable code.",
		"6. OUTPUT SPECIFICATION (PGE-DSL-1):",
		"   When creating or repairing code, output ONLY a valid PGE-DSL-1 JSON proposal object:",
		"   ```json",
		"   {",
		"     \"schemaVersion\": \"PGE-DSL-1\",",
		"     \"proposalId\": \"prop-unique-id\",",
		"     \"target\": \"combat/combat_actions.js\",",
		"     \"operation\": \"MODIFY\",",
		"     \"intent\": \"Concise description of the change\",",
		"     \"requiredCapabilities\": [],",
		"     \"expectedInvariants\": [],",
		"     \"testsRequested\": [],",
		"     \"changes\": [",
		"       {",
		"         \"type\": \"replace_text\",",
		"         \"path\": \"combat/combat_actions.js\",",
		"         \"search\": \"exact string to find in source\",",
		"         \"content\": \"exact replacement string\"",
		"       }",
		"     ],",
		"     \"explanation\": \"Detailed architectural rationale\"",
		"   }",
		"   ```"
	].join("\n");

	/**
	 * @param {Record<string, any>} opts
	 * @returns {SamplingOptions}
	 */
	function _resolveSamplingOptions(opts) {
		const temperature = opts.temperature ?? 0.2;
		const topP = opts.top_p ?? opts.topP ?? 0.9;
		const repeatPenalty = opts.repeat_penalty ?? opts.repeatPenalty ?? 1.1;
		const maxTokens = opts.maxTokens || 2048;
		const format = opts.format || null;
		return { temperature, topP, repeatPenalty, maxTokens, format };
	}

	/**
	 * Determines whether structured PGE-DSL-1 JSON output is requested.
	 * @param {SamplingOptions} sampling
	 * @param {string} prompt
	 * @returns {boolean}
	 */
	function _isJsonRequested(sampling, prompt) {
		if (sampling.format === "json") return true;
		return (
			prompt.includes("PGE-DSL-1") ||
			prompt.includes("```json") ||
			prompt.includes("valid JSON") ||
			prompt.includes("JSON proposal")
		);
	}

	//#endregion [SEC-01]

	//#region [SEC-02] WebGPU Adapter Stub & Streaming SSE / Line Processors

	/**
	 * WEBGPU STUB ADAPTER FACTORY
	 * A complete, drop-in model adapter factory that the host can substitute with
	 * a real WebLLM / llama.cpp.wasm / transformers.js implementation.
	 *
	 * The stub performs no network I/O and returns deterministic placeholder text
	 * so integration tests can run without a real model.
	 * @param {Record<string, unknown>} [_config]
	 */
	function phoenixWebGPUAdapterStubFactory(_config) {
		return Promise.resolve({
			/**
			 * Simulate inference. In production, replace with real WebLLM call.
			 * @param {string} _prompt
			 * @param {{ onToken?: (token: string) => void, maxTokens?: number }} [options]
			 */
			async generate(_prompt, options) {
				const opts = options || {};
				const onToken = opts.onToken;
				const maxTokens = opts.maxTokens || 256;

				const tokens = [ "[STUB]", " proposal", " schema", ":", " PGE-DSL-1" ];
				const limit = Math.min(tokens.length, Math.ceil(maxTokens / 64));

				if (typeof onToken === "function") {
					for (let i = 0; i < limit; i++) {
						onToken(tokens[ i ]);
						await new Promise((r) => {
							setTimeout(r, 0);
						});
					}
				}

				return tokens.slice(0, limit).join("");
			},

			async destroy() {
				// Release any GPU resources here in a real implementation
			},
		});
	}

	/**
	 * Extracts token fragment from OpenAI SSE delta or Ollama response chunk.
	 * @param {Record<string, any>} json
	 * @returns {string | null}
	 */
	function _extractStreamToken(json) {
		if (typeof json.response === "string") {
			return json.response;
		}
		const delta = json.choices?.[ 0 ]?.delta?.content;
		if (typeof delta === "string") {
			return delta;
		}
		const text = json.choices?.[ 0 ]?.text;
		if (typeof text === "string") {
			return text;
		}
		return null;
	}

	/**
	 * Parses a single SSE or NDJSON line, dispatching tokens to callback.
	 * @param {string} rawLine
	 * @param {(token: string) => void} onToken
	 * @returns {string}
	 */
	function _parseSingleStreamLine(rawLine, onToken) {
		let line = rawLine;
		if (line.startsWith("data:")) {
			line = line.slice(5).trim();
		}
		if (!line || line === "[DONE]") {
			return "";
		}
		try {
			const json = JSON.parse(line);
			const token = _extractStreamToken(json);
			if (token) {
				onToken(token);
				return token;
			}
		} catch {
			// Incomplete json chunk; keep in remaining buffer
		}
		return "";
	}

	/**
	 * Iterates line by line through an accumulated text buffer.
	 * @param {string} buffer
	 * @param {(token: string) => void} onToken
	 * @returns {{ fullText: string, remaining: string }}
	 */
	function _processStreamBuffer(buffer, onToken) {
		let fullText = "";
		let rem = buffer;
		let newlineIdx = rem.indexOf("\n");
		while (newlineIdx !== -1) {
			const line = rem.slice(0, newlineIdx).trim();
			rem = rem.slice(newlineIdx + 1);
			if (line) {
				fullText += _parseSingleStreamLine(line, onToken);
			}
			newlineIdx = rem.indexOf("\n");
		}
		return { fullText, remaining: rem };
	}

	/**
	 * Configures early-exit abort handler on stream reader.
	 * @param {AbortSignal | undefined} signal
	 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
	 * @returns {(() => void) | null}
	 * @private
	 */
	function _setupStreamAbort(signal, reader) {
		if (!signal) return null;
		if (signal.aborted) {
			reader.cancel().catch(() => { });
			throw new Error("[PHOENIX/AI] Inference stream aborted by signal.");
		}
		const onAbort = () => { reader.cancel().catch(() => { }); };
		signal.addEventListener("abort", onAbort, { once: true });
		return onAbort;
	}

	/**
	 * Sequentially reads Uint8Array stream chunks until exhaustion or signal abort.
	 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
	 * @param {TextDecoder} decoder
	 * @param {(token: string) => void} onToken
	 * @param {AbortSignal | undefined} signal
	 * @returns {Promise<string>}
	 * @private
	 */
	async function _readStreamLoop(reader, decoder, onToken, signal) {
		let fullText = "";
		let buffer = "";
		while (true) {
			if (signal?.aborted) {
				throw new Error("[PHOENIX/AI] Inference stream aborted by signal.");
			}
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const chunkResult = _processStreamBuffer(buffer, onToken);
			fullText += chunkResult.fullText;
			buffer = chunkResult.remaining;
		}
		if (buffer.length > 0) {
			const finalChunk = _processStreamBuffer(buffer + "\n", onToken);
			fullText += finalChunk.fullText;
		}
		return fullText;
	}

	/**
	 * Consumes a fetch response ReadableStream with real-time token dispatch.
	 * @param {ReadableStream<Uint8Array>} body
	 * @param {(token: string) => void} onToken
	 * @param {AbortSignal} [signal]
	 * @returns {Promise<string>}
	 */
	async function _consumeOllamaStream(body, onToken, signal) {
		const reader = body.getReader();
		const onAbort = _setupStreamAbort(signal, reader);

		try {
			return await _readStreamLoop(reader, new TextDecoder(), onToken, signal);
		} finally {
			if (signal && onAbort) {
				signal.removeEventListener("abort", onAbort);
			}
			reader.releaseLock();
		}
	}

	//#endregion [SEC-02]

	//#region [SEC-03] Native Ollama & OpenAI-Compatible Model Adapters

	/**
	 * @param {string} host
	 * @param {string} modelName
	 * @param {string} prompt
	 * @param {SamplingOptions} sampling
	 * @param {boolean} isStreaming
	 * @param {((token: string) => void) | undefined} onToken
	 * @param {AbortSignal | undefined} signal
	 */
	async function _generateOpenAIChat(host, modelName, prompt, sampling, isStreaming, onToken, signal) {
		let baseHost = host;
		while (baseHost.endsWith("/")) {
			baseHost = baseHost.slice(0, -1);
		}
		const endpoint = host.endsWith("/chat/completions") ? host : `${baseHost}/chat/completions`;
		const isJsonRequested = _isJsonRequested(sampling, prompt);

		/** @type {Record<string, any>} */
		const bodyPayload = {
			model: modelName,
			messages: [
				{ role: "system", content: SOVEREIGN_ENGINE_CONSTITUTION },
				{ role: "user", content: prompt }
			],
			stream: isStreaming,
			max_tokens: sampling.maxTokens,
			temperature: sampling.temperature,
			top_p: sampling.topP,
			presence_penalty: (sampling.repeatPenalty - 1.0) * 0.5,
		};
		if (isJsonRequested) {
			bodyPayload.response_format = { type: "json_object" };
		}
		const res = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal,
			body: JSON.stringify(bodyPayload),
		});

		if (!res.ok) {
			throw new Error(
				`[PHOENIX/AI] OpenAI/LM Studio endpoint failed: ${res.status} ${res.statusText}. Target: ${endpoint}`,
			);
		}

		if (isStreaming && res.body && typeof onToken === "function") {
			return _consumeOllamaStream(res.body, onToken, signal);
		}

		const data = await res.json();
		return data.choices?.[ 0 ]?.message?.content || "";
	}

	/**
	 * @param {string} host
	 * @param {string} modelName
	 * @param {string} prompt
	 * @param {SamplingOptions} sampling
	 * @param {boolean} isStreaming
	 * @param {((token: string) => void) | undefined} onToken
	 * @param {AbortSignal | undefined} signal
	 */
	async function _generateOllama(host, modelName, prompt, sampling, isStreaming, onToken, signal) {
		const isJsonRequested = _isJsonRequested(sampling, prompt);

		/** @type {Record<string, any>} */
		const bodyPayload = {
			model: modelName,
			prompt,
			system: SOVEREIGN_ENGINE_CONSTITUTION,
			stream: isStreaming,
			options: {
				num_predict: sampling.maxTokens,
				temperature: sampling.temperature,
				top_p: sampling.topP,
				repeat_penalty: sampling.repeatPenalty,
			},
		};
		if (isJsonRequested) {
			bodyPayload.format = "json";
		}
		const res = await fetch(`${host}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal,
			body: JSON.stringify(bodyPayload),
		});

		if (!res.ok) {
			throw new Error(
				`[PHOENIX/ollama] Connection failed: ${res.status} ${res.statusText}. Ensure Ollama is running with OLLAMA_ORIGINS="*".`,
			);
		}

		if (isStreaming && res.body && typeof onToken === "function") {
			return _consumeOllamaStream(res.body, onToken, signal);
		}

		const data = await res.json();
		return data.response || "";
	}

	/**
	 * @param {{ host?: string, model?: string }} [config]
	 */
	function phoenixOllamaAdapterFactory(config) {
		const cfg = config || {};
		const host = cfg.host || "http://localhost:11434";
		const modelName = cfg.model || "qwen2.5-coder:7b";
		const isOpenAIEndpoint = host.includes("/v1") || host.includes(":1234");

		return Promise.resolve({
			/**
			 * @param {string} prompt
			 * @param {{ onToken?: (token: string) => void, maxTokens?: number, temperature?: number, top_p?: number, topP?: number, repeat_penalty?: number, repeatPenalty?: number, signal?: AbortSignal }} [options]
			 */
			async generate(prompt, options) {
				const opts = options || {};
				const onToken = opts.onToken;
				const isStreaming = typeof onToken === "function";
				const sampling = _resolveSamplingOptions(opts);

				if (isOpenAIEndpoint) {
					return _generateOpenAIChat(host, modelName, prompt, sampling, isStreaming, onToken, opts.signal);
				}

				return _generateOllama(host, modelName, prompt, sampling, isStreaming, onToken, opts.signal);
			},

			async destroy() {
				// HTTP endpoints require no explicit GPU teardown
			},
		});
	}

	//#endregion [SEC-03]

	//#region [SEC-04] Headless Worker Script Generation (_buildWorkerSource)

	/**
	 * Template source for the headless background WebWorker inference thread.
	 * Kept as an array of string literals so worker-scoped globals (_adapter, _seq,
	 * _abortControllers) are isolated from host TypeScript static analysis.
	 */
	const _WORKER_SCRIPT_TEMPLATE = [
		'"use strict";',
		'let _adapter = null;',
		'let _seq = 0;',
		'const _abortControllers = new Map();',
		'function _streamCallback(reqId, token) {',
		'  self.postMessage({ id: reqId, type: "token", token: String(token) });',
		'}',
		'async function _workerHandleConfigure(m, reqId) {',
		'  if (typeof self.PhoenixLocalModelAdapter !== "function")',
		'    throw new Error("No local model adapter installed in worker.");',
		'  _adapter = await self.PhoenixLocalModelAdapter(m.config || {});',
		'  if (!_adapter || typeof _adapter.generate !== "function")',
		'    throw new Error("Adapter must expose generate(prompt, options).");',
		'  self.postMessage({ id: reqId, type: "configured" });',
		'}',
		'async function _workerHandleGenerate(m, reqId) {',
		'  if (!_adapter) throw new Error("Adapter not configured.");',
		'  const ac = typeof AbortController !== "undefined" ? new AbortController() : null;',
		'  if (ac) _abortControllers.set(reqId, ac);',
		'  const opts = { ...(m.options || {}) };',
		'  if (ac) opts.signal = ac.signal;',
		'  if (m.streaming) opts.onToken = function (tok) { _streamCallback(reqId, tok); };',
		'  try {',
		'    const result = await _adapter.generate(m.prompt, opts);',
		'    self.postMessage({ id: reqId, type: "result", result: result });',
		'  } finally {',
		'    _abortControllers.delete(reqId);',
		'  }',
		'}',
		'function _workerHandleAbort(m, reqId) {',
		'  const ac = _abortControllers.get(reqId);',
		'  if (ac) { ac.abort(); _abortControllers.delete(reqId); }',
		'  self.postMessage({ id: reqId, type: "aborted" });',
		'}',
		'function _workerHandlePing(m, reqId) {',
		'  self.postMessage({ id: reqId, type: "pong" });',
		'}',
		'async function _workerHandleDestroy(m, reqId) {',
		'  if (_adapter && typeof _adapter.destroy === "function") await _adapter.destroy();',
		'  _adapter = null;',
		'  self.postMessage({ id: reqId, type: "destroyed" });',
		'  self.close();',
		'}',
		'const _WORKER_ROUTER = {',
		'  configure: _workerHandleConfigure,',
		'  generate: _workerHandleGenerate,',
		'  abort: _workerHandleAbort,',
		'  ping: _workerHandlePing,',
		'  destroy: _workerHandleDestroy',
		'};',
		'self.onmessage = async function (event) {',
		'  const m = event.data || {};',
		'  const reqId = m.id || ("auto-" + (++_seq));',
		'  try {',
		'    const handler = _WORKER_ROUTER[m.type];',
		'    if (!handler) throw new Error("Unknown worker message type: " + String(m.type));',
		'    await handler(m, reqId);',
		'  } catch (err) {',
		'    self.postMessage({ id: reqId, type: "error", error: String(err && err.message ? err.message : err) });',
		'  }',
		'};'
	].join('\n');

	/**
	 * Synthesizes self-contained worker source blob with serialized helper closures.
	 * @param {string} adapterFactorySource
	 * @returns {string}
	 */
	function _buildWorkerSource(adapterFactorySource) {
		return [
			_WORKER_SCRIPT_TEMPLATE,
			`const SOVEREIGN_ENGINE_CONSTITUTION = ${JSON.stringify(SOVEREIGN_ENGINE_CONSTITUTION)};`,
			_extractStreamToken.toString(),
			_parseSingleStreamLine.toString(),
			_processStreamBuffer.toString(),
			_setupStreamAbort.toString(),
			_readStreamLoop.toString(),
			_consumeOllamaStream.toString(),
			_resolveSamplingOptions.toString(),
			_isJsonRequested.toString(),
			_generateOpenAIChat.toString(),
			_generateOllama.toString(),
			`self.PhoenixLocalModelAdapter = (${adapterFactorySource});`
		].join('\n');
	}

	//#endregion [SEC-04]

	//#region [SEC-05] Context Packer, Prompt Factories & Diagnostic Envelopes

	/**
	 * Slices targeted snippet around active line or selection boundary.
	 * @param {string} sourceCode
	 * @param {number | null} activeLine
	 * @param {string | undefined} selectedText
	 * @param {number} [maxChars=2500]
	 * @returns {string}
	 * @private
	 */
	function _extractTargetSnippet(sourceCode, activeLine, selectedText, maxChars = 2500) {
		if (typeof selectedText === 'string' && selectedText.trim().length > 0) {
			return selectedText.trim();
		}
		if (typeof activeLine === 'number' && activeLine > 0) {
			const lines = sourceCode.split('\n');
			const start = Math.max(0, activeLine - 12);
			const end = Math.min(lines.length, activeLine + 11);
			return lines.slice(start, end).join('\n');
		}
		if (sourceCode.length > maxChars) {
			return sourceCode.slice(0, maxChars) + '\n/* ... truncated ... */';
		}
		return sourceCode;
	}

	/**
	 * Resolves active line from explicit parameter or first diagnostic with line.
	 * @param {number | undefined} activeLine
	 * @param {Array<{ line?: number }> | undefined} diagnostics
	 * @returns {number | null}
	 * @private
	 */
	function _resolveDiagnosticLine(activeLine, diagnostics) {
		if (typeof activeLine === 'number' && activeLine > 0) return activeLine;
		if (Array.isArray(diagnostics) && diagnostics.length > 0) {
			const found = diagnostics.find(d => typeof d.line === 'number' && d.line > 0);
			if (found && typeof found.line === 'number') return found.line;
		}
		return null;
	}

	/**
	 * Formats diagnostic array into numbered invariant failure list.
	 * @param {Array<{ rule?: string, message?: string, line?: number, col?: number, severity?: string }> | undefined} diagnostics
	 * @returns {string}
	 * @private
	 */
	function _formatDiagnosticList(diagnostics) {
		if (!Array.isArray(diagnostics) || diagnostics.length === 0) {
			return 'No diagnostic errors reported.';
		}
		return diagnostics.map((d, i) =>
			`${i + 1}. [${d.severity || 'err'}] Line ${d.line || '?'}, Col ${d.col || '?'}: (${d.rule || 'ERROR'}) ${d.message || 'Issue'}`
		).join('\n');
	}

	/**
	 * Builds a prompt for generating a compliant PGE-DSL-1 proposal from user intent and source code.
	 * @param {string} intent
	 * @param {string} targetFile
	 * @param {string} sourceCode
	 * @param {{ activeLine?: number, selectedText?: string }} [options]
	 * @returns {string}
	 */
	function buildIntentPrompt(intent, targetFile, sourceCode, options = {}) {
		const activeLine = (options && typeof options.activeLine === 'number' && options.activeLine > 0) ? options.activeLine : null;
		const snippet = _extractTargetSnippet(sourceCode, activeLine, options.selectedText, 2500);

		return [
			'PGE-DSL-1 INTENT SPECIFICATION:',
			`Target: ${targetFile}${activeLine ? ' @ Line ' + activeLine : ''}`,
			`User Intent: ${intent}`,
			'',
			'TARGET CODE SNIPPET:',
			'```javascript',
			snippet,
			'```',
			'',
			'DIRECTIVE & SURGICAL MANDATE:',
			'1. Address the User Intent with SURGICAL PRECISION. Touch ONLY the lines necessary (1-5 lines max).',
			'2. Do NOT rewrite the entire file or surrounding unaffected code.',
			'3. Output ONLY a valid PGE-DSL-1 JSON proposal enclosed in ```json ``` code fences matching this schema:',
			'```json',
			'{',
			'  "schemaVersion": "PGE-DSL-1",',
			`  "target": "${targetFile}",`,
			'  "changes": [',
			'    {',
			'      "type": "replace_text",',
			`      "path": "${targetFile}",`,
			'      "search": "exact minimal code to replace from TARGET CODE SNIPPET",',
			'      "content": "repaired code to put in place of search"',
			'    }',
			'  ]',
			'}',
			'```',
			'Ensure "search" matches EXACT character sequences in the target snippet.'
		].join('\n');
	}

	/**
	 * Builds a focused PGE-DSL-1 prompt for diagnosing and repairing linter/runtime errors in a file.
	 * @param {string} targetFile
	 * @param {string} sourceCode
	 * @param {Array<{ rule?: string, message?: string, line?: number, col?: number, severity?: string }>} diagnostics
	 * @param {number} [activeLine]
	 * @returns {string}
	 */
	function buildDiagnosticDebugPrompt(targetFile, sourceCode, diagnostics, activeLine) {
		const diagList = (diagnostics || []).map((d, i) =>
			`${i + 1}. [${d.severity || "err"}] Line ${d.line || "?"}, Col ${d.col || "?"}: (${d.rule || "ERROR"}) ${d.message || "Unknown error"}`
		).join("\n");

		const snippet = sourceCode.length > 8000 ? sourceCode.slice(0, 8000) + "\n/* ... truncated for context ... */" : sourceCode;

		return [
			SOVEREIGN_ENGINE_CONSTITUTION,
			"",
			"DIAGNOSTIC & BUG FIXING DIRECTIVE:",
			`Target File: ${targetFile}`,
			activeLine ? `Focused Line: ${activeLine}` : "",
			"",
			"REPORTED DIAGNOSTICS & ERRORS TO FIX:",
			diagList || "No specific diagnostic strings provided — perform full static and architectural code review.",
			"",
			"CURRENT FILE SOURCE CODE:",
			"```javascript",
			snippet,
			"```",
			"",
			"CRITICAL REPAIR INSTRUCTIONS:",
			"1. Fix EVERY reported diagnostic and structural issue in the file.",
			"2. If addressing high cognitive complexity, invert nested conditions into early-return guard clauses and extract pure helper functions placed immediately above the target function.",
			"3. Ensure all replacement 'search' anchors match EXACT character sequences from CURRENT FILE SOURCE CODE.",
			"4. Maintain 100% zero-dependency compliance (no import/export, no placeholders, full dual-binding IIFE).",
			"5. Output ONLY a valid PGE-DSL-1 JSON proposal enclosed in ```json ``` code fences."
		].filter(Boolean).join("\n");
	}

	/**
	 * Builds a focused PGE-DSL-1 prompt for decomposing a high cognitive complexity function into pure helpers & guard clauses.
	 * @param {string} targetFile
	 * @param {string} sourceCode
	 * @param {{ name?: string, line?: number, complexity?: number, codeSlice?: string }} fnInfo
	 * @returns {string}
	 */
	function buildCognitiveDecompositionPrompt(targetFile, sourceCode, fnInfo) {
		const fnName = fnInfo?.name || 'targetFunction';
		const line = fnInfo?.line || 1;
		const complexity = fnInfo?.complexity || 20;
		const snippet = fnInfo?.codeSlice || sourceCode;

		return [
			SOVEREIGN_ENGINE_CONSTITUTION,
			"",
			"COGNITIVE COMPLEXITY REDUCTION & SAFE DECOMPOSITION DIRECTIVE:",
			`Target File: ${targetFile}`,
			`Target Function: '${fnName}' (Line ${line}, Cognitive Complexity Score: ${complexity}/15)`,
			"",
			"OBJECTIVE:",
			`Refactor and decompose function '${fnName}' so its cognitive complexity score drops to <= 15 (ideal: <= 10) without breaking any runtime behavior, contracts, or side-effects.`,
			"",
			"TARGET FUNCTION CODE TO REFACTOR:",
			"```javascript",
			snippet,
			"```",
			"",
			"DECOMPOSITION ARCHITECTURAL RULES:",
			"1. EARLY-RETURN GUARD CLAUSES: Invert nested if/else ladders into early-return guard clauses to eliminate nested control flow levels.",
			"2. PURE HELPER EXTRACTION: Extract discrete sub-operations into small, pure helper functions placed immediately ABOVE the target function.",
			"3. STRICT JSDOC CONTRACTS: Decorate every extracted helper function with explicit JSDoc typing (@param, @returns).",
			"4. CONTRACT & SIGNATURE INVARIANCE: Preserve the EXACT name, parameter list, return type, and external state mutations of the original function.",
			"5. ZERO DEPENDENCIES: Use only standard browser-native JavaScript ES2022+ with no external npm packages or placeholders.",
			"6. SEARCH ANCHOR INTEGRITY: The 'search' property MUST be the EXACT verbatim text of the target function from the source code above. NEVER invent placeholder comments or fictional comments.",
			"7. INVARIANTS & TESTS REGISTRY: Set \"expectedInvariants\": [] and \"testsRequested\": [] to empty arrays [] (do not write English sentences in these arrays; they are reserved for registered test IDs).",
			"",
			"Output ONLY a valid PGE-DSL-1 JSON proposal enclosed in ```json ``` code fences."
		].join("\n");
	}

	/**
	 * Builds a structured batch remediation prompt for multiple unresolved diagnostics across a target file.
	 * @param {string} targetFile
	 * @param {string} sourceCode
	 * @param {Array<{ rule?: string, message?: string, line?: number, col?: number, severity?: string, fnName?: string }>} diagnostics
	 * @returns {string}
	 */
	function buildBatchDiagnosticDebugPrompt(targetFile, sourceCode, diagnostics) {
		const diagList = (diagnostics || []).map((d, i) =>
			`${i + 1}. [${d.severity || 'warn'}] Line ${d.line || '?'}, Col ${d.col || '?'}: (${d.rule || 'ERROR'}) ${d.message || 'Issue'}`
		).join('\n');

		const snippet = sourceCode.length > 8000 ? sourceCode.slice(0, 8000) + '\n/* ... truncated for context ... */' : sourceCode;

		return [
			SOVEREIGN_ENGINE_CONSTITUTION,
			'',
			'BATCH ERROR REMEDIATION DIRECTIVE (ERL-001):',
			`Target File: ${targetFile}`,
			`Total Issues to Resolve: ${(diagnostics || []).length}`,
			'',
			'REPORTED DIAGNOSTIC BATCH TO RESOLVE:',
			diagList || 'Resolve all static and architectural linter issues.',
			'',
			'CURRENT FILE SOURCE CODE:',
			'```javascript',
			snippet,
			'```',
			'',
			'BATCH RESOLUTION MANDATE:',
			'1. Return a single PGE-DSL-1 proposal with a discrete change entry for each diagnostic.',
			'2. Every replacement change MUST have a "search" anchor matching exact code in the CURRENT FILE SOURCE CODE.',
			'3. For JSDoc typing, add complete @param / @returns contracts above functions.',
			'4. For high complexity functions, extract pure helpers and invert nested logic into early-return guard clauses.',
			'5. Maintain 100% zero-dependency compliance (pure vanilla JS ES2022+).',
			'',
			'Output ONLY a valid PGE-DSL-1 JSON proposal enclosed in ```json ``` code fences.'
		].filter(Boolean).join('\n');
	}

	/**
	 * Builds an ultra-compact Machine Diagnostic Sensor Envelope (<150 tokens) for local AI copilots.
	 * Eliminates static constitutional text dumps and focuses context on active AST symbols, memory offsets,
	 * failing diagnostics, and ERL-001 canonical remediation patterns.
	 * @param {string} targetFile - Target file path
	 * @param {string} sourceCode - Full or sliced file source text
	 * @param {Array<{ rule?: string, message?: string, line?: number, col?: number, severity?: string }>} diagnostics - Diagnostics to repair
	 * @param {number} [activeLine] - Active line focus
	 * @param {Object} [options] - Additional telemetry options
	 * @param {Array<{ name: string, kind?: string }>} [options.symbols] - Extracted AST symbols
	 * @param {{ searchPattern: string, replacePattern: string }} [options.erlMatch] - Matched ERL-001 template
	 * @param {{ totalBytes: number, fields: Array<{ name: string, type: string, offset: number }> }} [options.memoryLayout] - PERSIST-001 memory layout
	 * @returns {string} Lean prompt envelope
	 */
	function buildMachineDiagnosticEnvelope(targetFile, sourceCode, diagnostics, activeLine, options = {}) {
		const symbols = options.symbols || [];
		const symbolStr = symbols.length > 0
			? symbols.slice(0, 10).map(s => `${s.kind || 'sym'}:${s.name}`).join(' ')
			: 'none';

		const erlMatch = options.erlMatch || null;
		const erlDirective = erlMatch
			? `\nERL-001 TEMPLATE:\nSearch: ${erlMatch.searchPattern}\nReplace: ${erlMatch.replacePattern}`
			: '';

		const memoryStr = options.memoryLayout
			? `\nPERSIST-001 HEAP: ${options.memoryLayout.totalBytes}/1952B (${options.memoryLayout.fields?.length || 0} fields)`
			: '';

		const resolvedLine = _resolveDiagnosticLine(activeLine, diagnostics);
		const focusedSnippet = _extractTargetSnippet(sourceCode, resolvedLine, '', 2000);
		const diagList = _formatDiagnosticList(diagnostics);
		const lineFocusStr = resolvedLine ? ' @ Line ' + resolvedLine : '';

		return [
			'[ANTIGRAVITY TELEMETRY SENSOR ENVELOPE: VLT-003]',
			`Target: ${targetFile}${lineFocusStr}`,
			`Symbols: ${symbolStr}`,
			memoryStr,
			'FAILING INVARIANTS:',
			diagList,
			erlDirective,
			'',
			'TARGET CODE SNIPPET:',
			'```javascript',
			focusedSnippet,
			'```',
			'',
			'DIRECTIVE: Resolve deterministically. Zero dependencies.',
			'SURGICAL MANDATE: Minimal 1-5 line fix. Do NOT rewrite unaffected code.',
			'Output ONLY a valid PGE-DSL-1 JSON proposal enclosed in ```json ``` code fences:',
			'```json',
			'{',
			'  "schemaVersion": "PGE-DSL-1",',
			`  "target": "${targetFile}",`,
			'  "changes": [',
			'    {',
			'      "type": "replace_text",',
			`      "path": "${targetFile}",`,
			'      "search": "exact minimal line(s) to replace from snippet",',
			'      "content": "repaired line(s) to replace search"',
			'    }',
			'  ]',
			'}',
			'```',
			'Ensure "search" matches EXACT character sequences in snippet.'
		].filter(Boolean).join('\n');
	}

	//#endregion [SEC-05]

	//#region [SEC-06] AST Proposal Parser, Code Repair & Sanitizer

	/**
	 * Validates that proposal change blocks do not contain lazy truncation tokens.
	 * @param {Record<string, any>} proposal
	 */
	function validateProposalStructuralCompleteness(proposal) {
		if (!proposal || !Array.isArray(proposal.changes)) return;
		for (let i = 0; i < proposal.changes.length; i++) {
			const ch = proposal.changes[ i ];
			const content = ch?.content || '';
			if (content.includes('// ...') || content.includes('/* ... */') || content.includes('TODO(impl)')) {
				throw new Error(`[PHOENIX/parser] Change #${i + 1} contains forbidden placeholder token ('// ...' or '/* ... */'). Full un-truncated code is strictly required.`);
			}
		}
	}

	/**
	 * Strips markdown code fences and LLM thinking traces from text.
	 * @param {string} rawText
	 * @returns {string}
	 * @private
	 */
	function _stripMarkdownFences(rawText) {
		let candidate = typeof rawText === 'string' ? rawText : String(rawText || '');
		// Strip model reasoning traces (<think>...</think>)
		candidate = candidate.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

		const fenceStart = candidate.indexOf("```");
		if (fenceStart !== -1) {
			const afterFirst = candidate.slice(fenceStart + 3);
			const lineBreak = afterFirst.indexOf("\n");
			const contentStart = lineBreak !== -1 ? lineBreak + 1 : 0;
			const fenceEnd = afterFirst.indexOf("```", contentStart);
			if (fenceEnd !== -1) {
				candidate = afterFirst.slice(contentStart, fenceEnd).trim();
			}
		}
		return candidate;
	}

	/**
	 * Resolves extracted code property from fallback JSON candidate.
	 * @param {Record<string, any>} parsed
	 * @returns {string}
	 * @private
	 */
	function _resolveFallbackCode(parsed) {
		if (typeof parsed.code === 'string') return parsed.code;
		if (typeof parsed.repairedCode === 'string') return parsed.repairedCode;
		if (typeof parsed.content === 'string') return parsed.content;
		return '';
	}

	/**
	 * Synthesizes replacement changes from loose JSON response fields.
	 * @param {Record<string, any>} parsed
	 * @returns {Array<Record<string, any>> | null}
	 * @private
	 */
	function _synthesizeFallbackChanges(parsed) {
		if (typeof parsed.search === 'string' && (typeof parsed.content === 'string' || typeof parsed.replace === 'string')) {
			const content = typeof parsed.content === 'string' ? parsed.content : String(parsed.replace);
			return [ {
				type: 'replace_text',
				search: parsed.search,
				content
			} ];
		}
		const fallbackCode = _resolveFallbackCode(parsed);
		if (fallbackCode) {
			return [ { type: 'create_file', content: fallbackCode } ];
		}
		return null;
	}

	/**
	 * Populates default change operation types and target path bindings.
	 * @param {Array<Record<string, any>>} changes
	 * @param {string | undefined} target
	 * @private
	 */
	function _fillChangeDefaults(changes, target) {
		for (const ch of changes) {
			if (!ch.type) {
				ch.type = ch.search ? 'replace_text' : 'create_file';
			}
			if (!ch.path && target) {
				ch.path = target;
			}
		}
	}

	/**
	 * Normalizes changes array inside a parsed proposal object.
	 * @param {Record<string, any>} parsed
	 * @private
	 */
	function _normalizeParsedChanges(parsed) {
		if (!Array.isArray(parsed.changes)) {
			const synthesized = _synthesizeFallbackChanges(parsed);
			if (synthesized) parsed.changes = synthesized;
		}

		if (Array.isArray(parsed.changes)) {
			_fillChangeDefaults(parsed.changes, parsed.target);
		}
	}

	/**
	 * Normalizes envelope metadata fields and filters invariant tokens.
	 * @param {Record<string, any>} parsed
	 * @private
	 */
	function _normalizeEnvelopeFields(parsed) {
		if (!parsed.schemaVersion) parsed.schemaVersion = 'PGE-DSL-1';
		if (!parsed.operation) parsed.operation = 'MODIFY';
		if (!parsed.intent || typeof parsed.intent !== 'string') parsed.intent = 'AI synthesized proposal';
		if (!Array.isArray(parsed.requiredCapabilities)) parsed.requiredCapabilities = [];
		if (!Array.isArray(parsed.expectedInvariants)) parsed.expectedInvariants = [];
		if (!Array.isArray(parsed.testsRequested)) parsed.testsRequested = [];

		validateProposalStructuralCompleteness(parsed);

		const isIdentifier = (/** @type {string} */ val) => typeof val === 'string' && /^[A-Za-z0-9_$:-]+$/.test(val.trim());
		parsed.expectedInvariants = parsed.expectedInvariants.filter(isIdentifier);
		parsed.testsRequested = parsed.testsRequested.filter(isIdentifier);
	}

	/**
	 * Synthesizes a full proposal envelope from raw code when JSON tags are absent.
	 * @param {string} candidate
	 * @returns {Record<string, any> | null}
	 * @private
	 */
	function _synthesizeRawCodeProposal(candidate) {
		const isCode = candidate.includes('function') || candidate.includes('const') || candidate.includes('let') || candidate.includes('class');
		if (!isCode) return null;
		return {
			schemaVersion: 'PGE-DSL-1',
			proposalId: `prop-ai-${Date.now().toString(36)}`,
			operation: 'MODIFY',
			intent: 'AI synthesized code repair',
			requiredCapabilities: [],
			expectedInvariants: [],
			testsRequested: [],
			changes: [ { type: 'create_file', content: candidate } ]
		};
	}

	/**
	 * Extracts and validates a PGE-DSL-1 proposal from raw LLM output.
	 * @param {string} rawText
	 * @returns {Record<string, any>}
	 */
	function phoenixProposalParser(rawText) {
		if (typeof rawText !== "string" || !rawText.trim()) {
			throw new Error("[PHOENIX/parser] Empty or non-string LLM output.");
		}

		// 1. Strip markdown fences if present
		const candidate = _stripMarkdownFences(rawText);

		// 2. Extract outermost JSON boundaries
		const start = candidate.indexOf("{");
		const end = candidate.lastIndexOf("}");
		if (start === -1 || end === -1 || end <= start) {
			const fallback = _synthesizeRawCodeProposal(candidate);
			if (fallback) return fallback;
			throw new Error("[PHOENIX/parser] No JSON object boundaries found.");
		}

		const parsed = JSON.parse(candidate.slice(start, end + 1));
		if (!parsed || typeof parsed !== "object") {
			throw new Error("[PHOENIX/parser] Parsed result is not an object.");
		}

		_normalizeParsedChanges(parsed);
		_normalizeEnvelopeFields(parsed);

		return parsed;
	}

	//#endregion [SEC-06]

	//#region [SEC-07] Sovereign Host Bridge Controller (PhoenixWebLLMWorkerBridge)

	/**
	 * Sovereign Host Bridge Controller for local WebWorker inference.
	 */
	class PhoenixWebLLMWorkerBridge {
		/** @type {Worker | null} */
		_worker = null;
		/** @type {Map<string, { resolve: (val: any) => void, reject: (err: any) => void, onToken: ((tok: string) => void) | null }>} */
		_pending = new Map();
		_sequence = 0;
		_ready = false;

		constructor() {
			this._pending = new Map();
			this._sequence = 0;
			this._ready = false;
		}

		/**
		 * Start the worker with a given adapter factory function.
		 * @param {Function} adapterFactory - function(config) → Promise<Adapter>
		 * @param {Record<string, unknown>} [config] - passed to adapterFactory inside the worker
		 */
		async start(adapterFactory, config) {
			if (typeof global.Worker !== "function")
				throw new Error(
					"[PHOENIX/bridge] Web Workers unavailable in this context.",
				);
			if (typeof adapterFactory !== "function")
				throw new Error("[PHOENIX/bridge] adapterFactory must be a function.");

			const source = _buildWorkerSource(adapterFactory.toString());
			const blob = new global.Blob([ source ], { type: "text/javascript" });
			const url = global.URL.createObjectURL(blob);

			const worker = new global.Worker(url);
			this._worker = worker;
			global.URL.revokeObjectURL(url);

			worker.onmessage = (/** @type {MessageEvent} */ e) => this._receive(e.data);
			worker.onerror = (/** @type {ErrorEvent} */ e) =>
				this._rejectAll(
					new Error(
						e.message || "Phoenix worker encountered an unhandled error.",
					),
				);

			await this._request({ type: "configure", config: config || {} });
			this._ready = true;
			return this;
		}

		/* --- Inference -------------------------------------------------------- */

		/**
		 * Generate text from a prompt.
		 * @param {string} prompt
		 * @param {{ maxTokens?: number, temperature?: number, top_p?: number, topP?: number, repeat_penalty?: number, repeatPenalty?: number, onToken?: (tok: string) => void, signal?: AbortSignal }} [options]
		 * @returns {Promise<string>}
		 */
		generate(prompt, options) {
			if (!this._ready)
				throw new Error(
					"[PHOENIX/bridge] Worker is not ready. Call start() first.",
				);
			if (typeof prompt !== "string" || prompt.length === 0)
				throw new Error("[PHOENIX/bridge] prompt must be a non-empty string.");

			const opts = options || {};
			const onToken = opts.onToken;
			const streaming = typeof onToken === "function";
			const signal = opts.signal;

			if (signal?.aborted) {
				return Promise.reject(new Error("[PHOENIX/bridge] Generation aborted by signal."));
			}

			// Strip non-transferable callbacks from the serialized options across Worker boundary
			const workerOpts = {
				maxTokens: opts.maxTokens || 512,
				temperature: opts.temperature ?? 0.7,
				top_p: opts.top_p ?? opts.topP ?? 0.9,
				repeat_penalty: opts.repeat_penalty ?? opts.repeatPenalty ?? 1.1,
			};

			return this._request(
				{ type: "generate", prompt, options: workerOpts, streaming },
				onToken,
				signal,
			);
		}

		/**
		 * Generates and validates a PGE-DSL-1 proposal with upstream self-healing.
		 * @param {string} prompt
		 * @param {Record<string, any>} [options]
		 * @param {number} [maxTrials=3]
		 * @returns {Promise<{ proposal: Record<string, any>; rawText: string; trials: number }>}
		 */
		async generateProposalWithSelfHealing(prompt, options, maxTrials = 3) {
			let currentPrompt = prompt;
			let lastError = null;
			for (let trial = 1; trial <= maxTrials; trial++) {
				try {
					const rawText = await this.generate(currentPrompt, options);
					const proposal = phoenixProposalParser(rawText);
					return { proposal, rawText, trials: trial };
				} catch (err) {
					lastError = err;
					if (trial < maxTrials) {
						const errMsg = err instanceof Error ? err.message : String(err);
						currentPrompt = `${prompt}\n\nCRITICAL SELF-REVISION ERROR (Trial ${trial}):\n${errMsg}\nYou MUST emit 100% complete replacement code with NO abbreviations or '// ...' tokens. Output strictly valid PGE-DSL-1 JSON:\n`;
					}
				}
			}
			throw lastError || new Error("[PHOENIX/bridge] Self-healing failed to produce a valid proposal.");
		}

		/* --- Liveness --------------------------------------------------------- */

		ping() {
			if (!this._worker)
				throw new Error("[PHOENIX/bridge] Worker is not started.");
			return this._request({ type: "ping" });
		}

		/* --- Teardown --------------------------------------------------------- */

		async destroy() {
			const worker = this._worker;
			if (!worker) return;
			try {
				await this._request({ type: "destroy" });
			} catch (_) { }
			worker.terminate();
			this._worker = null;
			this._ready = false;
			this._rejectAll(new Error("[PHOENIX/bridge] Worker destroyed."));
		}

		/* --- Internal message plumbing --------------------------------------- */

		/**
		 * @param {{ id?: string, type?: string, token?: string, error?: string, result?: any }} message
		 */
		_receive(message) {
			if (!message?.id) return;

			// Streaming token — route to the per-request onToken callback
			if (message.type === "token") {
				const entry = this._pending.get(message.id);
				if (typeof entry?.onToken === "function") {
					entry.onToken(message.token || "");
				}
				return;
			}

			const entry = this._pending.get(message.id);
			if (!entry) return;
			this._pending.delete(message.id);

			if (message.type === "aborted") {
				entry.reject(new Error("[PHOENIX/bridge] Request aborted by worker."));
			} else if (message.type === "error") {
				entry.reject(new Error(message.error || "Unknown worker error"));
			} else {
				entry.resolve(message.result === undefined ? true : message.result);
			}
		}

		/**
		 * @param {Error} error
		 */
		_rejectAll(error) {
			for (const entry of this._pending.values()) entry.reject(error);
			this._pending.clear();
			this._ready = false;
		}

		/**
		 * @param {Record<string, unknown>} payload
		 * @param {((tok: string) => void) | null | undefined} [onToken]
		 * @param {AbortSignal} [signal]
		 * @returns {Promise<any>}
		 */
		_request(payload, onToken, signal) {
			return new Promise((resolve, reject) => {
				const worker = this._worker;
				if (!worker)
					return reject(new Error("[PHOENIX/bridge] Worker not started."));
				const id = `req-${++this._sequence}`;

				let onAbort = null;
				if (signal) {
					onAbort = () => {
						try {
							worker.postMessage({ type: "abort", id });
						} catch (_) { }
						this._pending.delete(id);
						reject(new Error("[PHOENIX/bridge] Request aborted by signal."));
					};
					signal.addEventListener("abort", onAbort, { once: true });
				}

				this._pending.set(id, {
					resolve: (res) => {
						if (signal && onAbort) signal.removeEventListener("abort", onAbort);
						resolve(res);
					},
					reject: (err) => {
						if (signal && onAbort) signal.removeEventListener("abort", onAbort);
						reject(err);
					},
					onToken: onToken || null,
				});
				worker.postMessage({ ...payload, id });
			});
		}

		get ready() {
			return this._ready;
		}

		get isReady() {
			return this._ready;
		}
	}

	//#endregion [SEC-07]

	//#region [SEC-08] Universal Export Envelope & Module Exports

	global.PhoenixWebLLMWorkerBridge = PhoenixWebLLMWorkerBridge;
	global.phoenixWebGPUAdapterStubFactory = phoenixWebGPUAdapterStubFactory;
	global.phoenixOllamaAdapterFactory = phoenixOllamaAdapterFactory;
	global.phoenixProposalParser = phoenixProposalParser;
	global.PhoenixProposalParser = phoenixProposalParser;
	global.SOVEREIGN_ENGINE_CONSTITUTION = SOVEREIGN_ENGINE_CONSTITUTION;
	global.buildIntentPrompt = buildIntentPrompt;
	global.buildDiagnosticDebugPrompt = buildDiagnosticDebugPrompt;
	global.buildCognitiveDecompositionPrompt = buildCognitiveDecompositionPrompt;
	global.buildBatchDiagnosticDebugPrompt = buildBatchDiagnosticDebugPrompt;
	global.buildMachineDiagnosticEnvelope = buildMachineDiagnosticEnvelope;

	if (typeof module !== "undefined" && module.exports) {
		module.exports = {
			PhoenixWebLLMWorkerBridge,
			phoenixWebGPUAdapterStubFactory,
			phoenixOllamaAdapterFactory,
			phoenixProposalParser,
			PhoenixProposalParser: phoenixProposalParser,
			SOVEREIGN_ENGINE_CONSTITUTION,
			buildIntentPrompt,
			buildDiagnosticDebugPrompt,
			buildCognitiveDecompositionPrompt,
			buildBatchDiagnosticDebugPrompt,
			buildMachineDiagnosticEnvelope,
		};
	}

	//#endregion [SEC-08]
})(typeof globalThis !== "undefined" ? globalThis : this);
