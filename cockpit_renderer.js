/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COCKPIT DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-COCKPIT-RENDERER
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * Timestamp:           2026-09-07T09:23:44Z
 * Index Anchor:        PRS-001
 * ============================================================================
 */

const EmberlightCockpitRenderer = (() => {
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
	 * @property {number} [exp] - Current experience points.
	 * @property {number} [unspentSP] - Unspent skill points.
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
	 * @property {string[][]} [map] - Fallback 2D tile matrix.
	 * @property {{ x: number, y: number }} [worldPos] - Player world coordinates.
	 * @property {{ x: number, y: number }} [playerPos] - Fallback player coordinates.
	 * @property {string} [facingPrompt] - Directional interaction prompt.
	 * @property {Record<string, { stage?: number, completed?: boolean }>} [quests] - Quest journal status mapping.
	 * @property {boolean} [pouchOpen] - Field pouch expansion flag.
	 * @property {Record<string, number>} [inventory] - Consumable inventory item counts.
	 * @property {number} [dangerSteps] - Strata resonance threat step accumulator.
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
	 * @property {{ publish: (topic: string, payload: any) => void }} [eventBus] - Event communication bus.
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
	/** @type {any} */
	let eventBusRef = null;
	let lastScannedHazardSignature = "";
	/** @type {string|null} */
	let activePouchSelectedItemId = null;
	let isQ4DeckExpanded = false;
	let is3DViewExpanded = false;
	/** @type {number|null} */
	let titleAnimId = null;
	/** @type {number|null} */
	let scopeAnimId = null;
	let scopeTime = 0;
	/** @type {any} */
	let lastScopeSnapshot = null;
	/** @type {{ x: number, y: number }|null} */
	let lastRecordedPlayerPos = null;
	let seismicTremorImpulse = 0;

	/**
	 * Removes hidden display class from targeted DOM element.
	 * [DOM State Mutating]
	 * @param {string} id - Target DOM element ID.
	 * @returns {void}
	 */
	function showElement(id) {
		if (typeof document === "undefined") return;
		const el = document.getElementById(id);
		if (el) el.classList.remove("hidden");
	}

	/**
	 * Applies hidden display class to targeted DOM element.
	 * [DOM State Mutating]
	 * @param {string} id - Target DOM element ID.
	 * @returns {void}
	 */
	function hideElement(id) {
		if (typeof document === "undefined") return;
		const el = document.getElementById(id);
		if (el) el.classList.add("hidden");
	}

	/**
	 * Updates status ticker line text content.
	 * [DOM State Mutating]
	 * @param {string} msg - Status message text.
	 * @returns {void}
	 */
	function notifyStatus(msg) {
		if (typeof document === "undefined") return;
		const el =
			document.getElementById("status-line") ||
			document.getElementById("status-ticker");
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
		if (typeof document === "undefined") return;
		const ticker = document.getElementById("status-quest-ticker");
		if (!ticker) return;

		const manifest = /** @type {any} */ (
			typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {}
		);
		const quests = manifest.Quests || {};
		const activeQuests = snapshot?.quests || {};

		let activeTitle = "Investigate Oakhaven Hamlet";
		let stageDesc = "Explore the surrounding wilderness";

		for (const [qId, qData] of Object.entries(quests)) {
			const qState = activeQuests?.[qId];
			if (!qState?.completed) {
				activeTitle = qData.title || qId;
				const currentStage = qState?.stage || 0;
				stageDesc = qData.stages?.[currentStage]?.desc || "In Progress";
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
		if (typeof document === "undefined") return;
		const container = document.getElementById("q4-persistent-mini-hud");
		if (!container) return;

		const activeDistrict = snapshot?.activeDistrict || "OVERWORLD";
		if (
			activeDistrict === "OVERWORLD" ||
			activeDistrict === "TITLE" ||
			activeDistrict === "COMBAT" ||
			activeDistrict === "GAME_OVER"
		) {
			container.classList.add("hidden");
			return;
		}

		container.classList.remove("hidden");
		const party = snapshot?.party || [];
		if (!Array.isArray(party) || party.length === 0) {
			container.innerHTML = "";
			return;
		}

		container.innerHTML = party
			.map((c) => {
				const stats = /** @type {any} */ (
					typeof EmberlightManifest !== "undefined" &&
						typeof EmberlightManifest.computeCharacterStats === "function"
						? EmberlightManifest.computeCharacterStats(c)
						: c
				);
				const maxHp = stats.maxHp || c.maxHp || 1;
				const maxMp = stats.maxMp || c.maxMp || 1;
				const hpPct = Math.round((Math.max(0, c.hp) / maxHp) * 100);
				const mpPct = Math.round((Math.max(0, c.mp) / maxMp) * 100);
				const initial = c.name ? c.name.slice(0, 3).toUpperCase() : "HER";
				const isFainted = !c.alive || c.hp <= 0;
				return `
          <div class="mini-hud-pip ${isFainted ? "fainted" : ""}">
            <div class="mini-hud-name">
              <span>${initial}</span>
              <span>${c.hp}/${maxHp}</span>
            </div>
            <div class="mini-hud-bar-track"><div class="mini-hud-bar-fill hp" style="width:${hpPct}%"></div></div>
            <div class="mini-hud-bar-track"><div class="mini-hud-bar-fill mp" style="width:${mpPct}%"></div></div>
          </div>
        `;
			})
			.join("");
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
		if (typeof document === "undefined") return;
		const activeDistrict = snapshot?.activeDistrict || "OVERWORLD";

		if (activeDistrict === "OVERWORLD") {
			showElement("party-hud-panel");
			hideElement("district-mount-container");
		} else if (
			activeDistrict === "TITLE" ||
			activeDistrict === "COMBAT" ||
			activeDistrict === "GAME_OVER"
		) {
			hideElement("party-hud-panel");
		} else {
			hideElement("party-hud-panel");
			showElement("district-mount-container");
		}

		const partyContainer =
			document.getElementById("party-hud-grid") ||
			document.getElementById("party-hud-roster") ||
			document.getElementById("party-roster");

		if (partyContainer) {
			partyContainer.innerHTML = "";
			const party = snapshot?.party || [];
			if (Array.isArray(party)) {
				party.forEach((c) => {
					const card = document.createElement("div");
					card.className = `hud-char-card ${c.alive ? "" : "fainted"}`;

					const maxHp = c.maxHp || 30;
					const maxMp = c.maxMp || 10;
					const hpPct = Math.max(0, Math.min(100, ((c.hp || 0) / maxHp) * 100));
					const mpPct = Math.max(0, Math.min(100, ((c.mp || 0) / maxMp) * 100));
					const expReq = typeof EmberlightCombat !== "undefined" && typeof (/** @type {any} */ (EmberlightCombat)).getExpForNextLevel === "function"
						? (/** @type {any} */ (EmberlightCombat)).getExpForNextLevel(c.level || 1)
						: Math.max(20, Math.floor(25 * ((c.level || 1) ** 1.5) + 10 * (c.level || 1)));
					const curExp = c.exp || 0;
					const expPct = Math.max(0, Math.min(100, Math.round((curExp / expReq) * 100)));
					const spBadge = (c.unspentSP && c.unspentSP > 0)
						? `<span class="hud-sp-badge" title="Unspent Skill Points Available! Press [T] for Skill Tree">[+${c.unspentSP} SP]</span>`
						: "";
					const ailmentTags = (c.ailments || [])
						.map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`)
						.join(" ");

					const crestUrl =
						typeof EmberlightPartyIcons !== "undefined"
							? EmberlightPartyIcons.get(c.phenotype)
							: null;

					card.innerHTML = `
            ${crestUrl ? `<img src="${crestUrl}" class="hud-char-crest" alt="${c.name}" />` : ""}
            <div class="hud-char-details">
              <div class="hud-char-name">
                <span>${c.name}</span>
                <span style="color:var(--text-dim); font-family:var(--font-mono, monospace); font-size:9px;">Lv${c.level || 1}</span>
                ${spBadge}
                ${ailmentTags}
              </div>
              <div class="hud-stat-row">
                <span class="hud-stat-label">HP</span>
                <span class="hud-bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                <span class="hud-stat-val">${c.hp || 0}/${maxHp}</span>
              </div>
              <div class="hud-stat-row">
                <span class="hud-stat-label">MP</span>
                <span class="hud-bar-track"><span class="hud-bar-fill mp" style="width:${mpPct}%"></span></span>
                <span class="hud-stat-val">${c.mp || 0}/${maxMp}</span>
              </div>
              <div class="hud-stat-row">
                <span class="hud-stat-label" style="color:var(--gold);">XP</span>
                <span class="hud-bar-track"><span class="hud-bar-fill exp" style="width:${expPct}%; background:linear-gradient(90deg, #d97706, #fbbf24);"></span></span>
                <span class="hud-stat-val" style="color:var(--gold); font-family:var(--font-mono, monospace); font-size:9px; letter-spacing:0.5px;">${curExp}/${expReq}</span>
              </div>
            </div>
          `;
					partyContainer.appendChild(card);
				});
			}
		}

		const goldEl =
			document.getElementById("hud-gold-display") ||
			document.getElementById("gold-display") ||
			document.getElementById("gold-count");

		if (goldEl) {
			goldEl.textContent = `${snapshot?.gold || 0} GOLD`;
		}

		const shopBtn = /** @type {HTMLButtonElement|null} */ (
			document.getElementById("nav-shop-btn")
		);
		if (shopBtn) {
			const inTown = Boolean(snapshot?.townId);
			shopBtn.disabled = !inTown;
			shopBtn.style.opacity = inTown ? "1" : "0.4";
			shopBtn.title = inTown
				? "Access Oakhaven Market"
				: "Market is only accessible in Oakhaven Town (🏰)";
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
		/** @type {string[]} */
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
		if (typeof document === "undefined") return;
		const btnScorch = document.getElementById("btn-field-scorch");
		const btnFreeze = document.getElementById("btn-field-freeze");
		const btnConsecrate = document.getElementById("btn-field-consecrate");
		const btnDispel = document.getElementById("btn-field-dispel");

		[btnScorch, btnFreeze, btnConsecrate, btnDispel].forEach((btn) => {
			if (btn) btn.classList.remove("synergy-active");
		});

		if (adjacentTiles.includes("~") && btnFreeze)
			btnFreeze.classList.add("synergy-active");
		if (adjacentTiles.includes('"') && btnScorch)
			btnScorch.classList.add("synergy-active");
		if (adjacentTiles.includes("%") && btnDispel)
			btnDispel.classList.add("synergy-active");
		if (map?.[py]?.[px] === "." && btnConsecrate)
			btnConsecrate.classList.add("synergy-active");
	}

	/**
	 * Builds diagnostic warning strings for nearby environmental hazards.
	 * [Pure Query]
	 * @param {string[]} adjacentTiles - Adjacent tile symbols.
	 * @returns {string[]} Formatted warning messages.
	 */
	function buildScannerHazardMessages(adjacentTiles) {
		const hazardDefinitions = [
			{ tile: "~", msg: "🌊 Abyssal Chasm nearby. [G] FREEZE viable." },
			{ tile: "P", msg: "🔒 Sealed Portcullis blocking passage." },
			{ tile: '"', msg: "🌾 Dry Brush detected. [F] SCORCH viable." },
			{ tile: "%", msg: "⚠️ Toxic Miasma detected! [V] DISPEL viable." },
			{ tile: "_", msg: "⚙️ Stone Pressure Plate nearby. Step to activate." },
			{ tile: "/", msg: "🔓 Portcullis open. Safe passage." },
			{ tile: "$", msg: "📦 Strongbox detected. Step to unlock." },
			{ tile: "*", msg: "💎 Resource Cache in range. [SPACE] Scavenge field cache." },
			{ tile: "H", msg: "🏨 The Hearth Inn nearby. [SPACE] Rest party & autosave." },
			{ tile: "N", msg: "📋 Town Notice Board in range. [SPACE] Read bulletins." },
			{ tile: "A", msg: "✨ Ancient Aether Shrine nearby. [SPACE] Commune & restore MP." },
			{ tile: "E", msg: "🧓 Elder Rowan in visual range. [SPACE] Converse." },
			{ tile: "D", msg: "🏰 Oakhaven Town Gate in range. [SPACE] Enter settlement." },
			{ tile: "O", msg: "🚪 Settlement Gate. [SPACE] Exit to Overworld." },
			{ tile: "S", msg: "⛩️ Catacombs Entrance detected. [SPACE] Descend into depths." },
			{ tile: ">", msg: "🪜 Descent Stairwell nearby. [SPACE] Descend deeper." },
			{ tile: "<", msg: "🪜 Ascending Stairwell nearby. [SPACE] Ascend to surface." },
			{ tile: "@", msg: "🐪 Wandering Caravan in visual range. [B] Trade." },
			{ tile: "C", msg: "🔥 Consecrated Campsite. Rest available." },
		];
		return hazardDefinitions
			.filter(({ tile }) => adjacentTiles.includes(tile))
			.map(({ msg }) => msg);
	}

	/**
	 * Dispatches acoustic hazard cues over the EventBus when signature changes.
	 * [State Mutating / Bus Dispatch]
	 * @param {string[]} adjacentTiles - Adjacent tile symbols.
	 * @returns {void}
	 */
	function dispatchHazardAcousticCue(adjacentTiles) {
		const signature = adjacentTiles
			.slice()
			.sort((a, b) => a.localeCompare(b))
			.join("");
		if (signature === lastScannedHazardSignature) return;
		lastScannedHazardSignature = signature;
		if (adjacentTiles.includes("~")) {
			if (eventBusRef)
				eventBusRef.publish("overworld:sfx", { sfx: "HAZARD_WATER", pan: 0.0 });
		} else if (adjacentTiles.includes("P")) {
			if (eventBusRef)
				eventBusRef.publish("overworld:sfx", {
					sfx: "HAZARD_PORTCULLIS",
					pan: 0.0,
				});
		}
	}

	/**
	 * Resolves warning alert message for overworld danger steps.
	 * @param {number} dangerSteps - Consecutive steps in danger zone.
	 * @returns {string | null}
	 */
	function resolveDangerStepAlert(dangerSteps) {
		if (dangerSteps >= 5) {
			return "🚨 Severe strata resonance! Hostile encounter imminent on next movement.";
		}
		if (dangerSteps >= 3) {
			return `⚠️ Subterranean vibrations detected (${dangerSteps}/5 steps). Encounter breach possible.`;
		}
		return null;
	}

	/**
	 * Updates environmental scanner alert display panel.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @returns {void}
	 */
	function updateScannerAlerts(snapshot) {
		if (typeof document === "undefined") return;
		const alertsEl = document.getElementById("scanner-alerts");
		const dock = document.getElementById("tactical-dock");
		if (!alertsEl || !dock) return;

		const map = snapshot?.activeMap || snapshot?.map || [];
		const px = snapshot?.worldPos?.x || snapshot?.playerPos?.x || 0;
		const py = snapshot?.worldPos?.y || snapshot?.playerPos?.y || 0;
		const adjacentTiles = getAdjacentTiles(map, px, py);

		updateScannerButtonSynergy(adjacentTiles, map, px, py);
		const messages = buildScannerHazardMessages(adjacentTiles);
		dispatchHazardAcousticCue(adjacentTiles);

		const dangerAlert = resolveDangerStepAlert(snapshot?.dangerSteps || 0);
		if (dangerAlert) {
			messages.push(dangerAlert);
		}

		const facingPrompt = snapshot?.facingPrompt;
		const facingBadge = facingPrompt
			? `<div class="facing-prompt-badge" style="color:var(--cyan); font-weight:bold; background:rgba(6,182,212,0.18); border:1px solid var(--cyan); padding:2px 5px; border-radius:3px; margin-bottom:4px; font-family:var(--font-mono, monospace); font-size:9.5px; letter-spacing:0.5px;">🎯 ${facingPrompt}</div>`
			: '';

		if (messages.length > 0 || facingBadge) {
			const msgsHtml = messages
				.map((m) => `<div style="color:var(--ember);">${m}</div>`)
				.join("");
			alertsEl.innerHTML = `${facingBadge}${msgsHtml}`;
		} else {
			alertsEl.innerHTML =
				'<span class="scanner-status">✨ Environmental scan nominal. Cobblestone stable.</span>';
		}
	}
	//#endregion

	//#region [SEC-06] Field Pouch Drawer & Item Targeting Handlers
	/**
	 * Renders interactive field pouch consumables drawer.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @param {(arg0: CockpitActionPayload) => void} dispatch - Action dispatcher.
	 * @returns {void}
	 */
	function renderFieldPouch(snapshot, dispatch) {
		if (typeof document === "undefined") return;
		const grid = document.getElementById("field-pouch-grid");
		const targetDrawer = document.getElementById("pouch-target-drawer");
		if (!grid) return;

		const inventory = snapshot?.inventory || {};
		/** @type {FieldPouchItem[]} */
		const items = [
			{
				id: "POTION",
				label: "Potion",
				effect: "+25 HP",
				count: inventory.POTION || 0,
			},
			{
				id: "ETHER",
				label: "Ether",
				effect: "+15 MP",
				count: inventory.ETHER || 0,
			},
			{
				id: "PHOENIX_EMBER",
				label: "Ember",
				effect: "Revive 50%",
				count: inventory.PHOENIX_EMBER || 0,
			},
		];

		grid.innerHTML = "";
		items.forEach((it) => {
			const btn = /** @type {HTMLButtonElement} */ (
				document.createElement("button")
			);
			btn.type = "button";
			btn.className = `field-pouch-btn ${activePouchSelectedItemId === it.id ? "active" : ""}`;
			btn.disabled = it.count <= 0;
			btn.innerHTML = `
        <div style="font-weight:bold; color:var(--ember); font-family:var(--font-mono, monospace); font-size:9.5px; letter-spacing:0.5px;">${it.label} (${it.count})</div>
        <div style="color:var(--text-dim); font-family:var(--font-mono, monospace); font-size:9px;">${it.effect}</div>
      `;
			btn.onclick = () => {
				activePouchSelectedItemId =
					activePouchSelectedItemId === it.id ? null : it.id;
				renderFieldPouch(snapshot, dispatch);
				if (activePouchSelectedItemId) {
					renderPouchTargetSelector(snapshot, it, targetDrawer, dispatch);
				} else if (targetDrawer) {
					targetDrawer.classList.add("hidden");
					targetDrawer.innerHTML = "";
				}
			};
			grid.appendChild(btn);
		});

		if (!activePouchSelectedItemId && targetDrawer) {
			targetDrawer.classList.add("hidden");
			targetDrawer.innerHTML = "";
		}
	}

	/**
	 * Renders squad target selection drawer for field consumable use.
	 * [DOM Presentation Render]
	 * @param {CockpitSimState} snapshot - Current simulation snapshot.
	 * @param {FieldPouchItem} item - Item definition.
	 * @param {HTMLElement|null} drawer - Target DOM container.
	 * @param {(arg0: CockpitActionPayload) => void} dispatch - Action dispatcher.
	 * @returns {void}
	 */
	function renderPouchTargetSelector(snapshot, item, drawer, dispatch) {
		if (!drawer) return;
		drawer.classList.remove("hidden");
		drawer.innerHTML = `
      <div style="font-family:var(--font-mono, monospace); font-size:9.5px; letter-spacing:0.5px; color:var(--ember); font-weight:bold; margin-bottom:4px;">
        Use ${item.label} on:
      </div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px;" id="pouch-target-buttons"></div>
    `;

		const btnContainer = /** @type {HTMLElement|null} */ (
			drawer.querySelector("#pouch-target-buttons")
		);
		const party = snapshot?.party || [];

		party.forEach((c) => {
			const tBtn = document.createElement("button");
			tBtn.type = "button";
			tBtn.className = "cmd-btn action pouch-target-btn";
			tBtn.style.fontSize = "6.5px";
			tBtn.style.padding = "3px 4px";
			tBtn.textContent = `${c.name} (${c.hp}/${c.maxHp})`;

			tBtn.onclick = () => {
				if (typeof dispatch === "function") {
					dispatch({
						type: "USE_FIELD_ITEM",
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

	//#section [SEC-07] Canvas Ambient Title Screen Animation Kernel & Vanguard Showcase
	/**
	 * Renders the 4-hero vanguard showcase pedestals on the Title screen.
	 * [DOM State Mutating]
	 * @returns {void}
	 */
	function renderTitleVanguardPedestals() {
		if (typeof document === "undefined") return;
		const container = document.getElementById("title-vanguard-pedestals");
		if (!container) return;

		// Canonical Vanguard Archetypes
		const defaultVanguard = [
			{
				instanceId: "hero",
				name: "Aldric",
				phenotype: "HERO",
				roleBadge: "Vanguard Blade",
				spec: "Shield & Sword // Retaliation",
				weapon: "IRON_SWORD",
				armor: "PLATE",
			},
			{
				instanceId: "warrior",
				name: "Brogan",
				phenotype: "WARRIOR",
				roleBadge: "Dreadnought",
				spec: "Greataxe // Frontline Cleave",
				weapon: "GREATAXE",
				armor: "CHAINMAIL",
			},
			{
				instanceId: "mage",
				name: "Selene",
				phenotype: "MAGE",
				roleBadge: "Arcanist",
				spec: "Oak Staff // Elemental Scorch",
				weapon: "OAK_STAFF",
				armor: "MAGE_ROBE",
			},
			{
				instanceId: "healer",
				name: "Wren",
				phenotype: "HEALER",
				roleBadge: "Sanctuary Hierophant",
				spec: "Sun Mace // Consecration",
				weapon: "SUN_MACE",
				armor: "CLERIC_VESTMENT",
			},
		];

		const baker =
			typeof EmberlightBattlerBaker !== "undefined" &&
			typeof (/** @type {any} */ (EmberlightBattlerBaker)).get === "function"
				? /** @type {any} */ (EmberlightBattlerBaker)
				: null;

		const html = defaultVanguard
			.map((hero) => {
				const spriteUrl = baker
					? baker.get({
							phenotype: hero.phenotype,
							weapon: hero.weapon,
							armor: hero.armor,
					  })
					: "";

				const imgMarkup = spriteUrl
					? `<img src="${spriteUrl}" alt="${hero.name}" class="pedestal-sprite" />`
					: `<div class="pedestal-sprite placeholder-sprite" style="font-size:32px; display:flex; align-items:center; justify-content:center;">⚔</div>`;

				return `
					<div class="vanguard-pedestal-card" data-hero-id="${hero.instanceId}">
						<div class="pedestal-sprite-container">
							${imgMarkup}
							<div class="pedestal-shadow"></div>
							<div class="pedestal-glow-ring"></div>
						</div>
						<div class="pedestal-meta">
							<div class="pedestal-name">${hero.name}</div>
							<div class="pedestal-class-badge">${hero.roleBadge}</div>
							<div class="pedestal-spec">${hero.spec}</div>
						</div>
					</div>
				`;
			})
			.join("");

		container.innerHTML = html;
	}

	/**
	 * Computes the 2D intersection point between a ray and a line segment.
	 * (Ray-segment parametric intersection solver)
	 * @param {{ p1: { x: number, y: number }, p2: { x: number, y: number } }} ray
	 * @param {{ p1: { x: number, y: number }, p2: { x: number, y: number } }} seg
	 * @returns {{ x: number, y: number, param: number } | null}
	 */
	function getRaySegmentIntersection(ray, seg) {
		const r_px = ray.p1.x;
		const r_py = ray.p1.y;
		const r_dx = ray.p2.x - ray.p1.x;
		const r_dy = ray.p2.y - ray.p1.y;

		const s_px = seg.p1.x;
		const s_py = seg.p1.y;
		const s_dx = seg.p2.x - seg.p1.x;
		const s_dy = seg.p2.y - seg.p1.y;

		const r_mag = Math.hypot(r_dx, r_dy);
		const s_mag = Math.hypot(s_dx, s_dy);
		if (r_mag === 0 || s_mag === 0) return null;
		if (Math.abs(r_dx / r_mag - s_dx / s_mag) < 1e-6 && Math.abs(r_dy / r_mag - s_dy / s_mag) < 1e-6) return null;

		const denominator = s_dx * r_dy - s_dy * r_dx;
		if (denominator === 0) return null;

		const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / denominator;
		const T1 = (s_px + s_dx * T2 - r_px) / r_dx;

		if (T1 < 0) return null;
		if (T2 < 0 || T2 > 1) return null;

		return {
			x: r_px + r_dx * T1,
			y: r_py + r_dy * T1,
			param: T1,
		};
	}

	/**
	 * Renders the deep obsidian sanctuary floor and stone paving grid lines.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} W
	 * @param {number} H
	 */
	function drawTitleFloor(ctx, W, H) {
		ctx.fillStyle = "#07060d";
		ctx.fillRect(0, 0, W, H);

		ctx.strokeStyle = "rgba(42, 33, 56, 0.35)";
		ctx.lineWidth = 1;
		const tileSize = 60;
		for (let x = 0; x < W; x += tileSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, H);
			ctx.stroke();
		}
		for (let y = 0; y < H; y += tileSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(W, y);
			ctx.stroke();
		}
	}

	/**
	 * Draws the torchlight radial gradient clipped to the visibility polygon.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} W
	 * @param {number} H
	 * @param {Array<{ x: number, y: number }>} poly
	 * @param {number} currentLightX
	 * @param {number} currentLightY
	 * @param {number} lightRadius
	 */
	function drawTitleTorchlight(ctx, W, H, poly, currentLightX, currentLightY, lightRadius) {
		if (poly.length <= 2) return;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(poly[0].x, poly[0].y);
		for (let i = 1; i < poly.length; i++) {
			ctx.lineTo(poly[i].x, poly[i].y);
		}
		ctx.closePath();
		ctx.clip();

		const radGrad = ctx.createRadialGradient(
			currentLightX,
			currentLightY,
			10,
			currentLightX,
			currentLightY,
			lightRadius
		);
		radGrad.addColorStop(0.0, "rgba(255, 230, 175, 0.75)");
		radGrad.addColorStop(0.15, "rgba(255, 175, 95, 0.52)");
		radGrad.addColorStop(0.38, "rgba(234, 88, 12, 0.28)");
		radGrad.addColorStop(0.68, "rgba(140, 45, 12, 0.12)");
		radGrad.addColorStop(0.92, "rgba(60, 20, 8, 0.04)");
		radGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");

		ctx.fillStyle = radGrad;
		ctx.fillRect(0, 0, W, H);

		const coreGrad = ctx.createRadialGradient(
			currentLightX,
			currentLightY,
			0,
			currentLightX,
			currentLightY,
			140
		);
		coreGrad.addColorStop(0, "rgba(255, 245, 210, 0.45)");
		coreGrad.addColorStop(0.6, "rgba(255, 175, 95, 0.2)");
		coreGrad.addColorStop(1, "rgba(255, 157, 77, 0)");
		ctx.fillStyle = coreGrad;
		ctx.fillRect(0, 0, W, H);

		ctx.restore();
	}

	/**
	 * Draws the architectural beveled pillars and stone segments.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Array<{ p1: { x: number, y: number }, p2: { x: number, y: number } }>} segments
	 * @param {number} W
	 * @param {number} H
	 */
	function drawTitleArchitecture(ctx, segments, W, H) {
		ctx.strokeStyle = "rgba(255, 175, 95, 0.45)";
		ctx.lineWidth = 2.5;
		for (let i = 4; i < segments.length; i++) {
			const seg = segments[i];
			ctx.beginPath();
			ctx.moveTo(seg.p1.x, seg.p1.y);
			ctx.lineTo(seg.p2.x, seg.p2.y);
			ctx.stroke();
		}

		ctx.fillStyle = "rgba(14, 12, 24, 0.95)";
		const pW = 42;
		const pH = 65;
		ctx.fillRect(W * 0.18 - pW + 4, H * 0.32 - pH + 4, (pW - 4) * 2, (pH - 4) * 2);
		ctx.fillRect(W * 0.18 - pW + 4, H * 0.72 - pH + 4, (pW - 4) * 2, (pH - 4) * 2);
		ctx.fillRect(W * 0.82 - pW + 4, H * 0.32 - pH + 4, (pW - 4) * 2, (pH - 4) * 2);
		ctx.fillRect(W * 0.82 - pW + 4, H * 0.72 - pH + 4, (pW - 4) * 2, (pH - 4) * 2);
	}

	/**
	 * Updates particle lifespans and renders rising ember auras.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Array<{ x: number, y: number, vx: number, vy: number, size: number, alpha: number, life: number, maxLife: number }>} embers
	 * @param {number} W
	 * @param {number} H
	 * @param {number} t
	 */
	function updateAndDrawTitleEmbers(ctx, embers, W, H, t) {
		for (let i = 0; i < embers.length; i++) {
			const p = embers[i];
			p.life++;
			p.x += p.vx + Math.sin((t + i) * 1.4) * 0.45;
			p.y += p.vy;

			const normLife = p.life / p.maxLife;
			const alpha =
				normLife < 0.2
					? (normLife / 0.2) * p.alpha
					: (1 - (normLife - 0.2) / 0.8) * p.alpha;

			if (p.life >= p.maxLife || p.y < -10) {
				p.life = 0;
				p.x = Math.random() * W; // NOSONAR: Visual ambient particles
				p.y = H + Math.random() * 20; // NOSONAR
				p.vx = (Math.random() - 0.5) * 0.6; // NOSONAR
				p.vy = -(0.5 + Math.random() * 1.3); // NOSONAR
				p.alpha = 0.25 + Math.random() * 0.65; // NOSONAR
			}

			if (alpha > 0.01) {
				ctx.fillStyle = `rgba(255, 175, 75, ${alpha.toFixed(3)})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fill();

				if (p.size > 2.0) {
					ctx.fillStyle = `rgba(255, 100, 30, ${(alpha * 0.4).toFixed(3)})`;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}
	}

	/**
	 * Initiates continuous 2D raycasting visibility polygon torchlight & rising ember particles
	 * on the Title Screen background canvas.
	 * [Canvas Animation Render]
	 * @param {() => string} getActiveDistrict - District state query callback.
	 * @param {string} [canvasId='title-bg-canvas'] - Target canvas element ID.
	 * @returns {void}
	 */
	function startTitleAnimation(
		getActiveDistrict,
		canvasId = "title-bg-canvas"
	) {
		if (typeof document === "undefined") return;
		const canvas = /** @type {HTMLCanvasElement|null} */ (
			document.getElementById(canvasId)
		);
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Cancel any existing active loop
		if (titleAnimId && typeof cancelAnimationFrame !== "undefined") {
			cancelAnimationFrame(titleAnimId);
			titleAnimId = null;
		}

		// Buffer resolution
		const W = canvas.width || 1280;
		const H = canvas.height || 720;

		// 1. Geometry: Outer boundaries & 4 architectural stone pillars with beveled facets
		/** @type {Array<{ p1: { x: number, y: number }, p2: { x: number, y: number } }>} */
		const segments = [];
		function addSeg(/** @type {number} */ x1, /** @type {number} */ y1, /** @type {number} */ x2, /** @type {number} */ y2) {
			segments.push({ p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } });
		}

		// Outer boundary walls
		addSeg(0, 0, W, 0);
		addSeg(W, 0, W, H);
		addSeg(W, H, 0, H);
		addSeg(0, H, 0, 0);

		// Architectural Pillars with beveled corners (Left Upper, Left Lower, Right Upper, Right Lower)
		function addPillar(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ halfW, /** @type {number} */ halfH, /** @type {number} */ bevel) {
			const x1 = cx - halfW;
			const x2 = cx + halfW;
			const y1 = cy - halfH;
			const y2 = cy + halfH;
			const b = bevel;
			addSeg(x1 + b, y1, x2 - b, y1);
			addSeg(x2 - b, y1, x2, y1 + b);
			addSeg(x2, y1 + b, x2, y2 - b);
			addSeg(x2, y2 - b, x2 - b, y2);
			addSeg(x2 - b, y2, x1 + b, y2);
			addSeg(x1 + b, y2, x1, y2 - b);
			addSeg(x1, y2 - b, x1, y1 + b);
			addSeg(x1, y1 + b, x1 + b, y1);
		}

		// 4 Sanctuary Column Pillars
		addPillar(W * 0.18, H * 0.32, 42, 65, 12);
		addPillar(W * 0.18, H * 0.72, 42, 65, 12);
		addPillar(W * 0.82, H * 0.32, 42, 65, 12);
		addPillar(W * 0.82, H * 0.72, 42, 65, 12);

		// Central Sanctuary Archway Ledges
		addSeg(W * 0.38, H * 0.88, W * 0.62, H * 0.88);
		addSeg(W * 0.38, H * 0.88, W * 0.40, H * 0.94);
		addSeg(W * 0.62, H * 0.88, W * 0.60, H * 0.94);

		// 2. Visibility Polygon Slicer
		function computeVisibilityPolygon(/** @type {number} */ ox, /** @type {number} */ oy) {
			const points = [];
			for (const seg of segments) {
				points.push(seg.p1, seg.p2);
			}

			const angles = [];
			for (const pt of points) {
				const ang = Math.atan2(pt.y - oy, pt.x - ox);
				angles.push(ang, ang - 0.0001, ang + 0.0001);
			}

			/** @type {Array<{ x: number, y: number, param: number, angle: number }>} */
			const hits = [];
			const maxDist = Math.max(W, H) * 1.5;
			for (const a of angles) {
				const ray = {
					p1: { x: ox, y: oy },
					p2: { x: ox + Math.cos(a) * maxDist, y: oy + Math.sin(a) * maxDist },
				};
				/** @type {{ x: number, y: number, param: number } | null} */
				let closest = null;
				for (const seg of segments) {
					const hit = getRaySegmentIntersection(ray, seg);
					if (!hit) continue;
					if (!closest || hit.param < closest.param) {
						closest = hit;
					}
				}
				if (closest) {
					hits.push({ ...closest, angle: a });
				}
			}

			hits.sort((a, b) => a.angle - b.angle);
			return hits;
		}

		// 3. Rising Ember Particle System
		const NUM_EMBERS = 40;
		/** @type {Array<{ x: number, y: number, vx: number, vy: number, size: number, alpha: number, life: number, maxLife: number }>} */
		const embers = [];
		for (let i = 0; i < NUM_EMBERS; i++) {
			embers.push({
				x: Math.random() * W, // NOSONAR: Visual ambient particles
				y: Math.random() * H, // NOSONAR
				vx: (Math.random() - 0.5) * 0.6, // NOSONAR
				vy: -(0.5 + Math.random() * 1.2), // NOSONAR
				size: 1 + Math.random() * 2.2, // NOSONAR
				alpha: 0.2 + Math.random() * 0.7, // NOSONAR
				life: Math.random() * 200, // NOSONAR
				maxLife: 150 + Math.random() * 120, // NOSONAR
			});
		}

		// Mouse tracking lerp
		let targetLightX = W * 0.5;
		let targetLightY = H * 0.45;
		let currentLightX = W * 0.5;
		let currentLightY = H * 0.45;

		const titleView = document.getElementById("title-view");
		const onMouseMove = (/** @type {MouseEvent} */ e) => {
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				const scaleX = W / rect.width;
				const scaleY = H / rect.height;
				targetLightX = (e.clientX - rect.left) * scaleX;
				targetLightY = (e.clientY - rect.top) * scaleY;
			}
		};
		if (titleView) {
			titleView.addEventListener("mousemove", onMouseMove, { passive: true });
		}

		let t = 0;

		function renderTitleFrame() {
			if (!ctx || !canvas) return;
			const activeDistrict =
				typeof getActiveDistrict === "function" ? getActiveDistrict() : "TITLE";
			if (activeDistrict !== "TITLE") {
				titleAnimId = null;
				if (titleView) {
					titleView.removeEventListener("mousemove", onMouseMove);
				}
				return;
			}

			t += 0.02;

			// Smooth Lissajous wander + Mouse tracking interpolation
			const lissajousX = W * 0.5 + Math.sin(t * 0.6) * 120 + Math.cos(t * 0.23) * 60;
			const lissajousY = H * 0.45 + Math.cos(t * 0.75) * 55 + Math.sin(t * 0.31) * 30;

			currentLightX += ((lissajousX * 0.65 + targetLightX * 0.35) - currentLightX) * 0.06;
			currentLightY += ((lissajousY * 0.65 + targetLightY * 0.35) - currentLightY) * 0.06;

			// Organic torch flicker
			const flicker =
				Math.sin(t * 11.3) * 8 +
				Math.cos(t * 23.7) * 5 +
				Math.sin(t * 47.1) * 3;
			const lightRadius = Math.max(500, 780 + flicker);

			// 1. Draw Deep Obsidian Floor
			drawTitleFloor(ctx, W, H);

			// 2. Calculate Visibility Polygon
			const poly = computeVisibilityPolygon(currentLightX, currentLightY);

			// 3. Draw Torchlight Radial Gradient clipped to Visibility Polygon
			drawTitleTorchlight(ctx, W, H, poly, currentLightX, currentLightY, lightRadius);

			// 4. Render Architectural Stone Segments & Pillar Silhouettes
			drawTitleArchitecture(ctx, segments, W, H);

			// 5. Update and Draw Rising Embers Particles
			updateAndDrawTitleEmbers(ctx, embers, W, H, t);

			if (typeof requestAnimationFrame !== "undefined") {
				titleAnimId = requestAnimationFrame(renderTitleFrame);
			}
		}

		if (typeof requestAnimationFrame !== "undefined") {
			titleAnimId = requestAnimationFrame(renderTitleFrame);
		}
	}

	/**
	 * Draws the CRT reticle background and grid axes.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} W
	 * @param {number} H
	 * @param {number} midY
	 */
	function drawOscilloscopeGrid(ctx, W, H, midY) {
		ctx.fillStyle = "rgba(4, 9, 8, 0.94)";
		ctx.fillRect(0, 0, W, H);

		ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
		ctx.lineWidth = 1;
		const cols = 8;
		const rows = 4;
		for (let c = 1; c < cols; c++) {
			const gx = (W / cols) * c;
			ctx.beginPath();
			ctx.moveTo(gx, 0);
			ctx.lineTo(gx, H);
			ctx.stroke();
		}
		for (let r = 1; r < rows; r++) {
			const gy = (H / rows) * r;
			ctx.beginPath();
			ctx.moveTo(0, gy);
			ctx.lineTo(W, gy);
			ctx.stroke();
		}

		ctx.strokeStyle = "rgba(255, 157, 77, 0.16)";
		ctx.beginPath();
		ctx.moveTo(0, midY);
		ctx.lineTo(W, midY);
		ctx.stroke();
	}

	/**
	 * Evaluates wave harmonics based on terrain and danger steps.
	 * @param {CockpitSimState|null} snapshot
	 * @param {number} tremorImpulse
	 */
	function computeResonanceParams(snapshot, tremorImpulse) {
		const map = snapshot?.activeMap || snapshot?.map || [];
		const px = snapshot?.worldPos?.x || snapshot?.playerPos?.x || 0;
		const py = snapshot?.worldPos?.y || snapshot?.playerPos?.y || 0;
		const dangerSteps = snapshot?.dangerSteps || 0;
		const adj = getAdjacentTiles(map, px, py);

		const isWater = adj.includes("~");
		const isMiasma = adj.includes("%");
		const isPortcullis = adj.includes("P");

		let baseAmp = 11 + Math.min(14, dangerSteps * 2.5);
		let carrierFreq = 3.2;
		let harmonicFreq = 7.1;
		let noiseJitter = dangerSteps >= 3 ? Math.min(6, dangerSteps * 1.2) : 0;
		let freqDisplay = "432.8 Hz // LEY-RESONANCE: NOMINAL";
		let statusDisplay = "TRACE: STRATA STABLE";
		let statusColor = "var(--ok)";

		if (dangerSteps >= 5) {
			freqDisplay = "620.4 Hz // SEISMIC SURGE: CRITICAL";
			statusDisplay = "TRACE: AMBUSH IMMINENT";
			statusColor = "var(--danger)";
		} else if (dangerSteps >= 3) {
			freqDisplay = "512.0 Hz // STRATA HARMONIC: ELEVATED";
			statusDisplay = `TRACE: ENCOUNTER RISK (${dangerSteps}/5)`;
			statusColor = "var(--ember)";
		}

		if (isWater) {
			baseAmp = 16;
			carrierFreq = 1.6;
			harmonicFreq = 3.8;
			freqDisplay = "128.4 Hz // ACOUSTIC FLOW: HYDRO-CHASM";
			statusDisplay = "TRACE: FLUIDIC SWELL";
			statusColor = "var(--cyan)";
		} else if (isMiasma) {
			baseAmp = 15;
			carrierFreq = 8.6;
			noiseJitter = 4.5;
			freqDisplay = "892.1 Hz // STRATA DISTORTION: MIASMA";
			statusDisplay = "TRACE: TOXIC HARMONIC";
			statusColor = "var(--danger)";
		} else if (isPortcullis) {
			freqDisplay = "216.0 Hz // RESONANCE: IRON PORTCULLIS";
			statusDisplay = "TRACE: METALLIC DAMPING";
			statusColor = "var(--ember)";
		}

		if (tremorImpulse > 0.05) {
			baseAmp += tremorImpulse * 12;
			freqDisplay = `564.2 Hz // SEISMIC IMPULSE: +${Math.round(tremorImpulse * 100)}%`;
			statusDisplay = "TRACE: VIBRATION SPIKE";
			statusColor = "var(--ember)";
		}

		return {
			baseAmp,
			carrierFreq,
			harmonicFreq,
			noiseJitter,
			freqDisplay,
			statusDisplay,
			statusColor,
			isWater,
			isMiasma,
		};
	}

	/**
	 * Updates oscilloscope telemetry DOM elements if present.
	 * @param {string} freqDisplay
	 * @param {string} statusDisplay
	 * @param {string} statusColor
	 */
	function updateOscilloscopeTelemetryDOM(freqDisplay, statusDisplay, statusColor) {
		const freqEl = document.getElementById("scope-freq-readout");
		if (freqEl && freqEl.textContent !== freqDisplay) freqEl.textContent = freqDisplay;
		const statEl = document.getElementById("scope-status-tag");
		if (statEl) {
			if (statEl.textContent !== statusDisplay) statEl.textContent = statusDisplay;
			statEl.style.color = statusColor;
		}
	}

	/**
	 * Renders sub-harmonic trace line.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} W
	 * @param {number} midY
	 * @param {number} carrierFreq
	 * @param {number} baseAmp
	 * @param {number} time
	 */
	function drawOscilloscopeSubHarmonic(ctx, W, midY, carrierFreq, baseAmp, time) {
		ctx.save();
		ctx.strokeStyle = "rgba(56, 189, 248, 0.40)";
		ctx.shadowColor = "#38bdf8";
		ctx.shadowBlur = 4;
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		for (let x = 0; x < W; x += 3) {
			const rad = (x / W) * Math.PI * 2 * (carrierFreq * 0.5) + time * 0.8;
			const y = midY + Math.sin(rad) * (baseAmp * 0.42);
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Resolves stroke and shadow color palette for the primary trace.
	 * @param {boolean} isMiasma
	 * @param {boolean} isWater
	 * @returns {{ stroke: string, shadow: string }}
	 */
	function resolveTracePalette(isMiasma, isWater) {
		if (isMiasma) {
			return { stroke: "#f87171", shadow: "#ef4444" };
		}
		if (isWater) {
			return { stroke: "#38bdf8", shadow: "#0ea5e9" };
		}
		return { stroke: "rgba(255, 175, 55, 0.95)", shadow: "#ff9d4d" };
	}

	/**
	 * Renders primary glowing phosphor waveform trace.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} W
	 * @param {number} midY
	 * @param {any} p
	 * @param {number} time
	 * @param {number} tremorImpulse
	 */
	function drawOscilloscopePrimaryTrace(ctx, W, midY, p, time, tremorImpulse) {
		const palette = resolveTracePalette(p.isMiasma, p.isWater);
		ctx.save();
		ctx.strokeStyle = palette.stroke;
		ctx.shadowColor = palette.shadow;
		ctx.shadowBlur = 7;
		ctx.lineWidth = 1.7;
		ctx.beginPath();
		for (let x = 0; x < W; x += 2) {
			const phase1 = (x / W) * Math.PI * 2 * p.carrierFreq + time * 2.2;
			const phase2 = (x / W) * Math.PI * 2 * p.harmonicFreq - time * 1.4;
			const jitter = p.noiseJitter ? Math.sin(x * 12.3 + time * 15) * p.noiseJitter : 0;
			const seismic = tremorImpulse > 0.05
				? Math.sin((x / W) * Math.PI * 8 + time * 12) * (tremorImpulse * 7)
				: 0;

			const y = midY + Math.sin(phase1) * (p.baseAmp * 0.75) + Math.sin(phase2) * (p.baseAmp * 0.25) + jitter + seismic;
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Draws cathode ray sweep overlay.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} W
	 * @param {number} H
	 * @param {number} time
	 */
	function drawOscilloscopeSweep(ctx, W, H, time) {
		const sweepX = (time * 85) % W;
		const sweepGrad = ctx.createLinearGradient(sweepX - 25, 0, sweepX, 0);
		sweepGrad.addColorStop(0, "transparent");
		sweepGrad.addColorStop(1, "rgba(255, 200, 100, 0.12)");
		ctx.fillStyle = sweepGrad;
		ctx.fillRect(Math.max(0, sweepX - 25), 0, 25, H);
	}

	/**
	 * Renders a single frame of the Resonance Spectrograph Oscilloscope.
	 * [Canvas Animation Kernel]
	 * @returns {void}
	 */
	function renderOscilloscopeFrame() {
		if (typeof document === "undefined") return;
		const canvas = /** @type {HTMLCanvasElement|null} */ (
			document.getElementById("resonance-spectrograph-canvas")
		);
		if (!canvas) {
			scopeAnimId = null;
			return;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			scopeAnimId = null;
			return;
		}

		const pane = document.getElementById("overworld-scanner-content");
		if (pane && window.getComputedStyle?.(pane).display === "none") {
			if (typeof requestAnimationFrame !== "undefined") {
				scopeAnimId = requestAnimationFrame(renderOscilloscopeFrame);
			}
			return;
		}

		scopeTime += 0.038;
		seismicTremorImpulse *= 0.93;

		const W = canvas.width || 440;
		const H = canvas.height || 84;
		const midY = H / 2;

		drawOscilloscopeGrid(ctx, W, H, midY);

		const params = computeResonanceParams(lastScopeSnapshot, seismicTremorImpulse);
		updateOscilloscopeTelemetryDOM(params.freqDisplay, params.statusDisplay, params.statusColor);

		drawOscilloscopeSubHarmonic(ctx, W, midY, params.carrierFreq, params.baseAmp, scopeTime);
		drawOscilloscopePrimaryTrace(ctx, W, midY, params, scopeTime, seismicTremorImpulse);
		drawOscilloscopeSweep(ctx, W, H, scopeTime);

		if (typeof requestAnimationFrame !== "undefined") {
			scopeAnimId = requestAnimationFrame(renderOscilloscopeFrame);
		}
	}

	/**
	 * Ingests simulation snapshot and activates oscilloscope rendering.
	 * @param {CockpitSimState|null} snapshot - State snapshot.
	 * @returns {void}
	 */
	function updateOscilloscopeState(snapshot) {
		lastScopeSnapshot = snapshot;
		const curPos = snapshot?.worldPos || snapshot?.playerPos;
		if (curPos && lastRecordedPlayerPos) {
			if (curPos.x !== lastRecordedPlayerPos.x || curPos.y !== lastRecordedPlayerPos.y) {
				seismicTremorImpulse = 1.0;
			}
		}
		if (curPos) lastRecordedPlayerPos = { x: curPos.x, y: curPos.y };

		if (!scopeAnimId && typeof requestAnimationFrame !== "undefined") {
			scopeAnimId = requestAnimationFrame(renderOscilloscopeFrame);
		}
	}
	//#endregion

	//#region [SEC-07B] Tactical Focal Ring & Target Chassis Helpers
	/**
	 * Resolves target bounding box and center coordinates.
	 * @param {any} meta - Target metadata descriptor.
	 * @returns {{ bbox: { left: number, top: number, width: number, height: number }, centerX: number, centerY: number, orbitRadius: number }}
	 */
	function resolveTargetGeometry(meta) {
		let bbox = meta?.bbox;
		if (!bbox && meta?.targetDom && typeof meta.targetDom.getBoundingClientRect === 'function') {
			bbox = meta.targetDom.getBoundingClientRect();
		}
		if (!bbox) {
			const left = typeof window !== 'undefined' ? window.innerWidth / 2 - 24 : 0;
			const top = typeof window !== 'undefined' ? window.innerHeight / 2 - 24 : 0;
			bbox = { left, top, width: 48, height: 48 };
		}
		const centerX = bbox.left + bbox.width / 2;
		const centerY = bbox.top + bbox.height / 2;
		const orbitRadius = meta?.category === "3D_SENSOR" ? 36 : Math.max(38, Math.max(bbox.width, bbox.height) / 2 + 18);
		return { bbox, centerX, centerY, orbitRadius };
	}

	/**
	 * Computes dynamic gauge color based on remaining health percentage.
	 * @param {number} hpPct - Health percentage (0-100).
	 * @returns {string} Hex or HSL color string.
	 */
	function getCrownGaugeColor(hpPct) {
		if (hpPct > 50) return '#4ade80';
		if (hpPct > 25) return '#fbbf24';
		return '#ef4444';
	}

	/**
	 * Positions and updates the elevated crown banner.
	 * @param {any} meta - Target metadata descriptor.
	 * @param {number} centerX - Target center X.
	 * @param {number} centerY - Target center Y.
	 * @param {number} orbitRadius - Radial orbit offset.
	 */
	function updateCrownBanner(meta, centerX, centerY, orbitRadius) {
		const crown = document.getElementById('crown-banner');
		const crownTitle = document.getElementById('crown-title');
		const crownGauge = document.getElementById('crown-gauge');
		const badge1 = document.getElementById('badge-1');
		const badge2 = document.getElementById('badge-2');

		if (crown) {
			crown.style.left = `${centerX}px`;
			crown.style.top = `${Math.max(64, centerY - orbitRadius - 34)}px`;
		}
		if (crownTitle) crownTitle.textContent = meta?.title || 'TARGET';
		if (crownGauge) {
			const hpPct = typeof meta?.hpPct === 'number' ? Math.max(0, Math.min(100, meta.hpPct)) : 100;
			crownGauge.style.width = `${hpPct}%`;
			crownGauge.style.background = getCrownGaugeColor(hpPct);
		}
		if (badge1) badge1.textContent = meta?.badge1 || 'TARGET';
		if (badge2) badge2.textContent = meta?.badge2 || 'TACTICAL';
	}

	/**
	 * Positions satellite leaves along cardinal axes.
	 * @param {{ north?: HTMLElement|null, south?: HTMLElement|null, east?: HTMLElement|null, west?: HTMLElement|null }} leaves - Map of cardinal leaf elements.
	 * @param {number} centerX - Target center X.
	 * @param {number} centerY - Target center Y.
	 * @param {number} orbitRadius - Radial orbit offset.
	 */
	function positionCardinalLeaves(leaves, centerX, centerY, orbitRadius) {
		const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
		const winH = typeof window !== 'undefined' ? window.innerHeight : 600;

		if (leaves.north) {
			leaves.north.style.left = `${centerX}px`;
			leaves.north.style.top = `${Math.max(30, centerY - orbitRadius)}px`;
		}
		if (leaves.south) {
			leaves.south.style.left = `${centerX}px`;
			leaves.south.style.top = `${Math.min(winH - 30, centerY + orbitRadius)}px`;
		}
		if (leaves.east) {
			leaves.east.style.left = `${Math.min(winW - 30, centerX + orbitRadius)}px`;
			leaves.east.style.top = `${centerY}px`;
		}
		if (leaves.west) {
			leaves.west.style.left = `${Math.max(30, centerX - orbitRadius)}px`;
			leaves.west.style.top = `${centerY}px`;
		}
	}

	/**
	 * Updates a single leaf's icon, label, and dataset tooltips.
	 * @param {HTMLElement|null} leaf - Target leaf DOM element.
	 * @param {string} iconId - ID of the icon span.
	 * @param {string} labelId - ID of the label span.
	 * @param {{ icon?: string, label?: string, title?: string, desc?: string } | undefined} action - Configured action struct.
	 * @param {{ defaultIcon: string, defaultLabel: string, defaultTitle: string, defaultDesc: string }} defaults - Fallback values.
	 */
	function configureLeafAction(leaf, iconId, labelId, action, defaults) {
		if (!leaf) return;
		const iconEl = document.getElementById(iconId);
		const labelEl = document.getElementById(labelId);

		const icon = action?.icon || defaults.defaultIcon;
		const label = action?.label || defaults.defaultLabel;
		const title = action?.title || defaults.defaultTitle;
		const desc = action?.desc || defaults.defaultDesc;

		if (iconEl) iconEl.textContent = icon;
		if (labelEl) labelEl.textContent = label;
		leaf.dataset.tooltipTitle = title;
		leaf.dataset.tooltipDesc = desc;
	}

	/**
	 * Binds interaction events and parchment tooltip triggers to cardinal leaves.
	 * @param {Array<HTMLElement|null>} leafList - Array of leaf elements.
	 * @param {any} meta - Target metadata descriptor.
	 * @param {(arg0: string, arg1: any) => void} [onSelect] - Action execution callback.
	 * @param {(arg0: string, arg1: string, arg2: number, arg3: number) => void} [showTooltip] - Tooltip show callback.
	 * @param {() => void} [hideTooltip] - Tooltip hide callback.
	 */
	function bindLeafEventHandlers(leafList, meta, onSelect, showTooltip, hideTooltip) {
		leafList.forEach((leaf) => {
			if (!leaf) return;
			leaf.onclick = (e) => {
				if (e) e.stopPropagation();
				const dir = leaf.dataset.direction;
				if (typeof onSelect === 'function' && dir) onSelect(dir, meta);
			};
			leaf.onmouseenter = () => {
				const title = leaf.dataset.tooltipTitle || '';
				const desc = leaf.dataset.tooltipDesc || '';
				const leafBounds = leaf.getBoundingClientRect();
				if (typeof showTooltip === 'function') {
					showTooltip(title, desc, leafBounds.left + leafBounds.width / 2, leafBounds.top + leafBounds.height + 6);
				}
			};
			leaf.onmouseleave = () => {
				if (typeof hideTooltip === 'function') {
					hideTooltip();
				}
			};
		});
	}
	//#endregion

	//#region [SEC-08] Canonical Peripheral Driver Interface & Module Exports
	return {
		/**
		 * Initializes peripheral driver environment references and global input listeners.
		 * [Lifecycle: INIT]
		 * @param {CockpitContext} [context] - Host context containing event bus.
		 * @returns {void}
		 */
		init(context) {
			eventBusRef = context?.eventBus || null;

			if (typeof window !== "undefined" && !window._emberlightSpacebarWired) {
				window._emberlightSpacebarWired = true;
				window.addEventListener("keydown", (e) => {
					if (e.code === "Space" || e.key === " ") {
						e.preventDefault();
						if (eventBusRef && typeof eventBusRef.publish === "function") {
							eventBusRef.publish("input:action", { action: "INTERACT" });
						}
					}
				});
			}
		},

		/**
		 * Renders complete tactical cockpit HUD and drawer components.
		 * [DOM Presentation Render]
		 * @param {CockpitSimState} snapshot - Simulation state snapshot.
		 * @param {(arg0: CockpitActionPayload) => void} dispatch - Action dispatcher.
		 * @returns {void}
		 */
		render(snapshot, dispatch) {
			renderPartyHUD(snapshot);
			renderMiniHUD(snapshot);
			updateScannerAlerts(snapshot);
			updateOscilloscopeState(snapshot);
			updateQuestTicker(snapshot);

			const isPouchOpen = Boolean(snapshot?.pouchOpen);
			if (isPouchOpen) {
				showElement("exploration-pouch-drawer");
				renderFieldPouch(snapshot, dispatch);
			} else {
				hideElement("exploration-pouch-drawer");
			}
		},

		/**
		 * Renders cockpit viewport (alias to render).
		 * [DOM Presentation Render]
		 * @param {CockpitSimState} snapshot - Simulation state snapshot.
		 * @param {(arg0: CockpitActionPayload) => void} dispatch - Action dispatcher.
		 * @returns {void}
		 */
		renderCockpit(snapshot, dispatch) {
			this.render(snapshot, dispatch);
		},

		renderPartyHUD,
		renderMiniHUD,
		updateScannerAlerts,
		updateOscilloscopeState,
		renderOscilloscopeFrame,
		updateQuestTicker,
		renderFieldPouch,
		renderTitleVanguardPedestals,
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
				driverId: "cockpit_renderer",
				isQ4DeckExpanded,
				is3DViewExpanded,
			};
		},

		// --- Tactical Focal Ring & Target Chassis (ARCH-SPEC-RMB-INTEGRATION-001) ---
		/**
		 * Sets dynamic CSS chromatic attunement custom properties on root.
		 * @param {string} accent - Reticle border & highlight color.
		 * @param {string} glow - Reticle box-shadow ambient glow.
		 * @returns {void}
		 */
		setReticleTheme(accent = '#ff9d4d', glow = 'rgba(255, 157, 77, 0.45)') {
			if (typeof document === 'undefined') return;
			if (document.documentElement?.style?.setProperty) {
				document.documentElement.style.setProperty('--reticle-accent', accent);
				document.documentElement.style.setProperty('--reticle-glow', glow);
			}
		},

		/**
		 * Deploys the target-bound chassis, elevated crown, and cardinal leaves.
		 * @param {any} meta - Target metadata descriptor.
		 * @param {(arg0: string, arg1: any) => void} [onSelect] - Action execution callback.
		 * @returns {void}
		 */
		deployTacticalChassis(meta, onSelect) {
			if (typeof document === 'undefined' || !meta) return;

			const focalRing = document.getElementById('focal-ring');
			const vignette = document.getElementById('tactical-vignette');
			const bracket = document.getElementById('target-bounding-bracket');
			if (!focalRing || !bracket) return;

			// 1. Resolve geometry & position halo bracket
			const { bbox, centerX, centerY, orbitRadius } = resolveTargetGeometry(meta);
			bracket.style.left = `${Math.max(0, bbox.left)}px`;
			bracket.style.top = `${Math.max(0, bbox.top)}px`;
			bracket.style.width = `${bbox.width}px`;
			bracket.style.height = `${bbox.height}px`;

			// 2. Position & populate elevated crown
			updateCrownBanner(meta, centerX, centerY, orbitRadius);

			// 3. Position and configure cardinal satellite leaves
			const leaves = {
				north: document.getElementById('leaf-north'),
				east: document.getElementById('leaf-east'),
				south: document.getElementById('leaf-south'),
				west: document.getElementById('leaf-west'),
			};
			positionCardinalLeaves(leaves, centerX, centerY, orbitRadius);

			configureLeafAction(leaves.north, 'leaf-north-icon', 'leaf-north-label', meta.northAction, {
				defaultIcon: '🎒',
				defaultLabel: 'Satchel',
				defaultTitle: 'Expedition Satchel',
				defaultDesc: 'Access squad alchemical pharmacopoeia and vital tinctures.',
			});
			configureLeafAction(leaves.east, 'leaf-east-icon', 'leaf-east-label', meta.eastAction, {
				defaultIcon: '⚡',
				defaultLabel: 'Action',
				defaultTitle: 'Context Action',
				defaultDesc: 'Execute tactical interaction.',
			});
			configureLeafAction(leaves.south, 'leaf-south-icon', 'leaf-south-label', meta.southAction, {
				defaultIcon: '🛡️',
				defaultLabel: 'Guard',
				defaultTitle: 'Tactical Stance',
				defaultDesc: 'Assume defensive posture or rest at camp.',
			});
			configureLeafAction(leaves.west, 'leaf-west-icon', 'leaf-west-label', meta.westAction, {
				defaultIcon: '👁️',
				defaultLabel: 'Scan',
				defaultTitle: 'Area Survey',
				defaultDesc: 'Scan surrounding sector for hidden hazards.',
			});

			// 4. Chromatic Attunement
			this.setReticleTheme(meta.accent || '#ff9d4d', meta.glow || 'rgba(255, 157, 77, 0.45)');

			// 5. Bind Click & Hover Handlers
			bindLeafEventHandlers(
				[leaves.north, leaves.east, leaves.south, leaves.west],
				meta,
				onSelect,
				(title, desc, x, y) => this.showParchmentTooltip(title, desc, x, y),
				() => this.hideParchmentTooltip(),
			);

			if (vignette) vignette.classList.add('active');
			if (meta?.category === "3D_SENSOR") {
				focalRing.classList.add('oculus-mode');
			} else {
				focalRing.classList.remove('oculus-mode');
			}
			focalRing.classList.add('active');
		},

		/**
		 * Dismisses the tactical focal ring chassis and clears tooltips.
		 * @returns {void}
		 */
		dismissTacticalChassis() {
			if (typeof document === 'undefined') return;
			const focalRing = document.getElementById('focal-ring');
			const vignette = document.getElementById('tactical-vignette');
			if (focalRing) {
				focalRing.classList.remove('active', 'oculus-mode');
			}
			if (vignette) vignette.classList.remove('active');
			this.clearLeafHighlights();
			this.hideParchmentTooltip();
		},

		/**
		 * Highlights a specific satellite leaf during hold-and-snap gestures.
		 * @param {'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | null} dir - Cardinal direction.
		 * @returns {void}
		 */
		highlightLeaf(dir) {
			if (typeof document === 'undefined') return;
			const leaves = document.querySelectorAll('.ring-leaf');
			leaves.forEach((node) => {
				const leaf = /** @type {HTMLElement} */ (node);
				const isTarget = leaf.dataset.direction === dir;
				leaf.classList.toggle('gesture-targeted', isTarget);
				if (isTarget) {
					const title = leaf.dataset.tooltipTitle || '';
					const desc = leaf.dataset.tooltipDesc || '';
					const leafBounds = leaf.getBoundingClientRect();
					this.showParchmentTooltip(title, desc, leafBounds.left + leafBounds.width / 2, leafBounds.top + leafBounds.height + 6);
				}
			});
			if (!dir) this.hideParchmentTooltip();
		},

		/**
		 * Clears all gesture highlights from cardinal leaves.
		 * @returns {void}
		 */
		clearLeafHighlights() {
			if (typeof document === 'undefined') return;
			const leaves = document.querySelectorAll('.ring-leaf');
			leaves.forEach((node) => {
				const leaf = /** @type {HTMLElement} */ (node);
				leaf.classList.remove('gesture-targeted');
			});
		},

		/**
		 * Displays the unrolling parchment scroll tooltip at coordinates.
		 * @param {string} title - Header title.
		 * @param {string} desc - Body description.
		 * @param {number} x - Center X position.
		 * @param {number} y - Top Y position.
		 * @returns {void}
		 */
		showParchmentTooltip(title, desc, x, y) {
			if (typeof document === 'undefined') return;
			const tooltip = document.getElementById('scroll-tooltip');
			const titleEl = document.getElementById('scroll-title');
			const descEl = document.getElementById('scroll-desc');
			if (!tooltip || !title) return;

			if (titleEl) titleEl.textContent = title;
			if (descEl) descEl.textContent = desc;

			tooltip.style.left = `${Math.max(10, Math.min(window.innerWidth - 170, x - 80))}px`;
			tooltip.style.top = `${Math.max(10, Math.min(window.innerHeight - 80, y))}px`;
			tooltip.classList.add('visible');
		},

		/**
		 * Hides the parchment scroll tooltip.
		 * @returns {void}
		 */
		hideParchmentTooltip() {
			if (typeof document === 'undefined') return;
			const tooltip = document.getElementById('scroll-tooltip');
			if (tooltip) tooltip.classList.remove('visible');
		},

		/**
		 * Releases driver references and timers.
		 * [State Mutating]
		 * @returns {void}
		 */
		destroy() {
			eventBusRef = null;
			lastScannedHazardSignature = "";
			activePouchSelectedItemId = null;
			if (titleAnimId && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(titleAnimId);
			}
			titleAnimId = null;
			if (scopeAnimId && typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(scopeAnimId);
			}
			scopeAnimId = null;
			this.dismissTacticalChassis();
		},
	};
	//#endregion
})();

//#region [SEC-09] Global Environment & Module Export
if (typeof window !== "undefined") {
	window.EmberlightCockpitRenderer = EmberlightCockpitRenderer;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightCockpitRenderer;
}
//#endregion
