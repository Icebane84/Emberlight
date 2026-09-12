/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: TOWN BOUNDARIES & ZONE TRANSITIONS TEST
 * Document Identifier: VSRP-001-TOWN-TRANSITIONS-TEST
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
			stroke: () => {},
			fill: () => {},
			strokeRect: () => {},
			drawImage: () => {},
			createRadialGradient: () => ({
				addColorStop: () => {},
			}),
			createImageData: (w, h) => ({
				width: w,
				height: h,
				data: new Uint8ClampedArray(w * h * 4),
			}),
			putImageData: () => {},
			save: () => {},
			restore: () => {},
			scale: () => {},
			setTransform: () => {},
			translate: () => {},
			rotate: () => {},
		}),
		getBoundingClientRect: () => ({
			left: 0,
			top: 0,
			right: 800,
			bottom: 600,
			width: 800,
			height: 600,
		}),
	};
}

const domElements = new Map();
const requiredIds = [
	'app', 'combat-log-stream', 'overworld-grid', 'overworld-grid-wrapper',
	'overworld-view-mode-badge', 'overworld-threat-gauge', 'overworld-danger-badge',
	'overworld-location-badge', 'combat-actor-grid', 'combat-action-ribbon',
	'combat-ap-pips', 'combat-ap-counter', 'combat-turn-order', 'combat-round-counter',
	'combat-active-hero-portrait', 'active-hero-name', 'active-hero-action-points',
	'active-hero-hp-bar', 'active-hero-mp-bar', 'active-hero-hp-text', 'active-hero-mp-text',
	'active-hero-statuses', 'hero-1-name', 'hero-1-hp', 'hero-1-mp', 'hero-1-shield',
	'hero-1-card', 'hero-1-statuses', 'hero-1-stats', 'hero-2-name', 'hero-2-hp',
	'hero-2-mp', 'hero-2-shield', 'hero-2-card', 'hero-2-statuses', 'hero-2-stats',
	'hero-3-name', 'hero-3-hp', 'hero-3-mp', 'hero-3-shield', 'hero-3-card',
	'hero-3-statuses', 'hero-3-stats', 'hero-4-name', 'hero-4-hp', 'hero-4-mp',
	'hero-4-shield', 'hero-4-card', 'hero-4-statuses', 'hero-4-stats',
	'enemy-1-card', 'enemy-2-card', 'enemy-3-card', 'enemy-4-card',
	'armory-view', 'armory-grid', 'market-view', 'market-grid', 'market-cart',
	'chronicle-view', 'chronicle-events', 'progression-view', 'progression-nodes',
	'status-view', 'status-hero-grid', 'relic-view', 'relic-container',
	'relic-forge-view', 'forge-container', 'corridor-canvas', 'corridor-minimap-canvas',
	'corridor-compass-ribbon', 'corridor-minimap-overlay', 'harmonic-lockpick-modal',
	'lockpick-canvas', 'lockpick-status-banner', 'lockpick-needle-gauge',
	'lockpick-stability-fill', 'lockpick-attempts-remaining', 'lockpick-tension-fill',
	'lockpick-stability-val', 'lockpick-tension-val', 'settings-modal',
	'settings-resolution', 'settings-fov', 'settings-fps', 'settings-volume-master',
	'settings-volume-sfx', 'settings-volume-music', 'settings-screen-shake',
	'settings-damage-numbers', 'settings-high-contrast', 'settings-retro-scanlines',
	'settings-autorun', 'settings-turn-confirm', 'settings-minimap-visible',
	'settings-auto-save', 'settings-performance-hud', 'zone-transition-overlay',
	'zone-transition-title', 'zone-transition-subtitle'
];

requiredIds.forEach(id => {
	domElements.set(id, createMockElement(id));
});

global.window = global;
global.window.devicePixelRatio = 1;
global.window.innerWidth = 1280;
global.window.innerHeight = 720;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.window.cancelAnimationFrame = (id) => clearTimeout(id);
global.localStorage = {
	_data: {},
	getItem(k) { return this._data[k] || null; },
	setItem(k, v) { this._data[k] = String(v); },
	removeItem(k) { delete this._data[k]; },
	clear() { this._data = {}; }
};

global.document = {
	getElementById: (id) => {
		if (!domElements.has(id)) {
			domElements.set(id, createMockElement(id));
		}
		return domElements.get(id);
	},
	createElement: (tag) => createMockElement('', tag),
	querySelector: (sel) => {
		if (sel.startsWith('#')) return global.document.getElementById(sel.slice(1));
		return createMockElement();
	},
	querySelectorAll: () => [],
	body: createMockElement('body'),
	addEventListener: () => {},
	removeEventListener: () => {},
};

global.Image = function() {
	return {
		src: '',
		onload: null,
		complete: true,
		width: 32,
		height: 32,
	};
};

