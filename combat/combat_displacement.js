/* cSpell:words VSRP KNOCKBACK */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: TACTICAL DISPLACEMENT & FORMATIONS (VSRP-001)
 * Document Identifier: VSRP-001-COMBAT-DISPLACEMENT
 * Subsystem:           Tactical Row Physics, Vanguard Shielding, Interception, Knockback & Pull
 * ============================================================================
 */
'use strict';

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
}

/**
 * Checks whether any conscious frontline units remain to block incoming attacks.
 * [Pure Query]
 * @param {any} sim - Active simulation state.
 * @param {'party'|'enemy'} side - Target formation wing.
 * @returns {boolean} True if vanguard frontline is active.
 */
function isFrontRowAlive(sim, side) {
	if (!sim) return false;
	if (side === 'enemy') {
		return sim.enemies.some(
			(e) => e.alive && (e.row === 'FRONT' || e.row === 'BOTH'),
		);
	}
	return sim.party.some(
		(c) => c.alive && (c.row === 'FRONT' || c.row === 'BOTH'),
	);
}

/**
 * Evaluates whether a target unit is protected from melee attacks by living vanguard.
 * [Pure Query]
 * @param {any} sim - Active simulation state.
 * @param {any} target - Target unit to evaluate.
 * @param {'party'|'enemy'} side - Wing orientation of target.
 * @param {string} [attackType='PHYSICAL'] - Attack classification.
 * @returns {boolean} True if attack cannot directly strike target.
 */
function isTargetShielded(sim, target, side, attackType = 'PHYSICAL') {
	if (!target?.alive) return false;
	if (target.row === 'BOTH' || target.row === 'FRONT') return false;
	if (
		attackType === 'MAGICAL' ||
		attackType === 'RANGED' ||
		attackType === 'HEAL'
	)
		return false;
	return isFrontRowAlive(sim, side);
}

/**
 * Intercepts attacks aimed at protected backline enemies by redirecting to frontline guard.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} enemy - Original target.
 * @param {number} targetIndex - Original target index.
 * @param {boolean} isMelee - Physical melee indicator.
 * @param {function(string, string=):void} [appendLog] - Log helper.
 * @param {function(string):void} [dispatchSFX] - Audio helper.
 * @param {function(string, string, number, number):void} [triggerAnimation] - Animation trigger callback.
 * @param {boolean} [isHeadless=false] - Headless execution flag.
 * @returns {{ actualTarget: any, actualIndex: number, wasIntercepted: boolean }}
 */
function applyInterception(
	sim,
	enemy,
	targetIndex,
	isMelee,
	appendLog,
	dispatchSFX,
	triggerAnimation,
	isHeadless = false,
) {
	if (!sim) {
		return {
			actualTarget: enemy,
			actualIndex: targetIndex,
			wasIntercepted: false,
		};
	}
	if (isMelee && isTargetShielded(sim, enemy, 'enemy', 'PHYSICAL')) {
		const livingFrontline = sim.enemies.filter(
			(e) => e.alive && (e.row === 'FRONT' || e.row === 'BOTH'),
		);
		if (livingFrontline.length > 0) {
			const actualTarget = livingFrontline[0];
			const actualIndex = sim.enemies.findIndex(
				(e) => e.id === actualTarget.id,
			);
			if (appendLog) {
				appendLog(
					`🛡️ ${actualTarget.name} intercepts the strike meant for ${enemy.name}!`,
					'ember',
				);
			}
			if (dispatchSFX) dispatchSFX('RESIST');
			if (!isHeadless && triggerAnimation) {
				triggerAnimation('DEFLECT', 'enemy', targetIndex, 350);
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
 * Repositions target unit between Frontline and Rear Backline.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} actor - Unit executing displacement.
 * @param {any} target - Unit being shifted.
 * @param {'KNOCKBACK'|'PULL'} displacementType - Displacement vector.
 * @param {boolean} isAllyTarget - Whether target belongs to party wing.
 * @param {function(string, string=):void} [appendLog] - Log helper.
 * @param {function(string):void} [dispatchSFX] - Audio helper.
 * @param {function(string, string, number, number):void} [triggerAnimation] - Animation trigger callback.
 * @param {boolean} [isHeadless=false] - Headless execution flag.
 * @returns {void}
 */
function executeDisplacement(
	sim,
	actor,
	target,
	displacementType,
	isAllyTarget,
	appendLog,
	dispatchSFX,
	triggerAnimation,
	isHeadless = false,
) {
	if (!sim || !target?.alive || target.isBoss || target.row === 'BOTH') {
		return;
	}

	const side = isAllyTarget ? 'party' : 'enemy';
	const targetIndex = isAllyTarget
		? sim.party.findIndex((c) => c.id === target.id)
		: sim.enemies.findIndex((e) => e.id === target.id);

	if (
		displacementType === 'KNOCKBACK' &&
		(target.row === 'FRONT' || !target.row)
	) {
		target.row = 'BACK';
		if (appendLog) {
			appendLog(
				`💨 DISPLACEMENT! ${target.name} is knocked back to the REAR ROW!`,
				'ember',
			);
		}
		if (dispatchSFX) dispatchSFX('SWIFT_WHOOSH');
		if (!isHeadless && triggerAnimation) {
			triggerAnimation('KNOCKBACK', side, targetIndex, 450);
		}
	} else if (displacementType === 'PULL' && target.row === 'BACK') {
		target.row = 'FRONT';
		if (appendLog) {
			appendLog(
				`🪝 DISPLACEMENT! ${target.name} is dragged forward into the VANGUARD!`,
				'ember',
			);
		}
		if (dispatchSFX) dispatchSFX('SWIFT_WHOOSH');
		if (!isHeadless && triggerAnimation) {
			triggerAnimation('PULL', side, targetIndex, 450);
		}
	}
}

const CombatDisplacement = Object.freeze({
	isFrontRowAlive,
	isTargetShielded,
	applyInterception,
	executeDisplacement,
});

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
	window._CombatInternal.Displacement = CombatDisplacement;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = CombatDisplacement;
}
