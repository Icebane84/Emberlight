/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RELIC FORGE DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-RELIC-FORGE-RENDERER
 * Governing Protocol:  VSRP-001[cite: 6]
 * Authority:           Peripheral Presentation[cite: 6]
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
 *   [SEC-02] Transient Particle Dissipation System
 *   [SEC-03] Procedural Visual Math Kernels & Recipe Resolver
 *   [SEC-04] Public VSRP-001 Tier-3 Interface Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} RelicForgeActionToken
 * @property {string} type Action token type.
 * @property {string} [category] Gear category ('WEAPON' | 'ARMOR' | 'ACCESSORY').
 * @property {number} [index] Character index slot.
 * @property {string} [recipeYield] Yielded canonical item ID.
 * @property {number} [cost] Gold cost expenditure.
 */

/**
 * @typedef {Object} RelicForgeCharacter
 * @property {string} id Unique character identifier.
 * @property {string} name Character display name.
 * @property {string} phenotype Character class phenotype.
 */

/**
 * @typedef {Object} RelicForgeState
 * @property {RelicForgeCharacter[]} [party] Party character array.
 * @property {number} [selectedCharIndex] Selected character index slot.
 * @property {string} [selectedCategory] Selected gear category.
 * @property {number} gold Current player gold.
 * @property {number} currentSeed Procedural generator seed.
 */

/**
 * @typedef {Object} ForgeRecipe
 * @property {string} label Item display name.
 * @property {string} canonicalId Manifest canonical item identifier.
 * @property {number} cost Gold purchase cost.
 * @property {string} slot Equipment slot string.
 * @property {(ctx: CanvasRenderingContext2D, size: number) => void} draw Procedural drawing function.
 */

/**
 * @typedef {Object} RelicForgeContext
 * @property {Object} [eventBus] Host event bus reference.
 */

/**
 * @typedef {Object} RelicForgeDiagnostics
 * @property {string} driverId Internal driver identifier string.
 */

