/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME INTERACTIONS DOMAIN SUBSYSTEM
 * Document Identifier: VSRP-001-RUNTIME-INTERACTIONS
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host World Map, Tile Triggers & Interaction Delegation
 * ============================================================================
 */

if (typeof window !== "undefined") {
	window._RuntimeInternal = window._RuntimeInternal || {};
}

(() => {
	/**
	 * Resolves active world map from Ecology or manifest.
	 * @param {any} deps
	 * @returns {string[][]|null}
	 */
	function getActiveWorldMap(deps) {
		const manifest = typeof EmberlightManifest !== "undefined" ? /** @type {any} */ (EmberlightManifest) : {};
		const Ecology = typeof EmberlightWorldEcology !== "undefined" ? /** @type {any} */ (EmberlightWorldEcology) : null;
		const activeDistrict = deps.activeDistrict;
		const getDungeonSpec = deps.getDungeonSpec;
		const getTownId = deps.getTownId;
		const getFlags = deps.getFlags;
		const getTownMutations = deps.getTownMutations;
		const getSurfaceMutations = deps.getSurfaceMutations;
		const stepCounter = deps.stepCounter || 0;
		const getDungeonDepth = deps.getDungeonDepth;
		const getSurfaceMap = deps.getSurfaceMap;

		if (activeDistrict === "dungeon") return (/** @type {any} */ (getDungeonSpec()))?.floorMap || null;
		if (activeDistrict === "TITLE" || activeDistrict === "GAME_OVER") return null;

		const townId = getTownId();
		if (townId && Ecology?.resolveTownMap) {
			return Ecology.resolveTownMap(manifest, townId, getFlags(), getTownMutations());
		}
		if (Ecology?.resolveSurfaceMap) {
			return Ecology.resolveSurfaceMap(manifest, getFlags(), getSurfaceMutations(), stepCounter, getDungeonDepth(), townId);
		}
		const rawMap = getSurfaceMap() || manifest.OverworldMap || [["."]];
		return typeof manifest.getResolvedMap === "function" ? manifest.getResolvedMap(rawMap, getFlags()) : rawMap;
	}

	/**
	 * Checks if a tile coordinate is traversable.
	 * @param {string[][]|null} map
	 * @param {{ x: number, y: number }} pos
	 * @returns {boolean}
	 */
	function isTilePassable(map, pos) {
		if (!map || !pos || pos.y < 0 || pos.y >= map.length || pos.x < 0 || pos.x >= (map[0]?.length || 0)) {
			return false;
		}
		const tile = map[pos.y]?.[pos.x];
		const manifest = typeof EmberlightManifest !== "undefined" ? /** @type {any} */ (EmberlightManifest) : {};
		const legend = manifest.TileLegend || {};
		const def = legend[tile];
		return def ? def.walkable !== false : tile !== "#" && tile !== "P";
	}

	/**
	 * Records a tile mutation to the session store.
	 * @param {any} a
	 * @param {any} b
	 * @param {any} c
	 * @param {any} store
	 * @returns {void}
	 */
	function recordTileMutation(a, b, c, store) {
		if (typeof a === "number" && typeof b === "number") {
			store?.recordTileMutation?.(a, b, c);
			return;
		}
		if (typeof a === "string" && typeof b === "string") {
			const parts = b.split(",");
			const x = Number(parts[0]);
			const y = Number(parts[1]);
			if (parts.length === 2 && !Number.isNaN(x) && !Number.isNaN(y)) {
				store?.recordTileMutation?.(x, y, c);
				return;
			}
		}
		if (typeof store?.recordTileMutation === "function") {
			store.recordTileMutation(a, b, c);
		} else if (typeof store?.recordMutation === "function") {
			store.recordMutation(a, b, c);
		}
	}

	/**
	 * Resolves interactive prompt text when facing an actionable tile.
	 * @param {string|null} tile
	 * @returns {string|null}
	 */
	function getFacingInteractablePrompt(tile) {
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
	}

	/**
	 * @param {string} capabilityToken
	 * @param {Object} [targetContext]
	 * @param {any} [deps]
	 * @returns {any}
	 */
	function executeCapability(capabilityToken, targetContext, deps) {
		const Ecology = typeof EmberlightWorldEcology !== "undefined" ? /** @type {any} */ (EmberlightWorldEcology) : null;
		if (!Ecology) return false;
		const context = {
			getParty: deps.getParty,
			setParty: deps.setParty,
			getInventory: deps.getInventory,
			modifyItem: deps.modifyItem,
			setInventory: deps.setInventory,
			getActiveWorldMap: deps.getActiveWorldMap,
			recordTileMutation: (/** @type {any} */ a, /** @type {any} */ b, /** @type {any} */ c) => deps.recordTileMutation(a, b, c),
			notifyStatus: deps.notifyStatus,
			commitWorldUpdate: deps.commitWorldUpdate,
			enterMarketDistrict: deps.enterMarketDistrict,
			publishSfx: deps.publishSfx,
			triggerVfx: deps.triggerVfx,
			getWorldPos: deps.getWorldPos,
			...targetContext,
		};
		const result = Ecology.settleCapability(capabilityToken, context);
		if (deps.renderHUD) deps.renderHUD();
		return result;
	}

	/**
	 * Dispatches tile trigger outcomes to session store and districts.
	 * @param {any} res
	 * @param {{ x: number, y: number }} [pos]
	 * @param {any} [deps]
	 * @returns {void}
	 */
	/**
	 * @param {any} res
	 * @param {{ x: number, y: number }} pos
	 * @param {any} deps
	 * @param {any} EventBus
	 * @returns {boolean}
	 */
	function dispatchTransitionTriggers(res, pos, deps, EventBus) {
		switch (res.type) {
			case "ENTER_TOWN":
				deps.setMacroPos?.(res.macroPos || pos);
				deps.setTownId?.(res.townId);
				deps.setWorldPos?.(res.spawnCoord || { x: 5, y: 8 });
				if (res.message) deps.notifyStatus?.(res.message, "info");
				deps.publishSfx?.("sfx_confirm");
				deps.triggerZoneTransition?.("🏰 ENTERING OAKHAVEN HAMLET", "AETHERIC SANCTUARY // SAFE REFUGE");
				EventBus?.publish("world:zone_change", { zone: "TOWN", townId: res.townId });
				return true;
			case "EXIT_TOWN":
				deps.setTownId?.(null);
				deps.setWorldPos?.(res.targetPos || { x: 1, y: 1 });
				if (res.message) deps.notifyStatus?.(res.message, "info");
				deps.publishSfx?.("sfx_confirm");
				deps.triggerZoneTransition?.("🌲 ENTERING THE ASHEN WILDS", "WILDERNESS TRAIL // ENCOUNTER ZONE");
				EventBus?.publish("world:zone_change", { zone: "SURFACE", townId: null });
				return true;
			case "DESCEND_STAIRS":
				deps.setDungeonDepth?.(res.nextDepth);
				if (res.dungeonSpec) deps.setDungeonSpec?.(res.dungeonSpec);
				deps.setWorldPos?.(res.spawnCoord || { x: 1, y: 1 });
				deps.notifyStatus?.(`Descended into Catacombs (Floor ${res.nextDepth}).`, "warning");
				deps.publishSfx?.("sfx_confirm");
				return true;
			case "ASCEND_STAIRS":
				deps.setDungeonDepth?.(0);
				deps.setDungeonSpec?.(null);
				deps.setWorldPos?.(res.targetPos || { x: 9, y: 4 });
				deps.notifyStatus?.("Ascended back to the surface.", "info");
				deps.publishSfx?.("sfx_confirm");
				return true;
			default:
				return false;
		}
	}

	/**
	 * @param {any} res
	 * @param {any} deps
	 * @returns {boolean}
	 */
	function dispatchRestTriggers(res, deps) {
		if (res.type === "CAMP_REST" || res.type === "INN_REST") {
			const rested = (deps.getParty ? deps.getParty() : []).map((/** @type {any} */ c) => ({
				...c,
				alive: true,
				hp: c.maxHp || c.hp,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			deps.setParty?.(rested);
			if (res.type === "INN_REST") deps.commitSession?.("InnRestAutosave");
			if (res.message) deps.notifyStatus?.(res.message, "success");
			deps.publishSfx?.("sfx_heal");
			return true;
		}
		if (res.type === "SHRINE_COMMUNE") {
			const empowered = (deps.getParty ? deps.getParty() : []).map((/** @type {any} */ c) => ({
				...c,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			deps.setParty?.(empowered);
			if (res.message) deps.notifyStatus?.(res.message, "info");
			deps.publishSfx?.("sfx_heal");
			return true;
		}
		return false;
	}

	/**
	 * @param {any} res
	 * @param {any} deps
	 * @returns {boolean}
	 */
	function dispatchLootAndHazardTriggers(res, deps) {
		if (res.type === "LOOT_FLOOR_CHEST") {
			deps.setFlag?.(res.flagKey, true);
			deps.modifyGold?.(res.bonusGold || 25);
			deps.notifyStatus?.(`Found ${res.bonusGold || 25}G in subterranean chest!`, "success");
			deps.publishSfx?.("sfx_coin");
			return true;
		}
		if (res.type === "FORAGE_RESOURCE") {
			if (res.rewardItem) deps.modifyItem?.(res.rewardItem, 1);
			if (res.bonusGold) deps.modifyGold?.(res.bonusGold);
			if (res.targetPos && deps.store?.recordTileMutation) {
				deps.store.recordTileMutation(res.targetPos.x, res.targetPos.y, ".");
			}
			if (res.message) deps.notifyStatus?.(res.message, "success");
			deps.publishSfx?.("sfx_coin");
			return true;
		}
		if (res.type === "MIASMA_HAZARD") {
			if (!res.hasWard) {
				const party = (deps.getParty ? deps.getParty() : []).map((/** @type {any} */ c) => {
					if (!c.alive) return c;
					const dmg = Math.max(1, Math.floor((c.maxHp || 30) * (res.damagePct || 0.05)));
					return { ...c, hp: Math.max(1, c.hp - dmg) };
				});
				deps.setParty?.(party);
				deps.notifyStatus?.("The squad suffered miasma corruption (-HP)!", "warning");
				deps.publishSfx?.("sfx_damage");
			}
			return true;
		}
		return false;
	}

	/**
	 * @param {any} res
	 * @param {any} deps
	 * @param {any} EventBus
	 * @returns {boolean}
	 */
	function dispatchDistrictTriggers(res, deps, EventBus) {
		switch (res.type) {
			case "OPEN_DIALOGUE": {
				const scriptMod = /** @type {any} */ (typeof EmberlightScript !== "undefined" ? EmberlightScript : null);
				scriptMod?.play?.(res.scriptKey, { runtime: deps.runtime, eventBus: EventBus });
				return true;
			}
			case "OPEN_SHOP":
				deps.enterMarketDistrict?.(res.shopId);
				return true;
			case "OPEN_FORGE":
				deps.switchDistrict?.("RELIC_FORGE");
				return true;
			case "OPEN_LOCKPICK":
				if (typeof EmberlightLockpick !== "undefined" && typeof EmberlightLockpick.reset === "function") {
					EmberlightLockpick.reset(res.sealConfig);
					deps.switchDistrict?.("LOCKPICK");
				}
				return true;
			case "TRIGGER_BOSS":
				deps.startCombat?.(res.bossKey || "BOSS_MALAKOR");
				return true;
			default:
				return false;
		}
	}

	/**
	 * Dispatches result of an authoritative tile trigger evaluation.
	 * @param {any} res
	 * @param {{ x: number, y: number }} pos
	 * @param {any} [deps]
	 * @returns {void}
	 */
	function dispatchTileTriggerResult(res, pos, deps) {
		const EventBus = typeof EmberlightEventBus !== "undefined" ? /** @type {any} */ (EmberlightEventBus) : null;
		if (dispatchTransitionTriggers(res, pos, deps, EventBus)) return;
		if (dispatchRestTriggers(res, deps)) return;
		if (dispatchLootAndHazardTriggers(res, deps)) return;
		dispatchDistrictTriggers(res, deps, EventBus);
	}

	/**
	 * @param {{ x: number, y: number }} pos
	 * @param {{ x: number, y: number }|null} [facingPos=null]
	 * @param {boolean} [isInteraction=false]
	 * @param {any} [deps]
	 * @returns {any}
	 */
	function evaluateTileTrigger(pos, facingPos = null, isInteraction = false, deps = {}) {
		const Ecology = typeof EmberlightWorldEcology !== "undefined" ? /** @type {any} */ (EmberlightWorldEcology) : null;
		const worldMap = deps.getActiveWorldMap ? deps.getActiveWorldMap() : null;
		if (!Ecology?.evaluateTileTrigger || !worldMap) return null;

		const currentTile = worldMap[pos.y]?.[pos.x] || null;
		const facingTile = facingPos ? worldMap[facingPos.y]?.[facingPos.x] || null : null;
		const manifest = typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {};
		const dungeonGen = typeof EmberlightDungeonGen !== "undefined" ? EmberlightDungeonGen : null;
		const prng = typeof EmberlightPRNG !== "undefined" ? EmberlightPRNG.create((deps.stepCounter || 0) + 1337) : null;

		const res = /** @type {any} */ (
			Ecology.evaluateTileTrigger({
				isInteraction,
				pos,
				facingPos,
				facingTile,
				currentTile,
				townId: deps.getTownId ? deps.getTownId() : null,
				dungeonDepth: deps.getDungeonDepth ? deps.getDungeonDepth() : 0,
				macroPos: deps.getMacroPos ? deps.getMacroPos() : { x: 1, y: 1 },
				flags: deps.getFlags ? deps.getFlags() : {},
				party: deps.getParty ? deps.getParty() : [],
				manifest,
				dungeonGen,
				prng,
			})
		);

		if (!res || res.type === "NONE") return res;

		dispatchTileTriggerResult(res, pos, deps);
		if (deps.commitSession) deps.commitSession("TileTriggerResolved");
		if (deps.renderHUD) deps.renderHUD();
		return res;
	}

	const RuntimeInteractions = {
		getActiveWorldMap,
		isTilePassable,
		recordTileMutation,
		getFacingInteractablePrompt,
		executeCapability,
		dispatchTileTriggerResult,
		evaluateTileTrigger,
	};

	if (typeof window !== "undefined") {
		window._RuntimeInternal = window._RuntimeInternal || {};
		window._RuntimeInternal.Interactions = RuntimeInteractions;
	}

	if (typeof module !== "undefined") {
		module.exports = RuntimeInteractions;
	}
})();
