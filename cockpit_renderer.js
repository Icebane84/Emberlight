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
	let lastScannedHazardSignature = "";
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

		const manifest =
			typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {};
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
				const stats =
					typeof EmberlightManifest !== "undefined" &&
						typeof EmberlightManifest.computeCharacterStats === "function"
						? EmberlightManifest.computeCharacterStats(c)
						: c;
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

					const hpPct = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
					const mpPct = Math.max(0, Math.min(100, (c.mp / c.maxMp) * 100));
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

		const facingPrompt = snapshot?.facingPrompt;
		const facingBadge = facingPrompt
			? `<div class="facing-prompt-badge" style="color:var(--cyan); font-weight:bold; background:rgba(6,182,212,0.18); border:1px solid var(--cyan); padding:2px 5px; border-radius:3px; margin-bottom:4px; font-size:7px;">🎯 ${facingPrompt}</div>`
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
	 * @param {function(CockpitActionPayload):void} dispatch - Action dispatcher.
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
        <div style="font-weight:bold; color:var(--ember); font-size:7px;">${it.label} (${it.count})</div>
        <div style="color:var(--text-dim); font-size:6px;">${it.effect}</div>
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
	 * @param {function(CockpitActionPayload):void} dispatch - Action dispatcher.
	 * @returns {void}
	 */
	function renderPouchTargetSelector(snapshot, item, drawer, dispatch) {
		if (!drawer) return;
		drawer.classList.remove("hidden");
		drawer.innerHTML = `
      <div style="font-size:7px; color:var(--ember); font-weight:bold; margin-bottom:4px;">
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

	//#section [SEC-07] Canvas Ambient Title Screen Animation Kernel
	/**
	 * Initiates canvas-based ambient title screen background animation loop.
	 * [Canvas Animation Render]
	 * @param {function():string} getActiveDistrict - District state query callback.
	 * @param {string} [canvasId='title-bg-canvas'] - Target canvas element ID.
	 * @returns {void}
	 */
	function startTitleAnimation(
		getActiveDistrict,
		canvasId = "title-bg-canvas",
	) {
		if (typeof document === "undefined") return;
		const canvas = /** @type {HTMLCanvasElement|null} */ (
			document.getElementById(canvasId)
		);
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let t = 0;
		function renderTitleFrame() {
			const activeDistrict =
				typeof getActiveDistrict === "function" ? getActiveDistrict() : "TITLE";
			if (activeDistrict !== "TITLE") {
				titleAnimId = null;
				return;
			}
			t += 0.02;
			ctx.fillStyle = "#060610";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.strokeStyle = "rgba(255, 157, 77, 0.2)";
			ctx.lineWidth = 1;
			const cy = canvas.height * 0.6;
			for (let i = 0; i < canvas.width; i += 40) {
				ctx.beginPath();
				ctx.moveTo(canvas.width / 2, cy - 30);
				ctx.lineTo(i, canvas.height);
				ctx.stroke();
			}

			const rad = 60 + Math.sin(t * 3) * 8;
			const grad = ctx.createRadialGradient(
				canvas.width / 2,
				cy - 30,
				0,
				canvas.width / 2,
				cy - 30,
				rad,
			);
			grad.addColorStop(0, "rgba(255, 157, 77, 0.4)");
			grad.addColorStop(1, "transparent");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(canvas.width / 2, cy - 30, rad, 0, Math.PI * 2);
			ctx.fill();

			if (typeof requestAnimationFrame !== "undefined") {
				titleAnimId = requestAnimationFrame(renderTitleFrame);
			}
		}

		if (!titleAnimId && typeof requestAnimationFrame !== "undefined") {
			titleAnimId = requestAnimationFrame(renderTitleFrame);
		}
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
		 * @param {Object} meta - Target metadata descriptor.
		 * @param {function(string, Object): void} [onSelect] - Action execution callback.
		 * @returns {void}
		 */
		deployTacticalChassis(meta, onSelect) {
			if (typeof document === 'undefined' || !meta) return;

			const focalRing = document.getElementById('focal-ring');
			const vignette = document.getElementById('tactical-vignette');
			const bracket = document.getElementById('target-bounding-bracket');
			const crown = document.getElementById('crown-banner');
			const crownTitle = document.getElementById('crown-title');
			const crownGauge = document.getElementById('crown-gauge');
			const badge1 = document.getElementById('badge-1');
			const badge2 = document.getElementById('badge-2');
			const leafNorth = document.getElementById('leaf-north');
			const leafEast = document.getElementById('leaf-east');
			const leafSouth = document.getElementById('leaf-south');
			const leafWest = document.getElementById('leaf-west');
			const eastIcon = document.getElementById('leaf-east-icon');
			const eastLabel = document.getElementById('leaf-east-label');

			if (!focalRing || !bracket) return;

			// 1. Resolve target geometry
			let bbox = meta.bbox;
			if (!bbox && meta.targetDom && typeof meta.targetDom.getBoundingClientRect === 'function') {
				bbox = meta.targetDom.getBoundingClientRect();
			}
			if (!bbox) {
				bbox = { left: window.innerWidth / 2 - 24, top: window.innerHeight / 2 - 24, width: 48, height: 48 };
			}

			const centerX = bbox.left + bbox.width / 2;
			const centerY = bbox.top + bbox.height / 2;

			// 2. Position Halo Bracket (Pixel-perfect snap to target bounds)
			bracket.style.left = `${Math.max(0, bbox.left)}px`;
			bracket.style.top = `${Math.max(0, bbox.top)}px`;
			bracket.style.width = `${bbox.width}px`;
			bracket.style.height = `${bbox.height}px`;

			// 3. Dynamic Bounding-Aware Orbit Radius
			const orbitRadius = Math.max(64, Math.hypot(bbox.width, bbox.height) / 2 + 28);

			// 4. Position & Populate Elevated Crown Plaque (Cleanly 8px above top of North Leaf)
			if (crown) {
				crown.style.left = `${centerX}px`;
				crown.style.top = `${Math.max(64, centerY - orbitRadius - 34)}px`;
			}
			if (crownTitle) crownTitle.textContent = meta.title || 'TARGET';
			if (crownGauge) {
				const hpPct = typeof meta.hpPct === 'number' ? Math.max(0, Math.min(100, meta.hpPct)) : 100;
				crownGauge.style.width = `${hpPct}%`;
				crownGauge.style.background = hpPct > 50 ? 'var(--ok)' : hpPct > 20 ? 'var(--ember)' : 'var(--danger)';
			}
			if (badge1) badge1.textContent = meta.badge1 || 'TARGET';
			if (badge2) badge2.textContent = meta.badge2 || 'TACTICAL';

			// 5. Position 52px Cardinal Satellite Leaves with Orbit Radius
			if (leafNorth) {
				leafNorth.style.left = `${centerX}px`;
				leafNorth.style.top = `${Math.max(30, centerY - orbitRadius)}px`;
			}
			if (leafSouth) {
				leafSouth.style.left = `${centerX}px`;
				leafSouth.style.top = `${Math.min(window.innerHeight - 30, centerY + orbitRadius)}px`;
			}
			if (leafEast) {
				leafEast.style.left = `${Math.min(window.innerWidth - 30, centerX + orbitRadius)}px`;
				leafEast.style.top = `${centerY}px`;
			}
			if (leafWest) {
				leafWest.style.left = `${Math.max(30, centerX - orbitRadius)}px`;
				leafWest.style.top = `${centerY}px`;
			}

			// 5. Dynamic East Context Binding
			if (meta.eastAction) {
				if (eastIcon) eastIcon.textContent = meta.eastAction.icon || '⚡';
				if (eastLabel) eastLabel.textContent = meta.eastAction.label || 'Action';
				if (leafEast) {
					leafEast.setAttribute('data-tooltip-title', meta.eastAction.title || 'Context Action');
					leafEast.setAttribute('data-tooltip-desc', meta.eastAction.desc || 'Execute tactical interaction.');
				}
			}

			// 6. Dynamic South Stance Binding
			const southLabel = document.getElementById('leaf-south-label');
			const southIcon = document.getElementById('leaf-south-icon');
			if (leafSouth) {
				if (meta.southAction) {
					if (southIcon) southIcon.textContent = meta.southAction.icon || '🛡️';
					if (southLabel) southLabel.textContent = meta.southAction.label || 'Stance';
					leafSouth.setAttribute('data-tooltip-title', meta.southAction.title || 'Tactical Stance');
					leafSouth.setAttribute('data-tooltip-desc', meta.southAction.desc || 'Assume tactical posture.');
				} else {
					if (southIcon) southIcon.textContent = '🛡️';
					if (southLabel) southLabel.textContent = 'Guard';
					leafSouth.setAttribute('data-tooltip-title', 'Tactical Stance');
					leafSouth.setAttribute('data-tooltip-desc', 'Assume defensive posture or rest at camp.');
				}
			}

			// 7. Chromatic Attunement
			this.setReticleTheme(meta.accent || '#ff9d4d', meta.glow || 'rgba(255, 157, 77, 0.45)');

			// 8. Bind Click Handlers for Point-and-Click Mode
			[leafNorth, leafEast, leafSouth, leafWest].forEach((leaf) => {
				if (leaf) {
					leaf.onclick = (e) => {
						if (e) e.stopPropagation();
						const dir = leaf.getAttribute('data-direction');
						if (typeof onSelect === 'function') onSelect(dir, meta);
					};
					leaf.onmouseenter = () => {
						const title = leaf.getAttribute('data-tooltip-title') || '';
						const desc = leaf.getAttribute('data-tooltip-desc') || '';
						const lbox = leaf.getBoundingClientRect();
						this.showParchmentTooltip(title, desc, lbox.left + lbox.width / 2, lbox.top + lbox.height + 6);
					};
					leaf.onmouseleave = () => {
						this.hideParchmentTooltip();
					};
				}
			});

			if (vignette) vignette.classList.add('active');
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
			if (focalRing) focalRing.classList.remove('active');
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
			leaves.forEach((leaf) => {
				const isTarget = leaf.getAttribute('data-direction') === dir;
				leaf.classList.toggle('gesture-targeted', isTarget);
				if (isTarget) {
					const title = leaf.getAttribute('data-tooltip-title') || '';
					const desc = leaf.getAttribute('data-tooltip-desc') || '';
					const lbox = leaf.getBoundingClientRect();
					this.showParchmentTooltip(title, desc, lbox.left + lbox.width / 2, lbox.top + lbox.height + 6);
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
			leaves.forEach((leaf) => {
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
			titleAnimId = null;
			this.dismissTacticalChassis();
		},
	};
	//#endregion
})();

//#region [SEC-09] Global Environment & Module Export
if (typeof window !== "undefined") {
	// @ts-expect-error
	window.EmberlightCockpitRenderer = EmberlightCockpitRenderer;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightCockpitRenderer;
}
//#endregion
