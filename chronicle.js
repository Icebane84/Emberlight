/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: QUEST & WORLD STATE REGISTRY
 * Document Identifier: VSRP-001-CHRONICLE-CORE
 * Governing Protocol:  VSRP-001[cite: 3]
 * Authority:           Ephemeral Simulation Tenant[cite: 3]
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Lifecycle States & Utility Functions
 *   [SEC-02] Ephemeral Simulation State & Quest Evaluators
 *   [SEC-03] Canonical 9-Method Interface Export & Action Handlers
 * ============================================================================
 */

/**
 * @typedef {Object} ChronicleConfig
 * @property {Object} [manifest] Optional custom manifest object override.
 */

/**
 * @typedef {Object} ChronicleEventBus
 * @property {(event: string, payload: Record<string, any>) => void} [publish] Event publication handle.
 */

/**
 * @typedef {Object} ChronicleContext
 * @property {ChronicleEventBus} [eventBus] Host event bus container.
 * @property {Array<ChronicleAction|string>} [inputs] Array of host action tokens for simulation update.
 */

/**
 * @typedef {Object} QuestStageData
 * @property {boolean} [completed] Whether reaching this stage completes the quest.
 */

/**
 * @typedef {Object} QuestDefinition
 * @property {Array<QuestStageData|Object>} [stages] Ordered array of stage configurations.
 */

/**
 * @typedef {Object} QuestStateEntry
 * @property {number} stage Current quest stage index.
 * @property {boolean} completed Completion flag status.
 */

/**
 * @typedef {Object} ChronicleStateDeltas
 * @property {Object.<string, *>} flagsDelta Accumulated flag mutations.
 * @property {Object.<string, QuestStateEntry>} questsDelta Accumulated quest stage mutations.
 */

/**
 * @typedef {Object} ChronicleState
 * @property {Object.<string, *>} flags Active world state flags.
 * @property {Object.<string, QuestStateEntry>} quests Active quest states keyed by ID.
 * @property {string|null} selectedQuestId Currently focused quest identifier.
 * @property {ChronicleStateDeltas} deltas Sealed working delta records.
 */

/**
 * @typedef {Object} ChronicleDiagnostics
 * @property {string} moduleId Module identifier string.
 * @property {string} lifecycleState Current lifecycle state.
 * @property {number} activeQuestCount Total active quests in simulation memory.
 * @property {number} flagCount Total tracked world flags.
 */

/**
 * @typedef {Object} ChronicleModuleInfo
 * @property {string} moduleId Unique module identifier.
 * @property {string} version Semantic version string.
 * @property {string} protocolVersion Protocol version string.
 * @property {string[]} dependencies Required dependency modules.
 * @property {string[]} capabilities Declared capability tags.
 */

/**
 * @typedef {Object} SetFlagAction
 * @property {'SET_FLAG'} type Action token type.
 * @property {string} flag Flag key identifier.
 * @property {*} value Value to assign to the flag.
 */

/**
 * @typedef {Object} AdvanceQuestAction
 * @property {'ADVANCE_QUEST'} type Action token type.
 * @property {string} questId Target quest identifier.
 * @property {number} [stage] Optional explicit target stage index.
 */

/**
 * @typedef {Object} SelectQuestAction
 * @property {'SELECT_QUEST'} type Action token type.
 * @property {string|null} questId Quest identifier to select.
 */

/**
 * @typedef {Object} ExitAction
 * @property {'EXIT'} type Action token type.
 */

/**
 * @typedef {SetFlagAction|AdvanceQuestAction|SelectQuestAction|ExitAction} ChronicleAction
 */

