/* cSpell:words highp */
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: WEBGL 2D BATCHER & CANVAS 2D LAYER ENGINE
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-GRAPHICS-2D
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Runtime Subsystem
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

//#region [SEC-05] Graphics Tier 1 & 2: WebGL 2D Batcher & Canvas 2D Layer Engine
const PhoenixWebGLBatcher = Object.freeze({
	DEFAULT_VS: `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
in vec4 a_color;
uniform vec2 u_resolution;
out vec2 v_uv;
out vec4 v_color;
void main() {
vec2 zeroToOne = a_pos / u_resolution;
vec2 zeroToTwo = zeroToOne * 2.0;
vec2 clipSpace = zeroToTwo - 1.0;
gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
v_uv = a_uv;
v_color = a_color;
}`,
	DEFAULT_FS: `#version 300 es
precision mediump float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_texture;
uniform int u_useTexture;
out vec4 fragColor;
void main() {
vec4 texColor = (u_useTexture == 1) ? texture(u_texture, v_uv) : vec4(1.0);
fragColor = texColor * v_color;
}`,
	POST_CRT_FS: `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_screen;
uniform float u_time;
uniform float u_scanlineIntensity;
out vec4 fragColor;
void main() {
vec2 uv = v_uv;
vec4 col = texture(u_screen, uv);
float scanline = sin(uv.y * 480.0 * 3.14159) * u_scanlineIntensity;
col.rgb -= scanline;
fragColor = col;
}`,

	/**
	 * @param {WebGL2RenderingContext | WebGLRenderingContext | null} gl
	 * @param {number} type
	 * @param {string} source
	 */
	compileShader(gl, type, source) {
		if (!gl) return null;
		const shader = gl.createShader(type);
		if (!shader) return null;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error("Shader compile error: " + info);
		}
		return shader;
	},

	/**
	 * @param {WebGL2RenderingContext | WebGLRenderingContext | null} gl
	 * @param {string} vsSource
	 * @param {string} fsSource
	 */
	createProgram(gl, vsSource, fsSource) {
		if (!gl) return null;
		const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
		const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
		if (!vs || !fs) return null;
		const program = gl.createProgram();
		if (!program) return null;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const info = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new Error("Program link error: " + info);
		}
		return program;
	},

	/**
	 * @param {WebGL2RenderingContext | WebGLRenderingContext | null} gl
	 * @param {number} [maxQuads=2000]
	 */
	createBatcher(gl, maxQuads = 2000) {
		if (!gl) {
			return {
				begin() { },
				drawQuad() { },
				flush() { return 0; },
				destroy() { }
			};
		}

		const program = this.createProgram(gl, this.DEFAULT_VS, this.DEFAULT_FS);
		if (!program) {
			return {
				begin() { },
				drawQuad() { },
				flush() { return 0; },
				destroy() { }
			};
		}
		const uResLoc = gl.getUniformLocation(program, "u_resolution");
		const uUseTexLoc = gl.getUniformLocation(program, "u_useTexture");

		const aPosLoc = gl.getAttribLocation(program, "a_pos");
		const aUvLoc = gl.getAttribLocation(program, "a_uv");
		const aColorLoc = gl.getAttribLocation(program, "a_color");

		const FLOATS_PER_VERTEX = 8;
		const VERTICES_PER_QUAD = 6;
		const bufferData = new Float32Array(maxQuads * VERTICES_PER_QUAD * FLOATS_PER_VERTEX);
		let quadCount = 0;

		const gl2 = /** @type {WebGL2RenderingContext} */ (/** @type {unknown} */ (gl));
		const vbo = gl.createBuffer();
		const vao = typeof gl2.createVertexArray === "function" ? gl2.createVertexArray() : null;

		if (vao && typeof gl2.bindVertexArray === "function") gl2.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, bufferData.byteLength, gl.DYNAMIC_DRAW);

		const stride = FLOATS_PER_VERTEX * 4;
		if (aPosLoc !== -1) {
			gl.enableVertexAttribArray(aPosLoc);
			gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, stride, 0);
		}
		if (aUvLoc !== -1) {
			gl.enableVertexAttribArray(aUvLoc);
			gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, stride, 2 * 4);
		}
		if (aColorLoc !== -1) {
			gl.enableVertexAttribArray(aColorLoc);
			gl.vertexAttribPointer(aColorLoc, 4, gl.FLOAT, false, stride, 4 * 4);
		}

		return {
			/**
			 * @param {number} width
			 * @param {number} height
			 */
			begin(width, height) {
				quadCount = 0;
				gl.useProgram(program);
				if (uResLoc) gl.uniform2f(uResLoc, width, height);
				if (uUseTexLoc) gl.uniform1i(uUseTexLoc, 0);
				if (vao && typeof gl2.bindVertexArray === "function") gl2.bindVertexArray(vao);
				else gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			},

			/**
			 * @param {number} x
			 * @param {number} y
			 * @param {number} w
			 * @param {number} h
			 * @param {number[] | { u0?: number; v0?: number; u1?: number; v1?: number }} [uvs]
			 * @param {number[] | { r?: number; g?: number; b?: number; a?: number }} [color]
			 */
			drawQuad(x, y, w, h, uvs = [ 0, 0, 1, 1 ], color = [ 1, 1, 1, 1 ]) {
				if (quadCount >= maxQuads) this.flush();

				let u0 = 0, v0 = 0, u1 = 1, v1 = 1;
				if (Array.isArray(uvs)) {
					[ u0 = 0, v0 = 0, u1 = 1, v1 = 1 ] = uvs;
				} else if (uvs && typeof uvs === "object") {
					({ u0 = 0, v0 = 0, u1 = 1, v1 = 1 } = uvs);
				}

				let r = 1, g = 1, b = 1, a = 1;
				if (Array.isArray(color)) {
					[ r = 1, g = 1, b = 1, a = 1 ] = color;
				} else if (color && typeof color === "object") {
					({ r = 1, g = 1, b = 1, a = 1 } = color);
				}

				const offset = quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX;
				const x2 = x + w;
				const y2 = y + h;

				bufferData[ offset ] = x; bufferData[ offset + 1 ] = y; bufferData[ offset + 2 ] = u0; bufferData[ offset + 3 ] = v0;
				bufferData[ offset + 4 ] = r; bufferData[ offset + 5 ] = g; bufferData[ offset + 6 ] = b; bufferData[ offset + 7 ] = a;

				bufferData[ offset + 8 ] = x2; bufferData[ offset + 9 ] = y; bufferData[ offset + 10 ] = u1; bufferData[ offset + 11 ] = v0;
				bufferData[ offset + 12 ] = r; bufferData[ offset + 13 ] = g; bufferData[ offset + 14 ] = b; bufferData[ offset + 15 ] = a;

				bufferData[ offset + 16 ] = x; bufferData[ offset + 17 ] = y2; bufferData[ offset + 18 ] = u0; bufferData[ offset + 19 ] = v1;
				bufferData[ offset + 20 ] = r; bufferData[ offset + 21 ] = g; bufferData[ offset + 22 ] = b; bufferData[ offset + 23 ] = a;

				bufferData[ offset + 24 ] = x2; bufferData[ offset + 25 ] = y; bufferData[ offset + 26 ] = u1; bufferData[ offset + 27 ] = v0;
				bufferData[ offset + 28 ] = r; bufferData[ offset + 29 ] = g; bufferData[ offset + 30 ] = b; bufferData[ offset + 31 ] = a;

				bufferData[ offset + 32 ] = x2; bufferData[ offset + 33 ] = y2; bufferData[ offset + 34 ] = u1; bufferData[ offset + 35 ] = v1;
				bufferData[ offset + 36 ] = r; bufferData[ offset + 37 ] = g; bufferData[ offset + 38 ] = b; bufferData[ offset + 39 ] = a;

				bufferData[ offset + 40 ] = x; bufferData[ offset + 41 ] = y2; bufferData[ offset + 42 ] = u0; bufferData[ offset + 43 ] = v1;
				bufferData[ offset + 44 ] = r; bufferData[ offset + 45 ] = g; bufferData[ offset + 46 ] = b; bufferData[ offset + 47 ] = a;

				quadCount++;
			},

			flush() {
				if (quadCount === 0) return 0;
				const count = quadCount;
				gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, bufferData.subarray(0, quadCount * VERTICES_PER_QUAD * FLOATS_PER_VERTEX));
				gl.drawArrays(gl.TRIANGLES, 0, quadCount * VERTICES_PER_QUAD);
				quadCount = 0;
				return count;
			},

			destroy() {
				if (vbo) gl.deleteBuffer(vbo);
				if (program) gl.deleteProgram(program);
				if (vao && typeof gl2.deleteVertexArray === "function") gl2.deleteVertexArray(vao);
			}
		};
	},

	createParticleSystem(maxParticles = 500) {
		/** @type {Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number[]; size: number }>} */
		const particles = [];
		let prngSeed = 0x12345678;
		function nextFloat() {
			prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
			return prngSeed / 4294967296;
		}

		return {
			/**
			 * @param {number} x
			 * @param {number} y
			 * @param {number} [count=10]
			 * @param {{ color?: number[]; speed?: number; life?: number; size?: number }} [config]
			 */
			emit(x, y, count = 10, { color = [ 0, 1, 0.8, 1 ], speed = 2, life = 1.0, size = 4 } = {}) {
				for (let i = 0; i < count && particles.length < maxParticles; i++) {
					const angle = nextFloat() * Math.PI * 2;
					const spd = (nextFloat() * 0.8 + 0.2) * speed;
					particles.push({
						x,
						y,
						vx: Math.cos(angle) * spd,
						vy: Math.sin(angle) * spd,
						life,
						maxLife: life,
						size,
						color: color.slice()
					});
				}
			},

			/**
			 * @param {number} dt
			 */
			update(dt) {
				for (let i = particles.length - 1; i >= 0; i--) {
					const p = particles[ i ];
					p.x += p.vx;
					p.y += p.vy;
					p.life -= dt;
					if (p.life <= 0) {
						particles.splice(i, 1);
					}
				}
			},

			/**
			 * @param {{ drawQuad: (arg0: number, arg1: number, arg2: number, arg3: number, arg4?: number[] | { u0?: number; v0?: number; u1?: number; v1?: number }, arg5?: number[] | { r?: number; g?: number; b?: number; a?: number }) => void; }} batcher
			 */
			render(batcher) {
				for (const p of particles) {
					const alpha = Math.max(0, p.life / p.maxLife) * (p.color[ 3 ] || 1);
					batcher.drawQuad(
						p.x - p.size / 2,
						p.y - p.size / 2,
						p.size,
						p.size,
						[ 0, 0, 1, 1 ],
						[ p.color[ 0 ], p.color[ 1 ], p.color[ 2 ], alpha ]
					);
				}
			},

			getCount() {
				return particles.length;
			},

			clear() {
				particles.length = 0;
			}
		};
	}
});

