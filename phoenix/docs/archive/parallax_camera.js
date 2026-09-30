/**
 * @file parallax_camera.js
 * @description Zero-Allocation Parallax Background Manager and Camera Viewport Subsystem.
 * Compliant with PSGC-001 Invariants [INV-04], [INV-05], [INV-08], and ERL-HOT-ALLOC.
 * Timestamp: 2026-09-28T11:01:35-04:00
 */

'use strict';

class SovereignCamera {
    /**
     * @param {number} viewportWidth - Virtual screen width (e.g., 1280)
     * @param {number} viewportHeight - Virtual screen height (e.g., 720)
     * @param {number} worldWidth - Total map width in pixels
     * @param {number} worldHeight - Total map height in pixels
     */
    constructor(viewportWidth, viewportHeight, worldWidth, worldHeight) {
        this.x = 0;
        this.y = 0;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.deadzoneX = viewportWidth * 0.25;
        this.deadzoneY = viewportHeight * 0.25;
    }

    /**
     * Updates camera position smoothly tracking a target entity without heap allocation.
     * @param {number} targetX 
     * @param {number} targetY 
     * @param {number} dt - Clamped delta time
     */
    follow(targetX, targetY, dt) {
        // Target centering offset
        const desiredX = targetX - (this.viewportWidth * 0.5);
        const desiredY = targetY - (this.viewportHeight * 0.5);

        // Exponential damping towards target (frame-rate independent)
        const damping = 10.0;
        this.x += (desiredX - this.x) * Math.min(1.0, damping * dt);
        this.y += (desiredY - this.y) * Math.min(1.0, damping * dt);

        // Hard clamping against world boundaries
        const maxX = Math.max(0, this.worldWidth - this.viewportWidth);
        const maxY = Math.max(0, this.worldHeight - this.viewportHeight);
        
        if (this.x < 0) this.x = 0;
        else if (this.x > maxX) this.x = maxX;

        if (this.y < 0) this.y = 0;
        else if (this.y > maxY) this.y = maxY;
    }
}

class ParallaxLayer {
    /**
     * @param {CanvasImageSource} image - Pre-loaded background asset or canvas tile
     * @param {number} scrollFactor - Motion multiplier relative to camera (0 = static, 1 = foreground)
     * @param {number} screenWidth - Virtual viewport width
     * @param {number} screenHeight - Virtual viewport height
     */
    constructor(image, scrollFactor, screenWidth, screenHeight) {
        this.image = image;
        this.scrollFactor = scrollFactor;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.imgWidth = image.width;
        this.imgHeight = image.height;
    }

    /**
     * Renders seamless looping parallax tiles with zero object allocations.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} cameraX 
     * @param {number} cameraY 
     */
    render(ctx, cameraX, cameraY) {
        if (!this.image) return;

        // Calculate scaled dimensions to fit or tile cleanly
        const renderWidth = this.imgWidth;
        const renderHeight = this.screenHeight;

        // Compute modular offset based on camera position and scroll factor
        const scaledCameraX = cameraX * this.scrollFactor;
        const offsetX = -(scaledCameraX % renderWidth);

        let currentX = offsetX;
        while (currentX < this.screenWidth) {
            ctx.drawImage(
                this.image,
                0, 0, this.imgWidth, this.imgHeight,
                currentX, 0, renderWidth, renderHeight
            );
            currentX += renderWidth;
        }
    }
}