/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COOPERATIVE WORK SCHEDULER & TIME-SLICER
 * Document Identifier: ARCH-SPEC-SCHEDULER-001
 * Governing Protocol:  VSRP-001 / ARCH-GAP-ANALYSIS-001
 * Authority:           Single-Threaded Frame Budgeting & Cooperative Tasking
 * ============================================================================
 */

const EmberlightScheduler = (() => {
	const MODULE_INFO = Object.freeze({
		moduleId: "scheduler_core",
		version: "1.0.0",
		protocolVersion: "VSRP-001",
		dependencies: [],
		capabilities: ["time_slicing", "cooperative_queues", "task_prioritization"],
	});

	const PRIORITY = Object.freeze({
		CRITICAL: 0, // Must process immediately (e.g., input translation buffer)
		HIGH: 1, // Graphics/DDA updates (pseudo_3d_renderer.js buffers)
		MEDIUM: 2, // Algorithmic chunk world generation (dungeon_gen.js carving)
		LOW: 3, // Non-blocking JIT caches (battler_baker.js supersampling urls)
	});

	let moduleConfig = { maxFrameBudgetMs: 4.5 }; // Target sub-allocations inside the 16.67ms frame
	let moduleContext = null;
	let isProcessing = false;

	// Prioritized cooperative queues array
	const taskQueues = {
		[PRIORITY.CRITICAL]: [],
		[PRIORITY.HIGH]: [],
		[PRIORITY.MEDIUM]: [],
		[PRIORITY.LOW]: [],
	};

	/**
	 * Helper struct to safely encapsulate generators as continuous execution tasks.
	 */
	class CooperativeTask {
		constructor(id, generatorFunc, priority, onComplete = null) {
			this.id = id;
			this.iterator = generatorFunc();
			this.priority = priority;
			this.onComplete = onComplete;
			this.created = Date.now();
		}
	}

	return {
		configure(config) {
			moduleConfig = { ...moduleConfig, ...config };
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		init(context) {
			moduleContext = context;
			isProcessing = true;
		},

		reset() {
			// Flush all pending task queues safely
			taskQueues[PRIORITY.CRITICAL] = [];
			taskQueues[PRIORITY.HIGH] = [];
			taskQueues[PRIORITY.MEDIUM] = [];
			taskQueues[PRIORITY.LOW] = [];
			dirtyOverride = true;
		},

		/**
		 * Enqueues a generator function into the cooperative scheduler.
		 * @param {string} id - Unique identifier for trackable tasks.
		 * @param {function} generatorFunc - Task logic wrapped inside a function* generator structure.
		 * @param {number} [priority=2] - Task priority tier (0 to 3).
		 * @param {function} [onComplete=null] - Optional final completion handler.
		 */
		enqueue(id, generatorFunc, priority = PRIORITY.MEDIUM, onComplete = null) {
			const task = new CooperativeTask(id, generatorFunc, priority, onComplete);
			taskQueues[priority].push(task);
		},

		/**
		 * Executed continuously at 60Hz by the main Host Ticker loop (runtime.js / loop()).
		 * Dynamically manages execution times to stay strictly within your layout performance metrics.
		 */
		update(dt, context) {
			if (!isProcessing) return;

			const startTime = performance.now();
			const budget = moduleConfig.maxFrameBudgetMs;

			// Process priorities top-down
			const tiers = [
				PRIORITY.CRITICAL,
				PRIORITY.HIGH,
				PRIORITY.MEDIUM,
				PRIORITY.LOW,
			];

			for (const tier of tiers) {
				const queue = taskQueues[tier];

				while (queue.length > 0) {
					// Check if the current frame slice has depleted its timing budget
					if (
						tier !== PRIORITY.CRITICAL &&
						performance.now() - startTime >= budget
					) {
						return; // Defer subsequent iterations cleanly to the next hardware frame tick
					}

					const activeTask = queue[0];
					try {
						const result = activeTask.iterator.next();

						if (result.done) {
							// Task completed successfully. Remove from queue and fire completions.
							queue.shift();
							if (typeof activeTask.onComplete === "function") {
								activeTask.onComplete(result.value);
							}
						}
					} catch (err) {
						queue.shift(); // Evacuate failing task immediately to avoid thread locks [AC-20]
						if (moduleContext?.diagnostics) {
							moduleContext.diagnostics.logError(
								`Task ${activeTask.id} abended:`,
								err,
							);
						} else {
							console.error(
								`[Scheduler Error] Task ${activeTask.id} crash:`,
								err,
							);
						}
					}
				}
			}
		},

		render(renderer, context) {
			// Pure interface requirement conformance. The scheduler has zero direct presentation layers.
		},

		getState() {
			return Object.freeze({
				criticalCount: taskQueues[PRIORITY.CRITICAL].length,
				highCount: taskQueues[PRIORITY.HIGH].length,
				mediumCount: taskQueues[PRIORITY.MEDIUM].length,
				lowCount: taskQueues[PRIORITY.LOW].length,
			});
		},

		getDiagnostics() {
			return {
				driverId: MODULE_INFO.moduleId,
				activeTaskTiersCount: Object.values(taskQueues).reduce(
					(a, b) => a + b.length,
					0,
				),
			};
		},

		getModuleInfo() {
			return MODULE_INFO;
		},

		pause() {
			isProcessing = false;
		},
		resume() {
			isProcessing = true;
		},

		destroy() {
			this.reset();
			isProcessing = false;
			moduleContext = null;
		},

		PRIORITY,
	};
})();

if (typeof window !== "undefined")
	window.EmberlightScheduler = EmberlightScheduler;
