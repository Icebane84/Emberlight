/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME HARNESS & LIFECYCLE CONTROLLER (FACADE)
 * Document Identifier: VSRP-001-RUNTIME-CORE
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host SSOT & Ephemeral District Coordinator
 * Timestamp:           2026-09-17T02:35:00-04:00
 * Index Anchor:        PRS-001
 * ============================================================================
 */

/**
 * Resolves all runtime staging subsystems from window or require.
 * @returns {{ StateMod: any, PresMod: any, InterMod: any, NavMod: any, StepMod: any, EventMod: any }}
 */
function loadSubsystems() {
	const win = typeof window !== "undefined" ? window._RuntimeInternal : null;
	const req = typeof require !== "undefined" ? require : null;
	return {
		StateMod: win?.State || (req ? req("./runtime/runtime_state.js") : {}),
		PresMod: win?.Presentation || (req ? req("./runtime/runtime_presentation.js") : {}),
		InterMod: win?.Interactions || (req ? req("./runtime/runtime_interactions.js") : {}),
		NavMod: win?.Navigation || (req ? req("./runtime/runtime_navigation.js") : {}),
		StepMod: win?.Stepper || (req ? req("./runtime/runtime_stepper.js") : {}),
		EventMod: win?.Events || (req ? req("./runtime/runtime_events.js") : {}),
	};
}

/**
 * Resolves state accessors with canonical zero-dependency defaults.
 * @param {any} StateMod
 * @param {any} store
 * @returns {Record<string, any>}
 */
