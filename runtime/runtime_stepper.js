/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME STEPPER & INPUT SUBSYSTEM
 * Document Identifier: VSRP-001-RUNTIME-STEPPER
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host Input Routing, Game Loop RAF Stepper & Combat Initiation
 * ============================================================================
 */

if (typeof window !== "undefined") {
	window._RuntimeInternal = window._RuntimeInternal || {};
}

(() => {
	/** @type {Record<string, (action: any, deps: any) => void>} */
	const COCKPIT_ACTION_HANDLERS = {
		MOVE: (a, d) => d.moveParty?.(a.dx || 0, a.dy || 0),
		PIVOT: (a, d) => d.pivotFacing?.(a.facing || a.direction),
		INTERACT: (_a, d) => d.interactFacing?.(),
		CANCEL: (_a, d) => d.handleCancelAction?.(),
		TOGGLE_EXPAND_DECK: (_a, d) => d.toggleQ4DeckExpansion?.(),
		TOGGLE_3D_VIEW: (_a, d) => d.toggle3DViewportExpansion?.(),
		SWITCH_DISTRICT: (a, d) => d.switchDistrict?.(a.district || "OVERWORLD", a.metadata || {}),
		USE_FIELD_ITEM: (a, d) => {
			if (a.itemId && typeof EmberlightFieldPouch !== "undefined" && typeof (/** @type {any} */ (EmberlightFieldPouch)).useFieldItem === "function") {
				(/** @type {any} */ (EmberlightFieldPouch)).useFieldItem(
					a.itemId,
					a.targetHeroId || a.targetId,
				);
				d.renderHUD?.();
			}
		},
		EXECUTE_CAPABILITY: (a, d) => d.executeCapability?.(a.capability || "", a.context || {}),
	};

	/**
	 * @param {any} action
	 * @param {any} deps
	 */
	function handleCockpitAction(action, deps) {
		if (!action?.type) return;
		const handler = COCKPIT_ACTION_HANDLERS[action.type];
		handler?.(action, deps);
	}

	/**
	 * Creates overworld action dictionary bound to host dependencies.
	 * @param {any} deps
	 * @returns {Record<string, () => void>}
	 */
	function createOverworldActionHandlers(deps) {
		const store = deps.store;
		return {
			UP: () => deps.moveParty?.(0, -1),
			DOWN: () => deps.moveParty?.(0, 1),
			LEFT: () => deps.moveParty?.(-1, 0),
			RIGHT: () => deps.moveParty?.(1, 0),
			CONFIRM: () => deps.interactFacing?.(),
			CANCEL: () => deps.handleCancelAction?.(),
			TOGGLE_EXPAND_DECK: () => deps.toggleQ4DeckExpansion?.(),
			TOGGLE_3D_VIEW: () => deps.toggle3DViewportExpansion?.(),
			MENU_ARMORY: () => deps.switchDistrict?.("ARMORY"),
			MENU_PROGRESSION: () => deps.switchDistrict?.("PROGRESSION"),
			MENU_STATUS: () => deps.switchDistrict?.("STATUS"),
			MENU_POUCH: () => {
				const cur = store?.getFlag("pouchOpen") || false;
				store?.setFlag("pouchOpen", !cur);
				deps.renderHUD?.();
			},
			MENU_SHOP: () => {
				if (deps.getTownId?.()) {
					deps.enterMarketDistrict?.("VILLAGE_SHOP");
				} else {
					deps.notifyStatus?.("Shopping is only available at the Merchant Caravan in town.", "warning");
				}
			},
			MENU_CHRONICLE: () => deps.switchDistrict?.("CHRONICLE"),
			FIELD_SCORCH: () => deps.executeCapability?.("cap:elemental.scorch"),
			FIELD_FREEZE: () => deps.executeCapability?.("cap:elemental.freeze"),
			FIELD_CONSECRATE: () => deps.executeCapability?.("cap:sanctuary.consecrate"),
			FIELD_DISPEL: () => deps.executeCapability?.("cap:elemental.gale_dispel"),
			REST: () => {
				const rested = (deps.getParty ? deps.getParty() : []).map((/** @type {any} */ c) => ({
					...c,
					alive: true,
					hp: c.maxHp || c.hp,
					mp: c.maxMp || c.mp,
					ailments: [],
				}));
				deps.setParty?.(rested);
				deps.notifyStatus?.("The squad rested at camp. Vitality and essence fully restored.", "success");
				deps.publishSfx?.("sfx_heal");
				deps.renderHUD?.();
			},
		};
	}

	/**
	 * @param {string} action
	 * @param {any} deps
	 */
	function handleTitleInputAction(action, deps) {
		const store = deps.store;
		if (action === "CONFIRM") {
			const saveMgr = typeof EmberlightSaveManager !== "undefined" ? /** @type {any} */ (EmberlightSaveManager) : null;
			if (saveMgr?.hasSave()) store?.StorageManager?.load();
			else store?.startNewGame();
			deps.switchDistrict?.("OVERWORLD");
		} else if (action === "CANCEL") {
			deps.switchDistrict?.("SETTINGS");
		}
	}

	/**
	 * @param {string} action
	 * @param {any} deps
	 * @returns {boolean}
	 */
	function delegateDistrictInputAction(action, deps) {
		const district = deps.activeDistrict;
		if (district === "COMBAT") {
			if (typeof EmberlightCombat !== "undefined" && typeof EmberlightCombat.handleHostAction === "function") {
				EmberlightCombat.handleHostAction(action);
				deps.renderHUD?.();
			}
			return true;
		}
		if (district === "LOCKPICK") {
			if (typeof EmberlightLockpick !== "undefined" && typeof EmberlightLockpick.handleHostAction === "function") {
				EmberlightLockpick.handleHostAction(action);
				deps.renderHUD?.();
			}
			return true;
		}
		if (district === "SETTINGS") {
			if (typeof EmberlightSettings !== "undefined" && typeof EmberlightSettings.handleHostAction === "function") {
				EmberlightSettings.handleHostAction(action);
			}
			return true;
		}
		return false;
	}

	/**
	 * @param {string} action
	 * @param {MouseEvent|KeyboardEvent|Record<string, any>} [evt]
	 * @param {any} [deps]
	 * @returns {void}
	 */
	function handleInputAction(action, evt = {}, deps = {}) {
		if (!action) return;

		if (deps.activeDistrict === "TITLE") {
			handleTitleInputAction(action, deps);
			return;
		}

		if (delegateDistrictInputAction(action, deps)) {
			return;
		}

		if (deps.activeDistrict !== "OVERWORLD" && deps.activeDistrict !== "world") {
			if (action === "CANCEL") {
				deps.handleCancelAction?.();
			}
			return;
		}

		if (evt && "shiftKey" in evt && evt.shiftKey && ["UP", "DOWN", "LEFT", "RIGHT"].includes(action)) {
			deps.pivotFacing?.(action);
			return;
		}

		if (deps.getIs3DViewExpanded?.() && ["UP", "DOWN", "LEFT", "RIGHT", "STRAFE_LEFT"].includes(action)) {
			deps.handle3DNav?.(action);
			return;
		}

		const handlers = deps.overworldActionHandlers || {};
		const handler = handlers[action];
		handler?.();
	}

	/** @param {number} dt */
	function updateOverworldSubsystems(dt) {
		if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.update === "function") {
			EmberlightOverworld.update(dt, { inputs: [] });
		}
		if (typeof EmberlightWorldEcology !== "undefined" && typeof EmberlightWorldEcology.update === "function") {
			EmberlightWorldEcology.update(dt);
		}
		if (typeof EmberlightDynamicLights !== "undefined" && typeof EmberlightDynamicLights.update === "function") {
			EmberlightDynamicLights.update(dt);
		}
		if (typeof EmberlightPseudo3D !== "undefined" && typeof EmberlightPseudo3D.update === "function") {
			EmberlightPseudo3D.update(dt);
		}
	}

	/** @param {number} dt @param {any} deps */
	function updateActiveDistrictSubsystems(dt, deps) {
		if (typeof EmberlightSoundtrack !== "undefined" && typeof EmberlightSoundtrack.update === "function") {
			EmberlightSoundtrack.update(dt);
		}
		if (deps.activeDistrict === "COMBAT" && typeof EmberlightCombat !== "undefined" && typeof EmberlightCombat.update === "function") {
			EmberlightCombat.update(dt, { inputs: [] });
		} else if (deps.activeDistrict === "LOCKPICK" && typeof EmberlightLockpick !== "undefined" && typeof EmberlightLockpick.update === "function") {
			EmberlightLockpick.update(dt, { inputs: [] });
			if (typeof EmberlightLockpick.render === "function") EmberlightLockpick.render();
		} else if (deps.activeDistrict !== "TITLE" && deps.activeDistrict !== "GAME_OVER") {
			updateOverworldSubsystems(dt);
		}
	}

	/**
	 * @param {string} encounterKey
	 * @returns {any}
	 */
	function buildEncounterSpec(encounterKey) {
		const manifest = typeof EmberlightManifest !== "undefined" ? /** @type {any} */ (EmberlightManifest) : {};
		const encounters = manifest.Encounters || {};
		return (
			encounters[encounterKey] ||
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
			}
		);
	}

	/**
	 * @param {string} encounterKey
	 * @param {any} deps
	 */
	function setBackdropForEncounter(encounterKey, deps) {
		if (typeof EmberlightCombatBackdrop === "undefined" || typeof EmberlightCombatBackdrop.setBiome !== "function") return;
		let biome = "MEADOW";
		if (deps.getDungeonDepth && deps.getDungeonDepth() > 0) biome = "CRYPT";
		else if (deps.getTownId?.()) biome = "TOWN";
		if (encounterKey?.includes("MALAKOR")) biome = "BOSS";
		EmberlightCombatBackdrop.setBiome(biome);
	}

	/**
	 * @param {string} [encounterKey='DEFAULT']
	 * @param {any} [deps]
	 */
	function startCombat(encounterKey = "DEFAULT", deps = {}) {
		if (deps.getIs3DViewExpanded?.()) {
			deps.toggle3DViewportExpansion?.(false);
		}
		if (deps.getIsQ4DeckExpanded?.()) {
			deps.toggleQ4DeckExpansion?.(false);
		}
		deps.setActiveDistrict?.("COMBAT");

		if (typeof EmberlightCombat !== "undefined" && typeof EmberlightCombat.reset === "function") {
			const encounter = buildEncounterSpec(encounterKey);
			EmberlightCombat.reset({
				party: deps.getParty ? deps.getParty() : [],
				gold: deps.getGold ? deps.getGold() : 0,
				inventory: /** @type {Record<string, number>} */ (
					/** @type {unknown} */ (deps.getInventory ? deps.getInventory() : {})
				),
				encounterKey,
				encounter,
				dungeonDepth: deps.getDungeonDepth ? deps.getDungeonDepth() : 0,
			});
		}

		setBackdropForEncounter(encounterKey, deps);

		const Router = typeof EmberlightDistrictRouter !== "undefined" ? /** @type {any} */ (EmberlightDistrictRouter) : null;
		Router?.switchDistrict?.("COMBAT");
		deps.renderHUD?.();
	}

	function toggleFullscreenMode(/** @type {any} */ [deps]) {
		if (typeof document === "undefined") return;
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen?.().catch(() => {});
			if (deps?.notifyStatus) deps.notifyStatus("Display mode: FULLSCREEN", "info");
		} else {
			document.exitFullscreen?.().catch(() => {});
			if (deps?.notifyStatus) deps.notifyStatus("Display mode: WINDOWED", "info");
		}
	}

	/**
	 * @param {{ command?: string, layoutPreset?: string, fontScale?: string, enabled?: boolean, isMuted?: boolean }} evt
	 * @param {any} deps
	 */
	function handleSystemCommand(evt, deps) {
		if (!evt?.command) return;
		const store = deps.store;
		switch (evt.command) {
			case "SAVE_GAME":
			case "OPEN_SAVE_MODAL":
				deps.openSaveLoadModal?.("SAVE");
				break;
			case "OPEN_LOAD_MODAL":
				deps.openSaveLoadModal?.("LOAD");
				break;
			case "RETURN_TO_TITLE":
				deps.switchDistrict?.("TITLE");
				break;
			case "WIPE_STORAGE":
				store?.StorageManager?.clear?.();
				deps.notifyStatus?.("Local storage cleared. Returning to title.", "danger");
				deps.switchDistrict?.("TITLE");
				break;
			case "SET_LAYOUT_RATIO":
				deps.notifyStatus?.(`Viewport layout updated: ${evt.layoutPreset}`, "info");
				break;
			case "SET_FONT_SCALE":
				deps.notifyStatus?.(`UI font scale updated: ${evt.fontScale}`, "info");
				break;
			case "TOGGLE_FULLSCREEN":
				toggleFullscreenMode(deps);
				break;
			case "TOGGLE_SCANLINES":
				if (typeof document !== "undefined" && document.body) {
					document.body.classList.toggle("crt-enabled", Boolean(evt.enabled));
					deps.notifyStatus?.(`CRT Scanlines: ${evt.enabled ? "ENABLED" : "DISABLED"}`, "info");
				}
				break;
			case "TOGGLE_MUTE":
				deps.notifyStatus?.(`Master Audio: ${evt.isMuted ? "MUTED" : "ACTIVE"}`, "info");
				break;
			default:
				break;
		}
	}

	/**
	 * @param {(id: string, fn: () => void) => void} bind
	 * @param {any} deps
	 */
	function bindTitleControls(bind, deps) {
		bind("menu-continue-btn", () => {
			const store = deps.store;
			const saveMgr = typeof EmberlightSaveManager !== "undefined" ? /** @type {any} */ (EmberlightSaveManager) : null;
			const recentSlot = saveMgr?.getMostRecentSlotId ? saveMgr.getMostRecentSlotId() : "SLOT_1";
			if (saveMgr?.hasSave(recentSlot)) {
				store?.StorageManager?.setActiveSlotId(recentSlot);
				store?.StorageManager?.load(undefined, recentSlot);
				deps.notifyStatus?.(`Expedition resumed from ${recentSlot}.`, "success");
			} else {
				store?.startNewGame();
				deps.notifyStatus?.("No save found. Initialized fresh expedition.", "info");
			}
			deps.switchDistrict?.("OVERWORLD");
			deps.publishSfx?.("sfx_confirm");
		});

		bind("menu-new-game-btn", () => {
			deps.store?.startNewGame();
			deps.switchDistrict?.("OVERWORLD");
			deps.notifyStatus?.("Mission initialized. Explore the wilderness.", "success");
			deps.publishSfx?.("sfx_confirm");
		});

		bind("menu-load-btn", () => {
			deps.openSaveLoadModal?.("LOAD");
			deps.publishSfx?.("sfx_confirm");
		});

		bind("close-save-load-btn", () => deps.closeSaveLoadModal?.());
		bind("save-load-back-btn", () => deps.closeSaveLoadModal?.());
		bind("title-settings-btn", () => deps.switchDistrict?.("SETTINGS"));
		bind("top-settings-btn", () => {
			if (deps.activeDistrict === "SETTINGS") deps.handleCancelAction?.();
			else deps.switchDistrict?.("SETTINGS");
		});

		bind("title-mute-btn", () => {
			if (typeof EmberlightAcousticSFX !== "undefined" && typeof EmberlightAcousticSFX.toggleMute === "function") {
				const muted = EmberlightAcousticSFX.toggleMute();
				const btn = document.getElementById("title-mute-btn");
				if (btn) btn.textContent = muted ? "🔇 MUTED" : "🔊 AUDIO";
			}
		});
	}

	/**
	 * @param {(id: string, fn: () => void) => void} bind
	 * @param {any} deps
	 */
	function bindGameOverControls(bind, deps) {
		bind("go-reload-btn", () => {
			if (typeof EmberlightSaveManager !== "undefined") deps.store?.StorageManager?.load();
			deps.switchDistrict?.("OVERWORLD");
		});

		bind("go-yield-btn", () => {
			const party = (deps.getParty ? deps.getParty() : []).map((/** @type {any} */ c) => ({
				...c,
				alive: true,
				hp: Math.max(1, Math.floor((c.maxHp || 30) / 2)),
			}));
			deps.setParty?.(party);
			deps.modifyGold?.(-Math.floor((deps.getGold ? deps.getGold() : 0) * 0.25));
			deps.setDungeonDepth?.(0);
			deps.setWorldPos?.({ x: 1, y: 1 });
			deps.switchDistrict?.("OVERWORLD");
		});
	}

	/**
	 * @param {(id: string, fn: () => void) => void} bind
	 * @param {any} deps
	 */
	function bindNavDockControls(bind, deps) {
		bind("nav-status-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Cannot open Status during combat! Disengage first.", "warning");
			} else {
				deps.switchDistrict?.("STATUS");
			}
		});
		bind("nav-armory-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Cannot enter Armory during combat! Disengage first.", "warning");
			} else {
				deps.switchDistrict?.("ARMORY");
			}
		});
		bind("nav-progression-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Cannot open Progression during combat! Disengage first.", "warning");
			} else {
				deps.switchDistrict?.("PROGRESSION");
			}
		});
		bind("nav-pouch-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				if (typeof EmberlightCombat !== "undefined" && typeof (/** @type {any} */ (EmberlightCombat)).handleHostAction === "function") {
					(/** @type {any} */ (EmberlightCombat)).handleHostAction("CHOICE_4");
				}
				return;
			}
			const store = deps.store;
			const cur = store?.getFlag("pouchOpen") || false;
			store?.setFlag("pouchOpen", !cur);
			deps.renderHUD?.();
		});
		bind("nav-chronicle-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Cannot open Chronicle during combat! Disengage first.", "warning");
			} else {
				deps.switchDistrict?.("CHRONICLE");
			}
		});
		bind("nav-world-btn", () => {
			if (deps.activeDistrict !== "OVERWORLD") deps.switchDistrict?.("OVERWORLD");
		});
		bind("nav-camp-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Cannot make camp while engaged in combat!", "warning");
			} else {
				deps.overworldActionHandlers?.REST?.();
			}
		});
		bind("nav-rest-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Cannot rest while engaged in combat!", "warning");
				return;
			}
			const rested = (deps.getParty ? deps.getParty() : []).map((/** @type {any} */ c) => ({
				...c,
				alive: true,
				hp: c.maxHp || c.hp,
				mp: c.maxMp || c.mp,
				ailments: [],
			}));
			deps.setParty?.(rested);
			deps.notifyStatus?.("The squad rested at camp. Vitality and essence fully restored.", "success");
			deps.publishSfx?.("sfx_heal");
			deps.renderHUD?.();
		});
		bind("nav-settings-btn", () => {
			if (deps.activeDistrict === "COMBAT") {
				deps.notifyStatus?.("Use [ESC] or Disengage to leave combat before opening Settings.", "warning");
			} else {
				deps.switchDistrict?.("SETTINGS");
			}
		});
	}

	/**
	 * @param {(id: string, fn: () => void) => void} bind
	 * @param {any} deps
	 */
	function bindViewportControls(bind, deps) {
		bind("top-pouch-btn", () => deps.overworldActionHandlers?.MENU_POUCH?.());
		bind("top-deck-btn", () => deps.toggleQ4DeckExpansion?.());
		bind("top-view-3d-btn", () => deps.toggle3DViewportExpansion?.());
		bind("q4-expand-btn", () => deps.toggleQ4DeckExpansion?.());
		bind("q2-expand-btn", () => deps.toggle3DViewportExpansion?.());
		bind("close-pouch-btn", () => deps.handleCancelAction?.());

		if (typeof window !== "undefined") {
			window.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					deps.handleCancelAction?.();
				}
			});
		}
	}

	/**
	 * Binds DOM button and keydown interactions for the host shell.
	 * @param {any} deps
	 * @returns {void}
	 */
	function bindDOMControls(deps) {
		if (typeof document === "undefined") return;

		const bind = (/** @type {string} */ id, /** @type {() => void} */ fn) => {
			const el = document.getElementById(id);
			if (el) el.onclick = fn;
		};

		bindTitleControls(bind, deps);
		bindGameOverControls(bind, deps);
		bindNavDockControls(bind, deps);
		bindViewportControls(bind, deps);
	}

	const RuntimeStepper = {
		handleCockpitAction,
		createOverworldActionHandlers,
		handleTitleInputAction,
		delegateDistrictInputAction,
		handleInputAction,
		updateOverworldSubsystems,
		updateActiveDistrictSubsystems,
		startCombat,
		toggleFullscreenMode,
		handleSystemCommand,
		bindDOMControls,
	};

	if (typeof window !== "undefined") {
		window._RuntimeInternal = window._RuntimeInternal || {};
		window._RuntimeInternal.Stepper = RuntimeStepper;
	}

	if (typeof module !== "undefined") {
		module.exports = RuntimeStepper;
	}
})();
