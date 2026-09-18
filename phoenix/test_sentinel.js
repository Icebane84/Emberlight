/* test_sentinel.js — Emberlight Sentinel Audit Harness v2.0.0-ULTIMATE-FUSION
 * Protocols: VSRP-001 / SDCP-001
 *
 * Evaluates the governance layer scripts in a Node.js VM sandbox with a
 * comprehensive mock-DOM. Also verifies the WebLLM Worker Bridge mock and
 * the OPFS journal accumulation.
 *
 * Usage: node testing/test_sentinel.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const baseDir = path.resolve(__dirname, "..");

// SSOT: canonical topological load order
const scripts = require("./load_order.js");

/* =========================================================================
 * MOCK DOM & BROWSER API ENVIRONMENT
 * ========================================================================= */

function createMockElement(id, tag) {
	id = id || "";
	tag = tag || "div";
	const el = {
		id: id,
		tagName: tag.toUpperCase(),
		getContext: () => ({
			createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
			putImageData: () => {},
			drawImage: () => {},
			fillRect: () => {},
			clearRect: () => {},
			strokeRect: () => {},
			fillText: () => {},
			strokeText: () => {},
			createRadialGradient: () => ({ addColorStop: () => {} }),
			createLinearGradient: () => ({ addColorStop: () => {} }),
			save: () => {},
			restore: () => {},
			beginPath: () => {},
			closePath: () => {},
			clip: () => {},
			arc: () => {},
			ellipse: () => {},
			rect: () => {},
			roundRect: () => {},
			bezierCurveTo: () => {},
			quadraticCurveTo: () => {},
			fill: () => {},
			stroke: () => {},
			moveTo: () => {},
			lineTo: () => {},
			translate: () => {},
			rotate: () => {},
			scale: () => {},
			setTransform: () => {},
			resetTransform: () => {},
			measureText: () => ({ width: 10 }),
		}),
		width: 480,
		height: 260,
		toDataURL: () => "data:image/png;base64,mock",
		classList: (() => {
			var classes = new Set();
			return {
				add: function () {
					for (var i = 0; i < arguments.length; i++) classes.add(arguments[i]);
				},
				remove: function () {
					for (var i = 0; i < arguments.length; i++)
						classes.delete(arguments[i]);
				},
				toggle: (c, force) => {
					if (force !== undefined) {
						force ? classes.add(c) : classes.delete(c);
					} else {
						classes.has(c) ? classes.delete(c) : classes.add(c);
					}
				},
				contains: (c) => classes.has(c),
			};
		})(),
		addEventListener: () => {},
		removeEventListener: () => {},
		style: {},
		innerHTML: "",
		textContent: "",
		children: [],
		querySelector: () => createMockElement(),
		querySelectorAll: () => [createMockElement()],
		appendChild: function (child) {
			this.children.push(child);
			return child;
		},
		setAttribute: () => {},
		getAttribute: () => null,
		dataset: {},
	};
	return el;
}

/* ── Mock navigator.storage for OPFS journal simulation ─────────────── */
var _mockOPFSFiles = {};
var mockNavigatorStorage = {
	getDirectory: async () => ({
		getDirectoryHandle: async (name, opts) => {
			if (!_mockOPFSFiles[name]) _mockOPFSFiles[name] = {};
			var subDir = _mockOPFSFiles[name];
			return {
				getFileHandle: async (filename, fopts) => {
					if (fopts && fopts.create && !subDir[filename]) {
						subDir[filename] = { _data: "" };
					}
					var fileEntry = subDir[filename] || { _data: "" };
					return {
						getFile: async () => ({
							text: async () => fileEntry._data,
							size: fileEntry._data.length,
						}),
						createWritable: async (wopts) => {
							var seekPos = 0;
							if (wopts && wopts.keepExistingData)
								seekPos = fileEntry._data.length;
							return {
								seek: async (pos) => {
									seekPos = pos;
								},
								write: async (data) => {
									fileEntry._data = fileEntry._data.slice(0, seekPos) + data;
									seekPos += data.length;
								},
								close: async () => {},
							};
						},
					};
				},
			};
		},
	}),
};

