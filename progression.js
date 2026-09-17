/* cSpell:words Respecs Qube VSRP */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROGRESSION & SKILL TREE SYSTEM
 * Document Identifier: VSRP-001-PROGRESSION-CORE
 * Governing Protocol:  VSRP-001 / COMPONENT_PROTOCOL
 * Authority:           Ephemeral Simulation Tenant
 * Timestamp:           2026-09-07T11:20:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Lifecycle State Machine & Authoritative Working Memory
 *   [SEC-03] Manifest Registry Compilation & Stat Calculation Calculus
 *   [SEC-04] Skill Node Unlock Evaluation & Respec Mechanics
 *   [SEC-05] Canonical 9-Method VSRP-001 Lifecycle Gateway & Action Router
 *   [SEC-06] Global Environment & Window Scope Export
 * ============================================================================
 */

const EmberlightProgression = (() => {
	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} StatBlock
	 * @property {number} hp - Hit points current/base.
	 * @property {number} maxHp - Maximum hit points.
	 * @property {number} mp - Mana points current/base.
	 * @property {number} maxMp - Maximum mana points.
	 * @property {number} atk - Attack rating.
	 * @property {number} def - Defense rating.
	 * @property {number} agi - Agility rating.
	 */

	/**
	 * @typedef {Object} SkillNode
	 * @property {string} id - Node identifier token.
	 * @property {string} [branch] - Branch classification.
	 * @property {string} [classKey] - Character archetype class key.
	 * @property {number} [spCost] - Skill point cost.
	 * @property {boolean} [isRoot] - Root node assertion flag.
	 * @property {string[]} [neighbors] - Adjacent node identifiers in Aether graph.
	 * @property {number} [tier] - Legacy tier requirement.
	 * @property {string} [essence] - Essence classification tag.
	 * @property {Record<string, number>} [statDeltas] - Stat bonuses granted.
	 */

	/**
	 * @typedef {Object} CharacterRecord
	 * @property {string} id - Character unique identifier.
	 * @property {string} name - Character display name.
	 * @property {string} phenotype - Character archetype phenotype.
	 * @property {number} level - Progression level.
	 * @property {number} hp - Current hit points.
	 * @property {number} maxHp - Maximum hit points.
	 * @property {number} mp - Current mana points.
	 * @property {number} maxMp - Maximum mana points.
	 * @property {number} [skillPoints] - Available skill points.
	 * @property {number} [unspentSP] - Unspent skill points alias.
	 * @property {string[]} [unlockedNodes] - Unlocked constellation node IDs.
	 * @property {string[]} [unlocked] - Legacy unlocked node IDs.
	 * @property {Record<string, number>} [spent] - Points spent per branch.
	 * @property {Record<string, string>} [equipment] - Equipped item slots.
	 */

	/**
	 * @typedef {Object} ProgressionSimulationState
	 * @property {CharacterRecord[]} party - Active party roster.
	 * @property {string|null} pendingUnlock - Pending unlock token.
	 * @property {string|null} lastUnlockedNodeId - Last unlocked node identifier.
	 * @property {string} selectedEssence - Selected constellation essence filter.
	 * @property {string|null} selectedCharacterId - Selected character identifier.
	 * @property {string|null} selectedNodeId - Selected skill node identifier.
	 */

	/**
	 * @typedef {Object} ProgressionConfig
	 * @property {Record<string, any>} [manifest] - Game data manifest.
	 */

	/**
	 * @typedef {Object} ProgressionDiagnostics
	 * @property {string} moduleId - Module identifier.
	 * @property {string} lifecycleState - Current lifecycle state string.
	 * @property {number} registeredNodeCount - Count of compiled skill nodes.
	 * @property {number} trackedPartyCount - Count of active party characters.
	 */

	/**
	 * @typedef {Object} ProgressionModuleInfo
	 * @property {string} moduleId - Module identifier.
	 * @property {string} version - Module version string.
	 * @property {string} protocolVersion - Governing protocol version.
	 * @property {string[]} dependencies - Module dependencies.
	 * @property {string[]} capabilities - Supported capability tokens.
	 */

	/**
	 * @typedef {Object} HostProgressionAction
	 * @property {'UNLOCK_NODE'|'RESPEC_CHARACTER'|'SELECT_CHARACTER'|'SELECT_ESSENCE'|'SELECT_NODE'} type - Action type token.
	 * @property {string} [characterId] - Target character identifier.
	 * @property {string} [nodeId] - Target skill node identifier.
	 * @property {string} [essence] - Target essence filter.
	 */
	//#endregion

	//#region [SEC-02] Lifecycle State Machine & Authoritative Working Memory
	// --- Formal Lifecycle States ---
	const State = {
		UNCONFIGURED: "UNCONFIGURED",
		CONFIGURED: "CONFIGURED",
		INITIALIZED: "INITIALIZED",
		READY: "READY",
		RUNNING: "RUNNING",
		DESTROYED: "DESTROYED",
	};

	let lifecycleState = State.UNCONFIGURED;

	// --- Host Environment & Locked Configuration ---
	/** @type {ProgressionConfig|null} */
	let hostConfig = null;
	/** @type {Record<string, any>|null} */
	let hostContext = null;
	/** @type {Record<string, SkillNode>} */
	let registry = {};

	// --- Authoritative Working Memory ---
	/** @type {ProgressionSimulationState|null} */
	let sim = null;

	/**
	 * Asserts current module lifecycle state against allowed states.
	 * [State Validation]
	 * @param {...string} allowed - Allowed lifecycle states.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:progression_core] Lifecycle Violation: Invoked while in state "${lifecycleState}". ` +
				`Required: ${allowed.join(" | ")}`,
			);
		}
	}

	/**
	 * Deep freezes an object recursively while preserving functions.
	 * [Pure Utility]
	 * @param {any} obj - Target object to freeze.
	 * @returns {any} Frozen object.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== "object") return obj;
		Object.keys(obj).forEach((prop) => {
			if (typeof obj[prop] === "object" && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
				deepFreeze(obj[prop]);
			}
		});
		return Object.freeze(obj);
	}

	/**
	 * Dispatches progression sound effects over host event bus or audio driver.
	 * [State Mutating / Bus Dispatch]
	 * @param {string} sfxName - Sound effect token.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish("progression:sfx", { sfx: sfxName });
		} else if (typeof window !== 'undefined' && /** @type {any} */ (window).EmberlightAudio && typeof /** @type {any} */ (window).EmberlightAudio.play === "function") {
            /** @type {any} */ (window).EmberlightAudio.play(sfxName);
		}
	}

	/**
	 * Retrieves active game manifest.
	 * [Pure Query]
	 * @returns {Record<string, any>} Manifest object.
	 */
	function getManifest() {
		return hostConfig?.manifest || (typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {});
	}

	/**
	 * Creates default progression simulation state.
	 * [Pure Factory]
	 * @returns {ProgressionSimulationState} Default state structure.
	 */
	function createDefaultState() {
		return {
			party: [],
			pendingUnlock: null,
			lastUnlockedNodeId: null,
			selectedEssence: "ALL",
			selectedCharacterId: null,
			selectedNodeId: null,
		};
	}
	//#endregion

	//#region [SEC-03] Manifest Registry Compilation & Stat Calculation Calculus
	/**
	 * Compiles skill nodes into local immutable registry.
	 * [Pure Transformation]
	 * @param {Record<string, any>} [manifestRef] - Optional external manifest reference.
	 * @returns {Record<string, SkillNode>} Compiled skill node dictionary.
	 */
	function compileRegistry(manifestRef) {
		/** @type {Record<string, SkillNode>} */
		const compiled = {};
		const manifest = manifestRef || getManifest();

		// 1. Ingest Aether Matrix Constellation Nodes
		if (manifest.AetherNodes) {
			Object.entries(manifest.AetherNodes).forEach(([nodeId, rawNode]) => {
				compiled[nodeId] = deepFreeze({ ...(/** @type {any} */ (rawNode)) });
			});
		}

		// 2. Ingest Legacy SkillTrees for complete backward compatibility
		if (manifest.SkillTrees) {
			Object.entries(manifest.SkillTrees).forEach(([classKey, branches]) => {
				Object.entries(branches).forEach(([branchKey, nodes]) => {
					(/** @type {any[]} */ (nodes)).forEach((rawNode) => {
						if (!compiled[rawNode.id]) {
							compiled[rawNode.id] = deepFreeze({
								...rawNode,
								branch: branchKey,
								classKey,
								spCost: rawNode.spCost || 1,
							});
						}
					});
				});
			});
		}

		return compiled;
	}

	/**
	 * Computes full effective character stats from base, constellation nodes, and equipment.
	 * [Pure Calculation]
	 * @param {CharacterRecord} character - Target character record.
	 * @param {Record<string, any>} [manifestRef] - Optional manifest reference.
	 * @returns {StatBlock} Computed stat totals.
	 */
	function computeCharacterStats(character, manifestRef) {
		const manifest = manifestRef || getManifest();
		const pheno = manifest.Phenotypes?.[character?.phenotype] || {};
		const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };
		const growth = pheno.growth || { hp: 4, mp: 2, atk: 1, def: 1, agi: 1 };
		const levelGains = Math.max(0, (character?.level || 1) - 1);

		/** @type {StatBlock & Record<string, number>} */
		const totals = {
			hp: base.hp + growth.hp * levelGains,
			maxHp: base.hp + growth.hp * levelGains,
			mp: base.mp + growth.mp * levelGains,
			maxMp: base.mp + growth.mp * levelGains,
			atk: base.atk + growth.atk * levelGains,
			def: base.def + growth.def * levelGains,
			agi: base.agi + growth.agi * levelGains,
		};

		const graph = registry || manifest.AetherNodes || {};
		const unlocked = character?.unlockedNodes || character?.unlocked || [];
		unlocked.forEach((nodeId) => {
			const node = graph[nodeId];
			if (node?.statDeltas) {
				Object.entries(node.statDeltas).forEach(([stat, val]) => {
					totals[stat] = (totals[stat] || 0) + val;
					if (stat === "hp") totals.maxHp = (totals.maxHp || 0) + val;
					if (stat === "mp") totals.maxMp = (totals.maxMp || 0) + val;
				});
			}
		});

		if (typeof manifest.calculateGearStats === "function") {
			const gear = manifest.calculateGearStats(character);
			totals.hp += gear.hp;
			totals.maxHp += gear.hp;
			totals.mp += gear.mp;
			totals.maxMp += gear.mp;
			totals.atk += gear.atk;
			totals.def += gear.def;
			totals.agi += gear.agi;
		}

		return totals;
	}
	//#endregion

	//#region [SEC-04] Skill Node Unlock Evaluation & Respec Mechanics
	/**
	 * Evaluates whether a character meets requirements to unlock a skill node.
	 * [Pure Query]
	 * @param {CharacterRecord} character - Target character.
	 * @param {SkillNode} node - Target skill node.
	 * @returns {boolean} Unlock eligibility assertion flag.
	 */
	function evaluateCanUnlock(character, node) {
		if (!character || !node) return false;
		const unlockedList = character.unlockedNodes || character.unlocked || [];
		if (unlockedList.includes(node.id)) return false;

		const availableSP = Math.max(character.skillPoints ?? 0, character.unspentSP ?? 0);
		const requiredSP = node.spCost || 1;
		if (availableSP < requiredSP) return false;

		// 1. Root Constellation Node
		if (node.isRoot) return true;

		// 2. Aether Adjacency Graph: Must connect to an already unlocked neighbor
		if (Array.isArray(node.neighbors) && node.neighbors.length > 0) {
			const unlockedSet = new Set(unlockedList);
			return node.neighbors.some((neighborId) => unlockedSet.has(neighborId));
		}

		// 3. Legacy Tier Fallback
		if (node.branch && node.tier) {
			const spent = character?.spent?.[node.branch] || 0;
			return spent >= node.tier - 1;
		}

		return false;
	}

	/**
	 * Executes skill node unlock for a character.
	 * [State Mutating]
	 * @param {CharacterRecord} character - Target character.
	 * @param {string} nodeId - Skill node identifier.
	 * @returns {boolean} Success assertion flag.
	 */
	function executeUnlock(character, nodeId) {
		const node = registry[nodeId];
		const manifest = getManifest();
		if (!node || !evaluateCanUnlock(character, node)) return false;

		const cost = node.spCost || 1;
		character.skillPoints = Math.max(0, (character.skillPoints ?? 0) - cost);
		character.unspentSP = Math.max(0, (character.unspentSP ?? 0) - cost);

		if (!Array.isArray(character.unlockedNodes)) character.unlockedNodes = [];
		if (!character.unlockedNodes.includes(node.id)) character.unlockedNodes.push(node.id);

		if (!Array.isArray(character.unlocked)) character.unlocked = [];
		if (!character.unlocked.includes(node.id)) character.unlocked.push(node.id);

		if (node.branch) {
			if (!character.spent) character.spent = {};
			character.spent[node.branch] = (character.spent[node.branch] || 0) + 1;
		}

		// Recompute effective stats immediately without data loss
		const newStats = computeCharacterStats(character, manifest);
		const hpRatio = character.maxHp ? character.hp / character.maxHp : 1.0;
		const mpRatio = character.maxMp ? character.mp / character.maxMp : 1.0;
		Object.assign(character, newStats);
		character.hp = Math.max(1, Math.min(character.maxHp, Math.round(character.maxHp * hpRatio)));
		character.mp = Math.max(0, Math.min(character.maxMp, Math.round(character.maxMp * mpRatio)));

		dispatchSFX("SELECT");

		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish("progression:node_unlocked", {
				characterId: character.id,
				nodeId: node.id,
				essence: node.essence || node.branch,
				remainingPoints: character.skillPoints ?? character.unspentSP,
			});
		}

		return true;
	}

	/**
	 * Respecs character skill points, refunding spent SP and resetting tree.
	 * [State Mutating]
	 * @param {CharacterRecord} character - Target character.
	 * @returns {boolean} Success assertion flag.
	 */
	function respecCharacter(character) {
		if (!character) return false;
		const manifest = getManifest();
		let refundedSP = 0;

		const unlockedList = character.unlockedNodes || character.unlocked || [];
		unlockedList.forEach((nodeId) => {
			const node = registry[nodeId] || manifest.AetherNodes?.[nodeId];
			refundedSP += node?.spCost || 1;
		});

		character.skillPoints = (character.skillPoints ?? 0) + refundedSP;
		character.unspentSP = (character.unspentSP ?? 0) + refundedSP;
		character.unlockedNodes = [];
		character.unlocked = [];
		character.spent = {};

		const cleanStats = computeCharacterStats(character, manifest);
		Object.assign(character, cleanStats);
		character.hp = cleanStats.maxHp;
		character.mp = cleanStats.maxMp;

		dispatchSFX("HEAL");

		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish("progression:respec_completed", {
				characterId: character.id,
				refundedSP,
			});
		}

		return true;
	}
	//#endregion

	//#region [SEC-05] Canonical 9-Method VSRP-001 Lifecycle Gateway & Action Router
	// --- Canonical Interface Export ---
	const api = {
		/**
		 * Configures progression district tenant settings.
		 * [Lifecycle: CONFIGURE]
		 * @param {ProgressionConfig} [config] - Configuration dictionary.
		 * @returns {void}
		 */
		configure(config) {
			assertLifecycle(State.UNCONFIGURED);
			if (!config || typeof config !== "object") {
				throw new TypeError(
					"[VSRP-001:progression_core] configure() requires a non-null configuration dictionary.",
				);
			}
			hostConfig = deepFreeze({ ...config });
			registry = compileRegistry(hostConfig?.manifest);
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes progression tenant with host context.
		 * [Lifecycle: INIT]
		 * @param {Record<string, any>} [context] - Host context reference.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			hostContext = context || null;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets simulation snapshot and party working state.
		 * [Lifecycle: RESET]
		 * @param {ProgressionSimulationState|CharacterRecord[]|Record<string, any>} [stateSnapshot] - State snapshot or party array.
		 * @returns {void}
		 */
		reset(stateSnapshot) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

			const baseline = createDefaultState();
			const incoming = /** @type {Record<string, any>} */ (stateSnapshot ? structuredClone(stateSnapshot) : {});

			// Resolved nested ternary into explicit statements to satisfy SonarQube
			/** @type {CharacterRecord[]} */
			let resolvedParty = [];
			if (Array.isArray(incoming.party)) {
				resolvedParty = incoming.party;
			} else if (Array.isArray(incoming)) {
				resolvedParty = /** @type {CharacterRecord[]} */ (incoming);
			}

			sim = {
				...baseline,
				...incoming,
				party: resolvedParty,
			};

			lifecycleState = State.READY;
		},

		/**
		 * Updates simulation tick and processes input queues.
		 * [Lifecycle: UPDATE]
		 * @param {number} [dt] - Delta time.
		 * @param {Record<string, any>} [context] - Update context.
		 * @returns {void}
		 */
		update(dt, context) {
			assertLifecycle(State.READY, State.RUNNING);
			lifecycleState = State.RUNNING;
			if (dt) {
				// Delta time acknowledged
			}

			const activeCtx = /** @type {Record<string, any>} */ (context || hostContext);

			if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
				for (const element of activeCtx.inputs) {
					this.handleHostAction(element);
				}
			}
		},

		/**
		 * Renders progression UI through host renderer.
		 * [Lifecycle: RENDER]
		 * @param {any} [renderer] - Target renderer or party array.
		 * @param {Record<string, any>} [_context] - Render context.
		 * @returns {void}
		 */
		render(renderer, _context) {
			// Support legacy array direct-pass fallback or isolated peripheral renderer delegation
			if (Array.isArray(renderer)) {
				if (
					typeof EmberlightProgressionRenderer !== "undefined" &&
					typeof EmberlightProgressionRenderer.renderProgression === "function"
				) {
					if (!sim) sim = createDefaultState();
					sim.party = renderer;
					EmberlightProgressionRenderer.renderProgression(this.getState(), (/** @type {HostProgressionAction} */ action) =>
						this.handleHostAction(action),
					);
				}
				return;
			}

			assertLifecycle(State.READY, State.RUNNING);
			const activeRenderer =
				renderer ||
				hostContext?.progressionRenderer ||
				(typeof EmberlightProgressionRenderer !== "undefined" ? EmberlightProgressionRenderer : null);
			if (activeRenderer && typeof activeRenderer.renderProgression === "function") {
				activeRenderer.renderProgression(this.getState(), (/** @type {HostProgressionAction} */ action) =>
					this.handleHostAction(action),
				);
			}
		},

		/**
		 * Retrieves current simulation state clone.
		 * [Pure Query]
		 * @returns {ProgressionSimulationState|null} Simulation state copy.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return sim ? structuredClone(sim) : null;
		},

		/**
		 * Exports tenant diagnostics.
		 * [Pure Query]
		 * @returns {ProgressionDiagnostics} Diagnostic report.
		 */
		getDiagnostics() {
			if (lifecycleState === State.DESTROYED) {
				throw new Error("[VSRP-001:progression_core] Cannot read diagnostics on a DESTROYED instance.");
			}
			return {
				moduleId: "progression_core",
				lifecycleState,
				registeredNodeCount: Object.keys(registry).length,
				trackedPartyCount: sim?.party?.length || 0,
			};
		},

		/**
		 * Exports module capability metadata.
		 * [Pure Query]
		 * @returns {ProgressionModuleInfo} Module info dictionary.
		 */
		getModuleInfo() {
			return {
				moduleId: "progression_core",
				version: "2.0.0",
				protocolVersion: "VSRP-001",
				dependencies: ["manifest"],
				capabilities: ["progression", "events.progression_node_unlocked", "events.progression_sfx"],
			};
		},

		/**
		 * Backward-compatibility alias for getModuleInfo.
		 * [Pure Query]
		 * @returns {ProgressionModuleInfo} Module info dictionary.
		 */
		getInfo() {
			return this.getModuleInfo();
		},

		/**
		 * Destroys tenant instance and cleans up references.
		 * [Lifecycle: DESTROY]
		 * @returns {void}
		 */
		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			sim = null;
			hostConfig = null;
			hostContext = null;
			registry = {};
			lifecycleState = State.DESTROYED;
		},

		/**
		 * Handles incoming host actions and UI triggers.
		 * [State Mutating / Action Router]
		 * @param {string|HostProgressionAction} action - Action command or payload.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;
			const type = typeof action === "string" ? action : action.type;
			/** @type {HostProgressionAction} */
			const actionObj = typeof action === "object" && action !== null
				? action
				: { type: /** @type {any} */ (action) };

			/** @type {Record<string, () => void>} */
			const handlers = {
				UNLOCK_NODE: () => {
					if (actionObj.characterId && actionObj.nodeId && sim) {
						const character = sim.party.find((c) => c.id === actionObj.characterId);
						if (character && executeUnlock(character, actionObj.nodeId)) {
							sim.lastUnlockedNodeId = actionObj.nodeId;
						}
					}
				},
				RESPEC_CHARACTER: () => {
					if (actionObj.characterId && sim) {
						const character = sim.party.find((c) => c.id === actionObj.characterId);
						if (character) respecCharacter(character);
					}
				},
				SELECT_CHARACTER: () => {
					if (sim) {
						sim.selectedCharacterId = actionObj.characterId || null;
						sim.selectedNodeId = null;
					}
				},
				SELECT_ESSENCE: () => {
					if (sim) {
						sim.selectedEssence = actionObj.essence || "ALL";
					}
				},
				SELECT_NODE: () => {
					if (sim) {
						sim.selectedNodeId = actionObj.nodeId || null;
					}
				},
			};

			if (handlers[type]) {
				handlers[type]();
			}

			this.render();
		},
	};

	return api;
})();
//#endregion

//#region [SEC-06] Global Environment & Window Scope Export
if (typeof window !== "undefined") {
	window.EmberlightProgression = EmberlightProgression;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightProgression;
}
//#endregion