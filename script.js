/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: SCRIPT & DIALOGUE RUNNER
 * Document Identifier: VSRP-001-SCRIPT-CORE
 * Governing Protocol:  VSRP-001
 * Authority:           Ephemeral Simulation
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Lifecycle State Management, Utilities & Configuration Helpers
 *   [SEC-02] Dynamic Interpolation & Condition Evaluation Engine
 *   [SEC-03] Node Resolution, Typewriter Step Execution & Presentation Mapping
 *   [SEC-04] Canonical 9-Method Lifecycle Gateway & Host Action Router
 * ============================================================================
 */

/**
 * @typedef {Object} ScriptActionToken
 * @property {string} type Action type token string.
 * @property {number} [choiceIndex] Selected choice index.
 * @property {string} [scriptId] Target script identifier.
 * @property {boolean} [isHeadless] Headless execution flag.
 * @property {boolean} [active] Active execution state.
 */

/**
 * @typedef {Object} ScriptCharacter
 * @property {string} [id] Unique character identifier.
 * @property {string} [name] Character display name.
 * @property {boolean} [alive] Alive status flag.
 * @property {string} [phenotype] Character class phenotype.
 * @property {string} [class] Legacy class string.
 */

/**
 * @typedef {Object} ScriptCondition
 * @property {string} [target] Redirect target node ID.
 * @property {string} [requireFlag] Required active world flag.
 * @property {string} [requireNotFlag] Prohibited active world flag.
 * @property {{questId: string, minStage?: number, maxStage?: number, completed?: boolean}} [requireQuestStage] Quest stage condition.
 * @property {string} [requireItem] Required inventory item ID.
 * @property {number} [itemCount] Required item quantity.
 * @property {number} [requireGold] Required gold balance.
 * @property {boolean} [hideIfLocked] Hide choice if locked flag.
 * @property {string} [text] Choice display text.
 * @property {string} [label] Choice alternate label.
 * @property {string} [next] Next node ID.
 * @property {string} [nextNode] Next node alternate ID.
 * @property {string} [lockReason] Lock explanation reason.
 */

/**
 * @typedef {Object} ScriptChoice
 * @property {string} text Display choice text string.
 * @property {string} [label] Alternate choice label.
 * @property {string} [next] Target node ID identifier.
 * @property {string} [nextNode] Alternate target node ID identifier.
 * @property {boolean} [locked] Whether the choice is locked.
 * @property {string} [lockReason] Reason text explaining why the choice is locked.
 * @property {boolean} [hideIfLocked] Hide choice if locked flag.
 * @property {string} [requireFlag] Required world flag.
 * @property {string} [requireNotFlag] Prohibited world flag.
 * @property {{questId: string, minStage?: number, maxStage?: number, completed?: boolean}} [requireQuestStage] Quest requirement.
 * @property {string} [requireItem] Required item ID.
 * @property {number} [itemCount] Required item count.
 * @property {number} [requireGold] Required gold.
 */

/**
 * @typedef {Object} ScriptNode
 * @property {string} id Unique node identifier.
 * @property {string} [text] Dialogue text content.
 * @property {ScriptChoice[]} [choices] Available choices array.
 * @property {ScriptCondition[]} [redirects] Node redirection rules.
 * @property {string} [setFlag] Narrative flag to set upon loading.
 * @property {number} [giveGold] Gold amount awarded.
 * @property {string} [giveItem] Item ID awarded.
 * @property {string} [takeItem] Item ID consumed.
 * @property {{questId: string, stage: number, completed?: boolean}} [advanceQuest] Quest advancement spec.
 * @property {string} [completeQuest] Quest completion identifier key.
 * @property {string} [next] Next default node ID.
 * @property {string} [nextNode] Alternate next default node ID.
 * @property {string} [speaker] Speaker name override.
 */

/**
 * @typedef {Object} ScriptScript
 * @property {string} [speaker] Default speaker identifier.
 * @property {ScriptNode[]|Object.<string, ScriptNode>} [nodes] Script nodes collection.
 */

/**
 * @typedef {Object} ScriptPendingDeltas
 * @property {Object.<string, boolean>} flags Accumulated flag deltas.
 * @property {Object.<string, Object>} questDeltas Accumulated quest deltas.
 * @property {number} goldDelta Accumulated gold change.
 * @property {string[]} itemsGiven Inventory items granted.
 * @property {string[]} [itemsTaken] Inventory items consumed.
 */

