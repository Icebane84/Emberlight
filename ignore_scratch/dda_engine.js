/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: HIGH-FIDELITY DDA RAYCASTER (TIER 2)
 * Document Identifier: ARCH-SPEC-DDA-RAYCASTER-001
 * Governing Protocol:  VSRP-001 / PRS-DES-013
 * Authority:           Zero-Dependency Single-Threaded Pseudo-3D Viewport
 * ============================================================================
 */
const EmberlightDDAEngine = (() => {
    'use strict';

    const MODULE_INFO = Object.freeze({
        moduleId: 'dda_engine_core',
        version: '2.0.0',
        protocolVersion: 'VSRP-001',
        capabilities: ['dda_raycasting', 'inline_texturing', 'depth_fog']
    });

    const TEXTURE_SIZE = 32;
    let canvas = null;
    let ctx = null;
    let screenWidth = 320;
    let screenHeight = 200;
    let wallTextureBuffer = null; // Uint32Array backing store

    /**
     * Packs RGBA components into a 32-bit integer pixel for fast blitting.
     */
    const packColor = (r, g, b, a = 255) => (a << 24) | (b << 16) | (g << 8) | r;

    /**
     * Bakes a procedural 32x32 stone brick texture with mortar grooves and noise.
     */
    function generateDefaultTexture() {
        const buffer = new Uint32Array(TEXTURE_SIZE * TEXTURE_SIZE);
        for (let y = 0; y < TEXTURE_SIZE; y++) {
            for (let x = 0; x < TEXTURE_SIZE; x++) {
                const isMortar = y === 0 || y === 15 || y === 31 || 
                                 (y < 16 && x === 0) || (y >= 16 && x === 16);
                if (isMortar) {
                    buffer[y * TEXTURE_SIZE + x] = packColor(15, 15, 22);
                } else {
                    const noise = (x * 7 + y * 13) % 11 - 5;
                    buffer[y * TEXTURE_SIZE + x] = packColor(
                        Math.max(0, 50 + noise),
                        Math.max(0, 55 + noise),
                        Math.max(0, 75 + noise)
                    );
                }
            }
        }
        return buffer;
    }

    return {
        getModuleInfo() { return MODULE_INFO; },

        configure(config) {
            screenWidth = config.width || 320;
            screenHeight = config.height || 200;
            return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
        },

        init(context) {
            if (typeof document === 'undefined') return;
            canvas = document.getElementById(config => config.canvasId) || document.createElement('canvas');
            canvas.width = screenWidth;
            canvas.height = screenHeight;
            ctx = canvas.getContext('2d', { alpha: false });
            wallTextureBuffer = generateDefaultTexture();
        },

        reset() {},

        /**
         * Core DDA Rendering Pass. Traces rays across screen columns and renders textured walls.
         * @param {Object} player - { x: number, y: number, angle: number }
         * @param {string[][]} map - 2D grid matrix
         */
        renderViewport(player, map) {
            if (!ctx) return;

            const imgData = ctx.createImageData(screenWidth, screenHeight);
            const data32 = new Uint32Array(imgData.data.buffer);

            const FOV = 0.66; // Field of view modifier
            const cosA = Math.cos(player.angle);
            const sinA = Math.sin(player.angle);
            const planeX = -sinA * FOV;
            const planeY = cosA * FOV;

            // Clear screen buffer with ceiling (top half) and floor (bottom half)
            const ceilingColor = packColor(12, 14, 24);
            const floorColor = packColor(22, 26, 38);
            for (let i = 0; i < data32.length; i++) {
                data32[i] = i < (data32.length / 2) ? ceilingColor : floorColor;
            }

            // Horizontal Raycasting Column Loop
            for (let x = 0; x < screenWidth; x++) {
                const cameraX = (2 * x) / screenWidth - 1;
                const rayDirX = cosA + planeX * cameraX;
                const rayDirY = sinA + planeY * cameraX;

                let mapX = Math.floor(player.x);
                let mapY = Math.floor(player.y);

                const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
                const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

                let stepX, stepY;
                let sideDistX, sideDistY;

                if (rayDirX < 0) {
                    stepX = -1;
                    sideDistX = (player.x - mapX) * deltaDistX;
                } else {
                    stepX = 1;
                    sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
                }

                if (rayDirY < 0) {
                    stepY = -1;
                    sideDistY = (player.y - mapY) * deltaDistY;
                } else {
                    stepY = 1;
                    sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
                }

                // DDA Execution Loop
                let hit = false;
                let side = 0; // 0 for X-axis hit, 1 for Y-axis hit
                let safetyCounter = 0;

                while (!hit && safetyCounter++ < 64) {
                    if (sideDistX < sideDistY) {
                        sideDistX += deltaDistX;
                        mapX += stepX;
                        side = 0;
                    } else {
                        sideDistY += deltaDistY;
                        mapY += stepY;
                        side = 1;
                    }
                    if (map[mapY] && map[mapY][mapX] && map[mapY][mapX] !== '.') {
                        hit = true;
                    }
                }

                // Calculate Perpendicular Distance to avoid fisheye distortion
                const perpWallDist = side === 0 
                    ? (mapX - player.x + (1 - stepX) / 2) / rayDirX 
                    : (mapY - player.y + (1 - stepY) / 2) / rayDirY;

                const lineHeight = Math.min(screenHeight, Math.floor(screenHeight / (perpWallDist || 1e-6)));
                const drawStart = Math.max(0, Math.floor(-lineHeight / 2 + screenHeight / 2));
                const drawEnd = Math.min(screenHeight - 1, Math.floor(lineHeight / 2 + screenHeight / 2));

                // Texture Mapping Calculations
                let wallX = side === 0 ? player.y + perpWallDist * rayDirY : player.x + perpWallDist * rayDirX;
                wallX -= Math.floor(wallX);
                let texX = Math.floor(wallX * TEXTURE_SIZE);
                if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
                    texX = TEXTURE_SIZE - texX - 1;
                }

                const step = TEXTURE_SIZE / lineHeight;
                let texPos = (drawStart - screenHeight / 2 + lineHeight / 2) * step;

                // Vertical Column Rasterization
                for (let y = drawStart; y <= drawEnd; y++) {
                    const texY = Math.floor(texPos) & (TEXTURE_SIZE - 1);
                    texPos += step;

                    let color = wallTextureBuffer[texY * TEXTURE_SIZE + texX];

                    // Apply shadow tint to Y-side wall cuts for depth definition
                    if (side === 1) {
                        const r = (color & 0xFF) * 0.7;
                        const g = ((color >> 8) & 0xFF) * 0.7;
                        const b = ((color >> 16) & 0xFF) * 0.7;
                        color = packColor(r, g, b);
                    }

                    // Exponential Distance Fog Attenuation
                    const fogFactor = Math.min(1.0, Math.max(0.0, perpWallDist / 12.0));
                    if (fogFactor > 0.0) {
                        const r = Math.floor((color & 0xFF) * (1.0 - fogFactor));
                        const g = Math.floor(((color >> 8) & 0xFF) * (1.0 - fogFactor));
                        const b = Math.floor(((color >> 16) & 0xFF) * (1.0 - fogFactor));
                        color = packColor(r, g, b);
                    }

                    data32[y * screenWidth + x] = color;
                }
            }

            ctx.putImageData(imgData, 0, 0);
        },

        update() {},
        render() {},
        getState() { return Object.freeze({ screenWidth, screenHeight }); },
        getDiagnostics() { return { driver: MODULE_INFO.moduleId }; },
        destroy() {
            canvas = null;
            ctx = null;
            wallTextureBuffer = null;
        }
    };
})();

if (typeof window !== 'undefined') window.EmberlightDDAEngine = EmberlightDDAEngine;