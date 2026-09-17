/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROGRESSION DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-PROGRESSION-RENDERER
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
 *   [SEC-02] Manifest Compilation & Unlock Evaluation Logic
 *   [SEC-03] UI Component Builders (Roster, Filters, Cards & Grids)
 *   [SEC-04] Inspector Pane & Attunement Action Builders
 *   [SEC-05] Public VSRP-001 Tier-3 Interface Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} ProgressionActionToken
 * @property {string} type Action token type.
 * @property {string} [characterId] Target character identifier.
 * @property {string} [essence] Essence constellation key.
 * @property {string} [nodeId] Aether node identifier.
 */

/**
 * @typedef {Object} ProgressionNode
 * @property {string} id Unique node identifier.
 * @property {string} label Display label.
 * @property {string} [desc] Description text.
 * @property {string} [type] Node type ('active' | 'passive' | etc.).
 * @property {number} [spCost] Skill point cost.
 * @property {number} [mpCost] Mana point cost.
 * @property {number} [power] Power potency rating.
 * @property {boolean} [isRoot] Root node flag.
 * @property {string[]} [neighbors] Connected neighbor node IDs.
 * @property {string} [branch] Skill tree branch key.
 * @property {number} [tier] Branch progression tier.
 * @property {string} [essence] Elemental essence key.
 * @property {string} [capabilityTag] Field capability tag.
 * @property {Object.<string, number>} [statDeltas] Stat bonus increments.
 */

/**
 * @typedef {Object} ProgressionCharacter
 * @property {string} id Unique character identifier.
 * @property {string} name Character display name.
 * @property {string} [phenotype] Character class phenotype.
 * @property {string} [class] Alternate class name.
 * @property {number} [skillPoints] Unspent skill points.
 * @property {number} [unspentSP] Alternate unspent SP property.
 * @property {string[]} [unlockedNodes] Unlocked node IDs list.
 * @property {string[]} [unlocked] Alternate unlocked node IDs list.
 * @property {Object.<string, number>} [spent] Spent points per branch mapping.
 */

/**
 * @typedef {Object} ProgressionState
 * @property {ProgressionCharacter[]} [party] Party character array.
 * @property {string} [selectedCharacterId] Currently selected character ID.
 * @property {string} [selectedEssence] Currently active essence tab filter.
 * @property {string} [selectedNodeId] Currently inspected node ID.
 */

/**
 * @typedef {Object} ProgressionDiagnostics
 * @property {string} driverId Internal driver identifier string.
 */

/**
 * @typedef {Object} EvaluationContext
 * @property {string[]} unlockedList List of unlocked node IDs.
 * @property {Object.<string, ProgressionNode>} registry Compiled node registry map.
 * @property {Object} manifest Game manifest definition object.
 * @property {Object.<string, {label: string, role: string}>} essences Essence metadata mapping.
 */

