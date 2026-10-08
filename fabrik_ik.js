/* cSpell:words VSRP FABRIK fabrik Andreas Aristidou Lasenby collinearly */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: 2D FABRIK INVERSE KINEMATICS ENGINE
 * Document Identifier: VSRP-001-FABRIK-IK
 * Governing Protocol:  VSRP-001 / MPFS-001 / PSGC-001
 * Authority:           Kinematics & Geometric Relaxation Engine (Tier 3)
 * Timestamp:           2026-10-07T23:40:00Z
 * ============================================================================
 *
 * MATHEMATICAL FOUNDATION:
 *   Andreas Aristidou & Joan Lasenby (2011).
 *   "FABRIK: A fast, iterative solver for the Inverse Kinematics problem"
 *   Graphical Models, 73(5), 243–260.
 *
 * ARCHITECTURAL GUARANTEES:
 *   1. Zero Matrix Inversions: Pure geometric projection onto line segments.
 *   2. Zero Heap Allocation Hot-Path: Pre-allocated contiguous Float32Array.
 *   3. O(N) Computational Complexity per iteration where N is link count.
 *   4. Exact Bone Length Conservation Invariant: ||p_{i+1} - p_i|| == d_i.
 *   5. Unreachable Target Collinear Clamping: Automatic full-reach extension.
 *
 * SECTIONS & REGION JUMP TABLE:
 *   [SEC-01] Core SovereignFABRIKSolver Class
 *   [SEC-02] Facade Factory & Procedural Generators (EmberlightFABRIK)
 *   [SEC-03] Canvas Visual Presentation Helpers
 *   [SEC-04] Telemetry & Diagnostic Interface
 *   [SEC-05] Global Environment & Module Export Gateway
 * ============================================================================
 */

'use strict';

//#region [SEC-01] Core SovereignFABRIKSolver Class

/**
 * High-velocity, zero-matrix 2D FABRIK Inverse Kinematics Solver.
 * Pre-allocates a contiguous Float32Array buffer for zero-GC execution in 60Hz game loops.
 */
class SovereignFABRIKSolver {
	/**
	 * Constructs a new FABRIK solver with fixed bone segment lengths.
	 * @param {Array<number>|Float32Array} boneLengths - Lengths of each articulated bone link.
	 */
	constructor(boneLengths) {
		const validLengths = Array.isArray(boneLengths) || ArrayBuffer.isView(boneLengths);
		const lengths = (validLengths && boneLengths.length > 0)
			? Array.from(boneLengths, (l) => Math.max(0.001, Number(l) || 1))
			: [ 30, 30 ];

		/** @type {Float32Array} */
		this.lengths = new Float32Array(lengths);
		/** @type {number} */
		this.jointCount = this.lengths.length + 1;
		/** @type {number} */
		this.totalLength = this.lengths.reduce((acc, len) => acc + len, 0);

		// Contiguous flat buffer: [x0, y0, x1, y1, ..., xN, yN]
		/** @type {Float32Array} */
		this.points = new Float32Array(this.jointCount * 2);

		// Initialize default rest pose extended horizontally to the right
		this.resetPose(0, 0, 0);
	}

	/**
	 * Solves for unreachable target scenario by stretching chain collinearly toward target.
	 * [Internal Helper - Zero Heap Allocations]
	 * @private
	 * @param {number} bx - Base anchor X coordinate.
	 * @param {number} by - Base anchor Y coordinate.
	 * @param {number} tx - Target X coordinate.
	 * @param {number} ty - Target Y coordinate.
	 * @param {number} dist - Distance from base to target.
	 * @returns {Float32Array} Contiguous joint coordinates buffer.
	 */
	_solveUnreachable(bx, by, tx, ty, dist) {
		const n = this.lengths.length;
		const p = this.points;
		const ux = dist > 1e-6 ? (tx - bx) / dist : 1.0;
		const uy = dist > 1e-6 ? (ty - by) / dist : 0.0;

		p[ 0 ] = bx;
		p[ 1 ] = by;
		let accum = 0;
		for (let i = 0; i < n; i++) {
			accum += this.lengths[ i ];
			const idx = (i + 1) * 2;
			p[ idx ] = bx + ux * accum;
			p[ idx + 1 ] = by + uy * accum;
		}
		return p;
	}