/**
 * @typedef {Object} ScriptSimulationState
 * @property {boolean} active Simulation active status flag.
 * @property {string|null} scriptId Current executing script ID.
 * @property {string} speaker Active speaker name string.
 * @property {string|null} currentNodeId Current dialogue node ID.
 * @property {string} fullText Fully interpolated typewriter string.
 * @property {number} visibleCharCount Number of currently revealed characters.
 * @property {number} charTimer Elapsed typewriter timer accumulator.
 * @property {number} charInterval Time interval per character step.
 * @property {boolean} isTyping Typewriter animation active flag.
 * @property {ScriptChoice[]} choices Active choice array.
 * @property {number} selectedChoiceIndex Currently highlighted choice index.
 * @property {ScriptCharacter[]} party Active party roster.
 * @property {Object.<string, boolean>} flags Active world flags map.
 * @property {Object.<string, Object>} quests Active quest states map.
 * @property {Object.<string, number>} inventory Active inventory counts map.
 * @property {number} gold Active gold balance.
 * @property {ScriptPendingDeltas} pendingDeltas Pending state delta envelopes.
 * @property {boolean} resolved Dialogue resolution completion flag.
 * @property {boolean} [isHeadless] Headless rendering bypass flag.
 */

/**
 * @typedef {Object} ScriptContext
 * @property {{publish?: (topic: string, payload?: any) => void}} [eventBus] Host event bus handle.
 * @property {Array<string|ScriptActionToken>} [inputs] Array of inbound host action tokens.
 */

/**
 * @typedef {Object} ScriptConfig
 * @property {Object.<string, ScriptScript>} [dialogues] Dialogue dictionary.
 * @property {Record<string, any>} [manifest] Game manifest reference.
 */

/**
 * @typedef {Object} ScriptDiagnostics
 * @property {string} moduleId Internal module identifier string.
 * @property {string} lifecycleState Current engine lifecycle state.
 * @property {boolean} active Simulation active status.
 * @property {string|null} scriptId Active script key.
 * @property {string|null} currentNodeId Active node identifier.
 * @property {number} selectedChoiceIndex Highlighted choice index.
 * @property {boolean} isTyping Typewriter effect active status.
 * @property {number} visibleCharCount Revealed character count.
 */

/**
 * @typedef {Object} ScriptModuleInfo
 * @property {string} moduleId Module identifier string.
 * @property {string} version Module version string.
 * @property {string} protocolVersion Protocol compliance version string.
 * @property {string[]} dependencies Module dependencies list.
 * @property {string[]} capabilities Supported capability tags.
 */

