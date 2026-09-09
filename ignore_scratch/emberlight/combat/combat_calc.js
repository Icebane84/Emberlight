/* ==========================================================================
   FILE: combat/combat_calc.js
   ROLE: Pure Domain Calculus Subsystem
   ========================================================================== */
window._CombatInternal = window._CombatInternal || {};

(() => {
  'use strict';

  function calculateDamage(attacker, defender, skillNode) {
    const atk = attacker.atk || 1;
    const def = defender.def || 0;
    const mult = skillNode?.mult || 1.0;
    const base = Math.max(1, (atk * mult) - (def * 0.5));
    return Math.round(base);
  }

  function evaluateAffinity(attackElement, defenderAffinities) {
    if (!attackElement || !defenderAffinities) return 1.0;
    if (defenderAffinities.weakness?.includes(attackElement)) return 1.5;
    if (defenderAffinities.resistance?.includes(attackElement)) return 0.5;
    return 1.0;
  }

  window._CombatInternal.Calc = Object.freeze({
    calculateDamage,
    evaluateAffinity,
  });
})();