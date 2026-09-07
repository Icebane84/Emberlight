/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PARTY STATUS INSPECTION & FIELD RECOVERY
 * Document Identifier: VSRP-001-STATUS-CORE
 * Governing Protocol:  VSRP-001-Status Inspector
 * Authority:           Ephemeral Simulation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Closure Storage
 *   [SEC-02] Internal Helpers & Lifecycle Guards
 *   [SEC-03] Field Recovery & Spell Execution
 *   [SEC-04] Canonical 9-Method Lifecycle Gateway
 *   [SEC-05] Host Action Dispatcher
 *   [SEC-06] Global Export & Dual-Binding
 * ============================================================================
 */

const EmberlightStatus = (() => {
	//#region [SEC-01] Type Definitions & Closure Storage
	/**
	 * @typedef {'FRONT' | 'BACK'} RowPosition
	 *
	 * @typedef {Object} CharacterState
	 * @property {string} id - Unique instance identifier (e.g., 'hero', 'warrior').
	 * @property {string} name - Display name.
	 * @property {'HERO' | 'WARRIOR' | 'MAGE' | 'HEALER' | string} phenotype - Character class phenotype.
	 * @property {number} hp - Current hit points.
	 * @property {number} maxHp - Maximum hit points.
	 * @property {number} mp - Current mana points.
	 * @property {number} maxMp - Maximum mana points.
	 * @property {number} [atk] - Attack power rating.
	 * @property {number} [def] - Defense rating.
	 * @property {number} [agi] - Agility rating.
	 * @property {boolean} [alive] - Vital status flag.
	 * @property {RowPosition} [row] - Tactical formation row.
	 * @property {string[]} [ailments] - Active status ailments (e.g., 'POISON', 'BURN', 'STUN').
	 * @property {string[]} [unlocked] - Array of unlocked skill tree node IDs.
	 *
	 * @typedef {Record<string, number>} InventoryBag
	 *
	 * @typedef {Object} StatusStateSnapshot
	 * @property {CharacterState[]} party - Detached party roster array.
	 * @property {InventoryBag} inventory - Detached inventory item counts.
	 * @property {boolean} active - Active simulation flag.
	 *
	 * @typedef {Object} EventBusPublisher
	 * @property {function(string, any): void} publish - Synchronous event broadcast method.
	 *
	 * @typedef {Object} HostContext
	 * @property {EventBusPublisher} [eventBus] - Central synchronous event broker.
	 * @property {any} [input] - Input peripheral stream.
	 *
	 * @typedef {Object} HostConfig
	 * @property {any} [manifest] - Canonical game data manifest.
	 *
	 * @typedef {Object} SkillTreeNode
	 * @property {string} id - Unique skill node identifier.
	 * @property {string} label - Display label.
	 * @property {string} [desc] - Description text.
	 * @property {number} [tier] - Node tier level.
	 * @property {'active' | 'passive' | 'keystone' | string} [type] - Node activation type.
	 * @property {'strike' | 'bolt' | 'heal' | string} [subType] - Functional classification.
	 * @property {string} [element] - Elemental affinity.
	 * @property {string} [targetType] - Target domain ('enemy' | 'ally').
	 * @property {number} [power] - Spell power or absolute heal quantity.
	 * @property {number} [mult] - Physical strike damage multiplier.
	 * @property {number} mpCost - Mana expenditure cost.
	 * @property {boolean} [resonance] - Resonance attribute flag.
	 *
	 * @typedef {Object} SFXEventPayload
	 * @property {'HEAL' | 'SELECT' | string} sfx - Audio sound effect identifier.
	 *
	 * @typedef {Object} FieldSpellCastEventPayload
	 * @property {string} casterName - Display name of casting character.
	 * @property {string} targetName - Display name of target character.
	 * @property {string} skillLabel - Display label of cast skill.
	 * @property {number} restored - Hit points restored.
	 * @property {CharacterState[]} party - Deep-cloned party state snapshot.
	 *
	 * @typedef {Object} StatusUpdatedEventPayload
	 * @property {CharacterState[]} party - Deep-cloned party state snapshot.
	 * @property {InventoryBag} [inventory] - Deep-cloned inventory dictionary.
	 *
	 * @typedef {Object} StatusNoticeEventPayload
	 * @property {string} msg - User-facing notification banner string.
	 *
	 * @typedef {Object} StatusResolvedEventPayload
	 * @property {CharacterState[]} party - Deep-cloned party state snapshot.
	 *
	 * @typedef {Object} CastFieldSpellAction
	 * @property {'CAST_FIELD_SPELL'} type
	 * @property {string} casterId
	 * @property {string} targetId
	 * @property {string} skillId
	 *
	 * @typedef {Object} ToggleRowAction
	 * @property {'TOGGLE_ROW'} type
	 * @property {string} characterId
	 *
	 * @typedef {Object} AdministerPotionAction
	 * @property {'ADMINISTER_POTION'} type
	 * @property {string} [targetId]
	 * @property {string} [characterId]
	 *
	 * @typedef {Object} CleanseAilmentsAction
	 * @property {'CLEANSE_AILMENTS'} type
	 * @property {string} [targetId]
	 * @property {string} [characterId]
	 *
	 * @typedef {Object} NoticeAction
	 * @property {'NOTICE'} type
	 * @property {string} msg
	 *
	 * @typedef {Object} ExitAction
	 * @property {'EXIT'} type
	 *
	 * @typedef {CastFieldSpellAction | ToggleRowAction | AdministerPotionAction | CleanseAilmentsAction | NoticeAction | ExitAction} StatusActionObject
	 * @typedef {StatusActionObject | string} StatusActionToken
	 *
	 * @typedef {Object} StatusDiagnostics
	 * @property {'status_core'} moduleId
	 * @property {string} lifecycleState
	 * @property {boolean} hasSim
	 * @property {number} partyCount
	 *
	 * @typedef {Object} StatusModuleInfo
	 * @property {'status_core'} moduleId
	 * @property {string} version
	 * @property {'VSRP-001'} protocolVersion
	 * @property {string[]} dependencies
	 * @property {string[]} capabilities
	 *
	 * @typedef {Object} StatusRenderer
	 * @property {function(StatusStateSnapshot, function(StatusActionToken): void): void} renderStatus
	 *
	 * @typedef {Object} IEmberlightStatus
	 * @property {function(HostConfig=): void} configure - Ingests host configuration.
	 * @property {function(HostContext): void} init - Initializes runtime context.
	 * @property {function(Partial<StatusStateSnapshot>=): void} reset - Ingests detached state snapshot.
	 * @property {function(number=, HostContext=): void} update - Frame ticker step.
	 * @property {function(StatusRenderer=): void} render - Projects detached state to presentation.
	 * @property {function(): StatusStateSnapshot} getState - Returns detached POJO snapshot.
	 * @property {function(): StatusDiagnostics} getDiagnostics - Returns module health telemetry.
	 * @property {function(): StatusModuleInfo} getModuleInfo - Returns module metadata descriptor.
	 * @property {function(): void} destroy - Tears down module and releases references.
	 * @property {function(StatusActionToken): void} handleHostAction - Action-inversion command router.
	 */

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
	/** @type {HostConfig | null} */
	let hostConfig = null;
	/** @type {HostContext | null} */
	let hostContext = null;

	// Domestic Simulation Vault
	/** @type {{ party: CharacterState[], inventory: InventoryBag, active: boolean } | null} */
	let sim = null;
	//#endregion

	//#region [SEC-02] Internal Helpers & Lifecycle Guards
	/**
	 * Deeply freezes an object graph recursively to guarantee immutability.
	 * Pure utility procedure.
	 *
	 * @template T
	 * @param {T} obj - Target object or primitive to immutably freeze.
	 * @returns {Readonly<T>} Deeply frozen object reference.
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
	 * Lifecycle state assertion guard. Logs a warning if the current state deviates from expected.
	 * Pure assertion procedure.
	 *
	 * @param {string} expectedState - Expected VSRP-001 lifecycle state identifier.
	 * @returns {void}
	 */
	function assertLifecycle(expectedState) {
		if (lifecycleState !== expectedState) {
			console.warn(
				`[EmberlightStatus] Lifecycle Warning: Expected ${expectedState}, currently in ${lifecycleState}`
			);
		}
	}

	/**
	 * Resolves the canonical game data manifest from host configuration or global scope.
	 * Pure accessor procedure.
	 *
	 * @returns {any} Authoritative game manifest dictionary.
	 */
	function getActiveManifest() {
		if (hostConfig?.manifest) return hostConfig.manifest;
		if (typeof EmberlightManifest !== 'undefined') return EmberlightManifest;
		return {};
	}
	//#endregion

	//#region [SEC-03] Field Recovery & Spell Execution

	/**
	 * Executes an overworld field healing spell between two party members.
	 * State-mutating procedure: deducts caster MP, restores target HP, and publishes audio/event envelopes.
	 *
	 * @param {string} casterId - Caster character instance ID.
	 * @param {string} targetId - Recipient target character instance ID.
	 * @param {string} skillId - Skill tree node ID to invoke.
	 * @returns {boolean} True if spell cast succeeded and state was committed; false otherwise.
	 */
	function executeFieldSpell(casterId, targetId, skillId) {
		if (!sim || !Array.isArray(sim.party)) return false;

		const caster = sim.party.find((c) => c.id === casterId);
		const target = sim.party.find((c) => c.id === targetId);
		if (!caster?.alive || !target?.alive) return false;

		const manifest = getActiveManifest();
		const tree = manifest.SkillTrees?.[caster.phenotype] || {};
		/** @type {SkillTreeNode | null} */
		let skill = null;
		Object.values(tree).forEach((branch) => {
			branch?.forEach((node) => {
				if (node.id === skillId) skill = node;
			});
		});

		if (skill?.subType !== 'heal') return false;
		if (!caster.unlocked?.includes(skillId)) return false;
		if (caster.mp < skill.mpCost) return false;

		caster.mp -= skill.mpCost;
		const missingHp = target.maxHp - target.hp;
		const restored = skill.power === 999 ? missingHp : Math.min(skill.power, missingHp);
		target.hp += restored;

		if (hostContext?.eventBus?.publish) {
			/** @type {SFXEventPayload} */
			const sfxPayload = { sfx: 'HEAL' };
			hostContext.eventBus.publish('overworld:sfx', sfxPayload);

			/** @type {FieldSpellCastEventPayload} */
			const spellPayload = {
				casterName: caster.name,
				targetName: target.name,
				skillLabel: skill.label,
				restored,
				party: structuredClone(sim.party),
			};
			hostContext.eventBus.publish('status:field_spell_cast', spellPayload);
		}

		return true;
	}
	//#endregion

	/**
	 * Handles casting field spells.
	 * @param {CastFieldSpellAction} act - Action object.
	 * @returns {void}
	 */
	function handleCastFieldSpell(act) {
		executeFieldSpell(act.casterId, act.targetId, act.skillId);
	}

	/**
	 * Handles toggling character combat rows.
	 * @param {ToggleRowAction} act - Action object.
	 * @returns {void}
	 */
	function handleToggleRow(act) {
		if (!sim) return;
		const char = sim.party.find((c) => c.id === act.characterId);
		if (!char) return;
		char.row = char.row === 'BACK' ? 'FRONT' : 'BACK';
		if (hostContext?.eventBus?.publish) {
			/** @type {SFXEventPayload} */
			const sfxPayload = { sfx: 'SELECT' };
			hostContext.eventBus.publish('overworld:sfx', sfxPayload);

			/** @type {StatusUpdatedEventPayload} */
			const updatePayload = {
				party: structuredClone(sim.party),
			};
			hostContext.eventBus.publish('status:updated', updatePayload);
		}
	}

	/**
	 * Handles administering potions to party members.
	 * @param {AdministerPotionAction} act - Action object.
	 * @returns {void}
	 */
	function handleAdministerPotion(act) {
		if (!sim) return;
		const targetId = act.targetId || act.characterId;
		const target = sim.party.find((c) => c.id === targetId);
		if (!target || !(target.alive ?? true) || (sim.inventory?.POTION || 0) <= 0) return;
		const maxHp = target.maxHp || 30;
		if (target.hp >= maxHp) return;

		sim.inventory.POTION -= 1;
		const healed = Math.min(25, maxHp - target.hp);
		target.hp += healed;
		if (hostContext?.eventBus?.publish) {
			/** @type {SFXEventPayload} */
			const sfxPayload = { sfx: 'HEAL' };
			hostContext.eventBus.publish('overworld:sfx', sfxPayload);

			/** @type {StatusUpdatedEventPayload} */
			const updatePayload = {
				party: structuredClone(sim.party),
				inventory: structuredClone(sim.inventory),
			};
			hostContext.eventBus.publish('status:updated', updatePayload);
		}
	}

	/**
	 * Handles cleansing character ailments.
	 * @param {CleanseAilmentsAction} act - Action object.
	 * @returns {void}
	 */
	function handleCleanseAilments(act) {
		if (!sim) return;
		const targetId = act.targetId || act.characterId;
		const target = sim.party.find((c) => c.id === targetId);
		if (!target) return;
		target.ailments = [];
		if (hostContext?.eventBus?.publish) {
			/** @type {SFXEventPayload} */
			const sfxPayload = { sfx: 'HEAL' };
			hostContext.eventBus.publish('overworld:sfx', sfxPayload);

			/** @type {StatusUpdatedEventPayload} */
			const updatePayload = {
				party: structuredClone(sim.party),
			};
			hostContext.eventBus.publish('status:updated', updatePayload);
		}
	}

	/**
	 * Handles notice display action tokens.
	 * @param {NoticeAction} act - Action object.
	 * @returns {void}
	 */
	function handleNotice(act) {
		if (hostContext?.eventBus?.publish && act.msg) {
			/** @type {StatusNoticeEventPayload} */
			const noticePayload = { msg: act.msg };
			hostContext.eventBus.publish('status:notice', noticePayload);
		}
	}

	/**
	 * Handles exit action tokens.
	 * @returns {void}
	 */
	function handleExit() {
		if (!sim) return;
		if (hostContext?.eventBus?.publish) {
			/** @type {StatusResolvedEventPayload} */
			const resolvedPayload = {
				party: structuredClone(sim.party),
			};
			hostContext.eventBus.publish('status:resolved', resolvedPayload);
		}
	}

	return {
		//#region [SEC-04] Canonical 9-Method Lifecycle Gateway
		/**
		 * Ingests and locks host configuration baseline.
		 * State-mutating lifecycle gateway (transitions to CONFIGURED).
		 *
		 * @param {HostConfig} [config] - Host configuration dictionary.
		 * @returns {void}
		 */
		configure(config) {
			assertLifecycle(State.UNCONFIGURED);
			hostConfig = deepFreeze({ ...config });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Binds host runtime context and event bus broker.
		 * State-mutating lifecycle gateway (transitions to INITIALIZED).
		 *
		 * @param {HostContext} context - Authoritative runtime execution context.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Ingests external state snapshot into Faraday-isolated domestic vault.
		 * State-mutating lifecycle gateway (transitions to READY).
		 *
		 * @param {Partial<StatusStateSnapshot>} [snapshot={}] - External party and inventory snapshot.
		 * @returns {void}
		 */
		reset(snapshot = {}) {
			const incomingParty = Array.isArray(snapshot.party) ? snapshot.party : [];
			sim = {
				party: structuredClone(incomingParty),
				inventory: structuredClone(snapshot.inventory || {}),
				active: true,
			};
			lifecycleState = State.READY;
		},

		/**
		 * Steps simulation frame ticker.
		 * State-mutating lifecycle gateway (transitions to RUNNING).
		 *
		 * @param {number} [_dt] - Delta time elapsed since last frame in seconds.
		 * @param {HostContext} [_context] - Ephemeral frame host context.
		 * @returns {void}
		 */
		update(_dt, _context) {
			if (!sim?.active) return;
			lifecycleState = State.RUNNING;
		},

		/**
		 * Projects domestic state into peripheral presentation renderer without leaking authority.
		 * Pure projection lifecycle gateway.
		 *
		 * @param {StatusRenderer} [renderer] - Presentation renderer implementing renderStatus.
		 * @param {any} [_context] - Host context snapshot.
		 * @returns {void}
		 */
		render(renderer, _context) {
			if (renderer && typeof renderer.renderStatus === 'function') {
				renderer.renderStatus(this.getState(), (action) => this.handleHostAction(action));
			}
		},

		/**
		 * Extracts a detached POJO snapshot of the domestic simulation state.
		 * Pure extraction accessor.
		 *
		 * @returns {StatusStateSnapshot} Detached state snapshot.
		 */
		getState() {
			if (!sim) return { party: [], inventory: {}, active: false };
			return {
				party: structuredClone(sim.party),
				inventory: structuredClone(sim.inventory),
				active: sim.active,
			};
		},

		/**
		 * Telemetry diagnostic probe reporting internal health, memory, and lifecycle status.
		 * Pure diagnostic accessor.
		 *
		 * @returns {StatusDiagnostics} Health diagnostic telemetry.
		 */
		getDiagnostics() {
			return {
				moduleId: 'status_core',
				lifecycleState,
				hasSim: !sim,
				partyCount: sim?.party?.length || 0,
			};
		},

		/**
		 * Formal capability and metadata contract declaration.
		 * Pure manifest accessor.
		 *
		 * @returns {StatusModuleInfo} Constitutional module information descriptor.
		 */
		getModuleInfo() {
			return {
				moduleId: 'status_core',
				version: '1.1.0',
				protocolVersion: 'VSRP-001',
				dependencies: ['manifest'],
				capabilities: [
					'status_inspection',
					'field_spell_casting',
					'events.status_field_spell_cast',
				],
			};
		},

		/**
		 * Tears down domestic simulation vault and releases all host handles.
		 * State-mutating lifecycle gateway (transitions to DESTROYED).
		 *
		 * @returns {void}
		 */
		destroy() {
			sim = null;
			hostConfig = null;
			hostContext = null;
			lifecycleState = State.DESTROYED;
		},
		//#endregion

		//#region [SEC-05] Host Action Dispatcher
		/**
		 * Dispatches normalized action tokens received from UI / Action-Inversion gateway.
		 * State-mutating procedure: processes row toggling, field potions, ailment cleanses, and exit events.
		 *
		 * @param {StatusActionToken} action - Normalized action token or payload object.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;

			/** @type {StatusActionObject} */
			const act = typeof action === 'string' ? { type: /** @type {any} */ (action) } : action;

			switch (act.type) {
				case 'CAST_FIELD_SPELL':
					handleCastFieldSpell(/** @type {CastFieldSpellAction} */(act));
					break;

				case 'TOGGLE_ROW':
					handleToggleRow(/** @type {ToggleRowAction} */(act));
					break;

				case 'ADMINISTER_POTION':
					handleAdministerPotion(/** @type {AdministerPotionAction} */(act));
					break;

				case 'CLEANSE_AILMENTS':
					handleCleanseAilments(/** @type {CleanseAilmentsAction} */(act));
					break;

				case 'NOTICE':
					handleNotice(/** @type {NoticeAction} */(act));
					break;

				case 'EXIT':
					handleExit();
					break;

				default:
					break;
			}
		},
		//#endregion
	};
})();

//#region [SEC-06] Global Export & Dual-Binding
if (typeof window !== 'undefined') {
	window.EmberlightStatus = EmberlightStatus;
}
if (typeof module !== 'undefined') {
	module.exports = EmberlightStatus;
}
//#endregion