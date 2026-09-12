/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PERSISTENCE, COMPRESSION & SCHEMA MIGRATION ENGINE
 * Document Identifier: VSRP-001-SAVE-MANAGER
 * Governing Protocol:  VSRP-001 / SDCP-001
 * Authority:           Host SSOT
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Storage Fallback Drivers & LocalStorage Wrappers
 *   [SEC-02] Schema Migration Registry & Version Handlers
 *   [SEC-03] Public Persistence Gateway (Save, Load, Metadata & Hydration)
 * ============================================================================
 */

/**
 * @typedef {Object} SaveEquipment
 * @property {string|null} [weapon] Weapon item ID.
 * @property {string|null} [armor] Armor item ID.
 * @property {string|null} [accessory] Accessory item ID.
 */

/**
 * @typedef {Object} SaveCharacter
 * @property {string} [id] Character unique identifier.
 * @property {string} [name] Character display name.
 * @property {string} [phenotype] Class phenotype token.
 * @property {string} [class] Legacy class name string.
 * @property {number} [level] Character level.
 * @property {number} [exp] Experience points.
 * @property {number} [skillPoints] Available skill points.
 * @property {number} [unspentSP] Unspent skill points.
 * @property {string[]} [unlocked] Unlocked legacy node IDs.
 * @property {string[]} [unlockedNodes] Unlocked constellation node IDs.
 * @property {Object.<string, number>} [spent] Spent point distribution per branch.
 * @property {SaveEquipment} [equipment] Equipped gear mapping.
 * @property {Array<Object>} [ailments] Active status ailments.
 * @property {boolean} [alive] Alive status flag.
 * @property {number} [hp] Current hit points.
 * @property {number} [maxHp] Maximum hit points.
 * @property {number} [mp] Current magic points.
 * @property {number} [maxMp] Maximum magic points.
 * @property {number} [atk] Attack power rating.
 * @property {number} [def] Defense rating.
 * @property {number} [agi] Agility rating.
 */

/**
 * @typedef {Object} SaveDungeonSpec
 * @property {number} seed Dungeon procedural generation seed.
 * @property {number} depth Dungeon exploration depth floor.
 * @property {number} width Dungeon grid width.
 * @property {number} height Dungeon grid height.
 * @property {Object.<string, string>} mutations Dungeon tile mutation map.
 */

/**
 * @typedef {Object} SavePayload
 * @property {string} version Schema version string.
 * @property {string} [timestamp] ISO timestamp of serialization.
 * @property {SaveCharacter[]} [canonicalParty] Party roster array.
 * @property {number} [canonicalGold] Player gold currency balance.
 * @property {Object.<string, number>} [canonicalInventory] Item inventory count map.
 * @property {Object} [canonicalWorldPos] Overworld coordinate map position.
 * @property {Object.<string, boolean>} [canonicalFlags] World narrative flags.
 * @property {Object.<string, Object>} [canonicalQuests] Quest progression states.
 * @property {number} [canonicalDungeonDepth] Active dungeon depth level.
 * @property {SaveDungeonSpec|null} [canonicalDungeonSpec] Dungeon configuration spec.
 * @property {Object.<string, string>} [canonicalSurfaceMutations] Overworld tile mutations.
 * @property {Object.<string, string>} [canonicalTownMutations] Town structure mutations.
 * @property {string|null} [canonicalTownId] Active town key identifier.
 * @property {Object} [canonicalMacroPos] Macro region coordinate position.
 * @property {number} [canonicalStepCounter] Exploration step count tracker.
 * @property {Array<Array<string>>} [canonicalSurfaceMap] Legacy surface map grid.
 * @property {number} [canonicalDungeonFloor] Legacy dungeon floor index.
 */

/**
 * @typedef {Object} SaveMetadata
 * @property {string} version Schema version identifier.
 * @property {string} timestamp Last modified timestamp string.
 * @property {number} partySize Total count of active party members.
 * @property {number} avgLevel Average party level rating.
 * @property {number} gold Active gold balance.
 */

