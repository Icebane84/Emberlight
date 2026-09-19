/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DETERMINISTIC DUNGEON CARVER (TIER 4)
 * Document Identifier: ARCH-SPEC-DUNGEON-GEN-002
 * Governing Protocol:  VSRP-001 / ARCH-GAP-ANALYSIS-001
 * Authority:           Subterranean Cavern Vaults & Inertial Drunkard Carving
 * ============================================================================
 */

const EmberlightDungeonCarver = (() => {
	'use strict';

	const MODULE_INFO = Object.freeze({
		moduleId: 'dungeon_gen',
		version: '4.2.0',
		protocolVersion: 'VSRP-001',
		dependencies: ['prng'],
		capabilities: ['dungeon_generation', 'path_connectivity', 'cavern_vaults']
	});

	let moduleConfig = {
		vaultChance: 0.14,      // Probability per step that a walker expands into a macro-vault brush
		maxVaultRadius: 2,       // Maximum cell extent for vault carving loops
		momentumWeight: 0.65     // Probability of continuing along the active heading
	};

	let moduleContext = null;
	let lastGeneratedData = null;

	const Workspace = {
		grid: null,
		width: 0,
		height: 0,
		floorTiles: []
	};

	function initWorkspaceMatrix(w, h) {
		Workspace.width = w;
		Workspace.height = h;
		Workspace.floorTiles = [];
		Workspace.grid = Array.from({ length: h }, () => new Array(w).fill('#'));
	}

	function inBounds(x, y, padding = 1) {
		return x >= padding && x < Workspace.width - padding && y >= padding && y < Workspace.height - padding;
	}

	/**
	 * Carves an expansive room chunk centered on current coordinate selections.
	 * Zero-allocation nested boundary scan.
	 */
	function carveVaultBlob(cx, cy, radius, prng) {
		const rad = prng.nextInt(1, radius);
		for (let dy = -rad; dy <= rad; dy++) {
			for (let dx = -rad; dx <= rad; dx++) {
				// Algorithmic corner-rounding check to ensure rooms look organic instead of square blocks
				if (dx * dx + dy * dy <= rad * rad + 0.5) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (inBounds(nx, ny, 1) && Workspace.grid[ny][nx] === '#') {
						Workspace.grid[ny][nx] = '.';
						Workspace.floorTiles.push({ x: nx, y: ny });
					}
				}
			}
		}
	}

	/**
	 * Refined Drunkard's Walk featuring Inertial Momentum and Dynamic Vault Brush sizing.
	 */
	function carveDrunkardsVaults(startX, startY, targetTilesCount, prng) {
		let cx = startX;
		let cy = startY;

		Workspace.grid[cy][cx] = '.';
		Workspace.floorTiles.push({ x: cx, y: cy });
		let carvedCount = 1;

		const directions = [
			{ x: 0, y: -1 }, // North
			{ x: 0, y: 1 },  // South
			{ x: -1, y: 0 }, // West
			{ x: 1, y: 0 }   // East
		];

		let activeDir = prng.choice(directions);
		let failSafe = 0;

		while (carvedCount < targetTilesCount && failSafe++ < 15000) {
			// 1. Evaluate Directional Momentum (Inertia check)
			if (prng.nextFloat() > moduleConfig.momentumWeight) {
				activeDir = prng.choice(directions); // Pivot vector selection heading
			}

			const nx = cx + activeDir.x;
			const ny = cy + activeDir.y;

			if (inBounds(nx, ny, 2)) {
				cx = nx;
				cy = ny;

				// 2. Dynamic Vault Cell Selection Trigger
				if (prng.nextFloat() < moduleConfig.vaultChance) {
					carveVaultBlob(cx, cy, moduleConfig.maxVaultRadius, prng);
				} else if (Workspace.grid[cy][cx] === '#') {
					Workspace.grid[cy][cx] = '.';
					Workspace.floorTiles.push({ x: cx, y: cy });
					carvedCount++;
				}
			} else {
				activeDir = prng.choice(directions); // Force pivot if heading toward edge limits
			}
		}
	}

	/**
	 * Ensures 100% path linkage across disjointed cavern spaces.
	 */
	function linkCriticalFeatures(startX, startY, features, prng) {
		features.forEach((feat) => {
			let cx = startX;
			let cy = startY;
			let failSafe = 0;

			while ((cx !== feat.x || cy !== feat.y) && failSafe++ < 1200) {
				const dx = Math.sign(feat.x - cx);
				const dy = Math.sign(feat.y - cy);

				if (dx !== 0 && dy !== 0) {
					if (prng.nextFloat() > 0.5) cx += dx;
					else cy += dy;
				} else if (dx !== 0) {
					cx += dx;
				} else {
					cy += dy;
				}

				// Carve a small path to ensure all seeded features are accessible
				if (Workspace.grid[cy][cx] === '#') {
					Workspace.grid[cy][cx] = '.';
					Workspace.floorTiles.push({ x: cx, y: cy });
				}
			}
			Workspace.grid[feat.y][feat.x] = feat.tile;
		});
	}

	return {
		configure(config) {
			moduleConfig = { ...moduleConfig, ...config };
			return Object.freeze({ accepted: true, moduleId: MODULE_INFO.moduleId });
		},

		init(context) {
			moduleContext = context;
		},

		reset(specSnapshot) {
			const spec = specSnapshot || { seed: 1337, depth: 1, width: 48, height: 32 };

			const prng = window.EmberlightPRNG && typeof window.EmberlightPRNG.fork === 'function'
				? window.EmberlightPRNG.fork(spec.seed)
				: { nextFloat: Math.random, choice: (arr) => arr[Math.floor(Math.random() * arr.length)], nextInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min };

			initWorkspaceMatrix(spec.width, spec.height);

			const startX = Math.floor(spec.width * 0.5);
			const startY = Math.floor(spec.height * 0.5);
			Workspace.grid[startY][startX] = '<'; // Entry point

			// Allocate a 40% cavern layout footprint for large spaces
			const targetVolume = Math.floor((spec.width * spec.height) * 0.40);
			carveDrunkardsVaults(startX, startY, targetVolume, prng);

			const features = [
				{ ...prng.choice(Workspace.floorTiles), tile: '>', label: 'Descent Gate' },
				{ ...prng.choice(Workspace.floorTiles), tile: '$', label: 'Treasure Chest' },
				{ ...prng.choice(Workspace.floorTiles), tile: 'C', label: 'Campfire Hearth' },
				{ ...prng.choice(Workspace.floorTiles), tile: '%', label: 'Miasma Pocket' }
			];

			linkCriticalFeatures(startX, startY, features, prng);

			lastGeneratedData = {
				spec: structuredClone(spec),
				matrix: structuredClone(Workspace.grid),
				spawnPos: { x: startX, y: startY }
			};
		},

		update(dt, context) { },
		render(renderer, context) { },

		getState() {
			if (!lastGeneratedData) return { ready: false };
			return Object.freeze({
				ready: true,
				spec: structuredClone(lastGeneratedData.spec),
				spawnPos: structuredClone(lastGeneratedData.spawnPos),
				map: structuredClone(lastGeneratedData.matrix)
			});
		},

		getDiagnostics() {
			return {
				allocatedWidth: Workspace.width,
				allocatedHeight: Workspace.height,
				totalFloorVolume: Workspace.floorTiles.length
			};
		},

		getModuleInfo() { return MODULE_INFO; },
		destroy() {
			Workspace.grid = null;
			Workspace.floorTiles = [];
			lastGeneratedData = null;
			moduleContext = null;
		}
	};
})();

if (typeof window !== 'undefined') window.EmberlightDungeonCarver = EmberlightDungeonCarver;
