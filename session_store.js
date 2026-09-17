/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: SESSION STORE & SSOT TRANSACTIONAL MUTATOR
 * Document Identifier: VSRP-001-SESSION-STORE
 * Governing Protocol:  VSRP-001 / COMPONENT_PROTOCOL
 * Authority:           Host SSOT[cite: 6]
 * Timestamp:           2026-09-07T12:06:34Z
 * Index Anchor:        PRS-001[cite: 6]
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Authoritative Ephemeral Session State & Sparse Mutation Helpers
 *   [SEC-03] Canonical Party Integrity, Anti-Contamination Sanitizer & New Game Bootstrap
 *   [SEC-04] Persistence Gateway & Storage Manager Delegation
 *   [SEC-05] Store Instance Public API Gateway & Global/CommonJS Module Export
 * ============================================================================
 */

/* =========================================================================
	 EMBERLIGHT SESSION STORE (HOST SSOT & TRANSACTIONAL MUTATOR)
	 -------------------------------------------------------------------------
	 Document Identifier: VSRP-001-SESSION-STORE[cite: 6]
	 Protocol Version:    VSRP-001[cite: 6]
	 Classification:      Host Single Source of Truth (SSOT) Store[cite: 6]
	 Index Anchor:        PRS-001[cite: 6]
	 ========================================================================= */

