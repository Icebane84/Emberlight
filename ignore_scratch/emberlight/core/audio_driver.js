/* ==========================================================================
   FILE: core/audio_driver.js
   ROLE: Web Audio DSP Synthesizer & Procedural Cavern Wind Generator
   ========================================================================== */
window._AudioInternal = window._AudioInternal || {};

(() => {
  'use strict';

  class AudioDriver {
    constructor() {
      this.ctx = null;
      this.bgmRunning = false;
      this.noiseSource = null;
      this.gainNode = null;
    }

    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playThud() {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    }

    playClash() {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    }

    // Organic Brownian Noise Cavern Wind Generator
    startAmbientBGM() {
      if (this.bgmRunning) return;
      this.init();
      this.bgmRunning = true;

      const now = this.ctx.currentTime;

      // Create a 5-second looping Brownian noise buffer for deep wind drafts
      const bufferSize = this.ctx.sampleRate * 5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02; // Brownian rumble
        lastOut = data[i];
      }

      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = buffer;
      this.noiseSource.loop = true;

      // Lowpass filter to muffle the wind into a deep subterranean draft
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.Q.setValueAtTime(4.0, now);

      // Slow LFO to swell the wind volume and filter frequency organically
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.08, now); // Slow 12-second swell cycle
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(70, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      // Master Gain for smooth fade-in
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.001, now);
      this.gainNode.gain.linearRampToValueAtTime(0.25, now + 3.0);

      // Routing
      this.noiseSource.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.noiseSource.start();
    }

    stopAmbientBGM() {
      if (!this.bgmRunning) return;
      if (this.gainNode && this.ctx) {
        const now = this.ctx.currentTime;
        this.gainNode.gain.linearRampToValueAtTime(0.0001, now + 1.5);
        setTimeout(() => {
          if (this.noiseSource) {
            this.noiseSource.stop();
            this.noiseSource.disconnect();
            this.noiseSource = null;
          }
          this.bgmRunning = false;
        }, 1500);
      } else {
        this.bgmRunning = false;
      }
    }
  }

  window._AudioInternal.AudioDriver = AudioDriver;
})();

if (typeof window !== 'undefined') {
  window.AudioDriver = window._AudioInternal.AudioDriver;
}
delete window._AudioInternal;