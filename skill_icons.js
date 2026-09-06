/* =========================================================================
   SUBSYSTEM: PROCEDURAL SKILL GLYPH BAKER (CANVAS RASTER ENGINE)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-SKILL-ICON-BAKER
   Protocol Version:    VSRP-001
   Classification:      Peripheral Asset Provider
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightSkillIcons = (() => {
  'use strict';

  const SIZE = 36;
  const cache = new Map();

  // Headless offscreen staging canvas
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

  // --- GLYPH PRIMITIVES ---

  function drawStrikeGlyph(tier, resonance) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(18, 18);
    ctx.rotate(-Math.PI / 4);

    // Blade Edge
    ctx.fillStyle = resonance ? '#ff9d4d' : '#e2e8f0';
    ctx.shadowColor = resonance ? '#ff5555' : '#38bdf8';
    ctx.shadowBlur = resonance ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(0, -14);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();

    // Crossguard
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-6, 8, 12, 2.5);

    // Dynamic Slash Arcs (Scaled by Tier)
    ctx.strokeStyle = resonance ? '#fef08a' : '#94a3b8';
    ctx.lineWidth = 1.2;
    for (let t = 0; t < tier; t++) {
      ctx.beginPath();
      ctx.arc(0, -4, 8 + t * 4, Math.PI * 0.9, Math.PI * 1.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBoltGlyph(tier, resonance) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(18, 18);

    const hue = resonance ? 35 : 205; // Amber flame vs Cobalt lightning
    ctx.strokeStyle = `hsl(${hue}, 95%, 65%)`;
    ctx.fillStyle = `hsl(${hue}, 100%, 85%)`;
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;

    // Arcane Starburst Diamond
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(4, -4);
    ctx.lineTo(12, 0);
    ctx.lineTo(4, 4);
    ctx.moveTo(0, 12);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-4, -4);
    ctx.closePath();
    ctx.stroke();

    // Core Nova
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 + tier, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHealGlyph(tier, resonance) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(18, 18);

    // Sacred Restoration Cross
    ctx.fillStyle = resonance ? '#ff9d4d' : '#6fd97e';
    ctx.shadowColor = resonance ? '#ff9d4d' : '#22c55e';
    ctx.shadowBlur = 8;

    const arm = 3.5;
    const len = 9 + tier * 1.5;
    ctx.fillRect(-arm, -len, arm * 2, len * 2);
    ctx.fillRect(-len, -arm, len * 2, arm * 2);

    // Surrounding Radiant Halo
    ctx.strokeStyle = resonance ? '#fef08a' : '#86efac';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawPassiveGlyph(statKey, tier, resonance) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(18, 18);

    ctx.strokeStyle = resonance ? '#ff9d4d' : '#38bdf8';
    ctx.shadowColor = resonance ? '#ff9d4d' : '#0284c7';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;

    if (statKey === 'hp' || statKey === 'def') {
      // Bulwark Crest
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(10, -10);
      ctx.lineTo(11, 2);
      ctx.lineTo(0, 12);
      ctx.lineTo(-11, 2);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = resonance ? '#ff9d4d' : (statKey === 'hp' ? '#d94f4f' : '#4f8fd9');
      ctx.fillRect(-3, -4, 6, 8);
    } else if (statKey === 'mp') {
      // Arcane Leyline Eye
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      if (ctx.quadraticCurveTo) {
        ctx.quadraticCurveTo(0, -9, 11, 0);
        ctx.quadraticCurveTo(0, 9, -11, 0);
      }
      ctx.stroke();

      ctx.fillStyle = '#4f8fd9';
      ctx.beginPath();
      ctx.arc(0, 0, 3 + tier, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Agility / Attack Winged Chevron
      ctx.beginPath();
      ctx.moveTo(-10, 4);
      ctx.lineTo(0, -8);
      ctx.lineTo(10, 4);
      ctx.stroke();

      if (tier >= 2) {
        ctx.beginPath();
        ctx.moveTo(-8, 9);
        ctx.lineTo(0, -2);
        ctx.lineTo(8, 9);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // --- SYNTHESIZER DISPATCH ---

  function renderGlyph(node) {
    if (!ctx) return;
    clear();

    // Dark Backing Frame
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Border Frame
    ctx.strokeStyle = node.resonance ? '#ff9d4d' : '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

    const tier = node.tier || 1;
    const resonance = Boolean(node.resonance);

    if (node.type === 'active') {
      if (node.subType === 'strike') drawStrikeGlyph(tier, resonance);
      else if (node.subType === 'bolt') drawBoltGlyph(tier, resonance);
      else if (node.subType === 'heal') drawHealGlyph(tier, resonance);
      else drawBoltGlyph(tier, resonance);
    } else {
      const stats = Object.keys(node.statDeltas || {});
      const primaryStat = stats[0] || 'hp';
      drawPassiveGlyph(primaryStat, tier, resonance);
    }

    // Tier Indicator Pips in lower-right corner
    ctx.fillStyle = node.resonance ? '#ff9d4d' : '#94a3b8';
    for (let p = 0; p < tier; p++) {
      ctx.fillRect(SIZE - 5 - (p * 4), SIZE - 5, 2.5, 2.5);
    }
  }

  return {
    bakeAll() {
      if (!canvas || !canvas.toDataURL || typeof EmberlightManifest === 'undefined' || !EmberlightManifest.SkillTrees) return;
      const trees = EmberlightManifest.SkillTrees;
      Object.values(trees).forEach((branches) => {
        Object.values(branches).forEach((nodes) => {
          nodes.forEach((node) => {
            renderGlyph(node);
            try {
              cache.set(node.id, canvas.toDataURL('image/png'));
            } catch (_) {}
          });
        });
      });
      clear();
    },

    get(nodeId) {
      if (cache.size === 0) this.bakeAll();
      return cache.get(nodeId) || null;
    },
  };
})();

// Self-initialize on DOM ready
if (typeof window !== 'undefined') {
  window.EmberlightSkillIcons = EmberlightSkillIcons;
  EmberlightSkillIcons.bakeAll();
}