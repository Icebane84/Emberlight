/* =========================================================================
   PERIPHERAL DRIVER: ARMORY DOM PRESENTATION RENDERER (TIER-3 PERIPHERAL)
   ========================================================================= */

const EmberlightArmoryRenderer = (() => {
  'use strict';

  let selectedInventoryItemId = null;

  function getView() {
    return typeof document === 'undefined' ? null : document.getElementById('armory-view');
  }

  function emit(dispatch, action) {
    if (typeof dispatch === 'function') dispatch(action);
  }

  function getManifest() {
    return typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
  }

  function isDeckExpanded() {
    if (typeof document === 'undefined') return false;
    const matrix = document.getElementById('war-table-matrix');
    const container = document.getElementById('district-mount-container');
    return Boolean(
      matrix?.classList.contains('q4-expanded-deck') ||
      container?.closest('.q4-expanded-deck') ||
      document.querySelector('.matrix-grid.q4-expanded-deck')
    );
  }

  function checkRequirements(char, item, manifest) {
    if (!item?.requirements) return { isEligible: true, deficits: [] };
    const stats = typeof manifest.computeCharacterStats === 'function'
      ? manifest.computeCharacterStats(char)
      : char;

    const deficits = [];
    for (const [stat, reqVal] of Object.entries(item.requirements)) {
      if (stat === 'level') {
        const cur = char.level || 1;
        if (cur < reqVal) deficits.push(`LV ${reqVal} (${reqVal - cur} LV NEEDED)`);
      } else {
        const cur = stats[stat] || 0;
        if (cur < reqVal) deficits.push(`${reqVal} ${stat.toUpperCase()} (${reqVal - cur} ${stat.toUpperCase()} NEEDED)`);
      }
    }

    const allowed = item.allowedPhenotypes || item.allowedClasses;
    if (allowed && !allowed.includes(char.phenotype)) {
      deficits.push(`CLASS ${allowed.join('/')} ONLY`);
    }

    return {
      isEligible: deficits.length === 0,
      deficits,
    };
  }

  function renderDeepAnalysisArmory(panel, state, dispatch, manifest) {
    const party = state.party || [];
    if (party.length === 0) return;

    const selectedIdx = Math.max(0, Math.min(party.length - 1, state.selectedCharIndex || 0));
    const character = party[selectedIdx] || party[0];
    const selectedSlot = state.selectedSlot || 'weapon';

    const charStats = typeof manifest.computeCharacterStats === 'function'
      ? manifest.computeCharacterStats(character)
      : character;

    // 1. Get Battler Paper-Doll
    let spriteDataUrl = '';
    if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
      spriteDataUrl = EmberlightBattlerBaker.get({
        phenotype: character.phenotype || 'HERO',
        weapon: character.equipment?.weapon,
        armor: character.equipment?.armor,
      });
    }

    // 2. Telemetry Estimates
    const atk = charStats.atk || 10;
    const def = charStats.def || 5;
    const agi = charStats.agi || 7;
    const minDmg = Math.round(atk * 1.5);
    const maxDmg = Math.round(atk * 2.2);
    const mitigation = Math.min(75, Math.round((def / (def + 28)) * 100));
    const actionDelay = Math.round(1000 / Math.max(1, agi));

    // Inventory items for this slot
    const slotItems = Object.entries(state.inventory || {})
      .filter(([id, count]) => count > 0)
      .map(([id, count]) => ({ id, count, def: manifest.Items?.[id] }))
      .filter((entry) => entry.def && entry.def.slot === selectedSlot);

    if (!selectedInventoryItemId || !slotItems.some((s) => s.id === selectedInventoryItemId)) {
      selectedInventoryItemId = slotItems[0]?.id || null;
    }

    const highlightedItem = selectedInventoryItemId ? manifest.Items?.[selectedInventoryItemId] : null;

    panel.innerHTML = `
      <div class="deep-analysis-deck">
        <!-- 1. ROSTER SELECTION RIBBON -->
        <div class="deep-analysis-roster" id="armory-roster-ribbon"></div>

        <!-- 2. PRIMARY 3-COLUMN OPERATIONAL STAGE -->
        <div class="deep-analysis-stage-3col">
          <!-- PANE 1: FULL-BODY PAPER DOLL & EQUIPPED SLOTS -->
          <div class="deep-analysis-pane" style="align-items:center;">
            <div class="deep-pane-title" style="width:100%;">
              <span>RIG: ${character.name.toUpperCase()}</span>
              <span style="color:var(--ember); font-size:6px;">2X BAKER</span>
            </div>
            <div class="battler-paper-doll-frame">
              ${spriteDataUrl ? `<img src="${spriteDataUrl}" class="battler-paper-doll-img" alt="${character.name}" />` : '<div style="font-size:32px;">🧙‍♂️</div>'}
            </div>
            <div style="width:100%; display:flex; flex-direction:column; gap:4px; font-size:7px; margin-top:4px;">
              ${['weapon', 'armor', 'accessory'].map((slot) => {
                const isSelected = selectedSlot === slot;
                const eqItem = character.equipment?.[slot];
                const itemDef = eqItem ? manifest.Items?.[eqItem] : null;
                return `
                  <button type="button" class="cmd-btn ${isSelected ? 'run' : ''} slot-select-btn" data-slot="${slot}" style="font-size:7px; padding:3px 6px; text-align:left; display:flex; justify-content:space-between;">
                    <span>${slot.toUpperCase()}:</span>
                    <span style="font-weight:bold; color:${eqItem ? 'var(--ember)' : 'var(--text-dim)'};">${itemDef?.label || eqItem || '[EMPTY]'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- PANE 2: ARMORY MATRIX & INVENTORY -->
          <div class="deep-analysis-pane">
            <div class="deep-pane-title">
              <span>ARMORY MATRIX: ${selectedSlot.toUpperCase()}S (${slotItems.length})</span>
              <span style="color:var(--text-dim); font-size:6px;">Select to compare</span>
            </div>
            <div id="armory-items-list" style="display:flex; flex-direction:column; gap:5px; overflow-y:auto; max-height:260px;">
              ${slotItems.length === 0
                ? '<div style="color:var(--text-dim); font-size:7px; padding:12px; text-align:center;">No items found in stock for this slot.</div>'
                : slotItems.map((entry) => {
                  const item = entry.def;
                  const reqCheck = checkRequirements(character, item, manifest);
                  const isHighlight = selectedInventoryItemId === entry.id;
                  const statBonusText = Object.entries(item.stats || {})
                    .map(([s, val]) => `+${val} ${s.toUpperCase()}`)
                    .join(', ');

                  return `
                    <div class="compare-card ${isHighlight ? 'selected' : ''} inventory-item-card" data-item="${entry.id}" style="cursor:pointer;">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:var(--ember);">${item.label || entry.id} <span style="color:var(--text-dim);">x${entry.count}</span></span>
                        <button type="button" class="cmd-btn action equip-action-btn" data-item="${entry.id}" style="font-size:6px; padding:1px 6px;" ${reqCheck.isEligible ? '' : 'disabled'}>
                          ${reqCheck.isEligible ? '⚡ EQUIP' : '🔒 LOCKED'}
                        </button>
                      </div>
                      <div style="color:var(--text-dim); font-size:6px;">${statBonusText || 'Special artifact'}</div>
                      ${!reqCheck.isEligible ? `<div class="deficit-warning">DEFICIT: ${reqCheck.deficits.join(', ')}</div>` : ''}
                    </div>
                  `;
                }).join('')}
            </div>
            ${character.equipment?.[selectedSlot] ? `
              <div style="margin-top:auto; text-align:right;">
                <button type="button" class="cmd-btn" id="unequip-current-btn" style="font-size:7px; padding:2px 8px; color:var(--danger);">✕ UNEQUIP CURRENT</button>
              </div>
            ` : ''}
          </div>

          <!-- PANE 3: COMBAT TELEMETRY PREVIEW -->
          <div class="deep-analysis-pane">
            <div class="deep-pane-title">
              <span>COMBAT TELEMETRY PREVIEW</span>
              <span style="color:var(--ok);">LIVE</span>
            </div>
            <div class="combat-telemetry-box">
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Expected Strike DMG:</span>
                <span style="font-weight:bold; color:var(--ember);">${minDmg} ~ ${maxDmg}</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Physical Mitigation:</span>
                <span style="font-weight:bold; color:var(--ok);">${mitigation}%</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Action Delay Cost:</span>
                <span style="font-weight:bold; color:#60a5fa;">${actionDelay} ms</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Encumbrance / Agi:</span>
                <span style="font-weight:bold; color:var(--ok);">OPTIMAL (+${agi})</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Elemental Resonances:</span>
                <span style="font-weight:bold;">${charStats.affinities ? Object.keys(charStats.affinities).join(', ') : 'STANDARD (1.0x)'}</span>
              </div>
            </div>

            <div style="margin-top:auto; background:rgba(0,0,0,0.4); padding:6px; border:1px solid var(--border-dim); border-radius:3px; font-size:7px;">
              <div style="color:var(--ember); font-weight:bold; margin-bottom:2px;">TACTICAL LOADOUT TIP:</div>
              <div>Balancing Vanguard DEF with Arcanist MP ensures clean turn pacing in subterranean crypts.</div>
            </div>
          </div>
        </div>

        <!-- 3. LOWER STAGE: PARTY-WIDE LOADOUT COMPARATOR -->
        <div class="deep-analysis-bench">
          <div class="deep-pane-title">
            <span>PARTY-WIDE LOADOUT COMPARATOR ${highlightedItem ? `(${highlightedItem.label})` : ''}</span>
            <button type="button" class="cmd-btn action" id="close-armory-btn" style="font-size:7px; padding:2px 8px;">✔ DONE / RETURN</button>
          </div>

          <div class="party-loadout-comparator">
            ${party.map((pChar) => {
              const req = highlightedItem ? checkRequirements(pChar, highlightedItem, manifest) : { isEligible: false, deficits: [] };
              const currentEq = pChar.equipment?.[selectedSlot];
              const isCurrent = pChar.id === character.id;

              return `
                <div class="compare-card ${isCurrent ? 'selected' : ''}">
                  <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span>${pChar.name}</span>
                    <span style="color:var(--text-dim); font-size:6px;">${pChar.phenotype}</span>
                  </div>
                  <div style="font-size:6px; color:var(--text-dim);">Equipped: <b>${currentEq ? (manifest.Items?.[currentEq]?.label || currentEq) : '[EMPTY]'}</b></div>
                  ${highlightedItem ? (
                    req.isEligible
                      ? `<button type="button" class="cmd-btn action equip-for-char-btn" data-char="${pChar.id}" data-item="${highlightedItem.id}" style="font-size:6px; padding:2px 4px; margin-top:4px;">⚡ EQUIP ON ${pChar.name.toUpperCase()}</button>`
                      : `<div class="deficit-warning" style="margin-top:4px;">INSUFFICIENT (${req.deficits[0] || 'LOCKED'})</div>`
                  ) : '<div style="font-size:6px; color:var(--text-dim);">No item selected</div>'}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Populate Roster Ribbon
    const rosterRibbon = panel.querySelector('#armory-roster-ribbon');
    party.forEach((pChar, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `deep-roster-btn ${idx === selectedIdx ? 'active' : ''}`;
      btn.innerHTML = `<span>${pChar.name}</span> <span style="font-size:6px; opacity:0.8;">(${pChar.phenotype})</span>`;
      btn.onclick = () => emit(dispatch, { type: 'SELECT_CHAR', index: idx });
      rosterRibbon.appendChild(btn);
    });

    // Bind Slot Selectors
    panel.querySelectorAll('.slot-select-btn').forEach((btn) => {
      btn.onclick = () => emit(dispatch, { type: 'SELECT_SLOT', slot: btn.dataset.slot });
    });

    // Bind Item Card Selection & Equip
    panel.querySelectorAll('.inventory-item-card').forEach((card) => {
      card.onclick = (e) => {
        if (e.target.closest('.equip-action-btn')) return;
        selectedInventoryItemId = card.dataset.item;
        EmberlightArmoryRenderer.renderArmory(state, dispatch);
      };
    });

    panel.querySelectorAll('.equip-action-btn').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        emit(dispatch, {
          type: 'EQUIP',
          characterId: character.id,
          slot: selectedSlot,
          itemId: btn.dataset.item,
        });
      };
    });

    panel.querySelectorAll('.equip-for-char-btn').forEach((btn) => {
      btn.onclick = () => {
        emit(dispatch, {
          type: 'EQUIP',
          characterId: btn.dataset.char,
          slot: selectedSlot,
          itemId: btn.dataset.item,
        });
      };
    });

    const unequipBtn = panel.querySelector('#unequip-current-btn');
    if (unequipBtn) {
      unequipBtn.onclick = () => {
        emit(dispatch, {
          type: 'UNEQUIP',
          characterId: character.id,
          slot: selectedSlot,
        });
      };
    }

    const closeBtn = panel.querySelector('#close-armory-btn');
    if (closeBtn) {
      closeBtn.onclick = () => emit(dispatch, { type: 'EXIT' });
    }
  }

  function renderCompactArmory(panel, state, dispatch) {
    const character = state.party?.[state.selectedCharIndex];
    if (!character) return;

    panel.innerHTML = `<div class="panel-title">EQUIPMENT: ${character.name} (${character.phenotype})</div>`;

    const characterRow = document.createElement('div');
    characterRow.style.display = 'flex';
    characterRow.style.gap = '4px';
    (state.party || []).forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cmd-btn${index === state.selectedCharIndex ? ' run' : ''}`;
      button.style.fontSize = '7px';
      button.textContent = `${entry.name}`;
      button.onclick = () => emit(dispatch, { type: 'SELECT_CHAR', index });
      characterRow.appendChild(button);
    });
    panel.appendChild(characterRow);

    const slotRow = document.createElement('div');
    slotRow.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0;';
    ['weapon', 'armor', 'accessory'].forEach((slot) => {
      const itemId = character.equipment?.[slot];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cmd-btn${state.selectedSlot === slot ? ' run' : ''}`;
      button.style.fontSize = '7px';
      button.textContent = `${slot.toUpperCase()}: ${itemId || '[EMPTY]'}`;
      button.onclick = () => emit(dispatch, { type: 'SELECT_SLOT', slot });
      slotRow.appendChild(button);
    });
    panel.appendChild(slotRow);

    const inventory = document.createElement('div');
    inventory.style.display = 'flex';
    inventory.style.flexDirection = 'column';
    inventory.style.gap = '4px';

    Object.entries(state.inventory || {}).forEach(([itemId, count]) => {
      if (count <= 0) return;
      const item = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest.Items?.[itemId] : null;
      if (!item || item.slot !== state.selectedSlot) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cmd-btn action';
      button.style.fontSize = '7px';
      button.textContent = `${item.label || itemId} x${count}`;
      button.onclick = () => emit(dispatch, {
        type: 'EQUIP',
        characterId: character.id,
        slot: state.selectedSlot,
        itemId,
      });
      inventory.appendChild(button);
    });
    panel.appendChild(inventory);

    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'cmd-btn action';
    done.style.cssText = 'margin-top:10px; font-size:7px;';
    done.textContent = '✔ DONE / RETURN';
    done.onclick = () => emit(dispatch, { type: 'EXIT' });
    panel.appendChild(done);
  }

  return {
    init(_context) {},

    renderArmory(state, dispatch) {
      const view = getView();
      if (!view || !state) return;
      view.innerHTML = '';

      const panel = document.createElement('div');
      panel.className = 'panel';

      const manifest = getManifest();
      if (isDeckExpanded()) {
        renderDeepAnalysisArmory(panel, state, dispatch, manifest);
      } else {
        renderCompactArmory(panel, state, dispatch);
      }

      view.appendChild(panel);
    },

    getDiagnostics() {
      return { driverId: 'armory_renderer' };
    },

    destroy() {},
  };
})();

if (typeof window !== 'undefined') window.EmberlightArmoryRenderer = EmberlightArmoryRenderer;

