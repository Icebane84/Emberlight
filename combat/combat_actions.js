/* cSpell:words VSRP KNOCKBACK Ailments Malakor SSOT mult */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: ACTION EXECUTION KERNEL (VSRP-001 / MPFS-001)
 * Document Identifier: VSRP-001-COMBAT-ACTIONS
 * Subsystem:           Action Handling, Attack/Skill/Item Resolution, Guard & Flee
 * ============================================================================
 */

//#region [SEC-00-TYPEDEFS] AMBIENT COMBAT ACTION CONTRACTS
/**
 * @typedef {Object} CombatEntity
 * @property {string} id - Unique entity identifier.
 * @property {string} name - Display name.
 * @property {number} hp - Current hit points.
 * @property {number} maxHp - Maximum hit points.
 * @property {number} mp - Current mana points.
 * @property {number} maxMp - Maximum mana points.
 * @property {number} atk - Attack power rating.
 * @property {number} def - Defense rating.
 * @property {boolean} alive - Life state flag.
 * @property {'FRONT'|'BACK'|'BOTH'} [row] - Combat positioning row.
 * @property {boolean} [isBoss] - Boss entity flag.
 * @property {boolean} [isGuarding] - Tactical guard stance flag.
 * @property {string} [weakness] - Elemental weakness descriptor.
 * @property {string[]} [weaknesses] - Elemental weakness array.
 * @property {string} [resistance] - Elemental resistance descriptor.
 * @property {string[]} [resistances] - Elemental resistance array.
 */

/**
 * @typedef {Object} ActionDescriptor
 * @property {string} type - Action command type ('ATTACK', 'SKILL', 'ITEM', 'GUARD', etc.).
 * @property {number} [targetIndex] - Explicit target array index.
 * @property {number} [targetSlot] - Alternative target slot index.
 * @property {boolean} [isAlly] - Side designation flag.
 * @property {any} [skill] - Skill object payload.
 * @property {string} [skillId] - Skill unique identifier token.
 * @property {string} [itemId] - Inventory item token.
 * @property {string} [intentId] - Transient idempotency identifier.
 * @property {string} [actionType] - Fallback action type specifier.
 * @property {string} [targetId] - Target entity identifier.
 * @property {{ x: number, y: number }} [targetTile] - Tile coordinate for knockback/displacement.
 * @property {string} [tab] - Selected navigation tab.
 */

/**
 * @typedef {Object} CombatSimulationState
 * @property {CombatEntity[]} party - Active hero squad array.
 * @property {CombatEntity[]} enemies - Active enemy combatants array.
 * @property {Array<{ entity: CombatEntity }>} turnQueue - Combat turn order queue.
 * @property {number} activeTurnIndex - Current active turn index in queue.
 * @property {string} [phase] - Current phase of combat state machine.
 * @property {any} [pendingSkill] - Pending skill waiting for target selection.
 * @property {string|null} [pendingItem] - Pending item waiting for target selection.
 * @property {string} [selectedTab] - Active UI selection tab.
 * @property {Record<string, number>} [inventory] - Consumables inventory dictionary.
 */
//#endregion

