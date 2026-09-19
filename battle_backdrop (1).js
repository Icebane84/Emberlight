/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: CINEMATIC COMBAT BACKDROP & SHADER KERNEL
 * Document Identifier: VSRP-001-COMBAT-BACKDROP-CINEMATIC
 * Governing Protocol:  ARCH-SPEC-COMBAT-AESTHETICS-004 / VSRP-001
 * Authority:           Peripheral Presentation | Math Kernel
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, State Enums & Lifecycle Constants
 *   [SEC-02] Procedural PRNG & Stage Topology Synthesis
 *   [SEC-03] Volumetric Illumination & Canvas Shader Passes
 *   [SEC-04] Canonical 9-Method Peripheral Lifecycle Gateway
 *   [SEC-05] Instance Factory & Global Dual-Binding
 * ============================================================================
 */

const EmberlightCombatBackdrop = (() => {
	//#region [SEC-01] Type Definitions, State Enums & Lifecycle Constants
	/**
	 * Canonical exploration and combat biome identifiers.
	 * @typedef {'MEADOW' | 'TOWN' | 'CRYPT' | 'BOSS' | string} BackdropBiome
	 */

	/**
	 * Formal VSRP-001 module lifecycle state machine states.
	 * @typedef {'UNCONFIGURED' | 'CONFIGURED' | 'INITIALIZED' | 'READY' | 'RUNNING' | 'DESTROYED'} BackdropLifecycleState
	 */

	/**
	 * Deep parallax layer star, ash, or dust particle descriptor.
	 * @typedef {Object} DeepElement
	 * @property {number} x - Horizontal coordinate across the virtual canvas width.
	 * @property {number} y - Vertical coordinate within the upper sky vault.
	 * @property {number} size - Particle dimension in pixels.
	 * @property {number} alpha - Base opacity alpha coefficient in [0, 1].
	 * @property {number} speedMultiplier - Horizontal sine drift factor.
	 */

	/**
	 * Midground architectural monolithic pillar or ruined arch descriptor.
	 * @typedef {Object} MidElement
	 * @property {number} x - Horizontal left offset coordinate.
	 * @property {number} width - Horizontal bounding width.
	 * @property {number} height - Vertical pillar height extending upwards from the horizon.
	 * @property {number} variant - Architectural detail variant index (0-2).
	 */

	/**
	 * Volumetric radial light emitter or god-ray origin descriptor.
	 * @typedef {Object} LightEmitter
	 * @property {number} x - Radial centroid horizontal position.
	 * @property {number} y - Radial centroid vertical position.
	 * @property {string} color - CSS hex or rgb color token.
	 * @property {number} radius - Maximum illumination falloff radius in pixels.
	 * @property {number} intensity - Relative brightness multiplier.
	 * @property {boolean} [pulse] - Whether the light actively oscillates over time.
	 */

	/**
	 * Ambient rising thermal ash or miasma particle descriptor.
	 * @typedef {Object} AtmosphericParticle
	 * @property {number} x - Horizontal emitter coordinate.
	 * @property {number} y - Initial vertical coordinate.
	 * @property {number} vx - Horizontal drift velocity component.
	 * @property {number} vy - Upward negative vertical velocity component.
	 * @property {number} size - Particle box dimension in pixels.
	 * @property {string} color - CSS hex color string.
	 */

	/**
	 * Parallax depth plane descriptor housing polymorphic background elements.
	 * @typedef {Object} ParallaxLayer
	 * @property {number} depth - Depth scaling coefficient (0.0 = infinity, 1.0 = foreground).
	 * @property {Array<any>} elements - Array of deep particles or midground structures.
	 */

	/**
	 * Virtual canvas resolution boundaries.
	 * @typedef {Object} StageDimensions
	 * @property {number} width - Virtual stage horizontal resolution.
	 * @property {number} height - Virtual stage vertical resolution.
	 */

	/**
	 * Authoritative procedural stage metadata descriptor emitted by Tier 4 kernel.
	 * @typedef {Object} CinematicStageState
	 * @property {number} seed - Mulberry32 deterministic generator seed.
	 * @property {BackdropBiome} biome - Canonical biome key.
	 * @property {StageDimensions} dimensions - Stage coordinate bounds.
	 * @property {ParallaxLayer[]} parallaxLayers - Layered background arrays.
	 * @property {MidElement[]} midElements - Architectural silhouettes.
	 * @property {LightEmitter[]} lightEmitters - Screen-blended volumetric lighting.
	 * @property {AtmosphericParticle[]} atmosphericParticles - Dynamic thermal particles.
	 */

	/**
	 * Operational telemetry and diagnostic report schema.
	 * @typedef {Object} BackdropDiagnostics
	 * @property {'battle_backdrop'} driverId - Canonical driver registration handle.
	 * @property {'battle_backdrop_cinematic'} moduleId - Formal module identifier.
	 * @property {BackdropLifecycleState} lifecycleState - Active state machine phase.
	 * @property {string} activeBiome - Current operational biome string.
	 * @property {string} currentBiome - Redundant fallback active biome string.
	 * @property {string} flareIntensity - Floating-point string of current flare pulse.
	 * @property {boolean} isLoopRunning - Active requestAnimationFrame status.
	 * @property {boolean} hasCanvas - Canvas element mount verification flag.
	 * @property {boolean} isHeadless - Whether running in headless VM test mode.
	 * @property {boolean} hasConfig - Verification that host configuration is bound.
	 * @property {boolean} hasContext - Verification that host context is bound.
	 */

	/**
	 * Static VSRP-001 capability descriptor schema.
	 * @typedef {Object} BackdropModuleInfo
	 * @property {'battle_backdrop_cinematic'} moduleId - Unique module token.
	 * @property {string} version - Semantic version identifier.
	 * @property {'VSRP-001'} protocolVersion - Governing normative protocol.
	 * @property {string[]} capabilities - Array of registered subsystem capabilities.
	 */

	/**
	 * Optional operational switches injected into backdrop factory constructor.
	 * @typedef {Object} BackdropInstanceOptions
	 * @property {boolean} [isHeadless] - Forces bypass of DOM queries and RAF loops.
	 */

	/**
	 * Incoming EventBus payload for dynamic optical flash flares.
	 * @typedef {Object} StageIlluminatePayload
	 * @property {string} [color] - Comma-separated RGB color string.
	 * @property {number} [intensity] - Peak flare alpha opacity in [0, 1].
	 * @property {number} [duration] - Decay speed delta per animation frame.
	 */

	/**
	 * Incoming EventBus payload for kinetic combat audio cues.
	 * @typedef {Object} CombatSfxPayload
	 * @property {string} [sfx] - Semantic SFX identifier (e.g., 'SPELL_BOLT', 'HEAL').
	 */

	/**
	 * Host context dictionary injected during module initialization.
	 * @typedef {Object} BackdropContext
	 * @property {Object} [eventBus] - Host synchronous EventBus arbiter.
	 * @property {function(string, function(any): void): function(): void} [eventBus.subscribe] - Bus subscription.
	 * @property {function(string, function(any): void): function(): void} [subscribe] - Direct bus subscription fallback.
	 */

	/**
	 * Authoritative working state snapshot ingested during reset.
	 * @typedef {Object} BackdropSnapshot
	 * @property {number} [seed] - Deterministic PRNG seed integer.
	 * @property {BackdropBiome} [biome] - Target biome identifier.
	 */

	/**
	 * Target canvas selector or renderer delegate interface.
	 * @typedef {string | { renderBackdrop?: function(any): void }} BackdropRendererTarget
	 */

	/**
	 * Formal VSRP-001 lifecycle state machine constants.
	 * @type {Record<string, BackdropLifecycleState>}
	 */
	const State = Object.freeze({
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	});

	/**
	 * Deeply freezes a target object graph recursively to guarantee immutability.
	 * Pure recursive utility procedure.
	 *
	 * @template T
	 * @param {T} obj - Target object or primitive to immutably freeze.
	 * @returns {Readonly<T>} Deeply frozen object reference.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== 'object') return obj;
		Object.keys(obj).forEach((prop) => {
			if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
				deepFreeze(obj[prop]);
			}
		});
		return Object.freeze(obj);
	}

	/**
	 * Normalizes host context into a direct synchronous EventBus handle.
	 * Pure resolution accessor.
	 *
	 * @param {BackdropContext | any} [ctxRef] - Injected host context or direct bus handle.
	 * @returns {any} Resolved synchronous EventBus interface or null.
	 */
	function resolveEventBus(ctxRef) {
		if (ctxRef && typeof ctxRef.subscribe === 'function') {
			return ctxRef;
		}
		if (ctxRef?.eventBus && typeof ctxRef.eventBus.subscribe === 'function') {
			return ctxRef.eventBus;
		}
		return null;
	}
	//#endregion

	//#region [SEC-02] Procedural PRNG & Stage Topology Synthesis
	/**
	 * Steps the Mulberry32 PRNG stream forward deterministically.
	 * State-mutating math procedure: advances internal seed state.
	 *
	 * @param {{ seed: number }} prngStateObj - Seed holder object.
	 * @returns {number} Normalized floating-point pseudorandom number in [0, 1).
	 */
	function getNextFloat(prngStateObj) {
		if (typeof EmberlightPRNG !== 'undefined' && EmberlightPRNG.create) {
			const p = EmberlightPRNG.create(prngStateObj.seed || 1337);
			const val = p.nextFloat();
			prngStateObj.seed = p.getState();
			return val;
		}
		prngStateObj.seed = Math.trunc((prngStateObj.seed || 1337) + 0x6d2b79f5);
		let t = prngStateObj.seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/**
	 * Resolves architectural silhouette fill color based on the active biome.
	 * Pure selector procedure.
	 *
	 * @param {BackdropBiome} biome - Canonical biome identifier.
	 * @returns {string} Hex color token for architectural silhouettes.
	 */
	function getMidgroundFill(biome) {
		if (biome === 'BOSS') return '#110202';
		if (biome === 'TOWN') return '#180d05';
		return '#090916';
	}

	/**
	 * Synthesizes deterministic procedural metadata descriptors for combat backgrounds.
	 * Tier 4 Procedural Kernel procedure.
	 *
	 * @param {number} seed - Deterministic entropy seed integer.
	 * @param {BackdropBiome} [biome='CRYPT'] - Active environmental biome token.
	 * @param {number} [width=800] - Virtual stage pixel width.
	 * @param {number} [height=400] - Virtual stage pixel height.
	 * @returns {CinematicStageState} Complete procedural stage metadata descriptor.
	 */
	function synthesizeCinematicStage(seed, biome, width = 800, height = 400) {
		const prngState = { seed: Number(seed) || 1337 };
		const bKey = String(biome || 'CRYPT').toUpperCase();
		let normalizedBiome = 'CRYPT';
		if (bKey.includes('BOSS') || bKey.includes('MALAKOR')) normalizedBiome = 'BOSS';
		else if (bKey.includes('MEADOW') || bKey.includes('SURFACE') || bKey === '.') normalizedBiome = 'MEADOW';
		else if (bKey.includes('TOWN') || bKey === 'T') normalizedBiome = 'TOWN';

		const parallaxLayers = [];
		const midElements = [];
		const lightEmitters = [];
		const atmosphericParticles = [];

		// 1. Deep Parallax Nebula / Starfield / Ash Cloud Layer
		const deepElements = [];
		const count = normalizedBiome === 'BOSS' ? 50 : 35;
		for (let i = 0; i < count; i++) {
			deepElements.push({
				x: getNextFloat(prngState) * width,
				y: getNextFloat(prngState) * (height * 0.6),
				size: 1.0 + getNextFloat(prngState) * 2.5,
				alpha: 0.3 + getNextFloat(prngState) * 0.5,
				speedMultiplier: 0.2 + getNextFloat(prngState) * 0.3,
			});
		}
		parallaxLayers.push({ depth: 0.15, elements: deepElements });

		// 2. Midground Architectural Silhouettes
		const archCount = 4;
		const step = width / archCount;
		for (let i = 0; i <= archCount; i++) {
			midElements.push({
				x: i * step + (getNextFloat(prngState) - 0.5) * 40,
				width: 30 + getNextFloat(prngState) * 25,
				height: height * (0.35 + getNextFloat(prngState) * 0.2),
				variant: Math.floor(getNextFloat(prngState) * 3),
			});
		}
		parallaxLayers.push({ depth: 0.50, elements: midElements });

		// 3. Biome-Specific Lighting & Particle Descriptors
		if (normalizedBiome === 'CRYPT') {
			lightEmitters.push(
				{ x: width * 0.2, y: height * 0.4, color: '#60a5fa', radius: 80, intensity: 0.9 },
				{ x: width * 0.5, y: height * 0.35, color: '#a855f7', radius: 95, intensity: 1.1 },
				{ x: width * 0.8, y: height * 0.4, color: '#60a5fa', radius: 80, intensity: 0.9 }
			);
		} else if (normalizedBiome === 'BOSS') {
			lightEmitters.push({
				x: width * 0.5,
				y: height * 0.75,
				color: '#ef4444',
				radius: 180,
				intensity: 1.5,
				pulse: true,
			});
			for (let i = 0; i < 40; i++) {
				atmosphericParticles.push({
					x: getNextFloat(prngState) * width,
					y: height * 0.5 + getNextFloat(prngState) * (height * 0.5),
					vx: (getNextFloat(prngState) - 0.5) * 0.8,
					vy: -1.5 - getNextFloat(prngState) * 2.5,
					size: 1.5 + getNextFloat(prngState) * 2.0,
					color: '#f97316',
				});
			}
		} else if (normalizedBiome === 'TOWN') {
			lightEmitters.push(
				{ x: width * 0.25, y: height * 0.38, color: '#fbbf24', radius: 70, intensity: 1.0 },
				{ x: width * 0.75, y: height * 0.38, color: '#f59e0b', radius: 70, intensity: 1.0 }
			);
		} else {
			lightEmitters.push({
				x: width * 0.5,
				y: height * 0.3,
				color: '#34d399',
				radius: 110,
				intensity: 0.8,
			});
		}

		return {
			seed: prngState.seed,
			biome: normalizedBiome,
			dimensions: { width, height },
			parallaxLayers,
			midElements,
			lightEmitters,
			atmosphericParticles,
		};
	}
	//#endregion

	//#region [SEC-03] Volumetric Illumination & Canvas Shader Passes
	/**
	 * Constructs an isolated combat backdrop instance.
	 * Factory constructor.
	 *
	 * @param {BackdropInstanceOptions} [instanceOptions={}] - Instance configuration flags.
	 * @returns {any} Isolated combat backdrop tenant driver.
	 */
	function createInstance(instanceOptions = {}) {
		const isHeadless = Boolean(instanceOptions.isHeadless);

		/** @type {BackdropLifecycleState} */
		let lifecycleState = State.UNCONFIGURED;
		/** @type {Record<string, any> | null} */
		let hostConfig = null;
		/** @type {BackdropContext | any} */
		let hostContext = null;
		/** @type {CinematicStageState | null} */
		let sim = null;
		/** @type {HTMLCanvasElement | any} */
		let canvas = null;
		/** @type {CanvasRenderingContext2D | any} */
		let ctx = null;
		/** @type {number | null} */
		let animFrameId = null;
		/** @type {any} */
		let eventBus = null;
		/** @type {Array<function(): void>} */
		let unsubs = [];
		let time = 0;
		/** @type {BackdropBiome} */
		let activeBiome = 'CRYPT';

		// Cinematic Illumination & Post-Processing State
		let flareIntensity = 0.0;
		let flareColor = '255, 157, 77';
		let flareDecay = 0.04;

		/**
		 * Resolves or dynamically injects the DOM canvas into the combat theater.
		 * State-mutating DOM procedure.
		 *
		 * @returns {void}
		 */
		function ensureCanvas() {
			if (isHeadless || typeof document === 'undefined') return;
			if (canvas?.parentElement) return;
			canvas = document.getElementById('combat-backdrop-canvas');
			if (!canvas) {
				const arena = document.getElementById('pane-combat-arena') || document.getElementById('combat-theater');
				if (arena) {
					canvas = document.createElement('canvas');
					canvas.id = 'combat-backdrop-canvas';
					arena.insertBefore(canvas, arena.firstChild);
				}
			}
			if (canvas) {
				ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
				resize();
			}
		}

		/**
		 * Synchronizes canvas coordinate buffers with parent DOM element dimensions.
		 * State-mutating presentation procedure.
		 *
		 * @returns {void}
		 */
		function resize() {
			if (!canvas || !ctx) return;
			const rect = canvas.parentElement?.getBoundingClientRect
				? canvas.parentElement.getBoundingClientRect()
				: { width: 800, height: 400 };
			const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
			canvas.width = Math.floor((rect.width || 800) * dpr);
			canvas.height = Math.floor((rect.height || 400) * dpr);
			if (ctx.setTransform) {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.scale(dpr, dpr);
			}
		}

		/**
		 * Renders the upper atmospheric sky and ceiling gradient vault.
		 * State-mutating canvas render procedure.
		 *
		 * @param {number} w - Target viewport width.
		 * @param {number} h - Target viewport height.
		 * @param {BackdropBiome} biome - Active biome key.
		 * @returns {void}
		 */
		function renderSkyVault(w, h, biome) {
			if (typeof ctx.createLinearGradient === 'function') {
				const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
				if (biome === 'BOSS') {
					skyGrad.addColorStop(0, '#1a0202');
					skyGrad.addColorStop(0.5, '#3b0707');
					skyGrad.addColorStop(1, '#581c87');
				} else if (biome === 'TOWN') {
					skyGrad.addColorStop(0, '#2e1005');
					skyGrad.addColorStop(0.5, '#431407');
					skyGrad.addColorStop(1, '#78350f');
				} else if (biome === 'MEADOW') {
					skyGrad.addColorStop(0, '#020617');
					skyGrad.addColorStop(0.5, '#0f172a');
					skyGrad.addColorStop(1, '#065f46');
				} else {
					skyGrad.addColorStop(0, '#030309');
					skyGrad.addColorStop(0.5, '#0d0d24');
					skyGrad.addColorStop(1, '#1e1b4b');
				}
				ctx.fillStyle = skyGrad;
			} else {
				ctx.fillStyle = '#0a0a14';
			}
			ctx.fillRect(0, 0, w, h * 0.65);
		}

		/**
		 * Projects the deep starfield, nebula, and drifting ash cloud elements.
		 * State-mutating canvas render procedure.
		 *
		 * @param {CinematicStageState} currentSim - Active stage descriptor.
		 * @param {BackdropBiome} biome - Active biome key.
		 * @returns {void}
		 */
		function renderDeepParallax(currentSim, biome) {
			const deepLayer = currentSim.parallaxLayers?.[0];
			if (!deepLayer?.elements) return;
			ctx.fillStyle = biome === 'BOSS' ? 'rgba(249, 115, 22, 0.7)' : 'rgba(255, 255, 255, 0.6)';
			deepLayer.elements.forEach((elem, idx) => {
				const drift = Math.sin(time * 0.8 + idx) * 4;
				ctx.globalAlpha = elem.alpha || 0.5;
				ctx.fillRect(elem.x + drift * (elem.speedMultiplier || 0.2), elem.y, elem.size, elem.size);
			});
			ctx.globalAlpha = 1.0;
		}

		/**
		 * Projects midground monoliths, ruined pillars, and architectural silhouettes.
		 * State-mutating canvas render procedure.
		 *
		 * @param {number} w - Target viewport width.
		 * @param {number} h - Target viewport height.
		 * @param {CinematicStageState} currentSim - Active stage descriptor.
		 * @param {BackdropBiome} biome - Active biome key.
		 * @returns {void}
		 */
		function renderMidgroundSilhouettes(w, h, currentSim, biome) {
			ctx.fillStyle = getMidgroundFill(biome);
			const strokeColor = biome === 'BOSS' ? '#2c0b0b' : '#1e1b4b';
			currentSim.midElements?.forEach((pillar) => {
				const pX = pillar.x;
				const pW = pillar.width;
				const pH = pillar.height;
				const pY = h * 0.65 - pH;
				ctx.fillRect(pX, pY, pW, pH);
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = 2;
				ctx.strokeRect(pX + 4, pY + 4, pW - 8, pH - 4);
			});
		}

		/**
		 * Projects screen-blended volumetric god-rays and radial light sources.
		 * State-mutating canvas render procedure.
		 *
		 * @param {CinematicStageState} currentSim - Active stage descriptor.
		 * @returns {void}
		 */
		function renderLightEmitters(currentSim) {
			if (typeof ctx.createRadialGradient !== 'function' || !currentSim.lightEmitters) return;
			ctx.save();
			ctx.globalCompositeOperation = 'screen';
			currentSim.lightEmitters.forEach((light, idx) => {
				const pulseFactor = light.pulse ? Math.sin(time * 4.0) * 0.15 : Math.sin(time * 3.0 + idx) * 0.1;
				const pulse = (light.pulse ? 0.85 : 0.9) + pulseFactor;
				const r = light.radius * pulse;
				const grad = ctx.createRadialGradient(light.x, light.y, 2, light.x, light.y, r);
				grad.addColorStop(0, light.color);
				grad.addColorStop(0.5, light.color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
				grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
				ctx.fillStyle = grad;
				ctx.fillRect(light.x - r, light.y - r, r * 2, r * 2);
			});
			ctx.restore();
		}

		/**
		 * Renders the perspective floor mat gradient across the lower 40% of the viewport.
		 * State-mutating canvas render procedure.
		 *
		 * @param {number} w - Target viewport width.
		 * @param {number} h - Target viewport height.
		 * @param {BackdropBiome} biome - Active biome key.
		 * @returns {void}
		 */
		function renderPerspectiveFloor(w, h, biome) {
			if (typeof ctx.createLinearGradient === 'function') {
				const floorGrad = ctx.createLinearGradient(0, h * 0.60, 0, h);
				if (biome === 'BOSS') {
					floorGrad.addColorStop(0, '#2b0a0a');
					floorGrad.addColorStop(0.4, '#140303');
					floorGrad.addColorStop(1, '#050101');
				} else if (biome === 'TOWN') {
					floorGrad.addColorStop(0, '#361d10');
					floorGrad.addColorStop(0.4, '#1c0f08');
					floorGrad.addColorStop(1, '#080402');
				} else if (biome === 'MEADOW') {
					floorGrad.addColorStop(0, '#064e3b');
					floorGrad.addColorStop(0.4, '#022c22');
					floorGrad.addColorStop(1, '#02130e');
				} else {
					floorGrad.addColorStop(0, '#171738');
					floorGrad.addColorStop(0.4, '#0b0b1a');
					floorGrad.addColorStop(1, '#030308');
				}
				ctx.fillStyle = floorGrad;
			} else {
				ctx.fillStyle = '#060610';
			}
			ctx.fillRect(0, h * 0.60, w, h * 0.40);
		}

		/**
		 * Draws perspective flagstone seam lines receding toward the horizon.
		 * State-mutating canvas render procedure.
		 *
		 * @param {number} w - Target viewport width.
		 * @param {number} h - Target viewport height.
		 * @param {BackdropBiome} biome - Active biome key.
		 * @returns {void}
		 */
		function renderPerspectiveGrid(w, h, biome) {
			ctx.strokeStyle = biome === 'BOSS' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(120, 120, 180, 0.25)';
			ctx.lineWidth = 1;
			for (let x = 0; x < w; x += 42) {
				ctx.beginPath();
				ctx.moveTo(x, h * 0.60);
				ctx.lineTo(x + (x - w * 0.5) * 0.7, h);
				ctx.stroke();
			}
		}

		/**
		 * Renders continuous floating thermal ash and atmospheric dust motes.
		 * State-mutating canvas render procedure.
		 *
		 * @param {number} w - Target viewport width.
		 * @param {number} h - Target viewport height.
		 * @param {CinematicStageState} currentSim - Active stage descriptor.
		 * @returns {void}
		 */
		function renderAtmosphericParticles(w, h, currentSim) {
			if (!currentSim.atmosphericParticles?.length) return;
			ctx.fillStyle = '#fb923c';
			currentSim.atmosphericParticles.forEach((p) => {
				const py = h * 0.6 - ((Math.abs(p.y + time * 40)) % (h * 0.6));
				ctx.fillRect(p.x, py, p.size, p.size);
			});
		}

		/**
		 * Coordinates multi-stage backdrop canvas composition across all layers.
		 * State-mutating canvas composite procedure.
		 *
		 * @param {number} w - Viewport canvas width.
		 * @param {number} h - Viewport canvas height.
		 * @returns {void}
		 */
		function renderCinematicBackground(w, h) {
			const currentSim = sim || synthesizeCinematicStage(1337, activeBiome, w, h);
			const biome = currentSim.biome || activeBiome;

			renderSkyVault(w, h, biome);
			renderDeepParallax(currentSim, biome);
			renderMidgroundSilhouettes(w, h, currentSim, biome);
			renderLightEmitters(currentSim);
			renderPerspectiveFloor(w, h, biome);
			renderPerspectiveGrid(w, h, biome);
			renderAtmosphericParticles(w, h, currentSim);
		}

		/**
		 * Applies cinematic post-processing passes: CRT vignette and decay flares.
		 * State-mutating shader composite procedure.
		 *
		 * @param {number} w - Viewport canvas width.
		 * @param {number} h - Viewport canvas height.
		 * @returns {void}
		 */
		function renderPostProcessingShaders(w, h) {
			if (!ctx) return;
			// Cinematic Vignette Shader Pass
			if (typeof ctx.createRadialGradient === 'function') {
				const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.35, w * 0.5, h * 0.5, w * 0.75);
				vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
				vignette.addColorStop(1, 'rgba(2, 2, 8, 0.75)');
				ctx.fillStyle = vignette;
				ctx.fillRect(0, 0, w, h);
			}
			// Dynamic Illumination Flare Pulse Overlay
			if (flareIntensity > 0.01) {
				ctx.save();
				if (ctx.globalCompositeOperation) ctx.globalCompositeOperation = 'screen';
				if (typeof ctx.createRadialGradient === 'function') {
					const flareGrad = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, w * 0.65);
					flareGrad.addColorStop(0, `rgba(${flareColor},${Math.min(0.8, flareIntensity)})`);
					flareGrad.addColorStop(0.6, `rgba(${flareColor},${Math.min(0.3, flareIntensity * 0.4)})`);
					flareGrad.addColorStop(1, `rgba(${flareColor}, 0)`);
					ctx.fillStyle = flareGrad;
				} else {
					ctx.fillStyle = `rgba(${flareColor},${flareIntensity * 0.5})`;
				}
				ctx.fillRect(0, 0, w, h);
				ctx.restore();
				flareIntensity = Math.max(0, flareIntensity - flareDecay);
			}
		}

		/**
		 * Single RAF animation loop step; advances time and triggers render passes.
		 * State-mutating animation procedure.
		 *
		 * @returns {void}
		 */
		function renderFrame() {
			if (!canvas || !ctx) {
				ensureCanvas();
				if (!canvas || !ctx) return;
			}
			if (canvas.offsetParent === null) {
				animFrameId = null;
				return;
			}
			const w = canvas.width || 800;
			const h = canvas.height || 400;
			if (ctx.clearRect) ctx.clearRect(0, 0, w, h);
			renderCinematicBackground(w, h);
			renderPostProcessingShaders(w, h);
			time += 0.016;
			if (!isHeadless && typeof requestAnimationFrame !== 'undefined') {
				animFrameId = requestAnimationFrame(renderFrame);
			}
		}

		/**
		 * Activates requestAnimationFrame animation loop if dormant and non-headless.
		 * State-mutating lifecycle helper.
		 *
		 * @returns {void}
		 */
		function startLoop() {
			if (!animFrameId && !isHeadless && typeof requestAnimationFrame !== 'undefined') {
				animFrameId = requestAnimationFrame(renderFrame);
			}
		}
		//#endregion

		return {
			//#region [SEC-04] Canonical 9-Method Peripheral Lifecycle Gateway
			/**
			 * Ingests and locks peripheral driver operational configuration.
			 * State-mutating lifecycle gateway (transitions to CONFIGURED).
			 *
			 * @param {Record<string, any>} [cfg={}] - Static configuration dictionary.
			 * @returns {Readonly<{ accepted: boolean, driverId: string }>} Acceptance descriptor.
			 */
			configure(cfg = {}) {
				hostConfig = deepFreeze({ ...cfg });
				lifecycleState = State.CONFIGURED;
				return Object.freeze({ accepted: true, driverId: 'battle_backdrop' });
			},

			/**
			 * Connects the driver to host context, mounts DOM canvas, and registers bus listeners.
			 * State-mutating lifecycle gateway (transitions to INITIALIZED).
			 *
			 * @param {BackdropContext | any} context - Host runtime capability context.
			 * @returns {void}
			 */
			init(context) {
				if (lifecycleState === State.UNCONFIGURED) {
					this.configure({});
				}
				this.destroy();
				hostContext = context;
				eventBus = resolveEventBus(context);
				ensureCanvas();
				if (typeof window !== 'undefined') {
					window.addEventListener('resize', resize);
				}
				if (eventBus) {
					unsubs.push(
						eventBus.subscribe('stage:illuminate', (/** @type {StageIlluminatePayload} */ { color, intensity, duration }) => {
							this.pulseIllumination(color || '255, 157, 77', intensity || 0.7, duration || 0.04);
						}),
						eventBus.subscribe('combat:sfx', (/** @type {CombatSfxPayload} */ { sfx }) => {
							if (sfx === 'SPELL_BOLT') this.pulseIllumination('56, 189, 248', 0.6, 0.04);
							else if (sfx === 'HEAL') this.pulseIllumination('250, 204, 21', 0.65, 0.03);
							else if (sfx === 'ATTACK_HIT') this.pulseIllumination('239, 68, 68', 0.45, 0.05);
						})
					);
				}
				sim = synthesizeCinematicStage(1337, activeBiome);
				lifecycleState = State.INITIALIZED;
				startLoop();
			},

			/**
			 * Primes or restores procedural backdrop using seed and biome snapshots.
			 * State-mutating lifecycle gateway (transitions to READY).
			 *
			 * @param {BackdropSnapshot | null} [snapshot=null] - Stage rehydration snapshot.
			 * @returns {void}
			 */
			reset(snapshot = null) {
				const seed = snapshot?.seed || 1337;
				const biome = snapshot?.biome || activeBiome || 'CRYPT';
				activeBiome = biome;
				sim = synthesizeCinematicStage(seed, biome);
				lifecycleState = State.READY;
				startLoop();
			},

			/**
			 * Advances procedural backdrop animation time clock.
			 * State-mutating simulation tick gateway (transitions to RUNNING).
			 *
			 * @param {number} [dt=0.016] - Elapsed frame delta time in seconds.
			 * @returns {void}
			 */
			update(dt = 0.016) {
				lifecycleState = State.RUNNING;
				time += dt;
			},

			/**
			 * Projects stage visual buffers to DOM canvas or delegates to headless renderer.
			 * State-mutating presentation projection gateway.
			 *
			 * @param {BackdropRendererTarget} [targetOrRenderer] - Canvas element ID or custom renderer.
			 * @param {any} [context] - Downstream render context payload.
			 * @returns {void}
			 */
			render(targetOrRenderer, context) {
				if (typeof targetOrRenderer === 'string') {
					if (typeof document !== 'undefined') {
						const found = document.getElementById(targetOrRenderer);
						if (found) {
							canvas = found;
							ctx = canvas.getContext ? canvas.getContext('2d') : null;
						}
					}
				} else if (targetOrRenderer?.renderBackdrop) {
					targetOrRenderer.renderBackdrop(context || structuredClone(sim));
					return;
				}
				if (ctx && canvas) {
					const w = canvas.width || 800;
					const h = canvas.height || 400;
					renderCinematicBackground(w, h);
					renderPostProcessingShaders(w, h);
				}
			},

			/**
			 * Extracts detached serializable snapshot of current stage metadata.
			 * Pure extraction accessor.
			 *
			 * @returns {CinematicStageState | null} Detached stage snapshot clone.
			 */
			getState() {
				return structuredClone(sim);
			},

			/**
			 * Returns operational telemetry and health metrics for the backdrop driver.
			 * Pure diagnostic accessor.
			 *
			 * @returns {BackdropDiagnostics} Operational health telemetry descriptor.
			 */
			getDiagnostics() {
				return {
					driverId: 'battle_backdrop',
					moduleId: 'battle_backdrop_cinematic',
					lifecycleState,
					activeBiome: sim?.biome || activeBiome,
					currentBiome: sim?.biome || activeBiome,
					flareIntensity: flareIntensity.toFixed(2),
					isLoopRunning: Boolean(animFrameId),
					hasCanvas: Boolean(canvas),
					isHeadless,
					hasConfig: Boolean(hostConfig),
					hasContext: Boolean(hostContext),
				};
			},

			/**
			 * Returns static capability declarations and metadata schema.
			 * Pure manifest accessor.
			 *
			 * @returns {BackdropModuleInfo} Constitutional VSRP-001 metadata descriptor.
			 */
			getModuleInfo() {
				return {
					moduleId: 'battle_backdrop_cinematic',
					version: '4.0.0',
					protocolVersion: 'VSRP-001',
					capabilities: [
						'tier4_cinematic_kernel',
						'multi_layered_parallax',
						'volumetric_god_rays',
						'post_processing_vignette',
						'headless_stage_synthesis',
					],
				};
			},

			/**
			 * Triggers dynamic full-screen optical flare burst with decay dissipation.
			 * State-mutating presentation trigger procedure.
			 *
			 * @param {string} [colorRgb='255, 157, 77'] - Comma-separated RGB color string.
			 * @param {number} [intensity=0.7] - Initial peak brightness coefficient in [0, 1].
			 * @param {number} [decayRate=0.04] - Per-frame flare dissipation delta.
			 * @returns {void}
			 */
			pulseIllumination(colorRgb = '255, 157, 77', intensity = 0.7, decayRate = 0.04) {
				flareColor = colorRgb;
				flareIntensity = intensity;
				flareDecay = decayRate;
				startLoop();
			},

			/**
			 * Hot-swaps the active environmental biome and re-synthesizes stage geometry.
			 * State-mutating operational procedure.
			 *
			 * @param {BackdropBiome} biome - Target biome identifier.
			 * @returns {void}
			 */
			setBiome(biome) {
				const bKey = String(biome || 'CRYPT').toUpperCase();
				if (bKey.includes('BOSS') || bKey.includes('MALAKOR')) activeBiome = 'BOSS';
				else if (bKey.includes('MEADOW') || bKey.includes('SURFACE') || bKey === '.') activeBiome = 'MEADOW';
				else if (bKey.includes('TOWN') || bKey === 'T') activeBiome = 'TOWN';
				else activeBiome = 'CRYPT';

				if (!sim) {
					sim = synthesizeCinematicStage(1337, activeBiome);
				} else {
					sim = synthesizeCinematicStage(sim.seed || 1337, activeBiome);
				}
				startLoop();
			},

			/**
			 * Tears down animation RAF loop, unbinds EventBus subscriptions, and purges canvas.
			 * State-mutating terminal lifecycle gateway (transitions to DESTROYED).
			 *
			 * @returns {void}
			 */
			destroy() {
				if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
					cancelAnimationFrame(animFrameId);
					animFrameId = null;
				}
				unsubs.forEach((u) => {
					try {
						if (typeof u === 'function') u();
					} catch (_) { }
				});
				unsubs = [];
				if (typeof window !== 'undefined') {
					window.removeEventListener('resize', resize);
				}
				if (canvas?.parentElement) {
					canvas.remove();
				}
				canvas = null;
				ctx = null;
				eventBus = null;
				sim = null;
				lifecycleState = State.DESTROYED;
			},
		};
	}
	//#endregion

	//#region [SEC-05] Instance Factory & Global Dual-Binding
	const defaultInstance = createInstance({ isHeadless: false });
	defaultInstance.createInstance = createInstance;
	return defaultInstance;
})();

if (typeof window !== 'undefined') {
	window['EmberlightCombatBackdrop'] = EmberlightCombatBackdrop;
	window['EmberlightBattleBackdrop'] = EmberlightCombatBackdrop;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightCombatBackdrop;
}
//#endregion