/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: HARDWARE WebGL CRT COMPOSITOR (TIER 3)
 * Document Identifier: ARCH-SPEC-SHADERS-002
 * Governing Protocol:  VSRP-001 / PRS-DES-018 / AC-07
 * Authority:           GPU-Accelerated Compositing & Spherical CRT Curvature
 * ============================================================================
 */

const EmberlightCompositor = (() => {
	const MODULE_INFO = Object.freeze({
		moduleId: "shader_compositor",
		version: "3.1.0",
		protocolVersion: "VSRP-001",
		capabilities: ["webgl_compositing", "crt_barrel_distortion"],
	});

	let gl = null;
	let program = null;
	let screenQuadBuffer = null;
	let sceneTexture = null;

	// --- Vertex Shader Source (Inline Attribute Mapping) ---
	const VS_SOURCE = `
        attribute vec2 position;
        varying vec2 vTexCoord;
        void main() {
            vTexCoord = position * 0.5 + 0.5;
            vTexCoord.y = 1.0 - vTexCoord.y; // Flip Y for traditional screen space coordinates
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

	// --- Fragment Shader Source (Pure Algorithmic Curvature Math) ---
	const FS_SOURCE = `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform sampler2D uSceneTex;
        uniform float uTime;
        uniform float uTraumaIntensity;

        // Radial distortion variables
        const float BARREL_K = 0.11;
        const float VIGNETTE_FALLOFF = 0.45;

        vec2 applyBarrelDistortion(vec2 coord) {
            vec2 cc = coord - 0.5;
            float distSq = dot(cc, cc);
            // Radial transformation factor: cc * (1.0 + k * r^2 + k_radial_2 * r^4)
            return 0.5 + cc * (1.0 + BARREL_K * distSq + (BARREL_K * 0.4) * distSq * distSq);
        }

        void main() {
            // 1. Calculate spherical coordinate displacement
            vec2 distortedCoord = applyBarrelDistortion(vTexCoord);

            // Strict viewport clip to draw abyssal screen borders outside the tube curve
            if (distortedCoord.x < 0.0 || distortedCoord.x > 1.0 || distortedCoord.y < 0.0 || distortedCoord.y > 1.0) {
                gl_FragColor = vec4(0.007, 0.007, 0.011, 1.0);
                return;
            }

            // 2. Chromatic Aberration channel offset linked directly to screen trauma values
            float splitOffset = 0.003 + (uTraumaIntensity * 0.008);
            float rChannel = texture2D(uSceneTex, distortedCoord - vec2(splitOffset, 0.0)).r;
            float gChannel = texture2D(uSceneTex, distortedCoord).g;
            float bChannel = texture2D(uSceneTex, distortedCoord + vec2(splitOffset, 0.0)).b;

            // 3. Apply horizontal CRT beam scanline traces
            float scanlineWeight = sin(distortedCoord.y * 720.0 + uTime * 4.0) * 0.06;
            vec3 compositeColor = vec3(rChannel, gChannel, bChannel) - scanlineWeight;

            // 4. Phosphor corner vignette attenuation falloff
            float vignette = distortedCoord.x * distortedCoord.y * (1.0 - distortedCoord.x) * (1.0 - distortedCoord.y);
            vignette = clamp(pow(16.0 * vignette, VIGNETTE_FALLOFF), 0.0, 1.0);
            compositeColor *= vignette;

            gl_FragColor = vec4(compositeColor, 1.0);
        }
    `;

	return {
		getModuleInfo() {
			return MODULE_INFO;
		},
		configure(config) {
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		init(context) {
			if (typeof document === "undefined") return;
			const canvas = document.getElementById("war-table-compositor-canvas");
			if (!canvas) return;

			gl = canvas.getContext("webgl", {
				antialias: false,
				depth: false,
				alpha: false,
			});
			if (!gl) return;

			// Compilation Pipeline Initialization
			const vs = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vs, VS_SOURCE);
			gl.compileShader(vs);

			const fs = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fs, FS_SOURCE);
			gl.compileShader(fs);

			program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
			gl.useProgram(program);

			// Quad rendering layout allocation (2 Triangles forming full screen mesh)
			const vertices = new Float32Array([
				-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
			]);
			screenQuadBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, screenQuadBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

			const posAttr = gl.getAttribLocation(program, "position");
			gl.enableVertexAttribArray(posAttr);
			gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

			// JIT Scene Texture generation allocation
			sceneTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		},

		reset() { },
		update(dt) { },

		/**
		 * Binds, uploads, and draws the primary 2D layout canvas onto the hardware shader compositor quad.
		 * Pure side-effect-free rendering transformation pass [AC-07].
		 */
		render(sourceCanvasElement, traumaIntensity = 0.0) {
			if (!gl || !program || !sourceCanvasElement) return;

			gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
			// Direct texture allocation upload from source DOM canvas frame layout
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				sourceCanvasElement,
			);

			gl.uniform1f(
				gl.getUniformLocation(program, "uTime"),
				performance.now() / 1000.0,
			);
			gl.uniform1f(
				gl.getUniformLocation(program, "uTraumaIntensity"),
				traumaIntensity,
			);

			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		},

		destroy() {
			if (gl) {
				if (screenQuadBuffer) gl.deleteBuffer(screenQuadBuffer);
				if (sceneTexture) gl.deleteTexture(sceneTexture);
				program = null;
				gl = null;
			}
		},
	};
})();

if (typeof window !== "undefined")
	window.EmberlightCompositor = EmberlightCompositor;
