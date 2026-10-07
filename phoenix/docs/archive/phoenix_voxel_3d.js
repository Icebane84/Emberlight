/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: 3D FAST VOXEL DDA WORLD ENGINE
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-VOXEL-3D
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular Runtime Subsystem
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

//#region [SEC-07] Graphics Tier 4: 3D Fast Voxel DDA World Engine
/**
 * Pure Helper: Resolve face name and normal vector from hit side and ray step
 * @param {number} side
 * @param {number} stepX
 * @param {number} stepY
 * @param {number} stepZ
 * @returns {{ normal: [number, number, number]; face: string }}
 */
function _resolveHitFaceAndNormal(side, stepX, stepY, stepZ) {
	if (side === 0) {
		return {
			normal: [ -stepX, 0, 0 ],
			face: stepX < 0 ? 'east' : 'west'
		};
	}
	if (side === 1) {
		return {
			normal: [ 0, -stepY, 0 ],
			face: stepY < 0 ? 'top' : 'bottom'
		};
	}
	return {
		normal: [ 0, 0, -stepZ ],
		face: stepZ < 0 ? 'south' : 'north'
	};
}

/**
 * Pure Helper: Carve a perimeter wall column
 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} vol
 * @param {number} x
 * @param {number} z
 * @param {number} sizeY
 */
function _carvePerimeterWall(vol, x, z, sizeY) {
	for (let y = 1; y < sizeY - 1; y++) {
		vol.data[ (y * vol.sizeZ + z) * vol.sizeX + x ] = 2;
	}
}

/**
 * Pure Helper: Carve interior dungeon pillar or pedestal
 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} vol
 * @param {number} x
 * @param {number} z
 * @param {number} sizeY
 */
function _carveInteriorFeature(vol, x, z, sizeY) {
	if ((x % 4 === 0) && (z % 4 === 0)) {
		for (let y = 1; y < sizeY - 1; y++) {
			vol.data[ (y * vol.sizeZ + z) * vol.sizeX + x ] = 3;
		}
	} else if ((x === 4 && z === 4) || (x === 11 && z === 11)) {
		vol.data[ (1 * vol.sizeZ + z) * vol.sizeX + x ] = 4;
	}
}