/**
 * Resolves basic physical melee attack executed by active hero.
 * [Authoritative State Mutation]
 * @param {CombatSimulationState} sim - Active simulation state.
 * @param {number} targetEnemyIndex - Selected target position in enemy row.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function playerExecuteAttack(sim, targetEnemyIndex, helpers) {
	if (!sim) return;
	const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
	const target = sim.enemies[targetEnemyIndex];
	if (!activeChar || !target?.alive) return;

	const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
	helpers.triggerAttackerLunge(true, heroIdx !== -1 ? heroIdx : 0);

	const Displacement = helpers.Displacement;
	const Calc = helpers.Calc;
	const AI = helpers.AI;

	const { actualTarget, actualIndex, wasIntercepted } =
		Displacement.applyInterception(
			sim,
			target,
			targetEnemyIndex,
			true,
			helpers.appendLog,
			helpers.dispatchSFX,
			helpers.triggerDisplacementVisual,
		);

	const rawDmg = Math.max(1, activeChar.atk * 2 - actualTarget.def);
	const variance = Math.floor(helpers.getRandomFloat() * 3) - 1;
	const attackDmg = Math.max(1, rawDmg + variance);
	const { finalDmg, isWeakness, isResisted } = Calc.calculateAffinityDamage(
		attackDmg,
		"PHYSICAL",
		actualTarget,
	);

	actualTarget.hp = Math.max(0, actualTarget.hp - finalDmg);
	helpers.dispatchSFX("ATTACK_HIT");

	const tag = Calc.resolveAffinityTag(isWeakness, isResisted);
	const interceptTag = wasIntercepted ? " [INTERCEPTED]" : "";
	helpers.appendLog(
		`${activeChar.name} strikes ${actualTarget.name} for ${finalDmg} DMG!${tag}${interceptTag}`,
		isWeakness ? "ember" : "damage",
	);

	helpers.publish("combat:damage", {
		amount: finalDmg,
		targetType: "enemy",
		targetIndex: actualIndex,
		isCrit: isWeakness || variance > 0,
		isHeal: false,
	});

	AI.checkBossPhase(
		actualTarget,
		helpers.appendLog,
		helpers.dispatchSFX,
		helpers.hostContext,
	);

	if (helpers.checkUnitDefeat(actualTarget) && helpers.checkBattleEnd()) {
		return;
	}

	helpers.renderPresentation();
	helpers.schedule(helpers.stepTurn, 600);
}

/**
 * Puts active character into tactical guard stance (-50% DMG, +2 MP).
 * [Authoritative State Mutation]
 * @param {CombatSimulationState} sim - Active simulation state.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function playerExecuteGuard(sim, helpers) {
	if (!sim) return;
	const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
	if (!activeChar?.alive) return;

	activeChar.isGuarding = true;
	activeChar.mp = Math.min(activeChar.maxMp, activeChar.mp + 2);
	helpers.appendLog(
		`${activeChar.name} raises their guard! (-50% DMG, +2 MP)`,
		"system",
	);
	helpers.dispatchSFX("BUFF");

	const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
	helpers.publish("combat:text", {
		text: "GUARD",
		targetType: "party",
		targetIndex: heroIdx !== -1 ? heroIdx : 0,
		color: "#38bdf8",
		isLarge: true,
	});

	helpers.renderPresentation();
	helpers.schedule(helpers.stepTurn, 400);
}

/**
 * Resolves item consumption from squad pouch inventory onto target ally.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {string} itemId - Consumable token ('POTION', 'ETHER', 'PHOENIX_EMBER').
 * @param {number} targetIdx - Target squad member index.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function playerExecuteItem(sim, itemId, targetIdx, helpers) {
	if (!sim) return;
	const target = sim.party[targetIdx];
	if (!target) return;

	if (itemId === "POTION") {
		if (!target.alive) {
			helpers.appendLog(
				`${target.name} is collapsed and cannot drink a potion!`,
				"damage",
			);
			return;
		}
		target.hp = Math.min(target.maxHp, target.hp + 30);
		helpers.appendLog(`${target.name} drank Potion (+30 HP)!`, "heal");
		helpers.dispatchSFX("HEAL");
		helpers.publish("combat:damage", {
			amount: 30,
			targetType: "party",
			targetIndex: targetIdx,
			isHeal: true,
			isCrit: false,
		});
	} else if (itemId === "ETHER") {
		if (!target.alive) {
			helpers.appendLog(`${target.name} is collapsed!`, "damage");
			return;
		}
		target.mp = Math.min(target.maxMp, target.mp + 15);
		helpers.appendLog(`${target.name} drank Ether (+15 MP)!`, "ember");
		helpers.dispatchSFX("HEAL");
		helpers.publish("combat:damage", {
			amount: 15,
			targetType: "party",
			targetIndex: targetIdx,
			isHeal: true,
			isCrit: false,
		});
	} else if (itemId === "PHOENIX_EMBER") {
		target.alive = true;
		target.hp = Math.max(1, Math.round(target.maxHp * 0.5));
		helpers.appendLog(
			`${target.name} revived by Phoenix Ember (+${target.hp} HP)!`,
			"heal",
		);
		helpers.dispatchSFX("HEAL");
		helpers.publish("combat:damage", {
			amount: target.hp,
			targetType: "party",
			targetIndex: targetIdx,
			isHeal: true,
			isCrit: true,
		});
	}

	if ((sim.inventory[itemId] || 0) > 0) {
		sim.inventory[itemId] -= 1;
	}

	sim.phase = "PLAYER_INPUT";
	sim.selectedTab = "ATTACK";
	helpers.renderPresentation();
	helpers.schedule(helpers.stepTurn, 400);
}

/**
 * Resolves ally-targeted recovery or warding skills.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} node - Active skill definition.
 * @param {number} targetIndex - Target ally slot.
 * @param {boolean} isGuaranteedCrit - Critical boost assertion.
 * @param {any} activeChar - Casting unit.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function executeAllySkill(
	sim,
	node,
	targetIndex,
	isGuaranteedCrit,
	activeChar,
	helpers,
) {
	if (!sim) return;
	const ally = sim.party[targetIndex];
	if (!ally?.alive) return;
	const power = typeof node?.power === "number" ? node.power : 20;
	const missingHp = Math.max(0, (ally.maxHp || 30) - (ally.hp || 0));
	const healed = power === 999 ? missingHp : Math.min(power, missingHp);
	ally.hp = Math.min(ally.maxHp || 30, (ally.hp || 0) + healed);
	helpers.dispatchSFX("HEAL");
	helpers.appendLog(
		`${activeChar.name} casts ${node.label || "Heal"} on ${ally.name}, restoring ${healed} HP!`,
		"heal",
	);

	helpers.publish("combat:damage", {
		amount: healed,
		targetType: "party",
		targetIndex,
		isCrit: isGuaranteedCrit,
		isHeal: true,
	});
}

/**
 * Resolves offensive skills targeted against hostile enemies.
 * [Authoritative State Mutation]
 * @param {any} sim - Active simulation state.
 * @param {any} node - Offensive skill descriptor.
 * @param {number} targetIndex - Target hostile index.
 * @param {boolean} isGuaranteedCrit - Critical boost assertion.
 * @param {any} activeChar - Attacking unit.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function executeEnemySkill(
	sim,
	node,
	targetIndex,
	isGuaranteedCrit,
	activeChar,
	helpers,
) {
	if (!sim) return;
	const enemy = sim.enemies[targetIndex];
	if (!enemy?.alive) return;

	const Displacement = helpers.Displacement;
	const Calc = helpers.Calc;
	const AI = helpers.AI;
	const Queue = helpers.Queue;

	const isMelee = node.subType === "strike";
	const { actualTarget, actualIndex, wasIntercepted } =
		Displacement.applyInterception(
			sim,
			enemy,
			targetIndex,
			isMelee,
			helpers.appendLog,
			helpers.dispatchSFX,
			helpers.triggerDisplacementVisual,
		);

	if (
		Calc.checkArcaneEvasion(
			actualTarget,
			node,
			helpers.getRandomFloat,
			helpers.appendLog,
			helpers.dispatchSFX,
		)
	) {
		helpers.schedule(helpers.stepTurn, 500);
		return;
	}

	const { finalDmg, isWeakness, isResisted } = Calc.computeSkillDamage(
		node,
		activeChar,
		actualTarget,
		isGuaranteedCrit,
		sim?.terrain,
		helpers.appendLog,
	);
	actualTarget.hp = Math.max(0, actualTarget.hp - finalDmg);
	helpers.dispatchSFX(node.subType === "bolt" ? "SPELL_BOLT" : "ATTACK_HIT");

	const tag = Calc.resolveSkillHitTag(isGuaranteedCrit, isWeakness, isResisted);
	const interceptTag = wasIntercepted ? " [INTERCEPTED]" : "";
	const logTone = isWeakness || isGuaranteedCrit ? "ember" : "damage";
	helpers.appendLog(
		`${activeChar.name} casts ${node.label} on ${actualTarget.name} for ${finalDmg} DMG!${tag}${interceptTag}`,
		logTone,
	);

	helpers.publish("combat:damage", {
		amount: finalDmg,
		targetType: "enemy",
		targetIndex: actualIndex,
		isCrit:
			isGuaranteedCrit || isWeakness || Boolean(node.mult && node.mult > 1.5),
		isHeal: false,
	});

	AI.checkBossPhase(
		actualTarget,
		helpers.appendLog,
		helpers.dispatchSFX,
		helpers.hostContext,
	);
	if (node.id === "mag_des_1" && helpers.getRandomFloat() < 0.4) {
		Queue.applyAilment(actualTarget, "BURN", 3, helpers.appendLog);
	}
	if (node.displacement && actualTarget.alive) {
		Displacement.executeDisplacement(
			sim,
			actualTarget,
			node.displacement,
			false,
			helpers.appendLog,
			helpers.dispatchSFX,
			helpers.triggerDisplacementVisual,
		);
	}
	helpers.checkUnitDefeat(actualTarget);
}

/**
 * Finalizes skill resolution, visual effects, and advances the turn schedule.
 * [State Machine Progression]
 * @param {CombatSimulationState} sim - Active simulation state.
 * @param {any} node - Resolved skill node.
 * @param {number} targetIndex - Target slot.
 * @param {boolean} isAllyTarget - Targeted side.
 * @param {boolean} isGuaranteedCrit - Critical assertion flag.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function finalizeSkillExecution(
	sim,
	node,
	targetIndex,
	isAllyTarget,
	isGuaranteedCrit,
	helpers,
) {
	if (!sim) return;
	const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
	if (!activeChar) return;

	const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
	if (node.subType === "strike") {
		helpers.triggerAttackerLunge(true, heroIdx !== -1 ? heroIdx : 0);
	} else {
		helpers.triggerChannelingSurge(heroIdx !== -1 ? heroIdx : 0);
	}

	if (isAllyTarget) {
		executeAllySkill(
			sim,
			node,
			targetIndex,
			isGuaranteedCrit,
			activeChar,
			helpers,
		);
	} else {
		executeEnemySkill(
			sim,
			node,
			targetIndex,
			isGuaranteedCrit,
			activeChar,
			helpers,
		);
	}

	if (helpers.checkBattleEnd()) {
		return;
	}

	helpers.renderPresentation();
	helpers.schedule(helpers.stepTurn, 500);
}

/**
 * Entry point for executing character skills, managing MP deduction and harmonic triggers.
 * [Authoritative State Mutation]
 * @param {CombatSimulationState} sim - Active simulation state.
 * @param {any} node - Target skill node.
 * @param {number} targetIndex - Target entity index.
 * @param {boolean} isAllyTarget - Whether skill targets ally.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function playerExecuteSkill(sim, node, targetIndex, isAllyTarget, helpers) {
	if (!sim) return;
	const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
	if (!activeChar || activeChar.mp < node.mpCost) return;

	if (node.tier === 3 || node.id?.endsWith("_3")) {
		sim.phase = "HARMONIC_CHANNELING";
		helpers.renderHarmonicChannelingStage(node, (/** @type {number} */ resonanceScore) => {
			activeChar.mp -= node.mpCost;
			const isGuaranteedCrit = resonanceScore >= 90;
			finalizeSkillExecution(
				sim,
				node,
				targetIndex,
				isAllyTarget,
				isGuaranteedCrit,
				helpers,
			);
		});
		return;
	}

	activeChar.mp -= node.mpCost;
	finalizeSkillExecution(sim, node, targetIndex, isAllyTarget, false, helpers);
}

