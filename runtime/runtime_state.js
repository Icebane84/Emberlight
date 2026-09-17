/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME STATE & PERSISTENCE DOMAIN SUBSYSTEM
 * Document Identifier: VSRP-001-RUNTIME-STATE
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host SSOT Bridge & Save Slot Controller
 * ============================================================================
 */

if (typeof window !== "undefined") {
	window._RuntimeInternal = window._RuntimeInternal || {};
}

(() => {
	/**
	 * Creates the authoritative SSOT bridge accessors bound to EmberlightSessionStore.
	 * @param {any} store
	 * @returns {Record<string, any>}
	 */
	function createStateAccessors(store) {
		return {
			getParty: () => (store ? store.getParty() : []),
			setParty: (/** @type {any} */ p) => store?.setParty(p),
			getInventory: () => (store ? store.getInventory() : {}),
			setInventory: (/** @type {any} */ i) => store?.setInventory(i),
			modifyItem: (/** @type {string} */ id, /** @type {number} */ count) => store?.modifyItem(id, count),
			getGold: () => (store ? store.getGold() : 0),
			modifyGold: (/** @type {number} */ delta) => store?.modifyGold(delta),
			getWorldPos: () => (store ? store.getWorldPos() : { x: 10, y: 10 }),
			setWorldPos: (/** @type {any} */ pos) => store?.setWorldPos(pos),
			getDungeonFloor: () => (store ? store.getDungeonFloor() : 1),
			setDungeonFloor: (/** @type {number} */ f) => store?.setDungeonFloor(f),
			getDungeonDepth: () => (store ? store.getDungeonDepth() : 1),
			setDungeonDepth: (/** @type {number} */ d) => store?.setDungeonDepth(d),
			getQuests: () => (store ? store.getQuests() : []),
			setQuests: (/** @type {any} */ q) => store?.setQuests(q),
			getFlags: () => (store ? store.getFlags() : {}),
			setFlag: (/** @type {string} */ k, /** @type {any} */ v) => store?.setFlag(k, v),
			getMacroPos: () => (store ? store.getMacroPos() : { x: 1, y: 1 }),
			setMacroPos: (/** @type {any} */ pos) => store?.setMacroPos(pos),
			getTownId: () => (store ? store.getTownId() : "town_haven"),
			setTownId: (/** @type {string|null} */ id) => store?.setTownId(id),
			getSurfaceMutations: () => (store ? store.getSurfaceMutations() : {}),
			getTownMutations: () => (store ? store.getTownMutations() : {}),
			getDungeonSpec: () => (store ? store.getDungeonSpec() : null),
			setDungeonSpec: (/** @type {any} */ s) => store?.setDungeonSpec(s),
			getSurfaceMap: () => (store ? store.getSurfaceMap() : null),
			setSurfaceMap: (/** @type {any} */ m) => store?.setSurfaceMap(m),
			commitSession: (/** @type {string} */ [reason]) => {
				if (typeof store?.commit === "function") return store.commit(reason);
				if (typeof store?.StorageManager?.save === "function") return store.StorageManager.save();
				return false;
			},
		};
	}

	/**
	 * Formats title screen save summary HTML.
	 * @param {any} meta
	 * @param {string} mostRecentId
	 * @returns {string}
	 */
	function buildTitleSaveSummaryHtml(meta, mostRecentId) {
		const slotId = meta?.slotId || mostRecentId;
		const loc = meta?.locationName || "Wilderness";
		const pSize = meta?.partySize || 4;
		const avgLv = meta?.avgLevel || 1;
		const gold = meta?.gold || 0;
		const ts = meta?.timestamp || "";
		return `📜 Latest Chronicle [${slotId}] • ${loc}<br>Heroes: ${pSize} (Avg Lv ${avgLv}) | Gold: ${gold}G<br><span style="color:var(--text-dim); font-size:6.5px;">${ts}</span>`;
	}

	/**
	 * Updates the dynamic save summary card on the Title Screen.
	 * @returns {void}
	 */
	function updateTitleSaveSummary() {
		if (typeof document === "undefined") return;
		const el = document.getElementById("title-save-summary");
		const contBtn = document.getElementById("menu-continue-btn");
		const loadBtn = document.getElementById("menu-load-btn");
		if (!el) return;

		const saveMgr = typeof EmberlightSaveManager !== "undefined" ? /** @type {any} */ (EmberlightSaveManager) : null;
		const slots = /** @type {Array<{ id?: string, exists?: boolean }>} */ (
			saveMgr?.listSlots ? saveMgr.listSlots() : []
		);
		const hasAny = slots.some((s) => s.exists);

		if (hasAny) {
			const mostRecentId = saveMgr?.getMostRecentSlotId ? saveMgr.getMostRecentSlotId() : "SLOT_1";
			const meta = saveMgr?.getSaveMetadata ? saveMgr.getSaveMetadata(mostRecentId) : null;
			el.innerHTML = buildTitleSaveSummaryHtml(meta, mostRecentId);
			if (contBtn) contBtn.style.opacity = "1.0";
			if (loadBtn) loadBtn.style.opacity = "1.0";
			return;
		}

		el.innerHTML = `Scanning tactical save records...<br><span style="color:var(--text-dim);">No prior expedition records found. Ready to initialize.</span>`;
		if (contBtn) contBtn.style.opacity = "0.6";
		if (loadBtn) loadBtn.style.opacity = "0.75";
	}

	/**
	 * @param {any} slot
	 * @param {boolean} isCurr
	 * @returns {string}
	 */
	function buildSaveSlotInfoHtml(slot, isCurr) {
		const autoClass = slot.isAuto ? "auto" : "";
		if (slot.exists) {
			const dateStr = slot.timestamp ? new Date(slot.timestamp).toLocaleString() : "Recent";
			const partyDesc =
				slot.party && slot.party.length > 0 ? `${slot.party.length} Heroes (Avg Lv ${slot.avgLevel || 1})` : "Active Vanguard";
			const activeBadge = isCurr ? '<span style="font-size:7px; color:var(--ok); font-weight:bold;">[ACTIVE]</span>' : "";
			return `
				<div class="save-slot-info">
					<div class="save-slot-header">
						<span class="save-slot-badge ${autoClass}">${slot.label}</span>
						<span class="save-slot-title">${slot.locationName || "Wilderness Exploration"}</span>
						${activeBadge}
					</div>
					<div class="save-slot-meta">
						<span>👥 ${partyDesc}</span>
						<span>🪙 ${slot.gold || 0}G</span>
						<span>🕒 ${dateStr}</span>
						<span style="color:var(--ember);">v${slot.version || "1.4.0"}</span>
					</div>
				</div>
			`;
		}
		return `
			<div class="save-slot-info">
				<div class="save-slot-header">
					<span class="save-slot-badge ${autoClass}">${slot.label}</span>
					<span class="save-slot-title" style="color:var(--text-dim); font-style:italic;">— EMPTY CHRONICLE ARCHIVE —</span>
				</div>
				<div class="save-slot-meta">
					<span>No tactical records stored in this sector.</span>
				</div>
			</div>
		`;
	}

	/**
	 * @param {any} slot
	 * @param {string} mode
	 * @returns {string}
	 */
	function buildSaveSlotActionsHtml(slot, mode) {
		if (mode === "SAVE") {
			if (slot.isAuto) {
				return `<div class="save-slot-actions"><span style="font-size:7.5px; color:var(--text-dim); font-style:italic;">System Managed</span></div>`;
			}
			const saveLabel = slot.exists ? "💾 OVERWRITE" : "💾 SAVE";
			const deleteBtn = slot.exists
				? `<button type="button" class="cmd-btn danger slot-delete-btn" data-slot="${slot.id}" data-action="delete" title="Delete slot">🗑️</button>`
				: "";
			return `<div class="save-slot-actions"><button type="button" class="cmd-btn action slot-action-btn" data-slot="${slot.id}" data-action="save">${saveLabel}</button>${deleteBtn}</div>`;
		}
		if (slot.exists) {
			const deleteBtn = !slot.isAuto
				? `<button type="button" class="cmd-btn danger slot-delete-btn" data-slot="${slot.id}" data-action="delete" title="Delete slot">🗑️</button>`
				: "";
			return `<div class="save-slot-actions"><button type="button" class="cmd-btn action slot-action-btn" data-slot="${slot.id}" data-action="load">▶ LOAD</button>${deleteBtn}</div>`;
		}
		return `<div class="save-slot-actions"><button type="button" class="cmd-btn slot-action-btn" disabled style="opacity:0.4;">EMPTY</button></div>`;
	}

	/**
	 * Renders the save slot cards inside the modal container.
	 * @param {any} store
	 * @param {string} mode
	 * @param {{ onSave: (slotId: string) => void, onLoad: (slotId: string) => void, onDelete: (slotId: string) => void }} callbacks
	 * @returns {void}
	 */
	function renderSaveSlotCards(store, mode, callbacks) {
		if (typeof document === "undefined") return;
		const container = document.getElementById("save-slots-container");
		if (!container) return;
		container.innerHTML = "";

		const saveMgr = typeof EmberlightSaveManager !== "undefined" ? /** @type {any} */ (EmberlightSaveManager) : null;
		const slots = saveMgr?.listSlots ? saveMgr.listSlots() : [];
		const activeSlot = store?.StorageManager?.getActiveSlotId ? store.StorageManager.getActiveSlotId() : "SLOT_1";

		slots.forEach((/** @type {any} */ slot) => {
			const card = document.createElement("div");
			const isCurr = slot.id === activeSlot;
			card.className = `save-slot-card ${slot.isAuto ? "auto-save" : ""} ${isCurr && slot.exists ? "active-slot" : ""} ${!slot.exists ? "empty-slot" : ""}`;

			card.innerHTML = buildSaveSlotInfoHtml(slot, isCurr) + buildSaveSlotActionsHtml(slot, mode);

			const actBtn = /** @type {HTMLElement|null} */ (card.querySelector(".slot-action-btn"));
			if (actBtn && !actBtn.hasAttribute("disabled")) {
				actBtn.onclick = () => {
					const action = actBtn.dataset.action;
					const slotId = actBtn.dataset.slot;
					if (action === "save" && slotId) {
						callbacks.onSave(slotId);
					} else if (action === "load" && slotId) {
						callbacks.onLoad(slotId);
					}
				};
			}

			const delBtn = /** @type {HTMLElement|null} */ (card.querySelector(".slot-delete-btn"));
			if (delBtn) {
				delBtn.onclick = () => {
					const slotId = delBtn.dataset.slot;
					if (slotId) callbacks.onDelete(slotId);
				};
			}

			container.appendChild(card);
		});
	}

	const RuntimeState = {
		createStateAccessors,
		buildTitleSaveSummaryHtml,
		updateTitleSaveSummary,
		buildSaveSlotInfoHtml,
		buildSaveSlotActionsHtml,
		renderSaveSlotCards,
	};

	if (typeof window !== "undefined") {
		window._RuntimeInternal = window._RuntimeInternal || {};
		window._RuntimeInternal.State = RuntimeState;
	}

	if (typeof module !== "undefined") {
		module.exports = RuntimeState;
	}
})();
