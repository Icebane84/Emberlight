// 1. Instantiate the Sovereign Audio Engine in Plane 0
const audioEngine = new SovereignAudioEngine();

// 2. Bind Autoplay Unlock to DOM Interactions
const unlockHandler = () => {
  audioEngine.unlock();
  window.removeEventListener('pointerdown', unlockHandler);
  window.removeEventListener('keydown', unlockHandler);
};
window.addEventListener('pointerdown', unlockHandler, { once: true });
window.addEventListener('keydown', unlockHandler, { once: true });

// 3. Modulate Voice 2 (Thrust) on HMI Keyboard Input
window.addEventListener('keydown', (e) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
    audioEngine.setThrustState(true, 1.2);
  }
});
window.addEventListener('keyup', (e) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
    audioEngine.setThrustState(false, 0.0);
  }
});

// 4. Ingest Collision Events from Plane 1 Worker Message Transducer
worker.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'COLLISION_EVENT') {
    audioEngine.playCollisionPing(msg.impactVelocity);
  } else if (msg.type === 'TELEMETRY' && hudDock) {
    const audioData = audioEngine.getTelemetry();
    hudDock.textContent =
      `TICK: ${msg.tick} | SIM: ${msg.fps} FPS | ` +
      `ENTITIES: ${msg.entityCount} | AUDIO: [${audioData.state.toUpperCase()} | VOICES: ${audioData.activeVoices}]`;
  }
});