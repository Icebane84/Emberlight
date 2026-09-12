/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: INPUT ENGINE HOST PERIPHERAL DRIVER
 * Document Identifier: VSRP-001-INPUT-DRIVER
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * Timestamp:           2026-09-07T10:30:16Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Default Keymap Specifications & State Trackers
 *   [SEC-03] Hardware Event Handlers & On-Screen Control Bindings
 *   [SEC-04] Canonical Peripheral Driver Interface Gateway
 *   [SEC-05] Global Environment & CommonJS Module Export
 * ============================================================================
 */

/* =========================================================================
	 DISTRICT: INPUT ENGINE (VSRP-001 HOST PERIPHERAL DRIVER)
	 -------------------------------------------------------------------------
	 Document Identifier: VSRP-001-INPUT-DRIVER
	 Protocol Version:    VSRP-001
	 Classification:      Peripheral Capability Driver
	 Index Anchor:        PRS-001
	 ========================================================================= */

const EmberlightInput = (() => {
	"use strict";

	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Record<string, string|string[]>} KeymapDictionary
	 */

	/**
	 * @typedef {Object} InputConfig
	 * @property {KeymapDictionary} [keymap] - Keymap dictionary.
	 * @property {{ keymap?: KeymapDictionary }} [input] - Nested input config.
	 * @property {{ DefaultSettings?: { input?: { keymap?: KeymapDictionary } } }} [manifest] - Manifest settings.
	 */

	/**
	 * @typedef {Object} InputDiagnostics
	 * @property {string} driverId - Driver identifier string.
	 * @property {string[]} activeKeysHeld - Array of currently depressed action tokens.
	 * @property {number} bufferedActions - Count of buffered action events.
	 * @property {number} keymapActionsCount - Number of configured action bindings.
	 * @property {boolean} isEnabled - Input processing active state.
	 */
	//#endregion

	//#region [SEC-02] Default Keymap Specifications & State Trackers
	let eventBus = null;
	let isEnabled = true;

	// Active key state tracker & action event buffer
	/** @type {Set<string>} */
	const activeKeys = new Set();
	/** @type {string[]} */
	const actionBuffer = [];

	// Canonical Default Keymap Specification (Action -> Hardware Codes)
	/** @type {KeymapDictionary} */
	const DEFAULT_KEYMAP = {
		// Spatial Navigation
		UP: ['KeyW', 'ArrowUp'],
		DOWN: ['KeyS', 'ArrowDown'],
		LEFT: ['KeyA', 'ArrowLeft'],
		RIGHT: ['KeyD', 'ArrowRight'],

		// Primary Actions & Viewport Controls
		CONFIRM: ['Enter', 'Space'],
		CANCEL: ['Escape', 'Backspace'],
		TOGGLE_EXPAND_DECK: ['KeyZ'],
		TOGGLE_3D_VIEW: ['KeyX'],
		STRAFE_LEFT: ['KeyQ'],

		// Fast District Modals (Keyboard Hotkeys)
		MENU_ARMORY: ['KeyE'],
		MENU_PROGRESSION: ['KeyT'],
		MENU_STATUS: ['KeyC'],
		MENU_POUCH: ['KeyI'],
		MENU_SHOP: ['KeyB'],
		MENU_CHRONICLE: ['KeyJ'],
		REST: ['KeyR'],
		FIELD_SCORCH: ['KeyF'],
		FIELD_FREEZE: ['KeyG'],
		FIELD_CONSECRATE: ['KeyH'],
		FIELD_DISPEL: ['KeyV'],

		// Number Keys (Direct Choice Selection)
		CHOICE_1: ['Digit1', 'Numpad1'],
		CHOICE_2: ['Digit2', 'Numpad2'],
		CHOICE_3: ['Digit3', 'Numpad3'],
		CHOICE_4: ['Digit4', 'Numpad4'],
	};

	// Active Keymap dictionary and compiled reverse-lookup table (Code -> Action)
	/** @type {KeymapDictionary} */
	let currentKeymap = structuredClone(DEFAULT_KEYMAP);
	/** @type {Record<string, string>} */
	let hardwareToKeyMap = compileReverseKeymap(currentKeymap);

	/**
	 * Compiles hardware-code-to-action reverse lookup map.
	 * [Pure Utility]
	 * @param {KeymapDictionary} keymap - Source keymap dictionary.
	 * @returns {Record<string, string>} Compiled reverse lookup dictionary.
	 */
	function compileReverseKeymap(keymap) {
		/** @type {Record<string, string>} */
		const reverse = {};
		if (!keymap || typeof keymap !== 'object') return reverse;
		for (const [action, codes] of Object.entries(keymap)) {
			if (Array.isArray(codes)) {
				codes.forEach((code) => {
					if (typeof code === 'string') reverse[code] = action;
				});
			} else if (typeof codes === 'string') {
				reverse[codes] = action;
			}
		}
		return reverse;
	}
	//#endregion

	//#region [SEC-03] Hardware Event Handlers & On-Screen Control Bindings
	/**
	 * Handles keyboard down events and buffers valid actions.
	 * [State Mutating / Event Handler]
	 * @param {KeyboardEvent} e - Keyboard event object.
	 * @returns {void}
	 */
	function handleKeyDown(e) {
		if (!isEnabled) return;

		// Prevent default scrolling behavior for game controls
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
			if (typeof e.preventDefault === 'function') e.preventDefault();
		}

		const action = hardwareToKeyMap[e.code];
		if (!action) return;

		const isRepeat = activeKeys.has(action);
		activeKeys.add(action);

		// Buffer unique action presses
		if (!isRepeat) {
			actionBuffer.push(action);

			if (eventBus && typeof eventBus.publish === 'function') {
				eventBus.publish('input:action', { action, code: e.code, shiftKey: Boolean(e.shiftKey) });
			}
		}
	}

	/**
	 * Handles keyboard up events and clears active keys.
	 * [State Mutating / Event Handler]
	 * @param {KeyboardEvent} e - Keyboard event object.
	 * @returns {void}
	 */
	function handleKeyUp(e) {
		const action = hardwareToKeyMap[e.code];
		if (action) {
			activeKeys.delete(action);
		}
	}

	const DPAD_BUTTONS = [
		{ id: 'dpad-up', action: 'UP' },
		{ id: 'dpad-down', action: 'DOWN' },
		{ id: 'dpad-left', action: 'LEFT' },
		{ id: 'dpad-right', action: 'RIGHT' },
	];

	/**
	 * Binds click handlers for on-screen touch DPAD controls.
	 * [DOM State Mutating]
	 * @returns {void}
	 */
	function bindOnScreenControls() {
		if (typeof document === 'undefined') return;

		DPAD_BUTTONS.forEach(({ id, action }) => {
			const btn = /** @type {HTMLElement|null} */ (document.getElementById(id));
			if (btn) {
				btn.onclick = (e) => {
					if (e && typeof e.preventDefault === 'function') e.preventDefault();
					if (!isEnabled) return;
					actionBuffer.push(action);
					if (eventBus && typeof eventBus.publish === 'function') {
						eventBus.publish('input:action', { action, source: 'dpad' });
					}
				};
			}
		});
	}

	/**
	 * Unbinds on-screen DPAD control click handlers.
	 * [DOM State Mutating]
	 * @returns {void}
	 */
	function unbindOnScreenControls() {
		if (typeof document === 'undefined') return;

		DPAD_BUTTONS.forEach(({ id }) => {
			const btn = /** @type {HTMLElement|null} */ (document.getElementById(id));
			if (btn) {
				btn.onclick = null;
			}
		});
	}

	/**
	 * Suppresses native browser context menu for absolute immersion.
	 * @param {MouseEvent} e - Pointer event.
	 * @returns {void}
	 */
	function handleContextMenu(e) {
		if (e && typeof e.preventDefault === 'function') {
			e.preventDefault();
		}
	}

	/**
	 * Handles pointer mousedown: dispatches RMB context triggers to GameRuntime.
	 * @param {MouseEvent} e - Pointer event.
	 * @returns {void}
	 */
	function handlePointerDown(e) {
		if (!isEnabled) return;
		if (e.button === 2) {
			const runtime = typeof window !== 'undefined' && window.GameRuntime ? window.GameRuntime : (typeof GameRuntime !== 'undefined' ? GameRuntime : null);
			if (runtime && typeof runtime.handlePointerContextDown === 'function') {
				runtime.handlePointerContextDown(e);
			}
		}
	}

	/**
	 * Handles pointer mousemove: forwards vector movement to GameRuntime.
	 * @param {MouseEvent} e - Pointer event.
	 * @returns {void}
	 */
	function handlePointerMove(e) {
		if (!isEnabled) return;
		const runtime = typeof window !== 'undefined' && window.GameRuntime ? window.GameRuntime : (typeof GameRuntime !== 'undefined' ? GameRuntime : null);
		if (runtime && typeof runtime.handlePointerContextMove === 'function') {
			runtime.handlePointerContextMove(e);
		}
	}

	/**
	 * Handles pointer mouseup: dispatches RMB gesture release to GameRuntime.
	 * @param {MouseEvent} e - Pointer event.
	 * @returns {void}
	 */
	function handlePointerUp(e) {
		if (!isEnabled) return;
		if (e.button === 2) {
			const runtime = typeof window !== 'undefined' && window.GameRuntime ? window.GameRuntime : (typeof GameRuntime !== 'undefined' ? GameRuntime : null);
			if (runtime && typeof runtime.handlePointerContextUp === 'function') {
				runtime.handlePointerContextUp(e);
			}
		}
	}

	/**
	 * Resets active inputs on window blur.
	 * [State Mutating]
	 * @returns {void}
	 */
	function handleBlur() {
		activeKeys.clear();
		actionBuffer.length = 0;
	}
	//#endregion

	//#region [SEC-04] Canonical Peripheral Driver Interface Gateway
	return {
		/**
		 * VSRP-001 Configuration Lifecycle Handler:
		 * Ingests operational configuration (keymap dictionaries, tuning parameters).
		 * [State Mutating]
		 * @param {InputConfig} [config={}] - Configuration options dictionary.
		 * @returns {void}
		 */
		configure(config = {}) {
			const keymap = config.keymap ||
				config.input?.keymap ||
				config.manifest?.DefaultSettings?.input?.keymap;
			if (keymap && typeof keymap === 'object') {
				this.setKeymap(keymap);
			}
		},

		/**
		 * Connects Host EventBus and binds hardware peripheral listeners.
		 * [Lifecycle: INIT]
		 * @param {any} bus - Event bus instance reference.
		 * @returns {void}
		 */
		init(bus) {
			this.destroy();
			eventBus = bus;
			if (typeof window !== 'undefined') {
				window.addEventListener('keydown', handleKeyDown);
				window.addEventListener('keyup', handleKeyUp);
				window.addEventListener('blur', handleBlur);
				window.addEventListener('contextmenu', handleContextMenu);
				window.addEventListener('mousedown', handlePointerDown);
				window.addEventListener('mousemove', handlePointerMove);
				window.addEventListener('mouseup', handlePointerUp);
			}
			bindOnScreenControls();
		},

		/**
		 * Sets a remapped key dictionary and recompiles the hardware lookup table.
		 * [State Mutating]
		 * @param {KeymapDictionary} keymap - Target keymap dictionary.
		 * @returns {void}
		 */
		setKeymap(keymap) {
			if (!keymap || typeof keymap !== 'object') return;
			currentKeymap = structuredClone(keymap);
			hardwareToKeyMap = compileReverseKeymap(currentKeymap);
		},

		/**
		 * Retrieves an immutable copy of the active keymap dictionary.
		 * [Pure Query]
		 * @returns {KeymapDictionary} Active keymap copy.
		 */
		getKeymap() {
			return structuredClone(currentKeymap);
		},

		/**
		 * Resets key mappings to canonical VSRP-001 defaults.
		 * [State Mutating]
		 * @returns {void}
		 */
		resetKeymap() {
			currentKeymap = structuredClone(DEFAULT_KEYMAP);
			hardwareToKeyMap = compileReverseKeymap(currentKeymap);
		},

		/**
		 * Dynamically binds a specific physical key code to an action token.
		 * [State Mutating]
		 * @param {string} code - Hardware key code.
		 * @param {string} action - Action token.
		 * @returns {void}
		 */
		bindKey(code, action) {
			if (!code || !action) return;
			if (!currentKeymap[action]) {
				currentKeymap[action] = [];
			}
			const codes = currentKeymap[action];
			if (Array.isArray(codes) && !codes.includes(code)) {
				codes.push(code);
			}
			hardwareToKeyMap = compileReverseKeymap(currentKeymap);
		},

		/**
		 * Unbinds a specific physical key code from all action tokens.
		 * [State Mutating]
		 * @param {string} code - Hardware key code.
		 * @returns {void}
		 */
		unbindKey(code) {
			if (!code) return;
			for (const action of Object.keys(currentKeymap)) {
				const codes = currentKeymap[action];
				if (Array.isArray(codes)) {
					currentKeymap[action] = codes.filter((c) => c !== code);
				}
			}
			hardwareToKeyMap = compileReverseKeymap(currentKeymap);
		},

		/**
		 * Clears active input state and action buffer.
		 * [State Mutating]
		 * @returns {void}
		 */
		clear() {
			activeKeys.clear();
			actionBuffer.length = 0;
		},

		/**
		 * Polled queue consumption for active tenant update() cycles.
		 * [State Mutating / Queue Drain]
		 * @returns {string|null} Action token or null.
		 */
		consumeAction() {
			return actionBuffer.shift() || null;
		},

		/**
		 * Continuous down-state check.
		 * [Pure Query]
		 * @param {string} action - Action token.
		 * @returns {boolean} Down state assertion.
		 */
		isDown(action) {
			return activeKeys.has(action);
		},

		/**
		 * Single-frame/continuous press assertion (capability alias).
		 * [Pure Query]
		 * @param {string} action - Action token.
		 * @returns {boolean} Press state assertion.
		 */
		isPressed(action) {
			return activeKeys.has(action);
		},

		/**
		 * Enables or disables input processing.
		 * [State Mutating]
		 * @param {boolean} enabled - Enable assertion flag.
		 * @returns {void}
		 */
		setEnabled(enabled) {
			isEnabled = !!enabled;
			if (!isEnabled) {
				activeKeys.clear();
				actionBuffer.length = 0;
			}
		},

		/**
		 * Exports driver diagnostics.
		 * [Pure Query]
		 * @returns {InputDiagnostics} Diagnostic status report.
		 */
		getDiagnostics() {
			return {
				driverId: 'input_driver',
				activeKeysHeld: Array.from(activeKeys),
				bufferedActions: actionBuffer.length,
				keymapActionsCount: Object.keys(currentKeymap).length,
				isEnabled,
			};
		},

		/**
		 * Releases driver listeners and clears resources.
		 * [Lifecycle: DESTROY]
		 * @returns {void}
		 */
		destroy() {
			if (typeof window !== 'undefined') {
				window.removeEventListener('keydown', handleKeyDown);
				window.removeEventListener('keyup', handleKeyUp);
				window.removeEventListener('blur', handleBlur);
				window.removeEventListener('contextmenu', handleContextMenu);
				window.removeEventListener('mousedown', handlePointerDown);
				window.removeEventListener('mousemove', handlePointerMove);
				window.removeEventListener('mouseup', handlePointerUp);
			}
			unbindOnScreenControls();
			activeKeys.clear();
			actionBuffer.length = 0;
			eventBus = null;
		},
	};
	//#endregion
})();

//#region [SEC-05] Global Environment & CommonJS Module Export
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.EmberlightInput = EmberlightInput;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightInput;
}
//#endregion