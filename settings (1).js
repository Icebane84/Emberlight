/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DISTRICT 11: SETTINGS & SYSTEM GATEWAY
 * Document Identifier: VSRP-001-SETTINGS-CORE
 * Governing Protocol:  VSRP-001
 * Authority:           Ephemeral Simulation Tenant
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Lifecycle Constants & Module Context
 *   [SEC-03] Menu Registry & Action Configuration
 *   [SEC-04] Simulation Vault & Event Dispatch Helpers
 *   [SEC-05] Navigation, Option Tuning & Finalization Routines
 *   [SEC-06] Domestic DOM Presentation & Event Bindings
 *   [SEC-07] Canonical VSRP-001 Lifecycle Gateway & Host Router
 *   [SEC-08] Module Export & Global Scope Bindings
 * ============================================================================
 */

// @ts-ignore
const EmberlightSettings = (() => {
	'use strict';

	//#region [SEC-01] Type Definitions & Contract Schemas
	/**
	 * @typedef {Object} MenuItem
	 * @property {string} id - Unique identifier token.
	 * @property {string} label - Human-readable menu item display name.
	 * @property {'TOGGLE' | 'ACTION'} type - Interaction classification.
	 * @property {string} [actionLabel] - Display label for actionable buttons.
	 * @property {boolean} [danger] - Visual danger flag for destructive operations.
	 */

	/**
	 * @typedef {Object} SettingsSimulation
	 * @property {number} selectedIndex - Currently focused menu item index.
	 * @property {boolean} isMuted - Audio mute status.
	 * @property {boolean} isFullscreen - Viewport fullscreen mode status.
	 * @property {boolean} crtEnabled - CRT post-processing shader toggle status.
	 * @property {boolean} canReturnToTitle - Title navigation availability status.
	 * @property {boolean} active - Active simulation running status flag.
	 */

	/**
	 * @typedef {Object} SettingsContext
	 * @property {{ publish?: function(string, any): void, subscribe?: function(string, function(any): void): function(): void }} [eventBus] - Host event bus handle.
	 * @property {Array<string | { type: string }>} [inputs] - Inbound host input frame buffer.
	 */

	/**
	 * @typedef {Object} SettingsDiagnostics
	 * @property {string} moduleId - Unique module identifier token.
	 * @property {string} lifecycleState - Active lifecycle state token.
	 * @property {number} selectedIndex - Currently selected item index.
	 * @property {boolean} isMuted - Master audio mute status.
	 * @property {boolean} crtEnabled - CRT scanline effect status.
	 */

	/**
	 * @typedef {Object} SettingsModuleInfo
	 * @property {string} moduleId - Unique module identifier token.
	 * @property {string} version - Semantic version identifier.
	 * @property {'VSRP-001'} protocolVersion - Governing normative protocol standard.
	 * @property {string[]} dependencies - Declared external dependency tokens.
	 * @property {string[]} capabilities - Declared capability tokens.
	 */

	/**
	 * @typedef {Object} SettingsRenderer
	 * @property {function(SettingsSimulation | null): void} [renderSettings] - Custom settings renderer routine.
	 */
	//#endregion

	//#region [SEC-02] Lifecycle Constants & Module Context
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
	/** @type {Record<string, any> | null} */
	let hostConfig = null;
	/** @type {SettingsContext | null} */
	let hostContext = null;
	/** @type {SettingsSimulation | null} */
	let sim = null;
	//#endregion

	//#region [SEC-03] Menu Registry & Action Configuration
	/** @type {MenuItem[]} */
	const MENU_ITEMS = [
		{ id: 'MUTE', label: 'MASTER AUDIO', type: 'TOGGLE' },
		{ id: 'FULLSCREEN', label: 'DISPLAY MODE', type: 'TOGGLE' },
		{ id: 'SCANLINES', label: 'CRT SCANLINES', type: 'TOGGLE' },
		{ id: 'SAVE', label: 'SAVE PROGRESS', type: 'ACTION', actionLabel: 'COMMIT DATA' },
		{ id: 'TITLE', label: 'RETURN TO TITLE', type: 'ACTION', actionLabel: 'EJECT SESSION' },
		{ id: 'RESET', label: 'FACTORY RESET', type: 'ACTION', actionLabel: 'WIPE STORAGE', danger: true },
	];
	//#endregion

	//#region [SEC-04] Simulation Vault & Event Dispatch Helpers
	/**
	 * Asserts that the module is operating within permitted lifecycle states.
	 * Pure validation procedure.
	 * @param {...string} allowed - Permitted lifecycle state tokens.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:settings_core] Lifecycle Violation: Invoked in "${lifecycleState}". ` +
				`Required: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Recursively freezes an object configuration structure.
	 * State-mutating utility procedure.
	 * @template T
	 * @param {T} obj - Target object to freeze.
	 * @returns {T} Deeply frozen object reference.
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
		hostContext?.eventBus?.publish?.('settings:sfx', { sfx: sfxName });
	}

	/**
	 * Produces a clean default settings simulation state structure.
	 * Pure factory procedure referencing hostConfig defaults.
	 * @returns {SettingsSimulation} Default settings simulation state.
	 */
	function createDefaultState() {
		return {
			selectedIndex: 0,
			isMuted: Boolean(hostConfig?.isMuted ?? false),
			isFullscreen: Boolean(hostConfig?.isFullscreen ?? false),
			crtEnabled: hostConfig?.crtEnabled !== undefined ? Boolean(hostConfig.crtEnabled) : true,
			canReturnToTitle: hostConfig?.canReturnToTitle !== undefined ? Boolean(hostConfig.canReturnToTitle) : true,
			active: true,
		};
	}

	/**
	 * Emits a system command event envelope to the host event bus.
	 * State-mutating event dispatch procedure.
	 * @param {string} command - System command action verb.
	 * @param {Record<string, any>} [payload={}] - Additional command parameters.
	 * @returns {void}
	 */
	function emitSystemCommand(command, payload = {}) {
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('system:command', { command, ...payload });
		}
	}
	//#endregion

	//#region [SEC-05] Navigation, Option Tuning & Finalization Routines
	/**
	 * Moves the menu cursor index by specified relative delta.
	 * State-mutating simulation state update procedure.
	 * @param {number} delta - Relative cursor index step.
	 * @returns {void}
	 */
	function moveCursor(delta) {
		if (!sim) return;
		const total = MENU_ITEMS.length;
		sim.selectedIndex = (sim.selectedIndex + delta + total) % total;
		dispatchSFX('SELECT');
		renderDefaultPresentation();
	}

	/**
	 * Toggles the currently highlighted configuration option or triggers action.
	 * State-mutating simulation state update procedure.
	 * @returns {void}
	 */
	function toggleCurrentOption() {
		if (!sim) return;
		const current = MENU_ITEMS[sim.selectedIndex];
		if (!current) return;

		if (current.id === 'MUTE') {
			sim.isMuted = !sim.isMuted;
			emitSystemCommand('TOGGLE_MUTE', { isMuted: sim.isMuted });
			dispatchSFX('SELECT');
		} else if (current.id === 'FULLSCREEN') {
			sim.isFullscreen = !sim.isFullscreen;
			emitSystemCommand('TOGGLE_FULLSCREEN', { isFullscreen: sim.isFullscreen });
			dispatchSFX('SELECT');
		} else if (current.id === 'SCANLINES') {
			sim.crtEnabled = !sim.crtEnabled;
			emitSystemCommand('TOGGLE_SCANLINES', { enabled: sim.crtEnabled });
			dispatchSFX('SELECT');
		} else {
			executeCurrentAction();
			return;
		}
		renderDefaultPresentation();
	}

	/**
	 * Executes the system command associated with the currently focused menu row.
	 * State-mutating action execution procedure.
	 * @returns {void}
	 */
	function executeCurrentAction() {
		if (!sim) return;
		const current = MENU_ITEMS[sim.selectedIndex];
		if (!current) return;

		if (current.id === 'SAVE') {
			emitSystemCommand('SAVE_GAME');
			dispatchSFX('VICTORY');
		} else if (current.id === 'TITLE') {
			dispatchSFX('SELECT');
			emitSystemCommand('RETURN_TO_TITLE');
		} else if (current.id === 'RESET') {
			dispatchSFX('DEFEAT');
			emitSystemCommand('WIPE_STORAGE');
		} else {
			toggleCurrentOption();
		}
	}

	/**
	 * Finalizes settings session and publishes resolved configuration state to host.
	 * State-mutating event dispatch procedure.
	 * @returns {void}
	 */
	function finalizeSettings() {
		if (!sim) return;
		sim.active = false;
		dispatchSFX('SELECT');
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('settings:resolved', {
				isMuted: sim.isMuted,
				isFullscreen: sim.isFullscreen,
				crtEnabled: sim.crtEnabled,
			});
		}
	}
	//#endregion

	//#region [SEC-06] Domestic DOM Presentation & Event Bindings
	/**
	 * Resolves display color for action menu items.
	 * Pure evaluation helper.
	 * @param {MenuItem} item - Menu item configuration.
	 * @param {boolean} isSelected - Row selection state flag.
	 * @returns {string} CSS color variable token.
	 */
	function getActionColor(item, isSelected) {
		if (item.danger) return 'var(--danger)';
		if (isSelected) return 'var(--ember)';
		return 'var(--text)';
	}

	/**
	 * Formats value indicator HTML string for a menu row.
	 * Pure string generation helper.
	 * @param {MenuItem} item - Menu item configuration.
	 * @param {SettingsSimulation} simState - Current simulation snapshot.
	 * @param {boolean} isSelected - Row selection state flag.
	 * @returns {string} Rendered HTML string.
	 */
	function getItemValueDisplay(item, simState, isSelected) {
		if (item.id === 'MUTE') {
			const color = simState.isMuted ? 'var(--danger)' : 'var(--ok)';
			const label = simState.isMuted ? 'MUTED' : 'ACTIVE';
			return `<span style="color:${color}">&lt; [ ${label} ] &gt;</span>`;
		}
		if (item.id === 'FULLSCREEN') {
			const color = simState.isFullscreen ? 'var(--ok)' : 'var(--text-dim)';
			const label = simState.isFullscreen ? 'FULLSCREEN' : 'WINDOWED';
			return `<span style="color:${color}">&lt; [ ${label} ] &gt;</span>`;
		}
		if (item.id === 'SCANLINES') {
			const color = simState.crtEnabled ? 'var(--ok)' : 'var(--text-dim)';
			const label = simState.crtEnabled ? 'ENABLED' : 'DISABLED';
			return `<span style="color:${color}">&lt; [ ${label} ] &gt;</span>`;
		}
		const actionCol = getActionColor(item, isSelected);
		return `<span style="color:${actionCol}; font-weight:bold;">[ ${item.actionLabel} ]</span>`;
	}

	/**
	 * Renders domestic DOM presentation for District 11 BIOS settings panel.
	 * State-mutating DOM generation procedure.
	 * @returns {void}
	 */
	function renderDefaultPresentation() {
		if (typeof document === 'undefined' || !sim) return;
		const container = document.getElementById('settings-view');
		if (!container) return;
		container.innerHTML = '';

		const panel = document.createElement('div');
		panel.className = 'panel';
		panel.style.borderColor = 'var(--ember)';
		panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:6px; margin-bottom:12px;">
        <div class="panel-title" style="color:var(--ember); margin:0; border:none; padding:0;">DISTRICT 11: SYSTEM & CONFIGURATION</div>
        <div style="font-size:7px; color:var(--text-dim);">BIOS CONFIG V1.0</div>
      </div>
      <div id="settings-menu-list" style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-dim); padding-top:10px;">
        <div style="font-size:7px; color:var(--text-dim);">
          <b style="color:var(--text)">[W/S]</b> Navigate  |  <b style="color:var(--text)">[A/D]</b> Toggle  |  <b style="color:var(--ok)">[ENTER]</b> Select
        </div>
        <button type="button" class="cmd-btn action" id="close-settings-btn" style="font-size:8px;">✔ DONE / RESUME</button>
      </div>
    `;

		const listEl = panel.querySelector('#settings-menu-list');
		if (!listEl) return;

		MENU_ITEMS.forEach((item, idx) => {
			const isSelected = idx === sim?.selectedIndex;
			const row = document.createElement('div');
			row.style.display = 'flex';
			row.style.justifyContent = 'space-between';
			row.style.alignItems = 'center';
			row.style.padding = '6px 10px';
			row.style.border = isSelected ? '1px solid var(--ember)' : '1px solid var(--border-dim)';
			row.style.background = isSelected ? 'rgba(255, 157, 77, 0.12)' : 'rgba(0, 0, 0, 0.35)';
			row.style.boxShadow = isSelected ? '0 0 8px rgba(255, 157, 77, 0.3)' : 'none';
			row.style.cursor = 'pointer';

			const valueDisplay = sim ? getItemValueDisplay(item, sim, isSelected) : '';

			row.innerHTML = `
        <div style="font-size:8px; display:flex; align-items:center; gap:6px;">
          <span style="color:${isSelected ? 'var(--ember)' : 'var(--text-dim)'}">[${idx + 1}]</span>
          <span style="color:${isSelected ? 'var(--text)' : 'var(--text-dim)'}">${item.label}</span>
        </div>
        <div style="font-size:8px;">${valueDisplay}</div>
      `;

			row.onmouseenter = () => {
				if (sim) {
					sim.selectedIndex = idx;
					renderDefaultPresentation();
				}
			};

			row.onclick = () => {
				if (sim) {
					sim.selectedIndex = idx;
					if (item.type === 'TOGGLE') {
						toggleCurrentOption();
					} else {
						executeCurrentAction();
					}
				}
			};

			listEl.appendChild(row);
		});

		/** @type {HTMLElement | null} */
		const closeBtn = panel.querySelector('#close-settings-btn');
		if (closeBtn) {
			closeBtn.onclick = () => finalizeSettings();
		}
		container.appendChild(panel);
	}
	//#endregion

	//#region [SEC-07] Canonical VSRP-001 Lifecycle Gateway & Host Router
	const api = {
		/**
		 * Configures tenant driver settings.
		 * State-mutating configuration gateway.
		 * @param {Object} cfg - Configuration dictionary object.
		 * @returns {void}
		 */
		configure(cfg) {
			assertLifecycle(State.UNCONFIGURED);
			if (!cfg || typeof cfg !== 'object') {
				throw new TypeError('[VSRP-001:settings_core] configure() requires a valid configuration dictionary.');
			}
			hostConfig = deepFreeze({ ...cfg });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes host context and event bus bindings.
		 * State-mutating initialization gateway.
		 * @param {SettingsContext} context - Host context object.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
				throw new Error('[VSRP-001:settings_core] Capability Error: Missing eventBus.publish handle.');
			}
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets simulation vault state with snapshot parameters.
		 * State-mutating reset gateway.
		 * @param {Partial<SettingsSimulation>} [snapshot={}] - Initialization snapshot.
		 * @returns {void}
		 */
		reset(snapshot = {}) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
			const baseline = createDefaultState();
			const incoming = snapshot ? structuredClone(snapshot) : {};

			sim = {
				...baseline,
				...incoming,
				active: true,
			};

			lifecycleState = State.READY;
		},

		/**
		 * Advances simulation frame and consumes host input actions.
		 * State-mutating simulation update gateway.
		 * @param {number} [dt] - Elapsed frame delta time in seconds.
		 * @param {SettingsContext} [context] - Optional host context frame reference.
		 * @returns {void}
		 */
		update(dt, context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (!sim?.active) return;
			lifecycleState = State.RUNNING;

			const activeCtx = context || hostContext;
			if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
				for (const element of activeCtx.inputs) {
					this.handleHostAction(element);
				}
			}
		},

		/**
		 * Projects settings view onto DOM or custom host renderer.
		 * State-mutating presentation projection gateway.
		 * @param {SettingsRenderer} [renderer] - Optional custom renderer instance.
		 * @param {SettingsContext} [context] - Optional host render context.
		 * @returns {void}
		 */
		render(renderer, context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (renderer && typeof renderer.renderSettings === 'function') {
				renderer.renderSettings(this.getState());
			} else {
				renderDefaultPresentation();
			}
		},

		/**
		 * Extracts detached serializable clone of simulation state.
		 * Pure extraction accessor gateway.
		 * @returns {SettingsSimulation | null} Cloned simulation snapshot copy.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return sim ? structuredClone(sim) : null;
		},

		/**
		 * Returns operational diagnostics and telemetry reports.
		 * Pure diagnostic accessor gateway.
		 * @returns {SettingsDiagnostics} Diagnostic report descriptor.
		 */
		getDiagnostics() {
			if (lifecycleState === State.DESTROYED) {
				throw new Error('[VSRP-001:settings_core] Cannot read diagnostics on a DESTROYED instance.');
			}
			return {
				moduleId: 'settings_core',
				lifecycleState,
				selectedIndex: sim?.selectedIndex || 0,
				isMuted: sim?.isMuted || false,
				crtEnabled: sim?.crtEnabled || false,
			};
		},

		/**
		 * Returns static module metadata and capabilities.
		 * Pure manifest accessor gateway.
		 * @returns {SettingsModuleInfo} Constitutional metadata descriptor.
		 */
		getModuleInfo() {
			return {
				moduleId: 'settings_core',
				version: '1.0.0',
				protocolVersion: 'VSRP-001',
				dependencies: [],
				capabilities: [
					'system_configuration',
					'events.system_command',
					'events.settings_resolved',
					'events.settings_sfx',
				],
			};
		},

		/**
		 * Tears down simulation resources and sets terminal lifecycle state.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			sim = null;
			hostConfig = null;
			hostContext = null;
			lifecycleState = State.DESTROYED;
		},

		/**
		 * Routes host input commands to settings navigation subroutines.
		 * State-mutating input router procedure.
		 * @param {string | { type: string }} action - Action token or command object.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;
			const type = typeof action === 'string' ? action.toUpperCase() : (action.type || '').toUpperCase();

			if (type === 'UP') moveCursor(-1);
			else if (type === 'DOWN') moveCursor(1);
			else if (type === 'LEFT' || type === 'RIGHT') toggleCurrentOption();
			else if (type === 'CONFIRM') executeCurrentAction();
			else if (type === 'CANCEL') finalizeSettings();
			else if (type.startsWith('CHOICE_')) {
				const directIdx = Number.parseInt(type.replace('CHOICE_', ''), 10) - 1;
				if (directIdx >= 0 && directIdx < MENU_ITEMS.length) {
					sim.selectedIndex = directIdx;
					executeCurrentAction();
				}
			}
		},
	};

	return api;
	//#endregion
})();

//#region [SEC-08] Module Export & Global Scope Bindings
if (typeof window !== 'undefined') {
	window.EmberlightSettings = EmberlightSettings;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightSettings;
}
//#endregion