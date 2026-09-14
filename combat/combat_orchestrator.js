/* cSpell:words VSRP KNOCKBACK Ailments Malakor SSOT */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: ORCHESTRATION & TURN CYCLE (VSRP-001 / MPFS-001)
 * Document Identifier: VSRP-001-COMBAT-ORCHESTRATOR
 * Subsystem:           Turn Stepping, CTB Simulation, Queue Drainage & AI Triggers
 * ============================================================================
 */
'use strict';

/**
 * Advances elapsed clock time for all active scheduled tasks.
 * [State Mutating]
 * @param {Array<{ fn: function():void, remainingMs: number }>} scheduledTasks - Active task list.
 * @param {number} dt - Frame delta time in seconds.
 * @returns {void}
 */
function advanceScheduledTasks(scheduledTasks, dt) {
	if (!Number.isFinite(dt) || dt <= 0 || !Array.isArray(scheduledTasks) || scheduledTasks.length === 0) {
		return;
	}

	/** @type {Array<function():void>} */
	const readyTasks = [];
	const unreadyTasks = [];
	while (scheduledTasks.length > 0) {
		const task = scheduledTasks.shift();
		if (task) {
			task.remainingMs -= dt * 1000;
			if (task.remainingMs <= 0) {
				readyTasks.push(task.fn);
			} else {
				unreadyTasks.push(task);
			}
		}
	}

	for (const task of unreadyTasks) {
		scheduledTasks.push(task);
	}

	readyTasks.forEach((task) => {
		task();
	});
}

/**
 * Advances turn queue to the next active unit, subtracting elapsed delay time.
 * [State Machine Progression]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function stepTurn(sim, helpers) {
	if (!sim || helpers.checkBattleEnd()) return;

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

	// Build 12-turn CTB forecast queue
	const forecastQueue = [];
	const simulatedDelays = allLiving.map((u) => ({
		type: u.type,
		entity: u.entity,
		delay: u.entity.accumulatedDelay || 0,
		agi: Math.max(1, u.entity.agi || 10),
	}));
	for (let i = 0; i < 12; i++) {
		simulatedDelays.sort((a, b) => a.delay - b.delay);
		const nextTurn = simulatedDelays[0];
		forecastQueue.push({
			type: nextTurn.type,
			entity: nextTurn.entity,
			id: nextTurn.entity.id,
			name: nextTurn.entity.name,
		});
		nextTurn.delay += 1000 / nextTurn.agi;
	}
	sim.turnQueue = forecastQueue;
	sim.activeTurnIndex = 0;
	sim.forecastQueue = forecastQueue;

	const stunned = helpers.Queue.tickAilments(activeUnit.entity, helpers.getActiveManifest(), helpers.appendLog);
	if (helpers.checkBattleEnd()) return;

	if (stunned) {
		helpers.renderPresentation();
		helpers.schedule(() => stepTurn(sim, helpers), 600);
		return;
	}

	if (activeUnit.type === 'enemy') {
		sim.phase = 'ENEMY_ACTION';
		helpers.renderPresentation();
		helpers.schedule(() => {
			helpers.AI.executeEnemyTurn(sim, {
				stepTurn: () => stepTurn(sim, helpers),
				checkBattleEnd: helpers.checkBattleEnd,
				triggerAttackerLunge: helpers.triggerAttackerLunge,
				renderPresentation: helpers.renderPresentation,
				schedule: helpers.schedule,
				appendLog: helpers.appendLog,
				dispatchSFX: helpers.dispatchSFX,
				getRandomFloat: helpers.getRandomFloat,
				hostContext: helpers.hostContext,
				applyAilment: (t, id, d) => helpers.Queue.applyAilment(t, id, d, helpers.appendLog),
				executeDisplacement: (actor, target, disp, isAlly) =>
					helpers.Displacement.executeDisplacement(
						sim,
						actor,
						target,
						disp,
						isAlly,
						helpers.appendLog,
						helpers.dispatchSFX,
						helpers.triggerDisplacementVisual,
						helpers.isHeadless,
					),
				checkUnitDefeat: (t) => helpers.checkUnitDefeat(t),
			});
		}, 700);
	} else {
		sim.phase = 'PLAYER_INPUT';
		helpers.renderPresentation();
		if (helpers.autoRun) {
			autoExecutePlayerAction(sim, helpers);
		}
	}
}

/**
 * Auto-selects and executes attacks during headless simulations or automated testing.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function autoExecutePlayerAction(sim, helpers) {
	if (!sim) return;
	const livingEnemies = sim.enemies
		.map((e, idx) => ({ e, idx }))
		.filter(({ e }) => e.alive);
	if (livingEnemies.length === 0) {
		stepTurn(sim, helpers);
		return;
	}
	const validTarget =
		livingEnemies.find(
			({ e }) => !helpers.Displacement.isTargetShielded(sim, e, 'enemy', 'PHYSICAL'),
		) || livingEnemies[0];
	helpers.playerExecuteAttack(validTarget.idx);
}

/**
 * Runs synchronized headless combat execution loop to completion.
 * [State Mutating]
 * @param {any} sim - Active simulation state.
 * @param {Array<function():void>} headlessEventQueue - Headless task queue.
 * @param {any} helpers - Helper kernel functions bundle.
 * @returns {void}
 */
function runHeadlessLoop(sim, headlessEventQueue, helpers) {
	if (!sim) return;
	stepTurn(sim, helpers);
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

const CombatOrchestrator = Object.freeze({
	advanceScheduledTasks,
	stepTurn,
	autoExecutePlayerAction,
	runHeadlessLoop,
});

const _rootOrch = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
_rootOrch._CombatInternal = _rootOrch._CombatInternal || {};
_rootOrch._CombatInternal.Orchestrator = CombatOrchestrator;

if (typeof module !== 'undefined' && module.exports) {
	module.exports = CombatOrchestrator;
}
