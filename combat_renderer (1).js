/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMBAT PRESENTATION DRIVER (TIER 3)
 * Document Identifier: VSRP-001-COMBAT-RENDERER
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-COMBAT-AESTHETICS-003
 * Authority:           Tier 3 Presentation Engine & Tactical Viewport Driver
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
 *   [SEC-02] Combat Affinity & Element Resolution Utilities
 *   [SEC-03] Action Theater & Telemetry Renderers
 *   [SEC-04] Enemy Formation Wing Renderers
 *   [SEC-05] Party Formation Wing Renderers
 *   [SEC-06] Subdeck Renderers (Attack, Skills, Pouch, Guard)
 *   [SEC-07] Action & Command Hub Renderers
 *   [SEC-08] Public VSRP-001 Tier-3 Interface Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} CombatActionToken
 * @property {string} type Action token type.
 * @property {SkillNode} [skill] Associated skill node object.
 * @property {number} [targetIndex] Target slot index in party or enemy array.
 * @property {boolean} [isAlly] Flag indicating target is an ally.
 * @property {string} [itemId] Item identifier key.
 * @property {string} [tab] Command hub tab key.
 * @property {string} [nodeId] Aether skill node identifier.
 */

/**
 * @typedef {Object} AilmentEntry
 * @property {string} id Ailment identifier token.
 */

/**
 * @typedef {Object} Battler
 * @property {string} [id] Unique battler identifier.
 * @property {string} [name] Display name.
 * @property {number} [hp] Current health points.
 * @property {number} [maxHp] Maximum health points.
 * @property {number} [mp] Current magic points.
 * @property {number} [maxMp] Maximum magic points.
 * @property {number} [atk] Attack power rating.
 * @property {number} [def] Defense rating.
 * @property {number} [agi] Agility rating.
 * @property {boolean} [alive] Alive status flag.
 * @property {string} [row] Placement row ('FRONT' | 'BACK' | 'BOTH').
 * @property {string} [phenotype] Character phenotype class.
 * @property {Object} [equipment] Equipped weapons and armor.
 * @property {string[]} [unlockedNodes] Unlocked progression nodes.
 * @property {string[]} [unlocked] Alternate unlocked nodes array.
 * @property {AilmentEntry[]} [ailments] Active status ailments.
 * @property {string[]} [weaknesses] Elemental weaknesses.
 * @property {string[]} [resistances] Elemental resistances.
 * @property {string[]} [immunities] Elemental immunities.
 * @property {boolean} [isBoss] Boss classification flag.
 * @property {boolean} [phaseTwoActive] Boss enraged/phase two flag.
 * @property {string} [key] Bestiary or entity key.
 * @property {string} [sprite] Fallback text or emoji sprite.
 * @property {number} [level] Character level.
 */

/**
 * @typedef {Object} SkillNode
 * @property {string} id Unique skill node identifier.
 * @property {string} label Display label.
 * @property {string} [name] Alternate name string.
 * @property {number} [mpCost] MP resource cost.
 * @property {string} [element] Elemental affinity token.
 * @property {string} [description] Skill description text.
 * @property {string} [subType] Skill behavioral subtype ('strike', 'bolt', 'heal', etc.).
 * @property {number} [multiplier] Damage scaling multiplier.
 * @property {number} [mult] Alternate scaling multiplier.
 * @property {number} [power] Base power rating.
 * @property {number} [accuracy] Hit rate accuracy percentage.
 * @property {string} [targetType] Target scope ('ally' | 'enemy').
 */

/**
 * @typedef {Object} TurnQueueEntry
 * @property {Battler} entity Battler entity currently queued.
 */

/**
 * @typedef {Object} CombatRewards
 * @property {number} [gold] Awarded gold.
 * @property {number} [exp] Awarded experience points.
 */

/**
 * @typedef {Object} CombatState
 * @property {string} [phase] Current combat phase identifier.
 * @property {SkillNode} [pendingSkill] Skill staged for execution.
 * @property {string} [pendingItem] Item staged for execution.
 * @property {string} [selectedTab] Currently selected command hub tab.
 * @property {Battler[]} [party] Squad party member array.
 * @property {Battler[]} [enemies] Hostile combatant array.
 * @property {TurnQueueEntry[]} [turnQueue] Active CTB initiative turn queue.
 * @property {number} [activeTurnIndex] Index of currently acting entity in turn queue.
 * @property {Object.<string, number>} [inventory] Item inventory counts keyed by ID.
 * @property {CombatRewards} [rewards] Battle reward spoils.
 * @property {number} [lastGainedGold] Finalized gold reward.
 * @property {number} [lastGainedExp] Finalized EXP reward.
 * @property {Array<Object>} [forecastQueue] CTB threat timeline forecast.
 */

/**
 * @typedef {Object} CombatDiagnostics
 * @property {string} driverId Driver internal identifier.
 * @property {boolean} mounted Mount state status flag.
 * @property {boolean} hasHostContext Whether a host context is bound.
 */

/**
 * @typedef {Object} CombatContext
 * @property {Object} [eventBus] Host event bus reference.
 */

