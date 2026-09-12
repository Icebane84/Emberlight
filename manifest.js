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

    const { DefaultSettings, SessionConfig, ExplorationConfig } = window._ManifestInternal.Config;
    const { Curves, PartyRoster, Phenotypes, Enemies, Encounters } = window._ManifestInternal.Actors;
    const { Items } = window._ManifestInternal.Items;
    const { AetherEssences, AetherNodes, SkillTrees } = window._ManifestInternal.Progression;
    const { TileLegend, OverworldMap, TownMaps } = window._ManifestInternal.World;
    const { Ailments, Quests, WorldMutations, Shops, Dialogues } = window._ManifestInternal.Narrative;
    const { calculateGearStats, computeCharacterStats, getResolvedMap } = window._ManifestInternal.Calculators;

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

delete window._ManifestInternal;

if (typeof window !== 'undefined') {
    window['EmberlightManifest'] = EmberlightManifest;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmberlightManifest;
}