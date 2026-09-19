/* cSpell:words VSRP KNOCKBACK unsubs targetable Ailments Malakor catacomb Cataclysm miasma portcullis UNCONFIGURED SSOT Backline backline channeler pheno firebolt */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMBAT SIMULATION CORE
 * Document Identifier: VSRP-001-COMBAT-FACTORY
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-COMBAT-002
 * Authority:           Ephemeral Simulation Tenant
 * Timestamp:           2026-09-06T20:45:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-00] Domain Type Contracts & JSDoc Schemas
 *   [SEC-01] Lifecycle States & Mathematical Affinity Utilities
 *   [SEC-02] Combat Instance Factory & Ephemeral Simulation Core
 *   [SEC-03] Deterministic PRNG & Combat Telemetry Logger
 *   [SEC-04] Status Ailment Engine & Turn Delay Pacing
 *   [SEC-05] Formation Topology & Vanguard Interception Logic
 *   [SEC-06] Enemy AI Targeting & Boss Phase Transformation
 *   [SEC-07] Player Kinetic Actions & Tactical Displacement
 *   [SEC-08] Skill Damage Resolution & Battle Termination Gates
 *   [SEC-09] Pacing Turn Loop & Headless Simulation Engine
 *   [SEC-10] Command Hub Navigation & View Action Router
 *   [SEC-11] Canonical 9-Method Lifecycle Gateway & Host Action Bus
 *   [SEC-12] Factory Instance Generator & Module Export
 * ============================================================================
 */

//#region [SEC-00] Domain Type Contracts & JSDoc Schemas

/**
 * @typedef {Object} AffinityResolution
 * @property {'NORMAL'|'WEAK'|'RESIST'} label - Affinity categorization descriptor.
 * @property {number} multiplier - Damage scaling scalar factor.
 */

/**
 * @typedef {Object} AffinityDamageResult
 * @property {number} finalDmg - Calculated net damage applied.
 * @property {boolean} isWeakness - Flag asserting target vulnerability.
 * @property {boolean} isResisted - Flag asserting target resistance.
 * @property {number} multiplier - Applied affinity multiplier.
 */

/**
 * @typedef {Object} CombatUnit
 * @property {string} id - Unique combat entity runtime ID.
 * @property {string} [key] - Manifest enemy key identifier.
 * @property {string} name - Entity display name.
 * @property {'HERO'|'WARRIOR'|'MAGE'|'HEALER'} [phenotype] - Hero phenotype archetype.
 * @property {string} [sprite] - Unicode fallback glyph or display token.
 * @property {number} hp - Current hit points.
 * @property {number} maxHp - Maximum hit point ceiling.
 * @property {number} mp - Current mana points.
 * @property {number} maxMp - Maximum mana ceiling.
 * @property {number} atk - Effective attack rating.
 * @property {number} def - Effective physical mitigation defense rating.
 * @property {number} agi - Effective agility pacing value.
 * @property {'FRONT'|'BACK'|'BOTH'} row - Tactical formation row placement.
 * @property {number} accumulatedDelay - Current CTB delay accumulator.
 * @property {boolean} alive - Life status assertion flag.
 * @property {boolean} [isBoss] - Boss classification flag.
 * @property {boolean} [phaseTwoActive] - Boss enraged phase 2 activation flag.
 * @property {number} [phaseTwoThreshold] - Boss phase transition HP percentage.
 * @property {{ sprite?: string, atk: number, def: number, agi: number }} [phaseTwoStats] - Phase 2 enraged stats.
 * @property {Array<{ type: string, power?: number, label: string, sfx?: string }>} [rotation] - Scripted boss attack rotation.
 * @property {{ id?: string, type?: string, chance?: number, duration?: number }} [ailmentProc] - Ailment proc parameters.
 * @property {string|null} [weakness] - Elemental weakness descriptor.
 * @property {string|null} [resistance] - Elemental resistance descriptor.
 * @property {string} [targeting] - AI targeting priority scheme.
 * @property {{ exp: number, gold: number, item?: string }} [rewards] - Spoils awarded on defeat.
 * @property {Array<{ id: string, duration: number }>} ailments - Active status conditions.
 * @property {boolean} [isGuarding] - Active defensive guard stance flag.
 * @property {number} [level] - Character progression level.
 * @property {number} [exp] - Character earned experience.
 * @property {number} [skillPoints] - Character total skill points.
 * @property {number} [unspentSP] - Character unspent skill points.
 * @property {string[]} [unlockedNodes] - Character attuned Aether node IDs.
 * @property {string[]} [unlocked] - Legacy unlocked node list.
 * @property {Record<string, string|null>} [equipment] - Equipped loadout mapping.
 */

/**
 * @typedef {Object} CombatSkillNode
 * @property {string} id - Unique skill identifier.
 * @property {string} label - Display name of skill.
 * @property {string} [desc] - Descriptive summary.
 * @property {string} [description] - Alternative descriptive summary field.
 * @property {number} mpCost - Mana expenditure to activate.
 * @property {string} [element] - Elemental damage affinity.
 * @property {'strike'|'bolt'|'spell'|'heal'} [subType] - Mechanical kinetic execution class.
 * @property {'enemy'|'ally'} [targetType] - Target affiliation scope.
 * @property {number} [mult] - Physical scaling multiplier.
 * @property {number} [power] - Spell potency magnitude.
 * @property {'KNOCKBACK'|'PULL'} [displacement] - Tactical displacement trigger.
 * @property {boolean} [isRanged] - Explicit ranged attack classification flag.
 * @property {boolean} [resonance] - Channeling requirement flag.
 * @property {number} [tier] - Constellation skill tier.
 */

/**
 * @typedef {Object} CombatActionPayload
 * @property {string} type - Action type token (ATTACK, SKILL, ITEM, GUARD, FLEE, etc.).
 * @property {number} [targetIndex] - Target roster index.
 * @property {CombatSkillNode} [skill] - Skill definition to execute.
 * @property {CombatSkillNode} [skillNode] - Alternative skill node parameter.
 * @property {string} [itemId] - Item identifier for pouch actions.
 * @property {boolean} [isAlly] - Target affiliation indicator.
 * @property {'ATTACK'|'SKILLS'|'GUARD'|'POUCH'} [tab] - Primary action tab selector.
 */

/**
 * @typedef {Object} TurnQueueEntry
 * @property {'party'|'enemy'} type - Affiliation of queued unit.
 * @property {CombatUnit} entity - Reference to queued combatant.
 * @property {number} [effectiveAgi] - Pacing agility with environmental adjustments.
 */

/**
 * @typedef {Object} CombatSimState
 * @property {number} prngState - 32-bit PRNG seed state accumulator.
 * @property {string} phase - Current simulation state machine phase.
 * @property {string} encounterKey - Active encounter table identifier.
 * @property {string} terrain - Environmental tile terrain token.
 * @property {number} roundCount - Incremental combat round counter.
 * @property {TurnQueueEntry[]} turnQueue - Paced action execution queue.
 * @property {number} activeTurnIndex - Index of currently active entity in turn queue.
 * @property {CombatUnit[]} party - Allied party member roster.
 * @property {CombatUnit[]} enemies - Hostile enemy roster.
 * @property {Record<string, number>} inventory - Mutable squad field pouch inventory.
 * @property {number} gold - Mutable squad gold counter.
 * @property {{ exp: number, gold: number }} rewards - Spoils accumulated for victory resolution.
 * @property {Array<{ msg: string, type: string }>} log - Authoritative battle log history.
 * @property {CombatSkillNode|null} pendingSkill - Skill awaiting target designation.
 * @property {string|null} [pendingItem] - Item awaiting target designation.
 * @property {'ATTACK'|'SKILLS'|'GUARD'|'POUCH'} [selectedTab] - Currently active command hub tab.
 * @property {number} bossRotationIndex - Pacing counter for scripted boss action patterns.
 * @property {number} [lastGainedGold] - Victory gold reward telemetry.
 * @property {number} [lastGainedExp] - Victory experience reward telemetry.
 */

/**
 * @typedef {Object} CombatInstanceOptions
 * @property {boolean} [isHeadless=false] - Whether running detached headless simulation.
 * @property {boolean} [autoRun=false] - Whether battle executes automatically to completion.
 */

/**
 * @typedef {Object} CombatDiagnostics
 * @property {string} moduleId - Authoritative module registration token.
 * @property {string} lifecycleState - Current VSRP-001 lifecycle phase.
 * @property {string|undefined} phase - Current combat simulation phase.
 * @property {number|undefined} turnIndex - Current turn queue cursor position.
 * @property {number} livingParty - Count of conscious allied party members.
 * @property {number} livingEnemies - Count of active surviving hostile units.
 * @property {boolean} isHeadless - Headless execution assertion flag.
 */

/**
 * @typedef {Object} CombatModuleInfo
 * @property {string} moduleId - Canonical module identifier.
 * @property {string} version - Semantic version string.
 * @property {string} protocolVersion - Governing protocol standard.
 * @property {string[]} dependencies - Declared subsystem dependencies.
 * @property {string[]} capabilities - Implemented tenant capability tokens.
 */

//#endregion

