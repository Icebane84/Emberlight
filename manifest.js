/* cSpell:words VSRP KNOCKBACK unsubs targetable Oakhaven Torvald Malakor catacomb Cataclysm miasma portcullis */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DECLARATIVE STATIC DATA MANIFEST (FACADE)
 * Document Identifier: VSRP-001-DATA-MANIFEST
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-MANIFEST-001
 * Authority:           Host SSOT
 * ============================================================================
 */

const EmberlightManifest = (() => {
    'use strict';

    const root = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis);
    let internal = root._ManifestInternal;
    if (!internal && typeof require === 'function') {
        try {
            internal = {
                Config: require('./manifest/manifest_config.js'),
                Actors: require('./manifest/manifest_actors.js'),
                Items: require('./manifest/manifest_items.js'),
                Progression: require('./manifest/manifest_progression.js'),
                World: require('./manifest/manifest_world.js'),
                Narrative: require('./manifest/manifest_narrative.js'),
                Calculators: require('./manifest/manifest_calculators.js'),
            };
        } catch (_) {}
    }
    internal = internal || {};
    const { DefaultSettings, SessionConfig, ExplorationConfig } = internal.Config || {};
    const { Curves, PartyRoster, Phenotypes, Enemies, Encounters } = internal.Actors || {};
    const { Items } = internal.Items || {};
    const { AetherEssences, AetherNodes, SkillTrees } = internal.Progression || {};
    const { TileLegend, OverworldMap, TownMaps } = internal.World || {};
    const { Ailments, Quests, WorldMutations, Shops, Dialogues } = internal.Narrative || {};
    const { calculateGearStats, computeCharacterStats, getResolvedMap } = internal.Calculators || {};

    const manifest = {
        schemaVersion: '1.2.0',
        protocolVersion: 'VSRP-001',
        DefaultSettings,
        SessionConfig,
        ExplorationConfig,
        Curves,
        PartyRoster,
        Phenotypes,
        Items,
        Enemies,
        Encounters,
        AetherEssences,
        AetherNodes,
        SkillTrees,
        TileLegend,
        OverworldMap,
        TownMaps,
        Ailments,
        Quests,
        WorldMutations,
        Shops,
        Dialogues,
        calculateGearStats,
        computeCharacterStats,
        getResolvedMap,
    };

    manifest.Classes = manifest.Phenotypes;

    /**
     * Recursively freezes an object tree to guarantee strict runtime immutability[cite: 10].
     * @template T
     * @param {T} obj - Object graph to seal.
     * @returns {Readonly<T>} Immutable reference to sealed object graph.
     */
    function deepFreeze(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        Object.keys(obj).forEach((prop) => {
            const val = /** @type {Record<string, any>} */ (obj)[prop];
            if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
                deepFreeze(val);
            }
        });
        return Object.freeze(obj);
    }

    return deepFreeze(manifest);
})();

if (typeof window !== 'undefined') {
    delete window._ManifestInternal;
    window['EmberlightManifest'] = EmberlightManifest;
} else if (typeof global !== 'undefined') {
    delete global._ManifestInternal;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmberlightManifest;
}