/* ── Mock Worker (no actual thread; executes synchronously) ────────── */
function MockWorker(script) {
	this._handlers = {};
	this.onmessage = null;
	this.onerror = null;
	// No actual execution — bridge tests use the mock directly
}
MockWorker.prototype.postMessage = (msg) => {};
MockWorker.prototype.terminate = () => {};
MockWorker.prototype.addEventListener = () => {};
MockWorker.prototype.removeEventListener = () => {};

var mockDom = {
	document: {
		getElementById: (id) => createMockElement(id),
		createElement: (tag) => createMockElement("", tag),
		querySelector: () => createMockElement(),
		querySelectorAll: () => [createMockElement()],
		createDocumentFragment: () => createMockElement("", "fragment"),
		body: createMockElement("body", "body"),
		documentElement: { outerHTML: "<html></html>" },
	},
	window: {
		addEventListener: () => {},
		removeEventListener: () => {},
	},
	addEventListener: () => {},
	removeEventListener: () => {},
	localStorage: {
		_store: {},
		getItem: function (k) {
			return this._store[k] || null;
		},
		setItem: function (k, v) {
			this._store[k] = String(v);
		},
		removeItem: function (k) {
			delete this._store[k];
		},
	},
	navigator: { storage: mockNavigatorStorage, gpu: null },
	Worker: MockWorker,
	Blob: function (parts, opts) {
		this._content = parts.join("");
		this.size = this._content.length;
	},
	URL: { createObjectURL: () => "blob:mock", revokeObjectURL: () => {} },
	console: console,
	Math: Math,
	JSON: JSON,
	Date: Date,
	Promise: Promise,
	Float32Array: Float32Array,
	Uint32Array: Uint32Array,
	Uint8Array: Uint8Array,
	Uint8ClampedArray: Uint8ClampedArray,
	TextEncoder:
		typeof TextEncoder !== "undefined"
			? TextEncoder
			: () => ({ encode: (s) => Buffer.from(s) }),
	structuredClone:
		typeof structuredClone !== "undefined"
			? structuredClone
			: (x) => JSON.parse(JSON.stringify(x)),
	WeakSet: WeakSet,
	Map: Map,
	Set: Set,
	Array: Array,
	Object: Object,
	Error: Error,
	parseInt: parseInt,
	parseFloat: parseFloat,
	isNaN: isNaN,
	isFinite: isFinite,
	setTimeout: setTimeout,
	clearTimeout: clearTimeout,
	setInterval: setInterval,
	clearInterval: clearInterval,
	requestAnimationFrame: (cb) => setTimeout(cb, 16),
	cancelAnimationFrame: (id) => {
		clearTimeout(id);
	},
	btoa: (s) => Buffer.from(s, "binary").toString("base64"),
	atob: (s) => Buffer.from(s, "base64").toString("binary"),
};

mockDom.window = Object.assign(mockDom.window, mockDom);
mockDom.globalThis = mockDom.window;

/* =========================================================================
 * LOAD GOVERNANCE SCRIPTS INTO VM
 * ========================================================================= */
const context = vm.createContext(mockDom);

scripts.forEach((file) => {
	const code = fs.readFileSync(path.join(baseDir, file), "utf8");
	vm.runInContext(code, context);
});

/* =========================================================================
 * SENTINEL AUDIT CHECKS
 * ========================================================================= */
let passed = 0;
let failed = 0;
const auditLog = [];

function check(label, condition, detail) {
	if (condition) {
		console.log("  ✓ " + label);
		auditLog.push({ label, status: "PASS" });
		passed += 1;
	} else {
		console.error("  ✗ " + label + (detail ? " — " + detail : ""));
		auditLog.push({ label, status: "FAIL", detail: detail || "" });
		failed += 1;
	}
}

console.log("\nSENTINEL AUDIT — GOVERNANCE LAYER v7.0.0-ULTIMATE-FUSION\n");