	/**
	 * Executes the backward reaching stage: shifts end-effector to target and pulls joints back.
	 * [Internal Helper - Zero Heap Allocations]
	 * @private
	 * @param {number} tx - Target X coordinate.
	 * @param {number} ty - Target Y coordinate.
	 * @returns {void}
	 */
	_backwardPass(tx, ty) {
		const n = this.lengths.length;
		const p = this.points;

		// Force end-effector to target
		p[ n * 2 ] = tx;
		p[ n * 2 + 1 ] = ty;

		for (let i = n - 1; i >= 0; i--) {
			const childIdx = (i + 1) * 2;
			const curIdx = i * 2;
			const childX = p[ childIdx ];
			const childY = p[ childIdx + 1 ];
			const curX = p[ curIdx ];
			const curY = p[ curIdx + 1 ];

			const dx = curX - childX;
			const dy = curY - childY;
			const segDist = Math.hypot(dx, dy) || 1e-6;
			const ratio = this.lengths[ i ] / segDist;

			p[ curIdx ] = childX + dx * ratio;
			p[ curIdx + 1 ] = childY + dy * ratio;
		}
	}

	/**
	 * Executes the forward reaching stage: snaps base joint to anchor and pushes joints forward.
	 * [Internal Helper - Zero Heap Allocations]
	 * @private
	 * @param {number} bx - Base anchor X coordinate.
	 * @param {number} by - Base anchor Y coordinate.
	 * @returns {void}
	 */
	_forwardPass(bx, by) {
		const n = this.lengths.length;
		const p = this.points;

		// Snap base joint back to authoritative anchor
		p[ 0 ] = bx;
		p[ 1 ] = by;

		for (let i = 0; i < n; i++) {
			const parentIdx = i * 2;
			const nextIdx = (i + 1) * 2;
			const parentX = p[ parentIdx ];
			const parentY = p[ parentIdx + 1 ];
			const nextX = p[ nextIdx ];
			const nextY = p[ nextIdx + 1 ];

			const dx = nextX - parentX;
			const dy = nextY - parentY;
			const segDist = Math.hypot(dx, dy) || 1e-6;
			const ratio = this.lengths[ i ] / segDist;

			p[ nextIdx ] = parentX + dx * ratio;
			p[ nextIdx + 1 ] = parentY + dy * ratio;
		}
	}

	/**
	 * Solves inverse kinematics for an arbitrary target position.
	 * Hot-path method: zero heap allocations; returns pre-allocated Float32Array.
	 *
	 * @param {number} bx - Base origin X coordinate.
	 * @param {number} by - Base origin Y coordinate.
	 * @param {number} tx - Target terminus X coordinate.
	 * @param {number} ty - Target terminus Y coordinate.
	 * @param {number} [iterations=3] - Maximum relaxation iterations (typically 2-3).
	 * @param {number} [tolerance=0.001] - Early-exit target distance threshold.
	 * @returns {Float32Array} Contiguous coordinates buffer [x0, y0, x1, y1, ..., xN, yN].
	 */
	solve(bx, by, tx, ty, iterations = 3, tolerance = 0.001) {
		const dx = tx - bx;
		const dy = ty - by;
		const dist = Math.hypot(dx, dy);

		// Handle target unreachable beyond full kinematic reach
		if (dist >= this.totalLength) {
			return this._solveUnreachable(bx, by, tx, ty, dist);
		}

		const n = this.lengths.length;
		const p = this.points;
		const maxIters = Math.max(1, Math.trunc(iterations));

		for (let it = 0; it < maxIters; it++) {
			// Early exit test if end-effector has converged within tolerance
			if (it > 0) {
				const endX = p[ n * 2 ];
				const endY = p[ n * 2 + 1 ];
				const curDist = Math.hypot(endX - tx, endY - ty);
				if (curDist <= tolerance) {
					break;
				}
			}

			this._backwardPass(tx, ty);
			this._forwardPass(bx, by);
		}

		return p;
	}

