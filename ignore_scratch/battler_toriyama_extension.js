/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: TORIYAMA PROTOCOL SPRITE EXTENSIONS
 * Document Identifier: ARCH-SPEC-TORIYAMA-SPRITES-001
 * Governing Protocol:  VSRP-001 / TORIYAMA KINETIC PROTOCOL
 * Authority:           Procedural Kinetic Character Bakers
 * ============================================================================
 */
const ToriyamaSpriteExtension = (() => {
    'use strict';

    /**
     * Renders the "GOKU-INSP" Sovereign Martial Artist Archetype (Instant Silhouette Readability).
     * Applies extreme focal foreshortening and spiked kinetic hair geometry.
     */
    function drawSovereignMartialArtist(ctx) {
        // Ground impact stress lines (Environmental Displacement)
        ctx.save();
        ctx.strokeStyle = '#26303b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(S(12), S(58)); ctx.lineTo(S(22), S(61));
        ctx.moveTo(S(40), S(61)); ctx.lineTo(S(52), S(58));
        ctx.stroke();
        ctx.restore();

        // Dynamic Wedge Torso (Trapezoidal mass concentration)
        poly(ctx, [
            [20, 26], [44, 26], [48, 48], [16, 48]
        ], '#991b1b'); // Vibrant Orange/Red Gi

        // Inner Dark Layer (Lived-in asymmetry)
        poly(ctx, [
            [26, 26], [38, 26], [35, 48], [29, 48]
        ], '#4c1117');

        // Spiked Kinetic Hair Cluster (The Silhouette Law)
        poly(ctx, [
            [18, 16], [10, 4], [24, 11], [32, 2], [40, 10], [54, 3], [44, 15], [50, 22], [32, 25], [14, 22]
        ], '#11131a'); // Dark jagged spikes

        poly(ctx, [
            [20, 15], [13, 6], [25, 10], [32, 4], [39, 10], [51, 5], [42, 14], [48, 20], [32, 23], [16, 20]
        ], '#11131a'); // Inner spike density

        // Toriyama Signature Wide Wristbands & Fierce Expression
        rect(ctx, 14, 44, 6, 6, '#1d4ed8');
        rect(ctx, 44, 44, 6, 6, '#1d4ed8');
    }

    /**
     * Renders the "VEGETA-INSP" Elite Prince Archetype (Sharp Angular Geometry & Guard Stance).
     */
    function drawElitePrince(ctx) {
        // High-angled armored shoulders (Rule 1 & Rule 3)
        poly(ctx, [
            [18, 28], [46, 28], [50, 46], [14, 46]
        ], '#292d33'); // Armor Chestplate Base

        poly(ctx, [
            [22, 28], [42, 28], [40, 44], [24, 44]
        ], '#d6dbe1'); // High-contrast steel plating

        // Widow's Peak / Sharp Widened Hair Clustered Stacks
        poly(ctx, [
            [22, 18], [18, 6], [26, 12], [32, 3], [38, 12], [46, 6], [42, 18], [48, 24], [32, 26], [16, 24]
        ], '#11131a');

        // Angled aggressive brow and scowl lines
        rect(ctx, 27, 16, 10, 5, '#e6a66b');
        line(ctx, [[28, 17], [33, 19]], '#080a0f', 1.5);
        line(ctx, [[36, 17], [31, 19]], '#080a0f', 1.5);
    }

    /**
     * Renders the "FRIEZA-INSP" Biomechanical Overlord (Negative Space Dominance & Sleek Biomech Carapace).
     */
    function drawBiomechanicalOverlord(ctx) {
        // Sleek bio-armor chassis with extreme negative space tapering
        poly(ctx, [
            [22, 24], [42, 24], [45, 42], [38, 56], [26, 56], [19, 42]
        ], '#e9d5ff'); // White carapace base

        // Purple organic gems and joint pods
        ellipse(ctx, 32, 32, 6, 4, '#6d28d9');
        ellipse(ctx, 32, 45, 5, 3.5, '#6d28d9');

        // Horned Sleek Cranium
        poly(ctx, [
            [26, 18], [14, 8], [22, 14], [32, 4], [42, 14], [50, 8], [38, 18]
        ], '#6d28d9');

        // Elongated Sweeping Horns
        line(ctx, [[22, 12], [10, 6]], '#ffffff', 2.5);
        line(ctx, [[42, 12], [54, 6]], '#ffffff', 2.5);
    }

    return Object.freeze({
        SOVEREIGN_MARTIAL_ARTIST: drawSovereignMartialArtist,
        ELITE_PRINCE: drawElitePrince,
        BIOMECHANICAL_OVERLORD: drawBiomechanicalOverlord
    });
})();