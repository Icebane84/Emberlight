/* cSpell:words VSRP FABRIK fabrik Aristidou Lasenby swivel */

'use strict';

/**
 * Emberlight Sovereign FABRIK IK — VSRP-001-FABRIK-IK
 * Vanilla JS, browser/Node compatible, fixed-size Float32Array hot-path storage.
 *
 * Coordinate convention: radians; positive angles follow atan2's coordinate
 * convention (in canvas coordinates, positive rotation appears clockwise).
 *
 * Important guarantees:
 * - No per-iteration allocations in solve() with built-in constraints.
 * - O(iterations * boneCount) work.
 * - Bone lengths are projected after each positional pass; Float32 storage means
 *   conservation is approximate within configured numeric tolerance, not exact.
 * - Custom constraint callbacks may allocate; their behavior is caller-owned.
 */

const FABRIK_EPSILON = 1e-8;
const FABRIK_TAU = Math.PI * 2;

function fabrikFinite(value, fallback) {
	return Number.isFinite(value) ? value : fallback;
}

function fabrikClamp(value, min, max) {
	return value < min ? min : (Math.min(value, max));
}

function fabrikWrapAngle(angle) {
	angle = (angle + Math.PI) % FABRIK_TAU;
	if (angle < 0) angle += FABRIK_TAU;
	return angle - Math.PI;
}

function fabrikSafeLength(dx, dy) {
	// Squared length avoids sqrt in common degeneracy checks.
	return dx * dx + dy * dy;
}

/**
 * Constraint strategy contract:
 *   apply(solver, bx, by, tx, ty) -> void
 * Called once per iteration after the unconstrained forward pass.
 * Strategies must not replace solver.points or resize solver buffers.
 */
class FABRIKConstraint {
	apply(_solver, _bx, _by, _tx, _ty) {
		// Base constraint interface hook: sub-classes override to apply positional constraints.
	}
}

/**
 * Relative signed-turn limits for interior joints.
 * minAngles/maxAngles contain one value per interior joint, i.e. boneCount - 1.
 * A joint's angle is the wrapped difference between incoming and outgoing
 * segment headings. Limits are clamped to [-PI, PI].
 */
class FABRIKAngularLimits extends FABRIKConstraint {
	constructor(minAngles, maxAngles) {
		super();
		this.minAngles = new Float32Array(minAngles || []);
		this.maxAngles = new Float32Array(maxAngles || []);
		this.count = Math.min(this.minAngles.length, this.maxAngles.length);
		for (let i = 0; i < this.count; i++) {
			let lo = fabrikFinite(this.minAngles[ i ], -Math.PI);
			let hi = fabrikFinite(this.maxAngles[ i ], Math.PI);
			lo = fabrikClamp(lo, -Math.PI, Math.PI);
			hi = fabrikClamp(hi, -Math.PI, Math.PI);
			if (lo > hi) { const swap = lo; lo = hi; hi = swap; }
			this.minAngles[ i ] = lo;
			this.maxAngles[ i ] = hi;
		}
	}

