/**
 * EMBERLIGHT SOVEREIGN CORE: DETERMINISTIC GRAPHICS KERNEL
 * Adheres to VSRP-001 Lifecycle Rules and Faraday Tenant Memory Isolation.
 */
((window) => {
	'use strict';
	window.EmberlightTextureBaker = (() => {
		const VERSION = "1.0.0";
		const SIZE = 32; // Optimized structural block size

		// Pure functional packing of 32-bit integer pixels
		const packColor = (r, g, b, a = 255) => (a << 24) | (b << 16) | (g << 8) | r;

		return {
			getModuleInfo() {
				return {
					moduleId: 'texture_baker_core',
					version: VERSION,
					protocolVersion: 'VSRP-001',
					dependencies: [],
					capabilities: ['procedural_textures', 'jit_graphics_cache']
				};
			},

			/**
			 * Generates a structural wall brick texture using the engine's deterministic PRNG kernel.
			 * Zero external assets, zero DOM manipulation during simulation.
			 */
			generateBrickMatrix(prngStream) {
				const buffer = new Uint32Array(SIZE * SIZE);
				for (let y = 0; y < SIZE; y++) {
					for (let x = 0; x < SIZE; x++) {
						// Structural mortar joints
						const isMortar = y === 0 || y === 15 || y === 31 || (y < 16 && x === 0) || (y >= 16 && x === 16);

						if (isMortar) {
							buffer[y * SIZE + x] = packColor(12, 12, 20); // Abyssal crypt mortar
						} else {
							// Layered algorithmic variance using seed stream injections
							const noise = Math.floor(prngStream.nextFloat() * 16) - 8;
							const r = Math.max(0, 45 + noise);
							const g = Math.max(0, 48 + noise);
							const b = Math.max(0, 62 + noise); // Dark blue hue slate tint
							buffer[y * SIZE + x] = packColor(r, g, b);
						}
					}
				}
				return buffer;
			},

			/**
			 * Encodes a raw 32-bit pixel buffer into a reusable Base64 PNG URL.
			 * Intended to be executed purely during Step 7 / Sentinel Pass 16 boot gatekeepers.
			 */
			bakeToDataURL(pixelBuffer) {
				if (typeof document === 'undefined') return null;
				const canvas = document.createElement('canvas');
				canvas.width = SIZE;
				canvas.height = SIZE;
				const ctx = canvas.getContext('2d');
				const imgData = ctx.createImageData(SIZE, SIZE);

				// Copy 32-bit typed array view to 8-bit clamped array view
				const data32 = new Uint32Array(imgData.data.buffer);
				data32.set(pixelBuffer);

				ctx.putImageData(imgData, 0, 0);
				return canvas.toDataURL('image/png');
			}
		};
	})();
})(window);