/**
 * Resolves confirmation key input based on active menu phase.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
/**
 * Handles confirmation dispatch when targeting an ally.
 * @param {CombatSimulationState} sim - Simulation state.
 * @param {any} helpers - Helpers kernel.
 * @returns {void}
 */
function handleConfirmTargetingAlly(sim, helpers) {
	const isEmber = sim.pendingItem === "PHOENIX_EMBER";
	const targetAllyIdx = sim.party.findIndex((c) =>
		isEmber ? !c.alive : c.alive,
	);
	if (targetAllyIdx === -1) return;
	if (sim.pendingItem) {
		handleViewAction(
			sim,
			{ type: "ITEM", itemId: sim.pendingItem, targetIndex: targetAllyIdx },
			helpers,
		);
	} else if (sim.pendingSkill) {
		handleViewAction(
			sim,
			{
				type: "SKILL",
				skill: sim.pendingSkill,
				targetIndex: targetAllyIdx,
				isAlly: true,
			},
			helpers,
		);
	}
}

/**
 * Handles confirmation dispatch when targeting an enemy.
 * @param {CombatSimulationState} sim - Simulation state.
 * @param {any} helpers - Helpers kernel.
 * @returns {void}
 */
function handleConfirmTargetingEnemy(sim, helpers) {
	const livingEnemyIdx = sim.enemies.findIndex((e) => e.alive);
	if (livingEnemyIdx === -1) return;
	if (sim.pendingSkill) {
		handleViewAction(
			sim,
			{
				type: "SKILL",
				skill: sim.pendingSkill,
				targetIndex: livingEnemyIdx,
				isAlly: false,
			},
			helpers,
		);
	} else {
		handleViewAction(
			sim,
			{ type: "ATTACK", targetIndex: livingEnemyIdx },
			helpers,
		);
	}
}