const ChronicleModule = (() => {
	//#region [SEC-01] Type Definitions, Lifecycle States & Utility Functions
	const State = {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};

	let lifecycleState = State.UNCONFIGURED;
	/** @type {any} */
	let hostConfig = null;
	/** @type {any} */
	let hostContext = null;

	// Authoritative Ephemeral Working Memory
	/** @type {ChronicleState|null} */
	let sim = null;

	/**
	 * Asserts that the module is currently in one of the allowed lifecycle states[cite: 3].
	 * (State-validating utility)
	 * @param {...string} allowed Allowed lifecycle state strings.
	 * @returns {void}
	 * @throws {Error} If the current lifecycle state is not permitted.
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:chronicle_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
				`Required: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Deep freezes an object recursively to preserve immutability[cite: 3].
	 * (Pure recursive utility)
	 * @template T
	 * @param {T} obj The object to freeze.
	 * @returns {T} The deeply frozen object.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== 'object') return obj;
		const o = /** @type {Record<string, any>} */ (obj);
		Object.keys(o).forEach((prop) => {
			if (typeof o[prop] === 'object' && o[prop] !== null && !Object.isFrozen(o[prop])) {
				deepFreeze(o[prop]);
			}
		});
		return Object.freeze(obj);
	}

	/**
	 * Retrieves the active manifest definition[cite: 3].
	 * (Pure state-accessor utility)
	 * @returns {Object} Manifest object.
	 */
	function getActiveManifest() {
		return hostConfig?.manifest || (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : /** @type {any} */ ({}));
	}

	/**
	 * Publishes a sound effect dispatch event over the event bus[cite: 3].
	 * (State-mutating event publisher)
	 * @param {string} sfxName Sound effect token.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		hostContext?.eventBus?.publish?.('chronicle:sfx', { sfx: sfxName });
	}
	//#endregion

	//#region [SEC-02] Ephemeral Simulation State & Quest Evaluators
	/**
	 * Creates the default fallback state for the chronicle tenant[cite: 3].
	 * (Pure state factory)
	 * @returns {ChronicleState} Default chronicle state structure.
	 */
	function createDefaultState() {
		return {
			flags: {},
			quests: {},
			selectedQuestId: null,
			deltas: {
				flagsDelta: {},
				questsDelta: {},
			},
		};
	}

	/**
	 * Retrieves a specific quest definition from the active manifest[cite: 3].
	 * (Pure state accessor)
	 * @param {string} questId Unique quest identifier.
	 * @returns {QuestDefinition|null} Quest definition object or null.
	 */
	function getQuestDefinition(questId) {
		const manifest = /** @type {any} */ (getActiveManifest());
		return manifest?.Quests?.[questId] || null;
	}

	/**
	 * Sets a world state flag and records its delta[cite: 3].
	 * (State-mutating simulation procedure)
	 * @param {string} flagKey Flag name/key.
	 * @param {*} value Flag value.
	 * @returns {void}
	 */
	function setFlag(flagKey, value) {
		if (!sim) return;
		sim.flags[flagKey] = value;
		sim.deltas.flagsDelta[flagKey] = value;
		hostContext?.eventBus?.publish?.('chronicle:flag_set', { flag: flagKey, value });
	}

	/**
	 * Advances a quest to a target stage and publishes updates[cite: 3].
	 * (State-mutating simulation procedure)
	 * @param {string} questId Unique quest identifier.
	 * @param {number} [targetStage] Target stage index.
	 * @returns {boolean} True if successfully advanced.
	 */
	function advanceQuest(questId, targetStage) {
		const questDef = getQuestDefinition(questId);
		if (!questDef || !sim) return false;

		if (!sim.quests[questId]) {
			sim.quests[questId] = { stage: 0, completed: false };
		}

		const current = sim.quests[questId];
		const newStage = typeof targetStage === 'number' ? targetStage : current.stage + 1;
		const stages = Array.isArray(questDef.stages) ? questDef.stages : [];
		const stageData = /** @type {any} */ (stages[newStage]);

		current.stage = newStage;
		current.completed = stageData && typeof stageData === 'object'
			? Boolean(stageData.completed)
			: (stages.length > 0 && newStage >= stages.length);

		sim.deltas.questsDelta[questId] = { stage: newStage, completed: current.completed };

		hostContext?.eventBus?.publish?.('chronicle:quest_updated', {
			questId,
			stage: newStage,
			completed: current.completed,
		});

		dispatchSFX('SELECT');
		return true;
	}

	/**
	 * Finalizes the chronicle working session and publishes sealed deltas[cite: 3].
	 * (State-mutating completion gateway)
	 * @returns {void}
	 */
	function finalizeChronicle() {
		if (!sim) return;
		const payload = {
			flagsDelta: structuredClone(sim.deltas.flagsDelta),
			questDeltas: structuredClone(sim.deltas.questsDelta),
			questsDelta: structuredClone(sim.deltas.questsDelta),
		};

		hostContext?.eventBus?.publish?.('chronicle:resolved', payload);
	}
	//#endregion

	//#region [SEC-03] Canonical 9-Method Interface Export & Action Handlers
	return {
		/**
		 * Configures the chronicle tenant with immutable host configuration options[cite: 3].
		 * (State-mutating lifecycle gateway)
		 * @param {ChronicleConfig|Record<string, any>} [cfg] Configuration payload object.
		 * @returns {void}
		 */
		configure(cfg) {
			assertLifecycle(State.UNCONFIGURED);
			if (!cfg || typeof cfg !== 'object') {
				throw new TypeError('[VSRP-001:chronicle_core] configure() requires a valid configuration object.');
			}
			hostConfig = deepFreeze({ ...cfg });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes the chronicle tenant with host runtime services and event bus handles[cite: 3].
		 * (State-mutating lifecycle gateway)
		 * @param {ChronicleContext|Record<string, any>} [context] Host context container.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			if (!context?.eventBus?.publish || typeof context.eventBus.publish !== 'function') {
				throw new Error('[VSRP-001:chronicle_core] Capability Error: Missing eventBus.publish handle.');
			}
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets or bootstraps simulation state from an optional incoming snapshot[cite: 3].
		 * (State-mutating lifecycle gateway)
		 * @param {ChronicleState|Record<string, any>|null} [snapshot] Optional incoming state snapshot.
		 * @returns {void}
		 */
		reset(snapshot) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

			const baseline = createDefaultState();
			const incoming = snapshot ? structuredClone(snapshot) : /** @type {any} */ ({});
			const questKeys = Object.keys((/** @type {any} */ (getActiveManifest()))?.Quests || {});
			const selectedQuestId = incoming.selectedQuestId || (questKeys.length > 0 ? questKeys[0] : null);

			sim = {
				...baseline,
				...incoming,
				flags: incoming.flags || {},
				quests: incoming.quests || {},
				selectedQuestId,
				deltas: {
					flagsDelta: {},
					questsDelta: {},
				},
			};

			lifecycleState = State.READY;
		},

		/**
		 * Advances simulation tick time and processes queued input action tokens[cite: 3].
		 * (State-mutating simulation update loop)
		 * @param {number} _dt Delta time step in seconds.
		 * @param {ChronicleContext} [context] Optional per-tick runtime context override.
		 * @returns {void}
		 */
		update(_dt, context) {
			assertLifecycle(State.READY, State.RUNNING);
			lifecycleState = State.RUNNING;

			const activeCtx = context || hostContext;
			if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
				for (const action of activeCtx.inputs) {
					this.handleHostAction(action);
				}
			}
		},

		/**
		 * Projects simulation state to an external presentation renderer[cite: 3].
		 * (Pure presentation projection)
		 * @param {any} [renderer] Presentation renderer driver object.
		 * @param {any} [_context] Optional rendering context.
		 * @returns {void}
		 */
		render(renderer, _context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (renderer && typeof renderer.renderChronicle === 'function' && sim) {
				renderer.renderChronicle(this.getState(), (/** @type {any} */ action) => this.handleHostAction(action));
			}
		},

		/**
		 * Returns a detached serializable snapshot projection of active simulation working memory[cite: 3].
		 * (Pure state projection)
		 * @returns {ChronicleState} Cloned active state snapshot.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			if (!sim) {
				return createDefaultState();
			}
			return structuredClone(sim);
		},

		/**
		 * Produces real-time module diagnostics and metric counters[cite: 3].
		 * (Pure telemetry collector)
		 * @returns {ChronicleDiagnostics} Diagnostic report object.
		 */
		getDiagnostics() {
			if (lifecycleState === State.DESTROYED) {
				throw new Error('[VSRP-001:chronicle_core] Cannot read diagnostics on a DESTROYED instance.');
			}
			return {
				moduleId: 'chronicle_core',
				lifecycleState,
				activeQuestCount: Object.keys(sim?.quests || {}).length,
				flagCount: Object.keys(sim?.flags || {}).length,
			};
		},

		/**
		 * Returns metadata matching the module capability schema[cite: 3].
		 * (Pure metadata projection)
		 * @returns {ChronicleModuleInfo} Metadata object.
		 */
		getModuleInfo() {
			return {
				moduleId: 'chronicle_core',
				version: '1.2.0',
				protocolVersion: 'VSRP-001',
				dependencies: ['manifest'],
				capabilities: [
					'world_state',
					'quest_tracking',
					'map_mutations',
					'events.chronicle_sfx',
					'events.chronicle_resolved',
				],
			};
		},

		/**
		 * Purges runtime allocations and transitions the module to a destroyed state[cite: 3].
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			sim = null;
			hostConfig = null;
			hostContext = null;
			lifecycleState = State.DESTROYED;
		},

		/**
		 * Handles incoming host action tokens or action objects[cite: 3].
		 * (State-mutating command router)
		 * @param {ChronicleAction|string} action Action token or structured command object.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;

			if (typeof action === 'string') {
				if (action === 'EXIT') {
					finalizeChronicle();
				}
				return;
			}

			const type = action.type;

			if (type === 'SET_FLAG') {
				setFlag(action.flag, action.value);
			} else if (type === 'ADVANCE_QUEST') {
				advanceQuest(action.questId, action.stage);
			} else if (type === 'SELECT_QUEST') {
				sim.selectedQuestId = action.questId || null;
			} else if (type === 'EXIT') {
				finalizeChronicle();
			}
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightChronicle = ChronicleModule;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ChronicleModule;
}