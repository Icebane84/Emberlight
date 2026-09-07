/* cSpell:words VSRP unsubs targetable */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COCKPIT DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-COCKPIT-RENDERER
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * Timestamp:           2026-09-07T09:23:44Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] DOM Element Utility & Notification Helpers
 *   [SEC-03] Telemetry Tickers & Mini-HUD Viewport Renderers
 *   [SEC-04] Party Roster HUD & Town Marketplace Availability
 *   [SEC-05] Environmental Scanner, Tile Adjacency & Acoustic Cues
 *   [SEC-06] Field Pouch Drawer & Item Targeting Handlers
 *   [SEC-07] Canvas Ambient Title Screen Animation Kernel
 *   [SEC-08] Canonical Peripheral Driver Interface & Module Exports
 * ============================================================================
 */

const EmberlightCockpitRenderer = (() => {
	'use strict';

	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} CockpitCharacter
	 * @property {string} id - Unique character identifier.
	 * @property {string} name - Character display name.
	 * @property {number} hp - Current hit points.
	 * @property {number} maxHp - Maximum hit point ceiling.
	 * @property {number} mp - Current mana points.
	 * @property {number} maxMp - Maximum mana ceiling.
	 * @property {number} level - Character progression level.
	 * @property {boolean} alive - Life status assertion flag.
	 * @property {'HERO'|'WARRIOR'|'MAGE'|'HEALER'} phenotype - Character archetype.
	 * @property {Array<{ id: string, duration?: number }>} [ailments] - Active status ailments.
	 */

	/**
	 * @typedef {Object} CockpitSimState
	 * @property {string} [activeDistrict] - Current active district domain token.
	 * @property {CockpitCharacter[]} [party] - Active party roster.
	 * @property {number} [gold] - Currency count.
	 * @property {string} [townId] - Active town identifier if in settlement.
	 * @property {string[][]} [activeMap] - Current 2D tile matrix.
	 * @property {{ x: number, y: number }} [worldPos] - Player world coordinates.
	 * @property {Record<string, { stage?: number, completed?: boolean }>} [quests] - Quest journal status mapping.
	 * @property {boolean} [pouchOpen] - Field pouch expansion flag.
	 * @property {Record<string, number>} [inventory] - Consumable inventory item counts.
	 */

	/**
	 * @typedef {Object} CockpitActionPayload
	 * @property {string} type - Action type token.
	 * @property {string} [itemId] - Target consumable item identifier.
	 * @property {string} [targetHeroId] - Target hero identifier.
	 * @property {string} [targetId] - Target entity identifier.
	 */

	/**
	 * @typedef {Object} CockpitContext
	 * @property {{ publish: function(string, any):void }} [eventBus] - Event communication bus.
	 */

	/**
	 * @typedef {Object} FieldPouchItem
	 * @property {string} id - Item token.
	 * @property {string} label - Display name.
	 * @property {string} effect - Effect summary.
	 * @property {number} count - Available inventory quantity.
	 */
	//#endregion

	//#region [SEC-02] DOM Element Utility & Notification Helpers
	let eventBusRef = null;
	let lastScannedHazardSignature = '';
	let activePouchSelectedItemId = null;
	let isQ4DeckExpanded = false;
	let is3DViewExpanded = false;
	let titleAnimId = null;

	/**
	 * Removes hidden display class from targeted DOM element.
	 * [DOM State Mutating]
	 * @param {string} id - Target DOM element ID.
	 * @returns {void}
	 */
	function showElement(id) {
		if (typeof document === 'undefined') return;
		const el = document.getElementById(id);
		if (el) el.classList.remove('hidden');
	}

	/**
	 * Applies hidden display class to targeted DOM element.
	 * [DOM State Mutating]
	 * @param {string} id - Target DOM element ID.
	 * @returns {void}
	 */
	function hideElement(id) {
		if (typeof document === 'undefined') return;
		const el = document.getElementById(id);
		if (el) el.classList.add('hidden');
	}

	/**
	 * Updates status ticker line text content.
	 * [DOM State Mutating]
	 * @param {string} msg - Status message text.
	 * @returns {void}
	 */
	function notifyStatus(msg) {
		if (typeof document === 'undefined') return;
		const el = document.getElementById('status-line') || document.getElementById('status-ticker');
		if (el) el.textContent = msg;
	}
	//#endregion

	//#region [SEC-03] Telemetry Tickers & Mini-HUD Viewport Renderers
	/**
	 * Updates quest status ticker from active chronicle progression.
	 * [DOM State Mutating]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @returns {void}
	 */
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

	/**
	 * Renders persistent Q4 mini-HUD pips for party vitals.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @returns {void}
	 */
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
	//#endregion

	//#region [SEC-04] Party Roster HUD & Town Marketplace Availability
	/**
	 * Renders party roster HUD cards and updates town marketplace button states.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @returns {void}
	 */
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

		const shopBtn = /** @type {HTMLButtonElement|null} */ (document.getElementById('nav-shop-btn'));
		if (shopBtn) {
			const inTown = Boolean(snapshot?.townId);
			shopBtn.disabled = !inTown;
			shopBtn.style.opacity = inTown ? '1' : '0.4';
			shopBtn.title = inTown ? 'Access Oakhaven Market' : 'Market is only accessible in Oakhaven Town (🏰)';
		}
	}
	//#endregion

	//#region [SEC-05] Environmental Scanner, Tile Adjacency & Acoustic Cues
	/**
	 * Resolves adjacent spatial tile values surrounding player position.
	 * [Pure Query]
	 * @param {string[][]} map - 2D tile matrix.
	 * @param {number} px - Player horizontal grid coordinate.
	 * @param {number} py - Player vertical grid coordinate.
	 * @returns {string[]} Adjacent tile symbols.
	 */
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

	/**
	 * Highlights field scanner buttons when environmental synergies are detected.
	 * [DOM State Mutating]
	 * @param {string[]} adjacentTiles - Adjacent tile symbols.
	 * @param {string[][]} map - 2D tile matrix.
	 * @param {number} px - Player X.
	 * @param {number} py - Player Y.
	 * @returns {void}
	 */
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

	/**
	 * Builds diagnostic warning strings for nearby environmental hazards.
	 * [Pure Query]
	 * @param {string[]} adjacentTiles - Adjacent tile symbols.
	 * @returns {string[]} Formatted warning messages.
	 */
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

	/**
	 * Dispatches acoustic hazard cues over the EventBus when signature changes.
	 * [State Mutating / Bus Dispatch]
	 * @param {string[]} adjacentTiles - Adjacent tile symbols.
	 * @returns {void}
	 */
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

	/**
	 * Updates environmental scanner alert display panel.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @returns {void}
	 */
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
	//#endregion

	//#region [SEC-06] Field Pouch Drawer & Item Targeting Handlers
	/**
	 * Renders interactive field pouch consumables drawer.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @param {function(CockpitActionPayload):void} dispatch - Action dispatcher.
	 * @returns {void}
	 */
	function renderFieldPouch(snapshot, dispatch) {
		if (typeof document === 'undefined') return;
		const grid = document.getElementById('field-pouch-grid');
		const targetDrawer = document.getElementById('pouch-target-drawer');
		if (!grid) return;

		const inventory = snapshot?.inventory || {};
		/** @type {FieldPouchItem[]} */
		const items = [
			{ id: 'POTION', label: 'Potion', effect: '+25 HP', count: inventory.POTION || 0 },
			{ id: 'ETHER', label: 'Ether', effect: '+15 MP', count: inventory.ETHER || 0 },
			{ id: 'PHOENIX_EMBER', label: 'Ember', effect: 'Revive 50%', count: inventory.PHOENIX_EMBER || 0 },
		];

		grid.innerHTML = '';
		items.forEach((it) => {
			const btn = /** @type {HTMLButtonElement} */ (document.createElement('button'));
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

	/**
	 * Renders squad target selection drawer for field consumable use.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @param {FieldPouchItem} item - Item definition.
	 * @param {HTMLElement|null} drawer - Target DOM container.
	 * @param {function(CockpitActionPayload):void} dispatch - Action dispatcher.
	 * @returns {void}
	 */
	function renderPouchTargetSelector(snapshot, item, drawer, dispatch) {
		if (!drawer) return;
		drawer.classList.remove('hidden');
		drawer.innerHTML = `
      <div style="font-size:7px; color:var(--ember); font-weight:bold; margin-bottom:4px;">
        Use ${item.label} on:
      </div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px;" id="pouch-target-buttons"></div>
    `;

		const btnContainer = /** @type {HTMLElement|null} */ (drawer.querySelector('#pouch-target-buttons'));
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
			if (btnContainer) btnContainer.appendChild(tBtn);
		});
	}
	//#endregion

	//#region [SEC-07] Canvas Ambient Title Screen Animation Kernel
	/**
	 * Initiates canvas-based ambient title screen background animation loop.
	 * [Canvas Animation Render]
	 * @param {function():string} getActiveDistrict - District state query callback.
	 * @param {string} [canvasId='title-bg-canvas'] - Target canvas element ID.
	 * @returns {void}
	 */
	function startTitleAnimation(getActiveDistrict, canvasId = 'title-bg-canvas') {
		if (typeof document === 'undefined') return;
		const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById(canvasId));
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
	//#endregion

	//#region [SEC-08] Canonical Peripheral Driver Interface & Module Exports
	return {
		/**
		 * Initializes peripheral driver environment references.
		 * [Lifecycle: INIT]
		 * @param {CockpitContext} [context] - Host context containing event bus.
		 * @returns {void}
		 */
		init(context) {
			eventBusRef = context?.eventBus || null;
		},

		/**
		 * Renders complete tactical cockpit HUD and drawer components.
		 * [DOM Presentation Render]
		 * @param {CockpitSimState} snapshot - Simulation state snapshot.
		 * @param {function(CockpitActionPayload):void} dispatch - Action dispatcher.
		 * @returns {void}
		 */
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

		/**
		 * Renders cockpit viewport (alias to render).
		 * [DOM Presentation Render]
		 * @param {CockpitSimState} snapshot - Simulation state snapshot.
		 * @param {function(CockpitActionPayload):void} dispatch - Action dispatcher.
		 * @returns {void}
		 */
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

		/**
		 * Updates expanded view layout flags.
		 * [State Mutating]
		 * @param {boolean} q4Expanded - Expanded Q4 deck state.
		 * @param {boolean} view3dExpanded - Expanded 3D view state.
		 * @returns {void}
		 */
		setExpanded(q4Expanded, view3dExpanded) {
			isQ4DeckExpanded = Boolean(q4Expanded);
			is3DViewExpanded = Boolean(view3dExpanded);
		},

		/**
		 * Exports driver operational diagnostics.
		 * [Pure Query]
		 * @returns {{ driverId: string, isQ4DeckExpanded: boolean, is3DViewExpanded: boolean }}
		 */
		getDiagnostics() {
			return {
				driverId: 'cockpit_renderer',
				isQ4DeckExpanded,
				is3DViewExpanded,
			};
		},

		/**
		 * Releases driver references and timers.
		 * [State Mutating]
		 * @returns {void}
		 */
		destroy() {
			eventBusRef = null;
			lastScannedHazardSignature = '';
			activePouchSelectedItemId = null;
			titleAnimId = null;
		},
	};
	//#endregion
})();

//#region [SEC-09] Global Environment & Module Export
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.EmberlightCockpitRenderer = EmberlightCockpitRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightCockpitRenderer;
}
//#endregion