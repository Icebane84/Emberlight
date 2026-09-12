/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST ACTORS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-ACTORS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	const Curves = {
		/**
		 * Pure curve projection calculating total EXP required to achieve target level.
		 * [Pure Query]
		 * @param {number} level - Numerical target level.
		 * @returns {number} Required EXP threshold.
		 */
		expForNextLevel: (level) => Math.round(20 * level ** 1.4),
	};

	const PartyRoster = [
		{ instanceId: 'hero', name: 'Aldric', phenotype: 'HERO' },
		{ instanceId: 'warrior', name: 'Brogan', phenotype: 'WARRIOR' },
		{ instanceId: 'mage', name: 'Selene', phenotype: 'MAGE' },
		{ instanceId: 'healer', name: 'Wren', phenotype: 'HEALER' },
	];

	const Phenotypes = {
		HERO: {
			label: 'Hero',
			baseStats: { hp: 32, mp: 12, atk: 9, def: 5, agi: 7 },
			growth: { hp: 6, mp: 2, atk: 2, def: 1, agi: 1 },
		},
		WARRIOR: {
			label: 'Warrior',
			baseStats: { hp: 44, mp: 4, atk: 12, def: 8, agi: 5 },
			growth: { hp: 9, mp: 1, atk: 3, def: 2, agi: 1 },
		},
		MAGE: {
			label: 'Mage',
			baseStats: { hp: 20, mp: 24, atk: 4, def: 2, agi: 8 },
			growth: { hp: 3, mp: 5, atk: 1, def: 1, agi: 2 },
		},
		HEALER: {
			label: 'Healer',
			baseStats: { hp: 24, mp: 20, atk: 5, def: 3, agi: 6 },
			growth: { hp: 4, mp: 4, atk: 1, def: 1, agi: 1 },
		},
	};

	const Enemies = {
		SHADE_WOLF: {
			label: 'Shade Wolf',
			sprite: '🐺',
			baseStats: { hp: 18, atk: 6, def: 2, agi: 6 },
			weakness: 'FIRE',
			resistance: 'ICE',
			targeting: 'RANDOM',
			rewards: { exp: 8, gold: 6 },
			ailmentProc: { id: 'POISON', chance: 0.35, duration: 3 },
		},
		BONE_ARCHER: {
			label: 'Bone Archer',
			sprite: '🏹',
			baseStats: { hp: 14, atk: 8, def: 1, agi: 9 },
			weakness: 'HOLY',
			resistance: 'PHYSICAL',
			targeting: 'LOWEST_DEF',
			rewards: { exp: 11, gold: 9 },
		},
		IRON_BRUTE: {
			label: 'Iron Brute',
			sprite: '👹',
			baseStats: { hp: 30, atk: 10, def: 6, agi: 3 },
			weakness: 'LIGHTNING',
			resistance: 'PHYSICAL',
			targeting: 'HIGHEST_ATK',
			rewards: { exp: 16, gold: 14 },
		},
		CRYPT_SKELETON: {
			label: 'Crypt Skeleton',
			sprite: '💀',
			baseStats: { hp: 28, atk: 9, def: 8, agi: 4 },
			weakness: 'HOLY',
			resistance: 'PHYSICAL',
			targeting: 'HIGHEST_ATK',
			rewards: { exp: 24, gold: 18 },
		},
		BLIGHT_SPIDER: {
			label: 'Blight Spider',
			sprite: '🕷',
			baseStats: { hp: 16, atk: 8, def: 2, agi: 9 },
			weakness: 'FIRE',
			resistance: 'HOLY',
			targeting: 'LOWEST_DEF',
			rewards: { exp: 20, gold: 12 },
			ailmentProc: { id: 'POISON', chance: 0.5, duration: 3 },
		},
		DREAD_ACOLYTE: {
			label: 'Dread Acolyte',
			sprite: '🧙‍♂️',
			baseStats: { hp: 22, atk: 11, def: 4, agi: 6 },
			weakness: 'HOLY',
			resistance: 'FIRE',
			targeting: 'RANDOM',
			rewards: { exp: 32, gold: 28 },
			ailmentProc: { id: 'BURN', chance: 0.4, duration: 3 },
		},
		// --- BOSS: Malakor, The Cinder Revenant ---
		CINDER_REVENANT: {
			label: 'Malakor, Cinder Revenant',
			sprite: '🔥💀',
			isBoss: true,
			baseStats: { hp: 160, atk: 15, def: 10, agi: 5 },
			weakness: 'ICE',
			resistance: 'FIRE',
			phaseTwoThreshold: 0.5,
			phaseTwoStats: { sprite: '🌋', atk: 19, def: 5, agi: 9 },
			targeting: 'ROTATION',
			rewards: { exp: 150, gold: 200, item: 'CINDER_CORE' },
			rotation: [
				{
					type: 'CLEAVE_TWO',
					power: 1.3,
					label: 'Hellfire Cleave',
					sfx: 'ATTACK_HIT',
				},
				{ type: 'STUN_LOWEST', label: 'Ashen Choke', sfx: 'SPELL_BOLT' },
				{
					type: 'AOE_ALL',
					power: 1.1,
					label: 'Cataclysm Supernova',
					sfx: 'SPELL_BOLT',
				},
			],
			ailmentProc: { id: 'BURN', chance: 0.45, duration: 3 },
		},
	};

	const Encounters = {
		DEFAULT: ['SHADE_WOLF', 'BONE_ARCHER', 'IRON_BRUTE'],
		WOLF_PACK: ['SHADE_WOLF', 'SHADE_WOLF'],
		CRYPT_SANCTUM: ['DREAD_ACOLYTE', 'CRYPT_SKELETON'],
		SPIDER_NEST: ['BLIGHT_SPIDER', 'BLIGHT_SPIDER'],
		CATACOMBS_DEEP: ['CRYPT_SKELETON', 'BLIGHT_SPIDER', 'DREAD_ACOLYTE'],
		BOSS_MALAKOR: ['CINDER_REVENANT'],
	};

	const Actors = {
		Curves,
		PartyRoster,
		Phenotypes,
		Classes: Phenotypes,
		Enemies,
		Encounters,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Actors = Actors;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Actors;
	}
})();
