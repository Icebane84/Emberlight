/* cSpell:words VSRP KNOCKBACK unsubs targetable Ailments Malakor catacomb Cataclysm miasma portcullis UNCONFIGURED SSOT Backline backline channeler pheno firebolt */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMBAT SIMULATION CORE (VSRP-001 FACADE)
 * Document Identifier: VSRP-001-COMBAT-FACADE
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-COMBAT-002
 * Authority:           Ephemeral Simulation Tenant
 * Timestamp:           2026-09-10T22:45:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 */
'use strict';

const EmberlightCombat = (() => {
	// Ingest private subsystems from MPFS-001 staging membrane
	const {
		Calc,
		Displacement,
		Queue,
		AI,
		State: CombatState,
	} = (typeof window !== 'undefined' ? window._CombatInternal : {}) || {};

	const State = CombatState?.State || {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};

	const deepFreeze = CombatState?.deepFreeze || ((obj) => Object.freeze(obj));
	const createDefaultState = CombatState?.createDefaultState || (() => ({}));
	const hydratePartySnapshot = CombatState?.hydratePartySnapshot || ((p) => p || []);
	const checkUnitDefeat = CombatState?.checkUnitDefeat || (() => false);
	const finishBattle = CombatState?.finishBattle || (() => {});

	/**
	 * Factory producing an isolated, VSRP-001 compliant combat simulation instance.
	 * [State Mutating / Factory Constructor]
	 * @param {Object} [instanceOptions={}] - Configuration options.
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

		/** @type {any} */
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
					`Required: ${allowed.join(' | ')}`,
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
				(typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {})
			);
		}

		/**
		 * Dispatches an acoustic audio cue over the host EventBus.
		 * [State Mutating / Bus Dispatch]
		 * @param {string} sfxName - Sound effect registry token.
		 * @returns {void}
		 */
		function dispatchSFX(sfxName) {
			if (!isHeadless && hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish('combat:sfx', { sfx: sfxName });
			}
		}

		/**
		 * Generates a deterministic pseudo-random float in range [0.0, 1.0).
		 * [Authoritative State Mutation]
		 * @returns {number} Deterministic pseudo-random value.
		 */
		function getRandomFloat() {
			if (!sim) return 0.5;
			if (typeof EmberlightPRNG !== 'undefined' && EmberlightPRNG.create) {
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
		function appendLog(msg, type = 'system') {
			if (!sim) return;
			sim.log.push({ msg, type });
			if (!isHeadless) {
				hostContext?.eventBus?.publish?.('combat:log', { msg, type });
			}
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

		/**
		 * Emits an attack lunge kinetic animation trigger over the EventBus.
		 * [Presentation Trigger]
		 * @param {boolean} isParty - True if attacker is allied squad member.
		 * @param {number} index - Attacker roster position.
		 * @returns {void}
		 */
		function triggerAttackerLunge(isParty, index) {
			if (isHeadless) return;
			hostContext?.eventBus?.publish?.('combat:animation', {
				animation: 'LUNGE',
				targetType: isParty ? 'party' : 'enemy',
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
			hostContext?.eventBus?.publish?.('combat:animation', {
				animation: 'CHANNEL',
				targetType: 'party',
				targetIndex: index,
				duration: 650,
			});
		}

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
			hostContext?.eventBus?.publish?.('combat:animation', {
				animation: displacementType,
				targetType: side,
				targetIndex: index,
				duration: 450,
			});
		}

		/**
		 * Evaluates terminal victory or defeat conditions across party and hostile units.
		 * [Authoritative State Mutation]
		 * @returns {boolean} True if combat encounter has concluded.
		 */
		function checkBattleEnd() {
			if (!sim) return true;
			return CombatState.checkBattleEnd(sim, {
				dispatchSFX,
				appendLog,
				hostContext,
				renderPresentation,
				finishBattle: (outcome) => finishBattle(sim, outcome, hostContext),
				isHeadless,
				autoRun,
				schedule,
				getActiveManifest,
			});
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
				(typeof EmberlightCombatRenderer !== 'undefined'
					? EmberlightCombatRenderer
					: null);
			if (activeRenderer?.render) {
				activeRenderer.render(structuredClone(sim), handleViewAction);
			}
		}

		/**
		 * Advances turn queue to the next active unit, subtracting elapsed delay time.
		 * [State Machine Progression]
		 * @returns {void}
		 */
		function stepTurn() {
			if (!sim || checkBattleEnd()) return;

			const allLiving = [
				...sim.party
					.filter((c) => c.alive)
					.map((c) => ({ type: 'party', entity: c })),
				...sim.enemies
					.filter((e) => e.alive)
					.map((e) => ({ type: 'enemy', entity: e })),
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

			const stunned = Queue.tickAilments(activeUnit.entity, getActiveManifest(), appendLog);
			if (checkBattleEnd()) return;

			if (stunned) {
				renderPresentation();
				schedule(stepTurn, 600);
				return;
			}

			if (activeUnit.type === 'enemy') {
				sim.phase = 'ENEMY_ACTION';
				renderPresentation();
				schedule(() => {
					AI.executeEnemyTurn(sim, {
						stepTurn,
						checkBattleEnd,
						triggerAttackerLunge,
						renderPresentation,
						schedule,
						appendLog,
						dispatchSFX,
						getRandomFloat,
						hostContext,
						applyAilment: (t, id, d) => Queue.applyAilment(t, id, d, appendLog),
						executeDisplacement: (actor, target, disp, isAlly) =>
							Displacement.executeDisplacement(
								sim,
								actor,
								target,
								disp,
								isAlly,
								appendLog,
								dispatchSFX,
								triggerDisplacementVisual,
								isHeadless,
							),
						checkUnitDefeat: (t) => checkUnitDefeat(t, appendLog),
					});
				}, 700);
			} else {
				sim.phase = 'PLAYER_INPUT';
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
					({ e }) => !Displacement.isTargetShielded(sim, e, 'enemy', 'PHYSICAL'),
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
				sim.phase !== 'VICTORY' &&
				sim.phase !== 'DEFEAT' &&
				sim.phase !== 'escaped' &&
				safetyCounter < 500
			) {
				safetyCounter++;
				const fn = headlessEventQueue.shift();
				if (fn) fn();
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

			const { actualTarget, actualIndex, wasIntercepted } = Displacement.applyInterception(
				sim,
				target,
				targetEnemyIndex,
				true,
				appendLog,
				dispatchSFX,
				triggerDisplacementVisual,
				isHeadless,
			);

			const rawDmg = Math.max(1, activeChar.atk * 2 - actualTarget.def);
			const variance = Math.floor(getRandomFloat() * 3) - 1;
			const attackDmg = Math.max(1, rawDmg + variance);
			const { finalDmg, isWeakness, isResisted } = Calc.calculateAffinityDamage(
				attackDmg,
				'PHYSICAL',
				actualTarget,
			);

			actualTarget.hp = Math.max(0, actualTarget.hp - finalDmg);
			dispatchSFX('ATTACK_HIT');

			const tag = Calc.resolveAffinityTag(isWeakness, isResisted);
			const interceptTag = wasIntercepted ? ' [INTERCEPTED]' : '';
			appendLog(
				`${activeChar.name} strikes ${actualTarget.name} for ${finalDmg} DMG!${tag}${interceptTag}`,
				isWeakness ? 'ember' : 'damage',
			);

			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish('combat:damage', {
					amount: finalDmg,
					targetType: 'enemy',
					targetIndex: actualIndex,
					isCrit: isWeakness || variance > 0,
					isHeal: false,
				});
			}

			AI.checkBossPhase(actualTarget, appendLog, dispatchSFX, hostContext);

			if (checkUnitDefeat(actualTarget, appendLog) && checkBattleEnd()) {
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
				'system',
			);
			dispatchSFX('BUFF');

			const heroIdx = sim.party.findIndex((c) => c.id === activeChar.id);
			hostContext?.eventBus?.publish?.('combat:text', {
				text: 'GUARD',
				targetType: 'party',
				targetIndex: heroIdx !== -1 ? heroIdx : 0,
				color: '#38bdf8',
				isLarge: true,
			});

			sim.activeTurnIndex += 1;
			renderPresentation();
			schedule(stepTurn, 400);
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

			if (itemId === 'POTION') {
				if (!target.alive) {
					appendLog(
						`${target.name} is collapsed and cannot drink a potion!`,
						'damage',
					);
					return;
				}
				target.hp = Math.min(target.maxHp, target.hp + 30);
				appendLog(`${target.name} drank Potion (+30 HP)!`, 'heal');
				dispatchSFX('HEAL');
				hostContext?.eventBus?.publish?.('combat:damage', {
					amount: 30,
					targetType: 'party',
					targetIndex: targetIdx,
					isHeal: true,
					isCrit: false,
				});
			} else if (itemId === 'ETHER') {
				if (!target.alive) {
					appendLog(`${target.name} is collapsed!`, 'damage');
					return;
				}
				target.mp = Math.min(target.maxMp, target.mp + 15);
				appendLog(`${target.name} drank Ether (+15 MP)!`, 'ember');
				dispatchSFX('HEAL');
				hostContext?.eventBus?.publish?.('combat:damage', {
					amount: 15,
					targetType: 'party',
					targetIndex: targetIdx,
					isHeal: true,
					isCrit: false,
				});
			} else if (itemId === 'PHOENIX_EMBER') {
				target.alive = true;
				target.hp = Math.max(1, Math.round(target.maxHp * 0.5));
				appendLog(
					`${target.name} revived by Phoenix Ember (+${target.hp} HP)!`,
					'heal',
				);
				dispatchSFX('HEAL');
				hostContext?.eventBus?.publish?.('combat:damage', {
					amount: target.hp,
					targetType: 'party',
					targetIndex: targetIdx,
					isHeal: true,
					isCrit: true,
				});
			}

			if ((sim.inventory[itemId] || 0) > 0) {
				sim.inventory[itemId] -= 1;
			}

			sim.phase = 'PLAYER_INPUT';
			sim.selectedTab = 'ATTACK';
			sim.activeTurnIndex += 1;
			renderPresentation();
			schedule(stepTurn, 400);
		}

		/**
		 * Invokes the harmonic channeling peripheral driver before tier-3 skill release.
		 * [Peripheral Invocation]
		 * @param {any} node - Attuned skill node.
		 * @param {function(number):void} onComplete - Callback receiving resonance score.
		 * @returns {void}
		 */
		function renderHarmonicChannelingStage(node, onComplete) {
			const channelerDriver =
				hostContext?.combatRenderer?.startHarmonicChanneling;
			if (typeof channelerDriver !== 'function') {
				onComplete(0);
				return;
			}
			channelerDriver(node, onComplete);
		}

		/**
		 * Resolves ally-targeted recovery or warding skills.
		 * [Authoritative State Mutation]
		 * @param {any} node - Active skill definition.
		 * @param {number} targetIndex - Target ally slot.
		 * @param {boolean} isGuaranteedCrit - Critical boost assertion.
		 * @param {any} activeChar - Casting unit.
		 * @returns {void}
		 */
		function executeAllySkill(node, targetIndex, isGuaranteedCrit, activeChar) {
			if (!sim) return;
			const ally = sim.party[targetIndex];
			if (!ally?.alive) return;
			const power = typeof node?.power === 'number' ? node.power : 20;
			const missingHp = Math.max(0, (ally.maxHp || 30) - (ally.hp || 0));
			const healed = power === 999 ? missingHp : Math.min(power, missingHp);
			ally.hp = Math.min(ally.maxHp || 30, (ally.hp || 0) + healed);
			dispatchSFX('HEAL');
			appendLog(
				`${activeChar.name} casts ${node.label || 'Heal'} on ${ally.name}, restoring ${healed} HP!`,
				'heal',
			);

			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish('combat:damage', {
					amount: healed,
					targetType: 'party',
					targetIndex,
					isCrit: isGuaranteedCrit,
					isHeal: true,
				});
			}
		}

		/**
		 * Resolves offensive skills targeted against hostile enemies.
		 * [Authoritative State Mutation]
		 * @param {any} node - Offensive skill descriptor.
		 * @param {number} targetIndex - Target hostile index.
		 * @param {boolean} isGuaranteedCrit - Critical boost assertion.
		 * @param {any} activeChar - Attacking unit.
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

			const isMelee = node.subType === 'strike';
			const { actualTarget, actualIndex, wasIntercepted } = Displacement.applyInterception(
				sim,
				enemy,
				targetIndex,
				isMelee,
				appendLog,
				dispatchSFX,
				triggerDisplacementVisual,
				isHeadless,
			);

			if (Calc.checkArcaneEvasion(actualTarget, node, getRandomFloat, appendLog, dispatchSFX)) {
				schedule(stepTurn, 500);
				return;
			}

			const { finalDmg, isWeakness, isResisted } = Calc.computeSkillDamage(
				node,
				activeChar,
				actualTarget,
				isGuaranteedCrit,
				sim?.terrain,
				appendLog,
			);
			actualTarget.hp = Math.max(0, actualTarget.hp - finalDmg);
			dispatchSFX(node.subType === 'bolt' ? 'SPELL_BOLT' : 'ATTACK_HIT');

			const tag = Calc.resolveSkillHitTag(isGuaranteedCrit, isWeakness, isResisted);
			const interceptTag = wasIntercepted ? ' [INTERCEPTED]' : '';
			const logTone = isWeakness || isGuaranteedCrit ? 'ember' : 'damage';
			appendLog(
				`${activeChar.name} casts ${node.label} on ${actualTarget.name} for ${finalDmg} DMG!${tag}${interceptTag}`,
				logTone,
			);

			if (hostContext?.eventBus?.publish) {
				hostContext.eventBus.publish('combat:damage', {
					amount: finalDmg,
					targetType: 'enemy',
					targetIndex: actualIndex,
					isCrit:
						isGuaranteedCrit ||
						isWeakness ||
						Boolean(node.mult && node.mult > 1.5),
					isHeal: false,
				});
			}

			AI.checkBossPhase(actualTarget, appendLog, dispatchSFX, hostContext);
			if (node.id === 'mag_des_1' && getRandomFloat() < 0.4) {
				Queue.applyAilment(actualTarget, 'BURN', 3, appendLog);
			}
			if (node.displacement && actualTarget.alive) {
				Displacement.executeDisplacement(
					sim,
					activeChar,
					actualTarget,
					node.displacement,
					false,
					appendLog,
					dispatchSFX,
					triggerDisplacementVisual,
					isHeadless,
				);
			}
			checkUnitDefeat(actualTarget, appendLog);
		}

		/**
		 * Finalizes skill resolution, visual effects, and advances the turn schedule.
		 * [State Machine Progression]
		 * @param {any} node - Resolved skill node.
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
			if (node.subType === 'strike') {
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
		 * Entry point for executing character skills, managing MP deduction and harmonic triggers.
		 * [Authoritative State Mutation]
		 * @param {any} node - Target skill node.
		 * @param {number} targetIndex - Target entity index.
		 * @param {boolean} isAllyTarget - Whether skill targets ally.
		 * @returns {void}
		 */
		function playerExecuteSkill(node, targetIndex, isAllyTarget) {
			if (!sim) return;
			const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
			if (!activeChar || activeChar.mp < node.mpCost) return;

			if (node.tier === 3 || node.id?.endsWith('_3')) {
				sim.phase = 'HARMONIC_CHANNELING';
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
		 * Primary action dispatch handler receiving actions from presentation renderer.
		 * [State Machine Progression]
		 * @param {any} action - Incoming view command.
		 * @returns {void}
		 */
		function handleViewAction(action) {
			if (!action || !sim) return;

			const actObj = typeof action === 'string' ? { type: action } : action;
			const type = actObj.type;

			const actionHandlers = {
				ATTACK: () => {
					if (typeof actObj.targetIndex === 'number') {
						playerExecuteAttack(actObj.targetIndex);
					}
				},
				SKILL: () => {
					if (typeof actObj.targetIndex === 'number') {
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
					if (typeof actObj.targetIndex === 'number') {
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
					if (sim.enemies.some((enemy) => enemy.isBoss)) {
						appendLog('Cannot flee from a boss battle!', 'damage');
						dispatchSFX('DEFEAT');
					} else if (getRandomFloat() < 0.6) {
						appendLog('Retreated from the battlefield!', 'system');
						finishBattle(sim, 'escaped', hostContext);
					} else {
						appendLog('Failed to escape!', 'damage');
						sim.activeTurnIndex += 1;
						stepTurn();
					}
				},
				SELECT_TAB: () => {
					if (actObj.tab && sim) {
						sim.selectedTab = actObj.tab;
						sim.pendingSkill = null;
						sim.pendingItem = null;
						sim.phase =
							actObj.tab === 'ATTACK' ? 'TARGETING_ENEMY' : 'PLAYER_INPUT';
						renderPresentation();
					}
				},
				SELECT_SKILL: () => {
					if (actObj.skill && sim) {
						sim.pendingSkill = actObj.skill;
						sim.phase =
							actObj.skill.targetType === 'ally'
								? 'TARGETING_ALLY'
								: 'TARGETING_ENEMY';
						renderPresentation();
					}
				},
				CANCEL_SKILL: () => {
					if (sim) {
						sim.pendingSkill = null;
						sim.phase = 'PLAYER_INPUT';
						renderPresentation();
					}
				},
				SELECT_ITEM: () => {
					if (actObj.itemId && sim) {
						sim.pendingItem = actObj.itemId;
						sim.phase = 'TARGETING_ALLY';
						renderPresentation();
					}
				},
				CANCEL_ITEM: () => {
					if (sim) {
						sim.pendingItem = null;
						sim.phase = 'PLAYER_INPUT';
						renderPresentation();
					}
				},
				TARGET_ALLY: () => {
					if (typeof actObj.targetIndex === 'number' && sim) {
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

			if (actionHandlers[type]) {
				actionHandlers[type]();
			}
		}

		/**
		 * Resolves confirmation key input based on active menu phase.
		 * [State Mutating]
		 * @returns {void}
		 */
		function handleConfirmChoice() {
			if (!sim) return;

			if (sim.phase === 'VICTORY') {
				finishBattle(sim, 'victory', hostContext);
				return;
			}
			if (sim.phase === 'DEFEAT') {
				finishBattle(sim, 'defeat', hostContext);
				return;
			}
			if (sim.selectedTab === 'GUARD') {
				handleViewAction({ type: 'GUARD' });
				return;
			}
			if (sim.phase === 'TARGETING_ALLY' || sim.phase === 'TARGET_ALLY') {
				const isEmber = sim.pendingItem === 'PHOENIX_EMBER';
				const targetAllyIdx = sim.party.findIndex((c) => (isEmber ? !c.alive : c.alive));
				if (targetAllyIdx !== -1) {
					if (sim.pendingItem) {
						handleViewAction({ type: 'ITEM', itemId: sim.pendingItem, targetIndex: targetAllyIdx });
					} else if (sim.pendingSkill) {
						handleViewAction({ type: 'SKILL', skill: sim.pendingSkill, targetIndex: targetAllyIdx, isAlly: true });
					}
				}
				return;
			}
			if (sim.selectedTab === 'ATTACK' || sim.phase === 'TARGETING_ENEMY') {
				const livingEnemyIdx = sim.enemies.findIndex((e) => e.alive);
				if (livingEnemyIdx !== -1) {
					if (sim.pendingSkill) {
						handleViewAction({ type: 'SKILL', skill: sim.pendingSkill, targetIndex: livingEnemyIdx, isAlly: false });
					} else {
						handleViewAction({ type: 'ATTACK', targetIndex: livingEnemyIdx });
					}
				}
				return;
			}
			if (sim.selectedTab === 'SKILLS') {
				const activeChar = sim.turnQueue[sim.activeTurnIndex]?.entity;
				const skills = Calc.getAvailableSkills(activeChar, getActiveManifest());
				if (skills.length > 0) {
					handleViewAction({ type: 'SELECT_SKILL', skill: skills[0] });
				}
				return;
			}
			if (sim.selectedTab === 'POUCH') {
				const inv = sim.inventory || {};
				const availableItem = ['POTION', 'ETHER', 'PHOENIX_EMBER'].find((id) => (inv[id] || 0) > 0);
				if (availableItem) {
					handleViewAction({ type: 'SELECT_ITEM', itemId: availableItem });
				}
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
				handleViewAction({ type: 'CANCEL_SKILL' });
			} else if (sim.pendingItem) {
				handleViewAction({ type: 'CANCEL_ITEM' });
			} else if (sim.selectedTab !== 'ATTACK') {
				handleViewAction({ type: 'SELECT_TAB', tab: 'ATTACK' });
			} else if (sim.phase === 'PLAYER_INPUT') {
				handleViewAction({ type: 'FLEE' });
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
			const tabs = ['ATTACK', 'SKILLS', 'GUARD', 'POUCH'];
			const curTabIdx = tabs.indexOf(sim.selectedTab || 'ATTACK');

			if (direction === 'LEFT' || direction === 'UP') {
				const nextIdx = (curTabIdx - 1 + tabs.length) % tabs.length;
				handleViewAction({ type: 'SELECT_TAB', tab: tabs[nextIdx] });
			} else if (direction === 'RIGHT' || direction === 'DOWN') {
				const nextIdx = (curTabIdx + 1) % tabs.length;
				handleViewAction({ type: 'SELECT_TAB', tab: tabs[nextIdx] });
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

			if (sim.phase === 'TARGETING_ENEMY') {
				if (sim.enemies[idx]?.alive) {
					if (sim.pendingSkill) {
						handleViewAction({ type: 'SKILL', skill: sim.pendingSkill, targetIndex: idx, isAlly: false });
					} else {
						handleViewAction({ type: 'ATTACK', targetIndex: idx });
					}
				}
				return;
			}
			if (sim.phase === 'TARGETING_ALLY') {
				const targetAlly = sim.party[idx];
				if (targetAlly) {
					const isEmber = sim.pendingItem === 'PHOENIX_EMBER';
					const isValid = isEmber ? !targetAlly.alive : targetAlly.alive;
					if (isValid) {
						if (sim.pendingItem) {
							handleViewAction({ type: 'ITEM', itemId: sim.pendingItem, targetIndex: idx });
						} else if (sim.pendingSkill) {
							handleViewAction({ type: 'SKILL', skill: sim.pendingSkill, targetIndex: idx, isAlly: true });
						}
					}
				}
				return;
			}

			const choiceMap = {
				1: 'ATTACK',
				2: 'SKILLS',
				3: 'GUARD',
				4: 'POUCH',
			};
			const mappedTab = choiceMap[choiceNum];
			if (mappedTab) {
				handleViewAction({ type: 'SELECT_TAB', tab: mappedTab });
			}
		}

		return {
			configure(cfg) {
				assertLifecycle(State.UNCONFIGURED);
				hostConfig = deepFreeze({ ...cfg });
				lifecycleState = State.CONFIGURED;
			},

			init(context) {
				assertLifecycle(State.CONFIGURED);
				hostContext = context;
				lifecycleState = State.INITIALIZED;
			},

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
					sim.encounterKey = snapshot.encounterKey || 'DEFAULT';
					sim.terrain = snapshot.terrain || 'PATH';
					sim.roundCount = 0;
					sim.party = hydratePartySnapshot(snapshot.party || []);

					if (!sim.party.some((c) => c.alive) && sim.party.length > 0) {
						sim.party.forEach((c) => {
							c.alive = true;
							c.hp = c.maxHp || 30;
						});
					}

					sim.gold = typeof snapshot.gold === 'number' ? snapshot.gold : 0;
					sim.inventory = structuredClone(snapshot.inventory || {});
					sim.enemies = AI.spawnEnemies(sim.encounterKey, getActiveManifest());
				}

				appendLog('Battle commenced!', 'ember');

				if (sim.enemies.some((e) => e.isBoss)) {
					hostContext?.eventBus?.publish?.('combat:banner', {
						text: '⚔️ BOSS ENCOUNTER ⚔️',
						subtext: 'Malakor descends from the catacomb ashes!',
						color: '#ff9d4d',
						duration: 2.0,
					});
				}

				Queue.buildTurnQueue(sim, appendLog, dispatchSFX);
				lifecycleState = State.READY;

				if (autoRun) {
					runHeadlessLoop();
				} else {
					stepTurn();
				}
			},

			update(dt, context) {
				assertLifecycle(State.READY, State.RUNNING);
				lifecycleState = State.RUNNING;
				advanceScheduledTasks(dt);

				const actions = context?.inputs;
				if (Array.isArray(actions)) {
					for (const action of actions) {
						const actObj =
							typeof action === 'string' ? { type: action } : action;
						const type = actObj.type;
						if (type === 'ATTACK' && typeof actObj.targetIndex === 'number') {
							playerExecuteAttack(actObj.targetIndex);
						} else if (type === 'GUARD') {
							playerExecuteGuard();
						} else if (type === 'SKILL' && actObj.skillNode) {
							playerExecuteSkill(
								actObj.skillNode,
								actObj.targetIndex || 0,
								false,
							);
						}
					}
				}
			},

			handleHostAction(action) {
				if (!sim) return;
				const actObj = typeof action === 'string' ? { type: action } : action;
				const act = actObj.type;
				if (!act) return;

				if (act.startsWith('CHOICE_')) {
					const num = Number.parseInt(act.replace('CHOICE_', ''), 10);
					if (num >= 1 && num <= 4) {
						handleChoiceIndex(num);
						return;
					}
				}

				if (act === 'UP' || act === 'DOWN' || act === 'LEFT' || act === 'RIGHT') {
					handleDirectionalNav(act);
					return;
				}

				if (act === 'SKILL') {
					const skill = actObj.skillNode ?? actObj.skill ?? sim.pendingSkill;
					if (skill) {
						const targetIdx =
							typeof actObj.targetIndex === 'number' ? actObj.targetIndex : 0;
						const isAlly = Boolean(actObj.isAlly);
						playerExecuteSkill(skill, targetIdx, isAlly);
						return;
					}
				}

				if (act === 'ATTACK' && typeof actObj.targetIndex === 'number') {
					playerExecuteAttack(actObj.targetIndex);
					return;
				}
				if (act === 'GUARD') {
					playerExecuteGuard();
					return;
				}
				if (act === 'CONFIRM') {
					handleConfirmChoice();
					return;
				}
				if (act === 'CANCEL') {
					handleCancelChoice();
					return;
				}
				if (act === 'FLEE') {
					handleViewAction({ type: 'FLEE' });
					return;
				}
				handleViewAction(actObj);
			},

			render(renderer, context) {
				assertLifecycle(State.READY, State.RUNNING);
				const activeRenderer = renderer || hostContext?.combatRenderer || null;
				if (activeRenderer?.render) {
					const snapshot = context || structuredClone(sim);
					activeRenderer.render(snapshot, handleViewAction);
				}
			},

			getState() {
				assertLifecycle(State.READY, State.RUNNING);
				return structuredClone(sim);
			},

			getDiagnostics() {
				return {
					moduleId: 'combat_core',
					lifecycleState,
					phase: sim?.phase,
					turnIndex: sim?.activeTurnIndex,
					livingParty: sim?.party?.filter((c) => c.alive).length || 0,
					livingEnemies: sim?.enemies?.filter((e) => e.alive).length || 0,
					isHeadless,
				};
			},

			getModuleInfo() {
				return {
					moduleId: 'combat_core',
					version: '2.5.0',
					protocolVersion: 'VSRP-001',
					dependencies: ['manifest'],
					capabilities: [
						'turn_stepping',
						'boss_phases',
						'aoe_attacks',
						'status_ailments',
						'headless_factory',
					],
				};
			},

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

	const defaultInstance = createInstance({ isHeadless: false });
	defaultInstance.createInstance = createInstance;
	return defaultInstance;
})();

// Faraday Staging Purge & Global Attachment
if (typeof window !== 'undefined') {
	delete window._CombatInternal;
	window.EmberlightCombat = EmberlightCombat;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightCombat;
}
