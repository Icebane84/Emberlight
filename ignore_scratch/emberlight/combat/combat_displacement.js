/* ==========================================================================
   FILE: combat/combat_displacement.js
   ROLE: Row Shifting & Formation Collision Subsystem
   ========================================================================== */
window._CombatInternal = window._CombatInternal || {};

(() => {
  'use strict';

  function applyDisplacement(unit, type) {
    if (unit.isBoss) {
      return { success: false, row: unit.row };
    }

    if (type === 'KNOCKBACK' && unit.row === 'FRONT') {
      unit.row = 'BACK';
      return { success: true, row: 'BACK' };
    }

    if (type === 'PULL' && unit.row === 'BACK') {
      unit.row = 'FRONT';
      return { success: true, row: 'FRONT' };
    }

    return { success: false, row: unit.row };
  }

  window._CombatInternal.Displacement = Object.freeze({
    applyDisplacement,
  });
})();