/**
 * Handles confirmation dispatch for tab selection shortcuts.
 * @param {any} sim - Simulation state.
 * @param {any} helpers - Helpers kernel.
 * @returns {void}
 */
function handleConfirmTabSelection(sim, helpers) {
	if (sim.selectedTab === "SKILLS") {
		const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
		const skills = helpers.Calc.getAvailableSkills(
			activeChar,
			helpers.getActiveManifest(),
		);
		if (skills.length > 0) {
			handleViewAction(
				sim,
				{ type: "SELECT_SKILL", skill: skills[0] },
				helpers,
			);
		}
	} else if (sim.selectedTab === "POUCH") {
		const inv = sim.inventory || {};
		const availableItem = ["POTION", "ETHER", "PHOENIX_EMBER"].find(
			(id) => (inv[id] || 0) > 0,
		);
		if (availableItem) {
			handleViewAction(
				sim,
				{ type: "SELECT_ITEM", itemId: availableItem },
				helpers,
			);
		}
	}
}

/**
 * Resolves confirmation key input based on active menu phase.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function handleConfirmChoice(sim, helpers) {
	if (!sim) return;

	if (sim.phase === "VICTORY") {
		helpers.finishBattle(sim, "victory");
		return;
	}
	if (sim.phase === "DEFEAT") {
		helpers.finishBattle(sim, "defeat");
		return;
	}
	if (sim.selectedTab === "GUARD") {
		handleViewAction(sim, { type: "GUARD" }, helpers);
		return;
	}
	if (sim.phase === "TARGETING_ALLY" || sim.phase === "TARGET_ALLY") {
		handleConfirmTargetingAlly(sim, helpers);
		return;
	}
	if (sim.selectedTab === "ATTACK" || sim.phase === "TARGETING_ENEMY") {
		handleConfirmTargetingEnemy(sim, helpers);
		return;
	}
	handleConfirmTabSelection(sim, helpers);
}

/**
 * Resolves cancel / back navigation in combat UI menus.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function handleCancelChoice(sim, helpers) {
	if (!sim) return;
	if (sim.pendingSkill) {
		handleViewAction(sim, { type: "CANCEL_SKILL" }, helpers);
	} else if (sim.pendingItem) {
		handleViewAction(sim, { type: "CANCEL_ITEM" }, helpers);
	} else if (sim.selectedTab !== "ATTACK") {
		handleViewAction(sim, { type: "SELECT_TAB", tab: "ATTACK" }, helpers);
	} else if (sim.phase === "PLAYER_INPUT") {
		handleViewAction(sim, { type: "FLEE" }, helpers);
	}
}

/**
 * Cycles active action tabs left and right.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {'UP'|'DOWN'|'LEFT'|'RIGHT'} direction - Directional token.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function handleDirectionalNav(sim, direction, helpers) {
	if (!sim) return;
	const tabs = ["ATTACK", "SKILLS", "GUARD", "POUCH"];
	const curTabIdx = tabs.indexOf(sim.selectedTab || "ATTACK");

	if (direction === "LEFT" || direction === "UP") {
		const nextIdx = (curTabIdx - 1 + tabs.length) % tabs.length;
		handleViewAction(sim, { type: "SELECT_TAB", tab: tabs[nextIdx] }, helpers);
	} else if (direction === "RIGHT" || direction === "DOWN") {
		const nextIdx = (curTabIdx + 1) % tabs.length;
		handleViewAction(sim, { type: "SELECT_TAB", tab: tabs[nextIdx] }, helpers);
	}
}

/**
 * Handles numeric choice routing for enemy target selection.
 * @param {any} sim - Simulation state.
 * @param {number} idx - Target index.
 * @param {any} helpers - Helpers kernel.
 * @returns {void}
 */