function resolveAccessors(StateMod, store) {
	const raw = StateMod.createStateAccessors ? StateMod.createStateAccessors(store) : {};
	const defaults = {
		getParty: () => [],
		setParty: () => {},
		getInventory: () => ({}),
		setInventory: () => {},
		modifyItem: () => {},
		getGold: () => 0,
		modifyGold: () => {},
		getWorldPos: () => ({ x: 10, y: 10 }),
		setWorldPos: () => {},
		getDungeonFloor: () => 1,
		setDungeonFloor: () => {},
		getDungeonDepth: () => 0,
		setDungeonDepth: () => {},
		getQuests: () => [],
		setQuests: () => {},
		getFlags: () => ({}),
		setFlag: () => {},
		getMacroPos: () => ({ x: 1, y: 1 }),
		setMacroPos: () => {},
		getTownId: () => "town_haven",
		setTownId: () => {},
		getSurfaceMutations: () => ({}),
		getTownMutations: () => ({}),
		getDungeonSpec: () => null,
		setDungeonSpec: () => {},
		getSurfaceMap: () => null,
		setSurfaceMap: () => {},
		commitSession: () => false,
	};
	return Object.assign(defaults, raw);
}

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
		const currentTownId = deps.acc.getTownId();
		const inTown = Boolean(currentTownId);
		if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.reset === "function") {
			EmberlightOverworld.reset({
				map: deps.getActiveWorldMap(),
				playerPos: { ...deps.acc.getWorldPos(), inTown, townId: currentTownId },
				party: deps.acc.getParty(),
				flags: { ...deps.acc.getFlags(), in_town: inTown, townId: currentTownId },
				facing: deps.store?.getFlag("facingDirection") || "DOWN",
				dungeonDepth: deps.acc.getDungeonDepth(),
				dangerSteps: 0,
				townId: currentTownId,
				inTown,
			});
		}
	};

	return {
		STATUS(hostContext) {
			if (typeof EmberlightStatus !== "undefined" && typeof EmberlightStatus.reset === "function") {
				EmberlightStatus.reset({ party: deps.acc.getParty() });
				if (typeof EmberlightStatusRenderer !== "undefined") {
					EmberlightStatus.render(EmberlightStatusRenderer, hostContext);
				}
			}
		},
		ARMORY(hostContext) {
			if (typeof EmberlightArmory !== "undefined" && typeof EmberlightArmory.reset === "function") {
				EmberlightArmory.reset({
					party: deps.acc.getParty(),
					inventory: deps.acc.getInventory(),
					gold: deps.acc.getGold(),
				});
				if (typeof EmberlightArmoryRenderer !== "undefined") {
					EmberlightArmory.render(EmberlightArmoryRenderer, hostContext);
				}
			}
		},
		PROGRESSION(hostContext) {
			if (typeof EmberlightProgression !== "undefined" && typeof EmberlightProgression.reset === "function") {
				EmberlightProgression.reset({ party: deps.acc.getParty() });
				if (typeof EmberlightProgressionRenderer !== "undefined") {
					EmberlightProgression.render(EmberlightProgressionRenderer, hostContext);
				}
			}
		},
		MARKET(hostContext) {
			if (typeof EmberlightMarket !== "undefined" && typeof EmberlightMarket.reset === "function") {
				EmberlightMarket.reset({
					party: deps.acc.getParty(),
					gold: deps.acc.getGold(),
					inventory: deps.acc.getInventory(),
				});
				if (typeof EmberlightMarketRenderer !== "undefined") {
					EmberlightMarket.render(EmberlightMarketRenderer, hostContext);
				}
			}
		},
		CHRONICLE(hostContext) {
			if (typeof EmberlightChronicle !== "undefined" && typeof EmberlightChronicle.reset === "function") {
				EmberlightChronicle.reset({ quests: deps.acc.getQuests(), flags: deps.acc.getFlags() });
				if (typeof EmberlightChronicleRenderer !== "undefined") {
					EmberlightChronicle.render(EmberlightChronicleRenderer, hostContext);
				}
			}
		},
		RELIC_FORGE(hostContext) {
			if (typeof EmberlightRelicForge !== "undefined" && typeof EmberlightRelicForge.reset === "function") {
				EmberlightRelicForge.reset({
					party: deps.acc.getParty(),
					gold: deps.acc.getGold(),
					inventory: deps.acc.getInventory(),
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
				Cockpit.startTitleAnimation("title-bg-canvas", () => deps.getActiveDistrict());
			}
		},
		OVERWORLD(hostContext) {
			resetOverworldTenant();
			deps.renderOverworldGraphics(hostContext.snapshot);
		},
	};
}

/**
 * Registers navigation handlers with the DistrictRouter.
 * @param {any} Router
 * @param {any} handlers
 */
function registerDistrictRouter(Router, handlers) {
	if (!Router || typeof Router.registerHandlers !== "function") return;
	Router.registerHandlers({
		switchDistrict: (/** @type {any} */ targetDistrict, /** @type {any} */ metadata) =>
			handlers.switchDistrict(String(targetDistrict || "OVERWORLD"), metadata),
		renderHUD: handlers.renderHUD,
		getParty: handlers.getParty,
		getInventory: handlers.getInventory,
		getGold: handlers.getGold,
		handleCancelAction: handlers.handleCancelAction,
		toggleQ4DeckExpansion: (/** @type {any} */ forceState) =>
			handlers.toggleQ4DeckExpansion(typeof forceState === "boolean" ? forceState : undefined),
		toggle3DViewportExpansion: (/** @type {any} */ forceState) =>
			handlers.toggle3DViewportExpansion(typeof forceState === "boolean" ? forceState : undefined),
	});
}

const GameRuntime = (() => {
	//#region [SEC-01] Staging Ingestion & Domain Subsystem Binding
	const { StateMod, PresMod, InterMod, NavMod, StepMod, EventMod } = loadSubsystems();
	//#endregion

	//#region [SEC-02] Host State, SSOT Bridge & Helper Closures
	const store =
		typeof EmberlightSessionStore !== "undefined"
			? /** @type {any} */ (EmberlightSessionStore)
			: null;

	const acc = resolveAccessors(StateMod, store);

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
			getDungeonSpec: acc.getDungeonSpec,
			getTownId: acc.getTownId,
			getFlags: acc.getFlags,
			getTownMutations: acc.getTownMutations,
			getSurfaceMutations: acc.getSurfaceMutations,
			stepCounter,
			getDungeonDepth: acc.getDungeonDepth,
			getSurfaceMap: acc.getSurfaceMap,
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
		acc.commitSession(reason || "WorldStateUpdate");
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
		getParty: acc.getParty,
		setParty: acc.setParty,
		getInventory: acc.getInventory,
		setInventory: acc.setInventory,
		modifyItem: acc.modifyItem,
		getGold: acc.getGold,
		modifyGold: acc.modifyGold,
		getWorldPos: acc.getWorldPos,
		setWorldPos: acc.setWorldPos,
		getDungeonFloor: acc.getDungeonFloor,
		setDungeonFloor: acc.setDungeonFloor,
		getDungeonDepth: acc.getDungeonDepth,
		setDungeonDepth: acc.setDungeonDepth,
		getQuests: acc.getQuests,
		setQuests: acc.setQuests,
		getFlags: acc.getFlags,
		setFlag: acc.setFlag,
		getMacroPos: acc.getMacroPos,
		setMacroPos: acc.setMacroPos,
		getTownId: acc.getTownId,
		setTownId: acc.setTownId,
		getSurfaceMutations: acc.getSurfaceMutations,
		getTownMutations: acc.getTownMutations,
		getDungeonSpec: acc.getDungeonSpec,
		setDungeonSpec: acc.setDungeonSpec,
		getSurfaceMap: acc.getSurfaceMap,
		setSurfaceMap: acc.setSurfaceMap,
		getActiveWorldMap,
		isTilePassable,
		recordTileMutation,
		commitSession: acc.commitSession,
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
		acc,
		store,
		updateTitleSaveSummary,
		getActiveDistrict: () => activeDistrict,
		getActiveWorldMap,
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

		const currentTownId = acc.getTownId();
		const inTown = Boolean(currentTownId);
		const snapshot = {
			party: acc.getParty(),
			gold: acc.getGold(),
			inventory: acc.getInventory(),
			worldPos: acc.getWorldPos(),
			playerPos: { ...acc.getWorldPos(), inTown, townId: currentTownId },
			map: getActiveWorldMap(),
			macroPos: acc.getMacroPos(),
			activeDistrict,
			dungeonFloor: acc.getDungeonFloor(),
			dungeonDepth: acc.getDungeonDepth(),
			stepCounter,
			flags: { ...acc.getFlags(), in_town: inTown, townId: currentTownId },
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

		registerDistrictRouter(Router, {
			switchDistrict,
			renderHUD,
			getParty: acc.getParty,
			getInventory: () => /** @type {Record<string, number>} */ (/** @type {unknown} */ (acc.getInventory())),
			getGold: acc.getGold,
			handleCancelAction,
			toggleQ4DeckExpansion,
			toggle3DViewportExpansion,
		});

		StepMod.bindDOMControls(getSharedDeps());
		switchDistrict("TITLE", {});

		if (typeof requestAnimationFrame !== "undefined") {
			requestAnimationFrame(hostTick);
		}
	};

	facade = {
		init,
		getParty: acc.getParty,
		setParty: acc.setParty,
		getInventory: () => /** @type {Record<string, number>} */ (/** @type {unknown} */ (acc.getInventory())),
		setInventory: acc.setInventory,
		modifyItem: acc.modifyItem,
		getGold: acc.getGold,
		modifyGold: acc.modifyGold,
		getWorldPos: acc.getWorldPos,
		setWorldPos: acc.setWorldPos,
		getDungeonFloor: acc.getDungeonFloor,
		setDungeonFloor: acc.setDungeonFloor,
		getDungeonDepth: acc.getDungeonDepth,
		setDungeonDepth: acc.setDungeonDepth,
		getQuests: acc.getQuests,
		setQuests: acc.setQuests,
		getFlags: acc.getFlags,
		setFlag: acc.setFlag,
		getMacroPos: acc.getMacroPos,
		setMacroPos: acc.setMacroPos,
		getTownId: acc.getTownId,
		setTownId: acc.setTownId,
		getSurfaceMutations: acc.getSurfaceMutations,
		getTownMutations: acc.getTownMutations,
		getDungeonSpec: acc.getDungeonSpec,
		setDungeonSpec: acc.setDungeonSpec,
		getSurfaceMap: acc.getSurfaceMap,
		setSurfaceMap: acc.setSurfaceMap,
		getActiveWorldMap,
		commitSession: acc.commitSession,
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
