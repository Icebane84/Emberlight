/* cSpell:words VSRP Backline backline pheno firebolt */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: MATHEMATICAL CALCULUS & SKILLS (VSRP-001)
 * Document Identifier: VSRP-001-COMBAT-CALC
 * Subsystem:           Pure Domain Calculus, Elemental Affinities, Skills & Growth
 * ============================================================================
 */
'use strict';

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
}

/**
 * Resolves elemental damage effectiveness against target defensive profile.
 * [Pure Query]
 * @param {string|undefined|null} attackElement - Attack elemental category.
 * @param {any} target - Target defending unit.
 * @returns {{ label: 'NORMAL'|'WEAK'|'RESIST', multiplier: number }} Evaluated affinity coefficient.
 */
function resolveAffinity(attackElement, target) {
	if (!attackElement || !target) return { label: 'NORMAL', multiplier: 1.0 };
	const elem = attackElement.toUpperCase();
	if (target.weakness?.toUpperCase() === elem) {
		return { label: 'WEAK', multiplier: 1.5 };
	}
	if (target.resistance?.toUpperCase() === elem) {
		return { label: 'RESIST', multiplier: 0.5 };
	}
	return { label: 'NORMAL', multiplier: 1.0 };
}

/**
 * Computes final damage scaling from raw base damage and elemental properties.
 * [Pure Query]
 * @param {number} rawDmg - Raw input damage value.
 * @param {string|undefined|null} attackElement - Attack elemental category.
 * @param {any} target - Target defending unit.
 * @returns {{ finalDmg: number, isWeakness: boolean, isResisted: boolean, multiplier: number }}
 */
function calculateAffinityDamage(rawDmg, attackElement, target) {
	const affinity = resolveAffinity(attackElement, target);
	const isWeakness = affinity.label === 'WEAK';
	const isResisted = affinity.label === 'RESIST';
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
	if (isWeakness) return ' 💥 [WEAKNESS!]';
	if (isResisted) return ' 🛡️ [RESISTED]';
	return '';
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
	if (isGuaranteedCrit) return ' 🌟 [CRITICAL HARMONIC STRIKE!]';
	if (isWeakness) return ' 💥 [WEAKNESS!]';
	if (isResisted) return ' 🛡️ [RESISTED]';
	return '';
}

/**
 * Calculates damage for skills including positioning bonuses, elemental affinity, and terrain multipliers.
 * [Pure Query]
 * @param {any} node - Skill descriptor.
 * @param {any} activeChar - Executing combatant.
 * @param {any} actualTarget - Targeted recipient.
 * @param {boolean} isGuaranteedCrit - Critical hit assertion flag.
 * @param {string} [terrain] - Current combat terrain.
 * @param {function(string, string=):void} [appendLog] - Log dispatch helper.
 * @returns {{ finalDmg: number, isWeakness: boolean, isResisted: boolean }} Damage outcome.
 */
function computeSkillDamage(node, activeChar, actualTarget, isGuaranteedCrit, terrain, appendLog) {
	const isRanged =
		node?.subType === 'bolt' ||
		node?.subType === 'spell' ||
		Boolean(node?.isRanged);
	const charAtk = typeof activeChar?.atk === 'number' ? activeChar.atk : 10;
	const targetDef = typeof actualTarget?.def === 'number' ? actualTarget.def : 0;

	let baseVal;
	if (typeof node?.mult === 'number') {
		baseVal = Math.round(charAtk * node.mult * 2 - targetDef);
	} else {
		const power = typeof node?.power === 'number' ? node.power : 10;
		baseVal = power * 2 - targetDef;
	}

	let rawDmg = Math.max(1, Number.isFinite(baseVal) ? baseVal : 1);
	const backlineBonus = activeChar?.row === 'BACK' && isRanged ? 1.15 : 1.0;
	rawDmg = Math.round(rawDmg * backlineBonus);

	if (isGuaranteedCrit) {
		rawDmg = Math.round(rawDmg * 1.75);
	}

	const skillElement =
		node?.element || (node?.subType === 'bolt' ? 'FIRE' : 'PHYSICAL');
	let { finalDmg, isWeakness, isResisted } = calculateAffinityDamage(
		rawDmg,
		skillElement,
		actualTarget,
	);

	if ((terrain === 'ICE' || terrain === '=') && skillElement === 'FIRE') {
		finalDmg = Math.max(1, Math.round(finalDmg * 1.25));
		if (appendLog) {
			appendLog(
				'🔥 THERMAL SHOCK! Ice terrain amplifies fire damage (+25%)!',
				'ember',
			);
		}
	}

	return {
		finalDmg: Number.isFinite(finalDmg) && finalDmg > 0 ? finalDmg : 1,
		isWeakness,
		isResisted,
	};
}

/**
 * Checks whether target successfully evaded an arcane spell strike from the rear row.
 * [Pure Query]
 * @param {any} target - Target defender.
 * @param {any} node - Skill descriptor.
 * @param {function():number} getRandomFloat - PRNG float helper.
 * @param {function(string, string=):void} appendLog - Log helper.
 * @param {function(string):void} dispatchSFX - Audio helper.
 * @returns {boolean}
 */
