/* ==========================================================================
   FILE: viewports/combat_q3.js
   ROLE: Quadrant 3 Threat Oracle & Clash Arena Renderer
   ========================================================================== */
window._Q3Internal = window._Q3Internal || {};

(() => {
  'use strict';

  function renderCombatOracle(ctx, state) {
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 320, 240);
    ctx.strokeStyle = '#1b2333';
    ctx.strokeRect(20, 30, 280, 70);
    ctx.strokeRect(20, 130, 280, 70);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#56637d';
    ctx.fillText("FRONT ROW", 60, 25);
    ctx.fillText("BACK ROW (PROTECTED)", 175, 25);

    if (!state.combat.active) {
      ctx.fillStyle = '#414d66';
      ctx.font = '12px monospace';
      ctx.fillText("THREAT ORACLE: NO HOSTILES", 46, 85);
      return;
    }
    ctx.fillStyle = '#5bc27d';
    ctx.fillRect(70, 145, 36, 40);
    ctx.fillStyle = '#fff';
    ctx.fillText("KAELEN", 68, 140);
    const ex = state.combat.enemy.row === 0 ? 70 : 210;
    ctx.fillStyle = state.combat.enemy.row === 0 ? '#e05252' : '#8c3838';
    ctx.fillRect(ex, 45, 36, 40);
    ctx.fillStyle = '#fff';
    ctx.fillText(state.combat.enemy.name, ex - 10, 40);
  }

  window._Q3Internal.renderCombatOracle = renderCombatOracle;
})();

if (typeof window !== 'undefined') {
  window.Q3Combat = window._Q3Internal.renderCombatOracle;
}
delete window._Q3Internal;