function handleChoiceEnemyTarget(sim, idx, helpers) {
	if (!sim.enemies[idx]?.alive) return;
	if (sim.pendingSkill) {
		handleViewAction(
			sim,
			{
				type: "SKILL",
				skill: sim.pendingSkill,
				targetIndex: idx,
				isAlly: false,
			},
			helpers,
		);
	} else {
		handleViewAction(sim, { type: "ATTACK", targetIndex: idx }, helpers);
	}
}

/**
 * Handles numeric choice routing for ally target selection.
 * @param {any} sim - Simulation state.
 * @param {number} idx - Target index.
 * @param {any} helpers - Helpers kernel.
 * @returns {void}
 */
function handleChoiceAllyTarget(sim, idx, helpers) {
	const targetAlly = sim.party[idx];
	if (!targetAlly) return;
	const isEmber = sim.pendingItem === "PHOENIX_EMBER";
	const isValid = isEmber ? !targetAlly.alive : targetAlly.alive;
	if (!isValid) return;

	if (sim.pendingItem) {
		handleViewAction(
			sim,
			{ type: "ITEM", itemId: sim.pendingItem, targetIndex: idx },
			helpers,
		);
	} else if (sim.pendingSkill) {
		handleViewAction(
			sim,
			{
				type: "SKILL",
				skill: sim.pendingSkill,
				targetIndex: idx,
				isAlly: true,
			},
			helpers,
		);
	}
}

