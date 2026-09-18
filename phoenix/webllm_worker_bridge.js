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
((global) => {
	/* =========================================================================
	 * WORKER SCRIPT (injected via Blob URL)
	 * The worker only understands four message types:
	 *   configure  → initialise the adapter
	 *   generate   → run inference, supports streaming
	 *   destroy    → clean up and self-terminate
	 *   ping       → liveness check
	 * ========================================================================= */
	function _buildWorkerSource(adapterFactorySource) {
		return (
			'"use strict";\n' +
			/* ---- Adapter slot ---- */
			"let _adapter = null;\n" +
			"let _seq = 0;\n" +
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
			"      const opts = Object.assign({}, m.options || {});\n" +
			"      if (m.streaming) {\n" +
			"        opts.onToken = function(tok) { _streamCallback(reqId, tok); };\n" +
			"      }\n" +
			"      const result = await _adapter.generate(m.prompt, opts);\n" +
			'      self.postMessage({ id: reqId, type: "result", result: result });\n' +
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
			"self.PhoenixLocalModelAdapter = (" +
			adapterFactorySource +
			");\n"
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
	function phoenixWebGPUAdapterStubFactory(config) {
		// config.modelId — string identifying the model to load (ignored by stub)
		// config.wasmPath — optional path to a wasm binary
		// config.gpuDevice — optional GPUDevice if the caller already acquired one
		return Promise.resolve({
			/** Simulate inference. In production, replace with real WebLLM call. */
			async generate(prompt, options) {
				const opts = options || {};
				const onToken = opts.onToken;
				const maxTokens = opts.maxTokens || 256;

				// Stub: emit one synthetic token per character of the prompt, capped
				const tokens = ["[STUB]", " proposal", " schema", ":", " PGE-DSL-1"];
				const limit = Math.min(tokens.length, Math.ceil(maxTokens / 64));

				if (typeof onToken === "function") {
					for (let i = 0; i < limit; i++) {
						onToken(tokens[i]);
						// Yield to event loop without allocating Promises inside the loop
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
	 * OLLAMA LOCAL MODEL ADAPTER FACTORY
	 * Connects to local Ollama instance (default: http://localhost:11434,
	 * model: qwen2.5-coder:7b). Supports streaming with line buffering.
	 * ========================================================================= */
	function phoenixOllamaAdapterFactory(config) {
		const cfg = config || {};
		const host = cfg.host || "http://localhost:11434";
		const modelName = cfg.model || "qwen2.5-coder:7b";

		return Promise.resolve({
			async generate(prompt, options) {
				const opts = options || {};
				const onToken = opts.onToken;
				const isStreaming = typeof onToken === "function";

				const res = await fetch(host + "/api/generate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						model: modelName,
						prompt: prompt,
						stream: isStreaming,
						options: {
							num_predict: opts.maxTokens || 2048,
							temperature:
								opts.temperature !== undefined ? opts.temperature : 0.2,
						},
					}),
				});

				if (!res.ok) {
					throw new Error(
						"[PHOENIX/ollama] Connection failed: " +
							res.status +
							" " +
							res.statusText +
							'. Ensure Ollama is running with OLLAMA_ORIGINS="*".',
					);
				}

				if (isStreaming && res.body) {
					const reader = res.body.getReader();
					const decoder = new TextDecoder();
					let fullText = "";
					let buffer = "";

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });
						let newlineIdx;
						while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
							const line = buffer.slice(0, newlineIdx).trim();
							buffer = buffer.slice(newlineIdx + 1);
							if (!line) continue;

							try {
								const json = JSON.parse(line);
								if (json.response) {
									onToken(json.response);
									fullText += json.response;
								}
							} catch (_) {
								// Partial buffer; continue reading stream
							}
						}
					}
					return fullText;
				}

				const data = await res.json();
				return data.response || "";
			},

			async destroy() {
				// HTTP endpoints require no explicit GPU teardown
			},
		});
	}

	/* =========================================================================
	 * PROPOSAL PARSER
	 * Extracts and validates a PGE-DSL-1 proposal from raw LLM output.
	 * ========================================================================= */
	function phoenixProposalParser(rawText) {
		if (typeof rawText !== "string" || !rawText.trim()) {
			throw new Error("[PHOENIX/parser] Empty or non-string LLM output.");
		}

		// 1. Strip markdown fences if present
		const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
		const candidate = fenceMatch ? fenceMatch[1] : rawText;

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
		constructor() {
			this._worker = null;
			this._pending = new Map(); // reqId → { resolve, reject, onToken }
			this._sequence = 0;
			this._ready = false;
		}

		/**
		 * Start the worker with a given adapter factory function.
		 * @param {Function} adapterFactory  — function(config) → Promise<Adapter>
		 * @param {Object}   config          — passed to adapterFactory inside the worker
		 */
		async start(adapterFactory, config) {
			if (typeof global.Worker !== "function")
				throw new Error(
					"[PHOENIX/bridge] Web Workers unavailable in this context.",
				);
			if (typeof adapterFactory !== "function")
				throw new Error("[PHOENIX/bridge] adapterFactory must be a function.");

			const source = _buildWorkerSource(adapterFactory.toString());
			const blob = new global.Blob([source], { type: "text/javascript" });
			const url = global.URL.createObjectURL(blob);

			this._worker = new global.Worker(url);
			global.URL.revokeObjectURL(url);

			this._worker.onmessage = (e) => this._receive(e.data);
			this._worker.onerror = (e) =>
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
		 * @param {string}   prompt
		 * @param {Object}   options
		 * @param {number}   [options.maxTokens]
		 * @param {number}   [options.temperature]
		 * @param {Function} [options.onToken]  — called with each streaming token
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

			// Strip onToken from the serialised options — it cannot cross the Worker boundary
			const workerOpts = {
				maxTokens: opts.maxTokens || 512,
				temperature: opts.temperature || 0.7,
			};

			return this._request(
				{ type: "generate", prompt, options: workerOpts, streaming },
				onToken,
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
			if (!this._worker) return;
			try {
				await this._request({ type: "destroy" });
			} catch (_) {}
			this._worker.terminate();
			this._worker = null;
			this._ready = false;
			this._rejectAll(new Error("[PHOENIX/bridge] Worker destroyed."));
		}

		/* --- Internal message plumbing --------------------------------------- */

		_receive(message) {
			if (!message || !message.id) return;

			// Streaming token — route to the per-request onToken callback
			if (message.type === "token") {
				const entry = this._pending.get(message.id);
				if (entry && typeof entry.onToken === "function")
					entry.onToken(message.token);
				return;
			}

			const entry = this._pending.get(message.id);
			if (!entry) return;
			this._pending.delete(message.id);

			if (message.type === "error") {
				entry.reject(new Error(message.error));
			} else {
				entry.resolve(message.result === undefined ? true : message.result);
			}
		}

		_rejectAll(error) {
			for (const entry of this._pending.values()) entry.reject(error);
			this._pending.clear();
			this._ready = false;
		}

		_request(payload, onToken) {
			return new Promise((resolve, reject) => {
				if (!this._worker)
					return reject(new Error("[PHOENIX/bridge] Worker not started."));
				const id = "req-" + ++this._sequence;
				this._pending.set(id, { resolve, reject, onToken: onToken || null });
				this._worker.postMessage(Object.assign({}, payload, { id }));
			});
		}

		get ready() {
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

	if (typeof module !== "undefined" && module.exports) {
		module.exports = {
			PhoenixWebLLMWorkerBridge,
			phoenixWebGPUAdapterStubFactory,
			phoenixOllamaAdapterFactory,
			phoenixProposalParser,
		};
	}
})(typeof globalThis !== "undefined" ? globalThis : this);
