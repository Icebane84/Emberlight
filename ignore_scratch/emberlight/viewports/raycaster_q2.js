/* ==========================================================================
   FILE: viewports/raycaster_q2.js
   ROLE: Quadrant 2 First-Person DDA Corridor Sensor Renderer
   ========================================================================== */
window._Q2Internal = window._Q2Internal || {};

(() => {
  'use strict';

  function renderRaycaster(canvas, ctx, state, mapData, mapSize) {
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#0f131c';
    ctx.fillRect(0, h / 2, w, h / 2);

    for (let x = 0; x < w; x++) {
      const cameraX = (2 * x) / w - 1;
      const rayDirX = state.player.dirX + state.player.planeX * cameraX;
      const rayDirY = state.player.dirY + state.player.planeY * cameraX;
      let mapX = Math.floor(state.player.x);
      let mapY = Math.floor(state.player.y);
      let deltaDistX = Math.abs(1 / rayDirX);
      let deltaDistY = Math.abs(1 / rayDirY);
      let stepX = rayDirX < 0 ? -1 : 1;
      let stepY = rayDirY < 0 ? -1 : 1;
      let sideDistX = rayDirX < 0 ? (state.player.x - mapX) * deltaDistX : (mapX + 1.0 - state.player.x) * deltaDistX;
      let sideDistY = rayDirY < 0 ? (state.player.y - mapY) * deltaDistY : (mapY + 1.0 - state.player.y) * deltaDistY;
      let hit = 0;
      let side = 0;
      let hitType = 0;

      while (hit === 0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (mapData[mapY * mapSize + mapX] > 0) {
          hit = 1;
          hitType = mapData[mapY * mapSize + mapX];
          state.explored[mapY * mapSize + mapX] = true;
        }
      }
      let perpWallDist = side === 0 ? (mapX - state.player.x + (1 - stepX) / 2) / rayDirX : (mapY - state.player.y + (1 - stepY) / 2) / rayDirY;
      let lineHeight = Math.floor(h / perpWallDist);
      let drawStart = Math.max(0, -lineHeight / 2 + h / 2);
      let drawEnd = Math.min(h - 1, lineHeight / 2 + h / 2);

      let baseColor = hitType === 2 ? [160, 40, 40] : [70, 85, 115];
      if (side === 1) baseColor = baseColor.map(c => Math.floor(c * 0.7));
      let fog = Math.max(0, 1 - perpWallDist / 7.5);
      ctx.strokeStyle = `rgb(${Math.floor(baseColor[0]*fog)},${Math.floor(baseColor[1]*fog)},${Math.floor(baseColor[2]*fog)})`;
      ctx.beginPath();
      ctx.moveTo(x, drawStart);
      ctx.lineTo(x, drawEnd);
      ctx.stroke();
    }
  }

  window._Q2Internal.renderRaycaster = renderRaycaster;
})();

if (typeof window !== 'undefined') {
  window.Q2Raycaster = window._Q2Internal.renderRaycaster;
}
delete window._Q2Internal;