/**
 * Routes numbered hotkey choices (1-4) to targeted actions or sub-menus.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {number} choiceNum - Numerical hotkey 1 to 4.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function handleChoiceIndex(sim, choiceNum, helpers) {
	if (!sim) return;
	const idx = choiceNum - 1;

	if (sim.phase === "TARGETING_ENEMY") {
		handleChoiceEnemyTarget(sim, idx, helpers);
		return;
	}
	if (sim.phase === "TARGETING_ALLY") {
		handleChoiceAllyTarget(sim, idx, helpers);
		return;
	}

	/** @type {Record<number, string>} */
	const choiceMap = {
		1: "ATTACK",
		2: "SKILLS",
		3: "GUARD",
		4: "POUCH",
	};
	const mappedTab = choiceMap[choiceNum];
	if (mappedTab) {
		handleViewAction(sim, { type: "SELECT_TAB", tab: mappedTab }, helpers);
	}
}

/**
 * Resolves fallback target index for action dispatch with boundary clamping.
 * [Pure Query / State Guard]
 * @param {ActionDescriptor} actObj - Incoming action payload object.
 * @param {CombatSimulationState} sim - Active simulation state snapshot.
 * @returns {number} Validated target index guaranteed to exist or fallback safely.
 */
function resolveTargetIndex(actObj, sim) {
	if (typeof actObj.targetIndex === "number") {
		const list = actObj.isAlly ? (sim.party || []) : (sim.enemies || []);
		if (list[actObj.targetIndex]?.alive) return actObj.targetIndex;
		const fallbackIdx = list.findIndex((e) => e.alive);
		return fallbackIdx !== -1 ? fallbackIdx : actObj.targetIndex;
	}
	if (typeof actObj.targetSlot === "number") {
		return actObj.targetSlot;
	}
	const candidateList = actObj.isAlly ? (sim.party || []) : (sim.enemies || []);
	const idx = candidateList.findIndex((e) => e.alive);
	return idx !== -1 ? idx : 0;
}

