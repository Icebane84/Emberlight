/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: WORLD ECOLOGY & TOPOLOGY ENGINE
 * Document Identifier: VSRP-001-WORLD-ECOLOGY
 * Governing Protocol:  VSRP-001 / SDCP-001 / ARCH-ZONE-OVERWORLD-001
 * Authority:           Ephemeral Simulation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & Contract Schemas
 *   [SEC-02] Module State & Caravan Waypoint Registry
 *   [SEC-03] Topology Mutation & Caravan Projection Utilities
 *   [SEC-04] Overworld, Town & Dungeon Map Resolvers
 *   [SEC-05] Unified Tile Trigger Physics Engine
 *   [SEC-06] Atomic SDCP-001 Capability Settlement Engine
 *   [SEC-07] Module Lifecycle Gateway & Public Facade
 *   [SEC-08] Module Export & Global Scope Bindings
 * ============================================================================
 */

/* cspell:words scorchable lockpicking */

// @ts-ignore
const EmberlightWorldEcology = (() => {
	'use strict';

	//#region [SEC-01] Type Definitions & Contract Schemas
	/**
	 * @typedef {Object} GridCoord
	 * @property {number} x - Horizontal grid matrix coordinate.
	 * @property {number} y - Vertical grid matrix coordinate.
	 */

	/**
	 * @typedef {Record<string, string>} SparseMutations
	 */

	/**
	 * @typedef {Object} TownMapDescriptor
	 * @property {string[][]} [map] - 2D grid matrix of the town district.
	 * @property {GridCoord} [spawnCoord] - Default player spawn location in town.
	 */

	/**
	 * @typedef {Object} WorldManifest
	 * @property {string[][]} [OverworldMap] - Master overworld map grid.
	 * @property {Record<string, TownMapDescriptor>} [TownMaps] - Municipal map registry.
	 * @property {function(string[][], Record<string, any>): string[][]} [getResolvedMap] - Resolver routine for dynamic map features.
	 */

	/**
	 * @typedef {Object} DungeonGenerator
	 * @property {function(number, number, number, number): { map: string[][], spawn: GridCoord }} generate - Floor procedural generation routine.
	 */

	/**
	 * @typedef {Object} PartyMember
	 * @property {string} id - Unique entity identifier.
	 * @property {string} name - Entity display name.
	 * @property {number} mp - Current magic points.
	 * @property {boolean} alive - Life state flag.
	 * @property {string[]} [unlocked] - Unlocked skill and capability tokens.
	 */

	/**
	 * @typedef {Object} PRNGService
	 * @property {function(number, number): number} nextInt - Generates pseudo-random integers within range.
	 */

	/**
	 * @typedef {Object} TileTriggerParams
	 * @property {boolean} [isInteraction=false] - Interaction keypress flag.
	 * @property {GridCoord} [pos] - Player current grid position.
	 * @property {string | null} [facingTile=null] - Map glyph directly in front of the player.
	 * @property {string | null} [currentTile=null] - Map glyph occupied by the player.
	 * @property {GridCoord} [facingPos] - Grid coordinates directly in front of the player.
	 * @property {string | null} [townId=null] - Active town identifier.
	 * @property {number} [dungeonDepth=0] - Subterranean dungeon depth level.
	 * @property {Record<string, any>} [flags={}] - Session state flags dictionary.
	 * @property {PartyMember[]} [party=[]] - Active player party roster.
	 * @property {WorldManifest} [manifest={}] - World data manifest.
	 * @property {GridCoord | null} [lastInteractedChestPos=null] - Debounce position for chests.
	 * @property {DungeonGenerator | null} [dungeonGen=null] - Procedural dungeon generator service.
	 * @property {PRNGService | null} [prng=null] - Pseudo-random number generator service.
	 * @property {GridCoord} [macroPos] - Saved overworld entry position.
	 */

	/**
	 * @typedef {Object} TileTriggerResult
	 * @property {string} type - Trigger action classification token.
	 * @property {string} [townId] - Destination town district identifier.
	 * @property {GridCoord} [macroPos] - Stored overworld entry position.
	 * @property {GridCoord} [spawnCoord] - Destination spawn coordinates.
	 * @property {GridCoord} [targetPos] - Destination target position.
	 * @property {GridCoord} [chestPos] - Target chest coordinate.
	 * @property {string} [message] - HUD notification message.
	 * @property {string} [scriptKey] - Dialogue script key.
	 * @property {string} [shopId] - Shopkeeper inventory identifier.
	 * @property {Record<string, any>} [sealConfig] - Lock puzzle minigame configuration.
	 * @property {string} [flagKey] - State flag to set upon completion.
	 * @property {number} [bonusGold] - Awarded gold quantity.
	 * @property {number} [nextDepth] - Subterranean depth target.
	 * @property {Record<string, any>} [dungeonSpec] - Procedural generation parameters.
	 * @property {string[][] | null} [dungeonFloor] - Pre-generated floor matrix.
	 * @property {boolean} [hasWard] - Environmental protection ward status.
	 * @property {number} [damagePct] - Fractional HP damage amount.
	 * @property {string} [ailment] - Status ailment classification.
	 * @property {string} [bossKey] - Boss encounter identifier.
	 */

	/**
	 * @typedef {Object} CostSpec
	 * @property {'MP' | 'ITEM' | string} type - Resource deduction classification.
	 * @property {number} amount - Resource deduction quantity.
	 * @property {string} [entityId] - Target party member identifier for MP deductions.
	 * @property {string} [itemId] - Target item inventory identifier.
	 */

	/**
	 * @typedef {Object} CostSettlementResult
	 * @property {boolean} success - Cost deduction status flag.
	 * @property {string} [reason] - Failure explanation token.
	 * @property {string} [casterName] - Name of casting entity.
	 * @property {string} [itemId] - Deducted inventory item identifier.
	 */

	/**
	 * @typedef {Object} SettlementAttestation
	 * @property {CostSpec} [costSpec] - Associated capability resource cost.
	 */

	/**
	 * @typedef {Object} SettlementContext
	 * @property {function(): PartyMember[]} getParty - Party roster retrieval routine.
	 * @property {function(PartyMember[]): void} setParty - Party roster mutation routine.
	 * @property {function(): Record<string, number>} getInventory - Item inventory retrieval routine.
	 * @property {function(string, number): void} modifyItem - Item quantity adjustment routine.
	 * @property {function(string): void} notifyStatus - HUD message dispatch routine.
	 * @property {function(): string[][]} getActiveWorldMap - Active world map matrix retrieval routine.
	 * @property {function(number, number, string): void} recordTileMutation - Tile mutation logging routine.
	 * @property {function(string[][]): void} commitWorldUpdate - Map matrix commit routine.
	 * @property {function(string): void} publishSfx - Audio SFX publication routine.
	 * @property {function(string): void} triggerVfx - Visual VFX trigger routine.
	 * @property {function(string): void} enterMarketDistrict - Market UI transition routine.
	 */

	/**
	 * @typedef {Object} CapabilityPayload
	 * @property {GridCoord[]} [targetCoords] - Multiple target grid coordinates.
	 * @property {GridCoord} [targetCoord] - Single target grid coordinate.
	 */

	/**
	 * @typedef {Object} CapabilitySettlementResult
	 * @property {boolean} success - Capability execution success status.
	 * @property {number} [tilesAltered] - Number of modified terrain tiles.
	 * @property {number} [gatesOpened] - Number of opened portcullis gates.
	 * @property {number} [cloudsCleared] - Number of dispelled miasma clouds.
	 * @property {string} [reason] - Failure explanation token.
	 */

	/**
	 * @typedef {Object} EcologyDiagnostics
	 * @property {string} driverId - Unique module diagnostic identifier.
	 * @property {number} activeCaravanWaypoints - Waypoint path node count.
	 * @property {boolean} eventBusBound - Flag confirming event bus attachment.
	 */

	/**
	 * @typedef {Object} EcologyContext
	 * @property {{ publish?: function(string, any): void }} [eventBus] - Host event bus handle.
	 */
	//#endregion

	//#region [SEC-02] Module State & Caravan Waypoint Registry
	/** @type {any} */
	let eventBusRef = null;

	/** @type {GridCoord[]} */
	const CARAVAN_WAYPOINTS = [
		{ x: 3, y: 5 }, { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 9, y: 5 },
		{ x: 10, y: 8 }, { x: 12, y: 8 }, { x: 14, y: 10 }, { x: 16, y: 10 },
		{ x: 18, y: 12 }, { x: 18, y: 14 }, { x: 16, y: 15 }, { x: 12, y: 15 },
		{ x: 9, y: 15 }, { x: 7, y: 12 }, { x: 5, y: 10 }, { x: 3, y: 8 },
	];
	//#endregion

	//#region [SEC-03] Topology Mutation & Caravan Projection Utilities
	/**
	 * Resolves the wandering caravan's current grid waypoint based on travel steps.
	 * Pure mathematical coordinate lookup function.
	 * @param {number} [stepCounter=0] - World travel step counter.
	 * @returns {GridCoord} Caravan waypoint coordinate.
	 */
	function getCaravanCoordinate(stepCounter = 0) {
		const idx = Math.floor(stepCounter / 4) % CARAVAN_WAYPOINTS.length;
		return CARAVAN_WAYPOINTS[idx];
	}

	/**
	 * Applies sparse coordinate tile mutations onto a map grid matrix.
	 * State-mutating map grid update procedure.
	 * @param {string[][]} resolved - Mutable 2D grid map matrix.
	 * @param {SparseMutations | null | undefined} mutations - Sparse mutation coordinate-to-glyph dictionary.
	 * @returns {void}
	 */
	function applySparseMutations(resolved, mutations) {
		if (!mutations) return;
		Object.entries(mutations).forEach(([coord, tile]) => {
			const [mx, my] = coord.split(',').map(Number);
			if (resolved[my]?.[mx] !== undefined) {
				resolved[my][mx] = tile;
			}
		});
	}

	/**
	 * Purges stale caravan entity glyphs ('@') across map rows, restoring baseline terrain.
	 * State-mutating map cleanup procedure.
	 * @param {string[][]} resolved - Mutable 2D grid map matrix.
	 * @returns {void}
	 */
	function cleanCaravanGhostTiles(resolved) {
		for (const row of resolved) {
			if (Array.isArray(row)) {
				for (let x = 0; x < row.length; x++) {
					if (row[x] === '@') row[x] = '.';
				}
			}
		}
	}

	/**
	 * Projects the active wandering caravan glyph onto the surface wilderness map.
	 * State-mutating grid overlay procedure.
	 * @param {string[][]} resolved - Mutable 2D grid map matrix.
	 * @param {number} stepCounter - World travel step counter.
	 * @param {number} dungeonDepth - Current subterranean dungeon depth level.
	 * @param {string | null | undefined} townId - Active town district identifier.
	 * @returns {void}
	 */
	function projectCaravanTile(resolved, stepCounter, dungeonDepth, townId) {
		if (dungeonDepth === 0 && !townId) {
			const cPos = getCaravanCoordinate(stepCounter);
			if (resolved[cPos.y]?.[cPos.x] === '.') {
				resolved[cPos.y][cPos.x] = '@';
			}
		}
	}
	//#endregion

	//#region [SEC-04] Overworld, Town & Dungeon Map Resolvers
	/**
	 * Resolves the complete surface overworld map with mutations and dynamic entity projections.
	 * State-mutating grid resolution procedure.
	 * @param {WorldManifest} manifest - World data manifest.
	 * @param {Record<string, any>} flags - Gameplay state flags dictionary.
	 * @param {SparseMutations | null | undefined} mutations - Sparse tile mutations dictionary.
	 * @param {number} stepCounter - World travel step counter.
	 * @param {number} dungeonDepth - Current subterranean depth level.
	 * @param {string | null | undefined} [townId=null] - Active town identifier.
	 * @returns {string[][]} Resolved 2D overworld map matrix.
	 */
	function resolveSurfaceMap(manifest, flags, mutations, stepCounter, dungeonDepth, townId = null) {
		const rawMap = manifest?.OverworldMap || [];
		const resolved = typeof manifest?.getResolvedMap === 'function'
			? manifest.getResolvedMap(rawMap, flags)
			: rawMap.map((r) => [...r]);

		applySparseMutations(resolved, mutations);
		cleanCaravanGhostTiles(resolved);
		projectCaravanTile(resolved, stepCounter, dungeonDepth, townId);
		return resolved;
	}

	/**
	 * Resolves the local town district map with sparse municipal mutations.
	 * State-mutating grid resolution procedure.
	 * @param {WorldManifest} manifest - World data manifest.
	 * @param {string} townId - Target town district identifier.
	 * @param {Record<string, any>} flags - Gameplay state flags dictionary.
	 * @param {Record<string, SparseMutations> | null | undefined} [townMutations=null] - Municipal mutations dictionary.
	 * @returns {string[][]} Resolved 2D town map matrix.
	 */
	function resolveTownMap(manifest, townId, flags, townMutations = null) {
		const baseTown = manifest?.TownMaps?.[townId]?.map || manifest?.OverworldMap || [];
		const resolved = typeof manifest?.getResolvedMap === 'function'
			? manifest.getResolvedMap(baseTown, flags)
			: baseTown.map((r) => [...r]);

		if (townMutations?.[townId]) {
			applySparseMutations(resolved, townMutations[townId]);
		}
		return resolved;
	}

	/**
	 * Procedurally generates a subterranean dungeon floor map with applied mutations.
	 * State-mutating procedural generation procedure.
	 * @param {number} seed - PRNG generation seed.
	 * @param {number} width - Floor grid width dimension.
	 * @param {number} height - Floor grid height dimension.
	 * @param {number} depth - Subterranean dungeon depth level.
	 * @param {DungeonGenerator | null | undefined} dungeonGen - Procedural dungeon generator service.
	 * @param {SparseMutations | null | undefined} [mutations=null] - Floor tile mutations dictionary.
	 * @returns {string[][] | null} Generated 2D dungeon floor matrix or null on generator failure.
	 */
	function resolveDungeonMap(seed, width, height, depth, dungeonGen, mutations = null) {
		if (!dungeonGen || typeof dungeonGen.generate !== 'function') return null;
		const { map: genFloor } = dungeonGen.generate(seed, width, height, depth);
		if (mutations) {
			applySparseMutations(genFloor, mutations);
		}
		return genFloor;
	}
	//#endregion

	//#region [SEC-05] Unified Tile Trigger Physics Engine
	/**
	 * Evaluates town district entry and exit gate triggers.
	 * Pure evaluation helper.
	 * @param {string} tile - Map glyph tile.
	 * @param {string | null} townId - Active town district identifier.
	 * @param {number} dungeonDepth - Current subterranean depth.
	 * @param {GridCoord} pos - Player current grid position.
	 * @param {WorldManifest} manifest - World data manifest.
	 * @param {GridCoord} [macroPos] - Saved overworld entry position.
	 * @returns {TileTriggerResult | null} Gate transition outcome or null.
	 */
	function evaluateTownGateTrigger(tile, townId, dungeonDepth, pos, manifest, macroPos) {
		if (tile === 'T' && !townId && dungeonDepth === 0) {
			const town = manifest?.TownMaps?.OAKHAVEN;
			if (town?.spawnCoord) {
				return {
					type: 'ENTER_TOWN',
					townId: 'OAKHAVEN',
					macroPos: { ...pos },
					spawnCoord: { ...town.spawnCoord },
					message: 'Entered Oakhaven Hamlet.',
				};
			}
		}
		if (tile === 'O' && townId) {
			return {
				type: 'EXIT_TOWN',
				targetPos: macroPos || { x: 1, y: 1 },
				message: 'Exited Oakhaven Hamlet into the wilderness.',
			};
		}
		return null;
	}

	/**
	 * Evaluates interactive NPC and sanctuary campsite triggers.
	 * Pure evaluation helper.
	 * @param {string} tile - Map glyph tile.
	 * @returns {TileTriggerResult | null} Interaction outcome or null.
	 */
	function evaluateNpcTrigger(tile) {
		if (tile === 'E') return { type: 'OPEN_DIALOGUE', scriptKey: 'VILLAGE_ELDER' };
		if (tile === 'G') return { type: 'OPEN_DIALOGUE', scriptKey: 'TOWN_GUARD' };
		if (tile === 'V') return { type: 'OPEN_DIALOGUE', scriptKey: 'AFFLICTED_SCOUT' };
		if (tile === 'H') return { type: 'INN_REST', message: 'Rested at The Hearth Inn. HP and MP fully restored, ailments cleansed, and expedition saved!' };
		if (tile === 'N') return { type: 'OPEN_DIALOGUE', scriptKey: 'NOTICE_BOARD' };
		if (tile === 'A') return { type: 'SHRINE_COMMUNE', message: 'Communed with Ancient Aether Shrine. Party MP fully restored!' };
		if (tile === 'B') return { type: 'OPEN_SHOP', shopId: 'VILLAGE_BLACKSMITH' };
		if (tile === 'F') return { type: 'OPEN_FORGE' };
		if (tile === 'C') return { type: 'CAMP_REST', message: 'Rested at Sanctuary Campsite. Party HP & MP fully restored!' };
		return null;
	}

	/**
	 * Evaluates wilderness and dungeon resource foraging nodes.
	 * Pure evaluation helper.
	 * @param {string} tile - Map glyph tile.
	 * @param {GridCoord} targetPos - Target node position.
	 * @param {PRNGService | null} prng - PRNG service handle.
	 * @returns {TileTriggerResult | null} Forage outcome or null.
	 */
	function evaluateForageTrigger(tile, targetPos, prng) {
		if (tile !== '*' || !targetPos) return null;
		const pool = [
			{ item: 'POTION', name: 'Healing Potion', gold: 15 },
			{ item: 'ETHER', name: 'Celestial Ether', gold: 20 },
			{ item: 'PHOENIX_EMBER', name: 'Phoenix Ash', gold: 30 },
			{ item: 'SWIFT_RING', name: 'Resonant Crystal', gold: 25 },
		];
		const idx = prng ? prng.nextInt(0, pool.length - 1) : 0;
		const reward = pool[idx];
		return {
			type: 'FORAGE_RESOURCE',
			targetPos: { ...targetPos },
			rewardItem: reward.item,
			bonusGold: reward.gold,
			message: `✨ Foraged ${reward.name} and found ${reward.gold}G!`,
		};
	}

	/**
	 * Evaluates chest and reliquary lockpick triggers.
	 * Pure evaluation helper.
	 * @param {string} tile - Map glyph tile.
	 * @param {GridCoord} targetPos - Target chest position.
	 * @param {string | null} townId - Active town district identifier.
	 * @param {number} dungeonDepth - Current subterranean depth.
	 * @param {Record<string, any>} flags - Gameplay flags dictionary.
	 * @param {GridCoord | null} lastInteractedChestPos - Debounced chest coordinate.
	 * @param {PRNGService | null} prng - PRNG service handle.
	 * @returns {TileTriggerResult | null} Chest loot outcome or null.
	 */
	function evaluateChestTrigger(tile, targetPos, townId, dungeonDepth, flags, lastInteractedChestPos, prng) {
		if (tile !== '$' || !targetPos) return null;
		const isDebounced = lastInteractedChestPos?.x === targetPos.x && lastInteractedChestPos?.y === targetPos.y;
		if (isDebounced) return null;

		if (townId === 'OAKHAVEN') {
			if (!flags.looted_oakhaven_iron) {
				return {
					type: 'OPEN_LOCKPICK',
					chestPos: { ...targetPos },
					sealConfig: {
						sealKey: 'SMUGGLER_BOX_ALPHA',
						sealFlag: 'looted_oakhaven_iron',
						targetA: 4.0, targetB: 3.0, targetPhase: 0.78,
						rewardLoot: { gold: 50, item: 'CHAINMAIL' },
					},
				};
			}
			return null;
		}

		if (dungeonDepth === 0) {
			if (!flags.looted_crypt_chest) {
				return {
					type: 'OPEN_LOCKPICK',
					chestPos: { ...targetPos },
					sealConfig: {
						sealKey: 'CHEST_WARD_DELTA',
						sealFlag: 'looted_crypt_chest',
						targetA: 3.0, targetB: 2.0, targetPhase: 1.57,
						rewardLoot: { gold: 40, item: 'POTION' },
					},
				};
			}
			return null;
		}

		const floorChestKey = `looted_chest_d${dungeonDepth}_${targetPos.x}_${targetPos.y}`;
		if (!flags[floorChestKey]) {
			const bonusGold = prng ? prng.nextInt(25, 55) : 35;
			return {
				type: 'LOOT_FLOOR_CHEST',
				chestPos: { ...targetPos },
				flagKey: floorChestKey,
				bonusGold,
			};
		}

		return null;
	}

	/**
	 * Evaluates vertical stair traversal and boss encounter triggers.
	 * Pure evaluation helper.
	 * @param {string} tile - Map glyph tile.
	 * @param {number} dungeonDepth - Current subterranean depth.
	 * @param {Record<string, any>} flags - Gameplay flags dictionary.
	 * @param {DungeonGenerator | null} dungeonGen - Procedural generator handle.
	 * @param {PRNGService | null} prng - PRNG service handle.
	 * @returns {TileTriggerResult | null} Stair traversal outcome or null.
	 */
	function evaluateStairsTrigger(tile, dungeonDepth, flags, dungeonGen, prng) {
		if (tile === '>') {
			if (dungeonDepth === 0 && !flags.boss_slain) {
				return { type: 'TRIGGER_BOSS', bossKey: 'BOSS_MALAKOR' };
			}
			const nextDepth = dungeonDepth === 0 ? 1 : dungeonDepth + 1;
			const seed = prng ? prng.nextInt(100000, 999999) : 123456;
			let newFloor = null;
			let dSpawn = { x: 1, y: 1 };
			if (dungeonGen && typeof dungeonGen.generate === 'function') {
				const generated = dungeonGen.generate(seed, 12, 10, nextDepth);
				newFloor = generated.map;
				dSpawn = generated.spawn;
			}
			return {
				type: 'DESCEND_STAIRS',
				nextDepth,
				dungeonSpec: { seed, depth: nextDepth, width: 12, height: 10, mutations: {} },
				dungeonFloor: newFloor,
				spawnCoord: dSpawn,
			};
		}
		if (tile === '<' && dungeonDepth > 0) {
			return {
				type: 'ASCEND_STAIRS',
				targetPos: { x: 9, y: 4 },
			};
		}
		return null;
	}

	/**
	 * Evaluates passive subterranean environmental hazard triggers.
	 * Pure evaluation helper.
	 * @param {string} tile - Map glyph tile.
	 * @param {boolean} isInteraction - Interaction flag.
	 * @param {PartyMember[]} party - Active player party roster.
	 * @returns {TileTriggerResult | null} Hazard outcome or null.
	 */
	function evaluateHazardTrigger(tile, isInteraction, party) {
		if (!isInteraction && tile === '%') {
			const hasWard = party.some((c) => c.alive && c.unlocked?.includes('hea_san_1'));
			return {
				type: 'MIASMA_HAZARD',
				hasWard,
				damagePct: 0.06,
				ailment: 'POISON',
			};
		}
		return null;
	}

	/**
	 * Evaluates unified tile trigger physics across wilderness, town gates, chests, stairs, and environmental hazards.
	 * Pure evaluation procedure.
	 * @param {TileTriggerParams} [params={}] - Tile trigger context and collision parameters.
	 * @returns {TileTriggerResult} Trigger outcome descriptor.
	 */
	function evaluateTileTrigger(params = {}) {
		const {
			isInteraction = false,
			pos = { x: 0, y: 0 },
			facingTile = null,
			currentTile = null,
			townId = null,
			dungeonDepth = 0,
			flags = {},
			party = [],
			manifest = {},
			lastInteractedChestPos = null,
			dungeonGen = null,
			prng = null,
		} = params;

		const tile = isInteraction ? (facingTile || currentTile) : currentTile;
		const targetPos = isInteraction && facingTile && params.facingPos ? params.facingPos : pos;
		if (!tile) return { type: 'NONE' };

		const townRes = evaluateTownGateTrigger(tile, townId, dungeonDepth, pos, manifest, params.macroPos);
		if (townRes) return townRes;

		if (isInteraction) {
			const npcRes = evaluateNpcTrigger(tile);
			if (npcRes) return npcRes;
		}

		const chestRes = evaluateChestTrigger(tile, targetPos, townId, dungeonDepth, flags, lastInteractedChestPos, prng);
		if (chestRes) return chestRes;

		if (isInteraction) {
			const forageRes = evaluateForageTrigger(tile, targetPos, prng);
			if (forageRes) return forageRes;
		}

		const stairsRes = evaluateStairsTrigger(tile, dungeonDepth, flags, dungeonGen, prng);
		if (stairsRes) return stairsRes;

		const hazardRes = evaluateHazardTrigger(tile, isInteraction, party);
		if (hazardRes) return hazardRes;

		return { type: 'NONE' };
	}
	//#endregion

	//#region [SEC-06] Atomic SDCP-001 Capability Settlement Engine
	/**
	 * Validates and deducts capability activation resource costs (MP, items) from party or inventory.
	 * State-mutating resource settlement procedure.
	 * @param {CostSpec} costSpec - Resource deduction specification.
	 * @param {SettlementContext} context - Host capability settlement context.
	 * @returns {CostSettlementResult} Settlement result descriptor.
	 */
	function settleCost(costSpec, context) {
		if (costSpec.type === 'MP') {
			const party = context.getParty();
			const caster = party.find((c) => c.id === costSpec.entityId);
			if (!caster || caster.mp < costSpec.amount) {
				context.notifyStatus('Resource check failed during settlement.');
				return { success: false, reason: 'INSUFFICIENT_MP' };
			}
			caster.mp -= costSpec.amount;
			context.setParty(party);
			return { success: true, casterName: caster.name };
		}
		if (costSpec.type === 'ITEM') {
			if (costSpec.itemId && (context.getInventory()[costSpec.itemId] || 0) < costSpec.amount) {
				context.notifyStatus(`Out of ${costSpec.itemId}!`);
				return { success: false, reason: 'OUT_OF_ITEM' };
			}
			if (costSpec.itemId) {
				context.modifyItem(costSpec.itemId, -costSpec.amount);
			}
			return { success: true, itemId: costSpec.itemId };
		}
		return { success: false, reason: 'UNKNOWN_COST_SPEC' };
	}

	/**
	 * Settles elemental scorch capability and alters target brush tiles.
	 * State-mutating capability execution helper.
	 * @param {CapabilityPayload} payload - Target coordinates payload.
	 * @param {CostSpec | undefined} costSpec - Associated cost specification.
	 * @param {SettlementContext} context - Host settlement context.
	 * @param {string[][]} activeMap - Active world map matrix.
	 * @returns {CapabilitySettlementResult} Settlement result descriptor.
	 */
	function settleScorch(payload, costSpec, context, activeMap) {
		if (!costSpec) return { success: false, reason: 'MISSING_COST_SPEC' };
		const costRes = settleCost(costSpec, context);
		if (!costRes.success) return costRes;
		let tilesAltered = 0;
		payload.targetCoords?.forEach(({ x, y }) => {
			if (activeMap[y]?.[x] === '"') {
				activeMap[y][x] = '.';
				context.recordTileMutation(x, y, '.');
				tilesAltered++;
			}
		});
		if (tilesAltered > 0) {
			context.publishSfx('ATTACK_HIT');
			context.triggerVfx('BOLT');
			context.notifyStatus(`🔥 Scorch cleared ${tilesAltered} tile(s)!`);
			context.commitWorldUpdate(activeMap);
			return { success: true, tilesAltered };
		}
		context.notifyStatus('No scorchable tiles in range.');
		return { success: false, reason: 'NO_SCORCHABLE_TILES' };
	}

	/**
	 * Settles sanctuary consecration capability, spawning a campsite tile.
	 * State-mutating capability execution helper.
	 * @param {CapabilityPayload} payload - Target coordinate payload.
	 * @param {CostSpec | undefined} costSpec - Associated cost specification.
	 * @param {SettlementContext} context - Host settlement context.
	 * @param {string[][]} activeMap - Active world map matrix.
	 * @returns {CapabilitySettlementResult} Settlement result descriptor.
	 */
	function settleConsecrate(payload, costSpec, context, activeMap) {
		if (!costSpec) return { success: false, reason: 'MISSING_COST_SPEC' };
		const costRes = settleCost(costSpec, context);
		if (!costRes.success) return costRes;
		const targetCoord = payload.targetCoord;
		if (!targetCoord) return { success: false, reason: 'MISSING_TARGET_COORD' };
		activeMap[targetCoord.y][targetCoord.x] = 'C';
		context.recordTileMutation(targetCoord.x, targetCoord.y, 'C');
		context.publishSfx('HEAL');
		context.triggerVfx('HEAL');
		context.notifyStatus(`✨ ${costRes.casterName} consecrated a Sanctuary Camp (-${costSpec.amount} MP)!`);
		context.commitWorldUpdate(activeMap);
		return { success: true };
	}

	/**
	 * Settles elemental freeze capability, transforming water into ice bridges.
	 * State-mutating capability execution helper.
	 * @param {CapabilityPayload} payload - Target coordinates payload.
	 * @param {CostSpec | undefined} costSpec - Associated cost specification.
	 * @param {SettlementContext} context - Host settlement context.
	 * @param {string[][]} activeMap - Active world map matrix.
	 * @returns {CapabilitySettlementResult} Settlement result descriptor.
	 */
	function settleFreeze(payload, costSpec, context, activeMap) {
		if (!costSpec) return { success: false, reason: 'MISSING_COST_SPEC' };
		const costRes = settleCost(costSpec, context);
		if (!costRes.success) return costRes;
		let tilesAltered = 0;
		payload.targetCoords?.forEach(({ x, y }) => {
			if (activeMap[y]?.[x] === '~') {
				activeMap[y][x] = '=';
				context.recordTileMutation(x, y, '=');
				tilesAltered++;
			}
		});
		if (tilesAltered > 0) {
			context.publishSfx('SPELL_BOLT');
			context.triggerVfx('BOLT');
			context.notifyStatus(`❄️ ${costRes.casterName} froze water into an ice bridge (-${costSpec.amount} MP)!`);
			context.commitWorldUpdate(activeMap);
			return { success: true, tilesAltered };
		}
		context.notifyStatus('No water in range to freeze.');
		return { success: false, reason: 'NO_FREEZABLE_TILES' };
	}

	/**
	 * Settles dungeon pressure plate triggers, unlocking iron portcullises.
	 * State-mutating capability execution helper.
	 * @param {SettlementContext} context - Host settlement context.
	 * @param {string[][]} activeMap - Active world map matrix.
	 * @returns {CapabilitySettlementResult} Settlement result descriptor.
	 */
	function settlePlateTrigger(context, activeMap) {
		let gatesOpened = 0;
		for (let y = 0; y < activeMap.length; y++) {
			for (let x = 0; x < activeMap[y].length; x++) {
				if (activeMap[y][x] === 'P') {
					activeMap[y][x] = '/';
					context.recordTileMutation(x, y, '/');
					gatesOpened++;
				}
			}
		}
		if (gatesOpened > 0) {
			context.publishSfx('SELECT');
			context.triggerVfx('SLASH');
			context.notifyStatus(`⚙️ The heavy stone plate depressed! ${gatesOpened} iron gate(s) raised.`);
			context.commitWorldUpdate(activeMap);
			return { success: true, gatesOpened };
		}
		context.notifyStatus('The mechanism clicked, but no further gates responded.');
		return { success: false, reason: 'NO_LOCKED_GATES' };
	}

	/**
	 * Settles gale dispel capability, removing toxic miasma tiles.
	 * State-mutating capability execution helper.
	 * @param {CapabilityPayload} payload - Target coordinates payload.
	 * @param {CostSpec | undefined} costSpec - Associated cost specification.
	 * @param {SettlementContext} context - Host settlement context.
	 * @param {string[][]} activeMap - Active world map matrix.
	 * @returns {CapabilitySettlementResult} Settlement result descriptor.
	 */
	function settleGaleDispel(payload, costSpec, context, activeMap) {
		if (!costSpec) return { success: false, reason: 'MISSING_COST_SPEC' };
		const costRes = settleCost(costSpec, context);
		if (!costRes.success) return costRes;
		let cloudsCleared = 0;
		payload.targetCoords?.forEach(({ x, y }) => {
			if (activeMap[y]?.[x] === '%') {
				activeMap[y][x] = '.';
				context.recordTileMutation(x, y, '.');
				cloudsCleared++;
			}
		});
		if (cloudsCleared > 0) {
			context.publishSfx('SPELL_BOLT');
			context.triggerVfx('BOLT');
			context.notifyStatus(`💨 ${costRes.casterName} dispelled ${cloudsCleared} toxic cloud(s) (-${costSpec.amount} MP)!`);
			context.commitWorldUpdate(activeMap);
			return { success: true, cloudsCleared };
		}
		context.notifyStatus('No toxic clouds in range.');
		return { success: false, reason: 'NO_MIASMA_TILES' };
	}

	/**
	 * Settles nomadic caravan interaction, opening market district interface.
	 * State-mutating capability execution helper.
	 * @param {SettlementContext} context - Host settlement context.
	 * @returns {CapabilitySettlementResult} Settlement result descriptor.
	 */
	function settleInspectCaravan(context) {
		context.enterMarketDistrict('WANDERING_CARAVAN');
		context.publishSfx('SELECT');
		context.notifyStatus('Greeted Balthazar the Wanderer. Reviewing nomadic wares...');
		return { success: true };
	}

	/**
	 * Executes atomic SDCP-001 capability settlement and tile topology mutation.
	 * State-mutating capability execution procedure.
	 * @param {string} token - Capability settlement action token.
	 * @param {CapabilityPayload|SettlementContext} payload - Capability target payload parameters or settlement context.
	 * @param {SettlementAttestation} [attestation] - Capability attestation and cost descriptor.
	 * @param {SettlementContext} [context] - Host capability settlement context.
	 * @returns {CapabilitySettlementResult} Capability outcome descriptor.
	 */
	function settleCapability(token, payload, attestation, context) {
		let resolvedContext = context;
		let resolvedPayload = payload;
		let resolvedAttestation = attestation;

		// Dual signature normalization: settleCapability(token, context) vs settleCapability(token, payload, attestation, context)
		if (!resolvedContext && resolvedPayload && typeof resolvedPayload.getActiveWorldMap === 'function') {
			resolvedContext = resolvedPayload;
			resolvedPayload = {};
			resolvedAttestation = {};
		}

		if (!resolvedContext || typeof resolvedContext.getActiveWorldMap !== 'function') {
			return { success: false, reason: 'MISSING_CONTEXT' };
		}

		const activeMap = resolvedContext.getActiveWorldMap();
		if (!activeMap) {
			resolvedContext.notifyStatus?.('No active world map available for capability execution.');
			return { success: false, reason: 'NO_ACTIVE_MAP' };
		}

		const party = typeof resolvedContext.getParty === 'function' ? resolvedContext.getParty() : [];
		const mage = party.find((c) => c.alive && c.phenotype === 'MAGE') || party.find((c) => c.alive) || party[0];
		const healer = party.find((c) => c.alive && c.phenotype === 'HEALER') || party.find((c) => c.alive) || party[0];

		let costSpec = resolvedAttestation?.costSpec;
		if (!costSpec) {
			if (token === 'cap:sanctuary.consecrate') {
				costSpec = { type: 'MP', amount: 6, entityId: healer?.id };
			} else if (token === 'cap:elemental.freeze') {
				costSpec = { type: 'MP', amount: 4, entityId: mage?.id };
			} else if (token === 'cap:elemental.gale_dispel') {
				costSpec = { type: 'MP', amount: 3, entityId: healer?.id || mage?.id };
			} else {
				costSpec = { type: 'MP', amount: 3, entityId: mage?.id || healer?.id };
			}
		}

		const worldPos = typeof resolvedContext.getWorldPos === 'function' ? resolvedContext.getWorldPos() : { x: 0, y: 0 };
		const finalPayload = {
			targetCoord: resolvedPayload?.targetCoord || worldPos,
			targetCoords: resolvedPayload?.targetCoords || [
				worldPos,
				{ x: worldPos.x, y: worldPos.y - 1 },
				{ x: worldPos.x, y: worldPos.y + 1 },
				{ x: worldPos.x - 1, y: worldPos.y },
				{ x: worldPos.x + 1, y: worldPos.y },
			],
			...resolvedPayload,
		};

		switch (token) {
			case 'cap:elemental.scorch':
				return settleScorch(finalPayload, costSpec, resolvedContext, activeMap);
			case 'cap:sanctuary.consecrate':
				return settleConsecrate(finalPayload, costSpec, resolvedContext, activeMap);
			case 'cap:elemental.freeze':
				return settleFreeze(finalPayload, costSpec, resolvedContext, activeMap);
			case 'cap:dungeon.plate_trigger':
				return settlePlateTrigger(resolvedContext, activeMap);
			case 'cap:elemental.gale_dispel':
				return settleGaleDispel(finalPayload, costSpec, resolvedContext, activeMap);
			case 'cap:economy.inspect_caravan':
				return settleInspectCaravan(resolvedContext);
			default:
				return { success: false, reason: `UNKNOWN_SETTLEMENT_TOKEN: ${token}` };
		}
	}
	//#endregion

	//#region [SEC-07] Module Lifecycle Gateway & Public Facade
	return {
		/**
		 * Initializes the world ecology driver with host event bus handles.
		 * State-mutating initialization gateway.
		 * @param {EcologyContext} [context] - Host initialization context.
		 * @returns {void}
		 */
		init(context) {
			eventBusRef = context?.eventBus || null;
		},
		getCaravanCoordinate,
		resolveSurfaceMap,
		resolveTownMap,
		resolveDungeonMap,
		evaluateTileTrigger,
		settleCapability,
		/**
		 * Retrieves operational telemetry metrics.
		 * Pure diagnostic accessor gateway.
		 * @returns {EcologyDiagnostics} Diagnostic telemetry report.
		 */
		getDiagnostics() {
			return {
				driverId: 'world_ecology',
				activeCaravanWaypoints: CARAVAN_WAYPOINTS.length,
				eventBusBound: Boolean(eventBusRef),
			};
		},
		/**
		 * Tears down module state and resets references.
		 * State-mutating terminal lifecycle gateway.
		 * @returns {void}
		 */
		destroy() {
			eventBusRef = null;
		},
	};
	//#endregion
})();

//#region [SEC-08] Module Export & Global Scope Bindings
if (typeof window !== 'undefined') {
	window.EmberlightWorldEcology = EmberlightWorldEcology;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightWorldEcology;
}
//#endregion