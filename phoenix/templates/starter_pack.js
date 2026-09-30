/**
 * ============================================================================
 * PHOENIX SOVEREIGN TEMPLATES: STARTER PROJECT PACK
 * Document Identifier: VSRP-001-PHOENIX-STARTER-PACK
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Zero-CORS Static Template Asset Bundle
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

	const STARTER_MODULES = Object.freeze([
		{
			path: 'combat/combat_actions.js',
			domain: 'combat',
			source: `function runCombatAction(actor, target, skill) {\n  const base = actor.atk || 10;\n  const mod = skill.power || 1.0;\n  return base * mod;\n}`
		},
		{
			path: 'combat/combat_calc.js',
			domain: 'combat',
			source: `function calculateDamage(base, mod) {\n  return base * mod;\n}`
		},
		{
			path: 'combat/combat_ai.js',
			domain: 'combat',
			source: `function resolveEnemyIntent(enemy, party) {\n  return { target: party[0], skill: "STRIKE" };\n}`
		},
		{
			path: 'manifest/manifest_actors.js',
			domain: 'manifest',
			source: `const ACTOR_DEFS = { hero: { hp: 100, atk: 15 } };`
		},
		{
			path: 'manifest/manifest_items.js',
			domain: 'manifest',
			source: `const ITEM_DEFS = { potion: { heal: 50 } };`
		},
		{
			path: 'progression.js',
			domain: 'progression',
			source: `function calculateExp(level) {\n  return level * 100;\n}`
		},
		{
			path: 'overworld.js',
			domain: 'overworld',
			source: `function checkCollision(x, y, map) {\n  return map[y]?.[x] === "#";\n}`
		},
		{
			path: 'status.js',
			domain: 'status',
			source: `function applyAilment(target, ailment) {\n  target.status = ailment;\n}`
		},
		{
			path: 'relic_forge.js',
			domain: 'relic_forge',
			source: `function forgeRelic(seed, materials) {\n  return { id: "relic_" + seed, power: 1.2 };\n}`
		},
		{
			path: 'lockpick.js',
			domain: 'lockpick',
			source: `function checkTumbler(angle, target) {\n  return Math.abs(angle - target) < 5;\n}`
		},
		{
			path: 'tenants/hero_simulation.phx',
			domain: 'tenants',
			source: `@cartridge "HeroSimulation"
@version "1.0.0"
@author "Sovereign Artificer"
@tier 2

capabilities {
    CAP_RENDER_CANVAS2D,
    CAP_INPUT_FIFO
}

memory PERSIST_001 {
    pos_x: f32;
    pos_y: f32;
    vel_x: f32;
    vel_y: f32;
    health: u16;
}

state {
    score: int32 = 0;
    alive: boolean = true;
}

on configure(ctx) {
    this.memory.pos_x = 100.0;
    this.memory.pos_y = 100.0;
    this.memory.vel_x = 2.0;
    this.memory.vel_y = 1.0;
    this.memory.health = 100;
}

on update(tick, input) {
    this.memory.pos_x += this.memory.vel_x;
    this.memory.pos_y += this.memory.vel_y;
    if (this.memory.pos_x > 620.0) {
        this.memory.vel_x = -2.0;
    }
    if (this.memory.pos_x < 20.0) {
        this.memory.vel_x = 2.0;
    }
}

on render(ctx) {
    // 2D Canvas viewport presentation
}
`
		},
		{
			path: 'tenants/petrified_colossus.phx',
			domain: 'tenants',
			source: `@cartridge "PetrifiedColossus"
@version "1.0.0"
@author "Phoenix Synarche Foundry"
@tier 2

capabilities {
    CAP_RENDER_CANVAS2D,
    CAP_AUDIO_SYNTH,
    CAP_INPUT_FIFO
}

memory PERSIST_001 {
    metronome_timer: f32;
    systole_duration: f32;
    diastole_duration: f32;
    cardiac_phase: u8;
    current_depth: u8;
    transition_active: u8;
    boss_shield_active: u8;
    transition_timer: f32;
    screenshake_intensity: f32;
    boss_laser_angle: f32;
    reserved_cardiac: u32;

    player_x: f32;
    player_y: f32;
    player_vx: f32;
    player_vy: f32;
    vital_marrow: f32;
    max_marrow: f32;
    titan_ward: f32;
    dash_cooldown: f32;
    iframe_timer: f32;
    lance_charge: f32;
    bio_trophies: u8;
    rank_osteo_splinter: u8;
    rank_synaptic_arc: u8;
    rank_ichor_siphon: u8;
    total_marrow_harvested: u32;

    active_nodes_mask: u16;
    overloaded_nodes_mask: u16;
    grid_feedback_cooldown: f32;
    stalactite_drop_timer: f32;
}

state {
    isConfigured: boolean = false;
    isAwake: boolean = false;
    victoryStateAchieved: boolean = false;
    terminalDebriefOpen: boolean = false;
}

on configure(ctx) {
    this.memory.systole_duration = 1.6;
    this.memory.diastole_duration = 2.4;
    this.memory.cardiac_phase = 0;
    this.memory.current_depth = 1;
    this.memory.max_marrow = 100.0;
    this.memory.vital_marrow = 100.0;
    this.state.isConfigured = true;
}

on activate() {
    this.state.isAwake = true;
}

on update(tick, input) {
    if (!this.state.isAwake) return;

    // 1. CARDIAC METRONOME OSCILLATOR
    this.memory.metronome_timer += tick.deltaTime;
    if (this.memory.cardiac_phase == 0) {
        // DIASTOLIC RELAXATION
        if (this.memory.metronome_timer >= this.memory.diastole_duration) {
            this.memory.metronome_timer = 0.0;
            this.memory.cardiac_phase = 1;
            this.memory.screenshake_intensity = 6.0;
        }
    } else {
        // SYSTOLIC CONTRACTION
        if (this.memory.metronome_timer >= this.memory.systole_duration) {
            this.memory.metronome_timer = 0.0;
            this.memory.cardiac_phase = 0;
        }
    }

    // 2. KINEMATIC INTEGRATION & FLOOR DRAG (P-05 EXPONENTIAL DECAY)
    let moveMod = 1.0;
    if (this.memory.cardiac_phase == 1) {
        moveMod = 1.35; // Systolic floor hardening
    } else {
        moveMod = 0.78; // Diastolic ichor viscosity
    }

    let inputX = input.axisPrimaryX;
    let inputY = input.axisPrimaryY;
    let targetVX = inputX * 220.0 * moveMod;
    let targetVY = inputY * 220.0 * moveMod;

    let decay = 1.0 - Math.pow(0.001, tick.deltaTime);
    this.memory.player_vx += (targetVX - this.memory.player_vx) * decay;
    this.memory.player_vy += (targetVY - this.memory.player_vy) * decay;

    this.memory.player_x += this.memory.player_vx * tick.deltaTime;
    this.memory.player_y += this.memory.player_vy * tick.deltaTime;

    // 3. MARROW DASH EXECUTION & I-FRAMES
    if (this.memory.dash_cooldown > 0.0) {
        this.memory.dash_cooldown -= tick.deltaTime;
    }
    if (this.memory.iframe_timer > 0.0) {
        this.memory.iframe_timer -= tick.deltaTime;
    }

    if (input.isDown(0x20) && this.memory.dash_cooldown <= 0.0) { // Space
        this.memory.iframe_timer = 0.25;
        this.memory.dash_cooldown = 1.2;
        this.memory.player_vx = inputX * 520.0;
        this.memory.player_vy = inputY * 520.0;
    }
}

on render(ctx) {
    // Zero-allocation diegetic rendering via offscreen context
}

on suspend() {
    this.state.isAwake = false;
}

on serialize() {
    // Returns contiguous binary snapshot
}

on deserialize(buffer) {
    // Rehydrates across 8-Gate verification matrix
}

on destroy() {
    this.state.isConfigured = false;
    this.state.isAwake = false;
}
`
		},
		{
			path: 'cartridges/PetrifiedColossusCartridge.js',
			domain: 'cartridges',
			source: `/**
 * ============================================================================
 * VSRP-001 CARTRIDGE: PetrifiedColossus
 * Compiled via STCP-001 / GUCA Emitter v1.0.0-PRO
 * Authority: Tier 2 Simulation Tenant | Zero-Dependency Module
 * Standards: PSGC-001 [SEC-03] / PERSIST-001 [SEC-05] / SDCP-001 [SEC-02]
 * ============================================================================
 */
