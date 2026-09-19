/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: CRAWLER KINEMATICS & COLLISION INTERCEPTOR
 * Document Identifier: ARCH-SPEC-KINEMATICS-001
 * Governing Protocol:  VSRP-001 / PRS-DES-013 / ARCH-ZONE-OVERWORLD-001
 * Authority:           3D Relative Vector Translation & Wall Boundary Invariance
 * ============================================================================
 */

const EmberlightKinematics = (() => {
	const MODULE_INFO = Object.freeze({
		moduleId: "crawler_kinematics",
		version: "1.0.0",
		protocolVersion: "VSRP-001",
		capabilities: ["crawler_navigation", "sliding_collision"],
	});

	// Solid blocking tiles that intercept party spatial traversal
	const SOLID_TILES = Object.freeze(new Set(["#", "B", "F", "P"]));
	const COLLISION_BUFFER = 0.28; // Strict spatial buffer to prevent wall clipping artifacts

	/**
	 * Checks if a target map cell contains a solid blocking structural asset.
	 */
	function isCellSolid(map, gx, gy) {
		if (gy < 0 || gy >= map.length || gx < 0 || gx >= map[0].length)
			return true;
		return SOLID_TILES.has(map[gy][gx]);
	}

	/**
	 * Resolves spatial collisions against wall matrices using an axis-separated
	 * bounding box buffer. Supports sliding velocity components along wall faces.
	 */
	function processCollision(currentPos, velocityX, velocityY, map) {
		let nx = currentPos.x + velocityX;
		let ny = currentPos.y + velocityY;

		// --- Axis Isolated Resolution: X-Axis ---
		if (velocityX > 0) {
			if (
				isCellSolid(
					map,
					Math.floor(nx + COLLISION_BUFFER),
					Math.floor(currentPos.y),
				)
			) {
				nx = Math.floor(nx + COLLISION_BUFFER) - COLLISION_BUFFER;
			}
		} else if (velocityX < 0) {
			if (
				isCellSolid(
					map,
					Math.floor(nx - COLLISION_BUFFER),
					Math.floor(currentPos.y),
				)
			) {
				nx = Math.floor(nx - COLLISION_BUFFER) + 1.0 + COLLISION_BUFFER;
			}
		}

		// --- Axis Isolated Resolution: Y-Axis ---
		if (velocityY > 0) {
			if (
				isCellSolid(
					map,
					Math.floor(currentPos.x),
					Math.floor(ny + COLLISION_BUFFER),
				)
			) {
				ny = Math.floor(ny + COLLISION_BUFFER) - COLLISION_BUFFER;
			}
		} else if (velocityY < 0) {
			if (
				isCellSolid(
					map,
					Math.floor(currentPos.x),
					Math.floor(ny - COLLISION_BUFFER),
				)
			) {
				ny = Math.floor(ny - COLLISION_BUFFER) + 1.0 + COLLISION_BUFFER;
			}
		}

		return { x: nx, y: ny };
	}

	return {
		getModuleInfo() {
			return MODULE_INFO;
		},

		/**
		 * Translates hardware crawler action tokens relative to the active camera facing yaw.
		 * Enforces 100% headless testability with zero DOM event coupling.
		 * @param {string} actionToken - Normalized input token ('UP', 'DOWN', 'STRAFE_L', etc.).
		 * @param {Object} currentPos - Current spatial float vector { x, y }.
		 * @param {number} currentYaw - Facing angle direction in radians.
		 * @param {string[][]} map - Authoritative 2D layout grid matrix.
		 * @param {number} moveSpeed - Grid velocity scale coefficient.
		 * @returns {Object} Resulting kinematic transaction bundle containing new position/yaw deltas.
		 */
		executeTranslation(
			actionToken,
			currentPos,
			currentYaw,
			map,
			moveSpeed = 0.08,
		) {
			let vx = 0;
			let vy = 0;
			let targetYaw = currentYaw;

			const cosY = Math.cos(currentYaw);
			const sinY = Math.sin(currentYaw);

			switch (actionToken) {
				case "UP": // W: Move forward matching direction vectors
					vx = cosY * moveSpeed;
					vy = sinY * moveSpeed;
					break;
				case "DOWN": // S: Move backward away from direction vectors
					vx = -cosY * moveSpeed;
					vy = -sinY * moveSpeed;
					break;
				case "STRAFE_L": // Q: Slide perpendicular left (-90 deg from yaw)
					vx = sinY * moveSpeed;
					vy = -cosY * moveSpeed;
					break;
				case "TURN_L": // A: Rotate camera viewpoint counter-clockwise
					targetYaw -= Math.PI / 2;
					break;
				case "TURN_R": // D: Rotate camera viewpoint clockwise
					targetYaw += Math.PI / 2;
					break;
				default:
					return { pos: currentPos, yaw: currentYaw, stepTaken: false };
			}

			// Cleanly normalize yaw thresholds to stay within standard trigonometric cycles
			if (targetYaw < -Math.PI) targetYaw += Math.PI * 2;
			if (targetYaw > Math.PI) targetYaw -= Math.PI * 2;

			// Process wall collision bounding checks if translation forces movement
			let stepTaken = false;
			let finalPos = { ...currentPos };

			if (vx !== 0 || vy !== 0) {
				finalPos = processCollision(currentPos, vx, vy, map);
				// Check if physical coordinate deltas crossed integer cell thresholds
				if (
					Math.floor(finalPos.x) !== Math.floor(currentPos.x) ||
					Math.floor(finalPos.y) !== Math.floor(currentPos.y)
				) {
					stepTaken = true; // Signals overworld danger encounter rolling checks
				}
			} else if (targetYaw !== currentYaw) {
				stepTaken = false; // Pure orientation sweeps are completely cleansed of encounter rolls
			}

			return { pos: finalPos, yaw: targetYaw, stepTaken };
		},
	};
})();

if (typeof window !== "undefined")
	window.EmberlightKinematics = EmberlightKinematics;
