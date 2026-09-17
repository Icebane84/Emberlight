/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: HARDWARE SHADER COMPOSITOR & CRT PIPELINE
 * Document Identifier: VSRP-001-SHADER-COMPOSITOR
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Context Initialization, WebGL Shaders & Program Binding
 *   [SEC-02] GLSL Compositor Shaders & Kinetic Render Loop
 *   [SEC-03] Event Subscriptions & Public VSRP-001 Peripheral Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} ShaderDiagnostics
 * @property {string} driverId Internal driver identifier string.
 * @property {boolean} webglActive WebGL context active status flag.
 * @property {number} currentTrauma Current trauma value.
 * @property {boolean} isEnabled Compositor enabled state flag.
 */

/**
 * @typedef {Object} ShaderEventBus
 * @property {(event: string, handler: (payload?: any) => void) => (() => void) | void} [subscribe] Subscription registration function.
 * @property {(event: string, payload?: any) => void} [publish] Event publishing function.
 */

const EmberlightShaderCompositor = (() => {
	//#region [SEC-01] Type Definitions, Context Initialization, WebGL Shaders & Program Binding
	/** @type {HTMLCanvasElement|null} */
	let canvas = null;
	/** @type {WebGLRenderingContext|null} */
	let gl = null;
	/** @type {ShaderEventBus|null} */
	let eventBus = null;
	/** @type {number|null} */
	let animFrameId = null;

	// Program & Shaders
	/** @type {WebGLProgram|null} */
	let program = null;
	/** @type {WebGLBuffer|null} */
	let quadBuffer = null;

	// Shader Uniform Locations
	/** @type {WebGLUniformLocation|null} */
	let uResolution = null;
	/** @type {WebGLUniformLocation|null} */
	let uTime = null;
	/** @type {WebGLUniformLocation|null} */
	let uTrauma = null;
	/** @type {WebGLUniformLocation|null} */
	let uCurvature = null;
	/** @type {WebGLUniformLocation|null} */
	let uScanlines = null;
	/** @type {WebGLUniformLocation|null} */
	let uAberration = null;

	// Kinetic Uniform State
	let trauma = 0.0; // Dynamic hit-flash and chromatic surge
	let isEnabled = true;
	let lastTime = 0;

	/**
	 * Compiles a WebGL shader from source.
	 * (State-mutating WebGL utility)
	 * @param {number} type Shader type constant.
	 * @param {string} source GLSL source code string.
	 * @returns {WebGLShader|null} Compiled shader object or null.
	 */
	function compileShader(type, source) {
		if (!gl) return null;
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const err = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error(`[ShaderCompositor] Shader Compilation Error: ${err}`);
		}
		return shader;
	}

	/**
	 * Initializes the WebGL shader program and attribute pointers.
	 * (State-mutating WebGL initialization procedure)
	 * @returns {void}
	 */
	function initProgram() {
		if (!gl) return;
		const vs = compileShader(gl.VERTEX_SHADER, VS_SOURCE);
		const fs = compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
		if (!vs || !fs) return;

		program = gl.createProgram();
		if (!program) return;
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

	/**
	 * Ensures the WebGL compositor canvas is mounted inside the game cockpit.
	 * (State-mutating DOM initialization procedure)
	 * @returns {void}
	 */
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

		const ctx = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
		gl = /** @type {WebGLRenderingContext|null} */ (ctx);

		if (!gl || typeof gl.createShader !== 'function') {
			gl = null;
			return;
		}

		initProgram();
		resize();
	}

	/**
	 * Resizes the WebGL viewport and canvas buffer dimensions.
	 * (State-mutating viewport adjustment utility)
	 * @returns {void}
	 */
	function resize() {
		if (!canvas || !gl) return;
		const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 1000, height: 680 };
		const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
		canvas.width = Math.floor((rect.width || 1000) * dpr);
		canvas.height = Math.floor((rect.height || 680) * dpr);
		if (gl.viewport) gl.viewport(0, 0, canvas.width, canvas.height);
	}
	//#endregion

	//#region [SEC-02] GLSL Compositor Shaders & Kinetic Render Loop
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

	/**
	 * Renders a shader frame in the kinetic animation loop.
	 * (State-mutating WebGL render loop)
	 * @param {number} time High-resolution timestamp.
	 * @returns {void}
	 */
	function render(time) {
		if (!gl || !program || !isEnabled || !canvas) return;

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

	/**
	 * Triggers or increases the trauma shake level.
	 * (State-mutating utility)
	 * @param {number} [amount=0.6] Trauma increment amount.
	 * @returns {void}
	 */
	function triggerTraumaSpike(amount = 0.6) {
		trauma = Math.min(1.0, trauma + amount);
	}
	//#endregion

	//#region [SEC-03] Event Subscriptions & Public VSRP-001 Peripheral Gateway
	return {
		/**
		 * Initializes the shader compositor and binds event subscriptions.
		 * (State-mutating lifecycle gateway)
		 * @param {ShaderEventBus} [bus] Event bus handle reference.
		 * @returns {void}
		 */
		init(bus) {
			eventBus = bus || null;
			ensureCanvas();

			if (typeof window !== 'undefined') {
				window.addEventListener('resize', resize);
			}

			// Event Subscriptions for Dynamic Shading Responses
			if (eventBus && typeof eventBus.subscribe === 'function') {
				// Trauma surge on damage received
				eventBus.subscribe('combat:damage', (/** @type {{targetType: string, isCrit?: boolean}} */ payload) => {
					if (payload?.targetType === 'party') {
						triggerTraumaSpike(payload.isCrit ? 0.8 : 0.45);
					}
				});

				// Flash burst on boss enrage & heavy SFX
				eventBus.subscribe('combat:sfx', (/** @type {{sfx?: string}} */ payload) => {
					if (payload?.sfx === 'ENCOUNTER_TRIGGER' || payload?.sfx === 'DEFEAT') {
						triggerTraumaSpike(0.7);
					}
				});

				// Toggle via Settings
				eventBus.subscribe('system:command', (/** @type {{command?: string, enabled?: boolean}} */ payload) => {
					if (payload?.command === 'TOGGLE_SCANLINES') {
						isEnabled = Boolean(payload.enabled);
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

		/**
		 * Public trigger for screen trauma effects.
		 * (State-mutating action gateway)
		 * @param {number} intensity Trauma intensity value.
		 * @returns {void}
		 */
		triggerTrauma(intensity) {
			triggerTraumaSpike(intensity);
		},

		/**
		 * Returns real-time diagnostic telemetry for the shader compositor.
		 * (Pure telemetry collector)
		 * @returns {ShaderDiagnostics} Diagnostic report dictionary.
		 */
		getDiagnostics() {
			return {
				driverId: 'shader_compositor',
				webglActive: Boolean(gl),
				currentTrauma: trauma,
				isEnabled,
			};
		},

		/**
		 * Purges runtime WebGL allocations and event listeners.
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
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
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightShaderCompositor = EmberlightShaderCompositor;
	(/** @type {any} */ (window)).EmberlightCompositor = EmberlightShaderCompositor;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightShaderCompositor;
}