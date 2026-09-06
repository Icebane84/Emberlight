/* =========================================================================
   PERIPHERAL DRIVER: CINEMATIC MAP CANVAS & TILE RENDERER (VSRP-001 COMPLIANT)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-MAP-RENDERER-COMPLIANT
   Protocol Version:    VSRP-001 / PMIP-001 / ARCH-001-EMBERLIGHT / PRS-001
   Classification:      Tier-3 Presentation Peripheral Driver & Viewport Subsystem
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightMapRenderer = (() => {
  const TILE_SIZE = 32;
  const VIEW_WIDTH = 480;
  const VIEW_HEIGHT = 320;

  // Lifecycle & Configuration State
  let configured = false;
  let config = Object.freeze({});
  let initialized = false;

  let canvas = null;
  let ctx = null;
  let animFrameId = null;
  let lastTimestamp = 0;
  let globalTime = 0;

  // Cached Snapshot & Dispatch Hook
  let currentSnapshot = null;
  let actionDispatch = null;
  let eventBusRef = null;

  // Damped Camera State (World Pixels)
  const camera = {
    x: 48,
    y: 48,
    targetX: 48,
    targetY: 48,
    damping: 0.18,
  };

  // Zero-Allocation Sprite Cache
  const spriteAtlas = new Map();

  function getCachedSprite(phenotype, facing, frame, weapon, armor) {
    const key = `${phenotype}_${facing}_${frame}_${weapon || "NONE"}_${armor || "NONE"}`;
    if (spriteAtlas.has(key)) {
      return spriteAtlas.get(key);
    }

    const spriteUrl =
      typeof EmberlightSpriteBaker !== "undefined" &&
        typeof EmberlightSpriteBaker.get === "function"
        ? EmberlightSpriteBaker.get(phenotype, { facing, frame, weapon, armor })
        : null;

    if (!spriteUrl || typeof Image === "undefined") return null;

    const img = new Image();
    img.src = spriteUrl;
    spriteAtlas.set(key, img);
    return img;
  }

  // Procedural Tile Cache
  const tileAtlas = new Map();

  function createOffscreenCanvas(w = TILE_SIZE, h = TILE_SIZE) {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function bakeTerrainTextures() {
    if (typeof document === "undefined") return;

    // A. Cobblestone Path (.)
    const cobbleCanvas = createOffscreenCanvas();
    if (cobbleCanvas) {
      const cctx = cobbleCanvas.getContext("2d");
      if (cctx) {
        cctx.fillStyle = "#0a0a14";
        cctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        const stones = [
          {
            x: 1,
            y: 1,
            w: 14,
            h: 9,
            col: "#1a1a2e",
            hi: "#2d2d4f",
            sh: "#0f0f1c",
          },
          {
            x: 16,
            y: 1,
            w: 15,
            h: 11,
            col: "#202038",
            hi: "#36365c",
            sh: "#121221",
          },
          {
            x: 2,
            y: 11,
            w: 13,
            h: 10,
            col: "#161626",
            hi: "#282845",
            sh: "#0d0d17",
          },
          {
            x: 16,
            y: 13,
            w: 14,
            h: 9,
            col: "#1d1d33",
            hi: "#303054",
            sh: "#10101d",
          },
          {
            x: 1,
            y: 22,
            w: 14,
            h: 9,
            col: "#22223b",
            hi: "#38385e",
            sh: "#131322",
          },
          {
            x: 16,
            y: 23,
            w: 15,
            h: 8,
            col: "#181829",
            hi: "#2a2a47",
            sh: "#0e0e19",
          },
        ];
        stones.forEach((s) => {
          cctx.fillStyle = s.col;
          cctx.fillRect(s.x, s.y, s.w, s.h);
          cctx.fillStyle = s.hi;
          cctx.fillRect(s.x, s.y, s.w, 1);
          cctx.fillRect(s.x, s.y, 1, s.h);
          cctx.fillStyle = s.sh;
          cctx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
          cctx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
        });
        tileAtlas.set("PATH", cobbleCanvas);
      }
    }

    // B. Mountain Bedrock Wall (#)
    const wallCanvas = createOffscreenCanvas();
    if (wallCanvas) {
      const wctx = wallCanvas.getContext("2d");
      if (wctx) {
        wctx.fillStyle = "#0e0e1a";
        wctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        wctx.fillStyle = "#06060c";
        wctx.fillRect(0, 26, TILE_SIZE, 6);
        wctx.strokeStyle = "#22223b";
        wctx.lineWidth = 1.5;
        wctx.beginPath();
        wctx.moveTo(0, 7);
        wctx.lineTo(12, 11);
        wctx.lineTo(24, 5);
        wctx.lineTo(32, 9);
        wctx.moveTo(0, 17);
        wctx.lineTo(16, 21);
        wctx.lineTo(28, 15);
        wctx.lineTo(32, 18);
        wctx.stroke();
        wctx.fillStyle = "#3a3a5c";
        wctx.fillRect(6, 4, 2, 2);
        wctx.fillRect(22, 12, 3, 2);
        wctx.fillRect(14, 23, 2, 2);
        tileAtlas.set("WALL", wallCanvas);
      }
    }

    // C. Water (~) [4 Frames]
    for (let f = 0; f < 4; f++) {
      const waterCanvas = createOffscreenCanvas();
      if (waterCanvas) {
        const wctx = waterCanvas.getContext("2d");
        if (wctx) {
          wctx.fillStyle = "#020611";
          wctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          const shift = (f / 4) * Math.PI * 2;
          wctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
          wctx.lineWidth = 1.5;
          wctx.beginPath();
          for (let x = 0; x < TILE_SIZE; x++) {
            const y = 8 + Math.sin(x / 6 + shift) * 2.5;
            if (x === 0) wctx.moveTo(x, y);
            else wctx.lineTo(x, y);
          }
          wctx.stroke();
          wctx.strokeStyle = "rgba(14, 165, 233, 0.35)";
          wctx.beginPath();
          for (let x = 0; x < TILE_SIZE; x++) {
            const y = 20 + Math.cos(x / 5 + shift) * 2.5;
            if (x === 0) wctx.moveTo(x, y);
            else wctx.lineTo(x, y);
          }
          wctx.stroke();
          tileAtlas.set(`WATER_${f}`, waterCanvas);
        }
      }
    }

    // D. Tall Grass (") [2 Frames]
    for (let f = 0; f < 2; f++) {
      const grassCanvas = createOffscreenCanvas();
      if (grassCanvas) {
        const gctx = grassCanvas.getContext("2d");
        if (gctx) {
          gctx.fillStyle = "#061008";
          gctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          const sway = f === 0 ? 0 : 2.5;
          gctx.strokeStyle = "#22c55e";
          gctx.lineWidth = 1.5;
          const tufts = [
            { x: 6, y: 24, h: 12 },
            { x: 13, y: 28, h: 14 },
            { x: 21, y: 22, h: 13 },
            { x: 27, y: 26, h: 10 },
          ];
          tufts.forEach((t) => {
            gctx.beginPath();
            gctx.moveTo(t.x, t.y);
            gctx.quadraticCurveTo(
              t.x + sway,
              t.y - t.h * 0.5,
              t.x + sway * 1.5,
              t.y - t.h,
            );
            gctx.stroke();
          });
          tileAtlas.set(`GRASS_${f}`, grassCanvas);
        }
      }
    }

    // E. Ice (=)
    const iceCanvas = createOffscreenCanvas();
    if (iceCanvas) {
      const ictx = iceCanvas.getContext("2d");
      if (ictx) {
        ictx.fillStyle = "#091524";
        ictx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        ictx.strokeStyle = "rgba(186, 230, 253, 0.5)";
        ictx.lineWidth = 1.2;
        ictx.beginPath();
        ictx.moveTo(4, 8);
        ictx.lineTo(16, 16);
        ictx.lineTo(28, 12);
        ictx.moveTo(8, 24);
        ictx.lineTo(20, 20);
        ictx.lineTo(26, 28);
        ictx.stroke();
        tileAtlas.set("ICE", iceCanvas);
      }
    }

    // F. Miasma (%)
    const miasmaCanvas = createOffscreenCanvas();
    if (miasmaCanvas) {
      const mctx = miasmaCanvas.getContext("2d");
      if (mctx) {
        mctx.fillStyle = "#12071a";
        mctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        mctx.fillStyle = "rgba(192, 132, 252, 0.3)";
        mctx.beginPath();
        mctx.arc(16, 16, 13, 0, Math.PI * 2);
        mctx.fill();
        tileAtlas.set("MIASMA", miasmaCanvas);
      }
    }
  }

  // Atmospheric Particle Pool (Deterministic LCG Pseudo-Noise)
  const PARTICLE_COUNT = 64;
  const particlePool = new Float32Array(PARTICLE_COUNT * 7);
  let particleNoiseSeed = 1337;

  function nextParticleFloat() {
    particleNoiseSeed = (particleNoiseSeed * 1664525 + 1013904223) >>> 0;
    return particleNoiseSeed / 4294967296;
  }

  function initParticles() {
    particleNoiseSeed = 1337;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 7;
      const type =
        nextParticleFloat() > 0.6 ? (nextParticleFloat() > 0.5 ? 2 : 1) : 0;
      particlePool[idx] = (nextParticleFloat() - 0.5) * 600;
      particlePool[idx + 1] = (nextParticleFloat() - 0.5) * 400;
      particlePool[idx + 2] = (nextParticleFloat() - 0.5) * 12;
      particlePool[idx + 3] =
        type === 0
          ? -8 - nextParticleFloat() * 10
          : -2 - nextParticleFloat() * 4;
      particlePool[idx + 4] =
        type === 0
          ? 1.5 + nextParticleFloat() * 2
          : 1 + nextParticleFloat() * 1.5;
      particlePool[idx + 5] = 0.2 + nextParticleFloat() * 0.6;
      particlePool[idx + 6] = type;
    }
  }

  function updateAndRenderAtmosphere(ctx, w, h, dt) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 7;
      const type = particlePool[idx + 6];

      const drift = Math.sin(globalTime * 2 + i) * 15 * dt;
      particlePool[idx] += (particlePool[idx + 2] + drift) * dt;
      particlePool[idx + 1] += particlePool[idx + 3] * dt;

      if (particlePool[idx + 1] < -h / 2) {
        particlePool[idx + 1] = h / 2;
        particlePool[idx] = (nextParticleFloat() - 0.5) * w;
      }
      if (particlePool[idx] < -w / 2) particlePool[idx] = w / 2;
      if (particlePool[idx] > w / 2) particlePool[idx] = -w / 2;

      const screenX = w / 2 + particlePool[idx];
      const screenY = h / 2 + particlePool[idx + 1];
      const size = particlePool[idx + 4];

      ctx.globalAlpha =
        particlePool[idx + 5] * (0.8 + Math.sin(globalTime * 4 + i) * 0.2);

      if (type === 0) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(screenX, screenY, size, size);
      } else if (type === 1) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(screenX, screenY, size * 0.8, size * 0.8);
      } else {
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Raycast Line of Sight
  function computeLineOfSight(map, px, py, radius = 7) {
    const visible = new Set();
    const height = map.length;
    if (height === 0) return visible;
    const width = map[0].length;

    visible.add(`${px},${py}`);

    const steps = 48;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let cx = px + 0.5;
      let cy = py + 0.5;

      for (let step = 0; step < radius * 2; step++) {
        cx += dx * 0.5;
        cy += dy * 0.5;
        const tx = Math.floor(cx);
        const ty = Math.floor(cy);

        if (tx < 0 || tx >= width || ty < 0 || ty >= height) break;
        visible.add(`${tx},${ty}`);

        if (map[ty][tx] === "#") {
          break;
        }
      }
    }
    return visible;
  }

  function renderDynamicLighting(ctx, w, h, playerScreenX, playerScreenY) {
    if (typeof ctx.createRadialGradient !== "function") return;

    const lanternGlow = ctx.createRadialGradient(
      playerScreenX + 14,
      playerScreenY + 14,
      12,
      playerScreenX + 14,
      playerScreenY + 14,
      140,
    );
    lanternGlow.addColorStop(0, "rgba(245, 158, 11, 0.22)");
    lanternGlow.addColorStop(0.5, "rgba(245, 158, 11, 0.08)");
    lanternGlow.addColorStop(1, "rgba(4, 4, 12, 0)");

    ctx.fillStyle = lanternGlow;
    ctx.fillRect(0, 0, w, h);
  }

  function attachCanvasInteractions(targetCanvas) {
    if (
      !targetCanvas ||
      targetCanvas._eventsAttached ||
      typeof targetCanvas.addEventListener !== "function"
    )
      return;

    targetCanvas.addEventListener("mousemove", (e) => {
      if (!currentSnapshot || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const offsetX = Math.floor(rect.width / 2 - camera.x);
      const offsetY = Math.floor(rect.height / 2 - camera.y);

      const tileX = Math.floor((mouseX - offsetX) / TILE_SIZE);
      const tileY = Math.floor((mouseY - offsetY) / TILE_SIZE);

      const map = currentSnapshot.map || [];
      if (
        tileY >= 0 &&
        tileY < map.length &&
        tileX >= 0 &&
        tileX < (map[0]?.length || 0)
      ) {
        const tileType = map[tileY][tileX];
        const isPlayer =
          tileX === currentSnapshot.playerPos?.x &&
          tileY === currentSnapshot.playerPos?.y;
        const bus =
          eventBusRef ||
          (typeof EventBus !== "undefined" ? EventBus : null) ||
          (typeof window !== "undefined" ? window.EventBus : null);
        if (bus && typeof bus.publish === "function") {
          bus.publish("overworld:hover_tile", {
            x: tileX,
            y: tileY,
            tileType,
            isPlayer,
            isClear: false,
          });
        }
      }
    });

    targetCanvas.addEventListener("mouseleave", () => {
      const bus =
        eventBusRef ||
        (typeof EventBus !== "undefined" ? EventBus : null) ||
        (typeof window !== "undefined" ? window.EventBus : null);
      if (bus && typeof bus.publish === "function") {
        bus.publish("overworld:hover_tile", { isClear: true });
      }
    });

    targetCanvas.addEventListener("click", () => {
      const bus =
        eventBusRef ||
        (typeof EventBus !== "undefined" ? EventBus : null) ||
        (typeof window !== "undefined" ? window.EventBus : null);
      if (bus && typeof bus.publish === "function") {
        bus.publish("input:action", { action: "CONFIRM" });
      }
      if (typeof actionDispatch === "function") {
        actionDispatch({ type: "CONFIRM" });
      }
    });

    targetCanvas._eventsAttached = true;
  }

  function ensureCanvas() {
    if (typeof document === "undefined") return;
    if (canvas?.parentElement) return;

    const wrapper = document.getElementById("overworld-grid-wrapper");
    if (!wrapper) return;

    wrapper.style.position = "relative";
    wrapper.style.overflow = "hidden";

    const legacyGrid = document.getElementById("overworld-grid");
    if (legacyGrid) legacyGrid.style.display = "none";

    canvas = document.getElementById("map-renderer-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "map-renderer-canvas";
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.imageRendering = "pixelated";
      wrapper.appendChild(canvas);
    }

    ctx = canvas.getContext("2d");
    attachCanvasInteractions(canvas);
    resize();
  }

  function resize() {
    if (!canvas?.parentElement || !ctx) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = Math.max(VIEW_WIDTH, Math.floor(rect.width || VIEW_WIDTH));
    const h = Math.max(VIEW_HEIGHT, Math.floor(rect.height || VIEW_HEIGHT));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    if (typeof ctx.setTransform === "function") {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  function updateThreatGauge(snapshot) {
    if (typeof document === "undefined") return;
    const threatBar = document.getElementById("overworld-threat-gauge");
    if (threatBar) {
      const threatPct = Math.min(
        100,
        Math.round(((snapshot.dangerSteps || 0) / 5) * 100),
      );
      threatBar.style.width = `${threatPct}%`;
      threatBar.style.backgroundColor =
        threatPct > 60 ? "var(--danger)" : "var(--ember)";
    }
  }

  function updateCatacombMode(snapshot) {
    if (typeof document === "undefined") return;
    const isCatacombs = Boolean(
      (snapshot.dungeonDepth && snapshot.dungeonDepth > 0) ||
      (snapshot.depth && snapshot.depth > 0),
    );
    const gridWrapper = document.getElementById("overworld-grid-wrapper");
    if (gridWrapper) {
      gridWrapper.classList.toggle("catacomb-mode", isCatacombs);
    }
  }

  function renderMapFrame(dt = 0.016) {
    if (!canvas || !ctx || !currentSnapshot) return;
    const rect = canvas.parentElement?.getBoundingClientRect() || {
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
    };
    const w = rect.width || VIEW_WIDTH;
    const h = rect.height || VIEW_HEIGHT;

    const map = currentSnapshot.map || [];
    const playerPos = currentSnapshot.playerPos ||
      currentSnapshot.pos || { x: 1, y: 1 };
    const facing = currentSnapshot.facing || "DOWN";
    const avatar = currentSnapshot.avatar || {
      phenotype: "HERO",
      weapon: "IRON_SWORD",
      armor: null,
    };
    const entities = currentSnapshot.entities || currentSnapshot.monsters || [];

    const mapRows = map.length || 32;
    const mapCols = map[0]?.length || 48;
    const worldPixelWidth = mapCols * TILE_SIZE;
    const worldPixelHeight = mapRows * TILE_SIZE;

    camera.targetX = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
    camera.targetY = playerPos.y * TILE_SIZE + TILE_SIZE / 2;
    camera.x += (camera.targetX - camera.x) * camera.damping;
    camera.y += (camera.targetY - camera.y) * camera.damping;

    const halfViewW = w / 2;
    const halfViewH = h / 2;

    let clampedCamX = camera.x;
    let clampedCamY = camera.y;

    if (worldPixelWidth > w) {
      clampedCamX = Math.max(
        halfViewW,
        Math.min(worldPixelWidth - halfViewW, camera.x),
      );
    }
    if (worldPixelHeight > h) {
      clampedCamY = Math.max(
        halfViewH,
        Math.min(worldPixelHeight - halfViewH, camera.y),
      );
    }

    const offsetX = Math.floor(halfViewW - clampedCamX);
    const offsetY = Math.floor(halfViewH - clampedCamY);

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#020206";
    ctx.fillRect(0, 0, w, h);

    const visibleTiles = computeLineOfSight(map, playerPos.x, playerPos.y, 7);

    const waterFrame = Math.floor(globalTime * 6) % 4;
    const grassFrame = Math.floor(globalTime * 3) % 2;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const screenX = offsetX + x * TILE_SIZE;
        const screenY = offsetY + y * TILE_SIZE;

        if (
          screenX < -TILE_SIZE ||
          screenX > w ||
          screenY < -TILE_SIZE ||
          screenY > h
        ) {
          continue;
        }

        const isVisible = visibleTiles.has(`${x},${y}`);
        const tile = map[y][x];
        let tileImg = null;

        if (tile === ".") tileImg = tileAtlas.get("PATH");
        else if (tile === "#") tileImg = tileAtlas.get("WALL");
        else if (tile === "~") tileImg = tileAtlas.get(`WATER_${waterFrame}`);
        else if (tile === '"') tileImg = tileAtlas.get(`GRASS_${grassFrame}`);
        else if (tile === "=") tileImg = tileAtlas.get("ICE");
        else if (tile === "%") tileImg = tileAtlas.get("MIASMA");
        else tileImg = tileAtlas.get("PATH");

        if (tileImg) {
          ctx.drawImage(tileImg, screenX, screenY, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = "#0c0c16";
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tile === "C") {
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(
            screenX + 16,
            screenY + 16,
            7 + Math.sin(globalTime * 8) * 2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else if (tile === "$") {
          ctx.fillStyle = "#d97706";
          ctx.fillRect(screenX + 8, screenY + 10, 16, 12);
          ctx.strokeStyle = "#fbbf24";
          ctx.strokeRect(screenX + 8, screenY + 10, 16, 12);
        } else if (tile === ">") {
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(screenX + 6, screenY + 6, 20, 20);
          ctx.strokeStyle = "#a855f7";
          ctx.strokeRect(screenX + 6, screenY + 6, 20, 20);
        }

        if (!isVisible) {
          ctx.fillStyle = "rgba(2, 2, 8, 0.82)";
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    if (currentSnapshot.activeQuestTarget) {
      const qTarget = currentSnapshot.activeQuestTarget;
      const qScreenX = offsetX + qTarget.x * TILE_SIZE + 16;
      const qScreenY = offsetY + qTarget.y * TILE_SIZE + 16;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.5;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([4, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(qScreenX, qScreenY);
      ctx.stroke();
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([]);
      }
    }

    const drawList = [];
    const pScreenX = Math.floor(offsetX + playerPos.x * TILE_SIZE + 2);
    const pScreenY = Math.floor(offsetY + playerPos.y * TILE_SIZE - 2);

    drawList.push({
      y: pScreenY + 28,
      render: () => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.ellipse(pScreenX + 14, pScreenY + 28, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const heroImg = getCachedSprite(
          avatar.phenotype || "HERO",
          facing,
          currentSnapshot.stepAnimFrame || 0,
          avatar.weapon,
          avatar.armor,
        );
        if (heroImg?.complete) {
          ctx.drawImage(heroImg, pScreenX, pScreenY, 28, 28);
        } else {
          ctx.fillStyle = "#ff9d4d";
          ctx.fillRect(pScreenX + 6, pScreenY + 6, 16, 16);
        }
      },
    });

    entities.forEach((ent) => {
      if (!visibleTiles.has(`${ent.x},${ent.y}`)) return;
      const eScreenX = Math.floor(offsetX + ent.x * TILE_SIZE + 2);
      const eScreenY = Math.floor(offsetY + ent.y * TILE_SIZE - 2);
      drawList.push({
        y: eScreenY + 28,
        render: () => {
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.beginPath();
          ctx.ellipse(eScreenX + 14, eScreenY + 28, 8, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = ent.color || "#ef4444";
          ctx.fillRect(eScreenX + 6, eScreenY + 6, 16, 16);
        },
      });
    });

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) {
      item.render();
    }

    renderDynamicLighting(ctx, w, h, pScreenX, pScreenY);
    updateAndRenderAtmosphere(ctx, w, h, dt);

    if (typeof ctx.createRadialGradient === "function") {
      const vignette = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.35,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75,
      );
      vignette.addColorStop(0, "rgba(4, 4, 12, 0)");
      vignette.addColorStop(0.7, "rgba(4, 4, 12, 0.35)");
      vignette.addColorStop(1, "rgba(2, 2, 8, 0.88)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function tick(timestamp) {
    const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000) || 0.016;
    lastTimestamp = timestamp;
    globalTime += dt;

    renderMapFrame(dt);

    if (typeof requestAnimationFrame !== "undefined") {
      animFrameId = requestAnimationFrame(tick);
    }
  }

  // =========================================================================
  // CANONICAL VSRP-001 9-METHOD CONTRACT IMPLEMENTATION
  // =========================================================================

  return {
    configure(options = {}) {
      config = Object.freeze({ ...config, ...options });
      configured = true;
      return Object.freeze({ accepted: true, driverId: "map_renderer" });
    },

    init(context) {
      if (!configured) {
        configured = true;
      }
      if (initialized) return;

      if (context) {
        if (context.eventBus) {
          eventBusRef = context.eventBus;
        } else if (typeof context.publish === "function") {
          eventBusRef = context;
        }
      }
      bakeTerrainTextures();
      initParticles();
      ensureCanvas();

      if (
        typeof window !== "undefined" &&
        typeof window.addEventListener === "function"
      ) {
        window.addEventListener("resize", resize);
      }
      if (!animFrameId && typeof requestAnimationFrame !== "undefined") {
        animFrameId = requestAnimationFrame(tick);
      }
      initialized = true;
    },

    reset(snapshot = null) {
      if (!snapshot) {
        currentSnapshot = null;
      } else if (typeof structuredClone === "function") {
        currentSnapshot = structuredClone(snapshot);
      } else {
        currentSnapshot = structuredClone(snapshot);
      }
      globalTime = 0;
      camera.x = 48;
      camera.y = 48;
      camera.targetX = 48;
      camera.targetY = 48;
    },

    update(dt) {
      // Tier-3 presentation local visual update (camera damping, particles)
      globalTime += dt || 0.016;
    },

    render(snapshot, dispatch) {
      this.renderOverworld(snapshot, dispatch);
    },

    renderOverworld(snapshot, dispatch) {
      if (!snapshot) return;
      currentSnapshot = snapshot;
      actionDispatch = dispatch;
      ensureCanvas();
      updateThreatGauge(snapshot);
      updateCatacombMode(snapshot);
      if (ctx) {
        renderMapFrame(0.016);
      }
    },

    getState() {
      if (!currentSnapshot) return null;
      return typeof structuredClone === "function"
        ? structuredClone(currentSnapshot)
        : structuredClone(currentSnapshot);
    },

    getDiagnostics() {
      return {
        driverId: "overworld_renderer",
        protocolVersion: "VSRP-001",
        configured,
        initialized,
        cameraPos: { x: +camera.x.toFixed(1), y: +camera.y.toFixed(1) },
        cachedAtlasTiles: tileAtlas.size,
        cachedSprites: spriteAtlas.size,
        activeAtmosphericParticles: PARTICLE_COUNT,
        hasCanvas: Boolean(canvas),
      };
    },

    getModuleInfo() {
      return {
        moduleId: "EmberlightMapRenderer",
        version: "2.1.0",
        protocolVersion: "VSRP-001",
        capabilities: [
          "spatial_viewports",
          "procedural_baking",
          "raycast_los",
          "cinematic_particles",
        ],
      };
    },

    destroy() {
      if (animFrameId && typeof cancelAnimationFrame !== "undefined") {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (
        typeof window !== "undefined" &&
        typeof window.removeEventListener === "function"
      ) {
        window.removeEventListener("resize", resize);
      }
      if (canvas?.parentElement && typeof canvas.remove === "function") {
        canvas.remove();
      }
      canvas = null;
      ctx = null;
      currentSnapshot = null;
      actionDispatch = null;
      eventBusRef = null;
      tileAtlas.clear();
      spriteAtlas.clear();
      initialized = false;
      configured = false;
    },
  };
})();

if (typeof window !== "undefined") {
  window.EmberlightMapRenderer = EmberlightMapRenderer;
  window.EmberlightOverworldRenderer = EmberlightMapRenderer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = EmberlightMapRenderer;
}
