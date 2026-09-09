/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: FUNCTIONAL PROGRESSION MATRIX (TIER 2)
 * Document Identifier: ARCH-ZONE-PROGRESSION-001
 * Governing Protocol:  VSRP-001 / SPEC-003 / AC-07
 * Authority:           Authoritative Pure Progression Projections & Tree Simulation
 * ============================================================================
 */

const EmberlightProgression = (() => {
	const MODULE_INFO = Object.freeze({
		moduleId: "progression_core",
		version: "5.2.0",
		protocolVersion: "VSRP-001",
		capabilities: ["stat_projections", "constellation_graphs"],
	});

	let moduleConfig = null;
	let moduleContext = null;

	// Internal encapsulated simulation state (Faraday rule working copy)
	let internalWorkingState = {
		partyNodes: {}, // Schema: { heroId: [nodeId1, nodeId2, ...] }
	};

	return {
		getModuleInfo() {
			return MODULE_INFO;
		},

		configure(config) {
			moduleConfig = structuredClone(config);
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		init(context) {
			moduleContext = context;
		},

		/**
		 * Reset implements a deep working copy of the host snapshot to decouple memory lines.
		 */
		reset(snapshot) {
			internalWorkingState = { partyNodes: {} };
			if (snapshot && snapshot.partyNodes) {
				internalWorkingState.partyNodes = structuredClone(snapshot.partyNodes);
			}
		},

		/**
		 * Authoritative Pure Functional Stat Projector.
		 * Evaluates base levels, active gear stats, and attunement matrix node modifications.
		 * @param {Battler} character - Authoritative character entity sheet.
		 * @param {Object} itemCatalog - Global gear attributes from manifest.js.
		 * @param {Object} constellationGraph - Full star node definitions map.
		 * @returns {Object} Complete projected stat calculation object.
		 */
		computeCharacterStats(character, itemCatalog, constellationGraph) {
			if (!character) return {};

			const level = character.level || 1;
			const projectedStats = { hp: 0, mp: 0, atk: 0, def: 0, agi: 0 };

			// 1. Ingest base scaling thresholds from class level profiles
			const classConfig = itemCatalog?.Classes?.[character.phenotype] || {};
			const growth = classConfig.growth || {
				hp: 5,
				mp: 2,
				atk: 1,
				def: 1,
				agi: 1,
			};
			const base = classConfig.baseStats || {
				hp: 25,
				mp: 8,
				atk: 8,
				def: 4,
				agi: 6,
			};

			Object.keys(projectedStats).forEach((statKey) => {
				projectedStats[statKey] = base[statKey] + growth[statKey] * (level - 1);
			});

			// 2. Aggregate active equipment weapon/armor stat attributes
			const eq = character.equipment || {};
			const gearSlots = ["weapon", "armor", "relic"];

			gearSlots.forEach((slot) => {
				const itemId = eq[slot];
				const itemData =
					itemCatalog?.Items?.[itemId] || itemCatalog?.GearCatalog?.[itemId];
				if (itemData && itemData.modifiers) {
					Object.keys(projectedStats).forEach((statKey) => {
						if (itemData.modifiers[statKey]) {
							projectedStats[statKey] += itemData.modifiers[statKey];
						}
					});
				}
			});

			// 3. Aggregate active attuned node modifiers across the matrix graph
			const attunedNodeIds =
				internalWorkingState.partyNodes[character.id] ||
				character.unlockedNodes ||
				[];
			attunedNodeIds.forEach((nodeId) => {
				const graphNode =
					constellationGraph?.[nodeId] || itemCatalog?.AetherNodes?.[nodeId];
				if (graphNode && graphNode.modifiers) {
					Object.keys(projectedStats).forEach((statKey) => {
						if (graphNode.modifiers[statKey]) {
							projectedStats[statKey] += graphNode.modifiers[statKey];
						}
					});
				}
			});

			return Object.freeze(projectedStats);
		},

		/**
		 * Handle host execution updates via normalized action dispatches with zero side-effects.
		 */
		handleHostAction(action) {
			const { type, characterId, nodeId } = action;

			switch (type) {
				case "UNLOCK_NODE":
					if (!internalWorkingState.partyNodes[characterId]) {
						internalWorkingState.partyNodes[characterId] = [];
					}
					if (!internalWorkingState.partyNodes[characterId].includes(nodeId)) {
						internalWorkingState.partyNodes[characterId].push(nodeId);
					}
					break;

				case "RESPEC_CHARACTER":
					// Fires full camp refund clearances
					internalWorkingState.partyNodes[characterId] = [];
					if (moduleContext?.eventBus) {
						moduleContext.eventBus.publish("progression:respec_completed", {
							characterId,
						});
					}
					break;
			}
		},

		update(dt, context) { },
		render(renderer, state) { },

		getState() {
			return structuredClone(internalWorkingState);
		},

		getDiagnostics() {
			return {
				trackedHeroesCount: Object.keys(internalWorkingState.partyNodes).length,
			};
		},

		destroy() {
			internalWorkingState = { partyNodes: {} };
			moduleContext = null;
			moduleConfig = null;
		},
	};
})();

if (typeof window !== "undefined")
	window.EmberlightProgression = EmberlightProgression;

/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: SYNERGY FLOW RATE (SFR) ALGORITHM
 * Document Identifier: SPEC-SFR-ALGORITHM-001
 * Governing Protocol:  VSRP-001 / PRS-ARC-020 / @pulse Telemetry
 * Authority:           Pure Functional Combo Mechanics & Flow Analytics
 * ============================================================================
 */

const EmberlightSFR = (() => {
	/**
	 * @typedef {Object} SFREnvelope
	 * @property {number} rawSynergyDelta Base combo energy generated.
	 * @property {number} netFlowRate Adjusted directional flow acceleration multiplier.
	 * @property {number} computedSurge Finalized energy payload added to the stream pool.
	 * @property {string[]} activeBridges Array of cross-subsystem mechanism IDs matched.
	 */

	/**
	 * Executes the authoritative SFR telemetry evaluation.
	 * Pure function: does not mutate state snapshots or external environment flags.
	 * @param {Object} action - Combat action record packet.
	 * @param {Battler[]} party - Active allied squad formation array.
	 * @param {Object} environment - Eco-grid parameters dictionary.
	 * @returns {Readonly<SFREnvelope>} Frozen synergy analysis envelope.
	 */
	function calculateFlowRate(action, party, environment) {
		let baseSynergy = 10.0;
		let flowMultiplier = 1.0;
		const activeBridges = [];

		const attacker = party.find((h) => h.id === action.attackerId);
		const recipient = party.find((h) => h.id === action.targetId);

		// 1. Relational Buffering: Proximity and Row Alignment Mechanics
		if (attacker && recipient && attacker.id !== recipient.id) {
			const sameRow = attacker.row === recipient.row;
			if (sameRow) {
				// Frontline vanguard tactical synchronization
				baseSynergy += 5.0;
				flowMultiplier *= 1.25;
				activeBridges.push("SYN-BRG-ROW_ALIGN");
			} else {
				// Cross-row backline supportive shielding buffer
				baseSynergy += 2.5;
				flowMultiplier *= 1.15;
				activeBridges.push("SYN-BRG-CROSS_ROW");
			}
		}

		// 2. Elemental Resonance Matching
		if (action.skillElement && action.skillElement !== "NONE") {
			const elementToken = String(action.skillElement).toUpperCase();
			const matchingAuraCount = party.filter(
				(h) =>
					h.alive &&
					h.unlockedNodes?.some((n) => n.includes(elementToken.toLowerCase())),
			).length;

			if (matchingAuraCount > 0) {
				baseSynergy += matchingAuraCount * 3.0;
				flowMultiplier *= 1.0 + matchingAuraCount * 0.1;
				activeBridges.push("SYN-BRG-ELEM_RESONANCE");
			}
		}

		// 3. Subterranean Environment Miasma Dampening Invariants
		if (environment?.dungeonDepth > 0) {
			// Miasma pockets compress core resonance frequency bands
			flowMultiplier *= Math.max(0.4, 1.0 - environment.dungeonDepth * 0.08);
			activeBridges.push("SYN-BRG-SUBT_DAMPENING");
		}

		const computedSurge = parseFloat((baseSynergy * flowMultiplier).toFixed(4));

		return Object.freeze({
			rawSynergyDelta: baseSynergy,
			netFlowRate: parseFloat(flowMultiplier.toFixed(4)),
			computedSurge,
			activeBridges: Object.freeze(activeBridges),
		});
	}

	return { calculateFlowRate };
})();

if (typeof window !== "undefined") window.EmberlightSFR = EmberlightSFR;
