/* ==========================================================================
   FILE: viewports/cartography_q1.js
   ROLE: Quadrant 1 Tactical Journal & Map Grid Renderer
   ========================================================================== */
window._Q1Internal = window._Q1Internal || {};

(() => {
  'use strict';

  function renderCartography(ctx, state, mapData, mapSize) {
    ctx.fillStyle = '#0f121a';
    ctx.fillRect(0, 0, 320, 240);

    const tileSize = 16;
    const offsetX = 20;
    const offsetY = 24;

    const curX = Math.floor(state.player.x);
    const curY = Math.floor(state.player.y);
    state.explored[curY * mapSize + curX] = true;

    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        const idx = y * mapSize + x;
        if (state.explored[idx]) {
          ctx.fillStyle = mapData[idx] === 1 ? '#3a445c' : mapData[idx] === 2 ? '#6b2d2d' : '#1e2433';
          ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize - 1, tileSize - 1);
        }
      }
    }
    const px = offsetX + state.player.x * tileSize;
    const py = offsetY + state.player.y * tileSize;
    ctx.fillStyle = '#e68a3e';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f5b567';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + state.player.dirX * 12, py + state.player.dirY * 12);
    ctx.stroke();
  }

  window._Q1Internal.renderCartography = renderCartography;
})();

if (typeof window !== 'undefined') {
  window.Q1Cartography = window._Q1Internal.renderCartography;
}
delete window._Q1Internal;