'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const orig = fs.readFileSync(path.join(root, 'ignore_scratch/backups/backup_manifest.js'), 'utf8');
const lines = orig.split('\n');

const manifestDir = path.join(root, 'manifest');
if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });

function sliceClean(startLine, endLine, varName) {
	const slice = lines.slice(startLine - 1, endLine);
	let text = slice.join('\n').replace(/^\t\t/gm, '\t').trim();
	if (text.startsWith(varName + ':')) {
		text = 'const ' + varName + ' =' + text.slice((varName + ':').length);
	} else if (text.startsWith(varName + '(')) {
		text = 'function ' + varName + text.slice(varName.length);
	}
	if (text.endsWith(',')) {
		text = text.slice(0, -1);
	}
	if (!text.endsWith(';') && !text.endsWith('}')) {
		text += ';';
	} else if (text.endsWith('}') && !text.startsWith('function ')) {
		text += ';';
	}
	return text;
}

// 1. Config (lines 204 to 275)
const configContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST CONFIG SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-CONFIG
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	` + sliceClean(204, 256, 'DefaultSettings') + `

	` + sliceClean(261, 267, 'SessionConfig') + `

	` + sliceClean(270, 274, 'ExplorationConfig') + `

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
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_config.js'), configContent);

// 2. Actors (lines 279 to 570)
const actorsContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST ACTORS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-ACTORS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	` + sliceClean(279, 287, 'Curves') + `

	` + sliceClean(291, 296, 'PartyRoster') + `

	` + sliceClean(300, 321, 'Phenotypes') + `

	` + sliceClean(471, 558, 'Enemies') + `

	` + sliceClean(562, 569, 'Encounters') + `

	const Actors = {
		Curves,
		PartyRoster,
		Phenotypes,
		Classes: Phenotypes,
		Enemies,
		Encounters,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Actors = Actors;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Actors;
	}
})();
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_actors.js'), actorsContent);

// 3. Items (lines 327 to 465)
const itemsContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST ITEMS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-ITEMS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	` + sliceClean(327, 465, 'Items') + `

	const ItemsModule = {
		Items,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Items = ItemsModule;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = ItemsModule;
	}
})();
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_items.js'), itemsContent);

// 4. Progression (lines 575 to 1574)
const progressionContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST PROGRESSION SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-PROGRESSION
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	` + sliceClean(575, 606, 'AetherEssences') + `

	` + sliceClean(609, 1129, 'AetherNodes') + `

	` + sliceClean(1134, 1574, 'SkillTrees') + `

	const Progression = {
		AetherEssences,
		AetherNodes,
		SkillTrees,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Progression = Progression;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Progression;
	}
})();
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_progression.js'), progressionContent);

// 5. World (lines 1580 to 3375)
const worldContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST WORLD SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-WORLD
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	` + sliceClean(1580, 1749, 'TileLegend') + `

	` + sliceClean(1752, 3352, 'OverworldMap') + `

	` + sliceClean(3354, 3375, 'TownMaps') + `

	const World = {
		TileLegend,
		OverworldMap,
		TownMaps,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.World = World;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = World;
	}
})();
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_world.js'), worldContent);

// 6. Narrative (lines 3380 to 3790)
const narrativeContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST NARRATIVE SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-NARRATIVE
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	` + sliceClean(3380, 3430, 'Ailments') + `

	` + sliceClean(3434, 3542, 'Quests') + `

	` + sliceClean(3546, 3572, 'WorldMutations') + `

	` + sliceClean(3577, 3608, 'Shops') + `

	` + sliceClean(3612, 3790, 'Dialogues') + `

	const Narrative = {
		Ailments,
		Quests,
		WorldMutations,
		Shops,
		Dialogues,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Narrative = Narrative;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Narrative;
	}
})();
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_narrative.js'), narrativeContent);

// 7. Calculators (lines 3800 to 3927)
let calc1 = sliceClean(3800, 3822, 'calculateGearStats');
let calc2 = sliceClean(3830, 3891, 'computeCharacterStats');
let calc3 = sliceClean(3900, 3927, 'getResolvedMap');

const calculatorsContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST CALCULATORS SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-CALCULATORS
 * Authority: Host SSOT Staging Membrane
 * ============================================================================
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {
	'use strict';

	function getManifestSSOT() {
		if (typeof EmberlightManifest !== 'undefined') return EmberlightManifest;
		if (typeof window !== 'undefined' && window.EmberlightManifest) return window.EmberlightManifest;
		if (typeof globalThis !== 'undefined' && globalThis.EmberlightManifest) return globalThis.EmberlightManifest;
		if (typeof window !== 'undefined' && window._ManifestInternal) {
			const int = window._ManifestInternal;
			return { ...int.Config, ...int.Actors, ...int.Items, ...int.Progression, ...int.World, ...int.Narrative, ...int.Calculators };
		}
		return {};
	}

	` + calc1.replace('function calculateGearStats(character) {', 'function calculateGearStats(character) {\n\t\tconst manifest = (typeof this !== \'undefined\' && this && this.Items) ? this : getManifestSSOT();') + `

	` + calc2.replace('function computeCharacterStats(character) {', 'function computeCharacterStats(character) {\n\t\tconst manifest = (typeof this !== \'undefined\' && this && this.Phenotypes) ? this : getManifestSSOT();') + `

	` + calc3.replace('function getResolvedMap(baseMap, flags = {}) {', 'function getResolvedMap(baseMap, flags = {}) {\n\t\tconst manifest = (typeof this !== \'undefined\' && this && this.WorldMutations) ? this : getManifestSSOT();') + `

	const Calculators = {
		calculateGearStats,
		computeCharacterStats,
		getResolvedMap,
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Calculators = Calculators;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = Calculators;
	}
})();
`;
fs.writeFileSync(path.join(manifestDir, 'manifest_calculators.js'), calculatorsContent);

// 8. Facade
const facadeContent = `/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: DECLARATIVE STATIC DATA MANIFEST (FACADE)
 * Document Identifier: VSRP-001-DATA-MANIFEST
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-MANIFEST-001
 * Authority:           Host SSOT
 * ============================================================================
 */
const EmberlightManifest = (() => {
	'use strict';

	/**
	 * Recursively freezes an object tree to guarantee strict runtime immutability.
	 * @template T
	 * @param {T} obj - Target structure to seal.
	 * @returns {Readonly<T>} Immutable reference to sealed object graph.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== 'object') return obj;
		Object.keys(obj).forEach((prop) => {
			const val = /** @type {Record<string, any>} */ (obj)[prop];
			if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
				deepFreeze(val);
			}
		});
		return Object.freeze(obj);
	}

	const internal = (typeof window !== 'undefined' && window._ManifestInternal) ? window._ManifestInternal : {};

	const config = internal.Config || (typeof require !== 'undefined' ? require('./manifest_config.js') : {});
	const actors = internal.Actors || (typeof require !== 'undefined' ? require('./manifest_actors.js') : {});
	const items = internal.Items || (typeof require !== 'undefined' ? require('./manifest_items.js') : {});
	const progression = internal.Progression || (typeof require !== 'undefined' ? require('./manifest_progression.js') : {});
	const world = internal.World || (typeof require !== 'undefined' ? require('./manifest_world.js') : {});
	const narrative = internal.Narrative || (typeof require !== 'undefined' ? require('./manifest_narrative.js') : {});
	const calculators = internal.Calculators || (typeof require !== 'undefined' ? require('./manifest_calculators.js') : {});

	const manifest = {
		schemaVersion: '1.2.0',
		protocolVersion: 'VSRP-001',
		...config,
		...actors,
		...items,
		...progression,
		...world,
		...narrative,
		...calculators,
	};

	manifest.Classes = manifest.Phenotypes;

	if (typeof window !== 'undefined' && window._ManifestInternal) {
		delete window._ManifestInternal;
	}

	return deepFreeze(manifest);
})();

if (typeof window !== 'undefined') {
	window['EmberlightManifest'] = EmberlightManifest;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightManifest;
}
`;
fs.writeFileSync(path.join(manifestDir, 'manifest.js'), facadeContent);

console.log('Successfully generated all 8 manifest files in manifest/');