// =========================================================================
// [GRAPHICS TIER 2] Canvas 2D Viewport Matrix & Tilemap Layer Engine
// =========================================================================
const PhoenixCanvas2DLayerEngine = Object.freeze({
	createCamera({ x = 0, y = 0, zoom = 1, minZoom = 0.25, maxZoom = 4 } = {}) {
		let trauma = 0;
		let rot = 0;
		let prngSeed = 0x98765432;
		function nextFloat() {
			prngSeed = (prngSeed * 1664525 + 1013904223) >>> 0;
			return prngSeed / 4294967296;
		}

		return {
			x,
			y,
			zoom,
			rotation: rot,
			/**
			 * @param {number} amount
			 */
			addTrauma(amount) {
				trauma = Math.min(1.0, trauma + amount);
			},
			/**
			 * @param {number} dt
			 */
			update(dt) {
				if (trauma > 0) {
					trauma = Math.max(0, trauma - dt * 1.5);
				}
			},
			/**
			 * @param {number} targetX
			 * @param {number} targetY
			 */
			lookAt(targetX, targetY, lerp = 0.1) {
				this.x += (targetX - this.x) * lerp;
				this.y += (targetY - this.y) * lerp;
			},
			/**
			 * @param {number} z
			 */
			setZoom(z) {
				this.zoom = Math.max(minZoom, Math.min(maxZoom, z));
			},
			getShakeOffset() {
				const shake = trauma * trauma;
				const offsetX = (nextFloat() * 2 - 1) * shake * 16;
				const offsetY = (nextFloat() * 2 - 1) * shake * 16;
				const offsetAngle = (nextFloat() * 2 - 1) * shake * 0.1;
				return { offsetX, offsetY, offsetAngle };
			},
			/**
			 * @param {{ save: () => void; translate: (arg0: number, arg1: number) => void; rotate: (arg0: number) => void; scale: (arg0: number, arg1: number) => void; }} ctx
			 * @param {number} viewportW
			 * @param {number} viewportH
			 */
			applyTransform(ctx, viewportW, viewportH) {
				const { offsetX, offsetY, offsetAngle } = this.getShakeOffset();
				ctx.save();
				ctx.translate((viewportW / 2) + offsetX, (viewportH / 2) + offsetY);
				ctx.rotate(this.rotation + offsetAngle);
				ctx.scale(this.zoom, this.zoom);
				ctx.translate(-this.x, -this.y);
			},
			/**
			 * @param {{ restore: () => void; }} ctx
			 */
			resetTransform(ctx) {
				ctx.restore();
			},
			/**
			 * @param {number} worldX
			 * @param {number} worldY
			 * @param {number} viewportW
			 * @param {number} viewportH
			 */
			worldToScreen(worldX, worldY, viewportW, viewportH) {
				return {
					x: (worldX - this.x) * this.zoom + (viewportW / 2),
					y: (worldY - this.y) * this.zoom + (viewportH / 2)
				};
			},
			/**
			 * @param {number} screenX
			 * @param {number} screenY
			 * @param {number} viewportW
			 * @param {number} viewportH
			 */
			screenToWorld(screenX, screenY, viewportW, viewportH) {
				return {
					x: (screenX - (viewportW / 2)) / this.zoom + this.x,
					y: (screenY - (viewportH / 2)) / this.zoom + this.y
				};
			}
		};
	},

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {(number | string)[][]} grid
	 * @param {number} tileSize
	 * @param {Record<string | number, string | { color: string }>} tilePalette
	 * @param {{ screenToWorld: (sx: number, sy: number, vw: number, vh: number) => { x: number; y: number } }} camera
	 * @param {number} viewportW
	 * @param {number} viewportH
	 */
	renderTilemap(ctx, grid, tileSize, tilePalette, camera, viewportW, viewportH) {
		if (!grid || !Array.isArray(grid) || grid.length === 0) return 0;
		const rows = grid.length;
		const cols = grid[ 0 ].length;

		const topLeft = camera.screenToWorld(0, 0, viewportW, viewportH);
		const botRight = camera.screenToWorld(viewportW, viewportH, viewportW, viewportH);

		const minCol = Math.max(0, Math.floor(topLeft.x / tileSize));
		const maxCol = Math.min(cols - 1, Math.floor(botRight.x / tileSize) + 1);
		const minRow = Math.max(0, Math.floor(topLeft.y / tileSize));
		const maxRow = Math.min(rows - 1, Math.floor(botRight.y / tileSize) + 1);

		let renderedTiles = 0;
		for (let r = minRow; r <= maxRow; r++) {
			const rowData = grid[ r ];
			if (!rowData) continue;
			for (let c = minCol; c <= maxCol; c++) {
				const tileId = rowData[ c ];
				if (tileId === undefined || tileId === null || tileId === 0 || tileId === " " || tileId === ".") continue;

				const drawX = c * tileSize;
				const drawY = r * tileSize;
				const paletteEntry = tilePalette[ tileId ];

				if (typeof paletteEntry === "string") {
					ctx.fillStyle = paletteEntry;
					ctx.fillRect(drawX, drawY, tileSize, tileSize);
				} else if (paletteEntry?.color) {
					ctx.fillStyle = paletteEntry.color;
					ctx.fillRect(drawX, drawY, tileSize, tileSize);
				}
				renderedTiles++;
			}
		}
		return renderedTiles;
	},

	/**
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {string | HTMLCanvasElement | ImageBitmap} colorOrCanvas
	 * @param {number} speedRatio
	 * @param {{ x: number; y: number; }} camera
	 * @param {number} viewportW
	 * @param {number} viewportH
	 */
	renderParallax(ctx, colorOrCanvas, speedRatio, camera, viewportW, viewportH) {
		ctx.save();
		const offsetX = -(camera.x * speedRatio) % viewportW;
		const offsetY = -(camera.y * speedRatio) % viewportH;

		if (typeof colorOrCanvas === "string") {
			ctx.fillStyle = colorOrCanvas;
			ctx.fillRect(0, 0, viewportW, viewportH);
		} else if (colorOrCanvas?.width) {
			for (let x = offsetX - viewportW; x < viewportW * 2; x += colorOrCanvas.width) {
				for (let y = offsetY - viewportH; y < viewportH * 2; y += colorOrCanvas.height) {
					ctx.drawImage(colorOrCanvas, x, y);
				}
			}
		}
		ctx.restore();
	},

	get SpriteGenerator() { return PhoenixSpriteGenerator; },
	get Harmonics() { return HarmonicTransform; }
});
//#endregion

