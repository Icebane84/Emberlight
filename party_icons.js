/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROCEDURAL PARTY CREST BAKER & RASTER ENGINE
 * Document Identifier: VSRP-001-PARTY-ICON-BAKER[cite: 5]
 * Governing Protocol:  VSRP-001[cite: 5]
 * Authority:           Peripheral Presentation[cite: 5]
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Canvas Initialization, Constants & Cache Management
 *   [SEC-02] Character Crest Procedural Renderers
 *   [SEC-03] Crest Baker & Public VSRP-001 Interface Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} PartyIconDiagnostics
 * @property {string} driverId Internal driver identifier.
 * @property {number} cachedCount Total cached crest count.
 */

const EmberlightPartyIcons = (() => {
	//#region [SEC-01] Canvas Initialization, Constants & Cache Management
	const SIZE = 24;
	/** @type {Map<string, string>} */
	const cache = new Map();

	const canvas = (typeof document !== 'undefined' && typeof document.createElement === 'function')
		? document.createElement('canvas')
		: null;

	if (canvas) {
		canvas.width = SIZE;
		canvas.height = SIZE;
	}
	/** @type {CanvasRenderingContext2D|null} */
	const ctx = (canvas && typeof canvas.getContext === 'function') ? canvas.getContext('2d') : null;

	/**
	 * Clears the active offscreen canvas buffer[cite: 5].
	 * (State-mutating utility)
	 * @returns {void}
	 */
	function clear() {
		if (ctx) ctx.clearRect(0, 0, SIZE, SIZE);
	}
	//#endregion

	//#region [SEC-02] Character Crest Procedural Renderers
	/**
	 * Renders Aldric's winged solar helm and crimson mantle crest[cite: 5].
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawHeroCrest() {
		if (!ctx) return;
		ctx.save();
		ctx.fillStyle = '#1c1307';
		ctx.fillRect(0, 0, SIZE, SIZE);

		ctx.strokeStyle = '#f59e0b';
		ctx.lineWidth = 1.2;
		ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

		ctx.fillStyle = '#cbd5e1';
		ctx.fillRect(8, 7, 8, 9);

		ctx.fillStyle = '#ff9d4d';
		ctx.fillRect(9, 10, 6, 2);

		ctx.fillStyle = '#eab308';
		ctx.beginPath();
		ctx.moveTo(6, 6);
		ctx.lineTo(12, 3);
		ctx.lineTo(18, 6);
		ctx.lineTo(12, 8);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#dc2626';
		ctx.fillRect(6, 17, 12, 4);

		ctx.restore();
	}

	/**
	 * Renders Brogan's heavy iron mask and crossed war cleavers crest[cite: 5].
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawWarriorCrest() {
		if (!ctx) return;
		ctx.save();
		ctx.fillStyle = '#140d0d';
		ctx.fillRect(0, 0, SIZE, SIZE);

		ctx.strokeStyle = '#94a3b8';
		ctx.lineWidth = 1.2;
		ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

		ctx.fillStyle = '#475569';
		ctx.fillRect(6, 15, 12, 6);

		ctx.fillStyle = '#64748b';
		ctx.fillRect(7, 6, 10, 10);

		ctx.fillStyle = '#0f172a';
		ctx.fillRect(9, 9, 6, 2);
		ctx.fillRect(11, 9, 2, 6);

		ctx.fillStyle = '#e2e8f0';
		ctx.fillRect(5, 5, 2, 3);
		ctx.fillRect(17, 5, 2, 3);

		ctx.restore();
	}

	/**
	 * Renders Selene's arcane leyline hood and astral eye crest[cite: 5].
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawMageCrest() {
		if (!ctx) return;
		ctx.save();
		ctx.fillStyle = '#0b0c1c';
		ctx.fillRect(0, 0, SIZE, SIZE);

		ctx.strokeStyle = '#38bdf8';
		ctx.lineWidth = 1.2;
		ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

		ctx.fillStyle = '#312e81';
		ctx.beginPath();
		ctx.moveTo(12, 3);
		ctx.lineTo(4, 18);
		ctx.lineTo(20, 18);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#020617';
		ctx.beginPath();
		ctx.arc(12, 13, 4, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#38bdf8';
		ctx.shadowColor = '#38bdf8';
		ctx.shadowBlur = 4;
		ctx.fillRect(10, 12, 1.5, 1.5);
		ctx.fillRect(13, 12, 1.5, 1.5);

		ctx.fillStyle = '#c084fc';
		ctx.fillRect(11, 7, 2, 2);

		ctx.restore();
	}

	/**
	 * Renders Wren's sacred silver circlet and radiant ember tear crest[cite: 5].
	 * (Pure presentation drawing procedure)
	 * @returns {void}
	 */
	function drawHealerCrest() {
		if (!ctx) return;
		ctx.save();
		ctx.fillStyle = '#0a160e';
		ctx.fillRect(0, 0, SIZE, SIZE);

		ctx.strokeStyle = '#4ade80';
		ctx.lineWidth = 1.2;
		ctx.strokeRect(2, 2, SIZE - 4, SIZE - 4);

		ctx.fillStyle = '#f1f5f9';
		ctx.beginPath();
		ctx.moveTo(12, 4);
		ctx.lineTo(5, 19);
		ctx.lineTo(19, 19);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = '#22c55e';
		ctx.fillRect(6, 9, 12, 2);

		ctx.fillStyle = '#16a34a';
		ctx.fillRect(11, 13, 2, 6);
		ctx.fillRect(9, 15, 6, 2);

		ctx.restore();
	}

	/**
	 * Bakes a specific phenotype crest onto the active canvas buffer[cite: 5].
	 * (State-mutating utility)
	 * @param {string} [phenotype] Phenotype identifier string.
	 * @returns {void}
	 */
	function bakeCrest(phenotype) {
		if (!ctx) return;
		clear();

		const p = (phenotype || 'HERO').toUpperCase();
		if (p === 'HERO') drawHeroCrest();
		else if (p === 'WARRIOR') drawWarriorCrest();
		else if (p === 'MAGE') drawMageCrest();
		else if (p === 'HEALER') drawHealerCrest();
		else drawHeroCrest();
	}
	//#endregion

	//#region [SEC-03] Crest Baker & Public VSRP-001 Interface Gateway
	return {
		/**
		 * Bakes all registered party crests into PNG data URLs and caches them[cite: 5].
		 * (State-mutating utility)
		 * @returns {void}
		 */
		bakeAll() {
			if (!canvas?.toDataURL) return;
			const phenotypes = ['HERO', 'WARRIOR', 'MAGE', 'HEALER'];
			phenotypes.forEach((pt) => {
				bakeCrest(pt);
				try {
					cache.set(pt, canvas.toDataURL('image/png'));
				} catch (_) { }
			});
			clear();
		},

		/**
		 * Retrieves a cached PNG data URL for a given phenotype crest[cite: 5].
		 * (State-mutating / lookup utility)
		 * @param {string} [phenotype] Phenotype identifier string.
		 * @returns {string|null} Base64 PNG data URL or null.
		 */
		get(phenotype) {
			if (cache.size === 0) this.bakeAll();
			return cache.get((phenotype || 'HERO').toUpperCase()) || null;
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightPartyIcons = EmberlightPartyIcons;
	EmberlightPartyIcons.bakeAll();
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightPartyIcons;
}