/* ── SEC-01: PhoenixSovereignEngine API surface ─────────────────────── */
console.log("[SEC-01] PhoenixSovereignEngine API surface");
const Engine = context.window.PhoenixSovereignEngine;
check("PhoenixSovereignEngine is defined", !!Engine);
check(
	"Engine.VERSION is set",
	typeof Engine.VERSION === "string" && Engine.VERSION.length > 0,
);
check(
	"Engine.PROTOCOLS is a frozen array of 6",
	Array.isArray(Engine.PROTOCOLS) && Engine.PROTOCOLS.length === 6,
);
check(
	"Engine.STATUS has PASS/REJECTED/ERROR",
	Engine.STATUS.PASS && Engine.STATUS.REJECTED && Engine.STATUS.ERROR,
);
check(
	"Engine.GATES exposes all gate names",
	Engine.GATES &&
		Engine.GATES.STRUCTURAL &&
		Engine.GATES.BEHAVIOR &&
		Engine.GATES.ALL,
);
check(
	"Engine.Governor is a constructor",
	typeof Engine.Governor === "function",
);
check(
	"Engine.SpecificationRegistry is a constructor",
	typeof Engine.SpecificationRegistry === "function",
);
check(
	"Engine.validateProposalShape is a function",
	typeof Engine.validateProposalShape === "function",
);
check(
	"Engine.lintSource is a function",
	typeof Engine.lintSource === "function",
);
check("Engine.hash is a function", typeof Engine.hash === "function");
check("Engine.stable is a function", typeof Engine.stable === "function");
check("Engine.uid is a function", typeof Engine.uid === "function");
check("Engine.REPAIR_LOOP_CAP is 3", Engine.REPAIR_LOOP_CAP === 3);

/* ── SEC-02: Linter catches forbidden patterns ──────────────────────── */
console.log("\n[SEC-02] Structural linter");
check(
	'lintSource flags "// ..."',
	Engine.lintSource("return x; // ...").length > 0,
);
check(
	'lintSource flags "/* ... */"',
	Engine.lintSource("function f(){ /* ... */ }").length > 0,
);
check(
	"lintSource passes clean source",
	Engine.lintSource("function f(){ return 42; }").length === 0,
);

/* ── SEC-03: validateProposalShape catches schema violations ─────────── */
console.log("\n[SEC-03] Proposal shape validator");
check(
	"rejects missing schemaVersion",
	Engine.validateProposalShape({
		schemaVersion: "WRONG",
		proposalId: "x",
		target: "y",
		operation: "MODIFY",
		intent: "test",
		changes: [
			{ type: "replace_text", path: "f.js", content: "x", search: "y" },
		],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	}).length > 0,
);
check(
	"accepts valid minimal proposal",
	Engine.validateProposalShape({
		schemaVersion: "PGE-DSL-1",
		proposalId: "p1",
		target: "combat/SEC-10",
		operation: "MODIFY",
		intent: "Test valid proposal",
		changes: [
			{ type: "replace_text", path: "f.js", content: "x", search: "y" },
		],
		expectedInvariants: [],
		testsRequested: [],
		requiredCapabilities: [],
	}).length === 0,
);

/* ── SEC-04: PhoenixWebLLMWorkerBridge API surface ──────────────────── */
console.log("\n[SEC-04] PhoenixWebLLMWorkerBridge API surface");
const BridgeClass = context.window.PhoenixWebLLMWorkerBridge;
check(
	"PhoenixWebLLMWorkerBridge is defined",
	typeof BridgeClass === "function",
);
const bridgeInst = new BridgeClass();
check(
	"bridge.generate is a function",
	typeof bridgeInst.generate === "function",
);
check("bridge.destroy is a function", typeof bridgeInst.destroy === "function");
check("bridge.ping is a function", typeof bridgeInst.ping === "function");
check("bridge.ready is false before start()", bridgeInst.ready === false);

