/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: HARMONIC SEAL / LOCKPICK
 * Document Identifier: VSRP-001-LOCKPICK-CORE[cite: 4]
 * Governing Protocol:  VSRP-001[cite: 4]
 * Authority:           Ephemeral Simulation Tenant[cite: 4]
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Module State, Lifecycle Constants & Host Context
 *   [SEC-03] Simulation Vault & Lifecycle Assertion Helpers
 *   [SEC-04] Harmonic Seal Mathematics & Resonance Calculation
 *   [SEC-05] Canvas Waveform Projection & Harmonic Rendering
 *   [SEC-06] Parameter Selection & Cycling Subroutines
 *   [SEC-07] Domestic DOM Presentation & Event Bindings
 *   [SEC-08] Sealed Delta Envelope Dispatch & Host Action Router
 *   [SEC-09] Canonical VSRP-001 9-Method Interface & Module Export
 * ============================================================================
 */

const EmberlightLockpick = (() => {
	"use strict";

	//#region [SEC-01] Type Definitions & Contract Schemas
	/**
	 * @typedef {Object} HarmonicState
	 * @property {number} harmonicA - Harmonic frequency component A.
	 * @property {number} harmonicB - Harmonic frequency component B.
	 * @property {number} phase - Phase shift offset value.
	 */

	/**
	 * @typedef {Object} LockpickSimulation
	 * @property {string} sealKey - Unique seal identifier token.
	 * @property {string} sealFlag - World state flag toggled upon successful unlock.
	 * @property {{ x: number, y: number }} targetTile - Target world coordinate.
	 * @property {{ gold: number, item: string }} rewardLoot - Reward payload upon success.
	 * @property {number} time - Internal simulation time reference.
	 * @property {'A' | 'B' | 'PHASE'} selectedParam - Currently focused tuning parameter.
	 * @property {HarmonicState} target - Target arcane seal harmonic profile.
	 * @property {HarmonicState} player - Player attunement waveform profile.
	 * @property {boolean} active - Active simulation running flag.
	 */

	/**
	 * @typedef {Object} LockpickContext
	 * @property {{ publish?: function(string, any): void, subscribe?: function(string, function(any): void): function(): void }} [eventBus] - Host event bus handle.
	 */

	/**
	 * @typedef {Object} LockpickDiagnostics
	 * @property {string} moduleId - Unique module token.
	 * @property {string} lifecycleState - Current lifecycle state token.
	 * @property {number} resonance - Calculated resonance match percentage.
	 * @property {boolean} isActive - Simulation active status flag.
	 * @property {Object | null} config - Active configuration snapshot.
	 */

	/**
	 * @typedef {Object} LockpickModuleInfo
	 * @property {string} moduleId - Unique module token.
	 * @property {string} name - Human-readable module name.
	 * @property {'VSRP-001'} protocolVersion - Governing normative protocol.
	 * @property {string} version - Semantic version identifier.
	 * @property {string[]} capabilities - Registered capability tokens.
	 */
	//#endregion

	//#region [SEC-02] Module State, Lifecycle Constants & Host Context
	const State = {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};
	/** @type {string} */
	let lifecycleState = State.UNCONFIGURED;
	/** @type {Object | null} */
	let hostConfig = null;
	/** @type {LockpickContext | null} */
	let hostContext = null;
	//#endregion

	//#region [SEC-03] Simulation Vault & Lifecycle Assertion Helpers
	/** @type {LockpickSimulation | null} */
	let sim = null;
	/** @type {number | null} */
	let animFrameId = null;

	/**
	 * Asserts that the module is operating within permitted lifecycle states.
	 * Pure validation procedure.
	 * @param {...string} allowed - Permitted lifecycle state tokens.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:lockpick_core] Lifecycle Error: Invoked in "${lifecycleState}". Required: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Recursively freezes an object configuration structure.
	 * State-mutating utility procedure.
	 * @param {any} obj - Target object to freeze.
	 * @returns {any} Deeply frozen object reference.
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
	 * Dispatches sound effect triggers to the host event bus.
	 * State-mutating event dispatch procedure.
	 * @param {string} sfxName - Sound effect identifier token.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		hostContext?.eventBus?.publish?.('lockpick:sfx', { sfx: sfxName });
	}
	//#endregion

	//#region [SEC-04] Harmonic Seal Mathematics & Resonance Calculation
	/**
	 * Calculates the percentage resonance match between player and target waveforms.
	 * Pure mathematical calculation procedure.
	 * @returns {number} Resonance match percentage integer in [0, 100].
	 */
	function calculateResonance() {
		if (!sim) return 0;
		const diffA = Math.abs(sim.player.harmonicA - sim.target.harmonicA);
		const diffB = Math.abs(sim.player.harmonicB - sim.target.harmonicB);
		const diffPhase = Math.abs(sim.player.phase - sim.target.phase);

		const totalDiff = diffA + diffB + (diffPhase * 0.4);
		const rawResonance = Math.max(0, 1 - (totalDiff / 3.0));
		return Math.round(rawResonance * 100);
	}
	//#endregion

	//#region [SEC-05] Canvas Waveform Projection & Harmonic Rendering
	/**
	 * Projects and renders target and player harmonic sine waves onto canvas.
	 * State-mutating canvas render procedure.
	 * @param {HTMLCanvasElement | any} canvasElem - Target canvas DOM element.
	 * @returns {void}
	 */
	function drawHarmonics(canvasElem) {
		if (!canvasElem || !sim) return;
		const ctx = canvasElem.getContext('2d');
		const w = canvasElem.width;
		const h = canvasElem.height;
		const cx = w / 2;
		const cy = h / 2;
		const scale = (Math.min(w, h) / 2) * 0.78;

		ctx.clearRect(0, 0, w, h);

		ctx.save();
		ctx.translate(cx, cy);
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
		ctx.shadowColor = '#0284c7';
		ctx.shadowBlur = 4;
		ctx.beginPath();

		const sampleCount = 300;
		for (let i = 0; i <= sampleCount; i++) {
			const theta = (i / sampleCount) * (Math.PI * 2);
			const x = Math.sin(theta * sim.target.harmonicA + sim.time + sim.target.phase) * scale;
			const y = Math.cos(theta * sim.target.harmonicB + sim.time) * scale;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.restore();

		const resonance = calculateResonance();
		const isHarmonized = resonance >= 95;
		let strokeColor = '#ef4444';
		if (isHarmonized) {
			strokeColor = '#6fd97e';
		} else if (resonance > 75) {
			strokeColor = '#ff9d4d';
		}

		ctx.save();
		ctx.translate(cx, cy);
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineWidth = isHarmonized ? 3.0 : 2.0;
		ctx.strokeStyle = strokeColor;
		ctx.shadowColor = isHarmonized ? '#6fd97e' : '#ff9d4d';
		ctx.shadowBlur = isHarmonized ? 16 : 8;
		ctx.beginPath();

		for (let i = 0; i <= sampleCount; i++) {
			const theta = (i / sampleCount) * (Math.PI * 2);
			const x = Math.sin(theta * sim.player.harmonicA + sim.time + sim.player.phase) * scale;
			const y = Math.cos(theta * sim.player.harmonicB + sim.time) * scale;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.restore();
	}
	//#endregion

	//#region [SEC-06] Parameter Selection & Cycling Subroutines
	/**
	 * Cycles active parameter selection focus row.
	 * State-mutating simulation state update procedure.
	 * @param {number} dir - Direction index offset (-1 or 1).
	 * @returns {void}
	 */
	function cycleParam(dir) {
		if (!sim) return;
		const params = ['A', 'B', 'PHASE'];
		const curIdx = params.indexOf(sim.selectedParam || 'A');
		const nextIdx = (curIdx + dir + params.length) % params.length;
		sim.selectedParam = /** @type {'A' | 'B' | 'PHASE'} */ (params[nextIdx]);
		dispatchSFX('SELECT');
		renderDefaultPresentation();
	}
	//#endregion

	//#region [SEC-07] Domestic DOM Presentation & Event Bindings
	/**
	 * Binds event listeners to interactive control buttons.
	 * State-mutating DOM binding helper.
	 * @param {Element} panel - Parent DOM panel container.
	 * @param {string} btnId - Button element identifier selector.
	 * @param {function(): void} fn - Click execution callback.
	 */
	function bindMod(panel, btnId, fn) {
		const btn = panel.querySelector(btnId);
		if (btn) {
      /** @type {HTMLElement} */ (btn).onclick = () => {
				fn();
				dispatchSFX('SELECT');
				renderDefaultPresentation();
			};
		}
	}

	/**
	 * Determines the resonance status color.
	 * Pure evaluation helper.
	 * @param {number} resonance - Resonance percentage.
	 * @param {boolean} isHarmonized - Harmonized boolean flag.
	 * @returns {string} CSS variable color token.
	 */
	function getResonanceColor(resonance, isHarmonized) {
		if (isHarmonized) return 'var(--ok)';
		if (resonance > 75) return 'var(--ember)';
		return 'var(--danger)';
	}

	/**
	 * Computes parameter presentation styles for UI rendering.
	 * Pure data transformation helper.
	 * @param {string} sel - Selected parameter token.
	 * @returns {Object} Precomputed parameter styles object.
	 */
	function getParameterStyles(sel) {
		const isA = sel === 'A';
		const isB = sel === 'B';
		const isP = sel === 'PHASE';
		return {
			colorA: isA ? 'var(--ember)' : 'var(--text-dim)',
			weightA: isA ? 'bold' : 'normal',
			prefixA: isA ? '► ' : '',
			bgA: isA ? 'rgba(255,157,77,0.2)' : 'transparent',
			borderA: isA ? '1px solid var(--ember)' : '1px solid transparent',

			colorB: isB ? 'var(--ember)' : 'var(--text-dim)',
			weightB: isB ? 'bold' : 'normal',
			prefixB: isB ? '► ' : '',
			bgB: isB ? 'rgba(255,157,77,0.2)' : 'transparent',
			borderB: isB ? '1px solid var(--ember)' : '1px solid transparent',

			colorP: isP ? 'var(--ember)' : 'var(--text-dim)',
			weightP: isP ? 'bold' : 'normal',
			prefixP: isP ? '► ' : '',
			bgP: isP ? 'rgba(255,157,77,0.2)' : 'transparent',
			borderP: isP ? '1px solid var(--ember)' : '1px solid transparent',
		};
	}

	/**
	 * Builds panel inner HTML structure for the lockpick UI.
	 * Pure string builder helper.
	 * @param {number} resonance - Resonance percentage.
	 * @param {string} resonanceColor - CSS color token.
	 * @param {boolean} isHarmonized - Harmonized status flag.
	 * @param {Object} styles - Precomputed parameter styles object.
	 * @returns {string} Rendered HTML string.
	 */
	function buildPanelInnerHtml(resonance, resonanceColor, isHarmonized, styles) {
		return `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:6px; margin-bottom:10px;">
        <div class="panel-title" style="color:var(--ember); margin:0; border:none; padding:0;">DISTRICT 10: RESONANCE DISRUPTOR</div>
        <div style="font-size:8px; color:var(--text-dim);">SEAL: <b style="color:var(--text);">${sim?.sealKey}</b></div>
      </div>

      <div style="display:flex; gap:16px; align-items:center; margin-bottom:12px; background:rgba(0,0,0,0.4); padding:10px; border:1px solid var(--border-dim);">
        <canvas id="lockpick-canvas" width="140" height="140" style="background:#000; border:1px solid var(--border-dim); border-radius:4px;"></canvas>
        
        <div style="flex:1; font-size:8px; display:flex; flex-direction:column; gap:8px;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>RESONANCE MATCH</span>
              <span style="color:${resonanceColor}; font-weight:bold;">${resonance}%</span>
            </div>
            <div style="height:6px; background:#000; border:1px solid var(--border-dim);">
              <div style="height:100%; width:${resonance}%; background:${isHarmonized ? 'var(--ok)' : 'var(--ember)'}; transition:width 0.15s ease;"></div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; border-radius:3px; background:${styles.bgA}; border:${styles.borderA};">
              <span style="color:${styles.colorA}; font-weight:${styles.weightA};">${styles.prefixA}Harmonic A:</span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="cmd-btn" id="btn-a-down" style="font-size:7px; padding:2px 6px;">-</button>
                <span style="width:24px; text-align:center; color:var(--text);">${sim?.player.harmonicA.toFixed(1)}</span>
                <button type="button" class="cmd-btn" id="btn-a-up" style="font-size:7px; padding:2px 6px;">+</button>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; border-radius:3px; background:${styles.bgB}; border:${styles.borderB};">
              <span style="color:${styles.colorB}; font-weight:${styles.weightB};">${styles.prefixB}Harmonic B:</span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="cmd-btn" id="btn-b-down" style="font-size:7px; padding:2px 6px;">-</button>
                <span style="width:24px; text-align:center; color:var(--text);">${sim?.player.harmonicB.toFixed(1)}</span>
                <button type="button" class="cmd-btn" id="btn-b-up" style="font-size:7px; padding:2px 6px;">+</button>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; border-radius:3px; background:${styles.bgP}; border:${styles.borderP};">
              <span style="color:${styles.colorP}; font-weight:${styles.weightP};">${styles.prefixP}Phase Shift:</span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="cmd-btn" id="btn-p-down" style="font-size:7px; padding:2px 6px;">◄</button>
                <span style="width:24px; text-align:center; color:var(--text);">${sim?.player.phase.toFixed(2)}</span>
                <button type="button" class="cmd-btn" id="btn-p-up" style="font-size:7px; padding:2px 6px;">►</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:7px; color:var(--text-dim);">[W/S] Select Row • [A/D] Tune • [SPACE] Shatter • [ESC] Abort</div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="cmd-btn action" id="btn-shatter-seal" style="font-size:8px;" ${isHarmonized ? '' : 'disabled'}>
            ⚡ SHATTER SEAL
          </button>
          <button type="button" class="cmd-btn back" id="btn-cancel-lockpick" style="font-size:8px;">
            ABORT [ESC]
          </button>
        </div>
      </div>
    `;
	}

	/**
	 * Binds event handlers to all panel controls.
	 * State-mutating DOM binding procedure.
	 * @param {Element} panel - Parent DOM panel element.
	 * @returns {void}
	 */
	function bindAllControls(panel) {
		bindMod(panel, '#btn-a-down', () => { if (sim) { sim.selectedParam = 'A'; sim.player.harmonicA = Math.max(1.0, +(sim.player.harmonicA - 0.5).toFixed(1)); } });
		bindMod(panel, '#btn-a-up', () => { if (sim) { sim.selectedParam = 'A'; sim.player.harmonicA = Math.min(8.0, +(sim.player.harmonicA + 0.5).toFixed(1)); } });
		bindMod(panel, '#btn-b-down', () => { if (sim) { sim.selectedParam = 'B'; sim.player.harmonicB = Math.max(1.0, +(sim.player.harmonicB - 0.5).toFixed(1)); } });
		bindMod(panel, '#btn-b-up', () => { if (sim) { sim.selectedParam = 'B'; sim.player.harmonicB = Math.min(8.0, +(sim.player.harmonicB + 0.5).toFixed(1)); } });
		bindMod(panel, '#btn-p-down', () => { if (sim) { sim.selectedParam = 'PHASE'; sim.player.phase = +(Math.max(0, sim.player.phase - 0.2)).toFixed(2); } });
		bindMod(panel, '#btn-p-up', () => { if (sim) { sim.selectedParam = 'PHASE'; sim.player.phase = +(Math.min(3.14, sim.player.phase + 0.2)).toFixed(2); } });

		/** @type {HTMLElement | null} */
		const shatterBtn = panel.querySelector('#btn-shatter-seal');
		if (shatterBtn) {
			shatterBtn.onclick = () => {
				if (calculateResonance() < 95) return;
				dispatchSFX('VICTORY');
				finalize(true);
			};
		}

		/** @type {HTMLElement | null} */
		const cancelBtn = panel.querySelector('#btn-cancel-lockpick');
		if (cancelBtn) {
			cancelBtn.onclick = () => {
				dispatchSFX('SELECT');
				finalize(false);
			};
		}
	}

	/**
	 * Renders the interactive DOM control panel for the lockpick mini-game.
	 * State-mutating DOM generation procedure.
	 * @returns {void}
	 */
	function renderDefaultPresentation() {
		if (typeof document === 'undefined' || !sim) return;
		const container = document.getElementById('lockpick-view');
		if (!container) return;
		container.innerHTML = '';

		const resonance = calculateResonance();
		const isHarmonized = resonance >= 95;
		const sel = sim.selectedParam || 'A';
		const resonanceColor = getResonanceColor(resonance, isHarmonized);
		const styles = getParameterStyles(sel);

		const panel = document.createElement('div');
		panel.className = 'panel';
		panel.style.borderColor = isHarmonized ? 'var(--ok)' : 'var(--ember)';
		panel.innerHTML = buildPanelInnerHtml(resonance, resonanceColor, isHarmonized, styles);

		container.appendChild(panel);
		bindAllControls(panel);

		/** @type {HTMLCanvasElement | null} */
		const waveCanvas = /** @type {HTMLCanvasElement | null} */ (panel.querySelector('#lockpick-canvas'));
		if (waveCanvas) {
			drawHarmonics(waveCanvas);
		}
	}
	//#endregion

	//#region [SEC-08] Sealed Delta Envelope Dispatch & Host Action Router
	/**
	 * Finalizes the minigame simulation and dispatches resolution events to host.
	 * State-mutating event dispatch procedure.
	 * @param {boolean} success - Whether the lock was successfully bypassed.
	 * @returns {void}
	 */
	function finalize(success) {
		if (!sim) return;
		sim.active = false;

		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('lockpick:resolved', {
				success: Boolean(success),
				sealKey: sim.sealKey,
				targetTile: sim.targetTile,
				rewardLoot: success ? sim.rewardLoot : null,
				flagsDelta: success && sim.sealFlag ? { [sim.sealFlag]: true } : {}
			});
		}
	}

	/**
	 * Executes tuning action for specified parameter row.
	 * State-mutating tuning execution helper.
	 * @param {string} paramKey - Parameter key ('A' | 'B' | 'PHASE').
	 * @param {number} delta - Step adjustment amount.
	 */
	function executeTuningAction(paramKey, delta) {
		if (!sim) return;
		sim.selectedParam = /** @type {'A' | 'B' | 'PHASE'} */ (paramKey);
		if (paramKey === 'A') {
			sim.player.harmonicA = +(Math.max(1.0, Math.min(8.0, sim.player.harmonicA + delta))).toFixed(1);
		} else if (paramKey === 'B') {
			sim.player.harmonicB = +(Math.max(1.0, Math.min(8.0, sim.player.harmonicB + delta))).toFixed(1);
		} else if (paramKey === 'PHASE') {
			sim.player.phase = +(Math.max(0.0, Math.min(3.14, sim.player.phase + delta))).toFixed(2);
		}
		dispatchSFX('SELECT');
		renderDefaultPresentation();
	}

	/**
	 * Executes confirmation action when attempting to shatter seal.
	 * State-mutating confirmation helper.
	 */
	function executeConfirmAction() {
		if (calculateResonance() >= 95) {
			dispatchSFX('VICTORY');
			finalize(true);
		} else {
			dispatchSFX('DEFEAT');
		}
	}

	const ACTION_HANDLERS = Object.freeze({
		'UP': () => cycleParam(-1),
		'w': () => cycleParam(-1),
		'KeyW': () => cycleParam(-1),
		'DOWN': () => cycleParam(1),
		's': () => cycleParam(1),
		'KeyS': () => cycleParam(1),
		'LEFT': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? -0.2 : -0.5),
		'a': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? -0.2 : -0.5),
		'KeyA': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? -0.2 : -0.5),
		'STRAFE_LEFT': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? -0.2 : -0.5),
		'RIGHT': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? 0.2 : 0.5),
		'd': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? 0.2 : 0.5),
		'KeyD': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? 0.2 : 0.5),
		'STRAFE_RIGHT': () => executeTuningAction(sim?.selectedParam || 'A', sim?.selectedParam === 'PHASE' ? 0.2 : 0.5),
		'CONFIRM': () => executeConfirmAction(),
		'SPACE': () => executeConfirmAction(),
		'Space': () => executeConfirmAction(),
		'ENTER': () => executeConfirmAction(),
		'Enter': () => executeConfirmAction(),
		'CANCEL': () => { dispatchSFX('SELECT'); finalize(false); },
		'ESCAPE': () => { dispatchSFX('SELECT'); finalize(false); },
		'Escape': () => { dispatchSFX('SELECT'); finalize(false); },
	});

	/**
	 * Routes host input commands to mini-game controls.
	 * State-mutating input router procedure.
	 * @param {string | { type: string }} action - Action token or command object.
	 * @returns {void}
	 */
	function routeHostAction(action) {
		if (!action || !sim) return;
		const type = typeof action === 'string' ? action : action.type;
		const handler = ACTION_HANDLERS[type];
		if (handler) {
			handler();
		} else {
			renderDefaultPresentation();
		}
	}
	//#endregion

	//#region [SEC-09] Canonical VSRP-001 9-Method Interface & Module Export
	return {
		/**
		 * Configures tenant driver settings.
		 * State-mutating configuration gateway.
		 * @param {Object} cfg - Configuration dictionary object.
		 * @returns {void}
		 */
		configure(cfg) {
			assertLifecycle(State.UNCONFIGURED);
			if (!cfg || typeof cfg !== 'object') {
				throw new TypeError('[VSRP-001:lockpick_core] configure() requires a non-null object.');
			}
			hostConfig = deepFreeze({ ...cfg });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes host context and event bus bindings.
		 * State-mutating initialization gateway.
		 * @param {LockpickContext} context - Host context object.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
				throw new Error('[VSRP-001:lockpick_core] Capability Error: Missing eventBus handle.');
			}
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets simulation vault state with snapshot parameters.
		 * State-mutating reset gateway.
		 * @param {Partial<LockpickSimulation> | any} [snapshot={}] - Initialization snapshot.
		 * @returns {void}
		 */
		reset(snapshot = {}) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

			const targetA = snapshot.targetA || 3.0;
			const targetB = snapshot.targetB || 2.0;
			const targetPhase = snapshot.targetPhase !== undefined ? snapshot.targetPhase : 1.57;

			const playerA = snapshot.playerA ?? snapshot.player?.harmonicA ?? 1.0;
			const playerB = snapshot.playerB ?? snapshot.player?.harmonicB ?? 1.0;
			const playerPhase = snapshot.playerPhase ?? snapshot.player?.phase ?? 0.0;

			sim = {
				sealKey: snapshot.sealKey || 'ANCIENT_WARD',
				sealFlag: snapshot.sealFlag || 'unlocked_crypt_gate',
				targetTile: snapshot.targetTile || { x: 0, y: 0 },
				rewardLoot: snapshot.rewardLoot || { gold: 50, item: 'POTION' },
				time: 0,
				selectedParam: 'A',
				target: {
					harmonicA: targetA,
					harmonicB: targetB,
					phase: targetPhase
				},
				player: {
					harmonicA: playerA,
					harmonicB: playerB,
					phase: playerPhase
				},
				active: true
			};

			lifecycleState = State.READY;
		},

		/**
		 * Advances simulation delta time.
		 * State-mutating simulation update gateway.
		 * @param {any} _context - Optional host context frame reference.
		 * @param {number} [dt] - Elapsed frame delta time in seconds.
		 * @returns {void}
		 */
		update(_context, dt) {
			assertLifecycle(State.READY, State.RUNNING);
			if (!sim?.active) return;
			const safeDt = typeof dt === 'number' ? dt : 0.016;
			sim.time += safeDt * 1.5;
			lifecycleState = State.RUNNING;
		},

		/**
		 * Projects simulation state onto UI canvas or renderer.
		 * State-mutating presentation projection gateway.
		 * @param {function(LockpickSimulation, LockpickContext): void | any} [renderer] - Custom renderer function or null.
		 * @param {any} [_context] - Optional render context.
		 * @returns {void}
		 */
		render(renderer, _context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (typeof renderer === 'function' && hostContext) {
				renderer(this.getState(), hostContext);
				return;
			}
			if (typeof document === 'undefined') return;
			/** @type {HTMLCanvasElement | null} */
			const canvasElem = /** @type {HTMLCanvasElement | null} */ (document.getElementById('lockpick-canvas'));
			if (canvasElem && sim) {
				drawHarmonics(canvasElem);
			} else {
				renderDefaultPresentation();
			}
		},

		/**
		 * Extracts detached serializable clone of simulation state.
		 * Pure extraction accessor gateway.
		 * @returns {LockpickSimulation | null} Cloned simulation snapshot copy.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return sim ? structuredClone(sim) : null;
		},

		/**
		 * Returns operational diagnostics and telemetry reports.
		 * Pure diagnostic accessor gateway.
		 * @returns {LockpickDiagnostics} Diagnostic report descriptor.
		 */
		getDiagnostics() {
			return {
				moduleId: 'lockpick_core',
				lifecycleState,
				resonance: calculateResonance(),
				isActive: Boolean(sim?.active),
				config: hostConfig,
			};
		},

		/**
		 * Returns static module metadata and capabilities.
		 * Pure manifest accessor gateway.
		 * @returns {LockpickModuleInfo} Constitutional metadata descriptor.
		 */
		getModuleInfo() {
			return {
				moduleId: 'lockpick_core',
				name: 'EmberlightLockpick',
				protocolVersion: 'VSRP-001',
				version: '1.0.0',
				capabilities: ['harmonic_minigame', 'events.lockpick_resolved'],
			};
		},

		/**
		 * Tears down simulation resources and sets terminal lifecycle state.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
				cancelAnimationFrame(animFrameId);
			}
			sim = null;
			hostConfig = null;
			hostContext = null;
			lifecycleState = State.DESTROYED;
		},

		/**
		 * Handles inbound player action commands from host.
		 * State-mutating input handler gateway.
		 * @param {string | { type: string }} action - Input action token or command.
		 * @returns {void}
		 */
		handleHostAction(action) {
			routeHostAction(action);
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightLockpick = EmberlightLockpick;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightLockpick;
}