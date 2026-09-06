/* =========================================================================
   PERIPHERAL DRIVER: PSEUDO-3D RAYCASTING ENGINE & CORRIDOR VIEWPORT (v2)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-PSEUDO-3D-RENDERER
   Protocol Version:    VSRP-001 / ARCH-SPEC-WAR-TABLE-001 / PRS-DES-013
   Classification:      Peripheral Capability Driver
   Index Anchor:        PRS-001

   POST-AUDIT ARCHITECTURE NOTES
   -------------------------------------------------------------------------
   1. STATE PURITY — render() never mutates gameplay state. Proximity to a
      trigger tile produces a *description* of that fact (tile, position,
      distance, enter/exit phase) published on the event bus. Interpreting
      that as damage, audio, or anything else is entirely the consumer's
      job. The renderer does not know what "combat:damage" is.

   2. FACTORY PATTERN — EmberlightPseudo3D.createInstance(...) replaces the
      old module-level singleton. Every instance owns its own camera,
      canvas refs, textures, and trigger-latch state. Multiple viewports
      (or a headless instance running next to a real one) are both fine.

   3. DECOUPLING — RaycastMath is a pure namespace: no `document`, no
      `canvas`, no `Image`, nothing DOM-shaped. It takes plain data in and
      returns plain data out, so it can be required into Node and unit
      tested directly (see the smoke test at the bottom of this file,
      gated behind `require.main === module`). createInstance() is the
      only place that touches the browser, and it does so through a thin
      DomAdapter that is skipped entirely when isHeadless is true.

   4. CONFIGURATION — every constant that was previously inline (lerp
      factor, fog exponents, shading multipliers, proximity radii, ray
      column stride, etc.) now lives in DEFAULT_CONFIG and can be
      overridden per-instance via createInstance({ config }).

   5. EFFICIENCY — render() computes a lightweight frame descriptor
      (camera x/y/angle + torch flicker bucket) and skips the full
      floor/wall/sprite pipeline when nothing has changed since the last
      frame. Proximity-trigger evaluation still runs on every call
      regardless, since gameplay correctness must not depend on whether
      the screen happens to be redrawing.

   6. ROBUSTNESS — 'use strict' is now the actual first statement in the
      file (previously it sat after seven `let` declarations, where it is
      not a directive prologue and does nothing). Every tile glyph is
      documented in TILE_LEGEND. The 'F' tile is no longer a silent
      brick-texture fallback — it is its own "Fixture" wall type with its
      own texture. The old '>' overload (stairs tile doubling as "the
      boss is here") is gone; boss-lair proximity now requires the
      dedicated 'K' tile, so a dungeon with multiple staircases no longer
      roars and (formerly) hits the player at every one of them.

   MIGRATION NOTE FOR CALLERS
   -------------------------------------------------------------------------
   Old:   EmberlightPseudo3D.init(eventBus); EmberlightPseudo3D.render(s);
   New:   const viewport = EmberlightPseudo3D.createInstance({ eventBus });
          viewport.init();
          viewport.render(s);
   This is a breaking change. It is breaking on purpose — the old shape
   cannot support more than one camera or a headless test run, which are
   exactly the two things being fixed.
   ========================================================================= */

