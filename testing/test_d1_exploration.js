/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DISTRICT 1 EXPLORATION VERIFICATION BATTERY
 * Document Identifier: VSRP-001-D1-EXPLORATION-TEST
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const loadOrderFile = path.join(__dirname, 'load_order.js');
const scripts = require(loadOrderFile);

// Mock browser globals
function createMockElement(id = '', tag = 'div') {
	const classSet = new Set();
	return {
		id,
		tagName: tag.toUpperCase(),
		dataset: {},
		classList: {
			add: (cls) => classSet.add(cls),
			remove: (cls) => classSet.delete(cls),
			contains: (cls) => classSet.has(cls),
			toggle: (cls, force) => {
				if (typeof force === 'boolean') {
					if (force) classSet.add(cls);
					else classSet.delete(cls);
					return force;
				}
				if (classSet.has(cls)) { classSet.delete(cls); return false; }
				classSet.add(cls); return true;
			},
		},
		style: {},
		textContent: '',
		innerHTML: '',
		children: [],
		closest: () => null,
		appendChild: (child) => child,
		remove: () => {},
		addEventListener: () => {},
		querySelector: () => null,
		querySelectorAll: () => [],
		toDataURL: () => 'data:image/png;base64,mock',
		getContext: () => ({
			fillRect: () => {},
			clearRect: () => {},
			beginPath: () => {},
			closePath: () => {},
			moveTo: () => {},
			lineTo: () => {},
			arc: () => {},
			ellipse: () => {},
			quadraticCurveTo: () => {},
			bezierCurveTo: () => {},
			rect: () => {},
			roundRect: () => {},
			clip: () => {},
			strokeRect: () => {},
			createRadialGradient: () => ({ addColorStop: () => {} }),
			createLinearGradient: () => ({ addColorStop: () => {} }),
			createPattern: () => ({}),
			getImageData: () => ({ data: new Uint8ClampedArray(480 * 320 * 4) }),
			putImageData: () => {},
			createImageData: (w = 1, h = 1) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
			fill: () => {},
			stroke: () => {},
			fillText: () => {},
			measureText: () => ({ width: 10 }),
			drawImage: () => {},
			save: () => {},
			restore: () => {},
			setTransform: () => {},
			scale: () => {},
			translate: () => {},
			rotate: () => {},
		}),
		getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 320 }),
	};
}

const mockElements = new Map();
global.document = {
	getElementById: (id) => {
		if (!mockElements.has(id)) mockElements.set(id, createMockElement(id));
		return mockElements.get(id);
	},
	querySelector: () => null,
	querySelectorAll: () => [],
	createElement: (tag) => createMockElement('', tag),
	body: createMockElement('body'),
	head: createMockElement('head'),
	addEventListener: () => {},
};
global.window = global;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.localStorage = {
	_data: {},
	getItem(k) { return this._data[k] || null; },
	setItem(k, v) { this._data[k] = String(v); },
	removeItem(k) { delete this._data[k]; },
	clear() { this._data = {}; }
};

// Load scripts in order
for (const relPath of scripts) {
	const absPath = path.join(rootDir, relPath);
	const code = fs.readFileSync(absPath, 'utf8');
	try {
		eval(code);
	} catch (err) {
		console.error(`Error loading ${relPath}:`, err);
		process.exit(1);
	}
}

console.log('=== STARTING DISTRICT 1 EXPLORATION REFINEMENT VERIFICATION ===');

// Initialize Host Runtime
const runtime = GameRuntime;
runtime.init({ containerId: 'game-container' });

// 1. Verify Tile Legend definitions
console.log('\n[PASS 1] Verifying Manifest Tile Legend entries...');
const legend = EmberlightManifest.TileLegend;
if (!legend.H || !legend.N || !legend.A || !legend['*']) {
	throw new Error('TileLegend missing required D1 exploration keys (H, N, A, *)');
}
console.log('  -> TileLegend H (Hearth Inn):', legend.H.label);
console.log('  -> TileLegend N (Notice Board):', legend.N.label);
console.log('  -> TileLegend A (Aether Shrine):', legend.A.label);
console.log('  -> TileLegend * (Resource Cache):', legend['*'].label);

// 2. Start game and transition to Oakhaven
console.log('\n[PASS 2] Starting game session and entering Oakhaven...');
EmberlightSessionStore.startNewGame();
runtime.switchDistrict('OVERWORLD');
runtime.setTownId('OAKHAVEN');
runtime.setWorldPos({ x: 2, y: 2 }); // Near Hearth Inn (2, 1)

// Damage party to verify Inn healing
const party = runtime.getParty();
party[0].hp = 10;
party[0].mp = 5;
party[1].hp = 12;
party[0].ailments = [{ id: 'POISON', duration: 3 }];
runtime.setParty(party);