const EmberlightSessionStore = (() => {
	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} PartyMemberRecord
	 * @property {string} id - Character identifier token.
	 * @property {string} name - Character name.
	 * @property {string} phenotype - Phenotype archetype.
	 * @property {number} level - Character level.
	 * @property {number} exp - Experience points.
	 * @property {number} skillPoints - Available skill points.
	 * @property {number} unspentSP - Unspent skill points.
	 * @property {string[]} unlocked - Unlocked node list.
	 * @property {string[]} unlockedNodes - Unlocked constellation nodes.
	 * @property {Record<string, number>} spent - Skill points spent per branch.
	 * @property {Record<string, string|null>} equipment - Equipment slot mappings.
	 * @property {string[]} ailments - Active status ailments.
	 * @property {boolean} alive - Life status flag.
	 * @property {number} hp - Current hit points.
	 * @property {number} maxHp - Maximum hit points.
	 * @property {number} mp - Current mana points.
	 * @property {number} maxMp - Maximum mana points.
	 * @property {number} atk - Attack stat.
	 * @property {number} def - Defense stat.
	 * @property {number} agi - Agility stat.
	 */

	/**
	 * @typedef {Object} SessionSnapshot
	 * @property {PartyMemberRecord[]} party - Party members.
	 * @property {number} gold - Gold currency.
	 * @property {Record<string, number>} inventory - Inventory items.
	 * @property {{ x: number, y: number }} worldPos - World position.
	 * @property {Record<string, any>} flags - Game flags.
	 * @property {Record<string, any>} quests - Quest progress.
	 * @property {number} dungeonDepth - Dungeon depth.
	 * @property {string[][]|null} dungeonFloor - Dungeon floor grid.
	 * @property {Object|null} dungeonSpec - Dungeon generation spec.
	 * @property {string[][]|null} surfaceMap - Surface overworld map.
	 * @property {Record<string, string>} surfaceMutations - Surface tile mutations.
	 * @property {Record<string, Record<string, string>>} townMutations - Town tile mutations.
	 * @property {string|null} townId - Active town identifier.
	 * @property {{ x: number, y: number }} macroPos - Macro wilderness coordinates.
	 * @property {number} stepCounter - Total step count.
	 * @property {{ x: number, y: number }|null} lastInteractedChestPos - Last chest position.
	 */

	/**
	 * @typedef {Object} SaveMetadata
	 * @property {string} version - Save version.
	 * @property {number} partySize - Party member count.
	 * @property {number} avgLevel - Average party level.
	 * @property {number} gold - Available gold.
	 * @property {string} timestamp - Save timestamp.
	 */
	//#endregion

	//#region [SEC-02] Authoritative Ephemeral Session State & Sparse Mutation Helpers
	// --- Authoritative Ephemeral Session State ---
	/** @type {PartyMemberRecord[]} */
	let canonicalParty = [];
	let canonicalGold = 100;
	/** @type {Record<string, number>} */
	let canonicalInventory = { POTION: 3, ETHER: 1 };
	let canonicalWorldPos = { x: 1, y: 1 };
	/** @type {Record<string, any>} */
	let canonicalFlags = {};
	/** @type {Record<string, any>} */
	let canonicalQuests = {};
	/** @type {string[][]|null} */
	let canonicalDungeonFloor = null;
	let canonicalDungeonDepth = 0; // 0 = Surface Overworld
	/** @type {string[][]|null} */
	let canonicalSurfaceMap = null;
	/** @type {Record<string, string>} */
	let canonicalSurfaceMutations = {}; // Sparse dictionary: { "x,y": tile }
	/** @type {Record<string, Record<string, string>>} */
	let canonicalTownMutations = {}; // Sparse dictionary: { townId: { "x,y": tile } }
	/** @type {any} */
	let canonicalDungeonSpec = null; // Sparse descriptor: { seed, depth, width, height, mutations: { "x,y": tile } }
	/** @type {string|null} */
	let canonicalTownId = null; // null = Macro Wilderness, 'OAKHAVEN' = Inside town
	let canonicalMacroPos = { x: 1, y: 1 }; // Cached wilderness coords before town entry
	let canonicalStepCounter = 0;
	/** @type {{ x: number, y: number }|null} */
	let lastInteractedChestPos = null;
	/** @type {string} */
	let activeSlotId = "SLOT_1";

	// --- Sparse World Mutation Helpers ---
	/**
	 * Records a sparse dungeon floor mutation.
	 * [State Mutating]
	 * @param {string} key - Grid coordinate key ("x,y").
	 * @param {number} x - X coordinate.
	 * @param {number} y - Y coordinate.
	 * @param {string} newTile - Replacement tile glyph.
	 * @returns {void}
	 */
	function recordDungeonMutation(key, x, y, newTile) {
		if (!canonicalDungeonSpec) {
			canonicalDungeonSpec = {
				seed: 123456,
				depth: canonicalDungeonDepth,
				width: 12,
				height: 10,
				mutations: {},
			};
		}
		if (!canonicalDungeonSpec.mutations) canonicalDungeonSpec.mutations = {};
		canonicalDungeonSpec.mutations[key] = newTile;
		if (canonicalDungeonFloor?.[y]) {
			canonicalDungeonFloor[y][x] = newTile;
		}
	}

	/**
	 * Records a sparse town mutation.
	 * [State Mutating]
	 * @param {string} key - Grid coordinate key ("x,y").
	 * @param {string} newTile - Replacement tile glyph.
	 * @returns {void}
	 */
	function recordTownMutation(key, newTile) {
		if (!canonicalTownMutations) canonicalTownMutations = {};
		if (!canonicalTownId) return;
		if (!canonicalTownMutations[canonicalTownId])
			canonicalTownMutations[canonicalTownId] = {};
		canonicalTownMutations[canonicalTownId][key] = newTile;
	}

	/**
	 * Records a sparse surface mutation.
	 * [State Mutating]
	 * @param {string} key - Grid coordinate key ("x,y").
	 * @param {number} x - X coordinate.
	 * @param {number} y - Y coordinate.
	 * @param {string} newTile - Replacement tile glyph.
	 * @returns {void}
	 */
	function recordSurfaceMutation(key, x, y, newTile) {
		if (!canonicalSurfaceMutations) canonicalSurfaceMutations = {};
		canonicalSurfaceMutations[key] = newTile;
		if (canonicalSurfaceMap?.[y]) {
			canonicalSurfaceMap[y][x] = newTile;
		}
	}

	/**
	 * Routes tile mutation recording based on active depth or town context.
	 * [State Mutating]
	 * @param {number} x - X coordinate.
	 * @param {number} y - Y coordinate.
	 * @param {string} newTile - Replacement tile glyph.
	 * @returns {void}
	 */
	function recordTileMutation(x, y, newTile) {
		const key = `${x},${y}`;
		if (canonicalDungeonDepth > 0) {
			recordDungeonMutation(key, x, y, newTile);
		} else if (canonicalTownId) {
			recordTownMutation(key, newTile);
		} else {
			recordSurfaceMutation(key, x, y, newTile);
		}
	}
	//#endregion

	//#region [SEC-03] Canonical Party Integrity, Anti-Contamination Sanitizer & New Game Bootstrap
	// --- Canonical Party Integrity & Anti-Contamination Sanitizer ---
	/**
	 * Normalizes a party member record name and ID.
	 * [Pure Subroutine]
	 * @param {any} c - Character object.
	 * @returns {void}
	 */
	function normalizeCharacterRecord(c) {
		if (!c) return;
		if (c.name === "AuditHero" || c.name === "test_hero") c.name = "Aldric";
		if (c.id === "test_hero") c.id = "hero";
	}

	/**
	 * Builds a mapped lookup index of existing party members.
	 * [Pure Subroutine]
	 * @param {any[]} partyList - Party list array.
	 * @returns {Map<string, any>} Existing character lookup map.
	 */
	function buildExistingPartyMap(partyList) {
		const existingMap = new Map();
		if (Array.isArray(partyList)) {
			partyList.forEach((c) => {
				if (c && (c.id || c.name)) {
					normalizeCharacterRecord(c);
					if (c.id) existingMap.set(c.id, c);
					if (c.name) existingMap.set(c.name, c);
					if (c.phenotype && c.phenotype !== "undefined") {
						existingMap.set(c.phenotype.toUpperCase(), c);
					}
				}
			});
		}
		return existingMap;
	}

	/**
	 * Merges and normalizes existing character data with class baseline template.
	 * [Pure Transformation]
	 * @param {any} existing - Preserved character record.
	 * @param {any} tmpl - Template definition.
	 * @param {string} pKey - Phenotype key.
	 * @param {any} base - Base stats object.
	 * @returns {PartyMemberRecord} Hydrated character record.
	 */
	function hydrateExistingCharacter(existing, tmpl, pKey, base) {
		return {
			...existing,
			id: existing.id || tmpl.id,
			name: existing.name || tmpl.name,
			phenotype: pKey,
			level: existing.level || 1,
			exp: existing.exp || 0,
			skillPoints: existing.skillPoints ?? existing.unspentSP ?? 1,
			unspentSP: existing.unspentSP ?? existing.skillPoints ?? 1,
			unlocked: Array.isArray(existing.unlocked) ? existing.unlocked : [],
			unlockedNodes: Array.isArray(existing.unlockedNodes)
				? existing.unlockedNodes
				: [],
			spent: existing.spent || {},
			equipment: existing.equipment || {
				weapon: tmpl.weapon,
				armor: tmpl.armor,
				accessory: null,
			},
			ailments: Array.isArray(existing.ailments) ? existing.ailments : [],
			alive:
				existing.alive !== false &&
				(existing.hp === undefined || existing.hp > 0),
			hp: existing.hp !== undefined && existing.hp > 0 ? existing.hp : base.hp,
			maxHp: existing.maxHp || base.hp,
			mp: existing.mp !== undefined && existing.mp >= 0 ? existing.mp : base.mp,
			maxMp: existing.maxMp || base.mp,
			atk: existing.atk || base.atk,
			def: existing.def || base.def,
			agi: existing.agi || base.agi,
		};
	}

	/**
	 * Constructs a fresh default character record from template and phenotype stats.
	 * [Pure Subroutine]
	 * @param {any} tmpl - Template definition.
	 * @param {string} pKey - Phenotype key.
	 * @param {any} base - Base stats object.
	 * @returns {PartyMemberRecord} Default character record.
	 */
	function createDefaultCharacter(tmpl, pKey, base) {
		return {
			id: tmpl.id,
			name: tmpl.name,
			phenotype: pKey,
			level: 1,
			exp: 0,
			skillPoints: 1,
			unspentSP: 1,
			unlocked: [],
			unlockedNodes: [],
			spent: {},
			equipment: {
				weapon: tmpl.weapon,
				armor: tmpl.armor,
				accessory: null,
			},
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
	}

	/**
	 * Resolves a character record from existing map or generates a fresh default.
	 * [Pure Subroutine]
	 * @param {any} tmpl - Template definition.
	 * @param {Map<string, any>} existingMap - Existing character map.
	 * @param {Record<string, any>} phenotypes - Phenotype definitions dictionary.
	 * @returns {PartyMemberRecord} Resolved character record.
	 */
	function resolveCharacterRecord(tmpl, existingMap, phenotypes) {
		const existing =
			existingMap.get(tmpl.id) ||
			existingMap.get(tmpl.name) ||
			existingMap.get(tmpl.phenotype);
		const pKey = (
			existing?.phenotype && existing.phenotype !== "undefined"
				? existing.phenotype
				: tmpl.phenotype
		).toUpperCase();
		const pheno = phenotypes[pKey] || {};
		const base = pheno.baseStats || { hp: 30, mp: 10, atk: 8, def: 5, agi: 5 };

		if (existing?.level !== undefined && !Number.isNaN(existing.level)) {
			return hydrateExistingCharacter(existing, tmpl, pKey, base);
		}

		return createDefaultCharacter(tmpl, pKey, base);
	}

	/**
	 * @returns {any}
	 */
	function getWin() {
		if (typeof window !== "undefined") return window;
		if (typeof globalThis !== "undefined") return globalThis;
		return {};
	}

	/**
	 * Sanitizes and validates canonical party roster data.
	 * [State Mutating]
	 * @returns {void}
	 */
	function sanitizeCanonicalParty() {
		const win = getWin();
		const manifest = win.EmberlightManifest || {};
		const phenotypes = manifest.Phenotypes || {};
		const templates = [
			{
				id: "hero",
				name: "Aldric",
				phenotype: "HERO",
				weapon: "IRON_SWORD",
				armor: "CLOTH_TUNIC",
			},
			{
				id: "warrior",
				name: "Brogan",
				phenotype: "WARRIOR",
				weapon: "IRON_SWORD",
				armor: "CHAINMAIL",
			},
			{
				id: "mage",
				name: "Selene",
				phenotype: "MAGE",
				weapon: "OAK_STAFF",
				armor: "MAGE_ROBE",
			},
			{
				id: "healer",
				name: "Wren",
				phenotype: "HEALER",
				weapon: "OAK_STAFF",
				armor: "MAGE_ROBE",
			},
		];

		if (Array.isArray(canonicalParty)) {
			canonicalParty.forEach(normalizeCharacterRecord);
		}

		const prog = win.EmberlightProgression;
		if (
			prog &&
			typeof prog.getState === "function"
		) {
			try {
				const progState = prog.getState();
				if (Array.isArray(progState?.party)) {
					progState.party.forEach(normalizeCharacterRecord);
				}
			} catch (_) {
				// Progression tenant is in UNCONFIGURED/uninitialized state, skip progression sync
			}
		}

		const isCorrupt =
			!Array.isArray(canonicalParty) ||
			canonicalParty.length < 4 ||
			canonicalParty.some(
				(c) =>
					!c?.name ||
					c.level === undefined ||
					!c.phenotype ||
					c.phenotype === "undefined",
			);

		if (isCorrupt) {
			const existingMap = buildExistingPartyMap(canonicalParty);
			canonicalParty = templates.map((tmpl) =>
				resolveCharacterRecord(tmpl, existingMap, phenotypes),
			);
		}
	}

	/**
	 * Initializes a fresh new game expedition state.
	 * [State Mutating]
	 * @returns {void}
	 */
	function startNewGame() {
		const win = getWin();
		const manifest = win.EmberlightManifest || {};
		const phenotypes = manifest.Phenotypes || {};

		const rosterTemplates = [
			{
				id: "hero",
				name: "Aldric",
				phenotype: "HERO",
				weapon: "IRON_SWORD",
				armor: "CLOTH_TUNIC",
			},
			{
				id: "warrior",
				name: "Brogan",
				phenotype: "WARRIOR",
				weapon: "IRON_SWORD",
				armor: "CHAINMAIL",
			},
			{
				id: "mage",
				name: "Selene",
				phenotype: "MAGE",
				weapon: "OAK_STAFF",
				armor: "MAGE_ROBE",
			},
			{
				id: "healer",
				name: "Wren",
				phenotype: "HEALER",
				weapon: "OAK_STAFF",
				armor: "MAGE_ROBE",
			},
		];

		canonicalParty = rosterTemplates.map((tmpl) =>
			resolveCharacterRecord(tmpl, new Map(), phenotypes),
		);

		canonicalGold = 100;
		canonicalInventory = { POTION: 3, ETHER: 1 };
		canonicalWorldPos = { x: 1, y: 1 };
		canonicalFlags = {};
		canonicalQuests = {
			TALL_GRASS: { stage: 0, completed: false },
			SEALED_PASS: { stage: 0, completed: false },
			CINDER_CATACLYSM: { stage: 0, completed: false },
			CRUCIBLE_IRON: { stage: 0, completed: false },
			LIGHT_SANCTUARY: { stage: 0, completed: false },
		};
		canonicalDungeonFloor = null;
		canonicalDungeonDepth = 0;
		canonicalSurfaceMap = null;
		canonicalSurfaceMutations = {};
		canonicalTownMutations = {};
		canonicalDungeonSpec = null;
		canonicalTownId = null;
		canonicalMacroPos = { x: 1, y: 1 };
		canonicalStepCounter = 0;
		lastInteractedChestPos = null;

		if (win.EmberlightSaveManager) {
			StorageManager.save();
		}
	}
	//#endregion

	//#region [SEC-04] Persistence Gateway & Storage Manager Delegation
	// --- Persistence Gateway ---
	const StorageManager = {
		get CURRENT_VERSION() {
			const win = getWin();
			return win.EmberlightSaveManager
				? win.EmberlightSaveManager.CURRENT_VERSION
				: "1.4.0";
		},

		get MIGRATIONS() {
			const win = getWin();
			return win.EmberlightSaveManager
				? win.EmberlightSaveManager.MIGRATIONS
				: {};
		},

		/**
		 * Migrates save payload to current version.
		 * [Pure Transformation]
		 * @param {Object} payload - Raw save payload.
		 * @returns {Object} Migrated payload.
		 */
		migrate(payload) {
			const win = getWin();
			if (win.EmberlightSaveManager) {
				return win.EmberlightSaveManager.migrate(payload);
			}
			return payload;
		},

		/**
		 * Checks if a local save record exists.
		 * [Pure Query]
		/**
		 * Checks if a save file exists.
		 * [Pure Query]
		 * @param {string} [slotId]
		 * @returns {boolean} Existence flag.
		 */
		hasSave(slotId) {
			const win = getWin();
			return Boolean(
				win.EmberlightSaveManager?.hasSave(slotId)
			);
		},

		/**
		 * Retrieves active save slot ID.
		 * @returns {string}
		 */
		getActiveSlotId() {
			return activeSlotId || "SLOT_1";
		},

		/**
		 * Sets active save slot ID.
		 * @param {string} slotId
		 * @returns {void}
		 */
		setActiveSlotId(slotId) {
			if (slotId) activeSlotId = String(slotId).toUpperCase();
		},

		/**
		 * Lists all save slot descriptors.
		 * @returns {Array<Object>}
		 */
		listSlots() {
			const win = getWin();
			return win.EmberlightSaveManager
				? win.EmberlightSaveManager.listSlots()
				: [];
		},

		/**
		 * Retrieves save metadata.
		 * [Pure Query]
		 * @param {string} [slotId]
		 * @returns {SaveMetadata|null} Save metadata or null.
		 */
		getSaveMetadata(slotId) {
			const win = getWin();
			return win.EmberlightSaveManager
				? win.EmberlightSaveManager.getSaveMetadata(slotId)
				: null;
		},

		/**
		 * Persists session snapshot to local storage.
		 * [State Mutating]
		 * @param {Object|string|((msg: string) => void)} [arg1] - Snapshot object, slotId string, or notification callback.
		 * @param {string|((msg: string) => void)} [arg2] - Optional slotId or notification callback.
		 * @param {((msg: string) => void)} [arg3] - Optional notification callback.
		 * @returns {boolean} Success assertion flag.
		 */
		save(arg1, arg2, arg3) {
			const win = getWin();
			if (!win.EmberlightSaveManager) {
				return false;
			}
			let snapshot;
			let targetSlot = activeSlotId || "SLOT_1";
			/** @type {((msg: string) => void) | null} */
			let notifyFn = null;

			if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
				snapshot = arg1;
			} else if (typeof arg1 === "string") {
				targetSlot = arg1;
				if (typeof arg2 === "function") notifyFn = arg2;
			} else if (typeof arg1 === "function") {
				notifyFn = arg1;
			}

			if (typeof arg2 === "string") {
				targetSlot = arg2;
				if (typeof arg3 === "function") notifyFn = arg3;
			}

			if (!snapshot) {
				snapshot = EmberlightSessionStore.getSnapshot();
			}

			const ok = win.EmberlightSaveManager.save(snapshot, targetSlot);
			if (ok) {
				activeSlotId = targetSlot;
				if (typeof notifyFn === "function") {
					notifyFn(`Archived to ${targetSlot}`);
				}
			}
			return ok;
		},

		/**
		 * Restores game state from save records.
		 * [State Mutating]
		 * @param {string|((msg: string) => void)} [arg1] - Slot ID or notification callback.
		 * @param {((msg: string) => void)} [arg2] - Notification callback if slotId passed as arg1.
		 * @returns {boolean} Success assertion flag.
		 */
		load(arg1, arg2) {
			const win = getWin();
			if (!win.EmberlightSaveManager) {
				console.warn(
					"[StorageManager] Load failed: EmberlightSaveManager is undefined.",
				);
				return false;
			}

			let targetSlot = null;
			/** @type {((msg: string) => void) | null} */
			let notifyFn = null;

			if (typeof arg1 === "string") {
				targetSlot = arg1;
				if (typeof arg2 === "function") notifyFn = arg2;
			} else if (typeof arg1 === "function") {
				notifyFn = arg1;
			}

			const payload = win.EmberlightSaveManager.load(targetSlot);
			if (!payload) return false;

			activeSlotId = payload.slotId || targetSlot || "SLOT_1";
			canonicalParty = payload.canonicalParty;
			sanitizeCanonicalParty();
			canonicalGold =
				typeof payload.canonicalGold === "number" ? payload.canonicalGold : 100;
			canonicalInventory = payload.canonicalInventory || {
				POTION: 4,
				ETHER: 2,
				PHOENIX_EMBER: 1,
			};
			canonicalWorldPos = payload.canonicalWorldPos || { x: 1, y: 1 };
			canonicalFlags = payload.canonicalFlags || {};
			canonicalQuests = payload.canonicalQuests || {};
			canonicalDungeonDepth =
				typeof payload.canonicalDungeonDepth === "number"
					? payload.canonicalDungeonDepth
					: 0;
			canonicalDungeonSpec = payload.canonicalDungeonSpec || null;
			canonicalSurfaceMutations = payload.canonicalSurfaceMutations || {};
			canonicalTownMutations = payload.canonicalTownMutations || {};
			canonicalSurfaceMap = null; // Reconstituted on demand
			canonicalDungeonFloor = null; // Reconstituted on demand
			canonicalTownId = payload.canonicalTownId || null;
			canonicalMacroPos = payload.canonicalMacroPos || { x: 1, y: 1 };
			canonicalStepCounter =
				typeof payload.canonicalStepCounter === "number"
					? payload.canonicalStepCounter
					: 0;

			if (typeof notifyFn === "function") {
				notifyFn(
					`Expedition restored from ${activeSlotId} (v${payload.version}).`,
				);
			}
			return true;
		},

		/**
		 * Deletes a specific save slot.
		 * @param {string} slotId
		 * @returns {boolean}
		 */
		deleteSlot(slotId) {
			const win = getWin();
			if (win.EmberlightSaveManager) {
				return win.EmberlightSaveManager.deleteSlot(slotId);
			}
			return false;
		},

		/**
		 * Clears local storage save records.
		 * [State Mutating]
		 * @param {string|((msg: string) => void)} [arg1] - Optional slot ID or notification callback.
		 * @param {((msg: string) => void)} [arg2] - Notification callback if slotId passed as arg1.
		 * @returns {void}
		 */
		clear(arg1, arg2) {
			let targetSlot = null;
			let notifyFn = null;
			if (typeof arg1 === "string") {
				targetSlot = arg1;
				if (typeof arg2 === "function") notifyFn = arg2;
			} else if (typeof arg1 === "function") {
				notifyFn = arg1;
			}

			const win = getWin();
			if (win.EmberlightSaveManager) {
				win.EmberlightSaveManager.clear(targetSlot);
			}
			if (typeof notifyFn === "function") {
				notifyFn(
					targetSlot ? `Slot ${targetSlot} wiped.` : "All archives cleared.",
				);
			}
		},
	};
	//#endregion

	//#region [SEC-05] Store Instance Public API Gateway & Global/CommonJS Module Export
	const storeInstance = {
		/**
		 * Retrieves a cloned snapshot of current session state.
		 * [Pure Query]
		 * @returns {SessionSnapshot} Cloned state snapshot.
		 */
		getSnapshot() {
			return structuredClone({
				party: canonicalParty,
				gold: canonicalGold,
				inventory: canonicalInventory,
				worldPos: canonicalWorldPos,
				flags: canonicalFlags,
				quests: canonicalQuests,
				dungeonDepth: canonicalDungeonDepth,
				dungeonFloor: canonicalDungeonFloor,
				dungeonSpec: canonicalDungeonSpec,
				surfaceMap: canonicalSurfaceMap,
				surfaceMutations: canonicalSurfaceMutations,
				townMutations: canonicalTownMutations,
				townId: canonicalTownId,
				macroPos: canonicalMacroPos,
				stepCounter: canonicalStepCounter,
				lastInteractedChestPos,
			});
		},

		// Getters
		/** @returns {PartyMemberRecord[]} */
		getParty: () => canonicalParty,
		/** @returns {number} */
		getGold: () => canonicalGold,
		/** @returns {Record<string, number>} */
		getInventory: () => canonicalInventory,
		/** @returns {{ x: number, y: number }} */
		getWorldPos: () => canonicalWorldPos,
		/** @returns {Record<string, any>} */
		getFlags: () => canonicalFlags,
		/**
		 * @param {string} key
		 * @returns {any}
		 */
		getFlag: (key) => (canonicalFlags ? canonicalFlags[key] : undefined),
		/** @returns {Record<string, any>} */
		getQuests: () => canonicalQuests,
		/** @returns {number} */
		getDungeonDepth: () => canonicalDungeonDepth,
		/** @returns {string[][]|null} */
		getDungeonFloor: () => canonicalDungeonFloor,
		/** @returns {Object|null} */
		getDungeonSpec: () => canonicalDungeonSpec,
		/** @returns {string[][]|null} */
		getSurfaceMap: () => canonicalSurfaceMap,
		/** @returns {Record<string, string>} */
		getSurfaceMutations: () => canonicalSurfaceMutations,
		/** @returns {Record<string, Record<string, string>>} */
		getTownMutations: () => canonicalTownMutations,
		/** @returns {string|null} */
		getTownId: () => canonicalTownId,
		/** @returns {{ x: number, y: number }} */
		getMacroPos: () => canonicalMacroPos,
		/** @returns {number} */
		getStepCounter: () => canonicalStepCounter,
		/** @returns {{ x: number, y: number }|null} */
		getLastInteractedChestPos: () => lastInteractedChestPos,

		// Setters & Transactional Mutators
		/**
		 * @param {PartyMemberRecord[]} party
		 * @returns {void}
		 */
		setParty(party) {
			if (Array.isArray(party)) {
				canonicalParty = party;
				sanitizeCanonicalParty();
			}
		},
		/**
		 * @param {number} gold
		 * @returns {void}
		 */
		setGold(gold) {
			if (typeof gold === "number") canonicalGold = Math.max(0, gold);
		},
		/**
		 * @param {number} delta
		 * @returns {number}
		 */
		modifyGold(delta) {
			canonicalGold = Math.max(0, canonicalGold + delta);
			return canonicalGold;
		},
		/**
		 * @param {Record<string, number>} inv
		 * @returns {void}
		 */
		setInventory(inv) {
			if (inv && typeof inv === "object") canonicalInventory = inv;
		},
		/**
		 * @param {string} itemId
		 * @param {number} delta
		 * @returns {number}
		 */
		modifyItem(itemId, delta) {
			canonicalInventory[itemId] = Math.max(
				0,
				(canonicalInventory[itemId] || 0) + delta,
			);
			return canonicalInventory[itemId];
		},
		/**
		 * @param {{ x: number, y: number }} pos
		 * @returns {void}
		 */
		setWorldPos(pos) {
			if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
				canonicalWorldPos = { x: pos.x, y: pos.y };
			}
		},
		/**
		 * @param {Record<string, any>} flags
		 * @returns {void}
		 */
		setFlags(flags) {
			if (flags && typeof flags === "object")
				canonicalFlags = { ...canonicalFlags, ...flags };
		},
		/**
		 * @param {string} key
		 * @param {any} val
		 * @returns {void}
		 */
		setFlag(key, val) {
			canonicalFlags[key] = val;
		},
		/**
		 * @param {Record<string, any>} quests
		 * @returns {void}
		 */
		setQuests(quests) {
			if (quests && typeof quests === "object")
				canonicalQuests = { ...canonicalQuests, ...quests };
		},
		/**
		 * @param {string} key
		 * @param {any} val
		 * @returns {void}
		 */
		setQuest(key, val) {
			canonicalQuests[key] = val;
		},
		/**
		 * @param {number} depth
		 * @returns {void}
		 */
		setDungeonDepth(depth) {
			canonicalDungeonDepth = depth;
		},
		/**
		 * @param {string[][]|null} floor
		 * @returns {void}
		 */
		setDungeonFloor(floor) {
			canonicalDungeonFloor = floor;
		},
		/**
		 * @param {Object|null} spec
		 * @returns {void}
		 */
		setDungeonSpec(spec) {
			canonicalDungeonSpec = spec;
		},
		/**
		 * @param {string[][]|null} map
		 * @returns {void}
		 */
		setSurfaceMap(map) {
			canonicalSurfaceMap = map;
		},
		/**
		 * @param {string|null} townId
		 * @returns {void}
		 */
		setTownId(townId) {
			canonicalTownId = townId;
		},
		/**
		 * @param {{ x: number, y: number }} pos
		 * @returns {void}
		 */
		setMacroPos(pos) {
			if (pos) canonicalMacroPos = { ...pos };
		},
		/**
		 * @param {number} cnt
		 * @returns {void}
		 */
		setStepCounter(cnt) {
			canonicalStepCounter = cnt;
		},
		/** @returns {number} */
		incrementStepCounter() {
			canonicalStepCounter++;
			return canonicalStepCounter;
		},
		/**
		 * @param {{ x: number, y: number }|null} pos
		 * @returns {void}
		 */
		setLastInteractedChestPos(pos) {
			lastInteractedChestPos = pos ? { ...pos } : null;
		},

		// Mutations
		recordTileMutation,
		/**
		 * @param {string} [_district]
		 * @param {string} [key]
		 * @param {any} [mutation]
		 */
		recordMutation(_district, key, mutation) {
			if (typeof key === "string" && key.includes(",")) {
				const [x, y] = key.split(",").map(Number);
				if (!Number.isNaN(x) && !Number.isNaN(y)) {
					recordTileMutation(x, y, mutation);
				}
			}
		},
		recordDungeonMutation,
		recordTownMutation,
		recordSurfaceMutation,
		sanitizeCanonicalParty,
		startNewGame,

		/**
		 * Commits session state.
		 * [State Mutating]
		 * @param {string} [reason] - Commit reason.
		 * @returns {boolean} Success flag.
		 */
		commit(reason) {
			if (reason) {
				// Reason acknowledged
			}
			return StorageManager.save();
		},

		// Persistence Delegation
		StorageManager,
	};

	sanitizeCanonicalParty();

	return storeInstance;
	//#endregion
})();

//#region [SEC-06] Global Environment & CommonJS Export
if (typeof window !== "undefined") {
	window.EmberlightSessionStore = EmberlightSessionStore;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightSessionStore;
}
//#endregion
