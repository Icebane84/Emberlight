/* cSpell:words VSRP ARCANIST */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: STATUS DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-STATUS-RENDERER
 * Governing Protocol:  ARCH-ZONE-DISTRICTS-001 / PRS-DES-027
 * Authority:           Peripheral Presentation
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions & DOM Queries
 *   [SEC-02] Canvas Graphic Drivers (Radar & ECG)
 *   [SEC-03] Deep Analysis Mode Stage & Workstation
 *   [SEC-04] Compact Mode Deck Projection
 *   [SEC-05] Peripheral Interface Gateway
 *   [SEC-06] Global Export & Dual-Binding
 * ============================================================================
 */

const EmberlightStatusRenderer = (() => {
	//#region [SEC-01] Type Definitions & DOM Queries
	/**
	 * @typedef {'FRONT' | 'BACK'} RowPosition
	 *
	 * @typedef {Object} CharacterState
	 * @property {string} id - Unique instance identifier (e.g., 'hero', 'warrior').
	 * @property {string} name - Display name.
	 * @property {'HERO' | 'WARRIOR' | 'MAGE' | 'HEALER' | string} [phenotype] - Character class phenotype.
	 * @property {number} hp - Current hit points.
	 * @property {number} maxHp - Maximum hit points.
	 * @property {number} mp - Current mana points.
	 * @property {number} maxMp - Maximum mana points.
	 * @property {number} [level] - Character level.
	 * @property {number} [exp] - Experience points accumulated.
	 * @property {number} [atk] - Attack power rating.
	 * @property {number} [def] - Defense rating.
	 * @property {number} [agi] - Agility rating.
	 * @property {number} [skillPoints] - Unspent skill points.
	 * @property {number} [unspentSP] - Alias for unspent skill points.
	 * @property {boolean} [alive] - Vital status flag.
	 * @property {RowPosition} [row] - Tactical formation row.
	 * @property {Array<{ id: string, duration: number }>} [ailments] - Active status ailments.
	 * @property {string[]} [unlocked] - Unlocked skill tree node IDs.
	 * @property {string[]} [unlockedNodes] - Alias for unlocked skill tree node IDs.
	 *
	 * @typedef {Record<string, number>} InventoryBag
	 *
	 * @typedef {Object} StatusStateSnapshot
	 * @property {CharacterState[]} party - Detached party roster array.
	 * @property {InventoryBag} inventory - Detached inventory item counts.
	 * @property {boolean} [active] - Active simulation flag.
	 *
	 * @typedef {Object} CastFieldSpellAction
	 * @property {'CAST_FIELD_SPELL'} type
	 * @property {string} casterId
	 * @property {string} targetId
	 * @property {string} skillId
	 *
	 * @typedef {Object} ToggleRowAction
	 * @property {'TOGGLE_ROW'} type
	 * @property {string} characterId
	 *
	 * @typedef {Object} AdministerPotionAction
	 * @property {'ADMINISTER_POTION'} type
	 * @property {string} [targetId]
	 * @property {string} [characterId]
	 *
	 * @typedef {Object} CleanseAilmentsAction
	 * @property {'CLEANSE_AILMENTS'} type
	 * @property {string} [targetId]
	 * @property {string} [characterId]
	 *
	 * @typedef {Object} NoticeAction
	 * @property {'NOTICE'} type
	 * @property {string} msg
	 *
	 * @typedef {Object} ExitAction
	 * @property {'EXIT'} type
	 *
	 * @typedef {CastFieldSpellAction | ToggleRowAction | AdministerPotionAction | CleanseAilmentsAction | NoticeAction | ExitAction} StatusActionObject
	 * @typedef {StatusActionObject | string} StatusActionToken
	 *
	 * @typedef {(action: StatusActionToken) => void} StatusDispatchFn
	 *
	 * @typedef {Object} LearnedHealDescriptor
	 * @property {string} id - Heal skill identifier.
	 * @property {string} [name] - Display name.
	 * @property {number} [cost] - MP cost.
	 * @property {number} [power] - Healing power.
	 * @property {'HEAL' | string} [type] - Skill classification.
	 *
	 * @typedef {Object} RadarMetric
	 * @property {string} key - Metric identifier.
	 * @property {string} label - Display axis label.
	 * @property {number} val - Attribute value.
	 * @property {number} cap - Maximum normalization threshold.
	 *
	 * @typedef {Object} RendererDiagnostics
	 * @property {'status_renderer'} driverId - Registered driver identifier.
	 *
	 * @typedef {Object} IEmberlightStatusRenderer
	 * @property {(config?: any) => void} init - Initializes presentation peripheral.
	 * @property {(state: StatusStateSnapshot, dispatch: StatusDispatchFn) => void} renderStatus - Mounts status presentation UI.
	 * @property {() => RendererDiagnostics} getDiagnostics - Returns driver diagnostic telemetry.
	 * @property {() => void} destroy - Tears down presentation elements.
	 */

	/** @type {string | null} */
	let selectedCharacterId = null;

	/**
	 * Queries the DOM root container for the status view.
	 * Pure DOM query procedure.
	 *
	 * @returns {HTMLElement | null} Status root DOM element or null if not mounted.
	 */
	function getView() {
		return typeof document === "undefined"
			? null
			: document.getElementById("status-view");
	}

	/**
	 * Safely invokes the host action dispatcher with a normalized action token.
	 * State-mutating procedure.
	 *
	 * @param {StatusDispatchFn} dispatch - Dispatched action callback.
	 * @param {StatusActionToken} action - Action payload token.
	 * @returns {void}
	 */
	function emit(dispatch, action) {
		if (typeof dispatch === "function") dispatch(action);
	}

	/**
	 * Resolves active manifest reference from host context or global scope.
	 * Pure accessor procedure.
	 *
	 * @returns {any} Authoritative game data manifest dictionary.
	 */
	function getManifest() {
		if (typeof window !== "undefined" && window.EmberlightManifest) return window.EmberlightManifest;
		if (typeof globalThis !== "undefined" && (/** @type {any} */ (globalThis)).EmberlightManifest) return (/** @type {any} */ (globalThis)).EmberlightManifest;
		return {};
	}

	/**
	 * Inspects DOM hierarchy to determine if Quadrant 4 expanded deck mode is currently active.
	 * Pure DOM inspection procedure.
	 *
	 * @returns {boolean} True if expanded workstation mode is active, false otherwise.
	 */
	function isDeckExpanded() {
		if (typeof document === "undefined") return false;
		const matrix = document.getElementById("war-table-matrix");
		const container = document.getElementById("district-mount-container");
		return Boolean(
			matrix?.classList.contains("q4-expanded-deck") ||
			container?.closest(".q4-expanded-deck") ||
			document.querySelector(".matrix-grid.q4-expanded-deck"),
		);
	}

	/**
	 * Queries character unlocked nodes to locate a learned healing spell descriptor.
	 * Pure domain query procedure.
	 *
	 * @param {CharacterState} [char] - Party character candidate.
	 * @returns {LearnedHealDescriptor | null} Learned heal skill descriptor or null.
	 */
	function findLearnedHealSkill(char) {
		if (!char) return null;
		const unlockedList = char.unlockedNodes || char.unlocked || [];
		const manifest = getManifest();
		const nodes = manifest?.AetherNodes || {};

		for (const element of unlockedList) {
			const node = nodes[element];
			if (node?.grantsSkill) {
				const skill = manifest.Skills?.[node.grantsSkill];
				if (skill?.type === "HEAL") {
					return skill;
				}
			}
			if (node?.subType === "heal") {
				return {
					id: node.id,
					name: node.label,
					cost: node.mpCost || 4,
					power: node.power || 25,
				};
			}
		}
		return null;
	}
	//#endregion

	//#region [SEC-02] Canvas Graphic Drivers (Radar & ECG)
	/**
	 * Synthesizes and draws pentagonal 5-axis tactical radar on HTML5 canvas.
	 * Pure graphic canvas rendering procedure.
	 *
	 * @param {HTMLCanvasElement} canvas - Target canvas element.
	 * @param {any} stats - Aggregated character statistics dictionary.
	 * @returns {void}
	 */
	function drawStatRadar(canvas, stats) {
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		const cx = w / 2;
		const cy = h / 2;
		const radius = Math.min(w, h) * 0.38;

		ctx.clearRect(0, 0, w, h);

		// Caps for normalization
		const caps = {
			atk: 40,
			def: 30,
			agi: 20,
			hp: 80,
			mp: 40,
		};

		/** @type {RadarMetric[]} */
		const metrics = [
			{ key: "atk", label: "ATK", val: stats.atk || 10, cap: caps.atk },
			{ key: "def", label: "DEF", val: stats.def || 5, cap: caps.def },
			{ key: "agi", label: "AGI", val: stats.agi || 7, cap: caps.agi },
			{ key: "hp", label: "HP", val: stats.maxHp || 30, cap: caps.hp },
			{ key: "mp", label: "MP", val: stats.maxMp || 10, cap: caps.mp },
		];

		const numAxes = metrics.length;
		const angleStep = (Math.PI * 2) / numAxes;
		const startAngle = -Math.PI / 2; // Point top

		// 1. Draw Web Rings (25%, 50%, 75%, 100%)
		[0.25, 0.5, 0.75, 1.0].forEach((level) => {
			ctx.beginPath();
			for (let i = 0; i < numAxes; i++) {
				const angle = startAngle + i * angleStep;
				const r = radius * level;
				const x = cx + r * Math.cos(angle);
				const y = cy + r * Math.sin(angle);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.strokeStyle =
				level === 1.0
					? "rgba(56, 189, 248, 0.35)"
					: "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 1;
			ctx.stroke();
		});

		// 2. Draw Spokes and Labels
		ctx.font = "7px monospace";
		ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for (let i = 0; i < numAxes; i++) {
			const angle = startAngle + i * angleStep;
			const x = cx + radius * Math.cos(angle);
			const y = cy + radius * Math.sin(angle);

			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(x, y);
			ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
			ctx.stroke();

			const labelX = cx + (radius + 14) * Math.cos(angle);
			const labelY = cy + (radius + 12) * Math.sin(angle);
			ctx.fillText(`${metrics[i].label} (${metrics[i].val})`, labelX, labelY);
		}

		// 3. Draw Stat Polygon
		ctx.beginPath();
		for (let i = 0; i < numAxes; i++) {
			const angle = startAngle + i * angleStep;
			const norm = Math.min(
				1.0,
				Math.max(0.15, metrics[i].val / metrics[i].cap),
			);
			const r = radius * norm;
			const x = cx + r * Math.cos(angle);
			const y = cy + r * Math.sin(angle);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();

		ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
		ctx.fill();
		ctx.strokeStyle = "#38bdf8";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// 4. Draw Vertex Nodes
		for (let i = 0; i < numAxes; i++) {
			const angle = startAngle + i * angleStep;
			const norm = Math.min(
				1.0,
				Math.max(0.15, metrics[i].val / metrics[i].cap),
			);
			const r = radius * norm;
			const x = cx + r * Math.cos(angle);
			const y = cy + r * Math.sin(angle);

			ctx.beginPath();
			ctx.arc(x, y, 2.5, 0, Math.PI * 2);
			ctx.fillStyle = "#ff9d4d";
			ctx.fill();
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 0.8;
			ctx.stroke();
		}
	}

	/**
	 * Draws animated ECG heartbeat oscilloscope waveform on HTML5 canvas.
	 * Pure graphic canvas rendering procedure.
	 *
	 * @param {HTMLCanvasElement} canvas - Target canvas element.
	 * @param {number} hpPercent - Normalized HP percentage (0.0 to 1.0).
	 * @returns {void}
	 */
	function drawEcgWaveform(canvas, hpPercent) {
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, w, h);

		// Draw Grid
		ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
		ctx.lineWidth = 1;
		for (let x = 0; x < w; x += 12) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}

		let strokeColor = "#34d399";
		if (hpPercent <= 0.3) {
			strokeColor = "#ef4444";
		} else if (hpPercent < 0.6) {
			strokeColor = "#f59e0b";
		}

		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = 1.5;
		ctx.beginPath();

		const midY = h / 2;
		ctx.moveTo(0, midY);
		ctx.lineTo(w * 0.2, midY);
		ctx.lineTo(w * 0.28, midY - 4);
		ctx.lineTo(w * 0.35, midY + 4);
		ctx.lineTo(w * 0.42, midY - 14);
		ctx.lineTo(w * 0.48, midY + 12);
		ctx.lineTo(w * 0.54, midY - 6);
		ctx.lineTo(w * 0.6, midY);
		ctx.lineTo(w * 0.72, midY - 5);
		ctx.lineTo(w * 0.8, midY);
		ctx.lineTo(w, midY);
		ctx.stroke();
	}
	//#endregion

	//#region [SEC-03] Deep Analysis Mode Stage & Workstation
	/**
	 * Formats status ailments container HTML for active character.
	 * @param {CharacterState} activeChar
	 * @returns {string}
	 */
	function formatAilmentsHtml(activeChar) {
		if (Array.isArray(activeChar.ailments) && activeChar.ailments.length > 0) {
			return activeChar.ailments
				.map((a) => `<span style="color:var(--danger); font-weight:bold;">⚠️ ${a.id} (${a.duration}t)</span>`)
				.join(", ");
		}
		return '<span style="color:var(--ok);">✔ UNENCUMBERED / ZERO TRAUMA</span>';
	}

	/**
	 * Populates character selector buttons in roster ribbon.
	 * @param {HTMLElement} panel
	 * @param {CharacterState[]} party
	 * @param {CharacterState} activeChar
	 * @param {StatusStateSnapshot} state
	 * @param {StatusDispatchFn} dispatch
	 */
	function populateRosterRibbon(panel, party, activeChar, state, dispatch) {
		const rosterRibbon = panel.querySelector("#status-roster-ribbon");
		if (!rosterRibbon) return;
		party.forEach((char) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = `deep-roster-btn ${char.id === activeChar.id ? "active" : ""}`;
			btn.innerHTML = `<span>${char.name}</span> <span style="font-size:6px; opacity:0.8;">(${char.phenotype || "HERO"})</span>`;
			btn.addEventListener("click", () => {
				selectedCharacterId = char.id;
				EmberlightStatusRenderer.renderStatus(state, dispatch);
			});
			rosterRibbon.appendChild(btn);
		});
	}

	/**
	 * Populates vanguard and rearguard unit lists on the formation bench.
	 * @param {HTMLElement} panel
	 * @param {CharacterState[]} party
	 * @param {CharacterState} activeChar
	 * @param {StatusDispatchFn} dispatch
	 */
	function populateFormationBench(panel, party, activeChar, dispatch) {
		const vList = panel.querySelector("#vanguard-unit-list");
		const rList = panel.querySelector("#rearguard-unit-list");

		party.forEach((char) => {
			const isCharFront = char.row === "FRONT" || !char.row;
			const pill = document.createElement("div");
			pill.className = `formation-unit-pill ${char.id === activeChar.id ? "selected" : ""}`;
			pill.innerHTML = `
				<span>${char.name} (${char.phenotype || "HERO"})</span>
				<button type="button" class="cmd-btn" style="font-size:6px; padding:1px 5px;">
					${isCharFront ? "MOVE REAR ➡" : "⬅ MOVE FRONT"}
				</button>
			`;
			/** @type {HTMLButtonElement | null} */
			const pillBtn = pill.querySelector("button");
			if (pillBtn) {
				pillBtn.addEventListener("click", () => {
					emit(dispatch, { type: "TOGGLE_ROW", characterId: char.id });
				});
			}

			if (isCharFront && vList) vList.appendChild(pill);
			else if (rList) rList.appendChild(pill);
		});
	}

	/**
	 * Binds medical action triggers and close status button.
	 * @param {HTMLElement} panel
	 * @param {CharacterState} activeChar
	 * @param {any} learnedHeal
	 * @param {StatusDispatchFn} dispatch
	 */
	function bindMedicalTriggers(panel, activeChar, learnedHeal, dispatch) {
		/** @type {HTMLButtonElement | null} */
		const healBtn = panel.querySelector("#field-heal-trigger-btn");
		if (healBtn && learnedHeal) {
			healBtn.addEventListener("click", () => {
				emit(dispatch, {
					type: "CAST_FIELD_SPELL",
					casterId: activeChar.id,
					targetId: activeChar.id,
					skillId: learnedHeal.id,
				});
			});
		}

		/** @type {HTMLButtonElement | null} */
		const potionBtn = panel.querySelector("#field-potion-trigger-btn");
		if (potionBtn) {
			potionBtn.addEventListener("click", () => {
				emit(dispatch, {
					type: "ADMINISTER_POTION",
					targetId: activeChar.id,
				});
			});
		}

		/** @type {HTMLButtonElement | null} */
		const closeBtn = panel.querySelector("#close-status-btn");
		if (closeBtn) {
			closeBtn.addEventListener("click", () => emit(dispatch, { type: "EXIT" }));
		}
	}

	/**
	 * Projects deep analysis workstation into DOM panel (biometrics, radar, ECG, formation bench, field medical).
	 * State-mutating DOM projection procedure.
	 *
	 * @param {HTMLElement} panel - Target panel container.
	 * @param {StatusStateSnapshot} state - Current detached status state snapshot.
	 * @param {StatusDispatchFn} dispatch - Host action dispatcher.
	 * @param {any} manifest - Authoritative game data manifest.
	 * @returns {void}
	 */
	function renderDeepAnalysisStatus(panel, state, dispatch, manifest) {
		const party = state.party || [];
		if (party.length === 0) return;

		if (!selectedCharacterId || !party.some((c) => c.id === selectedCharacterId)) {
			selectedCharacterId = party[0].id;
		}

		const activeChar = party.find((c) => c.id === selectedCharacterId) || party[0];
		const computedStats = typeof manifest.computeCharacterStats === "function"
			? manifest.computeCharacterStats(activeChar)
			: activeChar;

		const gearStats = typeof manifest.calculateGearStats === "function"
			? manifest.calculateGearStats(activeChar)
			: { atk: 0, def: 0 };

		const atkBonus = gearStats?.atk || 0;
		const defBonus = gearStats?.def || 0;
		const maxHp = computedStats.maxHp || activeChar.maxHp || 30;
		const maxMp = computedStats.maxMp || activeChar.maxMp || 10;
		const hpPct = Math.max(0, Math.min(1.0, activeChar.hp / maxHp));
		const mpPct = Math.max(0, Math.min(1.0, activeChar.mp / maxMp));
		const nextExp = 20 * (activeChar.level || 1) ** 1.4;
		const expPct = Math.min(100, Math.round(((activeChar.exp || 0) / nextExp) * 100));

		const learnedHeal = findLearnedHealSkill(activeChar);
		const isFront = activeChar.row === "FRONT" || !activeChar.row;
		const rowLabel = isFront ? "🛡️ VANGUARD (FRONT)" : "🏹 REAR (BACK)";
		const charPhenotype = activeChar.phenotype || "HERO";

		const healCost = learnedHeal?.cost || 4;
		const healLabel = learnedHeal ? learnedHeal.name || learnedHeal.id : "HEAL";
		const isHealDisabled = !learnedHeal || activeChar.mp < healCost;
		const healDisabledAttr = isHealDisabled ? "disabled" : "";

		const hasPotions = (state.inventory?.POTION || 0) > 0;
		const isPotionDisabled = !hasPotions || activeChar.hp >= maxHp;
		const potionDisabledAttr = isPotionDisabled ? "disabled" : "";
		const ailmentsHtml = formatAilmentsHtml(activeChar);

		panel.innerHTML = `
			<div class="deep-analysis-deck">
				<!-- 1. ROSTER SELECTION RIBBON -->
				<div class="deep-analysis-roster" id="status-roster-ribbon"></div>

				<!-- 2. PRIMARY OPERATIONAL STAGE -->
				<div class="deep-analysis-stage">
					<!-- PANE 1: BIOMETRIC TELEMETRY -->
					<div class="deep-analysis-pane">
						<div class="deep-pane-title">
							<span>BIOMETRIC TELEMETRY: ${activeChar.name.toUpperCase()}</span>
							<span style="color:var(--ember);">${charPhenotype} · ${rowLabel}</span>
						</div>

						<div style="display:flex; flex-direction:column; gap:6px; font-size:8px;">
							<div>
								<div style="display:flex; justify-content:space-between; margin-bottom:2px;">
									<span>VITALITY (HP)</span>
									<span style="font-weight:bold; color:var(--ok);">${activeChar.hp} / ${maxHp} (${Math.round(hpPct * 100)}%)</span>
								</div>
								<div style="height:6px; background:#000; border:1px solid var(--border-dim); border-radius:2px; overflow:hidden;">
									<div style="height:100%; width:${Math.round(hpPct * 100)}%; background:var(--ok);"></div>
								</div>
							</div>

							<div>
								<div style="display:flex; justify-content:space-between; margin-bottom:2px;">
									<span>MANA RESERVE (MP)</span>
									<span style="font-weight:bold; color:var(--mp);">${activeChar.mp} / ${maxMp} (${Math.round(mpPct * 100)}%)</span>
								</div>
								<div style="height:6px; background:#000; border:1px solid var(--border-dim); border-radius:2px; overflow:hidden;">
									<div style="height:100%; width:${Math.round(mpPct * 100)}%; background:var(--mp);"></div>
								</div>
							</div>

							<div>
								<div style="display:flex; justify-content:space-between; margin-bottom:2px;">
									<span>EXP PROGRESS (LV ${activeChar.level || 1})</span>
									<span>${activeChar.exp || 0} / ${Math.round(nextExp)} (${expPct}%)</span>
								</div>
								<div style="height:4px; background:#000; border:1px solid var(--border-dim); border-radius:2px; overflow:hidden;">
									<div style="height:100%; width:${expPct}%; background:var(--ember);"></div>
								</div>
							</div>

							<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:4px;">
								<div style="background:rgba(0,0,0,0.3); padding:4px; border:1px solid var(--border-dim); border-radius:3px;">
									<div>Base ATK: <b>${activeChar.atk}</b> (+${atkBonus})</div>
									<div>Base DEF: <b>${activeChar.def}</b> (+${defBonus})</div>
								</div>
								<div style="background:rgba(0,0,0,0.3); padding:4px; border:1px solid var(--border-dim); border-radius:3px;">
									<div>Agility: <b>${activeChar.agi}</b></div>
									<div>Unspent SP: <b style="color:var(--ember);">${activeChar.skillPoints || activeChar.unspentSP || 0} SP</b></div>
								</div>
							</div>

							<div style="margin-top:4px;">
								<div style="font-size:7px; color:var(--text-dim); margin-bottom:2px;">ECG OSCILLOSCOPE HEARTBEAT:</div>
								<canvas id="status-ecg-canvas" class="ecg-waveform-canvas" width="280" height="48"></canvas>
							</div>
						</div>
					</div>

					<!-- PANE 2: PENTAGONAL STAT RADAR & TRAUMA -->
					<div class="deep-analysis-pane">
						<div class="deep-pane-title">
							<span>TACTICAL RADAR & DIAGNOSTICS</span>
							<span style="color:var(--border-bright);">5-AXIS RADAR</span>
						</div>
						<canvas id="status-radar-canvas" class="stat-radar-canvas" width="220" height="180"></canvas>
						<div style="font-size:7px; display:flex; flex-direction:column; gap:3px;">
							<div style="color:var(--text-dim);">STATUS AILMENTS & TRAUMA:</div>
							<div style="background:rgba(0,0,0,0.4); padding:4px 6px; border:1px solid var(--border-dim); border-radius:3px;">
								${ailmentsHtml}
							</div>
						</div>
					</div>
				</div>

				<!-- 3. LOWER STAGE: FORMATION BENCH & FIELD MEDICAL SUITE -->
				<div class="deep-analysis-bench">
					<div class="deep-pane-title">
						<span>TACTICAL FORMATION BENCH & FIELD MEDICAL SUITE</span>
						<button type="button" class="cmd-btn action" id="close-status-btn" style="font-size:7px; padding:2px 8px;">✔ CLOSE STATUS</button>
					</div>

					<div style="display:grid; grid-template-columns:1.2fr 1fr; gap:12px;">
						<!-- Formation Grid -->
						<div class="formation-bench-grid">
							<div class="formation-wing-box">
								<div style="font-size:7px; font-weight:bold; color:var(--ok); border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:2px;">
									🛡️ VANGUARD (FRONT ROW)
								</div>
								<div id="vanguard-unit-list" style="display:flex; flex-direction:column; gap:4px;"></div>
							</div>
							<div class="formation-wing-box">
								<div style="font-size:7px; font-weight:bold; color:#60a5fa; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:2px;">
									🏹 ARCANIST / REAR (BACK ROW)
								</div>
								<div id="rearguard-unit-list" style="display:flex; flex-direction:column; gap:4px;"></div>
							</div>
						</div>

						<!-- Field Medical Suite -->
						<div style="display:flex; flex-direction:column; gap:6px;">
							<div style="font-size:7px; font-weight:bold; color:var(--ember);">FIELD RECOVERY ACTIONS:</div>
							<button type="button" class="cmd-btn action" id="field-heal-trigger-btn" style="font-size:7px; padding:4px;" ${healDisabledAttr}>
								✨ CAST ${healLabel} (${healCost} MP)
							</button>
							<button type="button" class="cmd-btn action" id="field-potion-trigger-btn" style="font-size:7px; padding:4px;" ${potionDisabledAttr}>
								🧪 ADMINISTER POTION (+25 HP) [Qty: ${state.inventory?.POTION || 0}]
							</button>
						</div>
					</div>
				</div>
			</div>
		`;

		populateRosterRibbon(panel, party, activeChar, state, dispatch);
		populateFormationBench(panel, party, activeChar, dispatch);

		// Draw Visual Canvases
		/** @type {HTMLCanvasElement | null} */
		const radarCanvas = panel.querySelector("#status-radar-canvas");
		if (radarCanvas) {
			drawStatRadar(radarCanvas, computedStats);
		}
		/** @type {HTMLCanvasElement | null} */
		const ecgCanvas = panel.querySelector("#status-ecg-canvas");
		if (ecgCanvas) {
			drawEcgWaveform(ecgCanvas, hpPct);
		}

		bindMedicalTriggers(panel, activeChar, learnedHeal, dispatch);
	}
	//#endregion

	//#region [SEC-04] Compact Mode Deck Projection
	/**
	 * Projects compact grid card deck into DOM panel.
	 * State-mutating DOM projection procedure.
	 *
	 * @param {HTMLElement} panel - Target panel container.
	 * @param {StatusStateSnapshot} state - Current detached status state snapshot.
	 * @param {StatusDispatchFn} dispatch - Host action dispatcher.
	 * @param {any} manifest - Authoritative game data manifest.
	 * @returns {void}
	 */
	function renderCompactStatus(panel, state, dispatch, manifest) {
		panel.innerHTML = `
			<div class="panel-title" style="color:var(--ember); margin-bottom:10px;">PARTY INSPECTOR & ATTRIBUTES</div>
			<div id="status-card-deck" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-bottom:12px;"></div>
			<div style="text-align:right;">
				<button type="button" class="cmd-btn action" id="close-status-btn">✔ CLOSE STATUS</button>
			</div>
		`;

		const deck = panel.querySelector("#status-card-deck");
		if (!deck) return;

		const fragment = document.createDocumentFragment();

		if (Array.isArray(state.party)) {
			state.party.forEach((char) => {
				const gearStats =
					typeof manifest?.calculateGearStats === "function"
						? manifest.calculateGearStats(char)
						: { atk: 0, def: 0 };
				const atkBonus = gearStats?.atk || 0;
				const defBonus = gearStats?.def || 0;
				const learnedHeal = findLearnedHealSkill(char);
				const charRow = char.row || "FRONT";
				const charPhenotype = char.phenotype || "HERO";

				let healButtonHtml = "";
				if (learnedHeal) {
					const healCost = learnedHeal.cost || 4;
					const healLabel = learnedHeal.name || learnedHeal.id;
					const isHealDisabled = (char.mp || 0) < healCost;
					const disabledAttr = isHealDisabled ? "disabled" : "";

					healButtonHtml = `
						<div style="margin-top:6px; padding-top:4px; border-top:1px solid var(--border-dim);">
							<button type="button" class="cmd-btn action field-heal-btn"
								data-caster="${char.id}"
								data-skill="${learnedHeal.id}"
								style="font-size:7px; padding:2px 6px; width:100%;"
								${disabledAttr}>
								✨ CAST ${healLabel} (${healCost} MP)
							</button>
						</div>
					`;
				}

				const card = document.createElement("div");
				card.className = "status-char-card";
				card.style.background = "rgba(0,0,0,0.3)";
				card.style.border = "1px solid var(--border-dim)";
				card.style.padding = "8px";
				card.style.fontSize = "8px";

				card.innerHTML = `
					<div style="color:var(--ember); font-weight:bold; margin-bottom:4px;">${char.name} (${charPhenotype}) [${charRow}]</div>
					<div>Level: <b>${char.level || 1}</b> | EXP: ${char.exp || 0}</div>
					<div>HP: ${char.hp}/${char.maxHp} | MP: ${char.mp}/${char.maxMp}</div>
					<div>Base ATK: ${char.atk} (+${atkBonus})</div>
					<div>Base DEF: ${char.def} (+${defBonus})</div>
					<div>AGI: ${char.agi} | SP: <b>${char.skillPoints || 0}</b></div>
					${healButtonHtml}
				`;
				fragment.appendChild(card);
			});
		}

		deck.appendChild(fragment);

		panel.querySelectorAll(".field-heal-btn").forEach((btn) => {
			/** @type {HTMLButtonElement} */
			const button = /** @type {HTMLButtonElement} */ (btn);
			button.onclick = () => {
				emit(dispatch, {
					type: "CAST_FIELD_SPELL",
					casterId: button.dataset.caster || "",
					targetId: button.dataset.caster || "",
					skillId: button.dataset.skill || "",
				});
			};
		});

		/** @type {HTMLButtonElement | null} */
		const closeBtn = panel.querySelector("#close-status-btn");
		if (closeBtn) {
			closeBtn.addEventListener("click", () => emit(dispatch, { type: "EXIT" }));
		}
	}
	//#endregion

	return {
		//#region [SEC-05] Peripheral Interface Gateway
		/**
		 * Peripheral initialization lifecycle method.
		 * Pure lifecycle gateway.
		 *
		 * @param {any} [_context] - Host context reference.
		 * @returns {void}
		 */
		init(_context) { },

		/**
		 * Peripheral render invocation: mounts party status UI according to viewport expansion mode.
		 * State-mutating presentation gateway.
		 *
		 * @param {StatusStateSnapshot} state - Detached status state snapshot.
		 * @param {StatusDispatchFn} dispatch - Host action dispatcher callback.
		 * @returns {void}
		 */
		renderStatus(state, dispatch) {
			const container = getView();
			if (!container || !state) return;

			container.innerHTML = "";
			const panel = document.createElement("div");
			panel.className = "panel";
			panel.style.borderColor = "var(--ember)";

			const manifest = getManifest();
			if (isDeckExpanded()) {
				renderDeepAnalysisStatus(panel, state, dispatch, manifest);
			} else {
				renderCompactStatus(panel, state, dispatch, manifest);
			}

			container.appendChild(panel);
		},

		/**
		 * Peripheral health diagnostic probe.
		 * Pure telemetry accessor.
		 *
		 * @returns {RendererDiagnostics}
		 */
		getDiagnostics() {
			return { driverId: "status_renderer" };
		},

		/**
		 * Peripheral teardown: cleanses status view DOM container.
		 * State-mutating teardown procedure.
		 *
		 * @returns {void}
		 */
		destroy() {
			const view = getView();
			if (view) view.innerHTML = "";
		},
		//#endregion
	};
})();

//#region [SEC-06] Global Export & Dual-Binding
if (typeof window !== "undefined") {
	window.EmberlightStatusRenderer = EmberlightStatusRenderer;
}
if (typeof module !== "undefined") {
	module.exports = EmberlightStatusRenderer;
}
//#endregion