//#region [SEC-06] Procedural 2D Micro-Commodities: Sprite Generator & Harmonics
/**
 * Procedural Pixel Sprite Generator (Trevor Martin 2011 / Jared Tarbell 2003 InvaderFractal).
 * Generates vertical bilateral symmetric sprite bitmaps deterministically from a 32-bit seed.
 */
const PhoenixSpriteGenerator = Object.freeze({
	PALETTES: Object.freeze({
		DAWNBRINGER_16: Object.freeze([
			'transparent', '#140c1c', '#442434', '#30346d',
			'#4e4a4e', '#854c30', '#346524', '#d04648',
			'#757161', '#597dce', '#d27d2c', '#8595a1',
			'#6daa2c', '#d2aa99', '#6dc2ca', '#dad45e'
		]),
		PICO_8: Object.freeze([
			'transparent', '#000000', '#1D2B53', '#7E2553',
			'#008751', '#AB5236', '#5F574F', '#C2C3C7',
			'#FFF1E8', '#FF004D', '#FFA300', '#FFEC27',
			'#00E436', '#29ADFF', '#83769C', '#FF77A8'
		]),
		GAMEBOY_4: Object.freeze([
			'transparent', '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
		])
	}),

	/**
	 * Seed-driven PRNG generator (deterministic Mulberry32)
	 * @param {number} seed
	 * @returns {() => number} Float between 0 and 1
	 */
	createRNG(seed) {
		let s = (Number(seed) >>> 0) || 1337;
		return () => {
			s = (s + 0x6D2B79F5) >>> 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	},

	/**
	 * Generates a bilateral vertically symmetric sprite bitmap.
	 * @param {number} seed - 32-bit integer seed
	 * @param {Object} [options]
	 * @param {number} [options.width=12] - Sprite width
	 * @param {number} [options.height=12] - Sprite height
	 * @param {number} [options.bodyProbability=0.5] - Likelihood of body pixel
	 * @param {number} [options.shadeProbability=0.3] - Likelihood of shading pixel
	 * @param {boolean} [options.outline=true] - Whether to generate boundary outline
	 * @returns {{ width: number, height: number, data: Uint8Array, seed: number }}
	 */
	generate(seed = 1337, {
		width = 12,
		height = 12,
		bodyProbability = 0.5,
		shadeProbability = 0.3,
		outline = true
	} = {}) {
		const rng = this.createRNG(seed);
		const data = new Uint8Array(width * height);
		const halfW = Math.ceil(width / 2);

		// 1. Generate half-grid body (1) and shade (2), mirror horizontally
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < halfW; x++) {
				const isMargin = (y === 0 || y === height - 1 || x === 0);
				const prob = isMargin ? bodyProbability * 0.4 : bodyProbability;

				let val = 0;
				if (rng() < prob) {
					val = rng() < shadeProbability ? 2 : 1;
				}

				data[ y * width + x ] = val;
				data[ y * width + (width - 1 - x) ] = val;
			}
		}

		// 2. Generate 1px outline/border (3) around solid pixels (1 and 2)
		if (outline) {
			const outlined = new Uint8Array(data);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const idx = y * width + x;
					if (data[ idx ] !== 0) continue;

					let hasSolidNeighbor = false;
					if (x > 0 && data[ idx - 1 ] > 0 && data[ idx - 1 ] < 3) hasSolidNeighbor = true;
					else if (x < width - 1 && data[ idx + 1 ] > 0 && data[ idx + 1 ] < 3) hasSolidNeighbor = true;
					else if (y > 0 && data[ idx - width ] > 0 && data[ idx - width ] < 3) hasSolidNeighbor = true;
					else if (y < height - 1 && data[ idx + width ] > 0 && data[ idx + width ] < 3) hasSolidNeighbor = true;

					if (hasSolidNeighbor) {
						outlined[ idx ] = 3;
					}
				}
			}
			return { width, height, data: outlined, seed };
		}

		return { width, height, data, seed };
	},

	/**
	 * Cycles / shifts specific palette color indices for animated flows (lava, glowing weapons).
	 * @param {readonly string[]} palette
	 * @param {number[]} shiftIndices - Array of indices in palette to rotate
	 * @param {number} offset - Rotation step
	 * @returns {string[]}
	 */
	shiftPalette(palette, shiftIndices, offset = 1) {
		const out = [ ...palette ];
		const n = shiftIndices.length;
		if (n === 0) return out;
		const effectiveOffset = ((offset % n) + n) % n;
		for (let i = 0; i < n; i++) {
			const targetIdx = (i + effectiveOffset) % n;
			out[ shiftIndices[ targetIdx ] ] = palette[ shiftIndices[ i ] ];
		}
		return out;
	},

	/**
	 * Renders sprite bitmap directly to a Canvas 2D context.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {{ width: number, height: number, data: Uint8Array }} sprite
	 * @param {number} dx - Target X coordinate
	 * @param {number} dy - Target Y coordinate
	 * @param {number} [scale=2] - Pixel scale multiplier
	 * @param {readonly string[]} [palette] - Palette array (indices 0..3)
	 */
	renderToCanvas(ctx, sprite, dx, dy, scale = 2, palette = this.PALETTES.DAWNBRINGER_16) {
		if (!ctx || !sprite?.data) return;
		const { width, height, data } = sprite;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const val = data[ y * width + x ];
				if (val === 0) continue;
				ctx.fillStyle = palette[ val ] || '#ffffff';
				ctx.fillRect(dx + x * scale, dy + y * scale, scale, scale);
			}
		}
	}
});

