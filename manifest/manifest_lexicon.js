/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MANIFEST LEXICON SUB-MODULE
 * Document Identifier: VSRP-001-MANIFEST-LEXICON
 * Governing Canon:     CANON-MAGITEK-AETHERPUNK-001 §5 (Magitek Lexicon)
 * Authority:           Host SSOT Staging Membrane
 * ============================================================================
 *
 * Single source of truth for every player-facing term on the War Table.
 *
 * INVARIANT: This module only translates *display text*. Internal identifiers
 * (`hp`, `mp`, `POTION`, `FIRE`, ...) are never renamed — save files, the
 * Sentinel battery, and simulation math all key off those IDs.
 *
 * Usage (from any tier, browser or headless VM):
 *   EmberlightManifest.Lexicon.term('stat.hp')                 // 'VIT'
 *   EmberlightManifest.Lexicon.element('FIRE')                 // 'EMBER'
 *   EmberlightManifest.Lexicon.format('log.defeat', { name })  // telegraph line
 */
if (typeof window !== 'undefined') window._ManifestInternal = window._ManifestInternal || {};

(() => {

	/**
	 * Flat dotted-key term table. Keys are stable; values are canon display text.
	 * @type {Readonly<Record<string, string>>}
	 */
	const Terms = {
		// --- Vital Fluids & Resources (CANON §5) ---
		'stat.hp': 'VIT',
		'stat.hp.long': 'Vitality Mercury',
		'stat.mp': 'AET',
		'stat.mp.long': 'Lapis Aether',
		'stat.exp': 'XP',
		'stat.exp.long': 'Expedition Experience',
		'stat.sp': 'AQ',
		'stat.sp.long': 'Aetheric Harmonic Quanta',
		'stat.level': 'Lv',
		'stat.level.long': 'Attunement Tier',
		'currency.gold': 'G',
		'currency.gold.long': 'Orichalcum Marks',

		// --- Combat State ---
		'state.fallen': 'TETHER SEVERED',
		'affinity.weak': 'FRACTURE',
		'affinity.resist': 'GROUNDED',
	};

	/**
	 * Internal element IDs → canon ley-frequencies (CANON §10.3).
	 * LIGHTNING and ARCANE have no canon frequency yet; their labels are
	 * provisional pending the Phase 3 element rework.
	 * @type {Readonly<Record<string, string>>}
	 */
	const Elements = {
		FIRE: 'EMBER',
		ICE: 'TIDE',
		HOLY: 'LUMEN',
		POISON: 'UMBRA',
		PHYSICAL: 'IRON',
		LIGHTNING: 'GALVANIC',
		ARCANE: 'LEY-FLUX',
	};

	/**
	 * Emberlight Telegraph Standard templates (CANON §12).
	 * Placeholders use `{token}` syntax and are filled by `format()`.
	 * @type {Readonly<Record<string, string>>}
	 */
	const Templates = {
		'log.defeat': '[GALVANIC CUTOFF] {name} — tether severed!',
		'log.levelUp': '[ATTUNEMENT] {name} soldered to Tier {level}! Vitals reconstituted (+1 AQ, +{hp} Max VIT).',
		'log.spoilsItem': '[SALVAGE] Recovered relic: {item}.',
		'log.spoils': '[RESOLVED // EXPEDITION SECURE] Recovered {gold}G and {exp} XP.',
		'log.item.heal': '{name} imbibed {item} (+{amount} VIT)!',
		'log.item.mana': '{name} imbibed {item} (+{amount} AET)!',
		'log.item.revive': '{name} arc-welded back by {item} (+{amount} VIT)!',
		'log.item.fallen': '{name}\'s tether is severed — {item} cannot take hold!',
		'log.forage': '✨ Salvaged {item} and {gold}G from the strata!',
		'item.effect.heal': 'Restores {amount} VIT',
		'item.effect.mana': 'Restores {amount} AET',
		'item.effect.revive': 'Re-tethers fallen ({amount}% VIT)',
		'cost.mp': '({amount} AET)',
	};

	/**
	 * Resolves a display term by key.
	 * [Pure Query]
	 * @param {string} key - Dotted term key (e.g. 'stat.hp').
	 * @param {string} [fallback] - Returned when the key is unknown.
	 * @returns {string} Canon display text.
	 */
	function term(key, fallback) {
		return Object.hasOwn(Terms, key) ? Terms[ key ] : (fallback ?? key);
	}

	/**
	 * Resolves an internal element ID to its canon ley-frequency label.
	 * [Pure Query]
	 * @param {string} id - Internal element ID (e.g. 'FIRE').
	 * @returns {string} Canon element label (unknown IDs pass through).
	 */
	function element(id) {
		if (!id) return '';
		const key = String(id).toUpperCase();
		return Object.hasOwn(Elements, key) ? Elements[ key ] : key;
	}

	/**
	 * Fills a telegraph template with variables.
	 * [Pure Query]
	 * @param {string} key - Template key (e.g. 'log.defeat').
	 * @param {Record<string, string | number>} [vars] - Placeholder values.
	 * @param {string} [fallback] - Template used when the key is unknown.
	 * @returns {string} Formatted display line.
	 */
	function format(key, vars, fallback) {
		const tpl = Object.hasOwn(Templates, key) ? Templates[ key ] : (fallback ?? key);
		return tpl.replaceAll(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[ k ]) : m));
	}

	const LexiconModule = {
		Lexicon: { Terms, Elements, Templates, term, element, format },
	};

	if (typeof window !== 'undefined') {
		window._ManifestInternal.Lexicon = LexiconModule;
	}
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = LexiconModule;
	}
})();
