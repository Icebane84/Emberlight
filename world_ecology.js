/* =========================================================================
   EMBERLIGHT WORLD ECOLOGY & TOPOLOGY ENGINE (TIER-2/3 ECOSYSTEM BRIDGE)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-WORLD-ECOLOGY
   Protocol Version:    VSRP-001 / SDCP-001 / ARCH-ZONE-OVERWORLD-001
   Classification:      Environmental Topology & Tile Mutation Engine
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightWorldEcology = (() => {
  'use strict';

  let eventBusRef = null;

  const CARAVAN_WAYPOINTS = [
    { x: 3, y: 5 }, { x: 5, y: 5 }, { x: 7, y: 5 }, { x: 9, y: 5 },
    { x: 10, y: 8 }, { x: 12, y: 8 }, { x: 14, y: 10 }, { x: 16, y: 10 },
    { x: 18, y: 12 }, { x: 18, y: 14 }, { x: 16, y: 15 }, { x: 12, y: 15 },
    { x: 9, y: 15 }, { x: 7, y: 12 }, { x: 5, y: 10 }, { x: 3, y: 8 },
  ];

  function getCaravanCoordinate(stepCounter = 0) {
    const idx = Math.floor(stepCounter / 4) % CARAVAN_WAYPOINTS.length;
    return CARAVAN_WAYPOINTS[idx];
  }

  function applySparseMutations(resolved, mutations) {
    if (!mutations) return;
    Object.entries(mutations).forEach(([coord, tile]) => {
      const [mx, my] = coord.split(',').map(Number);
      if (resolved[my]?.[mx] !== undefined) {
        resolved[my][mx] = tile;
      }
    });
  }

  function cleanCaravanGhostTiles(resolved) {
    for (const row of resolved) {
      if (Array.isArray(row)) {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '@') row[x] = '.';
        }
      }
    }
  }

  function projectCaravanTile(resolved, stepCounter, dungeonDepth, townId) {
    if (dungeonDepth === 0 && !townId) {
      const cPos = getCaravanCoordinate(stepCounter);
      if (resolved[cPos.y]?.[cPos.x] === '.') {
        resolved[cPos.y][cPos.x] = '@';
      }
    }
  }

  // --- 1. Map Generation & Resolution ---
  function resolveSurfaceMap(manifest, flags, mutations, stepCounter, dungeonDepth, townId) {
    const rawMap = manifest?.OverworldMap || [];
    const resolved = typeof manifest?.getResolvedMap === 'function'
      ? manifest.getResolvedMap(rawMap, flags)
      : rawMap.map((r) => [...r]);

    applySparseMutations(resolved, mutations);
    cleanCaravanGhostTiles(resolved);
    projectCaravanTile(resolved, stepCounter, dungeonDepth, townId);
    return resolved;
  }

  function resolveTownMap(manifest, townId, flags, townMutations) {
    const baseTown = manifest?.TownMaps?.[townId]?.map || manifest?.OverworldMap || [];
    const resolved = typeof manifest?.getResolvedMap === 'function'
      ? manifest.getResolvedMap(baseTown, flags)
      : baseTown.map((r) => [...r]);

    if (townMutations?.[townId]) {
      applySparseMutations(resolved, townMutations[townId]);
    }
    return resolved;
  }

  function resolveDungeonMap(seed, width, height, depth, dungeonGen, mutations) {
    if (!dungeonGen || typeof dungeonGen.generate !== 'function') return null;
    const { map: genFloor } = dungeonGen.generate(seed, width, height, depth);
    if (mutations) {
      applySparseMutations(genFloor, mutations);
    }
    return genFloor;
  }

  // --- 2. Unified Tile Trigger Physics Engine ---
  function evaluateTileTrigger(params = {}) {
    const {
      isInteraction = false,
      pos,
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
    const targetPos = isInteraction && facingTile ? params.facingPos : pos;
    if (!tile) return { type: 'NONE' };

    // A. Town Transition Gates ('T' / 'O')
    if (tile === 'T' && !townId && dungeonDepth === 0) {
      const town = manifest?.TownMaps?.OAKHAVEN;
      if (town) {
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
        targetPos: params.macroPos || { x: 1, y: 1 },
        message: 'Exited Oakhaven Hamlet into the wilderness.',
      };
    }

    // B. Interactive NPCs & Landmarks (Interaction Only)
    if (isInteraction) {
      if (tile === 'E') return { type: 'OPEN_DIALOGUE', scriptKey: 'VILLAGE_ELDER' };
      if (tile === 'G') return { type: 'OPEN_DIALOGUE', scriptKey: 'TOWN_GUARD' };
      if (tile === 'V') return { type: 'OPEN_DIALOGUE', scriptKey: 'AFFLICTED_SCOUT' };
      if (tile === 'B') return { type: 'OPEN_SHOP', shopId: 'VILLAGE_BLACKSMITH' };
      if (tile === 'F') return { type: 'OPEN_FORGE' };
      if (tile === 'C') return { type: 'CAMP_REST', message: 'Rested at Sanctuary Campsite. Party HP & MP fully restored!' };
    }

    // C. Chest & Reliquary Trigger ('$')
    if (tile === '$') {
      const isDebounced = lastInteractedChestPos && lastInteractedChestPos.x === targetPos.x && lastInteractedChestPos.y === targetPos.y;
      if (!isDebounced) {
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
        } else if (dungeonDepth === 0) {
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
        } else {
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
        }
      }
    }

    // D. Dungeon Verticality Gates ('>' / '<')
    if (tile === '>') {
      if (dungeonDepth === 0) {
        if (!flags.boss_slain) {
          return { type: 'TRIGGER_BOSS', bossKey: 'BOSS_MALAKOR' };
        }
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

    // E. Subterranean Environmental Hazards ('%')
    if (!isInteraction && tile === '%') {
      const hasWard = party.some((c) => c.alive && c.unlocked?.includes('hea_san_1'));
      return {
        type: 'MIASMA_HAZARD',
        hasWard,
        damagePct: 0.06,
        ailment: 'POISON',
      };
    }

    return { type: 'NONE' };
  }

  // --- 3. Atomic SDCP-001 Capability Settlement Engine ---
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
      if ((context.getInventory()[costSpec.itemId] || 0) < costSpec.amount) {
        context.notifyStatus(`Out of ${costSpec.itemId}!`);
        return { success: false, reason: 'OUT_OF_ITEM' };
      }
      context.modifyItem(costSpec.itemId, -costSpec.amount);
      return { success: true, itemId: costSpec.itemId };
    }
    return { success: false, reason: 'UNKNOWN_COST_SPEC' };
  }

  function settleCapability(token, payload, attestation, context) {
    const costSpec = attestation?.costSpec;
    const activeMap = context.getActiveWorldMap();

    if (token === 'cap:elemental.scorch') {
      const costRes = settleCost(costSpec, context);
      if (!costRes.success) return costRes;
      let tilesAltered = 0;
      payload.targetCoords.forEach(({ x, y }) => {
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

    if (token === 'cap:sanctuary.consecrate') {
      const costRes = settleCost(costSpec, context);
      if (!costRes.success) return costRes;
      const { targetCoord } = payload;
      activeMap[targetCoord.y][targetCoord.x] = 'C';
      context.recordTileMutation(targetCoord.x, targetCoord.y, 'C');
      context.publishSfx('HEAL');
      context.triggerVfx('HEAL');
      context.notifyStatus(`✨ ${costRes.casterName} consecrated a Sanctuary Camp (-${costSpec.amount} MP)!`);
      context.commitWorldUpdate(activeMap);
      return { success: true };
    }

    if (token === 'cap:elemental.freeze') {
      const costRes = settleCost(costSpec, context);
      if (!costRes.success) return costRes;
      let tilesAltered = 0;
      payload.targetCoords.forEach(({ x, y }) => {
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

    if (token === 'cap:dungeon.plate_trigger') {
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

    if (token === 'cap:elemental.gale_dispel') {
      const costRes = settleCost(costSpec, context);
      if (!costRes.success) return costRes;
      let cloudsCleared = 0;
      payload.targetCoords.forEach(({ x, y }) => {
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

    if (token === 'cap:economy.inspect_caravan') {
      context.enterMarketDistrict('WANDERING_CARAVAN');
      context.publishSfx('SELECT');
      context.notifyStatus('Greeted Balthazar the Wanderer. Reviewing nomadic wares...');
      return { success: true };
    }

    return { success: false, reason: `UNKNOWN_SETTLEMENT_TOKEN: ${token}` };
  }

  return {
    init(context) {
      eventBusRef = context?.eventBus || null;
    },
    getCaravanCoordinate,
    resolveSurfaceMap,
    resolveTownMap,
    resolveDungeonMap,
    evaluateTileTrigger,
    settleCapability,
    getDiagnostics() {
      return {
        driverId: 'world_ecology',
        activeCaravanWaypoints: CARAVAN_WAYPOINTS.length,
      };
    },
    destroy() {
      eventBusRef = null;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightWorldEcology = EmberlightWorldEcology;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightWorldEcology;
}
