/* ============================================================================
 * PHOENIX SOVEREIGN VSRP-001 CARTRIDGE: MarioPlatformerSlice
 * Standards: PSGC-001 / PERSIST-001 / VSRP-001 / PJOD-001 / PJOD-013
 * Memory Layout: PERSIST-001 (2,048-Byte ArrayBuffer)
 * ============================================================================
 */

/**
 * ============================================================================
 * HOLOGRAPHIC MONOLITH INDEX & INVARIANT MATRIX [TENSOR-001]
 * ============================================================================
 * @tensor-version  1.0.0
 * @memory-layout   PERSIST-001 Contiguous Little-Endian Linear Heap (2,048 Bytes)
 * @memory-map {
 *   "TRIPARTITE_HEADER": { "offset": "0x000", "stride": 96, "format": "Core/Provenance/Capability" },
 *   "PLAYER_REGISTER":   { "offset": "0x060", "stride": 32, "format": "Player Kinematics & State" },
 *   "BLOCK_POOL":        { "offset": "0x080", "stride": 32, "format": "16 Blocks x 32 Bytes" },
 *   "GOOMBA_POOL":       { "offset": "0x280", "stride": 32, "format": "8 Goombas x 32 Bytes" },
 *   "COIN_POOL":         { "offset": "0x380", "stride": 32, "format": "16 Coins x 32 Bytes" }
 * }
 * @subsystem-graph {
 *   "[SEC-00]": { "id": "PREAMBLE",        "deps": [] },
 *   "[SEC-05]": { "id": "PERSIST_HEAP",    "deps": ["[SEC-00]"] },
 *   "[SEC-06]": { "id": "INPUT_TRANSDUCER","deps": ["[SEC-05]"] },
 *   "[SEC-03]": { "id": "MARIO_CARTRIDGE", "deps": ["[SEC-05]", "[SEC-06]"] },
 *   "[SEC-23]": { "id": "WATCHDOG_CLOCK",  "deps": ["[SEC-03]", "[SEC-08]"] }
 * }
 * @invariants [
 *   "INV-01: Genre/Theme-Agnostic Isolation",
 *   "INV-02: Zero External Dependencies",
 *   "INV-03: Single-File Autonomy",
 *   "INV-04: 60Hz Accumulator Loop Primacy",
 *   "INV-05: Contiguous Binary Memory Authority (PERSIST-001)",
 *   "INV-06: Strict Action-Inversion (Delta Envelopes)",
 *   "INV-07: Capability Attenuation (SDCP-001)",
 *   "INV-08: Zero Hot-Loop Allocations (Garbage-Collection Immunity)"
 * ]
 */

