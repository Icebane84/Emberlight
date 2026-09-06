/**
 * =========================================================================
 * PERIPHERAL DRIVER: PROCEDURAL OVERWORLD SPRITE BAKER & PAPER-DOLL V4
 * -------------------------------------------------------------------------
 * Document Identifier: VSRP-001-SPRITE-BAKER-V4-ARTISTIC-UPGRADE
 * Protocol Version:    VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-SPEC-012
 * Classification:      Tier-3 Peripheral Asset Provider & HD Sprite Synthesizer
 * Index Anchor:        PRS-001
 * =========================================================================
 */

const EmberlightSpriteBaker = (() => {
  'use strict';

  // --- Dimensions & 4x Supersampling Configuration ---
  const TARGET_SIZE = 32;
  const SCALE_FACTOR = 4;
  const WORK_SIZE = TARGET_SIZE * SCALE_FACTOR; // 128x128 internal high-definition canvas

  const cache = new Map();

  // Lifecycle & Configuration State
  let configured = false;
  let config = Object.freeze({});
  let initialized = false;
  let eventBusRef = null;

  let workCanvas = null;
  let workCtx = null;
  let targetCanvas = null;
  let targetCtx = null;

  function ensureCanvases() {
    if (workCanvas && workCtx && targetCanvas && targetCtx) return;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    workCanvas = document.createElement('canvas');
    workCanvas.width = WORK_SIZE;
    workCanvas.height = WORK_SIZE;
    workCtx = workCanvas.getContext('2d');
    if (workCtx) {
      workCtx.imageSmoothingEnabled = true;
      workCtx.imageSmoothingQuality = 'high';
      workCtx.lineJoin = 'round';
      workCtx.lineCap = 'round';
    }

    targetCanvas = document.createElement('canvas');
    targetCanvas.width = TARGET_SIZE;
    targetCanvas.height = TARGET_SIZE;
    targetCtx = targetCanvas.getContext('2d');
    if (targetCtx) {
      targetCtx.imageSmoothingEnabled = true;
      targetCtx.imageSmoothingQuality = 'high';
    }
  }

  function clearWorkCanvas() {
    if (workCtx) workCtx.clearRect(0, 0, WORK_SIZE, WORK_SIZE);
    if (targetCtx) targetCtx.clearRect(0, 0, TARGET_SIZE, TARGET_SIZE);
  }

  // =========================================================================
  // 4-TIER HSL/PBR PALETTE MATRIX
  // =========================================================================
  const P = Object.freeze({
    // Neutral & Dark Foundations
    void: '#06070a',
    shadowAO: 'rgba(0, 0, 0, 0.52)',
    ironDark: '#111827',
    ironMid: '#1f2937',
    ironLight: '#374151',

    // Metallic Steel (4 Tiers)
    steelDark: '#334155',
    steelMid: '#64748b',
    steelLight: '#cbd5e1',
    steelSpec: '#ffffff',

    // Organic Skin Tones (4 Tiers)
    skinDeep: '#92400e',
    skinShadow: '#d97706',
    skinMid: '#fbd38d',
    skinLight: '#fef3c7',

    // Royal Gold & Brass (4 Tiers)
    goldDark: '#78350f',
    goldMid: '#ca8a04',
    goldLight: '#facc15',
    goldSpec: '#fef08a',

    // Organic Leather & Wood
    leatherDark: '#291003',
    leatherMid: '#78350f',
    leatherLight: '#b45309',
    woodDark: '#271005',
    woodMid: '#451a03',
    woodLight: '#78350f',

    // Vestment & Fabric Tones
    clothRedDark: '#450a0a',
    clothRed: '#b91c1c',
    clothRedLight: '#f87171',

    clothBlueDark: '#172554',
    clothBlue: '#1d4ed8',
    clothBlueLight: '#60a5fa',

    clothVioletDark: '#2e1065',
    clothViolet: '#6d28d9',
    clothVioletLight: '#c084fc',

    clothGreenDark: '#064e3b',
    clothGreen: '#059669',
    clothGreenLight: '#34d399',

    clothWhiteDark: '#94a3b8',
    clothWhite: '#e2e8f0',
    clothWhiteLight: '#ffffff',

    // Emissive & Arcane Cores
    emberCore: '#ff5500',
    emberGlow: '#facc15',
    arcaneCyan: '#38bdf8',
    arcaneViolet: '#e879f9',
    venomGreen: '#22c55e',
    soulRed: '#ef4444',
  });

  // Scaling helper: converts 32-space coordinates to 128-space work canvas
  const S = (val) => val * SCALE_FACTOR;

  function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke = null, strokeW = 1) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(S(x), S(y), S(w), S(h), S(r)) : ctx.rect(S(x), S(y), S(w), S(h));
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = S(strokeW);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShadedPoly(ctx, points, fill, stroke = null, strokeW = 1) {
    if (!ctx || points.length < 3) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(S(points[0].x), S(points[0].y));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(S(points[i].x), S(points[i].y));
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = S(strokeW);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEllipse(ctx, cx, cy, rx, ry, fill) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(S(cx), S(cy), S(rx), S(ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // LAYER 1: BASE PHENOTYPE SILHOUETTE & ANATOMY (4× SUPERSAMPLED)
  // =========================================================================
  function drawBaseAnatomy(phenotype, facing, frame) {
    if (!workCtx) return;
    const isStep = (frame % 2 === 1);
    const bobY = isStep ? -0.75 : 0;
    const p = (phenotype || 'HERO').toUpperCase();

    // 1. Ambient Ground Contact Shadow
    drawEllipse(workCtx, 16, 28.5, 9.5, 3.8, P.shadowAO);

    // 2. Articulated Legs & Boots (Walk Gait)
    const legColor = P.ironDark;
    const bootColor = P.steelDark;
    const bootRim = P.steelMid;

    if (facing === 'UP' || facing === 'DOWN') {
      const leftY = isStep ? 22 : 19.5;
      const rightY = isStep ? 19.5 : 22;

      // Left Leg & Sabaton
      drawRoundedRect(workCtx, 9.5, leftY, 4.5, 7.5, 1.2, legColor, bootColor, 0.4);
      drawRoundedRect(workCtx, 9.0, leftY + 5.5, 5.5, 2.8, 1.0, bootColor, bootRim, 0.4);

      // Right Leg & Sabaton
      drawRoundedRect(workCtx, 18.0, rightY, 4.5, 7.5, 1.2, legColor, bootColor, 0.4);
      drawRoundedRect(workCtx, 17.5, rightY + 5.5, 5.5, 2.8, 1.0, bootColor, bootRim, 0.4);
    } else if (facing === 'LEFT') {
      const legOffset = isStep ? 2 : 0;
      drawRoundedRect(workCtx, 11.5 + legOffset, 20.5, 5.5, 8.0, 1.2, legColor, bootColor, 0.4);
      drawRoundedRect(workCtx, 10.0 + legOffset, 25.5, 7.0, 3.2, 1.0, bootColor, bootRim, 0.4);
      if (isStep) {
        drawRoundedRect(workCtx, 16.5, 19.5, 4.5, 7.5, 1.0, P.ironDark);
      }
    } else if (facing === 'RIGHT') {
      const legOffset = isStep ? -2 : 0;
      drawRoundedRect(workCtx, 15.0 + legOffset, 20.5, 5.5, 8.0, 1.2, legColor, bootColor, 0.4);
      drawRoundedRect(workCtx, 15.0 + legOffset, 25.5, 7.0, 3.2, 1.0, bootColor, bootRim, 0.4);
      if (isStep) {
        drawRoundedRect(workCtx, 11.0, 19.5, 4.5, 7.5, 1.0, P.ironDark);
      }
    }

    // 3. Torso Core Undersuit / Tunics
    let torsoPrimary = P.clothBlue;
    let torsoShadow = P.clothBlueDark;
    let torsoTrim = P.goldMid;

    if (p === 'WARRIOR') {
      torsoPrimary = P.steelMid;
      torsoShadow = P.steelDark;
      torsoTrim = P.leatherMid;
    } else if (p === 'MAGE') {
      torsoPrimary = P.clothViolet;
      torsoShadow = P.clothVioletDark;
      torsoTrim = P.goldMid;
    } else if (p === 'HEALER') {
      torsoPrimary = P.clothWhite;
      torsoShadow = P.clothWhiteDark;
      torsoTrim = P.clothGreen;
    }

    // Torso Base with Anatomical Taper
    drawRoundedRect(workCtx, 10.5, 12.5 + bobY, 11.0, 8.5, 2.0, torsoPrimary, torsoShadow, 0.5);
    drawRoundedRect(workCtx, 10.0, 18.5 + bobY, 12.0, 2.2, 0.8, P.leatherMid, P.goldMid, 0.3); // Belt

    // 4. Articulated Head, Neck & Cranium
    drawRoundedRect(workCtx, 13.5, 11.0 + bobY, 5.0, 3.5, 1.0, P.skinShadow); // Neck
    drawRoundedRect(workCtx, 11.5, 5.0 + bobY, 9.0, 7.5, 3.0, P.skinMid, P.skinShadow, 0.4); // Head

    // 5. Directional Visage / Eyes / Hair
    if (facing === 'DOWN') {
      // Eyes with cyan aether reflection
      drawRoundedRect(workCtx, 13.0, 7.5 + bobY, 2.2, 1.8, 0.5, P.void);
      drawRoundedRect(workCtx, 16.8, 7.5 + bobY, 2.2, 1.8, 0.5, P.void);
      drawRoundedRect(workCtx, 13.2, 7.7 + bobY, 1.4, 1.2, 0.3, P.arcaneCyan);
      drawRoundedRect(workCtx, 17.0, 7.7 + bobY, 1.4, 1.2, 0.3, P.arcaneCyan);
      // Hair Forelock
      drawRoundedRect(workCtx, 11.5, 4.5 + bobY, 9.0, 2.5, 1.0, P.leatherDark);
    } else if (facing === 'LEFT') {
      drawRoundedRect(workCtx, 12.0, 7.5 + bobY, 2.2, 1.8, 0.5, P.void);
      drawRoundedRect(workCtx, 12.2, 7.7 + bobY, 1.4, 1.2, 0.3, P.arcaneCyan);
      drawRoundedRect(workCtx, 11.0, 4.5 + bobY, 8.0, 3.0, 1.0, P.leatherDark);
    } else if (facing === 'RIGHT') {
      drawRoundedRect(workCtx, 17.8, 7.5 + bobY, 2.2, 1.8, 0.5, P.void);
      drawRoundedRect(workCtx, 18.0, 7.7 + bobY, 1.4, 1.2, 0.3, P.arcaneCyan);
      drawRoundedRect(workCtx, 13.0, 4.5 + bobY, 8.0, 3.0, 1.0, P.leatherDark);
    } else if (facing === 'UP') {
      // Back of head / hair drape
      drawRoundedRect(workCtx, 11.0, 4.2 + bobY, 10.0, 6.5, 2.5, P.leatherDark, P.void, 0.4);
    }
  }

  // =========================================================================
  // LAYER 2: ARMOR & ROBE OVERLAYS (4× SUPERSAMPLED)
  // =========================================================================
  function drawArmorOverlay(armorId, facing, frame) {
    if (!workCtx || !armorId) return;
    const isStep = (frame % 2 === 1);
    const bobY = isStep ? -0.75 : 0;
    const arm = String(armorId).toUpperCase();

    if (arm.includes('LEATHER') || arm.includes('VEST')) {
      // Studded Leather Armor
      drawRoundedRect(workCtx, 10.0, 12.0 + bobY, 12.0, 8.0, 1.8, P.leatherMid, P.leatherDark, 0.5);
      drawRoundedRect(workCtx, 11.5, 13.5 + bobY, 2.0, 2.0, 0.5, P.goldLight);
      drawRoundedRect(workCtx, 18.5, 13.5 + bobY, 2.0, 2.0, 0.5, P.goldLight);
    } else if (arm.includes('CHAIN') || arm.includes('PLATE') || arm.includes('IRON')) {
      // High-Definition Knightly Cuirass & Pauldrons
      drawRoundedRect(workCtx, 9.5, 11.5 + bobY, 13.0, 8.5, 2.0, P.steelMid, P.steelDark, 0.6);
      drawRoundedRect(workCtx, 11.0, 12.2 + bobY, 10.0, 5.0, 1.2, P.steelLight, P.steelSpec, 0.4);
      // Pauldrons
      drawRoundedRect(workCtx, 8.0, 11.0 + bobY, 3.5, 4.5, 1.0, P.steelLight, P.goldMid, 0.4);
      drawRoundedRect(workCtx, 20.5, 11.0 + bobY, 3.5, 4.5, 1.0, P.steelLight, P.goldMid, 0.4);
    } else if (arm.includes('ROBE') || arm.includes('SILK') || arm.includes('VESTMENT')) {
      // Flowing Arcane / Cleric Robes & Stole
      const robeColor = arm.includes('CLERIC') ? P.clothWhite : P.clothViolet;
      const stoleColor = arm.includes('CLERIC') ? P.clothGreen : P.goldMid;
      drawRoundedRect(workCtx, 9.0, 12.0 + bobY, 14.0, 11.0, 2.5, robeColor, P.void, 0.5);
      drawRoundedRect(workCtx, 13.5, 12.5 + bobY, 5.0, 10.0, 1.0, stoleColor, P.goldSpec, 0.3);
    }
  }

  // =========================================================================
  // LAYER 3: HELMET & HEADGEAR OVERLAYS (4× SUPERSAMPLED)
  // =========================================================================
  function drawHeadgearOverlay(phenotype, facing, frame) {
    if (!workCtx) return;
    const isStep = (frame % 2 === 1);
    const bobY = isStep ? -0.75 : 0;
    const p = (phenotype || 'HERO').toUpperCase();

    if (p === 'HERO') {
      // Knight's Nasal Helm & Brass Circlet
      drawRoundedRect(workCtx, 11.0, 3.8 + bobY, 10.0, 4.0, 1.5, P.steelLight, P.goldMid, 0.4);
      if (facing === 'DOWN') {
        drawRoundedRect(workCtx, 15.0, 5.5 + bobY, 2.0, 4.0, 0.5, P.steelMid);
      }
    } else if (p === 'WARRIOR') {
      // Horned Iron Barbute
      drawRoundedRect(workCtx, 10.5, 3.5 + bobY, 11.0, 5.5, 2.0, P.ironDark, P.steelMid, 0.6);
      // Horns
      drawShadedPoly(workCtx, [
        { x: 10.5, y: 5.0 + bobY }, { x: 7.5, y: 1.5 + bobY }, { x: 11.0, y: 3.5 + bobY }
      ], P.goldMid, P.goldDark, 0.3);
      drawShadedPoly(workCtx, [
        { x: 21.5, y: 5.0 + bobY }, { x: 24.5, y: 1.5 + bobY }, { x: 21.0, y: 3.5 + bobY }
      ], P.goldMid, P.goldDark, 0.3);
    } else if (p === 'MAGE') {
      // Shadowed Mystic Hood
      drawRoundedRect(workCtx, 10.0, 3.2 + bobY, 12.0, 8.5, 3.5, P.clothViolet, P.clothVioletDark, 0.6);
      if (facing === 'DOWN') {
        drawRoundedRect(workCtx, 12.0, 6.0 + bobY, 8.0, 4.5, 2.0, P.void);
        drawRoundedRect(workCtx, 13.5, 7.5 + bobY, 1.8, 1.2, 0.4, P.arcaneViolet);
        drawRoundedRect(workCtx, 16.7, 7.5 + bobY, 1.8, 1.2, 0.4, P.arcaneViolet);
      }
    } else if (p === 'HEALER') {
      // Consecrated Golden Halo
      drawEllipse(workCtx, 16.0, 3.5 + bobY, 7.0, 2.2, P.goldMid);
      drawEllipse(workCtx, 16.0, 3.5 + bobY, 5.0, 1.4, P.goldSpec);
    }
  }

  // =========================================================================
  // LAYER 4: WEAPON & OFF-HAND OVERLAYS (4× SUPERSAMPLED)
  // =========================================================================
  function drawWeaponOverlay(weaponId, facing, frame) {
    if (!workCtx || !weaponId) return;
    const isStep = (frame % 2 === 1);
    const bobY = isStep ? -0.75 : 0;
    const w = String(weaponId).toUpperCase();

    if (w.includes('SWORD') || w.includes('BLADE')) {
      if (facing === 'RIGHT') {
        // Gleaming Longsword Pointing Forward
        drawRoundedRect(workCtx, 20.0, 14.0 + bobY, 10.0, 2.2, 0.6, P.steelLight, P.steelSpec, 0.3);
        drawRoundedRect(workCtx, 19.0, 12.5 + bobY, 2.0, 5.0, 0.5, P.goldMid);
      } else if (facing === 'LEFT') {
        drawRoundedRect(workCtx, 2.0, 14.0 + bobY, 10.0, 2.2, 0.6, P.steelLight, P.steelSpec, 0.3);
        drawRoundedRect(workCtx, 11.0, 12.5 + bobY, 2.0, 5.0, 0.5, P.goldMid);
      } else {
        // Sheathed / Side Held Blade
        drawRoundedRect(workCtx, 21.0, 11.0 + bobY, 2.2, 12.0, 0.6, P.steelLight, P.steelSpec, 0.3);
        drawRoundedRect(workCtx, 19.5, 12.0 + bobY, 5.0, 2.0, 0.5, P.goldMid);
      }
    } else if (w.includes('AXE')) {
      // Battleaxe with Crescent Blade
      drawRoundedRect(workCtx, 20.5, 9.0 + bobY, 2.4, 15.0, 0.5, P.woodMid);
      drawShadedPoly(workCtx, [
        { x: 21.5, y: 9.0 + bobY }, { x: 26.5, y: 7.0 + bobY }, { x: 27.5, y: 12.5 + bobY }, { x: 21.5, y: 11.5 + bobY }
      ], P.steelLight, P.steelSpec, 0.4);
    } else if (w.includes('STAFF')) {
      // Archmage Staff with Astral Orb
      drawRoundedRect(workCtx, 21.0, 8.0 + bobY, 2.2, 16.0, 0.5, P.woodDark, P.goldMid, 0.3);
      drawEllipse(workCtx, 22.0, 7.0 + bobY, 3.2, 3.2, P.arcaneViolet);
      drawEllipse(workCtx, 22.0, 7.0 + bobY, 1.5, 1.5, P.steelSpec);
    } else if (w.includes('MACE')) {
      // Flanged Holy Sun Mace
      drawRoundedRect(workCtx, 21.0, 11.0 + bobY, 2.2, 13.0, 0.5, P.woodMid, P.goldMid, 0.3);
      drawEllipse(workCtx, 22.0, 10.0 + bobY, 3.5, 3.5, P.goldMid);
      drawEllipse(workCtx, 22.0, 10.0 + bobY, 2.0, 2.0, P.goldSpec);
    }
  }

  // =========================================================================
  // HOSTILE ENTITY SYNTHESIZER (ENEMY)
  // =========================================================================
  function drawAnimatedEnemy(enemyKey, frame) {
    if (!workCtx) return;
    const isStep = (frame % 2 === 1);
    const bobY = isStep ? -0.75 : 0;
    const k = String(enemyKey || 'SHADE_WOLF').toUpperCase();

    // Ground Shadow
    drawEllipse(workCtx, 16, 28, 10, 4, P.shadowAO);

    if (k.includes('WOLF') || k.includes('SHADE')) {
      // Spectral Shade Wolf
      drawRoundedRect(workCtx, 8.0, 14.0 + bobY, 16.0, 10.0, 3.5, P.clothVioletDark, P.void, 0.6);
      drawRoundedRect(workCtx, 18.0, 10.0 + bobY, 10.0, 8.0, 2.5, P.clothVioletDark, P.arcaneViolet, 0.4);
      // Snout & Glowing Eyes
      drawRoundedRect(workCtx, 23.0, 14.0 + bobY, 6.0, 4.0, 1.5, P.ironDark);
      drawRoundedRect(workCtx, 21.0, 11.5 + bobY, 2.5, 1.8, 0.5, P.arcaneViolet);
      drawRoundedRect(workCtx, 21.5, 11.8 + bobY, 1.2, 1.0, 0.3, P.steelSpec);
    } else if (k.includes('SPIDER')) {
      // Toxic Cave Spider with 8 Articulated Legs
      drawEllipse(workCtx, 16.0, 16.0 + bobY, 7.5, 6.0, P.ironDark);
      drawEllipse(workCtx, 16.0, 21.0 + bobY, 6.0, 4.5, P.steelDark);
      // Glowing Venom Eyes
      drawRoundedRect(workCtx, 14.0, 19.5 + bobY, 1.5, 1.5, 0.3, P.soulRed);
      drawRoundedRect(workCtx, 16.5, 19.5 + bobY, 1.5, 1.5, 0.3, P.soulRed);
      // Chevron Marks
      drawRoundedRect(workCtx, 14.5, 14.0 + bobY, 3.0, 2.0, 0.5, P.venomGreen);
    } else if (k.includes('SKELETON') || k.includes('BONE')) {
      // Skeletal Anatomy
      drawRoundedRect(workCtx, 11.5, 12.0 + bobY, 9.0, 8.0, 1.5, P.steelLight, P.steelMid, 0.4);
      drawRoundedRect(workCtx, 11.0, 5.0 + bobY, 10.0, 7.0, 2.5, P.steelLight, P.steelMid, 0.4); // Skull
      drawRoundedRect(workCtx, 13.0, 7.5 + bobY, 2.2, 2.0, 0.4, P.soulRed);
      drawRoundedRect(workCtx, 17.0, 7.5 + bobY, 2.2, 2.0, 0.4, P.soulRed);
    } else if (k.includes('ACOLYTE')) {
      // Dread Cultist Shroud & Necrotic Hand Fire
      drawRoundedRect(workCtx, 9.0, 10.0 + bobY, 14.0, 14.0, 3.0, P.ironDark, P.venomGreen, 0.5);
      drawRoundedRect(workCtx, 11.5, 5.0 + bobY, 9.0, 7.0, 2.0, P.steelLight); // Bone mask
      drawRoundedRect(workCtx, 13.5, 7.0 + bobY, 1.8, 1.8, 0.4, P.venomGreen);
      drawRoundedRect(workCtx, 16.8, 7.0 + bobY, 1.8, 1.8, 0.4, P.venomGreen);
    } else if (k.includes('MALAKOR') || k.includes('BOSS')) {
      // Colossal Demon Wings & Burning Core
      drawShadedPoly(workCtx, [
        { x: 16.0, y: 12.0 + bobY }, { x: 2.0, y: 4.0 + bobY }, { x: 6.0, y: 18.0 + bobY }
      ], P.clothRedDark, P.void, 0.5);
      drawShadedPoly(workCtx, [
        { x: 16.0, y: 12.0 + bobY }, { x: 30.0, y: 4.0 + bobY }, { x: 26.0, y: 18.0 + bobY }
      ], P.clothRedDark, P.void, 0.5);
      drawRoundedRect(workCtx, 10.0, 9.0 + bobY, 12.0, 12.0, 2.5, P.ironDark, P.clothRed, 0.6);
      drawEllipse(workCtx, 16.0, 14.0 + bobY, 3.5, 3.5, P.emberCore);
    } else {
      // Generic Hostile Beast
      drawRoundedRect(workCtx, 10.0, 11.0 + bobY, 12.0, 11.0, 2.5, P.clothRedDark, P.soulRed, 0.5);
    }
  }

  // =========================================================================
  // TOWN NPC SYNTHESIZER (NPC)
  // =========================================================================
  function drawAnimatedNPC(npcKey, frame) {
    if (!workCtx) return;
    const isStep = (frame % 2 === 1);
    const bobY = isStep ? -0.75 : 0;
    const k = String(npcKey || 'ELDER').toUpperCase();

    // Ground Shadow
    drawEllipse(workCtx, 16, 28, 9, 3.5, P.shadowAO);

    if (k.includes('ELDER') || k === 'E') {
      // Village Elder: Flowing Robe, Long White Beard & Gnarled Staff
      drawRoundedRect(workCtx, 9.5, 11.0 + bobY, 13.0, 13.0, 2.5, P.ironDark, P.goldMid, 0.4);
      drawRoundedRect(workCtx, 12.0, 5.0 + bobY, 8.0, 6.5, 2.5, P.skinMid);
      drawRoundedRect(workCtx, 11.0, 9.5 + bobY, 10.0, 7.0, 2.0, P.clothWhite); // Long beard
      drawRoundedRect(workCtx, 22.0, 7.0 + bobY, 2.0, 18.0, 0.5, P.woodMid, P.goldMid, 0.3); // Staff
    } else if (k.includes('GUARD') || k === 'G') {
      // Town Guard: Polished Plate, Red Crested Sallet & Kite Shield
      drawRoundedRect(workCtx, 9.5, 11.0 + bobY, 13.0, 11.0, 2.0, P.steelLight, P.steelMid, 0.5);
      drawRoundedRect(workCtx, 11.0, 4.5 + bobY, 10.0, 7.0, 2.0, P.steelLight, P.steelDark, 0.5);
      drawRoundedRect(workCtx, 12.5, 2.5 + bobY, 7.0, 3.0, 1.0, P.clothRed); // Plume
      drawRoundedRect(workCtx, 6.0, 13.0 + bobY, 4.5, 9.0, 1.5, P.steelLight, P.goldMid, 0.4); // Shield
    } else if (k.includes('MERCHANT') || k === 'M') {
      // Merchant: Velvet Coat & Golden Coin Purse
      drawRoundedRect(workCtx, 9.0, 11.0 + bobY, 14.0, 12.0, 2.5, P.clothViolet, P.goldMid, 0.5);
      drawRoundedRect(workCtx, 11.5, 5.0 + bobY, 9.0, 6.5, 2.0, P.skinMid);
      drawRoundedRect(workCtx, 10.0, 3.5 + bobY, 12.0, 2.5, 1.0, P.goldMid); // Feathered brim
      drawEllipse(workCtx, 21.0, 17.0 + bobY, 3.0, 3.0, P.goldLight); // Coin pouch
    } else {
      // Standard Villager / Afflicted Scout
      drawRoundedRect(workCtx, 10.0, 11.0 + bobY, 12.0, 12.0, 2.0, P.steelDark, P.leatherMid, 0.4);
      drawRoundedRect(workCtx, 11.5, 5.0 + bobY, 9.0, 6.5, 2.0, P.skinMid);
      drawRoundedRect(workCtx, 12.5, 9.5 + bobY, 7.0, 3.0, 1.0, P.clothGreen);
    }
  }

  // =========================================================================
  // CANONICAL VSRP-001 9-METHOD LIFECYCLE IMPLEMENTATION
  // =========================================================================

  return {
    configure(options = {}) {
      config = Object.freeze({ ...config, ...options });
      configured = true;
      return Object.freeze({ accepted: true, driverId: 'sprite_baker' });
    },

    init(context) {
      if (!configured) {
        configured = true;
      }
      if (initialized) return;

      if (context) {
        if (context.eventBus) {
          eventBusRef = context.eventBus;
        } else if (typeof context.publish === 'function') {
          eventBusRef = context;
        }
      }
      ensureCanvases();
      initialized = true;
    },

    reset(snapshot = null) {
      if (snapshot && snapshot.clearCache) {
        cache.clear();
      }
    },

    update(_dt) {
      // Stateless asset baker during ticks
    },

    render(_snapshot, _dispatch) {
      // Peripheral asset provider does not render directly to root viewport
    },

    getState() {
      return {
        cachedSpritesCount: cache.size,
        renderScale: SCALE_FACTOR,
        targetResolution: `${TARGET_SIZE}x${TARGET_SIZE}`,
        workResolution: `${WORK_SIZE}x${WORK_SIZE}`,
      };
    },

    getDiagnostics() {
      return {
        driverId: 'sprite_baker_driver',
        version: '4.0.0-ARTISTIC-UPGRADE',
        protocolVersion: 'VSRP-001',
        configured,
        initialized,
        cachedSpriteCount: cache.size,
        supersamplingFactor: SCALE_FACTOR,
        bufferResolution: `${TARGET_SIZE}x${TARGET_SIZE}`,
      };
    },

    getModuleInfo() {
      return {
        moduleId: 'EmberlightSpriteBaker',
        version: '4.0.0',
        protocolVersion: 'VSRP-001',
        capabilities: ['procedural_baking', 'paper_doll_compositor', '4x_supersampling', '4_tier_pbr'],
      };
    },

    destroy() {
      cache.clear();
      workCanvas = null;
      workCtx = null;
      targetCanvas = null;
      targetCtx = null;
      eventBusRef = null;
      initialized = false;
      configured = false;
    },

    /**
     * Synthesizes or retrieves a cached composite data URL for an animated entity.
     * @param {string} entityType - 'HERO' | 'WARRIOR' | 'MAGE' | 'HEALER' | 'NPC' | 'ENEMY'
     * @param {Object} options - { facing, frame, weapon, armor, key }
     * @returns {string} Base64 PNG data URL
     */
    get(entityType, options = {}) {
      ensureCanvases();
      if (!workCanvas || !workCtx || !targetCanvas || !targetCtx) return null;

      const type = String(entityType || 'HERO').toUpperCase();
      const facing = String(options.facing || 'DOWN').toUpperCase();
      const frame = (options.frame || 0) % 2;
      const weapon = options.weapon || null;
      const armor = options.armor || null;
      const key = options.key || type;

      const cacheKey = `${type}_${key}_${facing}_F${frame}_W:${weapon || 'NONE'}_A:${armor || 'NONE'}`;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      clearWorkCanvas();

      if (['HERO', 'WARRIOR', 'MAGE', 'HEALER'].includes(type)) {
        drawBaseAnatomy(type, facing, frame);
        if (armor) drawArmorOverlay(armor, facing, frame);
        drawHeadgearOverlay(type, facing, frame);
        if (weapon) drawWeaponOverlay(weapon, facing, frame);
      } else if (type === 'ENEMY') {
        drawAnimatedEnemy(key, frame);
      } else if (type === 'NPC') {
        drawAnimatedNPC(key, frame);
      } else {
        drawBaseAnatomy('HERO', facing, frame);
      }

      // High-Quality Bicubic Downsampling from 128x128 to 32x32
      targetCtx.drawImage(workCanvas, 0, 0, WORK_SIZE, WORK_SIZE, 0, 0, TARGET_SIZE, TARGET_SIZE);

      try {
        const dataUrl = targetCanvas.toDataURL('image/png');
        cache.set(cacheKey, dataUrl);
        return dataUrl;
      } catch (err) {
        console.error('[EmberlightSpriteBaker] Bake failed:', err);
        return null;
      }
    },

    clearCache() {
      cache.clear();
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightSpriteBaker = EmberlightSpriteBaker;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightSpriteBaker;
}
