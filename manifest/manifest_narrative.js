/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST NARRATIVE SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-NARRATIVE
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {


	const Ailments = {
		POISON: {
			id: 'POISON',
			label: 'Poison',
			type: 'dot',
			/**
			 * Computes and applies turn damage tick for Poison.
			 * [State Mutating]
			 * @param {CharacterSnapshot} target - Target character or enemy entity.
			 * @returns {{ dmg: number, msg: string }} Tick resolution envelope.
			 */
			tick(target) {
				const maxHp = target.maxHp || 30;
				const curHp = target.hp !== undefined ? target.hp : maxHp;
				const dmg = Math.max(1, Math.round(maxHp * 0.08));
				target.hp = Math.max(0, curHp - dmg);
				return { dmg, msg: `${target.name || 'Entity'} suffered ${dmg} poison damage!` };
			},
		},
		BURN: {
			id: 'BURN',
			label: 'Burn',
			type: 'dot',
			/**
			 * Computes and applies turn damage tick for Burn.
			 * [State Mutating]
			 * @param {CharacterSnapshot} target - Target character or enemy entity.
			 * @returns {{ dmg: number, msg: string }} Tick resolution envelope.
			 */
			tick(target) {
				const dmg = 4;
				const curHp = target.hp !== undefined ? target.hp : (target.maxHp || 30);
				target.hp = Math.max(0, curHp - dmg);
				return { dmg, msg: `${target.name || 'Entity'} burned for ${dmg} damage!` };
			},
		},
		STUN: {
			id: 'STUN',
			label: 'Stun',
			type: 'skip_turn',
			/**
			 * Produces turn notification when an entity is stunned.
			 * [Pure Query]
			 * @param {CharacterSnapshot} target - Stunned character or enemy entity.
			 * @returns {{ msg: string }} Notification payload.
			 */
			tick(target) {
				return { msg: `${target.name || 'Entity'} is stunned and cannot move!` };
			},
		},
	};

	const Quests = {
		SHADE_WOLF_HUNT: {
			id: 'SHADE_WOLF_HUNT',
			title: 'Trouble in the Tall Grass',
			stages: {
				0: {
					desc: 'Speak with Elder Oakhaven near the village entrance.',
					completed: false,
				},
				1: {
					desc: 'Defeat the Shade Wolf pack in the south meadows.',
					completed: false,
				},
				2: {
					desc: 'Report back to Elder Oakhaven for your reward.',
					completed: false,
				},
				3: {
					desc: 'Quest Complete. The southern roads are secure.',
					completed: true,
				},
			},
			rewards: { gold: 50, exp: 40, item: 'SWIFT_RING' },
		},
		CRYPT_KEY_SEARCH: {
			id: 'CRYPT_KEY_SEARCH',
			title: 'The Sealed Pass',
			stages: {
				0: {
					desc: 'An iron gate blocks the mountain pass. Search the southern trail for an old chest.',
					completed: false,
				},
				1: {
					desc: 'Defeat the guardians guarding the crypt key.',
					completed: false,
				},
				2: {
					desc: 'Unlock the crypt pass and report back to Elder Rowan.',
					completed: false,
				},
				3: {
					desc: 'Quest Complete. The eastern passage is open.',
					completed: true,
				},
			},
			rewards: { gold: 80, exp: 60, item: 'CHAINMAIL' },
		},
		SLAY_MALAKOR: {
			id: 'SLAY_MALAKOR',
			title: 'The Cinder Cataclysm',
			stages: {
				0: {
					desc: 'Locate the descent into the Crypt Sanctum (⛩).',
					completed: false,
				},
				1: {
					desc: 'Vanquish Malakor, The Cinder Revenant, and claim his Cinder Core.',
					completed: false,
				},
				2: {
					desc: 'Malakor is slain! The catacomb fires have been extinguished.',
					completed: true,
				},
			},
			rewards: { gold: 200, exp: 150, item: 'CINDER_CORE' },
		},
		FORGE_SABOTAGE: {
			id: 'FORGE_SABOTAGE',
			title: 'The Missing Crucible Iron',
			stages: {
				0: {
					desc: "Torvald's refined ore has been stolen. Search the town back alleys.",
					completed: false,
				},
				1: {
					desc: "Pick the lock on the smuggler's strongbox behind the Relic Crucible.",
					completed: false,
				},
				2: {
					desc: 'Return the refined crucible iron to Torvald the Blacksmith.',
					completed: false,
				},
				3: {
					desc: "Quest Complete. Torvald's supply is restored.",
					completed: true,
				},
			},
			rewards: { gold: 60, exp: 50, item: 'CHAINMAIL' },
		},
		SANCTUARY_PLAGUE: {
			id: 'SANCTUARY_PLAGUE',
			title: 'Blight in the Sanctuary',
			stages: {
				0: {
					desc: 'Tend to the afflicted scout resting at the town sanctuary camp.',
					completed: false,
				},
				1: {
					desc: 'Provide an Ether Vial or cast Holy Healing to neutralize the poison.',
					completed: false,
				},
				2: {
					desc: 'Quest Complete. The scout will survive.',
					completed: true,
				},
			},
			rewards: { gold: 40, exp: 45, item: 'SWIFT_RING' },
		},
	};

	const WorldMutations = [
		{
			id: 'BRIDGE_REPAIR',
			requiresFlags: { QUEST_WOLVES_ACCEPTED: true },
			overrides: [ { x: 4, y: 1, tile: '.' } ],
		},
		{
			id: 'GATE_UNLOCK',
			requiresFlags: { unlocked_crypt_gate: true },
			overrides: [ { x: 9, y: 4, tile: '.' } ],
		},
		{
			id: 'LOOT_CHEST',
			requiresFlags: { looted_crypt_chest: true },
			overrides: [ { x: 9, y: 8, tile: '.' } ],
		},
		{
			id: 'LOOT_OAKHAVEN_CHEST',
			requiresFlags: { looted_oakhaven_iron: true },
			overrides: [ { x: 7, y: 1, tile: '.' } ],
		},
		{
			id: 'SOUTH_GATE_UNLOCK',
			requiresFlags: { unlocked_south_portcullis: true },
			overrides: [ { x: 23, y: 24, tile: '/' } ],
		},
	];

	const Shops = {
		VILLAGE_BLACKSMITH: {
			id: 'VILLAGE_BLACKSMITH',
			label: 'Oakhaven Armory & Forge',
			merchantName: 'Torvald the Smith',
			buyRate: 1.0,
			sellRate: 0.5,
			stock: [
				{ itemId: 'POTION', maxQuantity: 10 },
				{ itemId: 'ETHER', maxQuantity: 5 },
				{ itemId: 'IRON_SWORD', maxQuantity: 2 },
				{ itemId: 'OAK_STAFF', maxQuantity: 2 },
				{ itemId: 'CHAIN_VEST', maxQuantity: 1 },
				{ itemId: 'CHAINMAIL', maxQuantity: 1 },
				{ itemId: 'MAGE_ROBE', maxQuantity: 1 },
				{ itemId: 'SWIFT_RING', maxQuantity: 1 },
			],
		},
		WANDERING_CARAVAN: {
			id: 'WANDERING_CARAVAN',
			label: 'The Nomadic Outpost',
			merchantName: 'Balthazar the Wanderer',
			buyRate: 1.1,
			sellRate: 0.65,
			stock: [
				{ itemId: 'ETHER', maxQuantity: 8 },
				{ itemId: 'PHOENIX_EMBER', maxQuantity: 3 },
				{ itemId: 'SWIFT_RING', maxQuantity: 2 },
				{ itemId: 'CHAINMAIL', maxQuantity: 1 },
			],
		},
	};

	const Dialogues = {
		VILLAGE_ELDER: {
			id: 'VILLAGE_ELDER',
			speaker: 'Elder Oakhaven',
			nodes: [
				{
					id: 'start',
					text: 'Greetings, {leader}. Our scouts report {potions} supplies in your pouch and {gold} gold in your purse.',
					redirects: [
						{ requireFlag: 'boss_slain', target: 'boss_dead' },
						{ requireFlag: 'QUEST_WOLVES_COMPLETED', target: 'completed' },
						{
							requireQuestStage: { questId: 'SHADE_WOLF_HUNT', minStage: 1 },
							target: 'in_progress',
						},
					],
					next: 'ask_help',
				},
				{
					id: 'ask_help',
					text: 'Will your party of {partyCount} venture into the tall grass to secure the road?',
					choices: [
						{ text: 'We will protect the town.', next: 'accept' },
						{ text: 'Not at this moment.', next: 'decline' },
					],
				},
				{
					id: 'accept',
					text: 'Bless you, {leader}! Take this {item:POTION} and 20 gold. The hunt begins!',
					giveItem: 'POTION',
					giveGold: 20,
					setFlag: 'QUEST_WOLVES_ACCEPTED',
					advanceQuest: { questId: 'SHADE_WOLF_HUNT', stage: 1 },
					next: null,
				},
				{
					id: 'decline',
					text: 'Then stay vigilant. The shadows show no mercy.',
					next: null,
				},
				{
					id: 'in_progress',
					text: 'You carry {potions} {item:POTION}s and {gold} gold, {leader}. Have the wolves been dealt with?',
					choices: [
						{
							text: 'We have {potions} {item:POTION}s ready.',
							next: 'supplies_check',
							requireItem: 'POTION',
							lockReason: 'Requires 1 {item:POTION}',
						},
						{ text: 'Still tracking them.', next: 'hunting' },
					],
				},
				{
					id: 'supplies_check',
					text: 'Good preparation, {leader}. Stay focused on the south clearing.',
					next: null,
				},
				{
					id: 'hunting',
					text: 'May the ember protect all {partyCount} of you.',
					next: null,
				},
				{
					id: 'completed',
					text: 'The southern road is quiet. Now look to the east—the Crypt Sanctum stirs with primordial fire.',
					next: null,
				},
				{
					id: 'boss_dead',
					text: 'Malakor has fallen! The sky cleared over Oakhaven. You carry the Cinder Core—a true legend of the Ember.',
					next: null,
				},
			],
		},
		ELDER_GREETING: {
			id: 'ELDER_GREETING',
			speaker: 'Elder Rowan',
			nodes: [
				{
					id: 'start',
					text: 'Greetings, travelers. The old iron gate to the east seals the Whispering Crypt. Search the old chest along the southern tree line for the key.',
					choices: [
						{ text: 'We will find the key.', next: 'accept' },
						{ text: 'What monsters lurk within?', next: 'warn' },
					],
				},
				{
					id: 'accept',
					text: 'May the light guide your blade. Rest at camp before you proceed.',
					setFlag: 'QUEST_CRYPT_ACCEPTED',
					next: null,
				},
				{
					id: 'warn',
					text: 'Skeletons that resist light steel, and venomous spiders. Prepare your party well.',
					next: null,
				},
			],
		},
		TOWN_GUARD: {
			id: 'TOWN_GUARD',
			speaker: 'Captain Kael',
			nodes: [
				{
					id: 'start',
					text: 'Halt, {leader}. The roads south are infested with shade wolves.',
					redirects: [
						{ requireFlag: 'QUEST_WOLVES_COMPLETED', target: 'veteran' },
						{ requireFlag: 'QUEST_WOLVES_ACCEPTED', target: 'caution' },
					],
					choices: [
						{ text: 'We are ready to clear the path.', next: 'rally' },
						{ text: 'Who maintains these gates?', next: 'lore' },
					],
				},
				{
					id: 'rally',
					text: 'Speak with Elder Rowan near the town square before you step beyond the palisade.',
					next: null,
				},
				{
					id: 'lore',
					text: 'The Oakhaven guard. We hold the perimeter against the catacomb ashes.',
					next: null,
				},
				{
					id: 'caution',
					text: 'Keep your weapons drawn, {leader}. The wolves strike without sound in the tall grass.',
					next: null,
				},
				{
					id: 'veteran',
					text: 'You cleared the south roads! The town owes your party of {partyCount} its survival.',
					next: null,
				},
			],
		},
		AFFLICTED_SCOUT: {
			id: 'AFFLICTED_SCOUT',
			speaker: 'Afflicted Scout',
			nodes: [
				{
					id: 'start',
					text: 'Ugh... the catacomb spiders... their venom burns like liquid ash...',
					redirects: [ { requireFlag: 'scout_healed', target: 'cured' } ],
					choices: [
						{
							text: 'Administer 1 {item:ETHER} to cleanse the venom.',
							next: 'heal_ether',
							requireItem: 'ETHER',
							lockReason: 'Requires 1 {item:ETHER}',
						},
						{ text: 'Hold on, we will find help.', next: 'end' },
					],
				},
				{
					id: 'heal_ether',
					text: 'The cool ether halts the venom! Bless you... Take this ring I recovered from the crypts.',
					takeItem: 'ETHER',
					setFlag: 'scout_healed',
					giveItem: 'SWIFT_RING',
					giveGold: 30,
					completeQuest: 'SANCTUARY_PLAGUE',
					next: null,
				},
				{
					id: 'cured',
					text: 'My breathing is steady again. Be careful near the eastern crypt stairs, {leader}.',
					next: null,
				},
				{
					id: 'end',
					text: 'Hurry... the shadow spreads fast...',
					next: null,
				},
			],
		},
		INNKEEPER: {
			id: 'INNKEEPER',
			speaker: 'Mother Martha',
			nodes: [
				{
					id: 'start',
					text: 'Welcome to the Hearth Inn, {leader}! A warm fire and clean beds await your party of {partyCount}.',
					choices: [
						{ text: 'Rest at the Inn (Full HP/MP Recovery & Autosave).', next: 'rest' },
						{ text: 'Any rumors or news from travelers?', next: 'rumors' },
						{ text: 'Just passing by.', next: null },
					],
				},
				{
					id: 'rest',
					text: 'Sleep well, brave souls. May the hearth keep your spirits bright against the darkness.',
					setFlag: 'inn_rest_pending',
					next: null,
				},
				{
					id: 'rumors',
					text: 'Old Torvald at the smithy says rare ore crystals can be scavenged in quiet meadow clearings. And wanderers speak of glowing Aether Shrines in the wild!',
					next: null,
				},
			],
		},
		NOTICE_BOARD: {
			id: 'NOTICE_BOARD',
			speaker: 'Oakhaven Town Bulletin',
			nodes: [
				{
					id: 'start',
					text: '📜 [OAKHAVEN TOWN NOTICE BOARD]\nLocal notices, hunting bounties, and danger advisories are posted here.',
					choices: [
						{ text: 'Read Bounty: Shade Wolf Alpha.', next: 'bounty_wolves' },
						{ text: 'Read Advisory: Whispering Crypt Hazards.', next: 'advisory_crypt' },
						{ text: 'Read Inscription: Ancient Aether Shrines.', next: 'shrines_lore' },
						{ text: 'Step away from the board.', next: null },
					],
				},
				{
					id: 'bounty_wolves',
					text: '🐺 BOUNTY: Shade wolves prowl the south meadow. Slay the pack and report to Elder Rowan for 50 Gold and a Swift Ring.',
					next: null,
				},
				{
					id: 'advisory_crypt',
					text: '⚠️ ADVISORY: The eastern crypt descent harbors toxic miasma and skeleton guards. Consecrate sanctuary camps to purify resting spots.',
					next: null,
				},
				{
					id: 'shrines_lore',
					text: '⛩️ LORE: Ancient celestial shrines channel pure mana. Communion with these standing stones fully replenishes spirit energy (MP).',
					next: null,
				},
			],
		},
		AETHER_SHRINE: {
			id: 'AETHER_SHRINE',
			speaker: 'Ancient Aether Shrine',
			nodes: [
				{
					id: 'start',
					text: '⛩️ [ANCIENT AETHER SHRINE]\nThe monolith hums with luminous resonance. Celestial runes pulse gently in the stone.',
					choices: [
						{ text: 'Commune with the Aether (Restore MP & Focus).', next: 'commune' },
						{ text: 'Examine the ancient inscription.', next: 'runes' },
						{ text: 'Leave the shrine undisturbed.', next: null },
					],
				},
				{
					id: 'commune',
					text: '✨ A celestial radiance washes over your party! All party MP has been restored to maximum.',
					setFlag: 'shrine_mp_restore',
					next: null,
				},
				{
					id: 'runes',
					text: '"From ember unto tide, the five essences weave the loom. Only the balanced hand shatters the primordial dark."',
					next: null,
				},
			],
		},
	};

	const Narrative = {
		Ailments,
		Quests,
		WorldMutations,
		Shops,
		Dialogues,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Narrative = Narrative;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Narrative;
	}
})();
