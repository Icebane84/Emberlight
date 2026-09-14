/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DISTRICT ROUTER & MODAL COORDINATOR
 * Document Identifier: VSRP-001-DISTRICT-ROUTER
 * Governing Protocol:  VSRP-001-DISTRICT-ROUTER
 * Authority:           Host SSOT
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Module State & View Registry
 *   [SEC-02] Viewport Topology & Lighting Coordination
 *   [SEC-03] Handler Registration & Escape Routing
 *   [SEC-04] District Switching & Tenant Lifecycle Pipeline
 *   [SEC-05] Host Subsystem Interface Gateway
 *   [SEC-06] Global Export & Dual-Binding
 * ============================================================================
 */

const EmberlightDistrictRouter = (() => {
	//#region [SEC-01] Module State & View Registry
	/**
	 * @typedef {'OVERWORLD' | 'COMBAT' | 'DIALOGUE' | 'STATUS' | 'ARMORY' | 'PROGRESSION' | 'MARKET' | 'CHRONICLE' | 'RELIC_FORGE' | 'LOCKPICK' | 'AUDITOR' | 'SETTINGS' | 'TITLE' | 'GAME_OVER' | string} DistrictToken
	 */

	/**
	 * @typedef {Object} DistrictRouterDiagnostics
	 * @property {'district_router'} driverId
	 * @property {string} activeDistrict
	 * @property {number} registeredViews
	 * @property {number} registeredHandlersCount
	 */

	/**
	 * @typedef {Record<string, function(any=): void>} HostDistrictHandlers
	 */

	/**
	 * @typedef {Object} HostInitContext
	 * @property {Object} [eventBus]
	 * @property {function(string, any=): void} [eventBus.publish]
	 * @property {function(string, function(any): void): void} [eventBus.subscribe]
	 * @property {Object} [sessionStore]
	 * @property {function(): any} [sessionStore.getSnapshot]
	 * @property {HostDistrictHandlers} [handlers]
	 */

	/**
	 * @typedef {Object} HostExecutionContext
	 * @property {function(): void} [resumeOverworld]
	 * @property {boolean} [isQ4DeckExpanded]
	 * @property {function(boolean): void} [toggleQ4DeckExpansion]
	 * @property {boolean} [is3DViewExpanded]
	 * @property {function(boolean): void} [toggle3DViewportExpansion]
	 * @property {HostDistrictHandlers} [handlers]
	 * @property {any} [snapshot]
	 */

	/**
	 * @typedef {Object} DistrictMountedEventPayload
	 * @property {string} district
	 * @property {any} [payload]
	 */

	/**
	 * @typedef {Object} NormalizedStateSnapshot
	 * @property {Array<any>} party
	 * @property {Record<string, any>} inventory
	 * @property {number} gold
	 * @property {Array<any>} quests
	 * @property {Record<string, any>} flags
	 * @property {string} activeDistrict
	 */

	let activeDistrict = "TITLE";
	let eventBusRef = null;
	let sessionStoreRef = null;
	/** @type {HostDistrictHandlers} */
	let hostDistrictHandlers = {};

	const DISTRICT_VIEWS = [
		"overworld-view",
		"combat-view",
		"dialogue-view",
		"status-view",
		"armory-view",
		"progression-view",
		"market-view",
		"chronicle-view",
		"relic-forge-view",
		"lockpick-view",
		"auditor-view",
		"settings-view",
		"title-view",
		"game-over-view",
	];

	/**
	 * Removes hidden CSS class from target DOM element.
	 * State-mutating DOM procedure.
	 *
	 * @param {string} id - Target DOM element identifier.
	 * @returns {void}
	 */
	function showElement(id) {
		if (typeof document === "undefined") return;
		const el = document.getElementById(id);
		if (el) el.classList.remove("hidden");
	}

	/**
	 * Adds hidden CSS class to target DOM element.
	 * State-mutating DOM procedure.
	 *
	 * @param {string} id - Target DOM element identifier.
	 * @returns {void}
	 */
	function hideElement(id) {
		if (typeof document === "undefined") return;
		const el = document.getElementById(id);
		if (el) el.classList.add("hidden");
	}
	//#endregion

	//#region [SEC-02] Viewport Topology & Lighting Coordination
	/**
	 * Synchronizes lighting engine and overworld state with active district mode.
	 * State-mutating procedure.
	 *
	 * @param {string} district - Normalized district identifier.
	 * @returns {void}
	 */
	function updateDistrictLighting(district) {
		if (
			district !== "OVERWORLD" &&
			typeof EmberlightOverworld !== "undefined" &&
			typeof EmberlightOverworld.pause === "function"
		) {
			EmberlightOverworld.pause();
		}

		let lightsDriver = null;
		if (typeof EmberlightDynamicLights !== "undefined") {
			lightsDriver = EmberlightDynamicLights;
		} else if (typeof EmberlightOverworldLighting !== "undefined") {
			lightsDriver = EmberlightOverworldLighting;
		}

		if (
			district === "OVERWORLD" &&
			typeof lightsDriver?.resume === "function"
		) {
			lightsDriver.resume();
		} else if (typeof lightsDriver?.pause === "function") {
			lightsDriver.pause();
		}
	}

	/**
	 * Applies DOM and layout viewport configuration for COMBAT district.
	 * State-mutating DOM procedure.
	 *
	 * @returns {void}
	 */
	function applyCombatViewport() {
		const matrix = document.getElementById("war-table-matrix");
		const rig = document.getElementById("expedition-rig");
		if (matrix) {
			matrix.classList.remove("q2-immersion-deck", "q4-expanded-deck", "navigation-suspended");
			matrix.classList.add("combat-active-matrix");
		}
		if (rig) {
			rig.classList.remove("q2-immersion-deck", "q4-expanded-deck", "navigation-suspended");
			rig.classList.add("combat-active-matrix");
		}
		hideElement("district-nav");
		hideElement("party-hud-panel");
		hideElement("district-mount-container");
		hideElement("exploration-pouch-drawer");
		showElement("combat-command-view");
		showElement("combat-spatial-view");
		showElement("combat-arena-view");
		showElement("combat-oracle-view");

		const q1Tag = document.getElementById("q1-pane-tag");
		if (q1Tag) q1Tag.textContent = "⚔️ Formations";
		const q2Tag = document.getElementById("q2-pane-tag");
		if (q2Tag) q2Tag.textContent = "Clash Arena";
		const q4Title = document.getElementById("q4-pane-title");
		const q4Tag = document.getElementById("q4-pane-tag");
		if (q4Title) q4Title.textContent = "🎯 Q4: ACTION & COMMAND DECK";
		if (q4Tag) q4Tag.textContent = "Orders Active";
	}

	/**
	 * Applies DOM and layout viewport configuration for OVERWORLD district.
	 * State-mutating DOM procedure.
	 *
	 * @returns {void}
	 */
	function applyOverworldViewport() {
		const matrix = document.getElementById("war-table-matrix");
		if (matrix) {
			matrix.classList.remove("minimalist-travel-mode", "combat-active-matrix");
		}
		const rig = document.getElementById("expedition-rig");
		if (rig) {
			rig.classList.remove("minimalist-travel-mode", "navigation-suspended", "combat-active-matrix");
		}
		showElement("party-hud-panel");
		hideElement("district-mount-container");
		hideElement("combat-command-view");
		const subDeck = document.getElementById("command-sub-deck");
		if (subDeck) subDeck.innerHTML = "";
		const q1Tag = document.getElementById("q1-pane-tag");
		if (q1Tag) q1Tag.textContent = "[WASD] Step";
		const q2Tag = document.getElementById("q2-pane-tag");
		if (q2Tag) q2Tag.textContent = "Acoustic Frustum";
		const q4Title = document.getElementById("q4-pane-title");
		const q4Tag = document.getElementById("q4-pane-tag");
		if (q4Title) q4Title.textContent = "🛡️ Q4: PARTY READINESS DECK";
		if (q4Tag) q4Tag.textContent = "4 Active";
		if (
			typeof EmberlightDynamicLights !== "undefined" &&
			typeof EmberlightDynamicLights.resize === "function"
		) {
			EmberlightDynamicLights.resize();
		}
		if (
			typeof EmberlightMapRenderer !== "undefined" &&
			typeof EmberlightMapRenderer.resize === "function"
		) {
			EmberlightMapRenderer.resize();
		}
	}

	/**
	 * Applies DOM and layout viewport configuration for modal sub-districts.
	 * State-mutating DOM procedure.
	 *
	 * @param {string} district - Normalized district token.
	 * @param {string} activeViewId - Active view DOM identifier.
	 * @returns {void}
	 */
	function applyModalDistrictViewport(district, activeViewId) {
		const matrix = document.getElementById("war-table-matrix");
		const rig = document.getElementById("expedition-rig");
		if (matrix) matrix.classList.remove("q2-immersion-deck");
		if (rig) {
			rig.classList.remove("q2-immersion-deck");
			rig.classList.add("navigation-suspended");
		}
		hideElement("party-hud-panel");
		showElement("district-mount-container");
		const q1Tag = document.getElementById("q1-pane-tag");
		if (q1Tag) {
			q1Tag.innerHTML = '<span style="color:var(--danger); font-weight:bold;">🔒 NAV LOCKED</span> <span style="color:var(--ember)">[ESC]</span>';
		}
		const q2Tag = document.getElementById("q2-pane-tag");
		if (q2Tag) {
			q2Tag.innerHTML = '<span style="color:var(--text-dim)">🔒 STANDBY</span>';
		}
		const q4Title = document.getElementById("q4-pane-title");
		const q4Tag = document.getElementById("q4-pane-tag");
		if (q4Title) q4Title.textContent = `📋 Q4: ${district} DISTRICT`;
		if (q4Tag) q4Tag.innerHTML = '<span style="color:var(--ember); font-weight:bold;">[ESC] Return to Move</span>';

		DISTRICT_VIEWS.forEach((id) => {
			if (id === activeViewId) {
				showElement(id);
			} else if (
				id !== "overworld-view" &&
				id !== "combat-view" &&
				id !== "dialogue-view"
			) {
				hideElement(id);
			}
		});
	}

	/**
	 * Synchronizes DOM view elements, Quadrant 4 headers, and War Table Matrix visibility.
	 * State-mutating DOM procedure.
	 *
	 * @param {string} district - Normalized district identifier.
	 * @param {string} activeViewId - Active view DOM identifier.
	 * @returns {void}
	 */
	function updateDistrictViewVisibility(district, activeViewId) {
		if (typeof document === "undefined") return;

		if (district !== "DIALOGUE") {
			hideElement("dialogue-view");
		}

		const cockpit = document.getElementById("game-cockpit");
		if (district === "TITLE") {
			if (cockpit) cockpit.classList.add("title-mode");
			hideElement("war-table-matrix");
			hideElement("district-nav");
			hideElement("game-over-view");
			showElement("title-view");
			return;
		}

		if (cockpit) cockpit.classList.remove("title-mode");
		hideElement("title-view");
		hideElement("game-over-view");
		showElement("war-table-matrix");

		if (district === "COMBAT") {
			applyCombatViewport();
			return;
		}

		showElement("district-nav");

		if (district === "OVERWORLD") {
			applyOverworldViewport();
		} else if (district === "DIALOGUE") {
			showElement("dialogue-view");
		} else {
			applyModalDistrictViewport(district, activeViewId);
		}
	}
	//#endregion

	//#region [SEC-03] Handler Registration & Escape Routing
	/**
	 * Registers custom host district navigation handlers.
	 * State-mutating procedure.
	 *
	 * @param {HostDistrictHandlers} handlers - Host handler map.
	 * @returns {void}
	 */
	function registerHandlers(handlers) {
		if (handlers && typeof handlers === "object") {
			hostDistrictHandlers = { ...handlers };
		}
	}

	/**
	 * Coordinates escape / cancel hotkey routing across modals and expanded viewports.
	 * State-mutating procedure.
	 *
	 * @param {HostExecutionContext} [context={}] - Active host runtime execution context.
	 * @returns {void}
	 */
	function handleCancelAction(context = {}) {
		const modalDistricts = [
			"ARMORY",
			"PROGRESSION",
			"STATUS",
			"MARKET",
			"CHRONICLE",
			"AUDITOR",
			"RELIC_FORGE",
			"LOCKPICK",
			"SETTINGS",
		];

		if (modalDistricts.includes(activeDistrict)) {
			if (typeof context.resumeOverworld === "function") {
				context.resumeOverworld();
			}
		} else if (context.isQ4DeckExpanded) {
			if (typeof context.toggleQ4DeckExpansion === "function") {
				context.toggleQ4DeckExpansion(false);
			}
		} else if (context.is3DViewExpanded) {
			if (typeof context.toggle3DViewportExpansion === "function") {
				context.toggle3DViewportExpansion(false);
			}
		}
	}

	/**
	 * Normalizes arbitrary district strings or aliases into uppercase canonical tokens.
	 * Pure string normalization procedure.
	 *
	 * @param {string} [d] - Raw district name or shortcut.
	 * @returns {string} Canonical uppercase district name.
	 */
	function normalizeDistrictName(d) {
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
	}
	//#endregion

	//#region [SEC-04] District Switching & Tenant Lifecycle Pipeline
	/**
	 * Updates the active tab visual styling in the subnav bar.
	 * State-mutating DOM procedure.
	 *
	 * @param {string} district - Normalized target district token.
	 * @returns {void}
	 */
	function updateSubnavActiveTab(district) {
		if (typeof document === "undefined") return;
		const subnavTabs = document.querySelectorAll(".subnav-tab");
		subnavTabs.forEach((tab) => {
			const element = /** @type {HTMLElement} */ (tab);
			const tabNav = normalizeDistrictName(element.dataset.nav || "");
			element.classList.toggle("active", tabNav === district);
		});
	}

	/**
	 * Resolves and normalizes snapshot state from override or host session store.
	 * Pure state resolution procedure.
	 *
	 * @param {string} district - Active district identifier.
	 * @param {Partial<NormalizedStateSnapshot>} [snapshot] - Optional snapshot override.
	 * @returns {{ rawSnapshot: any, normalized: NormalizedStateSnapshot }}
	 */
	function resolveNormalizedSnapshot(district, snapshot) {
		const activeSnapshot =
			snapshot ||
			(sessionStoreRef?.getSnapshot ? sessionStoreRef.getSnapshot() : {});
		const normalized = {
			party:
				activeSnapshot.party ||
				(typeof getParty === "function" ? getParty() : []),
			inventory:
				activeSnapshot.inventory ||
				(typeof getInventory === "function" ? getInventory() : {}),
			gold:
				activeSnapshot.gold || (typeof getGold === "function" ? getGold() : 0),
			quests:
				activeSnapshot.quests ||
				(typeof getQuests === "function" ? getQuests() : []),
			flags: activeSnapshot.flags || {},
			activeDistrict: activeSnapshot.activeDistrict || district,
		};
		return { rawSnapshot: activeSnapshot, normalized };
	}

	/** @type {Record<string, (snapshot: any, ctx: any) => void>} */
	const TENANT_RENDERERS = {
		STATUS(snapshot, ctx) {
			if (typeof EmberlightStatus === "undefined") return;
			if (typeof EmberlightStatus.reset === "function") {
				EmberlightStatus.reset({ party: snapshot.party });
			}
			if (typeof EmberlightStatusRenderer !== "undefined") {
				EmberlightStatus.render(EmberlightStatusRenderer, ctx);
			}
		},
		ARMORY(snapshot, ctx) {
			if (typeof EmberlightArmory === "undefined") return;
			if (typeof EmberlightArmory.reset === "function") {
				EmberlightArmory.reset({
					party: snapshot.party,
					inventory: snapshot.inventory,
					gold: snapshot.gold,
				});
			}
			if (typeof EmberlightArmoryRenderer !== "undefined") {
				EmberlightArmory.render(EmberlightArmoryRenderer, ctx);
			}
		},
		PROGRESSION(snapshot, ctx) {
			if (typeof EmberlightProgression === "undefined") return;
			if (typeof EmberlightProgression.reset === "function") {
				EmberlightProgression.reset({ party: snapshot.party });
			}
			if (typeof EmberlightProgressionRenderer !== "undefined") {
				EmberlightProgression.render(EmberlightProgressionRenderer, ctx);
			}
		},
		MARKET(snapshot, ctx) {
			if (typeof EmberlightMarket === "undefined") return;
			if (typeof EmberlightMarket.reset === "function") {
				EmberlightMarket.reset({
					party: snapshot.party,
					gold: snapshot.gold,
					inventory: snapshot.inventory,
				});
			}
			if (typeof EmberlightMarketRenderer !== "undefined") {
				EmberlightMarket.render(EmberlightMarketRenderer, ctx);
			}
		},
		CHRONICLE(snapshot, ctx) {
			if (typeof EmberlightChronicle === "undefined") return;
			if (typeof EmberlightChronicle.reset === "function") {
				EmberlightChronicle.reset({
					quests: snapshot.quests,
					flags: snapshot.flags,
				});
			}
			if (typeof EmberlightChronicleRenderer !== "undefined") {
				EmberlightChronicle.render(EmberlightChronicleRenderer, ctx);
			}
		},
		RELIC_FORGE(snapshot, ctx) {
			if (typeof EmberlightRelicForge === "undefined") return;
			if (typeof EmberlightRelicForge.reset === "function") {
				EmberlightRelicForge.reset({
					party: snapshot.party,
					gold: snapshot.gold,
					inventory: snapshot.inventory,
				});
			}
			if (typeof EmberlightRelicForgeRenderer !== "undefined") {
				EmberlightRelicForge.render(EmberlightRelicForgeRenderer, ctx);
			}
		},
		AUDITOR(snapshot) {
			if (typeof EmberlightAuditor === "undefined") return;
			if (typeof EmberlightAuditor.reset === "function") {
				EmberlightAuditor.reset({ snapshot });
			}
			if (typeof EmberlightAuditor.render === "function") {
				EmberlightAuditor.render();
			}
		},
		SETTINGS() {
			if (typeof EmberlightSettings === "undefined") return;
			if (typeof EmberlightSettings.reset === "function") {
				EmberlightSettings.reset({});
			}
			if (typeof EmberlightSettings.render === "function") {
				EmberlightSettings.render();
			}
		},
		LOCKPICK() {
			if (typeof EmberlightLockpick === "undefined") return;
			if (typeof EmberlightLockpick.reset === "function") {
				EmberlightLockpick.reset({ lockLevel: 1 });
			}
			if (typeof EmberlightLockpick.render === "function") {
				EmberlightLockpick.render();
			}
		},
	};

	/**
	 * Dispatches tenant state reset and render invocation for active district.
	 * State-mutating tenant lifecycle delegate.
	 *
	 * @param {string} district - Target district token.
	 * @param {any} activeSnapshot - Active snapshot object.
	 * @param {any} hostContext - Standard host execution context.
	 * @returns {void}
	 */
	function dispatchTenantRender(district, activeSnapshot, hostContext) {
		const renderer = TENANT_RENDERERS[district];
		if (renderer) {
			renderer(activeSnapshot, hostContext);
		}
	}

	/**
	 * Updates cockpit HUD components with current active snapshot data.
	 * State-mutating peripheral projection delegate.
	 *
	 * @param {any} activeSnapshot - Active state snapshot.
	 * @returns {void}
	 */
	function updateCockpitHUD(activeSnapshot) {
		if (typeof EmberlightCockpitRenderer !== "undefined") {
			if (typeof EmberlightCockpitRenderer.renderMiniHUD === "function") {
				EmberlightCockpitRenderer.renderMiniHUD(activeSnapshot);
			}
			if (typeof EmberlightCockpitRenderer.updateQuestTicker === "function") {
				EmberlightCockpitRenderer.updateQuestTicker(activeSnapshot);
			}
		}
	}

	/**
	 * Executes full district switching sequence: input purge, visibility update, and tenant render delegation.
	 * State-mutating navigation procedure.
	 *
	 * @param {string} rawDistrict - Target district name.
	 * @param {string} [activeViewId] - Optional specific DOM view identifier.
	 * @param {Partial<NormalizedStateSnapshot>} [snapshot] - Optional state snapshot override.
	 * @returns {void}
	 */
	function switchDistrict(rawDistrict, activeViewId, snapshot) {
		const district = normalizeDistrictName(rawDistrict);
		activeDistrict = district;

		const viewId =
			typeof activeViewId === "string" && activeViewId.length > 0
				? activeViewId
				: `${district.toLowerCase().replace("_", "-")}-view`;

		if (
			typeof EmberlightInput !== "undefined" &&
			typeof EmberlightInput.clear === "function"
		) {
			EmberlightInput.clear();
		}

		updateDistrictLighting(district);
		updateDistrictViewVisibility(district, viewId);
		updateSubnavActiveTab(district);

		const { rawSnapshot, normalized } = resolveNormalizedSnapshot(
			district,
			snapshot,
		);
		const hostContext = {
			eventBus: eventBusRef,
			store: sessionStoreRef,
			runtime: EmberlightDistrictRouter,
			snapshot: normalized,
		};

		dispatchTenantRender(district, rawSnapshot, hostContext);
		updateCockpitHUD(rawSnapshot);
	}

	/**
	 * Mounts target district and publishes district:mounted event envelope.
	 * State-mutating procedure.
	 *
	 * @param {string} district - Target district name.
	 * @param {any} [payload] - Optional navigation payload data.
	 * @param {HostExecutionContext} [context] - Optional navigation context.
	 * @returns {void}
	 */
	function mountDistrict(district, payload, context) {
		if (activeDistrict === "COMBAT" || activeDistrict === "GAME_OVER") return;

		const handler =
			context?.handlers?.[district] || hostDistrictHandlers[district];
		if (typeof handler === "function") {
			handler(payload);
		} else {
			switchDistrict(
				district,
				`${district.toLowerCase()}-view`,
				context?.snapshot,
			);
		}

		updateSubnavActiveTab(district);

		if (eventBusRef && typeof eventBusRef.publish === "function") {
			eventBusRef.publish("district:mounted", { district, payload });
		}
	}
	//#endregion

	return {
		//#region [SEC-05] Host Subsystem Interface Gateway
		/**
		 * Initializes district router with host event bus, store, and handler bindings.
		 * State-mutating lifecycle gateway.
		 *
		 * @param {HostInitContext} [context] - Host initialization context.
		 * @returns {void}
		 */
		init(context) {
			if (context?.eventBus) {
				eventBusRef = context.eventBus;
			}
			if (context?.sessionStore) {
				sessionStoreRef = context.sessionStore;
			}
			if (context?.handlers) {
				registerHandlers(context.handlers);
			}

			// Persistent delegation for Q4 sub-nav dock
			if (typeof document !== "undefined") {
				const subNavDock = document.getElementById("q4-sub-nav");
				if (subNavDock && !(/** @type {any} */ (subNavDock)._isDelegated)) {
					subNavDock.addEventListener("click", (e) => {
						const target = /** @type {HTMLElement} */ (e.target);
						const tab = target?.closest(".subnav-tab");
						if (!tab) return;
						const rawNav = /** @type {HTMLElement} */ (tab).dataset.nav;
						if (!rawNav) return;

						if (rawNav === "POUCH") {
							if (typeof hostDistrictHandlers.togglePouch === "function") {
								hostDistrictHandlers.togglePouch();
							} else if (typeof GameRuntime !== "undefined") {
								GameRuntime.handleInputAction("MENU_POUCH");
							}
							return;
						}

						const targetNav = normalizeDistrictName(rawNav);
						if (typeof hostDistrictHandlers.switchDistrict === "function") {
							hostDistrictHandlers.switchDistrict(targetNav);
						} else if (
							typeof GameRuntime !== "undefined" &&
							typeof GameRuntime.switchDistrict === "function"
						) {
							GameRuntime.switchDistrict(targetNav);
						} else {
							switchDistrict(targetNav);
						}
					});
					/** @type {any} */ (subNavDock)._isDelegated = true;
				}
			}
		},

		DISTRICT_VIEWS,
		registerHandlers,
		switchDistrict,
		mountDistrict,
		handleCancelAction,

		/**
		 * Pure query returning current active district token.
		 *
		 * @returns {string} Current active district token.
		 */
		getActiveDistrict() {
			return activeDistrict;
		},

		/**
		 * Explicitly updates active district token.
		 * State-mutating procedure.
		 *
		 * @param {string} d - Target district token.
		 * @returns {void}
		 */
		setActiveDistrict(d) {
			activeDistrict = d;
		},

		/**
		 * Telemetry diagnostic probe for district router.
		 * Pure diagnostics query.
		 *
		 * @returns {DistrictRouterDiagnostics}
		 */
		getDiagnostics() {
			return {
				driverId: "district_router",
				activeDistrict,
				registeredViews: DISTRICT_VIEWS.length,
				registeredHandlersCount: Object.keys(hostDistrictHandlers).length,
			};
		},

		/**
		 * Tears down router references and resets to TITLE district.
		 * State-mutating teardown procedure.
		 *
		 * @returns {void}
		 */
		destroy() {
			eventBusRef = null;
			sessionStoreRef = null;
			hostDistrictHandlers = {};
			activeDistrict = "TITLE";
		},
		//#endregion
	};
})();

//#region [SEC-06] Global Export & Dual-Binding
if (typeof window !== "undefined") {
	window.EmberlightDistrictRouter = EmberlightDistrictRouter;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightDistrictRouter;
}
//#endregion
