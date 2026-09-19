/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DISTRICT 9: RELIC FORGE (VSRP-001 COMPLIANT TENANT)
 * Document Identifier: VSRP-001-FORGE-EXTENDED
 * Governing Protocol:  VSRP-001
 * Authority:           Ephemeral Simulation
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State, Lifecycle Guard & Configuration Helpers
 *   [SEC-02] Sealed Delta Envelope & Event Dispatchers
 *   [SEC-03] Canonical 9-Method Lifecycle Gateway & Host Action Router
 * ============================================================================
 */

/**
 * @typedef {Object} ForgeDeltaObject
 * @property {number} goldDelta Accumulated gold change.
 * @property {Object.<string, number>} inventoryDelta Accumulated inventory changes.
 */

/**
 * @typedef {Object} ForgeSimulationState
 * @property {Array<Object>} party Party members array.
 * @property {Object.<string, number>} inventory Item counts inventory map.
 * @property {number} gold Current gold value.
 * @property {number} selectedCharIndex Selected character index slot.
 * @property {string} selectedCategory Selected gear category ('WEAPON' | 'ARMOR' | 'ACCESSORY').
 * @property {number} currentSeed Procedural generator seed.
 * @property {ForgeDeltaObject} deltas Simulation delta envelopes.
 * @property {boolean} active Simulation active status flag.
 */

/**
 * @typedef {Object} ForgeSnapshot
 * @property {Array<Object>} [party] Initial party members array.
 * @property {Object.<string, number>} [inventory] Initial item inventory map.
 * @property {number} [gold] Initial gold count.
 * @property {number} [seed] Initial procedural seed.
 */

/**
 * @typedef {Object} ForgeContext
 * @property {Object} eventBus Host event bus reference.
 */

/**
 * @typedef {Object} ForgeActionToken
 * @property {string} type Action type token string.
 * @property {number} [index] Target character index.
 * @property {string} [category] Target equipment category.
 * @property {number} [cost] Recipe purchase cost.
 * @property {string} [recipeYield] Yielded item ID key.
 */

/**
 * @typedef {Object} ForgeDiagnostics
 * @property {string} moduleId Module identifier string.
 * @property {string} lifecycleState Current lifecycle state.
 * @property {string|null} activeChar Active character name.
 * @property {string|null} activeCategory Active gear category.
 * @property {number|null} activeSeed Active procedural seed.
 * @property {Object|null} hostConfig Active configuration object.
 */

/**
 * @typedef {Object} ForgeModuleInfo
 * @property {string} moduleId Module identifier string.
 * @property {string} name Module display name.
 * @property {string} protocolVersion Protocol version string.
 * @property {string} version Module version string.
 * @property {string[]} capabilities Supported capability tags.
 */

