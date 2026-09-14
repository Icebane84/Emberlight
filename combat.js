/* cSpell:words VSRP UNCONFIGURED SSOT */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMBAT SIMULATION CORE (VSRP-001 FACADE)
 * Document Identifier: VSRP-001-COMBAT-FACADE
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-COMBAT-002
 * Authority:           Ephemeral Simulation Tenant
 * Timestamp:           2026-09-13T21:50:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * This file is a thin facade. It ingests all 8 sub-module namespace keys
 * from the VSRP-001 staging membrane (window._CombatInternal), purges
 * the membrane, and exports the canonical VSRP-001 EmberlightCombat object.
 *
 * Sub-module load order (must precede this file in index.html / load_order.js):
 *   combat/combat_state.js
 *   combat/combat_calc.js
 *   combat/combat_displacement.js
 *   combat/combat_queue.js
 *   combat/combat_ai.js
 *   combat/combat_actions.js
 *   combat/combat_projection.js
 *   combat/combat_orchestrator.js
 * ============================================================================
 */

const EmberlightCombat = (() => {
	// Ingest private subsystems from MPFS-001 staging membrane
	const _mem =
		(typeof window !== "undefined" && window._CombatInternal) ||
		(typeof globalThis !== "undefined" && globalThis._CombatInternal) ||
		{};

	const {
		Calc = {},
		Displacement = {},
		Queue = {},
		AI = {},
		State: CombatState = {},
		Actions = {},
		Projection = {},
		Orchestrator = {},
	} = _mem;

	const State = CombatState.State || {
		UNCONFIGURED: "UNCONFIGURED",
		CONFIGURED: "CONFIGURED",
		INITIALIZED: "INITIALIZED",
		READY: "READY",
		RUNNING: "RUNNING",
		DESTROYED: "DESTROYED",
	};

	const deepFreeze = CombatState.deepFreeze || ((obj) => Object.freeze(obj));
	const createDefaultState = CombatState.createDefaultState || (() => ({}));
	const hydratePartySnapshot =
		CombatState.hydratePartySnapshot || ((p) => p || []);
	const checkUnitDefeat = CombatState.checkUnitDefeat || (() => false);
	const finishBattle = CombatState.finishBattle || (() => { });

	/**
	 * Factory producing an isolated, VSRP-001 compliant combat simulation instance.
	 * [State Mutating / Factory Constructor]
	 * @param {Object} [instanceOptions={}] - Configuration options.
	 * @returns {Object} Combat simulation tenant instance.
	 */
	function createInstance(instanceOptions = {}) {
		const isHeadless = Boolean(instanceOptions.isHeadless);
		const autoRun =
			instanceOptions.autoRun !== undefined
				? Boolean(instanceOptions.autoRun)
				: isHeadless;
		let lifecycleState = State.UNCONFIGURED;

		/** @type {any} */
		let hostConfig = null;
		/** @type {any} */
		let hostContext = null;
		/** @type {any} */
		let capabilities = null;
		/** @type {any} */
		let sim = null;
		/** @type {Array<{ fn: function():void, remainingMs: number }>} */
		let scheduledTasks = [];
		/** @type {Array<function():void>} */
		let headlessEventQueue = [];
		/** @type {function():void|null} */
		let intentUnsub = null;
		let lastProcessedIntentId = "";

		function assertLifecycle(...allowed) {
			if (!allowed.includes(lifecycleState)) {
				throw new Error(
					`[VSRP-001:combat_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
					`Required: ${allowed.join(" | ")}`,
				);
			}
		}

		function getActiveManifest() {
			return (
				hostConfig?.manifest ||
				(typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {})
			);
		}

		function publish(eventName, payload) {
			if (isHeadless) return;
			if (capabilities?.publishCombatEvent) {
				capabilities.publishCombatEvent(eventName, payload);
			} else if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish(eventName, payload);
			}
		}

		function dispatchSFX(sfxName) {
			publish("combat:sfx", { sfx: sfxName });
		}

		function getRandomFloat() {
			if (!sim) return 0.5;
			if (typeof EmberlightPRNG !== "undefined" && EmberlightPRNG.create) {
				const p = EmberlightPRNG.create(sim.prngState || 1337);
				const val = p.nextFloat();
				sim.prngState = p.getState();
				return val;
			}
			sim.prngState = Math.trunc((sim.prngState || 1337) + 0x6d2b79f5);
			let t = sim.prngState;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		}

		function appendLog(msg, type = "system") {
			if (!sim) return;
			sim.log.push({ msg, type });
			publish("combat:log", { msg, type });
		}

		function schedule(fn, delayMs) {
			if (isHeadless) {
				headlessEventQueue.push(fn);
			} else {
				scheduledTasks.push({ fn, remainingMs: delayMs });
			}
		}

		function triggerAttackerLunge(isParty, index) {
			publish("combat:animation", {
				animation: "LUNGE",
				targetType: isParty ? "party" : "enemy",
				targetIndex: index,
				duration: 380,
			});
		}

		function triggerChannelingSurge(index) {
			publish("combat:animation", {
				animation: "CHANNEL",
				targetType: "party",
				targetIndex: index,
				duration: 650,
			});
		}

		function triggerDisplacementVisual(side, index, displacementType) {
			publish("combat:animation", {
				animation: displacementType,
				targetType: side,
				targetIndex: index,
				duration: 450,
			});
		}

		function renderPresentation() {
			if (!sim || isHeadless) return;
			const activeRenderer =
				hostContext?.combatRenderer ||
				(typeof EmberlightCombatRenderer !== "undefined"
					? EmberlightCombatRenderer
					: null);
			if (activeRenderer?.render) {
				activeRenderer.render(structuredClone(sim), (act) =>
					Actions.handleViewAction(sim, act, getHelpers()),
				);
			}
		}

		function checkBattleEnd() {
			if (!sim) return true;
			return CombatState.checkBattleEnd(sim, {
				dispatchSFX,
				appendLog,
				hostContext,
				renderPresentation,
				finishBattle: (outcome) => finishBattle(sim, outcome, hostContext),
				isHeadless,
				autoRun,
				schedule,
				getActiveManifest,
			});
		}

		function renderHarmonicChannelingStage(node, onComplete) {
			const channelerDriver =
				hostContext?.combatRenderer?.startHarmonicChanneling;
			if (typeof channelerDriver !== "function") {
				onComplete(0);
				return;
			}
			channelerDriver(node, onComplete);
		}

		function getHelpers() {
			return {
				Calc,
				Displacement,
				Queue,
				AI,
				triggerAttackerLunge,
				triggerChannelingSurge,
				triggerDisplacementVisual,
				dispatchSFX,
				appendLog,
				getRandomFloat,
				publish,
				hostContext,
				checkUnitDefeat: (t) => checkUnitDefeat(t, appendLog),
				checkBattleEnd,
				renderPresentation,
				schedule,
				stepTurn: () => Orchestrator.stepTurn(sim, getHelpers()),
				finishBattle: (s, outcome) => finishBattle(s, outcome, hostContext),
				getActiveManifest,
				isHeadless,
				autoRun,
				playerExecuteAttack: (idx) =>
					Actions.playerExecuteAttack(sim, idx, getHelpers()),
				renderHarmonicChannelingStage,
				getLastProcessedIntentId: () => lastProcessedIntentId,
				setLastProcessedIntentId: (id) => {
					lastProcessedIntentId = id;
				},
			};
		}

		return {
			configure(cfg) {
				assertLifecycle(State.UNCONFIGURED);
				hostConfig = deepFreeze({ ...cfg });
				lifecycleState = State.CONFIGURED;
			},

			init(context) {
				assertLifecycle(State.CONFIGURED);
				hostContext = context;

				// SDCP-001 Attenuated Capability Membrane setup
				if (context?.capabilities) {
					capabilities = context.capabilities;
				} else {
					capabilities = {
						publishCombatEvent: (event, payload) =>
							hostContext?.eventBus?.publish?.(event, payload),
						subscribeCombatIntent: (handler) =>
							hostContext?.eventBus?.subscribe?.(
								"combat:intent_action",
								handler,
							),
					};
				}

				if (intentUnsub) {
					intentUnsub();
					intentUnsub = null;
				}

				if (capabilities.subscribeCombatIntent) {
					intentUnsub = capabilities.subscribeCombatIntent((payload) => {
						Actions.handleViewAction(sim, payload, getHelpers());
					});
				}

				lifecycleState = State.INITIALIZED;
			},

			reset(snapshot) {
				assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
				scheduledTasks = [];
				headlessEventQueue = [];
				sim = createDefaultState();

				if (snapshot) {
					if (snapshot.seed !== undefined || snapshot.prngState !== undefined) {
						sim.prngState =
							snapshot.seed !== undefined ? snapshot.seed : snapshot.prngState;
					}
					sim.encounterKey = snapshot.encounterKey || "DEFAULT";
					sim.terrain = snapshot.terrain || "PATH";
					sim.roundCount = 0;
					sim.party = hydratePartySnapshot(snapshot.party || []);

					if (!sim.party.some((c) => c.alive) && sim.party.length > 0) {
						sim.party.forEach((c) => {
							c.alive = true;
							c.hp = c.maxHp || 30;
						});
					}

					sim.gold = typeof snapshot.gold === "number" ? snapshot.gold : 0;
					sim.inventory = structuredClone(snapshot.inventory || {});
					sim.enemies = AI.spawnEnemies(sim.encounterKey, getActiveManifest());
				}

				appendLog("Battle commenced!", "ember");

				if (sim.enemies.some((e) => e.isBoss)) {
					publish("combat:banner", {
						text: "⚔️ BOSS ENCOUNTER ⚔️",
						subtext: "Malakor descends from the catacomb ashes!",
						color: "#ff9d4d",
						duration: 2.0,
					});
				}

				Queue.buildTurnQueue(sim, appendLog, dispatchSFX);
				lifecycleState = State.READY;

				const shouldAutoRun =
					autoRun &&
					(instanceOptions.autoRun === true ||
						sim.encounterKey !== "BOSS_MALAKOR");
				if (shouldAutoRun) {
					Orchestrator.runHeadlessLoop(sim, headlessEventQueue, getHelpers());
				} else {
					Orchestrator.stepTurn(sim, getHelpers());
				}
			},

			update(dt, context) {
				assertLifecycle(State.READY, State.RUNNING);
				lifecycleState = State.RUNNING;
				Orchestrator.advanceScheduledTasks(scheduledTasks, dt);

				const actions = context?.inputs;
				if (Array.isArray(actions)) {
					for (const action of actions) {
						const actObj =
							typeof action === "string" ? { type: action } : action;
						const type = actObj.type;
						if (type === "ATTACK" && typeof actObj.targetIndex === "number") {
							Actions.playerExecuteAttack(
								sim,
								actObj.targetIndex,
								getHelpers(),
							);
						} else if (type === "GUARD") {
							Actions.playerExecuteGuard(sim, getHelpers());
						} else if (type === "SKILL" && actObj.skillNode) {
							Actions.playerExecuteSkill(
								sim,
								actObj.skillNode,
								actObj.targetIndex || 0,
								false,
								getHelpers(),
							);
						}
					}
				}
			},

			handleHostAction(action) {
				if (!sim) return;
				const actObj = typeof action === "string" ? { type: action } : action;
				const act = actObj.type;
				if (!act) return;

				if (act.startsWith("CHOICE_")) {
					const num = Number.parseInt(act.replace("CHOICE_", ""), 10);
					if (num >= 1 && num <= 4) {
						Actions.handleChoiceIndex(sim, num, getHelpers());
						return;
					}
				}

				if (
					act === "UP" ||
					act === "DOWN" ||
					act === "LEFT" ||
					act === "RIGHT"
				) {
					Actions.handleDirectionalNav(sim, act, getHelpers());
					return;
				}

				if (act === "SKILL") {
					const skill = actObj.skillNode ?? actObj.skill ?? sim.pendingSkill;
					if (skill) {
						const targetIdx =
							typeof actObj.targetIndex === "number" ? actObj.targetIndex : 0;
						const isAlly = Boolean(actObj.isAlly);
						Actions.playerExecuteSkill(
							sim,
							skill,
							targetIdx,
							isAlly,
							getHelpers(),
						);
						return;
					}
				}

				if (act === "ATTACK" && typeof actObj.targetIndex === "number") {
					Actions.playerExecuteAttack(sim, actObj.targetIndex, getHelpers());
					return;
				}
				if (act === "GUARD") {
					Actions.playerExecuteGuard(sim, getHelpers());
					return;
				}
				if (act === "CONFIRM") {
					Actions.handleConfirmChoice(sim, getHelpers());
					return;
				}
				if (act === "CANCEL") {
					Actions.handleCancelChoice(sim, getHelpers());
					return;
				}
				if (act === "FLEE") {
					Actions.handleViewAction(sim, { type: "FLEE" }, getHelpers());
					return;
				}
				Actions.handleViewAction(sim, actObj, getHelpers());
			},

			render(renderer, context) {
				assertLifecycle(State.READY, State.RUNNING);
				const activeRenderer = renderer || hostContext?.combatRenderer || null;
				if (!activeRenderer) return;

				const snapshot = context || structuredClone(sim);
				const projection = Projection.createProjection(snapshot);

				if (typeof activeRenderer.renderWarTable === "function") {
					activeRenderer.renderWarTable(projection, (act) =>
						Actions.handleViewAction(sim, act, getHelpers()),
					);
				} else if (typeof activeRenderer.render === "function") {
					activeRenderer.render(snapshot, (act) =>
						Actions.handleViewAction(sim, act, getHelpers()),
					);
				}
			},

			getState() {
				assertLifecycle(State.READY, State.RUNNING);
				return structuredClone(sim);
			},

			getDiagnostics() {
				return {
					moduleId: "combat_core",
					lifecycleState,
					phase: sim?.phase,
					turnIndex: sim?.activeTurnIndex,
					livingParty: sim?.party?.filter((c) => c.alive).length || 0,
					livingEnemies: sim?.enemies?.filter((e) => e.alive).length || 0,
					isHeadless,
				};
			},

			getModuleInfo() {
				return {
					moduleId: "combat_core",
					version: "3.0.0",
					protocolVersion: "VSRP-001",
					dependencies: ["manifest"],
					capabilities: [
						"turn_stepping",
						"boss_phases",
						"aoe_attacks",
						"status_ailments",
						"headless_factory",
					],
				};
			},

			destroy() {
				if (intentUnsub) {
					intentUnsub();
					intentUnsub = null;
				}
				scheduledTasks = [];
				headlessEventQueue = [];
				sim = null;
				hostConfig = null;
				hostContext = null;
				capabilities = null;
				lifecycleState = State.DESTROYED;
			},
		};
	}

	const defaultInstance = createInstance({ isHeadless: false });
	defaultInstance.createInstance = createInstance;
	return defaultInstance;
})();

// Faraday Staging Purge & Global Attachment
if (typeof window !== "undefined") {
	delete window._CombatInternal;
	window.EmberlightCombat = EmberlightCombat;
}
if (typeof globalThis !== "undefined" && globalThis._CombatInternal) {
	delete globalThis._CombatInternal;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightCombat;
}
