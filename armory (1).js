/* cSpell:words VSRP unsubs targetable unequip UNEQUIP Arcanist UNCONFIGURED SSOT */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: EQUIPMENT & GEAR ENGINE
 * Document Identifier: VSRP-001-ARMORY-CORE
 * Governing Protocol:  VSRP-001
 * Authority:           Ephemeral Simulation Tenant
 * Timestamp:           2026-09-07T08:35:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Formal Lifecycle States & Immutability Utilities
 *   [SEC-02] Host Context & Authoritative Working Memory
 *   [SEC-03] Manifest Resolution & Event Bus Dispatch Helpers
 *   [SEC-04] Equipment Requirement & Stat Validation Logic
 *   [SEC-05] Inventory Swap & Item Equipping Core Routines
 *   [SEC-06] Canonical 9-Method Interface & Host Action Router
 *   [SEC-07] Global Environment & Window Module Export
 * ============================================================================
 */

/* =========================================================================
	 DISTRICT 5: EQUIPMENT & GEAR ENGINE (VSRP-001 COMPLIANT TENANT)
	 -------------------------------------------------------------------------
	 Document Identifier: VSRP-001-ARMORY-CORE
	 Protocol Version:    VSRP-001
	 Classification:      Ephemeral Simulation Tenant
	 Index Anchor:        PRS-001
	 ========================================================================= */