	apply(solver) {
		const p = solver.points;
		const lengths = solver.lengths;
		const n = solver.boneCount;
		const count = Math.min(this.count, n - 1);
		if (count <= 0) return;

		// The first segment establishes the unconstrained root heading.
		let prevX = p[ 2 ] - p[ 0 ];
		let prevY = p[ 3 ] - p[ 1 ];
		let prevSq = prevX * prevX + prevY * prevY;
		if (prevSq <= FABRIK_EPSILON) {
			prevX = solver._lastDirX[ 0 ];
			prevY = solver._lastDirY[ 0 ];
		} else {
			const inv = 1 / Math.sqrt(prevSq);
			prevX *= inv; prevY *= inv;
		}

		let prevAngle = Math.atan2(prevY, prevX);
		for (let i = 1; i < n; i++) {
			const parent = i * 2;
			const child = parent + 2;
			let dx = p[ child ] - p[ parent ];
			let dy = p[ child + 1 ] - p[ parent + 1 ];
			const sq = dx * dx + dy * dy;

			if (sq <= FABRIK_EPSILON) {
				dx = solver._lastDirX[ i ];
				dy = solver._lastDirY[ i ];
			} else {
				const inv = 1 / Math.sqrt(sq);
				dx *= inv; dy *= inv;
			}

			let angle = Math.atan2(dy, dx);
			const ci = i - 1;
			if (ci < count) {
				const turn = fabrikWrapAngle(angle - prevAngle);
				const clamped = fabrikClamp(turn, this.minAngles[ ci ], this.maxAngles[ ci ]);
				angle = prevAngle + clamped;
				dx = Math.cos(angle);
				dy = Math.sin(angle);
			} else {
				// Keep the direction derived above when no limit is configured.
				angle = Math.atan2(dy, dx);
			}

			p[ child ] = p[ parent ] + dx * lengths[ i ];
			p[ child + 1 ] = p[ parent + 1 ] + dy * lengths[ i ];
			prevAngle = angle;
		}
	}
}

/**
 * Damping strategy for temporal target/pose changes. This is a bounded
 * exponential blend of solved joint positions with the previous pose.
 * It is deliberately optional: use damping = 1 for an undamped solver.
 *
 * Because blending changes segment lengths, the solver follows it with a
 * length-projection pass. Damping is a visual stability control, not physics.
 */
class FABRIKJointDamping extends FABRIKConstraint {
	constructor(amount = 1) {
		super();
		this.amount = fabrikClamp(fabrikFinite(amount, 1), 0, 1);
		this.previous = null;
	}

	bind(solver) {
		if (!this.previous || this.previous.length !== solver.points.length) {
			this.previous = new Float32Array(solver.points.length);
			this.previous.set(solver.points);
		}
		return this;
	}

	apply(solver, bx, by) {
		if (this.amount >= 1) return;
		this.bind(solver);
		const p = solver.points;
		const prev = this.previous;
		const a = this.amount;
		for (let i = 2; i < p.length; i++) {
			p[ i ] = prev[ i ] + (p[ i ] - prev[ i ]) * a;
		}
		p[ 0 ] = bx; p[ 1 ] = by;
		// Reproject forward so damping cannot leave stretched/compressed bones.
		solver._projectForward(bx, by);
		prev.set(p);
	}
}

/**
 * Stable 2D pole/swivel strategy for a two-bone chain.
 * The pole determines which side of the base-to-target axis the middle joint
 * should occupy. It changes the bend side, not the target's reachability.
 */
class FABRIKTwoBonePole extends FABRIKConstraint {
	constructor(poleX = 0, poleY = 1, strength = 1) {
		super();
		this.poleX = fabrikFinite(poleX, 0);
		this.poleY = fabrikFinite(poleY, 1);
		this.strength = fabrikClamp(fabrikFinite(strength, 1), 0, 1);
	}

	setPole(x, y) {
		this.poleX = fabrikFinite(x, this.poleX);
		this.poleY = fabrikFinite(y, this.poleY);
		return this;
	}

	apply(solver, bx, by, tx, ty) {
		if (solver.boneCount !== 2 || this.strength <= 0) return;
		const p = solver.points;
		const ax = tx - bx, ay = ty - by;
		const distSq = ax * ax + ay * ay;
		if (distSq <= FABRIK_EPSILON) return;

		const invDist = 1 / Math.sqrt(distSq);
		const ux = ax * invDist, uy = ay * invDist;
		const poleSide = (this.poleX - bx) * (-uy) + (this.poleY - by) * ux;
		if (Math.abs(poleSide) <= FABRIK_EPSILON) return;

		const mx = p[ 2 ], my = p[ 3 ];
		const midSide = (mx - bx) * (-uy) + (my - by) * ux;
		if (poleSide * midSide >= 0) return;

		// Reflect the middle joint across the base-target axis, then blend
		// toward the reflected pose. The following projection restores lengths.
		const along = (mx - bx) * ux + (my - by) * uy;
		const projX = bx + ux * along;
		const projY = by + uy * along;
		const reflectedX = 2 * projX - mx;
		const reflectedY = 2 * projY - my;
		p[ 2 ] = mx + (reflectedX - mx) * this.strength;
		p[ 3 ] = my + (reflectedY - my) * this.strength;
	}
}

