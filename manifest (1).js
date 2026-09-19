/**
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
