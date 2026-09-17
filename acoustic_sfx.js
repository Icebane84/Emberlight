/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: SPATIAL AUDIO & CONVOLUTION ENGINE
 * Document Identifier: VSRP-001-ACOUSTIC-SFX
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Module State, Type Definitions & Acoustic Zone Profiles
 *   [SEC-02] AudioContext Guards & Gesture Unlock Gateway
 *   [SEC-03] Convolution Engine & Algorithmic Impulse Baking
 *   [SEC-04] Spatial Routing Pipeline & Parametric Tone Synthesis
 *   [SEC-05] Canonical SFX Waveform Registry
 *   [SEC-06] Spatial Kinematics & Panning Calculators
 *   [SEC-07] Peripheral Driver Interface & EventBus Arbitration
 *   [SEC-08] Global Export & Dual-Binding Registration
 * ============================================================================
 */

const EmberlightAcousticSFX = (() => {
	//#region [SEC-01] Module State, Type Definitions & Acoustic Zone Profiles
	/**
	 * Canonical acoustic environment zone keys.
	 * @typedef {'MEADOW' | 'TOWN' | 'CRYPT' | string} ZoneKey
	 */

	/**
	 * Acoustic impulse profile configuration.
	 * @typedef {Object} ZoneProfile
	 * @property {number} dry - Direct signal gain coefficient in [0, 1].
	 * @property {number} wet - Convolved reverberant signal gain coefficient in [0, 1].
	 * @property {number} decay - Reverb duration decay time in seconds.
	 * @property {number} power - Exponential decay curve steepness power factor.
	 */

	/**
	 * Health and telemetry diagnostic descriptor for the acoustic subsystem.
	 * @typedef {Object} AcousticDiagnostics
	 * @property {'acoustic_sfx_driver'} serviceId - Registered service identity.
	 * @property {string} contextState - Active AudioContext state ('running' | 'suspended' | 'uninitialized').
	 * @property {ZoneKey} activeZone - Active acoustic profile zone.
	 * @property {boolean} userUnlocked - Autoplay gesture unlock flag.
	 * @property {boolean} isMuted - Global master mute flag.
	 * @property {number} activeNodeCount - Currently active playing oscillator nodes.
	 * @property {number} dryLevel - Active dry bus gain level.
	 * @property {number} wetLevel - Active convolution wet bus gain level.
	 */

	/**
	 * Event payload for generic audio and cue broadcasts.
	 * @typedef {Object} GenericSfxPayload
	 * @property {string} [sfx] - Primary SFX identifier key.
	 * @property {string} [cue] - Fallback acoustic cue token.
	 * @property {number} [pan] - Stereo panning offset in [-1.0, 1.0].
	 */

	/**
	 * Event payload for combat-specific audio events.
	 * @typedef {Object} CombatSfxPayload
	 * @property {string} [sfx] - Combat SFX identifier key.
	 * @property {'party' | 'enemy' | string} [targetType] - Target affiliation wing.
	 * @property {number} [targetIndex] - Target entity slot index.
	 */

	/**
	 * Event payload for overworld movement steps.
	 * @typedef {Object} OverworldStepPayload
	 * @property {Object} [pos] - Grid coordinate descriptor.
	 * @property {number} pos.x - Horizontal map grid position.
	 * @property {number} pos.y - Vertical map grid position.
	 * @property {number} [pos.depth] - Subterranean dungeon depth layer.
	 * @property {boolean} [pos.inTown] - Town settlement safety flag.
	 * @property {number} [mapWidth] - Total map tile width for panning calculations.
	 */

	/**
	 * Event payload for administrative system commands.
	 * @typedef {Object} SystemCommandPayload
	 * @property {string} [command] - System command token (e.g., 'TOGGLE_MUTE').
	 */

	/**
	 * Synchronous EventBus consumer contract.
	 * @typedef {Object} EventBusSubscriber
	 * @property {(event: string, handler: (payload?: any) => void) => (() => void)} subscribe - Bus listener registry.
	 * @property {(event: string, payload?: any) => void} [publish] - Bus event broadcaster.
	 */

	/**
	 * Host context dictionary or direct EventBus handle injected on initialization.
	 * @typedef {EventBusSubscriber | { eventBus?: EventBusSubscriber }} AcousticContext
	 */

	/** @type {AudioContext | any} */
	let ctx = null;
	let isMuted = false;
	/** @type {GainNode | null} */
	let masterGain = null;
	/** @type {GainNode | null} */
	let dryBus = null;
	/** @type {GainNode | null} */
	let wetBus = null;
	/** @type {ConvolverNode | null} */
	let convolverNode = null;
	let userHasInteracted = false;
	/** @type {ZoneKey} */
	let currentZone = "MEADOW";
	let stepFootToggle = false;
	let noiseSeed = 1337;

	/** @type {Set<AudioNode>} */
	const activeNodes = new Set();
	/** @type {Map<string, AudioBuffer>} */
	const impulseBuffers = new Map();

	/**
	 * Pre-configured acoustic environment zone definitions.
	 * @type {Readonly<Record<string, ZoneProfile>>}
	 */
	const ZONE_PROFILES = Object.freeze({
		MEADOW: { dry: 0.95, wet: 0.05, decay: 0.25, power: 3.5 },
		TOWN: { dry: 0.82, wet: 0.18, decay: 0.65, power: 2.2 },
		CRYPT: { dry: 0.52, wet: 0.48, decay: 2.4, power: 1.6 },
	});
	//#endregion

	//#region [SEC-02] AudioContext Guards & Gesture Unlock Gateway
	/**
	 * Safely unwraps an EventBus instance from an arbitrary host context.
	 * Pure resolution procedure.
	 *
	 * @param {AcousticContext | any} [busRef] - Direct EventBus reference or host context container.
	 * @returns {EventBusSubscriber | null} Resolved EventBus reference.
	 */
	function resolveEventBus(busRef) {
		if (busRef && typeof busRef.subscribe === "function") {
			return busRef;
		}
		if (busRef?.eventBus && typeof busRef.eventBus.subscribe === "function") {
			return busRef.eventBus;
		}
		return null;
	}

	/**
	 * Initializes the Web Audio API context, master bus, and convolution pipeline.
	 * State-mutating audio subsystem initialization procedure.
	 *
	 * @returns {void}
	 */
	function ensureContext() {
		if (!userHasInteracted || typeof window === "undefined") return;
		if (!ctx) {
			const AudioCtx =
				window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
			if (!AudioCtx) return;
			try {
				ctx = new AudioCtx();

				// Master Output Stage
				const mGain = ctx.createGain();
				mGain.gain.setValueAtTime(isMuted ? 0.0 : 1.0, ctx.currentTime);
				mGain.connect(ctx.destination);

				// Parallel Dry and Wet Acoustic Busses
				const dBus = ctx.createGain();
				const wBus = ctx.createGain();
				if (typeof ctx.createConvolver === "function") {
					const cNode = ctx.createConvolver();
					cNode.connect(wBus);
					convolverNode = cNode;
				}

				dBus.connect(mGain);
				wBus.connect(mGain);

				masterGain = mGain;
				dryBus = dBus;
				wetBus = wBus;

				// Pre-bake Algorithmic Impulse Buffers
				bakeImpulseResponses();
				applyZoneProfile(currentZone);
			} catch {
				// Ignored: AudioContext creation may fail if Web Audio is unsupported in mock or headless contexts
				ctx = null;
			}
		}
		if (ctx?.state === "suspended") {
			ctx.resume().catch(() => {
				// Ignored: Promise rejected if browser autoplay policy prevents resumption prior to gesture
			});
		}
	}

	/**
	 * Attaches one-time DOM interaction listeners to unlock the Web Audio context.
	 * State-mutating browser autoplay mitigation procedure.
	 *
	 * @returns {void}
	 */
	function armUserGestureUnlock() {
		if (
			typeof window === "undefined" ||
			typeof window.addEventListener !== "function"
		)
			return;
		const unlockHandler = () => {
			userHasInteracted = true;
			ensureContext();
			window.removeEventListener("click", unlockHandler);
			window.removeEventListener("keydown", unlockHandler);
			window.removeEventListener("touchstart", unlockHandler);
		};
		window.addEventListener("click", unlockHandler, { once: true });
		window.addEventListener("keydown", unlockHandler, { once: true });
		window.addEventListener("touchstart", unlockHandler, { once: true });
	}
	//#endregion

	//#region [SEC-03] Convolution Engine & Algorithmic Impulse Baking
	/**
	 * Generates deterministic pseudo-random white noise in [-1.0, 1.0].
	 * State-mutating DSP math procedure.
	 *
	 * @returns {number} White noise amplitude sample.
	 */
	function nextAcousticNoise() {
		noiseSeed = Math.trunc(noiseSeed + 0x6d2b79f5);
		let t = noiseSeed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2.0 - 1.0;
	}

	/**
	 * Generates procedural impulse response audio buffers for convolution reverb.
	 * State-mutating DSP math synthesis procedure.
	 *
	 * @returns {void}
	 */
	function bakeImpulseResponses() {
		if (!ctx || typeof ctx.createBuffer !== "function") return;
		const sampleRate = ctx.sampleRate || 44100;

		try {
			Object.entries(ZONE_PROFILES).forEach(([zoneKey, profile]) => {
				const length = Math.floor(sampleRate * profile.decay);
				const impulse = ctx.createBuffer(2, length, sampleRate);
				const left = impulse.getChannelData(0);
				const right = impulse.getChannelData(1);

				for (let i = 0; i < length; i++) {
					const t = i / length;
					const decayEnvelope = (1.0 - t) ** profile.power;
					left[i] = nextAcousticNoise() * decayEnvelope;
					right[i] = nextAcousticNoise() * decayEnvelope;
				}
				impulseBuffers.set(zoneKey, impulse);
			});
		} catch (_) {
			// Ignored: Buffer allocation can fail if mock environment lacks full Web Audio support
		}
	}

	/**
	 * Transitions dynamic acoustic dry/wet levels and swaps the active convolution buffer.
	 * State-mutating DSP mixer procedure.
	 *
	 * @param {ZoneKey} zoneKey - Target zone configuration key.
	 * @returns {void}
	 */
	function applyZoneProfile(zoneKey) {
		currentZone = ZONE_PROFILES[zoneKey] ? zoneKey : "MEADOW";
		if (!ctx || !dryBus || !wetBus) return;

		const profile = ZONE_PROFILES[currentZone];
		if (convolverNode) {
			const buffer = impulseBuffers.get(currentZone);
			if (buffer) {
				convolverNode.buffer = buffer;
			}
		}

		const t = ctx.currentTime;
		if (dryBus.gain && typeof dryBus.gain.setTargetAtTime === "function") {
			dryBus.gain.setTargetAtTime(profile.dry, t, 0.05);
		}
		if (wetBus.gain && typeof wetBus.gain.setTargetAtTime === "function") {
			wetBus.gain.setTargetAtTime(profile.wet, t, 0.05);
		}
	}
	//#endregion

	//#region [SEC-04] Spatial Routing Pipeline & Parametric Tone Synthesis
	/**
	 * Routes an audio node into stereo panner nodes, dry bus, and convolution nodes.
	 * State-mutating Web Audio graph connection procedure.
	 *
	 * @param {AudioNode} sourceNode - Audio graph origin node.
	 * @param {number} [panValue=0.0] - Clamped stereo pan coefficient in [-1.0, 1.0].
	 * @returns {void}
	 */
	function routeSpatialSource(sourceNode, panValue = 0.0) {
		if (!ctx || !dryBus) return;
		const clampedPan = Math.max(-1.0, Math.min(1.0, panValue));

		/** @type {StereoPannerNode | null} */
		let panner = null;
		if (typeof ctx.createStereoPanner === "function") {
			try {
				const localPanner = ctx.createStereoPanner();
				localPanner.pan.setValueAtTime(clampedPan, ctx.currentTime);
				panner = localPanner;
			} catch {
				// Ignored: StereoPannerNode instantiation can fail in headless or unsupported browser engines
				panner = null;
			}
		}

		if (panner) {
			sourceNode.connect(panner);
			panner.connect(dryBus);
			if (convolverNode) {
				panner.connect(convolverNode);
			}
		} else {
			sourceNode.connect(dryBus);
			if (convolverNode) {
				sourceNode.connect(convolverNode);
			}
		}
	}

	/**
	 * Synthesizes and schedules a localized tone with an exponential envelope.
	 * State-mutating parametric audio synthesis procedure.
	 *
	 * @param {number} freq - Pitch frequency in Hertz.
	 * @param {OscillatorType} type - Standard oscillator waveform shape.
	 * @param {number} startTime - Web Audio scheduling start timestamp in seconds.
	 * @param {number} duration - Tone duration in seconds.
	 * @param {number} [pan=0.0] - Stereo field pan position in [-1.0, 1.0].
	 * @param {number} [gainStart=0.15] - Initial peak volume gain level.
	 * @param {number} [gainEnd=0.001] - Final decay volume gain floor.
	 * @returns {void}
	 */
	function scheduleSpatialTone(
		freq,
		type,
		startTime,
		duration,
		pan = 0.0,
		gainStart = 0.15,
		gainEnd = 0.001,
	) {
		if (isMuted) return;
		ensureContext();
		if (!ctx || !masterGain) return;

		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();

			const safeStartGain = Math.max(0.0001, gainStart);
			const safeEndGain = Math.max(0.0001, gainEnd);
			const safeFreq = Math.max(10, freq);

			osc.type = type;
			osc.frequency.setValueAtTime(safeFreq, startTime);

			gain.gain.setValueAtTime(safeStartGain, startTime);
			gain.gain.exponentialRampToValueAtTime(safeEndGain, startTime + duration);

			osc.connect(gain);
			routeSpatialSource(gain, pan);

			osc.start(startTime);
			osc.stop(startTime + duration);

			activeNodes.add(osc);
			osc.onended = () => {
				activeNodes.delete(osc);
				try {
					gain.disconnect();
					osc.disconnect();
				} catch (_) {
					// Ignored: Audio nodes may already be detached from the graph
				}
			};
		} catch (_) {
			// Ignored: Audio graph scheduling may fail if AudioContext is closed or invalid
		}
	}
	//#endregion

	//#region [SEC-05] Canonical SFX Waveform Registry
	/**
	 * Authoritative procedural synthesizer definitions for game audio cues.
	 * @type {Record<string, (pan?: number) => void>}
	 */
	const SFX_REGISTRY = {
		/**
		 * UI selection confirmation blip.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		SELECT(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			scheduleSpatialTone(520, "square", ctx.currentTime, 0.06, pan, 0.1);
		},

		/**
		 * Overworld walking footstep with alternating left/right pan.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		STEP(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			stepFootToggle = !stepFootToggle;
			let stepPan = pan;
			if (stepPan === 0.0) {
				stepPan = stepFootToggle ? -0.12 : 0.12;
			}
			scheduleSpatialTone(
				110,
				"triangle",
				ctx.currentTime,
				0.035,
				stepPan,
				0.045,
			);
		},

		/**
		 * Kinetic weapon impact with frequency drop.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		ATTACK_HIT(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			try {
				const t = ctx.currentTime;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();

				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(170, t);
				osc.frequency.exponentialRampToValueAtTime(35, t + 0.14);

				gain.gain.setValueAtTime(0.22, t);
				gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

				osc.connect(gain);
				routeSpatialSource(gain, pan);

				osc.start(t);
				osc.stop(t + 0.14);
				activeNodes.add(osc);
				osc.onended = () => {
					activeNodes.delete(osc);
					try {
						gain.disconnect();
						osc.disconnect();
					} catch (_) {
						// Ignored: Audio nodes may already be detached from the graph
					}
				};
			} catch (_) {
				// Ignored: Sound synthesis scheduling error in restricted audio contexts
			}
		},

		/**
		 * Arcane projectile whoosh.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		SPELL_BOLT(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(620, "sine", t, 0.18, pan, 0.16);
			scheduleSpatialTone(880, "sine", t + 0.06, 0.15, pan + 0.1, 0.14);
		},

		/**
		 * Resonant restoration chime chord.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		HEAL(pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(330, "triangle", t, 0.16, pan - 0.1, 0.15);
			scheduleSpatialTone(440, "triangle", t + 0.08, 0.16, pan, 0.15);
			scheduleSpatialTone(660, "triangle", t + 0.16, 0.26, pan + 0.1, 0.15);
		},

		/**
		 * Combat encounter start warning stinger.
		 * @param {number} [_pan=0.0]
		 * @returns {void}
		 */
		ENCOUNTER_TRIGGER(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(240, "square", t, 0.08, -0.3, 0.18);
			scheduleSpatialTone(190, "square", t + 0.07, 0.08, 0.0, 0.18);
			scheduleSpatialTone(140, "square", t + 0.14, 0.16, 0.3, 0.22);
		},

		/**
		 * Triumphant ascending victory fanfare.
		 * @param {number} [_pan=0.0]
		 * @returns {void}
		 */
		VICTORY(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			const notes = [523.25, 523.25, 523.25, 659.25, 783.99];
			notes.forEach((freq, idx) => {
				const sweepPan = -0.4 + (idx / (notes.length - 1)) * 0.8;
				scheduleSpatialTone(
					freq,
					"square",
					t + idx * 0.11,
					0.16,
					sweepPan,
					0.12,
				);
			});
		},

		/**
		 * Descending defeat tone.
		 * @param {number} [_pan=0.0]
		 * @returns {void}
		 */
		DEFEAT(_pan = 0.0) {
			ensureContext();
			if (!ctx) return;
			const t = ctx.currentTime;
			const notes = [320, 270, 220, 170];
			notes.forEach((freq, idx) => {
				scheduleSpatialTone(freq, "sawtooth", t + idx * 0.16, 0.26, 0.0, 0.15);
			});
		},

		/**
		 * Abyssal water hazard warning tone.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		HAZARD_WATER(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(85, "sine", t, 0.22, pan, 0.18);
			scheduleSpatialTone(120, "triangle", t + 0.04, 0.18, pan, 0.1);
		},

		/**
		 * Iron portcullis mechanical scrape cue.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		HAZARD_PORTCULLIS(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(190, "sawtooth", t, 0.16, pan, 0.15);
			scheduleSpatialTone(70, "square", t + 0.06, 0.24, pan, 0.22);
		},

		/**
		 * Swift weapon slice or dash whoosh.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		SWIFT_WHOOSH(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(480, "sine", t, 0.08, pan - 0.15, 0.12);
			scheduleSpatialTone(220, "triangle", t + 0.04, 0.09, pan + 0.15, 0.08);
		},

		/**
		 * Heavy boot impact on dungeon flagstones.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		FOOTSTEP_THUD(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(85, "triangle", t, 0.05, pan, 0.09);
			scheduleSpatialTone(45, "sine", t + 0.02, 0.07, pan, 0.06);
		},

		/**
		 * Vanguard shield parry deflection metallic clang.
		 * @param {number} [pan=0.0]
		 * @returns {void}
		 */
		SHIELD_DEFLECT(pan = 0.0) {
			ensureContext();
			if (!ctx || isMuted) return;
			const t = ctx.currentTime;
			scheduleSpatialTone(720, "triangle", t, 0.06, pan, 0.18);
			scheduleSpatialTone(340, "square", t + 0.02, 0.12, pan, 0.14);
		},
	};
	//#endregion

	//#region [SEC-06] Spatial Kinematics & Panning Calculators
	/**
	 * Resolves horizontal stereo panning for combat units.
	 * Pure kinematic calculation procedure.
	 *
	 * @param {'party' | 'enemy' | string} targetType - Wing target affiliation.
	 * @param {number} [targetIndex=0] - Array index offset of the targeted entity.
	 * @param {number} [enemyCount=3] - Total hostiles present in the battle stage.
	 * @returns {number} Normalized stereo panning coefficient in [-0.55, 0.75].
	 */
	function computeCombatPan(targetType, targetIndex = 0, enemyCount = 3) {
		if (targetType === "party") {
			const slotOffset = (targetIndex || 0) * 0.12;
			return -0.55 + slotOffset;
		}
		if (enemyCount <= 1) return 0.45;
		const relativePos = (targetIndex || 0) / Math.max(1, enemyCount - 1);
		return 0.25 + relativePos * 0.5;
	}

	/**
	 * Resolves horizontal stereo panning across overworld tile coordinates.
	 * Pure kinematic calculation procedure.
	 *
	 * @param {number} posX - Target entity horizontal tile coordinate.
	 * @param {number} [mapWidth=48] - Grid map horizontal tile bounds.
	 * @returns {number} Normalized stereo panning coefficient in [-0.75, 0.75].
	 */
	function computeOverworldPan(posX, mapWidth = 48) {
		if (typeof posX !== "number") return 0.0;
		const w = typeof mapWidth === "number" && mapWidth > 1 ? mapWidth : 48;
		return (posX / Math.max(1, w - 1)) * 1.5 - 0.75;
	}

	/**
	 * Mapping table resolving legacy audio event tokens to canonical synthesizer methods.
	 * @type {Readonly<Record<string, string>>}
	 */
	const SFX_ALIASES = Object.freeze({
		sfx_confirm: "SELECT",
		sfx_select: "SELECT",
		sfx_bump: "FOOTSTEP_THUD",
		sfx_heal: "HEAL",
		sfx_damage: "ATTACK_HIT",
		sfx_coin: "SELECT",
		sfx_victory: "VICTORY",
		sfx_defeat: "DEFEAT",
		ATTACK: "ATTACK_HIT",
		SWORD_HIT: "ATTACK_HIT",
		BUMP: "FOOTSTEP_THUD",
		CHEST_OPEN: "SELECT",
	});

	/** @type {Array<() => void>} */
	let cleanupCallbacks = [];
	//#endregion

	return {
		//#region [SEC-07] Peripheral Driver Interface & EventBus Arbitration
		/**
		 * Initializes the acoustic driver, arms gestures, and binds EventBus subscriptions.
		 * State-mutating peripheral lifecycle gateway.
		 *
		 * @param {AcousticContext | any} [eventBusRef] - Host runtime context or EventBus handle.
		 * @returns {void}
		 */
		init(eventBusRef) {
			this.destroy();
			armUserGestureUnlock();

			const bus = resolveEventBus(eventBusRef);

			if (bus) {
				/**
				 * @param {GenericSfxPayload} [payload={}]
				 */
				const handleGenericSfx = (payload = {}) => {
					const sfxKey = payload?.sfx || payload?.cue;
					if (sfxKey) {
						const pan = typeof payload.pan === "number" ? payload.pan : 0.0;
						this.play(sfxKey, pan);
					}
				};

				cleanupCallbacks.push(
					bus.subscribe("audio:sfx", handleGenericSfx),
					bus.subscribe("overworld:sfx", handleGenericSfx),
					bus.subscribe("dialogue:sfx", handleGenericSfx),
					bus.subscribe("progression:sfx", handleGenericSfx),
					bus.subscribe("armory:sfx", handleGenericSfx),
					bus.subscribe("relic_forge:sfx", handleGenericSfx),
					bus.subscribe("lockpick:sfx", handleGenericSfx),
					bus.subscribe(
						"combat:sfx",
						(/** @type {CombatSfxPayload} */ evt = {}) => {
							const sfx = evt?.sfx;
							if (!sfx) return;
							const pan = evt.targetType
								? computeCombatPan(evt.targetType, evt.targetIndex)
								: 0.0;
							this.play(sfx, pan);
						},
					),
					bus.subscribe(
						"overworld:step",
						(/** @type {OverworldStepPayload} */ evt = {}) => {
							const pos = evt?.pos;
							if (pos) {
								const pan = computeOverworldPan(pos.x, evt.mapWidth || 48);
								this.play("STEP", pan);

								if (pos.x >= 32 || (pos.depth && pos.depth > 0)) {
									this.setZone("CRYPT");
								} else if (pos.inTown) {
									this.setZone("TOWN");
								} else {
									this.setZone("MEADOW");
								}
							}
						},
					),
					bus.subscribe(
						"system:command",
						(/** @type {SystemCommandPayload} */ evt = {}) => {
							if (evt?.command === "TOGGLE_MUTE") {
								this.toggleMute();
							}
						},
					),
				);
			}
		},

		/**
		 * Synthesizes and plays a designated procedural sound effect.
		 * State-mutating audio dispatch procedure.
		 *
		 * @param {string} sfxName - Registered sound effect name or legacy alias.
		 * @param {number} [pan=0.0] - Normalized stereo field position in [-1.0, 1.0].
		 * @returns {void}
		 */
		play(sfxName, pan = 0.0) {
			if (!sfxName) return;
			const key = SFX_ALIASES[sfxName] || sfxName;
			if (SFX_REGISTRY[key]) {
				SFX_REGISTRY[key](pan);
			}
		},

		/**
		 * Updates the active acoustic profile to match a target environmental zone.
		 * State-mutating operational configuration procedure.
		 *
		 * @param {ZoneKey} zoneKey - Environmental zone identifier.
		 * @returns {void}
		 */
		setZone(zoneKey) {
			applyZoneProfile(zoneKey);
		},

		/**
		 * Toggles the global master audio mute state.
		 * State-mutating gain manipulation procedure.
		 *
		 * @returns {boolean} True if muted, false if unmuted.
		 */
		toggleMute() {
			isMuted = !isMuted;
			if (masterGain && ctx) {
				try {
					masterGain.gain.setValueAtTime(isMuted ? 0.0 : 1.0, ctx.currentTime);
				} catch (_) {
					// Ignored: AudioParam automation failure on suspended context
				}
			}
			return isMuted;
		},

		/**
		 * Extracts health metrics, active nodes, and bus states for auditor validation.
		 * Pure diagnostic accessor procedure.
		 *
		 * @returns {AcousticDiagnostics} Subsystem operational diagnostic telemetry.
		 */
		getDiagnostics() {
			return {
				serviceId: "acoustic_sfx_driver",
				contextState: ctx ? ctx.state : "uninitialized",
				activeZone: currentZone,
				userUnlocked: userHasInteracted,
				isMuted,
				activeNodeCount: activeNodes.size,
				dryLevel: ZONE_PROFILES[currentZone]?.dry || 1.0,
				wetLevel: ZONE_PROFILES[currentZone]?.wet || 0.0,
			};
		},

		/**
		 * Disposes active oscillator nodes, tears down AudioContext, and purges bus listeners.
		 * State-mutating resource disposal procedure.
		 *
		 * @returns {void}
		 */
		destroy() {
			cleanupCallbacks.forEach((unbind) => {
				try {
					if (typeof unbind === "function") unbind();
				} catch (_) {
					// Ignored: Teardown unbind failure
				}
			});
			cleanupCallbacks = [];

			activeNodes.forEach((node) => {
				try {
					/** @type {any} */ (node).stop?.();
					node.disconnect();
				} catch (_) {
					// Ignored: Node may already be stopped or disconnected
				}
			});
			activeNodes.clear();

			if (ctx) {
				ctx.close().catch(() => {
					// Ignored: AudioContext closing rejection
				});
				ctx = null;
				masterGain = null;
				dryBus = null;
				wetBus = null;
				convolverNode = null;
			}
			impulseBuffers.clear();
		},
		//#endregion
	};
})();

//#region [SEC-08] Global Export & Dual-Binding Registration
if (typeof window !== "undefined") {
	window.EmberlightAcousticSFX = EmberlightAcousticSFX;
	window.EmberlightAudio = EmberlightAcousticSFX;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightAcousticSFX;
}
//#endregion