function checkArcaneEvasion(target, node, getRandomFloat, appendLog, dispatchSFX) {
	const isMagical = node.subType === 'spell' || node.element !== undefined;
	if (target.row === 'BACK' && isMagical && getRandomFloat() < 0.15) {
		if (appendLog) {
			appendLog(
				`✨ ${target.name} evaded arcane surge via Backline Magic Evasion!`,
				'system',
			);
		}
		if (dispatchSFX) dispatchSFX('RESIST');
		return true;
	}
	return false;
}

/**
 * Extracts attuned active skills from the Aether Matrix constellation graph.
 * [Pure Query]
 * @param {string[]} unlockedIds - List of attuned node identifiers.
 * @param {any} manifest - Active declarative manifest reference.
 * @returns {any[]} Array of executable skills.
 */
function collectAetherActiveSkills(unlockedIds, manifest) {
	const skills = [];
	if (!manifest?.AetherNodes) return skills;
	for (const nodeId of unlockedIds) {
		const node = manifest.AetherNodes[nodeId];
		if (node?.type === 'active' && !skills.some((s) => s.id === node.id)) {
			skills.push(node);
		}
	}
	return skills;
}

/**
 * Extracts attuned active skills from legacy archetype skill trees.
 * [Pure Query]
 * @param {string[]} unlockedIds - List of attuned node identifiers.
 * @param {string} phenotype - Character class archetype.
 * @param {any} manifest - Active declarative manifest reference.
 * @returns {any[]} Array of executable skills.
 */
function collectSkillTreeActiveSkills(unlockedIds, phenotype, manifest) {
	const skills = [];
	const tree = manifest?.SkillTrees?.[phenotype];
	if (!tree) return skills;
	for (const branch of Object.values(tree)) {
		if (Array.isArray(branch)) {
			for (const node of branch) {
				if (
					node.type === 'active' &&
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
 * [Pure Query]
 * @param {string} phenotype - Character class archetype.
 * @returns {any} Fallback active skill.
 */
function getDefaultPhenotypeSkill(phenotype) {
	if (phenotype === 'MAGE') {
		return {
			id: 'mag_des_1',
			label: 'Flame Surge',
			mpCost: 5,
			element: 'FIRE',
			description: 'Unleash searing firebolt with burn chance.',
			subType: 'bolt',
			power: 12,
		};
	}
	if (phenotype === 'HEALER') {
		return {
			id: 'hea_lum_1',
			label: 'Soothing Light',
			mpCost: 4,
			element: 'HOLY',
			description: 'Restores 25 HP to target ally.',
			targetType: 'ally',
			subType: 'heal',
			power: 25,
		};
	}
	return {
		id: 'war_vor_1',
		label: 'Cleave Strike',
		mpCost: 4,
		element: 'PHYSICAL',
		description: 'Heavy melee slash deal 1.5x damage.',
		subType: 'strike',
		mult: 1.5,
	};
}

/**
 * Aggregates unlocked active skills for a given character instance.
 * [Pure Query]
 * @param {any} activeChar - Active squad member.
 * @param {any} manifest - Active manifest SSOT reference.
 * @returns {any[]} Array of executable skills.
 */
function getAvailableSkills(activeChar, manifest) {
	const unlockedIds = activeChar?.unlockedNodes || activeChar?.unlocked || [];
	const phenotype = activeChar?.phenotype || 'HERO';

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
 * Applies attribute and level progressions to a single hero unit.
 * [Authoritative State Mutation]
 * @param {any} c - Hero entity.
 * @param {any} manifest - Manifest SSOT reference.
 * @param {function(string, string=):void} appendLog - Log helper.
 * @returns {void}
 */
function applyHeroLevelUp(c, manifest, appendLog) {
	c.level = (c.level || 1) + 1;
	c.skillPoints = (c.skillPoints || 0) + 1;
	c.unspentSP = (c.unspentSP || 0) + 1;
	const phenotypeMap = manifest.Phenotypes || manifest.Classes || {};
	const phenoKey = c.phenotype || 'HERO';
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
	if (appendLog) {
		appendLog(`🎉 ${c.name} reached Level ${c.level}! (+1 SP)`, 'ember');
	}
}

const CombatCalc = Object.freeze({
	resolveAffinity,
	calculateAffinityDamage,
	resolveAffinityTag,
	resolveSkillHitTag,
	computeSkillDamage,
	checkArcaneEvasion,
	collectAetherActiveSkills,
	collectSkillTreeActiveSkills,
	getDefaultPhenotypeSkill,
	getAvailableSkills,
	applyHeroLevelUp,
});

if (typeof window !== 'undefined') {
	window._CombatInternal = window._CombatInternal || {};
	window._CombatInternal.Calc = CombatCalc;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = CombatCalc;
}
