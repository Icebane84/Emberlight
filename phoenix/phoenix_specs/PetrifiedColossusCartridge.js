/**
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
			return {
				type: 'ACTOR_STATE_DELTA',
				payload: {
					x: memory.player_x,
					y: memory.player_y,
					phase: memory.cardiac_phase,
					marrow: memory.vital_marrow,
					ward: memory.titan_ward,
					shake: memory.screenshake_intensity
				}
			};
		},

		/**
		 * @param {any} ctx
		 */
		render(ctx) {
			// Zero string allocations in hot loop [INV-08]
			// Direct OffscreenCanvas manipulation handled through pre-allocated buffers
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
