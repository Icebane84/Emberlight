/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST ITEMS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-ITEMS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {

	const Items = {
		// Consumables
		POTION: {
			id: 'POTION',
			label: 'Distilled Vitality Quicksilver',
			shortLabel: 'Quicksilver',
			desc: 'Restores 25 VIT',
			cost: 15,
			targetType: 'ally_alive',
			/**
			 * Applies vital restoration delta directly to target character snapshot.
			 * [State Mutating]
			 * @param {CharacterSnapshot} target - Target character object.
			 * @returns {string} Battle log text snippet.
			 */
			effect(target) {
				const curHp = target.hp || 0;
				const maxHp = target.maxHp || 30;
				const healed = Math.min(25, maxHp - curHp);
				target.hp = curHp + healed;
				return `restoring ${healed} VIT!`;
			},
		},
		ETHER: {
			id: 'ETHER',
			label: 'Lapis Aether Drop',
			shortLabel: 'Lapis Drop',
			desc: 'Restores 15 AET',
			cost: 20,
			targetType: 'ally_alive',
			/**
			 * Applies mana restoration delta directly to target character snapshot.
			 * [State Mutating]
			 * @param {CharacterSnapshot} target - Target character object.
			 * @returns {string} Battle log text snippet.
			 */
			effect(target) {
				const curMp = target.mp || 0;
				const maxMp = target.maxMp || 10;
				const restored = Math.min(15, maxMp - curMp);
				target.mp = curMp + restored;
				return `restoring ${restored} AET!`;
			},
		},
		PHOENIX_EMBER: {
			id: 'PHOENIX_EMBER',
			label: 'Hearth-Spire Phoenix Ember',
			shortLabel: 'Phoenix Ember',
			desc: 'Re-tethers fallen with 50% VIT',
			cost: 45,
			targetType: 'ally_dead',
			/**
			 * Revives fallen entity and restores 50% maximum hit points.
			 * [State Mutating]
			 * @param {CharacterSnapshot & { alive?: boolean }} target - Target character object.
			 * @returns {string} Battle log text snippet.
			 */
			effect(target) {
				target.alive = true;
				const maxHp = target.maxHp || 30;
				target.hp = Math.max(1, Math.round(maxHp * 0.5));
				return `arc-welding their tether back with ${target.hp} VIT!`;
			},
		},

		// Weapons
		IRON_SWORD: {
			id: 'IRON_SWORD',
			label: 'Cold-Rolled Iron Blade',
			desc: '+5 ATK',
			slot: 'weapon',
			requirements: { atk: 6 },
			allowedPhenotypes: [ 'HERO', 'WARRIOR' ],
			statDeltas: { atk: 5 },
			cost: 30,
		},
		OAK_STAFF: {
			id: 'OAK_STAFF',
			label: 'Quartz-Focus Staff',
			desc: '+2 ATK, +6 AET',
			slot: 'weapon',
			requirements: { mp: 12 },
			allowedPhenotypes: [ 'MAGE', 'HEALER' ],
			statDeltas: { atk: 2, mp: 6 },
			cost: 25,
		},

		// Armor
		CHAIN_VEST: {
			id: 'CHAIN_VEST',
			label: 'Copper-Mesh Vest',
			desc: '+4 DEF, +8 VIT',
			slot: 'armor',
			requirements: { def: 4, hp: 25 },
			allowedPhenotypes: [ 'HERO', 'WARRIOR' ],
			statDeltas: { def: 4, hp: 8 },
			cost: 40,
		},
		CHAINMAIL: {
			id: 'CHAINMAIL',
			label: 'Grounded Chain Harness',
			desc: '+5 DEF, +12 VIT',
			slot: 'armor',
			requirements: { def: 6, hp: 35 },
			allowedPhenotypes: [ 'HERO', 'WARRIOR' ],
			statDeltas: { def: 5, hp: 12 },
			cost: 90,
		},
		MAGE_ROBE: {
			id: 'MAGE_ROBE',
			label: 'Filigree Spellweave Robe',
			desc: '+2 DEF, +10 AET',
			slot: 'armor',
			requirements: { mp: 14 },
			allowedPhenotypes: [ 'MAGE', 'HEALER' ],
			statDeltas: { def: 2, mp: 10 },
			cost: 35,
		},

		// Accessories
		SWIFT_RING: {
			id: 'SWIFT_RING',
			label: 'Galvanic Capacitor Ring',
			desc: '+3 AGI',
			slot: 'accessory',
			requirements: { agi: 4 },
			allowedPhenotypes: [ 'HERO', 'WARRIOR', 'MAGE', 'HEALER' ],
			statDeltas: { agi: 3 },
			cost: 50,
		},
		// Legendary Boss Relic
		CINDER_CORE: {
			id: 'CINDER_CORE',
			label: 'Cinder Core',
			desc: '+8 ATK, +6 DEF, +10 Max VIT',
			slot: 'accessory',
			requirements: { level: 2 },
			allowedPhenotypes: [ 'HERO', 'WARRIOR', 'MAGE', 'HEALER' ],
			statDeltas: { atk: 8, def: 6, hp: 10 },
			cost: 250,
		},
	};

	const ItemsModule = {
		Items,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Items = ItemsModule;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = ItemsModule;
	}
})();
