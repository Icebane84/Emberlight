/**
 * @file fourier_audio_engine.js
 * @description Zero-Dependency Fourier Series Vector Shape Renderer & FM-Modulated Audio Synthesizer.
 * Compliant with PSGC-001 Invariants [INV-02], [INV-05], [INV-08], and ERL-HOT-ALLOC.
 * Timestamp: 2026-09-29T20:12:00-04:00
 */

'use strict';

class FourierVectorRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Array<{freq: number, amp: number, phase: number}>} harmonics 
     */
    constructor(ctx, harmonics) {
        this.ctx = ctx;
        this.harmonics = harmonics; // Array of harmonic coefficients
        this.time = 0;
    }

    /**
     * Renders epicycles and traced vector path with zero heap allocations in the hot loop.
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} dt - Delta time
     */
    render(cx, cy, dt) {
        this.time += dt * 2.0;
        const ctx = this.ctx;
        
        ctx.beginPath();
        let x = cx;
        let y = cy;

        // Render rotating harmonic circles (epicycles)
        for (let i = 0; i < this.harmonics.length; i++) {
            const h = this.harmonics[i];
            const prevX = x;
            const prevY = y;

            const freq = h.freq;
            const radius = h.amp;
            const phase = h.phase + this.time * freq;

            x += radius * Math.cos(phase);
            y += radius * Math.sin(phase);

            // Draw epicycle ring
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(prevX, prevY, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw arm vector
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Trace final tip path
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class SovereignAudioManager {
    constructor() {
        /** @type {AudioContext|null} */
        this.ctx = null;
    }

    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Synthesizes an FM-modulated sound effect with ADSR envelope (Zero asset files).
     * @param {number} baseFreq 
     * @param {number} modFreq 
     * @param {number} modDepth 
     * @param {number} duration 
     */
    playFMSound(baseFreq, modFreq, modDepth, duration) {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Carrier oscillator
        const carrier = this.ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(baseFreq, now);

        // Modulator oscillator (FM Synthesis for textured noise/grit)
        const modulator = this.ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(modFreq, now);

        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(modDepth, now);
        modGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        // Master Gain with ADSR Envelope
        const masterGain = this.ctx.createGain();
        masterGain.gain.setValueAtTime(0.0, now);
        masterGain.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Decay/Release

        carrier.connect(masterGain);
        masterGain.connect(this.ctx.destination);

        modulator.start(now);
        carrier.start(now);
        modulator.stop(now + duration);
        carrier.stop(now + duration);
    }
}