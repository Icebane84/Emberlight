/* Phoenix WebLLM Worker Bridge v2.0.0-ULTIMATE-FUSION
 * Protocols: VSRP-001 / PMIP-001
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
 */
((/** @type {Record<string, any>} */ global) => {
	/* =========================================================================
	 * WORKER SCRIPT (injected via Blob URL)
	 * The worker only understands four message types:
	 *   configure  → initialize the adapter
	 *   generate   → run inference, supports streaming
	 *   destroy    → clean up and self-terminate
	 *   ping       → liveness check
	 * ========================================================================= */
	/**
	 * @param {string} adapterFactorySource
	 * @returns {string}
	 */
	function _buildWorkerSource(adapterFactorySource) {
		return (
			'"use strict";\n' +
			/* ---- Adapter slot ---- */
			"let _adapter = null;\n" +
			"let _seq = 0;\n" +
			"const _abortControllers = new Map();\n" +
			/* ---- Shared Helpers ---- */
			`const SOVEREIGN_ENGINE_CONSTITUTION = ${JSON.stringify(SOVEREIGN_ENGINE_CONSTITUTION)};\n` +
			`${_extractStreamToken.toString()};\n` +
			`${_parseSingleStreamLine.toString()};\n` +
			`${_processStreamBuffer.toString()};\n` +
			`${_consumeOllamaStream.toString()};\n` +
			`${_resolveSamplingOptions.toString()};\n` +
			`${_generateOpenAIChat.toString()};\n` +
			`${_generateOllama.toString()};\n` +
			/* ---- Streaming helper ----
			 * Streams token-by-token back to the host via postMessage.
			 * The generate() method on the adapter must accept an onToken callback
			 * in its options object to enable streaming.
			 */
			"function _streamCallback(reqId, token) {\n" +
			'  self.postMessage({ id: reqId, type: "token", token: String(token) });\n' +
			"}\n" +
			/* ---- Message router ---- */
			"self.onmessage = async function (event) {\n" +
			"  const m = event.data || {};\n" +
			'  const reqId = m.id || ("auto-" + (++_seq));\n' +
			"  try {\n" +
			/* configure */
			'    if (m.type === "configure") {\n' +
			'      if (typeof self.PhoenixLocalModelAdapter !== "function")\n' +
			'        throw new Error("No local model adapter installed in worker.");\n' +
			"      _adapter = await self.PhoenixLocalModelAdapter(m.config || {});\n" +
			'      if (!_adapter || typeof _adapter.generate !== "function")\n' +
			'        throw new Error("Adapter must expose generate(prompt, options).");\n' +
			'      self.postMessage({ id: reqId, type: "configured" });\n' +
			"      return;\n" +
			"    }\n" +
			/* generate */
			'    if (m.type === "generate") {\n' +
			'      if (!_adapter) throw new Error("Adapter not configured.");\n' +
			"      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;\n" +
			"      if (ac) _abortControllers.set(reqId, ac);\n" +
			"      const opts = { ...(m.options || {}) };\n" +
			"      if (ac) opts.signal = ac.signal;\n" +
			"      if (m.streaming) {\n" +
			"        opts.onToken = function(tok) { _streamCallback(reqId, tok); };\n" +
			"      }\n" +
			"      try {\n" +
			"        const result = await _adapter.generate(m.prompt, opts);\n" +
			'        self.postMessage({ id: reqId, type: "result", result: result });\n' +
			"      } finally {\n" +
			"        _abortControllers.delete(reqId);\n" +
			"      }\n" +
			"      return;\n" +
			"    }\n" +
			/* abort */
			'    if (m.type === "abort") {\n' +
			"      const ac = _abortControllers.get(reqId);\n" +
			"      if (ac) {\n" +
			"        ac.abort();\n" +
			"        _abortControllers.delete(reqId);\n" +
			"      }\n" +
			'      self.postMessage({ id: reqId, type: "aborted" });\n' +
			"      return;\n" +
			"    }\n" +
			/* ping */
			'    if (m.type === "ping") {\n' +
			'      self.postMessage({ id: reqId, type: "pong" });\n' +
			"      return;\n" +
			"    }\n" +
			/* destroy */
			'    if (m.type === "destroy") {\n' +
			'      if (_adapter && typeof _adapter.destroy === "function")\n' +
			"        await _adapter.destroy();\n" +
			"      _adapter = null;\n" +
			'      self.postMessage({ id: reqId, type: "destroyed" });\n' +
			"      self.close();\n" +
			"      return;\n" +
			"    }\n" +
			'    throw new Error("Unknown worker message type: " + String(m.type));\n' +
			"  } catch (err) {\n" +
			'    self.postMessage({ id: reqId, type: "error",\n' +
			"      error: String(err && err.message ? err.message : err) });\n" +
			"  }\n" +
			"};\n" +
			/* Inject adapter factory */
			`self.PhoenixLocalModelAdapter = (${adapterFactorySource});\n`
		);
	}

	/* =========================================================================
	 * WEBGPU STUB ADAPTER FACTORY
	 * A complete, drop-in model adapter factory that the host can substitute with
	 * a real WebLLM / llama.cpp.wasm / transformers.js implementation.
	 *
	 * The stub performs no network I/O and returns deterministic placeholder text
	 * so integration tests can run without a real model.
	 * ========================================================================= */
	/**
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

	/* =========================================================================
	 * OLLAMA & OPENAI DUAL STREAMING HELPER
	 * Supports raw Ollama NDJSON ({"response": "..."}) and OpenAI/LM Studio
	 * Server-Sent Events (data: {"choices":[{"delta":{"content":"..."}}]}).
	 * ========================================================================= */
	/**
	 * @param {Record<string, any>} json
	 * @returns {string | null}
	 */
	function _extractStreamToken(json) {
		if (typeof json.response === "string") {
			return json.response;
		}
		const delta = json.choices?.[0]?.delta?.content;
		if (typeof delta === "string") {
			return delta;
		}
		const text = json.choices?.[0]?.text;
		if (typeof text === "string") {
			return text;
		}
		return null;
	}

	/**
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
	 * @param {ReadableStream<Uint8Array>} body
	 * @param {(token: string) => void} onToken
	 * @param {AbortSignal} [signal]
	 * @returns {Promise<string>}
	 */
	async function _consumeOllamaStream(body, onToken, signal) {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let fullText = "";
		let buffer = "";

		const onAbort = () => {
			reader.cancel().catch(() => {});
		};

		if (signal) {
			if (signal.aborted) {
				reader.cancel().catch(() => {});
				throw new Error("[PHOENIX/AI] Inference stream aborted by signal.");
			}
			signal.addEventListener("abort", onAbort, { once: true });
		}

		try {
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
		} finally {
			if (signal) {
				signal.removeEventListener("abort", onAbort);
			}
			reader.releaseLock();
		}
		return fullText;
	}

	/* =========================================================================
	 * OLLAMA LOCAL MODEL ADAPTER FACTORY & ENDPOINT DISPATCHERS
	 * Connects to local Ollama instance (default: http://localhost:11434,
	 * model: qwen2.5-coder:7b) or OpenAI/LM Studio (http://localhost:1234/v1).
	 * Supports streaming with SSE/NDJSON parsing, AbortSignal, and sampling params.
	 * ========================================================================= */
	/**
	 * @param {Record<string, any>} opts
	 */
	function _resolveSamplingOptions(opts) {
		const temperature = opts.temperature ?? 0.2;
		const topP = opts.top_p ?? opts.topP ?? 0.9;
		const repeatPenalty = opts.repeat_penalty ?? opts.repeatPenalty ?? 1.1;
		const maxTokens = opts.maxTokens || 2048;
		return { temperature, topP, repeatPenalty, maxTokens };
	}

	/**
	 * @param {string} host
	 * @param {string} modelName
	 * @param {string} prompt
	 * @param {ReturnType<typeof _resolveSamplingOptions>} sampling
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
		const res = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal,
			body: JSON.stringify({
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
			}),
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
		return data.choices?.[0]?.message?.content || "";
	}

	/**
	 * @param {string} host
	 * @param {string} modelName
	 * @param {string} prompt
	 * @param {ReturnType<typeof _resolveSamplingOptions>} sampling
	 * @param {boolean} isStreaming
	 * @param {((token: string) => void) | undefined} onToken
	 * @param {AbortSignal | undefined} signal
	 */
	async function _generateOllama(host, modelName, prompt, sampling, isStreaming, onToken, signal) {
		const res = await fetch(`${host}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal,
			body: JSON.stringify({
				model: modelName,
				prompt,
				stream: isStreaming,
				options: {
					num_predict: sampling.maxTokens,
					temperature: sampling.temperature,
					top_p: sampling.topP,
					repeat_penalty: sampling.repeatPenalty,
				},
			}),
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

	/* =========================================================================
	 * SOVEREIGN ENGINE CONSTITUTION & PROMPT GENERATOR
	 * Protocols: VSRP-001 / MPFS-001 / PGE-DSL-1
	 * ========================================================================= */
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
	 * Builds a prompt for generating a compliant PGE-DSL-1 proposal from user intent and source code.
	 * @param {string} intent
	 * @param {string} targetFile
	 * @param {string} sourceCode
	 * @returns {string}
	 */
	function buildIntentPrompt(intent, targetFile, sourceCode) {
		const snippet = sourceCode.length > 6000 ? sourceCode.slice(0, 6000) + "\n/* ... remaining source truncated for context ... */" : sourceCode;
		return [
			SOVEREIGN_ENGINE_CONSTITUTION,
			"",
			"TASK INSTRUCTIONS:",
			`Target File: ${targetFile}`,
			`User Intent: ${intent}`,
			"",
			"CURRENT SOURCE CODE:",
			"```javascript",
			snippet,
			"```",
			"",
			"Generate the complete PGE-DSL-1 JSON proposal enclosed in ```json ``` markdown code fences.",
			"Make sure the 'search' string matches EXACT character sequences in the source code."
		].join("\n");
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
			"6. SEARCH ANCHOR INTEGRITY: Ensure the 'search' block in the PGE-DSL-1 change matches the exact target function in the source code.",
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

	/* =========================================================================
	 * PROPOSAL PARSER
	 * Extracts and validates a PGE-DSL-1 proposal from raw LLM output.
	 * ========================================================================= */
	/**
	 * @param {string} rawText
	 * @returns {Record<string, any>}
	 */
	function phoenixProposalParser(rawText) {
		if (typeof rawText !== "string" || !rawText.trim()) {
			throw new Error("[PHOENIX/parser] Empty or non-string LLM output.");
		}

		// 1. Strip markdown fences if present (deterministic non-backtracking split)
		let candidate = rawText;
		const fenceStart = rawText.indexOf("```");
		if (fenceStart !== -1) {
			const afterFirst = rawText.slice(fenceStart + 3);
			const lineBreak = afterFirst.indexOf("\n");
			const contentStart = lineBreak !== -1 ? lineBreak + 1 : 0;
			const fenceEnd = afterFirst.indexOf("```", contentStart);
			if (fenceEnd !== -1) {
				candidate = afterFirst.slice(contentStart, fenceEnd).trim();
			}
		}

		// 2. Extract outermost JSON boundaries
		const start = candidate.indexOf("{");
		const end = candidate.lastIndexOf("}");
		if (start === -1 || end === -1 || end <= start) {
			throw new Error("[PHOENIX/parser] No JSON object boundaries found.");
		}

		const parsed = JSON.parse(candidate.slice(start, end + 1));
		if (!parsed || typeof parsed !== "object") {
			throw new Error("[PHOENIX/parser] Parsed result is not an object.");
		}
		return parsed;
	}

	/* =========================================================================
	 * MAIN BRIDGE CLASS
	 * ========================================================================= */
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

	/* =========================================================================
	 * EXPORTS
	 * ========================================================================= */
	global.PhoenixWebLLMWorkerBridge = PhoenixWebLLMWorkerBridge;
	global.phoenixWebGPUAdapterStubFactory = phoenixWebGPUAdapterStubFactory;
	global.phoenixOllamaAdapterFactory = phoenixOllamaAdapterFactory;
	global.phoenixProposalParser = phoenixProposalParser;
	global.SOVEREIGN_ENGINE_CONSTITUTION = SOVEREIGN_ENGINE_CONSTITUTION;
	global.buildIntentPrompt = buildIntentPrompt;
	global.buildDiagnosticDebugPrompt = buildDiagnosticDebugPrompt;
	global.buildCognitiveDecompositionPrompt = buildCognitiveDecompositionPrompt;
	global.buildBatchDiagnosticDebugPrompt = buildBatchDiagnosticDebugPrompt;

	if (typeof module !== "undefined" && module.exports) {
		module.exports = {
			PhoenixWebLLMWorkerBridge,
			phoenixWebGPUAdapterStubFactory,
			phoenixOllamaAdapterFactory,
			phoenixProposalParser,
			SOVEREIGN_ENGINE_CONSTITUTION,
			buildIntentPrompt,
			buildDiagnosticDebugPrompt,
			buildCognitiveDecompositionPrompt,
			buildBatchDiagnosticDebugPrompt,
		};
	}
})(typeof globalThis !== "undefined" ? globalThis : this);
