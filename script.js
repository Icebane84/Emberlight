/* =========================================================================
   DISTRICT: SCRIPT & DIALOGUE RUNNER (VSRP-001 COMPLIANT TENANT + GASKET)
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-SCRIPT-CORE
   Protocol Version:    VSRP-001
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightScript = (() => {
  'use strict';

  const State = {
    UNCONFIGURED: 'UNCONFIGURED',
    CONFIGURED: 'CONFIGURED',
    INITIALIZED: 'INITIALIZED',
    READY: 'READY',
    RUNNING: 'RUNNING',
    DESTROYED: 'DESTROYED',
  };

  let lifecycleState = State.UNCONFIGURED;
  let hostConfig = null;
  let hostContext = null;
  let _onScriptEndCallback = null;

  let sim = null;

  function assertLifecycle(...allowed) {
    if (!allowed.includes(lifecycleState)) {
      throw new Error(
        `[VSRP-001:script_core] Lifecycle Violation: Method called in state "${lifecycleState}". ` +
        `Allowed: ${allowed.join(' | ')}`
      );
    }
  }

  function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((prop) => {
      if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
        deepFreeze(obj[prop]);
      }
    });
    return Object.freeze(obj);
  }

  function getActiveDialogues() {
    return hostConfig?.dialogues ||
      hostConfig?.manifest?.Dialogues ||
      (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest.Dialogues : {});
  }

  function getActiveManifest() {
    return hostConfig?.manifest ||
      (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {});
  }

  function dispatchSFX(sfxName) {
    if (hostContext?.eventBus?.publish) {
      hostContext.eventBus.publish('dialogue:sfx', { sfx: sfxName });
    } else if (typeof EmberlightAudio !== 'undefined' && typeof EmberlightAudio.play === 'function') {
      EmberlightAudio.play(sfxName);
    }
  }

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

  // --- Dynamic Variable Interpolator ---
  function interpolateText(templateStr) {
    if (typeof templateStr !== 'string') return '';

    const manifest = getActiveManifest();
    const leader = sim.party.find((c) => c.alive) || sim.party[0];
    const leaderName = leader ? leader.name : 'Traveler';
    const potionsCount = sim.inventory.POTION || 0;
    const livingPartyCount = sim.party.filter((c) => c.alive).length;

    return templateStr.replace(/\{([^{}]+)\}/g, (match, rawKey) => {
      const key = rawKey.trim();

      if (key === 'leader') return leaderName;
      if (key === 'gold') return sim.gold;
      if (key === 'potions') return potionsCount;
      if (key === 'partyCount') return livingPartyCount;

      if (key.startsWith('item:')) {
        const itemId = key.slice(5).trim();
        const itemDef = manifest?.Items?.[itemId];
        return itemDef ? (itemDef.label || itemDef.name || itemId) : itemId;
      }

      if (key.startsWith('flag:')) {
        const flagKey = key.slice(5).trim();
        return sim.flags[flagKey] ? 'Yes' : 'No';
      }

      return match;
    });
  }

  // --- Prerequisite & Condition Evaluator ---
  function evaluateCondition(cond) {
    if (!cond || typeof cond !== 'object') return true;

    // Flag requirements
    if (cond.requireFlag && !sim.flags[cond.requireFlag]) return false;
    if (cond.requireNotFlag && sim.flags[cond.requireNotFlag]) return false;

    // Quest requirements
    if (cond.requireQuestStage) {
      const { questId, minStage, maxStage, completed } = cond.requireQuestStage;
      const qState = sim.quests[questId] || { stage: 0, completed: false };
      if (typeof minStage === 'number' && qState.stage < minStage) return false;
      if (typeof maxStage === 'number' && qState.stage > maxStage) return false;
      if (completed !== undefined && qState.completed !== completed) return false;
    }

    // Inventory requirements
    if (cond.requireItem) {
      const count = sim.inventory[cond.requireItem] || 0;
      const needed = cond.itemCount || 1;
      if (count < needed) return false;
    }

    // Currency requirements
    if (typeof cond.requireGold === 'number' && sim.gold < cond.requireGold) {
      return false;
    }

    return true;
  }

  function resolveNodeWithRedirects(script, targetNodeId) {
    const nodes = Array.isArray(script.nodes) ? script.nodes : Object.values(script.nodes || {});
    const node = nodes.find((n) => n.id === targetNodeId) || nodes[0];
    if (!node) return null;

    if (Array.isArray(node.redirects)) {
      for (const red of node.redirects) {
        if (evaluateCondition(red)) {
          return resolveNodeWithRedirects(script, red.target);
        }
      }
    }

    return node;
  }

  function loadNode(nodeId) {
    const dialogues = getActiveDialogues();
    const script = dialogues[sim.scriptId] || dialogues.VILLAGE_ELDER || dialogues.ELDER_GREETING;
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

    const rawChoices = Array.isArray(node.choices) ? node.choices : [];
    const validChoices = [];

    rawChoices.forEach((c) => {
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

    sim.choices = validChoices;

    const firstEnabled = sim.choices.findIndex((c) => !c.locked);
    sim.selectedChoiceIndex = firstEnabled !== -1 ? firstEnabled : 0;

    // Standard Rewards & Flags
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

    // Vector E: Quest Stage Advancement & Triggers
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
      const current = sim.quests[questId] || { stage: 1 };
      const qUpdate = { stage: current.stage, completed: true };
      sim.quests[questId] = qUpdate;
      sim.pendingDeltas.questDeltas[questId] = qUpdate;
      dispatchSFX('VICTORY');
    }

    renderDefaultPresentation();
  }

  function getFirstNodeId(script) {
    if (Array.isArray(script?.nodes)) {
      return script.nodes[0]?.id || 'start';
    }
    if (script?.nodes && typeof script.nodes === 'object') {
      return script.nodes.start?.id || Object.keys(script.nodes)[0] || 'start';
    }
    return 'start';
  }

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

  function stepAdvance() {
    if (!sim?.active || sim.resolved) return;

    if (sim.isTyping) {
      sim.visibleCharCount = sim.fullText.length;
      sim.isTyping = false;
      renderDefaultPresentation();
      return;
    }

    if (sim.choices && sim.choices.length > 0) {
      selectChoice(sim.selectedChoiceIndex);
      return;
    }

    const dialogues = getActiveDialogues();
    const script = dialogues[sim.scriptId] || dialogues.VILLAGE_ELDER || dialogues.ELDER_GREETING;
    const nodes = Array.isArray(script?.nodes) ? script.nodes : Object.values(script?.nodes || {});
    const currentNode = nodes.find((n) => n.id === sim.currentNodeId);
    const nextNodeId = currentNode?.next || currentNode?.nextNode;

    if (currentNode && nextNodeId) {
      loadNode(nextNodeId);
    } else {
      finalizeDialogue();
    }
  }

  function moveChoiceCursor(delta) {
    if (!sim?.active || sim.isTyping || !sim.choices || sim.choices.length === 0) return;
    const total = sim.choices.length;
    let nextIndex = sim.selectedChoiceIndex;

    for (let i = 0; i < total; i++) {
      nextIndex = (nextIndex + delta + total) % total;
      if (!sim.choices[nextIndex].locked) {
        sim.selectedChoiceIndex = nextIndex;
        dispatchSFX('SELECT');
        renderDefaultPresentation();
        return;
      }
    }
  }

  function finalizeDialogue() {
    if (!sim) return;
    sim.active = false;
    sim.isTyping = false;
    sim.resolved = true;

    // Vector E: Assemble complete delta envelope
    const resultDeltas = {
      flags: { ...(sim.pendingDeltas.flags) },
      flagsDelta: { ...(sim.pendingDeltas.flags) },
      questDeltas: { ...(sim.pendingDeltas.questDeltas) },
      questsDelta: { ...(sim.pendingDeltas.questDeltas) },
      goldDelta: sim.pendingDeltas.goldDelta || 0,
      itemsGiven: Array.isArray(sim.pendingDeltas.itemsGiven) ? [...sim.pendingDeltas.itemsGiven] : [],
      itemsTaken: Array.isArray(sim.pendingDeltas.itemsTaken) ? [...sim.pendingDeltas.itemsTaken] : [],
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

  function renderDefaultPresentation() {
    if (typeof document === 'undefined' || !sim?.active || sim?.isHeadless) return;

    const box = document.getElementById('dialogue-view');
    const speakerEl = document.getElementById('dialogue-speaker');
    const textEl = document.getElementById('dialogue-text');
    const choicesEl = document.getElementById('dialogue-choices');

    if (!box || !speakerEl || !textEl || !choicesEl) return;

    box.classList.remove('hidden');
    speakerEl.textContent = sim.speaker || '???';
    textEl.textContent = sim.fullText.slice(0, sim.visibleCharCount);

    choicesEl.innerHTML = '';
    if (!sim.isTyping && sim.choices.length > 0) {
      choicesEl.classList.remove('hidden');
      sim.choices.forEach((c, index) => {
        const isSelected = index === sim.selectedChoiceIndex;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `cmd-btn ${isSelected ? 'action' : ''}`;
        btn.disabled = c.locked;
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
          btn.onmouseenter = () => {
            sim.selectedChoiceIndex = index;
            renderDefaultPresentation();
          };
          btn.onclick = (e) => {
            e.stopPropagation();
            selectChoice(index);
          };
        }

        choicesEl.appendChild(btn);
      });
    } else {
      choicesEl.classList.add('hidden');
    }
  }

  // --- Canonical 9-Method Interface Export ---
  const api = {
    configure(config) {
      assertLifecycle(State.UNCONFIGURED);
      if (!config || typeof config !== 'object') {
        throw new TypeError('[VSRP-001:script_core] configure() requires a non-null configuration dictionary.');
      }
      hostConfig = deepFreeze({ ...config });
      lifecycleState = State.CONFIGURED;
    },

    init(context) {
      assertLifecycle(State.CONFIGURED);
      hostContext = context;
      lifecycleState = State.INITIALIZED;
    },

    reset(stateSnapshot) {
      assertLifecycle(State.INITIALIZED, State.READY, State.RUNNING);

      const baseline = createDefaultState();
      const incoming = stateSnapshot ? structuredClone(stateSnapshot) : {};
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

    update(dt, context) {
      assertLifecycle(State.READY, State.RUNNING);
      lifecycleState = State.RUNNING;

      const activeCtx = context || hostContext;

      if (activeCtx?.inputs && Array.isArray(activeCtx.inputs)) {
        for (const element of activeCtx.inputs) {
          this.handleHostAction(element);
        }
      }

      if (sim?.active && sim.isTyping) {
        sim.charTimer += dt;
        let advanced = false;

        while (sim.charTimer >= sim.charInterval && sim.visibleCharCount < sim.fullText.length) {
          sim.charTimer -= sim.charInterval;
          sim.visibleCharCount++;
          advanced = true;

          if (sim.visibleCharCount % 2 === 0 && sim.fullText[sim.visibleCharCount - 1] !== ' ') {
            const currentChar = sim.fullText[sim.visibleCharCount - 1];
            if (hostContext?.eventBus?.publish) {
              hostContext.eventBus.publish('dialogue:char', {
                char: currentChar,
                speaker: sim.speaker,
              });
            } else {
              dispatchSFX('SELECT');
            }
          }
        }

        if (sim.visibleCharCount >= sim.fullText.length) {
          sim.isTyping = false;
          renderDefaultPresentation();
        } else if (advanced) {
          renderDefaultPresentation();
        }
      }
    },

    render(renderer) {
      assertLifecycle(State.READY, State.RUNNING);
      if (renderer && typeof renderer.renderScript === 'function') {
        renderer.renderScript(this.getState());
      } else {
        renderDefaultPresentation();
      }
    },

    getState() {
      assertLifecycle(State.READY, State.RUNNING);
      return structuredClone(sim);
    },

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

    destroy() {
      if (lifecycleState === State.DESTROYED) return;
      sim = null;
      hostConfig = null;
      hostContext = null;
      _onScriptEndCallback = null;
      lifecycleState = State.DESTROYED;
    },

    handleHostAction(action) {
      if (!action || !sim?.active) return;
      const type = typeof action === 'string' ? action.toUpperCase() : (action.type || '').toUpperCase();

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
      } else if (type === 'SELECT_CHOICE') {
        selectChoice(action.choiceIndex);
      }
    },

    advance() {
      this.handleHostAction('CONFIRM');
    },
  };

  return api;
})();

if (typeof window !== 'undefined') {
  window.EmberlightScript = EmberlightScript;
}