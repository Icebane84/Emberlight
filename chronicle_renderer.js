/* =========================================================================
   PERIPHERAL DRIVER: CHRONICLE DOM PRESENTATION RENDERER
   ========================================================================= */

const EmberlightChronicleRenderer = (() => {
  'use strict';

  function getView() {
    return typeof document === 'undefined' ? null : document.getElementById('chronicle-view');
  }

  function emit(dispatch, action) {
    if (typeof dispatch === 'function') dispatch(action);
  }

  return {
    renderChronicle(state, dispatch) {
      const view = getView();
      if (!view || !state) return;
      view.innerHTML = '';

      const manifest = typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
      const quests = Object.values(manifest.Quests || {});
      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.innerHTML = '<div class="panel-title">CHRONICLE - QUEST JOURNAL & WORLD RECORD</div>';

      const list = document.createElement('div');
      quests.forEach((quest) => {
        const active = state.quests?.[quest.id];
        const completed =
          active?.completed || (quest.requiredFlag && state.flags?.[quest.requiredFlag]);
        const button = document.createElement('button');
        button.className = `cmd-btn${state.selectedQuestId === quest.id ? ' run' : ''}`;
        button.textContent = `${quest.title || quest.id} [${completed ? 'COMPLETED' : `STAGE ${active?.stage || 0}`}]`;
        button.onclick = () => emit(dispatch, { type: 'SELECT_QUEST', questId: quest.id });
        list.appendChild(button);
      });
      panel.appendChild(list);

      const selected = quests.find((quest) => quest.id === state.selectedQuestId) || quests[0];
      const details = document.createElement('div');
      details.style.cssText = 'margin:10px 0;padding:8px;border:1px solid var(--border-dim);';
      if (selected) {
        const active = state.quests?.[selected.id] || { stage: 0, completed: false };
        const stage = Array.isArray(selected.stages)
          ? selected.stages[active.stage] || selected.stages[0]
          : selected.stages?.[active.stage] || selected.stages?.['0'];
        details.textContent = `${selected.title || selected.id}\n${typeof stage === 'string' ? stage : stage?.desc || selected.desc || 'No recorded details.'}`;
      } else {
        details.textContent = 'No entries in the chronicle.';
      }
      panel.appendChild(details);

      const close = document.createElement('button');
      close.className = 'cmd-btn action';
      close.textContent = 'CLOSE JOURNAL';
      close.onclick = () => emit(dispatch, { type: 'EXIT' });
      panel.appendChild(close);
      view.appendChild(panel);
    },

    getDiagnostics() {
      return { driverId: 'chronicle_renderer' };
    },

    destroy() {},
  };
})();

if (typeof window !== 'undefined') window.EmberlightChronicleRenderer = EmberlightChronicleRenderer;
