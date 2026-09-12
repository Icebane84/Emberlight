/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME HARNESS & LIFECYCLE CONTROLLER
 * Document Identifier: VSRP-001-RUNTIME-CORE[cite: 5]
 * Governing Protocol:  VSRP-001 / COMPONENT_PROTOCOL[cite: 4]
 * Authority:           Host SSOT[cite: 3]
 * Timestamp:           2026-09-07T11:40:55Z
 * Index Anchor:        PRS-001[cite: 3]
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Authoritative SSOT Bridge & Session Accessors
 *   [SEC-03] District State, Subsystem Registry & Event Bus Helpers
 *   [SEC-04] Spatial Graphics, Raycasting & District Presentation Coordination
 *   [SEC-05] Capability & Interaction Delegation & Tile Trigger Handlers
 *   [SEC-06] Viewport Topology, Deck Expansion & Navigation Motion Coordinators
 *   [SEC-07] Input Hardware Translation, DOM Controls & Lifecycle Stepper
 *   [SEC-08] Global Subsystem Bootstrap, EventBus Subscriptions & Public Interface Export
 * ============================================================================
 */

/* =========================================================================
	 EMBERLIGHT RUNTIME HARNESS (HOST SSOT & LIFECYCLE CONTROLLER)
	 -------------------------------------------------------------------------
	 Document Identifier: VSRP-001-RUNTIME-CORE[cite: 5]
	 Protocol Version: VSRP-001[cite: 5]
	 Classification: Host Runtime & Ephemeral District Coordinator[cite: 5]
	 Index Anchor: PRS-001[cite: 5]
	 ========================================================================= */

