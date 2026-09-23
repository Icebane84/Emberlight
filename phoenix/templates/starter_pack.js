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
@capabilities [ "STORAGE_ISOLATED", "CAP_RENDER_CANVAS2D" ]

memory {
    pos_x: f32,
    pos_y: f32,
    vel_x: f32,
    vel_y: f32,
    health: u16
}

state {
    score: 0,
    alive: true
}

on configure {
    this.pos_x = 100.0;
    this.pos_y = 100.0;
    this.health = 100;
}

on update {
    this.pos_x += this.vel_x * temporalTick;
    this.pos_y += this.vel_y * temporalTick;
}

on render {
    if (ctx && ctx.fillRect) {
        ctx.fillStyle = '#ffb454';
        ctx.fillRect(this.pos_x, this.pos_y, 16, 16);
    }
}
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
