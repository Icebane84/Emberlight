/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME HARNESS & LIFECYCLE CONTROLLER (FACADE)
 * Document Identifier: VSRP-001-RUNTIME-CORE
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host SSOT & Ephemeral District Coordinator
 * Timestamp:           2026-09-16T23:45:00-04:00
 * Index Anchor:        PRS-001
 * ============================================================================
 */

/**
 * Creates save slot operation callbacks.
 * @param {any} store
 * @param {any} deps
 * @returns {Record<string, (slotId: string) => void>}
 */
function createSaveSlotHandlers(store, deps) {
	return {
		onSave: (slotId) => {
			if (!slotId) return;
			store?.StorageManager?.setActiveSlotId(slotId);
			store?.StorageManager?.save(undefined, slotId);
			deps.notifyStatus(`Expedition saved to ${slotId}.`, "success");
			deps.publishSfx("sfx_confirm");
			deps.renderSaveSlotCards();
			deps.updateTitleSaveSummary();
		},
		onLoad: (slotId) => {
			if (!slotId) return;
			store?.StorageManager?.setActiveSlotId(slotId);
			const success = store?.StorageManager?.load(undefined, slotId);
			if (success) {
				deps.notifyStatus(`Chronicle rehydrated from ${slotId}.`, "success");
				deps.publishSfx("sfx_confirm");
				deps.closeSaveLoadModal();
				deps.switchDistrict("OVERWORLD", {});
			} else {
				deps.notifyStatus(`Failed to load archive ${slotId}.`, "danger");
				deps.publishSfx("sfx_defeat");
			}
		},
		onDelete: (slotId) => {
			if (!slotId) return;
			if (typeof window !== "undefined" && window.confirm) {
				const ok = window.confirm(`Permanently wipe chronicle archive ${slotId}?`);
				if (!ok) return;
			}
			store?.StorageManager?.deleteSlot(slotId);
			deps.notifyStatus(`Archive ${slotId} erased.`, "warning");
			deps.publishSfx("sfx_defeat");
			deps.renderSaveSlotCards();
			deps.updateTitleSaveSummary();
		},
	};
}

/**
 * Creates tenant dispatchers for each interactive district.
 * @param {any} deps
 * @returns {Record<string, (hostContext: any) => void>}
 */
