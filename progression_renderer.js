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
 * @property {string} [classKey] Class identifier.
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
 * @property {string} [selectedEssence] Active essence filter.
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

	// Module-level viewport and interaction state
	let astrolabeViewportState = {
		panX: 0,
		panY: 0,
		zoom: 0.85,
		isDragging: false,
		dragStartX: 0,
		dragStartY: 0,
		dragStartPanX: 0,
		dragStartPanY: 0,
		initialized: false,
		lastEssence: 'ALL',
		viewMode: 'astrolabe' // 'astrolabe' | 'codex'
	};

	/**
	 * Canonical astronomical coordinates for all 77 celestial nodes
	 * mapped in an organic 1400x900 pentagonal zodiac starfield.
	 * @type {Record<string, { x: number, y: number }>}
	 */
	const CANONICAL_STAR_COORDINATES = {
		// === IRON CONSTELLATION (The Vanguard Bulwark & Blade Asterism) ===
		iron_root: { x: 360, y: 280 },
		iron_cleave: { x: 480, y: 220 },
		iron_sunder: { x: 590, y: 170 },
		iron_bru_3: { x: 700, y: 110 },
		iron_guard_1: { x: 230, y: 240 },
		iron_hp_1: { x: 310, y: 350 },
		iron_def_1: { x: 440, y: 340 },
		hero_res_1: { x: 240, y: 150 },
		hero_res_2: { x: 170, y: 100 },
		hero_res_3: { x: 100, y: 60 },
		hero_bla_1: { x: 360, y: 170 },
		hero_bla_2: { x: 410, y: 100 },
		hero_bla_3: { x: 480, y: 50 },
		war_tac_1: { x: 140, y: 200 },
		war_tac_2: { x: 80, y: 250 },
		war_tac_3: { x: 50, y: 330 },
		war_cry_1: { x: 200, y: 340 },
		war_cry_2: { x: 140, y: 410 },
		war_cry_3: { x: 80, y: 480 },
		war_bru_1: { x: 530, y: 290 },
		war_bru_2: { x: 620, y: 330 },
		war_bru_3: { x: 700, y: 380 },

		// === EMBER CONSTELLATION (The Pyre Phoenix & Sunfire Comet) ===
		ember_root: { x: 1020, y: 300 },
		ember_bolt_1: { x: 880, y: 230 },
		ember_burn_1: { x: 1150, y: 310 },
		ember_crit_1: { x: 1030, y: 180 },
		ember_burst: { x: 1160, y: 190 },
		ember_catalyst: { x: 1270, y: 340 },
		ember_des_3: { x: 1280, y: 120 },
		mag_des_1: { x: 880, y: 120 },
		mag_des_2: { x: 990, y: 80 },
		mag_des_3: { x: 1110, y: 60 },
		mag_ele_1: { x: 1230, y: 230 },
		mag_ele_2: { x: 1330, y: 220 },
		mag_ele_3: { x: 1350, y: 140 },
		mag_pri_1: { x: 1140, y: 390 },
		mag_pri_2: { x: 1220, y: 410 },
		mag_pri_3: { x: 1320, y: 430 },

		// === TIDE CONSTELLATION (The Crystalline River & Glacial Spire) ===
		tide_root: { x: 1080, y: 660 },
		tide_frost_1: { x: 1170, y: 560 },
		tide_haste_1: { x: 1180, y: 770 },
		tide_def_1: { x: 970, y: 750 },
		tide_blizzard: { x: 1280, y: 640 },
		tide_chronos: { x: 1260, y: 790 },
		tide_freeze_3: { x: 1350, y: 710 },
		mag_arc_1: { x: 1000, y: 560 },
		mag_arc_2: { x: 920, y: 510 },
		mag_arc_3: { x: 850, y: 470 },

		// === UMBRA CONSTELLATION (The Eclipse Crescent & Obsidian Fang) ===
		umbra_root: { x: 700, y: 750 },
		umbra_strike_1: { x: 810, y: 770 },
		umbra_toxin_1: { x: 590, y: 770 },
		umbra_gale_1: { x: 700, y: 850 },
		umbra_dispel: { x: 500, y: 740 },
		umbra_assassinate: { x: 900, y: 830 },

		// === LUMEN CONSTELLATION (The Dawn Chalice & Solstice Crown) ===
		lumen_root: { x: 340, y: 660 },
		lumen_heal_1: { x: 450, y: 720 },
		lumen_smite_1: { x: 430, y: 560 },
		lumen_ward_1: { x: 240, y: 610 },
		lumen_sanctuary: { x: 220, y: 730 },
		lumen_res_3: { x: 130, y: 780 },
		lumen_judg_3: { x: 520, y: 500 },
		hero_lig_1: { x: 510, y: 620 },
		hero_lig_2: { x: 590, y: 610 },
		hero_lig_3: { x: 670, y: 590 },
		hea_res_1: { x: 350, y: 760 },
		hea_res_2: { x: 330, y: 830 },
		hea_res_3: { x: 290, y: 875 },
		hea_san_1: { x: 170, y: 650 },
		hea_san_2: { x: 110, y: 680 },
		hea_san_3: { x: 50, y: 710 },
		hea_smi_1: { x: 350, y: 530 },
		hea_smi_2: { x: 270, y: 490 },
		hea_smi_3: { x: 200, y: 470 },

		// === THE CELESTIAL PENTAGONAL ZODIAC BRIDGES ===
		ember_bridge_1: { x: 790, y: 160 },
		tide_bridge_1: { x: 1250, y: 490 },
		umbra_bridge_1: { x: 1020, y: 740 },
		lumen_bridge_1: { x: 450, y: 780 }
	};

	/**
	 * Resolves astronomical coordinates for any node, with deterministic fallback.
	 * @param {ProgressionNode} node
	 * @returns {{ x: number, y: number }}
	 */
	function getStarCoordinates(node) {
		if (CANONICAL_STAR_COORDINATES[node.id]) {
			return CANONICAL_STAR_COORDINATES[node.id];
		}
		const ess = resolveNodeEssence(node);
		/** @type {Record<string, { x: number, y: number }>} */
		const clusterCenters = {
			IRON: { x: 360, y: 260 },
			EMBER: { x: 1040, y: 260 },
			TIDE: { x: 1080, y: 640 },
			UMBRA: { x: 700, y: 750 },
			LUMEN: { x: 340, y: 640 }
		};
		const center = clusterCenters[ess] || { x: 700, y: 450 };
		const seed = (node.id.split('').reduce((acc, c) => acc + (c.codePointAt(0) || 0), 0) * 19) % 360;
		const rad = (seed * Math.PI) / 180;
		const dist = 75 + ((node.id.length * 11) % 80);
		return {
			x: Math.round(center.x + Math.cos(rad) * dist),
			y: Math.round(center.y + Math.sin(rad) * dist)
		};
	}

	/**
	 * @typedef {{ key: string, aId: string, bId: string, aNode: ProgressionNode, bNode: ProgressionNode, ax: number, ay: number, bx: number, by: number }} LeylineEdge
	 */

	/**
	 * Gathers all unique resonant leylines connecting constellation stars.
	 * @param {ProgressionNode[]} nodesList
	 * @param {Object.<string, ProgressionNode>} registry
	 * @returns {LeylineEdge[]}
	 */
	function collectConstellationLeylines(nodesList, registry) {
		/** @type {LeylineEdge[]} */
		const edges = [];
		const seen = new Set();

		/**
		 * @param {string} aId
		 * @param {string} bId
		 */
		function addEdge(aId, bId) {
			if (!aId || !bId || aId === bId) return;
			const key = aId < bId ? `${aId}::${bId}` : `${bId}::${aId}`;
			if (seen.has(key)) return;
			const aNode = registry[aId];
			const bNode = registry[bId];
			if (!aNode || !bNode) return;
			const aPos = getStarCoordinates(aNode);
			const bPos = getStarCoordinates(bNode);
			seen.add(key);
			edges.push({
				key,
				aId,
				bId,
				aNode,
				bNode,
				ax: aPos.x,
				ay: aPos.y,
				bx: bPos.x,
				by: bPos.y
			});
		}

		nodesList.forEach((n) => {
			if (Array.isArray(n.neighbors)) {
				n.neighbors.forEach((neighborId) => {
					if (registry[neighborId]) addEdge(n.id, neighborId);
				});
			}
			if (n.branch && typeof n.tier === 'number') {
				if (n.tier > 1) {
					const prevTier = n.tier - 1;
					const prevNode = Object.values(registry).find(
						(candidate) => candidate.branch === n.branch && candidate.tier === prevTier
					);
					if (prevNode) addEdge(n.id, prevNode.id);
				} else if (n.tier === 1) {
					/** @type {Record<string, string>} */
					const rootAnchorMap = {
						RESOLVE: 'iron_root',
						BLADE_ARTS: 'iron_cleave',
						LIGHT_FRAGMENTS: 'lumen_smite_1',
						TACTICAL_DEFENSE: 'iron_guard_1',
						WAR_CRY: 'iron_hp_1',
						BRUTAL_FORCE: 'iron_def_1',
						DESTRUCTION: 'ember_bolt_1',
						ELEMENTALISM: 'ember_burst',
						PRIMAL_SURGE: 'ember_burn_1',
						ARCANE_FOCUS: 'tide_root',
						RESTORATION: 'lumen_heal_1',
						SANCTUARY: 'lumen_ward_1',
						SMITING: 'lumen_smite_1'
					};
					const anchorId = rootAnchorMap[n.branch];
					if (anchorId && registry[anchorId]) addEdge(n.id, anchorId);
				}
			}
		});

		return edges;
	}

	/**
	 * Resolves the elemental essence key associated with a node.
	 * (Pure evaluation utility)
	 * @param {ProgressionNode} node Node definition object.
	 * @returns {string} Essence key string.
	 */
	function resolveNodeEssence(node) {
		if (node?.essence) return node.essence;
		if (node?.classKey === 'WARRIOR' || node?.id?.startsWith('war_')) return 'IRON';
		if (node?.classKey === 'HERO' || node?.id?.startsWith('hero_')) {
			if (node?.branch === 'LIGHT_FRAGMENTS' || node?.id?.startsWith('hero_lig_')) return 'LUMEN';
			return 'IRON';
		}
		if (node?.classKey === 'MAGE' || node?.id?.startsWith('mag_')) {
			if (node?.branch === 'ARCANE_FOCUS' || node?.id?.startsWith('mag_arc_')) return 'TIDE';
			return 'EMBER';
		}
		if (node?.classKey === 'HEALER' || node?.id?.startsWith('hea_')) return 'LUMEN';
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
	 * Computes celestial astronomical coordinate string for a node.
	 * @param {ProgressionNode} node
	 * @returns {string} Coordinate label.
	 */
	function buildNodeCoordTag(node) {
		const decVal = Math.abs(((node.id.length * 17 + 11) % 75));
		const code = node.id.codePointAt(0) || 0;
		const raVal = ((code * 7 + node.id.length * 5) % 24);
		return `RA ${raVal.toString().padStart(2, '0')}h · DEC +${decVal}°`;
	}

	/**
	 * Builds compact stat delta markup for node cards.
	 * @param {ProgressionNode} node
	 * @returns {string} Stat delta pills markup.
	 */
	function buildNodeCardStatSummary(node) {
		if (!node.statDeltas) return '';
		return Object.entries(node.statDeltas)
			.map(([s, v]) => `<span class="node-micro-stat">+${v} ${s.toUpperCase()}</span>`)
			.join(' ');
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
		const coordText = buildNodeCoordTag(node);
		const statSummary = buildNodeCardStatSummary(node);
		const neighborCount = Array.isArray(node.neighbors) ? node.neighbors.length : 0;

		nodeCard.innerHTML = `
      <div class="node-card-top">
        ${glyphUrl ? `<img src="${glyphUrl}" class="node-glyph" alt="${node.label}" />` : '<div class="node-glyph-placeholder">✨</div>'}
        <div class="node-card-titles">
          <div class="node-card-name">${node.label} ${mpText}</div>
          <div class="node-card-sub">${nodeType} · ${costText} ${capTag}</div>
        </div>
      </div>
      <div class="node-card-coords">
        <span>${coordText}</span>
        <span class="node-leyline-tag" title="${neighborCount} connected celestial leylines">☊ ${neighborCount}</span>
      </div>
      <div class="node-card-desc">${node.desc || ''}</div>
      ${statSummary ? `<div class="node-card-stats-preview">${statSummary}</div>` : ''}
      <div class="node-card-footer">
        ${statusBadge}
      </div>
    `;

		nodeCard.addEventListener('click', () => emit(dispatch, { type: 'SELECT_NODE', nodeId: node.id }));
		return nodeCard;
	}

	/**
	 * Generates deterministic background cosmic stardust points.
	 * @returns {string} SVG circle tags markup string.
	 */
	function buildBackgroundStardustMarkup() {
		const points = [];
		for (let i = 0; i < 72; i++) {
			const x = (i * 197 + 43) % 1360 + 20;
			const y = (i * 269 + 71) % 860 + 20;
			let r = 0.8;
			if (i % 5 === 0) {
				r = 1.8;
			} else if (i % 3 === 0) {
				r = 1.2;
			}
			const op = ((i * 17) % 60 + 30) / 100;
			points.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${op}" />`);
		}
		return points.join('');
	}

	/**
	 * Builds an interactive Celestial Constellation Astrolabe Star Map.
	 * @param {ProgressionNode[]} filteredNodes Filtered nodes to show.
	 * @param {ProgressionCharacter} activeChar Active character object.
	 * @param {ProgressionNode|null} selectedNode Currently selected node object.
	 * @param {EvaluationContext} ctx Evaluation context container.
	 * @param {(action: ProgressionActionToken) => void} dispatch Action dispatch handler.
	 * @returns {HTMLElement} Viewport DOM element.
	 */
	function renderConstellationAstrolabe(filteredNodes, activeChar, selectedNode, ctx, dispatch) {
		const { unlockedList, registry, manifest } = ctx;
		const viewport = document.createElement('div');
		viewport.className = 'aether-constellation-viewport';
		viewport.id = 'aether-constellation-viewport';

		// All 77 registry nodes for comprehensive leylines network
		const allRegistryNodes = Object.values(registry);
		const leylines = collectConstellationLeylines(allRegistryNodes, registry);

		// Resolve essence focusing
		const activeEssence = ctx.selectedEssence || 'ALL';
		if (!astrolabeViewportState.initialized || astrolabeViewportState.lastEssence !== activeEssence) {
			astrolabeViewportState.initialized = true;
			astrolabeViewportState.lastEssence = activeEssence;

			/** @type {Record<string, { x: number, y: number, z: number }>} */
			const clusterCenters = {
				IRON: { x: 360, y: 280, z: 1.25 },
				EMBER: { x: 1020, y: 300, z: 1.25 },
				TIDE: { x: 1080, y: 660, z: 1.25 },
				UMBRA: { x: 700, y: 750, z: 1.25 },
				LUMEN: { x: 340, y: 660, z: 1.25 },
				ALL: { x: 700, y: 450, z: 0.82 }
			};
			const target = clusterCenters[activeEssence] || clusterCenters.ALL;
			astrolabeViewportState.zoom = target.z;
			// Default viewport virtual dimensions assumption: ~780x560
			const viewW = 780;
			const viewH = 560;
			astrolabeViewportState.panX = Math.round(viewW / 2 - target.x * target.z);
			astrolabeViewportState.panY = Math.round(viewH / 2 - target.y * target.z);
		}

		// Pan-zoom transform container
		const container = document.createElement('div');
		container.className = 'constellation-pan-zoom-container';
		container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;

		// Build Ley Lines SVG Network: filter visible conduits to active constellation
		const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
		const visibleLeylines = activeEssence === 'ALL'
			? leylines
			: leylines.filter((line) => filteredNodeIds.has(line.aId) && filteredNodeIds.has(line.bId));

		const leylineSvgLines = visibleLeylines.map((line) => {
			const aUnlocked = unlockedList.includes(line.aId);
			const bUnlocked = unlockedList.includes(line.bId);
			const aAvailable = !aUnlocked && evaluateCanUnlock(activeChar, line.aNode, registry, manifest);
			const bAvailable = !bUnlocked && evaluateCanUnlock(activeChar, line.bNode, registry, manifest);
			const isFocused = selectedNode && (selectedNode.id === line.aId || selectedNode.id === line.bId);

			let status = 'latent';
			if (aUnlocked && bUnlocked) {
				status = 'unlocked';
			} else if ((aUnlocked && bAvailable) || (bUnlocked && aAvailable)) {
				status = 'available';
			}

			const focusClass = isFocused ? 'leyline-focused' : '';

			return `
        <line class="leyline-glow leyline-${status} ${focusClass}" x1="${line.ax}" y1="${line.ay}" x2="${line.bx}" y2="${line.by}" />
        <line class="leyline-core leyline-${status} ${focusClass}" x1="${line.ax}" y1="${line.ay}" x2="${line.bx}" y2="${line.by}" />
      `;
		}).join('');

		const stardustSvg = buildBackgroundStardustMarkup();

		const svgContent = `
      <svg class="constellation-starfield-svg" viewBox="0 0 1400 900" width="1400" height="900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="nebula-iron" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22" />
            <stop offset="60%" stop-color="#1e293b" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="nebula-ember" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f97316" stop-opacity="0.25" />
            <stop offset="60%" stop-color="#7c2d12" stop-opacity="0.09" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="nebula-tide" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.22" />
            <stop offset="60%" stop-color="#083344" stop-opacity="0.08" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="nebula-umbra" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#a855f7" stop-opacity="0.24" />
            <stop offset="60%" stop-color="#3b0764" stop-opacity="0.09" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="nebula-lumen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#eab308" stop-opacity="0.25" />
            <stop offset="60%" stop-color="#713f12" stop-opacity="0.09" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </radialGradient>
          <filter id="leyline-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <!-- Ambient Elemental Nebulae -->
        <ellipse cx="360" cy="260" rx="280" ry="220" fill="url(#nebula-iron)" />
        <ellipse cx="1040" cy="260" rx="280" ry="220" fill="url(#nebula-ember)" />
        <ellipse cx="1080" cy="640" rx="280" ry="220" fill="url(#nebula-tide)" />
        <ellipse cx="700" cy="750" rx="260" ry="200" fill="url(#nebula-umbra)" />
        <ellipse cx="340" cy="640" rx="280" ry="220" fill="url(#nebula-lumen)" />

        <!-- Astrolabe Harmonic Geometry & Coordinate Rings -->
        <g class="astrolabe-coordinate-rings">
          <circle cx="700" cy="450" r="180" stroke="rgba(56, 189, 248, 0.12)" stroke-width="1" stroke-dasharray="4 6" fill="none" />
          <circle cx="700" cy="450" r="370" stroke="rgba(56, 189, 248, 0.09)" stroke-width="1" stroke-dasharray="3 7" fill="none" />
          <circle cx="700" cy="450" r="540" stroke="rgba(56, 189, 248, 0.06)" stroke-width="1" stroke-dasharray="2 8" fill="none" />
          <line x1="700" y1="50" x2="700" y2="850" stroke="rgba(56, 189, 248, 0.07)" stroke-width="1" stroke-dasharray="2 6" />
          <line x1="80" y1="450" x2="1320" y2="450" stroke="rgba(56, 189, 248, 0.07)" stroke-width="1" stroke-dasharray="2 6" />
        </g>

        <!-- Background Stardust -->
        <g class="astrolabe-stardust">
          ${stardustSvg}
        </g>

        <!-- Resonant Leyline Conduits -->
        <g class="astrolabe-leylines-network">
          ${leylineSvgLines}
        </g>
      </svg>
    `;

		const svgWrapper = document.createElement('div');
		svgWrapper.className = 'constellation-svg-wrapper';
		svgWrapper.innerHTML = svgContent;
		container.appendChild(svgWrapper);

		// Build Interactive Stars Layer
		const starsLayer = document.createElement('div');
		starsLayer.className = 'constellation-stars-layer';

		const skillIcons = /** @type {any} */ (typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons : null);

		// Determine which stars to render
		const starsToRender = filteredNodes;

		starsToRender.forEach((node) => {
			const pos = getStarCoordinates(node);
			const isUnlocked = unlockedList.includes(node.id);
			const isAvailable = !isUnlocked && evaluateCanUnlock(activeChar, node, registry, manifest);
			const isSelected = selectedNode?.id === node.id;
			const essKey = resolveNodeEssence(node);
			const nodeType = (node.type || 'attribute').toLowerCase();
			let statusClass = 'locked';
			if (isUnlocked) {
				statusClass = 'unlocked';
			} else if (isAvailable) {
				statusClass = 'available';
			}
			const selectedClass = isSelected ? 'selected' : '';
			const glyphUrl = skillIcons && typeof skillIcons.get === 'function' ? skillIcons.get(node.id) : null;
			const coordText = buildNodeCoordTag(node);
			const spCost = node.spCost || 1;

			let statusPill = `<span class="star-pill-cost">[${spCost} SP]</span>`;
			if (isUnlocked) {
				statusPill = '<span class="star-pill-attuned">★ ATTUNED</span>';
			} else if (isAvailable) {
				statusPill = `<span class="star-pill-ready">⚡ READY</span>`;
			}

			const starBtn = document.createElement('button');
			starBtn.type = 'button';
			starBtn.className = `constellation-star star-essence-${essKey.toLowerCase()} star-type-${nodeType} ${statusClass} ${selectedClass}`;
			starBtn.style.left = `${pos.x}px`;
			starBtn.style.top = `${pos.y}px`;
			starBtn.dataset.nodeId = node.id;
			starBtn.setAttribute('title', `${node.label} (${coordText})\n${node.desc || ''}`);

			starBtn.innerHTML = `
        <div class="star-halo"></div>
        <div class="star-reticle"></div>
        <div class="star-core">
          ${glyphUrl ? `<img src="${glyphUrl}" class="star-glyph-img" alt="${node.label}" />` : '<span class="star-glyph-fallback">✦</span>'}
        </div>
        <div class="star-caption">
          <span class="star-label-text">${node.label}</span>
          ${statusPill}
        </div>
      `;

			starBtn.addEventListener('click', (ev) => {
				ev.stopPropagation();
				emit(dispatch, { type: 'SELECT_NODE', nodeId: node.id });
			});

			starsLayer.appendChild(starBtn);
		});

		container.appendChild(starsLayer);
		viewport.appendChild(container);

		// Astrolabe Floating HUD (Pan/Zoom and Recenter Controls)
		const hud = document.createElement('div');
		hud.className = 'astrolabe-viewport-hud';
		hud.innerHTML = `
      <div class="astrolabe-hud-controls">
        <button type="button" class="astrolabe-hud-btn" id="hud-zoom-in" title="Zoom In (+)">＋</button>
        <button type="button" class="astrolabe-hud-btn" id="hud-zoom-out" title="Zoom Out (−)">−</button>
        <button type="button" class="astrolabe-hud-btn" id="hud-recenter" title="Recenter Constellation">⊙</button>
        <button type="button" class="astrolabe-hud-btn" id="hud-fit-all" title="View Full Celestial Zodiac">🌌</button>
      </div>
      <div class="astrolabe-hud-hint">
        <span>Drag to pan · Scroll to zoom</span>
      </div>
    `;
		viewport.appendChild(hud);

		// HUD Button Event Handlers
		const btnZoomIn = hud.querySelector('#hud-zoom-in');
		if (btnZoomIn) {
			btnZoomIn.addEventListener('click', (ev) => {
				ev.stopPropagation();
				astrolabeViewportState.zoom = Math.min(2.2, astrolabeViewportState.zoom * 1.2);
				container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;
			});
		}

		const btnZoomOut = hud.querySelector('#hud-zoom-out');
		if (btnZoomOut) {
			btnZoomOut.addEventListener('click', (ev) => {
				ev.stopPropagation();
				astrolabeViewportState.zoom = Math.max(0.55, astrolabeViewportState.zoom / 1.2);
				container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;
			});
		}

		const btnRecenter = hud.querySelector('#hud-recenter');
		if (btnRecenter) {
			btnRecenter.addEventListener('click', (ev) => {
				ev.stopPropagation();
				/** @type {Record<string, { x: number, y: number, z: number }>} */
				const clusterCenters = {
					IRON: { x: 360, y: 260, z: 1.25 },
					EMBER: { x: 1040, y: 260, z: 1.25 },
					TIDE: { x: 1080, y: 640, z: 1.25 },
					UMBRA: { x: 700, y: 750, z: 1.25 },
					LUMEN: { x: 340, y: 640, z: 1.25 },
					ALL: { x: 700, y: 450, z: 0.82 }
				};
				const target = clusterCenters[activeEssence] || clusterCenters.ALL;
				const rect = viewport.getBoundingClientRect();
				const viewW = rect.width || 780;
				const viewH = rect.height || 560;
				astrolabeViewportState.zoom = target.z;
				astrolabeViewportState.panX = Math.round(viewW / 2 - target.x * target.z);
				astrolabeViewportState.panY = Math.round(viewH / 2 - target.y * target.z);
				container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;
			});
		}

		const btnFitAll = hud.querySelector('#hud-fit-all');
		if (btnFitAll) {
			btnFitAll.addEventListener('click', (ev) => {
				ev.stopPropagation();
				const rect = viewport.getBoundingClientRect();
				const viewW = rect.width || 780;
				const viewH = rect.height || 560;
				astrolabeViewportState.zoom = 0.68;
				astrolabeViewportState.panX = Math.round(viewW / 2 - 700 * 0.68);
				astrolabeViewportState.panY = Math.round(viewH / 2 - 450 * 0.68);
				container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;
			});
		}

		// Interactive Mouse Pan & Wheel Zoom on Viewport
		viewport.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			// Don't drag if clicking buttons directly
			if (/** @type {HTMLElement | null} */ (e.target)?.closest('button')) return;
			astrolabeViewportState.isDragging = true;
			astrolabeViewportState.dragStartX = e.clientX;
			astrolabeViewportState.dragStartY = e.clientY;
			astrolabeViewportState.dragStartPanX = astrolabeViewportState.panX;
			astrolabeViewportState.dragStartPanY = astrolabeViewportState.panY;
			viewport.classList.add('is-panning');
		});

		window.addEventListener('mousemove', (e) => {
			if (!astrolabeViewportState.isDragging) return;
			const dx = e.clientX - astrolabeViewportState.dragStartX;
			const dy = e.clientY - astrolabeViewportState.dragStartY;
			astrolabeViewportState.panX = astrolabeViewportState.dragStartPanX + dx;
			astrolabeViewportState.panY = astrolabeViewportState.dragStartPanY + dy;
			container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;
		});

		window.addEventListener('mouseup', () => {
			if (astrolabeViewportState.isDragging) {
				astrolabeViewportState.isDragging = false;
				viewport.classList.remove('is-panning');
			}
		});

		viewport.addEventListener('wheel', (e) => {
			e.preventDefault();
			const rect = viewport.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
			const newZoom = Math.min(2.4, Math.max(0.5, astrolabeViewportState.zoom * zoomFactor));

			// Smooth zoom towards cursor
			astrolabeViewportState.panX = mouseX - (mouseX - astrolabeViewportState.panX) * (newZoom / astrolabeViewportState.zoom);
			astrolabeViewportState.panY = mouseY - (mouseY - astrolabeViewportState.panY) * (newZoom / astrolabeViewportState.zoom);
			astrolabeViewportState.zoom = newZoom;

			container.style.transform = `translate(${astrolabeViewportState.panX}px, ${astrolabeViewportState.panY}px) scale(${astrolabeViewportState.zoom})`;
		}, { passive: false });

		return viewport;
	}

	/**
	 * Renders the constellation matrix grid pane container.
	 * Supports both Interactive Celestial Astrolabe and Codex Card List views.
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

		const spPool = activeChar.skillPoints ?? activeChar.unspentSP ?? 0;
		const isAstrolabe = astrolabeViewportState.viewMode === 'astrolabe';

		const gridHeader = document.createElement('div');
		gridHeader.className = 'aether-grid-header';
		gridHeader.innerHTML = `
      <div class="grid-header-title">
        <span class="grid-glow-title">🌌 CELESTIAL CONSTELLATION ASTROLABE</span>
        <span class="grid-count-badge">(${filteredNodes.length} STARS)</span>
      </div>
      <div class="grid-header-telemetry">
        <div class="aether-view-toggle-group">
          <button type="button" class="aether-view-toggle-btn ${isAstrolabe ? 'active' : ''}" id="toggle-astrolabe-view" title="Interactive Star Map">
            🌟 STAR MAP
          </button>
          <button type="button" class="aether-view-toggle-btn ${!isAstrolabe ? 'active' : ''}" id="toggle-codex-view" title="Classic Card Codex">
            📜 CODEX LIST
          </button>
        </div>
        <span class="hero-sp-counter ${spPool > 0 ? 'glowing' : ''}">POOL: ${spPool} SP</span>
      </div>
    `;

		const btnAstrolabe = gridHeader.querySelector('#toggle-astrolabe-view');
		if (btnAstrolabe) {
			btnAstrolabe.addEventListener('click', () => {
				if (astrolabeViewportState.viewMode !== 'astrolabe') {
					astrolabeViewportState.viewMode = 'astrolabe';
					emit(dispatch, { type: 'SELECT_ESSENCE', essence: ctx.selectedEssence || 'ALL' });
				}
			});
		}

		const btnCodex = gridHeader.querySelector('#toggle-codex-view');
		if (btnCodex) {
			btnCodex.addEventListener('click', () => {
				if (astrolabeViewportState.viewMode !== 'codex') {
					astrolabeViewportState.viewMode = 'codex';
					emit(dispatch, { type: 'SELECT_ESSENCE', essence: ctx.selectedEssence || 'ALL' });
				}
			});
		}

		gridPane.appendChild(gridHeader);

		if (isAstrolabe) {
			const astrolabeView = renderConstellationAstrolabe(filteredNodes, activeChar, selectedNode, ctx, dispatch);
			gridPane.appendChild(astrolabeView);
		} else {
			const nodesGrid = document.createElement('div');
			nodesGrid.className = 'aether-nodes-grid';

			filteredNodes.forEach((node) => {
				const card = renderNodeCard(node, activeChar, selectedNode, ctx, dispatch);
				nodesGrid.appendChild(card);
			});

			gridPane.appendChild(nodesGrid);
		}

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
			return `<div class="prereq-status ok">✅ <b>ATTUNED:</b> This star's resonance is permanently bound to ${activeChar.name}.</div>`;
		}
		if (isAvailable) {
			return `<div class="prereq-status ready">⚡ <b>ELIGIBLE:</b> Leylines aligned! Attune to unlock bonuses for <b>${reqSP} SP</b>.</div>`;
		}
		const reason = buildInspectorLockReason(selectedNode, activeChar, registry, reqSP);
		return `<div class="prereq-status locked">🔒 <b>LOCKED:</b> ${reason}</div>`;
	}

	/**
	 * Builds live projected stat delta rows for character comparison.
	 * @param {ProgressionNode} selectedNode
	 * @param {ProgressionCharacter} activeChar
	 * @returns {string} HTML markup.
	 */
	function buildInspectorStatProjections(selectedNode, activeChar) {
		if (!selectedNode.statDeltas) return '';
		const charMap = /** @type {Record<string, any>} */ (activeChar);
		const rows = Object.entries(selectedNode.statDeltas).map(([stat, val]) => {
			const statKey = stat.toLowerCase();
			const curVal = Number(charMap[statKey] ?? 0);
			const nextVal = curVal + val;
			return `
        <div class="stat-projection-row">
          <span class="stat-proj-name">${stat.toUpperCase()}:</span>
          <span class="stat-proj-calc">
            <span class="stat-cur">${curVal}</span>
            <span class="stat-arrow">→</span>
            <span class="stat-next">${nextVal}</span>
            <span class="stat-delta-badge">(+${val})</span>
          </span>
        </div>
      `;
		}).join('');
		return `
      <div class="inspector-stat-projections-box">
        <div class="stat-proj-header">LIVE ATTUNEMENT DELTAS:</div>
        <div class="stat-proj-grid">${rows}</div>
      </div>
    `;
	}

	/**
	 * Builds interactive resonant leyline neighbor chips markup.
	 * @param {ProgressionNode} selectedNode
	 * @param {Object.<string, ProgressionNode>} registry
	 * @param {string[]} unlockedList
	 * @returns {string} HTML markup string.
	 */
	function buildInspectorLeylinesMarkup(selectedNode, registry, unlockedList) {
		const neighbors = selectedNode.neighbors;
		if (!Array.isArray(neighbors) || neighbors.length === 0) return '';
		const chips = neighbors.map((nId) => {
			const nNode = registry[nId];
			if (!nNode) return '';
			const isUnl = unlockedList.includes(nId);
			const statusCls = isUnl ? 'attuned' : 'resonant';
			return `
        <button type="button" class="leyline-chip ${statusCls}" data-node-id="${nId}" title="Inspect Leyline Star: ${nNode.label}">
          <span>${isUnl ? '✨' : '☊'}</span>
          <span>${nNode.label}</span>
        </button>
      `;
		}).join('');
		return `
      <div class="inspector-leylines-box">
        <div class="leylines-header">RESONANT LEYLINES (${neighbors.length} CONNECTED STARS):</div>
        <div class="leylines-chips-grid">${chips}</div>
      </div>
    `;
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
          ✨ ATTUNE STAR CONSTELLATION (-${reqSP} SP)
        </button>
      `;
		}
		if (isUnlocked) {
			return `
        <button type="button" class="aether-attune-btn already-attuned" disabled>
          ✅ STAR ALREADY ATTUNED
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
		const spPool = activeChar.skillPoints ?? activeChar.unspentSP ?? 0;

		const glyphUrl = (typeof EmberlightSkillIcons !== 'undefined' && typeof /** @type {any} */ (EmberlightSkillIcons).get === 'function')
			? /** @type {any} */ (EmberlightSkillIcons).get(selectedNode.id)
			: null;
		const inspectorCard = document.createElement('div');
		inspectorCard.className = `aether-inspector-card essence-${essKey.toLowerCase()}`;

		const statProjections = buildInspectorStatProjections(selectedNode, activeChar);
		const capabilityNotice = buildInspectorCapabilityNotice(selectedNode);
		const prereqNotice = buildInspectorPrereqNotice(isUnlocked, isAvailable, selectedNode, activeChar, registry, reqSP);
		const leylinesMarkup = buildInspectorLeylinesMarkup(selectedNode, registry, unlockedList);
		const attuneBtnHtml = buildInspectorAttuneButton(isAvailable, isUnlocked, reqSP);
		const selectedNodeType = (selectedNode.type || 'passive').toUpperCase();
		const coordText = buildNodeCoordTag(selectedNode);

		inspectorCard.innerHTML = `
      <div class="inspector-astrolabe-viewport">
        <div class="astrolabe-halo-ring">
          ${glyphUrl ? `<img src="${glyphUrl}" class="inspector-glyph" alt="${selectedNode.label}" />` : '<div class="inspector-glyph-placeholder">✨</div>'}
        </div>
        <div class="inspector-titles">
          <div class="inspector-name">${selectedNode.label}</div>
          <div class="inspector-essence-tag ${essKey.toLowerCase()}">${essKey} CONSTELLATION · ${selectedNodeType}</div>
          <div class="inspector-coord-tag">${coordText}</div>
        </div>
      </div>

      <div class="inspector-body">
        <div class="inspector-desc">${selectedNode.desc || 'Aether matrix resonance node.'}</div>
        
        ${statProjections}
        ${capabilityNotice}
        ${prereqNotice}
        ${leylinesMarkup}

        <div class="inspector-details-table">
          <div class="detail-row">
            <span class="detail-label">Skill Point Economy:</span>
            <span class="detail-val" style="color:#60a5fa; font-weight:bold;">${reqSP} SP (Available: ${spPool} SP)</span>
          </div>
          ${selectedNode.mpCost ? `
            <div class="detail-row">
              <span class="detail-label">Mana Activation Cost:</span>
              <span class="detail-val" style="color:var(--mp); font-weight:bold;">${selectedNode.mpCost} MP</span>
            </div>
          ` : ''}
          ${selectedNode.power ? `
            <div class="detail-row">
              <span class="detail-label">Potency / Multiplier:</span>
              <span class="detail-val" style="color:var(--ember); font-weight:bold;">Power ${selectedNode.power}</span>
            </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Constellation Path:</span>
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

		// Bind Leyline chips for fast star-to-star navigation
		inspectorCard.querySelectorAll('.leyline-chip').forEach((elem) => {
			const chip = /** @type {HTMLElement} */ (elem);
			chip.addEventListener('click', () => {
				const targetId = chip.dataset.nodeId;
				if (targetId) emit(dispatch, { type: 'SELECT_NODE', nodeId: targetId });
			});
		});

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
				view.innerHTML = '<div style="color:var(--text-dim); font-family:var(--font-mono, monospace); font-size:9.5px; letter-spacing:0.5px; padding:12px; text-align:center;">No active party members loaded in progression matrix.</div>';
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

			if (!state.selectedNodeId || !registry[state.selectedNodeId] || (state.selectedEssence !== 'ALL' && !filteredNodes.some((n) => n.id === state.selectedNodeId))) {
				state.selectedNodeId = buildInitialSelectedNodeId(filteredNodes, activeChar, unlockedList, registry, manifest);
			}

			const selectedNode = registry[state.selectedNodeId] || filteredNodes[0] || null;
			const ctx = { unlockedList, registry, manifest, essences, selectedEssence: state.selectedEssence };

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
		destroy() {
			astrolabeViewportState = {
				panX: 0,
				panY: 0,
				zoom: 0.85,
				isDragging: false,
				dragStartX: 0,
				dragStartY: 0,
				dragStartPanX: 0,
				dragStartPanY: 0,
				initialized: false,
				lastEssence: 'ALL',
				viewMode: 'astrolabe'
			};
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightProgressionRenderer = EmberlightProgressionRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightProgressionRenderer;
}