// Face UP towards (2, 1) Hearth Inn
EmberlightSessionStore.setFlag('facingDirection', 'UP');
const facingTile = runtime.getActiveWorldMap()[1][2];
if (facingTile !== 'H') {
	throw new Error(`Expected tile at (2, 1) to be 'H', got '${facingTile}'`);
}
console.log('  -> Facing Hearth Inn tile at (2, 1)');

// Interact with Hearth Inn
runtime.interactFacing();
const restedParty = runtime.getParty();
if (restedParty[0].hp !== restedParty[0].maxHp || restedParty[0].mp !== restedParty[0].maxMp || restedParty[0].ailments.length !== 0) {
	throw new Error(`Hearth Inn rest failed to restore party vitals! HP: ${restedParty[0].hp}/${restedParty[0].maxHp}, MP: ${restedParty[0].mp}/${restedParty[0].maxMp}`);
}
console.log('  -> Party successfully rested at Hearth Inn (HP/MP fully restored, ailments cleansed).');

// 3. Notice Board Interaction
console.log('\n[PASS 3] Interacting with Notice Board at (7, 3)...');
runtime.setWorldPos({ x: 7, y: 4 });
EmberlightSessionStore.setFlag('facingDirection', 'UP');
const noticeTile = runtime.getActiveWorldMap()[3][7];
if (noticeTile !== 'N') {
	throw new Error(`Expected tile at (7, 3) to be 'N', got '${noticeTile}'`);
}
runtime.interactFacing();
console.log('  -> Notice Board script triggered cleanly.');

// 4. Aether Shrine Interaction
console.log('\n[PASS 4] Interacting with Ancient Aether Shrine at (10, 5)...');
runtime.setWorldPos({ x: 10, y: 6 });
EmberlightSessionStore.setFlag('facingDirection', 'UP');
const shrineTile = runtime.getActiveWorldMap()[5][10];
if (shrineTile !== 'A') {
	throw new Error(`Expected tile at (10, 5) to be 'A', got '${shrineTile}'`);
}
party[0].mp = 2;
runtime.setParty(party);
runtime.interactFacing();
const shrineParty = runtime.getParty();
if (shrineParty[0].mp !== shrineParty[0].maxMp) {
	throw new Error('Aether Shrine communion failed to restore MP');
}
console.log('  -> Aether Shrine communion restored party MP to ceiling.');

// 5. Resource Cache Scavenging & Mutation
console.log('\n[PASS 5] Scavenging Resource Cache in Overworld...');
runtime.setTownId(null); // Exit to overworld
runtime.setWorldPos({ x: 5, y: 5 });
EmberlightSessionStore.recordTileMutation(5, 4, '*');
EmberlightSessionStore.setFlag('facingDirection', 'UP');

const initialGold = runtime.getGold();
runtime.interactFacing();
const afterGold = runtime.getGold();
if (afterGold <= initialGold) {
	throw new Error('Resource cache scavenging did not reward gold/items');
}
console.log(`  -> Scavenged Resource Cache! Gold increased from ${initialGold}G to ${afterGold}G.`);

// 6. Shift + Direction Pivot in Place
console.log('\n[PASS 6] Verifying Shift + Direction (Pivot-in-Place) turning...');
runtime.setWorldPos({ x: 5, y: 5 });
EmberlightSessionStore.setFlag('facingDirection', 'DOWN');

// Simulate Shift + LEFT via EventBus
runtime.EventBus.publish('input:action', { action: 'LEFT', shiftKey: true });
let currentPos = runtime.getWorldPos();
let currentFacing = runtime.getFlags().facingDirection;
if (currentPos.x !== 5 || currentPos.y !== 5 || currentFacing !== 'LEFT') {
	throw new Error(`Shift+LEFT failed! Expected pos (5,5) facing LEFT, got pos (${currentPos.x},${currentPos.y}) facing ${currentFacing}`);
}
console.log('  -> Shift+LEFT pivoted facing to LEFT at (5, 5) without moving.');

// Simulate Shift + UP via EventBus
runtime.EventBus.publish('input:action', { action: 'UP', shiftKey: true });
currentPos = runtime.getWorldPos();
currentFacing = runtime.getFlags().facingDirection;
if (currentPos.x !== 5 || currentPos.y !== 5 || currentFacing !== 'UP') {
	throw new Error(`Shift+UP failed! Expected pos (5,5) facing UP, got pos (${currentPos.x},${currentPos.y}) facing ${currentFacing}`);
}
console.log('  -> Shift+UP pivoted facing to UP at (5, 5) without moving.');

// Direct pivotFacing API call
runtime.pivotFacing('RIGHT');
currentFacing = runtime.getFlags().facingDirection;
if (currentFacing !== 'RIGHT') {
	throw new Error(`runtime.pivotFacing('RIGHT') failed! Got ${currentFacing}`);
}
console.log('\n=== ALL DISTRICT 1 EXPLORATION VERIFICATION CHECKS PASSED (100%) ===');
process.exit(0);

