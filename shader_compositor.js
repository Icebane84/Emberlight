/* =========================================================================
   DISTRICT: HARDWARE SHADER COMPOSITOR (VSRP-001 HOST PERIPHERAL DRIVER)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-SHADER-COMPOSITOR
   Protocol Version:    VSRP-001
   Classification:      Peripheral Capability Driver & Post-Processing Pipeline
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightShaderCompositor = (() => {
  'use strict';

  let canvas = null;
  let gl = null;
  let eventBus = null;
  let animFrameId = null;

  // Program & Shaders
  let program = null;
  let quadBuffer = null;

  // Shader Uniform Locations
  let uResolution = null;
  let uTime = null;
  let uTrauma = null;
  let uCurvature = null;
  let uScanlines = null;
  let uAberration = null;

  // Kinetic Uniform State
  let trauma = 0.0; // Dynamic hit-flash and chromatic surge
  let isEnabled = true;
  let lastTime = 0;

  // --- GLSL Shaders ---

  const VS_SOURCE = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      v_uv.y = 1.0 - v_uv.y; // Match screen space orientation
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FS_SOURCE = `
    precision mediump float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_trauma;
    uniform float u_curvature;
    uniform float u_scanlines;
    uniform float u_aberration;

    // Barrel Distortion UV Warp
    vec2 curveUV(vec2 uv, float bend) {
      uv = (uv - 0.5) * 2.0;
      uv *= 1.0 + pow((abs(uv.yx) / bend), vec2(2.0));
      uv = (uv / 2.0) + 0.5;
      return uv;
    }

    void main() {
      vec2 uv = v_uv;

      // 1. Apply Glass Face Curvature
      if (u_curvature > 0.01) {
        uv = curveUV(uv, 3.8 / u_curvature);
      }

      // Hard screen boundary clip for curved frame
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.95);
        return;
      }

      // 2. Scanline Intensity & Horizontal Raster Beam
      float scanline = sin(uv.y * u_resolution.y * 1.5707) * 0.5 + 0.5;
      scanline = pow(scanline, 1.35);
      float scanlineAlpha = (1.0 - scanline) * 0.28 * u_scanlines;

      // 3. Dynamic Chromatic Aberration & Radial Edge Spread
      vec2 centerOffset = uv - vec2(0.5);
      float radialDist = length(centerOffset);
      float totalAberration = (0.003 * u_aberration) + (u_trauma * 0.015 * (1.0 + radialDist * 2.0));

      // RGB Phosphor Mask Simulation (Sub-pixel triad stripe)
      float colIndex = mod(floor(gl_FragCoord.x), 3.0);
      vec3 phosphor = vec3(0.9, 0.9, 0.9);
      if (colIndex < 1.0) {
        phosphor = vec3(1.08, 0.92, 0.92);
      } else if (colIndex < 2.0) {
        phosphor = vec3(0.92, 1.08, 0.92);
      } else {
        phosphor = vec3(0.92, 0.92, 1.12);
      }

      // 4. Corner Vignette Attenuation
      float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
      vignette = clamp(pow(16.0 * vignette, 0.35), 0.0, 1.0);
      float vignetteDarkness = (1.0 - vignette) * 0.65;

      // 5. Trauma Red-Out / Gold Flash Overlay
      vec4 traumaOverlay = vec4(1.0, 0.2, 0.1, u_trauma * 0.35);

      // Composite final glass overlay
      vec3 finalShade = mix(phosphor, vec3(0.0), scanlineAlpha);
      finalShade = mix(finalShade, vec3(0.0), vignetteDarkness);
      finalShade = mix(finalShade, traumaOverlay.rgb, traumaOverlay.a);

      // Render as semi-transparent optical layer over DOM cockpit
      float alpha = max(scanlineAlpha, vignetteDarkness * 0.85) + (u_trauma * 0.3);
      gl_FragColor = vec4(finalShade * alpha, alpha * 0.72);
    }
  `;

  // --- WebGL Pipeline Setup ---

  function compileShader(type, source) {
    if (!gl) return null;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`[ShaderCompositor] Shader Compilation Error: ${err}`);
    }
    return shader;
  }

  function initProgram() {
    if (!gl) return;
    const vs = compileShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(program);
      throw new Error(`[ShaderCompositor] Program Link Error: ${err}`);
    }

    gl.useProgram(program);

    // Bind full-screen quad vertices
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform Caches
    uResolution = gl.getUniformLocation(program, 'u_resolution');
    uTime = gl.getUniformLocation(program, 'u_time');
    uTrauma = gl.getUniformLocation(program, 'u_trauma');
    uCurvature = gl.getUniformLocation(program, 'u_curvature');
    uScanlines = gl.getUniformLocation(program, 'u_scanlines');
    uAberration = gl.getUniformLocation(program, 'u_aberration');
  }

  function ensureCanvas() {
    if (typeof document === 'undefined') return;
    if (canvas?.parentElement) return;

    const cockpit = document.getElementById('game-cockpit');
    if (!cockpit) return;

    cockpit.style.position = 'relative';
    canvas = document.createElement('canvas');
    canvas.id = 'shader-compositor-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // Passthrough all clicks
    canvas.style.zIndex = '900';
    cockpit.appendChild(canvas);

    gl = (typeof canvas.getContext === 'function') 
      ? canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) 
      : null;

    if (!gl || typeof gl.createShader !== 'function') {
      gl = null;
      return;
    }

    initProgram();
    resize();
  }

  function resize() {
    if (!canvas || !gl) return;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 1000, height: 680 };
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    canvas.width = Math.floor((rect.width || 1000) * dpr);
    canvas.height = Math.floor((rect.height || 680) * dpr);
    if (gl.viewport) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // --- Execution Loop ---

  function render(time) {
    if (!gl || !program || !isEnabled) return;

    const dt = Math.min(0.05, (time - lastTime) / 1000) || 0.016;
    lastTime = time;

    // Decay trauma smoothly to zero
    if (trauma > 0.001) {
      trauma = Math.max(0.0, trauma - dt * 2.2);
    } else {
      trauma = 0.0;
    }

    gl.useProgram(program);
    if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, time * 0.001);
    if (uTrauma) gl.uniform1f(uTrauma, trauma);
    if (uCurvature) gl.uniform1f(uCurvature, 1.0); // 1.0 = Normal CRT curve
    if (uScanlines) gl.uniform1f(uScanlines, 1.0);
    if (uAberration) gl.uniform1f(uAberration, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (typeof requestAnimationFrame !== 'undefined') {
      animFrameId = requestAnimationFrame(render);
    }
  }

  function triggerTraumaSpike(amount = 0.6) {
    trauma = Math.min(1.0, trauma + amount);
  }

  return {
    init(bus) {
      eventBus = bus;
      ensureCanvas();

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', resize);
      }

      // Event Subscriptions for Dynamic Shading Responses
      if (eventBus && typeof eventBus.subscribe === 'function') {
        // Trauma surge on damage received
        eventBus.subscribe('combat:damage', ({ targetType, isCrit }) => {
          if (targetType === 'party') {
            triggerTraumaSpike(isCrit ? 0.8 : 0.45);
          }
        });

        // Flash burst on boss enrage & heavy SFX
        eventBus.subscribe('combat:sfx', ({ sfx }) => {
          if (sfx === 'ENCOUNTER_TRIGGER' || sfx === 'DEFEAT') {
            triggerTraumaSpike(0.7);
          }
        });

        // Toggle via Settings
        eventBus.subscribe('system:command', ({ command, enabled }) => {
          if (command === 'TOGGLE_SCANLINES') {
            isEnabled = Boolean(enabled);
            if (!isEnabled && gl?.clear) {
              gl.clear(gl.COLOR_BUFFER_BIT);
            }
          }
        });
      }

      if (gl && typeof requestAnimationFrame !== 'undefined') {
        animFrameId = requestAnimationFrame(render);
      }
    },

    triggerTrauma(intensity) {
      triggerTraumaSpike(intensity);
    },

    getDiagnostics() {
      return {
        driverId: 'shader_compositor',
        webglActive: Boolean(gl),
        currentTrauma: trauma,
        isEnabled,
      };
    },

    destroy() {
      if (animFrameId && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', resize);
      }
      if (canvas?.parentElement) {
        canvas.remove();
      }
      canvas = null;
      gl = null;
      program = null;
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightShaderCompositor = EmberlightShaderCompositor;
  window.EmberlightCompositor = EmberlightShaderCompositor;
}