// @ts-ignore
const EmberlightRelicForge = (() => {
	'use strict';

	//#region [SEC-01] Type Definitions, Module State, Lifecycle Guard & Configuration Helpers
	// --- Formal Lifecycle States ---
	const State = {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};
	let lifecycleState = State.UNCONFIGURED;
	/** @type {Object|null} */
	let hostConfig = null;
	/** @type {ForgeContext|null} */
	let hostContext = null;

	// --- Private Simulation Vault (Faraday Rule 1) ---
	/** @type {ForgeSimulationState|null} */
	let sim = null;

	/**
	 * Asserts that the module is in an allowed lifecycle state.
	 * (Pure state-checking utility)
	 * @param {...string} allowed Allowed lifecycle states.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:relic_forge] Lifecycle Error: Invoked in "${lifecycleState}". Required: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Recursively freezes an object configuration dictionary.
	 * (Pure calculation utility)
	 * @param {Object} obj Target configuration object.
	 * @returns {Object} Frozen object.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== 'object') return obj;
		Object.keys(obj).forEach((prop) => {
			if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
				deepFreeze(obj[prop]);
			}
		});
		return Object.freeze(obj);
	}

	/**
	 * Publishes sound effect events to the host event bus.
	 * (State-mutating event dispatcher)
	 * @param {string} sfxName Sound effect token name.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		hostContext?.eventBus?.publish?.('relic_forge:sfx', { sfx: sfxName });
	}

	/**
	 * Resolves the initial procedural seed from the snapshot.
	 * (Pure calculation utility)
	 * @param {ForgeSnapshot} snapshot Snapshot payload.
	 * @returns {number} Resolved seed number.
	 */
	function resolveInitialSeed(snapshot) {
		if (typeof snapshot.seed === 'number') {
			return snapshot.seed;
		}
		if (snapshot.gold) {
			return (snapshot.gold * 313 + 10007) % 90000;
		}
		return 42771;
	}
	//#endregion

	//#region [SEC-02] Sealed Delta Envelope & Event Dispatchers
	/**
	 * Finalizes the forging session and publishes resolution payloads.
	 * (State-mutating event gateway)
	 * @returns {void}
	 */
	function finalizeForge() {
		dispatchSFX('SELECT');
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('relic_forge:resolved', {
				outcome: 'success',
				goldDelta: sim?.deltas?.goldDelta || 0,
				inventoryDelta: structuredClone(sim?.deltas?.inventoryDelta || {}),
				party: structuredClone(sim?.party || []),
			});
		}
	}
	//#endregion

	//#region [SEC-03] Canonical 9-Method Lifecycle Gateway & Host Action Router
	/**
	 * Handles character selection action tokens.
	 * @param {ForgeActionToken} action Action token.
	 * @returns {void}
	 */
	function handleSelectChar(action) {
		if (sim && typeof action.index === 'number') {
			sim.selectedCharIndex = action.index;
			dispatchSFX('SELECT');
		}
	}

	/**
	 * Handles category selection action tokens.
	 * @param {ForgeActionToken} action Action token.
	 * @returns {void}
	 */
	function handleSelectCategory(action) {
		if (sim && action.category) {
			sim.selectedCategory = action.category;
			dispatchSFX('SELECT');
		}
	}

	/**
	 * Handles matrix re-attunement action tokens.
	 * @returns {void}
	 */
	function handleReattune() {
		if (!sim) return;
		const prng = (typeof EmberlightPRNG !== 'undefined' && EmberlightPRNG.create)
			? EmberlightPRNG.create(sim.currentSeed + 7919)
			: null;
		sim.currentSeed = prng ? prng.nextInt(10000, 99999) : (((sim.currentSeed * 1103515245 + 12345) & 0x7fffffff) % 90000 + 10000);
		dispatchSFX('SELECT');
	}

	/**
	 * Handles recipe crafting action tokens.
	 * @param {ForgeActionToken} action Action token.
	 * @returns {void}
	 */
	function handleCraftRecipe(action) {
		if (!sim) return;
		const cost = action.cost || 0;
		if (sim.gold >= cost && action.recipeYield) {
			sim.gold -= cost;
			sim.deltas.goldDelta -= cost;
			sim.inventory[action.recipeYield] = (sim.inventory[action.recipeYield] || 0) + 1;
			sim.deltas.inventoryDelta[action.recipeYield] =
				(sim.deltas.inventoryDelta[action.recipeYield] || 0) + 1;
			dispatchSFX('HEAL');
			finalizeForge();
		}
	}

	// --- CANONICAL 9-METHOD CONTRACT (Rule 2) ---
	return {
		/**
		 * Configures the relic forge simulation tenant.
		 * (State-mutating lifecycle gateway)
		 * @param {Object} config Configuration dictionary.
		 * @returns {void}
		 */
		configure(config) {
			assertLifecycle(State.UNCONFIGURED);
			if (!config || typeof config !== 'object') {
				throw new TypeError('[VSRP-001:relic_forge] configure() requires a configuration dictionary.');
			}
			hostConfig = deepFreeze({ ...config });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes the tenant with runtime context and event bus handles.
		 * (State-mutating lifecycle gateway)
		 * @param {ForgeContext} context Host context object containing eventBus.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
				throw new Error('[VSRP-001:relic_forge] Capability Error: Missing eventBus handle.');
			}
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets the ephemeral simulation vault state snapshot.
		 * (State-mutating lifecycle gateway)
		 * @param {ForgeSnapshot} [snapshot={}] Snapshot payload containing party, inventory, gold, and seed.
		 * @returns {void}
		 */
		reset(snapshot = {}) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
			sim = {
				party: structuredClone(snapshot.party || []),
				inventory: structuredClone(snapshot.inventory || {}),
				gold: typeof snapshot.gold === 'number' ? snapshot.gold : 0,
				selectedCharIndex: 0,
				selectedCategory: 'WEAPON', // 'WEAPON' | 'ARMOR' | 'ACCESSORY'
				currentSeed: resolveInitialSeed(snapshot),
				deltas: {
					goldDelta: 0,
					inventoryDelta: {},
				},
				active: true,
			};
			lifecycleState = State.READY;
		},

		/**
		 * Updates the simulation state step.
		 * (State-mutating update gateway)
		 * @param {number} _dt Delta time step.
		 * @param {Object} [_context] Update context.
		 * @returns {void}
		 */
		update(_dt, _context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (!sim?.active) return;
			lifecycleState = State.RUNNING;
		},

		/**
		 * Renders the tenant presentation projection.
		 * (State-mutating render gateway)
		 * @param {Object} renderer Peripheral presentation renderer driver.
		 * @param {Object} [_context] Rendering context.
		 * @returns {void}
		 */
		render(renderer, _context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (renderer && typeof renderer.renderRelicForge === 'function') {
				renderer.renderRelicForge(this.getState(), (action) => this.handleHostAction(action));
			}
		},

		/**
		 * Returns a deep clone snapshot of the private simulation vault.
		 * (Pure state accessor)
		 * @returns {ForgeSimulationState} Simulation state snapshot.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return structuredClone(sim);
		},

		/**
		 * Collects real-time diagnostic telemetry.
		 * (Pure telemetry collector)
		 * @returns {ForgeDiagnostics} Diagnostic report dictionary.
		 */
		getDiagnostics() {
			return {
				moduleId: 'relic_forge_core',
				lifecycleState,
				activeChar: sim?.party?.[sim?.selectedCharIndex]?.name || null,
				activeCategory: sim?.selectedCategory || null,
				activeSeed: sim?.currentSeed || null,
				hostConfig,
			};
		},

		/**
		 * Returns sovereign module registration metadata.
		 * (Pure metadata accessor)
		 * @returns {ForgeModuleInfo} Module metadata dictionary.
		 */
		getModuleInfo() {
			return {
				moduleId: 'relic_forge_core',
				name: 'EmberlightRelicForge',
				protocolVersion: 'VSRP-001',
				version: '1.1.0',
				capabilities: ['phenotype_crafting', 'events.relic_forge_resolved'],
			};
		},

		/**
		 * Purges tenant resources and terminates lifecycle.
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
		 * Processes inbound host or UI action tokens.
		 * (State-mutating action router)
		 * @param {ForgeActionToken|string} action Action token payload or string.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;
			const type = typeof action === 'string' ? action : action.type;
			const actionObj = typeof action === 'object' && action !== null ? /** @type {ForgeActionToken} */ (action) : null;

			if (type === 'SELECT_CHAR' && actionObj) {
				handleSelectChar(actionObj);
			} else if (type === 'SELECT_CATEGORY' && actionObj) {
				handleSelectCategory(actionObj);
			} else if (type === 'REATTUNE') {
				handleReattune();
			} else if (type === 'CRAFT_RECIPE' && actionObj) {
				handleCraftRecipe(actionObj);
			} else if (type === 'EXIT') {
				finalizeForge();
			}
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	// @ts-ignore
	window.EmberlightRelicForge = EmberlightRelicForge;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightRelicForge;
}