const EmberlightProgressionRenderer = (() => {
	//#region [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
	/**
	 * Safely retrieves the skill trees view container element.
	 * (Pure presentation lookup utility)
	 * @returns {HTMLElement|null} View element instance or null.
	 */
	function getView() {
		return typeof document === 'undefined' ? null : document.getElementById('skill-trees');
	}

	/**
	 * Dispatches an action token via the provided dispatch callback.
	 * (Action inversion dispatcher)
	 * @param {(action: ProgressionActionToken) => void} dispatch Dispatch handler function.
	 * @param {ProgressionActionToken} action Action payload object.
	 * @returns {void}
	 */
	function emit(dispatch, action) {
		if (typeof dispatch === 'function') dispatch(action);
	}

	/**
	 * Retrieves the active game manifest definition.
	 * (Pure state-accessor utility)
	 * @returns {Record<string, any>} Manifest object.
	 */
	function getManifest() {
		return typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
	}
	//#endregion

	//#region [SEC-02] Manifest Compilation & Unlock Evaluation Logic
	/**
	 * Compiles and gathers all registry nodes for inspection view rendering.
	 * (Pure calculation utility)
	 * @param {Record<string, any>} manifest Game manifest object.
	 * @returns {Object.<string, ProgressionNode>} Compiled node registry map.
	 */
	function compileRegistry(manifest) {
		/** @type {Object.<string, ProgressionNode>} */
		const compiled = {};
		if (manifest.AetherNodes) {
			Object.entries(manifest.AetherNodes).forEach(([nodeId, rawNode]) => {
				compiled[nodeId] = { ...(/** @type {any} */ (rawNode)) };
			});
		}
		if (manifest.SkillTrees) {
			Object.entries(manifest.SkillTrees).forEach(([classKey, branches]) => {
				Object.entries(branches).forEach(([branchKey, nodes]) => {
					(/** @type {any[]} */ (nodes)).forEach((rawNode) => {
						if (!compiled[rawNode.id]) {
							compiled[rawNode.id] = { ...rawNode, branch: branchKey, classKey, spCost: rawNode.spCost || 1 };
						}
					});
				});
			});
		}
		return compiled;
	}

	/**
	 * Evaluates whether a character meets the prerequisites to unlock a node.
	 * (Pure evaluation utility)
	 * @param {ProgressionCharacter} character Character battler object.
	 * @param {ProgressionNode} node Skill or aether node definition.
	 * @param {Object.<string, ProgressionNode>} [_registry] Compiled node registry.
	 * @param {Record<string, any>} [_manifest] Game manifest object.
	 * @returns {boolean} True if the node can be unlocked.
	 */
	function evaluateCanUnlock(character, node, _registry, _manifest) {
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
	//#endregion

	//#region [SEC-03] UI Component Builders (Roster, Filters, Cards & Grids)
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

	/** @type {Record<string, string>} */
	const CAPABILITY_DESCRIPTIONS = {
		'cap:elemental.scorch': '🔥 Field Skill: Scorch (Dispels dry brush & grass for 3 MP)',
		'cap:elemental.freeze': '❄️ Field Skill: Freeze (Freezes water chasms into ice for 4 MP)',
		'cap:sanctuary.consecrate': '✨ Field Skill: Consecrate (Sets up a recovery campsite for 6 MP)',
		'cap:elemental.dispel': '💨 Field Skill: Dispel (Clears toxic miasma for 3 MP)',
	};

	/**
	 * Resolves party icons or fallback provider safely.
	 * @param {string} [phenotype] Character phenotype key.
	 * @returns {string|null} Icon data URL or null.
	 */
	function resolvePartyCrestUrl(phenotype) {
		const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
		const icons = win.EmberlightPartyIcons || win.EmberlightIcons;
		if (icons && typeof icons.get === 'function') {
			return icons.get(phenotype);
		}
		return null;
	}

	/**
	 * Renders the party character roster navigation bar.
	 * (State-mutating DOM presenter)
	 * @param {ProgressionCharacter[]} targetParty Party character array.
	 * @param {ProgressionCharacter} activeChar Currently selected active character.
	 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
	 * @returns {HTMLElement} Roster bar container element.
	 */
	function renderRosterBar(targetParty, activeChar, dispatch) {
		const rosterBar = document.createElement('div');
		rosterBar.className = 'aether-roster-bar';

		targetParty.forEach((c) => {
			const isSelected = c.id === activeChar.id;
			const cSP = c.skillPoints ?? c.unspentSP ?? 0;
			const crestUrl = resolvePartyCrestUrl(c.phenotype || c.class || 'HERO');

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
			heroTab.addEventListener('click', () => emit(dispatch, { type: 'SELECT_CHARACTER', characterId: c.id }));
			rosterBar.appendChild(heroTab);
		});
		return rosterBar;
	}

	/**
	 * Renders the essence filter bar for constellation category tabs.
	 * (State-mutating DOM presenter)
	 * @param {string} selectedEssence Currently selected essence tab key.
	 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
	 * @returns {HTMLElement} Filter bar container element.
	 */
	function renderFilterBar(selectedEssence, dispatch) {
		const filterBar = document.createElement('div');
		filterBar.className = 'aether-filter-bar';

		ESSENCE_TABS.forEach((tab) => {
			const isTabActive = selectedEssence === tab.key;
			const tabBtn = document.createElement('button');
			tabBtn.type = 'button';
			tabBtn.className = `aether-essence-tab ${isTabActive ? 'active' : ''} tab-${tab.key.toLowerCase()}`;
			tabBtn.innerHTML = `<span>${tab.icon}</span> <span>${tab.label}</span>`;
			tabBtn.addEventListener('click', () => emit(dispatch, { type: 'SELECT_ESSENCE', essence: tab.key }));
			filterBar.appendChild(tabBtn);
		});
		return filterBar;
	}

	/**
	 * Resolves the elemental essence key associated with a node.
	 * (Pure evaluation utility)
	 * @param {ProgressionNode} node Node definition object.
	 * @returns {string} Essence key string.
	 */
	function resolveNodeEssence(node) {
		if (node?.essence) return node.essence;
		if (node?.id?.startsWith('hero_')) return 'IRON';
		if (node?.id?.startsWith('mag_')) return 'EMBER';
		return 'LUMEN';
	}

	/**
	 * Determines the CSS status class for a node card.
	 * @param {boolean} isUnlocked Unlocked state flag.
	 * @param {boolean} isAvailable Available state flag.
	 * @returns {string} Status class name.
	 */
	function getNodeCardStatusClass(isUnlocked, isAvailable) {
		if (isUnlocked) return 'unlocked';
		if (isAvailable) return 'available';
		return 'locked';
	}

	/**
	 * Generates status badge HTML markup for a node card.
	 * @param {boolean} isUnlocked Unlocked state flag.
	 * @param {boolean} isAvailable Available state flag.
	 * @returns {string} HTML badge markup.
	 */
	function getNodeStatusBadge(isUnlocked, isAvailable) {
		if (isUnlocked) return '<span class="node-status-badge unlocked">✅ ATTUNED</span>';
		if (isAvailable) return '<span class="node-status-badge available">⚡ READY</span>';
		return '<span class="node-status-badge locked">🔒 LOCKED</span>';
	}

	/**
	 * Renders an individual node card button element.
	 * (State-mutating DOM presenter)
	 * @param {ProgressionNode} node Node definition object.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {ProgressionNode|null} selectedNode Currently selected node object.
	 * @param {EvaluationContext} ctx Evaluation context container.
	 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
	 * @returns {HTMLButtonElement} Node card button element.
	 */
	function renderNodeCard(node, activeChar, selectedNode, ctx, dispatch) {
		const { unlockedList, registry, manifest } = ctx;
		const isUnlocked = unlockedList.includes(node.id);
		const isAvailable = !isUnlocked && evaluateCanUnlock(activeChar, node, registry, manifest);
		const isSelected = selectedNode?.id === node.id;
		const essKey = resolveNodeEssence(node);
		const skillIcons = /** @type {any} */ (typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons : null);
		const glyphUrl = skillIcons && typeof skillIcons.get === 'function' ? skillIcons.get(node.id) : null;

		const statusClass = getNodeCardStatusClass(isUnlocked, isAvailable);
		const selectedClass = isSelected ? 'selected' : '';

		const nodeCard = document.createElement('button');
		nodeCard.type = 'button';
		nodeCard.className = `aether-node-card essence-${essKey.toLowerCase()} ${statusClass} ${selectedClass}`;

		const statusBadge = getNodeStatusBadge(isUnlocked, isAvailable);
		const costText = node.spCost ? `[${node.spCost} SP]` : '[1 SP]';
		const mpText = node.type === 'active' && node.mpCost ? `(${node.mpCost} MP)` : '';
		const capTag = node.capabilityTag ? '<span class="node-cap-tag">⚡ FIELD</span>' : '';
		const nodeType = (node.type || 'passive').toUpperCase();

		nodeCard.innerHTML = `
      <div class="node-card-top">
        ${glyphUrl ? `<img src="${glyphUrl}" class="node-glyph" alt="${node.label}" />` : '<div class="node-glyph-placeholder">✨</div>'}
        <div class="node-card-titles">
          <div class="node-card-name">${node.label} ${mpText}</div>
          <div class="node-card-sub">${nodeType} · ${costText} ${capTag}</div>
        </div>
      </div>
      <div class="node-card-desc">${node.desc || ''}</div>
      <div class="node-card-footer">
        ${statusBadge}
      </div>
    `;

		nodeCard.addEventListener('click', () => emit(dispatch, { type: 'SELECT_NODE', nodeId: node.id }));
		return nodeCard;
	}

	/**
	 * Renders the constellation matrix grid pane container.
	 * (State-mutating DOM presenter)
	 * @param {ProgressionNode[]} filteredNodes Filtered array of nodes.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {ProgressionNode|null} selectedNode Currently selected node object.
	 * @param {EvaluationContext} ctx Evaluation context container.
	 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
	 * @returns {HTMLElement} Grid pane container element.
	 */
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
	//#endregion

	//#region [SEC-04] Inspector Pane & Attunement Action Builders
	/**
	 * Builds capability notice markup if a node grants field capabilities.
	 * @param {ProgressionNode} selectedNode Selected node object.
	 * @returns {string} HTML markup string.
	 */
	function buildInspectorCapabilityNotice(selectedNode) {
		if (!selectedNode.capabilityTag) return '';
		const desc = CAPABILITY_DESCRIPTIONS[selectedNode.capabilityTag] || `⚡ Field Capability: ${selectedNode.capabilityTag}`;
		return `<div class="inspector-capability-box">${desc}</div>`;
	}

	/**
	 * Determines the precise prerequisite lock reason string for an unmeet node.
	 * @param {ProgressionNode} selectedNode Selected node object.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {Object.<string, ProgressionNode>} registry Compiled node registry.
	 * @param {number} reqSP Required SP cost.
	 * @returns {string} Explanation text.
	 */
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

	/**
	 * Builds prerequisite status banner markup for the inspector panel.
	 * @param {boolean} isUnlocked Unlocked state flag.
	 * @param {boolean} isAvailable Available state flag.
	 * @param {ProgressionNode} selectedNode Selected node object.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {Object.<string, ProgressionNode>} registry Compiled node registry.
	 * @param {number} reqSP Required SP cost.
	 * @returns {string} HTML banner markup.
	 */
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

	/**
	 * Builds the attune action button HTML markup.
	 * @param {boolean} isAvailable Available state flag.
	 * @param {boolean} isUnlocked Unlocked state flag.
	 * @param {number} reqSP Required SP cost.
	 * @returns {string} HTML button markup.
	 */
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

	/**
	 * Renders the node inspector detail card pane.
	 * (State-mutating DOM presenter)
	 * @param {ProgressionNode} selectedNode Selected node object.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {EvaluationContext} ctx Evaluation context container.
	 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
	 * @returns {HTMLElement} Inspector card element.
	 */
	function renderInspectorCard(selectedNode, activeChar, ctx, dispatch) {
		const { unlockedList, registry, manifest, essences } = ctx;
		const isUnlocked = unlockedList.includes(selectedNode.id);
		const isAvailable = !isUnlocked && evaluateCanUnlock(activeChar, selectedNode, registry, manifest);
		const essKey = resolveNodeEssence(selectedNode);
		const essInfo = essences[essKey] || { label: essKey, role: '' };
		const reqSP = selectedNode.spCost || 1;

		const glyphUrl = (typeof EmberlightSkillIcons !== 'undefined' && typeof /** @type {any} */ (EmberlightSkillIcons).get === 'function')
			? /** @type {any} */ (EmberlightSkillIcons).get(selectedNode.id)
			: null;
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
		const selectedNodeType = (selectedNode.type || 'passive').toUpperCase();

		inspectorCard.innerHTML = `
      <div class="inspector-header">
        ${glyphUrl ? `<img src="${glyphUrl}" class="inspector-glyph" alt="${selectedNode.label}" />` : '<div class="inspector-glyph-placeholder">✨</div>'}
        <div class="inspector-titles">
          <div class="inspector-name">${selectedNode.label}</div>
          <div class="inspector-essence-tag ${essKey.toLowerCase()}">${essKey} · ${selectedNodeType}</div>
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
			/** @type {HTMLElement} */
			const htmlAttuneBtn = /** @type {HTMLElement} */ (attuneBtn);
			htmlAttuneBtn.addEventListener('click', () => emit(dispatch, {
				type: 'UNLOCK_NODE',
				characterId: activeChar.id,
				nodeId: selectedNode.id,
			}));
		}

		const respecBtn = inspectorCard.querySelector('#aether-respec-action');
		if (respecBtn) {
			/** @type {HTMLElement} */
			const htmlRespecBtn = /** @type {HTMLElement} */ (respecBtn);
			htmlRespecBtn.addEventListener('click', () => emit(dispatch, {
				type: 'RESPEC_CHARACTER',
				characterId: activeChar.id,
			}));
		}

		return inspectorCard;
	}

	/**
	 * Determines the initial default selected node ID upon loading or switching filters.
	 * (Pure evaluation utility)
	 * @param {ProgressionNode[]} filteredNodes Filtered node array.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {string[]} unlockedList Unlocked node ID list.
	 * @param {Object.<string, ProgressionNode>} registry Compiled node registry.
	 * @param {Object} manifest Game manifest object.
	 * @returns {string} Selected node identifier.
	 */
	function buildInitialSelectedNodeId(filteredNodes, activeChar, unlockedList, registry, manifest) {
		const firstAvailable = filteredNodes.find((n) => evaluateCanUnlock(activeChar, n, registry, manifest));
		if (firstAvailable) return firstAvailable.id;
		const firstUnlocked = filteredNodes.find((n) => unlockedList.includes(n.id));
		if (firstUnlocked) return firstUnlocked.id;
		return filteredNodes[0]?.id || 'iron_root';
	}
	//#endregion

	//#region [SEC-05] Public VSRP-001 Tier-3 Interface Gateway
	return {
		/**
		 * Renders the skill tree progression matrix and inspection UI.
		 * (State-mutating DOM presenter)
		 * @param {ProgressionState} state Active progression state snapshot.
		 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
		 * @returns {void}
		 */
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

		/**
		 * Returns diagnostic telemetry for the progression renderer.
		 * (Pure telemetry collector)
		 * @returns {ProgressionDiagnostics} Diagnostic telemetry object.
		 */
		getDiagnostics() {
			return { driverId: 'progression_renderer' };
		},

		/**
		 * Purges presentation allocations.
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() { },
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightProgressionRenderer = EmberlightProgressionRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightProgressionRenderer;
}