/**
 * Procedural Harmonic Transform Helper.
 * Computes sinusoidal squash-and-stretch matrices for procedural walk and breathing cycles.
 */
const HarmonicTransform = Object.freeze({
	/**
	 * Computes sinusoidal bobbing and squash-and-stretch matrices for procedural animation.
	 * @param {number} tick - Monotonic animation time / frame tick
	 * @param {number} [frequency=8.0] - Oscillation speed
	 * @param {number} [bobAmplitude=2.5] - Vertical bobbing pixels
	 * @param {number} [squashFactor=0.08] - Squash and stretch ratio
	 * @returns {{ bobY: number, squashX: number, squashY: number }}
	 */
	getTransform(tick, frequency = 8.0, bobAmplitude = 2.5, squashFactor = 0.08) {
		const phase = tick * frequency;
		const bobY = Math.sin(phase) * bobAmplitude;
		const squashX = 1.0 + Math.cos(phase) * squashFactor;
		const squashY = 1.0 - Math.cos(phase) * squashFactor;
		return { bobY, squashX, squashY };
	},

	/**
	 * Applies transform matrix around a sprite's bottom-center anchor.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {number} x - Sprite bottom-center X
	 * @param {number} y - Sprite bottom-center Y
	 * @param {number} width - Sprite display width
	 * @param {number} height - Sprite display height
	 * @param {{ bobY: number, squashX: number, squashY: number }} transform
	 */
	applyTransform(ctx, x, y, width, height, transform) {
		ctx.translate(x, y + transform.bobY);
		ctx.scale(transform.squashX, transform.squashY);
		ctx.translate(-width / 2, -height);
	}
});
//#endregion

	global.PhoenixWebGLBatcher = PhoenixWebGLBatcher;
	global.PhoenixCanvas2DLayerEngine = PhoenixCanvas2DLayerEngine;
	global.PhoenixSpriteGenerator = PhoenixSpriteGenerator;
	global.HarmonicTransform = HarmonicTransform;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { PhoenixWebGLBatcher, PhoenixCanvas2DLayerEngine, PhoenixSpriteGenerator, HarmonicTransform };
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
