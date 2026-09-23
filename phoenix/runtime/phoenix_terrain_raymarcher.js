/* cSpell:words Raymarcher Raymarch heightmap Raymarching highp fract */
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: DEMOSCENE PROCEDURAL TERRAIN RAYMARCHER
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-TERRAIN-RAYMARCHER
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Runtime Subsystem
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

//#region [SEC-08] Graphics Tier 5: Demoscene Procedural Terrain Raymarcher
const PhoenixTerrainRaymarcher = Object.freeze({
	/**
	 * Deterministic 2D PRNG Hash
	 * @param {number} x
	 * @param {number} z
	 */
	hash2(x, z) {
		const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
		return n - Math.floor(n);
	},

	/**
	 * Smooth 2D Interpolated Value Noise
	 * @param {number} x
	 * @param {number} z
	 */
	noise2(x, z) {
		const ix = Math.floor(x);
		const iz = Math.floor(z);
		const fx = x - ix;
		const fz = z - iz;

		const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
		const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

		const a = this.hash2(ix, iz);
		const b = this.hash2(ix + 1, iz);
		const c = this.hash2(ix, iz + 1);
		const d = this.hash2(ix + 1, iz + 1);

		return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
	},

	/**
	 * Fractional Brownian Motion (FBM) Multi-Octave Noise
	 * @param {number} x
	 * @param {number} z
	 * @param {number} [octaves=5]
	 */
	fbm(x, z, octaves = 5) {
		let total = 0.0;
		let amplitude = 0.5;
		let frequency = 1.0;

		for (let i = 0; i < octaves; i++) {
			total += amplitude * this.noise2(x * frequency, z * frequency);
			frequency *= 2.02;
			amplitude *= 0.5;
		}
		return total;
	},

	/**
	 * Sample elevation height at world coordinate (x, z)
	 * @param {number} x
	 * @param {number} z
	 * @param {number} [scale=0.035]
	 * @param {number} [maxHeight=24]
	 */
	sampleHeight(x, z, scale = 0.035, maxHeight = 24) {
		const raw = this.fbm(x * scale, z * scale, 5);
		const elevation = Math.pow(raw, 1.4) * maxHeight;
		return Math.max(0.5, elevation);
	},

	/**
	 * Compute analytical surface normal at world coordinate (x, z)
	 * @param {number} x
	 * @param {number} z
	 * @param {number} [eps=0.15]
	 */
	computeNormal(x, z, eps = 0.15) {
		const hL = this.sampleHeight(x - eps, z);
		const hR = this.sampleHeight(x + eps, z);
		const hD = this.sampleHeight(x, z - eps);
		const hU = this.sampleHeight(x, z + eps);

		const nx = hL - hR;
		const ny = 2.0 * eps;
		const nz = hD - hU;
		const len = Math.hypot(nx, ny, nz) || 1.0;

		return [ nx / len, ny / len, nz / len ];
	},

	/**
	 * Raymarch across procedural heightmap terrain
	 * @param {{ x: number; y: number; z: number }} origin
	 * @param {{ x: number; y: number; z: number }} dir
	 * @param {number} [maxDist=120]
	 * @param {number} [stepSize=0.6]
	 */
	castTerrainRay(origin, dir, maxDist = 120, stepSize = 0.6) {
		let t = 0.5;
		let hit = false;
		let px = origin.x;
		let py = origin.y;
		let pz = origin.z;
		let currentHeight = 0;

		while (t < maxDist) {
			px = origin.x + dir.x * t;
			py = origin.y + dir.y * t;
			pz = origin.z + dir.z * t;

			currentHeight = this.sampleHeight(px, pz);
			if (py <= currentHeight) {
				hit = true;
				break;
			}

			const distAboveTerrain = py - currentHeight;
			t += Math.max(stepSize, distAboveTerrain * 0.4);
		}

		if (!hit) {
			return { hit: false, distance: maxDist, x: px, y: py, z: pz, height: 0, normal: [ 0, 1, 0 ], material: 'sky' };
		}

		const normal = this.computeNormal(px, pz);
		let material = 'grass';
		if (currentHeight < 2.0) material = 'water';
		else if (currentHeight > 16.0) material = 'snow';
		else if (normal[ 1 ] < 0.65) material = 'rock';

		return {
			hit: true,
			distance: t,
			x: px,
			y: py,
			z: pz,
			height: currentHeight,
			normal,
			material
		};
	},

	/**
	 * Render Procedural Landscape with Sun Lighting & Atmosphere to 2D Canvas
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {{ x: number; y: number; z: number; yaw: number; pitch: number }} camera
	 * @param {number} screenW
	 * @param {number} screenH
	 * @param {{ fov?: number; numRays?: number; sunAngle?: number; fogDensity?: number }} [options]
	 */
	renderTerrainView(ctx, camera, screenW, screenH, {
		fov = Math.PI / 3,
		numRays = 160,
		sunAngle = 0.8,
		fogDensity = 0.015
	} = {}) {
		if (!ctx) return;

		const sunX = Math.cos(sunAngle);
		const sunY = Math.sin(sunAngle);
		const sunZ = 0.5;

		const skyGrad = ctx.createLinearGradient(0, 0, 0, screenH);
		skyGrad.addColorStop(0.0, '#030814');
		skyGrad.addColorStop(0.5, '#0b1d3a');
		skyGrad.addColorStop(0.7, '#1b3b6f');
		skyGrad.addColorStop(1.0, '#468faf');
		ctx.fillStyle = skyGrad;
		ctx.fillRect(0, 0, screenW, screenH);

		const sunScreenY = screenH * 0.35 - (camera.pitch || 0) * (screenH / 2);
		const sunScreenX = screenW * 0.65 - (camera.yaw || 0) * 120;
		const sunGlow = ctx.createRadialGradient(sunScreenX, sunScreenY, 5, sunScreenX, sunScreenY, 80);
		sunGlow.addColorStop(0.0, 'rgba(255, 235, 180, 0.9)');
		sunGlow.addColorStop(0.3, 'rgba(255, 180, 80, 0.4)');
		sunGlow.addColorStop(1.0, 'rgba(255, 120, 50, 0.0)');
		ctx.fillStyle = sunGlow;
		ctx.beginPath();
		ctx.arc(sunScreenX, sunScreenY, 80, 0, Math.PI * 2);
		ctx.fill();

		const sliceW = screenW / numRays;
		const cosPitch = Math.cos(camera.pitch || 0);
		const sinPitch = Math.sin(camera.pitch || 0);

		for (let i = 0; i < numRays; i++) {
			const rayYaw = (camera.yaw || 0) - fov / 2 + (i / numRays) * fov;
			const rayDir = {
				x: Math.cos(rayYaw) * cosPitch,
				y: sinPitch - 0.15,
				z: Math.sin(rayYaw) * cosPitch
			};

			const result = this.castTerrainRay(camera, rayDir, 90);
			if (result.hit) {
				const correctedDist = Math.max(0.1, result.distance * Math.cos(rayYaw - (camera.yaw || 0)));
				const horizonOffset = sinPitch * (screenH / 2);
				const drawTop = (screenH / 2) + horizonOffset - (result.height * 2.5);

				const dotSun = Math.max(0.1, result.normal[ 0 ] * sunX + result.normal[ 1 ] * sunY + result.normal[ 2 ] * sunZ);

				let r = 20, g = 140, b = 60;
				if (result.material === 'snow') { r = 220; g = 235; b = 255; }
				else if (result.material === 'rock') { r = 90; g = 95; b = 105; }
				else if (result.material === 'water') { r = 0; g = 120; b = 210; }

				const fog = Math.min(1.0, correctedDist * fogDensity);
				const finalR = Math.round(r * dotSun * (1.0 - fog) + 27 * fog);
				const finalG = Math.round(g * dotSun * (1.0 - fog) + 59 * fog);
				const finalB = Math.round(b * dotSun * (1.0 - fog) + 111 * fog);

				ctx.fillStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
				ctx.fillRect(i * sliceW, Math.max(0, drawTop), sliceW + 0.5, screenH - drawTop);
			}
		}
	},

	/**
	 * Standalone Demoscene GLSL Raymarching Fragment Shader (< 4KB)
	 */
	getWebGLTerrainShaderSource() {
		return `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_cam_pos;
uniform vec2 u_cam_angle;

float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash2(i + vec2(0,0)), hash2(i + vec2(1,0)), u.x),
               mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise2(p); p *= 2.03; a *= 0.5; }
    return v;
}
float mapTerrain(vec3 p) {
    float h = pow(fbm(p.xz * 0.04), 1.5) * 20.0;
    return p.y - h;
}
vec3 calcNormal(vec3 p) {
    float d = mapTerrain(p);
    vec2 e = vec2(0.05, 0.0);
    return normalize(vec3(mapTerrain(p + e.xyy) - d, e.x, mapTerrain(p + e.yyx) - d));
}
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    vec3 rayDir = normalize(vec3(uv.x, uv.y - 0.2, 1.0));
    vec3 rayPos = u_cam_pos;
    float t = 0.2;
    vec3 col = mix(vec3(0.05, 0.1, 0.25), vec3(0.3, 0.6, 0.8), uv.y + 0.5);
    for (int i = 0; i < 64; i++) {
        vec3 p = rayPos + rayDir * t;
        float dist = mapTerrain(p);
        if (dist < 0.02) {
            vec3 n = calcNormal(p);
            vec3 sunDir = normalize(vec3(0.8, 0.6, 0.4));
            float diff = max(dot(n, sunDir), 0.1);
            vec3 matCol = p.y < 1.0 ? vec3(0.0, 0.5, 0.9) : (p.y > 14.0 ? vec3(0.9, 0.95, 1.0) : vec3(0.1, 0.6, 0.25));
            float fog = 1.0 - exp(-t * 0.018);
            col = mix(matCol * diff, col, fog);
            break;
        }
        t += max(0.2, dist * 0.5);
        if (t > 100.0) break;
    }
    gl_FragColor = vec4(col, 1.0);
}`;
	}
});
//#endregion

	global.PhoenixTerrainRaymarcher = PhoenixTerrainRaymarcher;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { PhoenixTerrainRaymarcher };
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