(function (root, factory) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = factory();
	} else {
		root.MarioPlatformerCartridge = factory();
	}
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	// FSM State Register
	let _vsrpState = 'UNREGISTERED';
	/**
	 * @type {string | any[] | null}
	 */
	let _heap = null;
	/**
	 * @type {DataView<any> | null}
	 */
	let _view = null;
	let _ctx = null;

	// Binary Offsets (PERSIST-001 Layout)
	const OFFSET_PLAYER = 0x060; // 32 Bytes
	const OFFSET_BLOCKS = 0x080; // 16 blocks * 32B = 512B (0x080 - 0x27F)
	const OFFSET_GOOMBAS = 0x280; // 8 goombas * 32B = 256B (0x280 - 0x37F)
	const OFFSET_COINS = 0x380; // 16 coins * 32B = 512B (0x380 - 0x57F)
	const OFFSET_GAME_METRICS = 0x580; // Score, Coins, Lives, CamX (32B)

	// Entity State Flags
	const FLAG_ACTIVE = 0x01;
	const FLAG_PLAYER = 0x02;
	const FLAG_GROUNDED = 0x04;
	const FLAG_SOLID = 0x08;
	const FLAG_GOOMBA = 0x10;
	const FLAG_COIN = 0x20;
	const FLAG_QUESTION = 0x40;

	// Zero-Allocation Stride Helpers
	/**
	 * @param {number} offset
	 * @param {number} flags
	 * @param {number} x
	 * @param {number} y
	 * @param {number} vx
	 * @param {number} vy
	 * @param {number} w
	 * @param {number} h
	 * @param {number} state
	 */
	function setEntity(offset, flags, x, y, vx, vy, w, h, state) {
		_view.setUint32(offset + 0, flags, true);
		_view.setFloat32(offset + 4, x, true);
		_view.setFloat32(offset + 8, y, true);
		_view.setFloat32(offset + 12, vx, true);
		_view.setFloat32(offset + 16, vy, true);
		_view.setFloat32(offset + 20, w, true);
		_view.setFloat32(offset + 24, h, true);
		_view.setUint32(offset + 28, state, true);
	}

	function initWorldMemory() {
		// Clear Heap Payload Region (0x060 - 0x7FF)
		new Uint8Array(_heap, 0x060, 1952).fill(0);

		// 1. Initialize Player at (x: 60, y: 380, w: 24, h: 32)
		setEntity(OFFSET_PLAYER, FLAG_ACTIVE | FLAG_PLAYER, 60, 380, 0, 0, 24, 32, 1); // State 1: Facing Right

		// 2. Initialize Ground & Platform Blocks
		let bIdx = 0;
		// Ground Section 1 (x: 0 to 440)
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 0, 440, 0, 0, 440, 40, 0);
		// Ground Section 2 (x: 540 to 1200) - Creates a pit between 440 and 540
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 540, 440, 0, 0, 660, 40, 0);
		// Raised Brick & Question Blocks
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 180, 320, 0, 0, 32, 32, 1); // Brick
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID | FLAG_QUESTION, 212, 320, 0, 0, 32, 32, 0); // ? Block
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 244, 320, 0, 0, 32, 32, 1); // Brick
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID | FLAG_QUESTION, 276, 320, 0, 0, 32, 32, 0); // ? Block
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 308, 320, 0, 0, 32, 32, 1); // Brick
		// High Pipe Barrier
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 680, 376, 0, 0, 48, 64, 2); // Pipe
		setEntity(OFFSET_BLOCKS + (bIdx++ * 32), FLAG_ACTIVE | FLAG_SOLID, 900, 344, 0, 0, 48, 96, 2); // Tall Pipe

		// 3. Initialize Goombas
		let gIdx = 0;
		setEntity(OFFSET_GOOMBAS + (gIdx++ * 32), FLAG_ACTIVE | FLAG_GOOMBA, 340, 408, -1.2, 0, 24, 24, 0);
		setEntity(OFFSET_GOOMBAS + (gIdx++ * 32), FLAG_ACTIVE | FLAG_GOOMBA, 620, 408, -1.0, 0, 24, 24, 0);
		setEntity(OFFSET_GOOMBAS + (gIdx++ * 32), FLAG_ACTIVE | FLAG_GOOMBA, 800, 408, -1.5, 0, 24, 24, 0);

		// 4. Initialize Collectible Coins
		let cIdx = 0;
		setEntity(OFFSET_COINS + (cIdx++ * 32), FLAG_ACTIVE | FLAG_COIN, 218, 280, 0, 0, 20, 20, 0);
		setEntity(OFFSET_COINS + (cIdx++ * 32), FLAG_ACTIVE | FLAG_COIN, 282, 280, 0, 0, 20, 20, 0);
		setEntity(OFFSET_COINS + (cIdx++ * 32), FLAG_ACTIVE | FLAG_COIN, 600, 380, 0, 0, 20, 20, 0);
		setEntity(OFFSET_COINS + (cIdx++ * 32), FLAG_ACTIVE | FLAG_COIN, 630, 380, 0, 0, 20, 20, 0);
		setEntity(OFFSET_COINS + (cIdx++ * 32), FLAG_ACTIVE | FLAG_COIN, 660, 380, 0, 0, 20, 20, 0);

		// 5. Game Metrics (Score: 0, Coins: 0, Lives: 3, CamX: 0)
		_view.setUint32(OFFSET_GAME_METRICS + 0, 0, true); // Score
		_view.setUint32(OFFSET_GAME_METRICS + 4, 0, true); // Coins
		_view.setUint32(OFFSET_GAME_METRICS + 8, 3, true); // Lives
		_view.setFloat32(OFFSET_GAME_METRICS + 12, 0, true); // CamX
	}

	// AABB Collision Detection Helper
	/**
	 * @param {number} x1
	 * @param {number} y1
	 * @param {any} w1
	 * @param {any} h1
	 * @param {number} x2
	 * @param {number} y2
	 * @param {any} w2
	 * @param {any} h2
	 */
	function checkAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
		return (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2);
	}

	return {
		protocol: 'VSRP-001',
		name: 'MarioPlatformerCartridge',
		version: '1.0.0',
		author: 'Phoenix Synarche Foundry',
		tier: 2,
		capabilities: Object.freeze([ 'CAP_RENDER_CANVAS2D', 'CAP_INPUT_FIFO' ]),

		getModuleInfo() {
			return {
				id: 'MARIO-PLATFORMER-VSRP-001',
				version: '1.0.0',
				memoryHeapBytes: 2048
			};
		},

		/**
		 * @param {{ sharedHeap: any; }} ctx
		 */
		configure(ctx) {
			if (_vsrpState !== 'UNREGISTERED' && _vsrpState !== 'CONFIGURED') {
				throw new Error('ERR_0x04: INVALID_STATE_TRANSITION');
			}
			_ctx = ctx;
			_heap = (ctx && ctx.sharedHeap) ? ctx.sharedHeap : new ArrayBuffer(2048);
			_view = new DataView(_heap);

			// Set Header Magic PSYN
			_view.setUint32(0x000, 0x5053594E, true);
			_view.setBigInt64(0x004, 1n, true);

			initWorldMemory();
			_vsrpState = 'CONFIGURED';
		},

		/**
		 * @param {{ getContext: (arg0: string) => any; }} canvas
		 */
		boot(canvas) {
			if (canvas && typeof canvas.getContext === 'function') {
				_ctx = canvas.getContext('2d');
			}
		},

		activate() {
			if (_vsrpState !== 'CONFIGURED' && _vsrpState !== 'SUSPENDED') {
				throw new Error('ERR_0x04: INVALID_STATE_TRANSITION');
			}
			_vsrpState = 'ACTIVE';
		},

		/**
		 * @param {any} tickSnapshot
		 * @param {{ buttonMask: number; isDown: (arg0: string) => any; }} inputSnapshot
		 */
		update(tickSnapshot, inputSnapshot) {
			if (_vsrpState !== 'ACTIVE') return null;

			// Increment Monotonic Tick
			const currentTick = _view.getBigInt64(0x004, true) + 1n;
			_view.setBigInt64(0x004, currentTick, true);

			// Read Player State
			let px = _view.getFloat32(OFFSET_PLAYER + 4, true);
			let py = _view.getFloat32(OFFSET_PLAYER + 8, true);
			let pvx = _view.getFloat32(OFFSET_PLAYER + 12, true);
			let pvy = _view.getFloat32(OFFSET_PLAYER + 16, true);
			const pw = _view.getFloat32(OFFSET_PLAYER + 20, true);
			const ph = _view.getFloat32(OFFSET_PLAYER + 24, true);
			let pFlags = _view.getUint32(OFFSET_PLAYER + 0, true);
			let facing = _view.getUint32(OFFSET_PLAYER + 28, true);

			const isGrounded = (pFlags & FLAG_GROUNDED) !== 0;

			// Read Input Bitmask (0x01: Left, 0x02: Right, 0x04: Jump, 0x08: Run)
			let mask = 0;
			if (inputSnapshot) {
				if (typeof inputSnapshot.buttonMask === 'number') {
					mask = inputSnapshot.buttonMask;
				} else if (typeof inputSnapshot.isDown === 'function') {
					if (inputSnapshot.isDown('ArrowLeft') || inputSnapshot.isDown('KeyA') || inputSnapshot.isDown('a')) mask |= 0x01;
					if (inputSnapshot.isDown('ArrowRight') || inputSnapshot.isDown('KeyD') || inputSnapshot.isDown('d')) mask |= 0x02;
					if (inputSnapshot.isDown('ArrowUp') || inputSnapshot.isDown('KeyW') || inputSnapshot.isDown('w') || inputSnapshot.isDown(' ')) mask |= 0x04;
					if (inputSnapshot.isDown('Shift') || inputSnapshot.isDown('KeyZ') || inputSnapshot.isDown('z')) mask |= 0x08;
				}
			}
			const ACCEL = (mask & 0x08) ? 0.8 : 0.5; // Run modifier
			const MAX_SPEED = (mask & 0x08) ? 5.5 : 3.5;

			if (mask & 0x01) { // Left
				pvx -= ACCEL;
				facing = 0; // Facing Left
			} else if (mask & 0x02) { // Right
				pvx += ACCEL;
				facing = 1; // Facing Right
			} else {
				pvx *= 0.82; // Friction decay
			}

			// Clamp Horizontal Velocity
			if (pvx > MAX_SPEED) pvx = MAX_SPEED;
			if (pvx < -MAX_SPEED) pvx = -MAX_SPEED;

			// Jump Impulse
			if ((mask & 0x04) && isGrounded) {
				pvy = -11.5; // Jump strength
				pFlags &= ~FLAG_GROUNDED; // Lift off
			}

			// Apply Gravity
			pvy += 0.55;
			if (pvy > 12.0) pvy = 12.0; // Terminal velocity

			// Advance Player Position X & Resolve Collisions
			px += pvx;
			for (let i = 0; i < 16; i++) {
				const bOffset = OFFSET_BLOCKS + (i * 32);
				const bFlags = _view.getUint32(bOffset + 0, true);
				if ((bFlags & FLAG_ACTIVE) === 0) continue;

				const bx = _view.getFloat32(bOffset + 4, true);
				const by = _view.getFloat32(bOffset + 8, true);
				const bw = _view.getFloat32(bOffset + 20, true);
				const bh = _view.getFloat32(bOffset + 24, true);

				if (checkAABB(px, py, pw, ph, bx, by, bw, bh)) {
					if (pvx > 0) px = bx - pw;
					else if (pvx < 0) px = bx + bw;
					pvx = 0;
				}
			}

			// Advance Player Position Y & Resolve Collisions
			py += pvy;
			let groundedThisFrame = false;

			for (let i = 0; i < 16; i++) {
				const bOffset = OFFSET_BLOCKS + (i * 32);
				const bFlags = _view.getUint32(bOffset + 0, true);
				if ((bFlags & FLAG_ACTIVE) === 0) continue;

				const bx = _view.getFloat32(bOffset + 4, true);
				const by = _view.getFloat32(bOffset + 8, true);
				const bw = _view.getFloat32(bOffset + 20, true);
				const bh = _view.getFloat32(bOffset + 24, true);

				if (checkAABB(px, py, pw, ph, bx, by, bw, bh)) {
					if (pvy > 0) { // Landing on top
						py = by - ph;
						pvy = 0;
						groundedThisFrame = true;
					} else if (pvy < 0) { // Hitting block from below
						py = by + bh;
						pvy = 0;
						if (bFlags & FLAG_QUESTION) {
							// Convert ? block to empty block and add score/coin
							_view.setUint32(bOffset + 0, bFlags & ~FLAG_QUESTION, true);
							_view.setUint32(bOffset + 28, 3, true); // State 3: Empty
							let score = _view.getUint32(OFFSET_GAME_METRICS + 0, true);
							let coins = _view.getUint32(OFFSET_GAME_METRICS + 4, true);
							_view.setUint32(OFFSET_GAME_METRICS + 0, score + 200, true);
							_view.setUint32(OFFSET_GAME_METRICS + 4, coins + 1, true);
						}
					}
				}
			}

			if (groundedThisFrame) pFlags |= FLAG_GROUNDED;
			else pFlags &= ~FLAG_GROUNDED;

			// Update Goombas
			for (let i = 0; i < 8; i++) {
				const gOffset = OFFSET_GOOMBAS + (i * 32);
				let gFlags = _view.getUint32(gOffset + 0, true);
				if ((gFlags & FLAG_ACTIVE) === 0) continue;

				let gx = _view.getFloat32(gOffset + 4, true);
				let gy = _view.getFloat32(gOffset + 8, true);
				let gvx = _view.getFloat32(gOffset + 12, true);
				const gw = _view.getFloat32(gOffset + 20, true);
				const gh = _view.getFloat32(gOffset + 24, true);

				gx += gvx;
				// Patrol reverse bounds
				if (gx < 320 || gx > 980) gvx = -gvx;

				_view.setFloat32(gOffset + 4, gx, true);
				_view.setFloat32(gOffset + 12, gvx, true);

				// Check Collision with Player
				if (checkAABB(px, py, pw, ph, gx, gy, gw, gh)) {
					if (pvy > 0 && py + ph < gy + 12) { // Stomp Goomba
						_view.setUint32(gOffset + 0, 0, true); // Deactivate Goomba
						pvy = -7.5; // Stomp bounce
						let score = _view.getUint32(OFFSET_GAME_METRICS + 0, true);
						_view.setUint32(OFFSET_GAME_METRICS + 0, score + 100, true);
					} else { // Player hit by Goomba
						let lives = _view.getUint32(OFFSET_GAME_METRICS + 8, true);
						if (lives > 0) lives--;
						_view.setUint32(OFFSET_GAME_METRICS + 8, lives, true);
						// Reset player spawn
						px = 60; py = 380; pvx = 0; pvy = 0;
					}
				}
			}

			// Update Coin Collection
			for (let i = 0; i < 16; i++) {
				const cOffset = OFFSET_COINS + (i * 32);
				let cFlags = _view.getUint32(cOffset + 0, true);
				if ((cFlags & FLAG_ACTIVE) === 0) continue;

				const cx = _view.getFloat32(cOffset + 4, true);
				const cy = _view.getFloat32(cOffset + 8, true);
				const cw = _view.getFloat32(cOffset + 20, true);
				const ch = _view.getFloat32(cOffset + 24, true);

				if (checkAABB(px, py, pw, ph, cx, cy, cw, ch)) {
					_view.setUint32(cOffset + 0, 0, true); // Collect coin
					let score = _view.getUint32(OFFSET_GAME_METRICS + 0, true);
					let coins = _view.getUint32(OFFSET_GAME_METRICS + 4, true);
					_view.setUint32(OFFSET_GAME_METRICS + 0, score + 200, true);
					_view.setUint32(OFFSET_GAME_METRICS + 4, coins + 1, true);
				}
			}

			// Pit Death Check
			if (py > 520) {
				let lives = _view.getUint32(OFFSET_GAME_METRICS + 8, true);
				if (lives > 0) lives--;
				_view.setUint32(OFFSET_GAME_METRICS + 8, lives, true);
				px = 60; py = 380; pvx = 0; pvy = 0;
			}

			// Smooth Camera Tracking X
			let camX = px - 300;
			if (camX < 0) camX = 0;
			if (camX > 600) camX = 600;
			_view.setFloat32(OFFSET_GAME_METRICS + 12, camX, true);

			// Write back player kinematics
			_view.setUint32(OFFSET_PLAYER + 0, pFlags, true);
			_view.setFloat32(OFFSET_PLAYER + 4, px, true);
			_view.setFloat32(OFFSET_PLAYER + 8, py, true);
			_view.setFloat32(OFFSET_PLAYER + 12, pvx, true);
			_view.setFloat32(OFFSET_PLAYER + 16, pvy, true);
			_view.setUint32(OFFSET_PLAYER + 28, facing, true);

			return null; // Action-inversion zero-allocation compliant return
		},

		/**
		 * @param {{ fillStyle: string; fillRect: (arg0: number, arg1: number, arg2: number, arg3: number) => void; save: () => void; translate: (arg0: number, arg1: number) => void; strokeStyle: string; strokeRect: (arg0: any, arg1: any, arg2: any, arg3: any) => void; font: string; fillText: (arg0: string, arg1: number, arg2: number) => void; lineWidth: number; beginPath: () => void; arc: (arg0: any, arg1: any, arg2: number, arg3: number, arg4: number) => void; fill: () => void; stroke: () => void; restore: () => void; }} ctx
		 * @param {any} alpha
		 */
		render(ctx, alpha) {
			if (_vsrpState !== 'ACTIVE' || !ctx) return;

			const camX = _view.getFloat32(OFFSET_GAME_METRICS + 12, true);
			const score = _view.getUint32(OFFSET_GAME_METRICS + 0, true);
			const coins = _view.getUint32(OFFSET_GAME_METRICS + 4, true);
			const lives = _view.getUint32(OFFSET_GAME_METRICS + 8, true);

			// Clear Viewport (Sky Blue)
			ctx.fillStyle = '#5c94fc';
			ctx.fillRect(0, 0, 1248, 960);

			ctx.save();
			ctx.translate(-camX, 0);

			// 1. Draw Blocks & Ground
			for (let i = 0; i < 16; i++) {
				const bOffset = OFFSET_BLOCKS + (i * 32);
				const bFlags = _view.getUint32(bOffset + 0, true);
				if ((bFlags & FLAG_ACTIVE) === 0) continue;

				const bx = _view.getFloat32(bOffset + 4, true);
				const by = _view.getFloat32(bOffset + 8, true);
				const bw = _view.getFloat32(bOffset + 20, true);
				const bh = _view.getFloat32(bOffset + 24, true);
				const bState = _view.getUint32(bOffset + 28, true);

				if (bFlags & FLAG_QUESTION) {
					// Question Block (Gold)
					ctx.fillStyle = '#fcb42c';
					ctx.fillRect(bx, by, bw, bh);
					ctx.strokeStyle = '#000000';
					ctx.strokeRect(bx, by, bw, bh);
					ctx.fillStyle = '#000000';
					ctx.font = 'bold 20px monospace';
					ctx.fillText('?', bx + 10, by + 24);
				} else if (bState === 2) { // Pipe
					ctx.fillStyle = '#00a800';
					ctx.fillRect(bx, by, bw, bh);
					ctx.strokeStyle = '#005800';
					ctx.lineWidth = 3;
					ctx.strokeRect(bx, by, bw, bh);
				} else if (bState === 3) { // Empty Block
					ctx.fillStyle = '#949494';
					ctx.fillRect(bx, by, bw, bh);
					ctx.strokeRect(bx, by, bw, bh);
				} else { // Brick / Ground
					ctx.fillStyle = (by >= 440) ? '#e45c10' : '#b84418';
					ctx.fillRect(bx, by, bw, bh);
					ctx.strokeStyle = '#000000';
					ctx.lineWidth = 1;
					ctx.strokeRect(bx, by, bw, bh);
				}
			}

			// 2. Draw Coins
			for (let i = 0; i < 16; i++) {
				const cOffset = OFFSET_COINS + (i * 32);
				if ((_view.getUint32(cOffset + 0, true) & FLAG_ACTIVE) === 0) continue;

				const cx = _view.getFloat32(cOffset + 4, true);
				const cy = _view.getFloat32(cOffset + 8, true);
				const cw = _view.getFloat32(cOffset + 20, true);

				ctx.fillStyle = '#fce400';
				ctx.beginPath();
				ctx.arc(cx + (cw * 0.5), cy + (cw * 0.5), cw * 0.4, 0, 6.28318);
				ctx.fill();
				ctx.strokeStyle = '#000000';
				ctx.stroke();
			}

			// 3. Draw Goombas
			for (let i = 0; i < 8; i++) {
				const gOffset = OFFSET_GOOMBAS + (i * 32);
				if ((_view.getUint32(gOffset + 0, true) & FLAG_ACTIVE) === 0) continue;

				const gx = _view.getFloat32(gOffset + 4, true);
				const gy = _view.getFloat32(gOffset + 8, true);
				const gw = _view.getFloat32(gOffset + 20, true);
				const gh = _view.getFloat32(gOffset + 24, true);

				// Goomba Body (Brown Mushroom)
				ctx.fillStyle = '#a84400';
				ctx.fillRect(gx, gy, gw, gh);
				ctx.fillStyle = '#fce4a0'; // Eyes/Feet
				ctx.fillRect(gx + 4, gy + 14, 4, 6);
				ctx.fillRect(gx + 16, gy + 14, 4, 6);
			}

			// 4. Draw Player (Mario Sprite Box)
			const px = _view.getFloat32(OFFSET_PLAYER + 4, true);
			const py = _view.getFloat32(OFFSET_PLAYER + 8, true);
			const pw = _view.getFloat32(OFFSET_PLAYER + 20, true);
			const ph = _view.getFloat32(OFFSET_PLAYER + 24, true);

			// Shirt / Cap (Red)
			ctx.fillStyle = '#fc1400';
			ctx.fillRect(px, py, pw, 12);
			// Overalls (Blue)
			ctx.fillStyle = '#0024fc';
			ctx.fillRect(px, py + 12, pw, ph - 12);

			ctx.restore();

			// 5. Draw Diegetic HUD Overlay (Screen Space)
			ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
			ctx.fillRect(0, 0, 1248, 48);
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 18px monospace';
			ctx.fillText('MARIO: ' + String(score).padStart(6, '0') + '  COINS: x' + String(coins).padStart(2, '0') + '  LIVES: ' + lives, 24, 30);
		},

		suspend() { _vsrpState = 'SUSPENDED'; },
		resume() { _vsrpState = 'ACTIVE'; },
		serialize() { return new Uint8Array(_heap.slice(0)); },
		/**
		 * @param {any} buf
		 */
		deserialize(buf) { new Uint8Array(_heap).set(new Uint8Array(buf)); },
		reset() { initWorldMemory(); _vsrpState = 'CONFIGURED'; },
		destroy() { _ctx = null; _heap = null; _view = null; _vsrpState = 'DESTROYED'; }
	};
});
