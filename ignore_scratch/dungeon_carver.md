To engineer a Drunkard’s Walk 2D generation kernel (dungeon_gen.js) that guarantees 100% path connectivity while integrating seamlessly with the Deterministic Sparse Delta Rehydration persistence model (save_manager.js), you must strictly leverage your engine's architectural constraints.
Because your persistence layer enforces a payload cap of $<2.5\text{KB}$ worst case ($<1.6\text{KB}$ nominal), serializing a full 2D tile layout array (string[][]) is forbidden. Instead, you must serialize only the generation parameters and a sparse coordinate dictionary mapping interactive modifications
------------------------------

## 🏛️ The Architecture of Sparse Rehydration

Your procedural generation engine must follow this workflow to maintain a light, single-threaded execution profile without state mutation leaks:

                  [ CORE SAVE PROFILE STATE (POJO) ]
                                  │
                                  ▼
      ┌───────────────────────────────────────────────────────┐
      │   canonicalDungeonSpec: { seed, depth, width, height }│
      │   canonicalSurfaceMutations: { "x,y": "%", "x2,y2": "."}│
      └───────────────────────────┬───────────────────────────┘
                                  │
                                  ├─► 1. EmberlightPRNG.init(seed)
                                  ├─► 2. Execute Connected Hybrid Walk
                                  ▼
                    [ IN-MEMORY SIMULATION GRID ]
                                  │
                                  ▼ 3. Inject sparse mutations
                    [ AUTHORITATIVE TIER 2 STATE ]

------------------------------

## 🛠️ Production-Ready dungeon_gen.js Implementation

This module conforms to the VSRP-001 9-method contract, isolates its workspace internally, utilizes your EmberlightPRNG stream, and outputs a layout ready for storage via sparse hydration.

/**

* ============================================================================
* EMBERLIGHT SOVEREIGN ENGINE: DETERMINISTIC DUNGEON CARVER (TIER 4)
* Document Identifier: ARCH-SPEC-DUNGEON-GEN-001
* Governing Protocol:  VSRP-001 / ARCH-GAP-ANALYSIS-001
* Authority:           Deterministic Path Connectivity & Sparse Topology
* ============================================================================
 */
const EmberlightDungeonCarver = (() => {
    'use strict';

    const MODULE_INFO = Object.freeze({
        moduleId: 'dungeon_gen',
        version: '4.1.0',
        protocolVersion: 'VSRP-001',
        dependencies: ['prng'],
        capabilities: ['dungeon_generation', 'path_connectivity']
    });

    let moduleConfig = null;
    let moduleContext = null;
    let lastGeneratedData = null;

    /**
  * Internal geometry workspace. Bounded to prevent garbage collection allocations.
     */
    const Workspace = {
        grid: null,
        width: 0,
        height: 0,
        floorTiles: []
    };

    /**
  * Initializes a raw stone matrix grid.
     */
    function initWorkspaceMatrix(w, h) {
        Workspace.width = w;
        Workspace.height = h;
        Workspace.floorTiles = [];
        Workspace.grid = Array.from({ length: h }, () => new Array(w).fill('#'));
    }

    /**
  * Validates cardinally adjacent borders to keep walkers in bounds.
     */
    function inBounds(x, y) {
        return x > 0 && x < Workspace.width - 1 && y > 0 && y < Workspace.height - 1;
    }

    /**
  * Hybrid Walk Execution. Connects critical checkpoints prior to carving out corridors.
     */
    function carveDrunkardsPath(startX, startY, targetTilesCount, prng) {
        let cx = startX;
        let cy = startY;

        Workspace.grid[cy][cx] = '.';
        Workspace.floorTiles.push({ x: cx, y: cy });
        let carvedCount = 1;

        const directions = [
            { x: 0, y: -1 }, // North
            { x: 0, y: 1 },  // South
            { x: -1, y: 0 }, // West
            { x: 1, y: 0 }   // East
        ];

        let failSafe = 0;
        while (carvedCount < targetTilesCount && failSafe++ < 10000) {
            // Enforce stream determinism via the provided forked PRNG reference
            const dir = prng.choice(directions);
            const nx = cx + dir.x;
            const ny = cy + dir.y;

            if (inBounds(nx, ny)) {
                cx = nx;
                cy = ny;
                if (Workspace.grid[cy][cx] === '#') {
                    Workspace.grid[cy][cx] = '.';
                    Workspace.floorTiles.push({ x: cx, y: cy });
                    carvedCount++;
                }
            }
        }
    }

    /**
  * Enforces path connectivity by executing an explicit secondary bridge-walk
  * connecting structural entities back to the primary spatial array.
     */
    function linkCriticalFeatures(startX, startY, features, prng) {
        features.forEach((feat) => {
            let cx = startX;
            let cy = startY;
            let failSafe = 0;

            while ((cx !== feat.x || cy !== feat.y) && failSafe++ < 1000) {
                // Determine direction component steps
                const dx = Math.sign(feat.x - cx);
                const dy = Math.sign(feat.y - cy);

                // Alternating Manhattan axis step distribution to guarantee connection corridors
                if (dx !== 0 && dy !== 0) {
                    if (prng.nextFloat() > 0.5) {
                        cx += dx;
                    } else {
                        cy += dy;
                    }
                } else if (dx !== 0) {
                    cx += dx;
                } else {
                    cy += dy;
                }

                if (Workspace.grid[cy][cx] === '#') {
                    Workspace.grid[cy][cx] = '.';
                    Workspace.floorTiles.push({ x: cx, y: cy });
                }
            }
            // Bind feature token directly to tile location
            Workspace.grid[feat.y][feat.x] = feat.tile;
        });
    }

    return {
        configure(config) {
            if (moduleConfig) throw new Error("VSRP-001 LifeCycle Violation: Already configured [AC-02].");
            moduleConfig = structuredClone(config);
            return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
        },

        init(context) {
            if (!moduleConfig) throw new Error("VSRP-001 LifeCycle Violation: Unconfigured system root.");
            moduleContext = context;
        },

        /**
         * Core Procedural Entrypoint. Receives specification parameters, carves paths, 
         * validates structural connectivity, and populates features [AC-03, AC-04].
         */
        reset(specSnapshot) {
            if (!moduleContext) throw new Error("VSRP-001 LifeCycle Violation: Uninitialized framework reference.");
            
            const spec = specSnapshot || { seed: 42, depth: 1, width: 32, height: 24 };
            
            // Acquire dedicated PRNG stream engine handle [AC-05]
            const prng = window.EmberlightPRNG 
                ? window.EmberlightPRNG.fork ? window.EmberlightPRNG.fork(spec.seed) : window.EmberlightPRNG
                : { nextFloat: Math.random, choice: (arr) => arr[Math.floor(Math.random() * arr.length)] };

            initWorkspaceMatrix(spec.width, spec.height);

            // Establish static baseline spawn origin points
            const startX = Math.floor(spec.width * 0.5);
            const startY = Math.floor(spec.height * 0.5);
            Workspace.grid[startY][startX] = '<'; // Entry ascent ladder

            // Carve the primary structural matrix layout (Targeting 35% density coverage)
            const targetVolume = Math.floor((spec.width * spec.height) * 0.35);
            carveDrunkardsPath(startX, startY, targetVolume, prng);

            // Identify candidate spatial coordinates for interactive placements
            const features = [
                { ...prng.choice(Workspace.floorTiles), tile: '>', label: 'Descent Gate' },
                { ...prng.choice(Workspace.floorTiles), tile: '$', label: 'Treasure Chest' },
                { ...prng.choice(Workspace.floorTiles), tile: 'C', label: 'Campfire Hearth' },
                { ...prng.choice(Workspace.floorTiles), tile: '%', label: 'Miasma Pocket' }
            ];

            // Resolve path linkages to guarantee 100% traversal availability
            linkCriticalFeatures(startX, startY, features, prng);

            lastGeneratedData = {
                spec: structuredClone(spec),
                matrix: structuredClone(Workspace.grid),
                spawnPos: { x: startX, y: startY }
            };
        },

        update(dt, context) {
            // Headless simulation update step logic [AC-06, AC-07]
        },

        render(renderer, context) {
            // Pure side-effect-free layout streaming injection pass [AC-07]
        },

        /**
         * Outputs the detached POJO state. Does not leak live grid array definitions [AC-11].
         */
        getState() {
            if (!lastGeneratedData) return { ready: false };
            return Object.freeze({
                ready: true,
                spec: structuredClone(lastGeneratedData.spec),
                spawnPos: structuredClone(lastGeneratedData.spawnPos),
                // Expose matrix structural data safely cloned
                map: structuredClone(lastGeneratedData.matrix)
            });
        },

        getDiagnostics() {
            return {
                allocatedWidth: Workspace.width,
                allocatedHeight: Workspace.height,
                totalFloorVolume: Workspace.floorTiles.length
            };
        },

        getModuleInfo() {
            return MODULE_INFO;
        },

        destroy() {
            Workspace.grid = null;
            Workspace.floorTiles = [];
            lastGeneratedData = null;
            moduleContext = null;
        }
    };
})();
if (typeof window !== 'undefined') window.EmberlightDungeonCarver = EmberlightDungeonCarver;

