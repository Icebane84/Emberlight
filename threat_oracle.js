/* =========================================================================
   SUBSYSTEM: THREAT ORACLE (CTB TIMELINE & TELEGRAPH ENGINE)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-THREAT-ORACLE
   Protocol Version:    VSRP-001
   Classification:      Tactical Combat Analytics & Telegraph Provider
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightThreatOracle = (() => {
	"use strict";

  let eventBus = null;

  function init(bus) {
    eventBus = bus;
  }

  /**
   * Pure domain calculation for 12-turn forward CTB timeline.
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
      if (!enemy.isDead && enemy.hp > 0 && enemy.alive !== false) {
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
      simulatedClocks.sort((a, b) => a.currentDelay - b.currentDelay);
      const nextUnit = simulatedClocks[0];

      timeline.push({
        turnIndex: t + 1,
        id: nextUnit.id,
        name: nextUnit.name,
        type: nextUnit.type,
        phenotype: nextUnit.phenotype,
        key: nextUnit.key,
      });

      const stepTime = nextUnit.currentDelay;
      simulatedClocks.forEach((c) => {
        c.currentDelay = Math.max(0, c.currentDelay - stepTime);
      });
      nextUnit.currentDelay = nextUnit.delay;
    }

    return timeline;
  }

  /**
   * Renders the Threat Oracle ribbon and telegraphs into the DOM container.
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
      const crest = isHero && typeof EmberlightPartyIcons !== 'undefined'
        ? EmberlightPartyIcons.get(turn.phenotype)
        : (typeof EmberlightIcons !== 'undefined' && turn.key ? EmberlightIcons.get(turn.key) : null);
      const delayLabel = turn.delayCost ? ` (+${turn.delayCost} Delay)` : '';

      return `
        <div class="turn-slot ${isTurnNow ? 'active-slot' : ''} ${isProjected ? 'projected-slot' : ''} ${isHero ? 'hero-slot' : 'enemy-slot'}" title="Turn ${turn.turnIndex || (idx + 1)}: ${turn.name}${delayLabel}">
          <div class="slot-idx">${turn.turnIndex || (idx + 1)}</div>
          ${crest ? `<img src="${crest}" class="slot-crest" alt="${turn.name}" />` : `<span class="slot-char">${isHero ? '▲' : '☠'}</span>`}
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
                if (e.isDead || e.hp <= 0) return '';
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

  return {
    init,
    calculateTimeline,
    render,
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightThreatOracle = EmberlightThreatOracle;
}
