// Append to SovereignAudioEngine in sovereign_audio_engine.js:

/**
 * Voice 3: Kinetic Discharge Ping (High-frequency snappy impulse)
 */
playWeaponDischarge() {
  if (!this.isUnlocked || !this.ctx || this.ctx.state !== 'running') return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const gain = this.ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(1240.0, now);
  osc.frequency.exponentialRampToValueAtTime(320.0, now + 0.035);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  osc.connect(gain);
  gain.connect(this.masterGain);
  osc.start(now);
  osc.stop(now + 0.045);
}

/**
 * Voice 4: Drone Elimination Crunch (Noise burst + resonant sub thump)
 */
playDroneCrunch() {
  if (!this.isUnlocked || !this.ctx || this.ctx.state !== 'running') return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const gain = this.ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140.0, now);
  osc.frequency.exponentialRampToValueAtTime(35.0, now + 0.09);

  gain.gain.setValueAtTime(0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  osc.connect(gain);
  gain.connect(this.masterGain);
  osc.start(now);
  osc.stop(now + 0.11);
}