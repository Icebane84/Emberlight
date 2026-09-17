/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMMERCE DISTRICT MARKET CORE
 * Document Identifier: VSRP-001-MARKET-CORE
 * Governing Protocol:  VSRP-001 / COMPONENT_PROTOCOL[cite: 4]
 * Authority:           Ephemeral Simulation Tenant[cite: 4]
 * Timestamp:           2026-09-07T10:54:29Z
 * Index Anchor:        PRS-001[cite: 4]
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Lifecycle State Machine & Simulation Context Utilities
 *   [SEC-03] Commerce Transaction Calculus & Stat Diff Preview Engine
 *   [SEC-04] Canonical 9-Method VSRP-001 Lifecycle Gateway & Action Router
 *   [SEC-05] Global Environment & CommonJS Module Export
 * ============================================================================
 */

const EmberlightMarket = (() => {
	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} MarketDeltas
	 * @property {number} goldDelta - Net gold currency change.
	 * @property {Record<string, number>} inventoryDelta - Net inventory item count changes.
	 * @property {Array<any>} [partyEquipDelta] - Party equipment changes.
	 * @property {Record<string, number>} [stockDelta] - Shop working stock changes.
	 */

	/**
	 * @typedef {Object} MarketSimulationState
	 * @property {string|null} shopId - Active shop identifier token.
	 * @property {Array<Object>} party - Active party roster.
	 * @property {Record<string, number>} inventory - Player inventory counts.
	 * @property {number} gold - Available currency count.
	 * @property {Record<string, number>} workingStock - Current shop item quantities.
	 * @property {'BUY'|'SELL'} currentTab - Active shop tab view.
	 * @property {string|null} selectedItemId - Selected item identifier token.
	 * @property {MarketDeltas} deltas - Pending session transaction deltas.
	 * @property {boolean} [active] - Active simulation state flag.
	 */

	/**
	 * @typedef {Object} MarketResolvedPayload
	 * @property {number} goldDelta - Final gold delta.
	 * @property {Record<string, number>} inventoryDelta - Final inventory deltas.
	 * @property {Array<any>} partyEquipDelta - Final equipment deltas.
	 */

	/**
	 * @typedef {Object} ItemDiffReport
	 * @property {Record<string, number>} diff - Stat differential dictionary.
	 * @property {'upgrade'|'downgrade'|'sidegrade'|'neutral'} rating - Comparative rating.
	 * @property {string} currentEquippedLabel - Label of currently equipped item or 'Empty'.
	 */

	/**
	 * @typedef {Object} MarketDiagnostics
	 * @property {string} moduleId - Module identifier.
	 * @property {string} lifecycleState - Current lifecycle state string.
	 * @property {string|null} activeShop - Active shop token.
	 * @property {string|null} tab - Active UI tab.
	 * @property {string|null} selectedItem - Selected item token.
	 * @property {number} pendingGoldDelta - Pending gold delta.
	 * @property {number} pendingInventoryDeltas - Count of pending inventory changes.
	 */

	/**
	 * @typedef {Object} MarketModuleInfo
	 * @property {string} moduleId - Module identifier.
	 * @property {string} version - Module version string.
	 * @property {string} protocolVersion - Governing protocol version.
	 * @property {string[]} dependencies - Module dependencies.
	 * @property {string[]} capabilities - Supported capability tokens.
	 */

	/**
	 * @typedef {Object} HostActionObject
	 * @property {'BUY'|'SELL'|'SWITCH_TAB'|'SELECT_ITEM'|'EXIT'} type - Action type token.
	 * @property {string} [itemId] - Target item identifier.
	 * @property {'BUY'|'SELL'} [tab] - Target tab mode.
	 */
	//#endregion

	//#region [SEC-02] Lifecycle State Machine & Simulation Context Utilities
	const State = {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};

	let lifecycleState = State.UNCONFIGURED;
	/** @type {Record<string, any>|null} */
	let hostConfig = null;
	/** @type {Record<string, any>|null} */
	let hostContext = null;
	/** @type {MarketSimulationState|null} */
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
				`[VSRP-001:market_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
				`Required: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Deep freezes an object recursively.
	 * [Pure Utility]
	 * @param {any} obj - Target object to freeze.
	 * @returns {any} Frozen object.
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
	 * Retrieves active game manifest.
	 * [Pure Query]
	 * @returns {Record<string, any>} Manifest object.
	 */
	function getActiveManifest() {
		return hostConfig?.manifest || (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {});
	}

	/**
	 * Dispatches sound effect triggers over host event bus.
	 * [State Mutating / Bus Dispatch]
	 * @param {string} sfxName - Sound effect name token.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('market:sfx', { sfx: sfxName });
		}
	}

	/**
	 * Retrieves item definition from manifest.
	 * [Pure Query]
	 * @param {string|null|undefined} itemId - Item identifier token.
	 * @returns {Record<string, any>|null} Item definition.
	 */
	function getItem(itemId) {
		if (!itemId) return null;
		const manifest = getActiveManifest();
		return manifest?.Items?.[itemId] || null;
	}

	/**
	 * Retrieves shop definition from manifest.
	 * [Pure Query]
	 * @param {string|null|undefined} shopId - Shop identifier token.
	 * @returns {Record<string, any>|null} Shop definition.
	 */
	function getShop(shopId) {
		if (!shopId) return null;
		const manifest = getActiveManifest();
		return manifest?.Shops?.[shopId] || null;
	}
	//#endregion

	//#region [SEC-03] Commerce Transaction Calculus & Stat Diff Preview Engine
	/**
	 * Executes item purchase transaction.
	 * [State Mutating]
	 * @param {string} itemId - Item identifier token.
	 * @returns {boolean} Success assertion flag.
	 */
	function buyItem(itemId) {
		if (!itemId || !sim) return false;
		const item = getItem(itemId);
		const shop = getShop(sim.shopId);
		if (!item || !shop) return false;

		const unitCost = Math.round((item.cost || 0) * (shop.buyRate || 1.0));
		if (sim.gold < unitCost) return false;

		if (sim.workingStock[itemId] !== undefined && sim.workingStock[itemId] <= 0) {
			return false;
		}

		sim.gold -= unitCost;
		sim.deltas.goldDelta -= unitCost;
		sim.inventory[itemId] = (sim.inventory[itemId] || 0) + 1;
		sim.deltas.inventoryDelta[itemId] = (sim.deltas.inventoryDelta[itemId] || 0) + 1;

		if (sim.workingStock[itemId] !== undefined) {
			sim.workingStock[itemId] -= 1;
		}

		dispatchSFX('SELECT');
		return true;
	}

	/**
	 * Executes item sell transaction.
	 * [State Mutating]
	 * @param {string} itemId - Item identifier token.
	 * @returns {boolean} Success assertion flag.
	 */
	function sellItem(itemId) {
		if (!itemId || !sim) return false;
		const item = getItem(itemId);
		const shop = getShop(sim.shopId);
		if (!item || !shop) return false;
		if ((sim.inventory[itemId] || 0) <= 0) return false;

		const unitValue = Math.max(1, Math.round((item.cost || 0) * (shop.sellRate || 0.5)));

		sim.gold += unitValue;
		sim.deltas.goldDelta += unitValue;
		sim.inventory[itemId] -= 1;
		sim.deltas.inventoryDelta[itemId] = (sim.deltas.inventoryDelta[itemId] || 0) - 1;

		if (sim.inventory[itemId] <= 0) {
			delete sim.inventory[itemId];
		}

		if (sim.workingStock[itemId] !== undefined) {
			sim.workingStock[itemId] += 1;
		}

		dispatchSFX('SELECT');
		return true;
	}

	/**
	 * Finalizes market session and publishes settlement payload.
	 * [State Mutating / Bus Dispatch]
	 * @returns {void}
	 */
	function finalizeMarket() {
		if (!sim) return;
		const payload = {
			goldDelta: sim.deltas.goldDelta,
			inventoryDelta: structuredClone(sim.deltas.inventoryDelta),
			partyEquipDelta: structuredClone(sim.deltas.partyEquipDelta || []),
		};
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('market:resolved', payload);
		}
	}

	/**
	 * Computes equipment stat differentials for inspection UI.
	 * [Pure Calculation]
	 * @param {Record<string, any>} character - Target character object.
	 * @param {Record<string, any>} item - Candidate equipment item definition.
	 * @returns {ItemDiffReport|null} Differential report.
	 */
	function computeItemDiff(character, item) {
		if (!item?.slot) return null;
		const manifest = getActiveManifest();
		const currentEquippedId = character.equipment?.[item.slot];
		const currentItem = currentEquippedId ? manifest.Items?.[currentEquippedId] : null;

		const currentDeltas = currentItem?.statDeltas || {};
		const newDeltas = item.statDeltas || {};

		/** @type {Record<string, number>} */
		const diff = {};
		const allStats = new Set([...Object.keys(currentDeltas), ...Object.keys(newDeltas)]);
		let totalPositive = 0;
		let totalNegative = 0;

		allStats.forEach((st) => {
			const delta = (newDeltas[st] || 0) - (currentDeltas[st] || 0);
			if (delta !== 0) {
				diff[st] = delta;
				if (delta > 0) totalPositive += delta;
				else totalNegative += Math.abs(delta);
			}
		});

		/** @type {'upgrade'|'downgrade'|'sidegrade'|'neutral'} */
		let rating = 'neutral';
		if (totalPositive > 0 && totalNegative === 0) rating = 'upgrade';
		else if (totalNegative > 0 && totalPositive === 0) rating = 'downgrade';
		else if (totalPositive > 0 && totalNegative > 0) rating = 'sidegrade';

		return { diff, rating, currentEquippedLabel: currentItem?.label || 'Empty' };
	}
	//#endregion

	//#region [SEC-04] Canonical 9-Method VSRP-001 Lifecycle Gateway & Action Router
	return {
		/**
		 * Configures commerce district tenant settings.
		 * [Lifecycle: CONFIGURE]
		 * @param {Record<string, any>} [cfg] - Configuration dictionary.
		 * @returns {void}
		 */
		configure(cfg) {
			assertLifecycle(State.UNCONFIGURED);
			if (!cfg || typeof cfg !== 'object') {
				throw new TypeError('[VSRP-001:market_core] configure() requires a non-null configuration dictionary.');
			}
			hostConfig = deepFreeze({ ...cfg });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes commerce tenant with host runtime context.
		 * [Lifecycle: INIT]
		 * @param {Record<string, any>} [context] - Host context reference.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
				throw new Error('[VSRP-001:market_core] Capability Error: Missing eventBus.publish handle.');
			}
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets simulation snapshot and shop working stock.
		 * [Lifecycle: RESET]
		 * @param {Partial<MarketSimulationState>|Record<string, any>} [snapshot={}] - Session state snapshot.
		 * @returns {void}
		 */
		reset(snapshot = {}) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
			const incoming = /** @type {Record<string, any>} */ (snapshot || {});
			const shopId = incoming.shopId || 'VILLAGE_BLACKSMITH';
			const shop = getShop(shopId);

			/** @type {Record<string, number>} */
			const workingStock = {};
			if (shop?.stock && Array.isArray(shop.stock)) {
				shop.stock.forEach((/** @type {any} */ entry) => {
					workingStock[entry.itemId] = entry.maxQuantity;
				});
			}

			sim = {
				shopId,
				gold: typeof incoming.gold === 'number' ? incoming.gold : 100,
				inventory: structuredClone(incoming.inventory || {}),
				party: structuredClone(incoming.party || []),
				workingStock,
				currentTab: 'BUY',
				selectedItemId: shop?.stock?.[0]?.itemId || null,
				deltas: {
					goldDelta: 0,
					inventoryDelta: {},
					partyEquipDelta: [],
					stockDelta: {},
				},
				active: true,
			};

			lifecycleState = State.READY;
		},

		/**
		 * Updates simulation tick and processes input queues.
		 * [Lifecycle: UPDATE]
		 * @param {number} [_dt] - Delta time.
		 * @param {Record<string, any>} [context] - Update context.
		 * @returns {void}
		 */
		update(_dt, context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (!sim?.active) return;
			lifecycleState = State.RUNNING;

			const activeCtx = /** @type {Record<string, any>} */ (context || hostContext);
			if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
				for (const element of activeCtx.inputs) {
					this.handleHostAction(element);
				}
			}
		},

		/**
		 * Renders market UI through host renderer.
		 * [Lifecycle: RENDER]
		 * @param {any} renderer - Target renderer.
		 * @param {any} _context - Render context.
		 * @returns {void}
		 */
		render(renderer, _context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (renderer && typeof renderer.renderMarket === 'function') {
				renderer.renderMarket(this.getState(), (/** @type {any} */ action) => this.handleHostAction(action));
			}
		},

		/**
		 * Retrieves current simulation state clone.
		 * [Pure Query]
		 * @returns {MarketSimulationState|null} Simulation state copy.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return sim ? structuredClone(sim) : null;
		},

		/**
		 * Exports tenant diagnostics.
		 * [Pure Query]
		 * @returns {MarketDiagnostics} Diagnostic report.
		 */
		getDiagnostics() {
			if (lifecycleState === State.DESTROYED) {
				throw new Error('[VSRP-001:market_core] Cannot read diagnostics on a DESTROYED instance.');
			}
			return {
				moduleId: 'market_core',
				lifecycleState,
				activeShop: sim?.shopId || null,
				tab: sim?.currentTab || null,
				selectedItem: sim?.selectedItemId || null,
				pendingGoldDelta: sim?.deltas?.goldDelta || 0,
				pendingInventoryDeltas: Object.keys(sim?.deltas?.inventoryDelta || {}).length,
			};
		},

		/**
		 * Exports module capability metadata.
		 * [Pure Query]
		 * @returns {MarketModuleInfo} Module info dictionary.
		 */
		getModuleInfo() {
			return {
				moduleId: 'market_core',
				version: '1.2.0',
				protocolVersion: 'VSRP-001',
				dependencies: ['manifest'],
				capabilities: [
					'commerce',
					'stock_tracking',
					'stat_diff_preview',
					'events.market_sfx',
					'events.market_resolved',
				],
			};
		},

		/**
		 * Backward-compatibility alias for getModuleInfo.
		 * [Pure Query]
		 * @returns {MarketModuleInfo} Module info dictionary.
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
			lifecycleState = State.DESTROYED;
		},

		/**
		 * Handles incoming host actions and UI triggers.
		 * [State Mutating / Action Router]
		 * @param {string|HostActionObject} action - Action command or payload.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;
			/** @type {HostActionObject} */
			const actionObj = typeof action === 'string'
				? { type: /** @type {'BUY'|'SELL'|'SWITCH_TAB'|'SELECT_ITEM'|'EXIT'} */ (action) }
				: /** @type {HostActionObject} */ (action);

			if (actionObj.type === 'BUY') {
				buyItem(actionObj.itemId || '');
			} else if (actionObj.type === 'SELL') {
				sellItem(actionObj.itemId || '');
			} else if (actionObj.type === 'SWITCH_TAB') {
				sim.currentTab = actionObj.tab || 'BUY';
			} else if (actionObj.type === 'SELECT_ITEM') {
				sim.selectedItemId = actionObj.itemId || null;
			} else if (actionObj.type === 'EXIT') {
				finalizeMarket();
			}
		},

		computeItemDiff,
	};
	//#endregion
})();

//#region [SEC-05] Global Environment & CommonJS Module Export
if (typeof window !== 'undefined') {
	window.EmberlightMarket = EmberlightMarket;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightMarket;
}
//#endregion