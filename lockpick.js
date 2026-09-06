/* =========================================================================
   DISTRICT 10: HARMONIC SEAL / LOCKPICK (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-LOCKPICK-CORE
   Classification:      Ephemeral Simulation Tenant
   Protocol Version:    VSRP-001
   Index Anchor:        PRS-001
   ========================================================================= */
const EmberlightLockpick = (() => {
	"use strict";

  // --- Formal Lifecycle States ---
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

  // --- Private Simulation Vault (Faraday Rule 1) ---
  let sim = null;
  let animFrameId = null;

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:lockpick_core] Lifecycle Error: Invoked in "${lifecycleState}". Required: ${allowed.join(' | ')}`
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
    hostContext?.eventBus?.publish?.('lockpick:sfx', { sfx: sfxName });
  }

  // --- Wave Alignment Mathematics ---
  function calculateResonance() {
    if (!sim) return 0;
    const diffA = Math.abs(sim.player.harmonicA - sim.target.harmonicA);
    const diffB = Math.abs(sim.player.harmonicB - sim.target.harmonicB);
    const diffPhase = Math.abs(sim.player.phase - sim.target.phase);

    const totalDiff = diffA + diffB + (diffPhase * 0.4);
    const rawResonance = Math.max(0, 1 - (totalDiff / 3.0));
    return Math.round(rawResonance * 100);
  }

  // --- Canvas Waveform Projection ---
  function drawHarmonics(canvas) {
    if (!canvas || !sim) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (Math.min(w, h) / 2) * 0.78;

    ctx.clearRect(0, 0, w, h);

    // 1. Target Arcane Seal (Cyan Matrix)
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

    // 2. Player Attunement Wave (Ember Wave)
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

  function adjustSelected(delta) {
    if (!sim) return;
    const step = 0.5;
    const phaseStep = 0.2;

    if (sim.selectedParam === 'A') {
      sim.player.harmonicA = +(Math.max(1.0, Math.min(8.0, sim.player.harmonicA + delta * step))).toFixed(1);
    } else if (sim.selectedParam === 'B') {
      sim.player.harmonicB = +(Math.max(1.0, Math.min(8.0, sim.player.harmonicB + delta * step))).toFixed(1);
    } else if (sim.selectedParam === 'PHASE') {
      sim.player.phase = +(Math.max(0.0, Math.min(3.14, sim.player.phase + delta * phaseStep))).toFixed(2);
    }

    dispatchSFX('SELECT');
    renderDefaultPresentation();
  }

  function cycleParam(dir) {
    if (!sim) return;
    const params = ['A', 'B', 'PHASE'];
    const curIdx = params.indexOf(sim.selectedParam || 'A');
    const nextIdx = (curIdx + dir + params.length) % params.length;
    sim.selectedParam = params[nextIdx];
    dispatchSFX('SELECT');
    renderDefaultPresentation();
  }

  // --- Domestic UI Presentation ---
  function renderDefaultPresentation() {
    if (typeof document === 'undefined' || !sim) return;
    const container = document.getElementById('lockpick-view');
    if (!container) return;
    container.innerHTML = '';

    const resonance = calculateResonance();
    const isHarmonized = resonance >= 95;
    const sel = sim.selectedParam || 'A';

    let resonanceColor = 'var(--danger)';
    if (isHarmonized) {
      resonanceColor = 'var(--ok)';
    } else if (resonance > 75) {
      resonanceColor = 'var(--ember)';
    }

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.borderColor = isHarmonized ? 'var(--ok)' : 'var(--ember)';
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:6px; margin-bottom:10px;">
        <div class="panel-title" style="color:var(--ember); margin:0; border:none; padding:0;">DISTRICT 10: RESONANCE DISRUPTOR</div>
        <div style="font-size:8px; color:var(--text-dim);">SEAL: <b style="color:var(--text);">${sim.sealKey}</b></div>
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
            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; border-radius:3px; background:${sel === 'A' ? 'rgba(255,157,77,0.2)' : 'transparent'}; border:${sel === 'A' ? '1px solid var(--ember)' : '1px solid transparent'};">
              <span style="color:${sel === 'A' ? 'var(--ember)' : 'var(--text-dim)'}; font-weight:${sel === 'A' ? 'bold' : 'normal'};">${sel === 'A' ? '► ' : ''}Harmonic A:</span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="cmd-btn" id="btn-a-down" style="font-size:7px; padding:2px 6px;">-</button>
                <span style="width:24px; text-align:center; color:var(--text);">${sim.player.harmonicA.toFixed(1)}</span>
                <button type="button" class="cmd-btn" id="btn-a-up" style="font-size:7px; padding:2px 6px;">+</button>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; border-radius:3px; background:${sel === 'B' ? 'rgba(255,157,77,0.2)' : 'transparent'}; border:${sel === 'B' ? '1px solid var(--ember)' : '1px solid transparent'};">
              <span style="color:${sel === 'B' ? 'var(--ember)' : 'var(--text-dim)'}; font-weight:${sel === 'B' ? 'bold' : 'normal'};">${sel === 'B' ? '► ' : ''}Harmonic B:</span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="cmd-btn" id="btn-b-down" style="font-size:7px; padding:2px 6px;">-</button>
                <span style="width:24px; text-align:center; color:var(--text);">${sim.player.harmonicB.toFixed(1)}</span>
                <button type="button" class="cmd-btn" id="btn-b-up" style="font-size:7px; padding:2px 6px;">+</button>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px; border-radius:3px; background:${sel === 'PHASE' ? 'rgba(255,157,77,0.2)' : 'transparent'}; border:${sel === 'PHASE' ? '1px solid var(--ember)' : '1px solid transparent'};">
              <span style="color:${sel === 'PHASE' ? 'var(--ember)' : 'var(--text-dim)'}; font-weight:${sel === 'PHASE' ? 'bold' : 'normal'};">${sel === 'PHASE' ? '► ' : ''}Phase Shift:</span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="cmd-btn" id="btn-p-down" style="font-size:7px; padding:2px 6px;">◄</button>
                <span style="width:24px; text-align:center; color:var(--text);">${sim.player.phase.toFixed(2)}</span>
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

    container.appendChild(panel);

    // Event Bindings
    const bindMod = (btnId, fn) => {
      const btn = panel.querySelector(btnId);
      if (btn) {
        btn.onclick = () => {
          fn();
          dispatchSFX('SELECT');
          renderDefaultPresentation();
        };
      }
    };

    bindMod('#btn-a-down', () => { sim.selectedParam = 'A'; sim.player.harmonicA = Math.max(1.0, +(sim.player.harmonicA - 0.5).toFixed(1)); });
    bindMod('#btn-a-up',   () => { sim.selectedParam = 'A'; sim.player.harmonicA = Math.min(8.0, +(sim.player.harmonicA + 0.5).toFixed(1)); });
    bindMod('#btn-b-down', () => { sim.selectedParam = 'B'; sim.player.harmonicB = Math.max(1.0, +(sim.player.harmonicB - 0.5).toFixed(1)); });
    bindMod('#btn-b-up',   () => { sim.selectedParam = 'B'; sim.player.harmonicB = Math.min(8.0, +(sim.player.harmonicB + 0.5).toFixed(1)); });
    bindMod('#btn-p-down', () => { sim.selectedParam = 'PHASE'; sim.player.phase = +(Math.max(0, sim.player.phase - 0.2)).toFixed(2); });
    bindMod('#btn-p-up',   () => { sim.selectedParam = 'PHASE'; sim.player.phase = +(Math.min(3.14, sim.player.phase + 0.2)).toFixed(2); });

    panel.querySelector('#btn-shatter-seal').onclick = () => {
      if (calculateResonance() < 95) return;
      dispatchSFX('VICTORY');
      finalize(true);
    };

    panel.querySelector('#btn-cancel-lockpick').onclick = () => {
      dispatchSFX('SELECT');
      finalize(false);
    };

    // Render initial canvas waveform
    const canvas = panel.querySelector('#lockpick-canvas');
    if (canvas) {
      drawHarmonics(canvas);
    }
  }

  // --- Sealed Delta Envelope Dispatch (Rule 3) ---
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

  // --- Canonical 9-Method Interface Export ---
  return {
    configure(cfg) {
      assertLifecycle(State.UNCONFIGURED);
      if (!cfg || typeof cfg !== 'object') {
        throw new TypeError('[VSRP-001:lockpick_core] configure() requires a non-null object.');
      }
      hostConfig = deepFreeze({ ...cfg });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
        throw new Error('[VSRP-001:lockpick_core] Capability Error: Missing eventBus handle.');
      }
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

    reset(snapshot = {}) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
      
      // Preset target harmonics based on difficulty or seed
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

    update(dt, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (!sim?.active) return;
      sim.time += (dt || 0.016) * 1.5;
      lifecycleState = State.RUNNING;
    },

    render(renderer, _context) {
      assertLifecycle(State.READY, State.RUNNING);
      if (typeof renderer === 'function') {
        renderer(this.getState(), hostContext);
        return;
      }
      if (typeof document === 'undefined') return;
      const canvas = document.getElementById('lockpick-canvas');
      if (canvas && sim) {
        drawHarmonics(canvas);
      } else {
        renderDefaultPresentation();
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

    getDiagnostics() {
      return {
        moduleId: 'lockpick_core',
        lifecycleState,
        resonance: calculateResonance(),
        isActive: Boolean(sim?.active)
      };
    },

    getModuleInfo() {
      return {
        moduleId: 'lockpick_core',
        name: 'EmberlightLockpick',
        protocolVersion: 'VSRP-001',
        version: '1.0.0',
        capabilities: ['harmonic_minigame', 'events.lockpick_resolved'],
      };
    },

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

    handleHostAction(action) {
      if (!action || !sim) return;
      const type = typeof action === 'string' ? action : action.type;
      if (type === 'UP' || type === 'w' || type === 'KeyW') {
        cycleParam(-1);
      } else if (type === 'DOWN' || type === 's' || type === 'KeyS') {
        cycleParam(1);
      } else if (type === 'LEFT' || type === 'a' || type === 'KeyA' || type === 'STRAFE_LEFT') {
        adjustSelected(-1);
      } else if (type === 'RIGHT' || type === 'd' || type === 'KeyD' || type === 'STRAFE_RIGHT') {
        adjustSelected(1);
      } else if (type === 'CONFIRM' || type === 'SPACE' || type === 'Space' || type === 'ENTER' || type === 'Enter') {
        if (calculateResonance() >= 95) {
          dispatchSFX('VICTORY');
          finalize(true);
        } else {
          dispatchSFX('DEFEAT');
        }
      } else if (type === 'CANCEL' || type === 'ESCAPE' || type === 'Escape') {
        dispatchSFX('SELECT');
        finalize(false);
      } else {
        renderDefaultPresentation();
      }
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightLockpick = EmberlightLockpick;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightLockpick;
}