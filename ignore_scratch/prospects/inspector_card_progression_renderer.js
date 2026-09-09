/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: PROGRESSION PRESENTATION COMPONENT (TIER 3)
 * Document Identifier: ARCH-ZONE-PROGRESSION-002
 * Governing Protocol:  VSRP-001 / SPEC-003 / ARCH-ZONE-PROGRESSION-001
 * Authority:           Interactive Aether Attunement Card UI Engine
 * ============================================================================
 */

const EmberlightAttunementCard = (() => {
	/**
	 * @typedef {Object} PresentationNode
	 * @property {string} id Unique node string identity matching layout records.
	 * @property {string} label High-visibility text name displayed inside the grid rows.
	 * @property {string} type Core classification descriptor ('active' | 'passive').
	 * @property {number} spCost Required point resource balance allocation volume.
	 * @property {string[]} prerequisites Adjacency map constraints list array.
	 * @property {Record<string, number>} modifiers Direct stat augmentations collection dictionary.
	 * @property {string[]} capabilityTags Array of system field capability access codes.
	 */

	/**
	 * Renders the complete HTML interface block for the Aether Inspector context.
	 * Pure projection logic returning semantic DOM string layout formats.
	 * @param {PresentationNode} targetNode Selected star matrix node data sheet point.
	 * @param {boolean} isAttuned Active validation flag from simulation state checks.
	 * @param {boolean} prerequisitesMet Validation check flag indicating connectivity availability.
	 * @param {number} currentHeroSP Remaining available skill points in target pool.
	 * @returns {string} Raw HTML layout code string.
	 */
	function projectInspectorCard(
		targetNode,
		isAttuned,
		prerequisitesMet,
		currentHeroSP,
	) {
		if (!targetNode) {
			return `
                <div class="aether-inspector-card empty-state">
                    <div class="card-prompt">SELECT CONSTELLATION NODE</div>
                    <div class="card-sub-prompt">Streaming matrix telemetry...</div>
                </div>
            `;
		}

		const canAfford = currentHeroSP >= targetNode.spCost;
		const targetAvailable = !isAttuned && prerequisitesMet && canAfford;

		// Compile item modifier attributes list rows
		const modRows = Object.entries(targetNode.modifiers || {})
			.map(([stat, val]) => `<li>▲ ${stat.toUpperCase()}: +${val}</li>`)
			.join("");

		// Compile system capability tags list layout
		const tagRows = (targetNode.capabilityTags || [])
			.map((tag) => `<span class="capability-tag-chip">${tag}</span>`)
			.join(" ");

		// Compute button execution element states
		let actionButtonHtml = "";
		if (isAttuned) {
			actionButtonHtml = `<button type="button" class="attune-action-btn attuned" disabled>✨ NODE ATTUNED</button>`;
		} else if (!prerequisitesMet) {
			actionButtonHtml = `<button type="button" class="attune-action-btn locked" disabled>⚠️ LOCK: ADJACENCY PATH REQ</button>`;
		} else if (!canAfford) {
			actionButtonHtml = `<button type="button" class="attune-action-btn deficit" disabled>❌ DEFICIT: REQ ${targetNode.spCost} SP (HAVE ${currentHeroSP})</button>`;
		} else {
			actionButtonHtml = `
                <button type="button" class="attune-action-btn execute-trigger"
                        data-action-token="UNLOCK_NODE"
                        data-target-node-id="${targetNode.id}">
                    [✨ ATTUNE NODE] (${targetNode.spCost} SP)
                </button>
            `;
		}

		return `
            <div class="aether-inspector-card glass-panel" data-active-node-id="${targetNode.id}">
                <div class="card-header-row">
                    <span class="node-type-badge ${targetNode.type}">${targetNode.type.toUpperCase()}</span>
                    <h3 class="node-title-label">${targetNode.label.toUpperCase()}</h3>
                </div>

                <div class="telemetry-breakdown-section">
                    <div class="section-title">MATRIC MODIFIERS:</div>
                    <ul class="modifiers-list-container">${modRows || "<li>No attribute alterations.</li>"}</ul>
                </div>

                <div class="capabilities-matrix-section">
                    <div class="section-title">FIELD CAPABILITY INJECTIONS:</div>
                    <div class="tags-flex-wrapper">${tagRows || '<span class="none">None</span>'}</div>
                </div>

                <div class="card-action-footer-bar">
                    ${actionButtonHtml}
                </div>
            </div>
        `;
	}

	/**
	 * Binds click interception listeners to the inspector panel element container.
	 * Captures internal button gestures and bubbles clean tokens back to simulation tenants.
	 * @param {HTMLElement} containerElement DOM target element wrapping the inspector view.
	 * @param {string} heroId Unique identifier for the currently active hero tab profile.
	 * @param {function(Object): void} dispatchCallback Host dispatch command callback pipe.
	 */
	function attachCardInteractionListeners(
		containerElement,
		heroId,
		dispatchCallback,
	) {
		if (!containerElement || typeof dispatchCallback !== "function") return;

		containerElement.addEventListener("click", (event) => {
			const button = event.target.closest(".attune-action-btn.execute-trigger");
			if (!button) return;

			const actionType = button.dataset.actionToken;
			const targetNodeId = button.dataset.targetNodeId;

			if (actionType && targetNodeId) {
				// Return a clean, normalized action token to the Tier 2 simulation tenant dispatch pipe
				dispatchCallback({
					type: actionType,
					characterId: heroId,
					nodeId: targetNodeId,
				});
			}
		});
	}

	return { projectInspectorCard, attachCardInteractionListeners };
})();

if (typeof window !== "undefined")
	window.EmberlightAttunementCard = EmberlightAttunementCard;
