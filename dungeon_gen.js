/**
 * =========================================================================
 * SUBSYSTEM: SYNTHESIZED MASTER PROCEDURAL DUNGEON CARVER V4
 * -------------------------------------------------------------------------
 * Document Identifier: VSRP-001-DUNGEON-GEN-MASTER-V4
 * Protocol Version:    VSRP-001 / SDCP-001 / PRS-SPEC-029 COMPLIANT
 * Classification:      Tier-3 Spatial Topology & Procedural Matrix Synthesizer
 * Index Anchor:        PRS-001
 * =========================================================================
 */

const EmberlightDungeonGen = (() => {
  // --- High-Fidelity Asset Manifest with Lighting & Particle Emitter Descriptors ---
  const ASSET_MANIFEST = Object.freeze({
    "#": {
      assetId: "WALL_CATACOMB_DEEP",
      name: "Mountain Bedrock Wall",
      variants: 4,
      collision: true,
      castShadow: true,
      baseTint: "#1a1a2e",
      roughness: 0.85,
    },
    ".": {
      assetId: "FLOOR_FLAGSTONE_AGED",
      name: "Cobblestone Path",
      variants: 6,
      collision: false,
      castShadow: false,
      baseTint: "#3b3b58",
      roughness: 0.6,
    },
    ">": {
      assetId: "PORTAL_DESCENT_RUNIC",
      name: "Descent Gate Portal",
      variants: 2,
      collision: false,
      castShadow: false,
      baseTint: "#ffcc00",
      light: { color: "#ffaa00", radius: 4.5, intensity: 1.2 },
      particleEmitter: { type: "GOLDEN_EMBER", rate: 12 },
    },
    "<": {
      assetId: "PORTAL_ASCENT_BEACON",
      name: "Ascent Ladder Beacon",
      variants: 1,
      collision: false,
      castShadow: false,
      baseTint: "#38bdf8",
      light: { color: "#38bdf8", radius: 3.0, intensity: 0.9 },
    },
    $: {
      assetId: "CHEST_RELIC_ORNATE",
      name: "Ancient Relic Chest",
      variants: 2,
      collision: true,
      castShadow: true,
      baseTint: "#fbbf24",
      light: { color: "#f59e0b", radius: 2.0, intensity: 0.8 },
      particleEmitter: { type: "AETHER_SPARK", rate: 6 },
    },
    C: {
      assetId: "CAMP_SANCTUARY_HEARTH",
      name: "Sanctuary Campsite",
      variants: 1,
      collision: false,
      castShadow: false,
      baseTint: "#34d399",
      light: { color: "#10b981", radius: 5.0, intensity: 1.5 },
      particleEmitter: { type: "HEALING_MIST", rate: 8 },
    },
    "~": {
      assetId: "CHASM_ABYSSAL_WATER",
      name: "Abyssal Water Chasm",
      variants: 3,
      collision: true,
      castShadow: false,
      baseTint: "#0284c7",
      particleEmitter: { type: "TOXIC_BUBBLE", rate: 4 },
    },
    P: {
      assetId: "PORTCULLIS_IRON_REINFORCED",
      name: "Reinforced Portcullis",
      variants: 1,
      collision: true,
      castShadow: true,
      baseTint: "#94a3b8",
    },
    _: {
      assetId: "PLATE_PRESSURE_MECHANICAL",
      name: "Mechanical Pressure Plate",
      variants: 1,
      collision: false,
      castShadow: false,
      baseTint: "#cbd5e1",
    },
    "%": {
      assetId: "MIASMA_TOXIC_CLOUD",
      name: "Toxic Miasma Cloud",
      variants: 2,
      collision: false,
      castShadow: false,
      baseTint: "#a855f7",
      particleEmitter: { type: "POISON_SPORE", rate: 10 },
    },
    '"': {
      assetId: "FOLIAGE_GLOW_MOSS",
      name: "Glow Moss & Mist",
      variants: 3,
      collision: false,
      castShadow: false,
      baseTint: "#64748b",
      light: { color: "#06b6d4", radius: 1.5, intensity: 0.4 },
    },
  });

  // --- Seeded PRNG Generator (Fast XorShift / Linear Congruential fallback) ---
  function createRNG(seed) {
    if (
      typeof EmberlightPRNG !== "undefined" &&
      typeof EmberlightPRNG.create === "function"
    ) {
      const p = EmberlightPRNG.create(seed || 123456789);
      return () => p.nextFloat();
    }
    let s = Number(seed) || 123456789;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // =========================================================================
  // CORE TOPOLOGY SYNTHESIZER: HYBRID BSP & TACTICAL MECHANISM CARVER
  // =========================================================================
  function generate(
    seed = Date.now(),
    width = 12,
    height = 10,
    floorLevel = 1,
  ) {
    const rng = createRNG(seed);
    const w = Math.max(8, width);
    const h = Math.max(8, height);

    // 1. Initialize Bedrock
    const map = Array.from({ length: h }, () => new Array(w).fill("#"));

    // 2. BSP Room Subdivision & Partitioning
    const rooms = [];
    const minRoomSize = 3;

    function splitLeaf(rx, ry, rw, rh, depth) {
      if (depth <= 0 || (rw < minRoomSize * 2 && rh < minRoomSize * 2)) {
        const actualW = Math.max(minRoomSize, Math.floor(rng() * (rw - 2)) + 2);
        const actualH = Math.max(minRoomSize, Math.floor(rng() * (rh - 2)) + 2);
        const startX = rx + Math.floor(rng() * (rw - actualW - 1)) + 1;
        const startY = ry + Math.floor(rng() * (rh - actualH - 1)) + 1;

        if (
          startX > 0 &&
          startY > 0 &&
          startX + actualW < w - 1 &&
          startY + actualH < h - 1
        ) {
          rooms.push({
            x: startX,
            y: startY,
            w: actualW,
            h: actualH,
            cx: Math.floor(startX + actualW / 2),
            cy: Math.floor(startY + actualH / 2),
          });
        }
        return;
      }

      if (rw > rh && rw > minRoomSize * 2) {
        const split = Math.floor(rng() * (rw - minRoomSize * 2)) + minRoomSize;
        splitLeaf(rx, ry, split, rh, depth - 1);
        splitLeaf(rx + split, ry, rw - split, rh, depth - 1);
      } else if (rh > minRoomSize * 2) {
        const split = Math.floor(rng() * (rh - minRoomSize * 2)) + minRoomSize;
        splitLeaf(rx, ry, rw, split, depth - 1);
        splitLeaf(rx, ry + split, rw, rh - split, depth - 1);
      } else {
        splitLeaf(rx, ry, rw, rh, depth - 1);
      }
    }

    splitLeaf(1, 1, w - 2, h - 2, 3);

    // Carve BSP Rooms
    const carvedCoords = [];
    rooms.forEach((r) => {
      for (let ry = r.y; ry < r.y + r.h; ry++) {
        for (let rx = r.x; rx < r.x + r.w; rx++) {
          if (ry > 0 && ry < h - 1 && rx > 0 && rx < w - 1) {
            if (map[ry][rx] === "#") {
              map[ry][rx] = ".";
              carvedCoords.push({ x: rx, y: ry });
            }
          }
        }
      }
    });

    // 3. Connect Rooms with Guaranteed Corridors
    for (let i = 0; i < rooms.length - 1; i++) {
      const curr = rooms[i];
      const next = rooms[i + 1];
      let cx = curr.cx;
      let cy = curr.cy;

      while (cx !== next.cx) {
        if (cy > 0 && cy < h - 1 && cx > 0 && cx < w - 1) {
          if (map[cy][cx] === "#") {
            map[cy][cx] = ".";
            carvedCoords.push({ x: cx, y: cy });
          }
        }
        cx += cx < next.cx ? 1 : -1;
      }
      while (cy !== next.cy) {
        if (cy > 0 && cy < h - 1 && cx > 0 && cx < w - 1) {
          if (map[cy][cx] === "#") {
            map[cy][cx] = ".";
            carvedCoords.push({ x: cx, y: cy });
          }
        }
        cy += cy < next.cy ? 1 : -1;
      }
    }

    // Fallback: If BSP produced too few floor tiles, run Drunkard's Walk carver
    if (carvedCoords.length < (w - 2) * (h - 2) * 0.35) {
      let cx = Math.floor(w / 2);
      let cy = Math.floor(h / 2);
      map[cy][cx] = ".";
      carvedCoords.push({ x: cx, y: cy });

      const floorTarget = Math.floor((w - 2) * (h - 2) * 0.48);
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];

      while (carvedCoords.length < floorTarget) {
        const dir = directions[Math.floor(rng() * directions.length)];
        const nx = cx + dir.dx;
        const ny = cy + dir.dy;
        if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
          cx = nx;
          cy = ny;
          if (map[cy][cx] === "#") {
            map[cy][cx] = ".";
            carvedCoords.push({ x: cx, y: cy });
          }
        }
      }
    }

    // 4. Establish Spawn point (<)
    const spawn =
      rooms.length > 0
        ? { x: rooms[0].cx, y: rooms[0].cy }
        : { x: carvedCoords[0].x, y: carvedCoords[0].y };
    map[spawn.y][spawn.x] = "<";

    // 5. Distance Field Sorting
    const sortedByDist = [...carvedCoords].sort((a, b) => {
      const distA = Math.hypot(a.x - spawn.x, a.y - spawn.y);
      const distB = Math.hypot(b.x - spawn.x, b.y - spawn.y);
      return distB - distA;
    });

    // Exit Descent Gate (>) at furthest point
    const exitPt = sortedByDist[0];
    map[exitPt.y][exitPt.x] = ">";

    // Ancient Relic Chest ($) at 2nd furthest point
    const chestPt = sortedByDist[1] || sortedByDist[0];
    if (chestPt.x !== spawn.x || chestPt.y !== spawn.y) {
      map[chestPt.y][chestPt.x] = "$";
    }

    // Sanctuary Campsite (C)
    const campPt =
      sortedByDist[Math.floor(sortedByDist.length * 0.5)] || sortedByDist[0];
    if (
      (campPt.x !== spawn.x || campPt.y !== spawn.y) &&
      (campPt.x !== exitPt.x || campPt.y !== exitPt.y)
    ) {
      map[campPt.y][campPt.x] = "C";
    }

    // 6. Floor Level Gated Hazards & Puzzles
    const cardinalDirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    // Floor Level >= 2: Abyssal Water Chasm (~)
    if (floorLevel >= 2) {
      const chasmX = Math.floor(w / 2) + (rng() > 0.5 ? 1 : -1);
      for (let y = 1; y < h - 1; y++) {
        if (
          map[y][chasmX] === "." &&
          (chasmX !== spawn.x || y !== spawn.y) &&
          (chasmX !== exitPt.x || y !== exitPt.y) &&
          (chasmX !== chestPt.x || y !== chestPt.y)
        ) {
          map[y][chasmX] = "~";
        }
      }
    }

    // Gated Exit: Mechanical Portcullis (P) & Distant Pressure Plate (_)
    let portcullisPlaced = false;
    for (const d of cardinalDirs) {
      const gx = exitPt.x + d.dx;
      const gy = exitPt.y + d.dy;
      if (map[gy]?.[gx] === "." && (gx !== spawn.x || gy !== spawn.y)) {
        map[gy][gx] = "P";
        portcullisPlaced = true;
        break;
      }
    }

    if (portcullisPlaced) {
      const plateCandidate =
        sortedByDist[Math.floor(sortedByDist.length * 0.75)] || sortedByDist[2];
      if (
        plateCandidate &&
        (plateCandidate.x !== spawn.x || plateCandidate.y !== spawn.y) &&
        map[plateCandidate.y][plateCandidate.x] === "."
      ) {
        map[plateCandidate.y][plateCandidate.x] = "_";
      }
    }

    // Floor Level >= 3: Toxic Miasma Pockets (%)
    if (floorLevel >= 3) {
      const miasmaCenter = sortedByDist[Math.floor(sortedByDist.length * 0.35)];
      if (miasmaCenter) {
        cardinalDirs.concat([{ dx: 0, dy: 0 }]).forEach((d) => {
          const mx = miasmaCenter.x + d.dx;
          const my = miasmaCenter.y + d.dy;
          if (
            map[my]?.[mx] === "." &&
            (mx !== spawn.x || my !== spawn.y) &&
            (mx !== exitPt.x || my !== exitPt.y) &&
            (mx !== chestPt.x || my !== chestPt.y)
          ) {
            map[my][mx] = "%";
          }
        });
      }
    }

    // Scatter danger mist / glow moss (")
    carvedCoords.forEach((pt) => {
      if (
        map[pt.y][pt.x] === "." &&
        (pt.x !== spawn.x || pt.y !== spawn.y) &&
        (pt.x !== exitPt.x || pt.y !== exitPt.y) &&
        rng() < 0.18
      ) {
        map[pt.y][pt.x] = '"';
      }
    });

    // 7. Synthesize Metadata Map with Lighting & Particle Descriptors
    const metadataMap = map.map((row, y) =>
      row.map((char, x) => {
        const rule = ASSET_MANIFEST[char] || ASSET_MANIFEST["."];
        const variantCount = rule.variants || 1;
        const selectedVariant = Math.floor(rng() * variantCount);
        const elevation = char === "~" ? -1 : char === "#" ? 1 : 0;

        return {
          x,
          y,
          glyph: char,
          assetId: rule.assetId,
          name: rule.name,
          variant: selectedVariant,
          elevation,
          collision: Boolean(rule.collision),
          castShadow: Boolean(rule.castShadow),
          tint: rule.baseTint,
          light: rule.light ? { ...rule.light } : null,
          particles: rule.particleEmitter ? { ...rule.particleEmitter } : null,
        };
      }),
    );

    return {
      map, // 100% Drop-In 2D Array of string glyphs: map[y][x]
      metadataMap, // Rich object map with lighting, variant and collision metadata
      spawn, // { x, y }
      exit: exitPt, // { x, y }
      depth: floorLevel,
      width: w,
      height: h,
      rooms,
      seed,
    };
  }

  // =========================================================================
  // VSRP-001 9-METHOD LIFECYCLE CONTROLLER
  // =========================================================================
  let configured = false;
  let config = Object.freeze({});
  let initialized = false;
  let lastSimulation = null;

  function configure(options = {}) {
    config = Object.freeze({ ...config, ...options });
    configured = true;
    return Object.freeze({ accepted: true, driverId: "dungeon_gen" });
  }

  function init(context) {
    if (!configured) {
      configured = true;
    }
    initialized = true;
    return true;
  }

  function reset(snapshot = null) {
    const seed = snapshot?.seed || Date.now();
    const width = snapshot?.width || 12;
    const height = snapshot?.height || 10;
    const depth = snapshot?.depth || 1;
    lastSimulation = generate(seed, width, height, depth);
    return lastSimulation;
  }

  function update(dt) {
    // Stateless generator
  }

  function render(renderer, context) {
    // Peripheral spatial provider does not own viewport canvas
  }

  function getState() {
    return lastSimulation ? { ...lastSimulation } : null;
  }

  function getDiagnostics() {
    return {
      driverId: "dungeon_gen_master",
      version: "4.0.0",
      protocolVersion: "VSRP-001",
      configured,
      initialized,
      hasLastSimulation: Boolean(lastSimulation),
      lastGridDimensions: lastSimulation
        ? `${lastSimulation.width}x${lastSimulation.height}`
        : "N/A",
      lastDepth: lastSimulation?.depth || 0,
      supportedManifestGlyphs: Object.keys(ASSET_MANIFEST),
    };
  }

  function getModuleInfo() {
    return {
      moduleId: "EmberlightDungeonGen",
      version: "4.0.0",
      protocolVersion: "VSRP-001",
      capabilities: [
        "hybrid_bsp_carver",
        "deterministic_layout",
        "puzzle_mechanisms",
        "rich_asset_manifest",
        "lighting_descriptors",
      ],
    };
  }

  function destroy() {
    lastSimulation = null;
    initialized = false;
    configured = false;
  }

  return {
    // High-Level Domain API
    generate,
    ASSET_MANIFEST,

    // Canonical VSRP-001 Lifecycle
    configure,
    init,
    reset,
    update,
    render,
    getState,
    getDiagnostics,
    getModuleInfo,
    destroy,
  };
})();

// Attach to Global Scope & CommonJS
if (typeof window !== "undefined") {
  window.EmberlightDungeonGen = EmberlightDungeonGen;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmberlightDungeonGen;
}