/**
 * Primary action dispatch handler receiving actions from presentation renderer.
 * [State Machine Progression]
 * @param {CombatSimulationState} sim - Active simulation state.
 * @param {any} action - Incoming view command.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function handleViewAction(sim, action, helpers) {
	if (!action || !sim) return;

	const actObj = typeof action === "string" ? { type: action } : action;
	const type = actObj.type || actObj.actionType;
	if (!type) return;

	// Transient Idempotency Guard for Dual Dispatch:
	if (actObj.intentId) {
		if (actObj.intentId === helpers.getLastProcessedIntentId()) {
			return;
		}
		helpers.setLastProcessedIntentId(actObj.intentId);
	}

	const targetIdx = resolveTargetIndex(actObj, sim);

	/** @type {Record<string, () => void>} */
	const actionHandlers = {
		ATTACK: () => {
			playerExecuteAttack(sim, targetIdx, helpers);
		},
		SKILL: () => {
			let targetSkill = actObj.skill || sim?.pendingSkill;
			if (!targetSkill && actObj.skillId) {
				const manifest = helpers.getActiveManifest();
				/** @type {Array<{ id: string, [key: string]: any }>} */
				const catalog = manifest?.skills || manifest?.progression?.skills || [];
				targetSkill = catalog.find((s) => s.id === actObj.skillId) || null;
			}
			if (targetSkill) {
				playerExecuteSkill(
					sim,
					targetSkill,
					targetIdx,
					Boolean(actObj.isAlly || targetSkill.targetType === "ally"),
					helpers,
				);
			}
			if (sim) sim.pendingSkill = null;
		},
		ITEM: () => {
			const itemToUse = actObj.itemId || sim?.pendingItem;
			if (itemToUse) {
				playerExecuteItem(sim, itemToUse, targetIdx, helpers);
			}
			if (sim) sim.pendingItem = null;
		},
		GUARD: () => {
			playerExecuteGuard(sim, helpers);
		},
		FLEE: () => {
			if (sim.enemies.some((enemy) => enemy.isBoss)) {
				helpers.appendLog("Cannot flee from a boss battle!", "damage");
				helpers.dispatchSFX("DEFEAT");
			} else if (helpers.getRandomFloat() < 0.6) {
				helpers.appendLog("Retreated from the battlefield!", "system");
				helpers.finishBattle(sim, "escaped");
			} else {
				helpers.appendLog("Failed to escape!", "damage");
				helpers.stepTurn();
			}
		},
		SELECT_TAB: () => {
			if (actObj.tab && sim) {
				sim.selectedTab = actObj.tab;
				sim.pendingSkill = null;
				sim.pendingItem = null;
				sim.phase =
					actObj.tab === "ATTACK" ? "TARGETING_ENEMY" : "PLAYER_INPUT";
				helpers.renderPresentation();
			}
		},
		SELECT_SKILL: () => {
			if (actObj.skill && sim) {
				sim.pendingSkill = actObj.skill;
				sim.phase =
					actObj.skill.targetType === "ally"
						? "TARGETING_ALLY"
						: "TARGETING_ENEMY";
				helpers.renderPresentation();
			}
		},
		CANCEL_SKILL: () => {
			if (sim) {
				sim.pendingSkill = null;
				sim.phase = "PLAYER_INPUT";
				helpers.renderPresentation();
			}
		},
		SELECT_ITEM: () => {
			if (actObj.itemId && sim) {
				sim.pendingItem = actObj.itemId;
				sim.phase = "TARGETING_ALLY";
				helpers.renderPresentation();
			}
		},
		CANCEL_ITEM: () => {
			if (sim) {
				sim.pendingItem = null;
				sim.phase = "PLAYER_INPUT";
				helpers.renderPresentation();
			}
		},
		SELECT_TARGET: () => {
			if (typeof actObj.targetIndex === "number" && sim) {
				const isAlly = Boolean(actObj.isAlly);
				if (isAlly) {
					if (sim.pendingItem) {
						playerExecuteItem(
							sim,
							sim.pendingItem,
							actObj.targetIndex,
							helpers,
						);
						sim.pendingItem = null;
					} else if (sim.pendingSkill) {
						playerExecuteSkill(
							sim,
							sim.pendingSkill,
							actObj.targetIndex,
							true,
							helpers,
						);
						sim.pendingSkill = null;
					}
				} else if (sim.pendingSkill) {
					playerExecuteSkill(
						sim,
						sim.pendingSkill,
						actObj.targetIndex,
						false,
						helpers,
					);
					sim.pendingSkill = null;
				} else {
					playerExecuteAttack(sim, actObj.targetIndex, helpers);
				}
			}
		},
		TARGET_ALLY: () => {
			if (typeof actObj.targetIndex === "number" && sim) {
				if (sim.pendingItem) {
					playerExecuteItem(sim, sim.pendingItem, actObj.targetIndex, helpers);
					sim.pendingItem = null;
				} else if (sim.pendingSkill) {
					playerExecuteSkill(
						sim,
						sim.pendingSkill,
						actObj.targetIndex,
						true,
						helpers,
					);
					sim.pendingSkill = null;
				}
			}
		},
		CONFIRM: () => {
			handleConfirmChoice(sim, helpers);
		},
		CANCEL: () => {
			handleCancelChoice(sim, helpers);
		},
		SET_ROW: () => {
			if (sim) {
				const activeChar =
					sim.turnQueue[sim.activeTurnIndex]?.entity || sim.party[0];
				if (activeChar) {
					activeChar.row =
						actObj.row || (activeChar.row === "FRONT" ? "BACK" : "FRONT");
					helpers.appendLog(
						`${activeChar.name} shifted stance to ${activeChar.row} row.`,
						"system",
					);
					helpers.renderPresentation();
				}
			}
		},
		STAGGER_STRIKE: () => {
			if (typeof actObj.targetIndex === "number" && sim) {
				playerExecuteAttack(sim, actObj.targetIndex, helpers);
			}
		},
		SCAN_AFFINITY: () => {
			if (sim && actObj.targetId) {
				const target = sim.enemies.find((e) => e.id === actObj.targetId);
				if (target) {
					const weak =
						target.weakness || target.weaknesses?.join(", ") || "None";
					const resist =
						target.resistance || target.resistances?.join(", ") || "None";
					helpers.appendLog(
						`Affinity Scan [${target.name}]: Weak [${weak}] | Resist [${resist}]`,
						"ember",
					);
					helpers.renderPresentation();
				}
			}
		},
		SET_DISPLACEMENT_VECTOR: () => {
			if (sim && actObj.targetTile) {
				helpers.appendLog(
					`Knockback trajectory targeted at tile (${actObj.targetTile.x}, ${actObj.targetTile.y}).`,
					"system",
				);
				helpers.renderPresentation();
			}
		},
		FIELD_ACTION: () => {
			if (sim) {
				helpers.appendLog(
					`Field tactical maneuver executed: ${actObj.action || "TACTICAL"}.`,
					"system",
				);
				helpers.renderPresentation();
			}
		},
		PREPARE_DELAY_STRIKE: () => {
			if (sim) {
				helpers.appendLog("Tactical action delay strike staged.", "system");
				sim.selectedTab = "SKILLS";
				helpers.renderPresentation();
			}
		},
		TUNE_HARMONICS: () => {
			if (sim) {
				helpers.appendLog(
					"Harmonic timeline frequency resonance aligned.",
					"ember",
				);
				helpers.dispatchSFX("RESONANCE_CHIME");
				helpers.renderPresentation();
			}
		},
		HARMONIC_TUNE: () => {
			if (sim) {
				helpers.appendLog(
					"Harmonic timeline frequency resonance aligned.",
					"ember",
				);
				helpers.dispatchSFX("RESONANCE_CHIME");
				helpers.renderPresentation();
			}
		},
		PREPARE_REACTIVE_GUARD: () => {
			if (sim) {
				playerExecuteGuard(sim, helpers);
			}
		},
		EXPAND_CHRONICLE_LOG: () => {
			if (sim) {
				helpers.appendLog("Combat chronicle telemetric audit expanded.", "system");
				helpers.renderPresentation();
			}
		},
	};

	const handler = actionHandlers[type];
	if (handler) {
		handler();
	}
}

const CombatActions = Object.freeze({
	playerExecuteAttack,
	playerExecuteGuard,
	playerExecuteItem,
	playerExecuteSkill,
	handleConfirmChoice,
	handleCancelChoice,
	handleDirectionalNav,
	handleChoiceIndex,
	handleViewAction,
});

/** @type {any} */
let _rootMem = null;
if (typeof window !== "undefined") {
	_rootMem = window;
} else if (typeof globalThis !== "undefined") {
	_rootMem = globalThis;
}

if (_rootMem) {
	_rootMem._CombatInternal = _rootMem._CombatInternal || {};
	_rootMem._CombatInternal.Actions = CombatActions;
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = CombatActions;
}
