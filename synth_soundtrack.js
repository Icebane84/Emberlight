/* =========================================================================
   PERIPHERAL DRIVER: GENERATIVE CHIPTUNE & AMBIENT MUSIC ENGINE
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-SYNTH-SOUNDTRACK
   Protocol Version:    VSRP-001 / ARCH-SPEC-WAR-TABLE-001
   Classification:      Peripheral Capability Driver
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightSoundtrack = (() => {
  let ctx = null;
  let masterGain = null;
  let isMuted = false;
  let userUnlocked = false;
  let eventBus = null;
  let unsubs = [];

  // Active Sequencer State
  let currentMood = 'SURFACE'; // 'SURFACE' | 'TOWN' | 'CATACOMBS' | 'COMBAT' | 'BOSS'
  let targetMood = 'SURFACE';
  let currentBPM = 98;
  let targetBPM = 98;
  let currentStep = 0;
  let nextStepTime = 0;
  const LOOKAHEAD_SEC = 0.12; // 120ms forward scheduling window

  // Noise Buffer Cache for Percussion
  let noiseBuffer = null;

  // --- SCALE DICTIONARIES (MIDI Note Arrays) ---
  const SCALES = {
    SURFACE:   [57, 60, 62, 64, 67, 69, 72, 74], // A Dorian (A3 to D5)
    TOWN:      [60, 62, 64, 66, 67, 69, 71, 72], // C Lydian (C4 to C5)
    CATACOMBS: [50, 53, 57, 58, 61, 62, 65, 69], // D Harmonic Minor
    COMBAT:    [52, 53, 55, 57, 59, 60, 62, 64], // E Phrygian
    BOSS:      [50, 51, 54, 56, 57, 60, 62, 63], // D Locrian / Diminished
  };

  const MOOD_CONFIG = {
    SURFACE:   { bpm: 98,  rootFreq: 110.0, filterCutoff: 650,  bassType: 'triangle' },
    TOWN:      { bpm: 86,  rootFreq: 130.8, filterCutoff: 900,  bassType: 'triangle' },
    CATACOMBS: { bpm: 108, rootFreq: 73.4,  filterCutoff: 420,  bassType: 'sawtooth' },
    COMBAT:    { bpm: 138, rootFreq: 82.4,  filterCutoff: 1200, bassType: 'sawtooth' },
    BOSS:      { bpm: 152, rootFreq: 73.4,  filterCutoff: 1600, bassType: 'square' },
  };

  function midiToFreq(midi) {
    return 440 * (2 ** ((midi - 69) / 12));
  }

  function ensureContext() {
    if (!userUnlocked || typeof window === 'undefined') return;
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        ctx = new AudioContextClass();
        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0.0 : 0.45, ctx.currentTime);
        masterGain.connect(ctx.destination);
        bakeNoiseBuffer();
      } catch {
        // Fallback gracefully if Web Audio context instantiation is denied by environment
        ctx = null;
      }
    }
    if (ctx?.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function bakeNoiseBuffer() {
    if (!ctx || typeof ctx.createBuffer !== 'function') return;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.1);
      noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } catch {
      // Ignore buffer creation failures in headless or mocked audio environments
    }
  }

  function armGestureUnlock() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const unlock = () => {
      userUnlocked = true;
      ensureContext();
      if (ctx && nextStepTime === 0) {
        nextStepTime = ctx.currentTime + 0.1;
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  // --- SYNTHESIS CHANNEL 1: BASSLINE ---
  function playBassNote(freq, time, duration, type, cutoff) {
    if (!ctx || isMuted) return;
    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, cutoff * 0.4), time + duration);

      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // Ignore scheduling errors on inactive Web Audio nodes
    }
  }

  // --- SYNTHESIS CHANNEL 2: 16TH-NOTE ARPEGGIATOR ---
  function playArpNote(freq, time, duration) {
    if (!ctx || isMuted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = (currentMood === 'COMBAT' || currentMood === 'BOSS') ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // Ignore scheduling errors on inactive Web Audio nodes
    }
  }

  // --- SYNTHESIS CHANNEL 3: MELODY / MOTIF ---
  function playLeadNote(freq, time, duration) {
    if (!ctx || isMuted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, time + duration * 0.5);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + duration);
    } catch {
      // Ignore scheduling errors on inactive Web Audio nodes
    }
  }

  // --- SYNTHESIS CHANNEL 4: CHIPTUNE PERCUSSION ---
  function playPercussion(type, time) {
    if (!ctx || !noiseBuffer || isMuted) return;
    try {
      if (type === 'KICK') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.08);

        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.09);
      } else if (type === 'SNARE' || type === 'HAT') {
        const node = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        node.buffer = noiseBuffer;
        filter.type = type === 'HAT' ? 'highpass' : 'bandpass';
        filter.frequency.setValueAtTime(type === 'HAT' ? 6000 : 1800, time);

        const dur = type === 'HAT' ? 0.03 : 0.08;
        const vol = type === 'HAT' ? 0.08 : 0.22;

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        node.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        node.start(time);
        node.stop(time + dur);
      }
    } catch {
      // Ignore buffer playback failures
    }
  }

  // --- DETERMINISTIC STEP SEQUENCER MATRIX SUBROUTINES ---
  function scheduleBass(stepIdx, stepTime, stepDuration, cfg) {
    if ([0, 3, 6, 10, 12].includes(stepIdx)) {
      const root = cfg.rootFreq;
      const octaveMod = (stepIdx === 6 || stepIdx === 12) ? 1.5 : 1.0;
      playBassNote(root * octaveMod, stepTime, stepDuration * 2.2, cfg.bassType, cfg.filterCutoff);
    }
  }

  function scheduleArp(stepIdx, stepTime, stepDuration, scale) {
    const arpNoteIdx = (stepIdx * 3 + (stepIdx >= 8 ? 2 : 0)) % scale.length;
    const arpMidi = scale[arpNoteIdx];
    playArpNote(midiToFreq(arpMidi), stepTime, stepDuration * 0.85);
  }

  function scheduleLead(stepIdx, stepTime, stepDuration, scale) {
    if (stepIdx === 0 || stepIdx === 8) {
      const leadNote = scale[(stepIdx === 0 ? 4 : 7) % scale.length] + 12;
      playLeadNote(midiToFreq(leadNote), stepTime, stepDuration * 3.8);
    }
  }

  function schedulePercussion(stepIdx, stepTime) {
    if (currentMood === 'COMBAT' || currentMood === 'BOSS') {
      if (stepIdx === 0 || stepIdx === 8 || (currentMood === 'BOSS' && stepIdx === 14)) {
        playPercussion('KICK', stepTime);
      }
      if (stepIdx === 4 || stepIdx === 12) {
        playPercussion('SNARE', stepTime);
      }
      if (stepIdx % 2 === 1) {
        playPercussion('HAT', stepTime);
      }
    } else if (currentMood === 'CATACOMBS') {
      if (stepIdx === 0) playPercussion('KICK', stepTime);
      if (stepIdx === 8) playPercussion('HAT', stepTime);
    }
  }

  function scheduleStep(stepIdx, stepTime, stepDuration) {
    const scale = SCALES[currentMood] || SCALES.SURFACE;
    const cfg = MOOD_CONFIG[currentMood] || MOOD_CONFIG.SURFACE;

    scheduleBass(stepIdx, stepTime, stepDuration, cfg);
    scheduleArp(stepIdx, stepTime, stepDuration, scale);
    scheduleLead(stepIdx, stepTime, stepDuration, scale);
    schedulePercussion(stepIdx, stepTime);
  }

  return {
    init(bus) {
      this.destroy();
      eventBus = (bus && typeof bus.subscribe === 'function')
        ? bus
        : (bus?.eventBus && typeof bus.eventBus.subscribe === 'function' ? bus.eventBus : null);
      armGestureUnlock();

      if (eventBus) {
        let lastAmbientMood = 'SURFACE';

        unsubs.push(
          eventBus.subscribe('overworld:step', (evt = {}) => {
            const pos = evt?.pos;
            if (pos) {
              let amb = 'SURFACE';
              if (pos.x >= 8 || (pos.depth && pos.depth > 0)) {
                amb = 'CATACOMBS';
              } else if (pos.inTown || (typeof pos.tile === 'string' && pos.tile === 'T')) {
                amb = 'TOWN';
              }
              lastAmbientMood = amb;
              if (currentMood !== 'COMBAT' && currentMood !== 'BOSS') {
                this.setMood(amb);
              }
            }
          }),
          eventBus.subscribe('stage:biome', (evt = {}) => {
            const b = String(evt?.biome || '').toUpperCase();
            if (b.includes('CRYPT') || b.includes('CATACOMB')) lastAmbientMood = 'CATACOMBS';
            else if (b.includes('TOWN')) lastAmbientMood = 'TOWN';
            else if (b.includes('MEADOW') || b.includes('SURFACE')) lastAmbientMood = 'SURFACE';
            if (currentMood !== 'COMBAT' && currentMood !== 'BOSS') {
              this.setMood(lastAmbientMood);
            }
          }),
          eventBus.subscribe('overworld:encounter', (evt = {}) => {
            const encounterKey = evt?.encounterKey;
            if (encounterKey === 'BOSS_MALAKOR') {
              this.setMood('BOSS');
            } else {
              this.setMood('COMBAT');
            }
          }),
          eventBus.subscribe('combat:resolved', () => {
            this.setMood(lastAmbientMood || 'SURFACE');
          }),
          eventBus.subscribe('system:command', (evt = {}) => {
            if (evt?.command === 'TOGGLE_MUTE') {
              this.toggleMute();
            }
          })
        );
      }
    },

    setMood(newMood) {
      if (!MOOD_CONFIG[newMood]) return;
      targetMood = newMood;
      targetBPM = MOOD_CONFIG[newMood].bpm;
    },

    toggleMute() {
      isMuted = !isMuted;
      if (masterGain && ctx) {
        masterGain.gain.setValueAtTime(isMuted ? 0.0 : 0.45, ctx.currentTime);
      }
      return isMuted;
    },

    /**
     * Lookahead frame scheduler driven by GameRuntime.hostTick(dt).
     * Strictly satisfies VSRP-001 (Zero unmanaged clocks).
     */
    update(_dt = 0.016) {
      if (!userUnlocked || !ctx) return;

      if (currentMood !== targetMood) {
        currentMood = targetMood;
        currentBPM = targetBPM;
      }

      const bpm = Math.max(20, Math.min(300, currentBPM || 98));
      const stepDuration = 60 / (bpm * 4); // 16th note in seconds

      const now = ctx.currentTime;
      if (nextStepTime < now - 0.5) {
        // Tab was throttled or backgrounded, resync to present
        nextStepTime = now;
      }

      let safetyCount = 0;
      while (nextStepTime < now + LOOKAHEAD_SEC && safetyCount < 32) {
        scheduleStep(currentStep, nextStepTime, stepDuration);
        nextStepTime += stepDuration;
        currentStep = (currentStep + 1) % 16;
        safetyCount++;
      }
    },

    getDiagnostics() {
      return {
        driverId: 'synth_soundtrack_driver',
        activeMood: currentMood,
        currentBPM,
        currentStep,
        isMuted,
        contextState: ctx ? ctx.state : 'uninitialized',
      };
    },

    destroy() {
      unsubs.forEach((u) => {
        try {
          if (typeof u === 'function') u();
        } catch {
          // Ignore unbind errors
        }
      });
      unsubs = [];

      if (ctx) {
        ctx.close().catch(() => {});
        ctx = null;
        masterGain = null;
      }
      eventBus = null;
      userUnlocked = false;
      nextStepTime = 0;
      currentStep = 0;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightSoundtrack = EmberlightSoundtrack;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightSoundtrack;
}
