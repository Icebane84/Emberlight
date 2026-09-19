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
	const STORAGE_KEY = 'EMBERLIGHT_SAVE_V1';
	const CURRENT_VERSION = '1.4.0';

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
			// Fallback to in-memory store[cite: 6]
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
			// Fallback to in-memory store[cite: 6]
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
			// Fallback to in-memory store[cite: 6]
		}
		_memoryStorage.delete(key);
		return true;
	}
	//#endregion

	//#region [SEC-02] Schema Migration Registry & Version Handlers
	/** @type {Object.<string, MigrationHandler>} */
	const MIGRATIONS = {
		'1.0.0': (raw) => {
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
			if (!raw.canonicalFlags) raw.canonicalFlags = {};
			if (!raw.canonicalQuests) raw.canonicalQuests = {};
			if (!raw.canonicalInventory) raw.canonicalInventory = {};
			if (typeof raw.canonicalGold !== 'number') raw.canonicalGold = 100;
			if (!raw.canonicalWorldPos) raw.canonicalWorldPos = { x: 1, y: 1 };

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
		STORAGE_KEY,
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
		 * @returns {boolean} True if save exists.
		 */
		hasSave() {
			return !!_getStorageItem(STORAGE_KEY);
		},

		/**
		 * Retrieves metadata summary for the active save file.
		 * (Pure accessor utility)
		 * @returns {SaveMetadata|null} Metadata dictionary or null.
		 */
		getSaveMetadata() {
			try {
				const raw = _getStorageItem(STORAGE_KEY);
				if (!raw) return null;
				const data = JSON.parse(raw);
				return {
					version: data.version || '1.0.0',
					timestamp: data.timestamp || 'Unknown',
					partySize: data.canonicalParty?.length || 0,
					avgLevel: data.canonicalParty && data.canonicalParty.length > 0
						? Math.round(data.canonicalParty.reduce((acc, c) => acc + (c.level || 1), 0) / data.canonicalParty.length)
						: 1,
					gold: data.canonicalGold || 0,
				};
			} catch {
				return null;
			}
		},

		/**
		 * Serializes and persists a state snapshot to storage.
		 * (State-mutating persistence gateway)
		 * @param {SavePayload} stateSnapshot Game state snapshot object.
		 * @returns {boolean} True if successfully saved.
		 */
		save(stateSnapshot) {
			try {
				if (!stateSnapshot || typeof stateSnapshot !== 'object') {
					console.error('[EmberlightSaveManager] Save failed: Invalid state snapshot provided.');
					return false;
				}

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
				_setStorageItem(STORAGE_KEY, serialized);
				return true;
			} catch (err) {
				console.error('[EmberlightSaveManager] Save failed:', err);
				return false;
			}
		},

		/**
		 * Loads, migrates, and re-hydrates the save payload into a canonical game state.
		 * (State-mutating loader gateway)
		 * @returns {SavePayload|null} Fully hydrated save payload object or null.
		 */
		load() {
			try {
				const raw = _getStorageItem(STORAGE_KEY);
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
		 * Purges save data from persistent storage.
		 * (State-mutating cleanup gateway)
		 * @returns {boolean} True if successfully cleared.
		 */
		clear() {
			try {
				_removeStorageItem(STORAGE_KEY);
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