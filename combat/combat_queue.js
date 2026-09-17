/* cSpell:words VSRP */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: CTB TURN QUEUE & STATUS AILMENTS (VSRP-001)
 * Document Identifier: VSRP-001-COMBAT-QUEUE
 * Subsystem:           Conditional Turn-Based Scheduling, Delay Calculus, Status Conditions
 * ============================================================================
 */

(() => {

/**
 * Afflicts a target unit with a status condition for a defined duration.
 * [Authoritative State Mutation]
 * @param {any} target - Target recipient entity.
 * @param {string} ailmentId - Condition token ('POISON', 'BURN', 'STUN').
 * @param {number} [duration=3] - Lifetime in active turns.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log dispatch helper.
 * @returns {void}
 */
function applyAilment(target, ailmentId, duration, appendLog) {
	if (!target?.alive) return;
	const dur = typeof duration === "number" ? duration : 3;
	if (!target.ailments) target.ailments = [];
	const existing = target.ailments.find((/** @type {any} */ a) => a.id === ailmentId);
	if (existing) {
		existing.duration = Math.max(existing.duration, dur);
	} else {
		target.ailments.push({ id: ailmentId, duration: dur });
	}
	if (appendLog) {
		appendLog(`${target.name} is afflicted with ${ailmentId}!`, "damage");
	}
}

/**
 * Evaluates damage and effects for a single ailment on a target.
 * [Authoritative State Mutation]
 * @param {any} target - Active entity being evaluated.
 * @param {any} active - Active ailment instance.
 * @param {any} manifest - Active manifest SSOT reference.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log dispatch helper.
 * @returns {boolean} True if the ailment causes turn skip (stun).
 */
function tickSingleAilment(target, active, manifest, appendLog) {
	const def = manifest?.Ailments?.[active.id];
	if (!def) return false;

	if (def.type === "skip_turn") {
		if (appendLog) {
			appendLog(`${target.name} is stunned and loses their turn!`, "ember");
		}
		return true;
	}

	if (def.type === "dot") {
		const res = def.tick(target);
		if (appendLog && res?.msg) {
			appendLog(res.msg, "damage");
		}
		if (target.hp <= 0) {
			target.hp = 0;
			target.alive = false;
			if (appendLog) {
				appendLog(`${target.name} succumbed to ${active.id}!`, "damage");
			}
		}
	}
	return false;
}

/**
 * Evaluates damage and turn skipping for all ailments on the active combatant.
 * [Authoritative State Mutation]
 * @param {any} target - Active entity being evaluated.
 * @param {any} manifest - Active manifest SSOT reference.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log dispatch helper.
 * @returns {boolean} True if the entity is stunned and cannot act.
 */
function tickAilments(target, manifest, appendLog) {
	if (!target?.alive || !target.ailments || target.ailments.length === 0) {
		return false;
	}
	let isStunned = false;

	for (let i = target.ailments.length - 1; i >= 0; i--) {
		const active = target.ailments[i];
		if (tickSingleAilment(target, active, manifest, appendLog)) {
			isStunned = true;
		}
		active.duration -= 1;
		if (active.duration <= 0) {
			if (appendLog) {
				appendLog(`${target.name} recovered from ${active.id}.`, "system");
			}
			target.ailments.splice(i, 1);
		}
	}
	return isStunned;
}

/**
 * Builds CTB turn queue based on unit delays, applying ambush rules on tall grass.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @param {(sfxName: string) => void} [dispatchSFX] - Audio helper.
 * @returns {void}
 */
function buildTurnQueue(sim, appendLog, dispatchSFX) {
	if (!sim) return;
	const isIce = sim.terrain === "ICE" || sim.terrain === "=";
	const isGrass = sim.terrain === "GRASS" || sim.terrain === '"';

	const allLiving = [
		...sim.party
			.filter((/** @type {any} */ c) => c.alive)
			.map((/** @type {any} */ c) => ({
				type: "party",
				entity: c,
				effectiveAgi: c.agi + (isIce ? 2 : 0),
			})),
		...sim.enemies
			.filter((/** @type {any} */ e) => e.alive)
			.map((/** @type {any} */ e) => ({
				type: "enemy",
				entity: e,
				effectiveAgi: e.agi,
			})),
	];

	allLiving.sort(
		(a, b) =>
			(a.entity.accumulatedDelay || 0) - (b.entity.accumulatedDelay || 0),
	);

	if (isGrass && sim.roundCount === 0) {
		const enemies = allLiving.filter((/** @type {any} */ u) => u.type === "enemy");
		const heroes = allLiving.filter((/** @type {any} */ u) => u.type === "party");
		sim.turnQueue = [...enemies, ...heroes];
		if (appendLog) {
			appendLog("⚡ AMBUSH! Foes strike first from the tall grass!", "damage");
		}
		if (dispatchSFX) dispatchSFX("ENCOUNTER_TRIGGER");
	} else {
		sim.turnQueue = allLiving;
	}

	sim.activeTurnIndex = 0;
	sim.roundCount += 1;
}

const CombatQueue = Object.freeze({
	applyAilment,
	tickAilments,
	buildTurnQueue,
});

if (typeof window !== "undefined") {
	window._CombatInternal = window._CombatInternal || {};
	window._CombatInternal.Queue = CombatQueue;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = CombatQueue;
}
})();
