/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: THREAT ORACLE (CTB TIMELINE & TELEGRAPH ENGINE)
 * Document Identifier: VSRP-001-THREAT-ORACLE
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State & Initialization Gateway
 *   [SEC-02] CTB Timeline Projection & Forecasting Math Kernel
 *   [SEC-03] Threat Oracle DOM Presentation & Telegraph Renderer
 *   [SEC-04] Public VSRP-001 Interface Gateway & Diagnostics
 * ============================================================================
 */

/**
 * @typedef {Object} ThreatCombatant
 * @property {string} id Unique combatant identifier.
 * @property {string} name Combatant display name.
 * @property {'HERO' | 'ENEMY'} type Combatant domain type.
 * @property {string} [phenotype] Character class phenotype.
 * @property {string} [key] Enemy manifest key.
 * @property {number} agi Agility attribute rating.
 * @property {number} delay Base action delay cost.
 * @property {number} [currentDelay] Current accumulated clock delay.
 * @property {number} [accumulatedDelay] Accumulated clock delay override.
 * @property {boolean} [isDead] Death flag for enemies.
 * @property {number} [hp] Current hit points.
 * @property {boolean} [alive] Vital status flag.
 * @property {string} [weakness] Elemental weakness descriptor.
 * @property {string} [resistance] Elemental resistance descriptor.
 */

/**
 * @typedef {Object} ThreatTimelineTurn
 * @property {number} [turnIndex] Sequential turn index.
 * @property {string} id Combatant identifier.
 * @property {string} name Combatant display name.
 * @property {'HERO' | 'ENEMY'} type Combatant type.
 * @property {string} [phenotype] Character phenotype.
 * @property {string} [key] Enemy key.
 * @property {boolean} [isProjected] Projected forecast flag.
 * @property {number} [delayCost] Additional turn delay cost.
 */

/**
 * @typedef {Object} BossIntent
 * @property {string} name Boss or combatant name.
 * @property {string} [actionName] Prepared telegraph action name.
 * @property {number} [eta] Estimated turns until execution.
 */

/**
 * @typedef {Object} CombatStateSnapshot
 * @property {ThreatCombatant[]} [party] Party roster array.
 * @property {ThreatCombatant[]} [enemies] Active enemy combatants array.
 * @property {BossIntent|null} [bossIntent] Active boss intention telegraph.
 * @property {ThreatTimelineTurn[]} [forecastQueue] Pre-calculated forecast timeline queue.
 */

/**
 * @typedef {Object} ThreatEventBus
 * @property {function(string, function(any): void): function(): void} [subscribe] Subscription registration function.
 * @property {function(string, any): void} [publish] Event publishing function.
 */