((/** @type {Record<string, any>} */ global) => {
	'use strict';

	/** @type {ArrayBuffer|null} */
	let _rawBuffer = null;
	/** @type {DataView|null} */
	let _dataView = null;

	const state = {
		isConfigured: false,
		isAwake: false,
		victoryStateAchieved: false,
		terminalDebriefOpen: false,
	};

	const _actorStateDelta = {
		type: 'ACTOR_STATE_DELTA',
		payload: {
			x: 0,
			y: 0,
			phase: 0,
			marrow: 0,
			ward: 0,
			shake: 0
		}
	};

	const memory = {
		get _view() { return _dataView; },

		// Cardiac Metronome Block (0x060 - 0x07F)
		get metronome_timer() { return this._view ? this._view.getFloat32(0, true) : 0; },
		set metronome_timer(v) { if (this._view) this._view.setFloat32(0, v, true); },

		get systole_duration() { return this._view ? this._view.getFloat32(4, true) : 0; },
		set systole_duration(v) { if (this._view) this._view.setFloat32(4, v, true); },

		get diastole_duration() { return this._view ? this._view.getFloat32(8, true) : 0; },
		set diastole_duration(v) { if (this._view) this._view.setFloat32(8, v, true); },

		get cardiac_phase() { return this._view ? this._view.getUint8(12) : 0; },
		set cardiac_phase(v) { if (this._view) this._view.setUint8(12, v); },

		get current_depth() { return this._view ? this._view.getUint8(13) : 0; },
		set current_depth(v) { if (this._view) this._view.setUint8(13, v); },

		get transition_active() { return this._view ? this._view.getUint8(14) : 0; },
		set transition_active(v) { if (this._view) this._view.setUint8(14, v); },

		get boss_shield_active() { return this._view ? this._view.getUint8(15) : 0; },
		set boss_shield_active(v) { if (this._view) this._view.setUint8(15, v); },

		get transition_timer() { return this._view ? this._view.getFloat32(16, true) : 0; },
		set transition_timer(v) { if (this._view) this._view.setFloat32(16, v, true); },

		get screenshake_intensity() { return this._view ? this._view.getFloat32(20, true) : 0; },
		set screenshake_intensity(v) { if (this._view) this._view.setFloat32(20, v, true); },

		get boss_laser_angle() { return this._view ? this._view.getFloat32(24, true) : 0; },
		set boss_laser_angle(v) { if (this._view) this._view.setFloat32(24, v, true); },

		// Primary Actor Block (0x080 - 0x0AF)
		get player_x() { return this._view ? this._view.getFloat32(32, true) : 0; },
		set player_x(v) { if (this._view) this._view.setFloat32(32, v, true); },

		get player_y() { return this._view ? this._view.getFloat32(36, true) : 0; },
		set player_y(v) { if (this._view) this._view.setFloat32(36, v, true); },

		get player_vx() { return this._view ? this._view.getFloat32(40, true) : 0; },
		set player_vx(v) { if (this._view) this._view.setFloat32(40, v, true); },

		get player_vy() { return this._view ? this._view.getFloat32(44, true) : 0; },
		set player_vy(v) { if (this._view) this._view.setFloat32(44, v, true); },

		get vital_marrow() { return this._view ? this._view.getFloat32(48, true) : 0; },
		set vital_marrow(v) { if (this._view) this._view.setFloat32(48, v, true); },

		get max_marrow() { return this._view ? this._view.getFloat32(52, true) : 0; },
		set max_marrow(v) { if (this._view) this._view.setFloat32(52, v, true); },

		get titan_ward() { return this._view ? this._view.getFloat32(56, true) : 0; },
		set titan_ward(v) { if (this._view) this._view.setFloat32(56, v, true); },

		get dash_cooldown() { return this._view ? this._view.getFloat32(60, true) : 0; },
		set dash_cooldown(v) { if (this._view) this._view.setFloat32(60, v, true); },

		get iframe_timer() { return this._view ? this._view.getFloat32(64, true) : 0; },
		set iframe_timer(v) { if (this._view) this._view.setFloat32(64, v, true); },

		get lance_charge() { return this._view ? this._view.getFloat32(68, true) : 0; },
		set lance_charge(v) { if (this._view) this._view.setFloat32(68, v, true); },

		get bio_trophies() { return this._view ? this._view.getUint8(72) : 0; },
		set bio_trophies(v) { if (this._view) this._view.setUint8(72, v); },

		get rank_osteo_splinter() { return this._view ? this._view.getUint8(73) : 0; },
		set rank_osteo_splinter(v) { if (this._view) this._view.setUint8(73, v); },

		get rank_synaptic_arc() { return this._view ? this._view.getUint8(74) : 0; },
		set rank_synaptic_arc(v) { if (this._view) this._view.setUint8(74, v); },

		get rank_ichor_siphon() { return this._view ? this._view.getUint8(75) : 0; },
		set rank_ichor_siphon(v) { if (this._view) this._view.setUint8(75, v); },

		get total_marrow_harvested() { return this._view ? this._view.getUint32(76, true) : 0; },
		set total_marrow_harvested(v) { if (this._view) this._view.setUint32(76, v, true); },

		// Grid & Hazard Block (0x0B0 - 0x0CF)
		get active_nodes_mask() { return this._view ? this._view.getUint16(80, true) : 0; },
		set active_nodes_mask(v) { if (this._view) this._view.setUint16(80, v, true); },

		get overloaded_nodes_mask() { return this._view ? this._view.getUint16(82, true) : 0; },
		set overloaded_nodes_mask(v) { if (this._view) this._view.setUint16(82, v, true); },

		get grid_feedback_cooldown() { return this._view ? this._view.getFloat32(84, true) : 0; },
		set grid_feedback_cooldown(v) { if (this._view) this._view.setFloat32(84, v, true); },

		get stalactite_drop_timer() { return this._view ? this._view.getFloat32(88, true) : 0; },
		set stalactite_drop_timer(v) { if (this._view) this._view.setFloat32(88, v, true); },
	};

	// Add at file level (outside Cartridge):
	const _deltaEnvelope = Object.seal({
		type: 'ACTOR_STATE_DELTA',
		payload: {
			x: 0,
			y: 0,
			phase: 0,
			marrow: 0,
			ward: 0,
			shake: 0
		}
	});

	const Cartridge = Object.freeze({
		protocol: 'VSRP-001',
		name: 'PetrifiedColossus',
		version: '1.0.0',
		author: 'Phoenix Synarche Foundry',
		tier: 2,
		capabilities: Object.freeze([ 'CAP_RENDER_CANVAS2D', 'CAP_AUDIO_SYNTH', 'CAP_INPUT_FIFO' ]),
		state,
		memory,

		/**
		 * @param {{ requestLinearMemory: (arg0: number) => ArrayBuffer | null; }} ctx
		 */
		configure(ctx) {
			if (ctx && typeof ctx.requestLinearMemory === 'function') {
				_rawBuffer = ctx.requestLinearMemory(1952);
				if (_rawBuffer) {
					_dataView = new DataView(_rawBuffer);
				}
			} else if (!_rawBuffer) {
				_rawBuffer = new ArrayBuffer(1952);
				_dataView = new DataView(_rawBuffer);
			}

			// Ingestion: Base defaults initialization
			memory.systole_duration = 1.6;
			memory.diastole_duration = 2.4;
			memory.cardiac_phase = 0;
			memory.current_depth = 1;
			memory.max_marrow = 100.0;
			memory.vital_marrow = 100.0;
			state.isConfigured = true;
		},

		/**
		 * @param {any} canvas
		 */
		boot(canvas) {
			// Surface initialization
		},

		activate() {
			state.isAwake = true;
		},

		/**
		 * @param {{ deltaTime: any; }} temporalTick
		 * @param {{ axisPrimaryX: number; axisPrimaryY: number; buttonMask: number; }} input
		 */
		update(temporalTick, input) {
			if (!state.isAwake || state.terminalDebriefOpen) {
				return null;
			}

			const dt = temporalTick.deltaTime;

			// 1. CARDIAC METRONOME OSCILLATOR (Cadence Shift)
			memory.metronome_timer += dt;
			if (memory.cardiac_phase === 0) {
				// Diastolic Relaxation
				if (memory.metronome_timer >= memory.diastole_duration) {
					memory.metronome_timer = 0.0;
					memory.cardiac_phase = 1;
					memory.screenshake_intensity = 6.0;
				}
			} else {
				// Systolic Contraction
				if (memory.metronome_timer >= memory.systole_duration) {
					memory.metronome_timer = 0.0;
					memory.cardiac_phase = 0;
				}
			}

			// 2. KINEMATIC INTEGRATION VIA EXPONENTIAL DECAY [P-05]
			const moveMod = (memory.cardiac_phase === 1) ? 1.35 : 0.78;
			const targetVX = input.axisPrimaryX * 220.0 * moveMod;
			const targetVY = input.axisPrimaryY * 220.0 * moveMod;

			// Frame-rate independent decay: 1 - base^(dt)
			const lerpFactor = 1.0 - Math.pow(0.0001, dt);
			memory.player_vx += (targetVX - memory.player_vx) * lerpFactor;
			memory.player_vy += (targetVY - memory.player_vy) * lerpFactor;

			memory.player_x += memory.player_vx * dt;
			memory.player_y += memory.player_vy * dt;

			// 3. DEFENSIVE TIMERS (I-Frames & Cooldowns)
			if (memory.dash_cooldown > 0.0) {
				memory.dash_cooldown = Math.max(0.0, memory.dash_cooldown - dt);
			}
			if (memory.iframe_timer > 0.0) {
				memory.iframe_timer = Math.max(0.0, memory.iframe_timer - dt);
			}
			if (memory.screenshake_intensity > 0.0) {
				memory.screenshake_intensity = Math.max(0.0, memory.screenshake_intensity - dt * 12.0);
			}

			// 4. ACTION-INVERSION: MARROW DASH TRIGGER
			if ((input.buttonMask & 0x01) !== 0 && memory.dash_cooldown <= 0.0) {
				memory.iframe_timer = 0.25;
				memory.dash_cooldown = 1.2;
				memory.player_vx = input.axisPrimaryX * 540.0;
				memory.player_vy = input.axisPrimaryY * 540.0;
			}

			// Delta envelope emitted back to sovereign chassis [INV-06]
			_actorStateDelta.payload.x = memory.player_x;
			_actorStateDelta.payload.y = memory.player_y;
			_actorStateDelta.payload.phase = memory.cardiac_phase;
			_actorStateDelta.payload.marrow = memory.vital_marrow;
			_actorStateDelta.payload.ward = memory.titan_ward;
			_actorStateDelta.payload.shake = memory.screenshake_intensity;
			return _actorStateDelta;
		},

		/**
		 * @param {any} ctx
		 */
		render(ctx) {
			if (!ctx) return;
			const w = ctx.canvas?.width || 640;
			const h = ctx.canvas?.height || 480;

			// 1. Arena Backdrop with Cardiac Pulse Tint
			ctx.fillStyle = memory.cardiac_phase === 1 ? '#180a0a' : '#0a0d14';
			ctx.fillRect(0, 0, w, h);

			// Arena Boundary Ring
			const cx = w * 0.5;
			const cy = h * 0.48;
			ctx.strokeStyle = '#1b2a3a';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(cx, cy, 180, 0, 6.28318);
			ctx.stroke();

			// 2. Colossus Core Metronome Chamber (Center Stage)
			const radius = 64 + (memory.cardiac_phase === 1 ? 12 : 0);
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, 6.28318);
			ctx.fillStyle = memory.cardiac_phase === 1 ? '#8a1c1c' : '#22384f';
			ctx.fill();
			ctx.strokeStyle = memory.boss_shield_active ? '#00e5ff' : '#ff4444';
			ctx.lineWidth = 4;
			ctx.stroke();

			// Core Label
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 11px monospace';
			ctx.textAlign = 'center';
			ctx.fillText('COLOSSUS CORE', cx, cy);

			// 3. Player Entity
			const px = cx + (memory.player_x || 0);
			const py = cy + (memory.player_y || 80);
			ctx.fillStyle = '#00ffa3';
			ctx.beginPath();
			ctx.arc(px, py, 10, 0, 6.28318);
			ctx.fill();
			ctx.strokeStyle = '#ffffff';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillText('PLAYER', px, py + 22);

			// 4. Diegetic HUD Banner
			ctx.textAlign = 'left';
			ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
			ctx.fillRect(0, 0, w, 52);
			ctx.fillStyle = '#00ffa3';
			ctx.font = 'bold 12px monospace';
			ctx.fillText('🗿 PETRIFIED COLOSSUS [VSRP-001 BOSS SLICE]', 16, 20);
			ctx.fillStyle = '#00ffcc';
			ctx.font = '11px monospace';
			ctx.fillText(memory.cardiac_phase === 1 ? 'STATE: SYSTOLE (CRITICAL HEARTBEAT) | CONTROLS: WASD / ARROWS TO MOVE, SHIFT/Z TO DASH' : 'STATE: DIASTOLE (RESTING RECHARGE)  | CONTROLS: WASD / ARROWS TO MOVE, SHIFT/Z TO DASH', 16, 38);
		},

		suspend() {
			state.isAwake = false;
		},

		serialize() {
			if (!_rawBuffer) return new Uint8Array(0);
			return new Uint8Array(_rawBuffer.slice(0));
		},

		/**
		 * @param {any} buffer
		 */
		deserialize(buffer) {
			if (!buffer || !_rawBuffer) return;
			const src = new Uint8Array(buffer);
			new Uint8Array(_rawBuffer).set(src.subarray(0, _rawBuffer.byteLength));
		},

		reset() {
			if (_rawBuffer) {
				new Uint8Array(_rawBuffer).fill(0);
			}
			memory.systole_duration = 1.6;
			memory.diastole_duration = 2.4;
			memory.max_marrow = 100.0;
			memory.vital_marrow = 100.0;
			state.victoryStateAchieved = false;
			state.terminalDebriefOpen = false;
		},

		destroy() {
			state.isConfigured = false;
			state.isAwake = false;
			_rawBuffer = null;
			_dataView = null;
		},

		/* 64-BYTE PEVM CODEX PROVENANCE LEDGER [SEC-05] */
		_pevmProvenance: Object.freeze({
			magic: 0x5053594E,
			schemaVersion: '1.0.0',
			compiler: 'STCP-GUCA-v1.0.0-PRO',
			compiledAt: 1774318500000,
		})
	});

	global.PetrifiedColossusCartridge = Cartridge;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Cartridge;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
`
		}
,
		{
			path: 'cartridges/mario_platformer_cartridge.js',
			domain: 'cartridges',
			source: `/* ============================================================================
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
    let _heap = null;
    let _view = null;
    let _ctx = null;

    // Binary Offsets (PERSIST-001 Layout)
    const OFFSET_PLAYER   = 0x060; // 32 Bytes
    const OFFSET_BLOCKS   = 0x080; // 16 blocks * 32B = 512B (0x080 - 0x27F)
    const OFFSET_GOOMBAS  = 0x280; // 8 goombas * 32B = 256B (0x280 - 0x37F)
    const OFFSET_COINS    = 0x380; // 16 coins * 32B = 512B (0x380 - 0x57F)
    const OFFSET_GAME_METRICS = 0x580; // Score, Coins, Lives, CamX (32B)

    // Entity State Flags
    const FLAG_ACTIVE   = 0x01;
    const FLAG_PLAYER   = 0x02;
    const FLAG_GROUNDED = 0x04;
    const FLAG_SOLID    = 0x08;
    const FLAG_GOOMBA   = 0x10;
    const FLAG_COIN     = 0x20;
    const FLAG_QUESTION = 0x40;

    // Zero-Allocation Stride Helpers
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
    function checkAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
        return (x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2);
    }

    return {
        protocol: 'VSRP-001',
        name: 'MarioPlatformerCartridge',
        version: '1.0.0',
        author: 'Phoenix Synarche Foundry',
        tier: 2,
        capabilities: Object.freeze(['CAP_RENDER_CANVAS2D', 'CAP_INPUT_FIFO']),

        getModuleInfo() {
            return {
                id: 'MARIO-PLATFORMER-VSRP-001',
                version: '1.0.0',
                memoryHeapBytes: 2048
            };
        },

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

        update(tickSnapshot, inputSnapshot) {
            if (_vsrpState !== 'ACTIVE') return null;

            // Increment Monotonic Tick
            const currentTick = _view.getBigInt64(0x004, true) + 1n;
            _view.setBigInt64(0x004, currentTick, true);

            // Read Player State
            let px  = _view.getFloat32(OFFSET_PLAYER + 4, true);
            let py  = _view.getFloat32(OFFSET_PLAYER + 8, true);
            let pvx = _view.getFloat32(OFFSET_PLAYER + 12, true);
            let pvy = _view.getFloat32(OFFSET_PLAYER + 16, true);
            const pw  = _view.getFloat32(OFFSET_PLAYER + 20, true);
            const ph  = _view.getFloat32(OFFSET_PLAYER + 24, true);
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

                let gx  = _view.getFloat32(gOffset + 4, true);
                let gy  = _view.getFloat32(gOffset + 8, true);
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

        render(ctx, alpha) {
            if (_vsrpState !== 'ACTIVE' || !ctx) return;

            const camX  = _view.getFloat32(OFFSET_GAME_METRICS + 12, true);
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

        suspend()   { _vsrpState = 'SUSPENDED'; },
        resume()    { _vsrpState = 'ACTIVE'; },
        serialize() { return new Uint8Array(_heap.slice(0)); },
        deserialize(buf) { new Uint8Array(_heap).set(new Uint8Array(buf)); },
        reset()     { initWorldMemory(); _vsrpState = 'CONFIGURED'; },
        destroy()   { _ctx = null; _heap = null; _view = null; _vsrpState = 'DESTROYED'; }
    };
});
`
		}
	]);

	const PhoenixStarterPack = Object.freeze({
		MODULES: STARTER_MODULES,
		/**
		 * @param {string} path
		 */
		getModule(path) {
			return STARTER_MODULES.find(m => m.path === path) || null;
		}
	});

	global.PhoenixStarterPack = PhoenixStarterPack;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PhoenixStarterPack;
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
