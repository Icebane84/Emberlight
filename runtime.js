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
	'use strict';

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
	const store = typeof EmberlightSessionStore !== 'undefined' ? EmberlightSessionStore : null;

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
	const getTownId = () => (store ? store.getTownId() : 'town_haven');
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
		if (typeof store?.commit === 'function') return store.commit(reason);
		if (typeof store?.StorageManager?.save === 'function') return store.StorageManager.save();
		return false;
	};
	//#endregion

	//#region [SEC-03] District State, Subsystem Registry & Event Bus Helpers
	// --- District & Host State ---
	let activeDistrict = 'TITLE';
	const isTickPaused = false;
	let lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
	let stepCounter = 0;

	// --- Subsystem Registry & Event Bus Helpers ---
	const EventBus = typeof EmberlightEventBus !== 'undefined' ? EmberlightEventBus : null;
	const Ecology = typeof EmberlightWorldEcology !== 'undefined' ? EmberlightWorldEcology : null;
	const Router = typeof EmberlightDistrictRouter !== 'undefined' ? EmberlightDistrictRouter : null;
	const Cockpit = typeof EmberlightCockpitRenderer !== 'undefined' ? EmberlightCockpitRenderer : null;

	/**
	 * @param {string} msg 
	 * @param {string} [tone='info'] 
	 * @returns {void}
	 */
	const notifyStatus = (msg, tone = 'info') => { if (EventBus?.publish) EventBus.publish('status:toast', { message: msg, tone }); };
	/** 
	 * @param {string} cueId 
	 * @returns {void}
	 */
	const publishSfx = (cueId) => { if (EventBus?.publish) EventBus.publish('audio:sfx', { cue: cueId }); };
	/** 
	 * @param {string} effectName 
	 * @param {{ x: number, y: number }} targetPos 
	 * @returns {void}
	 */
	const triggerVfx = (effectName, targetPos) => { if (EventBus?.publish) EventBus.publish('vfx:trigger', { effect: effectName, pos: targetPos }); };

	// --- World Ecology Bridge ---
	/** @returns {string[][]|null} */
	const getActiveWorldMap = () => {
		const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
		if (activeDistrict === 'OVERWORLD' || activeDistrict === 'world') {
			const townId = getTownId();
			if (townId && Ecology?.resolveTownMap) {
				return Ecology.resolveTownMap(manifest, townId, getFlags(), getTownMutations());
			}
			if (Ecology?.resolveSurfaceMap) {
				return Ecology.resolveSurfaceMap(manifest, getFlags(), getSurfaceMutations(), stepCounter, getDungeonDepth(), townId);
			}
			const rawMap = getSurfaceMap() || manifest.OverworldMap || [['.']];
			return typeof manifest.getResolvedMap === 'function' ? manifest.getResolvedMap(rawMap, getFlags()) : rawMap;
		}
		if (activeDistrict === 'dungeon') return getDungeonSpec()?.floorMap || null;
		return null;
	};

	/**
	 * @param {string[][]|null} map 
	 * @param {{ x: number, y: number }} pos 
	 * @returns {boolean}
	 */
	const isTilePassable = (map, pos) => {
		if (!map || !pos || pos.y < 0 || pos.y >= map.length || pos.x < 0 || pos.x >= (map[0]?.length || 0)) return false;
		const tile = map[pos.y]?.[pos.x];
		const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
		const legend = manifest.TileLegend || {};
		const def = legend[tile];
		return def ? def.walkable !== false : (tile !== '#' && tile !== 'P');
	};

	/**
	 * @param {string} district 
	 * @param {string} key 
	 * @param {any} mutation 
	 * @returns {void}
	 */
	const recordTileMutation = (district, key, mutation) => { store?.recordMutation(district, key, mutation); };
	/** @param {string} [reason] */
	const commitWorldUpdate = (reason) => { commitSession(reason || 'WorldStateUpdate'); };

	// --- Title Save Metadata Visualizer ---
	/** @returns {void} */
	const updateTitleSaveSummary = () => {
		if (typeof document === 'undefined') return;
		const el = document.getElementById('title-save-summary');
		const contBtn = document.getElementById('menu-continue-btn');
		if (!el) return;
		const saveMgr = typeof EmberlightSaveManager !== 'undefined' ? EmberlightSaveManager : null;
		if (saveMgr?.hasSave()) {
			const meta = saveMgr.getSaveMetadata();
			el.innerHTML = `📜 Active Save Record (v${meta?.version || '1.4.0'})<br>Heroes: ${meta?.partySize || 4} | Avg Lvl: ${meta?.avgLevel || 1} | Gold: ${meta?.gold || 0}G<br><span style="color:var(--text-dim); font-size:6.5px;">${meta?.timestamp || ''}</span>`;
			if (contBtn) contBtn.style.opacity = '1.0';
		} else {
			el.innerHTML = `Scanning tactical save records...<br><span style="color:var(--text-dim);">No prior expedition records found. Ready to initialize.</span>`;
			if (contBtn) contBtn.style.opacity = '0.6';
		}
	};
	//#endregion

	//#region [SEC-04] Spatial Graphics, Raycasting & District Presentation Coordination
	// --- Spatial Graphics & Raycasting Pipeline ---
	/** @param {RuntimeSnapshot} [snapshot] */
	const renderOverworldGraphics = (snapshot) => {
		const snap = snapshot || {
			party: getParty(), gold: getGold(), inventory: getInventory(), worldPos: getWorldPos(),
			playerPos: getWorldPos(), map: getActiveWorldMap(), macroPos: getMacroPos(), activeDistrict: 'OVERWORLD',
			dungeonFloor: getDungeonFloor(), dungeonDepth: getDungeonDepth(), stepCounter, flags: getFlags(),
			facing: store?.getFlag('facingDirection') || 'DOWN', pouchOpen: store?.getFlag('pouchOpen') || false
		};

		if (typeof EmberlightMapRenderer !== 'undefined' && typeof EmberlightMapRenderer.renderOverworld === 'function') {
			EmberlightMapRenderer.renderOverworld(snap, handleCockpitAction);
		} else if (typeof EmberlightOverworldRenderer !== 'undefined' && typeof EmberlightOverworldRenderer.renderOverworld === 'function') {
			EmberlightOverworldRenderer.renderOverworld(snap);
		}

		if (typeof EmberlightDynamicLights !== 'undefined') {
			const pos = getWorldPos();
			if (typeof EmberlightDynamicLights.setTargetPosition === 'function') EmberlightDynamicLights.setTargetPosition(pos.x, pos.y);
			if (typeof EmberlightDynamicLights.setMap === 'function') EmberlightDynamicLights.setMap(getActiveWorldMap(), getDungeonDepth());
		}

		if (typeof EmberlightPseudo3D !== 'undefined' && typeof EmberlightPseudo3D.render === 'function') {
			EmberlightPseudo3D.render(snap);
		}
	};

	/**
	 * @param {string} d 
	 * @returns {string}
	 */
	const normalizeDistrictName = (d) => {
		if (!d) return 'OVERWORLD';
		const upper = String(d).toUpperCase();
		if (upper === 'WORLD') return 'OVERWORLD';
		if (upper === 'FORGE') return 'RELIC_FORGE';
		if (upper === 'SHOP') return 'MARKET';
		if (upper === 'AUDIT') return 'AUDITOR';
		if (upper === 'CONFIG') return 'SETTINGS';
		if (upper === 'GEAR') return 'ARMORY';
		if (upper === 'JOURNAL') return 'CHRONICLE';
		if (upper === 'SKILLS') return 'PROGRESSION';
		return upper;
	};

	// --- District & Presentation Coordination ---
	/** @type {Record<string, function(HostContext): void>} */
	const TENANT_DISPATCHERS = {
		STATUS(hostContext) {
			if (typeof EmberlightStatus !== 'undefined' && typeof EmberlightStatus.reset === 'function') {
				EmberlightStatus.reset({ party: getParty() });
				if (typeof EmberlightStatusRenderer !== 'undefined') EmberlightStatus.render(EmberlightStatusRenderer, hostContext);
			}
		},
		ARMORY(hostContext) {
			if (typeof EmberlightArmory !== 'undefined' && typeof EmberlightArmory.reset === 'function') {
				EmberlightArmory.reset({ party: getParty(), inventory: getInventory(), gold: getGold() });
				if (typeof EmberlightArmoryRenderer !== 'undefined') EmberlightArmory.render(EmberlightArmoryRenderer, hostContext);
			}
		},
		PROGRESSION(hostContext) {
			if (typeof EmberlightProgression !== 'undefined' && typeof EmberlightProgression.reset === 'function') {
				EmberlightProgression.reset({ party: getParty() });
				if (typeof EmberlightProgressionRenderer !== 'undefined') EmberlightProgression.render(EmberlightProgressionRenderer, hostContext);
			}
		},
		MARKET(hostContext) {
			if (typeof EmberlightMarket !== 'undefined' && typeof EmberlightMarket.reset === 'function') {
				EmberlightMarket.reset({ party: getParty(), gold: getGold(), inventory: getInventory() });
				if (typeof EmberlightMarketRenderer !== 'undefined') EmberlightMarket.render(EmberlightMarketRenderer, hostContext);
			}
		},
		CHRONICLE(hostContext) {
			if (typeof EmberlightChronicle !== 'undefined' && typeof EmberlightChronicle.reset === 'function') {
				EmberlightChronicle.reset({ quests: getQuests(), flags: getFlags() });
				if (typeof EmberlightChronicleRenderer !== 'undefined') EmberlightChronicle.render(EmberlightChronicleRenderer, hostContext);
			}
		},
		RELIC_FORGE(hostContext) {
			if (typeof EmberlightRelicForge !== 'undefined' && typeof EmberlightRelicForge.reset === 'function') {
				EmberlightRelicForge.reset({ party: getParty(), gold: getGold(), inventory: getInventory() });
				if (typeof EmberlightRelicForgeRenderer !== 'undefined') EmberlightRelicForge.render(EmberlightRelicForgeRenderer, hostContext);
			}
		},
		AUDITOR(hostContext) {
			if (typeof EmberlightAuditor !== 'undefined' && typeof EmberlightAuditor.reset === 'function') {
				EmberlightAuditor.reset({ snapshot: hostContext.snapshot });
				if (typeof EmberlightAuditor.render === 'function') EmberlightAuditor.render();
			}
		},
		SETTINGS() {
			if (typeof EmberlightSettings !== 'undefined' && typeof EmberlightSettings.reset === 'function') {
				EmberlightSettings.reset({});
				if (typeof EmberlightSettings.render === 'function') EmberlightSettings.render();
			}
		},
		LOCKPICK(hostContext) {
			if (typeof EmberlightLockpick !== 'undefined' && typeof EmberlightLockpick.reset === 'function') {
				EmberlightLockpick.reset(hostContext.snapshot);
				if (typeof EmberlightLockpick.render === 'function') EmberlightLockpick.render();
			}
		},
		TITLE() {
			updateTitleSaveSummary();
			if (Cockpit && typeof Cockpit.startTitleAnimation === 'function') Cockpit.startTitleAnimation('title-bg-canvas', () => activeDistrict);
		},
		OVERWORLD(hostContext) {
			if (typeof EmberlightOverworld !== 'undefined' && typeof EmberlightOverworld.reset === 'function') {
				EmberlightOverworld.reset({
					map: getActiveWorldMap(), playerPos: getWorldPos(), party: getParty(), flags: getFlags(),
					facing: store?.getFlag('facingDirection') || 'DOWN', dungeonDepth: getDungeonDepth(), dangerSteps: 0
				});
			}
			renderOverworldGraphics(hostContext.snapshot);
		}
	};

	/**
	 * @param {string} targetDistrict 
	 * @param {Object} [_metadata={}] 
	 * @returns {void}
	 */
	const switchDistrict = (targetDistrict, _metadata = {}) => {
		const district = normalizeDistrictName(targetDistrict);
		if (district !== 'OVERWORLD' && is3DViewExpanded) {
			toggle3DViewportExpansion(false);
		}
		activeDistrict = district;

		const snapshot = {
			party: getParty(), gold: getGold(), inventory: getInventory(), worldPos: getWorldPos(),
			playerPos: getWorldPos(), map: getActiveWorldMap(), macroPos: getMacroPos(), activeDistrict,
			dungeonFloor: getDungeonFloor(), dungeonDepth: getDungeonDepth(), stepCounter, flags: getFlags(),
			facing: store?.getFlag('facingDirection') || 'DOWN', pouchOpen: store?.getFlag('pouchOpen') || false
		};

		if (Router) Router.switchDistrict(district, `${district.toLowerCase().replace('_', '-')}-view`, snapshot);

		const hostContext = { eventBus: EventBus, store, runtime: GameRuntime, snapshot };
		const dispatcher = TENANT_DISPATCHERS[district];
		if (dispatcher) {
			dispatcher(hostContext);
		}

		renderHUD();
	};

	/** @param {string} [marketId='market_general'] */
	const enterMarketDistrict = (marketId = 'market_general') => { switchDistrict('MARKET', { marketId }); };
	//#endregion

	//#region [SEC-05] Capability & Interaction Delegation & Tile Trigger Handlers
	// --- HUD & Spatial Projection Coordinator ---
	/** @returns {void} */
	const renderHUD = () => {
		const snapshot = {
			party: getParty(), gold: getGold(), inventory: getInventory(), worldPos: getWorldPos(),
			playerPos: getWorldPos(), map: getActiveWorldMap(), macroPos: getMacroPos(), activeDistrict,
			dungeonFloor: getDungeonFloor(), dungeonDepth: getDungeonDepth(), stepCounter, flags: getFlags(),
			facing: store?.getFlag('facingDirection') || 'DOWN', pouchOpen: store?.getFlag('pouchOpen') || false
		};

		if (Cockpit) {
			if (typeof Cockpit.render === 'function') Cockpit.render(snapshot, handleCockpitAction);
			else if (typeof Cockpit.renderCockpit === 'function') Cockpit.renderCockpit(snapshot, handleCockpitAction);
		}

		if (activeDistrict === 'OVERWORLD' || activeDistrict === 'world') {
			renderOverworldGraphics(snapshot);
		} else if (activeDistrict === 'COMBAT') {
			if (typeof EmberlightCombat !== 'undefined' && typeof EmberlightCombat.render === 'function') {
				EmberlightCombat.render(typeof EmberlightCombatRenderer !== 'undefined' ? EmberlightCombatRenderer : null);
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
			getParty, setParty, getInventory, modifyItem, setInventory, getActiveWorldMap, recordTileMutation,
			notifyStatus, commitWorldUpdate, enterMarketDistrict, publishSfx, triggerVfx, ...targetContext
		};
		return Ecology.settleCapability(capabilityToken, context);
	};

	/** @type {Record<string, function(TileTriggerResult, { x: number, y: number }): void>} */
	const TILE_TRIGGER_HANDLERS = {
		ENTER_TOWN(res, pos) {
			setMacroPos(res.macroPos || pos);
			setTownId(res.townId);
			setWorldPos(res.spawnCoord || { x: 1, y: 1 });
			if (res.message) notifyStatus(res.message, 'info');
			publishSfx('sfx_confirm');
		},
		EXIT_TOWN(res) {
			setTownId(null);
			setWorldPos(res.targetPos || { x: 1, y: 1 });
			if (res.message) notifyStatus(res.message, 'info');
			publishSfx('sfx_confirm');
		},
		OPEN_DIALOGUE(res) {
			if (typeof EmberlightScript !== 'undefined' && typeof EmberlightScript.play === 'function') {
				EmberlightScript.play(res.scriptKey, { runtime: GameRuntime, eventBus: EventBus });
			}
		},
		OPEN_SHOP(res) {
			enterMarketDistrict(res.shopId);
		},
		OPEN_FORGE() {
			switchDistrict('RELIC_FORGE');
		},
		CAMP_REST(res) {
			const rested = getParty().map((c) => ({ ...c, alive: true, hp: c.maxHp || c.hp, mp: c.maxMp || c.mp, ailments: [] }));
			setParty(rested);
			if (res.message) notifyStatus(res.message, 'success');
			publishSfx('sfx_heal');
		},
		OPEN_LOCKPICK(res) {
			if (typeof EmberlightLockpick !== 'undefined' && typeof EmberlightLockpick.reset === 'function') {
				EmberlightLockpick.reset(res.sealConfig);
				switchDistrict('LOCKPICK');
			}
		},
		LOOT_FLOOR_CHEST(res) {
			setFlag(res.flagKey, true);
			modifyGold(res.bonusGold || 25);
			notifyStatus(`Found ${res.bonusGold || 25}G in subterranean chest!`, 'success');
			publishSfx('sfx_coin');
		},
		TRIGGER_BOSS(res) {
			startCombat(res.bossKey || 'BOSS_MALAKOR');
		},
		DESCEND_STAIRS(res) {
			setDungeonDepth(res.nextDepth);
			if (res.dungeonSpec) setDungeonSpec(res.dungeonSpec);
			setWorldPos(res.spawnCoord || { x: 1, y: 1 });
			notifyStatus(`Descended into Catacombs (Floor ${res.nextDepth}).`, 'warning');
			publishSfx('sfx_confirm');
		},
		ASCEND_STAIRS(res) {
			setDungeonDepth(0);
			setDungeonSpec(null);
			setWorldPos(res.targetPos || { x: 9, y: 4 });
			notifyStatus('Ascended back to the surface.', 'info');
			publishSfx('sfx_confirm');
		},
		MIASMA_HAZARD(res) {
			if (!res.hasWard) {
				const party = getParty().map((c) => {
					if (!c.alive) return c;
					const dmg = Math.max(1, Math.floor((c.maxHp || 30) * (res.damagePct || 0.05)));
					return { ...c, hp: Math.max(1, c.hp - dmg) };
				});
				setParty(party);
				notifyStatus('The squad suffered miasma corruption (-HP)!', 'warning');
				publishSfx('sfx_damage');
			}
		}
	};

	/**
	 * @param {{ x: number, y: number }} pos 
	 * @param {{ x: number, y: number }|null} [facingPos=null] 
	 * @param {boolean} [isInteraction=false] 
	 * @returns {any}
	 */
	const evaluateTileTrigger = (pos, facingPos = null, isInteraction = false) => {
		if (!Ecology?.evaluateTileTrigger) return null;
		const worldMap = getActiveWorldMap();
		if (!worldMap) return null;
		const currentTile = worldMap[pos.y]?.[pos.x] || null;
		const facingTile = facingPos ? (worldMap[facingPos.y]?.[facingPos.x] || null) : null;
		const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
		const dungeonGen = typeof EmberlightDungeonGen !== 'undefined' ? EmberlightDungeonGen : null;
		const prng = typeof EmberlightPRNG !== 'undefined' ? EmberlightPRNG.create(stepCounter + 1337) : null;

		const res = /** @type {TileTriggerResult|null} */ (Ecology.evaluateTileTrigger({
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
			prng
		}));

		if (!res || res.type === 'NONE') return res;

		const handler = TILE_TRIGGER_HANDLERS[res.type];
		if (handler) {
			handler(res, pos);
		}

		commitSession('TileTriggerResolved');
		renderHUD();
		return res;
	};
	//#endregion

	//#region [SEC-06] Viewport Topology, Deck Expansion & Navigation Motion Coordinators
	// --- Viewport Topology & Deck Expansion State ---
	let isQ4DeckExpanded = false;
	let is3DViewExpanded = false;

	const NON_EXPANDABLE_DISTRICTS = new Set(['COMBAT', 'TITLE', 'GAME_OVER']);
	/** 
	 * @param {string} d 
	 * @returns {boolean} 
	 */
	const isNonExpandableDistrict = (d) => NON_EXPANDABLE_DISTRICTS.has(d);

	/** @param {boolean} expanded */
	const updateQ4DOM = (expanded) => {
		const matrix = document.getElementById('war-table-matrix');
		const rig = document.getElementById('expedition-rig');
		const btn = document.getElementById('q4-expand-btn');
		const expandLabel = btn ? btn.querySelector('.expand-label') : null;

		if (matrix) matrix.classList.toggle('q4-expanded-deck', expanded);
		if (rig) rig.classList.toggle('q4-expanded-deck', expanded);
		if (btn) btn.classList.toggle('expanded', expanded);
		if (expandLabel) expandLabel.textContent = expanded ? 'COLLAPSE [Z]' : 'EXPAND [Z]';
	};

	/** @param {boolean} [forceState] */
	const toggleQ4DeckExpansion = (forceState) => {
		if (forceState !== false && isNonExpandableDistrict(activeDistrict)) return;

		isQ4DeckExpanded = typeof forceState === 'boolean' ? forceState : !isQ4DeckExpanded;
		if (isQ4DeckExpanded && is3DViewExpanded) {
			toggle3DViewportExpansion(false);
		}

		updateQ4DOM(isQ4DeckExpanded);

		if (typeof EmberlightCockpitRenderer !== 'undefined' && typeof EmberlightCockpitRenderer.setExpanded === 'function') {
			EmberlightCockpitRenderer.setExpanded(isQ4DeckExpanded, is3DViewExpanded);
		}
		if (typeof EmberlightInput !== 'undefined' && typeof EmberlightInput.clear === 'function') {
			EmberlightInput.clear();
		}
		if (activeDistrict !== 'OVERWORLD' && !isNonExpandableDistrict(activeDistrict)) {
			switchDistrict(activeDistrict);
		}
		renderHUD();
	};

	/** @param {boolean} expanded */
	const update3DDOM = (expanded) => {
		const matrix = document.getElementById('war-table-matrix');
		const rig = document.getElementById('expedition-rig');
		const btn = document.getElementById('q2-expand-btn');
		const expandLabel = btn ? btn.querySelector('.expand-label') : null;

		if (matrix) matrix.classList.toggle('q2-immersion-deck', expanded);
		if (rig) rig.classList.toggle('q2-immersion-deck', expanded);
		if (btn) btn.classList.toggle('expanded', expanded);
		if (expandLabel) expandLabel.textContent = expanded ? '2D MAP [X]' : '3D VIEW [X]';
	};

	/** @param {boolean} [forceState] */
	const toggle3DViewportExpansion = (forceState) => {
		if (forceState !== false && isNonExpandableDistrict(activeDistrict)) return;

		is3DViewExpanded = typeof forceState === 'boolean' ? forceState : !is3DViewExpanded;
		if (is3DViewExpanded && isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false);
		}

		update3DDOM(is3DViewExpanded);

		const pseudo3d = (typeof EmberlightPseudo3D !== 'undefined' && EmberlightPseudo3D) ||
			(typeof EmberlightCorridorSensor !== 'undefined' && EmberlightCorridorSensor) || null;
		if (pseudo3d && typeof pseudo3d.setExpanded === 'function') {
			pseudo3d.setExpanded(is3DViewExpanded);
		}

		if (typeof EmberlightCockpitRenderer !== 'undefined' && typeof EmberlightCockpitRenderer.setExpanded === 'function') {
			EmberlightCockpitRenderer.setExpanded(isQ4DeckExpanded, is3DViewExpanded);
		}
		if (typeof EmberlightInput !== 'undefined' && typeof EmberlightInput.clear === 'function') {
			EmberlightInput.clear();
		}
		renderHUD();
	};

	/** @returns {void} */
	const handleCancelAction = () => {
		if (store?.getFlag('pouchOpen')) {
			store.setFlag('pouchOpen', false);
			renderHUD();
			return;
		}
		if (isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false);
			return;
		}
		if (is3DViewExpanded) {
			toggle3DViewportExpansion(false);
			return;
		}
		if (activeDistrict !== 'OVERWORLD' && activeDistrict !== 'TITLE' && activeDistrict !== 'world') {
			switchDistrict('OVERWORLD');
			return;
		}
		switchDistrict('SETTINGS');
	};

	// --- Navigation & Motion Coordinator ---
	/** @param {string} action */
	const handle3DNav = (action) => {
		const facingOrder = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
		/** @type {Record<string, { x: number, y: number }>} */
		const facingDeltas = {
			UP: { x: 0, y: -1 },
			RIGHT: { x: 1, y: 0 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 }
		};
		const currentFacing = store?.getFlag('facingDirection') || 'DOWN';
		const foundFacingIdx = facingOrder.indexOf(currentFacing);
		const currentIdx = foundFacingIdx !== -1 ? foundFacingIdx : 2;

		switch (action) {
			case 'UP': {
				const d = facingDeltas[currentFacing];
				moveParty(d.x, d.y);
				break;
			}
			case 'DOWN': {
				const d = facingDeltas[currentFacing];
				moveParty(-d.x, -d.y);
				break;
			}
			case 'LEFT': {
				const newFacing = facingOrder[(currentIdx + 3) % 4];
				store?.setFlag('facingDirection', newFacing);
				if (typeof EmberlightOverworld !== 'undefined' && typeof EmberlightOverworld.handleHostAction === 'function') {
					EmberlightOverworld.handleHostAction(newFacing);
				}
				renderHUD();
				break;
			}
			case 'RIGHT': {
				const newFacing = facingOrder[(currentIdx + 1) % 4];
				store?.setFlag('facingDirection', newFacing);
				if (typeof EmberlightOverworld !== 'undefined' && typeof EmberlightOverworld.handleHostAction === 'function') {
					EmberlightOverworld.handleHostAction(newFacing);
				}
				renderHUD();
				break;
			}
			case 'STRAFE_LEFT': {
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
		if (activeDistrict !== 'OVERWORLD' && activeDistrict !== 'world' && activeDistrict !== 'dungeon') return;

		let facing = 'DOWN';
		if (dx > 0) {
			facing = 'RIGHT';
		} else if (dx < 0) {
			facing = 'LEFT';
		} else if (dy < 0) {
			facing = 'UP';
		}
		store?.setFlag('facingDirection', facing);

		const currentPos = getWorldPos();
		const targetPos = { x: currentPos.x + dx, y: currentPos.y + dy };
		const worldMap = getActiveWorldMap();

		if (!isTilePassable(worldMap, targetPos)) {
			publishSfx('sfx_bump');
			return;
		}

		setWorldPos(targetPos);
		stepCounter++;

		if (typeof EmberlightOverworld !== 'undefined' && typeof EmberlightOverworld.handleHostAction === 'function') {
			EmberlightOverworld.handleHostAction(facing);
		}

		evaluateTileTrigger(targetPos, null, false);

		if (stepCounter % 15 === 0) commitSession('PeriodicStepAutosave');
		renderHUD();
	};

	/** @returns {void} */
	const interactFacing = () => {
		const currentPos = getWorldPos();
		const facing = store?.getFlag('facingDirection') || 'DOWN';
		/** @type {Record<string, { x: number, y: number }>} */
		const deltas = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };
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
			case 'MOVE': moveParty(action.dx || 0, action.dy || 0); break;
			case 'INTERACT': interactFacing(); break;
			case 'CANCEL': handleCancelAction(); break;
			case 'TOGGLE_EXPAND_DECK': toggleQ4DeckExpansion(); break;
			case 'TOGGLE_3D_VIEW': toggle3DViewportExpansion(); break;
			case 'SWITCH_DISTRICT': switchDistrict(action.district || 'OVERWORLD', action.metadata || {}); break;
			case 'USE_FIELD_ITEM':
				if (action.itemId && typeof EmberlightFieldPouch !== 'undefined') {
					EmberlightFieldPouch.useFieldItem(action.itemId, action.targetHeroId || action.targetId);
					renderHUD();
				}
				break;
			case 'EXECUTE_CAPABILITY': executeCapability(action.capability || '', action.context || {}); break;
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
		MENU_ARMORY: () => switchDistrict('ARMORY'),
		MENU_PROGRESSION: () => switchDistrict('PROGRESSION'),
		MENU_STATUS: () => switchDistrict('STATUS'),
		MENU_POUCH: () => {
			const cur = store?.getFlag('pouchOpen') || false;
			store?.setFlag('pouchOpen', !cur);
			renderHUD();
		},
		MENU_SHOP: () => switchDistrict('MARKET'),
		MENU_CHRONICLE: () => switchDistrict('CHRONICLE'),
		FIELD_SCORCH: () => executeCapability('cap:elemental.scorch'),
		FIELD_FREEZE: () => executeCapability('cap:elemental.freeze'),
		FIELD_CONSECRATE: () => executeCapability('cap:sanctuary.consecrate'),
		FIELD_DISPEL: () => executeCapability('cap:elemental.gale_dispel'),
	};

	/** @param {string} action */
	const handleTitleInputAction = (action) => {
		if (action === 'CONFIRM') {
			const saveMgr = typeof EmberlightSaveManager !== 'undefined' ? EmberlightSaveManager : null;
			if (saveMgr?.hasSave()) store?.StorageManager?.load();
			else store?.startNewGame();
			switchDistrict('OVERWORLD');
		} else if (action === 'CANCEL') {
			switchDistrict('SETTINGS');
		}
	};

	/** 
	 * @param {string} action 
	 * @returns {boolean}
	 */
	const delegateDistrictInputAction = (action) => {
		if (activeDistrict === 'COMBAT') {
			if (typeof EmberlightCombat !== 'undefined' && typeof EmberlightCombat.handleHostAction === 'function') {
				EmberlightCombat.handleHostAction(action);
				renderHUD();
			}
			return true;
		}
		if (activeDistrict === 'LOCKPICK') {
			if (typeof EmberlightLockpick !== 'undefined' && typeof EmberlightLockpick.handleHostAction === 'function') {
				EmberlightLockpick.handleHostAction(action);
				renderHUD();
			}
			return true;
		}
		if (activeDistrict === 'SETTINGS') {
			if (typeof EmberlightSettings !== 'undefined' && typeof EmberlightSettings.handleHostAction === 'function') {
				EmberlightSettings.handleHostAction(action);
			}
			return true;
		}
		return false;
	};

	/** @param {string} action */
	const handleInputAction = (action) => {
		if (!action) return;

		if (activeDistrict === 'TITLE') {
			handleTitleInputAction(action);
			return;
		}

		if (delegateDistrictInputAction(action)) {
			return;
		}

		if (activeDistrict !== 'OVERWORLD' && activeDistrict !== 'world') {
			if (action === 'CANCEL') {
				handleCancelAction();
			}
			return;
		}

		if (is3DViewExpanded && ['UP', 'DOWN', 'LEFT', 'RIGHT', 'STRAFE_LEFT'].includes(action)) {
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
		if (typeof document === 'undefined') return;

		const bind = (id, fn) => {
			const el = document.getElementById(id);
			if (el) el.onclick = fn;
		};

		// Title Screen Buttons
		bind('menu-continue-btn', () => {
			const saveMgr = typeof EmberlightSaveManager !== 'undefined' ? EmberlightSaveManager : null;
			if (saveMgr?.hasSave()) {
				store?.StorageManager?.load();
				notifyStatus('Expedition resumed from local storage.', 'success');
			} else {
				store?.startNewGame();
				notifyStatus('No save found. Initialized fresh expedition.', 'info');
			}
			switchDistrict('OVERWORLD');
			publishSfx('sfx_confirm');
		});

		bind('menu-new-game-btn', () => {
			store?.startNewGame();
			switchDistrict('OVERWORLD');
			notifyStatus('Mission initialized. Explore the wilderness.', 'success');
			publishSfx('sfx_confirm');
		});

		bind('title-settings-btn', () => switchDistrict('SETTINGS'));
		bind('top-settings-btn', () => {
			if (activeDistrict === 'SETTINGS') handleCancelAction();
			else switchDistrict('SETTINGS');
		});

		bind('title-mute-btn', () => {
			if (typeof EmberlightAcousticSFX !== 'undefined' && typeof EmberlightAcousticSFX.toggleMute === 'function') {
				const muted = EmberlightAcousticSFX.toggleMute();
				const btn = document.getElementById('title-mute-btn');
				if (btn) btn.textContent = muted ? '🔇 MUTED' : '🔊 AUDIO';
			}
		});

		// Game Over Buttons
		bind('go-reload-btn', () => {
			if (typeof EmberlightSaveManager !== 'undefined') store?.StorageManager?.load();
			switchDistrict('OVERWORLD');
		});

		bind('go-yield-btn', () => {
			const party = getParty().map((c) => ({ ...c, alive: true, hp: Math.max(1, Math.floor((c.maxHp || 30) / 2)) }));
			setParty(party);
			modifyGold(-Math.floor(getGold() * 0.25));
			setDungeonDepth(0);
			setWorldPos({ x: 1, y: 1 });
			switchDistrict('OVERWORLD');
		});

		// Unified District Nav Dock
		bind('nav-status-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Cannot open Status during combat! Disengage first.', 'warning'); else switchDistrict('STATUS'); });
		bind('nav-armory-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Cannot enter Armory during combat! Disengage first.', 'warning'); else switchDistrict('ARMORY'); });
		bind('nav-progression-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Cannot open Progression during combat! Disengage first.', 'warning'); else switchDistrict('PROGRESSION'); });
		bind('nav-pouch-btn', () => {
			if (activeDistrict === 'COMBAT') {
				if (typeof EmberlightCombat !== 'undefined') EmberlightCombat.handleHostAction('CHOICE_4');
				return;
			}
			const cur = store?.getFlag('pouchOpen') || false;
			store?.setFlag('pouchOpen', !cur);
			renderHUD();
		});
		bind('nav-shop-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Cannot open Shop during combat!', 'warning'); else switchDistrict('MARKET'); });
		bind('nav-chronicle-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Cannot open Chronicle during combat!', 'warning'); else switchDistrict('CHRONICLE'); });
		bind('nav-forge-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Cannot enter Forge during combat!', 'warning'); else switchDistrict('RELIC_FORGE'); });
		bind('nav-rest-btn', () => {
			if (activeDistrict === 'COMBAT') {
				notifyStatus('Cannot rest while engaged in combat!', 'warning');
				return;
			}
			const rested = getParty().map((c) => ({ ...c, alive: true, hp: c.maxHp || c.hp, mp: c.maxMp || c.mp, ailments: [] }));
			setParty(rested);
			notifyStatus('The squad rested at camp. Vitality and essence fully restored.', 'success');
			publishSfx('sfx_heal');
			renderHUD();
		});
		// Viewport & Deck Expansion Controls
		bind('q4-expand-btn', () => toggleQ4DeckExpansion());
		bind('q2-expand-btn', () => toggle3DViewportExpansion());
		bind('close-pouch-btn', () => handleCancelAction());
		bind('nav-audit-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Auditor locked during combat simulation.', 'warning'); else switchDistrict('AUDITOR'); });
		bind('nav-settings-btn', () => { if (activeDistrict === 'COMBAT') notifyStatus('Use [ESC] or Disengage to leave combat before opening Settings.', 'warning'); else switchDistrict('SETTINGS'); });
	};

	// --- Lifecycle Stepper (Tick) ---
	/** @param {number} dt */
	const updateOverworldSubsystems = (dt) => {
		if (typeof EmberlightOverworld !== 'undefined' && typeof EmberlightOverworld.update === 'function') {
			EmberlightOverworld.update(dt, { inputs: [] });
		}
		if (typeof EmberlightPseudo3D !== 'undefined' && typeof EmberlightPseudo3D.update === 'function') {
			EmberlightPseudo3D.update(dt);
			const snap = {
				party: getParty(), gold: getGold(), inventory: /** @type {Record<string, number>} */ (/** @type {unknown} */ (getInventory())), worldPos: getWorldPos(),
				playerPos: getWorldPos(), map: getActiveWorldMap(), macroPos: getMacroPos(), activeDistrict: 'OVERWORLD',
				dungeonFloor: getDungeonFloor(), dungeonDepth: getDungeonDepth(), stepCounter, flags: getFlags(),
				facing: store?.getFlag('facingDirection') || 'DOWN', pouchOpen: store?.getFlag('pouchOpen') || false
			};
			EmberlightPseudo3D.render(snap);
		}
	};

	/** @param {number} dt */
	const updateActiveDistrictSubsystems = (dt) => {
		if (typeof EmberlightSoundtrack !== 'undefined' && typeof EmberlightSoundtrack.update === 'function') {
			EmberlightSoundtrack.update(dt);
		}
		if (activeDistrict === 'COMBAT' && typeof EmberlightCombat !== 'undefined' && typeof EmberlightCombat.update === 'function') {
			EmberlightCombat.update(dt, { inputs: [] });
		} else if (activeDistrict === 'OVERWORLD') {
			updateOverworldSubsystems(dt);
		} else if (activeDistrict === 'LOCKPICK' && typeof EmberlightLockpick !== 'undefined' && typeof EmberlightLockpick.update === 'function') {
			EmberlightLockpick.update(dt, { inputs: [] });
			if (typeof EmberlightLockpick.render === 'function') EmberlightLockpick.render();
		}
	};

	/** @param {number} [timestamp] */
	const hostTick = (timestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now())) => {
		const dt = (timestamp - lastFrameTime) / 1000;
		lastFrameTime = timestamp;

		if (!isTickPaused) {
			updateActiveDistrictSubsystems(dt);
		}

		if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(hostTick);
	};

	/** @param {string} [encounterKey='DEFAULT'] */
	const startCombat = (encounterKey = 'DEFAULT') => {
		if (is3DViewExpanded) {
			toggle3DViewportExpansion(false);
		}
		if (isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false);
		}
		activeDistrict = 'COMBAT';
		if (typeof EmberlightCombat !== 'undefined' && typeof EmberlightCombat.reset === 'function') {
			const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
			const encounters = manifest.Encounters || {};
			const encounter = encounters[encounterKey] || encounters.DEFAULT || {
				enemies: [{ id: 'goblin', name: 'Goblin', hp: 30, maxHp: 30, atk: 8, def: 2, agi: 4 }]
			};
			EmberlightCombat.reset({
				party: getParty(),
				gold: getGold(),
				inventory: /** @type {Record<string, number>} */ (/** @type {unknown} */ (getInventory())),
				encounterKey,
				encounter,
				dungeonDepth: getDungeonDepth()
			});
		}

		if (typeof EmberlightCombatBackdrop !== 'undefined' && typeof EmberlightCombatBackdrop.setBiome === 'function') {
			let biome = 'MEADOW';
			if (getDungeonDepth() > 0) biome = 'CRYPT';
			else if (getTownId()) biome = 'TOWN';
			if (encounterKey?.includes('MALAKOR')) biome = 'BOSS';
			EmberlightCombatBackdrop.setBiome(biome);
		}

		if (Router) Router.switchDistrict('COMBAT');
		renderHUD();
	};
	//#endregion

	//#region [SEC-08] Global Subsystem Bootstrap, EventBus Subscriptions & Public Interface Export
	// --- EventBus Subscriptions ---
	if (EventBus && typeof EventBus.subscribe === 'function') {
		EventBus.subscribe('cockpit:action', (/** @type {CockpitAction} */ action) => handleCockpitAction(action));
		EventBus.subscribe('input:action', ({ action }) => handleInputAction(action));
		EventBus.subscribe('district:switch_request', (evt) => switchDistrict(evt.district, evt.metadata));
		EventBus.subscribe('overworld:encounter', (evt) => startCombat(evt?.encounterKey));
		EventBus.subscribe('status:updated', () => renderHUD());
		EventBus.subscribe('armory:resolved', () => renderHUD());
		EventBus.subscribe('ecology:tile_mutation', (evt) => {
			if (evt?.district && evt?.key) recordTileMutation(evt.district, evt.key, evt.mutation);
		});
		EventBus.subscribe('settings:resolved', () => {
			switchDistrict('OVERWORLD');
		});
		EventBus.subscribe('system:command', (evt) => {
			if (!evt?.command) return;
			if (evt.command === 'SAVE_GAME') {
				commitSession('ManualSettingsSave');
				notifyStatus('Expedition state successfully committed to storage.', 'success');
			} else if (evt.command === 'RETURN_TO_TITLE') {
				switchDistrict('TITLE');
			} else if (evt.command === 'WIPE_STORAGE') {
				if (typeof store?.StorageManager?.clear === 'function') {
					store.StorageManager.clear();
				}
				notifyStatus('Local storage cleared. Returning to title.', 'danger');
				switchDistrict('TITLE');
			}
		});
		EventBus.subscribe('combat:resolved', (evt) => {
			if (!evt) return;
			if (evt.party) setParty(evt.party);
			if (typeof evt.gold === 'number') store?.setGold(evt.gold);
			if (evt.inventory) setInventory(evt.inventory);

			if (evt.outcome === 'defeat') {
				notifyStatus('The squad collapsed in combat.', 'danger');
				publishSfx('sfx_defeat');
				switchDistrict('GAME_OVER');
			} else if (evt.outcome === 'escaped') {
				notifyStatus('Retreated from the battlefield.', 'info');
				switchDistrict('OVERWORLD');
			} else {
				notifyStatus('Victory achieved! Spoils secured.', 'success');
				publishSfx('sfx_victory');
				switchDistrict('OVERWORLD');
			}
		});
		EventBus.subscribe('lockpick:resolved', (evt) => {
			if (!evt) return;
			if (evt.success) {
				if (evt.rewardLoot?.gold) modifyGold(evt.rewardLoot.gold);
				if (evt.rewardLoot?.item) modifyItem(evt.rewardLoot.item, 1);
				if (evt.flagsDelta) {
					Object.entries(evt.flagsDelta).forEach(([k, v]) => {
						setFlag(k, v);
					});
				}
				const goldTxt = evt.rewardLoot?.gold ? `${evt.rewardLoot.gold}G` : '';
				const itemTxt = evt.rewardLoot?.item ? ` + ${evt.rewardLoot.item}` : '';
				notifyStatus(`Harmonic seal shattered! Claimed: ${goldTxt}${itemTxt}`, 'success');
				publishSfx('sfx_victory');
			} else {
				notifyStatus('Harmonic disruption aborted.', 'info');
			}
			switchDistrict('OVERWORLD');
		});
	}

	const KNOWN_SUBSYSTEM_NAMES = [
		'EmberlightCombat',
		'EmberlightOverworld',
		'EmberlightMarket',
		'EmberlightProgression',
		'EmberlightLockpick',
		'EmberlightRelicForge',
		'EmberlightArmory',
		'EmberlightScript',
		'EmberlightStatus',
		'EmberlightChronicle',
		'EmberlightSettings',
		'EmberlightAuditor',
		'EmberlightCockpitRenderer',
		'EmberlightDistrictRouter',
		'EmberlightWorldEcology',
		'EmberlightMapRenderer',
		'EmberlightOverworldRenderer',
		'EmberlightDynamicLights',
		'EmberlightPseudo3D',
		'EmberlightThreatOracle',
		'EmberlightCombatRenderer',
		'EmberlightCombatBackdrop',
		'EmberlightCombatVFX',
		'EmberlightAcousticSFX',
		'EmberlightSoundtrack',
		'EmberlightVoice',
	];

	/**
	 * Safely resolves a global subsystem handle across browser and Node runtimes.
	 * [Pure Query]
	 * @param {string} name - Subsystem global identifier.
	 * @returns {any} Subsystem reference or null.
	 */
	const resolveGlobalSubsystem = (name) => {
		try {
			if (typeof globalThis !== 'undefined' && globalThis[name]) return globalThis[name];
			if (typeof window !== 'undefined' && window[name]) return window[name];
		} catch {
			// Non-fatal fallback
		}
		return null;
	};

	/**
	 * Configures and initializes a peripheral or simulation subsystem.
	 * [State Mutating]
	 * @param {any} sub - Target subsystem handle.
	 * @param {Object} hostConfig - Host configuration dictionary.
	 * @param {HostContext} hostContext - Host runtime context.
	 * @returns {void}
	 */
	const initializeSubsystem = (sub, hostConfig, hostContext) => {
		if (!sub) return;
		try {
			const diag = typeof sub.getDiagnostics === 'function' ? sub.getDiagnostics() : null;
			const state = diag?.lifecycleState;
			const needsConfig = !state || state === 'UNCONFIGURED';
			if (needsConfig && typeof sub.configure === 'function') {
				sub.configure(hostConfig);
			}
			const canInit = needsConfig || state === 'CONFIGURED';
			if (canInit && typeof sub.init === 'function') {
				sub.init(hostContext);
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
			initializeSubsystem(sub, hostConfig, hostContext);
		});

		const inputSub = resolveGlobalSubsystem('EmberlightInput');
		if (inputSub) {
			if (typeof inputSub.configure === 'function') {
				inputSub.configure(hostConfig);
			}
			if (typeof inputSub.init === 'function') {
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
		if (EventBus && typeof EventBus.registerCapability === 'function' && !EventBus.isSealed()) {
			['cap:elemental.scorch', 'cap:elemental.freeze', 'cap:sanctuary.consecrate', 'cap:elemental.gale_dispel', 'cap:dungeon.plate_trigger', 'cap:macro.inspect_caravan'].forEach((tok) => {
				if (!EventBus.hasCapability(tok)) {
					EventBus.registerCapability(tok, {
						evaluate: (payload) => {
							if (!payload?.targetCoords || payload.targetCoords.length === 0) return { authorized: false, reason: 'EMPTY_PAYLOAD' };
							return { authorized: true, token: tok };
						}
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
		console.log('[GameRuntime] Initializing Host Harness with Thin SSOT Bridge.');
		const hostConfig = { manifest: typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {} };
		const hostContext = { eventBus: EventBus, store, runtime: GameRuntime };

		bootstrapSubsystems(hostConfig, hostContext);
		registerHostCapabilities();

		if (Router) {
			Router.registerHandlers({
				switchDistrict,
				renderHUD,
				getParty,
				getInventory: () => /** @type {Record<string, number>} */(/** @type {unknown} */ (getInventory())),
				getGold,
				handleCancelAction,
				toggleQ4DeckExpansion,
				toggle3DViewportExpansion,
			});
		}

		bindDOMControls();
		switchDistrict('TITLE');

		if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(hostTick);
	};

	return {
		init, getParty, setParty, getInventory: () => /** @type {Record<string, number>} */(/** @type {unknown} */ (getInventory())), setInventory, modifyItem, getGold, modifyGold,
		getWorldPos, setWorldPos, getDungeonFloor, setDungeonFloor, getDungeonDepth, setDungeonDepth,
		getQuests, setQuests, getFlags, setFlag, getMacroPos, setMacroPos, getTownId, setTownId,
		getSurfaceMutations, getTownMutations, getDungeonSpec, setDungeonSpec, getSurfaceMap, setSurfaceMap,
		commitSession, getActiveDistrict: () => activeDistrict, switchDistrict, enterMarketDistrict,
		handleCancelAction, toggleQ4DeckExpansion, toggle3DViewportExpansion,
		isQ4DeckExpanded: () => isQ4DeckExpanded, is3DViewExpanded: () => is3DViewExpanded,
		moveParty, interactFacing, executeCapability, evaluateTileTrigger,
		renderHUD, renderOverworldGraphics, handleCockpitAction, handleInputAction, EventBus,
		get StorageManager() {
			if (store?.StorageManager) return store.StorageManager;
			if (typeof EmberlightSaveManager !== 'undefined') return EmberlightSaveManager;
			if (typeof StorageManager !== 'undefined') return StorageManager;
			return null;
		},
		store
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	// @ts-ignore
	window.GameRuntime = GameRuntime;
	// @ts-ignore
	window.runtime = GameRuntime;
	if (typeof document !== 'undefined') {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => GameRuntime.init());
		} else {
			GameRuntime.init();
		}
	}
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GameRuntime;
}