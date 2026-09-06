/* =========================================================================
   DISTRICT 1: PROGRESSION & SKILL TREE SYSTEM (VSRP-001 COMPLIANT TENANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-PROGRESSION-CORE
   Protocol Version:    VSRP-001
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightProgression = (() => {
    // --- Formal Lifecycle States ---
    const State = {
        UNCONFIGURED: "UNCONFIGURED",
        CONFIGURED: "CONFIGURED",
        INITIALIZED: "INITIALIZED",
        READY: "READY",
        RUNNING: "RUNNING",
        DESTROYED: "DESTROYED",
    };

    let lifecycleState = State.UNCONFIGURED;

    // --- Host Environment & Locked Configuration ---
    let hostConfig = null;
    let hostContext = null;
    let registry = {};

    // --- Authoritative Working Memory ---
    let sim = null;

    // --- Lifecycle Guard ---
    function assertLifecycle(...allowed) {
        if (!allowed.includes(lifecycleState)) {
            throw new Error(
                `[VSRP-001:progression_core] Lifecycle Violation: Method invoked while in state "${lifecycleState}". ` +
                    `Required: ${allowed.join(" | ")}`,
            );
        }
    }

    // Recursive freeze that preserves executable formulas and functions
    function deepFreeze(obj) {
        if (!obj || typeof obj !== "object") return obj;
        Object.keys(obj).forEach((prop) => {
            if (typeof obj[prop] === "object" && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
                deepFreeze(obj[prop]);
            }
        });
        return Object.freeze(obj);
    }

    function dispatchSFX(sfxName) {
        if (hostContext?.eventBus?.publish) {
            hostContext.eventBus.publish("progression:sfx", { sfx: sfxName });
        } else if (typeof EmberlightAudio !== "undefined" && typeof EmberlightAudio.play === "function") {
            EmberlightAudio.play(sfxName);
        }
    }

    function getManifest() {
        return hostConfig?.manifest || (typeof EmberlightManifest !== "undefined" ? EmberlightManifest : {});
    }

    // Compile immutable skill nodes into local registry (AetherNodes + legacy SkillTrees)
    function compileRegistry(manifestRef) {
        const compiled = {};
        const manifest = manifestRef || getManifest();

        // 1. Ingest Aether Matrix Constellation Nodes
        if (manifest.AetherNodes) {
            Object.entries(manifest.AetherNodes).forEach(([nodeId, rawNode]) => {
                compiled[nodeId] = deepFreeze({ ...rawNode });
            });
        }

        // 2. Ingest Legacy SkillTrees for complete backward compatibility
        if (manifest.SkillTrees) {
            Object.entries(manifest.SkillTrees).forEach(([classKey, branches]) => {
                Object.entries(branches).forEach(([branchKey, nodes]) => {
                    nodes.forEach((rawNode) => {
                        if (!compiled[rawNode.id]) {
                            compiled[rawNode.id] = deepFreeze({
                                ...rawNode,
                                branch: branchKey,
                                classKey,
                                spCost: rawNode.spCost || 1,
                            });
                        }
                    });
                });
            });
        }

        return compiled;
    }

    function createDefaultState() {
        return {
            party: [],
            pendingUnlock: null,
            lastUnlockedNodeId: null,
            selectedEssence: "ALL",
            selectedCharacterId: null,
            selectedNodeId: null,
        };
    }

    // Pure function: Calculate full stats from base, nodes, and gear
    function computeCharacterStats(character, manifestRef) {
        const manifest = manifestRef || getManifest();
        const pheno = manifest.Phenotypes?.[character?.phenotype] || {};
        const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };
        const growth = pheno.growth || { hp: 4, mp: 2, atk: 1, def: 1, agi: 1 };
        const levelGains = Math.max(0, (character?.level || 1) - 1);

        const totals = {
            hp: base.hp + growth.hp * levelGains,
            maxHp: base.hp + growth.hp * levelGains,
            mp: base.mp + growth.mp * levelGains,
            maxMp: base.mp + growth.mp * levelGains,
            atk: base.atk + growth.atk * levelGains,
            def: base.def + growth.def * levelGains,
            agi: base.agi + growth.agi * levelGains,
        };

        const graph = registry || manifest.AetherNodes || {};
        const unlocked = character?.unlockedNodes || character?.unlocked || [];
        unlocked.forEach((nodeId) => {
            const node = graph[nodeId];
            if (node?.statDeltas) {
                Object.entries(node.statDeltas).forEach(([stat, val]) => {
                    totals[stat] = (totals[stat] || 0) + val;
                    if (stat === "hp") totals.maxHp = (totals.maxHp || 0) + val;
                    if (stat === "mp") totals.maxMp = (totals.maxMp || 0) + val;
                });
            }
        });

        if (typeof manifest.calculateGearStats === "function") {
            const gear = manifest.calculateGearStats(character);
            totals.hp += gear.hp;
            totals.maxHp += gear.hp;
            totals.mp += gear.mp;
            totals.maxMp += gear.mp;
            totals.atk += gear.atk;
            totals.def += gear.def;
            totals.agi += gear.agi;
        }

        return totals;
    }

    function evaluateCanUnlock(character, node) {
        if (!character || !node) return false;
        const unlockedList = character.unlockedNodes || character.unlocked || [];
        if (unlockedList.includes(node.id)) return false;

        const availableSP = Math.max(character.skillPoints ?? 0, character.unspentSP ?? 0);
        const requiredSP = node.spCost || 1;
        if (availableSP < requiredSP) return false;

        // 1. Root Constellation Node
        if (node.isRoot) return true;

        // 2. Aether Adjacency Graph: Must connect to an already unlocked neighbor
        if (Array.isArray(node.neighbors) && node.neighbors.length > 0) {
            const unlockedSet = new Set(unlockedList);
            return node.neighbors.some((neighborId) => unlockedSet.has(neighborId));
        }

        // 3. Legacy Tier Fallback
        if (node.branch && node.tier) {
            const spent = character?.spent?.[node.branch] || 0;
            return spent >= node.tier - 1;
        }

        return false;
    }

    function executeUnlock(character, nodeId) {
        const node = registry[nodeId];
        const manifest = getManifest();
        if (!node || !evaluateCanUnlock(character, node)) return false;

        const cost = node.spCost || 1;
        character.skillPoints = Math.max(0, (character.skillPoints ?? 0) - cost);
        character.unspentSP = Math.max(0, (character.unspentSP ?? 0) - cost);

        if (!Array.isArray(character.unlockedNodes)) character.unlockedNodes = [];
        if (!character.unlockedNodes.includes(node.id)) character.unlockedNodes.push(node.id);

        if (!Array.isArray(character.unlocked)) character.unlocked = [];
        if (!character.unlocked.includes(node.id)) character.unlocked.push(node.id);

        if (node.branch) {
            if (!character.spent) character.spent = {};
            character.spent[node.branch] = (character.spent[node.branch] || 0) + 1;
        }

        // Recompute effective stats immediately without data loss
        const newStats = computeCharacterStats(character, manifest);
        const hpRatio = character.maxHp ? character.hp / character.maxHp : 1.0;
        const mpRatio = character.maxMp ? character.mp / character.maxMp : 1.0;
        Object.assign(character, newStats);
        character.hp = Math.max(1, Math.min(character.maxHp, Math.round(character.maxHp * hpRatio)));
        character.mp = Math.max(0, Math.min(character.maxMp, Math.round(character.maxMp * mpRatio)));

        dispatchSFX("SELECT");

        if (hostContext?.eventBus?.publish) {
            hostContext.eventBus.publish("progression:node_unlocked", {
                characterId: character.id,
                nodeId: node.id,
                essence: node.essence || node.branch,
                remainingPoints: character.skillPoints ?? character.unspentSP,
            });
        }

        return true;
    }

    function respecCharacter(character) {
        if (!character) return false;
        const manifest = getManifest();
        let refundedSP = 0;

        const unlockedList = character.unlockedNodes || character.unlocked || [];
        unlockedList.forEach((nodeId) => {
            const node = registry[nodeId] || manifest.AetherNodes?.[nodeId];
            refundedSP += node?.spCost || 1;
        });

        character.skillPoints = (character.skillPoints ?? 0) + refundedSP;
        character.unspentSP = (character.unspentSP ?? 0) + refundedSP;
        character.unlockedNodes = [];
        character.unlocked = [];
        character.spent = {};

        const cleanStats = computeCharacterStats(character, manifest);
        Object.assign(character, cleanStats);
        character.hp = cleanStats.maxHp;
        character.mp = cleanStats.maxMp;

        dispatchSFX("HEAL");

        if (hostContext?.eventBus?.publish) {
            hostContext.eventBus.publish("progression:respec_completed", {
                characterId: character.id,
                refundedSP,
            });
        }

        return true;
    }

    // --- Canonical Interface Export ---
    const api = {
        configure(config) {
            assertLifecycle(State.UNCONFIGURED);
            if (!config || typeof config !== "object") {
                throw new TypeError(
                    "[VSRP-001:progression_core] configure() requires a non-null configuration dictionary.",
                );
            }
            hostConfig = deepFreeze({ ...config });
            registry = compileRegistry(hostConfig.manifest);
            lifecycleState = State.CONFIGURED;
        },

        init(context) {
            assertLifecycle(State.CONFIGURED);
            hostContext = context;
            lifecycleState = State.INITIALIZED;
        },

        reset(stateSnapshot) {
            assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

            const baseline = createDefaultState();
            const incoming = stateSnapshot ? structuredClone(stateSnapshot) : {};

            // Resolved nested ternary into explicit statements to satisfy SonarQube
            let resolvedParty = [];
            if (Array.isArray(incoming.party)) {
                resolvedParty = incoming.party;
            } else if (Array.isArray(incoming)) {
                resolvedParty = incoming;
            }

            sim = {
                ...baseline,
                ...incoming,
                party: resolvedParty,
            };

            lifecycleState = State.READY;
        },

        update(dt, context) {
            assertLifecycle(State.READY, State.RUNNING);
            lifecycleState = State.RUNNING;

            const activeCtx = context || hostContext;

            if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
                for (const element of activeCtx.inputs) {
                    this.handleHostAction(element);
                }
            }
        },

        render(renderer, _context) {
            // Support legacy array direct-pass fallback or isolated peripheral renderer delegation
            if (Array.isArray(renderer)) {
                if (
                    typeof EmberlightProgressionRenderer !== "undefined" &&
                    typeof EmberlightProgressionRenderer.renderProgression === "function"
                ) {
                    if (!sim) sim = createDefaultState();
                    sim.party = renderer;
                    EmberlightProgressionRenderer.renderProgression(this.getState(), (action) =>
                        this.handleHostAction(action),
                    );
                }
                return;
            }

            assertLifecycle(State.READY, State.RUNNING);
            const activeRenderer =
                renderer ||
                hostContext?.progressionRenderer ||
                (typeof EmberlightProgressionRenderer !== "undefined" ? EmberlightProgressionRenderer : null);
            if (activeRenderer && typeof activeRenderer.renderProgression === "function") {
                activeRenderer.renderProgression(this.getState(), (action) => this.handleHostAction(action));
            }
        },

        getState() {
            assertLifecycle(State.READY, State.RUNNING);
            return structuredClone(sim);
        },

        getDiagnostics() {
            if (lifecycleState === State.DESTROYED) {
                throw new Error("[VSRP-001:progression_core] Cannot read diagnostics on a DESTROYED instance.");
            }
            return {
                moduleId: "progression_core",
                lifecycleState,
                registeredNodeCount: Object.keys(registry).length,
                trackedPartyCount: sim?.party?.length || 0,
            };
        },

        getModuleInfo() {
            return {
                moduleId: "progression_core",
                version: "2.0.0",
                protocolVersion: "VSRP-001",
                dependencies: ["manifest"],
                capabilities: ["progression", "events.progression_node_unlocked", "events.progression_sfx"],
            };
        },

        destroy() {
            if (lifecycleState === State.DESTROYED) return;
            sim = null;
            hostConfig = null;
            hostContext = null;
            registry = {};
            lifecycleState = State.DESTROYED;
        },

        // --- Action Processing with Reduced Cognitive Complexity ---
        handleHostAction(action) {
            if (!action || !sim) return;
            const type = typeof action === "string" ? action : action.type;

            const handlers = {
                UNLOCK_NODE: () => {
                    if (action.characterId && action.nodeId) {
                        const character = sim.party.find((c) => c.id === action.characterId);
                        if (character && executeUnlock(character, action.nodeId)) {
                            sim.lastUnlockedNodeId = action.nodeId;
                        }
                    }
                },
                RESPEC_CHARACTER: () => {
                    if (action.characterId) {
                        const character = sim.party.find((c) => c.id === action.characterId);
                        if (character) respecCharacter(character);
                    }
                },
                SELECT_CHARACTER: () => {
                    sim.selectedCharacterId = action.characterId;
                    sim.selectedNodeId = null;
                },
                SELECT_ESSENCE: () => {
                    sim.selectedEssence = action.essence;
                },
                SELECT_NODE: () => {
                    sim.selectedNodeId = action.nodeId;
                },
            };

            if (handlers[type]) {
                handlers[type]();
            }

            this.render();
        },
    };

    return api;
})();

if (typeof window !== "undefined") {
    window.EmberlightProgression = EmberlightProgression;
}
