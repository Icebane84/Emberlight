/* cSpell:words VSRP KNOCKBACK unsubs targetable */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMBAT VFX PRESENTATION DRIVER
 * Document Identifier: VSRP-001-COMBAT-VFX
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-COMBAT-AESTHETICS-004
 * Authority:           Peripheral Presentation Driver
 * Timestamp:           2026-09-06T20:15:40Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Structural Constants & Typed Buffer Allocation
 *   [SEC-02] Canvas Lifecycle & Viewport Synchronization
 *   [SEC-03] Spatial Coordinate Mapping & Target Projection
 *   [SEC-04] Particle Physics Kernel & Impulse Generation
 *   [SEC-05] Kinetic Floating Text & Cinematic Banner Engine
 *   [SEC-06] Procedural Slash Trajectories & Kinetic VFX Generators
 *   [SEC-07] Simulation Tick & Particle Life State Propagation
 *   [SEC-08] Composite Viewport Renderer & Frame Loop Orchestration
 *   [SEC-09] VSRP-001 Peripheral Driver Interface & EventBus Gateway
 *   [SEC-10] Global Environment & CommonJS Module Export
 * ============================================================================
 */

/**
 * @typedef {Object} Point2D
 * @property {number} x - Horizontal coordinate in viewport pixels.
 * @property {number} y - Vertical coordinate in viewport pixels.
 */

/**
 * @typedef {Object} BezierSlash
 * @property {number} startX - Curve origin X coordinate.
 * @property {number} startY - Curve origin Y coordinate.
 * @property {number} endX - Curve terminus X coordinate.
 * @property {number} endY - Curve terminus Y coordinate.
 * @property {number} ctrlX - Quadratic control point X coordinate.
 * @property {number} ctrlY - Quadratic control point Y coordinate.
 * @property {string} color - CSS color token or hex string.
 * @property {number} alpha - Current opacity multiplier [0.0 - 1.0].
 * @property {number} life - Remaining lifetime in seconds.
 * @property {number} maxLife - Total initialized lifespan in seconds.
 */

/**
 * @typedef {Object} FloatingText
 * @property {number} x - Current horizontal center coordinate.
 * @property {number} y - Current vertical anchor coordinate.
 * @property {string} text - Rendered text content.
 * @property {string} color - CSS color token or hex string.
 * @property {boolean} isLarge - Whether to apply emphasis scaling and bold typography.
 * @property {number} alpha - Current opacity multiplier [0.0 - 1.0].
 * @property {number} vy - Current vertical velocity impulse.
 * @property {number} life - Remaining lifetime in seconds.
 * @property {number} maxLife - Total initialized lifespan in seconds.
 */

/**
 * @typedef {Object} CinematicBanner
 * @property {string} text - Primary banner title.
 * @property {string} subtext - Secondary descriptive narrative or telemetry.
 * @property {string} color - Border and primary text accent color.
 * @property {number} timer - Remaining duration in seconds.
 * @property {number} maxTime - Total initialized display duration in seconds.
 * @property {number} alpha - Computed opacity value [0.0 - 1.0].
 */

/**
 * @typedef {Object} CombatDamagePayload
 * @property {number} amount - Numeric vital delta.
 * @property {'party'|'enemy'} targetType - Affiliation of target entity.
 * @property {number} [targetIndex] - Roster index within target formation wing.
 * @property {boolean} [isCrit] - Critical strike assertion flag.
 * @property {boolean} [isHeal] - Vital restoration assertion flag.
 */

/**
 * @typedef {Object} CombatTextPayload
 * @property {string} text - Floating status notification string.
 * @property {'party'|'enemy'} targetType - Affiliation of target entity.
 * @property {number} [targetIndex] - Roster index within target formation wing.
 * @property {string} [color] - Optional custom accent color string.
 * @property {boolean} [isLarge] - Typographic scaling flag.
 */

/**
 * @typedef {Object} CombatBannerPayload
 * @property {string} text - Marquee banner heading.
 * @property {string} [subtext] - Marquee secondary subtext.
 * @property {string} [color] - Marquee theme accent color.
 * @property {number} [duration] - Total display duration in seconds.
 */

