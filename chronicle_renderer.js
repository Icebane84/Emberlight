/* cSpell:words VSRP unsubs targetable */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: CHRONICLE DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-CHRONICLE-RENDERER
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-CHRONICLE-RENDERER-001
 * Authority:           Peripheral Presentation
 * Timestamp:           2026-09-07T09:05:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] DOM View Access & Dispatch Helpers
 *   [SEC-03] Chronicle Viewport & Quest Journal Renderer
 *   [SEC-04] Canonical Peripheral Driver Interface Gateway
 *   [SEC-05] Global Environment & Window Module Export
 * ============================================================================
 */

const EmberlightChronicleRendererInstance = (() => {
	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @typedef {Object} QuestStageDefinition
	 * @property {string} desc - Narrative description of the objective.
	 * @property {boolean} completed - Stage termination assertion flag.
	 */

	/**
	 * @typedef {Object} QuestDefinition
	 * @property {string} id - Unique quest identifier token.
	 * @property {string} title - Display title of the quest.
	 * @property {string} [desc] - Fallback description.
	 * @property {string} [requiredFlag] - Prerequisite world flag constraint.
	 * @property {Record<string|number, string|QuestStageDefinition>} stages - Narrative milestone definitions.
	 */

	/**
	 * @typedef {Object} ActiveQuestState
	 * @property {number} stage - Current active milestone index.
	 * @property {boolean} completed - Quest completion status flag.
	 */

	/**
	 * @typedef {Object} ChronicleSimState
	 * @property {string} [selectedQuestId] - Currently highlighted quest catalog key.
	 * @property {Record<string, ActiveQuestState>} [quests] - Active progress mapping for quests.
	 * @property {Record<string, boolean>} [flags] - Global world story flags.
	 */

	/**
	 * @typedef {Object} ChronicleActionPayload
	 * @property {'SELECT_QUEST'|'EXIT'} type - Action classification token.
	 * @property {string} [questId] - Target quest identifier for selection.
	 */
	//#endregion

	//#region [SEC-02] DOM View Access & Dispatch Helpers
	/**
	 * Resolves the root DOM view container for the chronicle journal.
	 * [Pure Query / DOM Inspection]
	 * @returns {HTMLElement|null} Root chronicle view element or null.
	 */
	function getView() {
		return typeof document === 'undefined' ? null : /** @type {HTMLElement|null} */ (document.getElementById('chronicle-view'));
	}

	/**
	 * Safely dispatches an action payload to the simulation tenant.
	 * [State Mutating / Event Emission]
	 * @param {(action: ChronicleActionPayload) => void} dispatch - Host action dispatch callback.
	 * @param {ChronicleActionPayload} action - Action token or payload dictionary.
	 * @returns {void}
	 */
	function emit(dispatch, action) {
		if (typeof dispatch === 'function') dispatch(action);
	}
	//#endregion

	//#region [SEC-03] Chronicle Viewport & Quest Journal Renderer
	/**
	 * Internal routine constructing quest journal and world record view components.
	 * [DOM Presentation Render]
	 * @param {HTMLElement} panel - Target panel element container.
	 * @param {ChronicleSimState} state - Current simulation state snapshot.
	 * @param {(action: ChronicleActionPayload) => void} dispatch - Action dispatcher callback.
	 * @returns {void}
	 */
	function buildChronicleContent(panel, state, dispatch) {
		let manifest = /** @type {any} */ ({});
		if (typeof EmberlightManifest !== 'undefined') {
			manifest = EmberlightManifest;
		} else if (typeof window !== 'undefined' && window.EmberlightManifest) {
			manifest = window.EmberlightManifest;
		}
		const quests = /** @type {QuestDefinition[]} */ (Object.values(manifest.Quests || {}));

		panel.className = 'panel';
		panel.innerHTML = '<div class="panel-title">CHRONICLE - QUEST JOURNAL & WORLD RECORD</div>';

		const list = document.createElement('div');
		quests.forEach((quest) => {
			const active = state.quests?.[quest.id];
			const completed = Boolean(
				active?.completed || (quest.requiredFlag && state.flags?.[quest.requiredFlag])
			);
			const isSelected = state.selectedQuestId === quest.id;
			const statusText = completed ? 'COMPLETED' : `STAGE ${active?.stage || 0}`;
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `cmd-btn${isSelected ? ' run' : ''}`;
			button.textContent = `${quest.title || quest.id} [${statusText}]`;
			button.onclick = () => emit(dispatch, { type: 'SELECT_QUEST', questId: quest.id });
			list.appendChild(button);
		});
		panel.appendChild(list);

		const selected = quests.find((quest) => quest.id === state.selectedQuestId) || quests[0];
		const details = document.createElement('div');
		details.style.cssText = 'margin:10px 0;padding:8px;border:1px solid var(--border-dim);';
		if (selected) {
			const active = state.quests?.[selected.id] || { stage: 0, completed: false };
			const rawStage = Array.isArray(selected.stages)
				? selected.stages[active.stage] || selected.stages[0]
				: selected.stages?.[active.stage] || selected.stages?.['0'];
			const stageText = typeof rawStage === 'string' ? rawStage : rawStage?.desc || selected.desc || 'No recorded details.';
			details.textContent = `${selected.title || selected.id}\n${stageText}`;
		} else {
			details.textContent = 'No entries in the chronicle.';
		}
		panel.appendChild(details);

		const close = document.createElement('button');
		close.type = 'button';
		close.className = 'cmd-btn action';
		close.textContent = 'CLOSE JOURNAL';
		close.onclick = () => emit(dispatch, { type: 'EXIT' });
		panel.appendChild(close);
	}
	//#endregion

	//#region [SEC-04] Canonical Peripheral Driver Interface Gateway
	return {
		/**
		 * Initializes the peripheral driver environment.
		 * [Lifecycle: INIT]
		 * @param {Object} [context] - Host runtime context handle.
		 * @returns {void}
		 */
		init(context) {
			if (context) {
				// Acknowledge context reference
			}
		},

		/**
		 * Renders the complete chronicle journal viewport.
		 * [DOM Presentation Render]
		 * @param {ChronicleSimState} state - Simulation state snapshot.
		 * @param {(action: ChronicleActionPayload) => void} dispatch - Action dispatcher.
		 * @returns {void}
		 */
		renderChronicle(state, dispatch) {
			const view = getView();
			if (!view || !state) return;
			view.innerHTML = '';

			const panel = document.createElement('div');
			buildChronicleContent(panel, state, dispatch);
			view.appendChild(panel);
		},

		/**
		 * Exports driver diagnostics.
		 * [Pure Query]
		 * @returns {{ driverId: string }} Diagnostic health report.
		 */
		getDiagnostics() {
			return { driverId: 'chronicle_renderer' };
		},

		/**
		 * Releases driver resources.
		 * [State Mutating]
		 * @returns {void}
		 */
		destroy() { },
	};
	//#endregion
})();

//#region [SEC-05] Global Environment & Window Module Export
if (typeof window !== 'undefined') {
	window.EmberlightChronicleRenderer = EmberlightChronicleRendererInstance;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightChronicleRendererInstance;
}
//#endregion