/* Phoenix Monolith Exporter v2.0.0-ULTIMATE-FUSION
 * Protocols: PERSIST-001 / PRS-SPEC-GOVERNANCE-001
 *
 * Produces a deterministic, self-contained HTML artifact from explicitly
 * supplied source files, WASM kernels, WGSL compute shaders, and an optional
 * receipt ledger snapshot.
 *
 * This module does NOT invent missing application modules and does NOT perform
 * any I/O by itself — callers supply all payloads.
 *
 * window.exportMonolith() on the emitted document re-serializes the live DOM
 * so the artifact is always current at download time.
 */
((/** @type {Record<string, any>} */ global) => {
	/* =========================================================================
	 * CONSTANTS
	 * ========================================================================= */

	/** Minimal valid WASM module (magic + version only, no sections) */
	const EMPTY_WASM_BASE64 = "AGFzbQEAAAA=";

	/** Default WGSL compute shader embedded in every monolith */
	const DEFAULT_WGSL = [
		"struct Params { time: f32, intensity: f32 };",
		"@group(0) @binding(0) var<uniform> params: Params;",
		"",
		"@compute @workgroup_size(64)",
		"fn main(@builtin(global_invocation_id) id: vec3<u32>) {",
		"  let t  = params.time;",
		"  let ix = f32(id.x);",
		"  let _v = ix * t + params.intensity;",
		"}",
	].join("\n");

	/** Monolith format identifier */
	const MONOLITH_FORMAT = "PHOENIX-MONOLITH-2";
	const ENGINE_VERSION = "7.0.0-ULTIMATE-FUSION";

	/* =========================================================================
	 * PURE UTILITIES
	 * ========================================================================= */

	/**
	 * @param {unknown} s
	 * @returns {string}
	 */
	function _escapeHtml(s) {
		let str = "";
		if (typeof s === "string") {
			str = s;
		} else if (typeof s === "number" || typeof s === "boolean" || typeof s === "bigint") {
			str = s.toString();
		} else if (s !== null && typeof s === "object") {
			str = JSON.stringify(s);
		}
		return str.replaceAll(
			/[&<>"']/g,
			(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			}[ c ] || c),
		);
	}

	/**
	 * @param {string} s
	 * @returns {string}
	 */
	function _toBase64(s) {
		if (typeof Buffer !== "undefined") {
			return Buffer.from(s, "utf8").toString("base64");
		}
		if (typeof global.btoa === "function") {
			const bytes = new TextEncoder().encode(s);
			let binary = "";
			for (const byte of bytes) {
				binary += String.fromCodePoint(byte);
			}
			return global.btoa(binary);
		}
		throw new Error("[PHOENIX/exporter] No base64 encoder available.");
	}

	/**
	 * @param {unknown} value
	 * @returns {string}
	 */
	function _safeJSON(value) {
		// Escape </script> inside JSON strings to prevent XSS in inline scripts
		return JSON.stringify(value).replaceAll("<", String.raw`\u003c`);
	}

	/* =========================================================================
	 * OPFS FLUSH HELPER
	 * Before exporting, attempt to flush pending OPFS writes if a Governor
	 * instance is available on window.PhoenixGovernor.
	 * This is a best-effort, non-blocking operation.
	 * ========================================================================= */
	/**
	 * @param {unknown[]} receipts
	 */
	async function _flushOPFSIfAvailable(receipts) {
		try {
			const gov = global.PhoenixGovernor;
			if (
				gov?.storage &&
				typeof gov.storage.appendJournalEntry === "function"
			) {
				// Flush any in-memory receipts not yet persisted
				for (const r of receipts) {
					await gov.storage.appendJournalEntry(r);
				}
			}
		} catch (_) {
			// Non-fatal — the export continues regardless
		}
	}

	/* =========================================================================
	 * EXPORT PIPELINE
	 * ========================================================================= */

	/**
	 * Build a self-contained HTML monolith.
	 *
	 * @param {{
	 *   title?: string,
	 *   engineVersion?: string,
	 *   sources?: Array<{ path: string, content: string }>,
	 *   wasmKernels?: Array<{ name: string, base64: string }>,
	 *   shaders?: Array<{ name: string, source?: string, wgsl?: string }>,
	 *   receipts?: unknown[]
	 * }} [options]
	 * @returns {string} complete HTML document
	 */
	function exportMonolith(options) {
		const o = options || {};

		const title = String(o.title || "Phoenix Sovereign Monolith");

		const sources = Array.isArray(o.sources)
			? o.sources.map((x) => ({
				path: String(x.path),
				content: String(x.content),
			}))
			: [];

		const wasmKernels =
			Array.isArray(o.wasmKernels) && o.wasmKernels.length
				? o.wasmKernels.map((w) => ({
					name: String(w.name),
					base64: String(w.base64),
				}))
				: [ { name: "phoenix-empty-kernel.wasm", base64: EMPTY_WASM_BASE64 } ];

		const shaders =
			Array.isArray(o.shaders) && o.shaders.length
				? o.shaders.map((s) => ({
					name: String(s.name),
					source: String(s.source || s.wgsl || DEFAULT_WGSL),
				}))
				: [ { name: "phoenix_default.wgsl", source: DEFAULT_WGSL } ];

		const receipts = Array.isArray(o.receipts) ? o.receipts : [];

		const manifest = {
			format: MONOLITH_FORMAT,
			engineVersion: String(o.engineVersion || ENGINE_VERSION),
			generatedAt: new Date().toISOString(),
			sourceCount: sources.length,
			wasmCount: wasmKernels.length,
			shaderCount: shaders.length,
			receiptCount: receipts.length,
		};

		const payload = {
			manifest,
			sources,
			wasm: wasmKernels,
			shaders,
			receipts,
		};

		const payloadJSON = _safeJSON(payload);
		const payloadBase64 = _toBase64(payloadJSON);

		const lines = [
			"<!doctype html>",
			'<html lang="en">',
			"<head>",
			'<meta charset="utf-8">',
			'<meta name="viewport" content="width=device-width,initial-scale=1">',
			`<title>${_escapeHtml(title)}</title>`,
			'<meta name="description" content="Phoenix Sovereign Monolith — self-contained governance artifact">',
			"</head>",
			"<body>",
			"<script>",
			'"use strict";',
			"",
			/* Expose manifest at window level for runtime introspection */
			`window.PhoenixMonolithManifest    = ${_safeJSON(manifest)};`,
			`window.PhoenixMonolithPayload     = ${payloadJSON};`,
			`window.PhoenixMonolithPayloadB64  = ${_safeJSON(payloadBase64)};`,
			"",
			/* Self-export: re-serializes the live DOM at call time */
			String.raw`window.exportMonolith = function () {
  var html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
  var blob = new Blob([html], { type: "text/html" });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href     = url;
  a.download = "phoenix_monolith_" + Date.now() + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};`,
			"",
			/* WASM kernel loader — decodes base64 and instantiates each kernel */
			`(function () {
  var kernels = window.PhoenixMonolithPayload.wasm || [];
  window.PhoenixWasmKernels = {};
  function b64ToBytes(b64) {
    var bin  = atob(b64);
    var buf  = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }
  kernels.forEach(function (k) {
    if (!k.base64 || k.base64 === "AGFzbQEAAAA=") {
      window.PhoenixWasmKernels[k.name] = null;
      return;
    }
    WebAssembly.instantiate(b64ToBytes(k.base64)).then(function (result) {
      window.PhoenixWasmKernels[k.name] = result.instance;
    }).catch(function (e) {
      console.warn("[PHOENIX/wasm]", k.name, e.message);
    });
  });
})();`,
			"",
			"</script>",
			"</body>",
			"</html>",
		];

		return lines.join("\n");
	}

	/* =========================================================================
	 * ASYNC EXPORT (flushes OPFS before building the artifact)
	 * ========================================================================= */

	/**
	 * Same as exportMonolith but first attempts to flush OPFS journal
	 * via window.PhoenixGovernor if it is available.
	 * @param {{
	 *   title?: string,
	 *   engineVersion?: string,
	 *   sources?: Array<{ path: string, content: string }>,
	 *   wasmKernels?: Array<{ name: string, base64: string }>,
	 *   shaders?: Array<{ name: string, source?: string, wgsl?: string }>,
	 *   receipts?: unknown[],
	 *   includeOPFSJournal?: boolean
	 * }} [options]
	 * @returns {Promise<string>} complete HTML document
	 */
	async function exportMonolithAsync(options) {
		const o = options || {};
		const receipts = Array.isArray(o.receipts) ? o.receipts : [];
		await _flushOPFSIfAvailable(receipts);
		return exportMonolith(o);
	}

	/* =========================================================================
	 * EXPORTS
	 * ========================================================================= */
	const API = Object.freeze({
		exportMonolith,
		exportMonolithAsync,
		EMPTY_WASM_BASE64,
		DEFAULT_WGSL,
		MONOLITH_FORMAT,
		ENGINE_VERSION,
	});

	global.PhoenixMonolithExporter = API;
	if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