/**
 * Fast FABRIK solver. Construct once per chain and reuse every frame.
 * Options:
 *   constraints: array of FABRIKConstraint-compatible objects
 *   minBoneLength: minimum positive length (default 0.001)
 *   maxIterations: safety cap (default 32)
 */
class SovereignFABRIKSolver {
	constructor(boneLengths, options = {}) {
		const sourceValid = Array.isArray(boneLengths) ||
			(typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(boneLengths));
		const source = sourceValid && boneLengths.length ? boneLengths : [ 30, 30 ];
		this.boneCount = source.length;
		this.jointCount = this.boneCount + 1;
		this.lengths = new Float32Array(this.boneCount);
		this.totalLength = 0;

		const minLen = Math.max(1e-6, fabrikFinite(options.minBoneLength, 0.001));
		for (let i = 0; i < this.boneCount; i++) {
			const raw = Number(source[ i ]);
			const len = Number.isFinite(raw) && raw > minLen ? raw : minLen;
			this.lengths[ i ] = len;
			this.totalLength += this.lengths[ i ];
		}

		this.points = new Float32Array(this.jointCount * 2);
		this._lastDirX = new Float32Array(this.boneCount);
		this._lastDirY = new Float32Array(this.boneCount);
		this._constraints = [];
		this.maxIterations = Math.max(1, Math.min(256,
			Math.trunc(fabrikFinite(options.maxIterations, 32))));
		this.lastError = Infinity;
		this.lastIterations = 0;
		this.lastStatus = 'initialized';
		this._validPose = false;

		for (let i = 0; i < this.boneCount; i++) {
			this._lastDirX[ i ] = 1;
			this._lastDirY[ i ] = 0;
		}
		if (Array.isArray(options.constraints)) {
			for (const element of options.constraints) {
				this.addConstraint(element);
			}
		}
		this.resetPose(0, 0, 0);
	}

	addConstraint(strategy) {
		if (!strategy || typeof strategy.apply !== 'function') {
			throw new TypeError('Constraint must expose apply(solver, bx, by, tx, ty).');
		}
		this._constraints.push(strategy);
		return this;
	}

	clearConstraints() {
		this._constraints.length = 0;
		return this;
	}

	_rememberDirections() {
		const p = this.points;
		for (let i = 0; i < this.boneCount; i++) {
			const idx = i * 2;
			const dx = p[ idx + 2 ] - p[ idx ];
			const dy = p[ idx + 3 ] - p[ idx + 1 ];
			const sq = dx * dx + dy * dy;
			if (sq > FABRIK_EPSILON) {
				const inv = 1 / Math.sqrt(sq);
				this._lastDirX[ i ] = dx * inv;
				this._lastDirY[ i ] = dy * inv;
			}
		}
	}

	_solveUnreachable(bx, by, tx, ty, dist) {
		const p = this.points;
		const n = this.boneCount;
		let ux, uy;
		if (dist > FABRIK_EPSILON) {
			const inv = 1 / dist;
			ux = (tx - bx) * inv;
			uy = (ty - by) * inv;
		} else {
			ux = this._lastDirX[ 0 ];
			uy = this._lastDirY[ 0 ];
		}
		p[ 0 ] = bx; p[ 1 ] = by;
		let accum = 0;
		for (let i = 0; i < n; i++) {
			accum += this.lengths[ i ];
			const idx = (i + 1) * 2;
			p[ idx ] = bx + ux * accum;
			p[ idx + 1 ] = by + uy * accum;
		}
		this._rememberDirections();
		this.lastError = Math.max(0, dist - this.totalLength);
		this.lastIterations = 0;
		this.lastStatus = 'unreachable';
		this._validPose = true;
		return p;
	}

