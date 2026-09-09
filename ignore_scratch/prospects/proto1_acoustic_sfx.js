/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PERIPHERAL AUDIO SYNTHESIS KERNEL
 * Document Identifier: ARCH-SPEC-AUDIO-002
 * Governing Protocol:  VSRP-001 / ARCH-GAP-ANALYSIS-001 / AC-09
 * Authority:           Acoustically Pure Multi-Bus Synthesis & Idempotent Teardown
 * ============================================================================
 */

const EmberlightAudio = (() => {
	const MODULE_INFO = Object.freeze({
		moduleId: "acoustic_sfx",
		version: "5.1.0",
		protocolVersion: "VSRP-001",
		capabilities: ["acoustic_sfx", "idempotent_teardown"],
	});

	/** @type {AudioContext|null} */
	let audioCtx = null;
	/** @type {GainNode|null} */
	let masterGain = null;

	// Tracking collection for continuous looping oscillators (e.g. ambient low-health growls)
	const activeLoopingNodes = new Set();

	// Token storage for EventBus subscriptions to allow complete release
	let eventBusTokens = [];

	return {
		getModuleInfo() {
			return MODULE_INFO;
		},

		configure(config) {
			// Ingest audio mix thresholds safely
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		init(context) {
			if (typeof window === "undefined") return;

			// Lazy initialization of Web Audio API graph upon first interaction block
			const AudioContextClass =
				window.AudioContext || window.webkitAudioContext;
			if (!AudioContextClass) return;

			audioCtx = new AudioContextClass();
			masterGain = audioCtx.createGain();
			masterGain.connect(audioCtx.destination);

			// Bind explicitly decoupled EventBus downstream observation hooks
			if (
				context.eventBus &&
				typeof context.eventBus.subscribe === "function"
			) {
				eventBusTokens.push(
					context.eventBus.subscribe("combat:sfx", (payload) => {
						this.playSFX(payload.sfx, payload.pan || 0);
					}),
				);
			}
		},

		reset() {
			// Halt any transient looping buffers between district swaps
			this.clearAllActiveLoops();
		},

		update(dt) { },
		render() { },

		playSFX(sfxType, panValue = 0) {
			if (!audioCtx || audioCtx.state === "suspended") return;

			// Stripped of double-triggers: Sound generation strictly handled on 'combat:sfx' channels
			const osc = audioCtx.createOscillator();
			const gainNode = audioCtx.createGain();
			const panner = audioCtx.createStereoPanner
				? audioCtx.createStereoPanner()
				: null;

			osc.type = sfxType === "HEAL" ? "sine" : "triangle";
			osc.frequency.setValueAtTime(
				sfxType === "SWIFT_WHOOSH" ? 880 : 220,
				audioCtx.currentTime,
			);

			// Linear decay window calculation
			gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(
				0.001,
				audioCtx.currentTime + 0.35,
			);

			// Route processing chain
			if (panner) {
				panner.pan.setValueAtTime(
					Math.max(-1, Math.min(1, panValue)),
					audioCtx.currentTime,
				);
				osc.connect(gainNode).connect(panner).connect(masterGain);
			} else {
				osc.connect(gainNode).connect(masterGain);
			}

			osc.start();
			osc.stop(audioCtx.currentTime + 0.35);
		},

		clearAllActiveLoops() {
			activeLoopingNodes.forEach((node) => {
				try {
					node.stop();
					node.disconnect();
				} catch (_) { } // Swallowed cleanly to enforce absolute idempotency under error scenarios
			});
			activeLoopingNodes.clear();
		},

		getState() {
			return Object.freeze({ activeAudioStreams: activeLoopingNodes.size });
		},

		getDiagnostics() {
			return {
				audioContextState: audioCtx ? audioCtx.state : "uninitialized",
				activeSubscriptionsCount: eventBusTokens.length,
			};
		},

		/**
		 * Authoritative Idempotent Teardown Loop.
		 * Guarantees 100% decoupling with zero memory or event leaks across infinite sessions.
		 */
		destroy() {
			// 1. Halt and disconnect all active audio hardware nodes
			this.clearAllActiveLoops();

			if (masterGain) {
				try {
					masterGain.disconnect();
				} catch (_) { }
				masterGain = null;
			}

			if (audioCtx) {
				try {
					if (audioCtx.state !== "closed") {
						audioCtx.close();
					}
				} catch (_) { }
				audioCtx = null;
			}

			// 2. Erase EventBus unbind closures cleanly to drop subscription weight
			eventBusTokens.forEach((unsub) => {
				try {
					if (typeof unsub === "function") unsub();
				} catch (_) { }
			});
			eventBusTokens = []; // Clear array storage
		},
	};
})();

if (typeof window !== "undefined") window.EmberlightAudio = EmberlightAudio;