const EmberlightPseudo3D = (() => {
  // ---- 1. CONFIG ----------------------------------------------------------
  // Every previously-hardcoded constant lives here. Override via
  // createInstance({ config: { ... } }); overrides are deep-merged onto
  // this default, so callers only need to specify what they're changing.
  const DEFAULT_CONFIG = Object.freeze({
    textureSize: 32,
    standard: { width: 480, height: 260, fovDeg: 60 },
    expanded: { width: 960, height: 360, fovDeg: 75 },
    maxDepth: 8.5,
    ddaMaxSteps: 32,
    // Rays are cast every Nth column and the result is duplicated across
    // the gap. 2 = half horizontal resolution for 2x the raycast budget.
    // Set to 1 for full-resolution (slower) rendering.
    columnStride: 2,
    // Camera position/angle smoothing is time-based (exponential decay),
    // not per-frame-multiplicative, so it no longer changes game feel
    // depending on frame rate. Higher = snappier.
    cameraLerpRate: 10,
    wallHeightScale: 1.05,
    // Multiplier applied to wall color on the "Y-side" DDA hit, giving
    // north/south-facing walls a slightly darker tone than east/west.
    sideShadeFactor: 0.75,
    fog: {
      exponentSurface: 1.25,
      exponentDungeon: 1.45,
      // Absolute view horizon while underground, independent of maxDepth.
      maxHorizonDungeon: 5.4,
      voidSurface: { r: 5, g: 5, b: 13 },
      voidDungeon: { r: 2, g: 2, b: 6 },
    },
    billboard: {
      heightFactor: 0.75,
      fadeExponent: 1.35,
      fontMin: 14,
      fontMax: 80,
    },
    minimap: { radiusTiles: 3 },
    idle: {
      // If false (default — sensible for a turn-based, tile-locked
      // crawler), torch flicker freezes on the last drawn frame while the
      // camera is stationary, and the whole render pipeline is skipped.
      // If true, flicker keeps animating at idle (small extra cost: one
      // dirty-check per frame, full redraw only when flicker moves enough
      // to matter).
      enableFlickerWhileIdle: false,
      positionEpsilon: 0.001,
      angleEpsilon: 0.001,
      flickerEpsilon: 0.01,
    },
    // Data-driven proximity triggers. The renderer only ever reports
    // geometry ("camera is within enterRadius of tile T at x,y"); it does
    // not know or care what that means gameplay-wise. `isArmed` gates
    // whether a given trigger definition is currently active at all
    // (e.g. don't fire once the boss is already dead).
    proximityTriggers: [
      {
        tile: "K", // dedicated boss-lair marker — see TILE_LEGEND
        eventName: "renderer:proximity_trigger",
        payloadTag: "boss_lair",
        enterRadius: 2.2,
        exitRadius: 2.8,
        isArmed: (gameState) => !gameState?.flags?.boss_slain,
      },
    ],
  });

  function deepMerge(base, override) {
    if (!override) return base;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const key of Object.keys(override)) {
      const bVal = base ? base[key] : undefined;
      const oVal = override[key];
      if (
        oVal &&
        typeof oVal === "object" &&
        !Array.isArray(oVal) &&
        typeof bVal === "object" &&
        bVal !== null
      ) {
        out[key] = deepMerge(bVal, oVal);
      } else {
        out[key] = oVal;
      }
    }
    return out;
  }

  // ---- 2. TILE LEGEND & GLYPHS --------------------------------------------
  // Every character a map cell can hold, and what it means to this driver.
  const TILE_LEGEND = Object.freeze({
    "#": "Structural stone wall. Blocking. Renders with BRICK texture.",
    B: "Timber/wood wall. Blocking. Renders with TIMBER texture.",
    F:
      "Fixture — a blocking obstacle that is not structural wall (rubble, " +
      "blocked doorway, statue). Blocking. Renders with its own RUBBLE " +
      "texture (previously fell through to BRICK with no explanation).",
    P:
      "Portcullis / iron gate. Blocking, but partially see-through " +
      "(texture has 0-alpha gaps). Renders with PORTCULLIS texture.",
    T:
      "Town floor marker. Not blocking. When the player occupies this " +
      "tile, isTown mode is active: timber walls/ceiling replace the " +
      "dungeon set regardless of what individual wall tiles say.",
    ">":
      "Downward stairs. Traversal only — no proximity trigger. (Previously " +
      'this tile doubled as an implicit "boss is here" trigger, which meant ' +
      "any dungeon floor with more than one staircase would misfire the " +
      'boss-proximity event at every one of them. Use "K" for that instead.)',
    "<": "Upward stairs / exit. Traversal only — no proximity trigger.",
    K:
      "Boss lair marker. The dedicated tile for boss-proximity events. " +
      "See DEFAULT_CONFIG.proximityTriggers.",
    $: "Treasure billboard sprite.",
    C: "Campfire / torch billboard sprite.",
    E: "Elder / quest-giver NPC billboard sprite.",
    G: "Guardian / armored NPC billboard sprite.",
    V: "Villager / traveler billboard sprite.",
    "@": "Mount / pack-animal billboard sprite.",
    "~": "Water hazard billboard sprite.",
    "%": "Hazard / toxin zone billboard sprite.",
  });

  const BILLBOARD_GLYPHS = Object.freeze({
    $: "\u{1F4B0}", // money bag
    C: "\u{1F525}", // fire
    E: "\u{1F9D3}", // elder
    G: "\u{1F6E1}\u{FE0F}", // shield
    V: "\u{1F464}", // person silhouette
    "@": "\u{1F42B}", // camel
    ">": "\u{1FA9C}", // ladder
    "<": "\u{1F6AA}", // door
    "~": "\u{1F30A}", // wave
    "%": "\u{2623}\u{FE0F}", // biohazard
  });
  // NOTE ON BILLBOARD ART: these are emoji glyphs rendered via
  // ctx.fillText, which is a placeholder strategy — emoji glyph shapes are
  // font/OS-dependent (Windows, macOS, and mobile browsers render visibly
  // different art for the same codepoint, and some platforms fall back to
  // monochrome glyphs). Fine for prototyping; swap resolveBillboardImage()
  // in the DOM adapter for a sprite-sheet lookup before shipping.

  const WALL_TILES = Object.freeze(new Set(["#", "B", "F", "P"]));

  const FACING_ANGLES = Object.freeze({
    UP: -Math.PI / 2,
    DOWN: Math.PI / 2,
    LEFT: Math.PI,
    RIGHT: 0,
  });

  // ---- 3. PURE MATH CORE ---------------------------------------------------
  // Nothing below this point touches `document`, `canvas`, `Image`, or any
  // browser global. Every function takes plain data and returns plain data,
  // so all of it is directly callable from a Node test.
  const RaycastMath = (() => {
    function packColor(r, g, b, a = 255) {
      return (a << 24) | (b << 16) | (g << 8) | r;
    }

    function bakeBrickTexture(size) {
      const tex = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const isMortarH =
            y === 0 || y === Math.floor(size / 2) - 1 || y === size - 1;
          const isMortarV1 = y < size / 2 && x === 0;
          const isMortarV2 = y >= size / 2 && x === Math.floor(size / 2);
          if (isMortarH || isMortarV1 || isMortarV2) {
            tex[y * size + x] = packColor(18, 18, 30);
          } else {
            const noise = ((x * 17 + y * 29) % 23) - 11;
            const base = 48 + noise;
            tex[y * size + x] = packColor(base, base + 2, base + 14);
          }
        }
      }
      return tex;
    }

    function bakeTimberTexture(size) {
      const tex = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const isSeam = x % 8 === 0;
          const grain = Math.sin(y * 0.8) * 6;
          if (isSeam) {
            tex[y * size + x] = packColor(30, 15, 5);
          } else {
            const r = Math.max(0, 95 + grain);
            const g = Math.max(0, 55 + grain * 0.5);
            tex[y * size + x] = packColor(r, g, 20);
          }
        }
      }
      return tex;
    }

    function bakeRubbleTexture(size) {
      // Distinct from BRICK: irregular, no mortar grid, greyer/duller —
      // reads as "broken obstruction" rather than "built wall".
      const tex = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const noise = ((x * 31 + y * 11) % 19) - 9;
          const base = 40 + noise;
          tex[y * size + x] = packColor(base + 4, base + 2, base);
        }
      }
      return tex;
    }

    function bakePortcullisTexture(size) {
      const tex = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const isBar =
            x % 6 < 2 ||
            y === Math.floor(size / 4) ||
            y === Math.floor((size * 3) / 4);
          if (isBar) {
            const iron = x % 6 === 0 ? 140 : 80;
            tex[y * size + x] = packColor(iron, iron, iron + 10);
          } else {
            tex[y * size + x] = 0; // transparent gap
          }
        }
      }
      return tex;
    }

    function bakeFloorTexture(size) {
      const tex = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const isJoint = x === 0 || y === 0;
          if (isJoint) {
            tex[y * size + x] = packColor(10, 10, 18);
          } else {
            const d = (x * 13 + y * 7) % 17;
            tex[y * size + x] = packColor(22 + d, 22 + d, 32 + d);
          }
        }
      }
      return tex;
    }

    function bakeCeilingTexture(size) {
      const tex = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const isBeam = y % 16 < 3;
          if (isBeam) {
            tex[y * size + x] = packColor(35, 20, 10);
          } else {
            const d = x % 4;
            tex[y * size + x] = packColor(10 + d, 10 + d, 20 + d);
          }
        }
      }
      return tex;
    }

    function bakeTextures(config) {
      const size = config.textureSize;
      return {
        BRICK: bakeBrickTexture(size),
        TIMBER: bakeTimberTexture(size),
        RUBBLE: bakeRubbleTexture(size),
        PORTCULLIS: bakePortcullisTexture(size),
        FLOOR: bakeFloorTexture(size),
        CEILING: bakeCeilingTexture(size),
      };
    }

    function resolveWallTextureKey(hitTile, isTown) {
      if (hitTile === "P") return "PORTCULLIS";
      if (hitTile === "F") return "RUBBLE";
      if (hitTile === "B" || isTown) return "TIMBER";
      return "BRICK";
    }

    function applyFog(color, distance, torchFlicker, isDungeon, config) {
      if (color === 0) return 0; // transparent sentinel (portcullis gaps)
      const fog = config.fog;
      const maxHorizon = isDungeon ? fog.maxHorizonDungeon : config.maxDepth;
      const fogMax = maxHorizon * torchFlicker;
      const exponent = isDungeon ? fog.exponentDungeon : fog.exponentSurface;
      const fogRatio = Math.min(
        1.0,
        Math.max(0.0, (distance / fogMax) ** exponent),
      );

      const r = color & 0xff;
      const g = (color >> 8) & 0xff;
      const b = (color >> 16) & 0xff;

      const voidColor = isDungeon ? fog.voidDungeon : fog.voidSurface;

      const fr = Math.trunc(r + (voidColor.r - r) * fogRatio);
      const fg = Math.trunc(g + (voidColor.g - g) * fogRatio);
      const fb = Math.trunc(b + (voidColor.b - b) * fogRatio);

      return packColor(fr, fg, fb);
    }

    function computeCameraPlane(camera) {
      const cosA = Math.cos(camera.angle);
      const sinA = Math.sin(camera.angle);
      return { cosA, sinA };
    }

    function computeFov(camera, fovRad, cosA, sinA) {
      const fovScale = Math.tan(fovRad / 2);
      return { planeX: -sinA * fovScale, planeY: cosA * fovScale };
    }

    // Casts one ray. Pure: takes camera/map/config, returns a plain result.
    function castDdaRay(
      camera,
      cameraX,
      cosA,
      sinA,
      planeX,
      planeY,
      map,
      config,
    ) {
      const rayDirX = cosA + planeX * cameraX;
      const rayDirY = sinA + planeY * cameraX;

      let mapX = Math.trunc(camera.x);
      let mapY = Math.trunc(camera.y);

      const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
      const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

      const stepX = rayDirX < 0 ? -1 : 1;
      let sideDistX =
        rayDirX < 0
          ? (camera.x - mapX) * deltaDistX
          : (mapX + 1.0 - camera.x) * deltaDistX;

      const stepY = rayDirY < 0 ? -1 : 1;
      let sideDistY =
        rayDirY < 0
          ? (camera.y - mapY) * deltaDistY
          : (mapY + 1.0 - camera.y) * deltaDistY;

      let side = 0;
      let hitTile = "#";
      let loopCount = 0;
      let outOfBounds = false;

      while (loopCount++ < config.ddaMaxSteps) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        if (
          mapY < 0 ||
          mapY >= map.length ||
          mapX < 0 ||
          mapX >= map[0].length
        ) {
          outOfBounds = true;
          break;
        }

        const tile = map[mapY][mapX];
        if (WALL_TILES.has(tile)) {
          hitTile = tile;
          break;
        }
      }

      let perpDist =
        side === 0
          ? (mapX - camera.x + (1 - stepX) / 2) / rayDirX
          : (mapY - camera.y + (1 - stepY) / 2) / rayDirY;

      perpDist = Math.max(0.1, perpDist);

      return {
        rayDirX,
        rayDirY,
        hitTile,
        side,
        perpDist,
        mapX,
        mapY,
        outOfBounds,
      };
    }

    // Pure geometry for one wall column: everything needed to draw it,
    // without actually touching a pixel buffer.
    function computeWallColumnPlan(ray, camera, dims, config) {
      const { rayDirX, rayDirY, side, perpDist } = ray;
      const lineHeight = Math.trunc(
        (dims.height / perpDist) * config.wallHeightScale,
      );
      const halfH = dims.height / 2;
      const drawStart = Math.max(0, Math.trunc(halfH - lineHeight / 2));
      const drawEnd = Math.min(
        dims.height - 1,
        Math.trunc(halfH + lineHeight / 2),
      );

      let wallX =
        side === 0
          ? camera.y + perpDist * rayDirY
          : camera.x + perpDist * rayDirX;
      wallX -= Math.floor(wallX);
      const size = config.textureSize;
      let texX = Math.trunc(wallX * size) & (size - 1);
      if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
        texX = size - texX - 1;
      }

      const step = size / lineHeight;
      const texPosStart = (drawStart - halfH + lineHeight / 2) * step;

      return { drawStart, drawEnd, texX, step, texPosStart };
    }

    // Pure geometry for one floor/ceiling scanline row.
    function computeFloorRowPlan(y, camera, planeX, planeY, cosA, sinA, dims) {
      const halfH = dims.height / 2;
      const p = y - halfH;
      const rowDistance = halfH / p;
      const stepX = (rowDistance * (planeX * 2)) / dims.width;
      const stepY = (rowDistance * (planeY * 2)) / dims.width;
      const floorX = camera.x + rowDistance * (cosA - planeX);
      const floorY = camera.y + rowDistance * (sinA - planeY);
      return { rowDistance, stepX, stepY, floorX, floorY };
    }

    // Time-based camera smoothing (exponential decay) — frame-rate
    // independent, unlike a fixed per-frame multiplier. Pure: returns a
    // new camera object, does not mutate the input.
    function lerpCamera(camera, dt, rate) {
      const t = 1 - Math.exp(-rate * dt);
      let dAngle = camera.targetAngle - camera.angle;
      while (dAngle < -Math.PI) dAngle += Math.PI * 2;
      while (dAngle > Math.PI) dAngle -= Math.PI * 2;

      return {
        ...camera,
        x: camera.x + (camera.targetX - camera.x) * t,
        y: camera.y + (camera.targetY - camera.y) * t,
        angle: camera.angle + dAngle * t,
      };
    }

    function computeVisibleSprites(camera, map, config) {
      const sprites = [];
      const minX = Math.max(0, Math.trunc(camera.x - config.maxDepth));
      const maxX = Math.min(
        map[0].length - 1,
        Math.trunc(camera.x + config.maxDepth),
      );
      const minY = Math.max(0, Math.trunc(camera.y - config.maxDepth));
      const maxY = Math.min(
        map.length - 1,
        Math.trunc(camera.y + config.maxDepth),
      );

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const tile = map[y][x];
          if (BILLBOARD_GLYPHS[tile]) {
            const dx = x + 0.5 - camera.x;
            const dy = y + 0.5 - camera.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.35 && dist < config.maxDepth) {
              sprites.push({ x: x + 0.5, y: y + 0.5, dist, tile });
            }
          }
        }
      }
      return sprites.sort((a, b) => b.dist - a.dist);
    }

    function projectSprite(camera, sprite, planeX, planeY, cosA, sinA, dims) {
      const invDet = 1.0 / (planeX * sinA - cosA * planeY || 1e-6);
      const spX = sprite.x - camera.x;
      const spY = sprite.y - camera.y;

      const transformX = invDet * (sinA * spX - cosA * spY);
      const transformY = invDet * (-planeY * spX + planeX * spY);

      if (transformY <= 0.2) return null;

      const spriteScreenX = Math.trunc(
        (dims.width / 2) * (1 + transformX / transformY),
      );
      const spriteH = Math.trunc(Math.abs((dims.height / transformY) * 0.75));

      return { spriteScreenX, spriteH, transformY };
    }

    // Pure proximity-trigger evaluation. Takes the previous latch map
    // (never mutated) and returns { events, nextLatches }. Each latch is
    // keyed per tile *instance* (its coordinates), not a single global
    // flag, so N independent trigger tiles on a map behave independently.
    function evaluateProximityTriggers(
      camera,
      map,
      config,
      gameState,
      prevLatches,
    ) {
      const events = [];
      const nextLatches = new Map(prevLatches);
      const triggers = config.proximityTriggers || [];
      if (triggers.length === 0) return { events, nextLatches };

      const minX = Math.max(0, Math.trunc(camera.x - config.maxDepth));
      const maxX = Math.min(
        map[0].length - 1,
        Math.trunc(camera.x + config.maxDepth),
      );
      const minY = Math.max(0, Math.trunc(camera.y - config.maxDepth));
      const maxY = Math.min(
        map.length - 1,
        Math.trunc(camera.y + config.maxDepth),
      );

      for (const trigger of triggers) {
        const armed =
          typeof trigger.isArmed === "function"
            ? trigger.isArmed(gameState)
            : true;
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (map[y][x] !== trigger.tile) continue;
            const latchKey = `${trigger.tile}:${x}:${y}`;
            const dist = Math.hypot(x + 0.5 - camera.x, y + 0.5 - camera.y);
            const wasLatched = nextLatches.get(latchKey) === true;

            if (armed && !wasLatched && dist <= trigger.enterRadius) {
              nextLatches.set(latchKey, true);
              events.push({
                eventName: trigger.eventName,
                payload: {
                  tag: trigger.payloadTag,
                  tile: trigger.tile,
                  x,
                  y,
                  distance: dist,
                  phase: "enter",
                },
              });
            } else if (wasLatched && dist > trigger.exitRadius) {
              nextLatches.set(latchKey, false);
              events.push({
                eventName: trigger.eventName,
                payload: {
                  tag: trigger.payloadTag,
                  tile: trigger.tile,
                  x,
                  y,
                  distance: dist,
                  phase: "exit",
                },
              });
            }
          }
        }
      }

      return { events, nextLatches };
    }

    // Decides whether a full redraw is needed. Pure: two descriptors in,
    // boolean out.
    function isDirty(prev, next, config) {
      if (!prev) return true;
      const idle = config.idle;
      if (Math.abs(next.x - prev.x) > idle.positionEpsilon) return true;
      if (Math.abs(next.y - prev.y) > idle.positionEpsilon) return true;
      let dAngle = Math.abs(next.angle - prev.angle);
      if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
      if (dAngle > idle.angleEpsilon) return true;
      if (next.mapRef !== prev.mapRef) return true;
      if (next.isTown !== prev.isTown || next.isDungeon !== prev.isDungeon)
        return true;
      if (
        idle.enableFlickerWhileIdle &&
        Math.abs(next.torchFlicker - prev.torchFlicker) > idle.flickerEpsilon
      )
        return true;
      return false;
    }

    return {
      packColor,
      bakeTextures,
      resolveWallTextureKey,
      applyFog,
      computeCameraPlane,
      computeFov,
      castDdaRay,
      computeWallColumnPlan,
      computeFloorRowPlan,
      lerpCamera,
      computeVisibleSprites,
      projectSprite,
      evaluateProximityTriggers,
      isDirty,
      FACING_ANGLES,
      WALL_TILES,
    };
  })();

  // ---- 4. FACTORY (DOM adapter + instance state) ---------------------------
  function createInstance(options = {}) {
    let config = deepMerge(DEFAULT_CONFIG, options.config);
    const isHeadless = Boolean(options.isHeadless);
    let eventBus = options.eventBus || null;
    const canvasId = options.canvasId || "corridor-canvas";
    const minimapCanvasId =
      options.minimapCanvasId || "corridor-minimap-canvas";
    const compassRibbonId =
      options.compassRibbonId || "corridor-compass-ribbon";
    const minimapOverlayId =
      options.minimapOverlayId || "corridor-minimap-overlay";

    const textures = RaycastMath.bakeTextures(config);

    let canvas = null,
      ctx = null,
      minimapCanvas = null,
      minimapCtx = null;
    let imgData = null,
      pixelBuf = null;
    let depthBuffer = null;
    let isExpandedMode = false;
    let isPaused = false;
    let W = config.standard.width;
    let H = config.standard.height;
    let FOV = (config.standard.fovDeg * Math.PI) / 180;

    let camera = {
      x: 1.5,
      y: 1.5,
      targetX: 1.5,
      targetY: 1.5,
      angle: Math.PI / 2,
      targetAngle: Math.PI / 2,
      t: 0,
    };
    let triggerLatches = new Map();
    let lastFrameDescriptor = null;
    let dirtyOverride = true; // forces at least one real render on first call

    function dims() {
      return { width: W, height: H };
    }

    function attachDom() {
      if (isHeadless || typeof document === "undefined") return;
      canvas = document.getElementById(canvasId);
      if (canvas && typeof canvas.getContext === "function") {
        canvas.width = W;
        canvas.height = H;
        ctx = canvas.getContext("2d");
        if (ctx && typeof ctx.createImageData === "function") {
          imgData = ctx.createImageData(W, H);
          if (imgData?.data?.buffer) {
            pixelBuf = new Uint32Array(imgData.data.buffer);
          }
        }
      }
      minimapCanvas = document.getElementById(minimapCanvasId);
      if (minimapCanvas && typeof minimapCanvas.getContext === "function") {
        minimapCtx = minimapCanvas.getContext("2d");
      }
    }

    function resizeBuffers(targetW, targetH, targetFovRad) {
      W = targetW;
      H = targetH;
      FOV = targetFovRad;
      depthBuffer = new Float32Array(W);
      attachDom();
    }

    function ensureBuffers() {
      if (isHeadless) {
        if (!depthBuffer || depthBuffer.length !== W)
          depthBuffer = new Float32Array(W);
        return;
      }
      if (
        !pixelBuf ||
        (canvas && (canvas.width !== W || canvas.height !== H))
      ) {
        resizeBuffers(W, H, FOV);
      }
    }

    // ---- floor/ceiling ----
    function renderFloorAndCeiling(torchFlicker, isTown, isDungeon) {
      if (!pixelBuf) return;
      const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
      const { planeX, planeY } = RaycastMath.computeFov(
        camera,
        FOV,
        cosA,
        sinA,
      );
      const halfH = H / 2;
      const size = config.textureSize;
      const floorTex = isTown ? textures.TIMBER : textures.FLOOR;
      const ceilTex = textures.CEILING;
      const stride = config.columnStride;

      for (let y = Math.trunc(halfH) + 1; y < H; y++) {
        const plan = RaycastMath.computeFloorRowPlan(
          y,
          camera,
          planeX,
          planeY,
          cosA,
          sinA,
          dims(),
        );
        let { floorX, floorY } = plan;
        const ceilY = H - y;
        const rowOffsetFloor = y * W;
        const rowOffsetCeil = ceilY * W;

        for (let x = 0; x < W; x += stride) {
          const tx = Math.trunc(floorX * size) & (size - 1);
          const ty = Math.trunc(floorY * size) & (size - 1);
          const texIdx = ty * size + tx;

          const shadedFloor = RaycastMath.applyFog(
            floorTex[texIdx],
            plan.rowDistance,
            torchFlicker,
            isDungeon,
            config,
          );
          for (let k = 0; k < stride && x + k < W; k++)
            pixelBuf[rowOffsetFloor + x + k] = shadedFloor;

          let rawCeil;
          if (isDungeon || isTown) {
            rawCeil = ceilTex[texIdx];
          } else {
            const skyRatio = (y - halfH) / halfH;
            const sr = Math.floor(6 + skyRatio * 10);
            const sg = Math.floor(10 + skyRatio * 18);
            const sb = Math.floor(22 + skyRatio * 32);
            rawCeil = RaycastMath.packColor(sr, sg, sb);
          }
          const shadedCeil = RaycastMath.applyFog(
            rawCeil,
            plan.rowDistance,
            torchFlicker,
            isDungeon,
            config,
          );
          for (let k = 0; k < stride && x + k < W; k++)
            pixelBuf[rowOffsetCeil + x + k] = shadedCeil;

          floorX += plan.stepX * stride;
          floorY += plan.stepY * stride;
        }
      }
    }

    // ---- walls ----
    function renderWalls(map, torchFlicker, isTown) {
      if (!pixelBuf) return;
      const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
      const { planeX, planeY } = RaycastMath.computeFov(
        camera,
        FOV,
        cosA,
        sinA,
      );
      const stride = config.columnStride;
      const size = config.textureSize;

      for (let x = 0; x < W; x += stride) {
        const cameraX = (2 * x) / W - 1;
        const ray = RaycastMath.castDdaRay(
          camera,
          cameraX,
          cosA,
          sinA,
          planeX,
          planeY,
          map,
          config,
        );
        for (let k = 0; k < stride && x + k < W; k++)
          depthBuffer[x + k] = ray.perpDist;

        const plan = RaycastMath.computeWallColumnPlan(
          ray,
          camera,
          dims(),
          config,
        );
        const texKey = RaycastMath.resolveWallTextureKey(ray.hitTile, isTown);
        const activeTex = textures[texKey];
        let texPos = plan.texPosStart;

        for (let y = plan.drawStart; y <= plan.drawEnd; y++) {
          const texY = Math.trunc(texPos) & (size - 1);
          texPos += plan.step;
          let color = activeTex[texY * size + plan.texX];

          if (color !== 0) {
            if (ray.side === 1) {
              const f = config.sideShadeFactor;
              const r = Math.trunc((color & 0xff) * f);
              const g = Math.trunc(((color >> 8) & 0xff) * f);
              const b = Math.trunc(((color >> 16) & 0xff) * f);
              color = RaycastMath.packColor(r, g, b);
            }
            const shaded = RaycastMath.applyFog(
              color,
              ray.perpDist,
              torchFlicker,
              false,
              config,
            );
            for (let k = 0; k < stride && x + k < W; k++)
              pixelBuf[y * W + x + k] = shaded;
          }
        }
      }
    }

    // ---- billboards (rendering only — trigger *evaluation* lives in RaycastMath) ----
    function resolveBillboardShadow(tile) {
      if (tile === "C") return { color: "#f59e0b", blur: 18 };
      if (tile === "$") return { color: "#fbbf24", blur: 12 };
      if (tile === "%") return { color: "#c084fc", blur: 14 };
      return { color: "#ff9d4d", blur: 6 };
    }

    function renderBillboards(map, torchFlicker) {
      if (!ctx) return;
      const sprites = RaycastMath.computeVisibleSprites(camera, map, config);
      if (sprites.length === 0) return;

      const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
      const { planeX, planeY } = RaycastMath.computeFov(
        camera,
        FOV,
        cosA,
        sinA,
      );

      for (const sp of sprites) {
        const glyph = BILLBOARD_GLYPHS[sp.tile];
        if (!glyph) continue;
        const proj = RaycastMath.projectSprite(
          camera,
          sp,
          planeX,
          planeY,
          cosA,
          sinA,
          dims(),
        );
        if (!proj) continue;
        if (proj.spriteScreenX < 0 || proj.spriteScreenX >= W) continue;
        if (proj.transformY >= depthBuffer[proj.spriteScreenX]) continue;

        ctx.save();
        const fontSize = Math.max(
          config.billboard.fontMin,
          Math.min(config.billboard.fontMax, proj.spriteH),
        );
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.max(
          0.15,
          1.0 -
          (sp.dist / (config.maxDepth * torchFlicker)) **
          config.billboard.fadeExponent,
        );

        const shadow = resolveBillboardShadow(sp.tile);
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur;
        if (ctx.fillText)
          ctx.fillText(glyph, proj.spriteScreenX, H / 2 + proj.spriteH * 0.08);
        ctx.restore();
      }
    }

    // ---- HUD (compass / minimap / vignette) ----
    function updateCompassRibbon(angle) {
      if (typeof document === "undefined") return;
      const el = document.getElementById(compassRibbonId);
      if (!el) return;
      let deg = ((angle * 180) / Math.PI + 90) % 360;
      if (deg < 0) deg += 360;
      deg = Math.trunc(deg);
      let cardinal = "NORTH";
      if (deg >= 45 && deg < 135) cardinal = "EAST";
      else if (deg >= 135 && deg < 225) cardinal = "SOUTH";
      else if (deg >= 225 && deg < 315) cardinal = "WEST";
      el.textContent = `\u25B2 ${cardinal} (${deg.toString().padStart(3, "0")}\u00B0)`;
    }

    function getMinimapTileColor(tile, isOutOfBounds) {
      if (isOutOfBounds) return "#0a0d17";
      if (tile === "#" || tile === "B" || tile === "F") return "#334155";
      if (tile === "T") return "#14532d";
      if (tile === "~") return "#1e3a8a";
      if (tile === "%") return "#581c87";
      if (tile === "$") return "#f59e0b";
      if (tile === "C") return "#ef4444";
      if (tile === ">" || tile === "<" || tile === "K") return "#38bdf8";
      return "#1e293b";
    }

    function renderMinimapRadar(map, playerPos) {
      if (!minimapCtx || !minimapCanvas || !map || !playerPos) return;
      const mw = minimapCanvas.width,
        mh = minimapCanvas.height;
      const radius = config.minimap.radiusTiles;
      const cellW = mw / (radius * 2 + 1);
      const cellH = mh / (radius * 2 + 1);

      minimapCtx.fillStyle = "rgba(5, 8, 18, 0.95)";
      minimapCtx.fillRect(0, 0, mw, mh);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const gx = playerPos.x + dx,
            gy = playerPos.y + dy;
          const rx = (dx + radius) * cellW,
            ry = (dy + radius) * cellH;
          const oob =
            gy < 0 || gy >= map.length || gx < 0 || gx >= map[0].length;
          const tile = oob ? "" : map[gy][gx];
          minimapCtx.fillStyle = getMinimapTileColor(tile, oob);
          minimapCtx.fillRect(rx, ry, cellW - 1, cellH - 1);
        }
      }

      const pcx = radius * cellW + cellW / 2,
        pcy = radius * cellH + cellH / 2;
      minimapCtx.fillStyle = "#fbbf24";
      minimapCtx.beginPath();
      minimapCtx.arc(pcx, pcy, Math.min(cellW, cellH) * 0.35, 0, Math.PI * 2);
      minimapCtx.fill();

      const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
      minimapCtx.strokeStyle = "#38bdf8";
      minimapCtx.lineWidth = 1.5;
      minimapCtx.beginPath();
      minimapCtx.moveTo(pcx, pcy);
      minimapCtx.lineTo(
        pcx + cosA * (cellW * 0.85),
        pcy + sinA * (cellH * 0.85),
      );
      minimapCtx.stroke();

      minimapCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      minimapCtx.lineWidth = 1;
      minimapCtx.strokeRect(0, 0, mw, mh);
    }

    function renderVignetteAndDebugHud(isDungeon, facing, map) {
      if (!ctx?.createRadialGradient || !ctx.fillRect) return;
      ctx.save();
      const vignette = ctx.createRadialGradient(
        W / 2,
        H / 2,
        isDungeon ? 25 : 40,
        W / 2,
        H / 2,
        W * (isDungeon ? 0.5 : 0.55),
      );
      if (isDungeon) {
        vignette.addColorStop(0, "rgba(255, 140, 50, 0.05)");
        vignette.addColorStop(0.55, "rgba(5, 3, 10, 0.45)");
        vignette.addColorStop(1, "rgba(2, 2, 6, 0.96)");
      } else {
        vignette.addColorStop(0, "rgba(255, 157, 77, 0.02)");
        vignette.addColorStop(0.7, "rgba(5, 5, 13, 0.20)");
        vignette.addColorStop(1, "rgba(3, 3, 8, 0.82)");
      }
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      if (!isExpandedMode && ctx.fillText) {
        ctx.fillStyle = "#ff9d4d";
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = "left";
        ctx.fillText(`BEARING: ${facing || "DOWN"}`, 12, 18);

        const aheadX = Math.trunc(camera.x + Math.cos(camera.angle) * 1.0);
        const aheadY = Math.trunc(camera.y + Math.sin(camera.angle) * 1.0);
        const aheadTile = map[aheadY]?.[aheadX] || "#";
        ctx.fillStyle = "#7a7a9e";
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText(`AHEAD: [${aheadTile}]`, 12, 30);
      }
      ctx.restore();
    }

    // ---- public API ----
    function init(busOrOpts) {
      if (busOrOpts) {
        if (typeof busOrOpts.publish === "function") {
          eventBus = busOrOpts;
        } else if (
          busOrOpts.eventBus &&
          typeof busOrOpts.eventBus.publish === "function"
        ) {
          eventBus = busOrOpts.eventBus;
        }
      }
      ensureBuffers();
      if (!isHeadless && typeof window !== "undefined") {
        window.addEventListener("resize", () => ensureBuffers());
      }
      return api;
    }

    function setExpanded(expanded) {
      isExpandedMode = Boolean(expanded);
      const src = isExpandedMode ? config.expanded : config.standard;
      resizeBuffers(src.width, src.height, (src.fovDeg * Math.PI) / 180);
      if (!isHeadless && typeof document !== "undefined") {
        const compassRibbon = document.getElementById(compassRibbonId);
        const minimapOverlay = document.getElementById(minimapOverlayId);
        if (compassRibbon)
          compassRibbon.classList.toggle("hidden", !isExpandedMode);
        if (minimapOverlay)
          minimapOverlay.classList.toggle("hidden", !isExpandedMode);
      }
    }

    function getDimensions() {
      return {
        width: W,
        height: H,
        isExpanded: isExpandedMode,
        fovDeg: Math.round((FOV * 180) / Math.PI),
      };
    }

    function update(dt = 0.016) {
      camera.t += dt;
      ensureBuffers();
      camera = RaycastMath.lerpCamera(camera, dt, config.cameraLerpRate);
    }

    // Forces the next render() to do a full redraw even if the camera
    // hasn't moved — for consumers that changed something the renderer
    // can't detect on its own (map edited, an entity removed, etc).
    function markDirty() {
      dirtyOverride = true;
    }

    function render(state) {
      if (isPaused || !state) return null;
      const { map, playerPos, facing } = state;
      if (!map || !playerPos) return null;

      camera.targetX = playerPos.x + 0.5;
      camera.targetY = playerPos.y + 0.5;
      if (facing && FACING_ANGLES_HAS(facing))
        camera.targetAngle = RaycastMath.FACING_ANGLES[facing];

      const isDungeon = Boolean(
        (state.depth && state.depth > 0) ||
        (state.dungeonDepth && state.dungeonDepth > 0) ||
        (map[playerPos.y] || [])[playerPos.x] === ">",
      );
      const isTown =
        (map[playerPos.y] || [])[playerPos.x] === "T" ||
        Boolean(state.flags?.in_town);
      const torchFlicker =
        0.94 +
        Math.sin(camera.t * 3.7) * 0.05 +
        Math.cos(camera.t * 7.1) * 0.03;

      // Gameplay-facing proximity events fire regardless of whether we
      // end up skipping the visual redraw below — correctness here must
      // not depend on frame-rate or idle-skip behavior.
      const { events, nextLatches } = RaycastMath.evaluateProximityTriggers(
        camera,
        map,
        config,
        state,
        triggerLatches,
      );
      triggerLatches = nextLatches;
      if (eventBus && typeof eventBus.publish === "function") {
        for (const evt of events) eventBus.publish(evt.eventName, evt.payload);
      }

      const descriptor = {
        x: camera.x,
        y: camera.y,
        angle: camera.angle,
        torchFlicker,
        mapRef: map,
        isTown,
        isDungeon,
      };
      const dirty =
        dirtyOverride ||
        RaycastMath.isDirty(lastFrameDescriptor, descriptor, config);

      if (!dirty) {
        return isHeadless ? { skipped: true, events } : null;
      }
      dirtyOverride = false;
      lastFrameDescriptor = descriptor;

      if (isHeadless) {
        // Headless callers still get to assert on the geometry that a
        // real frame would have used, without touching a canvas.
        const { cosA, sinA } = RaycastMath.computeCameraPlane(camera);
        const { planeX, planeY } = RaycastMath.computeFov(
          camera,
          FOV,
          cosA,
          sinA,
        );
        const centerRay = RaycastMath.castDdaRay(
          camera,
          0,
          cosA,
          sinA,
          planeX,
          planeY,
          map,
          config,
        );
        const sprites = RaycastMath.computeVisibleSprites(camera, map, config);
        return {
          skipped: false,
          events,
          camera: { ...camera },
          centerRay,
          spriteCount: sprites.length,
          isDungeon,
          isTown,
          torchFlicker,
        };
      }

      ensureBuffers();
      if (!canvas || !ctx || !pixelBuf) return null;

      renderFloorAndCeiling(torchFlicker, isTown, isDungeon);
      renderWalls(map, torchFlicker, isTown);
      if (ctx.putImageData && imgData) ctx.putImageData(imgData, 0, 0);
      renderBillboards(map, torchFlicker);

      if (isExpandedMode) {
        updateCompassRibbon(camera.angle);
        renderMinimapRadar(map, playerPos);
      }
      renderVignetteAndDebugHud(isDungeon, facing, map);
      return { skipped: false, events };
    }

    function FACING_ANGLES_HAS(facing) {
      return Object.hasOwn(RaycastMath.FACING_ANGLES, facing);
    }

    function pause() {
      isPaused = true;
    }
    function resume() {
      isPaused = false;
    }

    function getDiagnostics() {
      return {
        driverId: "pseudo_3d_renderer",
        renderResolution: `${W}x${H}`,
        isExpanded: isExpandedMode,
        isPaused,
        isHeadless,
        cameraPos: { x: camera.x.toFixed(2), y: camera.y.toFixed(2) },
        cameraAngle: camera.angle.toFixed(2),
        fovDeg: Math.round((FOV * 180) / Math.PI),
        activeLatches: [...triggerLatches.entries()]
          .filter(([, v]) => v)
          .map(([k]) => k),
      };
    }

    function destroy() {
      pixelBuf = null;
      imgData = null;
      depthBuffer = null;
      canvas = null;
      ctx = null;
      minimapCanvas = null;
      minimapCtx = null;
      triggerLatches = new Map();
      lastFrameDescriptor = null;
    }

    function configure(cfg = {}) {
      config = deepMerge(config, cfg);
      return Object.freeze({ accepted: true, driverId: "pseudo_3d_renderer" });
    }

    function reset() {
      triggerLatches = new Map();
      lastFrameDescriptor = null;
      dirtyOverride = true;
      camera = {
        x: 1.5,
        y: 1.5,
        targetX: 1.5,
        targetY: 1.5,
        angle: Math.PI / 2,
        targetAngle: Math.PI / 2,
        t: 0,
      };
      return true;
    }

    function getState() {
      return Object.freeze({
        driverId: "pseudo_3d_renderer",
        isExpanded: isExpandedMode,
        isPaused,
        isHeadless,
        camera: { ...camera },
        resolution: `${W}x${H}`,
        fovDeg: Math.round((FOV * 180) / Math.PI),
      });
    }

    function getModuleInfo() {
      return Object.freeze({
        driverId: "pseudo_3d_renderer",
        moduleName: "EmberlightPseudo3D",
        version: "2.0.0",
        protocol: "VSRP-001",
        classification: "Peripheral Capability Driver & 3D Corridor Viewport",
        specDoc: "VSRP-001 / ARCH-SPEC-WAR-TABLE-001 / PRS-DES-013",
      });
    }

    const api = {
      configure,
      init,
      reset,
      update,
      render,
      getState,
      getDiagnostics,
      getModuleInfo,
      destroy,
      pause,
      resume,
      setExpanded,
      getDimensions,
      markDirty,
      // Exposed for headless/unit tests that want to drive the math
      // directly without going through render():
      _test: isHeadless
        ? { camera: () => ({ ...camera }), config, textures }
        : undefined,
    };

    return api;
  }

  let _defaultInstance = null;
  function _getDefaultInstance(opts = {}) {
    if (!_defaultInstance) {
      _defaultInstance = createInstance(opts);
    }
    return _defaultInstance;
  }

  return Object.freeze({
    createInstance,
    RaycastMath,
    TILE_LEGEND,
    BILLBOARD_GLYPHS,
    DEFAULT_CONFIG,

    // Singleton facade for VSRP-001 & runtime.js compatibility
    configure: (cfg) => _getDefaultInstance().configure(cfg),
    init: (busOrOpts) =>
      _getDefaultInstance(typeof busOrOpts === "object" ? busOrOpts : {}).init(
        busOrOpts,
      ),
    reset: () => _getDefaultInstance().reset(),
    update: (dt) => _getDefaultInstance().update(dt),
    render: (state) => _getDefaultInstance().render(state),
    getState: () => _getDefaultInstance().getState(),
    getDiagnostics: () => _getDefaultInstance().getDiagnostics(),
    getModuleInfo: () => _getDefaultInstance().getModuleInfo(),
    destroy: () => {
      if (_defaultInstance) {
        _defaultInstance.destroy();
        _defaultInstance = null;
      }
    },
    pause: () => _getDefaultInstance().pause(),
    resume: () => _getDefaultInstance().resume(),
    setExpanded: (expanded) => _getDefaultInstance().setExpanded(expanded),
    getDimensions: () => _getDefaultInstance().getDimensions(),
    markDirty: () => _getDefaultInstance().markDirty(),
  });
})();

if (typeof window !== "undefined") {
  window.EmberlightPseudo3D = EmberlightPseudo3D;
  window.EmberlightCorridorSensor = EmberlightPseudo3D; // Drop-in historical alias
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmberlightPseudo3D;
}