function createTenantDispatchers(deps) {
	const resetOverworldTenant = () => {
		const currentTownId = deps.getTownId();
		const inTown = Boolean(currentTownId);
		if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.reset === "function") {
			EmberlightOverworld.reset({
				map: deps.getActiveWorldMap(),
				playerPos: { ...deps.getWorldPos(), inTown, townId: currentTownId },
				party: deps.getParty(),
				flags: { ...deps.getFlags(), in_town: inTown, townId: currentTownId },
				facing: deps.store?.getFlag("facingDirection") || "DOWN",
				dungeonDepth: deps.getDungeonDepth(),
				dangerSteps: 0,
				townId: currentTownId,
				inTown,
			});
		}
	};

	return {
		STATUS(hostContext) {
			if (typeof EmberlightStatus !== "undefined" && typeof EmberlightStatus.reset === "function") {
				EmberlightStatus.reset({ party: deps.getParty() });
				if (typeof EmberlightStatusRenderer !== "undefined") {
					EmberlightStatus.render(EmberlightStatusRenderer, hostContext);
				}
			}
		},
		ARMORY(hostContext) {
			if (typeof EmberlightArmory !== "undefined" && typeof EmberlightArmory.reset === "function") {
				EmberlightArmory.reset({
					party: deps.getParty(),
					inventory: deps.getInventory(),
					gold: deps.getGold(),
				});
				if (typeof EmberlightArmoryRenderer !== "undefined") {
					EmberlightArmory.render(EmberlightArmoryRenderer, hostContext);
				}
			}
		},
		PROGRESSION(hostContext) {
			if (typeof EmberlightProgression !== "undefined" && typeof EmberlightProgression.reset === "function") {
				EmberlightProgression.reset({ party: deps.getParty() });
				if (typeof EmberlightProgressionRenderer !== "undefined") {
					EmberlightProgression.render(EmberlightProgressionRenderer, hostContext);
				}
			}
		},
		MARKET(hostContext) {
			if (typeof EmberlightMarket !== "undefined" && typeof EmberlightMarket.reset === "function") {
				EmberlightMarket.reset({
					party: deps.getParty(),
					gold: deps.getGold(),
					inventory: deps.getInventory(),
				});
				if (typeof EmberlightMarketRenderer !== "undefined") {
					EmberlightMarket.render(EmberlightMarketRenderer, hostContext);
				}
			}
		},
		CHRONICLE(hostContext) {
			if (typeof EmberlightChronicle !== "undefined" && typeof EmberlightChronicle.reset === "function") {
				EmberlightChronicle.reset({ quests: deps.getQuests(), flags: deps.getFlags() });
				if (typeof EmberlightChronicleRenderer !== "undefined") {
					EmberlightChronicle.render(EmberlightChronicleRenderer, hostContext);
				}
			}
		},
		RELIC_FORGE(hostContext) {
			if (typeof EmberlightRelicForge !== "undefined" && typeof EmberlightRelicForge.reset === "function") {
				EmberlightRelicForge.reset({
					party: deps.getParty(),
					gold: deps.getGold(),
					inventory: deps.getInventory(),
				});
				if (typeof EmberlightRelicForgeRenderer !== "undefined") {
					EmberlightRelicForge.render(EmberlightRelicForgeRenderer, hostContext);
				}
			}
		},
		AUDITOR(hostContext) {
			if (typeof EmberlightAuditor !== "undefined" && typeof EmberlightAuditor.reset === "function") {
				EmberlightAuditor.reset({
					snapshot: hostContext.snapshot,
					eventBus: hostContext.eventBus,
				});
				if (typeof EmberlightAuditor.render === "function") EmberlightAuditor.render();
			}
			resetOverworldTenant();
			if (typeof EmberlightPseudo3D !== "undefined" && typeof EmberlightPseudo3D.render === "function") {
				EmberlightPseudo3D.render(hostContext.snapshot);
			}
		},
		SETTINGS() {
			if (typeof EmberlightSettings !== "undefined" && typeof EmberlightSettings.reset === "function") {
				EmberlightSettings.reset({});
				if (typeof EmberlightSettings.render === "function") EmberlightSettings.render();
			}
		},
		LOCKPICK(hostContext) {
			if (typeof EmberlightLockpick !== "undefined" && typeof EmberlightLockpick.reset === "function") {
				EmberlightLockpick.reset(hostContext.snapshot);
				if (typeof EmberlightLockpick.render === "function") EmberlightLockpick.render();
			}
		},
		TITLE() {
			deps.updateTitleSaveSummary();
			const Cockpit = typeof EmberlightCockpitRenderer !== "undefined" ? /** @type {any} */ (EmberlightCockpitRenderer) : null;
			if (Cockpit && typeof Cockpit.startTitleAnimation === "function") {
				Cockpit.startTitleAnimation("title-bg-canvas", () => deps.activeDistrict);
			}
		},
		OVERWORLD(hostContext) {
			resetOverworldTenant();
			deps.renderOverworldGraphics(hostContext.snapshot);
		},
	};
}