const PhoenixVoxel3DEngine = Object.freeze({
	/**
	 * Create a new 3D Voxel Volume Chunk
	 * @param {number} [sizeX=16]
	 * @param {number} [sizeY=8]
	 * @param {number} [sizeZ=16]
	 * @param {number} [defaultVoxel=0]
	 */
	createVolume(sizeX = 16, sizeY = 8, sizeZ = 16, defaultVoxel = 0) {
		const data = new Uint8Array(sizeX * sizeY * sizeZ);
		if (defaultVoxel > 0) data.fill(defaultVoxel);
		return {
			sizeX,
			sizeY,
			sizeZ,
			data
		};
	},

	/**
	 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	getVoxel(volume, x, y, z) {
		if (!volume?.data) return 0;
		const ix = Math.floor(x);
		const iy = Math.floor(y);
		const iz = Math.floor(z);
		if (ix < 0 || ix >= volume.sizeX || iy < 0 || iy >= volume.sizeY || iz < 0 || iz >= volume.sizeZ) {
			return 0;
		}
		return volume.data[ (iy * volume.sizeZ + iz) * volume.sizeX + ix ];
	},

	/**
	 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} voxelType
	 */
	setVoxel(volume, x, y, z, voxelType) {
		if (!volume?.data) return false;
		const ix = Math.floor(x);
		const iy = Math.floor(y);
		const iz = Math.floor(z);
		if (ix < 0 || ix >= volume.sizeX || iy < 0 || iy >= volume.sizeY || iz < 0 || iz >= volume.sizeZ) {
			return false;
		}
		volume.data[ (iy * volume.sizeZ + iz) * volume.sizeX + ix ] = Math.max(0, Math.min(255, voxelType));
		return true;
	},

	/**
	 * Fast 3D Amanatides & Woo DDA Raycaster
	 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
	 * @param {{ x: number; y: number; z: number }} origin
	 * @param {{ x: number; y: number; z: number }} dir
	 * @param {number} [maxDist=32]
	 */
	castRay3D(volume, origin, dir, maxDist = 32) {
		const len = Math.hypot(dir.x, dir.y, dir.z) || 1.0;
		const dx = dir.x / len;
		const dy = dir.y / len;
		const dz = dir.z / len;

		let mapX = Math.floor(origin.x);
		let mapY = Math.floor(origin.y);
		let mapZ = Math.floor(origin.z);

		const stepX = dx < 0 ? -1 : 1;
		const stepY = dy < 0 ? -1 : 1;
		const stepZ = dz < 0 ? -1 : 1;

		const deltaDistX = Math.abs(1 / (dx || 1e-6));
		const deltaDistY = Math.abs(1 / (dy || 1e-6));
		const deltaDistZ = Math.abs(1 / (dz || 1e-6));

		let sideDistX = dx < 0 ? (origin.x - mapX) * deltaDistX : (mapX + 1.0 - origin.x) * deltaDistX;
		let sideDistY = dy < 0 ? (origin.y - mapY) * deltaDistY : (mapY + 1.0 - origin.y) * deltaDistY;
		let sideDistZ = dz < 0 ? (origin.z - mapZ) * deltaDistZ : (mapZ + 1.0 - origin.z) * deltaDistZ;

		let hit = 0;
		let side = 0;
		let distance = 0;
		let maxSteps = 96;

		while (hit === 0 && distance < maxDist && maxSteps > 0) {
			maxSteps--;
			if (sideDistX < sideDistY && sideDistX < sideDistZ) {
				distance = sideDistX;
				sideDistX += deltaDistX;
				mapX += stepX;
				side = 0;
			} else if (sideDistY < sideDistZ) {
				distance = sideDistY;
				sideDistY += deltaDistY;
				mapY += stepY;
				side = 1;
			} else {
				distance = sideDistZ;
				sideDistZ += deltaDistZ;
				mapZ += stepZ;
				side = 2;
			}

			hit = this.getVoxel(volume, mapX, mapY, mapZ);
		}

		if (hit === 0 || distance >= maxDist) {
			return { hit: false, distance: maxDist, x: mapX, y: mapY, z: mapZ, voxel: 0, face: 'none', normal: [ 0, 0, 0 ] };
		}

		const { normal, face } = _resolveHitFaceAndNormal(side, stepX, stepY, stepZ);

		return {
			hit: true,
			distance,
			x: mapX,
			y: mapY,
			z: mapZ,
			voxel: hit,
			side,
			face,
			normal
		};
	},

	/**
	 * Procedural 3D Voxel Dungeon Generator
	 * @param {number} [sizeX=16]
	 * @param {number} [sizeY=6]
	 * @param {number} [sizeZ=16]
	 */
	generateDungeonVolume(sizeX = 16, sizeY = 6, sizeZ = 16) {
		const vol = this.createVolume(sizeX, sizeY, sizeZ, 0);

		for (let x = 0; x < sizeX; x++) {
			for (let z = 0; z < sizeZ; z++) {
				this.setVoxel(vol, x, 0, z, 1);
				this.setVoxel(vol, x, sizeY - 1, z, 1);

				const isPerimeter = x === 0 || x === sizeX - 1 || z === 0 || z === sizeZ - 1;
				if (isPerimeter) {
					_carvePerimeterWall(vol, x, z, sizeY);
				} else {
					_carveInteriorFeature(vol, x, z, sizeY);
				}
			}
		}
		return vol;
	},

	/**
	 * Render 3D Voxel Perspective View to 2D Canvas
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {{ sizeX: number; sizeY: number; sizeZ: number; data: Uint8Array }} volume
	 * @param {{ x: number; y: number; z: number; yaw: number; pitch: number }} camera
	 * @param {number} screenW
	 * @param {number} screenH
	 * @param {{ fov?: number; numRays?: number; fogDensity?: number; palette?: Record<number, string> }} [options]
	 */
	renderVoxelView(ctx, volume, camera, screenW, screenH, {
		fov = Math.PI / 3,
		numRays = 160,
		fogDensity = 0.08,
		palette = {
			1: '#3a4750', // Floor/Ceiling Stone
			2: '#00ffa3', // Boundary Wall Cyan/Emerald
			3: '#00b4d8', // Pillar Azure
			4: '#ffd166', // Gold/Pedestal
			5: '#ff006e'  // Lava/Ruby
		}
	} = {}) {
		if (!ctx || !volume) return;

		const gradCeiling = ctx.createLinearGradient(0, 0, 0, screenH / 2);
		gradCeiling.addColorStop(0, '#04070a');
		gradCeiling.addColorStop(1, '#0c131a');
		ctx.fillStyle = gradCeiling;
		ctx.fillRect(0, 0, screenW, screenH / 2);

		const gradFloor = ctx.createLinearGradient(0, screenH / 2, 0, screenH);
		gradFloor.addColorStop(0, '#080d12');
		gradFloor.addColorStop(1, '#020406');
		ctx.fillStyle = gradFloor;
		ctx.fillRect(0, screenH / 2, screenW, screenH / 2);

		const sliceW = screenW / numRays;
		const cosPitch = Math.cos(camera.pitch || 0);
		const sinPitch = Math.sin(camera.pitch || 0);

		for (let i = 0; i < numRays; i++) {
			const rayYaw = (camera.yaw || 0) - fov / 2 + (i / numRays) * fov;
			const rayDir = {
				x: Math.cos(rayYaw) * cosPitch,
				y: sinPitch,
				z: Math.sin(rayYaw) * cosPitch
			};

			const result = this.castRay3D(volume, camera, rayDir, 28);
			if (result.hit) {
				const correctedDist = Math.max(0.1, result.distance * Math.cos(rayYaw - (camera.yaw || 0)));
				const sliceHeight = Math.min(screenH * 3, (screenH / correctedDist) * 1.2);
				const horizonOffset = sinPitch * (screenH / 2);
				const drawTop = (screenH / 2) - (sliceHeight / 2) + horizonOffset;

				const baseColor = palette[ result.voxel ] || '#00ffcc';
				let brightness = 0.7;
				if (result.face === 'top') brightness = 1.2;
				else if (result.face === 'bottom') brightness = 0.5;
				else if (result.face === 'east' || result.face === 'west') brightness = 0.85;

				const fog = Math.min(1.0, correctedDist * fogDensity);

				ctx.save();
				ctx.fillStyle = baseColor;
				ctx.globalAlpha = Math.max(0.05, (1.0 - fog) * brightness);
				ctx.fillRect(i * sliceW, drawTop, sliceW + 0.5, sliceHeight);

				ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
				ctx.fillRect(i * sliceW, drawTop, sliceW + 0.5, 2);
				ctx.restore();
			}
		}
	}
});
//#endregion

	global.PhoenixVoxel3DEngine = PhoenixVoxel3DEngine;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { PhoenixVoxel3DEngine };
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
