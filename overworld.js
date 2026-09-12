/* cSpell:words VSRP UNCONFIGURED walkability autotile */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: OVERWORLD EXPEDITION & CARTOGRAPHY SIMULATION
 * Document Identifier: VSRP-001-OVERWORLD-CORE
 * Governing Protocol:  VSRP-001-DISTRICT-1
 * Authority:           Ephemeral Simulation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Module State & Lifecycle Constants
 *   [SEC-02] Collision, Topology & Navigation Math
 *   [SEC-03] Spatial Motion & Orientation Vectors
 *   [SEC-04] Canonical 9-Method Lifecycle Gateway
 *   [SEC-05] Global Export & Dual-Binding
 * ============================================================================
 */

const EmberlightOverworld = (() => {
	//#region [SEC-01] Module State & Lifecycle Constants
	/**
	 * @typedef {'UNCONFIGURED' | 'CONFIGURED' | 'INITIALIZED' | 'READY' | 'RUNNING' | 'DESTROYED'} OverworldLifecycleState
	 */

	/**
	 * @typedef {'UP' | 'DOWN' | 'LEFT' | 'RIGHT'} OverworldFacing
	 */

	/**
	 * @typedef {Object} OverworldPosition
	 * @property {number} x - Horizontal grid coordinate.
	 * @property {number} y - Vertical grid coordinate.
	 */

	/**
	 * @typedef {Object} OverworldSimState
	 * @property {OverworldPosition} playerPos - Active grid position coordinates.
	 * @property {string[][]} map - 2D matrix of tile glyphs.
	 * @property {Array<any>} party - Active expedition party snapshot.
	 * @property {Record<string, any>} flags - World event and zone state flags.
	 * @property {OverworldFacing} facing - Current cardinal facing orientation.
	 * @property {number} dungeonDepth - Current delve depth (0 for surface).
	 * @property {number} dangerSteps - Consecutive steps taken in hostile territory.
	 * @property {number} stepAnimFrame - Step cycle animation tick counter.
	 * @property {number} seed - Deterministic PRNG seed.
	 */

	/**
	 * @typedef {Object} OverworldConfig
	 * @property {Object} [manifest] - Static data manifest override.
	 */

	/**
	 * @typedef {Object} OverworldContext
	 * @property {Object} [eventBus] - Host pub/sub event bus.
	 * @property {function(string, any=): void} [eventBus.publish]
	 * @property {function(string, function(any): void): void} [eventBus.subscribe]
	 * @property {Array<string | { type: string, [key: string]: any }>} [inputs] - Host input event queue.
	 */

	/**
	 * @typedef {Object} OverworldStepEventPayload
	 * @property {OverworldPosition} pos - New player position coordinates.
	 * @property {string} tile - Tile glyph stepped onto.
	 * @property {OverworldFacing} facing - Current facing orientation.
	 * @property {number} depth - Delve depth level.
	 */

	/**
	 * @typedef {Object} OverworldEncounterEventPayload
	 * @property {string} encounterKey - Combat encounter table identifier.
	 * @property {OverworldPosition} pos - Position coordinates where encounter triggered.
	 * @property {string} tile - Tile glyph where encounter triggered.
	 */

	/**
	 * @typedef {Object} OverworldDiagnostics
	 * @property {'overworld_core'} moduleId - Canonical tenant identifier.
	 * @property {OverworldLifecycleState} lifecycleState - Current lifecycle state token.
	 * @property {OverworldPosition | null} playerPos - Current player coordinates.
	 */

	/**
	 * @typedef {Object} OverworldModuleInfo
	 * @property {'overworld_core'} moduleId - Canonical tenant identifier.
	 * @property {string} version - Semantic version.
	 * @property {'VSRP-001'} protocolVersion - Governing architecture protocol.
	 * @property {string[]} capabilities - Declared subsystem capabilities.
	 */

	const State = /** @type {const} */ ({
		UNCONFIGURED: "UNCONFIGURED",
		CONFIGURED: "CONFIGURED",
		INITIALIZED: "INITIALIZED",
		READY: "READY",
		RUNNING: "RUNNING",
		DESTROYED: "DESTROYED",
	});

	/** @type {OverworldLifecycleState} */
	let lifecycleState = State.UNCONFIGURED;
	/** @type {OverworldConfig | null} */
	let hostConfig = null;
	/** @type {OverworldContext | null} */
	let hostContext = null;
	/** @type {OverworldSimState | null} */
	let sim = null;
	/** @type {any} */
	let prngInstance = null;

	/**
	 * Enforces VSRP-001 lifecycle invariant gating.
	 * Pure validation assertion.
	 *
	 * @param {...OverworldLifecycleState} allowed - Permitted lifecycle state tokens.
	 * @throws {Error} If current lifecycle state is not in allowed set.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:overworld_core] Lifecycle Error: Invoked while in state "${lifecycleState}". ` +
				`Required: ${allowed.join(" | ")}`,
			);
		}
	}

	/**
	 * Deeply freezes a data structure to guarantee immutable state boundaries.
	 * Pure recursive utility.
	 *
	 * @template T
	 * @param {T} obj - Target structure to freeze recursively.
	 * @returns {Readonly<T>}
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== "object") return obj;
		Object.keys(obj).forEach((prop) => {
			if (
				typeof obj[prop] === "object" &&
				obj[prop] !== null &&
				!Object.isFrozen(obj[prop])
			) {
				deepFreeze(obj[prop]);
			}
		});
		return Object.freeze(obj);
	}

	/**
	 * Resolves active manifest reference from host configuration or ambient global.
	 * Pure accessor.
	 *
	 * @returns {any} Manifest instance or empty object.
	 */
	function getActiveManifest() {
		return (
			hostConfig?.manifest ||
			(typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {})
		);
	}

	/**
	 * Resolves active 2D cartography tile matrix from manifest or raw simulation state.
	 * Pure accessor.
	 *
	 * @returns {string[][]} 2D array of tile glyphs.
	 */
	function getMap() {
		if (!sim) return [["#"]];
		const manifest = getActiveManifest();
		if (typeof manifest.getResolvedMap === "function") {
			return manifest.getResolvedMap(sim.map, sim.flags);
		}
		return sim.map;
	}
	//#endregion

	//#region [SEC-02] Collision, Topology & Navigation Math
	// --- Encounter & Navigation Domain Constants ---
	const SAFE_TILES = new Set(["T", "O", "C", "$", ">", "<"]);
	const MIN_DANGER_STEPS = 3;

	// --- Cognitive Complexity Helper Routines (S3776 Compliant) ---

	/**
	 * Determines if given (x, y) coordinates fall outside the map boundary.
	 * Pure boundary predicate.
	 *
	 * @param {string[][]} map - 2D tile matrix.
	 * @param {number} x - Target horizontal grid coordinate.
	 * @param {number} y - Target vertical grid coordinate.
	 * @returns {boolean} True if coordinates are out of bounds.
	 */
	function isOutOfBounds(map, x, y) {
		return y < 0 || y >= map.length || x < 0 || x >= map[0].length;
	}

	/**
	 * Checks if target tile glyph represents walkable terrain.
	 * Pure walkability predicate.
	 *
	 * @param {string} tile - Target tile glyph.
	 * @returns {boolean} True if tile is walkable.
	 */
	function isTileWalkable(tile) {
		const legend =
			getActiveManifest()?.TileLegend ||
			(typeof EmberlightManifest !== "undefined" ? EmberlightManifest.TileLegend : {});
		const def = legend[tile];
		return def ? def.walkable !== false : tile !== "#";
	}

	/**
	 * Determines if active position constitutes an encounter-eligible danger zone.
	 * Pure danger predicate.
	 *
	 * @param {string} targetTile - Stepped tile glyph.
	 * @returns {boolean} True if danger steps exceed threshold outside safe zones.
	 */
	function isDangerZone(targetTile) {
		if (SAFE_TILES.has(targetTile)) return false;
		if (
			sim?.townId ||
			sim?.inTown ||
			sim?.flags?.in_town ||
			sim?.flags?.town ||
			sim?.flags?.townId ||
			targetTile === "T" ||
			targetTile === "O"
		)
			return false;
		return (sim?.dangerSteps ?? 0) >= MIN_DANGER_STEPS;
	}

	/**
	 * Calculates mathematical probability of triggering a random combat encounter.
	 * Pure calculation.
	 *
	 * @param {string} targetTile - Stepped tile glyph.
	 * @param {number} depth - Active dungeon delve depth.
	 * @returns {number} Probability float in range [0.0, 1.0].
	 */
	function getEncounterChance(targetTile, depth) {
		if (targetTile === '"') return 0.35;
		if (depth > 0) return 0.28;
		return 0.18;
	}

	/**
	 * Produces a pseudo-random roll float for encounter checks.
	 * PRNG roll generator.
	 *
	 * @param {number} nx - Target horizontal coordinate.
	 * @param {number} ny - Target vertical coordinate.
	 * @returns {number} Random float in range [0.0, 1.0).
	 */
	function getEncounterRoll(nx, ny) {
		if (prngInstance) return prngInstance.nextFloat();
		if (typeof EmberlightPRNG !== "undefined") {
			const seed = (sim?.dangerSteps || 0) * 37 + nx * 13 + ny * 7;
			return EmberlightPRNG.create(seed).nextFloat();
		}
		return 0.5;
	}

	/**
	 * Resolves encounter key from delve depth, terrain tile, and PRNG roll.
	 * Pure lookup.
	 *
	 * @param {number} depth - Dungeon delve depth.
	 * @param {string} targetTile - Stepped terrain glyph.
	 * @param {number} roll - PRNG float value.
	 * @returns {string} Target encounter table identifier.
	 */
	function resolveEncounterKey(depth, targetTile, roll) {
		if (depth >= 3) return "CATACOMBS_DEEP";
		if (depth > 0) {
			return roll < 0.5 ? "CRYPT_SANCTUM" : "SPIDER_NEST";
		}
		if (targetTile === '"') {
			return roll < 0.5 ? "WOLF_PACK" : "DEFAULT";
		}
		return "DEFAULT";
	}

	/**
	 * Evaluates hazard encounter probability and publishes overworld:encounter envelope upon trigger.
	 * State-mutating hazard evaluation procedure.
	 *
	 * @param {number} nx - Target horizontal coordinate.
	 * @param {number} ny - Target vertical coordinate.
	 * @param {string} targetTile - Stepped tile glyph.
	 * @returns {void}
	 */
	function checkRandomEncounter(nx, ny, targetTile) {
		if (!sim || !isDangerZone(targetTile)) return;

		const roll = getEncounterRoll(nx, ny);
		const chance = getEncounterChance(targetTile, sim.dungeonDepth || 0);
		if (roll >= chance) return;

		sim.dangerSteps = 0;
		const encounterKey = resolveEncounterKey(
			sim.dungeonDepth || 0,
			targetTile,
			roll,
		);

		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish("overworld:encounter", {
				encounterKey,
				pos: { ...sim.playerPos },
				tile: targetTile,
			});
		}
	}
	//#endregion

	//#region [SEC-03] Spatial Motion & Orientation Vectors
	// --- Main Execution Vector (Cognitive Complexity: 3) ---

	/**
	 * Moves player by coordinate displacement (dx, dy) if target tile is walkable.
	 * State-mutating navigation procedure.
	 *
	 * @param {number} dx - Horizontal grid offset.
	 * @param {number} dy - Vertical grid offset.
	 * @returns {void}
	 */
	function executeMove(dx, dy) {
		if (!sim) return;

		const map = getMap();
		const nx = sim.playerPos.x + dx;
		const ny = sim.playerPos.y + dy;

		if (isOutOfBounds(map, nx, ny)) return;

		const targetTile = map[ny][nx];
		if (!isTileWalkable(targetTile)) return;

		sim.playerPos.x = nx;
		sim.playerPos.y = ny;
		sim.stepAnimFrame = (sim.stepAnimFrame || 0) + 1;

		const inTown = Boolean(
			sim.townId ||
			sim.inTown ||
			sim.flags?.in_town ||
			sim.flags?.townId ||
			targetTile === "T" ||
			targetTile === "O"
		);

		if (inTown) {
			sim.dangerSteps = 0;
		} else {
			sim.dangerSteps = (sim.dangerSteps || 0) + 1;
		}

		if (hostContext?.eventBus?.publish) {
			// Faraday Isolation: Publish detached position clone
			hostContext.eventBus.publish("overworld:step", {
				pos: { ...sim.playerPos, inTown, townId: sim.townId || null },
				tile: targetTile,
				facing: sim.facing,
				depth: sim.dungeonDepth || 0,
				townId: sim.townId || null,
			});
		}

		if (!inTown) {
			checkRandomEncounter(nx, ny, targetTile);
		}
	}

	const FACING_DELTAS = {
		UP: {
			forward: { dx: 0, dy: -1 },
			backward: { dx: 0, dy: 1 },
			left: { dx: -1, dy: 0 },
			right: { dx: 1, dy: 0 },
		},
		DOWN: {
			forward: { dx: 0, dy: 1 },
			backward: { dx: 0, dy: -1 },
			left: { dx: 1, dy: 0 },
			right: { dx: -1, dy: 0 },
		},
		LEFT: {
			forward: { dx: -1, dy: 0 },
			backward: { dx: 1, dy: 0 },
			left: { dx: 0, dy: 1 },
			right: { dx: 0, dy: -1 },
		},
		RIGHT: {
			forward: { dx: 1, dy: 0 },
			backward: { dx: -1, dy: 0 },
			left: { dx: 0, dy: -1 },
			right: { dx: 0, dy: 1 },
		},
	};

	/**
	 * Rotates facing orientation 90 degrees counter-clockwise (left).
	 * State-mutating procedure.
	 *
	 * @returns {void}
	 */
	function turnLeft() {
		if (!sim) return;
		/** @type {OverworldFacing[]} */
		const order = ["UP", "LEFT", "DOWN", "RIGHT"];
		const idx = order.indexOf(sim.facing || "DOWN");
		sim.facing = order[(idx + 1) % order.length];
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish("overworld:step", {
				pos: { ...sim.playerPos },
				tile: getMap()[sim.playerPos.y]?.[sim.playerPos.x] || ".",
				facing: sim.facing,
				depth: sim.dungeonDepth || 0,
			});
		}
	}

	/**
	 * Rotates facing orientation 90 degrees clockwise (right).
	 * State-mutating procedure.
	 *
	 * @returns {void}
	 */
	function turnRight() {
		if (!sim) return;
		/** @type {OverworldFacing[]} */
		const order = ["UP", "RIGHT", "DOWN", "LEFT"];
		const idx = order.indexOf(sim.facing || "DOWN");
		sim.facing = order[(idx + 1) % order.length];
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish("overworld:step", {
				pos: { ...sim.playerPos },
				tile: getMap()[sim.playerPos.y]?.[sim.playerPos.x] || ".",
				facing: sim.facing,
				depth: sim.dungeonDepth || 0,
			});
		}
	}

	/**
	 * Steps one tile forward relative to current cardinal facing.
	 * State-mutating navigation procedure.
	 *
	 * @returns {void}
	 */
	function stepForward() {
		if (!sim) return;
		const delta = FACING_DELTAS[sim.facing || "DOWN"]?.forward || {
			dx: 0,
			dy: 1,
		};
		executeMove(delta.dx, delta.dy);
	}

	/**
	 * Steps one tile backward relative to current cardinal facing.
	 * State-mutating navigation procedure.
	 *
	 * @returns {void}
	 */
	function stepBackward() {
		if (!sim) return;
		const delta = FACING_DELTAS[sim.facing || "DOWN"]?.backward || {
			dx: 0,
			dy: -1,
		};
		executeMove(delta.dx, delta.dy);
	}

	/**
	 * Strafes one tile to the left relative to current cardinal facing.
	 * State-mutating navigation procedure.
	 *
	 * @returns {void}
	 */
	function strafeLeft() {
		if (!sim) return;
		const delta = FACING_DELTAS[sim.facing || "DOWN"]?.left || {
			dx: 1,
			dy: 0,
		};
		executeMove(delta.dx, delta.dy);
	}

	/**
	 * Strafes one tile to the right relative to current cardinal facing.
	 * State-mutating navigation procedure.
	 *
	 * @returns {void}
	 */
	function strafeRight() {
		if (!sim) return;
		const delta = FACING_DELTAS[sim.facing || "DOWN"]?.right || {
			dx: -1,
			dy: 0,
		};
		executeMove(delta.dx, delta.dy);
	}
	//#endregion

	//#region [SEC-04] Canonical 9-Method Lifecycle Gateway
	const api = {
		/**
		 * Configures overworld simulation tenant with host parameters.
		 * State-mutating lifecycle gateway.
		 *
		 * @param {OverworldConfig} cfg - Configuration payload.
		 * @throws {TypeError} If configuration payload is missing or not an object.
		 * @returns {void}
		 */
		configure(cfg) {
			assertLifecycle(State.UNCONFIGURED);
			if (!cfg || typeof cfg !== "object") {
				throw new TypeError(
					"[VSRP-001:overworld_core] configure() requires a non-null configuration dictionary.",
				);
			}
			hostConfig = deepFreeze({ ...cfg });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes overworld simulation tenant with host execution context.
		 * State-mutating lifecycle gateway.
		 *
		 * @param {OverworldContext} context - Host runtime execution context.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Rehydrates simulation state from snapshot or default expedition values.
		 * State-mutating lifecycle gateway.
		 *
		 * @param {Partial<OverworldSimState>} [snapshot] - Inbound simulation state snapshot.
		 * @returns {void}
		 */
		reset(snapshot) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);
			const incoming = snapshot || {};
			let playerPos = { x: 1, y: 1 };
			if (incoming.playerPos) {
				playerPos = { x: incoming.playerPos.x, y: incoming.playerPos.y };
			} else if (/** @type {any} */ (incoming).pos) {
				playerPos = {
					x: /** @type {any} */ (incoming).pos.x,
					y: /** @type {any} */ (incoming).pos.y,
				};
			}

			sim = {
				playerPos,
				map: Array.isArray(incoming.map)
					? incoming.map.map((r) => (Array.isArray(r) ? [...r] : r))
					: [["."]],
				party: Array.isArray(incoming.party)
					? incoming.party.map((c) => ({ ...c }))
					: [],
				flags: incoming.flags ? { ...incoming.flags } : {},
				facing: incoming.facing || sim?.facing || "DOWN",
				townId: incoming.townId || incoming.flags?.townId || null,
				inTown: Boolean(
					incoming.inTown ||
					incoming.townId ||
					incoming.flags?.in_town ||
					incoming.flags?.townId
				),
				dungeonDepth:
					incoming.dungeonDepth ?? /** @type {any} */ (incoming).depth ?? 0,
				dangerSteps: incoming.dangerSteps || 0,
				stepAnimFrame: 0,
				seed: typeof incoming.seed === "number" ? incoming.seed : 1337,
			};
			prngInstance =
				typeof EmberlightPRNG !== "undefined"
					? EmberlightPRNG.create(sim.seed)
					: null;
			lifecycleState = State.READY;
		},

		/**
		 * Advances simulation frame and consumes host input queue non-destructively.
		 * State-mutating lifecycle gateway.
		 *
		 * @param {number} _dt - Delta time tick in seconds.
		 * @param {OverworldContext} [context] - Optional host frame context override.
		 * @returns {void}
		 */
		update(_dt, context) {
			assertLifecycle(State.READY, State.RUNNING);
			lifecycleState = State.RUNNING;
			const activeCtx = context || hostContext;
			// AC-06 Update Purity: Non-mutating iteration over host input queue
			if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
				for (const action of activeCtx.inputs) {
					this.handleHostAction(action);
				}
			}
		},

		/**
		 * Projects simulation state to peripheral overworld renderer without side effects.
		 * Pure peripheral projection gateway.
		 *
		 * @param {{ renderOverworld?: function(OverworldSimState): void }} renderer - Target peripheral renderer.
		 * @param {any} [_context] - Host rendering context.
		 * @returns {void}
		 */
		render(renderer, _context) {
			assertLifecycle(State.READY, State.RUNNING);
			if (renderer && typeof renderer.renderOverworld === "function") {
				renderer.renderOverworld(this.getState());
			}
		},

		/**
		 * Returns deep clone of current simulation state to guarantee snapshot isolation.
		 * Pure query gateway.
		 *
		 * @returns {OverworldSimState} Isolated deep clone of simulation state.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return structuredClone(sim);
		},

		/**
		 * Returns diagnostic telemetry payload for observability and sentinel gates.
		 * Pure telemetry gateway.
		 *
		 * @throws {Error} If invoked after instance has been destroyed.
		 * @returns {OverworldDiagnostics} Diagnostic telemetry payload.
		 */
		getDiagnostics() {
			if (lifecycleState === State.DESTROYED) {
				throw new Error(
					"[VSRP-001:overworld_core] Cannot read diagnostics on a DESTROYED instance.",
				);
			}
			return {
				moduleId: "overworld_core",
				lifecycleState,
				playerPos: sim?.playerPos ? { ...sim.playerPos } : null,
			};
		},

		/**
		 * Returns immutable VSRP-001 architectural descriptor and capabilities.
		 * Pure metadata gateway.
		 *
		 * @returns {OverworldModuleInfo}
		 */
		getModuleInfo() {
			return {
				moduleId: "overworld_core",
				version: "2.1.0",
				protocolVersion: "VSRP-001",
				capabilities: ["cartography", "sliding_viewport", "autotile"],
			};
		},

		/**
		 * Dispatches inbound host action tokens to spatial motion handlers.
		 * State-mutating action gateway.
		 *
		 * @param {string | { type: string, [key: string]: any }} action - Inbound action token or envelope.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim) return;
			const type = typeof action === "string" ? action : action.type;
			if (type === "UP" || type === "w") {
				sim.facing = "UP";
				executeMove(0, -1);
			} else if (type === "DOWN" || type === "s") {
				sim.facing = "DOWN";
				executeMove(0, 1);
			} else if (type === "LEFT" || type === "a") {
				sim.facing = "LEFT";
				executeMove(-1, 0);
			} else if (type === "RIGHT" || type === "d") {
				sim.facing = "RIGHT";
				executeMove(1, 0);
			} else if (type === "STEP_FORWARD") {
				stepForward();
			} else if (type === "STEP_BACKWARD") {
				stepBackward();
			} else if (type === "TURN_LEFT") {
				turnLeft();
			} else if (type === "TURN_RIGHT") {
				turnRight();
			} else if (type === "STRAFE_LEFT") {
				strafeLeft();
			} else if (type === "STRAFE_RIGHT") {
				strafeRight();
			}
		},

		/**
		 * Cleans up internal state, references, and marks instance as DESTROYED.
		 * State-mutating lifecycle teardown.
		 *
		 * @returns {void}
		 */
		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			sim = null;
			prngInstance = null;
			hostConfig = null;
			hostContext = null;
			lifecycleState = State.DESTROYED;
		},
	};

	return api;
	//#endregion
})();

//#region [SEC-05] Global Export & Dual-Binding
if (typeof window !== "undefined") {
	window.EmberlightOverworld = EmberlightOverworld;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightOverworld;
}
//#endregion