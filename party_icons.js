/* =========================================================================
   SUBSYSTEM: PROCEDURAL PARTY CREST BAKER (CANVAS RASTER ENGINE)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-PARTY-ICON-BAKER
   Protocol Version:    VSRP-001
   Classification:      Peripheral Asset Provider
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightPartyIcons = (() => {
	"use strict";

  const SIZE = 24;
  const cache = new Map();

  const canvas = (typeof document !== 'undefined' && typeof document.createElement === 'function')
    ? document.createElement('canvas')
    : null;

  if (canvas) {
    canvas.width = SIZE;
    canvas.height = SIZE;
  }
  const ctx = (canvas && typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;

  function clear() {
    if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
  }

  // --- CHARACTER CREST PRIMITIVES ---

  function drawHeroCrest() {
    // Aldric: Winged Solar Helm & Crimson Mantle
    ctx.save();
    // Crest Background
    ctx.fillStyle = '#1c1307';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Golden Halo Ring
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

    // Steel Visor / Helm
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(8, 7, 8, 9);

    // Slit Eye Glow (Amber)
    ctx.fillStyle = '#ff9d4d';
    ctx.fillRect(9, 10, 6, 2);

    // Winged Brow Crest
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(6, 6);
    ctx.lineTo(12, 3);
    ctx.lineTo(18, 6);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();

    // Crimson Mantle Clasp
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(6, 17, 12, 4);

    ctx.restore();
  }

  function drawWarriorCrest() {
    // Brogan: Heavy Iron Mask & Crossed War Cleavers
    ctx.save();
    ctx.fillStyle = '#140d0d';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Brutal Iron Rim
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

    // Greatplate Neckguard
    ctx.fillStyle = '#475569';
    ctx.fillRect(6, 15, 12, 6);

    // Heavy T-Visor Helmet
    ctx.fillStyle = '#64748b';
    ctx.fillRect(7, 6, 10, 10);

    // Dark T-Slit
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(9, 9, 6, 2);
    ctx.fillRect(11, 9, 2, 6);

    // Horn / Brow Studs
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(5, 5, 2, 3);
    ctx.fillRect(17, 5, 2, 3);

    ctx.restore();
  }

  function drawMageCrest() {
    // Selene: Arcane Leyline Hood & Astral Eye
    ctx.save();
    ctx.fillStyle = '#0b0c1c';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Arcane Cobalt Border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

    // Deep Mystic Hood
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(12, 3);
    ctx.lineTo(4, 18);
    ctx.lineTo(20, 18);
    ctx.closePath();
    ctx.fill();

    // Shadowed Face Well
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(12, 13, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing Starlight Eyes
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 4;
    ctx.fillRect(10, 12, 1.5, 1.5);
    ctx.fillRect(13, 12, 1.5, 1.5);

    // Forehead Rune
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(11, 7, 2, 2);

    ctx.restore();
  }

  function drawHealerCrest() {
    // Wren: Sacred Silver Circlet & Radiant Ember Tear
    ctx.save();
    ctx.fillStyle = '#0a160e';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Emerald Aura Border
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

    // Soft Cloth Cowl
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(5, 19);
    ctx.lineTo(19, 19);
    ctx.closePath();
    ctx.fill();

    // Circlet Band
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(6, 9, 12, 2);

    // Sacred Restoration Cross
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(11, 13, 2, 6);
    ctx.fillRect(9, 15, 6, 2);

    ctx.restore();
  }

  function bakeCrest(phenotype) {
    if (!ctx) return;
    clear();

    const p = (phenotype || 'HERO').toUpperCase();
    if (p === 'HERO') drawHeroCrest();
    else if (p === 'WARRIOR') drawWarriorCrest();
    else if (p === 'MAGE') drawMageCrest();
    else if (p === 'HEALER') drawHealerCrest();
    else drawHeroCrest();
  }

  return {
    bakeAll() {
      if (!canvas?.toDataURL) return;
      const phenotypes = ['HERO', 'WARRIOR', 'MAGE', 'HEALER'];
      phenotypes.forEach((pt) => {
        bakeCrest(pt);
        try {
          cache.set(pt, canvas.toDataURL('image/png'));
        } catch (_) {}
      });
      clear();
    },

    get(phenotype) {
      if (cache.size === 0) this.bakeAll();
      return cache.get((phenotype || 'HERO').toUpperCase()) || null;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightPartyIcons = EmberlightPartyIcons;
  EmberlightPartyIcons.bakeAll();
}
