/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST CONFIG SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-CONFIG
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	const DefaultSettings = {
		version: '1.0.0',
		protocolVersion: 'VSRP-001',
		input: {
			keymap: {
				UP: ['KeyW', 'ArrowUp'],
				DOWN: ['KeyS', 'ArrowDown'],
				LEFT: ['KeyA', 'ArrowLeft'],
				RIGHT: ['KeyD', 'ArrowRight'],
				CONFIRM: ['Enter', 'Space'],
				CANCEL: ['Escape', 'Backspace'],
				TOGGLE_EXPAND_DECK: ['KeyZ'],
				TOGGLE_3D_VIEW: ['KeyX'],
				STRAFE_LEFT: ['KeyQ'],
				MENU_ARMORY: ['KeyE'],
				MENU_PROGRESSION: ['KeyT'],
				MENU_STATUS: ['KeyC'],
				MENU_POUCH: ['KeyI'],
				MENU_SHOP: ['KeyB'],
				MENU_CHRONICLE: ['KeyJ'],
				REST: ['KeyR'],
				FIELD_SCORCH: ['KeyF'],
				FIELD_FREEZE: ['KeyG'],
				FIELD_CONSECRATE: ['KeyH'],
				FIELD_DISPEL: ['KeyV'],
				CHOICE_1: ['Digit1', 'Numpad1'],
				CHOICE_2: ['Digit2', 'Numpad2'],
				CHOICE_3: ['Digit3', 'Numpad3'],
				CHOICE_4: ['Digit4', 'Numpad4'],
			},
		},
		audio: {
			masterVolume: 0.8,
			sfxVolume: 1.0,
			bgmVolume: 0.5,
			isMuted: false,
		},
		tuning: {
			combatEncounterRate: 0.35,
			criticalMultiplier: 1.5,
			stepPoisonTickRate: 4,
		},
		accessibility: {
			screenShake: true,
			highContrastUI: false,
			crtScanlines: true,
		},
		debug: {
			godMode: false,
			showCollisionMesh: false,
			logTelemetry: true,
		},
	};

	const SessionConfig = {
		startingGold: 100,
		startingInventory: { POTION: 3, ETHER: 1 },
		startingWorldPos: { x: 1, y: 1 },
		townRespawnPos: { x: 1, y: 1 },
		defaultShopId: 'VILLAGE_BLACKSMITH',
	};

	const ExplorationConfig = {
		minDangerSteps: 2,
		encounterChance: 0.35,
		defaultEncounterKey: 'DEFAULT',
	};

	const Config = {
		DefaultSettings,
		SessionConfig,
		ExplorationConfig,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Config = Config;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Config;
	}
})();
