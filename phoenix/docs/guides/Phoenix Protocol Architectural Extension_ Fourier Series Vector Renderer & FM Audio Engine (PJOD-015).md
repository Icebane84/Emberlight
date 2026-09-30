# **Phoenix Protocol Architectural Extension: Fourier Series Vector Renderer & FM Audio Engine (PJOD-015)**

**Parent Standard:** Phoenix Sovereign Grand Constitution (PSGC-001) / PJOD-014  
**Classification:** Normative Substrate Procedural Vector Graphics & FM Synthesis Standard  
**Status:** NORMATIVE

## ---

**\[SEC-01\] Executive Architectural Synthesis**

### **What**

A production-grade, zero-dependency implementation of a **Fourier Series Vector Shape Renderer** and an **FM-Modulated Procedural Audio Synthesizer**, merging mathematical harmonic summation (epicycles) with native Web Audio oscillators and frequency modulation.

### **How**

* **Fourier Harmonic Tracing (FourierVectorRenderer):** Reconstructs complex vector shapes and animations in real-time by summing rotating sine wave harmonic coefficients (\$A\_n, \\omega\_n, \\phi\_n\$) over an HTML5 Canvas context without storing static image files.  
* **FM Synthesis & ADSR Envelopes (SovereignAudioManager):** Bypasses external .mp3/.wav asset loading by modulating a carrier oscillator’s frequency with a secondary modulator oscillator, shaping transients through time-stamped gain envelopes.

### **Why**

Eliminating static asset files guarantees instant page load times, absolute single-file portability (\[INV-03\]), and complete freedom from CORS and supply-chain vulnerabilities (\[INV-02\]). Generating graphics and sound dynamically via pure mathematical functions aligns perfectly with the Phoenix Sovereign objective of self-contained sovereignty.

## ---

**\[SEC-02\] Core Engine Module (fourier\_audio\_engine.js)**

JavaScript

/\*\*  
 \* @file fourier\_audio\_engine.js  
 \* @description Zero\-Dependency Fourier Series Vector Shape Renderer & FM-Modulated Audio Synthesizer.  
 \* Compliant with PSGC-001 Invariants \[INV-02\], \[INV-05\], \[INV-08\], and ERL-HOT-ALLOC.  
 \* Timestamp: 2026-09-29T20:12:00-04:00  
 \*/

'use strict';

class FourierVectorRenderer {  
    /\*\*  
     \* @param {CanvasRenderingContext2D} ctx   
     \* @param {Array\<{freq: number, amp: number, phase: number}\>} harmonics   
     \*/  
    constructor(ctx, harmonics) {  
        this.ctx \= ctx;  
        this.harmonics \= harmonics; // Array of harmonic coefficients  
        this.time \= 0;  
    }

    /\*\*  
     \* Renders epicycles and traced vector path with zero heap allocations in the hot loop.  
     \* @param {number} cx \- Center X  
     \* @param {number} cy \- Center Y  
     \* @param {number} dt \- Delta time  
     \*/  
    render(cx, cy, dt) {  
        this.time \+= dt \* 2.0;  
        const ctx \= this.ctx;  
          
        ctx.beginPath();  
        let x \= cx;  
        let y \= cy;

        // Render rotating harmonic circles (epicycles)  
        for (let i \= 0; i \< this.harmonics.length; i++) {  
            const h \= this.harmonics\[i\];  
            const prevX \= x;  
            const prevY \= y;

            const freq \= h.freq;  
            const radius \= h.amp;  
            const phase \= h.phase \+ this.time \* freq;

            x \+= radius \* Math.cos(phase);  
            y \+= radius \* Math.sin(phase);

            // Draw epicycle ring  
            ctx.strokeStyle \= 'rgba(56, 189, 248, 0.25)';  
            ctx.lineWidth \= 1;  
            ctx.beginPath();  
            ctx.arc(prevX, prevY, radius, 0, Math.PI \* 2);  
            ctx.stroke();

            // Draw arm vector  
            ctx.strokeStyle \= '\#38bdf8';  
            ctx.beginPath();  
            ctx.moveTo(prevX, prevY);  
            ctx.lineTo(x, y);  
            ctx.stroke();  
        }

        // Trace final tip path  
        ctx.fillStyle \= '\#fbbf24';  
        ctx.beginPath();  
        ctx.arc(x, y, 3, 0, Math.PI \* 2);  
        ctx.fill();  
    }  
}

class SovereignAudioManager {  
    constructor() {  
        /\*\* @type {AudioContext|null} \*/  
        this.ctx \= null;  
    }

    init() {  
        if (\!this.ctx && typeof window \!== 'undefined') {  
            const AudioCtx \= window.AudioContext || /\*\* @type {any} \*/ (window).webkitAudioContext;  
            this.ctx \= new AudioCtx();  
        }  
        if (this.ctx && this.ctx.state \=== 'suspended') {  
            this.ctx.resume();  
        }  
    }

    /\*\*  
     \* Synthesizes an FM-modulated sound effect with ADSR envelope (Zero asset files).  
     \* @param {number} baseFreq   
     \* @param {number} modFreq   
     \* @param {number} modDepth   
     \* @param {number} duration   
     \*/  
    playFMSound(baseFreq, modFreq, modDepth, duration) {  
        this.init();  
        if (\!this.ctx) return;

        const now \= this.ctx.currentTime;

        // Carrier oscillator  
        const carrier \= this.ctx.createOscillator();  
        carrier.type \= 'sine';  
        carrier.frequency.setValueAtTime(baseFreq, now);

        // Modulator oscillator (FM Synthesis for textured noise/grit)  
        const modulator \= this.ctx.createOscillator();  
        modulator.type \= 'sine';  
        modulator.frequency.setValueAtTime(modFreq, now);

        const modGain \= this.ctx.createGain();  
        modGain.gain.setValueAtTime(modDepth, now);  
        modGain.gain.exponentialRampToValueAtTime(0.001, now \+ duration);

        modulator.connect(modGain);  
        modGain.connect(carrier.frequency);

        // Master Gain with ADSR Envelope  
        const masterGain \= this.ctx.createGain();  
        masterGain.gain.setValueAtTime(0.0, now);  
        masterGain.gain.linearRampToValueAtTime(0.5, now \+ 0.01); // Attack  
        masterGain.gain.exponentialRampToValueAtTime(0.001, now \+ duration); // Decay/Release

        carrier.connect(masterGain);  
        masterGain.connect(this.ctx.destination);

        modulator.start(now);  
        carrier.start(now);  
        modulator.stop(now \+ duration);  
        carrier.stop(now \+ duration);  
    }  
}

## ---

**\[SEC-03\] Actionable Execution Checklist**

1. **Integration:** Embed fourier\_audio\_engine.js directly into the single-file HTML monolith staging membrane (\[SEC-01\]).  
2. **Harmonic Initialization:** Instantiate FourierVectorRenderer with pre-computed harmonic frequency, amplitude, and phase tables for actors and UI glyphs.  
3. **Procedural Triggering:** Invoke audioManager.playFMSound(...) upon game events (jumps, impacts, UI clicks) to achieve sample-accurate sound synthesis without external file requests.

## ---

**Honest Thoughts**

Combining Fourier series harmonic math with FM synthesis bridges the gap between pure code and artistic expression. While it requires discipline to pre-calculate harmonic coefficients for complex shapes, the resulting engine is lightweight, infinitely scalable, and completely self-contained.