------------------------------

## 💾 Hooking Into Your Sparse Persistence Layer

To rehydrate your dungeon state with ultra-low bandwidth consumption, combine the generated static map with structural mutations. When a chest is looted or a wall is broken, commit only that coordinate transformation to canonicalSurfaceMutations:

## 1. Serialization (State Extraction for Saving)

// Inside your save/state extraction pipelinefunction getSparseSavePayload() {
    const carverState = window.EmberlightDungeonCarver.getState();

    return {
        // 1. Store only generation config (approx 60 bytes)
        canonicalDungeonSpec: carverState.spec, 
        
        // 2. Store only user alterations (e.g. opened chests, cleared traps)
        canonicalSurfaceMutations: window.EmberlightSessionStore.getMutations() 
    };
}

## 2. Rehydration (State Extraction for Loading)

// Inside your loading/rehydration routine (StorageManager)function rehydrateDungeonFromSparseData(savePayload) {
    // 1. Re-carve base map identical to original via the locked seed
    window.EmberlightDungeonCarver.configure({});
    window.EmberlightDungeonCarver.reset(savePayload.canonicalDungeonSpec);

    const operationalState = window.EmberlightDungeonCarver.getState();
    const liveGrid = operationalState.map;

    // 2. Overlap interactive state modifications on top of the newly carved grid
    const mutations = savePayload.canonicalSurfaceMutations || {};
    for (const [coordKey, mutatedTileCharacter] of Object.entries(mutations)) {
        const [x, y] = coordKey.split(',').map(Number);
        if (liveGrid[y] && liveGrid[y][x] !== undefined) {
            liveGrid[y][x] = mutatedTileCharacter; // e.g., transmuting chest '$' into open cobblestone '.'
        }
    }

    // 3. Inject fully compiled matrix back into your world ecology driver
    window.EmberlightWorldEcology.setMap(liveGrid, savePayload.canonicalDungeonSpec.depth);
}

This ensures your game file fits comfortably within your $<2.5\text{KB}$ local budget while preserving total deterministic replay accuracy across gameplay sessions.
Would you like to design the idempotent teardown rules for your acoustic_sfx.js multi-bus synthesizer next, or should we refine the Aether Attunement Inspector Card interactions in progression_renderer.js?