const EmberlightArmoryInstance = (() => {
	"use strict";

	//#region [SEC-01] Formal Lifecycle States & Immutability Utilities
	const State = {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};

	let lifecycleState = State.UNCONFIGURED;

	/**
	 * Validates that the armory engine is operating within an allowed lifecycle state.
	 * [State Assertion]
	 * @param {...string} allowed - Permitted states.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:armory_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
				`Required: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Recursively freezes an object graph to enforce strict immutability.
	 * [State Mutating / Deep Freeze]
	 * @template T
	 * @param {T} obj - Target object.
	 * @returns {Readonly<T>}
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== 'object') return obj;
		Object.keys(obj).forEach((prop) => {
			const val = /** @type {Record<string, any>} */ (obj)[prop];
			if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
				deepFreeze(val);
			}
		});
		return Object.freeze(obj);
	}
	//#endregion

	//#region [SEC-02] Host Context & Authoritative Working Memory
	let hostConfig = null;
	let hostContext = null;
	let sim = null;

	/**
	 * Generates a clean default working memory baseline state.
	 * [Pure Query]
	 * @returns {any}
	 */
	function createDefaultState() {
		return {
			party: [],
			inventory: {},
			selectedCharIndex: 0,
			selectedSlot: 'weapon',
			deltas: {
				partyEquipDelta: [],
				inventoryDelta: {},
			}
		};
	}
	//#endregion

	//#region [SEC-03] Manifest Resolution & Event Bus Dispatch Helpers
	/**
	 * Resolves the authoritative static data manifest.
	 * [Pure Query]
	 * @returns {any}
	 */
	function getActiveManifest() {
		return hostConfig?.manifest || (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {});
	}

	/**
	 * Dispatches sound effect triggers over the host EventBus.
	 * [State Mutating / Bus Dispatch]
	 * @param {string} sfxName - Sound effect token.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('armory:sfx', { sfx: sfxName });
		}
	}
	//#endregion

	//#region [SEC-04] Equipment Requirement & Stat Validation Logic
	/**
	 * Retrieves item definition metadata from active manifest.
	 * [Pure Query]
	 * @param {string} itemId - Item token.
	 * @returns {any}
	 */
	function getItem(itemId) {
		const manifest = getActiveManifest();
		return manifest?.Items?.[itemId] || null;
	}

	/**
	 * Evaluates whether a character fulfills equipment attribute and phenotype constraints.
	 * [Pure Query]
	 * @param {any} char - Character snapshot.
	 * @param {any} item - Item definition.
	 * @returns {boolean}
	 */
	function evaluateEquipRequirements(char, item) {
		if (item.requirements) {
			const manifest = getActiveManifest();
			const stats = typeof manifest.computeCharacterStats === 'function'
				? manifest.computeCharacterStats(char)
				: char;
			for (const [stat, reqVal] of Object.entries(item.requirements)) {
				if (stat === 'level') {
					if ((char.level || 1) < /** @type {number} */ (reqVal)) return false;
				} else if ((stats[stat] || 0) < /** @type {number} */ (reqVal)) {
					return false;
				}
			}
			return true;
		}
		const allowed = item.allowedPhenotypes || item.allowedClasses;
		return !(allowed && !allowed.includes(char.phenotype));
	}
	//#endregion

	//#region [SEC-05] Inventory Swap & Item Equipping Core Routines
	/**
	 * Executes inventory debit/credit and commits equipment slot swap.
	 * [Authoritative State Mutation]
	 * @param {any} char - Target character.
	 * @param {string} slot - Equipment slot ('weapon'|'armor'|'accessory').
	 * @param {string} newItemId - Item token being equipped.
	 * @returns {void}
	 */
	function swapEquippedItem(char, slot, newItemId) {
		const oldItemId = char.equipment[slot];
		if (sim?.inventory) {
			sim.inventory[newItemId] = (sim.inventory[newItemId] || 0) - 1;
		}
		if (sim?.deltas?.inventoryDelta) {
			sim.deltas.inventoryDelta[newItemId] = (sim.deltas.inventoryDelta[newItemId] || 0) - 1;
		}
		if (oldItemId && sim?.inventory) {
			sim.inventory[oldItemId] = (sim.inventory[oldItemId] || 0) + 1;
			if (sim?.deltas?.inventoryDelta) {
				sim.deltas.inventoryDelta[oldItemId] = (sim.deltas.inventoryDelta[oldItemId] || 0) + 1;
			}
		}
		char.equipment[slot] = newItemId;
		sim?.deltas?.partyEquipDelta?.push({
			characterId: char.id,
			slot,
			previousItem: oldItemId,
			newItem: newItemId,
		});
	}

	/**
	 * Validates and equips an inventory item to a character slot.
	 * [Authoritative State Mutation]
	 * @param {string} characterId - Character instance identifier.
	 * @param {string} slot - Target equipment slot.
	 * @param {string} newItemId - Item token to equip.
	 * @returns {boolean}
	 */
	function equipItem(characterId, slot, newItemId) {
		const char = sim?.party?.find((/** @type {any} */ c) => c.id === characterId);
		if (!char) return false;
		if (!char.equipment) {
			char.equipment = { weapon: null, armor: null, accessory: null };
		}
		const newItem = getItem(newItemId);
		if (newItem?.slot !== slot) return false;
		if (!evaluateEquipRequirements(char, newItem)) return false;
		if ((sim?.inventory?.[newItemId] || 0) <= 0) return false;
		swapEquippedItem(char, slot, newItemId);
		dispatchSFX('SELECT');
		return true;
	}

	/**
	 * Unequips item from slot, returning it to inventory stock.
	 * [Authoritative State Mutation]
	 * @param {string} characterId - Character instance identifier.
	 * @param {string} slot - Target slot to clear.
	 * @returns {boolean}
	 */
	function unequipItem(characterId, slot) {
		const char = sim?.party?.find((/** @type {any} */ c) => c.id === characterId);
		if (!char?.equipment?.[slot]) return false;
		const oldItemId = char.equipment[slot];
		if (sim?.inventory) {
			sim.inventory[oldItemId] = (sim.inventory[oldItemId] || 0) + 1;
		}
		if (sim?.deltas?.inventoryDelta) {
			sim.deltas.inventoryDelta[oldItemId] = (sim.deltas.inventoryDelta[oldItemId] || 0) + 1;
		}
		char.equipment[slot] = null;
		sim?.deltas?.partyEquipDelta?.push({
			characterId: char.id,
			slot,
			previousItem: oldItemId,
			newItem: null,
		});
		dispatchSFX('SELECT');
		return true;
	}

	/**
	 * Finalizes armory session state and emits resolution envelope.
	 * [State Mutating / Event Emission]
	 */
	function finalizeArmory() {
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('armory:resolved', {
				partyEquipDelta: structuredClone(sim?.deltas?.partyEquipDelta || []),
				inventoryDelta: structuredClone(sim?.deltas?.inventoryDelta || {}),
			});
		}
	}
	//#endregion

	//#region [SEC-06] Canonical 9-Method Interface & Host Action Router
	const api = {
		configure(cfg) {
			assertLifecycle(State.UNCONFIGURED);
			if (!cfg || typeof cfg !== 'object') {
				throw new TypeError('[VSRP-001:armory_core] configure() requires a non-null configuration dictionary.');
			}
			hostConfig = deepFreeze({ ...cfg });
			lifecycleState = State.CONFIGURED;
		},

		init(context) {
			assertLifecycle(State.CONFIGURED);
			if (!context?.eventBus || typeof context.eventBus.publish !== 'function') {
				throw new Error('[VSRP-001:armory_core] Capability Error: Missing eventBus.publish handle.');
			}
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		reset(snapshot) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
			const baseline = createDefaultState();
			const incoming = snapshot ? structuredClone(snapshot) : {};
			sim = {
				...baseline,
				...incoming,
				party: incoming.party ? incoming.party : [],
				inventory: incoming.inventory ? incoming.inventory : {},
				deltas: {
					partyEquipDelta: [],
					inventoryDelta: {},
				},
			};
			sim.party.forEach((/** @type {any} */ c) => {
				if (!c.equipment) {
					c.equipment = { weapon: null, armor: null, accessory: null };
				}
			});
			lifecycleState = State.READY;
		},

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

		render(renderer) {
			assertLifecycle(State.READY, State.RUNNING);
			if (renderer && typeof renderer.renderArmory === 'function') {
				renderer.renderArmory(this.getState(), (/** @type {any} */ action) => this.handleHostAction(action));
			}
		},

		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return structuredClone(sim);
		},

		getDiagnostics() {
			if (lifecycleState === State.DESTROYED) {
				throw new Error('[VSRP-001:armory_core] Cannot read diagnostics on a DESTROYED instance.');
			}
			return {
				moduleId: 'armory_core',
				lifecycleState,
				selectedChar: sim?.party?.[sim?.selectedCharIndex]?.id || null,
				selectedSlot: sim?.selectedSlot || null,
				pendingEquipDeltas: sim?.deltas?.partyEquipDelta?.length || 0,
			};
		},

		getModuleInfo() {
			return {
				moduleId: 'armory_core',
				version: '1.0.0',
				protocolVersion: 'VSRP-001',
				dependencies: ['manifest'],
				capabilities: [
					'armory',
					'events.armory_item_equipped',
					'events.armory_item_unequipped',
					'events.armory_sfx',
				],
			};
		},

		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			sim = null;
			hostConfig = null;
			hostContext = null;
			lifecycleState = State.DESTROYED;
		},

		handleHostAction(action) {
			if (!action || !sim) return;
			const type = typeof action === 'string' ? action : action.type;
			if (type === 'EQUIP') {
				equipItem(action.characterId, action.slot, action.itemId);
			} else if (type === 'UNEQUIP') {
				unequipItem(action.characterId, action.slot);
			} else if (type === 'SELECT_CHAR') {
				sim.selectedCharIndex = action.index || 0;
			} else if (type === 'SELECT_SLOT') {
				sim.selectedSlot = action.slot || 'weapon';
			} else if (type === 'EXIT') {
				finalizeArmory();
			}
		},
	};

	return api;
	//#endregion
})();

//#region [SEC-07] Global Environment & Window Module Export
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.EmberlightArmory = EmberlightArmoryInstance;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightArmoryInstance;
}
//#endregion