/**
 * @typedef {function(SavePayload): SavePayload} MigrationHandler
 */

const EmberlightSaveManager = (() => {
	'use strict';

	//#region [SEC-01] Type Definitions, Storage Fallback Drivers & LocalStorage Wrappers
	const LEGACY_STORAGE_KEY = 'EMBERLIGHT_SAVE_V1';
	const CURRENT_VERSION = '1.4.0';

	const SAVE_SLOTS = Object.freeze([
		{ id: 'SLOT_1', label: 'Archive Slot 1', storageKey: 'EMBERLIGHT_SAVE_SLOT_1', isAuto: false },
		{ id: 'SLOT_2', label: 'Archive Slot 2', storageKey: 'EMBERLIGHT_SAVE_SLOT_2', isAuto: false },
		{ id: 'SLOT_3', label: 'Archive Slot 3', storageKey: 'EMBERLIGHT_SAVE_SLOT_3', isAuto: false },
		{ id: 'AUTO_SAVE', label: 'Auto-Save [Checkpoint]', storageKey: 'EMBERLIGHT_SAVE_AUTO', isAuto: true },
	]);

	// Internal in-memory storage fallback for headless environments or quota errors
	/** @type {Map<string, string>} */
	const _memoryStorage = new Map();

	/**
	 * Safely retrieves a stored item from localStorage or memory fallback.
	 * (Pure presentation/storage lookup utility)
	 * @param {string} key Storage key identifier.
	 * @returns {string|null} Stored string value or null.
	 */
	function _getStorageItem(key) {
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				return window.localStorage.getItem(key);
			}
		} catch {
			// Fallback to in-memory store
		}
		return _memoryStorage.get(key) || null;
	}

	/**
	 * Safely stores an item into localStorage or memory fallback.
	 * (State-mutating storage utility)
	 * @param {string} key Storage key identifier.
	 * @param {string} value Value string to store.
	 * @returns {boolean} True upon successful write.
	 */
	function _setStorageItem(key, value) {
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				window.localStorage.setItem(key, value);
				return true;
			}
		} catch {
			// Fallback to in-memory store
		}
		_memoryStorage.set(key, String(value));
		return true;
	}

	/**
	 * Safely removes a stored item from localStorage and memory fallback.
	 * (State-mutating storage utility)
	 * @param {string} key Storage key identifier.
	 * @returns {boolean} True upon successful deletion.
	 */
	function _removeStorageItem(key) {
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				window.localStorage.removeItem(key);
			}
		} catch {
			// Fallback to in-memory store
		}
		_memoryStorage.delete(key);
		return true;
	}

	function _resolveStorageKey(slotId) {
		if (!slotId) return 'EMBERLIGHT_SAVE_SLOT_1';
		const norm = String(slotId).toUpperCase();
		const match = SAVE_SLOTS.find((s) => s.id === norm || s.storageKey === norm);
		if (match) return match.storageKey;
		return 'EMBERLIGHT_SAVE_SLOT_1';
	}

	function _autoMigrateLegacy() {
		const legacy = _getStorageItem(LEGACY_STORAGE_KEY);
		if (legacy && !_getStorageItem('EMBERLIGHT_SAVE_SLOT_1')) {
			try {
				let parsed = JSON.parse(legacy);
				if (typeof EmberlightSaveManager !== 'undefined' && typeof EmberlightSaveManager.migrate === 'function') {
					parsed = EmberlightSaveManager.migrate(parsed);
				}
				_setStorageItem('EMBERLIGHT_SAVE_SLOT_1', JSON.stringify(parsed));
			} catch {
				_setStorageItem('EMBERLIGHT_SAVE_SLOT_1', legacy);
			}
		}
	}
	//#endregion

	//#region [SEC-02] Schema Migration Registry & Version Handlers
	/** @type {Object.<string, MigrationHandler>} */
	const MIGRATIONS = {
		'1.0.0': (raw) => {
			if (!raw.canonicalParty && Array.isArray(raw.party)) {
				raw.canonicalParty = raw.party;
			}
			if (typeof raw.canonicalGold !== 'number' && typeof raw.gold === 'number') {
				raw.canonicalGold = raw.gold;
			}
			if (!raw.canonicalInventory && raw.inventory) {
				raw.canonicalInventory = raw.inventory;
			}
			if (!raw.canonicalWorldPos && raw.worldPos) {
				raw.canonicalWorldPos = raw.worldPos;
			}
			if (!raw.canonicalFlags && raw.flags) {
				raw.canonicalFlags = raw.flags;
			}
			if (!raw.canonicalQuests && raw.quests) {
				raw.canonicalQuests = raw.quests;
			}

			if (Array.isArray(raw.canonicalParty)) {
				raw.canonicalParty.forEach((c) => {
					if (!c.equipment) c.equipment = { weapon: null, armor: null, accessory: null };
					if (!c.unlocked) c.unlocked = [];
					if (!c.spent) c.spent = {};
					if (typeof c.skillPoints !== 'number') c.skillPoints = 0;
					if (!c.ailments) c.ailments = [];
				});
			}
			raw.version = '1.1.0';
			return raw;
		},
		'1.1.0': (raw) => {
			if (!raw.canonicalFlags) raw.canonicalFlags = raw.flags || {};
			if (!raw.canonicalQuests) raw.canonicalQuests = raw.quests || {};
			if (!raw.canonicalInventory) raw.canonicalInventory = raw.inventory || {};
			if (typeof raw.canonicalGold !== 'number') raw.canonicalGold = typeof raw.gold === 'number' ? raw.gold : 100;
			if (!raw.canonicalWorldPos) raw.canonicalWorldPos = raw.worldPos || { x: 1, y: 1 };

			if (Array.isArray(raw.canonicalParty)) {
				raw.canonicalParty.forEach((c) => {
					if (!c.phenotype && c.class) c.phenotype = c.class.toUpperCase();
					if (!c.ailments) c.ailments = [];
				});
			}
			raw.version = '1.2.0';
			return raw;
		},
		'1.2.0': (raw) => {
			if (Array.isArray(raw.canonicalParty)) {
				raw.canonicalParty.forEach((c) => {
					if (!Array.isArray(c.unlockedNodes)) {
						c.unlockedNodes = Array.isArray(c.unlocked) ? [...c.unlocked] : [];
					}
					if (typeof c.unspentSP !== 'number') {
						c.unspentSP = typeof c.skillPoints === 'number' ? c.skillPoints : 0;
					}
				});
			}
			raw.version = '1.3.0';
			return raw;
		},
		'1.3.0': (raw) => {
			if (!raw.canonicalSurfaceMutations) raw.canonicalSurfaceMutations = {};
			if (Array.isArray(raw.canonicalSurfaceMap)) {
				const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
				const base = manifest.OverworldMap || [];
				raw.canonicalSurfaceMap.forEach((row, y) => {
					if (Array.isArray(row)) {
						row.forEach((tile, x) => {
							if (base[y]?.[x] !== undefined && tile !== base[y][x] && tile !== '@') {
								raw.canonicalSurfaceMutations[`${x},${y}`] = tile;
							}
						});
					}
				});
			}
			if (!raw.canonicalDungeonSpec && (raw.canonicalDungeonDepth > 0 || raw.canonicalDungeonFloor)) {
				const dungeonSeed = typeof EmberlightPRNG !== 'undefined'
					? EmberlightPRNG.create(Date.now()).nextInt(100000, 999999)
					: 123456;
				raw.canonicalDungeonSpec = {
					seed: dungeonSeed,
					depth: raw.canonicalDungeonDepth || 1,
					width: 12,
					height: 10,
					mutations: {},
				};
			}
			delete raw.canonicalSurfaceMap;
			delete raw.canonicalDungeonFloor;
			raw.version = '1.4.0';
			return raw;
		},
	};
	//#endregion

	//#region [SEC-03] Public Persistence Gateway (Save, Load, Metadata & Hydration)
	const EmberlightSaveManager = {
		CURRENT_VERSION,
		STORAGE_KEY: 'EMBERLIGHT_SAVE_SLOT_1',
		LEGACY_STORAGE_KEY,
		SAVE_SLOTS,
		MIGRATIONS,

		/**
		 * Migrates an older save payload up to the current schema version.
		 * (Pure calculation utility)
		 * @param {SavePayload} payload Raw save data object.
		 * @returns {SavePayload} Migrated payload object.
		 */
		migrate(payload) {
			if (!payload || typeof payload !== 'object') return payload;
			let currentVer = payload.version || '1.0.0';
			while (this.MIGRATIONS[currentVer]) {
				payload = this.MIGRATIONS[currentVer](payload);
				currentVer = payload.version;
			}
			return payload;
		},

		/**
		 * Checks if a save file exists in persistent storage.
		 * (Pure lookup utility)
		 * @param {string} [slotId] Optional slot ID to check. If omitted, checks all slots.
		 * @returns {boolean} True if save exists.
		 */
		hasSave(slotId) {
			_autoMigrateLegacy();
			if (slotId) {
				const key = _resolveStorageKey(slotId);
				return !!_getStorageItem(key);
			}
			return SAVE_SLOTS.some((s) => !!_getStorageItem(s.storageKey)) || !!_getStorageItem(LEGACY_STORAGE_KEY);
		},

		/**
		 * Identifies the most recently modified save slot.
		 * @returns {string} Most recent slot ID ('SLOT_1' | 'SLOT_2' | 'SLOT_3' | 'AUTO_SAVE').
		 */
		getMostRecentSlotId() {
			_autoMigrateLegacy();
			let newestSlot = 'SLOT_1';
			let newestTime = -1;

			for (const slot of SAVE_SLOTS) {
				const raw = _getStorageItem(slot.storageKey);
				if (raw) {
					try {
						const data = JSON.parse(raw);
						const t = data.timestamp ? new Date(data.timestamp).getTime() : 0;
						if (t >= newestTime) {
							newestTime = t;
							newestSlot = slot.id;
						}
					} catch {
						// Ignore corrupted slots
					}
				}
			}
			return newestSlot;
		},

		/**
		 * Resolves readable location title from save data.
		 * @param {any} data
		 * @returns {string}
		 */
		resolveLocationName(data) {
			if (data?.canonicalDungeonDepth && data.canonicalDungeonDepth > 0) {
				return `⛩️ Catacombs (Floor ${data.canonicalDungeonDepth})`;
			}
			if (data?.canonicalTownId === 'OAKHAVEN' || data?.canonicalFlags?.in_town) {
				return '🏰 Oakhaven Hamlet';
			}
			return '🌲 The Ashen Wilds';
		},

		/**
		 * Lists descriptors and status for all available save slots.
		 * @returns {Array<Object>}
		 */
		listSlots() {
			_autoMigrateLegacy();
			return SAVE_SLOTS.map((slot) => {
				const raw = _getStorageItem(slot.storageKey);
				if (!raw) {
					return {
						id: slot.id,
						label: slot.label,
						isAuto: slot.isAuto,
						exists: false,
						timestamp: null,
						isoTimestamp: null,
						locationName: 'Empty Archive Slot',
						party: [],
						avgLevel: 0,
						gold: 0,
					};
				}

				try {
					const data = JSON.parse(raw);
					const dateObj = data.timestamp ? new Date(data.timestamp) : null;
					const formattedTime = dateObj && !isNaN(dateObj.getTime())
						? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
						: 'Saved Expedition';

					const party = Array.isArray(data.canonicalParty) ? data.canonicalParty : [];
					const avgLevel = party.length > 0
						? Math.round(party.reduce((acc, c) => acc + (c.level || 1), 0) / party.length)
						: 1;

					return {
						id: slot.id,
						label: slot.label,
						isAuto: slot.isAuto,
						exists: true,
						version: data.version || '1.4.0',
						timestamp: formattedTime,
						isoTimestamp: data.timestamp || null,
						locationName: this.resolveLocationName(data),
						party: party.map((c) => ({
							name: c.name || 'Hero',
							phenotype: c.phenotype || 'HERO',
							level: c.level || 1,
							hp: c.hp || 30,
							maxHp: c.maxHp || 30,
						})),
						avgLevel,
						gold: data.canonicalGold || 0,
					};
				} catch {
					return {
						id: slot.id,
						label: slot.label,
						isAuto: slot.isAuto,
						exists: false,
						locationName: 'Corrupted Archive',
						party: [],
						avgLevel: 0,
						gold: 0,
					};
				}
			});
		},

		/**
		 * Retrieves metadata summary for the specified save slot.
		 * (Pure accessor utility)
		 * @param {string} [slotId]
		 * @returns {SaveMetadata|null} Metadata dictionary or null.
		 */
		getSaveMetadata(slotId) {
			try {
				_autoMigrateLegacy();
				const targetSlot = slotId || this.getMostRecentSlotId();
				const key = _resolveStorageKey(targetSlot);
				const raw = _getStorageItem(key);
				if (!raw) return null;
				const data = JSON.parse(raw);
				const party = Array.isArray(data.canonicalParty) ? data.canonicalParty : (Array.isArray(data.party) ? data.party : []);
				const avgLevel = party.length > 0
					? Math.round(party.reduce((acc, c) => acc + (c.level || 1), 0) / party.length)
					: 1;
				return {
					slotId: targetSlot,
					version: data.version || '1.0.0',
					timestamp: data.timestamp || 'Unknown',
					partySize: party.length,
					avgLevel,
					gold: typeof data.canonicalGold === 'number' ? data.canonicalGold : (typeof data.gold === 'number' ? data.gold : 0),
					locationName: this.resolveLocationName(data),
				};
			} catch {
				return null;
			}
		},

		/**
		 * Serializes and persists a state snapshot to specified slot.
		 * (State-mutating persistence gateway)
		 * @param {SavePayload} stateSnapshot Game state snapshot object.
		 * @param {string} [slotId='SLOT_1'] Target save slot ID.
		 * @returns {boolean} True if successfully saved.
		 */
		save(stateSnapshot, slotId = 'SLOT_1') {
			try {
				if (!stateSnapshot || typeof stateSnapshot !== 'object') {
					console.error('[EmberlightSaveManager] Save failed: Invalid state snapshot provided.');
					return false;
				}

				const key = _resolveStorageKey(slotId);
				const payload = {
					version: this.CURRENT_VERSION,
					timestamp: new Date().toISOString(),
					canonicalParty: stateSnapshot.canonicalParty,
					canonicalGold: typeof stateSnapshot.canonicalGold === 'number' ? stateSnapshot.canonicalGold : 100,
					canonicalInventory: stateSnapshot.canonicalInventory || { POTION: 4, ETHER: 2, PHOENIX_EMBER: 1 },
					canonicalWorldPos: stateSnapshot.canonicalWorldPos || { x: 1, y: 1 },
					canonicalFlags: stateSnapshot.canonicalFlags || {},
					canonicalQuests: stateSnapshot.canonicalQuests || {},
					canonicalDungeonDepth: typeof stateSnapshot.canonicalDungeonDepth === 'number' ? stateSnapshot.canonicalDungeonDepth : 0,
					canonicalDungeonSpec: stateSnapshot.canonicalDungeonSpec || null,
					canonicalSurfaceMutations: stateSnapshot.canonicalSurfaceMutations || {},
					canonicalTownMutations: stateSnapshot.canonicalTownMutations || {},
					canonicalTownId: stateSnapshot.canonicalTownId || null,
					canonicalMacroPos: stateSnapshot.canonicalMacroPos || { x: 1, y: 1 },
					canonicalStepCounter: typeof stateSnapshot.canonicalStepCounter === 'number' ? stateSnapshot.canonicalStepCounter : 0,
				};

				const serialized = JSON.stringify(payload);
				_setStorageItem(key, serialized);
				// Mirror to primary slot for legacy compatibility
				if (slotId === 'SLOT_1') {
					_setStorageItem(LEGACY_STORAGE_KEY, serialized);
				}
				return true;
			} catch (err) {
				console.error('[EmberlightSaveManager] Save failed:', err);
				return false;
			}
		},

		/**
		 * Loads, migrates, and re-hydrates save payload from specified slot.
		 * (State-mutating loader gateway)
		 * @param {string} [slotId] Target save slot ID. If omitted, loads most recent slot.
		 * @returns {SavePayload|null} Fully hydrated save payload object or null.
		 */
		load(slotId) {
			try {
				_autoMigrateLegacy();
				const targetSlot = slotId || this.getMostRecentSlotId();
				const key = _resolveStorageKey(targetSlot);
				const raw = _getStorageItem(key) || _getStorageItem(LEGACY_STORAGE_KEY);
				if (!raw) return null;

				let payload = JSON.parse(raw);
				if (!payload || typeof payload !== 'object') return null;

				payload = this.migrate(payload);

				// Re-hydrate full canonical 4-hero roster if corrupted or incomplete
				if (!Array.isArray(payload.canonicalParty) || payload.canonicalParty.length < 4) {
					const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
					const phenotypes = manifest.Phenotypes || {};
					const templates = [
						{ id: 'hero', name: 'Aldric', phenotype: 'HERO', weapon: 'IRON_SWORD', armor: 'CLOTH_TUNIC' },
						{ id: 'warrior', name: 'Brogan', phenotype: 'WARRIOR', weapon: 'IRON_SWORD', armor: 'CHAINMAIL' },
						{ id: 'mage', name: 'Selene', phenotype: 'MAGE', weapon: 'OAK_STAFF', armor: 'MAGE_ROBE' },
						{ id: 'healer', name: 'Wren', phenotype: 'HEALER', weapon: 'OAK_STAFF', armor: 'MAGE_ROBE' },
					];

					const partyMap = new Map();
					if (Array.isArray(payload.canonicalParty)) {
						payload.canonicalParty.forEach((c) => {
							if (c && (c.id || c.name)) {
								partyMap.set(c.id || c.name, c);
								partyMap.set(c.phenotype, c);
							}
						});
					}

					const completeParty = templates.map((tmpl) => {
						const existing = partyMap.get(tmpl.id) || partyMap.get(tmpl.name) || partyMap.get(tmpl.phenotype);
						if (existing) {
							const pKey = (existing.phenotype || tmpl.phenotype).toUpperCase();
							const pheno = phenotypes[pKey] || {};
							const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };
							return {
								...existing,
								alive: existing.alive !== false && (existing.hp === undefined || existing.hp > 0),
								hp: (existing.hp !== undefined && existing.hp > 0) ? existing.hp : base.hp,
								maxHp: existing.maxHp || base.hp,
								mp: (existing.mp !== undefined && existing.mp > 0) ? existing.mp : base.mp,
								maxMp: existing.maxMp || base.mp,
								atk: existing.atk || base.atk,
								def: existing.def || base.def,
								agi: existing.agi || base.agi,
							};
						}

						const pKey = tmpl.phenotype.toUpperCase();
						const pheno = phenotypes[pKey] || {};
						const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };
						return {
							id: tmpl.id,
							name: tmpl.name,
							phenotype: pKey,
							level: 1,
							exp: 0,
							skillPoints: 0,
							unspentSP: 0,
							unlocked: [],
							unlockedNodes: [],
							spent: {},
							equipment: { weapon: tmpl.weapon, armor: tmpl.armor, accessory: null },
							ailments: [],
							alive: true,
							hp: base.hp,
							maxHp: base.hp,
							mp: base.mp,
							maxMp: base.mp,
							atk: base.atk,
							def: base.def,
							agi: base.agi,
						};
					});

					payload.canonicalParty = completeParty;
				}

				// Revive dead heroes if entire party was defeated upon load
				if (payload.canonicalParty.every((c) => !c.alive || c.hp <= 0)) {
					payload.canonicalParty.forEach((c) => {
						c.alive = true;
						c.hp = c.maxHp || 30;
						c.mp = c.maxMp || 10;
						c.ailments = [];
					});
				}

				// Ensure party members have proper baseline SP
				if (Array.isArray(payload.canonicalParty)) {
					payload.canonicalParty.forEach((c) => {
						const unlocked = c.unlockedNodes || c.unlocked || [];
						const currentSP = Math.max(c.skillPoints || 0, c.unspentSP || 0);
						if (unlocked.length === 0 && currentSP === 0) {
							c.skillPoints = Math.max(1, c.level || 1);
							c.unspentSP = Math.max(1, c.level || 1);
						}
					});
				}

				return {
					slotId: targetSlot,
					version: payload.version,
					timestamp: payload.timestamp,
					canonicalParty: payload.canonicalParty,
					canonicalGold: typeof payload.canonicalGold === 'number' ? payload.canonicalGold : 100,
					canonicalInventory: payload.canonicalInventory || { POTION: 4, ETHER: 2, PHOENIX_EMBER: 1 },
					canonicalWorldPos: payload.canonicalWorldPos || { x: 1, y: 1 },
					canonicalFlags: payload.canonicalFlags || {},
					canonicalQuests: payload.canonicalQuests || {},
					canonicalDungeonDepth: typeof payload.canonicalDungeonDepth === 'number' ? payload.canonicalDungeonDepth : 0,
					canonicalDungeonSpec: payload.canonicalDungeonSpec || null,
					canonicalSurfaceMutations: payload.canonicalSurfaceMutations || {},
					canonicalTownMutations: payload.canonicalTownMutations || {},
					canonicalTownId: payload.canonicalTownId || null,
					canonicalMacroPos: payload.canonicalMacroPos || { x: 1, y: 1 },
					canonicalStepCounter: typeof payload.canonicalStepCounter === 'number' ? payload.canonicalStepCounter : 0,
				};
			} catch (err) {
				console.warn('[EmberlightSaveManager] Failed to hydrate:', err);
				return null;
			}
		},

		/**
		 * Deletes a specific save slot.
		 * @param {string} slotId
		 * @returns {boolean}
		 */
		deleteSlot(slotId) {
			try {
				const key = _resolveStorageKey(slotId);
				_removeStorageItem(key);
				if (slotId === 'SLOT_1') {
					_removeStorageItem(LEGACY_STORAGE_KEY);
				}
				return true;
			} catch (err) {
				console.error('[EmberlightSaveManager] Delete error:', err);
				return false;
			}
		},

		/**
		 * Purges save data from persistent storage.
		 * (State-mutating cleanup gateway)
		 * @param {string} [slotId] Optional slot ID to clear. If omitted, clears all slots.
		 * @returns {boolean} True if successfully cleared.
		 */
		clear(slotId) {
			try {
				if (slotId) {
					return this.deleteSlot(slotId);
				}
				SAVE_SLOTS.forEach((s) => {
					_removeStorageItem(s.storageKey);
				});
				_removeStorageItem(LEGACY_STORAGE_KEY);
				return true;
			} catch (err) {
				console.error('[EmberlightSaveManager] Clear error:', err);
				return false;
			}
		},
	};
	//#endregion

	return EmberlightSaveManager;
})();

// Expose on global and module environments
if (typeof window !== 'undefined') {
	window.EmberlightSaveManager = EmberlightSaveManager;
	window.StorageManager = EmberlightSaveManager;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightSaveManager;
}