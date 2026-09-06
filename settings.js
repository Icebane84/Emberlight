/* =========================================================================
   DISTRICT 11: SETTINGS & SYSTEM GATEWAY (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-SETTINGS-CORE
   Protocol Version:    VSRP-001
   Classification:      Ephemeral Simulation Tenant
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightSettings = (() => {
  'use strict';

  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };

  let lifecycleState = State.UNCONFIGURED;
  let hostConfig = null;
  let hostContext = null;
  let sim = null;

  const MENU_ITEMS = [
    { id: 'MUTE', label: 'MASTER AUDIO', type: 'TOGGLE' },
    { id: 'FULLSCREEN', label: 'DISPLAY MODE', type: 'TOGGLE' },
    { id: 'SCANLINES', label: 'CRT SCANLINES', type: 'TOGGLE' },
    { id: 'SAVE', label: 'SAVE PROGRESS', type: 'ACTION', actionLabel: 'COMMIT DATA' },
    { id: 'TITLE', label: 'RETURN TO TITLE', type: 'ACTION', actionLabel: 'EJECT SESSION' },
    { id: 'RESET', label: 'FACTORY RESET', type: 'ACTION', actionLabel: 'WIPE STORAGE', danger: true },
  ];

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:settings_core] Lifecycle Violation: Invoked in "${lifecycleState}". ` +
        `Required: ${allowed.join(' | ')}`
      );
    }
  }

  function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((prop) => {
      if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
        deepFreeze(obj[prop]);
      }
    });
    return Object.freeze(obj);
  }

  function dispatchSFX(sfxName) {
    hostContext?.eventBus?.publish?.('settings:sfx', { sfx: sfxName });
  }

  function createDefaultState() {
    return {
      selectedIndex: 0,
      isMuted: false,
      isFullscreen: false,
      crtEnabled: true,
      canReturnToTitle: true,
      active: true,
    };
  }

  function emitSystemCommand(command, payload = {}) {
    if (hostContext?.eventBus?.publish) {
      hostContext.eventBus.publish('system:command', { command, ...payload });
    }
  }

  function moveCursor(delta) {
    if (!sim) return;
    const total = MENU_ITEMS.length;
    sim.selectedIndex = (sim.selectedIndex + delta + total) % total;
    dispatchSFX('SELECT');
    renderDefaultPresentation();
  }

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

    MENU_ITEMS.forEach((item, idx) => {
      const isSelected = idx === sim.selectedIndex;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '6px 10px';
      row.style.border = isSelected ? '1px solid var(--ember)' : '1px solid var(--border-dim)';
      row.style.background = isSelected ? 'rgba(255, 157, 77, 0.12)' : 'rgba(0, 0, 0, 0.35)';
      row.style.boxShadow = isSelected ? '0 0 8px rgba(255, 157, 77, 0.3)' : 'none';
      row.style.cursor = 'pointer';

      let valueDisplay = '';
      if (item.id === 'MUTE') {
        valueDisplay = `<span style="color:${sim.isMuted ? 'var(--danger)' : 'var(--ok)'}">&lt; [ ${sim.isMuted ? 'MUTED' : 'ACTIVE'} ] &gt;</span>`;
      } else if (item.id === 'FULLSCREEN') {
        valueDisplay = `<span style="color:${sim.isFullscreen ? 'var(--ok)' : 'var(--text-dim)'}">&lt; [ ${sim.isFullscreen ? 'FULLSCREEN' : 'WINDOWED'} ] &gt;</span>`;
      } else if (item.id === 'SCANLINES') {
        valueDisplay = `<span style="color:${sim.crtEnabled ? 'var(--ok)' : 'var(--text-dim)'}">&lt; [ ${sim.crtEnabled ? 'ENABLED' : 'DISABLED'} ] &gt;</span>`;
      } else {
        const actionCol = item.danger ? 'var(--danger)' : (isSelected ? 'var(--ember)' : 'var(--text)');
        valueDisplay = `<span style="color:${actionCol}; font-weight:bold;">[ ${item.actionLabel} ]</span>`;
      }

      row.innerHTML = `
        <div style="font-size:8px; display:flex; align-items:center; gap:6px;">
          <span style="color:${isSelected ? 'var(--ember)' : 'var(--text-dim)'}">[${idx + 1}]</span>
          <span style="color:${isSelected ? 'var(--text)' : 'var(--text-dim)'}">${item.label}</span>
        </div>
        <div style="font-size:8px;">${valueDisplay}</div>
      `;

      row.onmouseenter = () => {
        sim.selectedIndex = idx;
        renderDefaultPresentation();
      };

      row.onclick = () => {
        sim.selectedIndex = idx;
        if (item.type === 'TOGGLE') {
          toggleCurrentOption();
        } else {
          executeCurrentAction();
        }
      };

      listEl.appendChild(row);
    });

    const closeBtn = panel.querySelector('#close-settings-btn');
    if (closeBtn) {
      closeBtn.onclick = () => finalizeSettings();
    }
    container.appendChild(panel);
  }

  // --- Canonical 9-Method Interface Export ---
  const api = {
    configure(cfg) {
      assertLifecycle(State.UNCONFIGURED);
      if (!cfg || typeof cfg !== 'object') {
        throw new TypeError('[VSRP-001:settings_core] configure() requires a valid configuration dictionary.');
      }
      hostConfig = deepFreeze({ ...cfg });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
        throw new Error('[VSRP-001:settings_core] Capability Error: Missing eventBus.publish handle.');
      }
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

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

    render(renderer, context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (renderer && typeof renderer.renderSettings === 'function') {
        renderer.renderSettings(this.getState());
      } else {
        renderDefaultPresentation();
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

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

    destroy() {
      if (lifecycleState === State.DESTROYED) return;
      sim = null;
      hostConfig = null;
      hostContext = null;
      lifecycleState = State.DESTROYED;
    },

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
})();

if (typeof window !== 'undefined') {
  window.EmberlightSettings = EmberlightSettings;
}