/* =========================================================================
   PERIPHERAL DRIVER: RELIC FORGE DOM PRESENTATION RENDERER (TIER-3 PERIPHERAL)
   ========================================================================= */

const EmberlightRelicForgeRenderer = (() => {
  'use strict';

  function getView() {
    return typeof document === 'undefined' ? null : document.getElementById('relic-forge-view');
  }

  function emit(dispatch, action) {
    if (typeof dispatch === 'function') dispatch(action);
  }

  // --- TRANSIENT PARTICLE DISSIPATION SYSTEM ---
  function playForgeBurst(canvas, seed, onComplete) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    const ctx = canvas.getContext('2d');
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
        if (typeof cancelAnimationFrame !== 'undefined' && animFrameId) {
          cancelAnimationFrame(animFrameId);
        }
        if (typeof onComplete === 'function') onComplete();
      }
    }

    stepBurst();
  }

  // --- PROCEDURAL VISUAL MATH KERNELS ---

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

  return {
    init(_context) {},

    renderRelicForge(state, dispatch) {
      const container = getView();
      if (!container || !state) return;
      container.innerHTML = '';

      const char = state.party?.[state.selectedCharIndex] || state.party?.[0] || { name: 'Hero', phenotype: 'HERO' };
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
        btn.className = `cmd-btn ${idx === state.selectedCharIndex ? 'action' : ''}`;
        btn.style.fontSize = '7px';
        btn.style.padding = '4px 8px';
        btn.textContent = `${c.name} (${c.phenotype})`;
        btn.onclick = () => emit(dispatch, { type: 'SELECT_CHAR', index: idx });
        charTabs.appendChild(btn);
      });

      container.appendChild(panel);

      // 2. Render Procedural Canvas Preview
      const canvas = panel.querySelector('#forge-preview-canvas');
      const ctx = (canvas && typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;
      if (ctx) {
        ctx.clearRect(0, 0, 96, 96);
        recipe.draw(ctx, state.currentSeed);
      }

      // 3. Bind Actions
      panel.querySelector('#cat-weapon-btn').onclick = () => emit(dispatch, { type: 'SELECT_CATEGORY', category: 'WEAPON' });
      panel.querySelector('#cat-armor-btn').onclick = () => emit(dispatch, { type: 'SELECT_CATEGORY', category: 'ARMOR' });
      panel.querySelector('#cat-acc-btn').onclick = () => emit(dispatch, { type: 'SELECT_CATEGORY', category: 'ACCESSORY' });

      panel.querySelector('#forge-attune-btn').onclick = () => emit(dispatch, { type: 'REATTUNE' });

      panel.querySelector('#forge-craft-btn').onclick = () => {
        if (state.gold < recipe.cost) return;

        const craftBtn = panel.querySelector('#forge-craft-btn');
        const attuneBtn = panel.querySelector('#forge-attune-btn');
        if (craftBtn) craftBtn.disabled = true;
        if (attuneBtn) attuneBtn.disabled = true;

        playForgeBurst(canvas, state.currentSeed, () => {
          emit(dispatch, {
            type: 'CRAFT_RECIPE',
            recipeYield: recipe.canonicalId,
            cost: recipe.cost,
          });
        });
      };

      panel.querySelector('#close-forge-btn').onclick = () => emit(dispatch, { type: 'EXIT' });
    },

    getDiagnostics() {
      return { driverId: 'relic_forge_renderer' };
    },

    destroy() {
      const view = getView();
      if (view) view.innerHTML = '';
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightRelicForgeRenderer = EmberlightRelicForgeRenderer;
}