const GameRuntime = (() => {
	//#region [SEC-01] Staging Ingestion & Domain Subsystem Binding
	/** @type {any} */
	const StateMod =
		(typeof window !== "undefined" && window._RuntimeInternal?.State) ||
		(typeof require !== "undefined" ? require("./runtime/runtime_state.js") : {});

	/** @type {any} */
	const PresMod =
		(typeof window !== "undefined" && window._RuntimeInternal?.Presentation) ||
		(typeof require !== "undefined" ? require("./runtime/runtime_presentation.js") : {});

	/** @type {any} */
	const InterMod =
		(typeof window !== "undefined" && window._RuntimeInternal?.Interactions) ||
		(typeof require !== "undefined" ? require("./runtime/runtime_interactions.js") : {});

	/** @type {any} */
	const NavMod =
		(typeof window !== "undefined" && window._RuntimeInternal?.Navigation) ||
		(typeof require !== "undefined" ? require("./runtime/runtime_navigation.js") : {});

	/** @type {any} */
	const StepMod =
		(typeof window !== "undefined" && window._RuntimeInternal?.Stepper) ||
		(typeof require !== "undefined" ? require("./runtime/runtime_stepper.js") : {});

	/** @type {any} */
	const EventMod =
		(typeof window !== "undefined" && window._RuntimeInternal?.Events) ||
		(typeof require !== "undefined" ? require("./runtime/runtime_events.js") : {});
	//#endregion

	//#region [SEC-02] Host State, SSOT Bridge & Helper Closures
	const store =
		typeof EmberlightSessionStore !== "undefined"
			? /** @type {any} */ (EmberlightSessionStore)
			: null;

	const accessors = StateMod.createStateAccessors ? StateMod.createStateAccessors(store) : {};
	const getParty = accessors.getParty || (() => []);
	const setParty = accessors.setParty || (() => {});
	const getInventory = accessors.getInventory || (() => ({}));
	const setInventory = accessors.setInventory || (() => {});
	const modifyItem = accessors.modifyItem || (() => {});
	const getGold = accessors.getGold || (() => 0);
	const modifyGold = accessors.modifyGold || (() => {});
	const getWorldPos = accessors.getWorldPos || (() => ({ x: 10, y: 10 }));
	const setWorldPos = accessors.setWorldPos || (() => {});
	const getDungeonFloor = accessors.getDungeonFloor || (() => 1);
	const setDungeonFloor = accessors.setDungeonFloor || (() => {});
	const getDungeonDepth = accessors.getDungeonDepth || (() => 0);
	const setDungeonDepth = accessors.setDungeonDepth || (() => {});
	const getQuests = accessors.getQuests || (() => []);
	const setQuests = accessors.setQuests || (() => {});
	const getFlags = accessors.getFlags || (() => ({}));
	const setFlag = accessors.setFlag || (() => {});
	const getMacroPos = accessors.getMacroPos || (() => ({ x: 1, y: 1 }));
	const setMacroPos = accessors.setMacroPos || (() => {});
	const getTownId = accessors.getTownId || (() => "town_haven");
	const setTownId = accessors.setTownId || (() => {});
	const getSurfaceMutations = accessors.getSurfaceMutations || (() => ({}));
	const getTownMutations = accessors.getTownMutations || (() => ({}));
	const getDungeonSpec = accessors.getDungeonSpec || (() => null);
	const setDungeonSpec = accessors.setDungeonSpec || (() => {});
	const getSurfaceMap = accessors.getSurfaceMap || (() => null);
	const setSurfaceMap = accessors.setSurfaceMap || (() => {});
	const commitSession = accessors.commitSession || (() => false);

	let activeDistrict = "TITLE";
	const isTickPaused = false;
	let lastFrameTime = typeof performance !== "undefined" ? performance.now() : Date.now();
	let stepCounter = 0;
	/** @type {'SAVE' | 'LOAD'} */
	let saveLoadModalMode = "LOAD";
	let isSaveLoadModalOpen = false;

	const EventBus = typeof EmberlightEventBus !== "undefined" ? /** @type {any} */ (EmberlightEventBus) : null;
	const Router = typeof EmberlightDistrictRouter !== "undefined" ? /** @type {any} */ (EmberlightDistrictRouter) : null;

	/**
	 * @param {string} msg
	 * @param {string} [tone]
	 */
	const notifyStatus = (msg, tone = "info") => {
		if (EventBus?.publish) EventBus.publish("status:toast", { message: msg, tone });
	};

	/**
	 * @param {string} cueId
	 */
	const publishSfx = (cueId) => {
		if (EventBus?.publish) EventBus.publish("audio:sfx", { cue: cueId });
	};

	/**
	 * @param {string} effectName
	 * @param {{ x: number, y: number }} targetPos
	 */
	const triggerVfx = (effectName, targetPos) => {
		if (EventBus?.publish) EventBus.publish("vfx:trigger", { effect: effectName, pos: targetPos });
	};

	const getActiveWorldMap = () => {
		return InterMod.getActiveWorldMap({
			activeDistrict,
			getDungeonSpec,
			getTownId,
			getFlags,
			getTownMutations,
			getSurfaceMutations,
			stepCounter,
			getDungeonDepth,
			getSurfaceMap,
		});
	};

	/**
	 * @param {string[][]|null} map
	 * @param {{ x: number, y: number }} pos
	 */
	const isTilePassable = (map, pos) => {
		return InterMod.isTilePassable(map, pos);
	};

	/**
	 * @param {any} a
	 * @param {any} b
	 * @param {any} c
	 */
	const recordTileMutation = (a, b, c) => {
		InterMod.recordTileMutation(a, b, c, store);
	};

	/**
	 * @param {string} [reason]
	 */
	const commitWorldUpdate = (reason) => {
		commitSession(reason || "WorldStateUpdate");
	};

	const updateTitleSaveSummary = () => {
		StateMod.updateTitleSaveSummary();
	};

	const renderSaveSlotCards = () => {
		const handlers = createSaveSlotHandlers(store, {
			notifyStatus,
			publishSfx,
			closeSaveLoadModal,
			switchDistrict,
			renderSaveSlotCards,
			updateTitleSaveSummary,
		});
		StateMod.renderSaveSlotCards(store, saveLoadModalMode, handlers);
	};

	/**
	 * @param {string} [mode]
	 */
	const openSaveLoadModal = (mode = "LOAD") => {
		if (typeof document === "undefined") return;
		saveLoadModalMode = mode === "SAVE" ? "SAVE" : "LOAD";
		isSaveLoadModalOpen = true;

		const modal = document.getElementById("save-load-modal");
		const titleEl = document.getElementById("save-load-modal-title");
		const subEl = document.getElementById("save-load-modal-subtitle");
		if (!modal) return;

		if (titleEl) titleEl.textContent = mode === "SAVE" ? "💾 SAVE EXPEDITION ARCHIVES" : "📂 LOAD EXPEDITION ARCHIVES";
		if (subEl) subEl.textContent = mode === "SAVE" ? "SELECT A CHRONICLE SLOT TO PERSIST YOUR ACTIVE STATE" : "SELECT A CHRONICLE SLOT TO RESTORE EXPEDITION";

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
	//#endregion

	//#region [SEC-03] District Dispatcher Registry & Navigation Matrix
	/** @type {Record<string, () => void>} */
	let overworldActionHandlers = {};

	/** @type {any} */
	let facade;

	/** @returns {Record<string, any>} */
	const getSharedDeps = () => ({
		store,
		activeDistrict,
		setActiveDistrict: (/** @type {string} */ d) => { activeDistrict = d; },
		stepCounter,
		incrementStepCounter: () => { stepCounter++; },
		getStepCounter: () => stepCounter,
		getParty,
		setParty,
		getInventory,
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
		isTilePassable,
		recordTileMutation,
		commitSession,
		commitWorldUpdate,
		notifyStatus,
		publishSfx,
		triggerVfx,
		switchDistrict,
		enterMarketDistrict,
		handleCancelAction,
		toggleQ4DeckExpansion,
		toggle3DViewportExpansion,
		getIsQ4DeckExpanded: () => NavMod.getIsQ4DeckExpanded ? NavMod.getIsQ4DeckExpanded() : false,
		getIs3DViewExpanded: () => NavMod.getIs3DViewExpanded ? NavMod.getIs3DViewExpanded() : false,
		moveParty,
		pivotFacing,
		interactFacing,
		executeCapability,
		evaluateTileTrigger,
		renderHUD,
		renderOverworldGraphics,
		handleCockpitAction,
		handleInputAction,
		handle3DNav: (/** @type {string} */ act) => NavMod.handle3DNav(act, getSharedDeps()),
		startCombat,
		openSaveLoadModal,
		closeSaveLoadModal,
		isSaveLoadModalOpen,
		getFacingInteractablePrompt: InterMod.getFacingInteractablePrompt,
		triggerZoneTransition: PresMod.triggerZoneTransition,
		runtime: facade,
		EventBus,
		OVERWORLD_ACTION_HANDLERS: overworldActionHandlers,
		overworldActionHandlers,
	});

	overworldActionHandlers = StepMod.createOverworldActionHandlers ? StepMod.createOverworldActionHandlers(getSharedDeps()) : {};
	const TENANT_DISPATCHERS = createTenantDispatchers({
		getParty,
		getInventory,
		getGold,
		getQuests,
		getFlags,
		getTownId,
		getActiveWorldMap,
		getWorldPos,
		getDungeonDepth,
		store,
		updateTitleSaveSummary,
		activeDistrict,
		renderOverworldGraphics,
	});

	/**
	 * @param {string} targetDistrict
	 * @param {any} [_metadata]
	 */
	function switchDistrict(targetDistrict, _metadata = {}) {
		const district = NavMod.normalizeDistrictName(targetDistrict);
		if (district !== "OVERWORLD" && NavMod.getIs3DViewExpanded?.()) {
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

		if (Router?.switchDistrict) {
			Router.switchDistrict(district, `${district.toLowerCase().replace("_", "-")}-view`, snapshot);
		}

		const hostContext = {
			eventBus: EventBus,
			store,
			runtime: facade,
			snapshot,
		};
		const dispatcher = TENANT_DISPATCHERS[district];
		if (dispatcher) {
			dispatcher(hostContext);
		}

		renderHUD();
	}

	/**
	 * @param {string} [marketId]
	 */
	function enterMarketDistrict(marketId = "market_general") {
		switchDistrict("MARKET", { marketId });
	}

	/**
	 * @param {boolean} [forceState]
	 */
	function toggleQ4DeckExpansion(forceState) {
		NavMod.toggleQ4DeckExpansion(typeof forceState === "boolean" ? forceState : undefined, getSharedDeps());
	}

	/**
	 * @param {boolean} [forceState]
	 */
	function toggle3DViewportExpansion(forceState) {
		NavMod.toggle3DViewportExpansion(typeof forceState === "boolean" ? forceState : undefined, getSharedDeps());
	}

	function handleCancelAction() {
		return NavMod.handleCancelAction(getSharedDeps());
	}

	/**
	 * @param {number} dx
	 * @param {number} dy
	 */
	function moveParty(dx, dy) {
		NavMod.moveParty(dx, dy, getSharedDeps());
	}

	/**
	 * @param {string} facing
	 */
	function pivotFacing(facing) {
		NavMod.pivotFacing(facing, getSharedDeps());
	}

	function interactFacing() {
		NavMod.interactFacing(getSharedDeps());
	}

	/**
	 * @param {string} capabilityToken
	 * @param {any} [targetContext]
	 */
	function executeCapability(capabilityToken, targetContext = {}) {
		return InterMod.executeCapability(capabilityToken, targetContext, getSharedDeps());
	}

	/**
	 * @param {{ x: number, y: number }} pos
	 * @param {{ x: number, y: number }|null} [facingPos]
	 * @param {boolean} [isInteraction]
	 */
	function evaluateTileTrigger(pos, facingPos = null, isInteraction = false) {
		return InterMod.evaluateTileTrigger(pos, facingPos, Boolean(isInteraction), getSharedDeps());
	}

	function renderHUD() {
		PresMod.renderHUD(getSharedDeps());
	}

	/**
	 * @param {any} [snapshot]
	 */
	function renderOverworldGraphics(snapshot) {
		PresMod.renderOverworldGraphics(snapshot, getSharedDeps());
	}

	/**
	 * @param {any} action
	 */
	function handleCockpitAction(action) {
		StepMod.handleCockpitAction(action, getSharedDeps());
	}

	/**
	 * @param {string} action
	 * @param {any} [evt]
	 */
	function handleInputAction(action, evt = {}) {
		StepMod.handleInputAction(action, evt, getSharedDeps());
	}

	/**
	 * @param {string} [encounterKey]
	 */
	function startCombat(encounterKey = "DEFAULT") {
		StepMod.startCombat(encounterKey, getSharedDeps());
	}
	//#endregion

	//#region [SEC-04] Lifecycle Tick & Game Loop Coordinator
	/**
	 * @param {number} [timestamp]
	 */
	const hostTick = (
		timestamp = typeof performance !== "undefined" ? performance.now() : Date.now(),
	) => {
		const dt = (timestamp - lastFrameTime) / 1000;
		lastFrameTime = timestamp;

		if (!isTickPaused) {
			StepMod.updateActiveDistrictSubsystems(dt, getSharedDeps());
		}

		if (typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(hostTick);
		}
	};
	//#endregion

	//#region [SEC-05] Public Interface Assembly, Seal & Exports
	const init = () => {
		console.log("[GameRuntime] Initializing Host Harness with Thin SSOT Bridge.");
		const hostConfig = {
			manifest: typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {},
		};
		const hostContext = { eventBus: EventBus, store, runtime: facade };

		EventMod.bootstrapSubsystems(hostConfig, hostContext, EventBus);
		EventMod.registerHostCapabilities(EventBus);
		EventMod.bindEventBusSubscriptions(getSharedDeps());

		if (Router && typeof Router.registerHandlers === "function") {
			Router.registerHandlers({
				switchDistrict: (/** @type {any} */ targetDistrict, /** @type {any} */ metadata) =>
					switchDistrict(String(targetDistrict || "OVERWORLD"), metadata),
				renderHUD,
				getParty,
				getInventory: () => /** @type {Record<string, number>} */ (/** @type {unknown} */ (getInventory())),
				getGold,
				handleCancelAction,
				toggleQ4DeckExpansion: (/** @type {any} */ forceState) =>
					toggleQ4DeckExpansion(typeof forceState === "boolean" ? forceState : undefined),
				toggle3DViewportExpansion: (/** @type {any} */ forceState) =>
					toggle3DViewportExpansion(typeof forceState === "boolean" ? forceState : undefined),
			});
		}

		StepMod.bindDOMControls(getSharedDeps());
		switchDistrict("TITLE", {});

		if (typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(hostTick);
		}
	};

	facade = {
		init,
		getParty,
		setParty,
		getInventory: () => /** @type {Record<string, number>} */ (/** @type {unknown} */ (getInventory())),
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
		isQ4DeckExpanded: () => NavMod.getIsQ4DeckExpanded ? NavMod.getIsQ4DeckExpanded() : false,
		is3DViewExpanded: () => NavMod.getIs3DViewExpanded ? NavMod.getIs3DViewExpanded() : false,
		moveParty,
		pivotFacing,
		interactFacing,
		executeCapability,
		evaluateTileTrigger,
		renderHUD,
		renderOverworldGraphics,
		handleCockpitAction,
		handleInputAction,
		handlePointerContextDown: (/** @type {any} */ e) => NavMod.handlePointerContextDown(e, getSharedDeps()),
		handlePointerContextMove: (/** @type {any} */ e) => NavMod.handlePointerContextMove(e),
		handlePointerContextUp: () => NavMod.handlePointerContextUp(getSharedDeps()),
		dismissTacticalChassis: () => NavMod.dismissTacticalChassis(),
		calculatePolarDirection: (/** @type {number} */ dx, /** @type {number} */ dy) => NavMod.calculatePolarDirection(dx, dy),
		resolveTargetMetadata: (/** @type {any} */ target, /** @type {number} */ clientX = 0, /** @type {number} */ clientY = 0) =>
			NavMod.resolveTargetMetadata(target, Number(clientX), Number(clientY), getSharedDeps()),
		executeLeafAction: (/** @type {string} */ dir, /** @type {any} */ meta) => NavMod.executeLeafAction(dir, meta, getSharedDeps()),
		EventBus,
		get StorageManager() {
			if (store?.StorageManager) return store.StorageManager;
			if (typeof EmberlightSaveManager !== "undefined") return EmberlightSaveManager;
			if (typeof StorageManager !== "undefined") return StorageManager;
			return null;
		},
		store,
	};

	if (typeof window !== "undefined" && window._RuntimeInternal) {
		delete window._RuntimeInternal;
	}

	return facade;
	//#endregion
})();

if (typeof window !== "undefined") {
	(/** @type {any} */ (window)).GameRuntime = GameRuntime;
	(/** @type {any} */ (window)).runtime = GameRuntime;
	(/** @type {any} */ (window)).EmberlightRuntime = GameRuntime;
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