	_backwardPass(tx, ty) {
		const p = this.points;
		const lengths = this.lengths;
		p[ this.boneCount * 2 ] = tx;
		p[ this.boneCount * 2 + 1 ] = ty;

		for (let i = this.boneCount - 1; i >= 0; i--) {
			const child = (i + 1) * 2;
			const parent = i * 2;
			let dx = p[ parent ] - p[ child ];
			let dy = p[ parent + 1 ] - p[ child + 1 ];
			const sq = dx * dx + dy * dy;
			if (sq <= FABRIK_EPSILON) {
				dx = -this._lastDirX[ i ];
				dy = -this._lastDirY[ i ];
			} else {
				const inv = lengths[ i ] / Math.sqrt(sq);
				dx *= inv; dy *= inv;
			}
			if (sq <= FABRIK_EPSILON) {
				p[ parent ] = p[ child ] + dx * lengths[ i ];
				p[ parent + 1 ] = p[ child + 1 ] + dy * lengths[ i ];
			} else {
				p[ parent ] = p[ child ] + dx;
				p[ parent + 1 ] = p[ child + 1 ] + dy;
			}
		}
	}

	_projectForward(bx, by) {
		const p = this.points;
		const lengths = this.lengths;
		p[ 0 ] = bx; p[ 1 ] = by;
		for (let i = 0; i < this.boneCount; i++) {
			const parent = i * 2;
			const child = parent + 2;
			let dx = p[ child ] - p[ parent ];
			let dy = p[ child + 1 ] - p[ parent + 1 ];
			const sq = dx * dx + dy * dy;
			if (sq <= FABRIK_EPSILON) {
				dx = this._lastDirX[ i ];
				dy = this._lastDirY[ i ];
				p[ child ] = p[ parent ] + dx * lengths[ i ];
				p[ child + 1 ] = p[ parent + 1 ] + dy * lengths[ i ];
			} else {
				const scale = lengths[ i ] / Math.sqrt(sq);
				p[ child ] = p[ parent ] + dx * scale;
				p[ child + 1 ] = p[ parent + 1 ] + dy * scale;
			}
		}
	}

	solve(bx, by, tx, ty, iterations = 6, tolerance = 0.01) {
		if (![ bx, by, tx, ty ].every(Number.isFinite)) {
			this.lastStatus = 'invalid-input';
			this.lastIterations = 0;
			this.lastError = Infinity;
			return this.points; // Preserve the last valid pose.
		}

		const dx = tx - bx;
		const dy = ty - by;
		const distSq = dx * dx + dy * dy;
		const dist = Math.sqrt(distSq);
		const tol = Math.max(0, fabrikFinite(tolerance, 0.01));
		const maxIters = Math.max(1, Math.min(this.maxIterations,
			Math.trunc(fabrikFinite(iterations, 6)) || 1));

		if (dist >= this.totalLength && dist > FABRIK_EPSILON) {
			return this._solveUnreachable(bx, by, tx, ty, dist);
		}

		// Seed a first solve with a stable straight pose; subsequent solves
		// start from the prior pose, improving temporal coherence.
		if (!this._validPose) this.resetPose(bx, by, Math.atan2(dy, dx));
		this.points[ 0 ] = bx;
		this.points[ 1 ] = by;

		const p = this.points;
		const end = this.boneCount * 2;
		let errorSq = Infinity;
		let used = 0;

		for (let it = 0; it < maxIters; it++) {
			this._backwardPass(tx, ty);
			this._projectForward(bx, by);

			for (const element of this._constraints) {
				element.apply(this, bx, by, tx, ty);
			}

			// Constraints may move points; re-project lengths after all of them.
			// This preserves segment lengths but can trade some endpoint accuracy.
			this._projectForward(bx, by);

			const ex = p[ end ] - tx;
			const ey = p[ end + 1 ] - ty;
			errorSq = ex * ex + ey * ey;
			used = it + 1;
			if (errorSq <= tol * tol) break;
		}

		this._rememberDirections();
		this.lastError = Math.sqrt(errorSq);
		this.lastIterations = used;
		this.lastStatus = this.lastError <= tol ? 'converged' : 'iteration-limit';
		this._validPose = true;
		return p;
	}

