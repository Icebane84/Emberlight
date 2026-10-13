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
	 * @typedef {Object} FieldDossierDefinition
	 * @property {string} id - Unique dossier token.
	 * @property {string} codexId - Precursor codex reference token.
	 * @property {string} title - Display title of the discovery.
	 * @property {string} category - Classification category.
	 * @property {string} [author] - Historical surveyor or archivist.
	 * @property {string} [classification] - Security classification tier.
	 * @property {string} [stamp] - Authenticated archival seal.
	 * @property {string} summary - Brief discovery synopsis.
	 * @property {string} transcription - Decoded transcription or rubbing translation.
	 * @property {string} [runeRubbing] - Graphic representation of rune or schematic.
	 * @property {string} [fieldNotes] - Practical vanguard hazard advisory notes.
	 */

	/**
	 * @typedef {Object} ChronicleSimState
	 * @property {string} [selectedQuestId] - Currently highlighted quest catalog key.
	 * @property {string} [selectedDossierId] - Currently highlighted dossier catalog key.
	 * @property {'DISPATCHES'|'DOSSIERS'} [activeTab] - Currently active archive category.
	 * @property {number} [genevaIndex] - Current clockwork carriage index position.
	 * @property {Record<string, ActiveQuestState>} [quests] - Active progress mapping for quests.
	 * @property {Record<string, boolean>} [flags] - Global world story flags.
	 */

	/**
	 * @typedef {Object} ChronicleActionPayload
	 * @property {'SELECT_QUEST'|'SELECT_DOSSIER'|'SELECT_TAB'|'INDEX_NEXT'|'INDEX_PREV'|'EXIT'} type - Action classification token.
	 * @property {string} [questId] - Target quest identifier for selection.
	 * @property {string} [dossierId] - Target dossier identifier for selection.
	 * @property {'DISPATCHES'|'DOSSIERS'} [tab] - Target archive category.
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

	/**
	 * Retrieves the active manifest definition.
	 * @returns {any}
	 */
	function getManifest() {
		if (typeof EmberlightManifest !== 'undefined') return EmberlightManifest;
		if (typeof window !== 'undefined' && window.EmberlightManifest) return window.EmberlightManifest;
		return {};
	}
	//#endregion

	//#region [SEC-03] Chronicle Viewport & Subsystem E Component Builders
	/**
	 * Builds the top diegetic archive header with Geneva mechanism carriage readout.
	 * @param {HTMLElement} container
	 * @param {ChronicleSimState} state
	 */
	function buildArchiveHeader(container, state) {
		const header = document.createElement('div');
		header.className = 'punched-archive-header';

		const lockup = document.createElement('div');
		lockup.className = 'archive-header-lockup';
		lockup.innerHTML = `
			<div class="archive-gear-icon">⚙️</div>
			<div>
				<div class="archive-sub-tag">HIGH COMMAND ORICHALCUM ARCHIVE // THE IRON CHRONICLE</div>
				<h2 class="archive-headline">PUNCHED-SLATE CARRIAGE & CLOCKWORK GENEVA RACK</h2>
			</div>
		`;
		header.appendChild(lockup);

		const telemetry = document.createElement('div');
		telemetry.className = 'geneva-telemetry-cluster';
		const hexIdx = (state.genevaIndex || 1).toString(16).toUpperCase().padStart(2, '0');
		telemetry.innerHTML = `
			<div class="geneva-badge">
				<span class="geneva-pulse">●</span>
				<span class="geneva-readout">GENEVA INDEX: 0x${hexIdx}</span>
			</div>
			<div class="geneva-detent-label">CARRIAGE DETENT: ENGAGED</div>
		`;
		header.appendChild(telemetry);

		container.appendChild(header);
	}

	/**
	 * Builds the primary selector tabs for Dispatches vs Field Dossiers.
	 * @param {HTMLElement} container
	 * @param {ChronicleSimState} state
	 * @param {(action: ChronicleActionPayload) => void} dispatch
	 */
	function buildArchiveSelectorTabs(container, state, dispatch) {
		const tabRow = document.createElement('div');
		tabRow.className = 'archive-selector-row';

		const activeTab = state.activeTab || 'DISPATCHES';

		const dispatchBtn = document.createElement('button');
		dispatchBtn.type = 'button';
		dispatchBtn.className = `archive-tab-btn${activeTab === 'DISPATCHES' ? ' active' : ''}`;
		dispatchBtn.innerHTML = '<span class="keycap">[1]</span> 📜 HIGH COMMAND DISPATCHES (PRIMARY DIRECTIVES)';
		dispatchBtn.onclick = () => emit(dispatch, { type: 'SELECT_TAB', tab: 'DISPATCHES' });
		tabRow.appendChild(dispatchBtn);

		const dossierBtn = document.createElement('button');
		dossierBtn.type = 'button';
		dossierBtn.className = `archive-tab-btn${activeTab === 'DOSSIERS' ? ' active' : ''}`;
		dossierBtn.innerHTML = '<span class="keycap">[2]</span> 🔬 FIELD DOSSIERS (SUBTERRANEAN DISCOVERIES)';
		dossierBtn.onclick = () => emit(dispatch, { type: 'SELECT_TAB', tab: 'DOSSIERS' });
		tabRow.appendChild(dossierBtn);

		container.appendChild(tabRow);
	}

	/**
	 * Renders the vertical rack of punched-card slates on the left column.
	 * @param {HTMLElement} rackCol
	 * @param {ChronicleSimState} state
	 * @param {(action: ChronicleActionPayload) => void} dispatch
	 * @param {any} manifest
	 */
	function buildSlateRack(rackCol, state, dispatch, manifest) {
		rackCol.className = 'slate-rack-column';

		const rackHeader = document.createElement('div');
		rackHeader.className = 'slate-rack-header';
		const isDossiers = state.activeTab === 'DOSSIERS';
		const items = isDossiers
			? Object.values(manifest.FieldDossiers || {})
			: Object.values(manifest.Quests || {});
		rackHeader.innerHTML = `
			<span>${isDossiers ? 'FIELD DOSSIER SLATES' : 'HIGH COMMAND SLATE RACK'}</span>
			<span class="slate-count-tag">${items.length} SLATES</span>
		`;
		rackCol.appendChild(rackHeader);

		const rackList = document.createElement('div');
		rackList.className = 'slate-rack-list';

		if (isDossiers) {
			/** @type {FieldDossierDefinition[]} */ (items).forEach((dossier, idx) => {
				const isSelected = state.selectedDossierId === dossier.id || (!state.selectedDossierId && idx === 0);
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = `slate-card-tab${isSelected ? ' active' : ''}`;
				btn.innerHTML = `
					<div class="slate-punched-holes">● ○ ●</div>
					<div class="slate-card-body">
						<div class="slate-card-code">${dossier.codexId || `DOSSIER 0x0${idx + 1}`}</div>
						<div class="slate-card-title">${dossier.title}</div>
						<div class="slate-card-sub">${dossier.category || 'SURVEY'}</div>
					</div>
					${isSelected ? '<span class="carriage-pointer">▶</span>' : ''}
				`;
				btn.onclick = () => emit(dispatch, { type: 'SELECT_DOSSIER', dossierId: dossier.id });
				rackList.appendChild(btn);
			});
		} else {
			/** @type {QuestDefinition[]} */ (items).forEach((quest, idx) => {
				const active = state.quests?.[quest.id];
				const completed = Boolean(
					active?.completed || (quest.requiredFlag && state.flags?.[quest.requiredFlag])
				);
				const isSelected = state.selectedQuestId === quest.id || (!state.selectedQuestId && idx === 0);
				const statusText = completed ? 'RESOLVED' : `STAGE ${active?.stage || 0}`;
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = `slate-card-tab${isSelected ? ' active' : ''}${completed ? ' completed' : ''}`;
				btn.innerHTML = `
					<div class="slate-punched-holes">● ○ ●</div>
					<div class="slate-card-body">
						<div class="slate-card-code">${(/** @type {any} */ (quest)).dispatchCode || `DISPATCH 0x0${idx + 1}`}</div>
						<div class="slate-card-title">${quest.title || quest.id}</div>
						<div class="slate-card-status">${statusText}</div>
					</div>
					${isSelected ? '<span class="carriage-pointer">▶</span>' : ''}
				`;
				btn.onclick = () => emit(dispatch, { type: 'SELECT_QUEST', questId: quest.id });
				rackList.appendChild(btn);
			});
		}
		rackCol.appendChild(rackList);

		// Clockwork indexing ratchet button
		const ratchetFooter = document.createElement('div');
		ratchetFooter.className = 'slate-ratchet-footer';
		const ratchetBtn = document.createElement('button');
		ratchetBtn.type = 'button';
		ratchetBtn.className = 'cmd-btn ratchet-advance-btn';
		ratchetBtn.innerHTML = '<span class="keycap">[J]</span> ⏩ INDEX GENEVA CARRIAGE';
		ratchetBtn.onclick = () => emit(dispatch, { type: 'INDEX_NEXT' });
		ratchetFooter.appendChild(ratchetBtn);
		rackCol.appendChild(ratchetFooter);
	}

	/**
	 * Builds the active High Command dispatch reader.
	 * @param {HTMLElement} readerCol
	 * @param {QuestDefinition} quest
	 * @param {ActiveQuestState} activeState
	 * @param {Record<string, boolean>} [flags]
	 */
	function buildDispatchReader(readerCol, quest, activeState, flags) {
		const q = /** @type {any} */ (quest);
		const stages = Array.isArray(q.stages) ? q.stages : Object.values(q.stages || {});
		const isCompleted = Boolean(
			activeState.completed || (q.requiredFlag && flags?.[q.requiredFlag])
		);

		let stagesHtml = '';
		stages.forEach((st, idx) => {
			const isDone = isCompleted || activeState.stage > idx;
			const isCurrent = !isCompleted && activeState.stage === idx;
			const marker = isDone ? '☑' : (isCurrent ? '▶' : '☐');
			const stDesc = typeof st === 'string' ? st : st.desc;
			stagesHtml += `
				<div class="telegraph-stage-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}">
					<span class="stage-marker">${marker}</span>
					<span class="stage-text"><b>STAGE ${idx}:</b> ${stDesc}</span>
				</div>
			`;
		});

		const rewards = q.rewards || { gold: 50, exp: 40, item: 'ORICHALCUM' };

		readerCol.innerHTML = `
			<div class="slate-vellum-sheet">
				<div class="sprocket-holes-strip">● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ●</div>
				
				<div class="telegraph-header-block">
					<div class="telegraph-stamp-line">
						<span class="telegraph-stamp">${q.telegraphStamp || 'ENCODED TELEGRAPH // PRIORITY-ALPHA'}</span>
						<span class="telegraph-freq">TELEGRAPH FREQ: 440 Hz</span>
					</div>
					<div class="telegraph-meta-grid">
						<div><b>FROM:</b> ${q.sender || 'Iron Redoubt High Command // Office of the Seneschal'}</div>
						<div><b>CODE:</b> ${q.dispatchCode || q.id}</div>
						<div><b>STATUS:</b> <span class="telegraph-status-pill${isCompleted ? ' done' : ''}">${isCompleted ? 'DISPATCH RESOLVED' : 'ACTIVE DIRECTIVE'}</span></div>
					</div>
					<h3 class="telegraph-mission-title">${q.title}</h3>
				</div>

				<div class="telegraph-body-section">
					<div class="telegraph-section-label">MISSION DIRECTIVE & TACTICAL OBJECTIVES:</div>
					<div class="telegraph-stages-list">${stagesHtml}</div>
				</div>

				<div class="telegraph-rewards-box">
					<div class="telegraph-rewards-title">AUTHORIZED REQUISITION SEAL:</div>
					<div class="telegraph-rewards-grid">
						<span class="reward-token">🪙 <b>${rewards.gold}</b> Gold Sovereigns</span>
						<span class="reward-token">⚔️ <b>${rewards.exp}</b> Aetheric Quanta</span>
						<span class="reward-token">🛡️ <b>${rewards.item}</b> High Command Armory</span>
					</div>
				</div>

				<div class="sprocket-holes-strip">● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ●</div>
			</div>
		`;
	}

	/**
	 * Builds the active Field Discovery Dossier reader.
	 * @param {HTMLElement} readerCol
	 * @param {FieldDossierDefinition} dossier
	 */
	function buildDossierReader(readerCol, dossier) {
		readerCol.innerHTML = `
			<div class="slate-vellum-sheet">
				<div class="sprocket-holes-strip">● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ●</div>
				
				<div class="telegraph-header-block">
					<div class="telegraph-stamp-line">
						<span class="telegraph-stamp">${dossier.stamp || 'AUTHENTICATED SURVEY // STRATA ARCHIVE'}</span>
						<span class="telegraph-freq">CODEX REF: ${dossier.codexId}</span>
					</div>
					<div class="telegraph-meta-grid">
						<div><b>AUTHOR:</b> ${dossier.author || 'Iron Redoubt Engineering Corps'}</div>
						<div><b>CATEGORY:</b> ${dossier.category || 'GEOLOGICAL SURVEY'}</div>
						<div><b>SECURITY:</b> <span class="telegraph-status-pill">${dossier.classification || 'LEVEL-4'}</span></div>
					</div>
					<h3 class="telegraph-mission-title">${dossier.title}</h3>
				</div>

				<div class="telegraph-body-section">
					<div class="telegraph-section-label">GRAPHITE RUBBING & ARCHITECTURAL SCHEMATIC:</div>
					<div class="runic-rubbing-display">
						<pre class="runic-rubbing-text">${dossier.runeRubbing || '[ PRECURSOR RUNES ]'}</pre>
					</div>
					<div class="telegraph-section-label" style="margin-top:10px;">DECODED ARCHAEOLOGICAL TRANSCRIPTION:</div>
					<div class="telegraph-transcription">${dossier.transcription.replace(/\n/g, '<br>')}</div>
					<div class="dossier-field-notes">
						<b>VANGUARD HAZARD ADVISORY:</b> ${dossier.fieldNotes || 'Maintain caution during traversal.'}
					</div>
				</div>

				<div class="sprocket-holes-strip">● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ●</div>
			</div>
		`;
	}

	/**
	 * Builds the active right column reader based on selected tab and card.
	 * @param {HTMLElement} readerCol
	 * @param {ChronicleSimState} state
	 * @param {any} manifest
	 */
	function buildSlateReader(readerCol, state, manifest) {
		readerCol.className = 'slate-reader-column';
		const isDossiers = state.activeTab === 'DOSSIERS';

		if (isDossiers) {
			const dossiers = /** @type {FieldDossierDefinition[]} */ (Object.values(manifest.FieldDossiers || {}));
			const selected = dossiers.find((d) => d.id === state.selectedDossierId) || dossiers[0];
			if (selected) {
				buildDossierReader(readerCol, selected);
			} else {
				readerCol.innerHTML = '<div class="slate-empty-state">No subterranean discovery dossiers cataloged.</div>';
			}
		} else {
			const quests = /** @type {QuestDefinition[]} */ (Object.values(manifest.Quests || {}));
			const selected = quests.find((q) => q.id === state.selectedQuestId) || quests[0];
			if (selected) {
				const active = state.quests?.[selected.id] || { stage: 0, completed: false };
				buildDispatchReader(readerCol, selected, active, state.flags);
			} else {
				readerCol.innerHTML = '<div class="slate-empty-state">No High Command telegraph dispatches found.</div>';
			}
		}
	}

	/**
	 * Builds bottom actions bar with keycaps and exit button.
	 * @param {HTMLElement} container
	 * @param {(action: ChronicleActionPayload) => void} dispatch
	 */
	function buildArchiveFooter(container, dispatch) {
		const footer = document.createElement('div');
		footer.className = 'punched-archive-footer';

		const hints = document.createElement('div');
		hints.className = 'archive-keycap-hints';
		hints.innerHTML = `
			<span><span class="keycap">[J]</span> Index Carriage</span>
			<span><span class="keycap">[Tab]</span> Toggle Category</span>
			<span><span class="keycap">[Esc]</span> Disengage</span>
		`;
		footer.appendChild(hints);

		const closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'cmd-btn action close-carriage-btn';
		closeBtn.textContent = 'DISENGAGE CARRIAGE [ESC]';
		closeBtn.onclick = () => emit(dispatch, { type: 'EXIT' });
		footer.appendChild(closeBtn);

		container.appendChild(footer);
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
		 * Renders the complete High Command Punched-Slate Archive (The Iron Chronicle).
		 * [DOM Presentation Render]
		 * @param {ChronicleSimState} state - Simulation state snapshot.
		 * @param {(action: ChronicleActionPayload) => void} dispatch - Action dispatcher.
		 * @returns {void}
		 */
		renderChronicle(state, dispatch) {
			const view = getView();
			if (!view || !state) return;
			view.innerHTML = '';

			const manifest = getManifest();

			const archiveContainer = document.createElement('div');
			archiveContainer.className = 'punched-slate-archive';

			buildArchiveHeader(archiveContainer, state);
			buildArchiveSelectorTabs(archiveContainer, state, dispatch);

			const mainMatrix = document.createElement('div');
			mainMatrix.className = 'archive-main-matrix';

			const rackCol = document.createElement('div');
			buildSlateRack(rackCol, state, dispatch, manifest);
			mainMatrix.appendChild(rackCol);

			const readerCol = document.createElement('div');
			buildSlateReader(readerCol, state, manifest);
			mainMatrix.appendChild(readerCol);

			archiveContainer.appendChild(mainMatrix);
			buildArchiveFooter(archiveContainer, dispatch);

			view.appendChild(archiveContainer);
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