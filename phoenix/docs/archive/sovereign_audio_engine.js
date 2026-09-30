/**
 * ============================================================================
 * EMBERLIGHT ENGINE SUBSTRATE: PROCEDURAL WEB AUDIO ENGINE (PWAS-01)
 * Document Identifier: AOP-ENG-AUD-001
 * Governing Standards: PSGC-001 / PWAS-01 / VLT-003 / SDCP-001 / MPFS-001
 * Authority: Plane 0 Audio DAC & Procedural Synthesizer Core
 * ============================================================================
 */
(function (rootContext, factory) {
  'use strict';
  const resolvedRoot = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof window !== 'undefined' ? window : this);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(resolvedRoot);
  } else {
    resolvedRoot.SovereignAudioEngine = factory(resolvedRoot);
  }
}(typeof window !== 'undefined' ? window : this, function (resolvedRoot) {
  'use strict';

  /**
   * Procedural Audio Synthesizer Subsystem.
   */
  class SovereignAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isUnlocked = false;

      // Voice 2: Kinetic Thrust Hum Handles
      this.thrustOsc1 = null;
      this.thrustOsc2 = null;
      this.thrustFilter = null;
      this.thrustGain = null;
      this.isThrusting = false;
      this.targetThrustPitch = 55.0; // Fundamental A1

      // Voice Telemetry Metrics
      this.activeTransientVoices = 0;
      this.totalPingsPlayed = 0;
    }

    /**
     * Unlocks the AudioContext upon first user gesture ([SEC-20]).
     */
    unlock() {
      if (this.isUnlocked && this.ctx && this.ctx.state === 'running') return;

      if (!this.ctx) {
        const AudioContextClass = resolvedRoot.AudioContext || resolvedRoot.webkitAudioContext;
        if (!AudioContextClass) {
          return; // Web Audio unsupported; graceful null degradation
        }
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime); // Safe master ceiling
        this.masterGain.connect(this.ctx.destination);

        this._initThrustVoice();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isUnlocked = true;
    }

    // ========================================================================
    // VOICE 1: HIGH-FREQUENCY COLLISION PING (Transient Deflection)
    // ========================================================================

    /**
     * Synthesizes a crisp, metallic collision click/ping.
     * Guaranteed zero asset fetch; zero GC retention after decay.
     *
     * @param {number} velocityImpact Optional velocity scalar to scale frequency
     */
    playCollisionPing(velocityImpact) {
      if (!this.isUnlocked || !this.ctx || this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const impactScale = Math.min(Math.max(velocityImpact || 1.0, 0.5), 3.0);
      const baseFreq = 780.0 * impactScale;

      // Frequency Envelope: Rapid pitch sweep down
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(180.0, now + 0.045);

      // Gain Envelope: Instant attack (<1ms), fast exponential decay
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      this.activeTransientVoices++;
      this.totalPingsPlayed++;

      osc.start(now);
      osc.stop(now + 0.055);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.activeTransientVoices = Math.max(0, this.activeTransientVoices - 1);
      };
    }

    // ========================================================================
    // VOICE 2: LOW-FREQUENCY KINETIC THRUST HUM (Continuous Sub-Bass)
    // ========================================================================

    /**
     * Sets up the continuous low-pass filtered dual-oscillator drone.
     */
    _initThrustVoice() {
      const now = this.ctx.currentTime;

      // Dual detuned oscillators for chorus/rotational sub-bass
      this.thrustOsc1 = this.ctx.createOscillator();
      this.thrustOsc2 = this.ctx.createOscillator();
      this.thrustFilter = this.ctx.createBiquadFilter();
      this.thrustGain = this.ctx.createGain();

      this.thrustOsc1.type = 'sawtooth';
      this.thrustOsc1.frequency.setValueAtTime(55.0, now); // A1

      this.thrustOsc2.type = 'sine';
      this.thrustOsc2.frequency.setValueAtTime(55.7, now); // +0.7Hz beat detune

      // Warm analog warmth filter
      this.thrustFilter.type = 'lowpass';
      this.thrustFilter.frequency.setValueAtTime(140.0, now);
      this.thrustFilter.Q.setValueAtTime(2.5, now);

      // Silent initially
      this.thrustGain.gain.setValueAtTime(0.0001, now);

      this.thrustOsc1.connect(this.thrustFilter);
      this.thrustOsc2.connect(this.thrustFilter);
      this.thrustFilter.connect(this.thrustGain);
      this.thrustGain.connect(this.masterGain);

      this.thrustOsc1.start(now);
      this.thrustOsc2.start(now);
    }

    /**
     * Modulates thrust amplitude and pitch in response to active input vectors.
     *
     * @param {boolean} isAccelerating
     * @param {number} speedScalar
     */
    setThrustState(isAccelerating, speedScalar) {
      if (!this.isUnlocked || !this.thrustGain || !this.ctx) return;

      const now = this.ctx.currentTime;
      const speed = Math.min(Math.max(speedScalar || 0.0, 0.0), 2.5);

      if (isAccelerating) {
        const pitch = 55.0 + (speed * 18.0);
        this.thrustOsc1.frequency.setTargetAtTime(pitch, now, 0.08);
        this.thrustOsc2.frequency.setTargetAtTime(pitch + 0.7, now, 0.08);
        this.thrustFilter.frequency.setTargetAtTime(140.0 + (speed * 80.0), now, 0.08);
        this.thrustGain.gain.setTargetAtTime(0.28, now, 0.05);
        this.isThrusting = true;
      } else {
        this.thrustGain.gain.setTargetAtTime(0.0001, now, 0.12);
        this.isThrusting = false;
      }
    }

    /**
     * Returns real-time voice allocation metrics for the HUD telemetry dock ([SEC-22]).
     *
     * @returns {Object}
     */
    getTelemetry() {
      return {
        state: this.ctx ? this.ctx.state : 'uninitialized',
        activeVoices: (this.isThrusting ? 2 : 0) + this.activeTransientVoices,
        totalPings: this.totalPingsPlayed
      };
    }

    /**
     * Mutes or attenuates master output.
     *
     * @param {boolean} isMuted
     */
    setMute(isMuted) {
      if (!this.masterGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(isMuted ? 0.0001 : 0.35, now, 0.03);
    }

    /**
     * Closes the AudioContext on host teardown.
     */
    destroy() {
      if (this.ctx) {
        try {
          this.ctx.close();
        } catch (e) {
          // Teardown trap
        }
        this.ctx = null;
      }
      this.isUnlocked = false;
    }
  }

  return Object.freeze({
    SovereignAudioEngine: SovereignAudioEngine
  });
}));