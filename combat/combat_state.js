/* cSpell:words VSRP UNCONFIGURED */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: STATE LIFECYCLE & RESOLUTION (VSRP-001)
 * Document Identifier: VSRP-001-COMBAT-STATE
 * Subsystem:           State Baseline, Party Hydration, Mortality, Victory & Defeat
 * ============================================================================
 */
(() => {

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
}

/** @enum {string} */
const State = Object.freeze({
	UNCONFIGURED: 'UNCONFIGURED',
	CONFIGURED: 'CONFIGURED',
	INITIALIZED: 'INITIALIZED',
	READY: 'READY',
	RUNNING: 'RUNNING',
	DESTROYED: 'DESTROYED',
});

/**
 * Recursively seals an object graph against mutation.
 * [State Mutating / Deep Freeze]
 * @template T
 * @param {T} obj - Target object.
 * @returns {Readonly<T>} Immutable reference.
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

/**
 * Creates an empty baseline state shape for combat simulation memory.
 * [Pure Query]
 * @returns {any} Clean state dictionary.
 */
function createDefaultState() {
	return {
		prngState: 1337,
		phase: 'IDLE',
		encounterKey: 'DEFAULT',
		terrain: 'PATH',
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
		selectedTab: 'ATTACK',
		bossRotationIndex: 0,
	};
}

/**
 * Hydrates and guarantees required combat fields on incoming party snapshot.
 * [Pure Query]
 * @param {Array<Partial<any>>} [partySnapshot=[]] - Input squad array.
 * @returns {any[]} Hydrated combatant list.
 */
function hydratePartySnapshot(partySnapshot = []) {
	return partySnapshot.map((c) => {
		const isBack = c.phenotype === 'MAGE' || c.phenotype === 'HEALER';
		const isAlive = c.alive !== false && (c.hp === undefined || c.hp > 0);
		return {
			...structuredClone(c),
			id: c.id || 'hero_unit',
			name: c.name || 'Hero',
			phenotype: c.phenotype || 'HERO',
			level: c.level || 1,
			alive: isAlive,
			hp: isAlive ? Math.max(1, c.hp || 30) : 0,
			maxHp: c.maxHp || c.hp || 30,
			mp: c.mp !== undefined ? c.mp : c.maxMp || 10,
			maxMp: c.maxMp || 10,
			atk: c.atk || 10,
			def: c.def || 5,
			agi: c.agi || 5,
			row: c.row || (isBack ? 'BACK' : 'FRONT'),
			accumulatedDelay: 1000 / Math.max(1, c.agi || 10),
			ailments: Array.isArray(c.ailments) ? [...c.ailments] : [],
		};
	});
}

/**
 * Checks whether target collapsed and updates mortality state.
 * [Authoritative State Mutation]
 * @param {any} target - Checked unit.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @returns {boolean} True if unit collapsed.
 */
function checkUnitDefeat(target, appendLog) {
	if (target.hp <= 0) {
		target.hp = 0;
		target.alive = false;
		if (appendLog) {
			appendLog(`${target.name} collapsed!`, 'damage');
		}
		return true;
	}
	return false;
}

/**
 * Calculates and applies EXP, gold, and item spoils following battle victory.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} manifest - Manifest SSOT reference.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @returns {void}
 */
function distributeVictoryRewards(sim, manifest, appendLog) {
	if (!sim) return;
	let totExp = 0;
	let totGold = 0;
	/** @type {string[]} */
	const itemsAwarded = [];

	sim.enemies.forEach((/** @type {any} */ e) => {
		totExp += e.rewards?.exp || 0;
		totGold += e.rewards?.gold || 0;
		if (e.rewards?.item) itemsAwarded.push(e.rewards.item);
	});

	sim.party
		.filter((/** @type {any} */ c) => c.alive)
		.forEach((/** @type {any} */ c) => {
			c.exp = (c.exp || 0) + totExp;
			const curveFn =
				manifest?.Curves?.expForNextLevel ||
				((/** @type {number} */ lv) => Math.round(20 * lv ** 1.4));
			if (c.exp >= curveFn(c.level || 1)) {
				const internal = typeof window !== 'undefined' ? window._CombatInternal : undefined;
				const calc = /** @type {any} */ (internal?.Calc);
				if (calc?.applyHeroLevelUp) {
					calc.applyHeroLevelUp(c, manifest, appendLog);
				}
			}
		});

	sim.gold += totGold;
	sim.lastGainedGold = totGold;
	sim.lastGainedExp = totExp;

	itemsAwarded.forEach((itemId) => {
		if (sim) {
			sim.inventory[itemId] = (sim.inventory[itemId] || 0) + 1;
		}
		if (appendLog) {
			appendLog(`Claimed relic item: ${itemId}!`, 'ember');
		}
	});

	if (appendLog) {
		appendLog(`Acquired ${totGold} gold and ${totExp} EXP.`, 'ember');
	}
}

/**
 * Resolves defeat state transitions and schedule callbacks.
 * [State Machine Progression]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Injected simulation helpers.
 * @returns {void}
 */
function resolveDefeat(sim, helpers) {
	if (!sim) return;
	const { dispatchSFX, appendLog, renderPresentation, finishBattle, isHeadless, autoRun, schedule } = helpers;
	sim.phase = 'DEFEAT';
	dispatchSFX('DEFEAT');
	appendLog('The party has fallen in battle...', 'damage');
	renderPresentation();
	if (isHeadless || autoRun) {
		finishBattle('defeat');
	} else {
		schedule(() => finishBattle('defeat'), 800);
	}
}

/**
 * Resolves victory state transitions, banner events, and reward distribution.
 * [State Machine Progression]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Injected simulation helpers.
 * @returns {void}
 */
function resolveVictory(sim, helpers) {
	if (!sim) return;
	const {
		dispatchSFX,
		appendLog,
		hostContext,
		renderPresentation,
		finishBattle,
		isHeadless,
		autoRun,
		schedule,
		getActiveManifest,
	} = helpers;

	sim.phase = 'VICTORY';
	dispatchSFX('VICTORY');
	appendLog('Victory! All foes vanquished.', 'heal');

	hostContext?.eventBus?.publish?.('combat:victory', {});
	hostContext?.eventBus?.publish?.('combat:banner', {
		text: '🏆 VICTORY ACHIEVED 🏆',
		subtext: 'All hostile threats vanquished! Spoils secured.',
		color: '#ffcc00',
		duration: 2.2,
	});

	distributeVictoryRewards(sim, getActiveManifest(), appendLog);
	renderPresentation();

	if (isHeadless || autoRun) {
		finishBattle('victory');
	} else {
		schedule(() => finishBattle('victory'), 1500);
	}
}

/**
 * Evaluates terminal victory or defeat conditions across party and hostile units.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Injected simulation helpers.
 * @returns {boolean} True if combat encounter has concluded.
 */
function checkBattleEnd(sim, helpers) {
	if (!sim) return true;
	const partyAlive = sim.party.some((/** @type {any} */ c) => c.alive);
	if (!partyAlive) {
		resolveDefeat(sim, helpers);
		return true;
	}
	const enemiesAlive = sim.enemies.some((/** @type {any} */ e) => e.alive);
	if (!enemiesAlive) {
		resolveVictory(sim, helpers);
		return true;
	}
	return false;
}

/**
 * Dispatches terminal battle resolution envelope over the host EventBus.
 * [State Mutating / Bus Dispatch]
 * @param {any} sim - Active simulation state.
 * @param {'victory'|'defeat'|'escaped'} outcome - Result classification.
 * @param {any} hostContext - Host runtime context.
 * @returns {void}
 */
function finishBattle(sim, outcome, hostContext) {
	if (!sim) return;
	if (hostContext?.eventBus?.publish) {
		hostContext.eventBus.publish('combat:resolved', {
			outcome,
			encounterKey: sim.encounterKey,
			party: structuredClone(sim.party),
			gold: sim.gold,
			inventory: structuredClone(sim.inventory),
		});
	}
}

const CombatState = Object.freeze({
	State,
	deepFreeze,
	createDefaultState,
	hydratePartySnapshot,
	checkUnitDefeat,
	distributeVictoryRewards,
	resolveDefeat,
	resolveVictory,
	checkBattleEnd,
	finishBattle,
});

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
	window._CombatInternal.State = CombatState;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = CombatState;
}
})();
