/* =========================================================================
   PERIPHERAL DRIVER: COCKPIT DOM PRESENTATION RENDERER (TIER-3 PERIPHERAL)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-COCKPIT-RENDERER
   Protocol Version:    VSRP-001
   Classification:      Peripheral Capability Driver & Tactical DOM Cockpit
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightCockpitRenderer = (() => {
  'use strict';

  let eventBusRef = null;
  let lastScannedHazardSignature = '';
  let activePouchSelectedItemId = null;
  let isQ4DeckExpanded = false;
  let is3DViewExpanded = false;
  let titleAnimId = null;

  function showElement(id) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hideElement(id) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function notifyStatus(msg) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('status-line') || document.getElementById('status-ticker');
    if (el) el.textContent = msg;
  }

  function updateQuestTicker(snapshot) {
    if (typeof document === 'undefined') return;
    const ticker = document.getElementById('status-quest-ticker');
    if (!ticker) return;

    const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
    const quests = manifest.Quests || {};
    const activeQuests = snapshot?.quests || {};

    let activeTitle = 'Investigate Oakhaven Hamlet';
    let stageDesc = 'Explore the surrounding wilderness';

    for (const [qId, qData] of Object.entries(quests)) {
      const qState = activeQuests?.[qId];
      if (!qState?.completed) {
        activeTitle = qData.title || qId;
        const currentStage = qState?.stage || 0;
        stageDesc = qData.stages?.[currentStage]?.desc || 'In Progress';
        break;
      }
    }
    ticker.innerHTML = `📜 <span class="quest-tag">[QUEST]</span> ${activeTitle}: ${stageDesc}`;
  }

  function renderMiniHUD(snapshot) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('q4-persistent-mini-hud');
    if (!container) return;

    const activeDistrict = snapshot?.activeDistrict || 'OVERWORLD';
    if (
      activeDistrict === 'OVERWORLD' ||
      activeDistrict === 'TITLE' ||
      activeDistrict === 'COMBAT' ||
      activeDistrict === 'GAME_OVER'
    ) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    const party = snapshot?.party || [];
    if (!Array.isArray(party) || party.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = party
      .map((c) => {
        const stats = typeof EmberlightManifest !== 'undefined' && typeof EmberlightManifest.computeCharacterStats === 'function'
          ? EmberlightManifest.computeCharacterStats(c)
          : c;
        const maxHp = stats.maxHp || c.maxHp || 1;
        const maxMp = stats.maxMp || c.maxMp || 1;
        const hpPct = Math.round((Math.max(0, c.hp) / maxHp) * 100);
        const mpPct = Math.round((Math.max(0, c.mp) / maxMp) * 100);
        const initial = c.name ? c.name.slice(0, 3).toUpperCase() : 'HER';
        const isFainted = !c.alive || c.hp <= 0;
        return `
          <div class="mini-hud-pip ${isFainted ? 'fainted' : ''}">
            <div class="mini-hud-name">
              <span>${initial}</span>
              <span>${c.hp}/${maxHp}</span>
            </div>
            <div class="mini-hud-bar-track"><div class="mini-hud-bar-fill hp" style="width:${hpPct}%"></div></div>
            <div class="mini-hud-bar-track"><div class="mini-hud-bar-fill mp" style="width:${mpPct}%"></div></div>
          </div>
        `;
      })
      .join('');
  }

  function renderPartyHUD(snapshot) {
    if (typeof document === 'undefined') return;
    const activeDistrict = snapshot?.activeDistrict || 'OVERWORLD';

    if (activeDistrict === 'OVERWORLD') {
      showElement('party-hud-panel');
      hideElement('district-mount-container');
    } else if (activeDistrict === 'TITLE' || activeDistrict === 'COMBAT' || activeDistrict === 'GAME_OVER') {
      hideElement('party-hud-panel');
    } else {
      hideElement('party-hud-panel');
      showElement('district-mount-container');
    }

    const partyContainer =
      document.getElementById('party-hud-grid') ||
      document.getElementById('party-hud-roster') ||
      document.getElementById('party-roster');

    if (partyContainer) {
      partyContainer.innerHTML = '';
      const party = snapshot?.party || [];
      if (Array.isArray(party)) {
        party.forEach((c) => {
          const card = document.createElement('div');
          card.className = `hud-char-card ${c.alive ? '' : 'fainted'}`;

          const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
          const mpPct = Math.max(0, Math.min(100, (c.mp / c.maxMp) * 100));
          const ailmentTags = (c.ailments || [])
            .map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`)
            .join(' ');

          const crestUrl =
            typeof EmberlightPartyIcons !== 'undefined' ? EmberlightPartyIcons.get(c.phenotype) : null;

          card.innerHTML = `
            ${crestUrl ? `<img src="${crestUrl}" class="hud-char-crest" alt="${c.name}" />` : ''}
            <div class="hud-char-details">
              <div class="hud-char-name">
                <span>${c.name}</span>
                <span style="color:var(--text-dim); font-size:6.5px;">Lv${c.level}</span>
                ${ailmentTags}
              </div>
              <div class="hud-stat-row">
                <span class="hud-stat-label">HP</span>
                <span class="hud-bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                <span class="hud-stat-val">${c.hp}/${c.maxHp}</span>
              </div>
              <div class="hud-stat-row">
                <span class="hud-stat-label">MP</span>
                <span class="hud-bar-track"><span class="hud-bar-fill mp" style="width:${mpPct}%"></span></span>
                <span class="hud-stat-val">${c.mp}/${c.maxMp}</span>
              </div>
            </div>
          `;
          partyContainer.appendChild(card);
        });
      }
    }

    const goldEl =
      document.getElementById('hud-gold-display') ||
      document.getElementById('gold-display') ||
      document.getElementById('gold-count');

    if (goldEl) {
      goldEl.textContent = `${snapshot?.gold || 0} GOLD`;
    }

    const shopBtn = document.getElementById('nav-shop-btn');
    if (shopBtn) {
      const inTown = Boolean(snapshot?.townId);
      shopBtn.disabled = !inTown;
      shopBtn.style.opacity = inTown ? '1' : '0.4';
      shopBtn.title = inTown ? 'Access Oakhaven Market' : 'Market is only accessible in Oakhaven Town (🏰)';
    }
  }

  function getAdjacentTiles(map, px, py) {
    if (!map || map.length === 0) return [];
    const adjacentCoords = [
      { x: px, y: py - 1 },
      { x: px, y: py + 1 },
      { x: px - 1, y: py },
      { x: px + 1, y: py },
    ];
    const adjacentTiles = [];
    adjacentCoords.forEach(({ x, y }) => {
      if (y >= 0 && y < map.length && x >= 0 && x < map[0]?.length) {
        adjacentTiles.push(map[y][x]);
      }
    });
    return adjacentTiles;
  }

  function updateScannerButtonSynergy(adjacentTiles, map, px, py) {
    if (typeof document === 'undefined') return;
    const btnScorch = document.getElementById('btn-field-scorch');
    const btnFreeze = document.getElementById('btn-field-freeze');
    const btnConsecrate = document.getElementById('btn-field-consecrate');
    const btnDispel = document.getElementById('btn-field-dispel');

    [btnScorch, btnFreeze, btnConsecrate, btnDispel].forEach((btn) => {
      if (btn) btn.classList.remove('synergy-active');
    });

    if (adjacentTiles.includes('~') && btnFreeze) btnFreeze.classList.add('synergy-active');
    if (adjacentTiles.includes('"') && btnScorch) btnScorch.classList.add('synergy-active');
    if (adjacentTiles.includes('%') && btnDispel) btnDispel.classList.add('synergy-active');
    if (map?.[py]?.[px] === '.' && btnConsecrate) btnConsecrate.classList.add('synergy-active');
  }

  function buildScannerHazardMessages(adjacentTiles) {
    const hazardDefinitions = [
      { tile: '~', msg: '🌊 Abyssal Chasm nearby. [G] FREEZE viable.' },
      { tile: 'P', msg: '🔒 Sealed Portcullis blocking passage.' },
      { tile: '"', msg: '🌾 Dry Brush detected. [F] SCORCH viable.' },
      { tile: '%', msg: '⚠️ Toxic Miasma detected! [V] DISPEL viable.' },
      { tile: '_', msg: '⚙️ Stone Pressure Plate nearby. Step to activate.' },
      { tile: '/', msg: '🔓 Portcullis open. Safe passage.' },
      { tile: '$', msg: '📦 Strongbox detected. Step to unlock.' },
      { tile: '@', msg: '🐪 Wandering Caravan in visual range. [B] Trade.' },
      { tile: 'C', msg: '🔥 Consecrated Campsite. Rest available.' },
    ];
    return hazardDefinitions.filter(({ tile }) => adjacentTiles.includes(tile)).map(({ msg }) => msg);
  }

  function dispatchHazardAcousticCue(adjacentTiles) {
    const signature = adjacentTiles.slice().sort((a, b) => a.localeCompare(b)).join('');
    if (signature === lastScannedHazardSignature) return;
    lastScannedHazardSignature = signature;
    if (adjacentTiles.includes('~')) {
      if (eventBusRef) eventBusRef.publish('overworld:sfx', { sfx: 'HAZARD_WATER', pan: 0.0 });
    } else if (adjacentTiles.includes('P')) {
      if (eventBusRef) eventBusRef.publish('overworld:sfx', { sfx: 'HAZARD_PORTCULLIS', pan: 0.0 });
    }
  }

  function updateScannerAlerts(snapshot) {
    if (typeof document === 'undefined') return;
    const alertsEl = document.getElementById('scanner-alerts');
    const dock = document.getElementById('tactical-dock');
    if (!alertsEl || !dock) return;

    const map = snapshot?.activeMap || [];
    const px = snapshot?.worldPos?.x || 0;
    const py = snapshot?.worldPos?.y || 0;
    const adjacentTiles = getAdjacentTiles(map, px, py);

    updateScannerButtonSynergy(adjacentTiles, map, px, py);
    const messages = buildScannerHazardMessages(adjacentTiles);
    dispatchHazardAcousticCue(adjacentTiles);

    if (messages.length > 0) {
      alertsEl.innerHTML = messages.map((m) => `<div style="color:var(--ember);">${m}</div>`).join('');
    } else {
      alertsEl.innerHTML = '<span class="scanner-status">✨ Environmental scan nominal. Cobblestone stable.</span>';
    }
  }

  function renderFieldPouch(snapshot, dispatch) {
    if (typeof document === 'undefined') return;
    const grid = document.getElementById('field-pouch-grid');
    const targetDrawer = document.getElementById('pouch-target-drawer');
    if (!grid) return;

    const inventory = snapshot?.inventory || {};
    const items = [
      { id: 'POTION', label: 'Potion', effect: '+25 HP', count: inventory.POTION || 0 },
      { id: 'ETHER', label: 'Ether', effect: '+15 MP', count: inventory.ETHER || 0 },
      { id: 'PHOENIX_EMBER', label: 'Ember', effect: 'Revive 50%', count: inventory.PHOENIX_EMBER || 0 },
    ];

    grid.innerHTML = '';
    items.forEach((it) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `field-pouch-btn ${activePouchSelectedItemId === it.id ? 'active' : ''}`;
      btn.disabled = it.count <= 0;
      btn.innerHTML = `
        <div style="font-weight:bold; color:var(--ember); font-size:7px;">${it.label} (${it.count})</div>
        <div style="color:var(--text-dim); font-size:6px;">${it.effect}</div>
      `;
      btn.onclick = () => {
        activePouchSelectedItemId = activePouchSelectedItemId === it.id ? null : it.id;
        renderFieldPouch(snapshot, dispatch);
        if (activePouchSelectedItemId) {
          renderPouchTargetSelector(snapshot, it, targetDrawer, dispatch);
        } else if (targetDrawer) {
          targetDrawer.classList.add('hidden');
          targetDrawer.innerHTML = '';
        }
      };
      grid.appendChild(btn);
    });

    if (!activePouchSelectedItemId && targetDrawer) {
      targetDrawer.classList.add('hidden');
      targetDrawer.innerHTML = '';
    }
  }

  function renderPouchTargetSelector(snapshot, item, drawer, dispatch) {
    if (!drawer) return;
    drawer.classList.remove('hidden');
    drawer.innerHTML = `
      <div style="font-size:7px; color:var(--ember); font-weight:bold; margin-bottom:4px;">
        Use ${item.label} on:
      </div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px;" id="pouch-target-buttons"></div>
    `;

    const btnContainer = drawer.querySelector('#pouch-target-buttons');
    const party = snapshot?.party || [];

    party.forEach((c) => {
      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = 'cmd-btn action pouch-target-btn';
      tBtn.style.fontSize = '6.5px';
      tBtn.style.padding = '3px 4px';
      tBtn.textContent = `${c.name} (${c.hp}/${c.maxHp})`;

      tBtn.onclick = () => {
        if (typeof dispatch === 'function') {
          dispatch({
            type: 'USE_FIELD_ITEM',
            itemId: item.id,
            targetHeroId: c.id,
            targetId: c.id,
          });
        }
      };
      btnContainer.appendChild(tBtn);
    });
  }

  function startTitleAnimation(canvasId = 'title-bg-canvas', getActiveDistrict) {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;
    function renderTitleFrame() {
      const activeDistrict = typeof getActiveDistrict === 'function' ? getActiveDistrict() : 'TITLE';
      if (activeDistrict !== 'TITLE') {
        titleAnimId = null;
        return;
      }
      t += 0.02;
      ctx.fillStyle = '#060610';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255, 157, 77, 0.2)';
      ctx.lineWidth = 1;
      const cy = canvas.height * 0.6;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, cy - 30);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      const rad = 60 + Math.sin(t * 3) * 8;
      const grad = ctx.createRadialGradient(canvas.width / 2, cy - 30, 0, canvas.width / 2, cy - 30, rad);
      grad.addColorStop(0, 'rgba(255, 157, 77, 0.4)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, cy - 30, rad, 0, Math.PI * 2);
      ctx.fill();

      if (typeof requestAnimationFrame !== 'undefined') {
        titleAnimId = requestAnimationFrame(renderTitleFrame);
      }
    }

    if (!titleAnimId && typeof requestAnimationFrame !== 'undefined') {
      titleAnimId = requestAnimationFrame(renderTitleFrame);
    }
  }

  return {
    init(context) {
      eventBusRef = context?.eventBus || null;
    },

    render(snapshot, dispatch) {
      renderPartyHUD(snapshot);
      renderMiniHUD(snapshot);
      updateScannerAlerts(snapshot);
      updateQuestTicker(snapshot);

      const isPouchOpen = Boolean(snapshot?.pouchOpen);
      if (isPouchOpen) {
        showElement('exploration-pouch-drawer');
        renderFieldPouch(snapshot, dispatch);
      } else {
        hideElement('exploration-pouch-drawer');
      }
    },

    renderCockpit(snapshot, dispatch) {
      this.render(snapshot, dispatch);
    },

    renderPartyHUD,
    renderMiniHUD,
    updateScannerAlerts,
    updateQuestTicker,
    renderFieldPouch,
    startTitleAnimation,
    notifyStatus,

    setExpanded(q4Expanded, view3dExpanded) {
      isQ4DeckExpanded = Boolean(q4Expanded);
      is3DViewExpanded = Boolean(view3dExpanded);
    },

    getDiagnostics() {
      return {
        driverId: 'cockpit_renderer',
        isQ4DeckExpanded,
        is3DViewExpanded,
      };
    },

    destroy() {
      eventBusRef = null;
      lastScannedHazardSignature = '';
      activePouchSelectedItemId = null;
      titleAnimId = null;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightCockpitRenderer = EmberlightCockpitRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightCockpitRenderer;
}
