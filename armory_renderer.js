/* cSpell:words VSRP unsubs targetable unequip UNEQUIP Arcanist */
/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: ARMORY DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-ARMORY-RENDERER
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-ARMORY-RENDERER-001
 * Authority:           Peripheral Presentation
 * Timestamp:           2026-09-07T08:12:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] DOM View Access & Dispatch Helpers
 *   [SEC-02] Manifest Resolution & Deck Expansion Heuristics
 *   [SEC-03] Equipment Requirement Validation Logic
 *   [SEC-04] Deep Analysis Armory Viewport Renderer
 *   [SEC-05] Compact Armory Viewport Renderer
 *   [SEC-06] Canonical Peripheral Driver Interface Gateway
 *   [SEC-07] Global Environment & Window Module Export
 * ============================================================================
 */

const EmberlightArmoryRendererInstance = (() => {
	//#region [SEC-01] DOM View Access & Dispatch Helpers
	/** @type {string|null} */
	let selectedInventoryItemId = null;

	/**
	 * Resolves the root DOM view container for the armory district.
	 * [Pure Query / DOM Inspection]
	 * @returns {HTMLElement|null}
	 */
	function getView() {
		return typeof document === 'undefined' ? null : /** @type {HTMLElement|null} */ (document.getElementById('armory-view'));
	}

	/**
	 * Safely dispatches an action payload to the simulation tenant.
	 * [State Mutating / Event Emission]
	 * @param {((action: any) => void)|any} dispatch - Host dispatch callback.
	 * @param {any} action - Action token or payload.
	 * @returns {void}
	 */
	function emit(dispatch, action) {
		if (typeof dispatch === 'function') dispatch(action);
	}
	//#endregion

	//#region [SEC-02] Manifest Resolution & Deck Expansion Heuristics
	/**
	 * Resolves the authoritative static data manifest.
	 * [Pure Query]
	 * @returns {any}
	 */
	function getManifest() {
		return typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
	}

	/**
	 * Checks whether the armory UI is in Q4 expanded deep-analysis mode.
	 * [Pure Query / DOM Inspection]
	 * @returns {boolean}
	 */
	function isDeckExpanded() {
		if (typeof document === 'undefined') return false;
		const matrix = document.getElementById('war-table-matrix');
		const container = document.getElementById('district-mount-container');
		return Boolean(
			matrix?.classList.contains('q4-expanded-deck') ||
			container?.closest('.q4-expanded-deck') ||
			document.querySelector('.matrix-grid.q4-expanded-deck')
		);
	}
	//#endregion

	//#region [SEC-03] Equipment Requirement Validation Logic
	/**
	 * Validates whether a character meets the attribute or phenotype requirements of an item.
	 * [Pure Query]
	 * @param {any} char - Character snapshot.
	 * @param {any} item - Item definition.
	 * @param {any} manifest - Active manifest.
	 * @returns {{ isEligible: boolean, deficits: string[] }}
	 */
	function checkRequirements(char, item, manifest) {
		if (!item?.requirements) return { isEligible: true, deficits: [] };
		const stats = typeof manifest.computeCharacterStats === 'function'
			? manifest.computeCharacterStats(char)
			: char;

		const deficits = [];
		for (const [stat, reqVal] of Object.entries(item.requirements)) {
			if (stat === 'level') {
				const cur = char.level || 1;
				if (cur < reqVal) deficits.push(`LV ${reqVal} (${reqVal - cur} LV NEEDED)`);
			} else {
				const cur = stats[stat] || 0;
				if (cur < reqVal) deficits.push(`${reqVal} ${stat.toUpperCase()} (${reqVal - cur} ${stat.toUpperCase()} NEEDED)`);
			}
		}

		const allowed = item.allowedPhenotypes || item.allowedClasses;
		if (allowed && !allowed.includes(char.phenotype)) {
			deficits.push(`CLASS ${allowed.join('/')} ONLY`);
		}

		return {
			isEligible: deficits.length === 0,
			deficits,
		};
	}
	//#endregion

	//#region [SEC-04] Deep Analysis Armory Viewport Renderer
	/**
	 * Resolves equipped item label safely for paper-doll display.
	 * [Pure Query]
	 * @param {string|null|undefined} eqItem
	 * @param {any} manifest
	 * @returns {string}
	 */
	function resolveEquippedItemLabel(eqItem, manifest) {
		if (!eqItem) return '[EMPTY]';
		const itemDef = manifest.Items?.[eqItem];
		return itemDef?.label || eqItem;
	}

	/**
	 * Resolves HTML markup for party-wide loadout comparator action buttons.
	 * [Pure Query]
	 * @param {any} highlightedItem
	 * @param {any} pChar
	 * @param {any} manifest
	 * @returns {string}
	 */
	function renderLoadoutComparatorAction(highlightedItem, pChar, manifest) {
		if (!highlightedItem) {
			return '<div style="font-size:9px; color:var(--text-dim); font-family:monospace;">No item selected</div>';
		}
		const req = checkRequirements(pChar, highlightedItem, manifest);
		if (req.isEligible) {
			return `<button type="button" class="cmd-btn action equip-for-char-btn" data-char="${pChar.id}" data-item="${highlightedItem.id}" style="font-size:9px; padding:3px 6px; margin-top:4px; letter-spacing:0.5px;">⚡ EQUIP ON ${pChar.name.toUpperCase()}</button>`;
		}
		return `<div class="deficit-warning" style="margin-top:4px; font-size:9px; letter-spacing:0.5px;">INSUFFICIENT (${req.deficits[0] || 'LOCKED'})</div>`;
	}

	/**
	 * Computes stat deltas between equipped gear and a candidate inventory item.
	 * @param {any} character Character snapshot.
	 * @param {string} selectedSlot Active gear slot.
	 * @param {any} highlightedItem Candidate item definition.
	 * @param {any} manifest Active manifest.
	 * @returns {{ deltaAtk: number, deltaDef: number, deltaAgi: number, projectedAtk: number, projectedDef: number, projectedAgi: number } | null}
	 */
	function computeEquipDeltas(character, selectedSlot, highlightedItem, manifest) {
		if (!highlightedItem) return null;
		const curItemId = character.equipment?.[selectedSlot];
		const curItem = curItemId ? manifest.Items?.[curItemId] : null;

		const curAtk = curItem?.stats?.atk || 0;
		const curDef = curItem?.stats?.def || 0;
		const curAgi = curItem?.stats?.agi || 0;

		const nextAtk = highlightedItem.stats?.atk || 0;
		const nextDef = highlightedItem.stats?.def || 0;
		const nextAgi = highlightedItem.stats?.agi || 0;

		const deltaAtk = nextAtk - curAtk;
		const deltaDef = nextDef - curDef;
		const deltaAgi = nextAgi - curAgi;

		const baseStats = typeof manifest.computeCharacterStats === 'function'
			? manifest.computeCharacterStats(character)
			: character;

		return {
			deltaAtk,
			deltaDef,
			deltaAgi,
			projectedAtk: (baseStats.atk || 10) + deltaAtk,
			projectedDef: (baseStats.def || 5) + deltaDef,
			projectedAgi: (baseStats.agi || 7) + deltaAgi,
		};
	}

	/**
	 * Builds live stat deltas strip markup.
	 * @param {any} character
	 * @param {string} selectedSlot
	 * @param {any} highlightedItem
	 * @param {any} manifest
	 * @returns {string}
	 */
	function buildLiveStatDeltasMarkup(character, selectedSlot, highlightedItem, manifest) {
		const deltas = computeEquipDeltas(character, selectedSlot, highlightedItem, manifest);
		if (!deltas) {
			return '<div class="live-stat-delta-empty">Select an item in stock to view stat deltas</div>';
		}

		/**
		 * @param {string} label
		 * @param {number} diff
		 * @param {number} proj
		 */
		const formatBadge = (label, diff, proj) => {
			const sign = diff > 0 ? `+${diff}` : `${diff}`;
			let cls = 'zero';
			if (diff > 0) {
				cls = 'pos';
			} else if (diff < 0) {
				cls = 'neg';
			}
			return `
				<div class="delta-chip ${cls}">
					<span class="delta-label">${label}:</span>
					<span class="delta-proj">${proj}</span>
					<span class="delta-diff">(${sign})</span>
				</div>
			`;
		};

		return `
			<div class="live-stat-delta-strip">
				<div class="delta-strip-header">⚡ LOADOUT DELTAS (${highlightedItem.label}):</div>
				<div class="delta-chips-row">
					${formatBadge('ATK', deltas.deltaAtk, deltas.projectedAtk)}
					${formatBadge('DEF', deltas.deltaDef, deltas.projectedDef)}
					${formatBadge('AGI', deltas.deltaAgi, deltas.projectedAgi)}
				</div>
			</div>
		`;
	}

	/**
	 * Builds centered circular equipment socket interface markup around character rig.
	 * @param {any} character
	 * @param {string} selectedSlot
	 * @param {any} manifest
	 * @param {string} spriteDataUrl
	 * @returns {string}
	 */
	function buildCrucibleSocketsMarkup(character, selectedSlot, manifest, spriteDataUrl) {
		const slots = [
			{ key: 'weapon', label: 'WEAPON', icon: '⚔️' },
			{ key: 'armor', label: 'ARMOR', icon: '🛡️' },
			{ key: 'accessory', label: 'ACCESSORY', icon: '💍' },
		];

		const socketButtons = slots.map((s) => {
			const isSelected = selectedSlot === s.key;
			const eqItem = character.equipment?.[s.key];
			const itemLabel = resolveEquippedItemLabel(eqItem, manifest);
			return `
				<button type="button" class="crucible-socket-pod ${s.key}-pod ${isSelected ? 'active' : ''} slot-select-btn" data-slot="${s.key}">
					<div class="socket-pod-icon">${s.icon}</div>
					<div class="socket-pod-info">
						<div class="socket-pod-slot">${s.label}</div>
						<div class="socket-pod-item ${eqItem ? 'equipped' : 'empty'}">${itemLabel}</div>
					</div>
				</button>
			`;
		}).join('');

		return `
			<div class="crucible-rig-wrapper">
				<div class="crucible-paper-doll-core">
					<div class="crucible-arcane-ring"></div>
					<div class="battler-paper-doll-frame">
						${spriteDataUrl ? `<img src="${spriteDataUrl}" class="battler-paper-doll-img" alt="${character.name}" />` : '<div style="font-size:32px;">🧙‍♂️</div>'}
					</div>
					<div class="crucible-pedestal-glow"></div>
				</div>
				<div class="crucible-sockets-orbit">
					${socketButtons}
				</div>
			</div>
		`;
	}

	/**
	 * Renders the comprehensive 3-column Q4 expanded deep analysis armory workstation.
	 * [DOM Presentation Render]
	 * @param {HTMLElement} panel - Target container element.
	 * @param {any} state - Current armory simulation snapshot.
	 * @param {((action: any) => void)|any} dispatch - Action dispatcher.
	 * @param {any} manifest - Active manifest.
	 * @returns {void}
	 */
	function renderDeepAnalysisArmory(panel, state, dispatch, manifest) {
		const party = state.party || [];
		if (party.length === 0) return;

		const selectedIdx = Math.max(0, Math.min(party.length - 1, state.selectedCharIndex || 0));
		const character = party[selectedIdx] || party[0];
		const selectedSlot = state.selectedSlot || 'weapon';

		const charStats = typeof manifest.computeCharacterStats === 'function'
			? manifest.computeCharacterStats(character)
			: character;

		// 1. Get Battler Paper-Doll
		let spriteDataUrl = '';
		if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
			spriteDataUrl = EmberlightBattlerBaker.get({
				phenotype: character.phenotype || 'HERO',
				weapon: character.equipment?.weapon,
				armor: character.equipment?.armor,
			});
		}

		// 2. Telemetry Estimates
		const atk = charStats.atk || 10;
		const def = charStats.def || 5;
		const agi = charStats.agi || 7;
		const minDmg = Math.round(atk * 1.5);
		const maxDmg = Math.round(atk * 2.2);
		const mitigation = Math.min(75, Math.round((def / (def + 28)) * 100));
		const actionDelay = Math.round(1000 / Math.max(1, agi));

		// Inventory items for this slot
		const slotItems = Object.entries(/** @type {Record<string, number>} */ (state.inventory || {}))
			.filter(([, count]) => count > 0)
			.map(([id, count]) => ({ id, count, def: manifest.Items?.[id] }))
			.filter((entry) => entry.def && entry.def.slot === selectedSlot);

		if (!selectedInventoryItemId || !slotItems.some((s) => s.id === selectedInventoryItemId)) {
			selectedInventoryItemId = slotItems[0]?.id || null;
		}

		const highlightedItem = selectedInventoryItemId ? manifest.Items?.[selectedInventoryItemId] : null;
		const crucibleSocketsHtml = buildCrucibleSocketsMarkup(character, selectedSlot, manifest, spriteDataUrl);
		const liveStatDeltasHtml = buildLiveStatDeltasMarkup(character, selectedSlot, highlightedItem, manifest);

		panel.innerHTML = `
      <div class="deep-analysis-deck">
        <!-- 1. ROSTER SELECTION RIBBON -->
        <div class="deep-analysis-roster" id="armory-roster-ribbon"></div>

        <!-- 2. PRIMARY 3-COLUMN OPERATIONAL STAGE -->
        <div class="deep-analysis-stage-3col">
          <!-- PANE 1: CIRCULAR PAPER-DOLL CRUCIBLE RIG -->
          <div class="deep-analysis-pane crucible-pane" style="align-items:center;">
            <div class="deep-pane-title" style="width:100%;">
              <span>CRUCIBLE RIG: ${character.name.toUpperCase()}</span>
              <span style="color:var(--ember); font-size:9px; letter-spacing:0.5px;">2X COMPOSITE</span>
            </div>
            ${crucibleSocketsHtml}
          </div>

          <!-- PANE 2: ARMORY MATRIX & INVENTORY -->
          <div class="deep-analysis-pane">
            <div class="deep-pane-title">
              <span>ARMORY MATRIX: ${selectedSlot.toUpperCase()}S (${slotItems.length})</span>
              <span style="color:var(--text-dim); font-size:9px; letter-spacing:0.5px;">Click to compare</span>
            </div>
            ${liveStatDeltasHtml}
            <div id="armory-items-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; max-height:270px; margin-top:4px;">
              ${slotItems.length === 0
				? '<div style="color:var(--text-dim); font-size:9.5px; padding:16px; text-align:center; font-family:monospace;">No items found in stock for this slot.</div>'
				: slotItems.map((entry) => {
					const item = entry.def;
					const reqCheck = checkRequirements(character, item, manifest);
					const isHighlight = selectedInventoryItemId === entry.id;
					const statBonusText = Object.entries(item.stats || {})
						.map(([s, val]) => `+${val} ${s.toUpperCase()}`)
						.join(', ');

					return `
                    <div class="compare-card ${isHighlight ? 'selected' : ''} inventory-item-card" data-item="${entry.id}" style="cursor:pointer;">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:var(--ember); font-size:9.5px; letter-spacing:0.5px;">${item.label || entry.id} <span style="color:var(--text-dim); font-size:9px;">x${entry.count}</span></span>
                        <button type="button" class="cmd-btn action equip-action-btn" data-item="${entry.id}" style="font-size:9px; padding:2px 8px; letter-spacing:0.5px;" ${reqCheck.isEligible ? '' : 'disabled'}>
                          ${reqCheck.isEligible ? '⚡ EQUIP' : '🔒 LOCKED'}
                        </button>
                      </div>
                      <div style="color:#94a3b8; font-size:9px; font-family:monospace; margin-top:2px;">${statBonusText || 'Special artifact'}</div>
                      ${!reqCheck.isEligible ? `<div class="deficit-warning">DEFICIT: ${reqCheck.deficits.join(', ')}</div>` : ''}
                    </div>
                  `;
				}).join('')}
            </div>
            ${character.equipment?.[selectedSlot] ? `
              <div style="margin-top:auto; text-align:right; padding-top:6px;">
                <button type="button" class="cmd-btn" id="unequip-current-btn" style="font-size:9px; padding:3px 10px; color:var(--danger); letter-spacing:0.5px;">✕ UNEQUIP CURRENT</button>
              </div>
            ` : ''}
          </div>

          <!-- PANE 3: COMBAT TELEMETRY PREVIEW -->
          <div class="deep-analysis-pane">
            <div class="deep-pane-title">
              <span>COMBAT TELEMETRY PREVIEW</span>
              <span style="color:var(--ok); font-size:9px; letter-spacing:0.5px;">LIVE</span>
            </div>
            <div class="combat-telemetry-box">
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Expected Strike DMG:</span>
                <span style="font-weight:bold; color:var(--ember);">${minDmg} ~ ${maxDmg}</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Physical Mitigation:</span>
                <span style="font-weight:bold; color:var(--ok);">${mitigation}%</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Action Delay Cost:</span>
                <span style="font-weight:bold; color:#60a5fa;">${actionDelay} ms</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Encumbrance / Agi:</span>
                <span style="font-weight:bold; color:var(--ok);">OPTIMAL (+${agi})</span>
              </div>
              <div class="telemetry-row">
                <span style="color:var(--text-dim);">Elemental Resonances:</span>
                <span style="font-weight:bold;">${charStats.affinities ? Object.keys(charStats.affinities).join(', ') : 'STANDARD (1.0x)'}</span>
              </div>
            </div>

            <div style="margin-top:auto; background:rgba(0,0,0,0.5); padding:8px; border:1px solid rgba(255,157,77,0.3); border-radius:3px; font-size:9px; font-family:monospace; line-height:1.4;">
              <div style="color:var(--ember); font-weight:bold; margin-bottom:3px; letter-spacing:0.5px;">TACTICAL LOADOUT TIP:</div>
              <div>Balancing Vanguard DEF with Arcanist MP ensures clean turn pacing in subterranean crypts.</div>
            </div>
          </div>
        </div>

        <!-- 3. LOWER STAGE: PARTY-WIDE LOADOUT COMPARATOR -->
        <div class="deep-analysis-bench">
          <div class="deep-pane-title">
            <span>PARTY-WIDE LOADOUT COMPARATOR ${highlightedItem ? `(${highlightedItem.label})` : ''}</span>
            <button type="button" class="cmd-btn action" id="close-armory-btn" style="font-size:9px; padding:3px 10px; letter-spacing:0.5px;">✔ DONE / RETURN</button>
          </div>

          <div class="party-loadout-comparator">
            ${party.map((/** @type {any} */ pChar) => {
					const currentEq = pChar.equipment?.[selectedSlot];
					const isCurrent = pChar.id === character.id;
					const actionHtml = renderLoadoutComparatorAction(highlightedItem, pChar, manifest);

					return `
                <div class="compare-card ${isCurrent ? 'selected' : ''}">
                  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:9.5px; letter-spacing:0.5px;">
                    <span>${pChar.name}</span>
                    <span style="color:var(--text-dim); font-size:9px;">${pChar.phenotype}</span>
                  </div>
                  <div style="font-size:9px; color:var(--text-dim); margin:3px 0;">Equipped: <b style="color:#e2e8f0;">${resolveEquippedItemLabel(currentEq, manifest)}</b></div>
                  ${actionHtml}
                </div>
              `;
				}).join('')}
          </div>
        </div>
      </div>
    `;

		// Populate Roster Ribbon
		const rosterRibbon = /** @type {HTMLElement|null} */ (panel.querySelector('#armory-roster-ribbon'));
		if (rosterRibbon) {
			party.forEach((/** @type {any} */ pChar, /** @type {number} */ idx) => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = `deep-roster-btn ${idx === selectedIdx ? 'active' : ''}`;
				btn.innerHTML = `<span>${pChar.name}</span> <span style="font-size:9px; opacity:0.8;">(${pChar.phenotype})</span>`;
				btn.onclick = () => emit(dispatch, { type: 'SELECT_CHAR', index: idx });
				rosterRibbon.appendChild(btn);
			});
		}

		// Bind Slot Selectors
		panel.querySelectorAll('.slot-select-btn').forEach((elem) => {
			const btn = /** @type {HTMLButtonElement} */ (elem);
			btn.onclick = () => emit(dispatch, { type: 'SELECT_SLOT', slot: btn.dataset.slot });
		});

		// Bind Item Card Selection & Equip
		panel.querySelectorAll('.inventory-item-card').forEach((elem) => {
			const card = /** @type {HTMLElement} */ (elem);
			card.onclick = (e) => {
				if ((/** @type {HTMLElement} */ (e.target)).closest('.equip-action-btn')) return;
				selectedInventoryItemId = card.dataset.item || null;
				EmberlightArmoryRendererInstance.renderArmory(state, dispatch);
			};
		});

		panel.querySelectorAll('.equip-action-btn').forEach((elem) => {
			const btn = /** @type {HTMLButtonElement} */ (elem);
			btn.onclick = (e) => {
				e.stopPropagation();
				emit(dispatch, {
					type: 'EQUIP',
					characterId: character.id,
					slot: selectedSlot,
					itemId: btn.dataset.item,
				});
			};
		});

		panel.querySelectorAll('.equip-for-char-btn').forEach((elem) => {
			const btn = /** @type {HTMLButtonElement} */ (elem);
			btn.onclick = () => {
				emit(dispatch, {
					type: 'EQUIP',
					characterId: btn.dataset.char,
					slot: selectedSlot,
					itemId: btn.dataset.item,
				});
			};
		});

		const unequipBtn = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#unequip-current-btn'));
		if (unequipBtn) {
			unequipBtn.onclick = () => {
				emit(dispatch, {
					type: 'UNEQUIP',
					characterId: character.id,
					slot: selectedSlot,
				});
			};
		}

		const closeBtn = /** @type {HTMLButtonElement|null} */ (panel.querySelector('#close-armory-btn'));
		if (closeBtn) {
			closeBtn.onclick = () => emit(dispatch, { type: 'EXIT' });
		}
	}
	//#endregion

	//#region [SEC-05] Compact Armory Viewport Renderer
	/**
	 * Renders the compact fallback armory viewport layout.
	 * [DOM Presentation Render]
	 * @param {HTMLElement} panel - Target container element.
	 * @param {any} state - Current armory simulation snapshot.
	 * @param {((action: any) => void)|any} dispatch - Action dispatcher.
	 * @returns {void}
	 */
	function renderCompactArmory(panel, state, dispatch) {
		const character = state.party?.[state.selectedCharIndex];
		if (!character) return;

		panel.innerHTML = `<div class="panel-title">EQUIPMENT: ${character.name} (${character.phenotype})</div>`;

		const characterRow = document.createElement('div');
		characterRow.style.display = 'flex';
		characterRow.style.gap = '6px';
		(state.party || []).forEach((/** @type {any} */ entry, /** @type {number} */ index) => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `cmd-btn${index === state.selectedCharIndex ? ' run' : ''}`;
			button.style.fontSize = '9px';
			button.style.letterSpacing = '0.5px';
			button.textContent = `${entry.name}`;
			button.onclick = () => emit(dispatch, { type: 'SELECT_CHAR', index });
			characterRow.appendChild(button);
		});
		panel.appendChild(characterRow);

		const slotRow = document.createElement('div');
		slotRow.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0;';
		['weapon', 'armor', 'accessory'].forEach((slot) => {
			const itemId = character.equipment?.[slot];
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `cmd-btn${state.selectedSlot === slot ? ' run' : ''}`;
			button.style.fontSize = '9px';
			button.style.letterSpacing = '0.5px';
			button.textContent = `${slot.toUpperCase()}: ${itemId || '[EMPTY]'}`;
			button.onclick = () => emit(dispatch, { type: 'SELECT_SLOT', slot });
			slotRow.appendChild(button);
		});
		panel.appendChild(slotRow);

		const inventory = document.createElement('div');
		inventory.style.display = 'flex';
		inventory.style.flexDirection = 'column';
		inventory.style.gap = '4px';

		Object.entries(/** @type {Record<string, number>} */ (state.inventory || {})).forEach(([itemId, count]) => {
			if (count <= 0) return;
			const item = typeof EmberlightManifest !== 'undefined' ? /** @type {any} */ (EmberlightManifest.Items?.[itemId]) : null;
			if (!item || item.slot !== state.selectedSlot) return;
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'cmd-btn action';
			button.style.fontSize = '9px';
			button.style.letterSpacing = '0.5px';
			button.textContent = `${item.label || itemId} x${count}`;
			button.onclick = () => emit(dispatch, {
				type: 'EQUIP',
				characterId: character.id,
				slot: state.selectedSlot,
				itemId,
			});
			inventory.appendChild(button);
		});
		panel.appendChild(inventory);

		const done = document.createElement('button');
		done.type = 'button';
		done.className = 'cmd-btn action';
		done.style.cssText = 'margin-top:10px; font-size:9.5px; letter-spacing:0.5px;';
		done.textContent = '✔ DONE / RETURN';
		done.onclick = () => emit(dispatch, { type: 'EXIT' });
		panel.appendChild(done);
	}
	//#endregion

	//#region [SEC-06] Canonical Peripheral Driver Interface Gateway
	return {
		/**
		 * @param {any} [_context]
		 */
		init(_context) { },

		/**
		 * @param {any} state
		 * @param {((action: any) => void)|any} [dispatch]
		 */
		renderArmory(state, dispatch) {
			const view = getView();
			if (!view || !state) return;
			view.innerHTML = '';

			const panel = document.createElement('div');
			panel.className = 'panel';

			const manifest = getManifest();
			if (isDeckExpanded()) {
				renderDeepAnalysisArmory(panel, state, dispatch, manifest);
			} else {
				renderCompactArmory(panel, state, dispatch);
			}

			view.appendChild(panel);
		},

		getDiagnostics() {
			return { driverId: 'armory_renderer' };
		},

		destroy() { },
	};
	//#endregion
})();

//#region [SEC-07] Global Environment & Window Module Export
if (typeof window !== 'undefined') {
	window.EmberlightArmoryRenderer = EmberlightArmoryRendererInstance;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightArmoryRendererInstance;
}
//#endregion