	/**
	 * Resets all joint coordinates to a straight linear rest pose at given origin and angle.
	 * @param {number} [bx=0] - Base origin X coordinate.
	 * @param {number} [by=0] - Base origin Y coordinate.
	 * @param {number} [angle=0] - Orientation angle in radians.
	 * @returns {Float32Array} Contiguous joint coordinates buffer.
	 */
	resetPose(bx = 0, by = 0, angle = 0) {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const p = this.points;
		p[ 0 ] = bx;
		p[ 1 ] = by;
		let accum = 0;
		for (let i = 0; i < this.lengths.length; i++) {
			accum += this.lengths[ i ];
			const idx = (i + 1) * 2;
			p[ idx ] = bx + cos * accum;
			p[ idx + 1 ] = by + sin * accum;
		}
		return p;
	}

	/**
	 * Solves IK with an optional 2-bone hinge pole vector constraint (e.g. knee/elbow direction).
	 * If chain length is 2 bones, enforces bending orientation toward pole point.
	 *
	 * @param {number} bx - Base origin X coordinate.
	 * @param {number} by - Base origin Y coordinate.
	 * @param {number} tx - Target terminus X coordinate.
	 * @param {number} ty - Target terminus Y coordinate.
	 * @param {number} poleX - Preferred bending direction pole X coordinate.
	 * @param {number} poleY - Preferred bending direction pole Y coordinate.
	 * @param {number} [iterations=3] - Relaxation iterations.
	 * @returns {Float32Array} Contiguous coordinates buffer.
	 */
	solveWithPole(bx, by, tx, ty, poleX, poleY, iterations = 3) {
		this.solve(bx, by, tx, ty, iterations);

		// If 2-bone chain, check if middle joint orientation matches pole direction
		if (this.lengths.length === 2) {
			const p = this.points;
			const midX = p[ 2 ];
			const midY = p[ 3 ];

			// Vector from base to target
			const baseToTargetX = tx - bx;
			const baseToTargetY = ty - by;

			// Normal perpendicular vector to base-to-target line
			const normX = -baseToTargetY;
			const normY = baseToTargetX;

			// Dot products against normal
			const poleDot = (poleX - bx) * normX + (poleY - by) * normY;
			const midDot = (midX - bx) * normX + (midY - by) * normY;

			// If middle joint bent to opposite half-plane of pole, reflect it across base-target line
			if (poleDot * midDot < 0) {
				const lineLenSq = baseToTargetX * baseToTargetX + baseToTargetY * baseToTargetY;
				if (lineLenSq > 1e-6) {
					const t = ((midX - bx) * baseToTargetX + (midY - by) * baseToTargetY) / lineLenSq;
					const projX = bx + t * baseToTargetX;
					const projY = by + t * baseToTargetY;
					p[ 2 ] = 2 * projX - midX;
					p[ 3 ] = 2 * projY - midY;
					// Re-stabilize forward and backward once to preserve exact bone lengths
					this._backwardPass(tx, ty);
					this._forwardPass(bx, by);
				}
			}
		}

		return this.points;
	}

	/**
	 * Retrieves coordinates of a specific joint by index.
	 * @param {number} index - Joint index [0 .. jointCount - 1].
	 * @param {{ x: number, y: number }|null} [out=null] - Optional reusable output vector.
	 * @returns {{ x: number, y: number }} Joint coordinates.
	 */
	getJoint(index, out = null) {
		const clampedIdx = Math.max(0, Math.min(this.jointCount - 1, Math.trunc(index)));
		const x = this.points[ clampedIdx * 2 ];
		const y = this.points[ clampedIdx * 2 + 1 ];
		if (out && typeof out === 'object') {
			out.x = x;
			out.y = y;
			return out;
		}
		return { x, y };
	}

	/**
	 * Retrieves the coordinates of the base anchor joint (joint 0).
	 * @param {{ x: number, y: number }|null} [out=null] - Optional reusable output vector.
	 * @returns {{ x: number, y: number }} Base coordinates.
	 */
	getBase(out = null) {
		return this.getJoint(0, out);
	}

	/**
	 * Retrieves the coordinates of the end-effector joint (joint N).
	 * @param {{ x: number, y: number }|null} [out=null] - Optional reusable output vector.
	 * @returns {{ x: number, y: number }} End-effector coordinates.
	 */
	getEndEffector(out = null) {
		return this.getJoint(this.jointCount - 1, out);
	}

	/**
	 * Returns the raw Float32Array containing contiguous joint coordinates.
	 * @returns {Float32Array} Flat coordinates buffer.
	 */
	getPoints() {
		return this.points;
	}

	/**
	 * Returns the total number of joints (N + 1).
	 * @returns {number} Joint count.
	 */
	getJointCount() {
		return this.jointCount;
	}

