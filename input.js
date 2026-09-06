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

  let eventBus = null;
  let isEnabled = true;

  // Active key state tracker & action event buffer
  const activeKeys = new Set();
  const actionBuffer = [];

  // Canonical Default Keymap Specification (Action -> Hardware Codes)
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
  let currentKeymap = structuredClone(DEFAULT_KEYMAP);
  let hardwareToKeyMap = compileReverseKeymap(currentKeymap);

  function compileReverseKeymap(keymap) {
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
        eventBus.publish('input:action', { action, code: e.code });
      }
    }
  }

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

  function bindOnScreenControls() {
    if (typeof document === 'undefined') return;

    DPAD_BUTTONS.forEach(({ id, action }) => {
      const btn = document.getElementById(id);
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

  function unbindOnScreenControls() {
    if (typeof document === 'undefined') return;

    DPAD_BUTTONS.forEach(({ id }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.onclick = null;
      }
    });
  }

  function handleBlur() {
    activeKeys.clear();
    actionBuffer.length = 0;
  }

  return {
    /**
     * VSRP-001 Configuration Lifecycle Handler:
     * Ingests operational configuration (keymap dictionaries, tuning parameters).
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
     */
    init(bus) {
      this.destroy();
      eventBus = bus;
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
      }
      bindOnScreenControls();
    },

    /**
     * Sets a remapped key dictionary and recompiles the hardware lookup table.
     */
    setKeymap(keymap) {
      if (!keymap || typeof keymap !== 'object') return;
      currentKeymap = structuredClone(keymap);
      hardwareToKeyMap = compileReverseKeymap(currentKeymap);
    },

    /**
     * Retrieves an immutable copy of the active keymap dictionary.
     */
    getKeymap() {
      return structuredClone(currentKeymap);
    },

    /**
     * Resets key mappings to canonical VSRP-001 defaults.
     */
    resetKeymap() {
      currentKeymap = structuredClone(DEFAULT_KEYMAP);
      hardwareToKeyMap = compileReverseKeymap(currentKeymap);
    },

    /**
     * Dynamically binds a specific physical key code to an action token.
     */
    bindKey(code, action) {
      if (!code || !action) return;
      if (!currentKeymap[action]) {
        currentKeymap[action] = [];
      }
      if (!currentKeymap[action].includes(code)) {
        currentKeymap[action].push(code);
      }
      hardwareToKeyMap = compileReverseKeymap(currentKeymap);
    },

    /**
     * Unbinds a specific physical key code from all action tokens.
     */
    unbindKey(code) {
      if (!code) return;
      for (const action of Object.keys(currentKeymap)) {
        if (Array.isArray(currentKeymap[action])) {
          currentKeymap[action] = currentKeymap[action].filter((c) => c !== code);
        }
      }
      hardwareToKeyMap = compileReverseKeymap(currentKeymap);
    },

    clear() {
      activeKeys.clear();
      actionBuffer.length = 0;
    },

    // Polled queue consumption for active tenant update() cycles
    consumeAction() {
      return actionBuffer.shift() || null;
    },

    // Continuous down-state check
    isDown(action) {
      return activeKeys.has(action);
    },

    // Single-frame/continuous press assertion (capability alias)
    isPressed(action) {
      return activeKeys.has(action);
    },

    setEnabled(enabled) {
      isEnabled = !!enabled;
      if (!isEnabled) {
        activeKeys.clear();
        actionBuffer.length = 0;
      }
    },

    getDiagnostics() {
      return {
        driverId: 'input_driver',
        activeKeysHeld: Array.from(activeKeys),
        bufferedActions: actionBuffer.length,
        keymapActionsCount: Object.keys(currentKeymap).length,
        isEnabled,
      };
    },

    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleBlur);
      }
      unbindOnScreenControls();
      activeKeys.clear();
      actionBuffer.length = 0;
      eventBus = null;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightInput = EmberlightInput;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightInput;
}