	resetPose(bx = 0, by = 0, angle = 0) {
		bx = fabrikFinite(bx, 0);
		by = fabrikFinite(by, 0);
		angle = fabrikFinite(angle, 0);
		const cos = Math.cos(angle), sin = Math.sin(angle);
		const p = this.points;
		p[ 0 ] = bx; p[ 1 ] = by;
		let x = bx, y = by;
		for (let i = 0; i < this.boneCount; i++) {
			x += cos * this.lengths[ i ];
			y += sin * this.lengths[ i ];
			const idx = (i + 1) * 2;
			p[ idx ] = x; p[ idx + 1 ] = y;
			this._lastDirX[ i ] = cos;
			this._lastDirY[ i ] = sin;
		}
		this._validPose = true;
		this.lastStatus = 'reset';
		this.lastError = Infinity;
		this.lastIterations = 0;
		return p;
	}

	solveWithPole(bx, by, tx, ty, poleX, poleY, ...opts) {
		// Compatibility convenience: use a reusable strategy rather than a
		// one-off post-solve reflection that would violate constraints.
		if (!this._temporaryPole) this._temporaryPole = new FABRIKTwoBonePole(poleX, poleY);
		this._temporaryPole.setPole(poleX, poleY);
		const had = this._constraints.indexOf(this._temporaryPole);
		if (had < 0) this._constraints.push(this._temporaryPole);
		const iters = typeof opts[ 0 ] === 'object' ? opts[ 0 ]?.iterations : opts[ 0 ];
		const tol = typeof opts[ 0 ] === 'object' ? opts[ 0 ]?.tolerance : opts[ 1 ];
		return this.solve(bx, by, tx, ty, iters ?? 6, tol ?? 0.01);
	}

	getJoint(index, out = null) {
		const i = fabrikClamp(Math.trunc(fabrikFinite(index, 0)), 0, this.jointCount - 1) * 2;
		if (out && typeof out === 'object') {
			out.x = this.points[ i ]; out.y = this.points[ i + 1 ];
			return out;
		}
		return { x: this.points[ i ], y: this.points[ i + 1 ] };
	}

	getBase(out = null) { return this.getJoint(0, out); }
	getEndEffector(out = null) { return this.getJoint(this.jointCount - 1, out); }
	getPoints() { return this.points; }
	getJointCount() { return this.jointCount; }
	getTotalLength() { return this.totalLength; }
	getBoneLengths() { return this.lengths; }

	getDiagnostics() {
		return {
			moduleId: 'fabrik_ik',
			version: '2.0.0',
			algorithm: 'FABRIK with pluggable positional constraints',
			status: this.lastStatus,
			iterations: this.lastIterations,
			endEffectorError: this.lastError,
			boneCount: this.boneCount,
			totalLength: this.totalLength
		};
	}
}

/**
 * Optional Verlet secondary motion for tails, ears, ropes, or loose appendages.
 * This is a separate simulation layer; do not treat its unconstrained points as
 * authoritative skeletal joints. Call step() with a fixed timestep and then
 * optionally use the resulting positions as FABRIK targets/pole guides.
 */