// @ts-ignore
const EmberlightThreatOracle = (() => {
	"use strict";

	//#region [SEC-01] Type Definitions, Module State & Initialization Gateway
	/** @type {ThreatEventBus|null} */
	let eventBus = null;

	/**
	 * Initializes the Threat Oracle driver with an event bus reference.
	 * (State-mutating initialization gateway)
	 * @param {ThreatEventBus|null} [bus] Event bus reference handle.
	 * @returns {void}
	 */
	function init(bus) {
		eventBus = bus || null;
	}
	//#endregion

	//#region [SEC-02] CTB Timeline Projection & Forecasting Math Kernel
	/**
	 * Pure domain calculation for 12-turn forward CTB timeline.
	 * (Pure calculation utility)
	 * @param {ThreatCombatant[]} [party=[]] Active party combatants array.
	 * @param {ThreatCombatant[]} [enemies=[]] Active enemy combatants array.
	 * @param {number} [maxTurns=12] Maximum forward simulation turns.
	 * @returns {ThreatTimelineTurn[]} Calculated timeline queue array.
	 */
	function calculateTimeline(party = [], enemies = [], maxTurns = 12) {
		const combatants = [];

		party.forEach((hero) => {
			if (hero.alive) {
				const agi = Math.max(1, hero.agi || 10);
				const delay = 1000 / agi;
				combatants.push({
					id: hero.id,
					name: hero.name,
					type: 'HERO',
					phenotype: hero.phenotype,
					agi,
					delay,
					currentDelay: hero.accumulatedDelay !== undefined ? hero.accumulatedDelay : delay,
				});
			}
		});

		enemies.forEach((enemy) => {
			if (!enemy.isDead && (enemy.hp === undefined || enemy.hp > 0) && enemy.alive !== false) {
				const agi = Math.max(1, enemy.agi || 8);
				const delay = 1000 / agi;
				combatants.push({
					id: enemy.id,
					name: enemy.name || 'Enemy',
					type: 'ENEMY',
					key: enemy.key,
					agi,
					delay,
					currentDelay: enemy.accumulatedDelay !== undefined ? enemy.accumulatedDelay : delay,
				});
			}
		});

		if (combatants.length === 0) return [];

		const timeline = [];
		const simulatedClocks = combatants.map((c) => ({ ...c }));

		for (let t = 0; t < maxTurns; t++) {
			simulatedClocks.sort((a, b) => (a.currentDelay || 0) - (b.currentDelay || 0));
			const nextUnit = simulatedClocks[0];

			timeline.push({
				turnIndex: t + 1,
				id: nextUnit.id,
				name: nextUnit.name,
				type: nextUnit.type,
				phenotype: nextUnit.phenotype,
				key: nextUnit.key,
			});

			const stepTime = nextUnit.currentDelay || 0;
			simulatedClocks.forEach((c) => {
				c.currentDelay = Math.max(0, (c.currentDelay || 0) - stepTime);
			});
			nextUnit.currentDelay = nextUnit.delay;
		}

		return timeline;
	}
	//#endregion

	//#region [SEC-03] Threat Oracle DOM Presentation & Telegraph Renderer
	/**
	 * Resolves the crest icon URL for a timeline turn slot.
	 * (Pure calculation utility)
	 * @param {ThreatTimelineTurn} turn Timeline turn item.
	 * @param {boolean} isHero Hero indicator flag.
	 * @returns {string|null} Crest image URL or null.
	 */
	function resolveSlotCrest(turn, isHero) {
		const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
		if (isHero && win.EmberlightPartyIcons && typeof win.EmberlightPartyIcons.get === 'function') {
			return win.EmberlightPartyIcons.get(turn.phenotype);
		}
		if (!isHero && win.EmberlightIcons && turn.key && typeof win.EmberlightIcons.get === 'function') {
			return win.EmberlightIcons.get(turn.key);
		}
		return null;
	}

	/**
	 * Resolves the HTML markup for a turn slot icon.
	 * (Pure calculation utility)
	 * @param {ThreatTimelineTurn} turn Timeline turn item.
	 * @param {boolean} isHero Hero indicator flag.
	 * @param {string|null} crest Resolved crest icon URL.
	 * @returns {string} HTML markup string for the slot icon.
	 */
	function resolveSlotIconMarkup(turn, isHero, crest) {
		if (crest) {
			return `<img src="${crest}" class="slot-crest" alt="${turn.name}" />`;
		}
		const symbol = isHero ? '▲' : '☠';
		return `<span class="slot-char">${symbol}</span>`;
	}

	/**
	 * Renders the Threat Oracle ribbon and telegraphs into the DOM container.
	 * (State-mutating DOM presentation procedure)
	 * @param {string|HTMLElement|null} [containerId] Target container element or ID string.
	 * @param {CombatStateSnapshot} [combatState={}] Combat state payload snapshot.
	 * @returns {void}
	 */
	function render(containerId, combatState = {}) {
		if (typeof document === 'undefined') return;
		const ribbonBar = document.getElementById('combat-ctb-ribbon-bar');
		const targetContainer = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;

		const { party = [], enemies = [], bossIntent = null, forecastQueue = null } = combatState;
		const timeline = forecastQueue || calculateTimeline(party, enemies, 12);

		const ribbonHtml = timeline.map((turn, idx) => {
			const isHero = turn.type === 'HERO';
			const isTurnNow = idx === 0;
			const isProjected = Boolean(turn.isProjected);
			const crest = resolveSlotCrest(turn, isHero);
			const delayLabel = turn.delayCost ? ` (+${turn.delayCost} Delay)` : '';
			const iconMarkup = resolveSlotIconMarkup(turn, isHero, crest);

			return `
        <div class="turn-slot ${isTurnNow ? 'active-slot' : ''} ${isProjected ? 'projected-slot' : ''} ${isHero ? 'hero-slot' : 'enemy-slot'}" title="Turn ${turn.turnIndex || (idx + 1)}: ${turn.name}${delayLabel}">
          <div class="slot-idx">${turn.turnIndex || (idx + 1)}</div>
          ${iconMarkup}
          <div class="slot-name">${turn.name.slice(0, 5)}</div>
        </div>
      `;
		}).join('');

		// If master ribbon bar exists in DOM, populate it directly
		if (ribbonBar) {
			ribbonBar.innerHTML = ribbonHtml;
		}

		// If target container is provided and is not ribbonBar, populate full oracle panel
		if (targetContainer && targetContainer !== ribbonBar) {
			targetContainer.innerHTML = `
        <div class="threat-oracle-panel">
          <div class="oracle-header">
            <span class="oracle-title">🔮 THREAT ORACLE // CTB TIMELINE</span>
            <span class="oracle-subtext">12-Turn Vector</span>
          </div>

          <!-- 12-TURN ACTION RIBBON -->
          <div class="turn-ribbon">
            ${ribbonHtml}
          </div>

          <!-- BOSS / THREAT TELEGRAPH FEED -->
          <div class="telegraph-feed">
            ${bossIntent ? `
              <div class="telegraph-banner alert">
                <span class="pulse-icon">⚠️</span>
                <span class="telegraph-text"><b>${bossIntent.name}:</b> ${bossIntent.actionName || 'Preparing Strike'} (Turn ${bossIntent.eta || 1})</span>
              </div>
            ` : `
              <div class="telegraph-banner calm">
                <span>🛡️ Tactical formation stable. Awaiting action resolution.</span>
              </div>
            `}
          </div>

          <!-- CONTEXTUAL AFFINITY INSPECTOR -->
          <div class="affinity-inspector">
            <span class="inspector-label">AFFINITY PIP MATRIX:</span>
            <div class="affinity-pips">
              ${enemies.map((e) => {
				if (e.isDead || (e.hp !== undefined && e.hp <= 0)) return '';
				const weak = e.weakness ? `<span class="pip weak">⚡ ${e.weakness} (1.5x)</span>` : '';
				const resist = e.resistance ? `<span class="pip resist">🛡️ ${e.resistance} (0.5x)</span>` : '';
				return `
                  <div class="enemy-affinity-row">
                    <span class="enemy-label">${e.name}:</span>
                    ${weak} ${resist} ${!weak && !resist ? '<span class="pip neutral">NEUTRAL</span>' : ''}
                  </div>
                `;
			}).join('')}
            </div>
          </div>
        </div>
      `;
		}
	}
	//#endregion

	//#region [SEC-04] Public VSRP-001 Interface Gateway & Diagnostics
	return {
		init,
		calculateTimeline,
		render,
		getDiagnostics() {
			return {
				driverId: 'threat_oracle',
				eventBusActive: Boolean(eventBus),
			};
		},
	};
	//#endregion
})();

//#region [SEC-05] Global Export & Dual-Binding
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.EmberlightThreatOracle = EmberlightThreatOracle;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightThreatOracle;
}