const GameRuntime = (() => {
	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} PartyMember
	 * @property {string} id - Character identifier.
	 * @property {string} name - Character name.
	 * @property {boolean} alive - Life status flag.
	 * @property {number} hp - Current hit points.
	 * @property {number} maxHp - Maximum hit points.
	 * @property {number} mp - Current mana points.
	 * @property {number} maxMp - Maximum mana points.
	 * @property {string} [phenotype] - Character phenotype/archetype.
	 * @property {number} [level] - Character level.
	 * @property {string[]} [unlockedNodes] - Unlocked skill nodes.
	 * @property {string[]} [unlocked] - Legacy unlocked nodes.
	 * @property {Array<string>} [ailments] - Active status ailments.
	 */

	/**
	 * @typedef {Object} RuntimeSnapshot
	 * @property {PartyMember[]} party - Active party roster.
	 * @property {number} gold - Available currency.
	 * @property {Record<string, number>} inventory - Inventory item counts.
	 * @property {{ x: number, y: number }} worldPos - Player world grid position.
	 * @property {{ x: number, y: number }} playerPos - Player position alias.
	 * @property {string[][]|null} map - Current active resolved map.
	 * @property {{ x: number, y: number }} macroPos - Macro map coordinates.
	 * @property {string} activeDistrict - Active district identifier token.
	 * @property {number} dungeonFloor - Dungeon floor level.
	 * @property {number} dungeonDepth - Subterranean dungeon depth.
	 * @property {number} stepCounter - Total step count.
	 * @property {Record<string, any>} flags - Global progression and world flags.
	 * @property {string} facing - Facing direction ('UP'|'DOWN'|'LEFT'|'RIGHT').
	 * @property {boolean} pouchOpen - Field pouch modal state flag.
	 */

	/**
	 * @typedef {Object} CockpitAction
	 * @property {string} type - Action command type token.
	 * @property {number} [dx] - Horizontal movement delta.
	 * @property {number} [dy] - Vertical movement delta.
	 * @property {string} [district] - Target district identifier.
	 * @property {Object} [metadata] - Additional action metadata.
	 * @property {string} [itemId] - Item identifier for pouch usage.
	 * @property {string} [targetHeroId] - Target hero identifier.
	 * @property {string} [targetId] - Target identifier alias.
	 * @property {string} [capability] - Capability token for execution.
	 * @property {Object} [context] - Execution context dictionary.
	 */

	/**
	 * @typedef {Object} TileTriggerResult
	 * @property {string} type - Trigger type token.
	 * @property {{ x: number, y: number }} [macroPos] - Macro position.
	 * @property {string} [townId] - Town identifier.
	 * @property {{ x: number, y: number }} [spawnCoord] - Spawn coordinates.
	 * @property {{ x: number, y: number }} [targetPos] - Target coordinates.
	 * @property {string} [message] - Status toast message.
	 * @property {string} [scriptKey] - Dialogue script key.
	 * @property {string} [shopId] - Shop identifier.
	 * @property {Object} [sealConfig] - Lockpick seal configuration.
	 * @property {string} [flagKey] - Flag key to set.
	 * @property {number} [bonusGold] - Bonus gold reward.
	 * @property {string} [bossKey] - Boss encounter key.
	 * @property {number} [nextDepth] - Next dungeon depth.
	 * @property {Object} [dungeonSpec] - Dungeon specification object.
	 * @property {boolean} [hasWard] - Ward protection flag against hazards.
	 * @property {number} [damagePct] - Hazard damage percentage.
	 */

	/**
	 * @typedef {Object} HostContext
	 * @property {any} eventBus - Event bus instance.
	 * @property {any} store - Session store instance.
	 * @property {any} runtime - Game runtime reference.
	 * @property {RuntimeSnapshot} [snapshot] - State snapshot.
	 */
	//#endregion

	//#region [SEC-02] Authoritative SSOT Bridge & Session Accessors
	// --- Authoritative SSOT Bridge (Delegated to EmberlightSessionStore) ---
	const store =
		typeof EmberlightSessionStore !== "undefined"
			? EmberlightSessionStore
			: null;

	/** @returns {PartyMember[]} */
	const getParty = () => (store ? store.getParty() : []);
	/** @param {PartyMember[]} p */
	const setParty = (p) => store?.setParty(p);
	/** @returns {Record<string, number>} */
	const getInventory = () => (store ? store.getInventory() : {});
	/** @param {Record<string, number>} i */
	const setInventory = (i) => store?.setInventory(i);
	/**
	 * @param {string} id
	 * @param {number} count
	 */
	const modifyItem = (id, count) => store?.modifyItem(id, count);
	/** @returns {number} */
	const getGold = () => (store ? store.getGold() : 0);
	/** @param {number} delta */
	const modifyGold = (delta) => store?.modifyGold(delta);
	/** @returns {{ x: number, y: number }} */
	const getWorldPos = () => (store ? store.getWorldPos() : { x: 10, y: 10 });
	/** @param {{ x: number, y: number }} pos */
	const setWorldPos = (pos) => store?.setWorldPos(pos);
	/** @returns {number} */
	const getDungeonFloor = () => (store ? store.getDungeonFloor() : 1);
	/** @param {number} f */
	const setDungeonFloor = (f) => store?.setDungeonFloor(f);
	/** @returns {number} */
	const getDungeonDepth = () => (store ? store.getDungeonDepth() : 1);
	/** @param {number} d */
	const setDungeonDepth = (d) => store?.setDungeonDepth(d);
	/** @returns {Array<any>} */
	const getQuests = () => (store ? store.getQuests() : []);
	/** @param {Array<any>} q */
	const setQuests = (q) => store?.setQuests(q);
	/** @returns {Record<string, any>} */
	const getFlags = () => (store ? store.getFlags() : {});
	/**
	 * @param {string} k
	 * @param {any} v
	 */
	const setFlag = (k, v) => store?.setFlag(k, v);
	/** @returns {{ x: number, y: number }} */
	const getMacroPos = () => (store ? store.getMacroPos() : { x: 1, y: 1 });
	/** @param {{ x: number, y: number }} pos */
	const setMacroPos = (pos) => store?.setMacroPos(pos);
	/** @returns {string} */
	const getTownId = () => (store ? store.getTownId() : "town_haven");
	/** @param {string} id */
	const setTownId = (id) => store?.setTownId(id);
	/** @returns {Record<string, any>} */
	const getSurfaceMutations = () => (store ? store.getSurfaceMutations() : {});
	/** @returns {Record<string, any>} */
	const getTownMutations = () => (store ? store.getTownMutations() : {});
	/** @returns {Object|null} */
	const getDungeonSpec = () => (store ? store.getDungeonSpec() : null);
	/** @param {Object} s */
	const setDungeonSpec = (s) => store?.setDungeonSpec(s);
	/** @returns {string[][]|null} */
	const getSurfaceMap = () => (store ? store.getSurfaceMap() : null);
	/** @param {string[][]} m */
	const setSurfaceMap = (m) => store?.setSurfaceMap(m);
	/**
	 * @param {string} [reason]
	 * @returns {boolean}
	 */
	const commitSession = (reason) => {
		if (typeof store?.commit === "function") return store.commit(reason);
		if (typeof store?.StorageManager?.save === "function")
			return store.StorageManager.save();
		return false;
	};
	//#endregion

	//#region [SEC-03] District State, Subsystem Registry & Event Bus Helpers
	// --- District & Host State ---
	let activeDistrict = "TITLE";
	const isTickPaused = false;
	let lastFrameTime =
		typeof performance !== "undefined" ? performance.now() : Date.now();
	let stepCounter = 0;

	// --- Subsystem Registry & Event Bus Helpers ---
	const EventBus =
		typeof EmberlightEventBus !== "undefined" ? EmberlightEventBus : null;
	const Ecology =
		typeof EmberlightWorldEcology !== "undefined"
			? EmberlightWorldEcology
			: null;
	const Router =
		typeof EmberlightDistrictRouter !== "undefined"
			? EmberlightDistrictRouter
			: null;
	const Cockpit =
		typeof EmberlightCockpitRenderer !== "undefined"
			? EmberlightCockpitRenderer
			: null;

	/**
	 * @param {string} msg
	 * @param {string} [tone='info']
	 * @returns {void}
	 */
	const notifyStatus = (msg, tone = "info") => {
		if (EventBus?.publish)
			EventBus.publish("status:toast", { message: msg, tone });
	};
	/**
	 * @param {string} cueId
	 * @returns {void}
	 */
	const publishSfx = (cueId) => {
		if (EventBus?.publish) EventBus.publish("audio:sfx", { cue: cueId });
	};
	/**
	 * @param {string} effectName
	 * @param {{ x: number, y: number }} targetPos
	 * @returns {void}
	 */
	const triggerVfx = (effectName, targetPos) => {
		if (EventBus?.publish)
			EventBus.publish("vfx:trigger", { effect: effectName, pos: targetPos });
	};

	// --- World Ecology Bridge ---
	/** @returns {string[][]|null} */
	const getActiveWorldMap = () => {
		const manifest =
			typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {};
		if (activeDistrict === "dungeon") return getDungeonSpec()?.floorMap || null;
		if (activeDistrict === "TITLE" || activeDistrict === "GAME_OVER")
			return null;
		const townId = getTownId();
		if (townId && Ecology?.resolveTownMap) {
			return Ecology.resolveTownMap(
				manifest,
				townId,
				getFlags(),
				getTownMutations(),
			);
		}
		if (Ecology?.resolveSurfaceMap) {
			return Ecology.resolveSurfaceMap(
				manifest,
				getFlags(),
				getSurfaceMutations(),
				stepCounter,
				getDungeonDepth(),
				townId,
			);
		}
		const rawMap = getSurfaceMap() || manifest.OverworldMap || [["."]];
		return typeof manifest.getResolvedMap === "function"
			? manifest.getResolvedMap(rawMap, getFlags())
			: rawMap;
	};

	/**
	 * @param {string[][]|null} map
	 * @param {{ x: number, y: number }} pos
	 * @returns {boolean}
	 */
	const isTilePassable = (map, pos) => {
		if (
			!map ||
			!pos ||
			pos.y < 0 ||
			pos.y >= map.length ||
			pos.x < 0 ||
			pos.x >= (map[0]?.length || 0)
		)
			return false;
		const tile = map[pos.y]?.[pos.x];
		const manifest =
			typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {};
		const legend = manifest.TileLegend || {};
		const def = legend[tile];
		return def ? def.walkable !== false : tile !== "#" && tile !== "P";
	};

	/**
	 * @param {string} district
	 * @param {string} key
	 * @param {any} mutation
	 * @returns {void}
	 */
	const recordTileMutation = (district, key, mutation) => {
		store?.recordMutation(district, key, mutation);
	};
	/** @param {string} [reason] */
	const commitWorldUpdate = (reason) => {
		commitSession(reason || "WorldStateUpdate");
	};

	// --- Title Save Metadata Visualizer & Multi-Slot Archive Modal ---
	/** @type {'SAVE' | 'LOAD'} */
	let saveLoadModalMode = "LOAD";

	/**
	 * Updates the dynamic save summary card on the Title Screen.
	 * @returns {void}
	 */
	const updateTitleSaveSummary = () => {
		if (typeof document === "undefined") return;
		const el = document.getElementById("title-save-summary");
		const contBtn = document.getElementById("menu-continue-btn");
		const loadBtn = document.getElementById("menu-load-btn");
		if (!el) return;
		const saveMgr =
			typeof EmberlightSaveManager !== "undefined"
				? EmberlightSaveManager
				: null;
		const slots = saveMgr?.listSlots ? saveMgr.listSlots() : [];
		const hasAny = slots.some((s) => s.exists);

		if (hasAny) {
			const mostRecentId = saveMgr?.getMostRecentSlotId
				? saveMgr.getMostRecentSlotId()
				: "SLOT_1";
			const meta = saveMgr?.getSaveMetadata
				? saveMgr.getSaveMetadata(mostRecentId)
				: null;
			el.innerHTML = `📜 Latest Chronicle [${meta?.slotId || mostRecentId}] • ${meta?.locationName || "Wilderness"}<br>Heroes: ${meta?.partySize || 4} (Avg Lv ${meta?.avgLevel || 1}) | Gold: ${meta?.gold || 0}G<br><span style="color:var(--text-dim); font-size:6.5px;">${meta?.timestamp || ""}</span>`;
			if (contBtn) contBtn.style.opacity = "1.0";
			if (loadBtn) loadBtn.style.opacity = "1.0";
		} else {
			el.innerHTML = `Scanning tactical save records...<br><span style="color:var(--text-dim);">No prior expedition records found. Ready to initialize.</span>`;
			if (contBtn) contBtn.style.opacity = "0.6";
			if (loadBtn) loadBtn.style.opacity = "0.75";
		}
	};

	let isSaveLoadModalOpen = false;

	/**
	 * Renders multi-slot save/load modal and attaches interactive event bindings.
	 * @param {'SAVE'|'LOAD'} [mode='LOAD']
	 * @returns {void}
	 */
	const openSaveLoadModal = (mode = "LOAD") => {
		if (typeof document === "undefined") return;
		saveLoadModalMode = mode;
		isSaveLoadModalOpen = true;

		const modal = document.getElementById("save-load-modal");
		const titleEl = document.getElementById("save-load-modal-title");
		const subEl = document.getElementById("save-load-modal-subtitle");
		if (!modal) return;

		if (titleEl)
			titleEl.textContent =
				mode === "SAVE"
					? "💾 SAVE EXPEDITION ARCHIVES"
					: "📂 LOAD EXPEDITION ARCHIVES";
		if (subEl)
			subEl.textContent =
				mode === "SAVE"
					? "SELECT A CHRONICLE SLOT TO PERSIST YOUR ACTIVE STATE"
					: "SELECT A CHRONICLE SLOT TO RESTORE EXPEDITION";

		renderSaveSlotCards();
		modal.classList.remove("hidden");
	};

	const closeSaveLoadModal = () => {
		isSaveLoadModalOpen = false;
		if (typeof document === "undefined") return;
		const modal = document.getElementById("save-load-modal");
		if (modal) modal.classList.add("hidden");
		updateTitleSaveSummary();
	};

	const renderSaveSlotCards = () => {
		if (typeof document === "undefined") return;
		const container = document.getElementById("save-slots-container");
		if (!container) return;
		container.innerHTML = "";

		const saveMgr =
			typeof EmberlightSaveManager !== "undefined"
				? EmberlightSaveManager
				: null;
		const slots = saveMgr?.listSlots ? saveMgr.listSlots() : [];
		const activeSlot = store?.StorageManager?.getActiveSlotId
			? store.StorageManager.getActiveSlotId()
			: "SLOT_1";

		slots.forEach((slot) => {
			const card = document.createElement("div");
			const isCurr = slot.id === activeSlot;
			card.className = `save-slot-card ${slot.isAuto ? "auto-save" : ""} ${isCurr && slot.exists ? "active-slot" : ""} ${!slot.exists ? "empty-slot" : ""}`;

			let infoHtml = "";
			if (slot.exists) {
				const dateStr = slot.timestamp
					? new Date(slot.timestamp).toLocaleString()
					: "Recent";
				const partyDesc =
					slot.party && slot.party.length > 0
						? `${slot.party.length} Heroes (Avg Lv ${slot.avgLevel || 1})`
						: "Active Vanguard";
				infoHtml = `
					<div class="save-slot-info">
						<div class="save-slot-header">
							<span class="save-slot-badge ${slot.isAuto ? "auto" : ""}">${slot.label}</span>
							<span class="save-slot-title">${slot.locationName || "Wilderness Exploration"}</span>
							${isCurr ? '<span style="font-size:7px; color:var(--ok); font-weight:bold;">[ACTIVE]</span>' : ""}
						</div>
						<div class="save-slot-meta">
							<span>👥 ${partyDesc}</span>
							<span>🪙 ${slot.gold || 0}G</span>
							<span>🕒 ${dateStr}</span>
							<span style="color:var(--ember);">v${slot.version || "1.4.0"}</span>
						</div>
					</div>
				`;
			} else {
				infoHtml = `
					<div class="save-slot-info">
						<div class="save-slot-header">
							<span class="save-slot-badge ${slot.isAuto ? "auto" : ""}">${slot.label}</span>
							<span class="save-slot-title" style="color:var(--text-dim); font-style:italic;">— EMPTY CHRONICLE ARCHIVE —</span>
						</div>
						<div class="save-slot-meta">
							<span>No tactical records stored in this sector.</span>
						</div>
					</div>
				`;
			}

			let actionsHtml = '<div class="save-slot-actions">';
			if (saveLoadModalMode === "SAVE") {
				if (slot.isAuto) {
					actionsHtml += `<span style="font-size:7.5px; color:var(--text-dim); font-style:italic;">System Managed</span>`;
				} else {
					actionsHtml += `<button type="button" class="cmd-btn action slot-action-btn" data-slot="${slot.id}" data-action="save">${slot.exists ? "💾 OVERWRITE" : "💾 SAVE"}</button>`;
					if (slot.exists) {
						actionsHtml += `<button type="button" class="cmd-btn danger slot-delete-btn" data-slot="${slot.id}" data-action="delete" title="Delete slot">🗑️</button>`;
					}
				}
			} else {
				// LOAD MODE
				if (slot.exists) {
					actionsHtml += `<button type="button" class="cmd-btn action slot-action-btn" data-slot="${slot.id}" data-action="load">▶ LOAD</button>`;
					if (!slot.isAuto) {
						actionsHtml += `<button type="button" class="cmd-btn danger slot-delete-btn" data-slot="${slot.id}" data-action="delete" title="Delete slot">🗑️</button>`;
					}
				} else {
					actionsHtml += `<button type="button" class="cmd-btn slot-action-btn" disabled style="opacity:0.4;">EMPTY</button>`;
				}
			}
			actionsHtml += "</div>";

			card.innerHTML = infoHtml + actionsHtml;

			// Bind buttons
			const actBtn = card.querySelector(".slot-action-btn");
			if (actBtn && !actBtn.hasAttribute("disabled")) {
				actBtn.onclick = () => {
					const action = actBtn.dataset.action;
					const slotId = actBtn.dataset.slot;
					if (action === "save") {
						handleSlotSave(slotId);
					} else if (action === "load") {
						handleSlotLoad(slotId);
					}
				};
			}

			const delBtn = card.querySelector(".slot-delete-btn");
			if (delBtn) {
				delBtn.onclick = () => {
					const slotId = delBtn.dataset.slot;
					handleSlotDelete(slotId);
				};
			}

			container.appendChild(card);
		});
	};

	const handleSlotSave = (slotId) => {
		if (!slotId) return;
		store?.StorageManager?.setActiveSlotId(slotId);
		store?.StorageManager?.save(undefined, slotId);
		notifyStatus(`Expedition saved to ${slotId}.`, "success");
		publishSfx("sfx_confirm");
		renderSaveSlotCards();
		updateTitleSaveSummary();
	};

	const handleSlotLoad = (slotId) => {
		if (!slotId) return;
		store?.StorageManager?.setActiveSlotId(slotId);
		const success = store?.StorageManager?.load(undefined, slotId);
		if (success) {
			notifyStatus(`Chronicle rehydrated from ${slotId}.`, "success");
			publishSfx("sfx_confirm");
			closeSaveLoadModal();
			switchDistrict("OVERWORLD");
		} else {
			notifyStatus(`Failed to load archive ${slotId}.`, "danger");
			publishSfx("sfx_defeat");
		}
	};

	const handleSlotDelete = (slotId) => {
		if (!slotId) return;
		if (typeof window !== "undefined" && window.confirm) {
			const ok = window.confirm(
				`Permanently wipe chronicle archive ${slotId}?`,
			);
			if (!ok) return;
		}
		store?.StorageManager?.deleteSlot(slotId);
		notifyStatus(`Archive ${slotId} erased.`, "warning");
		publishSfx("sfx_defeat");
		renderSaveSlotCards();
		updateTitleSaveSummary();
	};
	//#endregion

	//#region [SEC-04] Spatial Graphics, Raycasting & District Presentation Coordination
	// --- Spatial Graphics & Raycasting Pipeline ---
	/** @param {RuntimeSnapshot} [snapshot] */
	const renderOverworldGraphics = (snapshot) => {
		const currentTownId = getTownId();
		const inTown = Boolean(currentTownId);
		const snap = snapshot || {
			party: getParty(),
			gold: getGold(),
			inventory: getInventory(),
			worldPos: getWorldPos(),
			playerPos: { ...getWorldPos(), inTown, townId: currentTownId },
			map: getActiveWorldMap(),
			macroPos: getMacroPos(),
			activeDistrict: "OVERWORLD",
			dungeonFloor: getDungeonFloor(),
			dungeonDepth: getDungeonDepth(),
			stepCounter,
			flags: getFlags(),
			facing: store?.getFlag("facingDirection") || "DOWN",
			pouchOpen: store?.getFlag("pouchOpen") || false,
			townId: currentTownId,
			inTown,
		};

		if (
			typeof EmberlightMapRenderer !== "undefined" &&
			typeof EmberlightMapRenderer.renderOverworld === "function"
		) {
			EmberlightMapRenderer.renderOverworld(snap, handleCockpitAction);
		} else if (
			typeof EmberlightOverworldRenderer !== "undefined" &&
			typeof EmberlightOverworldRenderer.renderOverworld === "function"
		) {
			EmberlightOverworldRenderer.renderOverworld(snap);
		}

		if (typeof EmberlightDynamicLights !== "undefined") {
			const pos = getWorldPos();
			if (typeof EmberlightDynamicLights.setTargetPosition === "function")
				EmberlightDynamicLights.setTargetPosition(pos.x, pos.y);
			if (typeof EmberlightDynamicLights.setMap === "function")
				EmberlightDynamicLights.setMap(getActiveWorldMap(), getDungeonDepth());
		}

		if (
			typeof EmberlightPseudo3D !== "undefined" &&
			typeof EmberlightPseudo3D.render === "function"
		) {
			EmberlightPseudo3D.render(snap);
		}
	};

	/**
	 * @param {string} d
	 * @returns {string}
	 */
	const normalizeDistrictName = (d) => {
		if (!d) return "OVERWORLD";
		const upper = String(d).toUpperCase();
		if (upper === "WORLD") return "OVERWORLD";
		if (upper === "FORGE") return "RELIC_FORGE";
		if (upper === "SHOP") return "MARKET";
		if (upper === "AUDIT") return "AUDITOR";
		if (upper === "CONFIG") return "SETTINGS";
		if (upper === "GEAR") return "ARMORY";
		if (upper === "JOURNAL") return "CHRONICLE";
		if (upper === "SKILLS") return "PROGRESSION";
		return upper;
	};

	// --- District & Presentation Coordination ---
	/** @type {Record<string, function(HostContext): void>} */
	const TENANT_DISPATCHERS = {
		STATUS(hostContext) {
			if (
				typeof EmberlightStatus !== "undefined" &&
				typeof EmberlightStatus.reset === "function"
			) {
				EmberlightStatus.reset({ party: getParty() });
				if (typeof EmberlightStatusRenderer !== "undefined")
					EmberlightStatus.render(EmberlightStatusRenderer, hostContext);
			}
		},
		ARMORY(hostContext) {
			if (
				typeof EmberlightArmory !== "undefined" &&
				typeof EmberlightArmory.reset === "function"
			) {
				EmberlightArmory.reset({
					party: getParty(),
					inventory: getInventory(),
					gold: getGold(),
				});
				if (typeof EmberlightArmoryRenderer !== "undefined")
					EmberlightArmory.render(EmberlightArmoryRenderer, hostContext);
			}
		},
		PROGRESSION(hostContext) {
			if (
				typeof EmberlightProgression !== "undefined" &&
				typeof EmberlightProgression.reset === "function"
			) {
				EmberlightProgression.reset({ party: getParty() });
				if (typeof EmberlightProgressionRenderer !== "undefined")
					EmberlightProgression.render(
						EmberlightProgressionRenderer,
						hostContext,
					);
			}
		},
		MARKET(hostContext) {
			if (
				typeof EmberlightMarket !== "undefined" &&
				typeof EmberlightMarket.reset === "function"
			) {
				EmberlightMarket.reset({
					party: getParty(),
					gold: getGold(),
					inventory: getInventory(),
				});
				if (typeof EmberlightMarketRenderer !== "undefined")
					EmberlightMarket.render(EmberlightMarketRenderer, hostContext);
			}
		},
		CHRONICLE(hostContext) {
			if (
				typeof EmberlightChronicle !== "undefined" &&
				typeof EmberlightChronicle.reset === "function"
			) {
				EmberlightChronicle.reset({ quests: getQuests(), flags: getFlags() });
				if (typeof EmberlightChronicleRenderer !== "undefined")
					EmberlightChronicle.render(EmberlightChronicleRenderer, hostContext);
			}
		},
		RELIC_FORGE(hostContext) {
			if (
				typeof EmberlightRelicForge !== "undefined" &&
				typeof EmberlightRelicForge.reset === "function"
			) {
				EmberlightRelicForge.reset({
					party: getParty(),
					gold: getGold(),
					inventory: getInventory(),
				});
				if (typeof EmberlightRelicForgeRenderer !== "undefined")
					EmberlightRelicForge.render(
						EmberlightRelicForgeRenderer,
						hostContext,
					);
			}
		},
		AUDITOR(hostContext) {
			if (
				typeof EmberlightAuditor !== "undefined" &&
				typeof EmberlightAuditor.reset === "function"
			) {
				EmberlightAuditor.reset({
					snapshot: hostContext.snapshot,
					eventBus: hostContext.eventBus,
				});
				if (typeof EmberlightAuditor.render === "function")
					EmberlightAuditor.render();
			}
			// Restore live overworld tenant and pseudo-3D presentation after in-situ audit completes
			const currentTownId = getTownId();
			const inTown = Boolean(currentTownId);
			if (
				typeof EmberlightOverworld !== "undefined" &&
				typeof EmberlightOverworld.reset === "function"
			) {
				EmberlightOverworld.reset({
					map: getActiveWorldMap(),
					playerPos: { ...getWorldPos(), inTown, townId: currentTownId },
					party: getParty(),
					flags: { ...getFlags(), in_town: inTown, townId: currentTownId },
					facing: store?.getFlag("facingDirection") || "DOWN",
					dungeonDepth: getDungeonDepth(),
					dangerSteps: 0,
					townId: currentTownId,
					inTown,
				});
			}
			if (
				typeof EmberlightPseudo3D !== "undefined" &&
				typeof EmberlightPseudo3D.render === "function"
			) {
				EmberlightPseudo3D.render(hostContext.snapshot);
			}
		},
		SETTINGS() {
			if (
				typeof EmberlightSettings !== "undefined" &&
				typeof EmberlightSettings.reset === "function"
			) {
				EmberlightSettings.reset({});
				if (typeof EmberlightSettings.render === "function")
					EmberlightSettings.render();
			}
		},
		LOCKPICK(hostContext) {
			if (
				typeof EmberlightLockpick !== "undefined" &&
				typeof EmberlightLockpick.reset === "function"
			) {
				EmberlightLockpick.reset(hostContext.snapshot);
				if (typeof EmberlightLockpick.render === "function")
					EmberlightLockpick.render();
			}
		},
		TITLE() {
			updateTitleSaveSummary();
			if (Cockpit && typeof Cockpit.startTitleAnimation === "function")
				Cockpit.startTitleAnimation("title-bg-canvas", () => activeDistrict);
		},
		OVERWORLD(hostContext) {
			const currentTownId = getTownId();
			const inTown = Boolean(currentTownId);
			if (
				typeof EmberlightOverworld !== "undefined" &&
				typeof EmberlightOverworld.reset === "function"
			) {
				EmberlightOverworld.reset({
					map: getActiveWorldMap(),
					playerPos: { ...getWorldPos(), inTown, townId: currentTownId },
					party: getParty(),
					flags: { ...getFlags(), in_town: inTown, townId: currentTownId },
					facing: store?.getFlag("facingDirection") || "DOWN",
					dungeonDepth: getDungeonDepth(),
					dangerSteps: 0,
					townId: currentTownId,
					inTown,
				});
			}
			renderOverworldGraphics(hostContext.snapshot);
		},
	};

	/**
	 * @param {string} targetDistrict
	 * @param {Object} [_metadata={}]
	 * @returns {void}
	 */
	const switchDistrict = (targetDistrict, _metadata = {}) => {
		const district = normalizeDistrictName(targetDistrict);
		if (district !== "OVERWORLD" && is3DViewExpanded) {
			toggle3DViewportExpansion(false);
		}
		activeDistrict = district;

		const currentTownId = getTownId();
		const inTown = Boolean(currentTownId);
		const snapshot = {
			party: getParty(),
			gold: getGold(),
			inventory: getInventory(),
			worldPos: getWorldPos(),
			playerPos: { ...getWorldPos(), inTown, townId: currentTownId },
			map: getActiveWorldMap(),
			macroPos: getMacroPos(),
			activeDistrict,
			dungeonFloor: getDungeonFloor(),
			dungeonDepth: getDungeonDepth(),
			stepCounter,
			flags: { ...getFlags(), in_town: inTown, townId: currentTownId },
			facing: store?.getFlag("facingDirection") || "DOWN",
			pouchOpen: store?.getFlag("pouchOpen") || false,
			townId: currentTownId,
			inTown,
		};

		if (Router)
			Router.switchDistrict(
				district,
				`${district.toLowerCase().replace("_", "-")}-view`,
				snapshot,
			);

		const hostContext = {
			eventBus: EventBus,
			store,
			runtime: GameRuntime,
			snapshot,
		};
		const dispatcher = TENANT_DISPATCHERS[district];
		if (dispatcher) {
			dispatcher(hostContext);
		}

		renderHUD();
	};

	/** @param {string} [marketId='market_general'] */
	const enterMarketDistrict = (marketId = "market_general") => {
		switchDistrict("MARKET", { marketId });
	};
	//#endregion

	//#region [SEC-05] Capability & Interaction Delegation & Tile Trigger Handlers
	// --- HUD & Spatial Projection Coordinator ---
	/**
	 * Resolves interactive prompt text when facing an actionable tile.
	 * @param {string|null} tile
	 * @returns {string|null}
	 */
	const getFacingInteractablePrompt = (tile) => {
		if (!tile) return null;
		switch (tile) {
			case "E":
				return "[SPACE] 🧓 Talk to Elder Rowan";
			case "H":
				return "[SPACE] 🏨 Rest at The Hearth Inn";
			case "N":
				return "[SPACE] 📋 Read Town Notice Board";
			case "A":
				return "[SPACE] ✨ Commune at Ancient Aether Shrine";
			case "*":
				return "[SPACE] 💎 Scavenge Resource Cache";
			case "$":
				return "[SPACE] 📦 Unlock Subterranean Chest";
			case "D":
				return "[SPACE] 🏰 Enter Oakhaven Town";
			case "O":
				return "[SPACE] 🚪 Exit to Overworld";
			case "S":
				return "[SPACE] ⛩️ Descend into Catacombs";
			case "<":
				return "[SPACE] 🪜 Ascend to Surface";
			case ">":
				return "[SPACE] 🪜 Descend Deeper";
			case "C":
				return "[SPACE] 🔥 Rest at Campsite";
			case "@":
				return "[SPACE] 🐪 Trade with Caravan";
			case "B":
				return "[SPACE] 💀 Malakor Boss Chamber";
			case "P":
				return "[L] 🔓 Inspect Portcullis Lock";
			default:
				return null;
		}
	};

	/** @returns {void} */
	const renderHUD = () => {
		const currentPos = getWorldPos();
		const currentTownId = getTownId();
		const inTown = Boolean(currentTownId);
		const facing = store?.getFlag("facingDirection") || "DOWN";
		/** @type {Record<string, { x: number, y: number }>} */
		const deltas = {
			UP: { x: 0, y: -1 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
			RIGHT: { x: 1, y: 0 },
		};
		const d = deltas[facing] || { x: 0, y: 1 };
		const facingPos = { x: currentPos.x + d.x, y: currentPos.y + d.y };
		const worldMap = getActiveWorldMap();
		const facingTile = worldMap?.[facingPos.y]?.[facingPos.x] || null;
		const facingPrompt = getFacingInteractablePrompt(facingTile);

		const snapshot = {
			party: getParty(),
			gold: getGold(),
			inventory: getInventory(),
			worldPos: currentPos,
			playerPos: { ...currentPos, inTown, townId: currentTownId },
			map: worldMap,
			macroPos: getMacroPos(),
			activeDistrict,
			dungeonFloor: getDungeonFloor(),
			dungeonDepth: getDungeonDepth(),
			stepCounter,
			flags: { ...getFlags(), in_town: inTown, townId: currentTownId },
			facing,
			pouchOpen: store?.getFlag("pouchOpen") || false,
			facingPos,
			facingTile,
			facingPrompt,
			townId: currentTownId,
			inTown,
		};

		if (Cockpit) {
			if (typeof Cockpit.render === "function")
				Cockpit.render(snapshot, handleCockpitAction);
			else if (typeof Cockpit.renderCockpit === "function")
				Cockpit.renderCockpit(snapshot, handleCockpitAction);
		}

		if (
			activeDistrict !== "COMBAT" &&
			activeDistrict !== "TITLE" &&
			activeDistrict !== "GAME_OVER"
		) {
			renderOverworldGraphics(snapshot);
		} else if (activeDistrict === "COMBAT") {
			if (
				typeof EmberlightCombat !== "undefined" &&
				typeof EmberlightCombat.render === "function"
			) {
				EmberlightCombat.render(
					typeof EmberlightCombatRenderer !== "undefined"
						? EmberlightCombatRenderer
						: null,
				);
			}
		}
	};

	// --- Capability & Interaction Delegation ---
	/**
	 * @param {string} capabilityToken
	 * @param {Object} [targetContext={}]
	 * @returns {any}
	 */
	const executeCapability = (capabilityToken, targetContext = {}) => {
		if (!Ecology) return false;
		const context = {
			getParty,
			setParty,
			getInventory,
			modifyItem,
			setInventory,
			getActiveWorldMap,
			recordTileMutation,
			notifyStatus,
			commitWorldUpdate,
			enterMarketDistrict,
			publishSfx,
			triggerVfx,
			...targetContext,
		};
		return Ecology.settleCapability(capabilityToken, context);
	};

	const triggerZoneTransition = (title, subtitle) => {
		if (typeof document === "undefined") return;
		const overlay = document.getElementById("zone-transition-overlay");
		const titleEl = document.getElementById("zone-transition-title");
		const subEl = document.getElementById("zone-transition-subtitle");
		if (titleEl) titleEl.textContent = title;
		if (subEl) subEl.textContent = subtitle;
		if (overlay) {
			overlay.classList.remove("hidden");
			setTimeout(() => {
				overlay.classList.add("hidden");
			}, 1100);
		}
	};

	/** @type {Record<string, function(TileTriggerResult, { x: number, y: number }): void>} */
	const TILE_TRIGGER_HANDLERS = {
		ENTER_TOWN(res, pos) {
			setMacroPos(res.macroPos || pos);
			setTownId(res.townId);
			setWorldPos(res.spawnCoord || { x: 5, y: 8 });
			if (res.message) notifyStatus(res.message, "info");
			publishSfx("sfx_confirm");
			triggerZoneTransition(
				"🏰 ENTERING OAKHAVEN HAMLET",
				"AETHERIC SANCTUARY // SAFE REFUGE",
			);
			EventBus.publish("world:zone_change", {
				zone: "TOWN",
				townId: res.townId,
			});
		},
		EXIT_TOWN(res) {
			setTownId(null);
			setWorldPos(res.targetPos || { x: 1, y: 1 });
			if (res.message) notifyStatus(res.message, "info");
			publishSfx("sfx_confirm");
			triggerZoneTransition(
				"🌲 ENTERING THE ASHEN WILDS",
				"WILDERNESS TRAIL // ENCOUNTER ZONE",
			);
			EventBus.publish("world:zone_change", { zone: "SURFACE", townId: null });
		},
		OPEN_DIALOGUE(res) {
			if (
				typeof EmberlightScript !== "undefined" &&
				typeof EmberlightScript.play === "function"
			) {
				EmberlightScript.play(res.scriptKey, {
					runtime: GameRuntime,
					eventBus: EventBus,
				});
			}
		},
		OPEN_SHOP(res) {
			enterMarketDistrict(res.shopId);
		},
		OPEN_FORGE() {
			switchDistrict("RELIC_FORGE");
		},
		CAMP_REST(res) {
			const rested = getParty().map((c) => ({
				...c,
				alive: true,
				hp: c.maxHp || c.hp,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			setParty(rested);
			if (res.message) notifyStatus(res.message, "success");
			publishSfx("sfx_heal");
		},
		INN_REST(res) {
			const rested = getParty().map((c) => ({
				...c,
				alive: true,
				hp: c.maxHp || c.hp,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			setParty(rested);
			commitSession("InnRestAutosave");
			if (res.message) notifyStatus(res.message, "success");
			publishSfx("sfx_heal");
		},
		SHRINE_COMMUNE(res) {
			const empowered = getParty().map((c) => ({
				...c,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			setParty(empowered);
			if (res.message) notifyStatus(res.message, "info");
			publishSfx("sfx_heal");
		},
		OPEN_LOCKPICK(res) {
			if (
				typeof EmberlightLockpick !== "undefined" &&
				typeof EmberlightLockpick.reset === "function"
			) {
				EmberlightLockpick.reset(res.sealConfig);
				switchDistrict("LOCKPICK");
			}
		},
		LOOT_FLOOR_CHEST(res) {
			setFlag(res.flagKey, true);
			modifyGold(res.bonusGold || 25);
			notifyStatus(
				`Found ${res.bonusGold || 25}G in subterranean chest!`,
				"success",
			);
			publishSfx("sfx_coin");
		},
		FORAGE_RESOURCE(res) {
			if (res.rewardItem) {
				modifyItem(res.rewardItem, 1);
			}
			if (res.bonusGold) {
				modifyGold(res.bonusGold);
			}
			if (res.targetPos && store?.recordTileMutation) {
				store.recordTileMutation(res.targetPos.x, res.targetPos.y, ".");
			}
			if (res.message) notifyStatus(res.message, "success");
			publishSfx("sfx_coin");
		},
		TRIGGER_BOSS(res) {
			startCombat(res.bossKey || "BOSS_MALAKOR");
		},
		DESCEND_STAIRS(res) {
			setDungeonDepth(res.nextDepth);
			if (res.dungeonSpec) setDungeonSpec(res.dungeonSpec);
			setWorldPos(res.spawnCoord || { x: 1, y: 1 });
			notifyStatus(
				`Descended into Catacombs (Floor ${res.nextDepth}).`,
				"warning",
			);
			publishSfx("sfx_confirm");
		},
		ASCEND_STAIRS(res) {
			setDungeonDepth(0);
			setDungeonSpec(null);
			setWorldPos(res.targetPos || { x: 9, y: 4 });
			notifyStatus("Ascended back to the surface.", "info");
			publishSfx("sfx_confirm");
		},
		MIASMA_HAZARD(res) {
			if (!res.hasWard) {
				const party = getParty().map((c) => {
					if (!c.alive) return c;
					const dmg = Math.max(
						1,
						Math.floor((c.maxHp || 30) * (res.damagePct || 0.05)),
					);
					return { ...c, hp: Math.max(1, c.hp - dmg) };
				});
				setParty(party);
				notifyStatus("The squad suffered miasma corruption (-HP)!", "warning");
				publishSfx("sfx_damage");
			}
		},
	};

	/**
	 * @param {{ x: number, y: number }} pos
	 * @param {{ x: number, y: number }|null} [facingPos=null]
	 * @param {boolean} [isInteraction=false]
	 * @returns {any}
	 */
	const evaluateTileTrigger = (
		pos,
		facingPos = null,
		isInteraction = false,
	) => {
		if (!Ecology?.evaluateTileTrigger) return null;
		const worldMap = getActiveWorldMap();
		if (!worldMap) return null;
		const currentTile = worldMap[pos.y]?.[pos.x] || null;
		const facingTile = facingPos
			? worldMap[facingPos.y]?.[facingPos.x] || null
			: null;
		const manifest =
			typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {};
		const dungeonGen =
			typeof EmberlightDungeonGen !== "undefined" ? EmberlightDungeonGen : null;
		const prng =
			typeof EmberlightPRNG !== "undefined"
				? EmberlightPRNG.create(stepCounter + 1337)
				: null;

		const res = /** @type {TileTriggerResult|null} */ (
			Ecology.evaluateTileTrigger({
				isInteraction,
				pos,
				facingPos,
				facingTile,
				currentTile,
				townId: getTownId(),
				dungeonDepth: getDungeonDepth(),
				macroPos: getMacroPos(),
				flags: getFlags(),
				party: getParty(),
				manifest,
				dungeonGen,
				prng,
			})
		);

		if (!res || res.type === "NONE") return res;

		const handler = TILE_TRIGGER_HANDLERS[res.type];
		if (handler) {
			handler(res, pos);
		}

		commitSession("TileTriggerResolved");
		renderHUD();
		return res;
	};
	//#endregion

	//#region [SEC-06] Viewport Topology, Deck Expansion & Navigation Motion Coordinators
	// --- Viewport Topology & Deck Expansion State ---
	let isQ4DeckExpanded = false;
	let is3DViewExpanded = false;

	const NON_EXPANDABLE_DISTRICTS = new Set(["COMBAT", "TITLE", "GAME_OVER"]);
	/**
	 * @param {string} d
	 * @returns {boolean}
	 */
	const isNonExpandableDistrict = (d) => NON_EXPANDABLE_DISTRICTS.has(d);

	/** @param {boolean} expanded */
	const updateQ4DOM = (expanded) => {
		const matrix = document.getElementById("war-table-matrix");
		const rig = document.getElementById("expedition-rig");
		const btn = document.getElementById("q4-expand-btn");
		const expandLabel = btn ? btn.querySelector(".expand-label") : null;

		if (matrix) matrix.classList.toggle("q4-expanded-deck", expanded);
		if (rig) rig.classList.toggle("q4-expanded-deck", expanded);
		if (btn) btn.classList.toggle("expanded", expanded);
		if (expandLabel)
			expandLabel.textContent = expanded ? "COLLAPSE [Z]" : "EXPAND [Z]";
	};

	/** @param {boolean} [forceState] */
	const toggleQ4DeckExpansion = (forceState) => {
		if (forceState !== false && isNonExpandableDistrict(activeDistrict)) return;

		isQ4DeckExpanded =
			typeof forceState === "boolean" ? forceState : !isQ4DeckExpanded;
		if (isQ4DeckExpanded && is3DViewExpanded) {
			toggle3DViewportExpansion(false);
		}

		updateQ4DOM(isQ4DeckExpanded);

		if (
			typeof EmberlightCockpitRenderer !== "undefined" &&
			typeof EmberlightCockpitRenderer.setExpanded === "function"
		) {
			EmberlightCockpitRenderer.setExpanded(isQ4DeckExpanded, is3DViewExpanded);
		}
		if (
			typeof EmberlightInput !== "undefined" &&
			typeof EmberlightInput.clear === "function"
		) {
			EmberlightInput.clear();
		}
		if (
			activeDistrict !== "OVERWORLD" &&
			!isNonExpandableDistrict(activeDistrict)
		) {
			switchDistrict(activeDistrict);
		}
		renderHUD();
	};

	/** @param {boolean} expanded */
	const update3DDOM = (expanded) => {
		const matrix = document.getElementById("war-table-matrix");
		const rig = document.getElementById("expedition-rig");
		const btn = document.getElementById("q2-expand-btn");
		const expandLabel = btn ? btn.querySelector(".expand-label") : null;

		if (matrix) matrix.classList.toggle("q2-immersion-deck", expanded);
		if (rig) rig.classList.toggle("q2-immersion-deck", expanded);
		if (btn) btn.classList.toggle("expanded", expanded);
		if (expandLabel)
			expandLabel.textContent = expanded ? "2D MAP [X]" : "3D VIEW [X]";
	};

	/** @param {boolean} [forceState] */
	const toggle3DViewportExpansion = (forceState) => {
		if (forceState !== false && isNonExpandableDistrict(activeDistrict)) return;

		is3DViewExpanded =
			typeof forceState === "boolean" ? forceState : !is3DViewExpanded;
		if (is3DViewExpanded && isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false);
		}

		update3DDOM(is3DViewExpanded);

		const pseudo3d =
			(typeof EmberlightPseudo3D !== "undefined" && EmberlightPseudo3D) ||
			(typeof EmberlightCorridorSensor !== "undefined" &&
				EmberlightCorridorSensor) ||
			null;
		if (pseudo3d && typeof pseudo3d.setExpanded === "function") {
			pseudo3d.setExpanded(is3DViewExpanded);
		}

		if (
			typeof EmberlightCockpitRenderer !== "undefined" &&
			typeof EmberlightCockpitRenderer.setExpanded === "function"
		) {
			EmberlightCockpitRenderer.setExpanded(isQ4DeckExpanded, is3DViewExpanded);
		}
		if (
			typeof EmberlightInput !== "undefined" &&
			typeof EmberlightInput.clear === "function"
		) {
			EmberlightInput.clear();
		}
		renderHUD();
	};

	/** @returns {boolean} */
	const handleCancelAction = () => {
		if (focalRingActive) {
			dismissTacticalChassis();
			return true;
		}
		if (activeDistrict === "COMBAT") {
			if (
				typeof EmberlightCombat !== "undefined" &&
				typeof EmberlightCombat.getState === "function"
			) {
				const cState = EmberlightCombat.getState();
				if (
					cState?.phase === "TARGETING_ENEMY" ||
					cState?.phase === "TARGETING_ALLY" ||
					cState?.phase === "PENDING_SKILL" ||
					(cState?.selectedTab && cState.selectedTab !== "ATTACK")
				) {
					if (typeof EmberlightCombat.handleHostAction === "function") {
						EmberlightCombat.handleHostAction("CANCEL");
					}
					renderHUD();
					return true;
				}
			}
		}
		if (isSaveLoadModalOpen) {
			closeSaveLoadModal();
			return true;
		}
		if (store?.getFlag("pouchOpen")) {
			store.setFlag("pouchOpen", false);
			renderHUD();
			return true;
		}
		if (isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false);
			return true;
		}
		if (is3DViewExpanded) {
			toggle3DViewportExpansion(false);
			return true;
		}
		if (
			activeDistrict !== "OVERWORLD" &&
			activeDistrict !== "TITLE" &&
			activeDistrict !== "world"
		) {
			switchDistrict("OVERWORLD");
			return true;
		}
		if (activeDistrict === "TITLE") {
			return true;
		}
		switchDistrict("SETTINGS");
		return true;
	};

	// --- Tactical Focal Ring & RMB Interaction Engine (ARCH-SPEC-RMB-INTEGRATION-001) ---
	let focalRingActive = false;
	const rmbEngine = {
		isDown: false,
		originX: 0,
		originY: 0,
		targetCenterX: 0,
		targetCenterY: 0,
		flickArmed: false,
		activeMeta: /** @type {Object|null} */ (null),
		highlightedLeaf: /** @type {string|null} */ (null),
	};

	/**
	 * Calculates cardinal polar direction from delta vector (dx, dy).
	 * @param {number} dx - X-axis delta from center.
	 * @param {number} dy - Y-axis delta from center.
	 * @returns {'NORTH'|'EAST'|'SOUTH'|'WEST'}
	 */
	const calculatePolarDirection = (dx, dy) => {
		const angle = Math.atan2(dy, dx);
		if (angle >= -Math.PI * 0.75 && angle < -Math.PI * 0.25) return "NORTH";
		if (angle >= -Math.PI * 0.25 && angle < Math.PI * 0.25) return "EAST";
		if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) return "SOUTH";
		return "WEST";
	};

	/**
	 * Dismisses the tactical focal ring chassis and clears active RMB state.
	 * @returns {void}
	 */
	const dismissTacticalChassis = () => {
		focalRingActive = false;
		rmbEngine.isDown = false;
		rmbEngine.flickArmed = false;
		rmbEngine.activeMeta = null;
		rmbEngine.highlightedLeaf = null;
		if (Cockpit && typeof Cockpit.dismissTacticalChassis === "function") {
			Cockpit.dismissTacticalChassis();
		}
		if (
			typeof EmberlightMapRenderer !== "undefined" &&
			typeof EmberlightMapRenderer.clearTargetedTile === "function"
		) {
			EmberlightMapRenderer.clearTargetedTile();
		}
	};

	/**
	 * Resolves entity or terrain tile metadata for the tactical chassis.
	 * @param {EventTarget|null} target - Clicked target element.
	 * @param {number} [clientX=0] - Screen X coordinate.
	 * @param {number} [clientY=0] - Screen Y coordinate.
	 * @returns {Object|null}
	 */
	const resolveTargetMetadata = (target, clientX = 0, clientY = 0) => {
		// 1. Combat Entity Inspection
		if (activeDistrict === "COMBAT") {
			const el = /** @type {HTMLElement|null} */ (target);
			const enemyCard = el?.closest
				? el.closest(".enemy-battler-card, .battler-card.enemy, .enemy-card")
				: null;
			const allyCard = el?.closest
				? el.closest(".hero-battler-card, .battler-card.hero, .hero-card")
				: null;

			if (enemyCard) {
				const nameEl = enemyCard.querySelector(
					".enemy-name, .battler-name, .name",
				);
				const title = nameEl?.textContent || "Hostile Combatant";
				return {
					category: "ENEMY",
					title,
					hpPct: 100,
					accent: "#ef4444",
					glow: "rgba(239, 68, 68, 0.45)",
					badge1: "HOSTILE",
					badge2: "VULNERABLE",
					eastAction: {
						id: "THREAT_ORACLE",
						label: "Oracle",
						icon: "👁️",
						title: "Threat Oracle",
						desc: "Forecast enemy strike vectors and vulnerabilities.",
					},
					southAction: {
						id: "COMBAT_GUARD",
						label: "Guard",
						icon: "🛡️",
						title: "Defensive Stance",
						desc: "Brace for incoming hostile impact.",
					},
					targetDom: enemyCard,
				};
			}

			if (allyCard) {
				const nameEl = allyCard.querySelector(
					".hero-name, .battler-name, .name",
				);
				const title = nameEl?.textContent || "Vanguard Hero";
				return {
					category: "ALLY",
					title,
					hpPct: 100,
					accent: "#34d399",
					glow: "rgba(52, 211, 153, 0.45)",
					badge1: "VANGUARD",
					badge2: "ALLIED HERO",
					eastAction: {
						id: "FIELD_TRIAGE",
						label: "Triage",
						icon: "✨",
						title: "Field Triage",
						desc: "Direct restorative attention to this vanguard unit.",
					},
					southAction: {
						id: "COMBAT_GUARD",
						label: "Guard",
						icon: "🛡️",
						title: "Defensive Stance",
						desc: "Brace for incoming hostile impact.",
					},
					targetDom: allyCard,
				};
			}

			return {
				category: "COMBAT_GENERAL",
				title: "Tactical Arena",
				hpPct: 100,
				accent: "#ff9d4d",
				glow: "rgba(255, 157, 77, 0.45)",
				badge1: "ARENA",
				badge2: "ENGAGED",
				eastAction: {
					id: "THREAT_ORACLE",
					label: "Oracle",
					icon: "👁️",
					title: "Threat Oracle",
					desc: "Forecast battlefield threat vectors.",
				},
				southAction: {
					id: "COMBAT_GUARD",
					label: "Guard",
					icon: "🛡️",
					title: "Defensive Stance",
					desc: "Brace for incoming hostile impact.",
				},
				bbox: {
					left: clientX - 24,
					top: clientY - 24,
					width: 48,
					height: 48,
				},
			};
		}

		// 2. Q2 3D Environment Sensor Viewport Inspection
		const el = /** @type {HTMLElement|null} */ (target);
		const isSensorPane =
			is3DViewExpanded ||
			Boolean(
				el?.closest &&
					el.closest(
						"#pane-sensor, #corridor-canvas, .sensor-viewport, .corridor-viewport",
					),
			);
		if (isSensorPane) {
			const facing = store?.getFlag("facingDirection") || "DOWN";
			const pos = getWorldPos() || { x: 1, y: 1 };
			const map = getActiveWorldMap() || [];
			const inTown = Boolean(getTownId());
			const depth = getDungeonDepth();
			/** @type {Record<string, { x: number, y: number }>} */
			const facingDeltas = {
				UP: { x: 0, y: -1 },
				RIGHT: { x: 1, y: 0 },
				DOWN: { x: 0, y: 1 },
				LEFT: { x: -1, y: 0 },
			};
			const d = facingDeltas[facing] || { x: 0, y: 1 };
			const aheadPos = { x: pos.x + d.x, y: pos.y + d.y };
			const aheadTile = map[aheadPos.y]?.[aheadPos.x] || "#";

			/** @type {Record<string, { title: string, icon: string, desc: string, isAdvance: boolean }>} */
			const tileDescriptions = {
				"#": {
					title: inTown
						? "🪵 Timber Wall"
						: depth > 0
							? "🏔️ Bedrock Wall"
							: "🏔️ Stone Wall",
					icon: "🧱",
					desc: "Solid perimeter barrier. Acoustic damping detected.",
					isAdvance: false,
				},
				".": {
					title: inTown ? "🛤️ Cobblestone Pathway" : "🌲 Wild Trail",
					icon: "🚶",
					desc: "Clear corridor pathway. Free traversal ahead.",
					isAdvance: true,
				},
				$: {
					title: "📦 Ancient Relic Chest",
					icon: "📦",
					desc: "Auric energy signature detected. Ready to loot.",
					isAdvance: false,
				},
				"*": {
					title: "✨ Resource Cache",
					icon: "✨",
					desc: "Sparkling natural bounty. Scavenge for supplies.",
					isAdvance: false,
				},
				C: {
					title: "🔥 Sanctuary Campsite",
					icon: "🔥",
					desc: "Active campfire hearth. Rest to replenish party vitality.",
					isAdvance: false,
				},
				H: {
					title: "🏨 The Hearth Inn",
					icon: "🏨",
					desc: "Rest haven. Cleanses afflictions and fully heals party.",
					isAdvance: false,
				},
				N: {
					title: "📋 Town Notice Board",
					icon: "📋",
					desc: "Settlement board. 3 active bulletins posted.",
					isAdvance: false,
				},
				A: {
					title: "⛩ Ancient Aether Shrine",
					icon: "⛩",
					desc: "Celestial stone monolith. Restores party MP.",
					isAdvance: false,
				},
				E: {
					title: "🧓 Elder Rowan",
					icon: "🧓",
					desc: "Hamlet elder. Imparts vital tactical directives.",
					isAdvance: false,
				},
				G: {
					title: "🛡️ Gate Captain Kael",
					icon: "🛡️",
					desc: "Armored town guard patrolling boundary.",
					isAdvance: false,
				},
				V: {
					title: "🔮 Afflicted Villager",
					icon: "🔮",
					desc: "Shrouded traveler bearing dark tidings.",
					isAdvance: false,
				},
				"@": {
					title: "🐪 Merchant Caravan",
					icon: "🐪",
					desc: "Traveling market vendor. Trade weapons and elixirs.",
					isAdvance: false,
				},
				B: {
					title: "⚔️ Blacksmith Armory",
					icon: "⚔️",
					desc: "Town forge. Ready to equip vanguard champions.",
					isAdvance: false,
				},
				F: {
					title: "🔮 Relic Crucible",
					icon: "🔮",
					desc: "Arcane forge for transmuting artifact essences.",
					isAdvance: false,
				},
				P: {
					title: "⛓️ Iron Portcullis",
					icon: "⛓️",
					desc: "Reinforced gate blocking further descent.",
					isAdvance: false,
				},
				_: {
					title: "⚙️ Pressure Plate",
					icon: "⚙️",
					desc: "Mechanical trigger linked to security mechanisms.",
					isAdvance: false,
				},
				"~": {
					title: "💧 Abyssal Water Chasm",
					icon: "💧",
					desc: "Subterranean chasm. Target with Glacial Freeze [G].",
					isAdvance: false,
				},
				'"': {
					title: "🌿 Dry Bramble Brush",
					icon: "🌿",
					desc: "Combustible obstacle. Target with Pyretic Scorch [F].",
					isAdvance: false,
				},
				"%": {
					title: "☠️ Toxic Miasma Cloud",
					icon: "☠️",
					desc: "Poisonous vapor. Dispel with Aetheric Gale [V].",
					isAdvance: false,
				},
				">": {
					title: "⛩️ Descent Gate Portal",
					icon: "⛩️",
					desc: "Runic portal leading deeper underground.",
					isAdvance: false,
				},
				"<": {
					title: "🪜 Ascent Ladder Beacon",
					icon: "🪜",
					desc: "Ladder pathway ascending to surface world.",
					isAdvance: false,
				},
				O: {
					title: "🏰 Town Gateway",
					icon: "🏰",
					desc: "Fortified archway leading into the settlement.",
					isAdvance: false,
				},
				D: {
					title: "🏰 Town Archway",
					icon: "🏰",
					desc: "Fortified archway leading into the settlement.",
					isAdvance: false,
				},
			};

			const info = tileDescriptions[aheadTile] || {
				title: `Sector Object [${aheadTile}]`,
				icon: "🔭",
				desc: "Unknown spatial entity ahead.",
				isAdvance: false,
			};

			return {
				category: "3D_SENSOR",
				title: `🔭 ${info.title}`,
				hpPct: 100,
				accent: "#38bdf8",
				glow: "rgba(56, 189, 248, 0.45)",
				badge1: `BEARING: ${facing}`,
				badge2: `AHEAD: [${aheadTile}]`,
				northAction: {
					id: "3D_ADVANCE",
					label: info.isAdvance ? "Advance" : "Interact",
					icon: info.isAdvance ? "🚶" : "⚡",
					title: info.isAdvance ? "Step Forward" : "Engage Object",
					desc: info.isAdvance
						? "Advance forward into the open pathway."
						: "Physically engage or interact with the object ahead.",
				},
				eastAction: {
					id: "3D_DEEP_SCAN",
					label: "Deep Scan",
					icon: "📡",
					title: "Optical & Acoustic Telemetry",
					desc: "Run comprehensive structural and aetheric analysis on facing sector.",
				},
				southAction: {
					id: "3D_ABOUT_FACE",
					label: "About-Face",
					icon: "🔄",
					title: "180° Tactical Turn",
					desc: "Execute an immediate 180° turnaround.",
				},
				westAction: {
					id: "3D_TOGGLE_EXPAND",
					label: is3DViewExpanded ? "Collapse [Z]" : "Expand [Z]",
					icon: "⛶",
					title: is3DViewExpanded
						? "Collapse 3D Viewport"
						: "Expand 3D Viewport",
					desc: is3DViewExpanded
						? "Collapse back to standard 4-quadrant War Table Matrix."
						: "Expand 3D environment sensor to 960x360 High-Res Viewport.",
				},
				bbox: {
					left: clientX - 24,
					top: clientY - 24,
					width: 48,
					height: 48,
				},
			};
		}

		// 3. Overworld & Dungeon Map Inspection (Q1 Cartography)
		if (
			typeof EmberlightMapRenderer !== "undefined" &&
			typeof EmberlightMapRenderer.resolveTileFromScreen === "function"
		) {
			const tileInfo = EmberlightMapRenderer.resolveTileFromScreen(
				clientX,
				clientY,
			);
			if (tileInfo) {
				const tile = tileInfo.tile;
				const currentTownId = getTownId();
				const inTown = Boolean(currentTownId);
				let tileMeta = null;

				switch (tile) {
					case "~":
						tileMeta = {
							category: "HAZARD",
							title: "💧 Abyssal Frostway",
							hpPct: 100,
							accent: "#38bdf8",
							glow: "rgba(56, 189, 248, 0.45)",
							badge1: "WATER",
							badge2: "FREEZE VIABLE",
							eastAction: {
								id: "FIELD_FREEZE",
								label: "Freeze",
								icon: "❄️",
								title: "Glacial Transmutation",
								desc: "Freeze water into solid walkable frostway.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case '"':
						tileMeta = {
							category: "HAZARD",
							title: "🌿 Dry Bramble",
							hpPct: 100,
							accent: "#f97316",
							glow: "rgba(249, 115, 22, 0.45)",
							badge1: "OBSTACLE",
							badge2: "SCORCH VIABLE",
							eastAction: {
								id: "FIELD_SCORCH",
								label: "Scorch",
								icon: "🔥",
								title: "Pyretic Scorch",
								desc: "Incinerate dry brush into ash.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case "%":
						tileMeta = {
							category: "HAZARD",
							title: "☠️ Miasma Rift",
							hpPct: 100,
							accent: "#c084fc",
							glow: "rgba(192, 132, 252, 0.45)",
							badge1: "HAZARD",
							badge2: "DISPEL VIABLE",
							eastAction: {
								id: "FIELD_DISPEL",
								label: "Dispel",
								icon: "💨",
								title: "Aetheric Gale",
								desc: "Dispel corrupting miasma vapors.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case "$":
					case "*":
						tileMeta = {
							category: "TILE",
							title:
								tile === "$"
									? "📦 Subterranean Chest"
									: "📦 Resource Cache",
							hpPct: 100,
							accent: "#fbbf24",
							glow: "rgba(251, 191, 36, 0.45)",
							badge1: "TREASURE",
							badge2: "LOOT VIABLE",
							eastAction: {
								id: "INTERACT",
								label: "Loot",
								icon: "📦",
								title: "Claim Cache",
								desc: "Harvest valuable gold and resources.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case "@":
						tileMeta = {
							category: "TILE",
							title: "🐪 Merchant Caravan",
							hpPct: 100,
							accent: "#34d399",
							glow: "rgba(52, 211, 153, 0.45)",
							badge1: "COMMERCE",
							badge2: "SHOP VIABLE",
							eastAction: {
								id: "MENU_SHOP",
								label: "Trade",
								icon: "🐪",
								title: "Merchant Caravan",
								desc: "Trade weapons, provisions, and relics.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case "E":
						tileMeta = {
							category: "TILE",
							title: "🧓 Elder Rowan",
							hpPct: 100,
							accent: "#38bdf8",
							glow: "rgba(56, 189, 248, 0.45)",
							badge1: "HAMLET ELDER",
							badge2: "LORE",
							eastAction: {
								id: "INTERACT",
								label: "Commune",
								icon: "🧓",
								title: "Elder Rowan",
								desc: "Converse with the village elder.",
							},
							southAction: {
								id: "REST",
								label: "Inn",
								icon: "🏨",
								title: "Rest at Inn",
								desc: "Rest at The Hearth Inn.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case "B":
						tileMeta = {
							category: "ENEMY",
							title: "👑 Malakor Boss Chamber",
							hpPct: 100,
							accent: "#ef4444",
							glow: "rgba(239, 68, 68, 0.45)",
							badge1: "BOSS",
							badge2: "LETHAL",
							eastAction: {
								id: "INTERACT",
								label: "Engage",
								icon: "💀",
								title: "Challenge Malakor",
								desc: "Enter sovereign chamber to fight Malakor.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp before battle.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case "#":
						tileMeta = {
							category: "TILE",
							title: inTown ? "🪵 Timber Wall" : "🏔️ Stone Wall",
							hpPct: 100,
							accent: "#ff9d4d",
							glow: "rgba(255, 157, 77, 0.45)",
							badge1: `SECTOR [${tileInfo.tileX},${tileInfo.tileY}]`,
							badge2: "IMPASSABLE",
							eastAction: {
								id: "INTERACT",
								label: "Inspect",
								icon: "🔍",
								title: "Wall Survey",
								desc: "Solid fortification shielding this district.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					case ".":
						tileMeta = {
							category: "TILE",
							title: inTown ? "🛤️ Cobblestone Path" : "🌲 Wild Trail",
							hpPct: 100,
							accent: "#ff9d4d",
							glow: "rgba(255, 157, 77, 0.45)",
							badge1: `SECTOR [${tileInfo.tileX},${tileInfo.tileY}]`,
							badge2: inTown ? "NOMINAL" : "UNEXPLORED",
							eastAction: {
								id: "INTERACT",
								label: "Inspect",
								icon: "🔍",
								title: "Path Inspection",
								desc: "Clear open pathway for tactical movement.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					default: {
						const locTitle = inTown
							? "🏰 Oakhaven Hamlet"
							: getDungeonDepth() > 0
								? `💀 Catacombs (F${getDungeonDepth()})`
								: "🌲 The Ashen Wilds";
						tileMeta = {
							category: "TILE",
							title: locTitle,
							hpPct: 100,
							accent: "#ff9d4d",
							glow: "rgba(255, 157, 77, 0.45)",
							badge1: `SECTOR [${tileInfo.tileX},${tileInfo.tileY}]`,
							badge2: inTown ? "SAFE ZONE" : "WILDERNESS",
							eastAction: {
								id: "INTERACT",
								label: "Inspect",
								icon: "🔍",
								title: "Sector Survey",
								desc: "Scan local aetheric currents and terrain features.",
							},
							southAction: {
								id: "REST",
								label: "Camp",
								icon: "🔥",
								title: "Camp Rest",
								desc: "Rest at camp to restore party vitality.",
							},
							bbox: tileInfo.bbox,
						};
						break;
					}
				}

				if (tileMeta) {
					tileMeta.tileX = tileInfo.tileX;
					tileMeta.tileY = tileInfo.tileY;
					return tileMeta;
				}
			}
		}

		return null;
	};

	/**
	 * Commits action associated with a cardinal satellite leaf.
	 * @param {string} dir - 'NORTH' | 'EAST' | 'SOUTH' | 'WEST'
	 * @param {Object} [meta] - Target metadata.
	 */
	const executeLeafAction = (dir, meta) => {
		dismissTacticalChassis();
		if (!dir) return;

		switch (dir) {
			case "NORTH":
				if (meta?.northAction?.id === "3D_ADVANCE") {
					const map = getActiveWorldMap();
					const pos = getWorldPos();
					const facing = store?.getFlag("facingDirection") || "DOWN";
					/** @type {Record<string, { x: number, y: number }>} */
					const facingDeltas = {
						UP: { x: 0, y: -1 },
						RIGHT: { x: 1, y: 0 },
						DOWN: { x: 0, y: 1 },
						LEFT: { x: -1, y: 0 },
					};
					const d = facingDeltas[facing] || { x: 0, y: 1 };
					const targetPos = { x: pos.x + d.x, y: pos.y + d.y };
					if (isTilePassable(map, targetPos)) {
						moveParty(d.x, d.y);
					} else {
						interactFacing();
					}
				} else if (activeDistrict === "COMBAT") {
					if (
						typeof EmberlightCombat !== "undefined" &&
						typeof EmberlightCombat.handleHostAction === "function"
					) {
						EmberlightCombat.handleHostAction("CHOICE_4");
					}
				} else {
					OVERWORLD_ACTION_HANDLERS.MENU_POUCH();
				}
				break;
			case "EAST":
				if (meta?.eastAction?.id === "3D_DEEP_SCAN") {
					const aheadDesc = meta.title || "Forward Sector";
					notifyStatus(
						`Deep Scan: Analyzing ${aheadDesc}. Sensor signature nominal.`,
						"info",
					);
					if (typeof updateTelegraphPane === "function") {
						updateTelegraphPane({
							title: `3D SENSOR SCAN: ${aheadDesc.toUpperCase()}`,
							subtitle: "ACOUSTIC & OPTICAL SIGNATURES",
							lines: [
								`Target Profile: ${meta.badge1 || "NOMINAL"} // ${meta.badge2 || "CLEAR"}`,
								"Sensor Telemetry: Line-of-sight confirmed.",
								`Tactical Advisory: ${meta.eastAction.desc || "No immediate hostile anomalies detected."}`,
							],
						});
					}
					publishSfx("sfx_confirm");
				} else if (meta?.eastAction?.id) {
					const actId = meta.eastAction.id;
					if (actId === "THREAT_ORACLE") {
						notifyStatus(
							"Threat Oracle: Malakor preparing Heavy Cleave (32 Physical Damage).",
							"warning",
						);
						publishSfx("sfx_confirm");
					} else if (actId === "FIELD_FREEZE") {
						executeCapability("cap:elemental.freeze");
					} else if (actId === "FIELD_SCORCH") {
						executeCapability("cap:elemental.scorch");
					} else if (actId === "FIELD_DISPEL") {
						executeCapability("cap:elemental.gale_dispel");
					} else if (actId === "MENU_SHOP") {
						enterMarketDistrict("VILLAGE_SHOP");
					} else if (actId === "INTERACT") {
						interactFacing();
					} else if (actId === "FIELD_TRIAGE") {
						notifyStatus("Field triage applied to vanguard unit.", "success");
						publishSfx("sfx_heal");
					}
				} else {
					interactFacing();
				}
				break;
			case "SOUTH":
				if (meta?.southAction?.id === "3D_ABOUT_FACE") {
					const facingOrder = ["UP", "RIGHT", "DOWN", "LEFT"];
					const currentFacing = store?.getFlag("facingDirection") || "DOWN";
					const foundFacingIdx = facingOrder.indexOf(currentFacing);
					const currentIdx = foundFacingIdx !== -1 ? foundFacingIdx : 2;
					const newFacing = facingOrder[(currentIdx + 2) % 4];
					pivotFacing(newFacing);
					notifyStatus(
						`Tactical Turn: Performed 180° about-face to ${newFacing}.`,
						"info",
					);
				} else if (activeDistrict === "COMBAT") {
					if (
						typeof EmberlightCombat !== "undefined" &&
						typeof EmberlightCombat.handleHostAction === "function"
					) {
						EmberlightCombat.handleHostAction("CHOICE_2");
					}
				} else {
					OVERWORLD_ACTION_HANDLERS.REST();
				}
				break;
			case "WEST":
				if (meta?.westAction?.id === "3D_TOGGLE_EXPAND") {
					toggle3DViewportExpansion();
				} else if (activeDistrict === "COMBAT") {
					switchDistrict("STATUS");
				} else {
					switchDistrict("CHRONICLE");
				}
				break;
		}
	};

	/**
	 * Handles RMB mousedown: Prioritizes universal unwind over chassis spawn.
	 * @param {MouseEvent} e
	 */
	const handlePointerContextDown = (e) => {
		if (focalRingActive) {
			dismissTacticalChassis();
			return;
		}

		if (isSaveLoadModalOpen) {
			handleCancelAction();
			return;
		}

		if (store?.getFlag("pouchOpen") || isQ4DeckExpanded) {
			handleCancelAction();
			return;
		}

		// Q4 Hero Card Right Click: Directly opens that Hero's Armory/Status sheet
		const targetEl = /** @type {HTMLElement|null} */ (e?.target);
		const heroCard = targetEl?.closest
			? targetEl.closest(".hud-char-card, [data-hero-idx]")
			: null;
		if (heroCard) {
			const heroIdxAttr =
				heroCard.getAttribute("data-hero-idx") ||
				heroCard.getAttribute("data-idx");
			if (heroIdxAttr !== null && heroIdxAttr !== undefined) {
				store?.setFlag("selectedHeroIdx", parseInt(heroIdxAttr, 10));
			}
			switchDistrict("ARMORY");
			return;
		}

		// Universal Right Click Cancel / Back for dedicated menus (Status, Armory, Skills, Chronicle, Market, Relic Forge, Lockpick, Settings)
		if (
			activeDistrict !== "OVERWORLD" &&
			activeDistrict !== "world" &&
			activeDistrict !== "COMBAT" &&
			activeDistrict !== "TITLE"
		) {
			handleCancelAction();
			return;
		}

		if (activeDistrict === "COMBAT") {
			if (
				typeof EmberlightCombat !== "undefined" &&
				typeof EmberlightCombat.getState === "function"
			) {
				const cState = EmberlightCombat.getState();
				if (
					cState?.phase === "TARGETING_ENEMY" ||
					cState?.phase === "TARGETING_ALLY" ||
					cState?.phase === "PENDING_SKILL" ||
					(cState?.selectedTab && cState.selectedTab !== "ATTACK")
				) {
					EmberlightCombat.handleHostAction("CANCEL");
					renderHUD();
					return;
				}
			}
		}

		if (activeDistrict === "TITLE") {
			return;
		}

		const meta = resolveTargetMetadata(e.target, e.clientX, e.clientY);
		if (meta) {
			focalRingActive = true;
			rmbEngine.isDown = true;
			rmbEngine.originX = e.clientX;
			rmbEngine.originY = e.clientY;
			rmbEngine.targetCenterX = meta.bbox
				? meta.bbox.left + meta.bbox.width / 2
				: e.clientX;
			rmbEngine.targetCenterY = meta.bbox
				? meta.bbox.top + meta.bbox.height / 2
				: e.clientY;
			rmbEngine.flickArmed = false;
			rmbEngine.activeMeta = meta;
			rmbEngine.highlightedLeaf = null;

			if (meta.tileX !== undefined && meta.tileY !== undefined) {
				if (
					typeof EmberlightMapRenderer !== "undefined" &&
					typeof EmberlightMapRenderer.setTargetedTile === "function"
				) {
					EmberlightMapRenderer.setTargetedTile(meta.tileX, meta.tileY);
				}
			}

			if (Cockpit && typeof Cockpit.deployTacticalChassis === "function") {
				Cockpit.deployTacticalChassis(meta, (dir, selectedMeta) => {
					executeLeafAction(dir, selectedMeta);
				});
			}
		}
	};

	/**
	 * Handles RMB mousemove: Evaluates hold-and-snap vector angles.
	 * @param {MouseEvent} e
	 */
	const handlePointerContextMove = (e) => {
		if (!rmbEngine.isDown || !focalRingActive) return;
		const dx = e.clientX - rmbEngine.targetCenterX;
		const dy = e.clientY - rmbEngine.targetCenterY;
		const dist = Math.hypot(dx, dy);

		if (dist >= 24) {
			rmbEngine.flickArmed = true;
			const dir = calculatePolarDirection(dx, dy);
			rmbEngine.highlightedLeaf = dir;
			if (Cockpit && typeof Cockpit.highlightLeaf === "function") {
				Cockpit.highlightLeaf(dir);
			}
		} else {
			rmbEngine.flickArmed = false;
			rmbEngine.highlightedLeaf = null;
			if (Cockpit && typeof Cockpit.clearLeafHighlights === "function") {
				Cockpit.clearLeafHighlights();
			}
		}
	};

	/**
	 * Handles RMB mouseup: Commits flick gesture or leaves chassis pinned.
	 * @param {MouseEvent} e
	 */
	const handlePointerContextUp = (e) => {
		if (!rmbEngine.isDown) return;
		rmbEngine.isDown = false;

		if (
			rmbEngine.flickArmed &&
			rmbEngine.highlightedLeaf &&
			rmbEngine.activeMeta
		) {
			executeLeafAction(rmbEngine.highlightedLeaf, rmbEngine.activeMeta);
		}
	};

	// --- Navigation & Motion Coordinator ---
	/** @param {string} action */
	const handle3DNav = (action) => {
		const facingOrder = ["UP", "RIGHT", "DOWN", "LEFT"];
		/** @type {Record<string, { x: number, y: number }>} */
		const facingDeltas = {
			UP: { x: 0, y: -1 },
			RIGHT: { x: 1, y: 0 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
		};
		const currentFacing = store?.getFlag("facingDirection") || "DOWN";
		const foundFacingIdx = facingOrder.indexOf(currentFacing);
		const currentIdx = foundFacingIdx !== -1 ? foundFacingIdx : 2;

		switch (action) {
			case "UP": {
				const d = facingDeltas[currentFacing];
				moveParty(d.x, d.y);
				break;
			}
			case "DOWN": {
				const d = facingDeltas[currentFacing];
				moveParty(-d.x, -d.y);
				break;
			}
			case "LEFT": {
				const newFacing = facingOrder[(currentIdx + 3) % 4];
				store?.setFlag("facingDirection", newFacing);
				if (
					typeof EmberlightOverworld !== "undefined" &&
					typeof EmberlightOverworld.handleHostAction === "function"
				) {
					EmberlightOverworld.handleHostAction(newFacing);
				}
				renderHUD();
				break;
			}
			case "RIGHT": {
				const newFacing = facingOrder[(currentIdx + 1) % 4];
				store?.setFlag("facingDirection", newFacing);
				if (
					typeof EmberlightOverworld !== "undefined" &&
					typeof EmberlightOverworld.handleHostAction === "function"
				) {
					EmberlightOverworld.handleHostAction(newFacing);
				}
				renderHUD();
				break;
			}
			case "STRAFE_LEFT": {
				const leftFacing = facingOrder[(currentIdx + 3) % 4];
				const d = facingDeltas[leftFacing];
				moveParty(d.x, d.y);
				break;
			}
		}
	};

	/**
	 * @param {number} dx
	 * @param {number} dy
	 * @returns {void}
	 */
	const moveParty = (dx, dy) => {
		if (isQ4DeckExpanded) return;
		if (
			activeDistrict !== "OVERWORLD" &&
			activeDistrict !== "world" &&
			activeDistrict !== "dungeon"
		)
			return;

		let facing = "DOWN";
		if (dx > 0) {
			facing = "RIGHT";
		} else if (dx < 0) {
			facing = "LEFT";
		} else if (dy < 0) {
			facing = "UP";
		}
		store?.setFlag("facingDirection", facing);

		const currentPos = getWorldPos();
		const targetPos = { x: currentPos.x + dx, y: currentPos.y + dy };
		const worldMap = getActiveWorldMap();

		if (!isTilePassable(worldMap, targetPos)) {
			publishSfx("sfx_bump");
			return;
		}

		setWorldPos(targetPos);
		stepCounter++;

		// Biome & terrain-aware acoustic stepping feedback
		const stepTile = worldMap?.[targetPos.y]?.[targetPos.x];
		if (getDungeonDepth() > 0) {
			publishSfx("sfx_step_dungeon");
		} else if (stepTile === '"') {
			publishSfx("sfx_step_grass");
		} else if (stepTile === "~") {
			publishSfx("sfx_step_water");
		} else {
			publishSfx("sfx_step");
		}

		if (
			typeof EmberlightOverworld !== "undefined" &&
			typeof EmberlightOverworld.handleHostAction === "function"
		) {
			EmberlightOverworld.handleHostAction(facing);
		}

		evaluateTileTrigger(targetPos, null, false);

		if (stepCounter % 15 === 0) commitSession("PeriodicStepAutosave");
		renderHUD();
	};

	/**
	 * Pivots avatar facing direction in-place without changing grid position coordinates.
	 * @param {'UP'|'DOWN'|'LEFT'|'RIGHT'|string} facing
	 * @returns {void}
	 */
	const pivotFacing = (facing) => {
		if (!facing) return;
		const normFacing = facing.toUpperCase();
		if (!["UP", "DOWN", "LEFT", "RIGHT"].includes(normFacing)) return;
		store?.setFlag("facingDirection", normFacing);
		if (
			typeof EmberlightOverworld !== "undefined" &&
			typeof EmberlightOverworld.handleHostAction === "function"
		) {
			EmberlightOverworld.handleHostAction(normFacing);
		}
		publishSfx("sfx_hover");
		renderHUD();
	};

	/** @returns {void} */
	const interactFacing = () => {
		const currentPos = getWorldPos();
		const facing = store?.getFlag("facingDirection") || "DOWN";
		/** @type {Record<string, { x: number, y: number }>} */
		const deltas = {
			UP: { x: 0, y: -1 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
			RIGHT: { x: 1, y: 0 },
		};
		const d = deltas[facing] || { x: 0, y: 1 };
		const targetPos = { x: currentPos.x + d.x, y: currentPos.y + d.y };

		evaluateTileTrigger(currentPos, targetPos, true);
	};
	//#endregion

	//#region [SEC-07] Input Hardware Translation, DOM Controls & Lifecycle Stepper
	// --- Action Inversion & Command Dispatcher ---
	/** @param {CockpitAction} action */
	const handleCockpitAction = (action) => {
		if (!action?.type) return;
		switch (action.type) {
			case "MOVE":
				moveParty(action.dx || 0, action.dy || 0);
				break;
			case "PIVOT":
				pivotFacing(action.facing || action.direction);
				break;
			case "INTERACT":
				interactFacing();
				break;
			case "CANCEL":
				handleCancelAction();
				break;
			case "TOGGLE_EXPAND_DECK":
				toggleQ4DeckExpansion();
				break;
			case "TOGGLE_3D_VIEW":
				toggle3DViewportExpansion();
				break;
			case "SWITCH_DISTRICT":
				switchDistrict(action.district || "OVERWORLD", action.metadata || {});
				break;
			case "USE_FIELD_ITEM":
				if (action.itemId && typeof EmberlightFieldPouch !== "undefined") {
					EmberlightFieldPouch.useFieldItem(
						action.itemId,
						action.targetHeroId || action.targetId,
					);
					renderHUD();
				}
				break;
			case "EXECUTE_CAPABILITY":
				executeCapability(action.capability || "", action.context || {});
				break;
		}
	};

	// --- Input Hardware Translation ---
	/** @type {Record<string, function(): void>} */
	const OVERWORLD_ACTION_HANDLERS = {
		UP: () => moveParty(0, -1),
		DOWN: () => moveParty(0, 1),
		LEFT: () => moveParty(-1, 0),
		RIGHT: () => moveParty(1, 0),
		CONFIRM: () => interactFacing(),
		CANCEL: () => handleCancelAction(),
		TOGGLE_EXPAND_DECK: () => toggleQ4DeckExpansion(),
		TOGGLE_3D_VIEW: () => toggle3DViewportExpansion(),
		MENU_ARMORY: () => switchDistrict("ARMORY"),
		MENU_PROGRESSION: () => switchDistrict("PROGRESSION"),
		MENU_STATUS: () => switchDistrict("STATUS"),
		MENU_POUCH: () => {
			const cur = store?.getFlag("pouchOpen") || false;
			store?.setFlag("pouchOpen", !cur);
			renderHUD();
		},
		MENU_SHOP: () => {
			if (getTownId()) {
				enterMarketDistrict("VILLAGE_SHOP");
			} else {
				notifyStatus(
					"Shopping is only available at the Merchant Caravan in town.",
					"warning",
				);
			}
		},
		MENU_CHRONICLE: () => switchDistrict("CHRONICLE"),
		FIELD_SCORCH: () => executeCapability("cap:elemental.scorch"),
		FIELD_FREEZE: () => executeCapability("cap:elemental.freeze"),
		FIELD_CONSECRATE: () => executeCapability("cap:sanctuary.consecrate"),
		FIELD_DISPEL: () => executeCapability("cap:elemental.gale_dispel"),
	};

	/** @param {string} action */
	const handleTitleInputAction = (action) => {
		if (action === "CONFIRM") {
			const saveMgr =
				typeof EmberlightSaveManager !== "undefined"
					? EmberlightSaveManager
					: null;
			if (saveMgr?.hasSave()) store?.StorageManager?.load();
			else store?.startNewGame();
			switchDistrict("OVERWORLD");
		} else if (action === "CANCEL") {
			switchDistrict("SETTINGS");
		}
	};

	/**
	 * @param {string} action
	 * @returns {boolean}
	 */
	const delegateDistrictInputAction = (action) => {
		if (activeDistrict === "COMBAT") {
			if (
				typeof EmberlightCombat !== "undefined" &&
				typeof EmberlightCombat.handleHostAction === "function"
			) {
				EmberlightCombat.handleHostAction(action);
				renderHUD();
			}
			return true;
		}
		if (activeDistrict === "LOCKPICK") {
			if (
				typeof EmberlightLockpick !== "undefined" &&
				typeof EmberlightLockpick.handleHostAction === "function"
			) {
				EmberlightLockpick.handleHostAction(action);
				renderHUD();
			}
			return true;
		}
		if (activeDistrict === "SETTINGS") {
			if (
				typeof EmberlightSettings !== "undefined" &&
				typeof EmberlightSettings.handleHostAction === "function"
			) {
				EmberlightSettings.handleHostAction(action);
			}
			return true;
		}
		return false;
	};

	/**
	 * @param {string} action
	 * @param {Object} [evt={}]
	 * @returns {void}
	 */
	const handleInputAction = (action, evt = {}) => {
		if (!action) return;

		if (activeDistrict === "TITLE") {
			handleTitleInputAction(action);
			return;
		}

		if (delegateDistrictInputAction(action)) {
			return;
		}

		if (activeDistrict !== "OVERWORLD" && activeDistrict !== "world") {
			if (action === "CANCEL") {
				handleCancelAction();
			}
			return;
		}

		// Pivot-in-place when holding Shift in 2D mode
		if (evt?.shiftKey && ["UP", "DOWN", "LEFT", "RIGHT"].includes(action)) {
			pivotFacing(action);
			return;
		}

		if (
			is3DViewExpanded &&
			["UP", "DOWN", "LEFT", "RIGHT", "STRAFE_LEFT"].includes(action)
		) {
			handle3DNav(action);
			return;
		}

		const handler = OVERWORLD_ACTION_HANDLERS[action];
		if (handler) {
			handler();
		}
	};

	// --- DOM Controls Binding ---
	/** @returns {void} */
	const bindDOMControls = () => {
		if (typeof document === "undefined") return;

		const bind = (id, fn) => {
			const el = document.getElementById(id);
			if (el) el.onclick = fn;
		};

		// Title Screen Buttons
		bind("menu-continue-btn", () => {
			const saveMgr =
				typeof EmberlightSaveManager !== "undefined"
					? EmberlightSaveManager
					: null;
			const recentSlot = saveMgr?.getMostRecentSlotId
				? saveMgr.getMostRecentSlotId()
				: "SLOT_1";
			if (saveMgr?.hasSave(recentSlot)) {
				store?.StorageManager?.setActiveSlotId(recentSlot);
				store?.StorageManager?.load(undefined, recentSlot);
				notifyStatus(`Expedition resumed from ${recentSlot}.`, "success");
			} else {
				store?.startNewGame();
				notifyStatus("No save found. Initialized fresh expedition.", "info");
			}
			switchDistrict("OVERWORLD");
			publishSfx("sfx_confirm");
		});

		bind("menu-new-game-btn", () => {
			store?.startNewGame();
			switchDistrict("OVERWORLD");
			notifyStatus("Mission initialized. Explore the wilderness.", "success");
			publishSfx("sfx_confirm");
		});

		bind("menu-load-btn", () => {
			openSaveLoadModal("LOAD");
			publishSfx("sfx_confirm");
		});

		bind("close-save-load-btn", () => {
			closeSaveLoadModal();
		});

		bind("save-load-back-btn", () => {
			closeSaveLoadModal();
		});

		bind("title-settings-btn", () => switchDistrict("SETTINGS"));
		bind("top-settings-btn", () => {
			if (activeDistrict === "SETTINGS") handleCancelAction();
			else switchDistrict("SETTINGS");
		});

		bind("title-mute-btn", () => {
			if (
				typeof EmberlightAcousticSFX !== "undefined" &&
				typeof EmberlightAcousticSFX.toggleMute === "function"
			) {
				const muted = EmberlightAcousticSFX.toggleMute();
				const btn = document.getElementById("title-mute-btn");
				if (btn) btn.textContent = muted ? "🔇 MUTED" : "🔊 AUDIO";
			}
		});

		// Game Over Buttons
		bind("go-reload-btn", () => {
			if (typeof EmberlightSaveManager !== "undefined")
				store?.StorageManager?.load();
			switchDistrict("OVERWORLD");
		});

		bind("go-yield-btn", () => {
			const party = getParty().map((c) => ({
				...c,
				alive: true,
				hp: Math.max(1, Math.floor((c.maxHp || 30) / 2)),
			}));
			setParty(party);
			modifyGold(-Math.floor(getGold() * 0.25));
			setDungeonDepth(0);
			setWorldPos({ x: 1, y: 1 });
			switchDistrict("OVERWORLD");
		});

		// Unified District Nav Dock
		bind("nav-status-btn", () => {
			if (activeDistrict === "COMBAT")
				notifyStatus(
					"Cannot open Status during combat! Disengage first.",
					"warning",
				);
			else switchDistrict("STATUS");
		});
		bind("nav-armory-btn", () => {
			if (activeDistrict === "COMBAT")
				notifyStatus(
					"Cannot enter Armory during combat! Disengage first.",
					"warning",
				);
			else switchDistrict("ARMORY");
		});
		bind("nav-progression-btn", () => {
			if (activeDistrict === "COMBAT")
				notifyStatus(
					"Cannot open Progression during combat! Disengage first.",
					"warning",
				);
			else switchDistrict("PROGRESSION");
		});
		bind("nav-pouch-btn", () => {
			if (activeDistrict === "COMBAT") {
				if (typeof EmberlightCombat !== "undefined")
					EmberlightCombat.handleHostAction("CHOICE_4");
				return;
			}
			const cur = store?.getFlag("pouchOpen") || false;
			store?.setFlag("pouchOpen", !cur);
			renderHUD();
		});
		bind("nav-chronicle-btn", () => {
			if (activeDistrict === "COMBAT")
				notifyStatus("Cannot open Chronicle during combat!", "warning");
			else switchDistrict("CHRONICLE");
		});
		bind("nav-rest-btn", () => {
			if (activeDistrict === "COMBAT") {
				notifyStatus("Cannot rest while engaged in combat!", "warning");
				return;
			}
			const rested = getParty().map((c) => ({
				...c,
				alive: true,
				hp: c.maxHp || c.hp,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			setParty(rested);
			notifyStatus(
				"The squad rested at camp. Vitality and essence fully restored.",
				"success",
			);
			publishSfx("sfx_heal");
			renderHUD();
		});
		// Viewport & Deck Expansion Controls
		bind("q4-expand-btn", () => toggleQ4DeckExpansion());
		bind("q2-expand-btn", () => toggle3DViewportExpansion());
		bind("close-pouch-btn", () => handleCancelAction());
		bind("nav-settings-btn", () => {
			if (activeDistrict === "COMBAT")
				notifyStatus(
					"Use [ESC] or Disengage to leave combat before opening Settings.",
					"warning",
				);
			else switchDistrict("SETTINGS");
		});
	};

	// --- Lifecycle Stepper (Tick) ---
	/** @param {number} dt */
	const updateOverworldSubsystems = (dt) => {
		if (
			activeDistrict === "OVERWORLD" &&
			typeof EmberlightOverworld !== "undefined" &&
			typeof EmberlightOverworld.update === "function"
		) {
			const diag =
				typeof EmberlightOverworld.getDiagnostics === "function"
					? EmberlightOverworld.getDiagnostics()
					: null;
			if (
				diag?.lifecycleState === "READY" ||
				diag?.lifecycleState === "RUNNING"
			) {
				EmberlightOverworld.update(dt, { inputs: [] });
			}
		}
		if (
			typeof EmberlightPseudo3D !== "undefined" &&
			typeof EmberlightPseudo3D.update === "function"
		) {
			EmberlightPseudo3D.update(dt);
			const currentTownId = getTownId();
			const inTown = Boolean(currentTownId);
			const snap = {
				party: getParty(),
				gold: getGold(),
				inventory: /** @type {Record<string, number>} */ (
					/** @type {unknown} */ (getInventory())
				),
				worldPos: getWorldPos(),
				playerPos: { ...getWorldPos(), inTown, townId: currentTownId },
				map: getActiveWorldMap(),
				macroPos: getMacroPos(),
				activeDistrict: "OVERWORLD",
				dungeonFloor: getDungeonFloor(),
				dungeonDepth: getDungeonDepth(),
				stepCounter,
				flags: getFlags(),
				facing: store?.getFlag("facingDirection") || "DOWN",
				pouchOpen: store?.getFlag("pouchOpen") || false,
				townId: currentTownId,
				inTown,
			};
			EmberlightPseudo3D.render(snap);
		}
	};

	/** @param {number} dt */
	const updateActiveDistrictSubsystems = (dt) => {
		if (
			typeof EmberlightSoundtrack !== "undefined" &&
			typeof EmberlightSoundtrack.update === "function"
		) {
			EmberlightSoundtrack.update(dt);
		}
		if (
			activeDistrict === "COMBAT" &&
			typeof EmberlightCombat !== "undefined" &&
			typeof EmberlightCombat.update === "function"
		) {
			EmberlightCombat.update(dt, { inputs: [] });
		} else if (
			activeDistrict === "LOCKPICK" &&
			typeof EmberlightLockpick !== "undefined" &&
			typeof EmberlightLockpick.update === "function"
		) {
			EmberlightLockpick.update(dt, { inputs: [] });
			if (typeof EmberlightLockpick.render === "function")
				EmberlightLockpick.render();
		} else if (activeDistrict !== "TITLE" && activeDistrict !== "GAME_OVER") {
			updateOverworldSubsystems(dt);
		}
	};

	/** @param {number} [timestamp] */
	const hostTick = (
		timestamp = typeof performance !== "undefined"
			? performance.now()
			: Date.now(),
	) => {
		const dt = (timestamp - lastFrameTime) / 1000;
		lastFrameTime = timestamp;

		if (!isTickPaused) {
			updateActiveDistrictSubsystems(dt);
		}

		if (typeof requestAnimationFrame !== "undefined")
			requestAnimationFrame(hostTick);
	};

	/** @param {string} [encounterKey='DEFAULT'] */
	const startCombat = (encounterKey = "DEFAULT") => {
		if (is3DViewExpanded) {
			toggle3DViewportExpansion(false);
		}
		if (isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false);
		}
		activeDistrict = "COMBAT";
		if (
			typeof EmberlightCombat !== "undefined" &&
			typeof EmberlightCombat.reset === "function"
		) {
			const manifest =
				typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {};
			const encounters = manifest.Encounters || {};
			const encounter = encounters[encounterKey] ||
				encounters.DEFAULT || {
				enemies: [
					{
						id: "goblin",
						name: "Goblin",
						hp: 30,
						maxHp: 30,
						atk: 8,
						def: 2,
						agi: 4,
					},
				],
			};
			EmberlightCombat.reset({
				party: getParty(),
				gold: getGold(),
				inventory: /** @type {Record<string, number>} */ (
					/** @type {unknown} */ (getInventory())
				),
				encounterKey,
				encounter,
				dungeonDepth: getDungeonDepth(),
			});
		}

		if (
			typeof EmberlightCombatBackdrop !== "undefined" &&
			typeof EmberlightCombatBackdrop.setBiome === "function"
		) {
			let biome = "MEADOW";
			if (getDungeonDepth() > 0) biome = "CRYPT";
			else if (getTownId()) biome = "TOWN";
			if (encounterKey?.includes("MALAKOR")) biome = "BOSS";
			EmberlightCombatBackdrop.setBiome(biome);
		}

		if (Router) Router.switchDistrict("COMBAT");
		renderHUD();
	};
	//#endregion

	//#region [SEC-08] Global Subsystem Bootstrap, EventBus Subscriptions & Public Interface Export
	// --- EventBus Subscriptions ---
	if (EventBus && typeof EventBus.subscribe === "function") {
		EventBus.subscribe(
			"cockpit:action",
			(/** @type {CockpitAction} */ action) => handleCockpitAction(action),
		);
		EventBus.subscribe("input:action", (evt) =>
			handleInputAction(evt?.action, evt),
		);
		EventBus.subscribe("district:switch_request", (evt) =>
			switchDistrict(evt.district, evt.metadata),
		);
		EventBus.subscribe("overworld:encounter", (evt) =>
			startCombat(evt?.encounterKey),
		);
		EventBus.subscribe("status:updated", () => renderHUD());
		EventBus.subscribe("armory:resolved", () => renderHUD());
		EventBus.subscribe("ecology:tile_mutation", (evt) => {
			if (evt?.district && evt?.key)
				recordTileMutation(evt.district, evt.key, evt.mutation);
		});
		EventBus.subscribe("settings:resolved", () => {
			switchDistrict("OVERWORLD");
		});
		EventBus.subscribe("auditor:resolved", () => {
			switchDistrict("OVERWORLD");
		});
		EventBus.subscribe("system:command", (evt) => {
			if (!evt?.command) return;
			if (evt.command === "SAVE_GAME" || evt.command === "OPEN_SAVE_MODAL") {
				openSaveLoadModal("SAVE");
			} else if (evt.command === "OPEN_LOAD_MODAL") {
				openSaveLoadModal("LOAD");
			} else if (evt.command === "RETURN_TO_TITLE") {
				switchDistrict("TITLE");
			} else if (evt.command === "WIPE_STORAGE") {
				if (typeof store?.StorageManager?.clear === "function") {
					store.StorageManager.clear();
				}
				notifyStatus("Local storage cleared. Returning to title.", "danger");
				switchDistrict("TITLE");
			} else if (evt.command === "SET_LAYOUT_RATIO") {
				notifyStatus(`Viewport layout updated: ${evt.layoutPreset}`, "info");
			} else if (evt.command === "SET_FONT_SCALE") {
				notifyStatus(`UI font scale updated: ${evt.fontScale}`, "info");
			} else if (evt.command === "TOGGLE_FULLSCREEN") {
				if (typeof document !== "undefined") {
					if (!document.fullscreenElement) {
						document.documentElement.requestFullscreen?.().catch(() => { });
						notifyStatus("Display mode: FULLSCREEN", "info");
					} else {
						document.exitFullscreen?.().catch(() => { });
						notifyStatus("Display mode: WINDOWED", "info");
					}
				}
			} else if (evt.command === "TOGGLE_SCANLINES") {
				if (typeof document !== "undefined" && document.body) {
					document.body.classList.toggle("crt-enabled", Boolean(evt.enabled));
					notifyStatus(
						`CRT Scanlines: ${evt.enabled ? "ENABLED" : "DISABLED"}`,
						"info",
					);
				}
			} else if (evt.command === "TOGGLE_MUTE") {
				notifyStatus(
					`Master Audio: ${evt.isMuted ? "MUTED" : "ACTIVE"}`,
					"info",
				);
			}
		});
		EventBus.subscribe("combat:resolved", (evt) => {
			if (!evt) return;
			if (evt.party) setParty(evt.party);
			if (typeof evt.gold === "number") store?.setGold(evt.gold);
			if (evt.inventory) setInventory(evt.inventory);

			if (evt.outcome === "defeat") {
				notifyStatus("The squad collapsed in combat.", "danger");
				publishSfx("sfx_defeat");
				switchDistrict("GAME_OVER");
			} else if (evt.outcome === "escaped") {
				notifyStatus("Retreated from the battlefield.", "info");
				switchDistrict("OVERWORLD");
			} else {
				notifyStatus("Victory achieved! Spoils secured.", "success");
				publishSfx("sfx_victory");
				switchDistrict("OVERWORLD");
			}
		});
		EventBus.subscribe("lockpick:resolved", (evt) => {
			if (!evt) return;
			if (evt.success) {
				if (evt.rewardLoot?.gold) modifyGold(evt.rewardLoot.gold);
				if (evt.rewardLoot?.item) modifyItem(evt.rewardLoot.item, 1);
				if (evt.flagsDelta) {
					Object.entries(evt.flagsDelta).forEach(([k, v]) => {
						setFlag(k, v);
					});
				}
				const goldTxt = evt.rewardLoot?.gold ? `${evt.rewardLoot.gold}G` : "";
				const itemTxt = evt.rewardLoot?.item ? ` + ${evt.rewardLoot.item}` : "";
				notifyStatus(
					`Harmonic seal shattered! Claimed: ${goldTxt}${itemTxt}`,
					"success",
				);
				publishSfx("sfx_victory");
			} else {
				notifyStatus("Harmonic disruption aborted.", "info");
			}
			switchDistrict("OVERWORLD");
		});
	}

	const KNOWN_SUBSYSTEM_NAMES = [
		"EmberlightCombat",
		"EmberlightOverworld",
		"EmberlightMarket",
		"EmberlightProgression",
		"EmberlightLockpick",
		"EmberlightRelicForge",
		"EmberlightArmory",
		"EmberlightScript",
		"EmberlightStatus",
		"EmberlightChronicle",
		"EmberlightSettings",
		"EmberlightAuditor",
		"EmberlightCockpitRenderer",
		"EmberlightDistrictRouter",
		"EmberlightWorldEcology",
		"EmberlightMapRenderer",
		"EmberlightOverworldRenderer",
		"EmberlightDynamicLights",
		"EmberlightPseudo3D",
		"EmberlightThreatOracle",
		"EmberlightCombatRenderer",
		"EmberlightCombatBackdrop",
		"EmberlightCombatVFX",
		"EmberlightAcousticSFX",
		"EmberlightSoundtrack",
		"EmberlightVoice",
	];

	/**
	 * Safely resolves a global subsystem handle across browser and Node runtimes.
	 * [Pure Query]
	 * @param {string} name - Subsystem global identifier.
	 * @returns {any} Subsystem reference or null.
	 */
	const resolveGlobalSubsystem = (name) => {
		try {
			if (typeof globalThis !== "undefined" && globalThis[name])
				return globalThis[name];
			if (typeof window !== "undefined" && window[name]) return window[name];
		} catch {
			// Non-fatal fallback
		}
		return null;
	};

	/**
	 * Creates an SDCP-001 attenuated capability context for a specific subsystem.
	 * [Pure Context Factory]
	 * @param {string} name - Subsystem identifier.
	 * @param {HostContext} rawContext - Raw host runtime context.
	 * @returns {HostContext} Attenuated context descriptor.
	 */
	const createAttenuatedContext = (name, rawContext) => {
		if (!rawContext) return rawContext;
		const tenantKey = name.replace(/^Emberlight/, "").toLowerCase();
		const attenuatedBus = {
			publish: (channel, payload) => {
				if (rawContext.eventBus && typeof rawContext.eventBus.publish === "function") {
					rawContext.eventBus.publish(channel, payload);
				}
			},
			subscribe: (channel, callback) => {
				if (rawContext.eventBus && typeof rawContext.eventBus.subscribe === "function") {
					return rawContext.eventBus.subscribe(channel, callback);
				}
				return () => {};
			},
			unsubscribe: (channel, callback) => {
				if (rawContext.eventBus && typeof rawContext.eventBus.unsubscribe === "function") {
					rawContext.eventBus.unsubscribe(channel, callback);
				}
			},
		};
		return {
			...rawContext,
			eventBus: attenuatedBus,
			tenantId: tenantKey,
		};
	};

	/**
	 * Configures and initializes a peripheral or simulation subsystem.
	 * [State Mutating]
	 * @param {string} name - Subsystem name token.
	 * @param {any} sub - Target subsystem handle.
	 * @param {Object} hostConfig - Host configuration dictionary.
	 * @param {HostContext} hostContext - Host runtime context.
	 * @returns {void}
	 */
	const initializeSubsystem = (name, sub, hostConfig, hostContext) => {
		if (!sub) return;
		try {
			const diag =
				typeof sub.getDiagnostics === "function" ? sub.getDiagnostics() : null;
			const state = diag?.lifecycleState;
			const needsConfig = !state || state === "UNCONFIGURED";
			if (needsConfig && typeof sub.configure === "function") {
				sub.configure(hostConfig);
			}
			const canInit = needsConfig || state === "CONFIGURED";
			if (canInit && typeof sub.init === "function") {
				const scopedContext = createAttenuatedContext(name, hostContext);
				sub.init(scopedContext);
			}
		} catch {
			// Non-fatal
		}
	};

	// --- Public Host Interface ---
	/**
	 * Bootstraps all known engine subsystems.
	 * [State Mutating]
	 * @param {Object} hostConfig - Host configuration.
	 * @param {HostContext} hostContext - Host context.
	 * @returns {void}
	 */
	const bootstrapSubsystems = (hostConfig, hostContext) => {
		KNOWN_SUBSYSTEM_NAMES.forEach((name) => {
			const sub = resolveGlobalSubsystem(name);
			initializeSubsystem(name, sub, hostConfig, hostContext);
		});

		const inputSub = resolveGlobalSubsystem("EmberlightInput");
		if (inputSub) {
			if (typeof inputSub.configure === "function") {
				inputSub.configure(hostConfig);
			}
			if (typeof inputSub.init === "function") {
				inputSub.init(EventBus);
			}
		}
	};

	/**
	 * Registers baseline host capabilities onto the event bus.
	 * [State Mutating]
	 * @returns {void}
	 */
	const registerHostCapabilities = () => {
		if (
			EventBus &&
			typeof EventBus.registerCapability === "function" &&
			!EventBus.isSealed()
		) {
			[
				"cap:elemental.scorch",
				"cap:elemental.freeze",
				"cap:sanctuary.consecrate",
				"cap:elemental.gale_dispel",
				"cap:dungeon.plate_trigger",
				"cap:macro.inspect_caravan",
			].forEach((tok) => {
				if (!EventBus.hasCapability(tok)) {
					EventBus.registerCapability(tok, {
						evaluate: (payload) => {
							if (!payload?.targetCoords || payload.targetCoords.length === 0)
								return { authorized: false, reason: "EMPTY_PAYLOAD" };
							return { authorized: true, token: tok };
						},
					});
				}
			});
			EventBus.sealCapabilities();
		}
	};

	/**
	 * Initializes the entire GameRuntime host harness.
	 * [State Mutating / Lifecycle INIT]
	 * @returns {void}
	 */
	const init = () => {
		console.log(
			"[GameRuntime] Initializing Host Harness with Thin SSOT Bridge.",
		);
		const hostConfig = {
			manifest:
				typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {},
		};
		const hostContext = { eventBus: EventBus, store, runtime: GameRuntime };

		bootstrapSubsystems(hostConfig, hostContext);
		registerHostCapabilities();

		if (Router) {
			Router.registerHandlers({
				switchDistrict,
				renderHUD,
				getParty,
				getInventory: () =>
					/** @type {Record<string, number>} */(
						/** @type {unknown} */ (getInventory())
				),
				getGold,
				handleCancelAction,
				toggleQ4DeckExpansion,
				toggle3DViewportExpansion,
			});
		}

		bindDOMControls();
		switchDistrict("TITLE");

		if (typeof requestAnimationFrame !== "undefined")
			requestAnimationFrame(hostTick);
	};

	return {
		init,
		getParty,
		setParty,
		getInventory: () =>
			/** @type {Record<string, number>} */(
				/** @type {unknown} */ (getInventory())
		),
		setInventory,
		modifyItem,
		getGold,
		modifyGold,
		getWorldPos,
		setWorldPos,
		getDungeonFloor,
		setDungeonFloor,
		getDungeonDepth,
		setDungeonDepth,
		getQuests,
		setQuests,
		getFlags,
		setFlag,
		getMacroPos,
		setMacroPos,
		getTownId,
		setTownId,
		getSurfaceMutations,
		getTownMutations,
		getDungeonSpec,
		setDungeonSpec,
		getSurfaceMap,
		setSurfaceMap,
		getActiveWorldMap,
		commitSession,
		getActiveDistrict: () => activeDistrict,
		switchDistrict,
		enterMarketDistrict,
		handleCancelAction,
		toggleQ4DeckExpansion,
		toggle3DViewportExpansion,
		isQ4DeckExpanded: () => isQ4DeckExpanded,
		is3DViewExpanded: () => is3DViewExpanded,
		moveParty,
		pivotFacing,
		interactFacing,
		executeCapability,
		evaluateTileTrigger,
		renderHUD,
		renderOverworldGraphics,
		handleCockpitAction,
		handleInputAction,
		handlePointerContextDown,
		handlePointerContextMove,
		handlePointerContextUp,
		dismissTacticalChassis,
		calculatePolarDirection,
		resolveTargetMetadata,
		executeLeafAction,
		EventBus,
		get StorageManager() {
			if (store?.StorageManager) return store.StorageManager;
			if (typeof EmberlightSaveManager !== "undefined")
				return EmberlightSaveManager;
			if (typeof StorageManager !== "undefined") return StorageManager;
			return null;
		},
		store,
	};
	//#endregion
})();

if (typeof window !== "undefined") {
	// @ts-expect-error
	window.GameRuntime = GameRuntime;
	// @ts-expect-error
	window.runtime = GameRuntime;
	if (typeof document !== "undefined") {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => GameRuntime.init());
		} else {
			GameRuntime.init();
		}
	}
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = GameRuntime;
}
