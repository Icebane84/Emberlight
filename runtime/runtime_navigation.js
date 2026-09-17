/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: RUNTIME NAVIGATION & VIEWPORT SUBSYSTEM
 * Document Identifier: VSRP-001-RUNTIME-NAVIGATION
 * Governing Protocol:  VSRP-001 / MPFS-001 / SDCP-001
 * Authority:           Host District Switching, Viewport Expansion & Radial Kinematics
 * ============================================================================
 */

if (typeof window !== "undefined") {
	window._RuntimeInternal = window._RuntimeInternal || {};
}

(() => {
	let isQ4DeckExpanded = false;
	let is3DViewExpanded = false;
	let focalRingActive = false;

	const NON_EXPANDABLE_DISTRICTS = new Set(["COMBAT", "TITLE", "GAME_OVER"]);

	const rmbEngine = {
		isDown: false,
		originX: 0,
		originY: 0,
		targetCenterX: 0,
		targetCenterY: 0,
		flickArmed: false,
		activeMeta: /** @type {Object|null} */ (null),
		highlightedLeaf: /** @type {string|null} */ (null),
	};

	/**
	 * @param {string} d
	 * @returns {boolean}
	 */
	function isNonExpandableDistrict(d) {
		return NON_EXPANDABLE_DISTRICTS.has(d);
	}

	/**
	 * @param {string} d
	 * @returns {string}
	 */
	function normalizeDistrictName(d) {
		if (!d) return "OVERWORLD";
		const upper = String(d).toUpperCase();
		if (upper === "WORLD") return "OVERWORLD";
		if (upper === "FORGE") return "RELIC_FORGE";
		if (upper === "SHOP") return "MARKET";
		if (upper === "AUDIT") return "AUDITOR";
		if (upper === "CONFIG") return "SETTINGS";
		if (upper === "GEAR") return "ARMORY";
		if (upper === "JOURNAL") return "CHRONICLE";
		if (upper === "SKILLS") return "PROGRESSION";
		return upper;
	}

	/** @param {boolean} expanded */
	function updateQ4DOM(expanded) {
		if (typeof document === "undefined") return;
		const matrix = document.getElementById("war-table-matrix");
		const rig = document.getElementById("expedition-rig");
		const btn = document.getElementById("q4-expand-btn");
		const expandLabel = btn ? btn.querySelector(".expand-label") : null;

		if (matrix) matrix.classList.toggle("q4-expanded-deck", expanded);
		if (rig) rig.classList.toggle("q4-expanded-deck", expanded);
		if (btn) btn.classList.toggle("expanded", expanded);
		if (expandLabel) {
			expandLabel.textContent = expanded ? "COLLAPSE [Z]" : "EXPAND [Z]";
		}
	}

	/**
	 * @param {boolean} [forceState]
	 * @param {any} [deps]
	 * @returns {void}
	 */
	function toggleQ4DeckExpansion(forceState, deps) {
		const activeDistrict = deps?.activeDistrict || "OVERWORLD";
		if (forceState !== false && isNonExpandableDistrict(activeDistrict)) return;

		isQ4DeckExpanded = typeof forceState === "boolean" ? forceState : !isQ4DeckExpanded;
		if (isQ4DeckExpanded && is3DViewExpanded) {
			toggle3DViewportExpansion(false, deps);
		}

		updateQ4DOM(isQ4DeckExpanded);

		if (typeof EmberlightCockpitRenderer !== "undefined" && typeof EmberlightCockpitRenderer.setExpanded === "function") {
			EmberlightCockpitRenderer.setExpanded(isQ4DeckExpanded, is3DViewExpanded);
		}
		if (typeof EmberlightInput !== "undefined" && typeof EmberlightInput.clear === "function") {
			EmberlightInput.clear();
		}
		if (activeDistrict !== "OVERWORLD" && !isNonExpandableDistrict(activeDistrict)) {
			if (deps?.switchDistrict) deps.switchDistrict(activeDistrict);
		}
		if (deps?.renderHUD) deps.renderHUD();
	}

	/** @param {boolean} expanded */
	function update3DDOM(expanded) {
		if (typeof document === "undefined") return;
		const matrix = document.getElementById("war-table-matrix");
		const rig = document.getElementById("expedition-rig");
		const btn = document.getElementById("q2-expand-btn");
		const expandLabel = btn ? btn.querySelector(".expand-label") : null;

		if (matrix) matrix.classList.toggle("q2-immersion-deck", expanded);
		if (rig) rig.classList.toggle("q2-immersion-deck", expanded);
		if (btn) btn.classList.toggle("expanded", expanded);
		if (expandLabel) {
			expandLabel.textContent = expanded ? "2D MAP [X]" : "3D VIEW [X]";
		}
	}

	/**
	 * @param {boolean} [forceState]
	 * @param {any} [deps]
	 * @returns {void}
	 */
	function toggle3DViewportExpansion(forceState, deps) {
		const activeDistrict = deps?.activeDistrict || "OVERWORLD";
		if (forceState !== false && isNonExpandableDistrict(activeDistrict)) return;

		is3DViewExpanded = typeof forceState === "boolean" ? forceState : !is3DViewExpanded;
		if (is3DViewExpanded && isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false, deps);
		}

		update3DDOM(is3DViewExpanded);

		const pseudo3d =
			(typeof EmberlightPseudo3D !== "undefined" && EmberlightPseudo3D) ||
			(typeof EmberlightCorridorSensor !== "undefined" && EmberlightCorridorSensor) ||
			null;
		if (pseudo3d && typeof (/** @type {any} */ (pseudo3d)).setExpanded === "function") {
			(/** @type {any} */ (pseudo3d)).setExpanded(is3DViewExpanded);
		}

		if (typeof EmberlightCockpitRenderer !== "undefined" && typeof EmberlightCockpitRenderer.setExpanded === "function") {
			EmberlightCockpitRenderer.setExpanded(isQ4DeckExpanded, is3DViewExpanded);
		}
		if (typeof EmberlightInput !== "undefined" && typeof EmberlightInput.clear === "function") {
			EmberlightInput.clear();
		}
		if (activeDistrict !== "OVERWORLD" && !isNonExpandableDistrict(activeDistrict)) {
			deps?.switchDistrict?.(activeDistrict);
		}
		deps?.renderHUD?.();
	}

	/**
	 * Cancels targeting/pending skill in combat if possible.
	 * @param {any} deps
	 * @returns {boolean}
	 */
	function cancelCombatState(deps) {
		if (deps.activeDistrict !== "COMBAT") return false;
		if (typeof EmberlightCombat === "undefined" || typeof EmberlightCombat.getState !== "function") {
			return false;
		}
		const cState = EmberlightCombat.getState();
		const canCancel =
			cState?.phase === "TARGETING_ENEMY" ||
			cState?.phase === "TARGETING_ALLY" ||
			cState?.phase === "PENDING_SKILL" ||
			(cState?.selectedTab && cState.selectedTab !== "ATTACK");
		if (canCancel) {
			if (typeof EmberlightCombat.handleHostAction === "function") {
				EmberlightCombat.handleHostAction("CANCEL");
			}
			if (deps.renderHUD) deps.renderHUD();
			return true;
		}
		return false;
	}

	/**
	 * Priority 1 Universal Unwind handler for ESC / RMB.
	 * @param {any} deps
	 * @returns {boolean}
	 */
	function handleCancelAction(deps) {
		if (focalRingActive) {
			dismissTacticalChassis();
			return true;
		}
		if (cancelCombatState(deps)) return true;
		if (deps.isSaveLoadModalOpen) {
			if (deps.closeSaveLoadModal) deps.closeSaveLoadModal();
			return true;
		}
		const store = deps.store;
		if (store?.getFlag("pouchOpen")) {
			store.setFlag("pouchOpen", false);
			if (deps.renderHUD) deps.renderHUD();
			return true;
		}
		if (isQ4DeckExpanded) {
			toggleQ4DeckExpansion(false, deps);
			return true;
		}
		if (is3DViewExpanded) {
			toggle3DViewportExpansion(false, deps);
			return true;
		}
		if (deps.activeDistrict !== "OVERWORLD" && deps.activeDistrict !== "TITLE" && deps.activeDistrict !== "world") {
			deps.switchDistrict("OVERWORLD");
			return true;
		}
		if (deps.activeDistrict === "OVERWORLD" || deps.activeDistrict === "world") {
			deps.switchDistrict("SETTINGS");
			return true;
		}
		return false;
	}

	/**
	 * Calculates cardinal polar direction from delta vector (dx, dy).
	 * @param {number} dx
	 * @param {number} dy
	 * @returns {'NORTH'|'EAST'|'SOUTH'|'WEST'}
	 */
	function calculatePolarDirection(dx, dy) {
		const angle = Math.atan2(dy, dx);
		if (angle >= -Math.PI * 0.75 && angle < -Math.PI * 0.25) return "NORTH";
		if (angle >= -Math.PI * 0.25 && angle < Math.PI * 0.25) return "EAST";
		if (angle >= Math.PI * 0.25 && angle < Math.PI * 0.75) return "SOUTH";
		return "WEST";
	}

	/**
	 * Dismisses the tactical focal ring chassis and clears active RMB state.
	 * @returns {void}
	 */
	function dismissTacticalChassis() {
		focalRingActive = false;
		rmbEngine.isDown = false;
		rmbEngine.flickArmed = false;
		rmbEngine.activeMeta = null;
		rmbEngine.highlightedLeaf = null;
		const Cockpit = typeof EmberlightCockpitRenderer !== "undefined" ? /** @type {any} */ (EmberlightCockpitRenderer) : null;
		if (Cockpit && typeof Cockpit.dismissTacticalChassis === "function") {
			Cockpit.dismissTacticalChassis();
		}
		if (typeof EmberlightMapRenderer !== "undefined" && typeof EmberlightMapRenderer.clearTargetedTile === "function") {
			EmberlightMapRenderer.clearTargetedTile();
		}
	}

	/**
	 * Resolves combat target metadata.
	 * @param {EventTarget|HTMLElement|null|any} target
	 * @param {number} clientX
	 * @param {number} clientY
	 * @returns {any}
	 */
	function resolveCombatTargetMetadata(target, clientX, clientY) {
		const el = /** @type {HTMLElement|null} */ (target);
		const enemyCard = el?.closest?.(".enemy-battler-card, .battler-card.enemy, .enemy-card");
		const allyCard = el?.closest?.(".hero-battler-card, .battler-card.hero, .hero-card");

		if (enemyCard) {
			const nameEl = enemyCard.querySelector(".enemy-name, .battler-name, .name");
			return {
				category: "ENEMY",
				title: nameEl?.textContent || "Hostile Combatant",
				hpPct: 100,
				accent: "#ef4444",
				glow: "rgba(239, 68, 68, 0.45)",
				badge1: "HOSTILE",
				badge2: "VULNERABLE",
				eastAction: {
					id: "THREAT_ORACLE",
					label: "Oracle",
					icon: "👁️",
					title: "Threat Oracle",
					desc: "Forecast enemy strike vectors and vulnerabilities.",
				},
				southAction: {
					id: "COMBAT_GUARD",
					label: "Guard",
					icon: "🛡️",
					title: "Defensive Stance",
					desc: "Brace for incoming hostile impact.",
				},
				targetDom: enemyCard,
			};
		}

		if (allyCard) {
			const nameEl = allyCard.querySelector(".hero-name, .battler-name, .name");
			return {
				category: "ALLY",
				title: nameEl?.textContent || "Vanguard Hero",
				hpPct: 100,
				accent: "#34d399",
				glow: "rgba(52, 211, 153, 0.45)",
				badge1: "VANGUARD",
				badge2: "ALLIED HERO",
				eastAction: {
					id: "FIELD_TRIAGE",
					label: "Triage",
					icon: "✨",
					title: "Field Triage",
					desc: "Direct restorative attention to this vanguard unit.",
				},
				southAction: {
					id: "COMBAT_GUARD",
					label: "Guard",
					icon: "🛡️",
					title: "Defensive Stance",
					desc: "Brace for incoming hostile impact.",
				},
				targetDom: allyCard,
			};
		}

		return {
			category: "COMBAT_GENERAL",
			title: "Tactical Arena",
			hpPct: 100,
			accent: "#ff9d4d",
			glow: "rgba(255, 157, 77, 0.45)",
			badge1: "ARENA",
			badge2: "ENGAGED",
			eastAction: {
				id: "THREAT_ORACLE",
				label: "Oracle",
				icon: "👁️",
				title: "Threat Oracle",
				desc: "Forecast battlefield threat vectors.",
			},
			southAction: {
				id: "COMBAT_GUARD",
				label: "Guard",
				icon: "🛡️",
				title: "Defensive Stance",
				desc: "Brace for incoming hostile impact.",
			},
			bbox: {
				left: clientX - 24,
				top: clientY - 24,
				width: 48,
				height: 48,
			},
		};
	}

	/**
	 * Resolves sensor target metadata for 3D view.
	 * @param {EventTarget|HTMLElement|null|any} target
	 * @param {number} clientX
	 * @param {number} clientY
	 * @param {boolean} [expanded3D]
	 * @param {any} [deps]
	 * @returns {any}
	 */
	function resolveSensorTargetMetadata(target, clientX, clientY, expanded3D, deps) {
		const el = /** @type {HTMLElement|null} */ (target);
		const isSensorPane = expanded3D || Boolean(el?.closest?.("#pane-sensor, #corridor-canvas, .sensor-viewport, .corridor-viewport"));
		if (!isSensorPane) return null;

		const store = deps?.store;
		const facing = store?.getFlag("facingDirection") || "DOWN";
		const pos = deps?.getWorldPos ? deps.getWorldPos() : { x: 1, y: 1 };
		const map = deps?.getActiveWorldMap ? deps.getActiveWorldMap() : [];
		const inTown = Boolean(deps?.getTownId ? deps.getTownId() : null);
		const depth = deps?.getDungeonDepth ? deps.getDungeonDepth() : 0;

		/** @type {Record<string, { x: number, y: number }>} */
		const facingDeltas = {
			UP: { x: 0, y: -1 },
			RIGHT: { x: 1, y: 0 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
		};
		const d = facingDeltas[facing] || { x: 0, y: 1 };
		const aheadPos = { x: pos.x + d.x, y: pos.y + d.y };
		const aheadTile = map[aheadPos.y]?.[aheadPos.x] || "#";

		const RuntimePres = (typeof window !== "undefined" && window._RuntimeInternal?.Presentation) || {};
		/**
		 * @param {boolean} t
		 * @param {number} dp
		 */
		const defaultWallTitle = (t, dp) => {
			if (t) return "🪵 Timber Wall";
			return dp > 0 ? "🏔️ Bedrock Wall" : "🏔️ Stone Wall";
		};
		const getWallTitle = (/** @type {any} */ (RuntimePres)).getWallTitle || defaultWallTitle;


		/** @type {Record<string, { title: string, icon: string, desc: string, isAdvance: boolean }>} */
		const tileDescriptions = {
			"#": {
				title: getWallTitle(inTown, depth),
				icon: "🧱",
				desc: "Solid perimeter barrier. Acoustic damping detected.",
				isAdvance: false,
			},
			D: {
				title: "🏰 Oakhaven Gate",
				icon: "🏰",
				desc: "Settlement entrance gate. Sanctuary boundary.",
				isAdvance: true,
			},
			O: {
				title: "🚪 Town Exit Gate",
				icon: "🌲",
				desc: "Palisade exit leading back to the Ashen Wilds.",
				isAdvance: true,
			},
			H: {
				title: "🏨 The Hearth Inn",
				icon: "🏨",
				desc: "Village hostel offering vital recovery and respite.",
				isAdvance: true,
			},
			A: {
				title: "✨ Ancient Aether Shrine",
				icon: "✨",
				desc: "Mystic monument vibrating with raw mana currents.",
				isAdvance: true,
			},
			N: {
				title: "📋 Town Notice Board",
				icon: "📋",
				desc: "Parchment bulletin listing quests and regional rumors.",
				isAdvance: true,
			},
			E: {
				title: "🧓 Elder Rowan",
				icon: "🧓",
				desc: "Village elder possessing deep narrative lore.",
				isAdvance: true,
			},
			"@": {
				title: "🧙 Morwen the Weaver",
				icon: "🧙",
				desc: "Arcane scholar specializing in dimensional warp craft.",
				isAdvance: true,
			},
			V: {
				title: "🏮 Merchant Caravan",
				icon: "🏮",
				desc: "Traveling market offering wares, consumables, and gear.",
				isAdvance: true,
			},
			F: {
				title: "⚒️ Ashen Relic Forge",
				icon: "⚒️",
				desc: "Subterranean workstation for socketing and forging relics.",
				isAdvance: true,
			},
			$: {
				title: "📦 Supply Crate",
				icon: "📦",
				desc: "Lootable field cache containing provisions or munitions.",
				isAdvance: true,
			},
			C: {
				title: "🧰 Subterranean Chest",
				icon: "🧰",
				desc: "Locked subterranean strongbox with harmonic resonance seal.",
				isAdvance: true,
			},
			">": {
				title: "🪜 Catacombs Descent",
				icon: "🪜",
				desc: "Carved stone stairs descending into the deeper dungeon.",
				isAdvance: true,
			},
			"<": {
				title: "🪜 Surface Ascent",
				icon: "🪜",
				desc: "Carved stone stairs leading upward to the surface.",
				isAdvance: true,
			},
			B: {
				title: "💀 Malakor the Undying",
				icon: "💀",
				desc: "Ancient lord of the catacombs. Extreme hazard level.",
				isAdvance: true,
			},
			T: {
				title: "🌲 Ashen Forest Canopy",
				icon: "🌲",
				desc: "Dense woodland foliage. Slow traversal.",
				isAdvance: true,
			},
			M: {
				title: "🏔️ Craggy Mountain Wall",
				icon: "🏔️",
				desc: "Impassable mountain boundary. Acoustic damping detected.",
				isAdvance: false,
			},
			"~": {
				title: "🌊 Murmuring Stream",
				icon: "🌊",
				desc: "Shallow watercourse. Wet terrain.",
				isAdvance: true,
			},
			'"': {
				title: "🌾 Whispering Grass",
				icon: "🌾",
				desc: "Open plains terrain. Clear pathway forward.",
				isAdvance: true,
			},
			"*": {
				title: "🌿 Wild Herb Cluster",
				icon: "🌿",
				desc: "Lootable flora containing medicinal crafting components.",
				isAdvance: true,
			},
			"%": {
				title: "☠️ Miasma Hazard",
				icon: "☠️",
				desc: "Toxic necrotic gas pocket. High corruption damage.",
				isAdvance: true,
			},
			".": {
				title: inTown ? "🛤️ Cobblestone Plaza" : "🌲 Ashen Wildway",
				icon: inTown ? "🛤️" : "🌲",
				desc: "Open navigable terrain. Forward advance clear.",
				isAdvance: true,
			},
		};

		const info = tileDescriptions[aheadTile] || tileDescriptions["."];
		const northLabel = info.isAdvance ? "Advance" : "Inspect";
		const northIcon = info.isAdvance ? "👣" : "🔍";
		let badge2 = "WILDERNESS";
		if (inTown) badge2 = "SETTLEMENT";
		else if (depth > 0) badge2 = `CATACOMBS F${depth}`;

		return {
			category: "3D_SENSOR",
			title: `3D View: ${info.title}`,
			hpPct: 100,
			accent: "#38bdf8",
			glow: "rgba(56, 189, 248, 0.45)",
			badge1: `FACING ${facing}`,
			badge2,
			northAction: {
				id: "3D_ADVANCE",
				label: northLabel,
				icon: northIcon,
				title: `${northLabel} Forward`,
				desc: info.isAdvance ? `Step forward into (${aheadPos.x}, ${aheadPos.y}).` : `Inspect ${info.title} ahead.`,
			},
			eastAction: {
				id: "3D_DEEP_SCAN",
				label: "Deep Scan",
				icon: "📡",
				title: "Acoustic / Optical Scan",
				desc: info.desc,
			},
			southAction: {
				id: "3D_ABOUT_FACE",
				label: "Turn 180°",
				icon: "🔄",
				title: "Tactical Turnabout",
				desc: "Turn around 180 degrees to face the opposite direction.",
			},
			westAction: {
				id: "3D_TOGGLE_EXPAND",
				label: is3DViewExpanded ? "Collapse" : "Expand 3D",
				icon: is3DViewExpanded ? "🔲" : "🔳",
				title: is3DViewExpanded ? "Collapse Viewport" : "Expand 3D Immersion",
				desc: is3DViewExpanded ? "Collapse back to standard War Table matrix layout." : "Expand 3D viewport across top quadrant matrix.",
			},
			bbox: {
				left: clientX - 24,
				top: clientY - 24,
				width: 48,
				height: 48,
			},
		};
	}

	/**
	 * @param {number} clientX
	 * @param {number} clientY
	 * @param {any} [deps]
	 * @returns {any}
	 */
	function resolveCartographyTargetMetadata(clientX, clientY, deps) {
		if (typeof EmberlightMapRenderer === "undefined" || typeof EmberlightMapRenderer.resolveTileFromScreen !== "function") {
			return null;
		}
		const tileInfo = EmberlightMapRenderer.resolveTileFromScreen(clientX, clientY);
		if (!tileInfo) return null;

		const currentTownId = deps?.getTownId ? deps.getTownId() : null;
		const inTown = Boolean(currentTownId);
		const depth = deps?.getDungeonDepth ? deps.getDungeonDepth() : 0;
		const RuntimePres = (typeof window !== "undefined" && window._RuntimeInternal?.Presentation) || {};
		const getCartographyTileMeta = (/** @type {any} */ (RuntimePres)).getCartographyTileMeta;

		if (getCartographyTileMeta) {
			const tileMeta = getCartographyTileMeta(tileInfo.tile, inTown, depth, tileInfo);
			if (tileMeta) {
				tileMeta.tileX = tileInfo.tileX;
				tileMeta.tileY = tileInfo.tileY;
				return tileMeta;
			}
		}
		return null;
	}

	/**
	 * @param {EventTarget|null} target
	 * @param {number} [clientX=0]
	 * @param {number} [clientY=0]
	 * @param {any} [deps]
	 * @returns {Object|null}
	 */
	function resolveTargetMetadata(target, clientX = 0, clientY = 0, deps = {}) {
		if (deps.activeDistrict === "COMBAT") {
			return resolveCombatTargetMetadata(target, clientX, clientY);
		}
		const sensorMeta = resolveSensorTargetMetadata(target, clientX, clientY, is3DViewExpanded, deps);
		if (sensorMeta) return sensorMeta;
		return resolveCartographyTargetMetadata(clientX, clientY, deps);
	}

	/** @param {any} meta @param {any} deps */
	function handleNorthLeafAction(meta, deps) {
		if (meta?.northAction?.id === "3D_ADVANCE") {
			const map = deps.getActiveWorldMap ? deps.getActiveWorldMap() : null;
			const pos = deps.getWorldPos ? deps.getWorldPos() : { x: 10, y: 10 };
			const store = deps.store;
			const facing = store?.getFlag("facingDirection") || "DOWN";
			/** @type {Record<string, { x: number, y: number }>} */
			const facingDeltas = {
				UP: { x: 0, y: -1 },
				RIGHT: { x: 1, y: 0 },
				DOWN: { x: 0, y: 1 },
				LEFT: { x: -1, y: 0 },
			};
			const d = facingDeltas[facing] || { x: 0, y: 1 };
			const targetPos = { x: pos.x + d.x, y: pos.y + d.y };
			const isPassable = deps.isTilePassable ? deps.isTilePassable(map, targetPos) : false;
			if (isPassable) {
				moveParty(d.x, d.y, deps);
			} else {
				interactFacing(deps);
			}
			return;
		}
		if (deps.activeDistrict === "COMBAT") {
			if (typeof EmberlightCombat !== "undefined" && typeof EmberlightCombat.handleHostAction === "function") {
				EmberlightCombat.handleHostAction("CHOICE_4");
			}
			return;
		}
		deps.OVERWORLD_ACTION_HANDLERS?.MENU_POUCH?.();
	}

	/** @type {Record<string, (deps: any) => void>} */
	const EAST_ACTION_DISPATCH = {
		THREAT_ORACLE: (d) => {
			d.notifyStatus?.("Threat Oracle: Malakor preparing Heavy Cleave (32 Physical Damage).", "warning");
			d.publishSfx?.("sfx_confirm");
		},
		FIELD_FREEZE: (d) => d.executeCapability?.("cap:elemental.freeze"),
		FIELD_SCORCH: (d) => d.executeCapability?.("cap:elemental.scorch"),
		FIELD_DISPEL: (d) => d.executeCapability?.("cap:elemental.gale_dispel"),
		MENU_SHOP: (d) => d.enterMarketDistrict?.("VILLAGE_SHOP"),
		FIELD_TRIAGE: (d) => {
			d.notifyStatus?.("Field triage applied to vanguard unit.", "success");
			d.publishSfx?.("sfx_heal");
		},
	};

	/** @param {any} meta @param {any} deps */
	function handleEastLeafAction(meta, deps) {
		if (meta?.eastAction?.id === "3D_DEEP_SCAN") {
			const aheadDesc = meta.title || "Forward Sector";
			deps.notifyStatus?.(`Deep Scan: Analyzing ${aheadDesc}. Sensor signature nominal.`, "info");
			if (typeof (/** @type {any} */ (window)).updateTelegraphPane === "function") {
				(/** @type {any} */ (window)).updateTelegraphPane({
					title: `3D SENSOR SCAN: ${aheadDesc.toUpperCase()}`,
					subtitle: "ACOUSTIC & OPTICAL SIGNATURES",
					lines: [
						`Target Profile: ${meta.badge1 || "NOMINAL"} // ${meta.badge2 || "CLEAR"}`,
						"Sensor Telemetry: Line-of-sight confirmed.",
						`Tactical Advisory: ${meta.eastAction.desc || "No immediate hostile anomalies detected."}`,
					],
				});
			}
			deps.publishSfx?.("sfx_confirm");
			return;
		}

		const actId = meta?.eastAction?.id;
		if (!actId) {
			interactFacing(deps);
			return;
		}

		const handler = EAST_ACTION_DISPATCH[actId];
		if (handler) {
			handler(deps);
		} else {
			interactFacing(deps);
		}
	}

	/** @param {any} meta @param {any} deps */
	function handleSouthLeafAction(meta, deps) {
		if (meta?.southAction?.id === "3D_ABOUT_FACE") {
			const facingOrder = ["UP", "RIGHT", "DOWN", "LEFT"];
			const store = deps.store;
			const currentFacing = store?.getFlag("facingDirection") || "DOWN";
			const foundFacingIdx = facingOrder.indexOf(currentFacing);
			const currentIdx = foundFacingIdx !== -1 ? foundFacingIdx : 2;
			const newFacing = facingOrder[(currentIdx + 2) % 4];
			pivotFacing(newFacing, deps);
			deps.notifyStatus?.(`Tactical Turn: Performed 180° about-face to ${newFacing}.`, "info");
			return;
		}
		if (deps.activeDistrict === "COMBAT") {
			if (typeof EmberlightCombat !== "undefined" && typeof EmberlightCombat.handleHostAction === "function") {
				EmberlightCombat.handleHostAction("CHOICE_2");
			}
			return;
		}
		deps.OVERWORLD_ACTION_HANDLERS?.REST?.();
	}

	/** @param {any} meta @param {any} deps */
	function handleWestLeafAction(meta, deps) {
		if (meta?.westAction?.id === "3D_TOGGLE_EXPAND") {
			toggle3DViewportExpansion(undefined, deps);
		} else if (deps.activeDistrict === "COMBAT") {
			deps.switchDistrict?.("STATUS");
		} else {
			deps.switchDistrict?.("CHRONICLE");
		}
	}

	/**
	 * @param {string} dir
	 * @param {Object} [meta]
	 * @param {any} [deps]
	 */
	function executeLeafAction(dir, meta, deps) {
		dismissTacticalChassis();
		if (dir === "NORTH") handleNorthLeafAction(meta, deps);
		else if (dir === "EAST") handleEastLeafAction(meta, deps);
		else if (dir === "SOUTH") handleSouthLeafAction(meta, deps);
		else if (dir === "WEST") handleWestLeafAction(meta, deps);
	}

	/** @param {HTMLElement|null|any} targetEl @param {any} deps */
	function handleHeroCardPointerContext(targetEl, deps) {
		const heroCard = targetEl?.closest?.(".hud-char-card, [data-hero-idx]");
		if (!heroCard) return false;
		const heroIdxAttr =
			heroCard.dataset?.heroIdx ??
			heroCard.dataset?.idx ??
			heroCard.getAttribute?.("data-hero-idx") ??
			heroCard.getAttribute?.("data-idx");
		if (heroIdxAttr !== undefined && heroIdxAttr !== null) {
			deps.store?.setFlag("selectedHeroIdx", Number.parseInt(heroIdxAttr, 10));
		}
		deps.switchDistrict("ARMORY");
		return true;
	}

	/** @param {HTMLElement|null|any} targetEl @param {any} deps */
	function handleCombatPointerContext(targetEl, deps) {
		if (deps.activeDistrict !== "COMBAT") return false;
		const isCombatCanvasOrQuadrant = Boolean(
			targetEl?.closest?.(
				"#combat-backdrop-canvas, #combat-arena, #pane-sensor, .combat-quadrant, #combat-tactical-grid-canvas, #combat-hero-radial, .combat-hero-radial",
			),
		);
		if (isCombatCanvasOrQuadrant) return true;

		if (typeof EmberlightCombat !== "undefined" && typeof (/** @type {any} */ (EmberlightCombat)).getState === "function") {
			const cState = (/** @type {any} */ (EmberlightCombat)).getState();
			if (
				cState?.phase === "TARGETING_ENEMY" ||
				cState?.phase === "TARGETING_ALLY" ||
				cState?.phase === "PENDING_SKILL" ||
				(cState?.selectedTab && cState.selectedTab !== "ATTACK")
			) {
				(/** @type {any} */ (EmberlightCombat)).handleHostAction("CANCEL");
				if (deps.renderHUD) deps.renderHUD();
				return true;
			}
		}
		return true;
	}

	/** @param {any} deps */
	function shouldCancelOnPointerContext(deps) {
		if (deps.isSaveLoadModalOpen || deps.store?.getFlag("pouchOpen") || isQ4DeckExpanded) {
			return true;
		}
		const allowed = ["OVERWORLD", "world", "COMBAT", "TITLE"];
		return !allowed.includes(deps.activeDistrict);
	}

	/**
	 * @param {any} meta
	 * @param {number} clientX
	 * @param {number} clientY
	 * @param {any} deps
	 */
	function initRmbChassis(meta, clientX, clientY, deps) {
		focalRingActive = true;
		rmbEngine.isDown = true;
		rmbEngine.originX = clientX;
		rmbEngine.originY = clientY;
		rmbEngine.targetCenterX = meta.bbox ? meta.bbox.left + meta.bbox.width / 2 : clientX;
		rmbEngine.targetCenterY = meta.bbox ? meta.bbox.top + meta.bbox.height / 2 : clientY;
		rmbEngine.flickArmed = false;
		rmbEngine.activeMeta = meta;
		rmbEngine.highlightedLeaf = null;

		if (meta.tileX !== undefined && meta.tileY !== undefined) {
			if (typeof EmberlightMapRenderer !== "undefined" && typeof EmberlightMapRenderer.setTargetedTile === "function") {
				EmberlightMapRenderer.setTargetedTile(meta.tileX, meta.tileY);
			}
		}

		const Cockpit = typeof EmberlightCockpitRenderer !== "undefined" ? /** @type {any} */ (EmberlightCockpitRenderer) : null;
		if (Cockpit && typeof Cockpit.deployTacticalChassis === "function") {
			Cockpit.deployTacticalChassis(meta, (/** @type {string} */ dir, /** @type {any} */ selectedMeta) => {
				executeLeafAction(dir, selectedMeta, deps);
			});
		}
	}

	/** @param {MouseEvent} e @param {any} deps */
	function handlePointerContextDown(e, deps) {
		if (focalRingActive) {
			dismissTacticalChassis();
			return;
		}

		const targetEl = /** @type {HTMLElement|null} */ (e?.target);
		if (handleHeroCardPointerContext(targetEl, deps)) return;

		if (shouldCancelOnPointerContext(deps)) {
			handleCancelAction(deps);
			return;
		}

		if (handleCombatPointerContext(targetEl, deps) || deps.activeDistrict === "TITLE") return;

		const meta = /** @type {any} */ (resolveTargetMetadata(e.target, e.clientX, e.clientY, deps));
		if (meta) {
			initRmbChassis(meta, e.clientX, e.clientY, deps);
		}
	}

	/** @param {MouseEvent} e */
	function handlePointerContextMove(e) {
		if (!rmbEngine.isDown || !focalRingActive) return;
		const dx = e.clientX - rmbEngine.targetCenterX;
		const dy = e.clientY - rmbEngine.targetCenterY;
		const dist = Math.hypot(dx, dy);

		const Cockpit = typeof EmberlightCockpitRenderer !== "undefined" ? /** @type {any} */ (EmberlightCockpitRenderer) : null;
		if (dist >= 24) {
			rmbEngine.flickArmed = true;
			const dir = calculatePolarDirection(dx, dy);
			rmbEngine.highlightedLeaf = dir;
			if (Cockpit && typeof Cockpit.highlightLeaf === "function") {
				Cockpit.highlightLeaf(dir);
			}
		} else {
			rmbEngine.flickArmed = false;
			rmbEngine.highlightedLeaf = null;
			if (Cockpit && typeof Cockpit.clearLeafHighlights === "function") {
				Cockpit.clearLeafHighlights();
			}
		}
	}

	/** @param {any} deps */
	function handlePointerContextUp(deps) {
		if (!rmbEngine.isDown) return;
		rmbEngine.isDown = false;

		if (rmbEngine.flickArmed && rmbEngine.highlightedLeaf && rmbEngine.activeMeta) {
			executeLeafAction(rmbEngine.highlightedLeaf, rmbEngine.activeMeta, deps);
		}
	}

	/** @param {string} action @param {any} deps */
	function handle3DNav(action, deps) {
		const facingOrder = ["UP", "RIGHT", "DOWN", "LEFT"];
		/** @type {Record<string, { x: number, y: number }>} */
		const facingDeltas = {
			UP: { x: 0, y: -1 },
			RIGHT: { x: 1, y: 0 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
		};
		const store = deps.store;
		const currentFacing = store?.getFlag("facingDirection") || "DOWN";
		const foundFacingIdx = facingOrder.indexOf(currentFacing);
		const currentIdx = foundFacingIdx !== -1 ? foundFacingIdx : 2;

		switch (action) {
			case "UP": {
				const d = facingDeltas[currentFacing];
				moveParty(d.x, d.y, deps);
				break;
			}
			case "DOWN": {
				const d = facingDeltas[currentFacing];
				moveParty(-d.x, -d.y, deps);
				break;
			}
			case "LEFT": {
				const newFacing = facingOrder[(currentIdx + 3) % 4];
				store?.setFlag("facingDirection", newFacing);
				if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.handleHostAction === "function") {
					EmberlightOverworld.handleHostAction(newFacing);
				}
				if (deps.renderHUD) deps.renderHUD();
				break;
			}
			case "RIGHT": {
				const newFacing = facingOrder[(currentIdx + 1) % 4];
				store?.setFlag("facingDirection", newFacing);
				if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.handleHostAction === "function") {
					EmberlightOverworld.handleHostAction(newFacing);
				}
				if (deps.renderHUD) deps.renderHUD();
				break;
			}
			case "STRAFE_LEFT": {
				const leftFacing = facingOrder[(currentIdx + 3) % 4];
				const d = facingDeltas[leftFacing];
				moveParty(d.x, d.y, deps);
				break;
			}
			default:
				break;
		}
	}

	/**
	 * @param {string|undefined} stepTile
	 * @param {number} depth
	 * @param {any} deps
	 */
	function playStepSound(stepTile, depth, deps) {
		if (depth > 0) {
			deps.publishSfx?.("sfx_step_dungeon");
		} else if (stepTile === '"') {
			deps.publishSfx?.("sfx_step_grass");
		} else if (stepTile === "~") {
			deps.publishSfx?.("sfx_step_water");
		} else {
			deps.publishSfx?.("sfx_step");
		}
	}

	/**
	 * @param {number} dx
	 * @param {number} dy
	 * @param {any} deps
	 * @returns {void}
	 */
	function moveParty(dx, dy, deps) {
		if (isQ4DeckExpanded) return;
		if (deps.activeDistrict !== "OVERWORLD" && deps.activeDistrict !== "world" && deps.activeDistrict !== "dungeon") {
			return;
		}

		let facing = "DOWN";
		if (dx > 0) facing = "RIGHT";
		else if (dx < 0) facing = "LEFT";
		else if (dy < 0) facing = "UP";

		const store = deps.store;
		store?.setFlag("facingDirection", facing);

		const currentPos = deps.getWorldPos ? deps.getWorldPos() : { x: 10, y: 10 };
		const targetPos = { x: currentPos.x + dx, y: currentPos.y + dy };
		const worldMap = deps.getActiveWorldMap ? deps.getActiveWorldMap() : null;

		const isPassable = deps.isTilePassable ? deps.isTilePassable(worldMap, targetPos) : false;
		if (!isPassable) {
			deps.publishSfx?.("sfx_bump");
			return;
		}

		deps.setWorldPos?.(targetPos);
		deps.incrementStepCounter?.();

		const stepTile = worldMap?.[targetPos.y]?.[targetPos.x];
		const depth = deps.getDungeonDepth ? deps.getDungeonDepth() : 0;
		playStepSound(stepTile, depth, deps);

		if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.handleHostAction === "function") {
			EmberlightOverworld.handleHostAction(facing);
		}

		deps.evaluateTileTrigger?.(targetPos, null, false);
		if (deps.getStepCounter && deps.getStepCounter() % 15 === 0) {
			deps.commitSession?.("PeriodicStepAutosave");
		}
		deps.renderHUD?.();
	}

	/**
	 * @param {'UP'|'DOWN'|'LEFT'|'RIGHT'|string} facing
	 * @param {any} deps
	 * @returns {void}
	 */
	function pivotFacing(facing, deps) {
		if (!facing) return;
		const normFacing = facing.toUpperCase();
		if (!["UP", "DOWN", "LEFT", "RIGHT"].includes(normFacing)) return;
		deps.store?.setFlag("facingDirection", normFacing);
		if (typeof EmberlightOverworld !== "undefined" && typeof EmberlightOverworld.handleHostAction === "function") {
			EmberlightOverworld.handleHostAction(normFacing);
		}
		if (deps.publishSfx) deps.publishSfx("sfx_hover");
		if (deps.renderHUD) deps.renderHUD();
	}

	/** @param {any} deps */
	function interactFacing(deps) {
		const currentPos = deps.getWorldPos ? deps.getWorldPos() : { x: 10, y: 10 };
		const store = deps.store;
		const facing = store?.getFlag("facingDirection") || "DOWN";
		/** @type {Record<string, { x: number, y: number }>} */
		const deltas = {
			UP: { x: 0, y: -1 },
			DOWN: { x: 0, y: 1 },
			LEFT: { x: -1, y: 0 },
			RIGHT: { x: 1, y: 0 },
		};
		const d = deltas[facing] || { x: 0, y: 1 };
		const targetPos = { x: currentPos.x + d.x, y: currentPos.y + d.y };

		if (deps.evaluateTileTrigger) deps.evaluateTileTrigger(currentPos, targetPos, true);
	}

	const RuntimeNavigation = {
		isNonExpandableDistrict,
		normalizeDistrictName,
		updateQ4DOM,
		toggleQ4DeckExpansion,
		update3DDOM,
		toggle3DViewportExpansion,
		cancelCombatState,
		handleCancelAction,
		calculatePolarDirection,
		dismissTacticalChassis,
		resolveCombatTargetMetadata,
		resolveSensorTargetMetadata,
		resolveCartographyTargetMetadata,
		resolveTargetMetadata,
		executeLeafAction,
		handlePointerContextDown,
		handlePointerContextMove,
		handlePointerContextUp,
		handle3DNav,
		moveParty,
		pivotFacing,
		interactFacing,
		getIsQ4DeckExpanded: () => isQ4DeckExpanded,
		getIs3DViewExpanded: () => is3DViewExpanded,
		getFocalRingActive: () => focalRingActive,
	};

	if (typeof window !== "undefined") {
		window._RuntimeInternal = window._RuntimeInternal || {};
		window._RuntimeInternal.Navigation = RuntimeNavigation;
	}

	if (typeof module !== "undefined") {
		module.exports = RuntimeNavigation;
	}
})();
