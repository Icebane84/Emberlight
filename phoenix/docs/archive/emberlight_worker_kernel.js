/**
 * ============================================================================
 * EMBERLIGHT ENGINE SUBSTRATE: PLANE 1 WORKER KERNEL
 * Document Identifier: AOP-ENG-WRK-001
 * Governing Standards: PSGC-001 / VLT-003 / PERSIST-001 / VSRP-001 / MPFS-001
 * Authority: Plane 1 Headless Simulation Worker
 * ============================================================================
 */
(function (rootContext, factory) {
  'use strict';
  const resolvedRoot = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof self !== 'undefined' ? self : this);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(resolvedRoot);
  } else {
    resolvedRoot.EmberlightWorkerKernel = factory(resolvedRoot);
  }
}(typeof self !== 'undefined' ? self : this, function (resolvedRoot) {
  'use strict';

  // Constants & Boundaries (PSGC-001 / PERSIST-001)
  const FIXED_TIMESTEP_MS = 1000 / 60; // 16.666666666666668 ms (60Hz)
  const MAX_ACCUMULATOR_CLAMP_MS = 250.0;
  const OFFSET_ENTITY_BASE = 0x00000060; // 96 Bytes
  const ENTITY_STRIDE_BYTES = 16;
  const ENTITY_MAX_CAPACITY = 122;
  const SIMD_CANDIDATE_PARTITION_OFFSET = 0x00000800; // 2,048 Bytes

  // Inline Base64 SIMD Bytecode (AOP-ENG-SIMD-002: Zero-Tooling file:/// compliance)
  const SIMD_KERNEL_BASE64 =
    'AGFzbQEAAAABCAJgA39/fwF/YAAAAwIBAAIFAQZtZW1vcnkCAAoKAQgBAX4AAAAAAAkDAQEAEARkZWNv'; // Canonical compact payload

  /**
   * Decodes an inline Base64 string to a Uint8Array without external tools.
   *
   * @param {string} base64String
   * @returns {Uint8Array}
   */
  function decodeBase64ToUint8(base64String) {
    const binaryChars = atob(base64String);
    const length = binaryChars.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryChars.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * The Authoritative Plane 1 Sovereign Worker Kernel.
   */
  class SovereignWorkerKernel {
    constructor() {
      // Lifecycle State Vector (VSRP-001)
      this.lifecycleState = 'UNCONFIGURED';
      this.attenuatedContext = null;

      // Memory Substrate Handles (AOP-MEM-WASM-001)
      this.wasmMemory = null;
      this.rawBuffer = null;
      this.memoryFacade = null;

      // SIMD Vectorization Handles (AOP-MEM-SIMD-001)
      this.simdDispatcher = null;
      this.activeCandidateSets = 0;

      // Simulation Kinetics State
      this.activeEntityCount = 0;
      this.simulationTick = 0n;
      this.accumulatorMs = 0.0;
      this.lastFrameTimeMs = 0.0;
      this.isRunning = false;
      this.rafId = null;

      // Presentation Context (OffscreenCanvas)
      this.canvas = null;
      this.renderContextType = 'none'; // 'webgpu' | 'webgl2' | '2d'
      this.gl = null;
      this.gpuDevice = null;
      this.gpuBuffer = null;
      this.gpuPipeline = null;
      this.ctx2d = null;

      // Direct Memory Views
      this.entityFloatView = null;
    }

    // ========================================================================
    // CANONICAL VSRP-001 LIFECYCLE INTERFACE
    // ========================================================================

    /**
     * [LIFECYCLE 1] configure(ctx)
     * Ingests attenuated capability context; registers inbound event handlers.
     */
    configure(ctx) {
      if (this.lifecycleState !== 'UNCONFIGURED') return;
      this.attenuatedContext = Object.freeze(Object.assign({}, ctx));
      this.lifecycleState = 'CONFIGURED';
    }

    /**
     * [LIFECYCLE 2] init(ctx)
     * Allocates linear memory, initializes SIMD dispatcher, binds OffscreenCanvas.
     */
    async init(canvas, config) {
      if (this.lifecycleState !== 'CONFIGURED') return;

      const opts = config || {};
      this.activeEntityCount = Math.min(opts.entityCount || 16, ENTITY_MAX_CAPACITY);
      this.canvas = canvas;

      // 1. Initialize Linear Memory Substrate (16 Pages = 1 MiB)
      if (resolvedRoot.SovereignMemoryCore) {
        const memAlloc = resolvedRoot.SovereignMemoryCore.allocateLinearMemory();
        this.wasmMemory = memAlloc.wasmMemory;
        this.rawBuffer = memAlloc.rawBuffer;
        this.memoryFacade = resolvedRoot.SovereignMemoryCore.createMemoryFacade(this.wasmMemory);
      } else {
        this.wasmMemory = new WebAssembly.Memory({ initial: 16, maximum: 16 });
        this.rawBuffer = this.wasmMemory.buffer;
        this.memoryFacade = null;
      }

      // Direct Float32 view referencing active entity stride data at 0x060
      this.entityFloatView = new Float32Array(
        this.rawBuffer,
        OFFSET_ENTITY_BASE,
        this.activeEntityCount * (ENTITY_STRIDE_BYTES >>> 2)
      );

      // 2. Instantiate Inline WebAssembly SIMD Kernel
      let simdInstance = null;
      try {
        const wasmBytes = decodeBase64ToUint8(SIMD_KERNEL_BASE64);
        const compiled = await WebAssembly.instantiate(wasmBytes, {
          env: { memory: this.wasmMemory }
        });
        simdInstance = compiled.instance;
      } catch (simdErr) {
        simdInstance = null; // Transparent fallback to scalar path
      }

      if (resolvedRoot.SovereignSimdDispatcher) {
        this.simdDispatcher = resolvedRoot.SovereignSimdDispatcher.createDispatcher(
          { wasmMemory: this.wasmMemory },
          simdInstance,
          resolvedRoot
        );
      }

      // 3. Initialize Hardware Presentation Pipeline (Tier 1 WebGPU -> Tier 2 WebGL2)
      await this._initHardwareRenderer();

      this.lifecycleState = 'INITIALIZED';
    }

    /**
     * [LIFECYCLE 3] activate()
     * Starts the 60Hz monotonic accumulator loop.
     */
    activate() {
      if (this.lifecycleState !== 'INITIALIZED' && this.lifecycleState !== 'SUSPENDED') return;
      this.isRunning = true;
      this.lastFrameTimeMs = performance.now();
      this.lifecycleState = 'ACTIVE';
      this._runLoop();
    }

    /**
     * [LIFECYCLE 4] update(tick, input)
     * Fixed 60Hz tick advancing entity transforms and running broadphase.
     * Guaranteed ZERO heap allocations per tick (INV-05, INV-08).
     */
    update(tick, input) {
      const floatView = this.entityFloatView;
      const count = this.activeEntityCount;

      // 1. Advance Entity Positions & Enforce Screen Boundaries
      for (let i = 0; i < count; i++) {
        const base = i * 4;
        let px = floatView[base];
        let py = floatView[base + 1];
        let vx = floatView[base + 2];
        let vy = floatView[base + 3];

        px += vx;
        py += vy;

        // Viewport bounce boundaries
        if (px < 0.0 || px > 640.0) { vx = -vx; px = Math.max(0.0, Math.min(640.0, px)); }
        if (py < 0.0 || py > 480.0) { vy = -vy; py = Math.max(0.0, Math.min(480.0, py)); }

        floatView[base] = px;
        floatView[base + 1] = py;
        floatView[base + 2] = vx;
        floatView[base + 3] = vy;

        // 2. Broadphase 4-Way SIMD Collision Check against Candidate Set 0
        if (this.simdDispatcher) {
          const hitMask = this.simdDispatcher.testPointCollision4Way(0, px, py);
          if (hitMask !== 0) {
            // Collision response: Invert velocities on obstacle impact
            floatView[base + 2] = -vx;
            floatView[base + 3] = -vy;
          }
        }
      }

      this.simulationTick = tick;
    }

    /**
     * [LIFECYCLE 5] render(renderer, ctx)
     * Directly streams the memory slice to GPU VBO without host memory copying.
     */
    render() {
      if (!this.canvas) return;

      if (this.renderContextType === 'webgl2') {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Direct zero-copy upload from the WebAssembly buffer view
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.entityFloatView);

        // Draw instanced entity points
        gl.drawArrays(gl.POINTS, 0, this.activeEntityCount);
      } else if (this.renderContextType === 'webgpu') {
        const device = this.gpuDevice;

        // Direct in-place sub-buffer write from WASM memory offset 0x060
        device.queue.writeBuffer(
          this.gpuBuffer,
          0,
          this.rawBuffer,
          OFFSET_ENTITY_BASE,
          this.activeEntityCount * ENTITY_STRIDE_BYTES
        );

        // Execute render pass commands
        const commandEncoder = device.createCommandEncoder();
        const textureView = this.canvas.getContext('webgpu').getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
          colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store'
          }]
        });
        renderPass.setPipeline(this.gpuPipeline);
        renderPass.setVertexBuffer(0, this.gpuBuffer);
        renderPass.draw(this.activeEntityCount, 1, 0, 0);
        renderPass.end();
        device.queue.submit([commandEncoder.finish()]);
      } else if (this.renderContextType === '2d') {
        const ctx = this.ctx2d;
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#e8a33d';
        const floatView = this.entityFloatView;
        for (let i = 0; i < this.activeEntityCount; i++) {
          const base = i * 4;
          ctx.fillRect(floatView[base] - 2, floatView[base + 1] - 2, 4, 4);
        }
      }
    }

    /**
     * [LIFECYCLE 6] suspend()
     * Pauses the accumulator loop.
     */
    suspend() {
      this.isRunning = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.lifecycleState = 'SUSPENDED';
    }

    /**
     * [LIFECYCLE 7] resume()
     * Resumes the accumulator loop without time jumping.
     */
    resume() {
      if (this.lifecycleState !== 'SUSPENDED') return;
      this.lastFrameTimeMs = performance.now();
      this.isRunning = true;
      this.lifecycleState = 'ACTIVE';
      this._runLoop();
    }

    /**
     * [LIFECYCLE 8] serialize()
     * Returns an authoritative binary snapshot (PERSIST-001 2,048-byte Partition 0).
     */
    serialize() {
      return new Uint8Array(this.rawBuffer.slice(0, 2048));
    }

    /**
     * [LIFECYCLE 9] deserialize(buf)
     * Validates through the 8-Gate engine and rehydrates state.
     */
    deserialize(buffer) {
      if (resolvedRoot.SovereignMemoryCore) {
        const gateResult = resolvedRoot.SovereignMemoryCore.verifyHeaderGates(
          buffer, null, 0xFFFFFFFF, this.simulationTick
        );
        if (!gateResult.isValid) {
          throw new Error('DESERIALIZE_FAILED: ' + gateResult.diagnosticMessage);
        }
      }
      const destView = new Uint8Array(this.rawBuffer, 0, 2048);
      destView.set(new Uint8Array(buffer, 0, 2048));
    }

    /**
     * [LIFECYCLE TEARDOWN] destroy()
     * Unbinds all references and zeroes capability tokens.
     */
    destroy() {
      this.suspend();
      this.wasmMemory = null;
      this.rawBuffer = null;
      this.entityFloatView = null;
      this.simdDispatcher = null;
      this.canvas = null;
      this.gl = null;
      this.gpuDevice = null;
      this.lifecycleState = 'DESTROYED';
    }

    // ========================================================================
    // INTERNAL ACCUMULATOR CLOCK & PIPELINE ASSEMBLY
    // ========================================================================

    _runLoop() {
      if (!this.isRunning) return;

      const currentTimeMs = performance.now();
      let frameDeltaMs = currentTimeMs - this.lastFrameTimeMs;
      this.lastFrameTimeMs = currentTimeMs;

      // Spiral-of-death mitigation clamp
      if (frameDeltaMs > MAX_ACCUMULATOR_CLAMP_MS) {
        frameDeltaMs = MAX_ACCUMULATOR_CLAMP_MS;
      }

      this.accumulatorMs += frameDeltaMs;

      // Monotonic 60Hz Accumulator Drain
      while (this.accumulatorMs >= FIXED_TIMESTEP_MS) {
        this.update(this.simulationTick + 1n, null);
        this.accumulatorMs -= FIXED_TIMESTEP_MS;
      }

      // Render Stage (Zero-Copy VBO Stream)
      this.render();

      this.rafId = requestAnimationFrame(() => this._runLoop());
    }

    async _initHardwareRenderer() {
      if (!this.canvas) return;

      // Attempt Tier 1: WebGPU
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            this.gpuDevice = await adapter.requestDevice();
            const gpuContext = this.canvas.getContext('webgpu');
            const format = navigator.gpu.getPreferredCanvasFormat();
            gpuContext.configure({ device: this.gpuDevice, format: format, alphaMode: 'opaque' });

            // Create zero-copy VBO (122 entities * 16 bytes = 1,952 bytes)
            this.gpuBuffer = this.gpuDevice.createBuffer({
              size: 2048,
              usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });

            this.renderContextType = 'webgpu';
            return;
          }
        } catch (e) {
          // Fall through to WebGL2
        }
      }

      // Attempt Tier 2: WebGL 2.0
      try {
        const gl = this.canvas.getContext('webgl2', { alpha: false, depth: false });
        if (gl) {
          this.gl = gl;
          this.gpuBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this.gpuBuffer);
          // Allocate persistent buffer storage
          gl.bufferData(gl.ARRAY_BUFFER, 2048, gl.DYNAMIC_DRAW);

          gl.viewport(0, 0, this.canvas.width, this.canvas.height);
          gl.clearColor(0.05, 0.05, 0.1, 1.0);
          this.renderContextType = 'webgl2';
          return;
        }
      } catch (e) {
        // Fall through to Canvas 2D
      }

      // Tier 3 Baseline: Canvas 2D
      this.ctx2d = this.canvas.getContext('2d');
      this.renderContextType = '2d';
    }
  }

  // ========================================================================
  // INBOUND WORKER MESSAGE TRANSDUCTION (PMIP-001)
  // ========================================================================
  const kernelInstance = new SovereignWorkerKernel();

  resolvedRoot.onmessage = async function (e) {
    const msg = e.data || {};
    switch (msg.type) {
      case 'CONFIGURE':
        kernelInstance.configure(msg.context);
        resolvedRoot.postMessage({ type: 'CONFIGURED' });
        break;
      case 'INIT':
        await kernelInstance.init(msg.canvas, msg.config);
        resolvedRoot.postMessage({ type: 'INITIALIZED' });
        break;
      case 'ACTIVATE':
        kernelInstance.activate();
        resolvedRoot.postMessage({ type: 'ACTIVATED' });
        break;
      case 'SUSPEND':
        kernelInstance.suspend();
        resolvedRoot.postMessage({ type: 'SUSPENDED' });
        break;
      case 'RESUME':
        kernelInstance.resume();
        resolvedRoot.postMessage({ type: 'RESUMED' });
        break;
      case 'SERIALIZE':
        const snapshot = kernelInstance.serialize();
        resolvedRoot.postMessage({ type: 'SNAPSHOT', buffer: snapshot.buffer }, [snapshot.buffer]);
        break;
      case 'DESTROY':
        kernelInstance.destroy();
        resolvedRoot.postMessage({ type: 'DESTROYED' });
        break;
    }
  };

  return {
    SovereignWorkerKernel: SovereignWorkerKernel,
    kernelInstance: kernelInstance
  };
}));