/**
 * @typedef {Object} CombatAnimationPayload
 * @property {'LUNGE'|'DEFLECT'|'KNOCKBACK'|'PULL'} animation - Animation trigger token.
 * @property {'party'|'enemy'} targetType - Target formation side.
 * @property {number} [targetIndex] - Target slot position index.
 * @property {number} [duration] - Declared animation duration in milliseconds.
 */

/**
 * @typedef {Object} EventBusSubscriber
 * @property {function(string, function(any):void): function():void} subscribe - Event subscription registrar returning unbind callback.
 * @property {function(string, any): void} [publish] - Event dispatcher callback.
 */

/**
 * @typedef {Object} CombatVFXDiagnostics
 * @property {string} driverId - Authoritative driver identifier.
 * @property {number} activeParticles - Count of live allocated particles in typed buffer.
 * @property {number} activeSlashes - Count of active Bezier trajectories.
 * @property {number} activeTexts - Count of active floating damage numbers.
 * @property {boolean} hasBanner - Indicates if cinematic marquee is currently rendering.
 * @property {boolean} isLoopRunning - Status of requestAnimationFrame loop.
 */

/**
 * @typedef {Object} CombatVFXModuleInfo
 * @property {string} moduleId - Master module registration key.
 * @property {string} version - Semantic version string.
 * @property {string} protocolVersion - Governing architecture protocol version.
 * @property {string[]} capabilities - Registered capability tokens.
 */

