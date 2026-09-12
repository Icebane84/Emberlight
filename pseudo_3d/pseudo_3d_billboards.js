/**
 * ============================================================================
 * PERIPHERAL DRIVER: PSEUDO-3D RAYCASTER - BILLBOARDS & PROXIMITY TRIGGERS
 * Document Identifier: VSRP-001-PSEUDO-3D-BILLBOARDS
 * Governing Protocol:  VSRP-001 / MPFS-001 / ARCH-SPEC-FACADE-001
 * Authority:           Peripheral Presentation (Subsystem Module)
 * ============================================================================
 */

'use strict';

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
}

const Pseudo3DBillboards = (() => {
	const BILLBOARD_GLYPHS = Object.freeze({
		$: "\u{1F4B0}",
		C: "\u{1F525}",
		E: "\u{1F9D3}",
		G: "\u{1F6E1}\u{FE0F}",
		V: "\u{1F464}",
		"@": "\u{1F42B}",
		">": "\u{1FA9C}",
		"<": "\u{1F6AA}",
		"~": "\u{1F30A}",
		"%": "\u{2623}\u{FE0F}",
		H: "\u{1F3E8}",
		N: "\u{1F4CB}",
		A: "\u{2728}",
		"*": "\u{1F48E}",
		D: "\u{1F3F0}",
		S: "\u{26E9}\u{FE0F}",
	});

	/**
	 * Computes visible billboard sprites within view depth.
	 * Pure spatial collection procedure.
	 * @param {any} camera - Camera state object.
	 * @param {string[][]} map - 2D grid map matrix.
	 * @param {any} config - Engine configuration dictionary.
	 * @returns {Array<any>} Sorted array of visible sprites.
	 */
	function computeVisibleSprites(camera, map, config) {
		const sprites = [];
		if (!map || !Array.isArray(map) || map.length === 0 || !map[0]) return sprites;
		const minX = Math.max(0, Math.trunc(camera.x - config.maxDepth));
		const maxX = Math.min(
			map[0].length - 1,
			Math.trunc(camera.x + config.maxDepth),
		);
		const minY = Math.max(0, Math.trunc(camera.y - config.maxDepth));
		const maxY = Math.min(
			map.length - 1,
			Math.trunc(camera.y + config.maxDepth),
		);

		for (let y = minY; y <= maxY; y++) {
			if (!map[y]) continue;
			for (let x = minX; x <= maxX; x++) {
				const tile = map[y][x];
				if (BILLBOARD_GLYPHS[tile]) {
					const dx = x + 0.5 - camera.x;
					const dy = y + 0.5 - camera.y;
					const dist = Math.hypot(dx, dy);
					if (dist > 0.35 && dist < config.maxDepth) {
						sprites.push({ x: x + 0.5, y: y + 0.5, dist, tile });
					}
				}
			}
		}
		return sprites.sort((a, b) => b.dist - a.dist);
	}

	/**
	 * Projects a 3D world sprite onto 2D screen coordinates.
	 * Pure projection calculation procedure.
	 * @param {any} camera - Camera state object.
	 * @param {any} sprite - Target sprite descriptor.
	 * @param {number} planeX - Projection plane X vector.
	 * @param {number} planeY - Projection plane Y vector.
	 * @param {number} cosA - Cosine of camera angle.
	 * @param {number} sinA - Sine of camera angle.
	 * @param {{ width: number, height: number }} dims - Viewport dimensions.
	 * @returns {any} Projected sprite screen metrics or null if behind camera.
	 */
	function projectSprite(camera, sprite, planeX, planeY, cosA, sinA, dims) {
		const invDet = 1.0 / (planeX * sinA - cosA * planeY || 1e-6);
		const spX = sprite.x - camera.x;
		const spY = sprite.y - camera.y;

		const transformX = invDet * (sinA * spX - cosA * spY);
		const transformY = invDet * (-planeY * spX + planeX * spY);

		if (transformY <= 0.2) return null;

		const spriteScreenX = Math.trunc(
			(dims.width / 2) * (1 + transformX / transformY),
		);
		const spriteH = Math.trunc(Math.abs((dims.height / transformY) * 0.75));

		return { spriteScreenX, spriteH, transformY };
	}

	/**
	 * Evaluates a single trigger cell state.
	 * Pure calculation helper.
	 * @param {any} trigger - Trigger definition.
	 * @param {{ x: number, y: number }} pos - Grid position.
	 * @param {any} ctx - Evaluation context.
	 */
	function evaluateTriggerCell(trigger, pos, ctx) {
		const { x, y } = pos;
		const { camera, gameState, nextLatches, events } = ctx;
		const latchKey = `${trigger.tile}:${x}:${y}`;
		const dist = Math.hypot(x + 0.5 - camera.x, y + 0.5 - camera.y);
		const wasLatched = nextLatches.get(latchKey) === true;
		const armed = typeof trigger.isArmed === "function" ? trigger.isArmed(gameState) : true;

		if (armed && !wasLatched && dist <= trigger.enterRadius) {
			nextLatches.set(latchKey, true);
			events.push({
				eventName: trigger.eventName,
				payload: {
					tag: trigger.payloadTag,
					tile: trigger.tile,
					x,
					y,
					distance: dist,
					phase: "enter",
				},
			});
			return;
		}
		if (wasLatched && dist > trigger.exitRadius) {
			nextLatches.set(latchKey, false);
			events.push({
				eventName: trigger.eventName,
				payload: {
					tag: trigger.payloadTag,
					tile: trigger.tile,
					x,
					y,
					distance: dist,
					phase: "exit",
				},
			});
		}
	}

	/**
	 * Evaluates a single trigger row.
	 * @param {any} trigger - Trigger definition.
	 * @param {number} y - Row index.
	 * @param {{ minX: number, maxX: number }} rangeX - Column range.
	 * @param {any} ctx - Evaluation context.
	 * @param {string[][]} map - Map matrix.
	 */
	function evaluateTriggerRow(trigger, y, rangeX, ctx, map) {
		if (!map || !map[y]) return;
		for (let x = rangeX.minX; x <= rangeX.maxX; x++) {
			if (map[y][x] === trigger.tile) {
				evaluateTriggerCell(trigger, { x, y }, ctx);
			}
		}
	}

	/**
	 * Evaluates camera proximity triggers against map entities.
	 * Pure evaluation procedure.
	 * @param {any} camera - Camera state object.
	 * @param {string[][]} map - 2D grid map matrix.
	 * @param {any} config - Engine configuration dictionary.
	 * @param {any} gameState - Current game state snapshot.
	 * @param {Map<string, boolean>} prevLatches - Previous trigger latch state map.
	 * @returns {{ events: Array<{ eventName: string, payload: any }>, nextLatches: Map<string, boolean> }} Evaluated events and updated latches.
	 */
	function evaluateProximityTriggers(
		camera,
		map,
		config,
		gameState,
		prevLatches,
	) {
		const events = [];
		const nextLatches = new Map(prevLatches);
		if (!map || !Array.isArray(map) || map.length === 0 || !map[0]) return { events, nextLatches };
		const triggers = config.proximityTriggers || [];
		if (triggers.length === 0) return { events, nextLatches };

		const minX = Math.max(0, Math.trunc(camera.x - config.maxDepth));
		const maxX = Math.min(
			map[0].length - 1,
			Math.trunc(camera.x + config.maxDepth),
		);
		const minY = Math.max(0, Math.trunc(camera.y - config.maxDepth));
		const maxY = Math.min(
			map.length - 1,
			Math.trunc(camera.y + config.maxDepth),
		);

		const ctx = { camera, gameState, nextLatches, events };
		const rangeX = { minX, maxX };

		for (const trigger of triggers) {
			for (let y = minY; y <= maxY; y++) {
				evaluateTriggerRow(trigger, y, rangeX, ctx, map);
			}
		}

		return { events, nextLatches };
	}

	/**
	 * Determines whether camera or environment movement requires a full frame redraw.
	 * Pure comparison function.
	 * @param {any} prev - Previous frame descriptor.
	 * @param {any} next - Current frame descriptor.
	 * @param {any} config - Engine configuration dictionary.
	 * @returns {boolean} True if frame is dirty and requires redraw.
	 */
	function isDirty(prev, next, config) {
		if (!prev) return true;
		const idle = config.idle;
		if (Math.abs(next.x - prev.x) > idle.positionEpsilon) return true;
		if (Math.abs(next.y - prev.y) > idle.positionEpsilon) return true;
		let dAngle = Math.abs(next.angle - prev.angle);
		if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
		if (dAngle > idle.angleEpsilon) return true;
		if (next.mapRef !== prev.mapRef) return true;
		if (next.isTown !== prev.isTown || next.isDungeon !== prev.isDungeon)
			return true;
		if (
			idle.enableFlickerWhileIdle &&
			Math.abs(next.torchFlicker - prev.torchFlicker) > idle.flickerEpsilon
		)
			return true;
		return false;
	}

	return Object.freeze({
		BILLBOARD_GLYPHS,
		computeVisibleSprites,
		projectSprite,
		evaluateTriggerCell,
		evaluateTriggerRow,
		evaluateProximityTriggers,
		isDirty,
	});
})();

if (typeof window !== 'undefined') {
	window._Pseudo3DInternal = window._Pseudo3DInternal || {};
	window._Pseudo3DInternal.Billboards = Pseudo3DBillboards;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = Pseudo3DBillboards;
}