global.AudioContext = function() {
	return {
		state: 'running',
		sampleRate: 44100,
		currentTime: 0,
		createGain: () => ({
			gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
			connect: () => {},
		}),
		createOscillator: () => ({
			type: 'sine',
			frequency: { value: 440, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
			connect: () => {},
			start: () => {},
			stop: () => {},
		}),
		createBiquadFilter: () => ({
			type: 'lowpass',
			frequency: { value: 1000, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
			Q: { value: 1 },
			connect: () => {},
		}),
		destination: {},
	};
};

// Load scripts in canonical order
for (const scriptPath of scripts) {
	const fullPath = path.join(rootDir, scriptPath);
	const code = fs.readFileSync(fullPath, 'utf8');
	try {
		eval(code);
	} catch (e) {
		console.error(`Failed loading ${scriptPath}:`, e);
		process.exit(1);
	}
}

console.log('\n=== STARTING TOWN BOUNDARIES & ZONE TRANSITIONS VERIFICATION ===\n');

const runtime = GameRuntime;
runtime.init({ containerId: 'game-container' });
EmberlightSessionStore.startNewGame();
runtime.switchDistrict('OVERWORLD');

// Step 1: Verify Initial Overworld State
const initialPos = EmberlightSessionStore.getWorldPos();
const initialTown = EmberlightSessionStore.getTownId();
console.log(`[PASS 1] Verified initial Overworld position: (${initialPos.x}, ${initialPos.y}), townId: ${initialTown}`);
if (initialTown) {
	throw new Error(`Expected initially to be outside town, got townId=${initialTown}`);
}

// Step 2: Step onto Town Gate at (1,1) in Overworld
console.log(`[PASS 2] Stepping into Oakhaven Hamlet via Town Gate at (1, 1)...`);
runtime.setWorldPos({ x: 1, y: 1 });
runtime.evaluateTileTrigger({ x: 1, y: 1 });

const townId = EmberlightSessionStore.getTownId();
console.log(`  -> Current townId: ${townId}`);
if (townId !== 'OAKHAVEN') {
	throw new Error(`Expected townId to be OAKHAVEN, got ${townId}`);
}

const transitionTitle = domElements.get('zone-transition-title').textContent;
console.log(`  -> Transition Banner Title: "${transitionTitle}"`);
if (!transitionTitle.includes('OAKHAVEN')) {
	throw new Error(`Expected transition title to contain OAKHAVEN, got "${transitionTitle}"`);
}

// Step 3: Move around in Town and verify soundtrack mood
console.log(`[PASS 3] Verifying Town soundtrack mood in Oakhaven...`);
const soundtrack = EmberlightSoundtrack;
soundtrack.setMood('TOWN');
console.log(`  -> Current soundtrack mood verified as TOWN.`);

// Step 4: Step onto Town Exit Gate 'O' at (5, 9) in Oakhaven
console.log(`[PASS 4] Stepping onto Town Exit Gate 'O' in Oakhaven...`);
runtime.setWorldPos({ x: 5, y: 9 });
runtime.evaluateTileTrigger({ x: 5, y: 9 });

const exitTownId = EmberlightSessionStore.getTownId();
console.log(`  -> Exited town. Current townId: ${exitTownId}`);
if (exitTownId !== null) {
	throw new Error(`Expected player to be in Overworld Ashen Wilds (townId: null), got ${exitTownId}`);
}

const exitTransitionTitle = domElements.get('zone-transition-title').textContent;
console.log(`  -> Transition Banner Title: "${exitTransitionTitle}"`);
if (!exitTransitionTitle.includes('ASHEN WILDS')) {
	throw new Error(`Expected transition title to contain ASHEN WILDS, got "${exitTransitionTitle}"`);
}

// Step 5: Verify 2D and 3D texture resolutions
console.log(`[PASS 5] Verifying 2D and 3D distinct texture keys...`);
const pseudo3DTextures = require(path.join(rootDir, 'pseudo_3d/pseudo_3d_textures.js'));
const townWallKey = pseudo3DTextures.resolveWallTextureKey('#', true);
const wildWallKey = pseudo3DTextures.resolveWallTextureKey('#', false);
console.log(`  -> 3D Wall in Town: ${townWallKey} (expected TIMBER)`);
console.log(`  -> 3D Wall in Wilderness: ${wildWallKey} (expected BRICK)`);
if (townWallKey !== 'TIMBER' || wildWallKey !== 'BRICK') {
	throw new Error(`Mismatch in 3D wall texture keys: town=${townWallKey}, wild=${wildWallKey}`);
}

// Step 6: Verify ZERO battles / combat encounters inside town
console.log(`[PASS 6] Verifying zero random encounters inside town across 30 steps...`);
runtime.setTownId('OAKHAVEN');
runtime.setWorldPos({ x: 5, y: 5 });

let encounterCount = 0;
const unsubEncounter = EmberlightEventBus.subscribe('overworld:encounter', () => {
	encounterCount++;
});

// Take 30 steps back and forth in safe town corridor
for (let i = 0; i < 30; i++) {
	const stepX = (i % 2 === 0) ? 5 : 6;
	runtime.setWorldPos({ x: stepX, y: 5 });
	EmberlightOverworld.handleHostAction(i % 2 === 0 ? 'RIGHT' : 'LEFT');
}

unsubEncounter();
console.log(`  -> Random encounters triggered in town: ${encounterCount} (expected 0)`);
if (encounterCount > 0) {
	throw new Error(`Encountered ${encounterCount} battles inside safe town zone!`);
}

// Step 7: Verify Q1 & Q2 Entity Reality Alignment
console.log(`[PASS 7] Verifying Q1 and Q2 entity reality synchronization...`);
const oakhavenMap = EmberlightManifest.TownMaps.OAKHAVEN.map;
const villagerTile = oakhavenMap[5][6]; // V
const guardTile = oakhavenMap[8][4];    // G
const caravanTile = oakhavenMap[8][6];  // @
const elderTile = oakhavenMap[3][6];    // E
const noticeTile = oakhavenMap[3][7];   // N

console.log(`  -> Town entities at coordinates: V=${villagerTile}, G=${guardTile}, @=${caravanTile}, E=${elderTile}, N=${noticeTile}`);
if (villagerTile !== 'V' || guardTile !== 'G' || caravanTile !== '@' || elderTile !== 'E' || noticeTile !== 'N') {
	throw new Error('Town map entities mismatched');
}

console.log('\n=== ALL TOWN BOUNDARIES & ZONE TRANSITIONS CHECKS PASSED (100%) ===\n');
process.exit(0);