	/**
	 * Returns the total maximum reachable chain length.
	 * @returns {number} Maximum reach distance.
	 */
	getTotalLength() {
		return this.totalLength;
	}

	/**
	 * Returns the fixed bone lengths array.
	 * @returns {Float32Array} Bone segment lengths.
	 */
	getBoneLengths() {
		return this.lengths;
	}
}

//#endregion

//#region [SEC-02] Facade Factory & Procedural Generators (EmberlightFABRIK)

/**
 * Procedural chain generator and solver factory facade.
 */
const EmberlightFABRIK = {
	/**
	 * Creates a sovereign FABRIK solver from custom bone segment lengths.
	 * @param {Array<number>|Float32Array} boneLengths - Bone segment lengths.
	 * @returns {SovereignFABRIKSolver} Instantiated solver.
	 */
	createSolver(boneLengths) {
		return new SovereignFABRIKSolver(boneLengths);
	},

	/**
	 * Creates a solver with uniform segment lengths (e.g. rope, mechanical cord).
	 * @param {number} segmentCount - Number of bone segments.
	 * @param {number} segmentLength - Length of each segment in pixels.
	 * @returns {SovereignFABRIKSolver} Instantiated uniform solver.
	 */
	createUniformChain(segmentCount, segmentLength) {
		const count = Math.max(1, Math.trunc(segmentCount));
		const len = Math.max(0.1, Number(segmentLength) || 10);
		const lengths = new Float32Array(count);
		lengths.fill(len);
		return new SovereignFABRIKSolver(lengths);
	},

	/**
	 * Creates a solver with tapering segment lengths (e.g. tentacle, scorpion tail, chitin spine).
	 * @param {number} segmentCount - Number of bone segments.
	 * @param {number} startLength - Base bone length.
	 * @param {number} endLength - Tip bone length.
	 * @returns {SovereignFABRIKSolver} Instantiated tapered solver.
	 */
	createTaperedChain(segmentCount, startLength, endLength) {
		const count = Math.max(1, Math.trunc(segmentCount));
		const s = Math.max(0.1, Number(startLength) || 20);
		const e = Math.max(0.1, Number(endLength) || 5);
		const lengths = new Float32Array(count);

		if (count === 1) {
			lengths[ 0 ] = s;
			return new SovereignFABRIKSolver(lengths);
		}

		for (let i = 0; i < count; i++) {
			const t = i / (count - 1);
			lengths[ i ] = s + (e - s) * t;
		}
		return new SovereignFABRIKSolver(lengths);
	},

	/**
	 * Static one-shot solver helper without retaining solver instance.
	 * @param {Array<number>|Float32Array} boneLengths - Bone segment lengths.
	 * @param {number} bx - Base origin X coordinate.
	 * @param {number} by - Base origin Y coordinate.
	 * @param {number} tx - Target terminus X coordinate.
	 * @param {number} ty - Target terminus Y coordinate.
	 * @param {number} [iterations=3] - Maximum iterations.
	 * @param {number} [tolerance=0.001] - Convergence tolerance.
	 * @returns {Float32Array} Joint coordinates buffer.
	 */
	solveChain(boneLengths, bx, by, tx, ty, iterations = 3, tolerance = 0.001) {
		const solver = new SovereignFABRIKSolver(boneLengths);
		return solver.solve(bx, by, tx, ty, iterations, tolerance);
	},

	//#endregion

	//#region [SEC-03] Canvas Visual Presentation Helpers

	/**
	 * Renders an articulated kinematic chain onto an HTML5 2D Canvas context.
	 * Supports tapered line widths, energy glows, and circular joint nodes.
	 *
	 * @param {CanvasRenderingContext2D} ctx - Target 2D rendering context.
	 * @param {Float32Array} points - Flat buffer of joint coordinates.
	 * @param {Object} [options={}] - Styling configuration options.
	 * @param {string} [options.strokeStyle='#ff9d4d'] - Segment stroke color.
	 * @param {number} [options.lineWidth=4] - Base line width in pixels.
	 * @param {boolean} [options.taper=true] - Whether stroke tapers from base to tip.
	 * @param {string} [options.glowColor] - Optional shadow/glow color token.
	 * @param {number} [options.glowBlur=0] - Optional glow blur radius.
	 * @param {boolean} [options.drawJoints=true] - Whether to render joint circles.
	 * @param {string} [options.jointColor='#ffffff'] - Fill color of joint nodes.
	 * @param {number} [options.jointRadius=2.5] - Radius of joint nodes.
	 * @returns {void}
	 */
	renderChain(ctx, points, options = {}) {
		if (!ctx || !points || points.length < 4) return;

		const strokeStyle = options.strokeStyle || '#ff9d4d';
		const baseWidth = options.lineWidth || 4;
		const taper = options.taper !== false;
		const glowColor = options.glowColor || null;
		const glowBlur = options.glowBlur || 0;
		const drawJoints = options.drawJoints !== false;
		const jointColor = options.jointColor || '#ffffff';
		const jointRadius = options.jointRadius || 2.5;

		const jointCount = Math.trunc(points.length / 2);

		ctx.save();
		if (glowColor && glowBlur > 0) {
			ctx.shadowColor = glowColor;
			ctx.shadowBlur = glowBlur;
		}

		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Draw bone segments (with optional width tapering)
		for (let i = 0; i < jointCount - 1; i++) {
			const x1 = points[ i * 2 ];
			const y1 = points[ i * 2 + 1 ];
			const x2 = points[ (i + 1) * 2 ];
			const y2 = points[ (i + 1) * 2 + 1 ];

			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.strokeStyle = strokeStyle;

			if (taper && jointCount > 2) {
				const progress = i / (jointCount - 2);
				ctx.lineWidth = Math.max(1, baseWidth * (1.0 - progress * 0.7));
			} else {
				ctx.lineWidth = baseWidth;
			}
			ctx.stroke();
		}

		// Draw joint circular nodes
		if (drawJoints) {
			ctx.fillStyle = jointColor;
			for (let i = 0; i < jointCount; i++) {
				const jx = points[ i * 2 ];
				const jy = points[ i * 2 + 1 ];
				const r = taper && jointCount > 1
					? Math.max(1, jointRadius * (1.0 - (i / (jointCount - 1)) * 0.5))
					: jointRadius;

				ctx.beginPath();
				ctx.arc(jx, jy, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		ctx.restore();
	},

	//#endregion

	//#region [SEC-04] Telemetry & Diagnostic Interface

	/**
	 * Returns telemetry metadata for the Sentinel auditor and system monitors.
	 * @returns {Record<string, unknown>} Diagnostic report.
	 */
	getDiagnostics() {
		return {
			moduleId: 'fabrik_ik',
			protocolVersion: 'VSRP-001',
			version: '1.0.0',
			algorithm: 'Aristidou-Lasenby FABRIK (2011)',
			complexity: 'O(N) geometric relaxation',
			matrixFree: true,
			zeroAllocHotLoop: true,
		};
	},

	/**
	 * Returns module capabilities and specification metadata.
	 * @returns {{ moduleId: string, version: string, protocolVersion: string, capabilities: string[] }} Module manifest.
	 */
	getModuleInfo() {
		return {
			moduleId: 'fabrik_ik',
			version: '1.0.0',
			protocolVersion: 'VSRP-001',
			capabilities: [
				'zero_matrix_ik',
				'geometric_relaxation',
				'unreachable_target_clamping',
				'hinge_pole_constraints',
				'contiguous_typed_buffer_solver',
				'procedural_chain_generators',
				'canvas_chain_renderer',
			],
		};
	},
};

//#endregion

//#region [SEC-05] Global Environment & Module Export Gateway

if (typeof window !== 'undefined') {
	window.SovereignFABRIKSolver = SovereignFABRIKSolver;
	window.EmberlightFABRIKSolver = SovereignFABRIKSolver;
	window.EmberlightFABRIK = EmberlightFABRIK;
}

((g) => {
	if (!g) return;
	const target = /** @type {any} */ (g);
	target.SovereignFABRIKSolver = SovereignFABRIKSolver;
	target.EmberlightFABRIKSolver = SovereignFABRIKSolver;
	target.EmberlightFABRIK = EmberlightFABRIK;
})(typeof globalThis !== 'undefined' ? globalThis : null);

if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		SovereignFABRIKSolver,
		EmberlightFABRIKSolver: SovereignFABRIKSolver,
		EmberlightFABRIK,
	};
}

//#endregion
