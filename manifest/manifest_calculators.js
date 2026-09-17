/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST CALCULATORS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-CALCULATORS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	function getManifestSSOT() {
		if (typeof window !== 'undefined' && window.EmberlightManifest) return window.EmberlightManifest;
		if (typeof globalThis !== 'undefined' && (/** @type {any} */ (globalThis)).EmberlightManifest) return (/** @type {any} */ (globalThis)).EmberlightManifest;
		if (typeof window !== 'undefined' && window._ManifestInternal) {
			const int = /** @type {Record<string, Record<string, any>>} */ (window._ManifestInternal);
			return { ...int.Config, ...int.Actors, ...int.Items, ...int.Progression, ...int.World, ...int.Narrative, ...int.Calculators };
		}
		return {};
	}

	/**
	 * @this {any}
	 * @param {{equipment?: Record<string, any>}} character
	 * @returns {BaseStats}
	 */
	function calculateGearStats(character) {
		const manifest = (this && this.Items) ? this : getManifestSSOT();
		/** @type {Record<string, number>} */
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
							totals[stat] = (totals[stat] || 0) + val;
						}
					});
				}
			}
		});
		return totals;
	}

	/**
	 * @this {any}
	 * @param {{phenotype?: string; level?: number; unlockedNodes?: any[]; unlocked?: any[]; equipment?: Record<string, any>}} character
	 * @returns {CharacterStats}
	 */
	function computeCharacterStats(character) {
		const manifest = (this && this.Phenotypes) ? this : getManifestSSOT();
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

		const baseHp = base.hp ?? 30;
		const baseMp = base.mp ?? 10;
		const baseAtk = base.atk ?? 8;
		const baseDef = base.def ?? 5;
		const baseAgi = base.agi ?? 5;

		const growthHp = growth.hp ?? 4;
		const growthMp = growth.mp ?? 2;
		const growthAtk = growth.atk ?? 1;
		const growthDef = growth.def ?? 1;
		const growthAgi = growth.agi ?? 1;

		/** @type {CharacterStats} */
		const totals = {
			hp: baseHp + growthHp * levelGains,
			maxHp: baseHp + growthHp * levelGains,
			mp: baseMp + growthMp * levelGains,
			maxMp: baseMp + growthMp * levelGains,
			atk: baseAtk + growthAtk * levelGains,
			def: baseDef + growthDef * levelGains,
			agi: baseAgi + growthAgi * levelGains,
		};

		const graph = manifest.AetherNodes || {};
		const unlocked = character?.unlockedNodes || character?.unlocked || [];
		unlocked.forEach((/** @type {string | number} */ nodeId) => {
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

	/**
	 * @this {any}
	 * @param {string[][] | any} baseMap - 2D tile map array.
	 * @param {Record<string, any>} [flags] - Story/world flags dictionary.
	 * @returns {string[][] | any} Resolved map with active mutations applied.
	 */
	function getResolvedMap(baseMap, flags = {}) {
		const manifest = (this && this.WorldMutations) ? this : getManifestSSOT();
		if (!baseMap || !Array.isArray(baseMap)) return baseMap;
		const resolved = baseMap.map((row) => [...row]);
		const mutations = manifest.WorldMutations || [];
		mutations.forEach((/** @type {any} */ mutation) => {
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
					mutation.overrides.forEach((/** @type {{ x: number, y: number, tile: string }} */ { x, y, tile }) => {
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
