/* ==========================================================================
   FILE: combat/combat_ai.js
   ROLE: Boss Phase Logic & Hostile Decision Tree Subsystem
   ========================================================================== */
window._CombatInternal = window._CombatInternal || {};

(() => {
  'use strict';

  function evaluateEnemyAction(enemy, partyState) {
    const hpRatio = enemy.hp / enemy.maxHp;
    
    if (enemy.isBoss && hpRatio <= 0.50 && !enemy.phaseTwoActive) {
      return { action: 'TRIGGER_PHASE_TWO', intent: 'ENRAGE' };
    }

    const target = partyState
      .filter(p => p.alive)
      .reduce((lowest, p) => (p.hp < lowest.hp ? p : lowest), partyState[0]);

    return { action: 'STRIKE', targetId: target?.id || null };
  }

  window._CombatInternal.AI = Object.freeze({
    evaluateEnemyAction,
  });
})();