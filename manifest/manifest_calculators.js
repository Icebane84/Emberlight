/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST CALCULATORS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-CALCULATORS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	function getManifestSSOT() {
		if (typeof EmberlightManifest !== 'undefined') return EmberlightManifest;
		if (typeof window !== 'undefined' && window.EmberlightManifest) return window.EmberlightManifest;
		if (typeof globalThis !== 'undefined' && globalThis.EmberlightManifest) return globalThis.EmberlightManifest;
		if (typeof window !== 'undefined' && window._ManifestInternal) {
			const int = window._ManifestInternal;
			return { ...int.Config, ...int.Actors, ...int.Items, ...int.Progression, ...int.World, ...int.Narrative, ...int.Calculators };
		}
		return {};
	}

	function calculateGearStats(character) {
		const manifest = (typeof this !== 'undefined' && this && this.Items) ? this : getManifestSSOT();
		/** @type {BaseStats} */
		const totals = { hp: 0, mp: 0, atk: 0, def: 0, agi: 0 };
		if (!character?.equipment) return totals;

		/** @type {Array<'weapon'|'armor'|'accessory'>} */
		const slots = ['weapon', 'armor', 'accessory'];
		slots.forEach((slotKey) => {
			const equippedId = character.equipment?.[slotKey];
			if (equippedId && manifest.Items?.[equippedId]?.statDeltas) {
				const deltas = manifest.Items[equippedId].statDeltas;
				if (deltas) {
					Object.entries(deltas).forEach(([stat, val]) => {
						if (typeof val === 'number') {
							const key = /** @type {keyof BaseStats} */ (stat);
							totals[key] = (totals[key] || 0) + val;
						}
					});
				}
			}
		});
		return totals;
	}

	function computeCharacterStats(character) {
		const manifest = (typeof this !== 'undefined' && this && this.Phenotypes) ? this : getManifestSSOT();
		const phenoKey = character?.phenotype || 'HERO';
		/** @type {{ label?: string, baseStats?: BaseStats, growth?: BaseStats }} */
		const pheno = manifest.Phenotypes?.[phenoKey] || {};
		const base = pheno.baseStats || {
			hp: 30,
			mp: 10,
			atk: 8,
			def: 5,
			agi: 5,
		};
		const growth = pheno.growth || { hp: 4, mp: 2, atk: 1, def: 1, agi: 1 };
		const levelGains = Math.max(0, (character?.level || 1) - 1);

		/** @type {CharacterStats} */
		const totals = {
			hp: base.hp + growth.hp * levelGains,
			maxHp: base.hp + growth.hp * levelGains,
			mp: (base.mp || 0) + growth.mp * levelGains,
			maxMp: (base.mp || 0) + growth.mp * levelGains,
			atk: base.atk + growth.atk * levelGains,
			def: base.def + growth.def * levelGains,
			agi: base.agi + growth.agi * levelGains,
		};

		const graph = manifest.AetherNodes || {};
		const unlocked = character?.unlockedNodes || character?.unlocked || [];
		unlocked.forEach((nodeId) => {
			const node = graph[nodeId];
			if (node?.statDeltas) {
				Object.entries(node.statDeltas).forEach(([stat, val]) => {
					if (typeof val === 'number') {
						const key = /** @type {'hp'|'mp'|'atk'|'def'|'agi'} */ (stat);
						if (key === 'hp') {
							totals.hp += val;
							totals.maxHp += val;
						} else if (key === 'mp') {
							totals.mp += val;
							totals.maxMp += val;
						} else if (key === 'atk') {
							totals.atk += val;
						} else if (key === 'def') {
							totals.def += val;
						} else if (key === 'agi') {
							totals.agi += val;
						}
					}
				});
			}
		});

		const gear = manifest.calculateGearStats(character);
		totals.hp += Number(gear.hp || 0);
		totals.maxHp += Number(gear.hp || 0);
		totals.mp += Number(gear.mp || 0);
		totals.maxMp += Number(gear.mp || 0);
		totals.atk += Number(gear.atk || 0);
		totals.def += Number(gear.def || 0);
		totals.agi += Number(gear.agi || 0);

		return totals;
	}

	function getResolvedMap(baseMap, flags = {}) {
		const manifest = (typeof this !== 'undefined' && this && this.WorldMutations) ? this : getManifestSSOT();
		if (!baseMap || !Array.isArray(baseMap)) return baseMap;
		const resolved = baseMap.map((row) => [...row]);
		const mutations = manifest.WorldMutations || [];
		mutations.forEach((mutation) => {
			if (mutation.flag && flags[mutation.flag]) {
				const { targetX, targetY, replacementTile } = mutation;
				if (targetX !== undefined && targetY !== undefined && replacementTile !== undefined) {
					if (resolved[targetY]?.[targetX] !== undefined) {
						resolved[targetY][targetX] = replacementTile;
					}
				}
			}
			if (mutation.requiresFlags) {
				const match = Object.entries(mutation.requiresFlags).every(
					([f, expected]) => flags[f] === expected
				);
				if (match && Array.isArray(mutation.overrides)) {
					mutation.overrides.forEach(({ x, y, tile }) => {
						if (resolved[y]?.[x] !== undefined) {
							resolved[y][x] = tile;
						}
					});
				}
			}
		});
		return resolved;
	}

	const Calculators = {
		calculateGearStats,
		computeCharacterStats,
		getResolvedMap,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Calculators = Calculators;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Calculators;
	}
})();
