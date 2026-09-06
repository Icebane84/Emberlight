/* =========================================================================
   COMBAT PRESENTATION DRIVER (TIER 3)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-COMBAT-RENDERER
   Protocol Version:    VSRP-001 / ARCH-SPEC-COMBAT-AESTHETICS-003
   Classification:      Tier 3 Presentation Engine & Tactical Viewport Driver
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightCombatRenderer = (() => {
  let mounted = false;
  let actionHandler = null;
  let hostContext = null;
  "use strict";
  function getElement(id) {
    return typeof document === 'undefined' ? null : document.getElementById(id);
  }

  function emit(action) {
    if (typeof actionHandler === 'function') {
      actionHandler(action);
    }
  }

  function resolveAffinity(attackElement, target) {
    if (!target || !attackElement || attackElement === 'NONE') return { label: 'NEUTRAL', multiplier: 1.0 };
    const elem = String(attackElement).toUpperCase();
    const weaknesses = (target.weaknesses || []).map((w) => String(w).toUpperCase());
    const resistances = (target.resistances || []).map((r) => String(r).toUpperCase());
    const immunities = (target.immunities || []).map((i) => String(i).toUpperCase());

    if (immunities.includes(elem)) return { label: 'IMMUNE', multiplier: 0.0 };
    if (weaknesses.includes(elem)) return { label: 'WEAK', multiplier: 1.5 };
    if (resistances.includes(elem)) return { label: 'RESIST', multiplier: 0.5 };
    return { label: 'NEUTRAL', multiplier: 1.0 };
  }

  function getActiveSkillElement(skill) {
    if (!skill) return 'PHYSICAL';
    if (skill.element) return skill.element;
    return skill.subType === 'strike' ? 'PHYSICAL' : 'FIRE';
  }

  function renderAffinityTag(affinity) {
    if (affinity.label === 'WEAK') {
      return '<span class="pip weak" style="color:var(--ember); font-weight:bold;">⚡ WEAK</span>';
    }
    if (affinity.label === 'RESIST') {
      return '<span class="pip resist" style="color:var(--text-dim);">🛡️ RESIST</span>';
    }
    return '';
  }

  // --- 1. RENDER ACTION THEATER & TELEMETRY ---
  function renderClashHeader(state) {
    const clashIconEl = getElement('theater-clash-icon');
    const clashLabelEl = getElement('theater-clash-label');
    if (!clashIconEl || !clashLabelEl) return;

    if (state?.pendingSkill) {
      clashIconEl.textContent = '✨';
      clashLabelEl.textContent = (state.pendingSkill.label || state.pendingSkill.name || 'SKILL').toUpperCase();
    } else if (state?.phase === 'TARGETING_ENEMY') {
      clashIconEl.textContent = '⚔️';
      clashLabelEl.textContent = 'STRIKE TARGET';
    } else if (state?.phase === 'ENEMY_ACTION') {
      clashIconEl.textContent = '💥';
      clashLabelEl.textContent = 'ENEMY STRIKE';
    } else {
      clashIconEl.textContent = '⚔️';
      clashLabelEl.textContent = 'TACTICAL ENGAGEMENT';
    }
  }

  function renderTelemetryStats(activeChar, targetEnemy, state) {
    const telemetryDmg = getElement('telemetry-dmg-range');
    const telemetryHit = getElement('telemetry-hit-rate');
    const telemetryAffinity = getElement('telemetry-affinity-tag');
    if (!telemetryDmg || !activeChar || !targetEnemy) return;

    if (state?.pendingSkill) {
      const skill = state.pendingSkill;
      const element = getActiveSkillElement(skill);
      const powerMult = skill.multiplier || skill.mult || 1.4;
      const rawBase = Math.max(1, (activeChar.atk || 10) * powerMult * 1.5 - (targetEnemy.def || 5));
      const affinity = resolveAffinity(element, targetEnemy);
      const finalDmg = Math.max(1, Math.round(rawBase * affinity.multiplier));
      const estMin = Math.max(1, Math.round(finalDmg * 0.85));
      const estMax = Math.max(1, Math.round(finalDmg * 1.15));
      const hitRate = skill.accuracy || 95;

      if (telemetryAffinity) {
        if (affinity.label === 'WEAK') {
          telemetryAffinity.innerHTML = '<b style="color:var(--ember)">AFFINITY: ⚡ WEAKNESS (1.5x)</b>';
        } else if (affinity.label === 'RESIST') {
          telemetryAffinity.innerHTML = '<b style="color:var(--text-dim)">AFFINITY: 🛡️ RESISTED (0.5x)</b>';
        } else {
          telemetryAffinity.innerHTML = `AFFINITY: ${element} (1.0x)`;
        }
      }

      telemetryDmg.textContent = `EST DMG: ${estMin} ~ ${estMax}`;
      if (telemetryHit) telemetryHit.textContent = `HIT: ${hitRate}%`;
    } else {
      const rawBase = Math.max(1, (activeChar.atk || 10) * 2 - (targetEnemy.def || 5));
      const estMin = Math.max(1, rawBase - 2);
      const estMax = Math.max(1, rawBase + 3);
      if (telemetryAffinity) telemetryAffinity.innerHTML = 'AFFINITY: PHYSICAL (1.0x)';
      telemetryDmg.textContent = `EST DMG: ${estMin} ~ ${estMax}`;
      if (telemetryHit) telemetryHit.textContent = 'HIT: 95%';
    }
  }

  function renderActionTheater(activeChar, targetEnemy, state) {
    renderClashHeader(state);
    renderTelemetryStats(activeChar, targetEnemy, state);
  }

  // --- 2. RENDER ENEMY FORMATION WING ---
  function resolveEnemyBattlerUrl(enemy, isBossEnraged, heatPulse) {
    if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
      const url = EmberlightBattlerBaker.get(enemy.key);
      if (url) return url;
    }
    if (typeof EmberlightIcons !== 'undefined' && typeof EmberlightIcons.get === 'function') {
      if (enemy.isBoss && typeof EmberlightIcons.getBossIcon === 'function') {
        return EmberlightIcons.getBossIcon(isBossEnraged, heatPulse);
      }
      return EmberlightIcons.get(enemy.key);
    }
    return null;
  }

  function resolveEnemyAffinityBadge(activeElement, enemy) {
    if (!enemy.alive) return '';
    const affinity = resolveAffinity(activeElement, enemy);
    if (affinity.label === 'WEAK') {
      return '<div class="affinity-badge weak">⚡ WEAK 1.5x</div>';
    }
    if (affinity.label === 'RESIST') {
      return '<div class="affinity-badge resist">🛡️ RESIST 0.5x</div>';
    }
    return '';
  }

  function renderEnemyCard({ e, idx }, activeElement) {
    const isBossUnit = Boolean(e.isBoss || (e.key && String(e.key).toUpperCase().includes('BOSS')) || (e.key && String(e.key).toUpperCase().includes('MALAKOR')));
    const bossCls = isBossUnit ? 'boss-card boss-battler' : '';
    const isBossEnraged = Boolean(e.isBoss && e.phaseTwoActive);
    const heatPulse = isBossEnraged ? (1.0 + Math.sin(Date.now() * 0.008) * 0.25) : 1.0;
    const hpPct = e.maxHp > 0 ? Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)) : 0;
    const isExhausted = e.alive && (e.hp / e.maxHp) <= 0.30;
    const ailmentList = (e.ailments || []).map((a) => a.id).join(',');
    const ailmentClasses = (e.ailments || []).map((a) => `has-ailment-${a.id.toLowerCase()}`).join(' ');
    const ailmentTags = (e.ailments || []).map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`).join(' ');

    const bossBattlerClass = isBossUnit ? 'boss-battler' : '';
    const battlerUrl = resolveEnemyBattlerUrl(e, isBossEnraged, heatPulse);
    let spriteHtml = `<div class="sprite">${e.sprite || '👾'}</div>`;
    if (battlerUrl) {
      spriteHtml = `<img src="${battlerUrl}" class="battler-sprite enemy-battler ${bossBattlerClass}" alt="${e.name}" />`;
    }

    const affinityBadgeHtml = resolveEnemyAffinityBadge(activeElement, e);
    const rowClass = (e.row === 'FRONT' || e.row === 'BOTH' || !e.row) ? 'row-front' : 'row-back';
    const rowTag = e.row === 'BACK' ? '<div class="backline-tag">BACKLINE (+15% EVA)</div>' : '<div class="frontline-tag">FRONTLINE</div>';
    const stanceClass = isExhausted ? 'exhausted' : '';
    const exhaustedBadge = isExhausted ? '<div class="exhausted-badge">⚠️ TIRED (≤30%)</div>' : '';

    return `
      <div class="enemy formation-slot ${rowClass} ${stanceClass} ${e.alive ? '' : 'dead'} ${bossCls} ${ailmentClasses}" data-idx="${idx}" data-ailments="${ailmentList}" tabindex="0" style="position:relative; width:100%;">
        ${affinityBadgeHtml}
        ${spriteHtml}
        <div style="font-size:7.5px; font-weight:bold; margin-top:2px;">${e.name || 'Enemy'} ${isBossEnraged ? '<span style="color:var(--danger)">[ENRAGED]</span>' : ''}</div>
        ${rowTag}
        ${exhaustedBadge}
        <div class="bar-row" style="margin-top:2px; width:90%;">
          <span class="bar-track"><span class="bar-fill hp" style="width:${hpPct}%"></span></span>
        </div>
        <div class="hp-label" style="font-size:6px;">${e.hp}/${e.maxHp} HP ${ailmentTags}</div>
      </div>
    `;
  }

  function renderEnemyWing(container, state, activeChar) {
    if (!container) return;
    container.className = 'formation-grid enemy-wing';

    const enemies = state.enemies || [];
    const frontEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'FRONT' || e.row === 'BOTH' || !e.row);
    const backEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'BACK');
    const activeElement = getActiveSkillElement(state.pendingSkill);

    container.innerHTML = `
      <div class="formation-row">
        <div class="formation-row-header">🏹 HOSTILE BACK</div>
        ${backEnemies.map((item) => renderEnemyCard(item, activeElement)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:12px;">Back Clear</div>'}
      </div>
      <div class="formation-row">
        <div class="formation-row-header">⚔️ HOSTILE FRONT</div>
        ${frontEnemies.map((item) => renderEnemyCard(item, activeElement)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:12px;">Front Clear</div>'}
      </div>
    `;

    // Telemetry and Target Selection Listeners
    container.querySelectorAll('.enemy.formation-slot').forEach((el) => {
      const idx = Number.parseInt(el.dataset.idx, 10);
      const target = enemies[idx];

      el.addEventListener('mouseenter', () => {
        if (target?.alive) {
          renderActionTheater(activeChar, target, state);
        }
      });
      el.addEventListener('focus', () => {
        if (target?.alive) {
          renderActionTheater(activeChar, target, state);
        }
      });
      el.addEventListener('mouseleave', () => {
        const defaultEnemy = enemies.find((e) => e.alive);
        renderActionTheater(activeChar, defaultEnemy, state);
      });

      if (target?.alive) {
        el.classList.add('targetable');
        el.addEventListener('click', () => {
          if (state.pendingSkill) {
            emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: false });
          } else {
            emit({ type: 'ATTACK', targetIndex: idx });
          }
        });
      }
    });
  }

  // --- 3. RENDER PARTY FORMATION WING ---
  function resolvePartyBattlerUrl(c) {
    if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
      return EmberlightBattlerBaker.get({
        phenotype: c.phenotype,
        weapon: c.equipment?.weapon,
        armor: c.equipment?.armor,
      });
    }
    return null;
  }

  function renderPartyCard({ c, idx }, currentTurnEntity) {
    const isTurn = currentTurnEntity && currentTurnEntity.id === c.id;
    const curHp = c.hp !== undefined ? c.hp : (c.maxHp || 30);
    const maxHp = c.maxHp || 30;
    const curMp = c.mp !== undefined ? c.mp : (c.maxMp || 10);
    const maxMp = c.maxMp !== undefined ? c.maxMp : 10;
    const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100))) : 0;
    const mpPct = maxMp > 0 ? Math.max(0, Math.min(100, Math.round((curMp / maxMp) * 100))) : 0;
    const isExhausted = c.alive && (curHp / maxHp) <= 0.30;
    const ailmentList = (c.ailments || []).map((a) => a.id).join(',');
    const ailmentClasses = (c.ailments || []).map((a) => `has-ailment-${a.id.toLowerCase()}`).join(' ');
    const ailmentTags = (c.ailments || []).map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`).join(' ');

    const rowClass = (c.row === 'FRONT' || c.row === 'BOTH' || !c.row) ? 'row-front' : 'row-back';
    const rowTag = c.row === 'BACK' ? '<div class="backline-tag">ARCANIST BACK</div>' : '<div class="frontline-tag">VANGUARD FRONT</div>';
    const stanceClass = isExhausted ? 'exhausted' : '';
    const exhaustedBadge = isExhausted ? '<div class="exhausted-badge">⚠️ TIRED (≤30%)</div>' : '';

    const battlerUrl = resolvePartyBattlerUrl(c);
    const spriteHtml = battlerUrl
      ? `<img src="${battlerUrl}" class="battler-sprite party-battler" alt="${c.name}" />`
      : `<div class="sprite">${c.sprite || '🛡️'}</div>`;

    const mpLabel = ` • ${curMp}/${maxMp} MP`;

    return `
      <div class="character formation-slot ${rowClass} ${stanceClass} ${isTurn ? 'active-turn' : ''} ${c.alive ? '' : 'fainted'} ${ailmentClasses}" data-idx="${idx}" data-ailments="${ailmentList}" tabindex="0" style="position:relative; width:100%;">
        ${spriteHtml}
        <div style="font-size:7.5px; font-weight:bold; margin-top:2px;">${c.name || 'Hero'} <span class="char-class" style="color:var(--text-dim); font-size:6px;">Lv${c.level || 1}</span></div>
        ${rowTag}
        ${exhaustedBadge}
        <div class="bar-row" style="margin-top:2px; width:90%;">
          <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
        </div>
        <div class="bar-row" style="margin-top:1px; width:90%;">
          <span class="bar-track"><span class="hud-bar-fill mp" style="width:${mpPct}%"></span></span>
        </div>
        <div class="hp-label" style="font-size:6px; color:var(--text-dim); margin-top:1px;">${curHp}/${maxHp} HP${mpLabel} ${ailmentTags}</div>
      </div>
    `;
  }

  function renderPartyWing(container, state) {
    if (!container) return;
    container.className = 'formation-grid party-wing';

    const party = state.party || [];
    const currentTurnEntity = state.turnQueue?.[state.activeTurnIndex]?.entity || party[0];
    const frontParty = party.map((c, idx) => ({ c, idx })).filter(({ c }) => c.row === 'FRONT' || c.row === 'BOTH' || !c.row);
    const backParty = party.map((c, idx) => ({ c, idx })).filter(({ c }) => c.row === 'BACK');

    container.innerHTML = `
      <div class="formation-row">
        <div class="formation-row-header">🛡️ VANGUARD FRONT</div>
        ${frontParty.map((item) => renderPartyCard(item, currentTurnEntity)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:8px;">Empty</div>'}
      </div>
      <div class="formation-row">
        <div class="formation-row-header">✨ ARCANIST BACK</div>
        ${backParty.map((item) => renderPartyCard(item, currentTurnEntity)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:8px;">Empty</div>'}
      </div>
    `;

    if (state.phase === 'TARGETING_ALLY' || (state.pendingSkill?.targetType === 'ally') || state.pendingItem) {
      container.querySelectorAll('.character.formation-slot').forEach((el) => {
        const idx = Number.parseInt(el.dataset.idx, 10);
        const ally = party[idx];
        if (ally && (ally.alive || state.pendingItem === 'PHOENIX_EMBER')) {
          el.classList.add('targetable-ally');
          el.addEventListener('click', () => {
            if (state.pendingItem) {
              emit({ type: 'ITEM', itemId: state.pendingItem, targetIndex: idx });
            } else if (state.pendingSkill) {
              emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: true });
            } else {
              emit({ type: 'TARGET_ALLY', targetIndex: idx });
            }
          });
        }
      });
    }
  }

  // --- 4. SUBDECK RENDERERS ---
  function renderSubdeckAttack(subDeck, state) {
    const activeElement = getActiveSkillElement(state.pendingSkill);
    const enemies = (state.enemies || []).filter((e) => e.alive);
    if (enemies.length === 0) {
      subDeck.innerHTML = '<div class="subdeck-empty">All hostile targets eliminated.</div>';
      return;
    }

    const cancelBtnHtml = state.pendingSkill
      ? '<button type="button" class="cmd-btn" id="subdeck-cancel-skill-btn" style="font-size:6px; padding:2px 8px; margin-bottom:6px;">[ESC] CANCEL SPELL</button>'
      : '';

    subDeck.innerHTML = `
      <div class="subdeck-target-selector">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="subdeck-title">SELECT TARGET ENEMY:</span>
          ${cancelBtnHtml}
        </div>
        <div class="target-selector-grid">
          ${(state.enemies || []).map((enemy, idx) => {
            if (!enemy.alive) return '';
            const affinity = resolveAffinity(activeElement, enemy);
            const affTag = renderAffinityTag(affinity);
            const hpPct = enemy.maxHp > 0 ? Math.round((enemy.hp / enemy.maxHp) * 100) : 0;

            return `
              <button type="button" class="target-select-btn" data-enemy-idx="${idx}">
                <div class="target-name">[${idx + 1}] ${enemy.name} ${affTag}</div>
                <div class="target-hp-bar">
                  <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                  <span class="target-hp-num">${enemy.hp}/${enemy.maxHp} HP</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const cancelBtn = subDeck.querySelector('#subdeck-cancel-skill-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_SKILL' }));
    }

    subDeck.querySelectorAll('[data-enemy-idx]').forEach((btn) => {
      const idx = Number.parseInt(btn.dataset.enemyIdx, 10);
      btn.addEventListener('click', () => {
        if (state.pendingSkill) {
          emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: false });
        } else {
          emit({ type: 'ATTACK', targetIndex: idx });
        }
      });
    });
  }

  function collectHeroSkills(activeChar) {
    const manifest = (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {}) || {};
    const unlockedIds = activeChar?.unlockedNodes || activeChar?.unlocked || [];
    const activeSkills = [];

    if (manifest.AetherNodes) {
      unlockedIds.forEach((nodeId) => {
        const node = manifest.AetherNodes[nodeId];
        if (node?.type === 'active' && !activeSkills.some((s) => s.id === node.id)) {
          activeSkills.push(node);
        }
      });
    }

    if (activeSkills.length === 0 && manifest.SkillTrees && activeChar?.phenotype) {
      const tree = manifest.SkillTrees[activeChar.phenotype] || {};
      Object.values(tree).forEach((branch) => {
        if (Array.isArray(branch)) {
          branch.forEach((node) => {
            if (node.type === 'active' && unlockedIds.includes(node.id) && !activeSkills.some((s) => s.id === node.id)) {
              activeSkills.push(node);
            }
          });
        }
      });
    }

    if (activeSkills.length === 0) {
      if (activeChar?.phenotype === 'MAGE') {
        activeSkills.push({ id: 'mag_des_1', label: 'Flame Surge', mpCost: 5, element: 'FIRE', description: 'Unleash searing firebolt with burn chance.', subType: 'bolt', power: 12 });
      } else if (activeChar?.phenotype === 'HEALER') {
        activeSkills.push({ id: 'hea_lum_1', label: 'Soothing Light', mpCost: 4, element: 'HOLY', description: 'Restores 25 HP to target ally.', targetType: 'ally', subType: 'heal', power: 25 });
      } else {
        activeSkills.push({ id: 'war_vor_1', label: 'Cleave Strike', mpCost: 4, element: 'PHYSICAL', description: 'Heavy melee slash deal 1.5x damage.', subType: 'strike', mult: 1.5 });
      }
    }
    return activeSkills;
  }

  function renderSubdeckSkills(subDeck, state, activeChar) {
    if (state.phase === 'TARGETING_ALLY' && state.pendingSkill) {
      subDeck.innerHTML = `
        <div class="subdeck-target-selector">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="subdeck-title">SELECT ALLY TARGET:</span>
            <button type="button" class="cmd-btn" id="subdeck-cancel-ally-skill-btn" style="font-size:6px; padding:2px 8px;">[ESC] CANCEL</button>
          </div>
          <div class="target-selector-grid">
            ${(state.party || []).map((hero, idx) => {
              const hpPct = hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * 100) : 0;
              return `
                <button type="button" class="target-select-btn" data-ally-idx="${idx}" ${hero.alive ? '' : 'disabled'}>
                  <div class="target-name">[${idx + 1}] ${hero.name} (Lv${hero.level || 1})</div>
                  <div class="target-hp-bar">
                    <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                    <span class="target-hp-num">${hero.hp}/${hero.maxHp} HP</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const cancelBtn = subDeck.querySelector('#subdeck-cancel-ally-skill-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_SKILL' }));
      }

      subDeck.querySelectorAll('[data-ally-idx]').forEach((btn) => {
        const idx = Number.parseInt(btn.dataset.allyIdx, 10);
        btn.addEventListener('click', () => {
          emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: true });
        });
      });
      return;
    }

    const activeSkills = collectHeroSkills(activeChar);

    subDeck.innerHTML = `
      <div class="skills-deck-grid">
        ${activeSkills.map((node) => {
          const canAfford = (activeChar?.mp || 0) >= (node.mpCost || 0);
          const iconUrl = typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons.get(node.id) : null;
          const elemBadge = node.element ? `<span class="skill-elem-tag ${node.element.toLowerCase()}">${node.element}</span>` : '';

          return `
            <div class="skill-deck-card ${canAfford ? '' : 'disabled'}" data-skill-id="${node.id}">
              <div class="skill-card-top">
                ${iconUrl ? `<img src="${iconUrl}" class="skill-card-icon" alt="${node.label}" />` : ''}
                <div class="skill-card-info">
                  <div class="skill-card-name">${node.label} ${elemBadge}</div>
                  <div class="skill-card-cost">${node.mpCost || 0} MP</div>
                </div>
              </div>
              <div class="skill-card-desc">${node.description || 'Channel tactical arcane energy.'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    subDeck.querySelectorAll('.skill-deck-card:not(.disabled)').forEach((card) => {
      const skillId = card.dataset.skillId;
      const skillNode = activeSkills.find((s) => s.id === skillId);
      if (skillNode) {
        card.addEventListener('click', () => {
          emit({ type: 'SELECT_SKILL', skill: skillNode });
        });
      }
    });
  }

  function renderSubdeckPouch(subDeck, state) {
    if (state.pendingItem) {
      subDeck.innerHTML = `
        <div class="subdeck-target-selector">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="subdeck-title">USE ${state.pendingItem} ON ALLY:</span>
            <button type="button" class="cmd-btn" id="subdeck-cancel-item-btn" style="font-size:6px; padding:2px 8px;">[ESC] CANCEL</button>
          </div>
          <div class="target-selector-grid">
            ${(state.party || []).map((hero, idx) => {
              const isPhoenix = state.pendingItem === 'PHOENIX_EMBER';
              const canUse = isPhoenix ? !hero.alive : hero.alive;
              const hpPct = hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * 100) : 0;
              return `
                <button type="button" class="target-select-btn" data-item-target-idx="${idx}" ${canUse ? '' : 'disabled'}>
                  <div class="target-name">[${idx + 1}] ${hero.name} ${hero.alive ? '' : '(COLLAPSED)'}</div>
                  <div class="target-hp-bar">
                    <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                    <span class="target-hp-num">${hero.hp}/${hero.maxHp} HP</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const cancelBtn = subDeck.querySelector('#subdeck-cancel-item-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_ITEM' }));
      }

      subDeck.querySelectorAll('[data-item-target-idx]:not([disabled])').forEach((btn) => {
        const idx = Number.parseInt(btn.dataset.itemTargetIdx, 10);
        btn.addEventListener('click', () => {
          emit({ type: 'ITEM', itemId: state.pendingItem, targetIndex: idx });
        });
      });
      return;
    }

    const inv = state.inventory || {};
    const items = [
      { id: 'POTION', name: 'Health Potion', effect: 'Restores 30 HP to an ally', count: inv.POTION || 0 },
      { id: 'ETHER', name: 'Ether Flask', effect: 'Restores 15 MP to an ally', count: inv.ETHER || 0 },
      { id: 'PHOENIX_EMBER', name: 'Phoenix Ember', effect: 'Revives fallen ally (50% HP)', count: inv.PHOENIX_EMBER || 0 },
    ];

    subDeck.innerHTML = `
      <div class="pouch-deck-grid">
        ${items.map((item) => {
          const hasItem = item.count > 0;
          const iconUrl = typeof EmberlightIcons !== 'undefined' ? EmberlightIcons.get(item.id) : null;
          return `
            <div class="pouch-deck-card ${hasItem ? '' : 'disabled'}" data-pouch-item-id="${item.id}">
              <div class="pouch-card-top">
                ${iconUrl ? `<img src="${iconUrl}" class="pouch-card-icon" alt="${item.name}" />` : ''}
                <div class="pouch-card-info">
                  <div class="pouch-card-name">${item.name}</div>
                  <div class="pouch-card-count">x${item.count}</div>
                </div>
              </div>
              <div class="pouch-card-desc">${item.effect}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    subDeck.querySelectorAll('.pouch-deck-card:not(.disabled)').forEach((card) => {
      const itemId = card.dataset.pouchItemId;
      card.addEventListener('click', () => {
        emit({ type: 'SELECT_ITEM', itemId });
      });
    });
  }

  function renderSubdeckGuard(subDeck) {
    subDeck.innerHTML = `
      <div class="guard-confirm-pane">
        <div class="guard-icon">🛡️</div>
        <div class="guard-desc">
          <b>Tactical Defensive Stance:</b><br/>
          Reduces all incoming damage by <b>50%</b> until next turn.<br/>
          Restores <b>2 MP</b> through tactical focus.
        </div>
        <button type="button" class="cmd-btn action guard-act-btn" id="confirm-guard-btn">CONFIRM GUARD STANCE</button>
      </div>
    `;
    const gBtn = subDeck.querySelector('#confirm-guard-btn');
    if (gBtn) {
      gBtn.addEventListener('click', () => emit({ type: 'GUARD' }));
    }
  }

  // --- 5. RENDER ACTION & COMMAND HUB ---
  function renderCommandHub(state, activeChar) {
    const ribbon = getElement('command-primary-ribbon');
    const subDeck = getElement('command-sub-deck');
    const title = getElement('command-deck-title');
    const tag = getElement('command-deck-tag');
    const fleeBtn = getElement('combat-flee-btn');
    if (!ribbon || !subDeck) return;

    const selectedTab = state.selectedTab || 'ATTACK';
    if (title) title.textContent = `🎯 ${activeChar ? (activeChar.name || 'HERO').toUpperCase() : 'PARTY'} COMMAND HUB`;
    if (tag) tag.textContent = `Active: ${selectedTab}`;

    if (state.phase === 'VICTORY') {
      if (title) title.textContent = '🏆 BATTLE VICTORY — SPOILS SECURED';
      if (tag) tag.textContent = 'Victory!';
      ribbon.innerHTML = '';
      const gainedGold = state.lastGainedGold !== undefined ? state.lastGainedGold : (state.rewards?.gold || 0);
      const gainedExp = state.lastGainedExp !== undefined ? state.lastGainedExp : (state.rewards?.exp || 0);
      const survivors = (state.party || []).filter((c) => c.alive).length;

      subDeck.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; text-align:center; background:rgba(12,18,32,0.92); border:1px solid var(--ember); border-radius:4px; box-shadow:0 0 16px rgba(255,157,77,0.3);">
          <div style="font-size:13px; font-weight:bold; color:var(--ember); margin-bottom:4px; text-shadow:0 0 10px var(--shadow-ember);">⚔️ VICTORY ACHIEVED ⚔️</div>
          <div style="font-size:7.5px; color:var(--ok); margin-bottom:6px;">All hostile threats vanquished. Spoils credited to squad inventory.</div>
          <div style="display:flex; gap:12px; font-size:7px; color:var(--text); margin-bottom:10px; background:rgba(0,0,0,0.5); padding:4px 10px; border-radius:3px; border:1px solid var(--border-dim);">
            <span>💰 Gold: <b style="color:var(--ember)">+${gainedGold}G</b></span>
            <span>⭐ EXP: <b style="color:#38bdf8">+${gainedExp}</b></span>
            <span>🛡️ Squad: <b style="color:var(--ok)">${survivors}/${(state.party || []).length} Standing</b></span>
          </div>
          <button type="button" class="cmd-btn action" id="victory-continue-btn" style="padding:6px 20px; font-size:8px; cursor:pointer;">▶ CONTINUE EXPEDITION [SPACE]</button>
        </div>
      `;
      const contBtn = subDeck.querySelector('#victory-continue-btn');
      if (contBtn) {
        contBtn.onclick = (e) => {
          e.preventDefault();
          emit({ type: 'CONFIRM' });
        };
      }
      return;
    }

    if (state.phase === 'DEFEAT') {
      if (title) title.textContent = '💀 EXPEDITION DEFEAT';
      if (tag) tag.textContent = 'Defeat';
      ribbon.innerHTML = '';
      subDeck.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; text-align:center; background:rgba(20,8,12,0.92); border:1px solid var(--danger); border-radius:4px; box-shadow:0 0 16px rgba(239,68,68,0.3);">
          <div style="font-size:13px; font-weight:bold; color:var(--danger); margin-bottom:4px;">💀 PARTY HAS FALLEN 💀</div>
          <div style="font-size:7.5px; color:var(--text-dim); margin-bottom:10px;">The squad collapsed in combat.</div>
          <button type="button" class="cmd-btn" id="defeat-continue-btn" style="padding:6px 20px; font-size:8px; border-color:var(--danger); color:var(--danger); cursor:pointer;">▲ ADVANCE TO HARBOR [SPACE]</button>
        </div>
      `;
      const contBtn = subDeck.querySelector('#defeat-continue-btn');
      if (contBtn) {
        contBtn.onclick = (e) => {
          e.preventDefault();
          emit({ type: 'CONFIRM' });
        };
      }
      return;
    }

    function previewDelay(_delayCost) {
      if (!activeChar || typeof EmberlightThreatOracle === 'undefined') return;
      const forecast = EmberlightThreatOracle.calculateTimeline(state.party, state.enemies, 12);
      EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
        party: state.party,
        enemies: state.enemies,
        forecastQueue: forecast,
        bossIntent: state.enemies?.find((e) => e.isBoss && e.alive) || null,
      });
    }

    function restoreDelay() {
      if (typeof EmberlightThreatOracle === 'undefined') return;
      EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
        party: state.party,
        enemies: state.enemies,
        forecastQueue: state.forecastQueue || null,
        bossIntent: state.enemies?.find((e) => e.isBoss && e.alive) || null,
      });
    }

    // 1. Primary Action Ribbon (4 Buttons)
    const tabs = [
      { id: 'ATTACK', label: '⚔️ ATTACK [1]', cls: 'action', delayCost: 1000 / Math.max(1, activeChar?.agi || 10) },
      { id: 'SKILLS', label: '✨ SKILLS [2]', cls: 'skill', delayCost: 1100 / Math.max(1, activeChar?.agi || 10) },
      { id: 'GUARD',  label: '🛡️ GUARD [3]',  cls: '',       delayCost: 500  / Math.max(1, activeChar?.agi || 10) },
      { id: 'POUCH',  label: '🧪 POUCH [4]',  cls: 'run',    delayCost: 800  / Math.max(1, activeChar?.agi || 10) },
    ];

    ribbon.innerHTML = tabs.map((tab) => `
      <button type="button" class="cmd-btn ${tab.cls} ${selectedTab === tab.id ? 'active-tab' : ''}" data-tab-id="${tab.id}">
        ${tab.label}
      </button>
    `).join('');

    ribbon.querySelectorAll('[data-tab-id]').forEach((btn) => {
      const tabId = btn.dataset.tabId;
      const tabDef = tabs.find((t) => t.id === tabId);
      btn.addEventListener('mouseenter', () => { if (tabDef) previewDelay(tabDef.delayCost); });
      btn.addEventListener('mouseleave', () => restoreDelay());
      btn.addEventListener('click', () => {
        emit({ type: 'SELECT_TAB', tab: tabId });
      });
    });

    // 2. Render Sub-Deck Body
    subDeck.innerHTML = '';
    if (selectedTab === 'ATTACK' || state.phase === 'TARGETING_ENEMY') {
      renderSubdeckAttack(subDeck, state);
    } else if (selectedTab === 'SKILLS') {
      renderSubdeckSkills(subDeck, state, activeChar);
    } else if (selectedTab === 'POUCH') {
      renderSubdeckPouch(subDeck, state);
    } else if (selectedTab === 'GUARD') {
      renderSubdeckGuard(subDeck);
    }

    if (fleeBtn) {
      fleeBtn.onclick = () => emit({ type: 'FLEE' });
    }
  }

  // --- PUBLIC INTERFACE ---
  return {
    init(context) {
      mounted = true;
      hostContext = context;
    },

    render(state, dispatch) {
      if (!state) return;
      mounted = true;
      if (typeof dispatch === 'function') {
        actionHandler = dispatch;
      }

      const activeChar = state.turnQueue?.[state.activeTurnIndex]?.entity || state.party?.[0];
      const defaultEnemy = (state.enemies || []).find((e) => e.alive) || state.enemies?.[0];

      // 1. Biome Depth Backdrop Canvas
      const backdropCanvas = getElement('combat-backdrop-canvas');
      if (backdropCanvas && typeof EmberlightCombatBackdrop !== 'undefined' && typeof EmberlightCombatBackdrop.render === 'function') {
        EmberlightCombatBackdrop.render('combat-backdrop-canvas');
      }

      // 2. CTB Forecast Master Ribbon
      if (typeof EmberlightThreatOracle !== 'undefined' && typeof EmberlightThreatOracle.render === 'function') {
        EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
          party: state.party || [],
          enemies: state.enemies || [],
          forecastQueue: state.forecastQueue || null,
          bossIntent: (state.enemies || []).find((e) => e.isBoss && e.alive) || null,
          selectedAction: state.pendingSkill || { type: state.selectedTab || 'ATTACK' },
        });
      }

      // 3. Formations
      renderEnemyWing(getElement('enemy-row'), state, activeChar);
      renderPartyWing(getElement('party-grid'), state);

      // 4. Action Theater & Telemetry
      renderActionTheater(activeChar, defaultEnemy, state);

      // 5. Action & Command Hub
      renderCommandHub(state, activeChar);
    },

    startHarmonicChanneling(node, onComplete) {
      emit({ type: 'CHANNELING_STARTED', nodeId: node?.id || null });
      if (typeof onComplete === 'function') {
        onComplete(100);
      }
    },

    getDiagnostics() {
      return {
        driverId: 'combat_renderer',
        mounted,
      };
    },

    destroy() {
      actionHandler = null;
      mounted = false;
      hostContext = null;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightCombatRenderer = EmberlightCombatRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightCombatRenderer;
}

