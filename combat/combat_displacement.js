/* cSpell:words VSRP KNOCKBACK */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: TACTICAL DISPLACEMENT & FORMATIONS (VSRP-001)
 * Document Identifier: VSRP-001-COMBAT-DISPLACEMENT
 * Subsystem:           Tactical Row Physics, Vanguard Shielding, Interception, Knockback & Pull
 * ============================================================================
 */
(() => {
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
			(/** @type {any} */ e) => e.alive && (e.row === 'FRONT' || e.row === 'BOTH'),
		);
	}
	return sim.party.some(
		(/** @type {any} */ c) => c.alive && (c.row === 'FRONT' || c.row === 'BOTH'),
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
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @param {(sfxName: string) => void} [dispatchSFX] - Audio helper.
 * @param {(anim: string, side: string, idx: number, dur: number) => void} [triggerAnimation] - Animation trigger callback.
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
			(/** @type {any} */ e) => e.alive && (e.row === 'FRONT' || e.row === 'BOTH'),
		);
		if (livingFrontline.length > 0) {
			const actualTarget = livingFrontline[0];
			const actualIndex = sim.enemies.findIndex(
				(/** @type {any} */ e) => e.id === actualTarget.id,
			);
			if (appendLog) {
				appendLog(
					`🛡️ ${actualTarget.name} intercepts the strike meant for ${enemy.name}!`,
					'ember',
				);
			}
			if (dispatchSFX) dispatchSFX('RESIST');
			if (triggerAnimation) {
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
 * Applies knockback repositioning to backline.
 * @param {any} target - Target unit.
 * @param {string} side - Formation side.
 * @param {number} targetIndex - Target position.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @param {(sfxName: string) => void} [dispatchSFX] - Audio helper.
 * @param {(anim: string, side: string, idx: number, dur: number) => void} [triggerAnimation] - Animation callback.
 */
function applyKnockback(target, side, targetIndex, appendLog, dispatchSFX, triggerAnimation) {
	if (target.row === 'FRONT' || !target.row) {
		target.row = 'BACK';
		if (appendLog) {
			appendLog(
				`💨 DISPLACEMENT! ${target.name} is knocked back to the REAR ROW!`,
				'ember',
			);
		}
		if (dispatchSFX) dispatchSFX('SWIFT_WHOOSH');
		if (triggerAnimation) {
			triggerAnimation('KNOCKBACK', side, targetIndex, 450);
		}
	}
}

/**
 * Applies pull repositioning to frontline.
 * @param {any} target - Target unit.
 * @param {string} side - Formation side.
 * @param {number} targetIndex - Target position.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @param {(sfxName: string) => void} [dispatchSFX] - Audio helper.
 * @param {(anim: string, side: string, idx: number, dur: number) => void} [triggerAnimation] - Animation callback.
 */
function applyPull(target, side, targetIndex, appendLog, dispatchSFX, triggerAnimation) {
	if (target.row === 'BACK') {
		target.row = 'FRONT';
		if (appendLog) {
			appendLog(
				`🪝 DISPLACEMENT! ${target.name} is dragged forward into the VANGUARD!`,
				'ember',
			);
		}
		if (dispatchSFX) dispatchSFX('SWIFT_WHOOSH');
		if (triggerAnimation) {
			triggerAnimation('PULL', side, targetIndex, 450);
		}
	}
}

/**
 * Repositions target unit between Frontline and Rear Backline.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} target - Unit being shifted.
 * @param {'KNOCKBACK'|'PULL'} displacementType - Displacement vector.
 * @param {boolean} isAllyTarget - Whether target belongs to party wing.
 * @param {(msg: string, type?: string) => void} [appendLog] - Log helper.
 * @param {(sfxName: string) => void} [dispatchSFX] - Audio helper.
 * @param {(anim: string, side: string, idx: number, dur: number) => void} [triggerAnimation] - Animation trigger callback.
 * @returns {void}
 */
function executeDisplacement(
	sim,
	target,
	displacementType,
	isAllyTarget,
	appendLog,
	dispatchSFX,
	triggerAnimation,
) {
	if (!sim || !target?.alive || target.isBoss || target.row === 'BOTH') {
		return;
	}

	const side = isAllyTarget ? 'party' : 'enemy';
	const targetIndex = isAllyTarget
		? sim.party.findIndex((/** @type {any} */ c) => c.id === target.id)
		: sim.enemies.findIndex((/** @type {any} */ e) => e.id === target.id);

	if (displacementType === 'KNOCKBACK') {
		applyKnockback(target, side, targetIndex, appendLog, dispatchSFX, triggerAnimation);
	} else if (displacementType === 'PULL') {
		applyPull(target, side, targetIndex, appendLog, dispatchSFX, triggerAnimation);
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
})();
