/* cSpell:words VSRP catacomb Cataclysm miasma portcullis UNCONFIGURED SSOT */
/**
 * ============================================================================
 * EMBERLIGHT COMBAT SUBSYSTEM: 4-QUADRANT DTO PROJECTION (VSRP-001 / MPFS-001)
 * Document Identifier: VSRP-001-COMBAT-PROJECTION
 * Subsystem:           Pure DTO Synthesis for 2x2 War Table Presentation
 * ============================================================================
 */

/**
 * Pure projection synthesizer transforming combat state snapshots into frozen 4-quadrant DTOs.
 * [Pure Query / Zero Simulation Mutation]
 * @param {any} snapshot - Immutable combat state snapshot.
 * @returns {Readonly<CombatWarTableProjection>} Frozen 4-quadrant projection bundle.
 */
function createProjection(snapshot) {
	if (!snapshot) return /** @type {Readonly<CombatWarTableProjection>} */ (Object.freeze({}));

	const activeCharId =
		snapshot.turnQueue?.[snapshot.activeTurnIndex]?.entity?.id ||
		snapshot.party?.[0]?.id ||
		null;
	const activeHeroIdx = (snapshot.party || []).findIndex(
		(/** @type {{ id: any; }} */ c) => c.id === activeCharId,
	);

	// Compute dynamic Q1 grid coordinates & trajectory vectors
	const q1PartyNodes = (snapshot.party || []).map((/** @type {{ row: any; id: any; name: any; phenotype: any; hp: any; maxHp: any; alive: any; }} */ p, /** @type {number} */ idx) => {
		const isFront = (p.row || "FRONT") === "FRONT";
		return {
			id: p.id,
			name: p.name,
			phenotype: p.phenotype || "HERO",
			row: p.row || "FRONT",
			hp: p.hp,
			maxHp: p.maxHp,
			alive: Boolean(p.alive),
			gridX: isFront ? 2 : 1,
			gridY: idx + 1,
			isCurrentTurn: p.id === activeCharId,
		};
	});

	const q1EnemyNodes = (snapshot.enemies || []).map((/** @type {{ row: any; id: any; name: any; key: any; hp: any; maxHp: any; alive: any; isBoss: any; }} */ e, /** @type {number} */ idx) => {
		const isFront = (e.row || "FRONT") === "FRONT";
		return {
			id: e.id,
			name: e.name,
			key: e.key,
			row: e.row || "FRONT",
			hp: e.hp,
			maxHp: e.maxHp,
			alive: Boolean(e.alive),
			isBoss: Boolean(e.isBoss),
			gridX: isFront ? 5 : 6,
			gridY: idx + 1,
			isCurrentTurn: e.id === activeCharId,
		};
	});

	// Calculate displacement trajectory vectors if pending skill has knockback/pull
	/**
	 * @type {any[]}
	 */
	const activeDisplacementVectors = [];
	if (snapshot.pendingSkill?.displacement) {
		const disp = snapshot.pendingSkill.displacement;
		q1EnemyNodes.forEach((/** @type {{ alive: any; gridX: number; gridY: any; }} */ node) => {
			if (node.alive) {
				const toX =
					disp.type === "KNOCKBACK"
						? Math.min(7, node.gridX + (disp.tiles || 1))
						: Math.max(5, node.gridX - (disp.tiles || 1));
				activeDisplacementVectors.push({
					fromX: node.gridX,
					fromY: node.gridY,
					toX,
					toY: node.gridY,
					type: disp.type,
					isWallImpact: toX >= 7,
				});
			}
		});
	}

	// Generate intent vectors linking enemies to party targets
	const threatVectors = (snapshot.enemies || [])
		.filter((/** @type {{ alive: any; }} */ e) => e.alive)
		.map((/** @type {{ id: any; name: any; isBoss: any; phaseTwoActive: any; }} */ e, /** @type {any} */ eIdx) => {
			const livingHeroes = (snapshot.party || []).filter((/** @type {{ alive: any; }} */ p) => p.alive);
			const targetIdx =
				(eIdx + (snapshot.roundCount || 0)) % Math.max(1, livingHeroes.length);
			const targetHero = livingHeroes[targetIdx] || snapshot.party?.[0] || null;
			return {
				enemyId: e.id,
				enemyName: e.name,
				targetHeroId: targetHero?.id || null,
				targetHeroName: targetHero?.name || "Hero",
				heroIndex: targetIdx,
				isCharged: Boolean(e.isBoss && e.phaseTwoActive),
			};
		});

	const q1Spatial = Object.freeze({
		gridDimensions: Object.freeze({ cols: 8, rows: 6 }),
		partyFormation: Object.freeze(q1PartyNodes),
		enemyFormation: Object.freeze(q1EnemyNodes),
		hazardTiles: Object.freeze([
			{ x: 7, y: 1, type: "WALL" },
			{ x: 7, y: 2, type: "WALL" },
			{ x: 7, y: 3, type: "WALL" },
			{ x: 7, y: 4, type: "WALL" },
			{ x: 7, y: 5, type: "WALL" },
			{ x: 7, y: 6, type: "WALL" },
			{ x: 0, y: 1, type: "WALL" },
			{ x: 0, y: 2, type: "WALL" },
			{ x: 0, y: 3, type: "WALL" },
			{ x: 0, y: 4, type: "WALL" },
		]),
		activeVectors: Object.freeze(activeDisplacementVectors),
		threatVectors: Object.freeze(threatVectors),
		allies: Object.freeze(q1PartyNodes),
		enemies: Object.freeze(q1EnemyNodes),
	});

	const q2Clash = Object.freeze({
		biome: snapshot.biome || snapshot.terrain || "MEADOW",
		activeTurnIndex: snapshot.activeTurnIndex || 0,
		phase: snapshot.phase || "PLAYER_INPUT",
		enrageFactor: snapshot.enemies?.some((/** @type {{ isBoss: any; phaseTwoActive: any; }} */ e) => e.isBoss && e.phaseTwoActive)
			? 1.5
			: 1.0,
		allies: Object.freeze(q1PartyNodes),
		enemies: Object.freeze(q1EnemyNodes),
		activeClashAnimation: snapshot.pendingSkill ? "CHANNELING" : null,
	});

	const q3Oracle = Object.freeze({
		turnQueue: snapshot.turnQueue ? [...snapshot.turnQueue] : [],
		forecastQueue: snapshot.forecastQueue ? [...snapshot.forecastQueue] : [],
		log: snapshot.log ? [...snapshot.log] : [],
		threatVectors: Object.freeze(threatVectors),
		enemies: Object.freeze(
			(snapshot.enemies || []).map((/** @type {{ id: any; name: any; weaknesses: any; resistances: any; immunities: any; alive: any; hp: any; maxHp: any; }} */ e) => ({
				id: e.id,
				name: e.name,
				weaknesses: e.weaknesses ? [...e.weaknesses] : [],
				resistances: e.resistances ? [...e.resistances] : [],
				immunities: e.immunities ? [...e.immunities] : [],
				alive: Boolean(e.alive),
				hp: e.hp,
				maxHp: e.maxHp,
			})),
		),
	});

	const q4Deck = Object.freeze({
		activeCharId,
		activeHeroIndex: Math.max(activeHeroIdx, 0),
		selectedTab: snapshot.selectedTab || "ATTACK",
		pendingSkill: snapshot.pendingSkill
			? Object.freeze({ ...snapshot.pendingSkill })
			: null,
		pendingItem: snapshot.pendingItem || null,
		partyVitals: Object.freeze(
			(snapshot.party || []).map((/** @type {{ id: any; name: any; phenotype: any; hp: any; maxHp: any; mp: any; maxMp: any; row: any; alive: any; ailments: any; }} */ c, /** @type {any} */ idx) => ({
				id: c.id,
				name: c.name,
				phenotype: c.phenotype || "HERO",
				hp: c.hp,
				maxHp: c.maxHp,
				mp: c.mp,
				maxMp: c.maxMp,
				row: c.row || "FRONT",
				alive: Boolean(c.alive),
				ailments: c.ailments ? [...c.ailments] : [],
				isCurrentTurn: idx === activeHeroIdx,
			})),
		),
		inventory: snapshot.inventory
			? Object.freeze({ ...snapshot.inventory })
			: Object.freeze({}),
		phase: snapshot.phase || "PLAYER_INPUT",
	});

	return Object.freeze({
		q1Spatial,
		q2Clash,
		q3Oracle,
		q4Deck,
		snapshot,
	});
}

const CombatProjection = Object.freeze({
	createProjection,
});

/**
 * @returns {any}
 */
function getRoot() {
	if (typeof window !== "undefined") return window;
	if (typeof globalThis !== "undefined") return globalThis;
	return {};
}

const _root = getRoot();
_root._CombatInternal = _root._CombatInternal || {};
_root._CombatInternal.Projection = CombatProjection;

if (typeof module !== "undefined" && module.exports) {
	module.exports = CombatProjection;
}

