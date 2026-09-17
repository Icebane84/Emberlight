/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME EVENTS & BOOTSTRAP SUBSYSTEM
 * Document Identifier: VSRP-001-RUNTIME-EVENTS
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host Subsystem Resolver, Capability Registrar & Event Subscriptions
 * ============================================================================
 */

if (typeof window !== "undefined") {
	window._RuntimeInternal = window._RuntimeInternal || {};
}

(() => {
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
	 * @param {string} name
	 * @returns {any}
	 */
	function resolveGlobalSubsystem(name) {
		try {
			if (typeof globalThis !== "undefined" && (/** @type {Record<string, any>} */ (globalThis))[name]) {
				return (/** @type {Record<string, any>} */ (globalThis))[name];
			}
			if (typeof window !== "undefined" && (/** @type {Record<string, any>} */ (window))[name]) {
				return (/** @type {Record<string, any>} */ (window))[name];
			}
		} catch {
			// Non-fatal fallback
		}
		return null;
	}

	/**
	 * Creates an SDCP-001 attenuated capability context for a specific subsystem.
	 * @param {string} name
	 * @param {any} rawContext
	 * @returns {any}
	 */
	function createAttenuatedContext(name, rawContext) {
		if (!rawContext) return rawContext;
		const tenantKey = name.replace(/^Emberlight/, "").toLowerCase();
		const attenuatedBus = {
			publish: (/** @type {string} */ channel, /** @type {any} */ payload) => {
				if (rawContext.eventBus && typeof rawContext.eventBus.publish === "function") {
					rawContext.eventBus.publish(channel, payload);
				}
			},
			subscribe: (/** @type {string} */ channel, /** @type {any} */ callback) => {
				if (rawContext.eventBus && typeof rawContext.eventBus.subscribe === "function") {
					return rawContext.eventBus.subscribe(channel, callback);
				}
				return () => {};
			},
			unsubscribe: (/** @type {string} */ channel, /** @type {any} */ callback) => {
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
	}

	/**
	 * Configures and initializes a peripheral or simulation subsystem.
	 * @param {string} name
	 * @param {any} sub
	 * @param {Object} hostConfig
	 * @param {any} hostContext
	 * @returns {void}
	 */
	function initializeSubsystem(name, sub, hostConfig, hostContext) {
		if (!sub) return;
		try {
			const diag = typeof sub.getDiagnostics === "function" ? sub.getDiagnostics() : null;
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
	}

	/**
	 * Bootstraps all known engine subsystems.
	 * @param {Object} hostConfig
	 * @param {any} hostContext
	 * @param {any} [EventBus]
	 * @returns {void}
	 */
	function bootstrapSubsystems(hostConfig, hostContext, EventBus) {
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
	}

	/**
	 * Registers baseline host capabilities onto the event bus.
	 * @param {any} EventBus
	 * @returns {void}
	 */
	function registerHostCapabilities(EventBus) {
		if (EventBus && typeof EventBus.registerCapability === "function" && !EventBus.isSealed()) {
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
						evaluate: (/** @type {any} */ payload) => {
							if (!payload?.targetCoords || payload.targetCoords.length === 0) {
								return { authorized: false, reason: "EMPTY_PAYLOAD" };
							}
							return { authorized: true, token: tok };
						},
					});
				}
			});
			EventBus.sealCapabilities();
		}
	}

	/**
	 * @param {any} evt
	 * @param {any} deps
	 */
	function handleCombatOutcome(evt, deps) {
		if (evt.outcome === "defeat") {
			deps.notifyStatus?.("The squad collapsed in combat.", "danger");
			deps.publishSfx?.("sfx_defeat");
			deps.switchDistrict?.("GAME_OVER");
			return;
		}
		if (evt.outcome === "escaped") {
			deps.notifyStatus?.("Retreated from the battlefield.", "info");
			deps.switchDistrict?.("OVERWORLD");
			return;
		}
		deps.notifyStatus?.("Victory achieved! Spoils secured.", "success");
		deps.publishSfx?.("sfx_victory");
		deps.switchDistrict?.("OVERWORLD");
	}

	/**
	 * @param {any} evt
	 * @param {any} deps
	 */
	function handleCombatResolved(evt, deps) {
		if (!evt) return;
		const store = deps.store;
		if (evt.party && deps.setParty) deps.setParty(evt.party);
		if (typeof evt.gold === "number") store?.setGold(evt.gold);
		if (evt.inventory && deps.setInventory) deps.setInventory(evt.inventory);
		handleCombatOutcome(evt, deps);
	}

	/**
	 * @param {any} evt
	 * @param {any} deps
	 */
	function handleLockpickResolved(evt, deps) {
		if (!evt) return;
		if (evt.success) {
			if (evt.rewardLoot?.gold && deps.modifyGold) deps.modifyGold(evt.rewardLoot.gold);
			if (evt.rewardLoot?.item && deps.modifyItem) deps.modifyItem(evt.rewardLoot.item, 1);
			if (evt.flagsDelta && deps.setFlag) {
				Object.entries(evt.flagsDelta).forEach(([k, v]) => {
					deps.setFlag(k, v);
				});
			}
			const goldTxt = evt.rewardLoot?.gold ? `${evt.rewardLoot.gold}G` : "";
			const itemTxt = evt.rewardLoot?.item ? ` + ${evt.rewardLoot.item}` : "";
			deps.notifyStatus?.(`Harmonic seal shattered! Claimed: ${goldTxt}${itemTxt}`, "success");
			deps.publishSfx?.("sfx_victory");
		} else {
			deps.notifyStatus?.("Harmonic disruption aborted.", "info");
		}
		deps.switchDistrict?.("OVERWORLD");
	}

	/**
	 * Subscribes the host harness to standard EventBus topics.
	 * @param {any} deps
	 * @returns {void}
	 */
	function bindEventBusSubscriptions(deps) {
		const EventBus = deps.EventBus;
		if (!EventBus || typeof EventBus.subscribe !== "function") return;

		EventBus.subscribe("cockpit:action", (/** @type {any} */ action) => {
			deps.handleCockpitAction?.(action);
		});
		EventBus.subscribe("input:action", (/** @type {any} */ evt) => {
			deps.handleInputAction?.(evt?.action, evt);
		});
		EventBus.subscribe("district:switch_request", (/** @type {any} */ evt) => {
			deps.switchDistrict?.(evt.district, evt.metadata);
		});
		EventBus.subscribe("overworld:encounter", (/** @type {any} */ evt) => {
			deps.startCombat?.(evt?.encounterKey);
		});
		EventBus.subscribe("status:updated", () => {
			deps.renderHUD?.();
		});
		EventBus.subscribe("armory:resolved", () => {
			deps.renderHUD?.();
		});
		EventBus.subscribe("ecology:tile_mutation", (/** @type {any} */ evt) => {
			if (evt?.district && evt?.key) {
				deps.recordTileMutation?.(evt.district, evt.key, evt.mutation);
			}
		});
		EventBus.subscribe("settings:resolved", () => {
			deps.switchDistrict?.("OVERWORLD");
		});
		EventBus.subscribe("auditor:resolved", () => {
			deps.switchDistrict?.("OVERWORLD");
		});
		EventBus.subscribe("system:command", (/** @type {any} */ evt) => {
			deps.handleSystemCommand?.(evt);
		});
		EventBus.subscribe("combat:resolved", (/** @type {any} */ evt) => {
			handleCombatResolved(evt, deps);
		});
		EventBus.subscribe("lockpick:resolved", (/** @type {any} */ evt) => {
			handleLockpickResolved(evt, deps);
		});
	}

	const RuntimeEvents = {
		KNOWN_SUBSYSTEM_NAMES,
		resolveGlobalSubsystem,
		createAttenuatedContext,
		initializeSubsystem,
		bootstrapSubsystems,
		registerHostCapabilities,
		bindEventBusSubscriptions,
	};

	if (typeof window !== "undefined") {
		window._RuntimeInternal = window._RuntimeInternal || {};
		window._RuntimeInternal.Events = RuntimeEvents;
	}

	if (typeof module !== "undefined") {
		module.exports = RuntimeEvents;
	}
})();
