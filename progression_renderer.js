/* =========================================================================
   PERIPHERAL DRIVER: PROGRESSION DOM PRESENTATION RENDERER
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-PROGRESSION-RENDERER
   Protocol Version:    VSRP-001
   Classification:      Peripheral Capability Driver & DOM Projection Engine
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightProgressionRenderer = (() => {
  'use strict';

  function getView() {
    return typeof document === 'undefined' ? null : document.getElementById('skill-trees');
  }

  function emit(dispatch, action) {
    if (typeof dispatch === 'function') dispatch(action);
  }

  function getManifest() {
    return typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
  }

  // Helper to compile/gather all registry nodes for inspection view rendering
  function compileRegistry(manifest) {
    const compiled = {};
    if (manifest.AetherNodes) {
      Object.entries(manifest.AetherNodes).forEach(([nodeId, rawNode]) => {
        compiled[nodeId] = { ...rawNode };
      });
    }
    if (manifest.SkillTrees) {
      Object.entries(manifest.SkillTrees).forEach(([classKey, branches]) => {
        Object.entries(branches).forEach(([branchKey, nodes]) => {
          nodes.forEach((rawNode) => {
            if (!compiled[rawNode.id]) {
              compiled[rawNode.id] = { ...rawNode, branch: branchKey, classKey, spCost: rawNode.spCost || 1 };
            }
          });
        });
      });
    }
    return compiled;
  }

  function evaluateCanUnlock(character, node, registry, manifest) {
    if (!character || !node) return false;
    const unlockedList = character.unlockedNodes || character.unlocked || [];
    if (unlockedList.includes(node.id)) return false;

    const availableSP = Math.max(character.skillPoints ?? 0, character.unspentSP ?? 0);
    const requiredSP = node.spCost || 1;
    if (availableSP < requiredSP) return false;

    if (node.isRoot) return true;

    if (Array.isArray(node.neighbors) && node.neighbors.length > 0) {
      const unlockedSet = new Set(unlockedList);
      return node.neighbors.some((neighborId) => unlockedSet.has(neighborId));
    }

    if (node.branch && node.tier) {
      const spent = character?.spent?.[node.branch] || 0;
      return spent >= (node.tier - 1);
    }

    return false;
  }

  const DEFAULT_ESSENCES = {
    IRON: { label: 'Iron', role: 'Vanguard, Defense & Blade Prowess' },
    EMBER: { label: 'Ember', role: 'Destruction, Fire Magic & Scorch' },
    TIDE: { label: 'Tide', role: 'Flow, Frost Magic & Water Freezing' },
    LUMEN: { label: 'Lumen', role: 'Sanctuary, Holy Recovery & Wards' },
    UMBRA: { label: 'Umbra', role: 'Shadow, Precision & Critical Strikes' },
  };

  const ESSENCE_TABS = [
    { key: 'ALL', label: 'ALL CONSTELLATIONS', icon: '🌌' },
    { key: 'IRON', label: 'IRON (Vanguard)', icon: '🛡️' },
    { key: 'EMBER', label: 'EMBER (Fire)', icon: '🔥' },
    { key: 'TIDE', label: 'TIDE (Frost)', icon: '❄️' },
    { key: 'LUMEN', label: 'LUMEN (Sanctuary)', icon: '✨' },
    { key: 'UMBRA', label: 'UMBRA (Shadow)', icon: '🌑' },
  ];

  const CAPABILITY_DESCRIPTIONS = {
    'cap:elemental.scorch': '🔥 Field Skill: Scorch (Dispels dry brush & grass for 3 MP)',
    'cap:elemental.freeze': '❄️ Field Skill: Freeze (Freezes water chasms into ice for 4 MP)',
    'cap:sanctuary.consecrate': '✨ Field Skill: Consecrate (Sets up a recovery campsite for 6 MP)',
    'cap:elemental.dispel': '💨 Field Skill: Dispel (Clears toxic miasma for 3 MP)',
  };

  function renderRosterBar(targetParty, activeChar, dispatch) {
    const rosterBar = document.createElement('div');
    rosterBar.className = 'aether-roster-bar';

    targetParty.forEach((c) => {
      const isSelected = c.id === activeChar.id;
      const cSP = c.skillPoints ?? c.unspentSP ?? 0;
      const crestUrl = typeof EmberlightPartyIcons !== 'undefined' ? EmberlightPartyIcons.get(c.phenotype) : null;

      const heroTab = document.createElement('button');
      heroTab.type = 'button';
      heroTab.className = `aether-hero-tab ${isSelected ? 'active' : ''}`;
      heroTab.innerHTML = `
        ${crestUrl ? `<img src="${crestUrl}" class="hero-tab-crest" alt="${c.name}" />` : ''}
        <div class="hero-tab-info">
          <div class="hero-tab-name">
            <span>${c.name}</span>
            <span class="hero-tab-class">(${c.phenotype || c.class})</span>
          </div>
          <div class="hero-tab-sp ${cSP > 0 ? 'has-sp' : ''}">✨ SP: ${cSP}</div>
        </div>
      `;
      heroTab.onclick = () => emit(dispatch, { type: 'SELECT_CHARACTER', characterId: c.id });
      rosterBar.appendChild(heroTab);
    });
    return rosterBar;
  }

  function renderFilterBar(selectedEssence, dispatch) {
    const filterBar = document.createElement('div');
    filterBar.className = 'aether-filter-bar';

    ESSENCE_TABS.forEach((tab) => {
      const isTabActive = selectedEssence === tab.key;
      const tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = `aether-essence-tab ${isTabActive ? 'active' : ''} tab-${tab.key.toLowerCase()}`;
      tabBtn.innerHTML = `<span>${tab.icon}</span> <span>${tab.label}</span>`;
      tabBtn.onclick = () => emit(dispatch, { type: 'SELECT_ESSENCE', essence: tab.key });
      filterBar.appendChild(tabBtn);
    });
    return filterBar;
  }

  function resolveNodeEssence(node) {
    if (node?.essence) return node.essence;
    if (node?.id?.startsWith('hero_')) return 'IRON';
    if (node?.id?.startsWith('mag_')) return 'EMBER';
    return 'LUMEN';
  }

  function getNodeCardStatusClass(isUnlocked, isAvailable) {
    if (isUnlocked) return 'unlocked';
    if (isAvailable) return 'available';
    return 'locked';
  }

  function getNodeStatusBadge(isUnlocked, isAvailable) {
    if (isUnlocked) return '<span class="node-status-badge unlocked">✅ ATTUNED</span>';
    if (isAvailable) return '<span class="node-status-badge available">⚡ READY</span>';
    return '<span class="node-status-badge locked">🔒 LOCKED</span>';
  }

  function renderNodeCard(node, activeChar, selectedNode, ctx, dispatch) {
    const { unlockedList, registry, manifest } = ctx;
    const isUnlocked = unlockedList.includes(node.id);
    const isAvailable = !isUnlocked && evaluateCanUnlock(activeChar, node, registry, manifest);
    const isSelected = selectedNode && selectedNode.id === node.id;
    const essKey = resolveNodeEssence(node);
    const glyphUrl = typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons.get(node.id) : null;

    const statusClass = getNodeCardStatusClass(isUnlocked, isAvailable);
    const selectedClass = isSelected ? 'selected' : '';

    const nodeCard = document.createElement('button');
    nodeCard.type = 'button';
    nodeCard.className = `aether-node-card essence-${essKey.toLowerCase()} ${statusClass} ${selectedClass}`;

    const statusBadge = getNodeStatusBadge(isUnlocked, isAvailable);
    const costText = node.spCost ? `[${node.spCost} SP]` : '[1 SP]';
    const mpText = node.type === 'active' && node.mpCost ? `(${node.mpCost} MP)` : '';
    const capTag = node.capabilityTag ? '<span class="node-cap-tag">⚡ FIELD</span>' : '';

    nodeCard.innerHTML = `
      <div class="node-card-top">
        ${glyphUrl ? `<img src="${glyphUrl}" class="node-glyph" alt="${node.label}" />` : '<div class="node-glyph-placeholder">✨</div>'}
        <div class="node-card-titles">
          <div class="node-card-name">${node.label} ${mpText}</div>
          <div class="node-card-sub">${node.type.toUpperCase()} · ${costText} ${capTag}</div>
        </div>
      </div>
      <div class="node-card-desc">${node.desc || ''}</div>
      <div class="node-card-footer">
        ${statusBadge}
      </div>
    `;

    nodeCard.onclick = () => emit(dispatch, { type: 'SELECT_NODE', nodeId: node.id });
    return nodeCard;
  }

  function renderGridPane(filteredNodes, activeChar, selectedNode, ctx, dispatch) {
    const gridPane = document.createElement('div');
    gridPane.className = 'aether-grid-pane';

    const gridHeader = document.createElement('div');
    gridHeader.className = 'aether-grid-header';
    gridHeader.innerHTML = `
      <span>CONSTELLATION MATRIX (${filteredNodes.length} NODES)</span>
      <span style="color:var(--text-dim); font-size:6px;">Select any node to inspect & attune</span>
    `;
    gridPane.appendChild(gridHeader);

    const nodesGrid = document.createElement('div');
    nodesGrid.className = 'aether-nodes-grid';

    filteredNodes.forEach((node) => {
      const card = renderNodeCard(node, activeChar, selectedNode, ctx, dispatch);
      nodesGrid.appendChild(card);
    });

    gridPane.appendChild(nodesGrid);
    return gridPane;
  }

  function buildInspectorCapabilityNotice(selectedNode) {
    if (!selectedNode.capabilityTag) return '';
    const desc = CAPABILITY_DESCRIPTIONS[selectedNode.capabilityTag] || `⚡ Field Capability: ${selectedNode.capabilityTag}`;
    return `<div class="inspector-capability-box">${desc}</div>`;
  }

  function buildInspectorLockReason(selectedNode, activeChar, registry, reqSP) {
    const spVal = activeChar.skillPoints ?? activeChar.unspentSP ?? 0;
    if (spVal < reqSP) {
      return `Insufficient SP (Requires <b>${reqSP} SP</b>; ${activeChar.name} has <b>${spVal} SP</b>).`;
    }
    if (Array.isArray(selectedNode.neighbors) && selectedNode.neighbors.length > 0) {
      const neighborLabels = selectedNode.neighbors
        .map((nId) => registry[nId]?.label || nId)
        .join(' or ');
      return `Must be connected to an unlocked adjacent node: <i>${neighborLabels}</i>.`;
    }
    if (selectedNode.branch && selectedNode.tier) {
      return `Requires ${selectedNode.tier - 1} points previously spent in ${selectedNode.branch}.`;
    }
    return 'Prerequisites not yet unlocked.';
  }

  function buildInspectorPrereqNotice(isUnlocked, isAvailable, selectedNode, activeChar, registry, reqSP) {
    if (isUnlocked) {
      return `<div class="prereq-status ok">✅ <b>ATTUNED:</b> This node's power is actively bound to ${activeChar.name}.</div>`;
    }
    if (isAvailable) {
      return `<div class="prereq-status ready">⚡ <b>ELIGIBLE:</b> Prerequisites met! Attune to unlock bonuses for <b>${reqSP} SP</b>.</div>`;
    }
    const reason = buildInspectorLockReason(selectedNode, activeChar, registry, reqSP);
    return `<div class="prereq-status locked">🔒 <b>LOCKED:</b> ${reason}</div>`;
  }

  function buildInspectorAttuneButton(isAvailable, isUnlocked, reqSP) {
    if (isAvailable) {
      return `
        <button type="button" class="aether-attune-btn eligible" id="aether-attune-action">
          ✨ ATTUNE NODE (-${reqSP} SP)
        </button>
      `;
    }
    if (isUnlocked) {
      return `
        <button type="button" class="aether-attune-btn already-attuned" disabled>
          ✅ NODE ATTUNED
        </button>
      `;
    }
    return `
      <button type="button" class="aether-attune-btn locked" disabled>
        🔒 LOCKED (PREREQUISITES UNMET)
      </button>
    `;
  }

  function renderInspectorCard(selectedNode, activeChar, ctx, dispatch) {
    const { unlockedList, registry, manifest, essences } = ctx;
    const isUnlocked = unlockedList.includes(selectedNode.id);
    const isAvailable = !isUnlocked && evaluateCanUnlock(activeChar, selectedNode, registry, manifest);
    const essKey = resolveNodeEssence(selectedNode);
    const essInfo = essences[essKey] || { label: essKey, role: '' };
    const reqSP = selectedNode.spCost || 1;

    const glyphUrl = typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons.get(selectedNode.id) : null;
    const inspectorCard = document.createElement('div');
    inspectorCard.className = `aether-inspector-card essence-${essKey.toLowerCase()}`;

    const statChips = selectedNode.statDeltas
      ? Object.entries(selectedNode.statDeltas)
          .map(([stat, val]) => `<span class="stat-chip">+${val} ${stat.toUpperCase()}</span>`)
          .join(' ')
      : '';

    const capabilityNotice = buildInspectorCapabilityNotice(selectedNode);
    const prereqNotice = buildInspectorPrereqNotice(isUnlocked, isAvailable, selectedNode, activeChar, registry, reqSP);
    const attuneBtnHtml = buildInspectorAttuneButton(isAvailable, isUnlocked, reqSP);

    inspectorCard.innerHTML = `
      <div class="inspector-header">
        ${glyphUrl ? `<img src="${glyphUrl}" class="inspector-glyph" alt="${selectedNode.label}" />` : '<div class="inspector-glyph-placeholder">✨</div>'}
        <div class="inspector-titles">
          <div class="inspector-name">${selectedNode.label}</div>
          <div class="inspector-essence-tag ${essKey.toLowerCase()}">${essKey} · ${selectedNode.type.toUpperCase()}</div>
        </div>
      </div>

      <div class="inspector-body">
        <div class="inspector-desc">${selectedNode.desc || 'Aether matrix resonance node.'}</div>
        
        ${statChips ? `<div class="inspector-stats-row">${statChips}</div>` : ''}
        ${capabilityNotice}
        ${prereqNotice}

        <div class="inspector-details-table">
          <div class="detail-row">
            <span class="detail-label">Skill Point Cost:</span>
            <span class="detail-val" style="color:#60a5fa; font-weight:bold;">${reqSP} SP</span>
          </div>
          ${selectedNode.mpCost ? `
            <div class="detail-row">
              <span class="detail-label">Mana Cost:</span>
              <span class="detail-val" style="color:var(--mp); font-weight:bold;">${selectedNode.mpCost} MP</span>
            </div>
          ` : ''}
          ${selectedNode.power ? `
            <div class="detail-row">
              <span class="detail-label">Potency / Power:</span>
              <span class="detail-val" style="color:var(--ember); font-weight:bold;">Power ${selectedNode.power}</span>
            </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Essence Resonance:</span>
            <span class="detail-val">${essInfo.label} (${essInfo.role})</span>
          </div>
        </div>
      </div>

      <div class="inspector-actions">
        ${attuneBtnHtml}
        <button type="button" class="aether-respec-btn" id="aether-respec-action" title="Refund all spent skill points on this character">
          ⚡ RESPEC ${activeChar.name.toUpperCase()} (REFUND SP)
        </button>
      </div>
    `;

    const attuneBtn = inspectorCard.querySelector('#aether-attune-action');
    if (attuneBtn) {
      attuneBtn.onclick = () => emit(dispatch, {
        type: 'UNLOCK_NODE',
        characterId: activeChar.id,
        nodeId: selectedNode.id,
      });
    }

    const respecBtn = inspectorCard.querySelector('#aether-respec-action');
    if (respecBtn) {
      respecBtn.onclick = () => emit(dispatch, {
        type: 'RESPEC_CHARACTER',
        characterId: activeChar.id,
      });
    }

    return inspectorCard;
  }

  function buildInitialSelectedNodeId(filteredNodes, activeChar, unlockedList, registry, manifest) {
    const firstAvailable = filteredNodes.find((n) => evaluateCanUnlock(activeChar, n, registry, manifest));
    if (firstAvailable) return firstAvailable.id;
    const firstUnlocked = filteredNodes.find((n) => unlockedList.includes(n.id));
    if (firstUnlocked) return firstUnlocked.id;
    return filteredNodes[0]?.id || 'iron_root';
  }

  return {
    renderProgression(state, dispatch) {
      const view = getView();
      if (!view || !state) return;
      view.innerHTML = '';

      const targetParty = state.party || [];
      if (targetParty.length === 0) {
        view.innerHTML = '<div style="color:var(--text-dim); font-size:7px; padding:12px; text-align:center;">No active party members loaded in progression matrix.</div>';
        return;
      }

      if (!state.selectedCharacterId || !targetParty.some((c) => c.id === state.selectedCharacterId)) {
        state.selectedCharacterId = targetParty[0].id;
      }
      if (!state.selectedEssence) {
        state.selectedEssence = 'ALL';
      }

      const activeChar = targetParty.find((c) => c.id === state.selectedCharacterId) || targetParty[0];
      const manifest = getManifest();
      const registry = compileRegistry(manifest);
      const essences = manifest.AetherEssences || DEFAULT_ESSENCES;

      const unlockedList = activeChar.unlockedNodes || activeChar.unlocked || [];

      const registeredNodes = Object.values(registry);
      const filteredNodes = registeredNodes.filter((node) => {
        if (state.selectedEssence === 'ALL') return true;
        return resolveNodeEssence(node) === state.selectedEssence;
      });

      if (!state.selectedNodeId || !registry[state.selectedNodeId]) {
        state.selectedNodeId = buildInitialSelectedNodeId(filteredNodes, activeChar, unlockedList, registry, manifest);
      }

      const selectedNode = registry[state.selectedNodeId] || filteredNodes[0] || null;
      const ctx = { unlockedList, registry, manifest, essences };

      const wrapper = document.createElement('div');
      wrapper.className = 'aether-matrix-container';

      wrapper.appendChild(renderRosterBar(targetParty, activeChar, dispatch));
      wrapper.appendChild(renderFilterBar(state.selectedEssence, dispatch));

      const mainStage = document.createElement('div');
      mainStage.className = 'aether-main-stage';

      mainStage.appendChild(renderGridPane(filteredNodes, activeChar, selectedNode, ctx, dispatch));

      const inspectorPane = document.createElement('div');
      inspectorPane.className = 'aether-inspector-pane';
      if (selectedNode) {
        inspectorPane.appendChild(renderInspectorCard(selectedNode, activeChar, ctx, dispatch));
      }
      mainStage.appendChild(inspectorPane);

      wrapper.appendChild(mainStage);
      view.appendChild(wrapper);
    },

    getDiagnostics() {
      return { driverId: 'progression_renderer' };
    },

    destroy() {},
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightProgressionRenderer = EmberlightProgressionRenderer;
}