class FABRIKVerletAppendage {
	constructor(pointCount, segmentLength, damping = 0.985, gravityX = 0, gravityY = 0) {
		this.count = Math.max(2, Math.trunc(fabrikFinite(pointCount, 4)));
		this.segmentLength = Math.max(1e-4, fabrikFinite(segmentLength, 10));
		this.damping = fabrikClamp(fabrikFinite(damping, 0.985), 0, 1);
		this.gravityX = fabrikFinite(gravityX, 0);
		this.gravityY = fabrikFinite(gravityY, 0);
		this.points = new Float32Array(this.count * 2);
		this.previous = new Float32Array(this.count * 2);
		this.reset(0, 0, 0);
	}

	reset(x, y, angle = Math.PI / 2) {
		const dx = Math.cos(angle) * this.segmentLength;
		const dy = Math.sin(angle) * this.segmentLength;
		for (let i = 0; i < this.count; i++) {
			const idx = i * 2;
			this.points[ idx ] = x + dx * i;
			this.points[ idx + 1 ] = y + dy * i;
			this.previous[ idx ] = this.points[ idx ];
			this.previous[ idx + 1 ] = this.points[ idx + 1 ];
		}
		return this.points;
	}

	step(rootX, rootY, dt = 1 / 60, iterations = 4) {
		if (![ rootX, rootY, dt ].every(Number.isFinite) || dt <= 0) return this.points;
		const p = this.points, old = this.previous;
		const dtSq = dt * dt;
		for (let i = 1; i < this.count; i++) {
			const k = i * 2;
			const x = p[ k ], y = p[ k + 1 ];
			const vx = (x - old[ k ]) * this.damping;
			const vy = (y - old[ k + 1 ]) * this.damping;
			old[ k ] = x; old[ k + 1 ] = y;
			p[ k ] = x + vx + this.gravityX * dtSq;
			p[ k + 1 ] = y + vy + this.gravityY * dtSq;
		}

		const passes = Math.max(1, Math.min(16, Math.trunc(fabrikFinite(iterations, 4))));
		for (let pass = 0; pass < passes; pass++) {
			p[ 0 ] = rootX; p[ 1 ] = rootY;
			for (let i = 0; i < this.count - 1; i++) {
				const a = i * 2, b = a + 2;
				let dx = p[ b ] - p[ a ], dy = p[ b + 1 ] - p[ a + 1 ];
				const sq = dx * dx + dy * dy;
				if (sq <= FABRIK_EPSILON) { dx = 1; dy = 0; }
				else { const inv = this.segmentLength / Math.sqrt(sq); dx *= inv; dy *= inv; }
				p[ b ] = p[ a ] + dx * this.segmentLength;
				p[ b + 1 ] = p[ a + 1 ] + dy * this.segmentLength;
			}
		}
		return p;
	}
}

const EmberlightFABRIK = {
	createSolver(boneLengths, options) {
		return new SovereignFABRIKSolver(boneLengths, options);
	},
	createUniformChain(segmentCount, segmentLength, options) {
		const count = Math.max(1, Math.trunc(fabrikFinite(segmentCount, 1)));
		const length = Math.max(1e-4, fabrikFinite(segmentLength, 10));
		const lengths = new Float32Array(count);
		lengths.fill(length);
		return new SovereignFABRIKSolver(lengths, options);
	},
	createTaperedChain(segmentCount, startLength, endLength, options) {
		const count = Math.max(1, Math.trunc(fabrikFinite(segmentCount, 1)));
		const start = Math.max(1e-4, fabrikFinite(startLength, 20));
		const end = Math.max(1e-4, fabrikFinite(endLength, 5));
		const lengths = new Float32Array(count);
		for (let i = 0; i < count; i++) {
			lengths[ i ] = count === 1 ? start : start + (end - start) * (i / (count - 1));
		}
		return new SovereignFABRIKSolver(lengths, options);
	},
	solveChain(boneLengths, bx, by, tx, ty, iterations = 6, tolerance = 0.01) {
		// Convenience only; recurring callers should retain a solver instance.
		return new SovereignFABRIKSolver(boneLengths).solve(bx, by, tx, ty, iterations, tolerance);
	},
	FABRIKConstraint,
	FABRIKAngularLimits,
	FABRIKJointDamping,
	FABRIKTwoBonePole,
	FABRIKVerletAppendage,
	getDiagnostics() {
		return {
			moduleId: 'fabrik_ik',
			protocolVersion: 'VSRP-001',
			version: '2.0.0',
			complexity: 'O(iterations * boneCount)',
			contiguousTypedArray: true,
			optionalConstraints: [ 'angular_limits', 'joint_damping', 'two_bone_pole' ],
			secondaryMotion: [ 'verlet_appendage' ],
			caveat: 'Constraint projection can trade end-effector accuracy against joint limits.'
		};
	},
	getModuleInfo() {
		return {
			moduleId: 'fabrik_ik',
			version: '2.0.0',
			protocolVersion: 'VSRP-001',
			capabilities: [
				'fabrik_geometric_relaxation',
				'unreachable_target_handling',
				'angular_limits_strategy',
				'two_bone_pole_strategy',
				'optional_joint_damping',
				'verlet_secondary_motion',
				'contiguous_typed_buffer',
				'reusable_solver_instance'
			]
		};
	}
};