const EmberlightRelicForgeRenderer = (() => {
	//#region [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
	/**
	 * Safely retrieves the relic forge view element from the DOM[cite: 6].
	 * (Pure presentation lookup utility)
	 * @returns {HTMLElement|null} View element instance or null.
	 */
	function getView() {
		return typeof document === 'undefined' ? null : document.getElementById('relic-forge-view');
	}

	/**
	 * Dispatches an action token via the provided dispatch callback[cite: 6].
	 * (Action inversion dispatcher)
	 * @param {(action: RelicForgeActionToken) => void} dispatch Dispatch handler function.
	 * @param {RelicForgeActionToken} action Action payload object.
	 * @returns {void}
	 */
	function emit(dispatch, action) {
		if (typeof dispatch === 'function') dispatch(action);
	}
	//#endregion

	//#region [SEC-02] Transient Particle Dissipation System
	/**
	 * Executes a transient particle burst animation for the relic forging sequence[cite: 6].
	 * (State-mutating animation procedure)
	 * @param {HTMLCanvasElement|null} canvas Canvas target element.
	 * @param {number} seed Procedural math seed.
	 * @param {(() => void)|null} [onComplete] Callback triggered upon animation completion.
	 * @returns {void}
	 */
	function playForgeBurst(canvas, seed, onComplete) {
		if (!canvas || typeof canvas.getContext !== 'function') {
			if (typeof onComplete === 'function') onComplete();
			return;
		}
		const rawCtx = canvas.getContext('2d');
		if (!rawCtx) {
			if (typeof onComplete === 'function') onComplete();
			return;
		}
		const ctx = rawCtx;
		const w = canvas.width;
		const h = canvas.height;
		const cx = w / 2;
		const cy = h / 2;
		const particleCount = 70;
		const hueBase = (seed * 47) % 360;

		const px = new Float32Array(particleCount).fill(cx);
		const py = new Float32Array(particleCount).fill(cy);
		const vx = new Float32Array(particleCount);
		const vy = new Float32Array(particleCount);
		const life = new Float32Array(particleCount);
		const maxLife = new Float32Array(particleCount);
		const size = new Float32Array(particleCount);

		const prng = (typeof EmberlightPRNG !== 'undefined') ? EmberlightPRNG.create(seed) : { nextFloat: () => 0.5 };

		for (let i = 0; i < particleCount; i++) {
			const angle = prng.nextFloat() * Math.PI * 2;
			const velocity = 2.0 + prng.nextFloat() * 5.5;
			vx[i] = Math.cos(angle) * velocity;
			vy[i] = Math.sin(angle) * velocity;
			life[i] = 0;
			maxLife[i] = 20 + prng.nextFloat() * 15;
			size[i] = 1.5 + prng.nextFloat() * 2.5;
		}

		/** @type {number|null} */
		let animFrameId = null;

		function stepBurst() {
			let activeParticles = 0;
			ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
			ctx.fillRect(0, 0, w, h);
			ctx.save();

			for (let i = 0; i < particleCount; i++) {
				if (life[i] < maxLife[i]) {
					activeParticles++;
					life[i]++;

					px[i] += vx[i];
					py[i] += vy[i];
					vx[i] *= 0.94;
					vy[i] *= 0.94;
					vy[i] += 0.12;

					const progress = life[i] / maxLife[i];
					const alpha = 1.0 - progress;

					const hueOffset = ((i * 7) % 40) - 20;
					ctx.fillStyle = `hsla(${hueBase + hueOffset}, 100%, 65%, ${alpha})`;
					ctx.shadowColor = '#ff9d4d';
					ctx.shadowBlur = 6;
					ctx.beginPath();
					ctx.arc(px[i], py[i], size[i] * (1.0 - progress * 0.5), 0, Math.PI * 2);
					ctx.fill();
				}
			}

			ctx.restore();

			if (activeParticles > 0) {
				animFrameId = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(stepBurst) : null;
			} else {
				if (typeof cancelAnimationFrame !== 'undefined' && animFrameId !== null) {
					cancelAnimationFrame(animFrameId);
				}
				if (typeof onComplete === 'function') onComplete();
			}
		}

		stepBurst();
	}
	//#endregion

	//#region [SEC-03] Procedural Visual Math Kernels & Recipe Resolver
	/**
	 * Renders a procedural blade weapon graphic[cite: 6].
	 * (Pure presentation drawing procedure)
	 * @param {CanvasRenderingContext2D} ctx 2D rendering context.
	 * @param {number} seed Procedural math seed.
	 * @returns {void}
	 */
	function drawBlade(ctx, seed) {
		const hue = (seed * 47) % 360;
		ctx.save();
		ctx.translate(48, 48);
		ctx.rotate(-Math.PI / 4);

		const grad = ctx.createLinearGradient(-6, 0, 6, 0);
		grad.addColorStop(0, `hsl(${hue}, 20%, 85%)`);
		grad.addColorStop(0.5, `hsl(${hue}, 40%, 35%)`);
		grad.addColorStop(1, `hsl(${hue}, 20%, 95%)`);

		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.moveTo(-6, -6);
		ctx.lineTo(0, -38);
		ctx.lineTo(6, -6);
		ctx.closePath();
		ctx.fill();

		ctx.strokeStyle = `hsl(${hue}, 30%, 15%)`;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(0, -6);
		ctx.lineTo(0, -28);
		ctx.stroke();

		ctx.fillStyle = '#eab308';
		ctx.fillRect(-12, -6, 24, 4);
		ctx.fillStyle = '#451a03';
		ctx.fillRect(-2, -2, 4, 16);

		ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
		ctx.beginPath();
		ctx.arc(0, 15, 3.5, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	/**
	 * Renders a procedural staff weapon graphic[cite: 6].
	 * (Pure presentation drawing procedure)
	 * @param {CanvasRenderingContext2D} ctx 2D rendering context.
	 * @param {number} seed Procedural math seed.
	 * @returns {void}
	 */
	function drawStaff(ctx, seed) {
		const hue = (seed * 83) % 360;
		ctx.save();
		ctx.translate(48, 48);
		ctx.rotate(Math.PI / 4);

		ctx.fillStyle = '#78350f';
		ctx.fillRect(-2, -28, 4, 58);

		ctx.strokeStyle = '#eab308';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(0, -28, 10, Math.PI * 0.15, Math.PI * 0.85, true);
		ctx.stroke();

		ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
		ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(0, -28, 6, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	/**
	 * Renders a procedural chainmail armor graphic[cite: 6].
	 * (Pure presentation drawing procedure)
	 * @param {CanvasRenderingContext2D} ctx 2D rendering context.
	 * @param {number} seed Procedural math seed.
	 * @returns {void}
	 */
	function drawMail(ctx, seed) {
		const hue = (seed * 29) % 360;
		ctx.save();
		ctx.translate(48, 48);

		ctx.fillStyle = `hsl(${hue}, 15%, 45%)`;
		ctx.strokeStyle = '#cbd5e1';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-18, -22);
		ctx.lineTo(18, -22);
		ctx.lineTo(22, -6);
		ctx.lineTo(14, 24);
		ctx.lineTo(-14, 24);
		ctx.lineTo(-22, -6);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.strokeStyle = '#eab308';
		ctx.beginPath();
		ctx.moveTo(-14, -8);
		ctx.lineTo(0, 4);
		ctx.lineTo(14, -8);
		ctx.stroke();

		ctx.restore();
	}

	/**
	 * Renders a procedural magic robe graphic[cite: 6].
	 * (Pure presentation drawing procedure)
	 * @param {CanvasRenderingContext2D} ctx 2D rendering context.
	 * @param {number} seed Procedural math seed.
	 * @returns {void}
	 */
	function drawRobe(ctx, seed) {
		const hue = (seed * 61) % 360;
		ctx.save();
		ctx.translate(48, 48);

		ctx.fillStyle = `hsl(${hue}, 60%, 35%)`;
		ctx.strokeStyle = '#fef08a';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(-16, -24);
		ctx.lineTo(16, -24);
		ctx.lineTo(22, 26);
		ctx.lineTo(-22, 26);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = '#fef08a';
		ctx.fillRect(-3, -24, 6, 50);

		ctx.restore();
	}

	/**
	 * Renders a procedural accessory ring graphic[cite: 6].
	 * (Pure presentation drawing procedure)
	 * @param {CanvasRenderingContext2D} ctx 2D rendering context.
	 * @param {number} seed Procedural math seed.
	 * @returns {void}
	 */
	function drawRing(ctx, seed) {
		const hue = (seed * 113) % 360;
		ctx.save();
		ctx.translate(48, 48);

		ctx.strokeStyle = '#f59e0b';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(0, 4, 16, 0, Math.PI * 2);
		ctx.stroke();

		ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
		ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.moveTo(0, -18);
		ctx.lineTo(7, -11);
		ctx.lineTo(0, -4);
		ctx.lineTo(-7, -11);
		ctx.closePath();
		ctx.fill();

		ctx.restore();
	}

	/**
	 * Resolves the active forging recipe based on character phenotype and category[cite: 6].
	 * (Pure calculation utility)
	 * @param {string} phenotype Character phenotype key.
	 * @param {string} category Gear category ('WEAPON' | 'ARMOR' | 'ACCESSORY').
	 * @returns {ForgeRecipe} Recipe definition object.
	 */
	function getActiveRecipe(phenotype, category) {
		const isMartial = phenotype === 'HERO' || phenotype === 'WARRIOR';

		if (category === 'WEAPON') {
			return {
				label: isMartial ? 'Tempered Runeblade' : 'Aetheric Focus Staff',
				canonicalId: isMartial ? 'IRON_SWORD' : 'OAK_STAFF',
				cost: 45,
				slot: 'weapon',
				draw: isMartial ? drawBlade : drawStaff,
			};
		} else if (category === 'ARMOR') {
			return {
				label: isMartial ? 'Heavy Plate Mail' : 'Arcane Spellweave Mantle',
				canonicalId: isMartial ? 'CHAINMAIL' : 'MAGE_ROBE',
				cost: 65,
				slot: 'armor',
				draw: isMartial ? drawMail : drawRobe,
			};
		} else {
			return {
				label: 'Celestial Resonance Band',
				canonicalId: 'SWIFT_RING',
				cost: 55,
				slot: 'accessory',
				draw: drawRing,
			};
		}
	}
	//#endregion

	//#region [SEC-04] Public VSRP-001 Tier-3 Interface Gateway
	return {
		/**
		 * Initializes the Relic Forge presentation driver[cite: 6].
		 * (State-mutating lifecycle gateway)
		 * @param {RelicForgeContext} [_context] Host context container.
		 * @returns {void}
		 */
		init(_context) { },

		/**
		 * Renders the Relic Forge presentation interface and binds actions[cite: 6].
		 * (State-mutating DOM presenter)
		 * @param {RelicForgeState} state Active forge state snapshot.
		 * @param {(action: RelicForgeActionToken) => void} dispatch Action dispatch handler.
		 * @returns {void}
		 */
		renderRelicForge(state, dispatch) {
			const container = getView();
			if (!container || !state) return;
			container.innerHTML = '';

			const char = state.party?.[state.selectedCharIndex || 0] || state.party?.[0] || { name: 'Hero', phenotype: 'HERO' };
			const recipe = getActiveRecipe(char.phenotype, state.selectedCategory || 'WEAPON');
			const canAfford = state.gold >= recipe.cost;

			const panel = document.createElement('div');
			panel.className = 'panel';
			panel.style.borderColor = 'var(--ember)';
			panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:6px; margin-bottom:10px;">
          <div class="panel-title" style="color:var(--ember); margin:0; border:none; padding:0;">DISTRICT 9: THE RELIC FORGE</div>
          <div style="font-size:9px; color:var(--ember); font-weight:bold;">PURSE: ${state.gold}g</div>
        </div>

        <!-- Character Phenotype Selector Tabs -->
        <div id="forge-char-tabs" style="display:flex; gap:6px; margin-bottom:10px;"></div>

        <!-- Gear Slot Category Tabs -->
        <div style="display:flex; gap:6px; margin-bottom:12px;">
          <button type="button" class="cmd-btn ${state.selectedCategory === 'WEAPON' ? 'run' : ''}" id="cat-weapon-btn" style="flex:1; font-size:7px;">WEAPON</button>
          <button type="button" class="cmd-btn ${state.selectedCategory === 'ARMOR' ? 'run' : ''}" id="cat-armor-btn" style="flex:1; font-size:7px;">ARMOR</button>
          <button type="button" class="cmd-btn ${state.selectedCategory === 'ACCESSORY' ? 'run' : ''}" id="cat-acc-btn" style="flex:1; font-size:7px;">ACCESSORY</button>
        </div>

        <!-- Synthesis Preview Deck -->
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:14px; background:rgba(0,0,0,0.35); padding:10px; border:1px solid var(--border-dim);">
          <canvas id="forge-preview-canvas" width="96" height="96" style="background:#000; border:1px solid var(--border-dim); border-radius:4px; image-rendering:pixelated;"></canvas>
          <div style="font-size:8px; line-height:1.8;">
            <div style="color:var(--ember); font-weight:bold;">${recipe.label}</div>
            <div style="color:var(--text-dim);">Matrix Seed: #${state.currentSeed}</div>
            <div style="color:var(--ok);">Yields: ${recipe.canonicalId} (${recipe.slot.toUpperCase()})</div>
            <div style="color:var(--text-dim);">Cost: ${recipe.cost} Gold</div>
          </div>
        </div>

        <!-- Command Deck -->
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <button type="button" class="cmd-btn" id="forge-attune-btn" style="font-size:8px;">
            ⟳ RE-ATTUNE MATRIX
          </button>
          <div style="display:flex; gap:8px;">
            <button type="button" class="cmd-btn action" id="forge-craft-btn" style="font-size:8px;" ${canAfford ? '' : 'disabled'}>
              ⚙ FORGE GEAR (${recipe.cost}g)
            </button>
            <button type="button" class="cmd-btn back" id="close-forge-btn" style="font-size:8px;">
              RETURN
            </button>
          </div>
        </div>
      `;

			// 1. Populate Character Tabs
			const charTabs = panel.querySelector('#forge-char-tabs');
			(state.party || []).forEach((c, idx) => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = `cmd-btn ${idx === (state.selectedCharIndex || 0) ? 'action' : ''}`;
				btn.style.fontSize = '7px';
				btn.style.padding = '4px 8px';
				btn.textContent = `${c.name} (${c.phenotype})`;
				btn.onclick = () => emit(dispatch, { type: 'SELECT_CHAR', index: idx });
				if (charTabs) charTabs.appendChild(btn);
			});

			container.appendChild(panel);

			// 2. Render Procedural Canvas Preview
			const canvas = /** @type {HTMLCanvasElement|null} */ (panel.querySelector('#forge-preview-canvas'));
			const ctx = (canvas && typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;
			if (ctx) {
				ctx.clearRect(0, 0, 96, 96);
				recipe.draw(ctx, state.currentSeed);
			}

			// 3. Bind Actions
			const weaponBtn = panel.querySelector('#cat-weapon-btn');
			if (weaponBtn) weaponBtn.addEventListener('click', () => emit(dispatch, { type: 'SELECT_CATEGORY', category: 'WEAPON' }));

			const armorBtn = panel.querySelector('#cat-armor-btn');
			if (armorBtn) armorBtn.addEventListener('click', () => emit(dispatch, { type: 'SELECT_CATEGORY', category: 'ARMOR' }));

			const accBtn = panel.querySelector('#cat-acc-btn');
			if (accBtn) accBtn.addEventListener('click', () => emit(dispatch, { type: 'SELECT_CATEGORY', category: 'ACCESSORY' }));

			const attuneBtnEl = panel.querySelector('#forge-attune-btn');
			if (attuneBtnEl) attuneBtnEl.addEventListener('click', () => emit(dispatch, { type: 'REATTUNE' }));

			const craftBtnEl = panel.querySelector('#forge-craft-btn');
			if (craftBtnEl) {
				craftBtnEl.addEventListener('click', () => {
					if (state.gold < recipe.cost) return;

					const craftBtn = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#forge-craft-btn'));
					const attuneBtn = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#forge-attune-btn'));
					if (craftBtn) craftBtn.disabled = true;
					if (attuneBtn) attuneBtn.disabled = true;

					playForgeBurst(canvas, state.currentSeed, () => {
						emit(dispatch, {
							type: 'CRAFT_RECIPE',
							recipeYield: recipe.canonicalId,
							cost: recipe.cost,
						});
					});
				});
			}

			const closeForgeBtn = panel.querySelector('#close-forge-btn');
			if (closeForgeBtn) closeForgeBtn.addEventListener('click', () => emit(dispatch, { type: 'EXIT' }));
		},

		/**
		 * Returns diagnostic telemetry for the relic forge renderer[cite: 6].
		 * (Pure telemetry collector)
		 * @returns {RelicForgeDiagnostics} Diagnostic telemetry object.
		 */
		getDiagnostics() {
			return { driverId: 'relic_forge_renderer' };
		},

		/**
		 * Purges presentation allocations[cite: 6].
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() {
			const view = getView();
			if (view) view.innerHTML = '';
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightRelicForgeRenderer = EmberlightRelicForgeRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightRelicForgeRenderer;
}