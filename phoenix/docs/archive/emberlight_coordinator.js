/**
 * ============================================================================
 * EMBERLIGHT ENGINE SUBSTRATE: PLANE 0 COORDINATOR & INPUT TRANSDUCER
 * Document Identifier: AOP-ENG-CRD-001
 * Governing Standards: PSGC-001 / VLT-003 / PERSIST-001 / SDCP-001 / MVP-001
 * Authority: Plane 0 DOM Host & Capability Coordinator
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
    resolvedRoot.EmberlightCoordinator = factory(resolvedRoot);
  }
}(typeof window !== 'undefined' ? window : this, function (resolvedRoot) {
  'use strict';

  // Constants & SPSC Ring Configuration ([SEC-08])
  const RING_CAPACITY = 256;
  const RING_MASK = RING_CAPACITY - 1; // 0xFF
  const RING_HEADER_WORDS = 4; // [0]=head, [1]=tail, [2]=droppedCounter, [3]=reserved
  const TOTAL_RING_WORDS = RING_HEADER_WORDS + RING_CAPACITY; // 260 Int32s = 1,040 Bytes

  // Action Tokens
  const ACTION_KEYDOWN = 0x01;
  const ACTION_KEYUP = 0x02;

  // Canonical Hardware Key IDs ([SEC-19])
  const KEY_CODE_MAP = Object.freeze({
    KeyW: 0x0001,
    KeyA: 0x0002,
    KeyS: 0x0003,
    KeyD: 0x0004,
    ArrowUp: 0x0005,
    ArrowLeft: 0x0006,
    ArrowDown: 0x0007,
    ArrowRight: 0x0008,
    Space: 0x0010,
    Enter: 0x0011,
    Escape: 0x0012,
    ShiftLeft: 0x0020,
    ShiftRight: 0x0021,
    ControlLeft: 0x0022,
    Tab: 0x0023
  });

  /**
   * SPSC Lockless Atomic Ring Buffer (Producer: Plane 0 | Consumer: Plane 1).
   */
  class SovereignInputRingProducer {
    /**
     * @param {SharedArrayBuffer} sharedArrayBuffer
     * @param {number} byteOffsetAddress
     */
    constructor(sharedArrayBuffer, byteOffsetAddress) {
      this.isShared = sharedArrayBuffer instanceof (resolvedRoot.SharedArrayBuffer || Object);
      this.int32View = new Int32Array(
        sharedArrayBuffer,
        byteOffsetAddress,
        TOTAL_RING_WORDS
      );

      // Header indices
      this.INDEX_HEAD = 0;
      this.INDEX_TAIL = 1;
      this.INDEX_DROPPED = 2;
      this.DATA_OFFSET = RING_HEADER_WORDS;

      // Fallback transient queue when SharedArrayBuffer is unavailable
      this.fallbackQueue = [];
    }

    /**
     * Enqueues a packed 32-bit input token using atomic synchronization.
     * Guaranteed ZERO memory allocations inside event hot paths ([INV-08]).
     *
     * @param {number} packedToken
     * @returns {boolean} Success state
     */
    pushToken(packedToken) {
      if (!this.isShared) {
        if (this.fallbackQueue.length < RING_CAPACITY) {
          this.fallbackQueue.push(packedToken);
          return true;
        }
        return false;
      }

      const head = Atomics.load(this.int32View, this.INDEX_HEAD);
      const tail = Atomics.load(this.int32View, this.INDEX_TAIL);

      const nextHead = (head + 1) & RING_MASK;

      // Check for buffer overflow
      if (nextHead === tail) {
        Atomics.add(this.int32View, this.INDEX_DROPPED, 1);
        return false; // Ring full; drop oldest to prevent loop hitching
      }

      // Write token to ring buffer slot
      Atomics.store(this.int32View, this.DATA_OFFSET + head, packedToken);

      // Advance producer head index
      Atomics.store(this.int32View, this.INDEX_HEAD, nextHead);
      return true;
    }

    drainFallback() {
      if (this.fallbackQueue.length === 0) return null;
      const batch = this.fallbackQueue.slice();
      this.fallbackQueue.length = 0;
      return batch;
    }
  }

  /**
   * Main Thread Coordinator Substrate.
   */
  class EmberlightCoordinator {
    /**
     * @param {HTMLCanvasElement} viewportCanvas
     * @param {HTMLElement|null} telemetryDockElement
     */
    constructor(viewportCanvas, telemetryDockElement) {
      this.canvas = viewportCanvas;
      this.hudDock = telemetryDockElement;

      this.worker = null;
      this.sharedBuffer = null;
      this.ringProducer = null;

      // Key Listener State
      this._boundKeyDown = null;
      this._boundKeyUp = null;
      this.isListening = false;
    }

    /**
     * Spawns the Plane 1 worker from an in-memory script template ([SEC-17]).
     * Revokes the Blob URL immediately to prevent leaks.
     *
     * @param {string} workerSourceText
     * @param {Object} engineConfig
     */
    bootWorker(workerSourceText, engineConfig) {
      if (this.worker) {
        throw new Error('[COORDINATOR] Worker instance already booted.');
      }

      // 1. Worker Spawner with Immediate URL Revocation ([SEC-17])
      const blob = new Blob([workerSourceText], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);

      // 2. Negotiate SharedArrayBuffer for the Input Ring Buffer
      const hasSAB = typeof crossOriginIsolated !== 'undefined' &&
                     crossOriginIsolated === true &&
                     typeof SharedArrayBuffer !== 'undefined';

      if (hasSAB) {
        this.sharedBuffer = new SharedArrayBuffer(TOTAL_RING_WORDS * 4);
      } else {
        this.sharedBuffer = new ArrayBuffer(TOTAL_RING_WORDS * 4);
      }

      this.ringProducer = new SovereignInputRingProducer(this.sharedBuffer, 0);

      // 3. Bind Telemetry Receiver ([SEC-22])
      this._attachWorkerListeners();

      // 4. Delegate OffscreenCanvas to Worker via Transferable List ([SEC-18])
      const offscreenSocket = this.canvas.transferControlToOffscreen();

      this.worker.postMessage({
        type: 'CONFIGURE',
        context: {
          hasSharedMemory: hasSAB,
          viewportWidth: this.canvas.width,
          viewportHeight: this.canvas.height
        }
      });

      this.worker.postMessage({
        type: 'INIT',
        canvas: offscreenSocket,
        config: engineConfig || {},
        sharedInputBuffer: hasSAB ? this.sharedBuffer : null
      }, [offscreenSocket]);

      // 5. Engage Hardware Input Transduction ([SEC-19])
      this.attachInputListeners();
    }

    /**
     * Ingests asynchronous telemetry reports from Plane 1 via queueMicrotask ([SEC-22]).
     */
    _attachWorkerListeners() {
      this.worker.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === 'TELEMETRY' && this.hudDock) {
          resolvedRoot.queueMicrotask(() => {
            this._renderTelemetry(msg);
          });
        }
      });
    }

    _renderTelemetry(data) {
      if (!this.hudDock) return;
      this.hudDock.textContent =
        `TICK: ${data.tick} | SIM: ${data.fps || 60} FPS | ` +
        `ENTITIES: ${data.entityCount} | DROPPED_KEYS: ${data.droppedInputs || 0}`;
    }

    /**
     * Binds native DOM keyboard handlers with zero string allocations ([SEC-19]).
     */
    attachInputListeners() {
      if (this.isListening) return;

      this._boundKeyDown = (event) => this._handleKeyEvent(event, ACTION_KEYDOWN);
      this._boundKeyUp = (event) => this._handleKeyEvent(event, ACTION_KEYUP);

      resolvedRoot.addEventListener('keydown', this._boundKeyDown, { passive: true });
      resolvedRoot.addEventListener('keyup', this._boundKeyUp, { passive: true });
      this.isListening = true;
    }

    _handleKeyEvent(event, actionType) {
      const keyId = KEY_CODE_MAP[event.code];
      if (keyId === undefined) return;

      // Pack Modifiers (Shift: 1, Ctrl: 2, Alt: 4, Meta: 8)
      let modifiers = 0;
      if (event.shiftKey) modifiers |= 0x01;
      if (event.ctrlKey) modifiers |= 0x02;
      if (event.altKey) modifiers |= 0x04;
      if (event.metaKey) modifiers |= 0x08;

      // Assemble 32-bit packed token: [Action (8b)] [Modifiers (8b)] [KeyId (16b)]
      const packedToken = ((actionType & 0xFF) << 24) |
                          ((modifiers & 0xFF) << 16) |
                          (keyId & 0xFFFF);

      const pushed = this.ringProducer.pushToken(packedToken);

      // Fallback postMessage batch if SharedArrayBuffer is inactive
      if (!this.ringProducer.isShared && pushed) {
        const batch = this.ringProducer.drainFallback();
        if (batch && this.worker) {
          this.worker.postMessage({ type: 'INPUT_BATCH', tokens: batch });
        }
      }
    }

    /**
     * Signals Plane 1 to engage the 60Hz accumulator.
     */
    start() {
      if (this.worker) {
        this.worker.postMessage({ type: 'ACTIVATE' });
      }
    }

    /**
     * Signals Plane 1 to suspend execution.
     */
    stop() {
      if (this.worker) {
        this.worker.postMessage({ type: 'SUSPEND' });
      }
    }

    /**
     * Teardown: Unbinds listeners and terminates worker ([SEC-10]).
     */
    terminate() {
      if (this.isListening) {
        resolvedRoot.removeEventListener('keydown', this._boundKeyDown);
        resolvedRoot.removeEventListener('keyup', this._boundKeyUp);
        this.isListening = false;
      }
      if (this.worker) {
        this.worker.postMessage({ type: 'DESTROY' });
        this.worker.terminate();
        this.worker = null;
      }
      this.ringProducer = null;
      this.sharedBuffer = null;
    }
  }

  return Object.freeze({
    EmberlightCoordinator: EmberlightCoordinator,
    SovereignInputRingProducer: SovereignInputRingProducer,
    KEY_CODE_MAP: KEY_CODE_MAP,
    ACTION_KEYDOWN: ACTION_KEYDOWN,
    ACTION_KEYUP: ACTION_KEYUP
  });
}));