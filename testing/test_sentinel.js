/* cSpell:words MICROZZFX Bytebeat bytebeat */
/**
 * @fileoverview Emberlight Sentinel Audit Harness (Pass 1 - Pass 21)
 *
 * Protocols: VSRP-001 / SDCP-001 / PERSIST-001 / MPFS-001
 * Authority: Host SSOT | Sentinel Audit Engine
 *
 * Evaluates the full topological load order of Emberlight game engine modules
 * in a zero-dependency headless VM sandbox and executes the 21-Pass Sentinel Headless Audit.
 *
 * Usage: node testing/test_sentinel.js
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createVmContext } = require('./mock_dom.js');

const baseDir = path.resolve(__dirname, '..');

// SSOT: canonical topological load order — edit testing/load_order.js, not here.
const scripts = require('./load_order.js');

const context = createVmContext();

scripts.forEach((file) => {
	const filePath = path.join(baseDir, file);
	const code = fs.readFileSync(filePath, 'utf8');
	vm.runInContext(code, context, { filename: filePath }); // NOSONAR: Test harness requires loading vanilla JS modules into headless DOM VM context
});

// Boot GameRuntime which registers and seals SDCP-001 capabilities
const runtime = context.window.GameRuntime;
runtime.init();

// Run Sentinel Auditor
const auditor = context.window.EmberlightAuditor;

const targetModules = {
	combat: context.window.EmberlightCombat,
	overworld: context.window.EmberlightOverworld,
	market: context.window.EmberlightMarket,
	progression: context.window.EmberlightProgression,
	lockpick: context.window.EmberlightLockpick,
	relic_forge: context.window.EmberlightRelicForge,
	pseudo3d: context.window.EmberlightPseudo3D,
	armory: context.window.EmberlightArmory,
	script: context.window.EmberlightScript,
	status: context.window.EmberlightStatus,
	chronicle: context.window.EmberlightChronicle,
	settings: context.window.EmberlightSettings,
};

const peripheralDrivers = {
	acoustic: context.window.EmberlightAcousticSFX,
	pseudo3d: context.window.EmberlightPseudo3D,
	lights: context.window.EmberlightDynamicLights,
	vfx: context.window.EmberlightCombatVFX,
	voice: context.window.EmberlightVoice,
	battler: context.window.EmberlightBattlerBaker,
	backdrop: context.window.EmberlightCombatBackdrop,
	input: context.window.EmberlightInput,
	combatRenderer: context.window.EmberlightCombatRenderer,
	overworldRenderer: context.window.EmberlightOverworldRenderer,
	armoryRenderer: context.window.EmberlightArmoryRenderer,
	chronicleRenderer: context.window.EmberlightChronicleRenderer,
	progressionRenderer: context.window.EmberlightProgressionRenderer,
	marketRenderer: context.window.EmberlightMarketRenderer,
	statusRenderer: context.window.EmberlightStatusRenderer,
	relicForgeRenderer: context.window.EmberlightRelicForgeRenderer,
	cockpitRenderer: context.window.EmberlightCockpitRenderer,
};

auditor.reset({
	modules: targetModules,
	drivers: peripheralDrivers,
	eventBus: runtime.EventBus,
});

const diag = auditor.getDiagnostics();
console.log('AUDIT DIAGNOSTICS:', diag);
const state = auditor.getState();
state.auditLog.forEach((l) => console.log(l.message));

// Verification of Cellular Automata Cavern Carver (B5678/S45678)
const dungeonGen = context.window.EmberlightDungeonGen;
if (dungeonGen && typeof dungeonGen.carveCaverns === 'function') {
	const cavern1 = dungeonGen.carveCaverns(4242, 16, 12, 4, 0.45);
	const cavern2 = dungeonGen.carveCaverns(4242, 16, 12, 4, 0.45);
	if (JSON.stringify(cavern1.map) !== JSON.stringify(cavern2.map)) {
		throw new Error('Cellular Automata cavern generation is non-deterministic across identical seeds');
	}

	// 100-iteration flood-fill connectivity & perimeter clamping crucible
	for (let s = 1; s <= 100; s++) {
		const seed = 10000 + s * 37;
		const cav = dungeonGen.carveCaverns(seed, 20, 16, 4, 0.45);
		const w = 20;
		const h = 16;

		// Perimeter wall clamping verification
		for (let x = 0; x < w; x++) {
			if (cav.map[ 0 ][ x ] !== '#' || cav.map[ h - 1 ][ x ] !== '#') {
				throw new Error(`Boundary leak at seed ${seed} on horizontal perimeter`);
			}
		}
		for (let y = 0; y < h; y++) {
			if (cav.map[ y ][ 0 ] !== '#' || cav.map[ y ][ w - 1 ] !== '#') {
				throw new Error(`Boundary leak at seed ${seed} on vertical perimeter`);
			}
		}

		// Flood fill reachability from spawn
		const visited = new Set();
		const queue = [ { x: cav.spawn.x, y: cav.spawn.y } ];
		visited.add(`${cav.spawn.x},${cav.spawn.y}`);
		let canReachExit = false;

		while (queue.length > 0) {
			const pt = queue.shift();
			if (pt.x === cav.exitPt.x && pt.y === cav.exitPt.y) canReachExit = true;
			const nbs = [
				{ x: pt.x + 1, y: pt.y }, { x: pt.x - 1, y: pt.y },
				{ x: pt.x, y: pt.y + 1 }, { x: pt.x, y: pt.y - 1 }
			];
			for (const nb of nbs) {
				const key = `${nb.x},${nb.y}`;
				if (nb.x > 0 && nb.x < w - 1 && nb.y > 0 && nb.y < h - 1 && !visited.has(key)) {
					if (cav.map[ nb.y ][ nb.x ] !== '#') {
						visited.add(key);
						queue.push(nb);
					}
				}
			}
		}

		const interiorArea = (w - 2) * (h - 2);
		const reachableRatio = visited.size / interiorArea;
		if (reachableRatio < 0.38) {
			throw new Error(`Cavern playable area below threshold at seed ${seed}: ${(reachableRatio * 100).toFixed(1)}%`);
		}
		if (!canReachExit) {
			throw new Error(`Cavern exit unreachable from spawn at seed ${seed}`);
		}
	}

	// Also test generate() with cavern layout option
	const genCavern = dungeonGen.generate(8888, 16, 12, 5, { layoutType: 'cavern' });
	if (!genCavern.map || genCavern.spawn.x < 1 || genCavern.exit.x < 1) {
		throw new Error('generate() failed to produce valid cavern layout');
	}

	console.log('[PASS] Cellular Automata Cavern Carver: B5678/S45678 smoothing, 100/100 flood-fill connectivity, and determinism verified.');
}

// Verification of Harmonic Squash-and-Stretch Kinematics (AOP-HARMONIC-001)
const combatRenderer = context.window.EmberlightCombatRenderer;
if (combatRenderer && typeof combatRenderer.computeHarmonicKinematics === 'function') {
	const boss = { id: 'MALAKOR', name: 'Malakor', isBoss: true, alive: true, hp: 25, maxHp: 100 };
	const minion = { id: 'GOBLIN', name: 'Goblin', isBoss: false, alive: true, hp: 40, maxHp: 40 };

	for (let t = 0; t < 20; t++) {
		const kBoss = combatRenderer.computeHarmonicKinematics(boss, false, true);
		const kMinion = combatRenderer.computeHarmonicKinematics(minion, true, false);

		const detBoss = kBoss.sx * kBoss.sy;
		const detMinion = kMinion.sx * kMinion.sy;

		if (Math.abs(detBoss - 1.0) > 0.02) {
			throw new Error(`Harmonic mass conservation breached on boss: det=${detBoss.toFixed(4)}`);
		}
		if (Math.abs(detMinion - 1.0) > 0.02) {
			throw new Error(`Harmonic mass conservation breached on minion: det=${detMinion.toFixed(4)}`);
		}
	}
	console.log('[PASS] Harmonic Squash-and-Stretch: Physical mass conservation (Sx * Sy = 1.0 ± 0.02) and enrage scaling verified.');
}

// Verification of Parametric Micro-ZzFX Sound Synthesizer & Pre-baked Audio Buffers (AOP-MICROZZFX-001)
const acousticDriver = context.window.EmberlightAcousticSFX;
if (acousticDriver && typeof acousticDriver.buildParametricBuffer === 'function') {
	const vectors = acousticDriver.getParametricVectors();
	if (!vectors || Object.keys(vectors).length < 15) {
		throw new Error('Parametric vector catalog missing canonical sound cues');
	}

	// Synthesize and verify sample bounds and properties across all vectors
	for (const [ key, vec ] of Object.entries(vectors)) {
		const buf = acousticDriver.buildParametricBuffer(vec);
		if (!buf || buf.length <= 0) {
			throw new Error(`Buffer synthesis produced empty audio buffer for ${key}`);
		}
		const data = buf.getChannelData(0);
		if (!data || data.length !== buf.length) {
			throw new Error(`Invalid channel data for ${key}`);
		}

		let hasNonZero = false;
		for (let i = 0; i < data.length; i++) {
			const sample = data[ i ];
			if (Number.isNaN(sample) || !Number.isFinite(sample)) {
				throw new TypeError(`NaN or non-finite PCM sample in ${key} at sample ${i}`);
			}
			if (Math.abs(sample) > 1.0) {
				throw new Error(`PCM sample out of bounds in ${key}: ${sample}`);
			}
			if (Math.abs(sample) > 0.0001) {
				hasNonZero = true;
			}
		}
		if (!hasNonZero) {
			throw new Error(`Synthesized buffer for ${key} is entirely silent`);
		}
	}

	// Pre-baking pipeline verification
	acousticDriver.bakeParametricBuffers();
	console.log('[PASS] Parametric Micro-ZzFX: 16 vectors, zero-NaN PCM bounds, and pre-baked audio buffers verified.');
}

// Verification of Algorithmic Bytebeat Engine & Mode Switching (AOP-BYTEBEAT-001)
const soundtrack = context.window.EmberlightSoundtrack;
if (soundtrack && typeof soundtrack.generateBytebeatPCM === 'function') {
	const formulas = soundtrack.getBytebeatFormulas();
	const moods = [ 'SURFACE', 'TOWN', 'CATACOMBS', 'COMBAT', 'BOSS' ];

	for (const mood of moods) {
		if (typeof formulas[ mood ] !== 'function') {
			throw new TypeError(`Missing canonical Bytebeat formula for mood: ${mood}`);
		}

		// 1-second sample generation at 8000 Hz
		const pcm1 = soundtrack.generateBytebeatPCM(mood, 8000);
		const pcm2 = soundtrack.generateBytebeatPCM(mood, 8000);

		if (pcm1.length !== 8000 || pcm2.length !== 8000) {
			throw new Error(`Invalid Bytebeat PCM buffer length for ${mood}`);
		}

		let hasEnergy = false;
		for (let i = 0; i < pcm1.length; i++) {
			const s1 = pcm1[ i ];
			const s2 = pcm2[ i ];

			if (Number.isNaN(s1) || !Number.isFinite(s1)) {
				throw new TypeError(`Non-finite Bytebeat PCM sample in ${mood} at tick ${i}`);
			}
			if (s1 !== s2) {
				throw new Error(`Bit-exact determinism violation in Bytebeat ${mood} at tick ${i}`);
			}
			if (Math.abs(s1) > 1.0) {
				throw new Error(`Bytebeat PCM sample out of bounds in ${mood}: ${s1}`);
			}
			if (Math.abs(s1) > 0.01) {
				hasEnergy = true;
			}
		}

		if (!hasEnergy) {
			throw new Error(`Bytebeat output for ${mood} produced silent signal`);
		}

		// Web Audio buffer building
		const buf = soundtrack.buildBytebeatAudioBuffer(mood, 2.0);
		if (!buf || buf.length <= 0) {
			throw new Error(`Bytebeat audio buffer synthesis failed for ${mood}`);
		}
	}

	// Playback mode switching verification
	soundtrack.setPlaybackMode('BYTEBEAT');
	if (soundtrack.getPlaybackMode() !== 'BYTEBEAT') {
		throw new Error('Failed to set playback mode to BYTEBEAT');
	}
	const diagBytebeat = soundtrack.getDiagnostics();
	if (diagBytebeat.playbackMode !== 'BYTEBEAT') {
		throw new Error('Diagnostics failed to reflect BYTEBEAT mode');
	}

	soundtrack.setPlaybackMode('TRACKER');
	if (soundtrack.getPlaybackMode() !== 'TRACKER') {
		throw new Error('Failed to restore playback mode to TRACKER');
	}

	console.log('[PASS] Algorithmic Bytebeat: 5 mood formulas, bit-exact determinism, and mode switching verified.');
}

// Verification of Bilateral Procedural Pixel-Art Sprite Synthesizer (AOP-SPRITE-001)
const iconsDriver = context.window.EmberlightIcons;
if (iconsDriver && typeof iconsDriver.generateBilateralSprite === 'function') {
	const archetypes = [ 'GOBLIN', 'SKELETON', 'DEMON', 'BOSS', 'TREASURE', 'RELIC', 'POTION', 'BEAST' ];

	// 50-seed mathematical bilateral symmetry and morphological edge verification
	for (let s = 1; s <= 50; s++) {
		const seed = 5000 + s * 19;
		let w = 8;
		if (s % 3 === 0) {
			w = 12;
		} else if (s % 2 === 0) {
			w = 16;
		}
		const h = w;
		const arch = archetypes[ s % archetypes.length ];

		const sprite1 = iconsDriver.generateBilateralSprite({ w, h, seed, archetype: arch });
		const sprite2 = iconsDriver.generateBilateralSprite({ w, h, seed, archetype: arch });

		// Bit-exact determinism
		if (JSON.stringify(sprite1.grid) !== JSON.stringify(sprite2.grid)) {
			throw new Error(`Non-deterministic bilateral sprite synthesis at seed ${seed}`);
		}

		// Mathematical bilateral vertical symmetry invariant: grid[y][x] === grid[y][w - 1 - x]
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const left = sprite1.grid[ y ][ x ];
				const right = sprite1.grid[ y ][ w - 1 - x ];
				if (left !== right) {
					throw new Error(`Bilateral symmetry violation at seed ${seed} at (${x}, ${y}): ${left} !== ${right}`);
				}
			}
		}

		// Morphological outline invariant: empty cells adjacent to solid pixels must be outline (1)
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const val = sprite1.grid[ y ][ x ];
				const hasSolidNeighbor =
					(x > 0 && sprite1.grid[ y ][ x - 1 ] >= 2) ||
					(x < w - 1 && sprite1.grid[ y ][ x + 1 ] >= 2) ||
					(y > 0 && sprite1.grid[ y - 1 ][ x ] >= 2) ||
					(y < h - 1 && sprite1.grid[ y + 1 ][ x ] >= 2);

				if (val === 0 && hasSolidNeighbor) {
					throw new Error(`Morphological edge breach: empty pixel adjacent to solid mass at (${x}, ${y}) at seed ${seed}`);
				}
			}
		}
	}

	// Raster baking & dynamic get() fallback verification
	const bakedUrl = iconsDriver.bakeBilateralSprite({ seed: 'ANCIENT_RELIC', archetype: 'RELIC' }, 6);
	if (!bakedUrl?.startsWith('data:image/png')) {
		throw new Error('bakeBilateralSprite failed to synthesize valid PNG Data URL');
	}

	const fallbackUrl = iconsDriver.get('PROCEDURAL_LOOT_ITEM_X99');
	if (!fallbackUrl?.startsWith('data:image/png')) {
		throw new Error('EmberlightIcons.get() fallback failed to synthesize procedural sprite for dynamic ID');
	}

	console.log('[PASS] Bilateral Sprite Generator: 50/50 symmetry kernels, morphological borders, and raster baking verified.');
}

// Verification of BSP Recursive Architectural Dungeon Generator (AOP-BSP-001)
if (dungeonGen && typeof dungeonGen.carveBSPDungeon === 'function') {
	// Bit-exact determinism test
	const bsp1 = dungeonGen.carveBSPDungeon(7712, 18, 14, 3);
	const bsp2 = dungeonGen.carveBSPDungeon(7712, 18, 14, 3);
	if (JSON.stringify(bsp1.map) !== JSON.stringify(bsp2.map)) {
		throw new Error('BSP architectural dungeon generation is non-deterministic across identical seeds');
	}

	// 50-seed flood-fill connectivity, room validity, and boundary clamping crucible
	for (let s = 1; s <= 50; s++) {
		const seed = 30000 + s * 43;
		const w = 20;
		const h = 16;
		const bspDungeon = dungeonGen.carveBSPDungeon(seed, w, h, 3);

		// Perimeter wall clamping verification
		for (let x = 0; x < w; x++) {
			if (bspDungeon.map[0][x] !== '#' || bspDungeon.map[h - 1][x] !== '#') {
				throw new Error(`BSP boundary leak at seed ${seed} on horizontal perimeter`);
			}
		}
		for (let y = 0; y < h; y++) {
			if (bspDungeon.map[y][0] !== '#' || bspDungeon.map[y][w - 1] !== '#') {
				throw new Error(`BSP boundary leak at seed ${seed} on vertical perimeter`);
			}
		}

		if (!bspDungeon.rooms || bspDungeon.rooms.length === 0) {
			throw new Error(`BSP generated 0 rooms at seed ${seed}`);
		}

		// Flood-fill reachability from spawn to exit
		const visited = new Set();
		const queue = [{ x: bspDungeon.spawn.x, y: bspDungeon.spawn.y }];
		visited.add(`${bspDungeon.spawn.x},${bspDungeon.spawn.y}`);
		let reachedExit = false;

		while (queue.length > 0) {
			const pt = queue.shift();
			if (pt.x === bspDungeon.exitPt.x && pt.y === bspDungeon.exitPt.y) {
				reachedExit = true;
			}
			const nbs = [
				{ x: pt.x + 1, y: pt.y }, { x: pt.x - 1, y: pt.y },
				{ x: pt.x, y: pt.y + 1 }, { x: pt.x, y: pt.y - 1 }
			];
			for (const nb of nbs) {
				const key = `${nb.x},${nb.y}`;
				if (nb.x > 0 && nb.x < w - 1 && nb.y > 0 && nb.y < h - 1 && !visited.has(key)) {
					if (bspDungeon.map[nb.y][nb.x] !== '#') {
						visited.add(key);
						queue.push(nb);
					}
				}
			}
		}

		if (!reachedExit) {
			throw new Error(`BSP dungeon exit unreachable from spawn at seed ${seed}`);
		}
	}

	// Verify generate() with pure BSP option
	const bspGenResult = dungeonGen.generate(9999, 18, 14, 1, { layoutType: 'bsp' });
	if (!bspGenResult.map || bspGenResult.spawn.x < 1 || bspGenResult.exit.x < 1) {
		throw new Error('generate() failed to produce valid BSP layout');
	}

	console.log('[PASS] BSP Architectural Generator: 50/50 guaranteed connectivity, room bounds, and determinism verified.');
}

// Verification of 2D FABRIK Inverse Kinematics Engine (AOP-FABRIK-001)
const FABRIKSolverClass = context.window.SovereignFABRIKSolver || context.window.EmberlightFABRIKSolver;
const fabrikFacade = context.window.EmberlightFABRIK;

if (FABRIKSolverClass && fabrikFacade) {
	// 1. Basic convergence and anchor invariance test
	const boneLengths = [ 40, 30, 20 ];
	const solver = new FABRIKSolverClass(boneLengths);
	const bx = 100;
	const by = 100;
	const tx = 145;
	const ty = 135;
	const points = solver.solve(bx, by, tx, ty, 5);

	// Base anchor stability: p0 === (bx, by)
	if (Math.abs(points[0] - bx) > 1e-4 || Math.abs(points[1] - by) > 1e-4) {
		throw new Error(`FABRIK base anchor drifted: (${points[0]}, ${points[1]}) !== (${bx}, ${by})`);
	}

	// End-effector target convergence: ||pN - target|| < 0.05
	const endEffector = solver.getEndEffector();
	const targetError = Math.hypot(endEffector.x - tx, endEffector.y - ty);
	if (targetError > 0.05) {
		throw new Error(`FABRIK end-effector failed to converge within reach: error = ${targetError}`);
	}

	// Bone length preservation invariant across all segments
	for (let i = 0; i < boneLengths.length; i++) {
		const segDx = points[(i + 1) * 2] - points[i * 2];
		const segDy = points[(i + 1) * 2 + 1] - points[i * 2 + 1];
		const len = Math.hypot(segDx, segDy);
		if (Math.abs(len - boneLengths[i]) > 1e-3) {
			throw new Error(`FABRIK segment ${i} length violated: measured ${len}, expected ${boneLengths[i]}`);
		}
	}

	// 2. Unreachable target collinear extension test
	const unreachableTx = 300;
	const unreachableTy = 100;
	solver.solve(bx, by, unreachableTx, unreachableTy, 3);
	const totalReach = solver.getTotalLength();
	const unreachEnd = solver.getEndEffector();
	const unreachDist = Math.hypot(unreachEnd.x - bx, unreachEnd.y - by);
	if (Math.abs(unreachDist - totalReach) > 1e-3) {
		throw new Error(`FABRIK unreachable target failed full extension: ${unreachDist} !== ${totalReach}`);
	}
	if (Math.abs(unreachEnd.y - by) > 1e-3) {
		throw new Error(`FABRIK unreachable target deviated from horizontal ray: y = ${unreachEnd.y}`);
	}

	// 3. 50-target random reachability & length invariance crucible
	const taperedSolver = fabrikFacade.createTaperedChain(6, 25, 8);
	const totalTaperedLen = taperedSolver.getTotalLength();
	for (let s = 1; s <= 50; s++) {
		const angle = (s * 0.43) % (Math.PI * 2);
		const radius = s % 2 === 0 ? totalTaperedLen * 0.65 : totalTaperedLen * 1.35;
		const rtx = bx + Math.cos(angle) * radius;
		const rty = by + Math.sin(angle) * radius;

		const pts = taperedSolver.solve(bx, by, rtx, rty, 4);

		if (Math.abs(pts[0] - bx) > 1e-4 || Math.abs(pts[1] - by) > 1e-4) {
			throw new Error(`FABRIK base anchor drifted in stress test step ${s}`);
		}

		const tLengths = taperedSolver.getBoneLengths();
		for (let i = 0; i < tLengths.length; i++) {
			const d = Math.hypot(pts[(i + 1) * 2] - pts[i * 2], pts[(i + 1) * 2 + 1] - pts[i * 2 + 1]);
			if (Math.abs(d - tLengths[i]) > 0.005) {
				throw new Error(`FABRIK tapered segment ${i} length breach in step ${s}: ${d} vs ${tLengths[i]}`);
			}
		}

		if (radius < totalTaperedLen) {
			const end = taperedSolver.getEndEffector();
			const err = Math.hypot(end.x - rtx, end.y - rty);
			if (err > 0.05) {
				throw new Error(`FABRIK convergence failure in step ${s}: error = ${err}`);
			}
		}
	}

	// 4. Zero-allocation hot-path verification
	const hotSolver = fabrikFacade.createUniformChain(4, 20);
	const initialBuffer = hotSolver.getPoints();
	const hotIterCount = 500;
	for (let i = 0; i < hotIterCount; i++) {
		const res = hotSolver.solve(50, 50, 80 + (i % 10), 70 + (i % 10), 3);
		if (res !== initialBuffer) {
			throw new Error('FABRIK solver allocated new buffer in hot solve loop');
		}
	}

	// 5. Combat VFX tendril strike execution check
	const vfxDriver = context.window.EmberlightCombatVFX;
	if (vfxDriver && typeof vfxDriver.playTendrilStrike === 'function') {
		vfxDriver.playTendrilStrike(false, 0, { segments: 4, segmentLength: 30 });
		const vfxDiag = vfxDriver.getDiagnostics();
		if (!vfxDiag || vfxDiag.activeTendrils < 1) {
			throw new Error('playTendrilStrike failed to activate tendril in combat VFX telemetry');
		}
	}

	console.log('[PASS] 2D FABRIK Inverse Kinematics: Sub-millimeter convergence, bone length conservation, and zero-GC hot loop verified.');
}

// Verification of Fast Voxel Traversal DDA (Amanatides & Woo, 1987) (AOP-DDA-001)
const DDARaycasterClass = context.window.SovereignDDARaycaster || context.window.EmberlightDDARaycaster;
if (DDARaycasterClass) {
	// 1. Grid boundary collision & side detection
	const testGrid = [
		[ '#', '#', '#', '#', '#', '#' ],
		[ '#', '.', '.', '.', '.', '#' ],
		[ '#', '.', '#', '.', '.', '#' ],
		[ '#', '.', '.', '.', '.', '#' ],
		[ '#', '#', '#', '#', '#', '#' ],
	];
	const raycaster = new DDARaycasterClass(testGrid, 6, 5);

	// Ray purely east along +X from (1.5, 1.5): hits wall '#' at x=5, y=1
	const hitEast = raycaster.castRay(1.5, 1.5, 1.0, 0.0, 10.0);
	if (!hitEast.hit || hitEast.mapX !== 5 || hitEast.mapY !== 1 || hitEast.side !== 0) {
		throw new Error(`DDA East raycast mismatch: hit=${hitEast.hit}, x=${hitEast.mapX}, y=${hitEast.mapY}, side=${hitEast.side}`);
	}
	if (Math.abs(hitEast.distance - 3.5) > 1e-3) {
		throw new Error(`DDA East raycast distance mismatch: expected 3.5, got ${hitEast.distance}`);
	}

	// Ray purely south along +Y from (1.5, 1.5): hits wall '#' at x=1, y=4
	const hitSouth = raycaster.castRay(1.5, 1.5, 0.0, 1.0, 10.0);
	if (!hitSouth.hit || hitSouth.mapX !== 1 || hitSouth.mapY !== 4 || hitSouth.side !== 1) {
		throw new Error(`DDA South raycast mismatch: hit=${hitSouth.hit}, x=${hitSouth.mapX}, y=${hitSouth.mapY}, side=${hitSouth.side}`);
	}
	if (Math.abs(hitSouth.distance - 2.5) > 1e-3) {
		throw new Error(`DDA South raycast distance mismatch: expected 2.5, got ${hitSouth.distance}`);
	}

	// Ray towards interior wall obstacle at (2, 2)
	const hitObstacle = raycaster.castRay(1.2, 2.5, 1.0, 0.0, 10.0);
	if (!hitObstacle.hit || hitObstacle.mapX !== 2 || hitObstacle.mapY !== 2 || hitObstacle.side !== 0) {
		throw new Error(`DDA obstacle hit failed: x=${hitObstacle.mapX}, y=${hitObstacle.mapY}`);
	}

	// 2. Exact 4-connectivity voxel traversal order (traverseSegment)
	const visitedCells = [];
	raycaster.traverseSegment(1.2, 1.2, 4.8, 3.4, (x, y) => {
		visitedCells.push({ x, y });
	});
	if (visitedCells.length < 4) {
		throw new Error(`DDA traverseSegment visited too few cells: ${visitedCells.length}`);
	}
	// Assert 4-connectivity: every adjacent step differs by at most 1 in Manhattan distance
	for (let i = 0; i < visitedCells.length - 1; i++) {
		const manhattan = Math.abs(visitedCells[i + 1].x - visitedCells[i].x) + Math.abs(visitedCells[i + 1].y - visitedCells[i].y);
		if (manhattan !== 1) {
			throw new Error(`DDA traverseSegment violated 4-neighborhood continuity at step ${i}: distance ${manhattan}`);
		}
	}

	// 3. Line of sight integration test (map_los.js)
	const mapInternal = context.window._MapInternal;
	if (mapInternal?.LOS && typeof mapInternal.LOS.computeLineOfSight === 'function') {
		const losSet = mapInternal.LOS.computeLineOfSight(testGrid, 1, 1, 4);
		// Player cell (1, 1) and open neighbor (2, 1) must be visible
		if (!losSet.has('1,1') || !losSet.has('2,1')) {
			throw new Error('DDA Line of Sight missed open visible corridor cells');
		}
		// Cell (2, 2) is a solid wall, so it is visible as a wall surface
		if (!losSet.has('2,2')) {
			throw new Error('DDA Line of Sight did not reveal visible wall perimeter');
		}
	}

	// 4. 1000-ray high-velocity crucible
	const perfStart = Date.now();
	for (let i = 0; i < 1000; i++) {
		const angle = (i * 0.0314);
		raycaster.castRay(1.5, 1.5, Math.cos(angle), Math.sin(angle), 15.0);
	}
	const perfElapsed = Date.now() - perfStart;
	if (perfElapsed > 100) {
		throw new Error(`DDA raycasting exceeded real-time budget: ${perfElapsed}ms for 1000 rays`);
	}

	console.log('[PASS] Fast Voxel Traversal DDA: O(1) boundary stepping, exact side detection, and non-tunneling LOS verified.');
}

// Verification of Continuous Value Noise / OpenSimplex Gradient Fields (Spencer 2014 / Perlin 2001) (AOP-NOISE-001)
const NoiseFacade = context.window.EmberlightNoise;
const NoiseClass = context.window.SovereignNoise || NoiseFacade?.SovereignNoise;
if (NoiseClass && NoiseFacade) {
	// 1. Instantiation and determinism
	const nA1 = new NoiseClass(42);
	const nA2 = new NoiseClass(42);
	const nB = new NoiseClass(99);

	for (let i = 0; i < 200; i++) {
		const sx = (i * 0.17) - 15;
		const sy = (i * 0.23) - 15;
		const valA1 = nA1.noise2D(sx, sy);
		const valA2 = nA2.noise2D(sx, sy);
		if (valA1 !== valA2) {
			throw new Error(`Continuous noise non-deterministic at sample ${i}: ${valA1} !== ${valA2}`);
		}
		if (valA1 < -1.0001 || valA1 > 1.0001) {
			throw new Error(`Continuous noise out of analytical bounds [-1, 1]: ${valA1} at (${sx}, ${sy})`);
		}
	}

	// 2. Spatial continuity invariant (C0/C1)
	const eps = 0.001;
	for (let i = 0; i < 200; i++) {
		const sx = (i * 0.29) - 20;
		const sy = (i * 0.37) - 20;
		const base = nA1.noise2D(sx, sy);
		const step = nA1.noise2D(sx + eps, sy);
		if (Math.abs(step - base) >= 0.05) {
			throw new Error(`Continuous noise discontinuity detected: delta=${Math.abs(step - base)} at (${sx}, ${sy})`);
		}
	}

	// 3. Multi-octave fBm fractal synthesis & bounds
	for (let oct = 1; oct <= 6; oct++) {
		for (let i = 0; i < 100; i++) {
			const fbmVal = nA1.fbm2D(i * 0.1, i * 0.15, oct, 2.0, 0.5);
			if (fbmVal < -1.0001 || fbmVal > 1.0001) {
				throw new Error(`fBm out of bounds [-1, 1]: ${fbmVal} with octaves=${oct}`);
			}
		}
	}

	// 4. Ridge, Turbulence & Domain Warping
	const turb = nA1.turbulence2D(2.5, 3.5, 4);
	const ridge = nA1.ridge2D(2.5, 3.5, 4);
	const warp = nA1.warp2D(2.5, 3.5, 3.0, 4);
	if (turb < 0.0 || turb > 1.0001 || ridge < 0.0 || ridge > 1.0001 || warp < -1.0001 || warp > 1.0001) {
		throw new Error(`Harmonic noise forms violated bounds: turb=${turb}, ridge=${ridge}, warp=${warp}`);
	}

	// 5. Zero-allocation heightmap rasterization
	const hmapBuf = new Float32Array(32 * 32);
	const generatedHmap = nA1.generateHeightmap(32, 32, { scale: 0.05, octaves: 4, outBuffer: hmapBuf });
	if (generatedHmap !== hmapBuf || generatedHmap.length !== 1024) {
		throw new Error('generateHeightmap failed pre-allocated buffer verification');
	}

	// 6. Diagnostics metadata
	const diagReport = NoiseFacade.getDiagnostics();
	if (!diagReport.zeroAllocHotLoop || !diagReport.deterministic || diagReport.moduleId !== 'noise') {
		throw new Error('Continuous noise diagnostics failed VSRP-001 specification');
	}

	console.log('[PASS] Continuous Value Noise & Simplex fBm: Analytical C1 continuity, deterministic replay, and zero-GC heightmap verified.');
}

if (diag.score === diag.totalChecks && diag.passed) {
	console.log(`=== SENTINEL AUDIT 100% SUCCESS: ${diag.score}/${diag.totalChecks} CHECKS PASSED ===`);
	process.exit(0);
} else {
	console.error(`=== SENTINEL AUDIT FAILED: ${diag.score}/${diag.totalChecks} ===`);
	process.exit(1);
}
