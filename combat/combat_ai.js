/* cSpell:words VSRP Malakor Cataclysm */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: ENEMY AI & BOSS TRANSFORMATION (VSRP-001)
 * Document Identifier: VSRP-001-COMBAT-AI
 * Subsystem:           Hostile Decision Trees, Spawning, Boss Phases & Attack Routines
 * ============================================================================
 */
(() => {
/**
 * Hydrates concrete enemy units from encounter definitions.
 * [Pure Query / State Instantiation]
 * @param {string} encounterKey - Manifest encounter table key.
 * @param {any} manifest - Active manifest SSOT reference.
 * @returns {any[]} Fully instantiated hostile combatants.
 */
function spawnEnemies(encounterKey, manifest) {
	const table =
		manifest?.Encounters?.[encounterKey] ||
		manifest?.Encounters?.DEFAULT ||
		['SHADE_WOLF'];
	const defaultBackKeys = new Set([
		'BONE_ARCHER',
		'BLIGHT_SPIDER',
		'DREAD_ACOLYTE',
		'MOSS_GOLEM',
	]);

	return table.map((/** @type {any} */ enemyKey, /** @type {number} */ idx) => {
		const base = manifest?.Enemies?.[enemyKey] || {
			label: 'Unknown Beast',
			sprite: '👾',
			baseStats: { hp: 10, atk: 5, def: 2, agi: 5 },
			targeting: 'RANDOM',
			rewards: { exp: 5, gold: 5 },
		};

		/** @type {'FRONT'|'BACK'|'BOTH'} */
		let row = 'FRONT';
		if (base.isBoss) {
			row = 'BOTH';
		} else if (defaultBackKeys.has(enemyKey)) {
			row = 'BACK';
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
 * Evaluates enemy AI targeting heuristics against available targets.
 * [Pure Query]
 * @param {any} active - Attacking enemy entity.
 * @param {any[]} livingParty - List of alive squad members.
 * @param {() => number} getRandomFloat - PRNG float provider.
 * @returns {any} Selected squad target.
 */
function selectEnemyTarget(active, livingParty, getRandomFloat) {
	let candidateParty = livingParty;
	const frontParty = livingParty.filter(
		(c) => c.row === 'FRONT' || c.row === 'BOTH',
	);
	if (frontParty.length > 0 && active.targeting !== 'RANGED_SNIPER') {
		candidateParty = frontParty;
	}

	if (active.targeting === 'LOWEST_DEF') {
		return candidateParty.slice().sort((a, b) => a.def - b.def)[0];
	}
	if (active.targeting === 'HIGHEST_ATK') {
		return candidateParty.slice().sort((a, b) => a.atk - b.atk)[0];
	}
	return candidateParty[
		Math.floor(getRandomFloat() * candidateParty.length)
	];
}

/**
 * Evaluates boss health ratio to trigger phase 2 enrage transitions.
 * [Authoritative State Mutation]
 * @param {any} enemy - Boss entity being evaluated.
 * @param {(msg: string, type?: string) => void} appendLog - Log helper.
 * @param {(sfxName: string) => void} dispatchSFX - Audio helper.
 * @param {any} hostContext - Host runtime context handle.
 * @returns {void}
 */
function checkBossPhase(enemy, appendLog, dispatchSFX, hostContext) {
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
		enemy.sprite = enemy.phaseTwoStats.sprite || '🌋';
		enemy.atk = enemy.phaseTwoStats.atk;
		enemy.def = enemy.phaseTwoStats.def;
		enemy.agi = enemy.phaseTwoStats.agi;
		if (enemy.phaseTwoStats.rotation) {
			enemy.rotation = [...enemy.phaseTwoStats.rotation];
		}
		appendLog(
			`🔥 BOSS ENRAGE! ${enemy.name} assumes ${enemy.phaseTwoStats.label || 'Phase 2'} form!`,
			'ember',
		);
		dispatchSFX('BOSS_ROAR');
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('combat:boss_phase_change', {
				enemyId: enemy.id,
				phase: 2,
			});
		}
	}
}

/**
 * Executes a specialized boss rotation skill pattern.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} boss - Hostile boss entity.
 * @param {any} pattern - Scripted attack action pattern.
 * @param {any[]} livingParty - List of alive squad members.
 * @param {any} helpers - Injected simulation helpers.
 * @returns {void}
 */
function executeBossPatternAction(sim, boss, pattern, livingParty, helpers) {
	if (!sim) return;
	const {
		appendLog,
		dispatchSFX,
		getRandomFloat,
		triggerAttackerLunge,
		checkUnitDefeat,
		applyAilment,
		hostContext,
		renderPresentation,
	} = helpers;

	const bossIdx = sim.enemies.findIndex((/** @type {any} */ e) => e.id === boss.id);
	triggerAttackerLunge(false, bossIdx !== -1 ? bossIdx : 0);
	appendLog(`⚡ ${boss.name} unleashes ${pattern.label}!`, 'ember');
	dispatchSFX(pattern.sfx || 'SPELL_BOLT');

	const powerMult = pattern.power || 1.0;

	if (pattern.type === 'CLEAVE_TWO') {
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
				'damage',
			);

			const heroIdx = sim?.party.findIndex((/** @type {any} */ c) => c.id === target.id) ?? -1;
			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish('combat:damage', {
					amount: finalDmg,
					targetType: 'party',
					targetIndex: heroIdx !== -1 ? heroIdx : 0,
					isCrit: true,
					isHeal: false,
				});
			}
			checkUnitDefeat(target);
		});
	} else if (pattern.type === 'STUN_LOWEST') {
		const target = livingParty.slice().sort((a, b) => a.def - b.def)[0];
		const rawDmg = Math.max(1, boss.atk - target.def);
		target.hp = Math.max(0, target.hp - rawDmg);
		appendLog(`${target.name} choked by ash for ${rawDmg} DMG!`, 'damage');
		applyAilment(target, 'STUN', 1);

		const heroIdx = sim?.party.findIndex((/** @type {any} */ c) => c.id === target.id) ?? -1;
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('combat:damage', {
				amount: rawDmg,
				targetType: 'party',
				targetIndex: heroIdx !== -1 ? heroIdx : 0,
				isCrit: false,
				isHeal: false,
			});
		}
		checkUnitDefeat(target);
	} else if (pattern.type === 'AOE_ALL') {
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
				'damage',
			);
			if (getRandomFloat() < 0.5) applyAilment(target, 'BURN', 2);

			const heroIdx = sim?.party.findIndex((/** @type {any} */ c) => c.id === target.id) ?? -1;
			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish('combat:damage', {
					amount: finalDmg,
					targetType: 'party',
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
 * @param {any} sim - Active simulation state.
 * @param {any} active - Hostile attacker.
 * @param {any} target - Target party member.
 * @param {any} helpers - Injected simulation helpers.
 * @returns {void}
 */
function applyEnemyAttack(sim, active, target, helpers) {
	if (!sim) return;
	const {
		appendLog,
		dispatchSFX,
		getRandomFloat,
		hostContext,
		applyAilment,
		executeDisplacement,
		checkUnitDefeat,
	} = helpers;

	const rawDmg = Math.max(1, active.atk * 2 - target.def);
	const variance = Math.floor(getRandomFloat() * 3) - 1;
	const finalDmg = Math.max(1, rawDmg + variance);
	target.hp = Math.max(0, target.hp - finalDmg);
	dispatchSFX('ATTACK_HIT');
	appendLog(
		`${active.name} attacks ${target.name} for ${finalDmg} DMG!`,
		'damage',
	);

	const heroIdx = sim.party.findIndex((/** @type {any} */ c) => c.id === target.id);
	if (hostContext?.eventBus?.publish) {
		hostContext.eventBus.publish('combat:damage', {
			amount: finalDmg,
			targetType: 'party',
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
			active.ailmentProc.id || active.ailmentProc.type || 'POISON',
			active.ailmentProc.duration || 3,
		);
	}

	if (target.alive) {
		const isBrute =
			active.key === 'IRON_BRUTE' ||
			(typeof active.key === 'string' && active.key.includes('BRUTE')) ||
			active.key === 'CATACOMB_SKELETON';
		const isTether =
			active.key === 'CAVE_SPIDER' || active.key === 'DREAD_ACOLYTE';
		if (isBrute && getRandomFloat() < 0.35 && target.row === 'FRONT') {
			executeDisplacement(active, target, 'KNOCKBACK', true);
		} else if (
			isTether &&
			getRandomFloat() < 0.3 &&
			target.row === 'BACK'
		) {
			executeDisplacement(active, target, 'PULL', true);
		}
	}

	checkUnitDefeat(target);
}

/**
 * Orchestrates enemy turn routing between scripted boss patterns and basic strikes.
 * [State Machine Progression]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Injected simulation helpers.
 * @returns {void}
 */
function executeEnemyTurn(sim, helpers) {
	if (!sim) return;
	const {
		stepTurn,
		checkBattleEnd,
		triggerAttackerLunge,
		renderPresentation,
		schedule,
	} = helpers;

	const active = sim.turnQueue[sim.activeTurnIndex]?.entity;
	if (!active?.alive) {
		stepTurn();
		return;
	}

	const livingParty = sim.party.filter((/** @type {any} */ c) => c.alive);
	if (livingParty.length === 0) {
		checkBattleEnd();
		return;
	}

	if (active.isBoss && active.rotation && active.rotation.length > 0) {
		const pattern =
			active.rotation[sim.bossRotationIndex % active.rotation.length];
		sim.bossRotationIndex += 1;
		executeBossPatternAction(sim, active, pattern, livingParty, helpers);
		renderPresentation();
		schedule(stepTurn, 700);
		return;
	}

	const target = selectEnemyTarget(active, livingParty, helpers.getRandomFloat);
	const enemyIdx = sim.enemies.findIndex((/** @type {any} */ e) => e.id === active.id);
	triggerAttackerLunge(false, enemyIdx !== -1 ? enemyIdx : 0);

	applyEnemyAttack(sim, active, target, helpers);
	renderPresentation();
	schedule(stepTurn, 600);
}

const CombatAI = Object.freeze({
	spawnEnemies,
	selectEnemyTarget,
	checkBossPhase,
	executeBossPatternAction,
	applyEnemyAttack,
	executeEnemyTurn,
});

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
	window._CombatInternal.AI = CombatAI;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = CombatAI;
}
})();
