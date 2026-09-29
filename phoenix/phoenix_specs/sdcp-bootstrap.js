/**
 * ============================================================================
 * ARCH-SDCP-001: SOVEREIGN DEVICE CAPABILITY PROTOCOL BOOTSTRAP
 * Protocol Standard: PSGC-001 [INV-02], [INV-03] / MPFS-001 §2.X / VLT-003
 * Authority: Zero-Dependency Browser Capability Prober & Token Minter
 * ============================================================================
 */

(function (rootScope, factoryDefinition) {
	'use strict';
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = factoryDefinition();
	} else {
		rootScope.SDCPCore = factoryDefinition();
	}
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	//#region [SEC-SDCP-01] CAPABILITY TOKENS & BITMASKS

	const SDCP = Object.freeze({
		// Graphics & Presentation
		CAP_CANVAS_2D: 1n << 0n,
		CAP_OFFSCREEN_CANVAS: 1n << 1n,
		CAP_WEBGL2_CORE: 1n << 2n,
		CAP_WEBGPU_ACCEL: 1n << 3n,
		CAP_GPU_COMPUTE: 1n << 4n,

		// Compute & Concurrency
		CAP_WORKER_THREAD: 1n << 5n,
		CAP_SHARED_MEM: 1n << 6n,
		CAP_WASM_COMPUTE: 1n << 7n,
		CAP_WASM_SIMD: 1n << 8n,
		CAP_SYS_LOCKS: 1n << 9n,

		// Storage & Persistence
		CAP_RAW_STORAGE: 1n << 10n,
		CAP_INDEXED_DB: 1n << 11n,
		CAP_USER_FS: 1n << 12n,
		CAP_OFFLINE_CACHE: 1n << 13n,

		// Audio & Codecs
		CAP_AUDIO_GRAPH: 1n << 14n,
		CAP_AUDIO_DSP: 1n << 15n,
		CAP_MEDIA_CODEC: 1n << 16n,

		// HMI & Peripherals
		CAP_GAMEPAD_IO: 1n << 17n,
		CAP_POINTER_LOCK: 1n << 18n,
		CAP_KEYBOARD_RAW: 1n << 19n,
		CAP_HR_TIMER: 1n << 20n,

		// Networking & Service
		CAP_NET_TRANSPORT: 1n << 21n,
		CAP_NET_P2P: 1n << 22n,
		CAP_SERVICE_WORKER: 1n << 23n
	});

	const SDCP_NAMES = Object.freeze(
		Object.fromEntries(Object.entries(SDCP).map(([ k, v ]) => [ v.toString(), k ]))
	);

	const WASM_SIMD_PROBE_BYTES = new Uint8Array([
		0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
		0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
		0x03, 0x02, 0x01, 0x00,
		0x0a, 0x19, 0x01, 0x17, 0x00,
		0xfd, 0x0c,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x0b
	]);

	//#endregion [SEC-SDCP-01]

	//#region [SEC-SDCP-02] ISOLATED MICRO-PROBES

	function probeSynchronousCapabilities() {
		const results = new Map();

		results.set(SDCP.CAP_HR_TIMER, (() => {
			try { return typeof performance !== 'undefined' && typeof performance.now === 'function'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_CANVAS_2D, (() => {
			try {
				const c = document.createElement('canvas');
				return !!c.getContext('2d');
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_OFFSCREEN_CANVAS, (() => {
			try {
				return typeof OffscreenCanvas !== 'undefined' &&
					typeof OffscreenCanvas.prototype.getContext === 'function';
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_WEBGL2_CORE, (() => {
			try {
				const c = document.createElement('canvas');
				return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_WORKER_THREAD, (() => {
			try { return typeof Worker !== 'undefined'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_SHARED_MEM, (() => {
			try {
				const hasSAB = typeof SharedArrayBuffer !== 'undefined';
				const hasAtomics = typeof Atomics !== 'undefined';
				const isIsolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
				return hasSAB && hasAtomics && isIsolated;
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_WASM_COMPUTE, (() => {
			try {
				return typeof WebAssembly !== 'undefined' &&
					typeof WebAssembly.validate === 'function' &&
					WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_WASM_SIMD, (() => {
			try {
				return typeof WebAssembly !== 'undefined' &&
					typeof WebAssembly.validate === 'function' &&
					WebAssembly.validate(WASM_SIMD_PROBE_BYTES);
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_SYS_LOCKS, (() => {
			try { return typeof navigator !== 'undefined' && 'locks' in navigator && typeof navigator.locks.request === 'function'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_RAW_STORAGE, (() => {
			try {
				const hasStorage = typeof navigator !== 'undefined' && 'storage' in navigator && typeof navigator.storage.getDirectory === 'function';
				const hasSyncHandle = typeof FileSystemFileHandle !== 'undefined' && 'createSyncAccessHandle' in FileSystemFileHandle.prototype;
				return hasStorage && hasSyncHandle;
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_INDEXED_DB, (() => {
			try { return typeof indexedDB !== 'undefined'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_USER_FS, (() => {
			try { return typeof window !== 'undefined' && 'showOpenFilePicker' in window; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_OFFLINE_CACHE, (() => {
			try { return typeof caches !== 'undefined' && typeof caches.open === 'function'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_AUDIO_GRAPH, (() => {
			try { return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_AUDIO_DSP, (() => {
			try {
				return typeof AudioWorkletNode !== 'undefined' &&
					typeof AudioContext !== 'undefined' &&
					'audioWorklet' in AudioContext.prototype;
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_MEDIA_CODEC, (() => {
			try { return typeof VideoDecoder !== 'undefined' && typeof AudioDecoder !== 'undefined'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_GAMEPAD_IO, (() => {
			try { return typeof navigator !== 'undefined' && 'getGamepads' in navigator; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_POINTER_LOCK, (() => {
			try {
				return typeof document !== 'undefined' &&
					('pointerLockElement' in document || 'exitPointerLock' in document);
			} catch (_) { return false; }
		})());

		results.set(SDCP.CAP_KEYBOARD_RAW, (() => {
			try { return typeof KeyboardEvent !== 'undefined' && 'code' in KeyboardEvent.prototype; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_NET_TRANSPORT, (() => {
			try { return typeof WebTransport !== 'undefined'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_NET_P2P, (() => {
			try { return typeof RTCPeerConnection !== 'undefined'; }
			catch (_) { return false; }
		})());

		results.set(SDCP.CAP_SERVICE_WORKER, (() => {
			try { return typeof navigator !== 'undefined' && 'serviceWorker' in navigator; }
			catch (_) { return false; }
		})());

		return results;
	}

	async function probeAsynchronousCapabilities() {
		const asyncResults = new Map();
		asyncResults.set(SDCP.CAP_WEBGPU_ACCEL, false);
		asyncResults.set(SDCP.CAP_GPU_COMPUTE, false);

		try {
			if (typeof navigator !== 'undefined' && 'gpu' in navigator && typeof navigator.gpu.requestAdapter === 'function') {
				const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
				if (adapter) {
					asyncResults.set(SDCP.CAP_WEBGPU_ACCEL, true);
					const device = await adapter.requestDevice();
					if (device) {
						asyncResults.set(SDCP.CAP_GPU_COMPUTE, typeof device.createComputePipeline === 'function');
						device.destroy();
					}
				}
			}
		} catch (_) {
			// Fails closed to false
		}

		return asyncResults;
	}

	//#endregion [SEC-SDCP-02]

	//#region [SEC-SDCP-03] EXECUTION TIER COMPOSER

	function resolveExecutionTiers(tokenMask) {
		const has = function (cap) { return (tokenMask & cap) === cap; };

		let presentationTier = 'CANVAS_2D';
		if (has(SDCP.CAP_WEBGPU_ACCEL) && has(SDCP.CAP_GPU_COMPUTE)) {
			presentationTier = 'WEBGPU_COMPUTE';
		} else if (has(SDCP.CAP_WEBGL2_CORE)) {
			presentationTier = 'WEBGL2';
		}

		let computeTier = 'JS_TYPED_ARRAY';
		if (has(SDCP.CAP_WASM_SIMD)) {
			computeTier = 'WASM_SIMD';
		} else if (has(SDCP.CAP_WASM_COMPUTE)) {
			computeTier = 'WASM_SCALAR';
		}

		let concurrencyTier = 'MAIN_THREAD_SLICED';
		if (has(SDCP.CAP_WORKER_THREAD) && has(SDCP.CAP_SHARED_MEM)) {
			concurrencyTier = 'SHARED_MEM_WORKER';
		} else if (has(SDCP.CAP_WORKER_THREAD)) {
			concurrencyTier = 'TRANSFERABLE_WORKER';
		}

		let storageTier = 'EPHEMERAL_MEM';
		if (has(SDCP.CAP_RAW_STORAGE)) {
			storageTier = 'OPFS_SYNC';
		} else if (has(SDCP.CAP_INDEXED_DB)) {
			storageTier = 'INDEXED_DB';
		}

		let audioTier = 'NULL_AUDIO';
		if (has(SDCP.CAP_AUDIO_GRAPH) && has(SDCP.CAP_AUDIO_DSP)) {
			audioTier = 'WORKLET_DSP';
		} else if (has(SDCP.CAP_AUDIO_GRAPH)) {
			audioTier = 'STANDARD_WEB_AUDIO';
		}

		let networkTier = 'OFFLINE_ISOLATED';
		if (has(SDCP.CAP_NET_TRANSPORT)) {
			networkTier = 'WEBTRANSPORT_QUIC';
		} else if (has(SDCP.CAP_NET_P2P)) {
			networkTier = 'WEBRTC_DATACHANNEL';
		} else if (typeof WebSocket !== 'undefined') {
			networkTier = 'WEBSOCKET_TCP';
		}

		return Object.freeze({
			presentation: presentationTier,
			compute: computeTier,
			concurrency: concurrencyTier,
			storage: storageTier,
			audio: audioTier,
			network: networkTier
		});
	}

	//#endregion [SEC-SDCP-03]

	//#region [SEC-SDCP-04] MASTER BOOTSTRAP INTERFACE

	class SDCPBootstrapEngine {
		static async bootstrap() {
			const startTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
			const syncMap = probeSynchronousCapabilities();
			const asyncMap = await probeAsynchronousCapabilities();

			let tokenMask = 0n;
			const capabilitiesArray = [];

			for (const [ token, supported ] of syncMap.entries()) {
				if (supported) {
					tokenMask |= token;
					capabilitiesArray.push(SDCP_NAMES[ token.toString() ]);
				}
			}

			for (const [ token, supported ] of asyncMap.entries()) {
				if (supported) {
					tokenMask |= token;
					capabilitiesArray.push(SDCP_NAMES[ token.toString() ]);
				}
			}

			const elapsedMs = ((typeof performance !== 'undefined') ? performance.now() : Date.now()) - startTime;
			const tiers = resolveExecutionTiers(tokenMask);

			return Object.freeze({
				tokenMask: tokenMask,
				tokenHex: '0x' + tokenMask.toString(16).toUpperCase(),
				capabilities: Object.freeze(capabilitiesArray),
				tiers: tiers,
				metrics: Object.freeze({
					probeTimeMs: elapsedMs,
					crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false
				}),
				has: function (/** @type {number | bigint} */ capabilityToken) {
					return (this.tokenMask & capabilityToken) === capabilityToken;
				}
			});
		}
	}

	//#endregion [SEC-SDCP-04]

	return Object.freeze({
		SDCP: SDCP,
		Bootstrap: SDCPBootstrapEngine
	});
}));
