/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME PRESENTATION DOMAIN SUBSYSTEM
 * Document Identifier: VSRP-001-RUNTIME-PRESENTATION
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host Spatial Graphics & HUD Presentation Coordinator
 * ============================================================================
 */

if (typeof window !== "undefined") {
	window._RuntimeInternal = window._RuntimeInternal || {};
}

(() => {
	/**
	 * @param {any} [snapshot]
	 * @param {any} [deps]
	 * @returns {any}
	 */
	function buildOverworldSnapshot(snapshot, deps) {
		if (snapshot) return snapshot;
		const store = deps?.store;
		const currentTownId = deps?.getTownId ? deps.getTownId() : null;
		const inTown = Boolean(currentTownId);
		const pos = deps?.getWorldPos ? deps.getWorldPos() : { x: 10, y: 10 };
		return {
			party: deps?.getParty ? deps.getParty() : [],
			gold: deps?.getGold ? deps.getGold() : 0,
			inventory: deps?.getInventory ? deps.getInventory() : {},
			worldPos: pos,
			playerPos: { ...pos, inTown, townId: currentTownId },
			map: deps?.getActiveWorldMap ? deps.getActiveWorldMap() : null,
			macroPos: deps?.getMacroPos ? deps.getMacroPos() : { x: 1, y: 1 },
			activeDistrict: "OVERWORLD",
			dungeonFloor: deps?.getDungeonFloor ? deps.getDungeonFloor() : 1,
			dungeonDepth: deps?.getDungeonDepth ? deps.getDungeonDepth() : 0,
			stepCounter: deps?.stepCounter || 0,
			flags: deps?.getFlags ? deps.getFlags() : {},
			facing: store?.getFlag("facingDirection") || "DOWN",
			pouchOpen: store?.getFlag("pouchOpen") || false,
			townId: currentTownId,
			inTown,
		};
	}

	/**
	 * @param {any} [deps]
	 */
	function renderDynamicLights(deps) {
		if (typeof EmberlightDynamicLights === "undefined") return;
		const pos = deps?.getWorldPos ? deps.getWorldPos() : { x: 10, y: 10 };
		if (typeof EmberlightDynamicLights.setTargetPosition === "function") {
			EmberlightDynamicLights.setTargetPosition(pos.x, pos.y);
		}
		if (typeof EmberlightDynamicLights.setMap === "function") {
			EmberlightDynamicLights.setMap(deps?.getActiveWorldMap ? deps.getActiveWorldMap() : null, deps?.getDungeonDepth ? deps.getDungeonDepth() : 0);
		}
	}

	/**
	 * Renders overworld peripheral map, dynamic lights, and pseudo-3D viewport.
	 * @param {any} [snapshot]
	 * @param {any} [deps]
	 * @returns {void}
	 */
	function renderOverworldGraphics(snapshot, deps) {
		const snap = buildOverworldSnapshot(snapshot, deps);

		if (typeof EmberlightMapRenderer !== "undefined" && typeof EmberlightMapRenderer.renderOverworld === "function") {
			EmberlightMapRenderer.renderOverworld(snap, deps?.handleCockpitAction);
		} else if (typeof EmberlightOverworldRenderer !== "undefined" && typeof EmberlightOverworldRenderer.renderOverworld === "function") {
			EmberlightOverworldRenderer.renderOverworld(snap);
		}

		renderDynamicLights(deps);

		if (typeof EmberlightPseudo3D !== "undefined" && typeof EmberlightPseudo3D.render === "function") {
			EmberlightPseudo3D.render(snap);
		}
	}

	/**
	 * @param {{ x: number, y: number }} currentPos
	 * @param {string} facing
	 * @param {any} deps
	 */
	function calculateFacingContext(currentPos, facing, deps) {
		/** @type {Record<string, { x: number, y: number }>} */
		const deltas = {
			UP: { x: 0, y: -1 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
			RIGHT: { x: 1, y: 0 },
		};
		const d = deltas[facing] || { x: 0, y: 1 };
		const facingPos = { x: currentPos.x + d.x, y: currentPos.y + d.y };
		const worldMap = deps.getActiveWorldMap ? deps.getActiveWorldMap() : null;
		const facingTile = worldMap?.[facingPos.y]?.[facingPos.x] || null;
		const facingPrompt = deps.getFacingInteractablePrompt ? deps.getFacingInteractablePrompt(facingTile) : null;
		return { facingPos, facingTile, facingPrompt, worldMap };
	}

	/**
	 * Renders the top HUD, Cockpit mini-HUD, and spatial overlay projections.
	 * @param {any} deps
	 * @returns {void}
	 */
	function renderHUD(deps) {
		const currentPos = deps.getWorldPos ? deps.getWorldPos() : { x: 10, y: 10 };
		const currentTownId = deps.getTownId ? deps.getTownId() : null;
		const inTown = Boolean(currentTownId);
		const store = deps.store;
		const facing = store?.getFlag("facingDirection") || "DOWN";
		const { facingPos, facingTile, facingPrompt, worldMap } = calculateFacingContext(currentPos, facing, deps);

		const snapshot = {
			party: deps.getParty ? deps.getParty() : [],
			gold: deps.getGold ? deps.getGold() : 0,
			inventory: deps.getInventory ? deps.getInventory() : {},
			worldPos: currentPos,
			playerPos: { ...currentPos, inTown, townId: currentTownId },
			map: worldMap,
			macroPos: deps.getMacroPos ? deps.getMacroPos() : { x: 1, y: 1 },
			activeDistrict: deps.activeDistrict,
			dungeonFloor: deps.getDungeonFloor ? deps.getDungeonFloor() : 1,
			dungeonDepth: deps.getDungeonDepth ? deps.getDungeonDepth() : 0,
			stepCounter: deps.stepCounter || 0,
			flags: { ...(deps.getFlags ? deps.getFlags() : {}), in_town: inTown, townId: currentTownId },
			facing,
			pouchOpen: store?.getFlag("pouchOpen") || false,
			facingPos,
			facingTile,
			facingPrompt,
			townId: currentTownId,
			inTown,
		};

		const Cockpit = typeof EmberlightCockpitRenderer !== "undefined" ? /** @type {any} */ (EmberlightCockpitRenderer) : null;
		if (Cockpit?.render) {
			Cockpit.render(snapshot, deps.handleCockpitAction);
		} else if (Cockpit?.renderCockpit) {
			Cockpit.renderCockpit(snapshot, deps.handleCockpitAction);
		}

		if (deps.activeDistrict === "COMBAT") {
			if (typeof EmberlightCombat !== "undefined" && typeof EmberlightCombat.render === "function") {
				EmberlightCombat.render(typeof EmberlightCombatRenderer !== "undefined" ? EmberlightCombatRenderer : null);
			}
		} else if (deps.activeDistrict !== "TITLE" && deps.activeDistrict !== "GAME_OVER") {
			renderOverworldGraphics(snapshot, deps);
		}
	}

	/**
	 * Triggers the visual zone transition banner overlay.
	 * @param {string} title
	 * @param {string} subtitle
	 * @returns {void}
	 */
	function triggerZoneTransition(title, subtitle) {
		if (typeof document === "undefined") return;
		const overlay = document.getElementById("zone-transition-overlay");
		const titleEl = document.getElementById("zone-transition-title");
		const subEl = document.getElementById("zone-transition-subtitle");
		if (titleEl) titleEl.textContent = title;
		if (subEl) subEl.textContent = subtitle;
		if (overlay) {
			overlay.classList.remove("hidden");
			setTimeout(() => {
				overlay.classList.add("hidden");
			}, 1100);
		}
	}

	/**
	 * @param {boolean} inTown
	 * @param {number} depth
	 * @returns {string}
	 */
	function getWallTitle(inTown, depth) {
		if (inTown) return "🪵 Timber Wall";
		if (depth > 0) return "🏔️ Bedrock Wall";
		return "🏔️ Stone Wall";
	}

	/**
	 * @param {boolean} inTown
	 * @param {number} depth
	 * @returns {string}
	 */
	function getSectorTitle(inTown, depth) {
		if (inTown) return "🏰 Oakhaven Hamlet";
		if (depth > 0) return `💀 Catacombs (F${depth})`;
		return "🌲 The Ashen Wilds";
	}

	/**
	 * @param {string} tile
	 * @param {boolean} inTown
	 * @param {number} depth
	 * @param {any} tileInfo
	 * @returns {any}
	 */
	function getCartographyTileMeta(tile, inTown, depth, tileInfo) {
		const campAction = {
			id: "REST",
			label: "Camp",
			icon: "🔥",
			title: "Camp Rest",
			desc: "Rest at camp to restore party vitality.",
		};

		switch (tile) {
			case "~":
				return {
					category: "HAZARD",
					title: "💧 Abyssal Frozen Route",
					hpPct: 100,
					accent: "#38bdf8",
					glow: "rgba(56, 189, 248, 0.45)",
					badge1: "WATER",
					badge2: "FREEZE VIABLE",
					eastAction: {
						id: "FIELD_FREEZE",
						label: "Freeze",
						icon: "❄️",
						title: "Glacial Transmutation",
						desc: "Freeze water into solid walkable frozen path.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case '"':
				return {
					category: "HAZARD",
					title: "🌿 Dry Bramble",
					hpPct: 100,
					accent: "#f97316",
					glow: "rgba(249, 115, 22, 0.45)",
					badge1: "OBSTACLE",
					badge2: "SCORCH VIABLE",
					eastAction: {
						id: "FIELD_SCORCH",
						label: "Scorch",
						icon: "🔥",
						title: "Pyretic Scorch",
						desc: "Incinerate dry brush into ash.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "%":
				return {
					category: "HAZARD",
					title: "☠️ Miasma Rift",
					hpPct: 100,
					accent: "#c084fc",
					glow: "rgba(192, 132, 252, 0.45)",
					badge1: "HAZARD",
					badge2: "DISPEL VIABLE",
					eastAction: {
						id: "FIELD_DISPEL",
						label: "Dispel",
						icon: "✨",
						title: "Purifying Aether Dispel",
						desc: "Disperse noxious miasma fumes.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "*":
				return {
					category: "RESOURCE",
					title: "💎 Resource Cache",
					hpPct: 100,
					accent: "#fbbf24",
					glow: "rgba(251, 191, 36, 0.45)",
					badge1: "DISCOVERY",
					badge2: "LOOTABLE",
					eastAction: {
						id: "SCAVENGE",
						label: "Loot",
						icon: "💎",
						title: "Scavenge Cache",
						desc: "Harvest raw gemstones and gold bullion.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "D":
				return {
					category: "STRUCTURE",
					title: "🏰 Oakhaven Gate",
					hpPct: 100,
					accent: "#4ade80",
					glow: "rgba(74, 222, 128, 0.45)",
					badge1: "TOWN",
					badge2: "SANCTUARY",
					eastAction: {
						id: "ENTER_TOWN",
						label: "Enter",
						icon: "🏰",
						title: "Enter Oakhaven",
						desc: "Step through the palisade into Oakhaven Hamlet.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "O":
				return {
					category: "STRUCTURE",
					title: "🚪 Town Exit Gate",
					hpPct: 100,
					accent: "#4ade80",
					glow: "rgba(74, 222, 128, 0.45)",
					badge1: "EXIT",
					badge2: "WILDERNESS",
					eastAction: {
						id: "EXIT_TOWN",
						label: "Exit",
						icon: "🌲",
						title: "Exit to Wilds",
						desc: "Pass beyond the palisade gates into the wilderness.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "H":
				return {
					category: "LANDMARK",
					title: "🏨 The Hearth Inn",
					hpPct: 100,
					accent: "#fb923c",
					glow: "rgba(251, 146, 60, 0.45)",
					badge1: "SANCTUARY",
					badge2: "REST 100%",
					eastAction: {
						id: "INN_REST",
						label: "Rest",
						icon: "🏨",
						title: "Rest at Hearth Inn",
						desc: "Fully restore HP/MP and cleanse status ailments.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "A":
				return {
					category: "LANDMARK",
					title: "✨ Ancient Aether Shrine",
					hpPct: 100,
					accent: "#a855f7",
					glow: "rgba(168, 85, 247, 0.45)",
					badge1: "AETHER",
					badge2: "MP RESTORE",
					eastAction: {
						id: "SHRINE_COMMUNE",
						label: "Commune",
						icon: "✨",
						title: "Commune with Shrine",
						desc: "Restore mana points and attune to ancient leylines.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			case "N":
				return {
					category: "LANDMARK",
					title: "📋 Town Notice Board",
					hpPct: 100,
					accent: "#fde047",
					glow: "rgba(253, 224, 71, 0.45)",
					badge1: "DISCOVERY",
					badge2: "QUESTS",
					eastAction: {
						id: "READ_BOARD",
						label: "Read",
						icon: "📋",
						title: "Read Notices",
						desc: "Inspect town announcements and regional bounties.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
			default:
				return {
					category: "TERRAIN",
					title: tile === "#" ? getWallTitle(inTown, depth) : "🌿 Open Wilderness Terrain",
					hpPct: 100,
					accent: "#94a3b8",
					glow: "rgba(148, 163, 184, 0.35)",
					badge1: tile === "#" ? "IMPASSABLE" : "WALKABLE",
					badge2: getSectorTitle(inTown, depth),
					eastAction: {
						id: "INSPECT",
						label: "Inspect",
						icon: "🔍",
						title: "Sector Survey",
						desc: "Scan local aetheric currents and terrain features.",
					},
					southAction: campAction,
					bbox: tileInfo?.bbox,
				};
		}
	}

	const RuntimePresentation = {
		renderOverworldGraphics,
		renderHUD,
		triggerZoneTransition,
		getWallTitle,
		getSectorTitle,
		getCartographyTileMeta,
	};

	if (typeof window !== "undefined") {
		window._RuntimeInternal = window._RuntimeInternal || {};
		window._RuntimeInternal.Presentation = RuntimePresentation;
	}

	if (typeof module !== "undefined") {
		module.exports = RuntimePresentation;
	}
})();