const EmberlightCombat = (() => {
	//#region [SEC-01] Lifecycle States & Mathematical Affinity Utilities

	/** @enum {string} */
	const State = {
		UNCONFIGURED: "UNCONFIGURED",
		CONFIGURED: "CONFIGURED",
		INITIALIZED: "INITIALIZED",
		READY: "READY",
		RUNNING: "RUNNING",
		DESTROYED: "DESTROYED",
	};

	/**
	 * Recursively seals an object graph against mutation.
	 * [State Mutating / Deep Freeze]
	 * @template T
	 * @param {T} obj - Target object.
	 * @returns {Readonly<T>} Immutable reference.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== "object") return obj;
		Object.keys(obj).forEach((prop) => {
			const val = /** @type {Record<string, any>} */ (obj)[prop];
			if (typeof val === "object" && val !== null && !Object.isFrozen(val)) {
				deepFreeze(val);
			}
		});
		return Object.freeze(obj);
	}

	/**
	 * Creates an empty baseline state shape for combat simulation memory.
	 * [Pure Query]
	 * @returns {CombatSimState} Clean state dictionary.
	 */
	function createDefaultState() {
		return {
			prngState: 1337,
			phase: "IDLE",
			encounterKey: "DEFAULT",
			terrain: "PATH",
			roundCount: 0,
			turnQueue: [],
			activeTurnIndex: 0,
			party: [],
			enemies: [],
			inventory: {},
			gold: 0,
			rewards: { exp: 0, gold: 0 },
			log: [],
			pendingSkill: null,
			pendingItem: null,
			selectedTab: "ATTACK",
			bossRotationIndex: 0,
		};
	}

	/**
	 * Resolves elemental damage effectiveness against target defensive profile.
	 * [Pure Query]
	 * @param {string|undefined|null} attackElement - Attack elemental category.
	 * @param {CombatUnit|null|undefined} target - Target defending unit.
	 * @returns {AffinityResolution} Evaluated affinity coefficient.
	 */
	function resolveAffinity(attackElement, target) {
		if (!attackElement || !target) return { label: "NORMAL", multiplier: 1.0 };
		const elem = attackElement.toUpperCase();
		if (target.weakness?.toUpperCase() === elem) {
			return { label: "WEAK", multiplier: 1.5 };
		}
		if (target.resistance?.toUpperCase() === elem) {
			return { label: "RESIST", multiplier: 0.5 };
		}
		return { label: "NORMAL", multiplier: 1.0 };
	}

	/**
	 * Computes final damage scaling from raw base damage and elemental properties.
	 * [Pure Query]
	 * @param {number} rawDmg - Raw input damage value.
	 * @param {string|undefined|null} attackElement - Attack elemental category.
	 * @param {CombatUnit} target - Target defending unit.
	 * @returns {AffinityDamageResult} Result payload including multipliers and weakness flags.
	 */
	function calculateAffinityDamage(rawDmg, attackElement, target) {
		const affinity = resolveAffinity(attackElement, target);
		const isWeakness = affinity.label === "WEAK";
		const isResisted = affinity.label === "RESIST";
		const finalDmg = Math.max(1, Math.floor(rawDmg * affinity.multiplier));
		return {
			finalDmg,
			isWeakness,
			isResisted,
			multiplier: affinity.multiplier,
		};
	}

	/**
	 * Resolves display tags for affinity hits.
	 * [Pure Query]
	 * @param {boolean} isWeakness
	 * @param {boolean} isResisted
	 * @returns {string}
	 */
	function resolveAffinityTag(isWeakness, isResisted) {
		if (isWeakness) return " 💥 [WEAKNESS!]";
		if (isResisted) return " 🛡️ [RESISTED]";
		return "";
	}

	/**
	 * Resolves display tag for skill strikes.
	 * [Pure Query]
	 * @param {boolean} isGuaranteedCrit
	 * @param {boolean} isWeakness
	 * @param {boolean} isResisted
	 * @returns {string}
	 */
	function resolveSkillHitTag(isGuaranteedCrit, isWeakness, isResisted) {
		if (isGuaranteedCrit) return " 🌟 [CRITICAL HARMONIC STRIKE!]";
		if (isWeakness) return " 💥 [WEAKNESS!]";
		if (isResisted) return " 🛡️ [RESISTED]";
		return "";
	}

	/**
	 * Hydrates and guarantees required combat fields on incoming party snapshot.
	 * [Pure Query]
	 * @param {Array<Partial<CombatUnit>>} [partySnapshot=[]] - Input squad array.
	 * @returns {CombatUnit[]} Hydrated combatant list.
	 */
	function hydratePartySnapshot(partySnapshot = []) {
		return partySnapshot.map((c) => {
			const isBack = c.phenotype === "MAGE" || c.phenotype === "HEALER";
			const isAlive = c.alive !== false && (c.hp === undefined || c.hp > 0);
			return {
				...structuredClone(c),
				id: c.id || "hero_unit",
				name: c.name || "Hero",
				phenotype: c.phenotype || "HERO",
				level: c.level || 1,
				alive: isAlive,
				hp: isAlive ? Math.max(1, c.hp || 30) : 0,
				maxHp: c.maxHp || c.hp || 30,
				mp: c.mp !== undefined ? c.mp : c.maxMp || 10,
				maxMp: c.maxMp || 10,
				atk: c.atk || 10,
				def: c.def || 5,
				agi: c.agi || 5,
				row: c.row || (isBack ? "BACK" : "FRONT"),
				accumulatedDelay: 1000 / Math.max(1, c.agi || 10),
				ailments: Array.isArray(c.ailments) ? [...c.ailments] : [],
			};
		});
	}

	/**
	 * Extracts attuned active skills from the Aether Matrix constellation graph.
	 * [Pure Query - Outer Scope]
	 * @param {string[]} unlockedIds - List of attuned node identifiers.
	 * @param {any} manifest - Active declarative manifest reference.
	 * @returns {CombatSkillNode[]} Array of executable skills.
	 */
	function collectAetherActiveSkills(unlockedIds, manifest) {
		/** @type {CombatSkillNode[]} */
		const skills = [];
		if (!manifest?.AetherNodes) return skills;
		for (const nodeId of unlockedIds) {
			const node = manifest.AetherNodes[nodeId];
			if (node?.type === "active" && !skills.some((s) => s.id === node.id)) {
				skills.push(node);
			}
		}
		return skills;
	}

	/**
	 * Extracts attuned active skills from legacy archetype skill trees.
	 * [Pure Query - Outer Scope]
	 * @param {string[]} unlockedIds - List of attuned node identifiers.
	 * @param {string} phenotype - Character class archetype.
	 * @param {any} manifest - Active declarative manifest reference.
	 * @returns {CombatSkillNode[]} Array of executable skills.
	 */
	function collectSkillTreeActiveSkills(unlockedIds, phenotype, manifest) {
		/** @type {CombatSkillNode[]} */
		const skills = [];
		const tree = manifest?.SkillTrees?.[phenotype];
		if (!tree) return skills;
		for (const branch of Object.values(tree)) {
			if (Array.isArray(branch)) {
				for (const node of branch) {
					if (
						node.type === "active" &&
						unlockedIds.includes(node.id) &&
						!skills.some((s) => s.id === node.id)
					) {
						skills.push(node);
					}
				}
			}
		}
		return skills;
	}

	/**
	 * Resolves baseline fallback skill when a hero has no active nodes attuned.
	 * [Pure Query - Outer Scope]
	 * @param {string} phenotype - Character class archetype.
	 * @returns {CombatSkillNode} Fallback active skill.
	 */
	function getDefaultPhenotypeSkill(phenotype) {
		if (phenotype === "MAGE") {
			return {
				id: "mag_des_1",
				label: "Flame Surge",
				mpCost: 5,
				element: "FIRE",
				description: "Unleash searing firebolt with burn chance.",
				subType: "bolt",
				power: 12,
			};
		}
		if (phenotype === "HEALER") {
			return {
				id: "hea_lum_1",
				label: "Soothing Light",
				mpCost: 4,
				element: "HOLY",
				description: "Restores 25 HP to target ally.",
				targetType: "ally",
				subType: "heal",
				power: 25,
			};
		}
		return {
			id: "war_vor_1",
			label: "Cleave Strike",
			mpCost: 4,
			element: "PHYSICAL",
			description: "Heavy melee slash deal 1.5x damage.",
			subType: "strike",
			mult: 1.5,
		};
	}

	//#endregion

	//#region [SEC-02] Combat Instance Factory & Ephemeral Simulation Core

	/**
	 * Factory producing an isolated, VSRP-001 compliant combat simulation instance.
	 * [State Mutating / Factory Constructor]
	 * @param {CombatInstanceOptions} [instanceOptions={}] - Configuration options.
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

		/** @type {CombatSimState|null} */
		let sim = null;

		/** @type {Array<{ fn: function():void, remainingMs: number }>} */
		let scheduledTasks = [];

		/** @type {Array<function():void>} */
		let headlessEventQueue = [];

		/**
		 * Validates tenant lifecycle state prior to method execution.
		 * [State Assertion]
		 * @param {...string} allowed - Permitted lifecycle states.
		 * @returns {void}
		 */
		function assertLifecycle(...allowed) {
			if (!allowed.includes(lifecycleState)) {
				throw new Error(
					`[VSRP-001:combat_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
					`Required: ${allowed.join(" | ")}`,
				);
			}
		}

		/**
		 * Resolves the authoritative active declarative data manifest.
		 * [Pure Query]
		 * @returns {any} EmberlightManifest SSOT reference.
		 */
		function getActiveManifest() {
			return (
				hostConfig?.manifest ||
				(typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {})
			);
		}

		//#endregion

		//#region [SEC-03] Deterministic PRNG & Combat Telemetry Logger

		/**
		 * Dispatches an acoustic audio cue over the host EventBus.
		 * [State Mutating / Bus Dispatch]
		 * @param {string} sfxName - Sound effect registry token.
		 * @returns {void}
		 */
		function dispatchSFX(sfxName) {
			if (!isHeadless && hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish("combat:sfx", { sfx: sfxName });
			}
		}

		/**
		 * Generates a deterministic pseudo-random float in range [0.0, 1.0).
		 * [Authoritative State Mutation]
		 * @returns {number} Deterministic pseudo-random value.
		 */
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

		/**
		 * Appends an event to the authoritative simulation log and emits bus telemetry.
		 * [Authoritative State Mutation]
		 * @param {string} msg - Narrative description text.
		 * @param {'system'|'ember'|'damage'|'heal'} [type='system'] - Log categorization category.
		 * @returns {void}
		 */
		function appendLog(msg, type = "system") {
			if (!sim) return;
			sim.log.push({ msg, type });
			if (!isHeadless) {
				hostContext?.eventBus?.publish?.("combat:log", { msg, type });
			}
		}

		//#endregion

		//#region [SEC-04] Status Ailment Engine & Turn Delay Pacing

		/**
		 * Afflicts a target unit with a status condition for a defined duration.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} target - Target recipient entity.
		 * @param {string} ailmentId - Condition token ('POISON', 'BURN', 'STUN').
		 * @param {number} [duration=3] - Lifetime in active turns.
		 * @returns {void}
		 */
		function applyAilment(target, ailmentId, duration = 3) {
			if (!target?.alive) return;
			if (!target.ailments) target.ailments = [];
			const existing = target.ailments.find((a) => a.id === ailmentId);
			if (existing) {
				existing.duration = Math.max(existing.duration, duration);
			} else {
				target.ailments.push({ id: ailmentId, duration });
			}
			appendLog(`${target.name} is afflicted with ${ailmentId}!`, "damage");
		}

		/**
		 * Evaluates damage and turn skipping for all ailments on the active combatant.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} target - Active entity being evaluated.
		 * @returns {boolean} True if the entity is stunned and cannot act.
		 */
		function tickAilments(target) {
			if (!target?.alive || !target.ailments || target.ailments.length === 0)
				return false;
			const manifest = getActiveManifest();
			let isStunned = false;

			for (let i = target.ailments.length - 1; i >= 0; i--) {
				const active = target.ailments[i];
				const def = manifest.Ailments?.[active.id];
				if (def) {
					if (def.type === "skip_turn") {
						isStunned = true;
						appendLog(
							`${target.name} is stunned and loses their turn!`,
							"ember",
						);
					} else if (def.type === "dot") {
						const res = def.tick(target);
						appendLog(res.msg, "damage");
						if (target.hp <= 0) {
							target.hp = 0;
							target.alive = false;
							appendLog(`${target.name} succumbed to ${active.id}!`, "damage");
						}
					}
				}
				active.duration -= 1;
				if (active.duration <= 0) {
					appendLog(`${target.name} recovered from ${active.id}.`, "system");
					target.ailments.splice(i, 1);
				}
			}
			return isStunned;
		}

		/**
		 * Enqueues an asynchronous delayed task for visual staging or headless evaluation.
		 * [State Mutating]
		 * @param {function():void} fn - Action to execute.
		 * @param {number} delayMs - Delay duration in milliseconds.
		 * @returns {void}
		 */
		function schedule(fn, delayMs) {
			if (isHeadless) {
				headlessEventQueue.push(fn);
			} else {
				scheduledTasks.push({ fn, remainingMs: delayMs });
			}
		}

		/**
		 * Advances elapsed clock time for all active scheduled tasks.
		 * [State Mutating]
		 * @param {number} dt - Frame delta time in seconds.
		 * @returns {void}
		 */
		function advanceScheduledTasks(dt) {
			if (!Number.isFinite(dt) || dt <= 0 || scheduledTasks.length === 0)
				return;

			/** @type {Array<function():void>} */
			const readyTasks = [];
			scheduledTasks = scheduledTasks.filter((task) => {
				task.remainingMs -= dt * 1000;
				if (task.remainingMs <= 0) {
					readyTasks.push(task.fn);
					return false;
				}
				return true;
			});

			readyTasks.forEach((task) => {
				task();
			});
		}

		//#endregion

		//#region [SEC-05] Formation Topology & Vanguard Interception Logic

		/**
		 * Emits an attack lunge kinetic animation trigger over the EventBus.
		 * [Presentation Trigger]
		 * @param {boolean} isParty - True if attacker is allied squad member.
		 * @param {number} index - Attacker roster position.
		 * @returns {void}
		 */
		function triggerAttackerLunge(isParty, index) {
			if (isHeadless) return;
			hostContext?.eventBus?.publish?.("combat:animation", {
				animation: "LUNGE",
				targetType: isParty ? "party" : "enemy",
				targetIndex: index,
				duration: 380,
			});
		}

		/**
		 * Emits an arcane channeling surge animation trigger over the EventBus.
		 * [Presentation Trigger]
		 * @param {number} index - Channeling character slot index.
		 * @returns {void}
		 */
		function triggerChannelingSurge(index) {
			if (isHeadless) return;
			hostContext?.eventBus?.publish?.("combat:animation", {
				animation: "CHANNEL",
				targetType: "party",
				targetIndex: index,
				duration: 650,
			});
		}

		/**
		 * Hydrates concrete enemy units from encounter definitions.
		 * [Pure Query / State Instantiation]
		 * @param {string} encounterKey - Manifest encounter table key.
		 * @returns {CombatUnit[]} Fully instantiated hostile combatants.
		 */
		function spawnEnemies(encounterKey) {
			const manifest = getActiveManifest();
			const table = manifest.Encounters?.[encounterKey] ||
				manifest.Encounters?.DEFAULT || ["SHADE_WOLF"];
			const defaultBackKeys = new Set([
				"BONE_ARCHER",
				"BLIGHT_SPIDER",
				"DREAD_ACOLYTE",
				"MOSS_GOLEM",
			]);

			return table.map((enemyKey, idx) => {
				const base = manifest.Enemies[enemyKey] || {
					label: "Unknown Beast",
					sprite: "👾",
					baseStats: { hp: 10, atk: 5, def: 2, agi: 5 },
					targeting: "RANDOM",
					rewards: { exp: 5, gold: 5 },
				};

				/** @type {'FRONT'|'BACK'|'BOTH'} */
				let row = "FRONT";
				if (base.isBoss) {
					row = "BOTH";
				} else if (defaultBackKeys.has(enemyKey)) {
					row = "BACK";
				}

				return {
					id: `enemy_${idx}`,
					key: enemyKey,
					name: base.isBoss
						? base.label
						: `${base.label} ${String.fromCodePoint(65 + idx)}`,
					sprite: base.sprite,
					hp: base.baseStats.hp,
					maxHp: base.baseStats.hp,
					atk: base.baseStats.atk,
					def: base.baseStats.def,
					agi: base.baseStats.agi,
					row,
					accumulatedDelay: 1000 / Math.max(1, base.baseStats.agi || 5),
					weakness: base.weakness || null,
					resistance: base.resistance || null,
					targeting: base.targeting,
					isBoss: Boolean(base.isBoss),
					phaseTwoThreshold: base.phaseTwoThreshold || null,
					phaseTwoStats: base.phaseTwoStats ? { ...base.phaseTwoStats } : null,
					phaseTwoActive: false,
					rotation: Array.isArray(base.rotation) ? [...base.rotation] : null,
					ailmentProc: base.ailmentProc ? { ...base.ailmentProc } : null,
					rewards: { ...base.rewards },
					alive: true,
					ailments: [],
				};
			});
		}

		/**
		 * Checks whether any conscious frontline units remain to block incoming attacks.
		 * [Pure Query]
		 * @param {'party'|'enemy'} side - Target formation wing.
		 * @returns {boolean} True if vanguard frontline is active.
		 */
		function isFrontRowAlive(side) {
			if (!sim) return false;
			if (side === "enemy") {
				return sim.enemies.some(
					(e) => e.alive && (e.row === "FRONT" || e.row === "BOTH"),
				);
			}
			return sim.party.some(
				(c) => c.alive && (c.row === "FRONT" || c.row === "BOTH"),
			);
		}

		/**
		 * Evaluates whether a target unit is protected from melee attacks by living vanguard.
		 * [Pure Query]
		 * @param {CombatUnit|null|undefined} target - Target unit to evaluate.
		 * @param {'party'|'enemy'} side - Wing orientation of target.
		 * @param {string} [attackType='PHYSICAL'] - Attack classification.
		 * @returns {boolean} True if attack cannot directly strike target.
		 */
		function isTargetShielded(target, side, attackType = "PHYSICAL") {
			if (!target?.alive) return false;
			if (target.row === "BOTH" || target.row === "FRONT") return false;
			if (
				attackType === "MAGICAL" ||
				attackType === "RANGED" ||
				attackType === "HEAL"
			)
				return false;
			return isFrontRowAlive(side);
		}

		/**
		 * Intercepts attacks aimed at protected backline enemies by redirecting to frontline guard.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} enemy - Original target.
		 * @param {number} targetIndex - Original target index.
		 * @param {boolean} isMelee - Physical melee indicator.
		 * @returns {{ actualTarget: CombatUnit, actualIndex: number, wasIntercepted: boolean }}
		 */
		function applyInterception(enemy, targetIndex, isMelee) {
			if (!sim)
				return {
					actualTarget: enemy,
					actualIndex: targetIndex,
					wasIntercepted: false,
				};
			if (isMelee && isTargetShielded(enemy, "enemy", "PHYSICAL")) {
				const livingFrontline = sim.enemies.filter(
					(e) => e.alive && (e.row === "FRONT" || e.row === "BOTH"),
				);
				if (livingFrontline.length > 0) {
					const actualTarget = livingFrontline[0];
					const actualIndex = sim.enemies.findIndex(
						(e) => e.id === actualTarget.id,
					);
					appendLog(
						`🛡️ ${actualTarget.name} intercepts the strike meant for ${enemy.name}!`,
						"ember",
					);
					dispatchSFX("RESIST");
					if (!isHeadless) {
						hostContext?.eventBus?.publish?.("combat:animation", {
							animation: "DEFLECT",
							targetType: "enemy",
							targetIndex,
							duration: 350,
						});
					}
					return { actualTarget, actualIndex, wasIntercepted: true };
				}
			}
			return {
				actualTarget: enemy,
				actualIndex: targetIndex,
				wasIntercepted: false,
			};
		}

		/**
		 * Checks whether target collapsed and updates mortality state.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} target - Checked unit.
		 * @returns {boolean} True if unit collapsed.
		 */
		function checkUnitDefeat(target) {
			if (target.hp <= 0) {
				target.hp = 0;
				target.alive = false;
				appendLog(`${target.name} collapsed!`, "damage");
				return true;
			}
			return false;
		}

		/**
		 * Evaluates enemy AI targeting heuristics against available targets.
		 * [Pure Query]
		 * @param {CombatUnit} active - Attacking enemy entity.
		 * @param {CombatUnit[]} livingParty - List of alive squad members.
		 * @returns {CombatUnit} Selected squad target.
		 */
		function selectEnemyTarget(active, livingParty) {
			let candidateParty = livingParty;
			const frontParty = livingParty.filter(
				(c) => c.row === "FRONT" || c.row === "BOTH",
			);
			if (frontParty.length > 0 && active.targeting !== "RANGED_SNIPER") {
				candidateParty = frontParty;
			}

			if (active.targeting === "LOWEST_DEF") {
				return candidateParty.slice().sort((a, b) => a.def - b.def)[0];
			}
			if (active.targeting === "HIGHEST_ATK") {
				return candidateParty.slice().sort((a, b) => a.atk - b.atk)[0];
			}
			return candidateParty[
				Math.floor(getRandomFloat() * candidateParty.length)
			];
		}

		//#endregion

		//#region [SEC-06] Enemy AI Targeting & Boss Phase Transformation

		/**
		 * Evaluates boss health ratio to trigger phase 2 enrage transitions.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} enemy - Boss entity being evaluated.
		 * @returns {void}
		 */
		function checkBossPhase(enemy) {
			if (
				!enemy.isBoss ||
				enemy.phaseTwoActive ||
				!enemy.phaseTwoThreshold ||
				!enemy.phaseTwoStats
			)
				return;
			const hpPct = enemy.hp / enemy.maxHp;
			if (hpPct <= enemy.phaseTwoThreshold) {
				enemy.phaseTwoActive = true;
				enemy.sprite = enemy.phaseTwoStats.sprite || "🌋";
				enemy.atk = enemy.phaseTwoStats.atk;
				enemy.def = enemy.phaseTwoStats.def;
				enemy.agi = enemy.phaseTwoStats.agi;
				enemy.accumulatedDelay = 1000 / Math.max(1, enemy.agi);
				appendLog(
					`💥 ${enemy.name} SHATTERS HIS ASHEN ARMOR! ENRAGED!`,
					"ember",
				);
				dispatchSFX("ENCOUNTER_TRIGGER");

				if (hostContext?.eventBus?.publish) {
					hostContext.eventBus.publish("combat:banner", {
						text: "🔥 MALAKOR ENRAGED! 🔥",
						subtext: "Ashen armor shattered! Speed & Attack doubled!",
						color: "#ff5555",
						duration: 2.6,
					});
				}
			}
		}

		/**
		 * Executes scripted rotation patterns for boss entities.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} boss - Boss combatant.
		 * @param {{ type: string, power?: number, label: string, sfx?: string }} pattern - Action descriptor.
		 * @param {CombatUnit[]} livingParty - Conscious squad members.
		 * @returns {void}
		 */
		function executeBossPatternAction(boss, pattern, livingParty) {
			if (!sim) return;
			const bossIdx = sim.enemies.findIndex((e) => e.id === boss.id);
			triggerAttackerLunge(false, bossIdx !== -1 ? bossIdx : 0);
			appendLog(`⚡ ${boss.name} unleashes ${pattern.label}!`, "ember");
			dispatchSFX(pattern.sfx || "SPELL_BOLT");

			const powerMult = pattern.power || 1.0;

			if (pattern.type === "CLEAVE_TWO") {
				const targets = livingParty
					.slice()
					.sort((a, b) => b.atk - a.atk)
					.slice(0, 2);
				targets.forEach((target) => {
					const rawDmg = Math.max(
						1,
						Math.round(boss.atk * powerMult * 2 - target.def),
					);
					const finalDmg = Math.max(
						1,
						rawDmg + Math.floor(getRandomFloat() * 3) - 1,
					);
					target.hp = Math.max(0, target.hp - finalDmg);
					appendLog(
						`${target.name} struck for ${finalDmg} Cleave DMG!`,
						"damage",
					);

					const heroIdx = sim?.party.findIndex((c) => c.id === target.id) ?? -1;
					if (hostContext?.eventBus?.publish) {
						hostContext.eventBus.publish("combat:damage", {
							amount: finalDmg,
							targetType: "party",
							targetIndex: heroIdx !== -1 ? heroIdx : 0,
							isCrit: true,
							isHeal: false,
						});
					}
					checkUnitDefeat(target);
				});
			} else if (pattern.type === "STUN_LOWEST") {
				const target = livingParty.slice().sort((a, b) => a.def - b.def)[0];
				const rawDmg = Math.max(1, boss.atk - target.def);
				target.hp = Math.max(0, target.hp - rawDmg);
				appendLog(`${target.name} choked by ash for ${rawDmg} DMG!`, "damage");
				applyAilment(target, "STUN", 1);

				const heroIdx = sim?.party.findIndex((c) => c.id === target.id) ?? -1;
				if (hostContext?.eventBus?.publish) {
					hostContext.eventBus.publish("combat:damage", {
						amount: rawDmg,
						targetType: "party",
						targetIndex: heroIdx !== -1 ? heroIdx : 0,
						isCrit: false,
						isHeal: false,
					});
				}
				checkUnitDefeat(target);
			} else if (pattern.type === "AOE_ALL") {
				livingParty.forEach((target) => {
					const rawDmg = Math.max(
						1,
						Math.round(boss.atk * powerMult * 1.5 - target.def),
					);
					const finalDmg = Math.max(
						1,
						rawDmg + Math.floor(getRandomFloat() * 3) - 1,
					);
					target.hp = Math.max(0, target.hp - finalDmg);
					appendLog(
						`${target.name} burned for ${finalDmg} Cataclysm DMG!`,
						"damage",
					);
					if (getRandomFloat() < 0.5) applyAilment(target, "BURN", 2);

					const heroIdx = sim?.party.findIndex((c) => c.id === target.id) ?? -1;
					if (hostContext?.eventBus?.publish) {
						hostContext.eventBus.publish("combat:damage", {
							amount: finalDmg,
							targetType: "party",
							targetIndex: heroIdx !== -1 ? heroIdx : 0,
							isCrit: false,
							isHeal: false,
						});
					}
					checkUnitDefeat(target);
				});
			}
			renderPresentation();
		}

		/**
		 * Resolves basic physical attack logic for regular hostile units.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} active - Hostile attacker.
		 * @param {CombatUnit} target - Target party member.
		 * @returns {void}
		 */
		function applyEnemyAttack(active, target) {
			if (!sim) return;
			const rawDmg = Math.max(1, active.atk * 2 - target.def);
			const variance = Math.floor(getRandomFloat() * 3) - 1;
			const finalDmg = Math.max(1, rawDmg + variance);
			target.hp = Math.max(0, target.hp - finalDmg);
			dispatchSFX("ATTACK_HIT");
			appendLog(
				`${active.name} attacks ${target.name} for ${finalDmg} DMG!`,
				"damage",
			);

			const heroIdx = sim.party.findIndex((c) => c.id === target.id);
			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish("combat:damage", {
					amount: finalDmg,
					targetType: "party",
					targetIndex: heroIdx !== -1 ? heroIdx : 0,
					isCrit: variance > 0,
					isHeal: false,
				});
			}

			if (
				active.ailmentProc &&
				getRandomFloat() < (active.ailmentProc.chance || 0)
			) {
				applyAilment(
					target,
					active.ailmentProc.id || active.ailmentProc.type || "POISON",
					active.ailmentProc.duration || 3,
				);
			}

			if (target.alive) {
				const isBrute =
					active.key === "IRON_BRUTE" ||
					(typeof active.key === "string" && active.key.includes("BRUTE")) ||
					active.key === "CATACOMB_SKELETON";
				const isTether =
					active.key === "CAVE_SPIDER" || active.key === "DREAD_ACOLYTE";
				if (isBrute && getRandomFloat() < 0.35 && target.row === "FRONT") {
					executeDisplacement(active, target, "KNOCKBACK", true);
				} else if (
					isTether &&
					getRandomFloat() < 0.3 &&
					target.row === "BACK"
				) {
					executeDisplacement(active, target, "PULL", true);
				}
			}

			checkUnitDefeat(target);
		}

		/**
		 * Orchestrates enemy turn routing between scripted boss patterns and basic strikes.
		 * [State Machine Progression]
		 * @returns {void}
		 */
		function executeEnemyTurn() {
			if (!sim) return;
			const active = sim.turnQueue[sim.activeTurnIndex]?.entity;
			if (!active?.alive) {
				stepTurn();
				return;
			}

			const livingParty = sim.party.filter((c) => c.alive);
			if (livingParty.length === 0) {
				checkBattleEnd();
				return;
			}

			if (active.isBoss && active.rotation && active.rotation.length > 0) {
				const pattern =
					active.rotation[sim.bossRotationIndex % active.rotation.length];
				sim.bossRotationIndex += 1;
				executeBossPatternAction(active, pattern, livingParty);
				renderPresentation();
				schedule(stepTurn, 700);
				return;
			}

			const target = selectEnemyTarget(active, livingParty);
			const enemyIdx = sim.enemies.findIndex((e) => e.id === active.id);
			triggerAttackerLunge(false, enemyIdx !== -1 ? enemyIdx : 0);

			applyEnemyAttack(active, target);
			renderPresentation();
			schedule(stepTurn, 600);
		}

		//#endregion

		//#region [SEC-07] Player Kinetic Actions & Tactical Displacement

		/**
		 * Triggers a displacement visual effect through the host EventBus.
		 * [Presentation Trigger]
		 * @param {'party'|'enemy'} side - Target wing.
		 * @param {number} index - Target index.
		 * @param {'KNOCKBACK'|'PULL'} displacementType - Action category.
		 * @returns {void}
		 */
		function triggerDisplacementVisual(side, index, displacementType) {
			if (isHeadless) return;
			hostContext?.eventBus?.publish?.("combat:animation", {
				animation: displacementType,
				targetType: side,
				targetIndex: index,
				duration: 450,
			});
		}

		/**
		 * Repositions target unit between Frontline and Rear Backline.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} actor - Unit executing displacement.
		 * @param {CombatUnit} target - Unit being shifted.
		 * @param {'KNOCKBACK'|'PULL'} displacementType - Displacement vector.
		 * @param {boolean} isAllyTarget - Whether target belongs to party wing.
		 * @returns {void}
		 */
		function executeDisplacement(
			actor,
			target,
			displacementType,
			isAllyTarget,
		) {
			if (!sim || !target?.alive || target.isBoss || target.row === "BOTH") {
				return;
			}

			const side = isAllyTarget ? "party" : "enemy";
			const targetIndex = isAllyTarget
				? sim.party.findIndex((c) => c.id === target.id)
				: sim.enemies.findIndex((e) => e.id === target.id);

			if (
				displacementType === "KNOCKBACK" &&
				(target.row === "FRONT" || !target.row)
			) {
				target.row = "BACK";
				appendLog(
					`💨 DISPLACEMENT! ${target.name} is knocked back to the REAR ROW!`,
					"ember",
				);
				dispatchSFX("SWIFT_WHOOSH");
				triggerDisplacementVisual(side, targetIndex, "KNOCKBACK");
			} else if (displacementType === "PULL" && target.row === "BACK") {
				target.row = "FRONT";
				appendLog(
					`🪝 DISPLACEMENT! ${target.name} is dragged forward into the VANGUARD!`,
					"ember",
				);
				dispatchSFX("SWIFT_WHOOSH");
				triggerDisplacementVisual(side, targetIndex, "PULL");
			}
		}

		/**
		 * Resolves basic physical melee attack executed by active hero.
		 * [Authoritative State Mutation]
		 * @param {number} targetEnemyIndex - Selected target position in enemy row.
		 * @returns {void}
		 */
		function playerExecuteAttack(targetEnemyIndex) {
			if (!sim) return;
			const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
			const target = sim.enemies[targetEnemyIndex];
			if (!activeChar || !target?.alive) return;

			const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
			triggerAttackerLunge(true, heroIdx !== -1 ? heroIdx : 0);

			const { actualTarget, actualIndex, wasIntercepted } = applyInterception(
				target,
				targetEnemyIndex,
				true,
			);

			const rawDmg = Math.max(1, activeChar.atk * 2 - actualTarget.def);
			const variance = Math.floor(getRandomFloat() * 3) - 1;
			const attackDmg = Math.max(1, rawDmg + variance);
			const { finalDmg, isWeakness, isResisted } = calculateAffinityDamage(
				attackDmg,
				"PHYSICAL",
				actualTarget,
			);

			actualTarget.hp = Math.max(0, actualTarget.hp - finalDmg);
			dispatchSFX("ATTACK_HIT");

			const tag = resolveAffinityTag(isWeakness, isResisted);
			const interceptTag = wasIntercepted ? " [INTERCEPTED]" : "";
			appendLog(
				`${activeChar.name} strikes ${actualTarget.name} for ${finalDmg} DMG!${tag}${interceptTag}`,
				isWeakness ? "ember" : "damage",
			);

			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish("combat:damage", {
					amount: finalDmg,
					targetType: "enemy",
					targetIndex: actualIndex,
					isCrit: isWeakness || variance > 0,
					isHeal: false,
				});
			}

			checkBossPhase(actualTarget);

			if (checkUnitDefeat(actualTarget) && checkBattleEnd()) {
				return;
			}

			renderPresentation();
			schedule(stepTurn, 600);
		}

		/**
		 * Puts active character into tactical guard stance (-50% DMG, +2 MP).
		 * [Authoritative State Mutation]
		 * @returns {void}
		 */
		function playerExecuteGuard() {
			if (!sim) return;
			const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
			if (!activeChar?.alive) return;

			activeChar.isGuarding = true;
			activeChar.mp = Math.min(activeChar.maxMp, activeChar.mp + 2);
			appendLog(
				`${activeChar.name} raises their guard! (-50% DMG, +2 MP)`,
				"system",
			);
			dispatchSFX("BUFF");

			const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
			hostContext?.eventBus?.publish?.("combat:text", {
				text: "GUARD",
				targetType: "party",
				targetIndex: heroIdx !== -1 ? heroIdx : 0,
				color: "#38bdf8",
				isLarge: true,
			});

			sim.activeTurnIndex += 1;
			renderPresentation();
			schedule(stepTurn, 400);
		}

		/**
		 * Applies potion restoration on target ally.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} target
		 * @param {number} targetIdx
		 * @returns {void}
		 */
		function applyPotion(target, targetIdx) {
			if (!target.alive) {
				appendLog(
					`${target.name} is collapsed and cannot drink a potion!`,
					"damage",
				);
				return;
			}
			target.hp = Math.min(target.maxHp, target.hp + 30);
			appendLog(`${target.name} drank Potion (+30 HP)!`, "heal");
			dispatchSFX("HEAL");
			hostContext?.eventBus?.publish?.("combat:damage", {
				amount: 30,
				targetType: "party",
				targetIndex: targetIdx,
				isHeal: true,
				isCrit: false,
			});
		}

		/**
		 * Applies ether restoration on target ally.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} target
		 * @param {number} targetIdx
		 * @returns {void}
		 */
		function applyEther(target, targetIdx) {
			if (!target.alive) {
				appendLog(`${target.name} is collapsed!`, "damage");
				return;
			}
			target.mp = Math.min(target.maxMp, target.mp + 15);
			appendLog(`${target.name} drank Ether (+15 MP)!`, "ember");
			dispatchSFX("HEAL");
			hostContext?.eventBus?.publish?.("combat:damage", {
				amount: 15,
				targetType: "party",
				targetIndex: targetIdx,
				isHeal: true,
				isCrit: false,
			});
		}

		/**
		 * Applies phoenix ember resurrection on target ally.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} target
		 * @param {number} targetIdx
		 * @returns {void}
		 */
		function applyPhoenixEmber(target, targetIdx) {
			target.alive = true;
			target.hp = Math.max(1, Math.round(target.maxHp * 0.5));
			appendLog(
				`${target.name} revived by Phoenix Ember (+${target.hp} HP)!`,
				"heal",
			);
			dispatchSFX("HEAL");
			hostContext?.eventBus?.publish?.("combat:damage", {
				amount: target.hp,
				targetType: "party",
				targetIndex: targetIdx,
				isHeal: true,
				isCrit: true,
			});
		}

		/**
		 * Resolves item consumption from squad pouch inventory onto target ally.
		 * [Authoritative State Mutation]
		 * @param {string} itemId - Consumable token ('POTION', 'ETHER', 'PHOENIX_EMBER').
		 * @param {number} targetIdx - Target squad member index.
		 * @returns {void}
		 */
		function playerExecuteItem(itemId, targetIdx) {
			if (!sim) return;
			const target = sim.party[targetIdx];
			if (!target) return;

			/** @type {Record<string, function(CombatUnit, number):void>} */
			const itemAppliers = {
				POTION: applyPotion,
				ETHER: applyEther,
				PHOENIX_EMBER: applyPhoenixEmber,
			};

			const applier = itemAppliers[itemId];
			if (applier) {
				applier(target, targetIdx);
			}

			if ((sim.inventory[itemId] || 0) > 0) {
				sim.inventory[itemId] -= 1;
			}

			sim.phase = "PLAYER_INPUT";
			sim.selectedTab = "ATTACK";
			sim.activeTurnIndex += 1;
			renderPresentation();
			schedule(stepTurn, 400);
		}

		//#endregion

		//#region [SEC-08] Skill Damage Resolution & Battle Termination Gates

		/**
		 * Calculates damage for skills including positioning bonuses, elemental affinity, and terrain multipliers.
		 * [Pure Query]
		 * @param {CombatSkillNode} node - Skill descriptor.
		 * @param {CombatUnit} activeChar - Executing combatant.
		 * @param {CombatUnit} actualTarget - Targeted recipient.
		 * @param {boolean} isGuaranteedCrit - Critical hit assertion flag.
		 * @returns {{ finalDmg: number, isWeakness: boolean, isResisted: boolean }} Damage outcome.
		 */
		function computeSkillDamage(
			node,
			activeChar,
			actualTarget,
			isGuaranteedCrit,
		) {
			const isRanged =
				node?.subType === "bolt" ||
				node?.subType === "spell" ||
				Boolean(node?.isRanged);
			const charAtk = typeof activeChar?.atk === "number" ? activeChar.atk : 10;
			const targetDef =
				typeof actualTarget?.def === "number" ? actualTarget.def : 0;

			let baseVal;
			if (typeof node?.mult === "number") {
				baseVal = Math.round(charAtk * node.mult * 2 - targetDef);
			} else {
				const power = typeof node?.power === "number" ? node.power : 10;
				baseVal = power * 2 - targetDef;
			}

			let rawDmg = Math.max(1, Number.isFinite(baseVal) ? baseVal : 1);
			const backlineBonus = activeChar?.row === "BACK" && isRanged ? 1.15 : 1.0;
			rawDmg = Math.round(rawDmg * backlineBonus);

			if (isGuaranteedCrit) {
				rawDmg = Math.round(rawDmg * 1.75);
			}

			const skillElement =
				node?.element || (node?.subType === "bolt" ? "FIRE" : "PHYSICAL");
			let { finalDmg, isWeakness, isResisted } = calculateAffinityDamage(
				rawDmg,
				skillElement,
				actualTarget,
			);

			if (
				(sim?.terrain === "ICE" || sim?.terrain === "=") &&
				skillElement === "FIRE"
			) {
				finalDmg = Math.max(1, Math.round(finalDmg * 1.25));
				appendLog(
					"🔥 THERMAL SHOCK! Ice terrain amplifies fire damage (+25%)!",
					"ember",
				);
			}

			return {
				finalDmg: Number.isFinite(finalDmg) && finalDmg > 0 ? finalDmg : 1,
				isWeakness,
				isResisted,
			};
		}

		/**
		 * Resolves ally-targeted recovery or warding skills.
		 * [Authoritative State Mutation]
		 * @param {CombatSkillNode} node - Active skill definition.
		 * @param {number} targetIndex - Target ally slot.
		 * @param {boolean} isGuaranteedCrit - Critical boost assertion.
		 * @param {CombatUnit} activeChar - Casting unit.
		 * @returns {void}
		 */
		function executeAllySkill(node, targetIndex, isGuaranteedCrit, activeChar) {
			if (!sim) return;
			const ally = sim.party[targetIndex];
			if (!ally?.alive) return;
			const power = typeof node?.power === "number" ? node.power : 20;
			const missingHp = Math.max(0, (ally.maxHp || 30) - (ally.hp || 0));
			const healed = power === 999 ? missingHp : Math.min(power, missingHp);
			ally.hp = Math.min(ally.maxHp || 30, (ally.hp || 0) + healed);
			dispatchSFX("HEAL");
			appendLog(
				`${activeChar.name} casts ${node.label || "Heal"} on ${ally.name}, restoring ${healed} HP!`,
				"heal",
			);

			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish("combat:damage", {
					amount: healed,
					targetType: "party",
					targetIndex,
					isCrit: isGuaranteedCrit,
					isHeal: true,
				});
			}
		}

		/**
		 * Checks whether target successfully evaded an arcane spell strike from the rear row.
		 * [Pure Query]
		 * @param {CombatUnit} target
		 * @param {CombatSkillNode} node
		 * @returns {boolean}
		 */
		function checkArcaneEvasion(target, node) {
			const isMagical = node.subType === "spell" || node.element !== undefined;
			if (target.row === "BACK" && isMagical && getRandomFloat() < 0.15) {
				appendLog(
					`✨ ${target.name} evaded arcane surge via Backline Magic Evasion!`,
					"system",
				);
				dispatchSFX("RESIST");
				return true;
			}
			return false;
		}

		/**
		 * Resolves offensive skills targeted against hostile enemies.
		 * [Authoritative State Mutation]
		 * @param {CombatSkillNode} node - Offensive skill descriptor.
		 * @param {number} targetIndex - Target hostile index.
		 * @param {boolean} isGuaranteedCrit - Critical boost assertion.
		 * @param {CombatUnit} activeChar - Attacking unit.
		 * @returns {void}
		 */
		function executeEnemySkill(
			node,
			targetIndex,
			isGuaranteedCrit,
			activeChar,
		) {
			if (!sim) return;
			const enemy = sim.enemies[targetIndex];
			if (!enemy?.alive) return;

			const isMelee = node.subType === "strike";
			const { actualTarget, actualIndex, wasIntercepted } = applyInterception(
				enemy,
				targetIndex,
				isMelee,
			);

			if (checkArcaneEvasion(actualTarget, node)) {
				schedule(stepTurn, 500);
				return;
			}

			const { finalDmg, isWeakness, isResisted } = computeSkillDamage(
				node,
				activeChar,
				actualTarget,
				isGuaranteedCrit,
			);
			actualTarget.hp = Math.max(0, actualTarget.hp - finalDmg);
			dispatchSFX(node.subType === "bolt" ? "SPELL_BOLT" : "ATTACK_HIT");

			const tag = resolveSkillHitTag(isGuaranteedCrit, isWeakness, isResisted);
			const interceptTag = wasIntercepted ? " [INTERCEPTED]" : "";
			const logTone = isWeakness || isGuaranteedCrit ? "ember" : "damage";
			appendLog(
				`${activeChar.name} casts ${node.label} on ${actualTarget.name} for ${finalDmg} DMG!${tag}${interceptTag}`,
				logTone,
			);

			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish("combat:damage", {
					amount: finalDmg,
					targetType: "enemy",
					targetIndex: actualIndex,
					isCrit:
						isGuaranteedCrit ||
						isWeakness ||
						Boolean(node.mult && node.mult > 1.5),
					isHeal: false,
				});
			}

			checkBossPhase(actualTarget);
			if (node.id === "mag_des_1" && getRandomFloat() < 0.4) {
				applyAilment(actualTarget, "BURN", 3);
			}
			if (node.displacement && actualTarget.alive) {
				executeDisplacement(activeChar, actualTarget, node.displacement, false);
			}
			checkUnitDefeat(actualTarget);
		}

		/**
		 * Invokes the harmonic channeling peripheral driver before tier-3 skill release.
		 * [Peripheral Invocation]
		 * @param {CombatSkillNode} node - Attuned skill node.
		 * @param {function(number):void} onComplete - Callback receiving resonance score.
		 * @returns {void}
		 */
		function renderHarmonicChannelingStage(node, onComplete) {
			const channelerDriver =
				hostContext?.combatRenderer?.startHarmonicChanneling;
			if (typeof channelerDriver !== "function") {
				onComplete(0);
				return;
			}
			channelerDriver(node, onComplete);
		}

		/**
		 * Entry point for executing character skills, managing MP deduction and harmonic triggers.
		 * [Authoritative State Mutation]
		 * @param {CombatSkillNode} node - Target skill node.
		 * @param {number} targetIndex - Target entity index.
		 * @param {boolean} isAllyTarget - Whether skill targets ally.
		 * @returns {void}
		 */
		function playerExecuteSkill(node, targetIndex, isAllyTarget) {
			if (!sim) return;
			const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
			if (!activeChar || activeChar.mp < node.mpCost) return;

			if (node.tier === 3 || node.id?.endsWith("_3")) {
				sim.phase = "HARMONIC_CHANNELING";
				renderHarmonicChannelingStage(node, (resonanceScore) => {
					activeChar.mp -= node.mpCost;
					const isGuaranteedCrit = resonanceScore >= 90;
					finalizeSkillExecution(
						node,
						targetIndex,
						isAllyTarget,
						isGuaranteedCrit,
					);
				});
				return;
			}

			activeChar.mp -= node.mpCost;
			finalizeSkillExecution(node, targetIndex, isAllyTarget, false);
		}

		/**
		 * Finalizes skill resolution, visual effects, and advances the turn schedule.
		 * [State Machine Progression]
		 * @param {CombatSkillNode} node - Resolved skill node.
		 * @param {number} targetIndex - Target slot.
		 * @param {boolean} isAllyTarget - Targeted side.
		 * @param {boolean} [isGuaranteedCrit=false] - Critical assertion flag.
		 * @returns {void}
		 */
		function finalizeSkillExecution(
			node,
			targetIndex,
			isAllyTarget,
			isGuaranteedCrit = false,
		) {
			if (!sim) return;
			const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
			if (!activeChar) return;

			const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
			if (node.subType === "strike") {
				triggerAttackerLunge(true, heroIdx !== -1 ? heroIdx : 0);
			} else {
				triggerChannelingSurge(heroIdx !== -1 ? heroIdx : 0);
			}

			if (isAllyTarget) {
				executeAllySkill(node, targetIndex, isGuaranteedCrit, activeChar);
			} else {
				executeEnemySkill(node, targetIndex, isGuaranteedCrit, activeChar);
			}

			if (checkBattleEnd()) {
				return;
			}

			renderPresentation();
			schedule(stepTurn, 500);
		}

		/**
		 * Resolves defeat state transitions and schedule callbacks.
		 * [State Machine Progression]
		 * @returns {void}
		 */
		function resolveDefeat() {
			if (!sim) return;
			sim.phase = "DEFEAT";
			dispatchSFX("DEFEAT");
			appendLog("The party has fallen in battle...", "damage");
			renderPresentation();
			if (isHeadless || autoRun) {
				finishBattle("defeat");
			} else {
				schedule(() => finishBattle("defeat"), 800);
			}
		}

		/**
		 * Applies attribute and level progressions to a single hero unit.
		 * [Authoritative State Mutation]
		 * @param {CombatUnit} c
		 * @param {any} manifest
		 * @returns {void}
		 */
		function applyHeroLevelUp(c, manifest) {
			c.level = (c.level || 1) + 1;
			c.skillPoints = (c.skillPoints || 0) + 1;
			c.unspentSP = (c.unspentSP || 0) + 1;
			const phenotypeMap = manifest.Phenotypes || manifest.Classes || {};
			const phenoKey = c.phenotype || "HERO";
			const g = phenotypeMap[phenoKey]?.growth || {
				hp: 4,
				mp: 2,
				atk: 1,
				def: 1,
				agi: 1,
			};
			c.maxHp = (c.maxHp || 30) + g.hp;
			c.hp = (c.hp || 30) + g.hp;
			c.maxMp = (c.maxMp || 10) + g.mp;
			c.mp = (c.mp || 10) + g.mp;
			c.atk = (c.atk || 10) + g.atk;
			c.def = (c.def || 5) + g.def;
			c.agi = (c.agi || 5) + g.agi;
			appendLog(`🎉 ${c.name} reached Level ${c.level}! (+1 SP)`, "ember");
		}

		/**
		 * Calculates and applies EXP, gold, and item spoils following battle victory.
		 * [Authoritative State Mutation]
		 * @returns {void}
		 */
		function distributeVictoryRewards() {
			if (!sim) return;
			let totExp = 0;
			let totGold = 0;
			const itemsAwarded = [];

			sim.enemies.forEach((e) => {
				totExp += e.rewards?.exp || 0;
				totGold += e.rewards?.gold || 0;
				if (e.rewards?.item) itemsAwarded.push(e.rewards.item);
			});

			const manifest = getActiveManifest();
			sim.party
				.filter((c) => c.alive)
				.forEach((c) => {
					c.exp = (c.exp || 0) + totExp;
					const curveFn =
						manifest.Curves?.expForNextLevel ||
						((/** @type {number} */ lv) => Math.round(20 * lv ** 1.4));
					if (c.exp >= curveFn(c.level || 1)) {
						applyHeroLevelUp(c, manifest);
					}
				});

			sim.gold += totGold;
			sim.lastGainedGold = totGold;
			sim.lastGainedExp = totExp;

			itemsAwarded.forEach((itemId) => {
				if (sim) {
					sim.inventory[itemId] = (sim.inventory[itemId] || 0) + 1;
				}
				appendLog(`Claimed relic item: ${itemId}!`, "ember");
			});

			appendLog(`Acquired ${totGold} gold and ${totExp} EXP.`, "ember");
		}

		/**
		 * Resolves victory state transitions, banner events, and reward distribution.
		 * [State Machine Progression]
		 * @returns {void}
		 */
		function resolveVictory() {
			if (!sim) return;
			sim.phase = "VICTORY";
			dispatchSFX("VICTORY");
			appendLog("Victory! All foes vanquished.", "heal");

			hostContext?.eventBus?.publish?.("combat:victory", {});
			hostContext?.eventBus?.publish?.("combat:banner", {
				text: "🏆 VICTORY ACHIEVED 🏆",
				subtext: "All hostile threats vanquished! Spoils secured.",
				color: "#ffcc00",
				duration: 2.2,
			});

			distributeVictoryRewards();
			renderPresentation();

			if (isHeadless || autoRun) {
				finishBattle("victory");
			} else {
				schedule(() => finishBattle("victory"), 1500);
			}
		}

		/**
		 * Evaluates terminal victory or defeat conditions across party and hostile units.
		 * [Authoritative State Mutation]
		 * @returns {boolean} True if combat encounter has concluded.
		 */
		function checkBattleEnd() {
			if (!sim) return true;
			const partyAlive = sim.party.some((c) => c.alive);
			if (!partyAlive) {
				resolveDefeat();
				return true;
			}
			const enemiesAlive = sim.enemies.some((e) => e.alive);
			if (!enemiesAlive) {
				resolveVictory();
				return true;
			}
			return false;
		}

		/**
		 * Dispatches terminal battle resolution envelope over the host EventBus.
		 * [State Mutating / Bus Dispatch]
		 * @param {'victory'|'defeat'|'escaped'} outcome - Result classification.
		 * @returns {void}
		 */
		function finishBattle(outcome) {
			if (!sim) return;
			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish("combat:resolved", {
					outcome,
					encounterKey: sim.encounterKey,
					party: structuredClone(sim.party),
					gold: sim.gold,
					inventory: structuredClone(sim.inventory),
				});
			}
		}

		//#endregion

		//#region [SEC-09] Pacing Turn Loop & Headless Simulation Engine

		/**
		 * Builds CTB turn queue based on unit delays, applying ambush rules on tall grass.
		 * [Authoritative State Mutation]
		 * @returns {void}
		 */
		function buildTurnQueue() {
			if (!sim) return;
			const isIce = sim.terrain === "ICE" || sim.terrain === "=";
			const isGrass = sim.terrain === "GRASS" || sim.terrain === '"';

			/** @type {TurnQueueEntry[]} */
			const allLiving = [
				...sim.party
					.filter((c) => c.alive)
					.map((c) => ({
						type: /** @type {'party'} */ ("party"),
						entity: c,
						effectiveAgi: c.agi + (isIce ? 2 : 0),
					})),
				...sim.enemies
					.filter((e) => e.alive)
					.map((e) => ({
						type: /** @type {'enemy'} */ ("enemy"),
						entity: e,
						effectiveAgi: e.agi,
					})),
			];

			allLiving.sort(
				(a, b) =>
					(a.entity.accumulatedDelay || 0) - (b.entity.accumulatedDelay || 0),
			);

			if (isGrass && sim.roundCount === 0) {
				const enemies = allLiving.filter((u) => u.type === "enemy");
				const heroes = allLiving.filter((u) => u.type === "party");
				sim.turnQueue = [...enemies, ...heroes];
				appendLog(
					"⚡ AMBUSH! Foes strike first from the tall grass!",
					"damage",
				);
				dispatchSFX("ENCOUNTER_TRIGGER");
			} else {
				sim.turnQueue = allLiving;
			}

			sim.activeTurnIndex = 0;
			sim.roundCount += 1;
		}

		/**
		 * Advances turn queue to the next active unit, subtracting elapsed delay time.
		 * [State Machine Progression]
		 * @returns {void}
		 */
		function stepTurn() {
			if (!sim || checkBattleEnd()) return;

			/** @type {TurnQueueEntry[]} */
			const allLiving = [
				...sim.party
					.filter((c) => c.alive)
					.map((c) => ({ type: /** @type {'party'} */ ("party"), entity: c })),
				...sim.enemies
					.filter((e) => e.alive)
					.map((e) => ({ type: /** @type {'enemy'} */ ("enemy"), entity: e })),
			];

			if (allLiving.length === 0) return;

			allLiving.sort(
				(a, b) =>
					(a.entity.accumulatedDelay || 0) - (b.entity.accumulatedDelay || 0),
			);
			const activeUnit = allLiving[0];
			const elapsed = activeUnit.entity.accumulatedDelay || 0;

			allLiving.forEach((u) => {
				u.entity.accumulatedDelay = Math.max(
					0,
					(u.entity.accumulatedDelay || 0) - elapsed,
				);
			});

			activeUnit.entity.accumulatedDelay =
				1000 / Math.max(1, activeUnit.entity.agi);

			sim.turnQueue = [activeUnit];
			sim.activeTurnIndex = 0;

			const stunned = tickAilments(activeUnit.entity);
			if (checkBattleEnd()) return;

			if (stunned) {
				renderPresentation();
				schedule(stepTurn, 600);
				return;
			}

			if (activeUnit.type === "enemy") {
				sim.phase = "ENEMY_ACTION";
				renderPresentation();
				schedule(executeEnemyTurn, 700);
			} else {
				sim.phase = "PLAYER_INPUT";
				renderPresentation();
				if (autoRun) {
					autoExecutePlayerAction();
				}
			}
		}

		/**
		 * Auto-selects and executes attacks during headless simulations or automated testing.
		 * [State Mutating]
		 * @returns {void}
		 */
		function autoExecutePlayerAction() {
			if (!sim) return;
			const livingEnemies = sim.enemies
				.map((e, idx) => ({ e, idx }))
				.filter(({ e }) => e.alive);
			if (livingEnemies.length === 0) {
				stepTurn();
				return;
			}
			const validTarget =
				livingEnemies.find(
					({ e }) => !isTargetShielded(e, "enemy", "PHYSICAL"),
				) || livingEnemies[0];
			playerExecuteAttack(validTarget.idx);
		}

		/**
		 * Runs synchronized headless combat execution loop to completion.
		 * [State Mutating]
		 * @returns {void}
		 */
		function runHeadlessLoop() {
			if (!sim) return;
			stepTurn();
			let safetyCounter = 0;
			while (
				headlessEventQueue.length > 0 &&
				sim.phase !== "VICTORY" &&
				sim.phase !== "DEFEAT" &&
				sim.phase !== "escaped" &&
				safetyCounter < 500
			) {
				safetyCounter++;
				const fn = headlessEventQueue.shift();
				if (fn) fn();
			}
		}

		/**
		 * Triggers presentation driver render pass.
		 * [Presentation Invocation]
		 * @returns {void}
		 */
		function renderPresentation() {
			if (!sim || isHeadless) return;
			const activeRenderer =
				hostContext?.combatRenderer ||
				(typeof EmberlightCombatRenderer !== "undefined"
					? EmberlightCombatRenderer
					: null);
			if (activeRenderer?.render) {
				activeRenderer.render(structuredClone(sim), handleViewAction);
			}
		}

		//#endregion

		//#region [SEC-10] Command Hub Navigation & View Action Router

		/**
		 * Aggregates unlocked active skills for a given character instance.
		 * [Pure Query]
		 * @param {CombatUnit|null|undefined} activeChar - Active squad member.
		 * @returns {CombatSkillNode[]} Array of executable skills.
		 */
		function getAvailableSkills(activeChar) {
			const manifest = getActiveManifest();
			const unlockedIds = activeChar?.unlockedNodes || activeChar?.unlocked || [];
			const phenotype = activeChar?.phenotype || "HERO";

			let activeSkills = collectAetherActiveSkills(unlockedIds, manifest);
			if (activeSkills.length === 0) {
				activeSkills = collectSkillTreeActiveSkills(unlockedIds, phenotype, manifest);
			}
			if (activeSkills.length === 0) {
				activeSkills.push(getDefaultPhenotypeSkill(phenotype));
			}
			return activeSkills;
		}

		/**
		 * Resolves confirmation action targeting an ally.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleConfirmTargetAlly() {
			if (!sim) return;
			const isEmber = sim.pendingItem === "PHOENIX_EMBER";
			const targetAllyIdx = sim.party.findIndex((c) => (isEmber ? !c.alive : c.alive));
			if (targetAllyIdx === -1) return;

			if (sim.pendingItem) {
				handleViewAction({ type: "ITEM", itemId: sim.pendingItem, targetIndex: targetAllyIdx });
			} else if (sim.pendingSkill) {
				handleViewAction({ type: "SKILL", skill: sim.pendingSkill, targetIndex: targetAllyIdx, isAlly: true });
			}
		}

		/**
		 * Resolves confirmation action targeting an enemy.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleConfirmTargetEnemy() {
			if (!sim) return;
			const livingEnemyIdx = sim.enemies.findIndex((e) => e.alive);
			if (livingEnemyIdx === -1) return;

			if (sim.pendingSkill) {
				handleViewAction({ type: "SKILL", skill: sim.pendingSkill, targetIndex: livingEnemyIdx, isAlly: false });
			} else {
				handleViewAction({ type: "ATTACK", targetIndex: livingEnemyIdx });
			}
		}

		/**
		 * Resolves confirmation action under the skills sub-deck.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleConfirmSkills() {
			if (!sim) return;
			const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
			const skills = getAvailableSkills(activeChar);
			if (skills.length > 0) {
				handleViewAction({ type: "SELECT_SKILL", skill: skills[0] });
			}
		}

		/**
		 * Resolves confirmation action under the pouch sub-deck.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleConfirmPouch() {
			if (!sim) return;
			const inv = sim.inventory || {};
			const availableItem = ["POTION", "ETHER", "PHOENIX_EMBER"].find((id) => (inv[id] || 0) > 0);
			if (availableItem) {
				handleViewAction({ type: "SELECT_ITEM", itemId: availableItem });
			}
		}

		/**
		 * Resolves confirmation key input based on active menu phase.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleConfirmChoice() {
			if (!sim) return;

			if (sim.phase === "VICTORY") {
				finishBattle("victory");
				return;
			}
			if (sim.phase === "DEFEAT") {
				finishBattle("defeat");
				return;
			}
			if (sim.selectedTab === "GUARD") {
				handleViewAction({ type: "GUARD" });
				return;
			}
			if (sim.phase === "TARGETING_ALLY" || sim.phase === "TARGET_ALLY") {
				handleConfirmTargetAlly();
				return;
			}
			if (sim.selectedTab === "ATTACK" || sim.phase === "TARGETING_ENEMY") {
				handleConfirmTargetEnemy();
				return;
			}
			if (sim.selectedTab === "SKILLS") {
				handleConfirmSkills();
				return;
			}
			if (sim.selectedTab === "POUCH") {
				handleConfirmPouch();
			}
		}

		/**
		 * Resolves cancel / back navigation in combat UI menus.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleCancelChoice() {
			if (!sim) return;
			if (sim.pendingSkill) {
				handleViewAction({ type: "CANCEL_SKILL" });
			} else if (sim.pendingItem) {
				handleViewAction({ type: "CANCEL_ITEM" });
			} else if (sim.selectedTab !== "ATTACK") {
				handleViewAction({ type: "SELECT_TAB", tab: "ATTACK" });
			} else if (sim.phase === "PLAYER_INPUT") {
				handleViewAction({ type: "FLEE" });
			}
		}

		/**
		 * Cycles active action tabs left and right.
		 * [State Mutating]
		 * @param {'UP'|'DOWN'|'LEFT'|'RIGHT'} direction - Directional token.
		 * @returns {void}
		 */
		function handleDirectionalNav(direction) {
			if (!sim) return;
			/** @type {Array<'ATTACK'|'SKILLS'|'GUARD'|'POUCH'>} */
			const tabs = ["ATTACK", "SKILLS", "GUARD", "POUCH"];
			const curTabIdx = tabs.indexOf(sim.selectedTab || "ATTACK");

			if (direction === "LEFT" || direction === "UP") {
				const nextIdx = (curTabIdx - 1 + tabs.length) % tabs.length;
				handleViewAction({ type: "SELECT_TAB", tab: tabs[nextIdx] });
			} else if (direction === "RIGHT" || direction === "DOWN") {
				const nextIdx = (curTabIdx + 1) % tabs.length;
				handleViewAction({ type: "SELECT_TAB", tab: tabs[nextIdx] });
			}
		}

		/**
		 * Routes targeted choice against hostile enemy slot.
		 * [State Mutating]
		 * @param {number} idx
		 * @returns {void}
		 */
		function handleChoiceEnemyTarget(idx) {
			if (!sim?.enemies[idx]?.alive) return;
			if (sim.pendingSkill) {
				handleViewAction({ type: "SKILL", skill: sim.pendingSkill, targetIndex: idx, isAlly: false });
			} else {
				handleViewAction({ type: "ATTACK", targetIndex: idx });
			}
		}

		/**
		 * Routes targeted choice against squad ally slot.
		 * [State Mutating]
		 * @param {number} idx
		 * @returns {void}
		 */
		function handleChoiceAllyTarget(idx) {
			if (!sim) return;
			const targetAlly = sim.party[idx];
			if (!targetAlly) return;
			const isEmber = sim.pendingItem === "PHOENIX_EMBER";
			const isValid = isEmber ? !targetAlly.alive : targetAlly.alive;
			if (!isValid) return;

			if (sim.pendingItem) {
				handleViewAction({
					type: "ITEM",
					itemId: sim.pendingItem,
					targetIndex: idx,
				});
			} else if (sim.pendingSkill) {
				handleViewAction({
					type: "SKILL",
					skill: sim.pendingSkill,
					targetIndex: idx,
					isAlly: true,
				});
			}
		}



		/**
		 * Routes numbered hotkey choices (1-4) to targeted actions or sub-menus.
		 * [State Mutating]
		 * @param {number} choiceNum - Numerical hotkey 1 to 4.
		 * @returns {void}
		 */
		function handleChoiceIndex(choiceNum) {
			if (!sim) return;
			const idx = choiceNum - 1;

			if (sim.phase === "TARGETING_ENEMY") {
				handleChoiceEnemyTarget(idx);
				return;
			}
			if (sim.phase === "TARGETING_ALLY") {
				handleChoiceAllyTarget(idx);
				return;
			}

			/** @type {Record<number, 'ATTACK'|'SKILLS'|'GUARD'|'POUCH'>} */
			const choiceMap = {
				1: "ATTACK",
				2: "SKILLS",
				3: "GUARD",
				4: "POUCH",
			};
			const mappedTab = choiceMap[choiceNum];
			if (mappedTab) {
				handleViewAction({ type: "SELECT_TAB", tab: mappedTab });
			}
		}

		/**
		 * Dispatches retreat action from battle.
		 * [State Machine Progression]
		 * @returns {void}
		 */
		function handleViewFlee() {
			if (!sim) return;
			if (sim.enemies.some((enemy) => enemy.isBoss)) {
				appendLog("Cannot flee from a boss battle!", "damage");
				dispatchSFX("DEFEAT");
			} else if (getRandomFloat() < 0.6) {
				appendLog("Retreated from the battlefield!", "system");
				finishBattle("escaped");
			} else {
				appendLog("Failed to escape!", "damage");
				sim.activeTurnIndex += 1;
				stepTurn();
			}
		}

		/**
		 * Primary action dispatch handler receiving actions from presentation renderer.
		 * [State Machine Progression]
		 * @param {CombatActionPayload|string} action - Incoming view command.
		 * @returns {void}
		 */
		function handleViewAction(action) {
			if (!action || !sim) return;

			/** @type {CombatActionPayload} */
			const actObj = typeof action === "string" ? { type: action } : action;
			const type = actObj.type;

			const actionHandlers = {
				ATTACK: () => {
					if (typeof actObj.targetIndex === "number") {
						playerExecuteAttack(actObj.targetIndex);
					}
				},
				SKILL: () => {
					if (typeof actObj.targetIndex === "number") {
						const targetSkill = actObj.skill || sim?.pendingSkill;
						if (targetSkill) {
							playerExecuteSkill(
								targetSkill,
								actObj.targetIndex,
								Boolean(actObj.isAlly),
							);
						}
						if (sim) sim.pendingSkill = null;
					}
				},
				ITEM: () => {
					if (typeof actObj.targetIndex === "number") {
						const itemToUse = actObj.itemId || sim?.pendingItem;
						if (itemToUse) {
							playerExecuteItem(itemToUse, actObj.targetIndex);
						}
						if (sim) sim.pendingItem = null;
					}
				},
				GUARD: () => {
					playerExecuteGuard();
				},
				FLEE: () => {
					handleViewFlee();
				},
				SELECT_TAB: () => {
					if (actObj.tab && sim) {
						sim.selectedTab = actObj.tab;
						sim.pendingSkill = null;
						sim.pendingItem = null;
						sim.phase =
							actObj.tab === "ATTACK" ? "TARGETING_ENEMY" : "PLAYER_INPUT";
						renderPresentation();
					}
				},
				SELECT_SKILL: () => {
					if (actObj.skill && sim) {
						sim.pendingSkill = actObj.skill;
						sim.phase =
							actObj.skill.targetType === "ally"
								? "TARGETING_ALLY"
								: "TARGETING_ENEMY";
						renderPresentation();
					}
				},
				CANCEL_SKILL: () => {
					if (sim) {
						sim.pendingSkill = null;
						sim.phase = "PLAYER_INPUT";
						renderPresentation();
					}
				},
				SELECT_ITEM: () => {
					if (actObj.itemId && sim) {
						sim.pendingItem = actObj.itemId;
						sim.phase = "TARGETING_ALLY";
						renderPresentation();
					}
				},
				CANCEL_ITEM: () => {
					if (sim) {
						sim.pendingItem = null;
						sim.phase = "PLAYER_INPUT";
						renderPresentation();
					}
				},
				TARGET_ALLY: () => {
					if (typeof actObj.targetIndex === "number" && sim) {
						if (sim.pendingItem) {
							playerExecuteItem(sim.pendingItem, actObj.targetIndex);
							sim.pendingItem = null;
						} else if (sim.pendingSkill) {
							playerExecuteSkill(sim.pendingSkill, actObj.targetIndex, true);
							sim.pendingSkill = null;
						}
					}
				},
				CONFIRM: () => {
					handleConfirmChoice();
				},
				CANCEL: () => {
					handleCancelChoice();
				},
			};

			if (
				/** @type {Record<string, function():void>} */ (actionHandlers)[type]
			) {
				/** @type {Record<string, function():void>} */ (actionHandlers)[type]();
			}
		}

		//#endregion

		//#region [SEC-11] Canonical 9-Method Lifecycle Gateway & Host Action Bus

		/**
		 * Resolves directional navigation inputs.
		 * [Pure Routing]
		 * @param {string} act
		 * @returns {boolean}
		 */
		function handleDirectionAction(act) {
			if (act === "UP" || act === "DOWN" || act === "LEFT" || act === "RIGHT") {
				handleDirectionalNav(act);
				return true;
			}
			return false;
		}

		/**
		 * Resolves choice shortcut actions.
		 * [Pure Routing]
		 * @param {string} act
		 * @returns {boolean}
		 */
		function handleChoiceAction(act) {
			if (act.startsWith("CHOICE_")) {
				const num = Number.parseInt(act.replace("CHOICE_", ""), 10);
				if (num >= 1 && num <= 4) {
					handleChoiceIndex(num);
					return true;
				}
			}
			return false;
		}

		/**
		 * Resolves incoming skill action execution.
		 * [State Mutating]
		 * @param {CombatActionPayload} actObj
		 * @returns {boolean}
		 */
		function handleSkillAction(actObj) {
			if (!sim) return false;
			const skill = actObj.skillNode ?? actObj.skill ?? sim.pendingSkill;
			if (!skill) return false;
			const targetIdx =
				typeof actObj.targetIndex === "number" ? actObj.targetIndex : 0;
			const isAlly = Boolean(actObj.isAlly);
			playerExecuteSkill(skill, targetIdx, isAlly);
			return true;
		}

		return {
			/**
			 * Accepts declarative static baseline configuration.
			 * [Lifecycle: CONFIGURE]
			 * @param {Object} cfg - Host configuration payload.
			 * @returns {void}
			 */
			configure(cfg) {
				assertLifecycle(State.UNCONFIGURED);
				hostConfig = deepFreeze({ ...cfg });
				lifecycleState = State.CONFIGURED;
			},

			/**
			 * Ingests peripheral driver dependencies and communication event buses.
			 * [Lifecycle: INIT]
			 * @param {Object} context - Host runtime environment handle.
			 * @returns {void}
			 */
			init(context) {
				assertLifecycle(State.CONFIGURED);
				hostContext = context;
				lifecycleState = State.INITIALIZED;
			},

			/**
			 * Ingests an immutable snapshot and hydrates initial simulation memory.
			 * [Lifecycle: RESET]
			 * @param {Object} [snapshot] - Ingress state snapshot.
			 * @returns {void}
			 */
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
					sim.enemies = spawnEnemies(sim.encounterKey);
				}

				appendLog("Battle commenced!", "ember");

				if (sim.enemies.some((e) => e.isBoss)) {
					hostContext?.eventBus?.publish?.("combat:banner", {
						text: "⚔️ BOSS ENCOUNTER ⚔️",
						subtext: "Malakor descends from the catacomb ashes!",
						color: "#ff9d4d",
						duration: 2.0,
					});
				}

				buildTurnQueue();
				lifecycleState = State.READY;

				if (autoRun) {
					runHeadlessLoop();
				} else {
					stepTurn();
				}
			},

			/**
			 * Advances scheduled task timers and processes queued external actions.
			 * [Lifecycle: UPDATE]
			 * @param {number} dt - Elapsed frame delta time in seconds.
			 * @param {Object} [context] - Context containing host input events.
			 * @returns {void}
			 */
			update(dt, context) {
				assertLifecycle(State.READY, State.RUNNING);
				lifecycleState = State.RUNNING;
				advanceScheduledTasks(dt);

				const actions = context?.inputs;
				if (Array.isArray(actions)) {
					for (const action of actions) {
						/** @type {CombatActionPayload} */
						const actObj =
							typeof action === "string" ? { type: action } : action;
						const type = actObj.type;
						if (type === "ATTACK" && typeof actObj.targetIndex === "number") {
							playerExecuteAttack(actObj.targetIndex);
						} else if (type === "GUARD") {
							playerExecuteGuard();
						} else if (type === "SKILL" && actObj.skillNode) {
							playerExecuteSkill(
								actObj.skillNode,
								actObj.targetIndex || 0,
								false,
							);
						}
					}
				}
			},

			/**
			 * Ingests discrete input action tokens from the host runtime or keyboard driver.
			 * [Host Input Router]
			 * @param {CombatActionPayload|string} action - Declared action.
			 * @returns {void}
			 */
			handleHostAction(action) {
				if (!sim) return;
				/** @type {CombatActionPayload} */
				const actObj = typeof action === "string" ? { type: action } : action;
				const act = actObj.type;
				if (!act) return;

				if (handleChoiceAction(act)) return;
				if (handleDirectionAction(act)) return;

				if (act === "SKILL" && handleSkillAction(actObj)) {
					return;
				}
				if (act === "ATTACK" && typeof actObj.targetIndex === "number") {
					playerExecuteAttack(actObj.targetIndex);
					return;
				}
				if (act === "GUARD") {
					playerExecuteGuard();
					return;
				}
				if (act === "CONFIRM") {
					handleConfirmChoice();
					return;
				}
				if (act === "CANCEL") {
					handleCancelChoice();
					return;
				}
				if (act === "FLEE") {
					handleViewAction({ type: "FLEE" });
					return;
				}
				handleViewAction(actObj);
			},

			/**
			 * Passes an immutable snapshot copy to the presentation viewport renderer.
			 * [Lifecycle: RENDER]
			 * @param {any} [renderer] - Optional custom presentation renderer.
			 * @param {CombatSimState} [context] - Explicit snapshot override.
			 * @returns {void}
			 */
			render(renderer, context) {
				assertLifecycle(State.READY, State.RUNNING);
				const activeRenderer =
					renderer ||
					hostContext?.combatRenderer ||
					(typeof EmberlightCombatRenderer !== "undefined"
						? EmberlightCombatRenderer
						: null);
				if (activeRenderer?.render) {
					const snapshot = context || structuredClone(sim);
					activeRenderer.render(snapshot, handleViewAction);
				}
			},

			/**
			 * Exports a deep-cloned immutable representation of current working state.
			 * [Lifecycle: GET_STATE]
			 * @returns {CombatSimState|null} State snapshot copy.
			 */
			getState() {
				assertLifecycle(State.READY, State.RUNNING);
				return structuredClone(sim);
			},

			/**
			 * Exports operational telemetry for Sentinel Auditor verification.
			 * [Lifecycle: GET_DIAGNOSTICS]
			 * @returns {CombatDiagnostics} Health and metrics report.
			 */
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

			/**
			 * Reports tenant metadata, protocol compliance, and capability registrations.
			 * [Lifecycle: GET_MODULE_INFO]
			 * @returns {CombatModuleInfo} Module information descriptor.
			 */
			getModuleInfo() {
				return {
					moduleId: "combat_core",
					version: "2.5.0",
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

			/**
			 * Releases all memory references, event listeners, and timers.
			 * [Lifecycle: DESTROY]
			 * @returns {void}
			 */
			destroy() {
				scheduledTasks = [];
				headlessEventQueue = [];
				sim = null;
				hostConfig = null;
				hostContext = null;
				lifecycleState = State.DESTROYED;
			},
		};
	}

	//#endregion

	//#region [SEC-12] Factory Instance Generator & Module Export

	const defaultInstance = createInstance({ isHeadless: false });
	defaultInstance.createInstance = createInstance;
	return defaultInstance;

	//#endregion
})();

if (typeof window !== "undefined") {
	window.EmberlightCombat = EmberlightCombat;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightCombat;
}