const EmberlightCombatVFX = (() => {
	//#region [SEC-01] Structural Constants & Typed Buffer Allocation
	/** @type {number} */
	const MAX_PARTICLES = 300;

	/** @type {number} */
	const MAX_FLOATING_TEXTS = 30;

	/** @type {HTMLCanvasElement|null} */
	let canvas = null;

	/** @type {CanvasRenderingContext2D|null} */
	let ctx = null;

	/** @type {EventBusSubscriber|null} */
	let eventBus = null;

	/** @type {number|null} */
	let animFrameId = null;

	/** @type {Array<function():void>} */
	let unsubs = [];

	// Deterministic 32-bit PRNG state to eliminate SonarLint S2245
	let prngSeed = 0x9e3779b9;

	/**
	 * Fast, self-contained pseudo-random float generator [0.0, 1.0).
	 * [State Mutating]
	 * @returns {number}
	 */
	function prngFloat() {
		prngSeed = Math.imul(prngSeed ^ (prngSeed >>> 15), 1 | prngSeed);
		prngSeed =
			(prngSeed + Math.imul(prngSeed ^ (prngSeed >>> 7), 61 | prngSeed)) ^
			prngSeed;
		return ((prngSeed ^ (prngSeed >>> 14)) >>> 0) / 4294967296;
	}

	// Pre-allocated typed buffers for constant-overhead particle execution
	const pX = new Float32Array(MAX_PARTICLES);
	const pY = new Float32Array(MAX_PARTICLES);
	const pVx = new Float32Array(MAX_PARTICLES);
	const pVy = new Float32Array(MAX_PARTICLES);
	const pLife = new Float32Array(MAX_PARTICLES);
	const pMaxLife = new Float32Array(MAX_PARTICLES);
	const pHue = new Float32Array(MAX_PARTICLES);
	const pSize = new Float32Array(MAX_PARTICLES);

	/** @type {number} */
	let activeParticleCount = 0;

	/** @type {BezierSlash[]} */
	const slashes = [];

	/** @type {FloatingText[]} */
	const floatingTexts = [];

	/** @type {CinematicBanner|null} */
	let activeBanner = null;

	/** @type {number} */
	let shakeIntensity = 0;
	//#endregion

	//#region [SEC-02] Canvas Lifecycle & Viewport Synchronization
	/**
	 * Mounts and binds the overlay canvas to the active combat viewport DOM element.
	 * [State Mutating]
	 * @returns {void}
	 */
	function ensureCanvas() {
		if (typeof document === "undefined") return;
		if (canvas?.parentElement) return;
		const combatView =
			document.getElementById("combat-theater") ||
			document.getElementById("combat-view");
		if (!combatView) return;
		combatView.style.position = "relative";
		canvas = /** @type {HTMLCanvasElement} */ (
			document.createElement("canvas")
		);
		canvas.id = "combat-vfx-canvas";
		canvas.style.position = "absolute";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "50";
		combatView.appendChild(canvas);
		ctx = canvas.getContext ? canvas.getContext("2d") : null;
		resize();
	}

	/**
	 * Resynchronizes canvas resolution to match parent bounding rectangle and DPR.
	 * [State Mutating]
	 * @returns {void}
	 */
	function resize() {
		if (!canvas?.parentElement || !ctx) return;
		const rect = canvas.parentElement.getBoundingClientRect
			? canvas.parentElement.getBoundingClientRect()
			: { width: 600, height: 400 };
		const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
		canvas.width = (rect.width || 600) * dpr;
		canvas.height = (rect.height || 400) * dpr;
		if (ctx.setTransform) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);
		}
	}
	//#endregion

	//#region [SEC-03] Spatial Coordinate Mapping & Target Projection
	/**
	 * Resolves physical pixel center coordinates for a target formation slot.
	 * [Pure Query / DOM Inspection]
	 * @param {boolean} isAllyTarget - Whether targeting party formation or hostile wing.
	 * @param {number} [targetIndex=0] - Numerical roster index.
	 * @returns {Point2D} 2D pixel coordinate relative to canvas top-left.
	 */
	function getTargetCoords(isAllyTarget, targetIndex = 0) {
		ensureCanvas();
		if (!canvas) return { x: 200, y: 150 };
		const rect = canvas.getBoundingClientRect
			? canvas.getBoundingClientRect()
			: { left: 0, top: 0, width: 600, height: 400 };
		if (typeof document !== "undefined") {
			if (isAllyTarget) {
				const cards = document.querySelectorAll(".character");
				const targetCard =
					cards[targetIndex] ||
					document.querySelector(".character.active-turn") ||
					document.querySelector(".character:not(.fainted)");
				if (targetCard?.getBoundingClientRect) {
					const cRect = targetCard.getBoundingClientRect();
					return {
						x: cRect.left - rect.left + cRect.width / 2,
						y: cRect.top - rect.top + cRect.height / 2,
					};
				}
				return { x: (rect.width || 600) * 0.25, y: (rect.height || 400) * 0.5 };
			}
			const enemies = document.querySelectorAll(".enemy");
			const targetEnemy =
				enemies[targetIndex] ||
				document.querySelector(".enemy.targetable") ||
				document.querySelector(".enemy:not(.dead)");
			if (targetEnemy?.getBoundingClientRect) {
				const eRect = targetEnemy.getBoundingClientRect();
				return {
					x: eRect.left - rect.left + eRect.width / 2,
					y: eRect.top - rect.top + eRect.height / 2,
				};
			}
		}
		return { x: (rect.width || 600) * 0.75, y: (rect.height || 400) * 0.5 };
	}
	//#endregion

	//#region [SEC-04] Particle Physics Kernel & Impulse Generation
	/**
	 * Commits a single kinetic particle directly into the pre-allocated typed arrays.
	 * [State Mutating]
	 * @param {number} x - Initial X coordinate.
	 * @param {number} y - Initial Y coordinate.
	 * @param {number} vx - Horizontal velocity impulse.
	 * @param {number} vy - Vertical velocity impulse.
	 * @param {number} life - Lifespan duration in seconds.
	 * @param {number} hue - Color hue in degrees [0 - 360].
	 * @param {number} size - Visual radius in pixels.
	 * @returns {void}
	 */
	function spawnParticle(x, y, vx, vy, life, hue, size) {
		if (activeParticleCount >= MAX_PARTICLES) return;
		const idx = activeParticleCount++;
		pX[idx] = x;
		pY[idx] = y;
		pVx[idx] = vx;
		pVy[idx] = vy;
		pLife[idx] = life;
		pMaxLife[idx] = life;
		pHue[idx] = hue;
		pSize[idx] = size;
	}

	/**
	 * Generates a radial emission burst of kinetic particles.
	 * [State Mutating]
	 * @param {number} x - Origin X coordinate.
	 * @param {number} y - Origin Y coordinate.
	 * @param {number} [count=12] - Quantity of particles to spawn.
	 * @param {number} [hue=25] - Color hue in degrees.
	 * @param {number} [speed=3.5] - Radial dispersion velocity.
	 * @returns {void}
	 */
	function spawnBurst(x, y, count = 12, hue = 25, speed = 3.5) {
		for (let i = 0; i < count; i++) {
			const angle = prngFloat() * Math.PI * 2;
			const velocity = (prngFloat() * 0.7 + 0.3) * speed;
			const vx = Math.cos(angle) * velocity;
			const vy = Math.sin(angle) * velocity;
			const life = 0.35 + prngFloat() * 0.35;
			const size = 1.5 + prngFloat() * 2.5;
			spawnParticle(x, y, vx, vy, life, hue, size);
		}
		startLoop();
	}

	/**
	 * Sets the screen shake displacement impulse.
	 * [State Mutating]
	 * @param {number} [intensity=6] - Magnitude of viewport displacement.
	 * @returns {void}
	 */
	function triggerScreenShake(intensity = 6) {
		shakeIntensity = intensity;
	}
	//#endregion

	//#region [SEC-05] Kinetic Floating Text & Cinematic Banner Engine
	/**
	 * Instantiates a floating combat telemetry label.
	 * [State Mutating]
	 * @param {number} x - Origin X coordinate.
	 * @param {number} y - Origin Y coordinate.
	 * @param {string|number} text - Content to display.
	 * @param {string} [color='#ff5555'] - Hex or CSS color string.
	 * @param {boolean} [isLarge=false] - Emphasized typographic rendering flag.
	 * @returns {void}
	 */
	function spawnFloatingText(x, y, text, color = "#ff5555", isLarge = false) {
		if (floatingTexts.length >= MAX_FLOATING_TEXTS) {
			floatingTexts.shift();
		}
		floatingTexts.push({
			x: x + (prngFloat() * 16 - 8),
			y: y - 10,
			text: String(text),
			color,
			isLarge,
			alpha: 1.0,
			vy: -1.8,
			life: 1.1,
			maxLife: 1.1,
		});
		startLoop();
	}

	/**
	 * Displays a cinematic full-width marquee overlay banner.
	 * [State Mutating]
	 * @param {string} text - Headline message string.
	 * @param {string} [subtext=''] - Subordinate narrative string.
	 * @param {string} [color='#ff9d4d'] - Accent and border color token.
	 * @param {number} [duration=2.2] - Total visible lifespan in seconds.
	 * @returns {void}
	 */
	function showBanner(text, subtext = "", color = "#ff9d4d", duration = 2.2) {
		activeBanner = {
			text,
			subtext,
			color,
			timer: duration,
			maxTime: duration,
			alpha: 0,
		};
		triggerScreenShake(7);
		startLoop();
	}
	//#endregion

	//#region [SEC-06] Procedural Slash Trajectories & Kinetic VFX Generators
	/**
	 * Renders a kinetic melee slash trajectory and activates target particle emissions.
	 * [State Mutating]
	 * @param {boolean} [isAllyTarget=false] - Target side orientation.
	 * @param {number} [targetIndex=0] - Target slot index.
	 * @returns {void}
	 */
	function playSlashVFX(isAllyTarget = false, targetIndex = 0) {
		const { x, y } = getTargetCoords(isAllyTarget, targetIndex);
		triggerScreenShake(8);
		const dir = isAllyTarget ? 1 : -1;
		slashes.push({
			startX: x + dir * 35,
			startY: y - 35,
			endX: x - dir * 35,
			endY: y + 35,
			ctrlX: x + dir * 10,
			ctrlY: y,
			color: isAllyTarget ? "#ef4444" : "#ff9d4d",
			alpha: 1.0,
			life: 0.25,
			maxLife: 0.25,
		});
		spawnBurst(x, y, 16, isAllyTarget ? 0 : 30, 4.0);
		startLoop();
	}

	/**
	 * Renders a defensive spark deflection at the specified target slot.
	 * [State Mutating]
	 * @param {number} [targetIndex=0] - Target slot index.
	 * @param {boolean} [isAllyTarget=false] - Target side orientation.
	 * @returns {void}
	 */
	function playDeflectVFX(targetIndex = 0, isAllyTarget = false) {
		const { x, y } = getTargetCoords(isAllyTarget, targetIndex);
		triggerScreenShake(4);
		spawnBurst(x, y, 18, 200, 5.0);
		startLoop();
	}
	//#endregion

	//#region [SEC-07] Simulation Tick & Particle Life State Propagation
	/**
	 * Updates particle positions and performs constant-time swap-and-pop on death.
	 * [State Mutating]
	 * @param {number} dt - Frame elapsed delta time.
	 * @returns {void}
	 */
	function updateParticleBuffers(dt) {
		for (let i = activeParticleCount - 1; i >= 0; i--) {
			pLife[i] -= dt;
			if (pLife[i] <= 0) {
				const last = --activeParticleCount;
				pX[i] = pX[last];
				pY[i] = pY[last];
				pVx[i] = pVx[last];
				pVy[i] = pVy[last];
				pLife[i] = pLife[last];
				pMaxLife[i] = pMaxLife[last];
				pHue[i] = pHue[last];
				pSize[i] = pSize[last];
				continue;
			}
			pX[i] += pVx[i];
			pY[i] += pVy[i];
			pVx[i] *= 0.96;
			pVy[i] += 0.08;
		}
	}

	/**
	 * Updates and evicts active Bezier slash curves.
	 * [State Mutating]
	 * @param {number} dt - Frame elapsed delta time.
	 * @returns {void}
	 */
	function updateSlashCurves(dt) {
		for (let i = slashes.length - 1; i >= 0; i--) {
			const s = slashes[i];
			s.life -= dt;
			s.alpha = Math.max(0, s.life / s.maxLife);
			if (s.life <= 0) {
				slashes.splice(i, 1);
			}
		}
	}

	/**
	 * Updates velocities and opacities of active floating telemetry numbers.
	 * [State Mutating]
	 * @param {number} dt - Frame elapsed delta time.
	 * @returns {void}
	 */
	function updateFloatingTexts(dt) {
		for (let i = floatingTexts.length - 1; i >= 0; i--) {
			const ft = floatingTexts[i];
			ft.life -= dt;
			ft.y += ft.vy;
			ft.vy *= 0.94;
			ft.alpha = Math.max(0, ft.life / ft.maxLife);
			if (ft.life <= 0) {
				floatingTexts.splice(i, 1);
			}
		}
	}

	/**
	 * Advances the animation envelope of the cinematic marquee banner.
	 * [State Mutating]
	 * @param {number} dt - Frame elapsed delta time.
	 * @returns {void}
	 */
	function updateCinematicBanner(dt) {
		if (!activeBanner) return;
		activeBanner.timer -= dt;
		const progress = 1.0 - activeBanner.timer / activeBanner.maxTime;
		if (progress < 0.2) {
			activeBanner.alpha = progress / 0.2;
		} else if (progress > 0.8) {
			activeBanner.alpha = Math.max(0, (1.0 - progress) / 0.2);
		} else {
			activeBanner.alpha = 1.0;
		}
		if (activeBanner.timer <= 0) {
			activeBanner = null;
		}
	}

	/**
	 * Dampens the screen shake displacement impulse over time.
	 * [State Mutating]
	 * @param {number} dt - Frame elapsed delta time.
	 * @returns {void}
	 */
	function updateScreenShake(dt) {
		if (shakeIntensity > 0) {
			shakeIntensity = Math.max(0, shakeIntensity - dt * 25);
		}
	}

	/**
	 * Orchestrates the internal simulation frame tick across all subsystem entities.
	 * [State Mutating]
	 * @param {number} dt - Elapsed frame delta time in seconds.
	 * @returns {void}
	 */
	function updateVFX(dt) {
		updateParticleBuffers(dt);
		updateSlashCurves(dt);
		updateFloatingTexts(dt);
		updateCinematicBanner(dt);
		updateScreenShake(dt);
	}
	//#endregion

	//#region [SEC-08] Composite Viewport Renderer & Frame Loop Orchestration
	/**
	 * Renders active particle buffers to the 2D context.
	 * [DOM Canvas Render]
	 * @returns {void}
	 */
	function renderParticles() {
		if (!ctx) return;
		for (let i = 0; i < activeParticleCount; i++) {
			const alpha = Math.max(0, pLife[i] / pMaxLife[i]);
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.fillStyle = `hsl(${pHue[i]}, 100%, 65%)`;
			ctx.beginPath();
			ctx.arc(pX[i], pY[i], pSize[i], 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	/**
	 * Renders transient Bezier slashes to the 2D context.
	 * [DOM Canvas Render]
	 * @returns {void}
	 */
	function renderSlashes() {
		if (!ctx) return;
		slashes.forEach((s) => {
			ctx.save();
			ctx.globalAlpha = s.alpha;
			ctx.strokeStyle = s.color;
			ctx.lineWidth = 3;
			ctx.shadowColor = s.color;
			ctx.shadowBlur = 10;
			ctx.beginPath();
			ctx.moveTo(s.startX, s.startY);
			ctx.quadraticCurveTo(s.ctrlX, s.ctrlY, s.endX, s.endY);
			ctx.stroke();
			ctx.restore();
		});
	}

	/**
	 * Renders floating damage and heal values to the 2D context.
	 * [DOM Canvas Render]
	 * @returns {void}
	 */
	function renderFloatingTexts() {
		if (!ctx) return;
		floatingTexts.forEach((ft) => {
			ctx.save();
			ctx.globalAlpha = ft.alpha;
			ctx.fillStyle = ft.color;
			ctx.font = ft.isLarge ? "bold 13px monospace" : "bold 9px monospace";
			ctx.textAlign = "center";
			ctx.shadowColor = "#000000";
			ctx.shadowBlur = 4;
			ctx.fillText(ft.text, ft.x, ft.y);
			ctx.restore();
		});
	}

	/**
	 * Renders the cinematic marquee banner overlay to the 2D context.
	 * [DOM Canvas Render]
	 * @param {number} w - Viewport canvas width.
	 * @param {number} h - Viewport canvas height.
	 * @returns {void}
	 */
	function renderBanner(w, h) {
		if (!ctx || !activeBanner || activeBanner.alpha <= 0.01) return;
		const cx = w / 2;
		const cy = h * 0.32;
		ctx.save();
		ctx.globalAlpha = activeBanner.alpha;
		ctx.fillStyle = "rgba(10, 10, 18, 0.85)";
		ctx.fillRect(0, cy - 28, w, 56);
		ctx.strokeStyle = activeBanner.color;
		ctx.lineWidth = 1;
		ctx.strokeRect(0, cy - 28, w, 56);
		ctx.fillStyle = activeBanner.color;
		ctx.font = "bold 12px monospace";
		ctx.textAlign = "center";
		ctx.fillText(activeBanner.text, cx, cy - 4);
		if (activeBanner.subtext) {
			ctx.fillStyle = "#dbe4ef";
			ctx.font = "7.5px monospace";
			ctx.fillText(activeBanner.subtext, cx, cy + 14);
		}
		ctx.restore();
	}

	/**
	 * Executes a single frame render pass compositing particles, curves, text, and overlays.
	 * [State Mutating / DOM Canvas Render]
	 * @returns {void}
	 */
	function renderFrame() {
		if (!ctx || !canvas) {
			animFrameId = null;
			return;
		}

		const w = canvas.width || 600;
		const h = canvas.height || 400;
		ctx.clearRect(0, 0, w, h);

		ctx.save();
		if (shakeIntensity > 0.2) {
			const ox = (prngFloat() * 2 - 1) * shakeIntensity;
			const oy = (prngFloat() * 2 - 1) * shakeIntensity;
			ctx.translate(ox, oy);
		}

		renderParticles();
		renderSlashes();
		renderFloatingTexts();
		renderBanner(w, h);

		ctx.restore();

		updateVFX(0.016);

		const hasActiveEffects =
			activeParticleCount > 0 ||
			slashes.length > 0 ||
			floatingTexts.length > 0 ||
			activeBanner !== null ||
			shakeIntensity > 0.2;

		if (hasActiveEffects && typeof requestAnimationFrame !== "undefined") {
			animFrameId = requestAnimationFrame(renderFrame);
		} else {
			animFrameId = null;
		}
	}

	/**
	 * Initializes the requestAnimationFrame rendering loop if currently dormant.
	 * [State Mutating]
	 * @returns {void}
	 */
	function startLoop() {
		if (!animFrameId && typeof requestAnimationFrame !== "undefined") {
			animFrameId = requestAnimationFrame(renderFrame);
		}
	}
	//#endregion

	//#region [SEC-09] VSRP-001 Peripheral Driver Interface & EventBus Gateway
	/**
	 * Resolves polymorphic EventBus handles passed by either naked bus or host wrapper.
	 * [Pure Query]
	 * @param {{ eventBus?: EventBusSubscriber } | EventBusSubscriber | null | undefined} context
	 * @returns {EventBusSubscriber|null}
	 */
	function resolveEventBusInstance(context) {
		if (!context) return null;
		if (
			typeof (/** @type {EventBusSubscriber} */ (context).subscribe) ===
			"function"
		) {
			return /** @type {EventBusSubscriber} */ (context);
		}
		if (
			"eventBus" in context &&
			context.eventBus &&
			typeof context.eventBus.subscribe === "function"
		) {
			return context.eventBus;
		}
		return null;
	}

	/**
	 * Resolves floating damage text typography color token.
	 * [Pure Query]
	 * @param {boolean} isHeal
	 * @param {boolean} isCrit
	 * @param {boolean} isAlly
	 * @returns {string}
	 */
	function resolveDamageTextColor(isHeal, isCrit, isAlly) {
		if (isHeal) return "#34d399";
		if (isCrit) return "#fbbf24";
		if (isAlly) return "#ef4444";
		return "#ffffff";
	}

	/**
	 * Formats numeric delta string with optional critical strike indicator.
	 * [Pure Query]
	 * @param {number} amount
	 * @param {boolean} isHeal
	 * @param {boolean} isCrit
	 * @returns {string}
	 */
	function formatDamageText(amount, isHeal, isCrit) {
		if (isHeal) return `+${amount}`;
		const suffix = isCrit ? "!" : "";
		return `-${amount}${suffix}`;
	}

	/**
	 * Resolves emission burst hue angle based on semantic action type.
	 * [Pure Query]
	 * @param {boolean} isHeal
	 * @param {boolean} isCrit
	 * @returns {number}
	 */
	function resolveBurstHue(isHeal, isCrit) {
		if (isHeal) return 140;
		if (isCrit) return 45;
		return 0;
	}

	return {
		/**
		 * Mounts the peripheral driver to the host runtime and hooks EventBus topics.
		 * [State Mutating]
		 * @param {{ eventBus?: EventBusSubscriber } | EventBusSubscriber} [context] - Host context handle.
		 * @returns {void}
		 */
		init(context) {
			this.destroy();
			eventBus = resolveEventBusInstance(context);

			ensureCanvas();
			if (typeof window !== "undefined") {
				window.addEventListener("resize", resize);
			}

			if (eventBus) {
				unsubs.push(
					eventBus.subscribe(
						"combat:damage",
						(/** @type {CombatDamagePayload} */ payload) => {
							const isAlly = payload.targetType === "party";
							const { x, y } = getTargetCoords(
								isAlly,
								payload.targetIndex || 0,
							);
							const isHeal = Boolean(payload.isHeal);
							const isCrit = Boolean(payload.isCrit);
							const color = resolveDamageTextColor(isHeal, isCrit, isAlly);
							const text = formatDamageText(payload.amount, isHeal, isCrit);
							const burstCount = isCrit ? 20 : 8;
							const burstHue = resolveBurstHue(isHeal, isCrit);
							spawnFloatingText(x, y, text, color, isCrit);
							spawnBurst(x, y, burstCount, burstHue, 4.0);
						},
					),
					eventBus.subscribe(
						"combat:text",
						(/** @type {CombatTextPayload} */ payload) => {
							const { x, y } = getTargetCoords(
								payload.targetType === "party",
								payload.targetIndex || 0,
							);
							spawnFloatingText(
								x,
								y,
								payload.text,
								payload.color || "#38bdf8",
								Boolean(payload.isLarge),
							);
						},
					),
					eventBus.subscribe(
						"combat:banner",
						(/** @type {CombatBannerPayload} */ payload) => {
							showBanner(
								payload.text,
								payload.subtext || "",
								payload.color || "#ff9d4d",
								payload.duration || 2.2,
							);
						},
					),
					eventBus.subscribe(
						"combat:animation",
						(/** @type {CombatAnimationPayload} */ payload) => {
							const isAlly = payload.targetType === "party";
							if (payload.animation === "LUNGE") {
								playSlashVFX(isAlly, payload.targetIndex || 0);
							} else if (payload.animation === "DEFLECT") {
								playDeflectVFX(payload.targetIndex || 0, isAlly);
							} else if (
								payload.animation === "KNOCKBACK" ||
								payload.animation === "PULL"
							) {
								const { x, y } = getTargetCoords(
									isAlly,
									payload.targetIndex || 0,
								);
								spawnBurst(x, y, 14, 210, 4.0);
							}
						},
					),
				);
			}
		},

		spawnBurst,
		playSlashVFX,
		triggerScreenShake,
		showBanner,

		/**
		 * Produces a diagnostic snapshot for the Sentinel Auditor.
		 * [Pure Query]
		 * @returns {CombatVFXDiagnostics} Telemetry report payload.
		 */
		getDiagnostics() {
			return {
				driverId: "combat_vfx",
				activeParticles: activeParticleCount,
				activeSlashes: slashes.length,
				activeTexts: floatingTexts.length,
				hasBanner: Boolean(activeBanner),
				isLoopRunning: Boolean(animFrameId),
			};
		},

		/**
		 * Reports subsystem capabilities and version metadata.
		 * [Pure Query]
		 * @returns {CombatVFXModuleInfo} Static module manifest.
		 */
		getModuleInfo() {
			return {
				moduleId: "combat_vfx_driver",
				version: "1.0.0",
				protocolVersion: "VSRP-001",
				capabilities: [
					"typed_particle_pool",
					"bezier_slashes",
					"kinetic_floating_text",
					"cinematic_banners",
					"screen_shake",
				],
			};
		},

		/**
		 * Teardown routine releasing canvas, listeners, and clearing memory pools.
		 * [State Mutating]
		 * @returns {void}
		 */
		destroy() {
			if (animFrameId && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(animFrameId);
				animFrameId = null;
			}
			unsubs.forEach((u) => {
				try {
					if (typeof u === "function") u();
				} catch (_) { }
			});
			unsubs = [];
			if (typeof window !== "undefined") {
				window.removeEventListener("resize", resize);
			}
			if (canvas?.parentElement) {
				canvas.remove();
			}
			canvas = null;
			ctx = null;
			eventBus = null;
			activeParticleCount = 0;
			slashes.length = 0;
			floatingTexts.length = 0;
			activeBanner = null;
			shakeIntensity = 0;
		},
	};
	//#endregion
})();

//#region [SEC-10] Global Environment & CommonJS Module Export
if (typeof window !== "undefined") {
	window.EmberlightCombatVFX = EmberlightCombatVFX;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightCombatVFX;
}
//#endregion