const EmberlightScript = (() => {
	//#region [SEC-01] Lifecycle State Management, Utilities & Configuration Helpers
	const State = {
		UNCONFIGURED: 'UNCONFIGURED',
		CONFIGURED: 'CONFIGURED',
		INITIALIZED: 'INITIALIZED',
		READY: 'READY',
		RUNNING: 'RUNNING',
		DESTROYED: 'DESTROYED',
	};

	let lifecycleState = State.UNCONFIGURED;
	/** @type {ScriptConfig|null} */
	let hostConfig = null;
	/** @type {ScriptContext|null} */
	let hostContext = null;
	/** @type {((payload: any) => void) | null} */
	let _onScriptEndCallback = null;

	/** @type {ScriptSimulationState|null} */
	let sim = null;

	/**
	 * Asserts that the script runner is in a permitted lifecycle state.
	 * (Pure state-checking utility)
	 * @param {...string} allowed Allowed lifecycle states.
	 * @returns {void}
	 */
	function assertLifecycle(...allowed) {
		if (!allowed.includes(lifecycleState)) {
			throw new Error(
				`[VSRP-001:script_core] Lifecycle Violation: Method called in state "${lifecycleState}". ` +
				`Allowed: ${allowed.join(' | ')}`
			);
		}
	}

	/**
	 * Recursively freezes configuration objects to enforce immutability.
	 * (Pure calculation utility)
	 * @param {Record<string, any>} obj Target configuration object.
	 * @returns {Record<string, any>} Deeply frozen object.
	 */
	function deepFreeze(obj) {
		if (!obj || typeof obj !== 'object') return obj;
		const target = /** @type {Record<string, any>} */ (obj);
		Object.keys(target).forEach((prop) => {
			if (typeof target[prop] === 'object' && target[prop] !== null && !Object.isFrozen(target[prop])) {
				deepFreeze(target[prop]);
			}
		});
		return Object.freeze(target);
	}

	/**
	 * Retrieves active dialogue definitions from host configuration or global manifest.
	 * (Pure state-accessor utility)
	 * @returns {Record<string, ScriptScript>} Dialogue dictionary object.
	 */
	function getActiveDialogues() {
		const cfg = /** @type {any} */ (hostConfig);
		const m = /** @type {any} */ (getActiveManifest());
		return cfg?.dialogues ||
			cfg?.manifest?.Dialogues ||
			m?.Dialogues ||
			(typeof EmberlightManifest !== 'undefined' ? (/** @type {any} */ (EmberlightManifest)).Dialogues : {});
	}

	/**
	 * Retrieves the active game manifest from host configuration or global scope.
	 * (Pure state-accessor utility)
	 * @returns {Record<string, any>} Manifest object.
	 */
	function getActiveManifest() {
		return (/** @type {any} */ (hostConfig))?.manifest ||
			(typeof EmberlightManifest !== 'undefined' ? (/** @type {any} */ (EmberlightManifest)) : {});
	}

	/**
	 * Dispatches sound effect audio events via event bus or global audio driver.
	 * (State-mutating event dispatcher)
	 * @param {string} sfxName Sound effect token name.
	 * @returns {void}
	 */
	function dispatchSFX(sfxName) {
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('dialogue:sfx', { sfx: sfxName });
		} else {
			const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
			const audio = win.EmberlightAudio;
			if (audio && typeof audio.play === 'function') {
				audio.play(sfxName);
			}
		}
	}

	/**
	 * Constructs a baseline uninitialized simulation state object.
	 * (Pure factory utility)
	 * @returns {ScriptSimulationState} Default simulation state snapshot.
	 */
	function createDefaultState() {
		return {
			active: false,
			scriptId: null,
			speaker: '',
			currentNodeId: null,
			fullText: '',
			visibleCharCount: 0,
			charTimer: 0,
			charInterval: 0.022,
			isTyping: false,
			choices: [],
			selectedChoiceIndex: 0,
			party: [],
			flags: {},
			quests: {},
			inventory: {},
			gold: 0,
			pendingDeltas: {
				flags: {},
				questDeltas: {},
				goldDelta: 0,
				itemsGiven: [],
				itemsTaken: [],
			},
			resolved: false,
		};
	}
	//#endregion

	//#region [SEC-02] Dynamic Interpolation & Condition Evaluation Engine
	// --- Dynamic Variable Interpolator ---
	/**
	 * Interpolates template tags with live simulation variables and item metadata.
	 * (Pure calculation utility)
	 * @param {string} templateStr Raw template string containing interpolation brackets.
	 * @returns {string} Fully interpolated display string.
	 */
	function interpolateText(templateStr) {
		if (typeof templateStr !== 'string') return '';

		const manifest = getActiveManifest();
		const leader = sim?.party.find((c) => c.alive) || sim?.party[0];
		const leaderName = leader ? leader.name : 'Traveler';
		const potionsCount = sim?.inventory.POTION || 0;
		const livingPartyCount = sim?.party.filter((c) => c.alive).length || 0;

		return templateStr.replace(/\{([^{}]+)\}/g, (match, rawKey) => {
			const key = rawKey.trim();

			if (key === 'leader') return leaderName;
			if (key === 'gold') return sim ? String(sim.gold) : '0';
			if (key === 'potions') return String(potionsCount);
			if (key === 'partyCount') return String(livingPartyCount);

			if (key.startsWith('item:')) {
				const itemId = key.slice(5).trim();
				const itemDef = (/** @type {Record<string, any>} */ (manifest))?.Items?.[itemId];
				return itemDef ? (itemDef.label || itemDef.name || itemId) : itemId;
			}

			if (key.startsWith('flag:')) {
				const flagKey = key.slice(5).trim();
				return sim?.flags[flagKey] ? 'Yes' : 'No';
			}

			return match;
		});
	}

	// --- Prerequisite & Condition Evaluator Helpers ---
	/** @param {ScriptCondition | any} cond */
	function checkFlagCondition(cond) {
		if (!cond || !sim) return true;
		if (cond.requireFlag && !sim.flags[cond.requireFlag]) return false;
		if (cond.requireNotFlag && sim.flags[cond.requireNotFlag]) return false;
		return true;
	}

	/** @param {ScriptCondition | any} cond */
	function checkQuestCondition(cond) {
		if (!cond || !sim || !cond.requireQuestStage) return true;
		const { questId, minStage, maxStage, completed } = cond.requireQuestStage;
		const qState = /** @type {any} */ (sim.quests[questId] || { stage: 0, completed: false });
		if (typeof minStage === 'number' && qState.stage < minStage) return false;
		if (typeof maxStage === 'number' && qState.stage > maxStage) return false;
		if (completed !== undefined && qState.completed !== completed) return false;
		return true;
	}

	/** @param {ScriptCondition | any} cond */
	function checkResourceCondition(cond) {
		if (!cond || !sim) return true;
		if (cond.requireItem) {
			const count = sim.inventory[cond.requireItem] || 0;
			const needed = cond.itemCount || 1;
			if (count < needed) return false;
		}
		if (typeof cond.requireGold === 'number' && sim.gold < cond.requireGold) {
			return false;
		}
		return true;
	}

	/**
	 * Evaluates prerequisite flags, quest stages, inventory items, and gold requirements.
	 * (Pure evaluation utility)
	 * @param {ScriptCondition} [cond] Condition criteria specification object.
	 * @returns {boolean} True if all conditions are satisfied.
	 */
	function evaluateCondition(cond) {
		if (!cond || typeof cond !== 'object' || !sim) return true;
		return checkFlagCondition(cond) && checkQuestCondition(cond) && checkResourceCondition(cond);
	}
	//#endregion

	//#region [SEC-03] Node Resolution, Typewriter Step Execution & Presentation Mapping
	/**
	 * Resolves target dialogue nodes, recursively resolving conditional redirects.
	 * (Pure calculation utility)
	 * @param {ScriptScript} script Active script object.
	 * @param {string} targetNodeId Target node identifier.
	 * @returns {ScriptNode|null} Resolved dialogue node or null.
	 */
	function resolveNodeWithRedirects(script, targetNodeId) {
		const nodes = Array.isArray(script.nodes) ? script.nodes : Object.values(script.nodes || {});
		const node = nodes.find((n) => n.id === targetNodeId) || nodes[0];
		if (!node) return null;

		if (Array.isArray(node.redirects)) {
			for (const red of node.redirects) {
				if (evaluateCondition(red) && red.target) {
					return resolveNodeWithRedirects(script, red.target);
				}
			}
		}

		return node;
	}

	/** @param {ScriptNode | any} node */
	function processNodeRewards(node) {
		if (!sim || !node) return;
		if (node.setFlag) {
			sim.flags[node.setFlag] = true;
			sim.pendingDeltas.flags[node.setFlag] = true;
		}
		if (node.giveGold) {
			sim.gold += node.giveGold;
			sim.pendingDeltas.goldDelta += node.giveGold;
		}
		if (node.giveItem) {
			sim.inventory[node.giveItem] = (sim.inventory[node.giveItem] || 0) + 1;
			sim.pendingDeltas.itemsGiven.push(node.giveItem);
		}
		if (node.takeItem && (sim.inventory[node.takeItem] || 0) > 0) {
			sim.inventory[node.takeItem] -= 1;
			if (!sim.pendingDeltas.itemsTaken) sim.pendingDeltas.itemsTaken = [];
			sim.pendingDeltas.itemsTaken.push(node.takeItem);
		}
		if (node.advanceQuest && typeof node.advanceQuest === 'object') {
			const { questId, stage } = node.advanceQuest;
			if (questId && typeof stage === 'number') {
				const qUpdate = { stage, completed: Boolean(node.advanceQuest.completed) };
				sim.quests[questId] = qUpdate;
				sim.pendingDeltas.questDeltas[questId] = qUpdate;
				dispatchSFX('SELECT');
			}
		}
		if (node.completeQuest && typeof node.completeQuest === 'string') {
			const questId = node.completeQuest;
			const current = /** @type {any} */ (sim.quests[questId] || { stage: 1 });
			const qUpdate = { stage: current.stage, completed: true };
			sim.quests[questId] = qUpdate;
			sim.pendingDeltas.questDeltas[questId] = qUpdate;
			dispatchSFX('VICTORY');
		}
	}

	/** @param {ScriptChoice[] | any[]} rawChoices */
	function buildNodeChoices(rawChoices) {
		/** @type {ScriptChoice[]} */
		const validChoices = [];
		rawChoices.forEach((/** @type {any} */ c) => {
			const isEligible = evaluateCondition(c);
			if (isEligible || !c.hideIfLocked) {
				validChoices.push({
					text: interpolateText(c.text || c.label || 'Continue'),
					next: c.next || c.nextNode || null,
					locked: !isEligible,
					lockReason: interpolateText(c.lockReason || 'Requirements not met'),
				});
			}
		});
		return validChoices;
	}

	/**
	 * Loads a specific dialogue node, handles rewards/flags, and initializes typewriter text.
	 * (State-mutating dialogue router)
	 * @param {string} nodeId Dialogue node identifier.
	 * @returns {void}
	 */
	function loadNode(nodeId) {
		if (!sim) return;
		const dialogues = getActiveDialogues();
		const script = dialogues[sim.scriptId || ''] || dialogues.VILLAGE_ELDER || dialogues.ELDER_GREETING;
		if (!script) {
			finalizeDialogue();
			return;
		}

		const node = resolveNodeWithRedirects(script, nodeId);
		if (!node) {
			finalizeDialogue();
			return;
		}

		sim.currentNodeId = node.id || nodeId;
		sim.fullText = interpolateText(node.text || '');
		sim.visibleCharCount = 0;
		sim.charTimer = 0;
		sim.isTyping = sim.fullText.length > 0;

		sim.choices = buildNodeChoices(Array.isArray(node.choices) ? node.choices : []);
		const firstEnabled = sim.choices.findIndex((c) => !c.locked);
		sim.selectedChoiceIndex = firstEnabled !== -1 ? firstEnabled : 0;

		processNodeRewards(node);
		renderDefaultPresentation();
	}

	/**
	 * Retrieves the starting node ID for a script definition.
	 * (Pure calculation utility)
	 * @param {ScriptScript} script Script definition object.
	 * @returns {string} Initial node identifier string.
	 */
	function getFirstNodeId(script) {
		if (Array.isArray(script?.nodes)) {
			return script.nodes[0]?.id || 'start';
		}
		if (script?.nodes && typeof script.nodes === 'object') {
			return script.nodes.start?.id || Object.keys(script.nodes)[0] || 'start';
		}
		return 'start';
	}

	/**
	 * Selects and triggers a dialogue choice index.
	 * (State-mutating action router)
	 * @param {number} choiceIndex Index of the selected choice.
	 * @returns {void}
	 */
	function selectChoice(choiceIndex) {
		if (!sim?.active || sim.isTyping) return;
		const choice = sim.choices[choiceIndex];
		if (!choice || choice.locked) {
			dispatchSFX('DEFEAT');
			return;
		}

		dispatchSFX('SELECT');
		const targetNodeId = choice.next;
		if (targetNodeId) {
			loadNode(targetNodeId);
		} else {
			finalizeDialogue();
		}
	}

	/**
	 * Advances the typewriter text or steps forward to the next dialogue node.
	 * (State-mutating progression runner)
	 * @returns {void}
	 */
	function stepAdvance() {
		const s = sim;
		if (!s?.active || s.resolved) return;

		if (s.isTyping) {
			s.visibleCharCount = s.fullText.length;
			s.isTyping = false;
			renderDefaultPresentation();
			return;
		}

		if (s.choices && s.choices.length > 0) {
			selectChoice(s.selectedChoiceIndex);
			return;
		}

		const dialogues = getActiveDialogues();
		const script = dialogues[s.scriptId || ''] || dialogues.VILLAGE_ELDER || dialogues.ELDER_GREETING;
		const nodes = Array.isArray(script?.nodes) ? script.nodes : Object.values(script?.nodes || {});
		const currentNode = nodes.find((n) => n.id === s.currentNodeId);
		const nextNodeId = currentNode?.next || currentNode?.nextNode;

		if (currentNode && nextNodeId) {
			loadNode(nextNodeId);
		} else {
			finalizeDialogue();
		}
	}

	/**
	 * Moves the choice cursor selection index up or down, skipping locked choices.
	 * (State-mutating navigation runner)
	 * @param {number} delta Direction delta step (+1 or -1).
	 * @returns {void}
	 */
	function moveChoiceCursor(delta) {
		const s = sim;
		if (!s?.active || s.isTyping || !s.choices || s.choices.length === 0) return;
		const total = s.choices.length;
		let nextIndex = s.selectedChoiceIndex;

		for (let i = 0; i < total; i++) {
			nextIndex = (nextIndex + delta + total) % total;
			if (!s.choices[nextIndex].locked) {
				s.selectedChoiceIndex = nextIndex;
				dispatchSFX('SELECT');
				renderDefaultPresentation();
				return;
			}
		}
	}

	/**
	 * Finalizes the active dialogue session, assembling delta envelopes and triggering callbacks.
	 * (State-mutating lifecycle gateway)
	 * @returns {void}
	 */
	function finalizeDialogue() {
		const s = sim;
		if (!s) return;
		s.active = false;
		s.isTyping = false;
		s.resolved = true;

		// Vector E: Assemble complete delta envelope
		const resultDeltas = {
			flags: { ...(s.pendingDeltas.flags) },
			flagsDelta: { ...(s.pendingDeltas.flags) },
			questDeltas: { ...(s.pendingDeltas.questDeltas) },
			questsDelta: { ...(s.pendingDeltas.questDeltas) },
			goldDelta: s.pendingDeltas.goldDelta || 0,
			itemsGiven: Array.isArray(s.pendingDeltas.itemsGiven) ? [...s.pendingDeltas.itemsGiven] : [],
			itemsTaken: Array.isArray(s.pendingDeltas.itemsTaken) ? [...s.pendingDeltas.itemsTaken] : [],
		};

		if (typeof document !== 'undefined') {
			const box = document.getElementById('dialogue-view');
			if (box) box.classList.add('hidden');
		}

		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('dialogue:resolved', resultDeltas);
		}
		if (typeof _onScriptEndCallback === 'function') {
			_onScriptEndCallback(resultDeltas);
		}
	}

	/**
	 * Renders default DOM fallback presentation UI for dialogues and choices.
	 * (State-mutating DOM presenter)
	 * @returns {void}
	 */
	function renderDefaultPresentation() {
		const s = sim;
		if (typeof document === 'undefined' || !s?.active || s?.isHeadless) return;

		const box = document.getElementById('dialogue-view');
		const speakerEl = document.getElementById('dialogue-speaker');
		const textEl = document.getElementById('dialogue-text');
		const choicesEl = document.getElementById('dialogue-choices');

		if (!box || !speakerEl || !textEl || !choicesEl) return;

		box.classList.remove('hidden');
		speakerEl.textContent = s.speaker || '???';
		textEl.textContent = s.fullText.slice(0, s.visibleCharCount);

		choicesEl.innerHTML = '';
		if (!s.isTyping && s.choices.length > 0) {
			choicesEl.classList.remove('hidden');
			s.choices.forEach((c, index) => {
				const isSelected = index === s.selectedChoiceIndex;
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = `cmd-btn ${isSelected ? 'action' : ''}`;
				btn.disabled = !!c.locked;
				btn.style.fontSize = '8px';
				btn.style.padding = '6px 10px';
				btn.style.borderColor = isSelected ? 'var(--ember)' : 'var(--border-dim)';
				btn.style.boxShadow = isSelected ? '0 0 6px rgba(255, 157, 77, 0.4)' : 'none';

				if (c.locked) {
					btn.style.opacity = '0.4';
					btn.style.cursor = 'not-allowed';
					btn.innerHTML = `<span style="color:var(--danger); margin-right:4px;">[🔒]</span>${c.text} <span style="font-size:6px; color:var(--text-dim);">(${c.lockReason})</span>`;
				} else {
					btn.innerHTML = `<span style="color:var(--text-dim); margin-right:4px;">[${index + 1}]</span>${c.text}`;
				}

				if (!c.locked) {
					btn.onclick = () => {
						selectChoice(index);
					};
				}

				choicesEl.appendChild(btn);
			});
		} else {
			choicesEl.classList.add('hidden');
		}
	}
	//#endregion

	//#region [SEC-04] Canonical 9-Method Lifecycle Gateway & Host Action Router
	/** @param {ScriptContext | any} activeCtx */
	function processInputs(activeCtx) {
		if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
			for (const element of activeCtx.inputs) {
				api.handleHostAction(element);
			}
		}
	}

	/** @param {number} dt */
	function updateTypewriter(dt) {
		const s = sim;
		if (!s?.active || !s.isTyping) return;
		s.charTimer += dt;
		let advanced = false;

		while (s.charTimer >= s.charInterval && s.visibleCharCount < s.fullText.length) {
			s.charTimer -= s.charInterval;
			s.visibleCharCount++;
			advanced = true;

			if (s.visibleCharCount % 2 === 0 && s.fullText[s.visibleCharCount - 1] !== ' ') {
				const currentChar = s.fullText[s.visibleCharCount - 1];
				if (hostContext?.eventBus?.publish) {
					hostContext.eventBus.publish('dialogue:char', {
						char: currentChar,
						speaker: s.speaker,
					});
				} else {
					dispatchSFX('SELECT');
				}
			}
		}

		if (s.visibleCharCount >= s.fullText.length) {
			s.isTyping = false;
			renderDefaultPresentation();
		} else if (advanced) {
			renderDefaultPresentation();
		}
	}

	// --- Canonical 9-Method Interface Export ---
	const api = {
		/**
		 * Configures the script simulation tenant.
		 * (State-mutating lifecycle gateway)
		 * @param {ScriptConfig} config Configuration dictionary.
		 * @returns {void}
		 */
		configure(config) {
			assertLifecycle(State.UNCONFIGURED);
			if (!config || typeof config !== 'object') {
				throw new TypeError('[VSRP-001:script_core] configure() requires a non-null configuration dictionary.');
			}
			hostConfig = deepFreeze({ ...config });
			lifecycleState = State.CONFIGURED;
		},

		/**
		 * Initializes the tenant with execution context handles.
		 * (State-mutating lifecycle gateway)
		 * @param {ScriptContext} context Execution context object.
		 * @returns {void}
		 */
		init(context) {
			assertLifecycle(State.CONFIGURED);
			hostContext = context;
			lifecycleState = State.INITIALIZED;
		},

		/**
		 * Resets the simulation state snapshot and loads initial dialogue nodes.
		 * (State-mutating lifecycle gateway)
		 * @param {Object} [stateSnapshot={}] Incoming dialogue snapshot payload.
		 * @returns {void}
		 */
		reset(stateSnapshot) {
			assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

			const baseline = createDefaultState();
			const incoming = stateSnapshot ? (/** @type {Record<string, any>} */ (structuredClone(stateSnapshot))) : {};
			const scriptId = incoming.scriptId || incoming.scriptKey || null;
			const isHeadless = Boolean(incoming.isHeadless);
			const isActive = incoming.active !== undefined ? Boolean(incoming.active) : Boolean(scriptId);

			sim = {
				...baseline,
				...incoming,
				scriptId,
				party: incoming.party ? structuredClone(incoming.party) : [],
				flags: incoming.flags ? structuredClone(incoming.flags) : {},
				quests: incoming.quests ? structuredClone(incoming.quests) : {},
				inventory: incoming.inventory ? structuredClone(incoming.inventory) : {},
				gold: typeof incoming.gold === 'number' ? incoming.gold : 0,
				active: isActive,
				isHeadless,
				selectedChoiceIndex: 0,
				pendingDeltas: {
					flags: {},
					questDeltas: {},
					goldDelta: 0,
					itemsGiven: [],
				},
				choices: [],
			};

			if (sim.scriptId && sim.active && !sim.isHeadless && !sim.currentNodeId) {
				const dialogues = getActiveDialogues();
				const script = dialogues[sim.scriptId] || dialogues.VILLAGE_ELDER || dialogues.ELDER_GREETING;
				if (script) {
					sim.speaker = script.speaker || '???';
					const firstNodeId = getFirstNodeId(script);
					loadNode(firstNodeId);
				}
			}

			lifecycleState = State.READY;
		},

		/**
		 * Updates simulation time steps, handling typewriter character increments and input actions.
		 * (State-mutating update gateway)
		 * @param {number} dt Delta time step in seconds.
		 * @param {ScriptContext} [context] Active update context.
		 * @returns {void}
		 */
		update(dt, context) {
			assertLifecycle(State.READY, State.RUNNING);
			lifecycleState = State.RUNNING;

			processInputs(context || hostContext);
			updateTypewriter(dt);
		},

		/**
		 * Renders the dialogue presentation projection.
		 * (State-mutating render gateway)
		 * @param {Object} [renderer] Peripheral renderer driver.
		 * @returns {void}
		 */
		render(renderer) {
			assertLifecycle(State.READY, State.RUNNING);
			const r = /** @type {any} */ (renderer);
			if (r && typeof r.renderScript === 'function') {
				r.renderScript(this.getState());
			} else {
				renderDefaultPresentation();
			}
		},

		/**
		 * Returns a deep clone snapshot of the active simulation state.
		 * (Pure state accessor)
		 * @returns {ScriptSimulationState|null} Simulation state snapshot or null.
		 */
		getState() {
			assertLifecycle(State.READY, State.RUNNING);
			return structuredClone(sim);
		},

		/**
		 * Collects real-time script runner diagnostic telemetry.
		 * (Pure telemetry collector)
		 * @returns {ScriptDiagnostics} Diagnostic report dictionary.
		 */
		getDiagnostics() {
			return {
				moduleId: 'script_core',
				lifecycleState,
				active: sim?.active || false,
				scriptId: sim?.scriptId || null,
				currentNodeId: sim?.currentNodeId || null,
				selectedChoiceIndex: sim?.selectedChoiceIndex || 0,
				isTyping: sim?.isTyping || false,
				visibleCharCount: sim?.visibleCharCount || 0,
			};
		},

		/**
		 * Returns sovereign module registration metadata.
		 * (Pure metadata accessor)
		 * @returns {ScriptModuleInfo} Module metadata dictionary.
		 */
		getModuleInfo() {
			return {
				moduleId: 'script_core',
				version: '2.0.0',
				protocolVersion: 'VSRP-001',
				dependencies: ['manifest'],
				capabilities: [
					'dialogue',
					'typewriter_stepping',
					'keyboard_choice_navigation',
					'conditional_branching',
					'dynamic_interpolation',
					'quest_triggers',
					'events.dialogue_sfx',
					'events.dialogue_resolved',
				],
			};
		},

		/**
		 * Canonical getInfo alias for VSRP compliance.
		 * @returns {ScriptModuleInfo}
		 */
		getInfo() {
			return this.getModuleInfo();
		},

		/**
		 * Purges runtime allocations and terminates lifecycle.
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() {
			if (lifecycleState === State.DESTROYED) return;
			sim = null;
			hostConfig = null;
			hostContext = null;
			_onScriptEndCallback = null;
			lifecycleState = State.DESTROYED;
		},

		/**
		 * Processes inbound host action tokens and input commands.
		 * (State-mutating action router)
		 * @param {ScriptActionToken|string} action Action token payload or string command.
		 * @returns {void}
		 */
		handleHostAction(action) {
			if (!action || !sim?.active) return;
			const type = typeof action === 'string' ? action.toUpperCase() : (action.type || '').toUpperCase();
			const actionObj = typeof action === 'object' && action !== null ? /** @type {ScriptActionToken} */ (action) : null;

			if (type === 'ADVANCE' || type === 'CONFIRM') {
				stepAdvance();
			} else if (type === 'UP' || type === 'LEFT') {
				moveChoiceCursor(-1);
			} else if (type === 'DOWN' || type === 'RIGHT') {
				moveChoiceCursor(1);
			} else if (type === 'CHOICE_1') {
				selectChoice(0);
			} else if (type === 'CHOICE_2') {
				selectChoice(1);
			} else if (type === 'CHOICE_3') {
				selectChoice(2);
			} else if (type === 'SELECT_CHOICE' && actionObj && typeof actionObj.choiceIndex === 'number') {
				selectChoice(actionObj.choiceIndex);
			}
		},

		/**
		 * Convenience method to advance script execution.
		 * (State-mutating action gateway)
		 * @returns {void}
		 */
		advance() {
			this.handleHostAction('CONFIRM');
		},
	};

	return api;
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightScript = EmberlightScript;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightScript;
}