const EmberlightCombatRenderer = (() => {
	'use strict';

	//#region [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
	let mounted = false;
	/** @type {function(CombatActionToken): void|null} */
	let actionHandler = null;
	/** @type {CombatContext|null} */
	let hostContext = null;

	/**
	 * Safely retrieves a DOM element by ID if available.
	 * @param {string} id DOM element identifier.
	 * @returns {HTMLElement|null} Element instance or null.
	 */
	function getElement(id) {
		return typeof document === 'undefined' ? null : document.getElementById(id);
	}

	/**
	 * Emits an authoritative action token to the simulation driver.
	 * @param {CombatActionToken} action Action token payload.
	 * @returns {void}
	 */
	function emit(action) {
		if (typeof actionHandler === 'function') {
			actionHandler(action);
		}
	}
	//#endregion

	//#region [SEC-02] Combat Affinity & Element Resolution Utilities
	/**
	 * Resolves elemental damage affinities and multipliers against target resistances.
	 * @param {string} attackElement Attack element token.
	 * @param {Battler} target Target battler object.
	 * @returns {{label: string, multiplier: number}} Affinity evaluation result.
	 */
	function resolveAffinity(attackElement, target) {
		if (!target || !attackElement || attackElement === 'NONE') return { label: 'NEUTRAL', multiplier: 1.0 };
		const elem = String(attackElement).toUpperCase();
		const weaknesses = (target.weaknesses || []).map((w) => String(w).toUpperCase());
		const resistances = (target.resistances || []).map((r) => String(r).toUpperCase());
		const immunities = (target.immunities || []).map((i) => String(i).toUpperCase());

		if (immunities.includes(elem)) return { label: 'IMMUNE', multiplier: 0.0 };
		if (weaknesses.includes(elem)) return { label: 'WEAK', multiplier: 1.5 };
		if (resistances.includes(elem)) return { label: 'RESIST', multiplier: 0.5 };
		return { label: 'NEUTRAL', multiplier: 1.0 };
	}

	/**
	 * Resolves the primary elemental type associated with an active skill.
	 * @param {SkillNode|null} skill Skill node object.
	 * @returns {string} Element name string.
	 */
	function getActiveSkillElement(skill) {
		if (!skill) return 'PHYSICAL';
		if (skill.element) return skill.element;
		return skill.subType === 'strike' ? 'PHYSICAL' : 'FIRE';
	}

	/**
	 * Renders HTML markup for an elemental affinity tag badge.
	 * @param {{label: string, multiplier: number}} affinity Affinity evaluation object.
	 * @returns {string} HTML markup string.
	 */
	function renderAffinityTag(affinity) {
		if (affinity.label === 'WEAK') {
			return '<span class="pip weak" style="color:var(--ember); font-weight:bold;">⚡ WEAK</span>';
		}
		if (affinity.label === 'RESIST') {
			return '<span class="pip resist" style="color:var(--text-dim);">🛡️ RESIST</span>';
		}
		return '';
	}
	//#endregion

	//#region [SEC-03] Action Theater & Telemetry Renderers
	/**
	 * Updates the visual clash header based on engagement phase and pending actions.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderClashHeader(state) {
		const clashIconEl = getElement('theater-clash-icon');
		const clashLabelEl = getElement('theater-clash-label');
		if (!clashIconEl || !clashLabelEl) return;

		if (state?.pendingSkill) {
			clashIconEl.textContent = '✨';
			clashLabelEl.textContent = (state.pendingSkill.label || state.pendingSkill.name || 'SKILL').toUpperCase();
		} else if (state?.phase === 'TARGETING_ENEMY') {
			clashIconEl.textContent = '⚔️';
			clashLabelEl.textContent = 'STRIKE TARGET';
		} else if (state?.phase === 'ENEMY_ACTION') {
			clashIconEl.textContent = '💥';
			clashLabelEl.textContent = 'ENEMY STRIKE';
		} else {
			clashIconEl.textContent = '⚔️';
			clashLabelEl.textContent = 'TACTICAL ENGAGEMENT';
		}
	}

	/**
	 * Generates affinity markup for telemetry HUD display.
	 * @param {{label: string, multiplier: number}} affinity Evaluated affinity object.
	 * @param {string} element Element name.
	 * @returns {string} HTML markup string.
	 */
	function getTelemetryAffinityMarkup(affinity, element) {
		if (affinity.label === 'WEAK') {
			return '<b style="color:var(--ember)">AFFINITY: ⚡ WEAKNESS (1.5x)</b>';
		}
		if (affinity.label === 'RESIST') {
			return '<b style="color:var(--text-dim)">AFFINITY: 🛡️ RESISTED (0.5x)</b>';
		}
		return `AFFINITY: ${element} (1.0x)`;
	}

	/**
	 * Renders telemetry stats for active skill casting.
	 * @param {Battler} activeChar Active battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {SkillNode} skill Active skill node.
	 * @param {HTMLElement} telemetryDmg Damage range element.
	 * @param {HTMLElement|null} telemetryHit Hit rate element.
	 * @param {HTMLElement|null} telemetryAffinity Affinity tag element.
	 * @returns {void}
	 */
	function renderSkillTelemetry(activeChar, targetEnemy, skill, telemetryDmg, telemetryHit, telemetryAffinity) {
		const element = getActiveSkillElement(skill);
		const powerMult = skill.multiplier || skill.mult || 1.4;
		const rawBase = Math.max(1, (activeChar.atk || 10) * powerMult * 1.5 - (targetEnemy.def || 5));
		const affinity = resolveAffinity(element, targetEnemy);
		const finalDmg = Math.max(1, Math.round(rawBase * affinity.multiplier));
		const estMin = Math.max(1, Math.round(finalDmg * 0.85));
		const estMax = Math.max(1, Math.round(finalDmg * 1.15));
		const hitRate = skill.accuracy || 95;

		if (telemetryAffinity) {
			telemetryAffinity.innerHTML = getTelemetryAffinityMarkup(affinity, element);
		}
		telemetryDmg.textContent = `EST DMG: ${estMin} ~ ${estMax}`;
		if (telemetryHit) telemetryHit.textContent = `HIT: ${hitRate}%`;
	}

	/**
	 * Renders basic attack telemetry stats.
	 * @param {Battler} activeChar Active battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {HTMLElement} telemetryDmg Damage range element.
	 * @param {HTMLElement|null} telemetryHit Hit rate element.
	 * @param {HTMLElement|null} telemetryAffinity Affinity tag element.
	 * @returns {void}
	 */
	function renderBasicTelemetry(activeChar, targetEnemy, telemetryDmg, telemetryHit, telemetryAffinity) {
		const rawBase = Math.max(1, (activeChar.atk || 10) * 2 - (targetEnemy.def || 5));
		const estMin = Math.max(1, rawBase - 2);
		const estMax = Math.max(1, rawBase + 3);
		if (telemetryAffinity) telemetryAffinity.innerHTML = 'AFFINITY: PHYSICAL (1.0x)';
		telemetryDmg.textContent = `EST DMG: ${estMin} ~ ${estMax}`;
		if (telemetryHit) telemetryHit.textContent = 'HIT: 95%';
	}

	/**
	 * Calculates and renders estimated damage, hit rates, and affinities in the telemetry HUD.
	 * @param {Battler} activeChar Active character battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderTelemetryStats(activeChar, targetEnemy, state) {
		const telemetryDmg = getElement('telemetry-dmg-range');
		const telemetryHit = getElement('telemetry-hit-rate');
		const telemetryAffinity = getElement('telemetry-affinity-tag');
		if (!telemetryDmg || !activeChar || !targetEnemy) return;

		if (state?.pendingSkill) {
			renderSkillTelemetry(activeChar, targetEnemy, state.pendingSkill, telemetryDmg, telemetryHit, telemetryAffinity);
		} else {
			renderBasicTelemetry(activeChar, targetEnemy, telemetryDmg, telemetryHit, telemetryAffinity);
		}
	}

	/**
	 * Renders the complete action theater view and telemetry panel.
	 * @param {Battler} activeChar Active character battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderActionTheater(activeChar, targetEnemy, state) {
		renderClashHeader(state);
		renderTelemetryStats(activeChar, targetEnemy, state);
	}
	//#endregion

	//#region [SEC-04] Enemy Formation Wing Renderers
	/**
	 * Resolves visual asset or icon URLs for an enemy battler.
	 * @param {Battler} enemy Enemy battler object.
	 * @param {boolean} isBossEnraged Boss enraged state flag.
	 * @param {number} heatPulse Heat pulse pulsation factor.
	 * @returns {string|null} Asset data URL or null.
	 */
	function resolveEnemyBattlerUrl(enemy, isBossEnraged, heatPulse) {
		if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
			const url = EmberlightBattlerBaker.get(enemy.key);
			if (url) return url;
		}
		const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
		const icons = win.EmberlightIcons || win.EmberlightPartyIcons;
		if (icons && typeof icons.get === 'function') {
			if (enemy.isBoss && typeof icons.getBossIcon === 'function') {
				return icons.getBossIcon(isBossEnraged, heatPulse);
			}
			return icons.get(enemy.key);
		}
		return null;
	}

	/**
	 * Resolves and renders an affinity badge for an enemy against active skills.
	 * @param {string} activeElement Active skill element.
	 * @param {Battler} enemy Enemy battler object.
	 * @returns {string} HTML markup string.
	 */
	function resolveEnemyAffinityBadge(activeElement, enemy) {
		if (!enemy.alive) return '';
		const affinity = resolveAffinity(activeElement, enemy);
		if (affinity.label === 'WEAK') {
			return '<div class="affinity-badge weak">⚡ WEAK 1.5x</div>';
		}
		if (affinity.label === 'RESIST') {
			return '<div class="affinity-badge resist">🛡️ RESIST 0.5x</div>';
		}
		return '';
	}

	/**
	 * Resolves boss attributes and enraged status.
	 * @param {Battler} e Battler entity.
	 * @returns {{isBossUnit: boolean, isBossEnraged: boolean, heatPulse: number, bossCls: string, bossBattlerClass: string}} Boss details.
	 */
	function resolveBossDetails(e) {
		const isBossUnit = Boolean(e.isBoss || (e.key && String(e.key).toUpperCase().includes('BOSS')) || (e.key && String(e.key).toUpperCase().includes('MALAKOR')));
		const isBossEnraged = Boolean(e.isBoss && e.phaseTwoActive);
		const heatPulse = isBossEnraged ? (1.0 + Math.sin(Date.now() * 0.008) * 0.25) : 1.0;
		const bossCls = isBossUnit ? 'boss-card boss-battler' : '';
		const bossBattlerClass = isBossUnit ? 'boss-battler' : '';
		return { isBossUnit, isBossEnraged, heatPulse, bossCls, bossBattlerClass };
	}

	/**
	 * Formats ailment classes and HTML tag markup for a battler.
	 * @param {Battler} e Battler entity.
	 * @returns {{ailmentList: string, ailmentClasses: string, ailmentTags: string}} Formatted ailment strings.
	 */
	function formatAilments(e) {
		const ailments = e.ailments || [];
		const ailmentList = ailments.map((a) => a.id).join(',');
		const ailmentClasses = ailments.map((a) => `has-ailment-${a.id.toLowerCase()}`).join(' ');
		const ailmentTags = ailments.map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`).join(' ');
		return { ailmentList, ailmentClasses, ailmentTags };
	}

	/**
	 * Renders the HTML card for an individual enemy unit slot.
	 * @param {{e: Battler, idx: number}} item Enemy entry and array index.
	 * @param {string} activeElement Active skill element.
	 * @returns {string} HTML markup string.
	 */
	function renderEnemyCard({ e, idx }, activeElement) {
		const { isBossEnraged, heatPulse, bossCls, bossBattlerClass } = resolveBossDetails(e);
		const hpPct = e.maxHp > 0 ? Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)) : 0;
		const isExhausted = e.alive && (e.hp / e.maxHp) <= 0.30;
		const { ailmentList, ailmentClasses, ailmentTags } = formatAilments(e);

		const battlerUrl = resolveEnemyBattlerUrl(e, isBossEnraged, heatPulse);
		let spriteHtml = `<div class="sprite">${e.sprite || '👾'}</div>`;
		if (battlerUrl) {
			spriteHtml = `<img src="${battlerUrl}" class="battler-sprite enemy-battler ${bossBattlerClass}" alt="${e.name}" />`;
		}

		const affinityBadgeHtml = resolveEnemyAffinityBadge(activeElement, e);
		const rowClass = (e.row === 'FRONT' || e.row === 'BOTH' || !e.row) ? 'row-front' : 'row-back';
		const rowTag = e.row === 'BACK' ? '<div class="backline-tag">BACKLINE (+15% EVA)</div>' : '<div class="frontline-tag">FRONTLINE</div>';
		const stanceClass = isExhausted ? 'exhausted' : '';
		const exhaustedBadge = isExhausted ? '<div class="exhausted-badge">⚠️ TIRED (≤30%)</div>' : '';

		return `
      <div class="enemy formation-slot ${rowClass} ${stanceClass} ${e.alive ? '' : 'dead'} ${bossCls} ${ailmentClasses}" data-idx="${idx}" data-ailments="${ailmentList}" tabindex="0" style="position:relative; width:100%;">
        ${affinityBadgeHtml}
        ${spriteHtml}
        <div style="font-size:7.5px; font-weight:bold; margin-top:2px;">${e.name || 'Enemy'} ${isBossEnraged ? '<span style="color:var(--danger)">[ENRAGED]</span>' : ''}</div>
        ${rowTag}
        ${exhaustedBadge}
        <div class="bar-row" style="margin-top:2px; width:90%;">
          <span class="bar-track"><span class="bar-fill hp" style="width:${hpPct}%"></span></span>
        </div>
        <div class="hp-label" style="font-size:6px;">${e.hp}/${e.maxHp} HP ${ailmentTags}</div>
      </div>
    `;
	}

	/**
	 * Renders the complete enemy formation wing container and attaches interaction listeners.
	 * @param {HTMLElement|null} container Enemy wing container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler} activeChar Active character battler.
	 * @returns {void}
	 */
	function renderEnemyWing(container, state, activeChar) {
		if (!container) return;
		container.className = 'formation-grid enemy-wing';

		const enemies = state.enemies || [];
		const frontEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'FRONT' || e.row === 'BOTH' || !e.row);
		const backEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'BACK');
		const activeElement = getActiveSkillElement(state.pendingSkill);

		container.innerHTML = `
      <div class="formation-row">
        <div class="formation-row-header">🏹 HOSTILE BACK</div>
        ${backEnemies.map((item) => renderEnemyCard(item, activeElement)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:12px;">Back Clear</div>'}
      </div>
      <div class="formation-row">
        <div class="formation-row-header">⚔️ HOSTILE FRONT</div>
        ${frontEnemies.map((item) => renderEnemyCard(item, activeElement)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:12px;">Front Clear</div>'}
      </div>
    `;

		container.querySelectorAll('.enemy.formation-slot').forEach((el) => {
			/** @type {HTMLElement} */
			const htmlEl = /** @type {HTMLElement} */ (el);
			const idx = Number.parseInt(htmlEl.dataset.idx || '0', 10);
			const target = enemies[idx];

			htmlEl.addEventListener('mouseenter', () => {
				if (target?.alive) {
					renderActionTheater(activeChar, target, state);
				}
			});
			htmlEl.addEventListener('focus', () => {
				if (target?.alive) {
					renderActionTheater(activeChar, target, state);
				}
			});
			htmlEl.addEventListener('mouseleave', () => {
				const defaultEnemy = enemies.find((e) => e.alive);
				renderActionTheater(activeChar, defaultEnemy, state);
			});

			if (target?.alive) {
				htmlEl.classList.add('targetable');
				htmlEl.addEventListener('click', () => {
					if (state.pendingSkill) {
						emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: false });
					} else {
						emit({ type: 'ATTACK', targetIndex: idx });
					}
				});
			}
		});
	}
	//#endregion

	//#region [SEC-05] Party Formation Wing Renderers
	/**
	 * Resolves the visual battler URL for a party member.
	 * @param {Battler} c Party character object.
	 * @returns {string|null} Asset URL or null.
	 */
	function resolvePartyBattlerUrl(c) {
		if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
			return EmberlightBattlerBaker.get({
				phenotype: c.phenotype,
				weapon: c.equipment?.weapon,
				armor: c.equipment?.armor,
			});
		}
		return null;
	}

	/**
	 * Renders the HTML card for an individual party member slot.
	 * @param {{c: Battler, idx: number}} item Party character entry and array index.
	 * @param {Battler|null} currentTurnEntity Currently active turn entity.
	 * @returns {string} HTML markup string.
	 */
	function renderPartyCard({ c, idx }, currentTurnEntity) {
		const isTurn = currentTurnEntity?.id === c.id;
		const curHp = c.hp !== undefined ? c.hp : (c.maxHp || 30);
		const maxHp = c.maxHp || 30;
		const curMp = c.mp !== undefined ? c.mp : (c.maxMp || 10);
		const maxMp = c.maxMp !== undefined ? c.maxMp : 10;
		const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100))) : 0;
		const mpPct = maxMp > 0 ? Math.max(0, Math.min(100, Math.round((curMp / maxMp) * 100))) : 0;
		const isExhausted = c.alive && (curHp / maxHp) <= 0.30;
		const ailmentList = (c.ailments || []).map((a) => a.id).join(',');
		const ailmentClasses = (c.ailments || []).map((a) => `has-ailment-${a.id.toLowerCase()}`).join(' ');
		const ailmentTags = (c.ailments || []).map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`).join(' ');

		const rowClass = (c.row === 'FRONT' || c.row === 'BOTH' || !c.row) ? 'row-front' : 'row-back';
		const rowTag = c.row === 'BACK' ? '<div class="backline-tag">ARCANIST BACK</div>' : '<div class="frontline-tag">VANGUARD FRONT</div>';
		const stanceClass = isExhausted ? 'exhausted' : '';
		const exhaustedBadge = isExhausted ? '<div class="exhausted-badge">⚠️ TIRED (≤30%)</div>' : '';

		const battlerUrl = resolvePartyBattlerUrl(c);
		const spriteHtml = battlerUrl
			? `<img src="${battlerUrl}" class="battler-sprite party-battler" alt="${c.name}" />`
			: `<div class="sprite">${c.sprite || '🛡️'}</div>`;

		const mpLabel = ` • ${curMp}/${maxMp} MP`;

		return `
      <div class="character formation-slot ${rowClass} ${stanceClass} ${isTurn ? 'active-turn' : ''} ${c.alive ? '' : 'fainted'} ${ailmentClasses}" data-idx="${idx}" data-ailments="${ailmentList}" tabindex="0" style="position:relative; width:100%;">
        ${spriteHtml}
        <div style="font-size:7.5px; font-weight:bold; margin-top:2px;">${c.name || 'Hero'} <span class="char-class" style="color:var(--text-dim); font-size:6px;">Lv${c.level || 1}</span></div>
        ${rowTag}
        ${exhaustedBadge}
        <div class="bar-row" style="margin-top:2px; width:90%;">
          <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
        </div>
        <div class="bar-row" style="margin-top:1px; width:90%;">
          <span class="bar-track"><span class="hud-bar-fill mp" style="width:${mpPct}%"></span></span>
        </div>
        <div class="hp-label" style="font-size:6px; color:var(--text-dim); margin-top:1px;">${curHp}/${maxHp} HP${mpLabel} ${ailmentTags}</div>
      </div>
    `;
	}

	/**
	 * Renders the complete party formation wing container and attaches ally targeting listeners.
	 * @param {HTMLElement|null} container Party wing container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderPartyWing(container, state) {
		if (!container) return;
		container.className = 'formation-grid party-wing';

		const party = state.party || [];
		const currentTurnEntity = state.turnQueue?.[state.activeTurnIndex]?.entity || party[0];
		const frontParty = party.map((c, idx) => ({ c, idx })).filter(({ c }) => c.row === 'FRONT' || c.row === 'BOTH' || !c.row);
		const backParty = party.map((c, idx) => ({ c, idx })).filter(({ c }) => c.row === 'BACK');

		container.innerHTML = `
      <div class="formation-row">
        <div class="formation-row-header">🛡️ VANGUARD FRONT</div>
        ${frontParty.map((item) => renderPartyCard(item, currentTurnEntity)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:8px;">Empty</div>'}
      </div>
      <div class="formation-row">
        <div class="formation-row-header">✨ ARCANIST BACK</div>
        ${backParty.map((item) => renderPartyCard(item, currentTurnEntity)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:8px;">Empty</div>'}
      </div>
    `;

		if (state.phase === 'TARGETING_ALLY' || state.pendingSkill?.targetType === 'ally' || state.pendingItem) {
			container.querySelectorAll('.character.formation-slot').forEach((el) => {
				/** @type {HTMLElement} */
				const htmlEl = /** @type {HTMLElement} */ (el);
				const idx = Number.parseInt(htmlEl.dataset.idx || '0', 10);
				const ally = party[idx];
				if (ally && (ally.alive || state.pendingItem === 'PHOENIX_EMBER')) {
					htmlEl.classList.add('targetable-ally');
					htmlEl.addEventListener('click', () => {
						if (state.pendingItem) {
							emit({ type: 'ITEM', itemId: state.pendingItem, targetIndex: idx });
						} else if (state.pendingSkill) {
							emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: true });
						} else {
							emit({ type: 'TARGET_ALLY', targetIndex: idx });
						}
					});
				}
			});
		}
	}
	//#endregion

	//#region [SEC-06] Subdeck Renderers (Attack, Skills, Pouch, Guard)
	/**
	 * Renders the attack target selector subdeck.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderSubdeckAttack(subDeck, state) {
		if (!subDeck) return;
		const activeElement = getActiveSkillElement(state.pendingSkill);
		const enemies = (state.enemies || []).filter((e) => e.alive);
		if (enemies.length === 0) {
			subDeck.innerHTML = '<div class="subdeck-empty">All hostile targets eliminated.</div>';
			return;
		}

		const cancelBtnHtml = state.pendingSkill
			? '<button type="button" class="cmd-btn" id="subdeck-cancel-skill-btn" style="font-size:6px; padding:2px 8px; margin-bottom:6px;">[ESC] CANCEL SPELL</button>'
			: '';

		subDeck.innerHTML = `
      <div class="subdeck-target-selector">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="subdeck-title">SELECT TARGET ENEMY:</span>
          ${cancelBtnHtml}
        </div>
        <div class="target-selector-grid">
          ${(state.enemies || []).map((enemy, idx) => {
			if (!enemy.alive) return '';
			const affinity = resolveAffinity(activeElement, enemy);
			const affTag = renderAffinityTag(affinity);
			const hpPct = enemy.maxHp > 0 ? Math.round((enemy.hp / enemy.maxHp) * 100) : 0;

			return `
              <button type="button" class="target-select-btn" data-enemy-idx="${idx}">
                <div class="target-name">[${idx + 1}] ${enemy.name} ${affTag}</div>
                <div class="target-hp-bar">
                  <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                  <span class="target-hp-num">${enemy.hp}/${enemy.maxHp} HP</span>
                </div>
              </button>
            `;
		}).join('')}
        </div>
      </div>
    `;

		const cancelBtn = subDeck.querySelector('#subdeck-cancel-skill-btn');
		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_SKILL' }));
		}

		subDeck.querySelectorAll('[data-enemy-idx]').forEach((btn) => {
			/** @type {HTMLElement} */
			const htmlBtn = /** @type {HTMLElement} */ (btn);
			const idx = Number.parseInt(htmlBtn.dataset.enemyIdx || '0', 10);
			htmlBtn.addEventListener('click', () => {
				if (state.pendingSkill) {
					emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: false });
				} else {
					emit({ type: 'ATTACK', targetIndex: idx });
				}
			});
		});
	}

	/**
	 * Collects available active skill nodes for a hero from manifest skill trees or unlocked nodes.
	 * @param {Battler|null} activeChar Active character object.
	 * @returns {SkillNode[]} Array of skill node objects.
	 */
	function collectHeroSkills(activeChar) {
		const manifest = (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {}) || {};
		const unlockedIds = activeChar?.unlockedNodes || activeChar?.unlocked || [];
		/** @type {SkillNode[]} */
		const activeSkills = [];

		if (manifest.AetherNodes) {
			unlockedIds.forEach((nodeId) => {
				const node = manifest.AetherNodes[nodeId];
				if (node?.type === 'active' && !activeSkills.some((s) => s.id === node.id)) {
					activeSkills.push(node);
				}
			});
		}

		if (activeSkills.length === 0 && manifest.SkillTrees && activeChar?.phenotype) {
			const tree = manifest.SkillTrees[activeChar.phenotype] || {};
			Object.values(tree).forEach((branch) => {
				if (Array.isArray(branch)) {
					branch.forEach((node) => {
						if (node.type === 'active' && unlockedIds.includes(node.id) && !activeSkills.some((s) => s.id === node.id)) {
							activeSkills.push(node);
						}
					});
				}
			});
		}

		if (activeSkills.length === 0) {
			if (activeChar?.phenotype === 'MAGE') {
				activeSkills.push({ id: 'mag_des_1', label: 'Flame Surge', mpCost: 5, element: 'FIRE', description: 'Unleash searing firebolt with burn chance.', subType: 'bolt', power: 12 });
			} else if (activeChar?.phenotype === 'HEALER') {
				activeSkills.push({ id: 'hea_lum_1', label: 'Soothing Light', mpCost: 4, element: 'HOLY', description: 'Restores 25 HP to target ally.', targetType: 'ally', subType: 'heal', power: 25 });
			} else {
				activeSkills.push({ id: 'war_vor_1', label: 'Cleave Strike', mpCost: 4, element: 'PHYSICAL', description: 'Heavy melee slash deal 1.5x damage.', subType: 'strike', mult: 1.5 });
			}
		}
		return activeSkills;
	}

	/**
	 * Renders the skill deck subview or ally target selection when casting supportive spells.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler} activeChar Active character object.
	 * @returns {void}
	 */
	function renderSubdeckSkills(subDeck, state, activeChar) {
		if (!subDeck) return;
		if (state.phase === 'TARGETING_ALLY' && state.pendingSkill) {
			subDeck.innerHTML = `
        <div class="subdeck-target-selector">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="subdeck-title">SELECT ALLY TARGET:</span>
            <button type="button" class="cmd-btn" id="subdeck-cancel-ally-skill-btn" style="font-size:6px; padding:2px 8px;">[ESC] CANCEL</button>
          </div>
          <div class="target-selector-grid">
            ${(state.party || []).map((hero, idx) => {
				const hpPct = hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * 100) : 0;
				return `
                <button type="button" class="target-select-btn" data-ally-idx="${idx}" ${hero.alive ? '' : 'disabled'}>
                  <div class="target-name">[${idx + 1}] ${hero.name} (Lv${hero.level || 1})</div>
                  <div class="target-hp-bar">
                    <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                    <span class="target-hp-num">${hero.hp}/${hero.maxHp} HP</span>
                  </div>
                </button>
              `;
			}).join('')}
          </div>
        </div>
      `;

			const cancelBtn = subDeck.querySelector('#subdeck-cancel-ally-skill-btn');
			if (cancelBtn) {
				cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_SKILL' }));
			}

			subDeck.querySelectorAll('[data-ally-idx]').forEach((btn) => {
				/** @type {HTMLElement} */
				const htmlBtn = /** @type {HTMLElement} */ (btn);
				const idx = Number.parseInt(htmlBtn.dataset.allyIdx || '0', 10);
				htmlBtn.addEventListener('click', () => {
					emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: true });
				});
			});
			return;
		}

		const activeSkills = collectHeroSkills(activeChar);

		subDeck.innerHTML = `
      <div class="skills-deck-grid">
        ${activeSkills.map((node) => {
			const canAfford = (activeChar?.mp || 0) >= (node.mpCost || 0);
			const iconUrl = typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons.get(node.id) : null;
			const elemBadge = node.element ? `<span class="skill-elem-tag ${node.element.toLowerCase()}">${node.element}</span>` : '';

			return `
            <div class="skill-deck-card ${canAfford ? '' : 'disabled'}" data-skill-id="${node.id}">
              <div class="skill-card-top">
                ${iconUrl ? `<img src="${iconUrl}" class="skill-card-icon" alt="${node.label}" />` : ''}
                <div class="skill-card-info">
                  <div class="skill-card-name">${node.label} ${elemBadge}</div>
                  <div class="skill-card-cost">${node.mpCost || 0} MP</div>
                </div>
              </div>
              <div class="skill-card-desc">${node.description || 'Channel tactical arcane energy.'}</div>
            </div>
          `;
		}).join('')}
      </div>
    `;

		subDeck.querySelectorAll('.skill-deck-card:not(.disabled)').forEach((card) => {
			/** @type {HTMLElement} */
			const htmlCard = /** @type {HTMLElement} */ (card);
			const skillId = htmlCard.dataset.skillId;
			const skillNode = activeSkills.find((s) => s.id === skillId);
			if (skillNode) {
				htmlCard.addEventListener('click', () => {
					emit({ type: 'SELECT_SKILL', skill: skillNode });
				});
			}
		});
	}

	/**
	 * Renders the item pouch subdeck or pouch target selector.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderSubdeckPouch(subDeck, state) {
		if (!subDeck) return;
		if (state.pendingItem) {
			subDeck.innerHTML = `
        <div class="subdeck-target-selector">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="subdeck-title">USE ${state.pendingItem} ON ALLY:</span>
            <button type="button" class="cmd-btn" id="subdeck-cancel-item-btn" style="font-size:6px; padding:2px 8px;">[ESC] CANCEL</button>
          </div>
          <div class="target-selector-grid">
            ${(state.party || []).map((hero, idx) => {
				const isPhoenix = state.pendingItem === 'PHOENIX_EMBER';
				const canUse = isPhoenix ? !hero.alive : hero.alive;
				const hpPct = hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * 100) : 0;
				return `
                <button type="button" class="target-select-btn" data-item-target-idx="${idx}" ${canUse ? '' : 'disabled'}>
                  <div class="target-name">[${idx + 1}] ${hero.name} ${hero.alive ? '' : '(COLLAPSED)'}</div>
                  <div class="target-hp-bar">
                    <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                    <span class="target-hp-num">${hero.hp}/${hero.maxHp} HP</span>
                  </div>
                </button>
              `;
			}).join('')}
          </div>
        </div>
      `;

			const cancelBtn = subDeck.querySelector('#subdeck-cancel-item-btn');
			if (cancelBtn) {
				cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_ITEM' }));
			}

			subDeck.querySelectorAll('[data-item-target-idx]:not([disabled])').forEach((btn) => {
				/** @type {HTMLElement} */
				const htmlBtn = /** @type {HTMLElement} */ (btn);
				const idx = Number.parseInt(htmlBtn.dataset.itemTargetIdx || '0', 10);
				htmlBtn.addEventListener('click', () => {
					emit({ type: 'ITEM', itemId: state.pendingItem, targetIndex: idx });
				});
			});
			return;
		}

		const inv = state.inventory || {};
		const items = [
			{ id: 'POTION', name: 'Health Potion', effect: 'Restores 30 HP to an ally', count: inv.POTION || 0 },
			{ id: 'ETHER', name: 'Ether Flask', effect: 'Restores 15 MP to an ally', count: inv.ETHER || 0 },
			{ id: 'PHOENIX_EMBER', name: 'Phoenix Ember', effect: 'Revives fallen ally (50% HP)', count: inv.PHOENIX_EMBER || 0 },
		];

		subDeck.innerHTML = `
      <div class="pouch-deck-grid">
        ${items.map((item) => {
			const hasItem = item.count > 0;
			const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
			const icons = win.EmberlightIcons || win.EmberlightPartyIcons;
			const iconUrl = icons && typeof icons.get === 'function' ? icons.get(item.id) : null;
			return `
            <div class="pouch-deck-card ${hasItem ? '' : 'disabled'}" data-pouch-item-id="${item.id}">
              <div class="pouch-card-top">
                ${iconUrl ? `<img src="${iconUrl}" class="pouch-card-icon" alt="${item.name}" />` : ''}
                <div class="pouch-card-info">
                  <div class="pouch-card-name">${item.name}</div>
                  <div class="pouch-card-count">x${item.count}</div>
                </div>
              </div>
              <div class="pouch-card-desc">${item.effect}</div>
            </div>
          `;
		}).join('')}
      </div>
    `;

		subDeck.querySelectorAll('.pouch-deck-card:not(.disabled)').forEach((card) => {
			/** @type {HTMLElement} */
			const htmlCard = /** @type {HTMLElement} */ (card);
			const itemId = htmlCard.dataset.pouchItemId;
			htmlCard.addEventListener('click', () => {
				emit({ type: 'SELECT_ITEM', itemId });
			});
		});
	}

	/**
	 * Renders the guard action confirmation subdeck pane.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @returns {void}
	 */
	function renderSubdeckGuard(subDeck) {
		if (!subDeck) return;
		subDeck.innerHTML = `
      <div class="guard-confirm-pane">
        <div class="guard-icon">🛡️</div>
        <div class="guard-desc">
          <b>Tactical Defensive Stance:</b><br/>
          Reduces all incoming damage by <b>50%</b> until next turn.<br/>
          Restores <b>2 MP</b> through tactical focus.
        </div>
        <button type="button" class="cmd-btn action guard-act-btn" id="confirm-guard-btn">CONFIRM GUARD STANCE</button>
      </div>
    `;
		const gBtn = subDeck.querySelector('#confirm-guard-btn');
		if (gBtn) {
			/** @type {HTMLElement} */
			const htmlBtn = /** @type {HTMLElement} */ (gBtn);
			htmlBtn.addEventListener('click', () => emit({ type: 'GUARD' }));
		}
	}
	//#endregion

	//#region [SEC-07] Action & Command Hub Renderers
	/**
	 * Renders the battle victory spoils panel.
	 * @param {HTMLElement} subDeck Subdeck container element.
	 * @param {HTMLElement|null} title Title element.
	 * @param {HTMLElement|null} tag Tag element.
	 * @param {HTMLElement} ribbon Primary ribbon container.
	 * @param {CombatState} state Active state snapshot.
	 * @returns {void}
	 */
	function renderVictoryView(subDeck, title, tag, ribbon, state) {
		if (title) title.textContent = '🏆 BATTLE VICTORY — SPOILS SECURED';
		if (tag) tag.textContent = 'Victory!';
		ribbon.innerHTML = '';
		const gainedGold = state.lastGainedGold !== undefined ? state.lastGainedGold : (state.rewards?.gold || 0);
		const gainedExp = state.lastGainedExp !== undefined ? state.lastGainedExp : (state.rewards?.exp || 0);
		const survivors = (state.party || []).filter((c) => c.alive).length;

		subDeck.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; text-align:center; background:rgba(12,18,32,0.92); border:1px solid var(--ember); border-radius:4px; box-shadow:0 0 16px rgba(255,157,77,0.3);">
        <div style="font-size:13px; font-weight:bold; color:var(--ember); margin-bottom:4px; text-shadow:0 0 10px var(--shadow-ember);">⚔️ VICTORY ACHIEVED ⚔️</div>
        <div style="font-size:7.5px; color:var(--ok); margin-bottom:6px;">All hostile threats vanquished. Spoils credited to squad inventory.</div>
        <div style="display:flex; gap:12px; font-size:7px; color:var(--text); margin-bottom:10px; background:rgba(0,0,0,0.5); padding:4px 10px; border-radius:3px; border:1px solid var(--border-dim);">
          <span>💰 Gold: <b style="color:var(--ember)">+${gainedGold}G</b></span>
          <span>⭐ EXP: <b style="color:#38bdf8">+${gainedExp}</b></span>
          <span>🛡️ Squad: <b style="color:var(--ok)">${survivors}/${(state.party || []).length} Standing</b></span>
        </div>
        <button type="button" class="cmd-btn action" id="victory-continue-btn" style="padding:6px 20px; font-size:8px; cursor:pointer;">▶ CONTINUE EXPEDITION [SPACE]</button>
      </div>
    `;
		const contBtn = subDeck.querySelector('#victory-continue-btn');
		if (contBtn) {
			/** @type {HTMLElement} */
			const htmlContBtn = /** @type {HTMLElement} */ (contBtn);
			htmlContBtn.addEventListener('click', (e) => {
				e.preventDefault();
				emit({ type: 'CONFIRM' });
			});
		}
	}

	/**
	 * Renders the expedition defeat panel.
	 * @param {HTMLElement} subDeck Subdeck container element.
	 * @param {HTMLElement|null} title Title element.
	 * @param {HTMLElement|null} tag Tag element.
	 * @param {HTMLElement} ribbon Primary ribbon container.
	 * @param {CombatState} state Active state snapshot.
	 * @returns {void}
	 */
	function renderDefeatView(subDeck, title, tag, ribbon, state) {
		if (title) title.textContent = '💀 EXPEDITION DEFEAT';
		if (tag) tag.textContent = 'Defeat';
		ribbon.innerHTML = '';
		subDeck.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; text-align:center; background:rgba(20,8,12,0.92); border:1px solid var(--danger); border-radius:4px; box-shadow:0 0 16px rgba(239,68,68,0.3);">
        <div style="font-size:13px; font-weight:bold; color:var(--danger); margin-bottom:4px;">💀 PARTY HAS FALLEN 💀</div>
        <div style="font-size:7.5px; color:var(--text-dim); margin-bottom:10px;">The squad collapsed in combat.</div>
        <button type="button" class="cmd-btn" id="defeat-continue-btn" style="padding:6px 20px; font-size:8px; border-color:var(--danger); color:var(--danger); cursor:pointer;">▲ ADVANCE TO HARBOR [SPACE]</button>
      </div>
    `;
		const contBtn = subDeck.querySelector('#defeat-continue-btn');
		if (contBtn) {
			/** @type {HTMLElement} */
			const htmlContBtn = /** @type {HTMLElement} */ (contBtn);
			htmlContBtn.addEventListener('click', (e) => {
				e.preventDefault();
				emit({ type: 'CONFIRM' });
			});
		}
	}

	/**
	 * Renders active command hub tabs and subdeck view.
	 * @param {CombatState} state Active state snapshot.
	 * @param {Battler|null} activeChar Active character battler.
	 * @param {HTMLElement} ribbon Ribbon container.
	 * @param {HTMLElement} subDeck Subdeck container.
	 * @param {HTMLElement|null} fleeBtn Flee button element.
	 * @param {string} selectedTab Selected tab identifier.
	 * @returns {void}
	 */
	function renderActiveCommandHub(state, activeChar, ribbon, subDeck, fleeBtn, selectedTab) {
		function previewDelay(_delayCost) {
			if (!activeChar || typeof EmberlightThreatOracle === 'undefined') return;
			const forecast = EmberlightThreatOracle.calculateTimeline(state.party, state.enemies, 12);
			EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
				party: state.party,
				enemies: state.enemies,
				forecastQueue: forecast,
				bossIntent: state.enemies?.find((e) => e.isBoss && e.alive) || null,
			});
		}

		function restoreDelay() {
			if (typeof EmberlightThreatOracle === 'undefined') return;
			EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
				party: state.party,
				enemies: state.enemies,
				forecastQueue: state.forecastQueue || null,
				bossIntent: state.enemies?.find((e) => e.isBoss && e.alive) || null,
			});
		}

		const tabs = [
			{ id: 'ATTACK', label: '⚔️ ATTACK [1]', cls: 'action', delayCost: 1000 / Math.max(1, activeChar?.agi || 10) },
			{ id: 'SKILLS', label: '✨ SKILLS [2]', cls: 'skill', delayCost: 1100 / Math.max(1, activeChar?.agi || 10) },
			{ id: 'GUARD', label: '🛡️ GUARD [3]', cls: '', delayCost: 500 / Math.max(1, activeChar?.agi || 10) },
			{ id: 'POUCH', label: '🧪 POUCH [4]', cls: 'run', delayCost: 800 / Math.max(1, activeChar?.agi || 10) },
		];

		ribbon.innerHTML = tabs.map((tab) => `
      <button type="button" class="cmd-btn ${tab.cls} ${selectedTab === tab.id ? 'active-tab' : ''}" data-tab-id="${tab.id}">
        ${tab.label}
      </button>
    `).join('');

		ribbon.querySelectorAll('[data-tab-id]').forEach((btn) => {
			/** @type {HTMLElement} */
			const htmlBtn = /** @type {HTMLElement} */ (btn);
			const tabId = htmlBtn.dataset.tabId;
			const tabDef = tabs.find((t) => t.id === tabId);
			htmlBtn.addEventListener('mouseenter', () => { if (tabDef) previewDelay(tabDef.delayCost); });
			htmlBtn.addEventListener('mouseleave', () => restoreDelay());
			htmlBtn.addEventListener('click', () => {
				emit({ type: 'SELECT_TAB', tab: tabId });
			});
		});

		subDeck.innerHTML = '';
		if (selectedTab === 'ATTACK' || state.phase === 'TARGETING_ENEMY') {
			renderSubdeckAttack(subDeck, state);
		} else if (selectedTab === 'SKILLS') {
			renderSubdeckSkills(subDeck, state, activeChar);
		} else if (selectedTab === 'POUCH') {
			renderSubdeckPouch(subDeck, state);
		} else if (selectedTab === 'GUARD') {
			renderSubdeckGuard(subDeck);
		}

		if (fleeBtn) {
			/** @type {HTMLElement} */
			const htmlFleeBtn = /** @type {HTMLElement} */ (fleeBtn);
			htmlFleeBtn.addEventListener('click', () => emit({ type: 'FLEE' }));
		}
	}

	/**
	 * Renders the primary action ribbon, command hub, victory/defeat panels, and tab event handlers.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler|null} activeChar Active character battler object.
	 * @returns {void}
	 */
	function renderCommandHub(state, activeChar) {
		const ribbon = getElement('command-primary-ribbon');
		const subDeck = getElement('command-sub-deck');
		const title = getElement('command-deck-title');
		const tag = getElement('command-deck-tag');
		const fleeBtn = getElement('combat-flee-btn');
		if (!ribbon || !subDeck) return;

		const selectedTab = state.selectedTab || 'ATTACK';
		if (title) title.textContent = `🎯 ${activeChar ? (activeChar.name || 'HERO').toUpperCase() : 'PARTY'} COMMAND HUB`;
		if (tag) tag.textContent = `Active: ${selectedTab}`;

		if (state.phase === 'VICTORY') {
			renderVictoryView(subDeck, title, tag, ribbon, state);
			return;
		}

		if (state.phase === 'DEFEAT') {
			renderDefeatView(subDeck, title, tag, ribbon, state);
			return;
		}

		renderActiveCommandHub(state, activeChar, ribbon, subDeck, fleeBtn, selectedTab);
	}
	//#endregion

	//#region [SEC-08] Public VSRP-001 Tier-3 Interface Gateway
	return {
		/**
		 * Initializes the combat presentation driver.
		 * @param {CombatContext} context Host context container.
		 * @returns {void}
		 */
		init(context) {
			mounted = true;
			hostContext = context;
		},

		/**
		 * Renders the combat viewport state to the DOM presentation layer.
		 * @param {CombatState} state Active combat state snapshot.
		 * @param {function(CombatActionToken): void} [dispatch] Action dispatch handler.
		 * @returns {void}
		 */
		render(state, dispatch) {
			if (!state) return;
			mounted = true;
			if (typeof dispatch === 'function') {
				actionHandler = dispatch;
			}

			const activeChar = state.turnQueue?.[state.activeTurnIndex]?.entity || state.party?.[0];
			const defaultEnemy = (state.enemies || []).find((e) => e.alive) || state.enemies?.[0];

			const backdropCanvas = getElement('combat-backdrop-canvas');
			if (backdropCanvas && typeof EmberlightCombatBackdrop !== 'undefined' && typeof EmberlightCombatBackdrop.render === 'function') {
				EmberlightCombatBackdrop.render('combat-backdrop-canvas');
			}

			if (typeof EmberlightThreatOracle !== 'undefined' && typeof EmberlightThreatOracle.render === 'function') {
				EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
					party: state.party || [],
					enemies: state.enemies || [],
					forecastQueue: state.forecastQueue || null,
					bossIntent: (state.enemies || []).find((e) => e.isBoss && e.alive) || null,
					selectedAction: state.pendingSkill || { type: state.selectedTab || 'ATTACK' },
				});
			}

			renderEnemyWing(getElement('enemy-row'), state, activeChar);
			renderPartyWing(getElement('party-grid'), state);
			renderActionTheater(activeChar, defaultEnemy, state);
			renderCommandHub(state, activeChar);
		},

		/**
		 * Starts harmonic channeling visual effects.
		 * @param {SkillNode|null} node Skill node being channeled.
		 * @param {function(number): void} [onComplete] Completion callback.
		 * @returns {void}
		 */
		startHarmonicChanneling(node, onComplete) {
			emit({ type: 'CHANNELING_STARTED', nodeId: node?.id || null });
			if (typeof onComplete === 'function') {
				onComplete(100);
			}
		},

		/**
		 * Returns real-time diagnostic telemetry for the combat renderer.
		 * @returns {CombatDiagnostics} Diagnostic report object.
		 */
		getDiagnostics() {
			return {
				driverId: 'combat_renderer',
				mounted,
				hasHostContext: Boolean(hostContext),
			};
		},

		/**
		 * Purges runtime allocations and resets driver states.
		 * @returns {void}
		 */
		destroy() {
			actionHandler = null;
			mounted = false;
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightCombatRenderer = EmberlightCombatRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightCombatRenderer;
}