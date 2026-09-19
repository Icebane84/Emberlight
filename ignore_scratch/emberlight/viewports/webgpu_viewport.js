/* ==========================================================================
   FILE: viewports/webgpu_viewport.js
   ROLE: WebGPU Hardware-Accelerated Viewport Subsystem
   ========================================================================== */
window._WebGPUViewportInternal = window._WebGPUViewportInternal || {};

(() => {
  'use strict';

  // Inline WGSL Shader (WebGPU Shading Language) - Avoids file loading CORS issues
  const shaderSource = `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) color: vec3f,
    };

    @vertex
    fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var pos = array<vec2f, 3>(
        vec2f(0.0, 0.5),
        vec2f(-0.5, -0.5),
        vec2f(0.5, -0.5)
      );
      var colors = array<vec3f, 3>(
        vec3f(0.9, 0.5, 0.2), // Emberlight Orange
        vec3f(0.1, 0.1, 0.1),
        vec3f(0.2, 0.2, 0.3)
      );
      var output: VertexOutput;
      output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
      output.color = colors[vertexIndex];
      return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4f {
      return vec4f(input.color, 1.0);
    }
  `;

  async function initWebGPU(canvasElement) {
    if (!navigator.gpu) {
      console.warn('[WEBGPU] WebGPU not supported on this browser/environment.');
      return null;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('[WEBGPU] Failed to find appropriate GPU adapter.');
      return null;
    }

    const device = await adapter.requestDevice();
    const context = canvasElement.getContext('webgpu');
    
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: device,
      format: format,
      alphaMode: 'premultiplied'
    });

    const shaderModule = device.createShaderModule({ code: shaderSource });

    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    return { device, context, pipeline, format };
  }

  function renderFrame(gpuSession) {
    if (!gpuSession) return;
    const { device, context, pipeline, format } = gpuSession;

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.05, g: 0.05, b: 0.08, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  window._WebGPUViewportInternal.Viewport = Object.freeze({
    initWebGPU,
    renderFrame
  });
})();

if (typeof window !== 'undefined') {
  window.EmberlightWebGPU = window._WebGPUViewportInternal.Viewport;
}
delete window._WebGPUViewportInternal;