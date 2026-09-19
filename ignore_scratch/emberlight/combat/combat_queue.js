/* ==========================================================================
   FILE: combat/combat_queue.js
   ROLE: CTB Turn Calculation & Action Delay Subsystem
   ========================================================================== */
window._CombatInternal = window._CombatInternal || {};

(() => {
  'use strict';

  function sortQueueBySpeed(units) {
    return [...units].sort((a, b) => (b.agi || 10) - (a.agi || 10));
  }

  function calculateActionDelay(baseCost, agi) {
    const speedFactor = Math.max(1, agi || 10);
    return Math.max(5, Math.round(baseCost * (100 / speedFactor)));
  }

  window._CombatInternal.Queue = Object.freeze({
    sortQueueBySpeed,
    calculateActionDelay,
  });
})();