// Canvas rendering is intentionally kept outside solve() and may allocate via
// Canvas state save/restore. It is presentation, not authoritative simulation.
EmberlightFABRIK.renderChain = function (ctx, points, options = {}) {
	if (!ctx || !points || points.length < 4) return;
	const stroke = options.strokeStyle || '#ff9d4d';
	const width = Math.max(0.1, fabrikFinite(options.lineWidth, 4));
	const taper = options.taper !== false;
	const glow = options.glowColor || null;
	const blur = Math.max(0, fabrikFinite(options.glowBlur, 0));
	const drawJoints = options.drawJoints !== false;
	const jointColor = options.jointColor || '#ffffff';
	const radius = Math.max(0.1, fabrikFinite(options.jointRadius, 2.5));
	const count = Math.trunc(points.length / 2);

	ctx.save();
	if (glow && blur > 0) { ctx.shadowColor = glow; ctx.shadowBlur = blur; }
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	for (let i = 0; i < count - 1; i++) {
		const a = i * 2, b = a + 2;
		ctx.beginPath();
		ctx.moveTo(points[ a ], points[ a + 1 ]);
		ctx.lineTo(points[ b ], points[ b + 1 ]);
		ctx.strokeStyle = stroke;
		ctx.lineWidth = taper && count > 2
			? Math.max(1, width * (1 - (i / (count - 2)) * 0.7)) : width;
		ctx.stroke();
	}
	if (drawJoints) {
		ctx.fillStyle = jointColor;
		for (let i = 0; i < count; i++) {
			const k = i * 2;
			const r = taper && count > 1
				? Math.max(1, radius * (1 - (i / (count - 1)) * 0.5)) : radius;
			ctx.beginPath();
			ctx.arc(points[ k ], points[ k + 1 ], r, 0, FABRIK_TAU);
			ctx.fill();
		}
	}
	ctx.restore();
};

if (typeof window !== 'undefined') {
	window.SovereignFABRIKSolver = SovereignFABRIKSolver;
	window.EmberlightFABRIKSolver = SovereignFABRIKSolver;
	window.EmberlightFABRIK = EmberlightFABRIK;
}
if (typeof globalThis !== 'undefined') {
	globalThis.SovereignFABRIKSolver = SovereignFABRIKSolver;
	globalThis.EmberlightFABRIKSolver = SovereignFABRIKSolver;
	globalThis.EmberlightFABRIK = EmberlightFABRIK;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		SovereignFABRIKSolver,
		EmberlightFABRIKSolver: SovereignFABRIKSolver,
		EmberlightFABRIK,
		FABRIKConstraint,
		FABRIKAngularLimits,
		FABRIKJointDamping,
		FABRIKTwoBonePole,
		FABRIKVerletAppendage
	};
}