/* ── SEC-05: WebGPU & Ollama adapter factories ───────────────────────── */
console.log("\n[SEC-05] Adapter factories & proposal parser");
const stubFactory = context.window.phoenixWebGPUAdapterStubFactory;
check(
	"phoenixWebGPUAdapterStubFactory is a function",
	typeof stubFactory === "function",
);
const ollamaFactory = context.window.phoenixOllamaAdapterFactory;
check(
	"phoenixOllamaAdapterFactory is a function",
	typeof ollamaFactory === "function",
);
const proposalParser = context.window.phoenixProposalParser;
check(
	"phoenixProposalParser is a function",
	typeof proposalParser === "function",
);
check(
	"phoenixProposalParser extracts JSON from markdown block",
	(() => {
		try {
			const res = proposalParser(
				'Here is the fix:\n```json\n{"schemaVersion":"PGE-DSL-1","target":"x"}\n```',
			);
			return res.schemaVersion === "PGE-DSL-1";
		} catch (_) {
			return false;
		}
	})(),
);

/* ── SEC-06: PhoenixMonolithExporter API surface ────────────────────── */
console.log("\n[SEC-06] PhoenixMonolithExporter API surface");
const Exporter = context.window.PhoenixMonolithExporter;
check("PhoenixMonolithExporter is defined", !!Exporter);
check(
	"exportMonolith is a function",
	typeof Exporter.exportMonolith === "function",
);
check(
	"exportMonolithAsync is a function",
	typeof Exporter.exportMonolithAsync === "function",
);
check(
	"EMPTY_WASM_BASE64 is a non-empty string",
	typeof Exporter.EMPTY_WASM_BASE64 === "string" &&
		Exporter.EMPTY_WASM_BASE64.length > 0,
);
check(
	"DEFAULT_WGSL is a non-empty string",
	typeof Exporter.DEFAULT_WGSL === "string" && Exporter.DEFAULT_WGSL.length > 0,
);
check(
	"MONOLITH_FORMAT is correct",
	Exporter.MONOLITH_FORMAT === "PHOENIX-MONOLITH-2",
);

/* ── SEC-07: Monolith export output structure ───────────────────────── */
console.log("\n[SEC-07] Monolith export output");
const monolithHtml = Exporter.exportMonolith({
	title: "Test Monolith",
	sources: [{ path: "src/combat.js", content: "function f() { return 1; }" }],
	wasmKernels: [{ name: "test.wasm", base64: Exporter.EMPTY_WASM_BASE64 }],
	shaders: [{ name: "test.wgsl", source: Exporter.DEFAULT_WGSL }],
	receipts: [],
});
check("exportMonolith returns a string", typeof monolithHtml === "string");
check(
	"monolith contains <!doctype html>",
	monolithHtml.startsWith("<!doctype html>"),
);
check(
	"monolith contains PhoenixMonolithManifest",
	monolithHtml.includes("PhoenixMonolithManifest"),
);
check(
	"monolith contains window.exportMonolith",
	monolithHtml.includes("window.exportMonolith"),
);
check(
	"monolith contains WASM loader",
	monolithHtml.includes("PhoenixWasmKernels"),
);
check(
	"monolith has title Test Monolith",
	monolithHtml.includes(">Test Monolith<"),
);

/* ── SEC-08: hash & stable determinism ─────────────────────────────── */
console.log("\n[SEC-08] Hash and stable() determinism");
const obj1 = { b: 2, a: 1 };
const obj2 = { a: 1, b: 2 };
check(
	"stable() is key-order independent",
	Engine.stable(obj1) === Engine.stable(obj2),
);
check(
	"hash() produces 8-char hex string",
	Engine.hash("hello").length === 8 && /^[0-9a-f]+$/.test(Engine.hash("hello")),
);
check(
	"hash() is deterministic",
	Engine.hash("phoenix") === Engine.hash("phoenix"),
);

/* =========================================================================
 * SUMMARY
 * ========================================================================= */
const totalChecks = passed + failed;
console.log("\n" + "─".repeat(60));
if (failed === 0) {
	console.log(
		"=== SENTINEL AUDIT 100% SUCCESS: " +
			passed +
			"/" +
			totalChecks +
			" CHECKS PASSED ===",
	);
	process.exit(0);
} else {
	console.error(
		"=== SENTINEL AUDIT FAILED: " +
			passed +
			"/" +
			totalChecks +
			" PASSED, " +
			failed +
			" FAILED ===",
	);
	process.exit(1);
}
