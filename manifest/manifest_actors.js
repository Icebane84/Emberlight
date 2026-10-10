/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST ACTORS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-ACTORS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {


	const Curves = {
		/**
		 * Pure curve projection calculating total EXP required to achieve target level.
		 * [Pure Query]
		 * @param {number} level - Numerical target level.
		 * @returns {number} Required EXP threshold.
		 */
		expForNextLevel: (level) => Math.max(20, Math.floor(25 * (level ** 1.5) + 10 * level)),
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
			label: 'Hollow Shade Wolf',
			sprite: '🐺⚡',
			baseStats: { hp: 18, atk: 6, def: 2, agi: 6 },
			weakness: 'FIRE',
			resistance: 'ICE',
			targeting: 'RANDOM',
			rewards: { exp: 8, gold: 6 },
			ailmentProc: { id: 'POISON', chance: 0.35, duration: 3 },
		},
		BONE_ARCHER: {
			label: 'Precursor Bone Archer',
			sprite: '🏹⚙️',
			baseStats: { hp: 14, atk: 8, def: 1, agi: 9 },
			weakness: 'HOLY',
			resistance: 'PHYSICAL',
			targeting: 'LOWEST_DEF',
			rewards: { exp: 11, gold: 9 },
		},
		IRON_BRUTE: {
			label: 'Iron Brute Automaton',
			sprite: '⚙️👹',
			baseStats: { hp: 30, atk: 10, def: 6, agi: 3 },
			weakness: 'LIGHTNING',
			resistance: 'PHYSICAL',
			targeting: 'HIGHEST_ATK',
			rewards: { exp: 16, gold: 14 },
		},
		CRYPT_SKELETON: {
			label: 'Catacomb Skeleton Sentinel',
			sprite: '💀⚙️',
			baseStats: { hp: 28, atk: 9, def: 8, agi: 4 },
			weakness: 'HOLY',
			resistance: 'PHYSICAL',
			targeting: 'HIGHEST_ATK',
			rewards: { exp: 24, gold: 18 },
		},
		BLIGHT_SPIDER: {
			label: 'Aether-Spine Blight Spider',
			sprite: '🕷️💎',
			baseStats: { hp: 16, atk: 8, def: 2, agi: 9 },
			weakness: 'FIRE',
			resistance: 'HOLY',
			targeting: 'LOWEST_DEF',
			rewards: { exp: 20, gold: 12 },
			ailmentProc: { id: 'POISON', chance: 0.5, duration: 3 },
		},
		DREAD_ACOLYTE: {
			label: 'Umbral Dread Acolyte',
			sprite: '🧙‍♂️🔮',
			baseStats: { hp: 22, atk: 11, def: 4, agi: 6 },
			weakness: 'HOLY',
			resistance: 'FIRE',
			targeting: 'RANDOM',
			rewards: { exp: 32, gold: 28 },
			ailmentProc: { id: 'BURN', chance: 0.4, duration: 3 },
		},
		CLOCKWORK_SENTRY: {
			label: 'Clockwork Sentry Golem',
			sprite: '⚙️🤖',
			baseStats: { hp: 36, atk: 12, def: 8, agi: 5 },
			weakness: 'ICE',
			resistance: 'PHYSICAL',
			targeting: 'HIGHEST_ATK',
			rewards: { exp: 40, gold: 35 },
		},
		VOLCANO_SALAMANDER: {
			label: 'Magma Salamander',
			sprite: '🦎🔥',
			baseStats: { hp: 26, atk: 13, def: 5, agi: 7 },
			weakness: 'ICE',
			resistance: 'FIRE',
			targeting: 'LOWEST_DEF',
			rewards: { exp: 38, gold: 30 },
			ailmentProc: { id: 'BURN', chance: 0.5, duration: 3 },
		},
		VOID_HERALD: {
			label: 'Abyssal Void Herald',
			sprite: '👁️✨',
			baseStats: { hp: 30, atk: 14, def: 4, agi: 8 },
			weakness: 'HOLY',
			resistance: 'ICE',
			targeting: 'RANDOM',
			rewards: { exp: 48, gold: 42 },
			ailmentProc: { id: 'POISON', chance: 0.45, duration: 3 },
		},
		// --- BOSS: Malakor, The Cinder Revenant / Arch-Core ---
		CINDER_REVENANT: {
			label: 'Malakor, Cinder Arch-Core',
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
		DEFAULT: [ 'SHADE_WOLF', 'BONE_ARCHER', 'IRON_BRUTE' ],
		WOLF_PACK: [ 'SHADE_WOLF', 'SHADE_WOLF' ],
		CRYPT_SANCTUM: [ 'DREAD_ACOLYTE', 'CRYPT_SKELETON' ],
		SPIDER_NEST: [ 'BLIGHT_SPIDER', 'BLIGHT_SPIDER' ],
		CATACOMBS_DEEP: [ 'CRYPT_SKELETON', 'BLIGHT_SPIDER', 'DREAD_ACOLYTE' ],
		STEAM_FOUNDRY: [ 'CLOCKWORK_SENTRY', 'VOLCANO_SALAMANDER' ],
		VOID_VAULT: [ 'VOID_HERALD', 'CLOCKWORK_SENTRY' ],
		BOSS_MALAKOR: [ 'CINDER_REVENANT' ],
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
